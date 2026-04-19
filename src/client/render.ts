import type {
	BibleData,
	VerseResult,
	HighlightColor,
	DescriptionData,
	SubheadingsData,
	InterlinearBook,
	InterlinearWord,
	StrongsDict,
	StrongsEntry,
} from "./types.ts";
import type { NavRef } from "./search.ts";
import { escapeRegex } from "./search.ts";
import { displayName, displayNameFor } from "./bookNames.ts";
import { t } from "./i18n.ts";

const $ = (id: string) => document.getElementById(id)!;

let highlightMap = new Map<string, HighlightColor>();

export function setHighlightMap(m: Map<string, HighlightColor>) {
	highlightMap = m;
}

let translationCode = "";

export function setTranslationCode(code: string) {
	translationCode = code;
}

const ICON_COPY = `<svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>`;
const ICON_LINK = `<svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>`;

let descriptions: DescriptionData = [];
let secondaryDescriptions: DescriptionData = [];

export function setDescriptions(d: DescriptionData) {
	descriptions = d;
}

export function setSecondaryDescriptions(d: DescriptionData) {
	secondaryDescriptions = d;
}

interface ChapterStyle {
	paragraphs: number[];
	poetry: Record<string, number>;
	stanzaBreaks: number[];
}

type StyleguideData = Record<string, Record<string, ChapterStyle>>;

let styleguide: StyleguideData = {};

export function setStyleguide(sg: StyleguideData) {
	styleguide = sg;
}

let subheadings: SubheadingsData = {};

export function setSubheadings(sh: SubheadingsData) {
	subheadings = sh;
}

let secondarySubheadings: SubheadingsData = {};

export function setSecondarySubheadings(sh: SubheadingsData) {
	secondarySubheadings = sh;
}

// --- Interlinear state ---
let interlinearEnabled = false;
let interlinearBooks: Map<string, InterlinearBook> = new Map();
let strongsDict: StrongsDict = {};

export function setInterlinearEnabled(enabled: boolean) {
	interlinearEnabled = enabled;
}

export function getInterlinearEnabled(): boolean {
	return interlinearEnabled;
}

export function setInterlinearBook(book: string, data: InterlinearBook) {
	interlinearBooks.set(book, data);
}

export function getInterlinearBook(book: string): InterlinearBook | undefined {
	return interlinearBooks.get(book);
}

export function getInterlinearBooks(): Map<string, InterlinearBook> {
	return interlinearBooks;
}

export function setStrongsDict(dict: StrongsDict) {
	strongsDict = dict;
}

export function getStrongsDict(): StrongsDict {
	return strongsDict;
}

/** Look up the book-level description from a given description dataset. */
function bookDescFrom(descs: DescriptionData, book: string): string {
	const entry = descs.find((b) => b.name === book);
	return entry?.description ?? "";
}

/** Look up the chapter-level description from a given description dataset. */
function chapterDescFrom(descs: DescriptionData, book: string, chapter: number): string {
	const entry = descs.find((b) => b.name === book);
	if (!entry) return "";
	const ch = entry.chapters.find((c) => c.number === chapter);
	return ch?.description ?? "";
}

/** Look up the book-level description for a given English book key. */
function getBookDescription(book: string): string {
	return bookDescFrom(descriptions, book);
}

/** Look up the chapter-level description for a given book and chapter number. */
function getChapterDescription(book: string, chapter: number): string {
	return chapterDescFrom(descriptions, book, chapter);
}

/** Render a description paragraph (book or chapter) as HTML, or empty string if none. */
function descriptionHtml(text: string): string {
	if (!text) return "";
	return `<p class="description">${esc(text)}</p>`;
}

function shareButtonHtml(): string {
	return ` <span class="share-wrap"><button class="share-btn" title="${esc(t().shareWithout)}" aria-label="${esc(t().shareWithout)}">${ICON_LINK}</button><span class="share-dropdown"><button class="share-opt" data-share="with">${esc(t().shareWith)} (${esc(translationCode)})</button><button class="share-opt" data-share="without">${esc(t().shareWithout)}</button></span></span>`;
}

function getHighlightClass(book: string, chapter: number, verse: number): string {
	const color = highlightMap.get(`${book}:${chapter}:${verse}`);
	return color ? ` hl-${color}` : "";
}
const hlClass = getHighlightClass;

