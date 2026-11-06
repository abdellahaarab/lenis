import { useCatalog } from '@/data/CatalogContext';
import MotionHeading from './MotionHeading';
import { referenceHome } from '@/data/reference-home';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '@/i18n/LanguageContext';
import type { Product } from '@/data/types';
import ProductCard from '@/components/shop/ProductCard';
import {
  ArrowUpLeft,
  ArrowUpRight,
  PackageCheck
} from 'lucide-react';

export default function FeaturedCatalog() {
  const { products: productsData } = useCatalog();
  const { language } = useLanguage();
  const ar = language === 'ar';
  const copy = referenceHome[language];
  const Arrow = ar ? ArrowUpLeft : ArrowUpRight;
  const products = productsData as Product[];

  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const categories = [
    { id: 'all', label: ar ? 'جميع الأجهزة' : 'All Hardware' },
    { id: 'laptops', label: ar ? 'لابتوبات أعمال' : 'Business Laptops' },
    { id: 'displays', label: ar ? 'شاشات عرض' : 'Displays' },
    { id: 'power', label: ar ? 'طاقة و UPS' : 'Power & UPS' },
    { id: 'network', label: ar ? 'شبكات Wi-Fi' : 'Networking' },
    { id: 'storage', label: ar ? 'تخزين وسائط' : 'Storage' }
  ];

  const filteredProducts = selectedCategory === 'all'
    ? products.slice(0, 8)
    : products.filter(p => p.category === selectedCategory).slice(0, 8);

  return (
    <section id="latest-products" className="featured-catalog-section page-shell">
      <div className="catalog-section-head">
        <div>
          <div className="eyebrow-chip">
            <PackageCheck size={15} />
            <span>{copy.catalogLabel}</span>
          </div>
          <MotionHeading lines={[copy.catalogTitle]}/>
          <p className="catalog-head-sub">
            {copy.catalogDescription}
          </p>
        </div>

        <Link to={`/${language}/shop`} className="desk-text-link">
          <span>{ar ? 'تصفح الكتالوج بالكامل' : 'Explore Complete Catalog'}</span>
          <Arrow size={18} />
        </Link>
      </div>

      {/* Category Filter Pills */}
      <div className="catalog-filter-bar">
        <div className="filter-pill-list" role="tablist">
          {categories.map(cat => (
            <button
              key={cat.id}
              role="tab"
              aria-selected={selectedCategory === cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`filter-pill-btn ${selectedCategory === cat.id ? 'is-active' : ''}`}
            >
              <span>{cat.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Product Grid */}
      {!filteredProducts.length&&<div className="catalog-empty-state"><PackageCheck size={26} aria-hidden="true"/><p role="status">{copy.catalogEmpty}</p><a href="#contact" className="action-text">{copy.catalogEmptyCta}<Arrow size={18}/></a></div>}
      <div className="home-product-grid">
        {filteredProducts.map(product => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>

      {/* View All Button */}
      <div className="catalog-bottom-cta">
        <Link to={`/${language}/shop`} className="desk-action desk-action-secondary">
          <span>{ar ? 'عرض جميع المنتجات والفئات' : 'View All Products & Categories'}</span>
          <Arrow size={18} />
        </Link>
      </div>
    </section>
  );
}
