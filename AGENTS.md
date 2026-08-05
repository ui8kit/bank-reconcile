# AGENTS.md — Bank reconcile starter

Browser-only bank statement matcher
([ui8kit/bank-reconcile](https://github.com/ui8kit/bank-reconcile)).

**Role of this repo:** a starter you fork/clone for *one* bank (or one client).
Different PDF column layouts need parser tweaks — that is expected. Keep the UI
and `match.ts` stable; specialize `parse.ts` / `pdf.ts` (and tests) per bank.

No backend · no OCR · no LLM in the product · no IndexedDB — files and results
live in the tab only.

---

## Vibe-coder mission (most common task)

```text
Clone → drop a new bank PDF + income/expense reports → ask an LLM to adapt
parsing so Match works for that layout.
```

### What the agent should do

1. **Inspect** the new PDF text (via existing `pdfToText` / a small Bun dump).
2. **Map columns** to `LedgerRow`: `date` (YYYY-MM-DD), `amount` (signed number),
   `purpose` (string). Ignore headers, totals, running balance when picking amount.
3. **Patch** only what is needed:
   - prefer a new/updated adapter under `src/lib/reconcile/adapters/<id>.ts`
   - `src/lib/reconcile/pdf.ts` — line/column reconstruction from pdf.js spans
   - `src/lib/reconcile/parse.ts` — shared amount/date/CSV helpers (keep bank rules out)
   - optional: `loadLedgerFile` in `index.ts` if file type routing changes
4. **Do not** rewrite the UI, matcher defaults, or add a server unless asked.
   Do **not** break `adapters/generic.ts` or `public/samples` golden tests.
5. **Prove** with `bun test` (add 2–3 golden lines from the new statement) and
   `bun run build`. Manually: `bun run dev` → upload 3 files → check unmatched.

### Copy-paste prompt (for the human)

```text
Read AGENTS.md and .project/plan/bank-adapters.md.
Add bank adapter <id> under src/lib/reconcile/adapters/.
Do not break adapters/generic.ts or public/samples golden tests.
Put fixtures in public/examples/<id>/ with README expected counts.
Wire registry detect + UI label. Stay browser-only; output only LedgerRow[].
Run bun test && bun run build.
```

### Good vs bad adaptations

| Good | Bad |
|------|-----|
| Heuristics / column X ranges / bank-specific branch behind a clear helper | Hardcoding one person’s account number into the matcher |
| Tests with anonymized sample lines | Committing full unredacted customer PDFs without need |
| Small diffs in `parse.ts` / `pdf.ts` | New backend, OCR API, or IndexedDB “for convenience” |

---

## Stack

- **Bun ≥ 1.3** · **Svelte 5** · **Vite 6** MPA (`/` + `/docs`)
- **Tailwind v4** + `src/theme.css` · self-hosted **Google Sans** in `public/fonts/`
- **pdfjs-dist** in-browser · **ui8kit** vendored in `src/lib/ui8kit/` (codegen)

## Commands

| Action | Command |
|--------|---------|
| Dev | `bun run dev` → `:5180` and `/docs/` |
| Tests | `bun test` |
| Check | `bun run check` |
| Build | `bun run build` → `dist/` + `dist/docs/` |
| Demo samples | `bun run samples` |
| Sync ui8kit | `bun run sync:ui8kit` |

## Repo map

| Path | Touch when… |
|------|-------------|
| `src/lib/reconcile/adapters/` | New bank layout (`generic`, `psb`, …) + registry |
| `src/lib/reconcile/parse.ts` | Shared date/amount/CSV helpers (not bank-specific rules) |
| `src/lib/reconcile/pdf.ts` | PDF columns / Y-clustering / space gaps between spans |
| `src/lib/reconcile/ods.ts` | ODS (ZIP+content.xml) report tables — core format support |
| `src/lib/reconcile/match.ts` | Fuzzy windows (amount/date/purpose) — change rarely |
| `src/lib/reconcile/index.ts` | File-type routing + adapter choice |
| `src/lib/reconcile/**/*.test.ts` | Golden lines for the bank you are adapting |
| `src/App.svelte` | Upload UX / adapter select / results only |
| `src/fixtures/locale/*` | EN/RU copy (default locale **en**) |
| `public/examples/<id>/` | Per-adapter fixtures + README expected counts |
| `public/samples/` | Synthetic demos (`generic`) from `ledger.json` |
| `src/lib/ui8kit/**` | **Never hand-edit** — regenerate via sync script |

### Target row shape

```ts
type LedgerRow = {
  id: string
  side: "bank" | "income" | "expense"
  date: string   // YYYY-MM-DD
  amount: number // +income / −expense when known; bank may be signed
  purpose: string
  raw: string
  // …
}
```

Matcher (`match.ts`) pairs bank ↔ income/expense with defaults:
`amountTolerance: 0.05`, `dateWindowDays: 1`, `purposeMinOverlap: 0.35`.

---

## Hard rules

1. **Browser-only** — no server processing of user files, no OCR/LLM in the app path.
2. **Don’t hand-edit** `src/lib/ui8kit/**`.
3. **Locales** in `src/fixtures/locale/{en,ru}.json`; default English.
4. **Parser changes need tests**; regenerate samples if golden demo counts change.
5. **PII** in `public/examples/` — minimize; redact when publishing.
6. **Fonts** stay self-hosted under `public/fonts/`.
7. **`/docs` stays a separate HTML entry** (Vercel direct URL).

## Definition of done (bank adaptation)

- [ ] Sample lines from the new PDF parse to correct `date` / `amount` / `purpose`
- [ ] `bun test` green (including new golden cases)
- [ ] `bun run build` green
- [ ] Manual Match in UI: expected matched + unmatched make sense
- [ ] No new backend, storage, or remote font CDN
