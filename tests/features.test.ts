import { describe, test, expect, beforeEach, afterAll } from "bun:test";
import { setLanguage, t } from "../src/client/i18n.ts";
import type {
	Highlight,
	HighlightColor,
	BookDescription,
	DescriptionData,
} from "../src/client/types.ts";
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
		expect(t().copyVerse).toBe("Copy");
	});

	test("highlight strings exist", () => {
		const s = t();
		expect(s.highlight).toBe("Highlight");
		expect(s.removeHighlight).toBe("Remove highlight");
	});

	test("footer descriptions string mentions CPDV", () => {
		expect(t().footerDescriptions).toContain("Catholic Public Domain Version");
		expect(t().footerDescriptions).toContain("CPDV");
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
		expect(t().copyVerse).toBe("Kopioi");
	});

	test("highlight strings exist", () => {
		const s = t();
		expect(s.highlight).toBe("Korosta");
		expect(s.removeHighlight).toBe("Poista korostus");
	});

	test("footer descriptions string mentions CPDV", () => {
		expect(t().footerDescriptions).toContain("CPDV");
		expect(t().footerDescriptions).toContain("Catholic Public Domain Version");
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
		"themeLabel",
		"themeLight",
		"themeDark",
		"themeSystem",
		"parallelLabel",
		"parallelNone",
		"copied",
		"copyVerse",
		"highlight",
		"removeHighlight",
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
		expect(sw).toContain("./icon/pwaicon-192.png");
		expect(sw).toContain("./icon/pwaicon-512.png");
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

	test("copies PWA icon PNGs via icons directory", () => {
		expect(buildScript).toContain('"icon"');
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

// ---------------------------------------------------------------------------
// Descriptions — type validation and file structure
// ---------------------------------------------------------------------------

describe("DescriptionData types", () => {
	test("BookDescription has required fields", () => {
		const bd: BookDescription = {
			name: "Genesis",
			description: "The first book of the Bible.",
			chapters: [{ number: 1, description: "God creates heaven and earth." }],
		};
		expect(bd.name).toBe("Genesis");
		expect(bd.description).toBeTruthy();
		expect(bd.chapters).toHaveLength(1);
		expect(bd.chapters[0].number).toBe(1);
		expect(bd.chapters[0].description).toBeTruthy();
	});

	test("DescriptionData is an array of BookDescription", () => {
		const data: DescriptionData = [
			{
				name: "Genesis",
				description: "First book.",
				chapters: [{ number: 1, description: "Ch 1." }],
			},
			{ name: "Exodus", description: "Second book.", chapters: [] },
		];
		expect(Array.isArray(data)).toBe(true);
		expect(data).toHaveLength(2);
		expect(data[0].name).toBe("Genesis");
		expect(data[1].name).toBe("Exodus");
	});
});

describe("Descriptions — build script includes descriptions", () => {
	const buildScript = readFileSync(join(ROOT, "scripts", "build-static.ts"), "utf-8");

	test("build script copies data directory (includes descriptions)", () => {
		expect(buildScript).toContain('"data"');
	});
});

describe("Descriptions — server serves description files", () => {
	const serverCode = readFileSync(join(ROOT, "src", "server.ts"), "utf-8");

	test("server handles /descriptions-CODE.json route", () => {
		expect(serverCode).toContain("descriptions-");
		expect(serverCode).toContain("descriptionsCache");
	});
});

// ---------------------------------------------------------------------------
// Subheadings data validation
// ---------------------------------------------------------------------------

import type { SubheadingsData, SubheadingEntry } from "../src/client/types.ts";

describe("Subheadings — English data", () => {
	const shPath = join(PUBLIC, "data", "subheadings-en.json");
	const exists = existsSync(shPath);

	test("subheadings-en.json exists", () => {
		expect(exists).toBe(true);
	});

	if (exists) {
		const data: SubheadingsData = JSON.parse(readFileSync(shPath, "utf-8"));
		const bookKeys = Object.keys(data);

		test("has entries for at least 60 books", () => {
			expect(bookKeys.length).toBeGreaterThanOrEqual(60);
		});

		test("every book key has at least one chapter", () => {
			for (const book of bookKeys) {
				const chapters = Object.keys(data[book]);
				expect(chapters.length).toBeGreaterThan(0);
			}
		});

		test("every entry has positive verse number and non-empty text", () => {
			for (const book of bookKeys) {
				for (const ch of Object.keys(data[book])) {
					const entries: SubheadingEntry[] = data[book][ch];
					for (const e of entries) {
						expect(e.v).toBeGreaterThan(0);
						expect(e.t.length).toBeGreaterThan(0);
					}
				}
			}
		});

		test("chapter keys are valid positive integers", () => {
			for (const book of bookKeys) {
				for (const ch of Object.keys(data[book])) {
					const n = Number(ch);
					expect(Number.isInteger(n) && n > 0).toBe(true);
				}
			}
		});
	}
});

describe("Subheadings — Finnish data", () => {
	const shPath = join(PUBLIC, "data", "subheadings-fi.json");
	const exists = existsSync(shPath);

	test("subheadings-fi.json exists", () => {
		expect(exists).toBe(true);
	});

	if (exists) {
		const data: SubheadingsData = JSON.parse(readFileSync(shPath, "utf-8"));
		const bookKeys = Object.keys(data);

		test("has entries for at least 60 books", () => {
			expect(bookKeys.length).toBeGreaterThanOrEqual(60);
		});

		test("every entry has positive verse number and non-empty text", () => {
			for (const book of bookKeys) {
				for (const ch of Object.keys(data[book])) {
					for (const e of data[book][ch]) {
						expect(e.v).toBeGreaterThan(0);
						expect(e.t.length).toBeGreaterThan(0);
					}
				}
			}
		});
	}
});

describe("Subheadings — EN and FI structural match", () => {
	const enPath = join(PUBLIC, "data", "subheadings-en.json");
	const fiPath = join(PUBLIC, "data", "subheadings-fi.json");
	const bothExist = existsSync(enPath) && existsSync(fiPath);

	test("both files exist", () => {
		expect(bothExist).toBe(true);
	});

	if (bothExist) {
		const en: SubheadingsData = JSON.parse(readFileSync(enPath, "utf-8"));
		const fi: SubheadingsData = JSON.parse(readFileSync(fiPath, "utf-8"));

		test("same set of book keys", () => {
			const enBooks = Object.keys(en).sort();
			const fiBooks = Object.keys(fi).sort();
			expect(enBooks).toEqual(fiBooks);
		});

		test("same number of entries per book", () => {
			for (const book of Object.keys(en)) {
				const enCount = Object.values(en[book]).flat().length;
				const fiCount = Object.values(fi[book]).flat().length;
				expect(fiCount).toBe(enCount);
			}
		});
	}
});

// ---------------------------------------------------------------------------
// Descriptions — public/data/ language-based files
// ---------------------------------------------------------------------------

describe("Descriptions — public/data/ files", () => {
	const enPath = join(PUBLIC, "data", "descriptions-en.json");
	const fiPath = join(PUBLIC, "data", "descriptions-fi.json");

	test("descriptions-en.json exists", () => {
		expect(existsSync(enPath)).toBe(true);
	});

	test("descriptions-fi.json exists", () => {
		expect(existsSync(fiPath)).toBe(true);
	});

	if (existsSync(enPath)) {
		const data: DescriptionData = JSON.parse(readFileSync(enPath, "utf-8"));

		test("EN descriptions is a non-empty array", () => {
			expect(Array.isArray(data)).toBe(true);
			expect(data.length).toBeGreaterThan(0);
		});

		test("EN descriptions entries have required fields", () => {
			for (const book of data) {
				expect(typeof book.name).toBe("string");
				expect(typeof book.description).toBe("string");
				expect(Array.isArray(book.chapters)).toBe(true);
			}
		});
	}

	if (existsSync(fiPath)) {
		const data: DescriptionData = JSON.parse(readFileSync(fiPath, "utf-8"));

		test("FI descriptions is a non-empty array", () => {
			expect(Array.isArray(data)).toBe(true);
			expect(data.length).toBeGreaterThan(0);
		});

		test("FI descriptions entries have required fields", () => {
			for (const book of data) {
				expect(typeof book.name).toBe("string");
				expect(typeof book.description).toBe("string");
				expect(Array.isArray(book.chapters)).toBe(true);
			}
		});
	}
});

// ---------------------------------------------------------------------------
// i18n — edge cases
// ---------------------------------------------------------------------------

describe("i18n — function-type strings", () => {
	test("EN noResults returns formatted string", () => {
		setLanguage("en");
		const s = t();
		expect(s.noResults("test")).toContain("test");
		expect(s.noResults("test")).toContain("No results");
	});

	test("FI noResults returns formatted string", () => {
		setLanguage("fi");
		expect(t().noResults("testi")).toContain("testi");
	});

	test("EN resultCount singular vs plural", () => {
		setLanguage("en");
		const s = t();
		expect(s.resultCount(1)).toBe("1 result");
		expect(s.resultCount(0)).toBe("0 results");
		expect(s.resultCount(999)).toBe("999 results");
	});

	test("FI resultCount singular vs plural", () => {
		setLanguage("fi");
		const s = t();
		expect(s.resultCount(1)).toBe("1 tulos");
		expect(s.resultCount(0)).toBe("0 tulosta");
		expect(s.resultCount(999)).toBe("999 tulosta");
	});

	test("loadingTranslation includes code", () => {
		setLanguage("en");
		expect(t().loadingTranslation("KR38")).toContain("KR38");
		setLanguage("fi");
		expect(t().loadingTranslation("NHEB")).toContain("NHEB");
	});
});

describe("i18n — font size strings", () => {
	test("EN has all font size strings", () => {
		setLanguage("en");
		const s = t();
		expect(s.fontSizeLabel).toBeTruthy();
		expect(s.fontSizeSmall).toBeTruthy();
		expect(s.fontSizeMedium).toBeTruthy();
		expect(s.fontSizeLarge).toBeTruthy();
		expect(s.fontSizeXL).toBeTruthy();
		expect(s.fontSizeXXL).toBeTruthy();
	});

	test("FI has all font size strings", () => {
		setLanguage("fi");
		const s = t();
		expect(s.fontSizeLabel).toBeTruthy();
		expect(s.fontSizeSmall).toBeTruthy();
		expect(s.fontSizeMedium).toBeTruthy();
		expect(s.fontSizeLarge).toBeTruthy();
		expect(s.fontSizeXL).toBeTruthy();
		expect(s.fontSizeXXL).toBeTruthy();
	});
});

describe("i18n — EN and FI key parity", () => {
	test("both languages have the same set of keys", () => {
		setLanguage("en");
		const enKeys = Object.keys(t()).sort();
		setLanguage("fi");
		const fiKeys = Object.keys(t()).sort();
		expect(enKeys).toEqual(fiKeys);
	});

	test("both languages have same number of infoSearchItems", () => {
		setLanguage("en");
		const enItems = t().infoSearchItems;
		setLanguage("fi");
		const fiItems = t().infoSearchItems;
		expect(enItems.length).toBe(fiItems.length);
	});

	test("both languages have same number of infoShortcuts", () => {
		setLanguage("en");
		const enItems = t().infoShortcuts;
		setLanguage("fi");
		const fiItems = t().infoShortcuts;
		expect(enItems.length).toBe(fiItems.length);
	});

	test("infoShortcuts contains Ctrl+B entry in EN", () => {
		setLanguage("en");
		const shortcuts = t().infoShortcuts.join(" ");
		expect(shortcuts).toContain("Ctrl+B");
	});

	test("infoShortcuts contains Ctrl+B entry in FI", () => {
		setLanguage("fi");
		const shortcuts = t().infoShortcuts.join(" ");
		expect(shortcuts).toContain("Ctrl+B");
	});

	test("both languages have same number of infoFeaturesItems", () => {
		setLanguage("en");
		const enItems = t().infoFeaturesItems;
		setLanguage("fi");
		const fiItems = t().infoFeaturesItems;
		expect(enItems.length).toBe(fiItems.length);
	});
});

// ---------------------------------------------------------------------------
// Favicon attribution — Wikimedia Commons link
// ---------------------------------------------------------------------------

describe("i18n — favicon attribution", () => {
	test("EN footerFavicon links to Wikimedia Commons source", () => {
		setLanguage("en");
		expect(t().footerFavicon).toContain(
			"commons.wikimedia.org/wiki/File:Jesus-Christ-from-Hagia-Sophia.jpg",
		);
	});

	test("EN footerFavicon links to CC BY-SA 3.0 license", () => {
		setLanguage("en");
		expect(t().footerFavicon).toContain("creativecommons.org/licenses/by-sa/3.0");
	});

	test("FI footerFavicon links to Wikimedia Commons source", () => {
		setLanguage("fi");
		expect(t().footerFavicon).toContain(
			"commons.wikimedia.org/wiki/File:Jesus-Christ-from-Hagia-Sophia.jpg",
		);
	});

	test("FI footerFavicon links to CC BY-SA 3.0 license", () => {
		setLanguage("fi");
		expect(t().footerFavicon).toContain("creativecommons.org/licenses/by-sa/3.0");
	});
});

// ---------------------------------------------------------------------------
// CSS — responsive section-title and dark mode highlights
// ---------------------------------------------------------------------------

describe("CSS — responsive section-title", () => {
	const css = readFileSync(join(ROOT, "public", "style.css"), "utf-8");

	test("section-title has smaller font in mobile media query", () => {
		// Find the @media (max-width: 800px) block — it ends at the next unindented }
		const start = css.indexOf("@media (max-width: 800px)");
		expect(start).not.toBe(-1);
		// Extract everything from this media query to its closing brace
		let depth = 0;
		let end = start;
		for (let i = css.indexOf("{", start); i < css.length; i++) {
			if (css[i] === "{") depth++;
			if (css[i] === "}") depth--;
			if (depth === 0) {
				end = i + 1;
				break;
			}
		}
		const block = css.slice(start, end);
		expect(block).toContain(".section-title");
		expect(block).toContain("font-size");
	});
});

describe("CSS — dark mode highlight brightness", () => {
	const css = readFileSync(join(ROOT, "public", "style.css"), "utf-8");

	test("dark mode highlight opacity is between 0.25 and 0.5", () => {
		// Extract dark theme block
		const darkBlock = css.match(/\[data-theme="dark"\]\s*\{([^}]+)\}/);
		expect(darkBlock).not.toBeNull();
		const hlMatches = darkBlock![1].match(/--hl-\w+:\s*rgba\([^)]+,\s*([\d.]+)\)/g);
		expect(hlMatches).not.toBeNull();
		for (const m of hlMatches!) {
			const opacity = parseFloat(m.match(/,\s*([\d.]+)\)/)![1]);
			expect(opacity).toBeGreaterThanOrEqual(0.25);
			expect(opacity).toBeLessThanOrEqual(0.5);
		}
	});

	test("dark mode highlights are brighter than 0.2 opacity", () => {
		const darkBlock = css.match(/\[data-theme="dark"\]\s*\{([^}]+)\}/);
		expect(darkBlock).not.toBeNull();
		const hlMatches = darkBlock![1].match(/--hl-\w+:\s*rgba\([^)]+,\s*([\d.]+)\)/g);
		expect(hlMatches).not.toBeNull();
		for (const m of hlMatches!) {
			const opacity = parseFloat(m.match(/,\s*([\d.]+)\)/)![1]);
			expect(opacity).toBeGreaterThan(0.2);
		}
	});
});

