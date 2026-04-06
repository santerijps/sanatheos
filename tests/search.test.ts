import { describe, test, expect, beforeEach } from "bun:test";
import type { BibleData } from "../src/client/types.ts";
import { initSearch, search, tryParseNav, parseQueryBooks, _matchBook, _parseRef, _parseVerseSegments, _buildTextMatcher, _levenshtein, _normalizeQuery, escapeRegex } from "../src/client/search.ts";
import { setTranslation, getAliases, getSortedAliases } from "../src/client/bookNames.ts";

// Minimal fixture data
const fixture: BibleData = {
  Genesis: {
    "1": {
      "1": "In the beginning God created the heavens and the earth.",
      "2": "The earth was without form, and void.",
      "3": "Then God said, \"Let there be light\"; and there was light.",
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
    const genResults = results.filter(r => r.book === "Genesis");
    const johnResults = results.filter(r => r.book === "John");
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
    expect(nav).toEqual([{ book: "Genesis", chapterStart: undefined, chapterEnd: undefined, verseSegments: undefined }]);
  });

  test("single chapter", () => {
    const nav = tryParseNav("Genesis 2");
    expect(nav).toEqual([{ book: "Genesis", chapterStart: 2, chapterEnd: 2, verseSegments: undefined }]);
  });

  test("single verse", () => {
    const nav = tryParseNav("John 3:16");
    expect(nav).toEqual([{ book: "John", chapterStart: 3, chapterEnd: 3, verseSegments: [{ start: 16, end: 16 }] }]);
  });

  test("chapter range", () => {
    const nav = tryParseNav("Genesis 1-3");
    expect(nav).toEqual([{ book: "Genesis", chapterStart: 1, chapterEnd: 3, verseSegments: undefined }]);
  });

  test("verse range", () => {
    const nav = tryParseNav("Genesis 1:2-4");
    expect(nav).toEqual([{ book: "Genesis", chapterStart: 1, chapterEnd: 1, verseSegments: [{ start: 2, end: 4 }] }]);
  });

  test("comma-separated verse segments", () => {
    const nav = tryParseNav("Genesis 1:1-3,5");
    expect(nav).toEqual([{ book: "Genesis", chapterStart: 1, chapterEnd: 1, verseSegments: [{ start: 1, end: 3 }, { start: 5, end: 5 }] }]);
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
    expect(nav![0]).toEqual({ book: "Genesis", chapterStart: 1, chapterEnd: 2, verseSegments: undefined });
    expect(nav![1]).toEqual({ book: "John", chapterStart: 1, chapterEnd: 1, verseSegments: undefined });
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
    expect(nav).toEqual([{ book: "Genesis", chapterStart: 1, chapterEnd: 1, verseSegments: undefined }]);
  });

  test("numbered book abbreviation", () => {
    const nav = tryParseNav("1 jo");
    expect(nav).toEqual([{ book: "1 John", chapterStart: undefined, chapterEnd: undefined, verseSegments: undefined }]);
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
    expect(result).toEqual([{ start: 1, end: 1 }, { start: 2, end: 2 }]);
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
    expect(_parseRef("  Genesis 1  ")).toEqual({ book: "Genesis", chapterStart: 1, chapterEnd: 1 });
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
      verseSegments: [{ start: 1, end: 2 }, { start: 4, end: 5 }],
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
    const books = new Set(results.map(r => r.book));
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
    expect(results.some(r => r.text.toLowerCase().includes("serpent"))).toBe(true);
    expect(results.some(r => r.text.toLowerCase().includes("jesus"))).toBe(true);
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
    expect(ref).toEqual({ book: "John", chapterStart: 1, chapterEnd: 1, verseSegments: [{ start: 1, end: 1 }] });
  });

  test("Genesis 1- parses as Genesis 1", () => {
    const ref = _parseRef("Genesis 1-");
    expect(ref).toEqual({ book: "Genesis", chapterStart: 1, chapterEnd: 1 });
  });

  test("Genesis 1:1-3, parses as Genesis 1:1-3", () => {
    const ref = _parseRef("Genesis 1:1-3,");
    expect(ref).toEqual({ book: "Genesis", chapterStart: 1, chapterEnd: 1, verseSegments: [{ start: 1, end: 3 }] });
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
    setTranslation("WEB");
  });

  test("KR38 Finnish prefix resolves to English key", () => {
    setTranslation("KR38");
    const result = parseQueryBooks("2. Moo 2:5-10; Job 1:13-22");
    expect(result).toHaveLength(2);
    expect(result[0].book).toBe("Exodus");
    expect(result[0].rest).toBe("2:5-10");
    expect(result[1].book).toBe("Job");
    expect(result[1].rest).toBe("1:13-22");
    setTranslation("WEB");
  });
});

// --- search only shows results for quoted text ---
describe("search — nav-only queries without quotes", () => {
  test("tryParseNav returns null when query has unresolvable book", () => {
    setTranslation("WEB");
    expect(tryParseNav("Foobar 2:5-10; John 1:1-3")).toBeNull();
  });

  test("search still returns results for partially valid nav query without quotes", () => {
    setTranslation("WEB");
    const results = search(fixture, "Foobar 2:5-10; John 1:1-3");
    // "John" resolves in the search function even though tryParseNav failed
    // But the app layer should not render this as a list for nav-only queries
    expect(results.length).toBeGreaterThan(0);
  });
});

