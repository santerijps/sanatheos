import type {
	BibleData,
	AppState,
	HighlightColor,
	DescriptionData,
	InterlinearBook,
	StrongsDict,
	Bookmark,
	StoryEntry,
	ParableEntry,
	TheophaniesEntry,
	TypologyEntry,
	VerseNote,
} from "./types.ts";
import {
	loadBible,
	saveBible,
	getHighlightMap,
	setHighlight,
	removeHighlight,
	loadInterlinearBook,
	saveInterlinearBook,
	loadStrongsDict,
	saveStrongsDict,
	getBookmarks,
	addBookmark,
	removeBookmark,
	hasBookmark,
	loadStories,
	saveStories,
	loadParables,
	saveParables,
	loadTheophanies,
	saveTheophanies,
	loadTypology,
	saveTypology,
	getNotes,
	saveNote,
	deleteNote,
	getNoteMap,
	exportUserData,
	importUserData,
} from "./db.ts";
import {
	initSearch,
	search,
	tryParseNav,
	tryParseNavGroups,
	parseNavTerms,
	parseQueryBooks,
	setSearchInterlinearData,
} from "./search.ts";
import type { NavRef } from "./search.ts";
import { readState, pushState, replaceState, stateToInputText } from "./state.ts";
import {
	renderChapter,
	renderChapterRange,
	renderBook,
	renderVerse,
	renderVerseSegments,
	renderMultiNav,
	renderResults,
	renderIndex,
	navRefLabel,
	setHighlightMap,
	setDescriptions,
	setSecondaryDescriptions,
	setStyleguide,
	setSubheadings,
	setSecondarySubheadings,
	renderParallelChapter,
	renderParallelBook,
	renderParallelVerse,
	renderParallelVerseSegments,
	renderParallelMultiNav,
	renderMixedMultiNav,
	renderParallelMixedMultiNav,
	setTranslationCode,
	setInterlinearEnabled,
	getInterlinearEnabled,
	setInterlinearBook,
	getInterlinearBook,
	getInterlinearBooks,
	setStrongsDict,
	getStrongsDict,
	renderStrongsPanel,
	setNoteMap,
	getNoteMap as getRenderNoteMap,
	ICON_COPY,
	ICON_BOOKMARK,
	ICON_NOTE,
} from "./render.ts";
import { setTranslation, displayName, displayNameFor, getBookKeys } from "./bookNames.ts";
import { setLanguage, getLanguage, t } from "./i18n.ts";

let data: BibleData;
let currentTranslation = "NHEB";
const DEFAULT_TRANSLATION = "NHEB";
let translationRequestId = 0;
let parallelTranslation = "";
let syncSidenotes = () => {}; // set by init()
let parallelData: BibleData | null = null;
let highlightMap = new Map<string, HighlightColor>();

function withTranslationParams(s: AppState): AppState {
	return {
		...s,
		translation: currentTranslation,
		parallel: parallelTranslation || undefined,
		interlinear: getInterlinearEnabled() || undefined,
	};
}

async function fetchInterlinear(book: string): Promise<InterlinearBook> {
	const existing = getInterlinearBook(book);
	if (existing) return existing;
	const cached = await loadInterlinearBook(book);
	if (cached) {
		setInterlinearBook(book, cached);
		return cached;
	}
	const res = await fetch(`./text/interlinear/${encodeURIComponent(book)}.json`);
	if (!res.ok) throw new Error(`HTTP ${res.status}`);
	const d: InterlinearBook = await res.json();
	setInterlinearBook(book, d);
	await saveInterlinearBook(book, d);
	return d;
}

async function fetchStrongs(): Promise<StrongsDict> {
	const existing = getStrongsDict();
	if (existing && Object.keys(existing).length > 0) return existing;
	const cached = await loadStrongsDict();
	if (cached) {
		setStrongsDict(cached);
		return cached;
	}
	const res = await fetch("./text/strongs.json");
	if (!res.ok) throw new Error(`HTTP ${res.status}`);
	const d: StrongsDict = await res.json();
	setStrongsDict(d);
	await saveStrongsDict(d);
	return d;
}

async function fetchTranslation(code: string): Promise<BibleData> {
	const cached = await loadBible(code);
	if (cached) return cached;
	const res = await fetch(`./text/bible-${encodeURIComponent(code)}.json`);
	if (!res.ok) throw new Error(`HTTP ${res.status}`);
	const d: BibleData = await res.json();
	await saveBible(code, d);
	return d;
}

async function fetchTranslations(): Promise<string[]> {
	try {
		const res = await fetch("./text/translations.json");
		if (!res.ok) return [DEFAULT_TRANSLATION];
		return await res.json();
	} catch {
		return [DEFAULT_TRANSLATION];
	}
}

async function fetchDescriptions(code: string): Promise<DescriptionData> {
	const lang = TRANSLATION_LANG[code] || "en";
	try {
		const res = await fetch(`./data/descriptions-${encodeURIComponent(lang)}.json`);
		if (!res.ok) return [];
		return await res.json();
	} catch {
		return [];
	}
}

// --- Toast notifications ---
let toastTimer: number;
function showToast(msg: string) {
	const el = document.getElementById("toast");
	if (!el) return;
	el.style.removeProperty("visibility");
	el.textContent = msg;
	el.classList.add("show");
	clearTimeout(toastTimer);
	toastTimer = window.setTimeout(() => el.classList.remove("show"), 2000);
}

function showQrOverlay(url: string) {
	const overlay = document.getElementById("qr-overlay");
	const canvas = document.getElementById("qr-canvas") as HTMLCanvasElement | null;
	const titleEl = document.getElementById("qr-modal-title");
	if (!overlay || !canvas) return;
	if (titleEl) titleEl.textContent = t().qrCode;
	import("./qr.ts").then(({ drawQR }) => {
		drawQR(url, canvas, { moduleSize: 6, quiet: 4 }).then(() => {
			overlay.removeAttribute("hidden");
			overlay.classList.add("open");
		});
	});
}

function closeQrOverlay() {
	const overlay = document.getElementById("qr-overlay");
	if (!overlay) return;
	overlay.classList.remove("open");
	overlay.setAttribute("hidden", "");
}

// --- Theme management ---
function applyTheme(theme: string) {
	if (theme === "system") {
		const dark = window.matchMedia("(prefers-color-scheme: dark)").matches;
		document.documentElement.setAttribute("data-theme", dark ? "dark" : "light");
	} else {
		document.documentElement.setAttribute("data-theme", theme);
	}
}

// --- Segmented control helper ---
function activateSegmented(container: HTMLElement | null, value: string) {
	if (!container) return;
	for (const btn of container.querySelectorAll<HTMLElement>(".seg-btn")) {
		const active = btn.dataset.value === value;
		btn.classList.toggle("seg-active", active);
		btn.setAttribute("aria-checked", String(active));
	}
}

// --- Interlinear helpers ---
function isKJV(): boolean {
	return currentTranslation === "KJV";
}

/** Load interlinear data for a book (lazy), then reload Strong's dict if needed. */
async function ensureInterlinear(book: string): Promise<void> {
	if (!isKJV()) return;
	try {
		await Promise.all([fetchInterlinear(book), fetchStrongs()]);
		setSearchInterlinearData(getInterlinearBooks());
	} catch {
		/* data unavailable — interlinear won't render */
	}
}

