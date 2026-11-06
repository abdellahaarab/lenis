import { useState, useId } from 'react';
import {
  ChevronDown,
  MemoryStick,
  RotateCcw,
  SlidersHorizontal,
  Zap,
  Sparkles,
  Building2,
  Cpu
} from 'lucide-react';

interface FacetItem {
  value: string;
  count: number;
  title?: string;
}

interface RamFilterSidebarProps {
  current: URLSearchParams;
  onChange: (p: URLSearchParams) => void;
  facets?: {
    brand: FacetItem[];
    condition: FacetItem[];
  } | undefined;
  language: 'ar' | 'en';
  isDialog?: boolean;
}

const DEVICE_TYPES = [
  { value: 'laptop',  label: { ar: 'رامات لابتوب (SODIMM)',   en: 'Laptop (SODIMM)'  } },
  { value: 'desktop', label: { ar: 'رامات ديسكتوب (UDIMM)',  en: 'Desktop (UDIMM)' } },
] as const;

const DDR_GENS = [
  { value: 'DDR5', label: { ar: 'DDR5 (الجيل الأحدث فائق السرعة)', en: 'DDR5 (Latest)' } },
  { value: 'DDR4', label: { ar: 'DDR4 (الأكثر انتشاراً)',         en: 'DDR4 (Mainstream)' } },
  { value: 'DDR3', label: { ar: 'DDR3 (للأجهزة السابقة)',          en: 'DDR3 (Legacy)' } },
] as const;

const CAPACITIES = [
  { value: '4',  label: '4 GB'  },
  { value: '8',  label: '8 GB'  },
  { value: '16', label: '16 GB' },
  { value: '32', label: '32 GB' },
  { value: '64', label: '64 GB (2x32)' },
] as const;

const SPEEDS = [
  { value: '2666', label: '2666 MHz' },
  { value: '3200', label: '3200 MHz' },
  { value: '3600', label: '3600 MHz' },
  { value: '4800', label: '4800 MHz (DDR5)' },
  { value: '5600', label: '5600 MHz (DDR5)' },
  { value: '6000', label: '6000+ MHz (Gaming)' },
] as const;

const KIT_TYPES = [
  { value: 'single', label: { ar: 'قطعة واحدة (Single Module)', en: 'Single Module' } },
  { value: 'dual',   label: { ar: 'طقم قطعتين (Dual Channel Kit 2x)', en: 'Dual Channel Kit (2x)' } },
] as const;

const RGB_OPTIONS = [
  { value: 'true',  label: { ar: 'مع إضاءة RGB جمالية', en: 'RGB Lighting' } },
  { value: 'false', label: { ar: 'كلاسيكي بدون إضاءة',       en: 'Non-RGB / Standard' } },
] as const;

const POPULAR_BRANDS = [
  { value: 'Kingston', label: 'Kingston Fury' },
  { value: 'Crucial',  label: 'Crucial (Micron)' },
  { value: 'Corsair',  label: 'Corsair' },
  { value: 'Samsung',  label: 'Samsung' },
  { value: 'SK Hynix', label: 'SK Hynix' },
  { value: 'G.Skill',  label: 'G.Skill' },
] as const;

const CONDITIONS = [
  { value: 'new', label: { ar: 'جديد بالضمان', en: 'Brand New' } },
  { value: 'A',   label: { ar: 'مستعمل فحص وكالة', en: 'Tested / Grade A' } },
] as const;

const copy = {
  ar: {
    title:       'فلتر ذواكر الرام (RAM)',
    reset:       'مسح الكل',
    available:   'المتوفر فقط',
    priceRange:  'نطاق السعر',
    deviceType:  'نوع التوافق (لابتوب / مكتبي)',
    ddrGen:      'جيل الذاكرة (DDR)',
    capacity:    'حجم الذاكرة (السعة)',
    speed:       'تردد السرعة (Bus Speed)',
    kit:         'تكوين الطقم (Kit)',
    rgb:         'إضاءة RGB',
    brand:       'الشركة المصنعة',
    condition:   'الحالة',
    min:         'من',
    max:         'إلى',
  },
  en: {
    title:       'RAM Memory Filter',
    reset:       'Reset',
    available:   'Available only',
    priceRange:  'Price Range',
    deviceType:  'Compatibility (Laptop / Desktop)',
    ddrGen:      'DDR Generation',
    capacity:    'Capacity',
    speed:       'Frequency / Speed',
    kit:         'Kit Type',
    rgb:         'RGB Lighting',
    brand:       'Brand',
    condition:   'Condition',
    min:         'Min',
    max:         'Max',
  },
} as const;

