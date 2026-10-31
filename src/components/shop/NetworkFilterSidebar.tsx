import { useState, useId } from 'react';
import {
  ChevronDown,
  Wifi,
  RotateCcw,
  SlidersHorizontal,
  Network,
  Zap,
  Globe,
  Building2
} from 'lucide-react';

interface FacetItem {
  value: string;
  count: number;
  title?: string;
}

interface NetworkFilterSidebarProps {
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
  { value: 'router',   label: { ar: 'راوترات Wi-Fi منزلية ومكتبية',    en: 'Wi-Fi Routers'    } },
  { value: 'mesh',     label: { ar: 'منظومات مش لتغطية كاملة (Mesh)', en: 'Mesh Wi-Fi Systems' } },
  { value: 'switch',   label: { ar: 'سويتشات وموزعات شبكة (Switches)', en: 'Network Switches' } },
  { value: 'extender', label: { ar: 'مقويات إشارة Wi-Fi Extenders',    en: 'Range Extenders'  } },
  { value: '4g_5g',    label: { ar: 'راوترات شريحة SIM (4G / 5G)',     en: '4G/5G Cellular'   } },
  { value: 'adapter',  label: { ar: 'كروت ودونجل Wi-Fi للكمبيوتر',    en: 'Wi-Fi Adapters'   } },
] as const;

const WIFI_STANDARDS = [
  { value: 'wifi6', label: { ar: 'Wi-Fi 6 (AX) - الأسرع والأكثر استقراراً', en: 'Wi-Fi 6 (802.11ax)' } },
  { value: 'wifi5', label: { ar: 'Wi-Fi 5 (AC) - عالي السرعة قياسي',       en: 'Wi-Fi 5 (802.11ac)' } },
  { value: 'wifi7', label: { ar: 'Wi-Fi 7 - الجيل الثوري الجديد',            en: 'Wi-Fi 7 (802.11be)' } },
] as const;

const PORT_SPEEDS = [
  { value: 'gigabit', label: { ar: 'جيجابت Gigabit (1000 Mbps)', en: 'Gigabit (1000 Mbps)' } },
  { value: 'fast',    label: { ar: 'ميجابت Fast (100 Mbps)',     en: 'Fast Ethernet (100M)' } },
  { value: 'multi_g', label: { ar: 'فائق السرعة (2.5G / 10G)',   en: 'Multi-Gig (2.5G/10G)' } },
] as const;

const POE_SUPPORT = [
  { value: 'poe',    label: { ar: 'يدعم نقل الطاقة عبر الشبكة (PoE)', en: 'PoE Supported' } },
  { value: 'non_poe',label: { ar: 'بدون PoE (طاقة قياسية)',              en: 'Standard Power' } },
] as const;

const POPULAR_BRANDS = [
  { value: 'TP-Link',  label: 'TP-Link' },
  { value: 'Cisco',    label: 'Cisco' },
  { value: 'Ubiquiti', label: 'Ubiquiti UniFi' },
  { value: 'MikroTik', label: 'MikroTik' },
  { value: 'Tenda',    label: 'Tenda' },
  { value: 'D-Link',   label: 'D-Link' },
] as const;

const CONDITIONS = [
  { value: 'new', label: { ar: 'جديد بالضمان', en: 'Brand New' } },
] as const;

const copy = {
  ar: {
    title:        'فلتر أجهزة ومعدات الشبكات',
    reset:        'مسح الكل',
    available:    'المتوفر فقط',
    priceRange:   'نطاق السعر',
    deviceType:   'نوع الجهاز الشبكي',
    wifiStandard: 'معيار وسرعة الـ Wi-Fi',
    portSpeed:    'سرعة منافذ الشبكة LAN',
    poe:          'دعم الطاقة عبر الشبكة PoE',
    brand:        'العلامة التجارية',
    condition:    'الحالة',
    min:          'من',
    max:          'إلى',
  },
  en: {
    title:        'Networking Filter',
    reset:        'Reset',
    available:    'Available only',
    priceRange:   'Price Range',
    deviceType:   'Device Type',
    wifiStandard: 'Wi-Fi Standard',
    portSpeed:    'Port Speed',
    poe:          'PoE Power Support',
    brand:        'Brand',
    condition:    'Condition',
    min:          'Min',
    max:          'Max',
  },
} as const;

