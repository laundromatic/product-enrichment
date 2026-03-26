import { config } from 'dotenv';
config({ path: '.env.local' });

import { Redis } from '@upstash/redis';

async function main() {
  const kv = new Redis({
    url: process.env.KV_REST_API_URL!,
    token: process.env.KV_REST_API_TOKEN!,
  });

  const patterns = ['stats:*', 'failures:*', 'results:*', 'batch:*', 'alert:*', 'quarantine:*'];
  let total = 0;
  
  for (const pattern of patterns) {
    const keys = await kv.keys(pattern);
    for (const key of keys) {
      await kv.del(key);
      total++;
    }
    console.log(`Deleted ${keys.length} keys matching ${pattern}`);
  }
  
  console.log(`Total: ${total} keys deleted. KV reset complete.`);
}
main();
