# Pin-It — Agent Harness

Single source of truth for any AI agent or developer working on this codebase. Read this before touching any file. Append to the Changelog at the bottom after every change.

---

## Operating Rules

### 1. Think Before Coding
- State assumptions explicitly. If uncertain, ask.
- Before adding code, read the exports, callers, and shared utilities.
- If two existing patterns contradict, pick the more recent one, explain why, flag the other for cleanup.
- If something is unclear, stop and ask.

### 2. Simplicity First
- Minimum code that solves the problem. Nothing speculative.
- No features beyond what was asked.
- No abstractions for single-use code.
- If you write 200 lines and it could be 50, rewrite it.

### 3. Surgical Changes
- Touch only what you must. Don't "improve" adjacent code.
- Match existing conventions. No reformatting.
- Remove imports/variables that *your* changes orphaned.
- Every changed line should trace directly to the request.

### 4. Verify Before Claiming Done
- Run `npm run build` before declaring success.
- Re-read the diff. List anything you skipped or couldn't verify.
- Stop condition: if you've tried the same approach 3 times without progress, stop and ask.

---

## Self-update Protocol

**Runs at the end of every task — do not wait to be asked.**

| What changed | What to update |
|---|---|
| Any `src/` or `index.html` file | Add a row to the Changelog below |
| New module/file | Architecture section below |
| New npm dependency | `package.json` + note in Changelog |
| Build config changed | `vite.config.js` + note in Changelog |
| Sync/backend feature added | Architecture section + sync.js docs below |
| CSS convention changed | Note in Conventions section |

**Branch sync rule:** Always pull the latest `main` before starting work. If the harness files (`CLAUDE.md`, `AGENTS.md`, `.gitignore`) have been updated on `main`, merge those changes before continuing. The harness is the contract — stale harness = stale rules.

Checklist before commit:
```
[ ] Changelog row added
[ ] AGENTS.md updated if architecture/conventions changed
[ ] `npm run build` passes
[ ] No console errors in browser
```

---

## Architecture

### Stack
- **Vanilla JS** — no framework, no build-time transforms
- **Vite** — dev server + production bundler
- **localStorage** — persistence (sync.js stubs for future Firebase)

### File Map

| File | Purpose |
|---|---|
| `index.html` | App shell — header, board, modals (create, expand, see-all), settings drawer |
| `src/main.js` | Core app logic — CRUD, drag, pan, canvas controls, mobile grid, settings |
| `src/styles.css` | All styles — variables at top, then: layout, board, notes, modals, settings |
| `src/sync.js` | Sync module — code generation, import/export board data (localStorage stubs) |
| `vite.config.js` | Dev server config (port 3000) |

### Key Constants (`main.js`)

| Constant | Value | Purpose |
|---|---|---|
| `GRID_SIZE` | 250 | Grid snap spacing (px) |
| `STORAGE_KEY` | `'pin-it-notes'` | localStorage key for notes array |
| `COLORS` | 6 pastel hex values | Note color palette |

### Desktop vs Mobile
- **Desktop** (`>= 768px`): Infinite canvas with pan. Notes are absolutely positioned in a `.board-canvas` wrapper that gets `transform: translate(panX, panY)`. Grid background pans with it.
- **Mobile** (`< 768px`): 2-column CSS grid, scrollable. No drag, no pan. Long-press to reorder.
- Switch happens in `handleResize()`. Mobile never touches `note.x`/`note.y` — positions are preserved for desktop.

### Note Data Shape
```js
{
  id: string,       // Date.now().toString()
  title: string,
  body: string,
  color: string,    // hex
  x: number,        // world x (desktop)
  y: number,        // world y (desktop)
  image: string|null, // base64 data URL
  rotation: number  // -3 to 3 degrees
}
```

### Canvas Controls (desktop only)
- **Center View** — resets pan to (0,0)
- **Gather Cards** — re-lays notes in a compact sqrt(n)-column grid centered in viewport
- **All Cards** — modal with 6-column mini grid; click a card to pan to it

### Overlap Prevention
`findFreePosition(x, y, excludeId)` — snaps to grid, spirals outward to find an unoccupied cell. Used by: `addNote`, `stopDrag`, `stopTouchDrag`, `clampAllNotes`.

---

## Conventions

### CSS
- CSS variables defined at `:root` in `styles.css`
- BEM-ish class names: `.note-title`, `.expand-footer-btn`, `.mobile-grid`
- Section labels in expanded/create modals use `.expand-label` / `.form-label` (uppercase, 11px, secondary color)
- Accent color: `--color-accent` / `#e07a5f` (terracotta)

### JS
- ES modules (`type: "module"` in package.json)
- No framework — vanilla DOM manipulation
- `escapeHtml()` for all user content rendered to DOM
- Modal open/close via `.open` class toggle
- Settings backdrop uses `.visible` class (not `.open`)

### Git
- Commit messages: imperative, concise, explain "why" not "what"
- One logical change per commit
- Always run `npm run build` before committing

---

## Changelog

| Date | Change | Files |
|---|---|---|
| 2025-05-17 | Initial scaffold — Vite + vanilla JS | all |
| 2025-05-18 | Note CRUD, drag-drop with grid snap, click-to-expand | main.js, styles.css, index.html |
| 2025-05-18 | Touch drag, mobile 2-col grid, long-press reorder | main.js, styles.css |
| 2025-05-18 | Settings panel + sync stubs (localStorage only) | main.js, sync.js, index.html, styles.css |
| 2025-05-18 | Overlap prevention — findFreePosition spiral | main.js |
| 2025-05-18 | Infinite canvas — pan, no scroll, transform-based | main.js, styles.css |
| 2025-05-18 | Canvas controls — center view, gather cards, see-all modal | main.js, index.html, styles.css |
| 2025-05-18 | Expand modal — labeled sections, dropzone, image mgmt | main.js, index.html, styles.css |
| 2025-05-18 | Create modal — labeled sections, dropzone, preview | index.html, styles.css, main.js |
| 2025-05-18 | Canvas grid background (lines + dots) | styles.css, main.js |
| 2025-05-18 | Repo harness — CLAUDE.md, AGENTS.md, .gitignore | repo root |
