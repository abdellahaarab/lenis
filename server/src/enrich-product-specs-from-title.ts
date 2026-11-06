/**
 * Infer only explicit catalog attributes from product titles/models and link
 * every product to the specification template assigned to its category.
 * Run in preview mode by default; pass --apply to write to the cloud database.
 */
import { Prisma } from '@prisma/client';
import { createDb } from './db.js';
import { loadConfig } from './config.js';

type Field = {
  key: string;
  valueType: 'number' | 'text' | 'boolean' | 'single' | 'multi';
  options?: string[];
};
type Category = { slug: string; parentSlug: string | null; productTypeId: string | null };
type Product = {
  id: string;
  category: string;
  brandId: string;
  productTypeId: string | null;
  title: unknown;
  model: string;
  specs: unknown;
};
type Change = { id: string; brandId: string; oldCategory: string; category: string; oldTypeId: string | null; productTypeId: string | null; specs: Record<string, unknown>; added: string[]; title: string };

const db = createDb(loadConfig().DATABASE_URL);
const arabicDigits: Record<string, string> = { '٠':'0','١':'1','٢':'2','٣':'3','٤':'4','٥':'5','٦':'6','٧':'7','٨':'8','٩':'9' };

function titleText(value: unknown): string {
  const localized = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  return [localized.ar, localized.en].filter(value => typeof value === 'string').join(' ');
}
function normalize(value: string): string {
  return value.replace(/[٠-٩]/g, digit => arabicDigits[digit]).replace(/[٫٬]/g, '.').replace(/\s+/g, ' ').trim();
}
function objectValue(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? { ...(value as Record<string, unknown>) } : {};
}
function numberMatch(text: string, expressions: RegExp[]): number | undefined {
  for (const expression of expressions) {
    const match = expression.exec(text);
    if (match) {
      const value = Number(match[1]);
      if (Number.isFinite(value)) return value;
    }
  }
  return undefined;
}
function sizeInches(text: string): number | undefined {
  if (/\d{1,2}(?:\.\d+)?\s*[-–]\s*\d{1,2}(?:\.\d+)?\s*(?:inches?|in\b|بوصة|إنش)/i.test(text)) return undefined;
  return numberMatch(text, [/(\d{1,2}(?:\.\d+)?)\s*(?:inches?|in\b|بوصة|إنش|["″])/i]);
}
function memoryGB(text: string): number | undefined {
  return numberMatch(text, [
    /(?:ram|ذاكرة(?:\s*(?:عشوائية|رام))?|رام)\D{0,18}(\d{1,3})\s*(?:gb|جيجابايت)/i,
    /(\d{1,3})\s*(?:gb|جيجابايت)\s*(?:ram|رام|ddr[2345])/i,
  ]);
}
function capacityGB(text: string, min = 32): number | undefined {
  const expression = /(\d+(?:\.\d+)?)\s*(tb|terabytes?|تيرابايت|تيرا|gb|gigabytes?|جيجابايت)/gi;
  const candidates: number[] = [];
  for (const match of text.matchAll(expression)) {
    const value = Number(match[1]) * (/^(?:tb|terabytes?|تيرابايت|تيرا)$/i.test(match[2]) ? 1000 : 1);
    const context = text.slice(Math.max(0, match.index! - 18), match.index! + match[0].length + 10);
    if (value >= min && !/(?:ram|ذاكرة|رام|vram|gddr|video\s*memory)/i.test(context)) candidates.push(value);
  }
  return candidates.length ? Math.max(...candidates) : undefined;
}
function resolution(text: string): string | undefined {
  if (/\b8k\b/i.test(text)) return '8K';
  if (/\b(?:4k|2160p|uhd)\b/i.test(text)) return '4K UHD (2160p)';
  if (/\b(?:2k|qhd|1440p)\b/i.test(text)) return '2K QHD (1440p)';
  if (/\b(?:1080p|fhd|full\s*hd)\b/i.test(text)) return '1080p Full HD';
  return undefined;
}
function cpuName(text: string): string | undefined {
  const match = text.match(/(?:intel\s*|إنتل\s*)?(?:core\s*ultra\s*[3579]\s*\d{3,5}[a-z0-9]{0,3}|كور\s*ألترا\s*[3579]\s*\d{3,5}|core\s*i[3579]\s*[- ]?\s*\d{4,5}(?:g\d|[a-z]{1,2})?|(?:كور\s*)?i[3579]\s*[- ]?\s*\d{4,5}(?:g\d|[a-z]{1,2})?|(?:amd\s*|إيه إم دي\s*)?(?:ryzen|رايزن)\s*[3579]\s*\d{4,5}[a-z]{0,3}|apple\s*m[1-4](?:\s*(?:pro|max|ultra))?)/i);
  return match?.[0].replace(/إنتل/ig, 'Intel').replace(/كور\s*ألترا/ig, 'Core Ultra').replace(/كور/ig, 'Core').replace(/رايزن/ig, 'Ryzen').replace(/إيه إم دي/ig, 'AMD').trim();
}
function cpuGeneration(text: string): number | undefined {
  const arabicOrdinals: Record<string, number> = {
    'الحادي عشر': 11, 'الثاني عشر': 12, 'الثالث عشر': 13, 'الرابع عشر': 14,
    'الأول': 1, 'الثاني': 2, 'الثالث': 3, 'الرابع': 4, 'الخامس': 5,
    'السادس': 6, 'السابع': 7, 'الثامن': 8, 'التاسع': 9, 'العاشر': 10,
  };
  const arabic = text.match(/الجيل\s+(الحادي عشر|الثاني عشر|الثالث عشر|الرابع عشر|الأول|الثاني|الثالث|الرابع|الخامس|السادس|السابع|الثامن|التاسع|العاشر)/i);
  if (arabic) return arabicOrdinals[arabic[1]];
  const labeled = text.match(/i[3579]\s*[- ]?\s*(\d{1,2})(?:st|nd|rd|th)\b/i);
  if (labeled) return Number(labeled[1]);
  const intel = text.match(/\bi[3579]\s*[- ]?\s*(\d{4,5})(?:g\d|[a-z]{1,2})?\b/i);
  if (!intel) return undefined;
  const digits = intel[1];
  const firstTwo = Number(digits.slice(0, 2));
  return firstTwo >= 10 && firstTwo <= 14 ? firstTwo : Number(digits[0]);
}
function graphicsName(text: string): string | undefined {
  return text.match(/(?:geforce\s*)?(?:rtx|gtx)\s*\d{3,4}\s*(?:ti|super)?|quadro\s*[a-z]?\s*\d{3,4}|radeon\s*(?:rx\s*)?\d{3,4}(?:\s*xt)?|iris\s*xe|uhd\s*graphics\s*\d{3,4}/i)?.[0]?.trim();
}
function wifiStandard(text: string): string | undefined {
  if (/wi[ -]?fi\s*7|802\.11be/i.test(text)) return 'Wi-Fi 7 (802.11be)';
  if (/wi[ -]?fi\s*6e|802\.11ax\s*6/i.test(text)) return 'Wi-Fi 6E (802.11ax 6GHz)';
  if (/wi[ -]?fi\s*6|802\.11ax/i.test(text)) return 'Wi-Fi 6 (802.11ax)';
  if (/wi[ -]?fi\s*5|802\.11ac/i.test(text)) return 'Wi-Fi 5 AC (802.11ac)';
  if (/wi[ -]?fi\s*4|802\.11n/i.test(text)) return 'Wi-Fi 4 N (802.11n)';
  return undefined;
}
function connectorIn(text: string): string | undefined {
  const options: [RegExp, string][] = [
    [/mini\s*hdmi/i, 'Mini HDMI'], [/micro\s*hdmi/i, 'Micro HDMI'], [/mini\s*display\s*port/i, 'Mini DisplayPort'],
    [/display\s*port|\bdp\b/i, 'DisplayPort'], [/usb\s*-?\s*c|type\s*-?\s*c/i, 'USB-C'],
    [/usb\s*-?\s*a|usb\s*3/i, 'USB-A'], [/lightning/i, 'Lightning (iPhone)'],
    [/\bhdmi\b/i, 'HDMI'], [/\bvga\b/i, 'VGA'], [/\bdvi\b/i, 'DVI'],
    [/\b(rj\s*-?\s*45|ethernet|lan)\b/i, 'LAN (RJ45)'], [/\b(aux|3\.5\s*mm)\b/i, 'AUX 3.5mm'],
    [/\b(av|rca)\b/i, 'AV/RCA'],
  ];
  return options.find(([pattern]) => pattern.test(text))?.[1];
}
function connectorSide(text: string, side: 'from' | 'to'): string | undefined {
  const separator = /\bto\b|\binto\b|إلى|->|→/i;
  const index = text.search(separator);
  if (index < 0) return undefined;
  const match = text.match(separator)!;
  const left = text.slice(0, index);
  const right = text.slice(index + match[0].length);
  const connector = connectorIn(side === 'from' ? left : right);
  return connector === 'LAN (RJ45)' ? (side === 'from' ? 'Ethernet RJ-45' : 'LAN (RJ45)') : connector;
}
function classifyStorage(text: string, category: string): string | undefined {
  if (/micro\s*sd|\bsd\s*card|بطاقة ذاكرة/i.test(text) || category === 'storage-flash-memory' && /micro|sd card/i.test(text)) return 'SD / MicroSD Card';
  if (/\bflash\b|فلاش/i.test(text) && !/flash\s*drive/i.test(text)) return 'USB Flash Memory';
  if (/external|خارجي/i.test(text) && /ssd|nvme/i.test(text)) return 'External Portable SSD';
  if (/external|خارجي/i.test(text) && /hdd|hard\s*drive|هارد/i.test(text)) return 'External HDD';
  if (/\bnvme\b|m\.2/i.test(text)) return 'M.2 2280 NVMe';
  if (/\bssd\b/i.test(text) && /2\.5|sata/i.test(text)) return '2.5" SATA SSD';
  if (/\bhdd\b|hard\s*disk|هاردسك|هارد ديسك/i.test(text) && /3\.5/i.test(text)) return '3.5" Internal HDD';
  return undefined;
}

function inferFields(typeId: string, category: string, text: string): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  const put = (key: string, value: unknown) => {
    if (value === undefined || value === null || value === '' || Array.isArray(value) && value.length === 0) return;
    result[key] = value;
  };
  const size = sizeInches(text);
  const ram = memoryGB(text);
  const storage = capacityGB(text);
  const cpu = cpuName(text);
  const gpu = graphicsName(text);
  const res = resolution(text);

  switch (typeId) {
    case 'laptops':
    case 'desktops':
      put('cpu', cpu);
      put('cpuGen', cpuGeneration(text));
      put('ramGB', ram);
      put('ramType', text.match(/\b(?:DDR[345]|LPDDR[345X]?)\b/i)?.[0]?.toUpperCase());
      put('storageGB', storage);
      put('storageType', /nvme|m\.2/i.test(text) ? typeId === 'laptops' ? 'NVMe M.2 SSD' : 'NVMe SSD' : /\bsata\b/i.test(text) ? 'SATA SSD' : /\bhdd\b|hard\s*disk|هاردسك/i.test(text) ? 'HDD' : undefined);
      put('display', size);
      put('gpu', gpu);
      put('os', /windows\s*11\s*pro|ويندوز\s*11\s*برو/i.test(text) ? 'Windows 11 Pro' : /windows\s*11/i.test(text) ? 'Windows 11 Home' : /windows\s*10\s*pro/i.test(text) ? 'Windows 10 Pro' : /linux/i.test(text) ? typeId === 'laptops' ? 'Linux / FreeDOS' : 'Linux' : /free\s*dos|freedos/i.test(text) ? typeId === 'laptops' ? 'Linux / FreeDOS' : 'No OS' : /بدون\s*نظام|no\s*\.?\s*o\.?\s*s\.?/i.test(text) ? 'No OS' : undefined);
      put('batteryHealthPct', numberMatch(text, [/(?:battery\s*(?:health)?|صحة\s*البطارية)\D{0,10}(\d{1,3})\s*%/i]));
      put('weightKg', numberMatch(text, [/(\d+(?:\.\d+)?)\s*kg\b/i, /(?:الوزن)\D{0,5}(\d+(?:\.\d+)?)\s*(?:كجم|كيلو)/i]));
      break;
    case 'ram':
      put('capacityGB', ram ?? numberMatch(text, [/(\d{1,3})\s*(?:gb|جيجابايت)\s*(?:memory|ذاكرة)/i]));
      put('generation', text.match(/\b(?:DDR\s*[2345]L?|LPDDR\s*[345]X?)\b/i)?.[0]?.replace(/\s+/g, '').toUpperCase());
      put('speedMhz', numberMatch(text, [/(\d{3,5})\s*(?:mhz|mt\/s|ميجاهرتز)/i, /DDR[2345]\s*(\d{3,5})\b/i]));
      put('formFactor', category === 'ram-laptop' ? 'SO-DIMM (لابتوب)' : category === 'ram-desktop' ? 'DIMM (مكتبي)' : /laptop|لابتوب|sodimm/i.test(text) ? 'SO-DIMM (لابتوب)' : /desktop|مكتبي|dimm/i.test(text) ? 'DIMM (مكتبي)' : undefined);
      break;
    case 'storage':
      put('storageForm', classifyStorage(text, category));
      put('capacityGB', storage);
      put('interface', /pcie\s*(?:gen)?\s*4|gen\s*4\s*nvme/i.test(text) ? 'PCIe Gen 4 NVMe' : /pcie\s*(?:gen)?\s*3|gen\s*3\s*nvme/i.test(text) ? 'PCIe Gen 3 NVMe' : /sata/i.test(text) ? 'SATA III' : /usb\s*3\.2/i.test(text) ? 'USB 3.2 Gen 2' : /usb\s*3/i.test(text) ? 'USB 3.0' : undefined);
      put('readSpeedMBs', numberMatch(text, [/(\d{2,5})\s*mb\s*\/?\s*s\b/i]));
      put('writeSpeedMBs', numberMatch(text, [/(?:write|كتابة)\D{0,10}(\d{2,5})\s*mb\s*\/?\s*s\b/i]));
      put('deckUsage', /surveillance|مراقبة|dvr|nvr/i.test(text) ? 'مراقبة وتسجيل (NVR/CCTV)' : /portable|محمول|خارجي/i.test(text) ? 'نقل البيانات (Portable)' : /laptop|لابتوب/i.test(text) ? 'لابتوب (Laptop Internal)' : /desktop|مكتبي/i.test(text) ? 'مكتبي (Desktop Internal)' : undefined);
      break;
    case 'displays':
      put('sizeInch', size);
      put('resolution', res);
      put('refreshHz', numberMatch(text, [/(\d{2,3})\s*hz\b/i]));
      put('panel', text.match(/\b(IPS|VA|TN|OLED|QLED|LCD)\b/i)?.[1]?.toUpperCase());
      put('ports', ['HDMI', 'DisplayPort', 'USB-C', 'VGA'].filter(port => new RegExp(port.replace('-', '\\s*-?\\s*'), 'i').test(text)));
      put('sizeType', category === 'displays-televisions' ? 'تلفزيون (TV)' : category === 'displays-projectors' ? 'بروجكتور (Projector)' : /projector|بروجكتور/i.test(text) ? 'بروجكتور (Projector)' : /tv|television|تلفزيون/i.test(text) ? 'تلفزيون (TV)' : /monitor|شاشة كمبيوتر/i.test(text) ? 'شاشة كمبيوتر (Monitor)' : undefined);
      break;
    case 'network':
      put('deviceType', /mesh/i.test(text) ? 'Mesh نظام' : /switch|سويتش/i.test(text) ? 'موزع (Switch)' : /access\s*point|نقطة\s*وصول/i.test(text) ? 'نقطة وصول (Access Point)' : /router|راوتر/i.test(text) ? 'راوتر لاسلكي (WiFi Router)' : /dsl\s*modem|مودم\s*dsl/i.test(text) ? 'مودم DSL' : /network\s*adapter|محول\s*(?:شبكة|واي\s*فاي)|usb\s*wifi/i.test(text) ? 'محول شبكة (Network Adapter)' : /range\s*extender|موسع\s*(?:نطاق|إشارة)/i.test(text) ? 'موسع (Range Extender)' : /antenna|أنتينا|هوائي/i.test(text) ? 'أنتينا (Antenna)' : /network\s*cable|كابل\s*شبكة/i.test(text) ? 'كابل شبكة (Network Cable)' : undefined);
      put('wifiStandard', wifiStandard(text));
      put('speedMbps', numberMatch(text, [/(\d{2,5})\s*mbps\b/i]));
      put('portsCount', numberMatch(text, [/(\d{1,2})\s*(?:-?\s*(?:port|ports|منفذ|منافذ))/i]));
      if (/mesh/i.test(text)) put('meshSupport', true);
      break;
    case 'network-cabling-tools':
      put('networkAccessoryType', /فاحص|tester|اختبار/i.test(text) ? 'فاحص كابلات' : /كماشة|crimp/i.test(text) ? 'كماشة كبس' : /patch\s*panel|لوحة توزيع/i.test(text) ? 'لوحة توزيع' : /مقبس|socket|jack|\brj[- ]?45\b|connector/i.test(text) ? 'مقبس أو موصل' : /كابل|\bcable\b|\bcat\s*[5-8]/i.test(text) ? 'كابل شبكة' : /موسع|extender|محول|adapter/i.test(text) ? 'موسع أو محول' : /واقي|surge/i.test(text) ? 'واقي صواعق' : undefined);
      put('networkCableStandard', text.match(/\bcat\s*([5-8](?:e|a)?)\b/i)?.[1] ? `Cat${text.match(/\bcat\s*([5-8](?:e|a)?)\b/i)![1]}` : undefined);
      put('networkCableLengthM', numberMatch(text, [/(\d+(?:\.\d+)?)\s*(?:m|meter|meters|متر)\b/i]));
      put('networkCableShielding', text.match(/\b(SFTP|FTP|STP|UTP)\b/i)?.[1]?.toUpperCase());
      put('networkPortCount', numberMatch(text, [/(\d{1,2})\s*(?:-?\s*(?:port|ports|منفذ|منافذ))/i]));
      put('networkConnectorType', ['RJ45','RJ11','USB-C','USB-A','DC'].filter(type => new RegExp(type.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i').test(text)));
      break;
    case 'cables': {
      put('cableType', /kvm/i.test(text) ? 'سويتش KVM' : /splitter|موزع\s*(?:إشارة)?|واحد\s*إلى\s*(?:اثنين|أربعة)/i.test(text) ? 'موزع إشارة (Splitter)' : /extender|موسع/i.test(text) ? 'موسع (Extender)' : /capture\s*card|التقاط\s*فيديو/i.test(text) ? 'جهاز التقاط فيديو (Capture Card)' : /ethernet|كابل\s*شبكة|cat\s*[5-8]/i.test(text) ? 'كابل شبكة (Ethernet)' : /lightning|آيفون/i.test(text) ? 'كابل آيفون (Lightning)' : /\bhdmi\b/i.test(text) ? 'كابل HDMI' : /display\s*port|\bdp\b/i.test(text) ? 'كابل DisplayPort' : /\bvga\b/i.test(text) ? 'كابل VGA' : /\bdvi\b/i.test(text) ? 'كابل DVI' : /\b(aux|3\.5\s*mm)\b/i.test(text) ? 'كابل AUX / صوت' : /adsl|فلتر\s*(?:هاتف|ADSL)/i.test(text) ? 'فلتر / مفرق ADSL' : /phone|هاتف/i.test(text) ? 'كابل هاتف' : /usb\s*-?\s*c|type\s*-?\s*c/i.test(text) ? 'كابل USB-C' : /adapter|محول\s*فيديو/i.test(text) ? 'محول فيديو (Video Adapter)' : undefined);
      put('connectorFrom', connectorSide(text, 'from'));
      put('connectorTo', connectorSide(text, 'to'));
      put('lengthM', numberMatch(text, [/(\d+(?:\.\d+)?)\s*(?:m|meter|meters|متر)\b/i]));
      put('rangeM', numberMatch(text, [/(?:range|مدى)\D{0,8}(\d{1,4})\s*(?:m|meter|meters|متر)/i]));
      put('resolution', /\b8k\b/i.test(text) ? '8K' : /\b4k\b|2160p/i.test(text) ? '4K (UHD)' : /1080p|fhd/i.test(text) ? '1080p (FHD)' : undefined);
      put('splitterPorts', numberMatch(text, [/(?:1\s*(?:to|إلى)\s*)(\d{1,2})|(?:واحد\s*إلى\s*)(اثنين|أربعة)/i]));
      put('kvmPCs', /kvm/i.test(text) ? numberMatch(text, [/(\d{1,2})\s*(?:pc|pcs|computer|أجهزة)/i]) : undefined);
      put('powerW', numberMatch(text, [/(\d{1,3})\s*w\b/i]));
      if (/audio|صوت/i.test(text)) put('hasAudio', true);
      break;
    }
    case 'adapters': {
      put('adapterType', /docking\s*station|travel\s*dock|محطة\s*توصيل/i.test(text) ? 'محطة توصيل (Docking Station)' : /hub|موزع\s*usb/i.test(text) ? 'موزع USB (Hub)' : /bluetooth/i.test(text) && /dongle|usb/i.test(text) ? 'بلوتوث USB' : /dongle|مستقبل\s*عرض|wireless\s*receiver|مستقبل\s*لاسلكي/i.test(text) ? 'دونجل لاسلكي (Dongle)' : /adapter|محول/i.test(text) ? 'محول (Adapter)' : undefined);
      put('connectorFrom', connectorSide(text, 'from'));
      put('connectorTo', connectorSide(text, 'to'));
      put('totalPorts', numberMatch(text, [/(\d{1,2})\s*(?:ports?|منافذ)/i]));
      put('usbStandard', /usb\s*4/i.test(text) ? 'USB4' : /usb\s*3\.2/i.test(text) ? 'USB 3.2' : /usb\s*3\.1/i.test(text) ? 'USB 3.1' : /usb\s*3/i.test(text) ? 'USB 3.0' : /usb\s*2/i.test(text) ? 'USB 2.0' : undefined);
      if (/hdmi/i.test(text)) put('hasHDMI', true);
      if (/\blan\b|rj\s*-?\s*45|ethernet/i.test(text)) put('hasLAN', true);
      put('powerDeliveryW', numberMatch(text, [/\bpd\D{0,4}(\d{1,3})\s*w\b/i, /(\d{1,3})\s*w\s*pd\b/i]));
      put('bluetoothVersion', text.match(/bluetooth\s*(4\.0|5\.[0-3])/i)?.[1]);
      if (/wireless|لاسلكي|wi-?fi/i.test(text)) put('wireless', true);
      put('maxResolution', /\b8k\b/i.test(text) ? '8K' : /\b4k\b|2160p/i.test(text) ? '4K' : /1080p|fhd/i.test(text) ? '1080p' : undefined);
      break;
    }
    case 'bags':
      put('bagType', /backpack|ظهر/i.test(text) ? 'حقيبة ظهر (Backpack)' : /sleeve|حافظة/i.test(text) ? 'حافظة (Sleeve)' : /toploader|جانبية/i.test(text) ? 'حقيبة جانبية (Toploader)' : /shoulder|كتف/i.test(text) ? 'حقيبة كتف' : undefined);
      put('compatibleSizeInch', size ? `${size}"` : undefined);
      put('material', /nylon|نايلون/i.test(text) ? 'نايلون' : /polyester|بوليستر/i.test(text) ? 'بوليستر' : /leather|جلد/i.test(text) ? 'جلد صناعي' : /fabric|قماش/i.test(text) ? 'قماش' : undefined);
      if (/water\s*resistant|waterproof|مقاوم\s*للماء|ضد\s*الماء/i.test(text)) put('waterResistant', true);
      if (/usb\s*charging|usb\s*port|منفذ\s*usb/i.test(text)) put('usbChargingPort', true);
      put('brand', ['Lenovo','CoolBell','Tigernu','CAT'].find(brand => new RegExp(`\\b${brand}\\b`, 'i').test(text)));
      break;
    case 'office-barcode-scanners':
      put('barcodeScannerForm', /bluetooth|بلوتوث|لاسلكي/i.test(text) ? 'لاسلكي محمول' : /desktop|presentation|ثابت/i.test(text) ? 'ثابت / عرضي' : /قارئ|scanner|باركود/i.test(text) ? 'يدوي' : undefined);
      put('barcodeScannerCodes', /qr|2d|رمز ثنائي/i.test(text) ? ['2D / QR'] : /1d|خطّي|خطوط/i.test(text) ? ['1D'] : undefined);
      put('barcodeScannerConnection', ['Bluetooth','USB','لاسلكي 2.4GHz'].filter(value => value === 'Bluetooth' ? /bluetooth|بلوتوث/i.test(text) : value === 'USB' ? /usb/i.test(text) : /2\.4\s*ghz|دونجل لاسلكي/i.test(text)));
      put('barcodeScannerInterface', /usb/i.test(text) ? ['USB'] : undefined);
      break;
    case 'office-paper':
      put('officePaperSize', text.match(/\bA\s*([345])\b/i)?.[1] ? `A${text.match(/\bA\s*([345])\b/i)![1]}` : undefined);
      put('officePaperWeightGsm', numberMatch(text, [/(\d{2,3})\s*(?:gsm|جرام(?:\s*\/\s*متر)?)/i]));
      put('officePaperSheetCount', numberMatch(text, [/(\d{2,4})\s*(?:sheet|sheets|ملصق|ملصقًا|لاصق)/i]));
      put('officePaperMediaType', /label|ملصق|لواصق/i.test(text) ? 'ملصقات' : /pvc|بطاقات/i.test(text) ? 'بطاقات' : /paper|ورق/i.test(text) ? 'ورق تصوير' : undefined);
      break;
    case 'photography-cameras':
      put('imagingCameraType', /webcam|كاميرا ويب/i.test(text) ? 'كاميرا ويب' : /gopro|action\s*cam|كاميرا فيديو|اكشن/i.test(text) ? 'كاميرا أكشن' : /pocket|جيب|osmo/i.test(text) ? 'كاميرا جيب' : undefined);
      put('imagingVideoResolution', res === '4K UHD (2160p)' ? '4K' : res === '1080p Full HD' ? '1080p' : /\b5k\b/i.test(text) ? '5K' : undefined);
      put('imagingConnectivity', ['USB','Wi-Fi','Bluetooth','HDMI'].filter(value => new RegExp(value.replace('-', '\\s*-?\\s*'), 'i').test(text)));
      if (/stabiliz|gimbal|gimbal|استقرار|تثبيت/i.test(text)) put('imagingStabilization', true);
      break;
    case 'photography-lighting-support':
      put('photoSupportType', /\bsk\s*\d+|flash|فلاش/i.test(text) ? 'فلاش استوديو' : /sl\s*\d+|\bled\b|إضاءة/i.test(text) ? 'إضاءة LED' : /tripod|ثلاثي/i.test(text) ? 'حامل ثلاثي' : /stand|حامل/i.test(text) ? 'حامل إضاءة' : undefined);
      put('photoLightPowerW', /\bsk\s*400/i.test(text) ? undefined : numberMatch(text, [/(?:\b|sl\s*)(\d{2,4})\s*w(?!s)\b/i, /(\d{2,4})\s*واط\b/i]));
      put('photoColorTemperatureK', numberMatch(text, [/(\d{3,5})\s*k\b/i]));
      put('photoMountType', /bowens/i.test(text) ? 'Bowens' : /1\/4/i.test(text) ? '1/4 بوصة' : /3\/8/i.test(text) ? '3/8 بوصة' : undefined);
      put('photoStandHeightCm', numberMatch(text, [/(\d{2,3})\s*(?:cm|سم)/i]));
      break;
    case 'gaming-graphics-cards':
      put('graphicsChipset', graphicsName(text));
      put('graphicsMemoryGB', numberMatch(text, [/(\d{1,2})\s*(?:gb|جيجابايت)\s*(?:gddr[6-7])?/i]));
      put('graphicsMemoryType', text.match(/\bGDDR\s*([6-7]X?)\b/i)?.[1] ? `GDDR${text.match(/\bGDDR\s*([6-7]X?)\b/i)![1]}` : undefined);
      put('graphicsBusInterface', /pcie\s*5/i.test(text) ? 'PCIe 5.0' : /pcie\s*4/i.test(text) ? 'PCIe 4.0' : /pcie\s*3/i.test(text) ? 'PCIe 3.0' : undefined);
      put('graphicsOutputPorts', ['HDMI','DisplayPort','USB-C'].filter(port => new RegExp(port.replace('-', '\\s*-?\\s*'), 'i').test(text)));
      break;
    case 'gaming-consoles-controllers':
      put('gamingHardwareType', /playstation|ps[345]|xbox|جهاز ألعاب/i.test(text) ? 'جهاز ألعاب' : /يد تحكم|controller/i.test(text) ? 'يد تحكم' : /محول تحكم|adapter/i.test(text) ? 'محول تحكم' : undefined);
      put('gamingHardwarePlatform', ['PlayStation','Xbox','Windows PC','Android','iOS'].filter(platform => new RegExp(platform === 'PlayStation' ? 'playstation|ps[345]' : platform === 'Windows PC' ? 'windows|pc' : platform, 'i').test(text)));
      put('gamingHardwareStorageGB', storage);
      put('gamingHardwareConnectivity', ['USB','Bluetooth','لاسلكي'].filter(value => value === 'لاسلكي' ? /wireless|لاسلكي/i.test(text) : new RegExp(value, 'i').test(text)));
      break;
    case 'accessory-stands-cooling':
      put('standCoolingType', /cooler|قاعدة تبريد|مبرد لابتوب/i.test(text) ? 'قاعدة تبريد لابتوب' : /laptop stand|حامل لابتوب|ستاند لابتوب/i.test(text) ? 'حامل لابتوب' : /tv|تلفزيون/i.test(text) && /mount|حامل/i.test(text) ? 'حامل تلفزيون' : /monitor|شاشة/i.test(text) && /mount|حامل/i.test(text) ? 'حامل شاشة' : /fan|مروحة/i.test(text) ? 'مروحة كابينة' : undefined);
      put('standCoolingSizeInch', size);
      put('standCoolingMaxLoadKg', numberMatch(text, [/(\d+(?:\.\d+)?)\s*(?:kg|كجم|كيلو)/i]));
      if (/adjustable|متحرك|دوار|قابل\s*للتعديل/i.test(text)) put('standCoolingAdjustable', true);
      put('coolingFanCount', numberMatch(text, [/(\d{1,2})\s*(?:fan|fans|مراوح)/i]));
      put('coolingPowerConnection', /\busb\b/i.test(text) ? 'USB' : /\bac\b|220\s*v/i.test(text) ? 'AC' : /بدون\s*طاقة/i.test(text) ? 'بدون طاقة' : undefined);
      break;
    case 'telephones':
      put('telephoneConnectionType', /cordless|لاسلكي|نقال|de\s*ct/i.test(text) ? 'لاسلكي DECT' : /corded|سلكي|هاتف\s*(?:ثابت)?/i.test(text) ? 'سلكي' : undefined);
      put('telephoneHandsetCount', numberMatch(text, [/(\d+)\s*(?:handsets?|سماعات)/i]));
      if (/screen|display|شاشة/i.test(text)) put('telephoneDisplay', true);
      if (/speaker|مكبر\s*صوت/i.test(text)) put('telephoneSpeakerphone', true);
      if (/caller\s*id|هوية\s*المتصل/i.test(text)) put('telephoneCallerId', true);
      if (/answering\s*machine|مسجل\s*(?:رسائل|صوتي)/i.test(text)) put('telephoneAnsweringMachine', true);
      break;
    case 'accessory-screen-protectors':
      put('screenProtectorDeviceType', /laptop|لابتوب/i.test(text) ? 'لابتوب' : /monitor|شاشة/i.test(text) ? 'شاشة كمبيوتر' : undefined);
      put('screenProtectorSizeInch', size);
      put('screenProtectorFinish', /privacy|خصوصية/i.test(text) ? 'خصوصية' : /matte|مطفي/i.test(text) ? 'مطفي' : /glossy|لامع/i.test(text) ? 'لامع' : undefined);
      put('screenProtectorPieceCount', numberMatch(text, [/(\d+)\s*(?:قطع|قطعة|pieces)/i]));
      break;
    case 'accessory-styluses':
      put('stylusCompatibility', /surface/i.test(text) ? ['Microsoft Surface'] : /universal|شامل/i.test(text) ? ['شاشات لمس عامة'] : undefined);
      put('stylusTechnology', /active|نشط|surface/i.test(text) ? 'نشط إلكتروني' : /capacitive|سعوي|شامل/i.test(text) ? 'سعوي سلبي' : undefined);
      put('stylusPressureLevels', numberMatch(text, [/(\d{2,4})\s*(?:pressure\s*levels|مستوى\s*ضغط)/i]));
      if (/rechargeable|قابل\s*للشحن/i.test(text)) put('stylusRechargeable', true);
      if (/palm\s*rejection|رفض\s*راحة\s*اليد/i.test(text)) put('stylusPalmRejection', true);
      break;
    case 'smart-plugs':
      put('smartPlugConnectivity', ['Wi-Fi','Bluetooth','Zigbee'].filter(value => new RegExp(value.replace('-', '\\s*-?\\s*'), 'i').test(text)));
      put('smartPlugMaxLoadW', numberMatch(text, [/(\d{2,4})\s*w\b/i]));
      if (/monitor(?:ing)?\s*(?:energy|power)|مراقبة\s*(?:استهلاك\s*)?الطاقة/i.test(text)) put('smartPlugEnergyMonitoring', true);
      put('smartPlugVoiceAssistant', ['Alexa','Google Assistant'].filter(value => new RegExp(value === 'Google Assistant' ? 'google\s*assistant' : value, 'i').test(text)));
      if (/app|تطبيق|تحكم\s*عن\s*بعد/i.test(text)) put('smartPlugRemoteControl', true);
      break;
    case 'mice':
      put('mouseType', /presenter|مؤشر\s*ليزر|عروض/i.test(text) ? 'ماوس مع مؤشر ليزر (Presenter)' : /gaming|للألعاب|جيمنج/i.test(text) ? 'ماوس ألعاب (Gaming Mouse)' : /vertical|عمودي/i.test(text) ? 'ماوس رأسي مريح (Ergonomic/Vertical)' : /mouse|ماوس|فأرة/i.test(text) ? 'ماوس مكتبي عادي (Office/Standard)' : undefined);
      put('connectivity', /bluetooth|بلوتوث/i.test(text) && /wireless|لاسلكي/i.test(text) ? 'ثنائي الوضع (Dual-Mode Wireless & BT)' : /bluetooth|بلوتوث/i.test(text) ? 'بلوتوث (Bluetooth)' : /wireless|لاسلكي|2\.4\s*ghz/i.test(text) ? 'لاسلكي (Wireless 2.4GHz)' : /\busb\b/i.test(text) ? 'سلكي (Wired USB)' : undefined);
      if (/wireless|لاسلكي|بلوتوث/i.test(text)) put('wireless', true);
      put('dpi', numberMatch(text, [/(\d{3,5})\s*dpi\b/i]));
      if (/silent|صامت|هادئ/i.test(text)) put('silent', true);
      if (/rechargeable|قابل\s*للشحن/i.test(text)) put('rechargeable', true);
      if (/rgb/i.test(text)) put('rgb', true);
      break;
    case 'keyboards':
      put('keyboardType', /طقم\s*(?:لوحة\s*مفاتيح\s*و?ماوس|كيبورد\s*و?ماوس)|keyboard\s*&?\s*mouse|keyboard\s*and\s*mouse/i.test(text) ? 'طقم كيبورد وماوس (Combo)' : /mechanical|ميكانيكي/i.test(text) ? 'ميكانيكية (Mechanical)' : /gaming|للألعاب|جيمنج/i.test(text) ? 'ألعاب (Gaming)' : /60\s*%|65\s*%|tkl|mini/i.test(text) ? 'مدمجة مصغرة (Mini 60%/65%/TKL)' : /keyboard|لوحة\s*مفاتيح/i.test(text) ? 'مكتبية عادية (Standard/Membrane)' : undefined);
      put('connectivity', /bluetooth|بلوتوث/i.test(text) && /wireless|لاسلكي/i.test(text) ? 'ثلاثي الأوضاع (Tri-Mode)' : /bluetooth|بلوتوث/i.test(text) ? 'بلوتوث (Bluetooth)' : /wireless|لاسلكي/i.test(text) ? 'لاسلكي (Wireless 2.4GHz)' : /\busb\b/i.test(text) ? 'سلكي (Wired USB)' : undefined);
      if (/طقم\s*(?:لوحة\s*مفاتيح\s*و?ماوس|كيبورد\s*و?ماوس)|keyboard\s*&?\s*mouse|keyboard\s*and\s*mouse/i.test(text)) put('isCombo', true);
      if (/wireless|لاسلكي|بلوتوث/i.test(text)) put('wireless', true);
      if (/rgb/i.test(text)) put('backlight', 'RGB متعدد الألوان');
      else if (/\bled\b|إضاءة/i.test(text)) put('backlight', 'إضاءة أحادية (LED)');
      break;
    case 'audio':
      put('audioType', /earbud|سماعة\s*أذن/i.test(text) ? 'سماعات أذن (Earbuds)' : /headphone|سماعة\s*رأس/i.test(text) ? 'سماعات رأس (Headphones)' : /microphone|ميكروفون/i.test(text) ? 'ميكروفون (Microphone)' : /speaker|مكبر\s*صوت/i.test(text) ? 'مكبر صوت (Speaker)' : undefined);
      put('connectionType', /bluetooth\s*5(?:\.\d)?|بلوتوث\s*5/i.test(text) ? 'Bluetooth 5.x' : /2\.4\s*ghz/i.test(text) ? 'لاسلكي 2.4GHz' : /\baux\b|3\.5\s*mm/i.test(text) ? '3.5mm Aux' : /\busb\s*-?\s*c|type\s*-?\s*c/i.test(text) ? 'USB-C' : /\busb\b/i.test(text) ? 'USB' : /\bxlr\b|\btrs\b/i.test(text) ? 'XLR / TRS' : /lightning/i.test(text) ? 'Lightning' : undefined);
      if (/wireless|لاسلكي|bluetooth|بلوتوث/i.test(text)) put('wireless', true);
      put('batteryHours', numberMatch(text, [/(\d{1,3})\s*(?:hours?|ساعة)/i]));
      if (/anc|noise\s*cancell?ing|عزل\s*(?:الضوضاء|الضجيج)/i.test(text)) put('noiseCancelling', true);
      put('powerW', numberMatch(text, [/(\d{1,4})\s*w\b/i]));
      break;
    case 'printers':
      put('printerType', /laser|ليزر/i.test(text) ? 'ليزر (Laser)' : /inkjet|ink\s*tank|حبر|نافثة/i.test(text) ? 'حبر نفاث (Inkjet / Ink Tank)' : /thermal|حرارية/i.test(text) ? 'حرارية فواتير (Thermal Receipt)' : /label|barcode|ملصقات|باركود/i.test(text) ? 'طابعة ملصقات (Label / Barcode)' : undefined);
      put('colorType', /monochrome|mono|أبيض\s*وأسود|أسود\s*وأبيض/i.test(text) ? 'أبيض وأسود (Monochrome)' : /color|ألوان/i.test(text) ? 'ألوان (Color)' : undefined);
      if (/all\s*in\s*one|multifunction|3\s*[- ]?in\s*[- ]?1|متعددة\s*الوظائف/i.test(text)) put('multiFunction', true);
      put('connectivity', ['USB','Wi-Fi','Ethernet','Bluetooth'].filter(value => new RegExp(value.replace('-', '\\s*-?\\s*'), 'i').test(text)));
      put('printWidth', numberMatch(text, [/(\d{2,4})\s*mm\b/i]));
      break;
    case 'power':
      put('powerW', numberMatch(text, [/(\d{1,4})\s*w\b/i]));
      put('capacityMah', numberMatch(text, [/(\d{3,6})\s*mah\b/i]));
      put('capacityVA', numberMatch(text, [/(\d{3,4})\s*va\b/i]));
      put('outletsCount', numberMatch(text, [/(\d{1,2})\s*(?:outlets?|مخارج|مقابس)/i]));
      put('pdWatts', numberMatch(text, /\bpd\b/i.test(text) ? [/(\d{1,3})\s*w\b/i] : []));
      put('powerType', category === 'power-banks' ? 'بنك طاقة محمول (Power Bank)' : category === 'power-ups-batteries' ? (/ups/i.test(text) ? 'UPS مزود طاقة احتياطية' : 'بطارية احتياطية (Battery)') : category === 'power-extensions' ? 'وصلة كهربائية / طاقة (Power Strip)' : /charger|شاحن|محول\s*طاقة/i.test(text) ? 'شاحن ومحول طاقة (Adapter)' : undefined);
      break;
    case 'software':
      put('softwareType', /antivirus|كاسبرسكي|مكافحة\s*الفيروسات/i.test(text) ? 'حماية ومكافح فيروس (Antivirus)' : /office|أوفيس/i.test(text) ? 'مجموعة أوفيس (Office Suite)' : /windows|ويندوز/i.test(text) ? 'نظام تشغيل (OS)' : undefined);
      put('licenseType', /lifetime|مدى\s*الحياة/i.test(text) ? 'مدى الحياة (Lifetime)' : /annual|سنوي|12\s*months/i.test(text) ? 'اشتراك سنوي (Subscription)' : /license|ترخيص|كود\s*تفعيل/i.test(text) ? 'مفتاح تفعيل رقمي (Digital Key)' : undefined);
      put('devicesAllowed', numberMatch(text, [/(\d+)\s*(?:users?|devices?|مستخدمين|أجهزة)/i]));
      put('validityMonths', numberMatch(text, [/(\d+)\s*(?:months?|أشهر|شهر)/i]));
      put('compatibility', ['Windows 11','Windows 10','macOS','Android','iOS'].filter(value => value === 'Windows 11' ? /windows\s*11/i.test(text) : value === 'Windows 10' ? /windows\s*10/i.test(text) : new RegExp(value, 'i').test(text)));
      break;
    case 'accessories':
      put('accessoryType', /mouse|ماوس|فأرة/i.test(text) ? 'ماوس (Mouse)' : /keyboard|لوحة\s*مفاتيح/i.test(text) ? 'كيبورد (Keyboard)' : /bag|case|حقيبة|شنطة|غطاء/i.test(text) ? 'حقيبة وغطاء (Bag/Case)' : /cable|كابل/i.test(text) ? 'كابل (Cable)' : /hub|adapter|موزع|محول/i.test(text) ? 'محول/موزع Hub' : /stand|حامل|قاعدة/i.test(text) ? 'حامل وقاعدة (Stand)' : /card\s*reader|قارئ\s*(?:بطاقة|ذاكرة)/i.test(text) ? 'قارئ بطاقة (Card Reader)' : /webcam|كاميرا\s*ويب/i.test(text) ? 'كاميرا ويب (Webcam)' : 'أخرى (Other)');
      put('interface', /usb\s*-?\s*c|type\s*-?\s*c/i.test(text) ? 'USB-C' : /usb\s*-?\s*a/i.test(text) ? 'USB-A' : /bluetooth|بلوتوث/i.test(text) ? 'Bluetooth' : /wireless|لاسلكي/i.test(text) ? 'Wireless 2.4GHz' : /hdmi/i.test(text) ? 'HDMI' : /displayport/i.test(text) ? 'DisplayPort' : /3\.5\s*mm|aux/i.test(text) ? '3.5mm' : /ethernet|rj\s*-?\s*45|lan/i.test(text) ? 'Ethernet RJ-45' : undefined);
      put('compatibility', ['Windows','Mac','Linux','Android'].filter(value => new RegExp(value === 'Mac' ? 'macos|mac\\b' : value, 'i').test(text)));
      if (/wireless|لاسلكي|bluetooth|بلوتوث/i.test(text)) put('wireless', true);
      break;
    case 'security':
      put('lockType', [
        ...(/fingerprint|بصمة/i.test(text) ? ['بصمة إصبع (Fingerprint)'] : []),
        ...(/\bpin\b|رمز\s*سري/i.test(text) ? ['رمز سري (PIN Code)'] : []),
        ...(/rfid/i.test(text) ? ['بطاقة RFID'] : []),
        ...(/video\s*doorbell|جرس\s*(?:فيديو|ذكي)/i.test(text) ? ['جرس فيديو (Video Doorbell)'] : []),
        ...(/smart\s*key|مفتاح\s*ذكي/i.test(text) ? ['مفتاح كهربائي (Smart Key)'] : []),
        ...(/fob|ريموت\s*تحكم/i.test(text) ? ['جهاز تحكم Fob'] : []),
      ]);
      put('connectivity', /wi-?fi|واي\s*فاي/i.test(text) ? 'Wi-Fi' : /bluetooth|بلوتوث/i.test(text) ? 'Bluetooth' : /zigbee/i.test(text) ? 'Zigbee' : /z-wave/i.test(text) ? 'Z-Wave' : undefined);
      put('batteryHours', numberMatch(text, [/battery\D{0,10}(\d{1,4})\s*(?:hours?|h|ساعة)/i]));
      put('cameraRes', resolution(text) === '4K UHD (2160p)' ? '4K' : resolution(text) === '1080p Full HD' ? '1080p' : undefined);
      break;
  }
  return result;
}

function effectiveType(categorySlug: string, categories: Map<string, Category>): string | null {
  let category = categories.get(categorySlug);
  const seen = new Set<string>();
  while (category && !seen.has(category.slug)) {
    seen.add(category.slug);
    if (category.productTypeId) return category.productTypeId;
    category = category.parentSlug ? categories.get(category.parentSlug) : undefined;
  }
  return null;
}
function targetCategory(current: string, text: string): string {
  if (current === 'audio' && /\bthinkpad\b|\blaptop\b|لابتوب/i.test(text)) return 'laptops-business';
  if (current === 'laptops' && /zenbook\s*duo|شاشة\s*لمس|touch\s*screen/i.test(text)) return 'laptops-convertible';
  if (current === 'laptops' && /aspire\s*7|\b(?:gtx|rtx)\s*\d{3,4}|لابتوب\s*(?:ألعاب|جيمنج)/i.test(text)) return 'laptops-gaming';
  return current;
}

async function main() {
  const [products, categoryRows, typeRows] = await Promise.all([
    db.product.findMany({ where: { deletedAt: null }, select: { id: true, brandId: true, category: true, productTypeId: true, title: true, model: true, specs: true } }),
    db.catalogCategory.findMany({ select: { slug: true, parentSlug: true, productTypeId: true } }),
    db.productType.findMany({ select: { id: true, fields: true } }),
  ]);
  const categories = new Map(categoryRows.map(category => [category.slug, category]));
  const types = new Map(typeRows.map(type => [type.id, (Array.isArray(type.fields) ? type.fields : []) as Field[]]));
  const changes: Change[] = [];
  const examples: { title: string; category: string; template: string; inferred: Record<string, unknown> }[] = [];
  const stats: Record<string, { products: number; linked: number; fieldsAdded: number }> = {};
  let noTemplate = 0;

  for (const product of products as Product[]) {
    const text = normalize(`${titleText(product.title)} ${product.model}`);
    const categorySlug = targetCategory(product.category, text);
    const typeId = effectiveType(categorySlug, categories);
    if (!typeId || !types.has(typeId)) { noTemplate++; continue; }
    const fields = types.get(typeId)!;
    const existing = objectValue(product.specs);
    const next = { ...existing };
    const inferred = inferFields(typeId, categorySlug, text);
    const added: string[] = [];
    const fieldMap = new Map(fields.map(field => [field.key, field]));
    for (const [key, value] of Object.entries(inferred)) {
      const field = fieldMap.get(key);
      if (!field || next[key] !== undefined && next[key] !== null && next[key] !== '') continue;
      if (field.valueType === 'number' && typeof value !== 'number') continue;
      if (field.valueType === 'boolean' && typeof value !== 'boolean') continue;
      if (field.valueType === 'text' && typeof value !== 'string') continue;
      if (field.valueType === 'single' && typeof value !== 'string') continue;
      if (field.valueType === 'multi' && (!Array.isArray(value) || value.some(item => typeof item !== 'string'))) continue;
      if (field.valueType === 'single' && field.options?.length && !field.options.some(option => option.toLowerCase() === String(value).toLowerCase())) continue;
      if (field.valueType === 'multi' && field.options?.length && !(value as string[]).some(item => field.options!.some(option => option.toLowerCase() === item.toLowerCase()))) continue;
      next[key] = value;
      added.push(key);
    }
    if (product.productTypeId !== typeId || categorySlug !== product.category || added.length) {
      changes.push({ id: product.id, brandId: product.brandId, oldCategory: product.category, category: categorySlug, oldTypeId: product.productTypeId, productTypeId: typeId, specs: next, added, title: titleText(product.title) });
      if (added.length && examples.length < 60) {
        examples.push({
          title: titleText(product.title), category: categorySlug, template: typeId,
          inferred: Object.fromEntries(added.map(key => [key, next[key]])),
        });
      }
      const row = stats[typeId] ??= { products: 0, linked: 0, fieldsAdded: 0 };
      row.products++;
      if (product.productTypeId !== typeId) row.linked++;
      row.fieldsAdded += added.length;
    }
  }

  const summary = {
    mode: process.argv.includes('--apply') ? 'apply' : 'preview',
    productsRead: products.length,
    productsToUpdate: changes.length,
    templateLinksToSet: changes.filter(change => change.oldTypeId !== change.productTypeId).length,
    categoryLinksToCorrect: changes.filter(change => change.oldCategory !== change.category).length,
    specFieldsToAdd: changes.reduce((total, change) => total + change.added.length, 0),
    productsWithoutTemplate: noTemplate,
    byTemplate: stats,
  };
  if (!process.argv.includes('--apply')) {
    console.log(JSON.stringify(process.argv.includes('--samples') ? { ...summary, examples } : summary, null, 2));
    return;
  }

  const backupPath = '.backups/products-specs-before-title-enrichment-2026-10-28.json';
  await db.$transaction(async tx => {
    for (let offset = 0; offset < changes.length; offset += 80) {
      const batch = changes.slice(offset, offset + 80);
      const specCases = batch.map(change => Prisma.sql`WHEN ${change.id} THEN ${JSON.stringify(change.specs)}`);
      const typeCases = batch.map(change => Prisma.sql`WHEN ${change.id} THEN ${change.productTypeId}`);
      const categoryChanges = batch.filter(change => change.oldCategory !== change.category);
      const categoryCases = categoryChanges.map(change => Prisma.sql`WHEN ${change.id} THEN ${change.category}`);
      const categorySet = categoryCases.length
        ? Prisma.sql`category = CASE id ${Prisma.join(categoryCases, ' ')} ELSE category END,`
        : Prisma.empty;
      await tx.$executeRaw(Prisma.sql`
        UPDATE Product
        SET specs = CASE id ${Prisma.join(specCases, ' ')} ELSE specs END,
            productTypeId = CASE id ${Prisma.join(typeCases, ' ')} ELSE productTypeId END,
            ${categorySet}
            updatedAt = CURRENT_TIMESTAMP(3)
        WHERE id IN (${Prisma.join(batch.map(change => change.id))})
      `);
    }
    const categoryMoves = changes.filter(change => change.oldCategory !== change.category);
    if (categoryMoves.length) {
      await tx.brandCategory.createMany({
        data: categoryMoves.map(change => ({ brandId: change.brandId, categorySlug: change.category })),
        skipDuplicates: true,
      });
      const movedIds = new Set(categoryMoves.map(change => change.id));
      const remaining = new Map<string, number>();
      for (const product of products as Product[]) {
        if (movedIds.has(product.id)) continue;
        const key = `${product.brandId}\0${product.category}`;
        remaining.set(key, (remaining.get(key) ?? 0) + 1);
      }
      const stalePairs = [...new Map(categoryMoves
        .filter(change => (remaining.get(`${change.brandId}\0${change.oldCategory}`) ?? 0) === 0)
        .map(change => [`${change.brandId}\0${change.oldCategory}`, { brandId: change.brandId, categorySlug: change.oldCategory }])).values()];
      if (stalePairs.length) await tx.brandCategory.deleteMany({ where: { OR: stalePairs } });
    }
    await tx.auditLog.create({
      data: {
        action: 'product.specs.inferred_from_title',
        entity: 'ProductCatalog',
        entityId: null,
        before: { productsRead: products.length } as Prisma.InputJsonValue,
        after: { ...summary, backupPath } as Prisma.InputJsonValue,
      },
    });
  }, { timeout: 30000, maxWait: 8000 });
  console.log(JSON.stringify({ ...summary, backupPath }, null, 2));
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}).finally(() => db.$disconnect());
