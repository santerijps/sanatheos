import { join, resolve, extname } from "node:path";
import { readdir } from "node:fs/promises";

import type { BibleData } from "./client/types.ts";

const ROOT = resolve(import.meta.dir, "..");
const PUBLIC = join(ROOT, "public");
const TRANSLATIONS_DIR = join(ROOT, "translations");

const BOOK_ORDER = [
  "Genesis", "Exodus", "Leviticus", "Numbers", "Deuteronomy",
  "Joshua", "Judges", "Ruth", "1 Samuel", "2 Samuel",
  "1 Kings", "2 Kings", "1 Chronicles", "2 Chronicles",
  "Ezra", "Nehemiah", "Esther", "Job", "Psalm", "Proverbs",
  "Ecclesiastes", "Song Of Solomon", "Isaiah", "Jeremiah",
  "Lamentations", "Ezekiel", "Daniel", "Hosea", "Joel", "Amos",
  "Obadiah", "Jonah", "Micah", "Nahum", "Habakkuk", "Zephaniah",
  "Haggai", "Zechariah", "Malachi", "Matthew", "Mark", "Luke",
  "John", "Acts", "Romans", "1 Corinthians", "2 Corinthians",
  "Galatians", "Ephesians", "Philippians", "Colossians",
  "1 Thessalonians", "2 Thessalonians", "1 Timothy", "2 Timothy",
  "Titus", "Philemon", "Hebrews", "James", "1 Peter", "2 Peter",
  "1 John", "2 John", "3 John", "Jude", "Revelation",
];

async function loadBible(code: string): Promise<string> {
  const booksDir = join(TRANSLATIONS_DIR, code, `${code}_books`);
  const combined: BibleData = {};
  const files = await readdir(booksDir);
  for (const f of files) {
    if (!f.endsWith(".json")) continue;
    const data: Record<string, unknown> = await Bun.file(join(booksDir, f)).json();
    delete data.Info;
    Object.assign(combined, data);
  }
  const ordered: BibleData = {};
  for (const b of BOOK_ORDER) {
    if (combined[b]) ordered[b] = combined[b];
  }
  return JSON.stringify(ordered);
}

async function discoverTranslations(): Promise<string[]> {
  const entries = await readdir(TRANSLATIONS_DIR, { withFileTypes: true });
  return entries.filter(e => e.isDirectory()).map(e => e.name).sort();
}

async function buildClient() {
  const result = await Bun.build({
    entrypoints: [join(ROOT, "src", "client", "app.ts")],
    outdir: PUBLIC,
    naming: "bundle.js",
    target: "browser",
    minify: true,
  });
  if (!result.success) {
    console.error("Build failed:", result.logs);
    process.exit(1);
  }
  console.log("Client built.");
}

await buildClient();

// Pre-load all translations into memory
const translations = await discoverTranslations();
const bibleCache: Record<string, string> = {};
for (const t of translations) {
  bibleCache[t] = await loadBible(t);
  console.log(`${t} loaded (${(bibleCache[t].length / 1024 / 1024).toFixed(1)} MB)`);
}
const translationsJson = JSON.stringify(translations);

const MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json",
  ".txt": "text/plain; charset=utf-8",
  ".ico": "image/ico",
};

Bun.serve({
  port: 3000,
  async fetch(req) {
    const url = new URL(req.url);
    let path: string;
    try {
      path = decodeURIComponent(url.pathname);
    } catch {
      return new Response("Bad Request", { status: 400 });
    }

    // Match /bible-CODE.json (e.g. /bible-WEB.json)
    const bibleMatch = path.match(/^\/bible-([A-Z0-9]+)\.json$/i);
    if (bibleMatch) {
      const t = bibleMatch[1].toUpperCase();
      const json = bibleCache[t];
      if (!json) return new Response("Translation not found", { status: 404 });
      return new Response(json, {
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "public, max-age=86400",
        },
      });
    }

    if (path === "/translations.json") {
      return new Response(translationsJson, {
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "public, max-age=86400",
        },
      });
    }

    if (path === "/") path = "/index.html";

    // Prevent path traversal
    const full = resolve(PUBLIC, "." + path);
    if (!full.startsWith(PUBLIC)) {
      return new Response("Forbidden", { status: 403 });
    }

    const file = Bun.file(full);
    if (await file.exists()) {
      return new Response(file, {
        headers: { "Content-Type": MIME[extname(full)] || "application/octet-stream" },
      });
    }

    // SPA fallback
    return new Response(Bun.file(join(PUBLIC, "index.html")), {
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  },
});

console.log("→ http://localhost:3000");
