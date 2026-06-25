import { motion } from 'framer-motion'

const testimonials = [
  {
    quote: "Lenis is the closest thing to native scroll inertia I've ever experienced on the web. It's now a default dependency in every project.",
    author: 'Bruno Simon',
    role: 'Creative Developer',
    company: 'Three.js Journey',
    initials: 'BS',
    color: '#6366f1',
  },
  {
    quote: "Finally a scroll library that doesn't feel like you glued a physics engine to the DOM. It just works, and it's beautiful.",
    author: 'Sarah Drasner',
    role: 'VP of Developer Experience',
    company: 'Netlify',
    initials: 'SD',
    color: '#10b981',
  },
  {
    quote: "We shipped Lenis on our agency site and clients immediately asked 'how did you do the scrolling?' That's the highest compliment.",
    author: 'Marc-Antoine Roy',
    role: 'Technical Director',
    company: 'Locomotive',
    initials: 'MR',
    color: '#06b6d4',
  },
  {
    quote: "The GSAP ScrollTrigger integration is seamless. I haven't touched scroll-smooth or any other library since discovering Lenis.",
    author: 'Cassie Evans',
    role: 'GreenSock Team',
    company: 'GSAP',
    initials: 'CE',
    color: '#8b5cf6',
  },
  {
    quote: "2.6KB for this quality? I've seen worse code in 100KB libraries. Lenis does one thing and it does it perfectly.",
    author: 'Tobias van Schneider',
    role: 'Creative Director',
    company: 'DESK Magazine',
    initials: 'TV',
    color: '#f59e0b',
  },
  {
    quote: "We rebuilt our entire agency website scroll from scratch with Lenis. The before/after is night and day.",
    author: 'Jack Tomaszewski',
    role: 'Lead Developer',
    company: 'Resn',
    initials: 'JT',
    color: '#ec4899',
  },
  {
    quote: "Lenis handles edge cases I didn't even know existed. Touch, wheel, keyboard, programmatic — all feel identical.",
    author: 'Adam Kuhn',
    role: 'Frontend Engineer',
    company: 'Codrops',
    initials: 'AK',
    color: '#14b8a6',
  },
  {
    quote: "The reduced motion support is done right. Not just disabling things, but actually providing an equally good experience.",
    author: 'Lindsey Kopacz',
    role: 'Accessibility Expert',
    company: 'a11ywithlindsey',
    initials: 'LK',
    color: '#f97316',
  },
]

const row1 = [...testimonials.slice(0, 4), ...testimonials.slice(0, 4)]
const row2 = [...testimonials.slice(4), ...testimonials.slice(4)]

export default function Testimonials() {
  return (
    <section className="relative py-32 overflow-hidden" id="testimonials">
      <div className="section-padding container-custom mb-16">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="text-center"
        >
          <span className="tag mb-4 inline-flex">Community</span>
          <h2 className="text-[clamp(36px,5vw,72px)] font-black tracking-tight leading-none mb-6">
            The developers
            <br />
            <span className="gradient-text">have spoken.</span>
          </h2>
        </motion.div>
      </div>

      <div className="space-y-4 overflow-hidden">
        <div className="flex gap-4">
          <div className="animate-marquee flex gap-4 shrink-0">
            {row1.map((t, i) => <TestimonialCard key={`r1a-${i}`} {...t} />)}
          </div>
          <div className="animate-marquee flex gap-4 shrink-0" aria-hidden>
            {row1.map((t, i) => <TestimonialCard key={`r1b-${i}`} {...t} />)}
          </div>
        </div>

        <div className="flex gap-4">
          <div className="animate-marquee-reverse flex gap-4 shrink-0">
            {row2.map((t, i) => <TestimonialCard key={`r2a-${i}`} {...t} />)}
          </div>
          <div className="animate-marquee-reverse flex gap-4 shrink-0" aria-hidden>
            {row2.map((t, i) => <TestimonialCard key={`r2b-${i}`} {...t} />)}
          </div>
        </div>
      </div>

      <div className="absolute inset-y-0 left-0 w-20 bg-gradient-to-r from-black to-transparent z-10 pointer-events-none" />
      <div className="absolute inset-y-0 right-0 w-20 bg-gradient-to-l from-black to-transparent z-10 pointer-events-none" />
    </section>
  )
}

function TestimonialCard({ quote, author, role, company, initials, color }: typeof testimonials[0]) {
  return (
    <motion.div
      whileHover={{ scale: 1.02, y: -3 }}
      transition={{ duration: 0.3 }}
      className="shrink-0 w-80 glass rounded-2xl p-6 flex flex-col gap-4 cursor-default"
    >
      <p className="text-white/60 text-sm leading-relaxed">"{quote}"</p>
      <div className="flex items-center gap-3 mt-auto">
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
          style={{ background: `linear-gradient(135deg, ${color}80, ${color}30)`, border: `1px solid ${color}40` }}
        >
          {initials}
        </div>
        <div>
          <div className="text-sm font-medium text-white/80">{author}</div>
          <div className="text-xs text-white/30">{role} · {company}</div>
        </div>
      </div>
    </motion.div>
  )
}
