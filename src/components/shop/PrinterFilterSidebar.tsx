import { useState, useId } from 'react';
import {
  ChevronDown,
  Printer,
  RotateCcw,
  SlidersHorizontal,
  Wifi,
  FileText,
  Palette,
  Layers,
  Building2
} from 'lucide-react';

interface FacetItem {
  value: string;
  count: number;
  title?: string;
}

interface PrinterFilterSidebarProps {
  current: URLSearchParams;
  onChange: (p: URLSearchParams) => void;
  facets?: {
    brand: FacetItem[];
    condition: FacetItem[];
  } | undefined;
  language: 'ar' | 'en';
  isDialog?: boolean;
}

const PRINTER_TYPES = [
  { value: 'laser',   label: { ar: 'طابعات ليزرية سريعة (Laser)',       en: 'Laser Printers'   } },
  { value: 'inktank', label: { ar: 'حبر مستمر اقتصادي (Ink Tank)',     en: 'Ink Tank System' } },
  { value: 'pos',     label: { ar: 'طابعات فواتير وإيصالات حرارية POS', en: 'Thermal POS'      } },
  { value: 'barcode', label: { ar: 'طابعات باركود وملصقات شحن',        en: 'Barcode & Label'  } },
] as const;

const COLOR_OUTPUT = [
  { value: 'mono',  label: { ar: 'أبيض وأسود فقط (Monochrome)', en: 'Monochrome (B&W)' } },
  { value: 'color', label: { ar: 'ألوان متكاملة (Color)',        en: 'Color Printing'   } },
] as const;

const FUNCTIONS = [
  { value: 'aio',    label: { ar: 'متعددة الوظائف All-in-One (طباعة + سكنر + نسخ)', en: 'All-in-One (Print/Scan/Copy)' } },
  { value: 'single', label: { ar: 'طباعة فقط (Single Function)',                     en: 'Print Only'                    } },
] as const;

const CONNECTIVITY = [
  { value: 'wifi',     label: { ar: 'واي فاي وطباعة مباشرة من الجوال', en: 'Wi-Fi Mobile Print' } },
  { value: 'ethernet', label: { ar: 'كابل شبكة LAN لمشاركة المكتب',    en: 'Ethernet LAN'        } },
  { value: 'usb',      label: { ar: 'كابل USB مباشر للكمبيوتر',         en: 'USB Direct'          } },
] as const;

const DUPLEX = [
  { value: 'auto',   label: { ar: 'طباعة وجهين تلقائية (Auto Duplex)', en: 'Auto Two-Sided' } },
  { value: 'manual', label: { ar: 'وجه واحد / يدوي',                     en: 'Manual / Single' } },
] as const;

const POPULAR_BRANDS = [
  { value: 'HP',       label: 'HP' },
  { value: 'Canon',    label: 'Canon' },
  { value: 'Epson',    label: 'Epson' },
  { value: 'Brother',  label: 'Brother' },
  { value: 'Xprinter', label: 'Xprinter' },
] as const;

const CONDITIONS = [
  { value: 'new', label: { ar: 'جديد أصلي بالكرتون', en: 'Brand New' } },
] as const;

const copy = {
  ar: {
    title:        'فلتر الطابعات وتجهيزات المكاتب',
    reset:        'مسح الكل',
    available:    'المتوفر فقط',
    priceRange:   'نطاق السعر',
    printerType:  'تقنية ونوع الطابعة',
    colorOutput:  'ألوان الطباعة',
    functions:    'الوظائف (شاملة / طباعة فقط)',
    connectivity: 'طريقة الاتصال والتوصيل',
    duplex:       'الطباعة على الوجهين (Duplex)',
    brand:        'العلامة التجارية',
    condition:    'الحالة',
    min:          'من',
    max:          'إلى',
  },
  en: {
    title:        'Printers & POS Filter',
    reset:        'Reset',
    available:    'Available only',
    priceRange:   'Price Range',
    printerType:  'Print Technology',
    colorOutput:  'Color Output',
    functions:    'Functions (AIO / Single)',
    connectivity: 'Connectivity',
    duplex:       'Two-Sided (Duplex)',
    brand:        'Brand',
    condition:    'Condition',
    min:          'Min',
    max:          'Max',
  },
} as const;

