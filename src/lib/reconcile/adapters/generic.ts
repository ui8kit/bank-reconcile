import { rowsFromText } from "../parse"
import type { BankAdapter } from "./types"

/**
 * Generic one-line bank dump adapter (demo samples, simple TXT).
 * Keeps supporting `date … purpose … amount` lines without bank-specific headers.
 */
export const genericAdapter: BankAdapter = {
  id: "generic",
  label: "Generic",
  detect: () => 0,
  parseBank(text, sourceFile) {
    return rowsFromText(text, "bank", sourceFile)
  },
}
