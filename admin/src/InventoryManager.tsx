import { useState, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Warehouse, Boxes, Package, ArrowUpRight, ArrowDownRight,
  AlertTriangle, CheckCircle2, Clock, Search, Plus, Minus,
  History, RefreshCw, Copy, Check, FileSpreadsheet, ArrowRightLeft,
  Layers, ExternalLink, X, ChevronLeft, ChevronRight, Tag, ShieldCheck,
  RotateCcw, User
} from 'lucide-react';
import { api, ApiError } from './api';
import { useI18n } from './i18n';
import { Loading, ErrorBox } from './components';
import './inventory.css';

type Row = Record<string, unknown>;

const object = (v: unknown): Row => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Row) : {});
const list = (v: unknown): Row[] => (Array.isArray(v) ? v.map(object) : []);
const string = (v: unknown) => (v == null ? '' : String(v));
const localized = (v: unknown, lang: string) => string(object(v)[lang]);

interface InventoryResponse {
  items: Row[];
  total: number;
  movements: Row[];
}

function getItemImage(v: Row): string | null {
  if (Array.isArray(v.images) && v.images.length > 0 && typeof v.images[0] === 'string') {
    return v.images[0];
  }
  const prod = object(v.product);
  if (Array.isArray(prod.images) && prod.images.length > 0) {
    const first = prod.images[0];
    if (typeof first === 'string') return first;
    if (typeof first === 'object' && first !== null) {
      const media = (first as Record<string, unknown>).media;
      if (media && typeof media === 'object') {
        const path = (media as Record<string, unknown>).originalPath;
        if (typeof path === 'string') return path;
      }
    }
  }
  return null;
}

