/**
 * AgentReady — product data agent-readiness scoring for ShopGraph.
 *
 * Pure scoring function: takes a ProductData, returns a score.
 * No API calls, no Redis, no side effects — just math on ProductData.
 *
 * Scores across 5 dimensions (weights sum to 1.0):
 *   1. Structured data completeness (0.30)
 *   2. Semantic richness (0.20)
 *   3. UCP compatibility (0.20)
 *   4. Pricing clarity (0.15)
 *   5. Inventory signal quality (0.15)
 *
 * B2B-specific signals (MOQ, lead time, bulk pricing, part numbers)
 * are detected from description/dimensions and award bonus points
 * without penalizing B2C products that lack them.
 */

import type { ProductData } from './types.js';
import { mapToUcp, validateUcpOutput } from './ucp-mapper.js';
import { getCachedProbe } from './access-probe.js';

// ── Public types ────────────────────────────────────────────────────

export interface AgentReadyScore {
  agent_readiness_score: number; // 0-100
  scoring_breakdown: {
    structured_data_completeness: DimensionScore;
    semantic_richness: DimensionScore;
    ucp_compatibility: DimensionScore;
    pricing_clarity: DimensionScore;
    inventory_signal_quality: DimensionScore;
    access_readiness: DimensionScore;
  };
  scoring_version: string;
  methodology_url: string;
}

export interface DimensionScore {
  score: number; // 0-100
  weight: number; // 0.0-1.0
  weighted_contribution: number; // score * weight
  details: Record<string, string | number | boolean>;
}

// ── Constants ───────────────────────────────────────────────────────

export const SCORING_VERSION = '2026-04-08-v1';
export const METHODOLOGY_URL = 'https://shopgraph.dev/methodology';

// ── B2B signal detection helpers ────────────────────────────────────

const MOQ_PATTERNS = [
  /\bm\.?o\.?q\.?\b/i,
  /\bminimum\s+order\s+quantit/i,
  /\bmin\.?\s*order\b/i,
  /\bminimum\s+purchase\b/i,
];

const LEAD_TIME_PATTERNS = [
  /\blead\s+time\b/i,
  /\bdelivery\s+time\b/i,
  /\bships?\s+in\s+\d/i,
  /\bprocessing\s+time\b/i,
  /\bavailable\s+in\s+\d+\s+(day|week|business)/i,
];

const BULK_PRICING_PATTERNS = [
  /\bbulk\s+pric/i,
  /\btier(ed)?\s+pric/i,
  /\bvolume\s+discount/i,
  /\bquantity\s+discount/i,
  /\bbuy\s+\d+\s+get\b/i,
  /\bwholesale\b/i,
];

const PART_NUMBER_PATTERNS = [
  /\bpart\s*#?\s*:?\s*[A-Z0-9-]{3,}/i,
  /\bsku\s*:?\s*[A-Z0-9-]{3,}/i,
  /\bmpn\s*:?\s*[A-Z0-9-]{3,}/i,
  /\bmodel\s*#?\s*:?\s*[A-Z0-9-]{3,}/i,
  /\bitem\s*#?\s*:?\s*[A-Z0-9-]{3,}/i,
  /\bupc\s*:?\s*\d{8,}/i,
];

const SPEC_TABLE_PATTERNS = [
  /\bspecification/i,
  /\btechnical\s+data\b/i,
  /\bproduct\s+details?\b/i,
];

function matchesAnyPattern(text: string, patterns: RegExp[]): boolean {
  return patterns.some(p => p.test(text));
}

/**
 * Gather all searchable text from a product for B2B signal detection.
 */
function getSearchableText(product: ProductData): string {
  const parts: string[] = [];
  if (product.description) parts.push(product.description);
  if (product.dimensions) {
    for (const [k, v] of Object.entries(product.dimensions)) {
      parts.push(`${k}: ${v}`);
    }
  }
  if (product.product_name) parts.push(product.product_name);
  if (product.categories.length > 0) parts.push(product.categories.join(' '));
  return parts.join(' ');
}

