import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../stats.js', () => ({
  KV_KEYS: {
    OVERALL: 'stats:overall',
    VERTICALS: 'stats:verticals',
    LAST_BATCH: 'stats:last_batch',
    BATCH_OFFSET: 'stats:batch_offset',
    resultKey: (hash: string) => `results:${hash}`,
  },
  getRedis: vi.fn(),
}));

vi.mock('../circuit-breaker.js', () => ({
  getQuarantineCount: vi.fn().mockResolvedValue(0),
}));

import {
  getHealthStatus,
  ALERT_THRESHOLD,
  DEGRADED_THRESHOLD,
  HEALTH_KEYS,
  storeAlert,
  fireWebhookAlert,
} from '../health.js';

function createMockRedis() {
  const store = new Map<string, unknown>();
  return {
    get: vi.fn(async (key: string) => store.get(key) ?? null),
    set: vi.fn(async (key: string, value: unknown) => { store.set(key, value); }),
    del: vi.fn(async (key: string) => { store.delete(key); }),
    _store: store,
  } as unknown as import('@upstash/redis').Redis & { _store: Map<string, unknown> };
}

describe('health', () => {
  describe('getHealthStatus', () => {
    it('returns healthy when success rate >= 70%', () => {
      expect(getHealthStatus(70)).toBe('healthy');
      expect(getHealthStatus(95)).toBe('healthy');
      expect(getHealthStatus(100)).toBe('healthy');
    });

    it('returns degraded when success rate 50-69%', () => {
      expect(getHealthStatus(69)).toBe('degraded');
      expect(getHealthStatus(50)).toBe('degraded');
      expect(getHealthStatus(55)).toBe('degraded');
    });

    it('returns critical when success rate < 50%', () => {
      expect(getHealthStatus(49)).toBe('critical');
      expect(getHealthStatus(0)).toBe('critical');
      expect(getHealthStatus(30)).toBe('critical');
    });
  });

  describe('HEALTH_KEYS', () => {
    it('has correct key names', () => {
      expect(HEALTH_KEYS.ALERT_LOW_SUCCESS).toBe('alert:low_success_rate');
      expect(HEALTH_KEYS.LAST_CRON_RUN).toBe('health:last_cron_run');
      expect(HEALTH_KEYS.LAST_VERIFY_RUN).toBe('health:last_verify_run');
    });
  });

  describe('thresholds', () => {
    it('ALERT_THRESHOLD is 70', () => {
      expect(ALERT_THRESHOLD).toBe(70);
    });

    it('DEGRADED_THRESHOLD is 50', () => {
      expect(DEGRADED_THRESHOLD).toBe(50);
    });
  });

  describe('storeAlert', () => {
    let redis: ReturnType<typeof createMockRedis>;

    beforeEach(() => {
      redis = createMockRedis();
    });

    it('stores alert when success rate below threshold', async () => {
      await storeAlert(redis, 45, 24);
      expect(redis.set).toHaveBeenCalledWith(
        HEALTH_KEYS.ALERT_LOW_SUCCESS,
        expect.objectContaining({
          rate: 45,
          batch_offset: 24,
        })
      );
    });

    it('clears alert when success rate above threshold', async () => {
      await storeAlert(redis, 85, 24);
      expect(redis.del).toHaveBeenCalledWith(HEALTH_KEYS.ALERT_LOW_SUCCESS);
    });

    it('stores alert at exactly threshold - 1', async () => {
      await storeAlert(redis, 69, 0);
      expect(redis.set).toHaveBeenCalled();
    });

    it('clears alert at exactly threshold', async () => {
      await storeAlert(redis, 70, 0);
      expect(redis.del).toHaveBeenCalled();
    });
  });

  describe('fireWebhookAlert', () => {
    const originalEnv = process.env.ALERT_WEBHOOK_URL;

    beforeEach(() => {
      delete process.env.ALERT_WEBHOOK_URL;
      vi.restoreAllMocks();
    });

    afterEach(() => {
      if (originalEnv) process.env.ALERT_WEBHOOK_URL = originalEnv;
      else delete process.env.ALERT_WEBHOOK_URL;
    });

    it('does nothing when no webhook URL configured', async () => {
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response());
      await fireWebhookAlert(45);
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('fires webhook when URL is configured', async () => {
      process.env.ALERT_WEBHOOK_URL = 'https://hooks.example.com/alert';
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response());

      await fireWebhookAlert(45);

      expect(fetchSpy).toHaveBeenCalledWith(
        'https://hooks.example.com/alert',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        })
      );
    });

    it('does not throw when webhook fails', async () => {
      process.env.ALERT_WEBHOOK_URL = 'https://hooks.example.com/alert';
      vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Network error'));

      // Should not throw
      await expect(fireWebhookAlert(45)).resolves.toBeUndefined();
    });
  });
});
