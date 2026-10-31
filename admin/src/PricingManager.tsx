import { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Coins, DollarSign, Search, Check, Save, AlertTriangle, CheckCircle2,
  Phone, Calculator, Percent, ExternalLink, Package, Wand2, RefreshCw,
  Trash2, History, Tag, SlidersHorizontal, ArrowUpRight, ArrowDownRight,
  Filter, Layers, XCircle
} from 'lucide-react';
import { api, ApiError } from './api';
import { useI18n } from './i18n';
import { Loading, ErrorBox } from './components';
import { PriceHistoryView } from './PriceHistoryView';

type LocalizedText = { ar?: string; en?: string } | string;

interface PricingItem {
  productId: string;
  variantId: string;
  sku: string;
  model: string;
  title: LocalizedText;
  category: string;
  brand: string;
  condition: string;
  inventoryMode: string;
  quantity: number;
  availableUnits: number;
  priceUsd: string | null;
  originalPriceUsd: string | null;
  priceYer: number | null;
  originalPriceYer: number | null;
  discountPercent: number | null;
  negotiable: boolean;
  status: string;
  image: string | null;
}

interface PricingResponse {
  usdToYer: string | null;
  whatsapp: string | null;
  updatedAt: string | null;
  stats?: {
    totalProducts: number;
    totalVariants: number;
    pricedCount: number;
    unpricedCount: number;
    negotiableCount: number;
  };
  items?: PricingItem[];
}

