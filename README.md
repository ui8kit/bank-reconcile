# Bank reconcile

Browser-only bank statement matcher (Bun + Svelte 5).  
No OCR, no LLM, no server upload, no IndexedDB — result lives in the tab only.

## UI kit

Vendored from [`@ui8kit-codegen/generated`](../@ui8kit-codegen/generated):

```text
src/lib/ui8kit/ui/      # *.svelte + *.shared.ts + *.variants.json
src/lib/ui8kit/utils/   # cn, expr, variants, tags, …
```

Do not hand-edit generated files. Re-sync:

```sh
bun run sync:ui8kit
# or: ./scripts/sync-ui8kit.sh /path/to/ui8kit-codegen/generated
```

## Scripts

```sh
bun install
bun run dev      # http://127.0.0.1:5180
bun run build    # static → dist/ (Vercel-ready)
bun run preview
```
