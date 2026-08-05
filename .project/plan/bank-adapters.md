# Bank adapters

Status: **Phase 1 + Phase 2 implemented**  
Audience: contributors who need to support more than one bank PDF/CSV layout  
Related: [AGENTS.md](../../AGENTS.md), [CONTRIBUTING.md](../../CONTRIBUTING.md)

## Why

The product already has a clean boundary:

```text
File → text (pdf.ts) / table (ods.ts)
     → LedgerRow[] (adapters — bank-specific)
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

**Do not keep stuffing bank rules into one generic parser.** Add or extend an adapter.

## Goal

Allow different banks to plug in as **adapters** that all emit the same `LedgerRow[]`, while:

- `match.ts` and UI remain bank-agnostic
- `generic` keeps supporting simple TXT/CSV one-line dumps
- each bank has fixtures + golden tests
- vibe-coders can add an adapter without rewriting the core

## Non-goals

- Server-side parsing, OCR, or LLM-assisted extraction in the product path
- Per-bank UI trees (transport/bank choice is config + adapter, not a second component tree)
- Changing `LedgerRow` for one bank’s quirks (normalize inside the adapter)

## Shape (implemented)

```ts
type BankAdapter = {
  id: string // "generic" | "psb" | …
  label: string
  detect?: (text: string, meta: { fileName: string }) => number
  parseBank: (text: string, sourceFile: string) => LedgerRow[]
}
```

### Layout

```text
src/lib/reconcile/adapters/
  types.ts
  generic.ts      # demo / simple one-line dumps
  psb.ts          # Promsvyazbank detect + parse
  index.ts        # registry, detectAdapter(), resolveAdapter()
  adapters.test.ts

public/examples/psb/
  bank.txt
  income.csv
  expense.csv
  README.md

public/samples/   # generic adapter golden demo
```

### App wiring

```text
loadLedgerFile(file, side, { adapter })
  ODS → rowsFromOds
  CSV reports → rowsFromCsv
  bank text → resolveAdapter(choice|auto) → parseBank
```

**Detection priority:**

1. Explicit UI select: `Auto | Generic | PSB | …` (persisted in `localStorage`)
2. Heuristic `detect(text)` (confidence ≥ 0.5)
3. Fallback `generic`

**Invariants:**

- Outside adapters, only `LedgerRow` / `ReconcileResult` are visible
- `match.ts` never imports bank-specific code
- Each adapter ships with fixtures under `public/examples/<bank-id>/` and golden tests
- `generic` must keep supporting simple one-line TXT dumps (`public/samples`)

## Phased plan

### Phase 0 — baseline (done)

- Shared `LedgerRow` + `reconcile()` + UI props
- Heuristic `rowsFromText` helpers in `parse.ts`
- `public/samples` fixtures

### Phase 1 — extract seams (done)

- `adapters/{generic,psb,index}.ts`
- Registry: `getAdapter` / `detectAdapter` / `resolveAdapter`
- `loadLedgerFile` wired through registry
- Samples on `generic`; PSB under `public/examples/psb/`

### Phase 2 — explicit adapter choice in UI (done)

- Bank select: `Auto | Generic | Promsvyazbank`
- Persist last choice in `localStorage` (`bank-adapter`)
- Docs prompt updated for adapter PRs

### Phase 3 — contributor adapter kit (optional next)

- Test helper package for fixture → parseBank → counts
- Short “add a bank adapter” section polish in `/docs`
- Optional: `scripts/scaffold-adapter.ts`

### Phase 4 — only if needed

- Report-side adapters (`parseIncome` / `parseExpense`) when CSVs also diverge
- Confidence UI (“detected as PSB 0.82”) for Auto mode
- Shared amount/date token utilities extracted further (DRY without merging bank rules)
- Additional banks (e.g. client-specific column PDF layouts)

## Prompt contract for future adapter PRs

```text
Read AGENTS.md and .project/plan/bank-adapters.md.
Add bank adapter <id> under src/lib/reconcile/adapters/.
Do not break adapters/generic.ts or public/samples golden tests.
Put fixtures in public/examples/<id>/ with README expected counts.
Wire registry detect + UI label. Stay browser-only; output only LedgerRow[].
Run bun test && bun run build.
```
