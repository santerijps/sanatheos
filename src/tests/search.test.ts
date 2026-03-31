import { describe, test, expect, beforeEach } from "bun:test";
import type { BibleData } from "../client/types.ts";
import { initSearch, search, _matchBook, _parseRef, _parseVerseSegments } from "../client/search.ts";

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
  test("case insensitive text match", () => {
    const results = search(fixture, "beginning");
    expect(results.length).toBeGreaterThanOrEqual(3);
    for (const r of results) {
      expect(r.text.toLowerCase()).toContain("beginning");
    }
  });

  test("text search with no matches", () => {
    const results = search(fixture, "xyznonexistent");
    expect(results).toHaveLength(0);
  });

  test("respects result limit", () => {
    const results = search(fixture, "God", 3);
    expect(results).toHaveLength(3);
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

  test("mix reference and text", () => {
    const results = search(fixture, "Genesis 1:1;serpent");
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
