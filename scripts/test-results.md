# ShopGraph Phase 1 — Real URL Test Results

Run: 2026-03-24T21:27:24.723Z

## Summary

- **Total URLs**: 20
- **Success**: 9 (3 schema_org, 6 llm)
- **Blocked**: 4
- **Empty**: 1
- **Errors**: 6
- **Success rate (all)**: 45%
- **Success rate (reachable)**: 56%

## Results

| # | Site | Status | Method | Fields Found | Confidence | Duration | Notes |
|---|------|--------|--------|-------------|------------|----------|-------|
| 1 | Allbirds (Shopify) | success | llm | name, brand, description, price, availability, categories, images, primary_image, color, material, dimensions | 0.70 | 10219ms | Men's Tree Runners |
| 2 | Gymshark (Shopify) | error | — | — | — | 412ms | HTTP 404: Not Found |
| 3 | Glossier (Shopify) | success | schema_org | name, brand, description, price, availability, images, primary_image | 0.95 | 292ms | Boy Brow |
| 4 | Brooklinen (Shopify) | success | llm | name, brand, description, categories, images, primary_image, material, dimensions | 0.68 | 7350ms | Luxe Sateen Sheet Set |
| 5 | Target | success | llm | name, brand, description, availability, images, primary_image, color, material, dimensions | 0.68 | 8920ms | Emma and Oliver 2x10 Ultra Soft Shaded … |
| 6 | Walmart | success | schema_org | name, brand, description, price, availability, images, primary_image | 0.95 | 1614ms | Pre-Owned Apple AirPods Pro (2nd Genera… |
| 7 | Best Buy | error | — | — | — | 15004ms | This operation was aborted |
| 8 | Everlane | error | — | — | — | 246ms | HTTP 404: Not Found |
| 9 | Patagonia | success | schema_org | name, description, price, availability, images, primary_image, color | 0.95 | 1199ms | Men's Grayling Brown Better Sweater® Fl… |
| 10 | Casper | error | — | — | — | 557ms | HTTP 404: Not Found |
| 11 | Nike | error | — | — | — | 519ms | HTTP 404: Not Found |
| 12 | Adidas | blocked | — | — | — | 219ms | HTTP 403: Forbidden |
| 13 | Uniqlo | error | — | — | — | 980ms | HTTP 404: Not Found |
| 14 | West Elm | empty | schema_org | — | — | 8935ms | No data extracted |
| 15 | CB2 | blocked | — | — | — | 239ms | HTTP 403: Forbidden |
| 16 | Apple Store | success | llm | name, brand, description, availability, categories, images, primary_image, color, material | 0.68 | 17875ms | iPhone |
| 17 | Google Store | success | llm | name, brand, description, price, categories, images, primary_image, color, dimensions | 0.70 | 8451ms | Pixel 9 Pro |
| 18 | Sephora | blocked | — | — | — | 232ms | HTTP 403: Forbidden |
| 19 | REI | blocked | — | — | — | 146ms | HTTP 403: Forbidden |
| 20 | Amazon | success | llm | name, brand, description, price, categories, images, primary_image, color, dimensions | 0.70 | 15130ms | Apple 2023 MacBook Pro Laptop with Appl… |

## Field Coverage (successful extractions)

- **name**: 9/9 (100%)
- **brand**: 8/9 (89%)
- **description**: 9/9 (100%)
- **price**: 6/9 (67%)
- **availability**: 6/9 (67%)
- **categories**: 5/9 (56%)
- **images**: 9/9 (100%)
- **primary_image**: 9/9 (100%)
- **color**: 6/9 (67%)
- **material**: 4/9 (44%)
- **dimensions**: 5/9 (56%)
