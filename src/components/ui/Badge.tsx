import { cn } from '@/lib/utils'
import { ReactNode } from 'react'

interface BadgeProps {
  children: ReactNode
  className?: string
  variant?: 'default' | 'outline' | 'glow'
}

export default function Badge({ children, className, variant = 'default' }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium tracking-wide',
        variant === 'default' && 'bg-white/8 text-white/70 border border-white/10',
        variant === 'outline' && 'border border-white/20 text-white/60',
        variant === 'glow' && 'bg-accent-purple/15 text-purple-300 border border-accent-purple/25',
        className
      )}
    >
      {children}
    </span>
  )
}
