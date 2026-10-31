import { useEffect, useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ShoppingBag,
  Trash2,
  Plus,
  Minus,
  ArrowRight,
  ArrowLeft,
  Store,
  Truck,
  CheckCircle2,
  AlertCircle,
  User,
  Info,
  MessageCircle,
  Package,
  Tag,
  Sparkles,
  X,
  Check,
} from 'lucide-react';
import { useLanguage } from '@/i18n/LanguageContext';
import { useCatalog, useExchangeRate } from '@/data/CatalogContext';
import { calculateYer, formatPriceYer } from '@/lib/currency';
import { trackWhatsappClick } from '@/analytics';
import {
  shopApi,
  getLocalCartPreview,
  removeCartItem,
  updateCartQuantity,
  clearCart,
  commerceCopy,
  errorText,
  type Preview,
  type Customer,
  type Order
} from '@/data/commerce';
import '@/commerce.css';

export default function CartPage() {
  const { language, dir } = useLanguage();
  const ar = language === 'ar';
  const t = commerceCopy[language];
  const navigate = useNavigate();
  const { site } = useCatalog();
  const exchangeRate = useExchangeRate();

  const [cart, setCart] = useState<Preview | null>(null);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [currency, setCurrency] = useState<'USD' | 'YER'>('USD');
  const [method, setMethod] = useState<'pickup' | 'delivery'>('pickup');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const idempotencyKey = useRef(crypto.randomUUID());

  // Coupon state
  const [couponInput, setCouponInput] = useState('');
  const [couponLoading, setCouponLoading] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState<{
    code: string;
    label: string;
    discountType?: string;
    discountValue?: number;
    discountUsd?: number;
    discountYer?: string | null;
    totalUsd?: string;
    totalYer?: string | null;
    freeShipping?: boolean;
    savingsText?: string;
  } | null>(null);
  const [couponMsg, setCouponMsg] = useState<{ text: string; isError: boolean } | null>(null);
  const [publicPromos, setPublicPromos] = useState<
    { code: string; title: { ar: string; en: string }; discountType: string; discountValue: number }[]
  >([]);

  const loadCart = async () => {
    try {
      const res = await shopApi<Preview>('/cart');
      setCart(res);
      setError('');
    } catch {
      const local = getLocalCartPreview();
      setCart(local);
    }
  };

  useEffect(() => {
    void loadCart();
    void shopApi<{ customer: Customer | null }>('/account')
      .then((r) => setCustomer(r.customer))
      .catch(() => {});
    void shopApi<{ items: any[] }>('/coupons/public')
      .then((res) => {
        if (Array.isArray(res.items)) setPublicPromos(res.items);
      })
      .catch(() => {});
  }, [language]);

  const handleRemove = async (index: number) => {
    setBusy(true);
    setError('');
    try {
      await removeCartItem(index);
      await loadCart();
    } catch (e) {
      setError(errorText(e instanceof Error ? e.message : '', language));
    } finally {
      setBusy(false);
    }
  };

  const handleQuantity = async (index: number, newQty: number) => {
    if (!cart || !Number.isInteger(newQty) || newQty < 1) return;
    setBusy(true);
    setError('');
    try {
      await updateCartQuantity(index, newQty);
      await loadCart();
    } catch (e) {
      setError(errorText(e instanceof Error ? e.message : '', language));
    } finally {
      setBusy(false);
    }
  };

  const handleClearCart = () => {
    if (window.confirm(ar ? 'هل ترغب في إفراغ كافة محتويات السلة؟' : 'Are you sure you want to clear your cart?')) {
      clearCart();
      void loadCart();
    }
  };

  const handleApplyCoupon = async (e?: React.FormEvent, overrideCode?: string) => {
    if (e) e.preventDefault();
    const code = (overrideCode || couponInput).trim().toUpperCase();
    if (!code) return;
    setCouponLoading(true);
    setCouponMsg(null);
    try {
      const res = await shopApi<any>('/coupon/validate', 'POST', { code });
      if (res && res.valid) {
        const title = res.coupon.title[language] || res.coupon.title.ar || res.coupon.title.en;
        const discountVal = parseFloat(res.discountUsd) || 0;
        setAppliedCoupon({
          code: res.coupon.code,
          label: title,
          discountType: res.coupon.discountType,
          discountValue: res.coupon.discountValue,
          discountUsd: discountVal,
          discountYer: res.discountYer,
          totalUsd: res.totalUsd,
          totalYer: res.totalYer,
          freeShipping: res.coupon.freeShipping,
          savingsText: res.savingsText[language] || res.savingsText.ar,
        });
        setCouponMsg({
          text: ar ? `تم تفعيل الكوبون بنجاح: ${res.savingsText.ar}` : `Coupon applied: ${res.savingsText.en}`,
          isError: false,
        });
        setCouponInput(res.coupon.code);
        try {
          const updated = await shopApi<Preview>(`/cart?coupon=${encodeURIComponent(code)}`);
          setCart(updated);
        } catch {}
      } else {
        const errText =
          res?.message?.[language] ||
          res?.message?.ar ||
          (ar ? 'كود الخصم غير صحيح أو لا تنطبق شروطه' : 'Invalid promo code');
        setCouponMsg({
          text: errText,
          isError: true,
        });
      }
    } catch {
      setCouponMsg({
        text: ar ? 'تعذر التحقق من كود الخصم حالياً' : 'Could not validate coupon at this time',
        isError: true,
      });
    } finally {
      setCouponLoading(false);
    }
  };

  const handleRemoveCoupon = async () => {
    setAppliedCoupon(null);
    setCouponInput('');
    setCouponMsg(null);
    await loadCart();
  };

  // Pricing & Discounts
  const subtotalUsdNum = cart?.subtotalUsd ? parseFloat(cart.subtotalUsd) : 0;
  const discountUsd = appliedCoupon?.discountUsd !== undefined ? appliedCoupon.discountUsd : 0;
  const finalTotalUsd = Math.max(0, subtotalUsdNum - discountUsd);
  const finalTotalUsdStr = subtotalUsdNum > 0 ? finalTotalUsd.toFixed(2) : (cart?.subtotalUsd || '0.00');

  const activeExchangeRate = cart?.usdToYer ? parseFloat(cart.usdToYer) : exchangeRate;
  const subtotalYerCalc = subtotalUsdNum > 0 ? calculateYer(subtotalUsdNum, activeExchangeRate) : null;
  const finalTotalYerCalc = appliedCoupon?.totalYer ? Math.round(Number(appliedCoupon.totalYer)) : (finalTotalUsd > 0 ? calculateYer(finalTotalUsd, activeExchangeRate) : null);

  const whatsappPhone = site?.whatsapp || '967771001044';

  const handleWhatsAppCheckout = () => {
    if (!cart || cart.items.length === 0) return;
    const itemsText = cart.items
      .map((item, idx) => {
        const title = item.title[language] || item.title.ar || item.title.en;
        const price = item.linePriceUsd ? `$${item.linePriceUsd}` : (ar ? 'يُؤكد بالتواصل' : 'Price upon confirmation');
        return `${idx + 1}. ${title} × ${item.quantity} (${price})`;
      })
      .join('\n');

    const fulfillmentText = method === 'delivery'
      ? `${ar ? 'توصيل إلى' : 'Delivery to'}: ${address.trim() || (ar ? 'العنوان سيُحدد بالتفصيل' : 'Address TBD')}${appliedCoupon?.freeShipping ? (ar ? ' (شحن مجاني بكوبون)' : ' (Free delivery coupon)') : ''}`
      : (ar ? 'استلام من المعرض (صنعاء - شارع صخر)' : 'Store Pickup (Sana\'a - Sakhr St)');

    const couponSection = appliedCoupon
      ? `\n*كوبون الخصم:* ${appliedCoupon.code} (${appliedCoupon.label})\n` +
        (discountUsd > 0 ? `*قيمة الخصم:* -$${discountUsd.toFixed(2)}\n` : '') +
        `*المجموع النهائي بعد الخصم:* $${finalTotalUsdStr}\n`
      : `\n*المجموع التقديري:* $${cart.subtotalUsd}\n`;

    const msg = ar
      ? `السلام عليكم متجر الجيل العربي الرقمي،\n` +
        `أود اعتماد وإرسال طلب المشتريات التالي:\n` +
        `--------------------\n` +
        `*محتويات السلة:*\n` +
        `${itemsText}\n` +
        `--------------------\n` +
        `${couponSection}` +
        `*طريقة الاستلام:* ${fulfillmentText}\n` +
        (notes.trim() ? `*ملاحظات:* ${notes.trim()}\n` : '') +
        `--------------------\n` +
        `يرجى تأكيد توفر الأصناف وترتيب الاستلام أو التوصيل والضمان المعتمد.`
      : `Hello Al-Jeel Digital Store,\n` +
        `I would like to place the following cart order:\n` +
        `--------------------\n` +
        `*Cart Items:*\n` +
        `${itemsText}\n` +
        `--------------------\n` +
        `${couponSection}` +
        `*Fulfillment:* ${fulfillmentText}\n` +
        (notes.trim() ? `*Notes:* ${notes.trim()}\n` : '') +
        `--------------------\n` +
        `Please confirm availability, warranty, and delivery.`;

    const url = `https://wa.me/${whatsappPhone.replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`;
    trackWhatsappClick();
    window.open(url, '_blank');
  };

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customer) {
      navigate(`/${language}/account?return=cart`);
      return;
    }
    if (!cart?.previewToken) return;

    setBusy(true);
    setError('');
    try {
      const combinedNotes = [
        notes.trim(),
        appliedCoupon ? `[كوبون: ${appliedCoupon.code} - ${appliedCoupon.label}]` : null
      ].filter(Boolean).join(' | ');

      const order = await shopApi<Order>('/orders', 'POST', {
        previewToken: cart.previewToken,
        idempotencyKey: idempotencyKey.current,
        currency,
        fulfillment: { method, address, notes: combinedNotes },
        couponCode: appliedCoupon ? appliedCoupon.code : undefined,
      });
      window.dispatchEvent(new Event('store-cart-changed'));
      navigate(`/${language}/orders/${order.id}`);
    } catch (e) {
      const code = e instanceof Error ? e.message : '';
      setError(errorText(code, language));
      if (code === 'prices_changed' || code === 'insufficient_stock') {
        await loadCart();
      }
    } finally {
      setBusy(false);
    }
  };

  const isCartEmpty = !cart || cart.rawLines.length === 0;

  return (
    <main id="main-content" className="min-h-screen pt-24 pb-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto" dir={dir}>
      {/* Top Header and Breadcrumbs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 sm:mb-8">
        <div>
          <nav aria-label="Breadcrumb" className="mb-2 flex items-center gap-2 text-xs text-neutral-500">
            <Link to={`/${language}`} className="hover:text-purple-600 transition-colors">
              {language === 'ar' ? 'الرئيسية' : 'Home'}
            </Link>
            <span>/</span>
            <span className="text-neutral-900 dark:text-neutral-100 font-semibold">{t.cart}</span>
          </nav>
          <h1 className="flex items-center gap-2 text-2xl sm:text-3xl font-extrabold text-neutral-900 dark:text-neutral-50">
            {t.cart}
            {cart && !isCartEmpty && <span className="text-xs sm:text-sm font-bold text-neutral-500 bg-neutral-100 dark:bg-neutral-800 rounded-full px-2.5 py-1">{cart.rawLines.length}</span>}
          </h1>
        </div>

        <div className="flex items-center gap-3">
          {!(cart && isCartEmpty) && (
            <Link
              to={`/${language}/shop`}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-neutral-700 dark:text-neutral-200 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 transition-colors"
            >
              {language === 'ar' ? <ArrowRight className="w-3.5 h-3.5" /> : <ArrowLeft className="w-3.5 h-3.5" />}
              <span>{t.continue}</span>
            </Link>
          )}

        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div role="alert" className="p-4 mb-6 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs sm:text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
          <button
            onClick={() => void loadCart()}
            className="text-xs underline font-bold"
          >
            {t.retry}
          </button>
        </div>
      )}

      {/* Loading state */}
      {!cart && (
        <div className="py-24 flex flex-col items-center justify-center gap-4 text-neutral-500">
          <div className="w-10 h-10 border-4 border-purple-600/30 border-t-purple-600 rounded-full animate-spin" />
          <p className="text-sm font-medium">{t.loading}</p>
        </div>
      )}

      {/* Empty Cart State */}
      {cart && isCartEmpty && (
        <div className="text-center py-10 sm:py-14 px-5 sm:px-8 rounded-3xl bg-gradient-to-br from-white via-purple-50/50 to-white dark:from-neutral-950 dark:via-purple-950/20 dark:to-neutral-950 border border-neutral-200 dark:border-neutral-800 max-w-2xl mx-auto shadow-sm">
          <div className="w-14 h-14 rounded-2xl bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center mx-auto mb-4">
            <ShoppingBag className="w-7 h-7" />
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-neutral-900 dark:text-neutral-100 mb-2">
            {t.emptyCart}
          </h2>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 max-w-sm mx-auto mb-6">
            {language === 'ar'
              ? 'لم تضف منتجات إلى سلتك بعد. تصفح المتجر وأضف ما تحتاجه.'
              : 'Your cart is empty. Browse the store and add what you need.'}
          </p>
          <Link
            to={`/${language}/shop`}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition-all shadow-md shadow-purple-600/25"
          >
            <ShoppingBag className="w-4 h-4" />
            <span>{t.continue}</span>
          </Link>
        </div>
      )}

      {/* Active Cart View: 2 Columns */}
      {cart && !isCartEmpty && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Items List (7 cols) */}
          <div className="lg:col-span-7 space-y-4">
            {/* Items Header & Clear Cart */}
            <div className="flex items-center justify-between px-1 py-1">
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4 text-purple-600" />
                <h2 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                  {language === 'ar' ? `الأصناف المحددة (${cart.rawLines.length})` : `Selected Items (${cart.rawLines.length})`}
                </h2>
              </div>
              <button
                type="button"
                onClick={handleClearCart}
                className="text-xs text-rose-600 dark:text-rose-400 hover:underline inline-flex items-center gap-1 font-semibold transition-colors"
                title={ar ? 'إفراغ السلة' : 'Clear Cart'}
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{language === 'ar' ? 'إفراغ السلة' : 'Clear Cart'}</span>
              </button>
            </div>

            {cart.errors?.map((code) => (
              <p key={code} className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 text-xs">
                {errorText(code, language)}
              </p>
            ))}

            {cart.rawLines.map((line, index) => {
              const matchedItems = cart.items.filter((i) =>
                line.packageId
                  ? i.packageId === line.packageId
                  : i.variantId === line.variantId && i.unitId === (line.unitId ?? null)
              );
              const firstItem = matchedItems[0];
              const isSerialized = Boolean(line.unitId || (line.unitIds && line.unitIds.length > 0));

              return (
                <article
                  key={index}
                  className="p-4 sm:p-5 rounded-2xl bg-neutral-50 dark:bg-neutral-900/70 border border-neutral-200 dark:border-neutral-800 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl bg-white dark:bg-white p-2 flex-shrink-0 flex items-center justify-center border border-neutral-200/60 dark:border-neutral-700/60">
                      <img
                        src={firstItem?.images?.[0] || '/placeholder.webp'}
                        alt=""
                        className="w-full h-full object-contain"
                      />
                    </div>

                    <div className="min-w-0">
                      {matchedItems.length > 0 ? (
                        matchedItems.map((item, i) => (
                          <div key={i} className="mb-1">
                            <h3 className="text-sm font-bold leading-snug text-neutral-900 dark:text-neutral-100 line-clamp-2 break-words">
                              {item.title[language]}
                            </h3>
                            <div className="flex flex-wrap items-center gap-2 text-[11px] text-neutral-500 mt-0.5">
                              <span dir="ltr" className="font-mono bg-neutral-200/60 dark:bg-neutral-800 px-1.5 py-0.5 rounded">
                                {item.sku}
                              </span>
                              {item.unitId && (
                                <span className="text-purple-600 dark:text-purple-400 font-semibold">
                                  {language === 'ar' ? 'قطعة مفحوصة ومطابقة' : 'Certified unit'}
                                </span>
                              )}
                              <span className="font-bold text-neutral-800 dark:text-neutral-200">
                                {item.linePriceUsd ? `$${item.linePriceUsd}` : item.priceIncluded ? t.included : t.unknown}
                                {(() => {
                                  const yer = calculateYer(item.linePriceUsd, cart?.usdToYer || exchangeRate);
                                  const yerFormatted = formatPriceYer(yer, language);
                                  return yerFormatted ? (
                                    <span className="text-[11px] font-normal text-neutral-500 dark:text-neutral-400 ms-1.5" dir="ltr">
                                      {yerFormatted}
                                    </span>
                                  ) : null;
                                })()}
                              </span>
                            </div>
                          </div>
                        ))
                      ) : (
                        <h3 dir="ltr" className="text-sm font-bold font-mono">
                          {line.variantId ?? line.packageId}
                        </h3>
                      )}

                      {isSerialized && (
                        <span className="inline-flex items-center gap-1 text-[10px] text-purple-600 dark:text-purple-400 font-semibold bg-purple-50 dark:bg-purple-950/40 px-2 py-0.5 rounded-full mt-1">
                          <CheckCircle2 className="w-3 h-3" />
                          {language === 'ar' ? 'قطعة وحيدة برقم تسلسلي معتمد' : 'Verified Serialized Unit'}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Quantity and Remove Controls */}
                  <div className="flex items-center justify-between sm:justify-end gap-4 w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-neutral-200 dark:border-neutral-800">
                    <div className="flex items-center gap-2">
                      {!isSerialized ? (
                        <div className="flex items-center rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 overflow-hidden">
                          <button
                            type="button"
                            disabled={busy || line.quantity <= 1}
                            onClick={() => void handleQuantity(index, line.quantity - 1)}
                            className="w-8 h-8 flex items-center justify-center text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700 disabled:opacity-40 transition-colors"
                            aria-label={language === 'ar' ? 'تقليل الكمية' : 'Decrease quantity'}
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="w-8 text-center text-xs font-bold text-neutral-900 dark:text-neutral-100">
                            {line.quantity}
                          </span>
                          <button
                            type="button"
                            disabled={busy || line.quantity >= 100}
                            onClick={() => void handleQuantity(index, line.quantity + 1)}
                            className="w-8 h-8 flex items-center justify-center text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700 disabled:opacity-40 transition-colors"
                            aria-label={language === 'ar' ? 'زيادة الكمية' : 'Increase quantity'}
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs font-semibold text-neutral-500 bg-neutral-200/50 dark:bg-neutral-800 px-2.5 py-1 rounded-lg">
                          × 1
                        </span>
                      )}
                    </div>

                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void handleRemove(index)}
                      className="p-2 rounded-xl text-neutral-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                      title={t.remove}
                      aria-label={t.remove}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </article>
              );
            })}

          </div>

          {/* Sticky Checkout & Summary Sidebar (5 cols) */}
          <div className="lg:col-span-5">
            <div className="sticky top-24 p-4 sm:p-6 rounded-3xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm">
              <h2 className="text-lg font-bold text-neutral-900 dark:text-neutral-100 mb-4 pb-3 border-b border-neutral-200 dark:border-neutral-800">
                {language === 'ar' ? 'ملخص الطلب والاستلام' : 'Order & Fulfillment Summary'}
              </h2>

              {/* Coupon Form */}
            <div className="mb-4 p-3 rounded-2xl bg-white dark:bg-neutral-800/80 border border-neutral-200/80 dark:border-neutral-700/80">
                <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300 block mb-1.5 flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-purple-600" />
                <span>{language === 'ar' ? 'كوبون الخصم' : 'Discount code'}</span>
                </label>

                {appliedCoupon ? (
                  <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-emerald-600" />
                      <div>
                        <span className="font-mono font-bold text-xs text-emerald-700 dark:text-emerald-400">
                          {appliedCoupon.code}
                        </span>
                        <span className="text-[11px] text-emerald-600 dark:text-emerald-500 block">
                          {appliedCoupon.label}
                        </span>
                        {appliedCoupon.savingsText && (
                          <span className="text-[10.5px] font-bold text-emerald-700 dark:text-emerald-400 block mt-0.5">
                            {appliedCoupon.savingsText}
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleRemoveCoupon}
                      className="p-1 rounded-lg text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/20"
                      title={ar ? 'إلغاء الكوبون' : 'Remove coupon'}
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div>
                    <form onSubmit={(e) => handleApplyCoupon(e)} className="flex gap-2">
                      <input
                        type="text"
                        value={couponInput}
                        onChange={(e) => setCouponInput(e.target.value)}
                        placeholder={language === 'ar' ? 'مثال: ALJEEL10' : 'e.g. ALJEEL10'}
                        disabled={couponLoading}
                        className="flex-1 text-xs px-3 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900 font-mono uppercase"
                      />
                      <button
                        type="submit"
                        disabled={!couponInput.trim() || couponLoading}
                        className="px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 disabled:opacity-40 text-white font-bold text-xs transition flex items-center gap-1"
                      >
                        {couponLoading ? (ar ? 'جارٍ الفحص…' : 'Checking…') : (language === 'ar' ? 'تطبيق' : 'Apply')}
                      </button>
                    </form>

                    {publicPromos.length > 0 && (
                      <div className="mt-2.5 pt-2 border-t border-neutral-100 dark:border-neutral-800">
                        <span className="text-[10.5px] font-bold text-neutral-400 block mb-1">
                          {ar ? 'عروض ترويجية متاحة لك اليوم:' : 'Available promo codes:'}
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {publicPromos.map((promo) => (
                            <button
                              key={promo.code}
                              type="button"
                              onClick={() => {
                                setCouponInput(promo.code);
                                void handleApplyCoupon(undefined, promo.code);
                              }}
                              className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-md bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 hover:bg-purple-100 transition flex items-center gap-1"
                            >
                              <Sparkles className="w-2.5 h-2.5" />
                              <span>{promo.code}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {couponMsg && !appliedCoupon && (
                  <p className={`text-[11px] mt-1.5 font-medium ${couponMsg.isError ? 'text-rose-500' : 'text-emerald-600'}`}>
                    {couponMsg.text}
                  </p>
                )}
              </div>

              <form onSubmit={handleCheckout} className="space-y-5">
                {/* Currency Selector */}
                <div>
                  <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300 block mb-1.5">
                    {t.currency}
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setCurrency('USD')}
                      className={`p-2 rounded-xl text-xs font-bold border transition-all ${
                        currency === 'USD'
                          ? 'border-purple-600 bg-purple-600 text-white'
                          : 'border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-200'
                      }`}
                    >
                      USD ($)
                    </button>
                    <button
                      type="button"
                      disabled={!cart.usdToYer && !exchangeRate}
                      onClick={() => setCurrency('YER')}
                      className={`p-2 rounded-xl text-xs font-bold border transition-all ${
                        currency === 'YER'
                          ? 'border-purple-600 bg-purple-600 text-white'
                          : 'border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-200'
                      } disabled:opacity-40 disabled:cursor-not-allowed`}
                    >
                      YER (ريال يمني)
                    </button>
                  </div>
                </div>

                {/* Subtotal Calculation */}
                <div className="p-4 rounded-2xl bg-white dark:bg-neutral-800/80 border border-neutral-200/80 dark:border-neutral-700/80 space-y-2">
                  <div className="flex items-center justify-between text-xs text-neutral-500">
                    <span>{t.subtotal}</span>
                    <span className="font-semibold" dir="ltr">${cart.subtotalUsd ?? '—'}</span>
                  </div>

                  {appliedCoupon && discountUsd > 0 && (
                    <div className="flex items-center justify-between text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
                      <span className="flex items-center gap-1">
                        <Tag className="w-3 h-3" />
                        <span>{appliedCoupon.label}</span>
                      </span>
                      <span dir="ltr">-${discountUsd.toFixed(2)}</span>
                    </div>
                  )}

                  {appliedCoupon && appliedCoupon.freeShipping && (
                    <div className="flex items-center justify-between text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
                      <span className="flex items-center gap-1">
                        <Truck className="w-3 h-3" />
                        <span>{appliedCoupon.label}</span>
                      </span>
                      <span>{ar ? 'توصيل مجاني' : 'FREE'}</span>
                    </div>
                  )}

                  <div className="pt-2 border-t border-neutral-200/70 dark:border-neutral-700/70 flex items-baseline justify-between">
                    <div>
                      <span className="text-xs font-bold text-neutral-700 dark:text-neutral-300 block">
                        {language === 'ar' ? 'المجموع المستحق:' : 'Total Amount:'}
                      </span>
                      {cart.hasUnpriced && <span className="text-[10px] text-amber-500">{t.unknown}</span>}
                    </div>
                    <div className="text-end">
                      <strong className="text-2xl font-black text-purple-600 dark:text-purple-400 block" dir="ltr">
                        {currency === 'USD'
                          ? `$${finalTotalUsdStr}`
                          : `${formatPriceYer(finalTotalYerCalc, language) || `${finalTotalUsdStr} YER`}`}
                      </strong>
                      {currency === 'USD' && finalTotalYerCalc && (
                        <span className="text-[11px] text-neutral-500 block" dir="ltr">
                          ≈ {formatPriceYer(finalTotalYerCalc, language)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Fulfillment Method Toggle */}
                <div>
                  <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300 block mb-1.5">
                    {language === 'ar' ? 'طريقة الاستلام:' : 'Fulfillment Method:'}
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setMethod('pickup')}
                      className={`p-3 rounded-xl border text-center flex flex-col items-center gap-1 transition-all ${
                        method === 'pickup'
                          ? 'border-purple-600 bg-purple-50/50 dark:bg-purple-950/20 text-purple-600 dark:text-purple-400 ring-1 ring-purple-600'
                          : 'border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300'
                      }`}
                    >
                      <Store className="w-4 h-4" />
                      <span className="text-xs font-bold">{t.pickup}</span>
                      <span className="text-[10px] opacity-75">{language === 'ar' ? 'صنعاء (مجاناً)' : 'Sana\'a (Free)'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setMethod('delivery')}
                      className={`p-3 rounded-xl border text-center flex flex-col items-center gap-1 transition-all ${
                        method === 'delivery'
                          ? 'border-purple-600 bg-purple-50/50 dark:bg-purple-950/20 text-purple-600 dark:text-purple-400 ring-1 ring-purple-600'
                          : 'border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300'
                      }`}
                    >
                      <Truck className="w-4 h-4" />
                      <span className="text-xs font-bold">{t.delivery}</span>
                      <span className="text-[10px] opacity-75">{language === 'ar' ? 'صنعاء والمحافظات' : 'Courier delivery'}</span>
                    </button>
                  </div>
                </div>

                {/* Delivery Fields */}
                {method === 'delivery' && (
                  <div className="space-y-3 p-3.5 rounded-2xl bg-white dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700">
                    <div>
                      <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300 block mb-1">
                        {t.address} *
                      </label>
                      <textarea
                        required
                        minLength={10}
                        maxLength={1000}
                        rows={2}
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        placeholder={language === 'ar' ? 'اسم الحي، الشارع، أقرب معلم في صنعاء...' : 'Street name, landmark, city...'}
                        className="w-full text-xs p-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900"
                      />
                    </div>
                    <p className="text-[11px] text-neutral-500 flex items-center gap-1">
                      <Info className="w-3.5 h-3.5 text-purple-600" />
                      {t.deliveryFee}
                    </p>
                  </div>
                )}

                <details className="group rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800/60 px-3 py-2.5">
                  <summary className="cursor-pointer list-none text-xs font-semibold text-neutral-600 dark:text-neutral-300">
                    {language === 'ar' ? 'إضافة ملاحظة (اختياري)' : 'Add a note (optional)'}
                  </summary>
                  <textarea
                    maxLength={1000}
                    rows={2}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder={language === 'ar' ? 'موعد الاستلام أو تفاصيل إضافية…' : 'Pickup timing or other details…'}
                    className="mt-2 w-full text-xs p-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900"
                  />
                </details>

                {/* Customer Account Notice / Status */}
                {customer ? (
                  <div className="p-3 rounded-xl bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-purple-600" />
                      <span className="font-bold text-neutral-900 dark:text-neutral-100">{customer.name}</span>
                    </div>
                    <span dir="ltr" className="text-neutral-500 font-mono text-[11px]">{customer.phone}</span>
                  </div>
                ) : null}

                {/* Instant WhatsApp Direct Checkout CTA */}
                <button
                  type="button"
                  onClick={handleWhatsAppCheckout}
                  className="w-full h-12 rounded-xl font-bold text-sm bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/25 flex items-center justify-center gap-2 transition-all active:scale-[0.99] cursor-pointer"
                >
                  <MessageCircle className="w-5 h-5" />
                  <span>{language === 'ar' ? 'اعتماد الطلب ومتابعته عبر واتساب' : 'Confirm Order via WhatsApp'}</span>
                </button>

                {/* Account checkout stays available as a quiet secondary path. */}
                {customer ? (
                  <button
                    type="submit"
                    disabled={busy || !cart.previewToken || Boolean(cart.errors?.length)}
                    className="w-full h-11 rounded-xl font-semibold text-xs bg-purple-600 hover:bg-purple-700 text-white shadow-sm shadow-purple-600/20 flex items-center justify-center gap-2 transition-all active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {busy ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                    <span>{t.checkout}</span>
                  </button>
                ) : (
                  <Link
                    to={`/${language}/account?return=cart`}
                    className="w-full min-h-10 rounded-xl text-xs font-semibold text-purple-700 dark:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-950/30 flex items-center justify-center gap-2 transition-colors"
                  >
                    <User className="w-4 h-4" />
                    <span>{language === 'ar' ? 'أو سجّل الدخول للمتابعة بحسابك' : 'Or sign in to place an account order'}</span>
                  </Link>
                )}

                <p className="text-[11px] text-center text-neutral-400 dark:text-neutral-500">
                  {t.noReservation}
                </p>
              </form>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