export default function NetworkFilterSidebar({
  current,
  onChange,
  facets,
  language,
  isDialog = false,
}: NetworkFilterSidebarProps) {
  const t = copy[language];
  const sliderId = useId();

  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    price:        true,
    deviceType:   true,
    wifiStandard: true,
    portSpeed:    false,
    poe:          false,
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
  const maxBound = 600;
  const currentMax = current.get('max') ? Number(current.get('max')) : maxBound;

  return (
    <aside
      className={isDialog ? 'store-laptop-dialog-body' : 'store-filters store-laptop-filters'}
      aria-label={t.title}
    >
      {!isDialog && (
        <div className="store-filters-header">
          <div className="flex items-center gap-2">
            <Wifi size={16} className="text-violet-600 dark:text-violet-400" />
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

      {/* 2. Device Type */}
      <div className="store-laptop-accordion">
        <button
          type="button"
          className="store-laptop-accordion-btn"
          onClick={() => toggleSection('deviceType')}
          aria-expanded={openSections.deviceType}
        >
          <span className="flex items-center gap-2 font-bold text-sm">
            <Network size={14} className="text-blue-500" />
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

      {/* 3. Wi-Fi Standard */}
      <div className="store-laptop-accordion">
        <button
          type="button"
          className="store-laptop-accordion-btn"
          onClick={() => toggleSection('wifiStandard')}
          aria-expanded={openSections.wifiStandard}
        >
          <span className="flex items-center gap-2 font-bold text-sm">
            <Wifi size={14} className="text-emerald-500" />
            <span>{t.wifiStandard}</span>
            {getActiveCount('spec_wifiGen') > 0 && (
              <span className="store-filter-badge">{getActiveCount('spec_wifiGen')}</span>
            )}
          </span>
          <ChevronDown
            size={15}
            className={`transition-transform duration-200 ${openSections.wifiStandard ? 'rotate-180' : ''}`}
          />
        </button>

        {openSections.wifiStandard && (
          <div className="store-laptop-accordion-content">
            <div className="flex flex-col gap-2 pt-1">
              {WIFI_STANDARDS.map(opt => {
                const active = isSelected('spec_wifiGen', opt.value);
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => toggleArrayParam('spec_wifiGen', opt.value)}
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

      {/* 4. Port Speed */}
      <div className="store-laptop-accordion">
        <button
          type="button"
          className="store-laptop-accordion-btn"
          onClick={() => toggleSection('portSpeed')}
          aria-expanded={openSections.portSpeed}
        >
          <span className="flex items-center gap-2 font-bold text-sm">
            <Zap size={14} className="text-amber-500" />
            <span>{t.portSpeed}</span>
            {getActiveCount('spec_portSpeed') > 0 && (
              <span className="store-filter-badge">{getActiveCount('spec_portSpeed')}</span>
            )}
          </span>
          <ChevronDown
            size={15}
            className={`transition-transform duration-200 ${openSections.portSpeed ? 'rotate-180' : ''}`}
          />
        </button>

        {openSections.portSpeed && (
          <div className="store-laptop-accordion-content">
            <div className="flex flex-col gap-2 pt-1">
              {PORT_SPEEDS.map(opt => {
                const active = isSelected('spec_portSpeed', opt.value);
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => toggleArrayParam('spec_portSpeed', opt.value)}
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

      {/* 5. PoE Support */}
      <div className="store-laptop-accordion">
        <button
          type="button"
          className="store-laptop-accordion-btn"
          onClick={() => toggleSection('poe')}
          aria-expanded={openSections.poe}
        >
          <span className="flex items-center gap-2 font-bold text-sm">
            <span>{t.poe}</span>
            {getActiveCount('spec_poe') > 0 && (
              <span className="store-filter-badge">{getActiveCount('spec_poe')}</span>
            )}
          </span>
          <ChevronDown
            size={15}
            className={`transition-transform duration-200 ${openSections.poe ? 'rotate-180' : ''}`}
          />
        </button>

        {openSections.poe && (
          <div className="store-laptop-accordion-content">
            <div className="flex flex-col gap-2 pt-1">
              {POE_SUPPORT.map(opt => {
                const active = isSelected('spec_poe', opt.value);
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => toggleArrayParam('spec_poe', opt.value)}
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
