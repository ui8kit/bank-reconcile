import { getDocument, GlobalWorkerOptions } from "pdfjs-dist"
import pdfWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url"

GlobalWorkerOptions.workerSrc = pdfWorker

/** Extract plain text from a PDF File (browser). */
export async function pdfToText(file: File): Promise<string> {
  const data = new Uint8Array(await file.arrayBuffer())
  const pdf = await getDocument({ data }).promise
  const parts: string[] = []
  for (let pageNo = 1; pageNo <= pdf.numPages; pageNo++) {
    const page = await pdf.getPage(pageNo)
    const content = await page.getTextContent()
    type Span = { str: string; x: number; y: number }
    const spans: Span[] = []
    for (const item of content.items) {
      if (!("str" in item) || !item.str) continue
      const transform = "transform" in item ? (item as { transform: number[] }).transform : [1, 0, 0, 1, 0, 0]
      spans.push({
        str: item.str,
        x: Number(transform[4] ?? 0),
        y: Number(transform[5] ?? 0),
      })
    }
    spans.sort((a, b) => (Math.abs(a.y - b.y) > 2 ? b.y - a.y : a.x - b.x))

    let line = ""
    let lastY: number | null = null
    let lastX: number | null = null
    for (const span of spans) {
      if (lastY !== null && Math.abs(span.y - lastY) > 2) {
        parts.push(line.trimEnd())
        line = ""
        lastX = null
      } else if (lastX !== null && span.x - lastX > 1.5 && line && !line.endsWith(" ")) {
        line += " "
      }
      line += span.str
      if (!span.str.endsWith(" ")) line += " "
      lastY = span.y
      lastX = span.x
    }
    if (line.trim()) parts.push(line.trimEnd())
    parts.push("")
  }
  return parts.join("\n")
}

export async function fileToText(file: File): Promise<string> {
  const name = file.name.toLowerCase()
  if (name.endsWith(".pdf")) return pdfToText(file)
  return file.text()
}
