import { useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import GradientOrb from '@/components/ui/GradientOrb'

gsap.registerPlugin(ScrollTrigger)

const metrics = [
  {
    label: 'Bundle Size',
    value: 2.6,
    max: 10,
    unit: 'KB',
    suffix: 'gzipped',
    color: '#10b981',
    description: 'vs 38KB jQuery, 11KB Scroll Smooth',
  },
  {
    label: 'Frame Budget',
    value: 0.4,
    max: 16.6,
    unit: 'ms',
    suffix: 'per frame',
    color: '#6366f1',
    description: 'Leaves 16.2ms free per 60fps frame',
  },
  {
    label: 'Memory Usage',
    value: 0.8,
    max: 5,
    unit: 'MB',
    suffix: 'typical',
    color: '#06b6d4',
    description: 'No memory leaks — proper cleanup built in',
  },
]

const scores = [
  { label: 'Performance', score: 99, color: '#10b981' },
  { label: 'Accessibility', score: 100, color: '#6366f1' },
  { label: 'Best Practices', score: 100, color: '#06b6d4' },
  { label: 'SEO', score: 100, color: '#8b5cf6' },
]

export default function Performance() {
  const barsRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const ctx = gsap.context(() => {
      const bars = document.querySelectorAll('.perf-bar-fill')
      bars.forEach((bar) => {
        const target = (bar as HTMLElement).dataset.width || '0'
        gsap.fromTo(
          bar,
          { width: '0%' },
          {
            width: `${target}%`,
            duration: 1.5,
            ease: 'power3.out',
            scrollTrigger: {
              trigger: bar,
              start: 'top 90%',
              once: true,
            },
          }
        )
      })

      const circles = document.querySelectorAll('.score-circle')
      circles.forEach((circle) => {
        const target = parseInt((circle as HTMLElement).dataset.score || '0')
        const circumference = 2 * Math.PI * 40

        gsap.fromTo(
          circle,
          { strokeDashoffset: circumference },
          {
            strokeDashoffset: circumference * (1 - target / 100),
            duration: 1.8,
            ease: 'power3.out',
            scrollTrigger: {
              trigger: circle,
              start: 'top 90%',
              once: true,
            },
          }
        )
      })
    }, barsRef)

    return () => ctx.revert()
  }, [])

  return (
    <section className="relative py-32 overflow-hidden" id="performance" ref={barsRef}>
      <GradientOrb color="cyan" size="lg" className="right-0 bottom-0 opacity-8" />

      <div className="section-padding container-custom relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="mb-20"
        >
          <span className="tag mb-4 inline-flex">Performance</span>
          <h2 className="text-[clamp(36px,5vw,72px)] font-black tracking-tight leading-none mb-6">
            Zero compromise.
            <br />
            <span className="gradient-text">100% speed.</span>
          </h2>
          <p className="text-white/50 text-lg max-w-xl">
            Lighthouse scores. Real benchmarks. Production data.
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-10">
          {/* Bar charts */}
          <div className="space-y-8">
            <h3 className="text-sm uppercase tracking-widest text-white/30 font-mono">Resource Usage</h3>
            {metrics.map((metric, i) => (
              <div key={i}>
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-medium text-white/70">{metric.label}</span>
                  <div className="text-right">
                    <span className="text-sm font-mono font-bold" style={{ color: metric.color }}>
                      {metric.value}
                      <span className="text-xs ml-0.5 text-white/30">{metric.unit}</span>
                    </span>
                  </div>
                </div>

                <div className="h-2 rounded-full bg-white/5 overflow-hidden mb-1.5">
                  <div
                    className="perf-bar-fill h-full rounded-full"
                    data-width={((metric.value / metric.max) * 100).toString()}
                    style={{ background: `linear-gradient(90deg, ${metric.color}, ${metric.color}80)`, width: 0 }}
                  />
                </div>

                <p className="text-xs text-white/25">{metric.description}</p>
              </div>
            ))}
          </div>

          {/* Lighthouse scores */}
          <div>
            <h3 className="text-sm uppercase tracking-widest text-white/30 font-mono mb-8">Lighthouse Scores</h3>
            <div className="grid grid-cols-2 gap-6">
              {scores.map((score, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, scale: 0.9 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: i * 0.1 }}
                  className="glass rounded-2xl p-6 flex flex-col items-center gap-3"
                >
                  <div className="relative w-24 h-24">
                    <svg className="w-24 h-24 -rotate-90" viewBox="0 0 100 100">
                      <circle
                        cx="50" cy="50" r="40"
                        fill="none"
                        stroke="rgba(255,255,255,0.05)"
                        strokeWidth="8"
                      />
                      <circle
                        className="score-circle"
                        cx="50" cy="50" r="40"
                        fill="none"
                        stroke={score.color}
                        strokeWidth="8"
                        strokeLinecap="round"
                        strokeDasharray={`${2 * Math.PI * 40}`}
                        strokeDashoffset={`${2 * Math.PI * 40}`}
                        data-score={score.score}
                        style={{ filter: `drop-shadow(0 0 8px ${score.color}60)` }}
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-2xl font-black text-white">{score.score}</span>
                    </div>
                  </div>
                  <span className="text-xs text-white/40 text-center">{score.label}</span>
                </motion.div>
              ))}
            </div>

            {/* FPS counter */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="mt-6 glass rounded-2xl p-5 flex items-center gap-4"
            >
              <div className="flex items-center gap-1">
                {Array.from({ length: 12 }).map((_, i) => (
                  <div
                    key={i}
                    className="w-1.5 rounded-full bg-green-400"
                    style={{
                      height: `${Math.random() * 16 + 8}px`,
                      opacity: 0.4 + Math.random() * 0.6,
                      animation: `pulse ${0.5 + Math.random() * 0.5}s ease-in-out infinite alternate`,
                      animationDelay: `${i * 0.05}s`,
                    }}
                  />
                ))}
              </div>
              <div>
                <div className="text-2xl font-black text-green-400">60 FPS</div>
                <div className="text-xs text-white/30">Consistent on all devices</div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  )
}
