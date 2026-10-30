/**
 * Response cache for TMDB requests.
 *
 * Two layers: a Map for the lifetime of the process and AsyncStorage so a
 * relaunch (or a flight with no signal) still has something to show. Each
 * entry carries the time it was stored; callers pass a time to live.
 *
 * The policy in `cachedFetch` is deliberately simple:
 *   1. a fresh entry is returned without touching the network
 *   2. otherwise the network is tried and the result stored
 *   3. if the network fails and a stale entry exists, the stale entry wins
 */

import AsyncStorage from "@react-native-async-storage/async-storage";

const PREFIX = "@moviear/cache/";

export interface CacheEntry<T> {
  value: T;
  /** Unix ms when the value was stored. */
  storedAt: number;
}

export interface CachedFetchOptions {
  /** Injectable clock, for tests. */
  now?: () => number;
  /** Skip the fresh check and always hit the network (pull to refresh). */
  force?: boolean;
}

export interface CachedResult<T> {
  data: T;
  /** Where the data came from. "stale" means the network failed. */
  source: "network" | "cache" | "stale";
}

const memory = new Map<string, CacheEntry<unknown>>();

function storageKey(key: string) {
  return `${PREFIX}${key}`;
}

function isEntry(value: unknown): value is CacheEntry<unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    "value" in value &&
    typeof (value as CacheEntry<unknown>).storedAt === "number"
  );
}

/** Read an entry from memory, falling back to disk. Never throws. */
export async function readCache<T>(key: string): Promise<CacheEntry<T> | null> {
  const inMemory = memory.get(key);
  if (inMemory) return inMemory as CacheEntry<T>;

  try {
    const raw = await AsyncStorage.getItem(storageKey(key));
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!isEntry(parsed)) return null;
    memory.set(key, parsed);
    return parsed as CacheEntry<T>;
  } catch {
    return null;
  }
}

/** Store an entry in memory and on disk. Disk failures are logged, not thrown. */
export async function writeCache<T>(
  key: string,
  value: T,
  now: () => number = Date.now,
): Promise<void> {
  const entry: CacheEntry<T> = { value, storedAt: now() };
  memory.set(key, entry);
  try {
    await AsyncStorage.setItem(storageKey(key), JSON.stringify(entry));
  } catch (err) {
    console.warn("[cache] failed to write", key, err);
  }
}

export function isFresh(entry: CacheEntry<unknown>, ttlMs: number, now: number) {
  return now - entry.storedAt < ttlMs;
}

/**
 * Serve `key` from the cache when it is younger than `ttlMs`, otherwise call
 * `fetcher`. See the module comment for the fallback rules.
 */
export async function cachedFetch<T>(
  key: string,
  ttlMs: number,
  fetcher: () => Promise<T>,
  { now = Date.now, force = false }: CachedFetchOptions = {},
): Promise<CachedResult<T>> {
  const cached = await readCache<T>(key);

  if (cached && !force && isFresh(cached, ttlMs, now())) {
    return { data: cached.value, source: "cache" };
  }

  try {
    const data = await fetcher();
    await writeCache(key, data, now);
    return { data, source: "network" };
  } catch (err) {
    if (cached) return { data: cached.value, source: "stale" };
    throw err;
  }
}

/** Remove every cache entry. Returns how many were on disk. */
export async function clearCache(): Promise<number> {
  memory.clear();
  try {
    const keys = (await AsyncStorage.getAllKeys()).filter((k) =>
      k.startsWith(PREFIX),
    );
    if (keys.length > 0) await AsyncStorage.multiRemove(keys);
    return keys.length;
  } catch (err) {
    console.warn("[cache] failed to clear", err);
    return 0;
  }
}

/** Number of entries on disk, for the settings screen. */
export async function cacheEntryCount(): Promise<number> {
  try {
    const keys = await AsyncStorage.getAllKeys();
    return keys.filter((k) => k.startsWith(PREFIX)).length;
  } catch {
    return 0;
  }
}

/** Drop a single key from both layers (used after a failed parse). */
export async function evict(key: string): Promise<void> {
  memory.delete(key);
  try {
    await AsyncStorage.removeItem(storageKey(key));
  } catch {
    // nothing useful to do
  }
}

export const MINUTE = 60_000;
export const HOUR = 60 * MINUTE;
export const DAY = 24 * HOUR;