async function init() {
	const content = document.getElementById("content")!;
	const sidenoteRail = document.getElementById("sidenotes-rail")!;
	const searchInput = document.getElementById("search-input") as HTMLInputElement;
	const indexBtn = document.getElementById("index-btn")!;
	const overlay = document.getElementById("index-overlay")!;
	const verseMenu = document.getElementById("verse-menu")!;
	// Unified side panel
	const panelBtn = document.getElementById("panel-btn")!;
	const sideOverlay = document.getElementById("side-overlay")!;
	const sideClose = document.getElementById("side-close")!;
	const sideTabBtns = Array.from(document.querySelectorAll<HTMLElement>(".side-tab-btn"));
	const sidePanes = Array.from(document.querySelectorAll<HTMLElement>(".side-pane"));
	const storiesFilter = document.getElementById("stories-filter") as HTMLInputElement;
	const storiesList = document.getElementById("stories-list")!;
	const storiesTitleEl = document.getElementById("stories-title")!;
	const parablesFilter = document.getElementById("parables-filter") as HTMLInputElement;
	const parablesList = document.getElementById("parables-list")!;
	const parablesTitleEl = document.getElementById("parables-title")!;
	const theophaniesFilter = document.getElementById("theophanies-filter") as HTMLInputElement;
	const theophaniesList = document.getElementById("theophanies-list")!;
	const theophaniesTitleEl = document.getElementById("theophanies-title")!;
	const typologyFilter = document.getElementById("typology-filter") as HTMLInputElement;
	const typologyList = document.getElementById("typology-list")!;
	const typologyTitleEl = document.getElementById("typology-title")!;
	const bookmarksList = document.getElementById("bookmarks-list")!;
	const bookmarksTitleEl = document.getElementById("bookmarks-title")!;
	const notesList = document.getElementById("notes-list")!;
	const notesTitleEl = document.getElementById("notes-title")!;
	// Note editor left panel elements
	const noteDialogOverlay = document.getElementById("note-panel-overlay")!;
	const noteDialogTitle = document.getElementById("note-panel-title")!;
	const noteDialogRef = document.getElementById("note-panel-ref")!;
	const noteDialogTextarea = document.getElementById(
		"note-panel-textarea",
	) as HTMLTextAreaElement;
	const noteDialogSave = document.getElementById("note-panel-save")!;
	const noteDialogCancel = document.getElementById("note-panel-cancel")!;
	const noteDialogDelete = document.getElementById("note-panel-delete")!;
	const notePanelClose = document.getElementById("note-panel-close")!;
	const notePanelVerse = document.getElementById("note-panel-verse")!;

	// Determine initial translation from URL or localStorage
	const initialState = readState();
	currentTranslation =
		initialState.translation ||
		localStorage.getItem("bible-translation") ||
		DEFAULT_TRANSLATION;
	setTranslation(currentTranslation);
	setTranslationCode(currentTranslation);

	// Determine initial language: sync with translation
	const savedLang =
		TRANSLATION_LANG[currentTranslation] || localStorage.getItem("bible-language") || "en";
	setLanguage(savedLang);
	document.documentElement.lang = savedLang;
	localStorage.setItem("bible-language", savedLang);

	const languageSegmented = document.getElementById("language-segmented");
	activateSegmented(languageSegmented, savedLang);

	// Apply theme
	const savedTheme = localStorage.getItem("bible-theme") || "system";
	applyTheme(savedTheme);
	const themeSegmented = document.getElementById("theme-segmented");
	activateSegmented(themeSegmented, savedTheme);

	// Apply font size
	const savedFontSize = localStorage.getItem("bible-font-size") || "medium";
	document.documentElement.setAttribute("data-font-size", savedFontSize);
	const fontSizeSegmented = document.getElementById("fontsize-segmented");
	activateSegmented(fontSizeSegmented, savedFontSize);

	// Apply font family
	const savedFont = localStorage.getItem("bible-font") || "default";
	if (savedFont !== "default") document.documentElement.setAttribute("data-font", savedFont);
	const fontSegmented = document.getElementById("font-segmented");
	activateSegmented(fontSegmented, savedFont);

	window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
		const theme = localStorage.getItem("bible-theme") || "system";
		if (theme === "system") applyTheme("system");
	});

	// Load highlights
	const hlMap = await getHighlightMap();
	highlightMap = hlMap;
	setHighlightMap(hlMap);

	// Load verse notes
	const noteMapData = await getNoteMap();
	setNoteMap(noteMapData);

	// Load Bible data: try IndexedDB first, then fetch from API
	content.innerHTML = `<p class="loading">${t().loadingBible}</p>`;

	try {
		data = await fetchTranslation(currentTranslation);
	} catch {
		content.innerHTML = `<p class="empty">${t().loadFailed}</p>`;
		return;
	}

	// Load descriptions, styleguide, and subheadings in parallel
	const shLang = TRANSLATION_LANG[currentTranslation] || "en";
	const [desc, sgData, shData] = await Promise.all([
		fetchDescriptions(currentTranslation),
		fetch("./data/styleguide.json")
			.then((r) => (r.ok ? r.json() : null))
			.catch(() => null),
		fetch(`./data/subheadings-${shLang}.json`)
			.then((r) => (r.ok ? r.json() : null))
			.catch(() => null),
	]);
	setDescriptions(desc);
	if (sgData) setStyleguide(sgData);
	if (shData) setSubheadings(shData);

	localStorage.setItem("bible-translation", currentTranslation);
	initSearch(data);

	// Populate translation selector
	const translationSelect = document.getElementById(
		"translation-select",
	) as HTMLSelectElement | null;
	const headerTranslationSelect = document.getElementById(
		"header-translation-select",
	) as HTMLSelectElement | null;

	const translations = await fetchTranslations();

	if (translationSelect) {
		translationSelect.innerHTML = translations
			.map((t) => {
				const info = TRANSLATION_NAMES[t];
				const label = info ? `${t} — ${info.name} (${info.language})` : t;
				return `<option value="${t}"${t === currentTranslation ? " selected" : ""}>${label}</option>`;
			})
			.join("");
	}

	if (headerTranslationSelect) {
		headerTranslationSelect.innerHTML = translations
			.map(
				(t) =>
					`<option value="${t}"${t === currentTranslation ? " selected" : ""}>${t}</option>`,
			)
			.join("");
	}

	async function applyTranslationChange(code: string, failedSelect: HTMLSelectElement | null) {
		if (code === currentTranslation) return;

		// Pre-parse query books with old translation's aliases
		const state = readState();
		const parsedBooks = state.query ? parseQueryBooks(state.query) : null;

		const requestId = ++translationRequestId;
		content.innerHTML = `<p class="loading">${t().loadingTranslation(code)}</p>`;
		try {
			const newData = await fetchTranslation(code);
			if (requestId !== translationRequestId) return; // stale request
			data = newData;
			currentTranslation = code;
			setTranslation(code);
			setTranslationCode(code);
			localStorage.setItem("bible-translation", code);
			initSearch(data);

			// Sync both selects to the new value
			if (translationSelect) translationSelect.value = code;
			if (headerTranslationSelect) headerTranslationSelect.value = code;

			// Reload descriptions for the new translation
			const newDesc = await fetchDescriptions(code);
			setDescriptions(newDesc);

			// Reload subheadings for the new translation's language
			const newShLang = TRANSLATION_LANG[code] || "en";
			try {
				const shRes = await fetch(`./data/subheadings-${newShLang}.json`);
				if (shRes.ok) setSubheadings(await shRes.json());
			} catch {}

			// Auto-switch UI language to match translation
			const newLang = TRANSLATION_LANG[code];
			if (newLang && newLang !== getLanguage()) {
				setLanguage(newLang);
				document.documentElement.lang = newLang;
				localStorage.setItem("bible-language", newLang);
				activateSegmented(languageSegmented, newLang);
				updateStaticText();
			}

			indexRendered = false;
			indexScrollTo = null;
			if (overlay.classList.contains("open")) openIndex();

			// Turn off interlinear mode when switching away from KJV
			if (getInterlinearEnabled()) {
				setInterlinearEnabled(false);
				localStorage.setItem("bible-interlinear", "0");
				updateIlToggle();
			}

			// Translate query book names to new translation
			if (parsedBooks) {
				state.query = parsedBooks
					.map((p) => {
						if (!p.book) return p.original;
						const name = displayName(p.book);
						let result = p.rest ? `${name} ${p.rest}` : name;
						if (p.quoted) result += ` ${p.quoted}`;
						return result;
					})
					.join("; ");
			}

			searchInput.value = stateToInputText(state);
			applyState(state);
			replaceState(withTranslationParams(stateForUrl(state)));
			updateFooter();
		} catch {
			content.innerHTML = `<p class="empty">${t().loadTranslationFailed(code)}</p>`;
			if (failedSelect) failedSelect.value = currentTranslation;
		}
	}

	if (translationSelect) {
		translationSelect.addEventListener("change", () =>
			applyTranslationChange(translationSelect.value, translationSelect),
		);
	}
	if (headerTranslationSelect) {
		headerTranslationSelect.addEventListener("change", () =>
			applyTranslationChange(headerTranslationSelect.value, headerTranslationSelect),
		);
	}

	// Language segmented control
	if (languageSegmented) {
		languageSegmented.addEventListener("click", (e) => {
			const btn = (e.target as HTMLElement).closest(".seg-btn") as HTMLElement | null;
			if (!btn || btn.classList.contains("seg-active")) return;
			const lang = btn.dataset.value!;
			activateSegmented(languageSegmented, lang);
			setLanguage(lang);
			document.documentElement.lang = lang;
			localStorage.setItem("bible-language", lang);
			updateStaticText();
			indexRendered = false;
			indexScrollTo = null;
			if (overlay.classList.contains("open")) openIndex();
			searchInput.value = stateToInputText(state);
			applyState(state);
			updateFooter();
		});
	}

	// Parallel translation selector
	const parallelSelect = document.getElementById("parallel-select") as HTMLSelectElement | null;
	if (parallelSelect && translationSelect) {
		const translations = await fetchTranslations();
		const savedParallel = initialState.parallel || localStorage.getItem("bible-parallel") || "";
		parallelSelect.innerHTML =
			`<option value="">${t().parallelNone}</option>` +
			translations
				.map((tr) => {
					const info = TRANSLATION_NAMES[tr];
					const label = info ? `${tr} — ${info.name}` : tr;
					return `<option value="${tr}"${tr === savedParallel ? " selected" : ""}>${label}</option>`;
				})
				.join("");

		if (savedParallel) {
			try {
				parallelTranslation = savedParallel;
				parallelData = await fetchTranslation(savedParallel);
				localStorage.setItem("bible-parallel", savedParallel);
				setSecondaryDescriptions(await fetchDescriptions(savedParallel));
				const secShLang = TRANSLATION_LANG[savedParallel] || "en";
				try {
					const shRes = await fetch(`./data/subheadings-${secShLang}.json`);
					if (shRes.ok) setSecondarySubheadings(await shRes.json());
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
						if (shRes.ok) setSecondarySubheadings(await shRes.json());
					} catch {}
				} catch {
					parallelTranslation = "";
					parallelData = null;
					parallelSelect.value = "";
				}
			}
			const state = readState();
			applyState(state);
			replaceState(withTranslationParams(stateForUrl(state)));
		});
	}

	// Theme segmented control
	if (themeSegmented) {
		themeSegmented.addEventListener("click", (e) => {
			const btn = (e.target as HTMLElement).closest(".seg-btn") as HTMLElement | null;
			if (!btn || btn.classList.contains("seg-active")) return;
			const theme = btn.dataset.value!;
			activateSegmented(themeSegmented, theme);
			applyTheme(theme);
			localStorage.setItem("bible-theme", theme);
		});
	}

	// Font size segmented control
	if (fontSizeSegmented) {
		fontSizeSegmented.addEventListener("click", (e) => {
			const btn = (e.target as HTMLElement).closest(".seg-btn") as HTMLElement | null;
			if (!btn || btn.classList.contains("seg-active")) return;
			const size = btn.dataset.value!;
			activateSegmented(fontSizeSegmented, size);
			document.documentElement.setAttribute("data-font-size", size);
			localStorage.setItem("bible-font-size", size);
		});
	}

	// Font family segmented control
	if (fontSegmented) {
		fontSegmented.addEventListener("click", (e) => {
			const btn = (e.target as HTMLElement).closest(".seg-btn") as HTMLElement | null;
			if (!btn || btn.classList.contains("seg-active")) return;
			const font = btn.dataset.value!;
			activateSegmented(fontSegmented, font);
			if (font === "default") {
				document.documentElement.removeAttribute("data-font");
			} else {
				document.documentElement.setAttribute("data-font", font);
			}
			localStorage.setItem("bible-font", font);
		});
	}

	// Export / import data
	const exportBtn = document.getElementById("export-data-btn");
	const importBtn = document.getElementById("import-data-btn");
	const importInput = document.getElementById("import-data-input") as HTMLInputElement | null;

	if (exportBtn) {
		exportBtn.addEventListener("click", async () => {
			const payload = await exportUserData();
			const json = JSON.stringify(payload, null, 2);
			const blob = new Blob([json], { type: "application/json" });
			const url = URL.createObjectURL(blob);
			const a = document.createElement("a");
			a.href = url;
			a.download = `sanatheos-export-${new Date().toISOString().slice(0, 10)}.json`;
			document.body.appendChild(a);
			a.click();
			document.body.removeChild(a);
			URL.revokeObjectURL(url);
			showToast(t().exportSuccess);
		});
	}

	if (importBtn && importInput) {
		importBtn.addEventListener("click", () => importInput.click());
		importInput.addEventListener("change", async () => {
			const file = importInput.files?.[0];
			if (!file) return;
			importInput.value = "";
			try {
				const text = await file.text();
				const parsed = JSON.parse(text);
				await importUserData(parsed);
				// Reload highlight map and note map into memory
				const newHlMap = await getHighlightMap();
				highlightMap = newHlMap;
				setHighlightMap(newHlMap);
				const newNoteMap = await getNoteMap();
				setNoteMap(newNoteMap);
				// Re-render current view so highlights/notes appear
				applyState(readState());
				showToast(t().importSuccess);
			} catch {
				showToast(t().importError);
			}
		});
	}

	updateStaticText();

	// --- Interlinear toggle ---
	const strongsPanel = document.getElementById("strongs-panel")!;
	strongsPanel.style.removeProperty("visibility");
	// Remove inline visibility:hidden from side overlay (set in HTML to prevent FOUC)
	sideOverlay.style.removeProperty("visibility");
	// Remove inline visibility:hidden from note panel overlay (set in HTML to prevent FOUC)
	noteDialogOverlay.style.removeProperty("visibility");
	// Remove preload class to re-enable CSS transitions after initial paint
	document.body.classList.remove("preload");

	// Reposition sidenotes on window resize (debounced)
	let syncSidenotesTimer: ReturnType<typeof setTimeout>;
	window.addEventListener("resize", () => {
		clearTimeout(syncSidenotesTimer);
		syncSidenotesTimer = setTimeout(syncSidenotes, 150);
	});

	const savedIl =
		initialState.interlinear || (isKJV() && localStorage.getItem("bible-interlinear") === "1");
	if (savedIl && isKJV()) {
		setInterlinearEnabled(true);
	}

	function updateIlToggle() {
		const btn = document.querySelector(".il-toggle-btn") as HTMLElement | null;
		if (!btn) return;
		if (getInterlinearEnabled()) btn.classList.add("active");
		else btn.classList.remove("active");
	}

	function closeStrongsPanel() {
		strongsPanel.classList.remove("open");
		strongsPanel.innerHTML = "";
		currentStrongsId = "";
	}

	let currentStrongsId = "";

	async function openStrongsPanel(strongsId: string) {
		// Toggle closed if clicking the same word again
		if (
			strongsPanel.classList.contains("open") &&
			currentStrongsId === strongsId.toLowerCase()
		) {
			closeStrongsPanel();
			return;
		}
		// Ensure Strong's dictionary is loaded
		let dict = getStrongsDict();
		if (!dict || Object.keys(dict).length === 0) {
			try {
				dict = await fetchStrongs();
			} catch {
				return;
			}
		}
		const entry = dict[strongsId.toLowerCase()];
		if (!entry) return;
		currentStrongsId = strongsId.toLowerCase();
		strongsPanel.innerHTML = renderStrongsPanel(entry, strongsId);
		strongsPanel.classList.add("open");

		// Close button handler
		const closeBtn = strongsPanel.querySelector(".strongs-close");
		if (closeBtn) closeBtn.addEventListener("click", closeStrongsPanel);
	}

	// Render initial state from URL
	const state = readState();
	searchInput.value = stateToInputText(state);
	applyState(state);
	replaceState(withTranslationParams(stateForUrl(state)));
	updateFooter();

	// Reveal footer now that content has been rendered
	document.getElementById("footer")?.classList.add("visible");

	// --- Search with debounce ---
	let timer: number;
	searchInput.addEventListener("input", () => {
		clearTimeout(timer);
		timer = window.setTimeout(() => {
			const q = searchInput.value.trim();
			if (!q) {
				const s: AppState = {};
				applyState(s);
				replaceState(withTranslationParams(s));
				return;
			}
			applyState({ query: q });
			replaceState(withTranslationParams(stateForUrl({ query: q })));
		}, 150);
	});

	// Auto-close double quotes and place cursor between them
	searchInput.addEventListener("keydown", (e) => {
		if (e.key === '"') {
			const start = searchInput.selectionStart ?? searchInput.value.length;
			const end = searchInput.selectionEnd ?? start;
			const val = searchInput.value;
			if (val[end] === '"') {
				// Skip over existing closing quote
				e.preventDefault();
				searchInput.selectionStart = searchInput.selectionEnd = end + 1;
				searchInput.dispatchEvent(new Event("input"));
			} else {
				// Auto-close: insert pair and place cursor between
				e.preventDefault();
				const before = val.slice(0, start);
				const after = val.slice(end);
				searchInput.value = before + '""' + after;
				searchInput.selectionStart = searchInput.selectionEnd = start + 1;
				searchInput.dispatchEvent(new Event("input"));
			}
		}
	});

	// --- Index panel ---
	let indexRendered = false;
	let indexScrollTo: ((book?: string, chapter?: number, verse?: number) => void) | null = null;

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
		indexBtn.setAttribute("aria-expanded", "true");
		lockScroll();
		if (!indexRendered) {
			const idx = renderIndex(data, {
				onBook(book) {
					navigate({ book });
				},
				onChapter(book, chapter) {
					navigate({ book, chapter });
				},
				onVerse(book, chapter, verse) {
					navigate({ book, chapter, verse });
				},
			});
			indexScrollTo = idx.scrollTo;
			indexRendered = true;
		}
		// Scroll to the currently viewed book/chapter/verse
		const current = readState();
		const book = current.book || "Genesis";
		requestAnimationFrame(() => {
			if (indexScrollTo) indexScrollTo(book, current.chapter, current.verse);
			// Focus the most specific column matching what's being read
			let target: HTMLElement | null = null;
			if (current.verse !== undefined) {
				target =
					(document.querySelector("#idx-verses .idx-item:focus") as HTMLElement) ??
					(() => {
						const items = document.querySelectorAll("#idx-verses .idx-item");
						for (const el of items)
							if (el.textContent?.startsWith(`${current.verse}. `)) return el;
						return null;
					})() ??
					(document.querySelector("#idx-verses .idx-item") as HTMLElement);
			} else if (current.chapter !== undefined) {
				target =
					(document.querySelector(`#idx-chapters .idx-item.active`) as HTMLElement) ??
					(document.querySelector("#idx-chapters .idx-item") as HTMLElement);
			}
			if (!target) {
				target =
					(document.querySelector("#idx-books .idx-item.active") as HTMLElement) ??
					(document.querySelector("#idx-books .idx-item") as HTMLElement);
			}
			target?.focus();
		});
	}

	function closeIndex() {
		overlay.classList.remove("open");
		indexBtn.setAttribute("aria-expanded", "false");
		unlockScroll();
	}

	function toggleIndex() {
		if (overlay.classList.contains("open")) closeIndex();
		else openIndex();
	}

	indexBtn.addEventListener("click", toggleIndex);

	overlay.addEventListener("click", (e) => {
		if (e.target === overlay) closeIndex();
	});

	// --- Unified side panel ---
	let lastActiveTab = localStorage.getItem("side-panel-tab") || "stories";

	function activateSideTab(tab: string) {
		sideTabBtns.forEach((btn) => {
			const active = btn.dataset.tab === tab;
			btn.classList.toggle("active", active);
			btn.setAttribute("aria-selected", String(active));
		});
		sidePanes.forEach((pane) => {
			pane.classList.toggle("active", pane.dataset.pane === tab);
		});
		lastActiveTab = tab;
		localStorage.setItem("side-panel-tab", tab);
	}

	async function openSidePanel(tab?: string) {
		activateSideTab(tab || lastActiveTab);
		sideOverlay.classList.add("open");
		panelBtn.setAttribute("aria-expanded", "true");
		lockScroll();
		// If opening stories tab, load data and reset filter
		if ((tab || lastActiveTab) === "stories") {
			storiesTitleEl.textContent = t().storiesTitle;
			storiesFilter.placeholder = t().storiesFilterPlaceholder;
			storiesFilter.value = "";
			const stories = await loadStoriesData();
			renderStoriesList(stories, "");
			// Only auto-focus the filter on non-touch (desktop) devices
			if (!window.matchMedia("(hover: none)").matches) {
				storiesFilter.focus();
			}
		}
		// If opening parables tab, load data and reset filter
		if ((tab || lastActiveTab) === "parables") {
			parablesTitleEl.textContent = t().parablesTitle;
			parablesFilter.placeholder = t().parablesFilterPlaceholder;
			parablesFilter.value = "";
			const parables = await loadParablesData();
			renderParablesList(parables, "");
			if (!window.matchMedia("(hover: none)").matches) {
				parablesFilter.focus();
			}
		}
		// If opening theophanies tab, load data and reset filter
		if ((tab || lastActiveTab) === "theophanies") {
			theophaniesTitleEl.textContent = t().theophaniesTitle;
			theophaniesFilter.placeholder = t().theophaniesFilterPlaceholder;
			theophaniesFilter.value = "";
			const theophanies = await loadTheophaniesData();
			renderTheophaniesList(theophanies, "");
			if (!window.matchMedia("(hover: none)").matches) {
				theophaniesFilter.focus();
			}
		}
		// If opening typology tab, load data and reset filter
		if ((tab || lastActiveTab) === "typology") {
			typologyTitleEl.textContent = t().typologyTitle;
			typologyFilter.placeholder = t().typologyFilterPlaceholder;
			typologyFilter.value = "";
			const typology = await loadTypologyData();
			renderTypologyList(typology, "");
			if (!window.matchMedia("(hover: none)").matches) {
				typologyFilter.focus();
			}
		}
		if ((tab || lastActiveTab) === "bookmarks") {
			bookmarksTitleEl.textContent = t().bookmarksTitle;
			await renderBookmarksList();
		}
		if ((tab || lastActiveTab) === "notes") {
			notesTitleEl.textContent = t().notesTitle;
			await renderNotesList();
		}
	}

	function closeSidePanel() {
		sideOverlay.classList.remove("open");
		panelBtn.setAttribute("aria-expanded", "false");
		unlockScroll();
	}

	panelBtn.addEventListener("click", () => openSidePanel());
	sideClose.addEventListener("click", closeSidePanel);
	sideOverlay.addEventListener("click", (e) => {
		if (e.target === sideOverlay) closeSidePanel();
	});

	sideTabBtns.forEach((btn) => {
		btn.addEventListener("click", () => {
			const tab = btn.dataset.tab!;
			activateSideTab(tab);
			// Load stories when switching to stories tab
			if (tab === "stories") {
				storiesTitleEl.textContent = t().storiesTitle;
				storiesFilter.placeholder = t().storiesFilterPlaceholder;
				loadStoriesData().then((stories) =>
					renderStoriesList(stories, storiesFilter.value),
				);
			}
			// Load parables when switching to parables tab
			if (tab === "parables") {
				parablesTitleEl.textContent = t().parablesTitle;
				parablesFilter.placeholder = t().parablesFilterPlaceholder;
				loadParablesData().then((parables) =>
					renderParablesList(parables, parablesFilter.value),
				);
			}
			// Load theophanies when switching to theophanies tab
			if (tab === "theophanies") {
				theophaniesTitleEl.textContent = t().theophaniesTitle;
				theophaniesFilter.placeholder = t().theophaniesFilterPlaceholder;
				loadTheophaniesData().then((theophanies) =>
					renderTheophaniesList(theophanies, theophaniesFilter.value),
				);
			}
			// Load typology when switching to typology tab
			if (tab === "typology") {
				typologyTitleEl.textContent = t().typologyTitle;
				typologyFilter.placeholder = t().typologyFilterPlaceholder;
				loadTypologyData().then((typology) =>
					renderTypologyList(typology, typologyFilter.value),
				);
			}
			// Load bookmarks when switching to bookmarks tab
			if (tab === "bookmarks") {
				bookmarksTitleEl.textContent = t().bookmarksTitle;
				renderBookmarksList();
			}
			// Load notes when switching to notes tab
			if (tab === "notes") {
				notesTitleEl.textContent = t().notesTitle;
				renderNotesList();
			}
		});
	});

	// --- Stories panel ---

	let storiesData: StoryEntry[] | null = null;

	async function loadStoriesData(): Promise<StoryEntry[]> {
		if (storiesData) return storiesData;
		const cached = await loadStories();
		if (cached) {
			storiesData = cached;
			return storiesData;
		}
		const res = await fetch("./data/stories.json");
		storiesData = (await res.json()) as StoryEntry[];
		await saveStories(storiesData);
		return storiesData;
	}

	function localizeRef(ref: string): string {
		// Sort canonical keys longest-first to avoid partial matches (e.g. "1 Samuel" before "Samuel")
		const keys = getBookKeys().sort((a, b) => b.length - a.length);
		function localizeSingle(part: string): string {
			for (const key of keys) {
				if (part === key || part.startsWith(key + " ")) {
					return displayName(key) + part.slice(key.length);
				}
			}
			return part;
		}
		// Handle semicolon-separated multi-refs (e.g. "Genesis 25:19-34; Genesis 27")
		return ref.split("; ").map(localizeSingle).join("; ");
	}

	function renderStoriesList(stories: StoryEntry[], filter: string) {
		const s = t();
		const lang = getLanguage();
		const getTitle = (st: StoryEntry) =>
			lang === "fi" && st.title_fi
				? st.title_fi
				: lang === "sv" && st.title_sv
					? st.title_sv
					: st.title;
		const getDesc = (st: StoryEntry) =>
			lang === "fi" && st.description_fi
				? st.description_fi
				: lang === "sv" && st.description_sv
					? st.description_sv
					: st.description;
		const getCatLabel = (cat: string) => {
			if (cat === "Old Testament") return s.oldTestament;
			if (cat === "New Testament") return s.newTestament;
			if (cat === "Deuterocanonical") return s.deuterocanonical;
			return cat;
		};

		const q = filter.trim().toLowerCase();
		const filtered = q
			? stories.filter(
					(st) =>
						getTitle(st).toLowerCase().includes(q) ||
						getDesc(st).toLowerCase().includes(q) ||
						getCatLabel(st.category).toLowerCase().includes(q),
				)
			: stories;

		if (filtered.length === 0) {
			storiesList.innerHTML = `<p class="stories-empty">${s.storiesEmpty}</p>`;
			return;
		}

		const categories: string[] = [];
		const byCategory: Record<string, StoryEntry[]> = {};
		for (const st of filtered) {
			if (!byCategory[st.category]) {
				byCategory[st.category] = [];
				categories.push(st.category);
			}
			byCategory[st.category].push(st);
		}

		let html = "";
		for (const cat of categories) {
			html += `<div class="stories-category-label">${escapeHtml(getCatLabel(cat))}</div>`;
			for (const st of byCategory[cat]) {
				html += `<button class="story-item" type="button" data-ref="${escapeHtml(st.ref)}">
					<span class="story-item-title">${escapeHtml(getTitle(st))}</span>
					<span class="story-item-desc">${escapeHtml(getDesc(st))}</span>
					<span class="story-item-ref">${escapeHtml(localizeRef(st.ref))}</span>
				</button>`;
			}
		}
		storiesList.innerHTML = html;
	}

	function escapeHtml(str: string): string {
		return str
			.replace(/&/g, "&amp;")
			.replace(/</g, "&lt;")
			.replace(/>/g, "&gt;")
			.replace(/"/g, "&quot;");
	}

	storiesFilter.addEventListener("input", async () => {
		const stories = await loadStoriesData();
		renderStoriesList(stories, storiesFilter.value);
	});

	storiesList.addEventListener("click", (e) => {
		const item = (e.target as HTMLElement).closest(".story-item") as HTMLElement | null;
		if (!item) return;
		const ref = item.dataset.ref;
		if (!ref) return;
		closeSidePanel();
		searchInput.value = ref;
		searchInput.dispatchEvent(new Event("input"));
	});

	// --- Parables panel ---

	let parablesData: ParableEntry[] | null = null;

	async function loadParablesData(): Promise<ParableEntry[]> {
		if (parablesData) return parablesData;
		const cached = await loadParables();
		if (cached) {
			parablesData = cached;
			return parablesData;
		}
		const res = await fetch("./data/parables.json");
		parablesData = (await res.json()) as ParableEntry[];
		await saveParables(parablesData);
		return parablesData;
	}

	function renderParablesList(parables: ParableEntry[], filter: string) {
		const s = t();
		const lang = getLanguage();
		const getTitle = (p: ParableEntry) =>
			lang === "fi" && p.title_fi
				? p.title_fi
				: lang === "sv" && p.title_sv
					? p.title_sv
					: p.title;
		const getDesc = (p: ParableEntry) =>
			lang === "fi" && p.description_fi
				? p.description_fi
				: lang === "sv" && p.description_sv
					? p.description_sv
					: p.description;
		// Category label is the gospel book name — localize via displayName
		const getCatLabel = (cat: string) => displayName(cat);

		const q = filter.trim().toLowerCase();
		const filtered = q
			? parables.filter(
					(p) =>
						getTitle(p).toLowerCase().includes(q) ||
						getDesc(p).toLowerCase().includes(q) ||
						getCatLabel(p.category).toLowerCase().includes(q),
				)
			: parables;

		if (filtered.length === 0) {
			parablesList.innerHTML = `<p class="stories-empty">${s.parablesEmpty}</p>`;
			return;
		}

		const categories: string[] = [];
		const byCategory: Record<string, ParableEntry[]> = {};
		for (const p of filtered) {
			if (!byCategory[p.category]) {
				byCategory[p.category] = [];
				categories.push(p.category);
			}
			byCategory[p.category].push(p);
		}

		let html = "";
		for (const cat of categories) {
			html += `<div class="stories-category-label">${escapeHtml(getCatLabel(cat))}</div>`;
			for (const p of byCategory[cat]) {
				html += `<button class="story-item" type="button" data-ref="${escapeHtml(p.ref)}">
					<span class="story-item-title">${escapeHtml(getTitle(p))}</span>
					<span class="story-item-desc">${escapeHtml(getDesc(p))}</span>
					<span class="story-item-ref">${escapeHtml(localizeRef(p.ref))}</span>
				</button>`;
			}
		}
		parablesList.innerHTML = html;
	}

	parablesFilter.addEventListener("input", async () => {
		const parables = await loadParablesData();
		renderParablesList(parables, parablesFilter.value);
	});

	parablesList.addEventListener("click", (e) => {
		const item = (e.target as HTMLElement).closest(".story-item") as HTMLElement | null;
		if (!item) return;
		const ref = item.dataset.ref;
		if (!ref) return;
		closeSidePanel();
		searchInput.value = ref;
		searchInput.dispatchEvent(new Event("input"));
	});

	// --- Theophanies panel ---

	let theophaniesData: TheophaniesEntry[] | null = null;

	async function loadTheophaniesData(): Promise<TheophaniesEntry[]> {
		if (theophaniesData) return theophaniesData;
		const cached = await loadTheophanies();
		if (cached) {
			theophaniesData = cached;
			return theophaniesData;
		}
		const res = await fetch("./data/theophanies.json");
		theophaniesData = (await res.json()) as TheophaniesEntry[];
		await saveTheophanies(theophaniesData);
		return theophaniesData;
	}

	function renderTheophaniesList(theophanies: TheophaniesEntry[], filter: string) {
		const s = t();
		const lang = getLanguage();
		const getTitle = (th: TheophaniesEntry) =>
			lang === "fi" && th.title_fi
				? th.title_fi
				: lang === "sv" && th.title_sv
					? th.title_sv
					: th.title;
		const getDesc = (th: TheophaniesEntry) =>
			lang === "fi" && th.description_fi
				? th.description_fi
				: lang === "sv" && th.description_sv
					? th.description_sv
					: th.description;
		const getCatLabel = (cat: string) => {
			if (cat === "Old Testament") return s.oldTestament;
			if (cat === "New Testament") return s.newTestament;
			if (cat === "Deuterocanonical") return s.deuterocanonical;
			return cat;
		};

		const q = filter.trim().toLowerCase();
		const filtered = q
			? theophanies.filter(
					(th) =>
						getTitle(th).toLowerCase().includes(q) ||
						getDesc(th).toLowerCase().includes(q) ||
						getCatLabel(th.category).toLowerCase().includes(q),
				)
			: theophanies;

		if (filtered.length === 0) {
			theophaniesList.innerHTML = `<p class="stories-empty">${s.theophaniesEmpty}</p>`;
			return;
		}

		const categories: string[] = [];
		const byCategory: Record<string, TheophaniesEntry[]> = {};
		for (const th of filtered) {
			if (!byCategory[th.category]) {
				byCategory[th.category] = [];
				categories.push(th.category);
			}
			byCategory[th.category].push(th);
		}

		let html = "";
		for (const cat of categories) {
			html += `<div class="stories-category-label">${escapeHtml(getCatLabel(cat))}</div>`;
			for (const th of byCategory[cat]) {
				html += `<button class="story-item" type="button" data-ref="${escapeHtml(th.ref)}">
					<span class="story-item-title">${escapeHtml(getTitle(th))}</span>
					<span class="story-item-desc">${escapeHtml(getDesc(th))}</span>
					<span class="story-item-ref">${escapeHtml(localizeRef(th.ref))}</span>
				</button>`;
			}
		}
		theophaniesList.innerHTML = html;
	}

	theophaniesFilter.addEventListener("input", async () => {
		const theophanies = await loadTheophaniesData();
		renderTheophaniesList(theophanies, theophaniesFilter.value);
	});

	theophaniesList.addEventListener("click", (e) => {
		const item = (e.target as HTMLElement).closest(".story-item") as HTMLElement | null;
		if (!item) return;
		const ref = item.dataset.ref;
		if (!ref) return;
		closeSidePanel();
		searchInput.value = ref;
		searchInput.dispatchEvent(new Event("input"));
	});

	// --- Typology panel ---

	let typologyData: TypologyEntry[] | null = null;

	async function loadTypologyData(): Promise<TypologyEntry[]> {
		if (typologyData) return typologyData;
		const cached = await loadTypology();
		if (cached) {
			typologyData = cached;
			return typologyData;
		}
		const res = await fetch("./data/typology.json");
		typologyData = (await res.json()) as TypologyEntry[];
		await saveTypology(typologyData);
		return typologyData;
	}

	function renderTypologyList(typology: TypologyEntry[], filter: string) {
		const s = t();
		const lang = getLanguage();
		const getTitle = (ty: TypologyEntry) =>
			lang === "fi" && ty.title_fi
				? ty.title_fi
				: lang === "sv" && ty.title_sv
					? ty.title_sv
					: ty.title;
		const getDesc = (ty: TypologyEntry) =>
			lang === "fi" && ty.description_fi
				? ty.description_fi
				: lang === "sv" && ty.description_sv
					? ty.description_sv
					: ty.description;
		const getCatLabel = (cat: string) => {
			const map: Record<string, string> = {
				"Types of Christ (Persons)": s.typologyCatPersons,
				"Types of Christ (Events)": s.typologyCatEvents,
				"Types of the Theotokos": s.typologyCatTheotokos,
				"Types of the Church & Sacraments": s.typologyCatChurch,
				"Types of the Cross": s.typologyCatCross,
				"Additional Types": s.typologyCatAdditional,
			};
			return map[cat] ?? cat;
		};

		const q = filter.trim().toLowerCase();
		const filtered = q
			? typology.filter(
					(ty) =>
						getTitle(ty).toLowerCase().includes(q) ||
						getDesc(ty).toLowerCase().includes(q) ||
						getCatLabel(ty.category).toLowerCase().includes(q),
				)
			: typology;

		if (filtered.length === 0) {
			typologyList.innerHTML = `<p class="stories-empty">${s.typologyEmpty}</p>`;
			return;
		}

		const categories: string[] = [];
		const byCategory: Record<string, TypologyEntry[]> = {};
		for (const ty of filtered) {
			if (!byCategory[ty.category]) {
				byCategory[ty.category] = [];
				categories.push(ty.category);
			}
			byCategory[ty.category].push(ty);
		}

		let html = "";
		for (const cat of categories) {
			html += `<div class="stories-category-label">${escapeHtml(getCatLabel(cat))}</div>`;
			for (const ty of byCategory[cat]) {
				html += `<button class="story-item" type="button" data-ref="${escapeHtml(ty.ref)}">
					<span class="story-item-title">${escapeHtml(getTitle(ty))}</span>
					<span class="story-item-desc">${escapeHtml(getDesc(ty))}</span>
					<span class="story-item-ref">${escapeHtml(localizeRef(ty.ref))}</span>
				</button>`;
			}
		}
		typologyList.innerHTML = html;
	}

	typologyFilter.addEventListener("input", async () => {
		const typology = await loadTypologyData();
		renderTypologyList(typology, typologyFilter.value);
	});

	typologyList.addEventListener("click", (e) => {
		const item = (e.target as HTMLElement).closest(".story-item") as HTMLElement | null;
		if (!item) return;
		const ref = item.dataset.ref;
		if (!ref) return;
		closeSidePanel();
		searchInput.value = ref;
		searchInput.dispatchEvent(new Event("input"));
	});

	// --- Bookmarks panel ---

	async function renderBookmarksList() {
		const s = t();
		const items = await getBookmarks();
		if (items.length === 0) {
			bookmarksList.innerHTML = `<p class="bookmarks-empty">${escapeHtml(s.bookmarksEmpty)}</p>`;
			return;
		}
		let html = "";
		for (const bm of items) {
			const label = bookmarkNavText(bm);
			html += `<div class="bookmark-item">
				<button class="bookmark-item-nav" type="button" data-query="${escapeHtml(label)}">${escapeHtml(label)}</button>
				<button class="bookmark-item-remove" type="button" data-id="${escapeHtml(bm.id)}" title="${escapeHtml(s.removeBookmark)}" aria-label="${escapeHtml(s.removeBookmark)}">&times;</button>
			</div>`;
		}
		bookmarksList.innerHTML = html;
	}

	bookmarksList.addEventListener("click", async (e) => {
		const navBtn = (e.target as HTMLElement).closest(
			".bookmark-item-nav",
		) as HTMLElement | null;
		if (navBtn) {
			const query = navBtn.dataset.query;
			if (!query) return;
			closeSidePanel();
			searchInput.value = query;
			searchInput.dispatchEvent(new Event("input"));
			return;
		}
		const removeBtn = (e.target as HTMLElement).closest(
			".bookmark-item-remove",
		) as HTMLElement | null;
		if (removeBtn) {
			const id = removeBtn.dataset.id;
			if (!id) return;
			await removeBookmark(id);
			await renderBookmarksList();
			await syncBookmarkBtn();
			showToast(t().bookmarkRemoved);
			return;
		}
	});

	// --- Notes panel ---

	function sortedBookIndex(book: string): number {
		const keys = getBookKeys();
		const idx = keys.indexOf(book);
		return idx === -1 ? 9999 : idx;
	}

	async function renderNotesList() {
		const s = t();
		const notes = await getNotes();
		notes.sort((a, b) => {
			const bi = sortedBookIndex(a.book) - sortedBookIndex(b.book);
			if (bi !== 0) return bi;
			if (a.chapter !== b.chapter) return a.chapter - b.chapter;
			return a.verse - b.verse;
		});
		if (notes.length === 0) {
			notesList.innerHTML = `<p class="notes-empty">${escapeHtml(s.notesEmpty)}</p>`;
			return;
		}
		let html = "";
		for (const note of notes) {
			const refLabel = `${displayName(note.book)} ${note.chapter}:${note.verse}`;
			html += `<div class="note-item">
				<button class="note-item-body" type="button" data-query="${escapeHtml(refLabel)}" title="${escapeHtml(note.text)}">
					<span class="note-item-ref">${escapeHtml(refLabel)}</span>
					<span class="note-item-text">${escapeHtml(note.text)}</span>
				</button>
				<button class="note-item-remove" type="button" data-id="${escapeHtml(note.id)}" title="${escapeHtml(s.noteDeleteConfirm)}" aria-label="${escapeHtml(s.noteDeleteConfirm)}">&times;</button>
			</div>`;
		}
		notesList.innerHTML = html;
	}

	notesList.addEventListener("click", async (e) => {
		const navBtn = (e.target as HTMLElement).closest(".note-item-body") as HTMLElement | null;
		if (navBtn) {
			const query = navBtn.dataset.query;
			if (!query) return;
			closeSidePanel();
			searchInput.value = query;
			searchInput.dispatchEvent(new Event("input"));
			return;
		}
		const removeBtn = (e.target as HTMLElement).closest(
			".note-item-remove",
		) as HTMLElement | null;
		if (removeBtn) {
			const id = removeBtn.dataset.id;
			if (!id) return;
			await deleteNote(id);
			const newMap = await getNoteMap();
			setNoteMap(newMap);
			updateSidenoteDom(id, null);
			requestAnimationFrame(syncSidenotes);
			await renderNotesList();
			return;
		}
	});

	// --- Note editor dialog ---

	let noteDialogCurrentId = "";

	function openNoteDialog(book: string, chapter: number, verse: number) {
		const id = `${book}:${chapter}:${verse}`;
		const existingText = getRenderNoteMap().get(id) ?? "";
		const refLabel = `${displayName(book)} ${chapter}:${verse}`;
		noteDialogCurrentId = id;
		noteDialogTitle.textContent = existingText ? t().editNote : t().addNote;
		noteDialogRef.textContent = refLabel;
		// Show the verse text in the panel header
		const verseText = data?.[book]?.[String(chapter)]?.[String(verse)] ?? "";
		notePanelVerse.textContent = verseText ?? "";
		notePanelVerse.style.display = verseText ? "" : "none";
		noteDialogTextarea.value = existingText;
		noteDialogTextarea.placeholder = t().notePlaceholder;
		noteDialogSave.textContent = t().noteSave;
		noteDialogDelete.textContent = t().noteRemove;
		noteDialogDelete.style.display = existingText ? "inline-flex" : "none";
		noteDialogCancel.textContent = t().cancel;
		noteDialogOverlay.classList.add("open");
		// Focus textarea after transition completes
		setTimeout(() => noteDialogTextarea.focus(), 300);
	}

	function closeNoteDialog() {
		noteDialogOverlay.classList.remove("open");
		noteDialogCurrentId = "";
	}

	noteDialogCancel.addEventListener("click", closeNoteDialog);
	notePanelClose.addEventListener("click", closeNoteDialog);

	noteDialogOverlay.addEventListener("click", (e) => {
		if (e.target === noteDialogOverlay) closeNoteDialog();
	});

	// QR overlay close
	const qrCloseBtn = document.getElementById("qr-close-btn");
	if (qrCloseBtn) qrCloseBtn.addEventListener("click", closeQrOverlay);
	const qrOverlay = document.getElementById("qr-overlay");
	if (qrOverlay)
		qrOverlay.addEventListener("click", (e) => {
			if (e.target === qrOverlay) closeQrOverlay();
		});

	noteDialogSave.addEventListener("click", async () => {
		const text = noteDialogTextarea.value.trim();
		if (!text || !noteDialogCurrentId) {
			closeNoteDialog();
			return;
		}
		const [bookPart, chapterStr, verseStr] = noteDialogCurrentId.split(":");
		// Handle book names that contain colons (none do, but defensive parse)
		const note: VerseNote = {
			id: noteDialogCurrentId,
			book: bookPart,
			chapter: +chapterStr,
			verse: +verseStr,
			text,
			updatedAt: Date.now(),
		};
		await saveNote(note);
		const newMap = await getNoteMap();
		setNoteMap(newMap);
		// Update the sidenote in the DOM if the verse is currently displayed
		updateSidenoteDom(noteDialogCurrentId, text);
		requestAnimationFrame(() => requestAnimationFrame(syncSidenotes));
		closeNoteDialog();
		showToast(t().noteSaved);
	});

	noteDialogDelete.addEventListener("click", async () => {
		if (!noteDialogCurrentId) return;
		await deleteNote(noteDialogCurrentId);
		const newMap = await getNoteMap();
		setNoteMap(newMap);
		// Remove the sidenote from DOM if visible
		updateSidenoteDom(noteDialogCurrentId, null);
		requestAnimationFrame(() => requestAnimationFrame(syncSidenotes));
		closeNoteDialog();
		showToast(t().noteDeleted);
	});

	/** Update or remove a sidenote element in the currently rendered content without full re-render. */
	function updateSidenoteDom(noteId: string, text: string | null) {
		const aside = (content.querySelector(
			`.verse-sidenote[data-note-id="${CSS.escape(noteId)}"]`,
		) ??
			sidenoteRail.querySelector(
				`.verse-sidenote[data-note-id="${CSS.escape(noteId)}"]`,
			)) as HTMLElement | null;
		// All markers with this noteId — may be >1 in parallel mode (one per column)
		const markers = Array.from(
			content.querySelectorAll<HTMLElement>(
				`.verse-note-marker[data-note-id="${CSS.escape(noteId)}"]`,
			),
		);

		if (text === null) {
			// Delete: remove aside and all markers (may be >1 in parallel mode), then renumber
			aside?.remove();
			markers.forEach((m) => m.remove());
			// Renumber remaining markers, grouping by noteId so all markers for the
			// same note share the same number (parallel mode has one marker per column).
			const seenIds = new Map<string, number>();
			let counter = 0;
			content.querySelectorAll<HTMLElement>(".verse-note-marker").forEach((m) => {
				const id = m.dataset.noteId;
				if (!id) return;
				if (!seenIds.has(id)) seenIds.set(id, ++counter);
				const num = seenIds.get(id)!;
				m.textContent = `[${num}]`;
				m.setAttribute("aria-label", `Note ${num}`);
			});
			for (const [id, num] of seenIds) {
				const numEl =
					content.querySelector(
						`.verse-sidenote[data-note-id="${CSS.escape(id)}"] .verse-sidenote-num`,
					) ??
					sidenoteRail.querySelector(
						`.verse-sidenote[data-note-id="${CSS.escape(id)}"] .verse-sidenote-num`,
					);
				if (numEl) numEl.textContent = String(num);
			}
		} else if (aside) {
			// Update existing sidenote text (also update secondary aside if present)
			const textEl = aside.querySelector(".verse-sidenote-text");
			if (textEl) textEl.textContent = text;
			const secondaryAside = content.querySelector(
				`.verse-sidenote[data-note-id="${CSS.escape(noteId)}"][data-secondary]`,
			) as HTMLElement | null;
			const secTextEl = secondaryAside?.querySelector(".verse-sidenote-text");
			if (secTextEl) secTextEl.textContent = text;
		} else {
			// New note: inject marker into every matching verse span (parallel has one per column),
			// and insert a primary aside after the first verse element and a secondary aside
			// (data-secondary="1") after each additional verse element (for mobile inline toggle).
			const [book, chapterStr, verseStr] = noteId.split(":");
			const verseEls = Array.from(
				content.querySelectorAll<HTMLElement>(
					`.verse[data-book="${CSS.escape(book)}"][data-chapter="${chapterStr}"][data-verse="${verseStr}"]`,
				),
			);
			if (verseEls.length > 0) {
				// Count unique notes already in DOM — each note has one marker per column
				const existingIds = new Set(
					Array.from(content.querySelectorAll<HTMLElement>(".verse-note-marker")).map(
						(m) => m.dataset.noteId,
					),
				);
				const num = existingIds.size + 1;
				const label = `[${num}]`;

				for (const verseEl of verseEls) {
					const sup = document.createElement("sup");
					sup.className = "verse-note-marker";
					sup.dataset.noteId = noteId;
					sup.setAttribute("role", "button");
					sup.setAttribute("tabindex", "0");
					sup.setAttribute("aria-label", `Note ${num}`);
					sup.textContent = label;
					verseEl.appendChild(sup);
				}

				function makeAside(secondary: boolean): HTMLElement {
					const el = document.createElement("aside");
					el.className = "verse-sidenote";
					el.dataset.noteId = noteId;
					if (secondary) el.dataset.secondary = "1";
					const numSpan = document.createElement("span");
					numSpan.className = "verse-sidenote-num";
					numSpan.textContent = String(num);
					const textSpan = document.createElement("span");
					textSpan.className = "verse-sidenote-text";
					textSpan.textContent = text;
					el.appendChild(numSpan);
					el.appendChild(textSpan);
					return el;
				}

				// Primary aside after first verse element (moved to rail on desktop)
				verseEls[0].insertAdjacentElement("afterend", makeAside(false));
				// Secondary aside after each additional verse element (mobile inline toggle only)
				for (let i = 1; i < verseEls.length; i++) {
					verseEls[i].insertAdjacentElement("afterend", makeAside(true));
				}
			}
		}
	}

	/**
	 * On desktop (≥1024px): move all `.verse-sidenote` asides from `content` to
	 * `#sidenotes-rail` and position each one opposite its verse element.
	 * On mobile: restore any previously moved asides back into `content`.
	 */
	syncSidenotes = function () {
		// Step 1: restore asides from rail back to their verse in content.
		// If the verse is no longer in the current view, discard the aside —
		// it will be re-created by the renderer when that chapter is visited again.
		for (const aside of Array.from(
			sidenoteRail.querySelectorAll<HTMLElement>(".verse-sidenote"),
		)) {
			const noteId = aside.dataset.noteId;
			if (!noteId) {
				aside.remove();
				continue;
			}
			aside.style.top = "";
			const [book, chapterStr, verseStr] = noteId.split(":");
			const verseEl = content.querySelector(
				`.verse[data-book="${CSS.escape(book)}"][data-chapter="${chapterStr}"][data-verse="${verseStr}"]`,
			) as HTMLElement | null;
			if (verseEl) {
				// Remove any freshly-rendered aside already in content to prevent duplication
				content
					.querySelector(`.verse-sidenote[data-note-id="${CSS.escape(noteId)}"]`)
					?.remove();
				verseEl.insertAdjacentElement("afterend", aside);
			} else aside.remove(); // verse not in current view — discard
		}

		if (window.innerWidth < 768) return; // tablet/mobile: keep in content

		// Step 2: collect from content, compute positions, then move to rail.
		// Skip secondary asides (parallel column) — they are only for mobile inline toggling.
		const asides = Array.from(
			content.querySelectorAll<HTMLElement>(".verse-sidenote:not([data-secondary])"),
		);
		// Discard any secondary asides still in content — not needed on desktop
		content
			.querySelectorAll<HTMLElement>(".verse-sidenote[data-secondary]")
			.forEach((el) => el.remove());
		if (!asides.length) return;

		const railRect = sidenoteRail.getBoundingClientRect();
		const entries = asides.map((aside) => {
			const noteId = aside.dataset.noteId!;
			const [book, chapterStr, verseStr] = noteId.split(":");
			const verseEl = content.querySelector(
				`.verse[data-book="${CSS.escape(book)}"][data-chapter="${chapterStr}"][data-verse="${verseStr}"]`,
			) as HTMLElement | null;
			const top = verseEl ? verseEl.getBoundingClientRect().top - railRect.top : 0;
			return { aside, top };
		});

		// Sort by desired position, then cascade downward to prevent overlap
		entries.sort((a, b) => a.top - b.top);
		let minTop = 0;
		for (const { aside, top } of entries) {
			const actualTop = Math.max(top, minTop);
			aside.style.top = `${actualTop}px`;
			sidenoteRail.appendChild(aside);
			minTop = actualTop + aside.offsetHeight + 8; // 8px gap between stacked notes
		}
	};

	// Handle .verse-note-marker clicks: toggle sidenote on mobile, do nothing on desktop.
	// Must use stopImmediatePropagation so the verse-menu sup handler never fires.
	content.addEventListener("click", (e) => {
		const marker = (e.target as HTMLElement).closest(
			".verse-note-marker",
		) as HTMLElement | null;
		if (!marker) return;
		e.stopImmediatePropagation();
		// On wide screens sidenotes are always visible — nothing to toggle
		if (window.innerWidth >= 768) return;
		const noteId = marker.dataset.noteId;
		if (!noteId) return;
		// Find the aside in the same parallel column as the tapped marker (or anywhere in content)
		const col = marker.closest(".parallel-col") as HTMLElement | null;
		const scope = col ?? content;
		const aside = scope.querySelector(
			`.verse-sidenote[data-note-id="${CSS.escape(noteId)}"]`,
		) as HTMLElement | null;
		if (aside) aside.classList.toggle("note-open");
	});

	// Clicking the sidenote number opens the note editor panel (both in content and rail).
	function handleSidenoteNumClick(e: MouseEvent) {
		const num = (e.target as HTMLElement).closest(".verse-sidenote-num") as HTMLElement | null;
		if (!num) return;
		e.stopImmediatePropagation();
		const aside = num.closest(".verse-sidenote") as HTMLElement | null;
		const noteId = aside?.dataset.noteId;
		if (!noteId) return;
		const [book, chapterStr, verseStr] = noteId.split(":");
		openNoteDialog(book, Number(chapterStr), Number(verseStr));
	}
	content.addEventListener("click", handleSidenoteNumClick);
	sidenoteRail.addEventListener("click", handleSidenoteNumClick);

	// Hovering a sidenote highlights the referenced verse with an animated underline.
	function setVerseHighlight(noteId: string, on: boolean) {
		const [book, chapterStr, verseStr] = noteId.split(":");
		const targets = content.querySelectorAll(
			`.verse[data-book="${CSS.escape(book)}"][data-chapter="${chapterStr}"][data-verse="${verseStr}"]`,
		);
		targets.forEach((el) => (el as HTMLElement).classList.toggle("note-hover", on));
	}
	function handleSidenoteMouseEnter(e: MouseEvent) {
		// Only fire when entering the aside itself (not moving between children)
		const related = e.relatedTarget as HTMLElement | null;
		const aside = (e.target as HTMLElement).closest(".verse-sidenote") as HTMLElement | null;
		if (!aside) return;
		if (related && aside.contains(related)) return;
		setVerseHighlight(aside.dataset.noteId!, true);
	}
	function handleSidenoteMouseLeave(e: MouseEvent) {
		// Only fire when leaving the aside entirely
		const related = e.relatedTarget as HTMLElement | null;
		const aside = (e.target as HTMLElement).closest(".verse-sidenote") as HTMLElement | null;
		if (!aside) return;
		if (related && aside.contains(related)) return;
		setVerseHighlight(aside.dataset.noteId!, false);
	}
	sidenoteRail.addEventListener("mouseover", handleSidenoteMouseEnter);
	sidenoteRail.addEventListener("mouseout", handleSidenoteMouseLeave);
	content.addEventListener("mouseover", handleSidenoteMouseEnter);
	content.addEventListener("mouseout", handleSidenoteMouseLeave);

	// Close panels with Escape, Ctrl+K to focus search, Ctrl+I to toggle index
	document.addEventListener("keydown", (e) => {
		if (e.key === "Escape") {
			if (document.getElementById("qr-overlay")?.classList.contains("open")) {
				closeQrOverlay();
				return;
			}
			if (noteDialogOverlay.classList.contains("open")) {
				closeNoteDialog();
				return;
			}
			if (document.querySelectorAll(".share-wrap.share-open").length > 0) {
				document
					.querySelectorAll<HTMLElement>(".share-wrap.share-open")
					.forEach((w) => w.classList.remove("share-open"));
				return;
			}
			if (strongsPanel.classList.contains("open")) {
				closeStrongsPanel();
				return;
			}
			if (verseMenu.classList.contains("open")) {
				closeVerseMenu();
				return;
			}
			if (sideOverlay.classList.contains("open")) {
				closeSidePanel();
				return;
			}
			if (overlay.classList.contains("open")) {
				closeIndex();
				return;
			}
		}
		if ((e.ctrlKey || e.metaKey) && e.key === "k") {
			e.preventDefault();
			if (overlay.classList.contains("open")) closeIndex();
			searchInput.focus();
			searchInput.select();
		}
		if ((e.ctrlKey || e.metaKey) && e.key === "i") {
			e.preventDefault();
			toggleIndex();
		}
		if ((e.ctrlKey || e.metaKey) && e.key === "b") {
			e.preventDefault();
			if (sideOverlay.classList.contains("open")) {
				closeSidePanel();
			} else {
				openSidePanel();
			}
		}
	});

	// --- Click handlers for rendered content ---
	document.addEventListener("click", (e) => {
		// Click outside any open share dropdown → close it
		if (!(e.target as HTMLElement).closest(".share-wrap")) {
			document
				.querySelectorAll<HTMLElement>(".share-wrap.share-open")
				.forEach((w) => w.classList.remove("share-open"));
		}
	});
	content.addEventListener("click", async (e) => {
		// Click on nav arrow → navigate to prev/next chapter/verse
		const arrow = (e.target as HTMLElement).closest(".nav-arrow") as HTMLElement;
		if (arrow && !arrow.classList.contains("nav-disabled")) {
			const b = arrow.dataset.book!;
			const c = arrow.dataset.chapter;
			const v = arrow.dataset.verse;
			if (v !== undefined) {
				navigate({ book: b, chapter: +c!, verse: +v });
			} else if (c !== undefined) {
				navigate({ book: b, chapter: +c });
			} else {
				navigate({ book: b });
			}
			return;
		}

		// Click on search result → navigate to verse
		const result = (e.target as HTMLElement).closest(".result") as HTMLElement;
		if (result) {
			const b = result.dataset.book!;
			const c = +result.dataset.chapter!;
			const v = +result.dataset.verse!;
			navigate({ book: b, chapter: c, verse: v });
			return;
		}

		// Click on "Read the full chapter" link
		const fullChapter = (e.target as HTMLElement).closest(".full-chapter-link") as HTMLElement;
		if (fullChapter) {
			navigate({ book: fullChapter.dataset.book!, chapter: +fullChapter.dataset.chapter! });
			return;
		}

		// Click on chapter heading in book view → navigate to chapter
		const heading = (e.target as HTMLElement).closest(".chapter-heading") as HTMLElement;
		if (heading) {
			navigate({ book: heading.dataset.book!, chapter: +heading.dataset.chapter! });
			return;
		}

		// Click on Strong's number → open definition panel
		const strongsEl = (e.target as HTMLElement).closest(".il-strongs") as HTMLElement;
		if (strongsEl) {
			const word = strongsEl.closest(".il-word") as HTMLElement;
			if (word?.dataset.strongs) {
				openStrongsPanel(word.dataset.strongs);
			}
			return;
		}

		// Click on interlinear word → open definition panel
		const ilWord = (e.target as HTMLElement).closest(".il-word") as HTMLElement;
		if (ilWord?.dataset.strongs) {
			openStrongsPanel(ilWord.dataset.strongs);
			return;
		}

		// Click on interlinear toggle button
		const ilToggle = (e.target as HTMLElement).closest(".il-toggle-btn") as HTMLElement;
		if (ilToggle) {
			const enabled = !getInterlinearEnabled();
			setInterlinearEnabled(enabled);
			localStorage.setItem("bible-interlinear", enabled ? "1" : "0");
			updateIlToggle();
			const state = readState();
			applyState(state);
			replaceState(withTranslationParams(stateForUrl(state)));
			return;
		}

		// Click on share button → toggle dropdown
		const shareBtn = (e.target as HTMLElement).closest(".share-btn") as HTMLElement;
		if (shareBtn) {
			e.preventDefault();
			e.stopPropagation();
			const wrap = shareBtn.closest(".share-wrap") as HTMLElement;
			if (wrap) {
				const isOpen = wrap.classList.contains("share-open");
				document
					.querySelectorAll<HTMLElement>(".share-wrap.share-open")
					.forEach((w) => w.classList.remove("share-open"));
				if (!isOpen) wrap.classList.add("share-open");
			}
			return;
		}

		// Click on share option → copy link to clipboard
		const shareOpt = (e.target as HTMLElement).closest(".share-opt") as HTMLElement;
		if (shareOpt) {
			e.preventDefault();
			const url = new URL(window.location.href);
			if (shareOpt.dataset.share === "without") {
				url.searchParams.delete("t");
			}
			shareOpt.closest(".share-wrap")?.classList.remove("share-open");
			if (shareOpt.dataset.share === "qr") {
				showQrOverlay(url.toString());
			} else {
				navigator.clipboard.writeText(url.toString()).then(() => showToast(t().linkCopied));
			}
			return;
		}

		// Click on copy button → copy text to clipboard
		const copyBtn = (e.target as HTMLElement).closest(".copy-btn") as HTMLElement;
		if (copyBtn) {
			e.preventDefault();
			const book = copyBtn.dataset.copyBook!;
			const chapter = +copyBtn.dataset.copyChapter!;
			const verse = copyBtn.dataset.copyVerse;
			const segments = copyBtn.dataset.copySegments;
			const source = copyBtn.dataset.copySource || "";
			const chapterEnd =
				copyBtn.dataset.copyChapterEnd !== undefined
					? +copyBtn.dataset.copyChapterEnd
					: undefined;
			const verseStart =
				copyBtn.dataset.copyVerseStart !== undefined
					? +copyBtn.dataset.copyVerseStart
					: undefined;
			const verseEnd =
				copyBtn.dataset.copyVerseEnd !== undefined
					? +copyBtn.dataset.copyVerseEnd
					: undefined;
			const translationLabel = (code: string) => {
				const info = TRANSLATION_NAMES[code];
				return info ? `${code} — ${info.name}` : code;
			};

			const includePrimary = source !== "secondary";
			const includeSecondary =
				source !== "primary" && !!parallelData && !!parallelTranslation;

			function buildVerseNums(): number[] {
				if (segments) {
					const nums: number[] = [];
					for (const p of segments.split(",")) {
						const range = p.split("-").map(Number);
						if (range.length === 2)
							for (let v = range[0]; v <= range[1]; v++) nums.push(v);
						else nums.push(range[0]);
					}
					return nums;
				}
				return [];
			}

			function formatSection(sourceData: BibleData, code: string): string {
				const titleBook = displayNameFor(code, book);
				if (verse) {
					const v = sourceData[book]?.[String(chapter)]?.[verse];
					if (!v) return "";
					return `${translationLabel(code)}\n${titleBook} ${chapter}:${verse}\n${verse} ${v}`;
				} else if (segments) {
					const ch = sourceData[book]?.[String(chapter)];
					if (!ch) return "";
					const nums = buildVerseNums();
					return (
						`${translationLabel(code)}\n${titleBook} ${chapter}:${segments}\n` +
						nums
							.filter((n) => ch[String(n)])
							.map((n) => `${n} ${ch[String(n)]}`)
							.join("\n")
					);
				} else if (
					chapterEnd !== undefined &&
					verseStart !== undefined &&
					verseEnd !== undefined
				) {
					// Cross-chapter verse range: Genesis 18:16-19:29
					const lines: string[] = [
						translationLabel(code),
						`${titleBook} ${chapter}:${verseStart}\u2013${chapterEnd}:${verseEnd}`,
					];
					for (let c = chapter; c <= chapterEnd; c++) {
						const ch = sourceData[book]?.[String(c)];
						if (!ch) continue;
						const vMin = c === chapter ? verseStart : 1;
						const vMax =
							c === chapterEnd ? verseEnd : Math.max(...Object.keys(ch).map(Number));
						Object.keys(ch)
							.map(Number)
							.sort((a, b) => a - b)
							.filter((n) => n >= vMin && n <= vMax)
							.forEach((n) => lines.push(`${c}:${n} ${ch[String(n)]}`));
					}
					return lines.join("\n");
				} else if (chapterEnd !== undefined) {
					// Plain chapter range: Genesis 1-2
					const lines: string[] = [
						translationLabel(code),
						`${titleBook} ${chapter}\u2013${chapterEnd}`,
					];
					for (let c = chapter; c <= chapterEnd; c++) {
						const ch = sourceData[book]?.[String(c)];
						if (!ch) continue;
						Object.keys(ch)
							.map(Number)
							.sort((a, b) => a - b)
							.forEach((n) => lines.push(`${c}:${n} ${ch[String(n)]}`));
					}
					return lines.join("\n");
				} else {
					const ch = sourceData[book]?.[String(chapter)];
					if (!ch) return "";
					const nums = Object.keys(ch)
						.map(Number)
						.sort((a, b) => a - b);
					return (
						`${translationLabel(code)}\n${titleBook} ${chapter}\n` +
						nums.map((n) => `${n} ${ch[String(n)]}`).join("\n")
					);
				}
			}

			const parts: string[] = [];
			if (includePrimary) {
				const s = formatSection(data, currentTranslation);
				if (s) parts.push(s);
			}
			if (includeSecondary) {
				const s = formatSection(parallelData!, parallelTranslation);
				if (s) parts.push(s);
			}
			const text = parts.join("\n\n");
			if (text) {
				navigator.clipboard.writeText(text).then(() => {
					showToast(t().copied);
					copyBtn.classList.add("copy-success");
					window.setTimeout(() => copyBtn.classList.remove("copy-success"), 1500);
				});
			}
			return;
		}

		// Click on bookmark button → toggle bookmark for current view
		const bookmarkBtn = (e.target as HTMLElement).closest(
			".bookmark-btn",
		) as HTMLElement | null;
		if (bookmarkBtn) {
			e.preventDefault();
			const ref = bookmarkBtn.dataset.bookmarkRef;
			const id = ref ? `q:${ref}` : currentBookmarkId();
			if (!id) return;
			const alreadyBookmarked = await hasBookmark(id);
			if (alreadyBookmarked) {
				await removeBookmark(id);
				showToast(t().bookmarkRemoved);
			} else {
				const s = readState();
				const bm: Bookmark = {
					id,
					book: ref ? undefined : s.book,
					chapter: ref ? undefined : s.chapter,
					verse: ref ? undefined : s.verse,
					query: ref ?? s.query,
					addedAt: Date.now(),
				};
				await addBookmark(bm);
				showToast(t().bookmarkAdded);
			}
			await syncBookmarkBtn();
			return;
		}
	});

	// --- Verse context menu (right-click / long-press on verse sup) ---
	let longPressTimer: number;

	function closeVerseMenu() {
		verseMenu.classList.remove("open");
		verseMenu.innerHTML = "";
	}

	async function openVerseMenu(verseEl: HTMLElement, x: number, y: number) {
		const book = verseEl.dataset.book!;
		const chapter = +verseEl.dataset.chapter!;
		const verse = +verseEl.dataset.verse!;
		const hlKey = `${book}:${chapter}:${verse}`;
		const currentColor = highlightMap.get(hlKey);

		const colors: HighlightColor[] = ["yellow", "green", "blue", "pink", "orange"];
		// Localized color names for aria-labels and tooltips
		const lang = getLanguage();
		const colorTitles: Record<HighlightColor, string> = {
			yellow: lang === "fi" ? "Keltainen" : lang === "sv" ? "Gul" : "Yellow",
			green: lang === "fi" ? "Vihreä" : lang === "sv" ? "Grön" : "Green",
			blue: lang === "fi" ? "Sininen" : lang === "sv" ? "Blå" : "Blue",
			pink: lang === "fi" ? "Pinkki" : lang === "sv" ? "Rosa" : "Pink",
			orange: lang === "fi" ? "Oranssi" : lang === "sv" ? "Orange" : "Orange",
		};
		let html = "";

		// Copy verse
		html += `<button class="verse-menu-item" data-action="copy" role="menuitem">${ICON_COPY} ${t().copyVerse}</button>`;

		// Bookmark verse
		const bmId = `${book}:${chapter}:${verse}`;
		const isVerseBookmarked = await hasBookmark(bmId);
		html += `<button class="verse-menu-item" data-action="bookmark" role="menuitem">${ICON_BOOKMARK} ${isVerseBookmarked ? escapeHtml(t().removeBookmark) : escapeHtml(t().bookmarkThis)}</button>`;

		// Note verse
		const noteId = `${book}:${chapter}:${verse}`;
		const hasNote = getRenderNoteMap().has(noteId);
		html += `<button class="verse-menu-item" data-action="note" role="menuitem">${ICON_NOTE} ${hasNote ? escapeHtml(t().editNote) : escapeHtml(t().addNote)}</button>`;

		// Highlight colors
		html += `<div class="verse-menu-colors" role="group" aria-label="Highlight color">`;
		for (const c of colors) {
			html += `<button class="color-dot${currentColor === c ? " active" : ""}" type="button" role="menuitem" data-color="${c}" data-action="highlight" aria-label="${colorTitles[c]}" aria-pressed="${currentColor === c}" style="background: var(--hl-${c});"></button>`;
		}
		if (currentColor) {
			html += `<button class="color-dot" type="button" role="menuitem" data-action="remove-highlight" style="background: var(--border);" aria-label="${t().removeHighlight}">&#10005;</button>`;
		}
		html += `</div>`;
		verseMenu.innerHTML = html;
		verseMenu.classList.add("open");

		// Position menu, keeping it on screen
		const rect = verseMenu.getBoundingClientRect();
		const menuW = rect.width || 180;
		const menuH = rect.height || 120;
		let left = Math.min(x, window.innerWidth - menuW - 8);
		let top = Math.min(y, window.innerHeight - menuH - 8);
		left = Math.max(8, left);
		top = Math.max(8, top);
		verseMenu.style.left = left + "px";
		verseMenu.style.top = top + "px";

		// Handle clicks in menu
		verseMenu.onclick = async (ev) => {
			const target = (ev.target as HTMLElement).closest(
				"[data-action]",
			) as HTMLElement | null;
			if (!target) return;
			const action = target.dataset.action;

			if (action === "copy") {
				const isSecondary = verseEl.dataset.secondary === "1";
				const sourceData = isSecondary && parallelData ? parallelData : data;
				const sourceCode = isSecondary ? parallelTranslation : currentTranslation;
				const sourceInfo = TRANSLATION_NAMES[sourceCode];
				const sourceLabel = sourceInfo ? `${sourceCode} — ${sourceInfo.name}` : sourceCode;
				const text = sourceData[book]?.[String(chapter)]?.[String(verse)];
				if (text) {
					const full = `${sourceLabel}\n${displayName(book)} ${chapter}:${verse}\n${verse} ${text}`;
					navigator.clipboard.writeText(full).then(() => showToast(t().copied));
				}
			} else if (action === "bookmark") {
				const bmId = `${book}:${chapter}:${verse}`;
				const alreadyBookmarked = await hasBookmark(bmId);
				if (alreadyBookmarked) {
					await removeBookmark(bmId);
					showToast(t().bookmarkRemoved);
				} else {
					const bm: Bookmark = { id: bmId, book, chapter, verse, addedAt: Date.now() };
					await addBookmark(bm);
					showToast(t().bookmarkAdded);
				}
				await syncBookmarkBtn();
			} else if (action === "note") {
				closeVerseMenu();
				openNoteDialog(book, chapter, verse);
				return;
			} else if (action === "highlight") {
				const color = target.dataset.color as HighlightColor;
				if (color === currentColor) {
					await removeHighlight(book, chapter, verse);
					highlightMap.delete(hlKey);
					content
						.querySelectorAll(
							`.verse[data-book="${CSS.escape(book)}"][data-chapter="${chapter}"][data-verse="${verse}"]`,
						)
						.forEach((el) => {
							(el as HTMLElement).className = "verse";
						});
				} else {
					await setHighlight({ book, chapter, verse, color });
					highlightMap.set(hlKey, color);
					content
						.querySelectorAll(
							`.verse[data-book="${CSS.escape(book)}"][data-chapter="${chapter}"][data-verse="${verse}"]`,
						)
						.forEach((el) => {
							(el as HTMLElement).className = `verse hl-${color}`;
						});
				}
			} else if (action === "remove-highlight") {
				await removeHighlight(book, chapter, verse);
				highlightMap.delete(hlKey);
				content
					.querySelectorAll(
						`.verse[data-book="${CSS.escape(book)}"][data-chapter="${chapter}"][data-verse="${verse}"]`,
					)
					.forEach((el) => {
						(el as HTMLElement).className = "verse";
					});
			}
			closeVerseMenu();
		};
	}

	// Left-click on verse sup number
	content.addEventListener("click", (e) => {
		const sup = (e.target as HTMLElement).closest("sup");
		if (!sup) return;
		const verseEl = sup.closest(".verse") as HTMLElement;
		if (!verseEl || !verseEl.dataset.book) return;
		e.stopPropagation();
		openVerseMenu(verseEl, e.clientX, e.clientY);
	});

	// Long-press for touch devices
	content.addEventListener(
		"touchstart",
		(e) => {
			const sup = (e.target as HTMLElement).closest("sup");
			if (!sup) return;
			// Note markers are handled separately — don't open verse menu
			if (sup.classList.contains("verse-note-marker")) return;
			const verseEl = sup.closest(".verse") as HTMLElement;
			if (!verseEl || !verseEl.dataset.book) return;
			const touch = e.touches[0];
			longPressTimer = window.setTimeout(() => {
				e.preventDefault();
				openVerseMenu(verseEl, touch.clientX, touch.clientY);
			}, 500);
		},
		{ passive: false },
	);

	content.addEventListener("touchend", () => clearTimeout(longPressTimer));
	content.addEventListener("touchmove", () => clearTimeout(longPressTimer));

	// Close verse menu on outside click
	document.addEventListener("click", (e) => {
		if (!verseMenu.contains(e.target as Node)) closeVerseMenu();
	});

	// --- Swipe navigation ---
	let touchStartX = 0;
	let touchStartY = 0;
	let touchStartTime = 0;

	content.addEventListener(
		"touchstart",
		(e) => {
			touchStartX = e.touches[0].clientX;
			touchStartY = e.touches[0].clientY;
			touchStartTime = Date.now();
		},
		{ passive: true },
	);

	content.addEventListener(
		"touchend",
		(e) => {
			const dx = e.changedTouches[0].clientX - touchStartX;
			const dy = e.changedTouches[0].clientY - touchStartY;
			const dt = Date.now() - touchStartTime;
			// Only count horizontal swipes that are fast and far enough
			if (dt > 500 || Math.abs(dx) < 80 || Math.abs(dy) > Math.abs(dx) * 0.5) return;

			const arrow =
				dx > 0
					? (content.querySelector(
							".nav-arrow.nav-prev:not(.nav-disabled)",
						) as HTMLElement)
					: (content.querySelector(
							".nav-arrow.nav-next:not(.nav-disabled)",
						) as HTMLElement);
			if (arrow) arrow.click();
		},
		{ passive: true },
	);

	// --- Browser back/forward ---
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

				// Auto-switch UI language to match translation
				const newLang = TRANSLATION_LANG[s.translation];
				if (newLang && newLang !== getLanguage()) {
					setLanguage(newLang);
					localStorage.setItem("bible-language", newLang);
					activateSegmented(languageSegmented, newLang);
					updateStaticText();
				}

				indexRendered = false;
				indexScrollTo = null;
				if (overlay.classList.contains("open")) openIndex();
				if (translationSelect) translationSelect.value = s.translation;
				updateFooter();
			} catch {
				/* keep current translation */
			}
		}

		// Restore parallel translation from URL
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
						if (shRes.ok) setSecondarySubheadings(await shRes.json());
					} catch {}
				} catch {
					parallelTranslation = "";
					parallelData = null;
					setSecondaryDescriptions([]);
					setSecondarySubheadings({});
				}
			}
			localStorage.setItem("bible-parallel", parallelTranslation);
			if (parallelSelect) parallelSelect.value = parallelTranslation;
		}

		searchInput.value = stateToInputText(s);
		applyState(s);
	});
}

