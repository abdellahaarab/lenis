# Lenis — Premium Landing Page

A world-class, Awwwards-quality landing page for the [Lenis](https://github.com/abdellahaarab/lenis) smooth scroll library. Built with React 19, GSAP, Framer Motion, and Tailwind CSS.

**Live Demo:** [pro-lenis.vercel.app](https://pro-lenis.vercel.app)  
**Repository:** [github.com/abdellahaarab/lenis](https://github.com/abdellahaarab/lenis)

---

## Stack

| Technology | Role |
|---|---|
| [Vite 6](https://vitejs.dev) | Build tool & dev server |
| [React 19](https://react.dev) | UI framework |
| [TypeScript](https://www.typescriptlang.org) | Type safety |
| [GSAP 3.13](https://gsap.com) | SplitText animations, ScrollTrigger |
| [Lenis 1.3](https://github.com/abdellahaarab/lenis) | Smooth scroll engine |
| [Framer Motion](https://www.framer.com/motion) | Declarative animations |
| [Tailwind CSS v3](https://tailwindcss.com) | Utility-first styling |
| [Lucide React](https://lucide.dev) | Icon system |

---

## Features

- **GSAP SplitText** character-by-character hero reveal with 3D perspective
- **Lenis smooth scroll** wired directly to GSAP's ticker for zero frame drops
- **Custom cursor follower** with lerp-based lag and magnetic hover states
- **Canvas particle system** — zero-dependency, RAF-driven floating particles
- **Dual-direction infinite marquees** for showcase and testimonial sections
- **SVG Lighthouse score rings** animated on scroll via GSAP ScrollTrigger
- **Glass morphism** components with consistent `backdrop-filter` system
- **Aurora gradient text** with `background-size: 300%` keyframe animation
- **Live config demo** — interactive sliders update displayed code in real-time
- **Progress bar** using Framer Motion `useSpring` on `scrollYProgress`
- **Keyboard accessible** navigation with smooth-scroll anchoring
- **Reduced motion** support via `prefers-reduced-motion` media query
- **Code splitting** — animation, React, and vendor chunks separated

---

## Getting Started

```bash
# Clone
git clone https://github.com/abdellahaarab/lenis.git
cd lenis

# Install
npm install

# Dev server → http://localhost:5173
npm run dev

# Production build
npm run build

# Preview production build
npm run preview
```

---

## Project Structure

```
src/
├── components/
│   ├── layout/
│   │   ├── Navigation.tsx    # Glassmorphism nav, scroll-aware blur
│   │   ├── Footer.tsx        # Minimal footer with links
│   │   └── ProgressBar.tsx   # Spring-smoothed scroll indicator
│   ├── sections/
│   │   ├── Hero.tsx          # SplitText reveal, particles, mouse spotlight
│   │   ├── WhyLenis.tsx      # Problem/solution cards, animated stats
│   │   ├── InteractiveDemo.tsx  # Tab code viewer, live config sliders
│   │   ├── Features.tsx      # 9-card grid with hover gradient reveals
│   │   ├── Showcase.tsx      # Infinite marquee, parallax on scroll
│   │   ├── Performance.tsx   # Animated bar charts, Lighthouse score rings
│   │   ├── Testimonials.tsx  # Dual-direction testimonial marquee
│   │   ├── OpenSource.tsx    # GitHub stats, contributors, release timeline
│   │   └── FinalCTA.tsx      # SplitText headline, install command
│   └── ui/
│       ├── CodeBlock.tsx     # Syntax highlighter with copy-to-clipboard
│       ├── CursorFollower.tsx  # Lerp cursor dot + ring
│       ├── GradientOrb.tsx   # Blurred color orbs for depth
│       ├── GridOverlay.tsx   # CSS grid background with fade mask
│       ├── Particles.tsx     # Canvas 2D particle system
│       └── Badge.tsx         # Tag/badge component
├── hooks/
│   ├── useLenis.ts           # Lenis init + GSAP ticker sync
│   ├── useMousePosition.ts   # Normalized cursor coordinates
│   ├── useMagneticButton.ts  # Magnetic button hover effect
│   └── useScrollReveal.ts    # GSAP ScrollTrigger reveal + count-up
├── lib/
│   └── utils.ts              # cn(), lerp, clamp, map, easing presets
└── types/
    └── index.ts              # Shared TypeScript interfaces
```

---

## Animation Architecture

```
Lenis (smooth scroll)
  └── GSAP ticker.add()           ← Lenis.raf() called every frame
        └── ScrollTrigger.update() ← Synced on Lenis scroll event

Component animations:
  Hero title   → GSAP SplitText (chars, perspective 3D)
  Section entry → Framer Motion whileInView (once)
  Stats bars   → GSAP ScrollTrigger + fromTo width
  Score rings  → GSAP ScrollTrigger + strokeDashoffset
  Marquees     → CSS animation (marquee / marquee-reverse keyframes)
  Cursor       → requestAnimationFrame lerp loop
  Progress bar → Framer Motion useSpring(scrollYProgress)
```

---

## Performance

| Metric | Value |
|---|---|
| JS (gzipped) | ~180 KB total |
| Animation vendor chunk | ~77 KB (GSAP + Framer Motion + Lenis) |
| React vendor chunk | ~1.5 KB |
| CSS (gzipped) | ~6.5 KB |
| Target FPS | 60 |
| Lighthouse Performance | 95+ |

---

## Customization

### Colors & tokens — [tailwind.config.ts](tailwind.config.ts)

```ts
colors: {
  accent: {
    purple: '#8b5cf6',
    blue:   '#3b82f6',
    cyan:   '#06b6d4',
  }
}
```

### Lenis options — [src/hooks/useLenis.ts](src/hooks/useLenis.ts)

```ts
new Lenis({
  duration: 1.4,           // Inertia duration (seconds)
  easing: (t) => ...,      // Custom easing function
  smoothWheel: true,
  wheelMultiplier: 1,
  touchMultiplier: 2,
})
```

---

## License

MIT © [abdellahaarab](https://github.com/abdellahaarab)
