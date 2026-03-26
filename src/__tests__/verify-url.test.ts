import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock extractProduct
vi.mock('../extract.js', () => ({
  extractProduct: vi.fn(),
}));

import { verifyUrl } from '../verify-url.js';
import { extractProduct } from '../extract.js';

const mockExtract = vi.mocked(extractProduct);

describe('verify-url', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('verifyUrl', () => {
    it('returns invalid when HEAD request fails with network error', async () => {
      vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('ECONNREFUSED'));

      const result = await verifyUrl('https://dead-site.example.com/product');

      expect(result.valid).toBe(false);
      expect(result.httpStatus).toBe(0);
      expect(result.hasProductData).toBe(false);
      expect(result.reason).toContain('HEAD request failed');
    });

    it('returns invalid for HTTP 404', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response(null, { status: 404 })
      );

      const result = await verifyUrl('https://example.com/deleted-product');

      expect(result.valid).toBe(false);
      expect(result.httpStatus).toBe(404);
      expect(result.reason).toBe('HTTP 404');
    });

    it('returns invalid for HTTP 403', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response(null, { status: 403 })
      );

      const result = await verifyUrl('https://example.com/blocked');

      expect(result.valid).toBe(false);
      expect(result.httpStatus).toBe(403);
      expect(result.reason).toBe('HTTP 403');
    });

    it('returns invalid for HTTP 500', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response(null, { status: 500 })
      );

      const result = await verifyUrl('https://example.com/error');

      expect(result.valid).toBe(false);
      expect(result.httpStatus).toBe(500);
    });

    it('returns invalid when extraction returns no product data', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response(null, { status: 200 })
      );
      mockExtract.mockResolvedValue({
        url: 'https://example.com/empty',
        extracted_at: '2026-01-01',
        extraction_method: 'schema_org',
        product_name: null,
        brand: null,
        description: null,
        price: null,
        availability: 'unknown',
        categories: [],
        image_urls: [],
        primary_image_url: null,
        color: [],
        material: [],
        dimensions: null,
        schema_org_raw: null,
        confidence: { overall: 0, per_field: {} },
      });

      const result = await verifyUrl('https://example.com/empty');

      expect(result.valid).toBe(false);
      expect(result.httpStatus).toBe(200);
      expect(result.hasProductData).toBe(false);
      expect(result.reason).toBe('Extraction returned no product data');
    });

    it('returns valid when HEAD succeeds and extraction has data', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response(null, { status: 200 })
      );
      mockExtract.mockResolvedValue({
        url: 'https://example.com/good',
        extracted_at: '2026-01-01',
        extraction_method: 'schema_org',
        product_name: 'Test Product',
        brand: 'TestBrand',
        description: 'A product',
        price: '$29.99',
        availability: 'InStock',
        categories: ['Test'],
        image_urls: [],
        primary_image_url: null,
        color: [],
        material: [],
        dimensions: null,
        schema_org_raw: null,
        confidence: { overall: 0.9, per_field: {} },
      });

      const result = await verifyUrl('https://example.com/good');

      expect(result.valid).toBe(true);
      expect(result.httpStatus).toBe(200);
      expect(result.hasProductData).toBe(true);
      expect(result.reason).toBeUndefined();
    });

    it('returns invalid when extraction throws', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response(null, { status: 200 })
      );
      mockExtract.mockRejectedValue(new Error('LLM extraction failed'));

      const result = await verifyUrl('https://example.com/broken');

      expect(result.valid).toBe(false);
      expect(result.httpStatus).toBe(200);
      expect(result.hasProductData).toBe(false);
      expect(result.reason).toContain('Extraction failed');
    });

    it('allows 3xx redirects (fetch follows them)', async () => {
      // fetch follows redirects by default, so a redirect results in the final status
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response(null, { status: 200 })
      );
      mockExtract.mockResolvedValue({
        url: 'https://example.com/redirected',
        extracted_at: '2026-01-01',
        extraction_method: 'llm',
        product_name: 'Redirected Product',
        brand: null,
        description: null,
        price: null,
        availability: 'unknown',
        categories: [],
        image_urls: [],
        primary_image_url: null,
        color: [],
        material: [],
        dimensions: null,
        schema_org_raw: null,
        confidence: { overall: 0.5, per_field: {} },
      });

      const result = await verifyUrl('https://example.com/redirected');

      expect(result.valid).toBe(true);
    });
  });
});
