/**
 * extract-product-specs.ts
 * ========================
 * يقرأ موديلات وعناوين المنتجات الحالية ويستخرج منها المواصفات
 * المعيارية بدقة عالية بدون اختلاق أي بيانات غير موجودة في النص.
 * يحدّث حقل specs + ينشئ ProductFacet للتصفية الفورية.
 *
 * النسخة 2: batch processing — أسرع بـ 10x على DB عن بُعد.
 */
import { createDb } from './db.js';
import { loadConfig } from './config.js';
import { Prisma } from '@prisma/client';

const db = createDb(loadConfig().DATABASE_URL);

// ─── أدوات استخراج ─────────────────────────────────────────────────────────

function norm(s: string): string {
  return (s || '').toLowerCase().replace(/\s+/g, ' ').trim();
}

function extractNumber(text: string, patterns: RegExp[]): number | null {
  for (const p of patterns) {
    const m = text.match(p);
    if (m) return parseFloat(m[1].replace(',', ''));
  }
  return null;
}

function extractFirst(text: string, patterns: RegExp[]): string | null {
  for (const p of patterns) {
    const m = text.match(p);
    if (m) return (m[1] || m[0]).trim();
  }
  return null;
}

// ─── محركات الاستخراج لكل فئة ─────────────────────────────────────────────

function extractRamSpecs(text: string): Record<string, unknown> {
  const specs: Record<string, unknown> = {};
  const t = norm(text);

  const cap = extractNumber(t, [
    /\b(\d+)\s*gb\b/i,
    /\b(\d+)\s*جيجابايت\b/i,
    /\b(\d+)\s*جيجا\b/i,
  ]);
  if (cap) specs.capacityGB = cap;

  const gen = extractFirst(t, [
    /(ddr[345]l?x?)/i,
    /(lpddr[345]x?)/i,
  ]);
  if (gen) specs.generation = gen.toUpperCase();

  const speed = extractNumber(t, [
    /\b(\d{4})\s*mhz\b/i,
    /pc[34]-(\d{4,5})/i,
  ]);
  if (speed) specs.speedMHz = speed;

  if (/\blaptop\b|\bnotebook\b|\bso-dimm\b|\bsodimm\b|\blpddr\b/i.test(t)) specs.formFactor = 'SO-DIMM';
  else if (/\bdesktop\b|\bdimm\b/i.test(t)) specs.formFactor = 'DIMM';

  return specs;
}

