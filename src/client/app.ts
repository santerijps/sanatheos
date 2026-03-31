import type { BibleData, AppState } from "./types.ts";
import { loadBible, saveBible } from "./db.ts";
import { initSearch, search } from "./search.ts";
import { readState, pushState, replaceState } from "./state.ts";
import { renderChapter, renderBook, renderVerse, renderResults, renderIndex } from "./render.ts";

let data: BibleData;

async function init() {
  const content = document.getElementById("content")!;
  const searchInput = document.getElementById("search-input") as HTMLInputElement;
  const indexBtn = document.getElementById("index-btn")!;
  const overlay = document.getElementById("index-overlay")!;

  // Load Bible data: try IndexedDB first, then fetch from API
  content.innerHTML = `<p class="loading">Loading Bible\u2026</p>`;

  let cached = await loadBible();
  if (cached) {
    data = cached;
  } else {
    const res = await fetch("/api/bible");
    data = await res.json();
    await saveBible(data);
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
      if (q) {
        const results = search(data, q);
        renderResults(results, q);
        replaceState({ query: q });
      } else {
        renderChapter(data, "Genesis", 1);
        replaceState({});
      }
    }, 150);
  });

  // --- Index panel ---
  let indexRendered = false;
  indexBtn.addEventListener("click", () => {
    overlay.classList.toggle("open");
    document.body.classList.toggle("panel-open", overlay.classList.contains("open"));
    if (!indexRendered && overlay.classList.contains("open")) {
      renderIndex(data, {
        onBook(book) { navigate({ book }); },
        onChapter(book, chapter) { navigate({ book, chapter }); },
        onVerse(book, chapter, verse) { navigate({ book, chapter, verse }); },
      });
      indexRendered = true;
    }
  });

  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) {
      overlay.classList.remove("open");
      document.body.classList.remove("panel-open");
    }
  });

  // Close index with Escape
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && overlay.classList.contains("open")) {
      overlay.classList.remove("open");
      document.body.classList.remove("panel-open");
    }
  });

  // --- Click handlers for rendered content ---
  content.addEventListener("click", (e) => {
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

function stateToInputText(s: AppState): string {
  if (s.query) return s.query;
  if (s.book && s.chapter && s.verse) return `${s.book} ${s.chapter}:${s.verse}`;
  if (s.book && s.chapter) return `${s.book} ${s.chapter}`;
  if (s.book) return s.book;
  return "";
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
    const results = search(data, s.query);
    renderResults(results, s.query);
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
