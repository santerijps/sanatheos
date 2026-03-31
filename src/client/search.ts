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

interface VerseSegment {
  start: number;
  end: number;
}

interface Ref {
  book: string;
  chapterStart?: number;
  chapterEnd?: number;
  verseSegments?: VerseSegment[];
}

function parseVerseSegments(s: string): VerseSegment[] | null {
  const parts = s.split(",").map(p => p.trim()).filter(Boolean);
  const segs: VerseSegment[] = [];
  for (const part of parts) {
    const range = part.match(/^(\d+)-(\d+)$/);
    if (range) { segs.push({ start: +range[1], end: +range[2] }); continue; }
    const single = part.match(/^(\d+)$/);
    if (single) { segs.push({ start: +single[1], end: +single[1] }); continue; }
    return null;
  }
  return segs.length ? segs : null;
}

function parseRef(term: string): Ref | null {
  const t = term.trim();
  if (!t) return null;
  const bm = matchBook(t);
  if (!bm) return null;
  if (!bm.rest) return { book: bm.book };

  // chapter:verseSegments  e.g. 1:3-7  or  1:1-10,13,20-25
  const cvm = bm.rest.match(/^(\d+):(.+)$/);
  if (cvm) {
    const segs = parseVerseSegments(cvm[2]);
    if (segs) return { book: bm.book, chapterStart: +cvm[1], chapterEnd: +cvm[1], verseSegments: segs };
  }

  // chapterStart-chapterEnd  e.g. 1-10
  const cr = bm.rest.match(/^(\d+)-(\d+)$/);
  if (cr) return { book: bm.book, chapterStart: +cr[1], chapterEnd: +cr[2] };

  // single chapter  e.g. 3
  const sc = bm.rest.match(/^(\d+)$/);
  if (sc) return { book: bm.book, chapterStart: +sc[1], chapterEnd: +sc[1] };

  return null;
}

export function search(data: BibleData, query: string, limit = 200): VerseResult[] {
  const terms = query.split(/;/).map(t => t.trim()).filter(Boolean);
  const results: VerseResult[] = [];
  const seen = new Set<string>();

  for (const term of terms) {
    const ref = parseRef(term);
    if (ref && data[ref.book]) {
      const bookData = data[ref.book];

      if (ref.chapterStart !== undefined && ref.chapterEnd !== undefined) {
        for (let c = ref.chapterStart; c <= ref.chapterEnd; c++) {
          const ch = bookData[String(c)];
          if (!ch) continue;
          const segments = ref.verseSegments
            ? ref.verseSegments
            : [{ start: 1, end: Math.max(...Object.keys(ch).map(Number)) }];
          for (const seg of segments) {
            for (let v = seg.start; v <= seg.end; v++) {
              const text = ch[String(v)];
              if (!text) continue;
              const k = `${ref.book}:${c}:${v}`;
              if (!seen.has(k) && results.length < limit) { seen.add(k); results.push({ book: ref.book, chapter: c, verse: v, text }); }
            }
          }
        }
      } else {
        // Whole book
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

// Exported for testing
export { matchBook as _matchBook, parseRef as _parseRef, parseVerseSegments as _parseVerseSegments };
