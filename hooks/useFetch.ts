import { useCallback, useEffect, useRef, useState } from "react";

export interface UseFetchResult<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  /** Run the fetch (again). Safe to call from an effect or a button. */
  refetch: () => Promise<void>;
  /** Clear data, error and loading. */
  reset: () => void;
}

/**
 * Small data-fetching hook around an async function.
 *
 * - `autoFetch` (default true) runs `fetchFn` once on mount.
 * - Only the latest in-flight request is allowed to update state, so a slow
 *   older response can never overwrite a newer one (matters for search).
 * - Nothing is set after unmount.
 *
 * `fetchFn` is read through a ref, so callers don't need to memoise it.
 */
export function useFetch<T>(
  fetchFn: () => Promise<T>,
  autoFetch = true,
): UseFetchResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(autoFetch);
  const [error, setError] = useState<Error | null>(null);

  const fetchFnRef = useRef(fetchFn);
  const requestIdRef = useRef(0);
  const mountedRef = useRef(true);

  useEffect(() => {
    fetchFnRef.current = fetchFn;
  });

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const refetch = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    setLoading(true);
    setError(null);

    try {
      const result = await fetchFnRef.current();
      if (!mountedRef.current || requestId !== requestIdRef.current) return;
      setData(result);
    } catch (err) {
      if (!mountedRef.current || requestId !== requestIdRef.current) return;
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      if (mountedRef.current && requestId === requestIdRef.current) {
        setLoading(false);
      }
    }
  }, []);

  const reset = useCallback(() => {
    requestIdRef.current++; // invalidate anything in flight
    setData(null);
    setError(null);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (autoFetch) refetch();
    // Run once on mount only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { data, loading, error, refetch, reset };
}

export default useFetch;
