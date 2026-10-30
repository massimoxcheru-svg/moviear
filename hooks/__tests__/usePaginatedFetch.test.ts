import { act, renderHook } from "@testing-library/react-native";
import { mergeUniqueById, usePaginatedFetch } from "../usePaginatedFetch";

type Item = { id: number; title: string };
type Page = TMDBPaginatedResponse<Item>;

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

const item = (id: number, prefix = "m"): Item => ({ id, title: `${prefix}${id}` });

function pageOf(page: number, ids: number[], totalPages: number, prefix?: string): Page {
  return {
    page,
    results: ids.map((id) => item(id, prefix)),
    total_pages: totalPages,
    total_results: totalPages * 20,
  };
}

/**
 * A fetchPage mock whose every call is recorded with a controllable promise,
 * so tests decide exactly when (and in what order) pages come back.
 */
function controllableFetch() {
  const requests: { page: number; d: ReturnType<typeof deferred<Page>> }[] = [];
  const fetchPage = jest.fn((page: number) => {
    const d = deferred<Page>();
    requests.push({ page, d });
    return d.promise;
  });
  return { fetchPage, requests };
}

const ids = (items: Item[]) => items.map((i) => i.id);

describe("mergeUniqueById", () => {
  it("appends new items and skips ids already present", () => {
    const merged = mergeUniqueById([item(1), item(2)], [item(2), item(3), item(3)]);
    expect(ids(merged)).toEqual([1, 2, 3]);
  });

  it("does not mutate its inputs", () => {
    const prev = [item(1)];
    mergeUniqueById(prev, [item(2)]);
    expect(prev).toHaveLength(1);
  });
});

