import { describe, it, expect } from 'vitest';
import { scoreAgentReadiness, SCORING_VERSION, METHODOLOGY_URL } from '../agent-ready.js';
import type { ProductData } from '../types.js';

/** Build a full ProductData for testing. */
function makeProduct(overrides: Partial<ProductData> = {}): ProductData {
  return {
    url: 'https://example.com/product/123',
    extracted_at: '2026-04-07T12:00:00.000Z',
    extraction_method: 'schema_org',
    product_name: 'Test Widget',
    brand: 'WidgetCo',
    description: 'A fine widget for testing. It has excellent build quality and comes in multiple sizes for all your widget needs. Made from premium materials.',
    price: { amount: 29.99, currency: 'USD', sale_price: null },
    availability: 'in_stock',
    categories: ['Widgets', 'Testing', 'Home Goods'],
    image_urls: ['https://example.com/img1.jpg', 'https://example.com/img2.jpg'],
    primary_image_url: 'https://example.com/img1.jpg',
    color: ['Blue', 'Red'],
    material: ['Plastic', 'Metal'],
    dimensions: { width: '10cm', height: '5cm', depth: '3cm' },
    schema_org_raw: null,
    confidence: {
      overall: 0.93,
      per_field: {
        product_name: 0.98,
        brand: 0.93,
        description: 0.88,
        price: 0.93,
        availability: 0.83,
      },
    },
    _shopgraph: {
      source_url: 'https://example.com/product/123',
      extraction_timestamp: '2026-04-07T12:00:00.000Z',
      extraction_method: 'schema_org',
      field_confidence: { product_name: 0.98, brand: 0.93, price: 0.93 },
      confidence_method: 'tier_baseline',
    },
    ...overrides,
  };
}

