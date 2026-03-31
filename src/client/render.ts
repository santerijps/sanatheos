import type { BibleData, VerseResult } from "./types.ts";

const $ = (id: string) => document.getElementById(id)!;

function esc(s: string): string {
  const d = document.createElement("div");
  d.textContent = s;
  return d.innerHTML;
}

function fmt(text: string): string {
  return esc(text).replace(/\n/g, "<br>");
}

function escRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function renderChapter(data: BibleData, book: string, chapter: number) {
  const ch = data[book]?.[String(chapter)];
  if (!ch) { $("content").innerHTML = `<p class="empty">Not found.</p>`; return; }

  const nums = Object.keys(ch).map(Number).sort((a, b) => a - b);
  let html = `<h2 class="section-title">${esc(book)} ${chapter}</h2><div class="verses">`;
  for (const n of nums) {
    html += `<span class="verse"><sup>${n}</sup>${fmt(ch[String(n)])}</span> `;
  }
  html += `</div>`;
  $("content").innerHTML = html;
  window.scrollTo(0, 0);
}

export function renderBook(data: BibleData, book: string) {
  const bd = data[book];
  if (!bd) { $("content").innerHTML = `<p class="empty">Not found.</p>`; return; }

  const chs = Object.keys(bd).map(Number).sort((a, b) => a - b);
  let html = `<h1 class="book-title">${esc(book)}</h1>`;
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

  $("content").innerHTML = `
    <h2 class="section-title">${esc(book)} ${chapter}:${verse}</h2>
    <div class="verses single-verse">
      <span class="verse"><sup>${verse}</sup>${fmt(text)}</span>
    </div>`;
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
    if (m && m[1].length >= 2) highlights.push(m[1]);
  }
  let html = `<p class="results-info">${results.length} result${results.length !== 1 ? "s" : ""}</p><div class="results">`;

  for (const r of results) {
    let highlighted = fmt(r.text);
    for (const h of highlights) {
      const re = new RegExp(`(${escRegex(esc(h))})`, "gi");
      highlighted = highlighted.replace(re, "<mark>$1</mark>");
    }
    html += `<div class="result" data-book="${esc(r.book)}" data-chapter="${r.chapter}" data-verse="${r.verse}">
      <div class="result-ref">${esc(r.book)} ${r.chapter}:${r.verse}</div>
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
    el.textContent = book;
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