// ── Dimension scorers ───────────────────────────────────────────────

/**
 * Dimension 1: Structured data completeness (weight: 0.30)
 */
function scoreStructuredDataCompleteness(product: ProductData): DimensionScore {
  const coreFields: Array<{ name: string; present: boolean }> = [
    { name: 'title', present: product.product_name !== null && product.product_name !== '' },
    { name: 'price', present: product.price !== null && product.price.amount !== null },
    { name: 'description', present: product.description !== null && product.description !== '' },
    { name: 'availability', present: product.availability !== 'unknown' },
    { name: 'images', present: product.image_urls.length > 0 || product.primary_image_url !== null },
    { name: 'brand', present: product.brand !== null && product.brand !== '' },
    { name: 'categories', present: product.categories.length > 0 },
    { name: 'specs', present: product.dimensions !== null && Object.keys(product.dimensions).length > 0 },
  ];

  const details: Record<string, string | number | boolean> = {};
  let presentCount = 0;
  for (const field of coreFields) {
    details[field.name] = field.present ? 'present' : 'missing';
    if (field.present) presentCount++;
  }

  // Base score from core fields
  let score = (presentCount / coreFields.length) * 100;

  // B2B bonus: detect signals in text, cap bonus at 10 points
  const text = getSearchableText(product);
  let b2bBonus = 0;
  const b2bFields = [
    { name: 'part_number', detected: matchesAnyPattern(text, PART_NUMBER_PATTERNS) },
    { name: 'moq', detected: matchesAnyPattern(text, MOQ_PATTERNS) },
    { name: 'lead_time', detected: matchesAnyPattern(text, LEAD_TIME_PATTERNS) },
    { name: 'bulk_pricing', detected: matchesAnyPattern(text, BULK_PRICING_PATTERNS) },
  ];

  for (const field of b2bFields) {
    details[`b2b_${field.name}`] = field.detected ? 'detected' : 'not_detected';
    if (field.detected) b2bBonus += 2.5;
  }

  score = Math.min(100, score + b2bBonus);
  details.b2b_bonus = b2bBonus;

  const weight = 0.30;
  return {
    score: Math.round(score * 100) / 100,
    weight,
    weighted_contribution: Math.round(score * weight * 100) / 100,
    details,
  };
}

/**
 * Dimension 2: Semantic richness (weight: 0.20)
 */
function scoreSemanticRichness(product: ProductData): DimensionScore {
  const details: Record<string, string | number | boolean> = {};
  let totalPoints = 0;
  const maxPoints = 100;

  // Category depth (deeper = better, max 25 pts)
  const categoryDepth = product.categories.length;
  const categoryScore = Math.min(25, categoryDepth * 8);
  details.category_count = categoryDepth;
  details.category_score = categoryScore;
  totalPoints += categoryScore;

  // Attribute count: color, material, dimensions keys (max 25 pts)
  let attrCount = 0;
  attrCount += product.color.length;
  attrCount += product.material.length;
  if (product.dimensions) attrCount += Object.keys(product.dimensions).length;
  const attrScore = Math.min(25, attrCount * 5);
  details.attribute_count = attrCount;
  details.attribute_score = attrScore;
  totalPoints += attrScore;

  // Variant coverage: multiple colors or materials suggest variants (max 25 pts)
  const variantSignals = Math.max(product.color.length, product.material.length);
  const variantScore = variantSignals >= 3 ? 25 : variantSignals >= 2 ? 15 : variantSignals >= 1 ? 8 : 0;
  details.variant_signals = variantSignals;
  details.variant_score = variantScore;
  totalPoints += variantScore;

  // Description quality (max 25 pts)
  const descLength = product.description?.length ?? 0;
  let descScore = 0;
  if (descLength >= 200) descScore = 25;
  else if (descLength >= 100) descScore = 20;
  else if (descLength >= 50) descScore = 15;
  else if (descLength > 0) descScore = 5;
  details.description_length = descLength;
  details.description_quality_score = descScore;
  totalPoints += descScore;

  const score = Math.min(maxPoints, totalPoints);
  const weight = 0.20;
  return {
    score: Math.round(score * 100) / 100,
    weight,
    weighted_contribution: Math.round(score * weight * 100) / 100,
    details,
  };
}

