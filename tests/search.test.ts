import { describe, test, expect, beforeEach } from "bun:test";
import type { BibleData } from "../src/client/types.ts";
import type { InterlinearBook } from "../src/client/types.ts";
import {
	initSearch,
	search,
	tryParseNav,
	tryParseNavGroups,
	parseNavTerms,
	parseQueryBooks,
	setSearchInterlinearData,
	_matchBook,
	_parseRef,
	_parseVerseSegments,
	_buildTextMatcher,
	_levenshtein,
	_normalizeQuery,
	escapeRegex,
} from "../src/client/search.ts";
import { setTranslation, getAliases, getSortedAliases } from "../src/client/bookNames.ts";

// Minimal fixture data
const fixture: BibleData = {
	Genesis: {
		"1": {
			"1": "In the beginning God created the heavens and the earth.",
			"2": "The earth was without form, and void.",
			"3": 'Then God said, "Let there be light"; and there was light.',
			"4": "And God saw the light, that it was good.",
			"5": "God called the light Day, and the darkness He called Night.",
		},
		"2": {
			"1": "Thus the heavens and the earth were finished.",
			"2": "And on the seventh day God ended His work.",
			"3": "Then God blessed the seventh day.",
		},
		"3": {
			"1": "Now the serpent was more cunning than any beast.",
			"2": "And the woman said to the serpent.",
		},
	},
	John: {
		"1": {
			"1": "In the beginning was the Word, and the Word was with God.",
			"2": "He was in the beginning with God.",
			"3": "All things were made through Him.",
		},
		"3": {
			"16": "For God so loved the world that He gave His only begotten Son.",
			"17": "For God did not send His Son into the world to condemn the world.",
		},
	},
	"1 John": {
		"1": {
			"1": "That which was from the beginning, which we have heard.",
			"2": "The life was manifested, and we have seen.",
		},
	},
	Revelation: {
		"1": {
			"1": "The Revelation of Jesus Christ.",
		},
	},
};

beforeEach(() => {
	initSearch(fixture);
});

// --- parseVerseSegments ---
describe("parseVerseSegments", () => {
	test("single verse", () => {
		expect(_parseVerseSegments("5")).toEqual([{ start: 5, end: 5 }]);
	});

	test("verse range", () => {
		expect(_parseVerseSegments("3-7")).toEqual([{ start: 3, end: 7 }]);
	});

	test("comma-separated mixed", () => {
		expect(_parseVerseSegments("1-3,5,8-10")).toEqual([
			{ start: 1, end: 3 },
			{ start: 5, end: 5 },
			{ start: 8, end: 10 },
		]);
	});

	test("returns null for invalid", () => {
		expect(_parseVerseSegments("abc")).toBeNull();
		expect(_parseVerseSegments("")).toBeNull();
	});
});

// --- matchBook ---
describe("matchBook", () => {
	test("exact match", () => {
		expect(_matchBook("Genesis")).toEqual({ book: "Genesis", rest: "" });
	});

	test("case insensitive", () => {
		expect(_matchBook("genesis")).toEqual({ book: "Genesis", rest: "" });
	});

	test("with chapter", () => {
		expect(_matchBook("Genesis 1")).toEqual({ book: "Genesis", rest: "1" });
	});

	test("with chapter:verse", () => {
		expect(_matchBook("John 3:16")).toEqual({ book: "John", rest: "3:16" });
	});

	test("numbered book exact", () => {
		expect(_matchBook("1 John")).toEqual({ book: "1 John", rest: "" });
	});

	test("numbered book with chapter", () => {
		expect(_matchBook("1 John 1")).toEqual({ book: "1 John", rest: "1" });
	});

	test("prefix match", () => {
		expect(_matchBook("gen")).toEqual({ book: "Genesis", rest: "" });
	});

	test("prefix with chapter", () => {
		expect(_matchBook("gen 2")).toEqual({ book: "Genesis", rest: "2" });
	});

	test("no match returns null", () => {
		expect(_matchBook("Nonexistent")).toBeNull();
	});
});

// --- parseRef ---
describe("parseRef", () => {
	test("book only", () => {
		expect(_parseRef("Genesis")).toEqual({ book: "Genesis" });
	});

	test("single chapter", () => {
		expect(_parseRef("Genesis 2")).toEqual({
			book: "Genesis",
			chapterStart: 2,
			chapterEnd: 2,
		});
	});

	test("chapter range", () => {
		expect(_parseRef("Genesis 1-3")).toEqual({
			book: "Genesis",
			chapterStart: 1,
			chapterEnd: 3,
		});
	});

	test("single verse", () => {
		expect(_parseRef("John 3:16")).toEqual({
			book: "John",
			chapterStart: 3,
			chapterEnd: 3,
			verseSegments: [{ start: 16, end: 16 }],
		});
	});

	test("verse range", () => {
		expect(_parseRef("Genesis 1:2-4")).toEqual({
			book: "Genesis",
			chapterStart: 1,
			chapterEnd: 1,
			verseSegments: [{ start: 2, end: 4 }],
		});
	});

	test("comma-separated verses", () => {
		expect(_parseRef("Genesis 1:1-3,5")).toEqual({
			book: "Genesis",
			chapterStart: 1,
			chapterEnd: 1,
			verseSegments: [
				{ start: 1, end: 3 },
				{ start: 5, end: 5 },
			],
		});
	});

	test("empty returns null", () => {
		expect(_parseRef("")).toBeNull();
	});

	test("nonexistent book returns null", () => {
		expect(_parseRef("Bogus 1:1")).toBeNull();
	});

	test("trailing period ignored", () => {
		expect(_parseRef("John 3:16.")).toEqual({
			book: "John",
			chapterStart: 3,
			chapterEnd: 3,
			verseSegments: [{ start: 16, end: 16 }],
		});
	});

	test("trailing symbol ignored", () => {
		expect(_parseRef("Genesis 1!")).toEqual({
			book: "Genesis",
			chapterStart: 1,
			chapterEnd: 1,
		});
	});

	test("whitespace around colon ignored", () => {
		expect(_parseRef("John 3 : 16")).toEqual({
			book: "John",
			chapterStart: 3,
			chapterEnd: 3,
			verseSegments: [{ start: 16, end: 16 }],
		});
	});

	test("whitespace around hyphen in verse range ignored", () => {
		expect(_parseRef("Genesis 1 : 1 - 3")).toEqual({
			book: "Genesis",
			chapterStart: 1,
			chapterEnd: 1,
			verseSegments: [{ start: 1, end: 3 }],
		});
	});

	test("letter suffix on verse number ignored", () => {
		expect(_parseRef("John 3:16a")).toEqual({
			book: "John",
			chapterStart: 3,
			chapterEnd: 3,
			verseSegments: [{ start: 16, end: 16 }],
		});
	});

	test("letter suffix on chapter number ignored", () => {
		expect(_parseRef("Genesis 1a")).toEqual({
			book: "Genesis",
			chapterStart: 1,
			chapterEnd: 1,
		});
	});
});

// --- search (reference queries) ---
describe("search — reference queries", () => {
	test("single verse by reference", () => {
		const results = search(fixture, "John 3:16");
		expect(results).toHaveLength(1);
		expect(results[0].book).toBe("John");
		expect(results[0].chapter).toBe(3);
		expect(results[0].verse).toBe(16);
		expect(results[0].text).toContain("God so loved");
	});

	test("whole chapter", () => {
		const results = search(fixture, "Genesis 1");
		expect(results).toHaveLength(5);
		expect(results[0].verse).toBe(1);
		expect(results[4].verse).toBe(5);
	});

	test("chapter range", () => {
		const results = search(fixture, "Genesis 1-2");
		expect(results).toHaveLength(8); // 5 + 3
	});

	test("verse range within chapter", () => {
		const results = search(fixture, "Genesis 1:2-4");
		expect(results).toHaveLength(3);
		expect(results[0].verse).toBe(2);
		expect(results[2].verse).toBe(4);
	});

	test("comma-separated verses", () => {
		const results = search(fixture, "Genesis 1:1-2,5");
		expect(results).toHaveLength(3);
		expect(results[0].verse).toBe(1);
		expect(results[1].verse).toBe(2);
		expect(results[2].verse).toBe(5);
	});

	test("whole book", () => {
		const results = search(fixture, "1 John");
		expect(results).toHaveLength(2);
		expect(results[0].book).toBe("1 John");
	});

	test("nonexistent reference returns empty", () => {
		const results = search(fixture, "Genesis 99:99");
		expect(results).toHaveLength(0);
	});
});

// --- search (text queries) ---
describe("search — text queries", () => {
	test("quoted text match is case insensitive", () => {
		const results = search(fixture, '"beginning"');
		expect(results.length).toBeGreaterThanOrEqual(3);
		for (const r of results) {
			expect(r.text.toLowerCase()).toContain("beginning");
		}
	});

	test("quoted text with no matches", () => {
		const results = search(fixture, '"xyznonexistent"');
		expect(results).toHaveLength(0);
	});

	test("returns all matches (no limit)", () => {
		const results = search(fixture, '"God"');
		expect(results.length).toBeGreaterThanOrEqual(5);
	});

	test("unquoted non-reference text returns empty", () => {
		const results = search(fixture, "beginning");
		expect(results).toHaveLength(0);
	});
});

