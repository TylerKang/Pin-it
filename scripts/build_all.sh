#!/usr/bin/env bash
# Standard release flow: produce both the App Store .pkg and the locally
# launchable debug DMG.
#
# After this completes, release/ contains:
#   - mas-universal/Pin-It — Sticky Note Board-<v>-universal.pkg   ← App Store
#   - Pin-It — Sticky Note Board-<v>-universal.dmg                  ← debug
set -euo pipefail

cd "$(dirname "$0")/.."

echo "════════════════════════════════════════════════════════════════"
echo "  Phase 1/2 — Release build (Mac App Store .pkg)"
echo "════════════════════════════════════════════════════════════════"
bash scripts/build_release.sh

echo ""
echo "════════════════════════════════════════════════════════════════"
echo "  Phase 2/2 — Debug build (locally launchable .dmg)"
echo "════════════════════════════════════════════════════════════════"
bash scripts/build_debug.sh

echo ""
echo "════════════════════════════════════════════════════════════════"
echo "  Artifacts in release/:"
echo "════════════════════════════════════════════════════════════════"
find release -maxdepth 3 \( -name "*.pkg" -o -name "*.dmg" \) -print0 \
  | xargs -0 -I{} sh -c 'printf "  %-70s  %s\n" "{}" "$(du -h "{}" | cut -f1)"'
echo ""
echo "  • Upload to App Store: open Transporter, drag release/mas-universal/*.pkg"
echo "  • Local test:          open release/*.dmg, drag .app to Applications"
