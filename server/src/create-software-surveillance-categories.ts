/** Create a future-ready software taxonomy and a new surveillance category tree. */
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { Prisma } from '@prisma/client';
import { createDb } from './db.js';
import { loadConfig } from './config.js';

type FieldType = 'number' | 'text' | 'boolean' | 'single' | 'multi';
type Field = { key: string; title: { ar: string; en: string }; valueType: FieldType; unit?: string; options?: string[]; filterable?: boolean; card?: boolean };
type Category = { slug: string; title: { ar: string; en: string }; description: { ar: string; en: string }; parentSlug: string; sort: number };

const db = createDb(loadConfig().DATABASE_URL);
const surveillanceFields: Field[] = [
  { key: 'monitoringDeviceType', title: { ar: 'نوع جهاز المراقبة', en: 'Monitoring Device Type' }, valueType: 'single', options: ['كاميرا IP وشبكية', 'كاميرا تناظرية HD', 'مسجل DVR', 'مسجل NVR', 'طقم مراقبة متكامل', 'ملحقات مراقبة'] },
  { key: 'monitoringTechnology', title: { ar: 'تقنية الاتصال', en: 'Monitoring Technology' }, valueType: 'single', options: ['شبكي IP', 'تناظري HD', 'لاسلكي Wi-Fi', 'هجين'] },
  { key: 'monitoringResolution', title: { ar: 'دقة التصوير', en: 'Video Resolution' }, valueType: 'text', filterable: false },
  { key: 'monitoringChannelCount', title: { ar: 'عدد القنوات', en: 'Channel Count' }, valueType: 'number', unit: 'قناة' },
  { key: 'monitoringCameraCount', title: { ar: 'عدد الكاميرات', en: 'Camera Count' }, valueType: 'number', unit: 'كاميرا' },
  { key: 'monitoringStorageTB', title: { ar: 'سعة التخزين المدعومة', en: 'Supported Storage' }, valueType: 'number', unit: 'TB' },
  { key: 'monitoringNightVision', title: { ar: 'رؤية ليلية', en: 'Night Vision' }, valueType: 'boolean' },
  { key: 'monitoringMotionDetection', title: { ar: 'كشف الحركة', en: 'Motion Detection' }, valueType: 'boolean' },
  { key: 'monitoringTwoWayAudio', title: { ar: 'صوت ثنائي الاتجاه', en: 'Two-way Audio' }, valueType: 'boolean' },
  { key: 'monitoringRemoteViewing', title: { ar: 'مشاهدة عن بُعد', en: 'Remote Viewing' }, valueType: 'boolean' },
  { key: 'monitoringConnectivity', title: { ar: 'المنافذ والاتصال', en: 'Ports & Connectivity' }, valueType: 'multi', options: ['Ethernet', 'PoE', 'Wi-Fi', 'BNC', 'HDMI', 'USB', '4G/LTE'] },
  { key: 'monitoringEnvironment', title: { ar: 'مكان الاستخدام', en: 'Installation Environment' }, valueType: 'single', options: ['داخلي', 'خارجي', 'داخلي وخارجي'] },
  { key: 'monitoringWeatherRating', title: { ar: 'تصنيف مقاومة العوامل الجوية', en: 'Weather Protection Rating' }, valueType: 'text', filterable: false },
];

