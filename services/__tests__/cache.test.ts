type Cache = typeof import("../cache");

const PREFIX = "@moviear/cache/";

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
    removeItem: jest.fn(async (key: string) => {
      await mockTick();
      mockDisk.delete(key);
    }),
    getAllKeys: jest.fn(async () => {
      await mockTick();
      return [...mockDisk.keys()];
    }),
    multiRemove: jest.fn(async (keys: string[]) => {
      await mockTick();
      keys.forEach((k) => mockDisk.delete(k));
    }),
  },
}));

const AsyncStorage = jest.requireMock<{
  default: { getItem: jest.Mock; setItem: jest.Mock };
}>("@react-native-async-storage/async-storage").default;

/** A fresh module instance, so the in-memory layer starts empty. */
function freshCache(): Cache {
  let mod: Cache | undefined;
  jest.isolateModules(() => {
    mod = jest.requireActual<Cache>("../cache");
  });
  if (!mod) throw new Error("failed to load cache");
  return mod;
}

let clock = 1_000_000;
const now = () => clock;

let warnSpy: jest.SpyInstance;

beforeEach(() => {
  mockDisk.clear();
  clock = 1_000_000;
  warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
});

afterEach(() => {
  warnSpy.mockRestore();
});

describe("read and write", () => {
  it("round trips a value through disk", async () => {
    const a = freshCache();
    await a.writeCache("k", { hello: "world" }, now);
    expect(mockDisk.has(`${PREFIX}k`)).toBe(true);

    const b = freshCache(); // no memory; must come from disk
    await expect(b.readCache("k")).resolves.toEqual({
      value: { hello: "world" },
      storedAt: 1_000_000,
    });
  });

  it("serves repeat reads from memory without touching disk", async () => {
    const cache = freshCache();
    await cache.writeCache("k", 1, now);
    AsyncStorage.getItem.mockClear();

    await cache.readCache("k");
    await cache.readCache("k");
    expect(AsyncStorage.getItem).not.toHaveBeenCalled();
  });

  it("returns null for unknown keys and for malformed entries", async () => {
    mockDisk.set(`${PREFIX}bad`, "{nope");
    mockDisk.set(`${PREFIX}shape`, JSON.stringify({ value: 1 }));
    const cache = freshCache();
    await expect(cache.readCache("missing")).resolves.toBeNull();
    await expect(cache.readCache("bad")).resolves.toBeNull();
    await expect(cache.readCache("shape")).resolves.toBeNull();
  });

  it("keeps the memory copy when the disk write fails", async () => {
    AsyncStorage.setItem.mockRejectedValueOnce(new Error("full"));
    const cache = freshCache();
    await cache.writeCache("k", "v", now);
    await expect(cache.readCache("k")).resolves.toMatchObject({ value: "v" });
    expect(warnSpy).toHaveBeenCalled();
  });
});

describe("cachedFetch", () => {
  it("calls the fetcher on a miss and stores the result", async () => {
    const cache = freshCache();
    const fetcher = jest.fn(async () => "fresh");

    const result = await cache.cachedFetch("k", 1000, fetcher, { now });
    expect(result).toEqual({ data: "fresh", source: "network" });
    expect(fetcher).toHaveBeenCalledTimes(1);
    await expect(cache.readCache("k")).resolves.toMatchObject({ value: "fresh" });
  });

  it("serves a fresh entry without calling the fetcher", async () => {
    const cache = freshCache();
    await cache.writeCache("k", "cached", now);
    const fetcher = jest.fn(async () => "fresh");

    clock += 500;
    const result = await cache.cachedFetch("k", 1000, fetcher, { now });
    expect(result).toEqual({ data: "cached", source: "cache" });
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("refetches once the entry is older than the ttl", async () => {
    const cache = freshCache();
    await cache.writeCache("k", "old", now);
    const fetcher = jest.fn(async () => "new");

    clock += 1000;
    const result = await cache.cachedFetch("k", 1000, fetcher, { now });
    expect(result).toEqual({ data: "new", source: "network" });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("falls back to a stale entry when the network fails", async () => {
    const cache = freshCache();
    await cache.writeCache("k", "old", now);
    const fetcher = jest.fn(async () => {
      throw new Error("offline");
    });

    clock += 5000;
    const result = await cache.cachedFetch("k", 1000, fetcher, { now });
    expect(result).toEqual({ data: "old", source: "stale" });
  });

  it("rethrows when the network fails and nothing is cached", async () => {
    const cache = freshCache();
    const fetcher = jest.fn(async () => {
      throw new Error("offline");
    });
    await expect(cache.cachedFetch("k", 1000, fetcher, { now })).rejects.toThrow(
      "offline",
    );
  });

  it("force skips a fresh entry but still falls back to it on failure", async () => {
    const cache = freshCache();
    await cache.writeCache("k", "cached", now);

    const ok = jest.fn(async () => "refreshed");
    await expect(
      cache.cachedFetch("k", 1000, ok, { now, force: true }),
    ).resolves.toEqual({ data: "refreshed", source: "network" });

    const bad = jest.fn(async () => {
      throw new Error("offline");
    });
    await expect(
      cache.cachedFetch("k", 1000, bad, { now, force: true }),
    ).resolves.toEqual({ data: "refreshed", source: "stale" });
  });
});

describe("clearing", () => {
  it("removes only cache keys and reports the count", async () => {
    mockDisk.set("@moviear/settings", "{}");
    const cache = freshCache();
    await cache.writeCache("a", 1, now);
    await cache.writeCache("b", 2, now);

    await expect(cache.cacheEntryCount()).resolves.toBe(2);
    await expect(cache.clearCache()).resolves.toBe(2);
    await expect(cache.cacheEntryCount()).resolves.toBe(0);
    expect(mockDisk.has("@moviear/settings")).toBe(true);
    await expect(cache.readCache("a")).resolves.toBeNull();
  });

  it("evicts a single key from both layers", async () => {
    const cache = freshCache();
    await cache.writeCache("a", 1, now);
    await cache.evict("a");
    expect(mockDisk.has(`${PREFIX}a`)).toBe(false);
    await expect(cache.readCache("a")).resolves.toBeNull();
  });
});

describe("isFresh", () => {
  it("is exclusive at the boundary", () => {
    const cache = freshCache();
    const entry = { value: 0, storedAt: 100 };
    expect(cache.isFresh(entry, 50, 149)).toBe(true);
    expect(cache.isFresh(entry, 50, 150)).toBe(false);
  });
});
