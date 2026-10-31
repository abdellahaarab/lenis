import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpLeft, ArrowUpRight, MapPin, Search, ShoppingBag } from 'lucide-react';
import { useCatalog, useExchangeRate } from '@/data/CatalogContext';
import { useLanguage } from '@/i18n/LanguageContext';
import { referenceHome } from '@/data/reference-home';
import type { Product } from '@/data/types';
import ProductImage from '@/components/shop/ProductImage';
import { calculateYer, formatPriceYer } from '@/lib/currency';

export default function HeroShowcase() {
  const { products: productsData, site, categories: storeCategories } = useCatalog();
  const { language } = useLanguage();
  const exchangeRate = useExchangeRate();
  const ar = language === 'ar';
  const text = referenceHome[language];
  const Arrow = ar ? ArrowUpLeft : ArrowUpRight;
  const products = productsData as Product[];

  const spotlightProducts = useMemo(() => {
    const withImages = products.filter((product) => product.images?.length);
    const preferredCategories = ['laptops', 'displays', 'network'];
    const selected = preferredCategories
      .map((category) => withImages.find((product) => product.category === category))
      .filter((product): product is Product => Boolean(product));

    for (const product of withImages) {
      if (selected.length >= 3) break;
      if (!selected.some((item) => item.id === product.id)) selected.push(product);
    }
    return selected;
  }, [products]);

  const featuredProduct = spotlightProducts[0];
  const categories = storeCategories.filter((category) => !category.parentSlug).slice(0, 8);

  return (
    <section id="hero" className="storefront-hero page-shell">
      <div className="storefront-hero-copy">
        <div className="storefront-eyebrow"><MapPin size={16} /><span>{text.storefrontEyebrow} · {site.city[language]}</span></div>
        <h1>{text.storefrontTitle.map((line, index) => <span key={line}>{index > 0 && <br />}<em>{line}</em></span>)}</h1>
        <p>{text.storefrontDescription}</p>
        <div className="storefront-hero-actions">
          <Link to={`/${language}/shop`} className="action-primary"><ShoppingBag size={18} />{text.storefrontShop}</Link>
          <a href="#categories" className="action-text"><Search size={17} />{text.storefrontCategories}</a>
        </div>
      </div>

      {featuredProduct ? (
        <article className="storefront-spotlight">
          <div className="storefront-spotlight-label">{text.storefrontSpotlight}</div>
          <Link
            to={`/${language}/shop/${featuredProduct.category}/${featuredProduct.slug}`}
            className="storefront-spotlight-image"
            aria-label={featuredProduct.title[language]}
          >
            <ProductImage
              src={featuredProduct.images[0]}
              id={featuredProduct.id}
              alt={featuredProduct.title[language]}
              eager
            />
          </Link>
          <div className="storefront-spotlight-details">
            <span className="storefront-spotlight-brand" dir="ltr">{featuredProduct.brand}</span>
            <h2>{featuredProduct.title[language]}</h2>
            <div className="storefront-spotlight-price">
              <strong>{featuredProduct.price.usd == null ? text.storefrontAskPrice : `US $${featuredProduct.price.usd}`}</strong>
              {featuredProduct.price.usd != null && (
                <span>{formatPriceYer(calculateYer(featuredProduct.price.usd, exchangeRate, featuredProduct.price.yer), language)}</span>
              )}
            </div>
            <Link to={`/${language}/shop/${featuredProduct.category}/${featuredProduct.slug}`} className="storefront-spotlight-link">
              {text.storefrontViewProduct}<Arrow size={17} />
            </Link>
          </div>
        </article>
      ) : (
        <article className="storefront-spotlight storefront-spotlight-empty">
          <ShoppingBag size={32} aria-hidden="true" />
          <p>{text.storefrontEmpty}</p>
          <Link to={`/${language}/shop`} className="storefront-spotlight-link">{text.storefrontShop}<Arrow size={17} /></Link>
        </article>
      )}

      {categories.length > 0 && (
        <nav className="storefront-category-links" aria-label={text.storefrontCategories}>
          {categories.map((category) => (
            <Link key={category.slug} to={`/${language}/shop/${category.slug}`}>
              {category.title[language] || category.title.ar}<Arrow size={15} />
            </Link>
          ))}
        </nav>
      )}
      <span className="sr-only">{site.storeName[language]}</span>
    </section>
  );
}
