import { createDb } from '../../server/src/db.js';
import { loadConfig } from '../../server/src/config.js';

async function main() {
  const db = createDb(loadConfig().DATABASE_URL);
  try {
    const order = await db.commerceOrder.findFirst({
      where: { number: 'AR-MUSXLD71-ZBKRTL3N' }
    });
    if (order) {
      await db.commerceOrder.update({
        where: { id: order.id },
        data: { number: 'AR-1001' }
      });
      console.log('Successfully updated order number from AR-MUSXLD71-ZBKRTL3N to AR-1001');
    } else {
      console.log('Order AR-MUSXLD71-ZBKRTL3N not found (maybe already updated)');
    }
  } finally {
    await db.$disconnect();
  }
}

main().catch(console.error);
