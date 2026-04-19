# Sanatheos

[![CI](https://github.com/santerijps/sanatheos/actions/workflows/ci.yml/badge.svg?branch=master)](https://github.com/santerijps/sanatheos/actions/workflows/ci.yml)
[![CodeQL](https://github.com/santerijps/sanatheos/actions/workflows/github-code-scanning/codeql/badge.svg?branch=master)](https://github.com/santerijps/sanatheos/actions/workflows/github-code-scanning/codeql)
[![pages-build-deployment](https://github.com/santerijps/sanatheos/actions/workflows/pages/pages-build-deployment/badge.svg?branch=master)](https://github.com/santerijps/sanatheos/actions/workflows/pages/pages-build-deployment)

A fast, modern web application for reading and searching the Bible, built with TypeScript and Bun. The name is derived from *sana* (Finnish: "word") and *theos* (Greek: "God").

Lightweight, offline-ready, keyboard-friendly, and requires no sign-up.

## Features

### Search

- **Verse lookup** — `John 3:16`, `Genesis 1:1-5`, `Psalm 23`
- **Chapter ranges** — `Genesis 1-3`, `Romans 5-8`
- **Comma-separated verses** — `Genesis 1:1-3,5,8-10`
- **Full-text search** — Wrap a phrase in double quotes: `"grace"`, `"in the beginning"`
- **Word boundary matching** — Use `^` for word start and `$` for word end inside quotes: `"^grace"`, `"grace$"`, `"^grace$"` (exact word)
- **Combined search** — Combine a reference with a text filter: `Romans "faith"`, `Gen 1-3 "light"`
- **Multi-query** — Separate independent queries with `;`, e.g. `John 3:16; Rev 1:1`
- **Strong's number search** — Search by Strong's Concordance number: `G2316` (Greek) or `H430` (Hebrew) to find all verses containing that word
- **Abbreviations** — Common abbreviations work for both English and Finnish: `gen`, `rev`, `eph`, `1 cor`, `joh`, `room`, `2. moos`
- **Auto-closing quotes** — Typing `"` inserts a matching pair and places the cursor between them
- Results appear instantly with debounced input and highlighted matching text.

### Book Index Panel

Click the magnifier icon inside the search input (or press Ctrl+I) to browse all books in a three-column layout (books, chapters, verses) with Old Testament, Deuterocanonical, and New Testament section labels. Hovering over a chapter shows a text preview; hovering over a book reveals its chapters. Full keyboard navigation is supported with arrow keys, Tab, and Enter.

### Interlinear View

Toggle interlinear mode to display original Hebrew (OT) and Greek (NT) text alongside the English translation. Each word shows the original language text, transliteration, and Strong's number. Clicking a word opens a Strong's Concordance panel with the definition, pronunciation, part of speech, morphology, and cross-references.

### Strong's Concordance Dictionary

A standalone dictionary page (`dictionary.html`) provides a browsable reference for all Strong's Hebrew and Greek word definitions.

### Bible Stories

A curated list of named Bible stories — from the Creation through the Book of Revelation — organized by category (Old Testament, New Testament, Deuterocanonical). Open the side panel with the menu button in the header and select the Stories tab (open book icon). Stories can be filtered by title, description, or category using the search box. Clicking a story loads the corresponding passage directly in the reader. The list is available in both English and Finnish, switching automatically with the application language.

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

Every search query, book, chapter, verse selection, Bible translation, and interlinear mode is encoded in the URL. A share button allows copying a link with or without the current verse text. Sharing a link preserves the exact passage and settings for the recipient.

### Translations and Languages

Four Bible translations are currently included:

- **New Heart English Bible (NHEB)** — a public-domain modern English translation (default)
- **King James Version (KJV)** — the classic English translation with interlinear data
- **Catholic Public Domain Version (CPDV)** — a public-domain English translation including deuterocanonical books
- **Raamattu 1933/1938 (KR38)** — a Finnish Bible translation

All 66 canonical books of the Old and New Testaments are available, plus 18 deuterocanonical/apocryphal books in translations that include them (e.g., CPDV).

The active translation can be changed in Settings. Switching translations automatically updates the UI language to match and translates any book names present in the search input (e.g. "Joh 3:16" becomes "John 3:16" when switching from KR38 to an English translation). The UI language can also be set independently to English or Finnish.

### Offline Support

Bible text is fetched once from the server and cached in the browser's IndexedDB. After the initial load, the application works entirely offline.

### Progressive Web App

Sanatheos can be installed as a standalone app from the browser. It includes a web app manifest and service worker that cache the application shell (HTML, CSS, JS, icons) for instant offline startup. Bible data is cached separately via IndexedDB, and translation JSON files use a network-first strategy with cache fallback.

### Themes

Three theme options are available in Settings: Light, Dark, and System (follows the operating system preference). The choice is persisted across sessions.

### Parallel Translation

A secondary translation can be selected in Settings to display two translations side by side in a two-column layout. This works with full chapters, individual verses, verse ranges, and comma-separated verse selections.

### Verse Highlighting

Click (or long-press on touch devices) a verse number to open a context menu with highlighting options. Five colors are available: yellow, green, blue, pink, and orange. Highlights are stored locally in IndexedDB and persist across sessions.

### Bookmarks

Save any passage for quick return. Click the bookmark icon (🔖) on a section heading to bookmark the current chapter, verse, or range. To bookmark an individual verse, right-click (or long-press) its verse number and choose Bookmark from the context menu. The bookmark icon fills to indicate a saved bookmark; clicking it again removes it.

Saved bookmarks are listed in the **Bookmarks** tab of the side panel (bookmark ribbon icon). Clicking a bookmark navigates directly to that passage; the ×&thinsp;button removes it. Bookmark labels automatically adapt to the active UI language.

### Copy to Clipboard

Click the clipboard button next to a section heading to copy all displayed verses as plain text. In parallel mode, both translations are included with labels. Individual verses can also be copied from the verse context menu.

### Chapter Navigation

Previous/next arrows are displayed at the top and bottom of chapters and verses for sequential navigation. On mobile devices, the arrows show abbreviated labels to save space. On touch devices, swiping left or right navigates between chapters.

### Print View

The browser's print function (`Ctrl+P`) produces a clean, print-optimized layout with all UI chrome hidden.

### Side Panel

A single menu button in the header opens a unified right-side drawer with four tabs accessible via an icon rail on the left edge of the panel:

- **Stories** (open book) — Browse and filter Bible stories by name or category
- **Bookmarks** (bookmark ribbon) — View, navigate, and remove saved bookmarks
- **Settings** (gear) — Switch translation, parallel translation, theme, language, and font size
- **Help** (info circle) — Search syntax guide, keyboard shortcuts, and feature overview

The panel remembers the last active tab across sessions. Press `Escape` or click outside the panel to close it.

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

## Tech Stack

- **Runtime and Server** — [Bun](https://bun.sh/) (HTTP server, bundler, test runner)
- **Language** — TypeScript (strict mode)
- **Client** — Vanilla TypeScript with no framework dependencies
- **Storage** — IndexedDB for offline Bible data and highlight persistence
- **Search** — Client-side reference parsing and full-text search
- **Styling** — Minimal CSS with responsive design and theme support
