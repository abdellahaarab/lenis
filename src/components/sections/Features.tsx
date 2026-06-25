import { motion } from 'framer-motion'
import { Zap, Layers, Code2, Globe, Cpu, Puzzle, GitBranch, Shield, Repeat } from 'lucide-react'
import GradientOrb from '@/components/ui/GradientOrb'

const features = [
  {
    icon: Zap,
    title: 'Imperceptible Performance',
    description: 'Sub-millisecond RAF execution. Zero layout thrashing. GPU-accelerated transforms only.',
    tag: 'Core',
    gradient: 'from-yellow-500/20 to-orange-500/10',
    iconColor: 'text-yellow-400',
    size: 'large',
  },
  {
    icon: Globe,
    title: 'Framework Agnostic',
    description: 'Works with React, Vue, Svelte, Angular, Next.js, Nuxt, and plain HTML.',
    tag: 'Compat',
    gradient: 'from-blue-500/20 to-cyan-500/10',
    iconColor: 'text-blue-400',
  },
  {
    icon: Layers,
    title: 'GSAP ScrollTrigger',
    description: 'First-class integration with the world\'s most powerful scroll animation engine.',
    tag: 'Integration',
    gradient: 'from-green-500/20 to-emerald-500/10',
    iconColor: 'text-green-400',
  },
  {
    icon: Cpu,
    title: '2.6KB Gzipped',
    description: 'Tiny footprint with zero dependencies. Tree-shakeable for even smaller bundles.',
    tag: 'Size',
    gradient: 'from-purple-500/20 to-violet-500/10',
    iconColor: 'text-purple-400',
  },
  {
    icon: Code2,
    title: 'TypeScript Native',
    description: 'Full type definitions included. Autocomplete, type checking, and docs in your editor.',
    tag: 'DX',
    gradient: 'from-cyan-500/20 to-blue-500/10',
    iconColor: 'text-cyan-400',
    size: 'large',
  },
  {
    icon: Puzzle,
    title: 'Modular Architecture',
    description: 'Plugin system for extending behavior. Build your own scroll effects.',
    tag: 'Extensible',
    gradient: 'from-pink-500/20 to-rose-500/10',
    iconColor: 'text-pink-400',
  },
  {
    icon: Shield,
    title: 'Accessibility First',
    description: 'Respects prefers-reduced-motion. Full keyboard navigation support.',
    tag: 'A11y',
    gradient: 'from-emerald-500/20 to-teal-500/10',
    iconColor: 'text-emerald-400',
  },
  {
    icon: Repeat,
    title: 'Infinite Scroll',
    description: 'Native support for infinite looping scroll experiences and carousels.',
    tag: 'Feature',
    gradient: 'from-indigo-500/20 to-purple-500/10',
    iconColor: 'text-indigo-400',
  },
  {
    icon: GitBranch,
    title: 'Direction Control',
    description: 'Vertical, horizontal, or bidirectional scrolling. Reverse direction support.',
    tag: 'Control',
    gradient: 'from-rose-500/20 to-pink-500/10',
    iconColor: 'text-rose-400',
  },
]

const containerVariants = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.06,
    },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 30 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.7,
      ease: [0.16, 1, 0.3, 1],
    },
  },
}

export default function Features() {
  return (
    <section className="relative py-32 overflow-hidden" id="features">
      <GradientOrb color="purple" size="xl" className="-left-60 top-20 opacity-8" />

      <div className="section-padding container-custom relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="mb-20 text-center"
        >
          <span className="tag mb-4 inline-flex">Features</span>
          <h2 className="text-[clamp(36px,5vw,72px)] font-black tracking-tight leading-none mb-6">
            Everything you need,
            <br />
            <span className="gradient-text">nothing you don't.</span>
          </h2>
          <p className="text-white/50 text-lg max-w-lg mx-auto">
            Purposefully designed. Every feature earned its place.
          </p>
        </motion.div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-100px' }}
          className="grid md:grid-cols-2 lg:grid-cols-3 gap-4"
        >
          {features.map((feature, i) => {
            const Icon = feature.icon
            const isLarge = feature.size === 'large'

            return (
              <motion.div
                key={i}
                variants={itemVariants}
                className={cn('feature-card group relative overflow-hidden', isLarge && 'lg:col-span-1')}
                whileHover={{ scale: 1.01 }}
              >
                {/* Gradient background */}
                <div
                  className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl`}
                />

                <div className="relative z-10">
                  <div className="flex items-start justify-between mb-4">
                    <div className={`p-2.5 rounded-xl bg-white/5 border border-white/8 ${feature.iconColor}`}>
                      <Icon size={18} />
                    </div>
                    <span className="tag text-xs">{feature.tag}</span>
                  </div>

                  <h3 className="font-bold text-white/90 text-lg mb-2 group-hover:text-white transition-colors">
                    {feature.title}
                  </h3>
                  <p className="text-white/45 text-sm leading-relaxed">
                    {feature.description}
                  </p>

                  {/* Arrow on hover */}
                  <div className="mt-4 overflow-hidden h-4">
                    <div className="transform translate-y-full group-hover:translate-y-0 transition-transform duration-300 flex items-center gap-1 text-xs text-white/40">
                      Learn more
                      <span className="text-sm">→</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </motion.div>
      </div>
    </section>
  )
}

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(' ')
}
