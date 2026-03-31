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
