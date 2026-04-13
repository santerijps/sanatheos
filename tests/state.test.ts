import { describe, test, expect } from "bun:test";
import { stateToInputText, toUrl } from "../src/client/state.ts";
import { bookFromCode, bookToCode } from "../src/client/bookCodes.ts";

describe("stateToInputText", () => {
  test("empty state returns empty string", () => {
    expect(stateToInputText({})).toBe("");
  });

  test("query state returns query", () => {
    expect(stateToInputText({ query: "love" })).toBe("love");
  });

  test("book only", () => {
    expect(stateToInputText({ book: "Genesis" })).toBe("Genesis");
  });

  test("book and chapter", () => {
    expect(stateToInputText({ book: "Genesis", chapter: 1 })).toBe("Genesis 1");
  });

  test("book, chapter, and verse", () => {
    expect(stateToInputText({ book: "John", chapter: 3, verse: 16 })).toBe("John 3:16");
  });

  test("query takes precedence over book/chapter", () => {
    expect(stateToInputText({ query: "search term", book: "Genesis", chapter: 1 })).toBe(
      "search term",
    );
  });
});

describe("bookCodes", () => {
  test("bookToCode returns 3-char code for common books", () => {
    expect(bookToCode("Genesis")).toBe("gen");
    expect(bookToCode("John")).toBe("jhn");
    expect(bookToCode("Revelation")).toBe("rev");
    expect(bookToCode("Psalm")).toBe("psa");
  });

  test("bookToCode returns code for numbered books", () => {
    expect(bookToCode("1 Samuel")).toBe("1sa");
    expect(bookToCode("2 Kings")).toBe("2ki");
    expect(bookToCode("1 Corinthians")).toBe("1co");
    expect(bookToCode("3 John")).toBe("3jn");
  });

  test("bookFromCode resolves codes to English keys", () => {
    expect(bookFromCode("gen")).toBe("Genesis");
    expect(bookFromCode("jhn")).toBe("John");
    expect(bookFromCode("rev")).toBe("Revelation");
    expect(bookFromCode("1co")).toBe("1 Corinthians");
  });

  test("bookFromCode is case-insensitive", () => {
    expect(bookFromCode("GEN")).toBe("Genesis");
    expect(bookFromCode("Rev")).toBe("Revelation");
  });

  test("bookFromCode returns undefined for unknown code", () => {
    expect(bookFromCode("xyz")).toBeUndefined();
  });

  test("bookToCode returns undefined for unknown book", () => {
    expect(bookToCode("FakeBook")).toBeUndefined();
  });

  test("all 66 books have codes", () => {
    const books = [
      "Genesis",
      "Exodus",
      "Leviticus",
      "Numbers",
      "Deuteronomy",
      "Joshua",
      "Judges",
      "Ruth",
      "1 Samuel",
      "2 Samuel",
      "1 Kings",
      "2 Kings",
      "1 Chronicles",
      "2 Chronicles",
      "Ezra",
      "Nehemiah",
      "Esther",
      "Job",
      "Psalm",
      "Proverbs",
      "Ecclesiastes",
      "Song Of Solomon",
      "Isaiah",
      "Jeremiah",
      "Lamentations",
      "Ezekiel",
      "Daniel",
      "Hosea",
      "Joel",
      "Amos",
      "Obadiah",
      "Jonah",
      "Micah",
      "Nahum",
      "Habakkuk",
      "Zephaniah",
      "Haggai",
      "Zechariah",
      "Malachi",
      "Matthew",
      "Mark",
      "Luke",
      "John",
      "Acts",
      "Romans",
      "1 Corinthians",
      "2 Corinthians",
      "Galatians",
      "Ephesians",
      "Philippians",
      "Colossians",
      "1 Thessalonians",
      "2 Thessalonians",
      "1 Timothy",
      "2 Timothy",
      "Titus",
      "Philemon",
      "Hebrews",
      "James",
      "1 Peter",
      "2 Peter",
      "1 John",
      "2 John",
      "3 John",
      "Jude",
      "Revelation",
    ];
    for (const b of books) {
      const code = bookToCode(b);
      expect(code).toBeDefined();
      expect(code!.length).toBeLessThanOrEqual(4);
      expect(bookFromCode(code!)).toBe(b);
    }
  });
});

