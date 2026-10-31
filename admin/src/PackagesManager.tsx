import React, { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Sparkles,
  Boxes,
  Search,
  Plus,
  Edit3,
  Trash2,
  Check,
  X,
  ExternalLink,
  Copy,
  Wand2,
  RotateCcw,
  PackageSearch,
  AlertTriangle,
  CheckCircle2,
  DollarSign,
  Percent,
  Info,
  Link2,
} from 'lucide-react';
import { can, PackageEdit } from '@aljeel/shared';
import { api, ApiError } from './api';
import { useI18n } from './i18n';
import { useSession } from './App';
import { ErrorBox, Loading, Modal, EnglishFieldsToggle } from './components';
import { ValueFields } from './ValueFields';
import './commerce.css';
import './packages-manager.css';

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

type PackageItemEntry = {
  variantId: string;
  quantity: number;
};

type PackageFormState = {
  id: string;
  slug: string;
  title: { ar: string; en: string };
  description: { ar: string; en: string };
  priceMode: 'sum' | 'fixed';
  priceUsd: string | null;
  items: PackageItemEntry[];
  published: boolean;
  revision?: string;
};

const object = (v: unknown): Row => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Row) : {});
const list = (v: unknown): Row[] => (Array.isArray(v) ? v.map(object) : []);
const string = (v: unknown) => (v == null ? '' : String(v));
const localized = (v: unknown, lang: string) => string(object(v)[lang]);

function autoSlug(text: string): string {
  const clean = text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
  return clean || 'bundle-' + Math.random().toString(36).substring(2, 8);
}

