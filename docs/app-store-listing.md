# App Store Listing — Pin-It — Sticky Note Board

Source-of-truth copy for App Store Connect metadata. Paste into ASC at submission time; edit here first.

---

## Identity

- **App Name** (≤30 chars): `Pin-It — Sticky Note Board` (26 chars)
- **Subtitle** (≤30 chars): `Infinite sticky-note pegboard` (29 chars)
- **Bundle ID**: `com.devsky.pinit`
- **Primary Category**: Productivity
- **Secondary Category**: (leave blank)
- **Age Rating**: 4+ (no objectionable content)
- **Pricing**: Paid, one-time. Suggested tier: Tier 3 ($2.99) or Tier 5 ($4.99).
- **Copyright**: © 2026 DevSky

---

## Promotional Text (≤170 chars)

Sync your notes across iPhone, iPad, and Mac with a one-time pairing code. No accounts, no email, no ads, no subscriptions — yours forever.

(168 chars)

---

## Description (≤4000 chars)

Pin-It is a beautifully simple sticky-note board for capturing ideas, plans, and reminders. Pin colorful notes to an infinite canvas on Mac, or browse a clean grid on iPhone — your boards stay synced across every device with a one-time pairing code.

Built for people who think in spatial layouts, who like seeing all their notes at once, and who want a tool that gets out of the way.

KEY FEATURES

• Infinite canvas (Mac) — pan freely, place notes anywhere, never run out of room
• Mobile grid (iPhone) — a clean 2-column layout optimized for one-handed reading
• Drag-to-reorder — rearrange notes by feel; positions persist
• Six pastel colors that cycle automatically as you add notes
• Image attachments — drop an image onto any note
• Live timezone search — find notes by title, content, or color
• Code-pair sync — pair two devices with a 6-character code; no accounts, no email, no Apple ID linking required
• Real-time updates — edits appear instantly on every paired device
• Dark mode follows macOS / iOS system appearance
• Keyboard shortcuts on Mac for power users

PRIVACY-FIRST DESIGN

• No accounts. No email. No ads. No tracking.
• One-time purchase — yours forever.
• Anonymous sync — your devices share data via short-lived pairing codes; we never see your notes.
• Sync is end-to-end optional — use Pin-It entirely offline if you prefer.

Pin-It is a small app made by a small team. We don't track you, we don't sell ads, and we don't have a subscription tier we're going to push you toward. Just a clean tool for keeping your thoughts visible.

(~1,200 chars used of 4,000 budget — plenty of room to expand if needed.)

---

## Keywords (≤100 chars, comma-separated, no spaces after commas)

sticky,notes,pinboard,corkboard,kanban,whiteboard,pegboard,reminders,tasks,planner,canvas,boards

(96 chars)

---

## Support URL

`https://devsky.org/apps/pin-it/`

## Marketing URL (optional)

`https://devsky.org/apps/pin-it/`

## Privacy Policy URL

`https://devsky.org/privacy/pin-it`

---

## What's New (first version)

> First release of Pin-It. Pin notes to an infinite canvas on Mac, or browse a tidy grid on iPhone, and sync across devices with a one-time pairing code — no accounts required.

---

## App Review Information (Notes field)

Use the 7-point template from `AgentPipelines/iOS/workflows/app-review-information.md`. Specific answers below for pin-it.

### 1. Screen recording

See attached recordings:
- macOS recording: shows launch → create notes on infinite canvas → drag, color cycle, image attach → settings drawer → **Generate sharing code** → **Pair on iPhone using that code** (the same recording shows iPhone receiving updates in real time)
- iPhone recording: shows launch → 2-column grid → tap note to expand → long-press to reorder → settings drawer → **paired status**

Both recorded on physical devices running latest iOS/macOS available at submission time.

### 2. Test matrix

- macOS 26.5 on MacBook Pro 14-inch (Nov 2024, Apple Silicon)
- iOS 18.x on iPhone 15 Pro
- iOS 18.x on iPad Pro 11-inch (3rd gen)

### 3. Purpose & audience

Pin-It is a sticky-note board for people who think visually — planners, writers, designers, students. It solves the problem of scattered notes by letting you arrange them spatially on an infinite canvas (Mac) or scan them quickly in a grid (mobile). The value proposition is calm, one-purpose tooling without accounts, ads, or subscriptions.

### 4. Setup & access instructions

No login required. On first launch, the app creates an empty board. To sync between devices:
1. On device A, open Settings (gear icon) → "Generate sharing code".
2. Note the 6-character code.
3. On device B, open Settings → enter the code → tap "Pair".
4. Both devices now share the same board in real-time.

No demo account needed.

### 5. External services

- **Firebase Anonymous Authentication** (Google) — assigns an opaque anonymous UID per device on first launch; used solely to scope cloud sync. No email/personal data collected.
- **Firebase Firestore** (Google) — stores board contents and pairing codes. End-to-end optional; the app works fully offline if the user never pairs.
- **Sentry** (Sentry.io) — crash and error reporting. No PII (sendDefaultPii: false). Stack traces only.

### 6. Regional differences

None — the app functions identically in all territories. No regulated content, no region-locked features.

### 7. Regulated industry / third-party material

Not applicable. No regulated industry, no protected third-party content.

---

## Privacy questionnaire answers (ASC App Privacy section)

Walk through each data type and answer per below.

| Data type | Collected? | Linked to user? | Used for tracking? | Purpose |
|---|---|---|---|---|
| Contact Info | No | — | — | — |
| Health & Fitness | No | — | — | — |
| Financial Info | No | — | — | — |
| Location | No | — | — | — |
| Sensitive Info | No | — | — | — |
| Contacts | No | — | — | — |
| User Content (notes) | Yes | Linked | No | App Functionality |
| Browsing History | No | — | — | — |
| Search History | No | — | — | — |
| **Identifiers** (Anonymous UID) | Yes | Linked | No | App Functionality |
| Purchases | No | — | — | — |
| Usage Data | No | — | — | — |
| **Diagnostics** (Sentry crash stacks) | Yes | Not Linked | No | App Functionality (crash diagnostics) |
| Other Data | No | — | — | — |

> ⚠️ **Be honest.** Apple cross-references this with the privacy policy and runtime behavior.
