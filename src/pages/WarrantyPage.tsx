import { useCatalog } from '@/data/CatalogContext';
import React from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ShieldCheck,
  CheckCircle2,
  Sparkles,
  AlertCircle,
  FileText,
  HelpCircle,
  PackageCheck,
  ChevronRight,
} from 'lucide-react';
import { useLanguage } from '@/i18n/LanguageContext';

export const WarrantyPage: React.FC = () => {
  const { warranty: warrantyData } = useCatalog();
  const { subtab } = useParams<{ subtab?: string }>();
  const { language, dir } = useLanguage();

  const currentTab = subtab || 'condition-grades';

  const tabs = [
    {
      id: 'condition-grades',
      label: language === 'ar' ? 'درجات حالة الجهاز' : 'Condition Grades',
      icon: Sparkles,
      path: `/${language}/warranty/condition-grades`,
    },
    {
      id: 'inspection',
      label: language === 'ar' ? 'قائمة الفحص قبل التسليم' : '7-Point Inspection',
      icon: PackageCheck,
      path: `/${language}/warranty/inspection`,
    },
    {
      id: 'policy',
      label: language === 'ar' ? 'سياسة وشروط الضمان' : 'Warranty Policy',
      icon: FileText,
      path: `/${language}/warranty/policy`,
    },
  ];

  return (
    <div className="min-h-screen pt-28 pb-24 bg-neutral-50 dark:bg-neutral-950">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-6xl">
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
            {language === 'ar' ? 'الضمان والفحص' : 'Warranty & Inspection'}
          </span>
        </nav>

        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 text-purple-700 dark:text-purple-300 text-xs font-bold uppercase tracking-wider mb-3">
            <ShieldCheck className="w-4 h-4" />
            <span>{language === 'ar' ? 'ركائز الثقة والشفافية' : 'Trust & Quality Pillars'}</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-neutral-900 dark:text-neutral-50 tracking-tight mb-3">
            {language === 'ar' ? 'الضمان، درجات الحالة، والفحص الفني' : 'Warranty, Condition Grades & Inspection'}
          </h1>
          <p className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
            {language === 'ar'
              ? 'لا نبيع جهازًا مجهول الحالة أو مواصفات غامضة. كل جهاز في «الجيل العربي الرقمي» يحمل درجة حالة معلنة، وتقرير فحص بـ 7 نقاط، وضمانًا محددًا.'
              : 'We never sell hardware with ambiguous condition or hidden specs. Every device carries a declared condition grade, a 7-point inspection report, and defined warranty terms.'}
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center justify-center gap-2 mb-10 overflow-x-auto pb-2 scrollbar-none">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = currentTab === tab.id;
            return (
              <Link
                key={tab.id}
                to={tab.path}
                className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all border ${
                  isActive
                    ? 'bg-purple-600 text-white border-purple-600 shadow-md shadow-purple-600/20'
                    : 'bg-white dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300 border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </Link>
            );
          })}
        </div>

        {/* Tab Content: 1. Condition Grades */}
        {currentTab === 'condition-grades' && (
          <section aria-label="Condition Grades" className="space-y-6">
            <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-6 sm:p-8">
              <h2 className="text-xl font-bold text-neutral-900 dark:text-neutral-100 mb-2">
                {language === 'ar' ? 'نظام درجات حالة الجهاز الموحد' : 'Unified Device Condition Grading System'}
              </h2>
              <p className="text-xs sm:text-sm text-neutral-500 mb-8 leading-relaxed">
                {language === 'ar'
                  ? 'بدلًا من المصطلحات الفضفاضة، نعتمد معايير واضحة تُصنف الأجهزة بناءً على فحص الهيكل الخارجي وصحة البطارية وسلامة الشاشة.'
                  : 'Instead of ambiguous market terms, we adhere to strict objective criteria assessing chassis condition, battery health, and display integrity.'}
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {warrantyData.conditionGrades.map((grade) => (
                  <div
                    key={grade.grade}
                    className="p-5 rounded-xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700/80 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="px-3 py-1 rounded-full text-xs font-bold bg-purple-600 text-white">
                        {grade.label[language] || grade.label.ar}
                      </span>
                      <span className="text-xs font-semibold text-neutral-500">
                        {grade.grade === 'new' ? 'New In Box' : `Grade ${grade.grade}`}
                      </span>
                    </div>

                    <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
                      {grade.meaning[language] || grade.meaning.ar}
                    </h3>

                    <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
                      {grade.criteria[language] || grade.criteria.ar}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Tab Content: 2. Inspection Checklist */}
        {currentTab === 'inspection' && (
          <section aria-label="Inspection Checklist" className="space-y-6">
            <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-6 sm:p-8">
              <h2 className="text-xl font-bold text-neutral-900 dark:text-neutral-100 mb-2">
                {language === 'ar' ? 'قائمة الفحص الفني المعتمد (7 نقاط)' : '7-Point Pre-Delivery Technical Checklist'}
              </h2>
              <p className="text-xs sm:text-sm text-neutral-500 mb-8 leading-relaxed">
                {language === 'ar'
                  ? 'كل جهاز يخضع لاختبار تقني شامل قبل عرضه في الكتالوج، ويُرفق تقرير هذا الفحص مع الجهاز عند المعاينة.'
                  : 'Every unit undergoes rigorous diagnostic benchmarking before catalog listing, with full report transparency provided upon preview.'}
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {warrantyData.inspectionChecklist.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-start gap-4 p-4 rounded-xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700/80"
                  >
                    <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                        {item.title[language] || item.title.ar}
                      </h3>
                      <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
                        {item.description[language] || item.description.ar}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Tab Content: 3. Policy & Coverage */}
        {currentTab === 'policy' && (
          <section aria-label="Warranty Policy" className="space-y-6">
            <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-6 sm:p-8">
              <h2 className="text-xl font-bold text-neutral-900 dark:text-neutral-100 mb-2">
                {language === 'ar' ? 'سياسة ونطاق الضمان' : 'Warranty Scope & Policy Terms'}
              </h2>
              <p className="text-xs sm:text-sm text-neutral-500 mb-8 leading-relaxed">
                {language === 'ar'
                  ? 'حقوقك واضحة ومحددة خطيًا: ماذا يشمل الضمان، وما هي الاستثناءات، وآلية المطالبة الرسمية.'
                  : 'Transparent rights documented in black and white: coverage details, exclusions, and claim workflows.'}
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Duration Note */}
                <div className="p-5 rounded-xl bg-purple-500/5 border border-purple-500/20 space-y-2">
                  <div className="flex items-center gap-2 font-bold text-purple-700 dark:text-purple-300 text-sm">
                    <ShieldCheck className="w-4 h-4" />
                    <span>{language === 'ar' ? 'مدة الضمان' : 'Warranty Duration'}</span>
                  </div>
                  <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
                    {warrantyData.policy.durationNote[language] || warrantyData.policy.durationNote.ar}
                  </p>
                </div>

                {/* Coverage */}
                <div className="p-5 rounded-xl bg-emerald-500/5 border border-emerald-500/20 space-y-2">
                  <div className="flex items-center gap-2 font-bold text-emerald-700 dark:text-emerald-400 text-sm">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{language === 'ar' ? 'ماذا يشمل الضمان' : 'What is Covered'}</span>
                  </div>
                  <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
                    {warrantyData.policy.coverage[language] || warrantyData.policy.coverage.ar}
                  </p>
                </div>

                {/* Exclusions */}
                <div className="p-5 rounded-xl bg-rose-500/5 border border-rose-500/20 space-y-2">
                  <div className="flex items-center gap-2 font-bold text-rose-700 dark:text-rose-400 text-sm">
                    <AlertCircle className="w-4 h-4" />
                    <span>{language === 'ar' ? 'ما لا يشمله الضمان' : 'Exclusions'}</span>
                  </div>
                  <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
                    {warrantyData.policy.exclusions[language] || warrantyData.policy.exclusions.ar}
                  </p>
                </div>

                {/* Replacement or Repair */}
                <div className="p-5 rounded-xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700/80 space-y-2">
                  <div className="flex items-center gap-2 font-bold text-neutral-800 dark:text-neutral-200 text-sm">
                    <FileText className="w-4 h-4" />
                    <span>{language === 'ar' ? 'الإصلاح أم الاستبدال' : 'Repair or Replacement'}</span>
                  </div>
                  <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
                    {warrantyData.policy.replacementOrRepair[language] || warrantyData.policy.replacementOrRepair.ar}
                  </p>
                </div>

                {/* Proof of Purchase */}
                <div className="p-5 rounded-xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700/80 space-y-2">
                  <div className="flex items-center gap-2 font-bold text-neutral-800 dark:text-neutral-200 text-sm">
                    <FileText className="w-4 h-4" />
                    <span>{language === 'ar' ? 'إثبات الشراء' : 'Proof of Purchase'}</span>
                  </div>
                  <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
                    {warrantyData.policy.proofOfPurchase[language] || warrantyData.policy.proofOfPurchase.ar}
                  </p>
                </div>

                {/* Claim Process */}
                <div className="p-5 rounded-xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700/80 space-y-2">
                  <div className="flex items-center gap-2 font-bold text-neutral-800 dark:text-neutral-200 text-sm">
                    <HelpCircle className="w-4 h-4" />
                    <span>{language === 'ar' ? 'خطوات المطالبة' : 'Claim Process'}</span>
                  </div>
                  <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
                    {warrantyData.policy.claimProcess[language] || warrantyData.policy.claimProcess.ar}
                  </p>
                </div>
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  );
};

export default WarrantyPage;
