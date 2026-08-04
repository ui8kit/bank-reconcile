# Simpla Bank Reconcile

> **npm:** install/build without Bun — use branch
> [`npm`](https://github.com/ui8kit/bank-reconcile/tree/npm)
> (`npm install` · Vitest · `package-lock.json`). This default tree stays Bun-friendly.

**Starter** for browser-only bank statement matching — clone it, drop in *your*
bank PDF + income/expense reports, then ask an LLM (or edit by hand) to adapt
the parser to that layout.

- Bun + Svelte 5 + Vite (static, Vercel-ready)
- No OCR, no server upload, no IndexedDB — everything stays in the tab
- Fuzzy match: amount ±0.05, date ±1 day, purpose text overlap

## Quick start

```sh
bun install
bun run dev      # http://127.0.0.1:5180  ·  /docs/
bun test
bun run build  # dist/ + dist/docs/
```

Try fixtures first:

| Folder | What |
|--------|------|
| [`public/samples/`](public/samples/) | Synthetic demo (known expected unmatched) |
| [`public/examples/`](public/examples/) | Real Promsvyazbank PDF + aligned CSVs |

## Adapt to another bank (typical vibe-coder path)

1. Put your statement + reports under `public/examples/` (or any local folder).
2. Open this repo in Cursor / your agent and paste a prompt like the one below.
3. Reload `bun run dev`, upload the three files, check unmatched lists.
4. Deploy `bun run build` to Vercel when it looks right.

### Prompt you can copy

```text
This repo is a browser-only bank reconciler (see AGENTS.md).

I added a new bank statement here:
  public/examples/<my-bank>.pdf

And reports:
  public/examples/income.csv
  public/examples/expense.csv

Task: adapt PDF/text parsing so operations from THIS statement become correct
LedgerRow { date, amount, purpose }. Keep matching rules in match.ts.
Do not add a backend, OCR, or file upload to a server.

Workflow:
1) Extract/dump text from the PDF (pdf.ts / pdfjs) and show a few sample lines.
2) Adjust parse.ts (and pdf.ts if columns/wrapping differ) until amounts are the
   operation amounts — not running balance — and purpose includes wrapped lines.
3) Add a small bun test with 2–3 golden lines from this statement.
4) Run bun test && bun run build.
```

Read **[AGENTS.md](AGENTS.md)** for where to change code and what not to touch.

## Scripts

```sh
bun run samples      # regenerate public/samples from ledger.json
bun run sync:ui8kit  # refresh vendored ui8kit (do not hand-edit kit)
bun run check        # tsc + svelte-check
```

## Docs / deploy

In-app help: `/docs` (separate HTML entry so the URL works on Vercel — see
`vercel.json`).

MIT — [LICENSE.md](LICENSE.md)