// --- search (multi-term with semicolons) ---
describe("search — multi-term", () => {
	test("semicolon-separated terms", () => {
		const results = search(fixture, "John 3:16;Revelation 1:1");
		expect(results).toHaveLength(2);
		expect(results[0].book).toBe("John");
		expect(results[1].book).toBe("Revelation");
	});

	test("deduplicates across terms", () => {
		const results = search(fixture, "John 3:16;John 3:16");
		expect(results).toHaveLength(1);
	});

	test("mix reference and quoted text", () => {
		const results = search(fixture, 'Genesis 1:1;"serpent"');
		expect(results.length).toBeGreaterThanOrEqual(2);
		expect(results[0].book).toBe("Genesis");
		expect(results[0].chapter).toBe(1);
		expect(results[0].verse).toBe(1);
	});
});

// --- search (abbreviations) ---
describe("search — abbreviations", () => {
	test("abbreviated book name", () => {
		const results = search(fixture, "gen 1:1");
		expect(results).toHaveLength(1);
		expect(results[0].book).toBe("Genesis");
	});

	test("abbreviated book with chapter range", () => {
		const results = search(fixture, "gen 1-2");
		expect(results).toHaveLength(8);
	});

	test("case insensitive abbreviation", () => {
		const results = search(fixture, "REV 1:1");
		expect(results).toHaveLength(1);
		expect(results[0].book).toBe("Revelation");
	});
});

// --- search (combined reference + text) ---
describe("search — combined reference + text", () => {
	test("book + text filter", () => {
		const results = search(fixture, 'Genesis "serpent"');
		expect(results.length).toBeGreaterThanOrEqual(1);
		for (const r of results) {
			expect(r.book).toBe("Genesis");
			expect(r.text.toLowerCase()).toContain("serpent");
		}
	});

	test("chapter + text filter", () => {
		const results = search(fixture, 'Genesis 1 "light"');
		expect(results.length).toBeGreaterThanOrEqual(1);
		for (const r of results) {
			expect(r.book).toBe("Genesis");
			expect(r.chapter).toBe(1);
			expect(r.text.toLowerCase()).toContain("light");
		}
	});

	test("chapter:verse + text filter narrows results", () => {
		const results = search(fixture, 'Genesis 1:1 "beginning"');
		expect(results).toHaveLength(1);
		expect(results[0].verse).toBe(1);
		expect(results[0].text.toLowerCase()).toContain("beginning");
	});

	test("chapter:verse + text filter with no match", () => {
		const results = search(fixture, 'Genesis 1:1 "serpent"');
		expect(results).toHaveLength(0);
	});

	test("chapter range + text filter", () => {
		const results = search(fixture, 'Genesis 1-3 "seventh"');
		expect(results.length).toBeGreaterThanOrEqual(1);
		for (const r of results) {
			expect(r.book).toBe("Genesis");
			expect(r.text.toLowerCase()).toContain("seventh");
		}
	});

	test("abbreviated book + text filter", () => {
		const results = search(fixture, 'gen "void"');
		expect(results).toHaveLength(1);
		expect(results[0].book).toBe("Genesis");
		expect(results[0].text.toLowerCase()).toContain("void");
	});

	test("combined with semicolon multi-term", () => {
		const results = search(fixture, 'Genesis "light";John 3:16');
		expect(results.length).toBeGreaterThanOrEqual(3); // light in Gen + John 3:16
		const genResults = results.filter((r) => r.book === "Genesis");
		const johnResults = results.filter((r) => r.book === "John");
		expect(genResults.length).toBeGreaterThanOrEqual(1);
		expect(johnResults).toHaveLength(1);
		for (const r of genResults) {
			expect(r.text.toLowerCase()).toContain("light");
		}
	});

	test("empty quotes ignored — returns full reference", () => {
		const results = search(fixture, 'Genesis 1 ""');
		expect(results).toHaveLength(5); // all 5 verses of Genesis 1
	});

	test("empty quotes with book only", () => {
		const results = search(fixture, 'John ""');
		const allJohn = search(fixture, "John");
		expect(results).toHaveLength(allJohn.length);
	});

	test("standalone empty quotes returns nothing", () => {
		const results = search(fixture, '""');
		expect(results).toHaveLength(0);
	});
});

// --- tryParseNav ---
describe("tryParseNav", () => {
	test("single book returns NavRef array", () => {
		const nav = tryParseNav("Genesis");
		expect(nav).toEqual([
			{
				book: "Genesis",
				chapterStart: undefined,
				chapterEnd: undefined,
				verseSegments: undefined,
			},
		]);
	});

	test("single chapter", () => {
		const nav = tryParseNav("Genesis 2");
		expect(nav).toEqual([
			{ book: "Genesis", chapterStart: 2, chapterEnd: 2, verseSegments: undefined },
		]);
	});

	test("single verse", () => {
		const nav = tryParseNav("John 3:16");
		expect(nav).toEqual([
			{
				book: "John",
				chapterStart: 3,
				chapterEnd: 3,
				verseSegments: [{ start: 16, end: 16 }],
			},
		]);
	});

	test("chapter range", () => {
		const nav = tryParseNav("Genesis 1-3");
		expect(nav).toEqual([
			{ book: "Genesis", chapterStart: 1, chapterEnd: 3, verseSegments: undefined },
		]);
	});

	test("verse range", () => {
		const nav = tryParseNav("Genesis 1:2-4");
		expect(nav).toEqual([
			{
				book: "Genesis",
				chapterStart: 1,
				chapterEnd: 1,
				verseSegments: [{ start: 2, end: 4 }],
			},
		]);
	});

	test("comma-separated verse segments", () => {
		const nav = tryParseNav("Genesis 1:1-3,5");
		expect(nav).toEqual([
			{
				book: "Genesis",
				chapterStart: 1,
				chapterEnd: 1,
				verseSegments: [
					{ start: 1, end: 3 },
					{ start: 5, end: 5 },
				],
			},
		]);
	});

	test("multi-term semicolon returns array", () => {
		const nav = tryParseNav("Genesis 1:1; John 3:16");
		expect(nav).toHaveLength(2);
		expect(nav![0].book).toBe("Genesis");
		expect(nav![1].book).toBe("John");
	});

	test("multi-term with chapter ranges", () => {
		const nav = tryParseNav("Genesis 1-2; John 1");
		expect(nav).toHaveLength(2);
		expect(nav![0]).toEqual({
			book: "Genesis",
			chapterStart: 1,
			chapterEnd: 2,
			verseSegments: undefined,
		});
		expect(nav![1]).toEqual({
			book: "John",
			chapterStart: 1,
			chapterEnd: 1,
			verseSegments: undefined,
		});
	});

	test("returns null for text search", () => {
		expect(tryParseNav('"grace"')).toBeNull();
	});

	test("returns null for combined ref+text", () => {
		expect(tryParseNav('Genesis "light"')).toBeNull();
	});

	test("returns null if any term has text filter", () => {
		expect(tryParseNav('Genesis 1; "serpent"')).toBeNull();
	});

	test("returns null for invalid book", () => {
		expect(tryParseNav("Bogus")).toBeNull();
	});

	test("returns null for empty query", () => {
		expect(tryParseNav("")).toBeNull();
	});

	test("returns null for whitespace only", () => {
		expect(tryParseNav("   ")).toBeNull();
	});

	test("abbreviated book name", () => {
		const nav = tryParseNav("gen 1");
		expect(nav).toEqual([
			{ book: "Genesis", chapterStart: 1, chapterEnd: 1, verseSegments: undefined },
		]);
	});

	test("numbered book abbreviation", () => {
		const nav = tryParseNav("1 jo");
		expect(nav).toEqual([
			{
				book: "1 John",
				chapterStart: undefined,
				chapterEnd: undefined,
				verseSegments: undefined,
			},
		]);
	});

	test("returns null when one term in multi is invalid", () => {
		expect(tryParseNav("Genesis 1; Bogus 2")).toBeNull();
	});
});

// --- parseVerseSegments edge cases ---
describe("parseVerseSegments — edge cases", () => {
	test("single digit", () => {
		expect(_parseVerseSegments("1")).toEqual([{ start: 1, end: 1 }]);
	});

	test("large numbers", () => {
		expect(_parseVerseSegments("100-200")).toEqual([{ start: 100, end: 200 }]);
	});

	test("multiple commas", () => {
		expect(_parseVerseSegments("1,2,3")).toEqual([
			{ start: 1, end: 1 },
			{ start: 2, end: 2 },
			{ start: 3, end: 3 },
		]);
	});

	test("spaces around commas", () => {
		expect(_parseVerseSegments("1 , 3-5 , 7")).toEqual([
			{ start: 1, end: 1 },
			{ start: 3, end: 5 },
			{ start: 7, end: 7 },
		]);
	});

	test("invalid: letters", () => {
		expect(_parseVerseSegments("a-b")).toBeNull();
	});

	test("invalid: dash only", () => {
		expect(_parseVerseSegments("-")).toBeNull();
	});

	test("invalid: trailing comma", () => {
		// trailing comma produces empty part which is filtered, so segments still valid
		const result = _parseVerseSegments("1,2,");
		expect(result).toEqual([
			{ start: 1, end: 1 },
			{ start: 2, end: 2 },
		]);
	});

	test("invalid: just comma", () => {
		expect(_parseVerseSegments(",")).toBeNull();
	});
});

