import { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  Flame,
  Timer,
  Tag,
  Percent,
  Share2,
  Check,
  ExternalLink,
  ChevronRight,
  ChevronLeft,
  ShoppingBag,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  AlertCircle,
  MessageCircle,
  Laptop,
  CheckCircle2,
} from 'lucide-react';
import { useLanguage } from '@/i18n/LanguageContext';
import { useCatalog } from '@/data/CatalogContext';
import CommerceCard from '@/components/shop/CommerceCard';
import '@/commerce.css';
import type { CatalogItem } from '@/data/commerce';

type CollectionPayload = {
  collection: {
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
    updatedAt: string;
  };
  items: Array<{
    product: {
      id: string;
      slug: string;
      title: { ar: string; en: string };
      description?: { ar: string; en: string };
      category: string;
      model?: string;
      images: Array<{ media: { id: string; originalPath: string } }>;
      specs: Record<string, unknown>;
      inspection?: unknown;
    };
    brandId: string;
    offers: Array<any>;
    fields?: Array<any>;
  }>;
  pricing: { usdToYer: string | null } | null;
};

// ── Countdown Hook ────────────────────────────────────────────────
function useCountdown(endsAt: string | null | undefined) {
  const [remaining, setRemaining] = useState<{ d: number; h: number; m: number; s: number; expired: boolean } | null>(null);

  const calc = useCallback(() => {
    if (!endsAt) return null;
    const diff = new Date(endsAt).getTime() - Date.now();
    if (diff <= 0) return { d: 0, h: 0, m: 0, s: 0, expired: true };
    const d = Math.floor(diff / 86400000);
    const h = Math.floor((diff % 86400000) / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    const s = Math.floor((diff % 60000) / 1000);
    return { d, h, m, s, expired: false };
  }, [endsAt]);

  useEffect(() => {
    if (!endsAt) { setRemaining(null); return; }
    setRemaining(calc());
    const id = setInterval(() => setRemaining(calc()), 1000);
    return () => clearInterval(id);
  }, [endsAt, calc]);

  return remaining;
}

export default function CollectionPage() {
  const { slug } = useParams<{ slug: string }>();
  const { language } = useLanguage();
  const ar = language === 'ar';
  const navigate = useNavigate();

  const [data, setData] = useState<CollectionPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    setError(null);
    fetch(`/api/shop/collections/${slug}`)
      .then(res => {
        if (!res.ok) throw new Error(res.status === 404 ? 'not_found' : 'fetch_failed');
        return res.json();
      })
      .then(json => {
        setData(json);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, [slug]);

  const countdown = useCountdown(data?.collection?.rules?.endsAt);

  const shareUrl = typeof window !== 'undefined' ? window.location.href : '';
  const collectionTitle = data ? (data.collection.title[language] || data.collection.title.ar) : '';

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: collectionTitle,
          text: data?.collection?.description[language] || data?.collection?.description?.ar,
          url: shareUrl,
        });
        return;
      } catch { /* */ }
    }
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* */ }
  };

  useEffect(() => {
    if (!data?.collection) return;
    const siteTitle = ar ? 'عروض الجيل العربي الرقمي' : 'Al-Jeel Digital Deals';
    document.title = `${collectionTitle} | ${siteTitle}`;

    const descMeta = document.querySelector('meta[name="description"]');
    if (descMeta && (data.collection.description[language] || data.collection.description.ar)) {
      descMeta.setAttribute('content', data.collection.description[language] || data.collection.description.ar);
    }
  }, [data, collectionTitle, ar, language]);

  const handleWhatsApp = () => {
    const text = `${collectionTitle}\n${data?.collection?.description[language] || ''}\n${shareUrl}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  if (loading) {
    return (
      <main id="main-content" className="min-h-screen pt-32 pb-20 px-4 max-w-7xl mx-auto flex flex-col items-center justify-center">
        <div className="w-12 h-12 border-4 border-violet-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-gray-500 font-medium">{ar ? 'جارٍ تحميل العرض الترويجي…' : 'Loading promotional offer…'}</p>
      </main>
    );
  }

  if (error || !data) {
    return (
      <main id="main-content" className="min-h-screen pt-32 pb-20 px-4 max-w-2xl mx-auto text-center">
        <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 text-red-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <AlertCircle size={32} />
        </div>
        <h1 className="text-2xl font-bold mb-2">{ar ? 'العرض غير موجود أو انتهى' : 'Offer Not Found or Expired'}</h1>
        <p className="text-gray-500 mb-6">{ar ? 'عذراً، هذا العرض الترويجي لم يعد متاحاً حالياً.' : 'Sorry, this promotional offer is no longer available.'}</p>
        <Link to={`/${language}/shop`} className="inline-flex items-center gap-2 bg-violet-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-violet-700 transition">
          {ar ? <ArrowRight size={18} /> : <ArrowLeft size={18} />}
          <span>{ar ? 'تصفح كل المنتجات' : 'Browse All Products'}</span>
        </Link>
      </main>
    );
  }

  const { collection, items, pricing } = data;
  const accent = collection.rules?.accentColor || '#7c3aed';
  const badge = collection.rules?.badge;
  const discountPct = collection.rules?.discountPct;

  return (
    <main id="main-content" className="min-h-screen pt-28 pb-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      {/* ── Breadcrumb ── */}
      <nav className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-6" aria-label="Breadcrumb">
        <Link to={`/${language}`} className="hover:text-violet-600 transition">{ar ? 'الرئيسية' : 'Home'}</Link>
        {ar ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
        <Link to={`/${language}/shop`} className="hover:text-violet-600 transition">{ar ? 'المتجر' : 'Shop'}</Link>
        {ar ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
        <span className="text-gray-900 dark:text-white font-medium truncate">{collectionTitle}</span>
      </nav>

      {/* ── Hero Promotional Banner ── */}
      <section
        className="relative overflow-hidden rounded-3xl p-6 sm:p-10 mb-12 border shadow-xl transition-all"
        style={{
          background: `linear-gradient(135deg, ${accent}15 0%, ${accent}08 50%, var(--surface, #ffffff) 100%)`,
          borderColor: `${accent}40`,
        }}
      >
        {/* Glow orb */}
        <div
          className="absolute -top-24 -right-24 w-72 h-72 rounded-full blur-3xl pointer-events-none opacity-20"
          style={{ background: accent }}
        />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8">
          {/* Title & Info */}
          <div className="max-w-2xl">
            {/* Badges strip */}
            <div className="flex items-center gap-3 flex-wrap mb-4">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-red-500 text-white shadow-sm">
                <Flame size={14} />
                <span>{ar ? 'عرض خاص' : 'Special Offer'}</span>
              </span>

              {badge && (
                <span
                  className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold border"
                  style={{ background: `${accent}20`, borderColor: `${accent}60`, color: accent }}
                >
                  <Tag size={12} />
                  <span>{badge}</span>
                </span>
              )}

              {discountPct && (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-extrabold bg-gradient-to-r from-red-600 to-orange-500 text-white shadow-md">
                  <Percent size={12} />
                  <span>{ar ? `خصم حتى ${discountPct}%` : `Up to ${discountPct}% OFF`}</span>
                </span>
              )}
            </div>

            <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-gray-900 dark:text-white mb-3">
              {collectionTitle}
            </h1>

            <p className="text-gray-600 dark:text-gray-300 text-base sm:text-lg leading-relaxed mb-6">
              {collection.description[language] || collection.description.ar}
            </p>

            {/* Action buttons */}
            <div className="flex items-center gap-3 flex-wrap">
              <button
                type="button"
                onClick={handleWhatsApp}
                className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl font-bold shadow-md transition transform active:scale-95"
              >
                <MessageCircle size={18} />
                <span>{ar ? 'مشاركة عبر واتساب' : 'Share via WhatsApp'}</span>
              </button>

              <button
                type="button"
                onClick={handleShare}
                className="inline-flex items-center gap-2 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-800 dark:text-white border border-gray-200 dark:border-gray-700 px-4 py-2.5 rounded-xl font-semibold shadow-sm transition"
              >
                {copied ? <Check size={16} className="text-green-500" /> : <Share2 size={16} />}
                <span>{copied ? (ar ? 'تم نسخ الرابط!' : 'Link Copied!') : (ar ? 'نسخ الرابط' : 'Copy Link')}</span>
              </button>
            </div>
          </div>

          {/* ── Countdown Timer Box ── */}
          {collection.rules?.endsAt && countdown && (
            <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border border-orange-500/30 rounded-2xl p-5 sm:p-6 shadow-lg lg:min-w-[300px]">
              <div className="flex items-center gap-2 text-orange-600 dark:text-orange-400 font-bold text-sm mb-4">
                <Timer size={18} className="animate-pulse" />
                <span>{countdown.expired ? (ar ? 'انتهت مدة العرض!' : 'Offer Expired!') : (ar ? 'ينتهي العرض خلال:' : 'Offer Ends In:')}</span>
              </div>

              {!countdown.expired ? (
                <div className="grid grid-cols-4 gap-2 text-center" dir="ltr">
                  {[
                    { val: countdown.d, lbl: ar ? 'يوم' : 'Days' },
                    { val: countdown.h, lbl: ar ? 'ساعة' : 'Hours' },
                    { val: countdown.m, lbl: ar ? 'دقيقة' : 'Mins' },
                    { val: countdown.s, lbl: ar ? 'ثانية' : 'Secs' },
                  ].map(({ val, lbl }) => (
                    <div key={lbl} className="bg-gray-100 dark:bg-gray-800/80 rounded-xl p-2.5 border border-gray-200 dark:border-gray-700">
                      <span className="block text-2xl sm:text-3xl font-black text-gray-900 dark:text-white font-mono">
                        {String(val).padStart(2, '0')}
                      </span>
                      <span className="text-[11px] text-gray-500 font-medium">{lbl}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-red-500 font-semibold">{ar ? 'للأسف انتهت فترة هذا العرض الترويجي.' : 'This promotion has ended.'}</p>
              )}
            </div>
          )}
        </div>
      </section>

      {/* ── Items Header ── */}
      <div className="flex items-center justify-between gap-4 mb-8">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <ShoppingBag size={22} className="text-violet-600" />
            <span>{ar ? 'المنتجات المشمولة بالعرض' : 'Featured Offer Products'}</span>
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {ar ? `يوجد ${items.length} منتج متاح في هذا العرض` : `${items.length} items available in this offer`}
          </p>
        </div>
      </div>

      {/* ── Products Grid ── */}
      {items.length > 0 ? (
        <div className="store-grid">
          {items.map((item, idx) => {
            const rawImages = item.product.images?.map(img => 
              typeof img === 'string' ? img : (img.media?.originalPath || '')
            ).filter(Boolean) || [];

            const formattedItem: CatalogItem = {
              product: {
                id: item.product.id,
                slug: item.product.slug,
                title: item.product.title,
                summary: item.product.description || (item.product as any).summary || { ar: '', en: '' },
                category: item.product.category,
                brand: (item.product as any).brand || item.brandId || '',
                model: item.product.model || '',
                images: rawImages.length ? rawImages : (item.offers?.[0]?.images || []),
                demo: (item.product as any).demo,
              },
              offers: item.offers || [],
              fields: item.fields || []
            };

            return (
              <CommerceCard key={item.product.id || idx} item={formattedItem} rate={pricing?.usdToYer} />
            );
          })}
        </div>
      ) : (
        <div className="text-center py-20 bg-gray-50 dark:bg-gray-800/30 rounded-3xl border border-dashed border-gray-300 dark:border-gray-700">
          <Laptop size={48} className="mx-auto text-gray-400 mb-3" />
          <h3 className="text-lg font-bold text-gray-700 dark:text-gray-300">{ar ? 'لا توجد منتجات معروضة حالياً' : 'No products available'}</h3>
          <p className="text-sm text-gray-500 mt-1">{ar ? 'سيتم إضافة منتجات هذا العرض قريباً.' : 'Products will be added to this offer soon.'}</p>
        </div>
      )}
    </main>
  );
}
