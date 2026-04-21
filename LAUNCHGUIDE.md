# ShopGraph

## Tagline
The extraction API that shows its work.

## Description
ShopGraph extracts product data from any URL and shows you exactly how each field was derived. Per-field provenance and confidence based on extraction method, not opinion. Your automation decides what's reliable enough to act on.

Hosted remote MCP server at `https://shopgraph.dev/mcp`. 50 free calls per month, no signup. Paid usage via API key (`sg_live_…`) or pay-per-call via Stripe MPP.

## Setup Requirements
- `payment_method_id` (optional): Stripe payment method ID for pay-per-call agent usage via Stripe MPP. Get one from your Stripe account at https://stripe.com. Free tier works without this.
- `strict_confidence_threshold` (optional): Number between 0 and 1. Fields with per-field confidence below this are omitted from the response server-side. Useful for autonomous agents that should never act on low-confidence data.
- `format` (optional): Set to `ucp` for Universal Commerce Protocol output (validated against the [`ucp-schema` v1.1.0](https://lib.rs/crates/ucp-schema) validator). Default returns ShopGraph's native JSON shape.

## Category
Developer Tools

## Features
- Per-field confidence scoring (0–1) on every extracted field
- Extraction provenance: every field labeled with the method that produced it (Schema.org, LLM, or headless browser)
- Server-side confidence gating via `strict_confidence_threshold` — uncertain fields never reach your agent
- UCP (Universal Commerce Protocol) output format for agent interoperability
- Three-tier extraction pipeline: Schema.org/JSON-LD → LLM inference → headless Playwright
- Works on any product URL across retailers, DTC brands, and B2B suppliers
- Bring-your-own-HTML mode for use with Bright Data, Firecrawl, or any fetch/proxy tool
- Zero-signup free tier (50 calls/month, IP-based)
- Pay-per-call via Stripe Machine Payments Protocol — agents authenticate with a payment method instead of an API key
- 24-hour caching on successful extractions (cached results are free)
- No charge on failed extractions

## Getting Started
- "Get me the price, availability, and brand for https://www.allbirds.com/products/mens-tree-runners"
- "Extract structured data from this product URL and only return fields with confidence above 0.8"
- "Return the UCP-compatible output for this URL so my agent can consume it"
- Tool: `enrich_product` — Full extraction pipeline with per-field confidence and provenance. Use when you need reliable product data from any retailer URL.
- Tool: `enrich_basic` — Schema.org-only extraction. Use when the site has good structured data and you want the fastest, cheapest path.
- Tool: `enrich_html` — Bring your own HTML. Use when you've already fetched the page via another tool (Bright Data, Firecrawl, a headless browser) and just need structuring.

## Tags
commerce, e-commerce, product-data, shopping, price-extraction, product-enrichment, schema-org, ai-agents, agentic-commerce, catalog, retail, DTC, B2B, open-web, structured-data, stripe-mpp, confidence-scoring, extraction-provenance, ucp, universal-commerce-protocol

## Documentation URL
https://shopgraph.dev/install

## Health Check URL
https://shopgraph.dev/health
