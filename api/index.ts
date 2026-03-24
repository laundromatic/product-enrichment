/**
 * Vercel serverless function wrapper for the Express MCP server.
 * Routes all traffic through this single function.
 *
 * Vercel compiles api/*.ts separately, so we import from src/ directly.
 * Vercel's Node.js runtime handles TypeScript compilation for api/ files.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import express from 'express';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { createServer } from '../src/server.js';
import { EnrichmentCache } from '../src/cache.js';
import { PaymentManager } from '../src/payments.js';

const app = express();
app.use(express.json());

const cache = new EnrichmentCache();

function getPayments() {
  return new PaymentManager(
    process.env.STRIPE_SECRET_KEY || process.env.STRIPE_TEST_SECRET_KEY
  );
}

// ---------------------------------------------------------------------------
// HTML Pages
// ---------------------------------------------------------------------------

const pageShell = (title: string, body: string) => `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
body{background:#0a0a0a;color:#e0e0e0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;line-height:1.6;-webkit-font-smoothing:antialiased}
a{color:#7eb8f7;text-decoration:none}
a:hover{text-decoration:underline}
code,pre{font-family:'SF Mono',SFMono-Regular,Consolas,'Liberation Mono',Menlo,monospace}
code{background:#1a1a2e;padding:2px 6px;border-radius:4px;font-size:.9em}
pre{background:#1a1a2e;padding:16px 20px;border-radius:8px;overflow-x:auto;font-size:.85em;line-height:1.5}
.container{max-width:720px;margin:0 auto;padding:48px 24px 64px}
h1{font-size:2.4em;font-weight:700;letter-spacing:-.02em;color:#fff}
h2{font-size:1.3em;font-weight:600;color:#fff;margin-top:40px;margin-bottom:12px}
h3{font-size:1.05em;font-weight:600;color:#ccc;margin-top:24px;margin-bottom:8px}
p,li{color:#b0b0b0;margin-bottom:8px}
ul{padding-left:20px}
.hero-sub{font-size:1.15em;color:#999;margin-top:8px;max-width:540px}
.badge{display:inline-block;background:#1a1a2e;border:1px solid #2a2a3e;padding:4px 10px;border-radius:6px;font-size:.8em;color:#7eb8f7;margin-right:6px;margin-bottom:6px}
.pricing-row{display:flex;gap:24px;margin-top:12px;flex-wrap:wrap}
.price-card{background:#111;border:1px solid #222;border-radius:10px;padding:20px;flex:1;min-width:200px}
.price-card h3{margin-top:0;color:#fff}
.price-amount{font-size:1.6em;font-weight:700;color:#7eb8f7}
.price-unit{font-size:.75em;color:#888;font-weight:400}
.links{display:flex;gap:16px;flex-wrap:wrap;margin-top:16px}
.link-btn{display:inline-block;background:#1a1a2e;border:1px solid #2a2a3e;padding:8px 16px;border-radius:8px;font-size:.9em;color:#7eb8f7;transition:border-color .2s}
.link-btn:hover{border-color:#7eb8f7;text-decoration:none}
hr{border:none;border-top:1px solid #1a1a1a;margin:40px 0}
.footer{color:#555;font-size:.85em;margin-top:48px;text-align:center}
.footer a{color:#666}
.section-note{color:#666;font-size:.85em;font-style:italic}
.back-link{display:inline-block;margin-bottom:24px;color:#666;font-size:.9em}
</style>
</head>
<body>
<div class="container">
${body}
</div>
</body>
</html>`;

// ---- Landing Page ----
const landingHTML = pageShell('ShopGraph — Structured Product Data for AI Agents', `
<h1>ShopGraph</h1>
<p class="hero-sub">Structured product data extraction for AI agents. Send any product URL, get clean data back.</p>

<div class="links" style="margin-top:24px">
  <a class="link-btn" href="https://github.com/laundromatic/shopgraph">GitHub</a>
  <a class="link-btn" href="/mcp">MCP Endpoint</a>
  <a class="link-btn" href="/health">Health Check</a>
</div>

<h2>What It Does</h2>
<p>Send any product URL to ShopGraph. Get structured data back: product name, brand, price, currency, availability, categories, images, and confidence scores. No scraping SDK, no parsing logic, no maintenance — just clean JSON.</p>
<pre>{
  "name": "Wireless Noise-Cancelling Headphones",
  "brand": "Sony",
  "price": 348.00,
  "currency": "USD",
  "availability": "InStock",
  "categories": ["Electronics", "Audio", "Headphones"],
  "images": ["https://..."],
  "confidence": { "overall": 0.95 }
}</pre>

<h2>Why Agents Need This</h2>
<p>Existing product data APIs serve narrow slices of the web:</p>
<ul>
  <li><strong>Shopify Catalog API</strong> — covers Shopify merchants only</li>
  <li><strong>Google UPC Database</strong> — covers Google-indexed merchants only</li>
</ul>
<p>ShopGraph covers the <strong>open web</strong>. Any URL with a product on it — DTC brands, niche retailers, marketplaces, regional stores — ShopGraph extracts structured data from it.</p>

<h2>Tools</h2>
<div class="pricing-row">
  <div class="price-card">
    <h3><code>enrich_product</code></h3>
    <p style="color:#888;margin-bottom:12px">Full extraction with LLM fallback. Schema.org first, Gemini when markup is missing.</p>
    <div class="price-amount">$0.02 <span class="price-unit">/ call</span></div>
  </div>
  <div class="price-card">
    <h3><code>enrich_basic</code></h3>
    <p style="color:#888;margin-bottom:12px">Schema.org &amp; meta-tag extraction only. Fast, no LLM.</p>
    <div class="price-amount">$0.01 <span class="price-unit">/ call</span></div>
  </div>
</div>
<p class="section-note" style="margin-top:12px">Cached results (within 24 hours) are free. Failed extractions are not charged.</p>

<h2>How It Works</h2>
<ol style="padding-left:20px">
  <li><strong>Schema.org extraction</strong> — Parses JSON-LD, microdata, and meta tags from the page. When structured markup exists, this is fast and accurate.</li>
  <li><strong>LLM-powered fallback</strong> — When Schema.org markup is missing or incomplete, ShopGraph uses Gemini to extract product data from the raw page content.</li>
  <li><strong>24-hour cache</strong> — Results are cached for 24 hours. Repeat calls within that window are free and instant.</li>
</ol>
<p>Every response includes confidence scores so your agent can decide how much to trust the data.</p>

<h2>Integration</h2>
<p>ShopGraph is an <a href="https://modelcontextprotocol.io">MCP</a> server. Connect any MCP-compatible client to:</p>
<pre>https://shopgraph.dev/mcp</pre>
<p>No API keys needed for discovery. Payment is handled via <strong>Stripe Machine Payments Protocol (MPP)</strong> — your agent pays per call using a Stripe-issued token.</p>

<h2>Pricing &amp; Payments</h2>
<ul>
  <li><code>enrich_product</code> — <strong>$0.02 USD</strong> per successful call</li>
  <li><code>enrich_basic</code> — <strong>$0.01 USD</strong> per successful call</li>
  <li>Cached results (within 24h) — <strong>free</strong></li>
  <li>Failed extractions — <strong>not charged</strong></li>
</ul>
<p>All payments processed by <a href="https://stripe.com">Stripe</a>. ShopGraph never handles payment card data directly. No subscriptions, no minimums — pay only for what you use.</p>
<p><strong>Refund policy:</strong> Failed extractions are not charged. If you are charged for a call that returned an error, contact <a href="mailto:hi@kb.computer">hi@kb.computer</a> for a refund.</p>

<hr>

<p class="footer">
  Krishna Brown, LLC &middot; Los Angeles, CA &middot; Apache 2.0<br>
  <a href="/tos">Terms of Service</a> &middot; <a href="/privacy">Privacy Policy</a> &middot; <a href="mailto:hi@kb.computer">hi@kb.computer</a>
</p>
`);

// ---- Terms of Service ----
const tosHTML = pageShell('Terms of Service — ShopGraph', `
<a href="/" class="back-link">&larr; ShopGraph</a>
<h1>Terms of Service</h1>
<p style="color:#666">Effective: March 2026</p>

<h2>1. Service Description</h2>
<p>ShopGraph provides structured product data extraction via the Model Context Protocol (MCP). The service accepts product URLs and returns structured data including product name, brand, price, availability, categories, images, and confidence scores.</p>
<p>ShopGraph is operated by <strong>Krishna Brown, LLC</strong>, a California limited liability company based in Los Angeles, CA.</p>

<h2>2. Payment Terms</h2>
<p>ShopGraph charges per successful API call:</p>
<ul>
  <li><code>enrich_product</code> — $0.02 USD per call</li>
  <li><code>enrich_basic</code> — $0.01 USD per call</li>
</ul>
<p>Payment is processed via <strong>Stripe Machine Payments Protocol (MPP)</strong>. No charge is made for cached results (within 24 hours of the original call) or for calls that fail to extract data.</p>
<p>If you believe you were charged in error, contact <a href="mailto:hi@kb.computer">hi@kb.computer</a> for a refund.</p>

<h2>3. Accuracy &amp; Data Quality</h2>
<p>ShopGraph provides product data on a <strong>best-effort basis</strong>. Extraction accuracy depends on the structure and quality of the source page. Every response includes confidence scores so you can assess data reliability. ShopGraph does not guarantee the accuracy, completeness, or timeliness of extracted data.</p>

<h2>4. Rate Limits</h2>
<p>API calls are limited to <strong>100 requests per minute</strong> per client. Exceeding this limit may result in temporary throttling. If you need higher limits, contact <a href="mailto:hi@kb.computer">hi@kb.computer</a>.</p>

<h2>5. Acceptable Use</h2>
<p>You agree not to:</p>
<ul>
  <li>Use ShopGraph for systematic large-scale scraping intended to build a competing product data service</li>
  <li>Abuse the service in a way that degrades performance for other users</li>
  <li>Misrepresent ShopGraph data as your own proprietary dataset</li>
  <li>Use the service for any unlawful purpose</li>
</ul>

<h2>6. Limitation of Liability</h2>
<p>ShopGraph is provided "as is" without warranty of any kind, express or implied. Krishna Brown, LLC shall not be liable for any indirect, incidental, special, consequential, or punitive damages, or any loss of profits or data, arising from your use of the service. Total liability shall not exceed the amount you paid to ShopGraph in the 30 days preceding the claim.</p>

<h2>7. Changes to Terms</h2>
<p>We may update these terms from time to time. Continued use of ShopGraph after changes constitutes acceptance of the updated terms. Material changes will be noted on this page with an updated effective date.</p>

<h2>8. Contact</h2>
<p>Krishna Brown, LLC<br>Los Angeles, CA<br><a href="mailto:hi@kb.computer">hi@kb.computer</a></p>

<hr>
<p class="footer"><a href="/">ShopGraph</a> &middot; <a href="/privacy">Privacy Policy</a></p>
`);

// ---- Privacy Policy ----
const privacyHTML = pageShell('Privacy Policy — ShopGraph', `
<a href="/" class="back-link">&larr; ShopGraph</a>
<h1>Privacy Policy</h1>
<p style="color:#666">Effective: March 2026</p>

<h2>What We Collect</h2>
<p>When you use ShopGraph, we receive the <strong>product URLs</strong> you submit for enrichment. That is the extent of data we collect from your usage of the API.</p>

<h2>How We Use It</h2>
<p>Submitted URLs are used solely to perform the requested product data extraction. URLs and their extraction results are <strong>cached for 24 hours</strong> to serve repeat requests for free, then deleted.</p>

<h2>What We Don't Do</h2>
<ul>
  <li>We do not sell or share submitted URLs or extracted data with third parties</li>
  <li>We do not use submitted URLs for advertising or profiling</li>
  <li>We do not set cookies or use tracking pixels on the API</li>
  <li>We do not run analytics on API usage beyond standard server logs</li>
</ul>

<h2>Payment Data</h2>
<p>All payment processing is handled by <a href="https://stripe.com/privacy">Stripe</a>. ShopGraph never receives, stores, or processes payment card information. Stripe's privacy policy and PCI compliance govern payment data handling.</p>

<h2>Server Logs</h2>
<p>ShopGraph is hosted on <a href="https://vercel.com/legal/privacy-policy">Vercel</a>, which may collect standard server logs (IP addresses, request timestamps, response codes). These logs are subject to Vercel's privacy policy and are not used by ShopGraph for any purpose beyond infrastructure monitoring.</p>

<h2>Data Retention</h2>
<ul>
  <li><strong>Extraction cache:</strong> 24 hours, then deleted</li>
  <li><strong>Server logs:</strong> Managed by Vercel per their retention policy</li>
  <li><strong>Payment records:</strong> Managed by Stripe per their retention policy</li>
</ul>

<h2>Contact</h2>
<p>Questions about this policy? Contact us at <a href="mailto:hi@kb.computer">hi@kb.computer</a>.</p>
<p>Krishna Brown, LLC<br>Los Angeles, CA</p>

<hr>
<p class="footer"><a href="/">ShopGraph</a> &middot; <a href="/tos">Terms of Service</a></p>
`);

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

// Health check
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'shopgraph',
    version: '1.0.0',
    runtime: 'vercel-serverless',
    tools: ['enrich_product', 'enrich_basic'],
  });
});

// Landing page
app.get('/', (_req, res) => {
  res.type('html').send(landingHTML);
});

// Terms of Service
app.get('/tos', (_req, res) => {
  res.type('html').send(tosHTML);
});

// Privacy Policy
app.get('/privacy', (_req, res) => {
  res.type('html').send(privacyHTML);
});

// MCP endpoint
app.post('/mcp', async (req, res) => {
  try {
    const payments = getPayments();
    const server = createServer(cache, payments);
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
    });

    res.on('close', () => {
      transport.close();
      server.close();
    });

    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  } catch (err) {
    console.error('MCP request error:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

app.get('/mcp', (_req, res) => {
  res.writeHead(405).end(JSON.stringify({
    jsonrpc: '2.0',
    error: { code: -32000, message: 'Method not allowed. Use POST.' },
    id: null,
  }));
});

app.delete('/mcp', (_req, res) => {
  res.writeHead(405).end(JSON.stringify({
    jsonrpc: '2.0',
    error: { code: -32000, message: 'Method not allowed.' },
    id: null,
  }));
});

export default app;
