import { useState, useId } from 'react';
import {
  ChevronDown,
  Headphones,
  RotateCcw,
  SlidersHorizontal,
  Wifi,
  Volume2,
  Mic,
  Sparkles,
  Building2
} from 'lucide-react';

interface FacetItem {
  value: string;
  count: number;
  title?: string;
}

interface AudioFilterSidebarProps {
  current: URLSearchParams;
  onChange: (p: URLSearchParams) => void;
  facets?: {
    brand: FacetItem[];
    condition: FacetItem[];
  } | undefined;
  language: 'ar' | 'en';
  isDialog?: boolean;
}

const AUDIO_TYPES = [
  { value: 'gaming_headset', label: { ar: 'سماعات رأس جيمنج محيطية 7.1',   en: 'Gaming Headsets (7.1)' } },
  { value: 'over_ear',       label: { ar: 'سماعات رأس عازلة (Over-Ear)',   en: 'Over-Ear Headphones'   } },
  { value: 'tws',            label: { ar: 'سماعات أذن إيربودز (TWS)',       en: 'TWS Wireless Earbuds'  } },
  { value: 'speakers',       label: { ar: 'مكبرات صوت وساوند بار مكتبي',     en: 'Speakers & Soundbars'  } },
  { value: 'mic',            label: { ar: 'ميكروفونات تسجيل واستوديو وبث', en: 'Microphones (Pod/Live)'} },
] as const;

const CONNECTIVITY = [
  { value: 'bluetooth', label: { ar: 'بلوتوث لاسلكي (Bluetooth)',      en: 'Bluetooth'          } },
  { value: '2.4g',      label: { ar: 'وايرلس دونجل 2.4G منخفض التأخير', en: '2.4GHz Wireless'    } },
  { value: 'wired',     label: { ar: 'سلكي (3.5mm AUX / USB DAC)',      en: 'Wired (3.5mm / USB)'} },
] as const;

const ANC_OPTIONS = [
  { value: 'true',  label: { ar: 'عزل ضوضاء نشط ذكي (ANC)', en: 'Active Noise Cancelling' } },
  { value: 'false', label: { ar: 'عزل طبيعي / قياسي',          en: 'Passive Isolation'        } },
] as const;

const FEATURES = [
  { value: 'mic',       label: { ar: 'ميكروفون مدمج نقي مع فلتر نويز', en: 'Noise-Cancelling Mic' } },
  { value: 'rgb',       label: { ar: 'إضاءة RGB جمالية',                en: 'RGB Lighting'        } },
  { value: 'surround',  label: { ar: 'صوت محيطي ثلاثي الأبعاد Spatial', en: 'Spatial 3D Audio'    } },
] as const;

const POPULAR_BRANDS = [
  { value: 'Sony',      label: 'Sony' },
  { value: 'JBL',       label: 'JBL' },
  { value: 'HyperX',    label: 'HyperX' },
  { value: 'Logitech',  label: 'Logitech' },
  { value: 'Redragon',  label: 'Redragon' },
  { value: 'Soundcore', label: 'Anker Soundcore' },
  { value: 'Razer',     label: 'Razer' },
] as const;

const CONDITIONS = [
  { value: 'new', label: { ar: 'جديد بالكرتون', en: 'Brand New' } },
  { value: 'A',   label: { ar: 'مستعمل فئة A+', en: 'Grade A+' } },
] as const;

const copy = {
  ar: {
    title:        'فلتر الصوتيات والسماعات',
    reset:        'مسح الكل',
    available:    'المتوفر فقط',
    priceRange:   'نطاق السعر',
    audioType:    'نوع الجهاز الصوتي',
    connectivity: 'طريقة الاتصال والتوصيل',
    anc:          'عزل الضوضاء (Noise Cancelling)',
    features:     'الميزات والتقنيات',
    brand:        'العلامة التجارية',
    condition:    'الحالة',
    min:          'من',
    max:          'إلى',
  },
  en: {
    title:        'Audio & Headsets Filter',
    reset:        'Reset',
    available:    'Available only',
    priceRange:   'Price Range',
    audioType:    'Audio Device Type',
    connectivity: 'Connectivity',
    anc:          'Noise Cancelling (ANC)',
    features:     'Features',
    brand:        'Brand',
    condition:    'Condition',
    min:          'Min',
    max:          'Max',
  },
} as const;

