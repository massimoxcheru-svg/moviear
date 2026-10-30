import { act, renderHook } from "@testing-library/react-native";
import { useDebounce } from "../useDebounce";

type Props = { value: string; delay?: number };

function renderDebounce(initial: Props) {
  // Record every value the hook returned so we can assert what was *never* seen.
  const seen: string[] = [];
  const utils = renderHook(
    ({ value, delay }: Props) => {
      const debounced = useDebounce(value, delay);
      seen.push(debounced);
      return debounced;
    },
    { initialProps: initial },
  );
  return { ...utils, seen };
}

beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

describe("useDebounce", () => {
  it("returns the initial value immediately", () => {
    const { result } = renderDebounce({ value: "a", delay: 500 });
    expect(result.current).toBe("a");
  });

  it("does not update until the delay has fully elapsed", () => {
    const { result, rerender } = renderDebounce({ value: "a", delay: 500 });

    rerender({ value: "ab", delay: 500 });
    expect(result.current).toBe("a");

    act(() => {
      jest.advanceTimersByTime(499);
    });
    expect(result.current).toBe("a");

    act(() => {
      jest.advanceTimersByTime(1);
    });
    expect(result.current).toBe("ab");
  });

  it("collapses rapid changes into only the last value", () => {
    const { result, rerender, seen } = renderDebounce({
      value: "b",
      delay: 500,
    });

    // Simulates typing "bat", "batm", "batman" 100 ms apart.
    rerender({ value: "bat", delay: 500 });
    act(() => {
      jest.advanceTimersByTime(100);
    });
    rerender({ value: "batm", delay: 500 });
    act(() => {
      jest.advanceTimersByTime(100);
    });
    rerender({ value: "batman", delay: 500 });
    act(() => {
      jest.advanceTimersByTime(100);
    });

    // Still the original; the timer keeps being pushed back.
    expect(result.current).toBe("b");

    act(() => {
      jest.advanceTimersByTime(500);
    });
    expect(result.current).toBe("batman");

    // The intermediate values never surfaced.
    expect(seen).not.toContain("bat");
    expect(seen).not.toContain("batm");
  });

  it("uses a 500 ms default delay", () => {
    const { result, rerender } = renderDebounce({ value: "a" });

    rerender({ value: "z" });
    act(() => {
      jest.advanceTimersByTime(499);
    });
    expect(result.current).toBe("a");

    act(() => {
      jest.advanceTimersByTime(1);
    });
    expect(result.current).toBe("z");
  });

  it("respects a custom delay", () => {
    const { result, rerender } = renderDebounce({ value: "a", delay: 100 });

    rerender({ value: "z", delay: 100 });
    act(() => {
      jest.advanceTimersByTime(100);
    });
    expect(result.current).toBe("z");
  });

  it("clears its pending timer on unmount", () => {
    const { rerender, unmount } = renderDebounce({ value: "a", delay: 500 });

    rerender({ value: "b", delay: 500 });
    const pendingBefore = jest.getTimerCount();
    expect(pendingBefore).toBeGreaterThanOrEqual(1);

    unmount();
    expect(jest.getTimerCount()).toBe(pendingBefore - 1);
  });

  it("works with non-string values", () => {
    const { result, rerender } = renderHook(
      ({ value }: { value: number }) => useDebounce(value, 200),
      { initialProps: { value: 1 } },
    );

    rerender({ value: 2 });
    act(() => {
      jest.advanceTimersByTime(200);
    });
    expect(result.current).toBe(2);
  });
});
