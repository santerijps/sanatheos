import type { BibleData, AppState, HighlightColor, Bookmark } from "./types.ts";
import {
	getHighlightMap,
	addBookmark,
	removeBookmark,
	hasBookmark,
	getNoteMap,
	exportUserData,
	importUserData,
} from "./db.ts";
import {
	initSearch,
	search,
	tryParseNav,
	tryParseNavGroups,
	parseNavTerms,
	parseQueryBooks,
	setSearchInterlinearData,
} from "./search.ts";
import type { NavRef } from "./search.ts";
import { readState, pushState, replaceState, stateToInputText } from "./state.ts";
import {
	renderChapter,
	renderChapterRange,
	renderBook,
	renderVerse,
	renderVerseSegments,
	renderMultiNav,
	renderResults,
	navRefLabel,
	setHighlightMap,
	setDescriptions,
	setSecondaryDescriptions,
	setStyleguide,
	setSubheadings,
	setSecondarySubheadings,
	renderParallelChapter,
	renderParallelBook,
	renderParallelVerse,
	renderParallelVerseSegments,
	renderParallelMultiNav,
	renderMixedMultiNav,
	renderParallelMixedMultiNav,
	setTranslationCode,
	setInterlinearEnabled,
	getInterlinearEnabled,
	getInterlinearBooks,
	getStrongsDict,
	renderStrongsPanel,
	setNoteMap,
} from "./render.ts";
import { setTranslation, displayName, displayNameFor } from "./bookNames.ts";
import { setLanguage, getLanguage, t } from "./i18n.ts";
import {
	TRANSLATION_NAMES,
	TRANSLATION_LANG,
	fetchTranslation,
	fetchTranslations,
	fetchDescriptions,
	fetchInterlinear,
	fetchStrongs,
} from "./services/api.ts";
import { initNotes } from "./features/notes.ts";
import type { NotesModule } from "./features/notes.ts";
import { initHighlights } from "./features/highlights.ts";
import { initIndexPanel } from "./features/index-panel.ts";
import type { IndexPanelModule } from "./features/index-panel.ts";
import { initSidebar } from "./features/sidebar.ts";
import type { SidebarModule } from "./features/sidebar.ts";

const GITHUB_SVG_BLACK = `
<svg width="32" height="32" viewBox="0 0 128 128" fill="none" xmlns="http://www.w3.org/2000/svg" style="margin-bottom: -10px;">
	<path d="M56.7937 84.9688C44.4187 83.4688 35.7 74.5625 35.7 63.0313C35.7 58.3438 37.3875 53.2813 40.2 49.9063C38.9812 46.8125 39.1687 40.25 40.575 37.5313C44.325 37.0625 49.3875 39.0313 52.3875 41.75C55.95 40.625 59.7 40.0625 64.2937 40.0625C68.8875 40.0625 72.6375 40.625 76.0125 41.6563C78.9187 39.0313 84.075 37.0625 87.825 37.5313C89.1375 40.0625 89.325 46.625 88.1062 49.8125C91.1062 53.375 92.7 58.1563 92.7 63.0313C92.7 74.5625 83.9812 83.2813 71.4187 84.875C74.6062 86.9375 76.7625 91.4375 76.7625 96.5938L76.7625 106.344C76.7625 109.156 79.1062 110.75 81.9187 109.625C98.8875 103.156 112.2 86.1875 112.2 65.1875C112.2 38.6563 90.6375 17 64.1062 17C37.575 17 16.2 38.6562 16.2 65.1875C16.2 86 29.4187 103.25 47.2312 109.719C49.7625 110.656 52.2 108.969 52.2 106.438L52.2 98.9375C50.8875 99.5 49.2 99.875 47.7 99.875C41.5125 99.875 37.8562 96.5 35.2312 90.2188C34.2 87.6875 33.075 86.1875 30.9187 85.9063C29.7937 85.8125 29.4187 85.3438 29.4187 84.7813C29.4187 83.6563 31.2937 82.8125 33.1687 82.8125C35.8875 82.8125 38.2312 84.5 40.6687 87.9688C42.5437 90.6875 44.5125 91.9063 46.8562 91.9063C49.2 91.9063 50.7 91.0625 52.8562 88.9063C54.45 87.3125 55.6687 85.9063 56.7937 84.9688Z" fill="black"/>
</svg>`;

const GITHUB_SVG_WHITE = `
<svg width="32" height="32" viewBox="0 0 128 128" fill="none" xmlns="http://www.w3.org/2000/svg" style="margin-bottom: -10px;">
	<path d="M56.7937 84.9688C44.4187 83.4688 35.7 74.5625 35.7 63.0313C35.7 58.3438 37.3875 53.2813 40.2 49.9063C38.9812 46.8125 39.1687 40.25 40.575 37.5313C44.325 37.0625 49.3875 39.0313 52.3875 41.75C55.95 40.625 59.7 40.0625 64.2937 40.0625C68.8875 40.0625 72.6375 40.625 76.0125 41.6563C78.9187 39.0313 84.075 37.0625 87.825 37.5313C89.1375 40.0625 89.325 46.625 88.1062 49.8125C91.1062 53.375 92.7 58.1563 92.7 63.0313C92.7 74.5625 83.9812 83.2813 71.4187 84.875C74.6062 86.9375 76.7625 91.4375 76.7625 96.5938L76.7625 106.344C76.7625 109.156 79.1062 110.75 81.9187 109.625C98.8875 103.156 112.2 86.1875 112.2 65.1875C112.2 38.6563 90.6375 17 64.1062 17C37.575 17 16.2 38.6562 16.2 65.1875C16.2 86 29.4187 103.25 47.2312 109.719C49.7625 110.656 52.2 108.969 52.2 106.438L52.2 98.9375C50.8875 99.5 49.2 99.875 47.7 99.875C41.5125 99.875 37.8562 96.5 35.2312 90.2188C34.2 87.6875 33.075 86.1875 30.9187 85.9063C29.7937 85.8125 29.4187 85.3438 29.4187 84.7813C29.4187 83.6563 31.2937 82.8125 33.1687 82.8125C35.8875 82.8125 38.2312 84.5 40.6687 87.9688C42.5437 90.6875 44.5125 91.9063 46.8562 91.9063C49.2 91.9063 50.7 91.0625 52.8562 88.9063C54.45 87.3125 55.6687 85.9063 56.7937 84.9688Z" fill="white"/>
</svg>`;