export function PackagesManager() {
  const { lang, showEnglishFields } = useI18n();
  const ar = lang === 'ar';
  const { user } = useSession();
  const canEdit = can(user.role, 'catalog.edit');
  const client = useQueryClient();
  const say = (a: string, e: string) => (ar ? a : e);

  // Queries
  const query = useQuery({
    queryKey: ['commerce-reference'],
    queryFn: () => api<Reference>('/commerce/reference'),
    staleTime: 30_000,
    gcTime: 5 * 60_000,
  });

  const pricingQuery = useQuery({
    queryKey: ['commerce-pricing'],
    queryFn: () => api<{ usdToYer?: number | string }>('/commerce/pricing'),
    staleTime: 60_000,
  });

  const exchangeRate = Number(pricingQuery.data?.usdToYer) || 530;

  // View States
  const [q, setQ] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'published' | 'draft' | 'fixed' | 'sum'>('all');
  const [edit, setEdit] = useState<PackageFormState | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [activeTab, setActiveTab] = useState<'general' | 'components' | 'pricing'>('general');
  const [error, setError] = useState('');
  const [details, setDetails] = useState('');
  const [busy, setBusy] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<Row | null>(null);
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);

  // Variant selector state inside modal
  const [selectedVariantToAdd, setSelectedVariantToAdd] = useState<string>('');

  if (query.isPending) return <Loading />;
  if (!query.data) return <ErrorBox code="disconnected" />;

  const ref = query.data;
  const packagesList = ref.packages || [];

  // Helper to resolve variant product and images
  const getVariantDetails = (variantId: string) => {
    const variant = ref.variants.find(v => v.id === variantId);
    if (!variant) return null;
    const product = ref.products.find(p => p.id === variant.productId);
    const firstImg =
      Array.isArray(variant.images) && variant.images.length > 0
        ? String(variant.images[0])
        : Array.isArray(product?.images) && product?.images[0]
        ? String((product.images[0] as any)?.media?.originalPath || '')
        : '';
    const safeImg = firstImg ? firstImg.replace('/api/media/', '/api/admin/media/') : '/logo.webp';
    const priceUsd = variant.priceUsd ? Number(variant.priceUsd) : null;
    return {
      variant,
      product,
      sku: string(variant.sku),
      title: localized(product?.title, lang) || string(variant.sku),
      image: safeImg,
      priceUsd,
      available: Boolean(variant.active && variant.units && (variant.units as any[]).some(u => u.available)),
    };
  };

  // Filtered packages
  const filtered = packagesList.filter(pkg => {
    if (q.trim()) {
      const qLower = q.toLowerCase().trim();
      const titleAr = localized(pkg.title, 'ar').toLowerCase();
      const titleEn = localized(pkg.title, 'en').toLowerCase();
      const slug = string(pkg.slug).toLowerCase();
      const desc = localized(pkg.description, lang).toLowerCase();
      const matchComponents = list(pkg.items).some(item => {
        const v = getVariantDetails(string(item.variantId));
        return v && (v.sku.toLowerCase().includes(qLower) || v.title.toLowerCase().includes(qLower));
      });
      if (!titleAr.includes(qLower) && !titleEn.includes(qLower) && !slug.includes(qLower) && !desc.includes(qLower) && !matchComponents) {
        return false;
      }
    }

    if (statusFilter === 'published' && !pkg.published) return false;
    if (statusFilter === 'draft' && pkg.published) return false;
    if (statusFilter === 'fixed' && pkg.priceMode !== 'fixed') return false;
    if (statusFilter === 'sum' && pkg.priceMode !== 'sum') return false;

    return true;
  });

  // KPI Metrics
  const stats = {
    total: packagesList.length,
    published: packagesList.filter(p => p.published).length,
    draft: packagesList.filter(p => !p.published).length,
    fixed: packagesList.filter(p => p.priceMode === 'fixed').length,
  };

  // Start Create
  const startCreate = () => {
    const defaultVariant = ref.variants[0]?.id ? String(ref.variants[0].id) : '';
    setEdit({
      id: crypto.randomUUID(),
      slug: '',
      title: { ar: '', en: '' },
      description: { ar: '', en: '' },
      priceMode: 'sum',
      priceUsd: null,
      items: defaultVariant ? [{ variantId: defaultVariant, quantity: 1 }] : [],
      published: false,
    });
    setIsAdding(true);
    setActiveTab('general');
    setError('');
    setDetails('');
  };

  // Start Edit
  const startEdit = (row: Row) => {
    const items = list(row.items).map(item => ({
      variantId: string(item.variantId),
      quantity: Number(item.quantity) || 1,
    }));
    setEdit({
      id: string(row.id),
      slug: string(row.slug),
      title: { ar: localized(row.title, 'ar'), en: localized(row.title, 'en') },
      description: { ar: localized(row.description, 'ar'), en: localized(row.description, 'en') },
      priceMode: (row.priceMode as 'sum' | 'fixed') || 'sum',
      priceUsd: row.priceUsd ? String(row.priceUsd) : null,
      items,
      published: Boolean(row.published),
      revision: typeof row.updatedAt === 'string' ? row.updatedAt : undefined,
    });
    setIsAdding(false);
    setActiveTab('general');
    setError('');
    setDetails('');
  };

  // Duplicate Package
  const handleDuplicate = (row: Row) => {
    const items = list(row.items).map(item => ({
      variantId: string(item.variantId),
      quantity: Number(item.quantity) || 1,
    }));
    const originalAr = localized(row.title, 'ar');
    const originalEn = localized(row.title, 'en');
    setEdit({
      id: crypto.randomUUID(),
      slug: autoSlug(string(row.slug) + '-copy'),
      title: {
        ar: originalAr ? `نسخة من ${originalAr}` : 'باقة جديدة',
        en: originalEn ? `Copy of ${originalEn}` : 'New Bundle',
      },
      description: {
        ar: localized(row.description, 'ar'),
        en: localized(row.description, 'en'),
      },
      priceMode: (row.priceMode as 'sum' | 'fixed') || 'sum',
      priceUsd: row.priceUsd ? String(row.priceUsd) : null,
      items,
      published: false,
    });
    setIsAdding(true);
    setActiveTab('general');
    setError('');
    setDetails('');
  };

  // Quick Toggle Published directly from card
  const handleQuickTogglePublish = async (pkg: Row) => {
    if (!canEdit) return;
    try {
      const items = list(pkg.items).map(it => ({
        variantId: string(it.variantId),
        quantity: Number(it.quantity) || 1,
      }));
      const payload = {
        id: string(pkg.id),
        slug: string(pkg.slug),
        title: { ar: localized(pkg.title, 'ar'), en: localized(pkg.title, 'en') || localized(pkg.title, 'ar') },
        description: { ar: localized(pkg.description, 'ar') || 'باقة', en: localized(pkg.description, 'en') || 'Bundle' },
        priceMode: (pkg.priceMode as 'sum' | 'fixed') || 'sum',
        priceUsd: pkg.priceMode === 'fixed' && pkg.priceUsd ? Number(pkg.priceUsd).toFixed(2) : null,
        items,
        published: !pkg.published,
        revision: typeof pkg.updatedAt === 'string' ? pkg.updatedAt : undefined,
      };
      await api('/commerce/packages', { method: 'POST', body: payload });
      await client.invalidateQueries({ queryKey: ['commerce-reference'] });
    } catch (e) {
      setError(e instanceof ApiError ? e.code : 'failed');
    }
  };

  // Delete
  const handleDelete = async (target: Row) => {
    const id = string(target.id);
    if (!id) return;
    setBusy(true);
    setError('');
    try {
      await api('/commerce/packages/' + encodeURIComponent(id), { method: 'DELETE' });
      await client.invalidateQueries({ queryKey: ['commerce-reference'] });
      setDeleteConfirm(null);
      if (edit && edit.id === id) setEdit(null);
    } catch (e) {
      setError(e instanceof ApiError ? e.code : 'failed');
    } finally {
      setBusy(false);
    }
  };

  // Copy storefront link
  const handleCopyLink = async (slug: string) => {
    const url = `${window.location.origin}/${lang}/packages?bundle=${slug}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedSlug(slug);
      setTimeout(() => setCopiedSlug(null), 2000);
    } catch {
      /* ignore */
    }
  };

  // Components manipulation inside form
  const handleAddComponent = () => {
    if (!edit || !selectedVariantToAdd) return;
    // Prevent duplicate variants
    if (edit.items.some(i => i.variantId === selectedVariantToAdd)) return;

    setEdit({
      ...edit,
      items: [...edit.items, { variantId: selectedVariantToAdd, quantity: 1 }],
    });
    setSelectedVariantToAdd('');
  };

  const handleRemoveComponent = (index: number) => {
    if (!edit) return;
    setEdit({
      ...edit,
      items: edit.items.filter((_, i) => i !== index),
    });
  };

  const handleQuantityChange = (index: number, nextQty: number) => {
    if (!edit) return;
    const qty = Math.max(1, Math.min(100, nextQty));
    setEdit({
      ...edit,
      items: edit.items.map((item, i) => (i === index ? { ...item, quantity: qty } : item)),
    });
  };

  // Financial Calculations for current edit form
  const editCalculations = useMemo(() => {
    if (!edit) return { sum: 0, count: 0, fixed: 0, savings: 0, savingsPct: 0 };
    let sum = 0;
    let count = 0;
    for (const it of edit.items) {
      const v = ref.variants.find(v => v.id === it.variantId);
      const price = v?.priceUsd ? Number(v.priceUsd) : 0;
      sum += price * it.quantity;
      count += it.quantity;
    }
    const fixed = edit.priceMode === 'fixed' && edit.priceUsd ? Number(edit.priceUsd) : sum;
    const savings = sum > 0 && fixed < sum ? sum - fixed : 0;
    const savingsPct = sum > 0 && savings > 0 ? Math.round((savings / sum) * 100) : 0;
    return { sum, count, fixed, savings, savingsPct };
  }, [edit, ref.variants]);

  // Form Submit Handler
  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setDetails('');
    if (!edit) return;

    // Validation checks
    if (!edit.title.ar.trim()) {
      setError(say('يرجى إدخال اسم الباقة بالعربية', 'Please provide an Arabic bundle title'));
      setActiveTab('general');
      return;
    }

    if (edit.items.length === 0) {
      setError(say('يجب إضافة مكوّن واحد على الأقل للباقة', 'At least one component must be added to the bundle'));
      setActiveTab('components');
      return;
    }

    if (edit.priceMode === 'fixed') {
      const numPrice = Number(edit.priceUsd);
      if (isNaN(numPrice) || numPrice <= 0) {
        setError(say('يرجى تحديد سعر بيع صحيح للباقة بالدولار', 'Please enter a valid USD selling price'));
        setActiveTab('pricing');
        return;
      }
    }

    // Auto-generate slug if blank
    const cleanSlug = edit.slug.trim() ? autoSlug(edit.slug) : autoSlug(edit.title.en || edit.title.ar);

    const payload = {
      id: edit.id,
      slug: cleanSlug,
      title: {
        ar: edit.title.ar.trim(),
        en: edit.title.en.trim() || edit.title.ar.trim(),
      },
      description: {
        ar: edit.description.ar.trim() || edit.title.ar.trim(),
        en: edit.description.en.trim() || edit.title.en.trim() || edit.title.ar.trim(),
      },
      priceMode: edit.priceMode,
      priceUsd: edit.priceMode === 'fixed' && edit.priceUsd ? Number(edit.priceUsd).toFixed(2) : null,
      items: edit.items.map(it => ({ variantId: it.variantId, quantity: it.quantity })),
      published: edit.published,
      ...(edit.revision ? { revision: edit.revision } : {}),
    };

    const parsed = PackageEdit.safeParse(payload);
    if (!parsed.success) {
      setDetails(parsed.error.issues.map(i => i.path.join('.') + ': ' + i.message).join(' · '));
      return;
    }

    setBusy(true);
    try {
      await api('/commerce/packages', { method: 'POST', body: parsed.data });
      await client.invalidateQueries({ queryKey: ['commerce-reference'] });
      setEdit(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.code : 'failed');
    } finally {
      setBusy(false);
    }
  };

  // Variants available to add (excluding already chosen ones)
  const availableVariantsToAdd = useMemo(() => {
    if (!edit) return [];
    const chosenIds = new Set(edit.items.map(i => i.variantId));
    return ref.variants.filter(v => !chosenIds.has(String(v.id)));
  }, [edit, ref.variants]);

  return (
    <div className="packages-manager-view">
      {/* ── Top Header ── */}
      <header className="pm-header">
        <div className="pm-header-info">
          <div className="pm-header-title-row">
            <h1>
              <Sparkles size={24} style={{ color: '#7c3aed' }} />
              <span>{say('إدارة وإنشاء الباقات والتجهيزات', 'Bundles & Packages Manager')}</span>
            </h1>
            <span className="pm-count-badge">
              {stats.total} {say('باقة', 'bundles')}
            </span>
          </div>
          <p className="pm-header-sub">
            {say(
              'تجهيز وإدارة عروض الحزم المتكاملة، دمج أجهزة اللابتوب والشاشات ووحدات الطاقة بأسعار مجمعة موفرة أو مجموع تلقائي للقطع.',
              'Create and manage bundled tech packages, combining laptops, monitors, and UPS backups with bundle discounts.'
            )}
          </p>
        </div>

        <div className="pm-header-actions">
          <EnglishFieldsToggle variant="button" />
          <a
            href={`/${lang}/packages`}
            target="_blank"
            rel="noopener noreferrer"
            className="button secondary sm"
            title={say('معاينة صفحة الباقات بالمتجر', 'Preview packages in storefront')}
          >
            <ExternalLink size={15} />
            <span>{say('معاينة المتجر', 'Storefront')}</span>
          </a>
          {canEdit && (
            <button type="button" className="button primary sm" onClick={startCreate}>
              <Plus size={16} />
              <span>{say('إنشاء باقة جديدة', 'New Bundle')}</span>
            </button>
          )}
        </div>
      </header>

      {/* ── KPI Stats Cards ── */}
      <section className="pm-kpi-grid">
        <div className="pm-kpi-card">
          <div className="pm-kpi-icon primary">
            <Boxes size={22} />
          </div>
          <div className="pm-kpi-data">
            <span className="pm-kpi-val">{stats.total}</span>
            <span className="pm-kpi-lbl">{say('إجمالي الباقات', 'Total Bundles')}</span>
          </div>
        </div>

        <div className="pm-kpi-card">
          <div className="pm-kpi-icon green">
            <CheckCircle2 size={22} />
          </div>
          <div className="pm-kpi-data">
            <span className="pm-kpi-val">{stats.published}</span>
            <span className="pm-kpi-lbl">{say('باقات منشورة بالمتجر', 'Published in Store')}</span>
          </div>
        </div>

        <div className="pm-kpi-card">
          <div className="pm-kpi-icon amber">
            <Edit3 size={22} />
          </div>
          <div className="pm-kpi-data">
            <span className="pm-kpi-val">{stats.draft}</span>
            <span className="pm-kpi-lbl">{say('مسودات قيد التجهيز', 'Draft Bundles')}</span>
          </div>
        </div>

        <div className="pm-kpi-card">
          <div className="pm-kpi-icon blue">
            <DollarSign size={22} />
          </div>
          <div className="pm-kpi-data">
            <span className="pm-kpi-val">{stats.fixed}</span>
            <span className="pm-kpi-lbl">{say('بسعر مخفض مخصص', 'Fixed Promo Price')}</span>
          </div>
        </div>
      </section>

      {/* ── Control / Filter Bar ── */}
      <section className="pm-control-bar">
        <div className="pm-search-input-wrap">
          <Search size={16} className="search-icon" />
          <input
            type="text"
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder={say('ابحث باسم الباقة، الرابط، أو المكونات...', 'Search by bundle title, slug, or component...')}
          />
          {q && (
            <button type="button" className="pm-clear-btn" onClick={() => setQ('')} aria-label="Clear">
              <X size={14} />
            </button>
          )}
        </div>

        <div className="pm-filter-pills">
          {[
            { id: 'all', label: say('الكل', 'All'), count: stats.total },
            { id: 'published', label: say('منشورة', 'Published'), count: stats.published },
            { id: 'draft', label: say('مسودات', 'Drafts'), count: stats.draft },
            { id: 'fixed', label: say('سعر محدد', 'Fixed Price'), count: stats.fixed },
            { id: 'sum', label: say('مجموع تلقائي', 'Auto Sum'), count: stats.total - stats.fixed },
          ].map(f => (
            <button
              key={f.id}
              type="button"
              className={`pm-filter-pill ${statusFilter === f.id ? 'active' : ''}`}
              onClick={() => setStatusFilter(f.id as any)}
            >
              <span>{f.label}</span>
              <span className="count">({f.count})</span>
            </button>
          ))}

          {(q || statusFilter !== 'all') && (
            <button
              type="button"
              className="button secondary sm"
              onClick={() => {
                setQ('');
                setStatusFilter('all');
              }}
              title={say('إعادة ضبط الفلاتر', 'Reset filters')}
            >
              <RotateCcw size={13} />
              <span>{say('إعادة ضبط', 'Reset')}</span>
            </button>
          )}
        </div>
      </section>

      {/* Error & Notifications */}
      <ErrorBox code={error} />
      {details && <p role="alert" className="commerce-error">{details}</p>}

      {/* ── Packages Grid ── */}
      {filtered.length === 0 ? (
        <div className="empty-catalog-state">
          <div className="empty-icon-wrap">
            <PackageSearch size={38} />
          </div>
          <h3>{say('لا توجد باقات مطابقة', 'No packages found')}</h3>
          <p>{say('لم نتمكن من العثور على أي باقة تطابق معايير البحث أو الفلتر المحددة.', 'No bundles match your current filters.')}</p>
          {canEdit && (
            <button type="button" className="button primary sm" onClick={startCreate}>
              <Plus size={15} />
              <span>{say('إنشاء أول باقة الآن', 'Create first bundle')}</span>
            </button>
          )}
        </div>
      ) : (
        <div className="pm-grid">
          {filtered.map(pkg => {
            const titleAr = localized(pkg.title, 'ar');
            const desc = localized(pkg.description, lang);
            const slug = string(pkg.slug);
            const items = list(pkg.items);
            const isPublished = Boolean(pkg.published);
            const isFixed = pkg.priceMode === 'fixed';

            // Calculate card finance
            let compSum = 0;
            let allAvailable = true;
            for (const it of items) {
              const details = getVariantDetails(string(it.variantId));
              if (details) {
                if (details.priceUsd) compSum += details.priceUsd * (Number(it.quantity) || 1);
                if (!details.available) allAvailable = false;
              }
            }

            const sellingPrice = isFixed && pkg.priceUsd ? Number(pkg.priceUsd) : compSum;
            const savings = compSum > 0 && sellingPrice < compSum ? compSum - sellingPrice : 0;
            const savingsPct = compSum > 0 && savings > 0 ? Math.round((savings / compSum) * 100) : 0;
            const yerPrice = Math.round(sellingPrice * exchangeRate);

            return (
              <article key={string(pkg.id)} className="pm-card">
                <div>
                  {/* Top Badges & Switch */}
                  <div className="pm-card-top">
                    <div className="pm-card-badges">
                      <span className={`pm-status-badge ${isPublished ? 'pub' : 'draft'}`}>
                        <span className={`status-dot ${isPublished ? 'dot-green' : 'dot-gray'}`} />
                        <span>{isPublished ? say('منشور بالمتجر', 'Published') : say('مسودة', 'Draft')}</span>
                      </span>

                      <span className="pm-mode-badge">
                        <span>{isFixed ? say('سعر محدد', 'Fixed') : say('مجموع تلقائي', 'Sum')}</span>
                      </span>

                      {savingsPct > 0 && (
                        <span className="pm-savings-pill">
                          <Percent size={10} />
                          <span>{say(`وفر ${savingsPct}%`, `Save ${savingsPct}%`)}</span>
                        </span>
                      )}
                    </div>

                    {canEdit && (
                      <button
                        type="button"
                        onClick={() => handleQuickTogglePublish(pkg)}
                        className={`pm-icon-btn ${isPublished ? 'active' : ''}`}
                        title={isPublished ? say('إلغاء النشر (تحويل لمسودة)', 'Unpublish') : say('نشر فوري في المتجر', 'Publish')}
                      >
                        <CheckCircle2 size={16} color={isPublished ? '#16a34a' : 'var(--muted)'} />
                      </button>
                    )}
                  </div>

                  {/* Title & Slug */}
                  <div className="pm-card-body" style={{ marginTop: '12px' }}>
                    <h2 className="pm-card-title">{localized(pkg.title, lang) || titleAr || slug}</h2>

                    <div className="pm-card-slug">
                      <Link2 size={12} />
                      <span>{slug}</span>
                      <button
                        type="button"
                        onClick={() => handleCopyLink(slug)}
                        className="pm-icon-btn"
                        style={{ width: 22, height: 22 }}
                        title={say('نسخ رابط الباقة للمتجر', 'Copy storefront link')}
                      >
                        {copiedSlug === slug ? <Check size={11} color="#16a34a" /> : <Copy size={11} />}
                      </button>
                    </div>

                    {desc && <p className="pm-card-desc">{desc}</p>}
                  </div>

                  {/* Components Box */}
                  <div className="pm-card-components" style={{ marginTop: '14px' }}>
                    <div className="pm-comp-header">
                      <span>{say('المكونات المشمولة', 'Included Components')}</span>
                      <span>{items.length} {say('أصناف', 'items')}</span>
                    </div>

                    {items.map((it, idx) => {
                      const v = getVariantDetails(string(it.variantId));
                      const qty = Number(it.quantity) || 1;
                      return (
                        <div key={idx} className="pm-comp-item">
                          <div className="pm-comp-left">
                            <img src={v?.image || '/logo.webp'} alt="" className="pm-comp-thumb" />
                            <span className="pm-comp-title" title={v?.title || string(it.variantId)}>
                              {v?.title || string(it.variantId)}
                            </span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span className="pm-comp-qty">x{qty}</span>
                            {v?.priceUsd && (
                              <span className="pm-comp-price">${v.priceUsd * qty}</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Bottom Financial & Action strip */}
                <div>
                  <div className="pm-financial-strip">
                    <div className="pm-price-block">
                      <div className="pm-main-price">
                        <span>${sellingPrice}</span>
                        {isFixed && compSum > sellingPrice && (
                          <span style={{ fontSize: 13, textDecoration: 'line-through', color: 'var(--muted)', fontWeight: 500 }}>
                            ${compSum}
                          </span>
                        )}
                      </div>
                      <span className="pm-sub-price">
                        (~ {yerPrice.toLocaleString(ar ? 'ar-YE' : 'en-US')} {say('ريال', 'YER')})
                      </span>
                    </div>

                    <div style={{ textAlign: ar ? 'left' : 'right' }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: allAvailable ? '#16a34a' : '#d97706', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span className={`status-dot ${allAvailable ? 'dot-green' : 'dot-yellow'}`} />
                        <span>{allAvailable ? say('جاهز للتسليم', 'In Stock') : say('يتطلب توفير', 'Check Stock')}</span>
                      </span>
                    </div>
                  </div>

                  <div className="pm-card-actions">
                    <div className="pm-actions-left">
                      <a
                        href={`/${lang}/packages?bundle=${slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="pm-icon-btn"
                        title={say('فتح في المتجر', 'Open in Storefront')}
                      >
                        <ExternalLink size={15} />
                      </a>
                      {canEdit && (
                        <button
                          type="button"
                          className="pm-icon-btn"
                          onClick={() => handleDuplicate(pkg)}
                          title={say('نسخ/تكرار الباقة', 'Duplicate Bundle')}
                        >
                          <Copy size={15} />
                        </button>
                      )}
                      {canEdit && (
                        <button
                          type="button"
                          className="pm-icon-btn danger"
                          onClick={() => setDeleteConfirm(pkg)}
                          title={say('حذف الباقة', 'Delete Bundle')}
                        >
                          <Trash2 size={15} />
                        </button>
                      )}
                    </div>

                    {canEdit && (
                      <button
                        type="button"
                        className="button primary sm"
                        onClick={() => startEdit(pkg)}
                      >
                        <Edit3 size={14} />
                        <span>{say('تعديل الباقة', 'Edit Bundle')}</span>
                      </button>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* ── Modal: Create / Edit Bundle ── */}
      {edit && (
        <Modal
          open={Boolean(edit)}
          onOpenChange={open => {
            if (!open) setEdit(null);
          }}
          title={isAdding ? say('إنشاء باقة عتاد جديدة', 'Create Tech Bundle') : say('تعديل بيانات الباقة', 'Edit Bundle')}
          description={say(
            'حدد عنوان الباقة والرابط والمكونات المشمولة مع ضبط نظام التسعير وحالة النشر.',
            'Configure bundle metadata, included components, pricing scheme, and publish status.'
          )}
        >
          <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Modal Subtabs */}
            <div className="pm-form-tabs">
              <button
                type="button"
                className={`pm-tab-btn ${activeTab === 'general' ? 'active' : ''}`}
                onClick={() => setActiveTab('general')}
              >
                <Sparkles size={15} />
                <span>{say('البيانات الأساسية', 'General Info')}</span>
              </button>

              <button
                type="button"
                className={`pm-tab-btn ${activeTab === 'components' ? 'active' : ''}`}
                onClick={() => setActiveTab('components')}
              >
                <Boxes size={15} />
                <span>{say('المكونات والقطع', 'Components')}</span>
                <span className="pm-count-badge" style={{ padding: '1px 6px', fontSize: 11 }}>
                  {edit.items.length}
                </span>
              </button>

              <button
                type="button"
                className={`pm-tab-btn ${activeTab === 'pricing' ? 'active' : ''}`}
                onClick={() => setActiveTab('pricing')}
              >
                <DollarSign size={15} />
                <span>{say('التسعير والتوفير', 'Pricing & Savings')}</span>
              </button>
            </div>

            {/* ── TAB 1: General Info ── */}
            {activeTab === 'general' && (
              <>
                <div className="pm-form-section">
                  <h3>
                    <Sparkles size={16} />
                    <span>{say('عنوان وهوية الباقة', 'Bundle Identity')}</span>
                  </h3>

                  <ValueFields
                    name="packageTitle"
                    value={edit.title}
                    hideEnglish={!showEnglishFields}
                    onChange={v => setEdit({ ...edit, title: v as any })}
                  />

                  {/* Slug input with auto generator */}
                  <label>
                    {say('الرابط الإنجليزي (Slug) — يتولد تلقائياً', 'URL Slug (Auto-generated)')}
                    <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                      <input
                        type="text"
                        dir="ltr"
                        value={edit.slug}
                        placeholder={say('اتركه فارغاً للتوليد التلقائي...', 'Leave empty for auto generation...')}
                        onChange={e => setEdit({ ...edit, slug: e.target.value })}
                        style={{ flex: 1 }}
                      />
                      <button
                        type="button"
                        className="button secondary sm"
                        onClick={() => {
                          const candidate = edit.title.en || edit.title.ar;
                          setEdit({ ...edit, slug: autoSlug(candidate) });
                        }}
                        title={say('توليد الرابط تلقائياً من العنوان', 'Generate slug from title')}
                      >
                        <Wand2 size={14} />
                        <span>{say('توليد', 'Generate')}</span>
                      </button>
                    </div>
                  </label>
                </div>

                <div className="pm-form-section">
                  <h3>
                    <Info size={16} />
                    <span>{say('الوصف والملاحظات', 'Description & Details')}</span>
                  </h3>

                  <ValueFields
                    name="description"
                    value={edit.description}
                    hideEnglish={!showEnglishFields}
                    onChange={v => setEdit({ ...edit, description: v as any })}
                  />
                </div>

                <div className="pm-form-section">
                  <label className="checkbox-field" style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={edit.published}
                      onChange={e => setEdit({ ...edit, published: e.target.checked })}
                    />
                    <div>
                      <strong style={{ display: 'block', fontSize: '13.5px' }}>
                        {say('نشر الباقة وإظهارها فوراً في المتجر للعملاء', 'Publish bundle to storefront')}
                      </strong>
                      <small style={{ color: 'var(--muted)', fontSize: '12px' }}>
                        {say('إذا كانت غير مفعلة، ستبقى الباقة كمسودة للإعداد الداخلي فقط.', 'Unpublished bundles remain in draft mode.')}
                      </small>
                    </div>
                  </label>
                </div>
              </>
            )}

            {/* ── TAB 2: Components & Items ── */}
            {activeTab === 'components' && (
              <>
                <div className="pm-form-section">
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <h3>
                      <Boxes size={16} />
                      <span>{say('المكونات المشمولة في الباقة', 'Included Components')}</span>
                    </h3>
                    <span style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600 }}>
                      {edit.items.length} {say('أصناف مضافة', 'items added')}
                    </span>
                  </div>

                  {edit.items.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '24px', background: 'var(--surface)', borderRadius: 12, border: '1px dashed var(--border)' }}>
                      <AlertTriangle size={28} style={{ color: '#d97706', margin: '0 auto 8px' }} />
                      <p style={{ margin: 0, fontWeight: 700, fontSize: 13.5 }}>
                        {say('الباقة فارغة حالياً!', 'No components added yet!')}
                      </p>
                      <small style={{ color: 'var(--muted)' }}>
                        {say('يجب إضافة مكوّن واحد على الأقل لإتمام إنشاء الباقة.', 'Add at least one item below.')}
                      </small>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {edit.items.map((it, idx) => {
                        const v = getVariantDetails(it.variantId);
                        const unitPrice = v?.priceUsd || 0;
                        const lineTotal = unitPrice * it.quantity;

                        return (
                          <div key={idx} className="pm-comp-editor-row">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, flex: 1 }}>
                              <img src={v?.image || '/logo.webp'} alt="" style={{ width: 34, height: 34, borderRadius: 8, objectFit: 'cover', border: '1px solid var(--border)' }} />
                              <div style={{ minWidth: 0 }}>
                                <strong style={{ display: 'block', fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {v?.title || it.variantId}
                                </strong>
                                <small style={{ color: 'var(--muted)', fontFamily: 'monospace', fontSize: 11 }}>
                                  SKU: {v?.sku} {unitPrice > 0 ? `· $${unitPrice}` : ''}
                                </small>
                              </div>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                              {/* Quantity Stepper */}
                              <div className="pm-qty-stepper">
                                <button
                                  type="button"
                                  className="pm-qty-btn"
                                  onClick={() => handleQuantityChange(idx, it.quantity - 1)}
                                  disabled={it.quantity <= 1}
                                >
                                  -
                                </button>
                                <input
                                  type="number"
                                  className="pm-qty-input"
                                  value={it.quantity}
                                  min="1"
                                  max="100"
                                  onChange={e => handleQuantityChange(idx, Number(e.target.value) || 1)}
                                />
                                <button
                                  type="button"
                                  className="pm-qty-btn"
                                  onClick={() => handleQuantityChange(idx, it.quantity + 1)}
                                  disabled={it.quantity >= 100}
                                >
                                  +
                                </button>
                              </div>

                              <span style={{ fontSize: 13, fontWeight: 800, fontFamily: 'monospace', minWidth: 60, textAlign: 'end' }}>
                                ${lineTotal}
                              </span>

                              <button
                                type="button"
                                className="pm-icon-btn danger"
                                onClick={() => handleRemoveComponent(idx)}
                                title={say('إزالة المكوّن', 'Remove Component')}
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Add component picker */}
                  <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px dashed var(--border)' }}>
                    <label style={{ fontSize: 12, fontWeight: 700, marginBottom: 6, display: 'block' }}>
                      {say('إضافة صنف جديد للباقة:', 'Add a component to bundle:')}
                    </label>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <select
                        value={selectedVariantToAdd}
                        onChange={e => setSelectedVariantToAdd(e.target.value)}
                        style={{ flex: 1 }}
                      >
                        <option value="">{say('اختر خيار منتج (SKU)...', 'Select variant (SKU)...')}</option>
                        {availableVariantsToAdd.map(v => {
                          const prod = ref.products.find(p => p.id === v.productId);
                          const title = prod ? localized(prod.title, lang) : '';
                          const priceStr = v.priceUsd ? `— $${v.priceUsd}` : '';
                          return (
                            <option key={string(v.id)} value={string(v.id)}>
                              {string(v.sku)} {title ? `(${title})` : ''} {priceStr}
                            </option>
                          );
                        })}
                      </select>
                      <button
                        type="button"
                        className="button primary sm"
                        onClick={handleAddComponent}
                        disabled={!selectedVariantToAdd}
                      >
                        <Plus size={15} />
                        <span>{say('إضافة للباقة', 'Add to Bundle')}</span>
                      </button>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* ── TAB 3: Pricing & Financials ── */}
            {activeTab === 'pricing' && (
              <>
                <div className="pm-form-section">
                  <h3>
                    <DollarSign size={16} />
                    <span>{say('نظام وحساب سعر الباقة', 'Pricing Model')}</span>
                  </h3>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <label className="checkbox-field" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <input
                        type="radio"
                        name="priceMode"
                        value="sum"
                        checked={edit.priceMode === 'sum'}
                        onChange={() => setEdit({ ...edit, priceMode: 'sum', priceUsd: null })}
                      />
                      <div>
                        <strong>{say('مجموع أسعار المكونات تلقائياً (Sum Mode)', 'Auto sum of components')}</strong>
                        <small style={{ color: 'var(--muted)', display: 'block' }}>
                          {say('يتم احتساب السعر تلقائياً بناءً على مجموع أسعار كل القطع المشمولة.', 'Selling price automatically matches total component sum.')}
                        </small>
                      </div>
                    </label>

                    <label className="checkbox-field" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <input
                        type="radio"
                        name="priceMode"
                        value="fixed"
                        checked={edit.priceMode === 'fixed'}
                        onChange={() => setEdit({ ...edit, priceMode: 'fixed', priceUsd: String(editCalculations.sum || 0) })}
                      />
                      <div>
                        <strong>{say('سعر محدد ومخفض للباقة (Fixed Promo Price)', 'Fixed promotional package price')}</strong>
                        <small style={{ color: 'var(--muted)', display: 'block' }}>
                          {say('تحديد سعر خاص للباقة كحزمة توفير (أقل من المجموع الفردي للقطع).', 'Offer an attractive bundle discount price.')}
                        </small>
                      </div>
                    </label>
                  </div>

                  {edit.priceMode === 'fixed' && (
                    <div style={{ marginTop: '14px' }}>
                      <label>
                        {say('سعر بيع الباقة بالدولار ($):', 'Bundle selling price in USD ($):')}
                        <input
                          type="number"
                          step="0.01"
                          min="1"
                          dir="ltr"
                          value={edit.priceUsd ?? ''}
                          placeholder="e.g. 450"
                          onChange={e => setEdit({ ...edit, priceUsd: e.target.value })}
                          style={{ marginTop: '4px' }}
                        />
                      </label>
                    </div>
                  )}

                  {/* Financial Calculator Widget */}
                  <div className="pm-calculator-box" style={{ marginTop: '16px' }}>
                    <div className="pm-calc-stat">
                      <span className="pm-calc-lbl">{say('مجموع أسعار القطع', 'Component Sum')}</span>
                      <span className="pm-calc-val">${editCalculations.sum}</span>
                    </div>

                    <div className="pm-calc-stat">
                      <span className="pm-calc-lbl">{say('سعر البيع المعتمد', 'Selling Price')}</span>
                      <span className="pm-calc-val" style={{ color: '#7c3aed' }}>
                        ${editCalculations.fixed}
                      </span>
                    </div>

                    {editCalculations.savings > 0 && (
                      <div className="pm-calc-stat">
                        <span className="pm-calc-lbl">{say('مقدار التوفير للعميل', 'Customer Savings')}</span>
                        <span className="pm-calc-val" style={{ color: '#16a34a' }}>
                          وفر ${editCalculations.savings} ({editCalculations.savingsPct}%)
                        </span>
                      </div>
                    )}

                    <div className="pm-calc-stat">
                      <span className="pm-calc-lbl">{say('المعادل بالريال اليمني', 'YER Equivalent')}</span>
                      <span className="pm-calc-val" style={{ fontSize: 14 }}>
                        ~ {Math.round(editCalculations.fixed * exchangeRate).toLocaleString(ar ? 'ar-YE' : 'en-US')} {say('ريال', 'YER')}
                      </span>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Modal Actions */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '10px', paddingTop: '12px', borderTop: '1px solid var(--border)' }}>
              <button type="button" className="button secondary" onClick={() => setEdit(null)}>
                {say('إلغاء', 'Cancel')}
              </button>
              <button type="submit" className="button primary" disabled={busy}>
                <Check size={16} />
                <span>{busy ? say('جارٍ الحفظ...', 'Saving...') : say('حفظ الباقة', 'Save Bundle')}</span>
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── Delete Confirmation Modal ── */}
      {deleteConfirm && (
        <Modal
          open={Boolean(deleteConfirm)}
          onOpenChange={open => {
            if (!open) setDeleteConfirm(null);
          }}
          title={say('تأكيد حذف الباقة', 'Confirm Bundle Deletion')}
          description={say(
            'هل أنت متأكد من رغبتك في حذف هذه الباقة نهائياً؟ لن يؤثر حذف الباقة على المنتجات الفردية.',
            'Are you sure you want to delete this bundle? Individual component products will remain intact.'
          )}
        >
          <div style={{ display: 'flex', gap: '14px', alignItems: 'center', marginBottom: '20px' }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#dc2626', flexShrink: 0 }}>
              <AlertTriangle size={22} />
            </div>
            <div>
              <strong style={{ display: 'block', fontSize: 15 }}>
                {localized(deleteConfirm.title, lang) || string(deleteConfirm.slug)}
              </strong>
              <small style={{ color: 'var(--muted)', fontFamily: 'monospace' }}>
                ID: {string(deleteConfirm.id)}
              </small>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '10px' }}>
            <button type="button" className="button secondary" onClick={() => setDeleteConfirm(null)}>
              {say('تراجع', 'Cancel')}
            </button>
            <button
              type="button"
              className="button danger-tone"
              disabled={busy}
              onClick={() => handleDelete(deleteConfirm)}
            >
              <Trash2 size={15} />
              <span>{busy ? say('جارٍ الحذف...', 'Deleting...') : say('تأكيد الحذف النهائي', 'Confirm Delete')}</span>
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

export default PackagesManager;