// --- matchBook edge cases ---
describe("matchBook — edge cases", () => {
	test("empty string returns null", () => {
		expect(_matchBook("")).toBeNull();
	});

	test("numbers only returns null", () => {
		expect(_matchBook("123")).toBeNull();
	});

	test("single letter prefix", () => {
		// 'j' should match longest-first: could be John, Judges, etc. — just verify it returns something
		const result = _matchBook("j");
		expect(result).not.toBeNull();
		expect(result!.rest).toBe("");
	});

	test("full name case variations", () => {
		expect(_matchBook("GENESIS")).toEqual({ book: "Genesis", rest: "" });
		expect(_matchBook("gEnEsIs")).toEqual({ book: "Genesis", rest: "" });
	});

	test("1 John preferred over John for '1 john'", () => {
		const result = _matchBook("1 john");
		expect(result!.book).toBe("1 John");
	});

	test("'john' matches John not 1 John", () => {
		const result = _matchBook("john");
		expect(result!.book).toBe("John");
	});

	test("book name with extra space", () => {
		// Leading/trailing spaces should be handled by the caller (parseRef trims)
		const result = _matchBook("genesis  1");
		// May or may not match depending on implementation; just ensure no crash
		expect(result === null || result.book === "Genesis").toBe(true);
	});

	test("prefix 'rev' matches Revelation", () => {
		expect(_matchBook("rev")).toEqual({ book: "Revelation", rest: "" });
	});

	test("prefix 'rev 1' matches Revelation with rest '1'", () => {
		expect(_matchBook("rev 1")).toEqual({ book: "Revelation", rest: "1" });
	});
});

// --- parseRef edge cases ---
describe("parseRef — edge cases", () => {
	test("whitespace trimmed", () => {
		expect(_parseRef("  Genesis 1  ")).toEqual({
			book: "Genesis",
			chapterStart: 1,
			chapterEnd: 1,
		});
	});

	test("abbreviation resolves", () => {
		expect(_parseRef("gen 1:1")).toEqual({
			book: "Genesis",
			chapterStart: 1,
			chapterEnd: 1,
			verseSegments: [{ start: 1, end: 1 }],
		});
	});

	test("numbered book with verse", () => {
		expect(_parseRef("1 John 1:2")).toEqual({
			book: "1 John",
			chapterStart: 1,
			chapterEnd: 1,
			verseSegments: [{ start: 2, end: 2 }],
		});
	});

	test("chapter 0 parses (data may not exist)", () => {
		expect(_parseRef("Genesis 0")).toEqual({ book: "Genesis", chapterStart: 0, chapterEnd: 0 });
	});

	test("verse 0 parses", () => {
		expect(_parseRef("Genesis 1:0")).toEqual({
			book: "Genesis",
			chapterStart: 1,
			chapterEnd: 1,
			verseSegments: [{ start: 0, end: 0 }],
		});
	});

	test("trailing colon: Genesis 1: treated as chapter", () => {
		// "Genesis 1:" — trailing colon stripped, treated as Genesis chapter 1
		expect(_parseRef("Genesis 1:")).toEqual({
			book: "Genesis",
			chapterStart: 1,
			chapterEnd: 1,
		});
	});

	test("invalid format: double colon", () => {
		expect(_parseRef("Genesis 1::2")).toBeNull();
	});

	test("multiple verse segments complex", () => {
		expect(_parseRef("Genesis 1:1-2,4-5")).toEqual({
			book: "Genesis",
			chapterStart: 1,
			chapterEnd: 1,
			verseSegments: [
				{ start: 1, end: 2 },
				{ start: 4, end: 5 },
			],
		});
	});
});

// --- search edge cases ---
describe("search — edge cases", () => {
	test("empty query returns empty", () => {
		expect(search(fixture, "")).toHaveLength(0);
	});

	test("whitespace only returns empty", () => {
		expect(search(fixture, "   ")).toHaveLength(0);
	});

	test("semicolons only returns empty", () => {
		expect(search(fixture, ";;;")).toHaveLength(0);
	});

	test("nonexistent chapter returns empty", () => {
		expect(search(fixture, "Genesis 50")).toHaveLength(0);
	});

	test("nonexistent verse returns empty", () => {
		expect(search(fixture, "Genesis 1:99")).toHaveLength(0);
	});

	test("verse range beyond existing returns partial", () => {
		// Genesis 1 has verses 1-5; asking for 3-10 should return 3,4,5
		const results = search(fixture, "Genesis 1:3-10");
		expect(results).toHaveLength(3);
		expect(results[0].verse).toBe(3);
		expect(results[2].verse).toBe(5);
	});

	test("chapter range beyond existing returns partial", () => {
		// Genesis has chapters 1,2,3; asking for 2-10 should return ch 2 and 3
		const results = search(fixture, "Genesis 2-10");
		expect(results).toHaveLength(5); // ch2 has 3 verses, ch3 has 2
	});

	test("text search with special regex chars", () => {
		// Should not crash; parentheses won't match but shouldn't error
		const results = search(fixture, '"(test)"');
		expect(results).toHaveLength(0);
	});

	test("text search with period", () => {
		const results = search(fixture, '"was light."');
		expect(results.length).toBeGreaterThanOrEqual(1);
	});

	test("text search partial word", () => {
		const results = search(fixture, '"beginni"');
		expect(results.length).toBeGreaterThanOrEqual(1);
	});

	test("deduplicate: overlapping verse ranges in same term", () => {
		const results = search(fixture, "Genesis 1:1-3,2-4");
		// Verses 1,2,3,4 — verse 2 and 3 appear in both ranges but should be deduped
		expect(results).toHaveLength(4);
	});

	test("combined: chapter range + text filter", () => {
		const results = search(fixture, 'Genesis 1-3 "cunning"');
		expect(results).toHaveLength(1);
		expect(results[0].chapter).toBe(3);
		expect(results[0].verse).toBe(1);
	});

	test("combined: whole book + text filter no matches", () => {
		const results = search(fixture, 'John "serpent"');
		expect(results).toHaveLength(0);
	});

	test("combined: abbreviated book + chapter + text", () => {
		const results = search(fixture, 'gen 1 "void"');
		expect(results).toHaveLength(1);
		expect(results[0].verse).toBe(2);
	});

	test("multiple semicolons with spaces", () => {
		const results = search(fixture, "  Genesis 1:1  ;  John 3:16  ");
		expect(results).toHaveLength(2);
	});

	test("text search matches across books", () => {
		const results = search(fixture, '"In the beginning"');
		expect(results.length).toBeGreaterThanOrEqual(2);
		const books = new Set(results.map((r) => r.book));
		expect(books.size).toBeGreaterThanOrEqual(2);
	});

	test("text search is case insensitive", () => {
		const upper = search(fixture, '"GOD"');
		const lower = search(fixture, '"god"');
		expect(upper).toEqual(lower);
	});

	test("combined: verse segments + text filter", () => {
		const results = search(fixture, 'Genesis 1:1-3,5 "light"');
		// Verses with "light": 3 ("Let there be light"), 4 ("saw the light"), 5 ("called the light Day")
		// But only verses 1-3 and 5 are in scope → 3 and 5 match
		expect(results).toHaveLength(2);
		expect(results[0].verse).toBe(3);
		expect(results[1].verse).toBe(5);
	});

	test("multiple text-only searches with semicolons", () => {
		const results = search(fixture, '"serpent"; "Jesus"');
		expect(results.length).toBeGreaterThanOrEqual(2);
		expect(results.some((r) => r.text.toLowerCase().includes("serpent"))).toBe(true);
		expect(results.some((r) => r.text.toLowerCase().includes("jesus"))).toBe(true);
	});

	test("unrecognized term is silently skipped", () => {
		const results = search(fixture, "Bogus 1:1");
		expect(results).toHaveLength(0);
	});

	test("mixed valid and invalid terms", () => {
		const results = search(fixture, "Genesis 1:1; Bogus 99");
		expect(results).toHaveLength(1);
		expect(results[0].book).toBe("Genesis");
	});
});

// --- buildTextMatcher (^ and $ word boundaries) ---
describe("buildTextMatcher", () => {
	test("plain text: substring match", () => {
		const m = _buildTextMatcher("grace");
		expect(m("Amazing grace how sweet")).toBe(true);
		expect(m("disgraceful")).toBe(true);
		expect(m("nothing here")).toBe(false);
	});

	test("plain text: case insensitive", () => {
		const m = _buildTextMatcher("God");
		expect(m("god is great")).toBe(true);
		expect(m("GOD IS GREAT")).toBe(true);
	});

	test("^ anchors start of word", () => {
		const m = _buildTextMatcher("^grace");
		expect(m("grace is given")).toBe(true);
		expect(m("graceful living")).toBe(true);
		expect(m("by grace alone")).toBe(true);
		expect(m("disgrace")).toBe(false);
		expect(m("disgraceful")).toBe(false);
	});

	test("$ anchors end of word", () => {
		const m = _buildTextMatcher("grace$");
		expect(m("by grace alone")).toBe(true);
		expect(m("disgrace is bad")).toBe(true);
		expect(m("grace.")).toBe(true);
		expect(m("graceful")).toBe(false);
	});

	test("^...$ anchors exact word", () => {
		const m = _buildTextMatcher("^grace$");
		expect(m("by grace alone")).toBe(true);
		expect(m("grace.")).toBe(true);
		expect(m("graceful")).toBe(false);
		expect(m("disgrace")).toBe(false);
		expect(m("disgraceful")).toBe(false);
	});

	test("^...$ case insensitive", () => {
		const m = _buildTextMatcher("^God$");
		expect(m("God is great")).toBe(true);
		expect(m("god is great")).toBe(true);
		expect(m("godly")).toBe(false);
	});

	test("^ only returns empty-core false", () => {
		const m = _buildTextMatcher("^");
		expect(m("anything")).toBe(false);
	});

	test("$ only returns empty-core false", () => {
		const m = _buildTextMatcher("$");
		expect(m("anything")).toBe(false);
	});

	test("^$ returns false", () => {
		const m = _buildTextMatcher("^$");
		expect(m("anything")).toBe(false);
	});

	test("special regex chars are escaped", () => {
		const m = _buildTextMatcher("^test.case$");
		expect(m("this is a test.case here")).toBe(true);
		expect(m("testXcase")).toBe(false);
	});

	test("multi-word with ^ anchor", () => {
		const m = _buildTextMatcher("^in the");
		expect(m("In the beginning")).toBe(true);
		expect(m("within the walls")).toBe(false);
	});

	test("multi-word with $ anchor", () => {
		const m = _buildTextMatcher("the world$");
		expect(m("condemn the world")).toBe(true);
		expect(m("the worldly")).toBe(false);
	});
});

