import { useState, useId } from 'react';
import {
  ChevronDown,
  HardDrive,
  Layers,
  RotateCcw,
  Zap,
  SlidersHorizontal,
  Check,
  Usb,
  Database,
  Camera,
  Laptop,
  Monitor,
  Disc3,
  Gauge
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface FacetItem {
  value: string;
  count: number;
  title?: string;
}

interface StorageFilterSidebarProps {
  current: URLSearchParams;
  onChange: (p: URLSearchParams) => void;
  facets?: {
    brand: FacetItem[];
    condition: FacetItem[];
  } | undefined;
  language: 'ar' | 'en';
  isDialog?: boolean;
}

// ─── Static filter options (bilingual) ────────────────────────────────────────

const STORAGE_TYPES = [
  { value: 'nvme',         label: { ar: 'NVMe M.2 فائق السرعة', en: 'NVMe M.2 SSD'    } },
  { value: 'ssd-sata',     label: { ar: 'SATA SSD (2.5 بوصة)',  en: 'SATA SSD (2.5")'  } },
  { value: 'hdd',          label: { ar: 'HDD قرص صلب ميكانيكي',  en: 'Mechanical HDD'   } },
  { value: 'external_ssd', label: { ar: 'SSD خارجي محمول',      en: 'External SSD'     } },
  { value: 'external_hdd', label: { ar: 'هاردسك خارجي محمول',   en: 'External HDD'     } },
] as const;

const CAPACITIES = [
  { value: '256',  label: { ar: '240 / 256 جيجابايت',  en: '240 / 256 GB'  } },
  { value: '512',  label: { ar: '480 / 512 جيجابايت',  en: '480 / 512 GB'  } },
  { value: '1000', label: { ar: '1 تيرابايت (960GB - 1TB)', en: '1 TB'     } },
  { value: '2000', label: { ar: '2 تيرابايت',         en: '2 TB'          } },
  { value: '4000', label: { ar: '4 تيرابايت فأكثر',    en: '4 TB+'         } },
] as const;

const FORM_FACTORS = [
  { value: 'm.2',      label: { ar: 'M.2 2280 (داخلي نحيف)',    en: 'M.2 2280'          } },
  { value: '2.5',      label: { ar: '2.5 بوصة (لابتوب / مكتبي)', en: '2.5" Form Factor'  } },
  { value: '3.5',      label: { ar: '3.5 بوصة (مكتبي / DVR)',   en: '3.5" Desktop / DVR'} },
  { value: 'external', label: { ar: 'خارجي محمول USB',         en: 'External Portable' } },
] as const;

const USE_CASES = [
  { value: 'surveillance', label: { ar: 'أنظمة مراقبة وكاميرات DVR', en: 'CCTV Surveillance'  } },
  { value: 'laptop',       label: { ar: 'ترقية لابتوب (M.2 / 2.5")', en: 'Laptop Upgrade'     } },
  { value: 'desktop',      label: { ar: 'أجهزة مكتبية وتخزين ضخم', en: 'Desktop High Storage'} },
  { value: 'portable',     label: { ar: 'نسخ احتياطي وتخزين متنقل', en: 'Backup & On-the-Go'  } },
] as const;

const INTERFACES = [
  { value: 'm.2',   label: { ar: 'PCIe NVMe (M.2)',  en: 'PCIe NVMe'    } },
  { value: 'sata',  label: { ar: 'SATA III 6Gb/s',   en: 'SATA III'     } },
  { value: 'usb-c', label: { ar: 'USB-C فائق السرعة', en: 'USB-C'        } },
  { value: 'usb 3', label: { ar: 'USB 3.0 / 3.2',    en: 'USB 3.0'      } },
] as const;

const RPM_SPEEDS = [
  { value: '7200', label: { ar: '7200 RPM (أداء مكتبي عالي)',   en: '7200 RPM (Performance)' } },
  { value: '5400', label: { ar: '5400 RPM (هدوء وتوفير طاقة)', en: '5400 RPM (Quiet/Efficient)' } },
] as const;

const CONDITIONS = [
  { value: 'new', label: { ar: 'جديد بالصندوق',   en: 'Brand New' } },
  { value: 'A',   label: { ar: 'فئة A (ممتاز)',   en: 'Grade A'   } },
  { value: 'B',   label: { ar: 'فئة B (جيد جداً)', en: 'Grade B'   } },
] as const;

// ─── Copy ─────────────────────────────────────────────────────────────────────

const copy = {
  ar: {
    title:       'فلتر وحدات التخزين والهاردسكات',
    reset:       'مسح الفلاتر',
    available:   'المتوفر للتسليم الفوري فقط',
    priceRange:  'نطاق السعر ($)',
    priceSlider: 'شريط السعر',
    storageType: 'نوع التقنية والقرص',
    capacity:    'سعة التخزين',
    formFactor:  'المقاس وحجم الهيكل',
    useCase:     'طبيعة الاستخدام والهدف',
    iface:       'واجهة التوصيل والمنفذ',
    rpm:         'سرعة الدوران RPM (للأقراص الميكانيكية)',
    brand:       'العلامة التجارية',
    condition:   'حالة المنتج',
    min:         'الحد الأدنى',
    max:         'الحد الأقصى',
  },
  en: {
    title:       'Storage & Hard Drive Filters',
    reset:       'Clear Filters',
    available:   'In stock for immediate delivery',
    priceRange:  'Price Range ($)',
    priceSlider: 'Price slider',
    storageType: 'Drive Technology & Type',
    capacity:    'Storage Capacity',
    formFactor:  'Form Factor & Size',
    useCase:     'Intended Purpose / Use Case',
    iface:       'Interface & Port',
    rpm:         'RPM Speed (Mechanical Drives)',
    brand:       'Brand',
    condition:   'Condition',
    min:         'Min',
    max:         'Max',
  },
} as const;

// ─── Component ────────────────────────────────────────────────────────────────

export default function StorageFilterSidebar({
  current,
  onChange,
  facets,
  language,
  isDialog = false,
}: StorageFilterSidebarProps) {
  const t = copy[language];
  const isAr = language === 'ar';
  const sliderId = useId();

  // Accordion open/close state
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    price:       true,
    storageType: true,
    capacity:    true,
    formFactor:  true,
    useCase:     true,
    iface:       false,
    rpm:         false,
    brand:       true,
    condition:   false,
  });

  const toggleSection = (key: string) => {
    setOpenSections(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // Helper: toggle array-based query parameters
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

  // Helper: update single parameter
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
    if (current.get('q'))        next.set('q',        current.get('q')!);
    if (current.get('sort'))     next.set('sort',     current.get('sort')!);
    if (current.get('category')) next.set('category', current.get('category')!);
    onChange(next);
  };

  // Price range bounds
  const minBound   = 0;
  const maxBound   = 500;
  const currentMax = current.get('max') ? Number(current.get('max')) : maxBound;

  return (
    <aside
      className={isDialog ? 'store-laptop-dialog-body' : 'store-filters store-laptop-filters'}
      aria-label={t.title}
    >
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      {!isDialog && (
        <div className="store-filters-header">
          <div className="flex items-center gap-2">
            <SlidersHorizontal size={16} className="text-violet-600 dark:text-violet-400" />
            <h2>
              <strong>{t.title}</strong>
            </h2>
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

      {/* ── Available-only toggle ───────────────────────────────────────────── */}
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

      {/* ── 1. Storage Type Accordion ──────────────────────────────────────── */}
      <div className="store-laptop-accordion">
        <button
          type="button"
          className="store-laptop-accordion-btn"
          onClick={() => toggleSection('storageType')}
          aria-expanded={openSections.storageType}
        >
          <span className="flex items-center gap-2 font-bold text-sm">
            <Database size={15} className="text-violet-600 dark:text-violet-400" />
            <span>{t.storageType}</span>
            {getActiveCount('storageType') > 0 && (
              <span className="store-filter-badge">{getActiveCount('storageType')}</span>
            )}
          </span>
          <ChevronDown
            size={15}
            className={`transition-transform duration-200 ${openSections.storageType ? 'rotate-180' : ''}`}
          />
        </button>

        {openSections.storageType && (
          <div className="store-laptop-accordion-content">
            <div className="flex flex-wrap gap-2 pt-1">
              {STORAGE_TYPES.map(opt => {
                const active = isSelected('storageType', opt.value);
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => toggleArrayParam('storageType', opt.value)}
                    className={`store-filter-chip ${active ? 'store-filter-chip-active' : ''}`}
                    aria-pressed={active}
                  >
                    {opt.label[language]}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ── 2. Capacity Accordion ──────────────────────────────────────────── */}
      <div className="store-laptop-accordion">
        <button
          type="button"
          className="store-laptop-accordion-btn"
          onClick={() => toggleSection('capacity')}
          aria-expanded={openSections.capacity}
        >
          <span className="flex items-center gap-2 font-bold text-sm">
            <HardDrive size={15} className="text-emerald-600 dark:text-emerald-400" />
            <span>{t.capacity}</span>
            {getActiveCount('storageGB') > 0 && (
              <span className="store-filter-badge">{getActiveCount('storageGB')}</span>
            )}
          </span>
          <ChevronDown
            size={15}
            className={`transition-transform duration-200 ${openSections.capacity ? 'rotate-180' : ''}`}
          />
        </button>

        {openSections.capacity && (
          <div className="store-laptop-accordion-content">
            <div className="flex flex-wrap gap-2 pt-1">
              {CAPACITIES.map(opt => {
                const active = isSelected('storageGB', opt.value);
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => toggleArrayParam('storageGB', opt.value)}
                    className={`store-filter-chip ${active ? 'store-filter-chip-active' : ''}`}
                    aria-pressed={active}
                  >
                    {opt.label[language]}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ── 3. Purpose / Use Case Accordion ─────────────────────────────────── */}
      <div className="store-laptop-accordion">
        <button
          type="button"
          className="store-laptop-accordion-btn"
          onClick={() => toggleSection('useCase')}
          aria-expanded={openSections.useCase}
        >
          <span className="flex items-center gap-2 font-bold text-sm">
            <Zap size={15} className="text-amber-500" />
            <span>{t.useCase}</span>
            {getActiveCount('useCase') > 0 && (
              <span className="store-filter-badge">{getActiveCount('useCase')}</span>
            )}
          </span>
          <ChevronDown
            size={15}
            className={`transition-transform duration-200 ${openSections.useCase ? 'rotate-180' : ''}`}
          />
        </button>

        {openSections.useCase && (
          <div className="store-laptop-accordion-content">
            <div className="flex flex-col gap-1.5 pt-1">
              {USE_CASES.map(opt => {
                const active = isSelected('useCase', opt.value);
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => toggleArrayParam('useCase', opt.value)}
                    className={`store-filter-chip justify-start text-start ${active ? 'store-filter-chip-active' : ''}`}
                    aria-pressed={active}
                  >
                    {opt.label[language]}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ── 4. Form Factor Accordion ───────────────────────────────────────── */}
      <div className="store-laptop-accordion">
        <button
          type="button"
          className="store-laptop-accordion-btn"
          onClick={() => toggleSection('formFactor')}
          aria-expanded={openSections.formFactor}
        >
          <span className="flex items-center gap-2 font-bold text-sm">
            <Disc3 size={15} className="text-blue-500" />
            <span>{t.formFactor}</span>
            {getActiveCount('formFactor') > 0 && (
              <span className="store-filter-badge">{getActiveCount('formFactor')}</span>
            )}
          </span>
          <ChevronDown
            size={15}
            className={`transition-transform duration-200 ${openSections.formFactor ? 'rotate-180' : ''}`}
          />
        </button>

        {openSections.formFactor && (
          <div className="store-laptop-accordion-content">
            <div className="flex flex-wrap gap-2 pt-1">
              {FORM_FACTORS.map(opt => {
                const active = isSelected('formFactor', opt.value);
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => toggleArrayParam('formFactor', opt.value)}
                    className={`store-filter-chip ${active ? 'store-filter-chip-active' : ''}`}
                    aria-pressed={active}
                  >
                    {opt.label[language]}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ── 5. Interface & Ports Accordion ──────────────────────────────────── */}
      <div className="store-laptop-accordion">
        <button
          type="button"
          className="store-laptop-accordion-btn"
          onClick={() => toggleSection('iface')}
          aria-expanded={openSections.iface}
        >
          <span className="flex items-center gap-2 font-bold text-sm">
            <Usb size={15} className="text-cyan-500" />
            <span>{t.iface}</span>
            {getActiveCount('interface') > 0 && (
              <span className="store-filter-badge">{getActiveCount('interface')}</span>
            )}
          </span>
          <ChevronDown
            size={15}
            className={`transition-transform duration-200 ${openSections.iface ? 'rotate-180' : ''}`}
          />
        </button>

        {openSections.iface && (
          <div className="store-laptop-accordion-content">
            <div className="flex flex-wrap gap-2 pt-1">
              {INTERFACES.map(opt => {
                const active = isSelected('interface', opt.value);
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => toggleArrayParam('interface', opt.value)}
                    className={`store-filter-chip ${active ? 'store-filter-chip-active' : ''}`}
                    aria-pressed={active}
                  >
                    {opt.label[language]}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ── 6. RPM Speed Accordion (Mechanical HDDs) ───────────────────────── */}
      <div className="store-laptop-accordion">
        <button
          type="button"
          className="store-laptop-accordion-btn"
          onClick={() => toggleSection('rpm')}
          aria-expanded={openSections.rpm}
        >
          <span className="flex items-center gap-2 font-bold text-sm">
            <Gauge size={15} className="text-orange-500" />
            <span>{t.rpm}</span>
            {getActiveCount('rpm') > 0 && (
              <span className="store-filter-badge">{getActiveCount('rpm')}</span>
            )}
          </span>
          <ChevronDown
            size={15}
            className={`transition-transform duration-200 ${openSections.rpm ? 'rotate-180' : ''}`}
          />
        </button>

        {openSections.rpm && (
          <div className="store-laptop-accordion-content">
            <div className="flex flex-wrap gap-2 pt-1">
              {RPM_SPEEDS.map(opt => {
                const active = isSelected('rpm', opt.value);
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => toggleArrayParam('rpm', opt.value)}
                    className={`store-filter-chip ${active ? 'store-filter-chip-active' : ''}`}
                    aria-pressed={active}
                  >
                    {opt.label[language]}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ── 7. Price Range Accordion ────────────────────────────────────────── */}
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

            {/* Slider */}
            <div className="mt-3 px-1">
              <label htmlFor={sliderId} className="sr-only">
                {t.priceSlider}
              </label>
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
                <span className="text-violet-600 dark:text-violet-400 font-bold">${currentMax}</span>
                <span>${maxBound}+</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── 8. Brand Accordion (checkboxes from facets) ─────────────────────── */}
      {facets?.brand && facets.brand.length > 0 && (
        <div className="store-laptop-accordion">
          <button
            type="button"
            className="store-laptop-accordion-btn"
            onClick={() => toggleSection('brand')}
            aria-expanded={openSections.brand}
          >
            <span className="flex items-center gap-2 font-bold text-sm">
              <Layers size={15} className="text-indigo-500" />
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
            <div className="store-laptop-accordion-content store-filter-options">
              {facets.brand.map(b => {
                const checked  = isSelected('brand', b.value);
                const disabled = b.count === 0 && !checked;
                return (
                  <label
                    key={b.value}
                    className={`store-filter-item ${disabled ? 'opacity-40 cursor-not-allowed' : ''}`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={disabled}
                      onChange={() => toggleArrayParam('brand', b.value)}
                    />
                    <span className="store-filter-label">
                      {b.title ?? b.value}
                    </span>
                    <span className="store-filter-count">{b.count}</span>
                  </label>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── 9. Condition Accordion (chips) ─────────────────────────────────── */}
      <div className="store-laptop-accordion">
        <button
          type="button"
          className="store-laptop-accordion-btn"
          onClick={() => toggleSection('condition')}
          aria-expanded={openSections.condition}
        >
          <span className="flex items-center gap-2 font-bold text-sm">
            <Check size={15} className="text-emerald-600" />
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
            <div className="flex flex-wrap gap-2 pt-1">
              {CONDITIONS.map(opt => {
                const active     = isSelected('condition', opt.value);
                const facetEntry = facets?.condition?.find(c => c.value === opt.value);
                const disabled   = facetEntry !== undefined && facetEntry.count === 0 && !active;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => !disabled && toggleArrayParam('condition', opt.value)}
                    className={`store-filter-chip ${active ? 'store-filter-chip-active' : ''} ${disabled ? 'opacity-40 cursor-not-allowed' : ''}`}
                    aria-pressed={active}
                    disabled={disabled}
                  >
                    {opt.label[language]}
                    {facetEntry !== undefined && (
                      <span className="ms-1 text-[10px] opacity-70">({facetEntry.count})</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ── Dialog reset button ───────────────────────────────────────────── */}
      {isDialog && hasAnyFilters && (
        <div className="pt-4 border-t border-gray-100 dark:border-gray-800 mt-2">
          <button
            type="button"
            className="store-filters-reset-link w-full justify-center flex items-center gap-1"
            onClick={clearAll}
          >
            <RotateCcw size={12} />
            {t.reset}
          </button>
        </div>
      )}
    </aside>
  );
}
