# Future plan: bank adapters

Status: **planned** (not implemented)  
Audience: contributors who need to support more than one bank PDF/CSV layout  
Related: [AGENTS.md](../../AGENTS.md), [CONTRIBUTING.md](../../CONTRIBUTING.md)

## Why

The product already has a clean boundary:

```text
File → text (pdf.ts)
     → LedgerRow[] (parse — bank-specific today)
     → reconcile (match.ts — shared)
     → UI (props only)
```

Adapting to Promsvyazbank showed that a single heuristic `rowsFromText` accumulates bank-specific rules:

- operation amount ≠ trailing running balance
- purpose wrapped onto following lines
- PDF spans split `"1"` + `"000.00"`
- document numbers (`акт№18`, payment order ids) must not glue into amounts
- footer lines (`ИТОГО` / `Приход` / `Расход`) must not merge into the last row

`match.ts` barely changed. Normalization to `LedgerRow` is what keeps reconciliation portable.

**Do not keep stuffing bank rules into one generic parser.** Introduce adapters when a second real bank layout appears (or earlier if a contributor wants clean seams).

## Goal

Allow different banks to plug in as **adapters** that all emit the same `LedgerRow[]`, while:

- `match.ts` and UI remain bank-agnostic
- `generic` keeps supporting simple TXT/CSV one-line dumps
- each bank has fixtures + golden tests
- vibe-coders can add an adapter without rewriting the core

## Non-goals (for this plan)

- Server-side parsing, OCR, or LLM-assisted extraction in the product path
- Per-bank UI trees (transport/bank choice is config + adapter, not a second component tree)
- Changing `LedgerRow` for one bank’s quirks (normalize inside the adapter)

## Proposed shape

```ts
type BankAdapter = {
  id: string // "generic" | "psb" | "tinkoff" | …
  label: string // UI label
  /** 0..1 confidence; omit if adapter is select-only */
  detect?: (text: string, meta: { fileName: string }) => number
  parseBank: (text: string, sourceFile: string) => LedgerRow[]
  // Optional later if reports also differ by bank/product:
  // parseIncome?: ...
  // parseExpense?: ...
}
```

### Suggested layout

```text
src/lib/reconcile/adapters/
  types.ts        # BankAdapter contract
  generic.ts      # current rowsFromText / rowsFromCsv fallback
  psb.ts          # Promsvyazbank: coalesce, first money-like amount, RU footers
  index.ts        # registry, detectAdapter(), getAdapter(id)
  <bank>.ts       # future adapters

public/examples/<bank-id>/
  bank.pdf | bank.txt
  income.csv
  expense.csv
  README.md       # layout notes + expected counts

src/lib/reconcile/*.test.ts
  # per-adapter golden tests (or adapters/<id>.test.ts)
```

### App wiring

```text
loadLedgerFile(file, side)
  text = fileToText(file)
  if side === "bank":
    adapter = explicitSelect ?? detectAdapter(text, file) ?? generic
    return adapter.parseBank(text, file.name)
  else:
    return rowsFromCsv / generic text   # reports are usually CSV
```

**Detection priority:**

1. Explicit UI select: `Auto | Generic | PSB | …` (most reliable for a starter)
2. Heuristic `detect(text)` (bank name, column headers, confidence 0..1)
3. Fallback `generic`

**Invariants:**

- Outside adapters, only `LedgerRow` / `ReconcileResult` are visible
- `match.ts` and UI never import bank-specific code
- Each adapter ships with fixtures under `public/examples/<bank-id>/` and golden tests
- `generic` must keep supporting simple one-line TXT/CSV dumps (do not break samples)

## Phased plan

### Phase 0 — today (done / baseline)

- Shared `LedgerRow` + `reconcile()` + UI props
- Heuristic `rowsFromText` with PSB-oriented fixes folded in
- `public/samples` + `public/examples` fixtures

### Phase 1 — extract seams (minimal, no UI yet)

- Move current heuristic parser to `adapters/generic.ts`
- Extract PSB-oriented behavior to `adapters/psb.ts`
- Registry: `getAdapter(id)` + optional `detectAdapter(text)`
- Wire `loadLedgerFile` through registry with fallback `generic`
- Keep default behavior identical for existing samples/examples

### Phase 2 — explicit adapter choice in UI

- Add bank select: `Auto | Generic | PSB | …`
- Persist last choice in `localStorage` (same prefs style as locale/theme)
- Docs page: how to add an adapter + prompt template

### Phase 3 — contributor adapter kit

- Fixture folder convention `public/examples/<bank-id>/`
- Test helper: load fixture text → `parseBank` → assert rows / reconcile counts
- Short “add a bank adapter” section in `/docs` and CONTRIBUTING
- Optional: `scripts/scaffold-adapter.ts` generating stub `adapters/<id>.ts` + fixture README

### Phase 4 — only if needed

- Report-side adapters (`parseIncome` / `parseExpense`) when CSVs also diverge by product
- Confidence UI (“detected as PSB 0.82”) for Auto mode
- Shared amount/date token utilities extracted from adapters (DRY without merging bank rules)

## Suggested first implementation slice

When a second real bank appears (or a contributor wants clean seams):

1. Introduce `BankAdapter` type + `adapters/{generic,psb,index}.ts`
2. Move current heuristic to `generic`; PSB rules to `psb`
3. Wire `loadLedgerFile` through registry with fallback
4. Keep `public/samples` on `generic`; move PSB files under `public/examples/psb/`
5. Add UI select in Phase 2 once registry is stable

## Prompt contract for future adapter PRs

When asking an agent to add a bank:

```text
Add bank adapter <id> under src/lib/reconcile/adapters/.
Do not break adapters/generic.ts or public/samples golden tests.
Put fixtures in public/examples/<id>/ with README expected counts.
Wire registry detect + optional UI label.
Stay browser-only; output only LedgerRow[].
```
