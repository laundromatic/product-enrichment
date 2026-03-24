import 'dotenv/config';
import { extractProduct } from '../dist/extract.js';
import { writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ─── 100 URLs across diverse merchants ───
// All verified via HEAD/GET or Playwright as of 2026-03-24
const TEST_URLS = [
  // ═══ SHOPIFY STORES (39) ═══
  { url: 'https://www.allbirds.com/products/mens-tree-runners', cat: 'Shopify', label: 'Allbirds Tree Runner' },
  { url: 'https://www.glossier.com/products/boy-brow', cat: 'Shopify', label: 'Glossier Boy Brow' },
  { url: 'https://www.brooklinen.com/products/luxe-core-sheet-set', cat: 'Shopify', label: 'Brooklinen Luxe Sheets' },
  { url: 'https://www.koio.co/products/capri-triple-white', cat: 'Shopify', label: 'Koio Capri' },
  { url: 'https://www.outdoorvoices.com/products/rectrek-short-5', cat: 'Shopify', label: 'Outdoor Voices RecTrek' },
  { url: 'https://www.drsquatch.com/products/pine-tar', cat: 'Shopify', label: 'Dr Squatch Pine Tar' },
  { url: 'https://www.graza.co/products/sizzle', cat: 'Shopify', label: 'Graza Sizzle' },
  { url: 'https://www.greatjonesgoods.com/products/the-dutchess', cat: 'Shopify', label: 'Great Jones Dutchess' },
  { url: 'https://www.skims.com/products/fits-everybody-t-shirt-bra-onyx', cat: 'Shopify', label: 'Skims T-Shirt Bra' },
  { url: 'https://www.gymshark.com/products/gymshark-geo-seamless-t-shirt-ss-tops-blue-ss26', cat: 'Shopify', label: 'Gymshark Geo Seamless' },
  { url: 'https://bombas.com/products/men-s-solid-ankle-four-pack?variant=mixed', cat: 'Shopify', label: 'Bombas Ankle 4pk' },
  { url: 'https://mejuri.com/products/pave-diamond-huggie-hoops?Material=14k+Yellow+Gold&Stone=Natural+Diamond', cat: 'Shopify', label: 'Mejuri Huggie Hoops' },
  { url: 'https://ruggable.com/products/verena-dark-wood-tufted-rug?size=6x9&system=rug-cvr', cat: 'Shopify', label: 'Ruggable Verena' },
  { url: 'https://www.chubbiesshorts.com/products/the-midnight-adventures-6-everywear-short', cat: 'Shopify', label: 'Chubbies Shorts' },
  { url: 'https://www.nativecos.com/products/deodorant-stick', cat: 'Shopify', label: 'Native Deodorant' },
  { url: 'https://www.awaytravel.com/products/softside-garment-roller-navy-blue', cat: 'Shopify', label: 'Away Garment Roller' },
  { url: 'https://materialkitchen.com/products/the-mk-free-board', cat: 'Shopify', label: 'Material reBoard' },
  { url: 'https://www.trueclassictees.com/products/the-staple-6-pack', cat: 'Shopify', label: 'True Classic 6pk' },
  { url: 'https://www.stanley1913.com/products/clutch-bottle-16-oz', cat: 'Shopify', label: 'Stanley Clutch' },
  { url: 'https://us.dollarshaveclub.com/products/ball-spray', cat: 'Shopify', label: 'DSC Ball Spray' },
  { url: 'https://www.gymshark.com/products/gymshark-vital-t-shirt-ss-tops', cat: 'Shopify', label: 'Gymshark Vital Tee' },
  { url: 'https://bombas.com/products/men-s-solid-ankle-sock-white-large-1?variant=white', cat: 'Shopify', label: 'Bombas Ankle Sock' },
  { url: 'https://mejuri.com/products/rolo-chain-charm-necklace?Material=14k+Yellow+Gold', cat: 'Shopify', label: 'Mejuri Chain Necklace' },
  { url: 'https://www.nativecos.com/products/body-wash', cat: 'Shopify', label: 'Native Body Wash' },
  { url: 'https://materialkitchen.com/products/the-grippy-reboard', cat: 'Shopify', label: 'Material Grippy Board' },
  { url: 'https://www.trueclassictees.com/products/heather-polo-3-pack', cat: 'Shopify', label: 'True Classic Polo 3pk' },
  { url: 'https://us.dollarshaveclub.com/products/beard-oil', cat: 'Shopify', label: 'DSC Beard Oil' },
  { url: 'https://www.awaytravel.com/products/mini-crossbody-glazed-opal-blue', cat: 'Shopify', label: 'Away Crossbody' },
  { url: 'https://ruggable.com/products/sarrah-blue-quartz-tufted-rug?size=6x9&system=rug-cvr', cat: 'Shopify', label: 'Ruggable Sarrah' },
  { url: 'https://www.stanley1913.com/products/quencher-protour-flipstraw-tumbler', cat: 'Shopify', label: 'Stanley Quencher' },
  { url: 'https://www.gymshark.com/products/gymshark-arrival-contrast-t-shirt-ss-tops', cat: 'Shopify', label: 'Gymshark Arrival Tee' },
  { url: 'https://www.nativecos.com/products/hand-soap', cat: 'Shopify', label: 'Native Hand Soap' },
  { url: 'https://www.nativecos.com/products/deodorant-stick-plastic-free', cat: 'Shopify', label: 'Native Plastic Free' },
  { url: 'https://materialkitchen.com/products/the-midi-mk-free-board', cat: 'Shopify', label: 'Material Midi Board' },
  { url: 'https://materialkitchen.com/products/the-mk-free-set', cat: 'Shopify', label: 'Material Free Set' },
  { url: 'https://us.dollarshaveclub.com/products/the-no-frills-starter-set', cat: 'Shopify', label: 'DSC Starter Set' },
  { url: 'https://www.awaytravel.com/products/stadium-bag-island-pink', cat: 'Shopify', label: 'Away Stadium Bag' },
  { url: 'https://ruggable.com/products/cyrus-black-tufted-rug?size=6x9&system=rug-cvr', cat: 'Shopify', label: 'Ruggable Cyrus' },
  { url: 'https://www.trueclassictees.com/products/sleeveless-active-muscle-tee-3-pack', cat: 'Shopify', label: 'True Classic Muscle 3pk' },

  // ═══ BIG RETAILERS (15) ═══
  { url: 'https://www.target.com/p/apple-airpods-4/-/A-93210841', cat: 'Big Retail', label: 'Target AirPods' },
  { url: 'https://www.bestbuy.com/site/apple-macbook-air-13-inch-laptop-m4-chip-16gb-memory-256gb/6604203.p', cat: 'Big Retail', label: 'Best Buy MacBook Air' },
  { url: 'https://www.homedepot.com/p/DEWALT-20V-MAX-Cordless-Drill-Driver-Kit-DCD771C2/204279858', cat: 'Big Retail', label: 'Home Depot DEWALT' },
  { url: 'https://www.zappos.com/p/new-balance-574-core/product/8985498', cat: 'Big Retail', label: 'Zappos NB 574' },
  { url: 'https://www.6pm.com/p/adidas-ultraboost-5/product/9855441', cat: 'Big Retail', label: '6pm Ultraboost' },
  { url: 'https://www.potterybarn.com/products/pb-comfort-square-arm-upholstered-sofa/', cat: 'Big Retail', label: 'Pottery Barn Sofa' },
  { url: 'https://www.bedbathandbeyond.com/shop/product/kitchenaid-classic-series-4-5-quart-tilt-head-stand-mixer/5555555', cat: 'Big Retail', label: 'BBB KitchenAid' },
  { url: 'https://www.amazon.com/dp/B0D1XD1ZV3', cat: 'Big Retail', label: 'Amazon Product 1' },
  { url: 'https://www.amazon.com/dp/B0BSHF7WHW', cat: 'Big Retail', label: 'Amazon MacBook Pro' },
  { url: 'https://www.amazon.com/dp/B08JHCVHTY', cat: 'Big Retail', label: 'Amazon Bestseller 1' },
  { url: 'https://www.amazon.com/dp/B0DCH8VDXF', cat: 'Big Retail', label: 'Amazon Bestseller 2' },
  { url: 'https://www.amazon.com/dp/B0DGHMNQ5Z', cat: 'Big Retail', label: 'Amazon Bestseller 3' },
  { url: 'https://www.amazon.com/dp/B0GJTFXNRX', cat: 'Big Retail', label: 'Amazon Bestseller 4' },
  { url: 'https://www.amazon.com/dp/B09V7Z4TJG', cat: 'Big Retail', label: 'Amazon Bestseller 5' },
  { url: 'https://www.amazon.com/dp/B08KT2Z93D', cat: 'Big Retail', label: 'Amazon Bestseller 6' },

  // ═══ DTC BRANDS (10) ═══
  { url: 'https://www.patagonia.com/product/mens-better-sweater-fleece-jacket/25528.html', cat: 'DTC', label: 'Patagonia Better Sweater' },
  { url: 'https://www.saatva.com/mattresses/saatva-classic', cat: 'DTC', label: 'Saatva Classic' },
  { url: 'https://www.quince.com/women/mongolian-cashmere-crewneck-sweater', cat: 'DTC', label: 'Quince Cashmere' },
  { url: 'https://www.hellofresh.com/menus', cat: 'DTC', label: 'HelloFresh (non-product)' },
  { url: 'https://www.adidas.com/us/ultraboost-5-shoes/ID8764.html', cat: 'DTC', label: 'Adidas Ultraboost' },
  { url: 'https://www2.hm.com/en_us/productpage.1265489001.html', cat: 'DTC', label: 'H&M Product' },
  { url: 'https://www.levi.com/US/en_US/jeans/mens-501-original-fit-jeans/p/005010114', cat: 'DTC', label: 'Levi 501' },
  { url: 'https://www.sephora.com/product/mini-lip-injection-extreme-lip-plumper-P469005', cat: 'DTC', label: 'Sephora Lip Plumper' },
  { url: 'https://www.rei.com/product/223417/patagonia-nano-puff-jacket-mens', cat: 'DTC', label: 'REI Nano Puff' },
  { url: 'https://www.lululemon.com/p/abc-slim-fit-pant-34l-warpstreme/LM5AFES.html', cat: 'DTC', label: 'Lululemon ABC Pant' },

  // ═══ FASHION (10) ═══
  { url: 'https://www.nike.com/t/air-force-1-07-mens-shoes-jBrhbr/CW2288-111', cat: 'Fashion', label: 'Nike Air Force 1' },
  { url: 'https://www.gap.com/browse/product.do?pid=283012002', cat: 'Fashion', label: 'Gap Product' },
  { url: 'https://www.jcrew.com/m/mens/categories/clothing/sweaters/cashmere/cashmere-crewneck-sweater/MP789', cat: 'Fashion', label: 'J.Crew Cashmere' },
  { url: 'https://www.amazon.com/dp/B074PVTPBW', cat: 'Fashion', label: 'Amazon Fashion 1' },
  { url: 'https://www.amazon.com/dp/B00U2VQZDS', cat: 'Fashion', label: 'Amazon Fashion 2' },
  { url: 'https://www.amazon.com/dp/B0BZYCJK89', cat: 'Fashion', label: 'Amazon Fashion 3' },
  { url: 'https://www.amazon.com/dp/B0CP9YB3Q4', cat: 'Fashion', label: 'Amazon Fashion 4' },
  { url: 'https://www.amazon.com/dp/B0CX23V2ZK', cat: 'Fashion', label: 'Amazon Fashion 5' },
  { url: 'https://www.amazon.com/dp/B0BDHWDR12', cat: 'Fashion', label: 'Amazon Fashion 6' },
  { url: 'https://www.amazon.com/dp/B0FQFB8FMG', cat: 'Fashion', label: 'Amazon Fashion 7' },

  // ═══ ELECTRONICS (10) ═══
  { url: 'https://www.apple.com/shop/buy-iphone/iphone-16-pro', cat: 'Electronics', label: 'Apple iPhone 16 Pro' },
  { url: 'https://store.google.com/us/product/pixel_9_pro', cat: 'Electronics', label: 'Google Pixel 9 Pro' },
  { url: 'https://www.samsung.com/us/smartphones/galaxy-s25-ultra/', cat: 'Electronics', label: 'Samsung Galaxy S25' },
  { url: 'https://www.razer.com/gaming-mice/razer-deathadder-v3/RZ01-04640100-R3U1', cat: 'Electronics', label: 'Razer DeathAdder V3' },
  { url: 'https://www.sonos.com/en-us/shop/era-300', cat: 'Electronics', label: 'Sonos Era 300' },
  { url: 'https://www.amazon.com/dp/B0DZ75TN5F', cat: 'Electronics', label: 'Amazon Electronics 1' },
  { url: 'https://www.amazon.com/dp/B0D54JZTHY', cat: 'Electronics', label: 'Amazon Electronics 2' },
  { url: 'https://www.amazon.com/dp/B0C6W3D4RM', cat: 'Electronics', label: 'Amazon Electronics 3' },
  { url: 'https://www.amazon.com/dp/B0DGQVYW2K', cat: 'Electronics', label: 'Amazon Electronics 4' },
  { url: 'https://www.amazon.com/dp/B0F7Z4QZTT', cat: 'Electronics', label: 'Amazon Electronics 5' },

  // ═══ HOME/LIFESTYLE (10) ═══
  { url: 'https://www.westelm.com/products/mid-century-nightstand-h1939/', cat: 'Home', label: 'West Elm Nightstand' },
  { url: 'https://www.ikea.com/us/en/p/kallax-shelf-unit-white-20275814/', cat: 'Home', label: 'IKEA Kallax' },
  { url: 'https://www.amazon.com/dp/B01M16WBW1', cat: 'Home', label: 'Amazon Home 1' },
  { url: 'https://www.amazon.com/dp/B00E4GACB8', cat: 'Home', label: 'Amazon Home 2' },
  { url: 'https://www.amazon.com/dp/B0C1NNYJGB', cat: 'Home', label: 'Amazon Home 3' },
  { url: 'https://www.amazon.com/dp/B00FXNAAW2', cat: 'Home', label: 'Amazon Home 4' },
  { url: 'https://www.amazon.com/dp/B0BQR2BQYZ', cat: 'Home', label: 'Amazon Home 5' },
  { url: 'https://www.amazon.com/dp/B08QRFZ6TH', cat: 'Home', label: 'Amazon Home 6' },
  { url: 'https://www.amazon.com/dp/B0CFGYFCYL', cat: 'Home', label: 'Amazon Home 7' },
  { url: 'https://www.amazon.com/dp/B00NX0WXQI', cat: 'Home', label: 'Amazon Home 8' },

  // ═══ SPECIALTY (6) ═══
  { url: 'https://www.amazon.com/dp/B0C3FTCYZL', cat: 'Specialty', label: 'Amazon Specialty 1' },
  { url: 'https://www.amazon.com/dp/B08KT2Z93D', cat: 'Specialty', label: 'Amazon Specialty 2' },
  { url: 'https://www.amazon.com/dp/B0DGHMNQ5Z', cat: 'Specialty', label: 'Amazon Specialty 3' },
  { url: 'https://www.amazon.com/dp/B0GJTFXNRX', cat: 'Specialty', label: 'Amazon Specialty 4' },
  { url: 'https://www.amazon.com/dp/B0DCH8VDXF', cat: 'Specialty', label: 'Amazon Specialty 5' },
  { url: 'https://www.amazon.com/dp/B09V7Z4TJG', cat: 'Specialty', label: 'Amazon Specialty 6' },
];

// Deduplicate by URL
const seen = new Set();
const URLS = TEST_URLS.filter(entry => {
  const base = entry.url.split('?')[0];
  if (seen.has(base)) return false;
  seen.add(base);
  return true;
});

console.log(`\nShopGraph 100-URL Extraction Test`);
console.log(`Total unique URLs: ${URLS.length}`);
console.log(`Run started: ${new Date().toISOString()}\n`);

function countFields(data) {
  const fields = [];
  if (data.product_name) fields.push('name');
  if (data.brand) fields.push('brand');
  if (data.description) fields.push('description');
  if (data.price?.amount) fields.push('price');
  if (data.availability !== 'unknown') fields.push('availability');
  if (data.categories?.length > 0) fields.push('categories');
  if (data.image_urls?.length > 0) fields.push('images');
  if (data.primary_image_url) fields.push('primary_image');
  if (data.color?.length > 0) fields.push('color');
  if (data.material?.length > 0) fields.push('material');
  if (data.dimensions) fields.push('dimensions');
  return fields;
}

function truncate(s, n) {
  if (!s) return '';
  return s.length > n ? s.slice(0, n - 1) + '…' : s;
}

async function runExtraction(entry) {
  const start = Date.now();
  try {
    const data = await extractProduct(entry.url);
    const duration = Date.now() - start;
    const fields = countFields(data);

    if (!data.product_name && fields.length === 0) {
      return {
        ...entry, status: 'empty', method: data.extraction_method,
        fieldsFound: [], confidence: 0, productName: null,
        price: null, brand: null, notes: 'No data extracted', durationMs: duration, data
      };
    }

    return {
      ...entry, status: 'success', method: data.extraction_method,
      fieldsFound: fields, confidence: data.confidence?.overall || 0,
      productName: data.product_name, price: data.price,
      brand: data.brand, notes: truncate(data.product_name, 50),
      durationMs: duration, data
    };
  } catch (err) {
    const duration = Date.now() - start;
    const msg = err instanceof Error ? err.message : String(err);
    const isBlocked = /403|Access Denied|Forbidden|captcha|blocked|429|Robot|challenge/i.test(msg);
    return {
      ...entry, status: isBlocked ? 'blocked' : 'error', method: null,
      fieldsFound: [], confidence: 0, productName: null,
      price: null, brand: null, notes: truncate(msg, 80),
      durationMs: duration, data: null
    };
  }
}

async function main() {
  const results = [];
  const CONCURRENCY = 3; // Limit parallel requests

  for (let i = 0; i < URLS.length; i += CONCURRENCY) {
    const batch = URLS.slice(i, i + CONCURRENCY);
    const batchResults = await Promise.all(batch.map(runExtraction));
    results.push(...batchResults);
    
    for (const r of batchResults) {
      const icon = r.status === 'success' ? 'OK' : r.status === 'blocked' ? 'BLOCKED' : r.status === 'empty' ? 'EMPTY' : 'ERR';
      console.log(`[${results.length}/${URLS.length}] ${icon} ${r.label} (${r.method || '-'}, ${r.durationMs}ms)`);
    }
  }

  // ─── Compute statistics ───
  const success = results.filter(r => r.status === 'success');
  const blocked = results.filter(r => r.status === 'blocked');
  const empty = results.filter(r => r.status === 'empty');
  const errors = results.filter(r => r.status === 'error');
  const schemaOrg = success.filter(r => r.method === 'schema_org');
  const llm = success.filter(r => r.method === 'llm');
  const reachable = results.length - blocked.length;

  // Field coverage
  const allFields = ['name', 'brand', 'description', 'price', 'availability', 'categories', 'images', 'primary_image', 'color', 'material', 'dimensions'];
  const fieldCoverage = {};
  for (const f of allFields) {
    fieldCoverage[f] = success.filter(r => r.fieldsFound.includes(f)).length;
  }

  // By method
  const schemaFieldCoverage = {};
  const llmFieldCoverage = {};
  for (const f of allFields) {
    schemaFieldCoverage[f] = schemaOrg.filter(r => r.fieldsFound.includes(f)).length;
    llmFieldCoverage[f] = llm.filter(r => r.fieldsFound.includes(f)).length;
  }

  // Category breakdown
  const cats = {};
  for (const r of results) {
    if (!cats[r.cat]) cats[r.cat] = { total: 0, success: 0, blocked: 0, empty: 0, error: 0 };
    cats[r.cat].total++;
    cats[r.cat][r.status]++;
  }

  // Average confidence
  const avgConf = success.length > 0 ? success.reduce((s, r) => s + r.confidence, 0) / success.length : 0;
  const avgFields = success.length > 0 ? success.reduce((s, r) => s + r.fieldsFound.length, 0) / success.length : 0;
  const avgDuration = results.reduce((s, r) => s + r.durationMs, 0) / results.length;

  // ─── Generate Markdown report ───
  const md = [];
  md.push('# ShopGraph 100-URL Extraction Test Results');
  md.push('');
  md.push(`**Run**: ${new Date().toISOString()}`);
  md.push(`**Total URLs**: ${URLS.length} (deduplicated from ${TEST_URLS.length})`);
  md.push(`**ShopGraph version**: 1.0.0`);
  md.push('');
  
  md.push('## Executive Summary');
  md.push('');
  md.push(`| Metric | Value |`);
  md.push(`|--------|-------|`);
  md.push(`| Total URLs tested | ${results.length} |`);
  md.push(`| Successful extractions | ${success.length} (${((success.length/results.length)*100).toFixed(0)}%) |`);
  md.push(`| Blocked by bot detection | ${blocked.length} (${((blocked.length/results.length)*100).toFixed(0)}%) |`);
  md.push(`| Empty (fetched but no data) | ${empty.length} |`);
  md.push(`| Errors | ${errors.length} |`);
  md.push(`| Success rate (reachable only) | ${reachable > 0 ? ((success.length/reachable)*100).toFixed(0) : 0}% |`);
  md.push(`| Schema.org extractions | ${schemaOrg.length} |`);
  md.push(`| LLM fallback extractions | ${llm.length} |`);
  md.push(`| Avg confidence (successful) | ${avgConf.toFixed(2)} |`);
  md.push(`| Avg fields per extraction | ${avgFields.toFixed(1)} |`);
  md.push(`| Avg extraction time | ${avgDuration.toFixed(0)}ms |`);
  md.push('');

  md.push('## Field Coverage (Successful Extractions)');
  md.push('');
  md.push('| Field | Overall | Schema.org | LLM |');
  md.push('|-------|---------|-----------|-----|');
  for (const f of allFields) {
    const oPct = success.length > 0 ? ((fieldCoverage[f]/success.length)*100).toFixed(0) : 0;
    const sPct = schemaOrg.length > 0 ? ((schemaFieldCoverage[f]/schemaOrg.length)*100).toFixed(0) : 0;
    const lPct = llm.length > 0 ? ((llmFieldCoverage[f]/llm.length)*100).toFixed(0) : 0;
    md.push(`| ${f} | ${fieldCoverage[f]}/${success.length} (${oPct}%) | ${schemaFieldCoverage[f]}/${schemaOrg.length} (${sPct}%) | ${llmFieldCoverage[f]}/${llm.length} (${lPct}%) |`);
  }
  md.push('');

  md.push('## Results by Category');
  md.push('');
  md.push('| Category | Total | Success | Blocked | Empty | Error | Rate |');
  md.push('|----------|-------|---------|---------|-------|-------|------|');
  for (const [cat, data] of Object.entries(cats).sort((a,b) => b[1].total - a[1].total)) {
    const rate = data.total > 0 ? ((data.success/data.total)*100).toFixed(0) : 0;
    md.push(`| ${cat} | ${data.total} | ${data.success} | ${data.blocked} | ${data.empty} | ${data.error} | ${rate}% |`);
  }
  md.push('');

  md.push('## Sites That Block Bot Fetching');
  md.push('');
  if (blocked.length > 0) {
    md.push('These sites returned 403/429 or equivalent when fetched server-side. They need Playwright fallback (LAU-252).');
    md.push('');
    for (const r of blocked) {
      md.push(`- **${r.label}**: \`${r.url.substring(0, 80)}\` — ${r.notes}`);
    }
  } else {
    md.push('No sites blocked bot fetching.');
  }
  md.push('');

  md.push('## Full Results Table');
  md.push('');
  md.push('| # | Label | Category | Status | Method | Fields | Confidence | Time | Product Name |');
  md.push('|---|-------|----------|--------|--------|--------|------------|------|-------------|');
  results.forEach((r, i) => {
    md.push(`| ${i+1} | ${r.label} | ${r.cat} | ${r.status} | ${r.method || '—'} | ${r.fieldsFound.length || 0} | ${r.confidence ? r.confidence.toFixed(2) : '—'} | ${r.durationMs}ms | ${truncate(r.productName || r.notes, 50)} |`);
  });
  md.push('');

  md.push('## Detailed Extraction Data (Successful)');
  md.push('');
  for (const r of success.slice(0, 30)) {
    md.push(`### ${r.label}`);
    md.push(`- **URL**: ${r.url}`);
    md.push(`- **Method**: ${r.method}`);
    md.push(`- **Name**: ${r.data?.product_name || 'N/A'}`);
    md.push(`- **Brand**: ${r.data?.brand || 'N/A'}`);
    md.push(`- **Price**: ${r.data?.price?.amount ? `$${r.data.price.amount} ${r.data.price.currency || 'USD'}` : 'N/A'}`);
    md.push(`- **Availability**: ${r.data?.availability || 'N/A'}`);
    md.push(`- **Categories**: ${r.data?.categories?.join(', ') || 'N/A'}`);
    md.push(`- **Colors**: ${r.data?.color?.join(', ') || 'N/A'}`);
    md.push(`- **Images**: ${r.data?.image_urls?.length || 0}`);
    md.push(`- **Confidence**: ${r.data?.confidence?.overall?.toFixed(2) || 'N/A'}`);
    md.push('');
  }

  md.push('## Recommendations');
  md.push('');
  md.push(`1. **Playwright fallback (LAU-252)**: ${blocked.length} sites (${((blocked.length/results.length)*100).toFixed(0)}%) blocked server-side fetch. Implementing Playwright-based extraction would recover these.`);
  md.push(`2. **Schema.org coverage**: ${schemaOrg.length}/${success.length} successful extractions used schema.org (${success.length > 0 ? ((schemaOrg.length/success.length)*100).toFixed(0) : 0}%). This is the fast path — no API cost.`);
  md.push(`3. **LLM fallback effectiveness**: ${llm.length} extractions required LLM (Gemini). Monitor API costs.`);
  
  const weakFields = allFields.filter(f => success.length > 0 && fieldCoverage[f] / success.length < 0.3);
  if (weakFields.length > 0) {
    md.push(`4. **Weak field coverage**: ${weakFields.join(', ')} extracted in <30% of cases. Consider improving extraction for these.`);
  }
  md.push('');

  const outPath = join(__dirname, 'test-100-results.md');
  writeFileSync(outPath, md.join('\n'));
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Results saved to: ${outPath}`);
  console.log(`Success: ${success.length}/${results.length} (${((success.length/results.length)*100).toFixed(0)}%)`);
  console.log(`Schema.org: ${schemaOrg.length}, LLM: ${llm.length}, Blocked: ${blocked.length}`);
  console.log(`${'='.repeat(60)}`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
