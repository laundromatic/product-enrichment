# Framework PR Messaging Guide

## Positioning

ShopGraph's value is not extraction. Any extractor can pull product data from HTML. ShopGraph's value is **extraction provenance**: every field shows which method produced it, how methods agreed or disagreed, and a confidence score you can threshold. Server-side filtering removes uncertain fields before they reach your agent.

**Lead with the problem, not the mechanism:**
- Wrong: "Extract product data with confidence scores"
- Right: "When an agent writes a price into a purchase order, how does it know the price is right?"

### Locked Branding (Phase 4)

These five fields are the source of truth. All PR and customer-facing copy derives from them.

- **1-Liner:** The extraction API that shows its work.
- **Elevator pitch:** ShopGraph extracts product data from any URL using a three-tier pipeline (structured markup, LLM inference, headless browser), then tells you exactly which method produced each field and how confident the system is. You set the threshold. Fields that don't meet it never reach your agent.
- **Thesis:** Product data quality infrastructure for agent commerce.
- **Identity:** Extraction provenance layer.
- **Audience:** Builders of commerce automation whose pipelines write product data into downstream systems.

### Supporting one-liners (single-sentence use)

- "Extraction is a solved problem. Trust is not."
- "Every field shows which extraction method produced it and how methods agreed or disagreed."
- "A wrong price is worse than a missing price."
- "Your threshold, your rules."

### The confidence contract (the real product)

1. **Per-field confidence scores** (0.0-1.0) — not a flat number per response, but individual scores per field based on extraction method and source quality
2. **Server-side threshold enforcement** (`strict_confidence_threshold`) — low-confidence fields scrubbed before they enter agent context
3. **Multi-method calibration** — Schema.org (0.93 baseline), LLM (0.70), hybrid cross-signal validation
4. **Confidence decay** — cached prices decay over time; a 2-hour-old price at 0.85 becomes 0.15 confidence
5. **Autonomy/escalation pattern** — agent acts on high-confidence fields, routes low-confidence to human review

### Banned terms

deterministic, guaranteed, scraping, bypass, circumvent, unblock, fighting, toll roads (commerce), identity broker, OV identity, trust score, "the first" (unqualified)

### Banned patterns

No fear-based framing. No "the open web is moving behind..." No "CDN security gates." No "your pipelines will break." No negative assumptions about the developer's current approach. Describe capability, not catastrophe.

---

## API Response Shape Reference

All code examples use the real ShopGraph API response shape. See `docs/api-response-reference.json` for a complete snapshot.

**Key field paths:**

| Data | Path |
|------|------|
| Product name | `data.product.product_name` |
| Brand | `data.product.brand` |
| Price amount | `data.product.price.amount` |
| Price currency | `data.product.price.currency` |
| Availability | `data.product.availability` |
| Categories | `data.product.categories` |
| Overall confidence | `data.product.confidence.overall` |
| Per-field confidence | `data.product.confidence.per_field.<field>` |
| ShopGraph field confidence | `data.product._shopgraph.field_confidence.<field>` |
| Field freshness | `data.product._shopgraph.field_freshness.<field>` |
| Extraction method | `data.product._shopgraph.extraction_method` |
| Data source (live/cache) | `data.product._shopgraph.data_source` |
| Cached flag | `data.cached` |
| Credit mode | `data.credit_mode` |

**Confidence baselines (from `src/types.ts`):**

| Extraction method | Base | product_name | brand | description | price | availability |
|-------------------|------|-------------|-------|-------------|-------|-------------|
| schema_org | 0.93 | 0.98 | 0.93 | 0.88 | 0.93 | 0.83 |
| llm | 0.70 | 0.75 | 0.70 | 0.65 | 0.70 | 0.60 |
| llm_boosted | 0.85 | 0.90 | 0.85 | 0.80 | 0.85 | 0.75 |

**Pricing (current):**

- Playground: 50 calls/month, no signup required
- Starter: $99/month, 10K calls with API key
- Growth: $299/month, 50K calls
- Enterprise: custom

---

## PR #1: Vercel AI SDK

**Title:** `Add product extraction example with per-field confidence scoring (ShopGraph)`

### Opening (README.md)

Product extraction APIs return data. They don't tell you how much to trust each field. ShopGraph returns data with per-field confidence scores (0.0 to 1.0) so your UI can show users which fields to trust and which to verify.

This example builds a product research chat interface where extracted fields are color-coded by confidence: green for fields the agent trusts, amber for fields that need human verification.

### Why this matters

When an AI assistant shows a user a product price, the user needs to know: is this the real price, or did the extraction guess? ShopGraph's per-field confidence scores make this visible in the UI. A price extracted from structured Schema.org data gets 0.93 confidence. A price parsed by an LLM from page text gets 0.70. The UI renders them differently.

### Code pattern

```typescript
const response = await fetch("https://shopgraph.dev/api/enrich", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${process.env.SHOPGRAPH_API_KEY}`,
  },
  body: JSON.stringify({
    url: "https://www.moglix.com/bosch-1-2-inch-impact-wrench-gds-18-v-ec-250/mp/msne9bg5j9egz8",
  }),
});