/**
 * Dimension 3: UCP compatibility (weight: 0.20)
 */
function scoreUcpCompatibility(product: ProductData): DimensionScore {
  const details: Record<string, string | number | boolean> = {};

  // Required UCP fields: item.id (url), item.title (product_name), item.price (price.amount)
  const requiredFields = [
    { name: 'item_id', present: !!product.url },
    { name: 'item_title', present: product.product_name !== null && product.product_name !== '' },
    { name: 'item_price', present: product.price !== null && product.price.amount !== null },
  ];

  let requiredPresent = 0;
  for (const f of requiredFields) {
    details[`required_${f.name}`] = f.present;
    if (f.present) requiredPresent++;
  }
  details.required_present = requiredPresent;
  details.required_total = requiredFields.length;

  // Optional UCP-relevant fields
  const optionalFields = [
    { name: 'image_url', present: product.primary_image_url !== null },
    { name: 'brand', present: product.brand !== null && product.brand !== '' },
    { name: 'description', present: product.description !== null && product.description !== '' },
    { name: 'availability', present: product.availability !== 'unknown' },
    { name: 'categories', present: product.categories.length > 0 },
    { name: 'currency', present: product.price?.currency !== null && product.price?.currency !== undefined },
    { name: 'color', present: product.color.length > 0 },
    { name: 'material', present: product.material.length > 0 },
  ];

  let optionalPresent = 0;
  for (const f of optionalFields) {
    details[`optional_${f.name}`] = f.present;
    if (f.present) optionalPresent++;
  }
  details.optional_present = optionalPresent;
  details.optional_total = optionalFields.length;

  // Validate actual UCP mapping
  const ucpResult = mapToUcp(product);
  const ucpValid = ucpResult.valid;
  details.ucp_mapping_valid = ucpValid;

  if (ucpValid) {
    const validation = validateUcpOutput(ucpResult.line_item);
    details.ucp_output_valid = validation.valid;
    if (validation.missing_fields.length > 0) {
      details.ucp_missing = validation.missing_fields.join(', ');
    }
  }

  // Score: required fields dominate (60%), optional fields (25%), actual validation (15%)
  const requiredScore = (requiredPresent / requiredFields.length) * 60;
  const optionalScore = (optionalPresent / optionalFields.length) * 25;
  const validationScore = ucpValid ? 15 : 0;

  const score = Math.min(100, requiredScore + optionalScore + validationScore);
  const weight = 0.20;
  return {
    score: Math.round(score * 100) / 100,
    weight,
    weighted_contribution: Math.round(score * weight * 100) / 100,
    details,
  };
}

/**
 * Dimension 4: Pricing clarity (weight: 0.15)
 */
function scorePricingClarity(product: ProductData): DimensionScore {
  const details: Record<string, string | number | boolean> = {};

  if (product.price === null || product.price.amount === null) {
    details.base_price = false;
    details.currency = false;
    details.sale_price = false;
    details.bulk_pricing_detected = false;
    details.moq_detected = false;
    return {
      score: 0,
      weight: 0.15,
      weighted_contribution: 0,
      details,
    };
  }

  let score = 0;

  // Base price present (40 pts)
  const hasBasePrice = product.price.amount !== null;
  details.base_price = hasBasePrice;
  if (hasBasePrice) score += 40;

  // Currency present (20 pts)
  const hasCurrency = product.price.currency !== null && product.price.currency !== undefined && product.price.currency !== '';
  details.currency = hasCurrency;
  if (hasCurrency) score += 20;

  // Sale price info (15 pts)
  const hasSalePrice = product.price.sale_price !== null && product.price.sale_price !== undefined;
  details.sale_price = hasSalePrice;
  if (hasSalePrice) score += 15;

  // B2B: bulk/tier pricing detected (15 pts)
  const text = getSearchableText(product);
  const hasBulkPricing = matchesAnyPattern(text, BULK_PRICING_PATTERNS);
  details.bulk_pricing_detected = hasBulkPricing;
  if (hasBulkPricing) score += 15;

  // B2B: MOQ detected (10 pts)
  const hasMoq = matchesAnyPattern(text, MOQ_PATTERNS);
  details.moq_detected = hasMoq;
  if (hasMoq) score += 10;

  score = Math.min(100, score);
  const weight = 0.15;
  return {
    score: Math.round(score * 100) / 100,
    weight,
    weighted_contribution: Math.round(score * weight * 100) / 100,
    details,
  };
}

