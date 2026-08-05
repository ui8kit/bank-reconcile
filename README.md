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

| Folder | Adapter | What |
|--------|---------|------|
| [`public/samples/`](public/samples/) | `generic` | Synthetic demo (known expected unmatched) |
| [`public/examples/psb/`](public/examples/psb/) | `psb` | Promsvyazbank statement + aligned reports |

Bank layout is chosen in the UI: **Auto-detect / Generic / Promsvyazbank**.

## Adapt to another bank (typical vibe-coder path)

1. Put fixtures under `public/examples/<bank-id>/`.
2. Open this repo in Cursor / your agent and paste a prompt like the one below.
3. Reload `bun run dev`, pick the adapter (or Auto), upload the three files.
4. Deploy `bun run build` to Vercel when it looks right.

### Prompt you can copy

```text
Read AGENTS.md and .project/plan/bank-adapters.md.
Add bank adapter <id> under src/lib/reconcile/adapters/.
Do not break adapters/generic.ts or public/samples golden tests.
Put fixtures in public/examples/<id>/ with README expected counts.
Wire registry detect + UI label. Stay browser-only; output only LedgerRow[].
Run bun test && bun run build.
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