export default function RamFilterSidebar({
  current,
  onChange,
  facets,
  language,
  isDialog = false,
}: RamFilterSidebarProps) {
  const t = copy[language];
  const sliderId = useId();

  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    price:      true,
    deviceType: true,
    ddrGen:     true,
    capacity:   true,
    speed:      false,
    kit:        false,
    rgb:        false,
    brand:      true,
    condition:  false,
  });

  const toggleSection = (key: string) => {
    setOpenSections(prev => ({ ...prev, [key]: !prev[key] }));
  };

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

  const getActiveCount = (key: string) => {
    return current.getAll(key).flatMap(v => v.split(',')).filter(Boolean).length;
  };

  const hasAnyFilters = [...current.keys()].some(
    k => !['page', 'sort', 'q', 'category'].includes(k)
  );

  const clearAll = () => {
    const next = new URLSearchParams();
    if (current.get('q'))    next.set('q',    current.get('q')!);
    if (current.get('sort')) next.set('sort', current.get('sort')!);
    onChange(next);
  };

  const minBound = 0;
  const maxBound = 300;
  const currentMax = current.get('max') ? Number(current.get('max')) : maxBound;

  return (
    <aside
      className={isDialog ? 'store-laptop-dialog-body' : 'store-filters store-laptop-filters'}
      aria-label={t.title}
    >
      {!isDialog && (
        <div className="store-filters-header">
          <div className="flex items-center gap-2">
            <MemoryStick size={16} className="text-violet-600 dark:text-violet-400" />
            <h2><strong>{t.title}</strong></h2>
          </div>
          {hasAnyFilters && (
            <button
              type="button"
              className="store-filters-reset-link"
              onClick={clearAll}
            >
              <RotateCcw size={12} className="inline me-1" />
              {t.reset}
            </button>
          )}
        </div>
      )}

      {/* Available Toggle */}
      <label className="store-filter-toggle mb-3">
        <input
          type="checkbox"
          checked={current.get('available') === 'true'}
          onChange={e => updateSingleParam('available', e.target.checked ? 'true' : null)}
        />
        <span className="store-filter-label font-bold text-violet-700 dark:text-violet-300">
          {t.available}
        </span>
      </label>

      {/* 1. Price Range */}
      <div className="store-laptop-accordion">
        <button
          type="button"
          className="store-laptop-accordion-btn"
          onClick={() => toggleSection('price')}
          aria-expanded={openSections.price}
        >
          <span className="flex items-center gap-2 font-bold text-sm">
            <span className="text-green-600 dark:text-green-400 font-extrabold">$</span>
            <span>{t.priceRange}</span>
          </span>
          <ChevronDown
            size={15}
            className={`transition-transform duration-200 ${openSections.price ? 'rotate-180' : ''}`}
          />
        </button>

        {openSections.price && (
          <div className="store-laptop-accordion-content">
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

            <div className="mt-3 px-1">
              <label htmlFor={sliderId} className="sr-only">Range</label>
              <input
                id={sliderId}
                type="range"
                min={minBound}
                max={maxBound}
                step={5}
                value={currentMax}
                onChange={e => updateSingleParam('max', e.target.value)}
                className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-violet-600 dark:bg-gray-700"
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

      {/* 2. Device Type (Laptop / Desktop) */}
      <div className="store-laptop-accordion">
        <button
          type="button"
          className="store-laptop-accordion-btn"
          onClick={() => toggleSection('deviceType')}
          aria-expanded={openSections.deviceType}
        >
          <span className="flex items-center gap-2 font-bold text-sm">
            <Cpu size={14} className="text-blue-500" />
            <span>{t.deviceType}</span>
            {getActiveCount('spec_deviceType') > 0 && (
              <span className="store-filter-badge">{getActiveCount('spec_deviceType')}</span>
            )}
          </span>
          <ChevronDown
            size={15}
            className={`transition-transform duration-200 ${openSections.deviceType ? 'rotate-180' : ''}`}
          />
        </button>

        {openSections.deviceType && (
          <div className="store-laptop-accordion-content">
            <div className="flex flex-col gap-2 pt-1">
              {DEVICE_TYPES.map(opt => {
                const active = isSelected('spec_deviceType', opt.value);
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => toggleArrayParam('spec_deviceType', opt.value)}
                    className={`store-filter-chip justify-start px-3 ${active ? 'store-filter-chip-active' : ''}`}
                  >
                    {opt.label[language]}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* 3. DDR Generation */}
      <div className="store-laptop-accordion">
        <button
          type="button"
          className="store-laptop-accordion-btn"
          onClick={() => toggleSection('ddrGen')}
          aria-expanded={openSections.ddrGen}
        >
          <span className="flex items-center gap-2 font-bold text-sm">
            <Zap size={14} className="text-amber-500" />
            <span>{t.ddrGen}</span>
            {getActiveCount('spec_ddrGen') > 0 && (
              <span className="store-filter-badge">{getActiveCount('spec_ddrGen')}</span>
            )}
          </span>
          <ChevronDown
            size={15}
            className={`transition-transform duration-200 ${openSections.ddrGen ? 'rotate-180' : ''}`}
          />
        </button>

        {openSections.ddrGen && (
          <div className="store-laptop-accordion-content">
            <div className="flex flex-col gap-2 pt-1">
              {DDR_GENS.map(opt => {
                const active = isSelected('spec_ddrGen', opt.value);
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => toggleArrayParam('spec_ddrGen', opt.value)}
                    className={`store-filter-chip justify-start px-3 ${active ? 'store-filter-chip-active' : ''}`}
                  >
                    {opt.label[language]}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* 4. Capacity */}
      <div className="store-laptop-accordion">
        <button
          type="button"
          className="store-laptop-accordion-btn"
          onClick={() => toggleSection('capacity')}
          aria-expanded={openSections.capacity}
        >
          <span className="flex items-center gap-2 font-bold text-sm">
            <MemoryStick size={14} className="text-emerald-500" />
            <span>{t.capacity}</span>
            {getActiveCount('ramGB') > 0 && (
              <span className="store-filter-badge">{getActiveCount('ramGB')}</span>
            )}
          </span>
          <ChevronDown
            size={15}
            className={`transition-transform duration-200 ${openSections.capacity ? 'rotate-180' : ''}`}
          />
        </button>

        {openSections.capacity && (
          <div className="store-laptop-accordion-content">
            <div className="grid grid-cols-2 gap-2 pt-1">
              {CAPACITIES.map(opt => {
                const active = isSelected('ramGB', opt.value);
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => toggleArrayParam('ramGB', opt.value)}
                    className={`store-filter-chip ${active ? 'store-filter-chip-active' : ''}`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* 5. Bus Speed */}
      <div className="store-laptop-accordion">
        <button
          type="button"
          className="store-laptop-accordion-btn"
          onClick={() => toggleSection('speed')}
          aria-expanded={openSections.speed}
        >
          <span className="flex items-center gap-2 font-bold text-sm">
            <span>{t.speed}</span>
            {getActiveCount('spec_speedMhz') > 0 && (
              <span className="store-filter-badge">{getActiveCount('spec_speedMhz')}</span>
            )}
          </span>
          <ChevronDown
            size={15}
            className={`transition-transform duration-200 ${openSections.speed ? 'rotate-180' : ''}`}
          />
        </button>

        {openSections.speed && (
          <div className="store-laptop-accordion-content">
            <div className="grid grid-cols-2 gap-2 pt-1">
              {SPEEDS.map(opt => {
                const active = isSelected('spec_speedMhz', opt.value);
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => toggleArrayParam('spec_speedMhz', opt.value)}
                    className={`store-filter-chip text-xs ${active ? 'store-filter-chip-active' : ''}`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* 6. Kit Type */}
      <div className="store-laptop-accordion">
        <button
          type="button"
          className="store-laptop-accordion-btn"
          onClick={() => toggleSection('kit')}
          aria-expanded={openSections.kit}
        >
          <span className="flex items-center gap-2 font-bold text-sm">
            <span>{t.kit}</span>
            {getActiveCount('spec_kit') > 0 && (
              <span className="store-filter-badge">{getActiveCount('spec_kit')}</span>
            )}
          </span>
          <ChevronDown
            size={15}
            className={`transition-transform duration-200 ${openSections.kit ? 'rotate-180' : ''}`}
          />
        </button>

        {openSections.kit && (
          <div className="store-laptop-accordion-content">
            <div className="flex flex-col gap-2 pt-1">
              {KIT_TYPES.map(opt => {
                const active = isSelected('spec_kit', opt.value);
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => toggleArrayParam('spec_kit', opt.value)}
                    className={`store-filter-chip justify-start px-3 ${active ? 'store-filter-chip-active' : ''}`}
                  >
                    {opt.label[language]}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* 7. RGB Lighting */}
      <div className="store-laptop-accordion">
        <button
          type="button"
          className="store-laptop-accordion-btn"
          onClick={() => toggleSection('rgb')}
          aria-expanded={openSections.rgb}
        >
          <span className="flex items-center gap-2 font-bold text-sm">
            <Sparkles size={14} className="text-pink-500" />
            <span>{t.rgb}</span>
            {getActiveCount('spec_rgb') > 0 && (
              <span className="store-filter-badge">{getActiveCount('spec_rgb')}</span>
            )}
          </span>
          <ChevronDown
            size={15}
            className={`transition-transform duration-200 ${openSections.rgb ? 'rotate-180' : ''}`}
          />
        </button>

        {openSections.rgb && (
          <div className="store-laptop-accordion-content">
            <div className="flex flex-col gap-2 pt-1">
              {RGB_OPTIONS.map(opt => {
                const active = isSelected('spec_rgb', opt.value);
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => toggleArrayParam('spec_rgb', opt.value)}
                    className={`store-filter-chip justify-start px-3 ${active ? 'store-filter-chip-active' : ''}`}
                  >
                    {opt.label[language]}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* 8. Brands */}
      <div className="store-laptop-accordion">
        <button
          type="button"
          className="store-laptop-accordion-btn"
          onClick={() => toggleSection('brand')}
          aria-expanded={openSections.brand}
        >
          <span className="flex items-center gap-2 font-bold text-sm">
            <Building2 size={14} className="text-slate-500" />
            <span>{t.brand}</span>
            {getActiveCount('brand') > 0 && (
              <span className="store-filter-badge">{getActiveCount('brand')}</span>
            )}
          </span>
          <ChevronDown
            size={15}
            className={`transition-transform duration-200 ${openSections.brand ? 'rotate-180' : ''}`}
          />
        </button>

        {openSections.brand && (
          <div className="store-laptop-accordion-content">
            <div className="flex flex-wrap gap-2 pt-1">
              {POPULAR_BRANDS.map(opt => {
                const active = isSelected('brand', opt.value);
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => toggleArrayParam('brand', opt.value)}
                    className={`store-filter-chip ${active ? 'store-filter-chip-active' : ''}`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* 9. Condition */}
      <div className="store-laptop-accordion">
        <button
          type="button"
          className="store-laptop-accordion-btn"
          onClick={() => toggleSection('condition')}
          aria-expanded={openSections.condition}
        >
          <span className="flex items-center gap-2 font-bold text-sm">
            <span>{t.condition}</span>
            {getActiveCount('condition') > 0 && (
              <span className="store-filter-badge">{getActiveCount('condition')}</span>
            )}
          </span>
          <ChevronDown
            size={15}
            className={`transition-transform duration-200 ${openSections.condition ? 'rotate-180' : ''}`}
          />
        </button>

        {openSections.condition && (
          <div className="store-laptop-accordion-content">
            <div className="flex flex-col gap-2 pt-1">
              {CONDITIONS.map(opt => {
                const active = isSelected('condition', opt.value);
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => toggleArrayParam('condition', opt.value)}
                    className={`store-filter-chip justify-start px-3 ${active ? 'store-filter-chip-active' : ''}`}
                  >
                    {opt.label[language]}
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
