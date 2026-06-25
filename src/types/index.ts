export interface MousePosition {
  x: number
  y: number
  normalizedX: number
  normalizedY: number
}

export interface ParticleConfig {
  count: number
  size: [number, number]
  speed: [number, number]
  opacity: [number, number]
}

export interface FeatureCard {
  icon: string
  title: string
  description: string
  tag?: string
  gradient?: string
}

export interface StatItem {
  value: string
  label: string
  suffix?: string
  prefix?: string
}

export interface TestimonialItem {
  quote: string
  author: string
  role: string
  company: string
  avatar?: string
}

export interface ShowcaseItem {
  name: string
  url: string
  category: string
  image?: string
}

export interface CodeTab {
  label: string
  language: string
  code: string
}

export interface NavItem {
  label: string
  href: string
}
