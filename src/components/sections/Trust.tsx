import { Layers, ArrowUpLeft, ArrowUpRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useCatalog } from '@/data/CatalogContext';
import { useLanguage } from '@/i18n/LanguageContext';

export default function Trust() {
  const { categories } = useCatalog();
  const { language } = useLanguage();
  const ar = language === 'ar';
  const Arrow = ar ? ArrowUpLeft : ArrowUpRight;
  const roots = categories.filter((category) => !category.parentSlug);

  return (
    <section id="trust" className="store-category-directory section-space">
      <div className="page-shell">
        <header className="store-directory-heading">
          <div>
            <span className="eyebrow">{ar ? 'دليل المتجر' : 'STORE DIRECTORY'}</span>
            <h2>{ar ? 'الأقسام والفئات الفرعية' : 'Categories and subcategories'}</h2>
            <p>{ar ? 'اختر قسماً رئيسياً، ثم انتقل مباشرة إلى الفئة التي تبحث عنها.' : 'Choose a main department, then open the category you need.'}</p>
          </div>
          <Link to={`/${language}/shop`} className="store-directory-all">{ar ? 'كل المنتجات' : 'All products'} <Arrow size={15} /></Link>
        </header>

        <div className="store-directory-grid">
          {roots.map((root) => {
            const children = categories.filter((category) => category.parentSlug === root.slug);
            const title = root.title[language] || root.title.ar;
            return (
              <section className="store-directory-card" key={root.slug}>
                <Link to={`/${language}/shop/${root.slug}`} className="store-directory-parent">
                  <span className="store-directory-icon"><Layers size={17} /></span>
                  <span>{title}</span>
                  <Arrow size={15} />
                </Link>
                {children.length > 0 ? (
                  <ul>
                    {children.map((child) => (
                      <li key={child.slug}>
                        <Link to={`/${language}/shop/${child.slug}`}>
                          <span>{child.title[language] || child.title.ar}</span>
                          <Arrow size={13} />
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <Link className="store-directory-empty-child" to={`/${language}/shop/${root.slug}`}>
                    {ar ? 'تصفح منتجات القسم' : 'Browse this category'} <Arrow size={13} />
                  </Link>
                )}
              </section>
            );
          })}
        </div>
      </div>
    </section>
  );
}
