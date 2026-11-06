import React, { useState, useId, useMemo } from 'react';
import {
  ChevronDown,
  Keyboard,
  RotateCcw,
  SlidersHorizontal,
  Wifi,
  Mouse,
  Briefcase,
  Cable,
  Gamepad2,
  Zap,
  BatteryCharging,
  Usb,
  Headphones,
  Laptop,
  Monitor,
  Smartphone,
  ShieldCheck,
  Search,
  X,
  Check,
  Sparkles,
  Tag,
  Building2,
  Radio,
  Layers
} from 'lucide-react';

interface FacetItem {
  value: string;
  count: number;
  title?: string;
}

interface AccessoryFilterSidebarProps {
  current: URLSearchParams;
  onChange: (p: URLSearchParams) => void;
  facets?: {
    brand: FacetItem[];
    condition: FacetItem[];
  } | undefined;
  language: 'ar' | 'en';
  isDialog?: boolean;
}

// ─── 1. Department / Accessory Subcategories (نمط أقسام أمازون وإيباي) ────────
const ACCESSORY_CATEGORIES = [
  { value: 'peripherals', icon: Keyboard,        label: { ar: 'لوحات مفاتيح وفأرات',            en: 'Keyboards & Mice' } },
  { value: 'audio',       icon: Headphones,      label: { ar: 'سماعات رأس ومايكات',             en: 'Headsets & Mics' } },
  { value: 'bags',        icon: Briefcase,       label: { ar: 'حقائب وشنط لابتوب ضد الصدمات',  en: 'Bags & Sleeves' } },
  { value: 'stands',      icon: Laptop,          label: { ar: 'قواعد تبريد وستاندات مكتبية',   en: 'Cooling & Stands' } },
  { value: 'hubs',        icon: Usb,             label: { ar: 'موزعات ووصلات Type-C Hubs',    en: 'Hubs & Docks' } },
  { value: 'chargers',    icon: Zap,             label: { ar: 'شواحن ومحولات طاقة أصلية',       en: 'Chargers & Adapters' } },
  { value: 'powerbanks',  icon: BatteryCharging, label: { ar: 'بطاريات وبنوك طاقة متنقلة',     en: 'Power Banks' } },
  { value: 'pads',        icon: Mouse,           label: { ar: 'ماوس باد ومساند راحة اليد',     en: 'Mouse Pads & Rests' } },
  { value: 'cables',      icon: Cable,           label: { ar: 'كابلات شاشات وتوصيلات بيانات',  en: 'Cables & Display' } },
  { value: 'gaming',      icon: Gamepad2,        label: { ar: 'أذرع وملحقات ألعاب القيمنق',    en: 'Gaming Gear' } },
  { value: 'cleaning',    icon: ShieldCheck,     label: { ar: 'أدوات تنظيف وحماية الأجهزة',    en: 'Cleaning & Care' } },
] as const;

// ─── 2. Connectivity & Interface (طريقة التوصيل) ─────────────────────────────
const CONNECTIVITY_OPTIONS = [
  { value: 'bluetooth', icon: Wifi,  label: { ar: 'لاسلكي بلوتوث', en: 'Bluetooth' } },
  { value: 'wireless',  icon: Radio, label: { ar: 'لاسلكي 2.4G',   en: '2.4G Wireless' } },
  { value: 'usb-a',     icon: Usb,   label: { ar: 'سلكي USB-A',    en: 'Wired USB-A' } },
  { value: 'type-c',    icon: Zap,   label: { ar: 'سلكي Type-C',   en: 'Wired Type-C' } },
  { value: 'dual-mode', icon: Layers,label: { ar: 'ثنائي الوضع',   en: 'Dual Mode' } },
] as const;

