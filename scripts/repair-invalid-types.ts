import { loadConfig } from '../server/src/config.js';
import { createDb } from '../server/src/db.js';

async function main() {
  const config = loadConfig();
  const db = createDb(config.DATABASE_URL);

  const allTypes = await db.productType.findMany();
  console.log(`Checking ${allTypes.length} templates...`);

  const slugRegex = /^[a-z0-9][a-z0-9-]{0,99}$/;

  for (const t of allTypes) {
    if (!slugRegex.test(t.id)) {
      console.log(`Found invalid template ID: "${t.id}" (${JSON.stringify(t.title)})`);
      let newId = 'used-hdd-inspection';
      if (t.id !== '-') {
        newId = t.id.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-+|-+$/g, '');
        if (!slugRegex.test(newId)) newId = `type-${Date.now().toString(36)}`;
      }

      console.log(`Migrating template "${t.id}" -> "${newId}"...`);

      // Create new template
      await db.productType.upsert({
        where: { id: newId },
        create: {
          id: newId,
          title: t.title as any,
          fields: t.fields as any,
        },
        update: {
          title: t.title as any,
          fields: t.fields as any,
        }
      });

      // Update any products referencing the old ID
      const updatedProducts = await db.product.updateMany({
        where: { productTypeId: t.id },
        data: { productTypeId: newId }
      });
      console.log(`Updated ${updatedProducts.count} products.`);

      // Update any categories referencing the old ID
      const updatedCategories = await db.catalogCategory.updateMany({
        where: { productTypeId: t.id },
        data: { productTypeId: newId }
      });
      console.log(`Updated ${updatedCategories.count} categories.`);

      // Delete old template
      await db.productType.delete({
        where: { id: t.id }
      });
      console.log(`Deleted old template with ID "${t.id}". Migration complete!`);
    }
  }

  const remaining = await db.productType.findMany();
  console.log('Final templates:', remaining.map(t => ({ id: t.id, title: t.title })));
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
