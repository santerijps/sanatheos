import type {
	BibleData,
	Highlight,
	HighlightColor,
	InterlinearBook,
	StrongsDict,
	Bookmark,
	StoryEntry,
	ParableEntry,
	TheophaniesEntry,
	TypologyEntry,
	VerseNote,
} from "./types.ts";

const DB_NAME = "bible-app";
const DB_VERSION = 4;
const DATA_STORE = "data";
const HIGHLIGHTS_STORE = "highlights";
const BOOKMARKS_STORE = "bookmarks";
const NOTES_STORE = "notes";

/** Persistent connection — opened once on first use, reused for all subsequent operations. */
let dbInstance: IDBDatabase | null = null;

function open(): Promise<IDBDatabase> {
	if (dbInstance) return Promise.resolve(dbInstance);
	return new Promise((resolve, reject) => {
		const req = indexedDB.open(DB_NAME, DB_VERSION);
		req.onupgradeneeded = () => {
			const db = req.result;
			if (!db.objectStoreNames.contains(DATA_STORE)) db.createObjectStore(DATA_STORE);
			if (!db.objectStoreNames.contains(HIGHLIGHTS_STORE))
				db.createObjectStore(HIGHLIGHTS_STORE, { keyPath: "id" });
			if (!db.objectStoreNames.contains(BOOKMARKS_STORE))
				db.createObjectStore(BOOKMARKS_STORE, { keyPath: "id" });
			if (!db.objectStoreNames.contains(NOTES_STORE))
				db.createObjectStore(NOTES_STORE, { keyPath: "id" });
		};
		req.onsuccess = () => {
			dbInstance = req.result;
			// Re-open on unexpected close (e.g. browser pressure)
			dbInstance.onclose = () => {
				dbInstance = null;
			};
			resolve(dbInstance);
		};
		req.onerror = () => reject(req.error);
	});
}

export async function loadBible(key: string): Promise<BibleData | null> {
	const db = await open();
	return new Promise((resolve, reject) => {
		const tx = db.transaction(DATA_STORE, "readonly");
		const req = tx.objectStore(DATA_STORE).get(key);
		req.onsuccess = () => resolve((req.result as BibleData) ?? null);
		req.onerror = () => reject(req.error);
	});
}

export async function saveBible(key: string, data: BibleData): Promise<void> {
	const db = await open();
	await new Promise<void>((resolve, reject) => {
		const tx = db.transaction(DATA_STORE, "readwrite");
		tx.objectStore(DATA_STORE).put(data, key);
		tx.oncomplete = () => resolve();
		tx.onerror = () => reject(tx.error);
	});
}

// --- Highlights ---

function highlightId(book: string, chapter: number, verse: number): string {
	return `${book}:${chapter}:${verse}`;
}

export async function getHighlightMap(): Promise<Map<string, HighlightColor>> {
	const db = await open();
	const all: Highlight[] = await new Promise((resolve, reject) => {
		const tx = db.transaction(HIGHLIGHTS_STORE, "readonly");
		const req = tx.objectStore(HIGHLIGHTS_STORE).getAll();
		req.onsuccess = () => resolve(req.result as Highlight[]);
		req.onerror = () => reject(req.error);
	});
	const map = new Map<string, HighlightColor>();
	for (const h of all) map.set(highlightId(h.book, h.chapter, h.verse), h.color);
	return map;
}

export async function setHighlight(h: Highlight): Promise<void> {
	const db = await open();
	await new Promise<void>((resolve, reject) => {
		const tx = db.transaction(HIGHLIGHTS_STORE, "readwrite");
		tx.objectStore(HIGHLIGHTS_STORE).put({ ...h, id: highlightId(h.book, h.chapter, h.verse) });
		tx.oncomplete = () => resolve();
		tx.onerror = () => reject(tx.error);
	});
}