const BUY_ME_A_COFFEE_BUTTON = `
<div id="buy-me-a-coffee" style="text-align: center; margin-top: 16px;">
	<style>.bmc-btn svg {
		height: 32px !important;
		margin-bottom: 0px !important;
		box-shadow: none !important;
		border: none !important;
		vertical-align: middle !important;
		transform: scale(0.9);
		flex-shrink: 0;
	}

	.bmc-btn {
		min-width: 210px;
		color: #000000 !important;
		background-color: #FFDD00 !important;
		height: 60px;
		border-radius: 12px;
		font-size: 24px;
		font-weight: Bold;
		border: none;
		padding: 0px 24px;
		line-height: 27px;
		text-decoration: none !important;
		display: inline-flex !important;
		align-items: center;
		font-family: 'Bree Serif', cursive !important;
		-webkit-box-sizing: border-box !important;
		box-sizing: border-box !important;
	}

	.bmc-btn:hover, .bmc-btn:active, .bmc-btn:focus {
		text-decoration: none !important;
		cursor: pointer;
	}

	.bmc-btn-text {
	text-align: left;
	margin-left: 8px;
	display: inline-block;
	line-height: 0;
	width: 100%;
	flex-shrink: 0;
	font-family: [FONT] !important;
	white-space: nowrap;
	}

	.logo-outline {
		fill: #000000;
	}

	.logo-coffee {
		fill: #ffffff;
	}</style><link href="https://fonts.googleapis.com/css?family=Bree+Serif&amp;display=swap" rel="stylesheet"><div class="bmc-btn-container"><a class="bmc-btn" target="_blank" href="https://buymeacoffee.com/santerijps"><svg viewBox="0 0 884 1279" fill="none" xmlns="http://www.w3.org/2000/svg">
	<path d="M791.109 297.518L790.231 297.002L788.201 296.383C789.018 297.072 790.04 297.472 791.109 297.518Z" fill="#0D0C22"></path>
	<path d="M803.896 388.891L802.916 389.166L803.896 388.891Z" fill="#0D0C22"></path>
	<path d="M791.484 297.377C791.359 297.361 791.237 297.332 791.118 297.29C791.111 297.371 791.111 297.453 791.118 297.534C791.252 297.516 791.379 297.462 791.484 297.377Z" fill="#0D0C22"></path>
	<path d="M791.113 297.529H791.244V297.447L791.113 297.529Z" fill="#0D0C22"></path>
	<path d="M803.111 388.726L804.591 387.883L805.142 387.573L805.641 387.04C804.702 387.444 803.846 388.016 803.111 388.726Z" fill="#0D0C22"></path>
	<path d="M793.669 299.515L792.223 298.138L791.243 297.605C791.77 298.535 792.641 299.221 793.669 299.515Z" fill="#0D0C22"></path>
	<path d="M430.019 1186.18C428.864 1186.68 427.852 1187.46 427.076 1188.45L427.988 1187.87C428.608 1187.3 429.485 1186.63 430.019 1186.18Z" fill="#0D0C22"></path>
	<path d="M641.187 1144.63C641.187 1143.33 640.551 1143.57 640.705 1148.21C640.705 1147.84 640.86 1147.46 640.929 1147.1C641.015 1146.27 641.084 1145.46 641.187 1144.63Z" fill="#0D0C22"></path>
	<path d="M619.284 1186.18C618.129 1186.68 617.118 1187.46 616.342 1188.45L617.254 1187.87C617.873 1187.3 618.751 1186.63 619.284 1186.18Z" fill="#0D0C22"></path>
	<path d="M281.304 1196.06C280.427 1195.3 279.354 1194.8 278.207 1194.61C279.136 1195.06 280.065 1195.51 280.684 1195.85L281.304 1196.06Z" fill="#0D0C22"></path>
	<path d="M247.841 1164.01C247.704 1162.66 247.288 1161.35 246.619 1160.16C247.093 1161.39 247.489 1162.66 247.806 1163.94L247.841 1164.01Z" fill="#0D0C22"></path>
	<path class="logo-coffee" d="M472.623 590.836C426.682 610.503 374.546 632.802 306.976 632.802C278.71 632.746 250.58 628.868 223.353 621.274L270.086 1101.08C271.74 1121.13 280.876 1139.83 295.679 1153.46C310.482 1167.09 329.87 1174.65 349.992 1174.65C349.992 1174.65 416.254 1178.09 438.365 1178.09C462.161 1178.09 533.516 1174.65 533.516 1174.65C553.636 1174.65 573.019 1167.08 587.819 1153.45C602.619 1139.82 611.752 1121.13 613.406 1101.08L663.459 570.876C641.091 563.237 618.516 558.161 593.068 558.161C549.054 558.144 513.591 573.303 472.623 590.836Z" fill="#FFDD00"></path>
	<path d="M78.6885 386.132L79.4799 386.872L79.9962 387.182C79.5987 386.787 79.1603 386.435 78.6885 386.132Z" fill="#0D0C22"></path>
	<path class="logo-outline" d="M879.567 341.849L872.53 306.352C866.215 274.503 851.882 244.409 819.19 232.898C808.711 229.215 796.821 227.633 788.786 220.01C780.751 212.388 778.376 200.55 776.518 189.572C773.076 169.423 769.842 149.257 766.314 129.143C763.269 111.85 760.86 92.4243 752.928 76.56C742.604 55.2584 721.182 42.8009 699.88 34.559C688.965 30.4844 677.826 27.0375 666.517 24.2352C613.297 10.1947 557.342 5.03277 502.591 2.09047C436.875 -1.53577 370.983 -0.443234 305.422 5.35968C256.625 9.79894 205.229 15.1674 158.858 32.0469C141.91 38.224 124.445 45.6399 111.558 58.7341C95.7448 74.8221 90.5829 99.7026 102.128 119.765C110.336 134.012 124.239 144.078 138.985 150.737C158.192 159.317 178.251 165.846 198.829 170.215C256.126 182.879 315.471 187.851 374.007 189.968C438.887 192.586 503.87 190.464 568.44 183.618C584.408 181.863 600.347 179.758 616.257 177.304C634.995 174.43 647.022 149.928 641.499 132.859C634.891 112.453 617.134 104.538 597.055 107.618C594.095 108.082 591.153 108.512 588.193 108.942L586.06 109.252C579.257 110.113 572.455 110.915 565.653 111.661C551.601 113.175 537.515 114.414 523.394 115.378C491.768 117.58 460.057 118.595 428.363 118.647C397.219 118.647 366.058 117.769 334.983 115.722C320.805 114.793 306.661 113.611 292.552 112.177C286.134 111.506 279.733 110.801 273.333 110.009L267.241 109.235L265.917 109.046L259.602 108.134C246.697 106.189 233.792 103.953 221.025 101.251C219.737 100.965 218.584 100.249 217.758 99.2193C216.932 98.1901 216.482 96.9099 216.482 95.5903C216.482 94.2706 216.932 92.9904 217.758 91.9612C218.584 90.9319 219.737 90.2152 221.025 89.9293H221.266C232.33 87.5721 243.479 85.5589 254.663 83.8038C258.392 83.2188 262.131 82.6453 265.882 82.0832H265.985C272.988 81.6186 280.026 80.3625 286.994 79.5366C347.624 73.2301 408.614 71.0801 469.538 73.1014C499.115 73.9618 528.676 75.6996 558.116 78.6935C564.448 79.3474 570.746 80.0357 577.043 80.8099C579.452 81.1025 581.878 81.4465 584.305 81.7391L589.191 82.4445C603.438 84.5667 617.61 87.1419 631.708 90.1703C652.597 94.7128 679.422 96.1925 688.713 119.077C691.673 126.338 693.015 134.408 694.649 142.03L696.732 151.752C696.786 151.926 696.826 152.105 696.852 152.285C701.773 175.227 706.7 198.169 711.632 221.111C711.994 222.806 712.002 224.557 711.657 226.255C711.312 227.954 710.621 229.562 709.626 230.982C708.632 232.401 707.355 233.6 705.877 234.504C704.398 235.408 702.75 235.997 701.033 236.236H700.895L697.884 236.649L694.908 237.044C685.478 238.272 676.038 239.419 666.586 240.486C647.968 242.608 629.322 244.443 610.648 245.992C573.539 249.077 536.356 251.102 499.098 252.066C480.114 252.57 461.135 252.806 442.162 252.771C366.643 252.712 291.189 248.322 216.173 239.625C208.051 238.662 199.93 237.629 191.808 236.58C198.106 237.389 187.231 235.96 185.029 235.651C179.867 234.928 174.705 234.177 169.543 233.397C152.216 230.798 134.993 227.598 117.7 224.793C96.7944 221.352 76.8005 223.073 57.8906 233.397C42.3685 241.891 29.8055 254.916 21.8776 270.735C13.7217 287.597 11.2956 305.956 7.64786 324.075C4.00009 342.193 -1.67805 361.688 0.472751 380.288C5.10128 420.431 33.165 453.054 73.5313 460.35C111.506 467.232 149.687 472.807 187.971 477.556C338.361 495.975 490.294 498.178 641.155 484.129C653.44 482.982 665.708 481.732 677.959 480.378C681.786 479.958 685.658 480.398 689.292 481.668C692.926 482.938 696.23 485.005 698.962 487.717C701.694 490.429 703.784 493.718 705.08 497.342C706.377 500.967 706.846 504.836 706.453 508.665L702.633 545.797C694.936 620.828 687.239 695.854 679.542 770.874C671.513 849.657 663.431 928.434 655.298 1007.2C653.004 1029.39 650.71 1051.57 648.416 1073.74C646.213 1095.58 645.904 1118.1 641.757 1139.68C635.218 1173.61 612.248 1194.45 578.73 1202.07C548.022 1209.06 516.652 1212.73 485.161 1213.01C450.249 1213.2 415.355 1211.65 380.443 1211.84C343.173 1212.05 297.525 1208.61 268.756 1180.87C243.479 1156.51 239.986 1118.36 236.545 1085.37C231.957 1041.7 227.409 998.039 222.9 954.381L197.607 711.615L181.244 554.538C180.968 551.94 180.693 549.376 180.435 546.76C178.473 528.023 165.207 509.681 144.301 510.627C126.407 511.418 106.069 526.629 108.168 546.76L120.298 663.214L145.385 904.104C152.532 972.528 159.661 1040.96 166.773 1109.41C168.15 1122.52 169.44 1135.67 170.885 1148.78C178.749 1220.43 233.465 1259.04 301.224 1269.91C340.799 1276.28 381.337 1277.59 421.497 1278.24C472.979 1279.07 524.977 1281.05 575.615 1271.72C650.653 1257.95 706.952 1207.85 714.987 1130.13C717.282 1107.69 719.576 1085.25 721.87 1062.8C729.498 988.559 737.115 914.313 744.72 840.061L769.601 597.451L781.009 486.263C781.577 480.749 783.905 475.565 787.649 471.478C791.392 467.391 796.352 464.617 801.794 463.567C823.25 459.386 843.761 452.245 859.023 435.916C883.318 409.918 888.153 376.021 879.567 341.849ZM72.4301 365.835C72.757 365.68 72.1548 368.484 71.8967 369.792C71.8451 367.813 71.9483 366.058 72.4301 365.835ZM74.5121 381.94C74.6842 381.819 75.2003 382.508 75.7337 383.334C74.925 382.576 74.4089 382.009 74.4949 381.94H74.5121ZM76.5597 384.641C77.2996 385.897 77.6953 386.689 76.5597 384.641V384.641ZM80.672 387.979H80.7752C80.7752 388.1 80.9645 388.22 81.0333 388.341C80.9192 388.208 80.7925 388.087 80.6548 387.979H80.672ZM800.796 382.989C793.088 390.319 781.473 393.726 769.996 395.43C641.292 414.529 510.713 424.199 380.597 419.932C287.476 416.749 195.336 406.407 103.144 393.382C94.1102 392.109 84.3197 390.457 78.1082 383.798C66.4078 371.237 72.1548 345.944 75.2003 330.768C77.9878 316.865 83.3218 298.334 99.8572 296.355C125.667 293.327 155.64 304.218 181.175 308.09C211.917 312.781 242.774 316.538 273.745 319.36C405.925 331.405 540.325 329.529 671.92 311.91C695.906 308.686 719.805 304.941 743.619 300.674C764.835 296.871 788.356 289.731 801.175 311.703C809.967 326.673 811.137 346.701 809.778 363.615C809.359 370.984 806.139 377.915 800.779 382.989H800.796Z" fill="#0D0C22"></path>
	</svg>
	<span class="bmc-btn-text">Buy me a coffee</span></a></div>
</div>`;

