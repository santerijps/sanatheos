/** Lock body scroll while a panel is open. Compensates for scrollbar width. */
export function lockScroll(): void {
	const scrollbarW = window.innerWidth - document.documentElement.clientWidth;
	document.body.style.paddingRight = scrollbarW + "px";
	document.body.classList.add("panel-open");
}

/** Restore body scroll after closing a panel. */
export function unlockScroll(): void {
	document.body.classList.remove("panel-open");
	document.body.style.paddingRight = "";
}

/** Escape special HTML characters to prevent XSS when inserting into innerHTML. */
export function escapeHtml(str: string): string {
	return str
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;");
}
