import type { BibleData, AppState } from "../types.ts";
import { renderIndex } from "../render.ts";
import { readState } from "../state.ts";
import { displayName } from "../bookNames.ts";
import { t } from "../i18n.ts";
import { lockScroll, unlockScroll } from "../utils.ts";

export interface IndexPanelDeps {
	getData: () => BibleData;
	navigate: (s: AppState) => void;
}

export interface IndexPanelModule {
	openIndex: () => void;
	closeIndex: () => void;
	toggleIndex: () => void;
	/** Call when translation or language changes so the index re-renders on next open. */
	invalidateIndex: () => void;
}

export function initIndexPanel(deps: IndexPanelDeps): IndexPanelModule {
	const overlay = document.getElementById("index-overlay")!;
	const indexBtn = document.getElementById("index-btn")!;

	let indexRendered = false;
	let indexScrollTo: ((book?: string, chapter?: number, verse?: number) => void) | null = null;

	let mobileStep: "books" | "chapters" | "verses" = "books";
	let mobileActiveBook = "";

	function isMobileIndex(): boolean {
		return window.innerWidth <= 768;
	}

	function setMobileStep(step: "books" | "chapters" | "verses", book = "", chapter = 0) {
		mobileStep = step;
		mobileActiveBook = book;
		const panel = document.getElementById("index-panel");
		if (panel) panel.dataset.step = step;
		const breadcrumb = document.getElementById("idx-breadcrumb");
		if (breadcrumb) {
			if (step === "books") breadcrumb.textContent = t().idxBrowseLabel;
			else if (step === "chapters") breadcrumb.textContent = displayName(book);
			else breadcrumb.textContent = `${displayName(book)} › ${t().chapter} ${chapter}`;
		}
		const backBtn = document.getElementById("idx-back-btn");
		if (backBtn) {
			if (step === "books") backBtn.setAttribute("aria-hidden", "true");
			else backBtn.removeAttribute("aria-hidden");
		}
	}

	document.getElementById("idx-back-btn")?.addEventListener("click", () => {
		if (mobileStep === "chapters") setMobileStep("books");
		else if (mobileStep === "verses") setMobileStep("chapters", mobileActiveBook);
	});

	function openIndex() {
		if (isMobileIndex()) {
			const cur = readState();
			if (cur.book && cur.chapter !== undefined) {
				setMobileStep("verses", cur.book, cur.chapter);
			} else if (cur.book) {
				setMobileStep("chapters", cur.book);
			} else {
				setMobileStep("books");
			}
		}
		overlay.classList.add("open");
		document.getElementById("index-panel")?.classList.remove("dragging-done");
		indexBtn.setAttribute("aria-expanded", "true");
		lockScroll();
		if (!indexRendered) {
			const idx = renderIndex(deps.getData(), {
				onBook(book) {
					if (isMobileIndex()) {
						setMobileStep("chapters", book);
					} else {
						deps.navigate({ book });
					}
				},
				onReadBook(book) {
					deps.navigate({ book });
				},
				onChapter(book, chapter) {
					if (isMobileIndex()) {
						setMobileStep("verses", book, chapter);
					} else {
						deps.navigate({ book, chapter });
					}
				},
				onReadChapter(book, chapter) {
					deps.navigate({ book, chapter });
				},
				onVerse(book, chapter, verse) {
					deps.navigate({ book, chapter, verse });
				},
			});
			indexScrollTo = idx.scrollTo;
			indexRendered = true;
		}
		const current = readState();
		const book = current.book || "Genesis";
		requestAnimationFrame(() => {
			if (indexScrollTo) indexScrollTo(book, current.chapter, current.verse);
			if (isMobileIndex()) return;
			let target: HTMLElement | null = null;
			if (current.verse !== undefined) {
				target =
					(document.querySelector("#idx-verses .idx-item:focus") as HTMLElement) ??
					(() => {
						const items = document.querySelectorAll("#idx-verses .idx-item");
						for (const el of items)
							if (el.textContent?.startsWith(`${current.verse}. `))
								return el as HTMLElement;
						return null;
					})() ??
					(document.querySelector("#idx-verses .idx-item") as HTMLElement);
			} else if (current.chapter !== undefined) {
				target =
					(document.querySelector(`#idx-chapters .idx-item.active`) as HTMLElement) ??
					(document.querySelector("#idx-chapters .idx-item") as HTMLElement);
			}
			if (!target) {
				target =
					(document.querySelector("#idx-books .idx-item.active") as HTMLElement) ??
					(document.querySelector("#idx-books .idx-item") as HTMLElement);
			}
			target?.focus();
		});
	}

	function closeIndex() {
		if (isMobileIndex() && overlay.classList.contains("open")) {
			overlay.classList.add("closing");
			const panel = document.getElementById("index-panel")!;
			panel.addEventListener(
				"animationend",
				() => {
					overlay.classList.remove("open", "closing");
					indexBtn.setAttribute("aria-expanded", "false");
					unlockScroll();
				},
				{ once: true },
			);
		} else {
			overlay.classList.remove("open");
			indexBtn.setAttribute("aria-expanded", "false");
			unlockScroll();
		}
	}

	// --- Mobile drag-to-close gesture ---
	(function attachIndexDragToClose() {
		const mobileHeader = document.getElementById("idx-mobile-header");
		const panel = document.getElementById("index-panel")!;
		if (!mobileHeader) return;

		let startY = 0;
		let lastY = 0;
		let lastTime = 0;
		let velocity = 0;
		let dragging = false;

		mobileHeader.addEventListener(
			"touchstart",
			(e: TouchEvent) => {
				if (!isMobileIndex() || !overlay.classList.contains("open")) return;
				const touch = e.touches[0];
				startY = touch.clientY;
				lastY = touch.clientY;
				lastTime = e.timeStamp;
				velocity = 0;
				dragging = false;
			},
			{ passive: true },
		);

		mobileHeader.addEventListener(
			"touchmove",
			(e: TouchEvent) => {
				if (!isMobileIndex() || !overlay.classList.contains("open")) return;
				const touch = e.touches[0];
				const dy = touch.clientY - startY;
				if (dy <= 0) {
					if (dragging) {
						panel.classList.add("dragging-done");
						panel.classList.remove("dragging");
						panel.style.transform = "";
						overlay.style.background = "";
						dragging = false;
					}
					return;
				}
				if (!dragging) {
					dragging = true;
					panel.classList.add("dragging");
				}
				const dt = e.timeStamp - lastTime;
				if (dt >= 8) {
					const rawV = (touch.clientY - lastY) / dt;
					velocity = velocity * 0.6 + rawV * 0.4;
				}
				lastY = touch.clientY;
				lastTime = e.timeStamp;
				panel.style.transform = `translateY(${dy}px)`;
				const panelH = panel.offsetHeight || window.innerHeight * 0.85;
				const progress = Math.min(dy / panelH, 1);
				const alpha = 0.4 * (1 - progress);
				overlay.style.background = `rgba(0,0,0,${alpha.toFixed(3)})`;
			},
			{ passive: true },
		);

		function finishDrag(endClientY: number) {
			if (!dragging) return;
			dragging = false;
			const dy = Math.max(0, endClientY - startY);
			const panelH = panel.offsetHeight || window.innerHeight * 0.85;
			const shouldClose = dy > panelH * 0.3 || velocity > 0.4;

			if (shouldClose) {
				panel.style.transition = "transform 0.25s ease-in";
				overlay.style.transition = "background 0.25s ease-in";
				panel.style.transform = "translateY(110%)";
				overlay.style.background = "rgba(0,0,0,0)";
				panel.addEventListener(
					"transitionend",
					() => {
						panel.style.transition = "";
						panel.style.transform = "";
						overlay.style.transition = "";
						overlay.style.background = "";
						overlay.classList.remove("open", "closing");
						panel.classList.remove("dragging");
						indexBtn.setAttribute("aria-expanded", "false");
						unlockScroll();
					},
					{ once: true },
				);
			} else {
				panel.style.transition = "transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)";
				panel.style.transform = "translateY(0)";
				overlay.style.background = "";
				panel.addEventListener(
					"transitionend",
					() => {
						panel.style.transition = "";
						panel.style.transform = "";
						panel.classList.add("dragging-done");
						panel.classList.remove("dragging");
					},
					{ once: true },
				);
			}
		}

		mobileHeader.addEventListener(
			"touchend",
			(e: TouchEvent) => {
				finishDrag(e.changedTouches[0]?.clientY ?? lastY);
			},
			{ passive: true },
		);

		mobileHeader.addEventListener(
			"touchcancel",
			() => {
				if (!dragging) return;
				dragging = false;
				panel.style.transition = "transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)";
				panel.style.transform = "translateY(0)";
				overlay.style.background = "";
				panel.addEventListener(
					"transitionend",
					() => {
						panel.style.transition = "";
						panel.style.transform = "";
						panel.classList.add("dragging-done");
						panel.classList.remove("dragging");
					},
					{ once: true },
				);
			},
			{ passive: true },
		);
	})();

	function toggleIndex() {
		if (overlay.classList.contains("open")) closeIndex();
		else openIndex();
	}

	indexBtn.addEventListener("click", toggleIndex);

	overlay.addEventListener("click", (e) => {
		if (e.target === overlay) closeIndex();
	});

	return {
		openIndex,
		closeIndex,
		toggleIndex,
		invalidateIndex() {
			indexRendered = false;
			indexScrollTo = null;
		},
	};
}
