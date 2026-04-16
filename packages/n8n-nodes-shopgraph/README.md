# n8n-nodes-shopgraph

[n8n](https://n8n.io/) community node for [ShopGraph](https://shopgraph.dev) -- product data extraction that tells you when it's guessing. Feed it a product page URL (or raw HTML) and get back structured fields (name, brand, price, images, availability, categories) with per-field confidence scores, so your workflows know what to trust.

## Installation

In your n8n instance, go to **Settings > Community Nodes** and install:

```
n8n-nodes-shopgraph
```

Or install manually:

```bash
npm install n8n-nodes-shopgraph
```

## Credential Setup

1. In n8n, go to **Credentials > New Credential > ShopGraph API**.
2. Enter your API key (starts with `sg_live_...`). Get one at [shopgraph.dev/dashboard](https://shopgraph.dev/dashboard).
3. Optionally change the **Base URL** if you are running a self-hosted instance.

## Operations

| Operation | Description |
|-----------|-------------|
| **Enrich** | Extract structured product data from a URL |
| **Enrich HTML** | Extract structured product data from raw HTML content |

### Parameters

- **URL** (Enrich) -- The product page URL to extract data from.
- **HTML** (Enrich HTML) -- Raw HTML content of a product page.
- **Format** -- Response format: `ShopGraph` (default) or `UCP`.

### Example Output

```json
{
  "product": {
    "url": "https://www.example.com/product/widget",
    "product_name": "ACME Widget Pro",
    "brand": "ACME",
    "price": { "amount": 49.99, "currency": "USD" },
    "availability": "in_stock",
    "categories": ["Widgets", "Tools"],
    "image_urls": ["https://..."],
    "confidence": { "overall": 0.93 },
    "_shopgraph": {
      "extraction_method": "schema_org",
      "data_source": "live",
      "field_confidence": {}
    }
  },
  "cached": false,
  "credit_mode": "standard"
}
```

## Links

- [ShopGraph](https://shopgraph.dev)
- [ShopGraph Dashboard](https://shopgraph.dev/dashboard)
- [n8n Community Nodes](https://docs.n8n.io/integrations/community-nodes/)
