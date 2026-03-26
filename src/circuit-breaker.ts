/**
 * Circuit breaker for the ShopGraph test pipeline.
 * Tracks consecutive failures per URL and auto-quarantines
 * URLs that fail too many times.
 */

import type { Redis } from '@upstash/redis';
import { hashUrl } from './stats.js';

const MAX_CONSECUTIVE_FAILURES = 3;

// KV key helpers
export const CB_KEYS = {
  failureCount: (urlHash: string) => `failures:${urlHash}`,
  quarantine: (urlHash: string) => `quarantine:${urlHash}`,
  quarantineIndex: 'quarantine:index',
} as const;

export interface QuarantineEntry {
  url: string;
  reason: string;
  quarantined_at: string;
  failure_count: number;
}

/**
 * Record a successful extraction — resets the failure counter.
 */
export async function recordSuccess(redis: Redis, url: string): Promise<void> {
  const key = CB_KEYS.failureCount(hashUrl(url));
  await redis.del(key);
}

/**
 * Record a failed extraction — increments the failure counter.
 * Returns true if the URL was quarantined (hit the threshold).
 */
export async function recordFailure(
  redis: Redis,
  url: string,
  error: string | null,
): Promise<boolean> {
  const urlHash = hashUrl(url);
  const key = CB_KEYS.failureCount(urlHash);

  // Increment failure count
  const count = await redis.incr(key);
  // Set TTL so stale counters expire (30 days)
  await redis.expire(key, 30 * 24 * 60 * 60);

  if (count >= MAX_CONSECUTIVE_FAILURES) {
    // Quarantine this URL
    await quarantineUrl(redis, url, `${count} consecutive failures. Last error: ${error ?? 'unknown'}`);
    return true;
  }

  return false;
}

/**
 * Move a URL to quarantine.
 */
export async function quarantineUrl(
  redis: Redis,
  url: string,
  reason: string,
): Promise<void> {
  const urlHash = hashUrl(url);
  const entry: QuarantineEntry = {
    url,
    reason,
    quarantined_at: new Date().toISOString(),
    failure_count: MAX_CONSECUTIVE_FAILURES,
  };

  // Store quarantine entry (no expiry — stays until manually reviewed)
  await redis.set(CB_KEYS.quarantine(urlHash), entry);

  // Add to quarantine index (set of quarantined URL hashes)
  await redis.sadd(CB_KEYS.quarantineIndex, urlHash);

  // Clean up the failure counter
  await redis.del(CB_KEYS.failureCount(urlHash));

  console.log(`[circuit-breaker] Quarantined URL: ${url} — ${reason}`);
}

/**
 * Check if a URL is quarantined.
 */
export async function isQuarantined(redis: Redis, url: string): Promise<boolean> {
  const urlHash = hashUrl(url);
  return await redis.sismember(CB_KEYS.quarantineIndex, urlHash) === 1;
}

/**
 * Get all quarantined URLs.
 */
export async function getQuarantinedUrls(redis: Redis): Promise<QuarantineEntry[]> {
  const hashes = await redis.smembers(CB_KEYS.quarantineIndex);
  if (!hashes || hashes.length === 0) return [];

  const entries: QuarantineEntry[] = [];
  for (const hash of hashes) {
    const entry = await redis.get<QuarantineEntry>(CB_KEYS.quarantine(hash));
    if (entry) entries.push(entry);
  }

  return entries;
}

/**
 * Get the count of quarantined URLs.
 */
export async function getQuarantineCount(redis: Redis): Promise<number> {
  const count = await redis.scard(CB_KEYS.quarantineIndex);
  return count ?? 0;
}

/**
 * Remove a URL from quarantine (for manual review/re-admission).
 */
export async function unquarantineUrl(redis: Redis, url: string): Promise<void> {
  const urlHash = hashUrl(url);
  await redis.del(CB_KEYS.quarantine(urlHash));
  await redis.srem(CB_KEYS.quarantineIndex, urlHash);
  await redis.del(CB_KEYS.failureCount(urlHash));
  console.log(`[circuit-breaker] Unquarantined URL: ${url}`);
}

/**
 * Filter a corpus to remove quarantined URLs.
 */
export async function filterQuarantined<T extends { url: string }>(
  redis: Redis,
  entries: T[],
): Promise<T[]> {
  // Get all quarantined hashes in one call
  const quarantinedHashes = new Set(await redis.smembers(CB_KEYS.quarantineIndex));
  if (quarantinedHashes.size === 0) return entries;

  return entries.filter(entry => !quarantinedHashes.has(hashUrl(entry.url)));
}
