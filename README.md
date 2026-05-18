# Pin-It

A digital pegboard with sticky notes. Infinite canvas on desktop, compact grid on mobile.

## Features

- **Infinite Canvas** — click and drag the background to pan freely in any direction
- **Sticky Notes** — create notes with titles, body text, colors, and image attachments
- **Drag & Drop** — move notes anywhere on the canvas; they snap to a grid and can't overlap
- **Canvas Controls** — center view, gather all cards together, or see all cards in a mini overview
- **Mobile Layout** — responsive 2-column grid with long-press to reorder
- **Image Attachments** — drag-and-drop or click-to-upload on both create and edit modals
- **Settings Panel** — sync code generation and import/export stubs (backend integration planned)
- **Local Persistence** — all data saved to localStorage

## Getting Started

```bash
npm install
npm run dev
```

Opens at `http://localhost:3000`.

## Build

```bash
npm run build
```

Output goes to `dist/`.

## Stack

- Vanilla JavaScript (no framework)
- Vite (dev server + bundler)
- localStorage (persistence)

## Project Structure

```
index.html          App shell — header, board, modals, settings drawer
src/main.js         Core logic — CRUD, drag, pan, canvas controls, mobile grid
src/styles.css      All styles — CSS variables, layout, components
src/sync.js         Sync module — code gen, import/export (localStorage stubs)
vite.config.js      Dev server config
CLAUDE.md           AI agent entry point
AGENTS.md           Operating rules, architecture, conventions, changelog
```

## License

MIT
