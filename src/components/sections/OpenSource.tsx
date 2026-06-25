import { motion } from 'framer-motion'
import { Github, GitBranch, Star, Users, Package, ExternalLink } from 'lucide-react'
import GradientOrb from '@/components/ui/GradientOrb'

const contributors = Array.from({ length: 32 }, (_, i) => ({
  id: i,
  color: `hsl(${(i * 47) % 360}, 60%, 55%)`,
  initial: String.fromCharCode(65 + (i % 26)),
}))

const releases = [
  { version: '1.3.4', date: 'Jun 2025', label: 'Latest', highlight: true, note: 'Infinite scroll support' },
  { version: '1.2.0', date: 'Mar 2025', label: '', note: 'Touch gesture improvements' },
  { version: '1.1.1', date: 'Jan 2025', label: '', note: 'GSAP 3.12 compat' },
  { version: '1.0.0', date: 'Sep 2024', label: 'Stable', note: 'Initial stable release' },
]

const stats = [
  { icon: Star, value: '14.2K', label: 'Stars', color: 'text-yellow-400' },
  { icon: GitBranch, value: '230', label: 'Forks', color: 'text-blue-400' },
  { icon: Users, value: '48', label: 'Contributors', color: 'text-green-400' },
  { icon: Package, value: '620K', label: 'Weekly DL', color: 'text-purple-400' },
]

export default function OpenSource() {
  return (
    <section className="relative py-32 overflow-hidden" id="open-source">
      <GradientOrb color="multi" size="lg" className="left-1/2 -translate-x-1/2 bottom-0 opacity-8" />

      <div className="section-padding container-custom relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="text-center mb-20"
        >
          <span className="tag mb-4 inline-flex">
            <Github size={12} />
            Open Source
          </span>
          <h2 className="text-[clamp(36px,5vw,72px)] font-black tracking-tight leading-none mb-6">
            Built in the open,
            <br />
            <span className="gradient-text">by the community.</span>
          </h2>
          <p className="text-white/50 text-lg max-w-xl mx-auto">
            MIT licensed. No vendor lock-in. Forever free.
          </p>
        </motion.div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-16">
          {stats.map((stat, i) => {
            const Icon = stat.icon
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.08 }}
                className="glass rounded-2xl p-6 text-center"
              >
                <Icon size={18} className={`${stat.color} mx-auto mb-3`} />
                <div className="text-3xl font-black text-white mb-1">{stat.value}</div>
                <div className="text-xs text-white/40">{stat.label}</div>
              </motion.div>
            )
          })}
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Contributors */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
            className="glass rounded-2xl p-8"
          >
            <h3 className="font-semibold text-white/80 mb-6">Contributors</h3>
            <div className="flex flex-wrap gap-2 mb-6">
              {contributors.map((c) => (
                <motion.div
                  key={c.id}
                  whileHover={{ scale: 1.2, y: -2 }}
                  title={`Contributor ${c.id + 1}`}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white cursor-pointer"
                  style={{ background: `linear-gradient(135deg, ${c.color}80, ${c.color}30)`, border: `1px solid ${c.color}40` }}
                >
                  {c.initial}
                </motion.div>
              ))}
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs text-white/40 glass border-white/10">
                +
              </div>
            </div>
            <a
              href="https://github.com/abdellahaarab/lenis/graphs/contributors"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm text-white/40 hover:text-white/70 transition-colors"
            >
              View all contributors
              <ExternalLink size={12} />
            </a>
          </motion.div>

          {/* Release timeline */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
            className="glass rounded-2xl p-8"
          >
            <h3 className="font-semibold text-white/80 mb-6">Release Timeline</h3>
            <div className="space-y-4 relative">
              <div className="absolute left-[11px] top-2 bottom-2 w-px bg-white/10" />
              {releases.map((release, i) => (
                <div key={i} className="flex items-start gap-4 relative">
                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 z-10 ${
                    release.highlight
                      ? 'bg-accent-purple border-accent-purple'
                      : 'bg-black border-white/20'
                  }`}>
                    {release.highlight && <div className="w-2 h-2 rounded-full bg-white" />}
                  </div>
                  <div className="flex-1 pb-4">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-mono text-sm font-bold text-white/80">
                        v{release.version}
                      </span>
                      {release.label && (
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          release.highlight
                            ? 'bg-accent-purple/20 text-purple-300'
                            : 'bg-white/5 text-white/30'
                        }`}>
                          {release.label}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-white/30">{release.note}</div>
                    <div className="text-xs text-white/20 mt-0.5">{release.date}</div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Community links */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, delay: 0.2 }}
          className="mt-10 flex flex-wrap justify-center gap-4"
        >
          {[
            { label: 'GitHub Repository', href: 'https://github.com/abdellahaarab/lenis', icon: '⭐' },
            { label: 'Live Demo', href: 'https://pro-lenis.dev', icon: '🌐' },
            { label: 'Twitter / X', href: 'https://twitter.com/abdellahaarab', icon: '𝕏' },
            { label: 'NPM Package', href: 'https://www.npmjs.com/package/lenis', icon: '📦' },
          ].map(({ label, href, icon }) => (
            <a
              key={label}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-secondary"
            >
              <span>{icon}</span>
              {label}
            </a>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