export async function removeHighlight(book: string, chapter: number, verse: number): Promise<void> {
	const db = await open();
	await new Promise<void>((resolve, reject) => {
		const tx = db.transaction(HIGHLIGHTS_STORE, "readwrite");
		tx.objectStore(HIGHLIGHTS_STORE).delete(highlightId(book, chapter, verse));
		tx.oncomplete = () => resolve();
		tx.onerror = () => reject(tx.error);
	});
}

// --- Interlinear data ---

export async function loadInterlinearBook(book: string): Promise<InterlinearBook | null> {
	const db = await open();
	return new Promise((resolve, reject) => {
		const tx = db.transaction(DATA_STORE, "readonly");
		const req = tx.objectStore(DATA_STORE).get(`il:${book}`);
		req.onsuccess = () => resolve((req.result as InterlinearBook) ?? null);
		req.onerror = () => reject(req.error);
	});
}

export async function saveInterlinearBook(book: string, data: InterlinearBook): Promise<void> {
	const db = await open();
	await new Promise<void>((resolve, reject) => {
		const tx = db.transaction(DATA_STORE, "readwrite");
		tx.objectStore(DATA_STORE).put(data, `il:${book}`);
		tx.oncomplete = () => resolve();
		tx.onerror = () => reject(tx.error);
	});
}

export async function loadStrongsDict(): Promise<StrongsDict | null> {
	const db = await open();
	return new Promise((resolve, reject) => {
		const tx = db.transaction(DATA_STORE, "readonly");
		const req = tx.objectStore(DATA_STORE).get("strongs");
		req.onsuccess = () => resolve((req.result as StrongsDict) ?? null);
		req.onerror = () => reject(req.error);
	});
}

export async function saveStrongsDict(data: StrongsDict): Promise<void> {
	const db = await open();
	await new Promise<void>((resolve, reject) => {
		const tx = db.transaction(DATA_STORE, "readwrite");
		tx.objectStore(DATA_STORE).put(data, "strongs");
		tx.oncomplete = () => resolve();
		tx.onerror = () => reject(tx.error);
	});
}

// --- Bookmarks ---

export async function getBookmarks(): Promise<Bookmark[]> {
	const db = await open();
	return new Promise((resolve, reject) => {
		const tx = db.transaction(BOOKMARKS_STORE, "readonly");
		const req = tx.objectStore(BOOKMARKS_STORE).getAll();
		req.onsuccess = () =>
			resolve((req.result as Bookmark[]).sort((a, b) => b.addedAt - a.addedAt));
		req.onerror = () => reject(req.error);
	});
}

export async function addBookmark(b: Bookmark): Promise<void> {
	const db = await open();
	await new Promise<void>((resolve, reject) => {
		const tx = db.transaction(BOOKMARKS_STORE, "readwrite");
		tx.objectStore(BOOKMARKS_STORE).put(b);
		tx.oncomplete = () => resolve();
		tx.onerror = () => reject(tx.error);
	});
}

export async function removeBookmark(id: string): Promise<void> {
	const db = await open();
	await new Promise<void>((resolve, reject) => {
		const tx = db.transaction(BOOKMARKS_STORE, "readwrite");
		tx.objectStore(BOOKMARKS_STORE).delete(id);
		tx.oncomplete = () => resolve();
		tx.onerror = () => reject(tx.error);
	});
}

export async function hasBookmark(id: string): Promise<boolean> {
	const db = await open();
	return new Promise((resolve, reject) => {
		const tx = db.transaction(BOOKMARKS_STORE, "readonly");
		const req = tx.objectStore(BOOKMARKS_STORE).getKey(id);
		req.onsuccess = () => resolve(req.result !== undefined);
		req.onerror = () => reject(req.error);
	});
}

// --- Stories & Parables ---

export async function loadStories(): Promise<StoryEntry[] | null> {
	const db = await open();
	return new Promise((resolve, reject) => {
		const tx = db.transaction(DATA_STORE, "readonly");
		const req = tx.objectStore(DATA_STORE).get("stories");
		req.onsuccess = () => resolve((req.result as StoryEntry[]) ?? null);
		req.onerror = () => reject(req.error);
	});
}

