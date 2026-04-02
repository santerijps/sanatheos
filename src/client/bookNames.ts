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

const WEB: Record<string, BookEntry> = {
  "Genesis":        { display: "Genesis",              aliases: ["gen"] },
  "Exodus":         { display: "Exodus",               aliases: ["exod", "exo", "ex"] },
  "Leviticus":      { display: "Leviticus",            aliases: ["lev"] },
  "Numbers":        { display: "Numbers",              aliases: ["num"] },
  "Deuteronomy":    { display: "Deuteronomy",          aliases: ["deut", "deu", "dt"] },
  "Joshua":         { display: "Joshua",               aliases: ["josh", "jos"] },
  "Judges":         { display: "Judges",               aliases: ["judg", "jdg"] },
  "Ruth":           { display: "Ruth",                 aliases: ["rut", "ru"] },
  "1 Samuel":       { display: "1 Samuel",             aliases: ["1 sam", "1sam", "1sa"] },
  "2 Samuel":       { display: "2 Samuel",             aliases: ["2 sam", "2sam", "2sa"] },
  "1 Kings":        { display: "1 Kings",              aliases: ["1 kgs", "1kgs", "1ki"] },
  "2 Kings":        { display: "2 Kings",              aliases: ["2 kgs", "2kgs", "2ki"] },
  "1 Chronicles":   { display: "1 Chronicles",         aliases: ["1 chr", "1chr", "1 chron", "1ch"] },
  "2 Chronicles":   { display: "2 Chronicles",         aliases: ["2 chr", "2chr", "2 chron", "2ch"] },
  "Ezra":           { display: "Ezra",                 aliases: ["ezr"] },
  "Nehemiah":       { display: "Nehemiah",             aliases: ["neh"] },
  "Esther":         { display: "Esther",               aliases: ["esth", "est"] },
  "Job":            { display: "Job",                  aliases: ["jb"] },
  "Psalm":          { display: "Psalm",                aliases: ["ps", "psa", "psalms"] },
  "Proverbs":       { display: "Proverbs",             aliases: ["prov", "pro", "pr"] },
  "Ecclesiastes":   { display: "Ecclesiastes",         aliases: ["eccl", "eccles", "ecc"] },
  "Song Of Solomon":{ display: "Song of Solomon",      aliases: ["song", "sos", "sng", "song of songs"] },
  "Isaiah":         { display: "Isaiah",               aliases: ["isa", "is"] },
  "Jeremiah":       { display: "Jeremiah",             aliases: ["jer"] },
  "Lamentations":   { display: "Lamentations",         aliases: ["lam"] },
  "Ezekiel":        { display: "Ezekiel",              aliases: ["ezek", "eze", "ez"] },
  "Daniel":         { display: "Daniel",               aliases: ["dan"] },
  "Hosea":          { display: "Hosea",                aliases: ["hos"] },
  "Joel":           { display: "Joel",                 aliases: ["jol", "jl"] },
  "Amos":           { display: "Amos",                 aliases: ["amo", "am"] },
  "Obadiah":        { display: "Obadiah",              aliases: ["obad", "oba", "ob"] },
  "Jonah":          { display: "Jonah",                aliases: ["jon"] },
  "Micah":          { display: "Micah",                aliases: ["mic"] },
  "Nahum":          { display: "Nahum",                aliases: ["nah"] },
  "Habakkuk":       { display: "Habakkuk",             aliases: ["hab"] },
  "Zephaniah":      { display: "Zephaniah",            aliases: ["zeph", "zep"] },
  "Haggai":         { display: "Haggai",               aliases: ["hag"] },
  "Zechariah":      { display: "Zechariah",            aliases: ["zech", "zec"] },
  "Malachi":        { display: "Malachi",              aliases: ["mal"] },
  "Matthew":        { display: "Matthew",              aliases: ["matt", "mat", "mt"] },
  "Mark":           { display: "Mark",                 aliases: ["mrk", "mk"] },
  "Luke":           { display: "Luke",                 aliases: ["luk", "lk"] },
  "John":           { display: "John",                 aliases: ["jhn", "jn", "joh"] },
  "Acts":           { display: "Acts",                 aliases: ["act", "ac", "acts of the apostles"] },
  "Romans":         { display: "Romans",               aliases: ["rom", "ro"] },
  "1 Corinthians":  { display: "1 Corinthians",        aliases: ["1 cor", "1cor", "1co"] },
  "2 Corinthians":  { display: "2 Corinthians",        aliases: ["2 cor", "2cor", "2co"] },
  "Galatians":      { display: "Galatians",            aliases: ["gal"] },
  "Ephesians":      { display: "Ephesians",            aliases: ["eph"] },
  "Philippians":    { display: "Philippians",          aliases: ["phil", "php", "phi"] },
  "Colossians":     { display: "Colossians",           aliases: ["col"] },
  "1 Thessalonians":{ display: "1 Thessalonians",      aliases: ["1 thess", "1thess", "1 th", "1th"] },
  "2 Thessalonians":{ display: "2 Thessalonians",      aliases: ["2 thess", "2thess", "2 th", "2th"] },
  "1 Timothy":      { display: "1 Timothy",            aliases: ["1 tim", "1tim", "1ti"] },
  "2 Timothy":      { display: "2 Timothy",            aliases: ["2 tim", "2tim", "2ti"] },
  "Titus":          { display: "Titus",                aliases: ["tit"] },
  "Philemon":       { display: "Philemon",             aliases: ["phlm", "phm", "philem"] },
  "Hebrews":        { display: "Hebrews",              aliases: ["heb"] },
  "James":          { display: "James",                aliases: ["jas", "jms", "jm"] },
  "1 Peter":        { display: "1 Peter",              aliases: ["1 pet", "1pet", "1 pt", "1pe"] },
  "2 Peter":        { display: "2 Peter",              aliases: ["2 pet", "2pet", "2 pt", "2pe"] },
  "1 John":         { display: "1 John",               aliases: ["1 jn", "1jn", "1 joh", "1jo"] },
  "2 John":         { display: "2 John",               aliases: ["2 jn", "2jn", "2 joh", "2jo"] },
  "3 John":         { display: "3 John",               aliases: ["3 jn", "3jn", "3 joh", "3jo"] },
  "Jude":           { display: "Jude",                 aliases: ["jud", "jd"] },
  "Revelation":     { display: "Revelation",           aliases: ["rev", "rv", "apocalypse"] },
};

