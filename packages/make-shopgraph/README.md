# ShopGraph — Make.com Custom App

Extract structured product data from any open-web product URL with per-field confidence scores, UCP-compatible output, and agent-readiness scoring.

**Website:** [shopgraph.dev](https://shopgraph.dev)

## Installation

1. In Make.com, go to **My Apps** in the left sidebar.
2. Click **Create a new app**.
3. Import the JSON files from this directory:
   - `base.json` as the app base configuration
   - `connections/api-key.json` as the connection definition
   - Each file in `modules/` as a separate module definition
   - `common.json` contains shared parameter definitions for reference
4. Save and publish the app to your organization.

## Available Modules

### Enrich Product (Full)
**Endpoint:** `POST /api/enrich`
Full extraction using Schema.org + LLM + browser fallback. Returns comprehensive product data with per-field confidence scores. Cost: $0.02/call.

### Enrich Product (Basic)
**Endpoint:** `POST /api/enrich/basic`
Schema.org-only extraction. Free tier: 500 calls/month, no API key required. Good for pages with well-structured markup.

### Enrich from HTML
**Endpoint:** `POST /api/enrich/html`
Extract product data from raw HTML you already have. Requires both the HTML content and the original page URL (for context). Cost: $0.02/call.

### Score Product
**Endpoint:** `POST /api/score`
Full extraction plus an AgentReady score (0-100) indicating how well-structured the extracted data is for AI agent consumption. Cost: $0.02/call.

## Authentication

All modules support API key authentication via the `Authorization: Bearer <key>` header. Get your API key at [shopgraph.dev/dashboard](https://shopgraph.dev/dashboard).

The **Enrich Product (Basic)** module works without an API key on the free tier (500 calls/month per IP).

## Output Formats

- **Default (ProductData):** Structured JSON with per-field confidence scores
- **UCP (Universal Commerce Protocol):** Standardized commerce data format

## Common Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| Confidence Threshold | Number (0.0-1.0) | Fields below this confidence are scrubbed to null |
| Output Format | Select | Default (ProductData) or UCP |
| Include AgentReady Score | Boolean | Adds agent-readiness score to response |

## File Structure

```
packages/make-shopgraph/
  base.json                  — App base configuration
  common.json                — Shared parameter definitions
  connections/
    api-key.json             — API key connection definition
  modules/
    enrich-product.json      — Full extraction module
    enrich-basic.json        — Basic (free) extraction module
    enrich-html.json         — HTML extraction module
    score-product.json       — AgentReady scoring module
```