// ---------------------------------------------------------------------------
// HTML — bundle script uses defer attribute
// ---------------------------------------------------------------------------

describe("HTML — bundle script defer", () => {
	const html = readFileSync(join(PUBLIC, "index.html"), "utf-8");

	test("bundle.js script tag has defer attribute", () => {
		expect(html).toMatch(/<script\s+defer\s+src="\.\/bundle\.js"><\/script>/);
	});
});

// ---------------------------------------------------------------------------
// i18n — interlinear strings
// ---------------------------------------------------------------------------

describe("i18n — interlinear strings (EN)", () => {
	beforeEach(() => setLanguage("en"));

	test("interlinear string exists", () => {
		expect(t().interlinear).toBe("Interlinear");
	});

	test("interlinearTooltip mentions Hebrew/Greek", () => {
		expect(t().interlinearTooltip).toContain("Hebrew");
		expect(t().interlinearTooltip).toContain("Greek");
	});

	test("strongsDef string exists", () => {
		expect(t().strongsDef).toBeTruthy();
	});

	test("pronunciation string exists", () => {
		expect(t().pronunciation).toBeTruthy();
	});

	test("partOfSpeech string exists", () => {
		expect(t().partOfSpeech).toBeTruthy();
	});

	test("morphology string exists", () => {
		expect(t().morphology).toBeTruthy();
	});

	test("crossReferences string exists", () => {
		expect(t().crossReferences).toBeTruthy();
	});

	test("closePanel string exists", () => {
		expect(t().closePanel).toBeTruthy();
	});
});

