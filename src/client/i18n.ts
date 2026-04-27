interface Strings {
	// Header
	helpInfo: string;
	settings: string;
	searchPlaceholder: string;
	browseBooks: string;

	// Content
	notFound: string;
	readFullChapter: string;
	readFullBook: string;
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
	idxBooksLabel: string;
	idxChaptersLabel: string;
	idxVersesLabel: string;
	idxBrowseLabel: string;

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

	// Parables
	parablesTitle: string;
	parablesFilterPlaceholder: string;
	parablesEmpty: string;

	// Theophanies
	theophaniesTitle: string;
	theophaniesFilterPlaceholder: string;
	theophaniesEmpty: string;

	// Typology
	typologyTitle: string;
	typologyFilterPlaceholder: string;
	typologyEmpty: string;
	typologyCatPersons: string;
	typologyCatEvents: string;
	typologyCatTheotokos: string;
	typologyCatChurch: string;
	typologyCatCross: string;
	typologyCatAdditional: string;

	// Bookmarks
	bookmarksTitle: string;
	bookmarkThis: string;
	removeBookmark: string;
	bookmarksEmpty: string;
	bookmarkAdded: string;
	bookmarkRemoved: string;

	// Notes
	notesTitle: string;
	addNote: string;
	editNote: string;
	noteSaved: string;
	noteDeleted: string;
	notesEmpty: string;
	notePlaceholder: string;
	noteDeleteConfirm: string;
	noteSave: string;
	noteRemove: string;
	cancel: string;
	invalidRef: (term: string) => string;

	// Font setting
	fontLabel: string;
	fontDefault: string;
	fontDyslexic: string;

	// Data export / import
	dataLabel: string;
	exportData: string;
	importData: string;
	exportSuccess: string;
	importSuccess: string;
	importError: string;

	// QR code
	qrCode: string;
	qrClose: string;
}

const EN: Strings = {
	helpInfo: "Help & info",
	settings: "Settings",
	searchPlaceholder: "Search the Bible",
	browseBooks: "Browse books",

	notFound: "Not found.",
	readFullChapter: "Read the full chapter",
	readFullBook: "Read the full book",
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
	fontSizeSmall: "S",
	fontSizeMedium: "M",
	fontSizeLarge: "L",
	fontSizeXL: "XL",
	fontSizeXXL: "XXL",

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
		"<kbd>Ctrl+B</kbd> &mdash; Toggle side panel",
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
		"<strong>Bookmarks</strong> &mdash; Click the bookmark icon on a section heading to bookmark the current passage, or right-click a verse number to bookmark that specific verse. Bookmarks are saved across sessions and listed in the Bookmarks tab of the side panel.",
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
	idxBooksLabel: "Books",
	idxChaptersLabel: "Chapters",
	idxVersesLabel: "Verses",
	idxBrowseLabel: "Browse",

	footerLine1: "All available Bible translations are in the public domain.",
	footerDescriptions:
		'Book and chapter descriptions are sourced from the <a href="https://www.sacredbible.org/catholic/index.htm" target="_blank" rel="noopener noreferrer">Catholic Public Domain Version</a>.',
	footerStyleguide:
		'Paragraph and poetry formatting is based on the <a href="https://worldenglish.bible" target="_blank" rel="noopener noreferrer">World English Bible</a> translation.',
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
	parablesTitle: "Parables of Jesus",
	parablesFilterPlaceholder: "Filter parables…",
	parablesEmpty: "No parables match your filter.",
	theophaniesTitle: "Theophanies",
	theophaniesFilterPlaceholder: "Filter theophanies\u2026",
	theophaniesEmpty: "No theophanies match your filter.",
	typologyTitle: "Typology",
	typologyFilterPlaceholder: "Filter typology\u2026",
	typologyEmpty: "No typology entries match your filter.",
	typologyCatPersons: "Types of Christ (Persons)",
	typologyCatEvents: "Types of Christ (Events)",
	typologyCatTheotokos: "Types of the Theotokos",
	typologyCatChurch: "Types of the Church & Sacraments",
	typologyCatCross: "Types of the Cross",
	typologyCatAdditional: "Additional Types",
	bookmarksTitle: "Bookmarks",
	bookmarkThis: "Bookmark",
	removeBookmark: "Remove bookmark",
	bookmarksEmpty: "No bookmarks yet.",
	bookmarkAdded: "Bookmarked!",
	bookmarkRemoved: "Bookmark removed",

	notesTitle: "Notes",
	addNote: "Add note",
	editNote: "Edit note",
	noteSaved: "Note saved",
	noteDeleted: "Note deleted",
	notesEmpty: "No notes yet.",
	notePlaceholder: "Write a note about this verse\u2026",
	noteDeleteConfirm: "Delete note",
	noteSave: "Save",
	noteRemove: "Remove",
	cancel: "Cancel",
	invalidRef: (term) => `Invalid reference: “${term}”`,
	fontLabel: "Font",
	fontDefault: "Default",
	fontDyslexic: "OpenDyslexic",

	dataLabel: "Data",
	exportData: "Export",
	importData: "Import",
	exportSuccess: "Data exported!",
	importSuccess: "Data imported!",
	importError: "Invalid file. Could not import data.",

	qrCode: "QR code",
	qrClose: "Close",
};

