import { useCatalog } from '@/data/CatalogContext';
import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  HelpCircle,
  Search,
  ChevronDown,
  ChevronRight,
  Shield,
  Cpu,
  Layers,
  MessageCircle,
} from 'lucide-react';
import { useLanguage } from '@/i18n/LanguageContext';

export const FAQPage: React.FC = () => {
  const { faq: faqData } = useCatalog();
  const { language, dir, t } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [openItems, setOpenItems] = useState<Record<string, boolean>>({
    'faq-1': true,
    'faq-2': true,
  });

  const categories = [
    { id: 'all', label: language === 'ar' ? 'الكل' : 'All' },
    { id: 'condition', label: language === 'ar' ? 'الحالة والفحص' : 'Condition & Inspection' },
    { id: 'warranty', label: language === 'ar' ? 'الضمان والسياسة' : 'Warranty' },
    { id: 'hardware', label: language === 'ar' ? 'المواصفات والترقية' : 'Hardware Specs' },
    { id: 'pricing', label: language === 'ar' ? 'الأسعار والعملة' : 'Pricing' },
    { id: 'services', label: language === 'ar' ? 'التوصيل والخدمات' : 'Services' },
  ];

  const filteredFaqs = useMemo(() => {
    return faqData.filter((item) => {
      // Category filter
      if (selectedCategory !== 'all' && item.category !== selectedCategory) {
        return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const qText = (item.question[language] || item.question.ar).toLowerCase();
        const aText = (item.answer[language] || item.answer.ar).toLowerCase();
        return qText.includes(query) || aText.includes(query);
      }

      return true;
    });
  }, [searchQuery, selectedCategory, language]);

  const toggleItem = (id: string) => {
    setOpenItems((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  // Build JSON-LD FAQPage Schema
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqData.map((item) => ({
      '@type': 'Question',
      name: item.question[language] || item.question.ar,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer[language] || item.answer.ar,
      },
    })),
  };

  return (
    <div className="min-h-screen pt-28 pb-24 bg-neutral-50 dark:bg-neutral-950">
      {/* Schema.org FAQPage JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-4xl">
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
            {language === 'ar' ? 'الأسئلة الشائعة' : 'FAQ'}
          </span>
        </nav>

        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 text-purple-700 dark:text-purple-300 text-xs font-bold uppercase tracking-wider mb-3">
            <HelpCircle className="w-4 h-4" />
            <span>{language === 'ar' ? 'إجابات مباشرة وشفافة' : 'Clear & Transparent Answers'}</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-neutral-900 dark:text-neutral-50 tracking-tight mb-3">
            {language === 'ar' ? 'الأسئلة الشائعة' : 'Frequently Asked Questions'}
          </h1>
          <p className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
            {language === 'ar'
              ? 'إجابات موثقة عن درجات الحالة، الفحص قبل التسليم، الضمان، ترقية المواصفات، وآلية الطلب في صنعاء.'
              : 'Documented answers regarding condition grading, inspection protocols, warranty policies, and hardware in Sana\'a.'}
          </p>
        </div>

        {/* Search & Category Filter */}
        <div className="space-y-4 mb-8">
          <div className="relative">
            <Search className={`absolute top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 ${dir === 'rtl' ? 'right-4' : 'left-4'}`} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={
                language === 'ar'
                  ? 'ابحث في الأسئلة (مثال: الضمان، الرام، فحص، صنعاء)...'
                  : 'Search questions (e.g. warranty, RAM, inspection, Sana\'a)...'
              }
              className={`w-full py-3.5 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-sm text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all ${
                dir === 'rtl' ? 'pr-11 pl-4' : 'pl-11 pr-4'
              }`}
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
            {categories.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setSelectedCategory(c.id)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all border ${
                  selectedCategory === c.id
                    ? 'bg-purple-600 text-white border-purple-600 shadow-sm'
                    : 'bg-white dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300 border-neutral-200 dark:border-neutral-800 hover:border-neutral-300'
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>

        {/* FAQ Accordion List */}
        <div className="space-y-3.5">
          {filteredFaqs.length === 0 ? (
            <div className="text-center py-12 px-4 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800">
              <Layers className="w-10 h-10 text-neutral-300 mx-auto mb-2" />
              <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">
                {language === 'ar' ? 'لم يتم العثور على نتائج مطابقة' : 'No matching questions found'}
              </p>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('all');
                }}
                className="mt-3 text-xs text-purple-600 font-semibold hover:underline"
              >
                {language === 'ar' ? 'عرض جميع الأسئلة' : 'Show all questions'}
              </button>
            </div>
          ) : (
            filteredFaqs.map((faq) => {
              const isOpen = Boolean(openItems[faq.id]);
              return (
                <div
                  key={faq.id}
                  className="rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 overflow-hidden transition-all"
                >
                  <button
                    type="button"
                    onClick={() => toggleItem(faq.id)}
                    aria-expanded={isOpen}
                    className="w-full p-5 text-start flex items-center justify-between gap-4 font-bold text-sm sm:text-base text-neutral-900 dark:text-neutral-100 hover:text-purple-600 dark:hover:text-purple-400 transition-colors"
                  >
                    <span>{faq.question[language] || faq.question.ar}</span>
                    <ChevronDown
                      className={`w-4 h-4 shrink-0 text-neutral-400 transition-transform duration-200 ${
                        isOpen ? 'rotate-180 text-purple-600' : ''
                      }`}
                    />
                  </button>

                  {isOpen && (
                    <div className="px-5 pb-5 pt-1 text-xs sm:text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed border-t border-neutral-100 dark:border-neutral-800/80">
                      {faq.answer[language] || faq.answer.ar}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default FAQPage;
