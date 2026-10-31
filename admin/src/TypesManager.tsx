import { useState, useMemo, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { SlidersHorizontal, Layers, Plus, Search, Edit3, Trash2, Copy, Check, X, ChevronDown, ChevronUp, ArrowUp, ArrowDown, Sparkles, Laptop, Tv, HardDrive, BatteryCharging, Wifi, Headphones, Tag, Filter, CheckCircle2, Eye, Info, FileText, BookmarkCheck, ShieldAlert, FolderTree, Printer, Cpu, Lock, ShieldCheck, FileCode, Package } from 'lucide-react';
import { can, type SpecFieldInput, TypeEdit } from '@aljeel/shared';
import { api, ApiError } from './api';
import { useI18n } from './i18n';
import { useSession } from './App';
import { Loading, ErrorBox, Modal } from './components';
import './types-manager.css';

// ── Types ─────────────────────────────────────────────────────────────────────

type LocalizedText = { ar: string; en: string };

type ProductTypeRecord = {
  id: string;
  title: LocalizedText;
  fields: SpecFieldInput[];
  updatedAt?: string;
  revision?: string;
};

type Reference = {
  products: { id: string; title: unknown; productTypeId?: string | null; category?: string }[];
  categories: { slug: string; title: unknown; productTypeId?: string | null }[];
  types: ProductTypeRecord[];
};

// ── Standard Industry Presets ────────────────────────────────────────────────

type TemplatePreset = {
  id: string;
  title: LocalizedText;
  icon: typeof Laptop;
  fields: SpecFieldInput[];
};

const INDUSTRY_PRESETS: TemplatePreset[] = [
  {
    id: 'laptops',
    title: { ar: 'أجهزة لابتوب وكمبيوتر محمول', en: 'Laptops & Mobile Workstations' },
    icon: Laptop,
    fields: [
      { key: 'cpu', title: { ar: 'المعالج', en: 'Processor' }, valueType: 'text', unit: null, options: [], required: true, filterable: true, card: true, sort: 0 },
      { key: 'ramGB', title: { ar: 'الذاكرة العشوائية', en: 'RAM Memory' }, valueType: 'number', unit: 'GB', options: [], required: true, filterable: true, card: true, sort: 1 },
      { key: 'storageGB', title: { ar: 'سعة التخزين', en: 'Storage' }, valueType: 'number', unit: 'GB', options: [], required: true, filterable: true, card: true, sort: 2 },
      { key: 'storageType', title: { ar: 'نوع التخزين', en: 'Storage Type' }, valueType: 'single', unit: null, options: ['NVMe M.2 SSD', 'SATA SSD', 'HDD'], required: false, filterable: true, card: false, sort: 3 },
      { key: 'gpu', title: { ar: 'كرت الشاشة', en: 'Graphics GPU' }, valueType: 'text', unit: null, options: [], required: false, filterable: true, card: true, sort: 4 },
      { key: 'displaySize', title: { ar: 'مقاس الشاشة', en: 'Display Size' }, valueType: 'number', unit: 'inch', options: [], required: false, filterable: true, card: true, sort: 5 },
      { key: 'refreshRate', title: { ar: 'تردد الشاشة', en: 'Refresh Rate' }, valueType: 'number', unit: 'Hz', options: [], required: false, filterable: true, card: false, sort: 6 },
      { key: 'batteryHealthPct', title: { ar: 'صحة البطارية', en: 'Battery Health' }, valueType: 'number', unit: '%', options: [], required: false, filterable: true, card: false, sort: 7 },
      { key: 'os', title: { ar: 'نظام التشغيل', en: 'Operating System' }, valueType: 'single', unit: null, options: ['Windows 11 Pro', 'Windows 10 Pro', 'macOS', 'Linux / FreeDOS'], required: false, filterable: true, card: false, sort: 8 },
      { key: 'weightKg', title: { ar: 'الوزن', en: 'Weight' }, valueType: 'number', unit: 'kg', options: [], required: false, filterable: false, card: false, sort: 9 },
    ]
  },
  {
    id: 'displays',
    title: { ar: 'شاشات عرض واحترافية', en: 'Monitors & Pro Displays' },
    icon: Tv,
    fields: [
      { key: 'sizeInch', title: { ar: 'مقاس الشاشة', en: 'Screen Size' }, valueType: 'number', unit: 'inch', options: [], required: true, filterable: true, card: true, sort: 0 },
      { key: 'refreshHz', title: { ar: 'معدل التحديث', en: 'Refresh Rate' }, valueType: 'number', unit: 'Hz', options: [], required: true, filterable: true, card: true, sort: 1 },
      { key: 'resolution', title: { ar: 'الدقة', en: 'Resolution' }, valueType: 'single', unit: null, options: ['1080p Full HD', '2K QHD (1440p)', '4K UHD (2160p)'], required: true, filterable: true, card: true, sort: 2 },
      { key: 'panel', title: { ar: 'نوع اللوحة', en: 'Panel Type' }, valueType: 'single', unit: null, options: ['IPS', 'OLED', 'Fast VA', 'TN'], required: false, filterable: true, card: false, sort: 3 },
      { key: 'ports', title: { ar: 'المنافذ', en: 'Ports' }, valueType: 'multi', unit: null, options: ['HDMI 2.1', 'DisplayPort 1.4', 'Type-C Thunderbolt', 'USB Hub'], required: false, filterable: true, card: false, sort: 4 },
      { key: 'touch', title: { ar: 'دعم اللمس', en: 'Touch Screen' }, valueType: 'boolean', unit: null, options: [], required: false, filterable: true, card: false, sort: 5 },
    ]
  },
  {
    id: 'audio',
    title: { ar: 'صوتيات وسماعات رأس', en: 'Audio & Headsets' },
    icon: Headphones,
    fields: [
      { key: 'wireless', title: { ar: 'لاسلكي', en: 'Wireless' }, valueType: 'boolean', unit: null, options: [], required: true, filterable: true, card: true, sort: 0 },
      { key: 'connectionType', title: { ar: 'طريقة التوصيل', en: 'Connection Mode' }, valueType: 'single', unit: null, options: ['Bluetooth 5.3', 'Wireless 2.4GHz', 'USB Wired', '3.5mm Aux'], required: false, filterable: true, card: false, sort: 1 },
      { key: 'batteryHours', title: { ar: 'عمر البطارية', en: 'Battery Life' }, valueType: 'number', unit: 'h', options: [], required: false, filterable: true, card: true, sort: 2 },
      { key: 'noiseCancelling', title: { ar: 'عزل الضوضاء ANC', en: 'Active Noise Cancelling' }, valueType: 'boolean', unit: null, options: [], required: false, filterable: true, card: false, sort: 3 },
    ]
  },
  {
    id: 'storage',
    title: { ar: 'وحدات تخزين وأقراص SSD', en: 'Storage & SSD Drives' },
    icon: HardDrive,
    fields: [
      { key: 'capacityGB', title: { ar: 'السعة التخزينية', en: 'Storage Capacity' }, valueType: 'number', unit: 'GB', options: [], required: true, filterable: true, card: true, sort: 0 },
      { key: 'storageForm', title: { ar: 'هيئة القرص', en: 'Form Factor' }, valueType: 'single', unit: null, options: ['M.2 2280 NVMe', '2.5 inch SATA SSD', 'External Portable SSD', '3.5 inch HDD'], required: true, filterable: true, card: true, sort: 1 },
      { key: 'readSpeedMBs', title: { ar: 'سرعة القراءة القصوى', en: 'Max Read Speed' }, valueType: 'number', unit: 'MB/s', options: [], required: false, filterable: false, card: true, sort: 2 },
      { key: 'writeSpeedMBs', title: { ar: 'سرعة الكتابة القصوى', en: 'Max Write Speed' }, valueType: 'number', unit: 'MB/s', options: [], required: false, filterable: false, card: false, sort: 3 },
    ]
  },
  {
    id: 'power',
    title: { ar: 'أنظمة الطاقة والبطاريات وUPS', en: 'Power Stations & UPS' },
    icon: BatteryCharging,
    fields: [
      { key: 'powerW', title: { ar: 'القدرة الفعلية', en: 'Real Power Output' }, valueType: 'number', unit: 'W', options: [], required: true, filterable: true, card: true, sort: 0 },
      { key: 'capacityVA', title: { ar: 'السعة الاسمية', en: 'Nominal Capacity' }, valueType: 'number', unit: 'VA', options: [], required: false, filterable: true, card: true, sort: 1 },
      { key: 'waveType', title: { ar: 'شكل الموجة', en: 'Waveform' }, valueType: 'single', unit: null, options: ['Pure Sine Wave موجة نقية', 'Modified Sine Wave موجة معدلة'], required: false, filterable: true, card: false, sort: 2 },
      { key: 'outletsCount', title: { ar: 'عدد منافذ الخرج', en: 'AC Outlets' }, valueType: 'number', unit: null, options: [], required: false, filterable: false, card: false, sort: 3 },
    ]
  },
  {
    id: 'network',
    title: { ar: 'أجهزة الشبكات والراوترات', en: 'Networking & Routers' },
    icon: Wifi,
    fields: [
      { key: 'deviceType', title: { ar: 'نوع الجهاز', en: 'Device Type' }, valueType: 'single', unit: null, options: ['راوتر لاسلكي (WiFi Router)', 'موزع (Switch)', 'Mesh نظام', 'نقطة وصول (Access Point)', 'مودم DSL', 'محول شبكة (Network Adapter)', 'موسع (Range Extender)', 'كابل شبكة (Network Cable)'], required: false, filterable: true, card: true, sort: 0 },
      { key: 'wifiStandard', title: { ar: 'معيار الواي فاي', en: 'Wi-Fi Standard' }, valueType: 'single', unit: null, options: ['Wi-Fi 7 (802.11be)', 'Wi-Fi 6E (802.11ax 6GHz)', 'Wi-Fi 6 (802.11ax)', 'Wi-Fi 5 AC (802.11ac)', 'Wi-Fi 4 N (802.11n)'], required: false, filterable: true, card: true, sort: 1 },
      { key: 'speedMbps', title: { ar: 'السرعة القصوى', en: 'Speed Rate' }, valueType: 'number', unit: 'Mbps', options: [], required: false, filterable: true, card: true, sort: 2 },
      { key: 'portsCount', title: { ar: 'عدد منافذ LAN', en: 'LAN Ports' }, valueType: 'number', unit: null, options: [], required: false, filterable: false, card: false, sort: 3 },
      { key: 'meshSupport', title: { ar: 'دعم Mesh', en: 'Mesh Support' }, valueType: 'boolean', unit: null, options: [], required: false, filterable: true, card: false, sort: 4 },
    ]
  },
  {
    id: 'desktops',
    title: { ar: 'أجهزة مكتبية وكيسات', en: 'Desktop PCs & Workstations' },
    icon: Tv,
    fields: [
      { key: 'cpu', title: { ar: 'المعالج', en: 'Processor' }, valueType: 'text', unit: null, options: [], required: true, filterable: true, card: true, sort: 0 },
      { key: 'cpuGen', title: { ar: 'جيل المعالج', en: 'CPU Generation' }, valueType: 'number', unit: null, options: [], required: false, filterable: true, card: false, sort: 1 },
      { key: 'ramGB', title: { ar: 'الذاكرة RAM', en: 'Memory' }, valueType: 'number', unit: 'GB', options: ['4', '8', '16', '32', '64'], required: true, filterable: true, card: true, sort: 2 },
      { key: 'storageGB', title: { ar: 'سعة التخزين', en: 'Storage' }, valueType: 'number', unit: 'GB', options: ['128', '256', '512', '1024', '2048'], required: true, filterable: true, card: true, sort: 3 },
      { key: 'storageType', title: { ar: 'نوع التخزين', en: 'Storage Type' }, valueType: 'single', unit: null, options: ['NVMe SSD', 'SATA SSD', 'HDD'], required: false, filterable: true, card: false, sort: 4 },
      { key: 'gpu', title: { ar: 'كرت الشاشة', en: 'Graphics GPU' }, valueType: 'text', unit: null, options: [], required: false, filterable: true, card: true, sort: 5 },
      { key: 'formFactor', title: { ar: 'هيئة الكيس', en: 'Form Factor' }, valueType: 'single', unit: null, options: ['Tower (كيس عادي)', 'Mini PC', 'All-in-One', 'SFF (Small Form Factor)'], required: false, filterable: true, card: false, sort: 6 },
      { key: 'os', title: { ar: 'نظام التشغيل', en: 'Operating System' }, valueType: 'single', unit: null, options: ['Windows 11 Pro', 'Windows 10 Pro', 'Linux', 'No OS'], required: false, filterable: true, card: false, sort: 7 },
    ]
  },
  {
    id: 'ram',
    title: { ar: 'ذواكر عشوائية RAM', en: 'RAM Memory Modules' },
    icon: Cpu,
    fields: [
      { key: 'capacityGB', title: { ar: 'السعة', en: 'Capacity' }, valueType: 'number', unit: 'GB', options: ['4', '8', '16', '32', '64'], required: true, filterable: true, card: true, sort: 0 },
      { key: 'generation', title: { ar: 'الجيل', en: 'Generation' }, valueType: 'single', unit: null, options: ['DDR5', 'DDR4', 'DDR3', 'DDR3L'], required: true, filterable: true, card: true, sort: 1 },
      { key: 'speedMhz', title: { ar: 'السرعة / التردد', en: 'Speed' }, valueType: 'number', unit: 'MHz', options: ['1600', '2133', '2400', '2666', '3200', '4800', '5600'], required: true, filterable: true, card: true, sort: 2 },
      { key: 'formFactor', title: { ar: 'التوافق', en: 'Form Factor' }, valueType: 'single', unit: null, options: ['SO-DIMM (لابتوب)', 'DIMM (مكتبي)'], required: true, filterable: true, card: true, sort: 3 },
    ]
  },
  {
    id: 'printers',
    title: { ar: 'طابعات وماكينات فواتير وباركود', en: 'Printers, POS & Barcode' },
    icon: Printer,
    fields: [
      { key: 'printerType', title: { ar: 'تقنية الطباعة', en: 'Print Technology' }, valueType: 'single', unit: null, options: ['ليزر (Laser)', 'حبر نفاث (Inkjet / Ink Tank)', 'حرارية فواتير (Thermal Receipt)', 'طابعة ملصقات (Label / Barcode)'], required: true, filterable: true, card: true, sort: 0 },
      { key: 'colorType', title: { ar: 'نوع الألوان', en: 'Color Output' }, valueType: 'single', unit: null, options: ['أبيض وأسود (Monochrome)', 'ألوان (Color)'], required: true, filterable: true, card: true, sort: 1 },
      { key: 'multiFunction', title: { ar: 'متعدد الوظائف', en: 'Multi-Function' }, valueType: 'boolean', unit: null, options: [], required: false, filterable: true, card: true, sort: 2 },
      { key: 'connectivity', title: { ar: 'الاتصال', en: 'Connectivity' }, valueType: 'multi', unit: null, options: ['Wi-Fi', 'USB', 'Ethernet', 'Bluetooth'], required: false, filterable: true, card: false, sort: 3 },
      { key: 'printWidth', title: { ar: 'عرض الطباعة', en: 'Print Width' }, valueType: 'number', unit: 'mm', options: [], required: false, filterable: false, card: false, sort: 4 },
    ]
  },
  {
    id: 'accessories',
    title: { ar: 'إكسسوارات وملحقات الكمبيوتر', en: 'Computer Accessories & Peripherals' },
    icon: Package,
    fields: [
      { key: 'accessoryType', title: { ar: 'نوع الملحق', en: 'Accessory Type' }, valueType: 'single', unit: null, options: ['ماوس (Mouse)', 'كيبورد (Keyboard)', 'كابل (Cable)', 'محول/موزع Hub', 'حقيبة وغطاء (Bag/Case)', 'حامل وقاعدة (Stand)', 'قارئ بطاقة (Card Reader)', 'كاميرا ويب (Webcam)', 'أخرى (Other)'], required: false, filterable: true, card: true, sort: 0 },
      { key: 'wireless', title: { ar: 'لاسلكي', en: 'Wireless' }, valueType: 'boolean', unit: null, options: [], required: false, filterable: true, card: true, sort: 1 },
      { key: 'interface', title: { ar: 'الواجهة / المنفذ', en: 'Interface' }, valueType: 'single', unit: null, options: ['USB-A', 'USB-C', 'Bluetooth', 'Wireless 2.4GHz', 'HDMI', 'DisplayPort', '3.5mm'], required: false, filterable: true, card: false, sort: 2 },
      { key: 'compatibility', title: { ar: 'التوافق', en: 'Compatibility' }, valueType: 'multi', unit: null, options: ['Windows', 'Mac', 'Linux', 'Android'], required: false, filterable: false, card: false, sort: 3 },
    ]
  },
  {
    id: 'security',
    title: { ar: 'أمن ذكي وأقفال', en: 'Smart Security & Locks' },
    icon: Lock,
    fields: [
      { key: 'lockType', title: { ar: 'طريقة الفتح', en: 'Unlock Method' }, valueType: 'multi', unit: null, options: ['بصمة إصبع (Fingerprint)', 'رمز سري (PIN Code)', 'مفتاح كهربائي (Smart Key)', 'بطاقة RFID', 'جهاز تحكم Fob', 'جرس فيديو (Video Doorbell)'], required: false, filterable: true, card: true, sort: 0 },
      { key: 'connectivity', title: { ar: 'الاتصال الذكي', en: 'Smart Connectivity' }, valueType: 'single', unit: null, options: ['Wi-Fi', 'Bluetooth', 'Zigbee', 'Z-Wave', 'محلي فقط'], required: false, filterable: true, card: true, sort: 1 },
      { key: 'batteryHours', title: { ar: 'عمر البطارية', en: 'Battery Life' }, valueType: 'number', unit: 'h', options: [], required: false, filterable: true, card: false, sort: 2 },
      { key: 'cameraRes', title: { ar: 'دقة الكاميرا', en: 'Camera Res.' }, valueType: 'text', unit: null, options: [], required: false, filterable: false, card: false, sort: 3 },
    ]
  },
  {
    id: 'software',
    title: { ar: 'برامج وتراخيص رقمية', en: 'Software & Digital Licenses' },
    icon: FileCode,
    fields: [
      { key: 'softwareType', title: { ar: 'نوع البرنامج', en: 'Software Type' }, valueType: 'single', unit: null, options: ['نظام تشغيل (OS)', 'مجموعة أوفيس (Office Suite)', 'حماية ومكافح فيروس (Antivirus)', 'تصميم وإبداع (Creative)', 'أعمال وإدارة (Business)'], required: true, filterable: true, card: true, sort: 0 },
      { key: 'licenseType', title: { ar: 'نوع الرخصة', en: 'License Type' }, valueType: 'single', unit: null, options: ['مفتاح تفعيل رقمي (Digital Key)', 'اشتراك سنوي (Subscription)', 'مدى الحياة (Lifetime)'], required: false, filterable: true, card: true, sort: 1 },
      { key: 'devicesAllowed', title: { ar: 'عدد الأجهزة المسموح', en: 'Devices Allowed' }, valueType: 'number', unit: null, options: [], required: false, filterable: true, card: false, sort: 2 },
      { key: 'validityMonths', title: { ar: 'مدة الصلاحية', en: 'Validity' }, valueType: 'number', unit: 'شهر', options: [], required: false, filterable: true, card: false, sort: 3 },
      { key: 'compatibility', title: { ar: 'التوافق', en: 'Compatibility' }, valueType: 'multi', unit: null, options: ['Windows 11', 'Windows 10', 'macOS', 'Android', 'iOS'], required: false, filterable: true, card: false, sort: 4 },
    ]
  }
];

// Quick single-spec shortcuts
const QUICK_SPECS: { key: string; ar: string; en: string; type: SpecFieldInput['valueType']; unit: string | null }[] = [
  { key: 'cpu', ar: 'المعالج', en: 'Processor', type: 'text', unit: null },
  { key: 'ramGB', ar: 'الذاكرة RAM', en: 'RAM Memory', type: 'number', unit: 'GB' },
  { key: 'storageGB', ar: 'سعة التخزين', en: 'Storage', type: 'number', unit: 'GB' },
  { key: 'gpu', ar: 'كرت الشاشة', en: 'Graphics Card', type: 'text', unit: null },
  { key: 'display', ar: 'مواصفات الشاشة', en: 'Display Screen', type: 'text', unit: null },
  { key: 'batteryHealthPct', ar: 'صحة البطارية', en: 'Battery Health', type: 'number', unit: '%' },
  { key: 'wireless', ar: 'اتصال لاسلكي', en: 'Wireless', type: 'boolean', unit: null },
  { key: 'refreshHz', ar: 'التردد', en: 'Refresh Rate', type: 'number', unit: 'Hz' },
  { key: 'powerW', ar: 'القدرة', en: 'Power', type: 'number', unit: 'W' },
  { key: 'weightKg', ar: 'الوزن', en: 'Weight', type: 'number', unit: 'kg' },
  { key: 'warrantyMonths', ar: 'الضمان بالأشهر', en: 'Warranty Months', type: 'number', unit: 'شهر' },
  { key: 'color', ar: 'اللون', en: 'Color', type: 'single', unit: null },
];

const UNIT_PRESETS = ['GB', 'TB', 'W', 'VA', 'Hz', 'MHz', 'inch', '%', 'kg', 'Mbps', 'h', 'شهر'];

// ── Helpers ───────────────────────────────────────────────────────────────────

function cleanKey(raw: string): string {
  return raw
    .trim()
    .replace(/\s+/g, '_')
    .replace(/[^a-zA-Z0-9_-]/g, '')
    .slice(0, 80);
}

function cleanId(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

function suggestSlug(enOrAr: string): string {
  const cleaned = cleanId(enOrAr);
  if (cleaned && /^[a-z0-9]/.test(cleaned)) {
    return cleaned;
  }
  const t = enOrAr.toLowerCase().trim();
  if (/لابتوب|محمول/i.test(t)) return 'laptops';
  if (/مكتبي|كمبيوتر/i.test(t)) return 'desktops';
  if (/شاش/i.test(t)) return 'displays';
  if (/صوت|سماع/i.test(t)) return 'audio';
  if (/هارد|تخزين|قرص/i.test(t)) return 'storage';
  if (/طاقة|بطار/i.test(t)) return 'power';
  if (/شبك|راوتر/i.test(t)) return 'network';
  if (/ملحق|اكسسوار/i.test(t)) return 'accessories';
  if (/مكون|ترقي/i.test(t)) return 'components';
  if (/فحص|تقرير/i.test(t)) return 'inspection';
  return '';
}

function suggestKeyFromArabic(text: string): string {
  const t = text.toLowerCase().trim();
  if (/معالج|بروسيسور/i.test(t)) return 'cpu';
  if (/رام|ذاكرة\s*عشوائية/i.test(t)) return 'ramGB';
  if (/تخزين|سعة\s*التخزين|قرص|هارد/i.test(t)) return 'storageGB';
  if (/كرت\s*شاشة|رسوميات|جرافيك/i.test(t)) return 'gpu';
  if (/مقاس\s*شاشة|حجم\s*الشاشة/i.test(t)) return 'sizeInch';
  if (/تردد|معدل\s*تحديث/i.test(t)) return 'refreshHz';
  if (/دقة/i.test(t)) return 'resolution';
  if (/بطارية|صحة/i.test(t)) return 'batteryHealthPct';
  if (/لوحة|بانل/i.test(t)) return 'panel';
  if (/منفذ|منافذ/i.test(t)) return 'ports';
  if (/طاقة|واط|قدرة/i.test(t)) return 'powerW';
  if (/سرعة/i.test(t)) return 'speedMbps';
  if (/لاسلكي|وايرلس/i.test(t)) return 'wireless';
  if (/نظام/i.test(t)) return 'os';
  if (/وزن/i.test(t)) return 'weightKg';
  if (/لون/i.test(t)) return 'color';
  if (/ضمان/i.test(t)) return 'warrantyMonths';
  return cleanKey(text);
}

// ── Component ─────────────────────────────────────────────────────────────────

export function TypesManager() {
  const { lang, showEnglishFields } = useI18n();
  const ar = lang === 'ar';
  const { user } = useSession();
  const canEdit = can(user.role, 'catalog.edit');
  const client = useQueryClient();
  const say = useCallback((a: string, e: string) => (ar ? a : e), [ar]);

  // Data fetching
  const query = useQuery({
    queryKey: ['commerce-reference'],
    queryFn: () => api<Reference>('/commerce/reference'),
    staleTime: 30_000,
    gcTime: 5 * 60_000,
  });

  const ref = query.data ?? { products: [], categories: [], types: [] };
  const typesList = ref.types ?? [];

  // State
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'in_use' | 'standalone'>('all');
  const [edit, setEdit] = useState<ProductTypeRecord | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(new Set());
  const [, setFieldSearch] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [details, setDetails] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<ProductTypeRecord | null>(null);
  const [presetModalOpen, setPresetModalOpen] = useState(false);
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [previewTab, setPreviewTab] = useState<'table' | 'filters' | 'card'>('table');
  const [linkCategoriesType, setLinkCategoriesType] = useState<ProductTypeRecord | null>(null);
  const [selectedCategorySlugs, setSelectedCategorySlugs] = useState<Set<string>>(new Set());
  const [categoryFilterSearch, setCategoryFilterSearch] = useState('');

  function openCategoryLinker(t: ProductTypeRecord) {
    setLinkCategoriesType(t);
    const assigned = ref.categories.filter(c => c.productTypeId === t.id).map(c => c.slug);
    setSelectedCategorySlugs(new Set(assigned));
    setCategoryFilterSearch('');
    setError('');
    setDetails('');
  }

  async function handleSaveCategoryLinks() {
    if (!linkCategoriesType) return;
    setBusy(true);
    setError('');
    setDetails('');
    try {
      await api('/commerce/types', {
        method: 'POST',
        body: {
          id: linkCategoriesType.id,
          title: linkCategoriesType.title,
          fields: linkCategoriesType.fields,
          categorySlugs: Array.from(selectedCategorySlugs)
        }
      });
      await client.invalidateQueries({ queryKey: ['commerce-reference'] });
      setLinkCategoriesType(null);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.code);
      } else {
        setError('save_failed');
      }
    } finally {
      setBusy(false);
    }
  }

  // Stats
  const totalTypes = typesList.length;
  const totalFields = typesList.reduce((acc, t) => acc + (t.fields?.length || 0), 0);
  const usedTypesCount = useMemo(() => {
    const usedIds = new Set<string>();
    ref.products.forEach(p => { if (p.productTypeId) usedIds.add(p.productTypeId); });
    ref.categories.forEach(c => { if (c.productTypeId) usedIds.add(c.productTypeId); });
    return usedIds.size;
  }, [ref.products, ref.categories]);

  const totalFilterableFields = useMemo(() => {
    return typesList.reduce((acc, t) => acc + (t.fields?.filter(f => f.filterable).length || 0), 0);
  }, [typesList]);

  // Filtered types list
  const filteredTypes = useMemo(() => {
    let result = typesList;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(t =>
        t.title?.ar?.toLowerCase().includes(q) ||
        t.title?.en?.toLowerCase().includes(q) ||
        t.id?.toLowerCase().includes(q) ||
        t.fields?.some(f => f.key.toLowerCase().includes(q) || f.title?.ar?.includes(q) || f.title?.en?.toLowerCase().includes(q))
      );
    }
    if (filterMode === 'in_use') {
      const usedIds = new Set([
        ...ref.products.map(p => p.productTypeId).filter(Boolean),
        ...ref.categories.map(c => c.productTypeId).filter(Boolean)
      ]);
      result = result.filter(t => usedIds.has(t.id));
    } else if (filterMode === 'standalone') {
      const usedIds = new Set([
        ...ref.products.map(p => p.productTypeId).filter(Boolean),
        ...ref.categories.map(c => c.productTypeId).filter(Boolean)
      ]);
      result = result.filter(t => !usedIds.has(t.id));
    }
    return result;
  }, [typesList, searchQuery, filterMode, ref.products, ref.categories]);

  // Start editor
  function startEdit(row?: ProductTypeRecord) {
    if (row) {
      const normalizedFields = (row.fields || []).map((f, i) => ({
        ...f,
        options: Array.isArray(f.options) ? f.options : [],
        required: Boolean(f.required),
        filterable: Boolean(f.filterable),
        card: Boolean(f.card),
        sort: typeof f.sort === 'number' ? f.sort : i
      }));
      setEdit({
        id: row.id,
        title: { ar: row.title?.ar || '', en: row.title?.en || '' },
        fields: normalizedFields,
        revision: row.updatedAt
      });
      setIsAdding(false);
      // Expand first 2 fields by default
      const initialExpanded = new Set<string>();
      if (normalizedFields[0]) initialExpanded.add(normalizedFields[0].key || '0');
      if (normalizedFields[1]) initialExpanded.add(normalizedFields[1].key || '1');
      setExpandedKeys(initialExpanded);
    } else {
      const newId = 'type-' + Math.random().toString(36).substring(2, 7);
      setEdit({
        id: newId,
        title: { ar: '', en: '' },
        fields: []
      });
      setIsAdding(true);
      setExpandedKeys(new Set());
    }
    setError('');
    setDetails('');
    setFieldSearch('');
  }

  // Duplicate type
  function duplicateType(source: ProductTypeRecord) {
    const base = cleanId(source.id) || 'type';
    const cloneId = `${base}-copy-${Math.floor(Math.random() * 1000)}`;
    setEdit({
      id: cloneId,
      title: {
        ar: (source.title?.ar || '') + ' (نسخة)',
        en: (source.title?.en || '') + ' (Copy)'
      },
      fields: JSON.parse(JSON.stringify(source.fields || []))
    });
    setIsAdding(true);
    setExpandedKeys(new Set((source.fields || []).slice(0, 3).map(f => f.key)));
    setError('');
    setDetails('');
  }

  // Apply Industry Preset
  function applyPreset(preset: TemplatePreset) {
    setEdit({
      id: preset.id,
      title: { ar: preset.title.ar, en: preset.title.en },
      fields: JSON.parse(JSON.stringify(preset.fields))
    });
    setIsAdding(true);
    setExpandedKeys(new Set(preset.fields.slice(0, 3).map(f => f.key)));
    setPresetModalOpen(false);
    setError('');
    setDetails('');
  }

  // Save handler
  async function handleSave(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (!edit) return;

    setError('');
    setDetails('');

    // Validation
    const cleanIdVal = cleanId(edit.id);
    const slugPattern = /^[a-z0-9][a-z0-9-]{0,99}$/;
    if (!cleanIdVal || !slugPattern.test(cleanIdVal)) {
      setError('invalid_input');
      setDetails(say('يجب أن يبدأ المعرّف بحرف إنجليزي أو رقم ولا يحتوي إلا على أحرف إنجليزية صغيرة وأرقام وشرطات (مثال: laptops أو custom-type)', 'Template ID must start with a lowercase letter or number and contain only lowercase letters, numbers, and dashes (e.g. laptops or custom-type)'));
      return;
    }

    if (!edit.title?.ar?.trim() || (showEnglishFields && !edit.title?.en?.trim())) {
      setError('invalid_input');
      setDetails(say('يرجى إدخال اسم القالب بالعربية', 'Please provide template title'));
      return;
    }

    // Check duplicate keys
    const fieldKeys = edit.fields.map(f => f.key.trim());
    const uniqueKeys = new Set(fieldKeys);
    if (uniqueKeys.size !== fieldKeys.length) {
      setError('duplicate_spec');
      setDetails(say('يوجد تكرار في المفاتيح البرمجية للمواصفات! يجب أن يكون كل مفتاح فريداً تماماً.', 'Duplicate specification key detected. Each key must be unique.'));
      return;
    }

    // Clean payload
    const payload = {
      id: cleanIdVal,
      title: {
        ar: edit.title.ar.trim(),
        en: edit.title.en?.trim() || edit.title.ar.trim()
      },
      fields: edit.fields.map((f, idx) => ({
        key: cleanKey(f.key || 'spec_' + (idx + 1)),
        title: {
          ar: f.title?.ar?.trim() || f.key,
          en: f.title?.en?.trim() || f.title?.ar?.trim() || f.key
        },
        valueType: f.valueType,
        unit: f.unit ? String(f.unit).trim() : null,
        options: Array.isArray(f.options) ? f.options.map(String).map(s => s.trim()).filter(Boolean) : [],
        required: Boolean(f.required),
        filterable: Boolean(f.filterable),
        card: Boolean(f.card),
        sort: idx
      })),
      ...(edit.revision ? { revision: edit.revision } : {})
    };

    const parsed = TypeEdit.safeParse(payload);
    if (!parsed.success) {
      setError('validation_error');
      setDetails(parsed.error.issues.map(i => i.path.join('.') + ': ' + i.message).join(' · '));
      return;
    }

    setBusy(true);
    try {
      await api('/commerce/types', {
        method: 'POST',
        body: parsed.data
      });
      await client.invalidateQueries({ queryKey: ['commerce-reference'] });
      setEdit(null);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.code);
        if (err.code === 'duplicate_spec') {
          setDetails(say('المفتاح مكرر ضمن المواصفات', 'Duplicate spec key'));
        }
      } else {
        setError('save_failed');
      }
    } finally {
      setBusy(false);
    }
  }

  // Delete handler
  async function handleDelete(target: ProductTypeRecord) {
    setBusy(true);
    setError('');
    setDetails('');
    try {
      await api('/commerce/types/' + encodeURIComponent(target.id), { method: 'DELETE' });
      await client.invalidateQueries({ queryKey: ['commerce-reference'] });
      setDeleteConfirm(null);
      if (edit && edit.id === target.id) {
        setEdit(null);
      }
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.code);
        if (err.code === 'type_in_use') {
          setDetails(say('لا يمكن حذف القالب لأنه مستخدم حالياً من قبل فئات أو منتجات في المتجر.', 'Cannot delete this template because it is assigned to categories or products.'));
        }
      } else {
        setError('delete_failed');
      }
    } finally {
      setBusy(false);
    }
  }

  // Specs array modifiers
  function updateField(index: number, patch: Partial<SpecFieldInput>) {
    if (!edit) return;
    const nextFields = edit.fields.map((old, i) => (i === index ? { ...old, ...patch } : old));
    setEdit({ ...edit, fields: nextFields });
  }

  function moveField(index: number, direction: 'up' | 'down') {
    if (!edit) return;
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= edit.fields.length) return;
    const next = [...edit.fields];
    const [moved] = next.splice(index, 1);
    next.splice(targetIndex, 0, moved);
    // Re-index sort
    const reindexed = next.map((f, i) => ({ ...f, sort: i }));
    setEdit({ ...edit, fields: reindexed });
  }

  function removeField(index: number) {
    if (!edit) return;
    const next = edit.fields.filter((_, i) => i !== index).map((f, i) => ({ ...f, sort: i }));
    setEdit({ ...edit, fields: next });
  }

  function duplicateField(index: number) {
    if (!edit) return;
    const source = edit.fields[index];
    const newField: SpecFieldInput = {
      ...source,
      key: cleanKey(source.key + '_copy'),
      title: {
        ar: (source.title?.ar || '') + ' (نسخة)',
        en: (source.title?.en || '') + ' (Copy)'
      },
      sort: edit.fields.length
    };
    const next = [...edit.fields, newField];
    setEdit({ ...edit, fields: next });
    setExpandedKeys(prev => new Set([...prev, newField.key]));
  }

  function addEmptyField() {
    if (!edit) return;
    const counter = edit.fields.length + 1;
    const key = 'spec_' + counter;
    const newField: SpecFieldInput = {
      key,
      title: { ar: 'مواصفة ' + counter, en: 'Specification ' + counter },
      valueType: 'text',
      unit: null,
      options: [],
      required: false,
      filterable: false,
      card: false,
      sort: edit.fields.length
    };
    setEdit({ ...edit, fields: [...edit.fields, newField] });
    setExpandedKeys(prev => new Set([...prev, key]));
  }

  function addQuickSpec(preset: typeof QUICK_SPECS[0]) {
    if (!edit) return;
    // Check if key already exists, append counter if so
    let finalKey = preset.key;
    if (edit.fields.some(f => f.key === finalKey)) {
      finalKey = cleanKey(preset.key + '_' + (edit.fields.length + 1));
    }
    const newField: SpecFieldInput = {
      key: finalKey,
      title: { ar: preset.ar, en: preset.en },
      valueType: preset.type,
      unit: preset.unit,
      options: preset.type === 'single' ? ['خيار 1', 'خيار 2'] : [],
      required: false,
      filterable: true,
      card: true,
      sort: edit.fields.length
    };
    setEdit({ ...edit, fields: [...edit.fields, newField] });
    setExpandedKeys(prev => new Set([...prev, finalKey]));
  }

  function toggleExpand(key: string) {
    setExpandedKeys(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function expandAll() {
    if (!edit) return;
    setExpandedKeys(new Set(edit.fields.map(f => f.key)));
  }

  function collapseAll() {
    setExpandedKeys(new Set());
  }

  // ── RENDER ─────────────────────────────────────────────────────────────────

  if (query.isPending) {
    return <Loading />;
  }

  return (
    <div className="types-manager-view">
      {/* ── Main List View ────────────────────────────────────────── */}
      {!edit ? (
        <>
          {/* Header */}
          <div className="types-header">
            <div className="types-header-info">
              <h1>
                <SlidersHorizontal size={24} style={{ color: '#6366f1' }} />
                <span>{say('أنواع المنتجات وقوالب المواصفات', 'Product Types & Spec Templates')}</span>
              </h1>
              <p>
                {say(
                  'قوالب المواصفات الفنية الموحدة التي تحدد خصائص المنتجات (مثل المعالج، الرام، الشاشة، البطارية) وتتحكم في فلاتر التصفية وبطاقات العرض.',
                  'Standardized technical specification templates that define product attributes (CPU, RAM, Display, Battery) and power storefront filters and badges.'
                )}
              </p>
            </div>

            <div className="types-header-actions">
              <button
                type="button"
                className="button secondary"
                onClick={() => setPresetModalOpen(true)}
                disabled={!canEdit}
              >
                <Sparkles size={16} style={{ color: '#a855f7' }} />
                <span>{say('قوالب قياسية جاهزة', 'Industry Presets')}</span>
              </button>

              <button
                type="button"
                className="button primary"
                onClick={() => startEdit()}
                disabled={!canEdit}
              >
                <Plus size={16} />
                <span>{say('إنشاء قالب جديد', 'Create Template')}</span>
              </button>
            </div>
          </div>

          <ErrorBox code={error} />
          {details && <p role="alert" className="commerce-error">{details}</p>}

          {/* Stats Grid */}
          <div className="types-stats-grid">
            <div className="types-stat-card">
              <div className="types-stat-icon indigo">
                <SlidersHorizontal size={22} />
              </div>
              <div className="types-stat-content">
                <span className="types-stat-val">{totalTypes}</span>
                <span className="types-stat-label">{say('إجمالي قوالب المواصفات', 'Total Templates')}</span>
              </div>
            </div>

            <div className="types-stat-card">
              <div className="types-stat-icon emerald">
                <BookmarkCheck size={22} />
              </div>
              <div className="types-stat-content">
                <span className="types-stat-val">{usedTypesCount}</span>
                <span className="types-stat-label">{say('قوالب مرتبطة بالكتالوج', 'Active in Catalog')}</span>
              </div>
            </div>

            <div className="types-stat-card">
              <div className="types-stat-icon blue">
                <Tag size={22} />
              </div>
              <div className="types-stat-content">
                <span className="types-stat-val">{totalFields}</span>
                <span className="types-stat-label">{say('إجمالي الخصائص المعرفة', 'Total Specifications')}</span>
              </div>
            </div>

            <div className="types-stat-card">
              <div className="types-stat-icon amber">
                <Filter size={22} />
              </div>
              <div className="types-stat-content">
                <span className="types-stat-val">{totalFilterableFields}</span>
                <span className="types-stat-label">{say('مواصفة مفعّلة كفلاتر للعملاء', 'Storefront Filters')}</span>
              </div>
            </div>
          </div>

          {/* Control Bar */}
          <div className="types-control-bar">
            <div className="types-search-wrapper">
              <Search size={18} className="search-icon" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder={say('بحث باسم القالب، المعرف البرمجي، أو الخاصية الفنية...', 'Search template title, ID, or specification...')}
              />
              {searchQuery && (
                <button
                  type="button"
                  className="clear-search-btn"
                  onClick={() => setSearchQuery('')}
                  aria-label={say('مسح', 'Clear')}
                >
                  <X size={14} />
                </button>
              )}
            </div>

            <div className="types-filter-chips">
              <button
                type="button"
                className={`types-chip-btn ${filterMode === 'all' ? 'active' : ''}`}
                onClick={() => setFilterMode('all')}
              >
                <span>{say('كل القوالب', 'All Templates')}</span>
                <span className="count-pill">{typesList.length}</span>
              </button>

              <button
                type="button"
                className={`types-chip-btn ${filterMode === 'in_use' ? 'active' : ''}`}
                onClick={() => setFilterMode('in_use')}
              >
                <span>{say('المستخدمة حالياً', 'In Use')}</span>
                <span className="count-pill">{usedTypesCount}</span>
              </button>

              <button
                type="button"
                className={`types-chip-btn ${filterMode === 'standalone' ? 'active' : ''}`}
                onClick={() => setFilterMode('standalone')}
              >
                <span>{say('قوالب احتياطية', 'Standalone')}</span>
              </button>
            </div>
          </div>

          {/* Templates Cards Grid */}
          {filteredTypes.length === 0 ? (
            <div className="card" style={{ padding: '48px', textAlign: 'center' }}>
              <SlidersHorizontal size={40} style={{ color: 'var(--muted)', margin: '0 auto 12px', opacity: 0.5 }} />
              <h3 style={{ margin: '0 0 6px', fontSize: '16px' }}>{say('لا توجد قوالب مواصفات مطابقة', 'No templates match your search')}</h3>
              <p className="text-muted" style={{ margin: '0 0 16px', fontSize: '13px' }}>
                {say('يمكنك مسح البحث أو البدء بإنشاء قالب جديد.', 'Clear your search filters or create a new template.')}
              </p>
              {searchQuery && (
                <button type="button" className="button secondary sm" onClick={() => setSearchQuery('')}>
                  {say('مسح البحث', 'Clear Search')}
                </button>
              )}
            </div>
          ) : (
            <div className="types-cards-grid">
              {filteredTypes.map(t => {
                const fieldsList = Array.isArray(t.fields) ? t.fields : [];
                const linkedCats = ref.categories.filter(c => c.productTypeId === t.id);
                const linkedProds = ref.products.filter(p => p.productTypeId === t.id);
                const isUsed = linkedCats.length > 0 || linkedProds.length > 0;

                // Match icon
                let IconComponent = SlidersHorizontal;
                if (t.id.includes('laptop') || t.id.includes('desktop')) IconComponent = Laptop;
                else if (t.id.includes('display') || t.id.includes('screen')) IconComponent = Tv;
                else if (t.id.includes('audio') || t.id.includes('headphone')) IconComponent = Headphones;
                else if (t.id.includes('storage') || t.id.includes('disk')) IconComponent = HardDrive;
                else if (t.id.includes('power') || t.id.includes('battery')) IconComponent = BatteryCharging;
                else if (t.id.includes('network') || t.id.includes('wifi')) IconComponent = Wifi;

                return (
                  <article className="type-card" key={t.id}>
                    <div>
                      <div className="type-card-top">
                        <div className="type-card-icon-title">
                          <div className="type-card-icon">
                            <IconComponent size={22} />
                          </div>
                          <div className="type-card-headings">
                            <h3>{t.title?.[lang] || t.title?.ar || t.id}</h3>
                            {showEnglishFields && t.title?.en && t.title.en !== t.title.ar && (
                              <p className="type-card-sub">{t.title.en}</p>
                            )}
                          </div>
                        </div>

                        <span className="type-card-id-badge" dir="ltr">{t.id}</span>
                      </div>

                      <div className="type-card-tags" style={{ marginTop: '14px' }}>
                        <span className="type-spec-pill count-badge">
                          <Tag size={12} />
                          <span>{fieldsList.length} {say('مواصفة', 'specs')}</span>
                        </span>

                        {isUsed ? (
                          <span className="type-spec-pill in-use-badge">
                            <CheckCircle2 size={12} />
                            <span>
                              {linkedCats.length > 0 ? `${linkedCats.length} ${say('فئات', 'categories')}` : ''}
                              {linkedCats.length > 0 && linkedProds.length > 0 ? ' · ' : ''}
                              {linkedProds.length > 0 ? `${linkedProds.length} ${say('منتجات', 'products')}` : ''}
                            </span>
                          </span>
                        ) : (
                          <span className="type-spec-pill" style={{ opacity: 0.7 }}>
                            <Info size={12} />
                            <span>{say('غير مرتبط بعد', 'Unassigned')}</span>
                          </span>
                        )}
                      </div>

                      {/* Preview of key fields */}
                      {fieldsList.length > 0 && (
                        <div className="type-card-preview-chips" style={{ marginTop: '14px' }}>
                          <span className="type-preview-label">{say('أبرز المواصفات المعرفة:', 'Key Attributes:')}</span>
                          <div className="type-chips-flow">
                            {fieldsList.slice(0, 5).map(f => (
                              <span className="type-field-chip" key={f.key}>
                                <strong>{f.title?.[lang] || f.title?.ar || f.key}</strong>
                                {f.unit && <small style={{ opacity: 0.7 }}>({f.unit})</small>}
                              </span>
                            ))}
                            {fieldsList.length > 5 && (
                              <span className="type-field-chip" style={{ opacity: 0.6 }}>
                                +{fieldsList.length - 5} {say('أخرى', 'more')}
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="type-card-bottom">
                      <div className="type-card-actions">
                        <button
                          type="button"
                          className="button primary sm"
                          onClick={() => startEdit(t)}
                        >
                          <Edit3 size={14} />
                          <span>{say('تعديل القالب', 'Edit Template')}</span>
                        </button>

                        <button
                          type="button"
                          className="button secondary sm"
                          onClick={() => openCategoryLinker(t)}
                          title={say('ربط وتخصيص الفئات التابعة لهذا القالب', 'Link Categories')}
                        >
                          <FolderTree size={14} />
                          <span>{say('ربط الفئات', 'Categories')}</span>
                        </button>

                        <button
                          type="button"
                          className="button secondary sm"
                          onClick={() => duplicateType(t)}
                          title={say('نسخ القالب', 'Duplicate')}
                        >
                          <Copy size={14} />
                        </button>

                        {canEdit && (
                          <button
                            type="button"
                            className="button secondary sm danger-tone"
                            onClick={() => setDeleteConfirm(t)}
                            title={say('حذف', 'Delete')}
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </>
      ) : (
        /* ── Full World-Class Template Editor ─────────────────────── */
        <form className="type-editor-wrapper" onSubmit={handleSave}>
          {/* Top Sticky Bar */}
          <div className="type-editor-topbar">
            <div className="type-editor-meta">
              <button
                type="button"
                className="button secondary sm"
                onClick={() => setEdit(null)}
              >
                <X size={15} />
                <span>{say('العودة للقائمة', 'Back to templates')}</span>
              </button>

              <h2>
                <SlidersHorizontal size={18} style={{ color: '#6366f1' }} />
                <span>{edit.title?.[lang] || edit.title?.ar || say('قالب جديد', 'New Template')}</span>
                <span className="type-badge-pill" dir="ltr">{edit.id}</span>
              </h2>
            </div>

            <div className="type-editor-top-actions">
              <button
                type="button"
                className="button secondary"
                onClick={() => setPreviewModalOpen(true)}
              >
                <Eye size={15} />
                <span>{say('معاينة شكل المواصفات', 'Live Preview')}</span>
              </button>

              <button
                type="submit"
                className="button primary"
                disabled={busy}
              >
                <Check size={16} />
                <span>{busy ? say('جارٍ الحفظ…', 'Saving…') : say('حفظ القالب', 'Save Template')}</span>
              </button>
            </div>
          </div>

          <ErrorBox code={error} />
          {details && <p role="alert" className="commerce-error">{details}</p>}

          {/* Section 1: Template Basic Information */}
          <div className="type-section-card">
            <div className="type-section-header">
              <h3>
                <FileText size={16} style={{ color: '#6366f1' }} />
                <span>{say('بيانات القالب الأساسية', 'Template Identity')}</span>
              </h3>
            </div>

            <div className="type-basic-grid">
              <div className="type-input-group">
                <label>
                  <span>{say('اسم القالب (بالعربية)', 'Template Name (Arabic)')}</span>
                  <span style={{ color: '#ef4444', fontSize: '11px' }}>*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder={say('مثال: حواسيب محمولة وتجهيزات مكتبية', 'e.g. Laptops')}
                  value={edit.title?.ar || ''}
                  onChange={e => {
                    const arVal = e.target.value;
                    const next: ProductTypeRecord = {
                      ...edit,
                      title: {
                        ar: arVal,
                        en: (!showEnglishFields || !edit.title?.en || edit.title.en === edit.title?.ar) ? arVal : edit.title.en
                      }
                    };
                    if (isAdding && (!edit.id || edit.id.startsWith('type-'))) {
                      const suggested = suggestSlug(edit.title?.en || arVal);
                      if (suggested) {
                        next.id = suggested;
                      }
                    }
                    setEdit(next);
                  }}
                />
              </div>

              {showEnglishFields && (
                <div className="type-input-group">
                  <label>
                    <span>{say('اسم القالب (بالإنجليزية)', 'Template Name (English)')}</span>
                    <span style={{ color: '#ef4444', fontSize: '11px' }}>*</span>
                  </label>
                  <input
                    type="text"
                    required
                    dir="ltr"
                    placeholder="e.g. Laptops & Mobile Workstations"
                    value={edit.title?.en || ''}
                    onChange={e => {
                      const enVal = e.target.value;
                      const next: ProductTypeRecord = { ...edit, title: { ...edit.title, en: enVal } };
                      if (isAdding && (!edit.id || edit.id.startsWith('type-'))) {
                        const suggested = suggestSlug(enVal);
                        if (suggested) {
                          next.id = suggested;
                        }
                      }
                      setEdit(next);
                    }}
                  />
                </div>
              )}

              <div className="type-input-group">
                <label>
                  <span>{say('المعرّف التقني (ID / Slug)', 'Technical Identifier (ID)')}</span>
                  <span style={{ color: '#ef4444', fontSize: '11px' }}>*</span>
                </label>
                <input
                  type="text"
                  dir="ltr"
                  required
                  placeholder="e.g. laptops"
                  value={edit.id}
                  disabled={!isAdding}
                  onChange={e => {
                    const raw = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '').replace(/-+/g, '-').slice(0, 80);
                    setEdit({ ...edit, id: raw });
                  }}
                />
                <span className="type-input-hint">
                  {isAdding
                    ? say('أحرف وأرقام إنجليزية وشرطات فقط. لا يمكن تغييره بعد الحفظ.', 'Letters, numbers, and dashes. Cannot be changed after creation.')
                    : say('المعرّف ثابت في قاعدة البيانات لمنع كسر الروابط.', 'Identifier is locked to preserve relations.')}
                </span>
              </div>
            </div>
          </div>

          {/* Section 2: Specifications Builder */}
          <div className="type-section-card">
            <div className="specs-builder-top">
              <div className="type-section-header" style={{ border: 'none', padding: 0 }}>
                <h3>
                  <Layers size={16} style={{ color: '#6366f1' }} />
                  <span>{say('حقول المواصفات الفنية', 'Specification Attributes')}</span>
                  <span className="type-badge-pill">{edit.fields.length} {say('حقول', 'fields')}</span>
                </h3>
              </div>

              <div className="specs-builder-actions">
                {edit.fields.length > 2 && (
                  <>
                    <button
                      type="button"
                      className="button secondary sm"
                      onClick={expandAll}
                    >
                      {say('توسيع الكل', 'Expand all')}
                    </button>
                    <button
                      type="button"
                      className="button secondary sm"
                      onClick={collapseAll}
                    >
                      {say('طي الكل', 'Collapse all')}
                    </button>
                  </>
                )}

                <button
                  type="button"
                  className="button primary sm"
                  onClick={addEmptyField}
                >
                  <Plus size={14} />
                  <span>{say('إضافة مواصفة جديدة', 'Add Specification')}</span>
                </button>
              </div>
            </div>

            {/* Quick Presets Strip */}
            <div className="specs-quick-presets-strip">
              <div className="presets-strip-label">
                <Sparkles size={14} style={{ color: '#a855f7' }} />
                <span>{say('إضافة سريعة لمواصفات شائعة بنقرة واحدة:', 'Quick add standard specifications:')}</span>
              </div>
              <div className="presets-chips-container">
                {QUICK_SPECS.map(p => (
                  <button
                    type="button"
                    className="preset-chip-add"
                    key={p.key}
                    onClick={() => addQuickSpec(p)}
                  >
                    <Plus size={12} />
                    <span>{ar ? p.ar : p.en}</span>
                    <small style={{ opacity: 0.6 }}>({p.type})</small>
                  </button>
                ))}
              </div>
            </div>

            {/* Specs List */}
            {edit.fields.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '36px 20px', border: '1px dashed var(--border)', borderRadius: '14px' }}>
                <Layers size={36} style={{ color: 'var(--muted)', margin: '0 auto 10px', opacity: 0.5 }} />
                <h4 style={{ margin: '0 0 6px', fontSize: '14px' }}>{say('لا توجد مواصفات فنية في هذا القالب بعد', 'No specifications added yet')}</h4>
                <p className="text-muted" style={{ margin: '0 0 16px', fontSize: '12px' }}>
                  {say('اختر من المواصفات الشائعة أعلاه أو أضف مواصفة مخصصة جديدة.', 'Choose from the quick presets above or create a custom spec.')}
                </p>
                <button type="button" className="button primary sm" onClick={addEmptyField}>
                  <Plus size={14} />
                  <span>{say('إضافة مواصفة أولى', 'Add First Specification')}</span>
                </button>
              </div>
            ) : (
              <div className="specs-list-container">
                {edit.fields.map((f, i) => {
                  const isExpanded = expandedKeys.has(f.key);
                  const isFirst = i === 0;
                  const isLast = i === edit.fields.length - 1;

                  return (
                    <div className={`spec-field-item ${isExpanded ? 'is-expanded' : ''}`} key={f.key || i}>
                      {/* Field Header / Summary */}
                      <div
                        className="spec-field-header"
                        onClick={() => toggleExpand(f.key)}
                      >
                        <div className="spec-header-left">
                          {/* Order controls */}
                          <div className="spec-order-controls" onClick={e => e.stopPropagation()}>
                            <button
                              type="button"
                              className="spec-order-btn"
                              disabled={isFirst}
                              title={say('تقديم لأعلى', 'Move Up')}
                              onClick={() => moveField(i, 'up')}
                            >
                              <ArrowUp size={13} />
                            </button>
                            <span className="spec-order-index">#{String(i + 1).padStart(2, '0')}</span>
                            <button
                              type="button"
                              className="spec-order-btn"
                              disabled={isLast}
                              title={say('تأخير لأسفل', 'Move Down')}
                              onClick={() => moveField(i, 'down')}
                            >
                              <ArrowDown size={13} />
                            </button>
                          </div>

                          {/* Titles & Key */}
                          <div className="spec-header-titles">
                            <div className="spec-title-primary">
                              <span>{f.title?.[lang] || f.title?.ar || say('(مواصفة بدون اسم)', '(Untitled Spec)')}</span>
                              <span className="spec-key-code" dir="ltr">{f.key}</span>
                            </div>
                            {showEnglishFields && f.title?.en && f.title?.en !== f.title?.ar && (
                              <span className="spec-title-secondary">
                                {f.title.en}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Badges & Actions */}
                        <div className="spec-header-badges">
                          {/* Value Type */}
                          <span className={`spec-type-tag ${f.valueType}`}>
                            {f.valueType === 'text' && <span>Aa {say('نص', 'Text')}</span>}
                            {f.valueType === 'number' && <span>123 {say('رقم', 'Number')}</span>}
                            {f.valueType === 'boolean' && <span>✓/✗ {say('نعم/لا', 'Boolean')}</span>}
                            {f.valueType === 'single' && <span>▼ {say('خيار فردي', 'Single')}</span>}
                            {f.valueType === 'multi' && <span>☰ {say('متعدد', 'Multi')}</span>}
                          </span>

                          {/* Unit */}
                          {f.unit && (
                            <span className="spec-flag-pill unit" dir="ltr">
                              {f.unit}
                            </span>
                          )}

                          {/* Flags */}
                          {f.required && (
                            <span className="spec-flag-pill required">
                              {say('إلزامي', 'Required')}
                            </span>
                          )}

                          {f.filterable && (
                            <span className="spec-flag-pill filter">
                              {say('فلتر متجر', 'Filter')}
                            </span>
                          )}

                          {f.card && (
                            <span className="spec-flag-pill card-badge">
                              {say('كارت منتج', 'Badge')}
                            </span>
                          )}

                          {/* Actions */}
                          <div className="spec-header-actions" onClick={e => e.stopPropagation()}>
                            <button
                              type="button"
                              className="button secondary sm"
                              style={{ padding: '4px 8px', minHeight: '30px' }}
                              title={say('تكرار المواصفة', 'Duplicate')}
                              onClick={() => duplicateField(i)}
                            >
                              <Copy size={13} />
                            </button>

                            <button
                              type="button"
                              className="button secondary sm danger-tone"
                              style={{ padding: '4px 8px', minHeight: '30px' }}
                              title={say('إزالة المواصفة', 'Remove')}
                              onClick={() => removeField(i)}
                            >
                              <Trash2 size={13} />
                            </button>

                            <button
                              type="button"
                              className="button subtle sm"
                              style={{ padding: '4px 6px', minHeight: '30px' }}
                              aria-label={isExpanded ? say('طي', 'Collapse') : say('توسيع', 'Expand')}
                              onClick={() => toggleExpand(f.key)}
                            >
                              {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Expanded Field Body Form */}
                      {isExpanded && (
                        <div className="spec-field-body">
                          {/* Row 1: Identity */}
                          <div className="spec-row-grid">
                            <div className="type-input-group">
                              <label>
                                <span>{say('اسم المواصفة (العربية)', 'Arabic Label')}</span>
                                <span style={{ color: '#ef4444', fontSize: '11px' }}>*</span>
                              </label>
                              <input
                                type="text"
                                value={f.title?.ar || ''}
                                placeholder={say('مثال: سعة الذاكرة العشوائية', 'e.g. Memory')}
                                onChange={e => {
                                  const arVal = e.target.value;
                                  const enVal = (!showEnglishFields || !f.title?.en || f.title.en === f.title?.ar) ? arVal : f.title.en;
                                  const isAutoOrEmptyKey = !f.key || f.key.startsWith('spec_');
                                  const suggestedKey = suggestKeyFromArabic(arVal);
                                  updateField(i, {
                                    title: { ar: arVal, en: enVal },
                                    ...(isAutoOrEmptyKey && suggestedKey && suggestedKey !== f.key ? { key: suggestedKey } : {})
                                  });
                                }}
                              />
                            </div>

                            {showEnglishFields && (
                              <div className="type-input-group">
                                <label>
                                  <span>{say('اسم المواصفة (الإنجليزية)', 'English Label')}</span>
                                  <span style={{ color: '#ef4444', fontSize: '11px' }}>*</span>
                                </label>
                                <input
                                  type="text"
                                  dir="ltr"
                                  value={f.title?.en || ''}
                                  placeholder="e.g. RAM Memory Size"
                                  onChange={e => updateField(i, { title: { ...f.title, en: e.target.value } })}
                                />
                              </div>
                            )}

                            <div className="type-input-group">
                              <label>
                                <span>{say('المعرّف التقني (Key)', 'Specification Key')}</span>
                                <span style={{ color: '#ef4444', fontSize: '11px' }}>*</span>
                              </label>
                              <input
                                type="text"
                                dir="ltr"
                                value={f.key}
                                placeholder="e.g. ramGB"
                                onChange={e => {
                                  const raw = cleanKey(e.target.value);
                                  updateField(i, { key: raw });
                                }}
                              />
                              <span className="type-input-hint">
                                {say('المفتاح البرمجي الذي يخزن القيمة (حروف و أرقام إنجليزية وشرطات فقط).', 'Key used in JSON specs payload (e.g. ramGB, cpu, display).')}
                              </span>
                            </div>
                          </div>

                          {/* Row 2: Value Type & Unit */}
                          <div className="spec-row-grid">
                            <div className="type-input-group">
                              <label>{say('نوع القيمة', 'Value Type')}</label>
                              <select
                                value={f.valueType}
                                onChange={e => {
                                  const nextType = e.target.value as SpecFieldInput['valueType'];
                                  updateField(i, {
                                    valueType: nextType,
                                    options: (nextType === 'single' || nextType === 'multi') && (!f.options || f.options.length === 0)
                                      ? [say('خيار 1', 'Option 1'), say('خيار 2', 'Option 2')]
                                      : f.options
                                  });
                                }}
                              >
                                <option value="text">{say('نص حر (Text)', 'Free Text')}</option>
                                <option value="number">{say('قيمة عددية (Number)', 'Numeric Value')}</option>
                                <option value="boolean">{say('منطقي نعم / لا (Boolean)', 'Yes / No Switch')}</option>
                                <option value="single">{say('خيار فردي من قائمة (Single Choice)', 'Single Choice Dropdown')}</option>
                                <option value="multi">{say('خيارات متعددة (Multi Select)', 'Multi-select Chips')}</option>
                              </select>
                            </div>

                            <div className="unit-input-wrapper">
                              <div className="type-input-group">
                                <label>{say('وحدة القياس (اختياري)', 'Unit of Measure (Optional)')}</label>
                                <input
                                  type="text"
                                  dir="ltr"
                                  value={f.unit || ''}
                                  placeholder={say('مثال: GB, Hz, W, inch...', 'e.g. GB, Hz, W...')}
                                  onChange={e => updateField(i, { unit: e.target.value || null })}
                                />
                              </div>

                              {/* Unit suggestions */}
                              <div className="unit-presets-chips">
                                {UNIT_PRESETS.map(u => (
                                  <button
                                    type="button"
                                    key={u}
                                    className={`unit-chip-btn ${f.unit === u ? 'active' : ''}`}
                                    onClick={() => updateField(i, { unit: f.unit === u ? null : u })}
                                  >
                                    {u}
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>

                          {/* Row 3: Options manager (if single or multi) */}
                          {(f.valueType === 'single' || f.valueType === 'multi') && (
                            <div className="options-builder-box">
                              <div className="options-builder-header">
                                <h4>
                                  {say('قائمة الخيارات المتاحة للمواصفة', 'Available Dropdown Options')}
                                  <span style={{ fontWeight: 500, fontSize: '11px', color: 'var(--muted)', marginInlineStart: '6px' }}>
                                    ({f.options?.length || 0} {say('خيارات', 'options')})
                                  </span>
                                </h4>
                              </div>

                              <div className="options-tags-area">
                                {(f.options || []).map((opt, optIndex) => (
                                  <div className="option-tag-item" key={optIndex}>
                                    <span>{opt}</span>
                                    <button
                                      type="button"
                                      className="option-tag-remove"
                                      title={say('حذف الخيار', 'Remove')}
                                      onClick={() => {
                                        const nextOpts = f.options.filter((_, idx) => idx !== optIndex);
                                        updateField(i, { options: nextOpts });
                                      }}
                                    >
                                      <X size={12} />
                                    </button>
                                  </div>
                                ))}

                                {(!f.options || f.options.length === 0) && (
                                  <span style={{ fontSize: '11.5px', color: 'var(--muted)' }}>
                                    {say('لم تتم إضافة أي خيارات بعد. أضف الخيارات أدناه:', 'No options added yet. Add choices below:')}
                                  </span>
                                )}
                              </div>

                              {/* Add option row */}
                              <div className="option-add-row">
                                <input
                                  type="text"
                                  placeholder={say('أدخل خياراً جديداً واضغط إضافة...', 'Enter option and click add...')}
                                  id={`new-opt-input-${i}`}
                                  onKeyDown={e => {
                                    if (e.key === 'Enter') {
                                      e.preventDefault();
                                      const input = e.currentTarget;
                                      const val = input.value.trim();
                                      if (val) {
                                        updateField(i, { options: [...(f.options || []), val] });
                                        input.value = '';
                                      }
                                    }
                                  }}
                                />
                                <button
                                  type="button"
                                  className="button secondary sm"
                                  onClick={() => {
                                    const input = document.getElementById(`new-opt-input-${i}`) as HTMLInputElement;
                                    if (input && input.value.trim()) {
                                      updateField(i, { options: [...(f.options || []), input.value.trim()] });
                                      input.value = '';
                                    }
                                  }}
                                >
                                  <Plus size={14} />
                                  <span>{say('إضافة خيار', 'Add Option')}</span>
                                </button>
                              </div>
                            </div>
                          )}

                          {/* Row 4: Behavior Switches */}
                          <div className="spec-switches-grid">
                            {/* Required */}
                            <div
                              className={`spec-toggle-card ${f.required ? 'checked' : ''}`}
                              onClick={() => updateField(i, { required: !f.required })}
                            >
                              <div className="spec-toggle-indicator">
                                {f.required && <Check size={12} />}
                              </div>
                              <div className="spec-toggle-info">
                                <span className="spec-toggle-title">
                                  {say('حقل إلزامي', 'Required Field')}
                                </span>
                                <span className="spec-toggle-desc">
                                  {say('يلزم ملؤه عند إضافة أو تعديل منتج يتبع هذا القالب.', 'Mandatory when adding/editing products with this template.')}
                                </span>
                              </div>
                            </div>

                            {/* Filterable */}
                            <div
                              className={`spec-toggle-card ${f.filterable ? 'checked' : ''}`}
                              onClick={() => updateField(i, { filterable: !f.filterable })}
                            >
                              <div className="spec-toggle-indicator">
                                {f.filterable && <Check size={12} />}
                              </div>
                              <div className="spec-toggle-info">
                                <span className="spec-toggle-title">
                                  {say('استخدام كفلتر بالمتجر', 'Storefront Filter')}
                                </span>
                                <span className="spec-toggle-desc">
                                  {say('يظهر في شريط تصفية المنتجات في صفحات الفئات للعملاء.', 'Appears in faceted filter sidebar on category pages.')}
                                </span>
                              </div>
                            </div>

                            {/* Card badge */}
                            <div
                              className={`spec-toggle-card ${f.card ? 'checked' : ''}`}
                              onClick={() => updateField(i, { card: !f.card })}
                            >
                              <div className="spec-toggle-indicator">
                                {f.card && <Check size={12} />}
                              </div>
                              <div className="spec-toggle-info">
                                <span className="spec-toggle-title">
                                  {say('إبراز في بطاقة المنتج', 'Highlight on Card')}
                                </span>
                                <span className="spec-toggle-desc">
                                  {say('يظهر كشريط مميز في بطاقة العرض السريعة للمنتج.', 'Highlighted badge on the product display card.')}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </form>
      )}

      {/* ── Industry Presets Modal ─────────────────────────────────── */}
      {presetModalOpen && (
        <Modal
          open={presetModalOpen}
          onOpenChange={setPresetModalOpen}
          title={say('مكتبة القوالب القياسية الجاهزة', 'Industry Standard Templates Library')}
          description={say(
            'اختر قالباً جاهزاً ومعداً مسبقاً بأفضل الممارسات لتطبيقه مباشرة بنقرة واحدة.',
            'Select a preconfigured industry template with best-practice specifications.'
          )}
        >
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '12px', marginTop: '16px' }}>
            {INDUSTRY_PRESETS.map(preset => {
              const IconComp = preset.icon;
              return (
                <div
                  key={preset.id}
                  className="card"
                  style={{
                    padding: '16px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                  onClick={() => applyPreset(preset)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div className="type-card-icon" style={{ width: 40, height: 40 }}>
                      <IconComp size={20} />
                    </div>
                    <div>
                      <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 800 }}>{preset.title[lang]}</h4>
                      <small style={{ color: 'var(--muted)', fontFamily: 'monospace' }}>[{preset.id}]</small>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                    {preset.fields.slice(0, 4).map(f => (
                      <span key={f.key} className="meta-pill" style={{ fontSize: '10px' }}>
                        {f.title[lang] || f.key}
                      </span>
                    ))}
                    {preset.fields.length > 4 && (
                      <span className="meta-pill" style={{ fontSize: '10px', opacity: 0.7 }}>
                        +{preset.fields.length - 4}
                      </span>
                    )}
                  </div>

                  <button
                    type="button"
                    className="button primary sm"
                    style={{ marginTop: 'auto' }}
                    onClick={() => applyPreset(preset)}
                  >
                    <Plus size={14} />
                    <span>{say('استخدام هذا القالب', 'Use this Template')}</span>
                  </button>
                </div>
              );
            })}
          </div>
        </Modal>
      )}

      {/* ── Live Preview Modal ─────────────────────────────────────── */}
      {previewModalOpen && edit && (
        <Modal
          open={previewModalOpen}
          onOpenChange={setPreviewModalOpen}
          title={say('معاينة حية: كيف ستظهر المواصفات للعملاء', 'Live Preview: Storefront Specification Display')}
          description={say(
            'محاكاة تفاعلية لطريقة عرض هذه المواصفات في صفحة تفاصيل المنتج، شريط الفلاتر، وبطاقة العرض.',
            'Interactive preview of how these specifications render on the product page and filter sidebar.'
          )}
        >
          <div className="preview-modal-body">
            <div className="preview-tabs-nav">
              <button
                type="button"
                className={`preview-tab-btn ${previewTab === 'table' ? 'active' : ''}`}
                onClick={() => setPreviewTab('table')}
              >
                {say('جدول المواصفات (صفحة المنتج)', 'Specs Table (Product Page)')}
              </button>
              <button
                type="button"
                className={`preview-tab-btn ${previewTab === 'filters' ? 'active' : ''}`}
                onClick={() => setPreviewTab('filters')}
              >
                {say('شريط الفلاتر للعملاء', 'Storefront Filter Sidebar')}
              </button>
              <button
                type="button"
                className={`preview-tab-btn ${previewTab === 'card' ? 'active' : ''}`}
                onClick={() => setPreviewTab('card')}
              >
                {say('بادجات بطاقة المنتج السريعة', 'Product Card Badges')}
              </button>
            </div>

            {previewTab === 'table' && (
              <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <table className="storefront-specs-table">
                  <tbody>
                    {edit.fields.map(f => (
                      <tr key={f.key}>
                        <td className="spec-name">{f.title?.[lang] || f.title?.ar || f.key}</td>
                        <td className="spec-val">
                          {f.valueType === 'boolean'
                            ? say('نعم / مدعوم ✓', 'Supported ✓')
                            : f.valueType === 'number'
                            ? `16 ${f.unit || ''}`
                            : f.options && f.options.length > 0
                            ? f.options[0]
                            : say('قيمة تجريبية للمواصفة', 'Sample value')}
                          {f.required && (
                            <span style={{ marginInlineStart: '8px', color: '#ef4444', fontSize: '11px', fontWeight: 700 }}>
                              *
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {previewTab === 'filters' && (
              <div className="preview-filter-sidebar">
                <span style={{ fontSize: '13px', fontWeight: 800, borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>
                  {say('تصفية النتائج', 'Filter Products')}
                </span>
                {edit.fields.filter(f => f.filterable).map(f => (
                  <div className="filter-group-mock" key={f.key}>
                    <strong>{f.title?.[lang] || f.title?.ar}</strong>
                    {f.valueType === 'boolean' ? (
                      <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}>
                        <input type="checkbox" defaultChecked />
                        <span>{f.title?.[lang] || f.title?.ar}</span>
                      </label>
                    ) : f.options && f.options.length > 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        {f.options.slice(0, 3).map((opt, oi) => (
                          <label key={oi} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}>
                            <input type="checkbox" defaultChecked={oi === 0} />
                            <span>{opt}</span>
                          </label>
                        ))}
                      </div>
                    ) : (
                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                        <input type="text" placeholder={say('من...', 'From...')} style={{ height: 30, fontSize: 11, width: 70, padding: '0 6px', borderRadius: 6, border: '1px solid var(--border)' }} />
                        <span>-</span>
                        <input type="text" placeholder={say('إلى...', 'To...')} style={{ height: 30, fontSize: 11, width: 70, padding: '0 6px', borderRadius: 6, border: '1px solid var(--border)' }} />
                        {f.unit && <small style={{ color: 'var(--muted)' }}>{f.unit}</small>}
                      </div>
                    )}
                  </div>
                ))}
                {edit.fields.filter(f => f.filterable).length === 0 && (
                  <p style={{ margin: 0, fontSize: '12px', color: 'var(--muted)' }}>
                    {say('لا توجد مواصفات مفعلة كفلاتر بعد. قم بتفعيل "استخدام كفلتر" في المواصفات.', 'No filterable specifications enabled yet.')}
                  </p>
                )}
              </div>
            )}

            {previewTab === 'card' && (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '20px 0' }}>
                <div className="card" style={{ width: 280, padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div style={{ height: 140, background: 'var(--surface-soft)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Laptop size={48} style={{ opacity: 0.3 }} />
                  </div>
                  <div>
                    <strong style={{ fontSize: 14 }}>{say('كمبيوتر محمول تجريبي Pro', 'Sample Laptop Pro')}</strong>
                    <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--muted)' }}>$1,299 USD</p>
                  </div>
                  <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                    {edit.fields.filter(f => f.card).map(f => (
                      <span key={f.key} className="meta-pill" style={{ background: 'rgba(99, 102, 241, 0.1)', color: '#6366f1', fontSize: '10.5px' }}>
                        {f.title?.[lang] || f.title?.ar}: {f.unit ? `16 ${f.unit}` : 'نعم'}
                      </span>
                    ))}
                    {edit.fields.filter(f => f.card).length === 0 && (
                      <span style={{ fontSize: '11px', color: 'var(--muted)' }}>
                        {say('فعّل خيار "إبراز في بطاقة المنتج" لإظهار بادجات هنا.', 'Enable "Highlight on Card" to see badges here.')}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* ── Assign Categories Modal ───────────────────────────────── */}
      {linkCategoriesType && (
        <Modal
          open={Boolean(linkCategoriesType)}
          onOpenChange={open => !open && setLinkCategoriesType(null)}
          title={say('ربط وتخصيص الفئات بقالب المواصفات', 'Assign Categories to Spec Template')}
          description={say(
            `حدد الفئات في المتجر التي ستعتمد قالب "${linkCategoriesType.title?.[lang] || linkCategoriesType.title?.ar || linkCategoriesType.id}" لمواصفاتها الفنية وفلاترها.`,
            `Select which store categories inherit this specification template.`
          )}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '14px' }}>
            {/* Search and batch actions */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap' }}>
              <div style={{ position: 'relative', flex: '1 1 200px' }}>
                <Search size={16} style={{ position: 'absolute', insetInlineStart: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }} />
                <input
                  type="text"
                  placeholder={say('بحث في الفئات…', 'Filter categories…')}
                  value={categoryFilterSearch}
                  onChange={e => setCategoryFilterSearch(e.target.value)}
                  style={{ paddingInlineStart: '34px', height: '34px', fontSize: '13px', width: '100%' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '6px' }}>
                <button
                  type="button"
                  className="button secondary sm"
                  style={{ fontSize: '12px', padding: '4px 8px' }}
                  onClick={() => {
                    const allSlugs = ref.categories.map(c => c.slug);
                    setSelectedCategorySlugs(new Set(allSlugs));
                  }}
                >
                  {say('تحديد الكل', 'Select All')}
                </button>
                <button
                  type="button"
                  className="button secondary sm"
                  style={{ fontSize: '12px', padding: '4px 8px' }}
                  onClick={() => setSelectedCategorySlugs(new Set())}
                >
                  {say('إلغاء التحديد', 'Clear')}
                </button>
              </div>
            </div>

            {/* Categories List */}
            <div style={{ maxHeight: '360px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px', border: '1px solid var(--border)', borderRadius: '10px', padding: '10px' }}>
              {ref.categories
                .filter(c => {
                  if (!categoryFilterSearch.trim()) return true;
                  const q = categoryFilterSearch.toLowerCase().trim();
                  const catTitle = typeof c.title === 'object' && c.title !== null ? String((c.title as any)[lang] || (c.title as any).ar || '') : String(c.title || '');
                  return c.slug.toLowerCase().includes(q) || catTitle.toLowerCase().includes(q);
                })
                .map(c => {
                  const isChecked = selectedCategorySlugs.has(c.slug);
                  const otherType = c.productTypeId && c.productTypeId !== linkCategoriesType.id ? ref.types.find(t => t.id === c.productTypeId) : null;
                  const catTitle = typeof c.title === 'object' && c.title !== null ? String((c.title as any)[lang] || (c.title as any).ar || c.slug) : String(c.title || c.slug);

                  return (
                    <label
                      key={c.slug}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '12px',
                        padding: '8px 12px',
                        borderRadius: '8px',
                        background: isChecked ? 'rgba(99, 102, 241, 0.08)' : 'var(--surface-soft)',
                        border: isChecked ? '1px solid rgba(99, 102, 241, 0.3)' : '1px solid transparent',
                        cursor: 'pointer',
                        transition: 'all 0.12s ease'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={e => {
                            const next = new Set(selectedCategorySlugs);
                            if (e.target.checked) next.add(c.slug);
                            else next.delete(c.slug);
                            setSelectedCategorySlugs(next);
                          }}
                        />
                        <div>
                          <strong style={{ fontSize: '13px' }}>{catTitle}</strong>
                          <small style={{ display: 'block', color: 'var(--muted)', fontFamily: 'monospace', fontSize: '11px' }}>
                            slug: {c.slug}
                          </small>
                        </div>
                      </div>

                      <div>
                        {otherType ? (
                          <span className="spec-badge-pill" style={{ fontSize: '11px', background: 'rgba(245, 158, 11, 0.1)', color: '#d97706' }}>
                            {say('مرتبطة بـ:', 'Linked to:')} {otherType.title?.[lang] || otherType.title?.ar}
                          </span>
                        ) : isChecked ? (
                          <span className="spec-badge-pill" style={{ fontSize: '11px', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>
                            <Check size={11} />
                            <span>{say('مرتبطة بهذا القالب', 'Assigned')}</span>
                          </span>
                        ) : (
                          <span style={{ fontSize: '11px', color: 'var(--muted)' }}>
                            {say('غير مرتبطة', 'Unassigned')}
                          </span>
                        )}
                      </div>
                    </label>
                  );
                })}
            </div>

            {/* Footer Buttons */}
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '10px' }}>
              <button
                type="button"
                className="button secondary"
                onClick={() => setLinkCategoriesType(null)}
                disabled={busy}
              >
                {say('إلغاء', 'Cancel')}
              </button>

              <button
                type="button"
                className="button primary"
                disabled={busy}
                onClick={handleSaveCategoryLinks}
              >
                <Check size={15} />
                <span>{busy ? say('جارٍ الحفظ…', 'Saving…') : say('حفظ وتطبيق الربط', 'Save & Apply')}</span>
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Confirm Delete Modal ───────────────────────────────────── */}
      {deleteConfirm && (
        <Modal
          open={Boolean(deleteConfirm)}
          onOpenChange={open => !open && setDeleteConfirm(null)}
          title={say('تأكيد حذف قالب المواصفات', 'Confirm Template Deletion')}
          description={say(
            'هل أنت متأكد من رغبتك في حذف هذا القالب؟ لا يمكن التراجع عن هذه العملية.',
            'Are you sure you want to delete this template permanently?'
          )}
        >
          <div style={{ display: 'flex', gap: '14px', alignItems: 'center', margin: '16px 0 20px' }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(239, 68, 68, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444', flexShrink: 0 }}>
              <ShieldAlert size={24} />
            </div>
            <div>
              <p style={{ margin: 0, fontWeight: 700, fontSize: '14px' }}>
                {deleteConfirm.title?.[lang] || deleteConfirm.title?.ar || deleteConfirm.id}
              </p>
              <small style={{ color: 'var(--muted)', fontFamily: 'monospace' }}>ID: {deleteConfirm.id}</small>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
            <button
              type="button"
              className="button secondary"
              onClick={() => setDeleteConfirm(null)}
              disabled={busy}
            >
              {say('إلغاء', 'Cancel')}
            </button>

            <button
              type="button"
              className="button danger"
              disabled={busy}
              onClick={() => handleDelete(deleteConfirm)}
            >
              {busy ? say('جارٍ الحذف…', 'Deleting…') : say('تأكيد الحذف', 'Delete Template')}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
export default TypesManager;
