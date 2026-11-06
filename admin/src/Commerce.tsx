import {useState, type ReactNode} from 'react';
import {useQuery, useQueryClient} from '@tanstack/react-query';
import {Link} from 'react-router-dom';
import {
  Search, X, Plus, Edit3,
  Layers, Sparkles, Boxes, Folder, FileText,
  RotateCcw, PackageSearch, Wand2, Trash2, AlertTriangle
} from 'lucide-react';
import { can, TypeEdit, CategoryEdit, VariantEdit, CollectionEdit, PackageEdit, UnitEdit, type SpecFieldInput } from '@aljeel/shared';
import {api, ApiError} from './api';
import {useI18n} from './i18n';
import {useSession} from './App';
import {ErrorBox, Loading, PackageEnglishToggle, Modal} from './components';
import {ValueFields} from './ValueFields';
import './commerce.css';

type Row = Record<string, unknown>;
type Reference = {
  products: Row[];
  brands: Row[];
  categories: Row[];
  types: Row[];
  variants: Row[];
  collections: Row[];
  packages: Row[];
};

const object = (v: unknown): Row => v && typeof v === 'object' && !Array.isArray(v) ? v as Row : {};
const list = (v: unknown): Row[] => Array.isArray(v) ? v.map(object) : [];
const string = (v: unknown) => v == null ? '' : String(v);
const localized = (v: unknown, lang: string) => string(object(v)[lang]);
const schemas = {
  types: TypeEdit,
  categories: CategoryEdit,
  variants: VariantEdit,
  collections: CollectionEdit,
  packages: PackageEdit,
  units: UnitEdit
};
type CatalogModule = keyof typeof schemas;

function autoSlug(text: string): string {
  const clean = text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
  return clean || 'item-' + Math.random().toString(36).substring(2, 8);
}

