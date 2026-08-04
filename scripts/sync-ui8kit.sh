#!/usr/bin/env bash
# Re-copy Svelte ui8kit primitives from @ui8kit-codegen into src/lib/ui8kit.
# Usage: ./scripts/sync-ui8kit.sh [path-to-ui8kit-codegen/generated]
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SRC="${1:-$ROOT/../@ui8kit-codegen/generated}"
DEST="$ROOT/src/lib/ui8kit"

if [[ ! -d "$SRC/ui" || ! -d "$SRC/utils" ]]; then
  echo "missing generated ui/utils at: $SRC" >&2
  exit 1
fi

rm -rf "$DEST"
mkdir -p "$DEST/ui" "$DEST/utils"
cp -a "$SRC/utils/"*.ts "$DEST/utils/"

(
  cd "$SRC/ui"
  find . \( -name '*.svelte' -o -name '*.shared.ts' -o -name '*.variants.json' \) -print0 |
    while IFS= read -r -d '' f; do
      mkdir -p "$DEST/ui/$(dirname "$f")"
      cp -a "$f" "$DEST/ui/$f"
    done
)
cp -a "$SRC/ui/index.svelte.ts" "$DEST/ui/index.ts"
cp -a "$SRC/ui/shared.ts" "$DEST/ui/shared.ts"

echo "synced ui8kit svelte → $DEST"
echo "svelte=$(find "$DEST/ui" -name '*.svelte' | wc -l) shared=$(find "$DEST/ui" -name '*.shared.ts' | wc -l) utils=$(ls "$DEST/utils" | wc -l)"
