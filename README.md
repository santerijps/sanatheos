# 📖 Sanatheos

A fast, modern web app for reading and searching the Bible — built with TypeScript and Bun. The name comes from *sana* (Finnish: "word") and *theos* (Greek: "God").

> Lightweight. Offline-ready. Keyboard-friendly. No sign-up required.

---

## ✨ Features

### 🔍 Powerful Search
- **Verse lookup** — `John 3:16`, `Genesis 1:1-5`, `Psalm 23`
- **Chapter ranges** — `Genesis 1-3`, `Romans 5-8`
- **Comma-separated verses** — `Genesis 1:1-3,5,8-10`
- **Text search** — `"grace"`, `"in the beginning"` (wrap in double quotes)
- **Word boundary** — `"^grace"` (starts with), `"grace$"` (ends with), `"^grace$"` (exact word)
- **Combined search** — `Romans "faith"`, `Daniel "clouds of heaven"`, `Gen 1-3 "light"`
- **Multi-term** — separate queries with `;` e.g. `John 3:16; Rev 1:1`
- **Abbreviations** — `gen`, `rev`, `eph`, `1 cor` all work
- **Auto-closing quotes** — typing `"` inserts a pair and places the cursor inside
- Results are instant with debounced input and highlighted matching text
- Word boundary anchors `^` and `$` inside quotes let you match word starts, ends, or exact words

### 📚 Book Index Panel
- Browse all 66 books in a three-column layout (books → chapters → verses)
- Chapter previews and verse snippets visible on hover
- Full keyboard navigation with arrow keys, Tab, and Enter

### ⌨️ Keyboard Shortcuts
| Shortcut | Action |
|----------|--------|
| `Ctrl+K` | Focus search input |
| `Ctrl+I` | Toggle book index panel |
| `Escape` | Close any open panel |
| `↑` `↓` | Navigate items in index panel |
| `←` `→` / `Tab` | Switch columns in index panel |
| `Enter` | Select item in index panel |

### 🔗 Shareable URLs
Every search query, book, chapter, verse selection, and **Bible translation** is encoded in the URL. Copy and share a direct link to any passage — the recipient will see it in the same translation you were using, regardless of their own settings.

### 🌐 Translations & Languages
- Switch between Bible translations (e.g. **WEB**, **KR38**) in the settings
- Switching translations **auto-translates book names** in the search input (e.g. "2. Moos" → "Exodus" when switching KR38 → WEB)
- UI language can be set to **English** or **Finnish**
- Finnish book names and abbreviations are fully supported (e.g. `2. moos`, `joh`, `room`)

### 📴 Works Offline
Bible data is fetched once and cached in your browser's **IndexedDB**. After the first load, everything works without an internet connection.

### ℹ️ Built-in Help
Click the **ⓘ** button next to the search bar to see a full guide on search syntax, keyboard shortcuts, and how data is stored.

---

## 📜 Translations

Currently includes:
- **World English Bible (WEB)** — a public domain modern English translation
- **Raamattu 1933/1938 (KR38)** — Finnish Bible translation

All 66 books of the Old and New Testaments.

---

## 🚀 Getting Started

### Prerequisites
- [Bun](https://bun.sh/) runtime installed

### Install & Run
```bash
bun install
bun run start
```
Open [http://localhost:3001](http://localhost:3000) in your browser.

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
Outputs a ready-to-deploy static site in the `docs/` directory.

---

## 🏗️ Tech Stack

- **Runtime & Server** — [Bun](https://bun.sh/) (HTTP server, bundler, test runner)
- **Language** — TypeScript (strict, zero `any`)
- **Client** — Vanilla TypeScript, no frameworks (~8KB minified)
- **Storage** — IndexedDB for offline Bible caching
- **Search** — Client-side reference parsing + full-text search
- **Styling** — Minimal CSS with responsive design

---

## 📁 Project Structure

```
├── src/
│   ├── server.ts            # Bun HTTP server
│   └── client/              # Browser-side TypeScript
│       ├── app.ts           # Main entry point
│       ├── search.ts        # Search engine & reference parser
│       ├── render.ts        # DOM rendering
│       ├── state.ts         # URL state management (incl. translation)
│       ├── bookNames.ts     # Translation-specific book names & aliases
│       ├── i18n.ts          # Internationalization (EN/FI)
│       ├── db.ts            # IndexedDB wrapper
│       └── types.ts         # Shared interfaces
├── tests/                   # Unit tests (bun:test)
├── scripts/                 # Build & utility scripts
├── translations/            # Bible JSON data files (WEB, KR38)
├── public/                  # Static assets (HTML, CSS)
└── docs/                    # GitHub Pages output (generated)
```
