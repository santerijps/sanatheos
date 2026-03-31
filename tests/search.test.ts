import { describe, test, expect, beforeEach } from "bun:test";
import type { BibleData } from "../src/client/types.ts";
import { initSearch, search, tryParseNav, _matchBook, _parseRef, _parseVerseSegments, _buildTextMatcher } from "../src/client/search.ts";

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

  test("respects result limit", () => {
    const results = search(fixture, '"God"', 3);
    expect(results).toHaveLength(3);
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

  test("invalid format: colon without verse", () => {
    // "Genesis 1:" — the rest is "1:" which doesn't match any pattern fully
    expect(_parseRef("Genesis 1:")).toBeNull();
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

  test("limit of 0 returns empty", () => {
    expect(search(fixture, '"God"', 0)).toHaveLength(0);
  });

  test("limit of 1 returns exactly 1", () => {
    expect(search(fixture, '"God"', 1)).toHaveLength(1);
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

// --- unquoted ^/$ anchors ---
describe("search — unquoted ^/$ anchors", () => {
  test("^God matches without quotes", () => {
    const results = search(fixture, "^God");
    expect(results.length).toBeGreaterThan(0);
    for (const r of results) {
      expect(r.text).toMatch(/\bGod/i);
    }
  });

  test("earth$ matches without quotes", () => {
    const results = search(fixture, "earth$");
    expect(results.length).toBeGreaterThan(0);
    for (const r of results) {
      expect(r.text).toMatch(/earth\b/i);
    }
  });

  test("^God$ exact word without quotes", () => {
    const results = search(fixture, "^God$");
    expect(results.length).toBeGreaterThan(0);
    for (const r of results) {
      expect(r.text).toMatch(/\bGod\b/i);
    }
  });

  test("multi-word unquoted: ^in the", () => {
    const results = search(fixture, "^in the");
    expect(results.length).toBeGreaterThan(0);
    for (const r of results) {
      expect(r.text).toMatch(/\bin the/i);
    }
  });

  test("multi-word unquoted: the earth$", () => {
    const results = search(fixture, "the earth$");
    expect(results.length).toBeGreaterThan(0);
    for (const r of results) {
      expect(r.text).toMatch(/the earth\b/i);
    }
  });

  test("unquoted ^ excludes mid-word", () => {
    const results = search(fixture, "^unning");
    expect(results).toHaveLength(0);
  });

  test("unquoted $ excludes mid-word", () => {
    const results = search(fixture, "beginni$");
    expect(results).toHaveLength(0);
  });

  test("tryParseNav returns null for ^/$ terms", () => {
    expect(tryParseNav("^God$")).toBeNull();
    expect(tryParseNav("earth$")).toBeNull();
    expect(tryParseNav("^light")).toBeNull();
    expect(tryParseNav("Genesis 1; ^God$")).toBeNull();
  });
});
