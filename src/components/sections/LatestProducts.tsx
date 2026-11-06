import { useCatalog } from '@/data/CatalogContext';
import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Sparkles } from 'lucide-react';
import { Product } from '@/data/types';
import { useLanguage } from '@/i18n/LanguageContext';
import ProductCard from '@/components/shop/ProductCard';

export const LatestProducts: React.FC = () => {
  const { products: productsData } = useCatalog();
  const { language, dir, t } = useLanguage();
  const allProducts = productsData as unknown as Product[];
  const latestProducts = allProducts.slice(0, 6);

  const Arrow = dir === 'rtl' ? ArrowLeft : ArrowRight;

  return (
    <section id="latest-products" className="py-20 bg-white dark:bg-neutral-900/40 border-y border-neutral-200 dark:border-neutral-800">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
          <div>
            <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400 mb-2">
              <Sparkles className="w-4 h-4" />
              <span>{language === 'ar' ? 'وصل حديثًا' : 'Latest Arrivals'}</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-neutral-900 dark:text-neutral-50 tracking-tight">
              {language === 'ar' ? 'أحدث الأجهزة والمحطات المفحوصة' : 'Recently Inspected Devices & Stations'}
            </h2>
            <p className="mt-1 text-xs sm:text-sm text-neutral-600 dark:text-neutral-400">
              {language === 'ar'
                ? 'بطاقات بيانات كاملة، مواصفات مدققة، وتقارير فحص جاهزة قبل الشراء'
                : 'Verified data cards, detailed hardware specs, and transparent inspection reports'}
            </p>
          </div>

          <Link
            to={`/${language}/shop`}
            className="inline-flex items-center gap-2 text-xs sm:text-sm font-bold text-purple-600 hover:text-purple-700 dark:text-purple-400 dark:hover:text-purple-300 transition-colors"
          >
            <span>{language === 'ar' ? 'تصفح كل أجهزة المتجر' : 'Explore Full Catalog'}</span>
            <Arrow className="w-4 h-4" />
          </Link>
        </div>

        {/* Products Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {latestProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </div>
    </section>
  );
};

export default LatestProducts;
