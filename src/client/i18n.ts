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
	themeLabel: string;
	themeLight: string;
	themeDark: string;
	themeSystem: string;
	parallelLabel: string;
	parallelNone: string;
	fontSizeLabel: string;
	fontSizeSmall: string;
	fontSizeMedium: string;
	fontSizeLarge: string;
	fontSizeXL: string;
	fontSizeXXL: string;

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
	infoFeaturesTitle: string;
	infoFeaturesItems: string[];
	infoDataTitle: string;
	infoDataText: string;

	// Index panel
	oldTestament: string;
	newTestament: string;
	deuterocanonical: string;

	// Footer
	footerLine1: string;
	footerDescriptions: string;
	footerStyleguide: string;
	footerDictionary: string;
	footerFavicon: string;

	// New features
	copied: string;
	copyVerse: string;
	copyBoth: string;
	shareWith: string;
	shareWithout: string;
	linkCopied: string;
	highlight: string;
	removeHighlight: string;
	showMore: string;

	// Interlinear
	interlinear: string;
	interlinearTooltip: string;
	strongsDef: string;
	pronunciation: string;
	partOfSpeech: string;
	morphology: string;
	crossReferences: string;
	closePanel: string;

	// Stories
	storiesTitle: string;
	storiesFilterPlaceholder: string;
	storiesEmpty: string;
}

const EN: Strings = {
	helpInfo: "Help & info",
	settings: "Settings",
	searchPlaceholder: "Search the Bible",
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
		"<strong>Multiple terms</strong> &mdash; separate with <code>;</code> e.g. <code>John 3:16; Rev 1:1</code>",
	],
	infoSearchNote:
		'Typing <kbd>"</kbd> auto-inserts a closing quote. Abbreviations like <code>gen</code>, <code>rev</code>, <code>eph</code> are supported.',
	infoBrowseTitle: "Browse Books",
	infoBrowseText:
		"Click the magnifier icon inside the search input (or press <kbd>Ctrl+I</kbd>) to open the book index panel. Browse books, chapters, and verses in three columns. Use arrow keys to navigate and Enter to select.",
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
	infoSettingsText:
		"Click the <strong>&#9881;</strong> gear button to open settings. You can switch between Bible translations (e.g. NHEB, KR38), choose a <strong>parallel translation</strong> (side-by-side view), set the <strong>theme</strong> (Light, Dark, or System), and change the application language. All selections are saved across sessions.",
	infoFeaturesTitle: "Features",
	infoFeaturesItems: [
		"<strong>Highlights</strong> &mdash; Right-click a verse number and choose a highlight color (yellow, green, blue, pink, orange). Choose &ldquo;Remove highlight&rdquo; to clear it.",
		"<strong>Copy</strong> &mdash; Click the <strong>&#128203;</strong> button on a section heading to copy displayed verses. In parallel mode, both translations are included.",
		"<strong>Descriptions</strong> &mdash; When reading a full chapter or book, a short description is shown below the title summarizing the content.",
		"<strong>Swipe navigation</strong> &mdash; On touch devices, swipe left or right to move between chapters.",
		"<strong>Print</strong> &mdash; Use <kbd>Ctrl+P</kbd> for a clean, print-optimized layout.",
		"<strong>Install as app</strong> &mdash; Sanatheos is a Progressive Web App. Use your browser\u2019s \u201cInstall\u201d or \u201cAdd to Home Screen\u201d option to install it for quick, offline access.",
		'<strong>Dictionary</strong> &mdash; Browse and search the full Strong\u2019s Concordance (Hebrew &amp; Greek) in the <a href="./dictionary.html">Dictionary</a> page.',
	],
	infoDataTitle: "Data & Storage",
	infoDataText:
		"Bible text is fetched once from the server and cached locally in your browser using <strong>IndexedDB</strong> for fast offline access. No data is sent to any third party. Everything runs in your browser.",

	oldTestament: "Old Testament",
	newTestament: "New Testament",
	deuterocanonical: "Deuterocanonical",

	footerLine1: "All available Bible translations are in the public domain.",
	footerDescriptions:
		'Book and chapter descriptions are sourced from the <a href="https://www.sacredbible.org/catholic/index.htm" target="_blank" rel="noopener noreferrer">Catholic Public Domain Version</a> (CPDV).',
	footerStyleguide:
		'Paragraph and poetry formatting is based on the <a href="https://worldenglish.bible" target="_blank" rel="noopener noreferrer">World English Bible</a> (WEB) translation.',
	footerDictionary:
		'Browse the <a href="./dictionary.html">Strong\u2019s Concordance Dictionary</a> for Hebrew and Greek word definitions.',
	footerFavicon:
		'Application icon: &ldquo;<a href="https://commons.wikimedia.org/wiki/File:Jesus-Christ-from-Hagia-Sophia.jpg" target="_blank" rel="noopener noreferrer">Jesus Christ from Hagia Sophia</a>&rdquo; by Edal Anton Lefterov, <a href="https://creativecommons.org/licenses/by-sa/3.0?ref=openverse" target="_blank" rel="noopener noreferrer">CC BY-SA 3.0</a>',

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
	interlinearTooltip: "Show original Hebrew/Greek with Strong\u2019s numbers",
	strongsDef: "Strong\u2019s Definition",
	pronunciation: "Pronunciation",
	partOfSpeech: "Part of speech",
	morphology: "Morphology",
	crossReferences: "References",
	closePanel: "Close",

	storiesTitle: "Bible Stories",
	storiesFilterPlaceholder: "Filter stories\u2026",
	storiesEmpty: "No stories match your filter.",
};

