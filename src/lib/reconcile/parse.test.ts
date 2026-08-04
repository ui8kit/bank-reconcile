import { describe, expect, test } from "vitest"
import { parseAmount, parseDateToken, rowsFromCsv, rowsFromText } from "./parse"
import { reconcile, resultToCsv } from "./match"

describe("parseAmount", () => {
  test("parses EU and plain amounts", () => {
    expect(parseAmount("1 234,56")).toBe(1234.56)
    expect(parseAmount("1234.56")).toBe(1234.56)
    expect(parseAmount("-50,00")).toBe(-50)
  })
})

describe("parseDateToken", () => {
  test("parses DD.MM.YYYY and ISO", () => {
    expect(parseDateToken("15.03.2024 оплата")).toBe("2024-03-15")
    expect(parseDateToken("2024-03-15 rent")).toBe("2024-03-15")
  })
})

describe("rowsFromText / reconcile", () => {
  test("does not glue document number into amount (акт№18)", () => {
    const rows = rowsFromText(
      "05.03.2024 Оплата по договору от ООО Ромашка по акту№18 125 000,00",
      "bank",
      "bank.txt",
    )
    expect(rows).toHaveLength(1)
    expect(rows[0]!.amount).toBe(125000)
    expect(rows[0]!.purpose).toContain("№18")
  })

  test("matches bank to income by amount+date+purpose", () => {
    const bank = rowsFromText(
      "15.03.2024 Оплата от ООО Ромашка 10 000,00\n16.03.2024 Комиссия банка 50,00",
      "bank",
      "bank.txt",
    )
    const income = rowsFromCsv(
      "date;amount;purpose\n15.03.2024;10000,00;ООО Ромашка\n",
      "income",
      "inc.csv",
    )
    const expense = rowsFromCsv(
      "date;amount;purpose\n16.03.2024;50,00;Комиссия банка\n",
      "expense",
      "exp.csv",
    )
    expect(bank.length).toBeGreaterThanOrEqual(2)
    expect(income.length).toBe(1)
    expect(expense.length).toBe(1)

    const result = reconcile(bank, income, expense)
    expect(result.matched.length).toBe(2)
    expect(result.unmatchedBank.length).toBe(0)
    expect(resultToCsv(result)).toContain("side,date,amount")
  })
})
