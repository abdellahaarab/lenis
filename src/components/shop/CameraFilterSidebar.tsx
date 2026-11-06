import { useState, useId } from 'react';
import {
  ChevronDown,
  Cctv,
  RotateCcw,
  SlidersHorizontal,
  Wifi,
  Shield,
  Eye,
  Sun,
  HardDrive,
  Building2
} from 'lucide-react';

interface FacetItem {
  value: string;
  count: number;
  title?: string;
}

interface CameraFilterSidebarProps {
  current: URLSearchParams;
  onChange: (p: URLSearchParams) => void;
  facets?: {
    brand: FacetItem[];
    condition: FacetItem[];
  } | undefined;
  language: 'ar' | 'en';
  isDialog?: boolean;
}

const CAMERA_TYPES = [
  { value: 'indoor',  label: { ar: 'كاميرات داخلية (Indoor)',         en: 'Indoor'              } },
  { value: 'outdoor', label: { ar: 'كاميرات خارجية ضد المطر (Outdoor)', en: 'Outdoor Weatherproof' } },
  { value: 'ptz',     label: { ar: 'كاميرات متحركة 360° (PTZ)',        en: 'PTZ 360° Pan/Tilt'   } },
  { value: 'solar',   label: { ar: 'طاقة شمسية + شريحة 4G',           en: 'Solar & 4G Wireless' } },
] as const;

const CONNECTIVITY = [
  { value: 'wifi',   label: { ar: 'واي فاي لاسلكية ذكية (Wi-Fi)', en: 'Wi-Fi Wireless'   } },
  { value: 'poe',    label: { ar: 'شبكية كابل إيثرنت (PoE IP)',   en: 'PoE Ethernet (IP)' } },
  { value: 'analog', label: { ar: 'تناظرية كواكسل (Analog / DVR)', en: 'Analog (Coaxial)'  } },
] as const;

const RESOLUTIONS = [
  { value: '2MP', label: { ar: '2MP (Full HD 1080p)', en: '2MP (1080p FHD)' } },
  { value: '4MP', label: { ar: '4MP (2K Quad HD)',     en: '4MP (2K QHD)'     } },
  { value: '5MP', label: { ar: '5MP (فائقة الدقة)',     en: '5MP HD'           } },
  { value: '8MP', label: { ar: '8MP (4K Ultra HD)',    en: '8MP (4K UHD)'     } },
] as const;

const NIGHT_VISION = [
  { value: 'color', label: { ar: 'رؤية ليلية ملونة 24/7 (ColorVu)', en: 'Full-Color Night Vision' } },
  { value: 'ir',    label: { ar: 'أشعة تحت الحمراء (IR)',           en: 'Infrared (IR)'            } },
] as const;

const SMART_FEATURES = [
  { value: 'ai_detect', label: { ar: 'كشف ذكي للأشخاص والسيارات', en: 'AI Human/Vehicle Detection' } },
  { value: 'two_way',   label: { ar: 'صوت ثنائي الاتجاه (مايك وسماعة)', en: 'Two-Way Audio' } },
  { value: 'siren',     label: { ar: 'صفارة إنذار وضوء تحذيري', en: 'Active Siren & Light' } },
] as const;

const STORAGE_MODES = [
  { value: 'sd',    label: { ar: 'ذاكرة كرت SD مدمجة', en: 'MicroSD Card' } },
  { value: 'nvr',   label: { ar: 'جهاز تسجيل شبكي NVR/DVR', en: 'NVR / DVR System' } },
  { value: 'cloud', label: { ar: 'تخزين سحابي Cloud', en: 'Cloud Storage' } },
] as const;

const POPULAR_BRANDS = [
  { value: 'Hikvision', label: 'Hikvision' },
  { value: 'Dahua',     label: 'Dahua' },
  { value: 'Ezviz',     label: 'Ezviz' },
  { value: 'Imou',      label: 'Imou' },
  { value: 'TP-Link',   label: 'TP-Link Tapo' },
  { value: 'Uniview',   label: 'Uniview' },
] as const;

const CONDITIONS = [
  { value: 'new', label: { ar: 'جديد بالضمان', en: 'Brand New' } },
] as const;

const copy = {
  ar: {
    title:         'فلتر كاميرات المراقبة',
    reset:         'مسح الكل',
    available:     'المتوفر فقط',
    priceRange:    'نطاق السعر',
    cameraType:    'بيئة ونوع الكاميرا',
    connectivity:  'طريقة التوصيل والشبكة',
    resolution:    'دقة التصوير (Megapixel)',
    nightVision:   'الرؤية الليلية',
    smartFeatures: 'الذكاء الاصطناعي والميزات',
    storageMode:   'طريقة حفظ التسجيلات',
    brand:         'العلامة التجارية',
    condition:     'الحالة',
    min:           'من',
    max:           'إلى',
  },
  en: {
    title:         'CCTV & Security Cameras',
    reset:         'Reset',
    available:     'Available only',
    priceRange:    'Price Range',
    cameraType:    'Camera Environment / Type',
    connectivity:  'Connectivity / Protocol',
    resolution:    'Resolution (MP)',
    nightVision:   'Night Vision',
    smartFeatures: 'Smart AI Features',
    storageMode:   'Storage Mode',
    brand:         'Brand',
    condition:     'Condition',
    min:           'Min',
    max:           'Max',
  },
} as const;

