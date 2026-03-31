import type { AppState } from "./types.ts";

export function readState(): AppState {
  const p = new URLSearchParams(window.location.search);
  const s: AppState = {};
  if (p.has("q")) s.query = p.get("q")!;
  if (p.has("book")) s.book = p.get("book")!;
  if (p.has("chapter")) s.chapter = +p.get("chapter")!;
  if (p.has("verse")) s.verse = +p.get("verse")!;
  return s;
}

function toUrl(s: AppState): string {
  const p = new URLSearchParams();
  if (s.query) p.set("q", s.query);
  if (s.book) p.set("book", s.book);
  if (s.chapter) p.set("chapter", String(s.chapter));
  if (s.verse) p.set("verse", String(s.verse));
  const qs = p.toString();
  return qs ? `/?${qs}` : "/";
}

export function pushState(s: AppState) {
  history.pushState(s, "", toUrl(s));
}

export function replaceState(s: AppState) {
  history.replaceState(s, "", toUrl(s));
}

export function stateToInputText(s: AppState): string {
  if (s.query) return s.query;
  if (s.book && s.chapter && s.verse) return `${s.book} ${s.chapter}:${s.verse}`;
  if (s.book && s.chapter) return `${s.book} ${s.chapter}`;
  if (s.book) return s.book;
  return "";
}
