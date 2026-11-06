import { useState, type ReactNode } from 'react';
import { Check, ChevronDown, Layers, RotateCcw } from 'lucide-react';

interface FacetItem { value: string; count: number; title?: string }
interface SpecFacet {
  key: string;
  title: { ar: string; en: string };
  valueType: string;
  unit?: string | null;
  values: FacetItem[];
}
interface AllFilterSidebarProps {
  current: URLSearchParams;
  onChange: (p: URLSearchParams) => void;
  facets?: {
    brand: FacetItem[];
    condition: FacetItem[];
    collection: FacetItem[];
    specs?: SpecFacet[];
  };
  language: 'ar' | 'en';
  isDialog?: boolean;
}

const CONDITIONS = [
  { value: 'new', label: { ar: 'جديد بالكرتون', en: 'Brand new' } },
  { value: 'A', label: { ar: 'مستعمل فئة A+', en: 'Grade A+' } },
  { value: 'B', label: { ar: 'مستعمل فئة B', en: 'Grade B' } },
] as const;

const text = {
  ar: { title: 'فلاتر الكتالوج', reset: 'مسح الكل', available: 'متوفر الآن', price: 'السعر بالدولار', min: 'من', max: 'إلى', brand: 'العلامة التجارية', condition: 'الحالة', collections: 'المجموعات', specs: 'المواصفات', more: 'عرض المزيد', less: 'عرض أقل', count: 'خيارات' },
  en: { title: 'Catalog filters', reset: 'Clear all', available: 'In stock now', price: 'Price in USD', min: 'Min', max: 'Max', brand: 'Brand', condition: 'Condition', collections: 'Collections', specs: 'Specifications', more: 'Show more', less: 'Show less', count: 'options' },
} as const;

