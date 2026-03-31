import type { BibleData, VerseResult } from "./types.ts";
import type { NavRef } from "./search.ts";
import { displayName } from "./bookNames.ts";

const $ = (id: string) => document.getElementById(id)!;

function esc(s: string): string {
  const d = document.createElement("div");
  d.textContent = s;
  return d.innerHTML.replace(/"/g, "&quot;");
}

function fmt(text: string): string {
  return esc(text).replace(/\n/g, "<br>");
}

function escRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

interface NavTarget {
  book: string;
  chapter: number;
  verse?: number;
  label: string;
}

function getChapterNav(data: BibleData, book: string, chapter: number): { prev: NavTarget | null; next: NavTarget | null } {
  const books = Object.keys(data);
  const bi = books.indexOf(book);
  const chapters = Object.keys(data[book]).map(Number).sort((a, b) => a - b);
  const ci = chapters.indexOf(chapter);

  let prev: NavTarget | null = null;
  let next: NavTarget | null = null;

  if (ci > 0) {
    prev = { book, chapter: chapters[ci - 1], label: `${displayName(book)} ${chapters[ci - 1]}` };
  } else if (bi > 0) {
    const pb = books[bi - 1];
    const pChs = Object.keys(data[pb]).map(Number).sort((a, b) => a - b);
    const lastCh = pChs[pChs.length - 1];
    prev = { book: pb, chapter: lastCh, label: `${displayName(pb)} ${lastCh}` };
  }

  if (ci < chapters.length - 1) {
    next = { book, chapter: chapters[ci + 1], label: `${displayName(book)} ${chapters[ci + 1]}` };
  } else if (bi < books.length - 1) {
    const nb = books[bi + 1];
    const nChs = Object.keys(data[nb]).map(Number).sort((a, b) => a - b);
    next = { book: nb, chapter: nChs[0], label: `${displayName(nb)} ${nChs[0]}` };
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
    prev = { book, chapter, verse: verses[vi - 1], label: `${displayName(book)} ${chapter}:${verses[vi - 1]}` };
  } else if (ci > 0) {
    const pc = chapters[ci - 1];
    const pVs = Object.keys(data[book][String(pc)]).map(Number).sort((a, b) => a - b);
    const lastV = pVs[pVs.length - 1];
    prev = { book, chapter: pc, verse: lastV, label: `${displayName(book)} ${pc}:${lastV}` };
  } else if (bi > 0) {
    const pb = books[bi - 1];
    const pChs = Object.keys(data[pb]).map(Number).sort((a, b) => a - b);
    const lastCh = pChs[pChs.length - 1];
    const pVs = Object.keys(data[pb][String(lastCh)]).map(Number).sort((a, b) => a - b);
    const lastV = pVs[pVs.length - 1];
    prev = { book: pb, chapter: lastCh, verse: lastV, label: `${displayName(pb)} ${lastCh}:${lastV}` };
  }

  if (vi < verses.length - 1) {
    next = { book, chapter, verse: verses[vi + 1], label: `${displayName(book)} ${chapter}:${verses[vi + 1]}` };
  } else if (ci < chapters.length - 1) {
    const nc = chapters[ci + 1];
    const nVs = Object.keys(data[book][String(nc)]).map(Number).sort((a, b) => a - b);
    next = { book, chapter: nc, verse: nVs[0], label: `${displayName(book)} ${nc}:${nVs[0]}` };
  } else if (bi < books.length - 1) {
    const nb = books[bi + 1];
    const nChs = Object.keys(data[nb]).map(Number).sort((a, b) => a - b);
    const nVs = Object.keys(data[nb][String(nChs[0])]).map(Number).sort((a, b) => a - b);
    next = { book: nb, chapter: nChs[0], verse: nVs[0], label: `${displayName(nb)} ${nChs[0]}:${nVs[0]}` };
  }

  return { prev, next };
}

function navArrowsHtml(prev: NavTarget | null, next: NavTarget | null): string {
  const prevBtn = prev
    ? `<a class="nav-arrow nav-prev" data-book="${esc(prev.book)}" data-chapter="${prev.chapter}"${prev.verse !== undefined ? ` data-verse="${prev.verse}"` : ""}>&laquo; ${esc(prev.label)}</a>`
    : `<span class="nav-arrow nav-prev nav-disabled"></span>`;
  const nextBtn = next
    ? `<a class="nav-arrow nav-next" data-book="${esc(next.book)}" data-chapter="${next.chapter}"${next.verse !== undefined ? ` data-verse="${next.verse}"` : ""}>${esc(next.label)} &raquo;</a>`
    : `<span class="nav-arrow nav-next nav-disabled"></span>`;
  return `<nav class="chapter-nav">${prevBtn}<span class="nav-translation"></span>${nextBtn}</nav>`;
}

export function renderChapter(data: BibleData, book: string, chapter: number) {
  const ch = data[book]?.[String(chapter)];
  if (!ch) { $("content").innerHTML = `<p class="empty">Not found.</p>`; return; }

  const { prev, next } = getChapterNav(data, book, chapter);
  const nums = Object.keys(ch).map(Number).sort((a, b) => a - b);
  let html = navArrowsHtml(prev, next);
  html += `<h2 class="section-title">${esc(displayName(book))} ${chapter}</h2><div class="verses">`;
  for (const n of nums) {
    html += `<span class="verse"><sup>${n}</sup>${fmt(ch[String(n)])}</span> `;
  }
  html += `</div>`;
  html += navArrowsHtml(prev, next);
  $("content").innerHTML = html;
  window.scrollTo(0, 0);
}

export function renderBook(data: BibleData, book: string) {
  const bd = data[book];
  if (!bd) { $("content").innerHTML = `<p class="empty">Not found.</p>`; return; }

  const chs = Object.keys(bd).map(Number).sort((a, b) => a - b);
  let html = `<h1 class="book-title">${esc(displayName(book))}</h1>`;
  for (const c of chs) {
    const verses = bd[String(c)];
    const nums = Object.keys(verses).map(Number).sort((a, b) => a - b);
    html += `<div class="chapter-block"><h2 class="chapter-heading" data-book="${esc(book)}" data-chapter="${c}">Chapter ${c}</h2><div class="verses">`;
    for (const n of nums) {
      html += `<span class="verse"><sup>${n}</sup>${fmt(verses[String(n)])}</span> `;
    }
    html += `</div></div>`;
  }
  $("content").innerHTML = html;
  window.scrollTo(0, 0);
}

export function renderVerse(data: BibleData, book: string, chapter: number, verse: number) {
  const text = data[book]?.[String(chapter)]?.[String(verse)];
  if (!text) { $("content").innerHTML = `<p class="empty">Not found.</p>`; return; }

  const { prev, next } = getVerseNav(data, book, chapter, verse);
  $("content").innerHTML = `
    ${navArrowsHtml(prev, next)}
    <h2 class="section-title">${esc(displayName(book))} ${chapter}:${verse}</h2>
    <div class="verses single-verse">
      <span class="verse"><sup>${verse}</sup>${fmt(text)}</span>
    </div>`;
  window.scrollTo(0, 0);
}

export function renderChapterRange(data: BibleData, book: string, chStart: number, chEnd: number) {
  const bd = data[book];
  if (!bd) { $("content").innerHTML = `<p class="empty">Not found.</p>`; return; }

  const { prev } = getChapterNav(data, book, chStart);
  const { next } = getChapterNav(data, book, chEnd);
  let html = navArrowsHtml(prev, next);
  for (let c = chStart; c <= chEnd; c++) {
    const ch = bd[String(c)];
    if (!ch) continue;
    const nums = Object.keys(ch).map(Number).sort((a, b) => a - b);
    html += `<div class="chapter-block"><h2 class="chapter-heading" data-book="${esc(book)}" data-chapter="${c}">${esc(displayName(book))} ${c}</h2><div class="verses">`;
    for (const n of nums) {
      html += `<span class="verse"><sup>${n}</sup>${fmt(ch[String(n)])}</span> `;
    }
    html += `</div></div>`;
  }
  html += navArrowsHtml(prev, next);
  $("content").innerHTML = html;
  window.scrollTo(0, 0);
}

export function renderVerseSegments(data: BibleData, book: string, chapter: number, segments: { start: number; end: number }[]) {
  const ch = data[book]?.[String(chapter)];
  if (!ch) { $("content").innerHTML = `<p class="empty">Not found.</p>`; return; }

  // Build title label like "Genesis 8:1-3,6"
  const segLabel = segments.map(s => s.start === s.end ? `${s.start}` : `${s.start}-${s.end}`).join(",");
  const title = `${displayName(book)} ${chapter}:${segLabel}`;

  // Determine first and last verse for nav
  const firstVerse = segments[0].start;
  const lastSeg = segments[segments.length - 1];
  const lastVerse = lastSeg.end;

  const { prev } = getVerseNav(data, book, chapter, firstVerse);
  const { next } = getVerseNav(data, book, chapter, lastVerse);

  let html = navArrowsHtml(prev, next);
  html += `<h2 class="section-title">${esc(title)}</h2><div class="verses">`;
  for (const seg of segments) {
    for (let v = seg.start; v <= seg.end; v++) {
      const text = ch[String(v)];
      if (!text) continue;
      html += `<span class="verse"><sup>${v}</sup>${fmt(text)}</span> `;
    }
  }
  html += `</div>`;
  html += navArrowsHtml(prev, next);
  $("content").innerHTML = html;
  window.scrollTo(0, 0);
}
function navRefLabel(nav: NavRef): string {
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
          html += `<span class="verse"><sup>${v}</sup>${fmt(text)}</span> `;
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
          html += `<span class="verse"><sup>${n}</sup>${fmt(ch[String(n)])}</span> `;
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
      html += `<span class="verse"><sup>${n}</sup>${fmt(ch[String(n)])}</span> `;
    }
    html += `</div>`;
  }

  return html;
}

