interface BookEntry {
  display: string;
  aliases: string[];
}

const KR38: Record<string, BookEntry> = {
  "Genesis":        { display: "1. Mooseksen kirja",       aliases: ["1 moos", "1. moos", "1. mooseksen kirja"] },
  "Exodus":         { display: "2. Mooseksen kirja",       aliases: ["2 moos", "2. moos", "2. mooseksen kirja"] },
  "Leviticus":      { display: "3. Mooseksen kirja",       aliases: ["3 moos", "3. moos", "3. mooseksen kirja"] },
  "Numbers":        { display: "4. Mooseksen kirja",       aliases: ["4 moos", "4. moos", "4. mooseksen kirja"] },
  "Deuteronomy":    { display: "5. Mooseksen kirja",       aliases: ["5 moos", "5. moos", "5. mooseksen kirja"] },
  "Joshua":         { display: "Joosuan kirja",            aliases: ["joos", "joosua"] },
  "Judges":         { display: "Tuomarien kirja",          aliases: ["tuom", "tuomarit"] },
  "Ruth":           { display: "Ruutin kirja",             aliases: ["ruut"] },
  "1 Samuel":       { display: "1. Samuelin kirja",        aliases: ["1 sam", "1. sam", "1. samuelin kirja"] },
  "2 Samuel":       { display: "2. Samuelin kirja",        aliases: ["2 sam", "2. sam", "2. samuelin kirja"] },
  "1 Kings":        { display: "1. Kuninkaiden kirja",     aliases: ["1 kun", "1. kun", "1. kuninkaiden kirja"] },
  "2 Kings":        { display: "2. Kuninkaiden kirja",     aliases: ["2 kun", "2. kun", "2. kuninkaiden kirja"] },
  "1 Chronicles":   { display: "1. Aikakirja",             aliases: ["1 aik", "1. aik", "1. aikakirja"] },
  "2 Chronicles":   { display: "2. Aikakirja",             aliases: ["2 aik", "2. aik", "2. aikakirja"] },
  "Ezra":           { display: "Esran kirja",              aliases: ["esra", "esran kirja"] },
  "Nehemiah":       { display: "Nehemian kirja",           aliases: ["neh", "nehemia"] },
  "Esther":         { display: "Esterin kirja",            aliases: ["est", "esteri"] },
  "Job":            { display: "Jobin kirja",              aliases: ["jobin kirja"] },
  "Psalm":          { display: "Psalmit",                  aliases: ["ps", "psalmit", "psalmien kirja"] },
  "Proverbs":       { display: "Sananlaskut",              aliases: ["sananl", "sananlaskut"] },
  "Ecclesiastes":   { display: "Saarnaaja",                aliases: ["saarn", "saarnaaja", "saarnaajan kirja"] },
  "Song Of Solomon":{ display: "Laulujen laulu",           aliases: ["laul", "laulujen laulu"] },
  "Isaiah":         { display: "Jesajan kirja",            aliases: ["jes", "jesaja"] },
  "Jeremiah":       { display: "Jeremian kirja",           aliases: ["jer", "jeremia"] },
  "Lamentations":   { display: "Valitusvirret",            aliases: ["val", "valitusvirret"] },
  "Ezekiel":        { display: "Hesekielin kirja",         aliases: ["hes", "hesekiel"] },
  "Daniel":         { display: "Danielin kirja",           aliases: ["danielin kirja"] },
  "Hosea":          { display: "Hoosean kirja",            aliases: ["hoos", "hoosea"] },
  "Joel":           { display: "Joelin kirja",             aliases: ["joelin kirja"] },
  "Amos":           { display: "Aamoksen kirja",           aliases: ["aam", "aamos"] },
  "Obadiah":        { display: "Obadjan kirja",            aliases: ["obad", "obadja"] },
  "Jonah":          { display: "Joonan kirja",             aliases: ["joon", "joona"] },
  "Micah":          { display: "Miikan kirja",             aliases: ["miik", "miika"] },
  "Nahum":          { display: "Nahumin kirja",            aliases: ["nah", "nahum"] },
  "Habakkuk":       { display: "Habakukin kirja",          aliases: ["hab", "habakuk"] },
  "Zephaniah":      { display: "Sefanjan kirja",           aliases: ["sef", "sefanja"] },
  "Haggai":         { display: "Haggain kirja",            aliases: ["hagg", "haggai"] },
  "Zechariah":      { display: "Sakarjan kirja",           aliases: ["sak", "sakarja"] },
  "Malachi":        { display: "Malakian kirja",           aliases: ["malakia", "malakian kirja"] },
  "Matthew":        { display: "Matteuksen evankeliumi",   aliases: ["matt", "matteus"] },
  "Mark":           { display: "Markuksen evankeliumi",    aliases: ["markus", "markuksen evankeliumi"] },
  "Luke":           { display: "Luukkaan evankeliumi",     aliases: ["luuk", "luukas"] },
  "John":           { display: "Johanneksen evankeliumi",  aliases: ["joh", "johannes"] },
  "Acts":           { display: "Apostolien teot",          aliases: ["ap. t.", "apt", "apostolien teot"] },
  "Romans":         { display: "Roomalaiskirje",           aliases: ["room", "roomalaiskirje"] },
  "1 Corinthians":  { display: "1. Korinttilaiskirje",     aliases: ["1 kor", "1. kor", "1. korinttilaiskirje"] },
  "2 Corinthians":  { display: "2. Korinttilaiskirje",     aliases: ["2 kor", "2. kor", "2. korinttilaiskirje"] },
  "Galatians":      { display: "Galatalaiskirje",          aliases: ["gal", "galatalaiskirje"] },
  "Ephesians":      { display: "Efesolaiskirje",           aliases: ["ef", "efesolaiskirje"] },
  "Philippians":    { display: "Filippiläiskirje",         aliases: ["fil", "filippiläiskirje"] },
  "Colossians":     { display: "Kolossalaiskirje",         aliases: ["kol", "kolossalaiskirje"] },
  "1 Thessalonians":{ display: "1. Tessalonikalaiskirje",  aliases: ["1 tess", "1. tess", "1. tessalonikalaiskirje"] },
  "2 Thessalonians":{ display: "2. Tessalonikalaiskirje",  aliases: ["2 tess", "2. tess", "2. tessalonikalaiskirje"] },
  "1 Timothy":      { display: "1. Timoteuskirje",         aliases: ["1 tim", "1. tim", "1. timoteuskirje"] },
  "2 Timothy":      { display: "2. Timoteuskirje",         aliases: ["2 tim", "2. tim", "2. timoteuskirje"] },
  "Titus":          { display: "Tituskirje",               aliases: ["tit", "tituskirje"] },
  "Philemon":       { display: "Filemonkirje",             aliases: ["filem", "filemonkirje"] },
  "Hebrews":        { display: "Heprealaiskirje",          aliases: ["hepr", "heprealaiskirje"] },
  "James":          { display: "Jaakobin kirje",           aliases: ["jaak", "jaakob", "jaakobin kirje"] },
  "1 Peter":        { display: "1. Pietarin kirje",        aliases: ["1 piet", "1. piet", "1. pietarin kirje"] },
  "2 Peter":        { display: "2. Pietarin kirje",        aliases: ["2 piet", "2. piet", "2. pietarin kirje"] },
  "1 John":         { display: "1. Johanneksen kirje",     aliases: ["1 joh", "1. joh", "1. johanneksen kirje"] },
  "2 John":         { display: "2. Johanneksen kirje",     aliases: ["2 joh", "2. joh", "2. johanneksen kirje"] },
  "3 John":         { display: "3. Johanneksen kirje",     aliases: ["3 joh", "3. joh", "3. johanneksen kirje"] },
  "Jude":           { display: "Juudaksen kirje",          aliases: ["juud", "juudas", "juudaksen kirje"] },
  "Revelation":     { display: "Ilmestyskirja",            aliases: ["ilm", "ilmestyskirja"] },
};

const TRANSLATIONS: Record<string, Record<string, BookEntry>> = { KR38 };

let currentCode = "WEB";

export function setTranslation(code: string) {
  currentCode = code;
}

export function displayName(book: string): string {
  return TRANSLATIONS[currentCode]?.[book]?.display ?? book;
}

/** Returns aliases for the current translation: { aliasLower: englishKey } */
export function getAliases(): Map<string, string> {
  const map = new Map<string, string>();
  const entries = TRANSLATIONS[currentCode];
  if (!entries) return map;
  for (const [key, entry] of Object.entries(entries)) {
    map.set(entry.display.toLowerCase(), key);
    for (const a of entry.aliases) {
      map.set(a.toLowerCase(), key);
    }
  }
  return map;
}
