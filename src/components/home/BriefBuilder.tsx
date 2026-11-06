import { useCatalog } from '@/data/CatalogContext';
import { useState } from 'react';
import { useLanguage } from '@/i18n/LanguageContext';
import {
  MessageSquare,
  Copy,
  Check,
  Send,
  ArrowUpLeft,
  ArrowUpRight,
  Sparkles,
  HelpCircle
} from 'lucide-react';

export default function BriefBuilder() {
  const { bundles: bundles, site: site } = useCatalog();
  const { language } = useLanguage();
  const ar = language === 'ar';
  const Arrow = ar ? ArrowUpLeft : ArrowUpRight;

  const [use, setUse] = useState(bundles[1]?.id || 'work');
  const [details, setDetails] = useState('');
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState(false);

  const selectedBundle = bundles.find(b => b.id === use);
  const bundleTitle = selectedBundle ? selectedBundle.title[language] : '';

  const summary = `${site.storeName[language]} — ${ar ? 'طلب استشارة وتجهيز عتاد' : 'Hardware Consultation Brief'}\n` +
    `----------------------------------------\n` +
    `${ar ? 'طبيعة الاستخدام المطلوب' : 'Intended Workflow'}: ${bundleTitle}\n` +
    (details.trim() ? `${ar ? 'التفاصيل والمواصفات المقترحة' : 'Specific Requirements'}:\n${details.trim()}\n` : '') +
    `----------------------------------------\n` +
    `${ar ? 'تم التجهيز عبر موقع الجيل العربي الرقمي' : 'Generated via Digital Arab Generation Portal'}`;

  const copyBrief = async () => {
    try {
      await navigator.clipboard.writeText(summary);
      setCopied(true);
      setError(false);
      setTimeout(() => setCopied(false), 3000);
    } catch {
      setError(true);
    }
  };

  return (
    <section id="contact" className="brief-builder-section page-shell">
      <div className="brief-builder-card">
        {/* Left Side: Instructions & Value */}
        <div className="brief-info-side">
          <div className="eyebrow-chip">
            <MessageSquare size={15} />
            <span>{ar ? 'تجهيز واستشارة مخصصة' : 'Interactive Hardware Brief'}</span>
          </div>

          <h2>{ar ? 'رتّب احتياجك.. واحصل على توصية مدروسة' : 'Configure Your Requirements & Get Expert Guidance'}</h2>

          <p>
            {ar
              ? 'اختر مجالك واكتب مواصفاتك أو ميزانيتك التقريبية. سنساعدك في الجيل العربي الرقمي بصنعاء على انتقاء التوليفة الأكثر استقراراً وجاهزية.'
              : 'Specify your workflow, current hardware, or target budget. Our technical advisors in Sana’a will recommend the most stable, cost-effective setup.'}
          </p>

          <div className="brief-perks">
            <div className="brief-perk-item">
              <Sparkles size={16} className="text-amber" />
              <span>{ar ? 'استشارة مجانية بدون أي التزام بالشراء' : 'Zero-obligation technical guidance'}</span>
            </div>
            <div className="brief-perk-item">
              <Check size={16} className="text-status" />
              <span>{ar ? 'اقتراح أجهزة مفحوصة ومتوافقة 100%' : '100% inspected and compatible options'}</span>
            </div>
            <div className="brief-perk-item">
              <HelpCircle size={16} className="text-violet" />
              <span>{ar ? 'توصيات بحلول الطاقة والـ UPS الملائمة' : 'Custom UPS & power backup sizing'}</span>
            </div>
          </div>
        </div>

        {/* Right Side: Form */}
        <div className="brief-form-side">
          <form onSubmit={e => e.preventDefault()} className="brief-form">
            <div className="form-field">
              <label htmlFor="brief-use">
                {ar ? 'طبيعة الاستخدام الأساسي' : 'Primary Use Case'}
              </label>
              <select
                id="brief-use"
                value={use}
                onChange={e => {
                  setUse(e.target.value);
                  setCopied(false);
                }}
                className="brief-select"
              >
                {bundles.map(b => (
                  <option key={b.id} value={b.id}>
                    {b.title[language]} — {b.summary[language]}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-field">
              <label htmlFor="brief-details">
                {ar ? 'تفاصيل إضافية، برامجك الأساسية، أو ميزانيتك المقترحة' : 'Additional Notes, Key Software, or Target Budget'}
              </label>
              <textarea
                id="brief-details"
                rows={4}
                placeholder={
                  ar
                    ? 'مثال: أحتاج لابتوب برمجة 16GB رام مع شاشة إضافية، واستخدام Docker، مع حل لانقطاع الكهرباء…'
                    : 'e.g., Looking for a 16GB ThinkPad for coding, secondary monitor, and UPS backup…'
                }
                value={details}
                onChange={e => {
                  setDetails(e.target.value);
                  setCopied(false);
                }}
                className="brief-textarea"
              />
            </div>

            <div className="brief-actions-group">
              <button
                type="button"
                className="desk-action desk-action-secondary"
                onClick={copyBrief}
              >
                {copied ? <Check size={18} className="text-status" /> : <Copy size={18} />}
                <span>{copied ? (ar ? 'تم نسخ التقرير' : 'Brief Copied!') : (ar ? 'نسخ ملخص الاحتياج' : 'Copy Brief Summary')}</span>
              </button>

              {site.whatsapp ? (
                <a
                  className="desk-action order-action"
                  href={`https://wa.me/${site.whatsapp}?text=${encodeURIComponent(summary)}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  <Send size={18} />
                  <span>{ar ? 'إرسال مباشر عبر واتساب' : 'Send via WhatsApp'}</span>
                  <Arrow size={16} />
                </a>
              ) : (
                <button
                  type="button"
                  className="desk-action order-action"
                  onClick={copyBrief}
                >
                  <Send size={18} />
                  <span>{ar ? 'تجهيز الملخص للواتساب' : 'Format for WhatsApp'}</span>
                  <Arrow size={16} />
                </button>
              )}
            </div>

            <p className="brief-status-note">
              {error
                ? (ar ? 'تعذر النسخ تلقائيًا؛ يمكنك تحديد النص ونسخه يدويًا.' : 'Clipboard access denied; please copy manually.')
                : (ar ? 'سيتم تجهيز ملخص مرتب يمكنك إرساله لفريق المتجر لمناقشة التوفر والأسعار.' : 'A clean brief will be prepared to send directly to the store team.')}
            </p>
          </form>
        </div>
      </div>
    </section>
  );
}
