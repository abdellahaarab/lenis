import React, { useState, useEffect } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import {
  X,
  User,
  Lock,
  Phone,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  ShoppingBag,
  Clock
} from 'lucide-react';
import { useLanguage } from '@/i18n/LanguageContext';
import { useAuth } from '@/data/AuthContext';
import { shopApi, errorText, type Customer } from '@/data/commerce';

export default function AuthModal() {
  const { language, dir } = useLanguage();
  const {
    isAuthModalOpen,
    closeAuthModal,
    authMode,
    setAuthMode,
    refreshCustomer,
    refreshCart,
    setCustomer
  } = useAuth();

  const isAr = language === 'ar';

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('+967');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Reset form when modal opens or mode changes
  useEffect(() => {
    if (isAuthModalOpen) {
      setError('');
      setSuccessMsg('');
      setPassword('');
      if (phone === '') setPhone('+967');
    }
  }, [isAuthModalOpen, authMode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setLoading(true);

    try {
      const endpoint = authMode === 'register' ? '/register' : '/login';
      const cleanPhone = phone.trim();
      const payload = {
        phone: cleanPhone,
        password,
        ...(authMode === 'register' ? { name: name.trim() } : {}),
      };

      const res = await shopApi<{ customer: Customer }>(endpoint, 'POST', payload);
      setCustomer(res.customer);

      setSuccessMsg(
        authMode === 'register'
          ? (isAr ? 'تم إنشاء حسابك بنجاح! مرحباً بك معنا.' : 'Account created successfully! Welcome.')
          : (isAr ? 'تم تسجيل الدخول بنجاح!' : 'Signed in successfully!')
      );

      // Trigger global event updates
      window.dispatchEvent(new Event('store-auth-changed'));
      window.dispatchEvent(new Event('store-cart-changed'));
      await refreshCustomer();
      await refreshCart();

      setTimeout(() => {
        closeAuthModal();
        setSuccessMsg('');
        setPassword('');
      }, 1000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '';
      setError(errorText(msg, language));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog.Root open={isAuthModalOpen} onOpenChange={(open) => !open && closeAuthModal()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[120] bg-black/60 backdrop-blur-sm transition-opacity duration-300 animate-in fade-in" />
        <Dialog.Content
          dir={dir}
          className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[130] w-[min(480px,calc(100vw-32px))] max-h-[90vh] overflow-y-auto rounded-3xl bg-white dark:bg-[#130E20] border border-purple-100 dark:border-white/10 p-6 md:p-8 shadow-2xl shadow-purple-900/20 text-[#17131F] dark:text-[#F8F7FC] focus:outline-none"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-purple-100/70 dark:border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-purple-500/30">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <Dialog.Title className="text-lg md:text-xl font-black text-gray-900 dark:text-white leading-tight">
                  {isAr ? 'حساب الجيل العربي' : 'Al-Jeel Al-Arabi Account'}
                </Dialog.Title>
                <Dialog.Description className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  {isAr
                    ? 'بوابة عملائنا لإدارة الطلبات والضمان المعتمد'
                    : 'Customer portal for orders & certified warranty'}
                </Dialog.Description>
              </div>
            </div>

            <Dialog.Close
              className="p-2 rounded-xl text-gray-400 hover:text-gray-700 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
              aria-label={isAr ? 'إغلاق' : 'Close'}
            >
              <X className="w-5 h-5" />
            </Dialog.Close>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="grid grid-cols-2 p-1.5 mt-5 bg-gray-100 dark:bg-white/5 rounded-2xl border border-gray-200/50 dark:border-white/5">
            <button
              type="button"
              onClick={() => {
                setAuthMode('login');
                setError('');
              }}
              className={`py-2.5 text-xs md:text-sm font-bold rounded-xl transition-all ${authMode === 'login'
                  ? 'bg-white dark:bg-purple-600 text-purple-700 dark:text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
            >
              {isAr ? 'تسجيل الدخول' : 'Sign In'}
            </button>
            <button
              type="button"
              onClick={() => {
                setAuthMode('register');
                setError('');
              }}
              className={`py-2.5 text-xs md:text-sm font-bold rounded-xl transition-all ${authMode === 'register'
                  ? 'bg-white dark:bg-purple-600 text-purple-700 dark:text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
            >
              {isAr ? 'إنشاء حساب جديد' : 'Create Account'}
            </button>
          </div>

          {/* Alerts */}
          {error && (
            <div className="mt-4 p-3 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="mt-4 p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="mt-5 space-y-4">
            {authMode === 'register' && (
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                  {isAr ? 'الاسم الكامل أو اسم المنشأة' : 'Full Name or Business Name'}
                </label>
                <div className="relative">
                  <User className="w-4 h-4 absolute top-1/2 -translate-y-1/2 start-3.5 text-gray-400" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={isAr ? 'مثال: محمد العمري' : 'e.g. John Doe'}
                    className="w-full ps-10 pe-4 py-3 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50/70 dark:bg-white/5 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-600"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                {isAr ? 'رقم الهاتف (مع الرمز الدولي)' : 'Phone Number (with country code)'}
              </label>
              <div className="relative" dir="ltr">
                <Phone className="w-4 h-4 absolute top-1/2 -translate-y-1/2 start-3.5 text-gray-400" />
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+967771001044"
                  className="w-full ps-10 pe-4 py-3 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50/70 dark:bg-white/5 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-600 text-left font-mono"
                />
              </div>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">
                {isAr
                  ? 'يُستخدم رقم هاتفك لتأكيد الطلبات وإرسال إشعارات الواتساب.'
                  : 'Used for order confirmations and WhatsApp tracking.'}
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                {isAr ? 'كلمة المرور' : 'Password'}
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute top-1/2 -translate-y-1/2 start-3.5 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full ps-10 pe-11 py-3 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50/70 dark:bg-white/5 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-600"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute top-1/2 -translate-y-1/2 end-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Perks for Register */}
            {authMode === 'register' && (
              <div className="p-3.5 rounded-2xl bg-purple-500/5 border border-purple-500/10 space-y-2">
                <div className="text-[11px] font-bold text-purple-700 dark:text-purple-300 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-purple-600" />
                  <span>{isAr ? 'مزايا حسابك لدى الجيل العربي:' : 'Account Perks:'}</span>
                </div>
                <div className="text-[11px] text-gray-600 dark:text-gray-400 space-y-1 ps-5 list-disc">
                  <p>• {isAr ? 'تتبع لحظي للطلبات وحالة الفحص والشحن' : 'Real-time order & inspection tracking'}</p>
                  <p>• {isAr ? 'حفظ دائم للسلة ومزامنتها عبر كل أجهزتك' : 'Cart sync across all your devices'}</p>
                  <p>• {isAr ? 'سجل رسمي للضمان وشهادات الفحص بـ 7 نقاط' : 'Official warranty & 7-point certification'}</p>
                </div>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-4 rounded-xl font-bold text-sm text-white bg-purple-600 hover:bg-purple-700 active:scale-[0.99] transition-all flex items-center justify-center gap-2 shadow-lg shadow-purple-600/25 disabled:opacity-50"
            >
              {loading ? (
                <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : authMode === 'register' ? (
                <>
                  <span>{isAr ? 'إنشاء حساب جديد' : 'Create My Account'}</span>
                  {dir === 'rtl' ? <ArrowLeft className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
                </>
              ) : (
                <>
                  <span>{isAr ? 'تسجيل الدخول' : 'Sign In to Account'}</span>
                  {dir === 'rtl' ? <ArrowLeft className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
                </>
              )}
            </button>
          </form>

          {/* Quick Footer Links */}
          <div className="mt-5 pt-4 border-t border-gray-100 dark:border-white/10 text-center text-xs text-gray-500 dark:text-gray-400">
            {authMode === 'login' ? (
              <p>
                {isAr ? 'ليس لديك حساب حتى الآن؟' : "Don't have an account yet?"}{' '}
                <button
                  type="button"
                  onClick={() => setAuthMode('register')}
                  className="font-bold text-purple-600 dark:text-purple-400 hover:underline"
                >
                  {isAr ? 'أنشئ حسابك الآن مجاناً' : 'Create an account now'}
                </button>
              </p>
            ) : (
              <p>
                {isAr ? 'لديك حساب بالفعل؟' : 'Already have an account?'}{' '}
                <button
                  type="button"
                  onClick={() => setAuthMode('login')}
                  className="font-bold text-purple-600 dark:text-purple-400 hover:underline"
                >
                  {isAr ? 'تسجيل الدخول' : 'Sign in here'}
                </button>
              </p>
            )}

            <p className="mt-2 text-[11px] text-gray-400 dark:text-gray-500">
              {isAr
                ? 'هل نسيت كلمة المرور؟ تواصل مع المتجر عبر واتساب للتحقق وتزويدك برابط استعادة فوري.'
                : 'Forgot password? Contact store via WhatsApp for verified instant recovery.'}
            </p>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
