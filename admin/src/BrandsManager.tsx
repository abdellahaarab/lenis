import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit3, Save, X, Building2, Tag, Globe, Image as ImageIcon, ToggleLeft, ToggleRight, AlignLeft, Layers, ArrowUpDown, Trash2 } from 'lucide-react';
import { api, ApiError } from './api';
import { useI18n } from './i18n';
import { Loading, ErrorBox, Modal } from './components';
import { VisualMediaPickerModal } from './VisualMediaPickerModal';

// ── Types ─────────────────────────────────────────────────────────────────────

type Category = {
  slug: string;
  title: { ar: string; en: string };
  sort: number;
  parentSlug: string | null;
};

type MediaItem = {
  id: string;
  originalPath: string;
  altAr: string;
  altEn: string;
};

type BrandRow = {
  id: string;
  slug: string;
  name: string;
  description: { ar: string; en: string };
  tagline?: { ar: string; en: string } | null;
  logoMediaId?: string | null;
  sort: number;
  published: boolean;
  categories: { categorySlug: string }[];
};

type Reference = {
  brands: BrandRow[];
  categories: Category[];
};

type BrandForm = {
  id: string;
  name: string;
  description: { ar: string; en: string };
  tagline: { ar: string; en: string } | null;
  logoMediaId: string | null;
  categories: string[];
  published: boolean;
  sort: number;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function toSlug(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[\s_]+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 100);
}

function imageUrl(path: unknown): string {
  if (!path || typeof path !== 'string') return '';
  return path.replace('/api/media/', '/api/admin/media/');
}

function emptyForm(): BrandForm {
  return {
    id: '',
    name: '',
    description: { ar: '', en: '' },
    tagline: null,
    logoMediaId: null,
    categories: [],
    published: false,
    sort: 0,
  };
}

// ── Sub-components ────────────────────────────────────────────────────────────

function FieldLabel({ ar, label, sublabel }: { ar: boolean; label: [string, string]; sublabel?: [string, string] }) {
  return (
    <span className="bm-field-label">
      {ar ? label[0] : label[1]}
      {sublabel && <small className="bm-field-sub">{ar ? sublabel[0] : sublabel[1]}</small>}
    </span>
  );
}

function LocalizedInput({
  label,
  ar,
  valueAr,
  valueEn,
  onChange,
  placeholder,
  textarea,
  required,
}: {
  label: [string, string];
  ar: boolean;
  valueAr: string;
  valueEn: string;
  onChange: (ar: string, en: string) => void;
  placeholder?: { ar: string; en: string };
  textarea?: boolean;
  required?: boolean;
}) {
  const { showEnglishFields } = useI18n();
  const Tag = textarea ? 'textarea' : 'input';
  return (
    <div className="bm-localized-group">
      <p className="bm-localized-label">{ar ? label[0] : label[1]}</p>
      <div className="bm-localized-row">
        <label className="bm-field">
          {showEnglishFields && <span className="bm-lang-badge">AR</span>}
          <Tag
            className={textarea ? 'bm-textarea' : ''}
            value={valueAr}
            required={required}
            dir="rtl"
            placeholder={placeholder?.ar}
            onChange={(e) => {
              const nextAr = (e.target as HTMLInputElement | HTMLTextAreaElement).value;
              const nextEn = (!showEnglishFields || !valueEn || valueEn === valueAr) ? nextAr : valueEn;
              onChange(nextAr, nextEn);
            }}
          />
        </label>
        {showEnglishFields && (
          <label className="bm-field">
            <span className="bm-lang-badge bm-lang-badge--en">EN</span>
            <Tag
              className={textarea ? 'bm-textarea' : ''}
              value={valueEn}
              dir="ltr"
              placeholder={placeholder?.en}
              onChange={(e) => onChange(valueAr, (e.target as HTMLInputElement | HTMLTextAreaElement).value)}
            />
          </label>
        )}
      </div>
    </div>
  );
}

// ── Brand Form Panel ──────────────────────────────────────────────────────────