const softwareChildren: Category[] = [
  { slug: 'software-antivirus', title: { ar: 'برامج الحماية ومكافحة الفيروسات', en: 'Security & Antivirus Software' }, description: { ar: 'برامج مكافحة الفيروسات والحماية للأجهزة والحسابات.', en: 'Antivirus and security software for devices and accounts.' }, parentSlug: 'software', sort: 1 },
  { slug: 'software-operating-systems', title: { ar: 'أنظمة التشغيل', en: 'Operating Systems' }, description: { ar: 'أنظمة Windows وغيرها من أنظمة التشغيل وتراخيصها.', en: 'Windows and other operating systems and their licenses.' }, parentSlug: 'software', sort: 2 },
  { slug: 'software-office-apps', title: { ar: 'برامج المكتب والإنتاجية', en: 'Office & Productivity Software' }, description: { ar: 'برامج المكتب والكتابة والجداول والعروض والإنتاجية.', en: 'Office, writing, spreadsheet, presentation, and productivity software.' }, parentSlug: 'software', sort: 3 },
  { slug: 'software-design-creative', title: { ar: 'التصميم والإبداع', en: 'Design & Creative Software' }, description: { ar: 'برامج التصميم والصور والفيديو والصوت وصناعة المحتوى.', en: 'Software for design, photo, video, audio, and content creation.' }, parentSlug: 'software', sort: 4 },
  { slug: 'software-business-apps', title: { ar: 'برامج الأعمال والإدارة', en: 'Business & Management Software' }, description: { ar: 'برامج المحاسبة والإدارة ونقاط البيع وتنظيم الأعمال.', en: 'Accounting, management, point-of-sale, and business software.' }, parentSlug: 'software', sort: 5 },
  { slug: 'software-mobile-apps', title: { ar: 'تطبيقات الأجهزة المحمولة', en: 'Mobile Applications' }, description: { ar: 'تطبيقات وتراخيص الهواتف والأجهزة اللوحية.', en: 'Applications and licenses for phones and tablets.' }, parentSlug: 'software', sort: 6 },
  { slug: 'software-utilities', title: { ar: 'الأدوات والتطبيقات المساعدة', en: 'Utilities & Tools' }, description: { ar: 'أدوات النظام والنسخ الاحتياطي وإدارة الملفات والشبكات.', en: 'System, backup, file-management, and networking utilities.' }, parentSlug: 'software', sort: 7 },
];

const surveillanceCategories: Category[] = [
  { slug: 'surveillance-ip-cameras', title: { ar: 'كاميرات مراقبة IP وشبكية', en: 'IP & Network Cameras' }, description: { ar: 'كاميرات المراقبة المتصلة بالشبكة أو Wi-Fi.', en: 'Network-connected and Wi-Fi surveillance cameras.' }, parentSlug: 'surveillance', sort: 1 },
  { slug: 'surveillance-analog-cameras', title: { ar: 'كاميرات مراقبة تناظرية HD', en: 'HD Analog Cameras' }, description: { ar: 'كاميرات المراقبة التناظرية عالية الدقة.', en: 'High-definition analog surveillance cameras.' }, parentSlug: 'surveillance', sort: 2 },
  { slug: 'surveillance-recorders', title: { ar: 'أجهزة تسجيل DVR وNVR', en: 'DVR & NVR Recorders' }, description: { ar: 'مسجلات الفيديو الرقمية والشبكية وملحقاتها الأساسية.', en: 'Digital and network video recorders and their core accessories.' }, parentSlug: 'surveillance', sort: 3 },
  { slug: 'surveillance-kits', title: { ar: 'أنظمة وأطقم مراقبة متكاملة', en: 'Complete Surveillance Systems & Kits' }, description: { ar: 'أطقم تجمع الكاميرات والمسجل ومستلزمات التركيب.', en: 'Kits that combine cameras, a recorder, and installation essentials.' }, parentSlug: 'surveillance', sort: 4 },
  { slug: 'surveillance-accessories', title: { ar: 'ملحقات أنظمة المراقبة', en: 'Surveillance System Accessories' }, description: { ar: 'حوامل ووصلات وملحقات تركيب أنظمة المراقبة.', en: 'Mounts, connectors, and installation accessories for surveillance systems.' }, parentSlug: 'surveillance', sort: 5 },
];

const softwareProductMoves = [
  { id: '181057ca-563e-4897-a009-d0421ad78cf8', category: 'software-office-apps' },
  { id: 'ad00a862-bf0b-471b-88d5-e4c9764488b0', category: 'software-operating-systems' },
  { id: 'c0a5c515-24e9-4aa7-86ee-01ecc7c421e9', category: 'software-office-apps' },
];

function typeFields() {
  return surveillanceFields.map((field, sort) => ({
    key: field.key, title: field.title, valueType: field.valueType,
    unit: field.unit ?? null, options: field.options ?? [], required: false,
    filterable: field.filterable ?? true, card: field.card ?? true, sort,
  }));
}

