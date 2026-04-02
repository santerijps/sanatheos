import { describe, test, expect, beforeEach } from "bun:test";
import { setLanguage, t } from "../src/client/i18n.ts";
import type { Highlight, HighlightColor } from "../src/client/types.ts";
import { readFileSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";

// ---------------------------------------------------------------------------
// i18n — new feature strings
// ---------------------------------------------------------------------------

describe("i18n — new feature strings (EN)", () => {
  beforeEach(() => setLanguage("en"));

  test("theme strings exist", () => {
    const s = t();
    expect(s.themeLabel).toBe("Theme");
    expect(s.themeLight).toBe("Light");
    expect(s.themeDark).toBe("Dark");
    expect(s.themeSystem).toBe("System");
  });

  test("parallel translation strings exist", () => {
    const s = t();
    expect(s.parallelLabel).toBe("Parallel translation");
    expect(s.parallelNone).toBe("None");
  });

  test("copy string exists", () => {
    expect(t().copied).toBe("Copied!");
    expect(t().copyVerse).toBe("Copy verse");
  });

  test("highlight strings exist", () => {
    const s = t();
    expect(s.highlight).toBe("Highlight");
    expect(s.removeHighlight).toBe("Remove highlight");
  });
});

describe("i18n — new feature strings (FI)", () => {
  beforeEach(() => setLanguage("fi"));

  test("theme strings exist", () => {
    const s = t();
    expect(s.themeLabel).toBe("Teema");
    expect(s.themeLight).toBe("Vaalea");
    expect(s.themeDark).toBe("Tumma");
    expect(s.themeSystem).toBe("Järjestelmä");
  });

  test("parallel translation strings exist", () => {
    const s = t();
    expect(s.parallelLabel).toBe("Rinnakkaiskäännös");
    expect(s.parallelNone).toBe("Ei mitään");
  });

  test("copy string exists", () => {
    expect(t().copied).toBe("Kopioitu!");
    expect(t().copyVerse).toBe("Kopioi jae");
  });

  test("highlight strings exist", () => {
    const s = t();
    expect(s.highlight).toBe("Korosta");
    expect(s.removeHighlight).toBe("Poista korostus");
  });
});

describe("i18n — language switching preserves new strings", () => {
  test("switching en → fi → en returns correct strings", () => {
    setLanguage("en");
    expect(t().themeLabel).toBe("Theme");
    expect(t().highlight).toBe("Highlight");

    setLanguage("fi");
    expect(t().themeLabel).toBe("Teema");
    expect(t().highlight).toBe("Korosta");

    setLanguage("en");
    expect(t().themeLabel).toBe("Theme");
    expect(t().highlight).toBe("Highlight");
  });

  test("unknown language falls back to EN for new strings", () => {
    setLanguage("xx");
    expect(t().themeLabel).toBe("Theme");
    expect(t().copied).toBe("Copied!");
    expect(t().highlight).toBe("Highlight");
  });
});

describe("i18n — all new keys are non-empty strings", () => {
  const newKeys = [
    "themeLabel", "themeLight", "themeDark", "themeSystem",
    "parallelLabel", "parallelNone",
    "copied", "copyVerse",
    "highlight", "removeHighlight",
  ] as const;

  test("EN: all new keys are non-empty", () => {
    setLanguage("en");
    const s = t();
    for (const key of newKeys) {
      expect(typeof s[key]).toBe("string");
      expect((s[key] as string).length).toBeGreaterThan(0);
    }
  });

  test("FI: all new keys are non-empty", () => {
    setLanguage("fi");
    const s = t();
    for (const key of newKeys) {
      expect(typeof s[key]).toBe("string");
      expect((s[key] as string).length).toBeGreaterThan(0);
    }
  });
});

// ---------------------------------------------------------------------------
// Types — Highlight shape validation
// ---------------------------------------------------------------------------

describe("Highlight type", () => {
  const VALID_COLORS: HighlightColor[] = ["yellow", "green", "blue", "pink", "orange"];

  test("valid highlight object has required fields", () => {
    const hl: Highlight = { book: "Genesis", chapter: 1, verse: 1, color: "yellow" };
    expect(hl.book).toBe("Genesis");
    expect(hl.chapter).toBe(1);
    expect(hl.verse).toBe(1);
    expect(hl.color).toBe("yellow");
  });

  test("all 5 highlight colors are valid", () => {
    for (const color of VALID_COLORS) {
      const hl: Highlight = { book: "Genesis", chapter: 1, verse: 1, color };
      expect(hl.color).toBe(color);
    }
    expect(VALID_COLORS).toHaveLength(5);
  });

  test("highlight key construction pattern", () => {
    const hl: Highlight = { book: "Romans", chapter: 8, verse: 28, color: "green" };
    const key = `${hl.book}:${hl.chapter}:${hl.verse}`;
    expect(key).toBe("Romans:8:28");
  });
});

describe("HighlightMap construction", () => {
  test("builds map from highlights array", () => {
    const highlights: Highlight[] = [
      { book: "Genesis", chapter: 1, verse: 1, color: "yellow" },
      { book: "John", chapter: 3, verse: 16, color: "blue" },
      { book: "Romans", chapter: 8, verse: 28, color: "green" },
    ];
    // Replicate getHighlightMap logic
    const map = new Map<string, HighlightColor>();
    for (const h of highlights) {
      map.set(`${h.book}:${h.chapter}:${h.verse}`, h.color);
    }
    expect(map.size).toBe(3);
    expect(map.get("Genesis:1:1")).toBe("yellow");
    expect(map.get("John:3:16")).toBe("blue");
    expect(map.get("Romans:8:28")).toBe("green");
    expect(map.get("Exodus:1:1")).toBeUndefined();
  });

  test("empty highlights array produces empty map", () => {
    const map = new Map<string, HighlightColor>();
    expect(map.size).toBe(0);
  });

  test("later highlight overwrites earlier one for same verse", () => {
    const highlights: Highlight[] = [
      { book: "Genesis", chapter: 1, verse: 1, color: "yellow" },
      { book: "Genesis", chapter: 1, verse: 1, color: "pink" },
    ];
    const map = new Map<string, HighlightColor>();
    for (const h of highlights) {
      map.set(`${h.book}:${h.chapter}:${h.verse}`, h.color);
    }
    expect(map.size).toBe(1);
    expect(map.get("Genesis:1:1")).toBe("pink");
  });

  test("hlClass pattern returns correct CSS class string", () => {
    const map = new Map<string, HighlightColor>();
    map.set("Genesis:1:1", "yellow");
    map.set("John:3:16", "orange");

    // Replicate hlClass logic
    function hlClass(book: string, chapter: number, verse: number): string {
      const color = map.get(`${book}:${chapter}:${verse}`);
      return color ? ` hl-${color}` : "";
    }

    expect(hlClass("Genesis", 1, 1)).toBe(" hl-yellow");
    expect(hlClass("John", 3, 16)).toBe(" hl-orange");
    expect(hlClass("Exodus", 1, 1)).toBe("");
  });
});

// ---------------------------------------------------------------------------
// i18n — info features section
// ---------------------------------------------------------------------------

describe("i18n — info features section (EN)", () => {
  beforeEach(() => setLanguage("en"));

  test("infoFeaturesTitle exists", () => {
    expect(t().infoFeaturesTitle).toBe("Features");
  });

  test("infoFeaturesItems is a non-empty array", () => {
    const items = t().infoFeaturesItems;
    expect(Array.isArray(items)).toBe(true);
    expect(items.length).toBeGreaterThan(0);
  });

  test("infoFeaturesItems mentions highlights, copy, swipe, print", () => {
    const joined = t().infoFeaturesItems.join(" ").toLowerCase();
    expect(joined).toContain("highlight");
    expect(joined).toContain("copy");
    expect(joined).toContain("swipe");
    expect(joined).toContain("print");
  });

  test("infoSettingsText mentions parallel translation and theme", () => {
    const text = t().infoSettingsText.toLowerCase();
    expect(text).toContain("parallel");
    expect(text).toContain("theme");
  });
});

describe("i18n — info features section (FI)", () => {
  beforeEach(() => setLanguage("fi"));

  test("infoFeaturesTitle exists", () => {
    expect(t().infoFeaturesTitle).toBe("Ominaisuudet");
  });

  test("infoFeaturesItems is a non-empty array", () => {
    const items = t().infoFeaturesItems;
    expect(Array.isArray(items)).toBe(true);
    expect(items.length).toBeGreaterThan(0);
  });

  test("infoSettingsText mentions parallel and theme in Finnish", () => {
    const text = t().infoSettingsText.toLowerCase();
    expect(text).toContain("rinnakkais");
    expect(text).toContain("teema");
  });
});

// ---------------------------------------------------------------------------
// Copy segment parsing logic (replicates app.ts copy handler)
// ---------------------------------------------------------------------------

describe("Copy segment parsing", () => {
  /** Replicates the segment parsing logic from app.ts copy handler */
  function parseSegments(segments: string): number[] {
    const parts = segments.split(",");
    const verses: number[] = [];
    for (const p of parts) {
      const range = p.split("-").map(Number);
      if (range.length === 2) {
        for (let v = range[0]; v <= range[1]; v++) verses.push(v);
      } else {
        verses.push(range[0]);
      }
    }
    return verses;
  }

  test("single verse", () => {
    expect(parseSegments("5")).toEqual([5]);
  });

  test("simple range", () => {
    expect(parseSegments("1-3")).toEqual([1, 2, 3]);
  });

  test("comma-separated singles", () => {
    expect(parseSegments("1,3,5")).toEqual([1, 3, 5]);
  });

  test("mixed ranges and singles", () => {
    expect(parseSegments("1-3,5,8-10")).toEqual([1, 2, 3, 5, 8, 9, 10]);
  });

  test("single element range", () => {
    expect(parseSegments("7-7")).toEqual([7]);
  });
});

// ---------------------------------------------------------------------------
// PWA — manifest, service worker, icons, and build output
// ---------------------------------------------------------------------------

const ROOT = resolve(import.meta.dir, "..");
const PUBLIC = join(ROOT, "public");

describe("PWA — manifest.json", () => {
  const manifest = JSON.parse(readFileSync(join(PUBLIC, "manifest.json"), "utf-8"));

  test("has required fields", () => {
    expect(manifest.name).toBe("Sanatheos");
    expect(manifest.start_url).toBe("./index.html");
    expect(manifest.display).toBe("standalone");
    expect(manifest.background_color).toBeTruthy();
    expect(manifest.theme_color).toBeTruthy();
  });

  test("declares PNG icons at 192 and 512", () => {
    expect(Array.isArray(manifest.icons)).toBe(true);
    const sizes = manifest.icons.map((i: { sizes: string }) => i.sizes);
    expect(sizes).toContain("192x192");
    expect(sizes).toContain("512x512");
    for (const icon of manifest.icons) {
      expect(icon.type).toBe("image/png");
      expect(icon.src).toMatch(/\.png$/);
    }
  });

  test("icon files exist in public/", () => {
    for (const icon of manifest.icons) {
      const file = icon.src.replace("./", "");
      expect(existsSync(join(PUBLIC, file))).toBe(true);
    }
  });
});

describe("PWA — service worker", () => {
  const sw = readFileSync(join(PUBLIC, "sw.js"), "utf-8");

  test("defines a cache name", () => {
    expect(sw).toMatch(/const CACHE_NAME\s*=/);
  });

  test("caches shell assets on install", () => {
    expect(sw).toContain("cache.addAll(SHELL_ASSETS)");
  });

  test("cleans old caches on activate", () => {
    expect(sw).toContain("caches.delete(k)");
  });

  test("has a fetch handler", () => {
    expect(sw).toContain('self.addEventListener("fetch"');
  });

  test("SHELL_ASSETS includes core files", () => {
    expect(sw).toContain("./style.css");
    expect(sw).toContain("./bundle.js");
    expect(sw).toContain("./manifest.json");
  });

  test("SHELL_ASSETS includes PWA icons", () => {
    expect(sw).toContain("./pwaicon-192.png");
    expect(sw).toContain("./pwaicon-512.png");
  });
});

describe("PWA — index.html integration", () => {
  const html = readFileSync(join(PUBLIC, "index.html"), "utf-8");

  test("links to manifest.json", () => {
    expect(html).toContain('rel="manifest"');
    expect(html).toContain("manifest.json");
  });

  test("registers service worker", () => {
    expect(html).toContain("serviceWorker.register");
    expect(html).toContain("sw.js");
  });
});

describe("PWA — build script copies PWA files", () => {
  const buildScript = readFileSync(join(ROOT, "scripts", "build-static.ts"), "utf-8");

  test("copies manifest.json", () => {
    expect(buildScript).toContain("manifest.json");
  });

  test("copies sw.js", () => {
    expect(buildScript).toContain("sw.js");
  });

  test("copies PWA icon PNGs", () => {
    expect(buildScript).toContain("pwaicon-192.png");
    expect(buildScript).toContain("pwaicon-512.png");
  });
});

describe("i18n — PWA feature in info items", () => {
  test("EN infoFeaturesItems mentions install/PWA", () => {
    setLanguage("en");
    const joined = t().infoFeaturesItems.join(" ").toLowerCase();
    expect(joined).toContain("install");
    expect(joined).toContain("progressive web app");
  });

  test("FI infoFeaturesItems mentions install/PWA", () => {
    setLanguage("fi");
    const joined = t().infoFeaturesItems.join(" ").toLowerCase();
    expect(joined).toContain("asenna");
    expect(joined).toContain("pwa");
  });
});
