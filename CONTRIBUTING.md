# Contributing

Thanks for contributing to **Bank reconcile** ([ui8kit/bank-reconcile](https://github.com/ui8kit/bank-reconcile)).
Keep changes small, reviewable, and aligned with the browser-only model.

## Before you start

1. Read [README.md](README.md) and [AGENTS.md](AGENTS.md).
2. Search existing issues/PRs for the same problem.
3. Prefer fixing parse/match/UI glue over adding network services or storage.
4. For multi-bank work, read the future adapter plan:
   [`.project/plan/bank-adapters.md`](.project/plan/bank-adapters.md).

## Local setup

```bash
bun install
bun run dev      # http://127.0.0.1:5180  and  /docs/
bun test
bun run build
```

> Prefer Bun on `main`. For npm + Vitest + `package-lock.json`, use branch
> [`npm`](https://github.com/ui8kit/bank-reconcile/tree/npm):
>
> ```bash
> git checkout npm
> npm install
> npm run dev
> npm test
> npm run build
> ```

Optional:

```bash
bun run samples       # regenerate public/samples from ledger.json
bun run sync:ui8kit   # refresh vendored ui8kit from codegen
```

## What belongs where

| Change | Location |
|--------|----------|
| Upload / match / results UI | `src/App.svelte`, `src/app.css` |
| Docs page copy & layout | `src/DocsApp.svelte`, `src/fixtures/locale/*` |
| PDF/CSV/TXT parse & fuzzy match | `src/lib/reconcile/` |
| Future bank adapters | `src/lib/reconcile/adapters/` (see plan below) |
| EN/RU strings | `src/fixtures/locale/en.json`, `ru.json` |
| Theme tokens / fonts | `src/theme.css`, `src/fonts.css`, `public/fonts/` |
| Demo fixtures | `src/fixtures/samples/ledger.json` → `bun run samples` |
| Real-statement examples | `public/examples/` (later `public/examples/<bank-id>/`) |
| ui8kit primitives | **do not hand-edit** — use `bun run sync:ui8kit` |
| Vercel routing / headers | `vercel.json` |
| Future architecture plans | `.project/plan/` |

## Adding support for another bank

Today the safe contribution is a **focused parser fix** plus fixtures/tests for
that statement (see [AGENTS.md](AGENTS.md) vibe-coder mission).

When multiple banks must coexist without breaking `generic` / `samples`, follow
the adapter plan:

- Plan: [`.project/plan/bank-adapters.md`](.project/plan/bank-adapters.md)
- Contract: adapters emit only `LedgerRow[]`; `match.ts` and UI stay bank-agnostic
- Layout: `src/lib/reconcile/adapters/<id>.ts` + `public/examples/<id>/`
- Detection order: explicit UI select → heuristic `detect` → fallback `generic`
- Prompt contract for adapter PRs is in the plan file

Until Phase 1 exists, do **not** invent a second component tree per bank. Prefer
a named helper or a clean branch on `rowsFromText` plus golden tests.

## PR guidelines

- One concern per PR; say **why** in the description.
- Update **both** locale files when changing user-visible text.
- For parser/matcher changes: add or extend test coverage; re-run
  `bun run samples` / `npm run samples` if golden fixtures change.
- For multi-bank adapter work: do not break `generic` or `public/samples` golden tests.
- Do not commit secrets, `.env`, or unredacted personal banking data.
- Match existing TypeScript / Svelte 5 style; no drive-by refactors.

## Security-sensitive PRs

Changes to PDF parsing, file handling, or anything that could exfiltrate file
contents should note residual risk. See [SECURITY.md](SECURITY.md).

## License

By contributing, you agree that your contributions are licensed under the MIT
License ([LICENSE.md](LICENSE.md)).
