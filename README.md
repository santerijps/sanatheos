# Sanatheos

A fast, modern web application for reading and searching the Bible, built with TypeScript and Bun. The name is derived from *sana* (Finnish: "word") and *theos* (Greek: "God").

Lightweight, offline-ready, keyboard-friendly, and requires no sign-up.

---

## Features

### Search

- **Verse lookup** — `John 3:16`, `Genesis 1:1-5`, `Psalm 23`
- **Chapter ranges** — `Genesis 1-3`, `Romans 5-8`
- **Comma-separated verses** — `Genesis 1:1-3,5,8-10`
- **Full-text search** — Wrap a phrase in double quotes: `"grace"`, `"in the beginning"`
- **Word boundary matching** — Use `^` for word start and `$` for word end inside quotes: `"^grace"`, `"grace$"`, `"^grace$"` (exact word)
- **Combined search** — Combine a reference with a text filter: `Romans "faith"`, `Gen 1-3 "light"`
- **Multi-query** — Separate independent queries with `;`, e.g. `John 3:16; Rev 1:1`
- **Abbreviations** — Common abbreviations work for both English and Finnish: `gen`, `rev`, `eph`, `1 cor`, `joh`, `room`, `2. moos`
- **Auto-closing quotes** — Typing `"` inserts a matching pair and places the cursor between them
- Results appear instantly with debounced input and highlighted matching text.

### Book Index Panel

Browse all 66 books in a three-column layout (books, chapters, verses). Hovering over a chapter shows a text preview; hovering over a book reveals its chapters. Full keyboard navigation is supported with arrow keys, Tab, and Enter.

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+K` | Focus search input |
| `Ctrl+I` | Toggle book index panel |
| `Escape` | Close any open panel |
| Arrow keys | Navigate items in the index panel |
| `Tab` | Switch columns in the index panel |
| `Enter` | Select the focused item |

### Shareable URLs

Every search query, book, chapter, verse selection, and Bible translation is encoded in the URL. Sharing a link preserves the exact passage and translation for the recipient, regardless of their own settings.

### Translations and Languages

Two Bible translations are currently included:

- **World English Bible (WEB)** — a public-domain modern English translation
- **Raamattu 1933/1938 (KR38)** — a Finnish Bible translation

All 66 books of the Old and New Testaments are available in both translations.

The active translation can be changed in Settings. Switching translations automatically updates the UI language to match and translates any book names present in the search input (e.g. "2. Moos" becomes "Exodus" when switching from KR38 to WEB). The UI language can also be set independently to English or Finnish.

### Offline Support

Bible text is fetched once from the server and cached in the browser's IndexedDB. After the initial load, the application works entirely offline.

### Themes

Three theme options are available in Settings: Light, Dark, and System (follows the operating system preference). The choice is persisted across sessions.

### Parallel Translation

A secondary translation can be selected in Settings to display two translations side by side in a two-column layout. This works with full chapters, individual verses, verse ranges, and comma-separated verse selections.

### Verse Highlighting

Click (or long-press on touch devices) a verse number to open a context menu with highlighting options. Five colors are available: yellow, green, blue, pink, and orange. Highlights are stored locally in IndexedDB and persist across sessions.

### Copy to Clipboard

Click the clipboard button next to a section heading to copy all displayed verses as plain text. In parallel mode, both translations are included with labels. Individual verses can also be copied from the verse context menu.

### Chapter Navigation

Previous/next arrows are displayed at the top and bottom of chapters and verses for sequential navigation. On mobile devices, the arrows show abbreviated labels to save space. On touch devices, swiping left or right navigates between chapters.

### Print View

The browser's print function (`Ctrl+P`) produces a clean, print-optimized layout with all UI chrome hidden.

### Built-in Help

The information button next to the search bar opens a guide covering search syntax, available features, keyboard shortcuts, and data storage details.

---

## Getting Started

### Prerequisites

- [Bun](https://bun.sh/) runtime

### Install and Run

```bash
bun install
bun run start
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Development (watch mode)

```bash
bun run dev
```

### Run Tests

```bash
bun test
```

### Build for GitHub Pages

```bash
bun run build:static
```

Outputs a ready-to-deploy static site in the `docs/` directory. HTML, CSS, and JavaScript are minified during the build.

---

## Tech Stack

- **Runtime and Server** — [Bun](https://bun.sh/) (HTTP server, bundler, test runner)
- **Language** — TypeScript (strict mode)
- **Client** — Vanilla TypeScript with no framework dependencies
- **Storage** — IndexedDB for offline Bible data and highlight persistence
- **Search** — Client-side reference parsing and full-text search
- **Styling** — Minimal CSS with responsive design and theme support