describe('scoreAgentReadiness', () => {
  describe('complete B2C product (Shopify-like)', () => {
    it('scores high (80+) with all fields present', () => {
      const product = makeProduct();
      const result = scoreAgentReadiness(product);

      expect(result.agent_readiness_score).toBeGreaterThanOrEqual(80);
      expect(result.scoring_version).toBe(SCORING_VERSION);
      expect(result.methodology_url).toBe(METHODOLOGY_URL);
    });
  });

  describe('complete B2B product (Grainger-like with specs, MOQ)', () => {
    it('scores high with B2B signals present', () => {
      const product = makeProduct({
        description: 'Industrial-grade pump. Minimum Order Quantity: 10 units. Lead time: 5-7 business days. Volume discount available for orders over 50. SKU: PMP-4500-A. Specifications: flow rate 500 GPM, pressure 150 PSI.',
        categories: ['Industrial', 'Pumps', 'Fluid Handling', 'B2B Equipment'],
        dimensions: {
          flow_rate: '500 GPM',
          pressure: '150 PSI',
          weight: '45 lbs',
          voltage: '220V',
        },
      });
      const result = scoreAgentReadiness(product);

      expect(result.agent_readiness_score).toBeGreaterThanOrEqual(80);

      // B2B signals should be detected in structured_data_completeness
      const sdc = result.scoring_breakdown.structured_data_completeness;
      expect(sdc.details.b2b_moq).toBe('detected');
      expect(sdc.details.b2b_lead_time).toBe('detected');
      expect(sdc.details.b2b_bulk_pricing).toBe('detected');
      expect(sdc.details.b2b_part_number).toBe('detected');
      expect(sdc.details.b2b_bonus).toBeGreaterThan(0);
    });

    it('awards bonus points for MOQ in pricing clarity', () => {
      const product = makeProduct({
        description: 'MOQ: 25 units. Tier pricing available for bulk orders.',
      });
      const result = scoreAgentReadiness(product);
      const pricing = result.scoring_breakdown.pricing_clarity;

      expect(pricing.details.moq_detected).toBe(true);
      expect(pricing.details.bulk_pricing_detected).toBe(true);
    });

    it('detects lead_time in inventory signal quality', () => {
      const product = makeProduct({
        description: 'Ships in 3-5 business days. Available for backorder.',
      });
      const result = scoreAgentReadiness(product);
      const inventory = result.scoring_breakdown.inventory_signal_quality;

      expect(inventory.details.lead_time_detected).toBe(true);
      expect(inventory.details.backorder_detected).toBe(true);
    });
  });

  describe('minimal data (just product_name)', () => {
    it('scores low (<30) with only product_name', () => {
      const product = makeProduct({
        product_name: 'Mystery Item',
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
      });
      const result = scoreAgentReadiness(product);

      expect(result.agent_readiness_score).toBeLessThan(30);
    });
  });

  describe('missing price', () => {
    it('pricing_clarity should be 0 when price is null', () => {
      const product = makeProduct({ price: null });
      const result = scoreAgentReadiness(product);

      expect(result.scoring_breakdown.pricing_clarity.score).toBe(0);
      expect(result.scoring_breakdown.pricing_clarity.weighted_contribution).toBe(0);
    });
  });

  describe('missing availability', () => {
    it('inventory_signal_quality should be 0 when availability is unknown', () => {
      const product = makeProduct({ availability: 'unknown' });
      const result = scoreAgentReadiness(product);

      expect(result.scoring_breakdown.inventory_signal_quality.score).toBe(0);
      expect(result.scoring_breakdown.inventory_signal_quality.weighted_contribution).toBe(0);
    });
  });

  describe('UCP compatibility dimension', () => {
    it('uses actual mapToUcp validation', () => {
      const product = makeProduct();
      const result = scoreAgentReadiness(product);
      const ucp = result.scoring_breakdown.ucp_compatibility;

      expect(ucp.details.ucp_mapping_valid).toBe(true);
      expect(ucp.details.ucp_output_valid).toBe(true);
      expect(ucp.score).toBeGreaterThan(0);
    });

    it('fails UCP validation when required fields are missing', () => {
      const product = makeProduct({ product_name: null, price: null });
      const result = scoreAgentReadiness(product);
      const ucp = result.scoring_breakdown.ucp_compatibility;

      expect(ucp.details.ucp_mapping_valid).toBe(false);
      expect(ucp.score).toBeLessThan(50);
    });
  });

  describe('scoring_breakdown weights', () => {
    it('weights sum to 1.0', () => {
      const product = makeProduct();
      const result = scoreAgentReadiness(product);
      const breakdown = result.scoring_breakdown;

      const totalWeight =
        breakdown.structured_data_completeness.weight +
        breakdown.semantic_richness.weight +
        breakdown.ucp_compatibility.weight +
        breakdown.pricing_clarity.weight +
        breakdown.inventory_signal_quality.weight;

      expect(totalWeight).toBeCloseTo(1.0, 10);
    });
  });

  describe('scoring_version', () => {
    it('is present and matches expected format', () => {
      const product = makeProduct();
      const result = scoreAgentReadiness(product);

      expect(result.scoring_version).toBe('2026-04-08-v1');
      expect(result.scoring_version).toMatch(/^\d{4}-\d{2}-\d{2}-v\d+$/);
    });
  });

  describe('B2B products get bonus points', () => {
    it('B2B product with MOQ/lead_time scores higher than same product without', () => {
      const base = makeProduct();
      const b2b = makeProduct({
        description: 'Industrial widget. Minimum Order Quantity: 100. Lead time: 2 weeks. Bulk pricing available. Part #: WDG-100-PRO',
      });

      const baseResult = scoreAgentReadiness(base);
      const b2bResult = scoreAgentReadiness(b2b);

      // B2B bonus should increase structured_data_completeness
      expect(b2bResult.scoring_breakdown.structured_data_completeness.details.b2b_bonus)
        .toBeGreaterThan(baseResult.scoring_breakdown.structured_data_completeness.details.b2b_bonus as number);
    });
  });

  describe('overall score range', () => {
    it('is between 0 and 100', () => {
      const product = makeProduct();
      const result = scoreAgentReadiness(product);

      expect(result.agent_readiness_score).toBeGreaterThanOrEqual(0);
      expect(result.agent_readiness_score).toBeLessThanOrEqual(100);
    });

    it('empty product scores >= 0', () => {
      const product = makeProduct({
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
      });
      const result = scoreAgentReadiness(product);

      expect(result.agent_readiness_score).toBeGreaterThanOrEqual(0);
      expect(result.agent_readiness_score).toBeLessThanOrEqual(100);
    });
  });
});
