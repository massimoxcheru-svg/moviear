/**
 * The store keeps its state at module level, so "closing and reopening the
 * app" is simulated by loading a fresh copy of the module against the same
 * fake AsyncStorage "disk".
 */

type Store = typeof import("../savedMovies");

const STORAGE_KEY = "@moviear/saved-movies";

// `mock`-prefixed so babel-plugin-jest-hoist allows it inside the factory.
const mockDisk = new Map<string, string>();
// Yields to the microtask queue. That is enough to make the fake storage
// genuinely async (a synchronous toggle can land before a read completes)
// without creating real timers, which can keep a Jest worker alive.
const mockTick = () => Promise.resolve();

jest.mock("@react-native-async-storage/async-storage", () => ({
  __esModule: true,
  default: {
    // Each call yields once so hydration is genuinely async, which is what
    // makes the "toggle before hydration" case meaningful.
    getItem: jest.fn(async (key: string) => {
      await mockTick();
      return mockDisk.has(key) ? (mockDisk.get(key) as string) : null;
    }),
    setItem: jest.fn(async (key: string, value: string) => {
      await mockTick();
      mockDisk.set(key, value);
    }),
    removeItem: jest.fn(async (key: string) => {
      await mockTick();
      mockDisk.delete(key);
    }),
  },
}));

// Resolve the mock once, outside any isolated registry, so every "relaunch"
// below shares this single instance (and the assertions on it see its calls).
const AsyncStorage = jest.requireMock<{
  default: { getItem: jest.Mock; setItem: jest.Mock };
}>("@react-native-async-storage/async-storage").default;

// Every store instance launched during a test; drained in afterEach so a
// write still in flight can't land on the disk after the next test clears it.
let launched: Store[] = [];

/** Fresh module instance == app relaunch. The disk (mockDisk) is shared. */
function launchApp(): Store {
  let store: Store | undefined;
  jest.isolateModules(() => {
    store = jest.requireActual<Store>("../savedMovies");
  });
  if (!store) throw new Error("failed to load store");
  launched.push(store);
  return store;
}

function readDisk(): { version: number; movies: SavedMovie[] } {
  const raw = mockDisk.get(STORAGE_KEY);
  if (raw === undefined) throw new Error("nothing on disk");
  return JSON.parse(raw);
}

const movie = (id: number, title = `Movie ${id}`): MovieCardMovie => ({
  id,
  title,
  poster_path: `/${id}.jpg`,
  vote_average: 7.5,
  release_date: "2024-01-01",
});

let now = 1_700_000_000_000;
let dateSpy: jest.SpyInstance;
let warnSpy: jest.SpyInstance;

beforeEach(() => {
  launched = [];
  mockDisk.clear();
  // Deterministic, strictly increasing saved_at values.
  dateSpy = jest.spyOn(Date, "now").mockImplementation(() => (now += 1000));
  warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
});

afterEach(async () => {
  // Settle every store launched by the test: finish any hydration it kicked
  // off and flush its write queue, so nothing outlives the test.
  for (const store of launched) {
    await store.hydrateSavedMovies();
    await store.waitForPendingWrites();
  }
  // Restore the spies individually: in Jest 29 `restoreAllMocks` would also
  // reset the jest.fn() implementations inside the AsyncStorage mock.
  dateSpy.mockRestore();
  warnSpy.mockRestore();
});

describe("initial state and hydration", () => {
  it("starts empty and not hydrated, then hydrates from an empty disk", async () => {
    const store = launchApp();
    expect(store.getSnapshot()).toEqual({ hydrated: false, movies: [] });

    await store.hydrateSavedMovies();
    expect(store.getSnapshot()).toEqual({ hydrated: true, movies: [] });
  });

  it("subscribing triggers hydration and notifies when it completes", async () => {
    const store = launchApp();
    const listener = jest.fn();
    store.subscribe(listener);

    await store.hydrateSavedMovies();
    expect(listener).toHaveBeenCalled();
    expect(store.getSnapshot().hydrated).toBe(true);
  });

  it("hydrates only once even when asked repeatedly", async () => {
    const store = launchApp();

    await Promise.all([
      store.hydrateSavedMovies(),
      store.hydrateSavedMovies(),
      store.hydrateSavedMovies(),
    ]);
    store.subscribe(() => {});
    await store.hydrateSavedMovies();

    expect(AsyncStorage.getItem).toHaveBeenCalledTimes(1);
  });
});

