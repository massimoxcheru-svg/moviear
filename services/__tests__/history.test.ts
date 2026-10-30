type Store = typeof import("../history");

const STORAGE_KEY = "@moviear/history";

const mockDisk = new Map<string, string>();
const mockTick = () => Promise.resolve();

jest.mock("@react-native-async-storage/async-storage", () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(async (key: string) => {
      await mockTick();
      return mockDisk.has(key) ? (mockDisk.get(key) as string) : null;
    }),
    setItem: jest.fn(async (key: string, value: string) => {
      await mockTick();
      mockDisk.set(key, value);
    }),
  },
}));

const AsyncStorage = jest.requireMock<{
  default: { getItem: jest.Mock; setItem: jest.Mock };
}>("@react-native-async-storage/async-storage").default;

let launched: Store[] = [];

function launchApp(): Store {
  let store: Store | undefined;
  jest.isolateModules(() => {
    store = jest.requireActual<Store>("../history");
  });
  if (!store) throw new Error("failed to load store");
  launched.push(store);
  return store;
}

function readDisk(): { version: number; entries: HistoryEntry[] } {
  const raw = mockDisk.get(STORAGE_KEY);
  if (raw === undefined) throw new Error("nothing on disk");
  return JSON.parse(raw);
}

const movie = (id: number, title = `Movie ${id}`): MovieCardMovie => ({
  id,
  title,
  poster_path: `/${id}.jpg`,
  vote_average: 6.5,
  release_date: "2023-05-05",
});

let now = 1_700_000_000_000;
let dateSpy: jest.SpyInstance;
let warnSpy: jest.SpyInstance;

beforeEach(() => {
  launched = [];
  mockDisk.clear();
  dateSpy = jest.spyOn(Date, "now").mockImplementation(() => (now += 1000));
  warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
});

afterEach(async () => {
  for (const store of launched) {
    await store.hydrateHistory();
    await store.waitForPendingWrites();
  }
  dateSpy.mockRestore();
  warnSpy.mockRestore();
});

describe("recording views", () => {
  it("lists the most recent view first", async () => {
    const store = launchApp();
    await store.hydrateHistory();

    store.recordView(movie(1));
    store.recordView(movie(2));
    store.recordView(movie(3));

    expect(store.getHistory().map((e) => e.id)).toEqual([3, 2, 1]);
  });

  it("moves a movie to the top when it is viewed again", async () => {
    const store = launchApp();
    await store.hydrateHistory();

    store.recordView(movie(1));
    store.recordView(movie(2));
    store.recordView(movie(1));

    expect(store.getHistory().map((e) => e.id)).toEqual([1, 2]);
    expect(store.getHistory()).toHaveLength(2);
  });

  it("stores only the card fields plus viewed_at", async () => {
    const store = launchApp();
    await store.hydrateHistory();

    store.recordView({
      ...movie(1),
      ...({ overview: "long", genres: [] } as object),
    });

    expect(store.getHistory()[0]).toEqual({
      id: 1,
      title: "Movie 1",
      poster_path: "/1.jpg",
      vote_average: 6.5,
      release_date: "2023-05-05",
      viewed_at: expect.any(Number),
    });
  });

  it("keeps no more than the limit, dropping the oldest", async () => {
    const store = launchApp();
    await store.hydrateHistory();

    for (let id = 1; id <= store.HISTORY_LIMIT + 5; id++) {
      store.recordView(movie(id));
    }

    const ids = store.getHistory().map((e) => e.id);
    expect(ids).toHaveLength(store.HISTORY_LIMIT);
    expect(ids[0]).toBe(store.HISTORY_LIMIT + 5);
    expect(ids).not.toContain(1);
  });

  it("notifies subscribers and persists", async () => {
    const store = launchApp();
    await store.hydrateHistory();
    const listener = jest.fn();
    store.subscribe(listener);

    store.recordView(movie(7));
    expect(listener).toHaveBeenCalledTimes(1);

    await store.waitForPendingWrites();
    expect(readDisk().entries.map((e) => e.id)).toEqual([7]);
  });
});

describe("removing and clearing", () => {
  it("removes a single entry and ignores unknown ids", async () => {
    const store = launchApp();
    await store.hydrateHistory();
    const listener = jest.fn();
    store.subscribe(listener);

    store.recordView(movie(1));
    store.recordView(movie(2));
    store.removeFromHistory(1);
    store.removeFromHistory(99);

    expect(store.getHistory().map((e) => e.id)).toEqual([2]);
    expect(listener).toHaveBeenCalledTimes(3);
  });

  it("clears everything, including on disk", async () => {
    const store = launchApp();
    await store.hydrateHistory();
    store.recordView(movie(1));
    store.clearHistory();
    await store.waitForPendingWrites();

    expect(store.getHistory()).toEqual([]);
    expect(readDisk().entries).toEqual([]);
  });
});

describe("hydration", () => {
  it("survives a relaunch in the same order", async () => {
    const first = launchApp();
    await first.hydrateHistory();
    first.recordView(movie(1));
    first.recordView(movie(2));
    await first.waitForPendingWrites();

    const second = launchApp();
    expect(second.getSnapshot().hydrated).toBe(false);
    await second.hydrateHistory();
    expect(second.getHistory().map((e) => e.id)).toEqual([2, 1]);
  });

  it("a view recorded before the disk read lands ends up on top", async () => {
    const seed = launchApp();
    await seed.hydrateHistory();
    seed.recordView(movie(1));
    await seed.waitForPendingWrites();

    const store = launchApp();
    store.recordView(movie(2));
    await store.hydrateHistory();

    expect(store.getHistory().map((e) => e.id)).toEqual([2, 1]);
  });

  it("drops malformed entries and tolerates garbage", async () => {
    mockDisk.set(
      STORAGE_KEY,
      JSON.stringify({
        version: 1,
        entries: [{ id: 1, title: "ok" }, { title: "no id" }, 5, null],
      }),
    );
    const store = launchApp();
    await store.hydrateHistory();
    expect(store.getHistory()).toEqual([
      {
        id: 1,
        title: "ok",
        poster_path: null,
        vote_average: 0,
        release_date: "",
        viewed_at: 0,
      },
    ]);

    mockDisk.set(STORAGE_KEY, "garbage");
    const again = launchApp();
    await again.hydrateHistory();
    expect(again.getHistory()).toEqual([]);
  });

  it("hydrates once, even with several subscribers", async () => {
    const store = launchApp();
    store.subscribe(() => {});
    store.subscribe(() => {});
    await store.hydrateHistory();
    expect(AsyncStorage.getItem).toHaveBeenCalledTimes(1);
  });

  it("logs and continues when the read throws", async () => {
    AsyncStorage.getItem.mockRejectedValueOnce(new Error("boom"));
    const store = launchApp();
    await store.hydrateHistory();
    expect(store.getSnapshot()).toEqual({ hydrated: true, entries: [] });
    expect(warnSpy).toHaveBeenCalled();
  });
});
