import { parseAmount, parseDateToken } from "./parse"
import type { LedgerRow, LedgerSide } from "./types"

export type OdsCell = {
  text: string
  /** Numeric value from office:value when present */
  value: number | null
  /** ISO date from office:date-value when present */
  dateValue: string | null
}

function decodeXmlEntities(s: string): string {
  return s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&")
}

function attr(tag: string, name: string): string | null {
  const re = new RegExp(`\\b(?:[\\w.-]+:)?${name}="([^"]*)"`, "i")
  const m = tag.match(re)
  return m ? decodeXmlEntities(m[1]!) : null
}

async function inflateRaw(data: Uint8Array): Promise<Uint8Array> {
  const ds = new DecompressionStream("deflate-raw")
  const copy = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) as ArrayBuffer
  const stream = new Blob([copy]).stream().pipeThrough(ds)
  return new Uint8Array(await new Response(stream).arrayBuffer())
}

/**
 * Read one entry from a ZIP (ODS) archive by exact path.
 * Supports store (0) and deflate (8).
 */
export async function zipReadFile(
  buffer: ArrayBuffer,
  entryPath: string,
): Promise<Uint8Array | null> {
  const bytes = new Uint8Array(buffer)
  const view = new DataView(buffer)
  const want = entryPath.replace(/^\//, "")

  // End of central directory (no zip64)
  let eocd = -1
  for (let i = bytes.length - 22; i >= 0 && i >= bytes.length - 66_000; i--) {
    if (view.getUint32(i, true) === 0x06054b50) {
      eocd = i
      break
    }
  }
  if (eocd < 0) return null

  const cdOffset = view.getUint32(eocd + 16, true)
  const cdCount = view.getUint16(eocd + 10, true)
  let offset = cdOffset

  for (let n = 0; n < cdCount; n++) {
    if (view.getUint32(offset, true) !== 0x02014b50) break
    const method = view.getUint16(offset + 10, true)
    const compSize = view.getUint32(offset + 20, true)
    const nameLen = view.getUint16(offset + 28, true)
    const extraLen = view.getUint16(offset + 30, true)
    const commentLen = view.getUint16(offset + 32, true)
    const localHeader = view.getUint32(offset + 42, true)
    const nameBytes = bytes.subarray(offset + 46, offset + 46 + nameLen)
    const name = new TextDecoder("utf-8").decode(nameBytes)
    offset += 46 + nameLen + extraLen + commentLen

    if (name !== want) continue

    if (view.getUint32(localHeader, true) !== 0x04034b50) return null
    const localNameLen = view.getUint16(localHeader + 26, true)
    const localExtraLen = view.getUint16(localHeader + 28, true)
    const dataStart = localHeader + 30 + localNameLen + localExtraLen
    const compressed = bytes.subarray(dataStart, dataStart + compSize)
    if (method === 0) return compressed
    if (method === 8) return inflateRaw(compressed)
    throw new Error(`Unsupported ZIP compression method ${method} for ${want}`)
  }
  return null
}

function isEmptyCell(cell: OdsCell): boolean {
  return !cell.text && cell.value == null && !cell.dateValue
}

/** Drop leading blank cells so header/data column indices align across rows. */
function trimLeadingEmptyCells(cells: OdsCell[]): OdsCell[] {
  let i = 0
  while (i < cells.length && isEmptyCell(cells[i]!)) i++
  return i === 0 ? cells : cells.slice(i)
}

function cellTextFromInner(inner: string): string {
  const parts: string[] = []
  const re = /<(?:[\w.-]+:)?p\b[^>]*>([\s\S]*?)<\/(?:[\w.-]+:)?p>/gi
  let m: RegExpExecArray | null
  while ((m = re.exec(inner)) !== null) {
    const raw = m[1]!.replace(/<[^>]+>/g, "")
    parts.push(decodeXmlEntities(raw))
  }
  return parts.join(" ").replace(/\s+/g, " ").trim()
}

function parseCellOpen(openTag: string, inner: string): { cell: OdsCell; repeat: number } {
  const repeat = Math.max(1, Number(attr(openTag, "number-columns-repeated") || "1") || 1)
  const valueRaw = attr(openTag, "value")
  const dateRaw = attr(openTag, "date-value")
  let value: number | null = null
  if (valueRaw != null && valueRaw !== "") {
    const n = Number(valueRaw)
    if (Number.isFinite(n)) value = n
  }
  const text = cellTextFromInner(inner)
  return {
    cell: {
      text,
      value,
      dateValue: dateRaw,
    },
    repeat: Math.min(repeat, 64),
  }
}

/** Parse first spreadsheet table in ODF content.xml into a cell matrix. */
export function parseOdsContentXml(xml: string): OdsCell[][] {
  const tableMatch = xml.match(/<(?:[\w.-]+:)?table\b[^>]*>[\s\S]*?<\/(?:[\w.-]+:)?table>/i)
  if (!tableMatch) return []
  const tableXml = tableMatch[0]!
  const rows: OdsCell[][] = []

  const rowRe = /<(?:[\w.-]+:)?table-row\b([^>]*)>([\s\S]*?)<\/(?:[\w.-]+:)?table-row>/gi
  let rowMatch: RegExpExecArray | null
  while ((rowMatch = rowRe.exec(tableXml)) !== null) {
    const rowOpen = rowMatch[1] || ""
    const rowInner = rowMatch[2] || ""
    const rowRepeat = Math.max(1, Number(attr(`x ${rowOpen}`, "number-rows-repeated") || "1") || 1)
    const cells: OdsCell[] = []

    // Void: <table:table-cell ... />  Paired: <table:table-cell ...>...</table:table-cell>
    // Do not let a trailing "/" of self-closing tags fall into the attr capture.
    const cellRe =
      /<(?:[\w.-]+:)?table-cell\b([^>/]*)(?:\/>|>([\s\S]*?)<\/(?:[\w.-]+:)?table-cell>)/gi
    let cellMatch: RegExpExecArray | null
    while ((cellMatch = cellRe.exec(rowInner)) !== null) {
      const openAttrs = cellMatch[1] || ""
      const inner = cellMatch[2] ?? ""
      const { cell, repeat } = parseCellOpen(`<c ${openAttrs}>`, inner)
      for (let i = 0; i < repeat; i++) cells.push(cell)
    }

    while (cells.length && isEmptyCell(cells[cells.length - 1]!)) {
      cells.pop()
    }
    const trimmed = trimLeadingEmptyCells(cells)
    if (!trimmed.some((c) => !isEmptyCell(c))) continue

    const cappedRowRepeat = Math.min(rowRepeat, 32)
    for (let i = 0; i < cappedRowRepeat; i++) rows.push(trimmed)
  }
  return rows
}

function normHeader(s: string): string {
  return s.toLowerCase().replace(/ё/g, "е").replace(/\s+/g, " ").trim()
}

type ColMap = {
  date: number
  purpose: number
  amount: number
}

function findHeaderMap(rows: OdsCell[][], side: LedgerSide): { map: ColMap; bodyStart: number } | null {
  const scan = Math.min(rows.length, 20)
  for (let r = 0; r < scan; r++) {
    const headers = rows[r]!.map((c) => normHeader(c.text))
    if (!headers.some((h) => h.includes("дата") || h === "date")) continue

    const date = headers.findIndex((h) => h.includes("дата") || h === "date")
    let purpose = headers.findIndex(
      (h) =>
        h.includes("операц") ||
        h.includes("назначен") ||
        h.includes("purpose") ||
        h.includes("описание") ||
        h.includes("контрагент"),
    )

    let amount = -1
    if (side === "income") {
      amount = headers.findIndex((h) => h.includes("приход") && !h.includes("возврат"))
    } else if (side === "expense") {
      amount = headers.findIndex((h) => h.includes("расход") && !h.includes("возврат"))
    }
    if (amount < 0) {
      amount = headers.findIndex(
        (h) =>
          (h.includes("сумм") || h === "amount" || h === "sum" || h.includes("debit") || h.includes("кредит") || h.includes("дебет")) &&
          !h.includes("возврат") &&
          !h.includes("размет"),
      )
    }
    if (date < 0 || amount < 0) continue
    if (purpose < 0) purpose = headers.findIndex((h, i) => i !== date && i !== amount && h.length > 0)
    if (purpose < 0) purpose = date

    return { map: { date, purpose, amount }, bodyStart: r + 1 }
  }
  return null
}

function cellDate(cell: OdsCell | undefined): string | null {
  if (!cell) return null
  if (cell.dateValue) {
    // office:date-value is YYYY-MM-DD or dateTime
    const iso = cell.dateValue.slice(0, 10)
    if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso
  }
  return parseDateToken(cell.text)
}

function cellAmount(cell: OdsCell | undefined): number | null {
  if (!cell) return null
  if (cell.value != null && Number.isFinite(cell.value)) return cell.value
  return parseAmount(cell.text)
}

/**
 * Map a spreadsheet matrix (from ODS) to ledger rows using header heuristics.
 */
export function rowsFromOdsCells(
  rows: OdsCell[][],
  side: LedgerSide,
  sourceFile: string,
): LedgerRow[] {
  if (rows.length === 0) return []
  const found = findHeaderMap(rows, side)
  const out: LedgerRow[] = []

  if (!found) {
    // Fallback: first col date, second amount, rest purpose (CSV-like)
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]!
      const date = cellDate(row[0]) ?? parseDateToken(row.map((c) => c.text).join(" "))
      const amountCell =
        row.find((c, idx) => idx > 0 && cellAmount(c) != null && !cellDate(c)) ?? row[1]
      const amountVal = cellAmount(amountCell)
      if (!date || amountVal == null) continue
      let amount = amountVal
      if (side === "expense" && amount > 0) amount = -Math.abs(amount)
      if (side === "income" && amount < 0) amount = Math.abs(amount)
      const purpose =
        row
          .filter((c) => c !== row[0] && c !== amountCell)
          .map((c) => c.text)
          .filter(Boolean)
          .join(" ") || row.map((c) => c.text).join(" ")
      out.push({
        id: `${side}-${sourceFile}-${i + 1}`,
        side,
        date,
        amount,
        purpose,
        raw: row.map((c) => c.text).join(" | "),
        sourceFile,
        lineNo: i + 1,
      })
    }
    return out
  }

  const { map, bodyStart } = found
  for (let i = bodyStart; i < rows.length; i++) {
    const row = rows[i]!
    const date = cellDate(row[map.date])
    const amountVal = cellAmount(row[map.amount])
    if (!date || amountVal == null) continue

    let amount = amountVal
    if (side === "expense" && amount > 0) amount = -Math.abs(amount)
    if (side === "income" && amount < 0) amount = Math.abs(amount)

    // Source (e.g. ККТ) stays in raw only so it does not dilute purpose matching.
    const purpose =
      (row[map.purpose]?.text ?? "").replace(/\s+/g, " ").trim() ||
      row.map((c) => c.text).join(" ")
    const raw = row.map((c) => c.text).filter(Boolean).join(" | ")

    out.push({
      id: `${side}-${sourceFile}-${i + 1}`,
      side,
      date,
      amount,
      purpose,
      raw,
      sourceFile,
      lineNo: i + 1,
    })
  }
  return out
}

/** Extract ledger rows from an ODS File / ArrayBuffer (browser-safe). */
export async function rowsFromOds(
  input: ArrayBuffer | File,
  side: LedgerSide,
  sourceFile: string,
): Promise<LedgerRow[]> {
  const buffer = input instanceof File ? await input.arrayBuffer() : input
  const name = sourceFile || (input instanceof File ? input.name : "sheet.ods")
  const xmlBytes = await zipReadFile(buffer, "content.xml")
  if (!xmlBytes) throw new Error(`ODS has no content.xml: ${name}`)
  const xml = new TextDecoder("utf-8").decode(xmlBytes)
  const cells = parseOdsContentXml(xml)
  return rowsFromOdsCells(cells, side, name)
}
