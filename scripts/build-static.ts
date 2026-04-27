import { join, resolve } from "node:path";
import { cp, mkdir, rm } from "node:fs/promises";

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
	"dictionary.html",
	"style.css",
	"robots.txt",
	"manifest.json",
	"service-worker.js",
];

const staticDirs = ["icon", "data", "font"];

// Copy static files (HTML, CSS, PWA)
for (const name of staticFiles) {
	await cp(join(PUBLIC, name), join(OUT, name));
}
for (const dir of staticDirs) {
	await cp(join(PUBLIC, dir), join(OUT, dir), { recursive: true });
}
console.log("Static files copied.");

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
