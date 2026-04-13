# ShopGraph — Make.com Custom App

Authenticated product data extraction. Extract structured product data from any product page URL or raw HTML, with per-field confidence scores and UCP-compatible output.

**Website:** [shopgraph.dev](https://shopgraph.dev)

## Setup

### 1. Create the Custom App

1. In Make.com, go to **My Apps** in the left sidebar.
2. Click **Create a new app**.
3. Set the app name to "ShopGraph" and import the configuration files:
   - `app.json` — app metadata (name, label, description, version)
   - `base.json` — base HTTP configuration (URL, default headers)
   - `connections/api-key.json` — connection definition (API key auth)
4. Save the app.

### 2. Add Modules

For each module directory under `modules/`, create a new module in your app:

- **enrich-product** — Extract product data from a URL
- **enrich-html** — Extract product data from raw HTML

Each module directory contains four files:

| File | Purpose |
|------|---------|
| `communication.json` | HTTP request/response configuration |
| `parameters.json` | Input fields shown to the user |
| `expect.json` | Expected output field definitions |
| `interface.json` | Output mapping for downstream modules |

### 3. Configure a Connection

When adding the ShopGraph module to a scenario, create a connection:

- **API Key** (required): Your ShopGraph API key, starting with `sg_live_`. Get one at [shopgraph.dev/dashboard](https://shopgraph.dev/dashboard).
- **Base URL** (optional): Defaults to `https://shopgraph.dev`. Only change for self-hosted instances.

## Modules

### Enrich Product

Extract structured product data from a URL.

- **Endpoint:** `POST /api/enrich`
- **Input:** Product URL (required), Output Format (optional, default: shopgraph)
- **Output:** Product object with name, brand, price, availability, categories, confidence scores, and ShopGraph metadata

### Enrich from HTML

Extract structured product data from raw HTML content you already have.

- **Endpoint:** `POST /api/enrich`
- **Input:** HTML content (required, multiline), Output Format (optional, default: shopgraph)
- **Output:** Same product object as Enrich Product

## Output Formats

- **ShopGraph** (default): Structured JSON with per-field confidence scores and extraction metadata
- **UCP**: Universal Commerce Protocol — standardized commerce data format

## Example Output

```json
{
  "product": {
    "url": "https://www.grainger.com/product/DAYTON-1-2-HP-Jet-Pump-5UXK1",
    "product_name": "DAYTON 1/2 HP Jet Pump, Model 5UXK1",
    "brand": "DAYTON",
    "price": { "amount": 284.00, "currency": "USD" },
    "availability": "in_stock",
    "categories": ["Jet Pumps", "Pumps", "Plumbing"],
    "confidence": { "overall": 0.93 },
    "_shopgraph": { "extraction_method": "schema_org", "data_source": "live" }
  },
  "cached": false,
  "credit_mode": "standard"
}
```

## File Structure

```
packages/make-shopgraph/
  app.json                              — App metadata
  base.json                             — Base HTTP configuration
  connections/
    api-key.json                        — API key connection
  modules/
    enrich-product/
      communication.json                — HTTP config
      parameters.json                   — Input fields
      expect.json                       — Output schema
      interface.json                    — Output mapping
    enrich-html/
      communication.json                — HTTP config
      parameters.json                   — Input fields
      expect.json                       — Output schema
      interface.json                    — Output mapping
  README.md
```
