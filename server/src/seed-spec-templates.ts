/**
 * seed-spec-templates.ts
 * ========================
 * ينشئ 12 قالب مواصفات معيارياً ثنائي اللغة ويربط كافة الفئات الـ42 بها.
 * يُحدِّث SpecDefinition تلقائياً ويزيل القوالب المشوهة بأمان.
 */
import { createDb } from './db.js';
import { loadConfig } from './config.js';
import { Prisma } from '@prisma/client';

type SpecField = {
  key: string;
  title: { ar: string; en: string };
  valueType: 'text' | 'number' | 'boolean' | 'single' | 'multi';
  unit: string | null;
  options: string[];
  required: boolean;
  filterable: boolean;
  card: boolean;
  sort: number;
};

function field(
  key: string, ar: string, en: string,
  valueType: SpecField['valueType'],
  unit: string | null = null,
  required = false,
  filterable = true,
  card = true,
  options: string[] = [],
  sort = 0
): SpecField {
  return { key, title: { ar, en }, valueType, unit, options, required, filterable, card, sort };
}

// ─── القوالب الـ 12 المعيارية ──────────────────────────────────────────────

const TEMPLATES: {
  id: string;
  title: { ar: string; en: string };
  fields: SpecField[];
  categorySlugs: string[];
}[] = [
  {
    id: 'laptops',
    title: { ar: 'أجهزة لابتوب ومحمول', en: 'Laptops & Mobile Workstations' },
    fields: [
      field('cpu',              'المعالج',            'Processor',        'text',    null,   true,  true,  true,  [], 0),
      field('cpuGen',           'جيل المعالج',         'CPU Generation',   'number',  null,   false, true,  false, [], 1),
      field('ramGB',            'الذاكرة العشوائية',   'RAM',              'number',  'GB',   true,  true,  true,  ['4','8','12','16','24','32','64'], 2),
      field('ramType',          'نوع الذاكرة',         'RAM Type',         'single',  null,   false, true,  false, ['DDR3','DDR4','DDR5','LPDDR4X','LPDDR5'], 3),
      field('storageGB',        'التخزين',             'Storage',          'number',  'GB',   true,  true,  true,  ['128','256','512','1024','2048'], 4),
      field('storageType',      'نوع التخزين',         'Storage Type',     'single',  null,   false, true,  false, ['NVMe M.2 SSD','SATA SSD','HDD'], 5),
      field('display',          'مقاس الشاشة',         'Display Size',     'number',  'inch', false, true,  true,  ['13.3','14','15.6','16','17.3'], 6),
      field('gpu',              'كرت الشاشة',          'GPU',              'text',    null,   false, true,  true,  [], 7),
      field('batteryHealthPct', 'صحة البطارية',        'Battery Health',   'number',  '%',    false, true,  true,  [], 8),
      field('os',               'نظام التشغيل',        'Operating System', 'single',  null,   false, true,  false, ['Windows 11 Pro','Windows 11 Home','Windows 10 Pro','Linux / FreeDOS','No OS'], 9),
      field('weightKg',         'الوزن',               'Weight',           'number',  'kg',   false, false, false, [], 10),
      field('ports',            'المنافذ الرئيسية',    'Main Ports',       'multi',   null,   false, false, false, ['USB-C / Thunderbolt','USB-A x3','HDMI','SD Card Reader','RJ-45 Ethernet','3.5mm Audio'], 11),
    ],
    categorySlugs: [
      'laptops', 'laptops-business', 'laptops-gaming', 'laptops-convertible', 'gaming',
    ],
  },
  {
    id: 'desktops',
    title: { ar: 'أجهزة مكتبية وكيسات', en: 'Desktop PCs & Workstations' },
    fields: [
      field('cpu',          'المعالج',       'Processor',       'text',   null,  true,  true,  true,  [], 0),
      field('cpuGen',       'جيل المعالج',   'CPU Generation',  'number', null,  false, true,  false, [], 1),
      field('ramGB',        'الذاكرة',       'RAM',             'number', 'GB',  true,  true,  true,  ['4','8','16','32','64'], 2),
      field('storageGB',    'التخزين',       'Storage',         'number', 'GB',  true,  true,  true,  ['128','256','512','1024','2048'], 3),
      field('storageType',  'نوع التخزين',   'Storage Type',    'single', null,  false, true,  false, ['NVMe SSD','SATA SSD','HDD'], 4),
      field('gpu',          'كرت الشاشة',   'GPU',             'text',   null,  false, true,  true,  [], 5),
      field('formFactor',   'هيئة الكيس',   'Form Factor',     'single', null,  false, true,  false, ['Tower (كيس عادي)','Mini PC','All-in-One','SFF (Small Form Factor)'], 6),
      field('os',           'نظام التشغيل', 'Operating System','single',  null,  false, true,  false, ['Windows 11 Pro','Windows 10 Pro','Linux','No OS'], 7),
    ],
    categorySlugs: ['item-2zl02d'],
  },
  {
    id: 'displays',
    title: { ar: 'شاشات وتلفزيونات وبروجكتور', en: 'Displays, TVs & Projectors' },
    fields: [
      field('sizeInch',    'مقاس الشاشة',   'Screen Size',     'number', 'inch', true,  true,  true,  ['21.5','24','27','32','34','43','55','65'], 0),
      field('resolution',  'الدقة',          'Resolution',      'single', null,   true,  true,  true,  ['1080p Full HD','2K QHD (1440p)','4K UHD (2160p)','8K'], 1),
      field('refreshHz',   'معدل التحديث',   'Refresh Rate',    'number', 'Hz',   true,  true,  true,  ['60','75','100','144','165','240'], 2),
      field('panel',       'نوع اللوحة',     'Panel Type',      'single', null,   false, true,  false, ['IPS','VA','TN','OLED','QLED','LCD'], 3),
      field('ports',       'المنافذ',        'Ports',           'multi',  null,   false, false, false, ['HDMI 2.1','DisplayPort 1.4','USB-C / Thunderbolt','VGA','USB Hub'], 4),
      field('sizeType',    'نوع الجهاز',     'Display Type',    'single', null,   false, true,  false, ['شاشة كمبيوتر (Monitor)','تلفزيون (TV)','بروجكتور (Projector)'], 5),
    ],
    categorySlugs: [
      'displays', 'displays-monitors', 'displays-televisions', 'displays-projectors',
    ],
  },
  {
    id: 'storage',
    title: { ar: 'وحدات التخزين والهاردات', en: 'Storage & Hard Drives' },
    fields: [
      field('storageForm',   'هيئة القرص',         'Form Factor',    'single', null,   true,  true,  true,  ['M.2 2280 NVMe','2.5" SATA SSD','3.5" Internal HDD','External Portable SSD','External HDD','USB Flash Memory','SD / MicroSD Card'], 0),
      field('capacityGB',    'السعة',               'Capacity',       'number', 'GB',   true,  true,  true,  ['64','128','256','512','1024','2000','4000','8000','10000','12000'], 1),
      field('interface',     'واجهة التوصيل',        'Interface',      'single', null,   false, true,  false, ['PCIe Gen 4 NVMe','PCIe Gen 3 NVMe','SATA III','USB 3.2 Gen 2','USB 3.0','USB 2.0'], 2),
      field('readSpeedMBs',  'سرعة القراءة',         'Read Speed',     'number', 'MB/s', false, false, true,  [], 3),
      field('writeSpeedMBs', 'سرعة الكتابة',         'Write Speed',    'number', 'MB/s', false, false, false, [], 4),
      field('deckUsage',     'الاستخدام المقترح',    'Recommended Use','single', null,   false, true,  false, ['لابتوب (Laptop Internal)','مكتبي (Desktop Internal)','مراقبة وتسجيل (NVR/CCTV)','نقل البيانات (Portable)'], 5),
    ],
    categorySlugs: [
      'storage', 'storage-internal-ssd', 'storage-internal-hdd',
      'storage-external-ssd', 'storage-external-hdd', 'storage-flash-memory',
      'storage-accessories', 'network-cables-tools',
    ],
  },
  {
    id: 'ram',
    title: { ar: 'ذواكر عشوائية RAM', en: 'RAM Memory Modules' },
    fields: [
      field('capacityGB', 'السعة',          'Capacity',    'number', 'GB',  true,  true,  true,  ['4','8','16','32','64'], 0),
      field('generation', 'الجيل',          'Generation',  'single', null,  true,  true,  true,  ['DDR5','DDR4','DDR3','DDR3L'], 1),
      field('speedMhz',   'السرعة / التردد','Speed',       'number', 'MHz', true,  true,  true,  ['1333','1600','2133','2400','2666','3000','3200','4800','5200','5600','6000'], 2),
      field('formFactor', 'التوافق',        'Form Factor', 'single', null,  true,  true,  true,  ['SO-DIMM (لابتوب)','DIMM (مكتبي)'], 3),
    ],
    categorySlugs: [
      'item-f4mop2', 'ram-laptop', 'ram-desktop',
    ],
  },
  {
    id: 'network',
    title: { ar: 'أجهزة الشبكات والراوترات', en: 'Networking & Routers' },
    fields: [
      field('deviceType',   'نوع الجهاز',         'Device Type',   'single', null,    false, true,  true,  ['راوتر لاسلكي (WiFi Router)','موزع (Switch)','Mesh نظام','نقطة وصول (Access Point)','مودم DSL','محول شبكة (Network Adapter)','موسع (Range Extender)','كابل شبكة (Network Cable)','أنتينا (Antenna)'], 0),
      field('wifiStandard', 'معيار الواي فاي',     'Wi-Fi Standard','single', null,    false, true,  true,  ['Wi-Fi 7 (802.11be)','Wi-Fi 6E (802.11ax 6GHz)','Wi-Fi 6 (802.11ax)','Wi-Fi 5 AC (802.11ac)','Wi-Fi 4 N (802.11n)','لا يدعم لاسلكي'], 1),
      field('speedMbps',    'السرعة القصوى',       'Speed',         'number', 'Mbps',  false, true,  true,  [], 2),
      field('portsCount',   'عدد منافذ LAN',       'LAN Ports',     'number', null,    false, false, false, [], 3),
      field('meshSupport',  'دعم Mesh',             'Mesh Support',  'boolean',null,   false, true,  false, [], 4),
    ],
    categorySlugs: [
      'network', 'network-routers-modems', 'network-switches-access-points',
      'network-antennas-extenders', 'network-adapters',
    ],
  },
  {
    id: 'audio',
    title: { ar: 'صوتيات وسماعات وميكروفونات', en: 'Audio, Headphones & Speakers' },
    fields: [
      field('audioType',         'نوع الجهاز',            'Device Type',         'single',  null, false, true,  true,  ['سماعات رأس (Headphones)','سماعات أذن (Earbuds)','مكبر صوت (Speaker)','ميكروفون (Microphone)','جهاز صوت (Audio Interface)','إضاءة ومعدات محتوى'], 0),
      field('connectionType',    'طريقة التوصيل',          'Connection Type',     'single',  null, false, true,  true,  ['Bluetooth 5.x','لاسلكي 2.4GHz','USB','3.5mm Aux','XLR / TRS','Lightning','USB-C'], 1),
      field('wireless',          'لاسلكي',                 'Wireless',            'boolean', null, false, true,  true,  [], 2),
      field('batteryHours',      'عمر البطارية',            'Battery Life',        'number',  'h',  false, true,  true,  [], 3),
      field('noiseCancelling',   'عزل الضوضاء ANC',        'Active Noise Cancel', 'boolean', null, false, true,  false, [], 4),
      field('powerW',            'قدرة السماعة',            'Speaker Power',       'number',  'W',  false, true,  false, [], 5),
      field('frequencyResponse', 'الاستجابة الترددية',     'Freq. Response',      'text',    'Hz', false, false, false, [], 6),
    ],
    categorySlugs: [
      'audio', 'audio-headphones-earbuds', 'audio-speakers',
      'audio-microphones', 'audio-equipment',
    ],
  },
  {
    id: 'power',
    title: { ar: 'أنظمة الطاقة والبطاريات', en: 'Power, UPS & Batteries' },
    fields: [
      field('powerType',    'نوع الجهاز',          'Device Type',    'single', null,  false, true,  true,  ['UPS مزود طاقة احتياطية','شاحن ومحول طاقة (Adapter)','بنك طاقة محمول (Power Bank)','بطارية احتياطية (Battery)','وصلة كهربائية / طاقة (Power Strip)','منظم جهد (Voltage Regulator)'], 0),
      field('powerW',       'القدرة الفعلية',       'Real Power (W)', 'number', 'W',   false, true,  true,  [], 1),
      field('capacityVA',   'السعة الاسمية (VA)',    'Nominal VA',     'number', 'VA',  false, true,  true,  ['600','650','1000','1500','2000','3000'], 2),
      field('capacityMah',  'سعة البطارية مللي',    'Battery (mAh)',   'number', 'mAh', false, true,  false, [], 3),
      field('waveType',     'شكل الموجة',           'Waveform',       'single', null,  false, true,  false, ['Pure Sine Wave موجة نقية','Modified Sine Wave موجة معدلة'], 4),
      field('outletsCount', 'عدد مقابس الكهرباء',  'AC Outlets',     'number', null,  false, false, false, [], 5),
      field('pdWatts',      'شحن سريع PD/QC',       'Fast Charge (W)','number', 'W',   false, true,  false, [], 6),
    ],
    categorySlugs: [
      'power', 'power-ups-batteries', 'power-chargers-adapters',
      'power-banks', 'power-extensions',
    ],
  },
  {
    id: 'printers',
    title: { ar: 'طابعات وماكينات فواتير وباركود', en: 'Printers, POS & Barcode Machines' },
    fields: [
      field('printerType',   'تقنية الطباعة',  'Print Technology', 'single', null,  true,  true,  true,  ['ليزر (Laser)','حبر نفاث (Inkjet / Ink Tank)','حرارية فواتير (Thermal Receipt)','طابعة ملصقات (Label / Barcode)'], 0),
      field('colorType',     'نوع الألوان',    'Color Output',     'single', null,  true,  true,  true,  ['أبيض وأسود (Monochrome)','ألوان (Color)'], 1),
      field('multiFunction', 'متعدد الوظائف', 'Multi-Function',   'boolean',null,  false, true,  true,  [], 2),
      field('connectivity',  'الاتصال',        'Connectivity',     'multi',  null,  false, true,  false, ['Wi-Fi','USB','Ethernet','Bluetooth'], 3),
      field('printWidth',    'عرض الطباعة',    'Print Width',      'number', 'mm',  false, false, false, [], 4),
    ],
    categorySlugs: [
      'item-ara8k7', 'printers-laser', 'printers-inkjet', 'printers-pos-label',
    ],
  },
  {
    id: 'accessories',
    title: { ar: 'إكسسوارات وملحقات الكمبيوتر', en: 'Computer Accessories & Peripherals' },
    fields: [
      field('accessoryType', 'نوع الملحق',       'Accessory Type',  'single',  null, false, true,  true,  ['ماوس (Mouse)','كيبورد (Keyboard)','كابل (Cable)','محول/موزع Hub','حقيبة وغطاء (Bag/Case)','حامل وقاعدة (Stand)','قارئ بطاقة (Card Reader)','كاميرا ويب (Webcam)','أخرى (Other)'], 0),
      field('wireless',      'لاسلكي',            'Wireless',        'boolean', null, false, true,  true,  [], 1),
      field('interface',     'الواجهة / المنفذ',  'Interface',       'single',  null, false, true,  false, ['USB-A','USB-C','Bluetooth','Wireless 2.4GHz','HDMI','DisplayPort','3.5mm','PS/2','Ethernet RJ-45'], 2),
      field('compatibility', 'التوافق',           'Compatibility',   'multi',   null, false, false, false, ['Windows','Mac','Linux','Android'], 3),
    ],
    categorySlugs: [
      'item-co4zkt', 'accessories-mice', 'accessories-keyboards',
      'accessories-cables-connectors', 'accessories-adapters-hubs',
      'accessories-bags-cases', 'accessories-stands-cooling',
      'office', 'photography', 'telephones',
    ],
  },
  {
    id: 'security',
    title: { ar: 'أمن ذكي وأقفال', en: 'Smart Security & Locks' },
    fields: [
      field('lockType',      'طريقة الفتح',    'Unlock Method',  'multi',   null, false, true,  true,  ['بصمة إصبع (Fingerprint)','رمز سري (PIN Code)','مفتاح كهربائي (Smart Key)','بطاقة RFID','جهاز تحكم Fob','جرس فيديو (Video Doorbell)'], 0),
      field('connectivity',  'الاتصال الذكي',  'Smart Connectivity','single',null, false, true,  true,  ['Wi-Fi','Bluetooth','Zigbee','Z-Wave','محلي فقط'], 1),
      field('batteryHours',  'عمر البطارية',   'Battery Life',   'number',  'h',  false, true,  false, [], 2),
      field('cameraRes',     'دقة الكاميرا',   'Camera Res.',    'text',    null, false, false, false, [], 3),
    ],
    categorySlugs: ['security'],
  },
  {
    id: 'software',
    title: { ar: 'برامج وتراخيص رقمية', en: 'Software & Digital Licenses' },
    fields: [
      field('softwareType',  'نوع البرنامج',      'Software Type',  'single', null,   true,  true,  true,  ['نظام تشغيل (OS)','مجموعة أوفيس (Office Suite)','حماية ومكافح فيروس (Antivirus)','تصميم وإبداع (Creative)','أعمال وإدارة (Business)'], 0),
      field('licenseType',   'نوع الرخصة',        'License Type',   'single', null,   false, true,  true,  ['مفتاح تفعيل رقمي (Digital Key)','اشتراك سنوي (Subscription)','مدى الحياة (Lifetime)'], 1),
      field('devicesAllowed','عدد الأجهزة المسموح','Devices Allowed','number', null,   false, true,  false, [], 2),
      field('validityMonths','مدة الصلاحية',       'Validity',       'number', 'شهر', false, true,  false, [], 3),
      field('compatibility', 'التوافق',            'Compatibility',  'multi',  null,   false, true,  false, ['Windows 11','Windows 10','macOS','Android','iOS'], 4),
    ],
    categorySlugs: ['software'],
  },
];

