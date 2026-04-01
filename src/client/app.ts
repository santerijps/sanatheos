import type { BibleData, AppState, HighlightColor } from "./types.ts";
import { loadBible, saveBible, getBookmarks, addBookmark, removeBookmark, isBookmarked, getHighlightMap, setHighlight, removeHighlight } from "./db.ts";
import { initSearch, search, tryParseNav, parseQueryBooks } from "./search.ts";
import type { NavRef } from "./search.ts";
import { readState, pushState, replaceState, stateToInputText, toUrl } from "./state.ts";
import { renderChapter, renderChapterRange, renderBook, renderVerse, renderVerseSegments, renderMultiNav, renderResults, renderIndex, navRefLabel, setHighlightMap, renderParallelChapter, renderParallelVerse, renderParallelVerseSegments } from "./render.ts";
import { setTranslation, displayName } from "./bookNames.ts";
import { setLanguage, getLanguage, t } from "./i18n.ts";

let data: BibleData;
let currentTranslation = "WEB";
const DEFAULT_TRANSLATION = "WEB";
let translationRequestId = 0;
let parallelTranslation = "";
let parallelData: BibleData | null = null;
let highlightMap = new Map<string, HighlightColor>();

function withT(s: AppState): AppState {
  return { ...s, translation: currentTranslation };
}

