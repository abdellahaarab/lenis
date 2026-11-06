import { useState, useMemo, useEffect, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Boxes, Sparkles, Search, Edit3, Trash2, Check, X, ArrowRight, ArrowLeft, ExternalLink, Layers, SlidersHorizontal, Package, Copy, ChevronRight, ChevronLeft, CheckSquare, Square, Wand2, Clock, Eye, Laptop, CheckCircle2, Info, Timer, Flame, Share2, Pin, Percent, Palette, AlertTriangle, Zap, Tag, CalendarClock, TrendingUp, Globe, Link2, RefreshCw, Star } from 'lucide-react';
import { can, CollectionEdit } from '@aljeel/shared';
import { api, ApiError } from './api';
import { useI18n } from './i18n';
import { useSession } from './App';
import { ErrorBox, Loading, Modal } from './components';
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

type PromoRules = {
  categories: string[];
  brands: string[];
  conditions: ('new' | 'A' | 'B' | 'C')[];
  available: boolean | null;
  min?: string | null;
  max?: string | null;
  // ── Promotional Fields ──
  endsAt?: string | null;
  badge?: string | null;
  accentColor?: string | null;
  discountPct?: number | null;
  pinned?: boolean;
};

type CollectionData = {
  id: string;
  slug: string;
  title: { ar: string; en: string };
  description: { ar: string; en: string };
  mode: 'manual' | 'automatic';
  rules: PromoRules;
  productIds: string[];
  published: boolean;
  sort: number;
  updatedAt?: string;
  revision?: string;
  products?: { productId: string }[];
};

const object = (v: unknown): Row => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Row) : {});
const string = (v: unknown) => (v == null ? '' : String(v));
const localized = (v: unknown, lang: string) => string(object(v)[lang]);

function generateSlug(text: string): string {
  return (
    text
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 90) || 'offer-' + Math.floor(Math.random() * 10000)
  );
}

// ── Countdown Timer Hook ──────────────────────────────────────────
function useCountdown(endsAt: string | null | undefined) {
  const [remaining, setRemaining] = useState<{ d: number; h: number; m: number; s: number; expired: boolean } | null>(null);

  const calc = useCallback(() => {
    if (!endsAt) return null;
    const diff = new Date(endsAt).getTime() - Date.now();
    if (diff <= 0) return { d: 0, h: 0, m: 0, s: 0, expired: true };
    const d = Math.floor(diff / 86400000);
    const h = Math.floor((diff % 86400000) / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    const s = Math.floor((diff % 60000) / 1000);
    return { d, h, m, s, expired: false };
  }, [endsAt]);

  useEffect(() => {
    if (!endsAt) { setRemaining(null); return; }
    setRemaining(calc());
    const id = setInterval(() => setRemaining(calc()), 1000);
    return () => clearInterval(id);
  }, [endsAt, calc]);

  return remaining;
}

// ── Mini Countdown Display ────────────────────────────────────────
function CountdownBadge({ endsAt, compact = false }: { endsAt: string | null | undefined; compact?: boolean }) {
  const r = useCountdown(endsAt);
  if (!endsAt || !r) return null;

  if (r.expired) {
    return (
      <span className="promo-timer expired">
        <AlertTriangle size={11} />
        <span>انتهى</span>
      </span>
    );
  }

  if (compact) {
    const parts = r.d > 0
      ? `${r.d}ي ${r.h}س`
      : r.h > 0
        ? `${r.h}:${String(r.m).padStart(2, '0')}:${String(r.s).padStart(2, '0')}`
        : `${r.m}:${String(r.s).padStart(2, '0')}`;
    return (
      <span className={`promo-timer ${r.h === 0 && r.d === 0 ? 'urgent' : ''}`}>
        <Timer size={11} />
        <span dir="ltr">{parts}</span>
      </span>
    );
  }

  return (
    <div className="promo-countdown-row">
      {[
        { v: r.d, l: 'يوم' },
        { v: r.h, l: 'ساعة' },
        { v: r.m, l: 'دقيقة' },
        { v: r.s, l: 'ثانية' },
      ].map(({ v, l }) => (
        <div key={l} className={`countdown-unit ${r.d === 0 && r.h === 0 ? 'urgent' : ''}`}>
          <span className="countdown-num">{String(v).padStart(2, '0')}</span>
          <span className="countdown-lbl">{l}</span>
        </div>
      ))}
    </div>
  );
}

// ── Shareable Link Copy Button ────────────────────────────────────
function ShareLinkButton({ slug, baseUrl = 'https://alarabiye.com' }: { slug: string; baseUrl?: string }) {
  const [copied, setCopied] = useState(false);
  const url = `${baseUrl}/ar/collection/${slug}`;

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* */ }
  }

  return (
    <div className="share-link-row">
      <span className="share-link-url" dir="ltr" title={url}>
        <Link2 size={12} />
        <span>/ar/collection/{slug}</span>
      </span>
      <button type="button" className={`share-copy-btn ${copied ? 'copied' : ''}`} onClick={handleCopy} title="نسخ رابط العرض">
        {copied ? <Check size={13} strokeWidth={3} /> : <Copy size={13} />}
      </button>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="share-open-btn"
        title="فتح في المتجر"
      >
        <ExternalLink size={13} />
      </a>
    </div>
  );
}

// ── Accent Color Picker ───────────────────────────────────────────
const ACCENT_COLORS = [
  { value: '#7c3aed', label: 'بنفسجي', class: 'violet' },
  { value: '#dc2626', label: 'أحمر', class: 'red' },
  { value: '#ea580c', label: 'برتقالي', class: 'orange' },
  { value: '#ca8a04', label: 'ذهبي', class: 'gold' },
  { value: '#16a34a', label: 'أخضر', class: 'green' },
  { value: '#0284c7', label: 'أزرق', class: 'blue' },
  { value: '#be185d', label: 'وردي', class: 'pink' },
  { value: '#0f766e', label: 'تيل', class: 'teal' },
  { value: '#1e293b', label: 'داكن', class: 'dark' },
];

