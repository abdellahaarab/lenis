/**
 * LaptopFilterEngine
 * Specialized intelligence for laptop attributes extraction, hierarchy sorting,
 * and disjunctive multi-faceted catalog filtering.
 *
 * Adapted and enhanced from shop's LaptopFilterService.
 */

export interface LaptopSpecs {
  cpu?: string;
  cpuGen?: number;
  cpuBrand?: string;
  cpuFamily?: string;
  ramGB?: number;
  ramType?: string;
  ramUpgradable?: boolean;
  storageGB?: number;
  storageType?: string;
  screenSize?: number;
  resolution?: string;
  touch?: boolean;
  refreshHz?: number;
  panel?: string;
  gpu?: string;
  gpuType?: 'integrated' | 'dedicated';
  gpuFamily?: string;
  gpuVramGB?: number;
  batteryHealthPct?: number | null;
  os?: string;
  weightKg?: number;
  [key: string]: unknown;
}

export interface LaptopFilterParams {
  q?: string;
  brand?: string[];
  cpuFamily?: string[];
  cpuBrand?: string[];
  cpuGen?: number[];
  ramGB?: number[];
  storageGB?: number[];
  gpuType?: ('integrated' | 'dedicated')[];
  gpuFamily?: string[];
  screenSize?: number[];
  touch?: boolean;
  condition?: string[];
  minPrice?: number;
  maxPrice?: number;
  availableOnly?: boolean;
  sort?: 'newest' | 'price_asc' | 'price_desc' | 'name' | 'performance' | 'ram' | 'battery';
}

export interface LaptopFacetOption<T = string | number> {
  value: T;
  count: number;
  title: { ar: string; en: string };
  disabled?: boolean;
}

export interface LaptopFacets {
  brands: LaptopFacetOption<string>[];
  cpuFamilies: LaptopFacetOption<string>[];
  cpuBrands: LaptopFacetOption<string>[];
  cpuGens: LaptopFacetOption<number>[];
  ramOptions: LaptopFacetOption<number>[];
  storageOptions: LaptopFacetOption<number>[];
  gpuTypes: LaptopFacetOption<'integrated' | 'dedicated'>[];
  screenSizes: LaptopFacetOption<number>[];
  touchOptions: LaptopFacetOption<string>[];
  conditions: LaptopFacetOption<string>[];
  priceBounds: { min: number; max: number };
}

/**
 * Normalizes raw processor string into standardized family.
 * e.g. "Intel Core i7-11850H" -> "Core i7"
 *      "AMD Ryzen 7 5800H" -> "Ryzen 7"
 *      "Intel Core Ultra 7 155H" -> "Core Ultra 7"
 */
export function extractProcessorFamily(rawCpu?: string | null): string {
  if (!rawCpu || typeof rawCpu !== 'string') return 'Other';
  const cpu = rawCpu.trim().toLowerCase();

  // Intel Ultra series
  if (/\bultra\s*9\b/i.test(cpu)) return 'Core Ultra 9';
  if (/\bultra\s*7\b/i.test(cpu)) return 'Core Ultra 7';
  if (/\bultra\s*5\b/i.test(cpu)) return 'Core Ultra 5';

  // Intel Core i-series
  if (/\bi9\b|\bcore\s*i9\b/i.test(cpu)) return 'Core i9';
  if (/\bi7\b|\bcore\s*i7\b/i.test(cpu)) return 'Core i7';
  if (/\bi5\b|\bcore\s*i5\b/i.test(cpu)) return 'Core i5';
  if (/\bi3\b|\bcore\s*i3\b/i.test(cpu)) return 'Core i3';

  // AMD Ryzen series
  if (/\bryzen\s*9\b/i.test(cpu)) return 'Ryzen 9';
  if (/\bryzen\s*7\b/i.test(cpu)) return 'Ryzen 7';
  if (/\bryzen\s*5\b/i.test(cpu)) return 'Ryzen 5';
  if (/\bryzen\s*3\b/i.test(cpu)) return 'Ryzen 3';

  // Apple Silicon
  if (/\bm4\b/i.test(cpu)) return 'Apple M4';
  if (/\bm3\b/i.test(cpu)) return 'Apple M3';
  if (/\bm2\b/i.test(cpu)) return 'Apple M2';
  if (/\bm1\b/i.test(cpu)) return 'Apple M1';

  // Intel Server / Budget
  if (cpu.includes('xeon')) return 'Xeon';
  if (cpu.includes('celeron')) return 'Celeron';
  if (cpu.includes('pentium')) return 'Pentium';
  if (cpu.includes('snapdragon')) return 'Snapdragon';

  return 'Other';
}

