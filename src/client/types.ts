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