export default function CameraFilterSidebar({
  current,
  onChange,
  facets,
  language,
  isDialog = false,
}: CameraFilterSidebarProps) {
  const t = copy[language];
  const sliderId = useId();

  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    price:         true,
    cameraType:    true,
    connectivity:  true,
    resolution:    true,
    nightVision:   false,
    smartFeatures: false,
    storageMode:   false,
    brand:         true,
    condition:     false,
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
  const maxBound = 500;
  const currentMax = current.get('max') ? Number(current.get('max')) : maxBound;

  return (
    <aside
      className={isDialog ? 'store-laptop-dialog-body' : 'store-filters store-laptop-filters'}
      aria-label={t.title}
    >
      {!isDialog && (
        <div className="store-filters-header">
          <div className="flex items-center gap-2">
            <Cctv size={16} className="text-violet-600 dark:text-violet-400" />
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

      {/* 2. Camera Type */}
      <div className="store-laptop-accordion">
        <button
          type="button"
          className="store-laptop-accordion-btn"
          onClick={() => toggleSection('cameraType')}
          aria-expanded={openSections.cameraType}
        >
          <span className="flex items-center gap-2 font-bold text-sm">
            <Shield size={14} className="text-blue-500" />
            <span>{t.cameraType}</span>
            {getActiveCount('spec_cameraType') > 0 && (
              <span className="store-filter-badge">{getActiveCount('spec_cameraType')}</span>
            )}
          </span>
          <ChevronDown
            size={15}
            className={`transition-transform duration-200 ${openSections.cameraType ? 'rotate-180' : ''}`}
          />
        </button>

        {openSections.cameraType && (
          <div className="store-laptop-accordion-content">
            <div className="flex flex-col gap-2 pt-1">
              {CAMERA_TYPES.map(opt => {
                const active = isSelected('spec_cameraType', opt.value);
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => toggleArrayParam('spec_cameraType', opt.value)}
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

      {/* 4. Resolution */}
      <div className="store-laptop-accordion">
        <button
          type="button"
          className="store-laptop-accordion-btn"
          onClick={() => toggleSection('resolution')}
          aria-expanded={openSections.resolution}
        >
          <span className="flex items-center gap-2 font-bold text-sm">
            <Eye size={14} className="text-purple-500" />
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
            <div className="grid grid-cols-2 gap-2 pt-1">
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

      {/* 5. Night Vision */}
      <div className="store-laptop-accordion">
        <button
          type="button"
          className="store-laptop-accordion-btn"
          onClick={() => toggleSection('nightVision')}
          aria-expanded={openSections.nightVision}
        >
          <span className="flex items-center gap-2 font-bold text-sm">
            <Sun size={14} className="text-amber-500" />
            <span>{t.nightVision}</span>
            {getActiveCount('spec_nightVision') > 0 && (
              <span className="store-filter-badge">{getActiveCount('spec_nightVision')}</span>
            )}
          </span>
          <ChevronDown
            size={15}
            className={`transition-transform duration-200 ${openSections.nightVision ? 'rotate-180' : ''}`}
          />
        </button>

        {openSections.nightVision && (
          <div className="store-laptop-accordion-content">
            <div className="flex flex-col gap-2 pt-1">
              {NIGHT_VISION.map(opt => {
                const active = isSelected('spec_nightVision', opt.value);
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => toggleArrayParam('spec_nightVision', opt.value)}
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

      {/* 6. Smart Features */}
      <div className="store-laptop-accordion">
        <button
          type="button"
          className="store-laptop-accordion-btn"
          onClick={() => toggleSection('smartFeatures')}
          aria-expanded={openSections.smartFeatures}
        >
          <span className="flex items-center gap-2 font-bold text-sm">
            <span>{t.smartFeatures}</span>
            {getActiveCount('spec_smartFeature') > 0 && (
              <span className="store-filter-badge">{getActiveCount('spec_smartFeature')}</span>
            )}
          </span>
          <ChevronDown
            size={15}
            className={`transition-transform duration-200 ${openSections.smartFeatures ? 'rotate-180' : ''}`}
          />
        </button>

        {openSections.smartFeatures && (
          <div className="store-laptop-accordion-content">
            <div className="flex flex-col gap-2 pt-1">
              {SMART_FEATURES.map(opt => {
                const active = isSelected('spec_smartFeature', opt.value);
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => toggleArrayParam('spec_smartFeature', opt.value)}
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

      {/* 7. Storage Mode */}
      <div className="store-laptop-accordion">
        <button
          type="button"
          className="store-laptop-accordion-btn"
          onClick={() => toggleSection('storageMode')}
          aria-expanded={openSections.storageMode}
        >
          <span className="flex items-center gap-2 font-bold text-sm">
            <HardDrive size={14} className="text-emerald-500" />
            <span>{t.storageMode}</span>
            {getActiveCount('spec_storageMode') > 0 && (
              <span className="store-filter-badge">{getActiveCount('spec_storageMode')}</span>
            )}
          </span>
          <ChevronDown
            size={15}
            className={`transition-transform duration-200 ${openSections.storageMode ? 'rotate-180' : ''}`}
          />
        </button>

        {openSections.storageMode && (
          <div className="store-laptop-accordion-content">
            <div className="flex flex-col gap-2 pt-1">
              {STORAGE_MODES.map(opt => {
                const active = isSelected('spec_storageMode', opt.value);
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => toggleArrayParam('spec_storageMode', opt.value)}
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
