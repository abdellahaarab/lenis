import { useCatalog } from '@/data/CatalogContext';
import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { Filter, X, Check } from 'lucide-react';
import { useLanguage } from '@/i18n/LanguageContext';

interface ProductFiltersProps {
  availableBrands?: string[];
  totalFilteredCount: number;
}

export const ProductFilters: React.FC<ProductFiltersProps> = ({
  availableBrands,
  totalFilteredCount,
}) => {
  const { brands: brandsData,products,specs } = useCatalog();
  const [searchParams, setSearchParams] = useSearchParams();
  const { language, t } = useLanguage();

  const currentBrand = searchParams.get('brand') || '';
  const currentCpu = searchParams.get('cpu') || '';
  const currentRam = searchParams.get('ram') || '';
  const currentStorage = searchParams.get('storage') || '';
  const currentCondition = searchParams.get('condition') || '';
  const inStockOnly = searchParams.get('inStock') === 'true';

  const updateParam = (key: string, value: string | null) => {
    const next = new URLSearchParams(searchParams);
    if (value === null || value === '' || value === 'all') {
      next.delete(key);
    } else {
      next.set(key, value);
    }
    setSearchParams(next, { replace: true });
  };

  const toggleInStock = () => {
    const next = new URLSearchParams(searchParams);
    if (inStockOnly) {
      next.delete('inStock');
    } else {
      next.set('inStock', 'true');
    }
    setSearchParams(next, { replace: true });
  };

  const clearAllFilters = () => {
    const next = new URLSearchParams();
    // keep sort if set
    const sort = searchParams.get('sort');
    if (sort) next.set('sort', sort);
    setSearchParams(next, { replace: true });
  };

  const hasActiveFilters = Boolean(
    currentBrand || currentCpu || currentRam || currentStorage || currentCondition || inStockOnly
  );

  const brandsList = availableBrands || brandsData.map((b) => b.name);
  const ramOptions = [...new Set(products.map(p=>p.specs.ramGB).filter((n):n is number=>typeof n==='number'))].sort((a,b)=>a-b);
  const storageOptions = [...new Set(products.map(p=>p.specs.storageGB).filter((n):n is number=>typeof n==='number'))].sort((a,b)=>a-b).map(n=>({label:n+' GB',value:String(n)}));
  const conditionOptions: Array<'new' | 'A' | 'B' | 'C'> = ['new', 'A', 'B', 'C'];
  const cpuOptions = [...new Set(products.map(p=>p.specs.cpu).filter((v):v is string=>Boolean(v)))];

  return (
    <aside aria-label={t.shop.filters} className="w-full lg:w-72 shrink-0 space-y-6">
      <label className="block text-sm">{language==='ar'?'بحث عن جهاز':'Search devices'}<input className="w-full rounded-lg border p-2 bg-transparent" value={searchParams.get('q')??''} onChange={e=>updateParam('q',e.target.value)}/></label>
      {/* Header and Reset */}
      <div className="flex items-center justify-between pb-3 border-b border-neutral-200 dark:border-neutral-800">
        <div className="flex items-center gap-2 font-bold text-neutral-900 dark:text-neutral-100">
          <Filter className="w-4 h-4 text-purple-600 dark:text-purple-400" />
          <span>{t.shop.filters}</span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-500 font-normal">
            {totalFilteredCount}
          </span>
        </div>

        {hasActiveFilters && (
          <button
            onClick={clearAllFilters}
            className="inline-flex items-center gap-1 text-xs text-rose-600 dark:text-rose-400 hover:underline font-medium"
          >
            <X className="w-3.5 h-3.5" />
            <span>{t.shop.clearFilters}</span>
          </button>
        )}
      </div>

      {/* In-Stock Only Toggle */}
      <div className="p-3.5 rounded-xl bg-neutral-50 dark:bg-neutral-900/60 border border-neutral-200 dark:border-neutral-800">
        <label className="flex items-center justify-between cursor-pointer select-none">
          <span className="text-sm font-medium text-neutral-800 dark:text-neutral-200">
            {t.shop.inStockOnly}
          </span>
          <input
            type="checkbox"
            checked={inStockOnly}
            onChange={toggleInStock}
            className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 border-neutral-300 dark:border-neutral-700 dark:bg-neutral-800"
          />
        </label>
      </div>

      {/* Condition Grade Filter */}
      <div className="space-y-2.5">
        <label className="text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 block">
          {t.shop.condition}
        </label>
        <div className="grid grid-cols-2 gap-1.5">
          {conditionOptions.map((grade) => {
            const isSelected = currentCondition === grade;
            return (
              <button
                key={grade}
                type="button"
                onClick={() => updateParam('condition', isSelected ? null : grade)}
                className={`px-3 py-2 text-xs font-medium rounded-lg text-start transition-all border ${
                  isSelected
                    ? 'bg-purple-600 text-white border-purple-600 shadow-sm'
                    : 'bg-white dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300 border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700'
                }`}
              >
                {t.shop.conditionLabels[grade] || grade}
              </button>
            );
          })}
        </div>
      </div>

      {/* Brand Filter */}
      <div className="space-y-2.5">
        <label className="text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 block">
          {t.shop.brand}
        </label>
        <div className="flex flex-wrap gap-1.5">
          {brandsList.map((brandName) => {
            const isSelected = currentBrand.toLowerCase() === brandName.toLowerCase();
            return (
              <button
                key={brandName}
                type="button"
                onClick={() => updateParam('brand', isSelected ? null : brandName)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all border ${
                  isSelected
                    ? 'bg-purple-600 text-white border-purple-600'
                    : 'bg-white dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300 border-neutral-200 dark:border-neutral-800 hover:border-neutral-300'
                }`}
              >
                {brandName}
              </button>
            );
          })}
        </div>
      </div>

      {/* RAM Filter */}
      <div className="space-y-2.5">
        <label className="text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 block">
          {t.shop.ram}
        </label>
        <div className="flex gap-2">
          {ramOptions.map((ramVal) => {
            const isSelected = currentRam === String(ramVal);
            return (
              <button
                key={ramVal}
                type="button"
                onClick={() => updateParam('ram', isSelected ? null : String(ramVal))}
                className={`flex-1 py-1.5 text-xs font-medium rounded-lg border text-center transition-all ${
                  isSelected
                    ? 'bg-purple-600 text-white border-purple-600'
                    : 'bg-white dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300 border-neutral-200 dark:border-neutral-800 hover:border-neutral-300'
                }`}
              >
                {ramVal} GB
              </button>
            );
          })}
        </div>
      </div>

      {/* Storage Filter */}
      <div className="space-y-2.5">
        <label className="text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 block">
          {t.shop.storage}
        </label>
        <div className="flex gap-2">
          {storageOptions.map((item) => {
            const isSelected = currentStorage === item.value;
            return (
              <button
                key={item.value}
                type="button"
                onClick={() => updateParam('storage', isSelected ? null : item.value)}
                className={`flex-1 py-1.5 text-xs font-medium rounded-lg border text-center transition-all ${
                  isSelected
                    ? 'bg-purple-600 text-white border-purple-600'
                    : 'bg-white dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300 border-neutral-200 dark:border-neutral-800 hover:border-neutral-300'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Processor / CPU Family Filter */}
      <div className="space-y-2.5">
        <label className="text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 block">
          {t.shop.cpu}
        </label>
        <div className="flex gap-2">
          {cpuOptions.map((cpuVal) => {
            const isSelected = currentCpu.toLowerCase() === cpuVal.toLowerCase();
            return (
              <button
                key={cpuVal}
                type="button"
                onClick={() => updateParam('cpu', isSelected ? null : cpuVal)}
                className={`flex-1 py-1.5 text-xs font-medium rounded-lg border text-center transition-all ${
                  isSelected
                    ? 'bg-purple-600 text-white border-purple-600'
                    : 'bg-white dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300 border-neutral-200 dark:border-neutral-800 hover:border-neutral-300'
                }`}
              >
                {cpuVal}
              </button>
            );
          })}
        </div>
      </div>
      {specs.filter(s=>!['ramGB','storageGB','cpu'].includes(s.key)).map(s=>{
        const values=[...new Set(products.flatMap(p=>{const v=p.specs[s.key];return (Array.isArray(v)?v:[v]).filter(v=>typeof v==='string'||typeof v==='number'||typeof v==='boolean').map(String);} ))].sort();
        if(!values.length)return null;
        return <label key={s.key} className="block text-sm">{s.title[language]}<select className="w-full rounded-lg border bg-transparent p-2" value={searchParams.get('spec_'+s.key)??''} onChange={e=>updateParam('spec_'+s.key,e.target.value)}><option value="">{language==='ar'?'الكل':'All'}</option>{values.map(v=><option key={v}>{v}</option>)}</select></label>;
      })}
    </aside>
  );
};

export default ProductFilters;
