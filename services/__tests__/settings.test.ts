/**
 * Like the watchlist tests, "relaunching the app" means loading a fresh copy
 * of the module against the same fake disk.
 */

type Store = typeof import("../settings");

const STORAGE_KEY = "@moviear/settings";

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
    store = jest.requireActual<Store>("../settings");
  });
  if (!store) throw new Error("failed to load store");
  launched.push(store);
  return store;
}

function readDisk() {
  const raw = mockDisk.get(STORAGE_KEY);
  if (raw === undefined) throw new Error("nothing on disk");
  return JSON.parse(raw) as { version: number; settings: Record<string, unknown> };
}

let warnSpy: jest.SpyInstance;

beforeEach(() => {
  launched = [];
  mockDisk.clear();
  warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
});

afterEach(async () => {
  for (const store of launched) {
    await store.hydrateSettings();
    await store.waitForPendingWrites();
  }
  warnSpy.mockRestore();
});

describe("defaults and hydration", () => {
  it("starts with defaults before hydration", () => {
    const store = launchApp();
    expect(store.getSnapshot()).toEqual({
      hydrated: false,
      settings: store.DEFAULT_SETTINGS,
    });
    expect(store.getSettings()).toEqual(store.DEFAULT_SETTINGS);
  });

  it("hydrates from an empty disk to defaults", async () => {
    const store = launchApp();
    await store.hydrateSettings();
    expect(store.getSnapshot()).toEqual({
      hydrated: true,
      settings: store.DEFAULT_SETTINGS,
    });
  });

  it("subscribing triggers hydration once and notifies", async () => {
    const store = launchApp();
    const listener = jest.fn();
    store.subscribe(listener);
    store.subscribe(() => {});
    await store.hydrateSettings();
    expect(listener).toHaveBeenCalled();
    expect(AsyncStorage.getItem).toHaveBeenCalledTimes(1);
  });
});

describe("updating", () => {
  it("applies a patch, notifies and persists", async () => {
    const store = launchApp();
    await store.hydrateSettings();
    const listener = jest.fn();
    store.subscribe(listener);

    store.updateSettings({ trendingWindow: "week", region: "GB" });
    expect(store.getSettings()).toMatchObject({
      trendingWindow: "week",
      region: "GB",
      language: "en-US",
    });
    expect(listener).toHaveBeenCalledTimes(1);

    await store.waitForPendingWrites();
    expect(readDisk().settings).toMatchObject({ trendingWindow: "week", region: "GB" });
    expect(readDisk().version).toBe(1);
  });

  it("survives a relaunch", async () => {
    const first = launchApp();
    await first.hydrateSettings();
    first.updateSettings({ language: "fr-FR", trackHistory: false });
    await first.waitForPendingWrites();

    const second = launchApp();
    await second.hydrateSettings();
    expect(second.getSettings()).toMatchObject({
      language: "fr-FR",
      trackHistory: false,
    });
  });

  it("ignores values it does not recognise", async () => {
    const store = launchApp();
    await store.hydrateSettings();
    store.updateSettings({
      region: "ZZ",
      trendingWindow: "month" as unknown as "day",
    });
    expect(store.getSettings().region).toBe("US");
    expect(store.getSettings().trendingWindow).toBe("day");
  });

  it("resets to defaults", async () => {
    const store = launchApp();
    await store.hydrateSettings();
    store.updateSettings({ region: "JP", trendingWindow: "week" });
    store.resetSettings();
    expect(store.getSettings()).toEqual(store.DEFAULT_SETTINGS);
  });

  it("a change made before hydration beats the stored value", async () => {
    const seed = launchApp();
    await seed.hydrateSettings();
    seed.updateSettings({ region: "GB", language: "de-DE" });
    await seed.waitForPendingWrites();

    const store = launchApp();
    store.updateSettings({ region: "NG" }); // before the disk read lands
    await store.hydrateSettings();

    expect(store.getSettings().region).toBe("NG");
    expect(store.getSettings().language).toBe("de-DE");
  });
});

describe("corrupt storage", () => {
  it("falls back to defaults when the stored JSON is garbage", async () => {
    mockDisk.set(STORAGE_KEY, "{not json");
    const store = launchApp();
    await store.hydrateSettings();
    expect(store.getSettings()).toEqual(store.DEFAULT_SETTINGS);
  });

  it("keeps only valid keys from a partially bad payload", async () => {
    mockDisk.set(
      STORAGE_KEY,
      JSON.stringify({
        version: 1,
        settings: { region: "FR", language: 42, trackHistory: "yes" },
      }),
    );
    const store = launchApp();
    await store.hydrateSettings();
    expect(store.getSettings()).toEqual({
      ...store.DEFAULT_SETTINGS,
      region: "FR",
    });
  });

  it("logs and keeps defaults when the read throws", async () => {
    AsyncStorage.getItem.mockRejectedValueOnce(new Error("disk on fire"));
    const store = launchApp();
    await store.hydrateSettings();
    expect(store.getSnapshot().hydrated).toBe(true);
    expect(store.getSettings()).toEqual(store.DEFAULT_SETTINGS);
    expect(warnSpy).toHaveBeenCalled();
  });
});

describe("sanitizeSettings", () => {
  it("accepts a full valid object unchanged", () => {
    const store = launchApp();
    const valid = {
      trendingWindow: "week",
      region: "IN",
      language: "ja-JP",
      trackHistory: false,
    };
    expect(store.sanitizeSettings(valid)).toEqual(valid);
  });

  it("treats non objects as empty", () => {
    const store = launchApp();
    expect(store.sanitizeSettings(null)).toEqual(store.DEFAULT_SETTINGS);
    expect(store.sanitizeSettings("x")).toEqual(store.DEFAULT_SETTINGS);
  });
});
