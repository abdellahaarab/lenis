import { createDb } from './db.js';
import { loadConfig } from './config.js';

const db = createDb(loadConfig().DATABASE_URL);

async function main() {
  const products = await db.product.findMany({
    select: { id: true, category: true, specs: true, model: true }
  });
  let withRealSpecs = 0;
  const countByCat: Record<string, number> = {};
  for (const p of products) {
    const s = p.specs as Record<string, unknown>;
    if (s && typeof s === 'object') {
      const keys = Object.keys(s).filter(k => k !== 'originalPriceUsd');
      if (keys.length > 0) {
        withRealSpecs++;
        countByCat[p.category] = (countByCat[p.category] || 0) + 1;
      }
    }
  }
  const facetCount = await db.productFacet.count();
  console.log(JSON.stringify({ withRealSpecs, total: products.length, facetCount, countByCat }, null, 2));
  await db.$disconnect();
}

main().catch(console.error);
