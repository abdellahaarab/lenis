import { createDb } from './db.js';
import { loadConfig } from './config.js';

const db = createDb(loadConfig().DATABASE_URL);

async function main() {
  const totalTypes   = await db.productType.count();
  const totalCats    = await db.catalogCategory.count();
  const allTypes     = await db.productType.findMany({ select: { id: true, title: true, fields: true } });
  const totalSpecDefs= await db.specDefinition.count();

  // فئات بدون قالب (نحسبها بطريقة مختلفة)
  const catsNoType = await db.catalogCategory.findMany({
    where: { productTypeId: null },
    select: { slug: true, title: true, _count: { select: { products: true } } }
  });
  const catsWithProductsNoType = catsNoType.filter(c => c._count.products > 0);

  console.log('\n═══════════════════════════════════════════');
  console.log('✅ تقرير تثبيت القوالب النهائي:');
  console.log(`   • إجمالي القوالب في القاعدة: ${totalTypes}`);
  console.log(`   • إجمالي الفئات: ${totalCats}`);
  console.log(`   • فئات بدون قالب (بها منتجات): ${catsWithProductsNoType.length}`);
  console.log(`   • إجمالي SpecDefinitions: ${totalSpecDefs}`);
  console.log('\n📋 القوالب المثبتة:');
  for (const t of allTypes) {
    const fields = Array.isArray(t.fields) ? t.fields.length : 0;
    console.log(`   [${t.id}] "${(t.title as any).ar}" — ${fields} حقل`);
  }
  if (catsWithProductsNoType.length > 0) {
    console.log('\n⚠️  فئات بها منتجات بدون قالب:');
    for (const c of catsWithProductsNoType) {
      console.log(`   - ${c.slug}: "${(c.title as any)?.ar}" (${c._count.products} منتج)`);
    }
  } else {
    console.log('\n🎉 جميع الفئات التي تحتوي على منتجات مرتبطة بقوالب!');
  }
  console.log('═══════════════════════════════════════════');
}

main().catch(console.error).finally(() => db.$disconnect());
