import { createDb } from './db.js';
import { loadConfig } from './config.js';

async function main() {
  const db = createDb(loadConfig().DATABASE_URL);

  const targetCategories = [
    { slug: 'laptops', title: { ar: 'لابتوبات', en: 'Laptops' }, sort: 1, productTypeId: 'laptops' },
    { slug: 'desktops', title: { ar: 'اجهزه مكتبيه', en: 'Desktops' }, sort: 2, productTypeId: 'desktops' },
    { slug: 'displays', title: { ar: 'شاشات', en: 'Displays' }, sort: 3, productTypeId: 'displays' },
    { slug: 'hard-drives', title: { ar: 'الهادسكات', en: 'Hard Drives' }, sort: 4, productTypeId: 'storage' },
    { slug: 'ram', title: { ar: 'رامات', en: 'RAM' }, sort: 5, productTypeId: 'components' },
    { slug: 'cameras', title: { ar: 'كامرات المراقبة', en: 'Security Cameras' }, sort: 6, productTypeId: null },
    { slug: 'accessories', title: { ar: 'اكسسوارات', en: 'Accessories' }, sort: 7, productTypeId: 'accessories' },
    { slug: 'network', title: { ar: 'شبكات', en: 'Networking' }, sort: 8, productTypeId: 'network' },
    { slug: 'printers', title: { ar: 'طابعات', en: 'Printers' }, sort: 9, productTypeId: null },
    { slug: 'audio', title: { ar: 'صوتيات', en: 'Audio' }, sort: 10, productTypeId: 'audio' }
  ];

  for (const c of targetCategories) {
    await db.catalogCategory.upsert({
      where: { slug: c.slug },
      create: {
        slug: c.slug,
        title: c.title,
        sort: c.sort,
        status: 'published',
        productTypeId: c.productTypeId,
        parentSlug: null
      },
      update: {
        title: c.title,
        sort: c.sort,
        status: 'published',
        productTypeId: c.productTypeId,
        parentSlug: null
      }
    });
    console.log('Upserted category:', c.slug);
  }

  // Link secondary categories to main parents so products are included
  await db.catalogCategory.updateMany({
    where: { slug: 'storage' },
    data: { parentSlug: 'hard-drives', sort: 99 }
  });
  await db.catalogCategory.updateMany({
    where: { slug: 'gaming' },
    data: { parentSlug: 'laptops', sort: 99 }
  });
  await db.catalogCategory.updateMany({
    where: { slug: 'power' },
    data: { parentSlug: 'accessories', sort: 99 }
  });

  console.log('✅ Categories successfully updated in database!');
  await db.$disconnect();
}

main().catch(console.error);
