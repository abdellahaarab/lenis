import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import {
  MessageCircle,
  X,
  Phone,
  ShieldCheck,
  MapPin,
  Clock,
  Sparkles,
  ExternalLink,
  ChevronUp,
  Laptop
} from 'lucide-react';
import { useLanguage } from '@/i18n/LanguageContext';
import { useCatalog } from '@/data/CatalogContext';
import { trackWhatsappClick } from '@/analytics';

export default function TechConcierge() {
  const { language, dir } = useLanguage();
  const siteData = useCatalog().site;
  const location = useLocation();

  const isHomePage =
    location.pathname === `/${language}` ||
    location.pathname === `/${language}/` ||
    location.pathname === '/';

  const [isOpen, setIsOpen] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(() => {
    try {
      const hideUntil = localStorage.getItem('hide_tech_concierge_until');
      if (hideUntil) {
        const expiry = parseInt(hideUntil, 10);
        if (!isNaN(expiry) && Date.now() < expiry) {
          return true;
        }
      }
    } catch {
      // localStorage may fail in restricted contexts
    }
    return false;
  });

  const handleDismiss = () => {
    setIsDismissed(true);
    setIsOpen(false);
    try {
      localStorage.setItem(
        'hide_tech_concierge_until',
        (Date.now() + 24 * 60 * 60 * 1000).toString()
      );
    } catch {
      // ignore
    }
  };

  const containerRef = useRef<HTMLDivElement>(null);

  const isAr = language === 'ar';
  const storePhone = siteData?.phone || '';
  const storeWhatsapp = siteData?.whatsapp || '';
  const storeCity = siteData?.city?.[language] || (isAr ? 'صنعاء، اليمن' : 'Sana\'a, Yemen');

  // Show after a brief delay for smooth appearance
  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 1200);
    return () => clearTimeout(timer);
  }, []);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  if (!isHomePage || isDismissed || !isVisible) return null;

  const whatsappMessage = encodeURIComponent(
    isAr
      ? 'مرحباً، أود الحصول على استشارة فنية حول الأجهزة المتوفرة والمواصفات المناسبة لي.'
      : 'Hello, I would like technical advice regarding available devices and suitable specifications.'
  );

  return (
    <div
      ref={containerRef}
      dir={dir}
      className={`fixed bottom-6 ${
        dir === 'rtl' ? 'start-6' : 'end-6'
      } z-40 flex flex-col items-end select-none`}
    >
      {/* Expanded Quick Support Menu */}
      {isOpen && (
        <div className="mb-3 w-88 sm:w-96 max-w-[calc(100vw-2.5rem)] rounded-3xl bg-white dark:bg-[#151022] border border-purple-200/80 dark:border-white/10 shadow-2xl shadow-purple-950/25 p-4 sm:p-5 animate-in fade-in slide-in-from-bottom-3 duration-200 text-[#17131F] dark:text-[#F8F7FC]">
          {/* Card Header */}
          <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-white/10">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-purple-600/30">
                  <Laptop className="w-5 h-5" />
                </div>
                <span className="absolute -bottom-0.5 -end-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white dark:border-[#151022]" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                  <span>{isAr ? 'الاستشارات الهندسية' : 'Technical Support'}</span>
                  <span className="px-2 py-0.5 text-xs bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-bold rounded-md">
                    {isAr ? 'مباشر' : 'Online'}
                  </span>
                </h4>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  {isAr ? 'فريق مهندسي الجيل العربي' : 'Al-Jeel Certified Engineers'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleDismiss}
                className="px-2.5 py-1 text-xs font-semibold text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors cursor-pointer rounded-lg hover:bg-gray-100 dark:hover:bg-white/10"
                title={isAr ? 'إخفاء الزر بالكامل لمدة 24 ساعة' : 'Hide button for 24 hours'}
              >
                {isAr ? 'إخفاء 24 ساعة' : 'Hide 24h'}
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-2 rounded-xl text-gray-400 hover:text-gray-700 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10 transition-colors cursor-pointer"
                aria-label={isAr ? 'إغلاق' : 'Close'}
              >
                <X className="w-4.5 h-4.5" />
              </button>
            </div>
          </div>

          {/* Quick Support Actions */}
          <div className="py-3 space-y-2.5">
            {/* 1. Direct WhatsApp */}
            <a
              href={storeWhatsapp ? `https://wa.me/${storeWhatsapp.replace(/\D/g, '')}?text=${whatsappMessage}` : undefined} aria-disabled={!storeWhatsapp}
              target="_blank"
              rel="noreferrer"
              onClick={() => trackWhatsappClick()}
              className="flex items-center justify-between p-3.5 rounded-2xl bg-emerald-500/10 hover:bg-emerald-500/15 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 transition-colors group"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-sm">
                  <MessageCircle className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-bold">{isAr ? 'محادثة واتساب فورية' : 'Instant WhatsApp'}</p>
                  <p className="text-xs text-emerald-600/90 dark:text-emerald-400/90 mt-0.5">
                    {isAr ? 'استشر مهندس مبيعات قبل الشراء' : 'Ask an engineer before buying'}
                  </p>
                </div>
              </div>
              <ExternalLink className="w-4 h-4 text-emerald-600 transition-transform group-hover:translate-x-0.5" />
            </a>

            {/* 2. Direct Phone Call */}
            <a
              href={storePhone ? `tel:${storePhone.replace(/\s+/g, '')}` : undefined} aria-disabled={!storePhone}
              className="flex items-center justify-between p-3 rounded-2xl hover:bg-purple-50 dark:hover:bg-white/5 border border-transparent hover:border-purple-200/50 dark:hover:border-white/10 transition-colors group"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-950/60 text-purple-600 flex items-center justify-center shrink-0">
                  <Phone className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-sm font-bold">{isAr ? 'اتصال هاتفي مباشر' : 'Call Phone Hotline'}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 font-mono mt-0.5" dir="ltr">
                    {storePhone || (isAr ? 'الرقم قيد الاعتماد' : 'Phone pending confirmation')}
                  </p>
                </div>
              </div>
            </a>

            {/* 3. 7-Point Inspection Details */}
            <div className="p-3 rounded-2xl bg-purple-500/5 border border-purple-500/10 flex items-center gap-2.5">
              <ShieldCheck className="w-4.5 h-4.5 text-purple-600 shrink-0" />
              <p className="text-xs text-purple-900 dark:text-purple-200 leading-relaxed">
                {isAr
                  ? 'جميع الأجهزة تخضع لفحص دقيق بـ 7 نقاط مع ضمان استبدال رسمي.'
                  : 'All units undergo certified 7-point hardware inspection.'}
              </p>
            </div>
          </div>

          {/* Location & Hours Footer */}
          <div className="pt-2.5 border-t border-gray-100 dark:border-white/10 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 font-medium">
            <div className="flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-purple-500" />
              <span>{storeCity}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-purple-500" />
              <span>{isAr ? 'السبت - الخميس' : 'Sat - Thu'}</span>
            </div>
          </div>
        </div>
      )}

      {/* Floating Action Trigger Pill / Button & 24h Dismiss Button */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="group relative flex items-center gap-3 px-5 py-3.5 rounded-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold text-sm sm:text-base shadow-xl shadow-purple-600/30 hover:shadow-purple-600/45 hover:scale-105 active:scale-95 transition-all focus:outline-none focus:ring-2 focus:ring-purple-400 cursor-pointer"
          aria-label={isAr ? 'استشارة تقنية ومساعدة' : 'Tech Support & Advice'}
        >
          {/* Pulsing Dot */}
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-400"></span>
          </span>

          <MessageCircle className="w-5 h-5" />
          <span className="hidden sm:inline-block">
            {isAr ? 'استشارة تقنية فورية' : 'Tech Advice'}
          </span>

          <ChevronUp
            className={`w-4 h-4 transition-transform duration-200 ${
              isOpen ? 'rotate-180' : ''
            }`}
          />
        </button>

        <button
          type="button"
          onClick={handleDismiss}
          className="w-11 h-11 rounded-full bg-white/95 dark:bg-[#151022]/95 hover:bg-red-50 dark:hover:bg-red-950/30 text-gray-400 hover:text-red-500 dark:text-gray-400 dark:hover:text-red-400 border border-purple-200/60 dark:border-white/10 shadow-xl shadow-purple-950/15 flex items-center justify-center transition-all hover:scale-105 active:scale-95 cursor-pointer backdrop-blur-md shrink-0"
          title={isAr ? 'إخفاء لمدة 24 ساعة' : 'Hide for 24 hours'}
          aria-label={isAr ? 'إخفاء زر الاستشارة لمدة 24 ساعة' : 'Hide support button for 24 hours'}
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

