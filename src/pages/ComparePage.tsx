import { useState, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  GitCompare,
  Plus,
  Trash2,
  Check,
  X,
  Cpu,
  HardDrive,
  Monitor,
  Battery,
  ShieldCheck,
  Sparkles,
  ShoppingBag,
  ArrowRight,
  ArrowLeft,
  ChevronRight
} from 'lucide-react';
import { useLanguage } from '@/i18n/LanguageContext';
import { useCatalog, useExchangeRate } from '@/data/CatalogContext';
import { calculateYer, formatPriceYer } from '@/lib/currency';
import { Product } from '@/data/types';
import { addCart } from '@/data/commerce';

export default function ComparePage() {
  const { language, dir } = useLanguage();
  const { products } = useCatalog();
  const exchangeRate = useExchangeRate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Pick up to 3 product slugs from query params, or default to first 2 products
  const initialSlugs = useMemo(() => {
    const raw = searchParams.get('items');
    if (raw) return raw.split(',').filter(Boolean).slice(0, 3);
    if (products.length >= 2) return [products[0].slug, products[1].slug];
    return products.slice(0, 2).map((p) => p.slug);
  }, [searchParams, products]);

  const [selectedSlugs, setSelectedSlugs] = useState<string[]>(initialSlugs);
  const [highlightDiffs, setHighlightDiffs] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddingSlot, setIsAddingSlot] = useState(false);
  const [addedSlug, setAddedSlug] = useState('');

  // Selected full product objects
  const comparedProducts = useMemo(() => {
    return selectedSlugs
      .map((slug) => products.find((p) => p.slug === slug))
      .filter((p): p is Product => Boolean(p));
  }, [selectedSlugs, products]);

  // Remove a product from comparison
  const handleRemove = (slug: string) => {
    const updated = selectedSlugs.filter((s) => s !== slug);
    setSelectedSlugs(updated);
    setSearchParams(updated.length ? { items: updated.join(',') } : {});
  };

  // Add a product to comparison
  const handleAddProduct = (slug: string) => {
    if (selectedSlugs.includes(slug) || selectedSlugs.length >= 3) return;
    const updated = [...selectedSlugs, slug];
    setSelectedSlugs(updated);
    setSearchParams({ items: updated.join(',') });
    setIsAddingSlot(false);
    setSearchQuery('');
  };

  // Available products for adding
  const availableToAdd = useMemo(() => {
    return products.filter(
      (p) =>
        !selectedSlugs.includes(p.slug) &&
        (searchQuery
          ? p.title[language].toLowerCase().includes(searchQuery.toLowerCase()) ||
            p.brand.toLowerCase().includes(searchQuery.toLowerCase()) ||
            p.model.toLowerCase().includes(searchQuery.toLowerCase())
          : true)
    );
  }, [products, selectedSlugs, searchQuery, language]);

  // Compare attribute matrix rows
  const specRows = [
    {
      key: 'price',
      label: language === 'ar' ? 'السعر' : 'Price',
      getValue: (p: Product) => {
        if (!p.price.usd) return language === 'ar' ? 'اسأل عن السعر' : 'Inquire';
        const yer = calculateYer(p.price.usd, exchangeRate, p.price.yer);
        const yerFormatted = formatPriceYer(yer, language);
        return `$${p.price.usd}${yerFormatted ? ` ${yerFormatted}` : ''}`;
      }
    },
    {
      key: 'condition',
      label: language === 'ar' ? 'درجة الحالة' : 'Condition Grade',
      getValue: (p: Product) => p.condition
    },
    {
      key: 'cpu',
      label: language === 'ar' ? 'المعالج (CPU)' : 'Processor (CPU)',
      getValue: (p: Product) => (p.specs.cpu ? `${p.specs.cpu} ${p.specs.cpuGen ? `(Gen ${p.specs.cpuGen})` : ''}` : '—')
    },
    {
      key: 'ram',
      label: language === 'ar' ? 'الذاكرة العشوائية (RAM)' : 'RAM Memory',
      getValue: (p: Product) => (p.specs.ramGB ? `${p.specs.ramGB} GB ${p.specs.ramType ?? ''}` : '—')
    },
    {
      key: 'storage',
      label: language === 'ar' ? 'سعة التخزين' : 'Storage',
      getValue: (p: Product) => (p.specs.storageGB ? `${p.specs.storageGB} GB ${p.specs.storageType ?? ''}` : '—')
    },
    {
      key: 'display',
      label: language === 'ar' ? 'الشاشة والدقة' : 'Display',
      getValue: (p: Product) =>
        p.specs.display
          ? `${p.specs.display.sizeIn}" (${p.specs.display.res}) ${p.specs.display.hz ? `${p.specs.display.hz}Hz` : ''}`
          : '—'
    },
    {
      key: 'gpu',
      label: language === 'ar' ? 'كرت الشاشة (GPU)' : 'Graphics (GPU)',
      getValue: (p: Product) => p.specs.gpu || '—'
    },
    {
      key: 'battery',
      label: language === 'ar' ? 'صحة البطارية' : 'Battery Health',
      getValue: (p: Product) => (p.specs.batteryHealthPct ? `${p.specs.batteryHealthPct}%` : '—')
    },
    {
      key: 'os',
      label: language === 'ar' ? 'نظام التشغيل' : 'Operating System',
      getValue: (p: Product) => p.specs.os || '—'
    },
    {
      key: 'weight',
      label: language === 'ar' ? 'الوزن' : 'Weight',
      getValue: (p: Product) => (p.specs.weightKg ? `${p.specs.weightKg} kg` : '—')
    },
    {
      key: 'warranty',
      label: language === 'ar' ? 'مدة الضمان' : 'Warranty',
      getValue: (p: Product) => (p.warrantyMonths ? `${p.warrantyMonths} ${language === 'ar' ? 'أشهر' : 'months'}` : '—')
    },
    {
      key: 'inspection',
      label: language === 'ar' ? 'فحص الـ 7 نقاط' : '7-Point Inspection',
      getValue: (p: Product) => (p.inspection?.passed ? (language === 'ar' ? 'اجتاز الفحص بالكامل' : 'Passed All Checks') : '—')
    }
  ];

  const handleQuickAddCart = async (p: Product) => {
    try {
      await addCart({ variantId: p.id, quantity: 1 });
      setAddedSlug(p.slug);
      setTimeout(() => setAddedSlug(''), 2500);
      window.dispatchEvent(new Event('store-cart-changed'));
    } catch {
      // ignore
    }
  };

  return (
    <main id="main-content" className="min-h-screen pt-24 pb-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto" dir={dir}>
      {/* Header and Breadcrumbs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <nav aria-label="Breadcrumb" className="mb-2 flex items-center gap-2 text-xs text-neutral-500">
            <Link to={`/${language}`} className="hover:text-purple-600 transition-colors">
              {language === 'ar' ? 'الرئيسية' : 'Home'}
            </Link>
            <span>/</span>
            <Link to={`/${language}/shop`} className="hover:text-purple-600 transition-colors">
              {language === 'ar' ? 'المتجر' : 'Shop'}
            </Link>
            <span>/</span>
            <span className="text-neutral-900 dark:text-neutral-100 font-semibold">
              {language === 'ar' ? 'مقارنة الأجهزة' : 'Compare Products'}
            </span>
          </nav>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-neutral-900 dark:text-neutral-50">
            {language === 'ar' ? 'مقارنة المواصفات جنباً إلى جنب' : 'Side-by-Side Hardware Comparison'}
          </h1>
          <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-1">
            {language === 'ar'
              ? 'قارن بين حتى 3 أجهزة لمعرفة الفروقات الدقيقة في المعالج، الرام، الشاشة، والبطارية قبل اتخاذ قرار الشراء.'
              : 'Compare up to 3 devices side-by-side to inspect CPU, RAM, display, and battery specs.'}
          </p>
        </div>

        {/* Highlight Diffs Toggle */}
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-xs font-bold text-neutral-700 dark:text-neutral-300 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={highlightDiffs}
              onChange={(e) => setHighlightDiffs(e.target.checked)}
              className="accent-purple-600 w-4 h-4 rounded"
            />
            <span>{language === 'ar' ? 'إبراز الاختلافات فقط' : 'Highlight Differences'}</span>
          </label>
        </div>
      </div>

      {comparedProducts.length === 0 ? (
        <div className="text-center py-20 rounded-3xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 max-w-md mx-auto">
          <GitCompare className="w-12 h-12 text-neutral-400 mx-auto mb-3" />
          <h2 className="text-base font-bold text-neutral-900 dark:text-neutral-100 mb-1">
            {language === 'ar' ? 'لم تختر أي جهاز للمقارنة' : 'No devices selected for comparison'}
          </h2>
          <p className="text-xs text-neutral-500 mb-6">
            {language === 'ar' ? 'تصفح المتجر واختر الأجهزة التي تود المقارنة بينها.' : 'Browse the store and select hardware to compare.'}
          </p>
          <Link
            to={`/${language}/shop`}
            className="px-5 py-2.5 rounded-xl bg-purple-600 text-white text-xs font-bold shadow-md"
          >
            {language === 'ar' ? 'تصفح المتجر' : 'Browse Shop'}
          </Link>
        </div>
      ) : (
        <div className="overflow-x-auto pb-4">
          <table className="w-full border-collapse min-w-[700px]">
            {/* Table Header: Product Cards */}
            <thead>
              <tr>
                <th className="p-4 w-48 text-start text-xs font-bold text-neutral-400 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/50">
                  {language === 'ar' ? 'المنتجات المختارة' : 'Selected Hardware'}
                </th>

                {comparedProducts.map((p) => (
                  <th
                    key={p.id}
                    className="p-4 text-start border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 align-top w-1/3"
                  >
                    <div className="relative p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700/60 flex flex-col justify-between h-full">
                      <button
                        onClick={() => handleRemove(p.slug)}
                        aria-label="Remove from comparison"
                        className="absolute top-2 end-2 p-1.5 rounded-full text-neutral-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>

                      <div className="aspect-[4/3] rounded-xl bg-white dark:bg-white p-2 flex items-center justify-center mb-3 border border-neutral-200/60 dark:border-neutral-700/60">
                        <img
                          src={p.images[0] || '/placeholder.webp'}
                          alt={p.title[language]}
                          className="w-full h-full object-contain"
                        />
                      </div>

                      <div className="min-w-0">
                        <span className="text-[10px] font-bold text-purple-600 block mb-0.5">
                          {p.brand} · {p.model}
                        </span>
                        <h3 className="text-xs font-bold text-neutral-900 dark:text-neutral-100 truncate mb-1">
                          {p.title[language]}
                        </h3>
                        <strong className="text-base font-black text-neutral-900 dark:text-neutral-100 block mb-0.5">
                          {p.price.usd ? `$${p.price.usd}` : language === 'ar' ? 'اسأل' : 'Inquire'}
                        </strong>
                        {(() => {
                          const yer = calculateYer(p.price.usd, exchangeRate, p.price.yer);
                          const yerFormatted = formatPriceYer(yer, language);
                          return yerFormatted ? (
                            <span className="text-[11px] font-semibold text-neutral-500 dark:text-neutral-400 block mb-2.5">
                              {yerFormatted}
                            </span>
                          ) : (
                            <span className="block mb-2.5" />
                          );
                        })()}

                        <div className="flex gap-2">
                          <Link
                            to={`/${language}/shop/${p.category}/${p.slug}`}
                            className="flex-1 py-2 text-center text-xs font-bold rounded-xl border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                          >
                            {language === 'ar' ? 'التفاصيل' : 'Details'}
                          </Link>

                          <button
                            onClick={() => void handleQuickAddCart(p)}
                            className="p-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white transition-colors"
                            title="Add to cart"
                          >
                            {addedSlug === p.slug ? <Check className="w-4 h-4 text-emerald-300" /> : <ShoppingBag className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                    </div>
                  </th>
                ))}

                {/* Slot to add another product if less than 3 */}
                {comparedProducts.length < 3 && (
                  <th className="p-4 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50/30 dark:bg-neutral-900/30 align-middle text-center w-1/3">
                    {isAddingSlot ? (
                      <div className="p-4 rounded-2xl bg-white dark:bg-neutral-900 border border-purple-500/40 text-start space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-neutral-900 dark:text-neutral-100">
                            {language === 'ar' ? 'اختر جهازاً للمقارنة:' : 'Select device:'}
                          </span>
                          <button
                            onClick={() => setIsAddingSlot(false)}
                            className="text-neutral-400 hover:text-neutral-600"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                        <input
                          type="text"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          placeholder={language === 'ar' ? 'ابحث عن اسم أو موديل...' : 'Search model...'}
                          className="w-full text-xs p-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800"
                        />
                        <div className="max-h-40 overflow-y-auto space-y-1">
                          {availableToAdd.slice(0, 6).map((item) => (
                            <button
                              key={item.id}
                              onClick={() => handleAddProduct(item.slug)}
                              className="w-full text-start p-2 rounded-lg hover:bg-purple-50 dark:hover:bg-purple-950/30 text-xs flex items-center justify-between transition-colors"
                            >
                              <span className="truncate">{item.title[language]}</span>
                              <strong className="text-purple-600 text-[11px] ms-2">
                                {item.price.usd ? `$${item.price.usd}` : ''}
                              </strong>
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => setIsAddingSlot(true)}
                        className="w-full h-44 rounded-2xl border-2 border-dashed border-neutral-300 dark:border-neutral-700 hover:border-purple-600 flex flex-col items-center justify-center gap-2 text-neutral-500 hover:text-purple-600 transition-all"
                      >
                        <Plus className="w-6 h-6" />
                        <span className="text-xs font-bold">
                          {language === 'ar' ? 'إضافة جهاز ثالث للمقارنة' : 'Add 3rd Device to Compare'}
                        </span>
                      </button>
                    )}
                  </th>
                )}
              </tr>
            </thead>

            {/* Spec Attributes Matrix */}
            <tbody>
              {specRows.map((row) => {
                const values = comparedProducts.map((p) => row.getValue(p));
                const allEqual = values.every((v) => v === values[0]);

                if (highlightDiffs && allEqual && comparedProducts.length > 1) {
                  return null;
                }

                return (
                  <tr
                    key={row.key}
                    className="border-b border-neutral-100 dark:border-neutral-800/80 hover:bg-neutral-50/40 dark:hover:bg-neutral-900/30 transition-colors"
                  >
                    <td className="p-4 text-xs font-semibold text-neutral-500 dark:text-neutral-400 bg-neutral-50/30 dark:bg-neutral-900/30">
                      {row.label}
                    </td>

                    {comparedProducts.map((p) => (
                      <td
                        key={p.id}
                        className={`p-4 text-xs font-bold text-neutral-800 dark:text-neutral-200 ${
                          !allEqual && comparedProducts.length > 1 && highlightDiffs
                            ? 'bg-purple-50/50 dark:bg-purple-950/20 text-purple-700 dark:text-purple-300'
                            : ''
                        }`}
                      >
                        {row.getValue(p)}
                      </td>
                    ))}

                    {comparedProducts.length < 3 && <td className="p-4" />}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