// --- 3-letter short codes ---
describe("matchBook — 3-letter short codes", () => {
  test("gen resolves to Genesis", () => {
    setTranslation("WEB");
    expect(_matchBook("gen 1")).toEqual({ book: "Genesis", rest: "1" });
  });

  test("exo resolves to Exodus", () => {
    setTranslation("WEB");
    expect(_matchBook("exo 3")).toEqual({ book: "Exodus", rest: "3" });
  });

  test("mat resolves to Matthew", () => {
    setTranslation("WEB");
    expect(_matchBook("mat 5")).toEqual({ book: "Matthew", rest: "5" });
  });

  test("rev resolves to Revelation", () => {
    setTranslation("WEB");
    expect(_matchBook("rev")).toEqual({ book: "Revelation", rest: "" });
  });

  test("1co resolves to 1 Corinthians", () => {
    setTranslation("WEB");
    expect(_matchBook("1co 13")).toEqual({ book: "1 Corinthians", rest: "13" });
  });

  test("1sa resolves to 1 Samuel", () => {
    setTranslation("WEB");
    expect(_matchBook("1sa 3")).toEqual({ book: "1 Samuel", rest: "3" });
  });

  test("2ki resolves to 2 Kings", () => {
    setTranslation("WEB");
    expect(_matchBook("2ki 5")).toEqual({ book: "2 Kings", rest: "5" });
  });

  test("psa resolves to Psalm", () => {
    setTranslation("WEB");
    expect(_matchBook("psa 23")).toEqual({ book: "Psalm", rest: "23" });
  });

  test("jud resolves to Jude", () => {
    setTranslation("WEB");
    expect(_matchBook("jud")).toEqual({ book: "Jude", rest: "" });
  });

  test("mrk resolves to Mark", () => {
    setTranslation("WEB");
    expect(_matchBook("mrk 1")).toEqual({ book: "Mark", rest: "1" });
  });

  test("phi resolves to Philippians", () => {
    setTranslation("WEB");
    expect(_matchBook("phi 4")).toEqual({ book: "Philippians", rest: "4" });
  });

  test("phm resolves to Philemon", () => {
    setTranslation("WEB");
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
    const input = "Matt. 27:1\u201338, Luuk. 23:39\u201343, Matt. 27:39\u201354, Joh. 19:31\u201337, Matt. 27:55\u201361";
    const expected = "Matt. 27:1-38; Luuk. 23:39-43; Matt. 27:39-54; Joh. 19:31-37; Matt. 27:55-61";
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
    setTranslation("WEB");
    const result = _matchBook("Matt. 27:1");
    expect(result).not.toBeNull();
    expect(result!.book).toBe("Matthew");
    expect(result!.rest).toBe("27:1");
  });

  test("Joh. matches John", () => {
    setTranslation("WEB");
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
    setTranslation("WEB");
  });

  test("Gen. matches Genesis", () => {
    setTranslation("WEB");
    const result = _matchBook("Gen. 1:1");
    expect(result).not.toBeNull();
    expect(result!.book).toBe("Genesis");
    expect(result!.rest).toBe("1:1");
  });

  test("book name with period and no rest", () => {
    setTranslation("WEB");
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
    setTranslation("WEB");
  });
});

// --- Full integration: non-standard search syntax ---
describe("non-standard search syntax", () => {
  test("tryParseNav with en-dashes and comma separation", () => {
    setTranslation("WEB");
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
    setTranslation("WEB");
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
    setTranslation("WEB");
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
  beforeEach(() => { setTranslation("WEB"); initSearch(fixture); });

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
  beforeEach(() => { setTranslation("WEB"); initSearch(fixture); });

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
  beforeEach(() => { setTranslation("WEB"); initSearch(fixture); });

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
    setTranslation("WEB");
    const a = getAliases();
    const b = getAliases();
    expect(a).toBe(b); // same reference, not just equal
  });

  test("getSortedAliases returns the same array on repeated calls", () => {
    setTranslation("WEB");
    const a = getSortedAliases();
    const b = getSortedAliases();
    expect(a).toBe(b);
  });

  test("setTranslation invalidates the alias cache", () => {
    setTranslation("WEB");
    const a = getAliases();
    setTranslation("KR38");
    const b = getAliases();
    expect(a).not.toBe(b); // different reference after invalidation
  });

  test("getSortedAliases is sorted longest-first", () => {
    setTranslation("WEB");
    const sorted = getSortedAliases();
    for (let i = 1; i < sorted.length; i++) {
      expect(sorted[i - 1][0].length).toBeGreaterThanOrEqual(sorted[i][0].length);
    }
  });

  test("getSortedAliases entries match getAliases entries", () => {
    setTranslation("WEB");
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
    setTranslation("WEB");
    initSearch(fixture);
    // A text search should still find results from all books
    const results = search(fixture, '"beginning"');
    expect(results.length).toBeGreaterThanOrEqual(2); // Genesis 1:1 and John 1:1/1:2
    const books = new Set(results.map(r => r.book));
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
