/**
 * Recently viewed movies.
 *
 * Every movie whose details screen is opened is recorded here, newest
 * first, capped at HISTORY_LIMIT entries. Same store pattern as the
 * watchlist: module level snapshot, useSyncExternalStore, written through
 * to AsyncStorage.
 */

import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY = "@moviear/history";
const STORAGE_VERSION = 1;

export const HISTORY_LIMIT = 50;

interface PersistedShape {
  version: number;
  entries: HistoryEntry[];
}

export interface HistorySnapshot {
  hydrated: boolean;
  /** Newest first. Immutable: replaced on every change. */
  entries: readonly HistoryEntry[];
}

let snapshot: HistorySnapshot = { hydrated: false, entries: [] };
const listeners = new Set<() => void>();
let hydration: Promise<void> | null = null;
let writeQueue: Promise<void> = Promise.resolve();

function emit(next: HistorySnapshot) {
  snapshot = next;
  listeners.forEach((listener) => listener());
}

function isEntry(value: unknown): value is HistoryEntry {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return typeof v.id === "number" && typeof v.title === "string";
}

function parsePersisted(raw: string | null): HistoryEntry[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as Partial<PersistedShape> | null;
    if (!parsed || !Array.isArray(parsed.entries)) return [];
    return parsed.entries.filter(isEntry).map((e) => ({
      id: e.id,
      title: e.title,
      poster_path: e.poster_path ?? null,
      vote_average: typeof e.vote_average === "number" ? e.vote_average : 0,
      release_date: typeof e.release_date === "string" ? e.release_date : "",
      viewed_at: typeof e.viewed_at === "number" ? e.viewed_at : 0,
    }));
  } catch {
    return [];
  }
}

/** Newest first, one entry per movie, no more than the limit. */
function normalise(entries: readonly HistoryEntry[]): HistoryEntry[] {
  const sorted = [...entries].sort((a, b) => b.viewed_at - a.viewed_at);
  const seen = new Set<number>();
  const out: HistoryEntry[] = [];
  for (const entry of sorted) {
    if (seen.has(entry.id)) continue;
    seen.add(entry.id);
    out.push(entry);
    if (out.length === HISTORY_LIMIT) break;
  }
  return out;
}

function persist(entries: readonly HistoryEntry[]) {
  const payload: PersistedShape = { version: STORAGE_VERSION, entries: [...entries] };
  writeQueue = writeQueue
    .then(() => AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(payload)))
    .catch((err) => {
      console.warn("[history] failed to persist history", err);
    });
  return writeQueue;
}

export function waitForPendingWrites(): Promise<void> {
  return writeQueue;
}

export function hydrateHistory(): Promise<void> {
  if (hydration) return hydration;

  hydration = (async () => {
    let persisted: HistoryEntry[] = [];
    try {
      persisted = parsePersisted(await AsyncStorage.getItem(STORAGE_KEY));
    } catch (err) {
      console.warn("[history] failed to read history", err);
    }

    // Views recorded before the read finished are newer than anything on disk.
    const entries = normalise([...persisted, ...snapshot.entries]);
    emit({ hydrated: true, entries });

    if (snapshot.entries.length !== persisted.length) {
      await persist(entries);
    }
  })();

  return hydration;
}

// ---- useSyncExternalStore contract -------------------------------------

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  void hydrateHistory();
  return () => {
    listeners.delete(listener);
  };
}

export function getSnapshot(): HistorySnapshot {
  return snapshot;
}

// ---- queries / mutations -----------------------------------------------

export function getHistory(): readonly HistoryEntry[] {
  return snapshot.entries;
}

/** Record a view. Viewing a movie again moves it to the top. */
export function recordView(movie: MovieCardMovie, viewedAt: number = Date.now()): void {
  const entry: HistoryEntry = {
    id: movie.id,
    title: movie.title,
    poster_path: movie.poster_path ?? null,
    vote_average: movie.vote_average ?? 0,
    release_date: movie.release_date ?? "",
    viewed_at: viewedAt,
  };
  const entries = normalise([entry, ...snapshot.entries.filter((e) => e.id !== movie.id)]);
  emit({ ...snapshot, entries });
  void persist(entries);
}

export function removeFromHistory(id: number): void {
  if (!snapshot.entries.some((e) => e.id === id)) return;
  const entries = snapshot.entries.filter((e) => e.id !== id);
  emit({ ...snapshot, entries });
  void persist(entries);
}

export function clearHistory(): void {
  emit({ ...snapshot, entries: [] });
  void persist([]);
}

/**
 * Replace or merge the list (restore from a backup). Entries are cleaned
 * the same way as a disk read; the newest view of a movie wins.
 */
export function importHistory(incoming: readonly HistoryEntry[], mode: "merge" | "replace") {
  const clean = parsePersisted(JSON.stringify({ version: STORAGE_VERSION, entries: incoming }));
  const entries = normalise(mode === "merge" ? [...snapshot.entries, ...clean] : clean);
  emit({ ...snapshot, entries });
  void persist(entries);
  return entries.length;
}
