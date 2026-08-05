import { describe, expect, test } from "bun:test"
import { existsSync, readFileSync } from "fs"
import path from "path"
import {
  parseOdsContentXml,
  rowsFromOds,
  rowsFromOdsCells,
  zipReadFile,
} from "./ods"

/** Minimal uncompressed ZIP with a single entry (for fixtures). */
function zipStore(files: Record<string, string>): ArrayBuffer {
  const enc = new TextEncoder()
  const locals: Uint8Array[] = []
  const centrals: Uint8Array[] = []
  let offset = 0

  for (const [name, body] of Object.entries(files)) {
    const nameBytes = enc.encode(name)
    const data = enc.encode(body)
    const local = new Uint8Array(30 + nameBytes.length + data.length)
    const lv = new DataView(local.buffer)
    lv.setUint32(0, 0x04034b50, true)
    lv.setUint16(8, 0, true) // store
    lv.setUint32(18, data.length, true)
    lv.setUint32(22, data.length, true)
    lv.setUint16(26, nameBytes.length, true)
    local.set(nameBytes, 30)
    local.set(data, 30 + nameBytes.length)
    locals.push(local)

    const central = new Uint8Array(46 + nameBytes.length)
    const cv = new DataView(central.buffer)
    cv.setUint32(0, 0x02014b50, true)
    cv.setUint16(10, 0, true)
    cv.setUint32(20, data.length, true)
    cv.setUint32(24, data.length, true)
    cv.setUint16(28, nameBytes.length, true)
    cv.setUint32(42, offset, true)
    central.set(nameBytes, 46)
    centrals.push(central)
    offset += local.length
  }

  const cdSize = centrals.reduce((a, b) => a + b.length, 0)
  const eocd = new Uint8Array(22)
  const ev = new DataView(eocd.buffer)
  ev.setUint32(0, 0x06054b50, true)
  ev.setUint16(8, centrals.length, true)
  ev.setUint16(10, centrals.length, true)
  ev.setUint32(12, cdSize, true)
  ev.setUint32(16, offset, true)

  const total = offset + cdSize + 22
  const out = new Uint8Array(total)
  let p = 0
  for (const l of locals) {
    out.set(l, p)
    p += l.length
  }
  for (const c of centrals) {
    out.set(c, p)
    p += c.length
  }
  out.set(eocd, p)
  return out.buffer
}

const SAMPLE_CONTENT = `<?xml version="1.0" encoding="UTF-8"?>
<office:document-content xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0"
  xmlns:table="urn:oasis:names:tc:opendocument:xmlns:table:1.0"
  xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0"
  xmlns:calcext="urn:org:documentfoundation:names:experimental:calc:xml-fakedata">
  <office:body><office:spreadsheet>
    <table:table table:name="Ops">
      <table:table-row>
        <table:table-cell office:value-type="string"><text:p>Дата</text:p></table:table-cell>
        <table:table-cell office:value-type="string"><text:p>Операция</text:p></table:table-cell>
        <table:table-cell office:value-type="string"><text:p>Источник</text:p></table:table-cell>
        <table:table-cell office:value-type="string"><text:p>Сумма, ₽</text:p></table:table-cell>
        <table:table-cell office:value-type="string"><text:p>Приход, ₽</text:p></table:table-cell>
        <table:table-cell office:value-type="string"><text:p>Расход, ₽</text:p></table:table-cell>
      </table:table-row>
      <table:table-row>
        <table:table-cell office:value-type="string"><text:p>29.05.2026</text:p></table:table-cell>
        <table:table-cell office:value-type="string"><text:p>Оплата по счету №184</text:p></table:table-cell>
        <table:table-cell office:value-type="string"><text:p>Банковская операция</text:p></table:table-cell>
        <table:table-cell office:value-type="float" office:value="101300"><text:p>101300,00</text:p></table:table-cell>
        <table:table-cell office:value-type="float" office:value="101300"><text:p>101300,00</text:p></table:table-cell>
        <table:table-cell/>
      </table:table-row>
      <table:table-row>
        <table:table-cell office:value-type="string"><text:p>30.05.2026</text:p></table:table-cell>
        <table:table-cell office:value-type="string"><text:p>Возм К.912.26</text:p></table:table-cell>
        <table:table-cell office:value-type="string"><text:p>Банковская операция</text:p></table:table-cell>
        <table:table-cell office:value-type="float" office:value="48937.74"><text:p>48937,74</text:p></table:table-cell>
        <table:table-cell/>
        <table:table-cell office:value-type="float" office:value="912.26"><text:p>912,26</text:p></table:table-cell>
      </table:table-row>
      <table:table-row>
        <table:table-cell table:number-columns-repeated="3"/>
        <table:table-cell office:value-type="float" office:value="999"/>
      </table:table-row>
    </table:table>
  </office:spreadsheet></office:body>
</office:document-content>`