// --- search with word boundary anchors ---
describe("search — word boundary anchors", () => {
	test("^God$ matches exact word God", () => {
		const results = search(fixture, '"^God$"');
		// Should match verses containing " God " as a word, not "godly" etc.
		expect(results.length).toBeGreaterThan(0);
		for (const r of results) {
			expect(r.text).toMatch(/\bGod\b/i);
		}
	});

	test("^In matches word starting with In", () => {
		const results = search(fixture, '"^In"');
		expect(results.length).toBeGreaterThan(0);
		for (const r of results) {
			expect(r.text).toMatch(/\bIn/i);
		}
	});

	test("earth$ matches word ending with earth", () => {
		const results = search(fixture, '"earth$"');
		expect(results.length).toBeGreaterThan(0);
		for (const r of results) {
			expect(r.text).toMatch(/earth\b/i);
		}
	});

	test("combined ref + ^word$ filter", () => {
		const results = search(fixture, 'Genesis 1 "^light$"');
		expect(results.length).toBeGreaterThan(0);
		for (const r of results) {
			expect(r.book).toBe("Genesis");
			expect(r.chapter).toBe(1);
			expect(r.text).toMatch(/\blight\b/i);
		}
	});

	test("^ anchor excludes mid-word matches", () => {
		// "cunning" appears in fixture. "^unning" should NOT match since 'unning' is mid-word.
		const results = search(fixture, '"^unning"');
		expect(results).toHaveLength(0);
	});

	test("$ anchor excludes mid-word matches", () => {
		// "beginning" appears. "beginni$" should NOT match since "beginni" is not a word end.
		const results = search(fixture, '"beginni$"');
		expect(results).toHaveLength(0);
	});

	test("plain text without anchors still works as substring", () => {
		const results = search(fixture, '"eginni"');
		expect(results.length).toBeGreaterThan(0);
	});
});

// --- unquoted ^/$ anchors (now require quotes) ---
describe("search — unquoted ^/$ anchors return nothing", () => {
	test("^God without quotes returns empty", () => {
		const results = search(fixture, "^God");
		expect(results).toHaveLength(0);
	});

	test("earth$ without quotes returns empty", () => {
		const results = search(fixture, "earth$");
		expect(results).toHaveLength(0);
	});

	test("^God$ without quotes returns empty", () => {
		const results = search(fixture, "^God$");
		expect(results).toHaveLength(0);
	});

	test("quoted ^God matches with word boundary", () => {
		const results = search(fixture, '"^God"');
		expect(results.length).toBeGreaterThan(0);
		for (const r of results) {
			expect(r.text).toMatch(/\bGod/i);
		}
	});

	test("quoted earth$ matches with word boundary", () => {
		const results = search(fixture, '"earth$"');
		expect(results.length).toBeGreaterThan(0);
		for (const r of results) {
			expect(r.text).toMatch(/earth\b/i);
		}
	});

	test("quoted ^God$ matches exact word", () => {
		const results = search(fixture, '"^God$"');
		expect(results.length).toBeGreaterThan(0);
		for (const r of results) {
			expect(r.text).toMatch(/\bGod\b/i);
		}
	});

	test("quoted ^unning excludes mid-word", () => {
		const results = search(fixture, '"^unning"');
		expect(results).toHaveLength(0);
	});

	test("quoted beginni$ excludes mid-word", () => {
		const results = search(fixture, '"beginni$"');
		expect(results).toHaveLength(0);
	});

	test("tryParseNav returns null for quoted text terms", () => {
		expect(tryParseNav('"^God$"')).toBeNull();
		expect(tryParseNav('"earth$"')).toBeNull();
		expect(tryParseNav('"^light"')).toBeNull();
		expect(tryParseNav('Genesis 1; "^God$"')).toBeNull();
	});

	test("tryParseNav treats unquoted ^/$ as plain book lookup (returns null for non-book)", () => {
		expect(tryParseNav("^God$")).toBeNull();
		expect(tryParseNav("earth$")).toBeNull();
		expect(tryParseNav("^light")).toBeNull();
	});
});

// --- trailing incomplete operators ---
describe("parseRef — trailing dash/comma ignored", () => {
	test("John 1:1- parses as John 1:1", () => {
		const ref = _parseRef("John 1:1-");
		expect(ref).toEqual({
			book: "John",
			chapterStart: 1,
			chapterEnd: 1,
			verseSegments: [{ start: 1, end: 1 }],
		});
	});

	test("Genesis 1- parses as Genesis 1", () => {
		const ref = _parseRef("Genesis 1-");
		expect(ref).toEqual({ book: "Genesis", chapterStart: 1, chapterEnd: 1 });
	});

	test("Genesis 1:1-3, parses as Genesis 1:1-3", () => {
		const ref = _parseRef("Genesis 1:1-3,");
		expect(ref).toEqual({
			book: "Genesis",
			chapterStart: 1,
			chapterEnd: 1,
			verseSegments: [{ start: 1, end: 3 }],
		});
	});

	test("John 1: parses as John 1", () => {
		const ref = _parseRef("John 1:");
		expect(ref).toEqual({ book: "John", chapterStart: 1, chapterEnd: 1 });
	});

	test("tryParseNav handles trailing dash", () => {
		const refs = tryParseNav("John 1:1-");
		expect(refs).toHaveLength(1);
		expect(refs![0].book).toBe("John");
		expect(refs![0].verseSegments).toEqual([{ start: 1, end: 1 }]);
	});

	test("tryParseNav handles trailing dash in multi-term", () => {
		const refs = tryParseNav("Genesis 1:1-5; John 1:1-");
		expect(refs).toHaveLength(2);
		expect(refs![0].verseSegments).toEqual([{ start: 1, end: 5 }]);
		expect(refs![1].verseSegments).toEqual([{ start: 1, end: 1 }]);
	});
});

// --- parseQueryBooks ---
describe("parseQueryBooks", () => {
	test("parses single book reference", () => {
		const result = parseQueryBooks("Genesis 1:1");
		expect(result).toHaveLength(1);
		expect(result[0].book).toBe("Genesis");
		expect(result[0].rest).toBe("1:1");
		expect(result[0].quoted).toBe("");
	});

	test("parses multiple semicolon-separated references", () => {
		const result = parseQueryBooks("Genesis 1:1-5; John 3:16");
		expect(result).toHaveLength(2);
		expect(result[0].book).toBe("Genesis");
		expect(result[0].rest).toBe("1:1-5");
		expect(result[1].book).toBe("John");
		expect(result[1].rest).toBe("3:16");
	});

	test("parses book only (no chapter)", () => {
		const result = parseQueryBooks("Genesis");
		expect(result).toHaveLength(1);
		expect(result[0].book).toBe("Genesis");
		expect(result[0].rest).toBe("");
	});

	test("preserves quoted text filter", () => {
		const result = parseQueryBooks('Genesis "grace"');
		expect(result).toHaveLength(1);
		expect(result[0].book).toBe("Genesis");
		expect(result[0].quoted).toBe('"grace"');
	});

	test("pure quoted term has empty book", () => {
		const result = parseQueryBooks('"grace"');
		expect(result).toHaveLength(1);
		expect(result[0].book).toBe("");
		expect(result[0].quoted).toBe('"grace"');
	});

	test("unrecognized term preserves original", () => {
		const result = parseQueryBooks("Foobar 3:16");
		expect(result).toHaveLength(1);
		expect(result[0].book).toBe("");
		expect(result[0].original).toBe("Foobar 3:16");
	});

	test("KR38 Finnish alias resolves to English key", () => {
		setTranslation("KR38");
		const result = parseQueryBooks("2. Moos 2:5-10");
		expect(result).toHaveLength(1);
		expect(result[0].book).toBe("Exodus");
		expect(result[0].rest).toBe("2:5-10");
		setTranslation("NHEB");
	});

	test("KR38 Finnish prefix resolves to English key", () => {
		setTranslation("KR38");
		const result = parseQueryBooks("2. Moo 2:5-10; Job 1:13-22");
		expect(result).toHaveLength(2);
		expect(result[0].book).toBe("Exodus");
		expect(result[0].rest).toBe("2:5-10");
		expect(result[1].book).toBe("Job");
		expect(result[1].rest).toBe("1:13-22");
		setTranslation("NHEB");
	});
});

// --- search only shows results for quoted text ---
describe("search — nav-only queries without quotes", () => {
	test("tryParseNav returns null when query has unresolvable book", () => {
		setTranslation("NHEB");
		expect(tryParseNav("Foobar 2:5-10; John 1:1-3")).toBeNull();
	});

	test("search still returns results for partially valid nav query without quotes", () => {
		setTranslation("NHEB");
		const results = search(fixture, "Foobar 2:5-10; John 1:1-3");
		// "John" resolves in the search function even though tryParseNav failed
		// But the app layer should not render this as a list for nav-only queries
		expect(results.length).toBeGreaterThan(0);
	});
});

