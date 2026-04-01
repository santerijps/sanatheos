import type { AppState } from "./types.ts";
import { displayName } from "./bookNames.ts";
import { bookFromCode, bookToCode } from "./bookCodes.ts";

export function readState(): AppState {
  const p = new URLSearchParams(window.location.search);
  const s: AppState = {};
  if (p.has("q")) s.query = p.get("q")!;
  if (p.has("book")) {
    const raw = p.get("book")!;
    s.book = bookFromCode(raw) ?? raw;
  }
  if (p.has("chapter")) { const n = +p.get("chapter")!; if (Number.isFinite(n)) s.chapter = n; }
  if (p.has("verse"))   { const n = +p.get("verse")!;   if (Number.isFinite(n)) s.verse = n; }
  if (p.has("t")) s.translation = p.get("t")!.toUpperCase();
  return s;
}

const basePath = typeof window !== "undefined"
  ? window.location.pathname.replace(/\/+$/, "") + "/"
  : "/";

export function toUrl(s: AppState): string {
  const p = new URLSearchParams();
  if (s.translation) p.set("t", s.translation);
  if (s.query) p.set("q", s.query);
  if (s.book) p.set("book", bookToCode(s.book) ?? s.book);
  if (s.chapter !== undefined) p.set("chapter", String(s.chapter));
  if (s.verse !== undefined) p.set("verse", String(s.verse));
  const qs = p.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}

export function pushState(s: AppState) {
  history.pushState(s, "", toUrl(s));
}

export function replaceState(s: AppState) {
  history.replaceState(s, "", toUrl(s));
}

export function stateToInputText(s: AppState): string {
  if (s.query) return s.query;
  if (s.book && s.chapter && s.verse) return `${displayName(s.book)} ${s.chapter}:${s.verse}`;
  if (s.book && s.chapter) return `${displayName(s.book)} ${s.chapter}`;
  if (s.book) return displayName(s.book);
  return "";
}
