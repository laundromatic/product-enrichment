import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

// Mock fetch globally
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

// Mock the LLM module
vi.mock('../llm-extract.js', () => ({
  extractWithLlm: vi.fn(),
}));

import { extractProduct } from '../extract.js';
import { extractWithLlm } from '../llm-extract.js';

const FIXTURES = join(import.meta.dirname, 'fixtures');
const shopifyHtml = readFileSync(join(FIXTURES, 'shopify-product.html'), 'utf-8');
const noSchemaHtml = readFileSync(join(FIXTURES, 'no-schema-product.html'), 'utf-8');

function mockResponse(body: string, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? 'OK' : 'Not Found',
    text: () => Promise.resolve(body),
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('extractProduct', () => {
  it('uses schema.org when JSON-LD is present', async () => {
    mockFetch.mockResolvedValueOnce(mockResponse(shopifyHtml));

    const result = await extractProduct('https://example.com/product');
    expect(result.extraction_method).toBe('schema_org');
    expect(result.product_name).toBe('Vintage Rose Gold Ring');
    expect(result.confidence.overall).toBeGreaterThan(0.9);
    expect(result.url).toBe('https://example.com/product');
  });

  it('falls back to LLM when no schema.org data', async () => {
    mockFetch.mockResolvedValueOnce(mockResponse(noSchemaHtml));
    const mockLlm = vi.mocked(extractWithLlm);
    mockLlm.mockResolvedValueOnce({
      extraction_method: 'llm',
      product_name: 'Handmade Ceramic Vase',
      brand: 'ArtisanHome Studio',
      description: 'Beautiful handcrafted ceramic vase',
      price: { amount: 45.0, currency: 'USD', sale_price: 38.5 },
      availability: 'in_stock',
      categories: ['Home Decor', 'Vases'],
      image_urls: ['https://artisanhome.com/images/vase-blue-1.jpg'],
      primary_image_url: 'https://artisanhome.com/images/vase-blue-1.jpg',
      color: ['Blue'],
      material: ['Ceramic'],
      dimensions: { height: '12 inches', width: '6 inches' },
      schema_org_raw: null,
      confidence: { overall: 0.7, per_field: { product_name: 0.7 } },
    });

    const result = await extractProduct('https://example.com/vase');
    expect(result.extraction_method).toBe('llm');
    expect(result.product_name).toBe('Handmade Ceramic Vase');
    expect(result.confidence.overall).toBeLessThan(0.9);
  });

  it('returns empty product when both methods fail', async () => {
    mockFetch.mockResolvedValueOnce(mockResponse(noSchemaHtml));
    vi.mocked(extractWithLlm).mockResolvedValueOnce(null);

    const result = await extractProduct('https://example.com/empty');
    expect(result.product_name).toBeNull();
    expect(result.confidence.overall).toBe(0);
  });

  it('throws on HTTP error', async () => {
    mockFetch.mockResolvedValueOnce(mockResponse('Not Found', 404));

    await expect(extractProduct('https://example.com/missing')).rejects.toThrow('HTTP 404');
  });

  it('throws on network timeout', async () => {
    mockFetch.mockRejectedValueOnce(new Error('The operation was aborted'));

    await expect(extractProduct('https://example.com/slow')).rejects.toThrow('aborted');
  });

  it('includes url and extracted_at in result', async () => {
    mockFetch.mockResolvedValueOnce(mockResponse(shopifyHtml));

    const result = await extractProduct('https://example.com/product');
    expect(result.url).toBe('https://example.com/product');
    expect(result.extracted_at).toBeTruthy();
    // ISO date format
    expect(new Date(result.extracted_at).toISOString()).toBe(result.extracted_at);
  });

  it('includes all expected fields in schema.org result', async () => {
    mockFetch.mockResolvedValueOnce(mockResponse(shopifyHtml));

    const result = await extractProduct('https://example.com/product');
    expect(result).toHaveProperty('url');
    expect(result).toHaveProperty('extracted_at');
    expect(result).toHaveProperty('extraction_method');
    expect(result).toHaveProperty('product_name');
    expect(result).toHaveProperty('brand');
    expect(result).toHaveProperty('description');
    expect(result).toHaveProperty('price');
    expect(result).toHaveProperty('availability');
    expect(result).toHaveProperty('categories');
    expect(result).toHaveProperty('image_urls');
    expect(result).toHaveProperty('primary_image_url');
    expect(result).toHaveProperty('color');
    expect(result).toHaveProperty('material');
    expect(result).toHaveProperty('dimensions');
    expect(result).toHaveProperty('schema_org_raw');
    expect(result).toHaveProperty('confidence');
  });

  it('sends realistic User-Agent header', async () => {
    mockFetch.mockResolvedValueOnce(mockResponse(shopifyHtml));

    await extractProduct('https://example.com/product');
    const fetchCall = mockFetch.mock.calls[0];
    const headers = fetchCall[1].headers;
    expect(headers['User-Agent']).toContain('Chrome');
  });
});
