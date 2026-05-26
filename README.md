# Pin-It Board

A digital pegboard with sticky notes. Infinite canvas on desktop, 2-column grid on mobile. Real-time sync between devices via 6-char pairing codes (no accounts).

Ships as: macOS App Store, iOS App Store, and web (`devsky.org/apps/pin-it/`).

## Develop

```
npm install
npm run dev          # http://localhost:3000
npm run electron     # build + open Mac app
npm run cap:sync     # build + sync iOS Xcode project
npm run ios:open     # open Xcode
```

Drop a `.env.local` with `VITE_FIREBASE_*` to enable cloud sync locally. See `.env.example`.

## Build

```
npm run build                 # web (dist/)
bash scripts/build_release.sh # macOS .pkg for App Store
bash scripts/build_debug.sh   # macOS .dmg signed with dev cert (locally runnable)
bash scripts/build_all.sh     # both Mac builds
```

iOS is built through Xcode after `npm run cap:sync`.

## Stack

Vanilla JS + Vite. Electron wraps it for macOS, Capacitor wraps it for iOS. Firebase (Anonymous Auth + Firestore) for cross-device sync. Sentry for crash reporting (optional).

## Layout

```
src/                Web app source (vanilla JS)
electron/main.cjs   macOS Electron main process
ios/                Capacitor-generated Xcode project (gitignored after add)
capacitor.config.json
build/              Mac entitlements plists
scripts/            Mac build scripts + icon generator
assets/             Generated icons (from icon-src.png)
docs/               App Store listing copy
firestore.rules     Firestore security rules (paste into Firebase Console)
```

See `AGENTS.md` for harness rules and architecture detail.

## License

MIT
