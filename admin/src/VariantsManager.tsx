import { useState, useMemo, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Layers, Plus, Search, X, Edit3, Trash2, Copy, Check, RotateCcw, PackageSearch, Wand2, AlertTriangle, Package, Boxes, SlidersHorizontal, Image as ImageIcon, CheckCircle2, ShieldCheck, DollarSign, Tag, Info, Clock, Warehouse, Hash, Truck, Globe } from 'lucide-react';
import { can, VariantEdit, UnitEdit, type SpecFieldInput } from '@aljeel/shared';
import { api, ApiError } from './api';
import { useI18n } from './i18n';
import { useSession } from './App';
import { Loading, ErrorBox, Modal, useToast } from './components';
import { VisualProductPickerModal, type ProductItemOption } from './VisualProductPickerModal';
import { VisualMediaPickerModal } from './VisualMediaPickerModal';
import './variants-manager.css';

// ── Types ─────────────────────────────────────────────────────────────────────

type LocalizedText = { ar: string; en: string };

type ProductRecord = {
  id: string;
  title: LocalizedText;
  model?: string;
  brandId?: string;
  category?: string;
  productTypeId?: string | null;
  status?: string;
  specs?: Record<string, unknown>;
  images?: { media?: { originalPath?: string }; path?: string }[] | string[];
};

type DeviceCondition = 'new' | 'open_box' | 'like_new' | 'refurbished' | 'used' | 'defective' | 'A' | 'B' | 'C';
type AvailabilityMode = 'in_stock' | 'local_order' | 'external_order';

type InventoryUnitRecord = {
  id: string;
  variantId: string;
  serialNumber: string;
  condition: DeviceCondition;
  batteryHealthPct?: number | null;
  inspection?: Record<string, unknown>;
  defects?: unknown[];
  images?: string[];
  available: boolean;
  soldOrderId?: string | null;
  updatedAt?: string | Date;
};

type VariantRecord = {
  id: string;
  productId: string;
  sku: string;
  options: Record<string, unknown>;
  specs: Record<string, unknown>;
  images: string[];
  priceUsd: string | null;
  warrantyMonths: number | null;
  condition: DeviceCondition;
  inventoryMode: 'quantity' | 'serialized';
  availabilityMode?: AvailabilityMode;
  leadTimeDays?: number | null;
  active: boolean;
  quantity?: number;
  units?: InventoryUnitRecord[];
  updatedAt?: string | Date;
  revision?: string;
};

type Reference = {
  products: ProductRecord[];
  brands: { id: string; name: string }[];
  categories: { slug: string; parentSlug: string | null; productTypeId: string | null; title: LocalizedText }[];
  types: { id: string; title: LocalizedText; fields: SpecFieldInput[] }[];
  variants: VariantRecord[];
  collections: unknown[];
  packages: unknown[];
};

function safeImageUrl(path?: string): string {
  if (!path) return '';
  return path.replace('/api/media/', '/api/admin/media/');
}

