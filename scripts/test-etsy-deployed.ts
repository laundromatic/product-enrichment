import 'dotenv/config';
import Stripe from 'stripe';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

async function main() {
  // Create test payment method
  const stripe = new Stripe(process.env.STRIPE_TEST_SECRET_KEY!);
  const pm = await stripe.paymentMethods.create({ type: 'card', card: { token: 'tok_visa' } });
  console.log(`Payment method: ${pm.id}`);

  // Connect to deployed server isn't possible via stdio - test locally instead
  // Let's just verify the extraction function works with browser on Vercel
  // by adding an Etsy URL to corpus and letting the cron test it
  
  console.log('Adding Etsy URL to corpus for next cron run...');
  const fs = await import('fs');
  const corpus = JSON.parse(fs.readFileSync('data/test-corpus.json', 'utf-8'));
  
  // Check if Etsy is already there
  const hasEtsy = corpus.some((u: any) => u.url.includes('etsy.com'));
  if (!hasEtsy) {
    corpus.push({ url: 'https://www.etsy.com/listing/1544289838/', vertical: 'Jewelry & Accessories', added: '2026-03-26', verified: '2026-03-26-pending-browser' });
    fs.writeFileSync('data/test-corpus.json', JSON.stringify(corpus, null, 2));
    console.log('Added Etsy URL. Will be tested in next cron batch on Vercel (where browser works).');
  } else {
    console.log('Etsy already in corpus.');
  }
}
main();
