import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock fetch globally
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

// Mock agent-identity to avoid key generation in tests
vi.mock('../agent-identity.js', () => ({
  signRequest: vi.fn(() => ({
    'Signature-Input': 'sig1=("@method" "@target-uri");created=1;keyid="test";alg="ed25519"',
    'Signature': 'sig1=:dGVzdA==:',
  })),
}));

import { probeAccess, clearProbeCache, getCachedProbe } from '../access-probe.js';

function mockHeadResponse(
  status: number,
  headers: Record<string, string> = {},
) {
  const headerMap = new Map(
    Object.entries(headers).map(([k, v]) => [k.toLowerCase(), v]),
  );
  return {
    status,
    headers: {
      has: (name: string) => headerMap.has(name.toLowerCase()),
      get: (name: string) => headerMap.get(name.toLowerCase()) ?? null,
    },
  };
}

describe('access-probe', () => {
  beforeEach(() => {
    clearProbeCache();
    mockFetch.mockReset();
  });

  afterEach(() => {
    clearProbeCache();
  });

  describe('probeAccess — unsigned responses', () => {
    it('200 with no auth headers → fully_open, score 100', async () => {
      mockFetch.mockResolvedValue(mockHeadResponse(200));

      const result = await probeAccess('https://example.com/product');
      expect(result.access_label).toBe('fully_open');
      expect(result.score).toBe(100);
      expect(result.access_level).toBe(5);
      expect(result.signed_status).toBeNull();
      expect(result.from_cache).toBe(false);
    });

    it('200 with X-Robots-Tag → monitored, score 85', async () => {
      mockFetch.mockResolvedValue(
        mockHeadResponse(200, { 'X-Robots-Tag': 'noai' }),
      );

      const result = await probeAccess('https://monitored.com/product');
      expect(result.access_label).toBe('monitored');
      expect(result.score).toBe(85);
      expect(result.access_level).toBe(4);
    });

    it('200 with Signature-Input → prefers_signed, score 70', async () => {
      mockFetch.mockResolvedValue(
        mockHeadResponse(200, { 'Signature-Input': 'sig1=...' }),
      );

      const result = await probeAccess('https://prefers-signed.com/product');
      expect(result.access_label).toBe('prefers_signed');
      expect(result.score).toBe(70);
      expect(result.access_level).toBe(3);
    });

    it('402 → payment_required, score 30', async () => {
      mockFetch.mockResolvedValue(mockHeadResponse(402));

      const result = await probeAccess('https://paywall.com/product');
      expect(result.access_label).toBe('payment_required');
      expect(result.score).toBe(30);
      expect(result.requires_payment).toBe(true);
    });

    it('429 → rate_limited, score 20', async () => {
      mockFetch.mockResolvedValue(
        mockHeadResponse(429, { 'Retry-After': '60' }),
      );

      const result = await probeAccess('https://throttled.com/product');
      expect(result.access_label).toBe('rate_limited');
      expect(result.score).toBe(20);
    });
  });

  describe('probeAccess — signed retry matrix', () => {
    it('401 unsigned → 200 signed → identity_cleared, score 70', async () => {
      mockFetch
        .mockResolvedValueOnce(mockHeadResponse(401, { 'WWW-Authenticate': 'Signature' }))
        .mockResolvedValueOnce(mockHeadResponse(200));

      const result = await probeAccess('https://auth-required.com/product');
      expect(result.access_label).toBe('identity_cleared');
      expect(result.score).toBe(70);
      expect(result.unsigned_status).toBe(401);
      expect(result.signed_status).toBe(200);
    });

    it('401 unsigned → 401 signed → identity_rejected, score 20', async () => {
      mockFetch
        .mockResolvedValueOnce(mockHeadResponse(401, { 'WWW-Authenticate': 'Signature' }))
        .mockResolvedValueOnce(mockHeadResponse(401));

      const result = await probeAccess('https://rejected.com/product');
      expect(result.access_label).toBe('identity_rejected');
      expect(result.score).toBe(20);
      expect(result.unsigned_status).toBe(401);
      expect(result.signed_status).toBe(401);
    });

    it('403 unsigned → 200 signed → identity_cleared, score 60', async () => {
      mockFetch
        .mockResolvedValueOnce(mockHeadResponse(403))
        .mockResolvedValueOnce(mockHeadResponse(200));

      const result = await probeAccess('https://cloudflare-gated.com/product');
      expect(result.access_label).toBe('identity_cleared');
      expect(result.score).toBe(60);
      expect(result.unsigned_status).toBe(403);
      expect(result.signed_status).toBe(200);
    });

    it('403 unsigned → 403 signed → blocked, score 0', async () => {
      mockFetch
        .mockResolvedValueOnce(mockHeadResponse(403))
        .mockResolvedValueOnce(mockHeadResponse(403));

      const result = await probeAccess('https://blocked.com/product');
      expect(result.access_label).toBe('blocked');
      expect(result.score).toBe(0);
      expect(result.unsigned_status).toBe(403);
      expect(result.signed_status).toBe(403);
    });
  });

  describe('probeAccess — caching', () => {
    it('returns cached result for same domain', async () => {
      mockFetch.mockResolvedValue(mockHeadResponse(200));

      const first = await probeAccess('https://example.com/product-a');
      expect(first.from_cache).toBe(false);
      expect(mockFetch).toHaveBeenCalledTimes(1);

      const second = await probeAccess('https://example.com/product-b');
      expect(second.from_cache).toBe(true);
      expect(mockFetch).toHaveBeenCalledTimes(1); // no new fetch
      expect(second.score).toBe(first.score);
    });

    it('probes different domains independently', async () => {
      mockFetch
        .mockResolvedValueOnce(mockHeadResponse(200))
        .mockResolvedValueOnce(mockHeadResponse(403))
        .mockResolvedValueOnce(mockHeadResponse(403));

      const open = await probeAccess('https://open.com/product');
      const blocked = await probeAccess('https://blocked.com/product');

      expect(open.score).toBe(100);
      expect(blocked.score).toBe(0);
    });

    it('clearProbeCache clears the memory cache', async () => {
      mockFetch.mockResolvedValue(mockHeadResponse(200));

      await probeAccess('https://example.com/product');
      expect(getCachedProbe('https://example.com/product')).toBeDefined();

      clearProbeCache();
      expect(getCachedProbe('https://example.com/product')).toBeUndefined();
    });

    it('getCachedProbe returns undefined for unprobed domains', () => {
      expect(getCachedProbe('https://never-probed.com/product')).toBeUndefined();
    });
  });

  describe('probeAccess — Cloudflare detection', () => {
    it('detects Cloudflare from cf-ray header', async () => {
      mockFetch.mockResolvedValue(
        mockHeadResponse(200, { 'cf-ray': '12345-IAD' }),
      );

      const result = await probeAccess('https://cf-site.com/product');
      expect(result.cloudflare_detected).toBe(true);
    });

    it('detects Cloudflare from server header', async () => {
      mockFetch.mockResolvedValue(
        mockHeadResponse(200, { server: 'cloudflare' }),
      );

      const result = await probeAccess('https://cf-server.com/product');
      expect(result.cloudflare_detected).toBe(true);
    });

    it('does not false-positive on non-Cloudflare sites', async () => {
      mockFetch.mockResolvedValue(
        mockHeadResponse(200, { server: 'nginx' }),
      );

      const result = await probeAccess('https://nginx-site.com/product');
      expect(result.cloudflare_detected).toBe(false);
    });
  });

  describe('probeAccess — error handling', () => {
    it('treats network errors as blocked', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      const result = await probeAccess('https://unreachable.com/product');
      expect(result.access_label).toBe('blocked');
      expect(result.score).toBe(0);
    });
  });
});