describe("i18n — interlinear strings (FI)", () => {
	beforeEach(() => setLanguage("fi"));

	test("interlinear string exists", () => {
		expect(t().interlinear).toBe("Interlineaari");
	});

	test("strongsDef string exists", () => {
		expect(t().strongsDef).toBeTruthy();
	});

	test("pronunciation string exists", () => {
		expect(t().pronunciation).toBeTruthy();
	});

	test("partOfSpeech string exists", () => {
		expect(t().partOfSpeech).toBeTruthy();
	});

	test("closePanel string exists", () => {
		expect(t().closePanel).toBeTruthy();
	});
});

// ---------------------------------------------------------------------------
// i18n — index column labels (mobile sticky headers)
// ---------------------------------------------------------------------------

describe("i18n — index column labels (EN)", () => {
	beforeEach(() => setLanguage("en"));

	test("idxBooksLabel is 'Books'", () => {
		expect(t().idxBooksLabel).toBe("Books");
	});

	test("idxChaptersLabel is 'Chapters'", () => {
		expect(t().idxChaptersLabel).toBe("Chapters");
	});

	test("idxVersesLabel is 'Verses'", () => {
		expect(t().idxVersesLabel).toBe("Verses");
	});
});

describe("i18n — index column labels (FI)", () => {
	beforeEach(() => setLanguage("fi"));

	test("idxBooksLabel is 'Kirjat'", () => {
		expect(t().idxBooksLabel).toBe("Kirjat");
	});

	test("idxChaptersLabel is 'Luvut'", () => {
		expect(t().idxChaptersLabel).toBe("Luvut");
	});

	test("idxVersesLabel is 'Jakeet'", () => {
		expect(t().idxVersesLabel).toBe("Jakeet");
	});
});

