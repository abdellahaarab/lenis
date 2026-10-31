import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  CheckCircle2,
  Copy,
  Check,
  MessageCircle,
  Store,
  Truck,
  ArrowRight,
  ArrowLeft,
  Clock,
  AlertCircle,
  ShieldCheck,
  XCircle,
  MapPin,
  Tag
} from 'lucide-react';
import { useLanguage } from '@/i18n/LanguageContext';
import {
  shopApi,
  commerceCopy,
  orderLabels,
  errorText,
  type Order
} from '@/data/commerce';
import '@/commerce.css';

export default function OrderPage() {
  const { id } = useParams();
  const { language, dir } = useLanguage();
  const t = commerceCopy[language];

  const [data, setData] = useState<{ order: Order; whatsapp: string | null } | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    setLoading(true);
    shopApi<{ order: Order; whatsapp: string | null }>(`/orders/${id}`)
      .then((res) => {
        setData(res);
        setLoading(false);
      })
      .catch((e) => {
        setError(errorText(e.message, language));
        setLoading(false);
      });
  }, [id, language]);

  const order = data?.order;

  const copyOrderNumber = () => {
    if (!order?.number) return;
    navigator.clipboard.writeText(order.number);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCancelOrder = async () => {
    if (!id || !order) return;
    if (!window.confirm(language === 'ar' ? 'هل أنت متأكد من إلغاء هذا الطلب؟' : 'Are you sure you want to cancel this order?')) {
      return;
    }
    setCancelling(true);
    try {
      await shopApi(`/orders/${id}/cancel`, 'POST', {});
      setData((prev) => (prev ? { ...prev, order: { ...prev.order, status: 'cancelled' } } : null));
    } catch (e) {
      setError(errorText(e instanceof Error ? e.message : '', language));
    } finally {
      setCancelling(false);
    }
  };

  const whatsappMessage = order
    ? [
        language === 'ar'
          ? `السلام عليكم، أود متابعة طلبي المسجل في موقع الجيل العربي الرقمي:`
          : `Hello, I would like to follow up on my order:`,
        `${language === 'ar' ? 'رقم الطلب' : 'Order'}: ${order.number}`,
        ...order.items.map(
          (item) =>
            `- ${item.title[language]} · ${item.sku} × ${item.quantity}${
              item.unitId ? ` (${language === 'ar' ? 'قطعة مفحوصة' : 'Certified unit'})` : ''
            }`
        ),
        `${t.subtotal}: ${order.currency === 'USD' ? `$${order.subtotalUsd}` : `${order.subtotalYer} YER`}`,
        order.fulfillment.method === 'delivery'
          ? `${t.delivery}: ${order.fulfillment.address}`
          : `${t.pickup}: ${language === 'ar' ? 'معرض شارع صخر بصنعاء' : 'Sakhr St Showroom, Sana\'a'}`
      ].join('\n')
    : '';

  const getStepStatus = (stepKey: string) => {
    if (!order) return 'upcoming';
    if (order.status === 'cancelled') return 'cancelled';

    const orderStages = ['new', 'review', 'confirmed', 'preparing', 'ready_pickup', 'out_delivery', 'completed'];
    const currentIndex = orderStages.indexOf(order.status);

    if (stepKey === 'placed') return 'completed';
    if (stepKey === 'review') {
      if (currentIndex >= 1) return currentIndex > 1 ? 'completed' : 'current';
      return 'upcoming';
    }
    if (stepKey === 'fulfillment') {
      if (currentIndex >= 2 && currentIndex <= 5) return 'current';
      if (currentIndex > 5) return 'completed';
      return 'upcoming';
    }
    if (stepKey === 'completed') {
      if (currentIndex === 6) return 'completed';
      return 'upcoming';
    }
    return 'upcoming';
  };

  return (
    <main id="main-content" className="min-h-screen pt-24 pb-20 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto" dir={dir}>
      {/* Breadcrumb Navigation */}
      <div className="flex items-center justify-between mb-8">
        <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs text-neutral-500">
          <Link to={`/${language}`} className="hover:text-purple-600 transition-colors">
            {language === 'ar' ? 'الرئيسية' : 'Home'}
          </Link>
          <span>/</span>
          <Link to={`/${language}/account`} className="hover:text-purple-600 transition-colors">
            {t.orders}
          </Link>
          <span>/</span>
          <span className="text-neutral-900 dark:text-neutral-100 font-semibold">{t.saved}</span>
        </nav>

        <Link
          to={`/${language}/account`}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-neutral-700 dark:text-neutral-200 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 transition-colors"
        >
          {language === 'ar' ? <ArrowRight className="w-3.5 h-3.5" /> : <ArrowLeft className="w-3.5 h-3.5" />}
          <span>{t.orders}</span>
        </Link>
      </div>

      {/* Error alert */}
      {error && (
        <div role="alert" className="p-4 mb-6 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs sm:text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Loading state */}
      {loading ? (
        <div className="py-24 flex flex-col items-center justify-center gap-4 text-neutral-500">
          <div className="w-10 h-10 border-4 border-purple-600/30 border-t-purple-600 rounded-full animate-spin" />
          <p className="text-sm font-medium">{t.loading}</p>
        </div>
      ) : !order ? (
        <div className="text-center py-20 rounded-3xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800">
          <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-3" />
          <h2 className="text-lg font-bold text-neutral-900 dark:text-neutral-100 mb-1">
            {language === 'ar' ? 'الطلب غير موجود' : 'Order Not Found'}
          </h2>
          <Link to={`/${language}/account`} className="text-xs font-semibold text-purple-600 underline">
            {t.orders}
          </Link>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Success Banner */}
          <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-emerald-50 to-purple-50 dark:from-emerald-950/20 dark:to-purple-950/20 border border-emerald-500/20 dark:border-emerald-500/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500 text-white flex items-center justify-center flex-shrink-0 shadow-lg shadow-emerald-500/25">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-black text-neutral-900 dark:text-neutral-100">
                  {t.saved}
                </h1>
                <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-1">
                  {language === 'ar'
                    ? 'تم تسجيل طلبك بنجاح في نظام المعرض بصنعاء. يمكنك متابعته عبر واتساب أو من حسابك.'
                    : 'Your order was successfully recorded. Follow up on WhatsApp or your account.'}
                </p>
              </div>
            </div>

            {/* Order Number Badge & Copy */}
            <div className="flex items-center gap-2 p-2 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm">
              <div className="px-3 py-1">
                <span className="text-[10px] text-neutral-400 block">
                  {language === 'ar' ? 'رقم الطلب' : 'Order ID'}
                </span>
                <strong dir="ltr" className="text-sm font-mono font-black text-neutral-900 dark:text-neutral-100">
                  {order.number}
                </strong>
              </div>
              <button
                onClick={copyOrderNumber}
                aria-label="Copy order number"
                className="p-2 rounded-xl bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-600 dark:text-neutral-300 transition-colors"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Timeline / Status Progress */}
          {order.status !== 'cancelled' ? (
            <div className="p-6 rounded-3xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs font-bold text-neutral-500 uppercase tracking-wider">
                  {language === 'ar' ? 'مراحل متابعة وتجهيز الطلب' : 'Order Progress'}
                </h3>
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-800">
                  {orderLabels[language][order.status as keyof typeof orderLabels.ar] ?? order.status}
                </span>
              </div>

              <div className="grid grid-cols-4 gap-2 pt-2">
                {[
                  { key: 'placed', title: language === 'ar' ? 'تسجيل الطلب' : 'Order Placed' },
                  { key: 'review', title: language === 'ar' ? 'مراجعة المعرض' : 'Store Review' },
                  { key: 'fulfillment', title: language === 'ar' ? 'التجهيز والتسليم' : 'Ready / Out' },
                  { key: 'completed', title: language === 'ar' ? 'اكتمال الطلب' : 'Completed' }
                ].map((step, idx) => {
                  const state = getStepStatus(step.key);
                  return (
                    <div key={step.key} className="flex flex-col items-center text-center">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold mb-2 transition-all ${
                          state === 'completed'
                            ? 'bg-emerald-500 text-white'
                            : state === 'current'
                            ? 'bg-purple-600 text-white ring-4 ring-purple-600/20 animate-pulse'
                            : 'bg-neutral-200 dark:bg-neutral-800 text-neutral-500'
                        }`}
                      >
                        {state === 'completed' ? <Check className="w-4 h-4" /> : idx + 1}
                      </div>
                      <span className="text-[11px] font-semibold text-neutral-800 dark:text-neutral-200">
                        {step.title}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-600 flex items-center gap-3">
              <XCircle className="w-5 h-5 flex-shrink-0" />
              <div>
                <strong className="text-xs block">{language === 'ar' ? 'تم إلغاء هذا الطلب' : 'This order has been cancelled'}</strong>
                <span className="text-[11px] opacity-90">{language === 'ar' ? 'يمكنك دائماً بدء طلب جديد من المتجر.' : 'You can place a new order anytime.'}</span>
              </div>
            </div>
          )}

          {/* WhatsApp Direct Action CTA */}
          {data?.whatsapp && order.status !== 'cancelled' ? (
            <div className="p-6 rounded-3xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
              <div className="space-y-1">
                <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
                  <MessageCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  <span>{language === 'ar' ? 'تأكيد وحجز موعد الاستلام عبر واتساب' : 'Confirm Pickup via WhatsApp'}</span>
                </h3>
                <p className="text-xs text-neutral-600 dark:text-neutral-400">
                  {t.notSent}
                </p>
              </div>

              <a
                href={`https://wa.me/${data.whatsapp}?text=${encodeURIComponent(whatsappMessage)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-md shadow-emerald-600/25 flex-shrink-0"
              >
                <MessageCircle className="w-4 h-4" />
                <span>{t.follow}</span>
              </a>
            </div>
          ) : (
            <p className="text-xs text-neutral-500 text-center">{t.noWhatsapp}</p>
          )}

          {/* Order Details & Items Card */}
          <div className="p-6 rounded-3xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 space-y-6">
            <h2 className="text-base font-bold text-neutral-900 dark:text-neutral-100 pb-3 border-b border-neutral-200 dark:border-neutral-800">
              {language === 'ar' ? 'الأصناف المشمولة بالطلب' : 'Order Items'}
            </h2>

            <div className="divide-y divide-neutral-200 dark:divide-neutral-800">
              {order.items.map((item, i) => (
                <div key={i} className="py-3 flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <h4 className="text-xs font-bold text-neutral-900 dark:text-neutral-100 truncate">
                      {item.title[language]}
                    </h4>
                    <div className="flex items-center gap-2 text-[11px] text-neutral-500 mt-0.5">
                      <span dir="ltr" className="font-mono">{item.sku}</span>
                      <span>× {item.quantity}</span>
                      {item.unitId && (
                        <span className="text-purple-600 dark:text-purple-400 font-semibold">
                          ({language === 'ar' ? 'قطعة مفحوصة' : 'Certified unit'})
                        </span>
                      )}
                    </div>
                  </div>

                  <strong className="text-xs font-black text-neutral-800 dark:text-neutral-200 flex-shrink-0">
                    {item.linePriceUsd ? `$${item.linePriceUsd}` : item.priceIncluded ? t.included : t.unknown}
                  </strong>
                </div>
              ))}
            </div>

            {/* Subtotal row */}
            <div className="pt-4 border-t border-neutral-200 dark:border-neutral-800 flex items-center justify-between text-xs text-neutral-600 dark:text-neutral-400">
              <span className="font-semibold">{t.subtotal}:</span>
              <span className="font-bold" dir="ltr">
                {order.currency === 'USD' ? `$${order.subtotalUsd}` : `${order.subtotalYer} YER`}
              </span>
            </div>

            {/* Coupon Discount row if applied */}
            {order.couponCode && order.discountUsd && Number(order.discountUsd) > 0 && (
              <div className="pt-2 flex items-center justify-between text-xs text-emerald-600 dark:text-emerald-400 font-bold">
                <span className="flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5" />
                  <span>{language === 'ar' ? 'خصم الكوبون' : 'Coupon Discount'} ({order.couponCode}):</span>
                </span>
                <span dir="ltr">-${Number(order.discountUsd).toFixed(2)}</span>
              </div>
            )}

            {/* Total row */}
            <div className="pt-3 border-t border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
              <span className="text-xs font-bold text-neutral-700 dark:text-neutral-300">
                {language === 'ar' ? 'المجموع النهائي:' : 'Final Total:'}
              </span>
              <strong className="text-xl font-black text-purple-600 dark:text-purple-400" dir="ltr">
                {order.currency === 'USD'
                  ? `$${order.totalUsd ?? order.subtotalUsd}`
                  : `${order.totalYer ?? order.subtotalYer} YER`}
              </strong>
            </div>

            {/* Fulfillment info card */}
            <div className="p-4 rounded-2xl bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700/60 flex items-start gap-3">
              {order.fulfillment.method === 'delivery' ? (
                <Truck className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
              ) : (
                <Store className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
              )}
              <div className="text-xs space-y-1">
                <span className="font-bold text-neutral-900 dark:text-neutral-100 block">
                  {order.fulfillment.method === 'delivery' ? t.delivery : t.pickup}
                </span>
                <p className="text-neutral-500">
                  {order.fulfillment.method === 'delivery'
                    ? order.fulfillment.address
                    : language === 'ar'
                    ? 'معرض الجيل العربي الرقمي — صنعاء، شارع صخر'
                    : 'Al-Jeel Al-Arabi Digital Showroom — Sakhr Street, Sana\'a'}
                </p>
                {order.fulfillment.notes && (
                  <p className="text-[11px] text-neutral-400 italic">
                    "{order.fulfillment.notes}"
                  </p>
                )}
              </div>
            </div>

            <p className="text-[11px] text-neutral-400 text-center">
              {t.noReservation}
            </p>
          </div>

          {/* Cancel Order Action */}
          {['new', 'review'].includes(order.status) && (
            <div className="text-center pt-2">
              <button
                type="button"
                disabled={cancelling}
                onClick={handleCancelOrder}
                className="text-xs font-bold text-rose-500 hover:text-rose-600 hover:underline transition-colors disabled:opacity-50"
              >
                {cancelling ? t.loading : t.cancel}
              </button>
            </div>
          )}
        </div>
      )}
    </main>
  );
}
