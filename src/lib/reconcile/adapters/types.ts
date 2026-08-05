import type { LedgerRow } from "../types"

export type AdapterDetectMeta = {
  fileName: string
}

/**
 * Bank statement adapter: normalize one bank's PDF/TXT dump into LedgerRow[].
 * Reports (income/expense) stay on shared CSV/ODS parsers unless a future
 * adapter opts into parseIncome / parseExpense.
 */
export type BankAdapter = {
  id: string
  label: string
  /** 0..1 confidence; omit if adapter is select-only */
  detect?: (text: string, meta: AdapterDetectMeta) => number
  parseBank: (text: string, sourceFile: string) => LedgerRow[]
}

/** Explicit choice from UI; `auto` uses detect() then falls back to generic. */
export type AdapterChoice = "auto" | string
