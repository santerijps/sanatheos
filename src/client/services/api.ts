import type { BibleData, InterlinearBook, StrongsDict, DescriptionData } from "../types.ts";
import {
	loadBible,
	saveBible,
	loadInterlinearBook,
	saveInterlinearBook,
	loadStrongsDict,
	saveStrongsDict,
} from "../db.ts";
import {
	getInterlinearBook,
	setInterlinearBook,
	getStrongsDict,
	setStrongsDict,
} from "../render.ts";

export const TRANSLATION_NAMES: Record<string, { name: string; language: string }> = {
	NHEB: { name: "New Heart English Bible", language: "English" },
	KJV: { name: "King James Version", language: "English" },
	CPDV: { name: "Catholic Public Domain Version", language: "English" },
	KR38: { name: "Raamattu 1933/1938", language: "Suomi" },
	SV17: { name: "Svenska Bibeln 1917", language: "Svenska" },
};

export const TRANSLATION_LANG: Record<string, string> = {
	NHEB: "en",
	KJV: "en",
	CPDV: "en",
	KR38: "fi",
	SV17: "sv",
};

export async function fetchInterlinear(book: string): Promise<InterlinearBook> {
	const existing = getInterlinearBook(book);
	if (existing) return existing;
	const cached = await loadInterlinearBook(book);
	if (cached) {
		setInterlinearBook(book, cached);
		return cached;
	}
	const res = await fetch(`./text/interlinear/${encodeURIComponent(book)}.json`);
	if (!res.ok) throw new Error(`HTTP ${res.status}`);
	const d: InterlinearBook = await res.json();
	setInterlinearBook(book, d);
	await saveInterlinearBook(book, d);
	return d;
}

export async function fetchStrongs(): Promise<StrongsDict> {
	const existing = getStrongsDict();
	if (existing && Object.keys(existing).length > 0) return existing;
	const cached = await loadStrongsDict();
	if (cached) {
		setStrongsDict(cached);
		return cached;
	}
	const res = await fetch("./text/strongs.json");
	if (!res.ok) throw new Error(`HTTP ${res.status}`);
	const d: StrongsDict = await res.json();
	setStrongsDict(d);
	await saveStrongsDict(d);
	return d;
}

export async function fetchTranslation(code: string): Promise<BibleData> {
	const cached = await loadBible(code);
	if (cached) return cached;
	const res = await fetch(`./text/bible-${encodeURIComponent(code)}.json`);
	if (!res.ok) throw new Error(`HTTP ${res.status}`);
	const d: BibleData = await res.json();
	await saveBible(code, d);
	return d;
}

export async function fetchTranslations(): Promise<string[]> {
	return ["CPDV", "KJV", "KR38", "NHEB", "SV17"];
}

export async function fetchDescriptions(code: string): Promise<DescriptionData> {
	const lang = TRANSLATION_LANG[code] || "en";
	try {
		const res = await fetch(`./data/descriptions-${encodeURIComponent(lang)}.json`);
		if (!res.ok) return [];
		return await res.json();
	} catch {
		return [];
	}
}
