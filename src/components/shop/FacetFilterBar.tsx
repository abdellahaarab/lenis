import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Check, RotateCcw } from 'lucide-react';
import type { Facet, SearchResult } from '@/data/commerce';

type FilterOption = { key: string; label: string; values: Facet[]; multi?: boolean };
type Props = {
  data: SearchResult | null;
  current: URLSearchParams;
  language: 'ar' | 'en';
  onChange: (params: URLSearchParams) => void;
  getLabel: (key: string, value: string) => string;
};

export default function FacetFilterBar({ data, current, language, onChange, getLabel }: Props) {
  const [openKey, setOpenKey] = useState<string | null>(null);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const ar = language === 'ar';

  const options: FilterOption[] = [
    ...(data?.facets.brand.length ? [{ key: 'brand', label: ar ? 'العلامة التجارية' : 'Brand', values: data.facets.brand, multi: true }] : []),
    ...(data?.facets.condition.length ? [{ key: 'condition', label: ar ? 'الحالة' : 'Condition', values: data.facets.condition, multi: true }] : []),
    ...(data?.facets.collection.some(facet => facet.count > 0) ? [{ key: 'collection', label: ar ? 'المجموعات' : 'Collections', values: data.facets.collection.filter(facet => facet.count > 0).map(facet => ({ ...facet, title: getLabel('collection', facet.value) })), multi: true }] : []),
    ...(data?.facets.specs.filter(spec => spec.filterable && spec.values.some(value => value.count > 0)).map(spec => ({
      key: `spec_${spec.key}`,
      label: spec.title[language] || spec.key,
      values: spec.values.filter(value => value.count > 0),
      multi: spec.valueType === 'multi' || spec.valueType === 'single' || spec.valueType === 'boolean'
    })) ?? [])
  ];

  useEffect(() => {
    const closeOnOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (!rootRef.current?.contains(target) && !popoverRef.current?.contains(target)) setOpenKey(null);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpenKey(null);
    };
    const closeOnScroll = () => setOpenKey(null);
    document.addEventListener('mousedown', closeOnOutside);
    document.addEventListener('keydown', closeOnEscape);
    window.addEventListener('scroll', closeOnScroll, true);
    return () => {
      document.removeEventListener('mousedown', closeOnOutside);
      document.removeEventListener('keydown', closeOnEscape);
      window.removeEventListener('scroll', closeOnScroll, true);
    };
  }, []);

  const selectedValues = (key: string) => current.getAll(key).flatMap(value => value.split(',')).filter(Boolean);
  const setValues = (key: string, values: string[]) => {
    const next = new URLSearchParams(current);
    next.delete(key);
    values.forEach(value => next.append(key, value));
    next.delete('page');
    onChange(next);
  };
  const toggleValue = (key: string, value: string) => {
    const selected = selectedValues(key);
    setValues(key, selected.includes(value) ? selected.filter(item => item !== value) : [...selected, value]);
  };
  const availableActive = current.get('available') === 'true';

  const toggleMenu = (key: string, event: React.MouseEvent<HTMLButtonElement>) => {
    if (openKey === key) {
      setOpenKey(null);
      return;
    }
    const rect = event.currentTarget.getBoundingClientRect();
    const width = Math.min(310, window.innerWidth - 32);
    const preferredLeft = ar ? rect.right - width : rect.left;
    const left = Math.max(16, Math.min(preferredLeft, window.innerWidth - width - 16));
    const below = rect.bottom + 7;
    const top = below + 300 <= window.innerHeight ? below : Math.max(8, rect.top - 307);
    setPosition({ top, left });
    setOpenKey(key);
  };

  const renderFacet = (option: FilterOption) => {
    const selected = selectedValues(option.key);
    return (
      <div className="store-facet-menu" key={option.key}>
        <button
          type="button"
          className={`store-facet-trigger ${openKey === option.key ? 'is-open' : ''} ${selected.length ? 'has-selection' : ''}`}
          aria-expanded={openKey === option.key}
          onClick={event => toggleMenu(option.key, event)}
        >
          <span>{option.label}</span>
          {selected.length > 0 && <span className="store-facet-count">{selected.length}</span>}
          <ChevronDown size={14} />
        </button>
      </div>
    );
  };

  const resetFilters = () => {
    const next = new URLSearchParams(current);
    for (const key of [...next.keys()]) if (!['q', 'sort', 'category'].includes(key)) next.delete(key);
    onChange(next);
  };

  const activeOption = options.find(option => option.key === openKey);

  return (
    <div className="store-facet-bar" ref={rootRef} aria-label={ar ? 'فلاتر المنتجات' : 'Product filters'}>
      <div className="store-facet-scroll">
        {options.map(renderFacet)}
        <button
          type="button"
          className={`store-facet-trigger ${availableActive ? 'has-selection' : ''}`}
          aria-pressed={availableActive}
          onClick={() => { const next = new URLSearchParams(current); availableActive ? next.delete('available') : next.set('available', 'true'); next.delete('page'); onChange(next); }}
        >
          <span>{ar ? 'متوفر الآن' : 'Available now'}</span>
          {availableActive ? <Check size={14} /> : <ChevronDown size={14} />}
        </button>
        {(availableActive || options.some(option => selectedValues(option.key).length > 0)) && (
          <button type="button" className="store-facet-reset" onClick={resetFilters}>
            <RotateCcw size={13} />{ar ? 'مسح الفلاتر' : 'Clear filters'}
          </button>
        )}
      </div>

      {openKey && position && typeof document !== 'undefined' && createPortal(
        <div
          ref={popoverRef}
          className="store-facet-popover"
          style={{ top: position.top, left: position.left }}
          role="group"
          aria-label={activeOption?.label}
        >
          {activeOption ? (
            <>
              <div className="store-facet-popover-heading">
                <strong>{activeOption.label}</strong>
                {selectedValues(activeOption.key).length > 0 && <button type="button" onClick={() => setValues(activeOption.key, [])}>{ar ? 'مسح' : 'Clear'}</button>}
              </div>
              <div className="store-facet-options">
                {activeOption.values.map(facet => {
                  const checked = selectedValues(activeOption.key).includes(facet.value);
                  return (
                    <button
                      type="button"
                      key={facet.value}
                      role="checkbox"
                      aria-checked={checked}
                      className={`store-facet-option ${checked ? 'is-selected' : ''}`}
                      onClick={() => activeOption.multi ? toggleValue(activeOption.key, facet.value) : setValues(activeOption.key, checked ? [] : [facet.value])}
                    >
                      <span className="store-facet-checkbox">{checked && <Check size={12} />}</span>
                      <span className="store-facet-option-label">{getLabel(activeOption.key, facet.value)}</span>
                      {facet.count > 0 && <span className="store-facet-option-count">{facet.count}</span>}
                    </button>
                  );
                })}
              </div>
            </>
          ) : null}
        </div>,
        document.body
      )}
    </div>
  );
}