let data: BibleData;
let currentTranslation = "NHEB";
const DEFAULT_TRANSLATION = "NHEB";
let translationRequestId = 0;
let parallelTranslation = "";
let syncSidenotes = () => {}; // set by init()
let parallelData: BibleData | null = null;
let highlightMap = new Map<string, HighlightColor>();

function withTranslationParams(s: AppState): AppState {
	return {
		...s,
		translation: currentTranslation,
		parallel: parallelTranslation || undefined,
		interlinear: getInterlinearEnabled() || undefined,
	};
}

// --- Toast notifications ---
let toastTimer: number;
function showToast(msg: string) {
	const el = document.getElementById("toast");
	if (!el) return;
	el.style.removeProperty("visibility");
	el.textContent = msg;
	el.classList.add("show");
	clearTimeout(toastTimer);
	toastTimer = window.setTimeout(() => el.classList.remove("show"), 2000);
}

function showQrOverlay(url: string) {
	const overlay = document.getElementById("qr-overlay");
	const canvas = document.getElementById("qr-canvas") as HTMLCanvasElement | null;
	const titleEl = document.getElementById("qr-modal-title");
	if (!overlay || !canvas) return;
	if (titleEl) titleEl.textContent = t().qrCode;
	import("./qr.ts").then(({ drawQR }) => {
		drawQR(url, canvas, { moduleSize: 6, quiet: 4 }).then(() => {
			overlay.removeAttribute("hidden");
			overlay.classList.add("open");
		});
	});
}

function closeQrOverlay() {
	const overlay = document.getElementById("qr-overlay");
	if (!overlay) return;
	overlay.classList.remove("open");
	overlay.setAttribute("hidden", "");
}

// --- Theme management ---
function applyTheme(theme: string) {
	if (theme === "system") {
		const dark = window.matchMedia("(prefers-color-scheme: dark)").matches;
		document.documentElement.setAttribute("data-theme", dark ? "dark" : "light");
	} else {
		document.documentElement.setAttribute("data-theme", theme);
	}
	updateStaticText();
}

// --- Segmented control helper ---
function activateSegmented(container: HTMLElement | null, value: string) {
	if (!container) return;
	for (const btn of container.querySelectorAll<HTMLElement>(".seg-btn")) {
		const active = btn.dataset.value === value;
		btn.classList.toggle("seg-active", active);
		btn.setAttribute("aria-checked", String(active));
	}
}

// --- Interlinear helpers ---
function isKJV(): boolean {
	return currentTranslation === "KJV";
}

/** Load interlinear data for a book (lazy), then reload Strong's dict if needed. */
async function ensureInterlinear(book: string): Promise<void> {
	if (!isKJV()) return;
	try {
		await Promise.all([fetchInterlinear(book), fetchStrongs()]);
		setSearchInterlinearData(getInterlinearBooks());
	} catch {
		/* data unavailable — interlinear won't render */
	}
}

