#!/usr/bin/env bash
# Generate platform icons from icon-src.png (must live at repo root).
# Run from repo root:
#   bash scripts/generate-icons.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

SRC="icon-src.png"
if [ ! -f "$SRC" ]; then
  echo "ERROR: $SRC not found in repo root."
  exit 1
fi

mkdir -p assets

# ── macOS .icns (Electron) ──────────────────────────────────────────────
ICONSET=assets/icon.iconset
rm -rf "$ICONSET"
mkdir -p "$ICONSET"

# Apple's .iconset layout: pairs of @1x and @2x for each size
for sz in 16 32 128 256 512; do
  sips -z "$sz"            "$sz"            "$SRC" --out "$ICONSET/icon_${sz}x${sz}.png"            >/dev/null
  sips -z $((sz * 2))      $((sz * 2))      "$SRC" --out "$ICONSET/icon_${sz}x${sz}@2x.png"        >/dev/null
done

iconutil -c icns "$ICONSET" -o assets/icon.icns
echo "  ✓ assets/icon.icns"

# ── iOS App Icon (single 1024×1024 PNG; Xcode 14+ auto-generates sizes) ─
sips -z 1024 1024 "$SRC" --out assets/icon-ios-1024.png >/dev/null
echo "  ✓ assets/icon-ios-1024.png"

# ── Web favicon (used in dev / web deploy) ──────────────────────────────
sips -z 64  64  "$SRC" --out assets/favicon-64.png  >/dev/null
sips -z 32  32  "$SRC" --out assets/favicon-32.png  >/dev/null
echo "  ✓ assets/favicon-32.png, favicon-64.png"

echo ""
echo "Done. Icons in assets/."
