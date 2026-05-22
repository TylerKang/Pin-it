#!/usr/bin/env bash
# Debug build — produces a locally-launchable .app + .dmg signed with the
# Apple Development cert and the no-sandbox debug entitlements. For local
# smoke testing only; never ship.
#
# Requires:
#   - Apple Development cert in Keychain (`Apple Development: ...`)
set -euo pipefail

cd "$(dirname "$0")/.."

# Find the Apple Development identity. CSC_NAME is what electron-builder reads.
DEV_IDENT=$(security find-identity -v 2>/dev/null \
  | sed -n 's/.*"\(Apple Development: [^"]*\)".*/\1/p' | head -1)
if [ -z "${DEV_IDENT}" ]; then
  echo "ERROR: No 'Apple Development' certificate found in Keychain."
  exit 1
fi

echo "=== Debug build (Apple Development, sandbox OFF) ==="
echo "  Identity: ${DEV_IDENT}"

# Build the Vite output first
npm run build

# electron-builder reads CSC_NAME for the signing identity, and we override
# the mac config keys via --config flags so the MAS-only entitlements/profile
# aren't pulled in for this DMG build.
CSC_NAME="${DEV_IDENT}" \
npx electron-builder --mac dmg --universal \
  --config.mac.identity="${DEV_IDENT}" \
  --config.mac.entitlements="build/entitlements-debug.plist" \
  --config.mac.entitlementsInherit="build/entitlements-debug.plist" \
  --config.mac.hardenedRuntime=true \
  --config.mac.gatekeeperAssess=false

echo ""
echo "=== Done (debug) ==="
ls -lh release/ 2>&1 | head -8
