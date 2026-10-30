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
 */

import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY = "@moviear/saved-movies";
const STORAGE_VERSION = 1;

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
export type SavedMovieInput = MovieCardMovie;

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

export function saveMovie(movie: SavedMovieInput): void {
  if (isMovieSaved(movie.id)) return;
  const entry: SavedMovie = {
    id: movie.id,
    title: movie.title,
    poster_path: movie.poster_path ?? null,
    vote_average: movie.vote_average ?? 0,
    release_date: movie.release_date ?? "",
    saved_at: Date.now(),
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

/** Empty the watchlist (for a future "clear saved list" setting). */
export function clearSavedMovies(): void {
  emit({ ...snapshot, movies: [] });
  void persist([]);
}
