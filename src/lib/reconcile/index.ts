import {
  detectAdapter,
  listAdapters,
  resolveAdapter,
  type AdapterChoice,
} from "./adapters"
import { fileToText } from "./pdf"
import { rowsFromOds } from "./ods"
import { rowsFromCsv, rowsFromText } from "./parse"
import { reconcile, resultToCsv } from "./match"
import type { LedgerRow, LedgerSide, ReconcileResult } from "./types"

export type { LedgerRow, LedgerSide, ReconcileResult, MatchOptions } from "./types"
export type { AdapterChoice, BankAdapter } from "./adapters"
export { reconcile, resultToCsv } from "./match"
export { rowsFromOds } from "./ods"
export { listAdapters, detectAdapter, resolveAdapter, getAdapter } from "./adapters"

export type LoadLedgerOptions = {
  /** Bank adapter: auto | generic | psb | … */
  adapter?: AdapterChoice
}

export async function loadLedgerFile(
  file: File,
  side: LedgerSide,
  options: LoadLedgerOptions = {},
): Promise<LedgerRow[]> {
  const lower = file.name.toLowerCase()
  if (lower.endsWith(".ods")) {
    return rowsFromOds(file, side, file.name)
  }
  const text = await fileToText(file)
  if (lower.endsWith(".csv") || lower.endsWith(".tsv") || lower.endsWith(".txt")) {
    // Structured reports / CSV dumps — shared parser (not bank-adapter specific).
    if (
      side !== "bank" &&
      (text.includes(";") || (text.includes(",") && text.split("\n")[0]?.includes(",")))
    ) {
      const csv = rowsFromCsv(text, side, file.name)
      if (csv.length > 0) return csv
    }
    // Bank .txt may still be CSV-shaped; prefer CSV when it clearly parses.
    if (
      side === "bank" &&
      (text.includes(";") || (text.includes(",") && /date|дата/i.test(text.split("\n")[0] ?? "")))
    ) {
      const csv = rowsFromCsv(text, side, file.name)
      if (csv.length > 0) return csv
    }
  }

  if (side === "bank") {
    const adapter = resolveAdapter(options.adapter ?? "auto", text, {
      fileName: file.name,
    })
    return adapter.parseBank(text, file.name)
  }

  return rowsFromText(text, side, file.name)
}

export async function runReconcile(
  files: {
    bank: File
    income: File
    expense: File
  },
  options: LoadLedgerOptions = {},
): Promise<{
  result: ReconcileResult
  counts: Record<string, number>
  adapterId: string
}> {
  const bankText = files.bank.name.toLowerCase().endsWith(".ods")
    ? ""
    : await fileToText(files.bank)
  const adapter = resolveAdapter(options.adapter ?? "auto", bankText, {
    fileName: files.bank.name,
  })

  const [bank, income, expense] = await Promise.all([
    loadLedgerFile(files.bank, "bank", { adapter: adapter.id }),
    loadLedgerFile(files.income, "income"),
    loadLedgerFile(files.expense, "expense"),
  ])
  const result = reconcile(bank, income, expense)
  return {
    result,
    adapterId: adapter.id,
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
