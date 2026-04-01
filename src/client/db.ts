import type { BibleData, Highlight, HighlightColor } from "./types.ts";

const DB_NAME = "bible-app";
const DB_VERSION = 2;
const STORE = "data";
const HIGHLIGHTS_STORE = "highlights";

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
      if (!db.objectStoreNames.contains(HIGHLIGHTS_STORE)) db.createObjectStore(HIGHLIGHTS_STORE, { keyPath: "id" });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function loadBible(key: string): Promise<BibleData | null> {
  const db = await open();
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, "readonly");
      const req = tx.objectStore(STORE).get(key);
      req.onsuccess = () => resolve((req.result as BibleData) ?? null);
      req.onerror = () => reject(req.error);
    });
  } finally {
    db.close();
  }
}

export async function saveBible(key: string, data: BibleData): Promise<void> {
  const db = await open();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).put(data, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}

// --- Highlights ---

function highlightId(book: string, chapter: number, verse: number): string {
  return `${book}:${chapter}:${verse}`;
}

export async function getHighlights(): Promise<Highlight[]> {
  const db = await open();
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(HIGHLIGHTS_STORE, "readonly");
      const req = tx.objectStore(HIGHLIGHTS_STORE).getAll();
      req.onsuccess = () => resolve(req.result as Highlight[]);
      req.onerror = () => reject(req.error);
    });
  } finally {
    db.close();
  }
}

export async function setHighlight(h: Highlight): Promise<void> {
  const db = await open();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(HIGHLIGHTS_STORE, "readwrite");
      tx.objectStore(HIGHLIGHTS_STORE).put({ ...h, id: highlightId(h.book, h.chapter, h.verse) });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}

export async function removeHighlight(book: string, chapter: number, verse: number): Promise<void> {
  const db = await open();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(HIGHLIGHTS_STORE, "readwrite");
      tx.objectStore(HIGHLIGHTS_STORE).delete(highlightId(book, chapter, verse));
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}

export async function getHighlightMap(): Promise<Map<string, HighlightColor>> {
  const all = await getHighlights();
  const map = new Map<string, HighlightColor>();
  for (const h of all) map.set(highlightId(h.book, h.chapter, h.verse), h.color);
  return map;
}
