import type {
	StoryEntry,
	ParableEntry,
	TheophaniesEntry,
	TypologyEntry,
	Bookmark,
} from "../types.ts";
import {
	loadStories,
	saveStories,
	loadParables,
	saveParables,
	loadTheophanies,
	saveTheophanies,
	loadTypology,
	saveTypology,
	getBookmarks,
	removeBookmark,
	getNotes,
	deleteNote,
	getNoteMap,
} from "../db.ts";
import { setNoteMap } from "../render.ts";
import { t, getLanguage } from "../i18n.ts";
import { displayName, getBookKeys } from "../bookNames.ts";
import { lockScroll, unlockScroll, escapeHtml } from "../utils.ts";

export interface SidebarDeps {
	showToast: (msg: string) => void;
	syncBookmarkBtn: () => Promise<void>;
	/** Set the search input value and trigger a search. */
	setSearchInput: (val: string) => void;
	/** Open the note editor dialog for a specific verse. */
	openNoteDialog: (book: string, chapter: number, verse: number) => void;
	/** Remove sidenote from DOM (called when note is deleted from the notes list). */
	updateSidenoteDom: (noteId: string, text: string | null) => void;
	/** Trigger sidenote repositioning after a DOM change. */
	triggerSyncSidenotes: () => void;
}

export interface SidebarModule {
	openSidePanel: (tab?: string) => Promise<void>;
	closeSidePanel: () => void;
	renderBookmarksList: () => Promise<void>;
	renderNotesList: () => Promise<void>;
	preloadData: () => void;
}

function bookmarkNavText(bm: Bookmark): string {
	if (bm.book && bm.chapter !== undefined && bm.verse !== undefined)
		return `${displayName(bm.book)} ${bm.chapter}:${bm.verse}`;
	if (bm.book && bm.chapter !== undefined) return `${displayName(bm.book)} ${bm.chapter}`;
	if (bm.book) return displayName(bm.book);
	if (bm.query) return bm.query;
	return bm.id;
}

function sortedBookIndex(book: string): number {
	const keys = getBookKeys();
	const idx = keys.indexOf(book);
	return idx === -1 ? 9999 : idx;
}

function localizeRef(ref: string): string {
	const keys = getBookKeys().sort((a, b) => b.length - a.length);
	function localizeSingle(part: string): string {
		for (const key of keys) {
			if (part === key || part.startsWith(key + " ")) {
				return displayName(key) + part.slice(key.length);
			}
		}
		return part;
	}
	return ref.split("; ").map(localizeSingle).join("; ");
}

export function initSidebar(deps: SidebarDeps): SidebarModule {
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

	let lastActiveTab = localStorage.getItem("side-panel-tab") || "stories";

	// --- Data caches ---
	let storiesData: StoryEntry[] | null = null;
	let parablesData: ParableEntry[] | null = null;
	let theophaniesData: TheophaniesEntry[] | null = null;
	let typologyData: TypologyEntry[] | null = null;

	// --- Tab management ---
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

	// --- Panel open / close ---
	async function openSidePanel(tab?: string) {
		activateSideTab(tab || lastActiveTab);
		sideOverlay.classList.add("open");
		panelBtn.setAttribute("aria-expanded", "true");
		lockScroll();

		if ((tab || lastActiveTab) === "stories") {
			storiesTitleEl.textContent = t().storiesTitle;
			storiesFilter.placeholder = t().storiesFilterPlaceholder;
			storiesFilter.value = "";
			const stories = await loadStoriesData();
			renderStoriesList(stories, "");
			if (!window.matchMedia("(hover: none)").matches) storiesFilter.focus();
		}
		if ((tab || lastActiveTab) === "parables") {
			parablesTitleEl.textContent = t().parablesTitle;
			parablesFilter.placeholder = t().parablesFilterPlaceholder;
			parablesFilter.value = "";
			const parables = await loadParablesData();
			renderParablesList(parables, "");
			if (!window.matchMedia("(hover: none)").matches) parablesFilter.focus();
		}
		if ((tab || lastActiveTab) === "theophanies") {
			theophaniesTitleEl.textContent = t().theophaniesTitle;
			theophaniesFilter.placeholder = t().theophaniesFilterPlaceholder;
			theophaniesFilter.value = "";
			const theophanies = await loadTheophaniesData();
			renderTheophaniesList(theophanies, "");
			if (!window.matchMedia("(hover: none)").matches) theophaniesFilter.focus();
		}
		if ((tab || lastActiveTab) === "typology") {
			typologyTitleEl.textContent = t().typologyTitle;
			typologyFilter.placeholder = t().typologyFilterPlaceholder;
			typologyFilter.value = "";
			const typology = await loadTypologyData();
			renderTypologyList(typology, "");
			if (!window.matchMedia("(hover: none)").matches) typologyFilter.focus();
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
			if (tab === "stories") {
				storiesTitleEl.textContent = t().storiesTitle;
				storiesFilter.placeholder = t().storiesFilterPlaceholder;
				loadStoriesData().then((stories) =>
					renderStoriesList(stories, storiesFilter.value),
				);
			}
			if (tab === "parables") {
				parablesTitleEl.textContent = t().parablesTitle;
				parablesFilter.placeholder = t().parablesFilterPlaceholder;
				loadParablesData().then((parables) =>
					renderParablesList(parables, parablesFilter.value),
				);
			}
			if (tab === "theophanies") {
				theophaniesTitleEl.textContent = t().theophaniesTitle;
				theophaniesFilter.placeholder = t().theophaniesFilterPlaceholder;
				loadTheophaniesData().then((theophanies) =>
					renderTheophaniesList(theophanies, theophaniesFilter.value),
				);
			}
			if (tab === "typology") {
				typologyTitleEl.textContent = t().typologyTitle;
				typologyFilter.placeholder = t().typologyFilterPlaceholder;
				loadTypologyData().then((typology) =>
					renderTypologyList(typology, typologyFilter.value),
				);
			}
			if (tab === "bookmarks") {
				bookmarksTitleEl.textContent = t().bookmarksTitle;
				renderBookmarksList();
			}
			if (tab === "notes") {
				notesTitleEl.textContent = t().notesTitle;
				renderNotesList();
			}
		});
	});

	// --- Stories panel ---

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
		deps.setSearchInput(ref);
	});

	// --- Parables panel ---

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
		deps.setSearchInput(ref);
	});

	// --- Theophanies panel ---

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
		deps.setSearchInput(ref);
	});

	// --- Typology panel ---

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
		deps.setSearchInput(ref);
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
			deps.setSearchInput(query);
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
			await deps.syncBookmarkBtn();
			deps.showToast(t().bookmarkRemoved);
			return;
		}
	});

	// --- Notes list panel ---

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
			deps.setSearchInput(query);
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
			deps.updateSidenoteDom(id, null);
			deps.triggerSyncSidenotes();
			await renderNotesList();
			return;
		}
	});

	// --- Add bookmark handler also triggers re-render of bookmarks list ---
	// (Note: this is not called here — bookmark clicks are handled in app.ts content handler)

	function preloadData() {
		Promise.all([
			loadStoriesData(),
			loadParablesData(),
			loadTheophaniesData(),
			loadTypologyData(),
		]).catch((error) => {
			console.error(error);
		});
	}

	return { openSidePanel, closeSidePanel, renderBookmarksList, renderNotesList, preloadData };
}
