import { useState, useId } from 'react';
import {
  ChevronDown,
  Monitor,
  RotateCcw,
  SlidersHorizontal,
  Tv,
  Sparkles,
  Zap,
  Building2
} from 'lucide-react';

interface FacetItem {
  value: string;
  count: number;
  title?: string;
}

interface DisplayFilterSidebarProps {
  current: URLSearchParams;
  onChange: (p: URLSearchParams) => void;
  facets?: {
    brand: FacetItem[];
    condition: FacetItem[];
  } | undefined;
  language: 'ar' | 'en';
  isDialog?: boolean;
}

const SCREEN_SIZES = [
  { value: '24', label: { ar: '22" - 24" بوصة', en: '22" - 24"' } },
  { value: '27', label: { ar: '27" بوصة (الأكثر طلباً)', en: '27" (Popular)' } },
  { value: '32', label: { ar: '32" بوصة (كبيرة)', en: '32" Large' } },
  { value: '34', label: { ar: '34"+ عريضة (UltraWide)', en: '34"+ UltraWide' } },
] as const;

const RESOLUTIONS = [
  { value: 'FHD', label: { ar: 'Full HD (1080p)', en: '1080p FHD' } },
  { value: '2K',  label: { ar: '2K QHD (1440p)',  en: '2K QHD'     } },
  { value: '4K',  label: { ar: '4K UHD (2160p)',  en: '4K UHD'     } },
] as const;

const REFRESH_RATES = [
  { value: '60',  label: { ar: '60Hz - 75Hz (مكتبي ودراسة)', en: '60Hz - 75Hz (Office)' } },
  { value: '144', label: { ar: '120Hz - 144Hz (سلس)',       en: '120Hz - 144Hz (Smooth)' } },
  { value: '165', label: { ar: '165Hz - 240Hz+ (جيمنج فائق)', en: '165Hz - 240Hz+ (Pro Gaming)' } },
] as const;

const PANELS = [
  { value: 'IPS',  label: { ar: 'IPS (دقة ألوان وزوايا رؤية)', en: 'IPS (Color Accuracy)' } },
  { value: 'VA',   label: { ar: 'VA (تباين عميق وسواد نقي)', en: 'VA (High Contrast)' } },
  { value: 'OLED', label: { ar: 'OLED / QD-OLED (أعلى جودة)', en: 'OLED' } },
] as const;

const CURVED_OPTIONS = [
  { value: 'flat',   label: { ar: 'مسطحة (Flat)', en: 'Flat' } },
  { value: 'curved', label: { ar: 'منحنية (Curved)', en: 'Curved' } },
] as const;

const FEATURES = [
  { value: 'type_c',   label: { ar: 'منفذ Type-C وشحن PD', en: 'Type-C PD Hub' } },
  { value: 'speakers', label: { ar: 'سماعات مدمجة', en: 'Built-in Speakers' } },
  { value: 'pivot',    label: { ar: 'حامل قابل للتدوير والارتفاع', en: 'Height & Pivot Stand' } },
] as const;

const POPULAR_BRANDS = [
  { value: 'Dell',    label: 'Dell'    },
  { value: 'Samsung', label: 'Samsung' },
  { value: 'LG',      label: 'LG'      },
  { value: 'HP',      label: 'HP'      },
  { value: 'ASUS',    label: 'ASUS'    },
  { value: 'BenQ',    label: 'BenQ'    },
] as const;

const CONDITIONS = [
  { value: 'new', label: { ar: 'جديد بالكرتون', en: 'Brand New' } },
  { value: 'A',   label: { ar: 'مستعمل فئة A+', en: 'Grade A+' } },
] as const;

