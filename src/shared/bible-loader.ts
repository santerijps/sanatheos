import { join } from "path";
import type { BibleData } from "../client/types.ts";

/** Canonical book order: OT (39) + Deuterocanonical + NT (27). */
export const BOOK_ORDER = [
	// Old Testament (39)
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
	// Deuterocanonical / Apocrypha
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
	// New Testament (27)
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

/** Map source JSON book names to canonical internal keys. */
const SOURCE_NAME_MAP: Record<string, string> = {
	"I Samuel": "1 Samuel",
	"II Samuel": "2 Samuel",
	"I Kings": "1 Kings",
	"II Kings": "2 Kings",
	"I Chronicles": "1 Chronicles",
	"II Chronicles": "2 Chronicles",
	Psalms: "Psalm",
	"Song of Solomon": "Song Of Solomon",
	"I Maccabees": "1 Maccabees",
	"II Maccabees": "2 Maccabees",
	"III Maccabees": "3 Maccabees",
	"IV Maccabees": "4 Maccabees",
	"I Esdras": "1 Esdras",
	"II Esdras": "2 Esdras",
	"I Corinthians": "1 Corinthians",
	"II Corinthians": "2 Corinthians",
	"I Thessalonians": "1 Thessalonians",
	"II Thessalonians": "2 Thessalonians",
	"I Timothy": "1 Timothy",
	"II Timothy": "2 Timothy",
	"I Peter": "1 Peter",
	"II Peter": "2 Peter",
	"I John": "1 John",
	"II John": "2 John",
	"III John": "3 John",
	"Revelation of John": "Revelation",
	Acts: "Acts",
};

interface SourceVerse {
	verse: number;
	text: string;
	chapter?: number;
	name?: string;
}

interface SourceChapter {
	chapter: number;
	name?: string;
	verses: SourceVerse[];
}

interface SourceBook {
	name: string;
	chapters: SourceChapter[];
}

interface SourceBible {
	translation?: string;
	books: SourceBook[];
}

function normalizeBookName(name: string): string {
	return SOURCE_NAME_MAP[name] ?? name;
}

export async function loadBible(textDir: string, code: string): Promise<string> {
	const filePath = join(textDir, `${code}.json`);
	const raw: SourceBible = await Bun.file(filePath).json();

	// Convert array-based format to BibleData object, skip empty books
	const combined: BibleData = {};
	for (const book of raw.books) {
		const key = normalizeBookName(book.name);
		const chapters: BibleData[string] = {};
		let hasContent = false;
		for (const ch of book.chapters) {
			const verses: Record<string, string> = {};
			for (const v of ch.verses) {
				const text = v.text.trim();
				if (text) {
					verses[String(v.verse)] = text;
					hasContent = true;
				}
			}
			if (Object.keys(verses).length > 0) {
				chapters[String(ch.chapter)] = verses;
			}
		}
		if (hasContent) combined[key] = chapters;
	}

	// Order by BOOK_ORDER, skip books not in this translation
	const ordered: BibleData = {};
	for (const b of BOOK_ORDER) {
		if (combined[b]) ordered[b] = combined[b];
	}
	return JSON.stringify(ordered);
}

const NON_TRANSLATION_FILES = new Set(["strongs", "translations"]);

export async function discoverTranslations(textDir: string): Promise<string[]> {
	const glob = new Bun.Glob("*.json");
	const codes: string[] = [];
	for await (const f of glob.scan(textDir)) {
		const code = f.replace(/\.json$/, "");
		if (!NON_TRANSLATION_FILES.has(code)) codes.push(code);
	}
	return codes.sort();
}
