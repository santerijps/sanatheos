import { join, resolve, extname } from "node:path";
import { readdir } from "node:fs/promises";

const ROOT = resolve(import.meta.dir, "..");
const PUBLIC = join(ROOT, "public");
const BOOKS_DIR = join(ROOT, "NKJV", "NKJV_books");

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

async function loadBible(): Promise<string> {
  const combined: Record<string, any> = {};
  const files = await readdir(BOOKS_DIR);
  for (const f of files) {
    if (!f.endsWith(".json")) continue;
    const data = await Bun.file(join(BOOKS_DIR, f)).json();
    delete data.Info;
    Object.assign(combined, data);
  }
  const ordered: Record<string, any> = {};
  for (const b of BOOK_ORDER) {
    if (combined[b]) ordered[b] = combined[b];
  }
  return JSON.stringify(ordered);
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
const bibleJson = await loadBible();
console.log(`Bible loaded (${(bibleJson.length / 1024 / 1024).toFixed(1)} MB)`);

const MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json",
};

Bun.serve({
  port: 3001,
  async fetch(req) {
    const url = new URL(req.url);
    let path = decodeURIComponent(url.pathname);

    if (path === "/api/bible") {
      return new Response(bibleJson, {
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

console.log("→ http://localhost:3001");
