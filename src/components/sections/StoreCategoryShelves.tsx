import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowUpLeft,
  ArrowUpRight,
  BriefcaseBusiness,
  Camera,
  ChevronDown,
  Cpu,
  Gamepad2,
  HardDrive,
  Headphones,
  Layers,
  Laptop,
  Monitor,
  Phone,
  Printer,
  ShieldCheck,
  Wifi,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import { useLanguage } from '@/i18n/LanguageContext';
import { useCatalog, useExchangeRate } from '@/data/CatalogContext';
import { shopApi, type CatalogItem, type SearchResult } from '@/data/commerce';
import { calculateYer, formatPriceYer } from '@/lib/currency';
import { conditionText } from '@/data/commerce';

type ShelfData = { items: CatalogItem[]; total: number; page: number; visibleCount: number };

const categoryOrder = [
  'laptops', 'displays', 'gaming', 'item-2zl02d', 'item-co4zkt', 'item-ara8k7',
  'audio', 'network', 'storage', 'office', 'power', 'security', 'telephones',
  'photography', 'software', 'item-f4mop2',
];

const categoryIcons: Record<string, LucideIcon> = {
  laptops: Laptop,
  displays: Monitor,
  gaming: Gamepad2,
  'item-2zl02d': Cpu,
  'item-co4zkt': Layers,
  'item-ara8k7': Printer,
  audio: Headphones,
  network: Wifi,
  storage: HardDrive,
  office: BriefcaseBusiness,
  power: Zap,
  security: ShieldCheck,
  telephones: Phone,
  photography: Camera,
  software: Layers,
  'item-f4mop2': Cpu,
};

function productImage(item: CatalogItem): string | undefined {
  const offer = item.offers.find((entry) => entry.available) ?? item.offers[0];
  return offer?.images?.[0] ?? item.product.images?.[0];
}