// ─── التنفيذ ─────────────────────────────────────────────────────────────────

const db = createDb(loadConfig().DATABASE_URL);

async function main() {
  console.log('🚀 بدء تثبيت قوالب المواصفات المعيارية الـ 12...\n');

  let templatesSynced = 0;
  let categoriesLinked = 0;
  let specDefsUpserted = 0;

  for (const tmpl of TEMPLATES) {
    const fieldsWithSort = tmpl.fields.map((f, i) => ({ ...f, sort: i }));

    await db.productType.upsert({
      where: { id: tmpl.id },
      create: {
        id: tmpl.id,
        title: tmpl.title as Prisma.InputJsonValue,
        fields: fieldsWithSort as Prisma.InputJsonValue,
      },
      update: {
        title: tmpl.title as Prisma.InputJsonValue,
        fields: fieldsWithSort as Prisma.InputJsonValue,
      },
    });
    templatesSynced++;
    console.log(`  ✅ قالب [${tmpl.id}] — "${tmpl.title.ar}" — ${tmpl.fields.length} حقل`);

    // ربط الفئات بالقالب
    for (const slug of tmpl.categorySlugs) {
      const cat = await db.catalogCategory.findUnique({ where: { slug } });
      if (cat) {
        await db.catalogCategory.update({
          where: { slug },
          data: { productTypeId: tmpl.id },
        });
        categoriesLinked++;
      }
    }

    // مزامنة SpecDefinition للحقول القابلة للفلترة
    for (const f of fieldsWithSort.filter(f => f.filterable)) {
      await db.specDefinition.upsert({
        where: { key: f.key },
        create: {
          key: f.key,
          title: f.title as Prisma.InputJsonValue,
          filterable: true,
          valueType: f.valueType,
          unit: f.unit ?? null,
          options: (f.options || []) as Prisma.InputJsonValue,
          required: f.required,
          card: f.card,
          sort: f.sort,
        },
        update: {
          title: f.title as Prisma.InputJsonValue,
          filterable: true,
          valueType: f.valueType,
          unit: f.unit ?? null,
          options: (f.options || []) as Prisma.InputJsonValue,
          required: f.required,
          card: f.card,
          sort: f.sort,
        },
      });
      specDefsUpserted++;
    }
  }

  // ─── تنظيف القوالب المشوهة القديمة ───────────────────────────────────────
  console.log('\n🧹 تنظيف القوالب القديمة المشوهة...');

  // نقل منتجات type-tnyhl → ram وإزالة القالب التالف
  const tnyhl = await db.productType.findUnique({ where: { id: 'type-tnyhl' } });
  if (tnyhl) {
    await db.product.updateMany({ where: { productTypeId: 'type-tnyhl' }, data: { productTypeId: 'ram' } });
    await db.catalogCategory.updateMany({ where: { productTypeId: 'type-tnyhl' }, data: { productTypeId: 'ram' } });
    await db.productType.delete({ where: { id: 'type-tnyhl' } });
    console.log('  ✅ حذف قالب "type-tnyhl" ونقل منتجاته إلى قالب "ram".');
  }

  // نقل منتجات used-hdd-inspection → storage
  const uhi = await db.productType.findUnique({ where: { id: 'used-hdd-inspection' } });
  if (uhi) {
    await db.product.updateMany({ where: { productTypeId: 'used-hdd-inspection' }, data: { productTypeId: 'storage' } });
    await db.catalogCategory.updateMany({ where: { productTypeId: 'used-hdd-inspection' }, data: { productTypeId: 'storage' } });
    await db.productType.delete({ where: { id: 'used-hdd-inspection' } });
    console.log('  ✅ حذف قالب "used-hdd-inspection" ونقل منتجاته إلى قالب "storage".');
  }

  // إزالة قالب components القديم غير المستخدم
  const comp = await db.productType.findUnique({ where: { id: 'components' } });
  if (comp) {
    await db.productType.delete({ where: { id: 'components' } });
    console.log('  ✅ حذف قالب "components" (غير مستخدم).');
  }

  // ─── تقرير النهاية ────────────────────────────────────────────────────────
  const totalTypes   = await db.productType.count();
  const totalCats    = await db.catalogCategory.count();
  const catsNoType   = await db.catalogCategory.count({ where: { productTypeId: null } });
  const totalSpecDefs= await db.specDefinition.count();

  console.log('\n═══════════════════════════════════════════');
  console.log('✅ اكتمل التثبيت بنجاح!');
  console.log(`   • قوالب مزامنة: ${templatesSynced}`);
  console.log(`   • فئات تم ربطها: ${categoriesLinked}`);
  console.log(`   • SpecDefinitions: ${specDefsUpserted}`);
  console.log(`   • إجمالي القوالب في القاعدة: ${totalTypes}`);
  console.log(`   • إجمالي الفئات في القاعدة: ${totalCats}`);
  console.log(`   • فئات بدون قالب (بها منتجات): ${catsNoType}`);
  console.log(`   • إجمالي SpecDefinitions: ${totalSpecDefs}`);
  console.log('═══════════════════════════════════════════');
}

main()
  .catch(e => { console.error('❌ خطأ:', e); process.exit(1); })
  .finally(() => db.$disconnect());
