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
    let line = ""
    let lastY: number | null = null
    for (const item of content.items) {
      if (!("str" in item)) continue
      const y = "transform" in item ? Number((item as { transform: number[] }).transform[5]) : 0
      if (lastY !== null && Math.abs(y - lastY) > 2) {
        parts.push(line.trimEnd())
        line = ""
      }
      line += item.str
      // pdf.js often omits spaces between spans
      if (!item.str.endsWith(" ")) line += " "
      lastY = y
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
