interface Strings {
  // Header
  helpInfo: string;
  settings: string;
  searchPlaceholder: string;
  browseBooks: string;

  // Content
  notFound: string;
  readFullChapter: string;
  loadingBible: string;
  loadingTranslation: (code: string) => string;
  loadFailed: string;
  loadTranslationFailed: (code: string) => string;
  chapter: string;
  noResults: (query: string) => string;
  resultCount: (n: number) => string;

  // Settings modal
  settingsTitle: string;
  translationLabel: string;
  languageLabel: string;

  // Info modal
  infoTitle: string;
  infoSearchTitle: string;
  infoSearchIntro: string;
  infoSearchItems: string[];
  infoSearchNote: string;
  infoBrowseTitle: string;
  infoBrowseText: string;
  infoShortcutsTitle: string;
  infoShortcuts: string[];
  infoSettingsTitle: string;
  infoSettingsText: string;
  infoDataTitle: string;
  infoDataText: string;

  // Footer
  footerLine1: string;
  footerFavicon: string;
}

const EN: Strings = {
  helpInfo: "Help & info",
  settings: "Settings",
  searchPlaceholder: 'Search: John 3:16; Gen 1-3 "grace", Romans "faith"',
  browseBooks: "Browse books",

  notFound: "Not found.",
  readFullChapter: "Read the full chapter",
  loadingBible: "Loading Bible\u2026",
  loadingTranslation: (code) => `Loading ${code}\u2026`,
  loadFailed: "Failed to load Bible data. Please refresh the page.",
  loadTranslationFailed: (code) => `Failed to load ${code}. Please try again.`,
  chapter: "Chapter",
  noResults: (q) => `No results for \u201c${q}\u201d`,
  resultCount: (n) => `${n} result${n !== 1 ? "s" : ""}`,

  settingsTitle: "Settings",
  translationLabel: "Bible translation",
  languageLabel: "Application language",

  infoTitle: "Bible Reader",
  infoSearchTitle: "Search Input",
  infoSearchIntro: "Type in the search bar to find verses. Supported query formats:",
  infoSearchItems: [
    "<strong>Book reference</strong> &mdash; <code>John</code>, <code>Genesis</code>",
    "<strong>Chapter</strong> &mdash; <code>John 3</code>, <code>Gen 1</code>",
    "<strong>Chapter range</strong> &mdash; <code>Genesis 1-3</code>",
    "<strong>Verse</strong> &mdash; <code>John 3:16</code>",
    "<strong>Verse range</strong> &mdash; <code>Genesis 1:1-5</code>",
    "<strong>Multiple verses</strong> &mdash; <code>Genesis 1:1-3,5,8-10</code>",
    "<strong>Text search</strong> &mdash; <code>\"grace\"</code> (wrap in double quotes)",
    "<strong>Word boundary</strong> &mdash; <code>^grace</code> (starts with), <code>grace$</code> (ends with), <code>^grace$</code> (exact word) &mdash; quotes optional",
    "<strong>Combined</strong> &mdash; <code>Romans \"faith\"</code>, <code>Gen 1-3 \"light\"</code>",
    "<strong>Multiple terms</strong> &mdash; separate with <code>;</code> e.g. <code>John 3:16; Rev 1:1</code>",
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
    "<kbd>Enter</kbd> &mdash; Select item in the index panel",
  ],
  infoSettingsTitle: "Settings",
  infoSettingsText: "Click the <strong>&#9881;</strong> gear button to open settings. From there you can switch between Bible translations (e.g. WEB, KR38). Your selection is saved and persisted across sessions.",
  infoDataTitle: "Data & Storage",
  infoDataText: "Bible text is fetched once from the server and cached locally in your browser using <strong>IndexedDB</strong> for fast offline access. No data is sent to any third party. Everything runs in your browser.",

  footerLine1: "All Bible translations are in the public domain",
  footerFavicon: 'Favicon: &ldquo;Jesus Christ from Hagia Sophia&rdquo; by Edal Anton Lefterov, licensed under <a href="https://creativecommons.org/licenses/by-sa/3.0?ref=openverse" target="_blank" rel="noopener noreferrer">CC BY-SA 3.0</a>',
};