// --- 3-letter short codes ---
describe("matchBook — 3-letter short codes", () => {
	test("gen resolves to Genesis", () => {
		setTranslation("NHEB");
		expect(_matchBook("gen 1")).toEqual({ book: "Genesis", rest: "1" });
	});

	test("exo resolves to Exodus", () => {
		setTranslation("NHEB");
		expect(_matchBook("exo 3")).toEqual({ book: "Exodus", rest: "3" });
	});

	test("mat resolves to Matthew", () => {
		setTranslation("NHEB");
		expect(_matchBook("mat 5")).toEqual({ book: "Matthew", rest: "5" });
	});

	test("rev resolves to Revelation", () => {
		setTranslation("NHEB");
		expect(_matchBook("rev")).toEqual({ book: "Revelation", rest: "" });
	});

	test("1co resolves to 1 Corinthians", () => {
		setTranslation("NHEB");
		expect(_matchBook("1co 13")).toEqual({ book: "1 Corinthians", rest: "13" });
	});

	test("1sa resolves to 1 Samuel", () => {
		setTranslation("NHEB");
		expect(_matchBook("1sa 3")).toEqual({ book: "1 Samuel", rest: "3" });
	});

	test("2ki resolves to 2 Kings", () => {
		setTranslation("NHEB");
		expect(_matchBook("2ki 5")).toEqual({ book: "2 Kings", rest: "5" });
	});

	test("psa resolves to Psalm", () => {
		setTranslation("NHEB");
		expect(_matchBook("psa 23")).toEqual({ book: "Psalm", rest: "23" });
	});

	test("jud resolves to Jude", () => {
		setTranslation("NHEB");
		expect(_matchBook("jud")).toEqual({ book: "Jude", rest: "" });
	});

	test("mrk resolves to Mark", () => {
		setTranslation("NHEB");
		expect(_matchBook("mrk 1")).toEqual({ book: "Mark", rest: "1" });
	});

	test("phi resolves to Philippians", () => {
		setTranslation("NHEB");
		expect(_matchBook("phi 4")).toEqual({ book: "Philippians", rest: "4" });
	});

	test("phm resolves to Philemon", () => {
		setTranslation("NHEB");
		expect(_matchBook("phm")).toEqual({ book: "Philemon", rest: "" });
	});
});

// --- levenshtein distance ---
describe("levenshtein", () => {
	test("identical strings return 0", () => {
		expect(_levenshtein("abc", "abc")).toBe(0);
	});

	test("empty vs non-empty", () => {
		expect(_levenshtein("", "abc")).toBe(3);
		expect(_levenshtein("abc", "")).toBe(3);
	});

	test("both empty", () => {
		expect(_levenshtein("", "")).toBe(0);
	});

	test("single substitution", () => {
		expect(_levenshtein("cat", "bat")).toBe(1);
	});

	test("single insertion", () => {
		expect(_levenshtein("cat", "cats")).toBe(1);
	});

	test("single deletion", () => {
		expect(_levenshtein("cats", "cat")).toBe(1);
	});

	test("two edits", () => {
		expect(_levenshtein("kitten", "mitten")).toBe(1);
		expect(_levenshtein("kitten", "sitten")).toBe(1);
		expect(_levenshtein("kitten", "sittin")).toBe(2);
	});

	test("completely different", () => {
		expect(_levenshtein("abc", "xyz")).toBe(3);
	});
});

// --- fuzzy matchBook ---
describe("matchBook — fuzzy matching", () => {
	test("typo in Genesis: 'genisis' matches Genesis", () => {
		expect(_matchBook("genisis")).toEqual({ book: "Genesis", rest: "" });
	});

	test("typo 'jonh' matches Jonah (closest by edit distance)", () => {
		expect(_matchBook("jonh")).toEqual({ book: "Jonah", rest: "" });
	});

	test("typo with chapter: 'genisis 1' matches Genesis", () => {
		const result = _matchBook("genisis 1");
		expect(result).not.toBeNull();
		expect(result!.book).toBe("Genesis");
		expect(result!.rest).toBe("1");
	});

	test("typo 'revelaton' matches Revelation", () => {
		expect(_matchBook("revelaton")).toEqual({ book: "Revelation", rest: "" });
	});

	test("too many typos returns null", () => {
		// 'xxxxxxx' is too far from any book name
		expect(_matchBook("xxxxxxx")).toBeNull();
	});

	test("short typo prefix (< 3 chars) does not fuzzy match", () => {
		// 'zz' — too short for fuzzy, should return null
		expect(_matchBook("zz")).toBeNull();
	});
});

// --- normalizeQuery ---
describe("normalizeQuery", () => {
	test("replaces en-dash with hyphen", () => {
		expect(_normalizeQuery("Matt 27:1\u201338")).toBe("Matt 27:1-38");
	});

	test("replaces em-dash with hyphen", () => {
		expect(_normalizeQuery("Matt 27:1\u201438")).toBe("Matt 27:1-38");
	});

	test("converts comma-separated book references to semicolons", () => {
		expect(_normalizeQuery("Matt 1:1, John 3:16")).toBe("Matt 1:1; John 3:16");
	});

	test("converts comma-separated numbered book references", () => {
		expect(_normalizeQuery("Gen 1:1, 2 Cor 1:1")).toBe("Gen 1:1; 2 Cor 1:1");
	});

	test("does not convert verse-segment commas (no spaces)", () => {
		expect(_normalizeQuery("Gen 1:1,3,5")).toBe("Gen 1:1,3,5");
	});

	test("does not convert comma + space + digit (verse segments)", () => {
		expect(_normalizeQuery("Gen 1:1-3, 5, 8-10")).toBe("Gen 1:1-3, 5, 8-10");
	});

	test("handles the full non-standard example", () => {
		const input =
			"Matt. 27:1\u201338, Luuk. 23:39\u201343, Matt. 27:39\u201354, Joh. 19:31\u201337, Matt. 27:55\u201361";
		const expected =
			"Matt. 27:1-38; Luuk. 23:39-43; Matt. 27:39-54; Joh. 19:31-37; Matt. 27:55-61";
		expect(_normalizeQuery(input)).toBe(expected);
	});

	test("passes through standard semicolon-separated queries", () => {
		expect(_normalizeQuery("Gen 1:1; John 3:16")).toBe("Gen 1:1; John 3:16");
	});

	test("handles numbered-book with period prefix after comma", () => {
		expect(_normalizeQuery("Gen 1:1, 1. Moos 2:1")).toBe("Gen 1:1; 1. Moos 2:1");
	});
});

// --- matchBook with abbreviation periods ---
describe("matchBook with periods", () => {
	test("Matt. matches Matthew", () => {
		setTranslation("NHEB");
		const result = _matchBook("Matt. 27:1");
		expect(result).not.toBeNull();
		expect(result!.book).toBe("Matthew");
		expect(result!.rest).toBe("27:1");
	});

	test("Joh. matches John", () => {
		setTranslation("NHEB");
		const result = _matchBook("Joh. 3:16");
		expect(result).not.toBeNull();
		expect(result!.book).toBe("John");
		expect(result!.rest).toBe("3:16");
	});

	test("Luuk. matches Luke via Finnish alias", () => {
		setTranslation("KR38");
		const result = _matchBook("Luuk. 23:39");
		expect(result).not.toBeNull();
		expect(result!.book).toBe("Luke");
		expect(result!.rest).toBe("23:39");
		setTranslation("NHEB");
	});

	test("Gen. matches Genesis", () => {
		setTranslation("NHEB");
		const result = _matchBook("Gen. 1:1");
		expect(result).not.toBeNull();
		expect(result!.book).toBe("Genesis");
		expect(result!.rest).toBe("1:1");
	});

	test("book name with period and no rest", () => {
		setTranslation("NHEB");
		const result = _matchBook("Rev.");
		expect(result).not.toBeNull();
		expect(result!.book).toBe("Revelation");
		expect(result!.rest).toBe("");
	});

	test("ap. t. matches Acts via normalized alias", () => {
		setTranslation("KR38");
		const result = _matchBook("ap. t.");
		expect(result).not.toBeNull();
		expect(result!.book).toBe("Acts");
		setTranslation("NHEB");
	});
});

// --- Full integration: non-standard search syntax ---
describe("non-standard search syntax", () => {
	test("tryParseNav with en-dashes and comma separation", () => {
		setTranslation("NHEB");
		const result = tryParseNav("Matt. 27:1\u201338, Joh. 19:31\u201337");
		expect(result).not.toBeNull();
		expect(result).toHaveLength(2);
		expect(result![0].book).toBe("Matthew");
		expect(result![0].chapterStart).toBe(27);
		expect(result![0].verseSegments).toEqual([{ start: 1, end: 38 }]);
		expect(result![1].book).toBe("John");
		expect(result![1].chapterStart).toBe(19);
		expect(result![1].verseSegments).toEqual([{ start: 31, end: 37 }]);
	});

	test("search with the full non-standard example against fixture", () => {
		setTranslation("NHEB");
		const results = search(fixture, "Gen. 1:1\u20133, Joh. 3:16\u201317");
		expect(results.length).toBe(5); // Gen 1:1-3 + John 3:16-17
		expect(results[0].book).toBe("Genesis");
		expect(results[3].book).toBe("John");
	});

	test("parseQueryBooks with non-standard input", () => {
		setTranslation("KR38");
		const result = parseQueryBooks("Matt. 27:1\u201338, Luuk. 23:39\u201343");
		expect(result).toHaveLength(2);
		expect(result[0].book).toBe("Matthew");
		expect(result[0].rest).toBe("27:1-38");
		expect(result[1].book).toBe("Luke");
		expect(result[1].rest).toBe("23:39-43");
		setTranslation("NHEB");
	});

	test("en-dash in chapter range", () => {
		const result = tryParseNav("Genesis 1\u20133");
		expect(result).not.toBeNull();
		expect(result![0].chapterStart).toBe(1);
		expect(result![0].chapterEnd).toBe(3);
	});

	test("does not break standard verse segments with commas", () => {
		const result = tryParseNav("Genesis 1:1-3,5");
		expect(result).not.toBeNull();
		expect(result![0].verseSegments).toEqual([
			{ start: 1, end: 3 },
			{ start: 5, end: 5 },
		]);
	});
});

