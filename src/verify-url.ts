/**
 * URL verification gate for the ShopGraph test corpus.
 * Ensures URLs are reachable and return extractable product data
 * before they enter the active test pool.
 */

import { extractProduct } from './extract.js';

const HEAD_TIMEOUT_MS = 10_000;

const USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';

export interface VerifyResult {
  valid: boolean;
  httpStatus: number;
  hasProductData: boolean;
  reason?: string;
}

/**
 * Verify a URL is reachable and returns extractable product data.
 *
 * 1. HEAD request to check HTTP status (fast)
 * 2. If 200, runs full extraction to verify data comes back
 * 3. Returns validation result
 */
export async function verifyUrl(url: string): Promise<VerifyResult> {
  // Step 1: HEAD request for fast HTTP status check
  let httpStatus: number;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), HEAD_TIMEOUT_MS);

    try {
      const response = await fetch(url, {
        method: 'HEAD',
        headers: {
          'User-Agent': USER_AGENT,
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
        signal: controller.signal,
        redirect: 'follow',
      });
      httpStatus = response.status;
    } finally {
      clearTimeout(timeout);
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      valid: false,
      httpStatus: 0,
      hasProductData: false,
      reason: `HEAD request failed: ${message}`,
    };
  }

  // Non-200 status (allow redirects — fetch follows them, so we only see final status)
  if (httpStatus >= 400) {
    return {
      valid: false,
      httpStatus,
      hasProductData: false,
      reason: `HTTP ${httpStatus}`,
    };
  }

  // Step 2: Run extraction to verify product data comes back
  try {
    const product = await extractProduct(url);
    const hasData = product.product_name !== null && product.product_name.length > 0;

    if (!hasData) {
      return {
        valid: false,
        httpStatus,
        hasProductData: false,
        reason: 'Extraction returned no product data',
      };
    }

    return {
      valid: true,
      httpStatus,
      hasProductData: true,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      valid: false,
      httpStatus,
      hasProductData: false,
      reason: `Extraction failed: ${message}`,
    };
  }
}