export async function saveStories(data: StoryEntry[]): Promise<void> {
	const db = await open();
	await new Promise<void>((resolve, reject) => {
		const tx = db.transaction(DATA_STORE, "readwrite");
		tx.objectStore(DATA_STORE).put(data, "stories");
		tx.oncomplete = () => resolve();
		tx.onerror = () => reject(tx.error);
	});
}

export async function loadParables(): Promise<ParableEntry[] | null> {
	const db = await open();
	return new Promise((resolve, reject) => {
		const tx = db.transaction(DATA_STORE, "readonly");
		const req = tx.objectStore(DATA_STORE).get("parables");
		req.onsuccess = () => resolve((req.result as ParableEntry[]) ?? null);
		req.onerror = () => reject(req.error);
	});
}

export async function saveParables(data: ParableEntry[]): Promise<void> {
	const db = await open();
	await new Promise<void>((resolve, reject) => {
		const tx = db.transaction(DATA_STORE, "readwrite");
		tx.objectStore(DATA_STORE).put(data, "parables");
		tx.oncomplete = () => resolve();
		tx.onerror = () => reject(tx.error);
	});
}

export async function loadTheophanies(): Promise<TheophaniesEntry[] | null> {
	const db = await open();
	return new Promise((resolve, reject) => {
		const tx = db.transaction(DATA_STORE, "readonly");
		const req = tx.objectStore(DATA_STORE).get("theophanies");
		req.onsuccess = () => resolve((req.result as TheophaniesEntry[]) ?? null);
		req.onerror = () => reject(req.error);
	});
}

export async function saveTheophanies(data: TheophaniesEntry[]): Promise<void> {
	const db = await open();
	await new Promise<void>((resolve, reject) => {
		const tx = db.transaction(DATA_STORE, "readwrite");
		tx.objectStore(DATA_STORE).put(data, "theophanies");
		tx.oncomplete = () => resolve();
		tx.onerror = () => reject(tx.error);
	});
}

export async function loadTypology(): Promise<TypologyEntry[] | null> {
	const db = await open();
	return new Promise((resolve, reject) => {
		const tx = db.transaction(DATA_STORE, "readonly");
		const req = tx.objectStore(DATA_STORE).get("typology");
		req.onsuccess = () => resolve((req.result as TypologyEntry[]) ?? null);
		req.onerror = () => reject(req.error);
	});
}

export async function saveTypology(data: TypologyEntry[]): Promise<void> {
	const db = await open();
	await new Promise<void>((resolve, reject) => {
		const tx = db.transaction(DATA_STORE, "readwrite");
		tx.objectStore(DATA_STORE).put(data, "typology");
		tx.oncomplete = () => resolve();
		tx.onerror = () => reject(tx.error);
	});
}

// --- Verse Notes ---

export async function getNotes(): Promise<VerseNote[]> {
	const db = await open();
	return new Promise((resolve, reject) => {
		const tx = db.transaction(NOTES_STORE, "readonly");
		const req = tx.objectStore(NOTES_STORE).getAll();
		req.onsuccess = () =>
			resolve((req.result as VerseNote[]).sort((a, b) => b.updatedAt - a.updatedAt));
		req.onerror = () => reject(req.error);
	});
}

export async function getNote(id: string): Promise<VerseNote | null> {
	const db = await open();
	return new Promise((resolve, reject) => {
		const tx = db.transaction(NOTES_STORE, "readonly");
		const req = tx.objectStore(NOTES_STORE).get(id);
		req.onsuccess = () => resolve((req.result as VerseNote) ?? null);
		req.onerror = () => reject(req.error);
	});
}

export async function saveNote(note: VerseNote): Promise<void> {
	const db = await open();
	await new Promise<void>((resolve, reject) => {
		const tx = db.transaction(NOTES_STORE, "readwrite");
		tx.objectStore(NOTES_STORE).put(note);
		tx.oncomplete = () => resolve();
		tx.onerror = () => reject(tx.error);
	});
}

