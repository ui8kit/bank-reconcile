import { genericAdapter } from "./generic"
import { psbAdapter } from "./psb"
import type { AdapterChoice, AdapterDetectMeta, BankAdapter } from "./types"

export type { AdapterChoice, AdapterDetectMeta, BankAdapter } from "./types"
export { genericAdapter } from "./generic"
export { psbAdapter } from "./psb"

const DETECT_THRESHOLD = 0.5

/** Registered bank adapters (order = detect scan order). */
export const adapters: BankAdapter[] = [psbAdapter, genericAdapter]

const byId = new Map(adapters.map((a) => [a.id, a]))

export function listAdapters(): BankAdapter[] {
  return adapters.slice()
}

export function getAdapter(id: string): BankAdapter | undefined {
  return byId.get(id)
}

/**
 * Pick the highest-scoring detect() above threshold; otherwise generic.
 */
export function detectAdapter(
  text: string,
  meta: AdapterDetectMeta,
): BankAdapter {
  let best: BankAdapter = genericAdapter
  let bestScore = 0
  for (const adapter of adapters) {
    if (!adapter.detect || adapter.id === "generic") continue
    const score = adapter.detect(text, meta)
    if (score > bestScore) {
      bestScore = score
      best = adapter
    }
  }
  return bestScore >= DETECT_THRESHOLD ? best : genericAdapter
}

/**
 * Resolve UI choice → adapter.
 * `auto` uses detect; unknown ids fall back to generic.
 */
export function resolveAdapter(
  choice: AdapterChoice,
  text: string,
  meta: AdapterDetectMeta,
): BankAdapter {
  if (choice && choice !== "auto") {
    return getAdapter(choice) ?? genericAdapter
  }
  return detectAdapter(text, meta)
}
