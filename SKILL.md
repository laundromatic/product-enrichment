---
name: shopgraph
description: "Extract structured product data from any URL using ShopGraph MCP server. Schema.org + AI extraction with per-field confidence scoring."
---

# ShopGraph — Product Data Extraction

## When to Use
Use this skill when you need to extract structured product information (title, price, brand, description, images, availability, categories) from any e-commerce URL or raw HTML.

## MCP Server Configuration

Connect to ShopGraph's remote MCP server:

```json
{
  "mcpServers": {
    "shopgraph": {
      "url": "https://shopgraph.dev/mcp"
    }
  }
}
```

Or install locally via npm:

```json
{
  "mcpServers": {
    "shopgraph": {
      "command": "node",
      "args": ["node_modules/shopgraph/dist/index.js"]
    }
  }
}
```

## Available Tools

### enrich_product ($0.02/call)
Full AI-powered product extraction from a URL. Schema.org first, Gemini LLM fallback, optional Playwright browser rendering. Returns structured data with per-field confidence scores.

### enrich_basic (free: 500/month)
Schema.org extraction only. Fast, no AI cost. Good for sites with proper structured data markup.

### enrich_html ($0.02/call)
Extract product data from raw HTML. Use when you already have the page content.

## Key Parameters

- `strict_confidence_threshold` (0.0-1.0): Scrub fields below this confidence to null with explanation. Useful for high-stakes pipelines.
- `format` ("default" | "ucp"): Return UCP-compatible line_item format for commerce protocol compliance.

## Usage Pattern

1. Start with `enrich_basic` to check if Schema.org data exists (free)
2. If confidence is low or data missing, escalate to `enrich_product` for AI extraction
3. Use `enrich_html` when working with pre-fetched HTML content
4. Set `strict_confidence_threshold=0.80` for production pipelines that need high-reliability data

## Authentication

- **Free tier**: No auth needed, 500 calls/month
- **API key**: `Authorization: Bearer sg_live_...` header for subscription tiers
- **MPP**: Include `payment_method_id` for per-call Stripe payments

## Output

Returns `ProductData` with:
- Product name, brand, description, price, availability
- Categories, images, colors, materials, dimensions
- `_shopgraph.field_confidence` — per-field confidence scores (0.0-1.0)
- `_shopgraph.confidence_method` — scoring mechanism used

Website: https://shopgraph.dev
