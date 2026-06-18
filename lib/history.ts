import type { CaseForm, GeneratedOutput } from "./types";

// Recent generated cases, persisted to the browser's localStorage only.
// No server, no real database.

export interface HistoryEntry {
  id: string;
  savedAt: number; // epoch ms
  form: CaseForm;
  output: GeneratedOutput;
}

const KEY = "srg.history.v1";
export const MAX_HISTORY = 8;

export function loadHistory(): HistoryEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.slice(0, MAX_HISTORY) : [];
  } catch {
    return [];
  }
}

export function saveHistory(entries: HistoryEntry[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      KEY,
      JSON.stringify(entries.slice(0, MAX_HISTORY)),
    );
  } catch {
    /* storage full or unavailable — history is best-effort */
  }
}

export function newId(): string {
  try {
    if (typeof crypto !== "undefined" && crypto.randomUUID) {
      return crypto.randomUUID();
    }
  } catch {
    /* fall through */
  }
  return `h-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
}

export function relativeTime(ts: number, now: number = Date.now()): string {
  const s = Math.max(0, Math.floor((now - ts) / 1000));
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}
