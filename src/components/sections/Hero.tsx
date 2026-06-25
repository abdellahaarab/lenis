import { useEffect, useRef } from 'react'
import { motion, useScroll, useTransform } from 'framer-motion'
import gsap from 'gsap'
import { SplitText } from 'gsap/SplitText'
import { ArrowRight, Github, Star, Download, Play } from 'lucide-react'
import Particles from '@/components/ui/Particles'
import GradientOrb from '@/components/ui/GradientOrb'
import GridOverlay from '@/components/ui/GridOverlay'
import { InlineCode } from '@/components/ui/CodeBlock'
import { scrollTo } from '@/hooks/useLenis'

gsap.registerPlugin(SplitText)

const GITHUB_STARS = '14.2K'
const NPM_WEEKLY = '620K'

export default function Hero() {
  const containerRef = useRef<HTMLElement>(null)
  const titleRef = useRef<HTMLHeadingElement>(null)
  const subtitleRef = useRef<HTMLParagraphElement>(null)
  const ctaRef = useRef<HTMLDivElement>(null)
  const statsRef = useRef<HTMLDivElement>(null)
  const mouseRef = useRef<HTMLDivElement>(null)

  const { scrollYProgress } = useScroll({ target: containerRef })
  const y = useTransform(scrollYProgress, [0, 1], ['0%', '30%'])
  const opacity = useTransform(scrollYProgress, [0, 0.6], [1, 0])

  useEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ delay: 0.2 })

      if (titleRef.current) {
        const split = new SplitText(titleRef.current, { type: 'chars,words' })
        tl.fromTo(
          split.chars,
          { y: 120, opacity: 0, rotateX: -90 },
          {
            y: 0,
            opacity: 1,
            rotateX: 0,
            duration: 1,
            stagger: 0.025,
            ease: 'power4.out',
          }
        )
      }

      if (subtitleRef.current) {
        tl.fromTo(
          subtitleRef.current,
          { y: 30, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.8, ease: 'power3.out' },
          '-=0.4'
        )
      }

      if (ctaRef.current) {
        tl.fromTo(
          ctaRef.current.children,
          { y: 20, opacity: 0 },
          { y: 0, opacity: 1, stagger: 0.1, duration: 0.6, ease: 'power3.out' },
          '-=0.3'
        )
      }

      if (statsRef.current) {
        tl.fromTo(
          statsRef.current,
          { y: 20, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.6, ease: 'power3.out' },
          '-=0.2'
        )
      }
    }, containerRef)

    return () => ctx.revert()
  }, [])

  useEffect(() => {
    const container = containerRef.current
    const mouse = mouseRef.current
    if (!container || !mouse) return

    const onMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect()
      const x = ((e.clientX - rect.left) / rect.width) * 100
      const y = ((e.clientY - rect.top) / rect.height) * 100
      mouse.style.background = `radial-gradient(600px circle at ${x}% ${y}%, rgba(99,102,241,0.12) 0%, transparent 60%)`
    }

    container.addEventListener('mousemove', onMove, { passive: true })
    return () => container.removeEventListener('mousemove', onMove)
  }, [])

  return (
    <section
      ref={containerRef}
      className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden"
      style={{ perspective: '1000px' }}
    >
      {/* Animated spotlight */}
      <div ref={mouseRef} className="absolute inset-0 pointer-events-none z-10 transition-all duration-300" />

      {/* Background layers */}
      <GridOverlay fade="bottom" className="opacity-60 z-0" />
      <GradientOrb color="purple" size="xl" className="-top-40 -left-40 opacity-15" />
      <GradientOrb color="blue" size="lg" className="-top-20 -right-40 opacity-10" />
      <GradientOrb color="cyan" size="md" className="top-1/2 right-0 opacity-8" />
      <Particles count={100} className="z-0" />

      {/* Noise texture */}
      <div className="absolute inset-0 opacity-[0.03] z-0"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E")`,
        }}
      />

      <motion.div
        style={{ y, opacity }}
        className="relative z-20 flex flex-col items-center text-center px-6 max-w-6xl mx-auto pt-32"
      >
        {/* Version badge */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="mb-8"
        >
          <span className="tag">
            <span className="w-1.5 h-1.5 rounded-full bg-accent-purple animate-pulse-slow" />
            v1.3.4 — Now with infinite scroll support
          </span>
        </motion.div>

        {/* Main title */}
        <div className="overflow-hidden mb-8" style={{ perspective: '800px' }}>
          <h1
            ref={titleRef}
            className="text-[clamp(56px,10vw,140px)] font-black leading-none tracking-[-0.04em] text-white"
            style={{ transformOrigin: 'center bottom' }}
          >
            Scroll
            <br />
            <span className="gradient-text-aurora">Perfected.</span>
          </h1>
        </div>

        {/* Subtitle */}
        <p
          ref={subtitleRef}
          className="text-[clamp(16px,2vw,22px)] text-white/50 max-w-2xl leading-relaxed mb-10 text-balance"
        >
          Lenis is an open-source library built to standardize scroll experiences and
          bring creative smoothness to your project — with native performance and zero compromises.
        </p>

        {/* CTAs */}
        <div ref={ctaRef} className="flex flex-wrap items-center justify-center gap-3 mb-16">
          <a
            href="https://pro-lenis.vercel.app"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary group"
          >
            <Play size={14} className="fill-black" />
            Live Demo
            <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
          </a>

          <a
            href="https://github.com/abdellahaarab/lenis"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-secondary group"
          >
            <Github size={14} />
            GitHub
            <Star size={13} className="ml-0.5 text-yellow-400/70 group-hover:text-yellow-400 transition-colors" />
          </a>

          <button
            onClick={() => scrollTo('#install', { offset: -80 })}
            className="btn-secondary"
          >
            Get Started
          </button>
        </div>

        {/* Install command */}
        <div className="mb-16">
          <InlineCode>npm install lenis</InlineCode>
        </div>

        {/* Stats */}
        <div
          ref={statsRef}
          className="flex flex-wrap items-center justify-center gap-8 text-sm"
        >
          <div className="flex items-center gap-2 text-white/40">
            <Star size={14} className="text-yellow-400/70" />
            <span className="font-semibold text-white/70">{GITHUB_STARS}</span>
            <span>GitHub Stars</span>
          </div>
          <div className="w-px h-4 bg-white/10" />
          <div className="flex items-center gap-2 text-white/40">
            <Download size={14} className="text-green-400/70" />
            <span className="font-semibold text-white/70">{NPM_WEEKLY}</span>
            <span>Weekly Downloads</span>
          </div>
          <div className="w-px h-4 bg-white/10" />
          <div className="flex items-center gap-2 text-white/40">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <span className="font-semibold text-white/70">MIT</span>
            <span>Open Source</span>
          </div>
        </div>
      </motion.div>

      {/* Scroll indicator */}
      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-2 opacity-40">
        <span className="text-xs font-mono text-white/50 tracking-widest uppercase">Scroll</span>
        <div className="w-px h-10 bg-gradient-to-b from-white/50 to-transparent relative overflow-hidden">
          <div className="absolute top-0 w-full h-4 bg-white scroll-dot" />
        </div>
      </div>

      {/* Bottom fade */}
      <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-black to-transparent z-10 pointer-events-none" />
    </section>
  )
}