describe("toggling", () => {
  it("adds on first toggle, removes on second, and reports the new state", async () => {
    const store = launchApp();
    await store.hydrateSavedMovies();

    expect(store.toggleSavedMovie(movie(1))).toBe(true);
    expect(store.isMovieSaved(1)).toBe(true);
    expect(store.getSavedMovies()).toHaveLength(1);

    expect(store.toggleSavedMovie(movie(1))).toBe(false);
    expect(store.isMovieSaved(1)).toBe(false);
    expect(store.getSavedMovies()).toHaveLength(0);
  });

  it("lists newest-saved first", async () => {
    const store = launchApp();
    await store.hydrateSavedMovies();

    store.toggleSavedMovie(movie(1, "First"));
    store.toggleSavedMovie(movie(2, "Second"));
    store.toggleSavedMovie(movie(3, "Third"));

    expect(store.getSavedMovies().map((m) => m.title)).toEqual([
      "Third",
      "Second",
      "First",
    ]);
  });

  it("stores only the card fields plus saved_at", async () => {
    const store = launchApp();
    await store.hydrateSavedMovies();

    store.saveMovie({
      ...movie(1),
      // extra fields a MovieDetails object would carry must be dropped
      ...({ overview: "long text", genres: [] } as object),
    });

    expect(store.getSavedMovies()[0]).toEqual({
      id: 1,
      title: "Movie 1",
      poster_path: "/1.jpg",
      vote_average: 7.5,
      release_date: "2024-01-01",
      saved_at: expect.any(Number),
      rating: null,
      note: "",
      genre_ids: [],
    });
  });

  it("saveMovie and removeSavedMovie are idempotent", async () => {
    const store = launchApp();
    await store.hydrateSavedMovies();

    store.saveMovie(movie(1));
    store.saveMovie(movie(1));
    expect(store.getSavedMovies()).toHaveLength(1);

    store.removeSavedMovie(1);
    store.removeSavedMovie(1);
    expect(store.getSavedMovies()).toHaveLength(0);
  });

  it("notifies subscribers on every change and stops after unsubscribe", async () => {
    const store = launchApp();
    await store.hydrateSavedMovies();
    const listener = jest.fn();
    const unsubscribe = store.subscribe(listener);

    store.toggleSavedMovie(movie(1));
    store.toggleSavedMovie(movie(2));
    store.toggleSavedMovie(movie(1));
    expect(listener).toHaveBeenCalledTimes(3);

    unsubscribe();
    store.toggleSavedMovie(movie(3));
    expect(listener).toHaveBeenCalledTimes(3);
  });

  it("returns a new snapshot object on change and the same one otherwise", async () => {
    const store = launchApp();
    await store.hydrateSavedMovies();

    const before = store.getSnapshot();
    expect(store.getSnapshot()).toBe(before); // stable for useSyncExternalStore

    store.toggleSavedMovie(movie(1));
    expect(store.getSnapshot()).not.toBe(before);
  });
});

describe("persistence", () => {
  it("writes a versioned payload to AsyncStorage", async () => {
    const store = launchApp();
    await store.hydrateSavedMovies();

    store.toggleSavedMovie(movie(5, "Five"));
    await store.waitForPendingWrites();

    expect(readDisk()).toEqual({
      version: 2,
      movies: [
        {
          id: 5,
          title: "Five",
          poster_path: "/5.jpg",
          vote_average: 7.5,
          release_date: "2024-01-01",
          saved_at: expect.any(Number),
          rating: null,
          note: "",
          genre_ids: [],
        },
      ],
    });
  });

  it("survives closing and reopening the app", async () => {
    // Session 1: save two movies, remove one.
    const session1 = launchApp();
    await session1.hydrateSavedMovies();
    session1.toggleSavedMovie(movie(1, "Keep"));
    session1.toggleSavedMovie(movie(2, "Drop"));
    session1.toggleSavedMovie(movie(2, "Drop"));
    await session1.waitForPendingWrites();

    // Session 2: fresh module, same disk.
    const session2 = launchApp();
    expect(session2.getSavedMovies()).toHaveLength(0); // nothing until hydrated
    await session2.hydrateSavedMovies();

    expect(session2.getSavedMovies().map((m) => m.title)).toEqual(["Keep"]);
    expect(session2.isMovieSaved(1)).toBe(true);
    expect(session2.isMovieSaved(2)).toBe(false);
  });

  it("keeps newest-first order across a relaunch", async () => {
    const session1 = launchApp();
    await session1.hydrateSavedMovies();
    session1.toggleSavedMovie(movie(1, "Old"));
    session1.toggleSavedMovie(movie(2, "New"));
    await session1.waitForPendingWrites();

    const session2 = launchApp();
    await session2.hydrateSavedMovies();
    expect(session2.getSavedMovies().map((m) => m.title)).toEqual([
      "New",
      "Old",
    ]);
  });

  it("keeps a toggle made before hydration finished and merges it with the disk", async () => {
    // Disk already holds movie 1 from a previous session.
    const session1 = launchApp();
    await session1.hydrateSavedMovies();
    session1.toggleSavedMovie(movie(1, "From disk"));
    await session1.waitForPendingWrites();

    // Relaunch straight into a details screen: subscribe kicks off hydration,
    // and the user taps "save" before the read has completed.
    const session2 = launchApp();
    session2.subscribe(() => {});
    expect(session2.getSnapshot().hydrated).toBe(false);
    session2.toggleSavedMovie(movie(2, "Tapped early"));
    expect(session2.isMovieSaved(2)).toBe(true);

    await session2.hydrateSavedMovies();

    // Both the early toggle and the persisted movie are present...
    expect(
      session2
        .getSavedMovies()
        .map((m) => m.id)
        .sort(),
    ).toEqual([1, 2]);

    // ...and the merged list is what ends up on disk.
    await session2.waitForPendingWrites();
    expect(
      readDisk()
        .movies.map((m) => m.id)
        .sort(),
    ).toEqual([1, 2]);
  });

  it("after rapid toggles the disk matches memory", async () => {
    const store = launchApp();
    await store.hydrateSavedMovies();

    for (let i = 0; i < 20; i++) store.toggleSavedMovie(movie(100 + (i % 3)));
    const inMemory = store
      .getSavedMovies()
      .map((m) => m.id)
      .sort();

    await store.waitForPendingWrites();
    expect(
      readDisk()
        .movies.map((m) => m.id)
        .sort(),
    ).toEqual(inMemory);
  });

  it("clearSavedMovies empties memory and disk", async () => {
    const store = launchApp();
    await store.hydrateSavedMovies();
    store.toggleSavedMovie(movie(1));
    store.toggleSavedMovie(movie(2));

    store.clearSavedMovies();
    expect(store.getSavedMovies()).toEqual([]);

    await store.waitForPendingWrites();
    expect(readDisk().movies).toEqual([]);
  });
});

