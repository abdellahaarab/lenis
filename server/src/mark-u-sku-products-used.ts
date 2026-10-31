/** Set products and variants whose SKU begins with U to used. Preview by default. */
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { Prisma } from '@prisma/client';
import { createDb } from './db.js';
import { loadConfig } from './config.js';

const db = createDb(loadConfig().DATABASE_URL);

async function main() {
  const variants = await db.productVariant.findMany({
    select: { id: true, productId: true, sku: true, condition: true },
  });
  const matches = variants.filter(variant => /^U/i.test(variant.sku));
  const productIds = [...new Set(matches.map(variant => variant.productId))];
  const products = productIds.length
    ? await db.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, condition: true, category: true, status: true, deletedAt: true },
    })
    : [];
  const variantChanges = matches.filter(variant => variant.condition !== 'used');
  const productChanges = products.filter(product => product.condition !== 'used');
  const summary = {
    mode: process.argv.includes('--apply') ? 'apply' : 'preview',
    matchingSkuVariants: matches.length,
    matchingProducts: products.length,
    variantsToMarkUsed: variantChanges.length,
    productsToMarkUsed: productChanges.length,
    deletedProducts: products.filter(product => product.deletedAt !== null).length,
    archivedProducts: products.filter(product => product.status === 'archived').length,
    examples: matches.slice(0, 8).map(({ sku, condition }) => ({ sku, previousCondition: condition, conditionAfter: 'used' })),
  };

  if (!process.argv.includes('--apply')) {
    console.log(JSON.stringify(summary, null, 2));
    return;
  }
  if (!variantChanges.length && !productChanges.length) {
    console.log(JSON.stringify({ ...summary, updated: 0 }, null, 2));
    return;
  }

  const backupPath = join(process.cwd(), '.backups', `u-sku-condition-before-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
  await mkdir(join(process.cwd(), '.backups'), { recursive: true });
  await writeFile(backupPath, JSON.stringify({
    createdAt: new Date().toISOString(),
    variants: matches,
    products,
  }, null, 2), 'utf8');

  await db.$transaction(async tx => {
    if (variantChanges.length) {
      await tx.productVariant.updateMany({
        where: { id: { in: variantChanges.map(variant => variant.id) } },
        data: { condition: 'used' },
      });
    }
    if (productChanges.length) {
      await tx.product.updateMany({
        where: { id: { in: productChanges.map(product => product.id) } },
        data: { condition: 'used' },
      });
    }
    await tx.auditLog.create({
      data: {
        action: 'catalog.condition.from_u_sku',
        entity: 'ProductCatalog',
        entityId: null,
        before: { variantCount: matches.length, productCount: products.length, condition: 'new' } as Prisma.InputJsonValue,
        after: { variantsUpdated: variantChanges.length, productsUpdated: productChanges.length, condition: 'used', backupPath } as Prisma.InputJsonValue,
      },
    });
  }, { timeout: 30000, maxWait: 8000 });

  console.log(JSON.stringify({ ...summary, updated: variantChanges.length + productChanges.length, backupPath }, null, 2));
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}).finally(() => db.$disconnect());
