/**
 * MARS LANTERN — Safe Fetch Strategy
 * 
 * Multi-tier resilient data fetch:
 * 1. Live network request (if online, with strict timeout)
 * 2. Cached response from local storage
 * 3. Committed static fixture file
 * 
 * Pure TypeScript with environment abstraction for Web and MCP server stdio.
 * Reference: MARS_LANTERN_SPEC.md §7.4
 */

export type Origin = 'live' | 'cache' | 'fixture';

export interface SafeFetchOptions {
  fixturePath?: string;
  timeoutMs?: number;
  offline?: boolean;
  storage?: {
    getItem(key: string): string | null;
    setItem(key: string, value: string): void;
  };
  fetchFn?: typeof fetch;
}

// In-memory fallback cache for Node/MCP environments where localStorage is absent
const inMemoryCache = new Map<string, string>();

function getStorage(customStorage?: SafeFetchOptions['storage']) {
  if (customStorage) return customStorage;
  if (typeof window !== 'undefined' && window.localStorage) {
    return window.localStorage;
  }
  return {
    getItem: (key: string) => inMemoryCache.get(key) ?? null,
    setItem: (key: string, value: string) => inMemoryCache.set(key, value)
  };
}

function isOfflineMode(offlineOpt?: boolean): boolean {
  if (offlineOpt !== undefined) return offlineOpt;
  if (typeof window !== 'undefined' && window.location?.search) {
    try {
      return new URLSearchParams(window.location.search).get('offline') === '1';
    } catch {
      return false;
    }
  }
  return false;
}

/**
 * Resilient JSON fetch with Live -> Cache -> Fixture fallback.
 */
export async function fetchJson<T>(
  url: string,
  options: SafeFetchOptions = {}
): Promise<{ data: T; origin: Origin }> {
  const { fixturePath, timeoutMs = 15000, offline, storage: customStorage, fetchFn } = options;
  const storage = getStorage(customStorage);
  const cacheKey = `ml:${url}`;
  const effectiveFetch = fetchFn ?? (typeof fetch !== 'undefined' ? fetch : undefined);
  const offlineMode = isOfflineMode(offline);

  // 1. Try Live Network (if not in offline mode and fetch is available)
  if (!offlineMode && effectiveFetch) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);

      const response = await effectiveFetch(url, { signal: controller.signal });
      clearTimeout(timer);

      if (response.ok) {
        const data = (await response.json()) as T;
        try {
          storage.setItem(
            cacheKey,
            JSON.stringify({ t: Date.now(), data })
          );
        } catch {
          // Ignore storage quota errors
        }
        return { data, origin: 'live' };
      }
    } catch {
      // Fall through to cache/fixture
    }
  }

  // 2. Try Cache
  try {
    const cachedStr = storage.getItem(cacheKey);
    if (cachedStr) {
      const parsed = JSON.parse(cachedStr);
      if (parsed && 'data' in parsed) {
        return { data: parsed.data as T, origin: 'cache' };
      }
    }
  } catch {
    // Corrupt cache, continue to fixture
  }

  // 3. Try Static Fixture
  if (fixturePath && effectiveFetch) {
    try {
      const baseUrl =
        typeof import.meta !== 'undefined' && import.meta.env?.BASE_URL
          ? import.meta.env.BASE_URL
          : './';
      const cleanBase = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
      const cleanPath = fixturePath.startsWith('/') ? fixturePath.slice(1) : fixturePath;
      const fullFixtureUrl = `${cleanBase}${cleanPath}`;

      const fixtureRes = await effectiveFetch(fullFixtureUrl);
      if (fixtureRes.ok) {
        const data = (await fixtureRes.json()) as T;
        return { data, origin: 'fixture' };
      }
    } catch {
      // Fixture request failed
    }
  }

  throw new Error(`Failed to retrieve data for '${url}' via live, cache, or fixture fallback.`);
}
