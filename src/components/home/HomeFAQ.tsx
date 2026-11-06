import { useCatalog } from '@/data/CatalogContext';
import MotionHeading from './MotionHeading';
import { referenceHome } from '@/data/reference-home';
import { useLanguage } from '@/i18n/LanguageContext';
import { HelpCircle, ChevronDown } from 'lucide-react';

export default function HomeFAQ() {
  const { faq: faqData } = useCatalog();
  const { language } = useLanguage();
  const ar = language === 'ar';
  const copy = referenceHome[language];
  const questions = faqData.slice(0, 6);

  return (
    <section id="faq" className="home-faq-section page-shell">
      <div className="section-head-wrap">
        <div>
          <div className="eyebrow-chip">
            <HelpCircle size={15} />
            <span>{ar ? 'إجابات مباشرة' : 'Frequently Asked Questions'}</span>
          </div>
          <MotionHeading lines={[copy.faqTitle]}/>
        </div>
        <p className="section-head-desc">
          {copy.faqDescription}
        </p>
      </div>

      <div className="faq-accordion-list">
        {questions.map((q) => (
          <details key={q.id} className="modern-faq-item">
            <summary className="faq-summary-btn">
              <span>{q.question[language]}</span>
              <ChevronDown className="faq-chevron" size={18} />
            </summary>
            <div className="faq-answer-content">
              <p>{q.answer[language]}</p>
            </div>
          </details>
        ))}
      </div>
    </section>
  );
}