export default function AllFilterSidebar({ current, onChange, facets, language, isDialog = false }: AllFilterSidebarProps) {
  const t = text[language];
  const [open, setOpen] = useState<Record<string, boolean>>({ price: true, brand: true });
  const [showAllBrands, setShowAllBrands] = useState(false);
  const [showAllCollections, setShowAllCollections] = useState(false);
  const [showAllSpecs, setShowAllSpecs] = useState(false);
  const [expandedSpecs, setExpandedSpecs] = useState<Record<string, boolean>>({});
  const activeTotal = [...current.entries()].reduce((total, [key, value]) =>
    ['brand', 'condition', 'collection'].includes(key) || key.startsWith('spec_') || key === 'available' || key === 'min' || key === 'max'
      ? total + value.split(',').filter(Boolean).length : total, 0);

  const update = (key: string, value: string | null) => {
    const next = new URLSearchParams(current);
    if (value) next.set(key, value); else next.delete(key);
    next.delete('page');
    onChange(next);
  };

  const toggle = (key: string, value: string) => {
    const next = new URLSearchParams(current);
    const values = next.getAll(key).flatMap(item => item.split(',')).filter(Boolean);
    next.delete(key);
    (values.includes(value) ? values.filter(item => item !== value) : [...values, value]).forEach(item => next.append(key, item));
    next.delete('page');
    onChange(next);
  };

  const selected = (key: string, value: string) => current.getAll(key).flatMap(item => item.split(',')).includes(value);
  const clear = () => {
    const next = new URLSearchParams();
    if (current.has('q')) next.set('q', current.get('q')!);
    if (current.has('sort')) next.set('sort', current.get('sort')!);
    onChange(next);
  };

  const section = (id: string, title: string, count: number, children: ReactNode, defaultOpen = false) => {
    const isOpen = open[id] ?? defaultOpen;
    return <section className={`all-filter-section${isOpen ? ' is-open' : ''}`} key={id}>
      <button type="button" className="all-filter-heading" aria-expanded={isOpen} onClick={() => setOpen(prev => ({ ...prev, [id]: !isOpen }))}>
        <span>{title}</span>
        <span className="all-filter-heading-meta">{count > 0 && <b>{count}</b>}<ChevronDown size={15} /></span>
      </button>
      {isOpen && <div className="all-filter-content">{children}</div>}
    </section>;
  };

  const brandOptions = facets?.brand ?? [];
  const collectionOptions = facets?.collection ?? [];
  const specs = (facets?.specs ?? []).filter(spec => spec.values.length).sort((a, b) => b.values.reduce((n, item) => n + item.count, 0) - a.values.reduce((n, item) => n + item.count, 0));

  return <aside className={`${isDialog ? 'store-laptop-dialog-body all-filter-dialog' : 'store-filters store-laptop-filters all-filter-sidebar'}`} aria-label={t.title}>
    {!isDialog && <header className="all-filter-header">
      <span className="all-filter-title"><Layers size={16} />{t.title}{activeTotal > 0 && <b>{activeTotal}</b>}</span>
      {activeTotal > 0 && <button type="button" className="store-filters-reset-link" onClick={clear}><RotateCcw size={12} />{t.reset}</button>}
    </header>}

    <label className={`all-filter-stock${current.get('available') === 'true' ? ' is-active' : ''}`}>
      <input type="checkbox" checked={current.get('available') === 'true'} onChange={event => update('available', event.target.checked ? 'true' : null)} />
      <span className="all-filter-stock-mark"><Check size={13} /></span>
      <span>{t.available}</span>
      {current.get('available') === 'true' && <b>1</b>}
    </label>

    {section('price', t.price, Number(Boolean(current.get('min'))) + Number(Boolean(current.get('max'))), <div className="all-filter-price-range">
      <label><span>{t.min}</span><span className="all-filter-price-input"><b>$</b><input type="number" min="0" aria-label={t.min} placeholder="0" value={current.get('min') ?? ''} onChange={event => update('min', event.target.value || null)} /></span></label>
      <span className="all-filter-range-dash">—</span>
      <label><span>{t.max}</span><span className="all-filter-price-input"><b>$</b><input type="number" min="0" aria-label={t.max} placeholder="∞" value={current.get('max') ?? ''} onChange={event => update('max', event.target.value || null)} /></span></label>
    </div>, true)}

    {brandOptions.length > 0 && section('brand', t.brand, current.getAll('brand').length, <>
      <div className="all-filter-options all-filter-options-chips">
        {(showAllBrands ? brandOptions : brandOptions.slice(0, 6)).map(item => <button type="button" key={item.value} className={`all-filter-option-chip${selected('brand', item.value) ? ' is-selected' : ''}`} aria-pressed={selected('brand', item.value)} onClick={() => toggle('brand', item.value)}>
          <span>{item.title || item.value}</span><small>{item.count}</small>
        </button>)}
      </div>
      {brandOptions.length > 6 && <button type="button" className="all-filter-more" onClick={() => setShowAllBrands(value => !value)}>{showAllBrands ? t.less : `${t.more} (${brandOptions.length - 6})`}</button>}
    </>)}

    {Boolean(facets?.condition.length) && section('condition', t.condition, current.getAll('condition').length, <div className="all-filter-options">
      {CONDITIONS.filter(option => facets?.condition.some(item => item.value === option.value)).map(option => {
        const count = facets?.condition.find(item => item.value === option.value)?.count ?? 0;
        return <label className="all-filter-check-row" key={option.value}><input type="checkbox" checked={selected('condition', option.value)} onChange={() => toggle('condition', option.value)} /><span>{option.label[language]}</span><small>{count}</small></label>;
      })}
    </div>)}

    {collectionOptions.length > 0 && section('collection', t.collections, current.getAll('collection').length, <>
      <div className="all-filter-options">
        {(showAllCollections ? collectionOptions : collectionOptions.slice(0, 5)).map(item => <label className="all-filter-check-row" key={item.value}><input type="checkbox" checked={selected('collection', item.value)} onChange={() => toggle('collection', item.value)} /><span>{item.title || item.value}</span><small>{item.count}</small></label>)}
      </div>
      {collectionOptions.length > 5 && <button type="button" className="all-filter-more" onClick={() => setShowAllCollections(value => !value)}>{showAllCollections ? t.less : `${t.more} (${collectionOptions.length - 5})`}</button>}
    </>)}

    {specs.length > 0 && section('specs', t.specs, specs.reduce((count, item) => count + current.getAll(`spec_${item.key}`).length, 0), <div className="all-filter-specs">
      {(showAllSpecs ? specs : specs.slice(0, 5)).map(spec => {
        const param = `spec_${spec.key}`;
        const valuesOpen = expandedSpecs[spec.key] ?? current.has(param);
        const values = [...spec.values].sort((a, b) => b.count - a.count);
        return <div className="all-filter-spec" key={spec.key}>
          <button type="button" className="all-filter-spec-title" aria-expanded={valuesOpen} onClick={() => setExpandedSpecs(prev => ({ ...prev, [spec.key]: !valuesOpen }))}>
            <span>{spec.title[language] || spec.title.ar || spec.key}{spec.unit ? ` (${spec.unit})` : ''}</span><span>{current.getAll(param).length > 0 && <b>{current.getAll(param).length}</b>}<ChevronDown size={13} /></span>
          </button>
          {valuesOpen && <div className="all-filter-options all-filter-spec-options">{values.slice(0, 8).map(item => {
            const label = spec.valueType === 'boolean' ? (item.value === 'true' ? (language === 'ar' ? 'نعم' : 'Yes') : (language === 'ar' ? 'لا' : 'No')) : `${item.title || item.value}${spec.unit ? ` ${spec.unit}` : ''}`;
            return <label className="all-filter-check-row" key={item.value}><input type="checkbox" checked={selected(param, item.value)} onChange={() => toggle(param, item.value)} /><span>{label}</span><small>{item.count}</small></label>;
          })}</div>}
        </div>;
      })}
      {specs.length > 5 && <button type="button" className="all-filter-more" onClick={() => setShowAllSpecs(value => !value)}>{showAllSpecs ? t.less : `${t.more} (${specs.length - 5})`}</button>}
    </div>)}
  </aside>;
}
