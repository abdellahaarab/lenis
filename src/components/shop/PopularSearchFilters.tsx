import { useMemo } from 'react';
import { Check } from 'lucide-react';
import type { SearchResult } from '@/data/commerce';

type PopularOption = { key: string; value: string; label: string; count: number };
type Props = {
  data: SearchResult | null;
  current: URLSearchParams;
  language: 'ar' | 'en';
  onChange: (params: URLSearchParams) => void;
  getLabel: (key: string, value: string) => string;
};

export default function PopularSearchFilters({ data, current, language, onChange, getLabel }: Props) {
  const isAr = language === 'ar';
  const options = useMemo(() => {
    if (!data?.total) return [] as PopularOption[];
    const result: PopularOption[] = [];
    const seen = new Set<string>();
    const add = (key: string, value: string | number, label: string, count: number) => {
      const id = `${key}:${value}`;
      if (count > 0 && !seen.has(id)) {
        seen.add(id);
        result.push({ key, value: String(value), label, count });
      }
    };

    // Specialized laptop counts are computed on the server over every matching
    // catalog result, not just the current 24 visible cards.
    const laptop = data.laptopFacets;
    if (laptop) {
      [...laptop.ramOptions].sort((a, b) => b.count - a.count).slice(0, 1)
        .forEach(option => add('ramGB', option.value, option.title?.[language] || `${option.value} GB`, option.count));
      [...laptop.cpuFamilies].sort((a, b) => b.count - a.count).slice(0, 1)
        .forEach(option => add('cpuFamily', option.value, option.title?.[language] || option.value, option.count));
      [...laptop.cpuGens].sort((a, b) => b.count - a.count).slice(0, 1)
        .forEach(option => add('cpuGen', option.value, option.title?.[language] || `${isAr ? 'الجيل' : 'Gen'} ${option.value}`, option.count));
      [...laptop.screenSizes].sort((a, b) => b.count - a.count).slice(0, 1)
        .forEach(option => add('screenSize', option.value, option.title?.[language] || `${option.value}\"`, option.count));
      [...laptop.storageOptions].sort((a, b) => b.count - a.count).slice(0, 1)
        .forEach(option => add('storageGB', option.value, option.title?.[language] || `${option.value} GB SSD`, option.count));
      const touch = laptop.touchOptions.find(option => option.value === 'true' && option.count > 0);
      if (touch) add('touch', 'true', isAr ? 'شاشة لمس' : 'Touchscreen', touch.count);
    }

    // Only offer collections that contain products in this exact search/category result.
    data.facets.collection
      .filter(option => option.count > 0)
      .sort((a, b) => b.count - a.count)
      .slice(0, 3)
      .forEach(option => add('collection', option.value, getLabel('collection', option.value), option.count));

    // Generic filter facets come from the same server result and include
    // disjunctive counts, so applying a chip uses the exact same facet value.
    const laptopKeys = new Set(['ramGB', 'cpuFamily', 'cpuGen', 'screenSize', 'storageGB', 'touch']);
    const generic = data.facets.specs
      .filter(field => field.filterable && !laptopKeys.has(field.key))
      .flatMap(field => field.values.map(value => ({
        key: `spec_${field.key}`,
        value: value.value,
        label: `${field.title[language]}: ${getLabel(`spec_${field.key}`, value.value)}`,
        count: value.count,
      })))
      .filter(option => option.count > 0)
      .sort((a, b) => b.count - a.count)
      .slice(0, Math.max(0, 10 - result.length));
    generic.forEach(option => add(option.key, option.value, option.label, option.count));

    if (result.length < 10) {
      [...data.facets.condition]
        .sort((a, b) => b.count - a.count)
        .forEach(option => add('condition', option.value, getLabel('condition', option.value), option.count));
    }
    if (result.length < 10 && data.facets.brand.length > 1) {
      [...data.facets.brand]
        .sort((a, b) => b.count - a.count)
        .forEach(option => add('brand', option.value, option.title || option.value, option.count));
    }
    return result.slice(0, 12);
  }, [data, getLabel, isAr, language]);

  if (!options.length) return null;
  const isSelected = (key: string, value: string) => current.getAll(key).flatMap(v => v.split(',')).includes(value);
  const toggle = (key: string, value: string) => {
    const next = new URLSearchParams(current);
    const existing = next.getAll(key).flatMap(v => v.split(',')).filter(Boolean);
    next.delete(key);
    (existing.includes(value) ? existing.filter(v => v !== value) : [...existing, value]).forEach(v => next.append(key, v));
    next.delete('page');
    onChange(next);
  };

  return (
    <div className="store-popular-filters" role="group" aria-label={isAr ? 'فلاتر سريعة' : 'Quick filters'}>
      <div className="store-popular-header"><span className="store-popular-title">{isAr ? 'فلاتر سريعة' : 'Quick filters'}</span></div>
      <div className="store-popular-options">
        {options.map(option => {
          const active = isSelected(option.key, option.value);
          return (
            <button key={`${option.key}-${option.value}`} type="button" className={`store-popular-chip ${active ? 'is-active' : ''}`} aria-pressed={active} onClick={() => toggle(option.key, option.value)}>
              {active && <Check size={12} className="shrink-0" />}
              <span>{option.label}</span>
              <span className="store-popular-count">({option.count})</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