describe("resilience", () => {
  it.each([
    ["not JSON at all", "{{{not json"],
    ["movies is not an array", JSON.stringify({ version: 1, movies: "nope" })],
    ["a null payload", "null"],
    ["a different app's data", JSON.stringify({ foo: "bar" })],
  ])("treats %s on disk as an empty list", async (_label, raw) => {
    mockDisk.set(STORAGE_KEY, raw);
    const store = launchApp();
    await store.hydrateSavedMovies();
    expect(store.getSnapshot()).toEqual({ hydrated: true, movies: [] });
  });

  it("drops malformed entries and fills in missing optional fields", async () => {
    mockDisk.set(
      STORAGE_KEY,
      JSON.stringify({
        version: 1,
        movies: [
          { id: "x", title: "bad id" },
          null,
          { id: 9, title: "Ok" }, // no poster/vote/date/saved_at
        ],
      }),
    );
    const store = launchApp();
    await store.hydrateSavedMovies();

    expect(store.getSavedMovies()).toEqual([
      {
        id: 9,
        title: "Ok",
        poster_path: null,
        vote_average: 0,
        release_date: "",
        saved_at: 0,
        rating: null,
        note: "",
        genre_ids: [],
      },
    ]);
  });

  it("still hydrates (as empty) when AsyncStorage.getItem throws", async () => {
    AsyncStorage.getItem.mockRejectedValueOnce(new Error("disk on fire"));

    const store = launchApp();
    await store.hydrateSavedMovies();

    expect(store.getSnapshot()).toEqual({ hydrated: true, movies: [] });
    expect(warnSpy).toHaveBeenCalled();
  });

  it("keeps the in-memory state when a write fails", async () => {
    AsyncStorage.setItem.mockRejectedValueOnce(new Error("quota exceeded"));

    const store = launchApp();
    await store.hydrateSavedMovies();
    store.toggleSavedMovie(movie(1));
    await store.waitForPendingWrites();

    expect(store.isMovieSaved(1)).toBe(true);
    expect(warnSpy).toHaveBeenCalled();

    // The queue keeps working after a failure.
    store.toggleSavedMovie(movie(2));
    await store.waitForPendingWrites();
    expect(readDisk().movies.map((m) => m.id)).toEqual([2, 1]);
  });
});

