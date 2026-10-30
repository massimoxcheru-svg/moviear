import { useCallback, useSyncExternalStore } from "react";
import {
  clearHistory,
  getSnapshot,
  recordView,
  removeFromHistory,
  subscribe,
} from "@/services/history";

/** Subscribe to the recently viewed list. */
export function useWatchHistory() {
  const { entries, hydrated } = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getSnapshot,
  );

  const record = useCallback((movie: MovieCardMovie) => recordView(movie), []);
  const remove = useCallback((id: number) => removeFromHistory(id), []);
  const clear = useCallback(() => clearHistory(), []);

  return {
    /** Newest first. */
    entries,
    count: entries.length,
    /** False until the first AsyncStorage read completes. */
    hydrated,
    record,
    remove,
    clear,
  };
}

export default useWatchHistory;
