import NodeCache from 'node-cache';
import { createHash } from 'crypto';
import type { ProductData } from './types.js';

const TTL_SECONDS = 24 * 60 * 60; // 24 hours

/**
 * Simple in-memory cache for enrichment results.
 * Keys are SHA-256 hashes of URLs. TTL is 24 hours.
 */
export class EnrichmentCache {
  private cache: NodeCache;

  constructor(ttlSeconds: number = TTL_SECONDS) {
    this.cache = new NodeCache({
      stdTTL: ttlSeconds,
      checkperiod: Math.floor(ttlSeconds / 10),
      useClones: true,
    });
  }

  /**
   * Get cached product data for a URL.
   */
  get(url: string): ProductData | undefined {
    const key = this.hashUrl(url);
    return this.cache.get<ProductData>(key);
  }

  /**
   * Cache product data for a URL.
   */
  set(url: string, data: ProductData): void {
    const key = this.hashUrl(url);
    this.cache.set(key, data);
  }

  /**
   * Check if a URL has cached data.
   */
  has(url: string): boolean {
    const key = this.hashUrl(url);
    return this.cache.has(key);
  }

  /**
   * Clear all cached data.
   */
  clear(): void {
    this.cache.flushAll();
  }

  /**
   * Get cache stats.
   */
  stats(): { keys: number; hits: number; misses: number } {
    const s = this.cache.getStats();
    return { keys: this.cache.keys().length, hits: s.hits, misses: s.misses };
  }

  private hashUrl(url: string): string {
    return createHash('sha256').update(url).digest('hex');
  }
}
