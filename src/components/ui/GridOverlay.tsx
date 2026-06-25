import { cn } from '@/lib/utils'

interface GridOverlayProps {
  className?: string
  fade?: 'top' | 'bottom' | 'both' | 'none'
}

export default function GridOverlay({ className, fade = 'both' }: GridOverlayProps) {
  const fadeStyles = {
    top: 'mask-image-gradient-top',
    bottom: 'mask-image-gradient-bottom',
    both: '',
    none: '',
  }

  const maskStyle: React.CSSProperties = fade === 'both'
    ? { WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, black 20%, black 80%, transparent 100%)' }
    : fade === 'top'
    ? { WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, black 40%)' }
    : fade === 'bottom'
    ? { WebkitMaskImage: 'linear-gradient(to top, transparent 0%, black 40%)' }
    : {}

  return (
    <div
      className={cn('absolute inset-0 grid-overlay pointer-events-none', className)}
      style={maskStyle}
    />
  )
}
