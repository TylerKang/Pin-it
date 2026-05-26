#!/usr/bin/env bash
# Release build — produces the Mac App Store .pkg signed with Apple
# Distribution cert + embedded provisioning profile.
#
# Requires:
#   - `Apple Distribution` cert in Keychain
#   - `3rd Party Mac Developer Installer` cert in Keychain
#   - PinIt_AppStore.provisionprofile at project root
set -euo pipefail

cd "$(dirname "$0")/.."

if [ ! -f "PinIt_AppStore.provisionprofile" ]; then
  echo "ERROR: PinIt_AppStore.provisionprofile not found at project root."
  echo "  Download from developer.apple.com/account/resources/profiles and"
  echo "  place at the project root (gitignored)."
  exit 1
fi

echo "=== Release build (Mac App Store .pkg) ==="
npm run dist:mas

echo ""
echo "=== Done (release) ==="
ls -lh release/mas-universal/ 2>&1 | head -8
echo ""
echo "Upload via Transporter:"
echo "  release/mas-universal/Pin-It Board-*.pkg"