function extractStorageSpecs(text: string): Record<string, unknown> {
  const specs: Record<string, unknown> = {};
  const t = norm(text);

  let cap: number | null = null;
  const tbMatch = t.match(/\b(\d+(?:\.\d+)?)\s*tb\b/i);
  if (tbMatch) {
    cap = parseFloat(tbMatch[1]) * 1024;
  } else {
    cap = extractNumber(t, [/\b(\d+)\s*gb\b/i]);
  }
  if (cap) specs.capacityGB = cap;

  if (/\bnvme\b|\bm\.2\b|\bpcie\b/i.test(t)) specs.storageType = 'NVMe SSD';
  else if (/\bsata\s*ssd\b|\bssd\b/i.test(t)) specs.storageType = 'SATA SSD';
  else if (/\bhdd\b|\bhard\s*disk\b|\bhard\s*drive\b/i.test(t)) specs.storageType = 'HDD';
  else if (/\bflash\b|\busb\b.*drive|\bthumb\b|\bpen\s*drive\b|\bmemory\s*card\b|\bsd\s*card\b/i.test(t)) specs.storageType = 'Flash';

  const rpmMatch = t.match(/\b(5400|7200|10000|15000)\s*rpm\b/i);
  if (rpmMatch) specs.rpm = parseInt(rpmMatch[1]);

  const formFactor = extractFirst(t, [
    /(2\.5"|2\.5\s*inch)/i,
    /(3\.5"|3\.5\s*inch)/i,
    /(m\.2\s*\d{4})/i,
  ]);
  if (formFactor) specs.formFactor = formFactor;

  const iface = extractFirst(t, [
    /(nvme)/i,
    /(pcie\s*[345]\.0)/i,
    /(sata\s*(?:iii|ii|i|6gb\/s|3gb\/s))/i,
    /(usb\s*[0-9.]+)/i,
  ]);
  if (iface) specs.interface = iface.toUpperCase();

  return specs;
}

function extractLaptopSpecs(text: string): Record<string, unknown> {
  const specs: Record<string, unknown> = {};
  const t = norm(text);

  // المعالج
  const cpu = extractFirst(t, [
    /(intel\s+core\s+(?:ultra\s+)?(?:i[3579]|[0-9]+[a-z]?)-[0-9a-z]+[a-z0-9]*)/i,
    /(ryzen\s+[3579]\s+[0-9a-z]+)/i,
    /(celeron\s+[0-9a-z]+)/i,
    /(pentium\s+[a-z0-9]+)/i,
    /(core\s+(?:ultra\s+)?[0-9]+[a-z]?)/i,
    /(apple\s+m[1-4](?:\s+(?:pro|max|ultra))?)/i,
    /(snapdragon\s+[a-z0-9]+)/i,
  ]);
  if (cpu) specs.processor = cpu.trim();

  // الجيل
  const gen = extractFirst(t, [
    /(\d+)(?:st|nd|rd|th)\s+gen(?:eration)?/i,
    /core\s+i[3579]-(\d)/,
  ]);
  if (gen) specs.processorGen = gen;

  // ذاكرة الوصول العشوائي
  const ram = extractNumber(t, [
    /\b(\d+)\s*gb\s*(?:ram|memory|ddr)/i,
    /ram\s*:?\s*(\d+)\s*gb/i,
    /memory\s*:?\s*(\d+)\s*gb/i,
    /(\d+)\s*gb\s*(?:of\s*)?(?:ram|memory)/i,
  ]);
  if (ram) specs.ramGB = ram;

  // التخزين
  const storageTb = t.match(/(\d+(?:\.\d+)?)\s*tb\s*(?:ssd|hdd|nvme|storage|hard)/i);
  const storageGb = t.match(/(\d+)\s*gb\s*(?:ssd|hdd|nvme|storage|hard)/i);
  if (storageTb) specs.storageGB = parseFloat(storageTb[1]) * 1024;
  else if (storageGb) specs.storageGB = parseInt(storageGb[1]);

  if (/\bnvme\b|\bm\.2\b/i.test(t)) specs.storageType = 'NVMe SSD';
  else if (/\bssd\b/i.test(t)) specs.storageType = 'SSD';
  else if (/\bhdd\b/i.test(t)) specs.storageType = 'HDD';

  // الشاشة
  const screen = extractNumber(t, [
    /(\d+(?:\.\d+)?)\s*(?:"|inch|inches|بوصة|بوصه)\s*(?:display|screen|laptop|fhd|qhd|uhd|ips|led|lcd|oled)?/i,
    /(?:display|screen)\s*:?\s*(\d+(?:\.\d+)?)\s*(?:"|inch)/i,
  ]);
  if (screen && screen >= 10 && screen <= 20) specs.screenInch = screen;

  // دقة الشاشة
  const res = extractFirst(t, [
    /(4k|uhd|3840\s*[x×]\s*2160)/i,
    /(2k|qhd|2560\s*[x×]\s*1440)/i,
    /(fhd|full\s*hd|1920\s*[x×]\s*1080)/i,
    /(hd\+|1366\s*[x×]\s*768)/i,
    /(\d{3,4}\s*[x×]\s*\d{3,4})/,
  ]);
  if (res) specs.screenRes = res.toUpperCase().replace(/\s/g, '');

  // بطاقة الرسوميات
  const gpu = extractFirst(t, [
    /(rtx\s*[0-9]+(?:\s*ti)?(?:\s*\d+gb)?)/i,
    /(gtx\s*[0-9]+(?:\s*ti)?)/i,
    /(radeon\s+(?:rx\s+)?[a-z0-9]+)/i,
    /(intel\s+(?:iris\s+)?(?:xe\s+)?(?:arc\s+)?(?:uhd\s+)?graphics(?:\s+[a-z0-9]+)?)/i,
    /(vega\s+\d+)/i,
    /(amd\s+graphics)/i,
  ]);
  if (gpu) specs.gpu = gpu.trim();

  // نظام التشغيل
  const os = extractFirst(t, [
    /(windows\s+11(?:\s+(?:pro|home|s))?)/i,
    /(windows\s+10(?:\s+(?:pro|home))?)/i,
    /(macos|mac\s*os)/i,
    /(chrome\s*os)/i,
    /(dos|freedos|without\s+os|no\s+os|بدون\s+نظام)/i,
    /(ubuntu|linux)/i,
  ]);
  if (os) specs.os = os.trim();

  // وزن
  const weight = extractNumber(t, [
    /(\d+(?:\.\d+)?)\s*kg\b/i,
    /weighs?\s*:?\s*(\d+(?:\.\d+)?)\s*kg/i,
  ]);
  if (weight && weight > 0.5 && weight < 10) specs.weightKg = weight;

  // البطارية
  const battery = extractNumber(t, [
    /(\d+)\s*(?:wh|watt.?hour)/i,
    /(\d+)\s*mah/i,
  ]);
  if (battery) specs.batteryWh = battery;

  return specs;
}

function extractDisplaySpecs(text: string): Record<string, unknown> {
  const specs: Record<string, unknown> = {};
  const t = norm(text);

  const size = extractNumber(t, [
    /(\d+(?:\.\d+)?)\s*(?:"|inch|inches|بوصة|بوصه)\s*(?:monitor|display|screen|tv|led|lcd|ips|4k|fhd)?/i,
    /(?:monitor|display|tv)\s*(\d+(?:\.\d+)?)\s*(?:"|inch)/i,
  ]);
  if (size && size >= 15 && size <= 120) specs.screenInch = size;

  const res = extractFirst(t, [
    /(4k|uhd|3840\s*[x×]\s*2160)/i,
    /(2k|qhd|2560\s*[x×]\s*1440)/i,
    /(fhd|full\s*hd|1920\s*[x×]\s*1080)/i,
    /(hd\+|1366\s*[x×]\s*768)/i,
    /(\d{3,4}\s*[x×]\s*\d{3,4})/,
  ]);
  if (res) specs.resolution = res.toUpperCase().replace(/\s/g, '');

  const panel = extractFirst(t, [
    /(ips|va|tn|oled|amoled|qled|nano\s*ips)/i,
  ]);
  if (panel) specs.panelType = panel.toUpperCase();

  const refresh = extractNumber(t, [
    /(\d+)\s*hz\b/i,
  ]);
  if (refresh) specs.refreshRateHz = refresh;

  const resp = extractNumber(t, [
    /(\d+(?:\.\d+)?)\s*ms\b/i,
  ]);
  if (resp && resp < 100) specs.responseTimeMs = resp;

  if (/\bhdr\b/i.test(t)) specs.hdr = true;

  if (/\bcurved\b|\bمنحنية\b/i.test(t)) specs.curved = true;

  const ports = [];
  if (/\bhdmi\b/i.test(t)) ports.push('HDMI');
  if (/\bdisplayport\b|\bdp\b/i.test(t)) ports.push('DisplayPort');
  if (/\busb-c\b|\busbc\b/i.test(t)) ports.push('USB-C');
  if (/\bvga\b/i.test(t)) ports.push('VGA');
  if (ports.length) specs.ports = ports;

  return specs;
}

function extractNetworkSpecs(text: string): Record<string, unknown> {
  const specs: Record<string, unknown> = {};
  const t = norm(text);

  const speed = extractFirst(t, [
    /(10\s*gbps|10g)/i,
    /(2\.5\s*gbps|2\.5g)/i,
    /(1\s*gbps|1000\s*mbps|gigabit)/i,
    /(300\s*mbps)/i,
    /(100\s*mbps|fast\s*ethernet)/i,
  ]);
  if (speed) specs.speed = speed.toUpperCase();

  const wifi = extractFirst(t, [
    /(wifi\s*7|wi-fi\s*7|802\.11be)/i,
    /(wifi\s*6e|wi-fi\s*6e)/i,
    /(wifi\s*6|wi-fi\s*6|802\.11ax)/i,
    /(wifi\s*5|wi-fi\s*5|802\.11ac)/i,
    /(wifi\s*4|wi-fi\s*4|802\.11n)/i,
    /(802\.11[abgn]+)/i,
    /\b(wireless\s*[nabg]+)\b/i,
  ]);
  if (wifi) specs.wifiStandard = wifi.trim();

  const band = extractFirst(t, [
    /(tri.?band)/i,
    /(dual.?band)/i,
    /(single.?band)/i,
    /\b(2\.4\s*&\s*5\s*ghz)\b/i,
    /\b(2\.4\s*ghz)\b/i,
    /\b(5\s*ghz)\b/i,
  ]);
  if (band) specs.band = band;

  const ports = extractNumber(t, [
    /(\d+)\s*(?:lan|ethernet|rj45|gigabit)\s*port/i,
    /(\d+)\s*port\s*(?:switch|router)/i,
  ]);
  if (ports) specs.ports = ports;

  if (/\bpoe\+?\b/i.test(t)) specs.poe = true;

  return specs;
}

function extractAudioSpecs(text: string): Record<string, unknown> {
  const specs: Record<string, unknown> = {};
  const t = norm(text);

  const driver = extractNumber(t, [
    /(\d+)\s*mm\s*(?:driver|speaker|dynamic)/i,
  ]);
  if (driver) specs.driverMm = driver;

  if (/\btws\b|\btrue\s*wireless\b/i.test(t)) specs.connectivity = 'TWS';
  else if (/\bwireless\b|\bbluetooth\b/i.test(t)) specs.connectivity = 'Wireless';
  else if (/\bwired\b|\b3\.5\s*mm\b|\busb\b/i.test(t)) specs.connectivity = 'Wired';

  const btVer = extractFirst(t, [
    /bluetooth\s*(5\.[0-9]+)/i,
    /bt\s*(5\.[0-9]+)/i,
    /bluetooth\s*([0-9]+\.[0-9]+)/i,
  ]);
  if (btVer) specs.bluetoothVersion = btVer;

  if (/\banc\b|\bactive\s*noise\s*cancel/i.test(t)) specs.anc = true;
  if (/\bnoise\s*cancel/i.test(t) && !specs.anc) specs.noiseCancel = true;

  const battery = extractNumber(t, [
    /(\d+)\s*(?:hour|hr|h)\s*(?:battery|playback|playtime)/i,
    /battery\s*(?:life)?\s*:?\s*(\d+)\s*(?:hour|hr|h)/i,
    /up\s*to\s*(\d+)\s*(?:hour|hr|h)/i,
  ]);
  if (battery) specs.batteryHours = battery;

  const power = extractNumber(t, [
    /(\d+(?:\.\d+)?)\s*w\s*(?:rms|speaker|output)/i,
    /(\d+(?:\.\d+)?)\s*watts?\b/i,
  ]);
  if (power) specs.powerW = power;

  const type = extractFirst(t, [
    /(in-ear|earbuds|earphones)/i,
    /(over-ear|headphones|headset)/i,
    /(on-ear)/i,
    /(soundbar)/i,
    /(speaker)/i,
    /(microphone|mic)/i,
  ]);
  if (type) specs.audioType = type.trim();

  return specs;
}

function extractPowerSpecs(text: string): Record<string, unknown> {
  const specs: Record<string, unknown> = {};
  const t = norm(text);

  const watt = extractNumber(t, [
    /(\d+)\s*w\s*(?:psu|power|output|adapter|charger)/i,
    /(\d+)\s*watt/i,
    /power\s*:?\s*(\d+)\s*w\b/i,
  ]);
  if (watt) specs.powerW = watt;

  const volt = extractFirst(t, [
    /(\d+v\/\d+v)/i,
    /(\d+-\d+\s*v)/i,
  ]);
  if (volt) specs.voltage = volt;

  // UPS
  const va = extractNumber(t, [
    /(\d+)\s*va\b/i,
    /(\d+)\s*kva\b/i,
  ]);
  if (va) specs.capacityVA = va;

  const mah = extractNumber(t, [
    /(\d{4,6})\s*mah\b/i,
  ]);
  if (mah) specs.capacityMAh = mah;

  const eff = extractFirst(t, [
    /(80\+\s*(?:titanium|platinum|gold|silver|bronze))/i,
    /(80\s*plus\s*(?:titanium|platinum|gold|silver|bronze))/i,
    /(80\+)/i,
  ]);
  if (eff) specs.efficiency = eff.toUpperCase();

  if (/\bmodular\b/i.test(t)) specs.modular = true;
  else if (/\bsemi.modular\b/i.test(t)) specs.modular = 'semi';

  const outlets = extractNumber(t, [
    /(\d+)\s*(?:outlet|socket|plug)/i,
  ]);
  if (outlets) specs.outlets = outlets;

  if (/\bups\b|\buninterruptible\b/i.test(t)) specs.powerType = 'UPS';
  else if (/\bpsu\b|\bpower\s*supply\b/i.test(t)) specs.powerType = 'PSU';
  else if (/\bpower\s*bank\b/i.test(t)) specs.powerType = 'Power Bank';
  else if (/\bcharger\b|\badapter\b/i.test(t)) specs.powerType = 'Charger/Adapter';
  else if (/\bextension\b|\bsurge\b|\bstrip\b/i.test(t)) specs.powerType = 'Extension/Strip';

  return specs;
}

function extractPrinterSpecs(text: string): Record<string, unknown> {
  const specs: Record<string, unknown> = {};
  const t = norm(text);

  if (/\blaser\b/i.test(t)) specs.printerType = 'Laser';
  else if (/\binkjet\b|\bink\s*tank\b/i.test(t)) specs.printerType = 'Inkjet';
  else if (/\bthermal\b|\bpos\b|\breceipt\b|\blabel\b/i.test(t)) specs.printerType = 'Thermal';
  else if (/\bdot\s*matrix\b/i.test(t)) specs.printerType = 'Dot Matrix';

  if (/\bcolor\b|\bcolour\b/i.test(t)) specs.colorPrint = true;
  else if (/\bmono\b|\bblack\s*(and|&|n)\s*white\b|\bbw\b/i.test(t)) specs.colorPrint = false;

  const ppm = extractNumber(t, [
    /(\d+)\s*ppm\b/i,
    /(\d+)\s*pages?\s*per\s*minute/i,
  ]);
  if (ppm) specs.speedPPM = ppm;

  const dpi = extractNumber(t, [
    /(\d+(?:,\d+)?)\s*x\s*\d+\s*dpi/i,
    /(\d+(?:,\d+)?)\s*dpi/i,
  ]);
  if (dpi) specs.dpi = dpi;

  const paper = extractFirst(t, [
    /(a3\b)/i,
    /(a4\b)/i,
    /(letter\b)/i,
    /(4["\s]x\s*6["\s])/i,
    /(80mm\b)/i,
  ]);
  if (paper) specs.paperSize = paper.toUpperCase();

  const func = [];
  if (/\bscan/i.test(t)) func.push('Scan');
  if (/\bcopy|copier/i.test(t)) func.push('Copy');
  if (/\bfax\b/i.test(t)) func.push('Fax');
  if (func.length) specs.functions = func;

  if (/\bwifi\b|\bwireless\b/i.test(t)) specs.wireless = true;
  if (/\bduplex\b|\badf\b|\bauto\s*feed\b/i.test(t)) specs.duplex = true;

  return specs;
}

function extractSecuritySpecs(text: string): Record<string, unknown> {
  const specs: Record<string, unknown> = {};
  const t = norm(text);

  if (/\bcctv\b|\bip\s*camera\b|\bsecurity\s*camera\b|\bsurveillance\b|\bcamera\b/i.test(t)) specs.deviceType = 'Camera';
  else if (/\bdvr\b|\bnvr\b|\brecorder\b/i.test(t)) specs.deviceType = 'Recorder';
  else if (/\baccess\s*control\b|\bbiometric\b|\bfingerprint\b/i.test(t)) specs.deviceType = 'Access Control';
  else if (/\bsmart\s*lock\b|\bdoor\s*lock\b/i.test(t)) specs.deviceType = 'Smart Lock';
  else if (/\balarm\b|\bdetect/i.test(t)) specs.deviceType = 'Alarm/Sensor';

  const mp = extractNumber(t, [
    /(\d+(?:\.\d+)?)\s*mp\b/i,
    /(\d+(?:\.\d+)?)\s*megapixel/i,
  ]);
  if (mp) specs.megapixels = mp;

  const res = extractFirst(t, [
    /(4k|uhd|8mp)/i,
    /(5mp)/i,
    /(4mp)/i,
    /(3mp)/i,
    /(2mp|1080p|full\s*hd)/i,
    /(1mp|720p|hd)/i,
  ]);
  if (res && !mp) specs.resolution = res.toUpperCase();

  if (/\bpoe\b/i.test(t)) specs.poe = true;
  if (/\bnight\s*vision\b|\binfra?red\b|\bir\b/i.test(t)) specs.nightVision = true;
  if (/\boutdoor\b|\bweatherproof\b|\bip6[67]\b/i.test(t)) specs.outdoor = true;
  if (/\bwifi\b|\bwireless\b/i.test(t)) specs.wireless = true;

  const channels = extractNumber(t, [
    /(\d+)\s*channel/i,
    /(\d+)\s*ch\b/i,
  ]);
  if (channels) specs.channels = channels;

  return specs;
}

function extractSoftwareSpecs(text: string): Record<string, unknown> {
  const specs: Record<string, unknown> = {};
  const t = norm(text);

  const type = extractFirst(t, [
    /(antivirus|internet\s*security|total\s*security)/i,
    /(office|microsoft\s*365|ms\s*office)/i,
    /(windows\s*\d+)/i,
    /(autocad)/i,
    /(adobe)/i,
    /(vpn)/i,
  ]);
  if (type) specs.softwareType = type.trim();

  const devices = extractNumber(t, [
    /(\d+)\s*(?:pc|device|user|computer|license)/i,
    /for\s*(\d+)\s*(?:pc|device|user)/i,
  ]);
  if (devices) specs.licenseDevices = devices;

  const duration = extractFirst(t, [
    /(\d+\s*year)/i,
    /(lifetime|لا\s*تنتهي)/i,
    /(1\s*month|شهر)/i,
  ]);
  if (duration) specs.licenseDuration = duration.trim();

  if (/\bwindows\b/i.test(t)) specs.platform = 'Windows';
  else if (/\bmac\b|\bmacos\b/i.test(t)) specs.platform = 'Mac';
  else if (/\bmulti.?platform\b|\bcross.?platform\b/i.test(t)) specs.platform = 'Multi-Platform';

  return specs;
}

// ─── توزيع المحركات حسب الفئة ─────────────────────────────────────────────

function runExtractor(categorySlug: string, text: string): Record<string, unknown> {
  // الفئات المباشرة
  const directMap: Record<string, (t: string) => Record<string, unknown>> = {
    'ram': extractRamSpecs,
    'ram-desktop': extractRamSpecs,
    'ram-laptop': extractRamSpecs,
    'storage': extractStorageSpecs,
    'storage-internal-ssd': extractStorageSpecs,
    'storage-external-ssd': extractStorageSpecs,
    'storage-internal-hdd': extractStorageSpecs,
    'storage-external-hdd': extractStorageSpecs,
    'storage-flash-memory': extractStorageSpecs,
    'storage-accessories': extractStorageSpecs,
    'laptops': extractLaptopSpecs,
    'laptops-consumer': extractLaptopSpecs,
    'laptops-business': extractLaptopSpecs,
    'laptops-gaming': extractLaptopSpecs,
    'laptops-convertible': extractLaptopSpecs,
    'laptops-workstations': extractLaptopSpecs,
    'desktops': extractLaptopSpecs,
    'computers-tower': extractLaptopSpecs,
    'item-2zl02d': extractLaptopSpecs,
    'displays': extractDisplaySpecs,
    'displays-monitors': extractDisplaySpecs,
    'displays-televisions': extractDisplaySpecs,
    'displays-projectors': extractDisplaySpecs,
    'network': extractNetworkSpecs,
    'network-routers-modems': extractNetworkSpecs,
    'network-switches-access-points': extractNetworkSpecs,
    'network-adapters': extractNetworkSpecs,
    'network-cables-tools': extractNetworkSpecs,
    'network-antennas-extenders': extractNetworkSpecs,
    'audio': extractAudioSpecs,
    'audio-headphones-earbuds': extractAudioSpecs,
    'audio-speakers': extractAudioSpecs,
    'audio-microphones': extractAudioSpecs,
    'audio-equipment': extractAudioSpecs,
    'power': extractPowerSpecs,
    'power-ups-batteries': extractPowerSpecs,
    'power-computer-psu': extractPowerSpecs,
    'power-extensions': extractPowerSpecs,
    'power-banks': extractPowerSpecs,
    'power-chargers-adapters': extractPowerSpecs,
    'printers': extractPrinterSpecs,
    'printers-laser': extractPrinterSpecs,
    'printers-inkjet': extractPrinterSpecs,
    'printers-pos-label': extractPrinterSpecs,
    'security': extractSecuritySpecs,
    'security-smart-locks': extractSecuritySpecs,
    'security-cameras': extractSecuritySpecs,
    'security-access-control': extractSecuritySpecs,
    'software': extractSoftwareSpecs,
  };

  const fn = directMap[categorySlug];
  if (fn) return fn(text);

  // محاولة مطابقة جزئية
  if (categorySlug.startsWith('ram')) return extractRamSpecs(text);
  if (categorySlug.startsWith('storage') || categorySlug.includes('hdd') || categorySlug.includes('ssd')) return extractStorageSpecs(text);
  if (categorySlug.startsWith('laptop') || categorySlug.includes('laptop')) return extractLaptopSpecs(text);
  if (categorySlug.startsWith('desktop') || categorySlug.includes('desktop') || categorySlug.includes('computer')) return extractLaptopSpecs(text);
  if (categorySlug.startsWith('display') || categorySlug.includes('monitor') || categorySlug.includes('tv')) return extractDisplaySpecs(text);
  if (categorySlug.startsWith('network') || categorySlug.includes('router') || categorySlug.includes('switch')) return extractNetworkSpecs(text);
  if (categorySlug.startsWith('audio') || categorySlug.includes('headphone') || categorySlug.includes('speaker')) return extractAudioSpecs(text);
  if (categorySlug.startsWith('power') || categorySlug.includes('ups') || categorySlug.includes('psu')) return extractPowerSpecs(text);
  if (categorySlug.startsWith('printer') || categorySlug.includes('print')) return extractPrinterSpecs(text);
  if (categorySlug.startsWith('security') || categorySlug.includes('camera') || categorySlug.includes('cctv')) return extractSecuritySpecs(text);
  if (categorySlug.startsWith('software') || categorySlug.includes('software')) return extractSoftwareSpecs(text);

  return {};
}

// ─── التنفيذ (batch optimized) ────────────────────────────────────────────────

async function main() {
  console.log('🔍 بدء استخراج المواصفات من النصوص (نسخة batch)...\n');

  // تحميل SpecDefinitions مرة واحدة
  const specDefs = await db.specDefinition.findMany({
    select: { key: true, filterable: true }
  });
  const filterableKeys = new Set(
    specDefs.filter(s => s.filterable).map(s => s.key)
  );
  console.log(`🏷️  مفاتيح قابلة للفلترة: ${filterableKeys.size}\n`);

  // قراءة جميع المنتجات
  const products = await db.product.findMany({
    select: { id: true, slug: true, category: true, model: true, title: true, specs: true }
  });

  const toUpdate = products.filter(p => {
    const s = p.specs as Record<string, unknown>;
    if (!s || typeof s !== 'object') return true;
    const keys = Object.keys(s).filter(k => k !== 'originalPriceUsd');
    return keys.length === 0;
  });

  console.log(`📦 منتجات تحتاج استخراج مواصفات: ${toUpdate.length} من ${products.length}\n`);

  let updated = 0;
  let skipped = 0;
  let noExtractor = 0;
  const BATCH_SIZE = 20;

  for (let i = 0; i < toUpdate.length; i += BATCH_SIZE) {
    const batch = toUpdate.slice(i, i + BATCH_SIZE);

    // استخراج المواصفات لكل منتج في الـ batch
    const results: Array<{
      id: string;
      newSpecs: Record<string, unknown>;
      facets: Array<{ productId: string; key: string; value: string }>;
    }> = [];

    for (const p of batch) {
      const title = (p.title as any);
      const textAr = `${p.model || ''} ${title?.ar || ''}`;
      const textEn = `${p.model || ''} ${title?.en || ''}`;
      const combined = `${textAr} ${textEn}`.trim();

      if (!combined || combined.length < 3) { skipped++; continue; }

      const extracted = runExtractor(p.category, combined);
      const extractedKeys = Object.keys(extracted).filter(k => extracted[k] !== null && extracted[k] !== undefined);

      if (extractedKeys.length === 0) { noExtractor++; continue; }

      const existing = (p.specs as Record<string, unknown>) || {};
      const newSpecs = { ...existing, ...extracted };

      const facets: Array<{ productId: string; key: string; value: string }> = [];
      for (const key of extractedKeys) {
        if (!filterableKeys.has(key)) continue;
        const value = extracted[key];
        const valueStr = Array.isArray(value) ? value.join(', ') : String(value);
        if (valueStr.trim()) {
          facets.push({ productId: p.id, key, value: valueStr.slice(0, 160) });
        }
      }

      results.push({ id: p.id, newSpecs, facets });
    }

    // تنفيذ الـ batch بدون transaction (بسبب timeout على DB بعيد)
    if (results.length > 0) {
      // تحديث المنتجات بشكل متوازٍ
      await Promise.all(
        results.map(r =>
          db.product.update({
            where: { id: r.id },
            data: { specs: r.newSpecs as Prisma.InputJsonValue }
          })
        )
      );

      // تحديث ProductFacets بشكل متوازٍ
      for (const r of results) {
        if (r.facets.length > 0) {
          const keys = [...new Set(r.facets.map(f => f.key))];
          await db.productFacet.deleteMany({
            where: { productId: r.id, key: { in: keys } }
          });
          await db.productFacet.createMany({ data: r.facets });
        }
      }

      updated += results.length;
    }

    const progress = Math.round(((i + batch.length) / toUpdate.length) * 100);
    console.log(`  ✔ ${i + batch.length}/${toUpdate.length} (${progress}%) — محدَّث: ${updated}`);
  }

  console.log('\n═══════════════════════════════════════════');
  console.log('✅ اكتمل الاستخراج!');
  console.log(`   • تم تحديث مواصفات: ${updated} منتج`);
  console.log(`   • تجاهل (نص قصير جداً): ${skipped}`);
  console.log(`   • فئات بلا محرك استخراج: ${noExtractor}`);
  console.log('═══════════════════════════════════════════');

  await db.$disconnect();
}

main().catch(e => { console.error('❌ خطأ:', e); process.exit(1); });