/**
 * Extracts processor brand (Intel, AMD, Apple, Qualcomm).
 */
export function extractProcessorBrand(rawCpu?: string | null): string {
  if (!rawCpu || typeof rawCpu !== 'string') return 'Unknown';
  const cpu = rawCpu.toLowerCase();
  if (cpu.includes('intel') || /\bi[3579]\b|core|celeron|pentium|xeon|ultra/i.test(cpu)) return 'Intel';
  if (cpu.includes('amd') || cpu.includes('ryzen')) return 'AMD';
  if (cpu.includes('apple') || /\bm[1234]\b/i.test(cpu)) return 'Apple';
  if (cpu.includes('snapdragon') || cpu.includes('qualcomm')) return 'Qualcomm';
  return 'Other';
}

/**
 * Extracts CPU generation number.
 * e.g. "Intel Core i7-10610U" -> 10
 *      "Intel Core i5-8265U" -> 8
 *      "Intel Core i7-13700H" -> 13
 */
export function extractCpuGen(rawCpu?: string | null, explicitGen?: number | null): number | null {
  if (typeof explicitGen === 'number' && explicitGen > 0) return explicitGen;
  if (!rawCpu || typeof rawCpu !== 'string') return null;

  // Intel format: i7-11850H (11), i5-8265U (8), i5-1235U (12), i7-13700H (13).
  // Most 8th/9th gen models have four digits; newer 11th-14th gen U/P models
  // can also have four digits, so recognize their two-digit prefixes.
  const intelMatch = rawCpu.match(/\bi[3579]-(\d{4,5})/i);
  if (intelMatch) {
    const model = intelMatch[1];
    const twoDigitGeneration = model.length === 5 || /^(?:11|12|13|14)/.test(model);
    return parseInt(twoDigitGeneration ? model.slice(0, 2) : model.slice(0, 1), 10);
  }

  // AMD format: Ryzen 7 5800H -> 5, 7840HS -> 7
  const amdMatch = rawCpu.match(/ryzen\s*[3579]\s*(\d)\d{3}/i);
  if (amdMatch) {
    return parseInt(amdMatch[1], 10);
  }

  return null;
}

/**
 * Analyzes GPU string to classify into Integrated vs Dedicated,
 * family, and VRAM memory.
 */
export function extractGraphicsInfo(rawGpu?: string | null, explicitVram?: number | null): {
  isDedicated: boolean;
  type: 'integrated' | 'dedicated';
  family: string;
  vramGB: number;
} {
  if (!rawGpu || typeof rawGpu !== 'string') {
    return { isDedicated: false, type: 'integrated', family: 'Integrated', vramGB: 0 };
  }

  const gpu = rawGpu.trim();
  const lower = gpu.toLowerCase();

  const isDedicated =
    /\brtx\b|\bgtx\b|\bgeforce\b|\bradeon rx\b|\bquadro\b|\brtx a\d+/i.test(lower) ||
    (typeof explicitVram === 'number' && explicitVram > 0);

  // Extract VRAM
  let vramGB = explicitVram ?? 0;
  if (!vramGB) {
    const vramMatch = gpu.match(/(\d+)\s*GB\b/i);
    if (vramMatch) {
      vramGB = parseInt(vramMatch[1], 10);
    }
  }

  // Determine Family
  let family = 'Other';
  if (/rtx\s*40\d0/i.test(lower)) family = 'NVIDIA RTX 40-Series';
  else if (/rtx\s*30\d0/i.test(lower)) family = 'NVIDIA RTX 30-Series';
  else if (/rtx\s*20\d0/i.test(lower)) family = 'NVIDIA RTX 20-Series';
  else if (/rtx\s*a\d+/i.test(lower) || /quadro/i.test(lower)) family = 'NVIDIA RTX Pro / Workstation';
  else if (/gtx\b/i.test(lower)) family = 'NVIDIA GTX';
  else if (/geforce/i.test(lower)) family = 'NVIDIA GeForce';
  else if (/iris\s*xe/i.test(lower)) family = 'Intel Iris Xe';
  else if (/uhd|hd graphics/i.test(lower)) family = 'Intel UHD Graphics';
  else if (/arc/i.test(lower)) family = 'Intel Arc';
  else if (/radeon rx/i.test(lower)) family = 'AMD Radeon RX';
  else if (/radeon/i.test(lower)) family = 'AMD Radeon Graphics';
  else if (/apple/i.test(lower)) family = 'Apple GPU';

  return {
    isDedicated,
    type: isDedicated ? 'dedicated' : 'integrated',
    family,
    vramGB
  };
}

