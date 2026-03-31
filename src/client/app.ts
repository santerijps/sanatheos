import type { BibleData, AppState } from "./types.ts";
import { loadBible, saveBible } from "./db.ts";
import { initSearch, search, tryParseNav, parseQueryBooks } from "./search.ts";
import type { NavRef } from "./search.ts";
import { readState, pushState, replaceState, stateToInputText } from "./state.ts";
import { renderChapter, renderChapterRange, renderBook, renderVerse, renderVerseSegments, renderMultiNav, renderResults, renderIndex, navRefLabel } from "./render.ts";
import { setTranslation, displayName } from "./bookNames.ts";
import { setLanguage, getLanguage, t } from "./i18n.ts";

let data: BibleData;
let currentTranslation = "WEB";
const DEFAULT_TRANSLATION = "WEB";
let translationRequestId = 0;

function withT(s: AppState): AppState {
  return { ...s, translation: currentTranslation };
}

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
  const initialState = readState();
  currentTranslation = initialState.translation || localStorage.getItem("bible-translation") || DEFAULT_TRANSLATION;
  setTranslation(currentTranslation);

  // Determine initial language
  const savedLang = localStorage.getItem("bible-language") || "en";
  setLanguage(savedLang);

  const languageSelect = document.getElementById("language-select") as HTMLSelectElement | null;
  if (languageSelect) languageSelect.value = savedLang;

  // Load Bible data: try IndexedDB first, then fetch from API
  content.innerHTML = `<p class="loading">${t().loadingBible}</p>`;

  try {
    data = await fetchTranslation(currentTranslation);
  } catch (err) {
    content.innerHTML = `<p class="empty">${t().loadFailed}</p>`;
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
        localStorage.setItem("bible-translation", code);
        initSearch(data);
        indexRendered = false;

        // Translate query book names to new translation
        if (parsedBooks) {
          state.query = parsedBooks.map(p => {
            if (!p.book) return p.original;
            const name = displayName(p.book);
            let result = p.rest ? `${name} ${p.rest}` : name;
            if (p.quoted) result += ` ${p.quoted}`;
            return result;
          }).join("; ");
        }

        searchInput.value = stateToInputText(state);
        applyState(state);
        replaceState(withT(state));
        updateFooter();
      } catch {
        content.innerHTML = `<p class="empty">${t().loadTranslationFailed(code)}</p>`;
        translationSelect.value = currentTranslation;
      }
    });
  }

  // Language selector
  if (languageSelect) {
    languageSelect.addEventListener("change", () => {
      const lang = languageSelect.value;
      setLanguage(lang);
      localStorage.setItem("bible-language", lang);
      updateStaticText();
      indexRendered = false;
      const state = readState();
      searchInput.value = stateToInputText(state);
      applyState(state);
      updateFooter();
    });
  }

  updateStaticText();

  // Render initial state from URL
  const state = readState();
  searchInput.value = stateToInputText(state);
  applyState(state);
  replaceState(withT(state));
  updateFooter();

  // --- Search with debounce ---
  let timer: number;
  searchInput.addEventListener("input", () => {
    clearTimeout(timer);
    timer = window.setTimeout(() => {
      const q = searchInput.value.trim();
      if (!q) {
        const s: AppState = {};
        applyState(s);
        replaceState(withT(s));
        return;
      }
      const s: AppState = { query: q };
      applyState(s);
      replaceState(withT(s));
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
  });

  // --- Browser back/forward ---
  window.addEventListener("popstate", async () => {
    const s = readState();
    if (s.translation && s.translation !== currentTranslation) {
      try {
        data = await fetchTranslation(s.translation);
        currentTranslation = s.translation;
        setTranslation(s.translation);
        localStorage.setItem("bible-translation", s.translation);
        initSearch(data);
        indexRendered = false;
        if (translationSelect) translationSelect.value = s.translation;
        updateFooter();
      } catch { /* keep current translation */ }
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
  applyState(s);
  pushState(withT(s));
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

function updateTitle(s: AppState) {
  let label: string;
  if (s.query) {
    const navRefs = tryParseNav(s.query);
    if (navRefs && navRefs.every(r => !!data[r.book])) {
      label = navRefs.map(r => navRefLabel(r)).join("; ");
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
  document.title = `${label} | Sanatheos`;
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
    } else if (/".*?"/.test(s.query)) {
      const results = search(data, s.query);
      renderResults(results, s.query);
    } else {
      renderResults([], s.query);
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
  updateTitle(s);
  updateFooter();
}

const TRANSLATION_NAMES: Record<string, string> = {
  WEB: "World English Bible",
  KR38: "Raamattu 1933/1938",
};

function updateStaticText() {
  const s = t();
  // Header buttons
  const infoBtn = document.getElementById("info-btn");
  if (infoBtn) infoBtn.title = s.helpInfo;
  const settingsBtn = document.getElementById("settings-btn");
  if (settingsBtn) settingsBtn.title = s.settings;
  const searchInput = document.getElementById("search-input") as HTMLInputElement | null;
  if (searchInput) searchInput.placeholder = s.searchPlaceholder;
  const indexBtn = document.getElementById("index-btn");
  if (indexBtn) indexBtn.title = s.browseBooks;

  // Settings modal
  const settingsTitle = document.querySelector("#settings-modal-body h2");
  if (settingsTitle) settingsTitle.textContent = s.settingsTitle;
  const transLabel = document.getElementById("settings-translation-label");
  if (transLabel) transLabel.textContent = s.translationLabel;
  const langLabel = document.getElementById("settings-language-label");
  if (langLabel) langLabel.textContent = s.languageLabel;

  // Info modal
  const infoBody = document.getElementById("info-modal-body");
  if (infoBody) {
    infoBody.innerHTML = `
      <h2>${s.infoTitle}</h2>
      <section><h3>${s.infoSearchTitle}</h3><p>${s.infoSearchIntro}</p><ul>${s.infoSearchItems.map(i => `<li>${i}</li>`).join("")}</ul><p>${s.infoSearchNote}</p></section>
      <section><h3>${s.infoBrowseTitle}</h3><p>${s.infoBrowseText}</p></section>
      <section><h3>${s.infoShortcutsTitle}</h3><ul>${s.infoShortcuts.map(i => `<li>${i}</li>`).join("")}</ul></section>
      <section><h3>${s.infoSettingsTitle}</h3><p>${s.infoSettingsText}</p></section>
      <section><h3>${s.infoDataTitle}</h3><p>${s.infoDataText}</p></section>`;
  }

  // Footer
  const footer = document.getElementById("footer");
  if (footer) {
    footer.innerHTML = `<p>${s.footerLine1}</p><p>${s.footerFavicon}</p>`;
  }

  // HTML lang attribute
  document.documentElement.lang = getLanguage() === "fi" ? "fi" : "en";
}

function updateFooter() {
  const name = TRANSLATION_NAMES[currentTranslation] || currentTranslation;
  const label = `${currentTranslation} \u2014 ${name}`;
  for (const el of document.querySelectorAll(".nav-translation")) {
    el.textContent = label;
  }
}

init();
