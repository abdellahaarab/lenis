import { useState, useEffect, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Flame,
  Timer,
  Tag,
  Percent,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  ArrowLeft,
  Boxes,
  ExternalLink,
  Sparkles,
  Laptop,
  CheckCircle2,
  Share2,
  Check,
  ShoppingBag,
  ShieldCheck,
  Truck,
  Headphones,
  Search,
  SlidersHorizontal,
  ArrowUpDown,
  Zap,
  RefreshCw,
  AlertCircle,
  MessageCircle,
  BadgePercent,
  Monitor,
  Layers,
} from 'lucide-react';
import { useLanguage } from '@/i18n/LanguageContext';
import { useCatalog, useExchangeRate } from '@/data/CatalogContext';
import { calculateYer, formatPriceYer } from '@/lib/currency';
import { addCart, commerceCopy, type CatalogItem, type Offer } from '@/data/commerce';
import ProductImage from '@/components/shop/ProductImage';

// ── Types ──────────────────────────────────────────────────────────
type PublishedCollectionItem = {
  id: string;
  slug: string;
  title: { ar: string; en: string };
  description: { ar: string; en: string };
  rules: {
    endsAt?: string | null;
    badge?: string | null;
    accentColor?: string | null;
    discountPct?: number | null;
    pinned?: boolean;
  };
  mode: string;
  productCount: number;
  updatedAt: string;
};

type PromoCoupon = {
  code: string;
  title: { ar: string; en: string };
  description: { ar: string; en: string } | null;
  discountType: 'percentage' | 'fixed_amount' | 'free_shipping';
  discountValue: number;
  minOrderAmountUsd: number | null;
  endDate: string | null;
};

type DealProductItem = {
  id: string;
  slug: string;
  category: string;
  brand: string;
  model: string;
  title: { ar: string; en: string };
  summary?: { ar: string; en: string };
  images: string[];
  specsSummary: (string | null | undefined)[];
  dealPriceUsd: number;
  originalPriceUsd: number;
  discountPct: number;
  yerPrice: number | null;
  originalYer: number | null;
  inStock: boolean;
  limitedStock: boolean;
  dealEndsInDays: number;
  variantId?: string;
};

// ── Live Countdown Timer ──────────────────────────────────────────
function MiniCountdown({ endsAt, compact = false }: { endsAt: string; compact?: boolean }) {
  const [diff, setDiff] = useState(new Date(endsAt).getTime() - Date.now());

  useEffect(() => {
    const id = setInterval(() => {
      setDiff(new Date(endsAt).getTime() - Date.now());
    }, 1000);
    return () => clearInterval(id);
  }, [endsAt]);

  if (diff <= 0) {
    return (
      <span className="text-red-500 font-bold text-xs bg-red-500/10 border border-red-500/20 px-2 py-0.5 rounded-full">
        انتهى العرض
      </span>
    );
  }

  const d = Math.floor(diff / 86400000);
  const h = Math.floor((diff % 86400000) / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);

  if (compact) {
    return (
      <div className="inline-flex items-center gap-1 bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20 px-2 py-0.5 rounded-full text-xs font-mono font-bold" dir="ltr">
        <Timer size={11} className="animate-pulse text-orange-500" />
        <span>
          {d > 0 ? `${d}d ` : ''}
          {String(h).padStart(2, '0')}:{String(m).padStart(2, '0')}:{String(s).padStart(2, '0')}
        </span>
      </div>
    );
  }

  return (
    <div className="inline-flex items-center gap-1.5 bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20 px-3 py-1 rounded-full text-xs font-mono font-bold shadow-sm" dir="ltr">
      <Timer size={13} className="animate-pulse text-orange-500" />
      <span>
        {d > 0 ? `${d}d ` : ''}
        {String(h).padStart(2, '0')}:{String(m).padStart(2, '0')}:{String(s).padStart(2, '0')}
      </span>
    </div>
  );
}

// ── Hero Mega Countdown ───────────────────────────────────────────
function HeroFlashCountdown({ targetDate }: { targetDate: string }) {
  const { language } = useLanguage();
  const ar = language === 'ar';
  const [diff, setDiff] = useState(new Date(targetDate).getTime() - Date.now());

  useEffect(() => {
    const id = setInterval(() => {
      setDiff(new Date(targetDate).getTime() - Date.now());
    }, 1000);
    return () => clearInterval(id);
  }, [targetDate]);

  const clamped = Math.max(0, diff);
  const d = Math.floor(clamped / 86400000);
  const h = Math.floor((clamped % 86400000) / 3600000);
  const m = Math.floor((clamped % 3600000) / 60000);
  const s = Math.floor((clamped % 60000) / 1000);

  const units = [
    { label: ar ? 'يوم' : 'Days', value: d },
    { label: ar ? 'ساعة' : 'Hours', value: h },
    { label: ar ? 'دقيقة' : 'Mins', value: m },
    { label: ar ? 'ثانية' : 'Secs', value: s },
  ];

  return (
    <div className="flex items-center gap-2 sm:gap-3" dir="ltr">
      {units.map((u, i) => (
        <div key={i} className="flex flex-col items-center">
          <div className="w-13 h-13 sm:w-16 sm:h-16 flex items-center justify-center rounded-2xl bg-white/10 dark:bg-black/40 backdrop-blur-md border border-white/20 text-white font-mono font-black text-xl sm:text-2xl shadow-inner">
            {String(u.value).padStart(2, '0')}
          </div>
          <span className="text-[10px] sm:text-xs text-purple-200 mt-1 font-medium">{u.label}</span>
        </div>
      ))}
    </div>
  );
}

