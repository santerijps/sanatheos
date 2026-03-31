import type { BibleData, AppState } from "./types.ts";
import { loadBible, saveBible } from "./db.ts";
import { initSearch, search, tryParseNav } from "./search.ts";
import type { NavRef } from "./search.ts";
import { readState, pushState, replaceState, stateToInputText } from "./state.ts";
import { renderChapter, renderChapterRange, renderBook, renderVerse, renderVerseSegments, renderMultiNav, renderResults, renderIndex } from "./render.ts";
import { setTranslation } from "./bookNames.ts";

let data: BibleData;
let currentTranslation = "WEB";
const DEFAULT_TRANSLATION = "WEB";

async function fetchTranslation(code: string): Promise<BibleData> {
  const cached = await loadBible(code);
  if (cached) return cached;
  const res = await fetch(`/bible-${encodeURIComponent(code)}.json`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const d: BibleData = await res.json();
  await saveBible(code, d);
  return d;
}

async function fetchTranslations(): Promise<string[]> {
  try {
    const res = await fetch("/translations.json");
    if (!res.ok) return [DEFAULT_TRANSLATION];
    return await res.json();
  } catch {
    return [DEFAULT_TRANSLATION];
  }
}

async function init() {
  const content = document.getElementById("content")!;
  const searchInput = document.getElementById("search-input") as HTMLInputElement;
  const indexBtn = document.getElementById("index-btn")!;
  const overlay = document.getElementById("index-overlay")!;
  const infoBtn = document.getElementById("info-btn")!;
  const infoOverlay = document.getElementById("info-overlay")!;
  const infoClose = document.getElementById("info-close")!;
  const settingsBtn = document.getElementById("settings-btn")!;
  const settingsOverlay = document.getElementById("settings-overlay")!;
  const settingsClose = document.getElementById("settings-close")!;

  // Determine initial translation from URL or localStorage
  const urlT = new URLSearchParams(window.location.search).get("t");
  currentTranslation = urlT?.toUpperCase() || localStorage.getItem("bible-translation") || DEFAULT_TRANSLATION;
  setTranslation(currentTranslation);

  // Load Bible data: try IndexedDB first, then fetch from API
  content.innerHTML = `<p class="loading">Loading Bible\u2026</p>`;

  try {
    data = await fetchTranslation(currentTranslation);
  } catch (err) {
    content.innerHTML = `<p class="empty">Failed to load Bible data. Please refresh the page.</p>`;
    return;
  }

  localStorage.setItem("bible-translation", currentTranslation);
  initSearch(data);

  // Populate translation selector
  const translationSelect = document.getElementById("translation-select") as HTMLSelectElement | null;
  if (translationSelect) {
    const translations = await fetchTranslations();
    translationSelect.innerHTML = translations.map(t =>
      `<option value="${t}"${t === currentTranslation ? " selected" : ""}>${t}</option>`
    ).join("");

    translationSelect.addEventListener("change", async () => {
      const code = translationSelect.value;
      if (code === currentTranslation) return;
      content.innerHTML = `<p class="loading">Loading ${code}\u2026</p>`;
      try {
        data = await fetchTranslation(code);
        currentTranslation = code;
        setTranslation(code);
        localStorage.setItem("bible-translation", code);
        initSearch(data);
        indexRendered = false;
        const state = readState();
        searchInput.value = stateToInputText(state);
        applyState(state);
        updateFooter();
      } catch {
        content.innerHTML = `<p class="empty">Failed to load ${code}. Please try again.</p>`;
        translationSelect.value = currentTranslation;
      }
    });
  }

  // Render initial state from URL
  const state = readState();
  searchInput.value = stateToInputText(state);
  applyState(state);
  updateFooter();

  // --- Search with debounce ---
  let timer: number;
  searchInput.addEventListener("input", () => {
    clearTimeout(timer);
    timer = window.setTimeout(() => {
      const q = searchInput.value.trim();
      if (!q) {
        renderChapter(data, "Genesis", 1);
        updateFooter();
        replaceState({});
        return;
      }
      // Pure reference(s) → navigate directly
      const navRefs = tryParseNav(q);
      if (navRefs && navRefs.every(r => !!data[r.book])) {
        if (navRefs.length === 1) {
          renderNavRef(navRefs[0]);
        } else {
          renderMultiNav(data, navRefs);
        }
        updateFooter();
        replaceState({ query: q });
      } else {
        const results = search(data, q);
        renderResults(results, q);
        replaceState({ query: q });
      }
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

  function openIndex() {
    overlay.classList.add("open");
    document.body.classList.add("panel-open");
    if (!indexRendered) {
      renderIndex(data, {
        onBook(book) { navigate({ book }); },
        onChapter(book, chapter) { navigate({ book, chapter }); },
        onVerse(book, chapter, verse) { navigate({ book, chapter, verse }); },
      });
      indexRendered = true;
    }
    // Focus the active book in the panel
    requestAnimationFrame(() => {
      const active = document.querySelector("#idx-books .idx-item.active") as HTMLElement
        ?? document.querySelector("#idx-books .idx-item") as HTMLElement;
      active?.focus();
    });
  }

  function closeIndex() {
    overlay.classList.remove("open");
    document.body.classList.remove("panel-open");
  }

  function toggleIndex() {
    if (overlay.classList.contains("open")) closeIndex();
    else openIndex();
  }

  indexBtn.addEventListener("click", toggleIndex);

  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) closeIndex();
  });

  // --- Info modal ---
  infoBtn.addEventListener("click", () => {
    infoOverlay.classList.add("open");
    document.body.classList.add("panel-open");
  });

  function closeInfo() {
    infoOverlay.classList.remove("open");
    document.body.classList.remove("panel-open");
  }

  infoClose.addEventListener("click", closeInfo);
  infoOverlay.addEventListener("click", (e) => {
    if (e.target === infoOverlay) closeInfo();
  });

  // --- Settings modal ---
  settingsBtn.addEventListener("click", () => {
    settingsOverlay.classList.add("open");
    document.body.classList.add("panel-open");
  });

  function closeSettings() {
    settingsOverlay.classList.remove("open");
    document.body.classList.remove("panel-open");
  }

  settingsClose.addEventListener("click", closeSettings);
  settingsOverlay.addEventListener("click", (e) => {
    if (e.target === settingsOverlay) closeSettings();
  });

  // Close panels with Escape, Ctrl+K to focus search, Ctrl+I to toggle index
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && settingsOverlay.classList.contains("open")) {
      closeSettings();
      return;
    }
    if (e.key === "Escape" && infoOverlay.classList.contains("open")) {
      closeInfo();
      return;
    }
    if (e.key === "Escape" && overlay.classList.contains("open")) {
      closeIndex();
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
  });

  // --- Click handlers for rendered content ---
  content.addEventListener("click", (e) => {
    // Click on nav arrow → navigate to prev/next chapter/verse
    const arrow = (e.target as HTMLElement).closest(".nav-arrow") as HTMLElement;
    if (arrow && !arrow.classList.contains("nav-disabled")) {
      const b = arrow.dataset.book!;
      const c = +arrow.dataset.chapter!;
      const v = arrow.dataset.verse;
      if (v !== undefined) {
        navigate({ book: b, chapter: c, verse: +v });
      } else {
        navigate({ book: b, chapter: c });
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

    // Click on chapter heading in book view → navigate to chapter
    const heading = (e.target as HTMLElement).closest(".chapter-heading") as HTMLElement;
    if (heading) {
      navigate({ book: heading.dataset.book!, chapter: +heading.dataset.chapter! });
      return;
    }
  });

  // --- Browser back/forward ---
  window.addEventListener("popstate", () => {
    const s = readState();
    searchInput.value = stateToInputText(s);
    applyState(s);
  });
}

function navigate(s: AppState) {
  const searchInput = document.getElementById("search-input") as HTMLInputElement;
  searchInput.value = stateToInputText(s);
  document.getElementById("index-overlay")!.classList.remove("open");
  document.body.classList.remove("panel-open");
  applyState(s);
  pushState(s);
}

function renderNavRef(nav: NavRef) {
  const { book, chapterStart, chapterEnd, verseSegments } = nav;

  if (chapterStart !== undefined && chapterEnd !== undefined) {
    if (verseSegments) {
      // Single verse: Genesis 1:2
      if (verseSegments.length === 1 && verseSegments[0].start === verseSegments[0].end) {
        renderVerse(data, book, chapterStart, verseSegments[0].start);
      } else {
        // Verse segments: Genesis 8:1-3 or Genesis 8:1-3,6
        renderVerseSegments(data, book, chapterStart, verseSegments);
      }
    } else if (chapterStart === chapterEnd) {
      // Single chapter: Genesis 8
      renderChapter(data, book, chapterStart);
    } else {
      // Chapter range: Genesis 8-10
      renderChapterRange(data, book, chapterStart, chapterEnd);
    }
  } else {
    // Whole book: Genesis → show chapter 1
    renderChapter(data, book, 1);
  }
}

function applyState(s: AppState) {
  if (s.query) {
    // Check if the query is pure reference(s) → navigate instead of search
    const navRefs = tryParseNav(s.query);
    if (navRefs && navRefs.every(r => !!data[r.book])) {
      if (navRefs.length === 1) {
        renderNavRef(navRefs[0]);
      } else {
        renderMultiNav(data, navRefs);
      }
    } else {
      const results = search(data, s.query);
      renderResults(results, s.query);
    }
  } else if (s.book && s.chapter && s.verse) {
    renderVerse(data, s.book, s.chapter, s.verse);
  } else if (s.book && s.chapter) {
    renderChapter(data, s.book, s.chapter);
  } else if (s.book) {
    renderBook(data, s.book);
  } else {
    renderChapter(data, "Genesis", 1);
  }
  updateFooter();
}

const TRANSLATION_NAMES: Record<string, string> = {
  WEB: "World English Bible",
  KR38: "Raamattu 1933/1938",
};

function updateFooter() {
  const name = TRANSLATION_NAMES[currentTranslation] || currentTranslation;
  const label = `${currentTranslation} \u2014 ${name}`;
  for (const el of document.querySelectorAll(".nav-translation")) {
    el.textContent = label;
  }
}

init();
