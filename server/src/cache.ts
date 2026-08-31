// In-memory server-side caching module for high-frequency queries
// (e.g. feed/reels data, active live streams). Designed with an explicit
// interface so it can be swapped to Redis transparently if needed.

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

const cacheStore = new Map<string, CacheEntry<unknown>>();

/**
 * Retrieves a cached value if present and unexpired.
 */
export function getCached<T>(key: string): T | null {
  const entry = cacheStore.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cacheStore.delete(key);
    return null;
  }
  return entry.value as T;
}

/**
 * Caches a key-value pair with a TTL (Time-To-Live) specified in seconds.
 */
export function setCache<T>(key: string, value: T, ttlSeconds: number): void {
  const expiresAt = Date.now() + ttlSeconds * 1000;
  cacheStore.set(key, { value, expiresAt });
}

/**
 * Clears a specific key or invalidates all keys matching a prefix/pattern.
 */
export function clearCache(keyOrPrefix?: string): void {
  if (!keyOrPrefix) {
    cacheStore.clear();
    return;
  }
  for (const key of cacheStore.keys()) {
    if (key === keyOrPrefix || key.startsWith(keyOrPrefix)) {
      cacheStore.delete(key);
    }
  }
}