function escapeHtml(s: string): string {
	const d = document.createElement("div");
	d.textContent = s;
	return d.innerHTML.replace(/"/g, "&quot;");
}
const esc = escapeHtml;

function formatVerseText(text: string): string {
	let open = true;
	return escapeHtml(text)
		.replace(/\n/g, "<br>")
		.replace(/&quot;/g, () => {
			const q = open ? "&ldquo;" : "&rdquo;";
			open = !open;
			return q;
		});
}
const fmt = formatVerseText;

const escRegex = escapeRegex;

function renderStyledVerses(
	book: string,
	chapter: number,
	nums: number[],
	ch: Record<string, string>,
	secondary = false,
	showSubheadings = true,
): string {
	const sg = styleguide[book]?.[String(chapter)];
	const shSource = secondary ? secondarySubheadings : subheadings;
	const sh = showSubheadings ? shSource[book]?.[String(chapter)] : undefined;
	const parts: string[] = [];
	let mode: "prose" | "poetry" = "prose";
	let poetryLevel = 1;

	for (let i = 0; i < nums.length; i++) {
		const n = nums[i];
		const text = ch[String(n)];
		if (!text) continue;

		// Insert subheading before this verse if one exists
		if (sh) {
			for (const entry of sh) {
				if (entry.v === n) {
					parts.push(`<h3 class="subheading">${esc(entry.t)}</h3>`);
				}
			}
		}

		if (sg) {
			if (sg.stanzaBreaks.includes(n)) {
				parts.push(`<span class="stanza-break"></span>`);
			}
			if (sg.paragraphs.includes(n)) {
				if (i > 0) parts.push(`<span class="para-break"></span>`);
				mode = "prose";
			} else if (sg.poetry[String(n)]) {
				poetryLevel = sg.poetry[String(n)];
				mode = "poetry";
			}
		}

		const poetryClass = sg && mode === "poetry" ? ` poetry-q${poetryLevel}` : "";
		const secAttr = secondary ? ` data-secondary="1"` : "";
		parts.push(
			`<span class="verse${poetryClass}${hlClass(book, chapter, n)}" data-book="${esc(book)}" data-chapter="${chapter}" data-verse="${n}"${secAttr}><sup>${n}</sup>${fmt(text)}</span> `,
		);
	}

	return parts.join("");
}

// --- Interlinear rendering ---

function interlinearToggleHtml(): string {
	if (translationCode !== "KJV") return "";
	const active = interlinearEnabled ? " active" : "";
	return ` <button class="il-toggle-btn${active}" title="${esc(t().interlinearTooltip)}">${esc(t().interlinear)}</button>`;
}

function isHebrew(strongs: string): boolean {
	return strongs.startsWith("h");
}

function renderInterlinearWord(w: InterlinearWord): string {
	const hebrew = isHebrew(w.strongs);
	const dir = hebrew ? ' dir="rtl"' : "";
	const originalClass = hebrew ? "il-original il-hebrew" : "il-original il-greek";
	const morphHtml = w.morph ? `<span class="il-morph">${esc(w.morph)}</span>` : "";
	return (
		`<span class="il-word" data-strongs="${esc(w.strongs)}">` +
		`<span class="il-english">${esc(w.english)}</span>` +
		`<span class="${originalClass}"${dir}>${esc(w.original)}</span>` +
		`<span class="il-translit">${esc(w.translit)}</span>` +
		`<span class="il-strongs">${esc(w.strongs.toUpperCase())}</span>` +
		morphHtml +
		`</span>`
	);
}

function renderInterlinearVerse(
	book: string,
	chapter: number,
	verse: number,
	words: InterlinearWord[],
): string {
	let html = `<div class="il-verse" data-book="${esc(book)}" data-chapter="${chapter}" data-verse="${verse}">`;
	html += `<span class="il-verse-num"><sup>${verse}</sup></span>`;
	html += `<div class="il-row">`;
	for (const w of words) {
		html += renderInterlinearWord(w);
	}
	html += `</div></div>`;
	return html;
}

function renderInterlinearChapterVerses(
	book: string,
	chapter: number,
	nums: number[],
	ilChapter: Record<string, InterlinearWord[]>,
): string {
	const parts: string[] = [];
	const sh = subheadings[book]?.[String(chapter)];
	for (const n of nums) {
		if (sh) {
			for (const entry of sh) {
				if (entry.v === n) {
					parts.push(`<h3 class="subheading">${esc(entry.t)}</h3>`);
				}
			}
		}
		const words = ilChapter[String(n)];
		if (words) {
			parts.push(renderInterlinearVerse(book, chapter, n, words));
		}
	}
	return parts.join("");
}

/** Generate HTML for the Strong's definition panel (rendered once, populated via JS). */
export function renderStrongsPanel(entry: StrongsEntry, strongsId: string): string {
	const s = t();
	let html = `<div class="strongs-panel-header">`;
	html += `<strong>${esc(strongsId.toUpperCase())}</strong>`;
	html += `<button class="strongs-close" title="${esc(s.closePanel)}">&times;</button>`;
	html += `</div>`;
	html += `<div class="strongs-panel-body">`;
	html += `<p class="strongs-def">${esc(entry.d)}</p>`;
	if (entry.p)
		html += `<p class="strongs-field"><strong>${esc(s.pronunciation)}:</strong> ${esc(entry.p)}</p>`;
	if (entry.s)
		html += `<p class="strongs-field"><strong>${esc(s.partOfSpeech)}:</strong> ${esc(entry.s)}</p>`;
	if (entry.r) {
		// entry.r format: "derivation info|English: word1, word2"
		const rParts = entry.r.split("|");
		const derivation = rParts[0]?.trim();
		const english = rParts[1]?.trim();
		if (derivation)
			html += `<p class="strongs-field"><strong>${esc(s.crossReferences)}:</strong> ${esc(derivation)}</p>`;
		if (english) {
			const engMatch = english.match(/^English:\s*(.*)$/);
			if (engMatch) {
				html += `<p class="strongs-field"><strong>English:</strong> ${esc(engMatch[1])}</p>`;
			} else {
				html += `<p class="strongs-field">${esc(english)}</p>`;
			}
		}
	}
	html += `<p class="strongs-field" style="margin-top:12px"><a href="./dictionary.html#${encodeURIComponent(strongsId.toLowerCase())}" style="color:var(--verse-num);font-family:var(--sans);font-size:13px">View in Dictionary →</a></p>`;
	html += `</div>`;
	return html;
}

interface NavTarget {
	book: string;
	chapter: number;
	verse?: number;
	label: string;
	shortLabel: string;
}

function getBookNav(
	data: BibleData,
	book: string,
): { prev: NavTarget | null; next: NavTarget | null } {
	const books = Object.keys(data);
	const bi = books.indexOf(book);
	const prev =
		bi > 0
			? {
					book: books[bi - 1],
					chapter: 0,
					label: displayName(books[bi - 1]),
					shortLabel: displayName(books[bi - 1]),
				}
			: null;
	const next =
		bi < books.length - 1
			? {
					book: books[bi + 1],
					chapter: 0,
					label: displayName(books[bi + 1]),
					shortLabel: displayName(books[bi + 1]),
				}
			: null;
	return { prev, next };
}

function getChapterNav(
	data: BibleData,
	book: string,
	chapter: number,
): { prev: NavTarget | null; next: NavTarget | null } {
	const books = Object.keys(data);
	const bi = books.indexOf(book);
	const chapters = Object.keys(data[book])
		.map(Number)
		.sort((a, b) => a - b);
	const ci = chapters.indexOf(chapter);

	let prev: NavTarget | null = null;
	let next: NavTarget | null = null;

	if (ci > 0) {
		prev = {
			book,
			chapter: chapters[ci - 1],
			label: `${displayName(book)} ${chapters[ci - 1]}`,
			shortLabel: `${chapters[ci - 1]}`,
		};
	} else if (bi > 0) {
		const pb = books[bi - 1];
		const pChs = Object.keys(data[pb])
			.map(Number)
			.sort((a, b) => a - b);
		const lastCh = pChs[pChs.length - 1];
		prev = {
			book: pb,
			chapter: lastCh,
			label: `${displayName(pb)} ${lastCh}`,
			shortLabel: `${displayName(pb)} ${lastCh}`,
		};
	}

	if (ci < chapters.length - 1) {
		next = {
			book,
			chapter: chapters[ci + 1],
			label: `${displayName(book)} ${chapters[ci + 1]}`,
			shortLabel: `${chapters[ci + 1]}`,
		};
	} else if (bi < books.length - 1) {
		const nb = books[bi + 1];
		const nChs = Object.keys(data[nb])
			.map(Number)
			.sort((a, b) => a - b);
		next = {
			book: nb,
			chapter: nChs[0],
			label: `${displayName(nb)} ${nChs[0]}`,
			shortLabel: `${displayName(nb)} ${nChs[0]}`,
		};
	}

	return { prev, next };
}

function getVerseNav(
	data: BibleData,
	book: string,
	chapter: number,
	verse: number,
): { prev: NavTarget | null; next: NavTarget | null } {
	const books = Object.keys(data);
	const bi = books.indexOf(book);
	const chapters = Object.keys(data[book])
		.map(Number)
		.sort((a, b) => a - b);
	const ci = chapters.indexOf(chapter);
	const verses = Object.keys(data[book][String(chapter)])
		.map(Number)
		.sort((a, b) => a - b);
	const vi = verses.indexOf(verse);

	let prev: NavTarget | null = null;
	let next: NavTarget | null = null;

	if (vi > 0) {
		prev = {
			book,
			chapter,
			verse: verses[vi - 1],
			label: `${displayName(book)} ${chapter}:${verses[vi - 1]}`,
			shortLabel: `${chapter}:${verses[vi - 1]}`,
		};
	} else if (ci > 0) {
		const pc = chapters[ci - 1];
		const pVs = Object.keys(data[book][String(pc)])
			.map(Number)
			.sort((a, b) => a - b);
		const lastV = pVs[pVs.length - 1];
		prev = {
			book,
			chapter: pc,
			verse: lastV,
			label: `${displayName(book)} ${pc}:${lastV}`,
			shortLabel: `${pc}:${lastV}`,
		};
	} else if (bi > 0) {
		const pb = books[bi - 1];
		const pChs = Object.keys(data[pb])
			.map(Number)
			.sort((a, b) => a - b);
		const lastCh = pChs[pChs.length - 1];
		const pVs = Object.keys(data[pb][String(lastCh)])
			.map(Number)
			.sort((a, b) => a - b);
		const lastV = pVs[pVs.length - 1];
		prev = {
			book: pb,
			chapter: lastCh,
			verse: lastV,
			label: `${displayName(pb)} ${lastCh}:${lastV}`,
			shortLabel: `${displayName(pb)} ${lastCh}:${lastV}`,
		};
	}

	if (vi < verses.length - 1) {
		next = {
			book,
			chapter,
			verse: verses[vi + 1],
			label: `${displayName(book)} ${chapter}:${verses[vi + 1]}`,
			shortLabel: `${chapter}:${verses[vi + 1]}`,
		};
	} else if (ci < chapters.length - 1) {
		const nc = chapters[ci + 1];
		const nVs = Object.keys(data[book][String(nc)])
			.map(Number)
			.sort((a, b) => a - b);
		next = {
			book,
			chapter: nc,
			verse: nVs[0],
			label: `${displayName(book)} ${nc}:${nVs[0]}`,
			shortLabel: `${nc}:${nVs[0]}`,
		};
	} else if (bi < books.length - 1) {
		const nb = books[bi + 1];
		const nChs = Object.keys(data[nb])
			.map(Number)
			.sort((a, b) => a - b);
		const nVs = Object.keys(data[nb][String(nChs[0])])
			.map(Number)
			.sort((a, b) => a - b);
		next = {
			book: nb,
			chapter: nChs[0],
			verse: nVs[0],
			label: `${displayName(nb)} ${nChs[0]}:${nVs[0]}`,
			shortLabel: `${displayName(nb)} ${nChs[0]}:${nVs[0]}`,
		};
	}

	return { prev, next };
}

function navArrowsHtml(
	prev: NavTarget | null,
	next: NavTarget | null,
	showTranslation = true,
): string {
	const prevBtn = prev
		? `<a class="nav-arrow nav-prev" title="${esc(prev.label)}" data-book="${esc(prev.book)}"${prev.chapter ? ` data-chapter="${prev.chapter}"` : ""}${prev.verse !== undefined ? ` data-verse="${prev.verse}"` : ""}>&lsaquo;</a>`
		: `<span class="nav-arrow nav-prev nav-disabled">&lsaquo;</span>`;
	const nextBtn = next
		? `<a class="nav-arrow nav-next" title="${esc(next.label)}" data-book="${esc(next.book)}"${next.chapter ? ` data-chapter="${next.chapter}"` : ""}${next.verse !== undefined ? ` data-verse="${next.verse}"` : ""}>&rsaquo;</a>`
		: `<span class="nav-arrow nav-next nav-disabled"></span>`;
	const mid = showTranslation ? `<span class="nav-translation">&DoubleRightArrow;</span>` : "";
	return `<nav class="chapter-nav">${prevBtn}${mid}${nextBtn}</nav>`;
}

export function renderChapter(data: BibleData, book: string, chapter: number) {
	const ch = data[book]?.[String(chapter)];
	if (!ch) {
		$("content").innerHTML = `<p class="empty">${t().notFound}</p>`;
		return;
	}

	const { prev, next } = getChapterNav(data, book, chapter);
	const nums = Object.keys(ch)
		.map(Number)
		.sort((a, b) => a - b);
	let html = navArrowsHtml(prev, next);
	html += `<div class="print-translation-label"><span class="nav-translation"></span></div>`;
	html += `<h2 class="section-title">${esc(displayName(book))} ${chapter} <button class="copy-btn" title="Copy text" data-copy-book="${esc(book)}" data-copy-chapter="${chapter}">${ICON_COPY}</button>${shareButtonHtml()}${interlinearToggleHtml()}</h2>`;
	if (chapter === 1) html += descriptionHtml(getBookDescription(book));
	html += descriptionHtml(getChapterDescription(book, chapter));

	const ilBook = interlinearEnabled ? interlinearBooks.get(book) : undefined;
	const ilChapter = ilBook?.[String(chapter)];
	if (ilChapter) {
		html += `<div class="verses il-verses">`;
		html += renderInterlinearChapterVerses(book, chapter, nums, ilChapter);
		html += `</div>`;
	} else {
		html += `<div class="verses">`;
		html += renderStyledVerses(book, chapter, nums, ch);
		html += `</div>`;
	}
	html += navArrowsHtml(prev, next, false);
	$("content").innerHTML = html;
	window.scrollTo(0, 0);
}

export function renderBook(data: BibleData, book: string) {
	const bd = data[book];
	if (!bd) {
		$("content").innerHTML = `<p class="empty">${t().notFound}</p>`;
		return;
	}

	const chs = Object.keys(bd)
		.map(Number)
		.sort((a, b) => a - b);
	const { prev, next } = getBookNav(data, book);
	let html = navArrowsHtml(prev, next);
	html += `<div class="print-translation-label"><span class="nav-translation"></span></div>`;
	html += `<h1 class="book-title">${esc(displayName(book))}${interlinearToggleHtml()}</h1>`;
	html += descriptionHtml(getBookDescription(book));
	const ilBook = interlinearEnabled ? interlinearBooks.get(book) : undefined;
	for (const c of chs) {
		const verses = bd[String(c)];
		const nums = Object.keys(verses)
			.map(Number)
			.sort((a, b) => a - b);
		const ilChapter = ilBook?.[String(c)];
		html += `<div class="chapter-block"><h2 class="chapter-heading" data-book="${esc(book)}" data-chapter="${c}">${t().chapter} ${c}</h2>`;
		html += descriptionHtml(getChapterDescription(book, c));
		if (ilChapter) {
			html += `<div class="verses il-verses">`;
			html += renderInterlinearChapterVerses(book, c, nums, ilChapter);
		} else {
			html += `<div class="verses">`;
			html += renderStyledVerses(book, c, nums, verses);
		}
		html += `</div></div>`;
	}
	html += navArrowsHtml(prev, next, false);
	$("content").innerHTML = html;
	window.scrollTo(0, 0);
}

export function renderVerse(data: BibleData, book: string, chapter: number, verse: number) {
	const text = data[book]?.[String(chapter)]?.[String(verse)];
	if (!text) {
		$("content").innerHTML = `<p class="empty">${t().notFound}</p>`;
		return;
	}

	const { prev, next } = getVerseNav(data, book, chapter, verse);
	const ilBook = interlinearEnabled ? interlinearBooks.get(book) : undefined;
	const ilWords = ilBook?.[String(chapter)]?.[String(verse)];

	let verseHtml: string;
	if (ilWords) {
		verseHtml = `<div class="verses il-verses single-verse">${renderInterlinearVerse(book, chapter, verse, ilWords)}</div>`;
	} else {
		verseHtml = `<div class="verses single-verse"><span class="verse${hlClass(book, chapter, verse)}" data-book="${esc(book)}" data-chapter="${chapter}" data-verse="${verse}"><sup>${verse}</sup>${fmt(text)}</span></div>`;
	}

	$("content").innerHTML = `
    ${navArrowsHtml(prev, next)}    <div class="print-translation-label"><span class="nav-translation"></span></div>    <h2 class="section-title">${esc(displayName(book))} ${chapter}:${verse} <button class="copy-btn" title="Copy text" data-copy-book="${esc(book)}" data-copy-chapter="${chapter}" data-copy-verse="${verse}">${ICON_COPY}</button>${shareButtonHtml()}${interlinearToggleHtml()}</h2>
    ${verseHtml}
    <div class="read-full-chapter"><a class="full-chapter-link" data-book="${esc(book)}" data-chapter="${chapter}">${t().readFullChapter} &rarr;</a></div>`;
	window.scrollTo(0, 0);
}

export function renderChapterRange(
	data: BibleData,
	book: string,
	chStart: number,
	chEnd: number,
	verseStart?: number,
	verseEnd?: number,
) {
	const bd = data[book];
	if (!bd) {
		$("content").innerHTML = `<p class="empty">${t().notFound}</p>`;
		return;
	}

	const { prev } = getChapterNav(data, book, chStart);
	const { next } = getChapterNav(data, book, chEnd);
	const ilBook = interlinearEnabled ? interlinearBooks.get(book) : undefined;
	let html = navArrowsHtml(prev, next);
	html += `<div class="print-translation-label"><span class="nav-translation"></span></div>`;
	// For cross-chapter verse ranges (e.g. Gen 18:16-19:29), emit a titled section heading
	if (verseStart !== undefined && verseEnd !== undefined) {
		const rangeLabel = `${displayName(book)} ${chStart}:${verseStart}\u2013${chEnd}:${verseEnd}`;
		html += `<h2 class="section-title">${esc(rangeLabel)} <button class="copy-btn" title="Copy text" data-copy-book="${esc(book)}" data-copy-chapter="${chStart}" data-copy-chapter-end="${chEnd}" data-copy-verse-start="${verseStart}" data-copy-verse-end="${verseEnd}">${ICON_COPY}</button>${shareButtonHtml()}</h2>`;
	} else {
		// Plain chapter range (e.g. Genesis 1-2): emit a section heading with copy/share
		const rangeLabel = `${displayName(book)} ${chStart}\u2013${chEnd}`;
		html += `<h2 class="section-title">${esc(rangeLabel)} <button class="copy-btn" title="Copy text" data-copy-book="${esc(book)}" data-copy-chapter="${chStart}" data-copy-chapter-end="${chEnd}">${ICON_COPY}</button>${shareButtonHtml()}</h2>`;
	}
	const ilToggle = interlinearToggleHtml();
	if (ilToggle) html += `<div style="text-align:center;margin: 10px 0;">${ilToggle}</div>`;
	for (let c = chStart; c <= chEnd; c++) {
		const ch = bd[String(c)];
		if (!ch) continue;
		let nums = Object.keys(ch)
			.map(Number)
			.sort((a, b) => a - b);
		// Apply verse bounds for cross-chapter verse ranges (e.g. Gen 18:16-19:29)
		if (verseStart !== undefined && c === chStart) nums = nums.filter((n) => n >= verseStart);
		if (verseEnd !== undefined && c === chEnd) nums = nums.filter((n) => n <= verseEnd);
		html += `<div class="chapter-block"><h2 class="chapter-heading" data-book="${esc(book)}" data-chapter="${c}">${esc(displayName(book))} ${c}</h2>`;
		if (c === chStart) html += descriptionHtml(getBookDescription(book));
		html += descriptionHtml(getChapterDescription(book, c));
		const ilChapter = ilBook?.[String(c)];
		if (ilChapter) {
			html += `<div class="verses il-verses">`;
			html += renderInterlinearChapterVerses(book, c, nums, ilChapter);
		} else {
			html += `<div class="verses">`;
			html += renderStyledVerses(book, c, nums, ch);
		}
		html += `</div></div>`;
	}
	html += navArrowsHtml(prev, next, false);
	$("content").innerHTML = html;
	window.scrollTo(0, 0);
}

export function renderVerseSegments(
	data: BibleData,
	book: string,
	chapter: number,
	segments: { start: number; end: number }[],
) {
	const ch = data[book]?.[String(chapter)];
	if (!ch) {
		$("content").innerHTML = `<p class="empty">${t().notFound}</p>`;
		return;
	}

	// Build title label like "Genesis 8:1-3,6"
	const segLabel = segments
		.map((s) => (s.start === s.end ? `${s.start}` : `${s.start}-${s.end}`))
		.join(",");
	const title = `${displayName(book)} ${chapter}:${segLabel}`;

	let html = `<div class="print-translation-label"><span class="nav-translation"></span></div>`;
	html += `<div class="translation-label"><span class="nav-translation"></span></div>`;
	const segNums: number[] = [];
	for (const seg of segments) for (let v = seg.start; v <= seg.end; v++) segNums.push(v);
	html += `<h2 class="section-title">${esc(title)} <button class="copy-btn" title="Copy text" data-copy-book="${esc(book)}" data-copy-chapter="${chapter}" data-copy-segments="${esc(segLabel)}">${ICON_COPY}</button>${shareButtonHtml()}${interlinearToggleHtml()}</h2>`;

	const ilBook = interlinearEnabled ? interlinearBooks.get(book) : undefined;
	const ilChapter = ilBook?.[String(chapter)];
	if (ilChapter) {
		html += `<div class="verses il-verses">`;
		html += renderInterlinearChapterVerses(book, chapter, segNums, ilChapter);
	} else {
		html += `<div class="verses">`;
		html += renderStyledVerses(book, chapter, segNums, ch);
	}
	html += `</div>`;
	html += `<div class="read-full-chapter"><a class="full-chapter-link" data-book="${esc(book)}" data-chapter="${chapter}">${t().readFullChapter} &rarr;</a></div>`;
	$("content").innerHTML = html;
	window.scrollTo(0, 0);
}
export function navRefLabel(nav: NavRef): string {
	const { book, chapterStart, chapterEnd, verseSegments, verseStart, verseEnd } = nav;
	if (chapterStart !== undefined && chapterEnd !== undefined) {
		if (verseStart !== undefined && verseEnd !== undefined) {
			return `${displayName(book)} ${chapterStart}:${verseStart}-${chapterEnd}:${verseEnd}`;
		}
		if (verseSegments) {
			const segLabel = verseSegments
				.map((s) => (s.start === s.end ? `${s.start}` : `${s.start}-${s.end}`))
				.join(",");
			return `${displayName(book)} ${chapterStart}:${segLabel}`;
		}
		if (chapterStart === chapterEnd) return `${displayName(book)} ${chapterStart}`;
		return `${displayName(book)} ${chapterStart}-${chapterEnd}`;
	}
	return displayName(book);
}

function navRefVersesHtml(data: BibleData, nav: NavRef): string {
	const { book, chapterStart, chapterEnd, verseSegments, verseStart, verseEnd } = nav;
	const bd = data[book];
	if (!bd) return "";

	let html = "";

	if (chapterStart !== undefined && chapterEnd !== undefined) {
		if (verseSegments) {
			const ch = bd[String(chapterStart)];
			if (!ch) return "";
			const segNums: number[] = [];
			for (const seg of verseSegments)
				for (let v = seg.start; v <= seg.end; v++) segNums.push(v);
			html += `<div class="verses">`;
			html += renderStyledVerses(book, chapterStart, segNums, ch);
			html += `</div>`;
		} else {
			for (let c = chapterStart; c <= chapterEnd; c++) {
				const ch = bd[String(c)];
				if (!ch) continue;
				let nums = Object.keys(ch)
					.map(Number)
					.sort((a, b) => a - b);
				// Apply verse bounds for cross-chapter verse ranges
				if (verseStart !== undefined && c === chapterStart)
					nums = nums.filter((n) => n >= verseStart);
				if (verseEnd !== undefined && c === chapterEnd)
					nums = nums.filter((n) => n <= verseEnd);
				if (chapterStart !== chapterEnd) {
					html += `<h3 class="multi-nav-subheading">${esc(displayName(book))} ${c}</h3>`;
				}
				html += `<div class="verses">`;
				html += renderStyledVerses(book, c, nums, ch);
				html += `</div>`;
			}
		}
	} else {
		// Whole book → show chapter 1
		const ch = bd["1"];
		if (!ch) return "";
		const nums = Object.keys(ch)
			.map(Number)
			.sort((a, b) => a - b);
		html += `<div class="verses">`;
		html += renderStyledVerses(book, 1, nums, ch);
		html += `</div>`;
	}

	return html;
}

export function renderMultiNav(data: BibleData, refs: NavRef[]) {
	let html = '<div class="translation-label"><span class="nav-translation"></span></div>';
	for (let i = 0; i < refs.length; i++) {
		if (i > 0) html += `<hr class="multi-nav-divider">`;
		html += `<section class="multi-nav-section">`;
		html += `<h2 class="section-title">${esc(navRefLabel(refs[i]))}</h2>`;
		html += navRefVersesHtml(data, refs[i]);
		const ch = refs[i].chapterStart ?? 1;
		html += `<div class="read-full-chapter"><a class="full-chapter-link" data-book="${esc(refs[i].book)}" data-chapter="${ch}">${t().readFullChapter} &rarr;</a></div>`;
		html += `</section>`;
	}
	$("content").innerHTML = html;
	window.scrollTo(0, 0);
}
const RESULTS_PAGE_SIZE = 50;

export function renderResults(results: VerseResult[], query: string) {
	if (!results.length) {
		$("content").innerHTML = `<p class="empty">${t().noResults(esc(query))}</p>`;
		return;
	}

	const terms = query
		.split(/;/)
		.map((t) => t.trim())
		.filter(Boolean);
	const highlights: string[] = [];
	for (const t of terms) {
		const m = t.match(/"(.+?)"/);
		if (!m) continue;
		let raw = m[1];
		// Strip ^/$ anchors — they control matching, not literal text
		raw = raw.replace(/^\^/, "").replace(/\$$/, "");
		if (raw.length >= 2) highlights.push(raw);
	}

	// Build a single combined regex to avoid corrupting <mark> tags across passes
	const hlRegex = highlights.length
		? new RegExp(`(${highlights.map((h) => escRegex(esc(h))).join("|")})`, "gi")
		: null;

	let shown = 0;

	function renderResultItem(r: VerseResult): string {
		let highlighted = fmt(r.text);
		if (hlRegex) highlighted = highlighted.replace(hlRegex, "<mark>$1</mark>");
		return `<div class="result" data-book="${esc(r.book)}" data-chapter="${r.chapter}" data-verse="${r.verse}">
      <div class="result-ref">${esc(displayName(r.book))} ${r.chapter}:${r.verse}</div>
      <div class="result-text">${highlighted}</div>
    </div>`;
	}

	function showMore() {
		const container = document.querySelector(".results");
		if (!container) return;
		const end = Math.min(shown + RESULTS_PAGE_SIZE, results.length);
		const parts: string[] = [];
		for (let i = shown; i < end; i++) {
			parts.push(renderResultItem(results[i]));
		}
		// Remove existing "Show more" button if present
		const existingBtn = document.getElementById("show-more-btn");
		if (existingBtn) existingBtn.remove();

		container.insertAdjacentHTML("beforeend", parts.join(""));
		shown = end;

		if (shown < results.length) {
			const remaining = results.length - shown;
			container.insertAdjacentHTML("afterend", "");
			const btn = document.createElement("button");
			btn.id = "show-more-btn";
			btn.className = "show-more-btn";
			btn.textContent = `${t().showMore} (${remaining})`;
			btn.addEventListener("click", showMore);
			container.parentElement?.appendChild(btn);
		}
	}

	const parts: string[] = [
		`<p class="results-info">${t().resultCount(results.length)}</p><div class="results">`,
	];
	const end = Math.min(RESULTS_PAGE_SIZE, results.length);
	for (let i = 0; i < end; i++) {
		parts.push(renderResultItem(results[i]));
	}
	parts.push(`</div>`);
	shown = end;

	if (shown < results.length) {
		const remaining = results.length - shown;
		parts.push(
			`<button id="show-more-btn" class="show-more-btn">${t().showMore} (${remaining})</button>`,
		);
	}

	$("content").innerHTML = parts.join("");

	// Wire up the "Show more" button if it was rendered
	const btn = document.getElementById("show-more-btn");
	if (btn) btn.addEventListener("click", showMore);

	window.scrollTo(0, 0);
}

export function renderIndex(
	data: BibleData,
	callbacks: {
		onBook: (book: string) => void;
		onChapter: (book: string, chapter: number) => void;
		onVerse: (book: string, chapter: number, verse: number) => void;
	},
) {
	const booksCol = $("idx-books");
	const chapsCol = $("idx-chapters");
	const versesCol = $("idx-verses");

	booksCol.innerHTML = "";
	chapsCol.innerHTML = "";
	versesCol.innerHTML = "";

	booksCol.dataset.label = t().idxBooksLabel;
	chapsCol.dataset.label = t().idxChaptersLabel;
	versesCol.dataset.label = t().idxVersesLabel;

	let activeBook = "";

	function showVerses(book: string, chapter: number) {
		versesCol.innerHTML = "";
		const vs = Object.keys(data[book][String(chapter)])
			.map(Number)
			.sort((a, b) => a - b);
		for (const v of vs) {
			const vEl = document.createElement("div");
			vEl.className = "idx-item idx-verse";
			vEl.tabIndex = -1;
			const text = data[book][String(chapter)][String(v)];
			const p = text.substring(0, 50).replace(/\n/g, " ");
			vEl.textContent = `${v}. ${p}${text.length > 50 ? "\u2026" : ""}`;
			vEl.title = text.replace(/\n/g, " ");
			vEl.addEventListener("click", (e) => {
				e.stopPropagation();
				callbacks.onVerse(book, chapter, v);
			});
			versesCol.appendChild(vEl);
		}
	}

	function showChapters(book: string) {
		if (activeBook === book) return;
		activeBook = book;

		booksCol.querySelectorAll(".idx-item").forEach((e) => e.classList.remove("active"));
		const bookEl = booksCol.querySelector(`[data-book="${book}"]`);
		if (bookEl) bookEl.classList.add("active");

		chapsCol.innerHTML = "";
		versesCol.innerHTML = "";

		const chs = Object.keys(data[book])
			.map(Number)
			.sort((a, b) => a - b);
		for (const c of chs) {
			const chEl = document.createElement("div");
			chEl.className = "idx-item idx-chapter";
			chEl.dataset.chapter = String(c);
			chEl.tabIndex = -1;
			const chDesc = getChapterDescription(book, c);
			const preview =
				chDesc || (data[book][String(c)]?.["1"] || "").substring(0, 60).replace(/\n/g, " ");
			const ellipsis = chDesc
				? chDesc.length > 60
					? "\u2026"
					: ""
				: (data[book][String(c)]?.["1"] || "").length > 60
					? "\u2026"
					: "";
			const displayPreview = chDesc ? chDesc.substring(0, 60) : preview;
			chEl.innerHTML = `<strong>${t().chapter} ${c}</strong><small>${esc(displayPreview)}${ellipsis}</small>`;
			if (chDesc) chEl.title = chDesc;

			chEl.addEventListener("mouseenter", () => {
				chapsCol.querySelectorAll(".idx-item").forEach((e) => e.classList.remove("active"));
				chEl.classList.add("active");
				showVerses(book, c);
			});

			chEl.addEventListener("click", (e) => {
				e.stopPropagation();
				callbacks.onChapter(book, c);
			});
			chapsCol.appendChild(chEl);
		}

		// Default: activate first chapter
		const firstChEl = chapsCol.querySelector(".idx-item") as HTMLElement | null;
		if (firstChEl && chs.length > 0) {
			firstChEl.classList.add("active");
			showVerses(book, chs[0]);
		}
	}

	const DC_BOOKS = new Set([
		"Tobit",
		"Judith",
		"Esther (Greek)",
		"Wisdom",
		"Sirach",
		"Baruch",
		"Prayer of Azariah",
		"Susanna",
		"Bel and the Dragon",
		"1 Maccabees",
		"2 Maccabees",
		"1 Esdras",
		"Prayer of Manasses",
		"Additional Psalm",
		"3 Maccabees",
		"2 Esdras",
		"4 Maccabees",
		"Laodiceans",
	]);

	const books = Object.keys(data);
	let addedNtLabel = false;
	let addedDcLabel = false;
	const otLabel = document.createElement("div");
	otLabel.className = "idx-section-label";
	otLabel.textContent = t().oldTestament;
	booksCol.appendChild(otLabel);

	for (const book of books) {
		if (!addedDcLabel && DC_BOOKS.has(book)) {
			addedDcLabel = true;
			const dcLabel = document.createElement("div");
			dcLabel.className = "idx-section-label";
			dcLabel.textContent = t().deuterocanonical;
			booksCol.appendChild(dcLabel);
		}
		if (book === "Matthew" && !addedNtLabel) {
			addedNtLabel = true;
			const ntLabel = document.createElement("div");
			ntLabel.className = "idx-section-label";
			ntLabel.textContent = t().newTestament;
			booksCol.appendChild(ntLabel);
		}
		const el = document.createElement("div");
		el.className = "idx-item";
		el.dataset.book = book;
		el.textContent = displayName(book);
		el.tabIndex = -1;

		el.addEventListener("mouseenter", () => showChapters(book));
		el.addEventListener("click", () => callbacks.onBook(book));
		booksCol.appendChild(el);
	}

	// Default: activate first book
	if (books.length > 0) {
		showChapters(books[0]);
	}

	/** Scroll the index panel to a specific book/chapter/verse. */
	function scrollTo(book?: string, chapter?: number, verse?: number) {
		if (!book || !data[book]) return;

		// Force showChapters even if same book (reset activeBook so it rebuilds)
		activeBook = "";
		showChapters(book);

		// Scroll book item into view
		const bookEl = booksCol.querySelector(`[data-book="${book}"]`) as HTMLElement | null;
		if (bookEl) bookEl.scrollIntoView({ block: "center" });

		if (chapter !== undefined) {
			const chEl = chapsCol.querySelector(
				`[data-chapter="${chapter}"]`,
			) as HTMLElement | null;
			if (chEl) {
				chapsCol.querySelectorAll(".idx-item").forEach((e) => e.classList.remove("active"));
				chEl.classList.add("active");
				chEl.scrollIntoView({ block: "center" });
				showVerses(book, chapter);
			}

			if (verse !== undefined) {
				// Verse items don't have data attributes, find by text prefix
				const verseItems = versesCol.querySelectorAll(".idx-item");
				for (const vEl of verseItems) {
					if ((vEl as HTMLElement).textContent?.startsWith(`${verse}. `)) {
						(vEl as HTMLElement).scrollIntoView({ block: "center" });
						break;
					}
				}
			}
		}
	}

	// --- Keyboard navigation ---
	const cols = [booksCol, chapsCol, versesCol];
	let focusedCol = 0;

	function getItems(col: HTMLElement): HTMLElement[] {
		return Array.from(col.querySelectorAll(".idx-item"));
	}

	function focusItem(col: HTMLElement, index: number) {
		const items = getItems(col);
		if (!items.length) return;
		const i = Math.max(0, Math.min(index, items.length - 1));
		items[i].focus();
	}

	function getActiveIndex(col: HTMLElement): number {
		const items = getItems(col);
		const active = col.querySelector(".idx-item:focus") as HTMLElement;
		return active ? items.indexOf(active) : -1;
	}

	function getPanel(): HTMLElement | null {
		return document.getElementById("index-panel");
	}

	getPanel()?.addEventListener("keydown", (e) => {
		const key = e.key;
		const col = cols[focusedCol];

		if (key === "ArrowDown" || key === "ArrowUp") {
			e.preventDefault();
			const items = getItems(col);
			if (!items.length) return;
			let idx = getActiveIndex(col);
			if (idx === -1) {
				idx = 0;
			} else if (key === "ArrowDown") {
				if (idx >= items.length - 1) return;
				idx++;
			} else {
				if (idx <= 0) return;
				idx--;
			}
			items[idx].focus();
			// Trigger hover-equivalent behavior
			if (col === booksCol) {
				const book = items[idx]?.dataset.book;
				if (book) showChapters(book);
			} else if (col === chapsCol) {
				chapsCol
					.querySelectorAll(".idx-item")
					.forEach((el) => el.classList.remove("active"));
				items[idx].classList.add("active");
				const chNum = items[idx].dataset.chapter;
				if (chNum && activeBook) showVerses(activeBook, Number(chNum));
			}
			return;
		}

		if (key === "ArrowRight" || (key === "Tab" && !e.shiftKey)) {
			e.preventDefault();
			if (focusedCol < 2 && getItems(cols[focusedCol + 1]).length) {
				focusedCol++;
				const active = cols[focusedCol].querySelector(".idx-item.active") as HTMLElement;
				if (active) active.focus();
				else focusItem(cols[focusedCol], 0);
			}
			return;
		}

		if (key === "ArrowLeft" || (key === "Tab" && e.shiftKey)) {
			e.preventDefault();
			if (focusedCol > 0) {
				focusedCol--;
				const active = cols[focusedCol].querySelector(".idx-item.active") as HTMLElement;
				if (active) active.focus();
				else focusItem(cols[focusedCol], 0);
			}
			return;
		}

		if (key === "Enter") {
			e.preventDefault();
			const focused = col.querySelector(".idx-item:focus") as HTMLElement;
			if (focused) focused.click();
			return;
		}
	});

	// Track which column has focus
	for (let i = 0; i < cols.length; i++) {
		cols[i].addEventListener("focusin", () => {
			focusedCol = i;
		});
	}

	return { scrollTo };
}

// --- Parallel translation rendering ---

export function renderParallelChapter(
	primary: BibleData,
	secondary: BibleData,
	book: string,
	chapter: number,
	primaryLabel: string,
	secondaryLabel: string,
) {
	const ch1 = primary[book]?.[String(chapter)];
	const ch2 = secondary[book]?.[String(chapter)];
	if (!ch1) {
		$("content").innerHTML = `<p class="empty">${t().notFound}</p>`;
		return;
	}

	const { prev, next } = getChapterNav(primary, book, chapter);
	const nums = Object.keys(ch1)
		.map(Number)
		.sort((a, b) => a - b);

	let html = navArrowsHtml(prev, next);
	html += `<div class="parallel-copy-both"><button class="copy-btn" title="Copy both" data-copy-book="${esc(book)}" data-copy-chapter="${chapter}" data-copy-source="both">${ICON_COPY}</button>${shareButtonHtml()}</div>`;
	html += `<div class="parallel-container">`;

	// Primary column
	html += `<div class="parallel-col"><div class="parallel-translation-label">${esc(primaryLabel)}</div>`;
	html += `<h2 class="section-title">${esc(displayNameFor(primaryLabel, book))} ${chapter} <button class="copy-btn" title="Copy text" data-copy-book="${esc(book)}" data-copy-chapter="${chapter}" data-copy-source="primary">${ICON_COPY}</button></h2>`;
	if (chapter === 1) html += descriptionHtml(getBookDescription(book));
	html += descriptionHtml(getChapterDescription(book, chapter));
	html += `<div class="verses">`;
	html += renderStyledVerses(book, chapter, nums, ch1);
	html += `</div></div>`;

	// Secondary column
	html += `<div class="parallel-col"><div class="parallel-translation-label">${esc(secondaryLabel)}</div>`;
	html += `<h2 class="section-title">${esc(displayNameFor(secondaryLabel, book))} ${chapter} <button class="copy-btn" title="Copy text" data-copy-book="${esc(book)}" data-copy-chapter="${chapter}" data-copy-source="secondary">${ICON_COPY}</button></h2>`;
	if (chapter === 1) html += descriptionHtml(bookDescFrom(secondaryDescriptions, book));
	html += descriptionHtml(chapterDescFrom(secondaryDescriptions, book, chapter));
	html += `<div class="verses">`;
	if (ch2) {
		html += renderStyledVerses(book, chapter, nums, ch2, true);
	} else {
		html += `<p class="empty">${t().notFound}</p>`;
	}
	html += `</div></div>`;

	html += `</div>`;
	html += navArrowsHtml(prev, next);
	$("content").innerHTML = html;
	window.scrollTo(0, 0);
}

export function renderParallelBook(
	primary: BibleData,
	secondary: BibleData,
	book: string,
	primaryLabel: string,
	secondaryLabel: string,
) {
	const bd1 = primary[book];
	if (!bd1) {
		$("content").innerHTML = `<p class="empty">${t().notFound}</p>`;
		return;
	}
	const bd2 = secondary[book];

	const chs = Object.keys(bd1)
		.map(Number)
		.sort((a, b) => a - b);
	const { prev, next } = getBookNav(primary, book);
	let html = navArrowsHtml(prev, next);
	html += `<div class="parallel-copy-both">${shareButtonHtml()}</div>`;
	html += `<div class="parallel-container">`;

	// Primary column
	html += `<div class="parallel-col"><div class="parallel-translation-label">${esc(primaryLabel)}</div>`;
	html += `<h1 class="book-title">${esc(displayNameFor(primaryLabel, book))}</h1>`;
	html += descriptionHtml(bookDescFrom(descriptions, book));
	for (const c of chs) {
		const verses = bd1[String(c)];
		const nums = Object.keys(verses)
			.map(Number)
			.sort((a, b) => a - b);
		html += `<div class="chapter-block"><h2 class="chapter-heading" data-book="${esc(book)}" data-chapter="${c}">${t().chapter} ${c}</h2>`;
		html += descriptionHtml(chapterDescFrom(descriptions, book, c));
		html += `<div class="verses">`;
		html += renderStyledVerses(book, c, nums, verses);
		html += `</div></div>`;
	}
	html += `</div>`;

	// Secondary column
	html += `<div class="parallel-col"><div class="parallel-translation-label">${esc(secondaryLabel)}</div>`;
	html += `<h1 class="book-title">${esc(displayNameFor(secondaryLabel, book))}</h1>`;
	html += descriptionHtml(bookDescFrom(secondaryDescriptions, book));
	if (bd2) {
		for (const c of chs) {
			const verses = bd2[String(c)];
			if (!verses) {
				html += `<div class="chapter-block"><h2 class="chapter-heading">${t().chapter} ${c}</h2><p class="empty">${t().notFound}</p></div>`;
				continue;
			}
			const nums = Object.keys(verses)
				.map(Number)
				.sort((a, b) => a - b);
			html += `<div class="chapter-block"><h2 class="chapter-heading" data-book="${esc(book)}" data-chapter="${c}">${t().chapter} ${c}</h2>`;
			html += descriptionHtml(chapterDescFrom(secondaryDescriptions, book, c));
			html += `<div class="verses">`;
			html += renderStyledVerses(book, c, nums, verses, true);
			html += `</div></div>`;
		}
	} else {
		html += `<p class="empty">${t().notFound}</p>`;
	}
	html += `</div>`;

	html += `</div>`;
	html += navArrowsHtml(prev, next, false);
	$("content").innerHTML = html;
	window.scrollTo(0, 0);
}

export function renderParallelVerseSegments(
	primary: BibleData,
	secondary: BibleData,
	book: string,
	chapter: number,
	segments: { start: number; end: number }[],
	primaryLabel: string,
	secondaryLabel: string,
) {
	const ch1 = primary[book]?.[String(chapter)];
	const ch2 = secondary[book]?.[String(chapter)];
	if (!ch1) {
		$("content").innerHTML = `<p class="empty">${t().notFound}</p>`;
		return;
	}

	const segLabel = segments
		.map((s) => (s.start === s.end ? `${s.start}` : `${s.start}-${s.end}`))
		.join(",");

	let html = `<div class="parallel-copy-both"><button class="copy-btn" title="Copy both" data-copy-book="${esc(book)}" data-copy-chapter="${chapter}" data-copy-segments="${esc(segLabel)}" data-copy-source="both">${ICON_COPY}</button>${shareButtonHtml()}</div>`;
	html += `<div class="parallel-container">`;

	// Primary column
	html += `<div class="parallel-col"><div class="parallel-translation-label">${esc(primaryLabel)}</div>`;
	html += `<h2 class="section-title">${esc(displayNameFor(primaryLabel, book))} ${chapter}:${segLabel} <button class="copy-btn" title="Copy text" data-copy-book="${esc(book)}" data-copy-chapter="${chapter}" data-copy-segments="${esc(segLabel)}" data-copy-source="primary">${ICON_COPY}</button></h2>`;
	const segNums: number[] = [];
	for (const seg of segments) for (let v = seg.start; v <= seg.end; v++) segNums.push(v);
	html += `<div class="verses">`;
	html += renderStyledVerses(book, chapter, segNums, ch1);
	html += `</div></div>`;

	// Secondary column
	html += `<div class="parallel-col"><div class="parallel-translation-label">${esc(secondaryLabel)}</div>`;
	html += `<h2 class="section-title">${esc(displayNameFor(secondaryLabel, book))} ${chapter}:${segLabel} <button class="copy-btn" title="Copy text" data-copy-book="${esc(book)}" data-copy-chapter="${chapter}" data-copy-segments="${esc(segLabel)}" data-copy-source="secondary">${ICON_COPY}</button></h2>`;
	html += `<div class="verses">`;
	if (ch2) {
		html += renderStyledVerses(book, chapter, segNums, ch2, true);
	} else {
		html += `<p class="empty">${t().notFound}</p>`;
	}
	html += `</div></div>`;

	html += `</div>`;
	html += `<div class="read-full-chapter"><a class="full-chapter-link" data-book="${esc(book)}" data-chapter="${chapter}">${t().readFullChapter} &rarr;</a></div>`;
	$("content").innerHTML = html;
	window.scrollTo(0, 0);
}

export function renderParallelVerse(
	primary: BibleData,
	secondary: BibleData,
	book: string,
	chapter: number,
	verse: number,
	primaryLabel: string,
	secondaryLabel: string,
) {
	const text1 = primary[book]?.[String(chapter)]?.[String(verse)];
	if (!text1) {
		$("content").innerHTML = `<p class="empty">${t().notFound}</p>`;
		return;
	}
	const text2 = secondary[book]?.[String(chapter)]?.[String(verse)];

	const { prev, next } = getVerseNav(primary, book, chapter, verse);
	let html = navArrowsHtml(prev, next);
	html += `<div class="parallel-copy-both"><button class="copy-btn" title="Copy both" data-copy-book="${esc(book)}" data-copy-chapter="${chapter}" data-copy-verse="${verse}" data-copy-source="both">${ICON_COPY}</button>${shareButtonHtml()}</div>`;
	html += `<div class="parallel-container">`;
	html += `<div class="parallel-col"><div class="parallel-translation-label">${esc(primaryLabel)}</div>`;
	html += `<h2 class="section-title">${esc(displayNameFor(primaryLabel, book))} ${chapter}:${verse} <button class="copy-btn" title="Copy text" data-copy-book="${esc(book)}" data-copy-chapter="${chapter}" data-copy-verse="${verse}" data-copy-source="primary">${ICON_COPY}</button></h2>`;
	html += `<div class="verses single-verse"><span class="verse${hlClass(book, chapter, verse)}" data-book="${esc(book)}" data-chapter="${chapter}" data-verse="${verse}"><sup>${verse}</sup>${fmt(text1)}</span></div></div>`;
	html += `<div class="parallel-col"><div class="parallel-translation-label">${esc(secondaryLabel)}</div>`;
	html += `<h2 class="section-title">${esc(displayNameFor(secondaryLabel, book))} ${chapter}:${verse} <button class="copy-btn" title="Copy text" data-copy-book="${esc(book)}" data-copy-chapter="${chapter}" data-copy-verse="${verse}" data-copy-source="secondary">${ICON_COPY}</button></h2>`;
	html += `<div class="verses single-verse"><span class="verse${hlClass(book, chapter, verse)}" data-book="${esc(book)}" data-chapter="${chapter}" data-verse="${verse}" data-secondary="1"><sup>${verse}</sup>${text2 ? fmt(text2) : t().notFound}</span></div></div>`;
	html += `</div>`;
	html += `<div class="read-full-chapter"><a class="full-chapter-link" data-book="${esc(book)}" data-chapter="${chapter}">${t().readFullChapter} &rarr;</a></div>`;
	$("content").innerHTML = html;
	window.scrollTo(0, 0);
}

function navRefLabelFor(translationCode: string, nav: NavRef): string {
	const { book, chapterStart, chapterEnd, verseSegments } = nav;
	const name = displayNameFor(translationCode, book);
	if (chapterStart !== undefined && chapterEnd !== undefined) {
		if (verseSegments) {
			const segLabel = verseSegments
				.map((s) => (s.start === s.end ? `${s.start}` : `${s.start}-${s.end}`))
				.join(",");
			return `${name} ${chapterStart}:${segLabel}`;
		}
		if (chapterStart === chapterEnd) return `${name} ${chapterStart}`;
		return `${name} ${chapterStart}-${chapterEnd}`;
	}
	return name;
}

function parallelNavRefHtml(
	primary: BibleData,
	secondary: BibleData,
	nav: NavRef,
	primaryLabel: string,
	secondaryLabel: string,
): string {
	const { book, chapterStart, chapterEnd, verseSegments } = nav;
	const bd1 = primary[book];
	const bd2 = secondary[book];
	if (!bd1) return "";

	const pTitle = navRefLabelFor(primaryLabel, nav);
	const sTitle = navRefLabelFor(secondaryLabel, nav);

	let primaryHtml = "";
	let secondaryHtml = "";

	if (chapterStart !== undefined && chapterEnd !== undefined) {
		if (verseSegments) {
			const ch1 = bd1[String(chapterStart)];
			const ch2 = bd2?.[String(chapterStart)];
			const segNums: number[] = [];
			for (const seg of verseSegments)
				for (let v = seg.start; v <= seg.end; v++) segNums.push(v);
			primaryHtml += `<div class="verses">`;
			primaryHtml += renderStyledVerses(book, chapterStart, segNums, ch1 ?? {});
			primaryHtml += `</div>`;

			secondaryHtml += `<div class="verses">`;
			if (ch2) {
				secondaryHtml += renderStyledVerses(book, chapterStart, segNums, ch2, true);
			} else {
				secondaryHtml += `<p class="empty">${t().notFound}</p>`;
			}
			secondaryHtml += `</div>`;
		} else {
			for (let c = chapterStart; c <= chapterEnd; c++) {
				const ch1 = bd1[String(c)];
				const ch2 = bd2?.[String(c)];
				if (!ch1) continue;
				const nums = Object.keys(ch1)
					.map(Number)
					.sort((a, b) => a - b);
				if (chapterStart !== chapterEnd) {
					primaryHtml += `<h3 class="multi-nav-subheading">${esc(displayNameFor(primaryLabel, book))} ${c}</h3>`;
					secondaryHtml += `<h3 class="multi-nav-subheading">${esc(displayNameFor(secondaryLabel, book))} ${c}</h3>`;
				}
				primaryHtml += `<div class="verses">`;
				for (const n of nums) {
					primaryHtml += `<span class="verse${hlClass(book, c, n)}" data-book="${esc(book)}" data-chapter="${c}" data-verse="${n}"><sup>${n}</sup>${fmt(ch1[String(n)])}</span> `;
				}
				primaryHtml += `</div>`;

				secondaryHtml += `<div class="verses">`;
				if (ch2) {
					for (const n of nums) {
						const text = ch2[String(n)];
						if (text)
							secondaryHtml += `<span class="verse${hlClass(book, c, n)}" data-book="${esc(book)}" data-chapter="${c}" data-verse="${n}" data-secondary="1"><sup>${n}</sup>${fmt(text)}</span> `;
					}
				} else {
					secondaryHtml += `<p class="empty">${t().notFound}</p>`;
				}
				secondaryHtml += `</div>`;
			}
		}
	} else {
		// Whole book → show chapter 1
		const ch1 = bd1["1"];
		const ch2 = bd2?.["1"];
		if (!ch1) return "";
		const nums = Object.keys(ch1)
			.map(Number)
			.sort((a, b) => a - b);
		primaryHtml += `<div class="verses">`;
		for (const n of nums) {
			primaryHtml += `<span class="verse${hlClass(book, 1, n)}" data-book="${esc(book)}" data-chapter="1" data-verse="${n}"><sup>${n}</sup>${fmt(ch1[String(n)])}</span> `;
		}
		primaryHtml += `</div>`;

		secondaryHtml += `<div class="verses">`;
		if (ch2) {
			for (const n of nums) {
				const text = ch2[String(n)];
				if (text)
					secondaryHtml += `<span class="verse${hlClass(book, 1, n)}" data-book="${esc(book)}" data-chapter="1" data-verse="${n}" data-secondary="1"><sup>${n}</sup>${fmt(text)}</span> `;
			}
		} else {
			secondaryHtml += `<p class="empty">${t().notFound}</p>`;
		}
		secondaryHtml += `</div>`;
	}

	let html = `<div class="parallel-container">`;
	html += `<div class="parallel-col"><div class="parallel-translation-label">${esc(primaryLabel)}</div>`;
	html += `<h2 class="section-title">${esc(pTitle)} <button class="copy-btn" title="Copy text" data-copy-book="${esc(book)}" data-copy-chapter="${chapterStart ?? 1}" data-copy-source="primary">${ICON_COPY}</button></h2>`;
	html += primaryHtml;
	html += `</div>`;
	html += `<div class="parallel-col"><div class="parallel-translation-label">${esc(secondaryLabel)}</div>`;
	html += `<h2 class="section-title">${esc(sTitle)} <button class="copy-btn" title="Copy text" data-copy-book="${esc(book)}" data-copy-chapter="${chapterStart ?? 1}" data-copy-source="secondary">${ICON_COPY}</button></h2>`;
	html += secondaryHtml;
	html += `</div></div>`;

	return html;
}

export function renderParallelMultiNav(
	primary: BibleData,
	secondary: BibleData,
	refs: NavRef[],
	primaryLabel: string,
	secondaryLabel: string,
) {
	let html = "";
	for (let i = 0; i < refs.length; i++) {
		if (i > 0) html += `<hr class="multi-nav-divider">`;
		html += `<section class="multi-nav-section">`;
		html += parallelNavRefHtml(primary, secondary, refs[i], primaryLabel, secondaryLabel);
		const ch = refs[i].chapterStart ?? 1;
		html += `<div class="read-full-chapter"><a class="full-chapter-link" data-book="${esc(refs[i].book)}" data-chapter="${ch}">${t().readFullChapter} &rarr;</a></div>`;
		html += `</section>`;
	}
	$("content").innerHTML = html;
	window.scrollTo(0, 0);
}
