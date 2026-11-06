import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  ProductsArraySchema,
  BundlesArraySchema,
  BrandsArraySchema,
  FAQArraySchema,
  WarrantyDataSchema,
  SiteDataSchema,
} from '../src/data/schema.js';
import { home } from '../src/data/home.js';
import { referenceHome } from '../src/data/reference-home.js';
import {commerceCopy,orderLabels,errorLabels} from '../src/data/commerce.js';
import { z } from 'zod';
import { LocalizedTextSchema } from '../src/data/schema.js';
const shape = Object.fromEntries(Object.entries(home).filter(([, v]) => typeof v === 'object' && !Array.isArray(v)).map(([k]) => [k, LocalizedTextSchema]));
const HomeSchema = z.object({ ...shape, featuredId: z.string(), chapters: z.array(z.object({ title: LocalizedTextSchema, body: LocalizedTextSchema })), specLabels: z.array(LocalizedTextSchema), deviceRoles: z.array(LocalizedTextSchema), steps: z.array(LocalizedTextSchema), metricLabels: z.array(LocalizedTextSchema) });
const text = z.string().trim().min(1);
const CommerceCopySchema=z.object(Object.fromEntries(Object.keys(commerceCopy.ar).map(key=>[key,text]))).strict();
CommerceCopySchema.parse(commerceCopy.ar);CommerceCopySchema.parse(commerceCopy.en);
z.record(z.string(),LocalizedTextSchema).parse(errorLabels);
if(Object.keys(orderLabels.ar).join(',')!==Object.keys(orderLabels.en).join(','))throw new Error('Order status translations must match');
const ReferenceCopySchema = z.object({
  title: z.array(text).min(1), description: text, helper: text, note: text,
  accessories: text, caption: text, illustration: text, shortcuts: z.array(text).length(3),
  integrationTitle: z.array(text).length(2), integrationDescription: text,
  categoriesDescription: text, businessTitle: z.array(text).length(2),
  serviceTitle: z.array(text).length(2), contactTitle: z.array(text).length(2),
  contactDescription: text, catalogLabel: text, catalogTitle: text,
  catalogDescription: text, catalogEmpty: text, catalogEmptyCta: text,
  faqTitle: text, faqDescription: text,
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const dataDir = path.join(projectRoot, 'src', 'data');

let hasErrors = false;
let warningCount = 0;

function readJsonFile(fileName: string) {
  const filePath = path.join(dataDir, fileName);
  if (!fs.existsSync(filePath)) {
    console.error(`❌ [ERROR] Missing data file: ${fileName}`);
    hasErrors = true;
    return null;
  }
  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(raw);
  } catch (err: any) {
    console.error(`❌ [ERROR] Failed to parse JSON in ${fileName}:`, err.message);
    hasErrors = true;
    return null;
  }
}

function checkBilingualCompleteness(obj: any, pathPrefix = ''): void {
  if (!obj || typeof obj !== 'object') return;
  if ('ar' in obj && 'en' in obj) {
    if (!obj.ar || typeof obj.ar !== 'string' || obj.ar.trim() === '') {
      console.warn(`⚠️ [WARN: i18n] Missing Arabic text at ${pathPrefix}.ar`);
      warningCount++;
    }
    if (!obj.en || typeof obj.en !== 'string' || obj.en.trim() === '') {
      console.warn(`⚠️ [WARN: i18n] Missing English text at ${pathPrefix}.en`);
      warningCount++;
    }
  }
  for (const [key, val] of Object.entries(obj)) {
    if (typeof val === 'object' && val !== null) {
      checkBilingualCompleteness(val, pathPrefix ? `${pathPrefix}.${key}` : key);
    }
  }
}

console.log('🔍 [VALIDATION] Starting Zod schema validation on src/data files...\n');
const homeResult = HomeSchema.safeParse(home);
if (!homeResult.success) { console.error(homeResult.error); hasErrors = true; }
else console.log('✅ home.ts passed bilingual content schema.');
const referenceResult = z.object({ ar: ReferenceCopySchema, en: ReferenceCopySchema }).safeParse(referenceHome);
if (!referenceResult.success) { console.error(referenceResult.error); hasErrors = true; }
else console.log('✅ reference-home.ts passed bilingual content schema.');
const sourceFile = path.join(projectRoot, 'public/images/sources.json');
const imageSources = JSON.parse(fs.readFileSync(sourceFile, 'utf8')).images;
if (!Array.isArray(imageSources)) { console.error('❌ Image source manifest must contain an images array'); hasErrors = true; }
else {
  const unlicensed = imageSources.filter((image: any) => image.licensed !== true);
  if (unlicensed.length) {
    console.warn('\n' + '='.repeat(80));
    console.warn(`⚠️  [UNLICENSED IMAGES]: ${unlicensed.length} manufacturer images have licensed:false!`);
    console.warn('   DEMO USE ONLY. Obtain rights or replace with store photographs before publication.');
    console.warn('='.repeat(80) + '\n');
  }
}

// 1. Products
const productsData = readJsonFile('products.json');
if (productsData) {
  const result = ProductsArraySchema.safeParse(productsData);
  if (!result.success) {
    console.error('❌ [ERROR] products.json validation failed:');
    console.error(JSON.stringify(result.error.format(), null, 2));
    hasErrors = true;
  } else {
    console.log(`✅ products.json passed schema validation (${result.data.length} items).`);
    checkBilingualCompleteness(result.data, 'products');

    const demoProducts = result.data.filter((p) => p.demo === true);
    for (const product of result.data) {
      for (const image of product.images) {
        if (!image.startsWith('/') || !fs.existsSync(path.join(projectRoot, 'public', image))) {
          console.error(`❌ Missing local product image: ${product.id}: ${image}`); hasErrors = true;
        }
        const entry = imageSources?.find((source: any) => source.files.includes(image));
        if (!entry || entry.productId !== product.id || (entry.demoOnly && !product.demo)) {
          console.error(`❌ Image provenance/demo mismatch: ${product.id}: ${image}`); hasErrors = true;
        }
      }
      for (const connection of product.connections ?? []) {
        if (!result.data.some(p => p.id === connection.targetId) || !product.compatibleWith.includes(connection.targetId)) { console.error(`❌ Unknown connection target on ${product.id}`); hasErrors = true; }
        if (connection.verified && (!product.specSources?.includes(connection.source!) || !product.specs.ports?.some(port => port.includes(connection.port!)))) {
          console.error(`❌ Connection lacks documented product port/source on ${product.id}`); hasErrors = true;
        }
        if (connection.verified && connection.watts != null) {
          const target = result.data.find(p => p.id === connection.targetId)!;
          if (product.specs.usbCPdWatts !== connection.watts && target.specs.usbCPdWatts !== connection.watts) { console.error(`❌ Undocumented connection wattage on ${product.id}`); hasErrors = true; }
        }
      }
    }
    if (demoProducts.length > 0) {
      console.warn('\n' + '='.repeat(80));
      console.warn(`⚠️  [DEMO DATA NOTICE]: ${demoProducts.length} DEMO PRODUCTS DETECTED in products.json!`);
      console.warn('   - Products marked with "demo: true" have null prices and null warranty.');
      console.warn('   - Ensure real verified inventory replaces demo products prior to commercial production launch.');
      console.warn('='.repeat(80) + '\n');
    }
  }
}

// 2. Bundles
const bundlesData = readJsonFile('bundles.json');
if (bundlesData) {
  const result = BundlesArraySchema.safeParse(bundlesData);
  if (!result.success) {
    console.error('❌ [ERROR] bundles.json validation failed:');
    console.error(JSON.stringify(result.error.format(), null, 2));
    hasErrors = true;
  } else {
    console.log(`✅ bundles.json passed schema validation (${result.data.length} bundles).`);
    checkBilingualCompleteness(result.data, 'bundles');
  }
}

// 3. Brands
const brandsData = readJsonFile('brands.json');
if (brandsData) {
  const result = BrandsArraySchema.safeParse(brandsData);
  if (!result.success) {
    console.error('❌ [ERROR] brands.json validation failed:');
    console.error(JSON.stringify(result.error.format(), null, 2));
    hasErrors = true;
  } else {
    console.log(`✅ brands.json passed schema validation (${result.data.length} brands).`);
    checkBilingualCompleteness(result.data, 'brands');
  }
}

// 4. FAQ
const faqData = readJsonFile('faq.json');
if (faqData) {
  const result = FAQArraySchema.safeParse(faqData);
  if (!result.success) {
    console.error('❌ [ERROR] faq.json validation failed:');
    console.error(JSON.stringify(result.error.format(), null, 2));
    hasErrors = true;
  } else {
    console.log(`✅ faq.json passed schema validation (${result.data.length} questions).`);
    checkBilingualCompleteness(result.data, 'faq');
  }
}

// 5. Warranty
const warrantyData = readJsonFile('warranty.json');
if (warrantyData) {
  const result = WarrantyDataSchema.safeParse(warrantyData);
  if (!result.success) {
    console.error('❌ [ERROR] warranty.json validation failed:');
    console.error(JSON.stringify(result.error.format(), null, 2));
    hasErrors = true;
  } else {
    console.log(`✅ warranty.json passed schema validation.`);
    checkBilingualCompleteness(result.data, 'warranty');
  }
}

// 6. Site
const siteData = readJsonFile('site.json');
if (siteData) {
  const result = SiteDataSchema.safeParse(siteData);
  if (!result.success) {
    console.error('❌ [ERROR] site.json validation failed:');
    console.error(JSON.stringify(result.error.format(), null, 2));
    hasErrors = true;
  } else {
    console.log(`✅ site.json passed schema validation.`);
    checkBilingualCompleteness(result.data, 'site');

    if (!result.data.whatsapp || !result.data.phone) {
      console.log('ℹ️  [STORE OWNER NOTICE] Contact phone and WhatsApp are null in site.json. WhatsApp actions are guarded.');
    }
  }
}

if (hasErrors) {
  console.error('\n❌ BUILD FAILED: Data validation errors encountered. Fix the data before building.\n');
  process.exit(1);
}

if (warningCount > 0) {
  console.warn(`\n⚠️  Build proceeded with ${warningCount} i18n warnings.\n`);
} else {
  console.log('\n🎉 All data files are fully valid and bilingual!\n');
}
