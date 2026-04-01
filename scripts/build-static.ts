import { join, resolve } from "node:path";
import { readdir, cp, mkdir, rm, readFile, writeFile } from "node:fs/promises";
import type { BibleData } from "../src/client/types.ts";

const ROOT = resolve(import.meta.dir, "..");
const PUBLIC = join(ROOT, "public");
const TRANSLATIONS_DIR = join(ROOT, "translations");
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
for (const name of ["index.html", "style.css", "robots.txt", "favicon.ico"]) {
  await cp(join(PUBLIC, name), join(OUT, name));
}
console.log("Static files copied.");

// Minify CSS
const cssPath = join(OUT, "style.css");
const cssResult = await Bun.build({
  entrypoints: [cssPath],
  minify: true,
});
if (cssResult.success && cssResult.outputs.length > 0) {
  await Bun.write(cssPath, await cssResult.outputs[0].text());
  console.log("CSS minified.");
}

// Minify HTML
const htmlPath = join(OUT, "index.html");
let html = await readFile(htmlPath, "utf-8");
html = html
  .replace(/<!--[\s\S]*?-->/g, "")          // remove comments
  .replace(/\n\s*/g, "\n")                   // collapse leading whitespace per line
  .replace(/\n+/g, "\n")                     // collapse blank lines
  .replace(/>\s+</g, "><")                   // remove whitespace between tags
  .trim();
await writeFile(htmlPath, html, "utf-8");
console.log("HTML minified.");

// Discover and generate per-translation JSON files
const translations = await discoverTranslations();
for (const t of translations) {
  const json = await loadBible(t);
  // Default (WEB) also written as bible.json for backward compatibility
  if (t === "WEB") {
    await Bun.write(join(OUT, "bible.json"), json);
  }
  await Bun.write(join(OUT, `bible-${t}.json`), json);
  console.log(`bible-${t}.json written (${(json.length / 1024 / 1024).toFixed(1)} MB).`);
}

// Write translations manifest
await Bun.write(join(OUT, "translations.json"), JSON.stringify(translations));
console.log(`translations.json written (${translations.join(", ")})`);

// Create .nojekyll to prevent GitHub Pages from ignoring underscore files
await Bun.write(join(OUT, ".nojekyll"), "");

console.log(`\nStatic site built → ${OUT}`);
