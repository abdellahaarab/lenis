import { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { ProductEditSchema, can, type ProductEdit, type SpecFieldInput } from '@aljeel/shared';
import './commerce.css';
import { Plus, Search, X, Layers, FileSpreadsheet, ChevronLeft, ChevronRight, CheckCircle2, Archive, FolderPlus, Edit3, ArrowRight, ArrowLeft, Package, PackageSearch, ExternalLink, Check, AlertTriangle, RotateCcw, Sparkles, LayoutGrid, List, SlidersHorizontal, Image as ImageIcon, ShieldCheck, Trash2, Copy, Wand2, ImagePlus, Briefcase, Gamepad2, Zap, FolderTree, Filter, Tag, Laptop, Tv, HardDrive, BatteryCharging, Wifi, DollarSign } from 'lucide-react';
import { api, ApiError } from './api';
import { useI18n } from './i18n';
import { useSession } from './App';
import { Loading, ErrorBox, Modal } from './components';
import { ValueFields } from './ValueFields';
import { VisualMediaPickerModal } from './VisualMediaPickerModal';
import { VisualProductPickerModal } from './VisualProductPickerModal';
import { VisualCategoryPickerModal } from './VisualCategoryPickerModal';
import { AmazonImageModal } from './AmazonImageModal';

type Ref = {
  products: { id: string; title: { ar: string; en: string } }[];
  brands: { id: string; name: string; published: boolean }[];
  categories: { slug: string; parentSlug: string | null; productTypeId: string | null; title: { ar: string; en: string } }[];
  types: { id: string; title: { ar: string; en: string }; fields: SpecFieldInput[] }[];
  variants: { id: string; productId: string; active: boolean; specs: Record<string, unknown>; options: Record<string, unknown> }[];
  collections: { id: string; title: { ar: string; en: string } }[];
};
type Media = { id: string; originalPath: string; altAr: string; altEn: string };

function CompatibilityEvidence({ productId, products }: { productId: string; products: Ref['products'] }) {
  const { lang } = useI18n(), ar = lang === 'ar';
  const [other, setOther] = useState(products[0]?.id ?? '');
  const [otherPickerOpen, setOtherPickerOpen] = useState(false);
  const [port, setPort] = useState('');
  const [source, setSource] = useState('');
  const [watts, setWatts] = useState('');
  const [verified, setVerified] = useState(false);
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  const selectedProduct = products.find(p => p.id === other);

  return (
    <fieldset className="evidence-box">
      <legend>{ar ? 'توثيق التوافق' : 'Compatibility evidence'}</legend>
      <ErrorBox code={error} />
      <div style={{ marginBottom: '12px' }}>
        <span style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--muted)', marginBottom: '6px' }}>
          {ar ? 'المنتج المقترح للمطابقة والتوافق' : 'Suggested Product for Compatibility'}
        </span>
        {selectedProduct ? (
          <div className="visual-entity-trigger-card">
            <div className="visual-entity-info-side">
              <div className="visual-entity-thumb">
                <Package size={20} style={{ color: 'var(--primary)' }} />
              </div>
              <div className="visual-entity-texts">
                <span className="visual-entity-title">{selectedProduct.title[lang]}</span>
                <span className="visual-entity-subtitle">{selectedProduct.id}</span>
              </div>
            </div>
            <div className="visual-entity-actions">
              <button
                type="button"
                className="button secondary sm"
                onClick={() => setOtherPickerOpen(true)}
              >
                {ar ? 'تغيير المنتج' : 'Change'}
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            className="visual-entity-empty-btn"
            onClick={() => setOtherPickerOpen(true)}
          >
            <Package size={16} />
            <span>{ar ? 'اختيار منتج متوافق من الكتالوج' : 'Pick Compatible Product'}</span>
          </button>
        )}
      </div>

      <VisualProductPickerModal
        open={otherPickerOpen}
        onOpenChange={setOtherPickerOpen}
        products={products.map(p => ({
          id: p.id,
          title: p.title,
        }))}
        selectedProductId={other}
        onSelect={(id) => setOther(id)}
        title={ar ? 'اختيار منتج متوافق' : 'Select Compatible Product'}
      />
      <div className="fields-grid">
        <label>
          {ar ? 'نوع المنفذ أو المعيار' : 'Port or standard'}
          <input value={port} onChange={e => setPort(e.target.value)} />
        </label>
        <label>
          {ar ? 'قدرة الطاقة إن انطبقت (W)' : 'Power if applicable (W)'}
          <input inputMode="decimal" value={watts} onChange={e => setWatts(e.target.value)} />
        </label>
        <label>
          {ar ? 'مصدر التحقق أو رابط الدليل' : 'Verification source or evidence link'}
          <input value={source} onChange={e => setSource(e.target.value)} />
        </label>
        <label>
          {ar ? 'ملاحظات' : 'Notes'}
          <input value={note} onChange={e => setNote(e.target.value)} />
        </label>
      </div>
      <label className="checkbox-label">
        <input type="checkbox" checked={verified} onChange={e => setVerified(e.target.checked)} />
        <span>{ar ? 'تم التحقق بناءً على الدليل المدخل' : 'Verified against the supplied evidence'}</span>
      </label>
      <div className="form-actions">
        <button
          type="button"
          className="button secondary"
          disabled={!other || !port || source.trim().length < 5}
          onClick={async () => {
            setError('');
            setSaved(false);
            try {
              await api('/commerce/compatibility', {
                method: 'POST',
                body: { productId, otherProductId: other, portType: port, source, watts: watts || null, verified, note }
              });
              setSaved(true);
            } catch (e) {
              setError(e instanceof ApiError ? e.code : 'failed');
            }
          }}
        >
          {ar ? 'حفظ دليل التوافق' : 'Save compatibility evidence'}
        </button>
        {saved && <span className="save-indicator" role="status"><Check size={16} />{ar ? 'تم حفظ الدليل' : 'Evidence saved'}</span>}
      </div>
    </fieldset>
  );
}

function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 90) || 'item-' + Math.floor(Math.random() * 10000);
}

function safeImageUrl(img: unknown): string {
  if (!img) return '';
  if (typeof img === 'string') return img.replace('/api/media/', '/api/admin/media/');
  if (typeof img === 'object') {
    const raw = (img as Record<string, unknown>).media
      ? ((img as Record<string, unknown>).media as Record<string, unknown>).originalPath
      : (img as Record<string, unknown>).originalPath || (img as Record<string, unknown>).path;
    if (typeof raw === 'string') return raw.replace('/api/media/', '/api/admin/media/');
  }
  return '';
}



function autoComposeTitle(brand: string, model: string): { ar: string; en: string } {
  const cleanBrand = brand.trim();
  const cleanModel = model.trim();
  return {
    ar: cleanModel ? `لابتوب ${cleanBrand} ${cleanModel}`.trim() : `لابتوب ${cleanBrand}`.trim(),
    en: cleanModel ? `${cleanBrand} ${cleanModel} Laptop`.trim() : `${cleanBrand} Laptop`.trim()
  };
}

type StarterTemplate = {
  id: string;
  icon: typeof Briefcase;
  title: { ar: string; en: string };
  desc: { ar: string; en: string };
  apply: (curr: ProductEdit) => Partial<ProductEdit>;
};

const starterTemplates: StarterTemplate[] = [
  {
    id: 'business',
    icon: Briefcase,
    title: { ar: 'لابتوب أعمال وإنتاجية', en: 'Business & Office' },
    desc: { ar: 'متانة عالية وبطارية طويلة للشركات والمبرمجين', en: 'High durability & battery for work' },
    apply: (curr) => ({
      condition: 'new',
      warrantyMonths: 12,
      tags: Array.from(new Set([...curr.tags, 'للأعمال', 'خفيف الوزن', 'بطارية ممتازة', 'كيبورد مضيء', 'شاحن Type-C'])),
      bestFor: Array.from(new Set([...curr.bestFor, 'إدارة الأعمال والمحاسبة', 'البرمجة والتطوير', 'الطلاب والجامعات'])),
      summary: {
        ar: curr.summary.ar || 'حاسوب محمول فائق الكفاءة مخصص لبيئة الأعمال الاحترافية، يمتاز بالمتانة وعمر البطارية الطويل وسرعة إنجاز المهام.',
        en: curr.summary.en || 'High-efficiency laptop designed for business professionals, offering dependable build quality, long battery life, and smooth performance.'
      }
    })
  },
  {
    id: 'gaming',
    icon: Gamepad2,
    title: { ar: 'لابتوب ألعاب ومونتاج', en: 'Gaming & Creators' },
    desc: { ar: 'كرت شاشة مخصص وتبريد متطور للجرافيكس والرندر', en: 'Dedicated GPU & cooling for rendering' },
    apply: (curr) => ({
      condition: 'new',
      warrantyMonths: 12,
      tags: Array.from(new Set([...curr.tags, 'كرت شاشة منفصل', 'شاشة 144Hz+', 'تبريد احترافي', 'أداء رسومي فائق'])),
      bestFor: Array.from(new Set([...curr.bestFor, 'الألعاب الثقيلة', 'المونتاج وصناعة المحتوى', 'التصميم الهندسي 3D'])),
      summary: {
        ar: curr.summary.ar || 'أداء قوي مع كرت شاشة مخصص وتبريد متطور لتشغيل أحدث الألعاب وأثقل برامج التصميم والمونتاج بكل سلاسة.',
        en: curr.summary.en || 'Powerful laptop featuring dedicated graphics and advanced thermals to handle modern games and demanding creative software.'
      }
    })
  },
  {
    id: 'ultrabook',
    icon: Zap,
    title: { ar: 'ألترا بوك فاخر ونحيف', en: 'Slim Ultrabook' },
    desc: { ar: 'هيكل نحيف وخفيف جداً مع شاشة دقيقة للتنقل', en: 'Ultra-thin, premium screen for mobility' },
    apply: (curr) => ({
      condition: 'new',
      warrantyMonths: 12,
      tags: Array.from(new Set([...curr.tags, 'نحيف جداً', 'هيكل ألومنيوم', 'شاشة دقيقة', 'شحن سريع'])),
      bestFor: Array.from(new Set([...curr.bestFor, 'التنقل والسفر', 'الاجتماعات والعروض', 'الاستخدام المكتبي اليومي'])),
      summary: {
        ar: curr.summary.ar || 'تصميم نحيف خفيف الوزن بهيكل معدني راقٍ وشاشة مريحة للعين، صُمم خصيصاً للتنقل الدائم وسهولة الحمل.',
        en: curr.summary.en || 'Ultra-slim lightweight laptop with premium metal construction, crafted for maximum portability and all-day mobile work.'
      }
    })
  }
];

const popularTags = [
  'شاشة لمس', 'كيبورد مضيء', 'بصمة إصبَع', 'شاحن Type-C', 'هيكل معدني',
  'منفذ Thunderbolt', 'صوت نقي', 'كاميرا خصوصية', 'خفيف الوزن', 'بطارية ممتازة', 'شاشة 144Hz+'
];

