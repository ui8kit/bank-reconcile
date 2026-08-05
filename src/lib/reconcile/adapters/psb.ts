import { rowsFromText } from "../parse"
import type { BankAdapter } from "./types"

const PSB_NAME_RE = /промсвязь|промсвязьбанк|\bpsb\b|пао\s*псб/i
const PSB_LAYOUT_RE =
  /формирования\s+выписки|входящий\s+остаток|исходящий\s+остаток|дата\s+предыдущей\s+операции/i

/**
 * Promsvyazbank statement adapter.
 * Uses shared line heuristics (coalesce wrapped purpose, first money-like amount,
 * RU footer skip) tuned for PSB PDF/TXT dumps.
 */
export const psbAdapter: BankAdapter = {
  id: "psb",
  label: "Promsvyazbank",
  detect(text, meta) {
    let score = 0
    const name = meta.fileName.toLowerCase()
    if (name.includes("psb") || /выписка/.test(name)) score += 0.25
    if (PSB_NAME_RE.test(text)) score += 0.55
    if (PSB_LAYOUT_RE.test(text)) score += 0.35
    if (/^\s*итого\b/im.test(text) && /приход|расход/i.test(text)) score += 0.1
    return Math.min(1, score)
  },
  parseBank(text, sourceFile) {
    return rowsFromText(preprocessPsb(text), "bank", sourceFile)
  },
}

/** Light cleanup before the shared line parser. */
function preprocessPsb(text: string): string {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/стр\.\s*\d+/gi, " ")
    .replace(/[ \t]+\n/g, "\n")
}