const TRANSLATIONS: Record<string, Record<string, BookEntry>> = { KR38, WEB };

let currentCode = "WEB";

export function setTranslation(code: string) {
  currentCode = code;
}

export function displayName(book: string): string {
  return TRANSLATIONS[currentCode]?.[book]?.display ?? book;
}

export function displayNameFor(code: string, book: string): string {
  return TRANSLATIONS[code]?.[book]?.display ?? book;
}

/** Returns aliases for all translations merged (current translation wins on conflicts) */
export function getAliases(): Map<string, string> {
  const map = new Map<string, string>();
  // Load all translations first
  for (const [code, entries] of Object.entries(TRANSLATIONS)) {
    if (code === currentCode) continue; // skip current, add it last so it wins
    for (const [key, entry] of Object.entries(entries)) {
      map.set(entry.display.toLowerCase(), key);
      for (const a of entry.aliases) {
        map.set(a.toLowerCase(), key);
      }
    }
  }
  // Current translation last → its aliases take priority
  const entries = TRANSLATIONS[currentCode];
  if (entries) {
    for (const [key, entry] of Object.entries(entries)) {
      map.set(entry.display.toLowerCase(), key);
      for (const a of entry.aliases) {
        map.set(a.toLowerCase(), key);
      }
    }
  }
  return map;
}
