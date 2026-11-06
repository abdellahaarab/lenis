/**
 * Add focused specification templates for catalog families confirmed by
 * product-title review. Existing productType templates and product specs are
 * preserved; only the new templates, their category links, and matching facet
 * definitions are written.
 *
 * Run with: npx tsx server/src/seed-missing-spec-templates.ts
 */
import { Prisma } from '@prisma/client';
import { createDb } from './db.js';
import { loadConfig } from './config.js';

type FieldType = 'number' | 'text' | 'boolean' | 'single' | 'multi';
type Field = {
  key: string;
  title: { ar: string; en: string };
  valueType: FieldType;
  unit?: string;
  options?: string[];
  filterable?: boolean;
  card?: boolean;
};
type Template = {
  id: string;
  title: { ar: string; en: string };
  categorySlug: string;
  fields: Field[];
};

const f = (
  key: string,
  ar: string,
  en: string,
  valueType: FieldType,
  options: string[] = [],
  unit?: string,
  filterable = true,
): Field => ({ key, title: { ar, en }, valueType, options, ...(unit ? { unit } : {}), filterable, card: true });

const templates: Template[] = [
  {
    id: 'network-cabling-tools',
    title: { ar: 'كابلات وأدوات الشبكات', en: 'Network Cables & Installation Tools' },
    categorySlug: 'network-cables-tools',
    fields: [
      f('networkAccessoryType', 'نوع ملحق الشبكة', 'Network Accessory Type', 'single', ['كابل شبكة', 'مقبس أو موصل', 'لوحة توزيع', 'كماشة كبس', 'فاحص كابلات', 'موسع أو محول', 'واقي صواعق']),
      f('networkCableStandard', 'تصنيف الكابل', 'Cable Category', 'single', ['Cat5e', 'Cat6', 'Cat6A', 'Cat7', 'Cat8']),
      f('networkCableLengthM', 'طول الكابل', 'Cable Length', 'number', [], 'm'),
      f('networkCableShielding', 'تدريع الكابل', 'Cable Shielding', 'single', ['UTP', 'FTP', 'STP', 'SFTP']),
      f('networkPortCount', 'عدد المنافذ', 'Port Count', 'number'),
      f('networkConnectorType', 'نوع الموصل', 'Connector Type', 'multi', ['RJ45', 'RJ11', 'USB-A', 'USB-C', 'DC']),
    ],
  },
  {
    id: 'office-barcode-scanners',
    title: { ar: 'قارئات الباركود', en: 'Barcode Scanners' },
    categorySlug: 'office-barcode-scanners',
    fields: [
      f('barcodeScannerForm', 'شكل القارئ', 'Scanner Form', 'single', ['يدوي', 'ثابت / عرضي', 'لاسلكي محمول']),
      f('barcodeScannerCodes', 'أنواع الرموز', 'Supported Codes', 'multi', ['1D', '2D / QR']),
      f('barcodeScannerConnection', 'الاتصال', 'Connectivity', 'multi', ['USB', 'Bluetooth', 'لاسلكي 2.4GHz']),
      f('barcodeScannerInterface', 'واجهة التوصيل', 'Host Interface', 'multi', ['USB', 'Serial / RS-232', 'Keyboard Wedge']),
      f('barcodeScannerStandIncluded', 'حامل مرفق', 'Stand Included', 'boolean'),
    ],
  },
  {
    id: 'office-paper',
    title: { ar: 'الورق والملصقات المكتبية', en: 'Office Paper & Labels' },
    categorySlug: 'office-paper',
    fields: [
      f('officePaperSize', 'المقاس', 'Paper Size', 'single', ['A3', 'A4', 'A5', 'مقاس مخصص']),
      f('officePaperWeightGsm', 'وزن الورق', 'Paper Weight', 'number', [], 'g/m²'),
      f('officePaperSheetCount', 'عدد الأوراق أو الملصقات', 'Sheet or Label Count', 'number'),
      f('officePaperMediaType', 'نوع المادة', 'Media Type', 'single', ['ورق تصوير', 'ملصقات', 'بطاقات']),
    ],
  },
  {
    id: 'photography-cameras',
    title: { ar: 'كاميرات التصوير والفيديو', en: 'Photo & Video Cameras' },
    categorySlug: 'photography-cameras',
    fields: [
      f('imagingCameraType', 'نوع الكاميرا', 'Camera Type', 'single', ['كاميرا جيب', 'كاميرا ويب', 'كاميرا أكشن']),
      f('imagingVideoResolution', 'أقصى دقة فيديو', 'Maximum Video Resolution', 'single', ['1080p', '2K', '4K', '5K']),
      f('imagingConnectivity', 'الاتصال', 'Connectivity', 'multi', ['USB', 'Wi-Fi', 'Bluetooth', 'HDMI']),
      f('imagingStabilization', 'تثبيت الصورة', 'Image Stabilization', 'boolean'),
      f('imagingBundle', 'الملحقات المرفقة', 'Included Accessories', 'text', [], undefined, false),
    ],
  },
  {
    id: 'photography-lighting-support',
    title: { ar: 'إضاءة وحوامل التصوير', en: 'Photography Lighting & Support' },
    categorySlug: 'photography-lighting-support',
    fields: [
      f('photoSupportType', 'نوع المنتج', 'Equipment Type', 'single', ['فلاش استوديو', 'إضاءة LED', 'حامل ثلاثي', 'حامل إضاءة']),
      f('photoLightPowerW', 'قدرة الإضاءة', 'Light Power', 'number', [], 'W'),
      f('photoColorTemperatureK', 'حرارة اللون', 'Color Temperature', 'number', [], 'K'),
      f('photoMountType', 'نوع قاعدة التثبيت', 'Mount Type', 'single', ['1/4 بوصة', '3/8 بوصة', 'Bowens', 'حامل إضاءة']),
      f('photoStandHeightCm', 'أقصى ارتفاع للحامل', 'Maximum Stand Height', 'number', [], 'cm'),
    ],
  },
  {
    id: 'gaming-graphics-cards',
    title: { ar: 'بطاقات الرسومات', en: 'Graphics Cards' },
    categorySlug: 'gaming-graphics-cards',
    fields: [
      f('graphicsChipset', 'المعالج الرسومي', 'GPU Chipset', 'text', [], undefined, false),
      f('graphicsMemoryGB', 'ذاكرة البطاقة', 'Video Memory', 'number', [], 'GB'),
      f('graphicsMemoryType', 'نوع ذاكرة البطاقة', 'Memory Type', 'single', ['GDDR6', 'GDDR6X', 'GDDR7']),
      f('graphicsBusInterface', 'واجهة البطاقة', 'Bus Interface', 'single', ['PCIe 3.0', 'PCIe 4.0', 'PCIe 5.0']),
      f('graphicsOutputPorts', 'مخارج العرض', 'Display Outputs', 'multi', ['HDMI', 'DisplayPort', 'USB-C']),
    ],
  },
  {
    id: 'gaming-consoles-controllers',
    title: { ar: 'أجهزة وتحكم الألعاب', en: 'Gaming Consoles & Controllers' },
    categorySlug: 'gaming-consoles-controllers',
    fields: [
      f('gamingHardwareType', 'نوع الجهاز', 'Gaming Hardware Type', 'single', ['جهاز ألعاب', 'يد تحكم', 'محول تحكم']),
      f('gamingHardwarePlatform', 'المنصة المتوافقة', 'Compatible Platform', 'multi', ['PlayStation', 'Xbox', 'Windows PC', 'Android', 'iOS']),
      f('gamingHardwareStorageGB', 'سعة التخزين', 'Storage Capacity', 'number', [], 'GB'),
      f('gamingHardwareConnectivity', 'الاتصال', 'Connectivity', 'multi', ['USB', 'Bluetooth', 'لاسلكي']),
    ],
  },
  {
    id: 'accessory-stands-cooling',
    title: { ar: 'حوامل وقواعد التبريد', en: 'Stands & Cooling Bases' },
    categorySlug: 'accessories-stands-cooling',
    fields: [
      f('standCoolingType', 'نوع المنتج', 'Product Type', 'single', ['حامل لابتوب', 'حامل شاشة', 'حامل تلفزيون', 'قاعدة تبريد لابتوب', 'مروحة كابينة']),
      f('standCoolingSizeInch', 'المقاس المدعوم', 'Supported Size', 'number', [], 'in'),
      f('standCoolingMaxLoadKg', 'أقصى وزن تحمّل', 'Maximum Load', 'number', [], 'kg'),
      f('standCoolingAdjustable', 'قابل لتعديل الارتفاع أو الزاوية', 'Adjustable', 'boolean'),
      f('coolingFanCount', 'عدد مراوح التبريد', 'Cooling Fan Count', 'number'),
      f('coolingPowerConnection', 'مصدر الطاقة', 'Power Connection', 'single', ['USB', 'AC', 'بدون طاقة']),
    ],
  },
  {
    id: 'telephones',
    title: { ar: 'الهواتف الثابتة واللاسلكية', en: 'Corded & Cordless Telephones' },
    categorySlug: 'telephones',
    fields: [
      f('telephoneConnectionType', 'نوع الهاتف', 'Telephone Type', 'single', ['سلكي', 'لاسلكي DECT']),
      f('telephoneHandsetCount', 'عدد السماعات', 'Handset Count', 'number'),
      f('telephoneDisplay', 'شاشة عرض', 'Display', 'boolean'),
      f('telephoneSpeakerphone', 'مكبر صوت', 'Speakerphone', 'boolean'),
      f('telephoneCallerId', 'إظهار هوية المتصل', 'Caller ID', 'boolean'),
      f('telephoneAnsweringMachine', 'مسجل رسائل صوتية', 'Answering Machine', 'boolean'),
    ],
  },
  {
    id: 'accessory-screen-protectors',
    title: { ar: 'حمايات شاشات اللابتوب', en: 'Laptop Screen Protectors' },
    categorySlug: 'accessories-screen-protectors',
    fields: [
      f('screenProtectorDeviceType', 'الجهاز المتوافق', 'Compatible Device', 'single', ['لابتوب', 'شاشة كمبيوتر']),
      f('screenProtectorSizeInch', 'مقاس الشاشة', 'Screen Size', 'number', [], 'in'),
      f('screenProtectorFinish', 'نوع السطح', 'Finish', 'single', ['لامع', 'مطفي', 'خصوصية']),
      f('screenProtectorPieceCount', 'عدد القطع', 'Piece Count', 'number'),
    ],
  },
  {
    id: 'accessory-styluses',
    title: { ar: 'أقلام اللمس الرقمية', en: 'Digital Styluses' },
    categorySlug: 'accessories-styluses',
    fields: [
      f('stylusCompatibility', 'الأجهزة المتوافقة', 'Compatible Devices', 'multi', ['Microsoft Surface', 'شاشات لمس عامة']),
      f('stylusTechnology', 'تقنية القلم', 'Stylus Technology', 'single', ['نشط إلكتروني', 'سعوي سلبي']),
      f('stylusPressureLevels', 'مستويات حساسية الضغط', 'Pressure Levels', 'number'),
      f('stylusRechargeable', 'قابل للشحن', 'Rechargeable', 'boolean'),
      f('stylusPalmRejection', 'رفض لمس راحة اليد', 'Palm Rejection', 'boolean'),
    ],
  },
  {
    id: 'smart-plugs',
    title: { ar: 'المقابس الذكية', en: 'Smart Plugs' },
    categorySlug: 'power-smart-plugs',
    fields: [
      f('smartPlugConnectivity', 'طريقة الاتصال', 'Connectivity', 'multi', ['Wi-Fi', 'Bluetooth', 'Zigbee']),
      f('smartPlugMaxLoadW', 'أقصى حمل كهربائي', 'Maximum Load', 'number', [], 'W'),
      f('smartPlugEnergyMonitoring', 'مراقبة استهلاك الطاقة', 'Energy Monitoring', 'boolean'),
      f('smartPlugVoiceAssistant', 'مساعدات صوتية متوافقة', 'Voice Assistants', 'multi', ['Alexa', 'Google Assistant']),
      f('smartPlugRemoteControl', 'تحكم عبر التطبيق', 'App Remote Control', 'boolean'),
    ],
  },
];

