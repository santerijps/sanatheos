// src/client/db.ts
var DB_NAME = "bible-app";
var DB_VERSION = 2;
var DATA_STORE = "data";
var HIGHLIGHTS_STORE = "highlights";
var dbInstance = null;
function open() {
  if (dbInstance)
    return Promise.resolve(dbInstance);
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(DATA_STORE))
        db.createObjectStore(DATA_STORE);
      if (!db.objectStoreNames.contains(HIGHLIGHTS_STORE))
        db.createObjectStore(HIGHLIGHTS_STORE, { keyPath: "id" });
    };
    req.onsuccess = () => {
      dbInstance = req.result;
      dbInstance.onclose = () => {
        dbInstance = null;
      };
      resolve(dbInstance);
    };
    req.onerror = () => reject(req.error);
  });
}
async function loadBible(key) {
  const db = await open();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(DATA_STORE, "readonly");
    const req = tx.objectStore(DATA_STORE).get(key);
    req.onsuccess = () => resolve(req.result ?? null);
    req.onerror = () => reject(req.error);
  });
}
async function saveBible(key, data) {
  const db = await open();
  await new Promise((resolve, reject) => {
    const tx = db.transaction(DATA_STORE, "readwrite");
    tx.objectStore(DATA_STORE).put(data, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
function highlightId(book, chapter, verse) {
  return `${book}:${chapter}:${verse}`;
}
async function getHighlightMap() {
  const db = await open();
  const all = await new Promise((resolve, reject) => {
    const tx = db.transaction(HIGHLIGHTS_STORE, "readonly");
    const req = tx.objectStore(HIGHLIGHTS_STORE).getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  const map = new Map;
  for (const h of all)
    map.set(highlightId(h.book, h.chapter, h.verse), h.color);
  return map;
}
async function setHighlight(h) {
  const db = await open();
  await new Promise((resolve, reject) => {
    const tx = db.transaction(HIGHLIGHTS_STORE, "readwrite");
    tx.objectStore(HIGHLIGHTS_STORE).put({ ...h, id: highlightId(h.book, h.chapter, h.verse) });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
async function removeHighlight(book, chapter, verse) {
  const db = await open();
  await new Promise((resolve, reject) => {
    const tx = db.transaction(HIGHLIGHTS_STORE, "readwrite");
    tx.objectStore(HIGHLIGHTS_STORE).delete(highlightId(book, chapter, verse));
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
async function loadInterlinearBook(book) {
  const db = await open();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(DATA_STORE, "readonly");
    const req = tx.objectStore(DATA_STORE).get(`il:${book}`);
    req.onsuccess = () => resolve(req.result ?? null);
    req.onerror = () => reject(req.error);
  });
}
async function saveInterlinearBook(book, data) {
  const db = await open();
  await new Promise((resolve, reject) => {
    const tx = db.transaction(DATA_STORE, "readwrite");
    tx.objectStore(DATA_STORE).put(data, `il:${book}`);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
async function loadStrongsDict() {
  const db = await open();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(DATA_STORE, "readonly");
    const req = tx.objectStore(DATA_STORE).get("strongs");
    req.onsuccess = () => resolve(req.result ?? null);
    req.onerror = () => reject(req.error);
  });
}
async function saveStrongsDict(data) {
  const db = await open();
  await new Promise((resolve, reject) => {
    const tx = db.transaction(DATA_STORE, "readwrite");
    tx.objectStore(DATA_STORE).put(data, "strongs");
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// src/client/bookNames.ts
var KR38 = {
  Genesis: { display: "1. Mooseksen kirja", aliases: ["1 moos", "1. moos", "1. mooseksen kirja"] },
  Exodus: { display: "2. Mooseksen kirja", aliases: ["2 moos", "2. moos", "2. mooseksen kirja"] },
  Leviticus: { display: "3. Mooseksen kirja", aliases: ["3 moos", "3. moos", "3. mooseksen kirja"] },
  Numbers: { display: "4. Mooseksen kirja", aliases: ["4 moos", "4. moos", "4. mooseksen kirja"] },
  Deuteronomy: { display: "5. Mooseksen kirja", aliases: ["5 moos", "5. moos", "5. mooseksen kirja"] },
  Joshua: { display: "Joosuan kirja", aliases: ["joos", "joosua"] },
  Judges: { display: "Tuomarien kirja", aliases: ["tuom", "tuomarit"] },
  Ruth: { display: "Ruutin kirja", aliases: ["ruut"] },
  "1 Samuel": { display: "1. Samuelin kirja", aliases: ["1 sam", "1. sam", "1. samuelin kirja"] },
  "2 Samuel": { display: "2. Samuelin kirja", aliases: ["2 sam", "2. sam", "2. samuelin kirja"] },
  "1 Kings": { display: "1. Kuninkaiden kirja", aliases: ["1 kun", "1. kun", "1. kuninkaiden kirja"] },
  "2 Kings": { display: "2. Kuninkaiden kirja", aliases: ["2 kun", "2. kun", "2. kuninkaiden kirja"] },
  "1 Chronicles": { display: "1. Aikakirja", aliases: ["1 aik", "1. aik", "1. aikakirja"] },
  "2 Chronicles": { display: "2. Aikakirja", aliases: ["2 aik", "2. aik", "2. aikakirja"] },
  Ezra: { display: "Esran kirja", aliases: ["esra", "esran kirja"] },
  Nehemiah: { display: "Nehemian kirja", aliases: ["neh", "nehemia"] },
  Esther: { display: "Esterin kirja", aliases: ["est", "esteri"] },
  Job: { display: "Jobin kirja", aliases: ["jobin kirja"] },
  Psalm: { display: "Psalmit", aliases: ["ps", "psalmit", "psalmien kirja"] },
  Proverbs: { display: "Sananlaskut", aliases: ["sananl", "sananlaskut"] },
  Ecclesiastes: { display: "Saarnaaja", aliases: ["saarn", "saarnaaja", "saarnaajan kirja"] },
  "Song Of Solomon": { display: "Laulujen laulu", aliases: ["laul", "laulujen laulu"] },
  Isaiah: { display: "Jesajan kirja", aliases: ["jes", "jesaja"] },
  Jeremiah: { display: "Jeremian kirja", aliases: ["jer", "jeremia"] },
  Lamentations: { display: "Valitusvirret", aliases: ["val", "valitusvirret"] },
  Ezekiel: { display: "Hesekielin kirja", aliases: ["hes", "hesekiel"] },
  Daniel: { display: "Danielin kirja", aliases: ["danielin kirja"] },
  Hosea: { display: "Hoosean kirja", aliases: ["hoos", "hoosea"] },
  Joel: { display: "Joelin kirja", aliases: ["joelin kirja"] },
  Amos: { display: "Aamoksen kirja", aliases: ["aam", "aamos"] },
  Obadiah: { display: "Obadjan kirja", aliases: ["obad", "obadja"] },
  Jonah: { display: "Joonan kirja", aliases: ["joon", "joona"] },
  Micah: { display: "Miikan kirja", aliases: ["miik", "miika"] },
  Nahum: { display: "Nahumin kirja", aliases: ["nah", "nahum"] },
  Habakkuk: { display: "Habakukin kirja", aliases: ["hab", "habakuk"] },
  Zephaniah: { display: "Sefanjan kirja", aliases: ["sef", "sefanja"] },
  Haggai: { display: "Haggain kirja", aliases: ["hagg", "haggai"] },
  Zechariah: { display: "Sakarjan kirja", aliases: ["sak", "sakarja"] },
  Malachi: { display: "Malakian kirja", aliases: ["malakia", "malakian kirja"] },
  Tobit: { display: "Tobitin kirja", aliases: ["tob", "tobit"] },
  Judith: { display: "Juditin kirja", aliases: ["judit"] },
  "Esther (Greek)": { display: "Esterin kirja (kreikk.)", aliases: ["est kreikk", "esteri kreikk"] },
  Wisdom: { display: "Viisauden kirja", aliases: ["viis", "viisaus"] },
  Sirach: { display: "Sirakin kirja", aliases: ["sirak", "sir"] },
  Baruch: { display: "Barukin kirja", aliases: ["baruk"] },
  "Prayer of Azariah": { display: "Asarjan rukous", aliases: ["asarjan rukous"] },
  Susanna: { display: "Susanna", aliases: [] },
  "Bel and the Dragon": { display: "Bel ja lohikäärme", aliases: ["bel"] },
  "1 Maccabees": { display: "1. Makkabealaiskirja", aliases: ["1 makk", "1. makk"] },
  "2 Maccabees": { display: "2. Makkabealaiskirja", aliases: ["2 makk", "2. makk"] },
  "1 Esdras": { display: "1. Esdran kirja", aliases: ["1 esdr", "1. esdr"] },
  "Prayer of Manasses": { display: "Manassen rukous", aliases: ["manassen rukous"] },
  "Additional Psalm": { display: "Psalmi 151", aliases: ["ps 151", "psalmi 151"] },
  "3 Maccabees": { display: "3. Makkabealaiskirja", aliases: ["3 makk", "3. makk"] },
  "2 Esdras": { display: "2. Esdran kirja", aliases: ["2 esdr", "2. esdr"] },
  "4 Maccabees": { display: "4. Makkabealaiskirja", aliases: ["4 makk", "4. makk"] },
  Laodiceans: { display: "Laodikealaiskirje", aliases: ["laodikea"] },
  Matthew: { display: "Matteuksen evankeliumi", aliases: ["matt", "matteus"] },
  Mark: { display: "Markuksen evankeliumi", aliases: ["markus", "markuksen evankeliumi"] },
  Luke: { display: "Luukkaan evankeliumi", aliases: ["luuk", "luukas"] },
  John: { display: "Johanneksen evankeliumi", aliases: ["joh", "johannes"] },
  Acts: { display: "Apostolien teot", aliases: ["ap. t.", "apt", "apostolien teot"] },
  Romans: { display: "Roomalaiskirje", aliases: ["room", "roomalaiskirje"] },
  "1 Corinthians": { display: "1. Korinttilaiskirje", aliases: ["1 kor", "1. kor", "1. korinttilaiskirje"] },
  "2 Corinthians": { display: "2. Korinttilaiskirje", aliases: ["2 kor", "2. kor", "2. korinttilaiskirje"] },
  Galatians: { display: "Galatalaiskirje", aliases: ["gal", "galatalaiskirje"] },
  Ephesians: { display: "Efesolaiskirje", aliases: ["ef", "efesolaiskirje"] },
  Philippians: { display: "Filippiläiskirje", aliases: ["fil", "filippiläiskirje"] },
  Colossians: { display: "Kolossalaiskirje", aliases: ["kol", "kolossalaiskirje"] },
  "1 Thessalonians": { display: "1. Tessalonikalaiskirje", aliases: ["1 tess", "1. tess", "1. tessalonikalaiskirje"] },
  "2 Thessalonians": { display: "2. Tessalonikalaiskirje", aliases: ["2 tess", "2. tess", "2. tessalonikalaiskirje"] },
  "1 Timothy": { display: "1. Timoteuskirje", aliases: ["1 tim", "1. tim", "1. timoteuskirje"] },
  "2 Timothy": { display: "2. Timoteuskirje", aliases: ["2 tim", "2. tim", "2. timoteuskirje"] },
  Titus: { display: "Tituskirje", aliases: ["tit", "tituskirje"] },
  Philemon: { display: "Filemonkirje", aliases: ["filem", "filemonkirje"] },
  Hebrews: { display: "Heprealaiskirje", aliases: ["hepr", "heprealaiskirje"] },
  James: { display: "Jaakobin kirje", aliases: ["jaak", "jaakob", "jaakobin kirje"] },
  "1 Peter": { display: "1. Pietarin kirje", aliases: ["1 piet", "1. piet", "1. pietarin kirje"] },
  "2 Peter": { display: "2. Pietarin kirje", aliases: ["2 piet", "2. piet", "2. pietarin kirje"] },
  "1 John": { display: "1. Johanneksen kirje", aliases: ["1 joh", "1. joh", "1. johanneksen kirje"] },
  "2 John": { display: "2. Johanneksen kirje", aliases: ["2 joh", "2. joh", "2. johanneksen kirje"] },
  "3 John": { display: "3. Johanneksen kirje", aliases: ["3 joh", "3. joh", "3. johanneksen kirje"] },
  Jude: { display: "Juudaksen kirje", aliases: ["juud", "juudas", "juudaksen kirje"] },
  Revelation: { display: "Ilmestyskirja", aliases: ["ilm", "ilmestyskirja"] }
};
var EN = {
  Genesis: { display: "Genesis", aliases: ["gen"] },
  Exodus: { display: "Exodus", aliases: ["exod", "exo", "ex"] },
  Leviticus: { display: "Leviticus", aliases: ["lev"] },
  Numbers: { display: "Numbers", aliases: ["num"] },
  Deuteronomy: { display: "Deuteronomy", aliases: ["deut", "deu", "dt"] },
  Joshua: { display: "Joshua", aliases: ["josh", "jos"] },
  Judges: { display: "Judges", aliases: ["judg", "jdg"] },
  Ruth: { display: "Ruth", aliases: ["rut", "ru"] },
  "1 Samuel": { display: "1 Samuel", aliases: ["1 sam", "1sam", "1sa"] },
  "2 Samuel": { display: "2 Samuel", aliases: ["2 sam", "2sam", "2sa"] },
  "1 Kings": { display: "1 Kings", aliases: ["1 kgs", "1kgs", "1ki"] },
  "2 Kings": { display: "2 Kings", aliases: ["2 kgs", "2kgs", "2ki"] },
  "1 Chronicles": { display: "1 Chronicles", aliases: ["1 chr", "1chr", "1 chron", "1ch"] },
  "2 Chronicles": { display: "2 Chronicles", aliases: ["2 chr", "2chr", "2 chron", "2ch"] },
  Ezra: { display: "Ezra", aliases: ["ezr"] },
  Nehemiah: { display: "Nehemiah", aliases: ["neh"] },
  Esther: { display: "Esther", aliases: ["esth", "est"] },
  Job: { display: "Job", aliases: ["jb"] },
  Psalm: { display: "Psalm", aliases: ["ps", "psa", "psalms"] },
  Proverbs: { display: "Proverbs", aliases: ["prov", "pro", "pr"] },
  Ecclesiastes: { display: "Ecclesiastes", aliases: ["eccl", "eccles", "ecc"] },
  "Song Of Solomon": { display: "Song of Solomon", aliases: ["song", "sos", "sng", "song of songs"] },
  Isaiah: { display: "Isaiah", aliases: ["isa", "is"] },
  Jeremiah: { display: "Jeremiah", aliases: ["jer"] },
  Lamentations: { display: "Lamentations", aliases: ["lam"] },
  Ezekiel: { display: "Ezekiel", aliases: ["ezek", "eze", "ez"] },
  Daniel: { display: "Daniel", aliases: ["dan"] },
  Hosea: { display: "Hosea", aliases: ["hos"] },
  Joel: { display: "Joel", aliases: ["jol", "jl"] },
  Amos: { display: "Amos", aliases: ["amo", "am"] },
  Obadiah: { display: "Obadiah", aliases: ["obad", "oba", "ob"] },
  Jonah: { display: "Jonah", aliases: ["jon"] },
  Micah: { display: "Micah", aliases: ["mic"] },
  Nahum: { display: "Nahum", aliases: ["nah"] },
  Habakkuk: { display: "Habakkuk", aliases: ["hab"] },
  Zephaniah: { display: "Zephaniah", aliases: ["zeph", "zep"] },
  Haggai: { display: "Haggai", aliases: ["hag"] },
  Zechariah: { display: "Zechariah", aliases: ["zech", "zec"] },
  Malachi: { display: "Malachi", aliases: ["mal"] },
  Tobit: { display: "Tobit", aliases: ["tob"] },
  Judith: { display: "Judith", aliases: ["jdt"] },
  "Esther (Greek)": { display: "Esther (Greek)", aliases: ["esg", "greek esther"] },
  Wisdom: { display: "Wisdom", aliases: ["wis", "wisdom of solomon"] },
  Sirach: { display: "Sirach", aliases: ["sir", "ecclesiasticus"] },
  Baruch: { display: "Baruch", aliases: ["bar"] },
  "Prayer of Azariah": { display: "Prayer of Azariah", aliases: ["pra", "azariah"] },
  Susanna: { display: "Susanna", aliases: ["sus"] },
  "Bel and the Dragon": { display: "Bel and the Dragon", aliases: ["bel"] },
  "1 Maccabees": { display: "1 Maccabees", aliases: ["1 macc", "1macc", "1ma"] },
  "2 Maccabees": { display: "2 Maccabees", aliases: ["2 macc", "2macc", "2ma"] },
  "1 Esdras": { display: "1 Esdras", aliases: ["1 esdr", "1esdr", "1es"] },
  "Prayer of Manasses": { display: "Prayer of Manasses", aliases: ["man", "manasses"] },
  "Additional Psalm": { display: "Additional Psalm", aliases: ["psalm 151", "ps 151"] },
  "3 Maccabees": { display: "3 Maccabees", aliases: ["3 macc", "3macc", "3ma"] },
  "2 Esdras": { display: "2 Esdras", aliases: ["2 esdr", "2esdr", "2es"] },
  "4 Maccabees": { display: "4 Maccabees", aliases: ["4 macc", "4macc", "4ma"] },
  Laodiceans: { display: "Laodiceans", aliases: ["lao"] },
  Matthew: { display: "Matthew", aliases: ["matt", "mat", "mt"] },
  Mark: { display: "Mark", aliases: ["mrk", "mk"] },
  Luke: { display: "Luke", aliases: ["luk", "lk"] },
  John: { display: "John", aliases: ["jhn", "jn", "joh"] },
  Acts: { display: "Acts", aliases: ["act", "ac", "acts of the apostles"] },
  Romans: { display: "Romans", aliases: ["rom", "ro"] },
  "1 Corinthians": { display: "1 Corinthians", aliases: ["1 cor", "1cor", "1co"] },
  "2 Corinthians": { display: "2 Corinthians", aliases: ["2 cor", "2cor", "2co"] },
  Galatians: { display: "Galatians", aliases: ["gal"] },
  Ephesians: { display: "Ephesians", aliases: ["eph"] },
  Philippians: { display: "Philippians", aliases: ["phil", "php", "phi"] },
  Colossians: { display: "Colossians", aliases: ["col"] },
  "1 Thessalonians": { display: "1 Thessalonians", aliases: ["1 thess", "1thess", "1 th", "1th"] },
  "2 Thessalonians": { display: "2 Thessalonians", aliases: ["2 thess", "2thess", "2 th", "2th"] },
  "1 Timothy": { display: "1 Timothy", aliases: ["1 tim", "1tim", "1ti"] },
  "2 Timothy": { display: "2 Timothy", aliases: ["2 tim", "2tim", "2ti"] },
  Titus: { display: "Titus", aliases: ["tit"] },
  Philemon: { display: "Philemon", aliases: ["phlm", "phm", "philem"] },
  Hebrews: { display: "Hebrews", aliases: ["heb"] },
  James: { display: "James", aliases: ["jas", "jms", "jm"] },
  "1 Peter": { display: "1 Peter", aliases: ["1 pet", "1pet", "1 pt", "1pe"] },
  "2 Peter": { display: "2 Peter", aliases: ["2 pet", "2pet", "2 pt", "2pe"] },
  "1 John": { display: "1 John", aliases: ["1 jn", "1jn", "1 joh", "1jo"] },
  "2 John": { display: "2 John", aliases: ["2 jn", "2jn", "2 joh", "2jo"] },
  "3 John": { display: "3 John", aliases: ["3 jn", "3jn", "3 joh", "3jo"] },
  Jude: { display: "Jude", aliases: ["jud", "jd"] },
  Revelation: { display: "Revelation", aliases: ["rev", "rv", "apocalypse"] }
};
var TRANSLATIONS = {
  KR38,
  NHEB: EN,
  KJV: EN,
  CPDV: EN
};
var currentCode = "NHEB";
var aliasCache = null;
var sortedAliasCache = null;
function setTranslation(code) {
  currentCode = code;
  aliasCache = null;
  sortedAliasCache = null;
}
function displayName(book) {
  return TRANSLATIONS[currentCode]?.[book]?.display ?? book;
}
function displayNameFor(code, book) {
  return TRANSLATIONS[code]?.[book]?.display ?? book;
}
function getAliases() {
  if (aliasCache)
    return aliasCache;
  const map = new Map;
  for (const [code, entries2] of Object.entries(TRANSLATIONS)) {
    if (code === currentCode)
      continue;
    for (const [key, entry] of Object.entries(entries2)) {
      map.set(entry.display.toLowerCase(), key);
      for (const a of entry.aliases) {
        map.set(a.toLowerCase(), key);
      }
    }
  }
  const entries = TRANSLATIONS[currentCode];
  if (entries) {
    for (const [key, entry] of Object.entries(entries)) {
      map.set(entry.display.toLowerCase(), key);
      for (const a of entry.aliases) {
        map.set(a.toLowerCase(), key);
      }
    }
  }
  aliasCache = map;
  return map;
}
function getSortedAliases() {
  if (sortedAliasCache)
    return sortedAliasCache;
  sortedAliasCache = [...getAliases().entries()].sort((a, b) => b[0].length - a[0].length);
  return sortedAliasCache;
}

// src/client/search.ts
var searchData = {};
var bookNames = [];
var interlinearData = new Map;
function initSearch(data) {
  searchData = data;
  bookNames = Object.keys(data);
}
function setSearchInterlinearData(data) {
  interlinearData = data;
}
function levenshtein(a, b) {
  const m = a.length;
  const n = b.length;
  const dp = Array.from({ length: n + 1 }, (_, i) => i);
  for (let i = 1;i <= m; i++) {
    let prev = dp[0];
    dp[0] = i;
    for (let j = 1;j <= n; j++) {
      const tmp = dp[j];
      dp[j] = a[i - 1] === b[j - 1] ? prev : 1 + Math.min(prev, dp[j], dp[j - 1]);
      prev = tmp;
    }
  }
  return dp[n];
}
function normalizeQuery(query) {
  let q = query.replace(/[\u2013\u2014]/g, "-");
  q = q.replace(/,\s+(?=[A-Za-zÄÖÅäöå]|\d\.?\s+[A-Za-zÄÖÅäöå])/g, "; ");
  return q;
}
function matchBook(q) {
  const nq = q.replace(/([a-zA-ZÄÖÅäöå])\./g, "$1");
  const ql = nq.toLowerCase();
  const sorted = [...bookNames].sort((a, b) => b.length - a.length);
  for (const book of sorted) {
    const bl = book.toLowerCase();
    if (ql === bl)
      return { book, rest: "" };
    if (ql.startsWith(bl + " "))
      return { book, rest: nq.slice(book.length + 1).trim() };
  }
  const sortedAliases = getSortedAliases();
  for (const [alias, key] of sortedAliases) {
    if (ql === alias)
      return { book: key, rest: "" };
    if (ql.startsWith(alias + " "))
      return { book: key, rest: nq.slice(alias.length + 1).trim() };
  }
  for (const [alias, key] of sortedAliases) {
    const na = alias.replace(/([a-zäöå])\./g, "$1");
    if (na === alias)
      continue;
    if (ql === na)
      return { book: key, rest: "" };
    if (ql.startsWith(na + " "))
      return { book: key, rest: nq.slice(na.length + 1).trim() };
  }
  const m = ql.match(/^(\d\.?\s+)?([a-zäöå\s]+?)(?:\s+(\d.*))?$/);
  if (!m)
    return null;
  const prefix = ((m[1] || "") + m[2]).trim();
  const rest = (m[3] || "").trim();
  for (const book of sorted) {
    if (book.toLowerCase().startsWith(prefix)) {
      return { book, rest };
    }
  }
  for (const [alias, key] of sortedAliases) {
    if (alias.startsWith(prefix)) {
      return { book: key, rest };
    }
  }
  if (prefix.length >= 3) {
    const maxDist = prefix.length <= 5 ? 1 : 2;
    let bestDist = maxDist + 1;
    let bestBook = null;
    for (const book of sorted) {
      const d = levenshtein(prefix, book.toLowerCase());
      if (d < bestDist) {
        bestDist = d;
        bestBook = book;
      }
    }
    for (const [alias, key] of sortedAliases) {
      const d = levenshtein(prefix, alias);
      if (d < bestDist) {
        bestDist = d;
        bestBook = key;
      }
    }
    if (bestBook)
      return { book: bestBook, rest };
  }
  return null;
}
function parseVerseSegments(s) {
  const parts = s.split(",").map((p) => p.trim()).filter(Boolean);
  const segs = [];
  for (const part of parts) {
    const range = part.match(/^(\d+)-(\d+)$/);
    if (range) {
      const start = +range[1], end = +range[2];
      if (start > end)
        return null;
      segs.push({ start, end });
      continue;
    }
    const single = part.match(/^(\d+)$/);
    if (single) {
      segs.push({ start: +single[1], end: +single[1] });
      continue;
    }
    return null;
  }
  return segs.length ? segs : null;
}
function parseRef(term) {
  const t = term.trim();
  if (!t)
    return null;
  const bm = matchBook(t);
  if (!bm)
    return null;
  if (!bm.rest)
    return { book: bm.book };
  const rest = bm.rest.replace(/[-,:]+$/, "");
  if (!rest)
    return { book: bm.book };
  const cvm = rest.match(/^(\d+):(.+)$/);
  if (cvm) {
    const segStr = cvm[2].replace(/[-,]+$/, "");
    const segs = segStr ? parseVerseSegments(segStr) : null;
    if (segs)
      return { book: bm.book, chapterStart: +cvm[1], chapterEnd: +cvm[1], verseSegments: segs };
    if (!segStr)
      return { book: bm.book, chapterStart: +cvm[1], chapterEnd: +cvm[1] };
  }
  const cr = rest.match(/^(\d+)-(\d+)$/);
  if (cr)
    return { book: bm.book, chapterStart: +cr[1], chapterEnd: +cr[2] };
  const sc = rest.match(/^(\d+)$/);
  if (sc)
    return { book: bm.book, chapterStart: +sc[1], chapterEnd: +sc[1] };
  return null;
}
function tryParseNav(query) {
  const terms = normalizeQuery(query).split(/;/).map((t) => t.trim()).filter(Boolean);
  if (!terms.length)
    return null;
  const refs = [];
  for (const term of terms) {
    if (term.match(/"(.*?)"/))
      return null;
    const ref = parseRef(term);
    if (!ref)
      return null;
    refs.push({ book: ref.book, chapterStart: ref.chapterStart, chapterEnd: ref.chapterEnd, verseSegments: ref.verseSegments });
  }
  return refs;
}
function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
function buildTextMatcher(filter) {
  const hasStart = filter.startsWith("^");
  const hasEnd = filter.endsWith("$") && filter.length > (hasStart ? 1 : 0);
  const core = filter.slice(hasStart ? 1 : 0, hasEnd ? -1 : undefined);
  if (!core)
    return () => false;
  if (!hasStart && !hasEnd) {
    const lower = core.toLowerCase();
    return (text) => text.toLowerCase().includes(lower);
  }
  const pattern = (hasStart ? "\\b" : "") + escapeRegex(core) + (hasEnd ? "\\b" : "");
  const re = new RegExp(pattern, "i");
  return (text) => re.test(text);
}
function search(data, query) {
  const terms = normalizeQuery(query).split(/;/).map((t) => t.trim()).filter(Boolean);
  const results = [];
  const seen = new Set;
  for (const term of terms) {
    const quotedMatch = term.match(/"(.*?)"/);
    const rawFilter = quotedMatch && quotedMatch[1].length > 0 ? quotedMatch[1] : null;
    const textMatch = rawFilter ? buildTextMatcher(rawFilter) : null;
    const refPart = quotedMatch ? term.replace(/"(.*?)"/, "").trim() : term;
    const strongsMatch = refPart.match(/^([GHgh]\d+)$/);
    if (strongsMatch && interlinearData.size > 0) {
      const strongsId = strongsMatch[1].toLowerCase();
      for (const [book, ilBook] of interlinearData) {
        for (const [c, ilChapter] of Object.entries(ilBook)) {
          for (const [v, words] of Object.entries(ilChapter)) {
            const hasStrongs = words.some((w) => w.strongs === strongsId);
            if (hasStrongs) {
              const text = searchData[book]?.[c]?.[v] || "";
              const k = `${book}:${c}:${v}`;
              if (!seen.has(k)) {
                seen.add(k);
                results.push({ book, chapter: +c, verse: +v, text });
              }
            }
          }
        }
      }
      continue;
    }
    if (textMatch && !refPart) {
      for (const book of bookNames) {
        for (const [c, verses] of Object.entries(searchData[book])) {
          for (const [v, text] of Object.entries(verses)) {
            if (textMatch(text)) {
              const k = `${book}:${c}:${v}`;
              if (!seen.has(k)) {
                seen.add(k);
                results.push({ book, chapter: +c, verse: +v, text });
              }
            }
          }
        }
      }
      continue;
    }
    const ref = parseRef(refPart);
    if (ref && data[ref.book]) {
      const bookData = data[ref.book];
      if (ref.chapterStart !== undefined && ref.chapterEnd !== undefined) {
        for (let c = ref.chapterStart;c <= ref.chapterEnd; c++) {
          const ch = bookData[String(c)];
          if (!ch)
            continue;
          const segments = ref.verseSegments ? ref.verseSegments : [{ start: 1, end: Math.max(...Object.keys(ch).map(Number)) }];
          for (const seg of segments) {
            for (let v = seg.start;v <= seg.end; v++) {
              const text = ch[String(v)];
              if (!text)
                continue;
              if (textMatch && !textMatch(text))
                continue;
              const k = `${ref.book}:${c}:${v}`;
              if (!seen.has(k)) {
                seen.add(k);
                results.push({ book: ref.book, chapter: c, verse: v, text });
              }
            }
          }
        }
      } else {
        for (const [c, verses] of Object.entries(bookData)) {
          for (const [v, text] of Object.entries(verses)) {
            if (textMatch && !textMatch(text))
              continue;
            const k = `${ref.book}:${c}:${v}`;
            if (!seen.has(k)) {
              seen.add(k);
              results.push({ book: ref.book, chapter: +c, verse: +v, text });
            }
          }
        }
      }
      continue;
    }
  }
  return results;
}
function parseQueryBooks(query) {
  return normalizeQuery(query).split(/;/).map((t) => t.trim()).filter(Boolean).map((term) => {
    const qm = term.match(/"(.*?)"/);
    const quoted = qm ? qm[0] : "";
    const refPart = qm ? term.replace(/"(.*?)"/, "").trim() : term;
    if (!refPart)
      return { book: "", rest: "", quoted, original: term };
    const bm = matchBook(refPart);
    if (!bm)
      return { book: "", rest: "", quoted: "", original: term };
    return { book: bm.book, rest: bm.rest, quoted, original: term };
  });
}

// src/client/bookCodes.ts
var CODE_TO_BOOK = {
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
  rev: "Revelation"
};
var BOOK_TO_CODE = new Map;
for (const [code, book] of Object.entries(CODE_TO_BOOK)) {
  BOOK_TO_CODE.set(book, code);
}
function bookFromCode(code) {
  return CODE_TO_BOOK[code.toLowerCase()];
}
function bookToCode(book) {
  return BOOK_TO_CODE.get(book);
}

// src/client/state.ts
function readState() {
  const p = new URLSearchParams(window.location.search);
  const s = {};
  if (p.has("q"))
    s.query = p.get("q");
  if (p.has("book")) {
    const raw = p.get("book");
    s.book = bookFromCode(raw) ?? raw;
  }
  if (p.has("chapter")) {
    const n = +p.get("chapter");
    if (Number.isFinite(n))
      s.chapter = n;
  }
  if (p.has("verse")) {
    const n = +p.get("verse");
    if (Number.isFinite(n))
      s.verse = n;
  }
  if (p.has("t"))
    s.translation = p.get("t").toUpperCase();
  if (p.has("p"))
    s.parallel = p.get("p").toUpperCase();
  if (p.get("il") === "1")
    s.interlinear = true;
  return s;
}
var basePath = typeof window !== "undefined" ? window.location.pathname.replace(/\/+$/, "") + "/" : "/";
function toUrl(s) {
  const p = new URLSearchParams;
  if (s.translation)
    p.set("t", s.translation);
  if (s.parallel)
    p.set("p", s.parallel);
  if (s.interlinear)
    p.set("il", "1");
  if (s.query)
    p.set("q", s.query);
  if (s.book)
    p.set("book", bookToCode(s.book) ?? s.book);
  if (s.chapter !== undefined)
    p.set("chapter", String(s.chapter));
  if (s.verse !== undefined)
    p.set("verse", String(s.verse));
  const qs = p.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}
function pushState(s) {
  history.pushState(s, "", toUrl(s));
}
function replaceState(s) {
  history.replaceState(s, "", toUrl(s));
}
function stateToInputText(s) {
  if (s.query)
    return s.query;
  if (s.book && s.chapter && s.verse)
    return `${displayName(s.book)} ${s.chapter}:${s.verse}`;
  if (s.book && s.chapter)
    return `${displayName(s.book)} ${s.chapter}`;
  if (s.book)
    return displayName(s.book);
  return "";
}

// src/client/i18n.ts
var EN2 = {
  helpInfo: "Help & info",
  settings: "Settings",
  searchPlaceholder: 'Search: John 3:16; Gen 1-3 "Adam"',
  browseBooks: "Browse books",
  notFound: "Not found.",
  readFullChapter: "Read the full chapter",
  loadingBible: "Loading Bible…",
  loadingTranslation: (code) => `Loading ${code}…`,
  loadFailed: "Failed to load Bible data. Please refresh the page.",
  loadTranslationFailed: (code) => `Failed to load ${code}. Please try again.`,
  chapter: "Chapter",
  noResults: (q) => `No results for “${q}”`,
  resultCount: (n) => `${n} result${n !== 1 ? "s" : ""}`,
  settingsTitle: "Settings",
  translationLabel: "Bible translation",
  languageLabel: "Application language",
  themeLabel: "Theme",
  themeLight: "Light",
  themeDark: "Dark",
  themeSystem: "System",
  parallelLabel: "Parallel translation",
  parallelNone: "None",
  fontSizeLabel: "Font size",
  fontSizeSmall: "Small",
  fontSizeMedium: "Medium",
  fontSizeLarge: "Large",
  fontSizeXL: "Extra large",
  fontSizeXXL: "Huge",
  infoTitle: "Sanatheos",
  infoSearchTitle: "Search Input",
  infoSearchIntro: "Type in the search bar to find verses. Supported query formats:",
  infoSearchItems: [
    "<strong>Book reference</strong> &mdash; <code>John</code>, <code>Genesis</code>",
    "<strong>Chapter</strong> &mdash; <code>John 3</code>, <code>Gen 1</code>",
    "<strong>Chapter range</strong> &mdash; <code>Genesis 1-3</code>",
    "<strong>Verse</strong> &mdash; <code>John 3:16</code>",
    "<strong>Verse range</strong> &mdash; <code>Genesis 1:1-5</code>",
    "<strong>Multiple verses</strong> &mdash; <code>Genesis 1:1-3,5,8-10</code>",
    '<strong>Text search</strong> &mdash; <code>"grace"</code> (wrap in double quotes). Use <code>"^grace"</code> (starts with), <code>"grace$"</code> (ends with), <code>"^grace$"</code> (exact word) for word boundaries.',
    '<strong>Combined</strong> &mdash; <code>Romans "faith"</code>, <code>Gen 1-3 "light"</code>',
    "<strong>Multiple terms</strong> &mdash; separate with <code>;</code> e.g. <code>John 3:16; Rev 1:1</code>"
  ],
  infoSearchNote: 'Typing <kbd>"</kbd> auto-inserts a closing quote. Abbreviations like <code>gen</code>, <code>rev</code>, <code>eph</code> are supported.',
  infoBrowseTitle: "Browse Books",
  infoBrowseText: "Click the <strong>&#9776;</strong> menu button (or press <kbd>Ctrl+I</kbd>) to open the book index panel. Browse books, chapters, and verses in three columns. Use arrow keys to navigate and Enter to select.",
  infoShortcutsTitle: "Keyboard Shortcuts",
  infoShortcuts: [
    "<kbd>Ctrl+K</kbd> &mdash; Focus search input",
    "<kbd>Ctrl+I</kbd> &mdash; Toggle book index panel",
    "<kbd>Escape</kbd> &mdash; Close any open panel",
    "<kbd>&uarr;</kbd> <kbd>&darr;</kbd> &mdash; Navigate items in the index panel",
    "<kbd>&larr;</kbd> <kbd>&rarr;</kbd> / <kbd>Tab</kbd> &mdash; Switch columns in the index panel",
    "<kbd>Enter</kbd> &mdash; Select item in the index panel"
  ],
  infoSettingsTitle: "Settings",
  infoSettingsText: "Click the <strong>&#9881;</strong> gear button to open settings. You can switch between Bible translations (e.g. NHEB, KR38), choose a <strong>parallel translation</strong> (side-by-side view), set the <strong>theme</strong> (Light, Dark, or System), and change the application language. All selections are saved across sessions.",
  infoFeaturesTitle: "Features",
  infoFeaturesItems: [
    "<strong>Highlights</strong> &mdash; Right-click a verse number and choose a highlight color (yellow, green, blue, pink, orange). Choose &ldquo;Remove highlight&rdquo; to clear it.",
    "<strong>Copy</strong> &mdash; Click the <strong>&#128203;</strong> button on a section heading to copy displayed verses. In parallel mode, both translations are included.",
    "<strong>Descriptions</strong> &mdash; When reading a full chapter or book, a short description is shown below the title summarizing the content.",
    "<strong>Swipe navigation</strong> &mdash; On touch devices, swipe left or right to move between chapters.",
    "<strong>Print</strong> &mdash; Use <kbd>Ctrl+P</kbd> for a clean, print-optimized layout.",
    "<strong>Install as app</strong> &mdash; Sanatheos is a Progressive Web App. Use your browser’s “Install” or “Add to Home Screen” option to install it for quick, offline access."
  ],
  infoDataTitle: "Data & Storage",
  infoDataText: "Bible text is fetched once from the server and cached locally in your browser using <strong>IndexedDB</strong> for fast offline access. No data is sent to any third party. Everything runs in your browser.",
  oldTestament: "Old Testament",
  newTestament: "New Testament",
  deuterocanonical: "Deuterocanonical",
  footerLine1: "All available Bible translations are in the public domain.",
  footerDescriptions: 'Book and chapter descriptions are sourced from the <a href="https://www.sacredbible.org/catholic/index.htm" target="_blank" rel="noopener noreferrer">Catholic Public Domain Version</a> (CPDV).',
  footerStyleguide: 'Paragraph and poetry formatting is based on the <a href="https://worldenglish.bible" target="_blank" rel="noopener noreferrer">World English Bible</a> (WEB) translation.',
  footerFavicon: 'Application icon: &ldquo;<a href="https://commons.wikimedia.org/wiki/File:Jesus-Christ-from-Hagia-Sophia.jpg" target="_blank" rel="noopener noreferrer">Jesus Christ from Hagia Sophia</a>&rdquo; by Edal Anton Lefterov, licensed under <a href="https://creativecommons.org/licenses/by-sa/3.0?ref=openverse" target="_blank" rel="noopener noreferrer">CC BY-SA 3.0</a>',
  copied: "Copied!",
  copyVerse: "Copy",
  copyBoth: "Copy both",
  shareWith: "Share link with",
  shareWithout: "Share link",
  linkCopied: "Link copied!",
  highlight: "Highlight",
  removeHighlight: "Remove highlight",
  showMore: "Show more",
  interlinear: "Interlinear",
  interlinearTooltip: "Show original Hebrew/Greek with Strong’s numbers",
  strongsDef: "Strong’s Definition",
  pronunciation: "Pronunciation",
  partOfSpeech: "Part of speech",
  morphology: "Morphology",
  crossReferences: "References",
  closePanel: "Close"
};
var FI = {
  helpInfo: "Ohje ja tiedot",
  settings: "Asetukset",
  searchPlaceholder: 'Haku: Joh 3:16; 1 Moos 1-3 "Aadam"',
  browseBooks: "Selaa kirjoja",
  notFound: "Ei löytynyt.",
  readFullChapter: "Lue koko luku",
  loadingBible: "Ladataan Raamattua…",
  loadingTranslation: (code) => `Ladataan ${code}…`,
  loadFailed: "Raamatun lataaminen epäonnistui. Päivitä sivu.",
  loadTranslationFailed: (code) => `Käännöksen ${code} lataaminen epäonnistui. Yritä uudelleen.`,
  chapter: "Luku",
  noResults: (q) => `Ei tuloksia haulle “${q}”`,
  resultCount: (n) => `${n} tulos${n !== 1 ? "ta" : ""}`,
  settingsTitle: "Asetukset",
  translationLabel: "Raamatunkäännös",
  languageLabel: "Sovelluksen kieli",
  themeLabel: "Teema",
  themeLight: "Vaalea",
  themeDark: "Tumma",
  themeSystem: "Järjestelmä",
  parallelLabel: "Rinnakkaiskäännös",
  parallelNone: "Ei mitään",
  fontSizeLabel: "Fonttikoko",
  fontSizeSmall: "Pieni",
  fontSizeMedium: "Normaali",
  fontSizeLarge: "Suuri",
  fontSizeXL: "Erittäin suuri",
  fontSizeXXL: "Valtava",
  infoTitle: "Sanatheos",
  infoSearchTitle: "Hakukenttä",
  infoSearchIntro: "Kirjoita hakukenttään löytääksesi jakeita. Tuetut hakumuodot:",
  infoSearchItems: [
    "<strong>Kirjaviite</strong> &mdash; <code>Joh</code>, <code>1 Moos</code>",
    "<strong>Luku</strong> &mdash; <code>Joh 3</code>, <code>1 Moos 1</code>",
    "<strong>Lukualue</strong> &mdash; <code>1 Moos 1-3</code>",
    "<strong>Jae</strong> &mdash; <code>Joh 3:16</code>",
    "<strong>Jaealue</strong> &mdash; <code>1 Moos 1:1-5</code>",
    "<strong>Useita jakeita</strong> &mdash; <code>1 Moos 1:1-3,5,8-10</code>",
    '<strong>Tekstihaku</strong> &mdash; <code>"armo"</code> (lainausmerkeissä). Käytä <code>"^armo"</code> (alkaa), <code>"armo$"</code> (päättyy), <code>"^armo$"</code> (tarkka sana) sanan rajoihin.',
    '<strong>Yhdistetty</strong> &mdash; <code>Room "usko"</code>, <code>1 Moos 1-3 "valo"</code>',
    "<strong>Useita hakuja</strong> &mdash; erota <code>;</code>-merkillä, esim. <code>Joh 3:16; Ilm 1:1</code>"
  ],
  infoSearchNote: '<kbd>"</kbd>-näppäin lisää automaattisesti sulkevan lainausmerkin. Lyhenteet kuten <code>1 moos</code>, <code>ilm</code>, <code>ef</code> toimivat.',
  infoBrowseTitle: "Selaa kirjoja",
  infoBrowseText: "Napsauta <strong>&#9776;</strong>-valikkopainiketta (tai paina <kbd>Ctrl+I</kbd>) avataksesi kirjaluettelon. Selaa kirjoja, lukuja ja jakeita kolmessa sarakkeessa. Käytä nuolinäppäimiä ja Enter-näppäintä.",
  infoShortcutsTitle: "Pikanäppäimet",
  infoShortcuts: [
    "<kbd>Ctrl+K</kbd> &mdash; Kohdista hakukenttään",
    "<kbd>Ctrl+I</kbd> &mdash; Avaa/sulje kirjaluettelo",
    "<kbd>Escape</kbd> &mdash; Sulje avoin paneeli",
    "<kbd>&uarr;</kbd> <kbd>&darr;</kbd> &mdash; Siirry luettelossa",
    "<kbd>&larr;</kbd> <kbd>&rarr;</kbd> / <kbd>Tab</kbd> &mdash; Vaihda saraketta",
    "<kbd>Enter</kbd> &mdash; Valitse kohde"
  ],
  infoSettingsTitle: "Asetukset",
  infoSettingsText: "Napsauta <strong>&#9881;</strong>-rataspainiketta avataksesi asetukset. Voit vaihtaa raamatunkäännöstä (esim. NHEB, KR38), valita <strong>rinnakkaiskäännöksen</strong> (vierekkäin-näkymä), asettaa <strong>teeman</strong> (Vaalea, Tumma tai Järjestelmä) ja vaihtaa sovelluksen kielen. Valinnat tallennetaan.",
  infoFeaturesTitle: "Ominaisuudet",
  infoFeaturesItems: [
    "<strong>Korostus</strong> &mdash; Napsauta hiiren oikealla jaenumeroa ja valitse korostusväri (keltainen, vihreä, sininen, pinkki, oranssi). Valitse &ldquo;Poista korostus&rdquo; poistaaksesi sen.",
    "<strong>Kopioi</strong> &mdash; Napsauta <strong>&#128203;</strong>-painiketta otsikon vieressä kopioidaksesi näytetyt jakeet. Rinnakkaisnäkymässä molemmat käännökset kopioidaan.",
    "<strong>Kuvaukset</strong> &mdash; Lukiessasi kokonaista lukua tai kirjaa otsikon alla näkyy lyhyt kuvaus sisällöstä.",
    "<strong>Pyyhkäisynavigaatio</strong> &mdash; Kosketuslaitteilla pyyhkäise vasemmalle tai oikealle siirtyäksesi lukujen välillä.",
    "<strong>Tulostus</strong> &mdash; Käytä <kbd>Ctrl+P</kbd> saadaksesi siistin tulostusnäkymän.",
    "<strong>Asenna sovelluksena</strong> &mdash; Sanatheos on progressiivinen verkkosovellus (PWA). Käytä selaimesi “Asenna”- tai “Lisää aloitusnäytölle”-toimintoa asentaaksesi sen nopeaa offline-käyttöä varten."
  ],
  infoDataTitle: "Tiedot ja tallennus",
  infoDataText: "Raamatun teksti haetaan palvelimelta kerran ja tallennetaan selaimeesi <strong>IndexedDB</strong>-tietokantaan nopeaa offline-käyttöä varten. Tietoja ei lähetetä kolmansille osapuolille. Kaikki toimii selaimessasi.",
  oldTestament: "Vanha testamentti",
  newTestament: "Uusi testamentti",
  deuterocanonical: "Deuterokanoniset kirjat",
  footerLine1: "Kaikki tällä sivulla käytetyt raamatunkäännökset ovat vapaasti yleiseen käyttöön soveltuvia.",
  footerDescriptions: 'Kirjojen ja lukujen kuvaukset ovat peräisin <a href="https://www.sacredbible.org/catholic/index.htm" target="_blank" rel="noopener noreferrer">Catholic Public Domain Version</a> -käännöksestä (CPDV).',
  footerStyleguide: 'Kappalejako ja runomuotoilu perustuvat <a href="https://worldenglish.bible" target="_blank" rel="noopener noreferrer">World English Bible</a> (WEB) -käännökseen.',
  footerFavicon: 'Sivustokuvake: &ldquo;<a href="https://commons.wikimedia.org/wiki/File:Jesus-Christ-from-Hagia-Sophia.jpg" target="_blank" rel="noopener noreferrer">Jesus Christ from Hagia Sophia</a>&rdquo;, Edal Anton Lefterov, <a href="https://creativecommons.org/licenses/by-sa/3.0?ref=openverse" target="_blank" rel="noopener noreferrer">CC BY-SA 3.0</a>',
  copied: "Kopioitu!",
  copyVerse: "Kopioi",
  copyBoth: "Kopioi molemmat",
  shareWith: "Jaa linkki käännöksellä",
  shareWithout: "Jaa linkki",
  linkCopied: "Linkki kopioitu!",
  highlight: "Korosta",
  removeHighlight: "Poista korostus",
  showMore: "Näytä lisää",
  interlinear: "Interlineaari",
  interlinearTooltip: "Näytä alkuperäinen heprea/kreikka Strongin numeroilla",
  strongsDef: "Strongin määritelmä",
  pronunciation: "Ääntäminen",
  partOfSpeech: "Sanaluokka",
  morphology: "Morfologia",
  crossReferences: "Viittaukset",
  closePanel: "Sulje"
};
var LANGUAGES = { en: EN2, fi: FI };
var current = EN2;
var currentLang = "en";
function setLanguage(lang) {
  currentLang = lang;
  current = LANGUAGES[lang] ?? EN2;
}
function getLanguage() {
  return currentLang;
}
function t() {
  return current;
}

// src/client/render.ts
var $ = (id) => document.getElementById(id);
var highlightMap = new Map;
function setHighlightMap(m) {
  highlightMap = m;
}
var translationCode = "";
function setTranslationCode(code) {
  translationCode = code;
}
var descriptions = [];
var secondaryDescriptions = [];
function setDescriptions(d) {
  descriptions = d;
}
function setSecondaryDescriptions(d) {
  secondaryDescriptions = d;
}
var styleguide = {};
function setStyleguide(sg) {
  styleguide = sg;
}
var subheadings = {};
function setSubheadings(sh) {
  subheadings = sh;
}
var secondarySubheadings = {};
function setSecondarySubheadings(sh) {
  secondarySubheadings = sh;
}
var interlinearEnabled = false;
var interlinearBooks = new Map;
var strongsDict = {};
function setInterlinearEnabled(enabled) {
  interlinearEnabled = enabled;
}
function getInterlinearEnabled() {
  return interlinearEnabled;
}
function setInterlinearBook(book, data) {
  interlinearBooks.set(book, data);
}
function getInterlinearBook(book) {
  return interlinearBooks.get(book);
}
function getInterlinearBooks() {
  return interlinearBooks;
}
function setStrongsDict(dict) {
  strongsDict = dict;
}
function getStrongsDict() {
  return strongsDict;
}
function bookDescFrom(descs, book) {
  const entry = descs.find((b) => b.name === book);
  return entry?.description ?? "";
}
function chapterDescFrom(descs, book, chapter) {
  const entry = descs.find((b) => b.name === book);
  if (!entry)
    return "";
  const ch = entry.chapters.find((c) => c.number === chapter);
  return ch?.description ?? "";
}
function getBookDescription(book) {
  return bookDescFrom(descriptions, book);
}
function getChapterDescription(book, chapter) {
  return chapterDescFrom(descriptions, book, chapter);
}
function descriptionHtml(text) {
  if (!text)
    return "";
  return `<p class="description">${esc(text)}</p>`;
}
function shareButtonHtml() {
  return ` <span class="share-wrap"><button class="share-btn">&#128279;</button><span class="share-dropdown"><button class="share-opt" data-share="with">${esc(t().shareWith)} ${esc(translationCode)}</button><button class="share-opt" data-share="without">${esc(t().shareWithout)}</button></span></span>`;
}
function getHighlightClass(book, chapter, verse) {
  const color = highlightMap.get(`${book}:${chapter}:${verse}`);
  return color ? ` hl-${color}` : "";
}
var hlClass = getHighlightClass;
function escapeHtml(s) {
  const d = document.createElement("div");
  d.textContent = s;
  return d.innerHTML.replace(/"/g, "&quot;");
}
var esc = escapeHtml;
function formatVerseText(text) {
  let open2 = true;
  return escapeHtml(text).replace(/\n/g, "<br>").replace(/&quot;/g, () => {
    const q = open2 ? "&ldquo;" : "&rdquo;";
    open2 = !open2;
    return q;
  });
}
var fmt = formatVerseText;
var escRegex = escapeRegex;
function renderStyledVerses(book, chapter, nums, ch, secondary = false, showSubheadings = true) {
  const sg = styleguide[book]?.[String(chapter)];
  const shSource = secondary ? secondarySubheadings : subheadings;
  const sh = showSubheadings ? shSource[book]?.[String(chapter)] : undefined;
  const parts = [];
  let mode = "prose";
  let poetryLevel = 1;
  for (let i = 0;i < nums.length; i++) {
    const n = nums[i];
    const text = ch[String(n)];
    if (!text)
      continue;
    if (sh) {
      for (const entry of sh) {
        if (entry.v === n) {
          parts.push(`<h3 class="subheading">${esc(entry.t)}</h3>`);
        }
      }
    }
    if (sg) {
      if (sg.stanzaBreaks.includes(n)) {
        parts.push(`<span class="stanza-break"></span>`);
      }
      if (sg.paragraphs.includes(n)) {
        if (i > 0)
          parts.push(`<span class="para-break"></span>`);
        mode = "prose";
      } else if (sg.poetry[String(n)]) {
        poetryLevel = sg.poetry[String(n)];
        mode = "poetry";
      }
    }
    const poetryClass = sg && mode === "poetry" ? ` poetry-q${poetryLevel}` : "";
    const secAttr = secondary ? ` data-secondary="1"` : "";
    parts.push(`<span class="verse${poetryClass}${hlClass(book, chapter, n)}" data-book="${esc(book)}" data-chapter="${chapter}" data-verse="${n}"${secAttr}><sup>${n}</sup>${fmt(text)}</span> `);
  }
  return parts.join("");
}
function interlinearToggleHtml() {
  if (translationCode !== "KJV")
    return "";
  const active = interlinearEnabled ? " active" : "";
  return ` <button class="il-toggle-btn${active}" title="${esc(t().interlinearTooltip)}">${esc(t().interlinear)}</button>`;
}
function isHebrew(strongs) {
  return strongs.startsWith("h");
}
function renderInterlinearWord(w) {
  const hebrew = isHebrew(w.strongs);
  const dir = hebrew ? ' dir="rtl"' : "";
  const originalClass = hebrew ? "il-original il-hebrew" : "il-original il-greek";
  const morphHtml = w.morph ? `<span class="il-morph">${esc(w.morph)}</span>` : "";
  return `<span class="il-word" data-strongs="${esc(w.strongs)}">` + `<span class="il-english">${esc(w.english)}</span>` + `<span class="${originalClass}"${dir}>${esc(w.original)}</span>` + `<span class="il-translit">${esc(w.translit)}</span>` + `<span class="il-strongs">${esc(w.strongs.toUpperCase())}</span>` + morphHtml + `</span>`;
}
function renderInterlinearVerse(book, chapter, verse, words) {
  let html = `<div class="il-verse" data-book="${esc(book)}" data-chapter="${chapter}" data-verse="${verse}">`;
  html += `<span class="il-verse-num"><sup>${verse}</sup></span>`;
  html += `<div class="il-row">`;
  for (const w of words) {
    html += renderInterlinearWord(w);
  }
  html += `</div></div>`;
  return html;
}
function renderInterlinearChapterVerses(book, chapter, nums, ilChapter) {
  const parts = [];
  const sh = subheadings[book]?.[String(chapter)];
  for (const n of nums) {
    if (sh) {
      for (const entry of sh) {
        if (entry.v === n) {
          parts.push(`<h3 class="subheading">${esc(entry.t)}</h3>`);
        }
      }
    }
    const words = ilChapter[String(n)];
    if (words) {
      parts.push(renderInterlinearVerse(book, chapter, n, words));
    }
  }
  return parts.join("");
}
function renderStrongsPanel(entry, strongsId) {
  const s = t();
  let html = `<div class="strongs-panel-header">`;
  html += `<strong>${esc(strongsId.toUpperCase())}</strong>`;
  html += `<button class="strongs-close" title="${esc(s.closePanel)}">&times;</button>`;
  html += `</div>`;
  html += `<div class="strongs-panel-body">`;
  html += `<p class="strongs-def">${esc(entry.d)}</p>`;
  if (entry.p)
    html += `<p class="strongs-field"><strong>${esc(s.pronunciation)}:</strong> ${esc(entry.p)}</p>`;
  if (entry.s)
    html += `<p class="strongs-field"><strong>${esc(s.partOfSpeech)}:</strong> ${esc(entry.s)}</p>`;
  if (entry.r) {
    const rParts = entry.r.split("|");
    const derivation = rParts[0]?.trim();
    const english = rParts[1]?.trim();
    if (derivation)
      html += `<p class="strongs-field"><strong>${esc(s.crossReferences)}:</strong> ${esc(derivation)}</p>`;
    if (english) {
      const engMatch = english.match(/^English:\s*(.*)$/);
      if (engMatch) {
        html += `<p class="strongs-field"><strong>English:</strong> ${esc(engMatch[1])}</p>`;
      } else {
        html += `<p class="strongs-field">${esc(english)}</p>`;
      }
    }
  }
  html += `</div>`;
  return html;
}
function getBookNav(data, book) {
  const books = Object.keys(data);
  const bi = books.indexOf(book);
  const prev = bi > 0 ? { book: books[bi - 1], chapter: 0, label: displayName(books[bi - 1]), shortLabel: displayName(books[bi - 1]) } : null;
  const next = bi < books.length - 1 ? { book: books[bi + 1], chapter: 0, label: displayName(books[bi + 1]), shortLabel: displayName(books[bi + 1]) } : null;
  return { prev, next };
}
function getChapterNav(data, book, chapter) {
  const books = Object.keys(data);
  const bi = books.indexOf(book);
  const chapters = Object.keys(data[book]).map(Number).sort((a, b) => a - b);
  const ci = chapters.indexOf(chapter);
  let prev = null;
  let next = null;
  if (ci > 0) {
    prev = { book, chapter: chapters[ci - 1], label: `${displayName(book)} ${chapters[ci - 1]}`, shortLabel: `${chapters[ci - 1]}` };
  } else if (bi > 0) {
    const pb = books[bi - 1];
    const pChs = Object.keys(data[pb]).map(Number).sort((a, b) => a - b);
    const lastCh = pChs[pChs.length - 1];
    prev = { book: pb, chapter: lastCh, label: `${displayName(pb)} ${lastCh}`, shortLabel: `${displayName(pb)} ${lastCh}` };
  }
  if (ci < chapters.length - 1) {
    next = { book, chapter: chapters[ci + 1], label: `${displayName(book)} ${chapters[ci + 1]}`, shortLabel: `${chapters[ci + 1]}` };
  } else if (bi < books.length - 1) {
    const nb = books[bi + 1];
    const nChs = Object.keys(data[nb]).map(Number).sort((a, b) => a - b);
    next = { book: nb, chapter: nChs[0], label: `${displayName(nb)} ${nChs[0]}`, shortLabel: `${displayName(nb)} ${nChs[0]}` };
  }
  return { prev, next };
}
function getVerseNav(data, book, chapter, verse) {
  const books = Object.keys(data);
  const bi = books.indexOf(book);
  const chapters = Object.keys(data[book]).map(Number).sort((a, b) => a - b);
  const ci = chapters.indexOf(chapter);
  const verses = Object.keys(data[book][String(chapter)]).map(Number).sort((a, b) => a - b);
  const vi = verses.indexOf(verse);
  let prev = null;
  let next = null;
  if (vi > 0) {
    prev = { book, chapter, verse: verses[vi - 1], label: `${displayName(book)} ${chapter}:${verses[vi - 1]}`, shortLabel: `${chapter}:${verses[vi - 1]}` };
  } else if (ci > 0) {
    const pc = chapters[ci - 1];
    const pVs = Object.keys(data[book][String(pc)]).map(Number).sort((a, b) => a - b);
    const lastV = pVs[pVs.length - 1];
    prev = { book, chapter: pc, verse: lastV, label: `${displayName(book)} ${pc}:${lastV}`, shortLabel: `${pc}:${lastV}` };
  } else if (bi > 0) {
    const pb = books[bi - 1];
    const pChs = Object.keys(data[pb]).map(Number).sort((a, b) => a - b);
    const lastCh = pChs[pChs.length - 1];
    const pVs = Object.keys(data[pb][String(lastCh)]).map(Number).sort((a, b) => a - b);
    const lastV = pVs[pVs.length - 1];
    prev = { book: pb, chapter: lastCh, verse: lastV, label: `${displayName(pb)} ${lastCh}:${lastV}`, shortLabel: `${displayName(pb)} ${lastCh}:${lastV}` };
  }
  if (vi < verses.length - 1) {
    next = { book, chapter, verse: verses[vi + 1], label: `${displayName(book)} ${chapter}:${verses[vi + 1]}`, shortLabel: `${chapter}:${verses[vi + 1]}` };
  } else if (ci < chapters.length - 1) {
    const nc = chapters[ci + 1];
    const nVs = Object.keys(data[book][String(nc)]).map(Number).sort((a, b) => a - b);
    next = { book, chapter: nc, verse: nVs[0], label: `${displayName(book)} ${nc}:${nVs[0]}`, shortLabel: `${nc}:${nVs[0]}` };
  } else if (bi < books.length - 1) {
    const nb = books[bi + 1];
    const nChs = Object.keys(data[nb]).map(Number).sort((a, b) => a - b);
    const nVs = Object.keys(data[nb][String(nChs[0])]).map(Number).sort((a, b) => a - b);
    next = { book: nb, chapter: nChs[0], verse: nVs[0], label: `${displayName(nb)} ${nChs[0]}:${nVs[0]}`, shortLabel: `${displayName(nb)} ${nChs[0]}:${nVs[0]}` };
  }
  return { prev, next };
}
function navArrowsHtml(prev, next, showTranslation = true) {
  const prevBtn = prev ? `<a class="nav-arrow nav-prev" title="${esc(prev.label)}" data-book="${esc(prev.book)}"${prev.chapter ? ` data-chapter="${prev.chapter}"` : ""}${prev.verse !== undefined ? ` data-verse="${prev.verse}"` : ""}>&DoubleLeftArrow;</a>` : `<span class="nav-arrow nav-prev nav-disabled">&DoubleLeftArrow;</span>`;
  const nextBtn = next ? `<a class="nav-arrow nav-next" title="${esc(next.label)}" data-book="${esc(next.book)}"${next.chapter ? ` data-chapter="${next.chapter}"` : ""}${next.verse !== undefined ? ` data-verse="${next.verse}"` : ""}>&DoubleRightArrow;</a>` : `<span class="nav-arrow nav-next nav-disabled"></span>`;
  const mid = showTranslation ? `<span class="nav-translation">&DoubleRightArrow;</span>` : "";
  return `<nav class="chapter-nav">${prevBtn}${mid}${nextBtn}</nav>`;
}
function renderChapter(data, book, chapter) {
  const ch = data[book]?.[String(chapter)];
  if (!ch) {
    $("content").innerHTML = `<p class="empty">${t().notFound}</p>`;
    return;
  }
  const { prev, next } = getChapterNav(data, book, chapter);
  const nums = Object.keys(ch).map(Number).sort((a, b) => a - b);
  let html = navArrowsHtml(prev, next);
  html += `<div class="print-translation-label"><span class="nav-translation"></span></div>`;
  html += `<h2 class="section-title">${esc(displayName(book))} ${chapter} <button class="copy-btn" data-copy-book="${esc(book)}" data-copy-chapter="${chapter}">&#128203;</button>${shareButtonHtml()}${interlinearToggleHtml()}</h2>`;
  if (chapter === 1)
    html += descriptionHtml(getBookDescription(book));
  html += descriptionHtml(getChapterDescription(book, chapter));
  const ilBook = interlinearEnabled ? interlinearBooks.get(book) : undefined;
  const ilChapter = ilBook?.[String(chapter)];
  if (ilChapter) {
    html += `<div class="verses il-verses">`;
    html += renderInterlinearChapterVerses(book, chapter, nums, ilChapter);
    html += `</div>`;
  } else {
    html += `<div class="verses">`;
    html += renderStyledVerses(book, chapter, nums, ch);
    html += `</div>`;
  }
  html += navArrowsHtml(prev, next, false);
  $("content").innerHTML = html;
  window.scrollTo(0, 0);
}
function renderBook(data, book) {
  const bd = data[book];
  if (!bd) {
    $("content").innerHTML = `<p class="empty">${t().notFound}</p>`;
    return;
  }
  const chs = Object.keys(bd).map(Number).sort((a, b) => a - b);
  const { prev, next } = getBookNav(data, book);
  let html = navArrowsHtml(prev, next);
  html += `<div class="print-translation-label"><span class="nav-translation"></span></div>`;
  html += `<h1 class="book-title">${esc(displayName(book))}${interlinearToggleHtml()}</h1>`;
  html += descriptionHtml(getBookDescription(book));
  const ilBook = interlinearEnabled ? interlinearBooks.get(book) : undefined;
  for (const c of chs) {
    const verses = bd[String(c)];
    const nums = Object.keys(verses).map(Number).sort((a, b) => a - b);
    const ilChapter = ilBook?.[String(c)];
    html += `<div class="chapter-block"><h2 class="chapter-heading" data-book="${esc(book)}" data-chapter="${c}">${t().chapter} ${c}</h2>`;
    html += descriptionHtml(getChapterDescription(book, c));
    if (ilChapter) {
      html += `<div class="verses il-verses">`;
      html += renderInterlinearChapterVerses(book, c, nums, ilChapter);
    } else {
      html += `<div class="verses">`;
      html += renderStyledVerses(book, c, nums, verses);
    }
    html += `</div></div>`;
  }
  html += navArrowsHtml(prev, next, false);
  $("content").innerHTML = html;
  window.scrollTo(0, 0);
}
function renderVerse(data, book, chapter, verse) {
  const text = data[book]?.[String(chapter)]?.[String(verse)];
  if (!text) {
    $("content").innerHTML = `<p class="empty">${t().notFound}</p>`;
    return;
  }
  const { prev, next } = getVerseNav(data, book, chapter, verse);
  const ilBook = interlinearEnabled ? interlinearBooks.get(book) : undefined;
  const ilWords = ilBook?.[String(chapter)]?.[String(verse)];
  let verseHtml;
  if (ilWords) {
    verseHtml = `<div class="verses il-verses single-verse">${renderInterlinearVerse(book, chapter, verse, ilWords)}</div>`;
  } else {
    verseHtml = `<div class="verses single-verse"><span class="verse${hlClass(book, chapter, verse)}" data-book="${esc(book)}" data-chapter="${chapter}" data-verse="${verse}"><sup>${verse}</sup>${fmt(text)}</span></div>`;
  }
  $("content").innerHTML = `
    ${navArrowsHtml(prev, next)}    <div class="print-translation-label"><span class="nav-translation"></span></div>    <h2 class="section-title">${esc(displayName(book))} ${chapter}:${verse} <button class="copy-btn" data-copy-book="${esc(book)}" data-copy-chapter="${chapter}" data-copy-verse="${verse}">&#128203;</button>${shareButtonHtml()}${interlinearToggleHtml()}</h2>
    ${verseHtml}
    <div class="read-full-chapter"><a class="full-chapter-link" data-book="${esc(book)}" data-chapter="${chapter}">${t().readFullChapter} &rarr;</a></div>`;
  window.scrollTo(0, 0);
}
function renderChapterRange(data, book, chStart, chEnd) {
  const bd = data[book];
  if (!bd) {
    $("content").innerHTML = `<p class="empty">${t().notFound}</p>`;
    return;
  }
  const { prev } = getChapterNav(data, book, chStart);
  const { next } = getChapterNav(data, book, chEnd);
  const ilBook = interlinearEnabled ? interlinearBooks.get(book) : undefined;
  let html = navArrowsHtml(prev, next);
  html += `<div class="print-translation-label"><span class="nav-translation"></span></div>`;
  const ilToggle = interlinearToggleHtml();
  if (ilToggle)
    html += `<div style="text-align:right;margin-bottom:8px">${ilToggle}</div>`;
  for (let c = chStart;c <= chEnd; c++) {
    const ch = bd[String(c)];
    if (!ch)
      continue;
    const nums = Object.keys(ch).map(Number).sort((a, b) => a - b);
    html += `<div class="chapter-block"><h2 class="chapter-heading" data-book="${esc(book)}" data-chapter="${c}">${esc(displayName(book))} ${c}</h2>`;
    if (c === chStart)
      html += descriptionHtml(getBookDescription(book));
    html += descriptionHtml(getChapterDescription(book, c));
    const ilChapter = ilBook?.[String(c)];
    if (ilChapter) {
      html += `<div class="verses il-verses">`;
      html += renderInterlinearChapterVerses(book, c, nums, ilChapter);
    } else {
      html += `<div class="verses">`;
      html += renderStyledVerses(book, c, nums, ch);
    }
    html += `</div></div>`;
  }
  html += navArrowsHtml(prev, next, false);
  $("content").innerHTML = html;
  window.scrollTo(0, 0);
}
function renderVerseSegments(data, book, chapter, segments) {
  const ch = data[book]?.[String(chapter)];
  if (!ch) {
    $("content").innerHTML = `<p class="empty">${t().notFound}</p>`;
    return;
  }
  const segLabel = segments.map((s) => s.start === s.end ? `${s.start}` : `${s.start}-${s.end}`).join(",");
  const title = `${displayName(book)} ${chapter}:${segLabel}`;
  let html = `<div class="print-translation-label"><span class="nav-translation"></span></div>`;
  html += `<div class="translation-label"><span class="nav-translation"></span></div>`;
  const segNums = [];
  for (const seg of segments)
    for (let v = seg.start;v <= seg.end; v++)
      segNums.push(v);
  html += `<h2 class="section-title">${esc(title)} <button class="copy-btn" data-copy-book="${esc(book)}" data-copy-chapter="${chapter}" data-copy-segments="${esc(segLabel)}">&#128203;</button>${shareButtonHtml()}${interlinearToggleHtml()}</h2>`;
  const ilBook = interlinearEnabled ? interlinearBooks.get(book) : undefined;
  const ilChapter = ilBook?.[String(chapter)];
  if (ilChapter) {
    html += `<div class="verses il-verses">`;
    html += renderInterlinearChapterVerses(book, chapter, segNums, ilChapter);
  } else {
    html += `<div class="verses">`;
    html += renderStyledVerses(book, chapter, segNums, ch);
  }
  html += `</div>`;
  html += `<div class="read-full-chapter"><a class="full-chapter-link" data-book="${esc(book)}" data-chapter="${chapter}">${t().readFullChapter} &rarr;</a></div>`;
  $("content").innerHTML = html;
  window.scrollTo(0, 0);
}
function navRefLabel(nav) {
  const { book, chapterStart, chapterEnd, verseSegments } = nav;
  if (chapterStart !== undefined && chapterEnd !== undefined) {
    if (verseSegments) {
      const segLabel = verseSegments.map((s) => s.start === s.end ? `${s.start}` : `${s.start}-${s.end}`).join(",");
      return `${displayName(book)} ${chapterStart}:${segLabel}`;
    }
    if (chapterStart === chapterEnd)
      return `${displayName(book)} ${chapterStart}`;
    return `${displayName(book)} ${chapterStart}-${chapterEnd}`;
  }
  return displayName(book);
}
function navRefVersesHtml(data, nav) {
  const { book, chapterStart, chapterEnd, verseSegments } = nav;
  const bd = data[book];
  if (!bd)
    return "";
  let html = "";
  if (chapterStart !== undefined && chapterEnd !== undefined) {
    if (verseSegments) {
      const ch = bd[String(chapterStart)];
      if (!ch)
        return "";
      const segNums = [];
      for (const seg of verseSegments)
        for (let v = seg.start;v <= seg.end; v++)
          segNums.push(v);
      html += `<div class="verses">`;
      html += renderStyledVerses(book, chapterStart, segNums, ch);
      html += `</div>`;
    } else {
      for (let c = chapterStart;c <= chapterEnd; c++) {
        const ch = bd[String(c)];
        if (!ch)
          continue;
        const nums = Object.keys(ch).map(Number).sort((a, b) => a - b);
        if (chapterStart !== chapterEnd) {
          html += `<h3 class="multi-nav-subheading">${esc(displayName(book))} ${c}</h3>`;
        }
        html += `<div class="verses">`;
        html += renderStyledVerses(book, c, nums, ch);
        html += `</div>`;
      }
    }
  } else {
    const ch = bd["1"];
    if (!ch)
      return "";
    const nums = Object.keys(ch).map(Number).sort((a, b) => a - b);
    html += `<div class="verses">`;
    html += renderStyledVerses(book, 1, nums, ch);
    html += `</div>`;
  }
  return html;
}
function renderMultiNav(data, refs) {
  let html = '<div class="translation-label"><span class="nav-translation"></span></div>';
  for (let i = 0;i < refs.length; i++) {
    if (i > 0)
      html += `<hr class="multi-nav-divider">`;
    html += `<section class="multi-nav-section">`;
    html += `<h2 class="section-title">${esc(navRefLabel(refs[i]))}</h2>`;
    html += navRefVersesHtml(data, refs[i]);
    const ch = refs[i].chapterStart ?? 1;
    html += `<div class="read-full-chapter"><a class="full-chapter-link" data-book="${esc(refs[i].book)}" data-chapter="${ch}">${t().readFullChapter} &rarr;</a></div>`;
    html += `</section>`;
  }
  $("content").innerHTML = html;
  window.scrollTo(0, 0);
}
var RESULTS_PAGE_SIZE = 50;
function renderResults(results, query) {
  if (!results.length) {
    $("content").innerHTML = `<p class="empty">${t().noResults(esc(query))}</p>`;
    return;
  }
  const terms = query.split(/;/).map((t2) => t2.trim()).filter(Boolean);
  const highlights = [];
  for (const t2 of terms) {
    const m = t2.match(/"(.+?)"/);
    if (!m)
      continue;
    let raw = m[1];
    raw = raw.replace(/^\^/, "").replace(/\$$/, "");
    if (raw.length >= 2)
      highlights.push(raw);
  }
  const hlRegex = highlights.length ? new RegExp(`(${highlights.map((h) => escRegex(esc(h))).join("|")})`, "gi") : null;
  let shown = 0;
  function renderResultItem(r) {
    let highlighted = fmt(r.text);
    if (hlRegex)
      highlighted = highlighted.replace(hlRegex, "<mark>$1</mark>");
    return `<div class="result" data-book="${esc(r.book)}" data-chapter="${r.chapter}" data-verse="${r.verse}">
      <div class="result-ref">${esc(displayName(r.book))} ${r.chapter}:${r.verse}</div>
      <div class="result-text">${highlighted}</div>
    </div>`;
  }
  function showMore() {
    const container = document.querySelector(".results");
    if (!container)
      return;
    const end2 = Math.min(shown + RESULTS_PAGE_SIZE, results.length);
    const parts2 = [];
    for (let i = shown;i < end2; i++) {
      parts2.push(renderResultItem(results[i]));
    }
    const existingBtn = document.getElementById("show-more-btn");
    if (existingBtn)
      existingBtn.remove();
    container.insertAdjacentHTML("beforeend", parts2.join(""));
    shown = end2;
    if (shown < results.length) {
      const remaining = results.length - shown;
      container.insertAdjacentHTML("afterend", "");
      const btn2 = document.createElement("button");
      btn2.id = "show-more-btn";
      btn2.className = "show-more-btn";
      btn2.textContent = `${t().showMore} (${remaining})`;
      btn2.addEventListener("click", showMore);
      container.parentElement?.appendChild(btn2);
    }
  }
  const parts = [`<p class="results-info">${t().resultCount(results.length)}</p><div class="results">`];
  const end = Math.min(RESULTS_PAGE_SIZE, results.length);
  for (let i = 0;i < end; i++) {
    parts.push(renderResultItem(results[i]));
  }
  parts.push(`</div>`);
  shown = end;
  if (shown < results.length) {
    const remaining = results.length - shown;
    parts.push(`<button id="show-more-btn" class="show-more-btn">${t().showMore} (${remaining})</button>`);
  }
  $("content").innerHTML = parts.join("");
  const btn = document.getElementById("show-more-btn");
  if (btn)
    btn.addEventListener("click", showMore);
  window.scrollTo(0, 0);
}
function renderIndex(data, callbacks) {
  const booksCol = $("idx-books");
  const chapsCol = $("idx-chapters");
  const versesCol = $("idx-verses");
  booksCol.innerHTML = "";
  chapsCol.innerHTML = "";
  versesCol.innerHTML = "";
  let activeBook = "";
  function showVerses(book, chapter) {
    versesCol.innerHTML = "";
    const vs = Object.keys(data[book][String(chapter)]).map(Number).sort((a, b) => a - b);
    for (const v of vs) {
      const vEl = document.createElement("div");
      vEl.className = "idx-item idx-verse";
      vEl.tabIndex = -1;
      const text = data[book][String(chapter)][String(v)];
      const p = text.substring(0, 50).replace(/\n/g, " ");
      vEl.textContent = `${v}. ${p}${text.length > 50 ? "…" : ""}`;
      vEl.title = text.replace(/\n/g, " ");
      vEl.addEventListener("click", (e) => {
        e.stopPropagation();
        callbacks.onVerse(book, chapter, v);
      });
      versesCol.appendChild(vEl);
    }
  }
  function showChapters(book) {
    if (activeBook === book)
      return;
    activeBook = book;
    booksCol.querySelectorAll(".idx-item").forEach((e) => e.classList.remove("active"));
    const bookEl = booksCol.querySelector(`[data-book="${book}"]`);
    if (bookEl)
      bookEl.classList.add("active");
    chapsCol.innerHTML = "";
    versesCol.innerHTML = "";
    const chs = Object.keys(data[book]).map(Number).sort((a, b) => a - b);
    for (const c of chs) {
      const chEl = document.createElement("div");
      chEl.className = "idx-item idx-chapter";
      chEl.dataset.chapter = String(c);
      chEl.tabIndex = -1;
      const chDesc = getChapterDescription(book, c);
      const preview = chDesc || (data[book][String(c)]?.["1"] || "").substring(0, 60).replace(/\n/g, " ");
      const ellipsis = chDesc ? chDesc.length > 60 ? "…" : "" : (data[book][String(c)]?.["1"] || "").length > 60 ? "…" : "";
      const displayPreview = chDesc ? chDesc.substring(0, 60) : preview;
      chEl.innerHTML = `<strong>${t().chapter} ${c}</strong><small>${esc(displayPreview)}${ellipsis}</small>`;
      if (chDesc)
        chEl.title = chDesc;
      chEl.addEventListener("mouseenter", () => {
        chapsCol.querySelectorAll(".idx-item").forEach((e) => e.classList.remove("active"));
        chEl.classList.add("active");
        showVerses(book, c);
      });
      chEl.addEventListener("click", (e) => {
        e.stopPropagation();
        callbacks.onChapter(book, c);
      });
      chapsCol.appendChild(chEl);
    }
    const firstChEl = chapsCol.querySelector(".idx-item");
    if (firstChEl && chs.length > 0) {
      firstChEl.classList.add("active");
      showVerses(book, chs[0]);
    }
  }
  const DC_BOOKS = new Set([
    "Tobit",
    "Judith",
    "Esther (Greek)",
    "Wisdom",
    "Sirach",
    "Baruch",
    "Prayer of Azariah",
    "Susanna",
    "Bel and the Dragon",
    "1 Maccabees",
    "2 Maccabees",
    "1 Esdras",
    "Prayer of Manasses",
    "Additional Psalm",
    "3 Maccabees",
    "2 Esdras",
    "4 Maccabees",
    "Laodiceans"
  ]);
  const books = Object.keys(data);
  let addedNtLabel = false;
  let addedDcLabel = false;
  const otLabel = document.createElement("div");
  otLabel.className = "idx-section-label";
  otLabel.textContent = t().oldTestament;
  booksCol.appendChild(otLabel);
  for (const book of books) {
    if (!addedDcLabel && DC_BOOKS.has(book)) {
      addedDcLabel = true;
      const dcLabel = document.createElement("div");
      dcLabel.className = "idx-section-label";
      dcLabel.textContent = t().deuterocanonical;
      booksCol.appendChild(dcLabel);
    }
    if (book === "Matthew" && !addedNtLabel) {
      addedNtLabel = true;
      const ntLabel = document.createElement("div");
      ntLabel.className = "idx-section-label";
      ntLabel.textContent = t().newTestament;
      booksCol.appendChild(ntLabel);
    }
    const el = document.createElement("div");
    el.className = "idx-item";
    el.dataset.book = book;
    el.textContent = displayName(book);
    el.tabIndex = -1;
    el.addEventListener("mouseenter", () => showChapters(book));
    el.addEventListener("click", () => callbacks.onBook(book));
    booksCol.appendChild(el);
  }
  if (books.length > 0) {
    showChapters(books[0]);
  }
  function scrollTo(book, chapter, verse) {
    if (!book || !data[book])
      return;
    activeBook = "";
    showChapters(book);
    const bookEl = booksCol.querySelector(`[data-book="${book}"]`);
    if (bookEl)
      bookEl.scrollIntoView({ block: "center" });
    if (chapter !== undefined) {
      const chEl = chapsCol.querySelector(`[data-chapter="${chapter}"]`);
      if (chEl) {
        chapsCol.querySelectorAll(".idx-item").forEach((e) => e.classList.remove("active"));
        chEl.classList.add("active");
        chEl.scrollIntoView({ block: "center" });
        showVerses(book, chapter);
      }
      if (verse !== undefined) {
        const verseItems = versesCol.querySelectorAll(".idx-item");
        for (const vEl of verseItems) {
          if (vEl.textContent?.startsWith(`${verse}. `)) {
            vEl.scrollIntoView({ block: "center" });
            break;
          }
        }
      }
    }
  }
  const cols = [booksCol, chapsCol, versesCol];
  let focusedCol = 0;
  function getItems(col) {
    return Array.from(col.querySelectorAll(".idx-item"));
  }
  function focusItem(col, index) {
    const items = getItems(col);
    if (!items.length)
      return;
    const i = Math.max(0, Math.min(index, items.length - 1));
    items[i].focus();
  }
  function getActiveIndex(col) {
    const items = getItems(col);
    const active = col.querySelector(".idx-item:focus");
    return active ? items.indexOf(active) : -1;
  }
  function getPanel() {
    return document.getElementById("index-panel");
  }
  getPanel()?.addEventListener("keydown", (e) => {
    const key = e.key;
    const col = cols[focusedCol];
    if (key === "ArrowDown" || key === "ArrowUp") {
      e.preventDefault();
      const items = getItems(col);
      if (!items.length)
        return;
      let idx = getActiveIndex(col);
      if (idx === -1) {
        idx = 0;
      } else if (key === "ArrowDown") {
        if (idx >= items.length - 1)
          return;
        idx++;
      } else {
        if (idx <= 0)
          return;
        idx--;
      }
      items[idx].focus();
      if (col === booksCol) {
        const book = items[idx]?.dataset.book;
        if (book)
          showChapters(book);
      } else if (col === chapsCol) {
        chapsCol.querySelectorAll(".idx-item").forEach((el) => el.classList.remove("active"));
        items[idx].classList.add("active");
        const chNum = items[idx].dataset.chapter;
        if (chNum && activeBook)
          showVerses(activeBook, Number(chNum));
      }
      return;
    }
    if (key === "ArrowRight" || key === "Tab" && !e.shiftKey) {
      e.preventDefault();
      if (focusedCol < 2 && getItems(cols[focusedCol + 1]).length) {
        focusedCol++;
        const active = cols[focusedCol].querySelector(".idx-item.active");
        if (active)
          active.focus();
        else
          focusItem(cols[focusedCol], 0);
      }
      return;
    }
    if (key === "ArrowLeft" || key === "Tab" && e.shiftKey) {
      e.preventDefault();
      if (focusedCol > 0) {
        focusedCol--;
        const active = cols[focusedCol].querySelector(".idx-item.active");
        if (active)
          active.focus();
        else
          focusItem(cols[focusedCol], 0);
      }
      return;
    }
    if (key === "Enter") {
      e.preventDefault();
      const focused = col.querySelector(".idx-item:focus");
      if (focused)
        focused.click();
      return;
    }
  });
  for (let i = 0;i < cols.length; i++) {
    cols[i].addEventListener("focusin", () => {
      focusedCol = i;
    });
  }
  return { scrollTo };
}
function renderParallelChapter(primary, secondary, book, chapter, primaryLabel, secondaryLabel) {
  const ch1 = primary[book]?.[String(chapter)];
  const ch2 = secondary[book]?.[String(chapter)];
  if (!ch1) {
    $("content").innerHTML = `<p class="empty">${t().notFound}</p>`;
    return;
  }
  const { prev, next } = getChapterNav(primary, book, chapter);
  const nums = Object.keys(ch1).map(Number).sort((a, b) => a - b);
  let html = navArrowsHtml(prev, next);
  html += `<div class="parallel-copy-both"><button class="copy-btn" data-copy-book="${esc(book)}" data-copy-chapter="${chapter}" data-copy-source="both">&#128203; ${esc(t().copyBoth)}</button></div>`;
  html += `<div class="parallel-container">`;
  html += `<div class="parallel-col"><div class="parallel-translation-label">${esc(primaryLabel)}</div>`;
  html += `<h2 class="section-title">${esc(displayNameFor(primaryLabel, book))} ${chapter} <button class="copy-btn" data-copy-book="${esc(book)}" data-copy-chapter="${chapter}" data-copy-source="primary">&#128203;</button></h2>`;
  if (chapter === 1)
    html += descriptionHtml(getBookDescription(book));
  html += descriptionHtml(getChapterDescription(book, chapter));
  html += `<div class="verses">`;
  html += renderStyledVerses(book, chapter, nums, ch1);
  html += `</div></div>`;
  html += `<div class="parallel-col"><div class="parallel-translation-label">${esc(secondaryLabel)}</div>`;
  html += `<h2 class="section-title">${esc(displayNameFor(secondaryLabel, book))} ${chapter} <button class="copy-btn" data-copy-book="${esc(book)}" data-copy-chapter="${chapter}" data-copy-source="secondary">&#128203;</button></h2>`;
  if (chapter === 1)
    html += descriptionHtml(bookDescFrom(secondaryDescriptions, book));
  html += descriptionHtml(chapterDescFrom(secondaryDescriptions, book, chapter));
  html += `<div class="verses">`;
  if (ch2) {
    html += renderStyledVerses(book, chapter, nums, ch2, true);
  } else {
    html += `<p class="empty">${t().notFound}</p>`;
  }
  html += `</div></div>`;
  html += `</div>`;
  html += navArrowsHtml(prev, next);
  $("content").innerHTML = html;
  window.scrollTo(0, 0);
}
function renderParallelBook(primary, secondary, book, primaryLabel, secondaryLabel) {
  const bd1 = primary[book];
  if (!bd1) {
    $("content").innerHTML = `<p class="empty">${t().notFound}</p>`;
    return;
  }
  const bd2 = secondary[book];
  const chs = Object.keys(bd1).map(Number).sort((a, b) => a - b);
  const { prev, next } = getBookNav(primary, book);
  let html = navArrowsHtml(prev, next);
  html += `<div class="parallel-container">`;
  html += `<div class="parallel-col"><div class="parallel-translation-label">${esc(primaryLabel)}</div>`;
  html += `<h1 class="book-title">${esc(displayNameFor(primaryLabel, book))}</h1>`;
  html += descriptionHtml(bookDescFrom(descriptions, book));
  for (const c of chs) {
    const verses = bd1[String(c)];
    const nums = Object.keys(verses).map(Number).sort((a, b) => a - b);
    html += `<div class="chapter-block"><h2 class="chapter-heading" data-book="${esc(book)}" data-chapter="${c}">${t().chapter} ${c}</h2>`;
    html += descriptionHtml(chapterDescFrom(descriptions, book, c));
    html += `<div class="verses">`;
    html += renderStyledVerses(book, c, nums, verses);
    html += `</div></div>`;
  }
  html += `</div>`;
  html += `<div class="parallel-col"><div class="parallel-translation-label">${esc(secondaryLabel)}</div>`;
  html += `<h1 class="book-title">${esc(displayNameFor(secondaryLabel, book))}</h1>`;
  html += descriptionHtml(bookDescFrom(secondaryDescriptions, book));
  if (bd2) {
    for (const c of chs) {
      const verses = bd2[String(c)];
      if (!verses) {
        html += `<div class="chapter-block"><h2 class="chapter-heading">${t().chapter} ${c}</h2><p class="empty">${t().notFound}</p></div>`;
        continue;
      }
      const nums = Object.keys(verses).map(Number).sort((a, b) => a - b);
      html += `<div class="chapter-block"><h2 class="chapter-heading" data-book="${esc(book)}" data-chapter="${c}">${t().chapter} ${c}</h2>`;
      html += descriptionHtml(chapterDescFrom(secondaryDescriptions, book, c));
      html += `<div class="verses">`;
      html += renderStyledVerses(book, c, nums, verses, true);
      html += `</div></div>`;
    }
  } else {
    html += `<p class="empty">${t().notFound}</p>`;
  }
  html += `</div>`;
  html += `</div>`;
  html += navArrowsHtml(prev, next, false);
  $("content").innerHTML = html;
  window.scrollTo(0, 0);
}
function renderParallelVerseSegments(primary, secondary, book, chapter, segments, primaryLabel, secondaryLabel) {
  const ch1 = primary[book]?.[String(chapter)];
  const ch2 = secondary[book]?.[String(chapter)];
  if (!ch1) {
    $("content").innerHTML = `<p class="empty">${t().notFound}</p>`;
    return;
  }
  const segLabel = segments.map((s) => s.start === s.end ? `${s.start}` : `${s.start}-${s.end}`).join(",");
  let html = `<div class="parallel-copy-both"><button class="copy-btn" data-copy-book="${esc(book)}" data-copy-chapter="${chapter}" data-copy-segments="${esc(segLabel)}" data-copy-source="both">&#128203; ${esc(t().copyBoth)}</button></div>`;
  html += `<div class="parallel-container">`;
  html += `<div class="parallel-col"><div class="parallel-translation-label">${esc(primaryLabel)}</div>`;
  html += `<h2 class="section-title">${esc(displayNameFor(primaryLabel, book))} ${chapter}:${segLabel} <button class="copy-btn" data-copy-book="${esc(book)}" data-copy-chapter="${chapter}" data-copy-segments="${esc(segLabel)}" data-copy-source="primary">&#128203;</button></h2>`;
  const segNums = [];
  for (const seg of segments)
    for (let v = seg.start;v <= seg.end; v++)
      segNums.push(v);
  html += `<div class="verses">`;
  html += renderStyledVerses(book, chapter, segNums, ch1);
  html += `</div></div>`;
  html += `<div class="parallel-col"><div class="parallel-translation-label">${esc(secondaryLabel)}</div>`;
  html += `<h2 class="section-title">${esc(displayNameFor(secondaryLabel, book))} ${chapter}:${segLabel} <button class="copy-btn" data-copy-book="${esc(book)}" data-copy-chapter="${chapter}" data-copy-segments="${esc(segLabel)}" data-copy-source="secondary">&#128203;</button></h2>`;
  html += `<div class="verses">`;
  if (ch2) {
    html += renderStyledVerses(book, chapter, segNums, ch2, true);
  } else {
    html += `<p class="empty">${t().notFound}</p>`;
  }
  html += `</div></div>`;
  html += `</div>`;
  html += `<div class="read-full-chapter"><a class="full-chapter-link" data-book="${esc(book)}" data-chapter="${chapter}">${t().readFullChapter} &rarr;</a></div>`;
  $("content").innerHTML = html;
  window.scrollTo(0, 0);
}
function renderParallelVerse(primary, secondary, book, chapter, verse, primaryLabel, secondaryLabel) {
  const text1 = primary[book]?.[String(chapter)]?.[String(verse)];
  if (!text1) {
    $("content").innerHTML = `<p class="empty">${t().notFound}</p>`;
    return;
  }
  const text2 = secondary[book]?.[String(chapter)]?.[String(verse)];
  const { prev, next } = getVerseNav(primary, book, chapter, verse);
  let html = navArrowsHtml(prev, next);
  html += `<div class="parallel-copy-both"><button class="copy-btn" data-copy-book="${esc(book)}" data-copy-chapter="${chapter}" data-copy-verse="${verse}" data-copy-source="both">&#128203; ${esc(t().copyBoth)}</button></div>`;
  html += `<div class="parallel-container">`;
  html += `<div class="parallel-col"><div class="parallel-translation-label">${esc(primaryLabel)}</div>`;
  html += `<h2 class="section-title">${esc(displayNameFor(primaryLabel, book))} ${chapter}:${verse} <button class="copy-btn" data-copy-book="${esc(book)}" data-copy-chapter="${chapter}" data-copy-verse="${verse}" data-copy-source="primary">&#128203;</button></h2>`;
  html += `<div class="verses single-verse"><span class="verse${hlClass(book, chapter, verse)}" data-book="${esc(book)}" data-chapter="${chapter}" data-verse="${verse}"><sup>${verse}</sup>${fmt(text1)}</span></div></div>`;
  html += `<div class="parallel-col"><div class="parallel-translation-label">${esc(secondaryLabel)}</div>`;
  html += `<h2 class="section-title">${esc(displayNameFor(secondaryLabel, book))} ${chapter}:${verse} <button class="copy-btn" data-copy-book="${esc(book)}" data-copy-chapter="${chapter}" data-copy-verse="${verse}" data-copy-source="secondary">&#128203;</button></h2>`;
  html += `<div class="verses single-verse"><span class="verse${hlClass(book, chapter, verse)}" data-book="${esc(book)}" data-chapter="${chapter}" data-verse="${verse}" data-secondary="1"><sup>${verse}</sup>${text2 ? fmt(text2) : t().notFound}</span></div></div>`;
  html += `</div>`;
  html += `<div class="read-full-chapter"><a class="full-chapter-link" data-book="${esc(book)}" data-chapter="${chapter}">${t().readFullChapter} &rarr;</a></div>`;
  $("content").innerHTML = html;
  window.scrollTo(0, 0);
}
function navRefLabelFor(translationCode2, nav) {
  const { book, chapterStart, chapterEnd, verseSegments } = nav;
  const name = displayNameFor(translationCode2, book);
  if (chapterStart !== undefined && chapterEnd !== undefined) {
    if (verseSegments) {
      const segLabel = verseSegments.map((s) => s.start === s.end ? `${s.start}` : `${s.start}-${s.end}`).join(",");
      return `${name} ${chapterStart}:${segLabel}`;
    }
    if (chapterStart === chapterEnd)
      return `${name} ${chapterStart}`;
    return `${name} ${chapterStart}-${chapterEnd}`;
  }
  return name;
}
function parallelNavRefHtml(primary, secondary, nav, primaryLabel, secondaryLabel) {
  const { book, chapterStart, chapterEnd, verseSegments } = nav;
  const bd1 = primary[book];
  const bd2 = secondary[book];
  if (!bd1)
    return "";
  const pTitle = navRefLabelFor(primaryLabel, nav);
  const sTitle = navRefLabelFor(secondaryLabel, nav);
  let primaryHtml = "";
  let secondaryHtml = "";
  if (chapterStart !== undefined && chapterEnd !== undefined) {
    if (verseSegments) {
      const ch1 = bd1[String(chapterStart)];
      const ch2 = bd2?.[String(chapterStart)];
      const segNums = [];
      for (const seg of verseSegments)
        for (let v = seg.start;v <= seg.end; v++)
          segNums.push(v);
      primaryHtml += `<div class="verses">`;
      primaryHtml += renderStyledVerses(book, chapterStart, segNums, ch1 ?? {});
      primaryHtml += `</div>`;
      secondaryHtml += `<div class="verses">`;
      if (ch2) {
        secondaryHtml += renderStyledVerses(book, chapterStart, segNums, ch2, true);
      } else {
        secondaryHtml += `<p class="empty">${t().notFound}</p>`;
      }
      secondaryHtml += `</div>`;
    } else {
      for (let c = chapterStart;c <= chapterEnd; c++) {
        const ch1 = bd1[String(c)];
        const ch2 = bd2?.[String(c)];
        if (!ch1)
          continue;
        const nums = Object.keys(ch1).map(Number).sort((a, b) => a - b);
        if (chapterStart !== chapterEnd) {
          primaryHtml += `<h3 class="multi-nav-subheading">${esc(displayNameFor(primaryLabel, book))} ${c}</h3>`;
          secondaryHtml += `<h3 class="multi-nav-subheading">${esc(displayNameFor(secondaryLabel, book))} ${c}</h3>`;
        }
        primaryHtml += `<div class="verses">`;
        for (const n of nums) {
          primaryHtml += `<span class="verse${hlClass(book, c, n)}" data-book="${esc(book)}" data-chapter="${c}" data-verse="${n}"><sup>${n}</sup>${fmt(ch1[String(n)])}</span> `;
        }
        primaryHtml += `</div>`;
        secondaryHtml += `<div class="verses">`;
        if (ch2) {
          for (const n of nums) {
            const text = ch2[String(n)];
            if (text)
              secondaryHtml += `<span class="verse${hlClass(book, c, n)}" data-book="${esc(book)}" data-chapter="${c}" data-verse="${n}" data-secondary="1"><sup>${n}</sup>${fmt(text)}</span> `;
          }
        } else {
          secondaryHtml += `<p class="empty">${t().notFound}</p>`;
        }
        secondaryHtml += `</div>`;
      }
    }
  } else {
    const ch1 = bd1["1"];
    const ch2 = bd2?.["1"];
    if (!ch1)
      return "";
    const nums = Object.keys(ch1).map(Number).sort((a, b) => a - b);
    primaryHtml += `<div class="verses">`;
    for (const n of nums) {
      primaryHtml += `<span class="verse${hlClass(book, 1, n)}" data-book="${esc(book)}" data-chapter="1" data-verse="${n}"><sup>${n}</sup>${fmt(ch1[String(n)])}</span> `;
    }
    primaryHtml += `</div>`;
    secondaryHtml += `<div class="verses">`;
    if (ch2) {
      for (const n of nums) {
        const text = ch2[String(n)];
        if (text)
          secondaryHtml += `<span class="verse${hlClass(book, 1, n)}" data-book="${esc(book)}" data-chapter="1" data-verse="${n}" data-secondary="1"><sup>${n}</sup>${fmt(text)}</span> `;
      }
    } else {
      secondaryHtml += `<p class="empty">${t().notFound}</p>`;
    }
    secondaryHtml += `</div>`;
  }
  let html = `<div class="parallel-container">`;
  html += `<div class="parallel-col"><div class="parallel-translation-label">${esc(primaryLabel)}</div>`;
  html += `<h2 class="section-title">${esc(pTitle)} <button class="copy-btn" data-copy-book="${esc(book)}" data-copy-chapter="${chapterStart ?? 1}" data-copy-source="primary">&#128203;</button></h2>`;
  html += primaryHtml;
  html += `</div>`;
  html += `<div class="parallel-col"><div class="parallel-translation-label">${esc(secondaryLabel)}</div>`;
  html += `<h2 class="section-title">${esc(sTitle)} <button class="copy-btn" data-copy-book="${esc(book)}" data-copy-chapter="${chapterStart ?? 1}" data-copy-source="secondary">&#128203;</button></h2>`;
  html += secondaryHtml;
  html += `</div></div>`;
  return html;
}
function renderParallelMultiNav(primary, secondary, refs, primaryLabel, secondaryLabel) {
  let html = "";
  for (let i = 0;i < refs.length; i++) {
    if (i > 0)
      html += `<hr class="multi-nav-divider">`;
    html += `<section class="multi-nav-section">`;
    html += parallelNavRefHtml(primary, secondary, refs[i], primaryLabel, secondaryLabel);
    const ch = refs[i].chapterStart ?? 1;
    html += `<div class="read-full-chapter"><a class="full-chapter-link" data-book="${esc(refs[i].book)}" data-chapter="${ch}">${t().readFullChapter} &rarr;</a></div>`;
    html += `</section>`;
  }
  $("content").innerHTML = html;
  window.scrollTo(0, 0);
}

// src/client/app.ts
var data;
var currentTranslation = "NHEB";
var DEFAULT_TRANSLATION = "NHEB";
var translationRequestId = 0;
var parallelTranslation = "";
var parallelData = null;
var highlightMap2 = new Map;
function withTranslationParams(s) {
  return { ...s, translation: currentTranslation, parallel: parallelTranslation || undefined, interlinear: getInterlinearEnabled() || undefined };
}
async function fetchInterlinear(book) {
  const existing = getInterlinearBook(book);
  if (existing)
    return existing;
  const cached = await loadInterlinearBook(book);
  if (cached) {
    setInterlinearBook(book, cached);
    return cached;
  }
  const res = await fetch(`./text/interlinear/${encodeURIComponent(book)}.json`);
  if (!res.ok)
    throw new Error(`HTTP ${res.status}`);
  const d = await res.json();
  setInterlinearBook(book, d);
  await saveInterlinearBook(book, d);
  return d;
}
async function fetchStrongs() {
  const existing = getStrongsDict();
  if (existing && Object.keys(existing).length > 0)
    return existing;
  const cached = await loadStrongsDict();
  if (cached) {
    setStrongsDict(cached);
    return cached;
  }
  const res = await fetch("./text/strongs.json");
  if (!res.ok)
    throw new Error(`HTTP ${res.status}`);
  const d = await res.json();
  setStrongsDict(d);
  await saveStrongsDict(d);
  return d;
}
async function fetchTranslation(code) {
  const cached = await loadBible(code);
  if (cached)
    return cached;
  const res = await fetch(`./text/bible-${encodeURIComponent(code)}.json`);
  if (!res.ok)
    throw new Error(`HTTP ${res.status}`);
  const d = await res.json();
  await saveBible(code, d);
  return d;
}
async function fetchTranslations() {
  try {
    const res = await fetch("./text/translations.json");
    if (!res.ok)
      return [DEFAULT_TRANSLATION];
    return await res.json();
  } catch {
    return [DEFAULT_TRANSLATION];
  }
}
async function fetchDescriptions(code) {
  const lang = TRANSLATION_LANG[code] || "en";
  try {
    const res = await fetch(`./data/descriptions-${encodeURIComponent(lang)}.json`);
    if (!res.ok)
      return [];
    return await res.json();
  } catch {
    return [];
  }
}
var toastTimer;
function showToast(msg) {
  const el = document.getElementById("toast");
  if (!el)
    return;
  el.textContent = msg;
  el.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => el.classList.remove("show"), 2000);
}
function applyTheme(theme) {
  if (theme === "system") {
    const dark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    document.documentElement.setAttribute("data-theme", dark ? "dark" : "light");
  } else {
    document.documentElement.setAttribute("data-theme", theme);
  }
}
function isKJV() {
  return currentTranslation === "KJV";
}
async function ensureInterlinear(book) {
  if (!isKJV())
    return;
  try {
    await Promise.all([fetchInterlinear(book), fetchStrongs()]);
    setSearchInterlinearData(getInterlinearBooks());
  } catch {}
}
async function init() {
  const content = document.getElementById("content");
  const searchInput = document.getElementById("search-input");
  const indexBtn = document.getElementById("index-btn");
  const overlay = document.getElementById("index-overlay");
  const infoBtn = document.getElementById("info-btn");
  const infoOverlay = document.getElementById("info-overlay");
  const infoClose = document.getElementById("info-close");
  const settingsBtn = document.getElementById("settings-btn");
  const settingsOverlay = document.getElementById("settings-overlay");
  const settingsClose = document.getElementById("settings-close");
  const verseMenu = document.getElementById("verse-menu");
  const initialState = readState();
  currentTranslation = initialState.translation || localStorage.getItem("bible-translation") || DEFAULT_TRANSLATION;
  setTranslation(currentTranslation);
  setTranslationCode(currentTranslation);
  const savedLang = TRANSLATION_LANG[currentTranslation] || localStorage.getItem("bible-language") || "en";
  setLanguage(savedLang);
  localStorage.setItem("bible-language", savedLang);
  const languageSelect = document.getElementById("language-select");
  if (languageSelect)
    languageSelect.value = savedLang;
  const savedTheme = localStorage.getItem("bible-theme") || "system";
  applyTheme(savedTheme);
  const themeSelect = document.getElementById("theme-select");
  if (themeSelect)
    themeSelect.value = savedTheme;
  const savedFontSize = localStorage.getItem("bible-font-size") || "medium";
  document.documentElement.setAttribute("data-font-size", savedFontSize);
  const fontSizeSelect = document.getElementById("fontsize-select");
  if (fontSizeSelect)
    fontSizeSelect.value = savedFontSize;
  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
    const theme = localStorage.getItem("bible-theme") || "system";
    if (theme === "system")
      applyTheme("system");
  });
  const hlMap = await getHighlightMap();
  highlightMap2 = hlMap;
  setHighlightMap(hlMap);
  content.innerHTML = `<p class="loading">${t().loadingBible}</p>`;
  try {
    data = await fetchTranslation(currentTranslation);
  } catch (err) {
    content.innerHTML = `<p class="empty">${t().loadFailed}</p>`;
    return;
  }
  const shLang = TRANSLATION_LANG[currentTranslation] || "en";
  const [desc, sgData, shData] = await Promise.all([
    fetchDescriptions(currentTranslation),
    fetch("./data/styleguide.json").then((r) => r.ok ? r.json() : null).catch(() => null),
    fetch(`./data/subheadings-${shLang}.json`).then((r) => r.ok ? r.json() : null).catch(() => null)
  ]);
  setDescriptions(desc);
  if (sgData)
    setStyleguide(sgData);
  if (shData)
    setSubheadings(shData);
  localStorage.setItem("bible-translation", currentTranslation);
  initSearch(data);
  const translationSelect = document.getElementById("translation-select");
  if (translationSelect) {
    const translations = await fetchTranslations();
    translationSelect.innerHTML = translations.map((t2) => {
      const info = TRANSLATION_NAMES[t2];
      const label = info ? `${t2} — ${info.name} (${info.language})` : t2;
      return `<option value="${t2}"${t2 === currentTranslation ? " selected" : ""}>${label}</option>`;
    }).join("");
    translationSelect.addEventListener("change", async () => {
      const code = translationSelect.value;
      if (code === currentTranslation)
        return;
      const state2 = readState();
      const parsedBooks = state2.query ? parseQueryBooks(state2.query) : null;
      const requestId = ++translationRequestId;
      content.innerHTML = `<p class="loading">${t().loadingTranslation(code)}</p>`;
      try {
        const newData = await fetchTranslation(code);
        if (requestId !== translationRequestId)
          return;
        data = newData;
        currentTranslation = code;
        setTranslation(code);
        setTranslationCode(code);
        localStorage.setItem("bible-translation", code);
        initSearch(data);
        const newDesc = await fetchDescriptions(code);
        setDescriptions(newDesc);
        const newShLang = TRANSLATION_LANG[code] || "en";
        try {
          const shRes = await fetch(`./data/subheadings-${newShLang}.json`);
          if (shRes.ok)
            setSubheadings(await shRes.json());
        } catch {}
        const newLang = TRANSLATION_LANG[code];
        if (newLang && newLang !== getLanguage()) {
          setLanguage(newLang);
          localStorage.setItem("bible-language", newLang);
          if (languageSelect)
            languageSelect.value = newLang;
          updateStaticText();
        }
        indexRendered = false;
        indexScrollTo = null;
        if (overlay.classList.contains("open"))
          openIndex();
        if (parsedBooks) {
          state2.query = parsedBooks.map((p) => {
            if (!p.book)
              return p.original;
            const name = displayName(p.book);
            let result = p.rest ? `${name} ${p.rest}` : name;
            if (p.quoted)
              result += ` ${p.quoted}`;
            return result;
          }).join("; ");
        }
        searchInput.value = stateToInputText(state2);
        applyState(state2);
        replaceState(withTranslationParams(stateForUrl(state2)));
        updateFooter();
      } catch {
        content.innerHTML = `<p class="empty">${t().loadTranslationFailed(code)}</p>`;
        translationSelect.value = currentTranslation;
      }
    });
  }
  if (languageSelect) {
    languageSelect.addEventListener("change", () => {
      const lang = languageSelect.value;
      setLanguage(lang);
      localStorage.setItem("bible-language", lang);
      updateStaticText();
      indexRendered = false;
      indexScrollTo = null;
      if (overlay.classList.contains("open"))
        openIndex();
      searchInput.value = stateToInputText(state);
      applyState(state);
      updateFooter();
    });
  }
  const parallelSelect = document.getElementById("parallel-select");
  if (parallelSelect && translationSelect) {
    const translations = await fetchTranslations();
    const savedParallel = initialState.parallel || localStorage.getItem("bible-parallel") || "";
    parallelSelect.innerHTML = `<option value="">${t().parallelNone}</option>` + translations.map((tr) => {
      const info = TRANSLATION_NAMES[tr];
      const label = info ? `${tr} — ${info.name}` : tr;
      return `<option value="${tr}"${tr === savedParallel ? " selected" : ""}>${label}</option>`;
    }).join("");
    if (savedParallel) {
      try {
        parallelTranslation = savedParallel;
        parallelData = await fetchTranslation(savedParallel);
        localStorage.setItem("bible-parallel", savedParallel);
        setSecondaryDescriptions(await fetchDescriptions(savedParallel));
        const secShLang = TRANSLATION_LANG[savedParallel] || "en";
        try {
          const shRes = await fetch(`./data/subheadings-${secShLang}.json`);
          if (shRes.ok)
            setSecondarySubheadings(await shRes.json());
        } catch {}
      } catch {
        parallelTranslation = "";
        parallelData = null;
        parallelSelect.value = "";
      }
    }
    parallelSelect.addEventListener("change", async () => {
      const code = parallelSelect.value;
      if (!code) {
        parallelTranslation = "";
        parallelData = null;
        setSecondaryDescriptions([]);
        setSecondarySubheadings({});
        localStorage.removeItem("bible-parallel");
      } else {
        try {
          parallelData = await fetchTranslation(code);
          parallelTranslation = code;
          localStorage.setItem("bible-parallel", code);
          setSecondaryDescriptions(await fetchDescriptions(code));
          const secShLang = TRANSLATION_LANG[code] || "en";
          try {
            const shRes = await fetch(`./data/subheadings-${secShLang}.json`);
            if (shRes.ok)
              setSecondarySubheadings(await shRes.json());
          } catch {}
        } catch {
          parallelTranslation = "";
          parallelData = null;
          parallelSelect.value = "";
        }
      }
      const state2 = readState();
      applyState(state2);
      replaceState(withTranslationParams(stateForUrl(state2)));
    });
  }
  if (themeSelect) {
    themeSelect.addEventListener("change", () => {
      const theme = themeSelect.value;
      applyTheme(theme);
      localStorage.setItem("bible-theme", theme);
    });
  }
  if (fontSizeSelect) {
    fontSizeSelect.addEventListener("change", () => {
      const size = fontSizeSelect.value;
      document.documentElement.setAttribute("data-font-size", size);
      localStorage.setItem("bible-font-size", size);
    });
  }
  updateStaticText();
  const strongsPanel = document.getElementById("strongs-panel");
  const savedIl = initialState.interlinear || isKJV() && localStorage.getItem("bible-interlinear") === "1";
  if (savedIl && isKJV()) {
    setInterlinearEnabled(true);
  }
  function updateIlToggle() {
    const btn = document.querySelector(".il-toggle-btn");
    if (!btn)
      return;
    if (getInterlinearEnabled())
      btn.classList.add("active");
    else
      btn.classList.remove("active");
  }
  function closeStrongsPanel() {
    strongsPanel.classList.remove("open");
    strongsPanel.innerHTML = "";
    currentStrongsId = "";
  }
  let currentStrongsId = "";
  async function openStrongsPanel(strongsId) {
    if (strongsPanel.classList.contains("open") && currentStrongsId === strongsId.toLowerCase()) {
      closeStrongsPanel();
      return;
    }
    let dict = getStrongsDict();
    if (!dict || Object.keys(dict).length === 0) {
      try {
        dict = await fetchStrongs();
      } catch {
        return;
      }
    }
    const entry = dict[strongsId.toLowerCase()];
    if (!entry)
      return;
    currentStrongsId = strongsId.toLowerCase();
    strongsPanel.innerHTML = renderStrongsPanel(entry, strongsId);
    strongsPanel.classList.add("open");
    const closeBtn = strongsPanel.querySelector(".strongs-close");
    if (closeBtn)
      closeBtn.addEventListener("click", closeStrongsPanel);
  }
  const state = readState();
  searchInput.value = stateToInputText(state);
  applyState(state);
  replaceState(withTranslationParams(stateForUrl(state)));
  updateFooter();
  document.getElementById("footer")?.classList.add("visible");
  let timer;
  searchInput.addEventListener("input", () => {
    clearTimeout(timer);
    timer = window.setTimeout(() => {
      const q = searchInput.value.trim();
      if (!q) {
        const s = {};
        applyState(s);
        replaceState(withTranslationParams(s));
        return;
      }
      applyState({ query: q });
      replaceState(withTranslationParams(stateForUrl({ query: q })));
    }, 150);
  });
  searchInput.addEventListener("keydown", (e) => {
    if (e.key === '"') {
      const start = searchInput.selectionStart ?? searchInput.value.length;
      const end = searchInput.selectionEnd ?? start;
      const val = searchInput.value;
      if (val[end] === '"') {
        e.preventDefault();
        searchInput.selectionStart = searchInput.selectionEnd = end + 1;
        searchInput.dispatchEvent(new Event("input"));
      } else {
        e.preventDefault();
        const before = val.slice(0, start);
        const after = val.slice(end);
        searchInput.value = before + '""' + after;
        searchInput.selectionStart = searchInput.selectionEnd = start + 1;
        searchInput.dispatchEvent(new Event("input"));
      }
    }
  });
  let indexRendered = false;
  let indexScrollTo = null;
  function lockScroll() {
    const scrollbarW = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.paddingRight = scrollbarW + "px";
    document.body.classList.add("panel-open");
  }
  function unlockScroll() {
    document.body.classList.remove("panel-open");
    document.body.style.paddingRight = "";
  }
  function openIndex() {
    overlay.classList.add("open");
    lockScroll();
    if (!indexRendered) {
      const idx = renderIndex(data, {
        onBook(book2) {
          navigate({ book: book2 });
        },
        onChapter(book2, chapter) {
          navigate({ book: book2, chapter });
        },
        onVerse(book2, chapter, verse) {
          navigate({ book: book2, chapter, verse });
        }
      });
      indexScrollTo = idx.scrollTo;
      indexRendered = true;
    }
    const current2 = readState();
    const book = current2.book || "Genesis";
    requestAnimationFrame(() => {
      if (indexScrollTo)
        indexScrollTo(book, current2.chapter, current2.verse);
      let target = null;
      if (current2.verse !== undefined) {
        target = document.querySelector("#idx-verses .idx-item:focus") ?? (() => {
          const items = document.querySelectorAll("#idx-verses .idx-item");
          for (const el of items)
            if (el.textContent?.startsWith(`${current2.verse}. `))
              return el;
          return null;
        })() ?? document.querySelector("#idx-verses .idx-item");
      } else if (current2.chapter !== undefined) {
        target = document.querySelector(`#idx-chapters .idx-item.active`) ?? document.querySelector("#idx-chapters .idx-item");
      }
      if (!target) {
        target = document.querySelector("#idx-books .idx-item.active") ?? document.querySelector("#idx-books .idx-item");
      }
      target?.focus();
    });
  }
  function closeIndex() {
    overlay.classList.remove("open");
    unlockScroll();
  }
  function toggleIndex() {
    if (overlay.classList.contains("open"))
      closeIndex();
    else
      openIndex();
  }
  indexBtn.addEventListener("click", toggleIndex);
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay)
      closeIndex();
  });
  infoBtn.addEventListener("click", () => {
    infoOverlay.classList.add("open");
    lockScroll();
  });
  function closeInfo() {
    infoOverlay.classList.remove("open");
    unlockScroll();
  }
  infoClose.addEventListener("click", closeInfo);
  infoOverlay.addEventListener("click", (e) => {
    if (e.target === infoOverlay)
      closeInfo();
  });
  settingsBtn.addEventListener("click", () => {
    settingsOverlay.classList.add("open");
    lockScroll();
  });
  function closeSettings() {
    settingsOverlay.classList.remove("open");
    unlockScroll();
  }
  settingsClose.addEventListener("click", closeSettings);
  settingsOverlay.addEventListener("click", (e) => {
    if (e.target === settingsOverlay)
      closeSettings();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      if (strongsPanel.classList.contains("open")) {
        closeStrongsPanel();
        return;
      }
      if (verseMenu.classList.contains("open")) {
        closeVerseMenu();
        return;
      }
      if (settingsOverlay.classList.contains("open")) {
        closeSettings();
        return;
      }
      if (infoOverlay.classList.contains("open")) {
        closeInfo();
        return;
      }
      if (overlay.classList.contains("open")) {
        closeIndex();
        return;
      }
    }
    if ((e.ctrlKey || e.metaKey) && e.key === "k") {
      e.preventDefault();
      if (overlay.classList.contains("open"))
        closeIndex();
      searchInput.focus();
      searchInput.select();
    }
    if ((e.ctrlKey || e.metaKey) && e.key === "i") {
      e.preventDefault();
      toggleIndex();
    }
  });
  content.addEventListener("click", (e) => {
    const arrow = e.target.closest(".nav-arrow");
    if (arrow && !arrow.classList.contains("nav-disabled")) {
      const b = arrow.dataset.book;
      const c = arrow.dataset.chapter;
      const v = arrow.dataset.verse;
      if (v !== undefined) {
        navigate({ book: b, chapter: +c, verse: +v });
      } else if (c !== undefined) {
        navigate({ book: b, chapter: +c });
      } else {
        navigate({ book: b });
      }
      return;
    }
    const result = e.target.closest(".result");
    if (result) {
      const b = result.dataset.book;
      const c = +result.dataset.chapter;
      const v = +result.dataset.verse;
      navigate({ book: b, chapter: c, verse: v });
      return;
    }
    const fullChapter = e.target.closest(".full-chapter-link");
    if (fullChapter) {
      navigate({ book: fullChapter.dataset.book, chapter: +fullChapter.dataset.chapter });
      return;
    }
    const heading = e.target.closest(".chapter-heading");
    if (heading) {
      navigate({ book: heading.dataset.book, chapter: +heading.dataset.chapter });
      return;
    }
    const strongsEl = e.target.closest(".il-strongs");
    if (strongsEl) {
      const word = strongsEl.closest(".il-word");
      if (word?.dataset.strongs) {
        openStrongsPanel(word.dataset.strongs);
      }
      return;
    }
    const ilWord = e.target.closest(".il-word");
    if (ilWord?.dataset.strongs) {
      openStrongsPanel(ilWord.dataset.strongs);
      return;
    }
    const ilToggle = e.target.closest(".il-toggle-btn");
    if (ilToggle) {
      const enabled = !getInterlinearEnabled();
      setInterlinearEnabled(enabled);
      localStorage.setItem("bible-interlinear", enabled ? "1" : "0");
      updateIlToggle();
      const state2 = readState();
      applyState(state2);
      replaceState(withTranslationParams(stateForUrl(state2)));
      return;
    }
    const shareOpt = e.target.closest(".share-opt");
    if (shareOpt) {
      e.preventDefault();
      const url = new URL(window.location.href);
      if (shareOpt.dataset.share === "without") {
        url.searchParams.delete("t");
      }
      navigator.clipboard.writeText(url.toString()).then(() => showToast(t().linkCopied));
      return;
    }
    const copyBtn = e.target.closest(".copy-btn");
    if (copyBtn) {
      let buildVerseNums = function() {
        if (segments) {
          const nums = [];
          for (const p of segments.split(",")) {
            const range = p.split("-").map(Number);
            if (range.length === 2)
              for (let v = range[0];v <= range[1]; v++)
                nums.push(v);
            else
              nums.push(range[0]);
          }
          return nums;
        }
        return [];
      }, formatSection = function(sourceData, code) {
        const titleBook = displayNameFor(code, book);
        if (verse) {
          const v = sourceData[book]?.[String(chapter)]?.[verse];
          if (!v)
            return "";
          return `${translationLabel(code)}
${titleBook} ${chapter}:${verse}
${verse} ${v}`;
        } else if (segments) {
          const ch = sourceData[book]?.[String(chapter)];
          if (!ch)
            return "";
          const nums = buildVerseNums();
          return `${translationLabel(code)}
${titleBook} ${chapter}:${segments}
` + nums.filter((n) => ch[String(n)]).map((n) => `${n} ${ch[String(n)]}`).join(`
`);
        } else {
          const ch = sourceData[book]?.[String(chapter)];
          if (!ch)
            return "";
          const nums = Object.keys(ch).map(Number).sort((a, b) => a - b);
          return `${translationLabel(code)}
${titleBook} ${chapter}
` + nums.map((n) => `${n} ${ch[String(n)]}`).join(`
`);
        }
      };
      e.preventDefault();
      const book = copyBtn.dataset.copyBook;
      const chapter = +copyBtn.dataset.copyChapter;
      const verse = copyBtn.dataset.copyVerse;
      const segments = copyBtn.dataset.copySegments;
      const source = copyBtn.dataset.copySource || "";
      const translationLabel = (code) => {
        const info = TRANSLATION_NAMES[code];
        return info ? `${code} — ${info.name}` : code;
      };
      const includePrimary = source !== "secondary";
      const includeSecondary = source !== "primary" && !!parallelData && !!parallelTranslation;
      const parts = [];
      if (includePrimary) {
        const s = formatSection(data, currentTranslation);
        if (s)
          parts.push(s);
      }
      if (includeSecondary) {
        const s = formatSection(parallelData, parallelTranslation);
        if (s)
          parts.push(s);
      }
      const text = parts.join(`

`);
      if (text) {
        navigator.clipboard.writeText(text).then(() => showToast(t().copied));
      }
      return;
    }
  });
  let longPressTimer;
  let menuVerseEl = null;
  function closeVerseMenu() {
    verseMenu.classList.remove("open");
    verseMenu.innerHTML = "";
  }
  function openVerseMenu(verseEl, x, y) {
    menuVerseEl = verseEl;
    const book = verseEl.dataset.book;
    const chapter = +verseEl.dataset.chapter;
    const verse = +verseEl.dataset.verse;
    const hlKey = `${book}:${chapter}:${verse}`;
    const currentColor = highlightMap2.get(hlKey);
    const colors = ["yellow", "green", "blue", "pink", "orange"];
    let html = "";
    html += `<button class="verse-menu-item" data-action="copy">&#128203; ${t().copyVerse}</button>`;
    html += `<div class="verse-menu-colors">`;
    for (const c of colors) {
      html += `<span class="color-dot${currentColor === c ? " active" : ""}" data-color="${c}" data-action="highlight"></span>`;
    }
    if (currentColor) {
      html += `<span class="color-dot" data-action="remove-highlight" style="background: var(--border);" title="${t().removeHighlight}">&#10005;</span>`;
    }
    html += `</div>`;
    verseMenu.innerHTML = html;
    verseMenu.classList.add("open");
    const rect = verseMenu.getBoundingClientRect();
    const menuW = rect.width || 180;
    const menuH = rect.height || 120;
    let left = Math.min(x, window.innerWidth - menuW - 8);
    let top = Math.min(y, window.innerHeight - menuH - 8);
    left = Math.max(8, left);
    top = Math.max(8, top);
    verseMenu.style.left = left + "px";
    verseMenu.style.top = top + "px";
    verseMenu.onclick = async (ev) => {
      const target = ev.target;
      const action = target.dataset.action;
      if (!action)
        return;
      if (action === "copy") {
        const isSecondary = verseEl.dataset.secondary === "1";
        const sourceData = isSecondary && parallelData ? parallelData : data;
        const sourceCode = isSecondary ? parallelTranslation : currentTranslation;
        const sourceInfo = TRANSLATION_NAMES[sourceCode];
        const sourceLabel = sourceInfo ? `${sourceCode} — ${sourceInfo.name}` : sourceCode;
        const text = sourceData[book]?.[String(chapter)]?.[String(verse)];
        if (text) {
          const full = `${sourceLabel}
${displayName(book)} ${chapter}:${verse}
${verse} ${text}`;
          navigator.clipboard.writeText(full).then(() => showToast(t().copied));
        }
      } else if (action === "highlight") {
        const color = target.dataset.color;
        await setHighlight({ book, chapter, verse, color });
        highlightMap2.set(hlKey, color);
        verseEl.className = `verse hl-${color}`;
      } else if (action === "remove-highlight") {
        await removeHighlight(book, chapter, verse);
        highlightMap2.delete(hlKey);
        verseEl.className = "verse";
      }
      closeVerseMenu();
    };
  }
  content.addEventListener("click", (e) => {
    const sup = e.target.closest("sup");
    if (!sup)
      return;
    const verseEl = sup.closest(".verse");
    if (!verseEl || !verseEl.dataset.book)
      return;
    e.stopPropagation();
    openVerseMenu(verseEl, e.clientX, e.clientY);
  });
  content.addEventListener("touchstart", (e) => {
    const sup = e.target.closest("sup");
    if (!sup)
      return;
    const verseEl = sup.closest(".verse");
    if (!verseEl || !verseEl.dataset.book)
      return;
    const touch = e.touches[0];
    longPressTimer = window.setTimeout(() => {
      e.preventDefault();
      openVerseMenu(verseEl, touch.clientX, touch.clientY);
    }, 500);
  }, { passive: false });
  content.addEventListener("touchend", () => clearTimeout(longPressTimer));
  content.addEventListener("touchmove", () => clearTimeout(longPressTimer));
  document.addEventListener("click", (e) => {
    if (!verseMenu.contains(e.target))
      closeVerseMenu();
  });
  let touchStartX = 0;
  let touchStartY = 0;
  let touchStartTime = 0;
  content.addEventListener("touchstart", (e) => {
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
    touchStartTime = Date.now();
  }, { passive: true });
  content.addEventListener("touchend", (e) => {
    const dx = e.changedTouches[0].clientX - touchStartX;
    const dy = e.changedTouches[0].clientY - touchStartY;
    const dt = Date.now() - touchStartTime;
    if (dt > 500 || Math.abs(dx) < 80 || Math.abs(dy) > Math.abs(dx) * 0.5)
      return;
    const arrow = dx > 0 ? content.querySelector(".nav-arrow.nav-prev:not(.nav-disabled)") : content.querySelector(".nav-arrow.nav-next:not(.nav-disabled)");
    if (arrow)
      arrow.click();
  }, { passive: true });
  window.addEventListener("popstate", async () => {
    const s = readState();
    if (s.translation && s.translation !== currentTranslation) {
      try {
        data = await fetchTranslation(s.translation);
        currentTranslation = s.translation;
        setTranslation(s.translation);
        setTranslationCode(s.translation);
        localStorage.setItem("bible-translation", s.translation);
        initSearch(data);
        const newLang = TRANSLATION_LANG[s.translation];
        if (newLang && newLang !== getLanguage()) {
          setLanguage(newLang);
          localStorage.setItem("bible-language", newLang);
          if (languageSelect)
            languageSelect.value = newLang;
          updateStaticText();
        }
        indexRendered = false;
        indexScrollTo = null;
        if (overlay.classList.contains("open"))
          openIndex();
        if (translationSelect)
          translationSelect.value = s.translation;
        updateFooter();
      } catch {}
    }
    const urlParallel = s.parallel || "";
    if (urlParallel !== parallelTranslation) {
      if (!urlParallel) {
        parallelTranslation = "";
        parallelData = null;
        setSecondaryDescriptions([]);
        setSecondarySubheadings({});
      } else {
        try {
          parallelData = await fetchTranslation(urlParallel);
          parallelTranslation = urlParallel;
          setSecondaryDescriptions(await fetchDescriptions(urlParallel));
          const secShLang = TRANSLATION_LANG[urlParallel] || "en";
          try {
            const shRes = await fetch(`./data/subheadings-${secShLang}.json`);
            if (shRes.ok)
              setSecondarySubheadings(await shRes.json());
          } catch {}
        } catch {
          parallelTranslation = "";
          parallelData = null;
          setSecondaryDescriptions([]);
          setSecondarySubheadings({});
        }
      }
      localStorage.setItem("bible-parallel", parallelTranslation);
      if (parallelSelect)
        parallelSelect.value = parallelTranslation;
    }
    searchInput.value = stateToInputText(s);
    applyState(s);
  });
}
function navigate(s) {
  const searchInput = document.getElementById("search-input");
  searchInput.value = stateToInputText(s);
  document.getElementById("index-overlay").classList.remove("open");
  document.body.classList.remove("panel-open");
  document.body.style.paddingRight = "";
  applyState(s);
  pushState(withTranslationParams(s));
}
function renderNavRef(nav) {
  const { book, chapterStart, chapterEnd, verseSegments } = nav;
  const useParallel = !!parallelData && !!parallelTranslation;
  if (chapterStart !== undefined && chapterEnd !== undefined) {
    if (verseSegments) {
      if (verseSegments.length === 1 && verseSegments[0].start === verseSegments[0].end) {
        if (useParallel) {
          renderParallelVerse(data, parallelData, book, chapterStart, verseSegments[0].start, currentTranslation, parallelTranslation);
        } else {
          renderVerse(data, book, chapterStart, verseSegments[0].start);
        }
      } else {
        if (useParallel) {
          renderParallelVerseSegments(data, parallelData, book, chapterStart, verseSegments, currentTranslation, parallelTranslation);
        } else {
          renderVerseSegments(data, book, chapterStart, verseSegments);
        }
      }
    } else if (chapterStart === chapterEnd) {
      if (useParallel) {
        renderParallelChapter(data, parallelData, book, chapterStart, currentTranslation, parallelTranslation);
      } else {
        renderChapter(data, book, chapterStart);
      }
    } else {
      renderChapterRange(data, book, chapterStart, chapterEnd);
    }
  } else {
    if (useParallel) {
      renderParallelChapter(data, parallelData, book, 1, currentTranslation, parallelTranslation);
    } else {
      renderChapter(data, book, 1);
    }
  }
}
function updateTitle(s) {
  let label;
  if (s.query) {
    const navRefs = tryParseNav(s.query);
    if (navRefs && navRefs.every((r) => !!data[r.book])) {
      label = navRefs.map((r) => navRefLabel(r)).join("; ");
    } else {
      label = s.query;
    }
  } else if (s.book && s.chapter && s.verse) {
    label = `${displayName(s.book)} ${s.chapter}:${s.verse}`;
  } else if (s.book && s.chapter) {
    label = `${displayName(s.book)} ${s.chapter}`;
  } else if (s.book) {
    label = displayName(s.book);
  } else {
    label = `${displayName("Genesis")} 1`;
  }
  document.title = `${label} | SANATHEOS`;
}
function queryToUrlState(q) {
  const navRefs = tryParseNav(q);
  if (!navRefs || navRefs.length !== 1 || !data[navRefs[0].book])
    return { query: q };
  const nav = navRefs[0];
  if (nav.chapterStart === undefined) {
    return { book: nav.book, chapter: 1 };
  }
  if (nav.chapterStart === nav.chapterEnd && !nav.verseSegments) {
    return { book: nav.book, chapter: nav.chapterStart };
  }
  if (nav.chapterStart === nav.chapterEnd && nav.verseSegments && nav.verseSegments.length === 1 && nav.verseSegments[0].start === nav.verseSegments[0].end) {
    return { book: nav.book, chapter: nav.chapterStart, verse: nav.verseSegments[0].start };
  }
  return { query: q };
}
function stateForUrl(s) {
  if (s.query)
    return queryToUrlState(s.query);
  return s;
}
async function applyState(s) {
  const useParallel = !!parallelData && !!parallelTranslation;
  if (getInterlinearEnabled() && isKJV()) {
    let books = [];
    if (s.query) {
      const navRefs = tryParseNav(s.query);
      if (navRefs && navRefs.every((r) => !!data[r.book])) {
        books = navRefs.map((r) => r.book);
      }
    } else if (s.book) {
      books = [s.book];
    } else {
      books = ["Genesis"];
    }
    await Promise.all(books.map((b) => ensureInterlinear(b)));
  }
  if (s.query) {
    const navRefs = tryParseNav(s.query);
    if (navRefs && navRefs.every((r) => !!data[r.book])) {
      if (navRefs.length === 1) {
        renderNavRef(navRefs[0]);
      } else {
        if (useParallel) {
          renderParallelMultiNav(data, parallelData, navRefs, currentTranslation, parallelTranslation);
        } else {
          renderMultiNav(data, navRefs);
        }
      }
    } else {
      const results = search(data, s.query);
      renderResults(results, s.query);
    }
  } else if (s.book && s.chapter && s.verse) {
    if (useParallel) {
      renderParallelVerse(data, parallelData, s.book, s.chapter, s.verse, currentTranslation, parallelTranslation);
    } else {
      renderVerse(data, s.book, s.chapter, s.verse);
    }
  } else if (s.book && s.chapter) {
    if (useParallel) {
      renderParallelChapter(data, parallelData, s.book, s.chapter, currentTranslation, parallelTranslation);
    } else {
      renderChapter(data, s.book, s.chapter);
    }
  } else if (s.book) {
    if (useParallel) {
      renderParallelBook(data, parallelData, s.book, currentTranslation, parallelTranslation);
    } else {
      renderBook(data, s.book);
    }
  } else {
    if (useParallel) {
      renderParallelChapter(data, parallelData, "Genesis", 1, currentTranslation, parallelTranslation);
    } else {
      renderChapter(data, "Genesis", 1);
    }
  }
  updateTitle(s);
  updateFooter();
}
var TRANSLATION_NAMES = {
  NHEB: { name: "New Heart English Bible", language: "English" },
  KJV: { name: "King James Version", language: "English" },
  CPDV: { name: "Catholic Public Domain Version", language: "English" },
  KR38: { name: "Raamattu 1933/1938", language: "Suomi" }
};
var TRANSLATION_LANG = {
  NHEB: "en",
  KJV: "en",
  CPDV: "en",
  KR38: "fi"
};
function updateStaticText() {
  const s = t();
  const infoBtn = document.getElementById("info-btn");
  if (infoBtn)
    infoBtn.title = s.helpInfo;
  const settingsBtn = document.getElementById("settings-btn");
  if (settingsBtn)
    settingsBtn.title = s.settings;
  const searchInput = document.getElementById("search-input");
  if (searchInput)
    searchInput.placeholder = s.searchPlaceholder;
  const indexBtn = document.getElementById("index-btn");
  if (indexBtn)
    indexBtn.title = s.browseBooks;
  const settingsTitle = document.querySelector("#settings-modal-body h2");
  if (settingsTitle)
    settingsTitle.textContent = s.settingsTitle;
  const transLabel = document.getElementById("settings-translation-label");
  if (transLabel)
    transLabel.textContent = s.translationLabel;
  const langLabel = document.getElementById("settings-language-label");
  if (langLabel)
    langLabel.textContent = s.languageLabel;
  const themeLabel = document.getElementById("settings-theme-label");
  if (themeLabel)
    themeLabel.textContent = s.themeLabel;
  const parallelLabel = document.getElementById("settings-parallel-label");
  if (parallelLabel)
    parallelLabel.textContent = s.parallelLabel;
  const fontSizeLabel = document.getElementById("settings-fontsize-label");
  if (fontSizeLabel)
    fontSizeLabel.textContent = s.fontSizeLabel;
  const fsSelect = document.getElementById("fontsize-select");
  if (fsSelect) {
    const opts = [s.fontSizeSmall, s.fontSizeMedium, s.fontSizeLarge, s.fontSizeXL, s.fontSizeXXL];
    for (let i = 0;i < fsSelect.options.length; i++) {
      if (i < opts.length)
        fsSelect.options[i].textContent = opts[i];
    }
  }
  const infoBody = document.getElementById("info-modal-body");
  if (infoBody) {
    infoBody.innerHTML = `
      <h2>${s.infoTitle}</h2>
      <section><h3>${s.infoSearchTitle}</h3><p>${s.infoSearchIntro}</p><ul>${s.infoSearchItems.map((i) => `<li>${i}</li>`).join("")}</ul><p>${s.infoSearchNote}</p></section>
      <section><h3>${s.infoBrowseTitle}</h3><p>${s.infoBrowseText}</p></section>
      <section><h3>${s.infoShortcutsTitle}</h3><ul>${s.infoShortcuts.map((i) => `<li>${i}</li>`).join("")}</ul></section>
      <section><h3>${s.infoSettingsTitle}</h3><p>${s.infoSettingsText}</p></section>
      <section><h3>${s.infoFeaturesTitle}</h3><ul>${s.infoFeaturesItems.map((i) => `<li>${i}</li>`).join("")}</ul></section>
      <section><h3>${s.infoDataTitle}</h3><p>${s.infoDataText}</p></section>`;
  }
  const footer = document.getElementById("footer");
  if (footer) {
    footer.innerHTML = `<p>${s.footerLine1}</p><p>${s.footerDescriptions}</p><p>${s.footerStyleguide}</p><p>${s.footerFavicon}</p>`;
  }
  document.documentElement.lang = getLanguage() === "fi" ? "fi" : "en";
}
function updateFooter() {
  const info = TRANSLATION_NAMES[currentTranslation];
  const name = info ? info.name : currentTranslation;
  for (const el of document.querySelectorAll(".nav-translation")) {
    el.textContent = currentTranslation;
    el.title = `${currentTranslation} — ${name}`;
  }
  for (const el of document.querySelectorAll(".parallel-translation-label")) {
    const code = el.textContent?.trim() || "";
    const ti = TRANSLATION_NAMES[code];
    if (ti)
      el.title = `${code} — ${ti.name}`;
  }
}
init();