export function InventoryManager() {
  const { lang } = useI18n();
  const ar = lang === 'ar';
  const client = useQueryClient();
  const say = useCallback((arabic: string, english: string) => (ar ? arabic : english), [ar]);

  // View state
  const [activeTab, setActiveTab] = useState<'inventory' | 'movements'>('inventory');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [stockFilter, setStockFilter] = useState<'all' | 'in_stock' | 'low_stock' | 'zero_stock'>('all');
  const [reviewFilter, setReviewFilter] = useState<'all' | 'reviewed' | 'needs_review'>('all');
  const [modeFilter, setModeFilter] = useState<'all' | 'quantity' | 'serialized'>('all');

  // Adjustment modal state
  const [selectedVariant, setSelectedVariant] = useState<Row | null>(null);
  const [delta, setDelta] = useState<number>(1);
  const [movementType, setMovementType] = useState<'in' | 'out' | 'audit'>('in');
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [adjustError, setAdjustError] = useState('');

  // SKU Copy Feedback
  const [copiedSku, setCopiedSku] = useState<string | null>(null);

  // Fetch Inventory Data
  const { data, isPending, isError, refetch, isFetching } = useQuery<InventoryResponse>({
    queryKey: ['inventory', q, page],
    queryFn: () => api<InventoryResponse>('/commerce/inventory?q=' + encodeURIComponent(q) + '&page=' + page),
  });

  const handleCopySku = (sku: string) => {
    navigator.clipboard.writeText(sku).then(() => {
      setCopiedSku(sku);
      setTimeout(() => setCopiedSku(null), 2000);
    });
  };

  const openAdjust = (variant: Row, defaultDelta = 1, type: 'in' | 'out' | 'audit' = 'in') => {
    setSelectedVariant(variant);
    setMovementType(type);
    setDelta(type === 'audit' ? 0 : defaultDelta);
    setReason(
      type === 'in'
        ? (ar ? 'استلام وتوريد شحنة جديدة' : 'New stock received')
        : type === 'audit'
        ? (ar ? 'تسوية جرد دوري ومطابقة الرصيد' : 'Periodic stock audit')
        : (ar ? 'صرف أو تسوية نقص' : 'Stock deduction')
    );
    setAdjustError('');
  };

  const closeAdjust = () => {
    if (isSubmitting) return;
    setSelectedVariant(null);
    setAdjustError('');
  };

  const submitAdjust = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVariant) return;
    setAdjustError('');
    setIsSubmitting(true);

    try {
      await api('/commerce/inventory/adjust', {
        method: 'POST',
        body: {
          variantId: selectedVariant.id,
          revision: string(selectedVariant.updatedAt),
          delta,
          reason: reason.trim(),
        },
      });

      setSelectedVariant(null);
      await client.invalidateQueries({ queryKey: ['inventory'] });
      await client.invalidateQueries({ queryKey: ['commerce-reference'] });
    } catch (err) {
      setAdjustError(err instanceof ApiError ? err.code : 'failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filter items in current view
  const filteredItems = useMemo(() => {
    if (!data?.items) return [];
    return data.items.filter((item) => {
      const mode = string(item.inventoryMode);
      const isSerialized = mode === 'serialized';
      const availableUnits = isSerialized ? list(item.units).filter((u) => u.available).length : Number(item.quantity) || 0;
      const isReviewed = Boolean(item.inventoryReviewed);

      // Mode filter
      if (modeFilter === 'quantity' && isSerialized) return false;
      if (modeFilter === 'serialized' && !isSerialized) return false;

      // Review filter
      if (reviewFilter === 'reviewed' && !isReviewed) return false;
      if (reviewFilter === 'needs_review' && isReviewed) return false;

      // Stock filter
      if (stockFilter === 'zero_stock' && availableUnits > 0) return false;
      if (stockFilter === 'in_stock' && availableUnits <= 0) return false;
      if (stockFilter === 'low_stock' && (availableUnits <= 0 || availableUnits > 3)) return false;

      return true;
    });
  }, [data?.items, modeFilter, reviewFilter, stockFilter]);

  // Stats calculation
  const stats = useMemo(() => {
    const items = data?.items || [];
    const total = data?.total || 0;
    let inStock = 0;
    let outOfStock = 0;
    let needsReview = 0;

    items.forEach((item) => {
      const isSerialized = string(item.inventoryMode) === 'serialized';
      const count = isSerialized ? list(item.units).filter((u) => u.available).length : Number(item.quantity) || 0;
      if (count > 0) inStock++;
      else outOfStock++;
      if (!item.inventoryReviewed) needsReview++;
    });

    return { total, inStock, outOfStock, needsReview };
  }, [data]);

  const quickReasons = useMemo(() => {
    if (ar) {
      return [
        'استلام وتوريد شحنة جديدة',
        'تسوية جرد دوري ومطابقة الرصيد',
        'مرتجع سليم من عميل',
        'خصم عينة معروضة بالمحل',
        'إتلاف أو بضاعة متضررة',
        'تعديل رصيد افتتاحي',
      ];
    }
    return [
      'New inventory shipment received',
      'Periodic stock audit adjustment',
      'Customer return in good condition',
      'Display showroom sample deduction',
      'Damaged or defective stock deduction',
      'Opening balance adjustment',
    ];
  }, [ar]);

  const totalPages = Math.max(1, Math.ceil((data?.total || 0) / 24));

  return (
    <div className="inv-container" dir={ar ? 'rtl' : 'ltr'}>
      {/* ─── Page Header ─── */}
      <div className="inv-header">
        <div className="inv-title-group">
          <h1>
            <Warehouse size={26} color="var(--primary)" />
            <span>{say('إدارة المخزون والمستودع', 'Inventory & Stock Control')}</span>
          </h1>
          <p>
            {say(
              'متابعة أرصدة الأصناف، تنبيهات النواقص، وتسجيل حركات الإدخال والإخراج والضبط بدقة',
              'Monitor variant quantities, track out-of-stock alerts, and record auditable stock adjustments'
            )}
          </p>
        </div>

        <div className="inv-header-actions">
          <Link to="/units" className="button secondary">
            <Package size={16} />
            <span>{say('القطع المنفردة (S/N)', 'Individual Units (S/N)')}</span>
          </Link>
          <Link to="/csv" className="button secondary">
            <FileSpreadsheet size={16} />
            <span>{say('استيراد / تصدير CSV', 'CSV Import / Export')}</span>
          </Link>
          <button
            type="button"
            className="button subtle"
            onClick={() => refetch()}
            disabled={isFetching}
            title={say('تحديث البيانات', 'Refresh data')}
          >
            <RefreshCw size={16} className={isFetching ? 'spin' : ''} />
            <span>{say('تحديث', 'Refresh')}</span>
          </button>
        </div>
      </div>

      {/* ─── Interactive KPI Stats Cards (Clickable Quick Filters) ─── */}
      <div className="inv-stats-grid">
        {/* Total Variants */}
        <div
          className={`inv-stat-card ${stockFilter === 'all' && reviewFilter === 'all' ? 'active' : ''}`}
          onClick={() => {
            setStockFilter('all');
            setReviewFilter('all');
          }}
          title={say('عرض كافة الأصناف', 'Show all variants')}
        >
          <div className="inv-stat-icon-wrap purple">
            <Boxes size={22} />
          </div>
          <div className="inv-stat-info">
            <span className="inv-stat-value">{stats.total}</span>
            <span className="inv-stat-label">{say('إجمالي الأصناف المسجلة', 'Total Variants')}</span>
          </div>
        </div>

        {/* In Stock */}
        <div
          className={`inv-stat-card ${stockFilter === 'in_stock' ? 'active' : ''}`}
          onClick={() => {
            setStockFilter(stockFilter === 'in_stock' ? 'all' : 'in_stock');
          }}
          title={say('تصفية الأصناف المتوفرة فقط', 'Filter in-stock variants')}
        >
          <div className="inv-stat-icon-wrap green">
            <CheckCircle2 size={22} />
          </div>
          <div className="inv-stat-info">
            <span className="inv-stat-value">{stats.inStock}</span>
            <span className="inv-stat-label">{say('أصناف متوفرة (الصفحة)', 'In Stock (Page)')}</span>
          </div>
        </div>

        {/* Out of Stock */}
        <div
          className={`inv-stat-card ${stockFilter === 'zero_stock' ? 'active' : ''}`}
          onClick={() => {
            setStockFilter(stockFilter === 'zero_stock' ? 'all' : 'zero_stock');
          }}
          title={say('تصفية الأصناف النافدة (0)', 'Filter out of stock variants')}
        >
          <div className="inv-stat-icon-wrap amber">
            <AlertTriangle size={22} />
          </div>
          <div className="inv-stat-info">
            <span className="inv-stat-value">{stats.outOfStock}</span>
            <span className="inv-stat-label">{say('أصناف نافدة (الصفحة)', 'Out of Stock (Page)')}</span>
          </div>
        </div>

        {/* Needs Review */}
        <div
          className={`inv-stat-card ${reviewFilter === 'needs_review' ? 'active' : ''}`}
          onClick={() => {
            setReviewFilter(reviewFilter === 'needs_review' ? 'all' : 'needs_review');
          }}
          title={say('تصفية الأصناف التي تحتاج لمراجعة الرصيد', 'Filter variants needing audit')}
        >
          <div className="inv-stat-icon-wrap blue">
            <Clock size={22} />
          </div>
          <div className="inv-stat-info">
            <span className="inv-stat-value">{stats.needsReview}</span>
            <span className="inv-stat-label">{say('تحتاج مراجعة (الصفحة)', 'Needs Review (Page)')}</span>
          </div>
        </div>
      </div>

      {/* ─── Main Tabs Switcher ─── */}
      <div className="inv-nav-tabs">
        <button
          type="button"
          className={`inv-tab-btn ${activeTab === 'inventory' ? 'active' : ''}`}
          onClick={() => setActiveTab('inventory')}
        >
          <Boxes size={18} />
          <span>{say('جدول المخزون والأرصدة', 'Inventory Catalog')}</span>
          <span className="inv-tab-badge">{data?.total ?? 0}</span>
        </button>

        <button
          type="button"
          className={`inv-tab-btn ${activeTab === 'movements' ? 'active' : ''}`}
          onClick={() => setActiveTab('movements')}
        >
          <History size={18} />
          <span>{say('سجل حركات المخزون الأخير', 'Stock Movements Log')}</span>
          <span className="inv-tab-badge">{data?.movements?.length ?? 0}</span>
        </button>
      </div>

      {/* ─── Main Content ─── */}
      {isPending ? (
        <Loading />
      ) : isError ? (
        <ErrorBox code="failed" />
      ) : activeTab === 'inventory' ? (
        <>
          {/* Controls & Filter Panel */}
          <div className="inv-control-panel">
            <div className="inv-search-row">
              <div className="inv-search-input-wrap">
                <Search className="inv-search-icon" size={16} />
                <input
                  type="text"
                  className="inv-search-input"
                  value={q}
                  onChange={(e) => {
                    setQ(e.target.value);
                    setPage(1);
                  }}
                  placeholder={say('ابحث برمز SKU، اسم المنتج، أو الرقم التعريفي...', 'Search by SKU, product title, or ID...')}
                />
                {q && (
                  <button
                    type="button"
                    className="inv-search-clear"
                    onClick={() => {
                      setQ('');
                      setPage(1);
                    }}
                    aria-label={say('مسح', 'Clear')}
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            </div>

            <div className="inv-filters-row">
              {/* Stock Filter */}
              <select
                className="inv-filter-select"
                value={stockFilter}
                onChange={(e) => setStockFilter(e.target.value as typeof stockFilter)}
              >
                <option value="all">{say('حالة المخزون: الكل', 'Stock: All')}</option>
                <option value="in_stock">{say('متوفر فقط (> 0)', 'In Stock (> 0)')}</option>
                <option value="low_stock">{say('كمية منخفضة (1 - 3)', 'Low Stock (1 - 3)')}</option>
                <option value="zero_stock">{say('نافد من المخزون (0)', 'Out of Stock (0)')}</option>
              </select>

              {/* Review Filter */}
              <select
                className="inv-filter-select"
                value={reviewFilter}
                onChange={(e) => setReviewFilter(e.target.value as typeof reviewFilter)}
              >
                <option value="all">{say('حالة المراجعة: الكل', 'Audit: All')}</option>
                <option value="reviewed">{say('تمت المراجعة ✓', 'Reviewed ✓')}</option>
                <option value="needs_review">{say('تحتاج مراجعة ⚠', 'Requires Review ⚠')}</option>
              </select>

              {/* Mode Filter */}
              <select
                className="inv-filter-select"
                value={modeFilter}
                onChange={(e) => setModeFilter(e.target.value as typeof modeFilter)}
              >
                <option value="all">{say('نمط التتبع: الكل', 'Tracking Mode: All')}</option>
                <option value="quantity">{say('إدارة بالكمية (Quantity)', 'Quantity Based')}</option>
                <option value="serialized">{say('أرقام تسلسلية (Serialized)', 'Serialized S/N')}</option>
              </select>

              {(q || stockFilter !== 'all' || reviewFilter !== 'all' || modeFilter !== 'all') && (
                <button
                  type="button"
                  className="button subtle sm"
                  onClick={() => {
                    setQ('');
                    setStockFilter('all');
                    setReviewFilter('all');
                    setModeFilter('all');
                    setPage(1);
                  }}
                  title={say('إعادة ضبط الفلاتر', 'Reset filters')}
                >
                  <RotateCcw size={14} />
                  <span>{say('تفريغ الفلاتر', 'Reset')}</span>
                </button>
              )}
            </div>
          </div>

          {/* Empty State */}
          {filteredItems.length === 0 ? (
            <div className="inv-empty-state">
              <div className="inv-empty-icon">
                <Warehouse size={28} />
              </div>
              <h3>{say('لا توجد أصناف مطابقة', 'No items found')}</h3>
              <p>
                {say(
                  'لم يتم العثور على منتجات تطابق معايير البحث أو التصفية الحالية. جرب تغيير كلمات البحث أو إعادة ضبط الفلاتر.',
                  'No products matched the current search or filter conditions. Try adjusting your search term or reset filters.'
                )}
              </p>
            </div>
          ) : (
            <>
              {/* ─── Desktop Table Layout (>= 860px) ─── */}
              <div className="inv-table-wrap">
                <div className="inv-table-header">
                  <div>{say('المنتج والتفاصيل', 'Product & Details')}</div>
                  <div>{say('رمز SKU', 'SKU Code')}</div>
                  <div>{say('نمط التتبع', 'Mode')}</div>
                  <div>{say('حالة التدقيق', 'Audit Status')}</div>
                  <div>{say('الرصيد الحالي', 'Current Stock')}</div>
                  <div>{say('الإجراءات', 'Actions')}</div>
                </div>

                {filteredItems.map((v) => {
                  const prod = object(v.product);
                  const isSerialized = v.inventoryMode === 'serialized';
                  const unitsList = list(v.units);
                  const availUnits = isSerialized ? unitsList.filter((u) => u.available).length : Number(v.quantity) || 0;
                  const isReviewed = Boolean(v.inventoryReviewed);
                  const sku = string(v.sku);
                  const imgUrl = getItemImage(v);
                  const title = localized(prod.title, lang) || sku;
                  const model = string(prod.model);

                  return (
                    <div className="inv-table-row" key={string(v.id)}>
                      {/* Product & Details */}
                      <div className="inv-col-product">
                        {imgUrl ? (
                          <img
                            src={imgUrl}
                            alt={title}
                            className="inv-product-thumb"
                            loading="lazy"
                            onError={(e) => {
                              (e.currentTarget as HTMLImageElement).style.display = 'none';
                            }}
                          />
                        ) : (
                          <div className="inv-product-icon-fallback">
                            <Boxes size={20} />
                          </div>
                        )}
                        <div className="inv-product-info">
                          <span className="inv-product-title" title={title}>
                            {title}
                          </span>
                          {model && <span className="inv-product-model">{model}</span>}
                        </div>
                      </div>

                      {/* SKU Pill */}
                      <div>
                        <span className="inv-sku-pill" title={sku}>
                          <code dir="ltr">{sku}</code>
                          <button
                            type="button"
                            className="inv-copy-btn"
                            onClick={() => handleCopySku(sku)}
                            title={say('نسخ رمز SKU', 'Copy SKU')}
                          >
                            {copiedSku === sku ? <Check size={12} color="#10b981" /> : <Copy size={12} />}
                          </button>
                        </span>
                      </div>

                      {/* Tracking Mode */}
                      <div>
                        <span className="inv-stock-mode">
                          {isSerialized ? (
                            <>
                              <Tag size={13} color="#6366f1" />
                              <span>{say('أرقام تسلسلية', 'Serialized')}</span>
                            </>
                          ) : (
                            <>
                              <Boxes size={13} color="var(--primary)" />
                              <span>{say('بالكمية', 'Quantity')}</span>
                            </>
                          )}
                        </span>
                      </div>

                      {/* Audit Status */}
                      <div>
                        {isReviewed ? (
                          <span className="status-badge-modern published">
                            <span className="status-dot-inner" />
                            <span>{say('تمت المراجعة', 'Reviewed')}</span>
                          </span>
                        ) : (
                          <span className="status-badge-modern draft" title={say('تحتاج مراجعة وتأكيد الرصيد', 'Requires inventory check')}>
                            <span className="status-dot-inner" />
                            <span>{say('تحتاج مراجعة', 'Needs Review')}</span>
                          </span>
                        )}
                      </div>

                      {/* Current Stock */}
                      <div>
                        {isSerialized ? (
                          <span className="inv-stock-badge serialized">
                            <Package size={13} />
                            <span>
                              {availUnits} / {unitsList.length} {say('متوفرة', 'avail.')}
                            </span>
                          </span>
                        ) : availUnits === 0 ? (
                          <span className="inv-stock-badge zero">
                            <AlertTriangle size={13} />
                            <span>{say('نفد المخزون (0)', 'Out of Stock (0)')}</span>
                          </span>
                        ) : availUnits <= 3 ? (
                          <span className="inv-stock-badge low">
                            <Clock size={13} />
                            <span>{say(`منخفض (${availUnits})`, `Low (${availUnits})`)}</span>
                          </span>
                        ) : (
                          <span className="inv-stock-badge ok">
                            <CheckCircle2 size={13} />
                            <span>{say(`${availUnits} قطعة`, `${availUnits} in stock`)}</span>
                          </span>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="inv-actions-cell">
                        {!isSerialized ? (
                          <button
                            type="button"
                            className="button primary sm"
                            onClick={() => openAdjust(v, 1, 'in')}
                            title={say('تسجيل إدخال أو خصم أو جرد', 'Record stock adjustment')}
                          >
                            <ArrowRightLeft size={13} />
                            <span>{say('حركة مخزون', 'Adjust')}</span>
                          </button>
                        ) : (
                          <Link
                            to="/units"
                            className="button secondary sm"
                            title={say('إدارة القطع التسلسلية', 'Manage serialized units')}
                          >
                            <ExternalLink size={13} />
                            <span>{say('عرض القطع', 'Units')}</span>
                          </Link>
                        )}
                        <Link
                          to="/variants"
                          className="button subtle sm"
                          title={say('خيارات الكتالوج لهذا المنتج', 'View in catalog variants')}
                        >
                          <Layers size={13} />
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* ─── Dedicated Mobile Cards Layout (< 860px) ─── */}
              <div className="inv-mobile-cards-wrap">
                {filteredItems.map((v) => {
                  const prod = object(v.product);
                  const isSerialized = v.inventoryMode === 'serialized';
                  const unitsList = list(v.units);
                  const availUnits = isSerialized ? unitsList.filter((u) => u.available).length : Number(v.quantity) || 0;
                  const isReviewed = Boolean(v.inventoryReviewed);
                  const sku = string(v.sku);
                  const imgUrl = getItemImage(v);
                  const title = localized(prod.title, lang) || sku;
                  const model = string(prod.model);

                  return (
                    <div className="inv-mobile-card" key={string(v.id)}>
                      {/* Top Header: Image, Title, Model, Review status */}
                      <div className="inv-mobile-card-header">
                        {imgUrl ? (
                          <img
                            src={imgUrl}
                            alt={title}
                            className="inv-product-thumb"
                            loading="lazy"
                            onError={(e) => {
                              (e.currentTarget as HTMLImageElement).style.display = 'none';
                            }}
                          />
                        ) : (
                          <div className="inv-product-icon-fallback">
                            <Boxes size={20} />
                          </div>
                        )}

                        <div className="inv-mobile-card-title-group">
                          <span className="inv-mobile-card-title" title={title}>
                            {title}
                          </span>
                          {model && <span className="inv-mobile-card-model">{model}</span>}
                        </div>

                        {/* Audit status dot */}
                        {isReviewed ? (
                          <span className="status-badge-modern published" title={say('تمت المراجعة', 'Reviewed')}>
                            <span className="status-dot-inner" />
                            <span>{say('مراجَع', 'Reviewed')}</span>
                          </span>
                        ) : (
                          <span className="status-badge-modern draft" title={say('تحتاج مراجعة', 'Needs Review')}>
                            <span className="status-dot-inner" />
                            <span>{say('تحتاج فحص', 'Audit')}</span>
                          </span>
                        )}
                      </div>

                      {/* Middle Details Row: SKU + Mode + Current Stock */}
                      <div className="inv-mobile-card-details-row">
                        <span className="inv-sku-pill" title={sku}>
                          <code dir="ltr">{sku}</code>
                          <button
                            type="button"
                            className="inv-copy-btn"
                            onClick={() => handleCopySku(sku)}
                            title={say('نسخ SKU', 'Copy SKU')}
                          >
                            {copiedSku === sku ? <Check size={12} color="#10b981" /> : <Copy size={12} />}
                          </button>
                        </span>

                        {/* Current Stock Badge */}
                        {isSerialized ? (
                          <span className="inv-stock-badge serialized">
                            <Package size={12} />
                            <span>{availUnits} / {unitsList.length}</span>
                          </span>
                        ) : availUnits === 0 ? (
                          <span className="inv-stock-badge zero">
                            <AlertTriangle size={12} />
                            <span>{say('نافد (0)', 'Out (0)')}</span>
                          </span>
                        ) : availUnits <= 3 ? (
                          <span className="inv-stock-badge low">
                            <Clock size={12} />
                            <span>{availUnits} {say('منخفض', 'Low')}</span>
                          </span>
                        ) : (
                          <span className="inv-stock-badge ok">
                            <CheckCircle2 size={12} />
                            <span>{availUnits} {say('قطعة', 'pcs')}</span>
                          </span>
                        )}
                      </div>

                      {/* Action Buttons Row */}
                      <div className="inv-mobile-card-actions">
                        {!isSerialized ? (
                          <button
                            type="button"
                            className="button primary sm"
                            onClick={() => openAdjust(v, 1, 'in')}
                          >
                            <ArrowRightLeft size={14} />
                            <span>{say('حركة مخزون (+ / -)', 'Adjust Stock')}</span>
                          </button>
                        ) : (
                          <Link to="/units" className="button secondary sm">
                            <ExternalLink size={14} />
                            <span>{say('القطع التسلسلية', 'Manage S/N')}</span>
                          </Link>
                        )}

                        <Link to="/variants" className="button subtle sm" title={say('خيارات المنتج', 'Variants')}>
                          <Layers size={14} />
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {/* ─── Pagination ─── */}
          <div className="pagination" style={{ flexWrap: 'wrap', gap: 10 }}>
            <div className="pagination-count">
              {say(
                `عرض ${(page - 1) * 24 + 1} - ${Math.min(page * 24, data?.total ?? 0)} من أصل ${data?.total ?? 0} صنف`,
                `Showing ${(page - 1) * 24 + 1} - ${Math.min(page * 24, data?.total ?? 0)} of ${data?.total ?? 0} items`
              )}
            </div>

            <div className="pagination-nav" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <button
                type="button"
                className="button secondary sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                {ar ? <ChevronRight size={15} /> : <ChevronLeft size={15} />}
                <span>{say('السابق', 'Previous')}</span>
              </button>

              <span style={{ fontSize: '12px', fontWeight: 700, padding: '0 4px' }}>
                {page} / {totalPages}
              </span>

              <button
                type="button"
                className="button secondary sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                <span>{say('التالي', 'Next')}</span>
                {ar ? <ChevronLeft size={15} /> : <ChevronRight size={15} />}
              </button>
            </div>
          </div>
        </>
      ) : (
        /* ─── Movements Log View ─── */
        <>
          {/* Desktop Movements Table */}
          <div className="inv-table-wrap">
            <div className="inv-movements-header">
              <div>{say('التاريخ والوقت', 'Date & Time')}</div>
              <div>{say('الصنف ورمز SKU', 'Item & SKU')}</div>
              <div>{say('قيمة الحركة', 'Delta')}</div>
              <div>{say('سبب الحركة الموثق', 'Documented Reason')}</div>
              <div>{say('المسؤول', 'User')}</div>
            </div>

            {!data?.movements || data.movements.length === 0 ? (
              <div className="inv-empty-state">
                <History size={28} className="inv-empty-icon" />
                <h3>{say('لا توجد حركات مخزون مسجلة', 'No movements recorded')}</h3>
                <p>{say('عند إجراء أي حركة استلام أو خصم أو جرد ستظهر تفاصيلها هنا فوراً.', 'Stock adjustments will appear here in the audit log.')}</p>
              </div>
            ) : (
              data.movements.map((m) => {
                const deltaNum = Number(m.delta) || 0;
                const dateStr = string(m.createdAt);
                const formattedDate = dateStr
                  ? new Date(dateStr).toLocaleString(ar ? 'ar-EG' : 'en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  : '-';
                const varObj = object(m.variant);
                const sku = string(varObj.sku || m.variantId);
                const prodTitle = localized(object(varObj.product).title, lang);
                const userObj = object(m.user);
                const username = string(userObj.name || userObj.email || m.userId);

                return (
                  <div className="inv-movement-row" key={string(m.id)}>
                    <div style={{ color: 'var(--muted)', fontSize: '12px' }}>{formattedDate}</div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0 }}>
                      <strong style={{ fontSize: '13px', color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {prodTitle || sku}
                      </strong>
                      <span style={{ fontFamily: 'monospace', fontSize: '11px', color: 'var(--muted)' }} dir="ltr">
                        {sku}
                      </span>
                    </div>

                    <div>
                      {deltaNum > 0 ? (
                        <span className="inv-delta-tag pos">
                          +{deltaNum} <ArrowUpRight size={13} />
                        </span>
                      ) : deltaNum < 0 ? (
                        <span className="inv-delta-tag neg">
                          {deltaNum} <ArrowDownRight size={13} />
                        </span>
                      ) : (
                        <span className="inv-delta-tag neutral">
                          0 <Check size={13} />
                        </span>
                      )}
                    </div>

                    <div style={{ color: 'var(--text)', wordBreak: 'break-word', fontSize: '13px' }}>
                      {string(m.reason)}
                    </div>

                    <div style={{ color: 'var(--muted)', fontSize: '12.5px' }}>
                      {username}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Mobile Movements Cards */}
          {data?.movements && data.movements.length > 0 && (
            <div>
              {data.movements.map((m) => {
                const deltaNum = Number(m.delta) || 0;
                const dateStr = string(m.createdAt);
                const formattedDate = dateStr
                  ? new Date(dateStr).toLocaleString(ar ? 'ar-EG' : 'en-US', {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  : '-';
                const varObj = object(m.variant);
                const sku = string(varObj.sku || m.variantId);
                const prodTitle = localized(object(varObj.product).title, lang);
                const userObj = object(m.user);
                const username = string(userObj.name || userObj.email || m.userId);

                return (
                  <div className="inv-movement-mobile-card" key={`mob-${string(m.id)}`}>
                    <div className="inv-movement-mobile-top">
                      {deltaNum > 0 ? (
                        <span className="inv-delta-tag pos">
                          +{deltaNum} <ArrowUpRight size={13} />
                        </span>
                      ) : deltaNum < 0 ? (
                        <span className="inv-delta-tag neg">
                          {deltaNum} <ArrowDownRight size={13} />
                        </span>
                      ) : (
                        <span className="inv-delta-tag neutral">
                          0 <Check size={13} />
                        </span>
                      )}

                      <span style={{ color: 'var(--muted)', fontSize: '11.5px' }}>
                        {formattedDate}
                      </span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                      <strong style={{ fontSize: '13px', color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {prodTitle || sku}
                      </strong>
                      <span className="inv-sku-pill" style={{ padding: '2px 6px', fontSize: '11px' }}>
                        <code dir="ltr">{sku}</code>
                      </span>
                    </div>

                    <div style={{ fontSize: '12.5px', color: 'var(--text)', background: 'var(--surface-soft)', padding: '6px 10px', borderRadius: 8 }}>
                      {string(m.reason)}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '11.5px', color: 'var(--muted)' }}>
                      <User size={12} />
                      <span>{username}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ─── Stock Adjustment Modal ─── */}
      {selectedVariant && (
        <div className="inv-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) closeAdjust(); }}>
          <div className="inv-modal" role="dialog" aria-modal="true">
            <div className="inv-modal-head">
              <h2>
                <ArrowRightLeft size={18} color="var(--primary)" />
                <span>{say('تسجيل حركة مخزون جديدة', 'Record Stock Movement')}</span>
              </h2>
              <button
                type="button"
                className="icon-button"
                onClick={closeAdjust}
                disabled={isSubmitting}
                aria-label={say('إغلاق', 'Close')}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={submitAdjust}>
              <div className="inv-modal-body">
                {adjustError && (
                  <div className="error-box" role="alert">
                    <ErrorBox code={adjustError} />
                  </div>
                )}

                {/* Variant Info Card */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'var(--surface-soft)', padding: '10px 12px', borderRadius: 10 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <strong style={{ fontSize: '13.5px', color: 'var(--text)', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {localized(object(selectedVariant.product).title, lang) || string(selectedVariant.sku)}
                    </strong>
                    <span className="inv-sku-pill" style={{ marginTop: 4, alignSelf: 'flex-start' }}>
                      <code dir="ltr">{string(selectedVariant.sku)}</code>
                    </span>
                  </div>
                </div>

                {/* Operation Intent Selector */}
                <div className="inv-modal-type-buttons">
                  <button
                    type="button"
                    className={`inv-modal-type-btn ${movementType === 'in' ? 'active' : ''}`}
                    onClick={() => {
                      setMovementType('in');
                      if (delta <= 0) setDelta(1);
                      setReason(ar ? 'استلام وتوريد شحنة جديدة' : 'New stock received');
                    }}
                  >
                    <Plus size={14} />
                    <span>{say('إضافة مخزون (+)', 'Receive (+)')}</span>
                  </button>

                  <button
                    type="button"
                    className={`inv-modal-type-btn ${movementType === 'out' ? 'active' : ''}`}
                    onClick={() => {
                      setMovementType('out');
                      if (delta >= 0) setDelta(-1);
                      setReason(ar ? 'صرف أو تسوية نقص' : 'Deduction (-)');
                    }}
                  >
                    <Minus size={14} />
                    <span>{say('خصم مخزون (-)', 'Deduct (-)')}</span>
                  </button>

                  <button
                    type="button"
                    className={`inv-modal-type-btn ${movementType === 'audit' ? 'active' : ''}`}
                    onClick={() => {
                      setMovementType('audit');
                      setDelta(0);
                      setReason(ar ? 'تسوية جرد دوري ومطابقة الرصيد' : 'Stock audit (0)');
                    }}
                  >
                    <ShieldCheck size={14} />
                    <span>{say('تأكيد الرصيد (0)', 'Audit (0)')}</span>
                  </button>
                </div>

                {/* Math Calculation Preview */}
                {(() => {
                  const currentStock = Number(selectedVariant.quantity) || 0;
                  const newStock = currentStock + delta;
                  const isNegative = newStock < 0;

                  return (
                    <div>
                      <div className="inv-modal-preview-box">
                        <div className="inv-preview-item">
                          <span className="inv-preview-label">{say('الرصيد الحالي', 'Current')}</span>
                          <span className="inv-preview-val">{currentStock}</span>
                        </div>

                        <div className="inv-preview-arrow">
                          <ArrowRightLeft size={16} />
                        </div>

                        <div className="inv-preview-item">
                          <span className="inv-preview-label">{say('قيمة الحركة', 'Delta')}</span>
                          <span className="inv-preview-val" style={{ color: delta > 0 ? '#10b981' : delta < 0 ? '#ef4444' : 'var(--text)' }}>
                            {delta > 0 ? `+${delta}` : delta}
                          </span>
                        </div>

                        <div className="inv-preview-arrow">
                          <span>=</span>
                        </div>

                        <div className="inv-preview-item">
                          <span className="inv-preview-label">{say('الرصيد المتوقع', 'Projected')}</span>
                          <span className={`inv-preview-val ${isNegative ? 'commerce-error' : 'highlight'}`} style={{ color: isNegative ? '#ef4444' : undefined }}>
                            {newStock}
                          </span>
                        </div>
                      </div>

                      {isNegative && (
                        <p className="commerce-error" style={{ fontSize: '11.5px', marginTop: '6px' }}>
                          {say('⚠ لا يمكن أن يكون رصيد المخزون سالباً!', '⚠ Stock quantity cannot be negative!')}
                        </p>
                      )}
                    </div>
                  );
                })()}

                {/* Quick Increment/Decrement Chips */}
                {movementType !== 'audit' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--muted)' }}>
                      {say('تعديل سريع للكمية:', 'Quick adjustments:')}
                    </label>
                    <div className="inv-quick-chips">
                      {[1, 5, 10, 25, 50].map((step) => (
                        <button
                          key={step}
                          type="button"
                          className="inv-chip-btn"
                          onClick={() => {
                            if (movementType === 'in') setDelta(step);
                            else setDelta(-step);
                          }}
                        >
                          {movementType === 'in' ? `+${step}` : `-${step}`}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Manual Numeric Input */}
                <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <span style={{ fontSize: '12.5px', fontWeight: 700 }}>
                    {say('قيمة التغيير (+ للإضافة، - للخصم)', 'Quantity delta (+ receive, - deduct)')}
                  </span>
                  <input
                    type="number"
                    inputMode="numeric"
                    style={{ fontSize: '16px', fontWeight: 700, padding: '10px 14px' }}
                    value={delta}
                    onChange={(e) => setDelta(Number(e.target.value))}
                    disabled={isSubmitting}
                  />
                </label>

                {/* Reason Input & Quick Suggestions */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '12.5px', fontWeight: 700 }}>
                      {say('سبب الحركة (موثق بسجل التدقيق)', 'Documented reason (audit record)')}
                    </span>
                    <small style={{ color: 'var(--muted)', fontSize: '11px' }}>
                      {reason.length} / 500
                    </small>
                  </label>
                  <input
                    type="text"
                    required
                    minLength={5}
                    maxLength={500}
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder={say('اكتب سبب الحركة أو اختر من المقترحات أدناه...', 'Enter reason or choose below...')}
                    disabled={isSubmitting}
                  />
                  <div className="inv-quick-reasons">
                    {quickReasons.map((qr) => (
                      <button
                        key={qr}
                        type="button"
                        className="inv-reason-chip"
                        onClick={() => setReason(qr)}
                      >
                        {qr}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="inv-modal-footer">
                <button
                  type="button"
                  className="button secondary"
                  onClick={closeAdjust}
                  disabled={isSubmitting}
                >
                  {say('إلغاء', 'Cancel')}
                </button>
                <button
                  type="submit"
                  className="button primary"
                  disabled={isSubmitting || (Number(selectedVariant.quantity) || 0) + delta < 0 || reason.trim().length < 5}
                >
                  {isSubmitting ? (
                    <RefreshCw size={15} className="spin" />
                  ) : (
                    <Check size={15} />
                  )}
                  <span>{isSubmitting ? say('جارٍ الحفظ...', 'Saving...') : say('حفظ وتوثيق الحركة', 'Save Movement')}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