const popularBestFor = [
  'البرمجة والتطوير', 'إدارة الأعمال والمحاسبة', 'التصميم والمونتاج',
  'الطلاب والجامعات', 'الألعاب والجرافيكس', 'التنقل والسفر والاجتماعات'
];

function ProductSpecEditor({
  specs,
  fields,
  activeTemplate,
  inheritedTemplate,
  selectedTypeId,
  allTypes,
  onSelectType,
  onUpdateSpec,
  onRemoveSpec,
  onApplyDefaults
}: {
  specs: Record<string, unknown>;
  fields: SpecFieldInput[];
  activeTemplate?: { id: string; title: { ar: string; en: string }; fields: SpecFieldInput[] };
  inheritedTemplate?: { id: string; title: { ar: string; en: string } };
  selectedTypeId?: string | null;
  allTypes: { id: string; title: { ar: string; en: string }; fields: SpecFieldInput[] }[];
  onSelectType: (typeId: string | null) => void;
  onUpdateSpec: (key: string, value: unknown) => void;
  onRemoveSpec: (key: string) => void;
  onApplyDefaults: () => void;
}) {
  const { lang, showEnglishFields } = useI18n(), ar = lang === 'ar', say = (a: string, e: string) => ar ? a : e;
  const [newCustomKey, setNewCustomKey] = useState('');
  const [newCustomType, setNewCustomType] = useState<'text' | 'number' | 'boolean'>('text');
  const [newCustomVal, setNewCustomVal] = useState('');

  // Icon for active template
  let TemplateIcon = SlidersHorizontal;
  if (activeTemplate?.id.includes('laptop') || activeTemplate?.id.includes('desktop')) TemplateIcon = Laptop;
  else if (activeTemplate?.id.includes('display') || activeTemplate?.id.includes('screen')) TemplateIcon = Tv;
  else if (activeTemplate?.id.includes('storage') || activeTemplate?.id.includes('disk')) TemplateIcon = HardDrive;
  else if (activeTemplate?.id.includes('power') || activeTemplate?.id.includes('battery')) TemplateIcon = BatteryCharging;
  else if (activeTemplate?.id.includes('network') || activeTemplate?.id.includes('wifi')) TemplateIcon = Wifi;

  // Extra specs not defined in active template
  const templateKeys = new Set(fields.map(f => f.key));
  const extraKeys = Object.keys(specs).filter(k => !templateKeys.has(k) && !k.startsWith('_'));

  // Quick Assistant category detection
  const isLaptopOrPc = Boolean(activeTemplate?.id === 'laptops' || activeTemplate?.id === 'desktops' || fields.some(f => f.key === 'ramGB' || f.key === 'cpu'));
  const isDisplay = Boolean(activeTemplate?.id === 'displays' || fields.some(f => f.key === 'sizeInch' || f.key === 'refreshHz'));
  const isStorage = Boolean(activeTemplate?.id === 'storage' || fields.some(f => f.key === 'capacityGB' || f.key === 'storageGB'));

  return (
    <div className="product-specs-editor-wrap">
      {/* 1. Template Status & Switcher Banner */}
      <div className="specs-template-banner">
        <div className="specs-template-info">
          <div className="specs-template-icon">
            <TemplateIcon size={20} />
          </div>
          <div className="specs-template-title-text">
            <strong>
              <span>{activeTemplate ? (activeTemplate.title[lang] || activeTemplate.title.ar) : say('بدون قالب مواصفات', 'No Spec Template')}</span>
              {selectedTypeId ? (
                <span className="spec-badge-pill" style={{ background: 'rgba(99, 102, 241, 0.1)', color: '#6366f1' }}>
                  {say('مخصص لهذا المنتج', 'Product Custom')}
                </span>
              ) : (
                <span className="spec-badge-pill" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>
                  {inheritedTemplate ? `${say('موروث من الفئة', 'Inherited')} (${inheritedTemplate.title[lang] || inheritedTemplate.title.ar})` : say('موروث من الفئة', 'Inherited from Category')}
                </span>
              )}
            </strong>
            <small>
              {fields.length} {say('مواصفة معرفة في هذا القالب', 'specs defined in template')}
              {activeTemplate ? ` · ${say('المعرف:', 'ID:')} ${activeTemplate.id}` : ''}
            </small>
          </div>
        </div>

        <div className="specs-template-controls">
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', margin: 0 }}>
            <span style={{ fontWeight: 600, color: 'var(--muted)', fontSize: '12px' }}>{say('تغيير القالب:', 'Change Template:')}</span>
              <select
                className="specs-template-select"
                value={selectedTypeId ?? ''}
                onChange={e => onSelectType(e.target.value && /^[a-z0-9][a-z0-9-]{0,99}$/.test(e.target.value) ? e.target.value : null)}
              >
                <option value="">
                  {inheritedTemplate ? `${say('موروث من الفئة', 'Inherited')} (${inheritedTemplate.title[lang] || inheritedTemplate.title.ar})` : say('موروث من الفئة (تلقائي)', 'Inherit from Category')}
                </option>
                {allTypes.filter(t => /^[a-z0-9][a-z0-9-]{0,99}$/.test(t.id)).map(t => (
                  <option key={t.id} value={t.id}>
                    {t.title[lang] || t.title.ar} ({t.id})
                  </option>
                ))}
              </select>
          </label>

          <Link
            to="/types"
            target="_blank"
            rel="noopener noreferrer"
            className="button secondary sm"
            title={say('إدارة وتخصيص قوالب المواصفات في نافذة جديدة', 'Manage templates in types hub')}
          >
            <ExternalLink size={13} />
            <span>{say('تخصيص القوالب', 'Types Hub')}</span>
          </Link>
        </div>
      </div>

      {/* 2. Adaptive Quick Specs Assistant */}
      {(isLaptopOrPc || isDisplay || isStorage || fields.some(f => f.options && f.options.length > 0)) && (
        <div className="adaptive-assistant-wrap">
          <div className="assistant-top-row">
            <div className="assistant-top-title">
              <Sparkles size={16} />
              <span>{say('مساعد الإدخال السريع (بنقرة واحدة)', 'Quick Click Assistant')}</span>
            </div>
            {fields.length > 0 && (
              <button
                type="button"
                className="button subtle sm"
                style={{ fontSize: '11.5px', gap: '4px' }}
                onClick={onApplyDefaults}
                title={say('تهيئة الحقول الفارغة بقيم افتراضية لتسهيل الإدخال', 'Fill empty fields')}
              >
                <Wand2 size={13} />
                <span>{say('تعبئة الحقول الافتراضية', 'Populate Defaults')}</span>
              </button>
            )}
          </div>

          <div className="specs-chip-groups">
            {/* Laptops & PC Assistant */}
            {isLaptopOrPc && (
              <>
                <div className="spec-chip-group">
                  <span className="chip-group-label">{ar ? 'سعة الرام (RAM):' : 'RAM:'}</span>
                  <div className="chips-row">
                    {[8, 16, 32, 64].map(gb => (
                      <button
                        key={gb}
                        type="button"
                        className={`spec-helper-chip ${specs.ramGB === gb ? 'active' : ''}`}
                        onClick={() => onUpdateSpec('ramGB', gb)}
                      >
                        {gb} GB
                      </button>
                    ))}
                  </div>
                </div>

                <div className="spec-chip-group">
                  <span className="chip-group-label">{ar ? 'التخزين (Storage):' : 'Storage:'}</span>
                  <div className="chips-row">
                    {[
                      { val: 256, label: '256 GB' },
                      { val: 512, label: '512 GB' },
                      { val: 1024, label: '1 TB' },
                      { val: 2048, label: '2 TB' }
                    ].map(s => (
                      <button
                        key={s.val}
                        type="button"
                        className={`spec-helper-chip ${specs.storageGB === s.val ? 'active' : ''}`}
                        onClick={() => {
                          onUpdateSpec('storageGB', s.val);
                          if (!specs.storageType) onUpdateSpec('storageType', 'NVMe M.2 SSD');
                        }}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="spec-chip-group">
                  <span className="chip-group-label">{ar ? 'المعالج (CPU):' : 'CPU:'}</span>
                  <div className="chips-row">
                    {['Intel Core i5', 'Intel Core i7', 'Intel Core i9', 'AMD Ryzen 5', 'AMD Ryzen 7', 'Apple M2', 'Apple M3'].map(cpu => (
                      <button
                        key={cpu}
                        type="button"
                        className={`spec-helper-chip ${typeof specs.cpu === 'string' && (specs.cpu as string).includes(cpu) ? 'active' : ''}`}
                        onClick={() => onUpdateSpec('cpu', cpu)}
                      >
                        {cpu}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="spec-chip-group">
                  <span className="chip-group-label">{ar ? 'صحة البطارية (%):' : 'Battery:'}</span>
                  <div className="chips-row">
                    {[100, 95, 90, 85].map(pct => (
                      <button
                        key={pct}
                        type="button"
                        className={`spec-helper-chip ${specs.batteryHealthPct === pct ? 'active' : ''}`}
                        onClick={() => onUpdateSpec('batteryHealthPct', pct)}
                      >
                        {pct}%
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Displays Assistant */}
            {isDisplay && !isLaptopOrPc && (
              <>
                <div className="spec-chip-group">
                  <span className="chip-group-label">{ar ? 'المقاس (بوصة):' : 'Size:'}</span>
                  <div className="chips-row">
                    {[24, 27, 32, 34].map(sz => (
                      <button
                        key={sz}
                        type="button"
                        className={`spec-helper-chip ${specs.sizeInch === sz ? 'active' : ''}`}
                        onClick={() => onUpdateSpec('sizeInch', sz)}
                      >
                        {sz}"
                      </button>
                    ))}
                  </div>
                </div>

                <div className="spec-chip-group">
                  <span className="chip-group-label">{ar ? 'معدل التحديث:' : 'Refresh:'}</span>
                  <div className="chips-row">
                    {[60, 100, 144, 165, 240].map(hz => (
                      <button
                        key={hz}
                        type="button"
                        className={`spec-helper-chip ${specs.refreshHz === hz ? 'active' : ''}`}
                        onClick={() => onUpdateSpec('refreshHz', hz)}
                      >
                        {hz} Hz
                      </button>
                    ))}
                  </div>
                </div>

                <div className="spec-chip-group">
                  <span className="chip-group-label">{ar ? 'الدقة:' : 'Resolution:'}</span>
                  <div className="chips-row">
                    {['1080p Full HD', '2K QHD (1440p)', '4K UHD (2160p)'].map(res => (
                      <button
                        key={res}
                        type="button"
                        className={`spec-helper-chip ${specs.resolution === res ? 'active' : ''}`}
                        onClick={() => onUpdateSpec('resolution', res)}
                      >
                        {res}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Storage Assistant */}
            {isStorage && !isLaptopOrPc && (
              <>
                <div className="spec-chip-group">
                  <span className="chip-group-label">{ar ? 'السعة:' : 'Capacity:'}</span>
                  <div className="chips-row">
                    {[
                      { val: 256, label: '256 GB' },
                      { val: 512, label: '512 GB' },
                      { val: 1024, label: '1 TB' },
                      { val: 2048, label: '2 TB' },
                      { val: 4096, label: '4 TB' }
                    ].map(cap => (
                      <button
                        key={cap.val}
                        type="button"
                        className={`spec-helper-chip ${specs.capacityGB === cap.val || specs.storageGB === cap.val ? 'active' : ''}`}
                        onClick={() => {
                          onUpdateSpec('capacityGB', cap.val);
                          onUpdateSpec('storageGB', cap.val);
                        }}
                      >
                        {cap.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="spec-chip-group">
                  <span className="chip-group-label">{ar ? 'الهيئة:' : 'Form Factor:'}</span>
                  <div className="chips-row">
                    {['M.2 2280 NVMe', '2.5 inch SATA SSD', 'External Portable SSD', '3.5 inch HDD'].map(ff => (
                      <button
                        key={ff}
                        type="button"
                        className={`spec-helper-chip ${specs.storageForm === ff ? 'active' : ''}`}
                        onClick={() => onUpdateSpec('storageForm', ff)}
                      >
                        {ff}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Dynamic chips for any options field if not covered */}
            {!isLaptopOrPc && !isDisplay && !isStorage && fields.filter(f => f.options && f.options.length > 0).slice(0, 3).map(f => (
              <div className="spec-chip-group" key={f.key}>
                <span className="chip-group-label">{f.title[lang] || f.title.ar}:</span>
                <div className="chips-row">
                  {f.options.map(opt => (
                    <button
                      key={opt}
                      type="button"
                      className={`spec-helper-chip ${specs[f.key] === opt || (Array.isArray(specs[f.key]) && (specs[f.key] as string[]).includes(opt)) ? 'active' : ''}`}
                      onClick={() => {
                        if (f.valueType === 'multi') {
                          const currentArr = Array.isArray(specs[f.key]) ? (specs[f.key] as string[]) : [];
                          const nextArr = currentArr.includes(opt) ? currentArr.filter(x => x !== opt) : [...currentArr, opt];
                          onUpdateSpec(f.key, nextArr);
                        } else {
                          onUpdateSpec(f.key, opt);
                        }
                      }}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3. Main Structured Template Fields Form */}
      {fields.length === 0 ? (
        <div className="card" style={{ padding: '32px 20px', textAlign: 'center' }}>
          <Layers size={36} style={{ color: 'var(--muted)', margin: '0 auto 10px', opacity: 0.5 }} />
          <h4 style={{ margin: '0 0 6px', fontSize: '15px' }}>{say('لا يوجد قالب مواصفات نشط لهذه الفئة', 'No Active Spec Template')}</h4>
          <p className="text-muted" style={{ margin: '0 0 16px', fontSize: '13px', maxWidth: '480px', marginInline: 'auto' }}>
            {say(
              'يمكنك اختيار قالب مناسب من القائمة المنسدلة أعلاه لتنظيم وتوحيد مواصفات المنتج وتفعيل فلاتر المتجر التلقائية.',
              'Select a template from the dropdown above to standardize product attributes and activate storefront filters.'
            )}
          </p>
        </div>
      ) : (
        <div className="specs-form-grid">
          {fields.map(f => {
            const val = specs[f.key];
            const hasVal = val !== undefined && val !== null && val !== '';

            return (
              <div className={`spec-form-card ${hasVal ? 'is-filled' : ''}`} key={f.key}>
                {/* Header */}
                <div className="spec-form-card-header">
                  <div className="spec-form-label-side">
                    <label className="spec-form-label" htmlFor={`spec-input-${f.key}`}>
                      <span>{f.title[lang] || f.title.ar}</span>
                      {showEnglishFields && f.title.en && f.title.en !== f.title.ar && (
                        <small style={{ color: 'var(--muted)', fontWeight: 500 }}>({f.title.en})</small>
                      )}
                      {f.required && <span className="spec-req-star" title={say('حقل إلزامي', 'Required')}>*</span>}
                    </label>
                    <span className="spec-form-key-badge" dir="ltr">{f.key}</span>
                  </div>

                  <div className="spec-form-meta-badges">
                    {f.unit && <span className="spec-unit-pill" dir="ltr">{f.unit}</span>}
                    {f.filterable && (
                      <span className="spec-filter-pill" title={say('مفعل كفلتر في المتجر', 'Storefront filter')}>
                        <Filter size={10} />
                        <span>{say('فلتر', 'Filter')}</span>
                      </span>
                    )}
                    {f.card && (
                      <span className="spec-badge-pill" title={say('يظهر في بطاقة المنتج', 'Badge on card')}>
                        <Tag size={10} />
                      </span>
                    )}
                    {hasVal && (
                      <button
                        type="button"
                        className="spec-clear-val-btn"
                        title={say('تفريغ القيمة', 'Clear')}
                        onClick={() => onRemoveSpec(f.key)}
                      >
                        <X size={13} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Input Controls */}
                <div className="spec-form-card-input">
                  {/* Number Input */}
                  {f.valueType === 'number' && (
                    <div className="spec-number-input-wrap">
                      <input
                        id={`spec-input-${f.key}`}
                        type="number"
                        step="any"
                        dir="ltr"
                        placeholder={f.unit ? `0 ${f.unit}` : '0'}
                        value={val === undefined || val === null ? '' : String(val)}
                        onChange={e => {
                          const raw = e.target.value;
                          onUpdateSpec(f.key, raw === '' ? undefined : Number(raw));
                        }}
                      />
                      {f.unit && <span className="spec-number-unit-tag" dir="ltr">{f.unit}</span>}
                    </div>
                  )}

                  {/* Text Input */}
                  {f.valueType === 'text' && (
                    <input
                      id={`spec-input-${f.key}`}
                      type="text"
                      placeholder={say(`أدخل ${f.title[lang] || f.title.ar}…`, `Enter ${f.title[lang] || f.title.ar}…`)}
                      value={val === undefined || val === null ? '' : String(val)}
                      onChange={e => onUpdateSpec(f.key, e.target.value)}
                    />
                  )}

                  {/* Boolean Input */}
                  {f.valueType === 'boolean' && (
                    <div className="spec-bool-toggles">
                      <button
                        type="button"
                        className={`spec-bool-btn ${val === true ? 'active-true' : ''}`}
                        onClick={() => onUpdateSpec(f.key, val === true ? undefined : true)}
                      >
                        <Check size={14} />
                        <span>{say('نعم / مدعوم', 'Yes / Supported')}</span>
                      </button>
                      <button
                        type="button"
                        className={`spec-bool-btn ${val === false ? 'active-false' : ''}`}
                        onClick={() => onUpdateSpec(f.key, val === false ? undefined : false)}
                      >
                        <X size={14} />
                        <span>{say('لا / غير مدعوم', 'No / Unsupported')}</span>
                      </button>
                    </div>
                  )}

                  {/* Single Choice Input */}
                  {f.valueType === 'single' && (
                    <div>
                      <select
                        id={`spec-input-${f.key}`}
                        value={String(val ?? '')}
                        onChange={e => onUpdateSpec(f.key, e.target.value || undefined)}
                      >
                        <option value="">{say('-- اختر من القائمة --', '-- Select option --')}</option>
                        {(f.options || []).map(opt => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>

                      {/* Quick chips if options <= 8 */}
                      {f.options && f.options.length > 0 && f.options.length <= 8 && (
                        <div className="spec-options-chips">
                          {f.options.map(opt => (
                            <button
                              key={opt}
                              type="button"
                              className={`spec-opt-chip ${val === opt ? 'selected' : ''}`}
                              onClick={() => onUpdateSpec(f.key, val === opt ? undefined : opt)}
                            >
                              {opt}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Multi Choice Input */}
                  {f.valueType === 'multi' && (
                    <div>
                      <div className="spec-options-chips">
                        {(f.options || []).map(opt => {
                          const isChecked = Array.isArray(val) && (val as string[]).includes(opt);
                          return (
                            <button
                              key={opt}
                              type="button"
                              className={`spec-opt-chip ${isChecked ? 'selected' : ''}`}
                              onClick={() => {
                                const currentList = Array.isArray(val) ? (val as string[]) : [];
                                const nextList = isChecked ? currentList.filter(x => x !== opt) : [...currentList, opt];
                                onUpdateSpec(f.key, nextList.length > 0 ? nextList : undefined);
                              }}
                            >
                              {isChecked ? '✓ ' : ''}{opt}
                            </button>
                          );
                        })}
                      </div>
                      {(!f.options || f.options.length === 0) && (
                        <input
                          type="text"
                          placeholder={say('قيم مفصولة بفواصل (أدخل خيارات متعددة)', 'Comma separated values')}
                          value={Array.isArray(val) ? (val as string[]).join(', ') : (val ? String(val) : '')}
                          onChange={e => {
                            const arr = e.target.value.split(',').map(s => s.trim()).filter(Boolean);
                            onUpdateSpec(f.key, arr.length > 0 ? arr : undefined);
                          }}
                        />
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 4. Extra Custom Specifications Section */}
      <div className="extra-specs-card">
        <div className="extra-specs-header">
          <h4>
            <Tag size={15} style={{ color: '#a855f7' }} />
            <span>{say('مواصفات إضافية خاصة بالمنتج', 'Additional Custom Product Specifications')}</span>
            <small style={{ color: 'var(--muted)', fontWeight: 500 }}>({extraKeys.length})</small>
          </h4>
          <span style={{ fontSize: '11.5px', color: 'var(--muted)' }}>
            {say('يمكنك إضافة أي مواصفة فريدة لهذا المنتج لا يشملها القالب العام.', 'Add ad-hoc specifications unique to this product.')}
          </span>
        </div>

        {extraKeys.length > 0 && (
          <div className="extra-specs-list">
            {extraKeys.map(key => {
              const val = specs[key];
              return (
                <div className="extra-spec-item" key={key}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0 }}>
                    <strong style={{ fontSize: '12.5px' }} dir="ltr">{key}</strong>
                    <span style={{ fontSize: '11px', color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {typeof val === 'boolean' ? (val ? 'نعم' : 'لا') : String(val)}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <input
                      type={typeof val === 'number' ? 'number' : 'text'}
                      style={{ width: '120px' }}
                      value={val === undefined || val === null ? '' : String(val)}
                      onChange={e => {
                        const raw = e.target.value;
                        onUpdateSpec(key, typeof val === 'number' ? (raw === '' ? undefined : Number(raw)) : raw);
                      }}
                    />
                    <button
                      type="button"
                      className="button secondary sm danger-tone"
                      style={{ padding: '4px 6px', minHeight: '30px' }}
                      onClick={() => onRemoveSpec(key)}
                      title={say('حذف', 'Remove')}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Add custom spec row */}
        <div className="extra-spec-add-bar">
          <input
            type="text"
            dir="ltr"
            placeholder={say('المفتاح الإنجليزي (مثل color أو weight)', 'Key, e.g. color, warranty')}
            value={newCustomKey}
            onChange={e => setNewCustomKey(e.target.value.replace(/[^a-zA-Z0-9_-]/g, ''))}
          />
          <select
            value={newCustomType}
            onChange={e => setNewCustomType(e.target.value as any)}
          >
            <option value="text">{say('نص', 'Text')}</option>
            <option value="number">{say('رقم', 'Number')}</option>
            <option value="boolean">{say('نعم / لا', 'Boolean')}</option>
          </select>
          <input
            type={newCustomType === 'number' ? 'number' : 'text'}
            placeholder={say('القيمة…', 'Value…')}
            value={newCustomVal}
            onChange={e => setNewCustomVal(e.target.value)}
          />
          <button
            type="button"
            className="button secondary sm"
            disabled={!newCustomKey.trim()}
            onClick={() => {
              const k = newCustomKey.trim();
              if (k) {
                const finalVal = newCustomType === 'number' ? Number(newCustomVal) : newCustomType === 'boolean' ? (newCustomVal === 'true' || newCustomVal === '1') : newCustomVal;
                onUpdateSpec(k, finalVal);
                setNewCustomKey('');
                setNewCustomVal('');
              }
            }}
          >
            <Plus size={14} />
            <span>{say('إضافة مواصفة', 'Add Spec')}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ProductManager() {
  const { lang } = useI18n(), ar = lang === 'ar', say = (a: string, e: string) => ar ? a : e;
  const { user } = useSession(), client = useQueryClient();
  const [searchInput, setSearchInput] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [catFilter, setCatFilter] = useState('');
  const [brandFilter, setBrandFilter] = useState('');
  const [sort, setSort] = useState('updated');
  const [viewMode, setViewMode] = useState<'table' | 'grid'>(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      return 'grid';
    }
    return 'table';
  });
  const [selected, setSelected] = useState<string[]>([]);
  const [collection, setCollection] = useState('');
  const [edit, setEdit] = useState<ProductEdit | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [tab, setTab] = useState('identity');
  const [error, setError] = useState('');
  const [details, setDetails] = useState('');
  const [busy, setBusy] = useState(false);
  const [mediaPickerOpen, setMediaPickerOpen] = useState(false);
  const [_mediaSearch, _setMediaSearch] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<ProductEdit | null>(null);
  const [amazonModalOpen, setAmazonModalOpen] = useState(false);
  const [amazonTargetProduct, setAmazonTargetProduct] = useState<ProductEdit | null>(null);
  const [categoryPickerOpen, setCategoryPickerOpen] = useState(false);

  // Debounce search query so typing does not trigger page reloading or input blur
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQ(searchInput.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const products = useQuery({
    queryKey: ['catalog-products', debouncedQ, page, status, sort],
    queryFn: () => api<{ items: ProductEdit[]; total: number }>(
      '/commerce/products?q=' + encodeURIComponent(debouncedQ) + '&page=' + page + '&sort=' + sort + (status ? '&status=' + status : '')
    ),
    placeholderData: keepPreviousData,
  });
  const ref = useQuery({ queryKey: ['commerce-reference'], queryFn: () => api<Ref>('/commerce/reference'), staleTime: 30_000, gcTime: 5 * 60_000 });
  const media = useQuery({ queryKey: ['media'], queryFn: () => api<{ items: Media[] }>('/media'), staleTime: 60_000, gcTime: 5 * 60_000 });

  // Client-side category and brand filtering if selected
  const displayedItems = useMemo(() => {
    if (!products.data?.items) return [];
    return products.data.items.filter(p => {
      if (catFilter && p.category !== catFilter) return false;
      if (brandFilter) {
        const brandObj = ref.data?.brands.find(b => b.id === brandFilter);
        if (p.brandId !== brandFilter && p.brand !== brandObj?.name) return false;
      }
      return true;
    });
  }, [products.data?.items, catFilter, brandFilter, ref.data?.brands]);

  // Only show full loading spinner when initial data has not loaded yet
  const isInitialLoading = (!products.data && products.isPending) || (!ref.data && ref.isPending) || (!media.data && media.isPending);
  if (isInitialLoading) return <Loading />;
  if (!products.data || !ref.data || !media.data) return <ErrorBox code="disconnected" />;

  const data = ref.data;
  let typeId = edit?.productTypeId, slug = edit?.category;
  const seen = new Set<string>();
  while (!typeId && slug && !seen.has(slug)) {
    seen.add(slug);
    const c = data.categories.find(c => c.slug === slug);
    typeId = c?.productTypeId;
    slug = c?.parentSlug ?? undefined;
  }
  const activeTemplate = data.types.find(t => t.id === typeId);
  const fields = activeTemplate?.fields ?? [];

  // Inherited template from category
  let inheritedTypeId: string | null = null;
  let catSlug = edit?.category;
  const catSeen = new Set<string>();
  while (!inheritedTypeId && catSlug && !catSeen.has(catSlug)) {
    catSeen.add(catSlug);
    const c = data.categories.find(c => c.slug === catSlug);
    inheritedTypeId = c?.productTypeId ?? null;
    catSlug = c?.parentSlug ?? undefined;
  }
  const inheritedTemplate = data.types.find(t => t.id === inheritedTypeId);
  const variants = data.variants.filter(v => v.productId === edit?.id && v.active);
  const missing = edit ? [
    ...(!edit.images.length ? [say('صورة واحدة على الأقل', 'At least one image')] : []),
    ...(!data.brands.find(b => b.id === edit.brandId || b.name === edit.brand)?.published ? [say('علامة منشورة', 'Published brand')] : []),
    ...fields.filter(f => f.required && (variants.length ? variants.some(v => {
      const value = ({ ...edit.specs, ...v.specs, ...v.options })[f.key];
      return value === undefined || value === null || value === '';
    }) : edit.specs[f.key] === undefined)).map(f => f.title[lang])
  ] : [];

  function start(p?: ProductEdit) {
    setEdit(p ?? {
      id: crypto.randomUUID(),
      slug: '',
      category: data.categories[0]?.slug ?? 'laptops',
      brandId: data.brands[0]?.id,
      brand: data.brands[0]?.name ?? '',
      productTypeId: null,
      model: '',
      title: { ar: '', en: '' },
      summary: { ar: '', en: '' },
      condition: 'new',
      status: 'draft',
      warrantyMonths: null,
      price: { usd: null, yer: null, updatedAt: null, negotiable: false },
      stock: 'order',
      specs: {},
      inspection: { passed: false, date: null, notes: { ar: '', en: '' } },
      images: [],
      bestFor: [],
      tags: [],
      compatibleWith: [],
      specSources: [],
      demo: false
    });
    setIsNew(!p);
    setTab('identity');
    setError('');
    setDetails('');
  }

  async function handleDelete(product: ProductEdit) {
    setBusy(true);
    setError('');
    try {
      await api('/products/' + product.id, { method: 'DELETE' });
      await client.invalidateQueries({ queryKey: ['catalog-products'] });
      await client.invalidateQueries({ queryKey: ['commerce-reference'] });
      setDeleteConfirm(null);
      if (edit?.id === product.id) {
        setEdit(null);
      }
    } catch (e) {
      setError(e instanceof ApiError ? e.code : 'failed');
    } finally {
      setBusy(false);
    }
  }

  function cloneProduct(p: ProductEdit) {
    const newId = crypto.randomUUID();
    const newSlug = generateSlug(`${p.slug}-copy-${Math.floor(Math.random() * 1000)}`);
    const cloned: ProductEdit = {
      ...p,
      id: newId,
      slug: newSlug,
      title: {
        ar: `${p.title.ar} (نسخة)`,
        en: `${p.title.en} (Copy)`
      },
      status: 'draft',
      price: { ...p.price, updatedAt: null }
    };
    delete (cloned as any).revision;
    setEdit(cloned);
    setIsNew(true);
    setTab('identity');
    setError('');
    setDetails('');
  }

  const tabList = [
    { id: 'identity', ar: 'الهوية والوصف', en: 'Identity & Copy', icon: Sparkles },
    { id: 'specs', ar: 'المواصفات', en: 'Specifications', icon: SlidersHorizontal },
    { id: 'images', ar: 'الصور', en: 'Images', icon: ImageIcon },
    { id: 'details', ar: 'الفحص والوسوم', en: 'Inspection & Tags', icon: ShieldCheck },
    { id: 'preview', ar: 'المعاينة والنشر', en: 'Preview & Checklist', icon: CheckCircle2 },
  ];
  const tabIndex = Math.max(0, tabList.findIndex(t => t.id === tab));

  async function bulk(action: string) {
    setBusy(true);
    setError('');
    try {
      await api('/commerce/bulk', {
        method: 'POST',
        body: { ids: selected, action, ...(action === 'collection' ? { collectionId: collection } : {}) }
      });
      await client.invalidateQueries({ queryKey: ['catalog-products'] });
      setSelected([]);
    } catch (e) {
      setError(e instanceof ApiError ? e.code : 'failed');
    } finally {
      setBusy(false);
    }
  }

  const totalPages = Math.max(1, Math.ceil(products.data.total / 24));
  const allCurrentIds = displayedItems.map(p => p.id);
  const allSelectedOnPage = allCurrentIds.length > 0 && allCurrentIds.every(id => selected.includes(id));

  const toggleSelectAllPage = () => {
    if (allSelectedOnPage) {
      setSelected(selected.filter(id => !allCurrentIds.includes(id)));
    } else {
      setSelected(Array.from(new Set([...selected, ...allCurrentIds])));
    }
  };

  const statusPills = [
    { id: '', label: say('كل الحالات', 'All') },
    { id: 'published', label: say('منشور', 'Published'), countDot: 'dot-green' },
    { id: 'draft', label: say('مسودة', 'Draft'), countDot: 'dot-amber' },
    { id: 'archived', label: say('مؤرشف', 'Archived'), countDot: 'dot-muted' },
  ];

  const resetAllFilters = () => {
    setSearchInput('');
    setDebouncedQ('');
    setStatus('');
    setCatFilter('');
    setBrandFilter('');
    setPage(1);
  };

  const hasActiveFilters = Boolean(searchInput || debouncedQ || status || catFilter || brandFilter);

  return (
    <div className="product-manager-view">
      {/* Page Header */}
      <div className="page-heading">
        <div className="heading-content">
          <div className="title-row">
            <h1>{say('المنتجات', 'Products')}</h1>
            <span className="count-pill">{products.data.total}</span>
          </div>
        </div>
        <div className="heading-actions">
          <button className="button primary" onClick={() => start()}>
            <Plus size={16} />
            <span>{say('منتج جديد', 'New Product')}</span>
          </button>
          <a
            href="/ar/shop/browser"
            target="_blank"
            rel="noopener noreferrer"
            className="button secondary"
            title={say('معاينة المتجر', 'Storefront')}
          >
            <ExternalLink size={15} />
            <span>{say('المتجر', 'Store')}</span>
          </a>
          <Link className="button secondary" to="/variants" title={say('خيارات SKU', 'Variants')}>
            <Layers size={15} />
            <span>SKU</span>
          </Link>
          <Link className="button secondary" to="/product-updates" title={say('تحديث الأصناف عبر Excel', 'Update products with Excel')}>
            <FileSpreadsheet size={15} />
            <span>{say('تحديث الأصناف', 'Product updates')}</span>
          </Link>
          <button
            type="button"
            className="button secondary amazon-import-btn"
            onClick={() => {
              setAmazonTargetProduct(null);
              setAmazonModalOpen(true);
            }}
            title={say('استيراد من أمازون', 'Import from Amazon')}
          >
            <Sparkles size={15} className="amazon-sparkle-icon" />
            <span>{say('أمازون', 'Amazon')}</span>
          </button>
        </div>
      </div>

      <ErrorBox code={error} />
      {details && <p role="alert" className="commerce-error">{details}</p>}

      {!edit ? (
        <>
          {/* Unified Compact Control Panel */}
          <section className="catalog-control-panel">
            <div className="search-bar-unified">
              {/* Search Field */}
              <div className="search-input-wrap">
                <Search size={16} className="search-icon" aria-hidden="true" />
                <input
                  aria-label={say('بحث بالاسم أو الموديل أو SKU', 'Search title, model or SKU')}
                  placeholder={say('بحث...', 'Search products or SKU...')}
                  value={searchInput}
                  onChange={e => setSearchInput(e.target.value)}
                />
                {products.isFetching ? (
                  <span className="search-loading-spinner" aria-hidden="true" />
                ) : searchInput ? (
                  <button
                    type="button"
                    className="clear-search-btn"
                    onClick={() => {
                      setSearchInput('');
                      setDebouncedQ('');
                      setPage(1);
                    }}
                    aria-label={say('مسح البحث', 'Clear search')}
                  >
                    <X size={15} />
                  </button>
                ) : null}
              </div>

              {/* Status Filter Pills */}
              <div className="status-pills-bar">
                {statusPills.map(item => (
                  <button
                    key={item.id}
                    type="button"
                    className={`status-filter-pill ${status === item.id ? 'active' : ''}`}
                    onClick={() => { setStatus(item.id); setPage(1); }}
                  >
                    {item.countDot && <span className={`status-dot ${item.countDot}`} />}
                    <span>{item.label}</span>
                  </button>
                ))}
              </div>

              {/* Filters Dropdowns Group */}
              <div className="filters-dropdowns-group">
                {/* Category Quick Filter */}
                <select
                  aria-label={say('الفئة', 'Category')}
                  value={catFilter}
                  onChange={e => setCatFilter(e.target.value)}
                  className="control-select"
                >
                  <option value="">{say('كل الفئات', 'All Categories')}</option>
                  {data.categories.map(c => (
                    <option key={c.slug} value={c.slug}>{c.title[lang]}</option>
                  ))}
                </select>

                {/* Brand Quick Filter */}
                <select
                  aria-label={say('العلامة التجارية', 'Brand')}
                  value={brandFilter}
                  onChange={e => setBrandFilter(e.target.value)}
                  className="control-select"
                >
                  <option value="">{say('كل العلامات', 'All Brands')}</option>
                  {data.brands.map(b => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>

              {/* Sort & View Switcher Row */}
              <div className="sort-view-row">
                {/* Sort Dropdown */}
                <div className="sort-select-wrap">
                  <select
                    aria-label={say('الترتيب', 'Sort')}
                    value={sort}
                    onChange={e => setSort(e.target.value)}
                    className="control-select"
                  >
                    <option value="updated">{say('آخر تعديل', 'Recently updated')}</option>
                    <option value="name">{say('الموديل أبجدياً', 'Model alphabetically')}</option>
                  </select>
                </div>

                {/* View Switcher Toggle */}
                <div className="view-toggle-wrap">
                  <button
                    type="button"
                    className={`view-toggle-btn ${viewMode === 'table' ? 'active' : ''}`}
                    onClick={() => setViewMode('table')}
                    title={say('عرض الجدول التفصيلي', 'Table view')}
                  >
                    <List size={16} />
                  </button>
                  <button
                    type="button"
                    className={`view-toggle-btn ${viewMode === 'grid' ? 'active' : ''}`}
                    onClick={() => setViewMode('grid')}
                    title={say('عرض شبكة البطاقات', 'Grid view')}
                  >
                    <LayoutGrid size={16} />
                  </button>
                </div>
              </div>

              {/* Reset Filters Button */}
              {hasActiveFilters && (
                <button
                  type="button"
                  className="reset-filters-btn"
                  onClick={resetAllFilters}
                  title={say('إعادة ضبط كافة الفلاتر', 'Reset all filters')}
                >
                  <RotateCcw size={14} />
                  <span>{say('إعادة ضبط', 'Reset')}</span>
                </button>
              )}
            </div>

            {/* Bulk Selection Ribbon */}
            {selected.length > 0 && (
              <div className="bulk-selection-bar" role="region" aria-label={say('إجراءات مجمعة', 'Bulk actions')}>
                <div className="bulk-info">
                  <label className="checkbox-wrapper">
                    <input
                      type="checkbox"
                      checked={allSelectedOnPage}
                      onChange={toggleSelectAllPage}
                      aria-label={say('تحديد الكل في هذه الصفحة', 'Select all on page')}
                    />
                    <span className="bulk-count">
                      {say(`تم تحديد ${selected.length} منتج`, `${selected.length} products selected`)}
                    </span>
                  </label>
                  <button
                    type="button"
                    className="text-action-btn"
                    onClick={() => setSelected([])}
                  >
                    {say('إلغاء التحديد', 'Clear selection')}
                  </button>
                </div>

                <div className="bulk-actions">
                  {selected.length === 1 && (
                    <button
                      type="button"
                      disabled={busy}
                      className="button secondary sm amazon-import-btn"
                      onClick={() => {
                        const p = products.data?.items.find(x => x.id === selected[0]);
                        setAmazonTargetProduct(p ?? null);
                        setAmazonModalOpen(true);
                      }}
                      title={say('استيراد صور من أمازون لهذا المنتج', 'Import Amazon images for selected product')}
                    >
                      <Sparkles size={14} className="amazon-sparkle-icon" />
                      <span>{say('صور أمازون', 'Amazon Images')}</span>
                    </button>
                  )}
                  {can(user.role, 'catalog.publish') && (
                    <>
                      <button
                        type="button"
                        disabled={busy}
                        className="button secondary sm success-tone"
                        onClick={() => void bulk('published')}
                      >
                        <CheckCircle2 size={15} />
                        <span>{say('نشر المحدد', 'Publish')}</span>
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        className="button secondary sm danger-tone"
                        onClick={() => void bulk('archived')}
                      >
                        <Archive size={15} />
                        <span>{say('أرشفة المحدد', 'Archive')}</span>
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        className="button secondary sm danger-tone"
                        onClick={() => void bulk('delete')}
                        title={say('حذف المحدد نهائياً', 'Delete selected')}
                      >
                        <Trash2 size={15} />
                        <span>{say('حذف المحدد', 'Delete')}</span>
                      </button>
                    </>
                  )}

                  <div className="bulk-collection-group">
                    <select
                      value={collection}
                      onChange={e => setCollection(e.target.value)}
                      className="control-select sm"
                      aria-label={say('المجموعة', 'Collection')}
                    >
                      <option value="">{say('اختر مجموعة…', 'Select collection…')}</option>
                      {data.collections.map(c => (
                        <option key={c.id} value={c.id}>{c.title[lang]}</option>
                      ))}
                    </select>
                    <button
                      type="button"
                      disabled={!collection || busy}
                      className="button secondary sm"
                      onClick={() => void bulk('collection')}
                    >
                      <FolderPlus size={15} />
                      <span>{say('إضافة', 'Add')}</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </section>

          {/* Product Items Table or Cards Grid */}
          {displayedItems.length === 0 ? (
            <div className="empty-catalog-state">
              <div className="empty-icon-wrap">
                <PackageSearch size={36} />
              </div>
              <h3>{say('لا توجد منتجات مطابقة', 'No products found')}</h3>
              <p>
                {hasActiveFilters
                  ? say('لم يتم العثور على أي منتج يطابق معايير البحث أو الفلتر المحددة.', 'No products match your current search or filter criteria.')
                  : say('لم تتم إضافة أي منتجات إلى الكتالوج بعد.', 'No products have been added to the catalog yet.')}
              </p>
              {hasActiveFilters && (
                <button
                  type="button"
                  className="button secondary"
                  onClick={resetAllFilters}
                >
                  <RotateCcw size={15} />
                  <span>{say('إعادة ضبط الفلاتر', 'Reset filters')}</span>
                </button>
              )}
            </div>
          ) : viewMode === 'grid' ? (
            /* Cards Grid View */
            <div className="catalog-cards-grid">
              {displayedItems.map(p => {
                const isChecked = selected.includes(p.id);
                const brandObj = data.brands.find(b => b.id === p.brandId || b.name === p.brand);
                const _catObj = data.categories.find(c => c.slug === p.category);
                const statusClass = p.status === 'published' ? 'published' : p.status === 'archived' ? 'archived' : 'draft';
                const statusLabel = p.status === 'published' ? say('منشور', 'Published') : p.status === 'archived' ? say('مؤرشف', 'Archived') : say('مسودة', 'Draft');

                const pVariants = data.variants.filter(v => v.productId === p.id);
                const priced = pVariants.find(v => (v as any).priceUsd);
                const priceDisplay = p.price.usd ? `$${p.price.usd}` : ((priced as any)?.priceUsd ? `$${(priced as any).priceUsd}` : '');

                return (
                  <article className={`product-catalog-card ${isChecked ? 'selected' : ''}`} key={p.id}>
                    <div className="card-top-bar">
                      <input
                        type="checkbox"
                        aria-label={p.title[lang]}
                        checked={isChecked}
                        onChange={e => setSelected(e.target.checked ? [...selected, p.id] : selected.filter(id => id !== p.id))}
                      />
                      <span className={`status-badge-modern ${statusClass}`}>
                        <span className="status-dot-inner" />
                        <span>{statusLabel}</span>
                      </span>
                    </div>

                    <div className="card-media-wrap" onClick={() => start(p)}>
                      {safeImageUrl(p.images[0]) ? (
                        <img
                          src={safeImageUrl(p.images[0])}
                          alt={p.title[lang]}
                          loading="lazy"
                        />
                      ) : (
                        <div className="thumb-placeholder">
                          <Package size={28} />
                        </div>
                      )}
                    </div>

                    <div className="card-content-wrap">
                      <button
                        type="button"
                        className="title-link-btn"
                        onClick={() => start(p)}
                      >
                        <strong className="product-title-text" dir="auto">{p.title[lang] || say('(بدون عنوان)', '(Untitled)')}</strong>
                      </button>

                      <div className="meta-pills-row">
                        {priceDisplay && (
                          <span className="meta-pill price-pill">{priceDisplay}</span>
                        )}
                        {p.model && (
                          <span className="meta-pill model-pill" dir="auto" title={say('الموديل', 'Model')}>
                            {p.model}
                          </span>
                        )}
                        {brandObj && (
                          <span className="meta-pill brand-pill">
                            {brandObj.name}
                          </span>
                        )}
                        {pVariants.length > 0 && (
                          <span className="meta-pill sku-count-pill">{pVariants.length} SKU</span>
                        )}
                      </div>
                    </div>

                    <div className="card-footer-actions">
                      <button
                        type="button"
                        className="button subtle edit-action-btn"
                        onClick={() => start(p)}
                        title={say('تعديل المنتج', 'Edit product')}
                      >
                        <Edit3 size={14} />
                        <span>{say('تعديل', 'Edit')}</span>
                      </button>
                      <div className="card-action-icons-cluster">
                        <button
                          type="button"
                          className="icon-action-btn"
                          onClick={() => cloneProduct(p)}
                          title={say('نسخ كمنتج جديد', 'Duplicate product')}
                        >
                          <Copy size={14} />
                        </button>
                        <button
                          type="button"
                          className="icon-action-btn"
                          onClick={() => {
                            setAmazonTargetProduct(p);
                            setAmazonModalOpen(true);
                          }}
                          title={say('استيراد صور من أمازون', 'Import Amazon images')}
                        >
                          <Sparkles size={14} />
                        </button>
                        <Link
                          to="/variants"
                          className="icon-action-btn"
                          title={say('خيارات SKU والمخزون', 'SKUs')}
                        >
                          <Layers size={14} />
                        </Link>
                        <button
                          type="button"
                          className="icon-action-btn danger-hover"
                          onClick={() => setDeleteConfirm(p)}
                          title={say('حذف المنتج', 'Delete product')}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            /* Table List View */
            <div className="catalog-table-wrap">
              <div className="catalog-header-row">
                <div className="col-check">
                  <input
                    type="checkbox"
                    checked={allSelectedOnPage}
                    onChange={toggleSelectAllPage}
                    aria-label={say('تحديد كل الصفحة', 'Select page')}
                  />
                </div>
                <div className="col-media">{say('الصورة', 'Media')}</div>
                <div className="col-info">{say('تفاصيل المنتج والموديل', 'Product & Model')}</div>
                <div className="col-price">{say('السعر ($)', 'Price ($)')}</div>
                <div className="col-stock">{say('الخيارات والمخزون', 'SKUs / Stock')}</div>
                <div className="col-status">{say('الحالة', 'Status')}</div>
                <div className="col-actions">{say('الإجراءات', 'Actions')}</div>
              </div>

              <div className="catalog-rows-list">
                {displayedItems.map(p => {
                  const isChecked = selected.includes(p.id);
                  const brandObj = data.brands.find(b => b.id === p.brandId || b.name === p.brand);
                  const catObj = data.categories.find(c => c.slug === p.category);
                  const statusClass = p.status === 'published' ? 'published' : p.status === 'archived' ? 'archived' : 'draft';
                  const statusLabel = p.status === 'published' ? say('منشور', 'Published') : p.status === 'archived' ? say('مؤرشف', 'Archived') : say('مسودة', 'Draft');

                  return (
                    <article className={`catalog-product-row ${isChecked ? 'selected' : ''}`} key={p.id}>
                      <div className="col-check">
                        <input
                          type="checkbox"
                          aria-label={p.title[lang]}
                          checked={isChecked}
                          onChange={e => setSelected(e.target.checked ? [...selected, p.id] : selected.filter(id => id !== p.id))}
                        />
                      </div>

                      <div className="col-media">
                        <div className="thumb-container">
                          {safeImageUrl(p.images[0]) ? (
                            <img
                              src={safeImageUrl(p.images[0])}
                              alt={p.title[lang]}
                              loading="lazy"
                            />
                          ) : (
                            <div className="thumb-placeholder">
                              <Package size={22} />
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="col-info">
                        <button
                          type="button"
                          className="title-link-btn"
                          onClick={() => start(p)}
                        >
                          <strong className="product-title-text" dir="auto">{p.title[lang] || say('(بدون عنوان)', '(Untitled)')}</strong>
                        </button>
                        <div className="meta-pills-row">
                          {p.model && (
                            <span className="meta-pill model-pill" dir="auto" title={say('الموديل', 'Model')}>
                              {p.model}
                            </span>
                          )}
                          {catObj && (
                            <span className="meta-pill cat-pill">
                              {catObj.title[lang]}
                            </span>
                          )}
                          {brandObj && (
                            <span className="meta-pill brand-pill">
                              {brandObj.name}
                            </span>
                          )}
                          <span className="meta-pill condition-pill">
                            {p.condition === 'new' ? say('جديد', 'New') : p.condition}
                          </span>
                        </div>
                      </div>

                      {(() => {
                        const pVariants = data.variants.filter(v => v.productId === p.id);
                        const priced = pVariants.find(v => (v as any).priceUsd);
                        const priceDisplay = p.price.usd ? `$${p.price.usd}` : ((priced as any)?.priceUsd ? `$${(priced as any).priceUsd}` : say('غير مسعّر', 'Unpriced'));
                        const totalUnits = pVariants.reduce((sum, v) => sum + ((v as any).inventoryMode === 'quantity' ? (Number((v as any).quantity) || 0) : ((v as any).units?.filter((u: any) => u.available).length || 0)), 0);

                        return (
                          <>
                            <div className="col-price">
                              <strong className="col-price-amount" style={{ color: (p.price.usd || priced) ? 'var(--primary-text)' : 'var(--muted)' }}>
                                {priceDisplay}
                              </strong>
                              {p.price.negotiable && (
                                <span className="col-price-negotiable">
                                  {say('قابل للتفاوض', 'Negotiable')}
                                </span>
                              )}
                            </div>

                            <div className="col-stock">
                              <div className="stock-sku-badge-wrap">
                                <span className="meta-pill sku-count-pill">
                                  {pVariants.length} {say('خيار SKU', 'SKUs')}
                                </span>
                              </div>
                              {totalUnits > 0 && (
                                <span className="stock-units-available">
                                  {totalUnits} {say('متوفر', 'in stock')}
                                </span>
                              )}
                            </div>
                          </>
                        );
                      })()}

                      <div className="col-status">
                        <span className={`status-badge-modern ${statusClass}`}>
                          <span className="status-dot-inner" />
                          <span>{statusLabel}</span>
                        </span>
                      </div>

                      <div className="col-actions">
                        <button
                          type="button"
                          className="button subtle edit-action-btn"
                          onClick={() => start(p)}
                          title={say('تعديل المنتج', 'Edit product')}
                        >
                          <Edit3 size={14} />
                          <span>{say('تعديل', 'Edit')}</span>
                        </button>
                        <div className="table-action-icons-cluster">
                          <button
                            type="button"
                            className="icon-action-btn"
                            onClick={() => cloneProduct(p)}
                            title={say('نسخ كمنتج جديد', 'Duplicate product')}
                          >
                            <Copy size={14} />
                          </button>
                          <button
                            type="button"
                            className="icon-action-btn"
                            onClick={() => {
                              setAmazonTargetProduct(p);
                              setAmazonModalOpen(true);
                            }}
                            title={say('استيراد صور من أمازون', 'Import Amazon images')}
                          >
                            <Sparkles size={14} />
                          </button>
                          <Link
                            to="/variants"
                            className="icon-action-btn"
                            title={say('خيارات SKU والمخزون', 'SKUs')}
                          >
                            <Layers size={14} />
                          </Link>
                          <button
                            type="button"
                            className="icon-action-btn danger-hover"
                            onClick={() => setDeleteConfirm(p)}
                            title={say('حذف المنتج', 'Delete product')}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          )}

          {/* Compact Pagination Bar */}
          <footer className="catalog-pagination-bar">
            <div className="pagination-info">
              <span>
                {say(`صفحة ${page} من ${totalPages}`, `Page ${page} of ${totalPages}`)}
              </span>
              <span className="pagination-count-total">
                ({products.data.total} {say('إجمالي العناصر', 'total items')})
              </span>
            </div>
            <div className="pagination-controls">
              <button
                type="button"
                className="button secondary sm"
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
              >
                {ar ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
                <span>{say('السابق', 'Previous')}</span>
              </button>
              <button
                type="button"
                className="button secondary sm"
                disabled={page * 24 >= products.data.total}
                onClick={() => setPage(page + 1)}
              >
                <span>{say('التالي', 'Next')}</span>
                {ar ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
              </button>
            </div>
          </footer>
        </>
      ) : (
        /* Product Editor Screen */
        <form
          className="card content-editor product-editor-form"
          onSubmit={async e => {
            e.preventDefault();
            const payload: ProductEdit = { ...edit };
            if (!isNew && !payload.revision && (edit as any)?.revision) {
              payload.revision = (edit as any).revision;
            }
            if (isNew) {
              delete (payload as any).revision;
            }
            // Auto-fallback empty English fields to Arabic
            if (payload.title) {
              const ar = (payload.title.ar || '').trim();
              const en = (payload.title.en || '').trim();
              payload.title = { ar: ar || en, en: en || ar };
            }
            if (payload.summary) {
              const ar = (payload.summary.ar || '').trim();
              const en = (payload.summary.en || '').trim();
              const fallback = payload.title?.ar || payload.model || 'product';
              payload.summary = { ar: ar || en || fallback, en: en || ar || fallback };
            }
            // Normalize inspection: fill missing fields with safe defaults (handles legacy {} from imports)
            {
              const insp = payload.inspection as any ?? {};
              const notes = insp.notes ?? {};
              const ar = (notes.ar || '').trim();
              const en = (notes.en || '').trim();
              payload.inspection = {
                passed: typeof insp.passed === 'boolean' ? insp.passed : false,
                date: typeof insp.date === 'string' ? insp.date : (insp.date ?? null),
                notes: { ar: ar || en || '', en: en || ar || '' },
                ...(insp.checklist ? { checklist: insp.checklist } : {}),
              };
            }
            // Auto-generate slug if empty or new product (unless cloned copy)
            if (!payload.slug || !payload.slug.trim() || (isNew && !payload.slug.includes('-copy-'))) {
              const brandObj = data.brands.find(b => b.id === payload.brandId);
              const source = [brandObj?.name, payload.model].filter(Boolean).join(' ') || payload.title?.en || payload.title?.ar || 'product';
              payload.slug = generateSlug(source);
            }
            // Auto-generate ID if empty
            if (!payload.id || !payload.id.trim()) {
              payload.id = crypto.randomUUID();
            }
            // Sanitize productTypeId: ensure valid slug or null
            if (payload.productTypeId) {
              const tid = String(payload.productTypeId).trim().toLowerCase();
              payload.productTypeId = /^[a-z0-9][a-z0-9-]{0,99}$/.test(tid) ? tid : null;
            } else {
              payload.productTypeId = null;
            }
            // Clean and normalize specs
            if (payload.specs && typeof payload.specs === 'object') {
              const cleanedSpecs: Record<string, unknown> = {};
              for (const [k, v] of Object.entries(payload.specs)) {
                if (v === undefined || v === null || v === '') continue;
                const fDef = fields.find(f => f.key === k);
                if (fDef?.valueType === 'number') {
                  const num = Number(v);
                  if (Number.isFinite(num)) {
                    cleanedSpecs[k] = num;
                    continue;
                  }
                }
                cleanedSpecs[k] = v;
              }
              payload.specs = cleanedSpecs;
            }
            const parsed = ProductEditSchema.safeParse(payload);
            if (!parsed.success) {
              setDetails(parsed.error.issues.map(i => i.path.join('.') + ': ' + i.message).join(' · '));
              return;
            }
            setBusy(true);
            try {
              const result = await api<ProductEdit>(isNew ? '/products' : '/products/' + edit.id, {
                method: isNew ? 'POST' : 'PATCH',
                body: parsed.data
              });
              setEdit(result);
              setIsNew(false);
              await client.invalidateQueries({ queryKey: ['catalog-products'] });
              await client.invalidateQueries({ queryKey: ['commerce-reference'] });
            } catch (e) {
              setError(e instanceof ApiError ? e.code : 'failed');
            } finally {
              setBusy(false);
            }
          }}
        >
          {/* Sticky Editor Header */}
          <div className="editor-top-bar">
            <div className="editor-title-group">
              <button
                type="button"
                className="button secondary sm back-btn"
                onClick={() => setEdit(null)}
              >
                {ar ? <ArrowRight size={16} /> : <ArrowLeft size={16} />}
                <span>{say('العودة', 'Back')}</span>
              </button>
              <h2 className="editor-title">
                {isNew ? say('منتج جديد', 'New Product') : (edit.title[lang] || say('تعديل المنتج', 'Edit Product'))}
              </h2>
            </div>

            <div className="editor-top-actions">
              {!isNew && (
                <>
                  <button
                    type="button"
                    className="button secondary sm clone-btn"
                    onClick={() => cloneProduct(edit)}
                    title={say('نسخ كجديد', 'Duplicate as new')}
                  >
                    <Copy size={14} />
                    <span>{say('نسخ', 'Clone')}</span>
                  </button>
                  <button
                    type="button"
                    className="button secondary sm danger-tone delete-product-btn"
                    onClick={() => setDeleteConfirm(edit)}
                    title={say('حذف هذا المنتج', 'Delete product')}
                  >
                    <Trash2 size={14} />
                  </button>
                </>
              )}
              <div className="status-select-group">
                <label className="sr-only">{say('حالة النشر', 'Publication status')}</label>
                <select
                  value={edit.status}
                  disabled={!can(user.role, 'catalog.publish')}
                  onChange={e => setEdit({ ...edit, status: e.target.value as ProductEdit['status'] })}
                  className="control-select sm"
                >
                  <option value="draft">{say('مسودة', 'Draft')}</option>
                  <option value="published">{say('منشور', 'Published')}</option>
                  <option value="archived">{say('مؤرشف', 'Archived')}</option>
                </select>
              </div>

              <button className="button primary sm" disabled={busy} type="submit">
                <Check size={16} />
                <span>{busy ? say('جارٍ الحفظ…', 'Saving…') : say('حفظ', 'Save')}</span>
              </button>
            </div>
          </div>

          {/* Editor Segmented Tabs */}
          <nav className="editor-tabs-bar" aria-label={say('تبويبات المنتج', 'Product tabs')}>
            {tabList.map(({ id, ar, en, icon: Icon }) => (
              <button
                key={id}
                type="button"
                className={`editor-tab-pill ${tab === id ? 'active' : ''}`}
                onClick={() => setTab(id)}
              >
                <Icon size={14} />
                <span>{say(ar, en)}</span>
              </button>
            ))}
          </nav>

          {/* Tab 1: Identity & Copy */}
          {tab === 'identity' && (
            <div className="editor-tab-pane">
              {/* Quick Starter Templates for New Products */}
              {isNew && (
                <div className="starter-presets-banner">
                  <div className="presets-banner-title">
                    <Wand2 size={14} />
                    <strong>{say('نماذج سريعة:', 'Quick Templates:')}</strong>
                  </div>
                  <div className="presets-cards-row">
                    {starterTemplates.map(tpl => {
                      const Icon = tpl.icon;
                      return (
                        <button
                          key={tpl.id}
                          type="button"
                          className="preset-starter-btn"
                          onClick={() => setEdit({ ...edit, ...tpl.apply(edit) })}
                        >
                          <Icon size={14} />
                          <span className="preset-name">{tpl.title[lang]}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="fields-grid">
                <label>
                  <span>{say('العلامة التجارية', 'Brand')}</span>
                  <select
                    value={edit.brandId ?? data.brands.find(b => b.name === edit.brand)?.id}
                    onChange={e => {
                      const b = data.brands.find(b => b.id === e.target.value);
                      if (b) setEdit({ ...edit, brandId: b.id, brand: b.name });
                    }}
                  >
                    {data.brands.map(b => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </label>
                <label>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '3px' }}>
                    <span>{say('الفئة والتصنيف', 'Category')}</span>
                    <button
                      type="button"
                      className="button subtle sm"
                      style={{ padding: '1px 6px', fontSize: '10.5px' }}
                      onClick={() => setCategoryPickerOpen(true)}
                    >
                      <FolderTree size={12} style={{ marginInlineEnd: '4px' }} />
                      <span>{say('تصفح مرئي', 'Visual Browse')}</span>
                    </button>
                  </div>
                  <select
                    value={edit.category}
                    onChange={e => setEdit({ ...edit, category: e.target.value })}
                  >
                    {data.categories.map(c => (
                      <option key={c.slug} value={c.slug}>{c.title[lang]}</option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>{say('قالب المواصفات', 'Specification template')}</span>
                  <select
                    value={edit.productTypeId ?? ''}
                    onChange={e => setEdit({ ...edit, productTypeId: e.target.value || null })}
                  >
                    <option value="">{say('موروث من الفئة', 'Inherited from category')}</option>
                    {data.types.map(t => (
                      <option key={t.id} value={t.id}>{t.title[lang]}</option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="title-suggestion-bar">
                <button
                  type="button"
                  className="button secondary sm auto-title-btn"
                  onClick={() => {
                    const brandName = data.brands.find(b => b.id === edit.brandId)?.name || edit.brand;
                    const titles = autoComposeTitle(brandName, edit.model);
                    const source = [brandName, edit.model].filter(Boolean).join(' ') || titles.en;
                    setEdit({
                      ...edit,
                      slug: isNew ? generateSlug(source) : (edit.slug || generateSlug(source)),
                      title: {
                        ar: titles.ar,
                        en: titles.en
                      }
                    });
                  }}
                >
                  <Sparkles size={14} />
                  <span>{say('اقتراح تلقائي للاسم', 'Auto-compose title')}</span>
                </button>
              </div>

              <div className="editor-section-card">
                <ValueFields
                  value={{ model: edit.model, title: edit.title, summary: edit.summary, demo: edit.demo }}
                  onChange={v => setEdit({ ...edit, ...v as Partial<ProductEdit> })}
                />
              </div>

              <div className="editor-section-card pricing-section-compact">
                <div className="pricing-card-header">
                  <strong>
                    <DollarSign size={15} style={{ color: '#059669' }} />
                    {say('تسعير المنتج', 'Product Pricing')}
                  </strong>
                  <Link to="/pricing" className="pricing-link-btn">
                    <span>{say('شاشة التسعير ↗', 'Pricing ↗')}</span>
                  </Link>
                </div>
                <div className="pricing-inputs-row">
                  <label className="price-input-label">
                    <span>{say('السعر ($ USD)', 'Price ($ USD)')}</span>
                    <div className="price-input-wrapper">
                      <input
                        dir="ltr"
                        inputMode="decimal"
                        type="text"
                        placeholder="0.00"
                        value={edit.price?.usd ?? ''}
                        onChange={e => {
                          const val = e.target.value.trim();
                          setEdit({
                            ...edit,
                            price: {
                              ...edit.price,
                              usd: val === '' ? null : val
                            }
                          });
                        }}
                      />
                      <span className="price-currency-sign">$</span>
                    </div>
                  </label>

                  <label className="checkbox-field negotiable-checkbox">
                    <input
                      type="checkbox"
                      checked={Boolean(edit.price?.negotiable)}
                      onChange={e => setEdit({
                        ...edit,
                        price: {
                          ...edit.price,
                          negotiable: e.target.checked
                        }
                      })}
                    />
                    <span>{say('قابل للتفاوض', 'Negotiable')}</span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* Tab 2: Specifications */}
          {tab === 'specs' && (
            <div className="editor-tab-pane">
              <ProductSpecEditor
                specs={edit.specs as Record<string, unknown>}
                fields={fields}
                activeTemplate={activeTemplate}
                inheritedTemplate={inheritedTemplate}
                selectedTypeId={edit.productTypeId}
                allTypes={data.types}
                onSelectType={typeId => setEdit({ ...edit, productTypeId: typeId })}
                onUpdateSpec={(key, value) => {
                  const next = { ...edit.specs };
                  if (value === undefined) delete next[key];
                  else next[key] = value;
                  setEdit({ ...edit, specs: next as ProductEdit['specs'] });
                }}
                onRemoveSpec={key => {
                  const next = { ...edit.specs };
                  delete next[key];
                  setEdit({ ...edit, specs: next as ProductEdit['specs'] });
                }}
                onApplyDefaults={() => {
                  const next = { ...edit.specs };
                  for (const f of fields) {
                    if (next[f.key] === undefined || next[f.key] === null || next[f.key] === '') {
                      if (f.valueType === 'boolean') next[f.key] = false;
                      else if (f.valueType === 'single' && f.options && f.options.length > 0) next[f.key] = f.options[0];
                      else if (f.valueType === 'multi') next[f.key] = [];
                    }
                  }
                  setEdit({ ...edit, specs: next as ProductEdit['specs'] });
                }}
              />
            </div>
          )}

          {/* Tab 3: Images */}
          {tab === 'images' && (
            <div className="editor-tab-pane">
              <div className="editor-media-section">
                <div className="media-section-header">
                  <div>
                    <h3>{say('صور المنتج', 'Product Images')}</h3>
                  </div>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      className="button secondary sm amazon-import-btn"
                      onClick={() => {
                        setAmazonTargetProduct(edit);
                        setAmazonModalOpen(true);
                      }}
                      title={say('استيراد من أمازون', 'Import from Amazon')}
                    >
                      <Sparkles size={15} className="amazon-sparkle-icon" />
                      <span>{say('أمازون', 'Amazon')}</span>
                    </button>
                    <button
                      type="button"
                      className="button primary sm"
                      onClick={() => setMediaPickerOpen(true)}
                    >
                      <ImagePlus size={15} />
                      <span>{say('المعرض', 'Gallery')}</span>
                    </button>
                  </div>
                </div>

                <div className="media-grid-enhanced">
                  {edit.images.map((path, index) => (
                    <article className="media-card-item" key={typeof path === 'string' ? path : index}>
                      <div className="media-img-wrap">
                        {index === 0 && (
                          <span className="primary-image-badge">{say('الرئيسية ⭐', 'Primary ⭐')}</span>
                        )}
                        <img src={safeImageUrl(path)} alt={edit.title[lang]} />
                      </div>
                      <div className="media-card-actions">
                        <button
                          className="button secondary sm"
                          type="button"
                          disabled={!index}
                          onClick={() => {
                            const images = [...edit.images];
                            [images[index - 1], images[index]] = [images[index], images[index - 1]];
                            setEdit({ ...edit, images });
                          }}
                          title={say('تقديم الصورة', 'Move earlier')}
                        >
                          {say('تقديم', 'Earlier')}
                        </button>
                        <button
                          className="button secondary sm"
                          type="button"
                          disabled={index >= edit.images.length - 1}
                          onClick={() => {
                            const images = [...edit.images];
                            [images[index + 1], images[index]] = [images[index], images[index + 1]];
                            setEdit({ ...edit, images });
                          }}
                          title={say('تأخير الصورة', 'Move later')}
                        >
                          {say('تأخير', 'Later')}
                        </button>
                        <button
                          className="button secondary sm danger-tone"
                          type="button"
                          onClick={() => setEdit({ ...edit, images: edit.images.filter(p => p !== path) })}
                          title={say('إزالة الصورة', 'Remove image')}
                        >
                          <X size={14} />
                        </button>
                      </div>
                    </article>
                  ))}
                </div>

                <div className="add-image-panel">
                  <div className="add-image-actions-row">
                    <button
                      type="button"
                      className="button primary sm"
                      onClick={() => setMediaPickerOpen(true)}
                    >
                      <ImagePlus size={15} />
                      <span>{say('استعراض واختيار من المعرض المرئي', 'Browse & Pick from Gallery')}</span>
                    </button>
                    <button
                      type="button"
                      className="button secondary sm amazon-import-btn"
                      onClick={() => {
                        setAmazonTargetProduct(edit);
                        setAmazonModalOpen(true);
                      }}
                    >
                      <Sparkles size={14} className="amazon-sparkle-icon" />
                      <span>{say('استيراد من أمازون', 'Import from Amazon')}</span>
                    </button>
                    <Link to="/media" target="_blank" className="button secondary sm" title={say('إدارة مكتبة الصور', 'Media Library')}>
                      <ExternalLink size={14} />
                      <span>{say('المكتبة', 'Library')}</span>
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tab 4: Inspection & Details */}
          {tab === 'details' && (
            <div className="editor-tab-pane">
              {/* Quick Tags Suggestions */}
              <div className="quick-suggestions-block">
                <span className="chips-title">{say('وسوم مقترحة:', 'Suggested Tags:')}</span>
                <div className="chips-row">
                  {popularTags.map(tag => {
                    const active = edit.tags.includes(tag);
                    return (
                      <button
                        key={tag}
                        type="button"
                        className={`spec-helper-chip ${active ? 'active' : ''}`}
                        onClick={() => {
                          setEdit({
                            ...edit,
                            tags: active ? edit.tags.filter(t => t !== tag) : [...edit.tags, tag]
                          });
                        }}
                      >
                        {active ? '✓ ' : '+ '}
                        {tag}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Quick Best For Suggestions */}
              <div className="quick-suggestions-block">
                <span className="chips-title">{say('استخدامات مقترحة:', 'Suggested Uses:')}</span>
                <div className="chips-row">
                  {popularBestFor.map(item => {
                    const active = edit.bestFor.includes(item);
                    return (
                      <button
                        key={item}
                        type="button"
                        className={`spec-helper-chip ${active ? 'active' : ''}`}
                        onClick={() => {
                          setEdit({
                            ...edit,
                            bestFor: active ? edit.bestFor.filter(t => t !== item) : [...edit.bestFor, item]
                          });
                        }}
                      >
                        {active ? '✓ ' : '+ '}
                        {item}
                      </button>
                    );
                  })}
                </div>
              </div>

              <ValueFields
                value={{ inspection: edit.inspection, bestFor: edit.bestFor, tags: edit.tags, specSources: edit.specSources }}
                onChange={v => setEdit({ ...edit, ...v as Partial<ProductEdit> })}
              />

              <fieldset className="editor-fieldset">
                <legend>{say('منتجات مقترحة للتوافق', 'Suggested Products for Compatibility')}</legend>
                <div className="checkboxes-scroll-grid">
                  {data.products.filter(p => p.id !== edit.id).map(p => (
                    <label key={p.id} className="checkbox-item-row">
                      <input
                        type="checkbox"
                        checked={edit.compatibleWith.includes(p.id)}
                        onChange={e => setEdit({
                          ...edit,
                          compatibleWith: e.target.checked
                            ? [...edit.compatibleWith, p.id]
                            : edit.compatibleWith.filter(id => id !== p.id)
                        })}
                      />
                      <span>{p.title[lang]}</span>
                    </label>
                  ))}
                </div>
              </fieldset>

              {!isNew && edit.compatibleWith.length > 0 && (
                <CompatibilityEvidence
                  productId={edit.id}
                  products={data.products.filter(p => edit.compatibleWith.includes(p.id))}
                />
              )}
            </div>
          )}

          {/* Tab 5: Preview & Publication Checklist */}
          {tab === 'preview' && (
            <div className="editor-tab-pane preview-tab-pane">
              <div className="preview-hero-card">
                <h2>{edit.title[lang] || say('(بدون عنوان)', '(Untitled)')}</h2>
                <p className="preview-summary-text">{edit.summary[lang]}</p>

                {edit.images.length > 0 && (
                  <div className="preview-media-strip">
                    {edit.images.map((src, idx) => (
                      <div className="preview-thumb" key={typeof src === 'string' ? src : idx}>
                        <img src={safeImageUrl(src)} alt={edit.title[lang]} />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="checklist-card">
                <h3>{say('جاهزية النشر', 'Readiness Checklist')}</h3>
                {missing.length > 0 ? (
                  <div className="missing-list-box">
                    <div className="warning-banner">
                      <AlertTriangle size={16} />
                      <span>{say('مطلوب قبل النشر:', 'Required before publishing:')}</span>
                    </div>
                    <ul className="checklist-items">
                      {missing.map((m, i) => (
                        <li key={i}>
                          <span className="bullet-dot warning" />
                          <span>{m}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <div className="success-banner">
                    <CheckCircle2 size={18} />
                    <span>
                      {say(
                        'متطلبات النشر الأساسية مكتملة.',
                        'Basic publishing requirements are complete.'
                      )}
                    </span>
                  </div>
                )}

                <div className="checklist-footer">
                  <Link to="/variants" className="button secondary sm">
                    <Layers size={15} />
                    <span>{say('خيارات وأسعار SKU', 'SKUs & Prices')}</span>
                  </Link>
                </div>
              </div>
            </div>
          )}

          {/* Mobile Bottom Dock for Navigation and Fast Saving */}
          <div className="editor-mobile-dock">
            <div className="dock-step-controls">
              <button
                type="button"
                className="dock-nav-btn"
                disabled={tabIndex <= 0}
                onClick={() => setTab(tabList[tabIndex - 1].id)}
                title={say('التبويب السابق', 'Previous tab')}
              >
                {ar ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
              </button>
              <div className="dock-step-indicator">
                <span className="dock-step-num">{tabIndex + 1} / {tabList.length}</span>
                <span className="dock-step-name">{say(tabList[tabIndex].ar, tabList[tabIndex].en)}</span>
              </div>
              <button
                type="button"
                className="dock-nav-btn"
                disabled={tabIndex >= tabList.length - 1}
                onClick={() => setTab(tabList[tabIndex + 1].id)}
                title={say('التبويب التالي', 'Next tab')}
              >
                {ar ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
              </button>
            </div>

            <button
              type="submit"
              className="dock-save-btn button primary"
              disabled={busy}
            >
              <Check size={16} />
              <span>{busy ? say('جارٍ الحفظ…', 'Saving…') : say('حفظ', 'Save')}</span>
            </button>
          </div>
        </form>
      )}

      {/* Visual Image Gallery Picker Modal */}
      {edit && (
        <VisualMediaPickerModal
          open={mediaPickerOpen}
          onOpenChange={setMediaPickerOpen}
          selectedPaths={edit.images}
          multiple={true}
          title={say('معرض صور المنتج المرئي', 'Visual Product Media Gallery')}
          description={say('تصفح الصور بالمعاينة المرئية الكاملة، وابحث وارفع صوراً جديدة بسهولة', 'Browse photos with live visual previews, search, and upload easily')}
          onConfirm={(paths) => setEdit({ ...edit, images: paths })}
        />
      )}

      {/* Visual Category Picker Modal */}
      {edit && (
        <VisualCategoryPickerModal
          open={categoryPickerOpen}
          onOpenChange={setCategoryPickerOpen}
          categories={data.categories}
          selectedSlug={edit.category}
          onSelect={(slug) => setEdit({ ...edit, category: slug })}
          title={say('اختيار فئة وتصنيف المنتج', 'Select Product Category')}
        />
      )}

      {/* Delete Product Confirmation Modal */}
      {deleteConfirm && (
        <Modal
          open={Boolean(deleteConfirm)}
          onOpenChange={open => !open && setDeleteConfirm(null)}
          title={say('تأكيد حذف المنتج', 'Confirm Delete Product')}
          description={say(
            `هل أنت متأكد من رغبتك في حذف "${deleteConfirm.title[lang] || deleteConfirm.model || deleteConfirm.id}"؟`,
            `Are you sure you want to delete "${deleteConfirm.title[lang] || deleteConfirm.model || deleteConfirm.id}"?`
          )}
        >
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '20px' }}>
            <button
              type="button"
              className="button secondary"
              onClick={() => setDeleteConfirm(null)}
            >
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

      {/* Amazon Image Import Modal */}
      <AmazonImageModal
        open={amazonModalOpen}
        onOpenChange={setAmazonModalOpen}
        targetProduct={amazonTargetProduct}
        allProducts={products.data?.items ?? []}
        onImportComplete={(importedPaths, updatedProduct) => {
          client.invalidateQueries({ queryKey: ['catalog-products'] });
          client.invalidateQueries({ queryKey: ['commerce-reference'] });
          client.invalidateQueries({ queryKey: ['media'] });
          if (edit && amazonTargetProduct && edit.id === amazonTargetProduct.id) {
            setEdit({
              ...edit,
              images: [...importedPaths, ...edit.images.filter(p => !importedPaths.includes(p))]
            });
          } else if (updatedProduct && edit && edit.id === updatedProduct.id) {
            setEdit(updatedProduct);
          }
        }}
      />
    </div>
  );
}