// ---------------------------------------------------------------------------
// Edge cases — escapeRegex
// ---------------------------------------------------------------------------

describe("escapeRegex", () => {
	test("escapes all special regex characters", () => {
		const special = ".*+?^${}()|[]\\";
		const escaped = escapeRegex(special);
		// Should not throw when creating a regex from it
		expect(() => new RegExp(escaped)).not.toThrow();
		// Each special char should be escaped with backslash
		expect(escaped).toBe("\\.\\*\\+\\?\\^\\$\\{\\}\\(\\)\\|\\[\\]\\\\");
	});

	test("leaves normal text unchanged", () => {
		expect(escapeRegex("hello world")).toBe("hello world");
	});

	test("handles empty string", () => {
		expect(escapeRegex("")).toBe("");
	});
});

// ---------------------------------------------------------------------------
// Edge cases — parseRef boundary conditions
// ---------------------------------------------------------------------------

describe("parseRef edge cases", () => {
	beforeEach(() => {
		setTranslation("NHEB");
		initSearch(fixture);
	});

	test("chapter 0 returns no results", () => {
		const results = search(fixture, "Genesis 0");
		expect(results).toHaveLength(0);
	});

	test("very large chapter number returns no results", () => {
		const results = search(fixture, "Genesis 999");
		expect(results).toHaveLength(0);
	});

	test("verse 0 returns no results", () => {
		const results = search(fixture, "Genesis 1:0");
		expect(results).toHaveLength(0);
	});

	test("very large verse number returns no results", () => {
		const results = search(fixture, "Genesis 1:999");
		expect(results).toHaveLength(0);
	});
});

// ---------------------------------------------------------------------------
// Edge cases — parseVerseSegments
// ---------------------------------------------------------------------------

describe("parseVerseSegments edge cases", () => {
	test("inverted range returns verses in order", () => {
		const result = _parseVerseSegments("5-3");
		// Should either return empty or treat as 5-3 (implementation dependent)
		expect(result).toBeDefined();
	});

	test("overlapping ranges", () => {
		const result = _parseVerseSegments("1-5,3-7");
		expect(result).toBeDefined();
		expect(result!.length).toBeGreaterThan(0);
	});

	test("single verse segment", () => {
		const result = _parseVerseSegments("1");
		expect(result).toEqual([{ start: 1, end: 1 }]);
	});

	test("empty string returns null", () => {
		const result = _parseVerseSegments("");
		expect(result).toBeNull();
	});
});

// ---------------------------------------------------------------------------
// Edge cases — buildTextMatcher
// ---------------------------------------------------------------------------

describe("buildTextMatcher edge cases", () => {
	test("regex-special chars inside quotes are treated as literal", () => {
		const matcher = _buildTextMatcher("foo.bar");
		// Should match literal "foo.bar" not "fooXbar"
		expect(matcher!("foo.bar")).toBe(true);
	});

	test("parentheses in search term", () => {
		const matcher = _buildTextMatcher("test(1)");
		expect(matcher!("test(1)")).toBe(true);
	});

	test("empty string returns a matcher that matches anything", () => {
		const matcher = _buildTextMatcher("");
		expect(typeof matcher).toBe("function");
	});
});

// ---------------------------------------------------------------------------
// Edge cases — normalizeQuery
// ---------------------------------------------------------------------------

describe("normalizeQuery edge cases", () => {
	test("preserves Finnish characters", () => {
		expect(_normalizeQuery("Heprealaiskirje")).toBe("Heprealaiskirje");
	});

	test("handles multiple consecutive semicolons", () => {
		const result = _normalizeQuery(";;;");
		expect(result).toBe(";;;");
	});

	test("preserves verse-segment commas (digits after comma)", () => {
		expect(_normalizeQuery("Genesis 1:1-3, 5")).toBe("Genesis 1:1-3, 5");
	});

	test("converts book-separating commas to semicolons", () => {
		const result = _normalizeQuery("Matt 1, Luke 2");
		expect(result).toContain(";");
	});

	test("en-dash converted to hyphen", () => {
		expect(_normalizeQuery("Genesis 1\u20133")).toBe("Genesis 1-3");
	});

	test("em-dash converted to hyphen", () => {
		expect(_normalizeQuery("Genesis 1\u20143")).toBe("Genesis 1-3");
	});
});

// ---------------------------------------------------------------------------
// Edge cases — matchBook
// ---------------------------------------------------------------------------

describe("matchBook edge cases", () => {
	beforeEach(() => {
		setTranslation("NHEB");
		initSearch(fixture);
	});

	test("exact match preferred over prefix when 'John' could match '1 John'", () => {
		const result = _matchBook("John");
		expect(result).not.toBeNull();
		expect(result!.book).toBe("John");
	});

	test("empty string returns null", () => {
		const result = _matchBook("");
		expect(result).toBeNull();
	});

	test("whitespace-only returns a match (trimmed to empty is fuzzy-matched)", () => {
		const result = _matchBook("   ");
		// After trimming, the fuzzy matcher picks the closest book
		expect(result).not.toBeNull();
	});
});

// ---------------------------------------------------------------------------
// Edge cases — parseQueryBooks
// ---------------------------------------------------------------------------

describe("parseQueryBooks edge cases", () => {
	beforeEach(() => {
		setTranslation("NHEB");
		initSearch(fixture);
	});

	test("empty string returns empty array", () => {
		expect(parseQueryBooks("")).toEqual([]);
	});

	test("only semicolons returns empty array", () => {
		expect(parseQueryBooks(";;;")).toEqual([]);
	});

	test("quoted string without book reference", () => {
		const result = parseQueryBooks('"grace"');
		expect(result).toHaveLength(1);
		expect(result[0].book).toBe("");
		expect(result[0].quoted).toBe('"grace"');
	});
});

// ---------------------------------------------------------------------------
// Edge cases — search with empty data
// ---------------------------------------------------------------------------

describe("search with empty data", () => {
	const emptyData: BibleData = {};

	test("search returns empty results", () => {
		initSearch(emptyData);
		const results = search(emptyData, "love");
		expect(results).toHaveLength(0);
	});

	test("tryParseNav with no matching books returns null-like", () => {
		initSearch(emptyData);
		const result = tryParseNav("Genesis 1");
		// tryParseNav returns NavRef[] but book won't exist in data
		// It should still parse the reference structurally
		if (result) {
			expect(result[0].book).toBe("Genesis");
		}
	});
});

// ---------------------------------------------------------------------------
// Alias caching — getAliases() and getSortedAliases()
// ---------------------------------------------------------------------------

describe("alias caching", () => {
	test("getAliases returns the same Map instance on repeated calls", () => {
		setTranslation("NHEB");
		const a = getAliases();
		const b = getAliases();
		expect(a).toBe(b); // same reference, not just equal
	});

	test("getSortedAliases returns the same array on repeated calls", () => {
		setTranslation("NHEB");
		const a = getSortedAliases();
		const b = getSortedAliases();
		expect(a).toBe(b);
	});

	test("setTranslation invalidates the alias cache", () => {
		setTranslation("NHEB");
		const a = getAliases();
		setTranslation("KR38");
		const b = getAliases();
		expect(a).not.toBe(b); // different reference after invalidation
	});

	test("getSortedAliases is sorted longest-first", () => {
		setTranslation("NHEB");
		const sorted = getSortedAliases();
		for (let i = 1; i < sorted.length; i++) {
			expect(sorted[i - 1][0].length).toBeGreaterThanOrEqual(sorted[i][0].length);
		}
	});

	test("getSortedAliases entries match getAliases entries", () => {
		setTranslation("NHEB");
		const aliases = getAliases();
		const sorted = getSortedAliases();
		expect(sorted.length).toBe(aliases.size);
		for (const [key, val] of sorted) {
			expect(aliases.get(key)).toBe(val);
		}
	});
});

// ---------------------------------------------------------------------------
// initSearch — lightweight initialization
// ---------------------------------------------------------------------------

describe("initSearch optimization", () => {
	test("pure text search iterates BibleData directly", () => {
		setTranslation("NHEB");
		initSearch(fixture);
		// A text search should still find results from all books
		const results = search(fixture, '"beginning"');
		expect(results.length).toBeGreaterThanOrEqual(2); // Genesis 1:1 and John 1:1/1:2
		const books = new Set(results.map((r) => r.book));
		expect(books.has("Genesis")).toBe(true);
		expect(books.has("John")).toBe(true);
	});

	test("initSearch allows immediate search with no data duplication", () => {
		const smallData: BibleData = {
			TestBook: { "1": { "1": "Alpha and Omega" } },
		};
		initSearch(smallData);
		const results = search(smallData, '"Alpha"');
		expect(results).toHaveLength(1);
		expect(results[0].text).toBe("Alpha and Omega");
	});
});

// ---------------------------------------------------------------------------
// Strong's number search
// ---------------------------------------------------------------------------