/**
 * Custom RAM Hierarchy Sorting (e.g. 4, 8, 16, 24, 32, 64, 128).
 */
export function sortRamOptions(rams: number[]): number[] {
  const priority = [4, 8, 12, 16, 24, 32, 40, 64, 128];
  return [...new Set(rams)].sort((a, b) => {
    const idxA = priority.indexOf(a);
    const idxB = priority.indexOf(b);
    if (idxA !== -1 && idxB !== -1) return idxA - idxB;
    if (idxA !== -1) return -1;
    if (idxB !== -1) return 1;
    return a - b;
  });
}

/**
 * Custom Storage Hierarchy Sorting (e.g. 128, 256, 512, 1000/1024, 2000/2048, 4000/4096).
 */
export function sortStorageOptions(storages: number[]): number[] {
  const priority = [128, 256, 512, 1000, 1024, 1536, 2000, 2048, 4000, 4096];
  return [...new Set(storages)].sort((a, b) => {
    const idxA = priority.indexOf(a);
    const idxB = priority.indexOf(b);
    if (idxA !== -1 && idxB !== -1) return idxA - idxB;
    if (idxA !== -1) return -1;
    if (idxB !== -1) return 1;
    return a - b;
  });
}

/**
 * Screen size sorting (Descending: 17.3", 16", 15.6", 14", 13.3"...).
 */
export function sortScreenSizes(sizes: number[]): number[] {
  return [...new Set(sizes)].sort((a, b) => b - a);
}

/**
 * Processor family priority sorting.
 */
export function sortProcessorFamilies(families: string[]): string[] {
  const priority = [
    'Core Ultra 9',
    'Core Ultra 7',
    'Core Ultra 5',
    'Core i9',
    'Core i7',
    'Core i5',
    'Core i3',
    'Ryzen 9',
    'Ryzen 7',
    'Ryzen 5',
    'Ryzen 3',
    'Apple M4',
    'Apple M3',
    'Apple M2',
    'Apple M1',
    'Xeon',
    'Celeron',
    'Pentium',
    'Snapdragon',
    'Other'
  ];
  return [...new Set(families)].sort((a, b) => {
    const idxA = priority.indexOf(a);
    const idxB = priority.indexOf(b);
    if (idxA !== -1 && idxB !== -1) return idxA - idxB;
    if (idxA !== -1) return -1;
    if (idxB !== -1) return 1;
    return a.localeCompare(b);
  });
}

/**
 * Brand priority sorting (Lenovo, HP, Dell, Asus, Apple, Acer, MSI...).
 */
export function sortBrands(brands: string[]): string[] {
  const priority = ['Lenovo', 'HP', 'Dell', 'Asus', 'Apple', 'Acer', 'MSI', 'Samsung', 'Microsoft', 'Toshiba', 'Huawei'];
  return [...new Set(brands)].sort((a, b) => {
    const idxA = priority.indexOf(a);
    const idxB = priority.indexOf(b);
    if (idxA !== -1 && idxB !== -1) return idxA - idxB;
    if (idxA !== -1) return -1;
    if (idxB !== -1) return 1;
    return a.localeCompare(b);
  });
}