const db = createDb(loadConfig().DATABASE_URL);
const auditJson = (value: unknown) => JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;

async function main() {
  const seen = new Set<string>();
  for (const template of templates) {
    if (seen.has(template.id)) throw new Error(`Duplicate template id: ${template.id}`);
    seen.add(template.id);
    const keys = template.fields.map(field => field.key);
    if (new Set(keys).size !== keys.length) throw new Error(`Duplicate field key in ${template.id}`);
    for (const key of keys) if (key.length > 80) throw new Error(`Field key too long: ${key}`);
  }

  const [existingTypes, targetCategories, existingDefinitions] = await Promise.all([
    db.productType.findMany({ where: { id: { in: templates.map(template => template.id) } } }),
    db.catalogCategory.findMany({ where: { slug: { in: templates.map(template => template.categorySlug) } } }),
    db.specDefinition.findMany({ where: { key: { in: templates.flatMap(template => template.fields.map(field => field.key)) } } }),
  ]);
  const categoryBySlug = new Map(targetCategories.map(category => [category.slug, category]));
  for (const template of templates) {
    if (!categoryBySlug.has(template.categorySlug)) throw new Error(`Required catalog category not found: ${template.categorySlug}`);
  }
  if (existingTypes.length > 0) {
    const allReady = existingTypes.length === templates.length && templates.every(template =>
      categoryBySlug.get(template.categorySlug)?.productTypeId === template.id,
    );
    if (allReady) {
      console.log(JSON.stringify({ alreadyComplete: true, templates: templates.length }));
      return;
    }
    throw new Error('Partial template state detected; no changes made. Review the existing template IDs before retrying.');
  }

  const typeRows = templates.map(template => ({
    id: template.id,
    title: template.title as Prisma.InputJsonValue,
    fields: template.fields.map((field, sort) => ({
        key: field.key,
        title: field.title,
        valueType: field.valueType,
        unit: field.unit ?? null,
        options: field.options ?? [],
        required: false,
        filterable: field.filterable ?? true,
        card: field.card ?? true,
        sort,
      })) as Prisma.InputJsonValue,
  }));
  const definitions = templates.flatMap(template => template.fields
    .filter(field => field.filterable ?? true)
    .map((field, sort) => ({ field, sort })));
  const existingDefinitionKeys = new Set(existingDefinitions.map(definition => definition.key));
  const definitionRows = definitions.filter(({ field }) => !existingDefinitionKeys.has(field.key)).map(({ field, sort }) => ({
    key: field.key,
    title: field.title as Prisma.InputJsonValue,
    filterable: true,
    valueType: field.valueType,
    unit: field.unit ?? null,
    options: (field.options ?? []) as Prisma.InputJsonValue,
    required: false,
    card: field.card ?? true,
    sort,
  }));
  const auditRows = templates.flatMap(template => {
    const category = categoryBySlug.get(template.categorySlug)!;
    const fields = typeRows.find(row => row.id === template.id)!.fields;
    return [
      {
        action: 'type.created',
        entity: 'ProductType',
        entityId: template.id,
        before: Prisma.JsonNull,
        after: auditJson({ id: template.id, title: template.title, fields }),
      },
      {
        action: 'category.template_assigned',
        entity: 'CatalogCategory',
        entityId: category.slug,
        before: auditJson(category),
        after: auditJson({ ...category, productTypeId: template.id }),
      },
    ];
  });

  const result = await db.$transaction(async tx => {
    await tx.productType.createMany({ data: typeRows });
    if (definitionRows.length) await tx.specDefinition.createMany({ data: definitionRows });
    const categorySql = templates.map(template => Prisma.sql`WHEN ${template.categorySlug} THEN ${template.id}`);
    await tx.$executeRaw(Prisma.sql`
      UPDATE CatalogCategory
      SET productTypeId = CASE slug ${Prisma.join(categorySql, ' ')} END,
          updatedAt = CURRENT_TIMESTAMP(3)
      WHERE slug IN (${Prisma.join(templates.map(template => template.categorySlug))})
    `);
    await tx.auditLog.createMany({ data: auditRows });
    return {
      templates: templates.length,
      templatesCreated: templates.length,
      categoriesLinked: templates.length,
      definitionsSynced: definitionRows.length,
    };
  }, { timeout: 15000, maxWait: 8000 });

  console.log(JSON.stringify(result));
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}).finally(() => db.$disconnect());
