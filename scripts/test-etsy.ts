import 'dotenv/config';
import { extractProduct } from '../src/extract.js';

const urls = [
  'https://www.etsy.com/listing/1544289838/',
  'https://www.etsy.com/listing/1269704964/',
  'https://www.etsy.com/listing/1476892401/',
];

async function main() {
  for (const url of urls) {
    try {
      const result = await extractProduct(url, { timeout: 30000 });
      console.log(`✓ ${url}`);
      console.log(`  Name: ${result.product_name}`);
      console.log(`  Method: ${result.extraction_method}`);
      console.log(`  Confidence: ${result.confidence.overall}`);
    } catch (err: any) {
      console.log(`✗ ${url}: ${err.message?.slice(0, 100)}`);
    }
  }
}
main();