/**
 * Localized human labels for storage.
 */
export function formatStorageTitle(gb: number, _lang: 'ar' | 'en' = 'ar'): { ar: string; en: string } {
  if (gb >= 1000) {
    const tb = Math.round(gb / 1000);
    return {
      ar: `${tb} تيرابايت SSD`,
      en: `${tb} TB SSD`
    };
  }
  return {
    ar: `${gb} جيجابايت SSD`,
    en: `${gb} GB SSD`
  };
}

/**
 * Localized human labels for RAM.
 */
export function formatRamTitle(gb: number): { ar: string; en: string } {
  return {
    ar: `${gb} جيجابايت RAM`,
    en: `${gb} GB RAM`
  };
}

/**
 * Localized human labels for Screen Size.
 */
export function formatScreenSizeTitle(size: number): { ar: string; en: string } {
  return {
    ar: `${size} بوصة`,
    en: `${size}"`
  };
}

/**
 * Localized human labels for CPU Generation.
 */
export function formatCpuGenTitle(gen: number): { ar: string; en: string } {
  return {
    ar: `الجيل ${gen}`,
    en: `${gen}th Gen`
  };
}

/**
 * Localized human labels for GPU Types.
 */
export function formatGpuTypeTitle(type: 'integrated' | 'dedicated'): { ar: string; en: string } {
  if (type === 'dedicated') {
    return { ar: 'كرت منفصل (ألعاب/مونتاج)', en: 'Dedicated GPU (Gaming/Design)' };
  }
  return { ar: 'كرت مدمج (مكتبي/دراسة)', en: 'Integrated Graphics (Office/Study)' };
}

/**
 * Normalized representation of a laptop product for the filtering engine.
 */
export interface NormalizedLaptopItem {
  id: string;
  brand: string;
  condition: string;
  priceUsd: number | null;
  available: boolean;
  specs: LaptopSpecs;
  raw: unknown;
}

/**
 * Tests if a laptop item matches a set of filter parameters,
 * with optional exclusion of one dimension for disjunctive facet counting.
 */