/**
 * Dimension 5: Inventory signal quality (weight: 0.15)
 */
function scoreInventorySignalQuality(product: ProductData): DimensionScore {
  const details: Record<string, string | number | boolean> = {};

  if (product.availability === 'unknown') {
    details.stock_status = false;
    details.stock_status_value = 'unknown';
    details.quantity_available = false;
    details.lead_time_detected = false;
    details.backorder_detected = false;
    return {
      score: 0,
      weight: 0.15,
      weighted_contribution: 0,
      details,
    };
  }

  let score = 0;

  // Stock status present and specific (40 pts)
  // After early return above, availability is always a concrete value
  details.stock_status = true;
  details.stock_status_value = product.availability;
  score += 40;

  // Preorder is more informative than binary in/out (bonus 10 pts)
  if (product.availability === 'preorder') {
    score += 10;
    details.preorder_signal = true;
  }

  // Check for quantity information in description/dimensions (25 pts)
  const text = getSearchableText(product);
  const hasQuantity = /\b\d+\s*(in\s+stock|available|remaining|left)\b/i.test(text) ||
    /\bstock\s*:\s*\d+/i.test(text) ||
    /\bquantity\s*(available)?\s*:\s*\d+/i.test(text);
  details.quantity_available = hasQuantity;
  if (hasQuantity) score += 25;

  // B2B: lead time detected (20 pts)
  const hasLeadTime = matchesAnyPattern(text, LEAD_TIME_PATTERNS);
  details.lead_time_detected = hasLeadTime;
  if (hasLeadTime) score += 20;

  // Backorder info (15 pts)
  const hasBackorder = /\bback\s*order/i.test(text) || /\bpre-?order\b/i.test(text);
  details.backorder_detected = hasBackorder;
  if (hasBackorder) score += 15;

  score = Math.min(100, score);
  const weight = 0.15;
  return {
    score: Math.round(score * 100) / 100,
    weight,
    weighted_contribution: Math.round(score * weight * 100) / 100,
    details,
  };
}

// ── Access readiness feature flag ──────────────────────────────────
// Set by the test runner when >10% of corpus URLs require Web Bot Auth.
// Read from Redis at request time and cached for the process lifetime.
let _accessReadinessActive = false;

/** Called at startup or when the feature flag changes in Redis. */
export function setAccessReadinessActive(active: boolean): void {
  _accessReadinessActive = active;
}

export function isAccessReadinessActive(): boolean {
  return _accessReadinessActive;
}

/** Weights when access readiness is active (redistributed from original 5) */
const ACTIVE_WEIGHTS = {
  structured_data_completeness: 0.25,
  semantic_richness: 0.18,
  ucp_compatibility: 0.17,
  pricing_clarity: 0.13,
  inventory_signal_quality: 0.12,
  access_readiness: 0.15,
} as const;

/**
 * Dimension 6: Access readiness (weight: 0.00 stub, or 0.15 when active)
 *
 * Measures whether the source URL requires Web Bot Auth (RFC 9421),
 * pay-per-crawl (Cloudflare AI Crawl Control), or agent identity.
 *
 * Activation is automatic: the test runner sets the feature flag
 * `feature:access_readiness_active` in Redis when >10% of corpus
 * URLs require agent identity.
 */
