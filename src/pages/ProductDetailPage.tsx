import { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { Link, useParams, Navigate } from 'react-router-dom';
import {
  ShieldCheck,
  Cpu,
  Battery,
  ShoppingBag,
  MessageCircle,
  ArrowRight,
  ArrowLeft,
  Check,
  Share2,
  Sparkles,
  ChevronRight,
  ChevronLeft,
  Maximize2,
  X,
  Truck,
  Globe,
  Zap,
  AlertCircle,
  Layers,
  MapPin,
} from 'lucide-react';
import { useLanguage } from '@/i18n/LanguageContext';
import { useCatalog, useExchangeRate } from '@/data/CatalogContext';
import { calculateYer, formatPriceYer } from '@/lib/currency';
import BreadcrumbNav from '@/components/shop/BreadcrumbNav';
import {
  shopApi,
  addCart,
  commerceCopy,
  errorText,
  conditionText,
  type CatalogItem,
  type ProductRecommendation,
  type Offer,
  type SearchResult,
  specText,
  inspectionTitle
} from '@/data/commerce';
import '@/commerce.css';
import { trackProductView, trackWhatsappClick } from '@/analytics';

const normalizeProductCopy = (value: string) => value
  .toLocaleLowerCase()
  .normalize('NFKD')
  .replace(/[\u064B-\u065F\u0670]/g, '')
  .replace(/[أإآ]/g, 'ا')
  .replace(/[^\p{L}\p{N}]+/gu, ' ')
  .trim();

function distinctProductSummary(title: string, summary: string) {
  const cleanTitle = title.trim();
  const cleanSummary = summary.trim();
  if (!cleanSummary) return '';

  const normalizedTitle = normalizeProductCopy(cleanTitle);
  const normalizedSummary = normalizeProductCopy(cleanSummary);
  if (!normalizedTitle || !normalizedSummary || normalizedTitle === normalizedSummary) return '';

  if (cleanSummary.toLocaleLowerCase().startsWith(cleanTitle.toLocaleLowerCase())) {
    const remainder = cleanSummary.slice(cleanTitle.length).replace(/^[\s,،:؛.\-–—|·]+/, '').trim();
    if (remainder && normalizeProductCopy(remainder) !== normalizedTitle) return remainder;
    return '';
  }

  const titleWords = new Set(normalizedTitle.split(' '));
  const summaryWords = new Set(normalizedSummary.split(' '));
  const sharedWords = [...titleWords].filter(word => summaryWords.has(word)).length;
  if (sharedWords / titleWords.size >= 0.85 && sharedWords / summaryWords.size >= 0.65) return '';
  return cleanSummary;
}

function compactBreadcrumbTitle(title: string) {
  return title.split(/\s+(?:-|–|—)\s+/)[0]?.trim() || title.trim();
}

export default function ProductDetailPage() {
  const { slug, category } = useParams();
  const { language, dir } = useLanguage();
  const { site, categories: catalogCategories } = useCatalog();
  const exchangeRate = useExchangeRate();
  const t = commerceCopy[language];

  const [item, setItem] = useState<CatalogItem | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedOfferIndex, setSelectedOfferIndex] = useState(0);
  const [addingToCart, setAddingToCart] = useState(false);
  const [cartSuccess, setCartSuccess] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [isZoomOpen, setIsZoomOpen] = useState(false);
  const [availabilityFilter, setAvailabilityFilter] = useState<'all' | 'in_stock' | 'local_order' | 'external_order'>('all');
  const [relatedProducts, setRelatedProducts] = useState<ProductRecommendation[]>([]);
  const [relatedLoading, setRelatedLoading] = useState(true);
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);

  useEffect(() => {
    let active = true;
    setSelectedImage(0);
    setSelectedOfferIndex(0);
    setAvailabilityFilter('all');
    setItem(null);
    setError('');
    setLoading(true);

    shopApi<CatalogItem>(`/products/${slug}?category=${encodeURIComponent(category ?? '')}`)
      .then((data) => {
        if (active) {
          setItem(data);
          setLoading(false);
          // Track product view — fire-and-forget, never blocks rendering
          trackProductView(data.product.id);
        }
      })
      .catch((err) => {
        if (active) {
          setError(errorText(err.message, language));
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [slug, category, language]);

  // Canonical redirect if product belongs to another category/slug
  if (item && (category !== item.product.category || slug !== item.product.slug)) {
    return <Navigate replace to={`/${language}/shop/${item.product.category}/${item.product.slug}`} />;
  }

  const product = item?.product;
  const displayProductTitle = product?.title[language] || product?.title.ar || product?.model || '';
  const displayProductSummary = product
    ? distinctProductSummary(displayProductTitle, product.summary[language] || product.summary.ar || '')
    : '';
  const breadcrumbProductTitle = product ? {
    ar: compactBreadcrumbTitle(product.title.ar || product.model),
    en: compactBreadcrumbTitle(product.title.en || product.model),
  } : { ar: '', en: '' };
  const offers = item?.offers ?? [];
  const currentOffer: Offer | undefined = offers[selectedOfferIndex] ?? offers[0];

  // Images resolution: offer-specific images take priority over general product images
  const images = useMemo(() => {
    if (currentOffer?.images?.length) return currentOffer.images;
    if (product?.images?.length) return product.images;
    return ['/placeholder.webp'];
  }, [currentOffer, product]);

  // Reset selected image when images list changes
  useEffect(() => {
    setSelectedImage(0);
  }, [images]);

  const handleNextImage = useCallback(() => {
    if (images.length <= 1) return;
    setSelectedImage((prev) => (prev + 1) % images.length);
  }, [images.length]);

  const handlePrevImage = useCallback(() => {
    if (images.length <= 1) return;
    setSelectedImage((prev) => (prev - 1 + images.length) % images.length);
  }, [images.length]);

  // Touch swipe support for mobile
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchEndX.current = null;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (touchStartX.current === null || touchEndX.current === null) return;
    const diff = touchStartX.current - touchEndX.current;
    const threshold = 40;
    if (Math.abs(diff) > threshold) {
      if (dir === 'rtl') {
        if (diff > 0) handleNextImage();
        else handlePrevImage();
      } else {
        if (diff > 0) handleNextImage();
        else handlePrevImage();
      }
    }
    touchStartX.current = null;
    touchEndX.current = null;
  };

  // Keyboard navigation for zoom modal
  useEffect(() => {
    if (!isZoomOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsZoomOpen(false);
      if (e.key === 'ArrowRight') {
        dir === 'rtl' ? handlePrevImage() : handleNextImage();
      }
      if (e.key === 'ArrowLeft') {
        dir === 'rtl' ? handleNextImage() : handlePrevImage();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isZoomOpen, dir, handleNextImage, handlePrevImage]);

  // Build the recommendation row from the live commerce catalog.
  // Optimized: uses a single API call instead of 3 separate full-catalog scans.
  useEffect(() => {
    let active = true;
    if (!product) {
      setRelatedProducts([]);
      setRelatedLoading(Boolean(slug));
      return () => { active = false; };
    }

    setRelatedLoading(true);
    // Single request for same-category products (small, targeted query)
    const relatedQuery = new URLSearchParams({ category: product.category });
    if (item?.brandId) relatedQuery.set('brand', item.brandId);

    shopApi<SearchResult>(`/catalog?${relatedQuery.toString()}`)
      .then(categoryResult => {
        if (!active) return;
        const seen = new Set([product.id]);
        const selected: CatalogItem[] = [];
        const append = (items: CatalogItem[] | undefined, limit: number) => {
          let added = 0;
          for (const candidate of items ?? []) {
            if (seen.has(candidate.product.id)) continue;
            seen.add(candidate.product.id);
            selected.push(candidate);
            added += 1;
            if (added >= limit) break;
          }
        };
        append(categoryResult?.items, 4);

        const recommendations = selected.map((candidate): ProductRecommendation => {
          const offer = [...candidate.offers].sort((a, b) => Number(b.available) - Number(a.available))[0];
          return {
            id: candidate.product.id,
            slug: candidate.product.slug,
            category: candidate.product.category,
            brand: candidate.product.brand,
            title: candidate.product.title,
            model: candidate.product.model,
            images: offer?.images.length ? offer.images : candidate.product.images,
            condition: offer?.condition ?? '',
            price: {
              usd: offer?.priceUsd ? Number(offer.priceUsd) : null,
              yer: offer?.priceYer ?? null,
            },
            specs: offer?.specs ?? {},
          };
        });
        setRelatedProducts(recommendations);
        setRelatedLoading(false);
      }).catch(() => {
      if (active) {
        setRelatedProducts([]);
        setRelatedLoading(false);
      }
    });

    return () => { active = false; };
  }, [item?.brandId, product?.category, product?.id, slug]);

  const handleAddToCart = async () => {
    if (!currentOffer) return;
    setAddingToCart(true);
    try {
      await addCart({
        variantId: currentOffer.variantId,
        ...(currentOffer.unitId ? { unitId: currentOffer.unitId } : {}),
        quantity: 1
      });
      setCartSuccess(true);
      setTimeout(() => setCartSuccess(false), 3500);
    } catch (e) {
      setError(errorText(e instanceof Error ? e.message : '', language));
    } finally {
      setAddingToCart(false);
    }
  };

  const condName = useMemo(() => {
    const c = currentOffer?.condition;
    if (c === 'new') return language === 'ar' ? 'جديد كلياً' : 'Brand New';
    if (c === 'open_box') return language === 'ar' ? 'صندوق مفتوح (أوبن بوكس)' : 'Open Box';
    if (c === 'like_new') return language === 'ar' ? 'شبه جديد (كسر زيرو)' : 'Like New';
    if (c === 'refurbished') return language === 'ar' ? 'مجدد مضمون' : 'Refurbished';
    if (c === 'used') return language === 'ar' ? 'مستعمل' : 'Used';
    if (c === 'defective') return language === 'ar' ? 'تصفية / قطع' : 'Clearance';
    if (c === 'A') return language === 'ar' ? 'درجة A ممتاز' : 'Grade A';
    if (c === 'B') return language === 'ar' ? 'درجة B نظيف' : 'Grade B';
    if (c === 'C') return language === 'ar' ? 'درجة C' : 'Grade C';
    return c ?? '';
  }, [currentOffer?.condition, language]);

  const specHighlights = useMemo(() => {
    const list: string[] = [];
    if (condName) list.push(condName);
    if (currentOffer?.batteryHealthPct) list.push(`${currentOffer.batteryHealthPct}% Battery`);
    return list;
  }, [currentOffer?.specs, currentOffer?.batteryHealthPct, condName]);

  // Dynamic page title & meta description for client-side SEO / Google / bookmarking
  useEffect(() => {
    if (!product) return;
    const prodTitle = displayProductTitle;
    const siteTitle = language === 'ar' ? 'الجيل العربي الرقمي' : 'Al-Jeel Digital';

    document.title = language === 'ar'
      ? `${prodTitle} في اليمن — مواصفات وسعر | ${siteTitle} صنعاء`
      : `${prodTitle} in Yemen — Price & Specs | ${siteTitle} Sana'a`;

    const descMeta = document.querySelector('meta[name="description"]');
    if (descMeta) {
      const yerPrice = currentOffer?.priceUsd ? calculateYer(currentOffer.priceUsd, exchangeRate, currentOffer.priceYer) : null;
      const yerFormatted = yerPrice ? formatPriceYer(yerPrice, language) : '';
      const pricePhrase = currentOffer?.priceUsd ? ` ($${currentOffer.priceUsd}${yerFormatted ? ` / ${yerFormatted}` : ''})` : '';
      const specsPhrase = specHighlights.length > 0 ? ` [${specHighlights.join(' | ')}]` : '';
      const deliveryPhrase = language === 'ar'
        ? 'فحص فني شامل وضمان معتمد مع توصيل فوري في صنعاء وشحن لكافة المحافظات اليمنية (عدن، تعز، حضرموت، إب، ذمار، مأرب، الحديدة، وباقي المدن).'
        : 'Certified inspection & warranty. Fast delivery in Sana\'a and nationwide shipping across all Yemeni governorates (Aden, Taiz, Hadhramaut, Ibb, Marib, etc.).';
      const summaryText = displayProductSummary;
      const fullDesc = `${prodTitle} في اليمن${pricePhrase}:${specsPhrase} ${summaryText ? `${summaryText}. ` : ''}${deliveryPhrase}`;
      descMeta.setAttribute('content', fullDesc);
    }
  }, [product, language, currentOffer, specHighlights, exchangeRate, displayProductTitle, displayProductSummary]);

  const handleShare = async () => {
    if (!product) return;
    const currentUrl = typeof window !== 'undefined' ? window.location.href : '';
    const prodTitle = displayProductTitle;
    const shareText = `${prodTitle}${currentOffer?.priceUsd ? ` - $${currentOffer.priceUsd}` : ''}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: prodTitle,
          text: shareText,
          url: currentUrl
        });
        return;
      } catch {
        // user cancelled or unsupported
      }
    }
    try {
      await navigator.clipboard.writeText(currentUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch {
      // ignore
    }
  };

  const whatsappPhone = site?.whatsapp || '967771001044';
  const whatsappUrl = useMemo(() => {
    if (!product) return '#';
    const mode = currentOffer?.availabilityMode || 'in_stock';
    const leadDays = currentOffer?.leadTimeDays ?? (mode === 'local_order' ? 2 : mode === 'external_order' ? 10 : null);
    const currentUrl = typeof window !== 'undefined' ? window.location.href : '';

    let orderTypeHeaderAr = 'أود حجز / الاستفسار عن الجهاز المتوفر بالمعرض (تسليم فوري):';
    let orderTypeHeaderEn = 'I would like to inquire/reserve this in-stock showroom device:';
    if (mode === 'local_order') {
      orderTypeHeaderAr = `أود تأكيد حجز وتوفير الجهاز (طلب داخلي محلي - تجهيز خلال ${leadDays} أيام):`;
      orderTypeHeaderEn = `I would like to reserve this device via local procurement (ready in ${leadDays} days):`;
    } else if (mode === 'external_order') {
      orderTypeHeaderAr = `أود تأكيد طلب واستيراد مسبق للجهاز (طلب خارجي - وصول خلال ${leadDays} يوماً):`;
      orderTypeHeaderEn = `I would like to place an external pre-order/import (arriving in ~${leadDays} days):`;
    }

    const textAr = `السلام عليكم ورحمة الله،\n${orderTypeHeaderAr}\n` +
      `• الصنف: ${product.title.ar}\n` +
      (currentOffer?.sku ? `• رمز القطعة (SKU): ${currentOffer.sku}\n` : '') +
      (specHighlights.length > 0 ? `• المواصفات والحالة: ${specHighlights.join(' | ')}\n` : '') +
      `• السعر: $${currentOffer?.priceUsd ?? 'غير محدد'}\n` +
      `• الرابط:\n${currentUrl}`;

    const textEn = `Hello Al-Jeel Digital,\n${orderTypeHeaderEn}\n` +
      `• Product: ${product.title.en}\n` +
      (currentOffer?.sku ? `• SKU: ${currentOffer.sku}\n` : '') +
      (specHighlights.length > 0 ? `• Configuration: ${specHighlights.join(' | ')}\n` : '') +
      `• Price: $${currentOffer?.priceUsd ?? 'N/A'}\n` +
      `• Link:\n${currentUrl}`;

    return `https://wa.me/${whatsappPhone}?text=${encodeURIComponent(language === 'ar' ? textAr : textEn)}`;
  }, [product, currentOffer, whatsappPhone, language, specHighlights]);

  const currentCategoryInfo = useMemo(() => {
    if (!product || !catalogCategories) return { title: { ar: product?.category || '', en: product?.category || '' } };
    const found = catalogCategories.find((c) => c.slug === product.category);
    return found ? { title: found.title } : { title: { ar: product.category, en: product.category } };
  }, [product, catalogCategories]);

  // International Standard: Schema.org Product & Offer Rich Snippet for Google Search
  const productJsonLd = useMemo(() => {
    if (!product) return null;
    const isNew = currentOffer?.condition === 'new';
    const conditionUrl = isNew
      ? 'https://schema.org/NewCondition'
      : currentOffer?.condition === 'refurbished'
      ? 'https://schema.org/RefurbishedCondition'
      : 'https://schema.org/UsedCondition';
    const availabilityUrl = currentOffer?.available
      ? 'https://schema.org/InStock'
      : 'https://schema.org/OutOfStock';

    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://aljeel-digital.com';
    const currentUrl = typeof window !== 'undefined' ? window.location.href : `${origin}/${language}/shop/${product.category}/${product.slug}`;
    const isAr = language === 'ar';
    const prodTitle = product.title[language] || product.title.ar;

    const yemenGovs = [
      { ar: 'صنعاء', en: "Sana'a" },
      { ar: 'عدن', en: 'Aden' },
      { ar: 'تعز', en: 'Taiz' },
      { ar: 'حضرموت', en: 'Hadhramaut' },
      { ar: 'إب', en: 'Ibb' },
      { ar: 'الحديدة', en: 'Al Hodeidah' },
      { ar: 'ذمار', en: 'Dhamar' },
      { ar: 'مأرب', en: 'Marib' },
      { ar: 'شبوة', en: 'Shabwah' },
      { ar: 'صعدة', en: 'Saada' },
      { ar: 'لحج', en: 'Lahij' },
      { ar: 'أبين', en: 'Abyan' },
      { ar: 'المهرة', en: 'Al Mahrah' },
      { ar: 'عمران', en: 'Amran' },
      { ar: 'حجة', en: 'Hajjah' },
      { ar: 'البيضاء', en: 'Al Bayda' },
      { ar: 'الضالع', en: 'Al Dhale' },
      { ar: 'المحويت', en: 'Al Mahwit' },
      { ar: 'ريمة', en: 'Raymah' },
      { ar: 'الجوف', en: 'Al Jawf' },
      { ar: 'سقطرى', en: 'Socotra' },
    ];

    return {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: isAr ? `${prodTitle} في اليمن` : `${prodTitle} in Yemen`,
      description: displayProductSummary || prodTitle,
      image: images.map((img) => (img.startsWith('http') ? img : `${origin}${img.startsWith('/') ? '' : '/'}${img}`)),
      sku: currentOffer?.sku || product.model || String(product.id),
      mpn: product.model,
      brand: {
        '@type': 'Brand',
        name: product.brand
      },
      category: product.category,
      offers: {
        '@type': 'Offer',
        priceCurrency: 'USD',
        price: currentOffer?.priceUsd || '0',
        priceValidUntil: '2027-12-31',
        itemCondition: conditionUrl,
        availability: availabilityUrl,
        url: currentUrl,
        seller: {
          '@type': 'ElectronicsStore',
          name: site?.storeName?.[language] || (isAr ? 'الجيل العربي الرقمي' : 'Al-Jeel Al-Arabi Digital'),
          telephone: site?.phone || '+967771001044',
          address: {
            '@type': 'PostalAddress',
            streetAddress: 'شارع صخر',
            addressLocality: isAr ? 'صنعاء' : "Sana'a",
            addressRegion: isAr ? 'أمانة العاصمة' : "Sana'a",
            addressCountry: 'YE'
          },
          areaServed: [
            { '@type': 'Country', name: 'Yemen', alternateName: 'اليمن' },
            ...yemenGovs.map(g => ({
              '@type': 'AdministrativeArea',
              name: isAr ? g.ar : g.en,
              alternateName: isAr ? g.en : g.ar
            }))
          ]
        },
        shippingDetails: {
          '@type': 'OfferShippingDetails',
          shippingRate: {
            '@type': 'MonetaryAmount',
            value: '0',
            currency: 'USD'
          },
          shippingDestination: {
            '@type': 'DefinedRegion',
            addressCountry: 'YE'
          },
          deliveryTime: {
            '@type': 'ShippingDeliveryTime',
            handlingTime: {
              '@type': 'QuantitativeValue',
              minValue: 0,
              maxValue: 1,
              unitCode: 'DAY'
            },
            transitTime: {
              '@type': 'QuantitativeValue',
              minValue: 1,
              maxValue: 3,
              unitCode: 'DAY'
            }
          }
        },
        hasMerchantReturnPolicy: {
          '@type': 'MerchantReturnPolicy',
          applicableCountry: 'YE',
          returnPolicyCategory: 'https://schema.org/MerchantReturnFiniteReturnWindow',
          merchantReturnDays: 7,
          returnMethod: 'https://schema.org/ReturnInStore',
          returnFees: 'https://schema.org/FreeReturn'
        }
      }
    };
  }, [product, currentOffer, images, language, site, displayProductSummary]);

  return (
    <main id="main-content" className="min-h-screen pt-[76px] sm:pt-24 pb-12 sm:pb-16 px-3 sm:px-6 lg:px-8 max-w-7xl mx-auto" dir={dir}>
      {productJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd) }}
        />
      )}
      {/* Breadcrumbs Navigation with Schema.org JSON-LD */}
      {product ? (
        <div className="mb-3 sm:mb-5">
          <BreadcrumbNav
            category={product.category}
            categoryTitle={currentCategoryInfo.title}
            productTitle={breadcrumbProductTitle}
            language={language}
            langPrefix={`/${language}`}
          />
        </div>
      ) : (
        <nav aria-label="Breadcrumb" className="mb-6 flex items-center gap-2 text-xs sm:text-sm text-neutral-500 dark:text-neutral-400">
          <Link to={`/${language}`} className="hover:text-purple-600 transition-colors">
            {language === 'ar' ? 'الرئيسية' : 'Home'}
          </Link>
          <span className="opacity-50">/</span>
          <Link to={`/${language}/shop`} className="hover:text-purple-600 transition-colors">
            {t.shop}
          </Link>
        </nav>
      )}

      {/* Error View */}
      {error && (
        <div role="alert" className="p-4 mb-6 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-sm flex items-center justify-between">
          <span>{error}</span>
          <Link to={`/${language}/shop`} className="font-semibold underline">
            {t.continue}
          </Link>
        </div>
      )}

      {/* Loading View */}
      {loading && !product && (
        <div className="py-28 flex flex-col items-center justify-center gap-4 text-neutral-500">
          <div className="w-10 h-10 border-4 border-purple-600/30 border-t-purple-600 rounded-full animate-spin" />
          <p className="text-sm font-medium">{t.loading}</p>
        </div>
      )}

      {product && (
        <>
          {/* Main Product Showcase Section */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 lg:gap-10 items-start mb-8 sm:mb-12">
            {/* Gallery Column (7 cols on lg) */}
            <div className="lg:col-span-7 flex flex-col gap-3 sm:gap-4">
              <div
                className="relative rounded-2xl sm:rounded-3xl bg-white dark:bg-white border border-neutral-200/80 dark:border-neutral-800 p-3 sm:p-6 flex items-center justify-center overflow-hidden shadow-sm group select-none"
                style={{ aspectRatio: '16 / 10' }}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
              >
                {/* Floating Badges */}
                <div className="absolute top-3.5 start-3.5 flex flex-wrap gap-1.5 sm:gap-2 z-10 pointer-events-none">
                  {currentOffer?.condition && (
                    <span className="px-2.5 sm:px-3 py-1 rounded-full text-[11px] sm:text-xs font-bold bg-purple-600 text-white shadow-sm shadow-purple-600/30">
                      {conditionText(currentOffer.condition, language)}
                    </span>
                  )}
                  {currentOffer?.batteryHealthPct !== null && currentOffer?.batteryHealthPct !== undefined && (
                    <span className="px-2.5 sm:px-3 py-1 rounded-full text-[11px] sm:text-xs font-semibold bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center gap-1 backdrop-blur-sm">
                      <Battery className="w-3.5 h-3.5" />
                      {currentOffer.batteryHealthPct}% {language === 'ar' ? 'صحة البطارية' : 'Health'}
                    </span>
                  )}
                  {product.demo && (
                    <span className="px-2.5 sm:px-3 py-1 rounded-full text-[11px] sm:text-xs font-medium bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 backdrop-blur-sm">
                      {t.demo}
                    </span>
                  )}
                </div>

                {/* Top End Controls: Zoom + Share */}
                <div className="absolute top-3.5 end-3.5 z-10 flex items-center gap-1.5 sm:gap-2">
                  <button
                    onClick={() => setIsZoomOpen(true)}
                    aria-label={language === 'ar' ? 'تكبير الصورة' : 'Zoom image'}
                    className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white/85 dark:bg-neutral-900/85 backdrop-blur-md border border-neutral-200 dark:border-neutral-700 flex items-center justify-center text-neutral-600 dark:text-neutral-300 hover:text-purple-600 dark:hover:text-purple-400 hover:scale-105 active:scale-95 transition-all shadow-sm"
                  >
                    <Maximize2 className="w-4 h-4" />
                  </button>

                  <button
                    onClick={handleShare}
                    aria-label={language === 'ar' ? 'مشاركة المنتج' : 'Share product'}
                    className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white/85 dark:bg-neutral-900/85 backdrop-blur-md border border-neutral-200 dark:border-neutral-700 flex items-center justify-center text-neutral-600 dark:text-neutral-300 hover:text-purple-600 dark:hover:text-purple-400 hover:scale-105 active:scale-95 transition-all shadow-sm"
                  >
                    {copiedLink ? <Check className="w-4 h-4 text-emerald-500" /> : <Share2 className="w-4 h-4" />}
                  </button>
                </div>

                {/* Previous / Next Navigation Arrows (when multiple images) */}
                {images.length > 1 && (
                  <>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        dir === 'rtl' ? handleNextImage() : handlePrevImage();
                      }}
                      aria-label={language === 'ar' ? 'الصورة السابقة' : 'Previous image'}
                      className="absolute start-2 sm:start-3 z-10 w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-white/90 dark:bg-neutral-900/90 backdrop-blur-md border border-neutral-200/80 dark:border-neutral-700/80 flex items-center justify-center text-neutral-700 dark:text-neutral-200 shadow-md hover:bg-purple-600 hover:text-white dark:hover:bg-purple-600 transition-all opacity-85 sm:opacity-0 group-hover:opacity-100 active:scale-90"
                    >
                      {dir === 'rtl' ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        dir === 'rtl' ? handlePrevImage() : handleNextImage();
                      }}
                      aria-label={language === 'ar' ? 'الصورة التالية' : 'Next image'}
                      className="absolute end-2 sm:end-3 z-10 w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-white/90 dark:bg-neutral-900/90 backdrop-blur-md border border-neutral-200/80 dark:border-neutral-700/80 flex items-center justify-center text-neutral-700 dark:text-neutral-200 shadow-md hover:bg-purple-600 hover:text-white dark:hover:bg-purple-600 transition-all opacity-85 sm:opacity-0 group-hover:opacity-100 active:scale-90"
                    >
                      {dir === 'rtl' ? <ChevronLeft className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                    </button>
                  </>
                )}

                {/* Main Product Image with Click-to-Zoom */}
                <div
                  onClick={() => setIsZoomOpen(true)}
                  className="w-full h-full flex items-center justify-center cursor-zoom-in"
                >
                  <img
                    key={images[selectedImage]}
                    src={images[selectedImage] || '/placeholder.webp'}
                    alt={product.title[language]}
                    className="w-full h-full object-contain transition-all duration-500 ease-out group-hover:scale-105"
                    loading="eager"
                  />
                </div>

                {/* Bottom Overlay: Dots Indicator & Page Count */}
                {images.length > 1 && (
                  <div className="absolute bottom-3 inset-x-0 z-10 flex items-center justify-center pointer-events-none">
                    <div className="px-2.5 py-1 rounded-full bg-neutral-900/60 backdrop-blur-md flex items-center gap-1.5 pointer-events-auto shadow-sm">
                      {images.map((_, idx) => (
                        <button
                          key={idx}
                          onClick={() => setSelectedImage(idx)}
                          aria-label={`Go to image ${idx + 1}`}
                          className={`rounded-full transition-all duration-300 ${
                            selectedImage === idx
                              ? 'w-5 sm:w-6 h-1.5 bg-white'
                              : 'w-1.5 h-1.5 bg-white/40 hover:bg-white/80'
                          }`}
                        />
                      ))}
                      <span className="text-[10px] font-bold text-white/90 ms-1" dir="ltr">
                        {selectedImage + 1}/{images.length}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Thumbnails row */}
              {images.length > 1 && (
                <div className="flex items-center gap-2 sm:gap-3 overflow-x-auto pb-1 scrollbar-none scroll-smooth">
                  {images.map((imgUrl, idx) => (
                    <button
                      key={imgUrl + idx}
                      onClick={() => setSelectedImage(idx)}
                      className={`relative w-16 h-14 sm:w-20 sm:h-16 rounded-xl p-1.5 flex-shrink-0 bg-white dark:bg-white border-2 transition-all ${
                        selectedImage === idx
                          ? 'border-purple-600 ring-2 ring-purple-600/20 scale-[1.02]'
                          : 'border-neutral-200 dark:border-neutral-700/80 hover:border-neutral-300 dark:hover:border-neutral-600 opacity-70 hover:opacity-100'
                      }`}
                      aria-label={`View image ${idx + 1}`}
                    >
                      <img src={imgUrl} alt="" className="w-full h-full object-contain" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Info & Purchase Column (5 cols on lg) */}
            <div className="lg:col-span-5 flex flex-col gap-5 sm:gap-6">
              {/* Brand and Model Header */}
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-50 dark:bg-purple-950/40 border border-purple-100 dark:border-purple-900/50 text-xs font-bold text-purple-600 dark:text-purple-400 mb-2.5">
                  <span>{currentCategoryInfo.title[language]}</span>
                  {condName && <><span className="opacity-40">·</span><span>{condName}</span></>}
                </div>
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-neutral-900 dark:text-neutral-50 leading-tight mb-2.5 sm:mb-3">
                  {displayProductTitle}
                </h1>
                {displayProductSummary && (
                  <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-300 leading-relaxed">
                    {displayProductSummary}
                  </p>
                )}
              </div>

              {/* Price & Currency Display */}
              <div className="p-4 sm:p-5 rounded-2xl bg-neutral-50/80 dark:bg-neutral-900/80 border border-neutral-200/90 dark:border-neutral-800 flex items-center justify-between shadow-sm">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
                      {currentOffer?.originalPriceUsd && Number(currentOffer.originalPriceUsd) > Number(currentOffer?.priceUsd)
                        ? (language === 'ar' ? 'السعر بعد الخصم' : 'Discounted Price')
                        : (language === 'ar' ? 'السعر النقدي' : 'Cash Price')}
                    </span>
                    {Boolean(currentOffer?.originalPriceUsd && Number(currentOffer.originalPriceUsd) > Number(currentOffer?.priceUsd)) && (
                      <span className="px-2 py-0.5 text-[11px] font-extrabold bg-red-100 text-red-600 dark:bg-red-950/70 dark:text-red-400 rounded-full">
                        {language === 'ar'
                          ? `خصم ${currentOffer?.discountPercent ?? Math.round(((Number(currentOffer!.originalPriceUsd) - Number(currentOffer!.priceUsd)) / Number(currentOffer!.originalPriceUsd)) * 100)}%`
                          : `-${currentOffer?.discountPercent ?? Math.round(((Number(currentOffer!.originalPriceUsd) - Number(currentOffer!.priceUsd)) / Number(currentOffer!.originalPriceUsd)) * 100)}%`}
                      </span>
                    )}
                  </div>

                  {Boolean(currentOffer?.originalPriceUsd && Number(currentOffer.originalPriceUsd) > Number(currentOffer?.priceUsd)) && (
                    <div className="flex items-center gap-2 text-neutral-400 dark:text-neutral-500 line-through text-sm font-semibold mb-1">
                      <span dir="ltr">${currentOffer!.originalPriceUsd}</span>
                      {(() => {
                        const origYer = calculateYer(currentOffer?.originalPriceUsd, exchangeRate, currentOffer?.originalPriceYer);
                        const origYerFormatted = formatPriceYer(origYer, language);
                        return origYerFormatted ? (
                          <span className="text-xs" dir="ltr">
                            {origYerFormatted}
                          </span>
                        ) : null;
                      })()}
                    </div>
                  )}

                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl sm:text-3xl font-black text-purple-600 dark:text-purple-400">
                      {currentOffer?.priceUsd ? `$${currentOffer.priceUsd}` : t.ask}
                    </span>
                    {(() => {
                      const mainYer = calculateYer(currentOffer?.priceUsd, exchangeRate, currentOffer?.priceYer);
                      const mainYerFormatted = formatPriceYer(mainYer, language);
                      return mainYerFormatted ? (
                        <span className="text-xs font-semibold text-neutral-500 dark:text-neutral-400" dir="ltr">
                          {mainYerFormatted}
                        </span>
                      ) : null;
                    })()}
                  </div>
                </div>

                {/* Availability Badge */}
                {(() => {
                  const mode = currentOffer?.availabilityMode || 'in_stock';
                  const leadDays = currentOffer?.leadTimeDays ?? (mode === 'local_order' ? 2 : mode === 'external_order' ? 10 : null);
                  if (!currentOffer?.available) {
                    return (
                      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-neutral-100 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 text-xs font-bold">
                        <AlertCircle className="w-3.5 h-3.5" />
                        <span>{t.unavailable}</span>
                      </div>
                    );
                  }
                  if (mode === 'local_order') {
                    return (
                      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 text-xs font-bold shadow-sm">
                        <Truck className="w-3.5 h-3.5" />
                        <span>{language === 'ar' ? `طلب داخلي (توفير خلال ${leadDays ? `${leadDays} أيام` : 'يومين'})` : `Local On-Demand (${leadDays ? `${leadDays}d` : '2d'})`}</span>
                      </div>
                    );
                  }
                  if (mode === 'external_order') {
                    return (
                      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-xs font-bold shadow-sm">
                        <Globe className="w-3.5 h-3.5" />
                        <span>{language === 'ar' ? `طلب خارجي (استيراد خلال ${leadDays ? `${leadDays} يوماً` : '10 أيام'})` : `External Pre-Order (${leadDays ? `${leadDays}d` : '10d'})`}</span>
                      </div>
                    );
                  }
                  return (
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-bold shadow-sm">
                      <Zap className="w-3.5 h-3.5 text-emerald-500" />
                      <span>{language === 'ar' ? 'متوفر الآن' : 'Available now'}</span>
                    </div>
                  );
                })()}
              </div>

              {/* Product Options & Availability Breakdown */}
              {offers.length > 1 && (() => {
                const availableModes = new Set(offers.map((o) => o.availabilityMode || 'in_stock'));
                const filteredOffers = offers
                  .map((off, index) => ({ off, index }))
                  .filter(({ off }) => {
                    if (availabilityFilter === 'all') return true;
                    return (off.availabilityMode || 'in_stock') === availabilityFilter;
                  });

                return (
                  <div className="space-y-3 p-3.5 sm:p-4 rounded-2xl bg-neutral-50/90 dark:bg-neutral-900/90 border border-neutral-200/90 dark:border-neutral-800">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Layers className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                        <label className="text-xs sm:text-sm font-extrabold text-neutral-900 dark:text-neutral-100">
                          {language === 'ar' ? 'خيارات وتكوينات الجهاز المتوفرة:' : 'Available Options & Configurations:'}
                        </label>
                      </div>
                      <span className="text-[11px] font-semibold text-neutral-500 dark:text-neutral-400">
                        {offers.length} {language === 'ar' ? 'خيارات' : 'options'}
                      </span>
                    </div>

                    {/* Quick Filter Tabs (If mixed availability modes exist) */}
                    {availableModes.size > 1 && (
                      <div className="flex flex-wrap items-center gap-1.5 pt-1 pb-1">
                        <button
                          type="button"
                          onClick={() => setAvailabilityFilter('all')}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                            availabilityFilter === 'all'
                              ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 shadow-sm'
                              : 'bg-white dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700 hover:border-neutral-300'
                          }`}
                        >
                          {language === 'ar' ? 'الكل' : 'All'} ({offers.length})
                        </button>

                        {availableModes.has('in_stock') && (
                          <button
                            type="button"
                            onClick={() => setAvailabilityFilter('in_stock')}
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                              availabilityFilter === 'in_stock'
                                ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/30'
                                : 'bg-white dark:bg-neutral-800 text-emerald-700 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/60 hover:bg-emerald-50 dark:hover:bg-emerald-950/30'
                            }`}
                          >
                            <Zap className="w-3 h-3" />
                            <span>{language === 'ar' ? 'متوفر فوري' : 'In Stock'}</span>
                            <span className="opacity-70">({offers.filter((o) => (o.availabilityMode || 'in_stock') === 'in_stock').length})</span>
                          </button>
                        )}

                        {availableModes.has('local_order') && (
                          <button
                            type="button"
                            onClick={() => setAvailabilityFilter('local_order')}
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                              availabilityFilter === 'local_order'
                                ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/30'
                                : 'bg-white dark:bg-neutral-800 text-blue-700 dark:text-blue-400 border border-blue-200/60 dark:border-blue-800/60 hover:bg-blue-50 dark:hover:bg-blue-950/30'
                            }`}
                          >
                            <Truck className="w-3 h-3" />
                            <span>{language === 'ar' ? 'طلب داخلي' : 'Local'}</span>
                            <span className="opacity-70">({offers.filter((o) => o.availabilityMode === 'local_order').length})</span>
                          </button>
                        )}

                        {availableModes.has('external_order') && (
                          <button
                            type="button"
                            onClick={() => setAvailabilityFilter('external_order')}
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                              availabilityFilter === 'external_order'
                                ? 'bg-amber-600 text-white shadow-sm shadow-amber-600/30'
                                : 'bg-white dark:bg-neutral-800 text-amber-700 dark:text-amber-400 border border-amber-200/60 dark:border-amber-800/60 hover:bg-amber-50 dark:hover:bg-amber-950/30'
                            }`}
                          >
                            <Globe className="w-3 h-3" />
                            <span>{language === 'ar' ? 'استيراد خارجي' : 'Pre-Order'}</span>
                            <span className="opacity-70">({offers.filter((o) => o.availabilityMode === 'external_order').length})</span>
                          </button>
                        )}
                      </div>
                    )}

                    {/* Options List */}
                    <div className="space-y-2 max-h-[340px] overflow-y-auto pe-1 scrollbar-thin">
                      {filteredOffers.map(({ off, index: idx }) => {
                        const condLabel = conditionText(off.condition, language);

                        const specHighlights: string[] = [];
                        if (off.specs?.ramGB) specHighlights.push(`${off.specs.ramGB}GB RAM`);
                        else if (off.specs?.ram) specHighlights.push(`${off.specs.ram}`);

                        if (off.specs?.storageGB) specHighlights.push(`${off.specs.storageGB}GB SSD`);
                        else if (off.specs?.capacityGB) specHighlights.push(`${off.specs.capacityGB}GB`);

                        if (off.specs?.cpu) specHighlights.push(`${off.specs.cpu}`);

                        const mode = off.availabilityMode || 'in_stock';
                        const leadDays = off.leadTimeDays ?? (mode === 'local_order' ? 2 : mode === 'external_order' ? 10 : null);
                        const isSelected = selectedOfferIndex === idx;

                        return (
                          <button
                            key={off.variantId + (off.unitId ?? idx)}
                            type="button"
                            onClick={() => setSelectedOfferIndex(idx)}
                            className={`w-full p-3 rounded-xl border text-start transition-all relative ${
                              isSelected
                                ? 'border-purple-600 bg-white dark:bg-neutral-900 shadow-md ring-2 ring-purple-600/20'
                                : 'border-neutral-200 dark:border-neutral-800 bg-white/70 dark:bg-neutral-900/60 hover:border-neutral-300 dark:hover:border-neutral-700'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              {/* Left / Right Content */}
                              <div className="flex-1 min-w-0">
                                <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
                                  {/* Title / Spec headline */}
                                  <span className="text-xs sm:text-sm font-extrabold text-neutral-900 dark:text-neutral-100">
                                    {specHighlights.length > 0
                                      ? specHighlights.slice(0, 2).join(' · ')
                                      : `${language === 'ar' ? 'خيار' : 'Option'} #${idx + 1}`}
                                  </span>

                                  {/* Availability Tag */}
                                  {mode === 'local_order' ? (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-500/20">
                                      <Truck className="w-2.5 h-2.5" />
                                      {language === 'ar' ? `طلب داخلي (${leadDays} أيام)` : `Local (${leadDays}d)`}
                                    </span>
                                  ) : mode === 'external_order' ? (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
                                      <Globe className="w-2.5 h-2.5" />
                                      {language === 'ar' ? `استيراد مسبق (${leadDays} يوم)` : `Pre-Order (${leadDays}d)`}
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                                      <Zap className="w-2.5 h-2.5 text-emerald-600" />
                                      {language === 'ar' ? 'تسليم فوري' : 'In Stock'}
                                    </span>
                                  )}
                                </div>

                                {/* Badges & Condition line */}
                                <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-neutral-600 dark:text-neutral-400">
                                  <span className="font-semibold px-1.5 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300">
                                    {condLabel}
                                  </span>

                                  {off.batteryHealthPct !== null && off.batteryHealthPct !== undefined && (
                                    <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                                      <Battery className="w-3 h-3" />
                                      {off.batteryHealthPct}%
                                    </span>
                                  )}

                                  {off.unitId && (
                                    <span className="inline-flex items-center gap-1 text-purple-600 dark:text-purple-400 font-medium">
                                      <ShieldCheck className="w-3 h-3" />
                                      {language === 'ar' ? 'قطعة مفحوصة' : 'Certified unit'}
                                    </span>
                                  )}

                                  <span dir="ltr" className="font-mono text-[10px] text-neutral-400 opacity-80">
                                    {off.sku}
                                  </span>
                                </div>
                              </div>

                              {/* Price Column */}
                              <div className="text-end flex-shrink-0">
                                <span className="text-sm sm:text-base font-black text-purple-600 dark:text-purple-400 block">
                                  {off.priceUsd ? `$${off.priceUsd}` : t.ask}
                                </span>
                                {(() => {
                                  const offYer = calculateYer(off.priceUsd, exchangeRate, off.priceYer);
                                  const offYerText = formatPriceYer(offYer, language);
                                  return offYerText ? (
                                    <span className="text-[10px] text-neutral-500 dark:text-neutral-400 block font-medium">
                                      {offYerText}
                                    </span>
                                  ) : null;
                                })()}
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

              {/* Purchase & Action Buttons */}
              <div className="flex flex-col gap-2.5 sm:gap-3 pt-1">
                {(() => {
                  const mode = currentOffer?.availabilityMode || 'in_stock';
                  const leadDays = currentOffer?.leadTimeDays ?? (mode === 'local_order' ? 2 : mode === 'external_order' ? 10 : null);
                  let btnLabel = currentOffer?.available ? t.add : t.unavailable;
                  let btnBgClass = 'bg-purple-600 hover:bg-purple-700 text-white shadow-purple-600/25';
                  let btnIcon = <ShoppingBag className="w-5 h-5" />;

                  if (currentOffer?.available) {
                    if (mode === 'local_order') {
                      btnLabel = language === 'ar'
                        ? `حجز · جاهز خلال ${leadDays} أيام`
                        : `Reserve · ready in ${leadDays} days`;
                      btnBgClass = 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-600/25';
                      btnIcon = <Truck className="w-5 h-5" />;
                    } else if (mode === 'external_order') {
                      btnLabel = language === 'ar'
                        ? `طلب مسبق · يصل خلال ${leadDays} يوم`
                        : `Pre-order · arrives in ${leadDays} days`;
                      btnBgClass = 'bg-amber-600 hover:bg-amber-700 text-white shadow-amber-600/25';
                      btnIcon = <Globe className="w-5 h-5" />;
                    } else {
                      btnLabel = language === 'ar' ? 'أضف إلى السلة' : 'Add to cart';
                      btnIcon = <ShoppingBag className="w-5 h-5" />;
                    }
                  }

                  return (
                    <button
                      onClick={handleAddToCart}
                      disabled={!currentOffer?.available || addingToCart}
                      className={`w-full h-12 sm:h-13 rounded-xl font-bold text-sm sm:text-base flex items-center justify-center gap-2 transition-all shadow-md ${
                        cartSuccess
                          ? 'bg-emerald-600 text-white shadow-emerald-600/20'
                          : `${btnBgClass} active:scale-[0.99]`
                      } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      {cartSuccess ? (
                        <>
                          <Check className="w-5 h-5" />
                          <span>{t.added}</span>
                        </>
                      ) : (
                        <>
                          {btnIcon}
                          <span>{btnLabel}</span>
                        </>
                      )}
                    </button>
                  );
                })()}

                <div>
                  <a
                    href={whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => trackWhatsappClick(product?.id)}
                    className="w-full h-11 sm:h-12 rounded-xl font-bold text-xs sm:text-sm bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 border border-emerald-300/60 dark:border-emerald-700/50 flex items-center justify-center gap-2 transition-colors shadow-sm"
                  >
                    <MessageCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span>
                      {(currentOffer?.availabilityMode || 'in_stock') === 'local_order'
                        ? (language === 'ar' ? 'تنسيق الطلب الداخلي عبر واتساب' : 'Coordinate Local Order')
                        : (currentOffer?.availabilityMode || 'in_stock') === 'external_order'
                        ? (language === 'ar' ? 'تنسيق الاستيراد المسبق عبر واتساب' : 'Coordinate Import Pre-Order')
                        : (language === 'ar' ? 'استفسار أو حجز بالمعرض عبر واتساب' : 'Inquire via WhatsApp')}
                    </span>
                  </a>

                </div>

                <p className="text-[10px] text-center text-neutral-500 dark:text-neutral-400">
                  {language === 'ar' ? 'الطلب لا يحجز المخزون؛ يُؤكد التوفر مع المتجر.' : 'Placing an order does not reserve stock; availability is confirmed by the store.'}
                </p>
              </div>

              {/* Purchase reassurance — concise, product-specific, and scannable */}
              <div className="grid grid-cols-3 gap-2" aria-label={language === 'ar' ? 'مزايا الشراء' : 'Purchase benefits'}>
                <div className="flex min-w-0 items-center gap-1.5 rounded-xl border border-neutral-200 bg-white px-2.5 py-3 text-[10px] font-semibold text-neutral-700 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-200 sm:gap-2 sm:px-3 sm:text-xs">
                  <MapPin className="h-4 w-4 shrink-0 text-purple-600" />
                  <span>{language === 'ar' ? 'استلام من المعرض' : 'Showroom pickup'}</span>
                </div>
                <div className="flex min-w-0 items-center gap-1.5 rounded-xl border border-neutral-200 bg-white px-2.5 py-3 text-[10px] font-semibold text-neutral-700 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-200 sm:gap-2 sm:px-3 sm:text-xs">
                  <Globe className="h-4 w-4 shrink-0 text-blue-600" />
                  <span>{language === 'ar' ? 'شحن للمحافظات' : 'Nationwide shipping'}</span>
                </div>
                <div className="flex min-w-0 items-center gap-1.5 rounded-xl border border-neutral-200 bg-white px-2.5 py-3 text-[10px] font-semibold text-neutral-700 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-200 sm:gap-2 sm:px-3 sm:text-xs">
                  <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-600" />
                  <span>{language === 'ar' ? 'فحص وضمان' : 'Inspection & warranty'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Technical Specifications Section */}
          <div className="mt-8 sm:mt-12 rounded-3xl border border-neutral-200/80 dark:border-neutral-800 bg-gradient-to-br from-white to-neutral-50/70 dark:from-neutral-950 dark:to-neutral-900/80 p-4 sm:p-6">
            <div className="flex items-center justify-between gap-3 mb-4 sm:mb-5">
              <div className="flex items-center gap-2.5">
                <span className="w-9 h-9 rounded-xl bg-purple-100 dark:bg-purple-950/60 flex items-center justify-center">
                  <Cpu className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                </span>
                <div>
                  <h2 className="text-base sm:text-xl font-extrabold text-neutral-900 dark:text-neutral-100">
                    {language === 'ar' ? 'مواصفات الجهاز' : 'Device specifications'}
                  </h2>
                  <p className="text-[11px] sm:text-xs text-neutral-500 dark:text-neutral-400">
                    {language === 'ar' ? 'التفاصيل الأساسية لهذا الطراز' : 'Key details for this model'}
                  </p>
                </div>
              </div>
              <span className="text-[10px] sm:text-xs font-semibold text-neutral-500 bg-neutral-100 dark:bg-neutral-800 rounded-full px-2.5 py-1">
                {item.fields.filter((f) => currentOffer?.specs[f.key] !== undefined).length} {language === 'ar' ? 'مواصفات' : 'specs'}
              </span>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3">
              {item.fields
                .filter((f) => currentOffer?.specs[f.key] !== undefined)
                .map((field) => (
                  <div
                    key={field.key}
                    className="min-w-0 min-h-[68px] p-3 sm:p-4 rounded-2xl bg-white/90 dark:bg-neutral-950/70 border border-neutral-200/80 dark:border-neutral-800 flex flex-col justify-center gap-1"
                  >
                    <span className="text-[10px] sm:text-xs font-medium text-neutral-500 dark:text-neutral-400 truncate">
                      {field.title[language]}
                    </span>
                    <bdi className="text-xs sm:text-sm font-bold leading-snug text-neutral-900 dark:text-neutral-100 break-words">
                      {specText(currentOffer?.specs[field.key], language)} {field.unit ?? ''}
                    </bdi>
                  </div>
                ))}
            </div>
          </div>

          {/* Related / Similar Products with Modern Cards */}
          {(relatedLoading || relatedProducts.length > 0) && (
            <div className="mt-8 sm:mt-12 border-t border-neutral-200/80 dark:border-neutral-800 pt-6 sm:pt-8">
              <div className="flex items-center justify-between gap-2 mb-4 sm:mb-6">
                <div className="min-w-0">
                  <h2 className="text-base sm:text-2xl font-extrabold text-neutral-900 dark:text-neutral-100 flex items-center gap-1.5 sm:gap-2">
                    <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 shrink-0 text-purple-600" />
                    <span>{language === 'ar' ? 'منتجات قد تناسبك' : 'You may also like'}</span>
                  </h2>
                </div>
                <Link
                  to={`/${language}/shop`}
                  className="shrink-0 px-2 py-1.5 sm:px-4 sm:py-2 rounded-lg sm:rounded-xl border border-purple-200 dark:border-purple-900/50 hover:bg-purple-50 dark:hover:bg-purple-950/30 text-[10px] sm:text-xs font-bold text-purple-600 dark:text-purple-400 flex items-center gap-1 transition-all"
                >
                  <span>{language === 'ar' ? 'تصفح المتجر' : 'Browse store'}</span>
                  {language === 'ar' ? <ArrowLeft className="w-3.5 h-3.5" /> : <ArrowRight className="w-3.5 h-3.5" />}
                </Link>
              </div>

              {relatedLoading && relatedProducts.length === 0 ? (
                <p className="text-sm text-neutral-500 dark:text-neutral-400" role="status">
                  {language === 'ar' ? 'جارٍ تحميل المنتجات المرتبطة…' : 'Loading related products…'}
                </p>
              ) : <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-4">
                {relatedProducts.map((rel) => {
                  const relPrice = rel.price?.usd;
                  const relYer = rel.price?.yer;
                  const conditionLabel = (() => {
                    const c = rel.condition;
                    return conditionText(c, language);
                  })();

                  const cpu = rel.specs?.cpu ? String(rel.specs.cpu).split(' ')[0] + ' ' + (String(rel.specs.cpu).split(' ')[1] || '') : null;
                  const ram = rel.specs?.ramGB ? `${rel.specs.ramGB} GB` : null;
                  const storage = rel.specs?.storageGB
                    ? `${Number(rel.specs.storageGB) >= 1000 ? Math.round(Number(rel.specs.storageGB) / 1000) + ' TB' : rel.specs.storageGB + ' GB'}`
                    : null;
                  const displaySize = (rel.specs?.display && typeof rel.specs.display === 'object' && (rel.specs.display as any).sizeIn)
                    ? `${(rel.specs.display as any).sizeIn}″`
                    : null;

                  return (
                    <article
                      key={rel.id}
                      className="group bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200/90 dark:border-neutral-800 hover:border-purple-500/50 hover:shadow-xl hover:-translate-y-1.5 transition-all duration-300 flex flex-col justify-between overflow-hidden"
                    >
                      <div>
                        {/* Image Preview Container */}
                        <Link
                          to={`/${language}/shop/${rel.category}/${rel.slug}`}
                          className="relative aspect-[4/3] p-2 sm:p-4 bg-neutral-50/80 dark:bg-neutral-800/40 flex items-center justify-center overflow-hidden border-b border-neutral-100 dark:border-neutral-800/70 block"
                        >
                          {/* Floating Badges */}
                          <div className="absolute top-1.5 start-1.5 sm:top-2.5 sm:start-2.5 z-10 flex flex-wrap gap-1">
                            {conditionLabel && (
                              <span className="px-1.5 sm:px-2 py-0.5 rounded-md text-[9px] sm:text-[10px] font-bold bg-purple-600 text-white shadow-sm">
                                {conditionLabel}
                              </span>
                            )}
                          </div>
                          <span className="absolute top-1.5 end-1.5 sm:top-2.5 sm:end-2.5 z-10 max-w-[48%] truncate px-1.5 sm:px-2 py-0.5 rounded-md text-[9px] sm:text-[10px] font-extrabold bg-white/90 dark:bg-neutral-900/90 text-neutral-600 dark:text-neutral-300 backdrop-blur-sm border border-neutral-200/60 dark:border-neutral-700">
                            {rel.brand}
                          </span>

                          <img
                            src={rel.images[0] || '/placeholder.webp'}
                            alt={rel.title[language]}
                            className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-500"
                            loading="lazy"
                          />
                        </Link>

                        {/* Card Body */}
                        <div className="p-2.5 sm:p-4">
                          <Link
                            to={`/${language}/shop/${rel.category}/${rel.slug}`}
                            className="block"
                          >
                            <h3 className="text-xs sm:text-sm font-bold text-neutral-900 dark:text-neutral-100 group-hover:text-purple-600 dark:group-hover:text-purple-400 line-clamp-3 sm:line-clamp-2 leading-snug transition-colors mb-2 min-h-[3.1rem] sm:mb-2.5 sm:min-h-[2.5rem]">
                              {rel.title[language]}
                            </h3>
                          </Link>

                          {/* Quick Spec Pills */}
                          <div className="flex flex-wrap gap-1 mb-2 sm:mb-3 min-h-5 sm:min-h-[1.5rem]">
                            {cpu && (
                              <span className="text-[9px] sm:text-[10px] font-semibold px-1.5 sm:px-2 py-0.5 rounded-md bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300">
                                {cpu}
                              </span>
                            )}
                            {ram && (
                              <span className="text-[9px] sm:text-[10px] font-semibold px-1.5 sm:px-2 py-0.5 rounded-md bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-100 dark:border-purple-900/40">
                                {ram}
                              </span>
                            )}
                            {storage && (
                              <span className="text-[9px] sm:text-[10px] font-semibold px-1.5 sm:px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-100 dark:border-emerald-900/40">
                                {storage}
                              </span>
                            )}
                            {displaySize && (
                              <span className="text-[9px] sm:text-[10px] font-semibold px-1.5 sm:px-2 py-0.5 rounded-md bg-cyan-50 dark:bg-cyan-950/40 text-cyan-700 dark:text-cyan-300 border border-cyan-100 dark:border-cyan-900/40">
                                {displaySize}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Card Footer with Price and View Link */}
                      <div className="px-2.5 sm:px-4 pb-3 sm:pb-4 pt-2 sm:pt-2.5 border-t border-neutral-100 dark:border-neutral-800/80 flex items-center justify-between gap-1.5 sm:gap-2">
                        <div>
                          <div className="text-sm sm:text-base font-black text-purple-600 dark:text-purple-400">
                            {relPrice ? `$${relPrice}` : t.ask}
                          </div>
                          {(() => {
                            const relYerAmount = calculateYer(relPrice, exchangeRate, relYer);
                            const relYerFormatted = formatPriceYer(relYerAmount, language);
                            return relYerFormatted ? (
                              <span className="text-[10px] text-neutral-400 dark:text-neutral-500 block" dir="ltr">
                                {relYerFormatted}
                              </span>
                            ) : null;
                          })()}
                        </div>

                        <Link
                          to={`/${language}/shop/${rel.category}/${rel.slug}`}
                          className="h-7 sm:h-8 px-2 sm:px-3 rounded-lg bg-neutral-100 hover:bg-purple-600 text-neutral-700 hover:text-white dark:bg-neutral-800 dark:text-neutral-200 dark:hover:bg-purple-600 text-[10px] sm:text-xs font-bold flex items-center gap-1 transition-all"
                        >
                          <span>{language === 'ar' ? 'التفاصيل' : 'Details'}</span>
                          {language === 'ar' ? <ArrowLeft className="w-3 h-3" /> : <ArrowRight className="w-3 h-3" />}
                        </Link>
                      </div>
                    </article>
                  );
                })}
              </div>}
            </div>
          )}
          {/* Fullscreen Lightbox Modal */}
          {isZoomOpen && (
            <div
              role="dialog"
              aria-modal="true"
              className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex flex-col items-center justify-between p-4 sm:p-6 select-none animate-fadeIn"
              onClick={() => setIsZoomOpen(false)}
            >
              {/* Header Controls */}
              <div className="w-full max-w-5xl flex items-center justify-between text-white z-10">
                <div className="flex items-center gap-2">
                  <span className="text-xs sm:text-sm font-bold opacity-80" dir="ltr">
                    {selectedImage + 1} / {images.length}
                  </span>
                  <span className="text-xs text-white/50 hidden sm:inline">| {product.title[language]}</span>
                </div>
                <button
                  onClick={() => setIsZoomOpen(false)}
                  aria-label={language === 'ar' ? 'إغلاق' : 'Close'}
                  className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Main Zoomed Image with Next/Prev Arrows */}
              <div
                className="relative flex-1 w-full max-w-5xl flex items-center justify-center py-4"
                onClick={(e) => e.stopPropagation()}
              >
                {images.length > 1 && (
                  <>
                    <button
                      onClick={() => (dir === 'rtl' ? handleNextImage() : handlePrevImage())}
                      aria-label={language === 'ar' ? 'السابق' : 'Previous'}
                      className="absolute start-2 sm:start-4 z-10 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white/15 hover:bg-white/30 text-white backdrop-blur-md flex items-center justify-center transition-all active:scale-95"
                    >
                      {dir === 'rtl' ? <ChevronRight className="w-6 h-6" /> : <ChevronLeft className="w-6 h-6" />}
                    </button>
                    <button
                      onClick={() => (dir === 'rtl' ? handlePrevImage() : handleNextImage())}
                      aria-label={language === 'ar' ? 'التالي' : 'Next'}
                      className="absolute end-2 sm:end-4 z-10 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white/15 hover:bg-white/30 text-white backdrop-blur-md flex items-center justify-center transition-all active:scale-95"
                    >
                      {dir === 'rtl' ? <ChevronLeft className="w-6 h-6" /> : <ChevronRight className="w-6 h-6" />}
                    </button>
                  </>
                )}

                <img
                  src={images[selectedImage] || '/placeholder.webp'}
                  alt={product.title[language]}
                  className="max-h-[75vh] max-w-full object-contain rounded-2xl shadow-2xl transition-all duration-300"
                />
              </div>

              {/* Bottom Thumbnails in Lightbox */}
              {images.length > 1 && (
                <div
                  className="flex items-center gap-2 overflow-x-auto max-w-md pb-1 scrollbar-none z-10"
                  onClick={(e) => e.stopPropagation()}
                >
                  {images.map((imgUrl, idx) => (
                    <button
                      key={'zoom-' + imgUrl + idx}
                      onClick={() => setSelectedImage(idx)}
                      className={`w-14 h-12 rounded-lg p-1 bg-white/10 border-2 transition-all overflow-hidden flex-shrink-0 ${
                        selectedImage === idx
                          ? 'border-purple-500 scale-105'
                          : 'border-transparent opacity-60 hover:opacity-100'
                      }`}
                    >
                      <img src={imgUrl} alt="" className="w-full h-full object-contain" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </main>
  );
}