// ─── 3. Device Compatibility (التوافق مع الأجهزة) ─────────────────────────────
const COMPATIBILITY_OPTIONS = [
  { value: 'laptops',  icon: Laptop,     label: { ar: 'لابتوبات',         en: 'Laptops' } },
  { value: 'desktops', icon: Monitor,    label: { ar: 'كمبيوتر مكتبي PC', en: 'Desktop PC' } },
  { value: 'mac',      icon: Sparkles,   label: { ar: 'ماك بوك وآبل',     en: 'Mac / Apple' } },
  { value: 'mobile',   icon: Smartphone, label: { ar: 'هواتف وتابلت',     en: 'Phone & Tablet' } },
  { value: 'console',  icon: Gamepad2,   label: { ar: 'أجهزة ألعاب كونسول', en: 'Consoles' } },
] as const;

// ─── 4. Usage & Features (الاستخدام والميزات الخاصة) ──────────────────────────
const FEATURE_OPTIONS = [
  { value: 'gaming',   icon: Gamepad2,    label: { ar: 'ألعاب وقيمنق',  en: 'Gaming' } },
  { value: 'office',   icon: Briefcase,   label: { ar: 'مكتبي وهادئ',   en: 'Silent Office' } },
  { value: 'rgb',      icon: Sparkles,    label: { ar: 'إضاءة RGB',     en: 'RGB Lighting' } },
  { value: 'fastcharge',icon: Zap,        label: { ar: 'شحن سريع PD',   en: 'Fast Charge PD' } },
  { value: 'ergonomic',icon: ShieldCheck, label: { ar: 'تصميم مريح لليد',en: 'Ergonomic' } },
] as const;

// ─── Popular Accessory Brands ────────────────────────────────────────────────
const POPULAR_BRANDS = [
  { value: 'Logitech',    name: 'Logitech' },
  { value: 'Razer',       name: 'Razer' },
  { value: 'Baseus',      name: 'Baseus' },
  { value: 'Anker',       name: 'Anker' },
  { value: 'Ugreen',      name: 'Ugreen' },
  { value: 'Redragon',    name: 'Redragon' },
  { value: 'Apple',       name: 'Apple' },
  { value: 'Dell',        name: 'Dell' },
  { value: 'HP',          name: 'HP' },
  { value: 'Lenovo',      name: 'Lenovo' },
  { value: 'SteelSeries', name: 'SteelSeries' },
  { value: 'HyperX',      name: 'HyperX' },
  { value: 'Samsung',     name: 'Samsung' },
  { value: 'SanDisk',     name: 'SanDisk' },
  { value: 'Kingston',    name: 'Kingston' },
  { value: 'Meetion',     name: 'Meetion' },
  { value: 'Fantech',     name: 'Fantech' },
] as const;

// ─── Amazon-Style Quick Budget Presets ────────────────────────────────────────
const BUDGET_PRESETS = [
  { label: { ar: 'أقل من 10$',   en: '< $10' },      min: null, max: 10 },
  { label: { ar: '10$ إلى 25$',  en: '$10 - $25' },  min: 10,   max: 25 },
  { label: { ar: '25$ إلى 50$',  en: '$25 - $50' },  min: 25,   max: 50 },
  { label: { ar: '50$ إلى 100$', en: '$50 - $100' }, min: 50,   max: 100 },
  { label: { ar: 'أكثر من 100$', en: '> $100' },   min: 100,  max: null },
] as const;

// ─── Condition Options ────────────────────────────────────────────────────────
const CONDITIONS = [
  { value: 'new', label: { ar: 'جديد أصلي بالكرتون',   en: 'Brand New (Original Box)' } },
  { value: 'A',   label: { ar: 'مجدد وكالة معتمد A+', en: 'Certified Refurbished A+' } },
] as const;

