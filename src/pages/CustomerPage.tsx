import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  User,
  ShoppingBag,
  LogOut,
  Lock,
  Phone,
  ArrowRight,
  ArrowLeft,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  KeyRound,
  ShieldCheck,
  ChevronRight,
  ChevronLeft
} from 'lucide-react';
import { useLanguage } from '@/i18n/LanguageContext';
import {
  shopApi,
  commerceCopy,
  orderLabels,
  errorText,
  type Customer,
  type Order
} from '@/data/commerce';
import '@/commerce.css';

export default function CustomerPage() {
  const { language, dir } = useLanguage();
  const t = commerceCopy[language];
  const [params] = useSearchParams();
  const navigate = useNavigate();

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<Order[]>([]);
  const [isRegister, setIsRegister] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('+967');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setLoading(true);
    shopApi<{ customer: Customer | null }>('/account')
      .then((r) => {
        setCustomer(r.customer);
        if (r.customer) {
          void shopApi<{ items: Order[] }>('/orders').then((res) => setOrders(res.items));
        }
      })
      .catch((e) => setError(errorText(e.message, language)))
      .finally(() => setLoading(false));
  }, [language]);

  const token = params.get('token');

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const endpoint = isRegister ? '/register' : '/login';
      const payload = {
        phone: phone.trim(),
        password,
        ...(isRegister ? { name: name.trim() } : {})
      };
      const res = await shopApi<{ customer: Customer }>(endpoint, 'POST', payload);
      setCustomer(res.customer);
      setPassword('');

      if (params.get('return') === 'cart') {
        navigate(`/${language}/cart`);
      } else {
        const orderRes = await shopApi<{ items: Order[] }>('/orders');
        setOrders(orderRes.items);
      }
    } catch (e) {
      setError(errorText(e instanceof Error ? e.message : '', language));
    } finally {
      setBusy(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setBusy(true);
    setError('');
    try {
      await shopApi('/reset', 'POST', { token, password });
      navigate(`/${language}/account`, { replace: true });
      setPassword('');
    } catch (e) {
      setError(errorText(e instanceof Error ? e.message : '', language));
    } finally {
      setBusy(false);
    }
  };

  const handleLogout = async () => {
    try {
      await shopApi('/logout', 'POST', {});
      setCustomer(null);
      setOrders([]);
    } catch {
      // ignore
    }
  };

  const getStatusBadge = (status: string) => {
    const label = orderLabels[language][status as keyof typeof orderLabels.ar] ?? status;
    switch (status) {
      case 'completed':
      case 'confirmed':
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">{label}</span>;
      case 'ready_pickup':
      case 'out_delivery':
      case 'preparing':
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">{label}</span>;
      case 'cancelled':
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">{label}</span>;
      default:
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">{label}</span>;
    }
  };

  return (
    <main id="main-content" className="min-h-screen pt-24 pb-20 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto" dir={dir}>
      {/* Top Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <nav aria-label="Breadcrumb" className="mb-2 flex items-center gap-2 text-xs text-neutral-500">
            <Link to={`/${language}`} className="hover:text-purple-600 transition-colors">
              {language === 'ar' ? 'الرئيسية' : 'Home'}
            </Link>
            <span>/</span>
            <span className="text-neutral-900 dark:text-neutral-100 font-semibold">{t.account}</span>
          </nav>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-neutral-900 dark:text-neutral-50">
            {token ? t.resetPassword : t.account}
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <Link
            to={`/${language}/shop`}
            className="px-4 py-2 rounded-xl text-xs font-bold text-neutral-700 dark:text-neutral-200 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 transition-colors"
          >
            {t.continue}
          </Link>
          <Link
            to={`/${language}/cart`}
            className="px-4 py-2 rounded-xl text-xs font-bold text-purple-600 dark:text-purple-400 bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 transition-colors flex items-center gap-1.5"
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>{t.cart}</span>
          </Link>
        </div>
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
      ) : token ? (
        /* Password Reset Form */
        <div className="p-8 rounded-3xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 max-w-md mx-auto">
          <div className="w-12 h-12 rounded-2xl bg-purple-100 dark:bg-purple-950/50 text-purple-600 flex items-center justify-center mb-4">
            <KeyRound className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-neutral-900 dark:text-neutral-100 mb-2">
            {t.resetPassword}
          </h2>
          <p className="text-xs text-neutral-500 mb-6">
            {language === 'ar' ? 'أدخل كلمة المرور الجديدة لحسابك:' : 'Enter your new account password:'}
          </p>

          <form onSubmit={handleResetPassword} className="space-y-4">
            <div>
              <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300 block mb-1">
                {t.password}
              </label>
              <input
                type="password"
                minLength={10}
                maxLength={128}
                required
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full text-xs p-3 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800"
              />
            </div>
            <button
              type="submit"
              disabled={busy}
              className="w-full h-11 rounded-xl font-bold text-xs bg-purple-600 hover:bg-purple-700 text-white shadow-md transition-all disabled:opacity-50"
            >
              {t.save}
            </button>
          </form>
        </div>
      ) : customer ? (
        /* Logged In Dashboard */
        <div className="space-y-8">
          {/* User Profile Card */}
          <div className="p-6 sm:p-8 rounded-3xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-purple-600 text-white text-xl font-black flex items-center justify-center shadow-lg shadow-purple-600/30">
                {customer.name.slice(0, 1).toUpperCase()}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-extrabold text-neutral-900 dark:text-neutral-100">
                    {customer.name}
                  </h2>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                    {language === 'ar' ? 'حساب موثق' : 'Verified'}
                  </span>
                </div>
                <p dir="ltr" className="text-xs text-neutral-500 font-mono mt-1 text-start">
                  {customer.phone}
                </p>
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 text-xs font-bold text-neutral-700 dark:text-neutral-200 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span>{t.logout}</span>
            </button>
          </div>

          {/* Orders Section */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
                <FileText className="w-5 h-5 text-purple-600" />
                <span>{t.orders}</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 font-bold">
                  {orders.length}
                </span>
              </h2>
            </div>

            {orders.length === 0 ? (
              <div className="text-center py-16 px-4 rounded-3xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800">
                <ShoppingBag className="w-12 h-12 text-neutral-400 mx-auto mb-3" />
                <h3 className="text-sm font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                  {language === 'ar' ? 'لا توجد طلبات مسجلة بعد' : 'No orders placed yet'}
                </h3>
                <p className="text-xs text-neutral-500 mb-4">
                  {language === 'ar' ? 'ابدأ تصفح الأجهزة والباقات في المتجر واطلب ما يناسبك.' : 'Explore our catalog and choose your devices.'}
                </p>
                <Link
                  to={`/${language}/shop`}
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-purple-600 text-white text-xs font-bold shadow-md shadow-purple-600/20"
                >
                  <span>{t.continue}</span>
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {orders.map((ord) => (
                  <Link
                    key={ord.id}
                    to={`/${language}/orders/${ord.id}`}
                    className="p-5 rounded-2xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 hover:border-purple-600/50 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 group"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-3">
                        <strong dir="ltr" className="text-sm font-mono font-bold text-neutral-900 dark:text-neutral-100 group-hover:text-purple-600 transition-colors">
                          {ord.number}
                        </strong>
                        {getStatusBadge(ord.status)}
                      </div>
                      <p className="text-xs text-neutral-500">
                        {new Date(ord.createdAt).toLocaleDateString(language, {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </p>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-6">
                      <div className="text-start sm:text-end">
                        <span className="text-[11px] text-neutral-400 block">
                          {language === 'ar' ? 'إجمالي الطلب' : 'Total'}
                        </span>
                        <strong className="text-sm font-black text-purple-600 dark:text-purple-400" dir="ltr">
                          {ord.currency === 'USD' ? `$${ord.subtotalUsd}` : `${ord.subtotalYer} YER`}
                        </strong>
                      </div>

                      <div className="w-8 h-8 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-400 group-hover:text-purple-600 transition-colors">
                        {language === 'ar' ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Auth View: Login / Register */
        <div className="max-w-md mx-auto p-6 sm:p-8 rounded-3xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm">
          {/* Tabs Switcher */}
          <div className="grid grid-cols-2 gap-1 p-1 rounded-2xl bg-neutral-200/60 dark:bg-neutral-800 mb-6">
            <button
              type="button"
              onClick={() => setIsRegister(false)}
              className={`py-2 text-xs font-bold rounded-xl transition-all ${!isRegister
                  ? 'bg-white dark:bg-neutral-900 text-purple-600 shadow-sm'
                  : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900'
                }`}
            >
              {t.login}
            </button>
            <button
              type="button"
              onClick={() => setIsRegister(true)}
              className={`py-2 text-xs font-bold rounded-xl transition-all ${isRegister
                  ? 'bg-white dark:bg-neutral-900 text-purple-600 shadow-sm'
                  : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900'
                }`}
            >
              {t.register}
            </button>
          </div>

          <form onSubmit={handleAuth} className="space-y-4">
            {isRegister && (
              <div>
                <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300 block mb-1">
                  {t.fullName}
                </label>
                <div className="relative flex items-center">
                  <User className="w-4 h-4 absolute start-3 text-neutral-400 pointer-events-none" />
                  <input
                    required
                    autoComplete="name"
                    minLength={2}
                    maxLength={150}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={language === 'ar' ? 'اسمك الكريم' : 'Your full name'}
                    className="w-full text-xs py-2.5 ps-9 pe-3 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300 block mb-1">
                {t.phone}
              </label>
              <div className="relative flex items-center">
                <Phone className="w-4 h-4 absolute start-3 text-neutral-400 pointer-events-none" />
                <input
                  dir="ltr"
                  type="tel"
                  required
                  autoComplete="tel"
                  pattern="[+][1-9][0-9]{7,14}"
                  placeholder="+967771001044"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full text-xs py-2.5 ps-9 pe-3 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-start font-mono"
                />
              </div>
              <span className="text-[10px] text-neutral-400 mt-1 block">
                {language === 'ar' ? 'الرمز الدولي لصنعاء واليمن يبدأ بـ +967' : 'Format with international prefix e.g. +967'}
              </span>
            </div>

            <div>
              <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300 block mb-1">
                {t.password}
              </label>
              <div className="relative flex items-center">
                <Lock className="w-4 h-4 absolute start-3 text-neutral-400 pointer-events-none" />
                <input
                  dir="ltr"
                  type="password"
                  required
                  minLength={10}
                  maxLength={128}
                  autoComplete={isRegister ? 'new-password' : 'current-password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full text-xs py-2.5 ps-9 pe-3 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={busy}
              className="w-full h-11 rounded-xl font-bold text-xs bg-purple-600 hover:bg-purple-700 text-white shadow-md shadow-purple-600/20 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
            >
              {busy ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <span>{isRegister ? t.register : t.login}</span>
              )}
            </button>

            <p className="text-[11px] text-neutral-500 dark:text-neutral-400 text-center leading-relaxed pt-2">
              {t.forgot}
            </p>
          </form>
        </div>
      )}
    </main>
  );
}
