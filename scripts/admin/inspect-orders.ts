import { createDb } from '../../server/src/db.js';
import { loadConfig } from '../../server/src/config.js';

async function main() {
  const db = createDb(loadConfig().DATABASE_URL);
  try {
    const orders = await db.commerceOrder.findMany({
      orderBy: { createdAt: 'desc' }
    });
    console.log('Total orders:', orders.length);
    console.log(JSON.stringify(orders, null, 2));
  } finally {
    await db.$disconnect();
  }
}

main().catch(console.error);