function navigate(s: AppState) {
	const searchInput = document.getElementById("search-input") as HTMLInputElement;
	searchInput.value = stateToInputText(s);
	document.getElementById("index-overlay")!.classList.remove("open");
	document.body.classList.remove("panel-open");
	document.body.style.paddingRight = "";
	applyState(s);
	pushState(withTranslationParams(s));
}

function renderNavRef(nav: NavRef) {
	const { book, chapterStart, chapterEnd, verseSegments } = nav;
	const useParallel = !!parallelData && !!parallelTranslation;

	if (chapterStart !== undefined && chapterEnd !== undefined) {
		if (verseSegments) {
			// Single verse: Genesis 1:2
			if (verseSegments.length === 1 && verseSegments[0].start === verseSegments[0].end) {
				if (useParallel) {
					renderParallelVerse(
						data,
						parallelData!,
						book,
						chapterStart,
						verseSegments[0].start,
						currentTranslation,
						parallelTranslation,
					);
				} else {
					renderVerse(data, book, chapterStart, verseSegments[0].start);
				}
			} else {
				// Verse segments: Genesis 8:1-3 or Genesis 8:1-3,6
				if (useParallel) {
					renderParallelVerseSegments(
						data,
						parallelData!,
						book,
						chapterStart,
						verseSegments,
						currentTranslation,
						parallelTranslation,
					);
				} else {
					renderVerseSegments(data, book, chapterStart, verseSegments);
				}
			}
		} else if (chapterStart === chapterEnd) {
			// Single chapter: Genesis 8
			if (useParallel) {
				renderParallelChapter(
					data,
					parallelData!,
					book,
					chapterStart,
					currentTranslation,
					parallelTranslation,
				);
			} else {
				renderChapter(data, book, chapterStart);
			}
		} else {
			// Chapter range (with optional verse bounds): Genesis 8-10 or Genesis 18:16-19:29
			renderChapterRange(data, book, chapterStart, chapterEnd, nav.verseStart, nav.verseEnd);
		}
	} else {
		// Whole book: Genesis → show chapter 1
		if (useParallel) {
			renderParallelChapter(
				data,
				parallelData!,
				book,
				1,
				currentTranslation,
				parallelTranslation,
			);
		} else {
			renderChapter(data, book, 1);
		}
	}
}

