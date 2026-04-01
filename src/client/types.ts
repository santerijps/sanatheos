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
}

export interface Bookmark {
  book: string;
  chapter: number;
  verse: number;
  translation: string;
  timestamp: number;
}

export type HighlightColor = "yellow" | "green" | "blue" | "pink" | "orange";

export interface Highlight {
  book: string;
  chapter: number;
  verse: number;
  color: HighlightColor;
}