async function fetchTranslation(code: string): Promise<BibleData> {
  const cached = await loadBible(code);
  if (cached) return cached;
  const res = await fetch(`./bible-${encodeURIComponent(code)}.json`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const d: BibleData = await res.json();
  await saveBible(code, d);
  return d;
}

async function fetchTranslations(): Promise<string[]> {
  try {
    const res = await fetch("./translations.json");
    if (!res.ok) return [DEFAULT_TRANSLATION];
    return await res.json();
  } catch {
    return [DEFAULT_TRANSLATION];
  }
}

// --- Toast notifications ---
let toastTimer: number;
function showToast(msg: string) {
  const el = document.getElementById("toast");
  if (!el) return;
  el.textContent = msg;
  el.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => el.classList.remove("show"), 2000);
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
  const bookmarksBtn = document.getElementById("bookmarks-btn")!;
  const bookmarksOverlay = document.getElementById("bookmarks-overlay")!;
  const bookmarksClose = document.getElementById("bookmarks-close")!;
  const verseMenu = document.getElementById("verse-menu")!;

  // Determine initial translation from URL or localStorage
  const initialState = readState();
  currentTranslation = initialState.translation || localStorage.getItem("bible-translation") || DEFAULT_TRANSLATION;
  setTranslation(currentTranslation);

  // Determine initial language
  const savedLang = localStorage.getItem("bible-language") || "en";
  setLanguage(savedLang);

  const languageSelect = document.getElementById("language-select") as HTMLSelectElement | null;
  if (languageSelect) languageSelect.value = savedLang;

  // Apply theme
  const savedTheme = localStorage.getItem("bible-theme") || "system";
  applyTheme(savedTheme);
  const themeSelect = document.getElementById("theme-select") as HTMLSelectElement | null;
  if (themeSelect) themeSelect.value = savedTheme;

  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
    const theme = localStorage.getItem("bible-theme") || "system";
    if (theme === "system") applyTheme("system");
  });

  // Load highlights
  const hlMap = await getHighlightMap();
  highlightMap = hlMap;
  setHighlightMap(hlMap);

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
    translationSelect.innerHTML = translations.map(t => {
      const info = TRANSLATION_NAMES[t];
      const label = info ? `${t} — ${info.name} (${info.language})` : t;
      return `<option value="${t}"${t === currentTranslation ? " selected" : ""}>${label}</option>`;
    }).join("");

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
        replaceState(withT(stateForUrl(state)));
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

  // Parallel translation selector
  const parallelSelect = document.getElementById("parallel-select") as HTMLSelectElement | null;
  if (parallelSelect && translationSelect) {
    const translations = await fetchTranslations();
    const savedParallel = localStorage.getItem("bible-parallel") || "";
    parallelSelect.innerHTML = `<option value="">${t().parallelNone}</option>` + translations.map(tr => {
      const info = TRANSLATION_NAMES[tr];
      const label = info ? `${tr} — ${info.name}` : tr;
      return `<option value="${tr}"${tr === savedParallel ? " selected" : ""}>${label}</option>`;
    }).join("");

    if (savedParallel) {
      try {
        parallelTranslation = savedParallel;
        parallelData = await fetchTranslation(savedParallel);
      } catch { parallelTranslation = ""; parallelData = null; }
    }

    parallelSelect.addEventListener("change", async () => {
      const code = parallelSelect.value;
      if (!code) {
        parallelTranslation = "";
        parallelData = null;
        localStorage.removeItem("bible-parallel");
      } else {
        try {
          parallelData = await fetchTranslation(code);
          parallelTranslation = code;
          localStorage.setItem("bible-parallel", code);
        } catch {
          parallelTranslation = "";
          parallelData = null;
          parallelSelect.value = "";
        }
      }
      const state = readState();
      applyState(state);
    });
  }

  // Theme selector
  if (themeSelect) {
    themeSelect.addEventListener("change", () => {
      const theme = themeSelect.value;
      applyTheme(theme);
      localStorage.setItem("bible-theme", theme);
    });
  }

  updateStaticText();

  // Render initial state from URL
  const state = readState();
  searchInput.value = stateToInputText(state);
  applyState(state);
  replaceState(withT(stateForUrl(state)));
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
      applyState({ query: q });
      replaceState(withT(stateForUrl({ query: q })));
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
    if (e.key === "Escape") {
      if (verseMenu.classList.contains("open")) { closeVerseMenu(); return; }
      if (bookmarksOverlay.classList.contains("open")) { closeBookmarks(); return; }
      if (settingsOverlay.classList.contains("open")) { closeSettings(); return; }
      if (infoOverlay.classList.contains("open")) { closeInfo(); return; }
      if (overlay.classList.contains("open")) { closeIndex(); return; }
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

    // Click on copy button → copy text to clipboard
    const copyBtn = (e.target as HTMLElement).closest(".copy-btn") as HTMLElement;
    if (copyBtn) {
      e.preventDefault();
      const book = copyBtn.dataset.copyBook!;
      const chapter = +copyBtn.dataset.copyChapter!;
      const verse = copyBtn.dataset.copyVerse;
      const segments = copyBtn.dataset.copySegments;
      const useParallel = !!parallelData && !!parallelTranslation;
      let text = "";
      if (verse) {
        const v = data[book]?.[String(chapter)]?.[verse];
        if (v) {
          text = `${displayName(book)} ${chapter}:${verse}\n[${currentTranslation}] ${v}`;
          if (useParallel) {
            const v2 = parallelData![book]?.[String(chapter)]?.[verse];
            if (v2) text += `\n[${parallelTranslation}] ${v2}`;
          }
        }
      } else if (segments) {
        const ch = data[book]?.[String(chapter)];
        if (ch) {
          const parts = segments.split(",");
          const verses: number[] = [];
          for (const p of parts) {
            const range = p.split("-").map(Number);
            if (range.length === 2) {
              for (let v = range[0]; v <= range[1]; v++) verses.push(v);
            } else {
              verses.push(range[0]);
            }
          }
          text = `${displayName(book)} ${chapter}:${segments}\n[${currentTranslation}]\n` + verses.filter(n => ch[String(n)]).map(n => `${n} ${ch[String(n)]}`).join("\n");
          if (useParallel) {
            const ch2 = parallelData![book]?.[String(chapter)];
            if (ch2) {
              text += `\n[${parallelTranslation}]\n` + verses.filter(n => ch2[String(n)]).map(n => `${n} ${ch2[String(n)]}`).join("\n");
            }
          }
        }
      } else {
        const ch = data[book]?.[String(chapter)];
        if (ch) {
          const nums = Object.keys(ch).map(Number).sort((a, b) => a - b);
          text = `${displayName(book)} ${chapter}\n[${currentTranslation}]\n` + nums.map(n => `${n} ${ch[String(n)]}`).join("\n");
          if (useParallel) {
            const ch2 = parallelData![book]?.[String(chapter)];
            if (ch2) {
              const nums2 = Object.keys(ch2).map(Number).sort((a, b) => a - b);
              text += `\n[${parallelTranslation}]\n` + nums2.map(n => `${n} ${ch2[String(n)]}`).join("\n");
            }
          }
        }
      }
      if (text) {
        navigator.clipboard.writeText(text).then(() => showToast(t().copied));
      }
      return;
    }
  });

  // --- Verse context menu (right-click / long-press on verse sup) ---
  let longPressTimer: number;
  let menuVerseEl: HTMLElement | null = null;

  function closeVerseMenu() {
    verseMenu.classList.remove("open");
    verseMenu.innerHTML = "";
  }

  function openVerseMenu(verseEl: HTMLElement, x: number, y: number) {
    menuVerseEl = verseEl;
    const book = verseEl.dataset.book!;
    const chapter = +verseEl.dataset.chapter!;
    const verse = +verseEl.dataset.verse!;
    const hlKey = `${book}:${chapter}:${verse}`;
    const currentColor = highlightMap.get(hlKey);

    const colors: HighlightColor[] = ["yellow", "green", "blue", "pink", "orange"];
    let html = "";

    // Copy verse
    html += `<button class="verse-menu-item" data-action="copy">&#128203; ${t().copyVerse}</button>`;

    // Bookmark
    html += `<button class="verse-menu-item" data-action="bookmark">&#9733; Bookmark</button>`;

    // Highlight colors
    html += `<div class="verse-menu-colors">`;
    for (const c of colors) {
      html += `<span class="color-dot${currentColor === c ? " active" : ""}" data-color="${c}" data-action="highlight"></span>`;
    }
    if (currentColor) {
      html += `<span class="color-dot" data-action="remove-highlight" style="background: var(--border); position: relative;" title="${t().removeHighlight}">&#10005;</span>`;
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
      const target = ev.target as HTMLElement;
      const action = target.dataset.action;
      if (!action) return;

      if (action === "copy") {
        const isSecondary = verseEl.dataset.secondary === "1";
        const sourceData = isSecondary && parallelData ? parallelData : data;
        const sourceLabel = isSecondary ? parallelTranslation : currentTranslation;
        const text = sourceData[book]?.[String(chapter)]?.[String(verse)];
        if (text) {
          const full = `${displayName(book)} ${chapter}:${verse} [${sourceLabel}] — ${text}`;
          navigator.clipboard.writeText(full).then(() => showToast(t().copied));
        }
      } else if (action === "bookmark") {
        const already = await isBookmarked(book, chapter, verse);
        if (already) {
          await removeBookmark(book, chapter, verse);
          showToast(t().bookmarkRemoved);
        } else {
          await addBookmark({ book, chapter, verse, translation: currentTranslation, timestamp: Date.now() });
          showToast(t().bookmarkAdded);
        }
      } else if (action === "highlight") {
        const color = target.dataset.color as HighlightColor;
        await setHighlight({ book, chapter, verse, color });
        highlightMap.set(hlKey, color);
        verseEl.className = `verse hl-${color}`;
      } else if (action === "remove-highlight") {
        await removeHighlight(book, chapter, verse);
        highlightMap.delete(hlKey);
        verseEl.className = "verse";
      }
      closeVerseMenu();
    };
  }

  // Right-click on verse sup number
  content.addEventListener("contextmenu", (e) => {
    const sup = (e.target as HTMLElement).closest("sup");
    if (!sup) return;
    const verseEl = sup.closest(".verse") as HTMLElement;
    if (!verseEl || !verseEl.dataset.book) return;
    e.preventDefault();
    openVerseMenu(verseEl, e.clientX, e.clientY);
  });

  // Long-press for touch devices
  content.addEventListener("touchstart", (e) => {
    const sup = (e.target as HTMLElement).closest("sup");
    if (!sup) return;
    const verseEl = sup.closest(".verse") as HTMLElement;
    if (!verseEl || !verseEl.dataset.book) return;
    const touch = e.touches[0];
    longPressTimer = window.setTimeout(() => {
      e.preventDefault();
      openVerseMenu(verseEl, touch.clientX, touch.clientY);
    }, 500);
  }, { passive: false });

  content.addEventListener("touchend", () => clearTimeout(longPressTimer));
  content.addEventListener("touchmove", () => clearTimeout(longPressTimer));

  // Close verse menu on outside click
  document.addEventListener("click", (e) => {
    if (!verseMenu.contains(e.target as Node)) closeVerseMenu();
  });

  // --- Bookmarks modal ---
  bookmarksBtn.addEventListener("click", async () => {
    bookmarksOverlay.classList.add("open");
    document.body.classList.add("panel-open");
    const bookmarks = await getBookmarks();
    const listEl = document.getElementById("bookmarks-list")!;
    const titleEl = bookmarksOverlay.querySelector("h2")!;
    titleEl.textContent = t().bookmarks;

    if (!bookmarks.length) {
      listEl.innerHTML = `<p class="bookmarks-empty">${t().noBookmarks}</p>`;
      return;
    }

    bookmarks.sort((a, b) => b.timestamp - a.timestamp);
    listEl.innerHTML = bookmarks.map(b =>
      `<div class="bookmark-item" data-book="${b.book}" data-chapter="${b.chapter}" data-verse="${b.verse}">
        <span class="bookmark-ref">${displayName(b.book)} ${b.chapter}:${b.verse}</span>
        <button class="bookmark-remove" data-book="${b.book}" data-chapter="${b.chapter}" data-verse="${b.verse}" title="Remove">&times;</button>
      </div>`
    ).join("");

    listEl.onclick = async (ev) => {
      const removeBtn = (ev.target as HTMLElement).closest(".bookmark-remove") as HTMLElement;
      if (removeBtn) {
        ev.stopPropagation();
        await removeBookmark(removeBtn.dataset.book!, +removeBtn.dataset.chapter!, +removeBtn.dataset.verse!);
        removeBtn.closest(".bookmark-item")!.remove();
        if (!listEl.children.length) listEl.innerHTML = `<p class="bookmarks-empty">${t().noBookmarks}</p>`;
        return;
      }
      const item = (ev.target as HTMLElement).closest(".bookmark-item") as HTMLElement;
      if (item) {
        closeBookmarks();
        navigate({ book: item.dataset.book!, chapter: +item.dataset.chapter!, verse: +item.dataset.verse! });
      }
    };
  });

  function closeBookmarks() {
    bookmarksOverlay.classList.remove("open");
    document.body.classList.remove("panel-open");
  }

  bookmarksClose.addEventListener("click", closeBookmarks);
  bookmarksOverlay.addEventListener("click", (e) => {
    if (e.target === bookmarksOverlay) closeBookmarks();
  });

  // --- Swipe navigation ---
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
    // Only count horizontal swipes that are fast and far enough
    if (dt > 500 || Math.abs(dx) < 80 || Math.abs(dy) > Math.abs(dx) * 0.5) return;

    const arrow = dx > 0
      ? content.querySelector(".nav-arrow.nav-prev:not(.nav-disabled)") as HTMLElement
      : content.querySelector(".nav-arrow.nav-next:not(.nav-disabled)") as HTMLElement;
    if (arrow) arrow.click();
  }, { passive: true });

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
  const useParallel = !!parallelData && !!parallelTranslation;

  if (chapterStart !== undefined && chapterEnd !== undefined) {
    if (verseSegments) {
      // Single verse: Genesis 1:2
      if (verseSegments.length === 1 && verseSegments[0].start === verseSegments[0].end) {
        if (useParallel) {
          renderParallelVerse(data, parallelData!, book, chapterStart, verseSegments[0].start, currentTranslation, parallelTranslation);
        } else {
          renderVerse(data, book, chapterStart, verseSegments[0].start);
        }
      } else {
        // Verse segments: Genesis 8:1-3 or Genesis 8:1-3,6
        if (useParallel) {
          renderParallelVerseSegments(data, parallelData!, book, chapterStart, verseSegments, currentTranslation, parallelTranslation);
        } else {
          renderVerseSegments(data, book, chapterStart, verseSegments);
        }
      }
    } else if (chapterStart === chapterEnd) {
      // Single chapter: Genesis 8
      if (useParallel) {
        renderParallelChapter(data, parallelData!, book, chapterStart, currentTranslation, parallelTranslation);
      } else {
        renderChapter(data, book, chapterStart);
      }
    } else {
      // Chapter range: Genesis 8-10
      renderChapterRange(data, book, chapterStart, chapterEnd);
    }
  } else {
    // Whole book: Genesis → show chapter 1
    if (useParallel) {
      renderParallelChapter(data, parallelData!, book, 1, currentTranslation, parallelTranslation);
    } else {
      renderChapter(data, book, 1);
    }
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
  if (nav.chapterStart === nav.chapterEnd && nav.verseSegments &&
      nav.verseSegments.length === 1 && nav.verseSegments[0].start === nav.verseSegments[0].end) {
    return { book: nav.book, chapter: nav.chapterStart, verse: nav.verseSegments[0].start };
  }
  return { query: q };
}

