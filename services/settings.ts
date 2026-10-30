/**
 * User settings.
 *
 * Same shape as the watchlist store: a module level snapshot read through
 * useSyncExternalStore (hooks/useSettings.ts), written through to
 * AsyncStorage. `getSettings()` is synchronous so the API client can read
 * region and language without waiting.
 */

import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY = "@moviear/settings";
const STORAGE_VERSION = 1;

export type TrendingWindow = "day" | "week";

export interface Settings {
  /** Trending row on Home: today or this week. */
  trendingWindow: TrendingWindow;
  /** ISO 3166-1 country code; affects now playing and upcoming lists. */
  region: string;
  /** TMDB language tag; affects titles, overviews and poster text. */
  language: string;
  /** Record opened movies in the history list. */
  trackHistory: boolean;
  /** Request smaller images to save mobile data. */
  dataSaver: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  trendingWindow: "day",
  region: "US",
  language: "en-US",
  trackHistory: true,
  dataSaver: false,
};

export const REGIONS: readonly { code: string; name: string }[] = [
  { code: "US", name: "United States" },
  { code: "GB", name: "United Kingdom" },
  { code: "NG", name: "Nigeria" },
  { code: "CA", name: "Canada" },
  { code: "AU", name: "Australia" },
  { code: "IN", name: "India" },
  { code: "FR", name: "France" },
  { code: "DE", name: "Germany" },
  { code: "BR", name: "Brazil" },
  { code: "JP", name: "Japan" },
];

export const LANGUAGES: readonly { code: string; name: string }[] = [
  { code: "en-US", name: "English" },
  { code: "fr-FR", name: "French" },
  { code: "de-DE", name: "German" },
  { code: "es-ES", name: "Spanish" },
  { code: "pt-BR", name: "Portuguese" },
  { code: "ja-JP", name: "Japanese" },
];

interface PersistedShape {
  version: number;
  settings: Partial<Settings>;
}

export interface SettingsSnapshot {
  hydrated: boolean;
  settings: Settings;
}

let snapshot: SettingsSnapshot = { hydrated: false, settings: DEFAULT_SETTINGS };
const listeners = new Set<() => void>();
let hydration: Promise<void> | null = null;
let writeQueue: Promise<void> = Promise.resolve();
/** Keys changed before hydration finished; they beat whatever is on disk. */
const touchedBeforeHydration = new Set<keyof Settings>();

function emit(next: SettingsSnapshot) {
  snapshot = next;
  listeners.forEach((listener) => listener());
}

const isRegion = (v: unknown) => REGIONS.some((r) => r.code === v);
const isLanguage = (v: unknown) => LANGUAGES.some((l) => l.code === v);

/**
 * Keep only recognised values. Anything unknown (an older build's option,
 * a hand edited file) falls back to the default for that key.
 */
export function sanitizeSettings(input: unknown): Settings {
  const v = (typeof input === "object" && input !== null ? input : {}) as Record<
    string,
    unknown
  >;
  return {
    trendingWindow:
      v.trendingWindow === "day" || v.trendingWindow === "week"
        ? v.trendingWindow
        : DEFAULT_SETTINGS.trendingWindow,
    region: isRegion(v.region) ? (v.region as string) : DEFAULT_SETTINGS.region,
    language: isLanguage(v.language)
      ? (v.language as string)
      : DEFAULT_SETTINGS.language,
    trackHistory:
      typeof v.trackHistory === "boolean"
        ? v.trackHistory
        : DEFAULT_SETTINGS.trackHistory,
    dataSaver:
      typeof v.dataSaver === "boolean" ? v.dataSaver : DEFAULT_SETTINGS.dataSaver,
  };
}

function parsePersisted(raw: string | null): Partial<Settings> {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as Partial<PersistedShape> | null;
    if (!parsed || typeof parsed.settings !== "object" || !parsed.settings) {
      return {};
    }
    return parsed.settings;
  } catch {
    return {};
  }
}

function persist(settings: Settings) {
  const payload: PersistedShape = { version: STORAGE_VERSION, settings };
  writeQueue = writeQueue
    .then(() => AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(payload)))
    .catch((err) => {
      console.warn("[settings] failed to persist settings", err);
    });
  return writeQueue;
}

export function waitForPendingWrites(): Promise<void> {
  return writeQueue;
}

export function hydrateSettings(): Promise<void> {
  if (hydration) return hydration;

  hydration = (async () => {
    let stored: Partial<Settings> = {};
    try {
      stored = parsePersisted(await AsyncStorage.getItem(STORAGE_KEY));
    } catch (err) {
      console.warn("[settings] failed to read settings", err);
    }

    const merged: Record<string, unknown> = { ...stored };
    for (const key of touchedBeforeHydration) merged[key] = snapshot.settings[key];
    touchedBeforeHydration.clear();

    emit({ hydrated: true, settings: sanitizeSettings(merged) });
  })();

  return hydration;
}

// ---- useSyncExternalStore contract -------------------------------------

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  void hydrateSettings();
  return () => {
    listeners.delete(listener);
  };
}

export function getSnapshot(): SettingsSnapshot {
  return snapshot;
}

// ---- queries / mutations -----------------------------------------------

/** Current settings, synchronously. Defaults until hydration completes. */
export function getSettings(): Settings {
  return snapshot.settings;
}

export function updateSettings(patch: Partial<Settings>): Settings {
  const next = sanitizeSettings({ ...snapshot.settings, ...patch });
  if (!snapshot.hydrated) {
    for (const key of Object.keys(patch) as (keyof Settings)[]) {
      touchedBeforeHydration.add(key);
    }
  }
  emit({ ...snapshot, settings: next });
  void persist(next);
  return next;
}

export function resetSettings(): Settings {
  return updateSettings(DEFAULT_SETTINGS);
}
