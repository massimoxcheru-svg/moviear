import { useCallback, useEffect, useRef, useState } from "react";

/** TMDB refuses pages beyond 500 regardless of total_pages. */
const TMDB_MAX_PAGE = 500;

export interface UsePaginatedFetchOptions {
  /**
   * Identifies the list (e.g. the search query). Must be a primitive; when it
   * changes the list is cleared and page 1 is fetched again. Responses from
   * requests started under a previous key are dropped.
   */
  key: string | number | boolean | null | undefined;
  /** When false nothing is fetched and the list stays empty. Default true. */
  enabled?: boolean;
}

export interface UsePaginatedFetchResult<T> {
  /** All pages loaded so far, in order, with duplicates (by id) removed. */
  items: T[];
  /** True while page 1 is loading (initial load or after a key change). */
  loading: boolean;
  /** True while a later page is loading; drive the footer spinner with this. */
  loadingMore: boolean;
  /** Error from the most recent request. Items already loaded are kept. */
  error: Error | null;
  /** True when there is another page to fetch. */
  hasMore: boolean;
  /** Fetch the next page. No-op while loading, on error, or when there is no more. */
  loadMore: () => void;
  /** Re-run the request that failed (page 1 or the next page). */
  retry: () => void;
}

function toError(err: unknown): Error {
  return err instanceof Error ? err : new Error(String(err));
}

/** Append `next` to `prev`, skipping ids already present. */
export function mergeUniqueById<T extends { id: number }>(
  prev: readonly T[],
  next: readonly T[],
): T[] {
  const seen = new Set(prev.map((item) => item.id));
  const out = [...prev];
  for (const item of next) {
    if (!seen.has(item.id)) {
      seen.add(item.id);
      out.push(item);
    }
  }
  return out;
}

/**
 * Infinite-scroll pagination over a TMDB list endpoint.
 *
 * Compared with useFetch (a single value that gets replaced) this keeps an
 * accumulating list with a page cursor. A generation counter is bumped every
 * time `key` changes; any response from an older generation is ignored, so a
 * slow page from a previous query can never be mixed into the current list.
 *
 * `fetchPage` is read through a ref, so callers can pass an inline closure.
 */
export function usePaginatedFetch<T extends { id: number }>(
  fetchPage: (page: number) => Promise<TMDBPaginatedResponse<T>>,
  { key, enabled = true }: UsePaginatedFetchOptions,
): UsePaginatedFetchResult<T> {
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(enabled);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [page, setPage] = useState(0); // last page successfully loaded
  const [totalPages, setTotalPages] = useState(0);

  const fetchPageRef = useRef(fetchPage);
  const generationRef = useRef(0);
  const inFlightRef = useRef(false);
  const mountedRef = useRef(true);
  // Mirrors of page/totalPages so loadMore never reads a stale closure.
  const pageRef = useRef(0);
  const totalPagesRef = useRef(0);

  useEffect(() => {
    fetchPageRef.current = fetchPage;
  });

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const load = useCallback(async (pageToLoad: number, generation: number) => {
    inFlightRef.current = true;
    if (pageToLoad === 1) setLoading(true);
    else setLoadingMore(true);
    setError(null);

    const isCurrent = () =>
      mountedRef.current && generation === generationRef.current;

    try {
      const response = await fetchPageRef.current(pageToLoad);
      if (!isCurrent()) return;

      pageRef.current = pageToLoad;
      totalPagesRef.current = Math.min(response.total_pages, TMDB_MAX_PAGE);
      setPage(pageToLoad);
      setTotalPages(totalPagesRef.current);
      setItems((prev) =>
        mergeUniqueById(pageToLoad === 1 ? [] : prev, response.results),
      );
    } catch (err) {
      if (!isCurrent()) return;
      setError(toError(err));
    } finally {
      if (isCurrent()) {
        inFlightRef.current = false;
        setLoading(false);
        setLoadingMore(false);
      }
    }
  }, []);

  // Reset and (re)start whenever the key or enabled flag changes.
  useEffect(() => {
    const generation = ++generationRef.current; // invalidates anything in flight
    inFlightRef.current = false;
    pageRef.current = 0;
    totalPagesRef.current = 0;
    setItems([]);
    setPage(0);
    setTotalPages(0);
    setError(null);
    setLoadingMore(false);

    if (!enabled) {
      setLoading(false);
      return;
    }
    void load(1, generation);
  }, [key, enabled, load]);

  const loadMore = useCallback(() => {
    if (!enabled || inFlightRef.current || error) return;
    if (pageRef.current === 0 || pageRef.current >= totalPagesRef.current) {
      return;
    }
    void load(pageRef.current + 1, generationRef.current);
  }, [enabled, error, load]);

  const retry = useCallback(() => {
    if (!enabled || inFlightRef.current) return;
    const next = pageRef.current === 0 ? 1 : pageRef.current + 1;
    void load(next, generationRef.current);
  }, [enabled, load]);

  return {
    items,
    loading,
    loadingMore,
    error,
    hasMore: page > 0 && page < totalPages,
    loadMore,
    retry,
  };
}

export default usePaginatedFetch;
