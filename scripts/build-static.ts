import { join, resolve } from "node:path";
import { cp, mkdir, rm, readFile, writeFile } from "node:fs/promises";

import { loadBible, discoverTranslations } from "../src/shared/bible-loader.ts";

const ROOT = resolve(import.meta.dir, "..");
const PUBLIC = join(ROOT, "public");
const TEXT_DIR = join(PUBLIC, "text");
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
  "manifest.json",
  "sw.js",
];

const moreFiles = [
  "more/index.html",
  "more/christology.html",
  "more/soteriology.html",
  "more/ecclesiology.html",
  "more/mariology.html",
  "more/pneumatology.html",
  "more/essence-energies.html",
  "more/theological-terms.html",
  "more/angelology.html",
  "more/typology.html",
  "more/philosophy.html",
];

const staticDirs = [
  "icon",
  "data",
];

// Copy static files (HTML, CSS, PWA)
for (const name of staticFiles) {
  await cp(join(PUBLIC, name), join(OUT, name));
}
await mkdir(join(OUT, "more"), { recursive: true });
for (const name of moreFiles) {
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

// Minify HTML files
for (const htmlFile of ["index.html", ...moreFiles]) {
  const htmlPath = join(OUT, htmlFile);
  let html = await readFile(htmlPath, "utf-8");
  html = html
    .replace(/<!--[\s\S]*?-->/g, "")          // remove comments
    .replace(/\n\s*/g, "\n")                   // collapse leading whitespace per line
    .replace(/\n+/g, "\n")                     // collapse blank lines
    .replace(/>\s+</g, "><")                   // remove whitespace between tags
    .trim();
  await writeFile(htmlPath, html, "utf-8");
}
console.log("HTML minified.");

// Discover and generate per-translation JSON files
const translations = await discoverTranslations(TEXT_DIR);
const outText = join(OUT, "text");
await mkdir(outText, { recursive: true });

// Copy interlinear data and Strong's dictionary
const ilSrc = join(TEXT_DIR, "interlinear");
const ilDst = join(outText, "interlinear");
if (await Bun.file(join(TEXT_DIR, "strongs.json")).exists()) {
  await cp(join(TEXT_DIR, "strongs.json"), join(outText, "strongs.json"));
}
try {
  await cp(ilSrc, ilDst, { recursive: true });
  console.log("Interlinear data copied.");
} catch {}
for (const t of translations) {
  const json = await loadBible(TEXT_DIR, t);
  await Bun.write(join(outText, `bible-${t}.json`), json);
  console.log(`bible-${t}.json written (${(json.length / 1024 / 1024).toFixed(1)} MB).`);
}

// Write translations manifest
await Bun.write(join(outText, "translations.json"), JSON.stringify(translations));
console.log(`translations.json written (${translations.join(", ")})`);

// Create .nojekyll to prevent GitHub Pages from ignoring underscore files
await Bun.write(join(OUT, ".nojekyll"), "");

console.log(`\nStatic site built → ${OUT}`);
