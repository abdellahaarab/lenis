import { useState, useId } from 'react';
import {
  ChevronDown,
  Cpu,
  HardDrive,
  Monitor,
  Sparkles,
  Layers,
  RotateCcw,
  Zap,
  SlidersHorizontal,
  Check,
  CheckCircle2,
  X
} from 'lucide-react';
import type { LaptopFacets } from '@aljeel/shared';
import { commerceCopy } from '@/data/commerce';

interface LaptopFilterSidebarProps {
  current: URLSearchParams;
  onChange: (next: URLSearchParams) => void;
  facets?: LaptopFacets;
  language: 'ar' | 'en';
  isDialog?: boolean;
}

export default function LaptopFilterSidebar({
  current,
  onChange,
  facets,
  language,
  isDialog = false
}: LaptopFilterSidebarProps) {
  const t = commerceCopy[language];
  const isAr = language === 'ar';
  const sliderId = useId();

  // Accordion open/close state
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    price: true,
    brand: true,
    ramGB: true,
    storageGB: true,
    gpuType: true,
    cpuFamily: false,
    screenSize: false,
    cpuGen: false,
    condition: false
  });

  const toggleSection = (key: string) => {
    setOpenSections(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // Helper to toggle array-based query parameters (e.g. brand, cpuFamily, ramGB)
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

  // Helper to update single parameter
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

  // Clear specific section only
  const clearSection = (key: string) => {
    const next = new URLSearchParams(current);
    if (key === 'price') {
      next.delete('min');
      next.delete('max');
    } else if (key === 'screenSize') {
      next.delete('screenSize');
      next.delete('touch');
    } else {
      next.delete(key);
    }
    next.delete('page');
    onChange(next);
  };

  // Quick budget helper
  const setBudget = (minVal: number | null, maxVal: number | null) => {
    const next = new URLSearchParams(current);
    const currMin = current.get('min');
    const currMax = current.get('max');
    const isSame = (minVal === null ? !currMin : currMin === String(minVal)) &&
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

  const isSelected = (key: string, value: string | number) => {
    const strVal = String(value);
    return current.getAll(key).flatMap(v => v.split(',')).includes(strVal);
  };

  const getActiveCount = (key: string) => {
    return current.getAll(key).flatMap(v => v.split(',')).filter(Boolean).length;
  };

  const hasAnyFilters = [...current.keys()].some(k => !['page', 'sort', 'q', 'category'].includes(k));

  const clearAll = () => {
    const next = new URLSearchParams();
    if (current.get('q')) next.set('q', current.get('q')!);
    if (current.get('sort')) next.set('sort', current.get('sort')!);
    onChange(next);
  };

  // Price range bounds
  const minBound = facets?.priceBounds?.min ?? 0;
  const maxBound = Math.max(facets?.priceBounds?.max ?? 3000, 1000);
  const currentMin = current.get('min') ? Number(current.get('min')) : minBound;
  const currentMax = current.get('max') ? Number(current.get('max')) : maxBound;

  const budgetPresets = [
    { label: isAr ? 'أقل من $400' : '< $400', min: null, max: 400 },
    { label: '$400 - $700', min: 400, max: 700 },
    { label: '$700 - $1200', min: 700, max: 1200 },
    { label: isAr ? 'أكثر من $1200' : '> $1200', min: 1200, max: null }
  ];

  return (
    <aside className={isDialog ? 'store-laptop-dialog-body' : 'store-filters store-laptop-filters'} aria-label={t.filters}>
      {!isDialog && (
        <div className="store-filters-header">
          <div className="flex items-center gap-2">
            <SlidersHorizontal size={16} className="text-violet-600 dark:text-violet-400" />
            <h2>
              <strong>{isAr ? 'تصفية الأجهزة الذكية' : 'Smart Device Filter'}</strong>
            </h2>
          </div>
          {hasAnyFilters && (
            <button
              type="button"
              className="store-filters-reset-link flex items-center gap-1"
              onClick={clearAll}
            >
              <RotateCcw size={12} />
              <span>{t.reset}</span>
            </button>
          )}
        </div>
      )}

      {/* Stock toggle */}
      <label className="store-filter-toggle mb-3">
        <input
          type="checkbox"
          checked={current.get('available') === 'true'}
          onChange={e => updateSingleParam('available', e.target.checked ? 'true' : null)}
        />
        <span className="store-filter-label font-bold text-violet-700 dark:text-violet-300 flex items-center gap-2">
          <CheckCircle2 size={15} className="text-emerald-500" />
          <span>{isAr ? 'الأجهزة المتوفرة للتسليم الفوري' : t.available}</span>
        </span>
      </label>

      {/* ── 1. Price Range Accordion ── */}
      <div className="store-laptop-accordion">
        <div className="flex items-center justify-between pe-3">
          <button
            type="button"
            className="store-laptop-accordion-btn flex-1"
            onClick={() => toggleSection('price')}
            aria-expanded={openSections.price}
          >
            <span className="flex items-center gap-2 font-bold text-sm">
              <span className="text-emerald-600 dark:text-emerald-400 font-extrabold text-base">$</span>
              <span>{isAr ? 'نطاق السعر والميزانية' : 'Price & Budget'}</span>
              {(current.has('min') || current.has('max')) && (
                <span className="store-filter-badge">✓</span>
              )}
            </span>
            <ChevronDown
              size={15}
              className={`transition-transform duration-200 ${openSections.price ? 'rotate-180' : ''}`}
            />
          </button>
          {(current.has('min') || current.has('max')) && (
            <button
              type="button"
              className="store-section-clear-btn"
              onClick={() => clearSection('price')}
              title={isAr ? 'مسح السعر' : 'Clear price'}
            >
              {isAr ? 'مسح' : 'Clear'}
            </button>
          )}
        </div>

        {openSections.price && (
          <div className="store-laptop-accordion-content">
            {/* Quick Budget Pills */}
            <div className="store-quick-budget-pills">
              {budgetPresets.map(b => {
                const isPresetActive =
                  (b.min === null ? !current.get('min') : current.get('min') === String(b.min)) &&
                  (b.max === null ? !current.get('max') : current.get('max') === String(b.max));
                return (
                  <button
                    key={b.label}
                    type="button"
                    onClick={() => setBudget(b.min, b.max)}
                    className={`store-budget-pill ${isPresetActive ? 'active' : ''}`}
                    aria-pressed={isPresetActive}
                  >
                    <span>{b.label}</span>
                    {isPresetActive && <Check size={12} />}
                  </button>
                );
              })}
            </div>

            {/* Min / Max Inputs */}
            <div className="store-range">
              <div className="store-range-input-wrapper">
                <span className="store-range-cur">$</span>
                <input
                  type="number"
                  min={minBound}
                  max={maxBound}
                  aria-label={t.min}
                  placeholder={isAr ? 'الحد الأدنى' : 'Min'}
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
                  placeholder={isAr ? 'الحد الأعلى' : 'Max'}
                  value={current.get('max') ?? ''}
                  onChange={e => updateSingleParam('max', e.target.value)}
                />
              </div>
            </div>

            {/* Slider */}
            <div className="mt-3 px-1">
              <label htmlFor={sliderId} className="sr-only">
                {isAr ? 'شريط السعر' : 'Price slider'}
              </label>
              <input
                id={sliderId}
                type="range"
                min={minBound}
                max={maxBound}
                step={50}
                value={currentMax}
                onChange={e => updateSingleParam('max', e.target.value)}
                className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-violet-600 dark:bg-gray-700"
              />
              <div className="flex justify-between text-[11px] text-gray-500 mt-1 font-semibold">
                <span>${minBound}</span>
                <span className="text-violet-600 dark:text-violet-400 font-extrabold">${currentMax}</span>
                <span>${maxBound}+</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── 2. Brand Accordion (Grid Pills) ── */}
      {facets?.brands && facets.brands.length > 0 && (
        <div className="store-laptop-accordion">
          <div className="flex items-center justify-between pe-3">
            <button
              type="button"
              className="store-laptop-accordion-btn flex-1"
              onClick={() => toggleSection('brand')}
              aria-expanded={openSections.brand}
            >
              <span className="flex items-center gap-2 font-bold text-sm">
                <Layers size={14} className="text-indigo-500" />
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
            {getActiveCount('brand') > 0 && (
              <button
                type="button"
                className="store-section-clear-btn"
                onClick={() => clearSection('brand')}
              >
                {isAr ? 'مسح' : 'Clear'}
              </button>
            )}
          </div>

          {openSections.brand && (
            <div className="store-laptop-accordion-content">
              <div className="store-filter-pills-grid">
                {facets.brands.map(b => {
                  const checked = isSelected('brand', b.value);
                  const disabled = b.count === 0 && !checked;
                  return (
                    <button
                      key={b.value}
                      type="button"
                      disabled={disabled}
                      onClick={() => !disabled && toggleArrayParam('brand', b.value)}
                      className={`store-filter-chip justify-between ${checked ? 'store-filter-chip-active' : ''} ${disabled ? 'opacity-40 cursor-not-allowed' : ''}`}
                      aria-pressed={checked}
                    >
                      <span className="font-bold truncate">{b.title[language] || b.value}</span>
                      <span className="store-filter-count shrink-0">
                        {checked ? '✓' : b.count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── 3. RAM Accordion (Tactile Pills) ── */}
      {facets?.ramOptions && facets.ramOptions.length > 0 && (
        <div className="store-laptop-accordion">
          <div className="flex items-center justify-between pe-3">
            <button
              type="button"
              className="store-laptop-accordion-btn flex-1"
              onClick={() => toggleSection('ramGB')}
              aria-expanded={openSections.ramGB}
            >
              <span className="flex items-center gap-2 font-bold text-sm">
                <Zap size={14} className="text-amber-500" />
                <span>{t.ram}</span>
                {getActiveCount('ramGB') > 0 && (
                  <span className="store-filter-badge">{getActiveCount('ramGB')}</span>
                )}
              </span>
              <ChevronDown
                size={15}
                className={`transition-transform duration-200 ${openSections.ramGB ? 'rotate-180' : ''}`}
              />
            </button>
            {getActiveCount('ramGB') > 0 && (
              <button
                type="button"
                className="store-section-clear-btn"
                onClick={() => clearSection('ramGB')}
              >
                {isAr ? 'مسح' : 'Clear'}
              </button>
            )}
          </div>

          {openSections.ramGB && (
            <div className="store-laptop-accordion-content">
              <div className="store-filter-pills-grid store-filter-pills-grid-3">
                {facets.ramOptions.map(r => {
                  const checked = isSelected('ramGB', r.value);
                  const disabled = r.count === 0 && !checked;
                  return (
                    <button
                      key={r.value}
                      type="button"
                      disabled={disabled}
                      onClick={() => !disabled && toggleArrayParam('ramGB', r.value)}
                      className={`store-filter-chip flex-col gap-0.5 py-2 ${checked ? 'store-filter-chip-active' : ''} ${disabled ? 'opacity-40 cursor-not-allowed' : ''}`}
                      aria-pressed={checked}
                    >
                      <span className="font-extrabold text-sm">{r.value} GB</span>
                      <span className="text-[10px] opacity-80">
                        {checked ? (isAr ? 'محدد ✓' : 'Selected') : `(${r.count})`}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── 4. Storage (SSD) Accordion (Tactile Pills) ── */}
      {facets?.storageOptions && facets.storageOptions.length > 0 && (
        <div className="store-laptop-accordion">
          <div className="flex items-center justify-between pe-3">
            <button
              type="button"
              className="store-laptop-accordion-btn flex-1"
              onClick={() => toggleSection('storageGB')}
              aria-expanded={openSections.storageGB}
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
                className={`transition-transform duration-200 ${openSections.storageGB ? 'rotate-180' : ''}`}
              />
            </button>
            {getActiveCount('storageGB') > 0 && (
              <button
                type="button"
                className="store-section-clear-btn"
                onClick={() => clearSection('storageGB')}
              >
                {isAr ? 'مسح' : 'Clear'}
              </button>
            )}
          </div>

          {openSections.storageGB && (
            <div className="store-laptop-accordion-content">
              <div className="store-filter-pills-grid store-filter-pills-grid-3">
                {facets.storageOptions.map(s => {
                  const checked = isSelected('storageGB', s.value);
                  const disabled = s.count === 0 && !checked;
                  const label = Number(s.value) >= 1000
                    ? `${Math.round(Number(s.value) / 1000)} TB`
                    : `${s.value} GB`;
                  return (
                    <button
                      key={s.value}
                      type="button"
                      disabled={disabled}
                      onClick={() => !disabled && toggleArrayParam('storageGB', s.value)}
                      className={`store-filter-chip flex-col gap-0.5 py-2 ${checked ? 'store-filter-chip-active' : ''} ${disabled ? 'opacity-40 cursor-not-allowed' : ''}`}
                      aria-pressed={checked}
                    >
                      <span className="font-extrabold text-sm">{label}</span>
                      <span className="text-[10px] opacity-80">
                        {checked ? (isAr ? 'محدد ✓' : 'Selected') : `(${s.count})`}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── 5. Graphics / GPU Accordion (High-Standard Visual Cards) ── */}
      {facets?.gpuTypes && facets.gpuTypes.length > 0 && (
        <div className="store-laptop-accordion">
          <div className="flex items-center justify-between pe-3">
            <button
              type="button"
              className="store-laptop-accordion-btn flex-1"
              onClick={() => toggleSection('gpuType')}
              aria-expanded={openSections.gpuType}
            >
              <span className="flex items-center gap-2 font-bold text-sm">
                <Sparkles size={14} className="text-purple-500" />
                <span>{t.gpu}</span>
                {getActiveCount('gpuType') > 0 && (
                  <span className="store-filter-badge">{getActiveCount('gpuType')}</span>
                )}
              </span>
              <ChevronDown
                size={15}
                className={`transition-transform duration-200 ${openSections.gpuType ? 'rotate-180' : ''}`}
              />
            </button>
            {getActiveCount('gpuType') > 0 && (
              <button
                type="button"
                className="store-section-clear-btn"
                onClick={() => clearSection('gpuType')}
              >
                {isAr ? 'مسح' : 'Clear'}
              </button>
            )}
          </div>

          {openSections.gpuType && (
            <div className="store-laptop-accordion-content">
              <div className="store-filter-pills-grid store-filter-pills-grid-1">
                {facets.gpuTypes.map(gt => {
                  const checked = isSelected('gpuType', gt.value);
                  const disabled = gt.count === 0 && !checked;
                  const isDedicated = gt.value === 'dedicated';
                  return (
                    <button
                      key={gt.value}
                      type="button"
                      disabled={disabled}
                      onClick={() => !disabled && toggleArrayParam('gpuType', gt.value)}
                      className={`store-filter-chip justify-between p-3 ${checked ? 'store-filter-chip-active' : ''} ${disabled ? 'opacity-40 cursor-not-allowed' : ''}`}
                      aria-pressed={checked}
                    >
                      <div className="text-start">
                        <strong className="block text-xs">
                          {isDedicated
                            ? (isAr ? 'كرت منفصل (ألعاب ومونتاج)' : 'Dedicated GPU (Gaming/Design)')
                            : (isAr ? 'كرت مدمج (مكتبي ودراسة)' : 'Integrated Graphics (Office/Study)')}
                        </strong>
                        <span className="text-[10px] opacity-70">
                          {isDedicated
                            ? (isAr ? 'NVIDIA GeForce / RTX' : 'NVIDIA GeForce / RTX')
                            : (isAr ? 'Intel Iris / AMD Radeon' : 'Intel Iris / AMD Radeon')}
                        </span>
                      </div>
                      <span className="store-filter-count shrink-0">
                        {checked ? '✓' : gt.count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── 6. Processor Family Accordion ── */}
      {facets?.cpuFamilies && facets.cpuFamilies.length > 0 && (
        <div className="store-laptop-accordion">
          <div className="flex items-center justify-between pe-3">
            <button
              type="button"
              className="store-laptop-accordion-btn flex-1"
              onClick={() => toggleSection('cpuFamily')}
              aria-expanded={openSections.cpuFamily}
            >
              <span className="flex items-center gap-2 font-bold text-sm">
                <Cpu size={14} className="text-blue-500" />
                <span>{t.cpuFamily}</span>
                {getActiveCount('cpuFamily') > 0 && (
                  <span className="store-filter-badge">{getActiveCount('cpuFamily')}</span>
                )}
              </span>
              <ChevronDown
                size={15}
                className={`transition-transform duration-200 ${openSections.cpuFamily ? 'rotate-180' : ''}`}
              />
            </button>
            {getActiveCount('cpuFamily') > 0 && (
              <button
                type="button"
                className="store-section-clear-btn"
                onClick={() => clearSection('cpuFamily')}
              >
                {isAr ? 'مسح' : 'Clear'}
              </button>
            )}
          </div>

          {openSections.cpuFamily && (
            <div className="store-laptop-accordion-content">
              <div className="store-filter-pills-grid">
                {facets.cpuFamilies.map(cf => {
                  const checked = isSelected('cpuFamily', cf.value);
                  const disabled = cf.count === 0 && !checked;
                  return (
                    <button
                      key={cf.value}
                      type="button"
                      disabled={disabled}
                      onClick={() => !disabled && toggleArrayParam('cpuFamily', cf.value)}
                      className={`store-filter-chip justify-between ${checked ? 'store-filter-chip-active' : ''} ${disabled ? 'opacity-40 cursor-not-allowed' : ''}`}
                      aria-pressed={checked}
                    >
                      <span className="font-bold truncate">{cf.value}</span>
                      <span className="store-filter-count shrink-0">
                        {checked ? '✓' : cf.count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── 7. Screen Size & Touch Accordion ── */}
      {((facets?.screenSizes && facets.screenSizes.length > 0) || (facets?.touchOptions && facets.touchOptions.length > 0)) && (
        <div className="store-laptop-accordion">
          <div className="flex items-center justify-between pe-3">
            <button
              type="button"
              className="store-laptop-accordion-btn flex-1"
              onClick={() => toggleSection('screenSize')}
              aria-expanded={openSections.screenSize}
            >
              <span className="flex items-center gap-2 font-bold text-sm">
                <Monitor size={14} className="text-cyan-500" />
                <span>{t.screenSize}</span>
                {(getActiveCount('screenSize') > 0 || current.has('touch')) && (
                  <span className="store-filter-badge">
                    {getActiveCount('screenSize') + (current.has('touch') ? 1 : 0)}
                  </span>
                )}
              </span>
              <ChevronDown
                size={15}
                className={`transition-transform duration-200 ${openSections.screenSize ? 'rotate-180' : ''}`}
              />
            </button>
            {(getActiveCount('screenSize') > 0 || current.has('touch')) && (
              <button
                type="button"
                className="store-section-clear-btn"
                onClick={() => clearSection('screenSize')}
              >
                {isAr ? 'مسح' : 'Clear'}
              </button>
            )}
          </div>

          {openSections.screenSize && (
            <div className="store-laptop-accordion-content">
              {/* Touchscreen quick toggle chip */}
              <div className="mb-2">
                <button
                  type="button"
                  onClick={() => updateSingleParam('touch', current.get('touch') === 'true' ? null : 'true')}
                  className={`store-filter-chip w-full justify-between py-2 ${current.get('touch') === 'true' ? 'store-filter-chip-active' : ''}`}
                  aria-pressed={current.get('touch') === 'true'}
                >
                  <span className="font-bold flex items-center gap-1.5">
                    <span>{isAr ? 'شاشة تعمل باللمس (Touch)' : 'Touchscreen'}</span>
                  </span>
                  {current.get('touch') === 'true' && <Check size={14} />}
                </button>
              </div>

              {/* Screen Sizes */}
              {facets?.screenSizes && facets.screenSizes.length > 0 && (
                <div className="store-filter-pills-grid store-filter-pills-grid-3">
                  {facets.screenSizes.map(sc => {
                    const checked = isSelected('screenSize', sc.value);
                    const disabled = sc.count === 0 && !checked;
                    return (
                      <button
                        key={sc.value}
                        type="button"
                        disabled={disabled}
                        onClick={() => !disabled && toggleArrayParam('screenSize', sc.value)}
                        className={`store-filter-chip flex-col gap-0.5 py-2 ${checked ? 'store-filter-chip-active' : ''} ${disabled ? 'opacity-40 cursor-not-allowed' : ''}`}
                        aria-pressed={checked}
                      >
                        <span className="font-extrabold text-sm">{sc.value}"</span>
                        <span className="text-[10px] opacity-80">
                          {checked ? (isAr ? 'محدد ✓' : 'Selected') : `(${sc.count})`}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── 8. CPU Generation Accordion ── */}
      {facets?.cpuGens && facets.cpuGens.length > 0 && (
        <div className="store-laptop-accordion">
          <div className="flex items-center justify-between pe-3">
            <button
              type="button"
              className="store-laptop-accordion-btn flex-1"
              onClick={() => toggleSection('cpuGen')}
              aria-expanded={openSections.cpuGen}
            >
              <span className="flex items-center gap-2 font-bold text-sm">
                <Cpu size={14} className="text-teal-500" />
                <span>{t.cpuGen}</span>
                {getActiveCount('cpuGen') > 0 && (
                  <span className="store-filter-badge">{getActiveCount('cpuGen')}</span>
                )}
              </span>
              <ChevronDown
                size={15}
                className={`transition-transform duration-200 ${openSections.cpuGen ? 'rotate-180' : ''}`}
              />
            </button>
            {getActiveCount('cpuGen') > 0 && (
              <button
                type="button"
                className="store-section-clear-btn"
                onClick={() => clearSection('cpuGen')}
              >
                {isAr ? 'مسح' : 'Clear'}
              </button>
            )}
          </div>

          {openSections.cpuGen && (
            <div className="store-laptop-accordion-content">
              <div className="store-filter-pills-grid store-filter-pills-grid-3">
                {facets.cpuGens.map(cg => {
                  const checked = isSelected('cpuGen', cg.value);
                  const disabled = cg.count === 0 && !checked;
                  return (
                    <button
                      key={cg.value}
                      type="button"
                      disabled={disabled}
                      onClick={() => !disabled && toggleArrayParam('cpuGen', cg.value)}
                      className={`store-filter-chip flex-col gap-0.5 py-2 ${checked ? 'store-filter-chip-active' : ''} ${disabled ? 'opacity-40 cursor-not-allowed' : ''}`}
                      aria-pressed={checked}
                    >
                      <span className="font-extrabold text-xs">{cg.title[language] || `Gen ${cg.value}`}</span>
                      <span className="text-[10px] opacity-80">
                        {checked ? (isAr ? 'محدد ✓' : 'Selected') : `(${cg.count})`}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── 9. Condition Accordion ── */}
      {facets?.conditions && facets.conditions.length > 0 && (
        <div className="store-laptop-accordion">
          <div className="flex items-center justify-between pe-3">
            <button
              type="button"
              className="store-laptop-accordion-btn flex-1"
              onClick={() => toggleSection('condition')}
              aria-expanded={openSections.condition}
            >
              <span className="flex items-center gap-2 font-bold text-sm">
                <Check size={14} className="text-emerald-600" />
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
            {getActiveCount('condition') > 0 && (
              <button
                type="button"
                className="store-section-clear-btn"
                onClick={() => clearSection('condition')}
              >
                {isAr ? 'مسح' : 'Clear'}
              </button>
            )}
          </div>

          {openSections.condition && (
            <div className="store-laptop-accordion-content">
              <div className="store-filter-pills-grid store-filter-pills-grid-1">
                {facets.conditions.map(c => {
                  const checked = isSelected('condition', c.value);
                  const disabled = c.count === 0 && !checked;
                  return (
                    <button
                      key={c.value}
                      type="button"
                      disabled={disabled}
                      onClick={() => !disabled && toggleArrayParam('condition', c.value)}
                      className={`store-filter-chip justify-between ${checked ? 'store-filter-chip-active' : ''} ${disabled ? 'opacity-40 cursor-not-allowed' : ''}`}
                      aria-pressed={checked}
                    >
                      <span className="font-bold text-xs">{c.title[language] || c.value}</span>
                      <span className="store-filter-count shrink-0">
                        {checked ? '✓' : c.count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Dialog bottom reset link */}
      {isDialog && hasAnyFilters && (
        <div className="pt-3 border-t border-gray-100 dark:border-gray-800 mt-2">
          <button
            type="button"
            className="store-filters-reset-link w-full justify-center flex items-center gap-1.5 py-1"
            onClick={clearAll}
          >
            <RotateCcw size={13} />
            <span>{isAr ? 'مسح كافة الفلاتر المحددة' : t.reset}</span>
          </button>
        </div>
      )}
    </aside>
  );
}
