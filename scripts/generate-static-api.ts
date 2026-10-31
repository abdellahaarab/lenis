import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const root = join(dirname(__filename), '..');

const loadJson = (name: string) => JSON.parse(readFileSync(join(root, 'src', 'data', `${name}.json`), 'utf-8'));

const products = loadJson('products');
const brands = loadJson('brands');
const faq = loadJson('faq');
const site = loadJson('site');
const warranty = loadJson('warranty');
const bundles = loadJson('bundles');

const categories = [
  { slug: 'laptops', title: { ar: 'لابتوبات', en: 'Laptops' }, sort: 1 },
  { slug: 'desktops', title: { ar: 'اجهزه مكتبيه', en: 'Desktops' }, sort: 2 },
  { slug: 'displays', title: { ar: 'شاشات', en: 'Displays' }, sort: 3 },
  { slug: 'hard-drives', title: { ar: 'الهادسكات', en: 'Hard Drives' }, sort: 4 },
  { slug: 'ram', title: { ar: 'رامات', en: 'RAM' }, sort: 5 },
  { slug: 'cameras', title: { ar: 'كامرات المراقبة', en: 'Security Cameras' }, sort: 6 },
  { slug: 'accessories', title: { ar: 'اكسسوارات', en: 'Accessories' }, sort: 7 },
  { slug: 'network', title: { ar: 'شبكات', en: 'Networking' }, sort: 8 },
  { slug: 'printers', title: { ar: 'طابعات', en: 'Printers' }, sort: 9 },
  { slug: 'audio', title: { ar: 'صوتيات', en: 'Audio' }, sort: 10 }
];

const specs = [
  { key: 'cpu', title: { ar: 'المعالج', en: 'CPU' }, filterable: true },
  { key: 'cpuGen', title: { ar: 'جيل المعالج', en: 'CPU generation' }, filterable: true },
  { key: 'ramGB', title: { ar: 'الرام GB', en: 'RAM GB' }, filterable: true },
  { key: 'ramType', title: { ar: 'نوع الرام', en: 'RAM type' }, filterable: true },
  { key: 'storageGB', title: { ar: 'التخزين GB', en: 'Storage GB' }, filterable: true },
  { key: 'storageType', title: { ar: 'نوع التخزين', en: 'Storage type' }, filterable: true },
  { key: 'ports', title: { ar: 'المنافذ', en: 'Ports' }, filterable: true },
  { key: 'gpu', title: { ar: 'كرت الشاشة', en: 'GPU' }, filterable: true },
  { key: 'display', title: { ar: 'الشاشة', en: 'Display' }, filterable: false },
  { key: 'batteryHealthPct', title: { ar: 'صحة البطارية %', en: 'Battery health %' }, filterable: false },
  { key: 'wifiStandard', title: { ar: 'معيار الشبكة اللاسلكية', en: 'Wi-Fi standard' }, filterable: true },
  { key: 'capacityGB', title: { ar: 'السعة GB', en: 'Capacity GB' }, filterable: true },
  { key: 'capacityVA', title: { ar: 'سعة الطاقة VA', en: 'Power capacity VA' }, filterable: true },
  { key: 'capacityWatts', title: { ar: 'القدرة W', en: 'Power capacity W' }, filterable: true },
  { key: 'connectionType', title: { ar: 'نوع الاتصال', en: 'Connection type' }, filterable: true },
  { key: 'interface', title: { ar: 'واجهة التوصيل', en: 'Interface' }, filterable: true }
];

const catalog = {
  products,
  brands,
  faq,
  site,
  warranty,
  bundles,
  categories,
  specs,
  homeImages: {}
};

const payload = JSON.stringify(catalog);

const apiDir = join(root, 'public', 'api');
mkdirSync(apiDir, { recursive: true });

writeFileSync(join(apiDir, 'bootstrap'), payload, 'utf-8');
writeFileSync(join(apiDir, 'bootstrap.json'), payload, 'utf-8');
writeFileSync(join(apiDir, 'catalog'), payload, 'utf-8');
writeFileSync(join(apiDir, 'catalog.json'), payload, 'utf-8');

console.log('✅ Generated static /api/bootstrap and /api/catalog fallback successfully!');
