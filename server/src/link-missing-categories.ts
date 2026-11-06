import { createDb } from './db.js';
import { loadConfig } from './config.js';

const db = createDb(loadConfig().DATABASE_URL);

// خريطة ربط الفئات الفرعية الجديدة بالقوالب المعيارية
const MISSING_LINKS: { slug: string; typeId: string }[] = [
  // لابتوبات
  { slug: 'laptops-consumer',                typeId: 'laptops' },
  { slug: 'laptops-workstations',             typeId: 'laptops' },
  // مكتبي
  { slug: 'computers-all-in-one',             typeId: 'desktops' },
  { slug: 'computers-tower',                  typeId: 'desktops' },
  // شاشات
  { slug: 'displays-gaming-monitors',         typeId: 'displays' },
  // ألعاب
  { slug: 'gaming-consoles-controllers',      typeId: 'accessories' },
  { slug: 'gaming-graphics-cards',            typeId: 'accessories' },
  // إكسسوارات
  { slug: 'accessories-keyboard-mouse-combos',typeId: 'accessories' },
  { slug: 'accessories-cleaning',             typeId: 'accessories' },
  { slug: 'accessories-screen-protectors',    typeId: 'accessories' },
  { slug: 'accessories-styluses',             typeId: 'accessories' },
  // مكتبية
  { slug: 'office-barcode-scanners',          typeId: 'accessories' },
  { slug: 'office-paper',                     typeId: 'accessories' },
  // تصوير
  { slug: 'photography-cameras',              typeId: 'accessories' },
  { slug: 'photography-lighting-support',     typeId: 'accessories' },
  // طاقة
  { slug: 'power-computer-psu',               typeId: 'power' },
  { slug: 'power-smart-plugs',                typeId: 'power' },
  // أمان
  { slug: 'security-smart-locks',             typeId: 'security' },
  { slug: 'security-video-doorbells',         typeId: 'security' },
  // برامج
  { slug: 'software-antivirus',               typeId: 'software' },
];

async function main() {
  console.log('🔗 ربط الفئات الفرعية المتبقية...\n');
  let linked = 0;
  let notFound = 0;

  for (const { slug, typeId } of MISSING_LINKS) {
    const cat = await db.catalogCategory.findUnique({ where: { slug } });
    if (cat) {
      await db.catalogCategory.update({ where: { slug }, data: { productTypeId: typeId } });
      console.log(`  ✅ ${slug} → ${typeId}`);
      linked++;
    } else {
      console.log(`  ⚠️  لم يوجد: ${slug}`);
      notFound++;
    }
  }

  // تحقق نهائي
  const remaining = await db.catalogCategory.findMany({
    where: { productTypeId: null },
    select: { slug: true, _count: { select: { products: true } } }
  });
  const withProducts = remaining.filter(c => c._count.products > 0);

  console.log(`\n═══════════════════════════════════════════`);
  console.log(`✅ تم ربط ${linked} فئة إضافية`);
  console.log(`   غير موجودة: ${notFound}`);
  console.log(`   فئات بدون قالب (بها منتجات): ${withProducts.length}`);
  if (withProducts.length > 0) {
    withProducts.forEach(c => console.log(`   - ${c.slug} (${c._count.products} منتج)`));
  } else {
    console.log('🎉 جميع الفئات مرتبطة بقوالب!');
  }
  console.log('═══════════════════════════════════════════');
}

main().catch(console.error).finally(() => db.$disconnect());