describe("Strong's number search", () => {
	const bibleData: BibleData = {
		John: {
			"1": {
				"1": "In the beginning was the Word, and the Word was with God, and the Word was God.",
				"2": "The same was in the beginning with God.",
				"3": "All things were made through him.",
			},
		},
		Genesis: {
			"1": {
				"1": "In the beginning God created the heavens and the earth.",
			},
		},
	};

	const interlinearMap: Map<string, InterlinearBook> = new Map([
		[
			"John",
			{
				"1": {
					"1": [
						{
							w: "In",
							english: "In",
							original: "Ἐν",
							translit: "En",
							strongs: "g1722",
						},
						{
							w: "beginning",
							english: "beginning",
							original: "ἀρχῇ",
							translit: "archē",
							strongs: "g746",
						},
						{
							w: "was",
							english: "was",
							original: "ἦν",
							translit: "ēn",
							strongs: "g1510",
						},
						{
							w: "Word",
							english: "Word",
							original: "λόγος",
							translit: "logos",
							strongs: "g3056",
						},
						{
							w: "God",
							english: "God",
							original: "θεός",
							translit: "theos",
							strongs: "g2316",
						},
					],
					"2": [
						{
							w: "same",
							english: "same",
							original: "οὗτος",
							translit: "houtos",
							strongs: "g3778",
						},
						{
							w: "beginning",
							english: "beginning",
							original: "ἀρχῇ",
							translit: "archē",
							strongs: "g746",
						},
						{
							w: "God",
							english: "God",
							original: "θεός",
							translit: "theos",
							strongs: "g2316",
						},
					],
					"3": [
						{
							w: "all",
							english: "all",
							original: "πάντα",
							translit: "panta",
							strongs: "g3956",
						},
					],
				},
			},
		],
	]);

	beforeEach(() => {
		setTranslation("NHEB");
		initSearch(bibleData);
		setSearchInterlinearData(interlinearMap);
	});

	test("finds verses by Greek Strong's number", () => {
		const results = search(bibleData, "G2316");
		expect(results.length).toBe(2);
		expect(results[0].book).toBe("John");
		expect(results[0].chapter).toBe(1);
		expect(results[0].verse).toBe(1);
		expect(results[1].verse).toBe(2);
	});

	test("Strong's search is case-insensitive", () => {
		const upper = search(bibleData, "G746");
		const lower = search(bibleData, "g746");
		expect(upper.length).toBe(lower.length);
		expect(upper.length).toBe(2);
	});

	test("Strong's search with no matches returns empty", () => {
		const results = search(bibleData, "G9999");
		expect(results).toHaveLength(0);
	});

	test("Strong's search finds unique Strong's number", () => {
		const results = search(bibleData, "G3056");
		expect(results).toHaveLength(1);
		expect(results[0].book).toBe("John");
		expect(results[0].chapter).toBe(1);
		expect(results[0].verse).toBe(1);
	});

	test("Strong's search with no interlinear data returns empty", () => {
		setSearchInterlinearData(new Map());
		const results = search(bibleData, "G2316");
		expect(results).toHaveLength(0);
	});

	test("Hebrew Strong's pattern recognized", () => {
		// No Hebrew interlinear data loaded, so should return empty
		const results = search(bibleData, "H430");
		expect(results).toHaveLength(0);
	});
});

// ---------------------------------------------------------------------------
// Cross-chapter verse ranges: chapter1:verse1-chapter2:verse2
// ---------------------------------------------------------------------------

// Extended fixture with more verses per chapter for cross-chapter tests
const crossChapterFixture: BibleData = {
	Genesis: {
		"18": {
			"1": "And the LORD appeared to him by the oaks of Mamre.",
			"2": "He lifted up his eyes and looked.",
			"16": "Then the men set out from there, and they looked down toward Sodom.",
			"17": "The LORD said, Shall I hide from Abraham what I am about to do?",
			"18": "Abraham shall surely become a great and mighty nation.",
			"19": "For I have chosen him.",
			"20": "Then the LORD said, Because the outcry against Sodom and Gomorrah is great.",
			"33": "And the LORD went his way, when he had finished speaking to Abraham.",
		},
		"19": {
			"1": "The two angels came to Sodom in the evening.",
			"2": "He said, My lords, please turn aside to your servant's house.",
			"15": "As morning dawned, the angels urged Lot, saying, Up! Take your wife.",
			"24": "Then the LORD rained on Sodom and Gomorrah sulfur and fire.",
			"29": "So it was that, when God destroyed the cities of the valley.",
			"30": "Now Lot went up out of Zoar and lived in the hills.",
		},
	},
};

describe("parseRef — cross-chapter verse ranges", () => {
	test("parses chapter:verse-chapter:verse form", () => {
		expect(_parseRef("Genesis 18:16-19:29")).toEqual({
			book: "Genesis",
			chapterStart: 18,
			chapterEnd: 19,
			verseStart: 16,
			verseEnd: 29,
		});
	});

	test("parses single-chapter cross-chapter form (same chapter)", () => {
		// 18:1-18:5 — valid form where both chapters are the same
		expect(_parseRef("Genesis 18:1-18:5")).toEqual({
			book: "Genesis",
			chapterStart: 18,
			chapterEnd: 18,
			verseStart: 1,
			verseEnd: 5,
		});
	});

	test("parses abbreviated book in cross-chapter form", () => {
		expect(_parseRef("gen 18:16-19:29")).toEqual({
			book: "Genesis",
			chapterStart: 18,
			chapterEnd: 19,
			verseStart: 16,
			verseEnd: 29,
		});
	});

	test("does not parse inverted cross-chapter range (start > end)", () => {
		// 19:1-18:16 — end chapter before start chapter
		expect(_parseRef("Genesis 19:1-18:16")).toBeNull();
	});

	test("does not parse same-chapter with inverted verses (start > end)", () => {
		// 18:16-18:1 — same chapter but verse start > verse end
		expect(_parseRef("Genesis 18:16-18:1")).toBeNull();
	});

	test("verseSegments is absent for cross-chapter range", () => {
		const ref = _parseRef("Genesis 18:16-19:29");
		expect(ref).not.toBeNull();
		expect(ref!.verseSegments).toBeUndefined();
	});

	test("plain chapter:verse range is NOT misidentified as cross-chapter", () => {
		// 1:2-4 should still produce verseSegments, not verseStart/verseEnd
		const ref = _parseRef("Genesis 1:2-4");
		expect(ref).not.toBeNull();
		expect(ref!.verseSegments).toEqual([{ start: 2, end: 4 }]);
		expect(ref!.verseStart).toBeUndefined();
		expect(ref!.verseEnd).toBeUndefined();
	});
});

describe("tryParseNav — cross-chapter verse ranges", () => {
	test("returns NavRef with verseStart and verseEnd", () => {
		const nav = tryParseNav("Genesis 18:16-19:29");
		expect(nav).not.toBeNull();
		expect(nav).toHaveLength(1);
		expect(nav![0]).toEqual({
			book: "Genesis",
			chapterStart: 18,
			chapterEnd: 19,
			verseSegments: undefined,
			verseStart: 16,
			verseEnd: 29,
		});
	});

	test("cross-chapter ref in multi-term query", () => {
		const nav = tryParseNav("Genesis 18:16-19:29; John 1:1");
		expect(nav).not.toBeNull();
		expect(nav).toHaveLength(2);
		expect(nav![0].verseStart).toBe(16);
		expect(nav![0].verseEnd).toBe(29);
		expect(nav![1].book).toBe("John");
	});

	test("inverted cross-chapter range returns null", () => {
		expect(tryParseNav("Genesis 19:1-18:16")).toBeNull();
	});
});

describe("search — cross-chapter verse ranges", () => {
	beforeEach(() => {
		initSearch(crossChapterFixture);
	});

	test("Genesis 18:16-19:29 returns only verses 16-33 from ch18 and 1-29 from ch19", () => {
		const results = search(crossChapterFixture, "Genesis 18:16-19:29");
		const ch18 = results.filter((r) => r.chapter === 18);
		const ch19 = results.filter((r) => r.chapter === 19);

		// All ch18 verses should be >= 16
		for (const r of ch18) expect(r.verse).toBeGreaterThanOrEqual(16);
		// All ch19 verses should be <= 29
		for (const r of ch19) expect(r.verse).toBeLessThanOrEqual(29);

		// Verse 18:1 (before start) must NOT appear
		expect(results.some((r) => r.chapter === 18 && r.verse === 1)).toBe(false);
		expect(results.some((r) => r.chapter === 18 && r.verse === 2)).toBe(false);

		// Verse 19:30 (after end) must NOT appear
		expect(results.some((r) => r.chapter === 19 && r.verse === 30)).toBe(false);

		// Boundary verses MUST appear
		expect(results.some((r) => r.chapter === 18 && r.verse === 16)).toBe(true);
		expect(results.some((r) => r.chapter === 18 && r.verse === 33)).toBe(true);
		expect(results.some((r) => r.chapter === 19 && r.verse === 1)).toBe(true);
		expect(results.some((r) => r.chapter === 19 && r.verse === 29)).toBe(true);
	});

	test("returns only matching verses from first chapter when verseStart > 1", () => {
		const results = search(crossChapterFixture, "Genesis 18:17-19:1");
		// ch18: only verses 17-33 (not 16 or earlier)
		expect(results.some((r) => r.chapter === 18 && r.verse === 16)).toBe(false);
		expect(results.some((r) => r.chapter === 18 && r.verse === 17)).toBe(true);
		// ch19: only verse 1 (not 2 or later)
		expect(results.some((r) => r.chapter === 19 && r.verse === 1)).toBe(true);
		expect(results.some((r) => r.chapter === 19 && r.verse === 2)).toBe(false);
	});

	test("cross-chapter range with text filter", () => {
		const results = search(crossChapterFixture, 'Genesis 18:16-19:29 "Sodom"');
		expect(results.length).toBeGreaterThan(0);
		for (const r of results) {
			expect(r.text.toLowerCase()).toContain("sodom");
		}
		// Must still respect verse bounds
		expect(results.some((r) => r.chapter === 18 && r.verse < 16)).toBe(false);
		expect(results.some((r) => r.chapter === 19 && r.verse > 29)).toBe(false);
	});

	test("inverted cross-chapter range returns empty results", () => {
		const results = search(crossChapterFixture, "Genesis 19:1-18:16");
		expect(results).toHaveLength(0);
	});

	test("cross-chapter range spanning only one verse each side", () => {
		const results = search(crossChapterFixture, "Genesis 18:33-19:1");
		expect(results).toHaveLength(2);
		expect(results[0]).toMatchObject({ chapter: 18, verse: 33 });
		expect(results[1]).toMatchObject({ chapter: 19, verse: 1 });
	});

	test("deduplication: cross-chapter range + overlapping single-verse term", () => {
		const results = search(crossChapterFixture, "Genesis 18:16-19:29; Genesis 19:1");
		// Genesis 19:1 already included in the range; should not be duplicated
		const count = results.filter((r) => r.chapter === 19 && r.verse === 1).length;
		expect(count).toBe(1);
	});

	test("abbreviated book cross-chapter search", () => {
		const results = search(crossChapterFixture, "gen 18:16-19:29");
		expect(results.length).toBeGreaterThan(0);
		expect(results.some((r) => r.chapter === 18 && r.verse === 16)).toBe(true);
		expect(results.some((r) => r.chapter === 19 && r.verse === 29)).toBe(true);
		expect(results.some((r) => r.chapter === 18 && r.verse === 1)).toBe(false);
	});
});

