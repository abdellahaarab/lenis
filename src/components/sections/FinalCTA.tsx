import { useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import gsap from 'gsap'
import { SplitText } from 'gsap/SplitText'
import { Github, ArrowRight, BookOpen } from 'lucide-react'
import { InlineCode } from '@/components/ui/CodeBlock'
import GradientOrb from '@/components/ui/GradientOrb'
import Particles from '@/components/ui/Particles'

gsap.registerPlugin(SplitText)

export default function FinalCTA() {
  const headingRef = useRef<HTMLHeadingElement>(null)

  useEffect(() => {
    const ctx = gsap.context(() => {
      if (!headingRef.current) return
      const split = new SplitText(headingRef.current, { type: 'chars' })

      gsap.fromTo(
        split.chars,
        { y: 60, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          stagger: 0.02,
          duration: 0.8,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: headingRef.current,
            start: 'top 80%',
            once: true,
          },
        }
      )
    })
    return () => ctx.revert()
  }, [])

  return (
    <section className="relative py-40 overflow-hidden text-center">
      <GradientOrb color="purple" size="xl" className="left-1/2 -translate-x-1/2 -bottom-40 opacity-20" />
      <GradientOrb color="blue" size="md" className="-left-20 top-0 opacity-10" />
      <GradientOrb color="cyan" size="md" className="-right-20 top-0 opacity-10" />
      <Particles count={60} />

      {/* Grid */}
      <div
        className="absolute inset-0 grid-overlay pointer-events-none"
        style={{ WebkitMaskImage: 'radial-gradient(ellipse at center, black 30%, transparent 70%)' }}
      />

      <div className="section-padding container-custom relative z-10 max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mb-8"
        >
          <span className="tag">Ready to ship</span>
        </motion.div>

        <div className="overflow-hidden mb-8">
          <h2
            ref={headingRef}
            className="text-[clamp(48px,8vw,100px)] font-black leading-none tracking-[-0.04em]"
          >
            Start scrolling
            <br />
            <span className="gradient-text-aurora">beautifully.</span>
          </h2>
        </div>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, delay: 0.3 }}
          className="text-white/50 text-xl mb-12 max-w-2xl mx-auto leading-relaxed"
        >
          One package install. Zero configuration required.
          Your scroll transforms in under a minute.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, delay: 0.4 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-10"
        >
          <InlineCode>npm install lenis</InlineCode>

          <a
            href="https://github.com/abdellahaarab/lenis"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-secondary"
          >
            <Github size={16} />
            View on GitHub
          </a>

          <a
            href="https://pro-lenis.vercel.app"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-secondary"
          >
            <BookOpen size={16} />
            Documentation
            <ArrowRight size={14} />
          </a>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="text-xs text-white/20"
        >
          MIT License · No attribution required · Forever free
        </motion.p>
      </div>

      {/* Bottom border glow */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
    </section>
  )
}
