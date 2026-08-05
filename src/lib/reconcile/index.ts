import { fileToText } from "./pdf"
import { rowsFromOds } from "./ods"
import { rowsFromCsv, rowsFromText } from "./parse"
import { reconcile, resultToCsv } from "./match"
import type { LedgerRow, LedgerSide, ReconcileResult } from "./types"

export type { LedgerRow, LedgerSide, ReconcileResult, MatchOptions } from "./types"
export { reconcile, resultToCsv } from "./match"
export { rowsFromOds } from "./ods"

export async function loadLedgerFile(
  file: File,
  side: LedgerSide,
): Promise<LedgerRow[]> {
  const lower = file.name.toLowerCase()
  if (lower.endsWith(".ods")) {
    return rowsFromOds(file, side, file.name)
  }
  const text = await fileToText(file)
  if (lower.endsWith(".csv") || lower.endsWith(".tsv") || lower.endsWith(".txt")) {
    if (text.includes(";") || (text.includes(",") && text.split("\n")[0]?.includes(","))) {
      const csv = rowsFromCsv(text, side, file.name)
      if (csv.length > 0) return csv
    }
  }
  return rowsFromText(text, side, file.name)
}

export async function runReconcile(files: {
  bank: File
  income: File
  expense: File
}): Promise<{ result: ReconcileResult; counts: Record<string, number> }> {
  const [bank, income, expense] = await Promise.all([
    loadLedgerFile(files.bank, "bank"),
    loadLedgerFile(files.income, "income"),
    loadLedgerFile(files.expense, "expense"),
  ])
  const result = reconcile(bank, income, expense)
  return {
    result,
    counts: {
      bank: bank.length,
      income: income.length,
      expense: expense.length,
      matched: result.matched.length,
      unmatchedBank: result.unmatchedBank.length,
      unmatchedIncome: result.unmatchedIncome.length,
      unmatchedExpense: result.unmatchedExpense.length,
    },
  }
}

export function downloadUnmatchedCsv(result: ReconcileResult, filename = "unmatched.csv") {
  const blob = new Blob([resultToCsv(result)], { type: "text/csv;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
