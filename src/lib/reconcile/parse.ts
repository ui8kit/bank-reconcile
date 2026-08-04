import type { LedgerRow, LedgerSide } from "./types"

const DATE_RE =
  /(\d{2})[./-](\d{2})[./-](\d{4})|(\d{4})[./-](\d{2})[./-](\d{2})/
const START_DATE_RE = /^(\d{2})[./-](\d{2})[./-](\d{4})/
// Russian / EU amounts: 1 234,56 or 1234.56 or -1.234,56
// Do not start after letters/digits/№/# (avoids "акт№18 125 000,00" → 18125000).
const AMOUNT_RE =
  /(?<![A-Za-z0-9№#])([+-]?\d{1,3}(?:[ \u00a0]\d{3})*(?:[.,]\d{2})|[+-]?\d+[.,]\d{2}|[+-]?\d+)(?!\d)/g

const SKIP_LINE_RE =
  /формирования\s+выписки|за\s+период|входящий\s+остаток|исходящий\s+остаток|^(итого|приход|расход)(?:\s*:|\s|$)/i

export function parseAmount(raw: string): number | null {
  let s = raw.trim().replace(/\u00a0/g, " ").replace(/\s+/g, "")
  if (!s) return null
  // 1.234,56 → 1234.56
  if (/^\d{1,3}(\.\d{3})+(,\d+)$/.test(s) || /^[+-]?\d{1,3}(\.\d{3})+,\d{2}$/.test(s)) {
    s = s.replace(/\./g, "").replace(",", ".")
  } else if (s.includes(",") && !s.includes(".")) {
    s = s.replace(",", ".")
  }
  const n = Number(s)
  return Number.isFinite(n) ? n : null
}

export function parseDateToken(raw: string): string | null {
  const m = raw.match(DATE_RE)
  if (!m) return null
  if (m[1] && m[2] && m[3]) {
    // DD.MM.YYYY
    return `${m[3]}-${m[2]}-${m[1]}`
  }
  if (m[4] && m[5] && m[6]) {
    return `${m[4]}-${m[5]}-${m[6]}`
  }
  return null
}

export function normalizePurpose(text: string): string {
  return text
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/[^a-z0-9а-я]+/gi, " ")
    .replace(/\s+/g, " ")
    .trim()
}

export function purposeTokens(text: string): Set<string> {
  const norm = normalizePurpose(text)
  const out = new Set<string>()
  for (const t of norm.split(" ")) {
    if (t.length >= 3) out.add(t)
  }
  return out
}

function extractPurpose(line: string, dateRaw: string, amountRaw: string): string {
  let purpose = line
  if (dateRaw) purpose = purpose.replace(dateRaw, " ")
  if (amountRaw) purpose = purpose.replace(amountRaw, " ")
  purpose = purpose.replace(AMOUNT_RE, " ").replace(DATE_RE, " ")
  return purpose.replace(/\s+/g, " ").trim()
}

/**
 * Join wrapped bank-statement purpose lines into the preceding dated row.
 */
export function coalesceStatementLines(text: string): string[] {
  const out: string[] = []
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim().replace(/\s+/g, " ")
    if (!line) continue
    if (START_DATE_RE.test(line) || out.length === 0) {
      out.push(line)
      continue
    }
    if (SKIP_LINE_RE.test(line)) {
      out.push(line)
      continue
    }
    out[out.length - 1] = `${out[out.length - 1]} ${line}`
  }
  return out
}

function collectAmounts(withoutDate: string): Array<{ raw: string; value: number; index: number }> {
  const amounts: Array<{ raw: string; value: number; index: number }> = []
  AMOUNT_RE.lastIndex = 0
  let m: RegExpExecArray | null
  while ((m = AMOUNT_RE.exec(withoutDate)) !== null) {
    const raw = m[1]!
    const value = parseAmount(raw)
    if (value === null) continue
    // skip years mistaken as amounts
    if (value >= 1900 && value <= 2100 && !/[.,]/.test(raw)) continue
    // skip payment-order / account-like integers
    if (!/[.,]/.test(raw) && Math.abs(value) >= 1_000_000) continue
    amounts.push({ raw, value, index: m.index })
  }
  return amounts
}