export async function deleteNote(id: string): Promise<void> {
	const db = await open();
	await new Promise<void>((resolve, reject) => {
		const tx = db.transaction(NOTES_STORE, "readwrite");
		tx.objectStore(NOTES_STORE).delete(id);
		tx.oncomplete = () => resolve();
		tx.onerror = () => reject(tx.error);
	});
}

export async function getNoteMap(): Promise<Map<string, string>> {
	const notes = await getNotes();
	const map = new Map<string, string>();
	for (const n of notes) map.set(n.id, n.text);
	return map;
}

// --- Export / Import ---

export interface UserDataExport {
	version: 1;
	exportedAt: string; // ISO 8601
	highlights: Array<Highlight & { id: string }>;
	bookmarks: Bookmark[];
	notes: VerseNote[];
}

/** Collect all user data (highlights, bookmarks, notes) into a serialisable object. */
export async function exportUserData(): Promise<UserDataExport> {
	const db = await open();

	const highlights = await new Promise<Array<Highlight & { id: string }>>((resolve, reject) => {
		const tx = db.transaction(HIGHLIGHTS_STORE, "readonly");
		const req = tx.objectStore(HIGHLIGHTS_STORE).getAll();
		req.onsuccess = () => resolve(req.result as Array<Highlight & { id: string }>);
		req.onerror = () => reject(req.error);
	});

	const bookmarks = await getBookmarks();
	const notes = await getNotes();

	return {
		version: 1,
		exportedAt: new Date().toISOString(),
		highlights,
		bookmarks,
		notes,
	};
}

/** Replace all user data with the contents of an export file. Existing records are cleared first. */
export async function importUserData(data: UserDataExport): Promise<void> {
	if (data.version !== 1) throw new Error(`Unsupported export version: ${data.version}`);

	const db = await open();

	// Clear and re-populate highlights
	await new Promise<void>((resolve, reject) => {
		const tx = db.transaction(HIGHLIGHTS_STORE, "readwrite");
		tx.objectStore(HIGHLIGHTS_STORE).clear();
		tx.oncomplete = () => resolve();
		tx.onerror = () => reject(tx.error);
	});
	if (data.highlights?.length) {
		await new Promise<void>((resolve, reject) => {
			const tx = db.transaction(HIGHLIGHTS_STORE, "readwrite");
			const store = tx.objectStore(HIGHLIGHTS_STORE);
			for (const h of data.highlights) store.put(h);
			tx.oncomplete = () => resolve();
			tx.onerror = () => reject(tx.error);
		});
	}

	// Clear and re-populate bookmarks
	await new Promise<void>((resolve, reject) => {
		const tx = db.transaction(BOOKMARKS_STORE, "readwrite");
		tx.objectStore(BOOKMARKS_STORE).clear();
		tx.oncomplete = () => resolve();
		tx.onerror = () => reject(tx.error);
	});
	if (data.bookmarks?.length) {
		await new Promise<void>((resolve, reject) => {
			const tx = db.transaction(BOOKMARKS_STORE, "readwrite");
			const store = tx.objectStore(BOOKMARKS_STORE);
			for (const b of data.bookmarks) store.put(b);
			tx.oncomplete = () => resolve();
			tx.onerror = () => reject(tx.error);
		});
	}

	// Clear and re-populate notes
	await new Promise<void>((resolve, reject) => {
		const tx = db.transaction(NOTES_STORE, "readwrite");
		tx.objectStore(NOTES_STORE).clear();
		tx.oncomplete = () => resolve();
		tx.onerror = () => reject(tx.error);
	});
	if (data.notes?.length) {
		await new Promise<void>((resolve, reject) => {
			const tx = db.transaction(NOTES_STORE, "readwrite");
			const store = tx.objectStore(NOTES_STORE);
			for (const n of data.notes) store.put(n);
			tx.oncomplete = () => resolve();
			tx.onerror = () => reject(tx.error);
		});
	}
}