const FI: Strings = {
	helpInfo: "Ohje ja tiedot",
	settings: "Asetukset",
	searchPlaceholder: "Hae Raamatusta",
	browseBooks: "Selaa kirjoja",

	notFound: "Ei löytynyt.",
	readFullChapter: "Lue koko luku",
	readFullBook: "Lue koko kirja",
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
	fontSizeSmall: "S",
	fontSizeMedium: "M",
	fontSizeLarge: "L",
	fontSizeXL: "XL",
	fontSizeXXL: "XXL",

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
		"<kbd>Ctrl+B</kbd> &mdash; Avaa/sulje sivupaneeli",
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
		"<strong>Kirjanmerkit</strong> &mdash; Napsauta kirjanmerkki-kuvaketta otsikon vieressä lisätäksesi nykyisen kohdan kirjanmerkkeihin, tai napsauta hiiren oikealla jaenumeroa lisätäksesi kirjanmerkin yksittäiselle jakeelle. Kirjanmerkit tallennetaan ja löytyvät sivupaneelin Kirjanmerkit-välilehdeltä.",
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
	idxBooksLabel: "Kirjat",
	idxChaptersLabel: "Luvut",
	idxVersesLabel: "Jakeet",
	idxBrowseLabel: "Selaa",

	footerLine1:
		"Kaikki tällä sivulla käytetyt raamatunkäännökset ovat vapaasti yleiseen käyttöön soveltuvia.",
	footerDescriptions:
		'Kirjojen ja lukujen kuvaukset ovat peräisin <a href="https://www.sacredbible.org/catholic/index.htm" target="_blank" rel="noopener noreferrer">Catholic Public Domain Version</a> -käännöksestä.',
	footerStyleguide:
		'Kappalejako ja runomuotoilu perustuvat <a href="https://worldenglish.bible" target="_blank" rel="noopener noreferrer">World English Bible</a> -käännökseen.',
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
	parablesTitle: "Jeesuksen vertaukset",
	parablesFilterPlaceholder: "Suodata vertauksia…",
	parablesEmpty: "Ei vertauksia hakusanalla.",
	theophaniesTitle: "Teofa\u006Eiat",
	theophaniesFilterPlaceholder: "Suodata teofanioita\u2026",
	theophaniesEmpty: "Ei teofanioita hakusanalla.",
	typologyTitle: "Typologia",
	typologyFilterPlaceholder: "Suodata typologiaa\u2026",
	typologyEmpty: "Ei typologiaa hakusanalla.",
	typologyCatPersons: "Kristuksen tyypit (henkil\u00f6t)",
	typologyCatEvents: "Kristuksen tyypit (tapahtumat)",
	typologyCatTheotokos: "Jumalansynnytt\u00e4j\u00e4n tyypit",
	typologyCatChurch: "Kirkon ja sakramenttien tyypit",
	typologyCatCross: "Ristin tyypit",
	typologyCatAdditional: "Muita tyyppej\u00e4",
	bookmarksTitle: "Kirjanmerkit",
	bookmarkThis: "Lisää kirjanmerkki",
	removeBookmark: "Poista kirjanmerkki",
	bookmarksEmpty: "Ei kirjanmerkkejä.",
	bookmarkAdded: "Kirjanmerkki lisätty!",
	bookmarkRemoved: "Kirjanmerkki poistettu",

	notesTitle: "Muistiinpanot",
	addNote: "Lisää muistiinpano",
	editNote: "Muokkaa muistiinpanoa",
	noteSaved: "Muistiinpano tallennettu",
	noteDeleted: "Muistiinpano poistettu",
	notesEmpty: "Ei muistiinpanoja.",
	notePlaceholder: "Kirjoita muistiinpano t\u00e4st\u00e4 jakeesta\u2026",
	noteDeleteConfirm: "Poista muistiinpano",
	noteSave: "Tallenna",
	noteRemove: "Poista",
	cancel: "Peruuta",
	invalidRef: (term) => `Virheellinen viite: “${term}”`,
	fontLabel: "Fontti",
	fontDefault: "Oletus",
	fontDyslexic: "OpenDyslexic",

	dataLabel: "Tiedot",
	exportData: "Vie",
	importData: "Tuo",
	exportSuccess: "Tiedot viety!",
	importSuccess: "Tiedot tuotu!",
	importError: "Virheellinen tiedosto. Tietojen tuominen epäonnistui.",

	qrCode: "QR-koodi",
	qrClose: "Sulje",
};