export default function AudioFilterSidebar({
  current,
  onChange,
  facets,
  language,
  isDialog = false,
}: AudioFilterSidebarProps) {
  const t = copy[language];
  const sliderId = useId();

  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    price:        true,
    audioType:    true,
    connectivity: true,
    anc:          false,
    features:     false,
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
  const maxBound = 400;
  const currentMax = current.get('max') ? Number(current.get('max')) : maxBound;

  return (
    <aside
      className={isDialog ? 'store-laptop-dialog-body' : 'store-filters store-laptop-filters'}
      aria-label={t.title}
    >
      {!isDialog && (
        <div className="store-filters-header">
          <div className="flex items-center gap-2">
            <Headphones size={16} className="text-violet-600 dark:text-violet-400" />
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

      {/* 2. Audio Type */}
      <div className="store-laptop-accordion">
        <button
          type="button"
          className="store-laptop-accordion-btn"
          onClick={() => toggleSection('audioType')}
          aria-expanded={openSections.audioType}
        >
          <span className="flex items-center gap-2 font-bold text-sm">
            <Volume2 size={14} className="text-blue-500" />
            <span>{t.audioType}</span>
            {getActiveCount('spec_audioType') > 0 && (
              <span className="store-filter-badge">{getActiveCount('spec_audioType')}</span>
            )}
          </span>
          <ChevronDown
            size={15}
            className={`transition-transform duration-200 ${openSections.audioType ? 'rotate-180' : ''}`}
          />
        </button>

        {openSections.audioType && (
          <div className="store-laptop-accordion-content">
            <div className="flex flex-col gap-2 pt-1">
              {AUDIO_TYPES.map(opt => {
                const active = isSelected('spec_audioType', opt.value);
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => toggleArrayParam('spec_audioType', opt.value)}
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

      {/* 3. Connectivity */}
      <div className="store-laptop-accordion">
        <button
          type="button"
          className="store-laptop-accordion-btn"
          onClick={() => toggleSection('connectivity')}
          aria-expanded={openSections.connectivity}
        >
          <span className="flex items-center gap-2 font-bold text-sm">
            <Wifi size={14} className="text-indigo-500" />
            <span>{t.connectivity}</span>
            {getActiveCount('spec_connectivity') > 0 && (
              <span className="store-filter-badge">{getActiveCount('spec_connectivity')}</span>
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
                const active = isSelected('spec_connectivity', opt.value);
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => toggleArrayParam('spec_connectivity', opt.value)}
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

      {/* 4. Active Noise Cancelling */}
      <div className="store-laptop-accordion">
        <button
          type="button"
          className="store-laptop-accordion-btn"
          onClick={() => toggleSection('anc')}
          aria-expanded={openSections.anc}
        >
          <span className="flex items-center gap-2 font-bold text-sm">
            <span>{t.anc}</span>
            {getActiveCount('spec_anc') > 0 && (
              <span className="store-filter-badge">{getActiveCount('spec_anc')}</span>
            )}
          </span>
          <ChevronDown
            size={15}
            className={`transition-transform duration-200 ${openSections.anc ? 'rotate-180' : ''}`}
          />
        </button>

        {openSections.anc && (
          <div className="store-laptop-accordion-content">
            <div className="flex flex-col gap-2 pt-1">
              {ANC_OPTIONS.map(opt => {
                const active = isSelected('spec_anc', opt.value);
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => toggleArrayParam('spec_anc', opt.value)}
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

      {/* 5. Features */}
      <div className="store-laptop-accordion">
        <button
          type="button"
          className="store-laptop-accordion-btn"
          onClick={() => toggleSection('features')}
          aria-expanded={openSections.features}
        >
          <span className="flex items-center gap-2 font-bold text-sm">
            <Sparkles size={14} className="text-pink-500" />
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

      {/* 6. Brands */}
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

      {/* 7. Condition */}
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