export function renderMultiNav(data: BibleData, refs: NavRef[]) {
  let html = '';
  for (let i = 0; i < refs.length; i++) {
    if (i > 0) html += `<hr class="multi-nav-divider">`;
    html += `<section class="multi-nav-section">`;
    html += `<h2 class="section-title">${esc(navRefLabel(refs[i]))}</h2>`;
    html += navRefVersesHtml(data, refs[i]);
    html += `</section>`;
  }
  $('content').innerHTML = html;
  window.scrollTo(0, 0);
}
export function renderResults(results: VerseResult[], query: string) {
  if (!results.length) {
    $("content").innerHTML = `<p class="empty">No results for &ldquo;${esc(query)}&rdquo;</p>`;
    return;
  }

  const terms = query.split(/;/).map(t => t.trim()).filter(Boolean);
  const highlights: string[] = [];
  for (const t of terms) {
    const m = t.match(/"(.+?)"/);
    let raw = m ? m[1] : (t.startsWith("^") || t.endsWith("$")) ? t : null;
    if (!raw) continue;
    // Strip ^/$ anchors — they control matching, not literal text
    raw = raw.replace(/^\^/, "").replace(/\$$/, "");
    if (raw.length >= 2) highlights.push(raw);
  }
  let html = `<p class="results-info">${results.length} result${results.length !== 1 ? "s" : ""}</p><div class="results">`;

  // Build a single combined regex to avoid corrupting <mark> tags across passes
  const hlRegex = highlights.length
    ? new RegExp(`(${highlights.map(h => escRegex(esc(h))).join("|")})`, "gi")
    : null;

  for (const r of results) {
    let highlighted = fmt(r.text);
    if (hlRegex) highlighted = highlighted.replace(hlRegex, "<mark>$1</mark>");
    html += `<div class="result" data-book="${esc(r.book)}" data-chapter="${r.chapter}" data-verse="${r.verse}">
      <div class="result-ref">${esc(displayName(r.book))} ${r.chapter}:${r.verse}</div>
      <div class="result-text">${highlighted}</div>
    </div>`;
  }

  html += `</div>`;
  $("content").innerHTML = html;
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

  if (booksCol.children.length > 0) return;

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
      chEl.tabIndex = -1;
      const first = data[book][String(c)]?.["1"] || "";
      const preview = first.substring(0, 60).replace(/\n/g, " ");
      chEl.innerHTML = `<strong>Chapter ${c}</strong><small>${esc(preview)}${first.length > 60 ? "\u2026" : ""}</small>`;

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
  for (const book of books) {
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
      let idx = getActiveIndex(col);
      if (key === "ArrowDown") idx = idx < items.length - 1 ? idx + 1 : 0;
      else idx = idx > 0 ? idx - 1 : items.length - 1;
      items[idx]?.focus();
      // Trigger hover-equivalent behavior
      if (col === booksCol) {
        const book = items[idx]?.dataset.book;
        if (book) showChapters(book);
      } else if (col === chapsCol) {
        items[idx]?.dispatchEvent(new MouseEvent("mouseenter"));
      }
      return;
    }

    if (key === "ArrowRight" || key === "Tab" && !e.shiftKey) {
      if (focusedCol < 2 && getItems(cols[focusedCol + 1]).length) {
        e.preventDefault();
        focusedCol++;
        const active = cols[focusedCol].querySelector(".idx-item.active") as HTMLElement;
        if (active) active.focus();
        else focusItem(cols[focusedCol], 0);
      } else if (key === "Tab") {
        e.preventDefault();
      }
      return;
    }

    if (key === "ArrowLeft" || key === "Tab" && e.shiftKey) {
      if (focusedCol > 0) {
        e.preventDefault();
        focusedCol--;
        const active = cols[focusedCol].querySelector(".idx-item.active") as HTMLElement;
        if (active) active.focus();
        else focusItem(cols[focusedCol], 0);
      } else if (key === "Tab") {
        e.preventDefault();
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
