import { type FormEvent } from 'react';
import { useI18n } from './i18n';

export type LocalizedField = { ar: string; en: string };
export type WhyUsItem = { icon: string; title: LocalizedField; description: LocalizedField };
export type StatItem = { value: string; label: LocalizedField };
export type ValueItem = { icon: string; title: LocalizedField; description: LocalizedField };

export type AboutData = {
  hero: { headline: LocalizedField; subheadline: LocalizedField; description: LocalizedField; heroImage?: string | null };
  story: { title: LocalizedField; content: LocalizedField; image?: string | null; year?: number | null };
  mission: { title: LocalizedField; content: LocalizedField; image?: string | null };
  whyUs: WhyUsItem[];
  stats: StatItem[];
  teamHighlight?: { title: LocalizedField; description: LocalizedField; image?: string | null };
  values: ValueItem[];
  ctaTitle: LocalizedField;
  ctaDescription: LocalizedField;
};

const ICON_OPTIONS = [
  { value: 'shield', label: 'درع - Shield' },
  { value: 'file-text', label: 'مستند - Document' },
  { value: 'check-circle', label: 'تحقق - Check' },
  { value: 'file-signature', label: 'ضمان مكتوب - Warranty' },
  { value: 'headphones', label: 'دعم فني - Support' },
  { value: 'star', label: 'نجمة - Star' },
  { value: 'eye', label: 'عين / شفافية - Transparency' },
  { value: 'award', label: 'وسام جودة - Quality' },
  { value: 'users', label: 'فريق عمل - Team' },
  { value: 'target', label: 'هدف ورؤية - Target' },
  { value: 'sparkles', label: 'تجهيز ذكي - Sparkles' },
  { value: 'map-pin', label: 'موقع جغرافي - Location' },
  { value: 'calendar', label: 'تقويم / سنة - Calendar' },
  { value: 'trending', label: 'تطور - Growth' },
  { value: 'zap', label: 'سرعة وكفاءة - Speed' },
  { value: 'heart', label: 'اهتمام - Care' },
];

function LField({
  label,
  value,
  onChange,
  multiline = false,
  dir = 'rtl',
  placeholder = '',
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  multiline?: boolean;
  dir?: string;
  placeholder?: string;
}) {
  return (
    <label className="cs-field cs-field--full">
      <span className="cs-label">{label}</span>
      {multiline ? (
        <textarea
          rows={3}
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
          dir={dir}
          placeholder={placeholder}
          style={{ resize: 'vertical' }}
        />
      ) : (
        <input
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
          dir={dir}
          placeholder={placeholder}
        />
      )}
    </label>
  );
}

function BilingualField({
  arLabel,
  enLabel,
  value,
  onChange,
  multiline = false,
  showEn,
}: {
  arLabel: string;
  enLabel: string;
  value: LocalizedField;
  onChange: (v: LocalizedField) => void;
  multiline?: boolean;
  showEn: boolean;
}) {
  const safe = value || { ar: '', en: '' };
  return (
    <>
      <LField
        label={arLabel}
        value={safe.ar}
        onChange={(v) => onChange({ ...safe, ar: v, en: (!showEn || !safe.en || safe.en === safe.ar) ? v : safe.en })}
        multiline={multiline}
        dir="rtl"
      />
      {showEn && (
        <LField
          label={enLabel}
          value={safe.en}
          onChange={(v) => onChange({ ...safe, en: v })}
          multiline={multiline}
          dir="ltr"
        />
      )}
    </>
  );
}

