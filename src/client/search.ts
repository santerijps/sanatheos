import type { BibleData, VerseResult, InterlinearBook } from "./types.ts";
import { getSortedAliases } from "./bookNames.ts";

let searchData: BibleData = {};
let bookNames: string[] = [];
let interlinearData: Map<string, InterlinearBook> = new Map();

export function initSearch(data: BibleData) {
  searchData = data;
  bookNames = Object.keys(data);
}

export function setSearchInterlinearData(data: Map<string, InterlinearBook>) {
  interlinearData = data;
}

function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[] = Array.from({ length: n + 1 }, (_, i) => i);
  for (let i = 1; i <= m; i++) {
    let prev = dp[0];
    dp[0] = i;
    for (let j = 1; j <= n; j++) {
      const tmp = dp[j];
      dp[j] = a[i - 1] === b[j - 1] ? prev : 1 + Math.min(prev, dp[j], dp[j - 1]);
      prev = tmp;
    }
  }
  return dp[n];
}

function normalizeQuery(query: string): string {
  // Replace en-dash (\u2013) and em-dash (\u2014) with hyphen
  let q = query.replace(/[\u2013\u2014]/g, "-");
  // Convert commas separating book references into semicolons.
  // Matches comma + space + (letter | numbered-book start like "2 Cor").
  // Does NOT match verse-segment commas like "1:1,3,5" (comma + digit).
  q = q.replace(/,\s+(?=[A-Za-zÄÖÅäöå]|\d\.?\s+[A-Za-zÄÖÅäöå])/g, "; ");
  return q;
}

function matchBook(q: string): { book: string; rest: string } | null {
  // Strip abbreviation periods (e.g., "Matt." → "Matt", "Joh." → "Joh")
  const nq = q.replace(/([a-zA-ZÄÖÅäöå])\./g, "$1");
  const ql = nq.toLowerCase();
  // Sort longest-first so "1 John" matches before "John"
  const sorted = [...bookNames].sort((a, b) => b.length - a.length);

  // Exact full-name match on English keys
  for (const book of sorted) {
    const bl = book.toLowerCase();
    if (ql === bl) return { book, rest: "" };
    if (ql.startsWith(bl + " ")) return { book, rest: nq.slice(book.length + 1).trim() };
  }

  // Exact/starts-with match on translation aliases (Finnish display names + abbreviations)
  const sortedAliases = getSortedAliases();
  for (const [alias, key] of sortedAliases) {
    if (ql === alias) return { book: key, rest: "" };
    if (ql.startsWith(alias + " ")) return { book: key, rest: nq.slice(alias.length + 1).trim() };
  }

  // Try normalized aliases (strip periods: "ap. t." → "ap t")
  for (const [alias, key] of sortedAliases) {
    const na = alias.replace(/([a-zäöå])\./g, "$1");
    if (na === alias) continue;
    if (ql === na) return { book: key, rest: "" };
    if (ql.startsWith(na + " ")) return { book: key, rest: nq.slice(na.length + 1).trim() };
  }

  // Prefix / abbreviation match
  // Extract the name portion: optional leading digit (with optional period) + letters
  // (periods already stripped from ql, so "Matt." becomes "Matt")
  const m = ql.match(/^(\d\.?\s+)?([a-zäöå\s]+?)(?:\s+(\d.*))?$/);
  if (!m) return null;
  const prefix = ((m[1] || "") + m[2]).trim();
  const rest = (m[3] || "").trim();
  for (const book of sorted) {
    if (book.toLowerCase().startsWith(prefix)) {
      return { book, rest };
    }
  }
  for (const [alias, key] of sortedAliases) {
    if (alias.startsWith(prefix)) {
      return { book: key, rest };
    }
  }

  // Fuzzy match — Levenshtein distance fallback
  if (prefix.length >= 3) {
    const maxDist = prefix.length <= 5 ? 1 : 2;
    let bestDist = maxDist + 1;
    let bestBook: string | null = null;
    for (const book of sorted) {
      const d = levenshtein(prefix, book.toLowerCase());
      if (d < bestDist) {
        bestDist = d;
        bestBook = book;
      }
    }
    for (const [alias, key] of sortedAliases) {
      const d = levenshtein(prefix, alias);
      if (d < bestDist) {
        bestDist = d;
        bestBook = key;
      }
    }
    if (bestBook) return { book: bestBook, rest };
  }

  return null;
}

