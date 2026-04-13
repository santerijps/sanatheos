import { describe, test, expect } from "bun:test";
import { BOOK_ORDER, loadBible, discoverTranslations } from "../src/shared/bible-loader.ts";
import { join, resolve } from "node:path";

const ROOT = resolve(import.meta.dir, "..");
const TEXT_DIR = join(ROOT, "public", "text");

// ---------------------------------------------------------------------------
// BOOK_ORDER
// ---------------------------------------------------------------------------

describe("BOOK_ORDER", () => {
  test("has 66 canonical + deuterocanonical books", () => {
    // 39 OT + 18 deuterocanonical + 27 NT = 84
    expect(BOOK_ORDER.length).toBe(84);
  });

  test("starts with Genesis", () => {
    expect(BOOK_ORDER[0]).toBe("Genesis");
  });

  test("ends with Revelation", () => {
    expect(BOOK_ORDER[BOOK_ORDER.length - 1]).toBe("Revelation");
  });

  test("Old Testament books are in canonical order", () => {
    const otBooks = [
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
    ];
    for (let i = 0; i < otBooks.length; i++) {
      expect(BOOK_ORDER[i]).toBe(otBooks[i]);
    }
  });

  test("New Testament starts with Matthew", () => {
    const ntIndex = BOOK_ORDER.indexOf("Matthew");
    expect(ntIndex).toBeGreaterThan(0);
    // Matthew should come after Malachi and after deuterocanonical books
    expect(BOOK_ORDER.indexOf("Malachi")).toBeLessThan(ntIndex);
  });

  test("New Testament books in canonical order", () => {
    const ntBooks = [
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
    const ntStart = BOOK_ORDER.indexOf("Matthew");
    for (let i = 0; i < ntBooks.length; i++) {
      expect(BOOK_ORDER[ntStart + i]).toBe(ntBooks[i]);
    }
  });

  test("contains no duplicates", () => {
    const set = new Set(BOOK_ORDER);
    expect(set.size).toBe(BOOK_ORDER.length);
  });

  test("deuterocanonical books are present", () => {
    const dcBooks = ["Tobit", "Judith", "Wisdom", "Sirach", "Baruch", "1 Maccabees", "2 Maccabees"];
    for (const book of dcBooks) {
      expect(BOOK_ORDER).toContain(book);
    }
  });

  test("deuterocanonical books are between OT and NT", () => {
    const malachiIdx = BOOK_ORDER.indexOf("Malachi");
    const matthewIdx = BOOK_ORDER.indexOf("Matthew");
    const tobitIdx = BOOK_ORDER.indexOf("Tobit");
    expect(tobitIdx).toBeGreaterThan(malachiIdx);
    expect(tobitIdx).toBeLessThan(matthewIdx);
  });
});

// ---------------------------------------------------------------------------
// loadBible
// ---------------------------------------------------------------------------

describe("loadBible", () => {
  test("loads and returns stringified JSON for NHEB", async () => {
    const json = await loadBible(TEXT_DIR, "NHEB");
    const data = JSON.parse(json);
    expect(typeof data).toBe("object");
    expect(data["Genesis"]).toBeDefined();
    expect(data["Revelation"]).toBeDefined();
  });

  test("Genesis comes before Exodus in output key order", async () => {
    const json = await loadBible(TEXT_DIR, "NHEB");
    const keys = Object.keys(JSON.parse(json));
    expect(keys.indexOf("Genesis")).toBeLessThan(keys.indexOf("Exodus"));
  });

  test("books are ordered canonically", async () => {
    const json = await loadBible(TEXT_DIR, "NHEB");
    const keys = Object.keys(JSON.parse(json));
    // Every consecutive pair should maintain BOOK_ORDER
    for (let i = 0; i < keys.length - 1; i++) {
      const idxA = BOOK_ORDER.indexOf(keys[i]);
      const idxB = BOOK_ORDER.indexOf(keys[i + 1]);
      expect(idxA).toBeLessThan(idxB);
    }
  });

  test("normalizes source book names (e.g., Psalms → Psalm)", async () => {
    const json = await loadBible(TEXT_DIR, "KR38");
    const data = JSON.parse(json);
    // Should use canonical "Psalm" not "Psalms"
    expect(data["Psalm"]).toBeDefined();
    expect(data["Psalms"]).toBeUndefined();
  });

  test("verse text is trimmed and non-empty", async () => {
    const json = await loadBible(TEXT_DIR, "NHEB");
    const data = JSON.parse(json);
    const gen1_1 = data["Genesis"]?.["1"]?.["1"];
    expect(gen1_1).toBeTruthy();
    expect(gen1_1).toBe(gen1_1.trim());
  });
});

// ---------------------------------------------------------------------------
// discoverTranslations
// ---------------------------------------------------------------------------

describe("discoverTranslations", () => {
  test("discovers available translation codes", async () => {
    const codes = await discoverTranslations(TEXT_DIR);
    expect(Array.isArray(codes)).toBe(true);
    expect(codes.length).toBeGreaterThanOrEqual(2);
  });

  test("returns sorted codes", async () => {
    const codes = await discoverTranslations(TEXT_DIR);
    const sorted = [...codes].sort();
    expect(codes).toEqual(sorted);
  });

  test("includes known translations", async () => {
    const codes = await discoverTranslations(TEXT_DIR);
    expect(codes).toContain("NHEB");
    expect(codes).toContain("KR38");
  });

  test("excludes non-translation files (strongs, translations)", async () => {
    const codes = await discoverTranslations(TEXT_DIR);
    expect(codes).not.toContain("strongs");
    expect(codes).not.toContain("translations");
  });
});