// ---------------------------------------------------------------------------
// i18n — side panel tab button titles
// ---------------------------------------------------------------------------

describe("i18n — side tab button titles (EN)", () => {
	beforeEach(() => setLanguage("en"));

	test("storiesTitle is non-empty", () => {
		expect(t().storiesTitle).toBeTruthy();
	});

	test("settings string is non-empty", () => {
		expect(t().settings).toBeTruthy();
	});

	test("helpInfo string is non-empty", () => {
		expect(t().helpInfo).toBeTruthy();
	});
});

describe("i18n — side tab button titles (FI)", () => {
	beforeEach(() => setLanguage("fi"));

	test("storiesTitle is non-empty", () => {
		expect(t().storiesTitle).toBeTruthy();
	});

	test("settings string is non-empty", () => {
		expect(t().settings).toBeTruthy();
	});

	test("helpInfo string is non-empty", () => {
		expect(t().helpInfo).toBeTruthy();
	});
});

// ---------------------------------------------------------------------------
// i18n — share link strings
// ---------------------------------------------------------------------------

describe("i18n — share link strings (EN)", () => {
	beforeEach(() => setLanguage("en"));

	test("shareWith string exists", () => {
		expect(t().shareWith).toBeTruthy();
	});

	test("shareWithout string exists", () => {
		expect(t().shareWithout).toBeTruthy();
	});

	test("linkCopied string exists", () => {
		expect(t().linkCopied).toBeTruthy();
	});
});

