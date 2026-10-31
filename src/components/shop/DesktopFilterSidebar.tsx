import { useState, useId } from 'react';
import {
  ChevronDown,
  Monitor,
  Cpu,
  RotateCcw,
  SlidersHorizontal,
  HardDrive,
  Gamepad2,
  Building2,
  Box
} from 'lucide-react';

interface FacetItem {
  value: string;
  count: number;
  title?: string;
}

interface DesktopFilterSidebarProps {
  current: URLSearchParams;
  onChange: (p: URLSearchParams) => void;
  facets?: {
    brand: FacetItem[];
    condition: FacetItem[];
  } | undefined;
  language: 'ar' | 'en';
  isDialog?: boolean;
}

const FORM_FACTORS = [
  { value: 'tower',       label: { ar: 'كيس تاور (كبير)',       en: 'Tower / Full Desktop' } },
  { value: 'sff',         label: { ar: 'مكتبي مدمج (SFF)',     en: 'Small Form Factor'    } },
  { value: 'mini',        label: { ar: 'ميني بي سي (صغير جداً)', en: 'Mini PC'             } },
  { value: 'aio',         label: { ar: 'الكل في واحد (AIO)',   en: 'All-in-One'           } },
  { value: 'workstation', label: { ar: 'محطة عمل (Workstation)',en: 'Workstation'          } },
] as const;

const PROCESSORS = [
  { value: 'Core i9',  label: { ar: 'Intel Core i9',  en: 'Intel Core i9'  } },
  { value: 'Core i7',  label: { ar: 'Intel Core i7',  en: 'Intel Core i7'  } },
  { value: 'Core i5',  label: { ar: 'Intel Core i5',  en: 'Intel Core i5'  } },
  { value: 'Core i3',  label: { ar: 'Intel Core i3',  en: 'Intel Core i3'  } },
  { value: 'Ryzen 9',  label: { ar: 'AMD Ryzen 9',    en: 'AMD Ryzen 9'    } },
  { value: 'Ryzen 7',  label: { ar: 'AMD Ryzen 7',    en: 'AMD Ryzen 7'    } },
  { value: 'Ryzen 5',  label: { ar: 'AMD Ryzen 5',    en: 'AMD Ryzen 5'    } },
  { value: 'Apple M',  label: { ar: 'Apple Silicon (M)', en: 'Apple Silicon' } },
] as const;

const RAM_OPTIONS = [
  { value: '8',  label: '8 GB'  },
  { value: '16', label: '16 GB' },
  { value: '32', label: '32 GB' },
  { value: '64', label: '64 GB+' },
] as const;

const STORAGE_OPTIONS = [
  { value: '256',  label: '256 GB' },
  { value: '512',  label: '512 GB' },
  { value: '1000', label: '1 TB'   },
  { value: '2000', label: '2 TB+'  },
] as const;

const GPU_OPTIONS = [
  { value: 'dedicated',   label: { ar: 'كرت شاشة منفصل (ألعاب وتصميم)', en: 'Dedicated GPU (Gaming/Design)' } },
  { value: 'integrated',  label: { ar: 'كرت شاشة مدمج (إنتاجية وأعمال)',  en: 'Integrated GPU (Office/Daily)'  } },
] as const;

const POPULAR_BRANDS = [
  { value: 'Dell',   label: 'Dell'   },
  { value: 'HP',     label: 'HP'     },
  { value: 'Lenovo', label: 'Lenovo' },
  { value: 'Apple',  label: 'Apple'  },
  { value: 'ASUS',   label: 'ASUS'   },
] as const;

const CONDITIONS = [
  { value: 'new', label: { ar: 'جديد بالكرتون',  en: 'Brand New' } },
  { value: 'A',   label: { ar: 'مستعمل فئة A+', en: 'Grade A+'   } },
  { value: 'B',   label: { ar: 'مستعمل فئة B',  en: 'Grade B'    } },
] as const;

const copy = {
  ar: {
    title:       'فلتر الأجهزة المكتبية',
    reset:       'مسح الكل',
    available:   'المتوفر فقط',
    priceRange:  'نطاق السعر',
    formFactor:  'شكل وتصميم الجهاز',
    cpu:         'المعالج (CPU)',
    ram:         'الذاكرة العشوائية (RAM)',
    storage:     'سعة التخزين (SSD/HDD)',
    gpu:         'بطاقة الرسوميات (GPU)',
    brand:       'العلامة التجارية',
    condition:   'الحالة والضمان',
    min:         'من',
    max:         'إلى',
  },
  en: {
    title:       'Desktop PC Filter',
    reset:       'Reset',
    available:   'Available only',
    priceRange:  'Price Range',
    formFactor:  'Form Factor',
    cpu:         'Processor (CPU)',
    ram:         'RAM Memory',
    storage:     'Storage (SSD/HDD)',
    gpu:         'Graphics (GPU)',
    brand:       'Brand',
    condition:   'Condition',
    min:         'Min',
    max:         'Max',
  },
} as const;

