import { useState, useEffect, useRef, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Layers,
  Laptop,
  Monitor,
  Briefcase,
  Headphones,
  Gamepad2,
  Wifi,
  HardDrive,
  Zap,
  ShieldCheck,
  Phone,
  Cpu,
  Printer,
  Sparkles,
  MemoryStick,
  Camera,
  ChevronLeft,
  ChevronRight,
  ArrowUpLeft,
  ArrowUpRight,
  type LucideIcon,
} from 'lucide-react';
import { useLanguage } from '@/i18n/LanguageContext';
import { useCatalog, useExchangeRate } from '@/data/CatalogContext';
import { shopApi, type SearchResult } from '@/data/commerce';
import { calculateYer, formatPriceYer } from '@/lib/currency';
import type { Product } from '@/data/types';
import { referenceHome } from '@/data/reference-home';

interface CategoryPillDef {
  slug: string;
  label: { ar: string; en: string };
  icon: LucideIcon;
}

interface DisplayProduct {
  id: string;
  slug: string;
  category: string;
  title: string;
  priceUsd: string | number | null;
  originalPriceUsd?: string | number | null;
  condition: string;
  images: string[];
}

// Exactly matching the categories & rows from user reference image (Image 2)
const ROW_1_CATEGORIES: CategoryPillDef[] = [
  { slug: 'all', label: { ar: 'الكل', en: 'All' }, icon: Layers },
  { slug: 'laptops', label: { ar: 'لابتوبات', en: 'Laptops' }, icon: Laptop },
  { slug: 'displays', label: { ar: 'شاشات', en: 'Displays' }, icon: Monitor },
  { slug: 'office', label: { ar: 'مستلزمات مكتبية', en: 'Office' }, icon: Briefcase },
  { slug: 'audio', label: { ar: 'صوتيات', en: 'Audio' }, icon: Headphones },
  { slug: 'gaming', label: { ar: 'ألعاب', en: 'Gaming' }, icon: Gamepad2 },
  { slug: 'network', label: { ar: 'شبكات', en: 'Networking' }, icon: Wifi },
  { slug: 'storage', label: { ar: 'تخزين', en: 'Storage' }, icon: HardDrive },
  { slug: 'power', label: { ar: 'طاقة', en: 'Power' }, icon: Zap },
  { slug: 'security', label: { ar: 'أمن وأقفال ذكية', en: 'Security' }, icon: ShieldCheck },
  { slug: 'software', label: { ar: 'برامج وتراخيص', en: 'Software' }, icon: Layers },
];

const ROW_2_CATEGORIES: CategoryPillDef[] = [
  { slug: 'telephones', label: { ar: 'هواتف ثابتة ولاسلكية', en: 'Telephones' }, icon: Phone },
  { slug: 'item-2zl02d', label: { ar: 'اجهزة مكتبية', en: 'Desktops' }, icon: Cpu },
  { slug: 'item-ara8k7', label: { ar: 'طابعات', en: 'Printers' }, icon: Printer },
  { slug: 'item-co4zkt', label: { ar: 'اكسسوارات', en: 'Accessories' }, icon: Sparkles },
  { slug: 'item-f4mop2', label: { ar: 'رامات', en: 'RAM' }, icon: MemoryStick },
  { slug: 'photography', label: { ar: 'تصوير وكاميرات', en: 'Cameras' }, icon: Camera },
];