describe("i18n — share link strings (FI)", () => {
	beforeEach(() => setLanguage("fi"));

	test("shareWith string exists", () => {
		expect(t().shareWith).toBeTruthy();
	});

	test("shareWithout string exists", () => {
		expect(t().shareWithout).toBeTruthy();
	});

	test("linkCopied string exists", () => {
		expect(t().linkCopied).toBeTruthy();
	});
});

// ---------------------------------------------------------------------------
// i18n — dictionary / footer dictionary strings
// ---------------------------------------------------------------------------

describe("i18n — dictionary strings (EN)", () => {
	beforeEach(() => setLanguage("en"));

	test("footerDictionary mentions dictionary", () => {
		expect(t().footerDictionary).toContain("dictionary.html");
		expect(t().footerDictionary).toContain("Dictionary");
	});

	test("infoFeaturesItems mentions Dictionary", () => {
		const joined = t().infoFeaturesItems.join(" ");
		expect(joined).toContain("Dictionary");
		expect(joined).toContain("dictionary.html");
	});
});

describe("i18n — dictionary strings (FI)", () => {
	beforeEach(() => setLanguage("fi"));

	test("footerDictionary mentions dictionary", () => {
		expect(t().footerDictionary).toContain("dictionary.html");
	});

	test("infoFeaturesItems mentions Sanakirja", () => {
		const joined = t().infoFeaturesItems.join(" ");
		expect(joined).toContain("Sanakirja");
		expect(joined).toContain("dictionary.html");
	});
});

