import React from 'react';
import { AlertCircle } from 'lucide-react';
import { useLanguage } from '@/i18n/LanguageContext';

interface DemoBannerProps {
  compact?: boolean;
  className?: string;
}

export const DemoBanner: React.FC<DemoBannerProps> = ({ compact = false, className = '' }) => {
  const { language } = useLanguage();

  if (compact) {
    return (
      <div
        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30 ${className}`}
        role="status"
        title={
          language === 'ar'
            ? 'بيانات تجريبية — السعر والضمان غير محددين'
            : 'Demo data — Price and warranty undetermined'
        }
      >
        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
        <span>{language === 'ar' ? 'بيانات تجريبية' : 'Demo Data'}</span>
      </div>
    );
  }

  return (
    <aside
      aria-label={language === 'ar' ? 'تنبيه بيانات تجريبية' : 'Demo data alert'}
      className={`flex items-start gap-3 p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-300 ${className}`}
    >
      <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
      <div className="text-xs sm:text-sm leading-relaxed">
        <strong className="font-semibold block mb-0.5">
          {language === 'ar' ? 'تنبيه: محتوى وبيانات تجريبية' : 'Notice: Demonstration Catalog Data'}
        </strong>
        <span>
          {language === 'ar'
            ? 'هذا المنتج معروض بمواصفات حقيقية لأغراض فحص التصميم والهيكل، لكنه لا يحمل سعرًا أو مدة ضمان رسمية حتى اعتمادها من إدارة المتجر.'
            : 'This product showcases verified technical specifications for structural testing, but carries no official price or warranty until validated by store management.'}
        </span>
      </div>
    </aside>
  );
};

export default DemoBanner;
