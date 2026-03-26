import 'dotenv/config';
import { extractWithBrowser } from '../src/browser-extract.js';

async function main() {
  console.log('Testing Etsy with browser fallback...');
  try {
    const result = await extractWithBrowser('https://www.etsy.com/listing/1544289838/');
    console.log(`✓ Name: ${result.product_name}`);
    console.log(`  Brand: ${result.brand}`);
    console.log(`  Price: ${result.price?.amount} ${result.price?.currency}`);
    console.log(`  Method: ${result.extraction_method}`);
  } catch (err: any) {
    console.log(`✗ Error: ${err.message?.slice(0, 200)}`);
  }
}
main();
