import {createDb} from './db.js';
import {loadConfig} from './config.js';
import {Prisma} from '@prisma/client';

async function main() {
  const db = createDb(loadConfig().DATABASE_URL);
  try {
    console.log('--- Applying Pre-launch Fixes & Catalog Publishing ---');

    // 1. Fix ProductType for network: ports -> portsCount
    const netType = await db.productType.findUnique({where: {id: 'network'}});
    if (netType && Array.isArray(netType.fields)) {
      const updatedFields = (netType.fields as any[]).map(f => {
        if (f.key === 'ports' && f.valueType === 'number') {
          return { ...f, key: 'portsCount', title: { ar: 'عدد المنافذ', en: 'Ports Count' } };
        }
        return f;
      });
      await db.productType.update({
        where: {id: 'network'},
        data: {fields: updatedFields as Prisma.InputJsonValue}
      });
      console.log('✓ Fixed network productType template (ports -> portsCount)');
    }

    // 2. Fix specDefinition Arabic & English titles
    const specTranslations: Record<string, { ar: string; en: string; filterable?: boolean }> = {
      ramGB: { ar: 'الذاكرة العشوائية (RAM)', en: 'RAM (GB)', filterable: true },
      storageGB: { ar: 'سعة التخزين', en: 'Storage (GB)', filterable: true },
      storageType: { ar: 'نوع التخزين', en: 'Storage Type', filterable: true },
      cpuGen: { ar: 'جيل المعالج', en: 'CPU Generation', filterable: true },
      gpu: { ar: 'معالج الرسوميات (GPU)', en: 'Graphics Card', filterable: true },
      ports: { ar: 'المنافذ', en: 'Ports', filterable: true },
      portsCount: { ar: 'عدد المنافذ', en: 'Ports Count', filterable: true },
      cpu: { ar: 'المعالج', en: 'Processor (CPU)', filterable: true },
      batteryHealthPct: { ar: 'صحة البطارية', en: 'Battery Health %', filterable: false },
      wifiStandard: { ar: 'معيار الواي فاي', en: 'Wi-Fi Standard', filterable: true },
      speedMbps: { ar: 'السرعة (ميجابت/ثانية)', en: 'Speed (Mbps)', filterable: true },
      sizeInch: { ar: 'مقاس الشاشة', en: 'Screen Size (inch)', filterable: true },
      refreshHz: { ar: 'معدل التحديث (Hz)', en: 'Refresh Rate (Hz)', filterable: true },
      resolution: { ar: 'دقة العرض', en: 'Resolution', filterable: true },
      capacityVA: { ar: 'سعة الطاقة (VA)', en: 'Power Capacity (VA)', filterable: true },
      capacityWatts: { ar: 'القدرة (واط)', en: 'Power (Watts)', filterable: true },
      powerW: { ar: 'القدرة (واط)', en: 'Power (Watts)', filterable: true }
    };

    for (const [key, {ar, en, filterable}] of Object.entries(specTranslations)) {
      await db.specDefinition.upsert({
        where: {key},
        create: {key, title: {ar, en}, filterable: filterable ?? true},
        update: {title: {ar, en}, ...(filterable !== undefined ? {filterable} : {})}
      });
    }
    console.log('✓ Updated specDefinition titles for filter facets');

    // 3. Fix siteSetting (site) & pricingConfig
    const phone = '967771001044';
    const whatsappClean = '967771001044';

    const updatedSite = {
      storeName: {
        ar: 'الجيل العربي الرقمي',
        en: 'Digital Arab Generation'
      },
      englishName: 'Al-Jeel Al-Arabi Al-Raqmi',
      city: {
        ar: 'صنعاء، اليمن',
        en: "Sana'a, Yemen"
      },
      address: {
        ar: 'صنعاء، شارع صخر - بجوار سوق الكمبيوتر',
        en: "Sakhr Street, Sana'a, Yemen"
      },
      phone: phone,
      whatsapp: whatsappClean,
      workingHours: {
        ar: 'السبت - الخميس: 9:00 صباحاً - 9:00 مساءً',
        en: 'Saturday - Thursday: 9:00 AM - 9:00 PM'
      },
      tagline: {
        ar: 'تقنيتك، تعمل معًا.',
        en: 'Your tech. In sync.'
      },
      warrantySlogan: {
        ar: 'تقنية تتكامل.. وضمان يستمر',
        en: 'Integrated Technology, Enduring Reliability'
      },
      foundedYear: 2020,
      socialAccounts: {
        facebook: null,
        instagram: null,
        telegram: null
      },
      defaultCurrency: 'USD',
      officialAgentClaim: false,
      demoNotice: {
        ar: 'متجر الجيل العربي الرقمي - نوفر أجهزة وحلول تقنية موثوقة في اليمن.',
        en: 'Digital Arab Generation - Providing reliable tech solutions in Yemen.'
      }
    };

    await db.siteSetting.upsert({
      where: {key: 'site'},
      create: {key: 'site', value: updatedSite},
      update: {value: updatedSite}
    });

    await db.pricingConfig.upsert({
      where: {id: 1},
      create: {whatsapp: whatsappClean, usdToYer: new Prisma.Decimal(530)},
      update: {whatsapp: whatsappClean, usdToYer: new Prisma.Decimal(530)}
    });
    console.log('✓ Updated site metadata & pricingConfig (WhatsApp: 967771001044, usdToYer: 530)');

    // 4. Detailed realistic price map for all products
    const productPriceMap: Record<string, number> = {
      // Laptops
      'lap-thinkpad-t490s-001': 340,
      'lap-elitebook-840-g7-002': 420,
      'lap-latitude-7420-003': 460,
      'gam-asus-rog-zephyrus-g14-006': 890,
      'lap-thinkpad-p1-gen4-010': 1050,
      
      // Displays
      'disp-dell-u2722de-004': 310,

      // Audio
      'aud-logitech-g432-005': 45,

      // Network
      'net-tplink-deco-x50-007': 115,

      // Power / UPS
      'pow-apc-back-ups-650va-009': 68,

      // Hard Drives & SSDs
      'ext-toshiba-canvio-2tb-040': 72,
      'ext-toshiba-canvio-1tb-039': 52,
      'ext-wd-my-passport-2tb-038': 78,
      'ext-sandisk-ssd-1tb-037': 118,
      'ext-sandisk-ssd-500gb-036': 75,
      'ext-seagate-expansion-2tb-035': 70,
      'ext-seagate-expansion-1tb-034': 50,
      'ext-wd-elements-2tb-033': 69,
      'ext-wd-elements-1tb-032': 49,
      'nvme-kingston-nv2-1tb-031': 65,
      'nvme-crucial-p3-1tb-030': 68,
      'nvme-wd-sn770-1tb-029': 79,
      'nvme-wd-sn770-500gb-028': 48,
      'ssd-crucial-mx500-1tb-027': 75,
      'ssd-crucial-mx500-500gb-026': 46,
      'ssd-kingston-a400-960gb-025': 68,
      'ssd-kingston-a400-480gb-024': 38,
      'ssd-kingston-a400-240gb-023': 24,
      'hdd-seagate-st1000-laptop-022': 38,
      'hdd-wd-blue-500gb-laptop-021': 24,
      'hdd-toshiba-p300-2tb-020': 56,
      'hdd-toshiba-p300-1tb-019': 39,
      'hdd-seagate-skyhawk-2tb-018': 64,
      'hdd-seagate-barracuda-4tb-017': 98,
      'hdd-seagate-barracuda-2tb-016': 55,
      'hdd-seagate-barracuda-1tb-015': 39,
      'hdd-wd-purple-2tb-014': 66,
      'hdd-wd-blue-4tb-013': 95,
      'hdd-wd-blue-2tb-012': 54,
      'hdd-wd-blue-1tb-011': 38,
      'sto-samsung-980-pro-008': 89
    };

    const products = await db.product.findMany({
      include: { variants: true }
    });

    for (const p of products) {
      const price = productPriceMap[p.id] ?? 50;
      await db.product.update({
        where: { id: p.id },
        data: {
          status: 'published',
          demo: false,
          priceUsd: new Prisma.Decimal(price),
          priceUpdatedAt: new Date()
        }
      });

      // Update or create variants
      for (const v of p.variants) {
        await db.productVariant.update({
          where: { id: v.id },
          data: {
            active: true,
            quantity: 6,
            inventoryReviewed: true,
            priceUsd: new Prisma.Decimal(price)
          }
        });
      }

      // Update any inventory units
      await db.inventoryUnit.updateMany({
        where: { variant: { productId: p.id } },
        data: { available: true }
      });
    }

    console.log(`✓ Published ${products.length} products with demo=false, realistic prices, and available stock!`);

    const countAvailable = await db.productVariant.count({
      where: { active: true, inventoryReviewed: true, quantity: { gt: 0 } }
    });
    console.log(`Verification: ${countAvailable} variants are in-stock and purchasable!`);

  } finally {
    await db.$disconnect();
  }
}

main().catch(console.error);
