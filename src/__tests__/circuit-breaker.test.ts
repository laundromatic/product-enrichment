import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the stats module for hashUrl
vi.mock('../stats.js', () => ({
  hashUrl: (url: string) => {
    // Simple hash for testing
    let hash = 0;
    for (let i = 0; i < url.length; i++) {
      hash = ((hash << 5) - hash) + url.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash).toString(36);
  },
}));

import {
  CB_KEYS,
  recordSuccess,
  recordFailure,
  quarantineUrl,
  isQuarantined,
  getQuarantinedUrls,
  getQuarantineCount,
  unquarantineUrl,
  filterQuarantined,
} from '../circuit-breaker.js';
import { hashUrl } from '../stats.js';

// Create a mock Redis that tracks state
function createMockRedis() {
  const store = new Map<string, unknown>();
  const sets = new Map<string, Set<string>>();

  return {
    get: vi.fn(async (key: string) => store.get(key) ?? null),
    set: vi.fn(async (key: string, value: unknown) => { store.set(key, value); }),
    del: vi.fn(async (key: string) => { store.delete(key); }),
    incr: vi.fn(async (key: string) => {
      const current = (store.get(key) as number) ?? 0;
      store.set(key, current + 1);
      return current + 1;
    }),
    expire: vi.fn(async () => {}),
    sadd: vi.fn(async (key: string, member: string) => {
      if (!sets.has(key)) sets.set(key, new Set());
      sets.get(key)!.add(member);
    }),
    srem: vi.fn(async (key: string, member: string) => {
      sets.get(key)?.delete(member);
    }),
    sismember: vi.fn(async (key: string, member: string) => {
      return sets.get(key)?.has(member) ? 1 : 0;
    }),
    smembers: vi.fn(async (key: string) => {
      return Array.from(sets.get(key) ?? []);
    }),
    scard: vi.fn(async (key: string) => {
      return sets.get(key)?.size ?? 0;
    }),
    // Expose internals for assertions
    _store: store,
    _sets: sets,
  } as unknown as import('@upstash/redis').Redis & { _store: Map<string, unknown>; _sets: Map<string, Set<string>> };
}

describe('circuit-breaker', () => {
  let redis: ReturnType<typeof createMockRedis>;

  beforeEach(() => {
    redis = createMockRedis();
  });

  describe('CB_KEYS', () => {
    it('generates correct failure count key', () => {
      const hash = hashUrl('https://example.com');
      expect(CB_KEYS.failureCount(hash)).toBe(`failures:${hash}`);
    });

    it('generates correct quarantine key', () => {
      const hash = hashUrl('https://example.com');
      expect(CB_KEYS.quarantine(hash)).toBe(`quarantine:${hash}`);
    });

    it('has correct quarantine index key', () => {
      expect(CB_KEYS.quarantineIndex).toBe('quarantine:index');
    });
  });

  describe('recordSuccess', () => {
    it('deletes the failure counter for the URL', async () => {
      await recordSuccess(redis, 'https://example.com/product');
      expect(redis.del).toHaveBeenCalledWith(
        CB_KEYS.failureCount(hashUrl('https://example.com/product'))
      );
    });
  });

  describe('recordFailure', () => {
    it('increments failure counter on first failure', async () => {
      const wasQuarantined = await recordFailure(redis, 'https://example.com/product', 'HTTP 404');
      expect(wasQuarantined).toBe(false);
      expect(redis.incr).toHaveBeenCalled();
    });

    it('quarantines URL after 3 consecutive failures', async () => {
      const url = 'https://example.com/bad-product';

      // Fail 3 times
      await recordFailure(redis, url, 'error 1');
      await recordFailure(redis, url, 'error 2');
      const wasQuarantined = await recordFailure(redis, url, 'error 3');

      expect(wasQuarantined).toBe(true);
    });

    it('does not quarantine before reaching threshold', async () => {
      const url = 'https://example.com/flaky';

      const result1 = await recordFailure(redis, url, 'error 1');
      const result2 = await recordFailure(redis, url, 'error 2');

      expect(result1).toBe(false);
      expect(result2).toBe(false);
    });
  });

  describe('quarantineUrl', () => {
    it('stores quarantine entry and adds to index', async () => {
      await quarantineUrl(redis, 'https://example.com/dead', 'Page removed');

      const hash = hashUrl('https://example.com/dead');
      expect(redis.set).toHaveBeenCalledWith(
        CB_KEYS.quarantine(hash),
        expect.objectContaining({
          url: 'https://example.com/dead',
          reason: 'Page removed',
        })
      );
      expect(redis.sadd).toHaveBeenCalledWith(CB_KEYS.quarantineIndex, hash);
    });
  });

  describe('isQuarantined', () => {
    it('returns false for non-quarantined URL', async () => {
      const result = await isQuarantined(redis, 'https://example.com/good');
      expect(result).toBe(false);
    });

    it('returns true for quarantined URL', async () => {
      await quarantineUrl(redis, 'https://example.com/bad', 'test');
      const result = await isQuarantined(redis, 'https://example.com/bad');
      expect(result).toBe(true);
    });
  });

  describe('getQuarantinedUrls', () => {
    it('returns empty array when no URLs quarantined', async () => {
      const result = await getQuarantinedUrls(redis);
      expect(result).toEqual([]);
    });

    it('returns quarantined entries', async () => {
      await quarantineUrl(redis, 'https://example.com/dead1', 'Gone');
      await quarantineUrl(redis, 'https://example.com/dead2', 'Also gone');

      const result = await getQuarantinedUrls(redis);
      expect(result).toHaveLength(2);
      expect(result[0].url).toBe('https://example.com/dead1');
      expect(result[1].url).toBe('https://example.com/dead2');
    });
  });

  describe('getQuarantineCount', () => {
    it('returns 0 when empty', async () => {
      const count = await getQuarantineCount(redis);
      expect(count).toBe(0);
    });

    it('returns correct count', async () => {
      await quarantineUrl(redis, 'https://a.com', 'x');
      await quarantineUrl(redis, 'https://b.com', 'y');
      const count = await getQuarantineCount(redis);
      expect(count).toBe(2);
    });
  });

  describe('unquarantineUrl', () => {
    it('removes URL from quarantine', async () => {
      await quarantineUrl(redis, 'https://example.com/revived', 'Was dead');
      expect(await isQuarantined(redis, 'https://example.com/revived')).toBe(true);

      await unquarantineUrl(redis, 'https://example.com/revived');
      expect(await isQuarantined(redis, 'https://example.com/revived')).toBe(false);
    });
  });

  describe('filterQuarantined', () => {
    it('returns all entries when nothing is quarantined', async () => {
      const corpus = [
        { url: 'https://a.com', vertical: 'Fashion', added: '2026-01-01' },
        { url: 'https://b.com', vertical: 'Tech', added: '2026-01-01' },
      ];
      const result = await filterQuarantined(redis, corpus);
      expect(result).toHaveLength(2);
    });

    it('filters out quarantined URLs', async () => {
      await quarantineUrl(redis, 'https://a.com', 'bad');

      const corpus = [
        { url: 'https://a.com', vertical: 'Fashion', added: '2026-01-01' },
        { url: 'https://b.com', vertical: 'Tech', added: '2026-01-01' },
        { url: 'https://c.com', vertical: 'Home', added: '2026-01-01' },
      ];
      const result = await filterQuarantined(redis, corpus);
      expect(result).toHaveLength(2);
      expect(result.map(e => e.url)).toEqual(['https://b.com', 'https://c.com']);
    });
  });
});