// ---------------------------------------------------------------------------
// i18n — deuterocanonical strings
// ---------------------------------------------------------------------------

describe("i18n — deuterocanonical strings", () => {
	test("EN has deuterocanonical string", () => {
		setLanguage("en");
		expect(t().deuterocanonical).toBe("Deuterocanonical");
	});

	test("FI has deuterocanonical string", () => {
		setLanguage("fi");
		expect(t().deuterocanonical).toBeTruthy();
	});
});

// ---------------------------------------------------------------------------
// i18n — loadTranslationFailed
// ---------------------------------------------------------------------------

describe("i18n — loadTranslationFailed", () => {
	test("EN includes code", () => {
		setLanguage("en");
		expect(t().loadTranslationFailed("XYZ")).toContain("XYZ");
	});

	test("FI includes code", () => {
		setLanguage("fi");
		expect(t().loadTranslationFailed("XYZ")).toContain("XYZ");
	});
});

// ---------------------------------------------------------------------------
// i18n — copyBoth and showMore
// ---------------------------------------------------------------------------

describe("i18n — copyBoth and showMore", () => {
	test("EN copyBoth exists", () => {
		setLanguage("en");
		expect(t().copyBoth).toBeTruthy();
	});

	test("FI copyBoth exists", () => {
		setLanguage("fi");
		expect(t().copyBoth).toBeTruthy();
	});

	test("EN showMore exists", () => {
		setLanguage("en");
		expect(t().showMore).toBeTruthy();
	});

	test("FI showMore exists", () => {
		setLanguage("fi");
		expect(t().showMore).toBeTruthy();
	});
});

// ---------------------------------------------------------------------------
// bookNames — displayName and displayNameFor
// ---------------------------------------------------------------------------

import { setTranslation, displayName, displayNameFor } from "../src/client/bookNames.ts";