describe("usePaginatedFetch", () => {
  describe("first page", () => {
    it("loads page 1 on mount", async () => {
      const { fetchPage, requests } = controllableFetch();
      const { result } = renderHook(() =>
        usePaginatedFetch(fetchPage, { key: "k" }),
      );

      expect(fetchPage).toHaveBeenCalledTimes(1);
      expect(fetchPage).toHaveBeenCalledWith(1);
      expect(result.current.loading).toBe(true);
      expect(result.current.loadingMore).toBe(false);
      expect(result.current.items).toEqual([]);
      expect(result.current.hasMore).toBe(false);

      await act(async () => {
        requests[0].d.resolve(pageOf(1, [1, 2, 3], 3));
      });

      expect(result.current.loading).toBe(false);
      expect(ids(result.current.items)).toEqual([1, 2, 3]);
      expect(result.current.hasMore).toBe(true);
      expect(result.current.error).toBeNull();
    });

    it("does nothing while disabled, then loads when enabled", async () => {
      const { fetchPage, requests } = controllableFetch();
      const { result, rerender } = renderHook(
        ({ enabled }: { enabled: boolean }) =>
          usePaginatedFetch(fetchPage, { key: "k", enabled }),
        { initialProps: { enabled: false } },
      );

      expect(fetchPage).not.toHaveBeenCalled();
      expect(result.current.loading).toBe(false);

      act(() => {
        result.current.loadMore();
      });
      expect(fetchPage).not.toHaveBeenCalled();

      rerender({ enabled: true });
      expect(fetchPage).toHaveBeenCalledTimes(1);
      await act(async () => {
        requests[0].d.resolve(pageOf(1, [1], 1));
      });
      expect(ids(result.current.items)).toEqual([1]);
    });

    it("reports a page-1 error with no items, and retry reloads page 1", async () => {
      const { fetchPage, requests } = controllableFetch();
      const { result } = renderHook(() =>
        usePaginatedFetch(fetchPage, { key: "k" }),
      );

      await act(async () => {
        requests[0].d.reject(new Error("offline"));
      });
      expect(result.current.loading).toBe(false);
      expect(result.current.error?.message).toBe("offline");
      expect(result.current.items).toEqual([]);

      act(() => {
        result.current.retry();
      });
      expect(fetchPage).toHaveBeenLastCalledWith(1);
      expect(result.current.loading).toBe(true);

      await act(async () => {
        requests[1].d.resolve(pageOf(1, [1, 2], 1));
      });
      expect(result.current.error).toBeNull();
      expect(ids(result.current.items)).toEqual([1, 2]);
    });
  });

  describe("loadMore", () => {
    it("appends the next page and only flags loadingMore while it loads", async () => {
      const { fetchPage, requests } = controllableFetch();
      const { result } = renderHook(() =>
        usePaginatedFetch(fetchPage, { key: "k" }),
      );
      await act(async () => {
        requests[0].d.resolve(pageOf(1, [1, 2], 3));
      });

      act(() => {
        result.current.loadMore();
      });
      expect(fetchPage).toHaveBeenLastCalledWith(2);
      expect(result.current.loadingMore).toBe(true);
      expect(result.current.loading).toBe(false);
      expect(ids(result.current.items)).toEqual([1, 2]); // still visible

      await act(async () => {
        requests[1].d.resolve(pageOf(2, [3, 4], 3));
      });
      expect(result.current.loadingMore).toBe(false);
      expect(ids(result.current.items)).toEqual([1, 2, 3, 4]);
      expect(result.current.hasMore).toBe(true);
    });

    it("stops at the last page and ignores further loadMore calls", async () => {
      const { fetchPage, requests } = controllableFetch();
      const { result } = renderHook(() =>
        usePaginatedFetch(fetchPage, { key: "k" }),
      );
      await act(async () => {
        requests[0].d.resolve(pageOf(1, [1], 2));
      });

      act(() => {
        result.current.loadMore();
      });
      await act(async () => {
        requests[1].d.resolve(pageOf(2, [2], 2));
      });
      expect(result.current.hasMore).toBe(false);

      act(() => {
        result.current.loadMore();
        result.current.loadMore();
      });
      expect(fetchPage).toHaveBeenCalledTimes(2);
      expect(result.current.loadingMore).toBe(false);
    });

    it("never has more than one page in flight (onEndReached can fire repeatedly)", async () => {
      const { fetchPage, requests } = controllableFetch();
      const { result } = renderHook(() =>
        usePaginatedFetch(fetchPage, { key: "k" }),
      );

      // While page 1 is loading.
      act(() => {
        result.current.loadMore();
        result.current.loadMore();
      });
      expect(fetchPage).toHaveBeenCalledTimes(1);

      await act(async () => {
        requests[0].d.resolve(pageOf(1, [1], 5));
      });

      // While page 2 is loading.
      act(() => {
        result.current.loadMore();
        result.current.loadMore();
        result.current.loadMore();
      });
      expect(fetchPage).toHaveBeenCalledTimes(2);
      expect(fetchPage).toHaveBeenLastCalledWith(2);
    });

    it("never shows a movie twice, even when TMDB repeats one across pages", async () => {
      const { fetchPage, requests } = controllableFetch();
      const { result } = renderHook(() =>
        usePaginatedFetch(fetchPage, { key: "k" }),
      );
      await act(async () => {
        requests[0].d.resolve(pageOf(1, [1, 2, 3, 3], 2)); // dup within a page
      });
      expect(ids(result.current.items)).toEqual([1, 2, 3]);

      act(() => {
        result.current.loadMore();
      });
      await act(async () => {
        requests[1].d.resolve(pageOf(2, [3, 4, 1, 5], 2)); // dups across pages
      });
      expect(ids(result.current.items)).toEqual([1, 2, 3, 4, 5]);
    });

    it("respects TMDB's hard cap of 500 pages even if total_pages is larger", async () => {
      const { fetchPage, requests } = controllableFetch();
      const { result } = renderHook(() =>
        usePaginatedFetch(fetchPage, { key: "k" }),
      );
      await act(async () => {
        requests[0].d.resolve(pageOf(1, [1], 1000));
      });

      // Walk all the way to page 500.
      for (let p = 2; p <= 500; p++) {
        act(() => {
          result.current.loadMore();
        });
        await act(async () => {
          requests[p - 1].d.resolve(pageOf(p, [p], 1000));
        });
      }
      expect(fetchPage).toHaveBeenCalledTimes(500);
      expect(result.current.items).toHaveLength(500);
      expect(result.current.hasMore).toBe(false);

      act(() => {
        result.current.loadMore();
      });
      expect(fetchPage).toHaveBeenCalledTimes(500);
    });

    it("keeps loaded items when a later page fails, and retry resumes that page", async () => {
      const { fetchPage, requests } = controllableFetch();
      const { result } = renderHook(() =>
        usePaginatedFetch(fetchPage, { key: "k" }),
      );
      await act(async () => {
        requests[0].d.resolve(pageOf(1, [1, 2], 3));
      });

      act(() => {
        result.current.loadMore();
      });
      await act(async () => {
        requests[1].d.reject(new Error("timeout"));
      });

      expect(ids(result.current.items)).toEqual([1, 2]);
      expect(result.current.error?.message).toBe("timeout");
      expect(result.current.loadingMore).toBe(false);
      expect(result.current.loading).toBe(false);

      // loadMore is a no-op while in the error state (no scroll-triggered retry storms)...
      act(() => {
        result.current.loadMore();
      });
      expect(fetchPage).toHaveBeenCalledTimes(2);

      // ...retry re-requests the page that failed.
      act(() => {
        result.current.retry();
      });
      expect(fetchPage).toHaveBeenLastCalledWith(2);
      expect(result.current.loadingMore).toBe(true);

      await act(async () => {
        requests[2].d.resolve(pageOf(2, [3], 3));
      });
      expect(result.current.error).toBeNull();
      expect(ids(result.current.items)).toEqual([1, 2, 3]);
    });
  });

  describe("key changes", () => {
    it("clears the list and fetches page 1 for the new key", async () => {
      const { fetchPage, requests } = controllableFetch();
      const { result, rerender } = renderHook(
        ({ key }: { key: string }) => usePaginatedFetch(fetchPage, { key }),
        { initialProps: { key: "bat" } },
      );
      await act(async () => {
        requests[0].d.resolve(pageOf(1, [1, 2], 1, "bat"));
      });
      expect(ids(result.current.items)).toEqual([1, 2]);

      rerender({ key: "cat" });

      expect(result.current.items).toEqual([]);
      expect(result.current.loading).toBe(true);
      expect(fetchPage).toHaveBeenLastCalledWith(1);
      expect(fetchPage).toHaveBeenCalledTimes(2);
    });

    it("drops a later page of the OLD key that resolves after the key changed", async () => {
      // Without the generation check in usePaginatedFetch, the old key's
      // page 2 would be appended to the new key's results and the final
      // assertions below fail.
      const { fetchPage, requests } = controllableFetch();
      const { result, rerender } = renderHook(
        ({ key }: { key: string }) => usePaginatedFetch(fetchPage, { key }),
        { initialProps: { key: "bat" } },
      );
      await act(async () => {
        requests[0].d.resolve(pageOf(1, [1, 2], 3, "bat"));
      });

      // Scroll to the bottom: page 2 of "bat" is now in flight.
      act(() => {
        result.current.loadMore();
      });
      expect(requests[1].page).toBe(2);
      expect(result.current.loadingMore).toBe(true);

      // User keeps typing: the key changes while that page is loading.
      rerender({ key: "batman" });
      expect(result.current.items).toEqual([]);
      expect(result.current.loadingMore).toBe(false);
      expect(requests[2].page).toBe(1);

      // New key's page 1 arrives.
      await act(async () => {
        requests[2].d.resolve(pageOf(1, [100, 101], 2, "batman"));
      });
      expect(ids(result.current.items)).toEqual([100, 101]);

      // Then the OLD key's page 2 finally arrives. It must be ignored.
      await act(async () => {
        requests[1].d.resolve(pageOf(2, [3, 4], 3, "bat"));
      });
      expect(ids(result.current.items)).toEqual([100, 101]);
      expect(result.current.items.every((m) => m.title.startsWith("batman"))).toBe(true);
      expect(result.current.loadingMore).toBe(false);
      expect(result.current.loading).toBe(false);
      expect(result.current.hasMore).toBe(true); // still "batman" paging state (1 of 2)
    });

    it("drops page 1 of the OLD key that resolves after the key changed", async () => {
      const { fetchPage, requests } = controllableFetch();
      const { result, rerender } = renderHook(
        ({ key }: { key: string }) => usePaginatedFetch(fetchPage, { key }),
        { initialProps: { key: "bat" } },
      );

      rerender({ key: "batman" }); // old page 1 still pending
      expect(requests).toHaveLength(2);

      await act(async () => {
        requests[1].d.resolve(pageOf(1, [100], 1, "batman"));
      });
      await act(async () => {
        requests[0].d.resolve(pageOf(1, [1, 2], 5, "bat"));
      });

      expect(ids(result.current.items)).toEqual([100]);
      expect(result.current.hasMore).toBe(false); // from "batman" (1 of 1), not "bat"
      expect(result.current.loading).toBe(false);
    });

    it("ignores an error from the old key after the key changed", async () => {
      const { fetchPage, requests } = controllableFetch();
      const { result, rerender } = renderHook(
        ({ key }: { key: string }) => usePaginatedFetch(fetchPage, { key }),
        { initialProps: { key: "bat" } },
      );

      rerender({ key: "batman" });
      await act(async () => {
        requests[0].d.reject(new Error("old failure"));
      });

      expect(result.current.error).toBeNull();
      expect(result.current.loading).toBe(true); // batman page 1 still loading
    });

    it("calls the latest fetchPage closure (captures the current key)", async () => {
      const seen: string[] = [];
      const { rerender } = renderHook(
        ({ key }: { key: string }) =>
          usePaginatedFetch(
            async (page) => {
              seen.push(`${key}:${page}`);
              return pageOf(page, [page], 1);
            },
            { key },
          ),
        { initialProps: { key: "a" } },
      );
      await act(async () => {});
      rerender({ key: "b" });
      await act(async () => {});

      expect(seen).toEqual(["a:1", "b:1"]);
    });
  });

  describe("unmount", () => {
    it("does not throw when a page settles after unmount", async () => {
      const { fetchPage, requests } = controllableFetch();
      const { unmount } = renderHook(() =>
        usePaginatedFetch(fetchPage, { key: "k" }),
      );

      unmount();

      await expect(
        act(async () => {
          requests[0].d.resolve(pageOf(1, [1], 1));
        }),
      ).resolves.not.toThrow();
    });
  });
});
