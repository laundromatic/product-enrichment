import { GoogleGenerativeAI } from '@google/generative-ai';
import type { ProductData } from './types.js';
import { cleanHtml } from './html-cleaner.js';

const LLM_BASE_CONFIDENCE = 0.7;
const LLM_LOW_CONFIDENCE = 0.6;

const EXTRACTION_PROMPT = `You are a product data extraction expert. Given the text content of a product page, extract structured product information.

Return a valid JSON object with these fields:
{
  "product_name": "string or null",
  "brand": "string or null",
  "description": "string or null - brief product description",
  "price_amount": "number or null",
  "price_currency": "string or null - 3-letter code like USD, EUR",
  "sale_price": "number or null",
  "availability": "in_stock | out_of_stock | preorder | unknown",
  "categories": ["array of category strings"],
  "color": ["array of color strings"],
  "material": ["array of material strings"],
  "dimensions": {"key": "value"} or null
}

Rules:
- Only extract information explicitly present on the page
- Do not hallucinate or infer data that isn't there
- For prices, extract numeric values only (no currency symbols)
- Return null for fields you cannot determine
- Return empty arrays for list fields you cannot determine
- Return ONLY the JSON object, no markdown or explanation`;

/**
 * Extract product data using Gemini LLM as fallback.
 */
export async function extractWithLlm(
  html: string,
  url: string,
  apiKey?: string,
): Promise<Partial<ProductData> | null> {
  const key = apiKey ?? process.env.GOOGLE_API_KEY;
  if (!key) {
    throw new Error('GOOGLE_API_KEY is required for LLM extraction');
  }

  const { text, imageUrls } = cleanHtml(html);
  if (!text || text.length < 50) return null;

  const genAI = new GoogleGenerativeAI(key);
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

  const prompt = `${EXTRACTION_PROMPT}\n\nPage URL: ${url}\n\nPage content:\n${text}`;

  const result = await model.generateContent(prompt);
  const response = result.response;
  const responseText = response.text();

  // Parse JSON from response (handle markdown code blocks)
  const jsonStr = responseText
    .replace(/^```json?\s*/m, '')
    .replace(/```\s*$/m, '')
    .trim();

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(jsonStr);
  } catch {
    return null;
  }

  const perField: Record<string, number> = {};
  const setField = (name: string, value: unknown): boolean => {
    if (value !== null && value !== undefined && value !== '') {
      perField[name] = LLM_BASE_CONFIDENCE;
      return true;
    }
    perField[name] = LLM_LOW_CONFIDENCE;
    return false;
  };

  const productName = typeof parsed.product_name === 'string' ? parsed.product_name : null;
  setField('product_name', productName);

  const brand = typeof parsed.brand === 'string' ? parsed.brand : null;
  setField('brand', brand);

  const description = typeof parsed.description === 'string' ? parsed.description : null;
  setField('description', description);

  const priceAmount = typeof parsed.price_amount === 'number' ? parsed.price_amount : null;
  const priceCurrency = typeof parsed.price_currency === 'string' ? parsed.price_currency : null;
  const salePrice = typeof parsed.sale_price === 'number' ? parsed.sale_price : null;
  const price = priceAmount !== null ? { amount: priceAmount, currency: priceCurrency, sale_price: salePrice } : null;
  setField('price', price);

  const availability = parseAvailability(parsed.availability);
  setField('availability', availability);

  const categories = Array.isArray(parsed.categories)
    ? parsed.categories.filter((c): c is string => typeof c === 'string')
    : [];

  const color = Array.isArray(parsed.color)
    ? parsed.color.filter((c): c is string => typeof c === 'string')
    : [];

  const material = Array.isArray(parsed.material)
    ? parsed.material.filter((m): m is string => typeof m === 'string')
    : [];

  const dimensions = parsed.dimensions && typeof parsed.dimensions === 'object'
    ? Object.fromEntries(
        Object.entries(parsed.dimensions as Record<string, unknown>)
          .map(([k, v]) => [k, String(v)])
      )
    : null;

  const fieldCount = Object.keys(perField).length;
  const overall = fieldCount > 0
    ? Object.values(perField).reduce((a, b) => a + b, 0) / fieldCount
    : 0;

  return {
    extraction_method: 'llm',
    product_name: productName,
    brand,
    description,
    price,
    availability,
    categories,
    image_urls: imageUrls,
    primary_image_url: imageUrls[0] ?? null,
    color,
    material,
    dimensions,
    schema_org_raw: null,
    confidence: { overall, per_field: perField },
  };
}

function parseAvailability(value: unknown): ProductData['availability'] {
  if (typeof value !== 'string') return 'unknown';
  const lower = value.toLowerCase();
  if (lower === 'in_stock') return 'in_stock';
  if (lower === 'out_of_stock') return 'out_of_stock';
  if (lower === 'preorder') return 'preorder';
  return 'unknown';
}