/**
 * Pick operation amount. Bank tables often end with running balance —
 * when several money amounts exist, use the first money-like value (credit/debit),
 * not the trailing остаток.
 */
export function pickOperationAmount(
  amounts: Array<{ raw: string; value: number; index: number }>,
): { raw: string; value: number; index: number } | null {
  if (amounts.length === 0) return null
  const moneyLike = amounts.filter((a) => /[.,]\d{2}$/.test(a.raw))
  if (moneyLike.length >= 1) return moneyLike[0]!
  return amounts[amounts.length - 1]!
}

/**
 * Heuristic line parser for bank / report text dumps.
 * Keeps lines that contain both a date and an amount.
 */
export function rowsFromText(
  text: string,
  side: LedgerSide,
  sourceFile: string,
): LedgerRow[] {
  const lines = coalesceStatementLines(text)
  const rows: LedgerRow[] = []
  let i = 0
  for (const line of lines) {
    i += 1
    const trimmed = line.trim()
    if (trimmed.length < 8) continue
    if (SKIP_LINE_RE.test(trimmed)) continue
    if (!START_DATE_RE.test(trimmed)) continue

    const dateMatch = trimmed.match(DATE_RE)
    const date = parseDateToken(trimmed)
    if (!date || !dateMatch) continue

    // Strip the date token so DD.MM / MM.DD fragments are not treated as money.
    const withoutDate =
      trimmed.slice(0, dateMatch.index ?? 0) +
      " " +
      trimmed.slice((dateMatch.index ?? 0) + dateMatch[0].length)

    const amounts = collectAmounts(withoutDate)
    const pick = pickOperationAmount(amounts)
    if (!pick) continue

    let amount = pick.value
    if (side === "expense" && amount > 0) amount = -Math.abs(amount)
    if (side === "income" && amount < 0) amount = Math.abs(amount)

    const purpose = extractPurpose(trimmed, dateMatch[0], pick.raw)
    rows.push({
      id: `${side}-${sourceFile}-${i}`,
      side,
      date,
      amount,
      purpose: purpose || trimmed,
      raw: trimmed,
      sourceFile,
      lineNo: i,
    })
  }
  return rows
}

/** Minimal CSV: date;amount;purpose or date,amount,purpose */
export function rowsFromCsv(
  text: string,
  side: LedgerSide,
  sourceFile: string,
): LedgerRow[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim())
  if (lines.length === 0) return []
  const sep = lines[0]!.includes(";") ? ";" : ","
  const rows: LedgerRow[] = []
  let start = 0
  const header = lines[0]!.toLowerCase()
  if (header.includes("date") || header.includes("дата") || header.includes("sum") || header.includes("сумм")) {
    start = 1
  }
  for (let i = start; i < lines.length; i++) {
    const parts = lines[i]!.split(sep).map((p) => p.trim().replace(/^"|"$/g, ""))
    if (parts.length < 2) continue
    const date = parseDateToken(parts[0]!) ?? parseDateToken(parts.join(" "))
    const amountRaw = parts.find((p) => parseAmount(p) !== null && !parseDateToken(p)) ?? parts[1]!
    const amountVal = parseAmount(amountRaw)
    if (!date || amountVal === null) continue
    let amount = amountVal
    if (side === "expense" && amount > 0) amount = -Math.abs(amount)
    if (side === "income" && amount < 0) amount = Math.abs(amount)
    const purpose = parts.filter((p) => p !== parts[0] && p !== amountRaw).join(" ") || lines[i]!
    rows.push({
      id: `${side}-${sourceFile}-${i + 1}`,
      side,
      date,
      amount,
      purpose,
      raw: lines[i]!,
      sourceFile,
      lineNo: i + 1,
    })
  }
  return rows
}
