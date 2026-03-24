import { describe, it, expect } from 'vitest';
import { TOOL_PRICING } from './types.js';

describe('types', () => {
  it('has correct tool pricing', () => {
    expect(TOOL_PRICING.enrich_product).toBe(2);
    expect(TOOL_PRICING.enrich_basic).toBe(1);
  });
});
