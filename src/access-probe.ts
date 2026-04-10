/**
 * Access Readiness Probe (LAU-296)
 *
 * Probes target URLs for Web Bot Auth requirements using HEAD requests.
 * Results are cached per domain in Redis (1-hour TTL) to avoid redundant probes.
 *
 * ═══════════════════════════════════════════════════════════════════
 * LIFECYCLE:
 * 1. This module is dormant until `feature:access_readiness_active` is true in Redis
 * 2. The test runner (src/test-runner.ts) activates the flag when >10% of
 *    corpus URLs return Web Bot Auth headers
 * 3. When active, extractProduct() calls probeAccess() before fetching
 * 4. Probe results feed scoreAccessReadiness() in src/agent-ready.ts
 * 5. Results are cached per domain (1-hour TTL) to minimize latency
 *
 * ACTIVATION IS AUTOMATIC. No deploy needed. The feature flag in Redis
 * controls whether probing runs. See src/access-readiness-spec.ts for
 * the full design rationale.
 * ═══════════════════════════════════════════════════════════════════
 */

import { signRequest } from './agent-identity.js';

// ── Types ─────────────────────────────────────────────────────────

export type AccessLabel =
  | 'fully_open'        // 200, no auth headers
  | 'monitored'         // 200 + X-Robots-Tag or similar AI marker
  | 'prefers_signed'    // 200 + Signature-Input header present
  | 'identity_cleared'  // 401/403 unsigned → 200 signed
  | 'identity_rejected' // 401 unsigned → 401 signed
  | 'payment_required'  // 402
  | 'rate_limited'      // 429
  | 'blocked';          // 403 unsigned → 403 signed (or no retry)

export interface AccessProbeResult {
  domain: string;
  score: number;            // 0-100
  access_level: number;     // 0-5
  access_label: AccessLabel;
  unsigned_status: number;
  signed_status: number | null;
  requires_payment: boolean;
  cloudflare_detected: boolean;
  probed_at: string;        // ISO timestamp
  from_cache: boolean;
}

// ── Scoring matrix ────────────────────────────────────────────────

/** Access level scale (0 = hostile, 5 = fully open) */
const LABEL_TO_LEVEL: Record<AccessLabel, number> = {
  fully_open: 5,
  monitored: 4,
  prefers_signed: 3,
  identity_cleared: 3,
  identity_rejected: 1,
  payment_required: 2,
  rate_limited: 1,
  blocked: 0,
};

const LABEL_TO_SCORE: Record<AccessLabel, number> = {
  fully_open: 100,
  monitored: 85,
  prefers_signed: 70,
  identity_cleared: 70,
  identity_rejected: 20,
  payment_required: 30,
  rate_limited: 20,
  blocked: 0,
};

/** Labels for the signed retry matrix (when unsigned fails) */
const SIGNED_RETRY_LABELS: Record<string, { label: AccessLabel; score: number }> = {
  '401_200': { label: 'identity_cleared', score: 70 },
  '401_401': { label: 'identity_rejected', score: 20 },
  '403_200': { label: 'identity_cleared', score: 60 },
  '403_403': { label: 'blocked', score: 0 },
};

// ── Cache ─────────────────────────────────────────────────────────

const CACHE_TTL_SECONDS = 60 * 60; // 1 hour

/** In-memory cache for domains probed this cold start (Redis is source of truth) */
const memoryCache = new Map<string, AccessProbeResult>();

