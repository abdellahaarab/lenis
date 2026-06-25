import { cn } from '@/lib/utils'

interface GradientOrbProps {
  className?: string
  color?: 'purple' | 'blue' | 'cyan' | 'multi'
  size?: 'sm' | 'md' | 'lg' | 'xl'
  blur?: boolean
}

export default function GradientOrb({ className, color = 'purple', size = 'lg', blur = true }: GradientOrbProps) {
  const colors = {
    purple: 'bg-accent-purple',
    blue: 'bg-accent-blue',
    cyan: 'bg-accent-cyan',
    multi: '',
  }

  const sizes = {
    sm: 'w-64 h-64',
    md: 'w-96 h-96',
    lg: 'w-[600px] h-[600px]',
    xl: 'w-[900px] h-[900px]',
  }

  const blurValues = {
    sm: 'blur-[80px]',
    md: 'blur-[100px]',
    lg: 'blur-[140px]',
    xl: 'blur-[200px]',
  }

  return (
    <div
      className={cn(
        'absolute rounded-full opacity-20 pointer-events-none',
        sizes[size],
        colors[color],
        blur && blurValues[size],
        color === 'multi' && 'bg-gradient-to-br from-accent-purple via-accent-blue to-accent-cyan',
        className
      )}
    />
  )
}
