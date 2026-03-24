import type { ProductData } from './types.js';
import { extractSchemaOrg } from './schema-org.js';
import { extractWithLlm } from './llm-extract.js';

const USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';

const FETCH_TIMEOUT_MS = 15_000;

/**
 * Main extraction orchestrator.
 * Fetches URL, tries schema.org first, falls back to LLM.
 */
export async function extractProduct(url: string): Promise<ProductData> {
  const html = await fetchPage(url);
  const now = new Date().toISOString();

  // Try schema.org first (fast, high confidence)
  const schemaResult = extractSchemaOrg(html);
  if (schemaResult && schemaResult.product_name) {
    return {
      url,
      extracted_at: now,
      extraction_method: 'schema_org',
      product_name: schemaResult.product_name ?? null,
      brand: schemaResult.brand ?? null,
      description: schemaResult.description ?? null,
      price: schemaResult.price ?? null,
      availability: schemaResult.availability ?? 'unknown',
      categories: schemaResult.categories ?? [],
      image_urls: schemaResult.image_urls ?? [],
      primary_image_url: schemaResult.primary_image_url ?? null,
      color: schemaResult.color ?? [],
      material: schemaResult.material ?? [],
      dimensions: schemaResult.dimensions ?? null,
      schema_org_raw: schemaResult.schema_org_raw ?? null,
      confidence: schemaResult.confidence ?? { overall: 0, per_field: {} },
    };
  }

  // Fall back to LLM extraction
  const llmResult = await extractWithLlm(html, url);
  if (llmResult && llmResult.product_name) {
    return {
      url,
      extracted_at: now,
      extraction_method: 'llm',
      product_name: llmResult.product_name ?? null,
      brand: llmResult.brand ?? null,
      description: llmResult.description ?? null,
      price: llmResult.price ?? null,
      availability: llmResult.availability ?? 'unknown',
      categories: llmResult.categories ?? [],
      image_urls: llmResult.image_urls ?? [],
      primary_image_url: llmResult.primary_image_url ?? null,
      color: llmResult.color ?? [],
      material: llmResult.material ?? [],
      dimensions: llmResult.dimensions ?? null,
      schema_org_raw: null,
      confidence: llmResult.confidence ?? { overall: 0, per_field: {} },
    };
  }

  // Neither method produced data
  return {
    url,
    extracted_at: now,
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
  };
}

/**
 * Fetch a page with realistic headers and timeout.
 */
export async function fetchPage(url: string): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': USER_AGENT,
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
      signal: controller.signal,
      redirect: 'follow',
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.text();
  } finally {
    clearTimeout(timeout);
  }
}