function extractDomain(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

function redisKey(domain: string): string {
  return `access:${domain}`;
}

// ── Probe logic ───────────────────────────────────────────────────

const PROBE_TIMEOUT_MS = 5000;

/**
 * Detect Cloudflare from response headers.
 */
function detectCloudflare(headers: { has: (name: string) => boolean; get: (name: string) => string | null }): boolean {
  return headers.has('cf-ray') ||
    headers.has('cf-cache-status') ||
    (headers.get('server') ?? '').toLowerCase().includes('cloudflare');
}

/**
 * Send a HEAD request to a URL, optionally with RFC 9421 signature.
 * Returns the HTTP status code and response headers.
 */
async function headRequest(
  url: string,
  signed: boolean,
): Promise<{ status: number; headers: { has: (n: string) => boolean; get: (n: string) => string | null }; cloudflare: boolean }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS);

  const requestHeaders: Record<string, string> = {
    'User-Agent': 'ShopGraph/1.0',
    Accept: '*/*',
  };

  if (signed) {
    try {
      const sigHeaders = signRequest('HEAD', url);
      Object.assign(requestHeaders, sigHeaders);
    } catch {
      // Signing failure — proceed unsigned
    }
  }

  try {
    const response = await fetch(url, {
      method: 'HEAD',
      headers: requestHeaders,
      signal: controller.signal,
      redirect: 'follow',
    });

    return {
      status: response.status,
      headers: response.headers,
      cloudflare: detectCloudflare(response.headers),
    };
  } catch {
    // Network error, timeout, etc. — treat as blocked
    return {
      status: 0,
      headers: { has: () => false, get: () => null },
      cloudflare: false,
    };
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Classify a URL's access posture via HEAD request probing.
 * If unsigned HEAD returns 401/403, retries with RFC 9421 signature.
 *
 * This function is the core of the access readiness dimension.
 * It runs ONLY when feature:access_readiness_active is true.
 */
async function probeUrl(url: string): Promise<Omit<AccessProbeResult, 'from_cache'>> {
  const domain = extractDomain(url);
  const now = new Date().toISOString();

  // Step 1: Unsigned HEAD request
  const unsigned = await headRequest(url, false);

  // Step 2: Classify based on unsigned response
  if (unsigned.status === 200) {
    // Check for monitoring/preference signals in headers
    const hasRobotsTag = unsigned.headers.has('x-robots-tag');
    const hasSigInput = unsigned.headers.has('signature-input');

    if (hasSigInput) {
      return {
        domain,
        score: LABEL_TO_SCORE.prefers_signed,
        access_level: LABEL_TO_LEVEL.prefers_signed,
        access_label: 'prefers_signed',
        unsigned_status: 200,
        signed_status: null,
        requires_payment: false,
        cloudflare_detected: unsigned.cloudflare,
        probed_at: now,
      };
    }

    if (hasRobotsTag) {
      return {
        domain,
        score: LABEL_TO_SCORE.monitored,
        access_level: LABEL_TO_LEVEL.monitored,
        access_label: 'monitored',
        unsigned_status: 200,
        signed_status: null,
        requires_payment: false,
        cloudflare_detected: unsigned.cloudflare,
        probed_at: now,
      };
    }

    return {
      domain,
      score: LABEL_TO_SCORE.fully_open,
      access_level: LABEL_TO_LEVEL.fully_open,
      access_label: 'fully_open',
      unsigned_status: 200,
      signed_status: null,
      requires_payment: false,
      cloudflare_detected: unsigned.cloudflare,
      probed_at: now,
    };
  }

  if (unsigned.status === 402) {
    return {
      domain,
      score: LABEL_TO_SCORE.payment_required,
      access_level: LABEL_TO_LEVEL.payment_required,
      access_label: 'payment_required',
      unsigned_status: 402,
      signed_status: null,
      requires_payment: true,
      cloudflare_detected: unsigned.cloudflare,
      probed_at: now,
    };
  }

  if (unsigned.status === 429) {
    return {
      domain,
      score: LABEL_TO_SCORE.rate_limited,
      access_level: LABEL_TO_LEVEL.rate_limited,
      access_label: 'rate_limited',
      unsigned_status: 429,
      signed_status: null,
      requires_payment: false,
      cloudflare_detected: unsigned.cloudflare,
      probed_at: now,
    };
  }

  // Step 3: 401 or 403 — retry with signed request
  if (unsigned.status === 401 || unsigned.status === 403) {
    const signed = await headRequest(url, true);
    const matrixKey = `${unsigned.status}_${signed.status}`;
    const match = SIGNED_RETRY_LABELS[matrixKey];

    if (match) {
      return {
        domain,
        score: match.score,
        access_level: LABEL_TO_LEVEL[match.label],
        access_label: match.label,
        unsigned_status: unsigned.status,
        signed_status: signed.status,
        requires_payment: false,
        cloudflare_detected: unsigned.cloudflare || signed.cloudflare,
        probed_at: now,
      };
    }

    // Unexpected signed response — treat as identity_rejected
    return {
      domain,
      score: LABEL_TO_SCORE.identity_rejected,
      access_level: LABEL_TO_LEVEL.identity_rejected,
      access_label: 'identity_rejected',
      unsigned_status: unsigned.status,
      signed_status: signed.status,
      requires_payment: false,
      cloudflare_detected: unsigned.cloudflare || signed.cloudflare,
      probed_at: now,
    };
  }

  // Any other status (5xx, 0 for network error, etc.) — treat as blocked
  return {
    domain,
    score: LABEL_TO_SCORE.blocked,
    access_level: LABEL_TO_LEVEL.blocked,
    access_label: 'blocked',
    unsigned_status: unsigned.status,
    signed_status: null,
    requires_payment: false,
    cloudflare_detected: unsigned.cloudflare,
    probed_at: now,
  };
}

// ── Public API ────────────────────────────────────────────────────

/**
 * Redis interface (subset needed for access probing).
 * Avoids importing the full @upstash/redis type to keep this module testable.
 */
interface RedisLike {
  get<T>(key: string): Promise<T | null>;
  set(key: string, value: unknown, opts?: { ex?: number }): Promise<unknown>;
}

/**
 * Probe a URL's access posture, using domain-level cache.
 *
 * Cache hierarchy:
 * 1. In-memory (per cold start) — avoids Redis round-trip
 * 2. Redis (1-hour TTL) — survives cold starts
 * 3. Live HEAD probe — when cache misses
 *
 * @param url - The target URL to probe
 * @param redis - Optional Redis client for persistent caching
 * @returns AccessProbeResult with score, label, and probe details
 */
export async function probeAccess(
  url: string,
  redis?: RedisLike | null,
): Promise<AccessProbeResult> {
  const domain = extractDomain(url);

  // Check in-memory cache
  const memCached = memoryCache.get(domain);
  if (memCached) {
    return { ...memCached, from_cache: true };
  }

  // Check Redis cache
  if (redis) {
    const redisCached = await redis.get<AccessProbeResult>(redisKey(domain));
    if (redisCached) {
      memoryCache.set(domain, redisCached);
      return { ...redisCached, from_cache: true };
    }
  }

  // Live probe
  const result = await probeUrl(url);
  const fullResult: AccessProbeResult = { ...result, from_cache: false };

  // Cache in both layers
  memoryCache.set(domain, fullResult);
  if (redis) {
    await redis.set(redisKey(domain), fullResult, { ex: CACHE_TTL_SECONDS });
  }

  return fullResult;
}

/**
 * Clear the in-memory probe cache. Used in tests.
 */
export function clearProbeCache(): void {
  memoryCache.clear();
}

/**
 * Get cached probe result for a domain without probing.
 * Used by scoreAccessReadiness() to read pre-fetched results synchronously.
 */
export function getCachedProbe(url: string): AccessProbeResult | undefined {
  const domain = extractDomain(url);
  return memoryCache.get(domain);
}