const copy = {
  ar: {
    title:         'فلتر الإكسسوارات والملحقات',
    resetAll:      'مسح الكل',
    clearSection:  'مسح',
    activeFilters: 'فلاتر نشطة',
    availableOnly: 'المتوفر في المخزن فقط',
    availableSub:  'توصيل فوري وشحن سريع',
    priceRange:    'نطاق السعر والميزانية',
    apply:         'تطبيق',
    department:    'أقسام وفئات الملحقات',
    brand:         'العلامة التجارية والمصنّع',
    searchBrand:   'ابحث عن ماركة...',
    showMore:      'عرض المزيد',
    showLess:      'عرض أقل',
    connectivity:  'طريقة التوصيل والمنفذ',
    compatibility: 'التوافق مع الأجهزة',
    features:      'الاستخدام والميزات الخاصة',
    condition:     'الحالة والضمان',
    min:           'أقل سعر',
    max:           'أعلى سعر',
    noBrandFound:  'لا توجد ماركة مطابقة',
  },
  en: {
    title:         'Accessories Filter',
    resetAll:      'Reset All',
    clearSection:  'Clear',
    activeFilters: 'active filters',
    availableOnly: 'In Stock Only',
    availableSub:  'Immediate dispatch & fast shipping',
    priceRange:    'Price Range & Budget',
    apply:         'Apply',
    department:    'Accessory Category',
    brand:         'Brand & Manufacturer',
    searchBrand:   'Search brand...',
    showMore:      'Show More',
    showLess:      'Show Less',
    connectivity:  'Connectivity & Interface',
    compatibility: 'Device Compatibility',
    features:      'Features & Usage Style',
    condition:     'Condition & Warranty',
    min:           'Min $',
    max:           'Max $',
    noBrandFound:  'No matching brand found',
  },
} as const;

