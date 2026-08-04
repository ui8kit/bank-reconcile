/**
 * Generate demo bank / income / expense samples from ledger.json.
 *
 * Usage: bun run samples
 * Output: public/samples/{bank.pdf,bank.txt,income.csv,expense.csv,README.md}
 */
import { mkdir, readFile, writeFile } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"
import fontkit from "@pdf-lib/fontkit"
import { PDFDocument, rgb } from "pdf-lib"
import ledger from "../src/fixtures/samples/ledger.json"

type Side = "income" | "expense"
type Line = { date: string; amount: number; purpose: string }
type Payment = {
  id: string
  side: Side
  case: string
  expectMatch: boolean
  bank: Line | null
  report: Line | null
}

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const outDir = path.join(rootDir, "public", "samples")
const fontPath = path.join(
  rootDir,
  "src",
  "fixtures",
  "samples",
  "fonts",
  "NotoSans-Regular.ttf",
)

function fmtRuDate(iso: string): string {
  const [y, m, d] = iso.split("-")
  return `${d}.${m}.${y}`
}

function fmtAmount(n: number): string {
  const abs = Math.abs(n)
  const fixed = abs.toFixed(2).replace(".", ",")
  const [intPart, frac] = fixed.split(",") as [string, string]
  const grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, " ")
  const sign = n < 0 ? "-" : ""
  return `${sign}${grouped},${frac}`
}

function bankLine(line: Line): string {
  return `${fmtRuDate(line.date)} ${line.purpose} ${fmtAmount(line.amount)}`
}

function csvEscape(value: string): string {
  if (/[;"\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`
  return value
}

function buildCsv(rows: Line[]): string {
  const lines = ["date;amount;purpose"]
  for (const row of rows) {
    lines.push(
      `${fmtRuDate(row.date)};${fmtAmount(row.amount)};${csvEscape(row.purpose)}`,
    )
  }
  return `${lines.join("\n")}\n`
}

async function buildBankPdf(lines: string[]): Promise<Uint8Array> {
  const pdf = await PDFDocument.create()
  pdf.registerFontkit(fontkit)
  const fontBytes = await readFile(fontPath)
  const font = await pdf.embedFont(fontBytes, { subset: true })

  const pageWidth = 595.28
  const pageHeight = 841.89
  const margin = 40
  let page = pdf.addPage([pageWidth, pageHeight])
  let y = pageHeight - margin

  const titleSize = 14
  const bodySize = 9
  const leading = 14

  const draw = (text: string, size: number, color = rgb(0.1, 0.12, 0.16)) => {
    if (y < margin + leading) {
      page = pdf.addPage([pageWidth, pageHeight])
      y = pageHeight - margin
    }
    page.drawText(text, {
      x: margin,
      y,
      size,
      font,
      color,
      maxWidth: pageWidth - margin * 2,
    })
    y -= leading
  }

  draw("Выписка по счёту (демо)", titleSize)
  draw(`Период: ${ledger.meta.period} · ${ledger.meta.currency}`, bodySize)
  draw("Операции:", bodySize)
  y -= 4
  for (const line of lines) draw(line, bodySize)
  y -= 8
  draw("Документ сформирован для тестирования Bank reconcile.", 8, rgb(0.4, 0.42, 0.45))

  return pdf.save()
}

async function main() {
  const payments = ledger.payments as Payment[]
  const bankLines: Line[] = []
  const incomeLines: Line[] = []
  const expenseLines: Line[] = []

  for (const p of payments) {
    if (p.bank) bankLines.push(p.bank)
    if (p.report) {
      if (p.side === "income") incomeLines.push(p.report)
      else expenseLines.push(p.report)
    }
  }

  bankLines.sort((a, b) => a.date.localeCompare(b.date))
  incomeLines.sort((a, b) => a.date.localeCompare(b.date))
  expenseLines.sort((a, b) => a.date.localeCompare(b.date))

  const bankTextLines = [
    "Выписка по счёту (демо)",
    `Период: ${ledger.meta.period}`,
    "",
    ...bankLines.map(bankLine),
    "",
  ]
  const bankTxt = `${bankTextLines.join("\n")}\n`
  const incomeCsv = buildCsv(incomeLines)
  const expenseCsv = buildCsv(expenseLines)
  const bankPdf = await buildBankPdf(bankLines.map(bankLine))

  await mkdir(outDir, { recursive: true })
  await writeFile(path.join(outDir, "bank.txt"), bankTxt, "utf8")
  await writeFile(path.join(outDir, "income.csv"), incomeCsv, "utf8")
  await writeFile(path.join(outDir, "expense.csv"), expenseCsv, "utf8")
  await writeFile(path.join(outDir, "bank.pdf"), bankPdf)

  const readme = `# Demo samples

Generated from \`src/fixtures/samples/ledger.json\`.

| File | Role |
|------|------|
| \`bank.pdf\` / \`bank.txt\` | Bank statement |
| \`income.csv\` | Income report |
| \`expense.csv\` | Expense report |

## Expected reconcile (default matcher)

- matched: **${ledger.expect.matched}**
- unmatched bank: **${ledger.expect.unmatchedBank}**
- unmatched income: **${ledger.expect.unmatchedIncome}**
- unmatched expense: **${ledger.expect.unmatchedExpense}**

Cases covered: exact match, date ±1 day, amount ±0.05, purpose overlap,
bank-only, report-only, date too far (±3), amount too far.

Regenerate:

\`\`\`sh
bun run samples
\`\`\`
`
  await writeFile(path.join(outDir, "README.md"), readme, "utf8")

  console.log(`wrote samples → ${path.relative(rootDir, outDir)}`)
  console.log(
    `bank=${bankLines.length} income=${incomeLines.length} expense=${expenseLines.length}`,
  )
  console.log(
    `expect matched=${ledger.expect.matched} unmatchedBank=${ledger.expect.unmatchedBank} unmatchedIncome=${ledger.expect.unmatchedIncome} unmatchedExpense=${ledger.expect.unmatchedExpense}`,
  )
}

await main()