describe("bookNames — displayName", () => {
	test("returns English name for NHEB", () => {
		setTranslation("NHEB");
		expect(displayName("Genesis")).toBe("Genesis");
		expect(displayName("John")).toBe("John");
		expect(displayName("Revelation")).toBe("Revelation");
	});

	test("returns Finnish name for KR38", () => {
		setTranslation("KR38");
		expect(displayName("Genesis")).toBe("1. Mooseksen kirja");
		expect(displayName("John")).toBe("Johanneksen evankeliumi");
		expect(displayName("Revelation")).toBe("Ilmestyskirja");
	});

	test("returns key as fallback for unknown book", () => {
		setTranslation("NHEB");
		expect(displayName("FakeBook")).toBe("FakeBook");
	});

	test("handles deuterocanonical books", () => {
		setTranslation("NHEB");
		expect(displayName("Tobit")).toBe("Tobit");
		expect(displayName("1 Maccabees")).toBe("1 Maccabees");
	});

	// Reset to NHEB
	afterAll(() => setTranslation("NHEB"));
});

describe("bookNames — displayNameFor", () => {
	test("returns name for specified translation code", () => {
		expect(displayNameFor("KR38", "Genesis")).toBe("1. Mooseksen kirja");
		expect(displayNameFor("NHEB", "Genesis")).toBe("Genesis");
	});

	test("returns key as fallback for unknown translation", () => {
		expect(displayNameFor("UNKNOWN", "Genesis")).toBe("Genesis");
	});

	test("returns key as fallback for unknown book", () => {
		expect(displayNameFor("NHEB", "FakeBook")).toBe("FakeBook");
	});
});

// ---------------------------------------------------------------------------
// bookCodes — deuterocanonical books
// ---------------------------------------------------------------------------

import { bookFromCode, bookToCode } from "../src/client/bookCodes.ts";

describe("bookCodes — deuterocanonical books", () => {
	test("deuterocanonical books have codes", () => {
		expect(bookToCode("Tobit")).toBe("tob");
		expect(bookToCode("Judith")).toBe("jdt");
		expect(bookToCode("Wisdom")).toBe("wis");
		expect(bookToCode("Sirach")).toBe("sir");
		expect(bookToCode("1 Maccabees")).toBe("1ma");
		expect(bookToCode("2 Maccabees")).toBe("2ma");
	});

	test("deuterocanonical codes resolve back to books", () => {
		expect(bookFromCode("tob")).toBe("Tobit");
		expect(bookFromCode("jdt")).toBe("Judith");
		expect(bookFromCode("wis")).toBe("Wisdom");
		expect(bookFromCode("sir")).toBe("Sirach");
		expect(bookFromCode("1ma")).toBe("1 Maccabees");
		expect(bookFromCode("2ma")).toBe("2 Maccabees");
	});
});

// ---------------------------------------------------------------------------
// state — toUrl with interlinear param
// ---------------------------------------------------------------------------

import { toUrl } from "../src/client/state.ts";

describe("state — interlinear param", () => {
	test("interlinear true adds il=1 to URL", () => {
		const url = toUrl({ book: "Genesis", chapter: 1, interlinear: true });
		expect(url).toContain("il=1");
	});

	test("interlinear false omits il param", () => {
		const url = toUrl({ book: "Genesis", chapter: 1, interlinear: false });
		expect(url).not.toContain("il=");
	});

	test("interlinear undefined omits il param", () => {
		const url = toUrl({ book: "Genesis", chapter: 1 });
		expect(url).not.toContain("il=");
	});
});

// ---------------------------------------------------------------------------
// Interlinear types validation
// ---------------------------------------------------------------------------

import type { InterlinearWord, StrongsEntry, StrongsDict } from "../src/client/types.ts";