export default function AccessoryFilterSidebar({
  current,
  onChange,
  facets,
  language,
  isDialog = false,
}: AccessoryFilterSidebarProps) {
  const t = copy[language];
  const isAr = language === 'ar';
  const sliderId = useId();

  // Search filter inside brands
  const [brandSearch, setBrandSearch] = useState('');
  const [showAllBrands, setShowAllBrands] = useState(false);

  // Accordion open/close state - Essentials first (Brand, Price, Department)
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    brand:         true,
    price:         true,
    department:    true,
    condition:     false,
    connectivity:  false,
    compatibility: false,
    features:      false,
  });

  const toggleSection = (key: string) => {
    setOpenSections(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // Helper to toggle multi-valued query params (e.g. brand, spec_accessoryType, etc.)
  const toggleArrayParam = (key: string, value: string | number) => {
    const strVal = String(value);
    const next = new URLSearchParams(current);
    const values = next.getAll(key).flatMap(v => v.split(',')).filter(Boolean);
    next.delete(key);

    const updated = values.includes(strVal)
      ? values.filter(v => v !== strVal)
      : [...values, strVal];

    if (updated.length > 0) {
      updated.forEach(v => next.append(key, v));
    }
    next.delete('page');
    onChange(next);
  };

  // Helper to set/delete single param
  const updateSingleParam = (key: string, value: string | null) => {
    const next = new URLSearchParams(current);
    if (value !== null && value !== '') {
      next.set(key, value);
    } else {
      next.delete(key);
    }
    next.delete('page');
    onChange(next);
  };

  const isSelected = (key: string, value: string | number) => {
    const strVal = String(value);
    return current.getAll(key).flatMap(v => v.split(',')).includes(strVal);
  };

  const getActiveCount = (...keys: string[]) => {
    return keys.reduce((acc, k) => {
      return acc + current.getAll(k).flatMap(v => v.split(',')).filter(Boolean).length;
    }, 0);
  };

  // Clear single section
  const clearSection = (...keys: string[]) => {
    const next = new URLSearchParams(current);
    keys.forEach(k => next.delete(k));
    next.delete('page');
    onChange(next);
  };

  // Quick budget preset toggle
  const setBudgetPreset = (minVal: number | null, maxVal: number | null) => {
    const next = new URLSearchParams(current);
    const currMin = current.get('min');
    const currMax = current.get('max');

    const isSame =
      (minVal === null ? !currMin : currMin === String(minVal)) &&
      (maxVal === null ? !currMax : currMax === String(maxVal));

    if (isSame) {
      next.delete('min');
      next.delete('max');
    } else {
      if (minVal !== null) next.set('min', String(minVal));
      else next.delete('min');

      if (maxVal !== null) next.set('max', String(maxVal));
      else next.delete('max');
    }
    next.delete('page');
    onChange(next);
  };

  // Total active filters count (excluding pagination, search text, category slug)
  const totalActiveFiltersCount = useMemo(() => {
    let count = 0;
    for (const [key, val] of current.entries()) {
      if (!['page', 'sort', 'q', 'category'].includes(key) && val) {
        count += val.split(',').filter(Boolean).length;
      }
    }
    return count;
  }, [current]);

  const clearAll = () => {
    const next = new URLSearchParams();
    if (current.get('q'))        next.set('q', current.get('q')!);
    if (current.get('category')) next.set('category', current.get('category')!);
    if (current.get('sort'))     next.set('sort', current.get('sort')!);
    onChange(next);
  };

  // Compile combined brands list with API facets counts
  const allBrandsList = useMemo(() => {
    const map = new Map<string, { value: string; name: string; count: number }>();

    // Seed from popular brands
    POPULAR_BRANDS.forEach(b => {
      map.set(b.value.toLowerCase(), { value: b.value, name: b.name, count: 0 });
    });

    // Merge API facets
    if (facets?.brand) {
      facets.brand.forEach(f => {
        const key = f.value.toLowerCase();
        const existing = map.get(key);
        if (existing) {
          existing.count = f.count;
          if (f.title) existing.name = f.title;
        } else {
          map.set(key, { value: f.value, name: f.title || f.value, count: f.count });
        }
      });
    }

    return Array.from(map.values());
  }, [facets]);

  // Filtered brands by user search
  const filteredBrands = useMemo(() => {
    const query = brandSearch.trim().toLowerCase();
    let list = allBrandsList;
    if (query) {
      list = list.filter(b => b.name.toLowerCase().includes(query) || b.value.toLowerCase().includes(query));
    }
    return list;
  }, [allBrandsList, brandSearch]);

  const displayedBrands = showAllBrands ? filteredBrands : filteredBrands.slice(0, 7);

  // Price bounds
  const minBound = 0;
  const maxBound = 250;
  const currentMin = current.get('min') ? Number(current.get('min')) : minBound;
  const currentMax = current.get('max') ? Number(current.get('max')) : maxBound;

  return (
    <aside
      className={isDialog ? 'store-laptop-dialog-body' : 'store-filters store-accessory-sidebar'}
      aria-label={t.title}
    >
      {/* ── Header with Active Filter Count & Reset All ── */}
      {!isDialog && (
        <div className="store-accessory-header">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-violet-100 dark:bg-violet-900/50 text-violet-600 dark:text-violet-400">
              <Keyboard size={16} />
            </span>
            <div>
              <h2>{t.title}</h2>
              {totalActiveFiltersCount > 0 && (
                <span className="text-[11px] font-bold text-violet-600 dark:text-violet-400">
                  {totalActiveFiltersCount} {t.activeFilters}
                </span>
              )}
            </div>
          </div>
          {totalActiveFiltersCount > 0 && (
            <button
              type="button"
              className="store-filters-reset-link flex items-center gap-1 text-xs"
              onClick={clearAll}
            >
              <RotateCcw size={12} />
              <span>{t.resetAll}</span>
            </button>
          )}
        </div>
      )}

      {/* ── Prominent Amazon-Style "In Stock Only" Card ── */}
      <label className="store-accessory-toggle-card">
        <div className="flex items-center gap-2.5">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <div className="flex flex-col">
            <span className="text-xs font-bold text-neutral-900 dark:text-neutral-100">
              {t.availableOnly}
            </span>
            <span className="text-[10px] text-neutral-500 dark:text-neutral-400">
              {t.availableSub}
            </span>
          </div>
        </div>
        <input
          type="checkbox"
          className="w-4 h-4 rounded text-violet-600 focus:ring-violet-500 accent-violet-600 cursor-pointer"
          checked={current.get('available') === 'true'}
          onChange={e => updateSingleParam('available', e.target.checked ? 'true' : null)}
        />
      </label>

      {/* ── 1. Brands (العلامة التجارية والمصنّع - الأساسي الأول كما في أمازون وإيباي) ── */}
      <div className="store-accessory-card">
        <button
          type="button"
          className="store-laptop-accordion-btn"
          onClick={() => toggleSection('brand')}
          aria-expanded={openSections.brand}
        >
          <span className="flex items-center gap-2 font-bold text-[13px]">
            <Building2 size={15} className="text-blue-600 dark:text-blue-400" />
            <span>{t.brand}</span>
            {getActiveCount('brand') > 0 && (
              <span className="store-filter-badge">{getActiveCount('brand')}</span>
            )}
          </span>
          <div className="flex items-center gap-1.5">
            {getActiveCount('brand') > 0 && (
              <button
                type="button"
                className="store-section-clear-btn"
                onClick={e => {
                  e.stopPropagation();
                  clearSection('brand');
                }}
              >
                {t.clearSection}
              </button>
            )}
            <ChevronDown
              size={15}
              className={`transition-transform duration-200 text-gray-500 ${openSections.brand ? 'rotate-180' : ''}`}
            />
          </div>
        </button>

        {openSections.brand && (
          <div className="store-laptop-accordion-content">
            {/* Live Search Box inside Brand Filter */}
            <div className="store-accessory-search-box">
              <Search size={13} className="store-accessory-search-icon" />
              <input
                type="text"
                value={brandSearch}
                onChange={e => setBrandSearch(e.target.value)}
                placeholder={t.searchBrand}
                className="store-accessory-search-input"
              />
              {brandSearch && (
                <button
                  type="button"
                  onClick={() => setBrandSearch('')}
                  className="absolute top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 rtl:left-2.5 ltr:right-2.5"
                >
                  <X size={12} />
                </button>
              )}
            </div>

            {/* Checkbox Brands List */}
            <div className="store-accessory-list">
              {displayedBrands.length === 0 ? (
                <div className="py-2 text-center text-xs text-gray-400">
                  {t.noBrandFound}
                </div>
              ) : (
                displayedBrands.map(b => {
                  const active = isSelected('brand', b.value);
                  return (
                    <button
                      key={b.value}
                      type="button"
                      onClick={() => toggleArrayParam('brand', b.value)}
                      className={`store-accessory-row ${active ? 'active' : ''}`}
                    >
                      <div className="flex items-center gap-2 overflow-hidden">
                        <div className="store-accessory-checkbox">
                          {active && <Check size={11} strokeWidth={3} />}
                        </div>
                        <span className="truncate">{b.name}</span>
                      </div>
                      {b.count > 0 && (
                        <span className="store-accessory-badge">{b.count}</span>
                      )}
                    </button>
                  );
                })
              )}
            </div>

            {/* Show More / Show Less Toggle Button */}
            {filteredBrands.length > 7 && (
              <button
                type="button"
                onClick={() => setShowAllBrands(!showAllBrands)}
                className="store-accessory-show-more"
              >
                <span>{showAllBrands ? t.showLess : `${t.showMore} (+${filteredBrands.length - 7})`}</span>
                <ChevronDown size={13} className={showAllBrands ? 'rotate-180' : ''} />
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── 2. Price Range & Amazon-Style Presets (نطاق السعر والميزانية) ── */}
      <div className="store-accessory-card">
        <button
          type="button"
          className="store-laptop-accordion-btn"
          onClick={() => toggleSection('price')}
          aria-expanded={openSections.price}
        >
          <span className="flex items-center gap-2 font-bold text-[13px]">
            <span className="text-emerald-600 dark:text-emerald-400 font-extrabold text-sm">$</span>
            <span>{t.priceRange}</span>
            {(current.get('min') || current.get('max')) && (
              <span className="store-filter-badge">1</span>
            )}
          </span>
          <div className="flex items-center gap-1.5">
            {(current.get('min') || current.get('max')) && (
              <button
                type="button"
                className="store-section-clear-btn"
                onClick={e => {
                  e.stopPropagation();
                  clearSection('min', 'max');
                }}
              >
                {t.clearSection}
              </button>
            )}
            <ChevronDown
              size={15}
              className={`transition-transform duration-200 text-gray-500 ${openSections.price ? 'rotate-180' : ''}`}
            />
          </div>
        </button>

        {openSections.price && (
          <div className="store-laptop-accordion-content">
            {/* Quick Amazon-Style Budget Tiers */}
            <div className="grid grid-cols-2 gap-1.5 mb-3">
              {BUDGET_PRESETS.map((preset, idx) => {
                const isActive =
                  (preset.min === null ? !current.get('min') : current.get('min') === String(preset.min)) &&
                  (preset.max === null ? !current.get('max') : current.get('max') === String(preset.max));
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setBudgetPreset(preset.min, preset.max)}
                    className={`store-budget-pill ${isActive ? 'active' : ''}`}
                  >
                    <span>{preset.label[language]}</span>
                  </button>
                );
              })}
            </div>

            {/* Min - Max Input Boxes */}
            <div className="store-range">
              <div className="store-range-input-wrapper">
                <span className="store-range-cur">$</span>
                <input
                  type="number"
                  min={minBound}
                  max={maxBound}
                  aria-label={t.min}
                  placeholder={t.min}
                  value={current.get('min') ?? ''}
                  onChange={e => updateSingleParam('min', e.target.value)}
                />
              </div>
              <span className="text-gray-400 font-medium self-center">—</span>
              <div className="store-range-input-wrapper">
                <span className="store-range-cur">$</span>
                <input
                  type="number"
                  min={minBound}
                  max={maxBound}
                  aria-label={t.max}
                  placeholder={t.max}
                  value={current.get('max') ?? ''}
                  onChange={e => updateSingleParam('max', e.target.value)}
                />
              </div>
            </div>

            {/* Visual Slider */}
            <div className="mt-3 px-1">
              <label htmlFor={sliderId} className="sr-only">Price Slider</label>
              <input
                id={sliderId}
                type="range"
                min={minBound}
                max={maxBound}
                step={5}
                value={currentMax}
                onChange={e => updateSingleParam('max', e.target.value)}
                className="w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-violet-600"
              />
              <div className="flex justify-between text-[11px] text-gray-500 mt-1 font-semibold">
                <span>${minBound}</span>
                <span className="text-violet-600 dark:text-violet-400">${currentMax}</span>
                <span>${maxBound}+</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── 3. Department / Accessory Categories (أقسام وفئات الملحقات) ── */}
      <div className="store-accessory-card">
        <button
          type="button"
          className="store-laptop-accordion-btn"
          onClick={() => toggleSection('department')}
          aria-expanded={openSections.department}
        >
          <span className="flex items-center gap-2 font-bold text-[13px]">
            <Layers size={15} className="text-violet-600 dark:text-violet-400" />
            <span>{t.department}</span>
            {getActiveCount('spec_accessoryType') > 0 && (
              <span className="store-filter-badge">{getActiveCount('spec_accessoryType')}</span>
            )}
          </span>
          <div className="flex items-center gap-1.5">
            {getActiveCount('spec_accessoryType') > 0 && (
              <button
                type="button"
                className="store-section-clear-btn"
                onClick={e => {
                  e.stopPropagation();
                  clearSection('spec_accessoryType');
                }}
              >
                {t.clearSection}
              </button>
            )}
            <ChevronDown
              size={15}
              className={`transition-transform duration-200 text-gray-500 ${openSections.department ? 'rotate-180' : ''}`}
            />
          </div>
        </button>

        {openSections.department && (
          <div className="store-laptop-accordion-content">
            <div className="store-accessory-list">
              {ACCESSORY_CATEGORIES.map(cat => {
                const active = isSelected('spec_accessoryType', cat.value);
                const Icon = cat.icon;
                return (
                  <button
                    key={cat.value}
                    type="button"
                    onClick={() => toggleArrayParam('spec_accessoryType', cat.value)}
                    className={`store-accessory-row ${active ? 'active' : ''}`}
                  >
                    <div className="flex items-center gap-2 overflow-hidden">
                      <div className="store-accessory-checkbox">
                        {active && <Check size={11} strokeWidth={3} />}
                      </div>
                      <Icon size={14} className={active ? 'text-violet-600 dark:text-violet-400' : 'text-gray-400'} />
                      <span className="truncate">{cat.label[language]}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ── 4. Connectivity & Interface (2-Column Grid Pills) ── */}
      <div className="store-accessory-card">
        <button
          type="button"
          className="store-laptop-accordion-btn"
          onClick={() => toggleSection('connectivity')}
          aria-expanded={openSections.connectivity}
        >
          <span className="flex items-center gap-2 font-bold text-[13px]">
            <Wifi size={15} className="text-indigo-600 dark:text-indigo-400" />
            <span>{t.connectivity}</span>
            {getActiveCount('spec_wireless') > 0 && (
              <span className="store-filter-badge">{getActiveCount('spec_wireless')}</span>
            )}
          </span>
          <div className="flex items-center gap-1.5">
            {getActiveCount('spec_wireless') > 0 && (
              <button
                type="button"
                className="store-section-clear-btn"
                onClick={e => {
                  e.stopPropagation();
                  clearSection('spec_wireless');
                }}
              >
                {t.clearSection}
              </button>
            )}
            <ChevronDown
              size={15}
              className={`transition-transform duration-200 text-gray-500 ${openSections.connectivity ? 'rotate-180' : ''}`}
            />
          </div>
        </button>

        {openSections.connectivity && (
          <div className="store-laptop-accordion-content">
            <div className="store-accessory-pills-2col">
              {CONNECTIVITY_OPTIONS.map(opt => {
                const active = isSelected('spec_wireless', opt.value);
                const Icon = opt.icon;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => toggleArrayParam('spec_wireless', opt.value)}
                    className={`store-accessory-pill-btn ${active ? 'active' : ''}`}
                  >
                    <Icon size={12} className={active ? 'text-white' : 'text-gray-400'} />
                    <span className="truncate">{opt.label[language]}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ── 5. Device Compatibility (التوافق مع الأجهزة) ── */}
      <div className="store-accessory-card">
        <button
          type="button"
          className="store-laptop-accordion-btn"
          onClick={() => toggleSection('compatibility')}
          aria-expanded={openSections.compatibility}
        >
          <span className="flex items-center gap-2 font-bold text-[13px]">
            <Laptop size={15} className="text-teal-600 dark:text-teal-400" />
            <span>{t.compatibility}</span>
            {getActiveCount('spec_compatibility') > 0 && (
              <span className="store-filter-badge">{getActiveCount('spec_compatibility')}</span>
            )}
          </span>
          <div className="flex items-center gap-1.5">
            {getActiveCount('spec_compatibility') > 0 && (
              <button
                type="button"
                className="store-section-clear-btn"
                onClick={e => {
                  e.stopPropagation();
                  clearSection('spec_compatibility');
                }}
              >
                {t.clearSection}
              </button>
            )}
            <ChevronDown
              size={15}
              className={`transition-transform duration-200 text-gray-500 ${openSections.compatibility ? 'rotate-180' : ''}`}
            />
          </div>
        </button>

        {openSections.compatibility && (
          <div className="store-laptop-accordion-content">
            <div className="store-accessory-pills-2col">
              {COMPATIBILITY_OPTIONS.map(opt => {
                const active = isSelected('spec_compatibility', opt.value);
                const Icon = opt.icon;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => toggleArrayParam('spec_compatibility', opt.value)}
                    className={`store-accessory-pill-btn ${active ? 'active' : ''}`}
                  >
                    <Icon size={12} className={active ? 'text-white' : 'text-gray-400'} />
                    <span className="truncate">{opt.label[language]}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ── 6. Features & Usage Style (الاستخدام والميزات الخاصة) ── */}
      <div className="store-accessory-card">
        <button
          type="button"
          className="store-laptop-accordion-btn"
          onClick={() => toggleSection('features')}
          aria-expanded={openSections.features}
        >
          <span className="flex items-center gap-2 font-bold text-[13px]">
            <Gamepad2 size={15} className="text-rose-600 dark:text-rose-400" />
            <span>{t.features}</span>
            {getActiveCount('spec_usage') > 0 && (
              <span className="store-filter-badge">{getActiveCount('spec_usage')}</span>
            )}
          </span>
          <div className="flex items-center gap-1.5">
            {getActiveCount('spec_usage') > 0 && (
              <button
                type="button"
                className="store-section-clear-btn"
                onClick={e => {
                  e.stopPropagation();
                  clearSection('spec_usage');
                }}
              >
                {t.clearSection}
              </button>
            )}
            <ChevronDown
              size={15}
              className={`transition-transform duration-200 text-gray-500 ${openSections.features ? 'rotate-180' : ''}`}
            />
          </div>
        </button>

        {openSections.features && (
          <div className="store-laptop-accordion-content">
            <div className="store-accessory-pills-2col">
              {FEATURE_OPTIONS.map(opt => {
                const active = isSelected('spec_usage', opt.value);
                const Icon = opt.icon;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => toggleArrayParam('spec_usage', opt.value)}
                    className={`store-accessory-pill-btn ${active ? 'active' : ''}`}
                  >
                    <Icon size={12} className={active ? 'text-white' : 'text-gray-400'} />
                    <span className="truncate">{opt.label[language]}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ── 7. Condition & Warranty (الحالة والضمان) ── */}
      <div className="store-accessory-card">
        <button
          type="button"
          className="store-laptop-accordion-btn"
          onClick={() => toggleSection('condition')}
          aria-expanded={openSections.condition}
        >
          <span className="flex items-center gap-2 font-bold text-[13px]">
            <Tag size={15} className="text-amber-600 dark:text-amber-400" />
            <span>{t.condition}</span>
            {getActiveCount('condition') > 0 && (
              <span className="store-filter-badge">{getActiveCount('condition')}</span>
            )}
          </span>
          <div className="flex items-center gap-1.5">
            {getActiveCount('condition') > 0 && (
              <button
                type="button"
                className="store-section-clear-btn"
                onClick={e => {
                  e.stopPropagation();
                  clearSection('condition');
                }}
              >
                {t.clearSection}
              </button>
            )}
            <ChevronDown
              size={15}
              className={`transition-transform duration-200 text-gray-500 ${openSections.condition ? 'rotate-180' : ''}`}
            />
          </div>
        </button>

        {openSections.condition && (
          <div className="store-laptop-accordion-content">
            <div className="store-accessory-list">
              {CONDITIONS.map(opt => {
                const active = isSelected('condition', opt.value);
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => toggleArrayParam('condition', opt.value)}
                    className={`store-accessory-row ${active ? 'active' : ''}`}
                  >
                    <div className="flex items-center gap-2 overflow-hidden">
                      <div className="store-accessory-checkbox">
                        {active && <Check size={11} strokeWidth={3} />}
                      </div>
                      <span className="truncate">{opt.label[language]}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
