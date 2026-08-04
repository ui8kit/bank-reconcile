# Contributing

Thanks for contributing to **Bank reconcile** ([ui8kit/bank-reconcile](https://github.com/ui8kit/bank-reconcile)).
Keep changes small, reviewable, and aligned with the browser-only model.

## Before you start

1. Read [README.md](README.md) and [AGENTS.md](AGENTS.md).
2. Search existing issues/PRs for the same problem.
3. Prefer fixing parse/match/UI glue over adding network services or storage.

## Local setup

```bash
bun install
bun run dev      # http://127.0.0.1:5180  and  /docs/
bun test
bun run build
```

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
| EN/RU strings | `src/fixtures/locale/en.json`, `ru.json` |
| Theme tokens / fonts | `src/theme.css`, `src/fonts.css`, `public/fonts/` |
| Demo fixtures | `src/fixtures/samples/ledger.json` → `bun run samples` |
| Real-statement examples | `public/examples/` |
| ui8kit primitives | **do not hand-edit** — use `bun run sync:ui8kit` |
| Vercel routing / headers | `vercel.json` |

## PR guidelines

- One concern per PR; say **why** in the description.
- Update **both** locale files when changing user-visible text.
- For parser/matcher changes: add or extend `bun test` coverage; re-run
  `bun run samples` if golden fixtures change.
- Do not commit secrets, `.env`, or unreacted personal banking data.
- Match existing TypeScript / Svelte 5 style; no drive-by refactors.

## Security-sensitive PRs

Changes to PDF parsing, file handling, or anything that could exfiltrate file
contents should note residual risk. See [SECURITY.md](SECURITY.md).

## License

By contributing, you agree that your contributions are licensed under the MIT
License ([LICENSE.md](LICENSE.md)).
