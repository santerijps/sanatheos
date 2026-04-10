import type { BibleData, Highlight, HighlightColor, InterlinearBook, StrongsDict } from "./types.ts";

const DB_NAME = "bible-app";
const DB_VERSION = 2;
const DATA_STORE = "data";
const HIGHLIGHTS_STORE = "highlights";

/** Persistent connection — opened once on first use, reused for all subsequent operations. */
let dbInstance: IDBDatabase | null = null;

function open(): Promise<IDBDatabase> {
  if (dbInstance) return Promise.resolve(dbInstance);
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(DATA_STORE)) db.createObjectStore(DATA_STORE);
      if (!db.objectStoreNames.contains(HIGHLIGHTS_STORE)) db.createObjectStore(HIGHLIGHTS_STORE, { keyPath: "id" });
    };
    req.onsuccess = () => {
      dbInstance = req.result;
      // Re-open on unexpected close (e.g. browser pressure)
      dbInstance.onclose = () => { dbInstance = null; };
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