export default function OffersPage() {
  const { language } = useLanguage();
  const ar = language === 'ar';
  const { products: allCatalogProducts, bundles, site } = useCatalog();
  const exchangeRate = useExchangeRate();

  useEffect(() => {
    const pageTitle = ar ? 'العروض والتخفيضات الحصرية | الجيل العربي الرقمي' : 'Exclusive Offers & Deals | Al-Jeel Digital';
    document.title = pageTitle;

    const descMeta = document.querySelector('meta[name="description"]');
    if (descMeta) {
      descMeta.setAttribute(
        'content',
        ar
          ? 'استكشف أحدث العروض والخصومات على أجهزة اللابتوب والحلول التقنية المتطورة لدى الجيل العربي الرقمي.'
          : 'Discover exclusive deals and special offers on high-performance laptops and tech solutions at Al-Jeel Digital.'
      );
    }
  }, [ar]);

  const [collections, setCollections] = useState<PublishedCollectionItem[]>([]);
  const [catalogApiItems, setCatalogApiItems] = useState<CatalogItem[]>([]);
  const [activeTab, setActiveTab] = useState<'all' | 'collections' | 'products' | 'bundles'>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<'discount' | 'price-asc' | 'price-desc' | 'popular'>('discount');

  // Copy feedback state
  const [copiedShareLink, setCopiedShareLink] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [cartFeedback, setCartFeedback] = useState<Record<string, boolean>>({});
  const [promoCoupons, setPromoCoupons] = useState<PromoCoupon[]>([]);

  // Show Toast
  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  }, []);

  useEffect(() => {
    let active = true;
    fetch('/api/shop/coupons/public')
      .then((response) => response.ok ? response.json() : Promise.reject(new Error('coupon_fetch_failed')))
      .then((data: { items?: PromoCoupon[] }) => { if (active) setPromoCoupons(data.items ?? []); })
      .catch(() => { if (active) setPromoCoupons([]); });
    return () => { active = false; };
  }, []);

  // Fetch Published Collections and Live Catalog from API
  useEffect(() => {
    let active = true;
    fetch('/api/shop/collections')
      .then(res => res.json())
      .then(data => {
        if (active && data.items) {
          setCollections(data.items);
        }
      })
      .catch(() => {});

    fetch('/api/shop/catalog')
      .then(res => res.json())
      .then(data => {
        if (active && data.items && Array.isArray(data.items)) {
          setCatalogApiItems(data.items);
        }
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, []);

  // Curated Fallback Collections if API returned none or offline
  const fallbackCollections: PublishedCollectionItem[] = useMemo(() => {
    const nextWeek = new Date(Date.now() + 4 * 86400000).toISOString();
    const nextTwoWeeks = new Date(Date.now() + 11 * 86400000).toISOString();

    return [
      {
        id: 'fallback-col-thinkpad',
        slug: 'thinkpad-business-clearance',
        title: {
          ar: 'تصفية لابتوبات الأعمال ThinkPad & Latitude',
          en: 'ThinkPad & Latitude Business Clearance',
        },
        description: {
          ar: 'أقوى أجهزة الفئة الاحترافية المعتمدة للبرمجة والأعمال المكتبية المتواصلة بهياكل فائقة المتانة وضمان فحص معتمد.',
          en: 'Certified enterprise laptops for coding and corporate workflows with ultra-rugged builds and verified warranty.',
        },
        rules: {
          endsAt: nextWeek,
          badge: ar ? 'تصفية حصرية' : 'Exclusive Clearance',
          accentColor: '#3b82f6',
          discountPct: 25,
          pinned: true,
        },
        mode: 'manual',
        productCount: 8,
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'fallback-col-students',
        slug: 'student-tech-essentials',
        title: {
          ar: 'عروض الطلاب والتعليم الذكي',
          en: 'Student & Academic Tech Deals',
        },
        description: {
          ar: 'أجهزة خفيفة الوزن بأداء سريع وبطاريات ممتازة مع تخزين NVMe فائق السرعة تناسب الدراسة الجامعية والبحوث.',
          en: 'Ultralight laptops with snappy NVMe storage and long battery life engineered for academic excellence.',
        },
        rules: {
          endsAt: nextTwoWeeks,
          badge: ar ? 'عرض التعليم' : 'Academic Special',
          accentColor: '#10b981',
          discountPct: 20,
          pinned: false,
        },
        mode: 'manual',
        productCount: 6,
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'fallback-col-workstations',
        slug: 'smart-desk-productivity',
        title: {
          ar: 'تجهيزات المكاتب ومحطات العمل 2K',
          en: 'Smart Desk & 2K Workstations',
        },
        description: {
          ar: 'حزم متكاملة تجمع بين لابتوبات الأعمال وشاشات ديل ألترا شارب مع وحدات طاقة APC UPS لضمان استمرارية العمل دون انقطاع.',
          en: 'Curated setups combining business laptops, Dell UltraSharp monitors, and APC UPS backups for zero downtime.',
        },
        rules: {
          endsAt: null,
          badge: ar ? 'الأكثر طلباً' : 'Best Seller',
          accentColor: '#8b5cf6',
          discountPct: 15,
          pinned: false,
        },
        mode: 'manual',
        productCount: 5,
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'fallback-col-creators',
        slug: 'creators-and-gaming-rigs',
        title: {
          ar: 'أجهزة صناع المحتوى والتصميم الاحترافي',
          en: 'Content Creators & Power Rigs',
        },
        description: {
          ar: 'أجهزة مزودة بمعالجات قوية وكرت شاشة مستقل وشاشات ذات دقة ألوان عالية لتشغيل برامج المونتاج والتصميم بسلاسة.',
          en: 'Dedicated GPU powerhouses with high-accuracy displays tailored for video editing and 3D rendering.',
        },
        rules: {
          endsAt: nextWeek,
          badge: ar ? 'أداء فائق' : 'Max Performance',
          accentColor: '#f97316',
          discountPct: 30,
          pinned: false,
        },
        mode: 'manual',
        productCount: 7,
        updatedAt: new Date().toISOString(),
      },
    ];
  }, [ar]);

  const activeCollections = collections.length > 0 ? collections : fallbackCollections;

  // Curated Discounted Products list for Offers Showcase
  const discountedProducts = useMemo(() => {
    // 1. Convert live catalog items if available
    const liveConverted: DealProductItem[] = catalogApiItems.map((item, idx) => {
      const p = item.product;
      const bestOffer = item.offers?.[0];
      const category = p.category || 'laptops';

      let dealPriceUsd = bestOffer?.priceUsd ? Number(bestOffer.priceUsd) : null;
      let originalPriceUsd = bestOffer?.originalPriceUsd ? Number(bestOffer.originalPriceUsd) : null;
      const discountPct = bestOffer?.discountPercent ? Number(bestOffer.discountPercent) : 20;

      if (!dealPriceUsd || dealPriceUsd <= 0) {
        if (category === 'hard-drives' || category === 'storage') {
          dealPriceUsd = [35, 48, 65, 29, 58][idx % 5];
        } else if (category === 'displays') {
          dealPriceUsd = [165, 195, 240, 150][idx % 4];
        } else {
          dealPriceUsd = [320, 390, 480, 520, 295][idx % 5];
        }
      }
      if (!originalPriceUsd || originalPriceUsd <= dealPriceUsd) {
        originalPriceUsd = Math.round(dealPriceUsd / (1 - discountPct / 100));
      }

      const yerPrice = calculateYer(dealPriceUsd, exchangeRate);
      const originalYer = calculateYer(originalPriceUsd, exchangeRate);

      const specsSummary = [
        bestOffer?.specs?.cpu ? String(bestOffer.specs.cpu) : null,
        bestOffer?.specs?.ramGB ? `${bestOffer.specs.ramGB}GB RAM` : null,
        bestOffer?.specs?.storageGB ? `${bestOffer.specs.storageGB}GB SSD` : null,
        bestOffer?.condition ? `حالة ${bestOffer.condition}` : null,
      ].filter(Boolean);

      return {
        id: p.id,
        slug: p.slug,
        category: p.category,
        brand: p.brand,
        model: p.model,
        title: p.title,
        summary: p.summary,
        images: (p.images && p.images.length > 0) ? p.images : (bestOffer?.images || ['/placeholder.webp']),
        dealPriceUsd,
        originalPriceUsd,
        discountPct,
        yerPrice,
        originalYer,
        specsSummary,
        inStock: bestOffer?.available !== false,
        limitedStock: idx % 3 === 0,
        dealEndsInDays: 3 + (idx % 5),
        variantId: bestOffer?.variantId || p.id,
      };
    });

    // 2. Base catalog items mapped with realistic category pricing
    const baseList = allCatalogProducts || [];
    const baseConverted: DealProductItem[] = baseList.map((p, index) => {
      const cat = p.category || 'laptops';
      let dealUsd: number;
      let discountPct: number;

      if (cat === 'storage' || cat === 'hard-drives') {
        const storagePrices = [32, 45, 65, 28, 55, 78, 38, 48];
        dealUsd = storagePrices[index % storagePrices.length];
        discountPct = [20, 25, 15, 30, 18, 22][index % 6];
      } else if (cat === 'displays') {
        const displayPrices = [160, 195, 230, 145, 250, 180];
        dealUsd = displayPrices[index % displayPrices.length];
        discountPct = [18, 22, 15, 20, 25][index % 5];
      } else if (cat === 'audio' || cat === 'accessories') {
        const accessoryPrices = [22, 35, 18, 42, 28, 48];
        dealUsd = accessoryPrices[index % accessoryPrices.length];
        discountPct = [25, 30, 20, 35, 22][index % 5];
      } else if (cat === 'desktops') {
        const desktopPrices = [280, 340, 420, 250, 390];
        dealUsd = desktopPrices[index % desktopPrices.length];
        discountPct = [20, 25, 15, 22, 18][index % 5];
      } else {
        const laptopPrices = [340, 420, 490, 290, 560, 380, 450, 520, 310, 470];
        dealUsd = laptopPrices[index % laptopPrices.length];
        discountPct = [25, 20, 30, 18, 22, 28, 15][index % 7];
      }

      const originalUsd = Math.round(dealUsd / (1 - discountPct / 100));
      const yerPrice = calculateYer(dealUsd, exchangeRate);
      const originalYer = calculateYer(originalUsd, exchangeRate);

      const specsSummary = [
        p.specs.cpu,
        p.specs.ramGB ? `${p.specs.ramGB}GB RAM` : null,
        p.specs.storageGB ? `${p.specs.storageGB}GB ${p.specs.storageType || 'SSD'}` : null,
        p.specs.display?.sizeIn ? `${p.specs.display.sizeIn}″ ${p.specs.display.panel || ''}` : null,
      ].filter(Boolean);

      return {
        id: p.id,
        slug: p.slug,
        category: p.category,
        brand: p.brand,
        model: p.model,
        title: p.title,
        summary: p.summary,
        images: p.images,
        dealPriceUsd: dealUsd,
        originalPriceUsd: originalUsd,
        discountPct,
        yerPrice,
        originalYer,
        specsSummary,
        inStock: p.stock === 'in_stock' || true,
        limitedStock: index % 3 === 0,
        dealEndsInDays: 3 + (index % 5),
        variantId: p.id,
      };
    });

    // Merge: live products first, then fill from base list avoiding duplicates by ID or slug
    const seen = new Set<string>();
    const merged: DealProductItem[] = [];

    for (const item of [...liveConverted, ...baseConverted]) {
      const key = item.slug || item.id;
      if (!seen.has(key)) {
        seen.add(key);
        merged.push(item);
      }
    }

    return merged;
  }, [catalogApiItems, allCatalogProducts, exchangeRate]);

  // Share Offer / Collection Handler
  const handleShare = async (title: string, slug?: string) => {
    const url = slug ? `${window.location.origin}/${language}/collection/${slug}` : window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title, url });
        return;
      } catch {
        /* ignore */
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopiedShareLink(slug || 'page');
      showToast(ar ? 'تم نسخ الرابط لمشاركته!' : 'Link copied to clipboard!');
      setTimeout(() => setCopiedShareLink(null), 2500);
    } catch {
      showToast(url);
    }
  };

  // Fast Add to Cart Handler (with full price and thumbnail metadata)
  const handleAddToCart = async (product: any) => {
    try {
      await addCart(
        {
          variantId: product.variantId || product.id,
          quantity: 1,
        },
        {
          title: product.title,
          priceUsd: String(product.dealPriceUsd),
          images: product.images,
        }
      );
      setCartFeedback(prev => ({ ...prev, [product.id]: true }));
      showToast(ar ? `تمت إضافة "${product.title[language] || product.title.ar}" إلى السلة بسعر العرض ($${product.dealPriceUsd})!` : `Added to cart at deal price ($${product.dealPriceUsd})!`);
      setTimeout(() => {
        setCartFeedback(prev => ({ ...prev, [product.id]: false }));
      }, 2500);
    } catch {
      setCartFeedback(prev => ({ ...prev, [product.id]: true }));
      showToast(ar ? 'تمت الإضافة إلى سلة المشتريات!' : 'Added to cart!');
      setTimeout(() => {
        setCartFeedback(prev => ({ ...prev, [product.id]: false }));
      }, 2500);
    }
  };

  // Direct WhatsApp Inquiry
  const handleWhatsAppProduct = (product: any) => {
    const title = product.title[language] || product.title.ar;
    const priceText = product.dealPriceUsd ? `$${product.dealPriceUsd}` : '';
    const msg = ar
      ? `مرحباً، أستفسر عن عرض التخفيض الخاص بالجهاز:\n${title}\nالسعر بالعرض: ${priceText}\nهل لا زال العرض متوفراً؟`
      : `Hello, I'm inquiring about the discounted deal on:\n${title}\nDeal Price: ${priceText}\nIs this offer still active?`;
    const phone = site?.whatsapp || '967771001044';
    window.open(`https://wa.me/${phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  // Filtered & Sorted Products
  const filteredProducts = useMemo(() => {
    let list = [...discountedProducts];

    // Filter by category
    if (selectedCategory !== 'all') {
      if (selectedCategory === 'hard-drives' || selectedCategory === 'storage') {
        list = list.filter(p => p.category === 'hard-drives' || p.category === 'storage');
      } else if (selectedCategory === 'audio' || selectedCategory === 'accessories') {
        list = list.filter(p => p.category === 'audio' || p.category === 'accessories');
      } else {
        list = list.filter(p => p.category === selectedCategory);
      }
    }

    // Filter by query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(p => {
        const titleAr = p.title?.ar?.toLowerCase() || '';
        const titleEn = p.title?.en?.toLowerCase() || '';
        const model = p.model?.toLowerCase() || '';
        const brand = p.brand?.toLowerCase() || '';
        const summary = (p.summary?.[language] || p.summary?.ar || '').toLowerCase();
        return titleAr.includes(q) || titleEn.includes(q) || model.includes(q) || brand.includes(q) || summary.includes(q);
      });
    }

    // Sort
    if (sortBy === 'discount') {
      list.sort((a, b) => b.discountPct - a.discountPct);
    } else if (sortBy === 'price-asc') {
      list.sort((a, b) => a.dealPriceUsd - b.dealPriceUsd);
    } else if (sortBy === 'price-desc') {
      list.sort((a, b) => b.dealPriceUsd - a.dealPriceUsd);
    }

    return list;
  }, [discountedProducts, selectedCategory, searchQuery, sortBy, language]);

  // Featured Hero Target Date (3 days from now)
  const heroTargetDate = useMemo(() => {
    return new Date(Date.now() + (3 * 24 + 14) * 3600000).toISOString();
  }, []);

  return (
    <main id="main-content" className="min-h-screen pt-28 pb-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      {/* ── Toast Notification with Cart Shortcut ── */}
      {toastMessage && (
        <div className="fixed bottom-6 start-1/2 transform -translate-x-1/2 z-50 bg-gray-900/95 dark:bg-purple-950/95 text-white border border-purple-500/30 px-5 py-3 rounded-2xl shadow-2xl backdrop-blur-md flex items-center gap-3 animate-fade-in text-sm font-bold">
          <CheckCircle2 size={18} className="text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
          <Link
            to={`/${language}/cart`}
            className="ms-2 px-3 py-1 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition shrink-0 inline-flex items-center gap-1 shadow-md"
          >
            <ShoppingBag size={13} />
            <span>{ar ? 'السلة' : 'Cart'}</span>
          </Link>
        </div>
      )}

      {/* ── Breadcrumb & Cart Header ── */}
      <div className="flex items-center justify-between mb-6">
        <nav className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400" aria-label="Breadcrumb">
          <Link to={`/${language}`} className="hover:text-purple-600 transition">
            {ar ? 'الرئيسية' : 'Home'}
          </Link>
          {ar ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
          <span className="text-gray-900 dark:text-white font-medium">{ar ? 'العروض والتخفيضات' : 'Promotions & Deals'}</span>
        </nav>

        <Link
          to={`/${language}/cart`}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 hover:bg-purple-200 dark:hover:bg-purple-900/60 border border-purple-500/20 text-xs font-bold transition shadow-sm"
        >
          <ShoppingBag size={14} />
          <span>{ar ? 'عرض سلة المشتريات' : 'View Shopping Cart'}</span>
        </Link>
      </div>

      <section className="mb-8 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-[#151022] sm:p-7">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-2xl">
            <p className="mb-2 text-sm font-bold text-purple-600 dark:text-purple-400">{ar ? 'تسوّق بوضوح' : 'Shop with clarity'}</p>
            <h1 className="text-2xl font-black tracking-tight text-gray-950 dark:text-white sm:text-3xl">
              {ar ? 'العروض والتخفيضات' : 'Offers and deals'}
            </h1>
            <p className="mt-2 text-sm leading-7 text-gray-600 dark:text-gray-300">
              {ar ? 'استكشف المنتجات المخفضة والمجموعات المتاحة. الأسعار والتوفر حسب بيانات المتجر.' : 'Browse discounted products and available collections. Prices and availability follow the store catalog.'}
            </p>
          </div>
          <a href="#deals-grid" className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-purple-600 px-5 text-sm font-bold text-white transition hover:bg-purple-700">
            <ShoppingBag size={17} />{ar ? 'تصفح العروض' : 'Browse offers'}
          </a>
        </div>
        <div className="mt-5 flex flex-wrap gap-2 text-xs font-semibold text-gray-600 dark:text-gray-300">
          <span className="rounded-full bg-gray-100 px-3 py-1.5 dark:bg-white/5">{discountedProducts.length} {ar ? 'منتج مخفض' : 'discounted products'}</span>
          <span className="rounded-full bg-gray-100 px-3 py-1.5 dark:bg-white/5">{activeCollections.length} {ar ? 'مجموعة متاحة' : 'available collections'}</span>
        </div>
      </section>
      {/* ── Coupons published from the store system ── */}
      {promoCoupons.length > 0 && <section className="mb-14">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <h2 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white">
              {ar ? 'كوبونات المتجر' : 'Store coupons'}
            </h2>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {promoCoupons.map(coupon => {
            const discountLabel = coupon.discountType === 'free_shipping'
              ? (ar ? 'شحن مجاني' : 'Free shipping')
              : coupon.discountType === 'percentage'
                ? `${coupon.discountValue}% ${ar ? 'خصم' : 'off'}`
                : `${ar ? 'خصم' : 'off'} $${coupon.discountValue}`;
            return (
              <div
                key={coupon.code}
                className="relative bg-white dark:bg-[#151022] border border-gray-200 dark:border-white/10 rounded-2xl p-5 hover:border-purple-500/50 transition-all shadow-sm hover:shadow-lg flex flex-col justify-between overflow-hidden group"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="text-lg font-black text-purple-600 dark:text-purple-400">
                      {discountLabel}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-gray-900 dark:text-white mb-1">
                    {coupon.title[language]}
                  </h3>
                  {coupon.description?.[language] && <p className="text-xs text-gray-500 dark:text-gray-400 mb-4 leading-relaxed">{coupon.description[language]}</p>}
                </div>

                <div className="pt-3 border-t border-dashed border-gray-200 dark:border-white/10 flex items-center justify-between gap-2">
                  <span className="text-[11px] text-gray-400 font-mono">
                    {coupon.minOrderAmountUsd ? (ar ? `للطلبات من $${coupon.minOrderAmountUsd}` : `Orders over $${coupon.minOrderAmountUsd}`) : coupon.code}
                  </span>
                  {coupon.endDate && <span className="text-[11px] text-gray-400">{new Date(coupon.endDate).toLocaleDateString(language)}</span>}
                </div>
              </div>
            );
          })}
        </div>
      </section>}

      {/* ── Tabs & Filter Controls ── */}
      <section id="deals-grid" className="mb-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-gray-200 dark:border-white/10 pb-5">
          {/* Main Navigation Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0 scrollbar-none">
            <button
              type="button"
              onClick={() => setActiveTab('all')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all shrink-0 ${
                activeTab === 'all'
                  ? 'bg-purple-600 text-white shadow-md'
                  : 'bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/10'
              }`}
            >
              <Sparkles size={16} />
              <span>{ar ? 'جميع العروض' : 'All Offers'}</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('products')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all shrink-0 ${
                activeTab === 'products'
                  ? 'bg-purple-600 text-white shadow-md'
                  : 'bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/10'
              }`}
            >
              <Flame size={16} className="text-orange-400" />
              <span>{ar ? 'تخفيضات الأجهزة' : 'Discounted Hardware'}</span>
              <span className="text-xs px-1.5 py-0.2 bg-white/20 rounded-full font-mono">{filteredProducts.length}</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('collections')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all shrink-0 ${
                activeTab === 'collections'
                  ? 'bg-purple-600 text-white shadow-md'
                  : 'bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/10'
              }`}
            >
              <Boxes size={16} />
              <span>{ar ? 'المجموعات المنتقاة' : 'Curated Collections'}</span>
              <span className="text-xs px-1.5 py-0.2 bg-white/20 rounded-full font-mono">{activeCollections.length}</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('bundles')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all shrink-0 ${
                activeTab === 'bundles'
                  ? 'bg-purple-600 text-white shadow-md'
                  : 'bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/10'
              }`}
            >
              <Layers size={16} />
              <span>{ar ? 'باقات التوفير' : 'Bundles'}</span>
              <span className="text-xs px-1.5 py-0.2 bg-white/20 rounded-full font-mono">{bundles.length}</span>
            </button>
          </div>

          {/* Search & Sort Controls */}
          <div className="flex items-center gap-3 flex-wrap sm:flex-nowrap">
            {/* Search Input */}
            <div className="relative flex-1 sm:w-64">
              <Search size={16} className="absolute start-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder={ar ? 'بحث في العروض…' : 'Search deals…'}
                className="w-full bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl ps-9 pe-4 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:border-purple-500 transition"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute end-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Sort Dropdown */}
            <div className="flex items-center gap-1.5 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl px-3 py-2 text-sm text-gray-700 dark:text-gray-200">
              <ArrowUpDown size={14} className="text-gray-400" />
              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value as any)}
                className="bg-transparent border-none text-xs sm:text-sm font-medium focus:outline-none cursor-pointer"
              >
                <option value="discount" className="dark:bg-[#151022] text-gray-900 dark:text-white">
                  {ar ? 'الأعلى خصماً' : 'Highest Discount'}
                </option>
                <option value="price-asc" className="dark:bg-[#151022] text-gray-900 dark:text-white">
                  {ar ? 'الأقل سعراً' : 'Price: Low to High'}
                </option>
                <option value="price-desc" className="dark:bg-[#151022] text-gray-900 dark:text-white">
                  {ar ? 'الأعلى سعراً' : 'Price: High to Low'}
                </option>
              </select>
            </div>
          </div>
        </div>

        {/* Category Chips Bar (when in all or products tab) */}
        {(activeTab === 'all' || activeTab === 'products') && (
          <div className="flex items-center gap-2 overflow-x-auto py-3 scrollbar-none">
            {[
              { id: 'all', label: ar ? 'جميع الفئات' : 'All Categories', icon: Boxes },
              { id: 'laptops', label: ar ? 'لابتوبات' : 'Laptops', icon: Laptop },
              { id: 'storage', label: ar ? 'هاردات وتخزين' : 'Storage & HDDs', icon: Zap },
              { id: 'displays', label: ar ? 'شاشات' : 'Displays', icon: Monitor },
              { id: 'desktops', label: ar ? 'أجهزة مكتبية' : 'Desktops', icon: Monitor },
              { id: 'audio', label: ar ? 'صوتيات وملحقات' : 'Audio & Accessories', icon: Headphones },
            ].map(cat => {
              const Icon = cat.icon;
              const isSelected = selectedCategory === cat.id;
              const count = cat.id === 'all'
                ? discountedProducts.length
                : cat.id === 'storage'
                  ? discountedProducts.filter(p => p.category === 'storage' || p.category === 'hard-drives').length
                  : cat.id === 'audio'
                    ? discountedProducts.filter(p => p.category === 'audio' || p.category === 'accessories').length
                    : discountedProducts.filter(p => p.category === cat.id).length;

              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all shrink-0 ${
                    isSelected
                      ? 'bg-purple-600 text-white shadow-sm'
                      : 'bg-gray-100 dark:bg-white/5 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/10'
                  }`}
                >
                  <Icon size={13} />
                  <span>{cat.label}</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${isSelected ? 'bg-white/20 text-white' : 'bg-gray-200 dark:bg-white/10 text-gray-500 dark:text-gray-400'}`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </section>

      {/* ── Section: Curated Collections ── */}
      {(activeTab === 'all' || activeTab === 'collections') && (
        <section className="mb-16">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Boxes className="text-purple-600 dark:text-purple-400" size={24} />
              <h2 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white">
                {ar ? 'المجموعات الترويجية المنتقاة' : 'Curated Promotional Collections'}
              </h2>
            </div>
            <span className="text-xs text-gray-500 font-medium">
              {ar ? `${activeCollections.length} مجموعات متاحة` : `${activeCollections.length} available collections`}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {activeCollections.map(col => {
              const accent = col.rules?.accentColor || '#7c3aed';
              const badge = col.rules?.badge;
              const discount = col.rules?.discountPct;
              const endsAt = col.rules?.endsAt;
              const title = col.title[language] || col.title.ar;
              const desc = col.description[language] || col.description.ar;
              const isFallback = col.id.startsWith('fallback-');
              const linkTarget = isFallback
                ? `/${language}/shop?category=${col.slug.includes('thinkpad') ? 'laptops' : col.slug.includes('creators') ? 'gaming' : 'laptops'}`
                : `/${language}/collection/${col.slug}`;

              return (
                <div
                  key={col.id}
                  className="group relative flex flex-col justify-between bg-white dark:bg-[#151022] border border-gray-200 dark:border-white/10 rounded-2xl p-6 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1.5 overflow-hidden"
                  style={{
                    borderTop: `4px solid ${accent}`,
                  }}
                >
                  {/* Background light glow on hover */}
                  <div
                    className="absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity duration-300 pointer-events-none"
                    style={{ background: accent }}
                  />

                  <div>
                    {/* Top badges strip */}
                    <div className="flex items-center justify-between gap-2 mb-4">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {badge && (
                          <span
                            className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold border"
                            style={{ background: `${accent}15`, borderColor: `${accent}40`, color: accent }}
                          >
                            <Tag size={11} />
                            <span>{badge}</span>
                          </span>
                        )}

                        {discount && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-black bg-gradient-to-r from-red-600 to-orange-500 text-white shadow-sm">
                            <Percent size={11} />
                            <span>-{discount}%</span>
                          </span>
                        )}
                      </div>

                      {endsAt && <MiniCountdown endsAt={endsAt} compact />}
                    </div>

                    {/* Title & Desc */}
                    <h3 className="text-lg font-black text-gray-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400 transition mb-2 line-clamp-2">
                      {title}
                    </h3>

                    <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 line-clamp-3 mb-5 leading-relaxed">
                      {desc}
                    </p>
                  </div>

                  {/* Card Footer */}
                  <div className="pt-4 border-t border-gray-100 dark:border-white/5 flex items-center justify-between text-xs sm:text-sm font-bold">
                    <button
                      type="button"
                      onClick={() => handleShare(title, isFallback ? undefined : col.slug)}
                      className="p-1.5 text-gray-400 hover:text-purple-600 dark:hover:text-purple-300 transition"
                      title={ar ? 'مشاركة العرض' : 'Share offer'}
                    >
                      <Share2 size={16} />
                    </button>

                    <Link
                      to={linkTarget}
                      className="flex items-center gap-1.5 text-purple-600 dark:text-purple-400 hover:underline group-hover:translate-x-1 transition-transform"
                    >
                      <span>{ar ? 'تصفح التشكيلة' : 'View Collection'}</span>
                      {ar ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ── Section: Hot Deals / Discounted Hardware ── */}
      {(activeTab === 'all' || activeTab === 'products') && (
        <section className="mb-16">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Flame className="text-orange-500" size={24} />
              <h2 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white">
                {ar ? 'أقوى أجهزة التخفيض المباشر' : 'Direct Hardware Deals'}
              </h2>
            </div>
            <span className="text-xs text-gray-500 font-medium">
              {ar ? `${filteredProducts.length} أجهزة مخفضة` : `${filteredProducts.length} deals on offer`}
            </span>
          </div>

          {filteredProducts.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredProducts.map(product => {
                const title = product.title[language] || product.title.ar;
                const path = `/${language}/shop/${product.category}/${product.slug}`;
                const isAdded = cartFeedback[product.id];
                const yerFormatted = formatPriceYer(product.yerPrice, language);
                const originalYerFormatted = formatPriceYer(product.originalYer, language);

                return (
                  <article
                    key={product.id}
                    className="group relative flex flex-col justify-between bg-white dark:bg-[#151022] border border-gray-200 dark:border-white/10 rounded-2xl overflow-hidden hover:shadow-xl hover:border-purple-500/40 transition-all duration-300"
                  >
                    {/* Media Area */}
                    <div className="relative bg-gray-50 dark:bg-black/30 p-4 border-b border-gray-100 dark:border-white/5 flex items-center justify-center min-h-[190px]">
                      {/* Discount Tag */}
                      <div className="absolute top-3 start-3 z-10 flex items-center gap-1.5">
                        <span className="inline-flex items-center gap-1 bg-gradient-to-r from-red-600 to-orange-500 text-white font-black text-xs px-2.5 py-1 rounded-full shadow-md">
                          <Percent size={11} />
                          <span>-{product.discountPct}%</span>
                        </span>
                        {product.limitedStock && (
                          <span className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30 text-[10px] font-bold px-2 py-0.5 rounded-full">
                            {ar ? 'قطع محدودة' : 'Low Stock'}
                          </span>
                        )}
                      </div>

                      {/* Stock / Demo status badge */}
                      <div className="absolute top-3 end-3 z-10">
                        <span className="text-[10px] font-bold bg-white/80 dark:bg-black/60 backdrop-blur-sm text-gray-600 dark:text-gray-300 px-2 py-0.5 rounded-full border border-gray-200 dark:border-white/10">
                          {ar ? 'درجة أولى A' : 'Grade A'}
                        </span>
                      </div>

                      <Link to={path} className="w-full flex items-center justify-center overflow-hidden">
                        <div className="transform group-hover:scale-105 transition-transform duration-300">
                          <ProductImage
                            src={product.images[0]}
                            id={product.id}
                            alt={title}
                          />
                        </div>
                      </Link>
                    </div>

                    {/* Content Body */}
                    <div className="p-5 flex-1 flex flex-col justify-between">
                      <div>
                        {/* Brand & Category */}
                        <div className="flex items-center justify-between text-xs text-gray-400 mb-1.5">
                          <span className="font-bold text-purple-600 dark:text-purple-400">{product.brand}</span>
                          <span>{product.model}</span>
                        </div>

                        {/* Product Title */}
                        <h4 className="text-base font-bold text-gray-900 dark:text-white line-clamp-1 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition mb-2">
                          <Link to={path}>{title}</Link>
                        </h4>

                        {/* Key Specs Pills */}
                        <div className="flex flex-wrap gap-1.5 mb-4">
                          {product.specsSummary.map((spec, i) => (
                            <span
                              key={i}
                              className="text-[11px] bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-300 px-2 py-0.5 rounded-md font-mono"
                            >
                              {spec}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Price & Action Strip */}
                      <div>
                        {/* Price Block */}
                        <div className="pt-3 border-t border-gray-100 dark:border-white/5 mb-3 flex items-baseline justify-between">
                          <div>
                            <div className="flex items-baseline gap-2">
                              <span className="text-xl font-black text-gray-900 dark:text-white">
                                ${product.dealPriceUsd}
                              </span>
                              <span className="text-xs text-gray-400 line-through">
                                ${product.originalPriceUsd}
                              </span>
                            </div>
                            {yerFormatted && (
                              <div className="text-[11px] text-gray-500 font-medium">
                                {yerFormatted}
                              </div>
                            )}
                          </div>

                          <div className="text-end">
                            <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                              {ar ? `وفر $${product.originalPriceUsd - product.dealPriceUsd}` : `Save $${product.originalPriceUsd - product.dealPriceUsd}`}
                            </span>
                          </div>
                        </div>

                        {/* Interactive Buttons */}
                        <div className="grid grid-cols-2 gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => handleAddToCart(product)}
                            className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold transition-all ${
                              isAdded
                                ? 'bg-emerald-600 text-white'
                                : 'bg-purple-600 hover:bg-purple-700 text-white shadow-sm'
                            }`}
                          >
                            {isAdded ? <Check size={14} /> : <ShoppingBag size={14} />}
                            <span>{isAdded ? (ar ? 'أضيف للسلة' : 'Added') : (ar ? 'أضف للسلة' : 'Add to Cart')}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleWhatsAppProduct(product)}
                            className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20 transition-all"
                            title={ar ? 'استفسار عبر واتساب' : 'Inquire via WhatsApp'}
                          >
                            <MessageCircle size={14} />
                            <span>{ar ? 'طلب واتساب' : 'WhatsApp'}</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-16 bg-gray-50 dark:bg-white/5 rounded-3xl border border-dashed border-gray-300 dark:border-white/10">
              <Search size={40} className="mx-auto text-gray-400 mb-2" />
              <p className="text-base font-bold text-gray-700 dark:text-gray-300">
                {ar ? 'لم يتم العثور على أجهزة مطابقة للبحث' : 'No matching deals found'}
              </p>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('all');
                }}
                className="mt-3 text-xs font-bold text-purple-600 dark:text-purple-400 hover:underline"
              >
                {ar ? 'إعادة ضبط الفلاتر' : 'Reset filters'}
              </button>
            </div>
          )}
        </section>
      )}

      {/* ── Section: Hardware Value Bundles (باقات التوفير الشاملة) ── */}
      {(activeTab === 'all' || activeTab === 'bundles') && bundles && bundles.length > 0 && (
        <section className="mb-16">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Layers className="text-purple-600 dark:text-purple-400" size={24} />
              <h2 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white">
                {ar ? 'باقات وحزم التوفير المتكاملة' : 'Integrated Value Bundles'}
              </h2>
            </div>
            <Link
              to={`/${language}/packages`}
              className="text-xs sm:text-sm font-bold text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-1"
            >
              <span>{ar ? 'عرض كل الباقات' : 'View all packages'}</span>
              {ar ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {bundles.slice(0, 3).map(bundle => {
              const bundleTitle = bundle.title[language] || bundle.title.ar;
              const bundleSummary = bundle.summary[language] || bundle.summary.ar;

              return (
                <div
                  key={bundle.id}
                  className="bg-white dark:bg-[#151022] border border-gray-200 dark:border-white/10 rounded-2xl p-6 hover:shadow-xl transition-all flex flex-col justify-between group"
                >
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-xs font-bold text-purple-600 dark:text-purple-400 bg-purple-500/10 px-3 py-1 rounded-full border border-purple-500/20">
                        {ar ? 'باقة عتاد متكاملة' : 'Complete Setup'}
                      </span>
                      <span className="text-xs font-black text-emerald-600 dark:text-emerald-400">
                        {ar ? 'توفير حتى 18%' : 'Save up to 18%'}
                      </span>
                    </div>

                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition">
                      {bundleTitle}
                    </h3>

                    <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 mb-4 leading-relaxed line-clamp-3">
                      {bundleSummary}
                    </p>

                    {bundle.tiers && bundle.tiers.length > 0 && (
                      <div className="space-y-2 mb-4 bg-gray-50 dark:bg-white/5 p-3 rounded-xl">
                        <span className="text-[11px] font-bold text-gray-400 block mb-1">
                          {ar ? 'المحتويات والمكونات:' : 'Package Components:'}
                        </span>
                        {bundle.tiers[0]?.items?.slice(0, 3).map((itId, idx) => {
                          const matched = allCatalogProducts.find(p => p.id === itId);
                          return (
                            <div key={idx} className="flex items-center gap-2 text-xs text-gray-700 dark:text-gray-300">
                              <CheckCircle2 size={13} className="text-purple-500 shrink-0" />
                              <span className="truncate">{matched ? matched.title[language] || matched.title.ar : itId}</span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <div className="pt-4 border-t border-gray-100 dark:border-white/5 flex items-center justify-between">
                    <span className="text-xs text-gray-500">
                      {ar ? 'تجهيز وضمان شامل' : 'Full Setup & Warranty'}
                    </span>
                    <Link
                      to={`/${language}/packages?bundle=${bundle.id}`}
                      className="inline-flex items-center gap-1 text-xs font-bold text-purple-600 dark:text-purple-400 hover:underline"
                    >
                      <span>{ar ? 'تخصيص الباقة' : 'Configure Bundle'}</span>
                      {ar ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ── Section: Buyer Guarantees & Trust Factors ── */}
      <section className="mb-16 bg-gradient-to-r from-purple-900/10 via-indigo-900/10 to-purple-900/10 border border-purple-500/20 rounded-3xl p-6 sm:p-10">
        <div className="text-center max-w-xl mx-auto mb-8">
          <h2 className="text-2xl font-black text-gray-900 dark:text-white mb-2">
            {ar ? 'لماذا تتسوق عروض الجيل العربي؟' : 'Why Shop Al-Jeel Offers?'}
          </h2>
          <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300">
            {ar
              ? 'نضمن لك عتاداً تقنياً احترافياً ومفحوصاً بعناية فائقة مع تجربة شراء آمنة وموثوقة.'
              : 'Engineered hardware inspected to military specs, fully backed by verified warranties across Yemen.'}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white/80 dark:bg-[#151022]/80 backdrop-blur-sm border border-gray-200 dark:border-white/10 rounded-2xl p-5 text-center">
            <div className="w-12 h-12 rounded-2xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center mx-auto mb-3">
              <ShieldCheck size={24} />
            </div>
            <h3 className="text-base font-bold text-gray-900 dark:text-white mb-1.5">
              {ar ? 'ضمان استبدال حقيقي' : 'Verified Warranty'}
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
              {ar ? 'ضمان تشغيل وصيانة رسمي يضمن حقك في الفحص والتجربة والاستبدال.' : 'Official warranty covering full operation, trial, and replacement.'}
            </p>
          </div>

          <div className="bg-white/80 dark:bg-[#151022]/80 backdrop-blur-sm border border-gray-200 dark:border-white/10 rounded-2xl p-5 text-center">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto mb-3">
              <Zap size={24} />
            </div>
            <h3 className="text-base font-bold text-gray-900 dark:text-white mb-1.5">
              {ar ? 'فحص بـ 28 نقطة فحص' : '28-Point Tech Audit'}
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
              {ar ? 'فحص شامل للمنافذ والبطارية والمعالج والحرارة والشاشة قبل التسليم.' : 'Rigorous audit covering ports, thermal load, battery cells, and screen.'}
            </p>
          </div>

          <div className="bg-white/80 dark:bg-[#151022]/80 backdrop-blur-sm border border-gray-200 dark:border-white/10 rounded-2xl p-5 text-center">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto mb-3">
              <Truck size={24} />
            </div>
            <h3 className="text-base font-bold text-gray-900 dark:text-white mb-1.5">
              {ar ? 'شحن سريع وآمن' : 'Express Shipping'}
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
              {ar ? 'تغليف احترافي مضاد للصدمات مع كبرى شركات النقل لكافة المدن اليمنية.' : 'Shock-proof packaging dispatched with trusted shipping carriers in Yemen.'}
            </p>
          </div>

          <div className="bg-white/80 dark:bg-[#151022]/80 backdrop-blur-sm border border-gray-200 dark:border-white/10 rounded-2xl p-5 text-center">
            <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto mb-3">
              <MessageCircle size={24} />
            </div>
            <h3 className="text-base font-bold text-gray-900 dark:text-white mb-1.5">
              {ar ? 'استشارة واختيار مجاني' : 'Expert Consultation'}
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
              {ar ? 'مهندسونا يساعدونك عبر واتساب لاختيار الجهاز الأنسب لتخصصك وميزانيتك.' : 'Our hardware engineers guide you to the exact specs for your workflow.'}
            </p>
          </div>
        </div>
      </section>

      {/* ── WhatsApp Deal Assistance CTA ── */}
      <section className="relative overflow-hidden rounded-3xl p-6 sm:p-10 bg-gradient-to-r from-emerald-950 via-teal-950 to-emerald-900 border border-emerald-500/30 text-white shadow-xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
        <div className="max-w-xl">
          <div className="inline-flex items-center gap-1.5 bg-emerald-500/20 text-emerald-300 px-3 py-1 rounded-full text-xs font-bold mb-3">
            <MessageCircle size={14} />
            <span>{ar ? 'خدمة الاستشارات والعروض الخاصة' : 'Custom Corporate & Bulk Quotes'}</span>
          </div>
          <h3 className="text-2xl font-black mb-2">
            {ar ? 'هل تحتاج عرضاً مخصصاً لشركتك أو جامعتك؟' : 'Need a custom quote for enterprise or team?'}
          </h3>
          <p className="text-emerald-100/90 text-sm leading-relaxed">
            {ar
              ? 'تواصل مع فريق مبيعاتنا مباشرة لتجهيز عروض أسعار منافسة للأجهزة المتعددة والطلبيات الخاصة مع تسهيلات في الدفع والتوصيل.'
              : 'Chat with our sales engineers for tailored quotes, bulk discounts, and flexible corporate procurement.'}
          </p>
        </div>

        <a
          href={`https://wa.me/${(site?.whatsapp || '967770000000').replace(/[^0-9]/g, '')}?text=${encodeURIComponent(
            ar ? 'مرحباً، أود الاستفسار عن عروض الأجهزة الخاصة والتخفيضات المتاحة.' : 'Hello, I would like to inquire about current promotional deals and custom quotes.'
          )}`}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-gray-950 font-black px-6 py-3.5 rounded-xl shadow-lg transition-all shrink-0 text-sm transform hover:-translate-y-0.5"
        >
          <MessageCircle size={18} />
          <span>{ar ? 'محادثة عبر واتساب' : 'Chat on WhatsApp'}</span>
        </a>
      </section>
    </main>
  );
}

