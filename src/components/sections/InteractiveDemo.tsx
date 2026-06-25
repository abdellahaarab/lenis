import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import CodeBlock from '@/components/ui/CodeBlock'
import { cn } from '@/lib/utils'

const tabs = [
  {
    label: 'Basic',
    code: `import Lenis from 'lenis'

const lenis = new Lenis({
  duration: 1.2,
  easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
  smoothWheel: true,
})

function raf(time) {
  lenis.raf(time)
  requestAnimationFrame(raf)
}

requestAnimationFrame(raf)`,
  },
  {
    label: 'React',
    code: `import { useEffect } from 'react'
import Lenis from 'lenis'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

export function useLenis() {
  useEffect(() => {
    const lenis = new Lenis()

    lenis.on('scroll', ScrollTrigger.update)
    gsap.ticker.add((time) => lenis.raf(time * 1000))
    gsap.ticker.lagSmoothing(0)

    return () => lenis.destroy()
  }, [])
}`,
  },
  {
    label: 'Options',
    code: `const lenis = new Lenis({
  // Duration of inertia (seconds)
  duration: 1.2,

  // Custom easing function
  easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),

  // Scroll direction
  orientation: 'vertical',   // 'horizontal'

  // Gesture direction
  gestureOrientation: 'vertical',

  // Enable smooth wheel
  smoothWheel: true,

  // Wheel multiplier
  wheelMultiplier: 1,

  // Touch multiplier
  touchMultiplier: 2,

  // Infinite scroll
  infinite: false,
})`,
  },
  {
    label: 'GSAP',
    code: `import Lenis from 'lenis'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

const lenis = new Lenis()

// Sync Lenis with ScrollTrigger
lenis.on('scroll', ScrollTrigger.update)

// Tell GSAP to use Lenis RAF
gsap.ticker.add((time) => {
  lenis.raf(time * 1000)
})

// Pinned section example
ScrollTrigger.create({
  trigger: '#pinned',
  start: 'top top',
  end: '+=200%',
  pin: true,
  scrub: true,
  onUpdate: ({ progress }) => {
    gsap.set('#panel', { x: progress * -300 })
  }
})`,
  },
]

const demoConfig = {
  duration: 1.2,
  easing: 'power2',
  wheel: 1.0,
  touch: 2.0,
}

