import { describe, expect, test } from "bun:test"
import { readFileSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { rowsFromCsv } from "../parse"
import { rowsFromOds } from "../ods"
import { reconcile } from "../match"
import {
  alexsAdapter,
  detectAdapter,
  genericAdapter,
  listAdapters,
  psbAdapter,
  resolveAdapter,
} from "./index"

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../../")
const samplesDir = path.join(root, "public/samples")
const psbDir = path.join(root, "public/examples/psb")
const alexsDir = path.join(root, "public/examples/alexs")

describe("adapter registry", () => {
  test("lists generic, psb, alexs", () => {
    const ids = listAdapters().map((a) => a.id)
    expect(ids).toContain("generic")
    expect(ids).toContain("psb")
    expect(ids).toContain("alexs")
  })

  test("detects PSB markers", () => {
    const text = readFileSync(path.join(psbDir, "bank.txt"), "utf8")
    expect(detectAdapter(text, { fileName: "bank.txt" }).id).toBe("psb")
    expect(resolveAdapter("auto", text, { fileName: "x.txt" }).id).toBe("psb")
    expect(resolveAdapter("generic", text, { fileName: "x.txt" }).id).toBe("generic")
  })

  test("detects alexs debit/credit layout (not PSB)", () => {
    const text = readFileSync(path.join(alexsDir, "bank.txt"), "utf8")
    expect(detectAdapter(text, { fileName: "Выписка.pdf" }).id).toBe("alexs")
    expect(psbAdapter.detect?.(text, { fileName: "Выписка.pdf" }) ?? 0).toBe(0)
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

describe("alexs adapter + examples", () => {
  test("strips document number from spaced thousands", () => {
    const rows = alexsAdapter.parseBank(
      [
        "Дата Номер Дебет Кредит Назначение платежа Документ",
        "04.05.2026 14",
        "600 000,00 Платежное поручение",
        "29.05.2026 481 101 300,00 Платежное поручение",
        "13.05.2026 174",
        "510,00 Платежное поручение",
      ].join("\n"),
      "alexs.txt",
    )
    expect(rows.map((r) => r.amount).sort((a, b) => a - b)).toEqual([510, 101300, 600000])
  })

  test("Возм adds K. to settlement and emits fee leg", () => {
    const rows = alexsAdapter.prepareBankRows!(
      alexsAdapter.parseBank(
        [
          "Дата Номер Дебет Кредит Назначение платежа Документ",
          "07.05.2026 11639",
          "32 788,78 Возм 17.07.2024 АВТО Р.0026 К.611.22 в т.ч. НДС 110.22 Платежное поручение",
        ].join("\n"),
        "v.txt",
      ),
    )
    expect(rows).toHaveLength(2)
    expect(rows[0]!.amount).toBe(33400)
    expect(rows[1]!.amount).toBe(611.22)
    expect(rows[1]!.id.endsWith("-k")).toBe(true)
  })

  test("golden reconcile counts with ODS reports", async () => {
    const bankRaw = alexsAdapter.parseBank(
      readFileSync(path.join(alexsDir, "bank.txt"), "utf8"),
      "bank.txt",
    )
    const bank = alexsAdapter.prepareBankRows!(bankRaw)
    const incomeBuf = readFileSync(path.join(alexsDir, "income.ods"))
    const expenseBuf = readFileSync(path.join(alexsDir, "expense.ods"))
    const income = await rowsFromOds(
      incomeBuf.buffer.slice(incomeBuf.byteOffset, incomeBuf.byteOffset + incomeBuf.byteLength),
      "income",
      "income.ods",
    )
    const expense = await rowsFromOds(
      expenseBuf.buffer.slice(expenseBuf.byteOffset, expenseBuf.byteOffset + expenseBuf.byteLength),
      "expense",
      "expense.ods",
    )
    const result = reconcile(bank, income, expense, alexsAdapter.matchOptions)

    expect(bankRaw.length).toBe(139)
    expect(bank.length).toBe(157)
    expect(income.length).toBe(41)
    expect(expense.length).toBe(104)
    expect(result.matched.length).toBe(143)
    expect(result.unmatchedIncome.length).toBe(2)
    expect(result.unmatchedExpense.length).toBe(0)
    expect(result.unmatchedBank.length).toBe(14)

    expect(result.unmatchedIncome.every((r) => /^РН$/i.test(r.purpose.trim()))).toBe(true)
  })
})