const FI: Strings = {
	helpInfo: "Ohje ja tiedot",
	settings: "Asetukset",
	searchPlaceholder: "Hae Raamatusta",
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
		"<strong>Useita hakuja</strong> &mdash; erota <code>;</code>-merkillä, esim. <code>Joh 3:16; Ilm 1:1</code>",
	],
	infoSearchNote:
		'<kbd>"</kbd>-näppäin lisää automaattisesti sulkevan lainausmerkin. Lyhenteet kuten <code>1 moos</code>, <code>ilm</code>, <code>ef</code> toimivat.',
	infoBrowseTitle: "Selaa kirjoja",
	infoBrowseText:
		"Napsauta hakukentän sisällä olevaa suurennuslasikuvaketta (tai paina <kbd>Ctrl+I</kbd>) avataksesi kirjaluettelon. Selaa kirjoja, lukuja ja jakeita kolmessa sarakkeessa. Käytä nuolinäppäimiä ja Enter-näppäintä.",
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
	infoSettingsText:
		"Napsauta <strong>&#9881;</strong>-rataspainiketta avataksesi asetukset. Voit vaihtaa raamatunkäännöstä (esim. NHEB, KR38), valita <strong>rinnakkaiskäännöksen</strong> (vierekkäin-näkymä), asettaa <strong>teeman</strong> (Vaalea, Tumma tai Järjestelmä) ja vaihtaa sovelluksen kielen. Valinnat tallennetaan.",
	infoFeaturesTitle: "Ominaisuudet",
	infoFeaturesItems: [
		"<strong>Korostus</strong> &mdash; Napsauta hiiren oikealla jaenumeroa ja valitse korostusväri (keltainen, vihreä, sininen, pinkki, oranssi). Valitse &ldquo;Poista korostus&rdquo; poistaaksesi sen.",
		"<strong>Kopioi</strong> &mdash; Napsauta <strong>&#128203;</strong>-painiketta otsikon vieressä kopioidaksesi näytetyt jakeet. Rinnakkaisnäkymässä molemmat käännökset kopioidaan.",
		"<strong>Kuvaukset</strong> &mdash; Lukiessasi kokonaista lukua tai kirjaa otsikon alla näkyy lyhyt kuvaus sisällöstä.",
		"<strong>Pyyhkäisynavigaatio</strong> &mdash; Kosketuslaitteilla pyyhkäise vasemmalle tai oikealle siirtyäksesi lukujen välillä.",
		"<strong>Tulostus</strong> &mdash; Käytä <kbd>Ctrl+P</kbd> saadaksesi siistin tulostusnäkymän.",
		"<strong>Asenna sovelluksena</strong> &mdash; Sanatheos on progressiivinen verkkosovellus (PWA). Käytä selaimesi \u201cAsenna\u201d- tai \u201cLisää aloitusnäytölle\u201d-toimintoa asentaaksesi sen nopeaa offline-käyttöä varten.",
		'<strong>Sanakirja</strong> &mdash; Selaa ja etsi koko Strongin konkordanssia (heprea ja kreikka) <a href="./dictionary.html">Sanakirja</a>-sivulta.',
	],
	infoDataTitle: "Tiedot ja tallennus",
	infoDataText:
		"Raamatun teksti haetaan palvelimelta kerran ja tallennetaan selaimeesi <strong>IndexedDB</strong>-tietokantaan nopeaa offline-käyttöä varten. Tietoja ei lähetetä kolmansille osapuolille. Kaikki toimii selaimessasi.",

	oldTestament: "Vanha testamentti",
	newTestament: "Uusi testamentti",
	deuterocanonical: "Deuterokanoniset kirjat",

	footerLine1:
		"Kaikki tällä sivulla käytetyt raamatunkäännökset ovat vapaasti yleiseen käyttöön soveltuvia.",
	footerDescriptions:
		'Kirjojen ja lukujen kuvaukset ovat peräisin <a href="https://www.sacredbible.org/catholic/index.htm" target="_blank" rel="noopener noreferrer">Catholic Public Domain Version</a> -käännöksestä (CPDV).',
	footerStyleguide:
		'Kappalejako ja runomuotoilu perustuvat <a href="https://worldenglish.bible" target="_blank" rel="noopener noreferrer">World English Bible</a> (WEB) -käännökseen.',
	footerDictionary:
		'Selaa <a href="./dictionary.html">Strongin konkordanssisanakirjaa</a> heprean ja kreikan sananmääritelmille.',
	footerFavicon:
		'Sivustokuvake: &ldquo;<a href="https://commons.wikimedia.org/wiki/File:Jesus-Christ-from-Hagia-Sophia.jpg" target="_blank" rel="noopener noreferrer">Jesus Christ from Hagia Sophia</a>&rdquo;, Edal Anton Lefterov, <a href="https://creativecommons.org/licenses/by-sa/3.0?ref=openverse" target="_blank" rel="noopener noreferrer">CC BY-SA 3.0</a>',

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
	closePanel: "Sulje",

	storiesTitle: "Raamatun kertomukset",
	storiesFilterPlaceholder: "Suodata kertomuksia\u2026",
	storiesEmpty: "Ei kertomuksia hakusanalla.",
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
