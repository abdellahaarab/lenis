import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import * as Dialog from '@radix-ui/react-dialog'
import {
  X,
  Globe,
  Sun,
  Moon,
  ShieldCheck,
  MapPin,
  Phone,
  Clock,
  ExternalLink,
  Building2,
  ShoppingBag,
  ChevronDown
} from 'lucide-react'
import { useCatalog, useHomeImage } from '@/data/CatalogContext'
import { useLanguage } from '@/i18n/LanguageContext'
import { useTheme } from '@/i18n/ThemeContext'
import { trackWhatsappClick } from '@/analytics'

export default function Footer() {
  const { site: siteData, categories: managedCategories } = useCatalog()
  const { t, language, toggleLanguage, dir } = useLanguage()
  const { toggleTheme, isDark } = useTheme()
  const logoUrl = useHomeImage('logo', '/logo.webp')

  // Mobile Accordion state: keep sections collapsed by default on mobile for sleek, compact experience
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({})

  const toggleSection = (key: string) => {
    setOpenSections((prev) => ({
      ...prev,
      [key]: !prev[key]
    }))
  }

  const isAr = language === 'ar'
  const categories = managedCategories.map((c) => ({
    id: c.slug,
    label: c.title[language] || c.title.ar
  }))

  const storePhone = siteData.phone || ''
  const storeWhatsapp = siteData.whatsapp || ''
  const storeCity = siteData.city[language] || siteData.city.ar || (isAr ? 'صنعاء، اليمن' : "Sana'a, Yemen")
  const storeAddress = siteData.address?.[language] || (isAr ? 'العنوان قيد الاعتماد' : 'Address pending confirmation')
  const workingHours = siteData.workingHours?.[language] || (isAr ? 'ساعات العمل قيد الاعتماد' : 'Opening hours pending confirmation')

  return (
    <footer
      className="bg-[#FAF8FF] dark:bg-[#07050B] text-[#110D20] dark:text-[#F8F7FC] border-t border-purple-100 dark:border-white/10 transition-colors duration-300"
      dir={dir}
    >
      {/* Store contact details and footer navigation */}
      <div className="container mx-auto px-4 md:px-6 pt-7 md:pt-14 pb-8 md:pb-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-5 md:gap-10">
          {/* Column 1: Brand & Contact Identity (4 cols) */}
          <div className="lg:col-span-4 flex flex-col gap-3 md:gap-4">
            <Link to={`/${language}`} className="flex items-center gap-2.5">
              {logoUrl && (
                <img
                  src={logoUrl}
                  alt=""
                  aria-hidden="true"
                  className="h-8 md:h-10 w-auto object-contain"
                />
              )}
              <div>
                <span className="text-lg md:text-xl font-black text-gray-900 dark:text-white block leading-tight">
                  {siteData.storeName[language] || siteData.storeName.ar}
                </span>
                <span className="text-[11px] md:text-xs font-semibold text-purple-600 dark:text-purple-400">
                  {isAr ? 'متجر إلكترونيات في صنعاء' : 'Electronics store in Sana’a'}
                </span>
              </div>
            </Link>

            <p className="text-gray-600 dark:text-gray-300 text-xs md:text-sm leading-relaxed max-w-sm">
              {isAr
                ? 'تصفح منتجات المتجر وفئات الإلكترونيات المتاحة.'
                : 'Browse the store catalog and its electronics categories.'}
              <span className="hidden sm:inline">
                {' '}
                {isAr ? 'يمكنك زيارة المتجر في صنعاء أو التواصل معنا.' : 'Visit the store in Sana’a or contact us.'}
              </span>
            </p>

            <div className="space-y-1.5 md:space-y-2 text-xs text-gray-600 dark:text-gray-400">
              <div className="flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                <span className="truncate">{storeCity} — {storeAddress}</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <a href={storePhone ? `tel:${storePhone.replace(/\s+/g, '')}` : undefined} aria-disabled={!storePhone} className="hover:text-purple-600 font-mono" dir="ltr">
                  {storePhone || (isAr ? 'الرقم قيد الاعتماد' : 'Phone pending confirmation')}
                </a>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                <span>{workingHours}</span>
              </div>
            </div>
          </div>

          {/* Column 2: Shop Catalog (Accordion on mobile, column on desktop) */}
          <div className="lg:col-span-2 border-t md:border-t-0 border-purple-100/60 dark:border-white/5 pt-3 md:pt-0">
            <button
              type="button"
              onClick={() => toggleSection('shop')}
              className="w-full flex items-center justify-between py-1.5 md:py-0 md:cursor-default text-start"
              aria-expanded={openSections['shop']}
            >
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-900 dark:text-white flex items-center gap-1.5">
                <ShoppingBag className="w-3.5 h-3.5 text-purple-600" />
                <span>{t.shop.title}</span>
              </h3>
              <ChevronDown
                className={`w-4 h-4 text-gray-400 md:hidden transition-transform duration-200 ${
                  openSections['shop'] ? 'rotate-180 text-purple-600' : ''
                }`}
              />
            </button>
            <div className={`${openSections['shop'] ? 'block' : 'hidden'} md:block pt-3 md:pt-3`}>
              <ul className="flex flex-col gap-2.5 text-xs text-gray-600 dark:text-gray-400">
                <li>
                  <Link
                    to={`/${language}/shop`}
                    className="hover:text-purple-600 dark:hover:text-purple-400 font-medium transition-colors"
                  >
                    {t.shop.allCategories}
                  </Link>
                </li>
                {categories.map((c) => (
                  <li key={c.id}>
                    <Link
                      to={`/${language}/shop/${c.id}`}
                      className="hover:text-purple-600 dark:hover:text-purple-400 font-medium transition-colors"
                    >
                      {c.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Column 3: Customer Care & Warranty (Accordion on mobile) */}
          <div className="lg:col-span-2 border-t md:border-t-0 border-purple-100/60 dark:border-white/5 pt-3 md:pt-0">
            <button
              type="button"
              onClick={() => toggleSection('care')}
              className="w-full flex items-center justify-between py-1.5 md:py-0 md:cursor-default text-start"
              aria-expanded={openSections['care']}
            >
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-900 dark:text-white flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-purple-600" />
                <span>{isAr ? 'الضمان والخدمات' : 'Care & Warranty'}</span>
              </h3>
              <ChevronDown
                className={`w-4 h-4 text-gray-400 md:hidden transition-transform duration-200 ${
                  openSections['care'] ? 'rotate-180 text-purple-600' : ''
                }`}
              />
            </button>
            <div className={`${openSections['care'] ? 'block' : 'hidden'} md:block pt-3 md:pt-3`}>
              <ul className="flex flex-col gap-2.5 text-xs text-gray-600 dark:text-gray-400">
                <li>
                  <Link
                    to={`/${language}/warranty`}
                    className="hover:text-purple-600 dark:hover:text-purple-400 font-medium transition-colors"
                  >
                    {isAr ? 'فحص الـ 7 نقاط والضمان' : '7-Point & Warranty'}
                  </Link>
                </li>
                <li>
                  <Link
                    to={`/${language}/account`}
                    className="hover:text-purple-600 dark:hover:text-purple-400 font-medium transition-colors"
                  >
                    {isAr ? 'تتبع الطلبات وحسابي' : 'Track Orders & Account'}
                  </Link>
                </li>
                <li>
                  <Link
                    to={`/${language}/faq`}
                    className="hover:text-purple-600 dark:hover:text-purple-400 font-medium transition-colors"
                  >
                    {isAr ? 'الأسئلة الشائعة' : 'FAQ'}
                  </Link>
                </li>
                {/* <li>
                  <Link
                    to={`/${language}/contact`}
                    className="hover:text-purple-600 dark:hover:text-purple-400 font-medium transition-colors"
                  >
                    {t.nav.contactUs}
                  </Link>
                </li> */}
              </ul>
            </div>
          </div>

          {/* Column 4: Corporate & Company (Accordion on mobile) */}
          <div className="lg:col-span-2 border-t md:border-t-0 border-purple-100/60 dark:border-white/5 pt-3 md:pt-0">
            <button
              type="button"
              onClick={() => toggleSection('company')}
              className="w-full flex items-center justify-between py-1.5 md:py-0 md:cursor-default text-start"
              aria-expanded={openSections['company']}
            >
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-900 dark:text-white flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-purple-600" />
                <span>{isAr ? 'حلول ومعلومات' : 'Company & B2B'}</span>
              </h3>
              <ChevronDown
                className={`w-4 h-4 text-gray-400 md:hidden transition-transform duration-200 ${
                  openSections['company'] ? 'rotate-180 text-purple-600' : ''
                }`}
              />
            </button>
            <div className={`${openSections['company'] ? 'block' : 'hidden'} md:block pt-3 md:pt-3`}>
              <ul className="flex flex-col gap-2.5 text-xs text-gray-600 dark:text-gray-400">
                <li>
                  <Link
                    to={`/${language}/about`}
                    className="hover:text-purple-600 dark:hover:text-purple-400 font-medium transition-colors"
                  >
                    {isAr ? 'عن الجيل العربي' : 'About Us'}
                  </Link>
                </li>
                {/* <li>
                  <Link
                    to={`/${language}/business`}
                    className="hover:text-purple-600 dark:hover:text-purple-400 font-medium transition-colors"
                  >
                    {isAr ? 'حلول الشركات والكميات' : 'B2B Solutions'}
                  </Link>
                </li> */}
                {/* <li>
                  <Link
                    to={`/${language}/compare`}
                    className="hover:text-purple-600 dark:hover:text-purple-400 font-medium transition-colors"
                  >
                    {isAr ? 'أداة مقارنة المواصفات' : 'Compare Tool'}
                  </Link>
                </li> */}
                <li>
                  <Link
                    to={`/${language}/legal`}
                    className="hover:text-purple-600 dark:hover:text-purple-400 font-medium transition-colors"
                  >
                    {isAr ? 'الشروط والسياسات' : 'Legal & Privacy'}
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          {/* Column 5: WhatsApp Direct Assistance */}
          <div className="lg:col-span-2">
            {/* Desktop Card */}
            <div className="hidden lg:flex p-4 rounded-2xl bg-gradient-to-br from-purple-500/10 to-indigo-500/10 border border-purple-500/20 text-center flex-col items-center">
              <div className="w-10 h-10 rounded-full bg-emerald-500 text-white flex items-center justify-center mb-2 shadow-md shadow-emerald-500/30">
                <Phone className="w-5 h-5" />
              </div>
              <h4 className="text-xs font-bold text-gray-900 dark:text-white">
                {isAr ? 'سؤال عن أحد المنتجات؟' : 'Questions about a product?'}
              </h4>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">
                {isAr ? 'تواصل مع المتجر عبر واتساب' : 'Contact the store on WhatsApp'}
              </p>
              <a
                href={storeWhatsapp ? `https://wa.me/${storeWhatsapp.replace(/\D/g, '')}` : undefined} aria-disabled={!storeWhatsapp}
                target="_blank"
                rel="noreferrer"
                onClick={() => trackWhatsappClick()}
                className="mt-3 w-full py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1.5"
              >
                <span>{isAr ? 'محادثة واتساب' : 'WhatsApp Chat'}</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>

            {/* Mobile Banner */}
            <div className="lg:hidden border-t border-purple-100/60 dark:border-white/5 pt-3">
              <a
                href={storeWhatsapp ? `https://wa.me/${storeWhatsapp.replace(/\D/g, '')}` : undefined} aria-disabled={!storeWhatsapp}
                target="_blank"
                rel="noreferrer"
                onClick={() => trackWhatsappClick()}
                className="w-full py-2.5 px-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-sm flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-emerald-200" />
                <span>{isAr ? 'تواصل مع المتجر عبر واتساب' : 'Contact the store on WhatsApp'}</span>
                </div>
                <ExternalLink className="w-3.5 h-3.5 text-emerald-200" />
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Bottom Sub-Footer Bar */}
      <div className="border-t border-purple-100 dark:border-white/10 bg-purple-50/30 dark:bg-white/[0.01]">
        <div className="container mx-auto px-4 md:px-6 py-5 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-gray-500 dark:text-gray-400">
          {/* Copyright & Demo Notice */}
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-2.5 text-center md:text-start">
            <span>
              © {new Date().getFullYear()} {isAr ? 'شركة الجيل العربي الرقمي' : 'Al-Jeel Al-Arabi Digital'}. {isAr ? 'جميع الحقوق محفوظة.' : 'All rights reserved.'}
            </span>
          </div>

          {/* Payment & Trust Badges */}
          <div className="flex items-center justify-center gap-1.5 flex-wrap">
            <span className="px-2 py-0.5 rounded-md bg-gray-200/60 dark:bg-white/5 text-[10px] font-bold text-gray-700 dark:text-gray-300">
              {isAr ? 'كتالوج المنتجات' : 'Product catalog'}
            </span>
            <span className="px-2 py-0.5 rounded-md bg-gray-200/60 dark:bg-white/5 text-[10px] font-bold text-gray-700 dark:text-gray-300">
              {isAr ? 'تواصل مع المتجر' : 'Contact the store'}
            </span>
            <span className="px-2 py-0.5 rounded-md bg-gray-200/60 dark:bg-white/5 text-[10px] font-bold text-gray-700 dark:text-gray-300">
              {storeCity}
            </span>
          </div>

          {/* Quick Actions (Language & Theme) */}
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={toggleLanguage}
              className="flex items-center gap-1.5 hover:text-purple-600 dark:hover:text-purple-400 transition-colors font-medium"
              aria-label={t.nav.switchLanguage || 'Toggle language'}
            >
              <Globe className="w-3.5 h-3.5 text-purple-600" />
              <span>{language === 'ar' ? 'English' : 'العربية'}</span>
            </button>

            <div className="h-3 w-px bg-gray-300 dark:bg-white/10" />

            <button
              onClick={toggleTheme}
              className="flex items-center gap-1.5 hover:text-purple-600 dark:hover:text-purple-400 transition-colors font-medium"
              aria-label="Toggle theme"
            >
              {isDark ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5 text-purple-600" />}
              <span>{isDark ? (isAr ? 'نهاري' : 'Light') : (isAr ? 'ليلي' : 'Dark')}</span>
            </button>
          </div>
        </div>
      </div>
    </footer>
  )
}

