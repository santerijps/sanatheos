import type { BibleData, VerseResult, HighlightColor } from "./types.ts";
import type { NavRef } from "./search.ts";
import { escapeRegex } from "./search.ts";
import { displayName, displayNameFor } from "./bookNames.ts";
import { t } from "./i18n.ts";

const $ = (id: string) => document.getElementById(id)!;

let highlightMap = new Map<string, HighlightColor>();

export function setHighlightMap(m: Map<string, HighlightColor>) {
  highlightMap = m;
}

function getHighlightClass(book: string, chapter: number, verse: number): string {
  const color = highlightMap.get(`${book}:${chapter}:${verse}`);
  return color ? ` hl-${color}` : "";
}
const hlClass = getHighlightClass;

function escapeHtml(s: string): string {
  const d = document.createElement("div");
  d.textContent = s;
  return d.innerHTML.replace(/"/g, "&quot;");
}
const esc = escapeHtml;

function formatVerseText(text: string): string {
  let open = true;
  return escapeHtml(text)
    .replace(/\n/g, "<br>")
    .replace(/&quot;/g, () => { const q = open ? "&ldquo;" : "&rdquo;"; open = !open; return q; });
}
const fmt = formatVerseText;

const escRegex = escapeRegex;

interface NavTarget {
  book: string;
  chapter: number;
  verse?: number;
  label: string;
  shortLabel: string;
}

function getChapterNav(data: BibleData, book: string, chapter: number): { prev: NavTarget | null; next: NavTarget | null } {
  const books = Object.keys(data);
  const bi = books.indexOf(book);
  const chapters = Object.keys(data[book]).map(Number).sort((a, b) => a - b);
  const ci = chapters.indexOf(chapter);

  let prev: NavTarget | null = null;
  let next: NavTarget | null = null;

  if (ci > 0) {
    prev = { book, chapter: chapters[ci - 1], label: `${displayName(book)} ${chapters[ci - 1]}`, shortLabel: `${chapters[ci - 1]}` };
  } else if (bi > 0) {
    const pb = books[bi - 1];
    const pChs = Object.keys(data[pb]).map(Number).sort((a, b) => a - b);
    const lastCh = pChs[pChs.length - 1];
    prev = { book: pb, chapter: lastCh, label: `${displayName(pb)} ${lastCh}`, shortLabel: `${displayName(pb)} ${lastCh}` };
  }

  if (ci < chapters.length - 1) {
    next = { book, chapter: chapters[ci + 1], label: `${displayName(book)} ${chapters[ci + 1]}`, shortLabel: `${chapters[ci + 1]}` };
  } else if (bi < books.length - 1) {
    const nb = books[bi + 1];
    const nChs = Object.keys(data[nb]).map(Number).sort((a, b) => a - b);
    next = { book: nb, chapter: nChs[0], label: `${displayName(nb)} ${nChs[0]}`, shortLabel: `${displayName(nb)} ${nChs[0]}` };
  }

  return { prev, next };
}

function getVerseNav(data: BibleData, book: string, chapter: number, verse: number): { prev: NavTarget | null; next: NavTarget | null } {
  const books = Object.keys(data);
  const bi = books.indexOf(book);
  const chapters = Object.keys(data[book]).map(Number).sort((a, b) => a - b);
  const ci = chapters.indexOf(chapter);
  const verses = Object.keys(data[book][String(chapter)]).map(Number).sort((a, b) => a - b);
  const vi = verses.indexOf(verse);

  let prev: NavTarget | null = null;
  let next: NavTarget | null = null;

  if (vi > 0) {
    prev = { book, chapter, verse: verses[vi - 1], label: `${displayName(book)} ${chapter}:${verses[vi - 1]}`, shortLabel: `${chapter}:${verses[vi - 1]}` };
  } else if (ci > 0) {
    const pc = chapters[ci - 1];
    const pVs = Object.keys(data[book][String(pc)]).map(Number).sort((a, b) => a - b);
    const lastV = pVs[pVs.length - 1];
    prev = { book, chapter: pc, verse: lastV, label: `${displayName(book)} ${pc}:${lastV}`, shortLabel: `${pc}:${lastV}` };
  } else if (bi > 0) {
    const pb = books[bi - 1];
    const pChs = Object.keys(data[pb]).map(Number).sort((a, b) => a - b);
    const lastCh = pChs[pChs.length - 1];
    const pVs = Object.keys(data[pb][String(lastCh)]).map(Number).sort((a, b) => a - b);
    const lastV = pVs[pVs.length - 1];
    prev = { book: pb, chapter: lastCh, verse: lastV, label: `${displayName(pb)} ${lastCh}:${lastV}`, shortLabel: `${displayName(pb)} ${lastCh}:${lastV}` };
  }

  if (vi < verses.length - 1) {
    next = { book, chapter, verse: verses[vi + 1], label: `${displayName(book)} ${chapter}:${verses[vi + 1]}`, shortLabel: `${chapter}:${verses[vi + 1]}` };
  } else if (ci < chapters.length - 1) {
    const nc = chapters[ci + 1];
    const nVs = Object.keys(data[book][String(nc)]).map(Number).sort((a, b) => a - b);
    next = { book, chapter: nc, verse: nVs[0], label: `${displayName(book)} ${nc}:${nVs[0]}`, shortLabel: `${nc}:${nVs[0]}` };
  } else if (bi < books.length - 1) {
    const nb = books[bi + 1];
    const nChs = Object.keys(data[nb]).map(Number).sort((a, b) => a - b);
    const nVs = Object.keys(data[nb][String(nChs[0])]).map(Number).sort((a, b) => a - b);
    next = { book: nb, chapter: nChs[0], verse: nVs[0], label: `${displayName(nb)} ${nChs[0]}:${nVs[0]}`, shortLabel: `${displayName(nb)} ${nChs[0]}:${nVs[0]}` };
  }

  return { prev, next };
}

function navArrowsHtml(prev: NavTarget | null, next: NavTarget | null, showTranslation = true): string {
  const prevBtn = prev
    ? `<a class="nav-arrow nav-prev" title="${esc(prev.label)}" data-book="${esc(prev.book)}" data-chapter="${prev.chapter}"${prev.verse !== undefined ? ` data-verse="${prev.verse}"` : ""}>&DoubleLeftArrow;</a>`
    : `<span class="nav-arrow nav-prev nav-disabled">&DoubleLeftArrow;</span>`;
  const nextBtn = next
    ? `<a class="nav-arrow nav-next" title="${esc(next.label)}" data-book="${esc(next.book)}" data-chapter="${next.chapter}"${next.verse !== undefined ? ` data-verse="${next.verse}"` : ""}>&DoubleRightArrow;</a>`
    : `<span class="nav-arrow nav-next nav-disabled"></span>`;
  const mid = showTranslation ? `<span class="nav-translation">&DoubleRightArrow;</span>` : "";
  return `<nav class="chapter-nav">${prevBtn}${mid}${nextBtn}</nav>`;
}

export function renderChapter(data: BibleData, book: string, chapter: number) {
  const ch = data[book]?.[String(chapter)];
  if (!ch) { $("content").innerHTML = `<p class="empty">${t().notFound}</p>`; return; }

  const { prev, next } = getChapterNav(data, book, chapter);
  const nums = Object.keys(ch).map(Number).sort((a, b) => a - b);
  let html = navArrowsHtml(prev, next);
  html += `<div class="print-translation-label"><span class="nav-translation"></span></div>`;
  html += `<h2 class="section-title">${esc(displayName(book))} ${chapter} <button class="copy-btn" data-copy-book="${esc(book)}" data-copy-chapter="${chapter}">&#128203;</button></h2><div class="verses">`;
  for (const n of nums) {
    html += `<span class="verse${hlClass(book, chapter, n)}" data-book="${esc(book)}" data-chapter="${chapter}" data-verse="${n}"><sup>${n}</sup>${fmt(ch[String(n)])}</span> `;
  }
  html += `</div>`;
  html += navArrowsHtml(prev, next, false);
  $("content").innerHTML = html;
  window.scrollTo(0, 0);
}

export function renderBook(data: BibleData, book: string) {
  const bd = data[book];
  if (!bd) { $("content").innerHTML = `<p class="empty">${t().notFound}</p>`; return; }

  const chs = Object.keys(bd).map(Number).sort((a, b) => a - b);
  let html = `<div class="print-translation-label"><span class="nav-translation"></span></div>`;
  html += `<h1 class="book-title">${esc(displayName(book))}</h1>`;
  for (const c of chs) {
    const verses = bd[String(c)];
    const nums = Object.keys(verses).map(Number).sort((a, b) => a - b);
    html += `<div class="chapter-block"><h2 class="chapter-heading" data-book="${esc(book)}" data-chapter="${c}">${t().chapter} ${c}</h2><div class="verses">`;
    for (const n of nums) {
      html += `<span class="verse${hlClass(book, c, n)}" data-book="${esc(book)}" data-chapter="${c}" data-verse="${n}"><sup>${n}</sup>${fmt(verses[String(n)])}</span> `;
    }
    html += `</div></div>`;
  }
  $("content").innerHTML = html;
  window.scrollTo(0, 0);
}

export function renderVerse(data: BibleData, book: string, chapter: number, verse: number) {
  const text = data[book]?.[String(chapter)]?.[String(verse)];
  if (!text) { $("content").innerHTML = `<p class="empty">${t().notFound}</p>`; return; }

  const { prev, next } = getVerseNav(data, book, chapter, verse);
  $("content").innerHTML = `
    ${navArrowsHtml(prev, next)}    <div class="print-translation-label"><span class="nav-translation"></span></div>    <h2 class="section-title">${esc(displayName(book))} ${chapter}:${verse} <button class="copy-btn" data-copy-book="${esc(book)}" data-copy-chapter="${chapter}" data-copy-verse="${verse}">&#128203;</button></h2>
    <div class="verses single-verse">
      <span class="verse${hlClass(book, chapter, verse)}" data-book="${esc(book)}" data-chapter="${chapter}" data-verse="${verse}"><sup>${verse}</sup>${fmt(text)}</span>
    </div>
    <div class="read-full-chapter"><a class="full-chapter-link" data-book="${esc(book)}" data-chapter="${chapter}">${t().readFullChapter} &rarr;</a></div>`;
  window.scrollTo(0, 0);
}

export function renderChapterRange(data: BibleData, book: string, chStart: number, chEnd: number) {
  const bd = data[book];
  if (!bd) { $("content").innerHTML = `<p class="empty">${t().notFound}</p>`; return; }

  const { prev } = getChapterNav(data, book, chStart);
  const { next } = getChapterNav(data, book, chEnd);
  let html = navArrowsHtml(prev, next);
  html += `<div class="print-translation-label"><span class="nav-translation"></span></div>`;
  for (let c = chStart; c <= chEnd; c++) {
    const ch = bd[String(c)];
    if (!ch) continue;
    const nums = Object.keys(ch).map(Number).sort((a, b) => a - b);
    html += `<div class="chapter-block"><h2 class="chapter-heading" data-book="${esc(book)}" data-chapter="${c}">${esc(displayName(book))} ${c}</h2><div class="verses">`;
    for (const n of nums) {
      html += `<span class="verse${hlClass(book, c, n)}" data-book="${esc(book)}" data-chapter="${c}" data-verse="${n}"><sup>${n}</sup>${fmt(ch[String(n)])}</span> `;
    }
    html += `</div></div>`;
  }
  html += navArrowsHtml(prev, next, false);
  $("content").innerHTML = html;
  window.scrollTo(0, 0);
}

export function renderVerseSegments(data: BibleData, book: string, chapter: number, segments: { start: number; end: number }[]) {
  const ch = data[book]?.[String(chapter)];
  if (!ch) { $("content").innerHTML = `<p class="empty">${t().notFound}</p>`; return; }

  // Build title label like "Genesis 8:1-3,6"
  const segLabel = segments.map(s => s.start === s.end ? `${s.start}` : `${s.start}-${s.end}`).join(",");
  const title = `${displayName(book)} ${chapter}:${segLabel}`;

  let html = `<div class="print-translation-label"><span class="nav-translation"></span></div>`;
  html += `<div class="translation-label"><span class="nav-translation"></span></div>`;
  html += `<h2 class="section-title">${esc(title)} <button class="copy-btn" data-copy-book="${esc(book)}" data-copy-chapter="${chapter}" data-copy-segments="${esc(segLabel)}">&#128203;</button></h2><div class="verses">`;
  for (const seg of segments) {
    for (let v = seg.start; v <= seg.end; v++) {
      const text = ch[String(v)];
      if (!text) continue;
      html += `<span class="verse${hlClass(book, chapter, v)}" data-book="${esc(book)}" data-chapter="${chapter}" data-verse="${v}"><sup>${v}</sup>${fmt(text)}</span> `;
    }
  }
  html += `</div>`;
  html += `<div class="read-full-chapter"><a class="full-chapter-link" data-book="${esc(book)}" data-chapter="${chapter}">${t().readFullChapter} &rarr;</a></div>`;
  $("content").innerHTML = html;
  window.scrollTo(0, 0);
}
export function navRefLabel(nav: NavRef): string {
  const { book, chapterStart, chapterEnd, verseSegments } = nav;
  if (chapterStart !== undefined && chapterEnd !== undefined) {
    if (verseSegments) {
      const segLabel = verseSegments.map(s => s.start === s.end ? `${s.start}` : `${s.start}-${s.end}`).join(",");
      return `${displayName(book)} ${chapterStart}:${segLabel}`;
    }
    if (chapterStart === chapterEnd) return `${displayName(book)} ${chapterStart}`;
    return `${displayName(book)} ${chapterStart}-${chapterEnd}`;
  }
  return displayName(book);
}

function navRefVersesHtml(data: BibleData, nav: NavRef): string {
  const { book, chapterStart, chapterEnd, verseSegments } = nav;
  const bd = data[book];
  if (!bd) return '';

  let html = '';

  if (chapterStart !== undefined && chapterEnd !== undefined) {
    if (verseSegments) {
      const ch = bd[String(chapterStart)];
      if (!ch) return '';
      html += `<div class="verses">`;
      for (const seg of verseSegments) {
        for (let v = seg.start; v <= seg.end; v++) {
          const text = ch[String(v)];
          if (!text) continue;
          html += `<span class="verse${hlClass(book, chapterStart, v)}" data-book="${esc(book)}" data-chapter="${chapterStart}" data-verse="${v}"><sup>${v}</sup>${fmt(text)}</span> `;
        }
      }
      html += `</div>`;
    } else {
      for (let c = chapterStart; c <= chapterEnd; c++) {
        const ch = bd[String(c)];
        if (!ch) continue;
        const nums = Object.keys(ch).map(Number).sort((a, b) => a - b);
        if (chapterStart !== chapterEnd) {
          html += `<h3 class="multi-nav-subheading">${esc(displayName(book))} ${c}</h3>`;
        }
        html += `<div class="verses">`;
        for (const n of nums) {
          html += `<span class="verse${hlClass(book, c, n)}" data-book="${esc(book)}" data-chapter="${c}" data-verse="${n}"><sup>${n}</sup>${fmt(ch[String(n)])}</span> `;
        }
        html += `</div>`;
      }
    }
  } else {
    // Whole book → show chapter 1
    const ch = bd["1"];
    if (!ch) return '';
    const nums = Object.keys(ch).map(Number).sort((a, b) => a - b);
    html += `<div class="verses">`;
    for (const n of nums) {
      html += `<span class="verse${hlClass(book, 1, n)}" data-book="${esc(book)}" data-chapter="1" data-verse="${n}"><sup>${n}</sup>${fmt(ch[String(n)])}</span> `;
    }
    html += `</div>`;
  }

  return html;
}

export function renderMultiNav(data: BibleData, refs: NavRef[]) {
  let html = '<div class="translation-label"><span class="nav-translation"></span></div>';
  for (let i = 0; i < refs.length; i++) {
    if (i > 0) html += `<hr class="multi-nav-divider">`;
    html += `<section class="multi-nav-section">`;
    html += `<h2 class="section-title">${esc(navRefLabel(refs[i]))}</h2>`;
    html += navRefVersesHtml(data, refs[i]);
    const ch = refs[i].chapterStart ?? 1;
    html += `<div class="read-full-chapter"><a class="full-chapter-link" data-book="${esc(refs[i].book)}" data-chapter="${ch}">${t().readFullChapter} &rarr;</a></div>`;
    html += `</section>`;
  }
  $('content').innerHTML = html;
  window.scrollTo(0, 0);
}
const RESULTS_PAGE_SIZE = 50;

export function renderResults(results: VerseResult[], query: string) {
  if (!results.length) {
    $("content").innerHTML = `<p class="empty">${t().noResults(esc(query))}</p>`;
    return;
  }

  const terms = query.split(/;/).map(t => t.trim()).filter(Boolean);
  const highlights: string[] = [];
  for (const t of terms) {
    const m = t.match(/"(.+?)"/);
    if (!m) continue;
    let raw = m[1];
    // Strip ^/$ anchors — they control matching, not literal text
    raw = raw.replace(/^\^/, "").replace(/\$$/, "");
    if (raw.length >= 2) highlights.push(raw);
  }

  // Build a single combined regex to avoid corrupting <mark> tags across passes
  const hlRegex = highlights.length
    ? new RegExp(`(${highlights.map(h => escRegex(esc(h))).join("|")})`, "gi")
    : null;

  let shown = 0;

  function renderResultItem(r: VerseResult): string {
    let highlighted = fmt(r.text);
    if (hlRegex) highlighted = highlighted.replace(hlRegex, "<mark>$1</mark>");
    return `<div class="result" data-book="${esc(r.book)}" data-chapter="${r.chapter}" data-verse="${r.verse}">
      <div class="result-ref">${esc(displayName(r.book))} ${r.chapter}:${r.verse}</div>
      <div class="result-text">${highlighted}</div>
    </div>`;
  }

  function showMore() {
    const container = document.querySelector(".results");
    if (!container) return;
    const end = Math.min(shown + RESULTS_PAGE_SIZE, results.length);
    let html = "";
    for (let i = shown; i < end; i++) {
      html += renderResultItem(results[i]);
    }
    // Remove existing "Show more" button if present
    const existingBtn = document.getElementById("show-more-btn");
    if (existingBtn) existingBtn.remove();

    container.insertAdjacentHTML("beforeend", html);
    shown = end;

    if (shown < results.length) {
      const remaining = results.length - shown;
      container.insertAdjacentHTML("afterend", "");
      const btn = document.createElement("button");
      btn.id = "show-more-btn";
      btn.className = "show-more-btn";
      btn.textContent = `${t().showMore} (${remaining})`;
      btn.addEventListener("click", showMore);
      container.parentElement?.appendChild(btn);
    }
  }

  let html = `<p class="results-info">${t().resultCount(results.length)}</p><div class="results">`;
  const end = Math.min(RESULTS_PAGE_SIZE, results.length);
  for (let i = 0; i < end; i++) {
    html += renderResultItem(results[i]);
  }
  html += `</div>`;
  shown = end;

  if (shown < results.length) {
    const remaining = results.length - shown;
    html += `<button id="show-more-btn" class="show-more-btn">${t().showMore} (${remaining})</button>`;
  }

  $("content").innerHTML = html;

  // Wire up the "Show more" button if it was rendered
  const btn = document.getElementById("show-more-btn");
  if (btn) btn.addEventListener("click", showMore);

  window.scrollTo(0, 0);
}

export function renderIndex(
  data: BibleData,
  callbacks: {
    onBook: (book: string) => void;
    onChapter: (book: string, chapter: number) => void;
    onVerse: (book: string, chapter: number, verse: number) => void;
  },
) {
  const booksCol = $("idx-books");
  const chapsCol = $("idx-chapters");
  const versesCol = $("idx-verses");

  booksCol.innerHTML = "";
  chapsCol.innerHTML = "";
  versesCol.innerHTML = "";

  let activeBook = "";

  function showVerses(book: string, chapter: number) {
    versesCol.innerHTML = "";
    const vs = Object.keys(data[book][String(chapter)]).map(Number).sort((a, b) => a - b);
    for (const v of vs) {
      const vEl = document.createElement("div");
      vEl.className = "idx-item idx-verse";
      vEl.tabIndex = -1;
      const text = data[book][String(chapter)][String(v)];
      const p = text.substring(0, 50).replace(/\n/g, " ");
      vEl.textContent = `${v}. ${p}${text.length > 50 ? "\u2026" : ""}`;
      vEl.addEventListener("click", (e) => { e.stopPropagation(); callbacks.onVerse(book, chapter, v); });
      versesCol.appendChild(vEl);
    }
  }

  function showChapters(book: string) {
    if (activeBook === book) return;
    activeBook = book;

    booksCol.querySelectorAll(".idx-item").forEach(e => e.classList.remove("active"));
    const bookEl = booksCol.querySelector(`[data-book="${book}"]`);
    if (bookEl) bookEl.classList.add("active");

    chapsCol.innerHTML = "";
    versesCol.innerHTML = "";

    const chs = Object.keys(data[book]).map(Number).sort((a, b) => a - b);
    for (const c of chs) {
      const chEl = document.createElement("div");
      chEl.className = "idx-item idx-chapter";
      chEl.dataset.chapter = String(c);
      chEl.tabIndex = -1;
      const first = data[book][String(c)]?.["1"] || "";
      const preview = first.substring(0, 60).replace(/\n/g, " ");
      chEl.innerHTML = `<strong>${t().chapter} ${c}</strong><small>${esc(preview)}${first.length > 60 ? "\u2026" : ""}</small>`;

      chEl.addEventListener("mouseenter", () => {
        chapsCol.querySelectorAll(".idx-item").forEach(e => e.classList.remove("active"));
        chEl.classList.add("active");
        showVerses(book, c);
      });

      chEl.addEventListener("click", (e) => { e.stopPropagation(); callbacks.onChapter(book, c); });
      chapsCol.appendChild(chEl);
    }

    // Default: activate first chapter
    const firstChEl = chapsCol.querySelector(".idx-item") as HTMLElement | null;
    if (firstChEl && chs.length > 0) {
      firstChEl.classList.add("active");
      showVerses(book, chs[0]);
    }
  }

  const books = Object.keys(data);
  let addedNtLabel = false;
  const otLabel = document.createElement("div");
  otLabel.className = "idx-section-label";
  otLabel.textContent = t().oldTestament;
  booksCol.appendChild(otLabel);

  for (const book of books) {
    if (book === "Matthew" && !addedNtLabel) {
      addedNtLabel = true;
      const ntLabel = document.createElement("div");
      ntLabel.className = "idx-section-label";
      ntLabel.textContent = t().newTestament;
      booksCol.appendChild(ntLabel);
    }
    const el = document.createElement("div");
    el.className = "idx-item";
    el.dataset.book = book;
    el.textContent = displayName(book);
    el.tabIndex = -1;

    el.addEventListener("mouseenter", () => showChapters(book));
    el.addEventListener("click", () => callbacks.onBook(book));
    booksCol.appendChild(el);
  }

  // Default: activate first book
  if (books.length > 0) {
    showChapters(books[0]);
  }

  // --- Keyboard navigation ---
  const cols = [booksCol, chapsCol, versesCol];
  let focusedCol = 0;

  function getItems(col: HTMLElement): HTMLElement[] {
    return Array.from(col.querySelectorAll(".idx-item"));
  }

  function focusItem(col: HTMLElement, index: number) {
    const items = getItems(col);
    if (!items.length) return;
    const i = Math.max(0, Math.min(index, items.length - 1));
    items[i].focus();
  }

  function getActiveIndex(col: HTMLElement): number {
    const items = getItems(col);
    const active = col.querySelector(".idx-item:focus") as HTMLElement;
    return active ? items.indexOf(active) : -1;
  }

  function getPanel(): HTMLElement | null {
    return document.getElementById("index-panel");
  }

  getPanel()?.addEventListener("keydown", (e) => {
    const key = e.key;
    const col = cols[focusedCol];

    if (key === "ArrowDown" || key === "ArrowUp") {
      e.preventDefault();
      const items = getItems(col);
      if (!items.length) return;
      let idx = getActiveIndex(col);
      if (idx === -1) {
        idx = 0;
      } else if (key === "ArrowDown") {
        if (idx >= items.length - 1) return;
        idx++;
      } else {
        if (idx <= 0) return;
        idx--;
      }
      items[idx].focus();
      // Trigger hover-equivalent behavior
      if (col === booksCol) {
        const book = items[idx]?.dataset.book;
        if (book) showChapters(book);
      } else if (col === chapsCol) {
        chapsCol.querySelectorAll(".idx-item").forEach(el => el.classList.remove("active"));
        items[idx].classList.add("active");
        const chNum = items[idx].dataset.chapter;
        if (chNum && activeBook) showVerses(activeBook, Number(chNum));
      }
      return;
    }

    if (key === "ArrowRight" || (key === "Tab" && !e.shiftKey)) {
      e.preventDefault();
      if (focusedCol < 2 && getItems(cols[focusedCol + 1]).length) {
        focusedCol++;
        const active = cols[focusedCol].querySelector(".idx-item.active") as HTMLElement;
        if (active) active.focus();
        else focusItem(cols[focusedCol], 0);
      }
      return;
    }

    if (key === "ArrowLeft" || (key === "Tab" && e.shiftKey)) {
      e.preventDefault();
      if (focusedCol > 0) {
        focusedCol--;
        const active = cols[focusedCol].querySelector(".idx-item.active") as HTMLElement;
        if (active) active.focus();
        else focusItem(cols[focusedCol], 0);
      }
      return;
    }

    if (key === "Enter") {
      e.preventDefault();
      const focused = col.querySelector(".idx-item:focus") as HTMLElement;
      if (focused) focused.click();
      return;
    }
  });

  // Track which column has focus
  for (let i = 0; i < cols.length; i++) {
    cols[i].addEventListener("focusin", () => { focusedCol = i; });
  }
}

// --- Parallel translation rendering ---

export function renderParallelChapter(primary: BibleData, secondary: BibleData, book: string, chapter: number, primaryLabel: string, secondaryLabel: string) {
  const ch1 = primary[book]?.[String(chapter)];
  const ch2 = secondary[book]?.[String(chapter)];
  if (!ch1) { $("content").innerHTML = `<p class="empty">${t().notFound}</p>`; return; }

  const { prev, next } = getChapterNav(primary, book, chapter);
  const nums = Object.keys(ch1).map(Number).sort((a, b) => a - b);

  let html = navArrowsHtml(prev, next);
  html += `<div class="parallel-copy-both"><button class="copy-btn" data-copy-book="${esc(book)}" data-copy-chapter="${chapter}" data-copy-source="both">&#128203; ${esc(t().copyBoth)}</button></div>`;
  html += `<div class="parallel-container">`;

  // Primary column
  html += `<div class="parallel-col"><div class="parallel-translation-label">${esc(primaryLabel)}</div>`;
  html += `<h2 class="section-title">${esc(displayNameFor(primaryLabel, book))} ${chapter} <button class="copy-btn" data-copy-book="${esc(book)}" data-copy-chapter="${chapter}" data-copy-source="primary">&#128203;</button></h2>`;
  html += `<div class="verses">`;
  for (const n of nums) {
    html += `<span class="verse${hlClass(book, chapter, n)}" data-book="${esc(book)}" data-chapter="${chapter}" data-verse="${n}"><sup>${n}</sup>${fmt(ch1[String(n)])}</span> `;
  }
  html += `</div></div>`;

  // Secondary column
  html += `<div class="parallel-col"><div class="parallel-translation-label">${esc(secondaryLabel)}</div>`;
  html += `<h2 class="section-title">${esc(displayNameFor(secondaryLabel, book))} ${chapter} <button class="copy-btn" data-copy-book="${esc(book)}" data-copy-chapter="${chapter}" data-copy-source="secondary">&#128203;</button></h2>`;
  html += `<div class="verses">`;
  if (ch2) {
    for (const n of nums) {
      const text = ch2[String(n)];
      if (text) html += `<span class="verse${hlClass(book, chapter, n)}" data-book="${esc(book)}" data-chapter="${chapter}" data-verse="${n}" data-secondary="1"><sup>${n}</sup>${fmt(text)}</span> `;
    }
  } else {
    html += `<p class="empty">${t().notFound}</p>`;
  }
  html += `</div></div>`;

  html += `</div>`;
  html += navArrowsHtml(prev, next);
  $("content").innerHTML = html;
  window.scrollTo(0, 0);
}

export function renderParallelVerseSegments(primary: BibleData, secondary: BibleData, book: string, chapter: number, segments: { start: number; end: number }[], primaryLabel: string, secondaryLabel: string) {
  const ch1 = primary[book]?.[String(chapter)];
  const ch2 = secondary[book]?.[String(chapter)];
  if (!ch1) { $("content").innerHTML = `<p class="empty">${t().notFound}</p>`; return; }

  const segLabel = segments.map(s => s.start === s.end ? `${s.start}` : `${s.start}-${s.end}`).join(",");

  let html = `<div class="parallel-copy-both"><button class="copy-btn" data-copy-book="${esc(book)}" data-copy-chapter="${chapter}" data-copy-segments="${esc(segLabel)}" data-copy-source="both">&#128203; ${esc(t().copyBoth)}</button></div>`;
  html += `<div class="parallel-container">`;

  // Primary column
  html += `<div class="parallel-col"><div class="parallel-translation-label">${esc(primaryLabel)}</div>`;
  html += `<h2 class="section-title">${esc(displayNameFor(primaryLabel, book))} ${chapter}:${segLabel} <button class="copy-btn" data-copy-book="${esc(book)}" data-copy-chapter="${chapter}" data-copy-segments="${esc(segLabel)}" data-copy-source="primary">&#128203;</button></h2>`;
  html += `<div class="verses">`;
  for (const seg of segments) {
    for (let v = seg.start; v <= seg.end; v++) {
      const text = ch1[String(v)];
      if (!text) continue;
      html += `<span class="verse${hlClass(book, chapter, v)}" data-book="${esc(book)}" data-chapter="${chapter}" data-verse="${v}"><sup>${v}</sup>${fmt(text)}</span> `;
    }
  }
  html += `</div></div>`;

  // Secondary column
  html += `<div class="parallel-col"><div class="parallel-translation-label">${esc(secondaryLabel)}</div>`;
  html += `<h2 class="section-title">${esc(displayNameFor(secondaryLabel, book))} ${chapter}:${segLabel} <button class="copy-btn" data-copy-book="${esc(book)}" data-copy-chapter="${chapter}" data-copy-segments="${esc(segLabel)}" data-copy-source="secondary">&#128203;</button></h2>`;
  html += `<div class="verses">`;
  if (ch2) {
    for (const seg of segments) {
      for (let v = seg.start; v <= seg.end; v++) {
        const text = ch2[String(v)];
        if (!text) continue;
        html += `<span class="verse${hlClass(book, chapter, v)}" data-book="${esc(book)}" data-chapter="${chapter}" data-verse="${v}" data-secondary="1"><sup>${v}</sup>${fmt(text)}</span> `;
      }
    }
  } else {
    html += `<p class="empty">${t().notFound}</p>`;
  }
  html += `</div></div>`;

  html += `</div>`;
  html += `<div class="read-full-chapter"><a class="full-chapter-link" data-book="${esc(book)}" data-chapter="${chapter}">${t().readFullChapter} &rarr;</a></div>`;
  $("content").innerHTML = html;
  window.scrollTo(0, 0);
}

export function renderParallelVerse(primary: BibleData, secondary: BibleData, book: string, chapter: number, verse: number, primaryLabel: string, secondaryLabel: string) {
  const text1 = primary[book]?.[String(chapter)]?.[String(verse)];
  if (!text1) { $("content").innerHTML = `<p class="empty">${t().notFound}</p>`; return; }
  const text2 = secondary[book]?.[String(chapter)]?.[String(verse)];

  const { prev, next } = getVerseNav(primary, book, chapter, verse);
  let html = navArrowsHtml(prev, next);
  html += `<div class="parallel-copy-both"><button class="copy-btn" data-copy-book="${esc(book)}" data-copy-chapter="${chapter}" data-copy-verse="${verse}" data-copy-source="both">&#128203; ${esc(t().copyBoth)}</button></div>`;
  html += `<div class="parallel-container">`;
  html += `<div class="parallel-col"><div class="parallel-translation-label">${esc(primaryLabel)}</div>`;
  html += `<h2 class="section-title">${esc(displayNameFor(primaryLabel, book))} ${chapter}:${verse} <button class="copy-btn" data-copy-book="${esc(book)}" data-copy-chapter="${chapter}" data-copy-verse="${verse}" data-copy-source="primary">&#128203;</button></h2>`;
  html += `<div class="verses single-verse"><span class="verse${hlClass(book, chapter, verse)}" data-book="${esc(book)}" data-chapter="${chapter}" data-verse="${verse}"><sup>${verse}</sup>${fmt(text1)}</span></div></div>`;
  html += `<div class="parallel-col"><div class="parallel-translation-label">${esc(secondaryLabel)}</div>`;
  html += `<h2 class="section-title">${esc(displayNameFor(secondaryLabel, book))} ${chapter}:${verse} <button class="copy-btn" data-copy-book="${esc(book)}" data-copy-chapter="${chapter}" data-copy-verse="${verse}" data-copy-source="secondary">&#128203;</button></h2>`;
  html += `<div class="verses single-verse"><span class="verse${hlClass(book, chapter, verse)}" data-book="${esc(book)}" data-chapter="${chapter}" data-verse="${verse}" data-secondary="1"><sup>${verse}</sup>${text2 ? fmt(text2) : t().notFound}</span></div></div>`;
  html += `</div>`;
  html += `<div class="read-full-chapter"><a class="full-chapter-link" data-book="${esc(book)}" data-chapter="${chapter}">${t().readFullChapter} &rarr;</a></div>`;
  $("content").innerHTML = html;
  window.scrollTo(0, 0);
}

function navRefLabelFor(translationCode: string, nav: NavRef): string {
  const { book, chapterStart, chapterEnd, verseSegments } = nav;
  const name = displayNameFor(translationCode, book);
  if (chapterStart !== undefined && chapterEnd !== undefined) {
    if (verseSegments) {
      const segLabel = verseSegments.map(s => s.start === s.end ? `${s.start}` : `${s.start}-${s.end}`).join(",");
      return `${name} ${chapterStart}:${segLabel}`;
    }
    if (chapterStart === chapterEnd) return `${name} ${chapterStart}`;
    return `${name} ${chapterStart}-${chapterEnd}`;
  }
  return name;
}

function parallelNavRefHtml(primary: BibleData, secondary: BibleData, nav: NavRef, primaryLabel: string, secondaryLabel: string): string {
  const { book, chapterStart, chapterEnd, verseSegments } = nav;
  const bd1 = primary[book];
  const bd2 = secondary[book];
  if (!bd1) return '';

  const pTitle = navRefLabelFor(primaryLabel, nav);
  const sTitle = navRefLabelFor(secondaryLabel, nav);

  let primaryHtml = '';
  let secondaryHtml = '';

  if (chapterStart !== undefined && chapterEnd !== undefined) {
    if (verseSegments) {
      const ch1 = bd1[String(chapterStart)];
      const ch2 = bd2?.[String(chapterStart)];
      primaryHtml += `<div class="verses">`;
      for (const seg of verseSegments) {
        for (let v = seg.start; v <= seg.end; v++) {
          const text = ch1?.[String(v)];
          if (!text) continue;
          primaryHtml += `<span class="verse${hlClass(book, chapterStart, v)}" data-book="${esc(book)}" data-chapter="${chapterStart}" data-verse="${v}"><sup>${v}</sup>${fmt(text)}</span> `;
        }
      }
      primaryHtml += `</div>`;

      secondaryHtml += `<div class="verses">`;
      if (ch2) {
        for (const seg of verseSegments) {
          for (let v = seg.start; v <= seg.end; v++) {
            const text = ch2[String(v)];
            if (!text) continue;
            secondaryHtml += `<span class="verse${hlClass(book, chapterStart, v)}" data-book="${esc(book)}" data-chapter="${chapterStart}" data-verse="${v}" data-secondary="1"><sup>${v}</sup>${fmt(text)}</span> `;
          }
        }
      } else {
        secondaryHtml += `<p class="empty">${t().notFound}</p>`;
      }
      secondaryHtml += `</div>`;
    } else {
      for (let c = chapterStart; c <= chapterEnd; c++) {
        const ch1 = bd1[String(c)];
        const ch2 = bd2?.[String(c)];
        if (!ch1) continue;
        const nums = Object.keys(ch1).map(Number).sort((a, b) => a - b);
        if (chapterStart !== chapterEnd) {
          primaryHtml += `<h3 class="multi-nav-subheading">${esc(displayNameFor(primaryLabel, book))} ${c}</h3>`;
          secondaryHtml += `<h3 class="multi-nav-subheading">${esc(displayNameFor(secondaryLabel, book))} ${c}</h3>`;
        }
        primaryHtml += `<div class="verses">`;
        for (const n of nums) {
          primaryHtml += `<span class="verse${hlClass(book, c, n)}" data-book="${esc(book)}" data-chapter="${c}" data-verse="${n}"><sup>${n}</sup>${fmt(ch1[String(n)])}</span> `;
        }
        primaryHtml += `</div>`;

        secondaryHtml += `<div class="verses">`;
        if (ch2) {
          for (const n of nums) {
            const text = ch2[String(n)];
            if (text) secondaryHtml += `<span class="verse${hlClass(book, c, n)}" data-book="${esc(book)}" data-chapter="${c}" data-verse="${n}" data-secondary="1"><sup>${n}</sup>${fmt(text)}</span> `;
          }
        } else {
          secondaryHtml += `<p class="empty">${t().notFound}</p>`;
        }
        secondaryHtml += `</div>`;
      }
    }
  } else {
    // Whole book → show chapter 1
    const ch1 = bd1["1"];
    const ch2 = bd2?.["1"];
    if (!ch1) return '';
    const nums = Object.keys(ch1).map(Number).sort((a, b) => a - b);
    primaryHtml += `<div class="verses">`;
    for (const n of nums) {
      primaryHtml += `<span class="verse${hlClass(book, 1, n)}" data-book="${esc(book)}" data-chapter="1" data-verse="${n}"><sup>${n}</sup>${fmt(ch1[String(n)])}</span> `;
    }
    primaryHtml += `</div>`;

    secondaryHtml += `<div class="verses">`;
    if (ch2) {
      for (const n of nums) {
        const text = ch2[String(n)];
        if (text) secondaryHtml += `<span class="verse${hlClass(book, 1, n)}" data-book="${esc(book)}" data-chapter="1" data-verse="${n}" data-secondary="1"><sup>${n}</sup>${fmt(text)}</span> `;
      }
    } else {
      secondaryHtml += `<p class="empty">${t().notFound}</p>`;
    }
    secondaryHtml += `</div>`;
  }

  let html = `<div class="parallel-container">`;
  html += `<div class="parallel-col"><div class="parallel-translation-label">${esc(primaryLabel)}</div>`;
  html += `<h2 class="section-title">${esc(pTitle)} <button class="copy-btn" data-copy-book="${esc(book)}" data-copy-chapter="${chapterStart ?? 1}" data-copy-source="primary">&#128203;</button></h2>`;
  html += primaryHtml;
  html += `</div>`;
  html += `<div class="parallel-col"><div class="parallel-translation-label">${esc(secondaryLabel)}</div>`;
  html += `<h2 class="section-title">${esc(sTitle)} <button class="copy-btn" data-copy-book="${esc(book)}" data-copy-chapter="${chapterStart ?? 1}" data-copy-source="secondary">&#128203;</button></h2>`;
  html += secondaryHtml;
  html += `</div></div>`;

  return html;
}

export function renderParallelMultiNav(primary: BibleData, secondary: BibleData, refs: NavRef[], primaryLabel: string, secondaryLabel: string) {
  let html = '';
  for (let i = 0; i < refs.length; i++) {
    if (i > 0) html += `<hr class="multi-nav-divider">`;
    html += `<section class="multi-nav-section">`;
    html += parallelNavRefHtml(primary, secondary, refs[i], primaryLabel, secondaryLabel);
    const ch = refs[i].chapterStart ?? 1;
    html += `<div class="read-full-chapter"><a class="full-chapter-link" data-book="${esc(refs[i].book)}" data-chapter="${ch}">${t().readFullChapter} &rarr;</a></div>`;
    html += `</section>`;
  }
  $('content').innerHTML = html;
  window.scrollTo(0, 0);
}