describe("ratings and notes", () => {
  it("rates a saved movie, clamps to whole numbers in range, and clears with null", async () => {
    const store = launchApp();
    await store.hydrateSavedMovies();
    store.saveMovie(movie(1));

    expect(store.rateSavedMovie(1, 7.6)).toBe(true);
    expect(store.getSavedMovie(1)?.rating).toBe(8);
    expect(store.rateSavedMovie(1, 11)).toBe(true);
    expect(store.getSavedMovie(1)?.rating).toBeNull();
    store.rateSavedMovie(1, 3);
    store.rateSavedMovie(1, null);
    expect(store.getSavedMovie(1)?.rating).toBeNull();
  });

  it("ignores ratings and notes for movies that are not saved", async () => {
    const store = launchApp();
    await store.hydrateSavedMovies();
    expect(store.rateSavedMovie(99, 5)).toBe(false);
    expect(store.setSavedMovieNote(99, "x")).toBe(false);
  });

  it("trims and caps notes and persists them", async () => {
    const store = launchApp();
    await store.hydrateSavedMovies();
    store.saveMovie(movie(1));
    store.setSavedMovieNote(1, "  great  ");
    expect(store.getSavedMovie(1)?.note).toBe("great");
    store.setSavedMovieNote(1, "x".repeat(600));
    expect(store.getSavedMovie(1)?.note).toHaveLength(store.MAX_NOTE_LENGTH);

    await store.waitForPendingWrites();
    expect(readDisk().version).toBe(2);
    expect(readDisk().movies[0].note).toHaveLength(store.MAX_NOTE_LENGTH);
  });

  it("keeps genre ids from the input", async () => {
    const store = launchApp();
    await store.hydrateSavedMovies();
    store.saveMovie({ ...movie(1), genre_ids: [28, 12] });
    expect(store.getSavedMovie(1)?.genre_ids).toEqual([28, 12]);
  });

  it("loads a version 1 payload with defaults for the new fields", async () => {
    mockDisk.set(
      STORAGE_KEY,
      JSON.stringify({
        version: 1,
        movies: [{ id: 1, title: "Old", poster_path: null, saved_at: 5 }],
      }),
    );
    const store = launchApp();
    await store.hydrateSavedMovies();
    expect(store.getSavedMovie(1)).toEqual({
      id: 1,
      title: "Old",
      poster_path: null,
      vote_average: 0,
      release_date: "",
      saved_at: 5,
      rating: null,
      note: "",
      genre_ids: [],
    });
  });
});

describe("importing", () => {
  const entry = (id: number, saved_at: number, rating: number | null = null): SavedMovie => ({
    ...movie(id),
    saved_at,
    rating,
    note: "",
    genre_ids: [],
  });

  it("merge keeps existing entries and lets imported ones win on conflict", async () => {
    const store = launchApp();
    await store.hydrateSavedMovies();
    store.saveMovie(movie(1));
    store.rateSavedMovie(1, 4);

    const count = store.importSavedMovies([entry(1, 1, 9), entry(2, 2)], "merge");
    expect(count).toBe(2);
    expect(store.getSavedMovie(1)?.rating).toBe(9);
    expect(store.getSavedMovies().map((m) => m.id)).toEqual([2, 1]);
  });

  it("replace drops what was there and cleans the input", async () => {
    const store = launchApp();
    await store.hydrateSavedMovies();
    store.saveMovie(movie(1));

    const count = store.importSavedMovies(
      [entry(5, 10, 99), { id: 6 } as SavedMovie, "junk" as unknown as SavedMovie],
      "replace",
    );
    expect(count).toBe(1);
    expect(store.getSavedMovie(5)?.rating).toBeNull();
    expect(store.isMovieSaved(1)).toBe(false);
  });
});

describe("viewSavedMovies", () => {
  const store = launchApp();
  const base = (id: number, title: string, saved_at: number, extra: Partial<SavedMovie> = {}) =>
    ({ ...movie(id, title), saved_at, rating: null, note: "", genre_ids: [], ...extra }) as SavedMovie;
  const list = [
    base(1, "Zed", 10, { rating: 6, release_date: "2001-01-01" }),
    base(2, "Alpha", 20, { note: "fun", release_date: "2020-01-01" }),
    base(3, "Mid", 30, { rating: 9, release_date: "2010-01-01" }),
  ];

  it("sorts by date saved, title, rating and release", () => {
    expect(store.viewSavedMovies(list, "saved").map((m) => m.id)).toEqual([3, 2, 1]);
    expect(store.viewSavedMovies(list, "title").map((m) => m.id)).toEqual([2, 3, 1]);
    expect(store.viewSavedMovies(list, "rating").map((m) => m.id)).toEqual([3, 1, 2]);
    expect(store.viewSavedMovies(list, "release").map((m) => m.id)).toEqual([2, 3, 1]);
  });

  it("filters rated, unrated and noted", () => {
    expect(store.viewSavedMovies(list, "saved", "rated").map((m) => m.id)).toEqual([3, 1]);
    expect(store.viewSavedMovies(list, "saved", "unrated").map((m) => m.id)).toEqual([2]);
    expect(store.viewSavedMovies(list, "saved", "noted").map((m) => m.id)).toEqual([2]);
  });

  it("does not mutate the input", () => {
    const copy = [...list];
    store.viewSavedMovies(list, "title");
    expect(list).toEqual(copy);
  });
});