export default function DesktopFilterSidebar({
  current,
  onChange,
  facets,
  language,
  isDialog = false,
}: DesktopFilterSidebarProps) {
  const t = copy[language];
  const sliderId = useId();

  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    price:      true,
    formFactor: true,
    cpu:        true,
    ram:        true,
    storage:    false,
    gpu:        false,
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
  const maxBound = 2500;
  const currentMax = current.get('max') ? Number(current.get('max')) : maxBound;

  return (
    <aside
      className={isDialog ? 'store-laptop-dialog-body' : 'store-filters store-laptop-filters'}
      aria-label={t.title}
    >
      {/* Header */}
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
                step={25}
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

      {/* 2. Form Factor */}
      <div className="store-laptop-accordion">
        <button
          type="button"
          className="store-laptop-accordion-btn"
          onClick={() => toggleSection('formFactor')}
          aria-expanded={openSections.formFactor}
        >
          <span className="flex items-center gap-2 font-bold text-sm">
            <Box size={14} className="text-indigo-500" />
            <span>{t.formFactor}</span>
            {getActiveCount('spec_formFactor') > 0 && (
              <span className="store-filter-badge">{getActiveCount('spec_formFactor')}</span>
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
                const active = isSelected('spec_formFactor', opt.value);
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => toggleArrayParam('spec_formFactor', opt.value)}
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

      {/* 3. Processor / CPU */}
      <div className="store-laptop-accordion">
        <button
          type="button"
          className="store-laptop-accordion-btn"
          onClick={() => toggleSection('cpu')}
          aria-expanded={openSections.cpu}
        >
          <span className="flex items-center gap-2 font-bold text-sm">
            <Cpu size={14} className="text-blue-500" />
            <span>{t.cpu}</span>
            {getActiveCount('cpuFamily') > 0 && (
              <span className="store-filter-badge">{getActiveCount('cpuFamily')}</span>
            )}
          </span>
          <ChevronDown
            size={15}
            className={`transition-transform duration-200 ${openSections.cpu ? 'rotate-180' : ''}`}
          />
        </button>

        {openSections.cpu && (
          <div className="store-laptop-accordion-content">
            <div className="flex flex-wrap gap-2 pt-1">
              {PROCESSORS.map(opt => {
                const active = isSelected('cpuFamily', opt.value);
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => toggleArrayParam('cpuFamily', opt.value)}
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

      {/* 4. RAM */}
      <div className="store-laptop-accordion">
        <button
          type="button"
          className="store-laptop-accordion-btn"
          onClick={() => toggleSection('ram')}
          aria-expanded={openSections.ram}
        >
          <span className="flex items-center gap-2 font-bold text-sm">
            <Cpu size={14} className="text-purple-500" />
            <span>{t.ram}</span>
            {getActiveCount('ramGB') > 0 && (
              <span className="store-filter-badge">{getActiveCount('ramGB')}</span>
            )}
          </span>
          <ChevronDown
            size={15}
            className={`transition-transform duration-200 ${openSections.ram ? 'rotate-180' : ''}`}
          />
        </button>

        {openSections.ram && (
          <div className="store-laptop-accordion-content">
            <div className="grid grid-cols-2 gap-2 pt-1">
              {RAM_OPTIONS.map(opt => {
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

      {/* 5. Storage */}
      <div className="store-laptop-accordion">
        <button
          type="button"
          className="store-laptop-accordion-btn"
          onClick={() => toggleSection('storage')}
          aria-expanded={openSections.storage}
        >
          <span className="flex items-center gap-2 font-bold text-sm">
            <HardDrive size={14} className="text-emerald-500" />
            <span>{t.storage}</span>
            {getActiveCount('storageGB') > 0 && (
              <span className="store-filter-badge">{getActiveCount('storageGB')}</span>
            )}
          </span>
          <ChevronDown
            size={15}
            className={`transition-transform duration-200 ${openSections.storage ? 'rotate-180' : ''}`}
          />
        </button>

        {openSections.storage && (
          <div className="store-laptop-accordion-content">
            <div className="grid grid-cols-2 gap-2 pt-1">
              {STORAGE_OPTIONS.map(opt => {
                const active = isSelected('storageGB', opt.value);
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => toggleArrayParam('storageGB', opt.value)}
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

      {/* 6. GPU */}
      <div className="store-laptop-accordion">
        <button
          type="button"
          className="store-laptop-accordion-btn"
          onClick={() => toggleSection('gpu')}
          aria-expanded={openSections.gpu}
        >
          <span className="flex items-center gap-2 font-bold text-sm">
            <Gamepad2 size={14} className="text-rose-500" />
            <span>{t.gpu}</span>
            {getActiveCount('gpuType') > 0 && (
              <span className="store-filter-badge">{getActiveCount('gpuType')}</span>
            )}
          </span>
          <ChevronDown
            size={15}
            className={`transition-transform duration-200 ${openSections.gpu ? 'rotate-180' : ''}`}
          />
        </button>

        {openSections.gpu && (
          <div className="store-laptop-accordion-content">
            <div className="flex flex-col gap-2 pt-1">
              {GPU_OPTIONS.map(opt => {
                const active = isSelected('gpuType', opt.value);
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => toggleArrayParam('gpuType', opt.value)}
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

      {/* 7. Brands */}
      <div className="store-laptop-accordion">
        <button
          type="button"
          className="store-laptop-accordion-btn"
          onClick={() => toggleSection('brand')}
          aria-expanded={openSections.brand}
        >
          <span className="flex items-center gap-2 font-bold text-sm">
            <Building2 size={14} className="text-amber-500" />
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

      {/* 8. Condition */}
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
