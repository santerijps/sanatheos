import { join } from "path";
import type { BibleData } from "../client/types.ts";

export const BOOK_ORDER = [
  "Genesis", "Exodus", "Leviticus", "Numbers", "Deuteronomy",
  "Joshua", "Judges", "Ruth", "1 Samuel", "2 Samuel",
  "1 Kings", "2 Kings", "1 Chronicles", "2 Chronicles",
  "Ezra", "Nehemiah", "Esther", "Job", "Psalm", "Proverbs",
  "Ecclesiastes", "Song Of Solomon", "Isaiah", "Jeremiah",
  "Lamentations", "Ezekiel", "Daniel", "Hosea", "Joel", "Amos",
  "Obadiah", "Jonah", "Micah", "Nahum", "Habakkuk", "Zephaniah",
  "Haggai", "Zechariah", "Malachi", "Matthew", "Mark", "Luke",
  "John", "Acts", "Romans", "1 Corinthians", "2 Corinthians",
  "Galatians", "Ephesians", "Philippians", "Colossians",
  "1 Thessalonians", "2 Thessalonians", "1 Timothy", "2 Timothy",
  "Titus", "Philemon", "Hebrews", "James", "1 Peter", "2 Peter",
  "1 John", "2 John", "3 John", "Jude", "Revelation",
];

export async function loadBible(translationsDir: string, code: string): Promise<string> {
  const booksDir = join(translationsDir, code, `${code}_books`);
  const combined: BibleData = {};
  const glob = new Bun.Glob("*.json");
  for await (const f of glob.scan(booksDir)) {
    const raw: Record<string, unknown> = await Bun.file(join(booksDir, f)).json();
    const { Info: _, ...data } = raw;
    Object.assign(combined, data);
  }
  const ordered: BibleData = {};
  for (const b of BOOK_ORDER) {
    if (combined[b]) ordered[b] = combined[b];
  }
  return JSON.stringify(ordered);
}

export async function discoverTranslations(translationsDir: string): Promise<string[]> {
  const glob = new Bun.Glob("*/*_books/*.json");
  const codes = new Set<string>();
  for await (const match of glob.scan(translationsDir)) {
    codes.add(match.split(/[/\\]/)[0]);
  }
  return [...codes].sort();
}

