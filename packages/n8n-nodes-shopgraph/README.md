# n8n-nodes-shopgraph

[n8n](https://n8n.io/) community node for [ShopGraph](https://shopgraph.dev) — an API that extracts structured product data from any e-commerce URL with confidence scores. Feed it a product page and get back clean, structured fields (title, price, images, specs, and more) ready for your automation workflows.

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
3. The **Enrich Basic** operation works without an API key (free tier, 500 calls/month). All other operations require an API key.

## Operations

| Operation | Description | API Key Required |
|-----------|-------------|-----------------|
| **Enrich Product** | Extract full structured product data from a URL | Yes |
| **Enrich Basic** | Extract basic product data (free tier) | No |
| **Enrich HTML** | Extract product data from raw HTML content | Yes |
| **Score Product** | Get product data quality scores for a URL | Yes |

### Shared Options

- **Strict Confidence Threshold** (0-1) — minimum confidence for fields to be included
- **Format** — response format (`default` or `ucp`)
- **Include Score** — include per-field confidence scores in the response

## Links

- [ShopGraph Documentation](https://shopgraph.dev/docs)
- [ShopGraph Dashboard](https://shopgraph.dev/dashboard)
- [n8n Community Nodes](https://docs.n8n.io/integrations/community-nodes/)
