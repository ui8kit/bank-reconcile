import { describe, expect, test } from "bun:test"
import { readFileSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { rowsFromCsv } from "../parse"
import { reconcile } from "../match"
import {
  detectAdapter,
  genericAdapter,
  listAdapters,
  psbAdapter,
  resolveAdapter,
} from "./index"

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../../")
const samplesDir = path.join(root, "public/samples")
const psbDir = path.join(root, "public/examples/psb")

describe("adapter registry", () => {
  test("lists generic and psb", () => {
    const ids = listAdapters().map((a) => a.id)
    expect(ids).toContain("generic")
    expect(ids).toContain("psb")
  })

  test("detects PSB markers", () => {
    const text = readFileSync(path.join(psbDir, "bank.txt"), "utf8")
    expect(detectAdapter(text, { fileName: "bank.txt" }).id).toBe("psb")
    expect(resolveAdapter("auto", text, { fileName: "x.txt" }).id).toBe("psb")
    expect(resolveAdapter("generic", text, { fileName: "x.txt" }).id).toBe("generic")
  })

  test("falls back to generic for demo samples", () => {
    const text = readFileSync(path.join(samplesDir, "bank.txt"), "utf8")
    expect(detectAdapter(text, { fileName: "bank.txt" }).id).toBe("generic")
  })
})

describe("generic adapter + samples", () => {
  test("reconcile counts stay stable", () => {
    const bank = genericAdapter.parseBank(
      readFileSync(path.join(samplesDir, "bank.txt"), "utf8"),
      "bank.txt",
    )
    const income = rowsFromCsv(
      readFileSync(path.join(samplesDir, "income.csv"), "utf8"),
      "income",
      "income.csv",
    )
    const expense = rowsFromCsv(
      readFileSync(path.join(samplesDir, "expense.csv"), "utf8"),
      "expense",
      "expense.csv",
    )
    const result = reconcile(bank, income, expense)
    expect(result.matched.length).toBe(5)
    expect(result.unmatchedBank.length).toBe(3)
    expect(result.unmatchedIncome.length).toBe(2)
    expect(result.unmatchedExpense.length).toBe(2)
  })
})

describe("psb adapter + examples", () => {
  test("golden reconcile counts", () => {
    const bank = psbAdapter.parseBank(
      readFileSync(path.join(psbDir, "bank.txt"), "utf8"),
      "bank.txt",
    )
    const income = rowsFromCsv(
      readFileSync(path.join(psbDir, "income.csv"), "utf8"),
      "income",
      "income.csv",
    )
    const expense = rowsFromCsv(
      readFileSync(path.join(psbDir, "expense.csv"), "utf8"),
      "expense",
      "expense.csv",
    )
    const result = reconcile(bank, income, expense)

    expect(bank.length).toBe(11)
    expect(result.matched.length).toBe(9)
    expect(result.unmatchedBank.length).toBe(2)
    expect(result.unmatchedIncome.length).toBe(1)
    expect(result.unmatchedExpense.length).toBe(2)

    const bankPurposes = result.unmatchedBank.map((r) => r.purpose).join(" | ")
    expect(bankPurposes).toContain("Проценты")
    expect(result.unmatchedIncome[0]!.purpose.toLowerCase()).toContain("ошибочно")
  })

  test("parses акт№18 without gluing document number into amount", () => {
    const rows = psbAdapter.parseBank(
      "05.03.2024 Оплата по договору от ООО Ромашка по акту№18 125 000,00",
      "psb.txt",
    )
    expect(rows).toHaveLength(1)
    expect(rows[0]!.amount).toBe(125000)
  })
})
