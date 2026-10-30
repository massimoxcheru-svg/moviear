/**
 * Saved-movies (watchlist) store.
 *
 * A small module-level store read through `useSyncExternalStore` (see
 * hooks/useSavedMovies.ts). This avoids a Context provider, which would have
 * to be mounted in app/_layout.tsx. Every screen that subscribes re-renders
 * as soon as a movie is toggled.
 *
 * Persistence: mutations update memory first (instant UI) and are then
 * written through to AsyncStorage. Reads happen once, lazily, on first
 * subscribe; `hydrated` tells screens whether that load has finished.
 *
 * Storage versions: 1 held the card fields plus saved_at. 2 adds the user's
 * rating, a note and genre ids; a version 1 payload loads with defaults.
 */

import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY = "@moviear/saved-movies";
const STORAGE_VERSION = 2;

interface PersistedShape {
  version: number;
  movies: SavedMovie[];
}

export interface SavedMoviesSnapshot {
  /** True once the first read from AsyncStorage has completed (or failed). */
  hydrated: boolean;
  /** Newest-saved first. Immutable: replaced on every change. */
  movies: readonly SavedMovie[];
}

/** What a caller must supply to save a movie. */
export type SavedMovieInput = MovieCardMovie & { genre_ids?: readonly number[] };

export const MIN_RATING = 1;
export const MAX_RATING = 10;
export const MAX_NOTE_LENGTH = 500;

let snapshot: SavedMoviesSnapshot = { hydrated: false, movies: [] };
const listeners = new Set<() => void>();
let hydration: Promise<void> | null = null;
let writeQueue: Promise<void> = Promise.resolve();

function emit(next: SavedMoviesSnapshot) {
  snapshot = next;
  listeners.forEach((listener) => listener());
}

function sortNewestFirst(movies: SavedMovie[]): SavedMovie[] {
  return [...movies].sort((a, b) => b.saved_at - a.saved_at);
}

function isSavedMovie(value: unknown): value is SavedMovie {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return typeof v.id === "number" && typeof v.title === "string";
}

/** Clamp to a whole number between MIN_RATING and MAX_RATING, or null. */
export function normaliseRating(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  const rounded = Math.round(value);
  if (rounded < MIN_RATING || rounded > MAX_RATING) return null;
  return rounded;
}

function normaliseNote(value: unknown): string {
  return typeof value === "string" ? value.slice(0, MAX_NOTE_LENGTH) : "";
}

function normaliseGenreIds(value: unknown): number[] {
  return Array.isArray(value) ? value.filter((g): g is number => typeof g === "number") : [];
}

/** Parse a stored payload defensively; anything malformed yields []. */
function parsePersisted(raw: string | null): SavedMovie[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as Partial<PersistedShape> | null;
    if (!parsed || !Array.isArray(parsed.movies)) return [];
    return parsed.movies.filter(isSavedMovie).map((m) => ({
      id: m.id,
      title: m.title,
      poster_path: m.poster_path ?? null,
      vote_average: typeof m.vote_average === "number" ? m.vote_average : 0,
      release_date: typeof m.release_date === "string" ? m.release_date : "",
      saved_at: typeof m.saved_at === "number" ? m.saved_at : 0,
      rating: normaliseRating(m.rating),
      note: normaliseNote(m.note),
      genre_ids: normaliseGenreIds(m.genre_ids),
    }));
  } catch {
    return [];
  }
}

/** Serialise writes so two quick toggles can't race each other. */
function persist(movies: readonly SavedMovie[]) {
  const payload: PersistedShape = {
    version: STORAGE_VERSION,
    movies: [...movies],
  };
  writeQueue = writeQueue
    .then(() => AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(payload)))
    .catch((err) => {
      console.warn("[savedMovies] failed to persist watchlist", err);
    });
  return writeQueue;
}

/** Resolves once every write queued so far has hit AsyncStorage. */
export function waitForPendingWrites(): Promise<void> {
  return writeQueue;
}

/** Load from AsyncStorage once. Safe to call many times. */
export function hydrateSavedMovies(): Promise<void> {
  if (hydration) return hydration;

  hydration = (async () => {
    let persisted: SavedMovie[] = [];
    try {
      persisted = parsePersisted(await AsyncStorage.getItem(STORAGE_KEY));
    } catch (err) {
      console.warn("[savedMovies] failed to read watchlist", err);
    }

    // Anything toggled before the read finished wins over the stored copy.
    const merged = new Map<number, SavedMovie>();
    for (const m of persisted) merged.set(m.id, m);
    for (const m of snapshot.movies) merged.set(m.id, m);

    const movies = sortNewestFirst([...merged.values()]);
    emit({ hydrated: true, movies });

    if (snapshot.movies.length !== persisted.length) {
      await persist(movies);
    }
  })();

  return hydration;
}