export function CommerceCatalog({module}: {module: CatalogModule}) {
  const {lang, showEnglishFields} = useI18n();
  const ar = lang === 'ar';
  const {user} = useSession();
  const client = useQueryClient();
  const say = (a: string, e: string) => ar ? a : e;

  const query = useQuery({
    queryKey: ['commerce-reference'],
    queryFn: () => api<Reference>('/commerce/reference'),
    staleTime: 30_000,   // 30s — catalog structure rarely changes mid-session
    gcTime: 5 * 60_000,  // keep in cache 5min after last use
  });
  const media = useQuery({
    queryKey: ['media'],
    queryFn: () => api<{items: Row[]}>('/media'),
    staleTime: 60_000,   // 60s — uploads are infrequent
    gcTime: 5 * 60_000,
  });

  const [edit, setEdit] = useState<Row | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [q, setQ] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [error, setError] = useState('');
  const [details, setDetails] = useState('');
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState('general');
  const [availabilityReason, setAvailabilityReason] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<Row | null>(null);

  const titles = {
    categories: say('الفئات الرئيسية والفرعية', 'Category hierarchy'),
    types: say('أنواع المنتجات وقوالب المواصفات', 'Product types & specifications'),
    variants: say('خيارات المنتجات والأسعار (SKU)', 'Product variants & SKU'),
    collections: say('مجموعات العرض', 'Collections'),
    packages: say('الباقات والتجهيزات', 'Bundles & packages'),
    units: say('القطع المنفردة والأرقام التسلسلية', 'Individual serialized units')
  };

  if (query.isPending || media.isPending) return <Loading />;
  if (!query.data || !media.data) return <ErrorBox code="disconnected" />;

  const ref = query.data;

  // Flatten units if module === 'units'
  const rows: Row[] = module === 'units'
    ? ref.variants.flatMap(v => list(v.units).map(u => ({
        ...u,
        variantSku: v.sku,
        variantPriceUsd: v.priceUsd,
        productId: v.productId,
        variantInventoryMode: v.inventoryMode
      } as Row)))
    : ref[module];

  // Calculate status pills based on raw data
  const statusPills: { id: string; label: string; count: number; countDot?: string }[] = (() => {
    if (module === 'variants') {
      const activeCount = rows.filter(r => r.active).length;
      const inactiveCount = rows.filter(r => !r.active).length;
      return [
        { id: 'all', label: say('الكل', 'All'), count: rows.length },
        { id: 'active', label: say('نشط بالمتجر', 'Active'), count: activeCount, countDot: 'dot-green' },
        { id: 'inactive', label: say('معطّل', 'Inactive'), count: inactiveCount, countDot: 'dot-gray' }
      ];
    }
    if (module === 'packages' || module === 'collections') {
      const pubCount = rows.filter(r => r.published).length;
      const draftCount = rows.filter(r => !r.published).length;
      return [
        { id: 'all', label: say('الكل', 'All'), count: rows.length },
        { id: 'published', label: say('منشور', 'Published'), count: pubCount, countDot: 'dot-green' },
        { id: 'draft', label: say('مسودة', 'Draft'), count: draftCount, countDot: 'dot-gray' }
      ];
    }
    if (module === 'categories') {
      const pubCount = rows.filter(r => r.status === 'published').length;
      const draftCount = rows.filter(r => r.status === 'draft').length;
      const archCount = rows.filter(r => r.status === 'archived').length;
      return [
        { id: 'all', label: say('الكل', 'All'), count: rows.length },
        { id: 'published', label: say('منشور', 'Published'), count: pubCount, countDot: 'dot-green' },
        { id: 'draft', label: say('مسودة', 'Draft'), count: draftCount, countDot: 'dot-gray' },
        { id: 'archived', label: say('مؤرشف', 'Archived'), count: archCount, countDot: 'dot-gray' }
      ];
    }
    if (module === 'units') {
      const availCount = rows.filter(r => r.available && !r.soldOrderId).length;
      const soldCount = rows.filter(r => Boolean(r.soldOrderId)).length;
      const offCount = rows.filter(r => !r.available && !r.soldOrderId).length;
      return [
        { id: 'all', label: say('الكل', 'All'), count: rows.length },
        { id: 'available', label: say('متاح للبيع', 'Available'), count: availCount, countDot: 'dot-green' },
        { id: 'sold', label: say('مباع', 'Sold'), count: soldCount, countDot: 'dot-gray' },
        { id: 'withdrawn', label: say('موقوف', 'Withdrawn'), count: offCount, countDot: 'dot-yellow' }
      ];
    }
    return [
      { id: 'all', label: say('الكل', 'All'), count: rows.length }
    ];
  })();

  // Filtered rows
  const filtered = rows.filter(r => {
    if (q.trim()) {
      const queryStr = q.toLowerCase().trim();
      const parentProd = module === 'variants' || module === 'units'
        ? ref.products.find(p => p.id === r.productId)
        : null;
      const parentTitle = parentProd ? localized(parentProd.title, lang) : '';
      const searchable = JSON.stringify([r.id, r.sku, r.variantSku, r.slug, r.title, r.serialNumber, parentTitle]).toLowerCase();
      if (!searchable.includes(queryStr)) return false;
    }
    if (statusFilter !== 'all') {
      if (module === 'variants') {
        if (statusFilter === 'active' && !r.active) return false;
        if (statusFilter === 'inactive' && r.active) return false;
      } else if (module === 'packages' || module === 'collections') {
        if (statusFilter === 'published' && !r.published) return false;
        if (statusFilter === 'draft' && r.published) return false;
      } else if (module === 'categories') {
        if (r.status !== statusFilter) return false;
      } else if (module === 'units') {
        if (statusFilter === 'available' && (!r.available || r.soldOrderId)) return false;
        if (statusFilter === 'sold' && !r.soldOrderId) return false;
        if (statusFilter === 'withdrawn' && (r.available || r.soldOrderId)) return false;
      }
    }
    return true;
  }).sort((a, b) => {
    if (module === 'categories') return (Number(a.sort) || 0) - (Number(b.sort) || 0);
    return string(a.sku ?? a.serialNumber ?? a.slug ?? a.id).localeCompare(string(b.sku ?? b.serialNumber ?? b.slug ?? b.id));
  });

  const set = (key: string, value: unknown) => setEdit(edit ? { ...edit, [key]: value } : null);

  const options = (key: string, values: Row[], idKey = 'id', nullable = false) => edit && (
    <label>
      {say(
        key === 'productId' ? 'المنتج المرتبط' :
        key === 'parentSlug' ? 'الفئة الأم' :
        key === 'productTypeId' ? 'قالب المواصفات' :
        key === 'variantId' ? 'خيار المنتج SKU' :
        key === 'imageId' ? 'صورة الفئة' : key,
        key
      )}
      <select value={string(edit[key])} onChange={e => set(key, e.target.value || null)}>
        {nullable && <option value="">{say('بدون / موروث', 'None / inherited')}</option>}
        {values.map(r => (
          <option key={string(r[idKey])} value={string(r[idKey])}>
            {localized(r.title, lang) || string(r.sku ?? r.name ?? r.altAr ?? r[idKey])}
          </option>
        ))}
      </select>
    </label>
  );

  const choice = (key: string, values: string[]) => edit && (
    <label>
      {say(
        key === 'status' ? 'حالة النشر' :
        key === 'inventoryMode' ? 'طريقة إدارة المخزون' :
        key === 'condition' ? 'حالة الجهاز' :
        key === 'mode' ? 'نوع المجموعة' :
        key === 'priceMode' ? 'نظام سعر الباقة' : key,
        key
      )}
      <select value={string(edit[key])} onChange={e => set(key, e.target.value)}>
        {values.map(v => (
          <option key={v} value={v}>
            {v === 'quantity' ? say('كمية عددية (مخزن)', 'Quantity mode') :
             v === 'serialized' ? say('قطع فردية بأرقام تسلسلية', 'Serialized mode') :
             v === 'sum' ? say('مجموع أسعار القطع تلقائياً', 'Sum of components') :
             v === 'fixed' ? say('سعر محدد يدوي للباقة', 'Fixed bundle price') :
             v === 'published' ? say('منشور', 'Published') :
             v === 'draft' ? say('مسودة', 'Draft') :
             v === 'archived' ? say('مؤرشف', 'Archived') :
             v === 'new' ? say('جديد كلياً', 'Brand New') : v}
          </option>
        ))}
      </select>
    </label>
  );

  const text = (key: string, label: string, type = 'text', nullable = false) => edit && (
    <label>
      {label}
      <input
        type={type}
        dir={['id', 'slug', 'sku', 'serialNumber'].includes(key) ? 'ltr' : undefined}
        value={string(edit[key])}
        disabled={key === 'priceUsd' && !can(user.role, 'prices.edit')}
        onChange={e => set(key, e.target.value === '' && nullable ? null : type === 'number' ? Number(e.target.value) : e.target.value)}
      />
    </label>
  );

  const multi = (key: string, values: Row[], idKey = 'id') => edit && (
    <fieldset>
      <legend>{say(key === 'productIds' ? 'المنتجات' : key, key)}</legend>
      <div className="commerce-options">
        {values.map(v => {
          const value = string(v[idKey]), selected = Array.isArray(edit[key]) ? edit[key] as string[] : [];
          return (
            <label key={value}>
              <input
                type="checkbox"
                checked={selected.includes(value)}
                onChange={e => set(key, e.target.checked ? [...selected, value] : selected.filter(i => i !== value))}
              />
              {localized(v.title, lang) || string(v.name ?? value)}
            </label>
          );
        })}
      </div>
    </fieldset>
  );

  function start(row?: Row) {
    const revision = row ? { revision: row.updatedAt } : {}, id = crypto.randomUUID(), bi = { ar: '', en: '' };
    const defaults: Record<CatalogModule, Row> = {
      categories: { slug: '', title: bi, description: bi, parentSlug: null, productTypeId: null, imageId: null, status: 'draft', sort: 0 },
      types: { id, title: bi, fields: [] },
      variants: { id, productId: string(ref.products[0]?.id), sku: '', options: {}, specs: {}, images: [], priceUsd: null, warrantyMonths: null, condition: 'new', inventoryMode: 'quantity', active: true },
      collections: { id, slug: '', title: bi, description: bi, mode: 'manual', rules: { categories: [], brands: [], conditions: [], available: null, min: null, max: null }, productIds: [], published: false, sort: 0 },
      packages: { id, slug: '', title: bi, description: bi, priceMode: 'sum', priceUsd: null, items: [], published: false },
      units: { id, variantId: string(ref.variants.find(v => v.inventoryMode === 'serialized')?.id), serialNumber: '', condition: 'A', batteryHealthPct: null, inspection: { passed: false, notes: '' }, defects: [], images: [] }
    };
    const value: Row = { ...defaults[module], ...row, ...revision };
    if (module === 'collections' && row) value.productIds = list(row.products).map(p => p.productId);
    if (module === 'categories' && row) value.description = { ar: '', en: '', ...object(row.description) };
    setEdit(value);
    setIsAdding(!row);
    setAvailabilityReason('');
    setError('');
    setDetails('');
    setTab('general');
  }

  const fieldsForProduct = () => {
    if (!edit) return [];
    const product = ref.products.find(p => p.id === edit.productId);
    let typeId = product?.productTypeId, slug = product?.category;
    const seen = new Set<unknown>();
    while (!typeId && slug && !seen.has(slug)) {
      seen.add(slug);
      const cat = ref.categories.find(c => c.slug === slug);
      typeId = cat?.productTypeId;
      slug = cat?.parentSlug;
    }
    return list(ref.types.find(t => t.id === typeId)?.fields) as unknown as SpecFieldInput[];
  };

  const specEditor = (key: string, fields: SpecFieldInput[]) => edit && (
    <fieldset>
      <legend>{say(key === 'options' ? 'تركيب الخيار (مثل اللون والرام)' : 'مواصفات الخيار', key === 'options' ? 'Option combination' : 'Variant specifications')}</legend>
      <SpecInputs value={object(edit[key])} fields={fields} onChange={value => set(key, value)} />
    </fieldset>
  );

  const editImages = Array.isArray(edit?.images) ? (edit.images as string[]) : [];
  const images = edit && ['variants', 'units'].includes(module) && (
    <fieldset>
      <legend>{say('الصور بالترتيب', 'Ordered images')}</legend>
      {editImages.map((path, i) => (
        <div className="commerce-image" key={string(path)}>
          <img src={string(path).replace('/api/media/', '/api/admin/media/')} width={110} height={80} alt="" />
          <button type="button" className="button secondary" onClick={() => set('images', editImages.filter(p => p !== path))}>
            {say('إزالة', 'Remove')}
          </button>
          <button
            type="button"
            className="button secondary"
            disabled={!i}
            onClick={() => {
              const next = [...editImages];
              [next[i - 1], next[i]] = [next[i], next[i - 1]];
              set('images', next);
            }}
          >
            {say('تقديم', 'Move earlier')}
          </button>
        </div>
      ))}
      <select value="" onChange={e => { if (e.target.value) set('images', [...editImages, e.target.value]); }}>
        <option value="">{say('اختر صورة من المكتبة', 'Choose library image')}</option>
        {media.data.items.filter(m => !editImages.includes(string(m.originalPath))).map(m => (
          <option key={string(m.id)} value={string(m.originalPath)}>{string(m.altAr ?? m.id)}</option>
        ))}
      </select>
    </fieldset>
  );

  const shouldHideEn = !showEnglishFields;

  async function handleDelete(target: Row) {
    const targetId = String(target.slug ?? target.id ?? '');
    if (!targetId) return;
    setBusy(true);
    setError('');
    try {
      await api('/commerce/' + module + '/' + encodeURIComponent(targetId), { method: 'DELETE' });
      await client.invalidateQueries({ queryKey: ['commerce-reference'] });
      setDeleteConfirm(null);
      if (edit && (edit.id === target.id || edit.slug === target.slug)) {
        setEdit(null);
      }
    } catch (e) {
      setError(e instanceof ApiError ? e.code : 'failed');
    } finally {
      setBusy(false);
    }
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setDetails('');
    if (!edit) return;
    const payload = { ...edit };
    if (!isAdding && edit.updatedAt && !payload.revision) {
      payload.revision = typeof edit.updatedAt === 'string' ? edit.updatedAt : (edit.updatedAt as Date).toISOString();
    }
    if (module === 'packages' || module === 'categories' || module === 'collections') {
      if (payload.title && typeof payload.title === 'object') {
        const t = object(payload.title), arText = string(t.ar).trim(), enText = string(t.en).trim();
        payload.title = { ar: arText || enText, en: enText || arText };
      }
      if (payload.description && typeof payload.description === 'object') {
        const d = object(payload.description), arDesc = string(d.ar).trim(), enDesc = string(d.en).trim(), fallback = string(object(payload.title).ar) || string(object(payload.title).en) || module;
        payload.description = { ar: arDesc || enDesc || fallback, en: enDesc || arDesc || fallback };
      } else {
        const fallback = string(object(payload.title).ar) || string(object(payload.title).en) || module;
        payload.description = { ar: fallback, en: fallback };
      }
      if (!payload.slug || !string(payload.slug).trim()) {
        payload.slug = autoSlug(string(object(payload.title).en) || string(object(payload.title).ar) || module);
      } else {
        payload.slug = autoSlug(string(payload.slug));
      }
      if (!payload.id) payload.id = crypto.randomUUID();
    }
    if (module === 'categories') {
      if (!payload.parentSlug || payload.parentSlug === '') payload.parentSlug = null;
      if (!payload.productTypeId || payload.productTypeId === '') payload.productTypeId = null;
      if (!payload.imageId || payload.imageId === '') payload.imageId = null;
      payload.sort = Number(payload.sort) || 0;
      if (!payload.status) payload.status = 'draft';
    }
    if (module === 'variants') {
      if (!payload.id) payload.id = crypto.randomUUID();
      if (!payload.sku || !string(payload.sku).trim()) {
        const prod = ref.products.find(p => p.id === payload.productId);
        payload.sku = autoSlug((prod?.model || 'sku') + '-' + Math.random().toString(36).substring(2, 6)).toUpperCase();
      }
    }
    if (module === 'units') {
      if (!payload.id) payload.id = crypto.randomUUID();
      if (!payload.serialNumber || !string(payload.serialNumber).trim()) {
        payload.serialNumber = 'SN-' + Math.random().toString(36).substring(2, 10).toUpperCase();
      }
    }
    const parsed = schemas[module].safeParse(payload);
    if (!parsed.success) {
      setDetails(parsed.error.issues.map(i => i.path.join('.') + ': ' + i.message).join(' · '));
      return;
    }
    setBusy(true);
    try {
      await api('/commerce/' + module, { method: 'POST', body: parsed.data });
      await client.invalidateQueries({ queryKey: ['commerce-reference'] });
      setEdit(null);
    } catch (e) {
      setError(e instanceof ApiError ? e.code : 'failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div className="page-heading">
        <h1>{titles[module]}</h1>
        <button className="button primary" onClick={() => start()}>
          <Plus size={16} />
          <span>{say('إضافة جديد', 'Add new')}</span>
        </button>
      </div>

      <ErrorBox code={error} />
      {details && <p role="alert" className="commerce-error">{details}</p>}

      {!edit ? (
        <>
          {/* Executive Control Panel */}
          <section className="catalog-control-panel">
            <div className="search-bar-unified">
              <div className="search-input-wrap">
                <Search size={18} className="search-icon" aria-hidden="true" />
                <input
                  aria-label={say('بحث...', 'Search...')}
                  placeholder={
                    module === 'variants' ? say('ابحث برمز SKU، اسم المنتج، المعرّف...', 'Search SKU, product title, ID...') :
                    module === 'packages' ? say('ابحث باسم الباقة، الرابط...', 'Search bundle name, slug...') :
                    module === 'categories' ? say('ابحث باسم الفئة أو الرابط...', 'Search category name or slug...') :
                    module === 'units' ? say('ابحث بالرقم التسلسلي S/N أو SKU...', 'Search serial number or SKU...') :
                    say('ابحث في القائمة...', 'Search list...')
                  }
                  value={q}
                  onChange={e => { setQ(e.target.value); setPage(1); }}
                />
                {q && (
                  <button
                    type="button"
                    className="clear-search-btn"
                    onClick={() => { setQ(''); setPage(1); }}
                    aria-label={say('مسح البحث', 'Clear search')}
                  >
                    <X size={15} />
                  </button>
                )}
              </div>

              {/* Status Filter Pills */}
              <div className="status-pills-bar">
                {statusPills.map(item => (
                  <button
                    key={item.id}
                    type="button"
                    className={`status-filter-pill ${statusFilter === item.id ? 'active' : ''}`}
                    onClick={() => { setStatusFilter(item.id); setPage(1); }}
                  >
                    {item.countDot && <span className={`status-dot ${item.countDot}`} />}
                    <span>{item.label}</span>
                    <span className="pill-count-num">({item.count})</span>
                  </button>
                ))}
              </div>

              {/* Reset Filters */}
              {(q || statusFilter !== 'all') && (
                <button
                  type="button"
                  className="reset-filters-btn"
                  onClick={() => { setQ(''); setStatusFilter('all'); setPage(1); }}
                  title={say('إعادة ضبط كافة الفلاتر', 'Reset all filters')}
                >
                  <RotateCcw size={14} />
                  <span>{say('إعادة ضبط', 'Reset')}</span>
                </button>
              )}
            </div>
          </section>

          {/* Table or Empty State */}
          {filtered.length === 0 ? (
            <div className="empty-catalog-state">
              <div className="empty-icon-wrap">
                <PackageSearch size={36} />
              </div>
              <h3>{say('لا توجد عناصر مطابقة', 'No items found')}</h3>
              <p>{say('لم يتم العثور على أي نتائج تطابق معايير البحث أو الفلتر المحددة.', 'No items match your current search or filter criteria.')}</p>
              {(q || statusFilter !== 'all') && (
                <button
                  type="button"
                  className="button secondary"
                  onClick={() => { setQ(''); setStatusFilter('all'); setPage(1); }}
                >
                  <RotateCcw size={15} />
                  <span>{say('إعادة ضبط الفلاتر', 'Reset filters')}</span>
                </button>
              )}
            </div>
          ) : (
            <div className="catalog-data-table-wrap">
              <div className={`catalog-data-header-row cols-${module}`}>
                {module === 'variants' && (
                  <>
                    <div className="col-media">{say('الصورة', 'Media')}</div>
                    <div className="col-info">{say('تفاصيل المنتج والـ SKU', 'Product & SKU')}</div>
                    <div className="col-price">{say('السعر ($)', 'Price ($)')}</div>
                    <div className="col-stock">{say('المخزون والنوع', 'Stock & Mode')}</div>
                    <div className="col-status">{say('الحالة', 'Status')}</div>
                    <div className="col-actions">{say('الإجراءات', 'Actions')}</div>
                  </>
                )}
                {module === 'packages' && (
                  <>
                    <div className="col-media">{say('الأيقونة', 'Icon')}</div>
                    <div className="col-info">{say('اسم الباقة والرابط', 'Bundle & Slug')}</div>
                    <div>{say('المكونات', 'Components')}</div>
                    <div className="col-price">{say('نظام السعر ($)', 'Price ($)')}</div>
                    <div className="col-status">{say('حالة النشر', 'Status')}</div>
                    <div className="col-actions">{say('الإجراءات', 'Actions')}</div>
                  </>
                )}
                {module === 'categories' && (
                  <>
                    <div className="col-media">{say('الأيقونة', 'Icon')}</div>
                    <div className="col-info">{say('اسم الفئة والرابط', 'Category & Slug')}</div>
                    <div>{say('الفئة الأم', 'Parent')}</div>
                    <div>{say('قالب المواصفات', 'Template')}</div>
                    <div>{say('الترتيب', 'Order')}</div>
                    <div className="col-status">{say('حالة النشر', 'Status')}</div>
                    <div className="col-actions">{say('الإجراءات', 'Actions')}</div>
                  </>
                )}
                {module === 'types' && (
                  <>
                    <div className="col-media">{say('الأيقونة', 'Icon')}</div>
                    <div className="col-info">{say('اسم القالب والمعرّف', 'Type & ID')}</div>
                    <div>{say('حقول المواصفات', 'Specification Fields')}</div>
                    <div className="col-actions">{say('الإجراءات', 'Actions')}</div>
                  </>
                )}
                {module === 'units' && (
                  <>
                    <div>{say('الرقم التسلسلي S/N', 'Serial Number')}</div>
                    <div className="col-info">{say('المنتج ورمز SKU', 'Product & SKU')}</div>
                    <div>{say('الحالة', 'Condition')}</div>
                    <div>{say('البطارية', 'Battery')}</div>
                    <div>{say('الفحص', 'Inspection')}</div>
                    <div className="col-status">{say('التوفر', 'Availability')}</div>
                    <div className="col-actions">{say('الإجراءات', 'Actions')}</div>
                  </>
                )}
                {module === 'collections' && (
                  <>
                    <div className="col-media">{say('الأيقونة', 'Icon')}</div>
                    <div className="col-info">{say('اسم المجموعة والرابط', 'Collection & Slug')}</div>
                    <div>{say('النوع', 'Mode')}</div>
                    <div>{say('الترتيب', 'Order')}</div>
                    <div className="col-status">{say('حالة النشر', 'Status')}</div>
                    <div className="col-actions">{say('الإجراءات', 'Actions')}</div>
                  </>
                )}
              </div>

              <div className="catalog-data-rows-list">
                {filtered.slice((page - 1) * 24, page * 24).map(row => {
                  const keyId = string(row.id ?? row.serialNumber ?? row.slug);
                  return (
                    <article className={`catalog-data-row cols-${module}`} key={keyId}>
                      {module === 'variants' && (() => {
                        const product = ref.products.find(p => p.id === row.productId);
                        const firstProdImg = Array.isArray(product?.images) ? product.images[0] : null;
                        const prodImgPath = typeof firstProdImg === 'string'
                          ? firstProdImg
                          : string(object(object(firstProdImg).media).originalPath || object(firstProdImg).path || '');
                        const varImg = (Array.isArray(row.images) && typeof (row.images as unknown[])[0] === 'string')
                          ? (row.images as string[])[0]
                          : '';
                        const imgPath = varImg || prodImgPath;
                        const isSerialized = row.inventoryMode === 'serialized';
                        const unitsList = list(row.units);
                        const availUnits = unitsList.filter(u => u.available).length;

                        return (
                          <>
                            <div className="col-media">
                              <div className="thumb-container">
                                {imgPath ? (
                                  <img src={imgPath.replace('/api/media/', '/api/admin/media/')} alt="" loading="lazy" />
                                ) : (
                                  <div className="thumb-placeholder"><Layers size={20} /></div>
                                )}
                              </div>
                            </div>

                            <div className="col-info">
                              <button type="button" className="title-link-btn" onClick={() => start(row)}>
                                <strong className="product-title-text">
                                  {localized(product?.title, lang) || say('(منتج بدون اسم)', '(Untitled product)')}
                                </strong>
                              </button>
                              <div className="meta-pills-row">
                                <span className="meta-pill model-pill" dir="ltr" title="SKU">{string(row.sku)}</span>
                                <span className="meta-pill condition-pill">{string(row.condition) === 'new' ? say('جديد', 'New') : string(row.condition)}</span>
                                {row.warrantyMonths ? (
                                  <span className="meta-pill">{string(row.warrantyMonths)} {say('شهر ضمان', 'm warranty')}</span>
                                ) : null}
                              </div>
                            </div>

                            <div className="col-price">
                              {row.priceUsd ? (
                                <strong className="price-usd-val">${string(row.priceUsd)}</strong>
                              ) : (
                                <span className="text-muted" style={{ fontSize: '11.5px' }}>{say('غير مسعّر', 'Unpriced')}</span>
                              )}
                            </div>

                            <div className="col-stock">
                              {isSerialized ? (
                                <div>
                                  <span className="stock-serialized-badge">{availUnits} / {unitsList.length} {say('متوفر', 'avail')}</span>
                                  <small className="text-muted" style={{ fontSize: '10.5px' }}>{say('أرقام تسلسلية', 'Serialized')}</small>
                                </div>
                              ) : (
                                <div>
                                  <span className="stock-quantity-badge">{Number(row.quantity) || 0} {say('قطعة', 'units')}</span>
                                  <small className="text-muted" style={{ fontSize: '10.5px' }}>{say('كمية رقمية', 'Quantity mode')}</small>
                                </div>
                              )}
                            </div>

                            <div className="col-status">
                              <span className={`status-badge-modern ${row.active ? 'published' : 'archived'}`}>
                                <span className="status-dot-inner" />
                                <span>{row.active ? say('نشط ومعروض', 'Active') : say('معطّل', 'Inactive')}</span>
                              </span>
                            </div>

                            <div className="col-actions">
                              <button type="button" className="button subtle edit-action-btn" onClick={() => start(row)} title={say('تعديل', 'Edit')}>
                                <Edit3 size={15} />
                                <span>{say('تعديل', 'Edit')}</span>
                              </button>
                              {can(user.role, 'catalog.edit') && (
                                <button type="button" className="button subtle" style={{ color: '#ef4444' }} onClick={() => setDeleteConfirm(row)} title={say('حذف', 'Delete')}>
                                  <Trash2 size={15} />
                                </button>
                              )}
                            </div>
                          </>
                        );
                      })()}

                      {module === 'packages' && (() => {
                        const itemsCount = list(row.items).length;
                        const desc = localized(row.description, lang);
                        return (
                          <>
                            <div className="col-media">
                              <div className="catalog-icon-box">
                                <Sparkles size={20} />
                              </div>
                            </div>

                            <div className="col-info">
                              <button type="button" className="title-link-btn" onClick={() => start(row)}>
                                <strong className="product-title-text">{localized(row.title, lang) || string(row.slug)}</strong>
                              </button>
                              <div className="meta-pills-row">
                                <span className="meta-pill brand-pill">{itemsCount} {say('مكونات مشمولة', 'components')}</span>
                              </div>
                              {desc && <small className="package-desc-excerpt">{desc}</small>}
                            </div>

                            <div>
                              <span className="meta-pill brand-pill">{itemsCount} {say('مكونات مشمولة', 'components')}</span>
                            </div>

                            <div className="col-price">
                              {row.priceMode === 'fixed' && row.priceUsd ? (
                                <div>
                                  <strong className="price-usd-val">${string(row.priceUsd)}</strong>
                                  <small className="text-muted" style={{ display: 'block', fontSize: '10.5px' }}>{say('سعر محدد', 'Fixed')}</small>
                                </div>
                              ) : (
                                <span className="meta-pill">{say('مجموع القطع تلقائياً', 'Sum of items')}</span>
                              )}
                            </div>

                            <div className="col-status">
                              <span className={`status-badge-modern ${row.published ? 'published' : 'draft'}`}>
                                <span className="status-dot-inner" />
                                <span>{row.published ? say('منشور بالمتجر', 'Published') : say('مسودة', 'Draft')}</span>
                              </span>
                            </div>

                            <div className="col-actions">
                              <button type="button" className="button subtle edit-action-btn" onClick={() => start(row)} title={say('تعديل', 'Edit')}>
                                <Edit3 size={15} />
                                <span>{say('تعديل', 'Edit')}</span>
                              </button>
                              {can(user.role, 'catalog.edit') && (
                                <button type="button" className="button subtle" style={{ color: '#ef4444' }} onClick={() => setDeleteConfirm(row)} title={say('حذف', 'Delete')}>
                                  <Trash2 size={15} />
                                </button>
                              )}
                            </div>
                          </>
                        );
                      })()}

                      {module === 'categories' && (() => {
                        const parent = ref.categories.find(c => c.slug === row.parentSlug);
                        const pType = ref.types.find(t => t.id === row.productTypeId);
                        const statusClass = row.status === 'published' ? 'published' : row.status === 'archived' ? 'archived' : 'draft';
                        const statusLabel = row.status === 'published' ? say('منشور', 'Published') : row.status === 'archived' ? say('مؤرشف', 'Archived') : say('مسودة', 'Draft');

                        return (
                          <>
                            <div className="col-media">
                              <div className="catalog-icon-box">
                                <Folder size={20} />
                              </div>
                            </div>

                            <div className="col-info">
                              <button type="button" className="title-link-btn" onClick={() => start(row)}>
                                <strong className="product-title-text">{localized(row.title, lang) || string(row.slug)}</strong>
                              </button>
                            </div>

                            <div>
                              <span className="meta-pill cat-pill">
                                {parent ? localized(parent.title, lang) : say('فئة رئيسية', 'Root')}
                              </span>
                            </div>

                            <div>
                              <span className="meta-pill">
                                {pType ? localized(pType.title, lang) : say('بدون / موروث', 'Inherited')}
                              </span>
                            </div>

                            <div>
                              <span className="meta-pill">#{string(row.sort ?? 0)}</span>
                            </div>

                            <div className="col-status">
                              <span className={`status-badge-modern ${statusClass}`}>
                                <span className="status-dot-inner" />
                                <span>{statusLabel}</span>
                              </span>
                            </div>

                            <div className="col-actions">
                              <button type="button" className="button subtle edit-action-btn" onClick={() => start(row)} title={say('تعديل', 'Edit')}>
                                <Edit3 size={15} />
                                <span>{say('تعديل', 'Edit')}</span>
                              </button>
                              {can(user.role, 'catalog.edit') && (
                                <button type="button" className="button subtle" style={{ color: '#ef4444' }} onClick={() => setDeleteConfirm(row)} title={say('حذف', 'Delete')}>
                                  <Trash2 size={15} />
                                </button>
                              )}
                            </div>
                          </>
                        );
                      })()}

                      {module === 'types' && (() => {
                        const fCount = list(row.fields).length;
                        return (
                          <>
                            <div className="col-media">
                              <div className="catalog-icon-box">
                                <FileText size={20} />
                              </div>
                            </div>

                            <div className="col-info">
                              <button type="button" className="title-link-btn" onClick={() => start(row)}>
                                <strong className="product-title-text">{localized(row.title, lang) || string(row.id)}</strong>
                              </button>
                              <small className="text-muted" dir="ltr">{string(row.id)}</small>
                            </div>

                            <div>
                              <span className="meta-pill brand-pill">{fCount} {say('مواصفة معرفة', 'defined specs')}</span>
                            </div>

                            <div className="col-actions">
                              <button type="button" className="button subtle edit-action-btn" onClick={() => start(row)} title={say('تعديل', 'Edit')}>
                                <Edit3 size={15} />
                                <span>{say('تعديل', 'Edit')}</span>
                              </button>
                              {can(user.role, 'catalog.edit') && (
                                <button type="button" className="button subtle" style={{ color: '#ef4444' }} onClick={() => setDeleteConfirm(row)} title={say('حذف', 'Delete')}>
                                  <Trash2 size={15} />
                                </button>
                              )}
                            </div>
                          </>
                        );
                      })()}

                      {module === 'units' && (() => {
                        const product = ref.products.find(p => p.id === row.productId);
                        const insp = object(row.inspection);
                        const passed = Boolean(insp.passed);
                        return (
                          <>
                            <div>
                              <span className="serial-number-code" dir="ltr">{string(row.serialNumber || row.id)}</span>
                            </div>

                            <div className="col-info">
                              <button type="button" className="title-link-btn" onClick={() => start(row)}>
                                <strong className="product-title-text">{localized(product?.title, lang) || say('(منتج بدون اسم)', '(Untitled)')}</strong>
                              </button>
                              <div className="meta-pills-row">
                                <span className="meta-pill model-pill" dir="ltr">SKU: {string(row.variantSku)}</span>
                              </div>
                            </div>

                            <div>
                              <span className="meta-pill condition-pill">{string(row.condition)}</span>
                            </div>

                            <div>
                              <span style={{ fontSize: '12px', fontWeight: 600 }}>{row.batteryHealthPct ? `${row.batteryHealthPct}%` : '—'}</span>
                            </div>

                            <div>
                              <span className={`status-badge-modern ${passed ? 'published' : 'draft'}`}>
                                <span className="status-dot-inner" />
                                <span>{passed ? say('اجتاز الفحص', 'Passed') : say('قيد الفحص', 'Pending')}</span>
                              </span>
                            </div>

                            <div className="col-status">
                              <span className={`status-badge-modern ${row.soldOrderId ? 'archived' : row.available ? 'published' : 'draft'}`}>
                                <span className="status-dot-inner" />
                                <span>{row.soldOrderId ? say('مباع', 'Sold') : row.available ? say('متاح للبيع', 'Available') : say('موقوف', 'Withdrawn')}</span>
                              </span>
                            </div>

                            <div className="col-actions">
                              <button type="button" className="button subtle edit-action-btn" onClick={() => start(row)} title={say('تعديل', 'Edit')}>
                                <Edit3 size={15} />
                                <span>{say('تعديل', 'Edit')}</span>
                              </button>
                              {can(user.role, 'catalog.edit') && (
                                <button type="button" className="button subtle" style={{ color: '#ef4444' }} onClick={() => setDeleteConfirm(row)} title={say('حذف', 'Delete')}>
                                  <Trash2 size={15} />
                                </button>
                              )}
                            </div>
                          </>
                        );
                      })()}

                      {module === 'collections' && (() => {
                        const count = list(row.productIds).length;
                        return (
                          <>
                            <div className="col-media">
                              <div className="catalog-icon-box">
                                <Boxes size={20} />
                              </div>
                            </div>

                            <div className="col-info">
                              <button type="button" className="title-link-btn" onClick={() => start(row)}>
                                <strong className="product-title-text">{localized(row.title, lang) || string(row.slug)}</strong>
                              </button>
                              <div className="meta-pills-row">
                                <span className="meta-pill">{count} {say('منتجات', 'products')}</span>
                              </div>
                            </div>

                            <div>
                              <span className="meta-pill brand-pill">{string(row.mode) === 'automatic' ? say('تلقائي بقواعد', 'Automatic') : say('يدوي', 'Manual')}</span>
                            </div>

                            <div>
                              <span className="meta-pill">#{string(row.sort ?? 0)}</span>
                            </div>

                            <div className="col-status">
                              <span className={`status-badge-modern ${row.published ? 'published' : 'draft'}`}>
                                <span className="status-dot-inner" />
                                <span>{row.published ? say('منشور', 'Published') : say('مسودة', 'Draft')}</span>
                              </span>
                            </div>

                            <div className="col-actions">
                              <button type="button" className="button subtle edit-action-btn" onClick={() => start(row)} title={say('تعديل', 'Edit')}>
                                <Edit3 size={15} />
                                <span>{say('تعديل', 'Edit')}</span>
                              </button>
                              {can(user.role, 'catalog.edit') && (
                                <button type="button" className="button subtle" style={{ color: '#ef4444' }} onClick={() => setDeleteConfirm(row)} title={say('حذف', 'Delete')}>
                                  <Trash2 size={15} />
                                </button>
                              )}
                            </div>
                          </>
                        );
                      })()}
                    </article>
                  );
                })}
              </div>
            </div>
          )}

          <Pager page={page} total={filtered.length} setPage={setPage} />
        </>
      ) : (
        /* Executive Card-Structured Form Editor */
        <form className="card content-editor" onSubmit={onSubmit}>
          <div className="toolbar">
            <button type="button" className="button secondary" onClick={() => setEdit(null)}>
              {say('العودة للقائمة', 'Back to list')}
            </button>
            <button className="button primary" disabled={busy}>
              {busy ? say('جارٍ الحفظ…', 'Saving…') : say('حفظ', 'Save')}
            </button>
            {!isAdding && can(user.role, 'catalog.edit') && (
              <button
                type="button"
                className="button secondary"
                style={{ color: '#ef4444', borderColor: '#fca5a5' }}
                onClick={() => setDeleteConfirm(edit)}
                title={say('حذف العنصر', 'Delete item')}
              >
                <Trash2 size={16} />
                <span>{say('حذف', 'Delete')}</span>
              </button>
            )}
            {module === 'packages' && <PackageEnglishToggle variant="button" />}
          </div>

          <div className="toolbar">
            {['general', ...(['variants', 'units'].includes(module) ? ['specs', 'images'] : module === 'types' ? ['fields'] : module === 'packages' ? ['components'] : module === 'collections' ? ['rules'] : [])].map(id => (
              <button
                type="button"
                key={id}
                className={'button ' + (tab === id ? 'primary' : 'secondary')}
                onClick={() => setTab(id)}
              >
                {say(
                  id === 'general' ? 'البيانات الأساسية' :
                  id === 'specs' ? 'المواصفات والفحص' :
                  id === 'images' ? 'الصور' :
                  id === 'fields' ? 'قالب المواصفات' :
                  id === 'components' ? 'مكونات الباقة' : 'قواعد المجموعة',
                  id
                )}
              </button>
            ))}
          </div>

          {tab === 'general' && (
            <>
              {module === 'packages' && (
                <>
                  <div className="form-card-section">
                    <h3><Sparkles size={16} /> {say('بيانات الباقة الأساسية', 'Bundle Details')}</h3>
                    <ValueFields name="packageTitle" value={edit.title} hideEnglish={shouldHideEn} onChange={v => set('title', v)} />
                    <label>
                      {say('الرابط (Slug) — يتولد تلقائياً', 'URL Slug (Auto-generated)')}
                      <div className="slug-input-group">
                        <input
                          dir="ltr"
                          placeholder={say('اتركه فارغاً للتوليد التلقائي...', 'Leave empty for auto-generation...')}
                          value={string(edit.slug)}
                          onChange={e => set('slug', e.target.value)}
                        />
                        <button
                          type="button"
                          className="button secondary auto-slug-btn"
                          title={say('توليد الرابط تلقائياً من الاسم', 'Generate slug from title')}
                          onClick={() => {
                            const candidate = string(object(edit.title).en) || string(object(edit.title).ar);
                            set('slug', autoSlug(candidate));
                          }}
                        >
                          <Wand2 size={14} />
                          <span>{say('توليد الرابط', 'Generate')}</span>
                        </button>
                      </div>
                    </label>
                  </div>

                  <div className="form-card-section">
                    <h3><Boxes size={16} /> {say('التسعير وحالة النشر', 'Pricing & Visibility')}</h3>
                    <div className="fields-grid">
                      {choice('priceMode', ['sum', 'fixed'])}
                      {edit.priceMode === 'fixed' && text('priceUsd', say('سعر الباقة المحدد ($)', 'Fixed bundle price ($)'), 'text', true)}
                    </div>
                    <label className="checkbox-field" style={{ marginTop: '8px' }}>
                      <input type="checkbox" checked={Boolean(edit.published)} onChange={e => set('published', e.target.checked)} />
                      <span><strong>{say('نشر الباقة وإظهارها في المتجر للعملاء', 'Publish bundle to storefront')}</strong></span>
                    </label>
                  </div>

                  <div className="form-card-section">
                    <h3>{say('الوصف والملاحظات', 'Description & Notes')}</h3>
                    <ValueFields name="description" value={edit.description} hideEnglish={shouldHideEn} onChange={v => set('description', v)} />
                  </div>
                </>
              )}

              {module === 'variants' && (
                <>
                  <div className="form-card-section">
                    <h3><Layers size={16} /> {say('ربط المنتج ورمز الـ SKU', 'Product & SKU Linking')}</h3>
                    <div className="fields-grid">
                      {options('productId', ref.products)}
                      {text('sku', say('رمز الـ SKU (يتولد تلقائياً)', 'Variant SKU (Auto-generated)'))}
                      {choice('inventoryMode', ['quantity', 'serialized'])}
                      {choice('condition', ['new', 'A', 'B', 'C'])}
                    </div>
                    <p className="text-muted" style={{ margin: 0, fontSize: '12px' }}>
                      {say('تُدار الكمية من شاشة المخزون، بينما يحدد الخيار السعر النهائي.', 'Manage stock quantities from Inventory. Variant sets the final pricing.')}
                    </p>
                  </div>

                  <div className="form-card-section">
                    <h3>{say('التسعير والضمان', 'Pricing & Warranty')}</h3>
                    <div className="fields-grid">
                      {text('priceUsd', say('سعر الدولار ($)', 'USD Price ($)'), 'text', true)}
                      {text('warrantyMonths', say('مدة الضمان بالأشهر', 'Warranty months'), 'number', true)}
                    </div>
                    <label className="checkbox-field" style={{ marginTop: '8px' }}>
                      <input type="checkbox" checked={Boolean(edit.active)} onChange={e => set('active', e.target.checked)} />
                      <span><strong>{say('خيار نشط ومعروض للبيع', 'Active variant (visible in store)')}</strong></span>
                    </label>
                  </div>
                </>
              )}

              {module === 'categories' && (
                <>
                  <div className="form-card-section">
                    <h3><Folder size={16} /> {say('بيانات الفئة الأساسية', 'Category Details')}</h3>
                    <ValueFields name="title" value={edit.title} onChange={v => set('title', v)} />
                    <label>
                      {say('الرابط (Slug) — يتولد تلقائياً', 'URL Slug (Auto-generated)')}
                      <div className="slug-input-group">
                        <input
                          dir="ltr"
                          placeholder={say('اتركه فارغاً للتوليد التلقائي...', 'Leave empty for auto-generation...')}
                          value={string(edit.slug)}
                          onChange={e => set('slug', e.target.value)}
                        />
                        <button
                          type="button"
                          className="button secondary auto-slug-btn"
                          onClick={() => {
                            const candidate = string(object(edit.title).en) || string(object(edit.title).ar);
                            set('slug', autoSlug(candidate));
                          }}
                        >
                          <Wand2 size={14} />
                          <span>{say('توليد', 'Generate')}</span>
                        </button>
                      </div>
                    </label>
                    <div className="fields-grid">
                      {options('parentSlug', ref.categories.filter(c => c.slug !== edit.slug), 'slug', true)}
                      {options('productTypeId', ref.types, 'id', true)}
                      {options('imageId', media.data.items, 'id', true)}
                      {text('sort', say('ترتيب الظهور', 'Sort order'), 'number')}
                      {choice('status', ['draft', 'published', 'archived'])}
                    </div>
                    {Boolean(edit.imageId) && (
                      <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        {(() => {
                          const asset = media.data.items.find(m => m.id === edit.imageId);
                          return asset?.originalPath ? (
                            <>
                              <img
                                src={string(asset.originalPath).replace('/api/media/', '/api/admin/media/')}
                                alt=""
                                style={{ width: '80px', height: '60px', objectFit: 'cover', borderRadius: '6px', border: '1px solid var(--border)' }}
                              />
                              <button type="button" className="button secondary sm" onClick={() => set('imageId', null)}>
                                {say('إزالة صورة الفئة', 'Remove image')}
                              </button>
                            </>
                          ) : null;
                        })()}
                      </div>
                    )}
                  </div>

                  <div className="form-card-section">
                    <h3>{say('الوصف', 'Description')}</h3>
                    <ValueFields name="description" value={edit.description} onChange={v => set('description', v)} />
                  </div>
                </>
              )}

              {module === 'units' && (
                <>
                  <div className="form-card-section">
                    <h3>{say('بيانات القطعة التسلسلية', 'Serialized Unit Details')}</h3>
                    <div className="fields-grid">
                      {options('variantId', ref.variants.filter(v => v.inventoryMode === 'serialized'))}
                      {text('serialNumber', say('الرقم التسلسلي الداخلي (S/N)', 'Internal serial number'))}
                      {choice('condition', ['new', 'A', 'B', 'C'])}
                      {text('batteryHealthPct', say('صحة البطارية %', 'Battery health %'), 'number', true)}
                    </div>
                  </div>

                  {edit.updatedAt !== undefined && (
                    <div className="form-card-section">
                      <h3>{say('حالة التوفر والبيع', 'Availability & Status')}</h3>
                      <p>
                        <strong>
                          {say(
                            edit.soldOrderId ? 'القطعة مباعة بالطلب: ' + string(edit.soldOrderId) :
                            edit.available ? 'القطعة متاحة ومعروضة للبيع' : 'القطعة موقوفة وغير معروضة',
                            edit.soldOrderId ? 'Unit sold in order: ' + string(edit.soldOrderId) :
                            edit.available ? 'Unit is available for sale' : 'Unit is unavailable'
                          )}
                        </strong>
                      </p>
                      {!edit.soldOrderId && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                          <label>
                            {say('سبب تغيير التوفر (مطلوب للتوثيق)', 'Reason for availability change')}
                            <input
                              minLength={5}
                              maxLength={500}
                              placeholder={say('اكتب سبباً موثقاً لتغيير حالة توفر القطعة...', 'Documented reason...')}
                              value={availabilityReason}
                              onChange={e => setAvailabilityReason(e.target.value)}
                            />
                          </label>
                          <button
                            type="button"
                            className="button secondary"
                            style={{ alignSelf: 'flex-start' }}
                            disabled={availabilityReason.trim().length < 5}
                            onClick={async () => {
                              try {
                                await api('/commerce/units/' + edit.id + '/availability', {
                                  method: 'POST',
                                  body: { available: !edit.available, revision: edit.updatedAt, reason: availabilityReason }
                                });
                                setEdit(null);
                                await client.invalidateQueries({ queryKey: ['commerce-reference'] });
                              } catch (e) {
                                setError(e instanceof ApiError ? e.code : 'failed');
                              }
                            }}
                          >
                            {say(edit.available ? 'إيقاف عرض القطعة' : 'إعادة عرض القطعة', edit.available ? 'Withdraw unit' : 'Restore unit availability')}
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}

              {module === 'collections' && (
                <div className="form-card-section">
                  <h3>{say('بيانات المجموعة', 'Collection Details')}</h3>
                  <ValueFields name="title" value={edit.title} onChange={v => set('title', v)} />
                  <label>
                    <span>{say('الرابط (Slug) — يتولد تلقائياً', 'URL Slug (Auto-generated)')}</span>
                    <input
                      dir="ltr"
                      value={string(edit.slug)}
                      placeholder={say('اتركه فارغاً للتوليد التلقائي...', 'Leave empty for auto-generation...')}
                      onChange={e => set('slug', e.target.value)}
                    />
                  </label>
                  <div className="fields-grid">
                    {choice('mode', ['manual', 'automatic'])}
                    {text('sort', say('الترتيب', 'Sort order'), 'number')}
                  </div>
                  <label className="checkbox-field">
                    <input type="checkbox" checked={Boolean(edit.published)} onChange={e => set('published', e.target.checked)} />
                    <span><strong>{say('نشر المجموعة في المتجر', 'Publish collection to storefront')}</strong></span>
                  </label>
                  <ValueFields name="description" value={edit.description} onChange={v => set('description', v)} />
                </div>
              )}

              {module === 'types' && (
                <div className="form-card-section">
                  <h3>{say('قالب نوع المنتج', 'Product Type Template')}</h3>
                  <ValueFields name="title" value={edit.title} onChange={v => set('title', v)} />
                </div>
              )}
            </>
          )}

          {tab === 'specs' && module === 'variants' && (
            <div className="form-card-section">
              {specEditor('options', fieldsForProduct())}
              {specEditor('specs', fieldsForProduct())}
            </div>
          )}

          {tab === 'specs' && module === 'units' && (
            <div className="form-card-section">
              <ValueFields name="inspection" value={edit.inspection} onChange={v => set('inspection', v)} />
              <ValueFields name="defects" value={edit.defects} onChange={v => set('defects', v)} />
              <button
                type="button"
                className="button secondary"
                style={{ alignSelf: 'flex-start' }}
                onClick={() => set('defects', [...edit.defects as unknown[], { ar: '', en: '' }])}
              >
                {say('إضافة ملاحظة عيب', 'Add defect note')}
              </button>
            </div>
          )}

          {tab === 'images' && (
            <div className="form-card-section">
              {images}
            </div>
          )}

          {tab === 'fields' && module === 'types' && (
            <div className="form-card-section">
              <h3>{say('حقول المواصفات الفنية', 'Specification Fields')}</h3>
              {list(edit.fields).map((f, i) => (
                <div className="card commerce-field" key={i}>
                  <ValueFields value={f} onChange={v => set('fields', list(edit.fields).map((old, j) => j === i ? v : old))} />
                  <label>
                    {say('نوع القيمة', 'Value type')}
                    <select
                      value={string(f.valueType)}
                      onChange={e => set('fields', list(edit.fields).map((old, j) => j === i ? { ...old, valueType: e.target.value } : old))}
                    >
                      {['number', 'text', 'boolean', 'single', 'multi'].map(v => <option key={v}>{v}</option>)}
                    </select>
                  </label>
                  <button
                    type="button"
                    className="button secondary sm danger-tone"
                    onClick={() => set('fields', list(edit.fields).filter((_, j) => i !== j))}
                  >
                    {say('إزالة الحقل', 'Remove')}
                  </button>
                </div>
              ))}
              <button
                type="button"
                className="button secondary"
                style={{ alignSelf: 'flex-start' }}
                onClick={() => set('fields', [...list(edit.fields), { key: '', title: { ar: '', en: '' }, valueType: 'text', unit: null, options: [], required: false, filterable: false, card: false, sort: list(edit.fields).length }])}
              >
                <Plus size={15} />
                <span>{say('إضافة مواصفة جديدة', 'Add specification')}</span>
              </button>
            </div>
          )}

          {tab === 'rules' && module === 'collections' && (
            <div className="form-card-section">
              {edit.mode === 'manual' ? (
                multi('productIds', ref.products)
              ) : (
                <RuleEditor rules={object(edit.rules)} reference={ref} onChange={rules => set('rules', rules)} />
              )}
            </div>
          )}

          {tab === 'components' && module === 'packages' && (
            <div className="form-card-section">
              <h3><Boxes size={18} /> {say('مكونات الباقة المشمولة', 'Included bundle components')}</h3>
              <p className="text-muted" style={{ margin: 0, fontSize: '12px' }}>
                {say('حدد الخيارات (SKU) والكمية المشمولة في هذه الباقة.', 'Select the SKUs and quantities included in this bundle.')}
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '10px' }}>
                {list(edit.items).map((item, i) => {
                  const vObj = ref.variants.find(v => v.id === item.variantId);                  return (
                    <div className="component-item-card" key={i}>
                      <select
                        aria-label="SKU"
                        value={string(item.variantId)}
                        onChange={e => set('items', list(edit.items).map((r, j) => i === j ? { ...r, variantId: e.target.value } : r))}
                      >
                        {ref.variants.map(v => {
                          const p = ref.products.find(prod => prod.id === v.productId);
                          const titleStr = p ? localized(p.title, lang) : '';
                          return (
                            <option key={string(v.id)} value={string(v.id)}>
                              {string(v.sku)} {titleStr ? `(${titleStr})` : ''} {v.priceUsd ? `— $${v.priceUsd}` : ''}
                            </option>
                          );
                        })}
                      </select>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '12px', fontWeight: 600 }}>{say('الكمية:', 'Qty:')}</span>
                        <input
                          aria-label={say('الكمية', 'Quantity')}
                          type="number"
                          min="1"
                          max="100"
                          value={string(item.quantity)}
                          onChange={e => set('items', list(edit.items).map((r, j) => i === j ? { ...r, quantity: Number(e.target.value) } : r))}
                        />
                      </div>
                      {Boolean(vObj?.priceUsd) && (
                        <span className="price-usd-val" style={{ marginInline: '8px' }}>
                          ${Number(vObj?.priceUsd) * (Number(item.quantity) || 1)}
                        </span>
                      )}
                      <button
                        type="button"
                        className="button secondary sm danger-tone"
                        onClick={() => set('items', list(edit.items).filter((_, j) => i !== j))}
                      >
                        {say('إزالة', 'Remove')}
                      </button>
                    </div>
                  );
                })}
              </div>
              <button
                type="button"
                className="button secondary"
                style={{ alignSelf: 'flex-start', marginTop: '12px' }}
                onClick={() => set('items', [...list(edit.items), { variantId: ref.variants[0]?.id, quantity: 1 }])}
              >
                <Plus size={15} />
                <span>{say('إضافة مكوّن جديد للباقة', 'Add bundle component')}</span>
              </button>
            </div>
          )}
        </form>
      )}

      {deleteConfirm && (
        <Modal
          open={Boolean(deleteConfirm)}
          onOpenChange={open => !open && setDeleteConfirm(null)}
          title={say('تأكيد الحذف', 'Confirm Delete')}
          description={say(
            'هل أنت متأكد من رغبتك في حذف هذا العنصر نهائياً؟',
            'Are you sure you want to delete this item permanently?'
          )}
        >
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center', marginBottom: '20px' }}>
            <div style={{ width: 44, height: 44, borderRadius: 10, background: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#dc2626', flexShrink: 0 }}>
              <AlertTriangle size={24} />
            </div>
            <div>
              <p style={{ margin: 0, fontWeight: 600 }}>
                {string(localized(deleteConfirm.title, lang) || deleteConfirm.sku || deleteConfirm.serialNumber || deleteConfirm.slug || deleteConfirm.id)}
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
            <button type="button" className="button secondary" onClick={() => setDeleteConfirm(null)} disabled={busy}>
              {say('إلغاء', 'Cancel')}
            </button>
            <button
              type="button"
              className="button danger"
              disabled={busy}
              onClick={() => handleDelete(deleteConfirm)}
            >
              {busy ? say('جارٍ الحذف…', 'Deleting…') : say('تأكيد الحذف', 'Confirm Delete')}
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
export function SpecInputs({value,fields,onChange}:{value:Row;fields:SpecFieldInput[];onChange:(v:Row)=>void}){
  const {lang}=useI18n(),[key,setKey]=useState(''),[type,setType]=useState('text');
  return <><div className="fields-grid">{Object.keys(value).map(key=>{const f=fields.find(f=>f.key===key),type=f?.valueType??(typeof value[key]==='number'?'number':typeof value[key]==='boolean'?'boolean':'text');return <label key={key}>{f?.title[lang]??key}{(value[key]!==null&&typeof value[key]==='object'&&type!=='multi')?<ValueFields name={key} value={value[key]} onChange={v=>onChange({...value,[key]:v})}/>:type==='boolean'?<input type="checkbox" checked={Boolean(value[key])} onChange={e=>onChange({...value,[key]:e.target.checked})}/>:type==='single'?<select value={string(value[key])} onChange={e=>onChange({...value,[key]:e.target.value})}>{f?.options.map(v=><option key={v}>{v}</option>)}</select>:type==='multi'?<div>{f?.options.map(v=><label key={v}><input type="checkbox" checked={Array.isArray(value[key])&&(value[key] as string[]).includes(v)} onChange={e=>{const old=Array.isArray(value[key])?value[key] as string[]:[];onChange({...value,[key]:e.target.checked?[...old,v]:old.filter(x=>x!==v)});}}/>{v}</label>)}</div>:<input type={type==='number'?'number':'text'} value={string(value[key])} onChange={e=>onChange({...value,[key]:type==='number'&&e.target.value!==''?Number(e.target.value):e.target.value})}/>}<button type="button" onClick={()=>{const next={...value};delete next[key];onChange(next);}}>{lang==='ar'?'إزالة':'Remove'}</button></label>;})}</div><select value="" onChange={e=>{const f=fields.find(f=>f.key===e.target.value);if(f)onChange({...value,[f.key]:f.valueType==='number'?'':f.valueType==='boolean'?false:f.valueType==='multi'?[]:f.options[0]??''});}}><option value="">{lang==='ar'?'أضف من القالب…':'Add template field…'}</option>{fields.filter(f=>!(f.key in value)).map(f=><option value={f.key} key={f.key}>{f.title[lang]}</option>)}</select><div className="toolbar"><input aria-label="Specification key" placeholder={lang==='ar'?'اسم خيار إضافي مثل color':'Extra option key, e.g. color'} value={key} onChange={e=>setKey(e.target.value)}/><select value={type} onChange={e=>setType(e.target.value)}><option>text</option><option>number</option><option>boolean</option></select><button type="button" className="button secondary" disabled={!key} onClick={()=>{onChange({...value,[key]:type==='number'?'':type==='boolean'?false:''});setKey('');}}>{lang==='ar'?'إضافة':'Add'}</button></div></>;
}
function RuleEditor({rules,reference,onChange}:{rules:Row;reference:Reference;onChange:(r:Row)=>void}){
  const {lang}=useI18n();return <><p>{lang==='ar'?'AND بين الشروط، وOR داخل كل شرط.':'AND across conditions; OR within each condition.'}</p>{[['categories',reference.categories,'slug'],['brands',reference.brands,'id'],['conditions',['new','A','B','C'].map(id=>({id})),'id']].map(([key,values,idKey])=><fieldset key={key as string}><legend>{key as string}</legend><div className="commerce-options">{(values as Row[]).map(v=>{const value=string(v[idKey as string]),selected=Array.isArray(rules[key as string])?rules[key as string] as string[]:[];return <label key={value}><input type="checkbox" checked={selected.includes(value)} onChange={e=>onChange({...rules,[key as string]:e.target.checked?[...selected,value]:selected.filter(x=>x!==value)})}/>{localized(v.title,lang)||string(v.name??value)}</label>;})}</div></fieldset>)}<label>{lang==='ar'?'التوفر':'Availability'}<select value={rules.available===null?'':String(rules.available)} onChange={e=>onChange({...rules,available:e.target.value===''?null:e.target.value==='true'})}><option value="">All</option><option value="true">Available</option><option value="false">Unavailable</option></select></label>{['min','max'].map(key=><label key={key}>{key} $<input value={string(rules[key])} onChange={e=>onChange({...rules,[key]:e.target.value||null})}/></label>)}</>;
}
function Pager({page,total,setPage}:{page:number;total:number;setPage:(page:number)=>void}){const {lang}=useI18n();return <div className="toolbar"><button className="button secondary" disabled={page<=1} onClick={()=>setPage(page-1)}>{lang==='ar'?'السابق':'Previous'}</button><span>{page} / {Math.max(1,Math.ceil(total/24))}</span><button className="button secondary" disabled={page*24>=total} onClick={()=>setPage(page+1)}>{lang==='ar'?'التالي':'Next'}</button></div>;}
export { InventoryManager as Inventory } from './InventoryManager';
export { OrdersManager as OrdersAdmin } from './OrdersManager';
export function CustomersAdmin(){
  const {lang}=useI18n(),[q,setQ]=useState(''),[page,setPage]=useState(1),[error,setError]=useState(''),[selected,setSelected]=useState<Row|null>(null),[note,setNote]=useState(''),[link,setLink]=useState('');
  const query=useQuery({queryKey:['customers',q,page],queryFn:()=>api<{items:Row[];total:number}>('/commerce/customers?q='+encodeURIComponent(q)+'&page='+page)});
  return <><div className="page-heading"><h1>{lang==='ar'?'حسابات العملاء':'Customer accounts'}</h1></div><ErrorBox code={error}/><input aria-label="Search customer" value={q} onChange={e=>{setQ(e.target.value);setPage(1);}}/>{query.isPending?<Loading/>:query.data?<><div className="commerce-table">{query.data.items.map(c=><div className="card product-row" key={string(c.id)}><span><strong>{string(c.name)}</strong><small dir="ltr">{string(c.phone)}</small><small>{lang==='ar'?'الهاتف غير متحقق':'Phone unverified'} · {string(object(c._count).orders)}</small></span><button className="button secondary" onClick={()=>{setSelected(c);setLink('');setNote('');}}>{lang==='ar'?'استعادة بعد تحقق بشري':'Recovery after identity check'}</button></div>)}</div><Pager page={page} total={query.data.total} setPage={setPage}/></>:<ErrorBox code="failed"/>}{selected&&<form className="card content-editor" onSubmit={async e=>{e.preventDefault();setError('');try{const result=await api<{token:string}>('/commerce/customers/'+selected.id+'/recovery',{method:'POST',body:{verificationNote:note}});setLink(location.origin+'/'+lang+'/account?token='+result.token);}catch(e){setError(e instanceof ApiError?e.code:'failed');}}}><h2>{string(selected.name)}</h2><label>{lang==='ar'?'كيف تم التحقق من هوية العميل؟':'How was the customer identity verified?'}<textarea required minLength={10} maxLength={500} value={note} onChange={e=>setNote(e.target.value)}/></label><button className="button primary">{lang==='ar'?'إنشاء رابط صالح 30 دقيقة':'Create a 30-minute link'}</button>{link&&<label>{lang==='ar'?'رابط للاستخدام مرة واحدة — انسخه للعميل':'One-use recovery link — copy to customer'}<input readOnly dir="ltr" value={link}/></label>}</form>}</>;
}
export { PricingAdmin } from './PricingManager';
export { ExcelImportExport, ExcelImportExport as CsvAdmin } from './ExcelImportExport';
export function parseCsv(text:string):string[][]{const rows:string[][]=[];let row:string[]=[],cell='',quoted=false;for(let i=0;i<text.length;i++){const c=text[i];if(c==='"'){if(quoted&&text[i+1]==='"'){cell+='"';i++;}else quoted=!quoted;}else if(c===','&&!quoted){row.push(cell);cell='';}else if((c==='\n'||c==='\r')&&!quoted){if(c==='\r'&&text[i+1]==='\n')i++;row.push(cell);rows.push(row);row=[];cell='';}else cell+=c;}if(quoted)throw new Error('Invalid CSV quotes');if(cell||row.length){row.push(cell);rows.push(row);}return rows;}
export function CommerceOverview(){const {lang}=useI18n();const cards=[['variants','خيارات المنتجات','Product variants'],['categories','الفئات','Categories'],['brands','العلامات','Brands'],['types','قوالب المواصفات','Specification templates'],['collections','المجموعات','Collections'],['packages','الباقات','Bundles'],['inventory','المخزون','Inventory'],['orders','الطلبات','Orders'],['customers','العملاء','Customers'],['pricing','التسعير','Pricing'],['csv','CSV','CSV']];return <section className="overview-grid">{cards.map(([path,ar,en])=><Link className="card action-card" key={path} to={'/'+path}><h2>{lang==='ar'?ar:en}</h2></Link>)}</section>;}
export function CommerceContainer({children}:{children:ReactNode}){return <div className="commerce-admin">{children}</div>;}





