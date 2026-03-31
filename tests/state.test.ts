import { describe, test, expect } from "bun:test";
import type { AppState } from "../src/client/types.ts";
import { stateToInputText } from "../src/client/state.ts";

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
    expect(stateToInputText({ query: "search term", book: "Genesis", chapter: 1 })).toBe("search term");
  });
});
