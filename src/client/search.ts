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
		if (ql.startsWith(alias + " "))
			return { book: key, rest: nq.slice(alias.length + 1).trim() };
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
	verseStart?: number;
	verseEnd?: number;
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
	// Strip trailing non-reference symbols from the whole term (e.g. "Gen 1:1!" → "Gen 1:1")
	const t = term
		.trim()
		.replace(/[^a-zA-ZÄÖÅäöå0-9\-:,\s]+$/, "")
		.trim();
	if (!t) return null;
	const bm = matchBook(t);
	if (!bm) return null;
	if (!bm.rest) return { book: bm.book };

	// Normalize the chapter/verse/range part:
	// 1. Strip periods everywhere (e.g. "ch.1" → "ch1", "1:1." → "1:1")
	// 2. Strip whitespace (e.g. "1 : 1" → "1:1", "1 - 3" → "1-3")
	// 3. Strip letters immediately before a digit (e.g. "ch1" → "1", "v5" → "5")
	// 4. Strip letters immediately after a digit (e.g. "1a" → "1", "16b" → "16")
	// 5. Strip trailing non-reference chars and incomplete operators
	const rest = bm.rest
		.replace(/\./g, "")
		.replace(/\s+/g, "")
		.replace(/[a-zA-ZÄÖÅäöå]+(?=\d)/g, "")
		.replace(/(?<=\d)[a-zA-ZÄÖÅäöå]+/g, "")
		.replace(/[^a-zA-ZÄÖÅäöå0-9:,-]+$/, "")
		.replace(/[-,:]+$/, "");
	if (!rest) return { book: bm.book };

	// cross-chapter verse range: chapter1:verse1-chapter2:verse2  e.g. 18:16-19:29
	const ccr = rest.match(/^(\d+):(\d+)-(\d+):(\d+)$/);
	if (ccr) {
		const chStart = +ccr[1],
			vStart = +ccr[2],
			chEnd = +ccr[3],
			vEnd = +ccr[4];
		if (chStart < chEnd || (chStart === chEnd && vStart <= vEnd)) {
			return {
				book: bm.book,
				chapterStart: chStart,
				chapterEnd: chEnd,
				verseStart: vStart,
				verseEnd: vEnd,
			};
		}
	}

	// chapter:verseSegments  e.g. 1:3-7  or  1:1-10,13,20-25
	const cvm = rest.match(/^(\d+):(.+)$/);
	if (cvm) {
		const segStr = cvm[2].replace(/[-,]+$/, "");
		const segs = segStr ? parseVerseSegments(segStr) : null;
		if (segs)
			return {
				book: bm.book,
				chapterStart: +cvm[1],
				chapterEnd: +cvm[1],
				verseSegments: segs,
			};
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
	verseStart?: number;
	verseEnd?: number;
}

/**
 * Detect "book ch1:v1-ch2:v2,trailing" (e.g. "Acts 6:8-7:5,47-60") and expand
 * into two sub-terms: "Acts 6:8-7:5" and "Acts 7:47-60".
 * Returns null when the term does not match this extended pattern.
 */
function expandCrossChapterTrailing(term: string): [string, string] | null {
	const bm = matchBook(term);
	if (!bm || !bm.rest) return null;
	const rest = bm.rest
		.replace(/\./g, "")
		.replace(/\s+/g, "")
		.replace(/[a-zA-ZÄÖÅäöå]+(?=\d)/g, "")
		.replace(/(?<=\d)[a-zA-ZÄÖÅäöå]+/g, "")
		.replace(/[^a-zA-ZÄÖÅäöå0-9:,-]+$/, "")
		.replace(/[-,:]+$/, "");
	const m = rest.match(/^(\d+):(\d+)-(\d+):(\d+),(.+)$/);
	if (!m) return null;
	const [, ch1, , ch2, , trailing] = m;
	// Only accept trailing content that looks like verse segments (digits, commas, hyphens)
	if (!/^[\d,-]+$/.test(trailing)) return null;
	return [`${bm.book} ${ch1}:${m[2]}-${ch2}:${m[4]}`, `${bm.book} ${ch2}:${trailing}`];
}

/**
 * A single parsed term result: either a list of refs (1 or 2 for cross-chapter)
 * or null if the term could not be parsed as a reference.
 */
export type NavTermResult = { refs: NavRef[]; term: string } | { refs: null; term: string };

/**
 * Parse each semicolon-separated term of a query individually.
 * Terms containing quoted strings are treated as search terms (refs: null).
 * Used to support mixed valid/invalid reference rendering.
 */