function BrandFormPanel({
  form,
  categories,
  mediaItems,
  onClose,
  onSaved,
  onDelete,
  isNew,
  ar,
}: {
  form: BrandForm;
  categories: Category[];
  mediaItems: MediaItem[];
  onClose: () => void;
  onSaved: () => void;
  onDelete?: (id: string) => void;
  isNew: boolean;
  ar: boolean;
}) {
  const [data, setData] = useState<BrandForm>(form);
  const [slugManual, setSlugManual] = useState(!isNew);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const say = (a: string, e: string) => (ar ? a : e);

  // Auto-generate slug from name
  useEffect(() => {
    if (!slugManual && data.name) {
      setData((prev) => ({ ...prev, id: toSlug(data.name) }));
    }
  }, [data.name, slugManual]);

  const set = <K extends keyof BrandForm>(key: K, val: BrandForm[K]) =>
    setData((prev) => ({ ...prev, [key]: val }));

  const toggleCategory = (slug: string) => {
    set(
      'categories',
      data.categories.includes(slug)
        ? data.categories.filter((c) => c !== slug)
        : [...data.categories, slug]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!data.id) { setError('brand_slug_required'); return; }
    setError('');
    setBusy(true);
    try {
      const descAr = (data.description.ar || '').trim();
      const descEn = (data.description.en || '').trim() || descAr;
      const taglineAr = (data.tagline?.ar || '').trim();
      const taglineEn = (data.tagline?.en || '').trim() || taglineAr;
      await api('/brands', {
        method: 'POST',
        body: {
          id: data.id,
          name: data.name,
          description: { ar: descAr, en: descEn },
          ...(data.tagline ? { tagline: { ar: taglineAr, en: taglineEn } } : {}),
          logoMediaId: data.logoMediaId ?? null,
          categories: data.categories,
          published: data.published,
          sort: data.sort,
        },
      });
      onSaved();
    } catch (err) {
      setError(err instanceof ApiError ? err.code : 'failed');
    } finally {
      setBusy(false);
    }
  };

  // Root categories only for display (with children indented)
  const topCats = categories.filter((c) => !c.parentSlug);
  const childCats = (parentSlug: string) => categories.filter((c) => c.parentSlug === parentSlug);

  // Selected logo preview
  const selectedLogo = mediaItems.find((m) => m.id === data.logoMediaId);
  const [logoPickerOpen, setLogoPickerOpen] = useState(false);

  return (
    <div className="bm-panel-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <aside className="bm-panel">
        <header className="bm-panel-header">
          <div className="bm-panel-title-row">
            <Building2 size={20} />
            <h2 className="bm-panel-title">
              {isNew ? say('علامة تجارية جديدة', 'New Brand') : say('تعديل العلامة', 'Edit Brand')}
            </h2>
          </div>
          <button type="button" className="bm-icon-btn" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </header>

        <form className="bm-panel-body" onSubmit={handleSubmit}>
          {error && <div className="bm-error-box"><ErrorBox code={error} /></div>}

          {/* ── Identity ── */}
          <section className="bm-section">
            <div className="bm-section-head">
              <Tag size={16} />
              <span>{say('الهوية الأساسية', 'Basic Identity')}</span>
            </div>

            <label className="bm-field bm-field--full">
              <FieldLabel ar={ar} label={['اسم العلامة التجارية', 'Brand name']} sublabel={['يُستخدم في المنتجات', 'Used across products']} />
              <input
                value={data.name}
                required
                onChange={(e) => set('name', e.target.value)}
                placeholder={ar ? 'مثال: Dell' : 'e.g. Dell'}
              />
            </label>

            <label className="bm-field bm-field--full">
              <FieldLabel
                ar={ar}
                label={['معرّف الرابط (Slug)', 'URL Slug']}
                sublabel={['أحرف إنجليزية صغيرة وشرطات فقط', 'Lowercase letters and hyphens only']}
              />
              <div className="bm-slug-row">
                <input
                  dir="ltr"
                  value={data.id}
                  required
                  placeholder="dell"
                  onChange={(e) => {
                    setSlugManual(true);
                    set('id', toSlug(e.target.value));
                  }}
                />
                {!slugManual && (
                  <span className="bm-slug-auto">{say('تلقائي', 'Auto')}</span>
                )}
              </div>
              {isNew && !slugManual && (
                <small className="bm-hint">
                  {say('يُحسب تلقائياً من الاسم. اكتب في الحقل لتثبيته.', 'Auto-generated from name. Type to fix manually.')}
                </small>
              )}
              {!isNew && (
                <small className="bm-hint bm-hint--warn">
                  {say('⚠ لا تغيّر المعرّف بعد الإنشاء — تأكد قبل الحفظ.', '⚠ Do not change slug after creation.')}
                </small>
              )}
            </label>
          </section>

          {/* ── Description ── */}
          <section className="bm-section">
            <div className="bm-section-head">
              <AlignLeft size={16} />
              <span>{say('الوصف', 'Description')}</span>
            </div>

            <LocalizedInput
              label={['الوصف', 'Description']}
              ar={ar}
              valueAr={data.description.ar}
              valueEn={data.description.en}
              textarea
              placeholder={{ ar: 'وصف مختصر للعلامة التجارية…', en: 'Brief brand description…' }}
              onChange={(a, e) => set('description', { ar: a, en: e })}
            />

            {/* Optional tagline */}
            <div className="bm-optional-section">
              <div className="bm-optional-header">
                <span>{say('الشعار (اختياري)', 'Tagline (optional)')}</span>
                <button
                  type="button"
                  className={`bm-toggle-btn ${data.tagline !== null ? 'active' : ''}`}
                  onClick={() => set('tagline', data.tagline === null ? { ar: '', en: '' } : null)}
                >
                  {data.tagline !== null
                    ? say('إزالة الشعار', 'Remove tagline')
                    : say('إضافة شعار', 'Add tagline')}
                </button>
              </div>
              {data.tagline !== null && (
                <LocalizedInput
                  label={['الشعار', 'Tagline']}
                  ar={ar}
                  valueAr={data.tagline?.ar ?? ''}
                  valueEn={data.tagline?.en ?? ''}
                  placeholder={{ ar: 'شعار قصير للعلامة…', en: 'Short brand tagline…' }}
                  onChange={(a, e) => set('tagline', { ar: a, en: e })}
                />
              )}
            </div>
          </section>

          {/* ── Logo ── */}
          <section className="bm-section">
            <div className="bm-section-head">
              <ImageIcon size={16} />
              <span>{say('الشعار المرئي (اختياري)', 'Logo image (optional)')}</span>
            </div>

            {selectedLogo ? (
              <div className="visual-entity-trigger-card">
                <div className="visual-entity-info-side">
                  <div className="visual-entity-thumb">
                    <img src={imageUrl(selectedLogo.originalPath)} alt={selectedLogo.altAr || ''} />
                  </div>
                  <div className="visual-entity-texts">
                    <span className="visual-entity-title">{selectedLogo.altAr || selectedLogo.altEn || say('شعار معتمد', 'Logo image')}</span>
                    <span className="visual-entity-subtitle">{selectedLogo.originalPath}</span>
                  </div>
                </div>
                <div className="visual-entity-actions">
                  <button
                    type="button"
                    className="button secondary sm"
                    onClick={() => setLogoPickerOpen(true)}
                  >
                    {say('تغيير الشعار', 'Change Logo')}
                  </button>
                  <button
                    type="button"
                    className="button subtle sm danger-tone"
                    onClick={() => set('logoMediaId', null)}
                    title={say('إزالة الشعار', 'Remove logo')}
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                className="visual-entity-empty-btn"
                onClick={() => setLogoPickerOpen(true)}
              >
                <ImageIcon size={18} />
                <span>{say('اختيار شعار العلامة من المعرض المرئي المنبثق', 'Select Brand Logo from Visual Gallery')}</span>
              </button>
            )}

            <VisualMediaPickerModal
              open={logoPickerOpen}
              onOpenChange={setLogoPickerOpen}
              multiple={false}
              title={say('اختيار شعار العلامة التجارية', 'Select Brand Logo')}
              description={say('اختر شعار العلامة بالنقر على الصورة المطلوبة', 'Click on the logo image to select directly')}
              selectedPaths={selectedLogo ? [selectedLogo.originalPath] : []}
              onConfirm={(paths) => {
                const pickedPath = paths[0];
                const found = mediaItems.find((m) => m.originalPath === pickedPath);
                if (found) {
                  set('logoMediaId', found.id);
                }
              }}
            />
          </section>

          {/* ── Categories ── */}
          <section className="bm-section">
            <div className="bm-section-head">
              <Layers size={16} />
              <span>
                {say('تصنيفات العلامة (اختياري)', 'Brand categories (optional)')}
                <em className="bm-count">
                  {data.categories.length > 0 && ` · ${data.categories.length} ${say('محدد', 'selected')}`}
                </em>
              </span>
            </div>
            <p className="bm-hint">{say('اختر التصنيفات التي تغطيها هذه العلامة التجارية.', 'Select which product categories this brand covers.')}</p>

            <div className="bm-category-tree">
              {topCats.map((cat) => (
                <div key={cat.slug} className="bm-cat-group">
                  <label className="bm-cat-item bm-cat-item--parent">
                    <input
                      type="checkbox"
                      checked={data.categories.includes(cat.slug)}
                      onChange={() => toggleCategory(cat.slug)}
                    />
                    <span>{ar ? cat.title.ar : cat.title.en}</span>
                  </label>
                  {childCats(cat.slug).map((child) => (
                    <label key={child.slug} className="bm-cat-item bm-cat-item--child">
                      <input
                        type="checkbox"
                        checked={data.categories.includes(child.slug)}
                        onChange={() => toggleCategory(child.slug)}
                      />
                      <span>{ar ? child.title.ar : child.title.en}</span>
                    </label>
                  ))}
                </div>
              ))}
              {categories.length === 0 && (
                <p className="bm-empty">{say('لا توجد تصنيفات بعد.', 'No categories yet.')}</p>
              )}
            </div>
          </section>

          {/* ── Settings ── */}
          <section className="bm-section">
            <div className="bm-section-head">
              <Globe size={16} />
              <span>{say('الإعدادات', 'Settings')}</span>
            </div>

            <div className="bm-settings-grid">
              <label className="bm-field">
                <FieldLabel ar={ar} label={['الترتيب', 'Sort order']} sublabel={['الأصغر يظهر أولاً', 'Lower = first']} />
                <input
                  type="number"
                  min={0}
                  max={10000}
                  dir="ltr"
                  value={data.sort}
                  onChange={(e) => set('sort', Number(e.target.value))}
                />
              </label>

              <div className="bm-field">
                <FieldLabel ar={ar} label={['الظهور', 'Visibility']} />
                <button
                  type="button"
                  className={`bm-toggle-switch ${data.published ? 'bm-toggle-switch--on' : ''}`}
                  onClick={() => set('published', !data.published)}
                >
                  {data.published
                    ? <><ToggleRight size={18} /> {say('ظاهر في الموقع', 'Published')}</>
                    : <><ToggleLeft size={18} /> {say('مخفي (مسودة)', 'Hidden (draft)')}</>
                  }
                </button>
                {data.published && (
                  <small className="bm-hint bm-hint--warn">
                    {say('⚠ لا يمكن نشر المنتج إلا إذا كانت العلامة منشورة.', '⚠ Products require this brand to be published.')}
                  </small>
                )}
              </div>
            </div>
          </section>

          {/* ── Actions ── */}
          <div className="bm-panel-actions">
            {!isNew && onDelete && (
              <button
                type="button"
                className="button secondary danger-tone"
                onClick={() => onDelete(data.id)}
                disabled={busy}
              >
                <Trash2 size={15} />
                {say('حذف العلامة', 'Delete')}
              </button>
            )}
            <button type="button" className="button secondary" onClick={onClose} disabled={busy}>
              {say('إلغاء', 'Cancel')}
            </button>
            <button type="submit" className="button primary" disabled={busy}>
              <Save size={16} />
              {busy ? say('جارٍ الحفظ…', 'Saving…') : say('حفظ العلامة', 'Save brand')}
            </button>
          </div>
        </form>
      </aside>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export function BrandsManager() {
  const { lang } = useI18n();
  const ar = lang === 'ar';
  const client = useQueryClient();
  const say = (a: string, e: string) => (ar ? a : e);

  const reference = useQuery({
    queryKey: ['reference'],
    queryFn: () => api<Reference>('/reference'),
    staleTime: 30_000,
    gcTime: 5 * 60_000,
  });
  const mediaQuery = useQuery({
    queryKey: ['media'],
    queryFn: () => api<{ items: MediaItem[] }>('/media'),
    staleTime: 60_000,
    gcTime: 5 * 60_000,
  });

  const [panel, setPanel] = useState<{ form: BrandForm; isNew: boolean } | null>(null);
  const [search, setSearch] = useState('');
  const [filterPublished, setFilterPublished] = useState<'all' | 'published' | 'draft'>('all');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState('');
  const [busy, setBusy] = useState(false);

  async function handleDelete(brandId: string) {
    setBusy(true);
    setDeleteError('');
    try {
      await api('/brands/' + brandId, { method: 'DELETE' });
      await client.invalidateQueries({ queryKey: ['reference'] });
      setDeleteConfirm(null);
      if (panel?.form.id === brandId) setPanel(null);
    } catch (err) {
      setDeleteError(err instanceof ApiError ? err.code : 'failed');
    } finally {
      setBusy(false);
    }
  }

  if (reference.isPending || mediaQuery.isPending) return <Loading />;
  if (reference.isError || mediaQuery.isError) return <ErrorBox code="failed" />;

  const brands = reference.data!.brands;
  const categories = reference.data!.categories;
  const mediaItems = mediaQuery.data!.items;

  const filtered = brands.filter((b) => {
    const matchSearch = !search || b.name.toLowerCase().includes(search.toLowerCase()) || b.id.includes(search.toLowerCase());
    const matchPublished =
      filterPublished === 'all' ||
      (filterPublished === 'published' && b.published) ||
      (filterPublished === 'draft' && !b.published);
    return matchSearch && matchPublished;
  });

  function openNew() {
    setPanel({ form: emptyForm(), isNew: true });
  }

  function openEdit(b: BrandRow) {
    setPanel({
      form: {
        id: b.id,
        name: b.name,
        description: b.description,
        tagline: b.tagline ?? null,
        logoMediaId: b.logoMediaId ?? null,
        categories: b.categories.map((c) => c.categorySlug),
        published: b.published,
        sort: b.sort,
      },
      isNew: false,
    });
  }

  async function onSaved() {
    await client.invalidateQueries({ queryKey: ['reference'] });
    setPanel(null);
  }

  // Helper: category name from slug
  const catName = (slug: string) => {
    const c = categories.find((x) => x.slug === slug);
    return c ? (ar ? c.title.ar : c.title.en) : slug;
  };

  // Logo preview helper
  const logoFor = (logoMediaId: string | null | undefined) =>
    mediaItems.find((m) => m.id === logoMediaId);

  return (
    <div className="bm-root">
      {/* Header */}
      <div className="bm-header">
        <div>
          <h1 className="bm-heading">{say('إدارة العلامات التجارية', 'Brands Management')}</h1>
          <p className="bm-subheading">
            {say(`${brands.length} علامة تجارية`, `${brands.length} brands`)}
          </p>
        </div>
        <button className="button primary bm-add-btn" onClick={openNew}>
          <Plus size={16} />
          {say('إضافة علامة', 'Add brand')}
        </button>
      </div>

      {/* Filters */}
      <div className="bm-toolbar">
        <label className="bm-search-label">
          <input
            className="bm-search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={say('بحث بالاسم أو المعرّف…', 'Search by name or slug…')}
          />
        </label>
        <select
          className="bm-filter-select"
          value={filterPublished}
          onChange={(e) => setFilterPublished(e.target.value as typeof filterPublished)}
        >
          <option value="all">{say('الكل', 'All')}</option>
          <option value="published">{say('منشور', 'Published')}</option>
          <option value="draft">{say('مخفي', 'Hidden')}</option>
        </select>
      </div>

      {/* Brand grid */}
      {filtered.length === 0 ? (
        <div className="bm-empty-state">
          <Building2 size={48} className="bm-empty-icon" />
          <p>{say('لا توجد علامات تجارية تطابق البحث.', 'No brands match your search.')}</p>
          {brands.length === 0 && (
            <button className="button primary" onClick={openNew}>
              <Plus size={16} /> {say('أضف أول علامة تجارية', 'Add your first brand')}
            </button>
          )}
        </div>
      ) : (
        <div className="bm-grid">
          {filtered.map((b) => {
            const logo = logoFor(b.logoMediaId);
            return (
              <article key={b.id} className={`bm-card ${b.published ? '' : 'bm-card--draft'}`}>
                <div className="bm-card-logo">
                  {logo ? (
                    <img src={imageUrl(logo.originalPath)} alt={b.name} />
                  ) : (
                    <div className="bm-card-logo-placeholder">
                      <Building2 size={28} />
                    </div>
                  )}
                </div>
                <div className="bm-card-body">
                  <div className="bm-card-top">
                    <h3 className="bm-card-name">{b.name}</h3>
                    <span className={`bm-badge ${b.published ? 'bm-badge--pub' : 'bm-badge--draft'}`}>
                      {b.published ? say('منشور', 'Published') : say('مسودة', 'Draft')}
                    </span>
                  </div>
                  <p className="bm-card-slug">/{b.id}</p>

                  {/* Categories */}
                  {b.categories.length > 0 && (
                    <div className="bm-card-cats">
                      {b.categories.slice(0, 3).map((c) => (
                        <span key={c.categorySlug} className="bm-cat-chip">
                          {catName(c.categorySlug)}
                        </span>
                      ))}
                      {b.categories.length > 3 && (
                        <span className="bm-cat-chip bm-cat-chip--more">
                          +{b.categories.length - 3}
                        </span>
                      )}
                    </div>
                  )}
                  {b.categories.length === 0 && (
                    <p className="bm-card-no-cats">{say('بدون تصنيفات', 'No categories assigned')}</p>
                  )}

                  <div className="bm-card-meta">
                    <span><ArrowUpDown size={12} /> {say('الترتيب', 'Sort')}: {b.sort}</span>
                  </div>
                </div>
                <div className="bm-card-actions">
                  <button
                    className="button secondary bm-edit-btn"
                    onClick={() => openEdit(b)}
                  >
                    <Edit3 size={14} />
                    {say('تعديل', 'Edit')}
                  </button>
                  <button
                    className="button subtle danger-hover"
                    onClick={() => { setDeleteError(''); setDeleteConfirm(b.id); }}
                    title={say('حذف العلامة', 'Delete brand')}
                  >
                    <Trash2 size={14} />
                    {say('حذف', 'Delete')}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Form panel */}
      {panel && (
        <BrandFormPanel
          form={panel.form}
          categories={categories}
          mediaItems={mediaItems}
          isNew={panel.isNew}
          ar={ar}
          onClose={() => setPanel(null)}
          onSaved={onSaved}
          onDelete={(id) => { setDeleteError(""); setDeleteConfirm(id); }}
        />
      )}

      {deleteConfirm && (
        <Modal
          open={Boolean(deleteConfirm)}
          onOpenChange={(open) => !open && setDeleteConfirm(null)}
          title={say('تأكيد حذف العلامة التجارية', 'Confirm Delete Brand')}
          description={say(
            'هل أنت متأكد من رغبتك في حذف هذه العلامة التجارية؟ لن تتمكن من حذفها إذا كانت مرتبطة بمنتجات موجودة.',
            'Are you sure you want to delete this brand? You cannot delete it if products are associated with it.'
          )}
        >
          {deleteError && <div style={{ marginBottom: 16 }}><ErrorBox code={deleteError} /></div>}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
            <button type="button" className="button secondary" onClick={() => setDeleteConfirm(null)} disabled={busy}>
              {say('إلغاء', 'Cancel')}
            </button>
            <button
              type="button"
              className="button danger"
              disabled={busy}
              onClick={() => handleDelete(deleteConfirm)}
            >
              {busy ? say('جارٍ الحذف…', 'Deleting…') : say('تأكيد الحذف', 'Delete Now')}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