export function laptopMatchesFilters(
  item: NormalizedLaptopItem,
  filters: LaptopFilterParams,
  skipDimension?: keyof LaptopFilterParams
): boolean {
  // Query text search
  if (skipDimension !== 'q' && filters.q) {
    const q = filters.q.toLowerCase().trim();
    const searchable = [
      item.brand,
      item.specs.cpu,
      item.specs.cpuFamily,
      item.specs.gpu,
      item.specs.gpuFamily,
      item.condition,
      item.specs.ramGB ? `${item.specs.ramGB}gb` : '',
      item.specs.storageGB ? `${item.specs.storageGB}gb` : '',
      String(item.id)
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    // Support multi-word match
    const words = q.split(/\s+/).filter(Boolean);
    const matchesAll = words.every(word => searchable.includes(word));
    if (!matchesAll) return false;
  }

  // Brand
  if (skipDimension !== 'brand' && filters.brand && filters.brand.length > 0) {
    if (!filters.brand.includes(item.brand)) return false;
  }

  // CPU Family
  if (skipDimension !== 'cpuFamily' && filters.cpuFamily && filters.cpuFamily.length > 0) {
    if (!item.specs.cpuFamily || !filters.cpuFamily.includes(item.specs.cpuFamily)) return false;
  }

  // CPU Brand
  if (skipDimension !== 'cpuBrand' && filters.cpuBrand && filters.cpuBrand.length > 0) {
    if (!item.specs.cpuBrand || !filters.cpuBrand.includes(item.specs.cpuBrand)) return false;
  }

  // CPU Generation
  if (skipDimension !== 'cpuGen' && filters.cpuGen && filters.cpuGen.length > 0) {
    if (item.specs.cpuGen === undefined || !filters.cpuGen.includes(item.specs.cpuGen)) return false;
  }

  // RAM GB
  if (skipDimension !== 'ramGB' && filters.ramGB && filters.ramGB.length > 0) {
    if (item.specs.ramGB === undefined || !filters.ramGB.includes(item.specs.ramGB)) return false;
  }

  // Storage GB
  if (skipDimension !== 'storageGB' && filters.storageGB && filters.storageGB.length > 0) {
    if (item.specs.storageGB === undefined || !filters.storageGB.includes(item.specs.storageGB)) return false;
  }

  // GPU Type (integrated vs dedicated)
  if (skipDimension !== 'gpuType' && filters.gpuType && filters.gpuType.length > 0) {
    if (!item.specs.gpuType || !filters.gpuType.includes(item.specs.gpuType)) return false;
  }

  // Screen Size
  if (skipDimension !== 'screenSize' && filters.screenSize && filters.screenSize.length > 0) {
    if (item.specs.screenSize === undefined || !filters.screenSize.includes(item.specs.screenSize)) return false;
  }

  // Touch Screen
  if (skipDimension !== 'touch' && filters.touch !== undefined) {
    if (Boolean(item.specs.touch) !== filters.touch) return false;
  }

  // Condition
  if (skipDimension !== 'condition' && filters.condition && filters.condition.length > 0) {
    if (!filters.condition.includes(item.condition)) return false;
  }

  // Available Only
  if (skipDimension !== 'availableOnly' && filters.availableOnly) {
    if (!item.available) return false;
  }

  // Price range
  if (skipDimension !== 'minPrice' && typeof filters.minPrice === 'number' && filters.minPrice > 0) {
    if (item.priceUsd === null || item.priceUsd < filters.minPrice) return false;
  }
  if (skipDimension !== 'maxPrice' && typeof filters.maxPrice === 'number' && filters.maxPrice > 0) {
    if (item.priceUsd === null || item.priceUsd > filters.maxPrice) return false;
  }

  return true;
}

/**
 * Calculates disjunctive facet counts for all laptop dimensions.
 * For each dimension, the count of each option is calculated against
 * products matching all other filters EXCEPT that dimension.
 */
export function computeLaptopFacets(
  items: NormalizedLaptopItem[],
  activeFilters: LaptopFilterParams
): LaptopFacets {
  // 1. Brands
  const brandCounts = new Map<string, number>();
  const itemsForBrands = items.filter(it => laptopMatchesFilters(it, activeFilters, 'brand'));
  for (const it of itemsForBrands) {
    brandCounts.set(it.brand, (brandCounts.get(it.brand) ?? 0) + 1);
  }
  // Ensure any currently selected brand is present
  for (const b of activeFilters.brand ?? []) {
    if (!brandCounts.has(b)) brandCounts.set(b, 0);
  }
  const sortedBrands = sortBrands([...brandCounts.keys()]);
  const brands: LaptopFacetOption<string>[] = sortedBrands.map(b => ({
    value: b,
    count: brandCounts.get(b) ?? 0,
    title: { ar: b, en: b }
  }));

  // 2. CPU Families
  const cpuFamilyCounts = new Map<string, number>();
  const itemsForCpu = items.filter(it => laptopMatchesFilters(it, activeFilters, 'cpuFamily'));
  for (const it of itemsForCpu) {
    if (it.specs.cpuFamily) {
      cpuFamilyCounts.set(it.specs.cpuFamily, (cpuFamilyCounts.get(it.specs.cpuFamily) ?? 0) + 1);
    }
  }
  for (const cf of activeFilters.cpuFamily ?? []) {
    if (!cpuFamilyCounts.has(cf)) cpuFamilyCounts.set(cf, 0);
  }
  const sortedCpuFamilies = sortProcessorFamilies([...cpuFamilyCounts.keys()]);
  const cpuFamilies: LaptopFacetOption<string>[] = sortedCpuFamilies.map(cf => ({
    value: cf,
    count: cpuFamilyCounts.get(cf) ?? 0,
    title: { ar: cf, en: cf }
  }));

  // 3. CPU Brands
  const cpuBrandCounts = new Map<string, number>();
  const itemsForCpuBrand = items.filter(it => laptopMatchesFilters(it, activeFilters, 'cpuBrand'));
  for (const it of itemsForCpuBrand) {
    if (it.specs.cpuBrand) {
      cpuBrandCounts.set(it.specs.cpuBrand, (cpuBrandCounts.get(it.specs.cpuBrand) ?? 0) + 1);
    }
  }
  for (const cb of activeFilters.cpuBrand ?? []) {
    if (!cpuBrandCounts.has(cb)) cpuBrandCounts.set(cb, 0);
  }
  const cpuBrands: LaptopFacetOption<string>[] = [...cpuBrandCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([val, count]) => ({
      value: val,
      count,
      title: { ar: val, en: val }
    }));

  // 4. CPU Generations
  const cpuGenCounts = new Map<number, number>();
  const itemsForCpuGen = items.filter(it => laptopMatchesFilters(it, activeFilters, 'cpuGen'));
  for (const it of itemsForCpuGen) {
    if (typeof it.specs.cpuGen === 'number') {
      cpuGenCounts.set(it.specs.cpuGen, (cpuGenCounts.get(it.specs.cpuGen) ?? 0) + 1);
    }
  }
  for (const cg of activeFilters.cpuGen ?? []) {
    if (!cpuGenCounts.has(cg)) cpuGenCounts.set(cg, 0);
  }
  const sortedGens = [...cpuGenCounts.keys()].sort((a, b) => b - a); // Newest first
  const cpuGens: LaptopFacetOption<number>[] = sortedGens.map(gen => ({
    value: gen,
    count: cpuGenCounts.get(gen) ?? 0,
    title: formatCpuGenTitle(gen)
  }));

  // 5. RAM Options
  const ramCounts = new Map<number, number>();
  const itemsForRam = items.filter(it => laptopMatchesFilters(it, activeFilters, 'ramGB'));
  for (const it of itemsForRam) {
    if (typeof it.specs.ramGB === 'number') {
      ramCounts.set(it.specs.ramGB, (ramCounts.get(it.specs.ramGB) ?? 0) + 1);
    }
  }
  for (const r of activeFilters.ramGB ?? []) {
    if (!ramCounts.has(r)) ramCounts.set(r, 0);
  }
  const sortedRams = sortRamOptions([...ramCounts.keys()]);
  const ramOptions: LaptopFacetOption<number>[] = sortedRams.map(ram => ({
    value: ram,
    count: ramCounts.get(ram) ?? 0,
    title: formatRamTitle(ram)
  }));

  // 6. Storage Options
  const storageCounts = new Map<number, number>();
  const itemsForStorage = items.filter(it => laptopMatchesFilters(it, activeFilters, 'storageGB'));
  for (const it of itemsForStorage) {
    if (typeof it.specs.storageGB === 'number') {
      storageCounts.set(it.specs.storageGB, (storageCounts.get(it.specs.storageGB) ?? 0) + 1);
    }
  }
  for (const s of activeFilters.storageGB ?? []) {
    if (!storageCounts.has(s)) storageCounts.set(s, 0);
  }
  const sortedStorages = sortStorageOptions([...storageCounts.keys()]);
  const storageOptions: LaptopFacetOption<number>[] = sortedStorages.map(storage => ({
    value: storage,
    count: storageCounts.get(storage) ?? 0,
    title: formatStorageTitle(storage)
  }));

  // 7. GPU Types
  const gpuTypeCounts = new Map<'integrated' | 'dedicated', number>();
  const itemsForGpu = items.filter(it => laptopMatchesFilters(it, activeFilters, 'gpuType'));
  for (const it of itemsForGpu) {
    if (it.specs.gpuType) {
      gpuTypeCounts.set(it.specs.gpuType, (gpuTypeCounts.get(it.specs.gpuType) ?? 0) + 1);
    }
  }
  for (const gt of activeFilters.gpuType ?? []) {
    if (!gpuTypeCounts.has(gt)) gpuTypeCounts.set(gt, 0);
  }
  const gpuTypes: LaptopFacetOption<'integrated' | 'dedicated'>[] = (['dedicated', 'integrated'] as const)
    .filter(t => gpuTypeCounts.has(t))
    .map(t => ({
      value: t,
      count: gpuTypeCounts.get(t) ?? 0,
      title: formatGpuTypeTitle(t)
    }));

  // 8. Screen Sizes
  const screenCounts = new Map<number, number>();
  const itemsForScreens = items.filter(it => laptopMatchesFilters(it, activeFilters, 'screenSize'));
  for (const it of itemsForScreens) {
    if (typeof it.specs.screenSize === 'number') {
      screenCounts.set(it.specs.screenSize, (screenCounts.get(it.specs.screenSize) ?? 0) + 1);
    }
  }
  for (const sc of activeFilters.screenSize ?? []) {
    if (!screenCounts.has(sc)) screenCounts.set(sc, 0);
  }
  const sortedScreens = sortScreenSizes([...screenCounts.keys()]);
  const screenSizes: LaptopFacetOption<number>[] = sortedScreens.map(size => ({
    value: size,
    count: screenCounts.get(size) ?? 0,
    title: formatScreenSizeTitle(size)
  }));

  // 9. Touch Screen
  const touchCounts = new Map<string, number>();
  const itemsForTouch = items.filter(it => laptopMatchesFilters(it, activeFilters, 'touch'));
  for (const it of itemsForTouch) {
    const val = it.specs.touch ? 'true' : 'false';
    touchCounts.set(val, (touchCounts.get(val) ?? 0) + 1);
  }
  const touchOptions: LaptopFacetOption<string>[] = [
    { value: 'true', count: touchCounts.get('true') ?? 0, title: { ar: 'شاشة لمس', en: 'Touch Screen' } },
    { value: 'false', count: touchCounts.get('false') ?? 0, title: { ar: 'شاشة عادية', en: 'Non-Touch' } }
  ].filter(opt => opt.count > 0 || activeFilters.touch === (opt.value === 'true'));

  // 10. Conditions
  const conditionCounts = new Map<string, number>();
  const itemsForCondition = items.filter(it => laptopMatchesFilters(it, activeFilters, 'condition'));
  for (const it of itemsForCondition) {
    conditionCounts.set(it.condition, (conditionCounts.get(it.condition) ?? 0) + 1);
  }
  for (const c of activeFilters.condition ?? []) {
    if (!conditionCounts.has(c)) conditionCounts.set(c, 0);
  }
  const conditionTitles: Record<string, { ar: string; en: string }> = {
    new: { ar: 'جديد كلياً (كرتون مصنع)', en: 'Brand New' },
    open_box: { ar: 'أوبن بوكس (مفتوح كرتون)', en: 'Open Box' },
    like_new: { ar: 'شبه جديد (كالجديد)', en: 'Like New' },
    refurbished: { ar: 'مجدد مع الضمان', en: 'Refurbished with Warranty' },
    used: { ar: 'مستعمل بحالة جيدة', en: 'Used (Good Condition)' },
    defective: { ar: 'معيوب / تصفية', en: 'Defective / Clearance' },
    A: { ar: 'فئة A (ممتاز / شبه جديد)', en: 'Grade A (Like New)' },
    B: { ar: 'فئة B (استخدام نظيف)', en: 'Grade B (Very Good)' },
    C: { ar: 'فئة C (اقتصادي)', en: 'Grade C (Fair)' }
  };
  const conditions: LaptopFacetOption<string>[] = ['new', 'open_box', 'like_new', 'refurbished', 'used', 'defective', 'A', 'B', 'C']
    .filter(c => conditionCounts.has(c))
    .map(c => ({
      value: c,
      count: conditionCounts.get(c) ?? 0,
      title: conditionTitles[c] ?? { ar: c, en: c }
    }));

  // Price Bounds
  const prices = items.map(it => it.priceUsd).filter((p): p is number => typeof p === 'number' && p > 0);
  const priceBounds = {
    min: prices.length ? Math.floor(Math.min(...prices)) : 0,
    max: prices.length ? Math.ceil(Math.max(...prices)) : 5000
  };

  return {
    brands,
    cpuFamilies,
    cpuBrands,
    cpuGens,
    ramOptions,
    storageOptions,
    gpuTypes,
    screenSizes,
    touchOptions,
    conditions,
    priceBounds
  };
}