export function AboutEditor({
  ar,
  data,
  onChange,
  onSave,
  busy,
  saved,
}: {
  ar: boolean;
  data: AboutData;
  onChange: (d: AboutData) => void;
  onSave: (e: FormEvent) => void;
  busy: boolean;
  saved: boolean;
}) {
  const { showEnglishFields } = useI18n();
  const say = (a: string, e: string) => (ar ? a : e);

  if (!data) return null;

  const set = (patch: Partial<AboutData>) => onChange({ ...data, ...patch });

  return (
    <form onSubmit={onSave} className="about-editor-form">
      <div className="cs-sections">
        {/* ── 1. HERO SECTION */}
        <section className="cs-section">
          <div className="cs-section-header">
            <span className="cs-section-icon">🚀</span>
            <div>
              <h3 className="cs-section-title">{say('قسم البانر الرئيسي (الهيرو)', 'Hero Section')}</h3>
              <p className="cs-section-sub">
                {say(
                  'العنوان الرئيسي، الشعار، والوصف الترحيبي ورابط الصورة',
                  'Headline, tagline, description, and hero banner image'
                )}
              </p>
            </div>
          </div>
          <div className="cs-fields-grid">
            <BilingualField
              arLabel={say('العنوان الرئيسي — عربي', 'Headline — Arabic')}
              enLabel={say('العنوان الرئيسي — إنجليزي', 'Headline — English')}
              value={data.hero?.headline ?? { ar: '', en: '' }}
              onChange={(v) => set({ hero: { ...data.hero, headline: v } })}
              showEn={showEnglishFields}
            />
            <BilingualField
              arLabel={say('العنوان الفرعي — عربي', 'Subheadline — Arabic')}
              enLabel={say('العنوان الفرعي — إنجليزي', 'Subheadline — English')}
              value={data.hero?.subheadline ?? { ar: '', en: '' }}
              onChange={(v) => set({ hero: { ...data.hero, subheadline: v } })}
              showEn={showEnglishFields}
            />
            <BilingualField
              arLabel={say('الوصف العام — عربي', 'Description — Arabic')}
              enLabel={say('الوصف العام — إنجليزي', 'Description — English')}
              value={data.hero?.description ?? { ar: '', en: '' }}
              onChange={(v) => set({ hero: { ...data.hero, description: v } })}
              multiline
              showEn={showEnglishFields}
            />
            <label className="cs-field cs-field--full">
              <span className="cs-label">
                {say('رابط صورة الهيرو (اختياري)', 'Hero Image URL (Optional)')}
              </span>
              <input
                dir="ltr"
                value={data.hero?.heroImage ?? ''}
                onChange={(e) =>
                  set({ hero: { ...data.hero, heroImage: e.target.value.trim() || null } })
                }
                placeholder="/api/media/... أو رابط خارجي"
              />
            </label>
          </div>
        </section>

        {/* ── 2. STATS STRIP */}
        <section className="cs-section">
          <div className="cs-section-header">
            <span className="cs-section-icon">📊</span>
            <div>
              <h3 className="cs-section-title">{say('شريط الأرقام والإنجازات', 'Stats & Highlights')}</h3>
              <p className="cs-section-sub">
                {say(
                  'إحصائيات بارزة تظهر في شريط ملفت (مثل عدد نقاط الفحص، نسبة الشفافية)',
                  'Eye-catching stat numbers (e.g. inspection points, guarantee percentage)'
                )}
              </p>
            </div>
          </div>
          <div className="cs-sections" style={{ gap: 12 }}>
            {(data.stats ?? []).map((stat, i) => (
              <div
                key={i}
                className="cs-section"
                style={{ background: 'var(--bg-muted, #f8fafc)', borderRadius: 12, padding: 16 }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: 12,
                  }}
                >
                  <strong style={{ fontSize: 13 }}>
                    {say(`رقم إحصائي ${i + 1}`, `Stat ${i + 1}`)}
                  </strong>
                  <button
                    type="button"
                    className="button secondary"
                    style={{ padding: '2px 8px', fontSize: 12 }}
                    onClick={() => {
                      const next = [...(data.stats ?? [])];
                      next.splice(i, 1);
                      set({ stats: next });
                    }}
                  >
                    {say('حذف', 'Remove')}
                  </button>
                </div>
                <div className="cs-fields-grid">
                  <label className="cs-field">
                    <span className="cs-label">{say('القيمة (رقم أو رمز)', 'Value')}</span>
                    <input
                      dir="ltr"
                      value={stat.value ?? ''}
                      onChange={(e) => {
                        const next = [...(data.stats ?? [])];
                        next[i] = { ...next[i], value: e.target.value };
                        set({ stats: next });
                      }}
                      placeholder="7 أو 100%..."
                    />
                  </label>
                  <BilingualField
                    arLabel={say('التسمية — عربي', 'Label — Arabic')}
                    enLabel={say('التسمية — إنجليزي', 'Label — English')}
                    value={stat.label ?? { ar: '', en: '' }}
                    onChange={(v) => {
                      const next = [...(data.stats ?? [])];
                      next[i] = { ...next[i], label: v };
                      set({ stats: next });
                    }}
                    showEn={showEnglishFields}
                  />
                </div>
              </div>
            ))}
            {(data.stats ?? []).length < 6 && (
              <button
                type="button"
                className="button secondary"
                onClick={() =>
                  set({
                    stats: [
                      ...(data.stats ?? []),
                      { value: '100%', label: { ar: 'شفافية كاملة', en: 'Full Transparency' } },
                    ],
                  })
                }
              >
                + {say('إضافة إحصاء جديد', 'Add Stat')}
              </button>
            )}
          </div>
        </section>

        {/* ── 3. STORY SECTION */}
        <section className="cs-section">
          <div className="cs-section-header">
            <span className="cs-section-icon">📖</span>
            <div>
              <h3 className="cs-section-title">{say('قصة المتجر والبداية', 'Our Origin Story')}</h3>
              <p className="cs-section-sub">
                {say(
                  'سرد إنساني جذاب يشرح سبب إنشاء المتجر وكيف نخدم العميل',
                  'Engaging narrative showing why the store was created and our passion for tech'
                )}
              </p>
            </div>
          </div>
          <div className="cs-fields-grid">
            <BilingualField
              arLabel={say('عنوان القسم — عربي', 'Title — Arabic')}
              enLabel={say('عنوان القسم — إنجليزي', 'Title — English')}
              value={data.story?.title ?? { ar: '', en: '' }}
              onChange={(v) => set({ story: { ...data.story, title: v } })}
              showEn={showEnglishFields}
            />
            <BilingualField
              arLabel={say('نص القصة — عربي', 'Content — Arabic')}
              enLabel={say('نص القصة — إنجليزي', 'Content — English')}
              value={data.story?.content ?? { ar: '', en: '' }}
              onChange={(v) => set({ story: { ...data.story, content: v } })}
              multiline
              showEn={showEnglishFields}
            />
            <label className="cs-field">
              <span className="cs-label">{say('سنة الانطلاق', 'Year Founded')}</span>
              <input
                type="number"
                dir="ltr"
                value={data.story?.year ?? ''}
                onChange={(e) =>
                  set({
                    story: {
                      ...data.story,
                      year: e.target.value ? Number(e.target.value) : null,
                    },
                  })
                }
                placeholder="2023"
              />
            </label>
            <label className="cs-field">
              <span className="cs-label">{say('رابط صورة القصة (اختياري)', 'Story Image URL')}</span>
              <input
                dir="ltr"
                value={data.story?.image ?? ''}
                onChange={(e) =>
                  set({
                    story: { ...data.story, image: e.target.value.trim() || null },
                  })
                }
                placeholder="/api/media/..."
              />
            </label>
          </div>
        </section>

        {/* ── 4. MISSION SECTION */}
        <section className="cs-section">
          <div className="cs-section-header">
            <span className="cs-section-icon">🎯</span>
            <div>
              <h3 className="cs-section-title">{say('الرسالة والرؤية', 'Mission & Core Vision')}</h3>
              <p className="cs-section-sub">
                {say(
                  'المبدأ الذي يقوم عليه المتجر في تقديم أجهزة متوافقة ومضمونة',
                  'Our core promise of verified setups and guaranteed reliability'
                )}
              </p>
            </div>
          </div>
          <div className="cs-fields-grid">
            <BilingualField
              arLabel={say('عنوان الرسالة — عربي', 'Title — Arabic')}
              enLabel={say('عنوان الرسالة — إنجليزي', 'Title — English')}
              value={data.mission?.title ?? { ar: '', en: '' }}
              onChange={(v) => set({ mission: { ...data.mission, title: v } })}
              showEn={showEnglishFields}
            />
            <BilingualField
              arLabel={say('نص الرسالة — عربي', 'Content — Arabic')}
              enLabel={say('نص الرسالة — إنجليزي', 'Content — English')}
              value={data.mission?.content ?? { ar: '', en: '' }}
              onChange={(v) => set({ mission: { ...data.mission, content: v } })}
              multiline
              showEn={showEnglishFields}
            />
            <label className="cs-field cs-field--full">
              <span className="cs-label">{say('رابط صورة الرسالة (اختياري)', 'Mission Image URL')}</span>
              <input
                dir="ltr"
                value={data.mission?.image ?? ''}
                onChange={(e) =>
                  set({
                    mission: { ...data.mission, image: e.target.value.trim() || null },
                  })
                }
                placeholder="/api/media/..."
              />
            </label>
          </div>
        </section>

        {/* ── 5. WHY US */}
        <section className="cs-section">
          <div className="cs-section-header">
            <span className="cs-section-icon">⭐</span>
            <div>
              <h3 className="cs-section-title">{say('لماذا تختارنا؟ (نقاط القوة)', 'Why Choose Us')}</h3>
              <p className="cs-section-sub">
                {say(
                  'البطاقات التي توضح المزايا التنافسية (الفحص، الضمان، التوافق، الدعم)',
                  'Competitive advantages cards (e.g. testing, written warranty, compatibility)'
                )}
              </p>
            </div>
          </div>
          <div className="cs-sections" style={{ gap: 12 }}>
            {(data.whyUs ?? []).map((item, i) => (
              <div
                key={i}
                className="cs-section"
                style={{ background: 'var(--bg-muted, #f8fafc)', borderRadius: 12, padding: 16 }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: 12,
                  }}
                >
                  <strong style={{ fontSize: 13 }}>
                    {say(`الميزة ${i + 1}`, `Feature ${i + 1}`)}
                  </strong>
                  <button
                    type="button"
                    className="button secondary"
                    style={{ padding: '2px 8px', fontSize: 12 }}
                    onClick={() => {
                      const next = [...(data.whyUs ?? [])];
                      next.splice(i, 1);
                      set({ whyUs: next });
                    }}
                  >
                    {say('حذف', 'Remove')}
                  </button>
                </div>
                <div className="cs-fields-grid">
                  <label className="cs-field">
                    <span className="cs-label">{say('الأيقونة', 'Icon')}</span>
                    <select
                      value={item.icon}
                      onChange={(e) => {
                        const next = [...(data.whyUs ?? [])];
                        next[i] = { ...next[i], icon: e.target.value };
                        set({ whyUs: next });
                      }}
                    >
                      {ICON_OPTIONS.map((ic) => (
                        <option key={ic.value} value={ic.value}>
                          {ic.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <BilingualField
                    arLabel={say('العنوان — عربي', 'Title — Arabic')}
                    enLabel={say('العنوان — إنجليزي', 'Title — English')}
                    value={item.title ?? { ar: '', en: '' }}
                    onChange={(v) => {
                      const next = [...(data.whyUs ?? [])];
                      next[i] = { ...next[i], title: v };
                      set({ whyUs: next });
                    }}
                    showEn={showEnglishFields}
                  />
                  <BilingualField
                    arLabel={say('الوصف — عربي', 'Description — Arabic')}
                    enLabel={say('الوصف — إنجليزي', 'Description — English')}
                    value={item.description ?? { ar: '', en: '' }}
                    onChange={(v) => {
                      const next = [...(data.whyUs ?? [])];
                      next[i] = { ...next[i], description: v };
                      set({ whyUs: next });
                    }}
                    multiline
                    showEn={showEnglishFields}
                  />
                </div>
              </div>
            ))}
            {(data.whyUs ?? []).length < 8 && (
              <button
                type="button"
                className="button secondary"
                onClick={() =>
                  set({
                    whyUs: [
                      ...(data.whyUs ?? []),
                      {
                        icon: 'shield',
                        title: { ar: 'ميزة جديدة', en: 'New Feature' },
                        description: { ar: 'تفاصيل الميزة...', en: 'Feature details...' },
                      },
                    ],
                  })
                }
              >
                + {say('إضافة ميزة جديدة', 'Add Feature')}
              </button>
            )}
          </div>
        </section>

        {/* ── 6. TEAM HIGHLIGHT */}
        <section className="cs-section">
          <div className="cs-section-header">
            <span className="cs-section-icon">👥</span>
            <div>
              <h3 className="cs-section-title">{say('فريق العمل والخبرات', 'Team & Expertise')}</h3>
              <p className="cs-section-sub">
                {say(
                  'إبراز الجانب البشري والخبرة الفنية للفريق لإعطاء أمان وثقة للمشتري',
                  'Humanize your brand by highlighting tech expertise and customer-first support'
                )}
              </p>
            </div>
          </div>
          <div className="cs-fields-grid">
            <BilingualField
              arLabel={say('عنوان الفريق — عربي', 'Title — Arabic')}
              enLabel={say('عنوان الفريق — إنجليزي', 'Title — English')}
              value={data.teamHighlight?.title ?? { ar: '', en: '' }}
              onChange={(v) =>
                set({
                  teamHighlight: {
                    ...(data.teamHighlight ?? { description: { ar: '', en: '' }, image: null }),
                    title: v,
                  },
                })
              }
              showEn={showEnglishFields}
            />
            <BilingualField
              arLabel={say('الوصف — عربي', 'Description — Arabic')}
              enLabel={say('الوصف — إنجليزي', 'Description — English')}
              value={data.teamHighlight?.description ?? { ar: '', en: '' }}
              onChange={(v) =>
                set({
                  teamHighlight: {
                    ...(data.teamHighlight ?? { title: { ar: '', en: '' }, image: null }),
                    description: v,
                  },
                })
              }
              multiline
              showEn={showEnglishFields}
            />
            <label className="cs-field cs-field--full">
              <span className="cs-label">
                {say('رابط صورة الفريق (اختياري)', 'Team Image URL')}
              </span>
              <input
                dir="ltr"
                value={data.teamHighlight?.image ?? ''}
                onChange={(e) =>
                  set({
                    teamHighlight: {
                      ...(data.teamHighlight ?? {
                        title: { ar: '', en: '' },
                        description: { ar: '', en: '' },
                      }),
                      image: e.target.value.trim() || null,
                    },
                  })
                }
                placeholder="/api/media/..."
              />
            </label>
          </div>
        </section>

        {/* ── 7. CORE VALUES */}
        <section className="cs-section">
          <div className="cs-section-header">
            <span className="cs-section-icon">💎</span>
            <div>
              <h3 className="cs-section-title">{say('القيم والمبادئ الأساسية', 'Core Values')}</h3>
              <p className="cs-section-sub">
                {say(
                  'المبادئ الأخلاقية والمهنية (الشفافية، الجودة، خدمة العميل)',
                  'The principles guiding your service (transparency, craftsmanship, customer care)'
                )}
              </p>
            </div>
          </div>
          <div className="cs-sections" style={{ gap: 12 }}>
            {(data.values ?? []).map((val, i) => (
              <div
                key={i}
                className="cs-section"
                style={{ background: 'var(--bg-muted, #f8fafc)', borderRadius: 12, padding: 16 }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: 12,
                  }}
                >
                  <strong style={{ fontSize: 13 }}>
                    {say(`القيمة ${i + 1}`, `Value ${i + 1}`)}
                  </strong>
                  <button
                    type="button"
                    className="button secondary"
                    style={{ padding: '2px 8px', fontSize: 12 }}
                    onClick={() => {
                      const next = [...(data.values ?? [])];
                      next.splice(i, 1);
                      set({ values: next });
                    }}
                  >
                    {say('حذف', 'Remove')}
                  </button>
                </div>
                <div className="cs-fields-grid">
                  <label className="cs-field">
                    <span className="cs-label">{say('الأيقونة', 'Icon')}</span>
                    <select
                      value={val.icon}
                      onChange={(e) => {
                        const next = [...(data.values ?? [])];
                        next[i] = { ...next[i], icon: e.target.value };
                        set({ values: next });
                      }}
                    >
                      {ICON_OPTIONS.map((ic) => (
                        <option key={ic.value} value={ic.value}>
                          {ic.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <BilingualField
                    arLabel={say('العنوان — عربي', 'Title — Arabic')}
                    enLabel={say('العنوان — إنجليزي', 'Title — English')}
                    value={val.title ?? { ar: '', en: '' }}
                    onChange={(v) => {
                      const next = [...(data.values ?? [])];
                      next[i] = { ...next[i], title: v };
                      set({ values: next });
                    }}
                    showEn={showEnglishFields}
                  />
                  <BilingualField
                    arLabel={say('الوصف — عربي', 'Description — Arabic')}
                    enLabel={say('الوصف — إنجليزي', 'Description — English')}
                    value={val.description ?? { ar: '', en: '' }}
                    onChange={(v) => {
                      const next = [...(data.values ?? [])];
                      next[i] = { ...next[i], description: v };
                      set({ values: next });
                    }}
                    multiline
                    showEn={showEnglishFields}
                  />
                </div>
              </div>
            ))}
            {(data.values ?? []).length < 6 && (
              <button
                type="button"
                className="button secondary"
                onClick={() =>
                  set({
                    values: [
                      ...(data.values ?? []),
                      {
                        icon: 'eye',
                        title: { ar: 'قيمة جديدة', en: 'New Value' },
                        description: { ar: 'وصف القيمة...', en: 'Value description...' },
                      },
                    ],
                  })
                }
              >
                + {say('إضافة قيمة جديدة', 'Add Value')}
              </button>
            )}
          </div>
        </section>

        {/* ── 8. CALL TO ACTION (CTA) */}
        <section className="cs-section">
          <div className="cs-section-header">
            <span className="cs-section-icon">📣</span>
            <div>
              <h3 className="cs-section-title">{say('دعوة العمل الختامية (CTA)', 'Call to Action')}</h3>
              <p className="cs-section-sub">
                {say(
                  'البانر في نهاية الصفحة لتشجيع الزائر على تصفح المتجر أو التواصل',
                  'Bottom banner encouraging the visitor to explore catalog or contact store'
                )}
              </p>
            </div>
          </div>
          <div className="cs-fields-grid">
            <BilingualField
              arLabel={say('عنوان الدعوة — عربي', 'CTA Title — Arabic')}
              enLabel={say('عنوان الدعوة — إنجليزي', 'CTA Title — English')}
              value={data.ctaTitle ?? { ar: '', en: '' }}
              onChange={(v) => set({ ctaTitle: v })}
              showEn={showEnglishFields}
            />
            <BilingualField
              arLabel={say('نص الدعوة — عربي', 'CTA Description — Arabic')}
              enLabel={say('نص الدعوة — إنجليزي', 'CTA Description — English')}
              value={data.ctaDescription ?? { ar: '', en: '' }}
              onChange={(v) => set({ ctaDescription: v })}
              multiline
              showEn={showEnglishFields}
            />
          </div>
        </section>
      </div>

      {/* ── SAVE BAR */}
      <div className="cs-save-bar">
        {saved && (
          <span className="cs-saved-badge">
            ✓ {say('تم حفظ صفحة من نحن بنجاح!', 'About page saved successfully!')}
          </span>
        )}
        <button className="button primary" disabled={busy}>
          {busy
            ? say('جارٍ الحفظ…', 'Saving…')
            : say('حفظ تغييرات صفحة من نحن', 'Save About Page Changes')}
        </button>
      </div>
    </form>
  );
}
