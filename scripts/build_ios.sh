#!/usr/bin/env bash
# Release build — produces the iOS App Store .ipa signed with Apple Distribution.
#
# Requires:
#   - `Apple Distribution` cert in Keychain
#   - PinIt_iOS_AppStore.mobileprovision at project root (also installed in
#     ~/Library/MobileDevice/Provisioning Profiles/)
#   - ios/ Xcode project generated (npx cap add ios + npx cap sync ios)
set -euo pipefail

cd "$(dirname "$0")/.."

WORKSPACE="ios/App/App.xcworkspace"
SCHEME="App"
ARCHIVE="build/ios-export/App.xcarchive"
EXPORT_OPTS="build/ios-export/ExportOptions.plist"
OUT_DIR="release/ios"

# Never rm/overwrite files in the project root during verification — use temp dirs.

if [ ! -f "PinIt_iOS_AppStore.mobileprovision" ]; then
  echo "ERROR: PinIt_iOS_AppStore.mobileprovision not found at project root."
  exit 1
fi

# Ensure profile is installed where Xcode can find it
mkdir -p ~/Library/MobileDevice/Provisioning\ Profiles
cp PinIt_iOS_AppStore.mobileprovision ~/Library/MobileDevice/Provisioning\ Profiles/

# Sync web assets first
echo "=== Syncing web assets ==="
LANG=en_US.UTF-8 npx cap sync ios

echo "=== Archiving ==="
mkdir -p build/ios-export
xcodebuild \
  -workspace "$WORKSPACE" \
  -scheme "$SCHEME" \
  -configuration Release \
  -archivePath "$ARCHIVE" \
  -destination "generic/platform=iOS" \
  archive

echo "=== Exporting .ipa ==="
mkdir -p "$OUT_DIR"
xcodebuild \
  -exportArchive \
  -archivePath "$ARCHIVE" \
  -exportPath "$OUT_DIR" \
  -exportOptionsPlist "$EXPORT_OPTS"

# Rename to versioned filename matching macOS convention
VERSION=$(grep '"version"' package.json | head -1 | sed 's/.*"\([0-9.]*\)".*/\1/')
mv "$OUT_DIR/App.ipa" "$OUT_DIR/Pin-It Board-${VERSION}.ipa" 2>/dev/null || true

echo ""
echo "=== Done ==="
ls -lh "$OUT_DIR/"
echo ""
echo "Upload via Transporter:"
echo "  $OUT_DIR/Pin-It Board-*.ipa"