describe("toUrl", () => {
  test("uses short book code in URL", () => {
    expect(toUrl({ book: "Genesis", chapter: 1 })).toBe("/?book=gen&chapter=1");
  });

  test("includes translation param", () => {
    expect(toUrl({ book: "John", chapter: 3, verse: 16, translation: "KR38" })).toBe(
      "/?t=KR38&book=jhn&chapter=3&verse=16",
    );
  });

  test("query-only state", () => {
    expect(toUrl({ query: "grace" })).toBe("/?q=grace");
  });

  test("empty state returns /", () => {
    expect(toUrl({})).toBe("/");
  });

  test("falls back to raw book name if no code exists", () => {
    expect(toUrl({ book: "UnknownBook", chapter: 1 })).toBe("/?book=UnknownBook&chapter=1");
  });

  test("includes parallel param", () => {
    const url = toUrl({ book: "Genesis", chapter: 1, parallel: "KR38" });
    expect(url).toContain("p=KR38");
    expect(url).toContain("book=gen");
    expect(url).toContain("chapter=1");
  });

  test("chapter without verse does not include verse param", () => {
    const url = toUrl({ book: "John", chapter: 3 });
    expect(url).not.toContain("verse");
  });

  test("query with special characters is encoded", () => {
    const url = toUrl({ query: "love & faith" });
    expect(url).toContain("q=");
    // The URL should be parseable
    const params = new URLSearchParams(url.split("?")[1]);
    expect(params.get("q")).toBe("love & faith");
  });
});

// ---------------------------------------------------------------------------
// Edge cases — bookCodes
// ---------------------------------------------------------------------------

describe("bookCodes edge cases", () => {
  test("bookToCode returns undefined for empty string", () => {
    expect(bookToCode("")).toBeUndefined();
  });

  test("bookFromCode returns undefined for empty string", () => {
    expect(bookFromCode("")).toBeUndefined();
  });

  test("no duplicate codes in CODE_TO_BOOK", () => {
    // Verify round-trip uniqueness: each book maps to a unique code
    const seen = new Set<string>();
    const books = [
      "Genesis",
      "Exodus",
      "Leviticus",
      "Numbers",
      "Deuteronomy",
      "Joshua",
      "Judges",
      "Ruth",
      "1 Samuel",
      "2 Samuel",
      "1 Kings",
      "2 Kings",
      "1 Chronicles",
      "2 Chronicles",
      "Ezra",
      "Nehemiah",
      "Esther",
      "Job",
      "Psalm",
      "Proverbs",
      "Ecclesiastes",
      "Song Of Solomon",
      "Isaiah",
      "Jeremiah",
      "Lamentations",
      "Ezekiel",
      "Daniel",
      "Hosea",
      "Joel",
      "Amos",
      "Obadiah",
      "Jonah",
      "Micah",
      "Nahum",
      "Habakkuk",
      "Zephaniah",
      "Haggai",
      "Zechariah",
      "Malachi",
      "Matthew",
      "Mark",
      "Luke",
      "John",
      "Acts",
      "Romans",
      "1 Corinthians",
      "2 Corinthians",
      "Galatians",
      "Ephesians",
      "Philippians",
      "Colossians",
      "1 Thessalonians",
      "2 Thessalonians",
      "1 Timothy",
      "2 Timothy",
      "Titus",
      "Philemon",
      "Hebrews",
      "James",
      "1 Peter",
      "2 Peter",
      "1 John",
      "2 John",
      "3 John",
      "Jude",
      "Revelation",
    ];
    for (const b of books) {
      const code = bookToCode(b)!;
      expect(seen.has(code)).toBe(false);
      seen.add(code);
    }
  });

  test("codes are 3–4 characters", () => {
    const books = ["Genesis", "1 Thessalonians", "Psalm", "3 John"];
    for (const b of books) {
      const code = bookToCode(b)!;
      expect(code.length).toBeGreaterThanOrEqual(3);
      expect(code.length).toBeLessThanOrEqual(4);
    }
  });
});