interface VerseSegment {
  start: number;
  end: number;
}

interface ParsedRef {
  book: string;
  chapterStart?: number;
  chapterEnd?: number;
  verseSegments?: VerseSegment[];
}

function parseVerseSegments(s: string): VerseSegment[] | null {
  const parts = s
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);
  const segs: VerseSegment[] = [];
  for (const part of parts) {
    const range = part.match(/^(\d+)-(\d+)$/);
    if (range) {
      const start = +range[1],
        end = +range[2];
      if (start > end) return null;
      segs.push({ start, end });
      continue;
    }
    const single = part.match(/^(\d+)$/);
    if (single) {
      segs.push({ start: +single[1], end: +single[1] });
      continue;
    }
    return null;
  }
  return segs.length ? segs : null;
}

function parseRef(term: string): ParsedRef | null {
  const t = term.trim();
  if (!t) return null;
  const bm = matchBook(t);
  if (!bm) return null;
  if (!bm.rest) return { book: bm.book };

  // Strip trailing incomplete operators (dash, comma, colon) while user is still typing
  const rest = bm.rest.replace(/[-,:]+$/, "");
  if (!rest) return { book: bm.book };

  // chapter:verseSegments  e.g. 1:3-7  or  1:1-10,13,20-25
  const cvm = rest.match(/^(\d+):(.+)$/);
  if (cvm) {
    const segStr = cvm[2].replace(/[-,]+$/, "");
    const segs = segStr ? parseVerseSegments(segStr) : null;
    if (segs)
      return { book: bm.book, chapterStart: +cvm[1], chapterEnd: +cvm[1], verseSegments: segs };
    // If only "chapter:" remains, treat as single chapter
    if (!segStr) return { book: bm.book, chapterStart: +cvm[1], chapterEnd: +cvm[1] };
  }

  // chapterStart-chapterEnd  e.g. 1-10
  const cr = rest.match(/^(\d+)-(\d+)$/);
  if (cr) return { book: bm.book, chapterStart: +cr[1], chapterEnd: +cr[2] };

  // single chapter  e.g. 3
  const sc = rest.match(/^(\d+)$/);
  if (sc) return { book: bm.book, chapterStart: +sc[1], chapterEnd: +sc[1] };

  return null;
}

export interface NavRef {
  book: string;
  chapterStart?: number;
  chapterEnd?: number;
  verseSegments?: VerseSegment[];
}

/**
 * Try to parse a query as pure references (no text filter).
 * Returns an array of NavRef for navigation, or null if any term is a search query.
 */
