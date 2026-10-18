import { describe, it, expect, vi } from 'vitest';
import { fetchJson } from '../src/core/safeFetch';

describe('Safe Fetch Utility (src/core/safeFetch.ts)', () => {
  it('fetches live data and writes to storage on success', async () => {
    const mockStorage = new Map<string, string>();
    const storage = {
      getItem: (k: string) => mockStorage.get(k) ?? null,
      setItem: (k: string, v: string) => mockStorage.set(k, v)
    };

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ status: 'success', data: 'mars' })
    });

    const res = await fetchJson('https://api.nasa.gov/mars-data', {
      fetchFn: mockFetch as any,
      storage
    });

    expect(res.origin).toBe('live');
    expect(res.data).toEqual({ status: 'success', data: 'mars' });
    expect(mockStorage.has('ml:https://api.nasa.gov/mars-data')).toBe(true);
  });

  it('falls back to cache when live fetch fails', async () => {
    const mockStorage = new Map<string, string>();
    mockStorage.set(
      'ml:https://api.nasa.gov/mars-data',
      JSON.stringify({ t: Date.now(), data: { cached: true } })
    );

    const storage = {
      getItem: (k: string) => mockStorage.get(k) ?? null,
      setItem: (k: string, v: string) => mockStorage.set(k, v)
    };

    const failingFetch = vi.fn().mockRejectedValue(new Error('Network error'));

    const res = await fetchJson('https://api.nasa.gov/mars-data', {
      fetchFn: failingFetch as any,
      storage
    });

    expect(res.origin).toBe('cache');
    expect(res.data).toEqual({ cached: true });
  });

  it('falls back to static fixture when live and cache fail', async () => {
    const emptyStorage = {
      getItem: () => null,
      setItem: () => {}
    };

    const mockFetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes('data/fixture.json')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ fromFixture: true })
        });
      }
      return Promise.reject(new Error('Network down'));
    });

    const res = await fetchJson('https://api.nasa.gov/missing', {
      fixturePath: 'data/fixture.json',
      fetchFn: mockFetch as any,
      storage: emptyStorage
    });

    expect(res.origin).toBe('fixture');
    expect(res.data).toEqual({ fromFixture: true });
  });

  it('immediately skips live network in offline mode', async () => {
    const mockStorage = new Map<string, string>();
    mockStorage.set(
      'ml:https://api.nasa.gov/mars-offline',
      JSON.stringify({ t: Date.now(), data: { offlineResult: true } })
    );

    const storage = {
      getItem: (k: string) => mockStorage.get(k) ?? null,
      setItem: (k: string, v: string) => mockStorage.set(k, v)
    };

    const liveFetch = vi.fn();

    const res = await fetchJson('https://api.nasa.gov/mars-offline', {
      offline: true,
      fetchFn: liveFetch as any,
      storage
    });

    expect(liveFetch).not.toHaveBeenCalled();
    expect(res.origin).toBe('cache');
    expect(res.data).toEqual({ offlineResult: true });
  });
});
