import { describe, expect, test } from "vitest"
import { readFileSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import ledger from "../../fixtures/samples/ledger.json"
import { rowsFromCsv, rowsFromText } from "./parse"
import { reconcile } from "./match"

const samplesDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../../public/samples",
)

function loadSamples() {
  const bankTxt = readFileSync(path.join(samplesDir, "bank.txt"), "utf8")
  const incomeCsv = readFileSync(path.join(samplesDir, "income.csv"), "utf8")
  const expenseCsv = readFileSync(path.join(samplesDir, "expense.csv"), "utf8")
  return {
    bank: rowsFromText(bankTxt, "bank", "bank.txt"),
    income: rowsFromCsv(incomeCsv, "income", "income.csv"),
    expense: rowsFromCsv(expenseCsv, "expense", "expense.csv"),
  }
}

describe("demo samples golden", () => {
  test("reconcile counts match ledger.expect", () => {
    const { bank, income, expense } = loadSamples()
    const result = reconcile(bank, income, expense)

    expect(result.matched.length).toBe(ledger.expect.matched)
    expect(result.unmatchedBank.length).toBe(ledger.expect.unmatchedBank)
    expect(result.unmatchedIncome.length).toBe(ledger.expect.unmatchedIncome)
    expect(result.unmatchedExpense.length).toBe(ledger.expect.unmatchedExpense)
  })

  test("known unmatched purposes are present", () => {
    const { bank, income, expense } = loadSamples()
    const result = reconcile(bank, income, expense)
    const bankPurposes = result.unmatchedBank.map((r) => r.purpose).join(" | ")
    const incomePurposes = result.unmatchedIncome.map((r) => r.purpose).join(" | ")
    const expensePurposes = result.unmatchedExpense.map((r) => r.purpose).join(" | ")

    expect(bankPurposes).toContain("смс")
    expect(bankPurposes).toContain("Вектор")
    expect(bankPurposes).toContain("CloudHost")
    expect(incomePurposes.toLowerCase()).toContain("ошибочно")
    expect(incomePurposes.toLowerCase()).toContain("вектор")
    expect(expensePurposes).toContain("Черновик")
    expect(expensePurposes).toContain("CloudHost")
  })
})
