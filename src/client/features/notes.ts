import type { BibleData, VerseNote } from "../types.ts";
import { deleteNote, getNoteMap, saveNote } from "../db.ts";
import { setNoteMap, getNoteMap as getRenderNoteMap } from "../render.ts";
import { displayName } from "../bookNames.ts";
import { t } from "../i18n.ts";

export interface NotesDeps {
	getData: () => BibleData;
	showToast: (msg: string) => void;
}

export interface NotesModule {
	openNoteDialog: (book: string, chapter: number, verse: number) => void;
	closeNoteDialog: () => void;
	syncSidenotes: () => void;
	updateSidenoteDom: (noteId: string, text: string | null) => void;
}

export function initNotes(deps: NotesDeps): NotesModule {
	const content = document.getElementById("content")!;
	const sidenoteRail = document.getElementById("sidenotes-rail")!;

	const noteDialogOverlay = document.getElementById("note-panel-overlay")!;
	const noteDialogTitle = document.getElementById("note-panel-title")!;
	const noteDialogRef = document.getElementById("note-panel-ref")!;
	const noteDialogTextarea = document.getElementById(
		"note-panel-textarea",
	) as HTMLTextAreaElement;
	const noteDialogSave = document.getElementById("note-panel-save")!;
	const noteDialogCancel = document.getElementById("note-panel-cancel")!;
	const noteDialogDelete = document.getElementById("note-panel-delete")!;
	const notePanelClose = document.getElementById("note-panel-close")!;
	const notePanelVerse = document.getElementById("note-panel-verse")!;

	let noteDialogCurrentId = "";

	function openNoteDialog(book: string, chapter: number, verse: number) {
		const id = `${book}:${chapter}:${verse}`;
		const existingText = getRenderNoteMap().get(id) ?? "";
		const refLabel = `${displayName(book)} ${chapter}:${verse}`;
		noteDialogCurrentId = id;
		noteDialogTitle.textContent = existingText ? t().editNote : t().addNote;
		noteDialogRef.textContent = refLabel;
		const data = deps.getData();
		const verseText = data?.[book]?.[String(chapter)]?.[String(verse)] ?? "";
		notePanelVerse.textContent = verseText ?? "";
		notePanelVerse.style.display = verseText ? "" : "none";
		noteDialogTextarea.value = existingText;
		noteDialogTextarea.placeholder = t().notePlaceholder;
		noteDialogSave.textContent = t().noteSave;
		noteDialogDelete.textContent = t().noteRemove;
		noteDialogDelete.style.display = existingText ? "inline-flex" : "none";
		noteDialogCancel.textContent = t().cancel;
		noteDialogOverlay.classList.add("open");
		setTimeout(() => noteDialogTextarea.focus(), 300);
	}

	function closeNoteDialog() {
		noteDialogOverlay.classList.remove("open");
		noteDialogCurrentId = "";
	}

	noteDialogCancel.addEventListener("click", closeNoteDialog);
	notePanelClose.addEventListener("click", closeNoteDialog);

	noteDialogOverlay.addEventListener("click", (e) => {
		if (e.target === noteDialogOverlay) closeNoteDialog();
	});

	noteDialogSave.addEventListener("click", async () => {
		const text = noteDialogTextarea.value.trim();
		if (!text || !noteDialogCurrentId) {
			closeNoteDialog();
			return;
		}
		const [bookPart, chapterStr, verseStr] = noteDialogCurrentId.split(":");
		const note: VerseNote = {
			id: noteDialogCurrentId,
			book: bookPart,
			chapter: +chapterStr,
			verse: +verseStr,
			text,
			updatedAt: Date.now(),
		};
		await saveNote(note);
		const newMap = await getNoteMap();
		setNoteMap(newMap);
		updateSidenoteDom(noteDialogCurrentId, text);
		requestAnimationFrame(() => requestAnimationFrame(syncSidenotes));
		closeNoteDialog();
		deps.showToast(t().noteSaved);
	});

	noteDialogDelete.addEventListener("click", async () => {
		if (!noteDialogCurrentId) return;
		await deleteNote(noteDialogCurrentId);
		const newMap = await getNoteMap();
		setNoteMap(newMap);
		updateSidenoteDom(noteDialogCurrentId, null);
		requestAnimationFrame(() => requestAnimationFrame(syncSidenotes));
		closeNoteDialog();
		deps.showToast(t().noteDeleted);
	});

	/** Update or remove a sidenote element in the currently rendered content without full re-render. */
	function updateSidenoteDom(noteId: string, text: string | null) {
		const aside = (content.querySelector(
			`.verse-sidenote[data-note-id="${CSS.escape(noteId)}"]`,
		) ??
			sidenoteRail.querySelector(
				`.verse-sidenote[data-note-id="${CSS.escape(noteId)}"]`,
			)) as HTMLElement | null;
		const markers = Array.from(
			content.querySelectorAll<HTMLElement>(
				`.verse-note-marker[data-note-id="${CSS.escape(noteId)}"]`,
			),
		);

		if (text === null) {
			aside?.remove();
			markers.forEach((m) => m.remove());
			const seenIds = new Map<string, number>();
			let counter = 0;
			content.querySelectorAll<HTMLElement>(".verse-note-marker").forEach((m) => {
				const id = m.dataset.noteId;
				if (!id) return;
				if (!seenIds.has(id)) seenIds.set(id, ++counter);
				const num = seenIds.get(id)!;
				m.textContent = `[${num}]`;
				m.setAttribute("aria-label", `Note ${num}`);
			});
			for (const [id, num] of seenIds) {
				const numEl =
					content.querySelector(
						`.verse-sidenote[data-note-id="${CSS.escape(id)}"] .verse-sidenote-num`,
					) ??
					sidenoteRail.querySelector(
						`.verse-sidenote[data-note-id="${CSS.escape(id)}"] .verse-sidenote-num`,
					);
				if (numEl) numEl.textContent = String(num);
			}
		} else if (aside) {
			const textEl = aside.querySelector(".verse-sidenote-text");
			if (textEl) textEl.textContent = text;
			const secondaryAside = content.querySelector(
				`.verse-sidenote[data-note-id="${CSS.escape(noteId)}"][data-secondary]`,
			) as HTMLElement | null;
			const secTextEl = secondaryAside?.querySelector(".verse-sidenote-text");
			if (secTextEl) secTextEl.textContent = text;
		} else {
			const [book, chapterStr, verseStr] = noteId.split(":");
			const verseEls = Array.from(
				content.querySelectorAll<HTMLElement>(
					`.verse[data-book="${CSS.escape(book)}"][data-chapter="${chapterStr}"][data-verse="${verseStr}"]`,
				),
			);
			if (verseEls.length > 0) {
				const existingIds = new Set(
					Array.from(content.querySelectorAll<HTMLElement>(".verse-note-marker")).map(
						(m) => m.dataset.noteId,
					),
				);
				const num = existingIds.size + 1;
				const label = `[${num}]`;

				for (const verseEl of verseEls) {
					const sup = document.createElement("sup");
					sup.className = "verse-note-marker";
					sup.dataset.noteId = noteId;
					sup.setAttribute("role", "button");
					sup.setAttribute("tabindex", "0");
					sup.setAttribute("aria-label", `Note ${num}`);
					sup.textContent = label;
					verseEl.appendChild(sup);
				}

				function makeAside(secondary: boolean): HTMLElement {
					const el = document.createElement("aside");
					el.className = "verse-sidenote";
					el.dataset.noteId = noteId;
					if (secondary) el.dataset.secondary = "1";
					const numSpan = document.createElement("span");
					numSpan.className = "verse-sidenote-num";
					numSpan.textContent = String(num);
					const textSpan = document.createElement("span");
					textSpan.className = "verse-sidenote-text";
					textSpan.textContent = text;
					el.appendChild(numSpan);
					el.appendChild(textSpan);
					return el;
				}

				verseEls[0].insertAdjacentElement("afterend", makeAside(false));
				for (let i = 1; i < verseEls.length; i++) {
					verseEls[i].insertAdjacentElement("afterend", makeAside(true));
				}
			}
		}
	}

	/**
	 * On desktop (≥768px): move all `.verse-sidenote` asides from `content` to
	 * `#sidenotes-rail` and position each one opposite its verse element.
	 * On mobile: restore any previously moved asides back into `content`.
	 */
	function syncSidenotes() {
		for (const aside of Array.from(
			sidenoteRail.querySelectorAll<HTMLElement>(".verse-sidenote"),
		)) {
			const noteId = aside.dataset.noteId;
			if (!noteId) {
				aside.remove();
				continue;
			}
			aside.style.top = "";
			const [book, chapterStr, verseStr] = noteId.split(":");
			const verseEl = content.querySelector(
				`.verse[data-book="${CSS.escape(book)}"][data-chapter="${chapterStr}"][data-verse="${verseStr}"]`,
			) as HTMLElement | null;
			if (verseEl) {
				content
					.querySelector(`.verse-sidenote[data-note-id="${CSS.escape(noteId)}"]`)
					?.remove();
				verseEl.insertAdjacentElement("afterend", aside);
			} else aside.remove();
		}

		if (window.innerWidth < 768) return;

		const asides = Array.from(
			content.querySelectorAll<HTMLElement>(".verse-sidenote:not([data-secondary])"),
		);
		content
			.querySelectorAll<HTMLElement>(".verse-sidenote[data-secondary]")
			.forEach((el) => el.remove());
		if (!asides.length) return;

		const railRect = sidenoteRail.getBoundingClientRect();
		const entries = asides.map((aside) => {
			const noteId = aside.dataset.noteId!;
			const [book, chapterStr, verseStr] = noteId.split(":");
			const verseEl = content.querySelector(
				`.verse[data-book="${CSS.escape(book)}"][data-chapter="${chapterStr}"][data-verse="${verseStr}"]`,
			) as HTMLElement | null;
			const top = verseEl ? verseEl.getBoundingClientRect().top - railRect.top : 0;
			return { aside, top };
		});

		entries.sort((a, b) => a.top - b.top);
		let minTop = 0;
		for (const { aside, top } of entries) {
			const actualTop = Math.max(top, minTop);
			aside.style.top = `${actualTop}px`;
			sidenoteRail.appendChild(aside);
			minTop = actualTop + aside.offsetHeight + 8;
		}
	}

	// Debounced resize handler for sidenote repositioning
	let syncSidenotesTimer: ReturnType<typeof setTimeout>;
	window.addEventListener("resize", () => {
		clearTimeout(syncSidenotesTimer);
		syncSidenotesTimer = setTimeout(syncSidenotes, 150);
	});

	// Note marker clicks: toggle sidenote on mobile, do nothing on desktop.
	content.addEventListener("click", (e) => {
		const marker = (e.target as HTMLElement).closest(
			".verse-note-marker",
		) as HTMLElement | null;
		if (!marker) return;
		e.stopImmediatePropagation();
		if (window.innerWidth >= 768) return;
		const noteId = marker.dataset.noteId;
		if (!noteId) return;
		const col = marker.closest(".parallel-col") as HTMLElement | null;
		const scope = col ?? content;
		const aside = scope.querySelector(
			`.verse-sidenote[data-note-id="${CSS.escape(noteId)}"]`,
		) as HTMLElement | null;
		if (aside) aside.classList.toggle("note-open");
	});

	// Sidenote num click: open note editor
	function handleSidenoteNumClick(e: MouseEvent) {
		const num = (e.target as HTMLElement).closest(".verse-sidenote-num") as HTMLElement | null;
		if (!num) return;
		e.stopImmediatePropagation();
		const aside = num.closest(".verse-sidenote") as HTMLElement | null;
		const noteId = aside?.dataset.noteId;
		if (!noteId) return;
		const [book, chapterStr, verseStr] = noteId.split(":");
		openNoteDialog(book, Number(chapterStr), Number(verseStr));
	}
	content.addEventListener("click", handleSidenoteNumClick);
	sidenoteRail.addEventListener("click", handleSidenoteNumClick);

	// Sidenote hover: highlight referenced verse
	function setVerseHighlight(noteId: string, on: boolean) {
		const [book, chapterStr, verseStr] = noteId.split(":");
		const targets = content.querySelectorAll(
			`.verse[data-book="${CSS.escape(book)}"][data-chapter="${chapterStr}"][data-verse="${verseStr}"]`,
		);
		targets.forEach((el) => (el as HTMLElement).classList.toggle("note-hover", on));
	}
	function handleSidenoteMouseEnter(e: MouseEvent) {
		const related = e.relatedTarget as HTMLElement | null;
		const aside = (e.target as HTMLElement).closest(".verse-sidenote") as HTMLElement | null;
		if (!aside) return;
		if (related && aside.contains(related)) return;
		setVerseHighlight(aside.dataset.noteId!, true);
	}
	function handleSidenoteMouseLeave(e: MouseEvent) {
		const related = e.relatedTarget as HTMLElement | null;
		const aside = (e.target as HTMLElement).closest(".verse-sidenote") as HTMLElement | null;
		if (!aside) return;
		if (related && aside.contains(related)) return;
		setVerseHighlight(aside.dataset.noteId!, false);
	}
	sidenoteRail.addEventListener("mouseover", handleSidenoteMouseEnter);
	sidenoteRail.addEventListener("mouseout", handleSidenoteMouseLeave);
	content.addEventListener("mouseover", handleSidenoteMouseEnter);
	content.addEventListener("mouseout", handleSidenoteMouseLeave);

	return { openNoteDialog, closeNoteDialog, syncSidenotes, updateSidenoteDom };
}
