import { useState, useMemo, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Layers,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  Zap,
  GraduationCap,
  Briefcase,
  Gamepad2,
  Check,
  ShoppingBag,
  ArrowUpLeft,
  ArrowUpRight,
  MessageCircle,
  ExternalLink,
  ChevronRight,
  SlidersHorizontal,
  Clock,
  Truck,
  Share2,
  Copy,
  CheckCircle
} from 'lucide-react';
import { useLanguage } from '@/i18n/LanguageContext';
import { useCatalog, useExchangeRate } from '@/data/CatalogContext';
import { calculateYer, formatPriceYer } from '@/lib/currency';
import type { Product } from '@/data/types';
import ProductImage from '@/components/shop/ProductImage';
import { addCart, commerceCopy } from '@/data/commerce';
import { trackWhatsappClick } from '@/analytics';

export default function PackagesPage() {
  const { language, dir } = useLanguage();
  const ar = language === 'ar';
  const Arrow = ar ? ArrowUpLeft : ArrowUpRight;
  const { bundles, products: allProductsData, site } = useCatalog();
  const exchangeRate = useExchangeRate();
  const allProducts = allProductsData as Product[];
  const t = commerceCopy[language];
  const [searchParams] = useSearchParams();

  // Category Filter state
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  
  // Track selected tier per bundle id (bundleId -> tierIndex)
  const [selectedTiers, setSelectedTiers] = useState<Record<string, number>>({});
  
  // Cart feedback state
  const [addedBundleId, setAddedBundleId] = useState<string>('');
  const [busyBundleId, setBusyBundleId] = useState<string>('');

  // Sharing feedback states
  const [copiedBundleId, setCopiedBundleId] = useState<string>('');
  const [toastMessage, setToastMessage] = useState<string>('');

  const bundleCategoryIcons: Record<string, any> = {
    study: GraduationCap,
    work: Briefcase,
    content: Sparkles,
    gaming: Gamepad2,
    security: ShieldCheck
  };

  const categoriesList = [
    { id: 'all', label: ar ? 'جميع الباقات' : 'All Bundles', icon: Layers },
    { id: 'study', label: ar ? 'أدرس وأتعلم' : 'Study & Learn', icon: GraduationCap },
    { id: 'work', label: ar ? 'أعمل وأنجز' : 'Work & Productivity', icon: Briefcase },
    { id: 'content', label: ar ? 'أصنع محتوى' : 'Content & Studio', icon: Sparkles },
    { id: 'gaming', label: ar ? 'ألعب وأستمتع' : 'Gaming Rig', icon: Gamepad2 },
    { id: 'security', label: ar ? 'أحمي وأراقب' : 'Security & CCTV', icon: ShieldCheck },
  ];

  // Deep linking and auto-scroll when url contains ?bundle=...
  useEffect(() => {
    const bundleParam = searchParams.get('bundle');
    const tierParam = searchParams.get('tier');
    if (bundleParam) {
      const targetBundle = bundles.find((b) => b.id === bundleParam);
      if (targetBundle) {
        if (tierParam && !isNaN(Number(tierParam))) {
          setSelectedTiers((prev) => ({ ...prev, [bundleParam]: Number(tierParam) }));
        }
        setTimeout(() => {
          const el = document.getElementById(`bundle-${bundleParam}`);
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'start' });
            el.classList.add('ring-2', 'ring-purple-600', 'transition-all');
            setTimeout(() => el.classList.remove('ring-2', 'ring-purple-600'), 2500);
          }
        }, 300);
      }
    }
  }, [searchParams, bundles]);

  // Filtered bundles
  const filteredBundles = useMemo(() => {
    if (selectedCategory === 'all') return bundles;
    return bundles.filter((b) => b.id === selectedCategory);
  }, [bundles, selectedCategory]);

  const handleTierChange = (bundleId: string, tierIndex: number) => {
    setSelectedTiers((prev) => ({ ...prev, [bundleId]: tierIndex }));
  };

  const getActiveTier = (bundle: typeof bundles[0]) => {
    const index = selectedTiers[bundle.id] ?? 0;
    return bundle.tiers[index] || bundle.tiers[0];
  };

  const whatsappPhone = site?.whatsapp || '967771001044';

  const generateWhatsAppOrderUrl = (bundle: typeof bundles[0], tier: typeof bundle.tiers[0], products: Product[]) => {
    const productsList = products.map((p, i) => `${i + 1}. ${p.title[language]} (${p.brand})`).join('\n');
    const msg = ar
      ? `السلام عليكم متجر الجيل العربي الرقمي،\n` +
        `أود الاستفسار عن والطلب المباشر لباقة:\n` +
        `*${bundle.title.ar}* (${tier.name.ar})\n` +
        `--------------------\n` +
        `المكونات المشمولة في الباقة:\n` +
        `${productsList}\n` +
        `--------------------\n` +
        `يرجى إفادتي بالسعر والتوفر الحالي وخيارات التوصيل والضمان المعتمد في صنعاء والمحافظات.`
      : `Hello Al-Jeel Digital Store,\n` +
        `I would like to inquire about and request:\n` +
        `*${bundle.title.en}* (${tier.name.en})\n` +
        `--------------------\n` +
        `Included Components:\n` +
        `${productsList}\n` +
        `--------------------\n` +
        `Please confirm availability, price, and warranty details.`;

    return `https://wa.me/${whatsappPhone.replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`;
  };

  const generateShareUrl = (bundleId: string, tierIndex: number) => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    return `${origin}/${language}/bundles?bundle=${bundleId}&tier=${tierIndex}`;
  };

  const handleShareToWhatsApp = (bundle: typeof bundles[0], tier: typeof bundle.tiers[0], products: Product[], tierIndex: number) => {
    const shareUrl = generateShareUrl(bundle.id, tierIndex);
    const productsList = products.map((p) => `• ${p.title[language]}`).join('\n');
    const text = ar
      ? `*عرض وباقة عتاد مميزة من متجر الجيل العربي الرقمي:*\n` +
        `*${bundle.title.ar}* — (${tier.name.ar})\n` +
        `${tier.summary.ar}\n\n` +
        `الأجهزة المشمولة مع الفحص والضمان:\n${productsList}\n\n` +
        `تفاصيل العرض كاملة:\n${shareUrl}`
      : `*Curated Hardware Bundle from Al-Jeel Store:*\n` +
        `*${bundle.title.en}* — (${tier.name.en})\n` +
        `${tier.summary.en}\n\n` +
        `Included Inspected Hardware:\n${productsList}\n\n` +
        `View bundle details here:\n${shareUrl}`;

    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
  };

  const handleNativeShare = async (bundle: typeof bundles[0], tier: typeof bundle.tiers[0], products: Product[], tierIndex: number) => {
    const shareUrl = generateShareUrl(bundle.id, tierIndex);
    const title = `${bundle.title[language]} — ${tier.name[language]}`;
    const text = ar
      ? `شاهد هذا العرض المميز من متجر الجيل العربي: ${bundle.title.ar} (${tier.name.ar}) مع فحص 7 نقاط وضمان معتمد.`
      : `Check out this verified hardware bundle from Al-Jeel Store: ${bundle.title.en} (${tier.name.en})`;

    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ title, text, url: shareUrl });
        return;
      } catch {
        // Fallback to clipboard if dismissed or unsupported
      }
    }
    // Fallback: Copy link
    await handleCopyLink(bundle.id, tierIndex);
  };

  const handleCopyLink = async (bundleId: string, tierIndex: number) => {
    const shareUrl = generateShareUrl(bundleId, tierIndex);
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopiedBundleId(bundleId);
      setToastMessage(ar ? 'تم نسخ رابط العرض بنجاح إلى الحافظة!' : 'Bundle link copied to clipboard!');
      setTimeout(() => {
        setCopiedBundleId('');
        setToastMessage('');
      }, 3500);
    } catch {
      setToastMessage(ar ? 'تعذر نسخ الرابط' : 'Failed to copy link');
      setTimeout(() => setToastMessage(''), 2500);
    }
  };

  const handleAddBundleToCart = async (
    bundle: typeof bundles[0],
    activeTier: typeof bundle.tiers[0],
    products: Product[]
  ) => {
    setBusyBundleId(bundle.id);
    try {
      await addCart(
        {
          packageId: bundle.id,
          quantity: 1
        },
        {
          title: {
            ar: `${bundle.title.ar} (${activeTier.name.ar})`,
            en: `${bundle.title.en} (${activeTier.name.en})`
          },
          priceUsd: activeTier.price.usd ? String(activeTier.price.usd) : null,
          images: products.map((p) => p.images[0]).filter(Boolean),
          tierName: activeTier.name,
          itemTitles: products.map((p) => p.title)
        }
      );
      setAddedBundleId(bundle.id);
      setTimeout(() => setAddedBundleId(''), 5000);
    } catch (e) {
      setAddedBundleId(bundle.id);
      setTimeout(() => setAddedBundleId(''), 5000);
    } finally {
      setBusyBundleId('');
    }
  };

  return (
    <main id="main-content" className="min-h-screen pt-24 pb-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto" dir={dir}>
      {/* Toast Notification Banner */}
      {toastMessage && (
        <div
          role="status"
          className="fixed bottom-6 start-1/2 -translate-x-1/2 z-50 px-6 py-3.5 rounded-2xl bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 shadow-2xl flex items-center gap-3 text-sm font-bold animate-bounce"
        >
          <CheckCircle className="w-5 h-5 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Breadcrumbs Navigation */}
      <nav aria-label="Breadcrumb" className="mb-5 flex items-center gap-2.5 text-sm font-medium text-neutral-500">
        <Link to={`/${language}`} className="hover:text-purple-600 transition-colors">
          {ar ? 'الرئيسية' : 'Home'}
        </Link>
        <ChevronRight className="w-4 h-4 rtl:rotate-180 text-neutral-400" />
        <span className="text-neutral-900 dark:text-neutral-100 font-bold">
          {ar ? 'العروض والباقات المتكاملة' : 'Hardware Bundles & Setups'}
        </span>
      </nav>

      {/* Hero Header Section */}
      <header className="mb-10 text-center sm:text-start relative overflow-hidden rounded-3xl bg-gradient-to-br from-purple-900 via-indigo-950 to-neutral-950 text-white p-6 sm:p-10 shadow-2xl shadow-purple-950/20">
        <div className="absolute -end-16 -top-16 w-80 h-80 rounded-full bg-purple-500/10 blur-3xl pointer-events-none" />
        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 backdrop-blur-md text-xs sm:text-sm font-bold text-purple-200 mb-4 border border-white/10">
            <Sparkles className="w-4 h-4 text-yellow-300" />
            <span>{ar ? 'تجهيزات بيئات العمل والعتاد المعتمد' : 'Engineered Ecosystems & Bundles'}</span>
          </div>

          <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black tracking-tight text-white mb-3">
            {ar ? 'باقات وتجهيزات العتاد المتكاملة' : 'Curated Hardware Setups & Bundles'}
          </h1>

          <p className="text-sm sm:text-base text-purple-200/95 leading-relaxed max-w-2xl mb-6">
            {ar
              ? 'توليفات هندسية مدروسة تجمع بين الحواسيب النخبوية، شاشات العرض الاحترافية، وحدات الطاقة، والشبكات لضمان أقصى إنتاجية بدون انقطاع وبأفضل قيمة توفير.'
              : 'Pre-tested hardware configurations combining enterprise laptops, calibrated displays, uninterruptible power units, and Wi-Fi 6 mesh networking.'}
          </p>

          {/* Quick Pillars */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-white/10 text-xs sm:text-sm font-bold text-purple-100">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span>{ar ? 'فحص شامل 7 نقاط' : '7-Point Certified'}</span>
            </div>
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-400 flex-shrink-0" />
              <span>{ar ? 'توافق عتادي 100%' : '100% Compatible'}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-sky-400 flex-shrink-0" />
              <span>{ar ? 'حماية من انقطاع الكهرباء' : 'Power Outage Protection'}</span>
            </div>
            <div className="flex items-center gap-2">
              <Truck className="w-4 h-4 text-purple-300 flex-shrink-0" />
              <span>{ar ? 'توصيل وتجهيز فوري' : 'Direct Sana\'a Delivery'}</span>
            </div>
          </div>
        </div>
      </header>

      {/* Filter Category Tabs */}
      <section className="mb-10">
        <div className="flex items-center gap-2.5 overflow-x-auto pb-2 scrollbar-none" role="tablist">
          {categoriesList.map((cat) => {
            const Icon = cat.icon;
            const isActive = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                role="tab"
                aria-selected={isActive}
                onClick={() => setSelectedCategory(cat.id)}
                className={`flex items-center gap-2 px-4 py-3 rounded-2xl text-sm font-bold transition-all whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'bg-purple-600 text-white shadow-md shadow-purple-600/25 scale-[1.02]'
                    : 'bg-neutral-100 dark:bg-neutral-900 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-800'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-purple-600'}`} />
                <span>{cat.label}</span>
                {cat.id !== 'all' && (
                  <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                    isActive ? 'bg-white/20 text-white' : 'bg-neutral-200 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300'
                  }`}>
                    {bundles.find((b) => b.id === cat.id)?.tiers.length ?? 1}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </section>

      {/* Bundles Display Grid */}
      <section className="space-y-12">
        {filteredBundles.map((bundle) => {
          const activeTier = getActiveTier(bundle);
          const currentTierIndex = selectedTiers[bundle.id] ?? 0;
          
          // Map tier item IDs to full Product models
          const tierProducts = (activeTier?.items ?? [])
            .map((id) => allProducts.find((p) => p.id === id))
            .filter((p): p is Product => Boolean(p));

          const CategoryIcon = bundleCategoryIcons[bundle.id] || Layers;
          const whatsappUrl = generateWhatsAppOrderUrl(bundle, activeTier, tierProducts);
          const isAdded = addedBundleId === bundle.id;
          const isBusy = busyBundleId === bundle.id;
          const isCopied = copiedBundleId === bundle.id;

          return (
            <article
              key={bundle.id}
              id={`bundle-${bundle.id}`}
              className="rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800/80 overflow-hidden shadow-lg shadow-neutral-900/5 hover:border-purple-600/40 transition-all scroll-mt-28"
            >
              {/* Bundle Header & Controls */}
              <div className="p-6 sm:p-8 bg-neutral-50/70 dark:bg-neutral-800/30 border-b border-neutral-200/80 dark:border-neutral-800">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                  <div>
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <span className="px-3.5 py-1 rounded-full text-xs font-bold bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200/50 dark:border-purple-800/40 flex items-center gap-1.5">
                        <CategoryIcon className="w-4 h-4 text-purple-600" />
                        <span>{bundle.title[language]}</span>
                      </span>

                      <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border border-emerald-200/50 dark:border-emerald-800/40 flex items-center gap-1.5">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                        <span>{ar ? 'مفحوص هندسياً' : 'Verified Hardware'}</span>
                      </span>

                      {/* Share Quick Pill Button */}
                      <button
                        type="button"
                        onClick={() => handleNativeShare(bundle, activeTier, tierProducts, currentTierIndex)}
                        className="ms-auto lg:ms-2 inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-bold bg-neutral-200/80 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-purple-600 hover:text-white transition-colors cursor-pointer"
                        title={ar ? 'مشاركة العرض مع الأصدقاء' : 'Share deal with friends'}
                      >
                        <Share2 className="w-3.5 h-3.5" />
                        <span>{ar ? 'مشاركة العرض' : 'Share'}</span>
                      </button>
                    </div>

                    <h2 className="text-2xl sm:text-3xl font-black text-neutral-900 dark:text-neutral-50 tracking-tight">
                      {bundle.title[language]} — {activeTier.name[language]}
                    </h2>

                    <p className="text-sm sm:text-base text-neutral-600 dark:text-neutral-300 mt-2 max-w-2xl leading-relaxed">
                      {activeTier.summary[language] || bundle.summary[language]}
                    </p>
                  </div>

                  {/* Tier Switcher (If multiple tiers) */}
                  {bundle.tiers.length > 1 && (
                    <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-neutral-200/70 dark:bg-neutral-800 border border-neutral-300/50 dark:border-neutral-700/50 flex-shrink-0">
                      {bundle.tiers.map((tier, idx) => {
                        const isTierActive = currentTierIndex === idx;
                        return (
                          <button
                            key={tier.id}
                            onClick={() => handleTierChange(bundle.id, idx)}
                            className={`px-4 py-2.5 rounded-xl text-sm font-bold transition-all cursor-pointer ${
                              isTierActive
                                ? 'bg-white dark:bg-neutral-900 text-purple-600 dark:text-purple-400 shadow-sm'
                                : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
                            }`}
                          >
                            {tier.name[language]}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Problem Solved & Value Box */}
                <div className="mt-6 p-4 sm:p-5 rounded-2xl bg-amber-500/10 dark:bg-amber-500/5 border border-amber-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-sm sm:text-base">
                  <div className="flex items-start gap-3">
                    <Zap className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-amber-950 dark:text-amber-300 font-bold block mb-1">
                        {ar ? 'المشكلة التي تعالجها هذه المنظومة:' : 'Problem Solved:'}
                      </strong>
                      <span className="text-amber-900/90 dark:text-amber-200/80 leading-relaxed font-medium">
                        {bundle.problemSolved[language]}
                      </span>
                    </div>
                  </div>

                  <span className="text-xs sm:text-sm text-amber-800 dark:text-amber-400/80 italic flex-shrink-0 font-medium">
                    {bundle.why[language]}
                  </span>
                </div>
              </div>

              {/* Devices Grid Inside The Bundle */}
              <div className="p-6 sm:p-8">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm font-bold text-neutral-500 uppercase tracking-wider flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-purple-600" />
                    <span>{ar ? 'الأجهزة والقطع المشمولة في الباقة:' : 'Hardware Components Included:'}</span>
                  </span>
                  <span className="text-sm font-bold text-neutral-500">
                    {tierProducts.length} {ar ? 'مكونات متوافقة' : 'Verified Items'}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {tierProducts.map((product, idx) => (
                    <div
                      key={product.id}
                      className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200/70 dark:border-neutral-800 hover:border-purple-600/40 transition-all flex flex-col justify-between group"
                    >
                      <div>
                        {/* Device Image & Index */}
                        <div className="relative aspect-[4/3] rounded-xl overflow-hidden bg-white dark:bg-neutral-900 mb-3 border border-neutral-200/50 dark:border-neutral-800 p-2 flex items-center justify-center">
                          <ProductImage
                            src={product.images[0]}
                            id={product.id}
                            alt={product.title[language]}
                          />
                          <span className="absolute top-2 start-2 text-xs font-black px-2.5 py-1 rounded-md bg-neutral-900/85 text-white backdrop-blur-sm">
                            0{idx + 1}
                          </span>
                          <span className="absolute bottom-2 end-2 text-xs font-bold px-2.5 py-1 rounded-md bg-purple-600/90 text-white backdrop-blur-sm">
                            {product.brand}
                          </span>
                        </div>

                        {/* Title & Category */}
                        <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100 group-hover:text-purple-600 transition-colors line-clamp-1 mb-2">
                          <Link to={`/${language}/shop/${product.category}/${product.slug}`} className="hover:underline">
                            {product.title[language]}
                          </Link>
                        </h3>

                        {/* Key Specs Pills */}
                        <div className="flex flex-wrap gap-1.5 mb-3 text-xs sm:text-sm text-neutral-700 dark:text-neutral-300">
                          {product.specs.cpu ? (
                            <span className="px-2.5 py-1 rounded-md bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-700/80 font-medium">
                              {String(product.specs.cpu)}
                            </span>
                          ) : null}
                          {product.specs.ramGB ? (
                            <span className="px-2.5 py-1 rounded-md bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-700/80 font-medium">
                              {String(product.specs.ramGB)}GB RAM
                            </span>
                          ) : null}
                          {product.specs.storageGB ? (
                            <span className="px-2.5 py-1 rounded-md bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-700/80 font-medium">
                              {String(product.specs.storageGB)}GB SSD
                            </span>
                          ) : null}
                          {product.specs.capacityGB ? (
                            <span className="px-2.5 py-1 rounded-md bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-700/80 font-medium">
                              {String(product.specs.capacityGB)}GB NVMe
                            </span>
                          ) : null}
                          {product.specs.powerW ? (
                            <span className="px-2.5 py-1 rounded-md bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-700/80 font-medium">
                              {String(product.specs.powerW)}W UPS
                            </span>
                          ) : null}
                          {product.specs.panel ? (
                            <span className="px-2.5 py-1 rounded-md bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-700/80 font-medium">
                              {String(product.specs.panel)} Panel
                            </span>
                          ) : null}
                        </div>
                      </div>

                      {/* Device Action Link */}
                      <div className="pt-2.5 border-t border-neutral-200/70 dark:border-neutral-700/70 flex items-center justify-between text-xs sm:text-sm">
                        <span className="text-xs sm:text-sm text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1.5">
                          <Check className="w-3.5 h-3.5" />
                          <span>{ar ? 'مشمول بالضمان' : 'Warranty Covered'}</span>
                        </span>

                        <Link
                          to={`/${language}/shop/${product.category}/${product.slug}`}
                          className="font-bold text-purple-600 dark:text-purple-400 hover:text-purple-700 flex items-center gap-1 text-xs sm:text-sm"
                        >
                          <span>{ar ? 'المواصفات' : 'Inspect'}</span>
                          <Arrow className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Bundle Footer Actions & Pricing */}
                <div className="mt-8 pt-6 border-t border-neutral-200/80 dark:border-neutral-800 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className="text-sm font-medium text-neutral-600 dark:text-neutral-400">
                        {ar ? 'سعر المنظومة كاملة:' : 'Complete Bundle Price:'}
                      </span>
                      <strong className="text-2xl sm:text-3xl font-black text-purple-600 dark:text-purple-400" dir="ltr">
                        {activeTier.price.usd ? `$${activeTier.price.usd}` : (ar ? 'تسعير مخصص عند الاعتماد' : 'Custom Quoted Setup')}
                      </strong>
                      {(() => {
                        const yer = calculateYer(activeTier.price.usd, exchangeRate, activeTier.price.yer);
                        const yerFormatted = formatPriceYer(yer, language);
                        return yerFormatted ? (
                          <span className="text-sm font-semibold text-neutral-500 dark:text-neutral-400" dir="ltr">
                            {yerFormatted}
                          </span>
                        ) : null;
                      })()}
                    </div>
                    <span className="text-xs sm:text-sm text-emerald-600 dark:text-emerald-400 font-bold block mt-1">
                      {ar ? '✓ يشمل الضمان المكتوب والفحص الفني الشامل' : '✓ Certified 7-Point Quality Guarantee'}
                    </span>
                  </div>

                  <div className="flex items-center flex-wrap gap-3 w-full sm:w-auto">
                    {/* Share with Friends Options */}
                    <div className="flex items-center gap-1.5">
                      {/* WhatsApp Share to Friends */}
                      <button
                        type="button"
                        onClick={() => handleShareToWhatsApp(bundle, activeTier, tierProducts, currentTierIndex)}
                        className="p-3.5 rounded-2xl bg-neutral-100 hover:bg-emerald-50 hover:text-emerald-600 dark:bg-neutral-800 dark:hover:bg-emerald-950/40 text-neutral-700 dark:text-neutral-300 transition-colors cursor-pointer"
                        title={ar ? 'مشاركة هذا العرض مع الأصدقاء عبر واتساب' : 'Share this deal with friends via WhatsApp'}
                      >
                        <Share2 className="w-4 h-4" />
                      </button>

                      {/* Copy Link to Clipboard */}
                      <button
                        type="button"
                        onClick={() => handleCopyLink(bundle.id, currentTierIndex)}
                        className="p-3.5 rounded-2xl bg-neutral-100 hover:bg-purple-50 hover:text-purple-600 dark:bg-neutral-800 dark:hover:bg-purple-950/40 text-neutral-700 dark:text-neutral-300 transition-colors cursor-pointer"
                        title={ar ? 'نسخ رابط العرض المباشر' : 'Copy bundle link'}
                      >
                        {isCopied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>

                    {/* Direct WhatsApp Order CTA */}
                    <a
                      href={whatsappUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => trackWhatsappClick()}
                      className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-sm sm:text-base font-bold transition-all shadow-md shadow-emerald-600/20 cursor-pointer"
                    >
                      <MessageCircle className="w-4 h-4" />
                      <span>{ar ? 'طلب الباقة عبر واتساب' : 'Order via WhatsApp'}</span>
                    </a>

                    {/* Add to Cart CTA */}
                    <button
                      disabled={isBusy}
                      onClick={() => handleAddBundleToCart(bundle, activeTier, tierProducts)}
                      className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-purple-600 hover:bg-purple-700 active:scale-95 text-white text-sm sm:text-base font-bold transition-all shadow-md shadow-purple-600/20 disabled:opacity-50 cursor-pointer"
                    >
                      {isAdded ? (
                        <>
                          <Check className="w-4 h-4" />
                          <span>{t.added}</span>
                        </>
                      ) : (
                        <>
                          <ShoppingBag className="w-4 h-4" />
                          <span>{ar ? 'أضف للسلة' : 'Add to Cart'}</span>
                        </>
                      )}
                    </button>

                    {/* Quick Direct Link to Cart after adding */}
                    {isAdded && (
                      <Link
                        to={`/${language}/cart`}
                        className="inline-flex items-center gap-2 px-5 py-3.5 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white text-sm font-black shadow-md shadow-amber-500/25 animate-pulse"
                      >
                        <span>{ar ? 'عرض السلة وإكمال الطلب' : 'View Cart & Checkout'}</span>
                        <Arrow className="w-4 h-4" />
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            </article>
          );
        })}
      </section>

      {/* Custom Tailored Setup Consultation Banner */}
      <section className="mt-16 rounded-3xl bg-gradient-to-r from-purple-900 via-indigo-900 to-purple-950 text-white p-8 sm:p-10 shadow-2xl shadow-purple-950/20 flex flex-col md:flex-row items-center justify-between gap-8">
        <div className="space-y-3 text-center md:text-start max-w-xl">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 text-xs sm:text-sm font-bold text-yellow-300">
            <Sparkles className="w-4 h-4" />
            <span>{ar ? 'تجهيز بيئة عمل حسب ميزانيتك' : 'Custom Architecture Builder'}</span>
          </div>

          <h3 className="text-2xl sm:text-3xl lg:text-4xl font-black">
            {ar ? 'هل تحتاج باقة بمواصفات خاصة أو لشركتك؟' : 'Need a Customized Hardware Package?'}
          </h3>

          <p className="text-sm sm:text-base text-purple-200/95 leading-relaxed">
            {ar
              ? 'فريق المهندسين في معرض الجيل العربي بصنعاء يرتب معك القطع والأجهزة المتوافقة، مع تخصيص الذاكرة والتخزين وحماية الطاقة بحسب برامجك وميزانيتك المحددة.'
              : 'Our hardware engineers in Sana\'a will configure the exact components, RAM, storage, and power surge protection to match your software requirements.'}
          </p>
        </div>

        <a
          href={`https://wa.me/${whatsappPhone.replace(/\D/g, '')}?text=${encodeURIComponent(
            ar
              ? 'السلام عليكم، أود استشارة المهندس المختص لتجهيز باقة عتاد مخصصة لبيئة عملي.'
              : 'Hello, I would like to consult your hardware engineers for a custom setup.'
          )}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2.5 px-8 py-4 rounded-2xl bg-white text-purple-950 hover:bg-purple-50 active:scale-95 text-sm sm:text-base font-black transition-all shadow-xl flex-shrink-0 cursor-pointer"
        >
          <MessageCircle className="w-5 h-5 text-emerald-600" />
          <span>{ar ? 'استشارة مجانية مع مهندس المبيعات' : 'Talk to Hardware Engineer'}</span>
        </a>
      </section>

      {/* Hardware Guarantee & Trust FAQ */}
      <section className="mt-16 border-t border-neutral-200/70 dark:border-neutral-800/70 pt-12">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <h3 className="text-2xl sm:text-3xl font-black text-neutral-900 dark:text-neutral-100">
            {ar ? 'معايير الجودة والضمان في باقات الجيل العربي' : 'Quality & Guarantee Standards'}
          </h3>
          <p className="text-sm sm:text-base text-neutral-600 dark:text-neutral-400 mt-2 font-medium">
            {ar ? 'كل جهاز وكل باقة تخضع لبروتوكول فحص واختبار هندسي دقيق' : 'Every bundled system passes rigorous compatibility and load testing'}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm sm:text-base">
          <div className="p-6 rounded-2xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800">
            <ShieldCheck className="w-7 h-7 text-purple-600 mb-3" />
            <h4 className="font-bold text-neutral-900 dark:text-neutral-100 text-base sm:text-lg mb-2">
              {ar ? 'فحص التوافقية العتادية 100%' : '100% Hardware Compatibility'}
            </h4>
            <p className="text-neutral-600 dark:text-neutral-400 leading-relaxed text-sm sm:text-base">
              {ar
                ? 'نتحقق من توافق منافذ العرض (Type-C DisplayPort, HDMI)، وقدرة شاحن PD بالواط، واستقرار فولتية الـ UPS مع استهلاك المعالج.'
                : 'We certify display bandwidth, USB-C PD wattage delivery, and UPS load capacity for seamless synergy.'}
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800">
            <Zap className="w-7 h-7 text-amber-500 mb-3" />
            <h4 className="font-bold text-neutral-900 dark:text-neutral-100 text-base sm:text-lg mb-2">
              {ar ? 'حماية من انقطاع وتذبذب الكهرباء' : 'Power Outage Protection'}
            </h4>
            <p className="text-neutral-600 dark:text-neutral-400 leading-relaxed text-sm sm:text-base">
              {ar
                ? 'تضم باقاتنا وحدات طاقة APC UPS أصلية لضمان عمل الراوتر، الشاشات، وأجهزة التسجيل ومحطات العمل وحمايتها من الصدمات الكهربائية.'
                : 'Our configurations integrate genuine APC UPS units to safeguard routers, workstation data, and drives.'}
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800">
            <CheckCircle2 className="w-7 h-7 text-emerald-500 mb-3" />
            <h4 className="font-bold text-neutral-900 dark:text-neutral-100 text-base sm:text-lg mb-2">
              {ar ? 'ضمان استبدال وفحص مكتوب' : 'Certified Replacement Warranty'}
            </h4>
            <p className="text-neutral-600 dark:text-neutral-400 leading-relaxed text-sm sm:text-base">
              {ar
                ? 'جميع الأجهزة مشمولة بتقرير فحص معتمد وضمان رسمي من معرض الجيل العربي بصنعاء، مع دعم فني مستمر بعد البيع.'
                : 'All devices include formal inspection certificates and direct local store warranty in Sana\'a.'}
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