describe("Interlinear types", () => {
	test("InterlinearWord has required fields", () => {
		const word: InterlinearWord = {
			w: "In",
			english: "In",
			original: "Ἐν",
			translit: "En",
			strongs: "g1722",
		};
		expect(word.w).toBeTruthy();
		expect(word.english).toBeTruthy();
		expect(word.original).toBeTruthy();
		expect(word.strongs).toBeTruthy();
	});

	test("InterlinearWord optional fields", () => {
		const word: InterlinearWord = {
			w: "beginning",
			english: "beginning",
			original: "ἀρχῇ",
			translit: "archē",
			lemma: "ἀρχή",
			strongs: "g746",
			morph: "N-DSF",
		};
		expect(word.lemma).toBe("ἀρχή");
		expect(word.morph).toBe("N-DSF");
	});

	test("StrongsEntry has required fields", () => {
		const entry: StrongsEntry = {
			d: "beginning, origin",
			p: "ar-khay'",
			s: "feminine noun",
			r: "from G756|English: beginning",
		};
		expect(entry.d).toBeTruthy();
		expect(entry.s).toBeTruthy();
	});

	test("StrongsDict is keyed by lowercase Strong's numbers", () => {
		const dict: StrongsDict = {
			g746: { d: "beginning", p: "ar-khay'", s: "feminine noun", r: "" },
			h430: { d: "God", p: "el-o-heem'", s: "masculine plural noun", r: "" },
		};
		expect(dict["g746"]).toBeDefined();
		expect(dict["h430"]).toBeDefined();
	});
});

// ---------------------------------------------------------------------------
// Dictionary page exists
// ---------------------------------------------------------------------------

describe("dictionary.html exists in public/", () => {
	test("dictionary.html file is present", () => {
		expect(existsSync(join(PUBLIC, "dictionary.html"))).toBe(true);
	});
});

// ---------------------------------------------------------------------------
// Build script copies dictionary.html
// ---------------------------------------------------------------------------

describe("Build script — dictionary.html", () => {
	const buildScript = readFileSync(join(ROOT, "scripts", "build-static.ts"), "utf-8");

	test("build script includes dictionary.html in staticFiles", () => {
		expect(buildScript).toContain("dictionary.html");
	});
});

// ---------------------------------------------------------------------------
// Strong's data file
// ---------------------------------------------------------------------------

describe("Strong's data — strongs.json", () => {
	const strongsPath = join(ROOT, "public", "text", "strongs.json");

	test("strongs.json exists", () => {
		expect(existsSync(strongsPath)).toBe(true);
	});

	if (existsSync(strongsPath)) {
		const data = JSON.parse(readFileSync(strongsPath, "utf-8")) as StrongsDict;

		test("has Hebrew entries (h-prefixed keys)", () => {
			const hKeys = Object.keys(data).filter((k) => k.startsWith("h"));
			expect(hKeys.length).toBeGreaterThan(4000);
		});

		test("has Greek entries (g-prefixed keys)", () => {
			const gKeys = Object.keys(data).filter((k) => k.startsWith("g"));
			expect(gKeys.length).toBeGreaterThan(5000);
		});

		test("every entry has d, p, s, r fields", () => {
			let checked = 0;
			for (const [_key, entry] of Object.entries(data)) {
				expect(typeof entry.d).toBe("string");
				expect(typeof entry.p).toBe("string");
				expect(typeof entry.s).toBe("string");
				expect(typeof entry.r).toBe("string");
				checked++;
				if (checked >= 100) break; // sample check
			}
		});

		test("keys are lowercase", () => {
			for (const key of Object.keys(data).slice(0, 100)) {
				expect(key).toBe(key.toLowerCase());
			}
		});
	}
});

// ---------------------------------------------------------------------------
// CSS — interlinear styles
// ---------------------------------------------------------------------------

describe("CSS — interlinear styles", () => {
	const css = readFileSync(join(ROOT, "public", "style.css"), "utf-8");

	test("has interlinear word styles", () => {
		expect(css).toContain(".il-word");
	});

	test("has Strong's panel styles", () => {
		expect(css).toContain("#strongs-panel");
	});

	test("has interlinear toggle button styles", () => {
		expect(css).toContain(".il-toggle-btn");
	});
});

// ---------------------------------------------------------------------------
// HTML — strongs-panel and toast elements
// ---------------------------------------------------------------------------

describe("HTML — structural elements", () => {
	const html = readFileSync(join(PUBLIC, "index.html"), "utf-8");

	test("has Strong's panel element", () => {
		expect(html).toContain('id="strongs-panel"');
	});

	test("has toast notification element", () => {
		expect(html).toContain('id="toast"');
	});

	test("has verse menu element", () => {
		expect(html).toContain('id="verse-menu"');
	});
});
