import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { lazy, Suspense, useEffect } from 'react'
import { useLenis } from '@/hooks/useLenis'
import Navigation from '@/components/layout/Navigation'
import ProgressBar from '@/components/layout/ProgressBar'
import Footer from '@/components/layout/Footer'
import ScrollToTop from '@/components/layout/ScrollToTop'
import HomePage from '@/pages/HomePage'
import {CatalogProvider} from '@/data/CatalogContext'
import TechConcierge from '@/components/layout/TechConcierge'
import { AuthProvider } from '@/data/AuthContext'
import { trackPageView } from '@/analytics'

function AnalyticsRouteTracker() {
  const location = useLocation()
  useEffect(() => {
    trackPageView()
  }, [location.pathname])
  return null
}

const ShopPage = lazy(() => import('@/pages/ShopPage'))
const CartPage = lazy(() => import('@/pages/CartPage'))
const CustomerPage = lazy(() => import('@/pages/CustomerPage'))
const OrderPage = lazy(() => import('@/pages/OrderPage'))
const PackagesPage = lazy(() => import('@/pages/PackagesPage'))
const ProductDetailPage = lazy(() => import('@/pages/ProductDetailPage'))
const WarrantyPage = lazy(() => import('@/pages/WarrantyPage'))
const FAQPage = lazy(() => import('@/pages/FAQPage'))
const AboutPage = lazy(() => import('@/pages/AboutPage'))
const ContactPage = lazy(() => import('@/pages/ContactPage'))
const BusinessPage = lazy(() => import('@/pages/BusinessPage'))
// const ComparePage = lazy(() => import('@/pages/ComparePage'))
const LegalPage = lazy(() => import('@/pages/LegalPage'))
const ExpoContestPage = lazy(() => import('@/pages/ExpoContestPage'))
const CollectionPage = lazy(() => import('@/pages/CollectionPage'))
const OffersPage = lazy(() => import('@/pages/OffersPage'))

export default function App() {
  useLenis()

  return (
    <CatalogProvider>
      <AuthProvider>
        <div className="relative min-h-screen">
          <AnalyticsRouteTracker />
          <ScrollToTop />
          <ProgressBar />
          <Navigation />

      <Suspense fallback={<main id="main-content" className="page-shell" style={{ minHeight:'100svh', paddingTop:140 }} aria-busy="true" />}><Routes>
        <Route path="/" element={<Navigate to="/ar" replace />} />
        <Route path="/:lang" element={<HomePage />} />
        
        {/* Phase 1 Routes */}
        <Route path="/:lang/shop" element={<ShopPage />} />
        <Route path="/:lang/laptops" element={<ShopPage initialCategory="laptops" />} />
        <Route path="/:lang/bundles" element={<PackagesPage />} />
        <Route path="/:lang/setups" element={<PackagesPage />} />
        <Route path="/:lang/offers" element={<OffersPage />} />
        <Route path="/:lang/collections" element={<OffersPage />} />
        <Route path="/:lang/collection/:slug" element={<CollectionPage />} />
        <Route path="/:lang/collections/:slug" element={<CollectionPage />} />
        <Route path="/:lang/offers/:slug" element={<CollectionPage />} />
        <Route path="/:lang/shop/:category" element={<ShopPage />} />
        <Route path="/:lang/shop/:category/:slug" element={<ProductDetailPage />} />
        <Route path="/:lang/cart" element={<CartPage />} />
        <Route path="/:lang/account" element={<CustomerPage />} />
        <Route path="/:lang/orders/:id" element={<OrderPage />} />

        {/* Phase 2 Routes */}
        <Route path="/:lang/warranty" element={<WarrantyPage />} />
        <Route path="/:lang/warranty/:subtab" element={<WarrantyPage />} />
        <Route path="/:lang/faq" element={<FAQPage />} />
        <Route path="/:lang/about" element={<AboutPage />} />
        {/* تم إخفاء صفحة contact مؤقتاً وتوجيهها للرئيسية */}
        <Route path="/:lang/contact" element={<Navigate to="/ar" replace />} />

        {/* Phase 3 & Extended Routes */}
        {/* تم إخفاء صفحة business مؤقتاً وتوجيهها للرئيسية */}
        <Route path="/:lang/business" element={<Navigate to="/ar" replace />} />
        <Route path="/:lang/projects" element={<BusinessPage />} />
        <Route path="/:lang/tenders" element={<BusinessPage />} />
        {/* تم إخفاء صفحة المقارنة مؤقتاً لنطورها في ما بعد */}
        <Route path="/:lang/compare" element={<Navigate to="/ar" replace />} />
        <Route path="/:lang/legal" element={<LegalPage />} />
        <Route path="/:lang/expo" element={<ExpoContestPage />} />
        <Route path="/:lang/contest" element={<ExpoContestPage />} />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/ar" replace />} />
      </Routes></Suspense>

      <TechConcierge />
      <Footer />
        </div>
      </AuthProvider>
    </CatalogProvider>
  )
}