export default function Categories() {
  const { language, dir } = useLanguage();
  const ar = language === 'ar';
  const exchangeRate = useExchangeRate();
  const { products: productsData, categories: managedCategories } = useCatalog();

  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [apiItems, setApiItems] = useState<SearchResult['items']>([]);
  const [loading, setLoading] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);

  const carouselRef = useRef<HTMLDivElement>(null);
  const Arrow = ar ? ArrowUpLeft : ArrowUpRight;

  // Resolve category subtree mapping for local fallback
  const categorySubtree = useMemo(() => {
    const map: Record<string, Set<string>> = {};
    const allPills = [...ROW_1_CATEGORIES, ...ROW_2_CATEGORIES];

    allPills.forEach((p) => {
      const set = new Set<string>([p.slug]);
      if (p.slug === 'storage') set.add('hard-drives');
      if (p.slug === 'laptops') {
        set.add('ram-laptop');
        set.add('computers-tower');
        set.add('computers-all-in-one');
      }

      let changed = true;
      while (changed) {
        changed = false;
        for (const cat of managedCategories) {
          if (cat.parentSlug && set.has(cat.parentSlug) && !set.has(cat.slug)) {
            set.add(cat.slug);
            changed = true;
          }
        }
      }
      map[p.slug] = set;
    });

    return map;
  }, [managedCategories]);

  // Fetch from /api/shop/catalog
  useEffect(() => {
    let active = true;
    const fetchCatalog = async () => {
      setLoading(true);
      try {
        const query = new URLSearchParams({ limit: '20' });
        if (selectedCategory !== 'all') {
          query.set('category', selectedCategory);
        }
        const data = await shopApi<SearchResult>(`/catalog?${query.toString()}`);
        if (active) {
          if (data && data.items && data.items.length > 0) {
            setApiItems(data.items);
          } else {
            setApiItems([]);
          }
        }
      } catch {
        if (active) {
          setApiItems([]);
        }
      } finally {
        if (active) {
          setLoading(false);
          if (carouselRef.current) {
            carouselRef.current.scrollTo({ left: 0, behavior: 'smooth' });
          }
        }
      }
    };

    void fetchCatalog();
    return () => {
      active = false;
    };
  }, [selectedCategory]);

  // Clean unified display products list
  const displayProducts: DisplayProduct[] = useMemo(() => {
    if (apiItems.length > 0) {
      return apiItems.map((item) => {
        const prod = item.product;
        const primaryOffer = item.offers?.find((o) => o.available) || item.offers?.[0];
        return {
          id: prod.id,
          slug: prod.slug,
          category: prod.category,
          title: prod.title?.[language] || prod.title?.ar || prod.model,
          priceUsd: primaryOffer?.priceUsd ?? null,
          originalPriceUsd: primaryOffer?.originalPriceUsd ?? null,
          condition: primaryOffer?.condition || 'new',
          images: prod.images || [],
        };
      });
    }

    // Fallback to local productsData
    const targetSet = selectedCategory === 'all' ? null : categorySubtree[selectedCategory];
    const filtered = targetSet
      ? (productsData as Product[]).filter((p) => targetSet.has(p.category) || p.category === selectedCategory)
      : (productsData as Product[]);

    return filtered.slice(0, 16).map((p) => ({
      id: p.id,
      slug: p.slug,
      category: p.category,
      title: p.title?.[language] || p.title?.ar || p.model,
      priceUsd: p.price.usd,
      originalPriceUsd: (typeof p.specs?.originalPriceUsd === 'number' || typeof p.specs?.originalPriceUsd === 'string') ? p.specs.originalPriceUsd : null,
      condition: p.condition || 'new',
      images: p.images || [],
    }));
  }, [apiItems, selectedCategory, categorySubtree, productsData, language]);

  // Horizontal carousel scroll handler
  const handleScroll = () => {
    if (!carouselRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = carouselRef.current;
    const maxScroll = scrollWidth - clientWidth;
    if (maxScroll <= 0) {
      setScrollProgress(0);
      return;
    }
    const current = Math.abs(scrollLeft);
    const pct = Math.min(100, Math.max(0, (current / maxScroll) * 100));
    setScrollProgress(pct);
  };

  const scrollCarousel = (direction: 'prev' | 'next') => {
    if (!carouselRef.current) return;
    const container = carouselRef.current;
    const scrollStep = container.clientWidth * 0.7;
    const isRtl = dir === 'rtl';

    if (isRtl) {
      const delta = direction === 'next' ? -scrollStep : scrollStep;
      container.scrollBy({ left: delta, behavior: 'smooth' });
    } else {
      const delta = direction === 'next' ? scrollStep : -scrollStep;
      container.scrollBy({ left: delta, behavior: 'smooth' });
    }
  };

  // Helper condition label
  const getConditionLabel = (cond: string | undefined) => {
    switch (cond) {
      case 'new':
        return ar ? 'جديد' : 'New';
      case 'like_new':
        return ar ? 'شبه جديد' : 'Like New';
      case 'open_box':
        return ar ? 'مفتوح الكرتون' : 'Open Box';
      case 'refurbished':
        return ar ? 'مجدّد' : 'Refurbished';
      case 'used':
        return ar ? 'مستعمل' : 'Used';
      default:
        return ar ? 'جديد' : 'New';
    }
  };

  return (
    <section id="categories" className="categories-section section-space">
      <div className="page-shell">
        {/* Section Heading with "See all" like user reference Image 1 */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
          <div>
            <div className="eyebrow flex items-center gap-2 mb-2">
              <span>{ar ? 'كتالوج المتجر' : 'STORE CATALOG'}</span>
            </div>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white tracking-tight">
              {referenceHome[language].categoriesTitle}
            </h2>
          </div>

          <Link
            to={`/${language}/shop${selectedCategory !== 'all' ? `/${selectedCategory}` : ''}`}
            className="inline-flex items-center gap-1.5 text-sm sm:text-base font-semibold text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 underline underline-offset-4 transition-colors"
          >
            <span>{ar ? 'عرض الكل' : 'See all'}</span>
            <Arrow size={16} />
          </Link>
        </div>

        {/* Category Pills Navigation (matching user reference Image 2) */}
        <div className="category-pills-container" role="tablist" aria-label={ar ? 'فئات المنتجات' : 'Product Categories'}>
          {/* Row 1 */}
          <div className="category-pills-row">
            {ROW_1_CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              const isSelected = selectedCategory === cat.slug;
              return (
                <button
                  key={cat.slug}
                  type="button"
                  role="tab"
                  aria-selected={isSelected}
                  onClick={() => setSelectedCategory(cat.slug)}
                  className={`category-nav-pill ${isSelected ? 'is-active' : ''}`}
                >
                  <Icon size={16} />
                  <span>{cat.label[language]}</span>
                </button>
              );
            })}
          </div>

          {/* Row 2 */}
          <div className="category-pills-row">
            {ROW_2_CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              const isSelected = selectedCategory === cat.slug;
              return (
                <button
                  key={cat.slug}
                  type="button"
                  role="tab"
                  aria-selected={isSelected}
                  onClick={() => setSelectedCategory(cat.slug)}
                  className={`category-nav-pill ${isSelected ? 'is-active' : ''}`}
                >
                  <Icon size={16} />
                  <span>{cat.label[language]}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Product Cards Carousel Strip (matching user reference Image 1) */}
        <div className="carousel-track-wrapper mt-3">
          {/* Left Arrow Button */}
          <button
            type="button"
            onClick={() => scrollCarousel('prev')}
            className="carousel-arrow-btn prev"
            aria-label={ar ? 'السابق' : 'Previous'}
          >
            {ar ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
          </button>

          {/* Right Arrow Button */}
          <button
            type="button"
            onClick={() => scrollCarousel('next')}
            className="carousel-arrow-btn next"
            aria-label={ar ? 'التالي' : 'Next'}
          >
            {ar ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
          </button>

          {/* Horizontal Scroll Track */}
          <div
            ref={carouselRef}
            onScroll={handleScroll}
            className="carousel-track"
          >
            {displayProducts.length === 0 && !loading && (
              <div className="w-full py-12 text-center text-gray-500 dark:text-gray-400">
                <p>{ar ? 'لا توجد منتجات متوفرة حالياً في هذا القسم.' : 'No items currently available in this section.'}</p>
                <Link
                  to={`/${language}/shop`}
                  className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-purple-600 dark:text-purple-400 hover:underline"
                >
                  <span>{ar ? 'تصفح كل أجهزة المتجر' : 'Browse All Hardware'}</span>
                  <Arrow size={14} />
                </Link>
              </div>
            )}

            {displayProducts.map((prod, index) => {
              const priceUsd = prod.priceUsd;
              const conditionLabel = getConditionLabel(prod.condition);
              const originalPriceUsd = prod.originalPriceUsd;
              const title = prod.title;

              const yerPrice = calculateYer(priceUsd, exchangeRate);
              const yerFormatted = formatPriceYer(yerPrice, language);

              const secondaryPrice = originalPriceUsd && String(originalPriceUsd) !== String(priceUsd)
                ? `US $${originalPriceUsd} ${ar ? 'سابقاً' : 'Was'}`
                : yerFormatted;

              const imageUrl = (prod.images && prod.images.length > 0)
                ? prod.images[0]
                : '/images/home-reference/laptop-design.webp';

              const productHref = `/${language}/shop/${prod.category}/${prod.slug}`;

              return (
                <div key={prod.id || index} className="carousel-card-item">
                  <article className="bg-white dark:bg-[#161022] border border-gray-100 dark:border-white/10 rounded-2xl p-3.5 shadow-xs hover:shadow-lg hover:border-purple-300 dark:hover:border-purple-500/40 transition-all duration-300 flex flex-col justify-between h-[390px] group">
                    <div>
                      {/* Product Image Area */}
                      <Link
                        to={productHref}
                        className="block relative aspect-square w-full bg-gray-50/80 dark:bg-white/[0.02] rounded-xl p-3 overflow-hidden mb-3 border border-gray-100/60 dark:border-white/5"
                      >
                        <img
                          src={imageUrl}
                          alt={title}
                          width={260}
                          height={260}
                          loading="lazy"
                          className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-500"
                        />
                        {conditionLabel && (
                          <span className="absolute top-2.5 inset-inline-start-2.5 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-white/95 dark:bg-black/80 text-purple-700 dark:text-purple-300 border border-purple-500/15 shadow-xs">
                            {conditionLabel}
                          </span>
                        )}
                      </Link>

                      {/* Title */}
                      <h3 className="text-[13px] sm:text-[13.5px] font-semibold text-gray-900 dark:text-gray-100 line-clamp-2 leading-snug h-9">
                        <Link to={productHref} className="hover:text-purple-600 dark:hover:text-purple-400 transition-colors">
                          {title}
                        </Link>
                      </h3>

                    </div>

                    {/* Pricing Block (matching user reference Image 1) */}
                    <div className="pt-2 border-t border-gray-100 dark:border-white/5 mt-auto">
                      <div className="flex flex-col gap-0.5">
                        <div className="flex items-baseline gap-1.5 flex-wrap">
                          <span className="text-base font-bold text-gray-950 dark:text-white">
                            {priceUsd != null ? `US $${priceUsd}` : (ar ? 'اسأل عن السعر' : 'Inquire for price')}
                          </span>
                          {priceUsd != null && (
                            <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                              {conditionLabel}
                            </span>
                          )}
                        </div>

                        {secondaryPrice && (
                          <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                            {secondaryPrice}
                          </span>
                        )}
                      </div>
                    </div>
                  </article>
                </div>
              );
            })}
          </div>
        </div>

        {/* Carousel Bottom Progress Scrollbar (matching user reference Image 1) */}
        <div className="carousel-indicator-bar" aria-hidden="true">
          <div
            className="carousel-indicator-thumb"
            style={{
              [ar ? 'right' : 'left']: `${Math.min(60, scrollProgress * 0.6)}%`,
            }}
          />
        </div>
      </div>
    </section>
  );
}
