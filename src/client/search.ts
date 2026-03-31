import type { BibleData, VerseResult } from "./types.ts";

interface SearchEntry {
  book: string;
  chapter: number;
  verse: number;
  text: string;
  lower: string;
}

let entries: SearchEntry[] = [];
let bookNames: string[] = [];

export function initSearch(data: BibleData) {
  bookNames = Object.keys(data);
  entries = [];
  for (const book of bookNames) {
    for (const [ch, verses] of Object.entries(data[book])) {
      for (const [v, text] of Object.entries(verses)) {
        entries.push({ book, chapter: +ch, verse: +v, text, lower: text.toLowerCase() });
      }
    }
  }
}

function matchBook(q: string): { book: string; rest: string } | null {
  const ql = q.toLowerCase();
  // Sort longest-first so "1 John" matches before "John"
  const sorted = [...bookNames].sort((a, b) => b.length - a.length);

  // Exact full-name match (possibly followed by chapter:verse)
  for (const book of sorted) {
    const bl = book.toLowerCase();
    if (ql === bl) return { book, rest: "" };
    if (ql.startsWith(bl + " ")) return { book, rest: q.slice(book.length + 1).trim() };
  }

  // Prefix / abbreviation match
  // Extract the name portion: optional leading digit + letters
  const m = ql.match(/^(\d\s+)?([a-z\s]+?)(?:\s+(\d.*))?$/);
  if (!m) return null;
  const prefix = ((m[1] || "") + m[2]).trim();
  const rest = (m[3] || "").trim();
  for (const book of sorted) {
    if (book.toLowerCase().startsWith(prefix)) {
      return { book, rest };
    }
  }
  return null;
}

function parseRef(term: string): { book: string; chapter?: number; verse?: number } | null {
  const t = term.trim();
  if (!t) return null;
  const bm = matchBook(t);
  if (!bm) return null;
  if (!bm.rest) return { book: bm.book };
  const cv = bm.rest.match(/^(\d+)(?::(\d+))?$/);
  if (!cv) return null;
  return {
    book: bm.book,
    chapter: +cv[1],
    verse: cv[2] ? +cv[2] : undefined,
  };
}

export function search(data: BibleData, query: string, limit = 200): VerseResult[] {
  const terms = query.split(/;/).map(t => t.trim()).filter(Boolean);
  const results: VerseResult[] = [];
  const seen = new Set<string>();

  for (const term of terms) {
    const ref = parseRef(term);
    if (ref && data[ref.book]) {
      const bookData = data[ref.book];
      if (ref.chapter !== undefined && ref.verse !== undefined) {
        const text = bookData[String(ref.chapter)]?.[String(ref.verse)];
        if (text) {
          const k = `${ref.book}:${ref.chapter}:${ref.verse}`;
          if (!seen.has(k)) { seen.add(k); results.push({ book: ref.book, chapter: ref.chapter, verse: ref.verse, text }); }
        }
      } else if (ref.chapter !== undefined) {
        const ch = bookData[String(ref.chapter)];
        if (ch) {
          for (const [v, text] of Object.entries(ch)) {
            const k = `${ref.book}:${ref.chapter}:${v}`;
            if (!seen.has(k)) { seen.add(k); results.push({ book: ref.book, chapter: ref.chapter, verse: +v, text }); }
          }
        }
      } else {
        for (const [c, verses] of Object.entries(bookData)) {
          for (const [v, text] of Object.entries(verses)) {
            const k = `${ref.book}:${c}:${v}`;
            if (!seen.has(k) && results.length < limit) { seen.add(k); results.push({ book: ref.book, chapter: +c, verse: +v, text }); }
          }
        }
      }
      continue;
    }

    // Text search — case-insensitive substring
    const tl = term.toLowerCase();
    for (const e of entries) {
      if (results.length >= limit) break;
      if (e.lower.includes(tl)) {
        const k = `${e.book}:${e.chapter}:${e.verse}`;
        if (!seen.has(k)) { seen.add(k); results.push({ book: e.book, chapter: e.chapter, verse: e.verse, text: e.text }); }
      }
    }
  }

  return results;
}