export function parseNavTerms(query: string): NavTermResult[] {
	const terms = normalizeQuery(query)
		.split(/;/)
		.map((t) => t.trim())
		.filter(Boolean);

	return terms.map((term) => {
		if (term.match(/"(.*?)"/) || extractRegexFilter(term) !== null) return { refs: null, term };

		const expanded = expandCrossChapterTrailing(term);
		if (expanded !== null) {
			const refs: NavRef[] = [];
			for (const sub of expanded) {
				const subRef = parseRef(sub);
				if (!subRef) return { refs: null, term };
				refs.push({
					book: subRef.book,
					chapterStart: subRef.chapterStart,
					chapterEnd: subRef.chapterEnd,
					verseSegments: subRef.verseSegments,
					verseStart: subRef.verseStart,
					verseEnd: subRef.verseEnd,
				});
			}
			return { refs, term };
		}

		const ref = parseRef(term);
		if (!ref) return { refs: null, term };
		return {
			refs: [
				{
					book: ref.book,
					chapterStart: ref.chapterStart,
					chapterEnd: ref.chapterEnd,
					verseSegments: ref.verseSegments,
					verseStart: ref.verseStart,
					verseEnd: ref.verseEnd,
				},
			],
			term,
		};
	});
}

/**
 * Returns an array of NavRef for navigation, or null if any term is a search query.
 * Refs are grouped by input term so that cross-chapter trailing expansions
 * (e.g. "Acts 6:8-7:5,47-60" → two refs) stay in the same group.
 */
export function tryParseNavGroups(query: string): NavRef[][] | null {
	const terms = normalizeQuery(query)
		.split(/;/)
		.map((t) => t.trim())
		.filter(Boolean);
	if (!terms.length) return null;

	const groups: NavRef[][] = [];
	for (const term of terms) {
		if (term.match(/"(.*?)"/) || extractRegexFilter(term) !== null) return null;

		const expanded = expandCrossChapterTrailing(term);
		if (expanded !== null) {
			const group: NavRef[] = [];
			for (const sub of expanded) {
				const subRef = parseRef(sub);
				if (!subRef) return null;
				group.push({
					book: subRef.book,
					chapterStart: subRef.chapterStart,
					chapterEnd: subRef.chapterEnd,
					verseSegments: subRef.verseSegments,
					verseStart: subRef.verseStart,
					verseEnd: subRef.verseEnd,
				});
			}
			groups.push(group);
			continue;
		}

		const ref = parseRef(term);
		if (!ref) return null;
		groups.push([
			{
				book: ref.book,
				chapterStart: ref.chapterStart,
				chapterEnd: ref.chapterEnd,
				verseSegments: ref.verseSegments,
				verseStart: ref.verseStart,
				verseEnd: ref.verseEnd,
			},
		]);
	}
	return groups;
}

/**
 * Returns an array of NavRef for navigation, or null if any term is a search query.
 */
export function tryParseNav(query: string): NavRef[] | null {
	const groups = tryParseNavGroups(query);
	return groups ? groups.flat() : null;
}

function escapeRegex(s: string): string {
	return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Detect /pattern/ or /pattern/flags regex search syntax.
 * Returns the compiled RegExp and the optional reference prefix, or null if not matched.
 * Defaults to case-insensitive when no flags are specified.
 */
function extractRegexFilter(term: string): { regex: RegExp; refPart: string } | null {
	// Match optional reference prefix, then /pattern/ with optional trailing flags
	const m = term.match(/^(.*?)\s*\/(.+)\/([gimsuy]*)$/);
	if (!m) return null;
	const flags = m[3] || "i"; // default case-insensitive, consistent with text search
	try {
		const regex = new RegExp(m[2], flags);
		return { regex, refPart: m[1].trim() };
	} catch {
		return null; // Invalid regex syntax — silently ignore
	}
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
		// Check for regex search syntax: /pattern/ or /pattern/flags
		const regexFilter = extractRegexFilter(term);
		let textMatch: ((text: string) => boolean) | null = null;
		let refPart: string;

		if (regexFilter) {
			const { regex } = regexFilter;
			// Reset lastIndex before each call to handle stateful (g/y) regexes correctly
			textMatch = (text) => {
				regex.lastIndex = 0;
				return regex.test(text);
			};
			refPart = regexFilter.refPart;
		} else {
			// Extract an optional quoted text filter from the term
			const quotedMatch = term.match(/"(.*?)"/);
			const rawFilter = quotedMatch && quotedMatch[1].length > 0 ? quotedMatch[1] : null;
			textMatch = rawFilter ? buildTextMatcher(rawFilter) : null;
			refPart = quotedMatch ? term.replace(/"(.*?)"/, "").trim() : term;
		}

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
					const chVerseMax = Math.max(...Object.keys(ch).map(Number));
					// Cross-chapter verse range (e.g. 18:16-19:29)
					if (ref.verseStart !== undefined && ref.verseEnd !== undefined) {
						const vMin = c === ref.chapterStart ? ref.verseStart : 1;
						const vMax = c === ref.chapterEnd ? ref.verseEnd : chVerseMax;
						for (let v = vMin; v <= vMax; v++) {
							const text = ch[String(v)];
							if (!text) continue;
							if (textMatch && !textMatch(text)) continue;
							const k = `${ref.book}:${c}:${v}`;
							if (!seen.has(k)) {
								seen.add(k);
								results.push({ book: ref.book, chapter: c, verse: v, text });
							}
						}
					} else {
						const segments = ref.verseSegments
							? ref.verseSegments
							: [{ start: 1, end: chVerseMax }];
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
	extractRegexFilter,
	extractRegexFilter as _extractRegexFilter,
};