describe("ods zip + xml", () => {
  test("zipReadFile extracts stored content.xml", async () => {
    const buf = zipStore({ "content.xml": SAMPLE_CONTENT, "meta.xml": "<x/>" })
    const bytes = await zipReadFile(buf, "content.xml")
    expect(bytes).not.toBeNull()
    expect(new TextDecoder().decode(bytes!).includes("Оплата по счету")).toBe(true)
  })

  test("parseOdsContentXml reads cells and repeats", () => {
    const rows = parseOdsContentXml(SAMPLE_CONTENT)
    expect(rows.length).toBeGreaterThanOrEqual(3)
    expect(rows[0]![0]!.text).toBe("Дата")
    expect(rows[1]![3]!.value).toBe(101300)
    expect(rows[2]![5]!.value).toBe(912.26)
  })
})

describe("rowsFromOdsCells", () => {
  test("income prefers Приход column", () => {
    const rows = rowsFromOdsCells(parseOdsContentXml(SAMPLE_CONTENT), "income", "t.ods")
    expect(rows).toHaveLength(1)
    expect(rows[0]!.date).toBe("2026-05-29")
    expect(rows[0]!.amount).toBe(101300)
    expect(rows[0]!.purpose).toContain("Оплата по счету")
    expect(rows[0]!.purpose).not.toContain("Банковская")
  })

  test("expense prefers Расход column (not Сумма)", () => {
    const rows = rowsFromOdsCells(parseOdsContentXml(SAMPLE_CONTENT), "expense", "t.ods")
    expect(rows).toHaveLength(1)
    expect(rows[0]!.date).toBe("2026-05-30")
    expect(rows[0]!.amount).toBe(-912.26)
    expect(rows[0]!.purpose).toContain("Возм")
  })
})

describe("rowsFromOds file", () => {
  test("reads synthetic ODS buffer end-to-end", async () => {
    const buf = zipStore({ "content.xml": SAMPLE_CONTENT })
    const rows = await rowsFromOds(buf, "income", "sample.ods")
    expect(rows).toHaveLength(1)
    expect(rows[0]!.amount).toBe(101300)
  })

  const alexIncome = path.resolve(".project/alexs/Отчет приходы.ods")
  const alexExpense = path.resolve(".project/alexs/Отчет расходы.ods")

  test.skipIf(!existsSync(alexIncome))("parses Alex income ODS golden lines", async () => {
    const buf = readFileSync(alexIncome)
    const rows = await rowsFromOds(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), "income", "income.ods")
    expect(rows.length).toBeGreaterThanOrEqual(40)
    const hit = rows.find((r) => r.date === "2026-05-29" && Math.abs(r.amount - 101300) < 0.01)
    expect(hit).toBeTruthy()
    expect(hit!.purpose.toLowerCase()).toContain("ремонт")
    const kkt = rows.find((r) => r.date === "2026-05-29" && Math.abs(r.amount - 49850) < 0.01)
    expect(kkt).toBeTruthy()
  })

  test.skipIf(!existsSync(alexExpense))("parses Alex expense ODS golden lines", async () => {
    const buf = readFileSync(alexExpense)
    const rows = await rowsFromOds(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), "expense", "expense.ods")
    expect(rows.length).toBeGreaterThanOrEqual(100)
    const fee = rows.find((r) => r.date === "2026-05-29" && Math.abs(r.amount + 39) < 0.01)
    expect(fee).toBeTruthy()
    const vozm = rows.find((r) => r.date === "2026-05-30" && Math.abs(r.amount + 912.26) < 0.01)
    expect(vozm).toBeTruthy()
    expect(vozm!.purpose).toMatch(/Возм/i)
  })
})
