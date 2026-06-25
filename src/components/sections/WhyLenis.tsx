import { useRef } from 'react'
import { motion } from 'framer-motion'
import { useScrollReveal } from '@/hooks/useScrollReveal'
import GradientOrb from '@/components/ui/GradientOrb'

const problems = [
  {
    before: 'Janky, abrupt scroll snapping',
    after: 'Physics-based easing that feels natural',
  },
  {
    before: 'Inconsistent behavior across browsers',
    after: 'Normalized scroll events everywhere',
  },
  {
    before: 'Complex setup for scroll animations',
    after: 'GSAP ScrollTrigger integration built-in',
  },
  {
    before: 'Heavy libraries with bloated APIs',
    after: '2.6KB gzipped, tree-shakeable',
  },
]

const stats = [
  { value: '2.6', unit: 'KB', label: 'Gzipped Size' },
  { value: '60', unit: 'FPS', label: 'Consistent' },
  { value: '0', unit: 'deps', label: 'Dependencies' },
  { value: '14k', unit: '★', label: 'GitHub Stars' },
]

export default function WhyLenis() {
  const sectionRef = useScrollReveal({ y: 50, stagger: 0.1, start: 'top 80%' })
  const statsRef = useScrollReveal({ y: 30, stagger: 0.08, start: 'top 85%' })
  const headingRef = useRef<HTMLDivElement>(null)

  return (
    <section className="relative py-32 overflow-hidden" id="why">
      <GradientOrb color="blue" size="lg" className="right-0 top-0 opacity-10" />

      <div className="section-padding container-custom relative z-10">
        {/* Section heading */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="mb-20"
        >
          <span className="tag mb-4 inline-flex">Why Lenis</span>
          <h2 className="text-[clamp(36px,5vw,72px)] font-black tracking-tight leading-none mb-6">
            The scroll experience
            <br />
            <span className="gradient-text">your users deserve.</span>
          </h2>
          <p className="text-white/50 text-lg max-w-xl leading-relaxed">
            Native scroll is unpredictable. Lenis wraps it in a mathematical model
            that feels like butter — without sacrificing accessibility or performance.
          </p>
        </motion.div>

        {/* Problem / Solution grid */}
        <div ref={sectionRef} className="grid md:grid-cols-2 gap-6 mb-24">
          {problems.map((item, i) => (
            <div key={i} className="group">
              <div className="glass rounded-2xl p-6 h-full transition-all duration-500 group-hover:bg-white/[0.06] group-hover:border-white/15">
                <div className="flex items-start gap-4 mb-4">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-red-500/10 border border-red-500/20 shrink-0 mt-0.5">
                    <span className="text-red-400 text-sm">✕</span>
                  </div>
                  <p className="text-white/40 text-sm leading-relaxed pt-1">{item.before}</p>
                </div>
                <div className="h-px bg-gradient-to-r from-white/5 to-transparent mb-4" />
                <div className="flex items-start gap-4">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-green-500/10 border border-green-500/20 shrink-0 mt-0.5">
                    <span className="text-green-400 text-sm">✓</span>
                  </div>
                  <p className="text-white/80 text-sm leading-relaxed pt-1">{item.after}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Stats row */}
        <div ref={statsRef} className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {stats.map((stat, i) => (
            <motion.div
              key={i}
              whileHover={{ scale: 1.02, y: -2 }}
              transition={{ duration: 0.3 }}
              className="stat-card text-center"
            >
              <div className="text-[clamp(32px,4vw,48px)] font-black tracking-tight text-white leading-none">
                {stat.value}
                <span className="text-accent-purple ml-1 text-[0.6em]">{stat.unit}</span>
              </div>
              <div className="text-white/40 text-sm">{stat.label}</div>
            </motion.div>
          ))}
        </div>

        {/* Quote */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
          className="mt-24 text-center"
        >
          <blockquote className="text-[clamp(20px,3vw,36px)] font-light text-white/30 leading-relaxed max-w-4xl mx-auto">
            "The physics are{' '}
            <span className="text-white/80 italic">imperceptibly perfect</span>
            . It's the kind of thing users never notice — until it's gone."
          </blockquote>
          <div className="mt-6 flex items-center justify-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-accent-purple to-accent-blue" />
            <div className="text-left">
              <div className="text-sm font-medium text-white/60">abdellahaarab</div>
              <div className="text-xs text-white/30">github.com/abdellahaarab/lenis</div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