async function init() {
	const content = document.getElementById("content")!;
	const searchInput = document.getElementById("search-input") as HTMLInputElement;
	const overlay = document.getElementById("index-overlay")!;
	const verseMenu = document.getElementById("verse-menu")!;
	// For keyboard shortcut handler — checking panel states
	const sideOverlay = document.getElementById("side-overlay")!;
	const noteDialogOverlay = document.getElementById("note-panel-overlay")!;

	// Determine initial translation from URL or localStorage
	const initialState = readState();
	currentTranslation =
		initialState.translation ||
		localStorage.getItem("bible-translation") ||
		DEFAULT_TRANSLATION;
	setTranslation(currentTranslation);
	setTranslationCode(currentTranslation);

	// Determine initial language: sync with translation
	const savedLang =
		TRANSLATION_LANG[currentTranslation] || localStorage.getItem("bible-language") || "en";
	setLanguage(savedLang);
	document.documentElement.lang = savedLang;
	localStorage.setItem("bible-language", savedLang);

	const languageSegmented = document.getElementById("language-segmented");
	activateSegmented(languageSegmented, savedLang);

	// Apply theme
	const savedTheme = localStorage.getItem("bible-theme") || "system";
	applyTheme(savedTheme);
	const themeSegmented = document.getElementById("theme-segmented");
	activateSegmented(themeSegmented, savedTheme);

	// Apply font size
	const savedFontSize = localStorage.getItem("bible-font-size") || "medium";
	document.documentElement.setAttribute("data-font-size", savedFontSize);
	const fontSizeSegmented = document.getElementById("fontsize-segmented");
	activateSegmented(fontSizeSegmented, savedFontSize);

	// Apply font family
	const savedFont = localStorage.getItem("bible-font") || "default";
	if (savedFont !== "default") document.documentElement.setAttribute("data-font", savedFont);
	const fontSegmented = document.getElementById("font-segmented");
	activateSegmented(fontSegmented, savedFont);

	window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
		const theme = localStorage.getItem("bible-theme") || "system";
		if (theme === "system") applyTheme("system");
	});

	// Load highlights
	const hlMap = await getHighlightMap();
	highlightMap = hlMap;
	setHighlightMap(hlMap);

	// Load verse notes
	const noteMapData = await getNoteMap();
	setNoteMap(noteMapData);

	// Load Bible data: try IndexedDB first, then fetch from API
	content.innerHTML = `<p class="loading">${t().loadingBible}</p>`;

	try {
		data = await fetchTranslation(currentTranslation);
	} catch {
		content.innerHTML = `<p class="empty">${t().loadFailed}</p>`;
		return;
	}

	// Load descriptions, styleguide, and subheadings in parallel
	const shLang = TRANSLATION_LANG[currentTranslation] || "en";
	const [desc, sgData, shData] = await Promise.all([
		fetchDescriptions(currentTranslation),
		fetch("./data/styleguide.json")
			.then((r) => (r.ok ? r.json() : null))
			.catch(() => null),
		fetch(`./data/subheadings-${shLang}.json`)
			.then((r) => (r.ok ? r.json() : null))
			.catch(() => null),
	]);
	setDescriptions(desc);
	if (sgData) setStyleguide(sgData);
	if (shData) setSubheadings(shData);

	localStorage.setItem("bible-translation", currentTranslation);
	initSearch(data);

	// Populate translation selector
	const translationSelect = document.getElementById(
		"translation-select",
	) as HTMLSelectElement | null;
	const headerTranslationSelect = document.getElementById(
		"header-translation-select",
	) as HTMLSelectElement | null;

	const translations = await fetchTranslations();

	if (translationSelect) {
		translationSelect.innerHTML = translations
			.map((t) => {
				const info = TRANSLATION_NAMES[t];
				const label = info ? `${t} — ${info.name} (${info.language})` : t;
				return `<option value="${t}"${t === currentTranslation ? " selected" : ""}>${label}</option>`;
			})
			.join("");
	}

	if (headerTranslationSelect) {
		headerTranslationSelect.innerHTML = translations
			.map(
				(t) =>
					`<option value="${t}"${t === currentTranslation ? " selected" : ""}>${t}</option>`,
			)
			.join("");
	}

	async function applyTranslationChange(code: string, failedSelect: HTMLSelectElement | null) {
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
			setTranslationCode(code);
			localStorage.setItem("bible-translation", code);
			initSearch(data);

			// Sync both selects to the new value
			if (translationSelect) translationSelect.value = code;
			if (headerTranslationSelect) headerTranslationSelect.value = code;

			// Reload descriptions for the new translation
			const newDesc = await fetchDescriptions(code);
			setDescriptions(newDesc);

			// Reload subheadings for the new translation's language
			const newShLang = TRANSLATION_LANG[code] || "en";
			try {
				const shRes = await fetch(`./data/subheadings-${newShLang}.json`);
				if (shRes.ok) setSubheadings(await shRes.json());
			} catch {}

			// Auto-switch UI language to match translation
			const newLang = TRANSLATION_LANG[code];
			if (newLang && newLang !== getLanguage()) {
				setLanguage(newLang);
				document.documentElement.lang = newLang;
				localStorage.setItem("bible-language", newLang);
				activateSegmented(languageSegmented, newLang);
				updateStaticText();
			}

			indexPanel.invalidateIndex();
			if (overlay.classList.contains("open")) indexPanel.openIndex();

			// Turn off interlinear mode when switching away from KJV
			if (getInterlinearEnabled()) {
				setInterlinearEnabled(false);
				localStorage.setItem("bible-interlinear", "0");
				updateIlToggle();
			}

			// Translate query book names to new translation
			if (parsedBooks) {
				state.query = parsedBooks
					.map((p) => {
						if (!p.book) return p.original;
						const name = displayName(p.book);
						let result = p.rest ? `${name} ${p.rest}` : name;
						if (p.quoted) result += ` ${p.quoted}`;
						return result;
					})
					.join("; ");
			}

			searchInput.value = stateToInputText(state);
			applyState(state);
			replaceState(withTranslationParams(stateForUrl(state)));
			updateFooter();
		} catch {
			content.innerHTML = `<p class="empty">${t().loadTranslationFailed(code)}</p>`;
			if (failedSelect) failedSelect.value = currentTranslation;
		}
	}

	if (translationSelect) {
		translationSelect.addEventListener("change", () =>
			applyTranslationChange(translationSelect.value, translationSelect),
		);
	}
	if (headerTranslationSelect) {
		headerTranslationSelect.addEventListener("change", () =>
			applyTranslationChange(headerTranslationSelect.value, headerTranslationSelect),
		);
	}

	// Language segmented control
	if (languageSegmented) {
		languageSegmented.addEventListener("click", (e) => {
			const btn = (e.target as HTMLElement).closest(".seg-btn") as HTMLElement | null;
			if (!btn || btn.classList.contains("seg-active")) return;
			const lang = btn.dataset.value!;
			activateSegmented(languageSegmented, lang);
			setLanguage(lang);
			document.documentElement.lang = lang;
			localStorage.setItem("bible-language", lang);
			updateStaticText();
			indexPanel.invalidateIndex();
			if (overlay.classList.contains("open")) indexPanel.openIndex();
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
		const savedParallel = initialState.parallel || localStorage.getItem("bible-parallel") || "";
		parallelSelect.innerHTML =
			`<option value="">${t().parallelNone}</option>` +
			translations
				.map((tr) => {
					const info = TRANSLATION_NAMES[tr];
					const label = info ? `${tr} — ${info.name}` : tr;
					return `<option value="${tr}"${tr === savedParallel ? " selected" : ""}>${label}</option>`;
				})
				.join("");

		if (savedParallel) {
			try {
				parallelTranslation = savedParallel;
				parallelData = await fetchTranslation(savedParallel);
				localStorage.setItem("bible-parallel", savedParallel);
				setSecondaryDescriptions(await fetchDescriptions(savedParallel));
				const secShLang = TRANSLATION_LANG[savedParallel] || "en";
				try {
					const shRes = await fetch(`./data/subheadings-${secShLang}.json`);
					if (shRes.ok) setSecondarySubheadings(await shRes.json());
				} catch {}
			} catch {
				parallelTranslation = "";
				parallelData = null;
				parallelSelect.value = "";
			}
		}

		parallelSelect.addEventListener("change", async () => {
			const code = parallelSelect.value;
			if (!code) {
				parallelTranslation = "";
				parallelData = null;
				setSecondaryDescriptions([]);
				setSecondarySubheadings({});
				localStorage.removeItem("bible-parallel");
			} else {
				try {
					parallelData = await fetchTranslation(code);
					parallelTranslation = code;
					localStorage.setItem("bible-parallel", code);
					setSecondaryDescriptions(await fetchDescriptions(code));
					const secShLang = TRANSLATION_LANG[code] || "en";
					try {
						const shRes = await fetch(`./data/subheadings-${secShLang}.json`);
						if (shRes.ok) setSecondarySubheadings(await shRes.json());
					} catch {}
				} catch {
					parallelTranslation = "";
					parallelData = null;
					parallelSelect.value = "";
				}
			}
			const state = readState();
			applyState(state);
			replaceState(withTranslationParams(stateForUrl(state)));
		});
	}

	// Theme segmented control
	if (themeSegmented) {
		themeSegmented.addEventListener("click", (e) => {
			const btn = (e.target as HTMLElement).closest(".seg-btn") as HTMLElement | null;
			if (!btn || btn.classList.contains("seg-active")) return;
			const theme = btn.dataset.value!;
			activateSegmented(themeSegmented, theme);
			applyTheme(theme);
			localStorage.setItem("bible-theme", theme);
		});
	}

	// Font size segmented control
	if (fontSizeSegmented) {
		fontSizeSegmented.addEventListener("click", (e) => {
			const btn = (e.target as HTMLElement).closest(".seg-btn") as HTMLElement | null;
			if (!btn || btn.classList.contains("seg-active")) return;
			const size = btn.dataset.value!;
			activateSegmented(fontSizeSegmented, size);
			document.documentElement.setAttribute("data-font-size", size);
			localStorage.setItem("bible-font-size", size);
		});
	}

	// Font family segmented control
	if (fontSegmented) {
		fontSegmented.addEventListener("click", (e) => {
			const btn = (e.target as HTMLElement).closest(".seg-btn") as HTMLElement | null;
			if (!btn || btn.classList.contains("seg-active")) return;
			const font = btn.dataset.value!;
			activateSegmented(fontSegmented, font);
			if (font === "default") {
				document.documentElement.removeAttribute("data-font");
			} else {
				document.documentElement.setAttribute("data-font", font);
			}
			localStorage.setItem("bible-font", font);
		});
	}

	// Export / import data
	const exportBtn = document.getElementById("export-data-btn");
	const importBtn = document.getElementById("import-data-btn");
	const importInput = document.getElementById("import-data-input") as HTMLInputElement | null;

	if (exportBtn) {
		exportBtn.addEventListener("click", async () => {
			const payload = await exportUserData();
			const json = JSON.stringify(payload, null, 2);
			const blob = new Blob([json], { type: "application/json" });
			const url = URL.createObjectURL(blob);
			const a = document.createElement("a");
			a.href = url;
			a.download = `sanatheos-export-${new Date().toISOString().slice(0, 10)}.json`;
			document.body.appendChild(a);
			a.click();
			document.body.removeChild(a);
			URL.revokeObjectURL(url);
			showToast(t().exportSuccess);
		});
	}

	if (importBtn && importInput) {
		importBtn.addEventListener("click", () => importInput.click());
		importInput.addEventListener("change", async () => {
			const file = importInput.files?.[0];
			if (!file) return;
			importInput.value = "";
			try {
				const text = await file.text();
				const parsed = JSON.parse(text);
				await importUserData(parsed);
				// Reload highlight map and note map into memory
				const newHlMap = await getHighlightMap();
				highlightMap = newHlMap;
				setHighlightMap(newHlMap);
				const newNoteMap = await getNoteMap();
				setNoteMap(newNoteMap);
				// Re-render current view so highlights/notes appear
				applyState(readState());
				showToast(t().importSuccess);
			} catch {
				showToast(t().importError);
			}
		});
	}

	updateStaticText();

	// --- Feature module initialization ---
	const notes: NotesModule = initNotes({ getData: () => data, showToast });
	syncSidenotes = notes.syncSidenotes;

	const highlights = initHighlights({
		getData: () => data,
		getParallelData: () => parallelData,
		getCurrentTranslation: () => currentTranslation,
		getParallelTranslation: () => parallelTranslation,
		getHighlightMap: () => highlightMap,
		updateHighlightEntry: (key, color) => {
			if (color) highlightMap.set(key, color);
			else highlightMap.delete(key);
		},
		showToast,
		openNoteDialog: notes.openNoteDialog,
		syncBookmarkBtn,
	});

	const indexPanel: IndexPanelModule = initIndexPanel({
		getData: () => data,
		navigate,
	});

	const sidebar: SidebarModule = initSidebar({
		showToast,
		syncBookmarkBtn,
		setSearchInput: (val) => {
			searchInput.value = val;
			searchInput.dispatchEvent(new Event("input"));
		},
		openNoteDialog: notes.openNoteDialog,
		updateSidenoteDom: notes.updateSidenoteDom,
		triggerSyncSidenotes: () => requestAnimationFrame(syncSidenotes),
	});

	// --- Interlinear toggle ---
	const strongsPanel = document.getElementById("strongs-panel")!;
	strongsPanel.style.removeProperty("visibility");
	// Remove inline visibility:hidden from side overlay (set in HTML to prevent FOUC)
	sideOverlay.style.removeProperty("visibility");
	// Remove inline visibility:hidden from note panel overlay (set in HTML to prevent FOUC)
	noteDialogOverlay.style.removeProperty("visibility");
	// Remove preload class to re-enable CSS transitions after initial paint
	document.body.classList.remove("preload");

	// Reposition sidenotes on window resize (debounced)
	let syncSidenotesTimer: ReturnType<typeof setTimeout>;
	window.addEventListener("resize", () => {
		clearTimeout(syncSidenotesTimer);
		syncSidenotesTimer = setTimeout(syncSidenotes, 150);
	});

	const savedIl =
		initialState.interlinear || (isKJV() && localStorage.getItem("bible-interlinear") === "1");
	if (savedIl && isKJV()) {
		setInterlinearEnabled(true);
	}

	function updateIlToggle() {
		const btn = document.querySelector(".il-toggle-btn") as HTMLElement | null;
		if (!btn) return;
		if (getInterlinearEnabled()) btn.classList.add("active");
		else btn.classList.remove("active");
	}

	function closeStrongsPanel() {
		strongsPanel.classList.remove("open");
		strongsPanel.innerHTML = "";
		currentStrongsId = "";
	}

	let currentStrongsId = "";

	async function openStrongsPanel(strongsId: string) {
		// Toggle closed if clicking the same word again
		if (
			strongsPanel.classList.contains("open") &&
			currentStrongsId === strongsId.toLowerCase()
		) {
			closeStrongsPanel();
			return;
		}
		// Ensure Strong's dictionary is loaded
		let dict = getStrongsDict();
		if (!dict || Object.keys(dict).length === 0) {
			try {
				dict = await fetchStrongs();
			} catch {
				return;
			}
		}
		const entry = dict[strongsId.toLowerCase()];
		if (!entry) return;
		currentStrongsId = strongsId.toLowerCase();
		strongsPanel.innerHTML = renderStrongsPanel(entry, strongsId);
		strongsPanel.classList.add("open");

		// Close button handler
		const closeBtn = strongsPanel.querySelector(".strongs-close");
		if (closeBtn) closeBtn.addEventListener("click", closeStrongsPanel);
	}

	// Render initial state from URL
	const state = readState();
	searchInput.value = stateToInputText(state);
	applyState(state);
	replaceState(withTranslationParams(stateForUrl(state)));
	updateFooter();

	// Reveal footer now that content has been rendered
	document.getElementById("footer")?.classList.add("visible");

	// Preload side panel data in the background after the main page has rendered
	if ("requestIdleCallback" in window) {
		window.requestIdleCallback(() => sidebar.preloadData(), { timeout: 3000 });
	} else {
		setTimeout(() => sidebar.preloadData(), 0);
	}

	// --- Search with debounce ---
	let timer: number;
	searchInput.addEventListener("input", () => {
		clearTimeout(timer);
		timer = window.setTimeout(() => {
			const q = searchInput.value.trim();
			if (!q) {
				const s: AppState = {};
				applyState(s);
				replaceState(withTranslationParams(s));
				return;
			}
			applyState({ query: q });
			replaceState(withTranslationParams(stateForUrl({ query: q })));
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

	// Close panels with Escape, Ctrl+K to focus search, Ctrl+I to toggle index
	document.addEventListener("keydown", (e) => {
		if (e.key === "Escape") {
			if (document.getElementById("qr-overlay")?.classList.contains("open")) {
				closeQrOverlay();
				return;
			}
			if (noteDialogOverlay.classList.contains("open")) {
				notes.closeNoteDialog();
				return;
			}
			if (document.querySelectorAll(".share-wrap.share-open").length > 0) {
				document
					.querySelectorAll<HTMLElement>(".share-wrap.share-open")
					.forEach((w) => w.classList.remove("share-open"));
				return;
			}
			if (strongsPanel.classList.contains("open")) {
				closeStrongsPanel();
				return;
			}
			if (verseMenu.classList.contains("open")) {
				highlights.closeVerseMenu();
				return;
			}
			if (sideOverlay.classList.contains("open")) {
				sidebar.closeSidePanel();
				return;
			}
			if (overlay.classList.contains("open")) {
				indexPanel.closeIndex();
				return;
			}
		}
		if ((e.ctrlKey || e.metaKey) && e.key === "k") {
			e.preventDefault();
			if (overlay.classList.contains("open")) indexPanel.closeIndex();
			searchInput.focus();
			searchInput.select();
		}
		if ((e.ctrlKey || e.metaKey) && e.key === "i") {
			e.preventDefault();
			indexPanel.toggleIndex();
		}
		if ((e.ctrlKey || e.metaKey) && e.key === "b") {
			e.preventDefault();
			if (sideOverlay.classList.contains("open")) {
				sidebar.closeSidePanel();
			} else {
				sidebar.openSidePanel();
			}
		}
	});

	// --- Click handlers for rendered content ---
	document.addEventListener("click", (e) => {
		// Click outside any open share dropdown → close it
		if (!(e.target as HTMLElement).closest(".share-wrap")) {
			document
				.querySelectorAll<HTMLElement>(".share-wrap.share-open")
				.forEach((w) => w.classList.remove("share-open"));
		}
	});
	content.addEventListener("click", async (e) => {
		// Click on nav arrow → navigate to prev/next chapter/verse
		const arrow = (e.target as HTMLElement).closest(".nav-arrow") as HTMLElement;
		if (arrow && !arrow.classList.contains("nav-disabled")) {
			const b = arrow.dataset.book!;
			const c = arrow.dataset.chapter;
			const v = arrow.dataset.verse;
			if (v !== undefined) {
				navigate({ book: b, chapter: +c!, verse: +v });
			} else if (c !== undefined) {
				navigate({ book: b, chapter: +c });
			} else {
				navigate({ book: b });
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

		// Click on Strong's number → open definition panel
		const strongsEl = (e.target as HTMLElement).closest(".il-strongs") as HTMLElement;
		if (strongsEl) {
			const word = strongsEl.closest(".il-word") as HTMLElement;
			if (word?.dataset.strongs) {
				openStrongsPanel(word.dataset.strongs);
			}
			return;
		}

		// Click on interlinear word → open definition panel
		const ilWord = (e.target as HTMLElement).closest(".il-word") as HTMLElement;
		if (ilWord?.dataset.strongs) {
			openStrongsPanel(ilWord.dataset.strongs);
			return;
		}

		// Click on interlinear toggle button
		const ilToggle = (e.target as HTMLElement).closest(".il-toggle-btn") as HTMLElement;
		if (ilToggle) {
			const enabled = !getInterlinearEnabled();
			setInterlinearEnabled(enabled);
			localStorage.setItem("bible-interlinear", enabled ? "1" : "0");
			updateIlToggle();
			const state = readState();
			applyState(state);
			replaceState(withTranslationParams(stateForUrl(state)));
			return;
		}

		// Click on share button → toggle dropdown
		const shareBtn = (e.target as HTMLElement).closest(".share-btn") as HTMLElement;
		if (shareBtn) {
			e.preventDefault();
			e.stopPropagation();
			const wrap = shareBtn.closest(".share-wrap") as HTMLElement;
			if (wrap) {
				const isOpen = wrap.classList.contains("share-open");
				document
					.querySelectorAll<HTMLElement>(".share-wrap.share-open")
					.forEach((w) => w.classList.remove("share-open"));
				if (!isOpen) wrap.classList.add("share-open");
			}
			return;
		}

		// Click on share option → copy link to clipboard
		const shareOpt = (e.target as HTMLElement).closest(".share-opt") as HTMLElement;
		if (shareOpt) {
			e.preventDefault();
			const url = new URL(window.location.href);
			if (shareOpt.dataset.share === "without") {
				url.searchParams.delete("t");
			}
			shareOpt.closest(".share-wrap")?.classList.remove("share-open");
			if (shareOpt.dataset.share === "qr") {
				showQrOverlay(url.toString());
			} else {
				navigator.clipboard.writeText(url.toString()).then(() => showToast(t().linkCopied));
			}
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
			const source = copyBtn.dataset.copySource || "";
			const chapterEnd =
				copyBtn.dataset.copyChapterEnd !== undefined
					? +copyBtn.dataset.copyChapterEnd
					: undefined;
			const verseStart =
				copyBtn.dataset.copyVerseStart !== undefined
					? +copyBtn.dataset.copyVerseStart
					: undefined;
			const verseEnd =
				copyBtn.dataset.copyVerseEnd !== undefined
					? +copyBtn.dataset.copyVerseEnd
					: undefined;
			const translationLabel = (code: string) => {
				const info = TRANSLATION_NAMES[code];
				return info ? `${code} — ${info.name}` : code;
			};

			const includePrimary = source !== "secondary";
			const includeSecondary =
				source !== "primary" && !!parallelData && !!parallelTranslation;

			function buildVerseNums(): number[] {
				if (segments) {
					const nums: number[] = [];
					for (const p of segments.split(",")) {
						const range = p.split("-").map(Number);
						if (range.length === 2)
							for (let v = range[0]; v <= range[1]; v++) nums.push(v);
						else nums.push(range[0]);
					}
					return nums;
				}
				return [];
			}

			function formatSection(sourceData: BibleData, code: string): string {
				const titleBook = displayNameFor(code, book);
				if (verse) {
					const v = sourceData[book]?.[String(chapter)]?.[verse];
					if (!v) return "";
					return `${translationLabel(code)}\n${titleBook} ${chapter}:${verse}\n${verse} ${v}`;
				} else if (segments) {
					const ch = sourceData[book]?.[String(chapter)];
					if (!ch) return "";
					const nums = buildVerseNums();
					return (
						`${translationLabel(code)}\n${titleBook} ${chapter}:${segments}\n` +
						nums
							.filter((n) => ch[String(n)])
							.map((n) => `${n} ${ch[String(n)]}`)
							.join("\n")
					);
				} else if (
					chapterEnd !== undefined &&
					verseStart !== undefined &&
					verseEnd !== undefined
				) {
					// Cross-chapter verse range: Genesis 18:16-19:29
					const lines: string[] = [
						translationLabel(code),
						`${titleBook} ${chapter}:${verseStart}\u2013${chapterEnd}:${verseEnd}`,
					];
					for (let c = chapter; c <= chapterEnd; c++) {
						const ch = sourceData[book]?.[String(c)];
						if (!ch) continue;
						const vMin = c === chapter ? verseStart : 1;
						const vMax =
							c === chapterEnd ? verseEnd : Math.max(...Object.keys(ch).map(Number));
						Object.keys(ch)
							.map(Number)
							.sort((a, b) => a - b)
							.filter((n) => n >= vMin && n <= vMax)
							.forEach((n) => lines.push(`${c}:${n} ${ch[String(n)]}`));
					}
					return lines.join("\n");
				} else if (chapterEnd !== undefined) {
					// Plain chapter range: Genesis 1-2
					const lines: string[] = [
						translationLabel(code),
						`${titleBook} ${chapter}\u2013${chapterEnd}`,
					];
					for (let c = chapter; c <= chapterEnd; c++) {
						const ch = sourceData[book]?.[String(c)];
						if (!ch) continue;
						Object.keys(ch)
							.map(Number)
							.sort((a, b) => a - b)
							.forEach((n) => lines.push(`${c}:${n} ${ch[String(n)]}`));
					}
					return lines.join("\n");
				} else {
					const ch = sourceData[book]?.[String(chapter)];
					if (!ch) return "";
					const nums = Object.keys(ch)
						.map(Number)
						.sort((a, b) => a - b);
					return (
						`${translationLabel(code)}\n${titleBook} ${chapter}\n` +
						nums.map((n) => `${n} ${ch[String(n)]}`).join("\n")
					);
				}
			}

			const parts: string[] = [];
			if (includePrimary) {
				const s = formatSection(data, currentTranslation);
				if (s) parts.push(s);
			}
			if (includeSecondary) {
				const s = formatSection(parallelData!, parallelTranslation);
				if (s) parts.push(s);
			}
			const text = parts.join("\n\n");
			if (text) {
				navigator.clipboard.writeText(text).then(() => {
					showToast(t().copied);
					copyBtn.classList.add("copy-success");
					window.setTimeout(() => copyBtn.classList.remove("copy-success"), 1500);
				});
			}
			return;
		}

		// Click on bookmark button → toggle bookmark for current view
		const bookmarkBtn = (e.target as HTMLElement).closest(
			".bookmark-btn",
		) as HTMLElement | null;
		if (bookmarkBtn) {
			e.preventDefault();
			const ref = bookmarkBtn.dataset.bookmarkRef;
			const id = ref ? `q:${ref}` : currentBookmarkId();
			if (!id) return;
			const alreadyBookmarked = await hasBookmark(id);
			if (alreadyBookmarked) {
				await removeBookmark(id);
				showToast(t().bookmarkRemoved);
			} else {
				const s = readState();
				const bm: Bookmark = {
					id,
					book: ref ? undefined : s.book,
					chapter: ref ? undefined : s.chapter,
					verse: ref ? undefined : s.verse,
					query: ref ?? s.query,
					addedAt: Date.now(),
				};
				await addBookmark(bm);
				showToast(t().bookmarkAdded);
			}
			await syncBookmarkBtn();
			return;
		}
	});

	// --- Swipe navigation ---
	let touchStartX = 0;
	let touchStartY = 0;
	let touchStartTime = 0;

	content.addEventListener(
		"touchstart",
		(e) => {
			touchStartX = e.touches[0].clientX;
			touchStartY = e.touches[0].clientY;
			touchStartTime = Date.now();
		},
		{ passive: true },
	);

	content.addEventListener(
		"touchend",
		(e) => {
			const dx = e.changedTouches[0].clientX - touchStartX;
			const dy = e.changedTouches[0].clientY - touchStartY;
			const dt = Date.now() - touchStartTime;
			// Only count horizontal swipes that are fast and far enough
			if (dt > 500 || Math.abs(dx) < 80 || Math.abs(dy) > Math.abs(dx) * 0.5) return;

			const arrow =
				dx > 0
					? (content.querySelector(
							".nav-arrow.nav-prev:not(.nav-disabled)",
						) as HTMLElement)
					: (content.querySelector(
							".nav-arrow.nav-next:not(.nav-disabled)",
						) as HTMLElement);
			if (arrow) arrow.click();
		},
		{ passive: true },
	);

	// --- Browser back/forward ---
	window.addEventListener("popstate", async () => {
		const s = readState();
		if (s.translation && s.translation !== currentTranslation) {
			try {
				data = await fetchTranslation(s.translation);
				currentTranslation = s.translation;
				setTranslation(s.translation);
				setTranslationCode(s.translation);
				localStorage.setItem("bible-translation", s.translation);
				initSearch(data);

				// Auto-switch UI language to match translation
				const newLang = TRANSLATION_LANG[s.translation];
				if (newLang && newLang !== getLanguage()) {
					setLanguage(newLang);
					localStorage.setItem("bible-language", newLang);
					activateSegmented(languageSegmented, newLang);
					updateStaticText();
				}

				indexPanel.invalidateIndex();
				if (overlay.classList.contains("open")) indexPanel.openIndex();
				if (translationSelect) translationSelect.value = s.translation;
				updateFooter();
			} catch {
				/* keep current translation */
			}
		}

		// Restore parallel translation from URL
		const urlParallel = s.parallel || "";
		if (urlParallel !== parallelTranslation) {
			if (!urlParallel) {
				parallelTranslation = "";
				parallelData = null;
				setSecondaryDescriptions([]);
				setSecondarySubheadings({});
			} else {
				try {
					parallelData = await fetchTranslation(urlParallel);
					parallelTranslation = urlParallel;
					setSecondaryDescriptions(await fetchDescriptions(urlParallel));
					const secShLang = TRANSLATION_LANG[urlParallel] || "en";
					try {
						const shRes = await fetch(`./data/subheadings-${secShLang}.json`);
						if (shRes.ok) setSecondarySubheadings(await shRes.json());
					} catch {}
				} catch {
					parallelTranslation = "";
					parallelData = null;
					setSecondaryDescriptions([]);
					setSecondarySubheadings({});
				}
			}
			localStorage.setItem("bible-parallel", parallelTranslation);
			if (parallelSelect) parallelSelect.value = parallelTranslation;
		}

		searchInput.value = stateToInputText(s);
		applyState(s);
	});
}

function navigate(s: AppState) {
	const searchInput = document.getElementById("search-input") as HTMLInputElement;
	searchInput.value = stateToInputText(s);
	const indexOverlay = document.getElementById("index-overlay")!;
	if (window.innerWidth <= 768 && indexOverlay.classList.contains("open")) {
		indexOverlay.classList.add("closing");
		const panel = document.getElementById("index-panel")!;
		panel.addEventListener(
			"animationend",
			() => {
				indexOverlay.classList.remove("open", "closing");
				document.body.classList.remove("panel-open");
				document.body.style.paddingRight = "";
			},
			{ once: true },
		);
	} else {
		indexOverlay.classList.remove("open");
		document.body.classList.remove("panel-open");
		document.body.style.paddingRight = "";
	}
	applyState(s);
	pushState(withTranslationParams(s));
}

function renderNavRef(nav: NavRef) {
	const { book, chapterStart, chapterEnd, verseSegments } = nav;
	const useParallel = !!parallelData && !!parallelTranslation;

	if (chapterStart !== undefined && chapterEnd !== undefined) {
		if (verseSegments) {
			// Single verse: Genesis 1:2
			if (verseSegments.length === 1 && verseSegments[0].start === verseSegments[0].end) {
				if (useParallel) {
					renderParallelVerse(
						data,
						parallelData!,
						book,
						chapterStart,
						verseSegments[0].start,
						currentTranslation,
						parallelTranslation,
					);
				} else {
					renderVerse(data, book, chapterStart, verseSegments[0].start);
				}
			} else {
				// Verse segments: Genesis 8:1-3 or Genesis 8:1-3,6
				if (useParallel) {
					renderParallelVerseSegments(
						data,
						parallelData!,
						book,
						chapterStart,
						verseSegments,
						currentTranslation,
						parallelTranslation,
					);
				} else {
					renderVerseSegments(data, book, chapterStart, verseSegments);
				}
			}
		} else if (chapterStart === chapterEnd) {
			// Single chapter: Genesis 8
			if (useParallel) {
				renderParallelChapter(
					data,
					parallelData!,
					book,
					chapterStart,
					currentTranslation,
					parallelTranslation,
				);
			} else {
				renderChapter(data, book, chapterStart);
			}
		} else {
			// Chapter range (with optional verse bounds): Genesis 8-10 or Genesis 18:16-19:29
			renderChapterRange(data, book, chapterStart, chapterEnd, nav.verseStart, nav.verseEnd);
		}
	} else {
		// Whole book: Genesis → show chapter 1
		if (useParallel) {
			renderParallelChapter(
				data,
				parallelData!,
				book,
				1,
				currentTranslation,
				parallelTranslation,
			);
		} else {
			renderChapter(data, book, 1);
		}
	}
}

function updateTitle(s: AppState) {
	let label: string;
	if (s.query) {
		const navRefs = tryParseNav(s.query);
		if (navRefs && navRefs.every((r) => !!data[r.book])) {
			label = navRefs.map((r) => navRefLabel(r)).join("; ");
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
	document.title = `${label} | SANATHEOS`;
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
	if (
		nav.chapterStart === nav.chapterEnd &&
		nav.verseSegments &&
		nav.verseSegments.length === 1 &&
		nav.verseSegments[0].start === nav.verseSegments[0].end
	) {
		return { book: nav.book, chapter: nav.chapterStart, verse: nav.verseSegments[0].start };
	}
	return { query: q };
}

function stateForUrl(s: AppState): AppState {
	if (s.query) return queryToUrlState(s.query);
	return s;
}

function currentBookmarkId(): string {
	const s = readState();
	if (s.book && s.chapter && s.verse) return `${s.book}:${s.chapter}:${s.verse}`;
	if (s.book && s.chapter) return `${s.book}:${s.chapter}`;
	if (s.book) return s.book;
	if (s.query) return `q:${s.query}`;
	return "";
}

async function syncBookmarkBtn() {
	const btns = document.querySelectorAll<HTMLElement>("#content .bookmark-btn");
	for (const btn of btns) {
		const ref = btn.dataset.bookmarkRef;
		const id = ref ? `q:${ref}` : currentBookmarkId();
		if (!id) {
			btn.classList.remove("bookmark-active");
			btn.title = t().bookmarkThis;
			btn.setAttribute("aria-label", t().bookmarkThis);
			continue;
		}
		const active = await hasBookmark(id);
		btn.classList.toggle("bookmark-active", active);
		btn.title = active ? t().removeBookmark : t().bookmarkThis;
		btn.setAttribute("aria-label", active ? t().removeBookmark : t().bookmarkThis);
	}
}

async function applyState(s: AppState) {
	const useParallel = !!parallelData && !!parallelTranslation;

	// Determine which book(s) will be rendered and preload interlinear data
	if (getInterlinearEnabled() && isKJV()) {
		let books: string[] = [];
		if (s.query) {
			const navGroups = tryParseNavGroups(s.query);
			if (navGroups && navGroups.flat().every((r) => !!data[r.book])) {
				books = navGroups.flat().map((r) => r.book);
			} else if (!s.query.includes('"')) {
				const termResults = parseNavTerms(s.query);
				books = termResults
					.flatMap((tr) => (tr.refs ? tr.refs.map((r) => r.book) : []))
					.filter((b) => !!data[b]);
			}
		} else if (s.book) {
			books = [s.book];
		} else {
			books = ["Genesis"];
		}
		await Promise.all(books.map((b) => ensureInterlinear(b)));
	}

	if (s.query) {
		// Check if the query is pure reference(s) → navigate instead of search
		const navGroups = tryParseNavGroups(s.query);
		if (navGroups && navGroups.flat().every((r) => !!data[r.book])) {
			const allRefs = navGroups.flat();
			if (navGroups.length === 1 && allRefs.length === 1) {
				renderNavRef(allRefs[0]);
			} else {
				if (useParallel) {
					renderParallelMultiNav(
						data,
						parallelData!,
						navGroups,
						currentTranslation,
						parallelTranslation,
					);
				} else {
					renderMultiNav(data, navGroups);
				}
			}
		} else if (!s.query.includes('"')) {
			// No quoted text filters — try per-term ref parsing for mixed valid/invalid refs
			const termResults = parseNavTerms(s.query);
			const hasAnyValidRef = termResults.some(
				(tr) => tr.refs !== null && tr.refs.every((r) => !!data[r.book]),
			);
			if (hasAnyValidRef) {
				// Mark terms whose book is missing in data as invalid
				const mixed = termResults.map((tr) =>
					tr.refs !== null && tr.refs.every((r) => !!data[r.book])
						? tr
						: { refs: null as null, term: tr.term },
				);
				if (useParallel) {
					renderParallelMixedMultiNav(
						data,
						parallelData!,
						mixed,
						currentTranslation,
						parallelTranslation,
					);
				} else {
					renderMixedMultiNav(data, mixed);
				}
			} else {
				const results = search(data, s.query);
				renderResults(results, s.query);
			}
		} else {
			const results = search(data, s.query);
			renderResults(results, s.query);
		}
	} else if (s.book && s.chapter && s.verse) {
		if (useParallel) {
			renderParallelVerse(
				data,
				parallelData!,
				s.book,
				s.chapter,
				s.verse,
				currentTranslation,
				parallelTranslation,
			);
		} else {
			renderVerse(data, s.book, s.chapter, s.verse);
		}
	} else if (s.book && s.chapter) {
		if (useParallel) {
			renderParallelChapter(
				data,
				parallelData!,
				s.book,
				s.chapter,
				currentTranslation,
				parallelTranslation,
			);
		} else {
			renderChapter(data, s.book, s.chapter);
		}
	} else if (s.book) {
		if (useParallel) {
			renderParallelBook(
				data,
				parallelData!,
				s.book,
				currentTranslation,
				parallelTranslation,
			);
		} else {
			renderBook(data, s.book);
		}
	} else {
		if (useParallel) {
			renderParallelChapter(
				data,
				parallelData!,
				"Genesis",
				1,
				currentTranslation,
				parallelTranslation,
			);
		} else {
			renderChapter(data, "Genesis", 1);
		}
	}
	updateTitle(s);
	updateFooter();
	syncBookmarkBtn();
	// Double-rAF ensures the browser has fully laid out the new content before measuring
	requestAnimationFrame(() => requestAnimationFrame(syncSidenotes));
}

function updateStaticText() {
	const s = t();
	// Header buttons
	const panelBtnEl = document.getElementById("panel-btn");
	if (panelBtnEl) panelBtnEl.title = s.settings;
	const searchInput = document.getElementById("search-input") as HTMLInputElement | null;
	if (searchInput) searchInput.placeholder = s.searchPlaceholder;
	const indexBtn = document.getElementById("index-btn");
	if (indexBtn) indexBtn.title = s.browseBooks;
	// Header translation select
	const headerTransSel = document.getElementById(
		"header-translation-select",
	) as HTMLSelectElement | null;
	if (headerTransSel) {
		headerTransSel.title = s.translationLabel;
		headerTransSel.setAttribute("aria-label", s.translationLabel);
	}
	// Side tab button titles
	const tabStories = document.querySelector<HTMLElement>('.side-tab-btn[data-tab="stories"]');
	if (tabStories) tabStories.title = s.storiesTitle;
	const tabParables = document.querySelector<HTMLElement>('.side-tab-btn[data-tab="parables"]');
	if (tabParables) tabParables.title = s.parablesTitle;
	const tabTheophanies = document.querySelector<HTMLElement>(
		'.side-tab-btn[data-tab="theophanies"]',
	);
	if (tabTheophanies) tabTheophanies.title = s.theophaniesTitle;
	const tabTypology = document.querySelector<HTMLElement>('.side-tab-btn[data-tab="typology"]');
	if (tabTypology) tabTypology.title = s.typologyTitle;
	const tabBookmarks = document.querySelector<HTMLElement>('.side-tab-btn[data-tab="bookmarks"]');
	if (tabBookmarks) tabBookmarks.title = s.bookmarksTitle;
	const tabNotes = document.querySelector<HTMLElement>('.side-tab-btn[data-tab="notes"]');
	if (tabNotes) tabNotes.title = s.notesTitle;
	const tabSettings = document.querySelector<HTMLElement>('.side-tab-btn[data-tab="settings"]');
	if (tabSettings) tabSettings.title = s.settings;
	const tabInfo = document.querySelector<HTMLElement>('.side-tab-btn[data-tab="info"]');
	if (tabInfo) tabInfo.title = s.helpInfo;
	// Index column labels (for mobile sticky headers)
	const idxBooksEl = document.getElementById("idx-books");
	if (idxBooksEl) idxBooksEl.dataset.label = s.idxBooksLabel;
	const idxChaptersEl = document.getElementById("idx-chapters");
	if (idxChaptersEl) idxChaptersEl.dataset.label = s.idxChaptersLabel;
	const idxVersesEl = document.getElementById("idx-verses");
	if (idxVersesEl) idxVersesEl.dataset.label = s.idxVersesLabel;
	// Settings pane
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
	const parallelSelectEl = document.getElementById("parallel-select") as HTMLSelectElement | null;
	if (parallelSelectEl && parallelSelectEl.options.length > 0) {
		parallelSelectEl.options[0].textContent = s.parallelNone;
	}
	const fontSizeLabel = document.getElementById("settings-fontsize-label");
	if (fontSizeLabel) fontSizeLabel.textContent = s.fontSizeLabel;
	const fontLabel = document.getElementById("settings-font-label");
	if (fontLabel) fontLabel.textContent = s.fontLabel;
	const fontSeg = document.getElementById("font-segmented");
	if (fontSeg) {
		const fontBtns = fontSeg.querySelectorAll<HTMLElement>(".seg-btn");
		const fontLabels = [s.fontDefault, s.fontDyslexic];
		fontBtns.forEach((btn, i) => {
			if (i < fontLabels.length) btn.textContent = fontLabels[i];
		});
	}
	const dataLabel = document.getElementById("settings-data-label");
	if (dataLabel) dataLabel.textContent = s.dataLabel;
	const exportBtn2 = document.getElementById("export-data-btn");
	if (exportBtn2) exportBtn2.textContent = s.exportData;
	const importBtn2 = document.getElementById("import-data-btn");
	if (importBtn2) importBtn2.textContent = s.importData;

	// Theme segmented button labels
	const themeSeg = document.getElementById("theme-segmented");
	if (themeSeg) {
		const labels = [s.themeSystem, s.themeLight, s.themeDark];
		const btns = themeSeg.querySelectorAll<HTMLElement>(".seg-btn");
		btns.forEach((btn, i) => {
			if (i < labels.length) btn.textContent = labels[i];
		});
	}

	// Font size segmented button labels
	const fsSeg = document.getElementById("fontsize-segmented");
	if (fsSeg) {
		const labels = [
			s.fontSizeSmall,
			s.fontSizeMedium,
			s.fontSizeLarge,
			s.fontSizeXL,
			s.fontSizeXXL,
		];
		const btns = fsSeg.querySelectorAll<HTMLElement>(".seg-btn");
		btns.forEach((btn, i) => {
			if (i < labels.length) btn.textContent = labels[i];
		});
	}

	// Info drawer
	const infoTitleEl = document.getElementById("info-title");
	if (infoTitleEl) infoTitleEl.textContent = s.infoTitle;
	const infoBody = document.getElementById("info-modal-body");
	if (infoBody) {
		infoBody.innerHTML = `
      <section><h3>${s.infoSearchTitle}</h3><p>${s.infoSearchIntro}</p><ul>${s.infoSearchItems.map((i) => `<li>${i}</li>`).join("")}</ul><p>${s.infoSearchNote}</p></section>
      <section><h3>${s.infoBrowseTitle}</h3><p>${s.infoBrowseText}</p></section>
      <section><h3>${s.infoShortcutsTitle}</h3><ul>${s.infoShortcuts.map((i) => `<li>${i}</li>`).join("")}</ul></section>
      <section><h3>${s.infoSettingsTitle}</h3><p>${s.infoSettingsText}</p></section>
      <section><h3>${s.infoFeaturesTitle}</h3><ul>${s.infoFeaturesItems.map((i) => `<li>${i}</li>`).join("")}</ul></section>
      <section><h3>${s.infoDataTitle}</h3><p>${s.infoDataText}</p></section>`;
	}

	// Footer
	const footer = document.getElementById("footer");
	if (footer) {
		footer.innerHTML = `<p>${s.footerLine1}</p><p>${s.footerDescriptions}</p><p>${s.footerStyleguide}</p><p>${s.footerDictionary}</p><p>${s.footerFavicon}</p>`;
		const githubLogo =
			document.querySelector("html")!.getAttribute("data-theme") === "dark"
				? GITHUB_SVG_WHITE
				: GITHUB_SVG_BLACK;
		footer.innerHTML += `<p>
			${s.footerGitHub} <a href="https://github.com/santerijps/sanatheos" target="_blank">${githubLogo}</a>
			${BUY_ME_A_COFFEE_BUTTON}
		</p>`;
	}

	// HTML lang attribute
	document.documentElement.lang = getLanguage();
}

function updateFooter() {
	const info = TRANSLATION_NAMES[currentTranslation];
	const name = info ? info.name : currentTranslation;
	for (const el of document.querySelectorAll<HTMLElement>(".nav-translation")) {
		el.textContent = currentTranslation;
		el.title = `${currentTranslation} \u2014 ${name}`;
	}
	for (const el of document.querySelectorAll<HTMLElement>(".parallel-translation-label")) {
		const code = el.textContent?.trim() || "";
		const ti = TRANSLATION_NAMES[code];
		if (ti) el.title = `${code} \u2014 ${ti.name}`;
	}
}

init();
