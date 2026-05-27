#!/usr/bin/env bash
# Standard release flow: produce macOS App Store .pkg, iOS .ipa, and debug DMG.
#
# After this completes, release/ contains:
#   - mas-universal/Pin-It Board-<v>-universal.pkg   ← Mac App Store
#   - ios/Pin-It Board-<v>.ipa                        ← iOS App Store
#   - Pin-It Board-<v>-universal.dmg                  ← debug (local only)
set -euo pipefail

cd "$(dirname "$0")/.."

echo "════════════════════════════════════════════════════════════════"
echo "  Phase 1/3 — Mac App Store .pkg"
echo "════════════════════════════════════════════════════════════════"
bash scripts/build_release.sh

echo ""
echo "════════════════════════════════════════════════════════════════"
echo "  Phase 2/3 — iOS App Store .ipa"
echo "════════════════════════════════════════════════════════════════"
bash scripts/build_ios.sh

echo ""
echo "════════════════════════════════════════════════════════════════"
echo "  Phase 3/3 — Debug DMG (locally launchable)"
echo "════════════════════════════════════════════════════════════════"
bash scripts/build_debug.sh

echo ""
echo "════════════════════════════════════════════════════════════════"
echo "  Artifacts in release/:"
echo "════════════════════════════════════════════════════════════════"
find release -maxdepth 3 \( -name "*.pkg" -o -name "*.ipa" -o -name "*.dmg" \) -print0 \
  | xargs -0 -I{} sh -c 'printf "  %-70s  %s\n" "{}" "$(du -h "{}" | cut -f1)"'
echo ""
echo "  • Mac App Store:  Transporter → drag release/mas-universal/*.pkg"
echo "  • iOS App Store:  Transporter → drag release/ios/*.ipa"
echo "  • Local test:     open release/*.dmg, drag .app to Applications"
