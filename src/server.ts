import { join, resolve, extname } from "node:path";
import { existsSync } from "node:fs";

import { loadBible, discoverTranslations } from "./shared/bible-loader.ts";

const ROOT = resolve(import.meta.dir, "..");
const PUBLIC = join(ROOT, "public");
const TRANSLATIONS_DIR = join(PUBLIC, "translations");

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
const translations = await discoverTranslations(TRANSLATIONS_DIR);
const bibleCache: Record<string, string> = {};
for (const t of translations) {
  bibleCache[t] = await loadBible(TRANSLATIONS_DIR, t);
  console.log(`${t} loaded (${(bibleCache[t].length / 1024 / 1024).toFixed(1)} MB)`);
}
const translationsJson = JSON.stringify(translations);

// Pre-load descriptions by language
const descriptionsCache: Record<string, string> = {};
const langFiles = ["en", "fi"];
for (const lang of langFiles) {
  const descPath = join(PUBLIC, "data", `descriptions-${lang}.json`);
  if (existsSync(descPath)) {
    descriptionsCache[lang] = await Bun.file(descPath).text();
    console.log(`descriptions-${lang} loaded`);
  }
}

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

    // Match /data/descriptions-LANG.json (e.g. /data/descriptions-en.json)
    const descMatch = path.match(/^\/data\/descriptions-([a-z]+)\.json$/i);
    if (descMatch) {
      const lang = descMatch[1].toLowerCase();
      const json = descriptionsCache[lang];
      if (!json) return new Response("[]", { headers: { "Content-Type": "application/json" } });
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
