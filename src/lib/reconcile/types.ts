/** One normalized ledger line from bank or report. */
export type LedgerSide = "bank" | "income" | "expense"

export type LedgerRow = {
  id: string
  side: LedgerSide
  date: string // YYYY-MM-DD
  amount: number // signed: +income / -expense when known; bank may be signed
  purpose: string
  raw: string
  sourceFile: string
  lineNo: number
}

export type MatchPair = {
  bank: LedgerRow
  report: LedgerRow
  score: number
  reasons: string[]
}

export type ReconcileResult = {
  matched: MatchPair[]
  unmatchedBank: LedgerRow[]
  unmatchedIncome: LedgerRow[]
  unmatchedExpense: LedgerRow[]
  nearMisses: Array<{
    bank: LedgerRow
    candidate: LedgerRow
    score: number
    reasons: string[]
  }>
}

export type MatchOptions = {
  /** Absolute amount tolerance (currency units). Default 0.05 */
  amountTolerance: number
  /** Inclusive day window either side. Default 1 */
  dateWindowDays: number
  /**
   * Minimum purpose token overlap ratio 0..1. Default 0.35.
   * Set to 0 to match on amount+date only (ignore purpose).
   */
  purposeMinOverlap: number
}
