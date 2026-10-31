import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useLanguage } from '@/i18n/LanguageContext'
import { useTheme } from '@/i18n/ThemeContext'
import { useAuth } from '@/data/AuthContext'
import { useCatalog, useHomeImage } from '@/data/CatalogContext'
import { trackWhatsappClick } from '@/analytics'
import { shopApi, type SearchSuggestions } from '@/data/commerce'
import {
  Menu,
  X,
  Globe,
  Sun,
  Moon,
  ShoppingBag,
  User,
  UserPlus,
  LogIn,
  LogOut,
  Search,
  ChevronDown,
  ShieldCheck,
  CheckCircle2,
  Phone,
  Laptop,
  Briefcase,
  Scale,
  HelpCircle,
  Info,
  Sparkles,
  MapPin,
  ExternalLink,
  Flame,
} from 'lucide-react'
import { scrollTo as scrollPage, setScrollLocked } from '@/hooks/useLenis'
import SkipLink from './SkipLink'
import AuthModal from './AuthModal'

export default function Navigation() {
  const { t, language, toggleLanguage, dir } = useLanguage()
  const { toggleTheme, isDark } = useTheme()
  const { customer, cartCount, openAuthModal, logout } = useAuth()
  const logoUrl = useHomeImage('logo', '/logo.webp')
  
  // Safe catalog access
  const siteData = useCatalog().site;

  const [isOpen, setIsOpen] = useState(false)
  const [isScrolled, setIsScrolled] = useState(false)
  const [activeSection, setActiveSection] = useState('')
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [moreMenuOpen, setMoreMenuOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [headerSearchOpen, setHeaderSearchOpen] = useState(false)
  const [headerSuggestions, setHeaderSuggestions] = useState<SearchSuggestions>({ items: [], categories: [] })
  const [headerSearchLoading, setHeaderSearchLoading] = useState(false)
  const [headerSearchFilter, setHeaderSearchFilter] = useState<'all' | 'products' | 'categories'>('all')
  const [hasOffers, setHasOffers] = useState(false)
  const [offersCount, setOffersCount] = useState(0)

  useEffect(() => {
    let active = true
    fetch('/api/shop/collections')
      .then(res => (res.ok ? res.json() : null))
      .then(data => {
        if (active && Array.isArray(data?.items) && data.items.length > 0) {
          setHasOffers(true)
          setOffersCount(data.items.length)
        }
      })
      .catch(() => {})
    return () => {
      active = false
    }
  }, [])

  const menuButtonRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const userMenuRef = useRef<HTMLDivElement>(null)
  const moreMenuRef = useRef<HTMLLIElement>(null)
  const location = useLocation()
  const navigate = useNavigate()
  const headerSearchInputRef = useRef<HTMLInputElement>(null)

  const isAr = language === 'ar'
  const isHomePage = location.pathname === `/${language}` || location.pathname === `/${language}/` || location.pathname === '/'

  const [isPromoDismissed, setIsPromoDismissed] = useState(() => {
    try {
      const hideUntil = localStorage.getItem('hide_promo_bar_until')
      if (hideUntil) {
        const expiry = parseInt(hideUntil, 10)
        if (!isNaN(expiry) && Date.now() < expiry) {
          return true
        }
      }
    } catch {
      // localStorage may be unavailable or disabled
    }
    return false
  })

  const handleDismissPromo = () => {
    setIsPromoDismissed(true)
    try {
      localStorage.setItem('hide_promo_bar_until', (Date.now() + 24 * 60 * 60 * 1000).toString())
    } catch {
      // ignore
    }
  }

  const getCartCountAria = (count: number, isArabic: boolean) => {
    if (!isArabic) return `Cart (${count} ${count === 1 ? 'item' : 'items'})`;
    if (count === 0) return 'سلة المشتريات (فارغة)';
    if (count === 1) return 'سلة المشتريات (منتج واحد)';
    if (count === 2) return 'سلة المشتريات (منتجان)';
    if (count >= 3 && count <= 10) return `سلة المشتريات (${count} منتجات)`;
    return `سلة المشتريات (${count} منتجاً)`;
  };

  // Primary desktop navigation links (concise, high-priority, zero-wrapping)
  const primaryNavLinks = [
    { id: 'shop', label: isAr ? 'المتجر' : 'Shop', path: `/${language}/shop`, isRoute: true, icon: Laptop },
    { id: 'offers', label: isAr ? 'العروض' : 'Offers', path: `/${language}/offers`, isRoute: true, icon: Flame, isPromo: true },
    // { id: 'business', label: isAr ? 'حلول الشركات' : 'Business', path: `/${language}/business`, isRoute: true, icon: Briefcase }, // مخفي مؤقتاً
  ]

  // Secondary utility links housed under "المزيد" dropdown on desktop to prevent overcrowding
  const secondaryNavLinks = [
    { id: 'warranty', label: isAr ? 'الضمان والفحص' : 'Warranty', path: `/${language}/warranty`, isRoute: true, icon: ShieldCheck },
    // { id: 'compare', label: isAr ? 'أداة المقارنة' : 'Compare', path: `/${language}/compare`, isRoute: true, icon: Scale }, // مخفي مؤقتاً
    { id: 'about', label: isAr ? 'من نحن' : 'About', path: `/${language}/about`, isRoute: true, icon: Info },
    // { id: 'contact', label: t.nav.contactUs, path: `/${language}/contact`, isRoute: true, icon: Phone } // مخفي مؤقتاً
  ]

  // Combined links for mobile drawer
  const allNavLinks = [...primaryNavLinks, ...secondaryNavLinks]

  const handleScroll = useCallback(() => {
    setIsScrolled(window.scrollY > 40)

    if (!isHomePage) return

    const sections = ['hero', 'categories', 'trust', 'faq']
    let current = ''
    for (const section of sections) {
      const el = document.getElementById(section)
      if (el && el.getBoundingClientRect().top <= 100) {
        current = section
      }
    }
    setActiveSection(current)
  }, [isHomePage])

  useEffect(() => {
    handleScroll()
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [handleScroll])

  // Close menus on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false)
      }
      if (moreMenuRef.current && !moreMenuRef.current.contains(e.target as Node)) {
        setMoreMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [])

  // Lock scroll on mobile menu open
  useEffect(() => {
    setScrollLocked(isOpen)
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }

    const focusTimer = isOpen ? window.setTimeout(() => menuRef.current?.querySelector<HTMLButtonElement>('button')?.focus(), 0) : undefined
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Tab' && isOpen) {
        const focusable = menuRef.current?.querySelectorAll<HTMLElement>('a[href], button')
        if (focusable?.length) {
          const first = focusable[0], last = focusable[focusable.length - 1]
          if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
          else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
        }
      }
      if (e.key === 'Escape') {
        if (headerSearchOpen) {
          setHeaderSearchOpen(false)
        }
        if (isOpen) {
          setIsOpen(false)
          menuButtonRef.current?.focus()
        }
        setUserMenuOpen(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.clearTimeout(focusTimer)
      window.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
      setScrollLocked(false)
    }
  }, [isOpen, headerSearchOpen])

  const handleNavClick = (link: typeof allNavLinks[0], e?: React.MouseEvent) => {
    setIsOpen(false)
    if (link.isRoute) return

    e?.preventDefault()
    if (isHomePage) {
      window.history.replaceState(null, '', `#${link.id}`)
      requestAnimationFrame(() => scrollPage(`#${link.id}`, { offset: 0 }))
    } else {
      navigate(`/${language}#${link.id}`)
    }
  }

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!searchQuery.trim()) return
    navigate(`/${language}/shop?q=${encodeURIComponent(searchQuery.trim())}`)
    setHeaderSearchOpen(false)
    setIsOpen(false)
  }

  useEffect(() => {
    if (!headerSearchOpen || searchQuery.trim().length < 2) {
      setHeaderSuggestions({ items: [], categories: [] })
      setHeaderSearchLoading(false)
      return
    }
    let active = true
    const timer = window.setTimeout(() => {
      setHeaderSearchLoading(true)
      shopApi<SearchSuggestions>(`/suggestions?q=${encodeURIComponent(searchQuery.trim())}&lang=${language}`)
        .then(result => { if (active) setHeaderSuggestions(result) })
        .catch(() => { if (active) setHeaderSuggestions({ items: [], categories: [] }) })
        .finally(() => { if (active) setHeaderSearchLoading(false) })
    }, 220)
    return () => { active = false; window.clearTimeout(timer) }
  }, [headerSearchOpen, searchQuery, language])

  useEffect(() => {
    if (!headerSearchOpen) return
    const frame = window.requestAnimationFrame(() => headerSearchInputRef.current?.focus())
    return () => window.cancelAnimationFrame(frame)
  }, [headerSearchOpen])

  const textColor = isDark ? 'text-white' : 'text-[#17131F]'
  const storePhone = siteData?.phone || ''
  const storeCity = siteData?.city?.[language] || (isAr ? 'صنعاء، اليمن' : 'Sana\'a, Yemen')

  return (
    <>
      <SkipLink />
      <AuthModal />

      <header
        className={`site-nav fixed top-0 start-0 end-0 z-[90] transition-all duration-300 ${
          isScrolled
            ? 'bg-white/95 dark:bg-[#0B0B0F]/95 backdrop-blur-xl shadow-md shadow-black/5 dark:shadow-black/30'
            : 'bg-white/80 dark:bg-[#0B0B0F]/80 backdrop-blur-md'
        }`}
      >
        {/* Top Announcement & Service Bar (Only on home page, hides smoothly on scroll, dismissible for 24h) */}
        {isHomePage && !isPromoDismissed && (
          <div
            className={`transition-all duration-300 overflow-hidden border-b border-purple-100/60 dark:border-white/5 ${
              isScrolled ? 'max-h-0 opacity-0 py-0' : 'max-h-12 opacity-100 py-2'
            } bg-gradient-to-r from-purple-900 via-indigo-900 to-purple-950 text-white text-xs sm:text-sm font-semibold`}
          >
            <div className="page-shell flex items-center justify-between gap-3 sm:gap-4">
              <div className="flex items-center gap-2 sm:gap-2.5 truncate min-w-0">
                {hasOffers ? (
                  <Link
                    to={`/${language}/offers`}
                    className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-gradient-to-r from-red-600 via-orange-500 to-amber-500 text-white shadow-sm hover:brightness-110 transition-all shrink-0 animate-pulse"
                  >
                    <Flame className="w-3.5 h-3.5 text-yellow-200 fill-yellow-200" />
                    <span>
                      {isAr
                        ? offersCount > 0
                          ? `عروض المتجر (${offersCount})`
                          : 'عروض المتجر'
                        : offersCount > 0
                          ? `Store offers (${offersCount})`
                          : 'Store offers'}
                    </span>
                  </Link>
                ) : (
                  <ShoppingBag className="h-4 w-4 shrink-0 text-purple-200" aria-hidden="true" />
                )}
                <span className="truncate hidden sm:inline">
                  {isAr
                    ? 'متجر إلكترونيات في صنعاء • تصفح المنتجات والفئات'
                    : 'Electronics store in Sana’a • Browse products and categories'}
                </span>
                <span className="truncate sm:hidden font-bold">
                  {!hasOffers && (isAr
                    ? 'متجر إلكترونيات · صنعاء'
                    : 'Electronics store · Sana’a')}
                </span>
              </div>

              <div className="flex items-center gap-2 sm:gap-4 shrink-0">
                <div className="hidden md:flex items-center gap-5 text-purple-200">
                  <div className="flex items-center gap-1.5 hover:text-white transition-colors">
                    <MapPin className="w-3.5 h-3.5 text-purple-400" />
                    <span>{storeCity}</span>
                  </div>
                  <a
                    href={storePhone ? `tel:${storePhone.replace(/\s+/g, '')}` : undefined} aria-disabled={!storePhone}
                    className="flex items-center gap-1.5 hover:text-white transition-colors"
                    dir="ltr"
                  >
                    <Phone className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{storePhone || (isAr ? 'الرقم قيد الاعتماد' : 'Phone pending confirmation')}</span>
                  </a>
                  <div className="h-3.5 w-px bg-purple-700/60" />
                  <button
                    onClick={toggleLanguage}
                    className="flex items-center gap-1.5 hover:text-white transition-colors cursor-pointer"
                    aria-label={t.nav.switchLanguage}
                  >
                    <Globe className="w-3.5 h-3.5 text-purple-400" />
                    <span>{language === 'ar' ? 'English' : 'العربية'}</span>
                  </button>
                </div>

                <div className="hidden md:block h-3.5 w-px bg-purple-700/60" />

                <button
                  type="button"
                  onClick={handleDismissPromo}
                  className="p-1 -me-1 text-purple-300 hover:text-white hover:bg-white/10 rounded transition-colors cursor-pointer inline-flex items-center justify-center shrink-0"
                  aria-label={isAr ? 'إغلاق الشريط الإعلاني' : 'Close announcement bar'}
                  title={isAr ? 'إخفاء لمدة 24 ساعة' : 'Hide for 24 hours'}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Main Navigation Bar */}
        <div className="page-shell">
          <div className="flex items-center justify-between gap-4 h-16 md:h-20 transition-all duration-300">
            {/* Logo */}
            <Link
              to={`/${language}`}
              className="flex items-center gap-2.5 shrink-0 focus:outline-none focus:ring-2 focus:ring-purple-500 rounded-xl group"
              aria-label={isAr ? 'متجر الجيل العربي الرقمي — الرئيسية' : 'Al-Jeel Al-Arabi Digital Store — Home'}
            >
              <div className="relative">
                {logoUrl && (
                  <img
                    src={logoUrl}
                    alt={isAr ? 'شعار متجر الجيل العربي الرقمي' : 'Al-Jeel Al-Arabi Digital Store Logo'}
                    className="nav-logo h-10 md:h-12 w-auto object-contain transition-transform group-hover:scale-105"
                    onError={(e) => {
                      ;(e.target as HTMLImageElement).style.display = 'none'
                    }}
                  />
                )}
              </div>
              <div className="nav-brand-wordmark flex flex-col items-start leading-tight">
                <div className="flex items-center gap-1.5">
                  <span className="nav-brand-name text-lg md:text-xl font-black text-purple-600 dark:text-purple-400">
                    {isAr ? 'متجر الجيل العربي' : 'Al-Jeel Al-Arabi'}
                  </span>
                  <span className="hidden sm:inline-block px-2 py-0.5 text-xs font-bold rounded-md bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 border border-purple-200/60 dark:border-purple-700/50">
                    {isAr ? 'متجر' : 'Store'}
                  </span>
                </div>
                <span className="text-xs md:text-sm font-bold text-gray-700 dark:text-gray-200">
                  {isAr ? 'الرقمي' : 'Digital'}
                </span>
              </div>
            </Link>

            {/* Desktop Navigation Links (Clean, No-Wrap, Spacious) */}
            <nav className="hidden lg:flex items-center gap-1 xl:gap-2 shrink-0" aria-label="Main Navigation">
              <ul className="flex items-center gap-1 xl:gap-1.5">
                {primaryNavLinks.map((link) => (
                  <li key={link.id}>
                    {link.isRoute ? (
                      <Link
                        to={link.path}
                        className={`text-sm xl:text-base font-bold whitespace-nowrap transition-all duration-200 px-3 py-2 rounded-lg hover:text-purple-600 inline-flex items-center gap-1.5 ${
                          (link.id === 'shop' && location.pathname.startsWith(`/${language}/shop`)) ||
                          (link.id === 'offers' && (location.pathname.startsWith(`/${language}/offers`) || location.pathname.startsWith(`/${language}/collection`))) ||
                          location.pathname === link.path
                            ? 'text-purple-600 dark:text-purple-400 font-bold bg-purple-50 dark:bg-purple-950/40'
                            : textColor
                        }`}
                      >
                        <span>{link.label}</span>

                      </Link>
                    ) : (
                      <a
                        href={link.path}
                        onClick={(e) => handleNavClick(link, e)}
                        className={`text-sm xl:text-base font-bold whitespace-nowrap transition-all duration-200 px-3 py-2 rounded-lg hover:text-purple-600 ${
                          activeSection === link.id
                            ? 'text-purple-600 dark:text-purple-400 font-bold bg-purple-50 dark:bg-purple-950/40'
                            : textColor
                        }`}
                      >
                        {link.label}
                      </a>
                    )}
                  </li>
                ))}

                {/* More dropdown for secondary links */}
                <li className="relative" ref={moreMenuRef}>
                  <button
                    onClick={() => setMoreMenuOpen(!moreMenuOpen)}
                    className={`text-sm xl:text-base font-bold whitespace-nowrap transition-all duration-200 px-3 py-2 rounded-lg inline-flex items-center gap-1.5 hover:text-purple-600 cursor-pointer ${
                      moreMenuOpen ? 'text-purple-600 bg-purple-50 dark:bg-purple-950/40' : textColor
                    }`}
                    aria-expanded={moreMenuOpen}
                  >
                    <span>{isAr ? 'المزيد' : 'More'}</span>
                    <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${moreMenuOpen ? 'rotate-180 text-purple-600' : ''}`} />
                  </button>

                  {moreMenuOpen && (
                    <div
                      className="absolute top-full mt-2 start-0 w-48 rounded-xl bg-white dark:bg-[#151022] border border-purple-100 dark:border-white/10 shadow-xl p-2 z-50 animate-in fade-in slide-in-from-top-1"
                      dir={dir}
                    >
                      {secondaryNavLinks.map((item) => (
                        <Link
                          key={item.id}
                          to={item.path}
                          onClick={() => setMoreMenuOpen(false)}
                          className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-bold hover:bg-purple-50 dark:hover:bg-white/5 hover:text-purple-600 transition-colors text-gray-700 dark:text-gray-200"
                        >
                          <item.icon className="w-4 h-4 text-purple-600 shrink-0" />
                          <span>{item.label}</span>
                        </Link>
                      ))}
                    </div>
                  )}
                </li>
              </ul>
            </nav>

            {/* Action Cluster (Search, Account / Sign In / Register, Cart, Theme) */}
            <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
              {/* Quick Search Input (Desktop) */}
              <form
                onSubmit={handleSearchSubmit}
                className="hidden xl:flex items-center relative w-40 2xl:w-52"
              >
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={isAr ? 'بحث سريع...' : 'Quick search...'}
                  className="w-full ps-8 pe-3 py-2 text-sm rounded-full border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-600 transition-all placeholder:text-gray-400"
                />
                <Search className="w-4 h-4 absolute top-1/2 -translate-y-1/2 start-2.5 text-gray-400" />
              </form>

              {/* Quick Search Icon for Tablets & Lg Screens */}
              <button
                type="button"
                onClick={() => setHeaderSearchOpen(open => !open)}
                className="xl:hidden p-2 sm:p-2.5 rounded-xl border border-gray-200/80 dark:border-white/10 bg-white/70 dark:bg-white/5 text-gray-700 dark:text-gray-200 hover:text-purple-600 transition-all"
                title={isAr ? 'البحث في المتجر' : 'Search Shop'}
                aria-label={isAr ? 'البحث' : 'Search'}
                aria-expanded={headerSearchOpen}
                aria-controls="header-search-panel"
              >
                <Search className="w-4 h-4" />
              </button>

              {/* Shopping Cart Button with Live Counter Badge */}
              <Link
                to={`/${language}/cart`}
                className="relative p-2.5 sm:p-3 rounded-xl border border-gray-200/80 dark:border-white/10 bg-white/70 dark:bg-white/5 hover:border-purple-300 dark:hover:border-purple-600 text-gray-700 dark:text-gray-200 hover:text-purple-600 transition-all"
                aria-label={getCartCountAria(cartCount, isAr)}
                title={isAr ? 'عربة التسوق' : 'Shopping Cart'}
              >
                <ShoppingBag className="w-5 h-5" />
                {cartCount > 0 && (
                  <span className="absolute -top-1.5 -end-1.5 min-w-[22px] h-5.5 px-1.5 bg-purple-600 text-white text-xs font-black rounded-full flex items-center justify-center shadow-md shadow-purple-600/40 animate-in zoom-in">
                    {cartCount > 99 ? '99+' : cartCount}
                  </span>
                )}
              </Link>

              {/* Global E-commerce Standard Account Module (Sign In / Register / My Account) */}
              {customer ? (
                /* Logged In User Dropdown */
                <div className="relative" ref={userMenuRef}>
                  <button
                    onClick={() => setUserMenuOpen(!userMenuOpen)}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl border border-purple-200 dark:border-purple-800/40 bg-purple-50/70 dark:bg-purple-950/30 hover:bg-purple-100 dark:hover:bg-purple-900/40 text-purple-900 dark:text-purple-100 transition-all text-sm font-bold cursor-pointer"
                    aria-expanded={userMenuOpen}
                    aria-label={isAr ? 'قائمة حسابي' : 'Account menu'}
                  >
                    <div className="w-7 h-7 rounded-full bg-purple-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
                      {customer.name ? customer.name[0].toUpperCase() : <User className="w-4 h-4" />}
                    </div>
                    <span className="hidden md:inline-block max-w-[95px] truncate whitespace-nowrap">
                      {isAr ? `أهلاً، ${customer.name.split(' ')[0]}` : customer.name.split(' ')[0]}
                    </span>
                    <ChevronDown className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  </button>

                  {userMenuOpen && (
                    <div
                      className={`absolute top-full mt-2 end-0 w-68 rounded-2xl bg-white dark:bg-[#151022] border border-purple-100 dark:border-white/10 shadow-2xl p-2.5 z-50 animate-in fade-in slide-in-from-top-2 text-[#17131F] dark:text-[#F8F7FC]`}
                      dir={dir}
                    >
                      <div className="p-3 border-b border-gray-100 dark:border-white/10">
                        <p className="text-sm font-bold truncate text-gray-900 dark:text-white">
                          {customer.name}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 font-mono mt-0.5" dir="ltr">
                          {customer.phone}
                        </p>
                        <div className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-0.5 rounded-full">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>{isAr ? 'حساب عميل مفعل' : 'Verified Customer'}</span>
                        </div>
                      </div>

                      <div className="py-1.5">
                        <Link
                          to={`/${language}/account`}
                          onClick={() => setUserMenuOpen(false)}
                          className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-bold hover:bg-purple-50 dark:hover:bg-white/5 transition-colors"
                        >
                          <User className="w-4 h-4 text-purple-600" />
                          <span>{isAr ? 'حسابي وطلباتي' : 'My Account & Orders'}</span>
                        </Link>
                        <Link
                          to={`/${language}/cart`}
                          onClick={() => setUserMenuOpen(false)}
                          className="flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-bold hover:bg-purple-50 dark:hover:bg-white/5 transition-colors"
                        >
                          <div className="flex items-center gap-2.5">
                            <ShoppingBag className="w-4 h-4 text-purple-600" />
                            <span>{isAr ? 'عربة التسوق' : 'Shopping Cart'}</span>
                          </div>
                          {cartCount > 0 && (
                            <span className="text-xs font-black px-2 py-0.5 rounded-full bg-purple-600 text-white">
                              {cartCount}
                            </span>
                          )}
                        </Link>
                        <Link
                          to={`/${language}/warranty`}
                          onClick={() => setUserMenuOpen(false)}
                          className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-bold hover:bg-purple-50 dark:hover:bg-white/5 transition-colors"
                        >
                          <ShieldCheck className="w-4 h-4 text-purple-600" />
                          <span>{isAr ? 'الضمان وشهادات الفحص' : 'Warranty & Inspection'}</span>
                        </Link>
                      </div>

                      <div className="pt-1.5 border-t border-gray-100 dark:border-white/10">
                        <button
                          onClick={() => {
                            setUserMenuOpen(false)
                            void logout()
                          }}
                          className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-bold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors cursor-pointer"
                        >
                          <LogOut className="w-4 h-4" />
                          <span>{isAr ? 'تسجيل الخروج' : 'Sign Out'}</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                /* Unauthenticated: Global standard Sign In & Create Account buttons */
                <div className="hidden sm:flex items-center gap-2">
                  <button
                    onClick={() => openAuthModal('login')}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-bold text-gray-700 dark:text-gray-200 hover:text-purple-600 dark:hover:text-purple-400 hover:bg-purple-50 dark:hover:bg-white/5 transition-all cursor-pointer"
                  >
                    <LogIn className="w-4 h-4" />
                    <span>{isAr ? 'دخول' : 'Sign In'}</span>
                  </button>

                  <button
                    onClick={() => openAuthModal('register')}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold text-white bg-purple-600 hover:bg-purple-700 active:scale-95 shadow-sm shadow-purple-600/30 transition-all cursor-pointer"
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>{isAr ? 'إنشاء حساب' : 'Register'}</span>
                  </button>
                </div>
              )}

              {/* Theme Toggle (Desktop) */}
              <button
                onClick={toggleTheme}
                className="hidden md:flex p-2.5 rounded-xl border border-gray-200/80 dark:border-white/10 bg-white/70 dark:bg-white/5 hover:border-purple-300 dark:hover:border-purple-600 text-gray-700 dark:text-gray-200 transition-all cursor-pointer"
                aria-label={isDark ? (isAr ? 'التبديل إلى الوضع النهاري' : 'Switch to light mode') : (isAr ? 'التبديل إلى الوضع الليلي' : 'Switch to dark mode')}
                title={isDark ? (isAr ? 'الوضع النهاري' : 'Light mode') : (isAr ? 'الوضع الليلي' : 'Dark mode')}
              >
                {isDark ? <Sun className="w-4.5 h-4.5 text-amber-400" /> : <Moon className="w-4.5 h-4.5 text-purple-600" />}
              </button>

              {/* Mobile Menu Trigger */}
              <button
                ref={menuButtonRef}
                onClick={() => setIsOpen(true)}
                className="p-2.5 rounded-xl border border-gray-200/80 dark:border-white/10 bg-white/70 dark:bg-white/5 text-gray-700 dark:text-gray-200 lg:hidden hover:text-purple-600 transition-all"
                aria-expanded={isOpen}
                aria-label={t.nav.toggleMenu || 'Open Menu'}
              >
                <Menu className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {isOpen && (
          <div
            className="fixed inset-0 z-[80] flex flex-col lg:hidden bg-white dark:bg-[#0B0B0F] animate-in fade-in"
            role="dialog"
            aria-modal="true"
            aria-label={isAr ? 'التنقل الرئيسي' : 'Main Navigation'}
            data-lenis-prevent
            ref={menuRef}
            dir={dir}
          >
            {/* Mobile Header Bar */}
            <div className="flex items-center justify-between p-5 border-b border-gray-200/60 dark:border-white/10">
              <Link
                to={`/${language}`}
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-2"
              >
                {logoUrl && <img src={logoUrl} alt="Logo" className="h-8 w-auto object-contain" />}
                <span className="text-base font-black text-purple-600 dark:text-purple-400">
                  {isAr ? 'متجر الجيل العربي الرقمي' : 'Al-Jeel Al-Arabi Digital Store'}
                </span>
              </Link>
              <button
                onClick={() => setIsOpen(false)}
                className="p-2 rounded-xl text-gray-500 hover:text-gray-900 dark:hover:text-white bg-gray-100 dark:bg-white/10 transition-colors"
                aria-label={isAr ? 'إغلاق القائمة' : 'Close Menu'}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Mobile Drawer Body */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
              {/* Account Quick Card in Mobile Drawer */}
              <div className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-br from-purple-50 to-indigo-50/50 dark:from-purple-950/40 dark:to-indigo-950/20 border border-purple-200/60 dark:border-purple-800/30">
                {customer ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-full bg-purple-600 text-white flex items-center justify-center font-bold text-sm">
                          {customer.name ? customer.name[0].toUpperCase() : <User className="w-4 h-4" />}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-gray-900 dark:text-white">{customer.name}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 font-mono" dir="ltr">
                            {customer.phone}
                          </p>
                        </div>
                      </div>
                      <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-100/60 dark:bg-emerald-950/60 px-2.5 py-0.5 rounded-full">
                        {isAr ? 'معتمد' : 'Verified'}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2.5 pt-2 border-t border-purple-200/50 dark:border-white/10">
                      <Link
                        to={`/${language}/account`}
                        onClick={() => setIsOpen(false)}
                        className="py-2.5 text-center text-sm font-bold rounded-xl bg-purple-600 text-white shadow-sm"
                      >
                        {isAr ? 'حسابي والطلبات' : 'My Account'}
                      </Link>
                      <button
                        onClick={() => {
                          setIsOpen(false)
                          void logout()
                        }}
                        className="py-2.5 text-center text-sm font-bold rounded-xl bg-red-100 dark:bg-red-950/40 text-red-600 dark:text-red-400 cursor-pointer"
                      >
                        {isAr ? 'تسجيل الخروج' : 'Sign Out'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <p className="text-sm font-bold text-purple-900 dark:text-purple-200 mb-1">
                      {isAr ? 'أهلاً بك في المتجر' : 'Welcome to the store'}
                    </p>
                    <p className="text-xs text-gray-600 dark:text-gray-300 mb-3">
                      {isAr
                        ? 'تابع طلباتك وضمانك بحسابك.'
                        : 'Track your orders and warranty from your account.'}
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => {
                          setIsOpen(false)
                          openAuthModal('login')
                        }}
                        className="py-2.5 text-sm font-bold rounded-xl bg-white dark:bg-white/10 border border-gray-200 dark:border-white/10 text-gray-800 dark:text-white cursor-pointer hover:border-purple-300 dark:hover:border-purple-700 transition-colors"
                      >
                        {isAr ? 'تسجيل الدخول' : 'Sign In'}
                      </button>
                      <button
                        onClick={() => {
                          setIsOpen(false)
                          openAuthModal('register')
                        }}
                        className="py-2.5 text-sm font-bold rounded-xl bg-purple-600 text-white shadow-sm shadow-purple-600/30 cursor-pointer hover:bg-purple-700 transition-colors"
                      >
                        {isAr ? 'إنشاء حساب جديد' : 'Register'}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Mobile Navigation Links */}
              <nav aria-label="Mobile Navigation">
                <ul className="space-y-1">
                  {allNavLinks.map((link) => {
                    const Icon = link.icon
                    const isActive =
                      (link.id === 'shop' && location.pathname.startsWith(`/${language}/shop`)) ||
                      location.pathname === link.path ||
                      activeSection === link.id

                    return (
                      <li key={link.id}>
                        {link.isRoute ? (
                          <Link
                            to={link.path}
                            onClick={() => setIsOpen(false)}
                            className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-sm sm:text-base font-semibold transition-colors ${
                              isActive
                                ? 'bg-purple-600 text-white shadow-sm shadow-purple-600/20'
                                : 'text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/5'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <Icon className={`w-[18px] h-[18px] ${isActive ? 'text-white' : 'text-purple-600'}`} />
                              <span>{link.label}</span>
                            </div>
                          </Link>
                        ) : (
                          <a
                            href={link.path}
                            onClick={(e) => handleNavClick(link, e)}
                            className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-sm sm:text-base font-semibold transition-colors ${
                              isActive
                                ? 'bg-purple-600 text-white'
                                : 'text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/5'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <Icon className={`w-[18px] h-[18px] ${isActive ? 'text-white' : 'text-purple-600'}`} />
                              <span>{link.label}</span>
                            </div>
                          </a>
                        )}
                      </li>
                    )
                  })}
                </ul>
              </nav>

              {/* Direct Support WhatsApp Banner */}
              <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-800/30 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-bold text-emerald-900 dark:text-emerald-200">
                    {isAr ? 'دعم واستشارات فورية' : 'Live Tech Consultation'}
                  </p>
                  <p className="text-xs sm:text-sm text-emerald-700 dark:text-emerald-400 mt-0.5">
                    {isAr ? 'تواصل مع مهندس المبيعات عبر واتساب' : 'Chat with technical sales engineer'}
                  </p>
                </div>
                <a
                  href={siteData.whatsapp ? `https://wa.me/${siteData.whatsapp.replace(/\D/g, '')}` : undefined} aria-disabled={!siteData.whatsapp}
                  target="_blank"
                  rel="noreferrer"
                  onClick={() => trackWhatsappClick()}
                  className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-bold shadow-sm shrink-0"
                >
                  {isAr ? 'واتساب' : 'WhatsApp'}
                </a>
              </div>
            </div>

            {/* Mobile Footer Toggles */}
            <div className="p-5 border-t border-gray-200/60 dark:border-white/10 flex items-center justify-between">
              <button
                onClick={toggleLanguage}
                className="flex items-center gap-2 text-sm font-bold text-gray-700 dark:text-gray-300 py-2.5 px-3.5 rounded-xl bg-gray-100 dark:bg-white/5 cursor-pointer"
              >
                <Globe className="w-4.5 h-4.5 text-purple-600" />
                <span>{language === 'ar' ? 'English' : 'العربية'}</span>
              </button>

              <button
                onClick={toggleTheme}
                className="flex items-center gap-2 text-sm font-bold text-gray-700 dark:text-gray-300 py-2.5 px-3.5 rounded-xl bg-gray-100 dark:bg-white/5 cursor-pointer"
              >
                {isDark ? <Sun className="w-4.5 h-4.5 text-amber-400" /> : <Moon className="w-4.5 h-4.5 text-purple-600" />}
                <span>{isDark ? (isAr ? 'الوضع النهاري' : 'Light Mode') : (isAr ? 'الوضع الليلي' : 'Dark Mode')}</span>
              </button>
            </div>
          </div>
        )}
        {headerSearchOpen && (
          <>
            <button className="header-search-backdrop" aria-label={isAr ? 'إغلاق البحث' : 'Close search'} onClick={() => setHeaderSearchOpen(false)} />
            <div id="header-search-panel" className="header-search-panel" dir={dir}>
              <form className="header-search-form" onSubmit={handleSearchSubmit}>
                <Search size={18} aria-hidden="true" />
                <input
                  ref={headerSearchInputRef}
                  value={searchQuery}
                  onChange={event => { setSearchQuery(event.target.value); setHeaderSearchFilter('all') }}
                  placeholder={isAr ? 'ابحث عن جهاز أو موديل أو SKU' : 'Search device, model, or SKU'}
                  aria-label={isAr ? 'ابحث عن جهاز أو موديل أو SKU' : 'Search device, model, or SKU'}
                  autoComplete="off"
                />
                {searchQuery && <button type="button" aria-label={isAr ? 'مسح البحث' : 'Clear search'} onClick={() => setSearchQuery('')}><X size={16} /></button>}
                <button type="submit" className="header-search-submit">{isAr ? 'بحث' : 'Search'}</button>
              </form>
              {searchQuery.trim().length >= 2 && (
                <div className="header-search-results">
                  <div className="header-search-caption">{isAr ? 'اقتراحات البحث' : 'Search suggestions'}</div>
                  <button type="button" className="header-search-exact" onClick={() => { navigate(`/${language}/shop?q=${encodeURIComponent(searchQuery.trim())}`); setHeaderSearchOpen(false) }}>
                    <Search size={16} /><span><small>{isAr ? 'ابحث عن' : 'Search for'}</small><strong dir="auto">{searchQuery.trim()}</strong></span><kbd>↵</kbd>
                  </button>
                  <div className="header-search-tabs" role="group" aria-label={isAr ? 'تصفية الاقتراحات' : 'Filter suggestions'}>
                    {([['all', isAr ? 'الكل' : 'All'], ['products', isAr ? 'المنتجات' : 'Products'], ['categories', isAr ? 'الفئات' : 'Categories']] as const).map(([value, label]) => (
                      <button key={value} type="button" aria-pressed={headerSearchFilter === value} className={headerSearchFilter === value ? 'is-active' : ''} onClick={() => setHeaderSearchFilter(value)}>{label}</button>
                    ))}
                  </div>
                  {headerSearchLoading ? <div className="header-search-empty">{isAr ? 'جارٍ البحث…' : 'Searching…'}</div> : (
                    <>
                      {headerSearchFilter !== 'categories' && headerSuggestions.items.slice(0, 6).map(item => (
                        <button key={`${item.category}-${item.value}`} type="button" className="header-search-result" onClick={() => { navigate(`/${language}/shop?q=${encodeURIComponent(item.value)}&category=${encodeURIComponent(item.category)}`); setHeaderSearchOpen(false) }}>
                          <Search size={15} /><span>{item.value}</span><small>{item.categoryTitle}</small>
                        </button>
                      ))}
                      {headerSearchFilter !== 'products' && headerSuggestions.categories.map(item => (
                        <button key={item.slug} type="button" className="header-search-result" onClick={() => { navigate(`/${language}/shop?category=${encodeURIComponent(item.slug)}`); setHeaderSearchOpen(false) }}>
                          <Search size={15} /><span>{item.title}</span><small>{item.count}</small>
                        </button>
                      ))}
                      {!headerSuggestions.items.length && !headerSuggestions.categories.length && !headerSearchLoading && <div className="header-search-empty">{isAr ? 'لا توجد اقتراحات مطابقة' : 'No matching suggestions'}</div>}
                    </>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </header>
    </>
  )
}