export function PricingAdmin() {
  const { lang } = useI18n();
  const ar = lang === 'ar';
  const say = (a: string, e: string) => (ar ? a : e);
  const client = useQueryClient();

  // Active Main Tab
  const [activeTab, setActiveTab] = useState<'pricing' | 'discounts' | 'history'>('pricing');

  // Queries
  const pricingQuery = useQuery<PricingResponse>({
    queryKey: ['pricing'],
    queryFn: () => api<PricingResponse>('/commerce/pricing')
  });

  // Global Config Form State
  const [rateInput, setRateInput] = useState<string>('');
  const [whatsappInput, setWhatsappInput] = useState<string>('');
  const [configModified, setConfigModified] = useState(false);
  const [configSaving, setConfigSaving] = useState(false);
  const [configSaved, setConfigSaved] = useState(false);
  const [configError, setConfigError] = useState('');

  // Currency Converter Simulator
  const [calcUsd, setCalcUsd] = useState<string>('100');

  // Filter & Search States
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'unpriced' | 'priced' | 'negotiable'>('all');
  const [discountStatusFilter, setDiscountStatusFilter] = useState<'all' | 'discounted' | 'no_discount'>('all');
  const [page, setPage] = useState(1);
  const pageSize = 20;

  // Inline Edits State: { [variantId]: { priceUsd: string, originalPriceUsd: string, negotiable: boolean, saving?: boolean, saved?: boolean } }
  const [rowEdits, setRowEdits] = useState<Record<string, { priceUsd: string; originalPriceUsd: string; negotiable: boolean; saving?: boolean; saved?: boolean }>>({});
  const [globalError, setGlobalError] = useState('');

  // Bulk Selection State
  const [selectedVariants, setSelectedVariants] = useState<Set<string>>(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);
  const [bulkMsg, setBulkMsg] = useState('');

  // Advanced Price Adjustment Controls
  const [adjustTargetCat, setAdjustTargetCat] = useState('all');
  const [adjustMode, setAdjustMode] = useState<'percent' | 'amount'>('percent');
  const [adjustValue, setAdjustValue] = useState<string>('10');
  const [adjustDir, setAdjustDir] = useState<'increase' | 'decrease'>('increase');
  const [priceRangeMin, setPriceRangeMin] = useState<string>('');
  const [priceRangeMax, setPriceRangeMax] = useState<string>('');

  // Advanced Discount Tool Controls
  const [discountTargetCat, setDiscountTargetCat] = useState('all');
  const [discountPctInput, setDiscountPctInput] = useState<string>('15');
  const [discountRangeMin, setDiscountRangeMin] = useState<string>('');
  const [discountRangeMax, setDiscountRangeMax] = useState<string>('');

  // Quick Fixed Price for Selection
  const [bulkFixedPrice, setBulkFixedPrice] = useState<string>('150');

  // Sync loaded config to form state if untouched
  const currentRate = configModified ? rateInput : (pricingQuery.data?.usdToYer ?? '');
  const currentWhatsapp = configModified ? whatsappInput : (pricingQuery.data?.whatsapp ?? '');
  const effectiveRateNum = Number(currentRate) > 0 ? Number(currentRate) : 530;

  // Categories helper
  const categoryNames: Record<string, { ar: string; en: string }> = {
    all: { ar: 'كل الفئات', en: 'All Categories' },
    laptops: { ar: 'أجهزة لابتوب', en: 'Laptops' },
    displays: { ar: 'شاشات عرض', en: 'Displays' },
    storage: { ar: 'وحدات تخزين', en: 'Storage' },
    'hard-drives': { ar: 'أقراص صلبة', en: 'Hard Drives' },
    network: { ar: 'أجهزة شبكات', en: 'Networking' },
    gaming: { ar: 'أجهزة قيمنق', en: 'Gaming' },
    power: { ar: 'طاقة ومحولات', en: 'Power' },
    audio: { ar: 'صوتيات وسماعات', en: 'Audio' },
    printers: { ar: 'طابعات', en: 'Printers' },
    cameras: { ar: 'كاميرات مراقبة', en: 'Cameras' },
    accessories: { ar: 'ملحقات وإكسسوارات', en: 'Accessories' }
  };

  const allItems = useMemo(() => pricingQuery.data?.items ?? [], [pricingQuery.data?.items]);

  // Discount metrics
  const discountStats = useMemo(() => {
    let discountedCount = 0;
    allItems.forEach(item => {
      const edit = rowEdits[item.variantId];
      const p = edit ? Number(edit.priceUsd) : Number(item.priceUsd);
      const o = edit ? Number(edit.originalPriceUsd) : Number(item.originalPriceUsd);
      if (o && p && o > p) discountedCount++;
    });
    return {
      discountedCount,
      nonDiscountedCount: allItems.length - discountedCount
    };
  }, [allItems, rowEdits]);

  // Filtered Items
  const filteredItems = useMemo(() => {
    return allItems.filter(item => {
      // Category filter
      if (categoryFilter !== 'all' && item.category !== categoryFilter) return false;

      // Status filter
      const effectivePrice = rowEdits[item.variantId]?.priceUsd ?? item.priceUsd;
      const isPriced = effectivePrice !== null && effectivePrice !== '' && Number(effectivePrice) > 0;
      const effectiveNeg = rowEdits[item.variantId]?.negotiable ?? item.negotiable;

      if (statusFilter === 'unpriced' && isPriced) return false;
      if (statusFilter === 'priced' && !isPriced) return false;
      if (statusFilter === 'negotiable' && !effectiveNeg) return false;

      // Discount tab filter
      if (activeTab === 'discounts') {
        const effectiveOrig = rowEdits[item.variantId]?.originalPriceUsd ?? item.originalPriceUsd;
        const pNum = Number(effectivePrice);
        const oNum = Number(effectiveOrig);
        const hasDiscount = Boolean(oNum && pNum && oNum > pNum);
        if (discountStatusFilter === 'discounted' && !hasDiscount) return false;
        if (discountStatusFilter === 'no_discount' && hasDiscount) return false;
      }

      // Search filter
      if (search.trim()) {
        const q = search.toLowerCase();
        const titleText = typeof item.title === 'string' ? item.title : (item.title?.ar || '') + ' ' + (item.title?.en || '');
        const matchTitle = titleText.toLowerCase().includes(q);
        const matchModel = item.model.toLowerCase().includes(q);
        const matchSku = item.sku.toLowerCase().includes(q);
        const matchBrand = item.brand.toLowerCase().includes(q);
        if (!matchTitle && !matchModel && !matchSku && !matchBrand) return false;
      }

      return true;
    });
  }, [allItems, categoryFilter, statusFilter, discountStatusFilter, activeTab, search, rowEdits]);

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / pageSize));
  const pageItems = filteredItems.slice((page - 1) * pageSize, page * pageSize);

  // Handle saving global config (exchange rate & whatsapp)
  const handleSaveConfig = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setConfigSaving(true);
    setConfigError('');
    setConfigSaved(false);
    try {
      await api('/commerce/pricing', {
        method: 'POST',
        body: {
          usdToYer: currentRate ? currentRate.trim() : null,
          whatsapp: currentWhatsapp ? currentWhatsapp.trim() : null
        }
      });
      setConfigSaved(true);
      setConfigModified(false);
      await client.invalidateQueries({ queryKey: ['pricing'] });
      setTimeout(() => setConfigSaved(false), 4000);
    } catch (err) {
      setConfigError(err instanceof ApiError ? err.code : 'failed');
    } finally {
      setConfigSaving(false);
    }
  };

  // Handle single item price update
  const handleSaveRowPrice = async (item: PricingItem) => {
    const edit = rowEdits[item.variantId];
    if (!edit) return;

    setRowEdits(prev => ({
      ...prev,
      [item.variantId]: { ...prev[item.variantId], saving: true }
    }));
    setGlobalError('');

    try {
      await api('/commerce/pricing/item', {
        method: 'POST',
        body: {
          variantId: item.variantId,
          priceUsd: edit.priceUsd ? edit.priceUsd.trim() : null,
          originalPriceUsd: edit.originalPriceUsd ? edit.originalPriceUsd.trim() : null,
          negotiable: edit.negotiable
        }
      });

      setRowEdits(prev => ({
        ...prev,
        [item.variantId]: { ...prev[item.variantId], saving: false, saved: true }
      }));

      await client.invalidateQueries({ queryKey: ['pricing'] });
      await client.invalidateQueries({ queryKey: ['pricing-history'] });
      await client.invalidateQueries({ queryKey: ['commerce-reference'] });

      setTimeout(() => {
        setRowEdits(prev => {
          const next = { ...prev };
          if (next[item.variantId]) {
            next[item.variantId] = { ...next[item.variantId], saved: false };
          }
          return next;
        });
      }, 3000);
    } catch (err) {
      setGlobalError(err instanceof ApiError ? err.code : 'failed');
      setRowEdits(prev => ({
        ...prev,
        [item.variantId]: { ...prev[item.variantId], saving: false }
      }));
    }
  };

  // Single item remove discount quick action
  const handleRemoveSingleDiscount = async (item: PricingItem) => {
    try {
      await api('/commerce/pricing/item', {
        method: 'POST',
        body: {
          variantId: item.variantId,
          priceUsd: item.priceUsd,
          originalPriceUsd: null,
          negotiable: item.negotiable
        }
      });
      await client.invalidateQueries({ queryKey: ['pricing'] });
      await client.invalidateQueries({ queryKey: ['pricing-history'] });
      await client.invalidateQueries({ queryKey: ['commerce-reference'] });
    } catch {
      setGlobalError('failed');
    }
  };

  // Quick seed default prices
  const handleSeedDefaults = async () => {
    if (!window.confirm(say('هل تريد تعيين أسعار وسعر خصم افتراضي لجميع المنتجات؟', 'Apply recommended market prices and default discount to catalog products?'))) {
      return;
    }
    setBulkBusy(true);
    setBulkMsg('');
    try {
      const res = await api<{ ok: boolean; updatedCount: number }>('/commerce/pricing/batch', {
        method: 'POST',
        body: { action: 'seed_defaults' }
      });
      setBulkMsg(say(`تم بنجاح تسعير ${res.updatedCount} منتج وخيار مع الخصم الافتراضي!`, `Successfully priced ${res.updatedCount} items with default discounts!`));
      await client.invalidateQueries({ queryKey: ['pricing'] });
      await client.invalidateQueries({ queryKey: ['pricing-history'] });
      await client.invalidateQueries({ queryKey: ['commerce-reference'] });
    } catch {
      setGlobalError('failed');
    } finally {
      setBulkBusy(false);
    }
  };

  // 1. CLEAR DISCOUNTS (ازاله كل الخصومات دفعة واحدة)
  const handleClearDiscounts = async () => {
    const ids = Array.from(selectedVariants);
    const catName = categoryFilter !== 'all' ? (categoryNames[categoryFilter]?.[lang] || categoryFilter) : '';

    const confirmMsg = ids.length > 0
      ? say(`هل أنت متأكد من رغبتك في إزالة جميع الخصومات عن ${ids.length} صنف محدد؟\nسيتم حذف السعر المشطوب وسيعود السعر الحالي كسعر أساسي.`,
            `Are you sure you want to clear all discounts on ${ids.length} selected items?`)
      : (categoryFilter !== 'all'
        ? say(`هل أنت متأكد من رغبتك في إزالة جميع الخصومات عن فئة "${catName}" بالكامل؟`,
              `Are you sure you want to clear all discounts for category "${catName}"?`)
        : say(`⚠️ تنبيه هام: هل أنت متأكد من رغبتك في إزالة جميع الخصومات عن كامل منتجات المتجر؟\nسيتم إلغاء كل الأسعار الأصلية المشطوبة ونسب الخصم.`,
              `⚠️ Warning: Are you sure you want to clear all discounts across the entire catalog?`));

    if (!window.confirm(confirmMsg)) return;

    setBulkBusy(true);
    setBulkMsg('');
    try {
      const res = await api<{ ok: boolean; updatedCount: number }>('/commerce/pricing/batch', {
        method: 'POST',
        body: {
          action: 'clear_discounts',
          category: categoryFilter !== 'all' ? categoryFilter : undefined,
          variantIds: ids.length > 0 ? ids : undefined
        }
      });
      setBulkMsg(say(`تم بنجاح إزالة الخصومات عن ${res.updatedCount} عنصر وتحديث السجلات!`, `Successfully cleared discounts on ${res.updatedCount} items!`));
      setSelectedVariants(new Set());
      await client.invalidateQueries({ queryKey: ['pricing'] });
      await client.invalidateQueries({ queryKey: ['pricing-history'] });
      await client.invalidateQueries({ queryKey: ['commerce-reference'] });
    } catch {
      setGlobalError('failed');
    } finally {
      setBulkBusy(false);
    }
  };

  // 2. ADVANCED BULK PRICE ADJUSTMENT (تعديل السعر الأصلي بالفئة والنطاق والنسبة/المبلغ)
  const handleBulkAdjustPrice = async () => {
    const val = Number(adjustValue);
    if (isNaN(val) || val <= 0) {
      alert(say('الرجاء إدخال قيمة صحيحة للتعديل السعري', 'Please enter a valid numeric value'));
      return;
    }
    const isIncrease = adjustDir === 'increase';
    const minP = priceRangeMin ? Number(priceRangeMin) : undefined;
    const maxP = priceRangeMax ? Number(priceRangeMax) : undefined;
    const ids = Array.from(selectedVariants);
    const targetCategory = adjustTargetCat !== 'all' ? adjustTargetCat : (categoryFilter !== 'all' ? categoryFilter : undefined);

    const sign = isIncrease ? '+' : '-';
    const desc = adjustMode === 'percent' ? `${sign}${val}%` : `${sign}$${val}`;
    const catName = targetCategory ? (categoryNames[targetCategory]?.[lang] || targetCategory) : say('جميع الفئات', 'All categories');
    const rangeDesc = (minP !== undefined || maxP !== undefined) ? ` (نطاق السعر: $${minP ?? 0} إلى $${maxP ?? '∞'})` : '';

    const msg = ids.length > 0
      ? say(`هل تريد تعديل أسعار ${ids.length} عنصر محدد بمقدار ${desc}؟`, `Adjust prices for ${ids.length} selected items by ${desc}?`)
      : say(`هل تريد تعديل أسعار فئة "${catName}"${rangeDesc} بمقدار ${desc}؟\nسيتم تسجيل هذا التعديل في سجل تاريخ الأسعار.`,
            `Adjust prices for category "${catName}"${rangeDesc} by ${desc}? Logged in price history.`);

    if (!window.confirm(msg)) return;

    setBulkBusy(true);
    setBulkMsg('');
    try {
      const res = await api<{ ok: boolean; updatedCount: number }>('/commerce/pricing/batch', {
        method: 'POST',
        body: {
          action: 'adjust_price',
          percent: adjustMode === 'percent' ? (isIncrease ? val : -val) : undefined,
          fixedAmount: adjustMode === 'amount' ? (isIncrease ? val : -val) : undefined,
          category: targetCategory,
          priceMin: minP,
          priceMax: maxP,
          variantIds: ids.length > 0 ? ids : undefined
        }
      });
      setBulkMsg(say(`تم بنجاح تعديل أسعار ${res.updatedCount} منتج بمقدار ${desc}!`, `Successfully adjusted prices for ${res.updatedCount} items by ${desc}!`));
      setSelectedVariants(new Set());
      await client.invalidateQueries({ queryKey: ['pricing'] });
      await client.invalidateQueries({ queryKey: ['pricing-history'] });
      await client.invalidateQueries({ queryKey: ['commerce-reference'] });
    } catch {
      setGlobalError('failed');
    } finally {
      setBulkBusy(false);
    }
  };

  // 3. ADVANCED DISCOUNT APPLICATION (تطبيق الخصم بالفئة والنطاق والنسبة)
  const handleApplyDiscountAdv = async (customPct?: number) => {
    const pct = customPct ?? Number(discountPctInput);
    if (isNaN(pct) || pct <= 0 || pct >= 95) {
      alert(say('الرجاء إدخال نسبة خصم صحيحة بين 1% و95%', 'Please enter a valid discount percentage'));
      return;
    }

    const minP = discountRangeMin ? Number(discountRangeMin) : undefined;
    const maxP = discountRangeMax ? Number(discountRangeMax) : undefined;
    const ids = Array.from(selectedVariants);
    const targetCategory = discountTargetCat !== 'all' ? discountTargetCat : (categoryFilter !== 'all' ? categoryFilter : undefined);
    const catName = targetCategory ? (categoryNames[targetCategory]?.[lang] || targetCategory) : say('جميع الفئات', 'all categories');
    const rangeDesc = (minP !== undefined || maxP !== undefined) ? ` (نطاق السعر: $${minP ?? 0} إلى $${maxP ?? '∞'})` : '';

    const msg = ids.length > 0
      ? say(`تطبيق خصم ${pct}% على ${ids.length} عنصر محدد (مع إظهار السعر الأصلي مشطوباً والبيع بعد الخصم)؟`,
            `Apply ${pct}% discount to ${ids.length} selected items?`)
      : say(`تطبيق خصم ${pct}% على فئة "${catName}"${rangeDesc}؟\nسيتم حفظ السعر الحالي كأصل وتخفيض سعر البيع بنسبة ${pct}%.`,
            `Apply ${pct}% discount on category "${catName}"${rangeDesc}?`);

    if (!window.confirm(msg)) return;

    setBulkBusy(true);
    setBulkMsg('');
    try {
      const res = await api<{ ok: boolean; updatedCount: number }>('/commerce/pricing/batch', {
        method: 'POST',
        body: {
          action: 'apply_discount',
          percent: pct,
          category: targetCategory,
          priceMin: minP,
          priceMax: maxP,
          variantIds: ids.length > 0 ? ids : undefined
        }
      });
      setBulkMsg(say(`تم بنجاح تطبيق خصم ${pct}% على ${res.updatedCount} منتج!`, `Successfully applied ${pct}% discount to ${res.updatedCount} items!`));
      setSelectedVariants(new Set());
      await client.invalidateQueries({ queryKey: ['pricing'] });
      await client.invalidateQueries({ queryKey: ['pricing-history'] });
      await client.invalidateQueries({ queryKey: ['commerce-reference'] });
    } catch {
      setGlobalError('failed');
    } finally {
      setBulkBusy(false);
    }
  };

  // Bulk fixed price
  const handleBulkFixedPrice = async () => {
    const fixed = Number(bulkFixedPrice);
    if (isNaN(fixed) || fixed <= 0) return;
    const ids = Array.from(selectedVariants);
    if (!ids.length) {
      alert(say('الرجاء تحديد منتجات من الجدول أولاً', 'Please select items from the table first'));
      return;
    }

    if (!window.confirm(say(`تحديد السعر $${fixed} لـ ${ids.length} عنصر؟`, `Set price $${fixed} for ${ids.length} items?`))) return;

    setBulkBusy(true);
    setBulkMsg('');
    try {
      const res = await api<{ ok: boolean; updatedCount: number }>('/commerce/pricing/batch', {
        method: 'POST',
        body: {
          action: 'set_fixed',
          fixedPrice: fixed,
          variantIds: ids
        }
      });
      setBulkMsg(say(`تم تعيين السعر لـ ${res.updatedCount} عنصر!`, `Price set for ${res.updatedCount} items!`));
      setSelectedVariants(new Set());
      await client.invalidateQueries({ queryKey: ['pricing'] });
      await client.invalidateQueries({ queryKey: ['pricing-history'] });
    } catch {
      setGlobalError('failed');
    } finally {
      setBulkBusy(false);
    }
  };

  // Selection toggle
  const toggleSelectAll = () => {
    if (selectedVariants.size === pageItems.length && pageItems.length > 0) {
      setSelectedVariants(new Set());
    } else {
      setSelectedVariants(new Set(pageItems.map(i => i.variantId)));
    }
  };

  const toggleSelectOne = (id: string) => {
    const next = new Set(selectedVariants);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedVariants(next);
  };

  const stats = pricingQuery.data?.stats ?? {
    totalProducts: allItems.length,
    totalVariants: allItems.length,
    pricedCount: allItems.filter(i => i.priceUsd && Number(i.priceUsd) > 0).length,
    unpricedCount: allItems.filter(i => !i.priceUsd || Number(i.priceUsd) <= 0).length,
    negotiableCount: allItems.filter(i => i.negotiable).length
  };

  const pricedPercent = stats.totalVariants > 0
    ? Math.round((stats.pricedCount / stats.totalVariants) * 100)
    : 0;

  if (pricingQuery.isPending) return <Loading />;

  return (
    <div className="pricing-hub-view" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Page Title & Tab Navigation */}
      <div className="page-heading" style={{ marginBottom: 0 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span className="count-pill" style={{ background: 'var(--surface-soft)', color: 'var(--primary-text)' }}>
              <Coins size={14} style={{ display: 'inline', verticalAlign: 'middle', marginInlineEnd: '4px' }} />
              {say('مركز إدارة التسعير والخصومات والعملات', 'Pricing, Discounts & Currency Center')}
            </span>
          </div>
          <h1>{say('نظام التسعير والعروض وسجل الأسعار', 'Pricing System, Discounts & Price History')}</h1>
          <p className="heading-sub">
            {say(
              'إدارة أسعار الصرف اليومية، تعديل الأسعار جماعياً حسب الفئات والنطاقات، إزالة وتطبيق الخصومات، ومراقبة تغيرات الأسعار.',
              'Manage exchange rates, bulk adjust prices by category & range, clear/apply discounts, and monitor price changes.'
            )}
          </p>
        </div>

        {/* Global Action Links */}
        <div className="heading-actions" style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button
            type="button"
            className="button secondary"
            disabled={bulkBusy}
            onClick={handleSeedDefaults}
            title={say('تسعير جميع المنتجات غير المسعّرة بأسعار افتراضية', 'Auto-fill unpriced items with recommended defaults')}
          >
            <Wand2 size={16} />
            <span>{say('تسعير مقترح للكل', 'Auto-price Catalog')}</span>
          </button>
          <a
            href="/ar/shop"
            target="_blank"
            rel="noopener noreferrer"
            className="button secondary"
            style={{ textDecoration: 'none' }}
          >
            <ExternalLink size={16} />
            <span>{say('معاينة المتجر', 'View Store')}</span>
          </a>
        </div>
      </div>

      {/* Main Feature Tabs */}
      <div
        style={{
          display: 'flex',
          gap: '8px',
          borderBottom: '2px solid var(--border)',
          paddingBottom: '2px'
        }}
      >
        <button
          type="button"
          onClick={() => setActiveTab('pricing')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 20px',
            fontSize: '14px',
            fontWeight: 700,
            borderRadius: '10px 10px 0 0',
            border: 'none',
            cursor: 'pointer',
            transition: 'all 0.2s',
            background: activeTab === 'pricing' ? 'var(--surface)' : 'transparent',
            color: activeTab === 'pricing' ? 'var(--primary-text)' : 'var(--muted)',
            boxShadow: activeTab === 'pricing' ? '0 -2px 10px rgba(0,0,0,0.05)' : 'none',
            borderTop: activeTab === 'pricing' ? '3px solid #3b82f6' : '3px solid transparent'
          }}
        >
          <Coins size={18} style={{ color: activeTab === 'pricing' ? '#3b82f6' : 'inherit' }} />
          <span>{say('🏷️ أسعار الصرف والتسعير', 'Pricing & Exchange Rates')}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('discounts')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 20px',
            fontSize: '14px',
            fontWeight: 700,
            borderRadius: '10px 10px 0 0',
            border: 'none',
            cursor: 'pointer',
            transition: 'all 0.2s',
            background: activeTab === 'discounts' ? 'var(--surface)' : 'transparent',
            color: activeTab === 'discounts' ? 'var(--primary-text)' : 'var(--muted)',
            boxShadow: activeTab === 'discounts' ? '0 -2px 10px rgba(0,0,0,0.05)' : 'none',
            borderTop: activeTab === 'discounts' ? '3px solid #f59e0b' : '3px solid transparent'
          }}
        >
          <Tag size={18} style={{ color: activeTab === 'discounts' ? '#f59e0b' : 'inherit' }} />
          <span>{say('🔖 إدارة الخصومات والعروض', 'Discounts & Offers')}</span>
          {discountStats.discountedCount > 0 && (
            <span style={{ fontSize: '11px', background: 'rgba(245, 158, 11, 0.15)', color: '#d97706', padding: '2px 7px', borderRadius: '12px' }}>
              {discountStats.discountedCount}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('history')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 20px',
            fontSize: '14px',
            fontWeight: 700,
            borderRadius: '10px 10px 0 0',
            border: 'none',
            cursor: 'pointer',
            transition: 'all 0.2s',
            background: activeTab === 'history' ? 'var(--surface)' : 'transparent',
            color: activeTab === 'history' ? 'var(--primary-text)' : 'var(--muted)',
            boxShadow: activeTab === 'history' ? '0 -2px 10px rgba(0,0,0,0.05)' : 'none',
            borderTop: activeTab === 'history' ? '3px solid #8b5cf6' : '3px solid transparent'
          }}
        >
          <History size={18} style={{ color: activeTab === 'history' ? '#8b5cf6' : 'inherit' }} />
          <span>{say('📊 سجل مراقبة الأسعار (المدير)', 'Price History & Audit (Manager)')}</span>
        </button>
      </div>

      <ErrorBox code={globalError || configError} />

      {bulkMsg && (
        <div style={{ padding: '12px 16px', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid #10b981', borderRadius: '10px', color: '#059669', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <CheckCircle2 size={18} />
          <strong>{bulkMsg}</strong>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════════
          TAB 1: PRICING & EXCHANGE RATES (أسعار الصرف والتسعير)
          ════════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'pricing' && (
        <>
          {/* Exchange Rates Config */}
          <div
            className="card"
            style={{
              padding: '24px',
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: '16px',
              boxShadow: '0 4px 20px rgba(0,0,0,0.03)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', borderBottom: '1px solid var(--border)', paddingBottom: '16px', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(245, 158, 11, 0.15)', color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Coins size={22} />
                </div>
                <div>
                  <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700 }}>
                    {say('إعدادات سعر الصرف وواتساب المتجر', 'Exchange Rate & Store WhatsApp')}
                  </h2>
                  <small style={{ color: 'var(--muted)', fontSize: '12px' }}>
                    {say('يتم اعتماد هذا السعر لتحويل جميع أسعار الدولار ($) إلى الريال اليمني (YER) تلقائياً أمام العميل.', 'Used to convert all USD prices to Yemeni Rials dynamically for customers.')}
                  </small>
                </div>
              </div>
              {configSaved && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#10b981', fontWeight: 600, fontSize: '13px' }}>
                  <CheckCircle2 size={18} />
                  <span>{say('تم حفظ الإعدادات بنجاح!', 'Settings saved successfully!')}</span>
                </div>
              )}
            </div>

            <form onSubmit={handleSaveConfig}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', alignItems: 'flex-start' }}>
                {/* Field 1: Exchange Rate */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontWeight: 700, fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <DollarSign size={16} style={{ color: '#059669' }} />
                    <span>{say('سعر صرف الدولار (ريال يمني لكل 1 دولار)', 'YER per 1 USD Rate')}</span>
                    <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      dir="ltr"
                      inputMode="decimal"
                      type="text"
                      placeholder="530"
                      style={{
                        width: '100%',
                        padding: '12px 14px',
                        fontSize: '18px',
                        fontWeight: 700,
                        borderRadius: '10px',
                        border: '1.5px solid var(--border)',
                        background: 'var(--surface-soft)',
                        color: 'var(--primary-text)'
                      }}
                      value={currentRate}
                      onChange={e => {
                        setRateInput(e.target.value);
                        setConfigModified(true);
                      }}
                    />
                    <span style={{ position: 'absolute', insetInlineEnd: '14px', top: '50%', transform: 'translateY(-50%)', fontWeight: 700, fontSize: '12px', color: 'var(--muted)' }}>
                      YER / USD
                    </span>
                  </div>

                  {/* Quick rate presets */}
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '4px' }}>
                    <button
                      type="button"
                      className="button secondary"
                      style={{ padding: '4px 10px', fontSize: '11px', borderRadius: '8px' }}
                      onClick={() => {
                        setRateInput('530');
                        setConfigModified(true);
                      }}
                    >
                      ⚡ {say('صنعاء (530 ريال)', "Sana'a (530 YER)")}
                    </button>
                    <button
                      type="button"
                      className="button secondary"
                      style={{ padding: '4px 10px', fontSize: '11px', borderRadius: '8px' }}
                      onClick={() => {
                        setRateInput('1600');
                        setConfigModified(true);
                      }}
                    >
                      ⚡ {say('عدن (1600 ريال)', 'Aden (1600 YER)')}
                    </button>
                  </div>
                </div>

                {/* Field 2: WhatsApp Number */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontWeight: 700, fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Phone size={16} style={{ color: '#25d366' }} />
                    <span>{say('رقم واتساب للتسعير والمبيعات', 'WhatsApp Hotline')}</span>
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      dir="ltr"
                      inputMode="tel"
                      type="text"
                      placeholder="967771001044"
                      style={{
                        width: '100%',
                        padding: '12px 14px',
                        fontSize: '15px',
                        fontWeight: 600,
                        borderRadius: '10px',
                        border: '1.5px solid var(--border)',
                        background: 'var(--surface-soft)',
                        color: 'var(--primary-text)'
                      }}
                      value={currentWhatsapp}
                      onChange={e => {
                        setWhatsappInput(e.target.value);
                        setConfigModified(true);
                      }}
                    />
                  </div>
                  <small style={{ color: 'var(--muted)', fontSize: '11px' }}>
                    {say('يقبل الإدخال مع الرمز الدولي أو محلياً (مثال: 967771001044 أو 771001044)', 'International or local Yemen format')}
                    {currentWhatsapp && (
                      <a
                        href={`https://wa.me/${currentWhatsapp.replace(/\D/g, '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ marginInlineStart: '10px', color: '#25d366', fontWeight: 600 }}
                      >
                        {say('تجربة المحادثة ↗', 'Test Chat ↗')}
                      </a>
                    )}
                  </small>
                </div>

                {/* Live Converter Simulator Card */}
                <div
                  style={{
                    background: 'var(--surface-soft)',
                    padding: '16px',
                    borderRadius: '12px',
                    border: '1px dashed var(--border)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 700, color: 'var(--primary-text)' }}>
                    <Calculator size={15} style={{ color: '#3b82f6' }} />
                    <span>{say('محاكي تحويل الأسعار الفوري', 'Live Rate Converter')}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ flex: 1, position: 'relative' }}>
                      <input
                        dir="ltr"
                        inputMode="numeric"
                        type="number"
                        style={{ width: '100%', padding: '6px 10px', fontSize: '14px', fontWeight: 700, borderRadius: '8px' }}
                        value={calcUsd}
                        onChange={e => setCalcUsd(e.target.value)}
                      />
                      <span style={{ position: 'absolute', insetInlineEnd: '8px', top: '50%', transform: 'translateY(-50%)', fontSize: '11px', color: 'var(--muted)' }}>$</span>
                    </div>
                    <span style={{ fontWeight: 700 }}>=</span>
                    <div style={{ flex: 1.4, padding: '6px 10px', background: 'var(--surface)', borderRadius: '8px', border: '1px solid var(--border)', textAlign: 'center' }}>
                      <strong style={{ fontSize: '15px', color: '#059669' }}>
                        {Math.round((Number(calcUsd) || 0) * effectiveRateNum).toLocaleString(lang)}
                      </strong>
                      <span style={{ fontSize: '10px', marginInlineStart: '4px', color: 'var(--muted)' }}>YER</span>
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--border)' }}>
                <button
                  type="submit"
                  className="button primary"
                  disabled={configSaving}
                  style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 24px', fontSize: '14px' }}
                >
                  {configSaving ? <RefreshCw size={16} className="animate-spin" /> : <Save size={16} />}
                  <span>{say('حفظ إعدادات الصرف والواتساب', 'Save Exchange & WhatsApp')}</span>
                </button>
              </div>
            </form>
          </div>

          {/* KPI Metrics Bar */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
            <div className="stat-card" style={{ padding: '16px', borderRadius: '12px' }}>
              <div className="stat-card-header" style={{ marginBottom: '8px' }}>
                <span className="stat-label">{say('إجمالي العناصر والخيارات', 'Total Variants & SKUs')}</span>
                <span className="stat-icon-wrap primary"><Package size={18} /></span>
              </div>
              <div className="stat-number-row">
                <strong className="stat-big-num">{stats.totalVariants}</strong>
                <span className="stat-secondary-text">({stats.totalProducts} {say('منتج', 'products')})</span>
              </div>
            </div>

            <div className="stat-card" style={{ padding: '16px', borderRadius: '12px' }}>
              <div className="stat-card-header" style={{ marginBottom: '8px' }}>
                <span className="stat-label">{say('المنتجات المسعّرة', 'Priced Products')}</span>
                <span className="stat-icon-wrap green"><CheckCircle2 size={18} /></span>
              </div>
              <div className="stat-number-row">
                <strong className="stat-big-num" style={{ color: '#059669' }}>{stats.pricedCount}</strong>
                <span className="stat-secondary-text">({pricedPercent}%)</span>
              </div>
              <div className="progress-bar-wrap" style={{ marginTop: '8px' }}>
                <div className="progress-bar-fill" style={{ width: `${pricedPercent}%`, background: '#10b981' }} />
              </div>
            </div>

            <div
              className="stat-card"
              style={{
                padding: '16px',
                borderRadius: '12px',
                border: stats.unpricedCount > 0 ? '1.5px solid #f59e0b' : undefined,
                background: stats.unpricedCount > 0 ? 'rgba(245, 158, 11, 0.05)' : undefined,
                cursor: 'pointer'
              }}
              onClick={() => setStatusFilter(statusFilter === 'unpriced' ? 'all' : 'unpriced')}
              title={say('انقر لعرض المنتجات التي تحتاج تسعير فقط', 'Click to filter unpriced products')}
            >
              <div className="stat-card-header" style={{ marginBottom: '8px' }}>
                <span className="stat-label" style={{ color: stats.unpricedCount > 0 ? '#d97706' : undefined, fontWeight: 700 }}>
                  {say('تحتاج تسعير (غير مسعّرة)', 'Needs Pricing (Unpriced)')}
                </span>
                <span className="stat-icon-wrap amber"><AlertTriangle size={18} /></span>
              </div>
              <div className="stat-number-row">
                <strong className="stat-big-num" style={{ color: stats.unpricedCount > 0 ? '#d97706' : undefined }}>
                  {stats.unpricedCount}
                </strong>
                <span className="stat-secondary-text">{statusFilter === 'unpriced' ? say('✓ مفلتر حالياً', '✓ Active filter') : say('انقر للعرض', 'Click to view')}</span>
              </div>
            </div>

            <div className="stat-card" style={{ padding: '16px', borderRadius: '12px' }}>
              <div className="stat-card-header" style={{ marginBottom: '8px' }}>
                <span className="stat-label">{say('سعر الصرف المعتمد', 'Active Exchange Rate')}</span>
                <span className="stat-icon-wrap amber"><Coins size={18} /></span>
              </div>
              <div className="stat-number-row">
                <strong className="stat-big-num" dir="ltr">{effectiveRateNum.toLocaleString()}</strong>
                <span className="stat-secondary-text">YER</span>
              </div>
            </div>
          </div>

          {/* ADVANCED BULK PRICE ADJUSTMENT PANEL (تعديل الأسعار حسب الفئة والنطاق السعري) */}
          <div
            className="card"
            style={{
              padding: '18px 20px',
              borderRadius: '14px',
              background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.05) 0%, rgba(37, 99, 235, 0.02) 100%)',
              border: '1.5px solid rgba(59, 130, 246, 0.25)',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <SlidersHorizontal size={18} style={{ color: '#2563eb' }} />
                <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#1d4ed8' }}>
                  {say('نظام تعديل الأسعار المتقدم (حسب الفئة، النطاق السعري، النسبة أو المبلغ)', 'Advanced Price Adjustment (By Category, Price Range, % or $)')}
                </h3>
              </div>
              <span style={{ fontSize: '12px', color: 'var(--muted)' }}>
                {selectedVariants.size > 0
                  ? say(`🎯 سيتم التطبيق على ${selectedVariants.size} عنصر محدد من الجدول`, `🎯 Targeting ${selectedVariants.size} selected items`)
                  : say('🎯 يطبق على الفئة والنطاق المحددين بالكامل', '🎯 Targets selected category and range')}
              </span>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center' }}>
              {/* Category */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--muted)' }}>
                  {say('الفئة المستهدفة:', 'Target Category:')}
                </label>
                <select
                  value={adjustTargetCat}
                  onChange={e => setAdjustTargetCat(e.target.value)}
                  style={{ padding: '8px 12px', borderRadius: '8px', fontSize: '13px', border: '1px solid var(--border)', background: 'var(--surface)' }}
                >
                  {Object.entries(categoryNames).map(([key, name]) => (
                    <option key={key} value={key}>{name[lang]}</option>
                  ))}
                </select>
              </div>

              {/* Price Range (Min - Max) */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--muted)' }}>
                  {say('نطاق السعر ($ من - إلى):', 'Price Range ($ Min - Max):')}
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <input
                    type="number"
                    dir="ltr"
                    placeholder="0"
                    value={priceRangeMin}
                    onChange={e => setPriceRangeMin(e.target.value)}
                    style={{ width: '70px', padding: '7px 8px', fontSize: '12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--surface)' }}
                  />
                  <span style={{ fontSize: '12px', color: 'var(--muted)' }}>{say('إلى', 'to')}</span>
                  <input
                    type="number"
                    dir="ltr"
                    placeholder="∞"
                    value={priceRangeMax}
                    onChange={e => setPriceRangeMax(e.target.value)}
                    style={{ width: '70px', padding: '7px 8px', fontSize: '12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--surface)' }}
                  />
                </div>
              </div>

              {/* Adjustment Mode (Percent vs Fixed Amount) */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--muted)' }}>
                  {say('طريقة التعديل:', 'Adjustment Mode:')}
                </label>
                <div style={{ display: 'flex', gap: '4px' }}>
                  <button
                    type="button"
                    className={`button ${adjustMode === 'percent' ? 'primary' : 'secondary'}`}
                    style={{ padding: '7px 12px', fontSize: '12px', borderRadius: '8px' }}
                    onClick={() => setAdjustMode('percent')}
                  >
                    % {say('نسبة مئوية', 'Percentage')}
                  </button>
                  <button
                    type="button"
                    className={`button ${adjustMode === 'amount' ? 'primary' : 'secondary'}`}
                    style={{ padding: '7px 12px', fontSize: '12px', borderRadius: '8px' }}
                    onClick={() => setAdjustMode('amount')}
                  >
                    $ {say('مبلغ ثابت', 'Fixed Amount')}
                  </button>
                </div>
              </div>

              {/* Direction (Increase vs Decrease) */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--muted)' }}>
                  {say('الاتجاه:', 'Direction:')}
                </label>
                <div style={{ display: 'flex', gap: '4px' }}>
                  <button
                    type="button"
                    className={`button ${adjustDir === 'increase' ? 'primary' : 'secondary'}`}
                    style={{ padding: '7px 12px', fontSize: '12px', borderRadius: '8px', background: adjustDir === 'increase' ? '#2563eb' : undefined }}
                    onClick={() => setAdjustDir('increase')}
                  >
                    <ArrowUpRight size={14} />
                    <span>{say('زيادة (+)', 'Increase (+)')}</span>
                  </button>
                  <button
                    type="button"
                    className={`button ${adjustDir === 'decrease' ? 'primary' : 'secondary'}`}
                    style={{ padding: '7px 12px', fontSize: '12px', borderRadius: '8px', background: adjustDir === 'decrease' ? '#dc2626' : undefined }}
                    onClick={() => setAdjustDir('decrease')}
                  >
                    <ArrowDownRight size={14} />
                    <span>{say('تخفيض (-)', 'Decrease (-)')}</span>
                  </button>
                </div>
              </div>

              {/* Value Input */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--muted)' }}>
                  {adjustMode === 'percent' ? say('النسبة (%):', 'Percent (%):') : say('المبلغ ($):', 'Amount ($):')}
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="number"
                    dir="ltr"
                    value={adjustValue}
                    onChange={e => setAdjustValue(e.target.value)}
                    style={{ width: '85px', padding: '7px 10px', fontSize: '14px', fontWeight: 700, borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--surface)' }}
                  />
                  <span style={{ position: 'absolute', insetInlineEnd: '8px', top: '50%', transform: 'translateY(-50%)', fontWeight: 700, fontSize: '12px', color: 'var(--muted)' }}>
                    {adjustMode === 'percent' ? '%' : '$'}
                  </span>
                </div>
              </div>

              {/* Submit Button */}
              <div style={{ display: 'flex', alignItems: 'flex-end', marginTop: '18px' }}>
                <button
                  type="button"
                  className="button primary"
                  disabled={bulkBusy}
                  onClick={handleBulkAdjustPrice}
                  style={{ padding: '9px 18px', fontSize: '13px', fontWeight: 700, borderRadius: '8px', background: adjustDir === 'increase' ? '#2563eb' : '#dc2626' }}
                >
                  {bulkBusy ? <RefreshCw size={15} className="animate-spin" /> : <Save size={15} />}
                  <span>
                    {adjustDir === 'increase' ? say('تطبيق الزيادة في السعر', 'Apply Price Increase') : say('تطبيق التخفيض في السعر', 'Apply Price Reduction')}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ════════════════════════════════════════════════════════════════════════
          TAB 2: DISCOUNTS & OFFERS (إدارة الخصومات والعروض)
          ════════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'discounts' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* 1. CLEAR ALL DISCOUNTS BANNER (ازاله كل الخصومات دفعة واحدة) */}
          <div
            className="card"
            style={{
              padding: '20px 24px',
              borderRadius: '16px',
              background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.08) 0%, rgba(220, 38, 38, 0.03) 100%)',
              border: '1.5px solid rgba(239, 68, 68, 0.3)',
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '16px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', maxWidth: '650px' }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(239, 68, 68, 0.15)', color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Trash2 size={24} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#b91c1c' }}>
                  {say('إزالة جميع الخصومات الحالية دفعةً واحدة', 'Clear All Active Discounts Storewide')}
                </h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'var(--muted)' }}>
                  {say(
                    'حذف كل نسب الخصم والأسعار المشطوبة عن الأصناف وإرجاع سعر البيع ليكون هو السعر الأصلي الوحيد. تسجل في سجل التدقيق.',
                    'Clears all discount percentages and crossed-out prices. Current selling price becomes the baseline.'
                  )}
                </p>
              </div>
            </div>

            <button
              type="button"
              className="button"
              disabled={bulkBusy}
              onClick={handleClearDiscounts}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '12px 24px',
                fontSize: '14px',
                fontWeight: 700,
                borderRadius: '10px',
                background: '#dc2626',
                color: '#fff',
                border: 'none',
                boxShadow: '0 4px 14px rgba(220, 38, 38, 0.3)',
                cursor: 'pointer'
              }}
            >
              {bulkBusy ? <RefreshCw size={18} className="animate-spin" /> : <Trash2 size={18} />}
              <span>
                {selectedVariants.size > 0
                  ? say(`إزالة الخصم عن (${selectedVariants.size}) عنصر محدد`, `Clear Discount on (${selectedVariants.size}) Selected`)
                  : (categoryFilter !== 'all'
                    ? say(`إزالة كل خصومات فئة "${categoryNames[categoryFilter]?.[lang] || categoryFilter}"`, `Clear All in "${categoryNames[categoryFilter]?.[lang] || categoryFilter}"`)
                    : say('إزالة كل الخصومات من المتجر بالكامل', 'Clear All Discounts Storewide'))}
              </span>
            </button>
          </div>

          {/* 2. ADVANCED DISCOUNT APPLICATION TOOL */}
          <div
            className="card"
            style={{
              padding: '20px 24px',
              borderRadius: '16px',
              background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.06) 0%, rgba(217, 119, 6, 0.02) 100%)',
              border: '1.5px solid rgba(245, 158, 11, 0.3)',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(245, 158, 11, 0.15)', color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Tag size={20} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#b45309' }}>
                    {say('تطبيق خصم جديد حسب الفئة والنطاق السعري', 'Apply New Discount By Category & Price Range')}
                  </h3>
                  <small style={{ color: 'var(--muted)', fontSize: '12px' }}>
                    {say('يتم اعتماد السعر الحالي كسعر أصلي مشطوب، ويُحسب سعر البيع الجديد بعد خصم النسبة تلقائياً.', 'Sets current price as original anchor and computes discounted sale price.')}
                  </small>
                </div>
              </div>

              {/* Quick Preset Chips */}
              <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--muted)' }}>{say('نسب سريعة:', 'Quick %:')}</span>
                {[5, 10, 15, 20, 25, 30].map(pct => (
                  <button
                    key={pct}
                    type="button"
                    className="button secondary"
                    style={{ padding: '4px 10px', fontSize: '11px', borderRadius: '8px', fontWeight: 700 }}
                    onClick={() => {
                      setDiscountPctInput(String(pct));
                      handleApplyDiscountAdv(pct);
                    }}
                    title={say(`تطبيق خصم ${pct}% مباشرة`, `Apply ${pct}% discount now`)}
                  >
                    {pct}%
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '14px', alignItems: 'flex-end', paddingTop: '8px', borderTop: '1px dashed var(--border)' }}>
              {/* Category */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--muted)' }}>
                  {say('الفئة المستهدفة بالخصم:', 'Target Category:')}
                </label>
                <select
                  value={discountTargetCat}
                  onChange={e => setDiscountTargetCat(e.target.value)}
                  style={{ padding: '8px 12px', borderRadius: '8px', fontSize: '13px', border: '1px solid var(--border)', background: 'var(--surface)' }}
                >
                  {Object.entries(categoryNames).map(([key, name]) => (
                    <option key={key} value={key}>{name[lang]}</option>
                  ))}
                </select>
              </div>

              {/* Price Range */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--muted)' }}>
                  {say('نطاق السعر ($ من - إلى):', 'Price Range ($ Min - Max):')}
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <input
                    type="number"
                    dir="ltr"
                    placeholder="0"
                    value={discountRangeMin}
                    onChange={e => setDiscountRangeMin(e.target.value)}
                    style={{ width: '75px', padding: '7px 8px', fontSize: '12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--surface)' }}
                  />
                  <span style={{ fontSize: '12px', color: 'var(--muted)' }}>{say('إلى', 'to')}</span>
                  <input
                    type="number"
                    dir="ltr"
                    placeholder="∞"
                    value={discountRangeMax}
                    onChange={e => setDiscountRangeMax(e.target.value)}
                    style={{ width: '75px', padding: '7px 8px', fontSize: '12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--surface)' }}
                  />
                </div>
              </div>

              {/* Discount Percentage */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--muted)' }}>
                  {say('نسبة الخصم المطلوبة (%):', 'Discount Percent (%):')}
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="number"
                    dir="ltr"
                    min="1"
                    max="90"
                    value={discountPctInput}
                    onChange={e => setDiscountPctInput(e.target.value)}
                    style={{ width: '85px', padding: '7px 10px', fontSize: '14px', fontWeight: 700, borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--surface)' }}
                  />
                  <span style={{ position: 'absolute', insetInlineEnd: '8px', top: '50%', transform: 'translateY(-50%)', fontWeight: 700, fontSize: '12px', color: '#d97706' }}>
                    %
                  </span>
                </div>
              </div>

              {/* Apply Button */}
              <button
                type="button"
                className="button primary"
                disabled={bulkBusy}
                onClick={() => handleApplyDiscountAdv()}
                style={{ padding: '9px 20px', fontSize: '13px', fontWeight: 700, borderRadius: '8px', background: '#d97706' }}
              >
                {bulkBusy ? <RefreshCw size={15} className="animate-spin" /> : <Tag size={15} />}
                <span>
                  {selectedVariants.size > 0
                    ? say(`تطبيق الخصم على (${selectedVariants.size}) عنصر محدد`, `Apply to (${selectedVariants.size}) Selected`)
                    : say('تطبيق الخصم الآن', 'Apply Discount Now')}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════════
          TAB 3: PRICE HISTORY & AUDIT LOG (سجل ومراقبة الأسعار)
          ════════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'history' && (
        <PriceHistoryView />
      )}

      {/* ════════════════════════════════════════════════════════════════════════
          DATA TABLE (SHOWN ON PRICING AND DISCOUNTS TABS)
          ════════════════════════════════════════════════════════════════════════ */}
      {activeTab !== 'history' && (
        <>
          {/* Toolbar: Search, Filters & Bulk Operations */}
          <div
            className="card"
            style={{
              padding: '16px',
              borderRadius: '14px',
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px'
            }}
          >
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center', justifyContent: 'space-between' }}>
              {/* Search Box */}
              <div style={{ position: 'relative', flex: '1', minWidth: '220px', maxWidth: '380px' }}>
                <Search size={16} style={{ position: 'absolute', insetInlineStart: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }} />
                <input
                  type="text"
                  placeholder={say('بحث باسم المنتج، الموديل، أو SKU...', 'Search title, model, or SKU...')}
                  value={search}
                  onChange={e => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  style={{
                    width: '100%',
                    paddingInlineStart: '36px',
                    paddingBlock: '9px',
                    fontSize: '13px',
                    borderRadius: '10px',
                    border: '1px solid var(--border)'
                  }}
                />
              </div>

              {/* Category Dropdown */}
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--muted)' }}>
                  {say('الفئة:', 'Category:')}
                </label>
                <select
                  value={categoryFilter}
                  onChange={e => {
                    setCategoryFilter(e.target.value);
                    setPage(1);
                  }}
                  style={{ padding: '8px 12px', borderRadius: '10px', fontSize: '13px', border: '1px solid var(--border)', background: 'var(--surface-soft)' }}
                >
                  {Object.entries(categoryNames).map(([key, name]) => (
                    <option key={key} value={key}>{name[lang]}</option>
                  ))}
                </select>
              </div>

              {/* Status Filter Buttons (for Pricing Tab) */}
              {activeTab === 'pricing' && (
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {(
                    [
                      { key: 'all', labelAr: 'الكل', labelEn: 'All' },
                      { key: 'unpriced', labelAr: `⚠️ غير مسعّر (${stats.unpricedCount})`, labelEn: `⚠️ Unpriced (${stats.unpricedCount})` },
                      { key: 'priced', labelAr: `مسعّر (${stats.pricedCount})`, labelEn: `Priced (${stats.pricedCount})` },
                      { key: 'negotiable', labelAr: `قابل للتفاوض (${stats.negotiableCount})`, labelEn: `Negotiable (${stats.negotiableCount})` }
                    ] as const
                  ).map(f => (
                    <button
                      key={f.key}
                      type="button"
                      className={`button ${statusFilter === f.key ? 'primary' : 'secondary'}`}
                      style={{ padding: '7px 12px', fontSize: '12px', borderRadius: '8px' }}
                      onClick={() => {
                        setStatusFilter(f.key);
                        setPage(1);
                      }}
                    >
                      {ar ? f.labelAr : f.labelEn}
                    </button>
                  ))}
                </div>
              )}

              {/* Status Filter Buttons (for Discounts Tab) */}
              {activeTab === 'discounts' && (
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {(
                    [
                      { key: 'all', labelAr: 'كل الأصناف', labelEn: 'All Items' },
                      { key: 'discounted', labelAr: `🏷️ عليها خصم (${discountStats.discountedCount})`, labelEn: `🏷️ On Sale (${discountStats.discountedCount})` },
                      { key: 'no_discount', labelAr: `بدون خصم (${discountStats.nonDiscountedCount})`, labelEn: `Regular (${discountStats.nonDiscountedCount})` }
                    ] as const
                  ).map(f => (
                    <button
                      key={f.key}
                      type="button"
                      className={`button ${discountStatusFilter === f.key ? 'primary' : 'secondary'}`}
                      style={{ padding: '7px 12px', fontSize: '12px', borderRadius: '8px' }}
                      onClick={() => {
                        setDiscountStatusFilter(f.key);
                        setPage(1);
                      }}
                    >
                      {ar ? f.labelAr : f.labelEn}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Quick Selected Actions Bar */}
            {selectedVariants.size > 0 && (
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px',
                  padding: '10px 14px',
                  borderRadius: '10px',
                  background: 'rgba(59, 130, 246, 0.08)',
                  border: '1px solid rgba(59, 130, 246, 0.2)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <strong style={{ fontSize: '13px', color: '#1d4ed8' }}>
                    {say(`تم تحديد ${selectedVariants.size} عنصر:`, `${selectedVariants.size} items selected:`)}
                  </strong>
                  <button
                    type="button"
                    className="button secondary"
                    style={{ padding: '3px 8px', fontSize: '11px' }}
                    onClick={() => setSelectedVariants(new Set())}
                  >
                    {say('إلغاء التحديد', 'Clear Selection')}
                  </button>
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
                  {/* Set Fixed Price on Selection */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span style={{ fontSize: '12px' }}>$</span>
                    <input
                      type="number"
                      dir="ltr"
                      value={bulkFixedPrice}
                      onChange={e => setBulkFixedPrice(e.target.value)}
                      style={{ width: '65px', padding: '4px 6px', fontSize: '12px', borderRadius: '6px', border: '1px solid var(--border)' }}
                    />
                    <button
                      type="button"
                      className="button secondary"
                      disabled={bulkBusy}
                      onClick={handleBulkFixedPrice}
                      style={{ padding: '5px 9px', fontSize: '11px', borderRadius: '6px' }}
                    >
                      {say('تعيين السعر', 'Set Price')}
                    </button>
                  </div>

                  {/* Clear discount on selection */}
                  <button
                    type="button"
                    className="button"
                    disabled={bulkBusy}
                    onClick={handleClearDiscounts}
                    style={{ padding: '5px 10px', fontSize: '11px', borderRadius: '6px', background: '#dc2626', color: '#fff', border: 'none' }}
                  >
                    <Trash2 size={13} style={{ display: 'inline', marginInlineEnd: '4px' }} />
                    {say('إزالة الخصم عن المحدد', 'Clear Discount on Selected')}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Pricing & Discounts Table */}
          <div
            className="card"
            style={{
              padding: '0',
              borderRadius: '14px',
              overflow: 'hidden',
              border: '1px solid var(--border)',
              background: 'var(--surface)'
            }}
          >
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: ar ? 'right' : 'left' }}>
                <thead>
                  <tr style={{ background: 'var(--surface-soft)', borderBottom: '1px solid var(--border)', fontSize: '12px', color: 'var(--muted)', fontWeight: 700 }}>
                    <th style={{ padding: '12px 14px', width: '40px', textAlign: 'center' }}>
                      <input
                        type="checkbox"
                        checked={pageItems.length > 0 && selectedVariants.size === pageItems.length}
                        onChange={toggleSelectAll}
                      />
                    </th>
                    <th style={{ padding: '12px 14px' }}>{say('المنتج والموديل', 'Product & Model')}</th>
                    <th style={{ padding: '12px 14px' }}>{say('الفئة / الـ SKU', 'Category / SKU')}</th>
                    <th style={{ padding: '12px 14px' }}>{say('الحالة والمخزون', 'Condition & Stock')}</th>
                    <th style={{ padding: '12px 14px', minWidth: '130px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span>{say('السعر الأصلي ($)', 'Original ($ USD)')}</span>
                        <small style={{ fontWeight: 400, color: 'var(--muted)', fontSize: '10px' }}>{say('(قبل الخصم)', 'Before discount')}</small>
                      </div>
                    </th>
                    <th style={{ padding: '12px 14px', minWidth: '140px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ color: '#059669', fontWeight: 700 }}>{say('السعر بعد الخصم ($)', 'Sale Price ($ USD)')}</span>
                        <small style={{ fontWeight: 400, color: 'var(--muted)', fontSize: '10px' }}>{say('(سعر البيع المعتمد)', 'Customer Price')}</small>
                      </div>
                    </th>
                    <th style={{ padding: '12px 14px', minWidth: '130px' }}>{say('المعادل بالريال (YER)', 'Calculated YER')}</th>
                    <th style={{ padding: '12px 14px' }}>{say('قابل للتفاوض', 'Negotiable')}</th>
                    <th style={{ padding: '12px 14px', width: '120px', textAlign: 'center' }}>{say('الإجراء', 'Action')}</th>
                  </tr>
                </thead>
                <tbody>
                  {pageItems.length === 0 ? (
                    <tr>
                      <td colSpan={9} style={{ padding: '40px', textAlign: 'center', color: 'var(--muted)' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                          <AlertTriangle size={32} style={{ color: '#f59e0b', opacity: 0.8 }} />
                          <strong>{say('لا توجد منتجات تطابق الفلاتر المحددة', 'No items match the selected filter')}</strong>
                          {statusFilter === 'unpriced' && (
                            <p style={{ margin: 0, fontSize: '13px', color: '#10b981' }}>
                              🎉 {say('رائع! جميع المنتجات مسعّرة حالياً.', 'Awesome! All catalog items are priced.')}
                            </p>
                          )}
                        </div>
                      </td>
                    </tr>
                  ) : (
                    pageItems.map(item => {
                      const edit = rowEdits[item.variantId];
                      const currentUsdStr = edit !== undefined ? edit.priceUsd : (item.priceUsd ?? '');
                      const currentOrigUsdStr = edit !== undefined ? edit.originalPriceUsd : (item.originalPriceUsd ?? '');
                      const currentNeg = edit !== undefined ? edit.negotiable : item.negotiable;

                      const isModified = edit !== undefined && (
                        edit.priceUsd !== (item.priceUsd ?? '') ||
                        edit.originalPriceUsd !== (item.originalPriceUsd ?? '') ||
                        edit.negotiable !== item.negotiable
                      );

                      const numVal = Number(currentUsdStr);
                      const isPriced = !isNaN(numVal) && numVal > 0 && currentUsdStr !== '';
                      const numOrigVal = Number(currentOrigUsdStr);
                      const hasOrig = !isNaN(numOrigVal) && numOrigVal > 0 && currentOrigUsdStr !== '';

                      // Dynamic discount percent calculation
                      const computedDiscountPct = (hasOrig && isPriced && numOrigVal > numVal)
                        ? Math.round(((numOrigVal - numVal) / numOrigVal) * 100)
                        : null;

                      const calcSaleYer = isPriced ? Math.round(numVal * effectiveRateNum) : null;
                      const calcOrigYer = hasOrig ? Math.round(numOrigVal * effectiveRateNum) : null;

                      const isSelected = selectedVariants.has(item.variantId);
                      const titleStr = typeof item.title === 'string' ? item.title : (item.title?.[lang] || item.title?.ar || item.model);

                      return (
                        <tr
                          key={item.variantId}
                          style={{
                            borderBottom: '1px solid var(--border)',
                            background: isSelected ? 'rgba(59, 130, 246, 0.04)' : undefined,
                            transition: 'background 0.15s ease'
                          }}
                        >
                          {/* Checkbox */}
                          <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleSelectOne(item.variantId)}
                            />
                          </td>

                          {/* Product & Media */}
                          <td style={{ padding: '12px 14px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                              {item.image ? (
                                <img
                                  src={item.image.replace('/api/media/', '/api/admin/media/')}
                                  alt=""
                                  style={{ width: '42px', height: '42px', objectFit: 'contain', borderRadius: '8px', background: 'var(--surface-soft)', border: '1px solid var(--border)' }}
                                />
                              ) : (
                                <div style={{ width: '42px', height: '42px', borderRadius: '8px', background: 'var(--surface-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)' }}>
                                  <Package size={20} />
                                </div>
                              )}
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                <strong style={{ fontSize: '13px', color: 'var(--primary-text)' }}>
                                  {titleStr}
                                </strong>
                                <small style={{ color: 'var(--muted)', fontSize: '11px' }}>
                                  {item.brand} · <span dir="ltr">{item.model}</span>
                                </small>
                              </div>
                            </div>
                          </td>

                          {/* Category & SKU */}
                          <td style={{ padding: '12px 14px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                              <span style={{ fontSize: '12px', fontWeight: 600 }}>
                                {categoryNames[item.category]?.[lang] || item.category}
                              </span>
                              <span dir="ltr" style={{ fontSize: '11px', color: 'var(--muted)', fontFamily: 'monospace' }}>
                                {item.sku}
                              </span>
                            </div>
                          </td>

                          {/* Condition & Stock */}
                          <td style={{ padding: '12px 14px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                              <span style={{ fontSize: '11px', fontWeight: 600 }}>
                                {item.condition === 'new' ? say('جديد', 'New') : `${say('مستخدم درجة', 'Grade')} ${item.condition}`}
                              </span>
                              <small style={{ color: item.quantity > 0 ? '#059669' : '#d97706', fontSize: '11px', fontWeight: 600 }}>
                                {item.inventoryMode === 'serialized'
                                  ? `${item.availableUnits} ${say('قطعة متوفرة', 'units')}`
                                  : `${item.quantity} ${say('في المخزون', 'in stock')}`}
                              </small>
                            </div>
                          </td>

                          {/* Original Price USD ($) Input */}
                          <td style={{ padding: '12px 14px' }}>
                            <div style={{ position: 'relative', width: '105px' }}>
                              <input
                                dir="ltr"
                                type="text"
                                inputMode="decimal"
                                placeholder={say('الأصلي', 'Orig')}
                                value={currentOrigUsdStr}
                                onChange={e => {
                                  const val = e.target.value;
                                  setRowEdits(prev => ({
                                    ...prev,
                                    [item.variantId]: {
                                      priceUsd: prev[item.variantId]?.priceUsd ?? (item.priceUsd ?? ''),
                                      originalPriceUsd: val,
                                      negotiable: prev[item.variantId]?.negotiable ?? item.negotiable
                                    }
                                  }));
                                }}
                                style={{
                                  width: '100%',
                                  padding: '7px 8px 7px 20px',
                                  fontSize: '12px',
                                  fontWeight: 600,
                                  borderRadius: '8px',
                                  border: '1px dashed var(--border)',
                                  background: 'var(--surface-soft)',
                                  color: 'var(--muted)',
                                  textDecoration: hasOrig && isPriced && numOrigVal > numVal ? 'line-through' : 'none'
                                }}
                              />
                              <span style={{ position: 'absolute', insetInlineStart: '6px', top: '50%', transform: 'translateY(-50%)', fontWeight: 700, fontSize: '11px', color: 'var(--muted)' }}>
                                $
                              </span>
                            </div>
                          </td>

                          {/* Sale Price USD ($) Input & Discount Badge */}
                          <td style={{ padding: '12px 14px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                              <div style={{ position: 'relative', width: '110px' }}>
                                <input
                                  dir="ltr"
                                  type="text"
                                  inputMode="decimal"
                                  placeholder={say('غير مسعّر', '0.00')}
                                  value={currentUsdStr}
                                  onChange={e => {
                                    const val = e.target.value;
                                    setRowEdits(prev => ({
                                      ...prev,
                                      [item.variantId]: {
                                        priceUsd: val,
                                        originalPriceUsd: prev[item.variantId]?.originalPriceUsd ?? (item.originalPriceUsd ?? ''),
                                        negotiable: prev[item.variantId]?.negotiable ?? item.negotiable
                                      }
                                    }));
                                  }}
                                  style={{
                                    width: '100%',
                                    padding: '7px 8px 7px 22px',
                                    fontSize: '13px',
                                    fontWeight: 700,
                                    borderRadius: '8px',
                                    border: isPriced
                                      ? (isModified ? '1.5px solid #3b82f6' : '1px solid var(--border)')
                                      : '1.5px dashed #f59e0b',
                                    background: isPriced ? 'var(--surface-soft)' : 'rgba(245, 158, 11, 0.05)',
                                    color: isPriced ? '#059669' : '#d97706'
                                  }}
                                />
                                <span style={{ position: 'absolute', insetInlineStart: '7px', top: '50%', transform: 'translateY(-50%)', fontWeight: 700, fontSize: '12px', color: '#059669' }}>
                                  $
                                </span>
                              </div>

                              {computedDiscountPct !== null && computedDiscountPct > 0 && (
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', fontSize: '10px', fontWeight: 700, color: '#ef4444', background: 'rgba(239, 68, 68, 0.1)', padding: '1px 6px', borderRadius: '4px', alignSelf: 'flex-start' }}>
                                  <Percent size={10} />
                                  {say(`خصم ${computedDiscountPct}%`, `${computedDiscountPct}% OFF`)}
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Calculated YER Price (with original crossed out if discount exists) */}
                          <td style={{ padding: '12px 14px' }}>
                            {calcSaleYer ? (
                              <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <strong style={{ fontSize: '13px', color: '#059669', fontWeight: 700 }}>
                                  {calcSaleYer.toLocaleString(lang)}
                                </strong>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                  <small style={{ fontSize: '10px', color: 'var(--muted)' }}>YER</small>
                                  {calcOrigYer && calcOrigYer > calcSaleYer && (
                                    <span style={{ fontSize: '10px', color: 'var(--muted)', textDecoration: 'line-through' }}>
                                      {calcOrigYer.toLocaleString(lang)}
                                    </span>
                                  )}
                                </div>
                              </div>
                            ) : (
                              <span style={{ fontSize: '11px', color: '#d97706', fontWeight: 600 }}>
                                {say('اسأل عن السعر', 'Ask for price')}
                              </span>
                            )}
                          </td>

                          {/* Negotiable Toggle */}
                          <td style={{ padding: '12px 14px' }}>
                            <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '12px' }}>
                              <input
                                type="checkbox"
                                checked={currentNeg}
                                onChange={e => {
                                  const checked = e.target.checked;
                                  setRowEdits(prev => ({
                                    ...prev,
                                    [item.variantId]: {
                                      priceUsd: prev[item.variantId]?.priceUsd ?? (item.priceUsd ?? ''),
                                      originalPriceUsd: prev[item.variantId]?.originalPriceUsd ?? (item.originalPriceUsd ?? ''),
                                      negotiable: checked
                                    }
                                  }));
                                }}
                              />
                              <span style={{ color: currentNeg ? '#059669' : 'var(--muted)', fontWeight: currentNeg ? 700 : 400 }}>
                                {currentNeg ? say('نعم (تفاوض)', 'Yes') : say('ثابت', 'Fixed')}
                              </span>
                            </label>
                          </td>

                          {/* Action Button */}
                          <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                              {edit?.saved ? (
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#10b981', fontSize: '12px', fontWeight: 700 }}>
                                  <Check size={16} />
                                  {say('تم', 'Saved')}
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  className={`button ${isModified ? 'primary' : 'secondary'}`}
                                  disabled={edit?.saving || !isModified}
                                  onClick={() => handleSaveRowPrice(item)}
                                  style={{
                                    padding: '6px 10px',
                                    fontSize: '11px',
                                    borderRadius: '7px',
                                    opacity: isModified ? 1 : 0.5
                                  }}
                                  title={say('حفظ التعديلات', 'Save changes')}
                                >
                                  {edit?.saving ? (
                                    <RefreshCw size={13} className="animate-spin" />
                                  ) : (
                                    <Save size={13} />
                                  )}
                                  <span>{say('حفظ', 'Save')}</span>
                                </button>
                              )}

                              {/* Remove Discount Button if item has a discount */}
                              {hasOrig && (
                                <button
                                  type="button"
                                  className="button secondary"
                                  onClick={() => handleRemoveSingleDiscount(item)}
                                  style={{ padding: '6px 8px', fontSize: '11px', borderRadius: '7px', color: '#dc2626' }}
                                  title={say('إلغاء الخصم عن هذا الصنف', 'Remove discount from item')}
                                >
                                  <XCircle size={13} />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Bar */}
            {totalPages > 1 && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 18px',
                  borderTop: '1px solid var(--border)',
                  fontSize: '12px',
                  background: 'var(--surface-soft)'
                }}
              >
                <span style={{ color: 'var(--muted)' }}>
                  {say(`عرض ${(page - 1) * pageSize + 1} - ${Math.min(page * pageSize, filteredItems.length)} من أصل ${filteredItems.length}`, `Showing ${(page - 1) * pageSize + 1} - ${Math.min(page * pageSize, filteredItems.length)} of ${filteredItems.length}`)}
                </span>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button
                    type="button"
                    className="button secondary"
                    disabled={page <= 1}
                    onClick={() => setPage(p => p - 1)}
                    style={{ padding: '5px 10px', fontSize: '11px' }}
                  >
                    {say('السابق', 'Previous')}
                  </button>
                  <span style={{ padding: '5px 8px', fontWeight: 700 }}>
                    {page} / {totalPages}
                  </span>
                  <button
                    type="button"
                    className="button secondary"
                    disabled={page >= totalPages}
                    onClick={() => setPage(p => p + 1)}
                    style={{ padding: '5px 10px', fontSize: '11px' }}
                  >
                    {say('التالي', 'Next')}
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default PricingAdmin;