async function main() {
  const [categories, types, definitions, products, softwareType, softwareTypeDefinition] = await Promise.all([
    db.catalogCategory.findMany({ where: { slug: { in: ['software', 'security', ...softwareChildren.map(c => c.slug), 'surveillance', ...surveillanceCategories.map(c => c.slug)] } } }),
    db.productType.findMany({ where: { id: 'surveillance-system' } }),
    db.specDefinition.findMany({ where: { key: { in: surveillanceFields.map(field => field.key) } } }),
    db.product.findMany({ where: { id: { in: softwareProductMoves.map(p => p.id) }, deletedAt: null }, select: { id: true, category: true, productTypeId: true, brandId: true, title: true, status: true } }),
    db.productType.findUnique({ where: { id: 'software' } }),
    db.specDefinition.findUnique({ where: { key: 'softwareType' } }),
  ]);
  const categoryBySlug = new Map(categories.map(category => [category.slug, category]));
  const requestedSlugs = ['software', ...softwareChildren.filter(c => c.slug !== 'software-antivirus').map(c => c.slug), 'surveillance', ...surveillanceCategories.map(c => c.slug)];
  const slugConflicts = requestedSlugs.filter(slug => categoryBySlug.has(slug) && slug !== 'software');
  const invalidParents = ['software', 'security'].filter(slug => !categoryBySlug.has(slug));
  if (invalidParents.length) throw new Error(`Required parent category not found: ${invalidParents.join(', ')}`);
  if (!softwareType || !softwareTypeDefinition) throw new Error('Existing software specification template is incomplete; inspect before changing categories.');
  if (types.length) throw new Error('Product type surveillance-system already exists; inspect partial state before retrying.');
  if (definitions.length) throw new Error(`Specification keys already exist: ${definitions.map(row => row.key).join(', ')}`);
  if (slugConflicts.length) throw new Error(`Category slugs already exist: ${slugConflicts.join(', ')}`);
  if (products.length !== softwareProductMoves.length) throw new Error(`Expected ${softwareProductMoves.length} direct software products; found ${products.length}. Review before applying.`);
  for (const product of products) {
    if (product.category !== 'software' || product.productTypeId !== 'software') throw new Error(`Software product ${product.id} changed since classification review.`);
  }

  const summary = {
    mode: process.argv.includes('--apply') ? 'apply' : 'preview',
    existingSoftwareRootRenamed: true,
    newSurveillanceRoot: 'surveillance',
    softwareSubcategories: softwareChildren.map(({ slug, title }) => ({ slug, title })),
    surveillanceSubcategories: surveillanceCategories.map(({ slug, title }) => ({ slug, title })),
    surveillanceTemplate: { id: 'surveillance-system', fields: surveillanceFields.length },
    softwareTypeOptionsAdded: ['تطبيقات الأجهزة المحمولة', 'أدوات مساعدة'],
    softwareProductsToRelink: products.map(product => ({ id: product.id, title: product.title, to: softwareProductMoves.find(move => move.id === product.id)!.category, status: product.status })),
    currentSurveillanceProductsToRelink: 0,
  };
  if (!process.argv.includes('--apply')) {
    console.log(JSON.stringify(summary, null, 2));
    return;
  }

  const brandRows = [...new Map(products.map(product => {
    const move = softwareProductMoves.find(item => item.id === product.id)!;
    return [`${product.brandId}\0${move.category}`, { brandId: product.brandId, categorySlug: move.category }];
  })).values()];
  const typeRow = { id: 'surveillance-system', title: { ar: 'أنظمة المراقبة', en: 'Surveillance Systems' } as Prisma.InputJsonValue, fields: typeFields() as Prisma.InputJsonValue };
  const softwareFields = (softwareType.fields as Array<Record<string, unknown>>).map(field => {
    if (field.key !== 'softwareType') return field;
    const options = Array.isArray(field.options) ? [...field.options as string[]] : [];
    for (const option of ['تطبيقات الأجهزة المحمولة', 'أدوات مساعدة']) if (!options.includes(option)) options.push(option);
    return { ...field, options };
  });
  const softwareDefinitionOptions = Array.isArray(softwareTypeDefinition.options) ? [...softwareTypeDefinition.options as string[]] : [];
  for (const option of ['تطبيقات الأجهزة المحمولة', 'أدوات مساعدة']) if (!softwareDefinitionOptions.includes(option)) softwareDefinitionOptions.push(option);
  const newCategories = [
    ...softwareChildren.filter(category => category.slug !== 'software-antivirus').map(category => ({ ...category, productTypeId: 'software' })),
    ...surveillanceCategories.map(category => ({ ...category, productTypeId: 'surveillance-system' })),
  ];
  const defs = surveillanceFields.filter(field => field.filterable ?? true).map((field, sort) => ({
    key: field.key, title: field.title as Prisma.InputJsonValue, filterable: true,
    valueType: field.valueType, unit: field.unit ?? null,
    options: (field.options ?? []) as Prisma.InputJsonValue, required: false,
    card: field.card ?? true, sort,
  }));

  const backupPath = join(process.cwd(), '.backups', `software-surveillance-categories-before-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
  await mkdir(join(process.cwd(), '.backups'), { recursive: true });
  await writeFile(backupPath, JSON.stringify({
    createdAt: new Date().toISOString(),
    categories,
    productTypes: [softwareType],
    specDefinitions: await db.specDefinition.findMany({ where: { key: { in: [...surveillanceFields.map(field => field.key), 'softwareType'] } } }),
    products,
    brandCategories: await db.brandCategory.findMany({ where: { categorySlug: 'software' } }),
  }, null, 2), 'utf8');

  await db.$transaction(async tx => {
    await tx.productType.create({ data: typeRow });
    await tx.productType.update({ where: { id: 'software' }, data: { fields: softwareFields as Prisma.InputJsonValue } });
    await tx.specDefinition.createMany({ data: defs });
    await tx.specDefinition.update({ where: { key: 'softwareType' }, data: { options: softwareDefinitionOptions as Prisma.InputJsonValue } });
    await tx.catalogCategory.update({
      where: { slug: 'software' },
      data: {
        title: { ar: 'البرامج والتطبيقات', en: 'Software & Applications' },
        description: { ar: 'تراخيص أنظمة التشغيل وبرامج المكتب والحماية والتصميم والأعمال والتطبيقات.', en: 'Licenses for operating systems, office, security, creative, business, and application software.' },
      },
    });
    await tx.catalogCategory.create({
      data: {
        slug: 'surveillance',
        title: { ar: 'أنظمة المراقبة', en: 'Surveillance Systems' },
        description: { ar: 'كاميرات المراقبة والمسجلات والأنظمة المتكاملة وملحقات التركيب.', en: 'Surveillance cameras, recorders, complete systems, and installation accessories.' },
        parentSlug: null, sort: 13, status: 'published', productTypeId: 'surveillance-system',
      },
    });
    await tx.catalogCategory.createMany({
      data: newCategories.map(category => ({ ...category, status: 'published' as const, imageId: null })),
    });
    for (const move of softwareProductMoves) {
      await tx.$executeRaw(Prisma.sql`
        UPDATE Product
        SET category = ${move.category}, productTypeId = 'software', updatedAt = CURRENT_TIMESTAMP(3)
        WHERE id = ${move.id}
      `);
    }
    if (brandRows.length) await tx.brandCategory.createMany({ data: brandRows, skipDuplicates: true });
    await tx.auditLog.create({
      data: {
        action: 'catalog.software_surveillance_categories.created',
        entity: 'CatalogCategory', entityId: 'surveillance',
        before: { softwareTitle: categoryBySlug.get('software')!.title, movedProducts: products.map(p => ({ id: p.id, category: p.category })) } as Prisma.InputJsonValue,
        after: { softwareTitle: { ar: 'البرامج والتطبيقات', en: 'Software & Applications' }, root: 'surveillance', categories: newCategories.map(c => c.slug), productTypeId: 'surveillance-system', movedProducts: softwareProductMoves, backupPath } as Prisma.InputJsonValue,
      },
    });
  }, { timeout: 30000, maxWait: 8000 });

  console.log(JSON.stringify({ ...summary, createdSubcategories: newCategories.length, movedProducts: products.length, backupPath }, null, 2));
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}).finally(() => db.$disconnect());
