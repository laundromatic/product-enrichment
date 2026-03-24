import 'dotenv/config';
import { extractProduct } from '../src/extract.js';
import type { ProductData } from '../src/types.js';
import { writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

interface TestResult {
  url: string;
  label: string;
  status: 'success' | 'blocked' | 'error' | 'empty';
  method: string | null;
  fieldsFound: string[];
  confidence: number;
  notes: string;
  durationMs: number;
}

const TEST_URLS: { url: string; label: string }[] = [
  // SHOPIFY STORES
  { url: 'https://www.allbirds.com/products/mens-tree-runners', label: 'Allbirds (Shopify)' },
  { url: 'https://www.gymshark.com/products/gymshark-crest-t-shirt-black-aw24', label: 'Gymshark (Shopify)' },
  { url: 'https://www.glossier.com/products/boy-brow', label: 'Glossier (Shopify)' },
  { url: 'https://www.brooklinen.com/products/luxe-core-sheet-set', label: 'Brooklinen (Shopify)' },

  // BIG RETAILERS
  { url: 'https://www.target.com/p/stanley-quencher-h2-0-flowstate-tumbler-40oz/-/A-87710786', label: 'Target' },
  { url: 'https://www.walmart.com/ip/Apple-AirPods-Pro-2nd-Generation/1752657021', label: 'Walmart' },
  { url: 'https://www.bestbuy.com/site/apple-macbook-air-13-inch-laptop-m3-chip-8gb-memory-256gb/6565836.p', label: 'Best Buy' },

  // DTC / INDEPENDENT
  { url: 'https://www.everlane.com/products/mens-organic-crew-neck-tee', label: 'Everlane' },
  { url: 'https://www.patagonia.com/product/mens-better-sweater-fleece-jacket/25528.html', label: 'Patagonia' },
  { url: 'https://www.casper.com/mattresses/original/', label: 'Casper' },

  // FASHION
  { url: 'https://www.nike.com/t/air-max-90-mens-shoes-6n3vKB', label: 'Nike' },
  { url: 'https://www.adidas.com/us/ultraboost-5-shoes/ID8764.html', label: 'Adidas' },
  { url: 'https://www.uniqlo.com/us/en/products/E462666-000', label: 'Uniqlo' },

  // HOME/LIFESTYLE
  { url: 'https://www.westelm.com/products/mid-century-nightstand-h1939/', label: 'West Elm' },
  { url: 'https://www.cb2.com/acacia-nightstand/s336442', label: 'CB2' },

  // ELECTRONICS
  { url: 'https://www.apple.com/shop/buy-iphone/iphone-16-pro', label: 'Apple Store' },
  { url: 'https://store.google.com/us/product/pixel_9_pro', label: 'Google Store' },

  // SPECIALTY
  { url: 'https://www.sephora.com/product/mini-lip-injection-extreme-lip-plumper-P469005', label: 'Sephora' },
  { url: 'https://www.rei.com/product/223417/patagonia-nano-puff-jacket-mens', label: 'REI' },

  // BONUS — known good schema.org sites
  { url: 'https://www.amazon.com/dp/B0BSHF7WHW', label: 'Amazon' },
];

function countFields(data: ProductData): string[] {
  const fields: string[] = [];
  if (data.product_name) fields.push('name');
  if (data.brand) fields.push('brand');
  if (data.description) fields.push('description');
  if (data.price?.amount) fields.push('price');
  if (data.availability !== 'unknown') fields.push('availability');
  if (data.categories.length > 0) fields.push('categories');
  if (data.image_urls.length > 0) fields.push('images');
  if (data.primary_image_url) fields.push('primary_image');
  if (data.color.length > 0) fields.push('color');
  if (data.material.length > 0) fields.push('material');
  if (data.dimensions) fields.push('dimensions');
  return fields;
}

function truncate(s: string, n: number): string {
  return s.length > n ? s.slice(0, n - 1) + '…' : s;
}

async function runTest(entry: { url: string; label: string }): Promise<TestResult> {
  const start = Date.now();
  try {
    const data = await extractProduct(entry.url);
    const duration = Date.now() - start;
    const fields = countFields(data);

    if (!data.product_name && fields.length === 0) {
      return {
        url: entry.url,
        label: entry.label,
        status: 'empty',
        method: data.extraction_method,
        fieldsFound: [],
        confidence: 0,
        notes: 'No data extracted',
        durationMs: duration,
      };
    }

    return {
      url: entry.url,
      label: entry.label,
      status: 'success',
      method: data.extraction_method,
      fieldsFound: fields,
      confidence: data.confidence.overall,
      notes: data.product_name ? truncate(data.product_name, 40) : 'no name',
      durationMs: duration,
    };
  } catch (err: unknown) {
    const duration = Date.now() - start;
    const msg = err instanceof Error ? err.message : String(err);

    const isBlocked =
      msg.includes('403') ||
      msg.includes('Access Denied') ||
      msg.includes('Forbidden') ||
      msg.includes('captcha') ||
      msg.includes('blocked') ||
      msg.includes('429') ||
      msg.includes('Robot') ||
      msg.includes('challenge');

    return {
      url: entry.url,
      label: entry.label,
      status: isBlocked ? 'blocked' : 'error',
      method: null,
      fieldsFound: [],
      confidence: 0,
      notes: truncate(msg, 60),
      durationMs: duration,
    };
  }
}

async function main() {
  console.log(`\nShopGraph Extraction Test — ${TEST_URLS.length} URLs\n`);
  console.log('='.repeat(80));

  const results: TestResult[] = [];

  // Run sequentially to avoid rate limiting
  for (const entry of TEST_URLS) {
    process.stdout.write(`Testing ${entry.label}... `);
    const result = await runTest(entry);
    console.log(`${result.status} (${result.durationMs}ms)`);
    results.push(result);
  }

  // Summary
  console.log('\n' + '='.repeat(80));
  console.log('SUMMARY\n');

  const success = results.filter(r => r.status === 'success');
  const blocked = results.filter(r => r.status === 'blocked');
  const empty = results.filter(r => r.status === 'empty');
  const errors = results.filter(r => r.status === 'error');
  const schemaOrg = success.filter(r => r.method === 'schema_org');
  const llm = success.filter(r => r.method === 'llm');

  console.log(`Total:      ${results.length}`);
  console.log(`Success:    ${success.length} (${schemaOrg.length} schema_org, ${llm.length} llm)`);
  console.log(`Blocked:    ${blocked.length}`);
  console.log(`Empty:      ${empty.length}`);
  console.log(`Errors:     ${errors.length}`);
  console.log(`Success %:  ${((success.length / results.length) * 100).toFixed(0)}% (of all)`);
  const reachable = results.length - blocked.length;
  if (reachable > 0) {
    console.log(`Success %:  ${((success.length / reachable) * 100).toFixed(0)}% (of reachable)`);
  }

  if (success.length > 0) {
    const avgConf = success.reduce((s, r) => s + r.confidence, 0) / success.length;
    const avgFields = success.reduce((s, r) => s + r.fieldsFound.length, 0) / success.length;
    console.log(`Avg conf:   ${avgConf.toFixed(2)}`);
    console.log(`Avg fields: ${avgFields.toFixed(1)}`);
  }

  // Markdown table
  const mdLines: string[] = [
    '# ShopGraph Phase 1 — Real URL Test Results',
    '',
    `Run: ${new Date().toISOString()}`,
    '',
    '## Summary',
    '',
    `- **Total URLs**: ${results.length}`,
    `- **Success**: ${success.length} (${schemaOrg.length} schema_org, ${llm.length} llm)`,
    `- **Blocked**: ${blocked.length}`,
    `- **Empty**: ${empty.length}`,
    `- **Errors**: ${errors.length}`,
    `- **Success rate (all)**: ${((success.length / results.length) * 100).toFixed(0)}%`,
    reachable > 0 ? `- **Success rate (reachable)**: ${((success.length / reachable) * 100).toFixed(0)}%` : '',
    '',
    '## Results',
    '',
    '| # | Site | Status | Method | Fields Found | Confidence | Duration | Notes |',
    '|---|------|--------|--------|-------------|------------|----------|-------|',
  ];

  results.forEach((r, i) => {
    mdLines.push(
      `| ${i + 1} | ${r.label} | ${r.status} | ${r.method ?? '—'} | ${r.fieldsFound.join(', ') || '—'} | ${r.confidence ? r.confidence.toFixed(2) : '—'} | ${r.durationMs}ms | ${r.notes} |`
    );
  });

  // Field coverage analysis
  if (success.length > 0) {
    mdLines.push('', '## Field Coverage (successful extractions)', '');
    const allFieldNames = ['name', 'brand', 'description', 'price', 'availability', 'categories', 'images', 'primary_image', 'color', 'material', 'dimensions'];
    for (const field of allFieldNames) {
      const count = success.filter(r => r.fieldsFound.includes(field)).length;
      const pct = ((count / success.length) * 100).toFixed(0);
      mdLines.push(`- **${field}**: ${count}/${success.length} (${pct}%)`);
    }
  }

  const mdContent = mdLines.join('\n') + '\n';
  const outPath = join(__dirname, 'test-results.md');
  writeFileSync(outPath, mdContent);
  console.log(`\nResults saved to: ${outPath}`);

  // Print table to console too
  console.log('\n' + mdLines.slice(mdLines.indexOf('| # | Site | Status | Method | Fields Found | Confidence | Duration | Notes |')).join('\n'));
}

main().catch(console.error);