function scoreAccessReadiness(product: ProductData): DimensionScore {
  const weight = _accessReadinessActive ? ACTIVE_WEIGHTS.access_readiness : 0.00;

  // When active, read real probe results from the in-memory cache.
  // probeAccess() was called during extractProduct() and cached the result.
  if (_accessReadinessActive) {
    const probe = getCachedProbe(product.url);
    if (probe) {
      return {
        score: probe.score,
        weight,
        weighted_contribution: Math.round(probe.score * weight * 100) / 100,
        details: {
          access_level: probe.access_level,
          access_label: probe.access_label,
          unsigned_status: probe.unsigned_status,
          signed_status: probe.signed_status ?? 'n/a',
          requires_payment: probe.requires_payment,
          cloudflare_detected: probe.cloudflare_detected,
          feature_flag_active: true,
          from_cache: probe.from_cache,
          note: `Access probe: ${probe.access_label} (unsigned ${probe.unsigned_status}${probe.signed_status ? `, signed ${probe.signed_status}` : ''})`,
        },
      };
    }
  }

  // Stub response: flag inactive or no probe data available
  return {
    score: 100,
    weight,
    weighted_contribution: Math.round(100 * weight * 100) / 100,
    details: {
      access_level: 5,
      access_label: 'fully_open',
      feature_flag_active: _accessReadinessActive,
      note: _accessReadinessActive
        ? 'Access readiness active but no probe data for this URL. Defaulting to fully_open.'
        : 'Access readiness scoring activates when Web Bot Auth adoption reaches detection threshold. Currently all test corpus URLs are fully open.',
    },
  };
}

// ── Main scoring function ───────────────────────────────────────────

/**
 * Score a product's agent-readiness across 6 dimensions.
 *
 * Pure function — no API calls, no side effects. Just math on ProductData.
 *
 * Dimensions 1-5 carry all weight (sum to 1.0). Dimension 6 (access
 * readiness) is a documented stub at weight 0.00 — present in the
 * schema so consumers don't face a breaking change when it activates.
 */
export function scoreAgentReadiness(product: ProductData): AgentReadyScore {
  const structured = scoreStructuredDataCompleteness(product);
  const semantic = scoreSemanticRichness(product);
  const ucp = scoreUcpCompatibility(product);
  const pricing = scorePricingClarity(product);
  const inventory = scoreInventorySignalQuality(product);
  const access = scoreAccessReadiness(product);

  // When access readiness is active, redistribute weights
  if (_accessReadinessActive) {
    structured.weight = ACTIVE_WEIGHTS.structured_data_completeness;
    structured.weighted_contribution = Math.round(structured.score * structured.weight * 100) / 100;
    semantic.weight = ACTIVE_WEIGHTS.semantic_richness;
    semantic.weighted_contribution = Math.round(semantic.score * semantic.weight * 100) / 100;
    ucp.weight = ACTIVE_WEIGHTS.ucp_compatibility;
    ucp.weighted_contribution = Math.round(ucp.score * ucp.weight * 100) / 100;
    pricing.weight = ACTIVE_WEIGHTS.pricing_clarity;
    pricing.weighted_contribution = Math.round(pricing.score * pricing.weight * 100) / 100;
    inventory.weight = ACTIVE_WEIGHTS.inventory_signal_quality;
    inventory.weighted_contribution = Math.round(inventory.score * inventory.weight * 100) / 100;
  }

  const overallScore =
    structured.weighted_contribution +
    semantic.weighted_contribution +
    ucp.weighted_contribution +
    pricing.weighted_contribution +
    inventory.weighted_contribution +
    access.weighted_contribution;

  return {
    agent_readiness_score: Math.round(overallScore * 100) / 100,
    scoring_breakdown: {
      structured_data_completeness: structured,
      semantic_richness: semantic,
      ucp_compatibility: ucp,
      pricing_clarity: pricing,
      inventory_signal_quality: inventory,
      access_readiness: access,
    },
    scoring_version: SCORING_VERSION,
    methodology_url: METHODOLOGY_URL,
  };
}
