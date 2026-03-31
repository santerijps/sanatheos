import { join, resolve } from "node:path";
import { readdir, cp, mkdir, rm } from "node:fs/promises";
import type { BibleData } from "../src/client/types.ts";

const ROOT = resolve(import.meta.dir, "..");
const PUBLIC = join(ROOT, "public");
const BOOKS_DIR = join(ROOT, "translations", "NKJV", "NKJV_books");
const OUT = join(ROOT, "docs");

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
  const combined: BibleData = {};
  const files = await readdir(BOOKS_DIR);
  for (const f of files) {
    if (!f.endsWith(".json")) continue;
    const data: Record<string, unknown> = await Bun.file(join(BOOKS_DIR, f)).json();
    delete data.Info;
    Object.assign(combined, data);
  }
  const ordered: BibleData = {};
  for (const b of BOOK_ORDER) {
    if (combined[b]) ordered[b] = combined[b];
  }
  return JSON.stringify(ordered);
}

// Clean and create output directory
await rm(OUT, { recursive: true, force: true });
await mkdir(OUT, { recursive: true });

// Build client bundle into output
const result = await Bun.build({
  entrypoints: [join(ROOT, "src", "client", "app.ts")],
  outdir: OUT,
  naming: "bundle.js",
  target: "browser",
  minify: true,
});
if (!result.success) {
  console.error("Build failed:", result.logs);
  process.exit(1);
}
console.log("Client bundled.");

// Copy static files (HTML, CSS)
for (const name of ["index.html", "style.css", "robots.txt"]) {
  await cp(join(PUBLIC, name), join(OUT, name));
}
console.log("Static files copied.");

// Generate bible.json
const json = await loadBible();
await Bun.write(join(OUT, "bible.json"), json);
console.log(`bible.json written (${(json.length / 1024 / 1024).toFixed(1)} MB).`);

// Create .nojekyll to prevent GitHub Pages from ignoring underscore files
await Bun.write(join(OUT, ".nojekyll"), "");

console.log(`\nStatic site built → ${OUT}`);
