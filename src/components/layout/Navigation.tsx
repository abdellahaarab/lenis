import { useState, useEffect, useRef } from 'react'
import { motion, useScroll, useMotionValueEvent } from 'framer-motion'
import { Github, Menu, X } from 'lucide-react'
import { scrollTo } from '@/hooks/useLenis'
import { cn } from '@/lib/utils'

const navLinks = [
  { label: 'Why Lenis', href: '#why' },
  { label: 'Features', href: '#features' },
  { label: 'Install', href: '#install' },
  { label: 'Showcase', href: '#showcase' },
  { label: 'Performance', href: '#performance' },
]

export default function Navigation() {
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const { scrollY } = useScroll()

  useMotionValueEvent(scrollY, 'change', (v) => {
    setScrolled(v > 40)
  })

  const handleNav = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    e.preventDefault()
    scrollTo(href, { offset: -80 })
    setMobileOpen(false)
  }

  return (
    <>
      <motion.header
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1], delay: 1.2 }}
        className={cn(
          'fixed top-0 left-0 right-0 z-50 transition-all duration-500',
          scrolled ? 'py-3' : 'py-5'
        )}
      >
        <div
          className={cn(
            'mx-4 md:mx-8 rounded-2xl transition-all duration-500',
            scrolled
              ? 'glass-strong shadow-2xl shadow-black/50'
              : 'bg-transparent'
          )}
        >
          <div className="flex items-center justify-between px-5 py-3">
            {/* Logo */}
            <a
              href="/"
              className="flex items-center gap-2.5 group"
              onClick={(e) => { e.preventDefault(); scrollTo(0) }}
            >
              <div className="relative">
                <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
                  <path d="M6 10 Q10 6 16 10 Q22 14 26 10" stroke="white" strokeWidth="2.5" strokeLinecap="round" fill="none" className="group-hover:stroke-purple-400 transition-colors duration-300" />
                  <path d="M6 16 Q10 12 16 16 Q22 20 26 16" stroke="white" strokeWidth="2.5" strokeLinecap="round" fill="none" opacity="0.6" className="group-hover:stroke-purple-400 transition-colors duration-300" />
                  <path d="M6 22 Q10 18 16 22 Q22 26 26 22" stroke="white" strokeWidth="2.5" strokeLinecap="round" fill="none" opacity="0.3" className="group-hover:stroke-purple-400 transition-colors duration-300" />
                </svg>
              </div>
              <span className="font-bold text-white text-lg tracking-tight group-hover:text-white/80 transition-colors">
                lenis
              </span>
              <span className="hidden sm:flex tag text-[10px] px-1.5 py-0.5">v1.3.4</span>
            </a>

            {/* Desktop nav */}
            <nav className="hidden md:flex items-center gap-1">
              {navLinks.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  onClick={(e) => handleNav(e, link.href)}
                  className="px-4 py-2 text-sm text-white/50 hover:text-white/90 rounded-xl hover:bg-white/5 transition-all duration-200"
                >
                  {link.label}
                </a>
              ))}
            </nav>

            {/* Right actions */}
            <div className="flex items-center gap-2">
              <a
                href="https://github.com/abdellahaarab/lenis"
                target="_blank"
                rel="noopener noreferrer"
                className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-xl text-sm text-white/60 hover:text-white hover:bg-white/5 transition-all duration-200"
              >
                <Github size={15} />
                <span className="font-mono text-xs">14.2K</span>
              </a>

              <a
                href="#install"
                onClick={(e) => handleNav(e, '#install')}
                className="btn-primary text-xs px-4 py-2 hidden sm:flex"
              >
                Get Started
              </a>

              <button
                onClick={() => setMobileOpen(!mobileOpen)}
                className="md:hidden p-2 rounded-xl text-white/60 hover:text-white hover:bg-white/5 transition-all"
                aria-label="Toggle menu"
              >
                {mobileOpen ? <X size={20} /> : <Menu size={20} />}
              </button>
            </div>
          </div>
        </div>
      </motion.header>

      {/* Mobile menu */}
      <motion.div
        initial={false}
        animate={{ opacity: mobileOpen ? 1 : 0, y: mobileOpen ? 0 : -10 }}
        transition={{ duration: 0.2 }}
        className={cn(
          'fixed inset-x-4 top-24 z-40 glass-strong rounded-2xl p-6 md:hidden',
          !mobileOpen && 'pointer-events-none'
        )}
      >
        <nav className="flex flex-col gap-2">
          {navLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              onClick={(e) => handleNav(e, link.href)}
              className="px-4 py-3 text-white/70 hover:text-white rounded-xl hover:bg-white/5 transition-all"
            >
              {link.label}
            </a>
          ))}
          <div className="h-px bg-white/10 my-2" />
          <a
            href="https://github.com/abdellahaarab/lenis"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-3 text-white/70 hover:text-white rounded-xl hover:bg-white/5 transition-all"
          >
            <Github size={16} />
            GitHub
          </a>
        </nav>
      </motion.div>
    </>
  )
}