export default function PrinterFilterSidebar({
  current,
  onChange,
  facets,
  language,
  isDialog = false,
}: PrinterFilterSidebarProps) {
  const t = copy[language];
  const sliderId = useId();

  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    price:        true,
    printerType:  true,
    colorOutput:  true,
    functions:    false,
    connectivity: false,
    duplex:       false,
    brand:        true,
    condition:    false,
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
  const maxBound = 800;
  const currentMax = current.get('max') ? Number(current.get('max')) : maxBound;

  return (
    <aside
      className={isDialog ? 'store-laptop-dialog-body' : 'store-filters store-laptop-filters'}
      aria-label={t.title}
    >
      {!isDialog && (
        <div className="store-filters-header">
          <div className="flex items-center gap-2">
            <Printer size={16} className="text-violet-600 dark:text-violet-400" />
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
                step={10}
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

      {/* 2. Printer Type */}
      <div className="store-laptop-accordion">
        <button
          type="button"
          className="store-laptop-accordion-btn"
          onClick={() => toggleSection('printerType')}
          aria-expanded={openSections.printerType}
        >
          <span className="flex items-center gap-2 font-bold text-sm">
            <FileText size={14} className="text-blue-500" />
            <span>{t.printerType}</span>
            {getActiveCount('spec_printerType') > 0 && (
              <span className="store-filter-badge">{getActiveCount('spec_printerType')}</span>
            )}
          </span>
          <ChevronDown
            size={15}
            className={`transition-transform duration-200 ${openSections.printerType ? 'rotate-180' : ''}`}
          />
        </button>

        {openSections.printerType && (
          <div className="store-laptop-accordion-content">
            <div className="flex flex-col gap-2 pt-1">
              {PRINTER_TYPES.map(opt => {
                const active = isSelected('spec_printerType', opt.value);
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => toggleArrayParam('spec_printerType', opt.value)}
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

      {/* 3. Color Output */}
      <div className="store-laptop-accordion">
        <button
          type="button"
          className="store-laptop-accordion-btn"
          onClick={() => toggleSection('colorOutput')}
          aria-expanded={openSections.colorOutput}
        >
          <span className="flex items-center gap-2 font-bold text-sm">
            <Palette size={14} className="text-pink-500" />
            <span>{t.colorOutput}</span>
            {getActiveCount('spec_color') > 0 && (
              <span className="store-filter-badge">{getActiveCount('spec_color')}</span>
            )}
          </span>
          <ChevronDown
            size={15}
            className={`transition-transform duration-200 ${openSections.colorOutput ? 'rotate-180' : ''}`}
          />
        </button>

        {openSections.colorOutput && (
          <div className="store-laptop-accordion-content">
            <div className="flex flex-col gap-2 pt-1">
              {COLOR_OUTPUT.map(opt => {
                const active = isSelected('spec_color', opt.value);
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => toggleArrayParam('spec_color', opt.value)}
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

      {/* 4. Functions (AIO / Single) */}
      <div className="store-laptop-accordion">
        <button
          type="button"
          className="store-laptop-accordion-btn"
          onClick={() => toggleSection('functions')}
          aria-expanded={openSections.functions}
        >
          <span className="flex items-center gap-2 font-bold text-sm">
            <Layers size={14} className="text-indigo-500" />
            <span>{t.functions}</span>
            {getActiveCount('spec_allInOne') > 0 && (
              <span className="store-filter-badge">{getActiveCount('spec_allInOne')}</span>
            )}
          </span>
          <ChevronDown
            size={15}
            className={`transition-transform duration-200 ${openSections.functions ? 'rotate-180' : ''}`}
          />
        </button>

        {openSections.functions && (
          <div className="store-laptop-accordion-content">
            <div className="flex flex-col gap-2 pt-1">
              {FUNCTIONS.map(opt => {
                const active = isSelected('spec_allInOne', opt.value);
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => toggleArrayParam('spec_allInOne', opt.value)}
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

      {/* 5. Connectivity */}
      <div className="store-laptop-accordion">
        <button
          type="button"
          className="store-laptop-accordion-btn"
          onClick={() => toggleSection('connectivity')}
          aria-expanded={openSections.connectivity}
        >
          <span className="flex items-center gap-2 font-bold text-sm">
            <Wifi size={14} className="text-teal-500" />
            <span>{t.connectivity}</span>
            {getActiveCount('spec_wireless') > 0 && (
              <span className="store-filter-badge">{getActiveCount('spec_wireless')}</span>
            )}
          </span>
          <ChevronDown
            size={15}
            className={`transition-transform duration-200 ${openSections.connectivity ? 'rotate-180' : ''}`}
          />
        </button>

        {openSections.connectivity && (
          <div className="store-laptop-accordion-content">
            <div className="flex flex-col gap-2 pt-1">
              {CONNECTIVITY.map(opt => {
                const active = isSelected('spec_wireless', opt.value);
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => toggleArrayParam('spec_wireless', opt.value)}
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

      {/* 6. Duplex */}
      <div className="store-laptop-accordion">
        <button
          type="button"
          className="store-laptop-accordion-btn"
          onClick={() => toggleSection('duplex')}
          aria-expanded={openSections.duplex}
        >
          <span className="flex items-center gap-2 font-bold text-sm">
            <span>{t.duplex}</span>
            {getActiveCount('spec_duplex') > 0 && (
              <span className="store-filter-badge">{getActiveCount('spec_duplex')}</span>
            )}
          </span>
          <ChevronDown
            size={15}
            className={`transition-transform duration-200 ${openSections.duplex ? 'rotate-180' : ''}`}
          />
        </button>

        {openSections.duplex && (
          <div className="store-laptop-accordion-content">
            <div className="flex flex-col gap-2 pt-1">
              {DUPLEX.map(opt => {
                const active = isSelected('spec_duplex', opt.value);
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => toggleArrayParam('spec_duplex', opt.value)}
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
