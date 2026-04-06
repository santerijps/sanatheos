import { join, resolve } from "node:path";
import { cp, mkdir, rm, readFile, writeFile } from "node:fs/promises";

import { loadBible, discoverTranslations } from "../src/shared/bible-loader.ts";

const ROOT = resolve(import.meta.dir, "..");
const PUBLIC = join(ROOT, "public");
const TRANSLATIONS_DIR = join(ROOT, "translations");
const OUT = join(ROOT, "docs");

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

const staticFiles = [
  "index.html",
  "style.css",
  "robots.txt",
  "favicon.ico",
  "manifest.json",
  "sw.js",
];

const staticDirs = [
  "icons",
  "data",
];

// Copy static files (HTML, CSS, PWA)
for (const name of staticFiles) {
  await cp(join(PUBLIC, name), join(OUT, name));
}
for (const dir of staticDirs) {
  await cp(join(PUBLIC, dir), join(OUT, dir), { recursive: true });
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
const translations = await discoverTranslations(TRANSLATIONS_DIR);
for (const t of translations) {
  const json = await loadBible(TRANSLATIONS_DIR, t);
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