export default function InteractiveDemo() {
  const [activeTab, setActiveTab] = useState(0)
  const [config, setConfig] = useState(demoConfig)

  return (
    <section className="relative py-32 overflow-hidden" id="install">
      <div className="section-padding container-custom relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="mb-16"
        >
          <span className="tag mb-4 inline-flex">Installation</span>
          <h2 className="text-[clamp(36px,5vw,64px)] font-black tracking-tight leading-none mb-4">
            Set up in{' '}
            <span className="gradient-text">30 seconds.</span>
          </h2>
          <p className="text-white/50 text-lg max-w-xl">
            Drop-in replacement for native scroll. Works with any framework.
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-5 gap-6">
          {/* Code panel — larger */}
          <div className="lg:col-span-3">
            {/* Tab bar */}
            <div className="flex gap-1 p-1 rounded-xl bg-white/4 border border-white/8 mb-4 w-fit">
              {tabs.map((tab, i) => (
                <button
                  key={i}
                  onClick={() => setActiveTab(i)}
                  className={cn(
                    'px-4 py-1.5 rounded-lg text-sm font-medium transition-all duration-200',
                    activeTab === i
                      ? 'bg-white text-black'
                      : 'text-white/40 hover:text-white/70'
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.25, ease: 'easeOut' }}
              >
                <CodeBlock
                  code={tabs[activeTab].code}
                  language="js"
                  filename={`lenis.${activeTab === 1 ? 'tsx' : 'js'}`}
                  showLineNumbers
                />
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Config panel */}
          <div className="lg:col-span-2 flex flex-col gap-4">
            <div className="glass rounded-2xl p-6">
              <h3 className="font-semibold text-white/80 mb-5 text-sm tracking-wide uppercase">
                Live Config
              </h3>

              <div className="space-y-6">
                <Slider
                  label="Duration"
                  value={config.duration}
                  min={0.3}
                  max={3}
                  step={0.1}
                  onChange={(v) => setConfig({ ...config, duration: v })}
                  display={`${config.duration.toFixed(1)}s`}
                />
                <Slider
                  label="Wheel Multiplier"
                  value={config.wheel}
                  min={0.3}
                  max={3}
                  step={0.1}
                  onChange={(v) => setConfig({ ...config, wheel: v })}
                  display={`${config.wheel.toFixed(1)}×`}
                />
                <Slider
                  label="Touch Multiplier"
                  value={config.touch}
                  min={0.5}
                  max={5}
                  step={0.1}
                  onChange={(v) => setConfig({ ...config, touch: v })}
                  display={`${config.touch.toFixed(1)}×`}
                />

                <div>
                  <label className="text-xs text-white/40 font-mono mb-2 block">Easing</label>
                  <div className="grid grid-cols-2 gap-2">
                    {['power2', 'expo', 'back', 'elastic'].map((ease) => (
                      <button
                        key={ease}
                        onClick={() => setConfig({ ...config, easing: ease })}
                        className={cn(
                          'px-3 py-2 rounded-lg text-xs font-mono transition-all duration-200',
                          config.easing === ease
                            ? 'bg-accent-purple/20 border border-accent-purple/40 text-purple-300'
                            : 'bg-white/4 border border-white/8 text-white/40 hover:text-white/60'
                        )}
                      >
                        {ease}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Performance metrics */}
            <div className="glass rounded-2xl p-6">
              <h3 className="font-semibold text-white/80 mb-4 text-sm tracking-wide uppercase">
                Metrics
              </h3>
              <div className="space-y-3">
                <Metric label="Bundle Size" value="2.6 KB" color="green" />
                <Metric label="Frame Budget" value="~0.4ms" color="blue" />
                <Metric label="Tree Shakeable" value="Yes" color="purple" />
                <Metric label="SSR Safe" value="Yes" color="green" />
              </div>
            </div>
          </div>
        </div>

        {/* Package managers */}
        <div className="mt-12 grid sm:grid-cols-3 gap-4">
          {[
            { pm: 'npm', cmd: 'npm install lenis' },
            { pm: 'yarn', cmd: 'yarn add lenis' },
            { pm: 'pnpm', cmd: 'pnpm add lenis' },
          ].map(({ pm, cmd }) => (
            <PackageCmd key={pm} pm={pm} cmd={cmd} />
          ))}
        </div>
      </div>
    </section>
  )
}

function Slider({ label, value, min, max, step, onChange, display }: {
  label: string; value: number; min: number; max: number; step: number
  onChange: (v: number) => void; display: string
}) {
  return (
    <div>
      <div className="flex justify-between items-center mb-2">
        <label className="text-xs text-white/40 font-mono">{label}</label>
        <span className="text-xs font-mono text-accent-purple">{display}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full h-1 rounded-full appearance-none bg-white/10 cursor-pointer"
        style={{
          background: `linear-gradient(to right, #8b5cf6 ${((value - min) / (max - min)) * 100}%, rgba(255,255,255,0.1) 0%)`,
        }}
      />
    </div>
  )
}

function Metric({ label, value, color }: { label: string; value: string; color: string }) {
  const colors = {
    green: 'text-green-400',
    blue: 'text-blue-400',
    purple: 'text-purple-400',
  }

  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-xs text-white/40">{label}</span>
      <span className={`text-xs font-mono font-medium ${colors[color as keyof typeof colors]}`}>{value}</span>
    </div>
  )
}

function PackageCmd({ pm, cmd }: { pm: string; cmd: string }) {
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    await navigator.clipboard.writeText(cmd)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <button
      onClick={copy}
      className="glass rounded-xl px-4 py-3 flex items-center gap-3 hover:bg-white/8 transition-all duration-200 text-left w-full group"
    >
      <span className="text-xs font-mono text-white/30 w-10">{pm}</span>
      <span className="font-mono text-sm text-white/70 flex-1">{cmd}</span>
      <span className="text-xs text-white/20 group-hover:text-white/50 transition-colors">
        {copied ? '✓' : '⎘'}
      </span>
    </button>
  )
}
