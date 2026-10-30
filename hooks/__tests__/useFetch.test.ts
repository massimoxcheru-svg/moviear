import { act, renderHook } from "@testing-library/react-native";
import { useFetch } from "../useFetch";

/** A promise whose settlement the test controls. */
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe("useFetch", () => {
  describe("autoFetch", () => {
    it("fetches on mount and exposes loading -> data", async () => {
      const d = deferred<string>();
      const fetchFn = jest.fn(() => d.promise);

      const { result } = renderHook(() => useFetch(fetchFn));

      expect(fetchFn).toHaveBeenCalledTimes(1);
      expect(result.current.loading).toBe(true);
      expect(result.current.data).toBeNull();
      expect(result.current.error).toBeNull();

      await act(async () => {
        d.resolve("hello");
      });

      expect(result.current.loading).toBe(false);
      expect(result.current.data).toBe("hello");
      expect(result.current.error).toBeNull();
    });

    it("stays idle when autoFetch is false", () => {
      const fetchFn = jest.fn(async () => "never");

      const { result } = renderHook(() => useFetch(fetchFn, false));

      expect(fetchFn).not.toHaveBeenCalled();
      expect(result.current.loading).toBe(false);
      expect(result.current.data).toBeNull();
    });

    it("does not fetch again just because a new fetchFn closure is passed on re-render", async () => {
      const impl = jest.fn(async () => 1);

      const { result, rerender } = renderHook(
        (_props: { tick: number }) => useFetch(() => impl()),
        { initialProps: { tick: 0 } },
      );
      // Let the mount fetch settle inside act before re-rendering; otherwise
      // its state updates land after the test body and React warns.
      await act(async () => {});
      expect(result.current.data).toBe(1);

      rerender({ tick: 1 });
      rerender({ tick: 2 });

      expect(impl).toHaveBeenCalledTimes(1);
      expect(result.current.data).toBe(1);
    });
  });

  describe("errors", () => {
    it("exposes a rejected Error as-is", async () => {
      const boom = new Error("boom");
      const { result } = renderHook(() => useFetch(() => Promise.reject(boom)));

      await act(async () => {});

      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBe(boom);
      expect(result.current.data).toBeNull();
    });

    it("wraps non-Error rejections in an Error", async () => {
      const { result } = renderHook(() =>
        useFetch(() => Promise.reject("string reason")),
      );

      await act(async () => {});

      expect(result.current.error).toBeInstanceOf(Error);
      expect(result.current.error?.message).toBe("string reason");
    });

    it("clears a previous error when refetch succeeds", async () => {
      const fetchFn = jest
        .fn(async (): Promise<string> => "unused")
        .mockRejectedValueOnce(new Error("first"))
        .mockResolvedValueOnce("second");

      const { result } = renderHook(() => useFetch(fetchFn));
      await act(async () => {});
      expect(result.current.error?.message).toBe("first");

      await act(async () => {
        await result.current.refetch();
      });

      expect(result.current.error).toBeNull();
      expect(result.current.data).toBe("second");
    });
  });

  describe("refetch", () => {
    it("re-runs the fetch and updates data", async () => {
      const fetchFn = jest
        .fn(async (): Promise<number> => 0)
        .mockResolvedValueOnce(1)
        .mockResolvedValueOnce(2);

      const { result } = renderHook(() => useFetch(fetchFn));
      await act(async () => {});
      expect(result.current.data).toBe(1);

      await act(async () => {
        await result.current.refetch();
      });

      expect(fetchFn).toHaveBeenCalledTimes(2);
      expect(result.current.data).toBe(2);
    });

    it("calls the latest fetchFn, not the one from the first render", async () => {
      // This is what the Search screen relies on: the closure captures the
      // current debounced query, and refetch must see the new one.
      const { result, rerender } = renderHook(
        ({ query }: { query: string }) =>
          useFetch(() => Promise.resolve(`results for ${query}`), false),
        { initialProps: { query: "bat" } },
      );

      rerender({ query: "batman" });
      await act(async () => {
        await result.current.refetch();
      });

      expect(result.current.data).toBe("results for batman");
    });

    it("keeps a stable refetch/reset identity across renders", () => {
      const { result, rerender } = renderHook(
        (_props: { tick: number }) => useFetch(async () => 1, false),
        { initialProps: { tick: 0 } },
      );
      const { refetch, reset } = result.current;

      rerender({ tick: 1 });

      expect(result.current.refetch).toBe(refetch);
      expect(result.current.reset).toBe(reset);
    });
  });

  describe("stale responses", () => {
    it("ignores an older request that resolves after a newer one", async () => {
      // Two in-flight requests: #1 (old, slow) and #2 (new, fast).
      // Without the request-id guard in useFetch, #1 resolving last would
      // overwrite data with "old" and this test fails on the final assertion.
      const requests: ReturnType<typeof deferred<string>>[] = [];
      const fetchFn = jest.fn(() => {
        const d = deferred<string>();
        requests.push(d);
        return d.promise;
      });

      const { result } = renderHook(() => useFetch(fetchFn, false));

      await act(async () => {
        void result.current.refetch(); // #1
      });
      await act(async () => {
        void result.current.refetch(); // #2
      });
      expect(requests).toHaveLength(2);
      expect(result.current.loading).toBe(true);

      // Newer request finishes first.
      await act(async () => {
        requests[1].resolve("new");
      });
      expect(result.current.data).toBe("new");
      expect(result.current.loading).toBe(false);

      // Older request finishes afterwards and must be ignored.
      await act(async () => {
        requests[0].resolve("old");
      });
      expect(result.current.data).toBe("new");
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it("ignores an older request that rejects after a newer one succeeded", async () => {
      const requests: ReturnType<typeof deferred<string>>[] = [];
      const fetchFn = jest.fn(() => {
        const d = deferred<string>();
        requests.push(d);
        return d.promise;
      });

      const { result } = renderHook(() => useFetch(fetchFn, false));

      await act(async () => {
        void result.current.refetch(); // #1
      });
      await act(async () => {
        void result.current.refetch(); // #2
      });

      await act(async () => {
        requests[1].resolve("new");
      });
      await act(async () => {
        requests[0].reject(new Error("old request failed"));
      });

      expect(result.current.data).toBe("new");
      expect(result.current.error).toBeNull();
      expect(result.current.loading).toBe(false);
    });

    it("keeps loading true until the *latest* request settles", async () => {
      const requests: ReturnType<typeof deferred<string>>[] = [];
      const fetchFn = jest.fn(() => {
        const d = deferred<string>();
        requests.push(d);
        return d.promise;
      });

      const { result } = renderHook(() => useFetch(fetchFn, false));

      await act(async () => {
        void result.current.refetch(); // #1
      });
      await act(async () => {
        void result.current.refetch(); // #2
      });

      // Old one settles first: must not flip loading off or set data.
      await act(async () => {
        requests[0].resolve("old");
      });
      expect(result.current.loading).toBe(true);
      expect(result.current.data).toBeNull();

      await act(async () => {
        requests[1].resolve("new");
      });
      expect(result.current.loading).toBe(false);
      expect(result.current.data).toBe("new");
    });
  });

  describe("reset", () => {
    it("clears data, error and loading", async () => {
      const { result } = renderHook(() => useFetch(async () => "value"));
      await act(async () => {});
      expect(result.current.data).toBe("value");

      act(() => {
        result.current.reset();
      });

      expect(result.current.data).toBeNull();
      expect(result.current.error).toBeNull();
      expect(result.current.loading).toBe(false);
    });

    it("invalidates an in-flight request so its result is dropped", async () => {
      const d = deferred<string>();
      const { result } = renderHook(() => useFetch(() => d.promise, false));

      await act(async () => {
        void result.current.refetch();
      });
      expect(result.current.loading).toBe(true);

      act(() => {
        result.current.reset();
      });
      expect(result.current.loading).toBe(false);

      await act(async () => {
        d.resolve("too late");
      });
      expect(result.current.data).toBeNull();
      expect(result.current.loading).toBe(false);
    });
  });

  describe("unmount", () => {
    it("does not throw when a request settles after unmount", async () => {
      const d = deferred<string>();
      const { result, unmount } = renderHook(() => useFetch(() => d.promise));
      expect(result.current.loading).toBe(true);

      unmount();

      await expect(
        act(async () => {
          d.resolve("late");
        }),
      ).resolves.not.toThrow();
    });
  });
});

describe("refresh", () => {
  it("calls fetchFn with force and keeps the data on screen while it runs", async () => {
    const fetchFn = jest.fn(async ({ force }: { force: boolean }) => (force ? "fresh" : "first"));
    const { result } = renderHook(() => useFetch(fetchFn));
    await act(async () => {});
    expect(result.current.data).toBe("first");
    expect(fetchFn).toHaveBeenLastCalledWith({ force: false });

    let done: Promise<void> | undefined;
    act(() => {
      done = result.current.refresh();
    });
    expect(result.current.refreshing).toBe(true);
    expect(result.current.loading).toBe(false);
    expect(result.current.data).toBe("first");

    await act(async () => {
      await done;
    });
    expect(result.current.data).toBe("fresh");
    expect(result.current.refreshing).toBe(false);
    expect(fetchFn).toHaveBeenLastCalledWith({ force: true });
  });

  it("reports an error from a refresh without losing the data", async () => {
    let calls = 0;
    const fetchFn = jest.fn(async () => {
      calls += 1;
      if (calls === 2) throw new Error("offline");
      return "ok";
    });
    const { result } = renderHook(() => useFetch(fetchFn));
    await act(async () => {});
    await act(async () => {
      await result.current.refresh();
    });
    expect(result.current.error?.message).toBe("offline");
    expect(result.current.data).toBe("ok");
    expect(result.current.refreshing).toBe(false);
  });
});