const copy = {
  ar: {
    title:       'فلتر الشاشات',
    reset:       'مسح الكل',
    available:   'المتوفر فقط',
    priceRange:  'نطاق السعر',
    size:        'مقاس الشاشة',
    resolution:  'دقة الشاشة (Resolution)',
    refresh:     'معدل التحديث (Hz)',
    panel:       'نوع اللوحة (Panel)',
    curve:       'انحناء الشاشة',
    features:    'المنافذ والميزات',
    brand:       'العلامة التجارية',
    condition:   'الحالة',
    min:         'من',
    max:         'إلى',
  },
  en: {
    title:       'Display & Monitor Filter',
    reset:       'Reset',
    available:   'Available only',
    priceRange:  'Price Range',
    size:        'Screen Size',
    resolution:  'Resolution',
    refresh:     'Refresh Rate',
    panel:       'Panel Type',
    curve:       'Screen Shape',
    features:    'Ports & Features',
    brand:       'Brand',
    condition:   'Condition',
    min:         'Min',
    max:         'Max',
  },
} as const;

export default function DisplayFilterSidebar({
  current,
  onChange,
  facets,
  language,
  isDialog = false,
}: DisplayFilterSidebarProps) {
  const t = copy[language];
  const sliderId = useId();

  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    price:      true,
    size:       true,
    resolution: true,
    refresh:    true,
    panel:      false,
    curve:      false,
    features:   false,
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
  const maxBound = 1500;
  const currentMax = current.get('max') ? Number(current.get('max')) : maxBound;

  return (
    <aside
      className={isDialog ? 'store-laptop-dialog-body' : 'store-filters store-laptop-filters'}
      aria-label={t.title}
    >
      {!isDialog && (
        <div className="store-filters-header">
          <div className="flex items-center gap-2">
            <Monitor size={16} className="text-violet-600 dark:text-violet-400" />
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
                step={20}
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

      {/* 2. Screen Size */}
      <div className="store-laptop-accordion">
        <button
          type="button"
          className="store-laptop-accordion-btn"
          onClick={() => toggleSection('size')}
          aria-expanded={openSections.size}
        >
          <span className="flex items-center gap-2 font-bold text-sm">
            <Tv size={14} className="text-blue-500" />
            <span>{t.size}</span>
            {getActiveCount('screenSize') > 0 && (
              <span className="store-filter-badge">{getActiveCount('screenSize')}</span>
            )}
          </span>
          <ChevronDown
            size={15}
            className={`transition-transform duration-200 ${openSections.size ? 'rotate-180' : ''}`}
          />
        </button>

        {openSections.size && (
          <div className="store-laptop-accordion-content">
            <div className="flex flex-col gap-2 pt-1">
              {SCREEN_SIZES.map(opt => {
                const active = isSelected('screenSize', opt.value);
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => toggleArrayParam('screenSize', opt.value)}
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

      {/* 3. Resolution */}
      <div className="store-laptop-accordion">
        <button
          type="button"
          className="store-laptop-accordion-btn"
          onClick={() => toggleSection('resolution')}
          aria-expanded={openSections.resolution}
        >
          <span className="flex items-center gap-2 font-bold text-sm">
            <Sparkles size={14} className="text-purple-500" />
            <span>{t.resolution}</span>
            {getActiveCount('spec_resolution') > 0 && (
              <span className="store-filter-badge">{getActiveCount('spec_resolution')}</span>
            )}
          </span>
          <ChevronDown
            size={15}
            className={`transition-transform duration-200 ${openSections.resolution ? 'rotate-180' : ''}`}
          />
        </button>

        {openSections.resolution && (
          <div className="store-laptop-accordion-content">
            <div className="flex flex-wrap gap-2 pt-1">
              {RESOLUTIONS.map(opt => {
                const active = isSelected('spec_resolution', opt.value);
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => toggleArrayParam('spec_resolution', opt.value)}
                    className={`store-filter-chip ${active ? 'store-filter-chip-active' : ''}`}
                  >
                    {opt.label[language]}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* 4. Refresh Rate */}
      <div className="store-laptop-accordion">
        <button
          type="button"
          className="store-laptop-accordion-btn"
          onClick={() => toggleSection('refresh')}
          aria-expanded={openSections.refresh}
        >
          <span className="flex items-center gap-2 font-bold text-sm">
            <Zap size={14} className="text-amber-500" />
            <span>{t.refresh}</span>
            {getActiveCount('spec_refreshHz') > 0 && (
              <span className="store-filter-badge">{getActiveCount('spec_refreshHz')}</span>
            )}
          </span>
          <ChevronDown
            size={15}
            className={`transition-transform duration-200 ${openSections.refresh ? 'rotate-180' : ''}`}
          />
        </button>

        {openSections.refresh && (
          <div className="store-laptop-accordion-content">
            <div className="flex flex-col gap-2 pt-1">
              {REFRESH_RATES.map(opt => {
                const active = isSelected('spec_refreshHz', opt.value);
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => toggleArrayParam('spec_refreshHz', opt.value)}
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

      {/* 5. Panel Type */}
      <div className="store-laptop-accordion">
        <button
          type="button"
          className="store-laptop-accordion-btn"
          onClick={() => toggleSection('panel')}
          aria-expanded={openSections.panel}
        >
          <span className="flex items-center gap-2 font-bold text-sm">
            <span>{t.panel}</span>
            {getActiveCount('spec_panel') > 0 && (
              <span className="store-filter-badge">{getActiveCount('spec_panel')}</span>
            )}
          </span>
          <ChevronDown
            size={15}
            className={`transition-transform duration-200 ${openSections.panel ? 'rotate-180' : ''}`}
          />
        </button>

        {openSections.panel && (
          <div className="store-laptop-accordion-content">
            <div className="flex flex-col gap-2 pt-1">
              {PANELS.map(opt => {
                const active = isSelected('spec_panel', opt.value);
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => toggleArrayParam('spec_panel', opt.value)}
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

      {/* 6. Curve */}
      <div className="store-laptop-accordion">
        <button
          type="button"
          className="store-laptop-accordion-btn"
          onClick={() => toggleSection('curve')}
          aria-expanded={openSections.curve}
        >
          <span className="flex items-center gap-2 font-bold text-sm">
            <span>{t.curve}</span>
            {getActiveCount('spec_curved') > 0 && (
              <span className="store-filter-badge">{getActiveCount('spec_curved')}</span>
            )}
          </span>
          <ChevronDown
            size={15}
            className={`transition-transform duration-200 ${openSections.curve ? 'rotate-180' : ''}`}
          />
        </button>

        {openSections.curve && (
          <div className="store-laptop-accordion-content">
            <div className="grid grid-cols-2 gap-2 pt-1">
              {CURVED_OPTIONS.map(opt => {
                const active = isSelected('spec_curved', opt.value);
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => toggleArrayParam('spec_curved', opt.value)}
                    className={`store-filter-chip ${active ? 'store-filter-chip-active' : ''}`}
                  >
                    {opt.label[language]}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* 7. Features */}
      <div className="store-laptop-accordion">
        <button
          type="button"
          className="store-laptop-accordion-btn"
          onClick={() => toggleSection('features')}
          aria-expanded={openSections.features}
        >
          <span className="flex items-center gap-2 font-bold text-sm">
            <span>{t.features}</span>
            {getActiveCount('spec_feature') > 0 && (
              <span className="store-filter-badge">{getActiveCount('spec_feature')}</span>
            )}
          </span>
          <ChevronDown
            size={15}
            className={`transition-transform duration-200 ${openSections.features ? 'rotate-180' : ''}`}
          />
        </button>

        {openSections.features && (
          <div className="store-laptop-accordion-content">
            <div className="flex flex-col gap-2 pt-1">
              {FEATURES.map(opt => {
                const active = isSelected('spec_feature', opt.value);
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => toggleArrayParam('spec_feature', opt.value)}
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
