import type { LedgerRow, MatchOptions, MatchPair, ReconcileResult } from "./types"
import { purposeTokens } from "./parse"

const DEFAULTS: MatchOptions = {
  amountTolerance: 0.05,
  dateWindowDays: 1,
  purposeMinOverlap: 0.35,
}

function dayMs(iso: string): number {
  return Date.parse(`${iso}T12:00:00Z`)
}

function daysApart(a: string, b: string): number {
  return Math.abs(dayMs(a) - dayMs(b)) / 86_400_000
}

function amountsClose(a: number, b: number, tol: number): boolean {
  return Math.abs(Math.abs(a) - Math.abs(b)) <= tol
}

function purposeOverlap(a: string, b: string): { ratio: number; shared: string[] } {
  const ta = purposeTokens(a)
  const tb = purposeTokens(b)
  if (ta.size === 0 || tb.size === 0) {
    const na = a.toLowerCase()
    const nb = b.toLowerCase()
    if (na && nb && (na.includes(nb) || nb.includes(na))) {
      return { ratio: 0.5, shared: ["substr"] }
    }
    return { ratio: 0, shared: [] }
  }
  const shared: string[] = []
  for (const t of ta) {
    if (tb.has(t)) shared.push(t)
  }
  const ratio = shared.length / Math.min(ta.size, tb.size)
  return { ratio, shared }
}

function scorePair(
  bank: LedgerRow,
  report: LedgerRow,
  opts: MatchOptions,
): { score: number; reasons: string[] } | null {
  if (!amountsClose(bank.amount, report.amount, opts.amountTolerance)) return null
  const days = daysApart(bank.date, report.date)
  if (days > opts.dateWindowDays) return null

  const exactAmount = Math.abs(Math.abs(bank.amount) - Math.abs(report.amount)) < 0.005
  const sameDay = days === 0
  const ignorePurpose = opts.purposeMinOverlap <= 0

  let ratio = 0
  let shared: string[] = []
  if (!ignorePurpose) {
    ;({ ratio, shared } = purposeOverlap(bank.purpose, report.purpose))
    const purposeSparse =
      purposeTokens(bank.purpose).size === 0 || purposeTokens(report.purpose).size === 0
    if (ratio < opts.purposeMinOverlap && !(exactAmount && sameDay && ratio >= 0.15)) {
      // Sparse PDF purposes (doc-type only) still match on exact amount + same day.
      if (!(exactAmount && sameDay && (shared.length >= 1 || purposeSparse))) return null
    }
  }

  let score = 0
  const reasons: string[] = []
  score += exactAmount ? 50 : 40
  reasons.push(exactAmount ? "amount exact" : `amount ±${opts.amountTolerance}`)
  score += sameDay ? 30 : 20
  reasons.push(sameDay ? "same day" : `date ±${days}d`)
  if (ignorePurpose) {
    score += 10
    reasons.push("purpose ignored")
  } else {
    score += Math.round(ratio * 20)
    if (shared.length) reasons.push(`purpose: ${shared.slice(0, 4).join(", ")}`)
    else reasons.push("purpose weak")
  }
  return { score, reasons }
}

/**
 * Greedy 1:1 match of bank rows against income+expense reports.
 */
export function reconcile(
  bank: LedgerRow[],
  income: LedgerRow[],
  expense: LedgerRow[],
  options: Partial<MatchOptions> = {},
): ReconcileResult {
  const opts = { ...DEFAULTS, ...options }
  const reports = [...income, ...expense]
  const usedReport = new Set<string>()
  const usedBank = new Set<string>()
  const matched: MatchPair[] = []
  const nearMisses: ReconcileResult["nearMisses"] = []

  type Cand = {
    bank: LedgerRow
    report: LedgerRow
    score: number
    reasons: string[]
  }
  const candidates: Cand[] = []

  for (const b of bank) {
    for (const r of reports) {
      const hit = scorePair(b, r, opts)
      if (!hit) {
        // near miss: amount ok, date within 2 days
        if (
          amountsClose(b.amount, r.amount, opts.amountTolerance) &&
          daysApart(b.date, r.date) <= opts.dateWindowDays + 1
        ) {
          const ignorePurpose = opts.purposeMinOverlap <= 0
          const { ratio, shared } = ignorePurpose
            ? { ratio: 0, shared: [] as string[] }
            : purposeOverlap(b.purpose, r.purpose)
          nearMisses.push({
            bank: b,
            candidate: r,
            score: ignorePurpose ? 50 : Math.round(ratio * 100),
            reasons: [
              `date ±${daysApart(b.date, r.date)}d`,
              ignorePurpose
                ? "purpose ignored"
                : shared.length
                  ? `tokens ${shared.slice(0, 3).join(",")}`
                  : "purpose low",
            ],
          })
        }
        continue
      }
      candidates.push({ bank: b, report: r, ...hit })
    }
  }

  candidates.sort((a, b) => b.score - a.score)
  for (const c of candidates) {
    if (usedBank.has(c.bank.id) || usedReport.has(c.report.id)) continue
    usedBank.add(c.bank.id)
    usedReport.add(c.report.id)
    matched.push({
      bank: c.bank,
      report: c.report,
      score: c.score,
      reasons: c.reasons,
    })
  }

  // Dedupe near misses that became matches
  const near = nearMisses.filter(
    (n) => !usedBank.has(n.bank.id) && !usedReport.has(n.candidate.id),
  )

  return {
    matched,
    unmatchedBank: bank.filter((r) => !usedBank.has(r.id)),
    unmatchedIncome: income.filter((r) => !usedReport.has(r.id)),
    unmatchedExpense: expense.filter((r) => !usedReport.has(r.id)),
    nearMisses: near.slice(0, 50),
  }
}

export function resultToCsv(result: ReconcileResult): string {
  const lines = ["side,date,amount,purpose,raw"]
  const push = (side: string, rows: LedgerRow[]) => {
    for (const r of rows) {
      const purpose = `"${r.purpose.replace(/"/g, '""')}"`
      const raw = `"${r.raw.replace(/"/g, '""')}"`
      lines.push(`${side},${r.date},${r.amount},${purpose},${raw}`)
    }
  }
  push("unmatched_bank", result.unmatchedBank)
  push("unmatched_income", result.unmatchedIncome)
  push("unmatched_expense", result.unmatchedExpense)
  return lines.join("\n")
}
