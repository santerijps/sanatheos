import type { BibleData, HighlightColor, Bookmark } from "../types.ts";
import { setHighlight, removeHighlight, hasBookmark, addBookmark, removeBookmark } from "../db.ts";
import { getNoteMap as getRenderNoteMap, renderStrongsPanel } from "../render.ts";
import { displayName } from "../bookNames.ts";
import { t, getLanguage } from "../i18n.ts";
import { TRANSLATION_NAMES } from "../services/api.ts";
import { ICON_COPY, ICON_BOOKMARK, ICON_NOTE } from "../render.ts";

export interface HighlightsDeps {
	getData: () => BibleData;
	getParallelData: () => BibleData | null;
	getCurrentTranslation: () => string;
	getParallelTranslation: () => string;
	getHighlightMap: () => Map<string, HighlightColor>;
	updateHighlightEntry: (key: string, color: HighlightColor | undefined) => void;
	showToast: (msg: string) => void;
	openNoteDialog: (book: string, chapter: number, verse: number) => void;
	syncBookmarkBtn: () => Promise<void>;
}

export function initHighlights(deps: HighlightsDeps) {
	const content = document.getElementById("content")!;
	const verseMenu = document.getElementById("verse-menu")!;

	function closeVerseMenu() {
		verseMenu.classList.remove("open");
		verseMenu.innerHTML = "";
	}

	async function openVerseMenu(verseEl: HTMLElement, x: number, y: number) {
		const book = verseEl.dataset.book!;
		const chapter = +verseEl.dataset.chapter!;
		const verse = +verseEl.dataset.verse!;
		const hlKey = `${book}:${chapter}:${verse}`;
		const currentColor = deps.getHighlightMap().get(hlKey);

		const colors: HighlightColor[] = ["yellow", "green", "blue", "pink", "orange"];
		const lang = getLanguage();
		const colorTitles: Record<HighlightColor, string> = {
			yellow: lang === "fi" ? "Keltainen" : lang === "sv" ? "Gul" : "Yellow",
			green: lang === "fi" ? "Vihreä" : lang === "sv" ? "Grön" : "Green",
			blue: lang === "fi" ? "Sininen" : lang === "sv" ? "Blå" : "Blue",
			pink: lang === "fi" ? "Pinkki" : lang === "sv" ? "Rosa" : "Pink",
			orange: lang === "fi" ? "Oranssi" : lang === "sv" ? "Orange" : "Orange",
		};
		let html = "";

		html += `<button class="verse-menu-item" data-action="copy" role="menuitem">${ICON_COPY} ${t().copyVerse}</button>`;

		const bmId = `${book}:${chapter}:${verse}`;
		const isVerseBookmarked = await hasBookmark(bmId);
		html += `<button class="verse-menu-item" data-action="bookmark" role="menuitem">${ICON_BOOKMARK} ${isVerseBookmarked ? escapeHtml(t().removeBookmark) : escapeHtml(t().bookmarkThis)}</button>`;

		const noteId = `${book}:${chapter}:${verse}`;
		const hasNote = getRenderNoteMap().has(noteId);
		html += `<button class="verse-menu-item" data-action="note" role="menuitem">${ICON_NOTE} ${hasNote ? escapeHtml(t().editNote) : escapeHtml(t().addNote)}</button>`;

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

		const rect = verseMenu.getBoundingClientRect();
		const menuW = rect.width || 180;
		const menuH = rect.height || 120;
		let left = Math.min(x, window.innerWidth - menuW - 8);
		let top = Math.min(y, window.innerHeight - menuH - 8);
		left = Math.max(8, left);
		top = Math.max(8, top);
		verseMenu.style.left = left + "px";
		verseMenu.style.top = top + "px";

		verseMenu.onclick = async (ev) => {
			const target = (ev.target as HTMLElement).closest(
				"[data-action]",
			) as HTMLElement | null;
			if (!target) return;
			const action = target.dataset.action;

			if (action === "copy") {
				const isSecondary = verseEl.dataset.secondary === "1";
				const parallelData = deps.getParallelData();
				const parallelTranslation = deps.getParallelTranslation();
				const sourceData = isSecondary && parallelData ? parallelData : deps.getData();
				const sourceCode = isSecondary ? parallelTranslation : deps.getCurrentTranslation();
				const sourceInfo = TRANSLATION_NAMES[sourceCode];
				const sourceLabel = sourceInfo ? `${sourceCode} — ${sourceInfo.name}` : sourceCode;
				const text = sourceData[book]?.[String(chapter)]?.[String(verse)];
				if (text) {
					const full = `${sourceLabel}\n${displayName(book)} ${chapter}:${verse}\n${verse} ${text}`;
					navigator.clipboard.writeText(full).then(() => deps.showToast(t().copied));
				}
			} else if (action === "bookmark") {
				const alreadyBookmarked = await hasBookmark(bmId);
				if (alreadyBookmarked) {
					await removeBookmark(bmId);
					deps.showToast(t().bookmarkRemoved);
				} else {
					const bm: Bookmark = { id: bmId, book, chapter, verse, addedAt: Date.now() };
					await addBookmark(bm);
					deps.showToast(t().bookmarkAdded);
				}
				await deps.syncBookmarkBtn();
			} else if (action === "note") {
				closeVerseMenu();
				deps.openNoteDialog(book, chapter, verse);
				return;
			} else if (action === "highlight") {
				const color = target.dataset.color as HighlightColor;
				if (color === currentColor) {
					await removeHighlight(book, chapter, verse);
					deps.updateHighlightEntry(hlKey, undefined);
					content
						.querySelectorAll(
							`.verse[data-book="${CSS.escape(book)}"][data-chapter="${chapter}"][data-verse="${verse}"]`,
						)
						.forEach((el) => {
							(el as HTMLElement).className = "verse";
						});
				} else {
					await setHighlight({ book, chapter, verse, color });
					deps.updateHighlightEntry(hlKey, color);
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
				deps.updateHighlightEntry(hlKey, undefined);
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

	// Left-click on verse sup number → open context menu
	content.addEventListener("click", (e) => {
		const sup = (e.target as HTMLElement).closest("sup");
		if (!sup) return;
		// Note markers are handled by notes.ts — skip them here
		if (sup.classList.contains("verse-note-marker")) return;
		const verseEl = sup.closest(".verse") as HTMLElement;
		if (!verseEl || !verseEl.dataset.book) return;
		e.stopPropagation();
		openVerseMenu(verseEl, e.clientX, e.clientY);
	});

	// Long-press on verse sup for touch devices
	let longPressTimer: number;
	content.addEventListener(
		"touchstart",
		(e) => {
			const sup = (e.target as HTMLElement).closest("sup");
			if (!sup) return;
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

	return { closeVerseMenu };
}

function escapeHtml(str: string): string {
	return str
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;");
}

// Re-export for use in Strong's panel rendering
export { renderStrongsPanel };