function autoSku(prefix: string): string {
  const clean = prefix
    .toUpperCase()
    .replace(/[^A-Z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 16);
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return (clean || 'SKU') + '-' + rand;
}

export function VariantsManager() {
  const { lang } = useI18n();
  const ar = lang === 'ar';
  const { user } = useSession();
  const client = useQueryClient();
  const toast = useToast();

  const say = useCallback((a: string, e: string) => (ar ? a : e), [ar]);

  // Data Query
  const query = useQuery({
    queryKey: ['commerce-reference'],
    queryFn: () => api<Reference>('/commerce/reference'),
    staleTime: 30_000,   // 30s — shared cache key with Commerce.tsx
    gcTime: 5 * 60_000,
  });

  // State
  const [search, setSearch] = useState('');
  const [selectedProductFilter, setSelectedProductFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [modeFilter, setModeFilter] = useState<'all' | 'quantity' | 'serialized'>('all');
  const [conditionFilter, setConditionFilter] = useState<'all' | DeviceCondition>('all');
  const [availabilityFilter, setAvailabilityFilter] = useState<'all' | AvailabilityMode>('all');
  const [sortBy, setSortBy] = useState<'sku' | 'priceAsc' | 'priceDesc' | 'newest'>('sku');

  // Form Editor State
  const [edit, setEdit] = useState<VariantRecord | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [activeTab, setActiveTab] = useState<'general' | 'specs' | 'images' | 'units'>('general');
  const [error, setError] = useState('');
  const [details, setDetails] = useState('');
  const [busy, setBusy] = useState(false);
  const [copiedSku, setCopiedSku] = useState<string | null>(null);

  // Unit Modal State
  const [unitModalOpen, setUnitModalOpen] = useState(false);
  const [editingUnit, setEditingUnit] = useState<InventoryUnitRecord | null>(null);
  const [unitFormBusy, setUnitFormBusy] = useState(false);
  const [unitError, setUnitError] = useState('');

  // Modals
  const [productPickerOpen, setProductPickerOpen] = useState(false);
  const [mediaPickerOpen, setMediaPickerOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<VariantRecord | null>(null);

  // Reference data shortcuts
  const ref = query.data;
  const products = ref?.products || [];
  const variants = ref?.variants || [];
  const types = ref?.types || [];
  const categories = ref?.categories || [];

  // Effective spec fields lookup for a product
  const getProductSpecFields = useCallback(
    (productId: string): SpecFieldInput[] => {
      if (!ref) return [];
      const prod = products.find(p => p.id === productId);
      if (!prod) return [];
      let typeId = prod.productTypeId;
      let catSlug = prod.category;
      const seen = new Set<string>();

      while (!typeId && catSlug && !seen.has(catSlug)) {
        seen.add(catSlug);
        const cat = categories.find(c => c.slug === catSlug);
        typeId = cat?.productTypeId;
        catSlug = cat?.parentSlug || undefined;
      }

      if (!typeId) return [];
      const type = types.find(t => t.id === typeId);
      return type?.fields || [];
    },
    [ref, products, categories, types]
  );

  // Product picker options
  const productOptions: ProductItemOption[] = useMemo(() => {
    return products.map(p => {
      let firstImg = '';
      if (Array.isArray(p.images) && p.images.length > 0) {
        const item = p.images[0];
        firstImg = typeof item === 'string' ? item : item.media?.originalPath || item.path || '';
      }
      const brand = ref?.brands?.find(b => b.id === p.brandId)?.name || '';
      return {
        id: p.id,
        title: p.title,
        model: p.model,
        brand,
        category: p.category,
        images: firstImg ? [firstImg] : [],
        status: p.status,
      };
    });
  }, [products, ref]);

  // Metrics
  const stats = useMemo(() => {
    const total = variants.length;
    const active = variants.filter(v => v.active).length;
    const inactive = total - active;
    const serialized = variants.filter(v => v.inventoryMode === 'serialized').length;
    const quantity = total - serialized;
    return { total, active, inactive, serialized, quantity };
  }, [variants]);

  // Filtered & Sorted variants
  const filteredVariants = useMemo(() => {
    return variants
      .filter(v => {
        // Product Filter
        if (selectedProductFilter !== 'all' && v.productId !== selectedProductFilter) {
          return false;
        }
        // Status Filter
        if (statusFilter === 'active' && !v.active) return false;
        if (statusFilter === 'inactive' && v.active) return false;
        // Inventory Mode Filter
        if (modeFilter !== 'all' && v.inventoryMode !== modeFilter) return false;
        // Condition Filter
        if (conditionFilter !== 'all' && v.condition !== conditionFilter) return false;
        // Availability Mode Filter
        if (availabilityFilter !== 'all' && (v.availabilityMode || 'in_stock') !== availabilityFilter) return false;

        // Search Query
        if (search.trim()) {
          const q = search.trim().toLowerCase();
          const prod = products.find(p => p.id === v.productId);
          const prodTitleAr = (prod?.title?.ar || '').toLowerCase();
          const prodTitleEn = (prod?.title?.en || '').toLowerCase();
          const prodModel = (prod?.model || '').toLowerCase();
          const sku = (v.sku || '').toLowerCase();
          const id = (v.id || '').toLowerCase();
          const optionsStr = JSON.stringify(v.options || {}).toLowerCase();
          const specsStr = JSON.stringify(v.specs || {}).toLowerCase();

          const matches =
            sku.includes(q) ||
            prodTitleAr.includes(q) ||
            prodTitleEn.includes(q) ||
            prodModel.includes(q) ||
            id.includes(q) ||
            optionsStr.includes(q) ||
            specsStr.includes(q);

          if (!matches) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'priceAsc') {
          return (Number(a.priceUsd) || 0) - (Number(b.priceUsd) || 0);
        }
        if (sortBy === 'priceDesc') {
          return (Number(b.priceUsd) || 0) - (Number(a.priceUsd) || 0);
        }
        if (sortBy === 'newest') {
          return (
            new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime()
          );
        }
        return (a.sku || '').localeCompare(b.sku || '');
      });
  }, [variants, products, selectedProductFilter, statusFilter, modeFilter, conditionFilter, availabilityFilter, search, sortBy]);

  // ── Actions ──────────────────────────────────────────────────────────────────

  const startCreate = () => {
    const defaultProduct = products[0];
    const newId = crypto.randomUUID();
    const newSku = defaultProduct?.model ? autoSku(defaultProduct.model) : autoSku('VAR');

    setEdit({
      id: newId,
      productId: defaultProduct?.id || '',
      sku: newSku,
      options: {},
      specs: {},
      images: [],
      priceUsd: null,
      warrantyMonths: 12,
      condition: 'new',
      inventoryMode: 'quantity',
      availabilityMode: 'in_stock',
      leadTimeDays: null,
      active: true,
    });
    setIsAdding(true);
    setActiveTab('general');
    setError('');
    setDetails('');
  };

  const startEdit = (v: VariantRecord) => {
    setEdit({
      ...v,
      availabilityMode: v.availabilityMode || 'in_stock',
      leadTimeDays: v.leadTimeDays ?? null,
      options: { ...(v.options || {}) },
      specs: { ...(v.specs || {}) },
      images: Array.isArray(v.images) ? [...v.images] : [],
      revision: typeof v.updatedAt === 'string' ? v.updatedAt : v.updatedAt ? new Date(v.updatedAt).toISOString() : undefined,
    });
    setIsAdding(false);
    setActiveTab('general');
    setError('');
    setDetails('');
  };

  const startDuplicate = (source: VariantRecord) => {
    const newId = crypto.randomUUID();
    const newSku = autoSku(source.sku);

    setEdit({
      ...source,
      id: newId,
      sku: newSku,
      active: false, // inactive initially so admin can verify
      availabilityMode: source.availabilityMode || 'in_stock',
      leadTimeDays: source.leadTimeDays ?? null,
      options: { ...(source.options || {}) },
      specs: { ...(source.specs || {}) },
      images: Array.isArray(source.images) ? [...source.images] : [],
      revision: undefined,
    });
    setIsAdding(true);
    setActiveTab('general');
    setError('');
    setDetails('');
    toast(say('تم تكرار الخيار، يمكنك تعديل المواصفات وحفظه كخيار جديد', 'Variant duplicated, adjust specs and save'));
  };

  const handleCopySku = (sku: string) => {
    navigator.clipboard.writeText(sku);
    setCopiedSku(sku);
    setTimeout(() => setCopiedSku(null), 2000);
    toast(say(`تم نسخ الرمز SKU: ${sku}`, `SKU copied: ${sku}`));
  };

  // Quick 1-click active toggle in list
  const handleToggleActive = async (v: VariantRecord, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const payload = {
        ...v,
        active: !v.active,
        revision: typeof v.updatedAt === 'string' ? v.updatedAt : v.updatedAt ? new Date(v.updatedAt).toISOString() : undefined,
      };
      await api('/commerce/variants', { method: 'POST', body: payload });
      await client.invalidateQueries({ queryKey: ['commerce-reference'] });
      toast(
        !v.active
          ? say('تم تفعيل الخيار وعرضه في المتجر بنجاح', 'Variant activated in storefront')
          : say('تم تعطيل الخيار وإخفاؤه من المتجر', 'Variant deactivated from storefront')
      );
    } catch {
      toast(say('تعذر تغيير حالة الخيار', 'Failed to toggle variant status'), true);
    }
  };

  // Submit form
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!edit) return;
    setError('');
    setDetails('');

    // Prepare payload
    const payload = {
      ...edit,
      sku: (edit.sku || '').trim().toUpperCase(),
      priceUsd: edit.priceUsd ? String(edit.priceUsd) : null,
      warrantyMonths: edit.warrantyMonths !== null ? Number(edit.warrantyMonths) : null,
      availabilityMode: edit.availabilityMode || 'in_stock',
      leadTimeDays: edit.leadTimeDays !== null && edit.leadTimeDays !== undefined ? Number(edit.leadTimeDays) : null,
      images: Array.isArray(edit.images) ? edit.images : [],
    };

    if (!payload.sku) {
      const prod = products.find(p => p.id === payload.productId);
      payload.sku = autoSku(prod?.model || 'VAR');
    }

    const parsed = VariantEdit.safeParse(payload);
    if (!parsed.success) {
      setDetails(parsed.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join(' · '));
      return;
    }

    setBusy(true);
    try {
      await api('/commerce/variants', { method: 'POST', body: parsed.data });
      await client.invalidateQueries({ queryKey: ['commerce-reference'] });
      setEdit(null);
      toast(isAdding ? say('تمت إضافة خيار المنتج بنجاح', 'Variant added successfully') : say('تم حفظ التعديلات بنجاح', 'Variant saved successfully'));
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.code.startsWith('missing_specs:')) {
          const missingKeys = err.code.replace('missing_specs:', '');
          setError('publish_incomplete');
          setDetails(say(`مواصفات إلزامية ناقصة: ${missingKeys}`, `Missing required specs: ${missingKeys}`));
          setActiveTab('specs');
        } else {
          setError(err.code);
        }
      } else {
        setError('failed');
      }
    } finally {
      setBusy(false);
    }
  };

  // Delete variant
  const handleDelete = async (v: VariantRecord) => {
    setBusy(true);
    setError('');
    try {
      const res = await api<{ ok: boolean; deactivated?: boolean }>(`/commerce/variants/${encodeURIComponent(v.id)}`, {
        method: 'DELETE',
      });
      await client.invalidateQueries({ queryKey: ['commerce-reference'] });
      setDeleteConfirm(null);
      if (edit && edit.id === v.id) setEdit(null);

      if (res?.deactivated) {
        toast(say('تم تعطيل الخيار بنجاح نظراً لوجود حركات مخزون سابقة مسجلة عليه', 'Variant deactivated due to recorded stock history'));
      } else {
        toast(say('تم حذف خيار المنتج نهائياً', 'Variant deleted permanently'));
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.code : 'failed');
    } finally {
      setBusy(false);
    }
  };

  // Import parent product photos
  const handleCopyParentImages = () => {
    if (!edit) return;
    const prod = products.find(p => p.id === edit.productId);
    if (!prod || !Array.isArray(prod.images)) return;

    const parentPaths = prod.images
      .map(item => (typeof item === 'string' ? item : item.media?.originalPath || item.path || ''))
      .filter(Boolean);

    if (parentPaths.length === 0) {
      toast(say('لا توجد صور مسجلة للمنتج الأب', 'No parent product images found'), true);
      return;
    }

    const combined = Array.from(new Set([...(edit.images || []), ...parentPaths]));
    setEdit({ ...edit, images: combined });
    toast(say(`تم استيراد ${parentPaths.length} صور من المنتج الأب`, `Imported ${parentPaths.length} parent images`));
  };

  // ── Serialized Unit Management ──────────────────────────────────────────────
  const handleOpenAddUnit = () => {
    if (!edit) return;
    setEditingUnit({
      id: crypto.randomUUID(),
      variantId: edit.id,
      serialNumber: '',
      condition: edit.condition || 'like_new',
      batteryHealthPct: 95,
      inspection: { passed: true, notes: '' },
      defects: [],
      images: [],
      available: true,
      soldOrderId: null,
    });
    setUnitError('');
    setUnitModalOpen(true);
  };

  const handleOpenEditUnit = (unit: InventoryUnitRecord) => {
    setEditingUnit({ ...unit });
    setUnitError('');
    setUnitModalOpen(true);
  };

  const handleSaveUnit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUnit || !edit) return;
    setUnitError('');

    const payload = {
      id: editingUnit.id,
      variantId: edit.id,
      serialNumber: editingUnit.serialNumber.trim(),
      condition: editingUnit.condition,
      batteryHealthPct: editingUnit.batteryHealthPct !== null && editingUnit.batteryHealthPct !== undefined ? Number(editingUnit.batteryHealthPct) : null,
      inspection: editingUnit.inspection || { passed: true },
      defects: Array.isArray(editingUnit.defects) ? editingUnit.defects : [],
      images: Array.isArray(editingUnit.images) ? editingUnit.images : [],
      revision: typeof editingUnit.updatedAt === 'string' ? editingUnit.updatedAt : editingUnit.updatedAt ? new Date(editingUnit.updatedAt).toISOString() : undefined,
    };

    const parsed = UnitEdit.safeParse(payload);
    if (!parsed.success) {
      setUnitError(parsed.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join(' · '));
      return;
    }

    setUnitFormBusy(true);
    try {
      const saved = await api<InventoryUnitRecord>('/commerce/units', { method: 'POST', body: parsed.data });
      await client.invalidateQueries({ queryKey: ['commerce-reference'] });
      // Update local units in edit state
      const currentUnits = edit.units || [];
      const exists = currentUnits.some(u => u.id === saved.id);
      const nextUnits = exists ? currentUnits.map(u => u.id === saved.id ? saved : u) : [saved, ...currentUnits];
      setEdit({ ...edit, units: nextUnits });
      setUnitModalOpen(false);
      setEditingUnit(null);
      toast(say('تم حفظ القطعة المسلسلة بنجاح', 'Unit saved successfully'));
    } catch (err) {
      setUnitError(err instanceof ApiError ? err.code : 'failed');
    } finally {
      setUnitFormBusy(false);
    }
  };

  const handleDeleteUnit = async (unit: InventoryUnitRecord) => {
    if (!edit) return;
    if (!confirm(say(`هل أنت متأكد من حذف القطعة ذات الرقم التسلسلي (${unit.serialNumber})؟`, `Delete unit S/N (${unit.serialNumber})?`))) {
      return;
    }
    try {
      await api(`/commerce/units/${encodeURIComponent(unit.id)}`, { method: 'DELETE' });
      await client.invalidateQueries({ queryKey: ['commerce-reference'] });
      setEdit({ ...edit, units: (edit.units || []).filter(u => u.id !== unit.id) });
      toast(say('تم حذف القطعة بنجاح', 'Unit deleted successfully'));
    } catch {
      toast(say('تعذر حذف القطعة، ربما بيعت بالفعل', 'Failed to delete unit, may be sold'), true);
    }
  };

  if (query.isPending) return <Loading />;
  if (!ref) return <ErrorBox code="disconnected" />;

  const selectedParentProduct = edit ? products.find(p => p.id === edit.productId) : null;
  const specFields = edit ? getProductSpecFields(edit.productId) : [];

  // Check if inventory mode is locked for this variant
  const isModeLocked = !isAdding && edit && (Boolean(edit.quantity) || (Array.isArray(edit.units) && edit.units.length > 0));

  return (
    <div className="variants-manager-view">
      {/* ── Top Header ──────────────────────────────────────────────────────── */}
      <div className="vm-header">
        <div className="vm-header-info">
          <div className="vm-header-title-row">
            <h1>
              <Layers size={24} style={{ color: 'var(--primary-text)' }} />
              <span>{say('خيارات المنتجات والأسعار (SKU)', 'Product Variants & Pricing (SKU)')}</span>
            </h1>
            <span className="vm-count-badge">
              {variants.length} {say('خيار', 'variants')}
            </span>
          </div>
          <p>
            {say(
              'أدِر بدائل وموديلات المنتجات، وحدد رموز SKU، ونظام المخزون (كميات أو قطع مسلسلة S/N)، والأسعار بالدولار والمواصفات الفنية.',
              'Manage product configurations, set SKUs, inventory tracking (quantity or serialized S/N), USD pricing, and technical specs.'
            )}
          </p>
        </div>

        <div className="vm-header-actions">
          {can(user.role, 'catalog.edit') && (
            <button className="button primary" onClick={startCreate}>
              <Plus size={17} />
              <span>{say('إضافة خيار جديد', 'Add New Variant')}</span>
            </button>
          )}
        </div>
      </div>

      <ErrorBox code={error} />
      {details && <p role="alert" className="commerce-error">{details}</p>}

      {!edit ? (
        <>
          {/* ── Metrics Stat Cards ────────────────────────────────────────── */}
          <section className="vm-stats-grid">
            <div className="vm-stat-card">
              <div className="vm-stat-icon indigo">
                <Layers size={22} />
              </div>
              <div className="vm-stat-content">
                <span className="vm-stat-value">{stats.total}</span>
                <span className="vm-stat-label">{say('إجمالي الخيارات', 'Total Variants')}</span>
              </div>
            </div>

            <div className="vm-stat-card" onClick={() => setStatusFilter(statusFilter === 'active' ? 'all' : 'active')} style={{ cursor: 'pointer' }}>
              <div className="vm-stat-icon emerald">
                <CheckCircle2 size={22} />
              </div>
              <div className="vm-stat-content">
                <span className="vm-stat-value">{stats.active}</span>
                <span className="vm-stat-label">{say('نشط بالمتجر للعملاء', 'Active in Store')}</span>
              </div>
            </div>

            <div className="vm-stat-card" onClick={() => setStatusFilter(statusFilter === 'inactive' ? 'all' : 'inactive')} style={{ cursor: 'pointer' }}>
              <div className="vm-stat-icon amber">
                <AlertTriangle size={22} />
              </div>
              <div className="vm-stat-content">
                <span className="vm-stat-value">{stats.inactive}</span>
                <span className="vm-stat-label">{say('معطّل / مسودة', 'Inactive / Paused')}</span>
              </div>
            </div>

            <div className="vm-stat-card" onClick={() => setModeFilter(modeFilter === 'serialized' ? 'all' : 'serialized')} style={{ cursor: 'pointer' }}>
              <div className="vm-stat-icon purple">
                <Boxes size={22} />
              </div>
              <div className="vm-stat-content">
                <span className="vm-stat-value">{stats.serialized} / {stats.quantity}</span>
                <span className="vm-stat-label">{say('مسلسل S/N / كمية عددية', 'Serialized / Quantity')}</span>
              </div>
            </div>
          </section>

          {/* ── Control Panel: Unified Filters Bar ────────────────────────── */}
          <section className="vm-control-panel">
            <div className="vm-control-top-row">
              <div className="vm-search-box">
                <Search size={18} className="search-icon" aria-hidden="true" />
                <input
                  aria-label={say('بحث...', 'Search...')}
                  placeholder={say('ابحث برمز SKU، اسم المنتج، الموديل، المعرّف...', 'Search SKU, product title, model, ID...')}
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
                {search && (
                  <button type="button" className="vm-clear-btn" onClick={() => setSearch('')} aria-label={say('مسح', 'Clear')}>
                    <X size={15} />
                  </button>
                )}
              </div>

              <div className="vm-dropdown-filters">
                {/* Product Filter */}
                <div className="vm-select-wrap">
                  <select
                    aria-label={say('تصفية حسب المنتج الأب', 'Filter by product')}
                    value={selectedProductFilter}
                    onChange={e => setSelectedProductFilter(e.target.value)}
                  >
                    <option value="all">{say('جميع المنتجات (الكل)', 'All Products')}</option>
                    {products.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.title[lang] || p.model || p.id}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Condition Filter */}
                <div className="vm-select-wrap">
                  <select
                    aria-label={say('الحالة', 'Condition')}
                    value={conditionFilter}
                    onChange={e => setConditionFilter(e.target.value as typeof conditionFilter)}
                  >
                    <option value="all">{say('كافة الحالات', 'All Conditions')}</option>
                    <option value="new">{say('جديد كلياً (New)', 'Brand New')}</option>
                    <option value="open_box">{say('أوبن بوكس (Open Box)', 'Open Box')}</option>
                    <option value="like_new">{say('شبه جديد (Like New)', 'Like New')}</option>
                    <option value="refurbished">{say('مجدد مع الضمان (Refurbished)', 'Refurbished')}</option>
                    <option value="used">{say('مستعمل (Used)', 'Used')}</option>
                    <option value="defective">{say('معيوب / تصفية (Clearance)', 'Defective / Clearance')}</option>
                    <option value="A">{say('درجة أولى (Grade A)', 'Grade A')}</option>
                    <option value="B">{say('درجة ثانية (Grade B)', 'Grade B')}</option>
                    <option value="C">{say('درجة ثالثة (Grade C)', 'Grade C')}</option>
                  </select>
                </div>

                {/* Availability Mode Filter */}
                <div className="vm-select-wrap">
                  <select
                    aria-label={say('طريقة التوفر', 'Availability')}
                    value={availabilityFilter}
                    onChange={e => setAvailabilityFilter(e.target.value as typeof availabilityFilter)}
                  >
                    <option value="all">{say('كافة طرق التوفر', 'All Availabilities')}</option>
                    <option value="in_stock">{say('متوفر بالمخزن', 'In Stock')}</option>
                    <option value="local_order">{say('طلب داخلي (محلي)', 'Local On-Demand')}</option>
                    <option value="external_order">{say('طلب خارجي (استيراد)', 'External Pre-Order')}</option>
                  </select>
                </div>

                {/* Sort By */}
                <div className="vm-select-wrap">
                  <select
                    aria-label={say('الترتيب', 'Sort by')}
                    value={sortBy}
                    onChange={e => setSortBy(e.target.value as typeof sortBy)}
                  >
                    <option value="sku">{say('ترتيب حسب رمز SKU', 'Sort by SKU')}</option>
                    <option value="newest">{say('الأحدث تعديلاً', 'Recently updated')}</option>
                    <option value="priceDesc">{say('السعر: من الأعلى للأقل', 'Price: High to Low')}</option>
                    <option value="priceAsc">{say('السعر: من الأقل للأعلى', 'Price: Low to High')}</option>
                  </select>
                </div>

                {/* Reset Filters */}
                {(search || selectedProductFilter !== 'all' || statusFilter !== 'all' || modeFilter !== 'all' || conditionFilter !== 'all' || availabilityFilter !== 'all' || sortBy !== 'sku') && (
                  <button
                    type="button"
                    className="vm-reset-filters-btn"
                    onClick={() => {
                      setSearch('');
                      setSelectedProductFilter('all');
                      setStatusFilter('all');
                      setModeFilter('all');
                      setConditionFilter('all');
                      setAvailabilityFilter('all');
                      setSortBy('sku');
                    }}
                    title={say('إعادة ضبط كافة الفلاتر', 'Reset all filters')}
                  >
                    <RotateCcw size={14} />
                    <span>{say('إعادة ضبط', 'Reset')}</span>
                  </button>
                )}
              </div>
            </div>

            {/* Quick Status & Mode Pills */}
            <div className="vm-pills-bar">
              <button
                type="button"
                className={`vm-filter-pill ${statusFilter === 'all' && modeFilter === 'all' ? 'active' : ''}`}
                onClick={() => {
                  setStatusFilter('all');
                  setModeFilter('all');
                }}
              >
                <span>{say('الكل', 'All')}</span>
                <span className="vm-pill-count">({variants.length})</span>
              </button>

              <button
                type="button"
                className={`vm-filter-pill ${statusFilter === 'active' ? 'active' : ''}`}
                onClick={() => setStatusFilter(statusFilter === 'active' ? 'all' : 'active')}
              >
                <span className="vm-dot green" />
                <span>{say('نشط ومعروض', 'Active in Store')}</span>
                <span className="vm-pill-count">({stats.active})</span>
              </button>

              <button
                type="button"
                className={`vm-filter-pill ${statusFilter === 'inactive' ? 'active' : ''}`}
                onClick={() => setStatusFilter(statusFilter === 'inactive' ? 'all' : 'inactive')}
              >
                <span className="vm-dot gray" />
                <span>{say('معطّل', 'Inactive')}</span>
                <span className="vm-pill-count">({stats.inactive})</span>
              </button>

              <button
                type="button"
                className={`vm-filter-pill ${modeFilter === 'quantity' ? 'active' : ''}`}
                onClick={() => setModeFilter(modeFilter === 'quantity' ? 'all' : 'quantity')}
              >
                <span className="vm-dot amber" />
                <span>{say('كمية عددية', 'Quantity Mode')}</span>
                <span className="vm-pill-count">({stats.quantity})</span>
              </button>

              <button
                type="button"
                className={`vm-filter-pill ${modeFilter === 'serialized' ? 'active' : ''}`}
                onClick={() => setModeFilter(modeFilter === 'serialized' ? 'all' : 'serialized')}
              >
                <span className="vm-dot purple" />
                <span>{say('أرقام تسلسلية S/N', 'Serialized S/N')}</span>
                <span className="vm-pill-count">({stats.serialized})</span>
              </button>
            </div>
          </section>

          {/* ── Empty State ────────────────────────────────────────────────── */}
          {filteredVariants.length === 0 ? (
            <div className="empty-catalog-state">
              <div className="empty-icon-wrap">
                <PackageSearch size={38} />
              </div>
              <h3>{say('لا توجد خيارات مطابقة', 'No variants found')}</h3>
              <p>{say('لم نتمكن من العثور على أي خيارات تطابق معايير البحث والفلترة المحددة.', 'No variants match your search and filter criteria.')}</p>
              <button
                type="button"
                className="button secondary"
                onClick={() => {
                  setSearch('');
                  setSelectedProductFilter('all');
                  setStatusFilter('all');
                  setModeFilter('all');
                  setConditionFilter('all');
                }}
              >
                <RotateCcw size={15} />
                <span>{say('إعادة ضبط الفلاتر', 'Reset filters')}</span>
              </button>
            </div>
          ) : (
            <>
              {/* ── Desktop Data Table View ───────────────────────────────── */}
              <div className="vm-table-card">
                <div className="vm-table-header">
                  <div>{say('الصورة', 'Media')}</div>
                  <div>{say('المنتج ورمز الـ SKU', 'Product & SKU')}</div>
                  <div>{say('المواصفات المختصرة', 'Key Specs')}</div>
                  <div>{say('السعر ($)', 'Price ($)')}</div>
                  <div>{say('المخزون والنوع', 'Stock & Mode')}</div>
                  <div>{say('الحالة', 'Status')}</div>
                  <div style={{ textAlign: 'end' }}>{say('الإجراءات', 'Actions')}</div>
                </div>

                <div className="vm-rows-list">
                  {filteredVariants.map(v => {
                    const prod = products.find(p => p.id === v.productId);
                    const prodTitle = prod?.title[lang] || prod?.model || v.productId;

                    // Images
                    const firstVarImg = Array.isArray(v.images) && v.images[0] ? v.images[0] : '';
                    let firstProdImg = '';
                    if (Array.isArray(prod?.images) && prod?.images.length > 0) {
                      const item = prod.images[0];
                      firstProdImg = typeof item === 'string' ? item : item.media?.originalPath || item.path || '';
                    }
                    const displayImg = firstVarImg || firstProdImg;
                    const imagesCount = Array.isArray(v.images) ? v.images.length : 0;

                    // Stock
                    const isSerialized = v.inventoryMode === 'serialized';
                    const unitsList = Array.isArray(v.units) ? v.units : [];
                    const availUnits = unitsList.filter(u => u.available && !u.soldOrderId).length;

                    // Key specs snapshot tags
                    const combinedSpecs = { ...(v.specs || {}), ...(v.options || {}) };
                    const specBadges = Object.entries(combinedSpecs)
                      .filter(([_, val]) => val !== null && val !== undefined && val !== '')
                      .slice(0, 3)
                      .map(([k, val]) => `${k}: ${String(val)}`);

                    return (
                      <div className="vm-row" key={v.id}>
                        {/* Thumb */}
                        <div className="vm-cell-thumb">
                          {displayImg ? (
                            <img src={safeImageUrl(displayImg)} alt="" loading="lazy" />
                          ) : (
                            <Layers size={22} className="vm-thumb-placeholder" />
                          )}
                          {imagesCount > 1 && <span className="vm-thumb-count-badge">+{imagesCount}</span>}
                        </div>

                        {/* Product & SKU */}
                        <div className="vm-cell-product">
                          <button type="button" className="vm-product-title" onClick={() => startEdit(v)}>
                            {prodTitle}
                          </button>
                          <div className="vm-meta-tags-row">
                            <button
                              type="button"
                              className="vm-sku-pill"
                              dir="ltr"
                              title={say('انقر لنسخ رمز الـ SKU', 'Click to copy SKU')}
                              onClick={() => handleCopySku(v.sku)}
                            >
                              {copiedSku === v.sku ? <Check size={12} color="#10b981" /> : <Copy size={12} />}
                              <span>{v.sku}</span>
                            </button>

                            {/* Condition Badge */}
                            {(() => {
                              const condLabels: Record<string, { ar: string; en: string }> = {
                                new: { ar: 'جديد كلياً', en: 'New' },
                                open_box: { ar: 'أوبن بوكس', en: 'Open Box' },
                                like_new: { ar: 'شبه جديد', en: 'Like New' },
                                refurbished: { ar: 'مجدد مع الضمان', en: 'Refurbished' },
                                used: { ar: 'مستعمل', en: 'Used' },
                                defective: { ar: 'معيوب / تصفية', en: 'Defective' },
                                A: { ar: 'درجة A', en: 'Grade A' },
                                B: { ar: 'درجة B', en: 'Grade B' },
                                C: { ar: 'درجة C', en: 'Grade C' },
                              };
                              const item = condLabels[v.condition] || { ar: v.condition, en: v.condition };
                              return (
                                <span className={`vm-condition-badge ${v.condition}`}>
                                  {say(item.ar, item.en)}
                                </span>
                              );
                            })()}

                            {/* Availability Mode Badge */}
                            {v.availabilityMode === 'local_order' && (
                              <span className="vm-avail-badge local_order">
                                <Truck size={12} />
                                <span>{say('طلب داخلي', 'Local Order')}</span>
                              </span>
                            )}
                            {v.availabilityMode === 'external_order' && (
                              <span className="vm-avail-badge external_order">
                                <Globe size={12} />
                                <span>{say('طلب خارجي', 'Pre-Order')}</span>
                              </span>
                            )}

                            {v.warrantyMonths ? (
                              <span className="vm-spec-tag">
                                {v.warrantyMonths} {say('شهر ضمان', 'mo warranty')}
                              </span>
                            ) : null}
                          </div>
                        </div>

                        {/* Key Specs */}
                        <div className="vm-cell-specs">
                          {specBadges.length > 0 ? (
                            specBadges.map((badge, idx) => (
                              <span key={idx} className="vm-spec-tag">
                                {badge}
                              </span>
                            ))
                          ) : (
                            <span className="text-muted" style={{ fontSize: '12px' }}>
                              {say('بدون مواصفات مخصصة', 'Standard specs')}
                            </span>
                          )}
                        </div>

                        {/* Price */}
                        <div className="vm-cell-price">
                          {v.priceUsd ? (
                            <span className="vm-price-val">${Number(v.priceUsd).toFixed(2)}</span>
                          ) : (
                            <span className="vm-unpriced">{say('غير مسعّر', 'Unpriced')}</span>
                          )}
                        </div>

                        {/* Stock */}
                        <div className="vm-cell-stock">
                          {isSerialized ? (
                            <>
                              <span className="vm-stock-badge serialized">
                                <Hash size={12} />
                                <span>{availUnits} / {unitsList.length} {say('متاح', 'avail')}</span>
                              </span>
                              <span className="vm-stock-mode-text">{say('أرقام تسلسلية S/N', 'Serialized')}</span>
                            </>
                          ) : (
                            <>
                              <span className="vm-stock-badge quantity">
                                <Warehouse size={12} />
                                <span>{Number(v.quantity) || 0} {say('قطعة', 'units')}</span>
                              </span>
                              <span className="vm-stock-mode-text">{say('كمية رقمية', 'Quantity')}</span>
                            </>
                          )}
                        </div>

                        {/* Status Toggle */}
                        <div className="vm-cell-status">
                          <button
                            type="button"
                            className={`vm-status-toggle-btn ${v.active ? 'active' : 'inactive'}`}
                            onClick={e => handleToggleActive(v, e)}
                            title={say('انقر للتبديل بين نشط ومعطّل في المتجر', 'Toggle storefront active state')}
                          >
                            <span className={`vm-dot ${v.active ? 'green' : 'gray'}`} />
                            <span>{v.active ? say('نشط', 'Active') : say('معطّل', 'Inactive')}</span>
                          </button>
                        </div>

                        {/* Actions */}
                        <div className="vm-cell-actions">
                          <button
                            type="button"
                            className="vm-action-btn"
                            onClick={() => startEdit(v)}
                            title={say('تعديل الخيار', 'Edit')}
                          >
                            <Edit3 size={14} />
                            <span>{say('تعديل', 'Edit')}</span>
                          </button>

                          {can(user.role, 'catalog.edit') && (
                            <button
                              type="button"
                              className="vm-action-btn"
                              onClick={() => startDuplicate(v)}
                              title={say('تكرار الخيار', 'Duplicate')}
                            >
                              <Copy size={14} />
                            </button>
                          )}

                          {can(user.role, 'catalog.edit') && (
                            <button
                              type="button"
                              className="vm-action-btn delete"
                              onClick={() => setDeleteConfirm(v)}
                              title={say('حذف الخيار', 'Delete')}
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* ── Mobile Variant Cards List (< 960px) ────────────────────── */}
              <div className="vm-mobile-cards-list">
                {filteredVariants.map(v => {
                  const prod = products.find(p => p.id === v.productId);
                  const prodTitle = prod?.title[lang] || prod?.model || v.productId;

                  const firstVarImg = Array.isArray(v.images) && v.images[0] ? v.images[0] : '';
                  let firstProdImg = '';
                  if (Array.isArray(prod?.images) && prod?.images.length > 0) {
                    const item = prod.images[0];
                    firstProdImg = typeof item === 'string' ? item : item.media?.originalPath || item.path || '';
                  }
                  const displayImg = firstVarImg || firstProdImg;
                  const isSerialized = v.inventoryMode === 'serialized';
                  const unitsList = Array.isArray(v.units) ? v.units : [];
                  const availUnits = unitsList.filter(u => u.available && !u.soldOrderId).length;

                  const combinedSpecs = { ...(v.specs || {}), ...(v.options || {}) };
                  const specBadges = Object.entries(combinedSpecs)
                    .filter(([_, val]) => val !== null && val !== undefined && val !== '')
                    .slice(0, 3)
                    .map(([k, val]) => `${k}: ${String(val)}`);

                  return (
                    <article className="vm-mobile-card" key={v.id}>
                      {/* Top Row: Thumb, Title, Status */}
                      <div className="vm-mobile-top-row">
                        <div className="vm-mobile-thumb">
                          {displayImg ? (
                            <img src={safeImageUrl(displayImg)} alt="" loading="lazy" />
                          ) : (
                            <Layers size={22} className="vm-thumb-placeholder" />
                          )}
                        </div>

                        <div className="vm-mobile-info">
                          <button type="button" className="vm-mobile-title" onClick={() => startEdit(v)}>
                            {prodTitle}
                          </button>
                          <div className="vm-mobile-pills-row">
                            <button
                              type="button"
                              className="vm-sku-pill"
                              dir="ltr"
                              onClick={() => handleCopySku(v.sku)}
                            >
                              {copiedSku === v.sku ? <Check size={12} color="#10b981" /> : <Copy size={12} />}
                              <span>{v.sku}</span>
                            </button>

                            {/* Condition Badge */}
                            {(() => {
                              const condLabels: Record<string, { ar: string; en: string }> = {
                                new: { ar: 'جديد كلياً', en: 'New' },
                                open_box: { ar: 'أوبن بوكس', en: 'Open Box' },
                                like_new: { ar: 'شبه جديد', en: 'Like New' },
                                refurbished: { ar: 'مجدد مع الضمان', en: 'Refurbished' },
                                used: { ar: 'مستعمل', en: 'Used' },
                                defective: { ar: 'معيوب / تصفية', en: 'Defective' },
                                A: { ar: 'درجة A', en: 'Grade A' },
                                B: { ar: 'درجة B', en: 'Grade B' },
                                C: { ar: 'درجة C', en: 'Grade C' },
                              };
                              const item = condLabels[v.condition] || { ar: v.condition, en: v.condition };
                              return (
                                <span className={`vm-condition-badge ${v.condition}`}>
                                  {say(item.ar, item.en)}
                                </span>
                              );
                            })()}

                            {/* Availability Mode Badge */}
                            {v.availabilityMode === 'local_order' && (
                              <span className="vm-avail-badge local_order">
                                <Truck size={12} />
                                <span>{say('طلب داخلي', 'Local')}</span>
                              </span>
                            )}
                            {v.availabilityMode === 'external_order' && (
                              <span className="vm-avail-badge external_order">
                                <Globe size={12} />
                                <span>{say('طلب خارجي', 'Pre-Order')}</span>
                              </span>
                            )}
                          </div>
                        </div>

                        <button
                          type="button"
                          className={`vm-status-toggle-btn ${v.active ? 'active' : 'inactive'}`}
                          onClick={e => handleToggleActive(v, e)}
                        >
                          <span className={`vm-dot ${v.active ? 'green' : 'gray'}`} />
                          <span>{v.active ? say('نشط', 'Active') : say('معطّل', 'Inactive')}</span>
                        </button>
                      </div>

                      {/* Specs Row */}
                      {specBadges.length > 0 && (
                        <div className="vm-mobile-specs-row">
                          {specBadges.map((badge, idx) => (
                            <span key={idx} className="vm-spec-tag">
                              {badge}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Pricing & Stock Row */}
                      <div className="vm-mobile-pricing-stock-row">
                        <div>
                          {v.priceUsd ? (
                            <span className="vm-price-val">${Number(v.priceUsd).toFixed(2)}</span>
                          ) : (
                            <span className="vm-unpriced">{say('غير مسعّر', 'Unpriced')}</span>
                          )}
                        </div>

                        <div>
                          {isSerialized ? (
                            <span className="vm-stock-badge serialized">
                              <Hash size={12} />
                              <span>{availUnits} / {unitsList.length} {say('متاح', 'avail')}</span>
                            </span>
                          ) : (
                            <span className="vm-stock-badge quantity">
                              <Warehouse size={12} />
                              <span>{Number(v.quantity) || 0} {say('قطعة', 'units')}</span>
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Actions Row */}
                      <div className="vm-mobile-actions-row">
                        <button
                          type="button"
                          className="vm-action-btn"
                          onClick={() => startEdit(v)}
                        >
                          <Edit3 size={15} />
                          <span>{say('تعديل', 'Edit')}</span>
                        </button>

                        {can(user.role, 'catalog.edit') && (
                          <button
                            type="button"
                            className="vm-action-btn"
                            onClick={() => startDuplicate(v)}
                          >
                            <Copy size={15} />
                            <span>{say('تكرار', 'Clone')}</span>
                          </button>
                        )}

                        {can(user.role, 'catalog.edit') && (
                          <button
                            type="button"
                            className="vm-action-btn delete"
                            onClick={() => setDeleteConfirm(v)}
                          >
                            <Trash2 size={15} />
                            <span>{say('حذف', 'Delete')}</span>
                          </button>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            </>
          )}
        </>
      ) : (
        /* ── Variant Form Editor ─────────────────────────────────────────── */
        <form className="vm-editor-card" onSubmit={handleSave}>
          <div className="vm-editor-topbar">
            <div className="vm-editor-title-group">
              <h2>
                <Layers size={22} style={{ color: 'var(--primary-text)' }} />
                <span>
                  {isAdding
                    ? say('إضافة خيار منتج جديد', 'Create New Product Variant')
                    : say(`تعديل خيار المنتج: ${edit.sku}`, `Edit Variant: ${edit.sku}`)}
                </span>
              </h2>
              <p>
                {say(
                  'اضبط بيانات الخيار والربط مع المنتج والسعر والمواصفات الفنية المخصصة.',
                  'Configure variant linking, pricing, warranty, stock mode, and specifications.'
                )}
              </p>
            </div>

            <div className="vm-editor-top-actions">
              <button type="button" className="button secondary" onClick={() => setEdit(null)}>
                {say('إلغاء والعودة', 'Cancel & Return')}
              </button>
              <button className="button primary" disabled={busy} type="submit">
                {busy ? say('جارٍ الحفظ…', 'Saving…') : say('حفظ الخيار', 'Save Variant')}
              </button>
            </div>
          </div>

          {/* Editor Tabs Bar */}
          <div className="vm-editor-tabs-bar">
            <button
              type="button"
              className={`vm-tab-btn ${activeTab === 'general' ? 'active' : ''}`}
              onClick={() => setActiveTab('general')}
            >
              <Tag size={16} />
              <span>{say('البيانات الأساسية والتسعير', 'Basic Info & Pricing')}</span>
            </button>

            <button
              type="button"
              className={`vm-tab-btn ${activeTab === 'specs' ? 'active' : ''}`}
              onClick={() => setActiveTab('specs')}
            >
              <SlidersHorizontal size={16} />
              <span>{say('المواصفات الفنية والتكوين', 'Specifications & Options')}</span>
            </button>

            <button
              type="button"
              className={`vm-tab-btn ${activeTab === 'images' ? 'active' : ''}`}
              onClick={() => setActiveTab('images')}
            >
              <ImageIcon size={16} />
              <span>
                {say('معرض صور الخيار', 'Variant Images')} ({edit.images.length})
              </span>
            </button>

            {edit.inventoryMode === 'serialized' && (
              <button
                type="button"
                className={`vm-tab-btn ${activeTab === 'units' ? 'active' : ''}`}
                onClick={() => setActiveTab('units')}
              >
                <Hash size={16} />
                <span>
                  {say('القطع المسلسلة S/N', 'Serial Units (S/N)')} ({edit.units?.length || 0})
                </span>
              </button>
            )}
          </div>

          {/* ── Tab 1: General Info & Pricing ─────────────────────────────── */}
          {activeTab === 'general' && (
            <>
              {/* Product Linking */}
              <div className="vm-form-section">
                <div className="vm-form-section-header">
                  <h3 className="vm-form-section-title">
                    <Package size={17} />
                    <span>{say('المنتج المرتبط بالخيار', 'Linked Parent Product')}</span>
                  </h3>
                  {isAdding && (
                    <button
                      type="button"
                      className="button secondary sm"
                      onClick={() => setProductPickerOpen(true)}
                    >
                      {say('اختيار منتج آخر', 'Change Product')}
                    </button>
                  )}
                </div>

                {selectedParentProduct ? (
                  <div className="vm-selected-product-card">
                    <div className="vm-selected-product-left">
                      <div className="vm-selected-product-thumb">
                        {(() => {
                          let pImg = '';
                          if (Array.isArray(selectedParentProduct.images) && selectedParentProduct.images.length > 0) {
                            const itm = selectedParentProduct.images[0];
                            pImg = typeof itm === 'string' ? itm : itm.media?.originalPath || itm.path || '';
                          }
                          return pImg ? (
                            <img src={safeImageUrl(pImg)} alt="" />
                          ) : (
                            <Package size={20} color="var(--primary)" />
                          );
                        })()}
                      </div>
                      <div className="vm-selected-product-meta">
                        <span className="vm-selected-product-title">
                          {selectedParentProduct.title[lang] || selectedParentProduct.model}
                        </span>
                        <span className="vm-selected-product-sub">
                          {say('الموديل:', 'Model:')} {selectedParentProduct.model || '—'} · {selectedParentProduct.id}
                        </span>
                      </div>
                    </div>

                    {!isAdding && (
                      <span className="vm-spec-tag" title={say('المنتج مقفل للخيار بعد إنشائه لحفظ سلامة الطلبات والمخزون', 'Parent product locked after creation')}>
                        {say('مقفل للحفاظ على سلامة المخزون', 'Locked for integrity')}
                      </span>
                    )}
                  </div>
                ) : (
                  <button
                    type="button"
                    className="button secondary full"
                    onClick={() => setProductPickerOpen(true)}
                  >
                    <Package size={16} />
                    <span>{say('اختر المنتج المرتبط', 'Select Linked Product')}</span>
                  </button>
                )}
              </div>

              {/* SKU & General Details */}
              <div className="vm-form-section">
                <h3 className="vm-form-section-title">
                  <Tag size={17} />
                  <span>{say('رمز الـ SKU وحالة الجهاز', 'SKU & Device Condition')}</span>
                </h3>

                <div className="fields-grid">
                  {/* SKU Input */}
                  <label>
                    <span>{say('رمز الـ SKU الفريد', 'Unique SKU')}</span>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <input
                        dir="ltr"
                        required
                        value={edit.sku}
                        placeholder="SKU-XXXX-XXXX"
                        onChange={e => setEdit({ ...edit, sku: e.target.value.toUpperCase() })}
                      />
                      <button
                        type="button"
                        className="button secondary sm"
                        title={say('توليد SKU تلقائي', 'Auto-generate SKU')}
                        onClick={() => {
                          const base = selectedParentProduct?.model || 'VAR';
                          setEdit({ ...edit, sku: autoSku(base) });
                        }}
                      >
                        <Wand2 size={15} />
                      </button>
                    </div>
                  </label>

                  {/* Condition Selector */}
                  <label>
                    <span>{say('حالة الجهاز / السلعة', 'Device Condition')}</span>
                    <div className="vm-condition-segmented">
                      {([
                        { key: 'new', ar: 'جديد كلياً', en: 'Brand New' },
                        { key: 'open_box', ar: 'أوبن بوكس', en: 'Open Box' },
                        { key: 'like_new', ar: 'شبه جديد', en: 'Like New' },
                        { key: 'refurbished', ar: 'مجدد مع الضمان', en: 'Refurbished' },
                        { key: 'used', ar: 'مستعمل', en: 'Used' },
                        { key: 'defective', ar: 'معيوب / تصفية', en: 'Defective' },
                        { key: 'A', ar: 'درجة A', en: 'Grade A' },
                        { key: 'B', ar: 'درجة B', en: 'Grade B' },
                        { key: 'C', ar: 'درجة C', en: 'Grade C' },
                      ] as const).map(item => (
                        <button
                          key={item.key}
                          type="button"
                          className={`vm-condition-btn ${edit.condition === item.key ? 'active' : ''}`}
                          onClick={() => setEdit({ ...edit, condition: item.key })}
                        >
                          {say(item.ar, item.en)}
                        </button>
                      ))}
                    </div>
                  </label>
                </div>
              </div>

              {/* Availability Mode & Pre-Order */}
              <div className="vm-form-section">
                <div className="vm-form-section-header">
                  <h3 className="vm-form-section-title">
                    <Truck size={17} />
                    <span>{say('طريقة التوفر ونظام الطلب', 'Availability Mode & Fulfillment')}</span>
                  </h3>
                </div>

                <div className="vm-availability-cards-grid">
                  <div
                    className={`vm-avail-card ${(edit.availabilityMode || 'in_stock') === 'in_stock' ? 'selected' : ''}`}
                    onClick={() => setEdit({ ...edit, availabilityMode: 'in_stock', leadTimeDays: null })}
                  >
                    <div className="vm-avail-card-header">
                      <span className="vm-avail-card-title">
                        <Warehouse size={16} />
                        <span>{say('متوفر بالمخزن (تسليم فوري)', 'In Stock (Instant)')}</span>
                      </span>
                      {(edit.availabilityMode || 'in_stock') === 'in_stock' && <CheckCircle2 size={16} color="var(--primary)" />}
                    </div>
                    <p className="vm-avail-card-desc">
                      {say('السلعة موجودة فعلياً في المستودع ويتم تسليمها فوراً عند تأكيد الطلب.', 'Physical stock available for immediate pickup or dispatch.')}
                    </p>
                  </div>

                  <div
                    className={`vm-avail-card ${edit.availabilityMode === 'local_order' ? 'selected' : ''}`}
                    onClick={() => setEdit({ ...edit, availabilityMode: 'local_order', leadTimeDays: edit.leadTimeDays || 2 })}
                  >
                    <div className="vm-avail-card-header">
                      <span className="vm-avail-card-title">
                        <Truck size={16} />
                        <span>{say('طلب داخلي (توفير محلي)', 'Local On-Demand')}</span>
                      </span>
                      {edit.availabilityMode === 'local_order' && <CheckCircle2 size={16} color="var(--primary)" />}
                    </div>
                    <p className="vm-avail-card-desc">
                      {say('يتم توفير الجهاز محلياً من المورّدين المعتمدين خلال 1 إلى 3 أيام.', 'Procured locally from verified distributors upon customer order.')}
                    </p>
                  </div>

                  <div
                    className={`vm-avail-card ${edit.availabilityMode === 'external_order' ? 'selected' : ''}`}
                    onClick={() => setEdit({ ...edit, availabilityMode: 'external_order', leadTimeDays: edit.leadTimeDays || 10 })}
                  >
                    <div className="vm-avail-card-header">
                      <span className="vm-avail-card-title">
                        <Globe size={16} />
                        <span>{say('طلب خارجي (استيراد وشحن دولي)', 'External Pre-Order')}</span>
                      </span>
                      {edit.availabilityMode === 'external_order' && <CheckCircle2 size={16} color="var(--primary)" />}
                    </div>
                    <p className="vm-avail-card-desc">
                      {say('يُطلب الجهاز للشحن والاستيراد من الخارج خصيصاً للعميل مع مدة وصول تقديرية.', 'Imported and shipped internationally for the customer with lead time.')}
                    </p>
                  </div>
                </div>

                {edit.availabilityMode && edit.availabilityMode !== 'in_stock' && (
                  <div className="vm-lead-time-box" style={{ marginTop: '12px' }}>
                    <label>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Clock size={15} />
                        <strong>{say('المدة المتوقعة للتوفير والتجهيز (بالأيام):', 'Estimated Lead Time (Days):')}</strong>
                      </span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px' }}>
                        <input
                          type="number"
                          min={1}
                          max={90}
                          style={{ width: '120px' }}
                          value={edit.leadTimeDays ?? ''}
                          placeholder={edit.availabilityMode === 'local_order' ? '2' : '10'}
                          onChange={e => {
                            const val = e.target.value === '' ? null : Number(e.target.value);
                            setEdit({ ...edit, leadTimeDays: val });
                          }}
                        />
                        <span style={{ fontSize: '13px', color: 'var(--muted)' }}>
                          {say('أيام عمل تقريبية حتى الوصول والتسليم', 'approximate business days until arrival')}
                        </span>
                      </div>
                    </label>
                  </div>
                )}
              </div>

              {/* Pricing & Warranty */}
              <div className="vm-form-section">
                <h3 className="vm-form-section-title">
                  <DollarSign size={17} />
                  <span>{say('التسعير بالدولار والضمان', 'USD Pricing & Warranty')}</span>
                </h3>

                <div className="fields-grid">
                  <label>
                    <span>{say('سعر البيع بالدولار ($ Price)', 'Selling Price ($ USD)')}</span>
                    <input
                      type="text"
                      dir="ltr"
                      placeholder="0.00"
                      disabled={!can(user.role, 'prices.edit')}
                      value={edit.priceUsd || ''}
                      onChange={e => {
                        const val = e.target.value.trim();
                        setEdit({ ...edit, priceUsd: val === '' ? null : val });
                      }}
                    />
                  </label>

                  <label>
                    <span>{say('مدة الضمان بالأشهر', 'Warranty (Months)')}</span>
                    <input
                      type="number"
                      min={0}
                      max={120}
                      value={edit.warrantyMonths ?? ''}
                      onChange={e => {
                        const val = e.target.value === '' ? null : Number(e.target.value);
                        setEdit({ ...edit, warrantyMonths: val });
                      }}
                    />
                    <div className="vm-warranty-presets">
                      {[3, 6, 12, 24].map(months => (
                        <button
                          key={months}
                          type="button"
                          className={`vm-warranty-preset-btn ${edit.warrantyMonths === months ? 'active' : ''}`}
                          onClick={() => setEdit({ ...edit, warrantyMonths: months })}
                        >
                          {months} {say('شهر', 'mo')}
                        </button>
                      ))}
                    </div>
                  </label>
                </div>

                {/* Storefront Active Toggle */}
                <label className="checkbox-field" style={{ marginTop: '10px' }}>
                  <input
                    type="checkbox"
                    checked={edit.active}
                    onChange={e => setEdit({ ...edit, active: e.target.checked })}
                  />
                  <span>
                    <strong>{say('خيار نشط ومعروض للبيع في المتجر للعملاء', 'Active variant (published in storefront)')}</strong>
                  </span>
                </label>
              </div>

              {/* Inventory Tracking Mode */}
              <div className="vm-form-section">
                <div className="vm-form-section-header">
                  <h3 className="vm-form-section-title">
                    <Warehouse size={17} />
                    <span>{say('نظام تتبع المخزون', 'Inventory Tracking Mode')}</span>
                  </h3>
                  {isModeLocked && (
                    <span className="vm-spec-tag">
                      {say('مقفلة لوجود حركات مخزون سابقة', 'Locked by stock history')}
                    </span>
                  )}
                </div>

                <div className="vm-mode-cards-grid">
                  <div
                    className={`vm-mode-card ${edit.inventoryMode === 'quantity' ? 'selected' : ''} ${isModeLocked ? 'disabled' : ''}`}
                    onClick={() => {
                      if (!isModeLocked) setEdit({ ...edit, inventoryMode: 'quantity' });
                    }}
                  >
                    <div className="vm-mode-card-header">
                      <span className="vm-mode-card-title">
                        <Warehouse size={16} />
                        <span>{say('كمية عددية (Quantity)', 'Quantity Mode')}</span>
                      </span>
                      {edit.inventoryMode === 'quantity' && <CheckCircle2 size={16} color="var(--primary)" />}
                    </div>
                    <p className="vm-mode-card-desc">
                      {say(
                        'مناسب للبضائع والقطع المتماثلة، حيث يُدار الرصيد بعدد إجمالي في المستودع.',
                        'Best for uniform goods with simple count-based stock in inventory.'
                      )}
                    </p>
                  </div>

                  <div
                    className={`vm-mode-card ${edit.inventoryMode === 'serialized' ? 'selected' : ''} ${isModeLocked ? 'disabled' : ''}`}
                    onClick={() => {
                      if (!isModeLocked) setEdit({ ...edit, inventoryMode: 'serialized' });
                    }}
                  >
                    <div className="vm-mode-card-header">
                      <span className="vm-mode-card-title">
                        <Hash size={16} />
                        <span>{say('قطع فردية مسلسلة (Serialized S/N)', 'Serialized S/N Mode')}</span>
                      </span>
                      {edit.inventoryMode === 'serialized' && <CheckCircle2 size={16} color="var(--primary)" />}
                    </div>
                    <p className="vm-mode-card-desc">
                      {say(
                        'مناسب للأجهزة المستعملة أو الفريدة؛ يتم تتبع كل قطعة برقم تسلسلي S/N وتقرير فحص وصحة بطارية منفصلة.',
                        'Best for individual unique laptops/devices with discrete serial numbers, battery health, and test reports.'
                      )}
                    </p>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* ── Tab 2: Specifications & Options ───────────────────────────── */}
          {activeTab === 'specs' && (
            <div className="vm-form-section">
              <div className="vm-form-section-header">
                <div>
                  <h3 className="vm-form-section-title">
                    <SlidersHorizontal size={17} />
                    <span>{say('تركيب الخيار والمواصفات الفنية', 'Variant Configuration & Specifications')}</span>
                  </h3>
                  <p className="vm-form-section-desc">
                    {say(
                      'المواصفات الفنية المحددة لهذا البديل (مثل الرام، المعالج، سعة التخزين، الشاشة). الحقول المعلمة بـ "مطلوب" إلزامية قبل النشر.',
                      'Technical specs defining this configuration (RAM, CPU, Storage, Display). Fields marked "Required" must be filled.'
                    )}
                  </p>
                </div>
              </div>

              {specFields.length === 0 ? (
                <div className="empty-catalog-state" style={{ padding: '24px' }}>
                  <Info size={28} style={{ color: 'var(--muted)' }} />
                  <p>
                    {say(
                      'هذا المنتج غير مرتبط بقالب مواصفات فنية حالياً. يمكنك ربطه بقالب من شاشة أنواع المنتجات.',
                      'This product has no specification template assigned. Assign one in Product Types.'
                    )}
                  </p>
                </div>
              ) : (
                <div className="vm-specs-fields-grid">
                  {specFields.map(field => {
                    const currentVal = edit.options[field.key] ?? edit.specs[field.key];
                    const isReq = field.required;

                    const updateSpecVal = (newVal: unknown) => {
                      const nextOptions = { ...edit.options };
                      const nextSpecs = { ...edit.specs };
                      if (newVal === '' || newVal === null || newVal === undefined) {
                        delete nextOptions[field.key];
                        delete nextSpecs[field.key];
                      } else {
                        nextOptions[field.key] = newVal;
                      }
                      setEdit({ ...edit, options: nextOptions, specs: nextSpecs });
                    };

                    return (
                      <div className="vm-spec-input-card" key={field.key}>
                        <div className="vm-spec-input-card-header">
                          <span className="vm-spec-input-label">
                            <span>{field.title[lang] || field.key}</span>
                            {field.unit && <span className="vm-spec-unit-text">({field.unit})</span>}
                          </span>
                          {isReq && <span className="vm-spec-badge-req">{say('مطلوب', 'Required')}</span>}
                        </div>

                        {/* Input representation based on valueType */}
                        {field.valueType === 'single' && (
                          <select
                            value={String(currentVal ?? '')}
                            onChange={e => updateSpecVal(e.target.value || null)}
                          >
                            <option value="">{say('اختر القيمة…', 'Select value…')}</option>
                            {field.options.map(opt => (
                              <option key={opt} value={opt}>
                                {opt}
                              </option>
                            ))}
                          </select>
                        )}

                        {field.valueType === 'boolean' && (
                          <label className="checkbox-field" style={{ margin: 0 }}>
                            <input
                              type="checkbox"
                              checked={Boolean(currentVal)}
                              onChange={e => updateSpecVal(e.target.checked)}
                            />
                            <span>{say('نعم / مفعّل', 'Yes / Enabled')}</span>
                          </label>
                        )}

                        {field.valueType === 'number' && (
                          <input
                            type="number"
                            placeholder={field.unit ? `0 ${field.unit}` : '0'}
                            value={currentVal !== undefined && currentVal !== null ? String(currentVal) : ''}
                            onChange={e => updateSpecVal(e.target.value === '' ? null : Number(e.target.value))}
                          />
                        )}

                        {(field.valueType === 'text' || field.valueType === 'multi') && (
                          <input
                            type="text"
                            placeholder={say('أدخل القيمة…', 'Enter value…')}
                            value={String(currentVal ?? '')}
                            onChange={e => updateSpecVal(e.target.value || null)}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── Tab 3: Images & Media ─────────────────────────────────────── */}
          {activeTab === 'images' && (
            <div className="vm-form-section">
              <div className="vm-form-section-header">
                <div>
                  <h3 className="vm-form-section-title">
                    <ImageIcon size={17} />
                    <span>{say('معرض صور الخيار', 'Variant Images Gallery')}</span>
                  </h3>
                  <p className="vm-form-section-desc">
                    {say(
                      'أضف صوراً مخصصة لهذا البديل تبرز لونه أو حالته الواقعية. إن لم تُضف صوراً، ستُعرض صورة المنتج الأساسي تلقائياً.',
                      'Add photos specific to this variant (color/condition). If empty, the parent product image is used.'
                    )}
                  </p>
                </div>

                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    className="button secondary sm"
                    onClick={handleCopyParentImages}
                    title={say('نسخ صور المنتج الأب إلى هذا الخيار', 'Copy photos from parent product')}
                  >
                    <Copy size={14} />
                    <span>{say('استيراد صور المنتج الأب', 'Copy Parent Photos')}</span>
                  </button>

                  <button
                    type="button"
                    className="button primary sm"
                    onClick={() => setMediaPickerOpen(true)}
                  >
                    <Plus size={14} />
                    <span>{say('اختيار من المكتبة', 'Pick from Media Library')}</span>
                  </button>
                </div>
              </div>

              <div className="vm-gallery-grid">
                {edit.images.map((path, idx) => (
                  <div className="vm-gallery-item" key={path}>
                    <img src={safeImageUrl(path)} alt="" />
                    <div className="vm-gallery-item-actions">
                      <button
                        type="button"
                        className="vm-gallery-del-btn"
                        onClick={() => {
                          const next = edit.images.filter(p => p !== path);
                          setEdit({ ...edit, images: next });
                        }}
                        title={say('حذف الصورة', 'Delete image')}
                      >
                        <Trash2 size={13} />
                      </button>

                      {idx > 0 && (
                        <button
                          type="button"
                          className="vm-gallery-reorder-btn"
                          onClick={() => {
                            const next = [...edit.images];
                            [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
                            setEdit({ ...edit, images: next });
                          }}
                          title={say('تقديم', 'Move forward')}
                        >
                          {ar ? '◀' : '◀'}
                        </button>
                      )}
                    </div>
                  </div>
                ))}

                <button
                  type="button"
                  className="vm-gallery-add-card"
                  onClick={() => setMediaPickerOpen(true)}
                >
                  <Plus size={24} />
                  <span>{say('إضافة صورة', 'Add Image')}</span>
                </button>
              </div>
            </div>
          )}

          {/* ── Tab 4: Serialized Units (S/N) ─────────────────────────────── */}
          {activeTab === 'units' && edit.inventoryMode === 'serialized' && (
            <div className="vm-form-section">
              <div className="vm-units-header-row">
                <div>
                  <h3 className="vm-form-section-title">
                    <Hash size={17} />
                    <span>{say('القطع المسلسلة وإدارة الأرقام التسلسلية (S/N)', 'Serialized Units & Inspection')}</span>
                  </h3>
                  <p className="vm-form-section-desc">
                    {say(
                      'سجل كل جهاز برقم تسلسلي (Serial Number) مستقل مع تقرير الفحص وصحة البطارية وحالته الخاصة.',
                      'Manage discrete physical inventory units by serial number with independent battery health & inspection status.'
                    )}
                  </p>
                </div>

                <button
                  type="button"
                  className="button primary sm"
                  onClick={handleOpenAddUnit}
                >
                  <Plus size={15} />
                  <span>{say('إضافة قطعة برقم تسلسلي', 'Add Serialized Unit')}</span>
                </button>
              </div>

              {(!edit.units || edit.units.length === 0) ? (
                <div className="empty-catalog-state" style={{ padding: '32px 16px' }}>
                  <Hash size={36} style={{ color: 'var(--muted)' }} />
                  <h4>{say('لا توجد قطع مسلسلة مسجلة لهذا الخيار بعد', 'No serialized units yet')}</h4>
                  <p>
                    {say(
                      'اضغط على زر "إضافة قطعة برقم تسلسلي" لإدخال الرقم التسلسلي وتقارير الفحص للأجهزة المتوفرة بالمستودع.',
                      'Click "Add Serialized Unit" to register individual devices with serial numbers and inspection checklists.'
                    )}
                  </p>
                  <button
                    type="button"
                    className="button primary sm"
                    onClick={handleOpenAddUnit}
                    style={{ marginTop: '12px' }}
                  >
                    <Plus size={15} />
                    <span>{say('إضافة أول قطعة الآن', 'Add First Unit Now')}</span>
                  </button>
                </div>
              ) : (
                <div className="vm-units-grid">
                  {edit.units.map(unit => {
                    const isSold = Boolean(unit.soldOrderId);
                    const condLabels: Record<string, { ar: string; en: string }> = {
                      new: { ar: 'جديد', en: 'New' },
                      open_box: { ar: 'أوبن بوكس', en: 'Open Box' },
                      like_new: { ar: 'شبه جديد', en: 'Like New' },
                      refurbished: { ar: 'مجدد', en: 'Refurbished' },
                      used: { ar: 'مستعمل', en: 'Used' },
                      defective: { ar: 'معيوب', en: 'Defective' },
                      A: { ar: 'درجة A', en: 'Grade A' },
                      B: { ar: 'درجة B', en: 'Grade B' },
                      C: { ar: 'درجة C', en: 'Grade C' },
                    };
                    const condText = condLabels[unit.condition] || { ar: unit.condition, en: unit.condition };

                    return (
                      <div className="vm-unit-card" key={unit.id}>
                        <div className="vm-unit-card-header">
                          <span className="vm-unit-sn" dir="ltr">
                            S/N: {unit.serialNumber}
                          </span>
                          <span className={`vm-stock-badge ${isSold ? 'quantity' : 'serialized'}`}>
                            {isSold
                              ? say('تم البيع', 'Sold')
                              : unit.available
                              ? say('متاح للبيع', 'Available')
                              : say('محجوز / معطل', 'Unavailable')}
                          </span>
                        </div>

                        <div className="vm-unit-card-meta">
                          <span className={`vm-condition-badge ${unit.condition}`}>
                            {say(condText.ar, condText.en)}
                          </span>

                          {unit.batteryHealthPct !== null && unit.batteryHealthPct !== undefined && (
                            <span className={`vm-battery-badge ${unit.batteryHealthPct >= 80 ? '' : unit.batteryHealthPct >= 65 ? 'low' : 'critical'}`}>
                              <ShieldCheck size={12} />
                              <span>{say('بطارية:', 'Batt:')} {unit.batteryHealthPct}%</span>
                            </span>
                          )}

                          {unit.inspection && typeof unit.inspection === 'object' && (unit.inspection as any).passed !== undefined && (
                            <span className="vm-spec-tag">
                              {(unit.inspection as any).passed ? say('اجتاز الفحص ✓', 'Passed ✓') : say('يحتاج صيانة', 'Check required')}
                            </span>
                          )}
                        </div>

                        <div className="vm-unit-card-actions">
                          <button
                            type="button"
                            className="vm-action-btn"
                            disabled={isSold}
                            onClick={() => handleOpenEditUnit(unit)}
                            title={say('تعديل بيانات القطعة', 'Edit unit')}
                          >
                            <Edit3 size={13} />
                            <span>{say('تعديل', 'Edit')}</span>
                          </button>

                          <button
                            type="button"
                            className="vm-action-btn delete"
                            disabled={isSold}
                            onClick={() => handleDeleteUnit(unit)}
                            title={say('حذف القطعة', 'Delete unit')}
                          >
                            <Trash2 size={13} />
                            <span>{say('حذف', 'Delete')}</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Sticky Mobile Dock for Editor */}
          <div className="editor-mobile-dock">
            <button
              type="button"
              className="button secondary sm"
              onClick={() => setEdit(null)}
            >
              {say('إلغاء', 'Cancel')}
            </button>
            <button
              type="submit"
              className="button primary sm"
              disabled={busy}
            >
              {busy ? say('جارٍ الحفظ…', 'Saving…') : say('حفظ الخيار', 'Save Variant')}
            </button>
          </div>
        </form>
      )}

      {/* ── Modals ──────────────────────────────────────────────────────────── */}

      {/* Visual Product Picker */}
      <VisualProductPickerModal
        open={productPickerOpen}
        onOpenChange={setProductPickerOpen}
        products={productOptions}
        selectedProductId={edit?.productId}
        onSelect={prodId => {
          if (edit) {
            const p = products.find(x => x.id === prodId);
            setEdit({
              ...edit,
              productId: prodId,
              sku: autoSku(p?.model || 'VAR'),
            });
          }
        }}
        title={say('اختيار المنتج الأب', 'Select Parent Product')}
      />

      {/* Visual Media Picker */}
      <VisualMediaPickerModal
        open={mediaPickerOpen}
        onOpenChange={setMediaPickerOpen}
        selectedPaths={edit?.images || []}
        onConfirm={paths => {
          if (edit) {
            setEdit({ ...edit, images: paths });
          }
        }}
        multiple
        title={say('اختيار صور خيار المنتج', 'Select Variant Images')}
      />

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <Modal
          open={Boolean(deleteConfirm)}
          onOpenChange={open => !open && setDeleteConfirm(null)}
          title={say('تأكيد حذف أو تعطيل الخيار', 'Confirm Variant Deletion')}
        >
          <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start', margin: '14px 0' }}>
            <div style={{ color: '#ef4444', flexShrink: 0, marginTop: '2px' }}>
              <AlertTriangle size={24} />
            </div>
            <div>
              <p style={{ margin: 0, fontWeight: 700, fontSize: '15px' }}>
                {say(
                  `هل أنت متأكد من حذف الخيار ذو الرمز (${deleteConfirm.sku})؟`,
                  `Are you sure you want to delete variant (${deleteConfirm.sku})?`
                )}
              </p>
              <p style={{ margin: '6px 0 0', fontSize: '13px', color: 'var(--muted)', lineHeight: 1.5 }}>
                {say(
                  'ملاحظة أمان: إذا كان هذا الخيار مرتبطاً بحركات مخزون أو أرقام تسلسلية سابقة، سيقوم النظام تلقائياً بتعطيله وإخفائه من المتجر بدلاً من الحذف النهائي حفاظاً على السجلات المالية.',
                  'Safety Note: If this variant has recorded stock movements or serial units, the system will safely deactivate it from storefront instead of hard-deleting to preserve audit logs.'
                )}
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '16px' }}>
            <button
              type="button"
              className="button secondary"
              onClick={() => setDeleteConfirm(null)}
              disabled={busy}
            >
              {say('إلغاء', 'Cancel')}
            </button>
            <button
              type="button"
              className="button danger"
              disabled={busy}
              onClick={() => handleDelete(deleteConfirm)}
            >
              {busy ? say('جارٍ الحذف…', 'Deleting…') : say('تأكيد الإجراء', 'Confirm Action')}
            </button>
          </div>
        </Modal>
      )}

      {/* Serialized Unit Add / Edit Modal */}
      {unitModalOpen && editingUnit && (
        <Modal
          open={unitModalOpen}
          onOpenChange={open => {
            if (!open) {
              setUnitModalOpen(false);
              setEditingUnit(null);
            }
          }}
          title={say('بيانات القطعة المسلسلة (S/N)', 'Serialized Unit Details')}
        >
          <form onSubmit={handleSaveUnit}>
            {unitError && (
              <div style={{ marginBottom: '12px' }}>
                <ErrorBox code={unitError} />
              </div>
            )}

            <div className="fields-grid" style={{ gap: '12px' }}>
              {/* Serial Number Input */}
              <label>
                <span>{say('الرقم التسلسلي (Serial Number S/N)', 'Serial Number (S/N)')}</span>
                <input
                  dir="ltr"
                  required
                  placeholder="e.g. PF29XYZ8"
                  value={editingUnit.serialNumber}
                  onChange={e => setEditingUnit({ ...editingUnit, serialNumber: e.target.value.toUpperCase() })}
                />
              </label>

              {/* Battery Health % */}
              <label>
                <span>{say('صحة البطارية (Battery Health %)', 'Battery Health %')}</span>
                <input
                  type="number"
                  min={0}
                  max={100}
                  placeholder="100"
                  value={editingUnit.batteryHealthPct ?? ''}
                  onChange={e => {
                    const val = e.target.value === '' ? null : Number(e.target.value);
                    setEditingUnit({ ...editingUnit, batteryHealthPct: val });
                  }}
                />
              </label>

              {/* Unit Condition */}
              <label style={{ gridColumn: '1 / -1' }}>
                <span>{say('حالة هذه القطعة تحديداً', 'Specific Unit Condition')}</span>
                <div className="vm-condition-segmented">
                  {([
                    { key: 'new', ar: 'جديد', en: 'New' },
                    { key: 'open_box', ar: 'أوبن بوكس', en: 'Open Box' },
                    { key: 'like_new', ar: 'شبه جديد', en: 'Like New' },
                    { key: 'refurbished', ar: 'مجدد', en: 'Refurbished' },
                    { key: 'used', ar: 'مستعمل', en: 'Used' },
                    { key: 'defective', ar: 'معيوب', en: 'Defective' },
                    { key: 'A', ar: 'درجة A', en: 'Grade A' },
                    { key: 'B', ar: 'درجة B', en: 'Grade B' },
                    { key: 'C', ar: 'درجة C', en: 'Grade C' },
                  ] as const).map(item => (
                    <button
                      key={item.key}
                      type="button"
                      className={`vm-condition-btn ${editingUnit.condition === item.key ? 'active' : ''}`}
                      onClick={() => setEditingUnit({ ...editingUnit, condition: item.key })}
                    >
                      {say(item.ar, item.en)}
                    </button>
                  ))}
                </div>
              </label>

              {/* Inspection Passed */}
              <label className="checkbox-field" style={{ gridColumn: '1 / -1', margin: '4px 0' }}>
                <input
                  type="checkbox"
                  checked={Boolean((editingUnit.inspection as any)?.passed ?? true)}
                  onChange={e => setEditingUnit({
                    ...editingUnit,
                    inspection: { ...(editingUnit.inspection || {}), passed: e.target.checked }
                  })}
                />
                <span>
                  <strong>{say('اجتاز الفحص التقني الكامل (Screen, Keyboard, Ports, Battery)', 'Passed full technical inspection')}</strong>
                </span>
              </label>

              {/* Inspection Notes */}
              <label style={{ gridColumn: '1 / -1' }}>
                <span>{say('ملاحظات الفحص والعيوب الطفيفة (إن وجدت)', 'Inspection & Defect Notes')}</span>
                <input
                  type="text"
                  placeholder={say('مثال: خدش خفيف على الغطاء الخارجي لا يؤثر على الأداء', 'e.g. minor scratch on outer lid')}
                  value={String((editingUnit.inspection as any)?.notes || '')}
                  onChange={e => setEditingUnit({
                    ...editingUnit,
                    inspection: { ...(editingUnit.inspection || {}), notes: e.target.value }
                  })}
                />
              </label>
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '18px' }}>
              <button
                type="button"
                className="button secondary"
                onClick={() => {
                  setUnitModalOpen(false);
                  setEditingUnit(null);
                }}
                disabled={unitFormBusy}
              >
                {say('إلغاء', 'Cancel')}
              </button>
              <button
                type="submit"
                className="button primary"
                disabled={unitFormBusy || !editingUnit.serialNumber.trim()}
              >
                {unitFormBusy ? say('جارٍ الحفظ…', 'Saving…') : say('حفظ القطعة', 'Save Unit')}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
export default VariantsManager;
