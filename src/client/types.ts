export interface BibleData {
	[book: string]: {
		[chapter: string]: {
			[verse: string]: string;
		};
	};
}

export interface VerseResult {
	book: string;
	chapter: number;
	verse: number;
	text: string;
}

export interface AppState {
	book?: string;
	chapter?: number;
	verse?: number;
	query?: string;
	translation?: string;
	parallel?: string;
	interlinear?: boolean;
}

export type HighlightColor = "yellow" | "green" | "blue" | "pink" | "orange";

export interface Highlight {
	book: string;
	chapter: number;
	verse: number;
	color: HighlightColor;
}

export interface ChapterDescription {
	number: number;
	description: string;
}

export interface BookDescription {
	name: string;
	description: string;
	chapters: ChapterDescription[];
}

export type DescriptionData = BookDescription[];

export interface SubheadingEntry {
	v: number;
	t: string;
}

export type SubheadingsData = {
	[book: string]: {
		[chapter: string]: SubheadingEntry[];
	};
};

// --- Interlinear types ---

export interface InterlinearWord {
	w: string;
	english: string;
	original: string;
	translit: string;
	lemma?: string;
	strongs: string;
	morph?: string;
}

export type InterlinearChapter = {
	[verse: string]: InterlinearWord[];
};

export type InterlinearBook = {
	[chapter: string]: InterlinearChapter;
};

export interface StrongsEntry {
	d: string;
	p: string;
	s: string;
	r: string;
}

export type StrongsDict = Record<string, StrongsEntry>;

export interface Bookmark {
	id: string;
	book?: string;
	chapter?: number;
	verse?: number;
	query?: string;
	addedAt: number;
}

export interface StoryEntry {
	id: string;
	title: string;
	title_fi?: string;
	description: string;
	description_fi?: string;
	ref: string;
	category: string;
}

export interface ParableEntry {
	id: string;
	title: string;
	title_fi?: string;
	description: string;
	description_fi?: string;
	ref: string;
	category: string;
}

export interface TheophaniesEntry {
	id: string;
	title: string;
	title_fi?: string;
	description: string;
	description_fi?: string;
	ref: string;
	category: string;
}

export interface TypologyEntry {
	id: string;
	title: string;
	title_fi?: string;
	description: string;
	description_fi?: string;
	ref: string;
	category: string;
}