const FI: Strings = {
  helpInfo: "Ohje ja tiedot",
  settings: "Asetukset",
  searchPlaceholder: 'Haku: Joh 3:16; 1 Moos 1-3 "armo", Room "usko"',
  browseBooks: "Selaa kirjoja",

  notFound: "Ei löytynyt.",
  readFullChapter: "Lue koko luku",
  loadingBible: "Ladataan Raamattua\u2026",
  loadingTranslation: (code) => `Ladataan ${code}\u2026`,
  loadFailed: "Raamatun lataaminen epäonnistui. Päivitä sivu.",
  loadTranslationFailed: (code) => `Käännöksen ${code} lataaminen epäonnistui. Yritä uudelleen.`,
  chapter: "Luku",
  noResults: (q) => `Ei tuloksia haulle \u201c${q}\u201d`,
  resultCount: (n) => `${n} tulos${n !== 1 ? "ta" : ""}`,

  settingsTitle: "Asetukset",
  translationLabel: "Raamatunkäännös",
  languageLabel: "Sovelluksen kieli",

  infoTitle: "Raamatun lukija",
  infoSearchTitle: "Hakukenttä",
  infoSearchIntro: "Kirjoita hakukenttään löytääksesi jakeita. Tuetut hakumuodot:",
  infoSearchItems: [
    "<strong>Kirjaviite</strong> &mdash; <code>Joh</code>, <code>1 Moos</code>",
    "<strong>Luku</strong> &mdash; <code>Joh 3</code>, <code>1 Moos 1</code>",
    "<strong>Lukualue</strong> &mdash; <code>1 Moos 1-3</code>",
    "<strong>Jae</strong> &mdash; <code>Joh 3:16</code>",
    "<strong>Jaealue</strong> &mdash; <code>1 Moos 1:1-5</code>",
    "<strong>Useita jakeita</strong> &mdash; <code>1 Moos 1:1-3,5,8-10</code>",
    "<strong>Tekstihaku</strong> &mdash; <code>\"armo\"</code> (lainausmerkeissä)",
    "<strong>Sanan raja</strong> &mdash; <code>^armo</code> (alkaa), <code>armo$</code> (päättyy), <code>^armo$</code> (tarkka sana) &mdash; lainausmerkit valinnaisia",
    "<strong>Yhdistetty</strong> &mdash; <code>Room \"usko\"</code>, <code>1 Moos 1-3 \"valo\"</code>",
    "<strong>Useita hakuja</strong> &mdash; erota <code>;</code>-merkillä, esim. <code>Joh 3:16; Ilm 1:1</code>",
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
    "<kbd>Enter</kbd> &mdash; Valitse kohde",
  ],
  infoSettingsTitle: "Asetukset",
  infoSettingsText: "Napsauta <strong>&#9881;</strong>-rataspainiketta avataksesi asetukset. Sieltä voit vaihtaa raamatunkäännöstä (esim. WEB, KR38). Valintasi tallennetaan.",
  infoDataTitle: "Tiedot ja tallennus",
  infoDataText: "Raamatun teksti haetaan palvelimelta kerran ja tallennetaan selaimeesi <strong>IndexedDB</strong>-tietokantaan nopeaa offline-käyttöä varten. Tietoja ei lähetetä kolmansille osapuolille. Kaikki toimii selaimessasi.",

  footerLine1: "Kaikki raamatunkäännökset ovat vapaasti yleiseen käyttöön soveltuvia",
  footerFavicon: 'Sivustokuvake: &ldquo;Jesus Christ from Hagia Sophia&rdquo;, Edal Anton Lefterov, <a href="https://creativecommons.org/licenses/by-sa/3.0?ref=openverse" target="_blank" rel="noopener noreferrer">CC BY-SA 3.0</a>',
};

const LANGUAGES: Record<string, Strings> = { en: EN, fi: FI };

let current: Strings = EN;
let currentLang = "en";

export function setLanguage(lang: string) {
  currentLang = lang;
  current = LANGUAGES[lang] ?? EN;
}

export function getLanguage(): string {
  return currentLang;
}

export function t(): Strings {
  return current;
}
