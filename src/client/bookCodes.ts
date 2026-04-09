/** Short language-independent book codes for URLs (3–4 chars). */

const CODE_TO_BOOK: Record<string, string> = {
  // Old Testament (39)
  gen: "Genesis",
  exo: "Exodus",
  lev: "Leviticus",
  num: "Numbers",
  deu: "Deuteronomy",
  jos: "Joshua",
  jdg: "Judges",
  rut: "Ruth",
  "1sa": "1 Samuel",
  "2sa": "2 Samuel",
  "1ki": "1 Kings",
  "2ki": "2 Kings",
  "1ch": "1 Chronicles",
  "2ch": "2 Chronicles",
  ezr: "Ezra",
  neh: "Nehemiah",
  est: "Esther",
  job: "Job",
  psa: "Psalm",
  pro: "Proverbs",
  ecc: "Ecclesiastes",
  sng: "Song Of Solomon",
  isa: "Isaiah",
  jer: "Jeremiah",
  lam: "Lamentations",
  ezk: "Ezekiel",
  dan: "Daniel",
  hos: "Hosea",
  jol: "Joel",
  amo: "Amos",
  oba: "Obadiah",
  jon: "Jonah",
  mic: "Micah",
  nam: "Nahum",
  hab: "Habakkuk",
  zep: "Zephaniah",
  hag: "Haggai",
  zec: "Zechariah",
  mal: "Malachi",
  // Deuterocanonical / Apocrypha
  tob: "Tobit",
  jdt: "Judith",
  esg: "Esther (Greek)",
  wis: "Wisdom",
  sir: "Sirach",
  bar: "Baruch",
  pra: "Prayer of Azariah",
  sus: "Susanna",
  bel: "Bel and the Dragon",
  "1ma": "1 Maccabees",
  "2ma": "2 Maccabees",
  "1es": "1 Esdras",
  man: "Prayer of Manasses",
  aps: "Additional Psalm",
  "3ma": "3 Maccabees",
  "2es": "2 Esdras",
  "4ma": "4 Maccabees",
  lao: "Laodiceans",
  // New Testament (27)
  mat: "Matthew",
  mrk: "Mark",
  luk: "Luke",
  jhn: "John",
  act: "Acts",
  rom: "Romans",
  "1co": "1 Corinthians",
  "2co": "2 Corinthians",
  gal: "Galatians",
  eph: "Ephesians",
  php: "Philippians",
  col: "Colossians",
  "1th": "1 Thessalonians",
  "2th": "2 Thessalonians",
  "1ti": "1 Timothy",
  "2ti": "2 Timothy",
  tit: "Titus",
  phm: "Philemon",
  heb: "Hebrews",
  jas: "James",
  "1pe": "1 Peter",
  "2pe": "2 Peter",
  "1jn": "1 John",
  "2jn": "2 John",
  "3jn": "3 John",
  jud: "Jude",
  rev: "Revelation",
};

const BOOK_TO_CODE = new Map<string, string>();
for (const [code, book] of Object.entries(CODE_TO_BOOK)) {
  BOOK_TO_CODE.set(book, code);
}

/** Convert a short URL code to the internal English book key. */
export function bookFromCode(code: string): string | undefined {
  return CODE_TO_BOOK[code.toLowerCase()];
}

/** Convert an internal English book key to a short URL code. */
export function bookToCode(book: string): string | undefined {
  return BOOK_TO_CODE.get(book);
}