export function CollectionsManager() {
  const { lang, showEnglishFields } = useI18n();
  const ar = lang === 'ar';
  const { user } = useSession();
  const canEdit = can(user.role, 'catalog.edit');
  const client = useQueryClient();
  const say = (a: string, e: string) => (ar ? a : e);

  const query = useQuery({
    queryKey: ['commerce-reference'],
    queryFn: () => api<Reference>('/commerce/reference'),
    staleTime: 30_000,
    gcTime: 5 * 60_000,
  });

  const [edit, setEdit] = useState<CollectionData | null>(null);
  const [q, setQ] = useState('');
  const [filterMode, setFilterMode] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [error, setError] = useState('');
  const [details, setDetails] = useState('');
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState<'identity' | 'promo' | 'selection' | 'settings'>('identity');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [shareTarget, setShareTarget] = useState<CollectionData | null>(null);

  // Manual Product Picker filters inside editor
  const [pickerSearch, setPickerSearch] = useState('');
  const [pickerCategory, setPickerCategory] = useState('');
  const [pickerBrand, setPickerBrand] = useState('');

  // Filter products for the manual picker (must be declared before early returns)
  const allProducts = query.data?.products;
  const pickerProducts = useMemo(() => {
    if (!allProducts) return [];
    return allProducts.filter(p => {
      if (pickerCategory && p.category !== pickerCategory) return false;
      if (pickerBrand && p.brandId !== pickerBrand) return false;
      if (pickerSearch) {
        const text = JSON.stringify([p.title, p.model, p.id]).toLowerCase();
        if (!text.includes(pickerSearch.toLowerCase())) return false;
      }
      return true;
    });
  }, [allProducts, pickerCategory, pickerBrand, pickerSearch]);

  if (query.isPending) return <Loading />;
  if (!query.data) return <ErrorBox code="disconnected" />;

  const ref = query.data;
  const rawCollections = (ref.collections as unknown as CollectionData[]) || [];

  // ── Metrics ──────────────────────────────────────────────────────
  const now = Date.now();
  const totalCount = rawCollections.length;
  const publishedCount = rawCollections.filter(c => c.published).length;
  const draftCount = rawCollections.filter(c => !c.published).length;
  const _smartCount = rawCollections.filter(c => c.mode === 'automatic').length;
  const activePromoCount = rawCollections.filter(c => {
    const ea = c.rules?.endsAt;
    return ea && new Date(ea).getTime() > now;
  }).length;
  const expiredPromoCount = rawCollections.filter(c => {
    const ea = c.rules?.endsAt;
    return ea && new Date(ea).getTime() <= now;
  }).length;
  const pinnedCount = rawCollections.filter(c => c.rules?.pinned).length;

  // ── Filter Collections ───────────────────────────────────────────
  const filteredCollections = rawCollections.filter(c => {
    const titleMatch = JSON.stringify([c.title, c.slug, c.id, c.description])
      .toLowerCase()
      .includes(q.toLowerCase());
    if (!titleMatch) return false;

    if (filterMode === 'published') return c.published;
    if (filterMode === 'draft') return !c.published;
    if (filterMode === 'manual') return c.mode === 'manual';
    if (filterMode === 'automatic') return c.mode === 'automatic';
    if (filterMode === 'active-promo') {
      const ea = c.rules?.endsAt;
      return ea && new Date(ea).getTime() > now;
    }
    if (filterMode === 'expired-promo') {
      const ea = c.rules?.endsAt;
      return ea && new Date(ea).getTime() <= now;
    }
    if (filterMode === 'pinned') return Boolean(c.rules?.pinned);
    return true;
  });

  // Sort: pinned first, then by sort
  const sortedCollections = [...filteredCollections].sort((a, b) => {
    if (a.rules?.pinned && !b.rules?.pinned) return -1;
    if (!a.rules?.pinned && b.rules?.pinned) return 1;
    return (a.sort ?? 0) - (b.sort ?? 0);
  });

  const totalPages = Math.max(1, Math.ceil(sortedCollections.length / 24));
  const paginatedCollections = sortedCollections.slice((page - 1) * 24, page * 24);

  function startCreate() {
    const id = crypto.randomUUID();
    const newCollection: CollectionData = {
      id,
      slug: '',
      title: { ar: '', en: '' },
      description: { ar: '', en: '' },
      mode: 'manual',
      rules: {
        categories: [],
        brands: [],
        conditions: [],
        available: null,
        min: null,
        max: null,
        endsAt: null,
        badge: null,
        accentColor: null,
        discountPct: null,
        pinned: false,
      },
      productIds: [],
      published: false,
      sort: rawCollections.length
    };
    setEdit(newCollection);
    setError('');
    setDetails('');
    setTab('identity');
    setPickerSearch('');
    setPickerCategory('');
    setPickerBrand('');
  }

  function startEdit(row: CollectionData) {
    const rawRules = object(row.rules);
    const item: CollectionData = {
      id: row.id,
      slug: row.slug,
      title: { ar: '', en: '', ...object(row.title) },
      description: { ar: '', en: '', ...object(row.description) },
      mode: row.mode || 'manual',
      rules: {
        categories: Array.isArray(rawRules.categories) ? (rawRules.categories as string[]) : [],
        brands: Array.isArray(rawRules.brands) ? (rawRules.brands as string[]) : [],
        conditions: Array.isArray(rawRules.conditions) ? (rawRules.conditions as ('new' | 'A' | 'B' | 'C')[]) : [],
        available: typeof rawRules.available === 'boolean' ? rawRules.available : null,
        min: rawRules.min ? String(rawRules.min) : null,
        max: rawRules.max ? String(rawRules.max) : null,
        endsAt: rawRules.endsAt ? String(rawRules.endsAt) : null,
        badge: rawRules.badge ? String(rawRules.badge) : null,
        accentColor: rawRules.accentColor ? String(rawRules.accentColor) : null,
        discountPct: typeof rawRules.discountPct === 'number' ? rawRules.discountPct as number : null,
        pinned: Boolean(rawRules.pinned),
      },
      productIds: Array.isArray(row.products)
        ? row.products.map(p => string(p.productId))
        : Array.isArray(row.productIds)
          ? row.productIds
          : [],
      published: Boolean(row.published),
      sort: typeof row.sort === 'number' ? row.sort : 0,
      updatedAt: row.updatedAt,
      revision: row.updatedAt
    };
    setEdit(item);
    setError('');
    setDetails('');
    setTab('identity');
    setPickerSearch('');
    setPickerCategory('');
    setPickerBrand('');
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!edit) return;

    setError('');
    setDetails('');

    const payload = {
      ...edit,
      slug: edit.slug.trim() || generateSlug(edit.title.en || edit.title.ar || 'offer'),
      title: {
        ar: edit.title.ar.trim() || edit.title.en.trim(),
        en: edit.title.en.trim() || edit.title.ar.trim()
      },
      description: {
        ar: edit.description.ar.trim() || edit.description.en.trim(),
        en: edit.description.en.trim() || edit.description.ar.trim()
      },
      rules: {
        ...edit.rules,
        min: edit.rules.min && Number(edit.rules.min) > 0 ? edit.rules.min : null,
        max: edit.rules.max && Number(edit.rules.max) > 0 ? edit.rules.max : null,
        endsAt: edit.rules.endsAt || null,
        badge: edit.rules.badge?.trim() || null,
        accentColor: edit.rules.accentColor || null,
        discountPct: edit.rules.discountPct || null,
        pinned: Boolean(edit.rules.pinned),
      }
    };

    const parsed = CollectionEdit.safeParse(payload);
    if (!parsed.success) {
      const messages = parsed.error.issues.map(i => {
        const fieldName = i.path.join('.');
        if (fieldName.includes('title.ar')) return say('اسم العرض بالعربية إجباري', 'Arabic title is required');
        if (fieldName.includes('title.en')) return say('اسم العرض بالإنجليزية إجباري', 'English title is required');
        if (fieldName.includes('slug')) return say('رابط العرض (Slug) غير صحيح أو فارغ', 'Invalid or empty URL slug');
        return `${fieldName}: ${i.message}`;
      });
      setDetails(messages.join(' · '));
      return;
    }

    setBusy(true);
    try {
      await api('/commerce/collections', {
        method: 'POST',
        body: parsed.data
      });
      await client.invalidateQueries({ queryKey: ['commerce-reference'] });
      setEdit(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.code : 'failed');
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      await api('/commerce/collections/' + id, { method: 'DELETE' });
      await client.invalidateQueries({ queryKey: ['commerce-reference'] });
      setDeleteConfirm(null);
      if (edit?.id === id) setEdit(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.code : 'failed');
    }
  }

  async function quickTogglePublish(collection: CollectionData) {
    try {
      const nextPublished = !collection.published;
      const payload = {
        id: collection.id,
        slug: collection.slug,
        title: { ar: collection.title.ar, en: collection.title.en },
        description: { ar: collection.description.ar, en: collection.description.en },
        mode: collection.mode,
        rules: collection.rules,
        productIds: Array.isArray(collection.products)
          ? collection.products.map(p => string(p.productId))
          : collection.productIds || [],
        published: nextPublished,
        sort: collection.sort,
        revision: collection.updatedAt
      };
      await api('/commerce/collections', { method: 'POST', body: payload });
      await client.invalidateQueries({ queryKey: ['commerce-reference'] });
    } catch (err) {
      setError(err instanceof ApiError ? err.code : 'failed');
    }
  }

  async function quickTogglePin(collection: CollectionData) {
    try {
      const payload = {
        id: collection.id,
        slug: collection.slug,
        title: { ar: collection.title.ar, en: collection.title.en },
        description: { ar: collection.description.ar, en: collection.description.en },
        mode: collection.mode,
        rules: { ...collection.rules, pinned: !collection.rules?.pinned },
        productIds: Array.isArray(collection.products)
          ? collection.products.map(p => string(p.productId))
          : collection.productIds || [],
        published: collection.published,
        sort: collection.sort,
        revision: collection.updatedAt
      };
      await api('/commerce/collections', { method: 'POST', body: payload });
      await client.invalidateQueries({ queryKey: ['commerce-reference'] });
    } catch (err) {
      setError(err instanceof ApiError ? err.code : 'failed');
    }
  }


  const toggleProductSelect = (productId: string) => {
    if (!edit) return;
    const exists = edit.productIds.includes(productId);
    const next = exists ? edit.productIds.filter(id => id !== productId) : [...edit.productIds, productId];
    setEdit({ ...edit, productIds: next });
  };

  const selectAllFiltered = () => {
    if (!edit) return;
    const idsToAdd = pickerProducts.map(p => string(p.id));
    const merged = Array.from(new Set([...edit.productIds, ...idsToAdd]));
    setEdit({ ...edit, productIds: merged });
  };

  const clearSelection = () => {
    if (!edit) return;
    setEdit({ ...edit, productIds: [] });
  };

  // Helper: get card accent gradient
  function cardAccent(col: CollectionData): string {
    const c = col.rules?.accentColor;
    return c ? `linear-gradient(135deg, ${c}18 0%, transparent 60%)` : '';
  }
  function cardBorderAccent(col: CollectionData): string {
    const c = col.rules?.accentColor;
    return c || '';
  }

  // ──────────────────────────────────────────────────────────────────
  return (
    <div className="collections-manager-view">
      {/* Top Header */}
      <div className="page-heading promo-page-heading">
        <div className="heading-content">
          <div className="title-row">
            <div className="promo-title-badge">
              <Flame size={18} />
              <span>🔥</span>
            </div>
            <h1>{say('نظام إدارة العروض الترويجية', 'Promotional Offers System')}</h1>
            <span className="count-pill promo-count-pill">
              {totalCount} {say('عرض', 'offers')}
            </span>
          </div>
          <p className="promo-heading-sub">
            {say(
              'أنشئ عروضًا ترويجية مميزة مع تايمر العد التنازلي وشعارات الخصم وروابط قابلة للمشاركة.',
              'Create promotional collections with countdown timers, discount badges and shareable links.'
            )}
          </p>
        </div>

        <div className="heading-actions">
          {!edit && (
            <button className="button primary promo-create-btn" onClick={startCreate}>
              <Zap size={16} />
              <span>{say('🚀 إنشاء عرض جديد', '🚀 New Offer')}</span>
            </button>
          )}
        </div>
      </div>

      <ErrorBox code={error} />
      {details && (
        <p role="alert" className="commerce-error" style={{ margin: '0 0 16px' }}>
          {details}
        </p>
      )}

      {/* Main View */}
      {!edit ? (
        <>
          {/* ── Promo Stats Grid ── */}
          <div className="promo-stats-grid">
            <div className="promo-stat-card accent-purple">
              <div className="promo-stat-icon"><Boxes size={22} /></div>
              <div className="promo-stat-info">
                <span className="promo-stat-value">{totalCount}</span>
                <span className="promo-stat-label">{say('إجمالي المجموعات', 'Total Collections')}</span>
              </div>
            </div>

            <div className="promo-stat-card accent-green">
              <div className="promo-stat-icon"><Eye size={22} /></div>
              <div className="promo-stat-info">
                <span className="promo-stat-value">{publishedCount}</span>
                <span className="promo-stat-label">{say('منشورة في المتجر', 'Live on Store')}</span>
              </div>
            </div>

            <div className="promo-stat-card accent-orange">
              <div className="promo-stat-icon"><Timer size={22} /></div>
              <div className="promo-stat-info">
                <span className="promo-stat-value">{activePromoCount}</span>
                <span className="promo-stat-label">{say('عروض نشطة بتايمر', 'Active Timed Offers')}</span>
              </div>
            </div>

            <div className="promo-stat-card accent-red">
              <div className="promo-stat-icon"><AlertTriangle size={22} /></div>
              <div className="promo-stat-info">
                <span className="promo-stat-value">{expiredPromoCount}</span>
                <span className="promo-stat-label">{say('عروض منتهية', 'Expired Offers')}</span>
              </div>
            </div>

            <div className="promo-stat-card accent-amber">
              <div className="promo-stat-icon"><Clock size={22} /></div>
              <div className="promo-stat-info">
                <span className="promo-stat-value">{draftCount}</span>
                <span className="promo-stat-label">{say('مسودات', 'Drafts')}</span>
              </div>
            </div>

            <div className="promo-stat-card accent-blue">
              <div className="promo-stat-icon"><Pin size={22} /></div>
              <div className="promo-stat-info">
                <span className="promo-stat-value">{pinnedCount}</span>
                <span className="promo-stat-label">{say('مثبتة في الأعلى', 'Pinned Offers')}</span>
              </div>
            </div>
          </div>

          {/* ── Search & Filter Toolbar ── */}
          <div className="catalog-control-panel">
            <div className="search-bar-unified">
              <div className="search-input-wrap">
                <Search size={16} className="search-icon" />
                <input
                  aria-label={say('بحث في العروض', 'Search offers')}
                  placeholder={say('ابحث باسم العرض، الرابط، أو الوصف…', 'Search by title, slug, or description…')}
                  value={q}
                  onChange={e => {
                    setQ(e.target.value);
                    setPage(1);
                  }}
                />
                {q && (
                  <button type="button" className="clear-search-btn" onClick={() => setQ('')}>
                    <X size={14} />
                  </button>
                )}
              </div>

              <div className="status-pills-bar">
                {[
                  { id: 'all', label: say('الكل', 'All'), icon: <Boxes size={13} /> },
                  { id: 'published', label: say('منشور', 'Published'), icon: <Eye size={13} /> },
                  { id: 'draft', label: say('مسودات', 'Drafts'), icon: <Clock size={13} /> },
                  { id: 'active-promo', label: say('عروض نشطة 🔥', 'Active Offers 🔥'), icon: <Flame size={13} /> },
                  { id: 'expired-promo', label: say('منتهية', 'Expired'), icon: <AlertTriangle size={13} /> },
                  { id: 'pinned', label: say('مثبتة', 'Pinned'), icon: <Pin size={13} /> },
                  { id: 'manual', label: say('يدوي', 'Manual'), icon: <Package size={13} /> },
                  { id: 'automatic', label: say('ذكي', 'Smart'), icon: <Sparkles size={13} /> },
                ].map(p => (
                  <button
                    key={p.id}
                    type="button"
                    className={`status-filter-pill ${filterMode === p.id ? 'active' : ''}`}
                    onClick={() => {
                      setFilterMode(p.id);
                      setPage(1);
                    }}
                  >
                    {p.icon}
                    <span>{p.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* ── Offers Cards Grid ── */}
          {paginatedCollections.length > 0 ? (
            <div className="collections-cards-grid promo-cards-grid">
              {paginatedCollections.map(col => {
                const isSmart = col.mode === 'automatic';
                const itemsCount = Array.isArray(col.products)
                  ? col.products.length
                  : Array.isArray(col.productIds)
                    ? col.productIds.length
                    : 0;
                const accent = cardBorderAccent(col);
                const bg = cardAccent(col);
                const isPinned = Boolean(col.rules?.pinned);
                const hasDiscount = col.rules?.discountPct;
                const hasBadge = col.rules?.badge;

                return (
                  <div
                    className={`collection-item-card promo-offer-card ${isPinned ? 'pinned' : ''}`}
                    key={col.id}
                    style={{
                      ...(accent ? { borderColor: accent } : {}),
                      ...(bg ? { background: bg + ', var(--surface)' } : {}),
                    }}
                  >
                    {/* ── Card Top Strip ── */}
                    <div className="promo-card-top-strip">
                      {/* Left badges */}
                      <div className="promo-card-badges-left">
                        {isPinned && (
                          <span className="promo-pill pin-pill">
                            <Pin size={11} />
                            <span>{say('مثبت', 'Pinned')}</span>
                          </span>
                        )}
                        <span className={`collection-mode-pill ${isSmart ? 'smart' : ''}`}>
                          {isSmart ? <Sparkles size={12} /> : <Package size={12} />}
                          <span>
                            {isSmart
                              ? say('ذكي', 'Smart')
                              : say(`يدوي (${itemsCount})`, `Manual (${itemsCount})`)}
                          </span>
                        </span>
                        {hasBadge && (
                          <span className="promo-pill badge-pill" style={accent ? { background: accent + '22', borderColor: accent, color: accent } : {}}>
                            <Tag size={11} />
                            <span>{hasBadge}</span>
                          </span>
                        )}
                      </div>

                      {/* Right: status toggle */}
                      <div className="promo-card-badges-right">
                        {hasDiscount && (
                          <span className="promo-discount-badge">
                            <Percent size={12} />
                            <span>{hasDiscount}%</span>
                          </span>
                        )}
                        <button
                          type="button"
                          className={`collection-status-pill ${col.published ? 'published' : 'draft'}`}
                          onClick={() => quickTogglePublish(col)}
                          title={say('اضغط لتغيير حالة النشر', 'Toggle status')}
                        >
                          <span style={{ width: 6, height: 6, borderRadius: '50%', background: col.published ? '#16a34a' : '#9ca3af' }} />
                          <span>{col.published ? say('منشور', 'Live') : say('مسودة', 'Draft')}</span>
                        </button>
                      </div>
                    </div>

                    {/* ── Card Body ── */}
                    <div className="collection-card-body promo-card-body">
                      <h3 className="collection-card-title">
                        {localized(col.title, lang) || col.title?.ar || col.slug}
                      </h3>
                      {col.title?.en && <p className="collection-card-en">{col.title.en}</p>}

                      <p className="collection-card-desc">
                        {localized(col.description, lang) ||
                          col.description?.ar ||
                          say('لا يوجد وصف تسويقي لهذه المجموعة.', 'No description provided.')}
                      </p>

                      {/* ── Share Link ── */}
                      {col.slug && <ShareLinkButton slug={col.slug} />}
                    </div>

                    {/* ── Countdown Timer ── */}
                    {col.rules?.endsAt && (
                      <div className="promo-card-timer-section">
                        <div className="promo-timer-label">
                          <Timer size={13} />
                          <span>{say('ينتهي العرض خلال', 'Offer ends in')}</span>
                        </div>
                        <CountdownBadge endsAt={col.rules.endsAt} compact />
                      </div>
                    )}

                    {/* ── Actions ── */}
                    <div className="promo-card-actions">
                      <button
                        type="button"
                        className={`icon-action-btn pin-btn ${isPinned ? 'active' : ''}`}
                        onClick={() => quickTogglePin(col)}
                        title={say(isPinned ? 'إلغاء التثبيت' : 'تثبيت في الأعلى', isPinned ? 'Unpin' : 'Pin to top')}
                      >
                        <Pin size={14} />
                      </button>
                      <button
                        type="button"
                        className="icon-action-btn share-btn"
                        onClick={() => setShareTarget(col)}
                        title={say('مشاركة رابط العرض', 'Share offer link')}
                      >
                        <Share2 size={14} />
                      </button>
                      <button type="button" className="button secondary sm promo-edit-btn" onClick={() => startEdit(col)}>
                        <Edit3 size={14} />
                        <span>{say('تعديل', 'Edit')}</span>
                      </button>
                      <button
                        type="button"
                        className="icon-action-btn danger-btn"
                        onClick={() => setDeleteConfirm(col.id)}
                        title={say('حذف', 'Delete')}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="collections-empty-state promo-empty-state">
              <div className="empty-icon-circle">
                <Flame size={32} />
              </div>
              <h3>{say('لا توجد عروض مطابقة', 'No matching offers')}</h3>
              <p className="heading-sub">
                {say(
                  'لم يتم العثور على أي عروض ترويجية تطابق معايير البحث الحالية.',
                  'No promotional offers match your current filter.'
                )}
              </p>
              {q || filterMode !== 'all' ? (
                <button
                  type="button"
                  className="button secondary"
                  onClick={() => { setQ(''); setFilterMode('all'); }}
                >
                  <RefreshCw size={14} />
                  {say('إعادة ضبط الفلاتر', 'Reset filters')}
                </button>
              ) : (
                <button type="button" className="button primary promo-create-btn" onClick={startCreate}>
                  <Zap size={16} />
                  <span>{say('🚀 أنشئ أول عرض الآن', '🚀 Create First Offer')}</span>
                </button>
              )}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <footer className="catalog-pagination-bar">
              <div className="pagination-info">
                <span>{say(`صفحة ${page} من ${totalPages}`, `Page ${page} of ${totalPages}`)}</span>
                <span className="pagination-count-total">
                  ({filteredCollections.length} {say('إجمالي العناصر', 'items')})
                </span>
              </div>
              <div className="pagination-controls">
                <button type="button" className="button secondary sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                  {ar ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
                  <span>{say('السابق', 'Previous')}</span>
                </button>
                <button type="button" className="button secondary sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
                  <span>{say('التالي', 'Next')}</span>
                  {ar ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
                </button>
              </div>
            </footer>
          )}
        </>
      ) : (
        /* ═══════════════════════════════════════════════════════════
           Collection / Offer Editor Screen
           ═══════════════════════════════════════════════════════════ */
        <form className="collection-editor-form" onSubmit={handleSave}>
          {/* Sticky Editor Header */}
          <div
            className="editor-top-bar promo-editor-header"
            style={edit.rules.accentColor ? { borderBottomColor: edit.rules.accentColor + '44' } : {}}
          >
            <div className="editor-title-group">
              <button type="button" className="button secondary sm back-btn" onClick={() => setEdit(null)}>
                {ar ? <ArrowRight size={16} /> : <ArrowLeft size={16} />}
                <span>{say('العودة', 'Back')}</span>
              </button>
              <div className="promo-editor-title-block">
                <h2 className="editor-title">
                  {edit.title?.ar || edit.title?.en
                    ? say(`✏️ تعديل: ${localized(edit.title, lang) || edit.slug}`, `✏️ Edit: ${edit.title?.en || edit.slug}`)
                    : say('🚀 إنشاء عرض ترويجي جديد', '🚀 New Promotional Offer')}
                </h2>
                {edit.rules.badge && (
                  <span className="promo-pill badge-pill sm">
                    <Tag size={11} />
                    {edit.rules.badge}
                  </span>
                )}
              </div>
            </div>

            <div className="editor-top-actions">
              {edit.rules.pinned !== undefined && (
                <button
                  type="button"
                  className={`icon-action-btn pin-btn ${edit.rules.pinned ? 'active' : ''}`}
                  onClick={() => setEdit({ ...edit, rules: { ...edit.rules, pinned: !edit.rules.pinned } })}
                  title={say(edit.rules.pinned ? 'إلغاء التثبيت' : 'تثبيت في الأعلى', edit.rules.pinned ? 'Unpin' : 'Pin to top')}
                >
                  <Pin size={16} />
                </button>
              )}
              <button
                type="button"
                className={`status-switch-btn ${edit.published ? 'published' : ''}`}
                onClick={() => setEdit({ ...edit, published: !edit.published })}
              >
                {edit.published ? <CheckCircle2 size={16} color="#16a34a" /> : <Eye size={16} />}
                <span>{edit.published ? say('منشور', 'Published') : say('مسودة', 'Draft')}</span>
              </button>

              <button className="button primary sm" disabled={busy || !canEdit} type="submit">
                <Check size={16} />
                <span>{busy ? say('جارٍ الحفظ…', 'Saving…') : say('حفظ العرض', 'Save Offer')}</span>
              </button>

              {ref.collections.some(c => c.id === edit.id) && canEdit && (
                <button
                  type="button"
                  className="button secondary sm"
                  style={{ color: '#ef4444', borderColor: '#fca5a5' }}
                  onClick={() => setDeleteConfirm(edit.id)}
                >
                  <Trash2 size={16} />
                </button>
              )}
            </div>
          </div>

          {/* ── Tabs ── */}
          <nav className="editor-tabs-bar promo-tabs-bar" aria-label={say('تبويبات العرض', 'Offer tabs')}>
            <button type="button" className={`editor-tab-pill ${tab === 'identity' ? 'active' : ''}`} onClick={() => setTab('identity')}>
              <Sparkles size={15} />
              <span>{say('الهوية والمحتوى', 'Identity')}</span>
            </button>
            <button type="button" className={`editor-tab-pill promo-tab ${tab === 'promo' ? 'active' : ''}`} onClick={() => setTab('promo')}>
              <Flame size={15} />
              <span>{say('🔥 الإعدادات الترويجية', '🔥 Promo Settings')}</span>
              {(edit.rules.endsAt || edit.rules.badge || edit.rules.discountPct) && (
                <span className="tab-badge-dot" />
              )}
            </button>
            <button type="button" className={`editor-tab-pill ${tab === 'selection' ? 'active' : ''}`} onClick={() => setTab('selection')}>
              <Boxes size={15} />
              <span>
                {say('المنتجات والقواعد', 'Products & Rules')}
                {edit.mode === 'manual' && ` (${edit.productIds.length})`}
              </span>
            </button>
            <button type="button" className={`editor-tab-pill ${tab === 'settings' ? 'active' : ''}`} onClick={() => setTab('settings')}>
              <SlidersHorizontal size={15} />
              <span>{say('الرابط والترتيب', 'URL & Settings')}</span>
            </button>
          </nav>

          {/* ══════════════════════════════════════
              Tab 1: Identity & Description
              ══════════════════════════════════════ */}
          {tab === 'identity' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="editor-section-card">
                <div className="section-header">
                  <h3 className="section-title">
                    <Sparkles size={16} color="var(--primary)" />
                    <span>{say('عنوان العرض الترويجي', 'Offer Title & Heading')}</span>
                  </h3>
                  <p className="section-subtitle">
                    {say(
                      'يظهر هذا العنوان للعملاء في صفحة المجموعة والصفحة الرئيسية.',
                      'This title appears to shoppers on the collection page and home page.'
                    )}
                  </p>
                </div>

                <div className="grid-2-col">
                  <div className="form-field-group">
                    <label className="form-field-label">
                      <span>{say('الاسم بالعربية *', 'Arabic Title *')}</span>
                      <span className="form-field-hint">{say('إلزامي', 'Required')}</span>
                    </label>
                    <input
                      className="input-modern"
                      value={edit.title.ar}
                      onChange={e => {
                        const arVal = e.target.value;
                        const enVal = (!showEnglishFields || !edit.title.en || edit.title.en === edit.title.ar) ? arVal : edit.title.en;
                        const nextSlug = !edit.slug ? generateSlug(enVal || arVal) : edit.slug;
                        setEdit({ ...edit, slug: nextSlug, title: { ar: arVal, en: enVal } });
                      }}
                      placeholder={say('مثال: عروض أجهزة الذكاء الاصطناعي 🔥', 'e.g. AI Devices Special Deals 🔥')}
                    />
                  </div>

                  {showEnglishFields && (
                    <div className="form-field-group">
                      <label className="form-field-label">
                        <span>{say('الاسم بالإنجليزية *', 'English Title *')}</span>
                      </label>
                      <input
                        className="input-modern"
                        dir="ltr"
                        value={edit.title.en}
                        onChange={e => {
                          const enVal = e.target.value;
                          const nextSlug = !edit.slug ? generateSlug(enVal) : edit.slug;
                          setEdit({ ...edit, slug: nextSlug, title: { ...edit.title, en: enVal } });
                        }}
                        placeholder="e.g. AI & Programming Laptops Special Deals"
                      />
                    </div>
                  )}
                </div>
              </div>

              <div className="editor-section-card">
                <div className="section-header">
                  <h3 className="section-title">
                    <Info size={16} color="var(--primary)" />
                    <span>{say('الوصف والرسالة التسويقية', 'Marketing Description')}</span>
                  </h3>
                </div>

                <div className={showEnglishFields ? 'grid-2-col' : 'grid-1-col'}>
                  <div className="form-field-group">
                    <label className="form-field-label">
                      <span>{say('الوصف بالعربية', 'Arabic Description')}</span>
                    </label>
                    <textarea
                      className="textarea-modern"
                      rows={3}
                      value={edit.description.ar}
                      onChange={e => {
                        const arVal = e.target.value;
                        const enVal = (!showEnglishFields || !edit.description.en || edit.description.en === edit.description.ar) ? arVal : edit.description.en;
                        setEdit({ ...edit, description: { ar: arVal, en: enVal } });
                      }}
                      placeholder={say(
                        'تشكيلة مختارة بعناية من أقوى أجهزة المطورين ومهندسي الذكاء الاصطناعي بأسعار لا تُفوَّت…',
                        'Write a compelling description…'
                      )}
                    />
                  </div>

                  {showEnglishFields && (
                    <div className="form-field-group">
                      <label className="form-field-label">
                        <span>{say('الوصف بالإنجليزية', 'English Description')}</span>
                      </label>
                      <textarea
                        className="textarea-modern"
                        dir="ltr"
                        rows={3}
                        value={edit.description.en}
                        onChange={e => setEdit({ ...edit, description: { ...edit.description, en: e.target.value } })}
                        placeholder="Carefully curated high-performance laptops for programmers and AI engineers…"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════
              Tab 2: 🔥 Promotional Settings
              ══════════════════════════════════════ */}
          {tab === 'promo' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

              {/* ── Preview Banner ── */}
              {(edit.rules.endsAt || edit.rules.badge || edit.rules.discountPct || edit.rules.accentColor) && (
                <div
                  className="promo-preview-banner"
                  style={edit.rules.accentColor ? {
                    background: `linear-gradient(135deg, ${edit.rules.accentColor}22, ${edit.rules.accentColor}08)`,
                    borderColor: edit.rules.accentColor + '44',
                  } : {}}
                >
                  <div className="promo-preview-left">
                    <div className="promo-preview-title">
                      {edit.rules.badge && (
                        <span className="promo-pill badge-pill">
                          <Tag size={12} />
                          {edit.rules.badge}
                        </span>
                      )}
                      {edit.rules.discountPct && (
                        <span className="promo-discount-badge lg">
                          <Percent size={14} />
                          <span>خصم {edit.rules.discountPct}%</span>
                        </span>
                      )}
                      <span className="promo-preview-name">{edit.title.ar || say('اسم العرض', 'Offer Name')}</span>
                    </div>
                    <p className="promo-preview-desc">{say('معاينة مظهر العرض الترويجي', 'Promotional offer preview')}</p>
                  </div>
                  {edit.rules.endsAt && (
                    <div className="promo-preview-right">
                      <CountdownBadge endsAt={edit.rules.endsAt} />
                    </div>
                  )}
                </div>
              )}

              {/* ── Timer Section ── */}
              <div className="editor-section-card promo-section-card">
                <div className="section-header">
                  <h3 className="section-title">
                    <CalendarClock size={16} color="#ea580c" />
                    <span>{say('⏳ تايمر انتهاء العرض', '⏳ Offer Expiry Timer')}</span>
                  </h3>
                  <p className="section-subtitle">
                    {say(
                      'حدد تاريخ ووقت انتهاء العرض وسيظهر تايمر العد التنازلي للعملاء تلقائياً.',
                      'Set an expiry date/time and a live countdown timer will automatically show on the storefront.'
                    )}
                  </p>
                </div>

                <div className="promo-timer-setup">
                  <div className="form-field-group" style={{ flex: 1 }}>
                    <label className="form-field-label">
                      <span>{say('تاريخ ووقت انتهاء العرض', 'Offer Expiry Date & Time')}</span>
                    </label>
                    <input
                      type="datetime-local"
                      className="input-modern"
                      dir="ltr"
                      value={edit.rules.endsAt ? edit.rules.endsAt.slice(0, 16) : ''}
                      onChange={e => {
                        const val = e.target.value ? new Date(e.target.value).toISOString() : null;
                        setEdit({ ...edit, rules: { ...edit.rules, endsAt: val } });
                      }}
                    />
                  </div>

                  {edit.rules.endsAt && (
                    <div className="promo-timer-preview">
                      <CountdownBadge endsAt={edit.rules.endsAt} />
                    </div>
                  )}

                  {edit.rules.endsAt && (
                    <button
                      type="button"
                      className="button secondary sm"
                      style={{ color: '#ef4444' }}
                      onClick={() => setEdit({ ...edit, rules: { ...edit.rules, endsAt: null } })}
                      title={say('إزالة التايمر', 'Remove timer')}
                    >
                      <X size={14} />
                      <span>{say('إزالة', 'Remove')}</span>
                    </button>
                  )}
                </div>

                {/* Quick presets */}
                <div className="promo-quick-presets">
                  <span className="promo-presets-label">
                    <Zap size={13} />
                    {say('اختصارات سريعة:', 'Quick presets:')}
                  </span>
                  {[
                    { label: say('24 ساعة', '24 Hours'), hours: 24 },
                    { label: say('3 أيام', '3 Days'), hours: 72 },
                    { label: say('أسبوع', '1 Week'), hours: 168 },
                    { label: say('شهر', '1 Month'), hours: 720 },
                  ].map(p => (
                    <button
                      key={p.hours}
                      type="button"
                      className="promo-preset-btn"
                      onClick={() => {
                        const d = new Date(Date.now() + p.hours * 3600000).toISOString();
                        setEdit({ ...edit, rules: { ...edit.rules, endsAt: d } });
                      }}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* ── Discount Badge ── */}
              <div className="editor-section-card promo-section-card">
                <div className="section-header">
                  <h3 className="section-title">
                    <Percent size={16} color="#dc2626" />
                    <span>{say('🏷️ شعار الخصم ونسبته', '🏷️ Discount Badge & Percentage')}</span>
                  </h3>
                  <p className="section-subtitle">
                    {say(
                      'يظهر شعار الخصم بشكل بارز على بطاقة العرض والصفحة الرئيسية.',
                      'Discount badge appears prominently on the offer card and homepage.'
                    )}
                  </p>
                </div>

                <div className="grid-2-col">
                  <div className="form-field-group">
                    <label className="form-field-label">
                      <span>{say('نسبة الخصم (%)', 'Discount Percentage (%)')}</span>
                      <span className="form-field-hint">{say('مثال: 20', 'e.g. 20')}</span>
                    </label>
                    <div className="input-with-suffix">
                      <input
                        type="number"
                        className="input-modern"
                        dir="ltr"
                        min={1}
                        max={99}
                        placeholder="20"
                        value={edit.rules.discountPct ?? ''}
                        onChange={e => setEdit({ ...edit, rules: { ...edit.rules, discountPct: e.target.value ? Number(e.target.value) : null } })}
                      />
                      <span className="input-suffix">%</span>
                    </div>
                  </div>

                  <div className="form-field-group">
                    <label className="form-field-label">
                      <span>{say('نص الشعار / التصنيف', 'Badge Label / Tag')}</span>
                      <span className="form-field-hint">{say('مثال: فلاش سيل 🔥', 'e.g. Flash Sale 🔥')}</span>
                    </label>
                    <input
                      className="input-modern"
                      maxLength={60}
                      placeholder={say('فلاش سيل 🔥', 'Flash Sale 🔥')}
                      value={edit.rules.badge ?? ''}
                      onChange={e => setEdit({ ...edit, rules: { ...edit.rules, badge: e.target.value || null } })}
                    />
                  </div>
                </div>

                {/* Quick badge suggestions */}
                <div className="promo-quick-presets">
                  <span className="promo-presets-label">
                    <Star size={13} />
                    {say('اقتراحات:', 'Suggestions:')}
                  </span>
                  {['🔥 فلاش سيل', '⚡ عرض محدود', '🎉 تخفيض استثنائي', '💎 عرض VIP', '🛒 توفير كبير'].map(s => (
                    <button
                      key={s}
                      type="button"
                      className="promo-preset-btn"
                      onClick={() => setEdit({ ...edit, rules: { ...edit.rules, badge: s } })}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              {/* ── Accent Color ── */}
              <div className="editor-section-card promo-section-card">
                <div className="section-header">
                  <h3 className="section-title">
                    <Palette size={16} color="#7c3aed" />
                    <span>{say('🎨 لون هوية العرض', '🎨 Offer Accent Color')}</span>
                  </h3>
                  <p className="section-subtitle">
                    {say(
                      'اختر لوناً مميزاً يعطي العرض هوية بصرية تجذب الانتباه.',
                      'Choose a color identity that makes this offer visually stand out.'
                    )}
                  </p>
                </div>

                <div className="accent-color-picker">
                  {ACCENT_COLORS.map(c => (
                    <button
                      key={c.value}
                      type="button"
                      className={`accent-color-swatch ${edit.rules.accentColor === c.value ? 'active' : ''}`}
                      style={{ background: c.value }}
                      title={c.label}
                      onClick={() => setEdit({ ...edit, rules: { ...edit.rules, accentColor: edit.rules.accentColor === c.value ? null : c.value } })}
                    >
                      {edit.rules.accentColor === c.value && <Check size={14} strokeWidth={3} color="white" />}
                    </button>
                  ))}
                  {edit.rules.accentColor && (
                    <button
                      type="button"
                      className="accent-clear-btn"
                      onClick={() => setEdit({ ...edit, rules: { ...edit.rules, accentColor: null } })}
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
              </div>

              {/* ── Pin & Visibility ── */}
              <div className="editor-section-card promo-section-card">
                <div className="section-header">
                  <h3 className="section-title">
                    <TrendingUp size={16} color="#0284c7" />
                    <span>{say('📌 الظهور والأولوية', '📌 Visibility & Priority')}</span>
                  </h3>
                </div>

                <div className="promo-toggle-row">
                  <div className="promo-toggle-item">
                    <div>
                      <strong>{say('تثبيت العرض في الأعلى', 'Pin Offer to Top')}</strong>
                      <p>{say('يظهر هذا العرض دائماً في أعلى قائمة العروض.', 'This offer will always appear at the top of the offers list.')}</p>
                    </div>
                    <button
                      type="button"
                      className={`promo-toggle-switch ${edit.rules.pinned ? 'on' : ''}`}
                      onClick={() => setEdit({ ...edit, rules: { ...edit.rules, pinned: !edit.rules.pinned } })}
                    >
                      <span className="toggle-thumb" />
                    </button>
                  </div>
                </div>
              </div>

              {/* ── Shareable Link Preview ── */}
              {edit.slug && (
                <div className="editor-section-card promo-section-card">
                  <div className="section-header">
                    <h3 className="section-title">
                      <Globe size={16} color="#16a34a" />
                      <span>{say('🔗 رابط المشاركة', '🔗 Shareable Link')}</span>
                    </h3>
                  </div>
                  <ShareLinkButton slug={edit.slug} />
                </div>
              )}
            </div>
          )}

          {/* ══════════════════════════════════════
              Tab 3: Products & Selection Rules
              ══════════════════════════════════════ */}
          {tab === 'selection' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Mode Selection */}
              <div className="editor-section-card">
                <div className="section-header">
                  <h3 className="section-title">
                    <Boxes size={16} color="var(--primary)" />
                    <span>{say('طريقة تجميع المنتجات', 'Product Selection Mode')}</span>
                  </h3>
                </div>

                <div className="mode-selection-grid">
                  <div
                    className={`mode-choice-card ${edit.mode === 'manual' ? 'active' : ''}`}
                    onClick={() => setEdit({ ...edit, mode: 'manual' })}
                  >
                    <div className="mode-card-icon"><CheckSquare size={20} /></div>
                    <div className="mode-card-text">
                      <strong>{say('تحديد يدوي', 'Manual Selection')}</strong>
                      <p>{say('اختيار منتجات محددة بالاسم من الكتالوج.', 'Explicitly pick products from your catalog.')}</p>
                    </div>
                  </div>

                  <div
                    className={`mode-choice-card ${edit.mode === 'automatic' ? 'active' : ''}`}
                    onClick={() => setEdit({ ...edit, mode: 'automatic' })}
                  >
                    <div className="mode-card-icon"><SlidersHorizontal size={20} /></div>
                    <div className="mode-card-text">
                      <strong>{say('تجميع ذكي تلقائي', 'Smart Auto Rules')}</strong>
                      <p>{say('قواعد ديناميكية تجمع المنتجات تلقائياً.', 'Dynamic rules that auto-include matching products.')}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Manual Product Picker */}
              {edit.mode === 'manual' && (
                <div className="editor-section-card">
                  <div className="section-header">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
                      <div>
                        <h3 className="section-title">
                          <Package size={16} color="var(--primary)" />
                          <span>{say('المنتجات المشمولة', 'Included Products')}</span>
                        </h3>
                        <p className="section-subtitle">
                          {say(`تم اختيار ${edit.productIds.length} منتج`, `${edit.productIds.length} products selected`)}
                        </p>
                      </div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button type="button" className="button secondary sm" onClick={selectAllFiltered}>
                          <CheckSquare size={14} />
                          <span>{say('تحديد الكل', 'Select All')}</span>
                        </button>
                        <button type="button" className="button secondary sm" onClick={clearSelection}>
                          <Square size={14} />
                          <span>{say('إلغاء الكل', 'Clear')}</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="product-picker-header">
                    <div className="product-picker-filters">
                      <div className="picker-search-input">
                        <Search size={14} className="picker-icon" />
                        <input
                          placeholder={say('بحث…', 'Search…')}
                          value={pickerSearch}
                          onChange={e => setPickerSearch(e.target.value)}
                        />
                      </div>
                      <select className="control-select sm" value={pickerCategory} onChange={e => setPickerCategory(e.target.value)}>
                        <option value="">{say('كل الفئات', 'All Categories')}</option>
                        {ref.categories.map(c => (
                          <option key={string(c.slug)} value={string(c.slug)}>
                            {localized(c.title, lang) || string(c.slug)}
                          </option>
                        ))}
                      </select>
                      <select className="control-select sm" value={pickerBrand} onChange={e => setPickerBrand(e.target.value)}>
                        <option value="">{say('كل العلامات', 'All Brands')}</option>
                        {ref.brands.map(b => (
                          <option key={string(b.id)} value={string(b.id)}>{string(b.name)}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="product-picker-grid">
                    {pickerProducts.map(p => {
                      const idStr = string(p.id);
                      const isSelected = edit.productIds.includes(idStr);
                      const brandObj = ref.brands.find(b => b.id === p.brandId);
                      const firstImg = Array.isArray(p.images) ? p.images[0] : null;
                      const imgPath = typeof firstImg === 'string'
                        ? firstImg
                        : string(object(object(firstImg).media).originalPath || object(firstImg).path || '');

                      return (
                        <div
                          key={idStr}
                          className={`product-pick-card ${isSelected ? 'selected' : ''}`}
                          onClick={() => toggleProductSelect(idStr)}
                        >
                          <div className="pick-thumb">
                            {imgPath ? (
                              <img src={imgPath.replace('/api/media/', '/api/admin/media/')} alt="" />
                            ) : (
                              <Laptop size={22} color="var(--muted)" />
                            )}
                          </div>
                          <div className="pick-info">
                            <strong>{localized(p.title, lang) || string(p.model) || idStr}</strong>
                            <small>{string(brandObj?.name || p.category)} {p.model ? `· ${p.model}` : ''}</small>
                          </div>
                          <div className="pick-checkbox">
                            {isSelected && <Check size={14} strokeWidth={3} />}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Automatic Smart Rules */}
              {edit.mode === 'automatic' && (
                <div className="editor-section-card">
                  <div className="section-header">
                    <h3 className="section-title">
                      <SlidersHorizontal size={16} color="var(--primary)" />
                      <span>{say('قواعد التجميع التلقائي', 'Automated Filter Rules')}</span>
                    </h3>
                    <p className="section-subtitle">{say('AND بين الشروط المختلفة، OR داخل نفس الشرط.', 'AND between rule sets; OR within each rule.')}</p>
                  </div>

                  <div className="form-field-group">
                    <label className="form-field-label"><span>{say('الفئات', 'Categories')}</span></label>
                    <div className="rule-chips-wrap">
                      {ref.categories.map(cat => {
                        const slug = string(cat.slug);
                        const active = edit.rules.categories.includes(slug);
                        return (
                          <button key={slug} type="button" className={`rule-chip-btn ${active ? 'active' : ''}`}
                            onClick={() => {
                              const next = active ? edit.rules.categories.filter(s => s !== slug) : [...edit.rules.categories, slug];
                              setEdit({ ...edit, rules: { ...edit.rules, categories: next } });
                            }}>
                            {active && <Check size={13} />}
                            <span>{localized(cat.title, lang) || slug}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="form-field-group">
                    <label className="form-field-label"><span>{say('العلامات التجارية', 'Brands')}</span></label>
                    <div className="rule-chips-wrap">
                      {ref.brands.map(brand => {
                        const bId = string(brand.id);
                        const active = edit.rules.brands.includes(bId);
                        return (
                          <button key={bId} type="button" className={`rule-chip-btn ${active ? 'active' : ''}`}
                            onClick={() => {
                              const next = active ? edit.rules.brands.filter(b => b !== bId) : [...edit.rules.brands, bId];
                              setEdit({ ...edit, rules: { ...edit.rules, brands: next } });
                            }}>
                            {active && <Check size={13} />}
                            <span>{string(brand.name)}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="form-field-group">
                    <label className="form-field-label"><span>{say('حالة الجهاز', 'Condition')}</span></label>
                    <div className="rule-chips-wrap">
                      {[
                        { id: 'new', label: say('جديد', 'New') },
                        { id: 'A', label: say('فئة A', 'Grade A') },
                        { id: 'B', label: say('فئة B', 'Grade B') },
                        { id: 'C', label: say('فئة C', 'Grade C') }
                      ].map(cond => {
                        const active = edit.rules.conditions.includes(cond.id as ('new' | 'A' | 'B' | 'C'));
                        return (
                          <button key={cond.id} type="button" className={`rule-chip-btn ${active ? 'active' : ''}`}
                            onClick={() => {
                              const next = active ? edit.rules.conditions.filter(c => c !== cond.id) : [...edit.rules.conditions, cond.id as ('new' | 'A' | 'B' | 'C')];
                              setEdit({ ...edit, rules: { ...edit.rules, conditions: next } });
                            }}>
                            {active && <Check size={13} />}
                            <span>{cond.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="grid-3-col">
                    <div className="form-field-group">
                      <label className="form-field-label"><span>{say('توفر المخزون', 'Stock')}</span></label>
                      <select className="select-modern" value={edit.rules.available === null ? '' : String(edit.rules.available)}
                        onChange={e => setEdit({ ...edit, rules: { ...edit.rules, available: e.target.value === '' ? null : e.target.value === 'true' } })}>
                        <option value="">{say('الكل', 'All')}</option>
                        <option value="true">{say('متوفر فقط', 'In Stock Only')}</option>
                        <option value="false">{say('غير متوفر', 'Out of Stock')}</option>
                      </select>
                    </div>
                    <div className="form-field-group">
                      <label className="form-field-label"><span>{say('الحد الأدنى ($)', 'Min Price ($)')}</span></label>
                      <input type="number" className="input-modern" dir="ltr" placeholder="0.00" value={edit.rules.min ?? ''}
                        onChange={e => setEdit({ ...edit, rules: { ...edit.rules, min: e.target.value || null } })} />
                    </div>
                    <div className="form-field-group">
                      <label className="form-field-label"><span>{say('الحد الأقصى ($)', 'Max Price ($)')}</span></label>
                      <input type="number" className="input-modern" dir="ltr" placeholder="5000.00" value={edit.rules.max ?? ''}
                        onChange={e => setEdit({ ...edit, rules: { ...edit.rules, max: e.target.value || null } })} />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ══════════════════════════════════════
              Tab 4: URL & Settings
              ══════════════════════════════════════ */}
          {tab === 'settings' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="editor-section-card">
                <div className="section-header">
                  <h3 className="section-title">
                    <SlidersHorizontal size={16} color="var(--primary)" />
                    <span>{say('رابط الوصول (URL Slug)', 'Collection URL Slug')}</span>
                  </h3>
                </div>

                <div className="form-field-group">
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <input
                      className="input-modern"
                      dir="ltr"
                      value={edit.slug}
                      onChange={e => setEdit({ ...edit, slug: e.target.value })}
                      placeholder="e.g. summer-deals"
                    />
                    <button type="button" className="button secondary sm"
                      onClick={() => {
                        const source = edit.title.en || edit.title.ar || 'offer';
                        setEdit({ ...edit, slug: generateSlug(source) });
                      }}>
                      <Wand2 size={14} />
                      <span>{say('توليد', 'Auto')}</span>
                    </button>
                  </div>
                  {edit.slug && <ShareLinkButton slug={edit.slug} />}
                </div>
              </div>

              <div className="editor-section-card">
                <div className="section-header">
                  <h3 className="section-title">
                    <Layers size={16} color="var(--primary)" />
                    <span>{say('ترتيب الظهور', 'Display Order')}</span>
                  </h3>
                  <p className="section-subtitle">{say('الرقم الأقل يظهر أولاً.', 'Lower number = appears first.')}</p>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 10, maxWidth: 220 }}>
                  <button type="button" className="button secondary sm" onClick={() => setEdit({ ...edit, sort: Math.max(0, edit.sort - 1) })}>-</button>
                  <input type="number" className="input-modern" style={{ textAlign: 'center' }} value={edit.sort}
                    onChange={e => setEdit({ ...edit, sort: Number(e.target.value) || 0 })} />
                  <button type="button" className="button secondary sm" onClick={() => setEdit({ ...edit, sort: edit.sort + 1 })}>+</button>
                </div>
              </div>

              <div className="editor-section-card">
                <div className="section-header">
                  <h3 className="section-title">
                    <Info size={16} color="var(--muted)" />
                    <span>{say('المعرّف الداخلي (UUID)', 'Internal Unique ID')}</span>
                  </h3>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input className="input-modern" dir="ltr" readOnly value={edit.id} style={{ opacity: 0.7 }} />
                  <button type="button" className="button secondary sm"
                    onClick={() => navigator.clipboard?.writeText(edit.id)}>
                    <Copy size={14} />
                  </button>
                </div>
              </div>
            </div>
          )}
        </form>
      )}

      {/* ── Delete Confirm Modal ── */}
      {deleteConfirm && (
        <Modal
          open={Boolean(deleteConfirm)}
          onOpenChange={open => !open && setDeleteConfirm(null)}
          title={say('تأكيد حذف العرض الترويجي', 'Confirm Offer Deletion')}
          description={say(
            'هل أنت متأكد من حذف هذا العرض؟ لن يتم حذف المنتجات نفسها.',
            'Are you sure? Products will remain in the catalog.'
          )}
        >
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 16 }}>
            <button type="button" className="button secondary" onClick={() => setDeleteConfirm(null)}>
              {say('إلغاء', 'Cancel')}
            </button>
            <button type="button" className="button primary danger-tone" onClick={() => handleDelete(deleteConfirm)}>
              <Trash2 size={16} />
              <span>{say('تأكيد الحذف', 'Delete Now')}</span>
            </button>
          </div>
        </Modal>
      )}

      {/* ── Share Link Modal ── */}
      {shareTarget && (
        <Modal
          open={Boolean(shareTarget)}
          onOpenChange={open => !open && setShareTarget(null)}
          title={say('مشاركة رابط العرض 🔗', 'Share Offer Link 🔗')}
          description={say(
            `انسخ رابط "${localized(shareTarget.title, lang)}" وشاركه مع عملائك`,
            `Copy and share the link for "${shareTarget.title?.en || shareTarget.slug}"`
          )}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 8 }}>
            {shareTarget.rules?.endsAt && (
              <div className="promo-share-timer">
                <Timer size={14} />
                <span>{say('ينتهي هذا العرض خلال:', 'Offer expires in:')}</span>
                <CountdownBadge endsAt={shareTarget.rules.endsAt} compact />
              </div>
            )}
            <ShareLinkButton slug={shareTarget.slug} />
            {shareTarget.rules?.discountPct && (
              <div className="promo-share-discount">
                <Percent size={14} />
                <span>{say(`خصم ${shareTarget.rules.discountPct}% على هذه التشكيلة`, `${shareTarget.rules.discountPct}% discount on this collection`)}</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button type="button" className="button secondary" onClick={() => setShareTarget(null)}>
                {say('إغلاق', 'Close')}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
