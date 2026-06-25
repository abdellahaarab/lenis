import { useEffect } from 'react'
import { useLenis } from '@/hooks/useLenis'
import Navigation from '@/components/layout/Navigation'
import ProgressBar from '@/components/layout/ProgressBar'
import Footer from '@/components/layout/Footer'
import CursorFollower from '@/components/ui/CursorFollower'
import Hero from '@/components/sections/Hero'
import WhyLenis from '@/components/sections/WhyLenis'
import InteractiveDemo from '@/components/sections/InteractiveDemo'
import Features from '@/components/sections/Features'
import Showcase from '@/components/sections/Showcase'
import Performance from '@/components/sections/Performance'
import Testimonials from '@/components/sections/Testimonials'
import OpenSource from '@/components/sections/OpenSource'
import FinalCTA from '@/components/sections/FinalCTA'

export default function App() {
  useLenis()

  useEffect(() => {
    const handleReducedMotion = (e: MediaQueryListEvent) => {
      document.documentElement.style.setProperty(
        '--animation-duration',
        e.matches ? '0.01ms' : '1ms'
      )
    }

    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    mq.addEventListener('change', handleReducedMotion)
    return () => mq.removeEventListener('change', handleReducedMotion)
  }, [])

  return (
    <div className="relative bg-black min-h-screen">
      {/* Global overlays */}
      <CursorFollower />
      <ProgressBar />
      <Navigation />

      {/* Page sections */}
      <main>
        <Hero />
        <WhyLenis />
        <Features />
        <InteractiveDemo />
        <Showcase />
        <Performance />
        <Testimonials />
        <OpenSource />
        <FinalCTA />
      </main>

      <Footer />
    </div>
  )
}
