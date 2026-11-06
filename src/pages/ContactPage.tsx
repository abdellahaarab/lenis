import { useCatalog } from '@/data/CatalogContext';
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Phone,
  MessageCircle,
  MapPin,
  Clock,
  Send,
  AlertCircle,
  CheckCircle2,
  Copy,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import { useLanguage } from '@/i18n/LanguageContext';

export const ContactPage: React.FC = () => {
  const { site: siteData } = useCatalog();
  const { language, dir, t } = useLanguage();
  const [formData, setFormData] = useState({
    name: '',
    useCase: 'work',
    budget: '',
    deviceDetails: '',
    notes: '',
  });
  const [copied, setCopied] = useState(false);

  const phoneVal = siteData.phone as string | null;
  const whatsappVal = siteData.whatsapp as string | null;
  const addressVal = siteData.address as { ar: string; en: string } | null;
  const workingHoursVal = siteData.workingHours as { ar: string; en: string } | null;

  const hasWhatsapp = Boolean(whatsappVal && whatsappVal.trim().length > 0);
  const hasPhone = Boolean(phoneVal && phoneVal.trim().length > 0);
  const addressText = addressVal
    ? addressVal[language] || addressVal.ar
    : language === 'ar'
    ? 'صنعاء، اليمن (العنوان الدقيق ورابط الخريطة قيد الاعتماد من إدارة المتجر)'
    : 'Sana\'a, Yemen (Exact physical address & map link pending owner confirmation)';

  const workingHoursText = workingHoursVal
    ? workingHoursVal[language] || workingHoursVal.ar
    : language === 'ar'
    ? 'ساعات الدوام تُحدد وتُعتمد رسميًا مع إدارة المحل'
    : 'Store hours are specified upon direct consultation';

  const briefText = `${language === 'ar' ? 'ملخص احتياج تقني — الجيل العربي الرقمي' : 'Setup Brief — Al-Jeel Al-Arabi'}\n` +
    `• ${language === 'ar' ? 'الاسم' : 'Name'}: ${formData.name || (language === 'ar' ? 'غير محدد' : 'Unspecified')}\n` +
    `• ${language === 'ar' ? 'طبيعة الاستخدام' : 'Use Case'}: ${formData.useCase}\n` +
    `• ${language === 'ar' ? 'الميزانية التقريبية' : 'Budget'}: ${formData.budget || (language === 'ar' ? 'غير محددة' : 'Flexible')}\n` +
    `• ${language === 'ar' ? 'الجهاز المطلوب / المواصفات' : 'Requested Hardware'}: ${formData.deviceDetails || (language === 'ar' ? 'بحاجة لاقتراح' : 'Recommendations needed')}\n` +
    `• ${language === 'ar' ? 'ملاحظات' : 'Notes'}: ${formData.notes || '-'}`;

  const handleCopyBrief = () => {
    navigator.clipboard.writeText(briefText);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  // Schema.org LocalBusiness JSON-LD
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: siteData.storeName[language] || siteData.storeName.ar,
    telephone: siteData.phone || undefined,
    address: {
      '@type': 'PostalAddress',
      addressLocality: 'Sana\'a',
      addressCountry: 'YE',
    },
    openingHoursSpecification: siteData.workingHours ? [] : undefined,
  };

  return (
    <div className="min-h-screen pt-28 pb-24 bg-neutral-50 dark:bg-neutral-950">
      {/* Schema.org LocalBusiness JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-5xl">
        {/* Breadcrumb Navigation */}
        <nav
          aria-label="Breadcrumb"
          className="flex items-center gap-1.5 text-xs text-neutral-500 dark:text-neutral-400 mb-6"
        >
          <Link to={`/${language}`} className="hover:text-purple-600 transition-colors">
            {language === 'ar' ? 'الرئيسية' : 'Home'}
          </Link>
          <ChevronRight className={`w-3.5 h-3.5 shrink-0 ${dir === 'rtl' ? 'rotate-180' : ''}`} />
          <span className="text-neutral-800 dark:text-neutral-200 font-medium">
            {language === 'ar' ? 'التواصل والموقع' : 'Contact & Location'}
          </span>
        </nav>

        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 text-purple-700 dark:text-purple-300 text-xs font-bold uppercase tracking-wider mb-3">
            <MessageCircle className="w-4 h-4" />
            <span>{language === 'ar' ? 'قنوات مباشرة' : 'Direct Channels'}</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-neutral-900 dark:text-neutral-50 tracking-tight mb-3">
            {language === 'ar' ? 'التواصل، الموقع والاستفسار' : 'Contact, Location & Inquiries'}
          </h1>
          <p className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
            {language === 'ar'
              ? 'تفضل بزيارتنا في صنعاء لمعاينة وفحص الأجهزة مباشرة، أو نسق مواصفات تجهيزك لاستلام استشارة شراء فورية.'
              : 'Visit our center in Sana\'a to inspect devices in person, or map out your hardware specs for technical guidance.'}
          </p>
        </div>

        {/* Contact Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-16">
          {/* Card 1: Phone */}
          <div className="p-6 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 space-y-2">
            <div className="w-9 h-9 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-600">
              <Phone className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
              {language === 'ar' ? 'الهاتف المباشر' : 'Direct Phone'}
            </h3>
            <p className="text-xs text-neutral-500 leading-relaxed">
              {hasPhone ? (
                <a href={`tel:${siteData.phone}`} className="text-purple-600 font-semibold hover:underline">
                  {siteData.phone}
                </a>
              ) : (
                <span className="italic text-neutral-400">
                  {language === 'ar' ? 'قيد الاعتماد من إدارة المتجر' : 'Pending store confirmation'}
                </span>
              )}
            </p>
          </div>

          {/* Card 2: WhatsApp */}
          <div className="p-6 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 space-y-2">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-600">
              <MessageCircle className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
              {language === 'ar' ? 'واتساب المبيعات' : 'WhatsApp Sales'}
            </h3>
            <p className="text-xs text-neutral-500 leading-relaxed">
              {hasWhatsapp ? (
                <a
                  href={`https://wa.me/${siteData.whatsapp}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-emerald-600 font-semibold hover:underline"
                >
                  {siteData.whatsapp}
                </a>
              ) : (
                <span className="italic text-neutral-400">
                  {language === 'ar' ? 'قيد الاعتماد من إدارة المتجر' : 'Pending store confirmation'}
                </span>
              )}
            </p>
          </div>

          {/* Card 3: Address */}
          <div className="p-6 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 space-y-2">
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-600">
              <MapPin className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
              {language === 'ar' ? 'الموقع والمعرض' : 'Location & Store'}
            </h3>
            <p className="text-xs text-neutral-500 leading-relaxed">
              {addressText}
            </p>
          </div>

          {/* Card 4: Working Hours */}
          <div className="p-6 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 space-y-2">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-600">
              <Clock className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
              {language === 'ar' ? 'ساعات الدوام' : 'Working Hours'}
            </h3>
            <p className="text-xs text-neutral-500 leading-relaxed">
              {workingHoursText}
            </p>
          </div>
        </div>

        {/* Interactive Tool: Plan Your Setup / Request Consultation */}
        <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-6 sm:p-10">
          <div className="max-w-xl mb-8">
            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-purple-600 uppercase tracking-wider mb-2">
              <Sparkles className="w-3.5 h-3.5" />
              <span>{language === 'ar' ? 'أداة مساعدة' : 'Planning Tool'}</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-neutral-900 dark:text-neutral-100">
              {language === 'ar' ? 'رتّب احتياجك التقني واستخرج ملخصك' : 'Structure Your Tech Brief'}
            </h2>
            <p className="text-xs sm:text-sm text-neutral-500 mt-1 leading-relaxed">
              {language === 'ar'
                ? 'حدد طبيعة استخدامك وميزانيتك لتجهيز ملخص فني واضح يمكنك نسخه والتواصل به فور اعتماد قنوات الاتصال.'
                : 'Select your workflow and budget to generate a structured brief ready to discuss with sales.'}
            </p>
          </div>

          <form onSubmit={(e) => e.preventDefault()} className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                {language === 'ar' ? 'الاسم الكريم' : 'Your Name'}
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder={language === 'ar' ? 'مثال: محمد' : 'e.g. John'}
                className="w-full px-4 py-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-xs text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                {language === 'ar' ? 'طبيعة الاستخدام' : 'Primary Use Case'}
              </label>
              <select
                value={formData.useCase}
                onChange={(e) => setFormData({ ...formData, useCase: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-xs text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="study">{language === 'ar' ? 'أدرس وأتعلم (جامعي / دراسة)' : 'Study & College'}</option>
                <option value="work">{language === 'ar' ? 'أعمل وأنجز (إنتاجية ومكتب)' : 'Office & Productivity'}</option>
                <option value="content">{language === 'ar' ? 'أصنع محتوى (مونتاج وصوت)' : 'Content & Studio'}</option>
                <option value="gaming">{language === 'ar' ? 'ألعب وأستمتع (ألعاب وبث)' : 'Gaming & Esports'}</option>
                <option value="business">{language === 'ar' ? 'تجهيز شركة / مكتب متكامل' : 'Company / Enterprise'}</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                {language === 'ar' ? 'الميزانية التقريبية بالدولار ($)' : 'Approximate Budget ($)'}
              </label>
              <input
                type="text"
                value={formData.budget}
                onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                placeholder={language === 'ar' ? 'مثال: 400 - 600 $' : 'e.g. $400 - $600'}
                className="w-full px-4 py-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-xs text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                {language === 'ar' ? 'الجهاز المطلوب أو البرامج المستخدمة' : 'Target Specs or Key Apps'}
              </label>
              <input
                type="text"
                value={formData.deviceDetails}
                onChange={(e) => setFormData({ ...formData, deviceDetails: e.target.value })}
                placeholder={language === 'ar' ? 'مثال: لابتوب ThinkPad لبرامج AutoCAD' : 'e.g. ThinkPad laptop for AutoCAD'}
                className="w-full px-4 py-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-xs text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <div className="md:col-span-2 space-y-1.5">
              <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                {language === 'ar' ? 'ملاحظات أو استفسارات إضافية' : 'Additional Notes'}
              </label>
              <textarea
                rows={3}
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder={language === 'ar' ? 'أي تفاصيل عن البطارية، الشاشة، أو الملحقات المطلوبة...' : 'Any preferences on battery, display, or peripherals...'}
                className="w-full px-4 py-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-xs text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
              />
            </div>

            {/* Generated Brief Preview and Copy */}
            <div className="md:col-span-2 pt-4 border-t border-neutral-200 dark:border-neutral-800 flex flex-col sm:flex-row items-center justify-between gap-4">
              <p className="text-xs text-neutral-500">
                {language === 'ar'
                  ? 'يتم تنسيق الملخص محليًا على جهازك ليصبح جاهزًا للإرسال بمجرد اعتماد الرقم الرسمي.'
                  : 'Your brief is generated locally on your device for immediate sharing once official channels activate.'}
              </p>

              <button
                type="button"
                onClick={handleCopyBrief}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold transition-colors shrink-0"
              >
                {copied ? <CheckCircle2 className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? (language === 'ar' ? 'تم نسخ الملخص!' : 'Brief Copied!') : (language === 'ar' ? 'نسخ ملخص الاحتياج' : 'Copy Setup Brief')}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ContactPage;
