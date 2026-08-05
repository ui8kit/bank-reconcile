import { parseAmount, parseDateToken } from "../parse"
import type { LedgerRow } from "../types"
import type { BankAdapter } from "./types"

const START_DATE_RE = /^(\d{2})[./-](\d{2})[./-](\d{4})\s+(.*)$/
/** Money with decimals only (operation debit/credit). */
const MONEY_RE =
  /(?<![A-Za-z0-9№#])([+-]?\d{1,3}(?:[ \u00a0]\d{3})*[.,]\d{2}|[+-]?\d+[.,]\d{2})/g
/** No \\b — Cyrillic is not a JS word char. */
const DOC_TYPE_RE = /платежное\s+(?:поручение|требование)|банковский\s+ордер/gi
const PAGE_NOISE_RE =
  /^(контрагент|код)$|дата\s+номер\s+дебет|наименование,?\s*инн|^стр\.\s*\d+|остаток\s+входящий|остаток\s+исходящий|обороты\s+по\s+(?:дебету|кредиту)|^выписка\s+по|^счёт\s*:|^владелец|^период\s*:|^валюта|^инн\s*:|дата\s+предыдущей\s+операции|банк\s*\(бик/i

const ALEXS_LAYOUT_RE =
  /дата\s+номер\s+дебет\s+кредит|назначение\s+платежа\s+документ/i

/**
 * Client statement layout: columns Date | Doc№ | Debit/Credit | Purpose | Doc type.
 * PDF text often wraps so doc number sits on the date line and the amount on the next.
 */
export const alexsAdapter: BankAdapter = {
  id: "alexs",
  label: "Alexs",
  detect(text, meta) {
    let score = 0
    const name = meta.fileName.toLowerCase()
    if (name.includes("alexs") || name.includes("алекс")) score += 0.35
    if (ALEXS_LAYOUT_RE.test(text)) score += 0.55
    if (/платежное\s+поручение/i.test(text) && /возм\s+\d{2}\.\d{2}\.\d{4}/i.test(text)) {
      score += 0.2
    }
    if (/контрагент/i.test(text) && /дебет/i.test(text) && /кредит/i.test(text)) {
      score += 0.15
    }
    return Math.min(1, score)
  },
  parseBank(text, sourceFile) {
    return parseAlexsBank(text, sourceFile)
  },
}

function coalesceAlexsLines(text: string): string[] {
  const out: string[] = []
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim().replace(/\s+/g, " ")
    if (!line) continue
    if (PAGE_NOISE_RE.test(line)) continue
    if (START_DATE_RE.test(line) || out.length === 0) {
      out.push(line)
      continue
    }
    out[out.length - 1] = `${out[out.length - 1]} ${line}`
  }
  return out
}

/**
 * After the date, the next integer is the payment document number — strip it
 * so it cannot glue into spaced thousands (`14` + `600 000,00` → `600 000,00`).
 */
function stripDocNumber(rest: string): { docNo: string | null; body: string } {
  const m = rest.match(/^(\d{1,7})\s+(.*)$/)
  if (!m) return { docNo: null, body: rest }
  return { docNo: m[1]!, body: m[2]! }
}

function collectMoney(body: string): Array<{ raw: string; value: number; index: number }> {
  const cleaned = body.replace(/\d{2}[./-]\d{2}[./-]\d{4}/g, " ")
  const out: Array<{ raw: string; value: number; index: number }> = []
  MONEY_RE.lastIndex = 0
  let m: RegExpExecArray | null
  while ((m = MONEY_RE.exec(cleaned)) !== null) {
    const raw = m[1]!
    const value = parseAmount(raw)
    if (value === null) continue
    out.push({ raw, value, index: m.index })
  }
  return out
}

/**
 * Prefer debit/credit operation amount over commission fragments (`К.912.26`)
 * and ignore dd.mm.yyyy date pieces.
 */
function pickAlexsMoney(body: string): { raw: string; value: number } | null {
  const amounts = collectMoney(body)
  if (amounts.length === 0) return null
  const cleaned = body.replace(/\d{2}[./-]\d{2}[./-]\d{4}/g, " ")
  const notFee = amounts.filter((a) => {
    const before = cleaned.slice(Math.max(0, a.index - 4), a.index)
    return !/К\.\s*$/i.test(before)
  })
  const pool = notFee.length > 0 ? notFee : amounts
  // Prefer the first non-fee money-like token (debit/credit column).
  return { raw: pool[0]!.raw, value: pool[0]!.value }
}

function cleanPurpose(body: string, amountRaw: string): string {
  let purpose = body
  if (amountRaw) purpose = purpose.replace(amountRaw, " ")
  purpose = purpose.replace(/\d{2}[./-]\d{2}[./-]\d{4}/g, " ")
  purpose = purpose.replace(MONEY_RE, " ")
  purpose = purpose.replace(DOC_TYPE_RE, " ")
  purpose = purpose.replace(/платежное/gi, " ")
  purpose = purpose.replace(/в\s*т\.?\s*ч\.?\s*ндс[^]*$/i, " ")
  purpose = purpose.replace(/К\.\s*/gi, " ")
  return purpose.replace(/\s+/g, " ").trim()
}

export function parseAlexsBank(text: string, sourceFile: string): LedgerRow[] {
  const lines = coalesceAlexsLines(text)
  const rows: LedgerRow[] = []
  let i = 0
  for (const line of lines) {
    i += 1
    const m = line.match(START_DATE_RE)
    if (!m) continue
    const date = parseDateToken(`${m[1]}.${m[2]}.${m[3]}`)
    if (!date) continue

    const { body } = stripDocNumber(m[4]!.trim())
    const money = pickAlexsMoney(body)
    if (!money) continue

    const purpose = cleanPurpose(body, money.raw)
    rows.push({
      id: `bank-${sourceFile}-${i}`,
      side: "bank",
      date,
      amount: money.value,
      purpose,
      raw: line,
      sourceFile,
      lineNo: i,
    })
  }
  return rows
}
