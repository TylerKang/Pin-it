# App Store Listing — Pin-It

Paste copy into ASC at submission time.

## Identity

- Name: `Pin-It Board` (26 chars)
- Subtitle: `Infinite sticky-note pegboard` (29 chars)
- Bundle ID: `com.devsky.pinit`
- Category: Productivity
- Age Rating: 4+
- Pricing: Paid one-time, Tier 3 ($2.99) suggested
- Copyright: © 2026 DevSky

## Promotional Text (≤170)

Sync your notes across iPhone, iPad, and Mac with a one-time pairing code. No accounts, no email, no ads, no subscriptions — yours forever.

## Description (≤4000)

Pin-It is a simple sticky-note board for capturing ideas, plans, and reminders. Pin colorful notes to an infinite canvas on Mac, or browse a clean grid on iPhone — your boards stay synced across every device with a one-time pairing code.

Built for people who think in spatial layouts and want a tool that gets out of the way.

KEY FEATURES

• Infinite canvas (Mac) — pan freely, place notes anywhere
• Mobile grid (iPhone) — 2-column layout, long-press to reorder
• Drag-to-reorder, six pastel colors that cycle as you add notes
• Image attachments — drop an image onto any note
• Code-pair sync — 6-character code, no accounts or email
• Real-time updates across paired devices
• Dark mode follows system appearance
• Keyboard shortcuts on Mac

PRIVACY

• No accounts. No email. No ads. No tracking.
• One-time purchase — yours forever.
• Anonymous sync via short-lived pairing codes.
• Works fully offline if you never pair.

## Keywords (≤100)

sticky,notes,pinboard,corkboard,kanban,whiteboard,pegboard,reminders,tasks,planner,canvas,boards

## URLs

- Support: https://devsky.org/apps/pin-it/
- Marketing: https://devsky.org/apps/pin-it/
- Privacy: https://devsky.org/privacy/pin-it

## What's New (first version)

First release. Pin notes to an infinite canvas on Mac or browse a grid on iPhone, and sync across devices with a one-time pairing code.

## App Review Notes (paste into ASC Notes field)

**1. Screen recording**: Mac recording shows launch → infinite canvas → drag → settings → Generate code → iPhone pairs using that code with real-time updates. iPhone recording shows 2-col grid → long-press reorder → paired status. Both on physical devices, latest OS.

**2. Test matrix**:
- macOS 26.5 on MacBook Pro 14" (M-series)
- iOS 18.x on iPhone 15 Pro
- iOS 18.x on iPad Pro 11" (3rd gen)

**3. Purpose**: Sticky-note board for visual thinkers (planners, writers, designers). Spatial canvas on Mac, grid on mobile. Calm, single-purpose tool, no accounts/ads/subscriptions.

**4. Setup**: No login required. On first launch the app creates an empty board. To sync: Settings → "Generate sharing code" on device A, enter code in Settings on device B, tap Pair. Both devices then share the same board in real time. No demo account needed.

**5. External services**:
- Firebase Anonymous Authentication (Google) — opaque anonymous UID per device for sync scoping. No PII.
- Firebase Firestore (Google) — stores board contents and pairing codes. Optional — app works fully offline.
- Sentry (Sentry.io) — crash reporting only. sendDefaultPii: false. Stack traces only.

**6. Regional differences**: None. Functions identically in all territories.

**7. Regulated industry / third-party material**: N/A.

Architecture note: Capacitor (WKWebView) on iOS, Electron on macOS. Content is bundled into the binary — not loaded remotely. Updates ship via the App Store only.

## Privacy Questionnaire (ASC App Privacy section)

| Data type | Collected | Linked | Tracking | Purpose |
|---|---|---|---|---|
| User Content (notes) | Yes | Linked | No | App Functionality |
| Identifiers (anon UID) | Yes | Linked | No | App Functionality |
| Diagnostics (Sentry) | Yes | Not Linked | No | App Functionality |
| All other categories | No | — | — | — |