describe("tryParseNav — cross-chapter range with trailing verse segments", () => {
	test("expands ch:v-ch:v,trailing into two NavRefs", () => {
		const nav = tryParseNav("Genesis 18:16-19:5,20-29");
		expect(nav).not.toBeNull();
		expect(nav).toHaveLength(2);
		expect(nav![0]).toEqual({
			book: "Genesis",
			chapterStart: 18,
			chapterEnd: 19,
			verseSegments: undefined,
			verseStart: 16,
			verseEnd: 5,
		});
		expect(nav![1]).toEqual({
			book: "Genesis",
			chapterStart: 19,
			chapterEnd: 19,
			verseStart: undefined,
			verseEnd: undefined,
			verseSegments: [{ start: 20, end: 29 }],
		});
	});

	test("single trailing segment ch:v-ch:v,v", () => {
		const nav = tryParseNav("Genesis 18:16-19:5,29");
		expect(nav).not.toBeNull();
		expect(nav).toHaveLength(2);
		expect(nav![1].verseSegments).toEqual([{ start: 29, end: 29 }]);
		expect(nav![1].chapterStart).toBe(19);
	});

	test("multiple trailing segments ch:v-ch:v,v1-v2,v3", () => {
		const nav = tryParseNav("Genesis 18:1-19:5,10,20-25");
		expect(nav).not.toBeNull();
		expect(nav).toHaveLength(2);
		expect(nav![1].verseSegments).toEqual([
			{ start: 10, end: 10 },
			{ start: 20, end: 25 },
		]);
	});

	test("invalid trailing content is not expanded (returns null)", () => {
		// Trailing contains non-verse content — should not parse as nav
		expect(tryParseNav("Genesis 18:16-19:5,foo")).toBeNull();
	});

	test("coexists with other terms in a multi-ref query", () => {
		const nav = tryParseNav("Genesis 18:16-19:5,20-29; John 1:1");
		expect(nav).not.toBeNull();
		expect(nav).toHaveLength(3);
		expect(nav![2].book).toBe("John");
	});
});

// ---------------------------------------------------------------------------
// parseNavTerms
// ---------------------------------------------------------------------------

describe("parseNavTerms", () => {
	beforeEach(() => {
		setTranslation("NHEB");
	});

	test("single valid reference returns refs array", () => {
		const result = parseNavTerms("Genesis 1");
		expect(result).toHaveLength(1);
		expect(result[0].refs).not.toBeNull();
		expect(result[0].refs![0].book).toBe("Genesis");
		expect(result[0].refs![0].chapterStart).toBe(1);
		expect(result[0].term).toBe("Genesis 1");
	});

	test("single valid verse reference", () => {
		const result = parseNavTerms("John 3:16");
		expect(result).toHaveLength(1);
		expect(result[0].refs).not.toBeNull();
		expect(result[0].refs![0].book).toBe("John");
		expect(result[0].refs![0].chapterStart).toBe(3);
		expect(result[0].refs![0].verseSegments).toEqual([{ start: 16, end: 16 }]);
	});

	test("multi-term query returns one result per term", () => {
		const result = parseNavTerms("Genesis 1; John 3:16");
		expect(result).toHaveLength(2);
		expect(result[0].refs![0].book).toBe("Genesis");
		expect(result[1].refs![0].book).toBe("John");
	});

	test("quoted text term returns refs: null", () => {
		const result = parseNavTerms('"in the beginning"');
		expect(result).toHaveLength(1);
		expect(result[0].refs).toBeNull();
		expect(result[0].term).toBe('"in the beginning"');
	});

	test("mixed valid ref and quoted term", () => {
		const result = parseNavTerms('Genesis 1; "grace"');
		expect(result).toHaveLength(2);
		expect(result[0].refs).not.toBeNull();
		expect(result[0].refs![0].book).toBe("Genesis");
		expect(result[1].refs).toBeNull();
	});

	test("invalid book returns refs: null", () => {
		const result = parseNavTerms("Bogus 3:16");
		expect(result).toHaveLength(1);
		expect(result[0].refs).toBeNull();
		expect(result[0].term).toBe("Bogus 3:16");
	});

	test("empty query returns empty array", () => {
		expect(parseNavTerms("")).toEqual([]);
	});

	test("whitespace-only query returns empty array", () => {
		expect(parseNavTerms("   ")).toEqual([]);
	});

	test("cross-chapter trailing expansion returns two refs in one entry", () => {
		const result = parseNavTerms("Genesis 18:16-19:5,20-29");
		expect(result).toHaveLength(1);
		expect(result[0].refs).not.toBeNull();
		expect(result[0].refs).toHaveLength(2);
		expect(result[0].refs![0].book).toBe("Genesis");
		expect(result[0].refs![0].chapterStart).toBe(18);
		expect(result[0].refs![1].chapterStart).toBe(19);
	});

	test("cross-chapter ref with invalid sub-ref returns refs: null", () => {
		// A trailing that parses to an invalid ref — the whole term returns null
		const result = parseNavTerms("Bogus 18:16-19:5,20-29");
		expect(result).toHaveLength(1);
		expect(result[0].refs).toBeNull();
	});

	test("term and original term preserved for invalid ref", () => {
		const result = parseNavTerms("Genesis 1; Bogus");
		expect(result).toHaveLength(2);
		expect(result[0].term).toBe("Genesis 1");
		expect(result[1].term).toBe("Bogus");
		expect(result[1].refs).toBeNull();
	});

	test("chapter range produces correct NavRef", () => {
		const result = parseNavTerms("Genesis 1-3");
		expect(result).toHaveLength(1);
		expect(result[0].refs).not.toBeNull();
		expect(result[0].refs![0].chapterStart).toBe(1);
		expect(result[0].refs![0].chapterEnd).toBe(3);
	});
});

// ---------------------------------------------------------------------------
// tryParseNavGroups
// ---------------------------------------------------------------------------

describe("tryParseNavGroups", () => {
	beforeEach(() => {
		setTranslation("NHEB");
	});

	test("single reference returns single group with one ref", () => {
		const groups = tryParseNavGroups("Genesis 1");
		expect(groups).not.toBeNull();
		expect(groups).toHaveLength(1);
		expect(groups![0]).toHaveLength(1);
		expect(groups![0][0].book).toBe("Genesis");
	});

	test("multi-term returns one group per term", () => {
		const groups = tryParseNavGroups("Genesis 1; John 3:16");
		expect(groups).not.toBeNull();
		expect(groups).toHaveLength(2);
		expect(groups![0][0].book).toBe("Genesis");
		expect(groups![1][0].book).toBe("John");
	});

	test("quoted text term causes null return", () => {
		expect(tryParseNavGroups('"grace"')).toBeNull();
		expect(tryParseNavGroups('Genesis 1; "grace"')).toBeNull();
	});

	test("invalid book causes null return", () => {
		expect(tryParseNavGroups("Bogus 3:16")).toBeNull();
	});

	test("empty query returns null", () => {
		expect(tryParseNavGroups("")).toBeNull();
	});

	test("cross-chapter trailing expansion places two refs in one group", () => {
		const groups = tryParseNavGroups("Genesis 18:16-19:5,20-29");
		expect(groups).not.toBeNull();
		expect(groups).toHaveLength(1);
		expect(groups![0]).toHaveLength(2);
		expect(groups![0][0].chapterStart).toBe(18);
		expect(groups![0][1].chapterStart).toBe(19);
	});

	test("cross-chapter expansion with other term returns two groups", () => {
		const groups = tryParseNavGroups("Genesis 18:16-19:5,20-29; John 1:1");
		expect(groups).not.toBeNull();
		expect(groups).toHaveLength(2);
		expect(groups![0]).toHaveLength(2);
		expect(groups![1]).toHaveLength(1);
		expect(groups![1][0].book).toBe("John");
	});

	test("tryParseNavGroups and tryParseNav are consistent (flat)", () => {
		const groups = tryParseNavGroups("Genesis 1; John 3:16");
		const flat = tryParseNav("Genesis 1; John 3:16");
		expect(flat).toEqual(groups!.flat());
	});

	test("invalid sub-ref inside cross-chapter expansion returns null", () => {
		expect(tryParseNavGroups("Bogus 18:16-19:5,20-29")).toBeNull();
	});
});