function stateForUrl(s: AppState): AppState {
  if (s.query) return queryToUrlState(s.query);
  return s;
}

function applyState(s: AppState) {
  const useParallel = !!parallelData && !!parallelTranslation;
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
    if (useParallel) {
      renderParallelVerse(data, parallelData!, s.book, s.chapter, s.verse, currentTranslation, parallelTranslation);
    } else {
      renderVerse(data, s.book, s.chapter, s.verse);
    }
  } else if (s.book && s.chapter) {
    if (useParallel) {
      renderParallelChapter(data, parallelData!, s.book, s.chapter, currentTranslation, parallelTranslation);
    } else {
      renderChapter(data, s.book, s.chapter);
    }
  } else if (s.book) {
    renderBook(data, s.book);
  } else {
    if (useParallel) {
      renderParallelChapter(data, parallelData!, "Genesis", 1, currentTranslation, parallelTranslation);
    } else {
      renderChapter(data, "Genesis", 1);
    }
  }
  updateTitle(s);
  updateFooter();
}

const TRANSLATION_NAMES: Record<string, { name: string; language: string }> = {
  WEB: { name: "World English Bible", language: "English" },
  KR38: { name: "Raamattu 1933/1938", language: "Suomi" },
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
  const themeLabel = document.getElementById("settings-theme-label");
  if (themeLabel) themeLabel.textContent = s.themeLabel;
  const parallelLabel = document.getElementById("settings-parallel-label");
  if (parallelLabel) parallelLabel.textContent = s.parallelLabel;

  // Bookmarks button
  const bookmarksBtn = document.getElementById("bookmarks-btn");
  if (bookmarksBtn) bookmarksBtn.title = s.bookmarks;

  // Info modal
  const infoBody = document.getElementById("info-modal-body");
  if (infoBody) {
    infoBody.innerHTML = `
      <h2>${s.infoTitle}</h2>
      <section><h3>${s.infoSearchTitle}</h3><p>${s.infoSearchIntro}</p><ul>${s.infoSearchItems.map(i => `<li>${i}</li>`).join("")}</ul><p>${s.infoSearchNote}</p></section>
      <section><h3>${s.infoBrowseTitle}</h3><p>${s.infoBrowseText}</p></section>
      <section><h3>${s.infoShortcutsTitle}</h3><ul>${s.infoShortcuts.map(i => `<li>${i}</li>`).join("")}</ul></section>
      <section><h3>${s.infoSettingsTitle}</h3><p>${s.infoSettingsText}</p></section>
      <section><h3>${s.infoFeaturesTitle}</h3><ul>${s.infoFeaturesItems.map(i => `<li>${i}</li>`).join("")}</ul></section>
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
  const info = TRANSLATION_NAMES[currentTranslation];
  const name = info ? info.name : currentTranslation;
  const label = `${currentTranslation} \u2014 ${name}`;
  for (const el of document.querySelectorAll(".nav-translation")) {
    el.textContent = label;
  }
}

init();