const data = await response.json();

// Each field has its own confidence score
const priceConfidence = data.product._shopgraph.field_confidence.price;  // 0.93
const availConfidence = data.product._shopgraph.field_confidence.availability;  // 0.83

// UI decision: render differently based on confidence
if (priceConfidence >= 0.85) {
  // Green — show price normally
} else {
  // Amber — show price with "verification recommended" badge
}
```

### Additional API features (README section)

- **Server-side confidence filtering**: `?strict_confidence_threshold=0.85` scrubs low-confidence fields to `null` with an explanation — the server does the filtering instead of the client.
- **AgentReady scoring**: `?include_score=true` returns a 0-100 agent-readiness score across 6 dimensions.
- **UCP-compatible output**: `?format=ucp` returns data in Universal Commerce Protocol schema.
- **Leaderboard**: See which sites extract successfully at [shopgraph.dev/leaderboard](https://shopgraph.dev/leaderboard).

---

## PR #2: LangChain Cookbook

**Title:** `Add procurement agent cookbook with confidence-driven autonomy routing (ShopGraph)`

### Opening (first markdown cell)

When an agent writes a price into a purchase order, a wrong price is worse than a missing price. ShopGraph returns per-field confidence scores so the agent can decide: act autonomously on high-confidence fields, route low-confidence fields to human review.

This cookbook builds a procurement agent with two extraction modes, both using the same `enrich_product` call:
- **Research mode** — call `enrich_product` with no threshold. Returns all fields with per-field confidence scores. Human reviews everything.
- **Autofill mode** — call `enrich_product` with `strict_confidence_threshold` set. Fields below the threshold are scrubbed server-side before the response reaches the agent.

### Why server-side filtering

Client-side filtering (checking confidence after the response) still lets the agent *see* low-confidence data. In a long context window, the agent may reference a scrubbed price because it was visible earlier. Server-side filtering via `strict_confidence_threshold` removes the temptation — the field never enters the agent's context.

### Code pattern

```python
# Research mode — human reviews everything
data = enrich_product("https://www.moglix.com/bosch-1-2-inch-impact-wrench-gds-18-v-ec-250/mp/msne9bg5j9egz8")
# Returns all fields with confidence scores

# Autofill mode — agent only sees high-confidence fields
data = enrich_product(
    "https://www.moglix.com/bosch-1-2-inch-impact-wrench-gds-18-v-ec-250/mp/msne9bg5j9egz8",
    strict_confidence_threshold=0.9,
)
# Fields below 0.9 are scrubbed server-side — agent cannot see them
```

### System prompt (teaches the decision)

```
Use enrich_product for every extraction. Set the threshold based on downstream use:

- If researching a product or summarizing for a human, call enrich_product
  with no threshold. Show all fields with confidence scores. Flag anything
  below 0.85.

- If filling a purchase order or writing values into any system without
  human review, call enrich_product with strict_confidence_threshold=0.9.
  If a required field is missing in the response, stop and ask the human
  to verify.
```

---

## PR #3: CrewAI (not yet built)

**Title:** `Add confidence-aware commerce research tool for multi-agent workflows (ShopGraph)`

### Opening

When a multi-agent crew researches suppliers, the researcher agent needs to tell the analyst agent: "I'm confident about this price, but the availability data is unreliable." ShopGraph's per-field confidence scores give agents a shared language for data quality, so downstream agents don't silently propagate bad data.

---

## Messaging Rules

### DO use

- "Per-field confidence scores"
- "Confidence contract" (score + threshold + calibration + escalation)
- "Server-side threshold enforcement"
- "Autonomy/escalation pattern"
- "Which fields to trust and which to verify"
- "UCP-compliant product data"
- "Extraction method" (schema_org, llm, hybrid)
- "RFC 9421 signed requests to destination sites" (when discussing identity)

### DON'T use

- ~~"Authenticated product data extraction"~~ as the lead — extraction is the mechanism, not the value
- ~~"CDN security gates"~~ — fear-based framing
- ~~"The open web is moving behind..."~~ — catastrophizing
- ~~"identity handshake"~~ for customer-facing API — customers use Bearer tokens
- ~~deterministic, guaranteed~~ — extraction is probabilistic
- ~~scraping, bypass, circumvent, unblock~~ — adversarial framing
- ~~fighting, toll roads~~ — adversarial framing
- ~~identity broker, OV identity, trust score, "the first"~~

### Voice check

Before submitting any PR or public-facing text, verify:

1. Does it lead with the trust problem, not the extraction mechanism?
2. Does it name a ShopGraph-specific capability (server-side threshold, confidence decay, multi-method calibration)?
3. Is the tone capability-forward, not fear-based?
4. Does it use Moglix/Uline URLs (not Grainger/Home Depot)?
5. Are pricing claims current (50/month playground, $99 Starter)?
6. Are all code examples using the real response shape from `docs/api-response-reference.json`?
