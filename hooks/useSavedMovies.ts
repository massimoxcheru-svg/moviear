import { useCallback, useSyncExternalStore } from "react";
import {
  getSnapshot,
  subscribe,
  toggleSavedMovie,
  type SavedMovieInput,
} from "@/services/savedMovies";

/**
 * Subscribe to the on-device watchlist. Every component using this hook
 * re-renders when a movie is saved or removed, on any screen.
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

  const toggle = useCallback(
    (movie: SavedMovieInput) => toggleSavedMovie(movie),
    [],
  );

  return {
    /** Newest-saved first. */
    movies,
    count: movies.length,
    /** False until the first AsyncStorage read completes. */
    hydrated,
    isSaved,
    /** Add or remove; returns the new saved state. */
    toggle,
  };
}

export default useSavedMovies;