function updateTitle(s: AppState) {
	let label: string;
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

function queryToUrlState(q: string): AppState {
	const navRefs = tryParseNav(q);
	if (!navRefs || navRefs.length !== 1 || !data[navRefs[0].book]) return { query: q };
	const nav = navRefs[0];
	if (nav.chapterStart === undefined) {
		return { book: nav.book, chapter: 1 };
	}
	if (nav.chapterStart === nav.chapterEnd && !nav.verseSegments) {
		return { book: nav.book, chapter: nav.chapterStart };
	}
	if (
		nav.chapterStart === nav.chapterEnd &&
		nav.verseSegments &&
		nav.verseSegments.length === 1 &&
		nav.verseSegments[0].start === nav.verseSegments[0].end
	) {
		return { book: nav.book, chapter: nav.chapterStart, verse: nav.verseSegments[0].start };
	}
	return { query: q };
}

function stateForUrl(s: AppState): AppState {
	if (s.query) return queryToUrlState(s.query);
	return s;
}

function currentBookmarkId(): string {
	const s = readState();
	if (s.book && s.chapter && s.verse) return `${s.book}:${s.chapter}:${s.verse}`;
	if (s.book && s.chapter) return `${s.book}:${s.chapter}`;
	if (s.book) return s.book;
	if (s.query) return `q:${s.query}`;
	return "";
}

function bookmarkNavText(bm: Bookmark): string {
	if (bm.book && bm.chapter !== undefined && bm.verse !== undefined)
		return `${displayName(bm.book)} ${bm.chapter}:${bm.verse}`;
	if (bm.book && bm.chapter !== undefined) return `${displayName(bm.book)} ${bm.chapter}`;
	if (bm.book) return displayName(bm.book);
	if (bm.query) return bm.query;
	return bm.id;
}

async function syncBookmarkBtn() {
	const btns = document.querySelectorAll<HTMLElement>("#content .bookmark-btn");
	for (const btn of btns) {
		const ref = btn.dataset.bookmarkRef;
		const id = ref ? `q:${ref}` : currentBookmarkId();
		if (!id) {
			btn.classList.remove("bookmark-active");
			btn.title = t().bookmarkThis;
			btn.setAttribute("aria-label", t().bookmarkThis);
			continue;
		}
		const active = await hasBookmark(id);
		btn.classList.toggle("bookmark-active", active);
		btn.title = active ? t().removeBookmark : t().bookmarkThis;
		btn.setAttribute("aria-label", active ? t().removeBookmark : t().bookmarkThis);
	}
}

async function applyState(s: AppState) {
	const useParallel = !!parallelData && !!parallelTranslation;

	// Determine which book(s) will be rendered and preload interlinear data
	if (getInterlinearEnabled() && isKJV()) {
		let books: string[] = [];
		if (s.query) {
			const navGroups = tryParseNavGroups(s.query);
			if (navGroups && navGroups.flat().every((r) => !!data[r.book])) {
				books = navGroups.flat().map((r) => r.book);
			} else if (!s.query.includes('"')) {
				const termResults = parseNavTerms(s.query);
				books = termResults
					.flatMap((tr) => (tr.refs ? tr.refs.map((r) => r.book) : []))
					.filter((b) => !!data[b]);
			}
		} else if (s.book) {
			books = [s.book];
		} else {
			books = ["Genesis"];
		}
		await Promise.all(books.map((b) => ensureInterlinear(b)));
	}

	if (s.query) {
		// Check if the query is pure reference(s) → navigate instead of search
		const navGroups = tryParseNavGroups(s.query);
		if (navGroups && navGroups.flat().every((r) => !!data[r.book])) {
			const allRefs = navGroups.flat();
			if (navGroups.length === 1 && allRefs.length === 1) {
				renderNavRef(allRefs[0]);
			} else {
				if (useParallel) {
					renderParallelMultiNav(
						data,
						parallelData!,
						navGroups,
						currentTranslation,
						parallelTranslation,
					);
				} else {
					renderMultiNav(data, navGroups);
				}
			}
		} else if (!s.query.includes('"')) {
			// No quoted text filters — try per-term ref parsing for mixed valid/invalid refs
			const termResults = parseNavTerms(s.query);
			const hasAnyValidRef = termResults.some(
				(tr) => tr.refs !== null && tr.refs.every((r) => !!data[r.book]),
			);
			if (hasAnyValidRef) {
				// Mark terms whose book is missing in data as invalid
				const mixed = termResults.map((tr) =>
					tr.refs !== null && tr.refs.every((r) => !!data[r.book])
						? tr
						: { refs: null as null, term: tr.term },
				);
				if (useParallel) {
					renderParallelMixedMultiNav(
						data,
						parallelData!,
						mixed,
						currentTranslation,
						parallelTranslation,
					);
				} else {
					renderMixedMultiNav(data, mixed);
				}
			} else {
				const results = search(data, s.query);
				renderResults(results, s.query);
			}
		} else {
			const results = search(data, s.query);
			renderResults(results, s.query);
		}
	} else if (s.book && s.chapter && s.verse) {
		if (useParallel) {
			renderParallelVerse(
				data,
				parallelData!,
				s.book,
				s.chapter,
				s.verse,
				currentTranslation,
				parallelTranslation,
			);
		} else {
			renderVerse(data, s.book, s.chapter, s.verse);
		}
	} else if (s.book && s.chapter) {
		if (useParallel) {
			renderParallelChapter(
				data,
				parallelData!,
				s.book,
				s.chapter,
				currentTranslation,
				parallelTranslation,
			);
		} else {
			renderChapter(data, s.book, s.chapter);
		}
	} else if (s.book) {
		if (useParallel) {
			renderParallelBook(
				data,
				parallelData!,
				s.book,
				currentTranslation,
				parallelTranslation,
			);
		} else {
			renderBook(data, s.book);
		}
	} else {
		if (useParallel) {
			renderParallelChapter(
				data,
				parallelData!,
				"Genesis",
				1,
				currentTranslation,
				parallelTranslation,
			);
		} else {
			renderChapter(data, "Genesis", 1);
		}
	}
	updateTitle(s);
	updateFooter();
	syncBookmarkBtn();
	// Double-rAF ensures the browser has fully laid out the new content before measuring
	requestAnimationFrame(() => requestAnimationFrame(syncSidenotes));
}

const TRANSLATION_NAMES: Record<string, { name: string; language: string }> = {
	NHEB: { name: "New Heart English Bible", language: "English" },
	KJV: { name: "King James Version", language: "English" },
	CPDV: { name: "Catholic Public Domain Version", language: "English" },
	KR38: { name: "Raamattu 1933/1938", language: "Suomi" },
	SV17: { name: "Svenska Bibeln 1917", language: "Svenska" },
};

const TRANSLATION_LANG: Record<string, string> = {
	NHEB: "en",
	KJV: "en",
	CPDV: "en",
	KR38: "fi",
	SV17: "sv",
};

function updateStaticText() {
	const s = t();
	// Header buttons
	const panelBtnEl = document.getElementById("panel-btn");
	if (panelBtnEl) panelBtnEl.title = s.settings;
	const searchInput = document.getElementById("search-input") as HTMLInputElement | null;
	if (searchInput) searchInput.placeholder = s.searchPlaceholder;
	const indexBtn = document.getElementById("index-btn");
	if (indexBtn) indexBtn.title = s.browseBooks;
	// Header translation select
	const headerTransSel = document.getElementById(
		"header-translation-select",
	) as HTMLSelectElement | null;
	if (headerTransSel) {
		headerTransSel.title = s.translationLabel;
		headerTransSel.setAttribute("aria-label", s.translationLabel);
	}
	// Side tab button titles
	const tabStories = document.querySelector<HTMLElement>('.side-tab-btn[data-tab="stories"]');
	if (tabStories) tabStories.title = s.storiesTitle;
	const tabParables = document.querySelector<HTMLElement>('.side-tab-btn[data-tab="parables"]');
	if (tabParables) tabParables.title = s.parablesTitle;
	const tabTheophanies = document.querySelector<HTMLElement>(
		'.side-tab-btn[data-tab="theophanies"]',
	);
	if (tabTheophanies) tabTheophanies.title = s.theophaniesTitle;
	const tabTypology = document.querySelector<HTMLElement>('.side-tab-btn[data-tab="typology"]');
	if (tabTypology) tabTypology.title = s.typologyTitle;
	const tabBookmarks = document.querySelector<HTMLElement>('.side-tab-btn[data-tab="bookmarks"]');
	if (tabBookmarks) tabBookmarks.title = s.bookmarksTitle;
	const tabNotes = document.querySelector<HTMLElement>('.side-tab-btn[data-tab="notes"]');
	if (tabNotes) tabNotes.title = s.notesTitle;
	const tabSettings = document.querySelector<HTMLElement>('.side-tab-btn[data-tab="settings"]');
	if (tabSettings) tabSettings.title = s.settings;
	const tabInfo = document.querySelector<HTMLElement>('.side-tab-btn[data-tab="info"]');
	if (tabInfo) tabInfo.title = s.helpInfo;
	// Index column labels (for mobile sticky headers)
	const idxBooksEl = document.getElementById("idx-books");
	if (idxBooksEl) idxBooksEl.dataset.label = s.idxBooksLabel;
	const idxChaptersEl = document.getElementById("idx-chapters");
	if (idxChaptersEl) idxChaptersEl.dataset.label = s.idxChaptersLabel;
	const idxVersesEl = document.getElementById("idx-verses");
	if (idxVersesEl) idxVersesEl.dataset.label = s.idxVersesLabel;
	// Settings pane
	const settingsTitle = document.querySelector("#settings-modal-body h2");
	if (settingsTitle) settingsTitle.textContent = s.settingsTitle;
	const transLabel = document.getElementById("settings-translation-label");
	if (transLabel) transLabel.textContent = s.translationLabel;
	const langLabel = document.getElementById("settings-language-label");
	if (langLabel) langLabel.textContent = s.languageLabel;
	const themeLabel = document.getElementById("settings-theme-label");
	if (themeLabel) themeLabel.textContent = s.themeLabel;
	const parallelLabel = document.getElementById("settings-parallel-label");
	if (parallelLabel) parallelLabel.textContent = s.parallelLabel;
	const parallelSelectEl = document.getElementById("parallel-select") as HTMLSelectElement | null;
	if (parallelSelectEl && parallelSelectEl.options.length > 0) {
		parallelSelectEl.options[0].textContent = s.parallelNone;
	}
	const fontSizeLabel = document.getElementById("settings-fontsize-label");
	if (fontSizeLabel) fontSizeLabel.textContent = s.fontSizeLabel;
	const fontLabel = document.getElementById("settings-font-label");
	if (fontLabel) fontLabel.textContent = s.fontLabel;
	const fontSeg = document.getElementById("font-segmented");
	if (fontSeg) {
		const fontBtns = fontSeg.querySelectorAll<HTMLElement>(".seg-btn");
		const fontLabels = [s.fontDefault, s.fontDyslexic];
		fontBtns.forEach((btn, i) => {
			if (i < fontLabels.length) btn.textContent = fontLabels[i];
		});
	}
	const dataLabel = document.getElementById("settings-data-label");
	if (dataLabel) dataLabel.textContent = s.dataLabel;
	const exportBtn2 = document.getElementById("export-data-btn");
	if (exportBtn2) exportBtn2.textContent = s.exportData;
	const importBtn2 = document.getElementById("import-data-btn");
	if (importBtn2) importBtn2.textContent = s.importData;

	// Theme segmented button labels
	const themeSeg = document.getElementById("theme-segmented");
	if (themeSeg) {
		const labels = [s.themeSystem, s.themeLight, s.themeDark];
		const btns = themeSeg.querySelectorAll<HTMLElement>(".seg-btn");
		btns.forEach((btn, i) => {
			if (i < labels.length) btn.textContent = labels[i];
		});
	}

	// Font size segmented button labels
	const fsSeg = document.getElementById("fontsize-segmented");
	if (fsSeg) {
		const labels = [
			s.fontSizeSmall,
			s.fontSizeMedium,
			s.fontSizeLarge,
			s.fontSizeXL,
			s.fontSizeXXL,
		];
		const btns = fsSeg.querySelectorAll<HTMLElement>(".seg-btn");
		btns.forEach((btn, i) => {
			if (i < labels.length) btn.textContent = labels[i];
		});
	}

	// Info drawer
	const infoTitleEl = document.getElementById("info-title");
	if (infoTitleEl) infoTitleEl.textContent = s.infoTitle;
	const infoBody = document.getElementById("info-modal-body");
	if (infoBody) {
		infoBody.innerHTML = `
      <section><h3>${s.infoSearchTitle}</h3><p>${s.infoSearchIntro}</p><ul>${s.infoSearchItems.map((i) => `<li>${i}</li>`).join("")}</ul><p>${s.infoSearchNote}</p></section>
      <section><h3>${s.infoBrowseTitle}</h3><p>${s.infoBrowseText}</p></section>
      <section><h3>${s.infoShortcutsTitle}</h3><ul>${s.infoShortcuts.map((i) => `<li>${i}</li>`).join("")}</ul></section>
      <section><h3>${s.infoSettingsTitle}</h3><p>${s.infoSettingsText}</p></section>
      <section><h3>${s.infoFeaturesTitle}</h3><ul>${s.infoFeaturesItems.map((i) => `<li>${i}</li>`).join("")}</ul></section>
      <section><h3>${s.infoDataTitle}</h3><p>${s.infoDataText}</p></section>`;
	}

	// Footer
	const footer = document.getElementById("footer");
	if (footer) {
		footer.innerHTML = `<p>${s.footerLine1}</p><p>${s.footerDescriptions}</p><p>${s.footerStyleguide}</p><p>${s.footerDictionary}</p><p>${s.footerFavicon}</p>`;
	}

	// HTML lang attribute
	document.documentElement.lang = getLanguage();
}

function updateFooter() {
	const info = TRANSLATION_NAMES[currentTranslation];
	const name = info ? info.name : currentTranslation;
	for (const el of document.querySelectorAll<HTMLElement>(".nav-translation")) {
		el.textContent = currentTranslation;
		el.title = `${currentTranslation} \u2014 ${name}`;
	}
	for (const el of document.querySelectorAll<HTMLElement>(".parallel-translation-label")) {
		const code = el.textContent?.trim() || "";
		const ti = TRANSLATION_NAMES[code];
		if (ti) el.title = `${code} \u2014 ${ti.name}`;
	}
}

init();
