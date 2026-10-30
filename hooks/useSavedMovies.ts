import { useCallback, useSyncExternalStore } from "react";
import {
  getSnapshot,
  rateSavedMovie,
  setSavedMovieNote,
  subscribe,
  toggleSavedMovie,
  type SavedMovieInput,
} from "@/services/savedMovies";

/**
 * Subscribe to the on-device watchlist. Every component using this hook
 * re-renders when a movie is saved, removed, rated or annotated, on any
 * screen.
 */
export function useSavedMovies() {
  const { movies, hydrated } = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getSnapshot,
  );

  const isSaved = useCallback(
    (id: number) => movies.some((m) => m.id === id),
    [movies],
  );

  const get = useCallback((id: number) => movies.find((m) => m.id === id), [movies]);

  const toggle = useCallback(
    (movie: SavedMovieInput) => toggleSavedMovie(movie),
    [],
  );

  const rate = useCallback((id: number, rating: number | null) => {
    rateSavedMovie(id, rating);
  }, []);

  const setNote = useCallback((id: number, note: string) => {
    setSavedMovieNote(id, note);
  }, []);

  return {
    /** Newest-saved first. */
    movies,
    count: movies.length,
    /** False until the first AsyncStorage read completes. */
    hydrated,
    isSaved,
    /** The saved entry for an id, with rating and note, or undefined. */
    get,
    /** Add or remove; returns the new saved state. */
    toggle,
    rate,
    setNote,
  };
}

export default useSavedMovies;