export default function StoreCategoryShelves() {
  const { language } = useLanguage();
  const { categories } = useCatalog();
  const rate = useExchangeRate();
  const ar = language === 'ar';
  const Arrow = ar ? ArrowUpLeft : ArrowUpRight;
  const [shelves, setShelves] = useState<Record<string, ShelfData>>({});
  const [loading, setLoading] = useState(true);
  const [openSubcategories, setOpenSubcategories] = useState<string | null>(null);
  const [selectedSubcategories, setSelectedSubcategories] = useState<Record<string, string>>({});
  const [loadingMore, setLoadingMore] = useState<Record<string, boolean>>({});

  const rootCategories = useMemo(() => {
    const roots = categories.filter((category) => !category.parentSlug);
    const bySlug = new Map(roots.map((category) => [category.slug, category]));
    const ordered = categoryOrder.flatMap((slug) => {
      const category = bySlug.get(slug);
      return category ? [category] : [];
    });
    const orderedSlugs = new Set(ordered.map((category) => category.slug));
    return [...ordered, ...roots.filter((category) => !orderedSlugs.has(category.slug))];
  }, [categories]);

  useEffect(() => {
    let active = true;
    setLoading(true);

    Promise.all(rootCategories.map(async (category) => {
      try {
        const query = new URLSearchParams({ category: category.slug, page: '1', sort: 'newest' });
        const result = await shopApi<SearchResult>(`/catalog?${query.toString()}`);
        return [category.slug, { items: result.items, total: result.total, page: 1, visibleCount: 8 }] as const;
      } catch {
        return [category.slug, { items: [], total: 0, page: 1, visibleCount: 0 }] as const;
      }
    })).then((results) => {
      if (active) setShelves(Object.fromEntries(results));
    }).finally(() => {
      if (active) setLoading(false);
    });

    return () => { active = false; };
  }, [rootCategories]);

  const visibleCategories = rootCategories.filter((category) => shelves[category.slug]?.items.length);
  const featuredCategories = visibleCategories.slice(0, 8);

  async function chooseSubcategory(parentSlug: string, subcategorySlug: string) {
    setSelectedSubcategories((current) => ({ ...current, [parentSlug]: subcategorySlug }));
    setOpenSubcategories(null);
    setShelves((current) => ({ ...current, [parentSlug]: { items: [], total: 0, page: 1, visibleCount: 0 } }));
    try {
      const query = new URLSearchParams({ category: subcategorySlug, page: '1', sort: 'newest' });
      const result = await shopApi<SearchResult>(`/catalog?${query.toString()}`);
      setShelves((current) => ({ ...current, [parentSlug]: { items: result.items, total: result.total, page: 1, visibleCount: 8 } }));
    } catch {
      setShelves((current) => ({ ...current, [parentSlug]: { items: [], total: 0, page: 1, visibleCount: 0 } }));
    }
  }

  async function loadMore(categorySlug: string) {
    const data = shelves[categorySlug];
    if (!data || data.visibleCount >= data.total || loadingMore[categorySlug]) return;
    if (data.visibleCount < data.items.length) {
      setShelves((current) => ({ ...current, [categorySlug]: { ...current[categorySlug], visibleCount: Math.min(current[categorySlug].visibleCount + 8, current[categorySlug].total) } }));
      return;
    }
    const requestedCategory = selectedSubcategories[categorySlug] ?? categorySlug;
    const nextPage = data.page + 1;
    setLoadingMore((current) => ({ ...current, [categorySlug]: true }));
    try {
      const query = new URLSearchParams({ category: requestedCategory, page: String(nextPage), sort: 'newest' });
      const result = await shopApi<SearchResult>(`/catalog?${query.toString()}`);
      setShelves((current) => ({
        ...current,
        [categorySlug]: {
          items: [...current[categorySlug].items, ...result.items.filter((item) => !current[categorySlug].items.some((existing) => existing.product.id === item.product.id))],
          total: result.total,
          page: nextPage,
          visibleCount: Math.min(current[categorySlug].visibleCount + 8, result.total),
        },
      }));
    } catch {
      // Keep the current products visible if a later page cannot be loaded.
    } finally {
      setLoadingMore((current) => ({ ...current, [categorySlug]: false }));
    }
  }

  return (
    <section id="categories" className="store-shelves section-space">
      <div className="page-shell">
        <div className="store-shelves-intro">
          <span className="eyebrow">{ar ? 'تسوّق بسهولة' : 'SHOP WITH EASE'}</span>
          <h2>{ar ? 'تصفح أقسام المتجر' : 'Explore store categories'}</h2>
          <p>{ar ? 'اختر القسم المناسب، واستكشف أحدث الأجهزة والملحقات المتوفرة.' : 'Choose a department and explore the latest available devices and accessories.'}</p>
        </div>

        {featuredCategories.length > 0 && (
          <nav className="store-category-feature-grid" aria-label={ar ? 'أقسام المتجر' : 'Store categories'}>
            {featuredCategories.map((category, index) => {
              const Icon = categoryIcons[category.slug] ?? Layers;
              const categoryItems = shelves[category.slug].items;
              const categoryImages = categoryItems.map(productImage).filter((src): src is string => Boolean(src));
              const image = category.slug === 'item-ara8k7' ? categoryImages[1] ?? categoryImages[0] : categoryImages[0];
              const title = category.title[language] || category.title.ar;
              return (
                <Link
                  to={`/${language}/shop/${category.slug}`}
                  key={category.slug}
                  className={`store-category-feature store-category-tone-${index % 4}`}
                >
                  <div className="store-category-feature-copy">
                    <span className="store-category-count">{shelves[category.slug].total.toLocaleString(language)} {ar ? 'منتج' : 'products'}</span>
                    <h3>{title}</h3>
                    <span className="store-category-feature-link">{ar ? 'تصفح القسم' : 'Shop category'} <Arrow size={15} /></span>
                  </div>
                  <div className="store-category-feature-image">
                    {image ? <img src={image} alt="" loading="lazy" /> : <Icon size={58} strokeWidth={1.2} aria-hidden="true" />}
                  </div>
                </Link>
              );
            })}
          </nav>
        )}

        {loading && (
          <div className="store-shelves-loading" role="status">
            <span>{ar ? 'جارٍ تحميل أقسام المنتجات…' : 'Loading product categories…'}</span>
          </div>
        )}

        {visibleCategories.map((category, categoryIndex) => {
          const data = shelves[category.slug];
          const selectedChild = categories.find((child) => child.slug === selectedSubcategories[category.slug]);
          const title = selectedChild?.title[language] || selectedChild?.title.ar || category.title[language] || category.title.ar;
          const Icon = categoryIcons[category.slug] ?? Layers;
          const shelfImages = data.items.map(productImage).filter((src): src is string => Boolean(src));
          const shelfImage = category.slug === 'item-ara8k7' ? shelfImages[1] ?? shelfImages[0] : shelfImages[0];

          return (
            <section className="store-category-shelf" key={category.slug} aria-labelledby={`shelf-${category.slug}`}>
              <header className="store-category-shelf-header">
                <Link to={`/${language}/shop/${category.slug}`} className={`store-category-feature store-category-tone-${categoryIndex % 4} store-shelf-category-card`}>
                  <div className="store-category-feature-copy">
                    <span className="store-shelf-kicker">{ar ? 'تسوق حسب الفئة' : 'SHOP BY CATEGORY'}</span>
                    <h3 id={`shelf-${category.slug}`}>{title}</h3>
                    <span className="store-category-count">{data.total.toLocaleString(language)} {ar ? 'منتج' : 'products'}</span>
                  </div>
                  <div className="store-category-feature-image">
                    {shelfImage ? <img src={shelfImage} alt="" loading="lazy" /> : <Icon size={45} strokeWidth={1.3} aria-hidden="true" />}
                  </div>
                </Link>
                <div className="store-shelf-actions">
                  {categories.some((child) => child.parentSlug === category.slug) && (
                    <div className="store-shelf-subcategory-menu">
                    <button
                      type="button"
                      className="store-shelf-view-all store-shelf-subcategory-trigger"
                      aria-expanded={openSubcategories === category.slug}
                      onClick={() => setOpenSubcategories((current) => current === category.slug ? null : category.slug)}
                    >
                      {ar ? 'الفئات الفرعية' : 'Subcategories'}
                      <ChevronDown size={15} />
                    </button>
                    {openSubcategories === category.slug && (
                      <div className="store-shelf-subcategory-popover">
                        {categories.filter((child) => child.parentSlug === category.slug).map((child) => (
                          <button key={child.slug} type="button" aria-pressed={selectedSubcategories[category.slug] === child.slug} onClick={() => chooseSubcategory(category.slug, child.slug)}>
                            {child.title[language] || child.title.ar}
                          </button>
                        ))}
                      </div>
                    )}
                    </div>
                  )}
                  <Link to={`/${language}/shop/${category.slug}`} className="store-shelf-view-all store-shelf-all-link">
                    {ar ? 'الكل' : 'All'} <Arrow size={14} />
                  </Link>
                </div>
              </header>

              <div className="store-product-grid">
                {data.items.slice(0, data.visibleCount).map((item) => {
                  const product = item.product;
                  const offer = item.offers.find((entry) => entry.available) ?? item.offers[0];
                  const image = productImage(item);
                  const titleText = product.title[language] || product.title.ar || product.model;
                  const condition = conditionText(offer?.condition, language);
                  const priceYer = formatPriceYer(calculateYer(offer?.priceUsd, rate, offer?.priceYer), language);
                  const wasPrice = offer?.originalPriceUsd && Number(offer.originalPriceUsd) > Number(offer.priceUsd ?? 0)
                    ? offer.originalPriceUsd
                    : null;
                  const href = `/${language}/shop/${product.category}/${product.slug}`;

                  return (
                    <article className="store-product-card" key={product.id}>
                      <Link to={href} className="store-product-image" aria-label={titleText}>
                        {image ? <img src={image} alt={titleText} loading="lazy" /> : <Icon size={48} strokeWidth={1.25} aria-hidden="true" />}
                        {condition && <span className="store-product-condition">{condition}</span>}
                        {offer?.discountPercent ? <span className="store-product-discount">-{offer.discountPercent}%</span> : null}
                      </Link>
                      <div className="store-product-details">
                        <span className="store-product-brand" dir="ltr">{product.brand}</span>
                        <h4><Link to={href}>{titleText}</Link></h4>
                        <div className="store-product-price">
                          <strong>{offer?.priceUsd ? `US $${offer.priceUsd}` : (ar ? 'اسأل عن السعر' : 'Ask for price')}</strong>
                          {wasPrice && <del>US ${wasPrice}</del>}
                          <span>{priceYer ?? ''}</span>
                        </div>
                      </div>
                    </article>
                  );
                })}
                {data.visibleCount < data.total && (
                  <button type="button" className="store-load-more-card" onClick={() => loadMore(category.slug)} disabled={loadingMore[category.slug]}>
                    <span>{loadingMore[category.slug] ? (ar ? 'جارٍ التحميل…' : 'Loading…') : (ar ? 'عرض المزيد' : 'Show more')}</span>
                    <Arrow size={19} />
                  </button>
                )}
              </div>
            </section>
          );
        })}

        {!loading && visibleCategories.length === 0 && (
          <div className="store-shelves-empty">
            <Layers size={25} aria-hidden="true" />
            <p>{ar ? 'لا توجد منتجات منشورة للعرض حالياً.' : 'There are no published products to display right now.'}</p>
            <Link to={`/${language}/shop`}>{ar ? 'تصفح المتجر' : 'Browse the store'} <Arrow size={15} /></Link>
          </div>
        )}
      </div>
    </section>
  );
}
