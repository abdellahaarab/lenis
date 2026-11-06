import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, FileText, Lock, CheckCircle2, AlertTriangle, ArrowRight, ArrowLeft } from 'lucide-react';
import { useLanguage } from '@/i18n/LanguageContext';

export default function LegalPage() {
  const { language, dir } = useLanguage();
  const [activeSection, setActiveSection] = useState<'terms' | 'warranty' | 'privacy'>('terms');

  return (
    <main id="main-content" className="min-h-screen pt-24 pb-20 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto" dir={dir}>
      {/* Breadcrumb Navigation */}
      <nav aria-label="Breadcrumb" className="mb-4 flex items-center gap-2 text-xs text-neutral-500">
        <Link to={`/${language}`} className="hover:text-purple-600 transition-colors">
          {language === 'ar' ? 'الرئيسية' : 'Home'}
        </Link>
        <span>/</span>
        <span className="text-neutral-900 dark:text-neutral-100 font-semibold">
          {language === 'ar' ? 'الشروط والضمان والخصوصية' : 'Terms, Warranty & Privacy'}
        </span>
      </nav>

      <div className="mb-8">
        <h1 className="text-2xl sm:text-4xl font-extrabold text-neutral-900 dark:text-neutral-50">
          {language === 'ar' ? 'السياسات الرسمية وميثاق الثقة' : 'Legal Policies & Trust Charter'}
        </h1>
        <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-1">
          {language === 'ar'
            ? 'مبادئ وأحكام التعامل، ميثاق الشفافية والأمانة في فحص الأجهزة، وسياسة الاستبدال والضمان المعتمدة في صنعاء.'
            : 'Operational terms, transparent inspection charter, and verified warranty policies in Sana\'a, Yemen.'}
        </p>
      </div>

      {/* Tabs Switcher */}
      <div className="flex items-center gap-2 border-b border-neutral-200 dark:border-neutral-800 mb-8 overflow-x-auto pb-1">
        <button
          onClick={() => setActiveSection('terms')}
          className={`pb-3 text-xs sm:text-sm font-bold flex items-center gap-2 border-b-2 transition-all whitespace-nowrap ${
            activeSection === 'terms'
              ? 'border-purple-600 text-purple-600 dark:text-purple-400'
              : 'border-transparent text-neutral-500 hover:text-neutral-900'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>{language === 'ar' ? 'شروط وأحكام الشراء' : 'Terms of Purchase'}</span>
        </button>

        <button
          onClick={() => setActiveSection('warranty')}
          className={`pb-3 text-xs sm:text-sm font-bold flex items-center gap-2 border-b-2 transition-all whitespace-nowrap ${
            activeSection === 'warranty'
              ? 'border-purple-600 text-purple-600 dark:text-purple-400'
              : 'border-transparent text-neutral-500 hover:text-neutral-900'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          <span>{language === 'ar' ? 'ميثاق الفحص وسياسة الاستبدال' : 'Inspection & Replacement Policy'}</span>
        </button>

        <button
          onClick={() => setActiveSection('privacy')}
          className={`pb-3 text-xs sm:text-sm font-bold flex items-center gap-2 border-b-2 transition-all whitespace-nowrap ${
            activeSection === 'privacy'
              ? 'border-purple-600 text-purple-600 dark:text-purple-400'
              : 'border-transparent text-neutral-500 hover:text-neutral-900'
          }`}
        >
          <Lock className="w-4 h-4" />
          <span>{language === 'ar' ? 'الخصوصية وسرية البيانات' : 'Privacy & Confidentiality'}</span>
        </button>
      </div>

      {/* Section Content */}
      <div className="space-y-6 text-neutral-700 dark:text-neutral-300 text-xs sm:text-sm leading-relaxed p-6 sm:p-8 rounded-3xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800">
        {activeSection === 'terms' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-neutral-900 dark:text-neutral-100 mb-2">
                {language === 'ar' ? '1. طبيعة الطلب وحجز المخزون' : '1. Order Nature & Stock Allocation'}
              </h2>
              <p>
                {language === 'ar'
                  ? 'تسجيل الطلب عبر الموقع الإلكتروني يمثل رغبة مبدئية ولا يخصم أي مبالغ مالية تلقائياً. يتم تأكيد توفر القطعة بالسعر المحدد بالتواصل المباشر مع فريق المبيعات في معرض شارع صخر بصنعاء أو عبر واتساب.'
                  : 'Placing an online order creates an intent without automated upfront charges. Stock availability is confirmed directly with our showroom team in Sakhr Street, Sana\'a.'}
              </p>
            </div>

            <div>
              <h2 className="text-base sm:text-lg font-bold text-neutral-900 dark:text-neutral-100 mb-2">
                {language === 'ar' ? '2. العملات وأسعار الصرف' : '2. Currency & Exchange Rates'}
              </h2>
              <p>
                {language === 'ar'
                  ? 'الأسعار المرجعية للأجهزة محددة بالدولار الأمريكي (USD). في حال الدفع بالريال اليمني (YER)، يتم الاحتساب بحسب سعر الصرف السائد في السوق اليمني يوم تسليم الجهاز واعتماد الفاتورة.'
                  : 'Benchmark pricing is quoted in USD. Local payments in Yemeni Rial (YER) are calculated based on the market exchange rate on the invoice confirmation date.'}
              </p>
            </div>

            <div>
              <h2 className="text-base sm:text-lg font-bold text-neutral-900 dark:text-neutral-100 mb-2">
                {language === 'ar' ? '3. المعاينة والفحص قبل الدفع' : '3. Physical Inspection Before Payment'}
              </h2>
              <p>
                {language === 'ar'
                  ? 'يحق للعميل معاينة الجهاز وتشغيله بالكامل والتأكد من مطابقة المواصفات وصحة البطارية المعلنة في المعرض بصنعاء قبل سداد المبلغ.'
                  : 'Customers have full rights to inspect and benchmark hardware at our showroom before final payment.'}
              </p>
            </div>
          </div>
        )}

        {activeSection === 'warranty' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-neutral-900 dark:text-neutral-100 mb-2">
                {language === 'ar' ? '1. ميثاق الشفافية والفحص بـ 7 نقاط' : '1. 7-Point Inspection Integrity'}
              </h2>
              <p>
                {language === 'ar'
                  ? 'نلتزم بالإفصاح التام عن درجة حالة كل جهاز (جديد بالكرتون، وكالة درجة A، أو مجدد)، مع تسجيل نسبة صحة البطارية الحقيقية وأي ملاحظات مظهرية بكل أمانة دون إخفاء أي تفاصيل.'
                  : 'We strictly disclose accurate condition grades (Brand New, Grade A, or Refurbished) along with authentic battery health percentages and physical cosmetic notes.'}
              </p>
            </div>

            <div>
              <h2 className="text-base sm:text-lg font-bold text-neutral-900 dark:text-neutral-100 mb-2">
                {language === 'ar' ? '2. شروط الاستبدال والصيانة' : '2. Replacement & Repair Guarantees'}
              </h2>
              <p>
                {language === 'ar'
                  ? 'في حال ظهور أي خلل مصنعي غير معلن خلال فترة الضمان المحددة في الفاتورة، يلتزم المتجر بإصلاح الخلل أو استبدال الجهاز فوراً بجهاز مماثل أو ترقية متفق عليها دون تأخير.'
                  : 'Should an undisclosed manufacturing defect emerge within the warranty timeframe stated on your invoice, our workshop commits to immediate repair or replacement.'}
              </p>
            </div>
          </div>
        )}

        {activeSection === 'privacy' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-neutral-900 dark:text-neutral-100 mb-2">
                {language === 'ar' ? '1. سرية أرقام الهواتف وبيانات العملاء' : '1. Customer Phone & Data Confidentiality'}
              </h2>
              <p>
                {language === 'ar'
                  ? 'رقم الهاتف والاسم المدخلان في حسابك يُستخدمان فقط للتواصل بخصوص طلبك وتنسيق التسليم، ولا تتم مشاركتهما مع أي طرف ثالث أو استخدامها لأغراض إعلانية مزعجة.'
                  : 'Your phone number and name are solely utilized for order processing, logistics, and verification. We never share customer data with third parties.'}
              </p>
            </div>

            <div>
              <h2 className="text-base sm:text-lg font-bold text-neutral-900 dark:text-neutral-100 mb-2">
                {language === 'ar' ? '2. أمان الحسابات وكلمات المرور' : '2. Password Security'}
              </h2>
              <p>
                {language === 'ar'
                  ? 'يتم تشفير كلمات المرور باستخدام أحدث تقنيات التشفير أحادي الاتجاه (One-way hashing). لا يستطيع أي موظف أو طرف الاطلاع على كلمة مرورك.'
                  : 'Passwords are encrypted using industry standard cryptographic hashing. No staff member has access to your raw credentials.'}
              </p>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