const SV: Strings = {
	helpInfo: "Hjälp & info",
	settings: "Inställningar",
	searchPlaceholder: "Sök i Bibeln",
	browseBooks: "Bläddra bland böcker",

	notFound: "Hittades inte.",
	readFullChapter: "Läs hela kapitlet",
	readFullBook: "Läs hela boken",
	loadingBible: "Laddar Bibeln\u2026",
	loadingTranslation: (code) => `Laddar ${code}\u2026`,
	loadFailed: "Misslyckades med att ladda Bibeldata. Uppdatera sidan.",
	loadTranslationFailed: (code) => `Misslyckades med att ladda ${code}. Försök igen.`,
	chapter: "Kapitel",
	noResults: (q) => `Inga resultat för \u201c${q}\u201d`,
	resultCount: (n) => `${n} resultat`,

	settingsTitle: "Inställningar",
	translationLabel: "Bibelöversättning",
	languageLabel: "Applikationsspråk",
	themeLabel: "Tema",
	themeLight: "Ljust",
	themeDark: "Mörkt",
	themeSystem: "System",
	parallelLabel: "Parallell översättning",
	parallelNone: "Ingen",
	fontSizeLabel: "Teckenstorlek",
	fontSizeSmall: "S",
	fontSizeMedium: "M",
	fontSizeLarge: "L",
	fontSizeXL: "XL",
	fontSizeXXL: "XXL",

	infoTitle: "Sanatheos",
	infoSearchTitle: "Sökfält",
	infoSearchIntro: "Skriv i sökfältet för att hitta verser. Sökformat som stöds:",
	infoSearchItems: [
		"<strong>Bokreferens</strong> &mdash; <code>Johannes</code>, <code>1 Mos</code>",
		"<strong>Kapitel</strong> &mdash; <code>Joh 3</code>, <code>1 Mos 1</code>",
		"<strong>Kapitelintervall</strong> &mdash; <code>1 Mos 1-3</code>",
		"<strong>Vers</strong> &mdash; <code>Joh 3:16</code>",
		"<strong>Versintervall</strong> &mdash; <code>1 Mos 1:1-5</code>",
		"<strong>Flera verser</strong> &mdash; <code>1 Mos 1:1-3,5,8-10</code>",
		'<strong>Textsökning</strong> &mdash; <code>"nåd"</code> (inom citattecken). Använd <code>"^nåd"</code> (börjar med), <code>"nåd$"</code> (slutar med), <code>"^nåd$"</code> (exakt ord) för ordgränser.',
		'<strong>Kombinerad</strong> &mdash; <code>Rom "tro"</code>, <code>1 Mos 1-3 "ljus"</code>',
		"<strong>Flera sökningar</strong> &mdash; separera med <code>;</code>, t.ex. <code>Joh 3:16; Upp 1:1</code>",
	],
	infoSearchNote:
		'Att trycka på <kbd>"</kbd> lägger automatiskt till ett avslutande citattecken. Förkortningar som <code>1 mos</code>, <code>upp</code>, <code>ef</code> stöds.',
	infoBrowseTitle: "Bläddra bland böcker",
	infoBrowseText:
		"Klicka på förstoringsglaset inuti sökfältet (eller tryck <kbd>Ctrl+I</kbd>) för att öppna bokindexpanelen. Bläddra bland böcker, kapitel och verser i tre kolumner. Använd piltangenterna och Enter för att navigera och välja.",
	infoShortcutsTitle: "Kortkommandon",
	infoShortcuts: [
		"<kbd>Ctrl+K</kbd> &mdash; Fokusera sökfältet",
		"<kbd>Ctrl+B</kbd> &mdash; Visa/dölj sidopanelen",
		"<kbd>Ctrl+I</kbd> &mdash; Visa/dölj bokindexpanelen",
		"<kbd>Escape</kbd> &mdash; Stäng öppna paneler",
		"<kbd>&uarr;</kbd> <kbd>&darr;</kbd> &mdash; Navigera i indexet",
		"<kbd>&larr;</kbd> <kbd>&rarr;</kbd> / <kbd>Tab</kbd> &mdash; Byt kolumn i indexet",
		"<kbd>Enter</kbd> &mdash; Välj objekt i indexet",
	],
	infoSettingsTitle: "Inställningar",
	infoSettingsText:
		"Klicka på <strong>&#9881;</strong>-kugghjulsknappen för att öppna inställningarna. Du kan byta Bibelöversättning (t.ex. NHEB, SV17), välja en <strong>parallell översättning</strong> (sida vid sida), ange <strong>tema</strong> (Ljust, Mörkt eller System) och ändra applikationsspråk. Alla val sparas.",
	infoFeaturesTitle: "Funktioner",
	infoFeaturesItems: [
		"<strong>Markeringar</strong> &mdash; Högerklicka på ett versnummer och välj en markeringsfärg (gul, grön, blå, rosa, orange). Välj &ldquo;Ta bort markering&rdquo; för att rensa den.",
		"<strong>Bokmärken</strong> &mdash; Klicka på bokmärkesikonen vid en avsnittsrubrik för att bokmärka det aktuella stycket, eller högerklicka på ett versnummer för att bokmärka den specifika versen. Bokmärken sparas och listas i sidopanelens Bokmärken-flik.",
		"<strong>Kopiera</strong> &mdash; Klicka på <strong>&#128203;</strong>-knappen vid en avsnittsrubrik för att kopiera de visade verserna. I parallellläge inkluderas båda översättningarna.",
		"<strong>Beskrivningar</strong> &mdash; När du läser ett helt kapitel eller en bok visas en kort beskrivning under titeln.",
		"<strong>Svepnavigation</strong> &mdash; På pekskärmar sveper du vänster eller höger för att bläddra mellan kapitel.",
		"<strong>Skriv ut</strong> &mdash; Använd <kbd>Ctrl+P</kbd> för en ren utskriftslayout.",
		"<strong>Installera som app</strong> &mdash; Sanatheos är en progressiv webbapp (PWA). Använd webbläsarens \u201cInstallera\u201d eller \u201cLägg till på startskärmen\u201d för att installera den för snabb offline-åtkomst.",
		'<strong>Ordbok</strong> &mdash; Bläddra och sök i Strongs konkordans (hebreiska och grekiska) på <a href="./dictionary.html">Ordbok</a>-sidan.',
	],
	infoDataTitle: "Data & lagring",
	infoDataText:
		"Bibeltexten hämtas en gång från servern och cachelagras lokalt i din webbläsare med <strong>IndexedDB</strong> för snabb offline-åtkomst. Inga data skickas till tredje part. Allt körs i din webbläsare.",

	oldTestament: "Gamla testamentet",
	newTestament: "Nya testamentet",
	deuterocanonical: "Deuterokanoniska böcker",
	idxBooksLabel: "Böcker",
	idxChaptersLabel: "Kapitel",
	idxVersesLabel: "Verser",
	idxBrowseLabel: "Bläddra",

	footerLine1: "Alla tillgängliga Bibelöversättningar är i det allmänna domänet.",
	footerDescriptions:
		'Bok- och kapitelbeskrivningar är hämtade från <a href="https://www.sacredbible.org/catholic/index.htm" target="_blank" rel="noopener noreferrer">Catholic Public Domain Version</a>.',
	footerStyleguide:
		'Stycke- och poesiformatering är baserad på <a href="https://worldenglish.bible" target="_blank" rel="noopener noreferrer">World English Bible</a>-översättningen.',
	footerDictionary:
		'Bläddra i <a href="./dictionary.html">Strongs konkordansordbok</a> för definitioner på hebreiska och grekiska ord.',
	footerFavicon:
		'Applikationsikon: &ldquo;<a href="https://commons.wikimedia.org/wiki/File:Jesus-Christ-from-Hagia-Sophia.jpg" target="_blank" rel="noopener noreferrer">Jesus Christ from Hagia Sophia</a>&rdquo; av Edal Anton Lefterov, <a href="https://creativecommons.org/licenses/by-sa/3.0?ref=openverse" target="_blank" rel="noopener noreferrer">CC BY-SA 3.0</a>',

	copied: "Kopierat!",
	copyVerse: "Kopiera",
	copyBoth: "Kopiera båda",
	shareWith: "Dela länk med",
	shareWithout: "Dela länk",
	linkCopied: "Länk kopierad!",
	highlight: "Markera",
	removeHighlight: "Ta bort markering",
	showMore: "Visa mer",

	interlinear: "Interlineär",
	interlinearTooltip: "Visa original hebreiska/grekiska med Strongs nummer",
	strongsDef: "Strongs definition",
	pronunciation: "Uttal",
	partOfSpeech: "Ordklass",
	morphology: "Morfologi",
	crossReferences: "Hänvisningar",
	closePanel: "Stäng",

	storiesTitle: "Bibelberättelser",
	storiesFilterPlaceholder: "Filtrera berättelser\u2026",
	storiesEmpty: "Inga berättelser matchar filtret.",
	parablesTitle: "Jesu liknelser",
	parablesFilterPlaceholder: "Filtrera liknelser\u2026",
	parablesEmpty: "Inga liknelser matchar filtret.",
	theophaniesTitle: "Teofa\u006Eier",
	theophaniesFilterPlaceholder: "Filtrera teofa\u006Eier\u2026",
	theophaniesEmpty: "Inga teofa\u006Eier matchar filtret.",
	typologyTitle: "Typologi",
	typologyFilterPlaceholder: "Filtrera typologi\u2026",
	typologyEmpty: "Inga typologiposter matchar filtret.",
	typologyCatPersons: "Typer av Kristus (personer)",
	typologyCatEvents: "Typer av Kristus (händelser)",
	typologyCatTheotokos: "Typer av Gudaföderska",
	typologyCatChurch: "Typer av kyrkan och sakramenten",
	typologyCatCross: "Typer av korset",
	typologyCatAdditional: "Ytterligare typer",

	bookmarksTitle: "Bokmärken",
	bookmarkThis: "Lägg till bokmärke",
	removeBookmark: "Ta bort bokmärke",
	bookmarksEmpty: "Inga bokmärken än.",
	bookmarkAdded: "Bokmärkt!",
	bookmarkRemoved: "Bokmärke borttaget",

	notesTitle: "Anteckningar",
	addNote: "Lägg till anteckning",
	editNote: "Redigera anteckning",
	noteSaved: "Anteckning sparad",
	noteDeleted: "Anteckning borttagen",
	notesEmpty: "Inga anteckningar än.",
	notePlaceholder: "Skriv en anteckning om denna vers\u2026",
	noteDeleteConfirm: "Ta bort anteckning",
	noteSave: "Spara",
	noteRemove: "Ta bort",
	cancel: "Avbryt",
	invalidRef: (term) => `Ogiltig referens: "${term}"`,

	fontLabel: "Teckensnitt",
	fontDefault: "Standard",
	fontDyslexic: "OpenDyslexic",

	dataLabel: "Data",
	exportData: "Exportera",
	importData: "Importera",
	exportSuccess: "Data exporterad!",
	importSuccess: "Data importerad!",
	importError: "Ogiltig fil. Kunde inte importera data.",

	qrCode: "QR-kod",
	qrClose: "Stäng",
};

const LANGUAGES: Record<string, Strings> = { en: EN, fi: FI, sv: SV };

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
