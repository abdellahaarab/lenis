import { createDb } from './db.js';
import { loadConfig } from './config.js';

const config = loadConfig();
const db = createDb(config.DATABASE_URL);

async function main() {
  // 1. Ensure hard-drives category is published
  await db.catalogCategory.upsert({
    where: { slug: 'hard-drives' },
    create: {
      slug: 'hard-drives',
      title: { ar: 'هاردسك وأقراص التخزين', en: 'Hard Drives & SSDs' },
      status: 'published'
    },
    update: {
      status: 'published'
    }
  });

  // 2. Ensure all brands for hard drives are published
  await db.brand.updateMany({
    where: {
      id: { in: ['wd', 'seagate', 'toshiba', 'kingston', 'sandisk', 'crucial', 'transcend'] }
    },
    data: { published: true }
  });

  // 3. Publish all 30 hard drives in the database
  const res = await db.product.updateMany({
    where: { category: 'hard-drives' },
    data: {
      status: 'published',
      publishedAt: new Date()
    }
  });

  console.log(`[SUCCESS] Published ${res.count} hard drive products!`);

  const count = await db.product.count({ where: { status: 'published' } });
  console.log(`[TOTAL] Published products in DB: ${count}`);

  const total = await db.product.count();
  console.log(`[TOTAL] All products in DB: ${total}`);
}

main()
  .catch(console.error)
  .finally(() => db.$disconnect());