export function tryParseNav(query: string): NavRef[] | null {
  const terms = normalizeQuery(query)
    .split(/;/)
    .map((t) => t.trim())
    .filter(Boolean);
  if (!terms.length) return null;

  const refs: NavRef[] = [];
  for (const term of terms) {
    // If it contains a quoted filter, it's a search
    if (term.match(/"(.*?)"/)) return null;

    const ref = parseRef(term);
    if (!ref) return null;

    refs.push({
      book: ref.book,
      chapterStart: ref.chapterStart,
      chapterEnd: ref.chapterEnd,
      verseSegments: ref.verseSegments,
    });
  }
  return refs;
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function buildTextMatcher(filter: string): (text: string) => boolean {
  const hasStart = filter.startsWith("^");
  const hasEnd = filter.endsWith("$") && filter.length > (hasStart ? 1 : 0);
  const core = filter.slice(hasStart ? 1 : 0, hasEnd ? -1 : undefined);
  if (!core) return () => false;

  if (!hasStart && !hasEnd) {
    // Plain substring match (fast path)
    const lower = core.toLowerCase();
    return (text) => text.toLowerCase().includes(lower);
  }

  const pattern = (hasStart ? "\\b" : "") + escapeRegex(core) + (hasEnd ? "\\b" : "");
  const re = new RegExp(pattern, "i");
  return (text) => re.test(text);
}

export function search(data: BibleData, query: string): VerseResult[] {
  const terms = normalizeQuery(query)
    .split(/;/)
    .map((t) => t.trim())
    .filter(Boolean);
  const results: VerseResult[] = [];
  const seen = new Set<string>();

  for (const term of terms) {
    // Extract an optional quoted text filter from the term
    const quotedMatch = term.match(/"(.*?)"/);
    const rawFilter = quotedMatch && quotedMatch[1].length > 0 ? quotedMatch[1] : null;
    const textMatch = rawFilter ? buildTextMatcher(rawFilter) : null;
    const refPart = quotedMatch ? term.replace(/"(.*?)"/, "").trim() : term;

    // Strong's number search (e.g., G2316, H430)
    const strongsMatch = refPart.match(/^([GHgh]\d+)$/);
    if (strongsMatch && interlinearData.size > 0) {
      const strongsId = strongsMatch[1].toLowerCase();
      for (const [book, ilBook] of interlinearData) {
        for (const [c, ilChapter] of Object.entries(ilBook)) {
          for (const [v, words] of Object.entries(ilChapter)) {
            const hasStrongs = words.some((w) => w.strongs === strongsId);
            if (hasStrongs) {
              const text = searchData[book]?.[c]?.[v] || "";
              const k = `${book}:${c}:${v}`;
              if (!seen.has(k)) {
                seen.add(k);
                results.push({ book, chapter: +c, verse: +v, text });
              }
            }
          }
        }
      }
      continue;
    }

    // Pure text search — iterate BibleData directly (no intermediate array)
    if (textMatch && !refPart) {
      for (const book of bookNames) {
        for (const [c, verses] of Object.entries(searchData[book])) {
          for (const [v, text] of Object.entries(verses)) {
            if (textMatch(text)) {
              const k = `${book}:${c}:${v}`;
              if (!seen.has(k)) {
                seen.add(k);
                results.push({ book, chapter: +c, verse: +v, text });
              }
            }
          }
        }
      }
      continue;
    }

    const ref = parseRef(refPart);
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
              if (textMatch && !textMatch(text)) continue;
              const k = `${ref.book}:${c}:${v}`;
              if (!seen.has(k)) {
                seen.add(k);
                results.push({ book: ref.book, chapter: c, verse: v, text });
              }
            }
          }
        }
      } else {
        // Whole book
        for (const [c, verses] of Object.entries(bookData)) {
          for (const [v, text] of Object.entries(verses)) {
            if (textMatch && !textMatch(text)) continue;
            const k = `${ref.book}:${c}:${v}`;
            if (!seen.has(k)) {
              seen.add(k);
              results.push({ book: ref.book, chapter: +c, verse: +v, text });
            }
          }
        }
      }
      continue;
    }
  }

  return results;
}

interface ParsedQueryTerm {
  book: string;
  rest: string;
  quoted: string;
  original: string;
}

/**
 * Parse each semicolon-separated term in a query to extract the English book key.
 * Call this while the current translation is still active so aliases resolve correctly.
 */
export function parseQueryBooks(query: string): ParsedQueryTerm[] {
  return normalizeQuery(query)
    .split(/;/)
    .map((t) => t.trim())
    .filter(Boolean)
    .map((term) => {
      const qm = term.match(/"(.*?)"/);
      const quoted = qm ? qm[0] : "";
      const refPart = qm ? term.replace(/"(.*?)"/, "").trim() : term;
      if (!refPart) return { book: "", rest: "", quoted, original: term };
      const bm = matchBook(refPart);
      if (!bm) return { book: "", rest: "", quoted: "", original: term };
      return { book: bm.book, rest: bm.rest, quoted, original: term };
    });
}

// Exported for testing
export {
  matchBook as _matchBook,
  parseRef as _parseRef,
  parseVerseSegments as _parseVerseSegments,
  buildTextMatcher as _buildTextMatcher,
  levenshtein as _levenshtein,
  normalizeQuery as _normalizeQuery,
  escapeRegex,
};
