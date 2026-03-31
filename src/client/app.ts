import type { BibleData, AppState } from "./types.ts";
import { loadBible, saveBible } from "./db.ts";
import { initSearch, search, tryParseNav } from "./search.ts";
import { readState, pushState, replaceState, stateToInputText } from "./state.ts";
import { renderChapter, renderBook, renderVerse, renderResults, renderIndex } from "./render.ts";

let data: BibleData;

async function init() {
  const content = document.getElementById("content")!;
  const searchInput = document.getElementById("search-input") as HTMLInputElement;
  const indexBtn = document.getElementById("index-btn")!;
  const overlay = document.getElementById("index-overlay")!;
  const infoBtn = document.getElementById("info-btn")!;
  const infoOverlay = document.getElementById("info-overlay")!;
  const infoClose = document.getElementById("info-close")!;

  // Load Bible data: try IndexedDB first, then fetch from API
  content.innerHTML = `<p class="loading">Loading Bible\u2026</p>`;

  try {
    const cached = await loadBible();
    if (cached) {
      data = cached;
    } else {
      const res = await fetch("/bible.json");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      data = await res.json();
      await saveBible(data);
    }
  } catch (err) {
    content.innerHTML = `<p class="empty">Failed to load Bible data. Please refresh the page.</p>`;
    return;
  }

  initSearch(data);

  // Render initial state from URL
  const state = readState();
  searchInput.value = stateToInputText(state);
  applyState(state);

  // --- Search with debounce ---
  let timer: number;
  searchInput.addEventListener("input", () => {
    clearTimeout(timer);
    timer = window.setTimeout(() => {
      const q = searchInput.value.trim();
      if (!q) {
        renderChapter(data, "Genesis", 1);
        replaceState({});
        return;
      }
      // Pure reference → navigate directly
      const nav = tryParseNav(q);
      if (nav && data[nav.book]) {
        if (nav.chapter && nav.verse) {
          renderVerse(data, nav.book, nav.chapter, nav.verse);
          replaceState({ book: nav.book, chapter: nav.chapter, verse: nav.verse });
        } else if (nav.chapter) {
          renderChapter(data, nav.book, nav.chapter);
          replaceState({ book: nav.book, chapter: nav.chapter });
        } else {
          renderChapter(data, nav.book, 1);
          replaceState({ book: nav.book, chapter: 1 });
        }
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

  // Close panels with Escape, Ctrl+K to focus search, Ctrl+I to toggle index
  document.addEventListener("keydown", (e) => {
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

function applyState(s: AppState) {
  if (s.query) {
    // Check if the query is a pure reference → navigate instead of search
    const nav = tryParseNav(s.query);
    if (nav && data[nav.book]) {
      if (nav.chapter && nav.verse) {
        renderVerse(data, nav.book, nav.chapter, nav.verse);
      } else if (nav.chapter) {
        renderChapter(data, nav.book, nav.chapter);
      } else {
        renderChapter(data, nav.book, 1);
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
}

init();