// ---- useSyncExternalStore contract -------------------------------------

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  void hydrateSavedMovies();
  return () => {
    listeners.delete(listener);
  };
}

export function getSnapshot(): SavedMoviesSnapshot {
  return snapshot;
}

// ---- queries / mutations -----------------------------------------------

export function isMovieSaved(id: number): boolean {
  return snapshot.movies.some((m) => m.id === id);
}

export function getSavedMovies(): readonly SavedMovie[] {
  return snapshot.movies;
}

export function getSavedMovie(id: number): SavedMovie | undefined {
  return snapshot.movies.find((m) => m.id === id);
}

export function saveMovie(movie: SavedMovieInput): void {
  if (isMovieSaved(movie.id)) return;
  const entry: SavedMovie = {
    id: movie.id,
    title: movie.title,
    poster_path: movie.poster_path ?? null,
    vote_average: movie.vote_average ?? 0,
    release_date: movie.release_date ?? "",
    saved_at: Date.now(),
    rating: null,
    note: "",
    genre_ids: normaliseGenreIds(movie.genre_ids),
  };
  const movies = [entry, ...snapshot.movies];
  emit({ ...snapshot, movies });
  void persist(movies);
}

export function removeSavedMovie(id: number): void {
  if (!isMovieSaved(id)) return;
  const movies = snapshot.movies.filter((m) => m.id !== id);
  emit({ ...snapshot, movies });
  void persist(movies);
}

/** Add if missing, remove if present. Returns the new saved state. */
export function toggleSavedMovie(movie: SavedMovieInput): boolean {
  if (isMovieSaved(movie.id)) {
    removeSavedMovie(movie.id);
    return false;
  }
  saveMovie(movie);
  return true;
}

function patchSavedMovie(id: number, patch: Partial<SavedMovie>): boolean {
  const index = snapshot.movies.findIndex((m) => m.id === id);
  if (index === -1) return false;
  const movies = [...snapshot.movies];
  movies[index] = { ...movies[index], ...patch };
  emit({ ...snapshot, movies });
  void persist(movies);
  return true;
}

/** Set (or clear with null) the user's score. Ignored when the movie is not saved. */
export function rateSavedMovie(id: number, rating: number | null): boolean {
  return patchSavedMovie(id, { rating: normaliseRating(rating) });
}

/** Replace the note. Ignored when the movie is not saved. */
export function setSavedMovieNote(id: number, note: string): boolean {
  return patchSavedMovie(id, { note: normaliseNote(note.trim()) });
}

/** Empty the watchlist. */
export function clearSavedMovies(): void {
  emit({ ...snapshot, movies: [] });
  void persist([]);
}

/**
 * Replace or merge the whole list (restore from a backup). With merge, an
 * imported entry wins over an existing one with the same id.
 */
export function importSavedMovies(incoming: readonly SavedMovie[], mode: "merge" | "replace") {
  const clean = parsePersisted(JSON.stringify({ version: STORAGE_VERSION, movies: incoming }));
  const merged = new Map<number, SavedMovie>();
  if (mode === "merge") for (const m of snapshot.movies) merged.set(m.id, m);
  for (const m of clean) merged.set(m.id, m);
  const movies = sortNewestFirst([...merged.values()]);
  emit({ ...snapshot, movies });
  void persist(movies);
  return movies.length;
}

// ---- view helpers -------------------------------------------------------

export type SavedSort = "saved" | "title" | "rating" | "release";
export type SavedFilter = "all" | "rated" | "unrated" | "noted";

export const SAVED_SORT_LABELS: Record<SavedSort, string> = {
  saved: "Date saved",
  title: "Title",
  rating: "My rating",
  release: "Release",
};

export const SAVED_FILTER_LABELS: Record<SavedFilter, string> = {
  all: "All",
  rated: "Rated",
  unrated: "Not rated",
  noted: "With notes",
};

/** A sorted, filtered view of the list. Pure, so it can be unit tested. */
export function viewSavedMovies(
  movies: readonly SavedMovie[],
  sort: SavedSort,
  filter: SavedFilter = "all",
): SavedMovie[] {
  const filtered = movies.filter((m) => {
    if (filter === "rated") return m.rating !== null;
    if (filter === "unrated") return m.rating === null;
    if (filter === "noted") return m.note.length > 0;
    return true;
  });
  return filtered.sort((a, b) => {
    switch (sort) {
      case "title":
        return a.title.localeCompare(b.title) || b.saved_at - a.saved_at;
      case "rating": {
        const ar = a.rating ?? -1;
        const br = b.rating ?? -1;
        return br - ar || b.saved_at - a.saved_at;
      }
      case "release":
        return b.release_date.localeCompare(a.release_date) || b.saved_at - a.saved_at;
      default:
        return b.saved_at - a.saved_at;
    }
  });
}
