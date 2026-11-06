import { useCatalog } from '@/data/CatalogContext';
import { useLanguage } from '@/i18n/LanguageContext';
import { Award } from 'lucide-react';

export default function BrandEcosystem() {
  const { brands: brands } = useCatalog();
  const { language } = useLanguage();
  const ar = language === 'ar';

  return (
    <section id="brands" className="brand-ecosystem-section page-shell">
      <div className="brand-ecosystem-header">
        <div className="eyebrow-chip">
          <Award size={15} />
          <span>{ar ? 'العلامات المعتمدة' : 'Verified Hardware Brands'}</span>
        </div>
        <h2>{ar ? 'أفضل عتاد من كبرى الشركات العالمية' : 'Premium Hardware from Global Leaders'}</h2>
        <p>
          {ar
            ? 'ننتقي أفضل سلاسل الأعمال الاحترافية (ThinkPad, EliteBook, Latitude, UltraSharp) المشهود لها بقوة التحمل والاستقرار.'
            : 'We specialize in enterprise lines (ThinkPad, EliteBook, Latitude, UltraSharp) renowned for endurance and stability.'}
        </p>
      </div>

      <div className="brand-grid-cards">
        {brands.map((b) => (
          <div key={b.id} className="brand-item-card">
            <span className="brand-name">{b.name}</span>
          </div>
        ))}
      </div>

      <p className="brand-disclaimer">
        {ar
          ? 'العلامات والأسماء التجارية المذكورة هي ملك لأصحابها، وتوريدنا يرتكز على الأجهزة المفحوصة والمختبرة مع الضمان المحلي.'
          : 'All brand trademarks belong to their respective owners. Hardware is supplied with local testing and written store warranty.'}
      </p>
    </section>
  );
}
