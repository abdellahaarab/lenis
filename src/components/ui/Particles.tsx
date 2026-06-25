import { useEffect, useRef } from 'react'
import { randomRange } from '@/lib/utils'

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  size: number
  opacity: number
  opacitySpeed: number
}

interface ParticlesProps {
  count?: number
  className?: string
}

export default function Particles({ count = 80, className }: ParticlesProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const particlesRef = useRef<Particle[]>([])
  const rafRef = useRef<number>(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const resize = () => {
      canvas.width = canvas.offsetWidth
      canvas.height = canvas.offsetHeight
      initParticles()
    }

    const initParticles = () => {
      particlesRef.current = Array.from({ length: count }, () => ({
        x: randomRange(0, canvas.width),
        y: randomRange(0, canvas.height),
        vx: randomRange(-0.15, 0.15),
        vy: randomRange(-0.3, -0.05),
        size: randomRange(0.5, 2),
        opacity: randomRange(0.1, 0.6),
        opacitySpeed: randomRange(0.002, 0.008),
      }))
    }

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      particlesRef.current.forEach((p) => {
        p.x += p.vx
        p.y += p.vy
        p.opacity += p.opacitySpeed
        if (p.opacity > 0.6 || p.opacity < 0.05) p.opacitySpeed *= -1

        if (p.x < 0) p.x = canvas.width
        if (p.x > canvas.width) p.x = 0
        if (p.y < 0) p.y = canvas.height
        if (p.y > canvas.height) p.y = 0

        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(255, 255, 255, ${p.opacity})`
        ctx.fill()
      })

      rafRef.current = requestAnimationFrame(draw)
    }

    const observer = new ResizeObserver(resize)
    observer.observe(canvas)
    resize()
    rafRef.current = requestAnimationFrame(draw)

    return () => {
      observer.disconnect()
      cancelAnimationFrame(rafRef.current)
    }
  }, [count])

  return (
    <canvas
      ref={canvasRef}
      className={`absolute inset-0 w-full h-full pointer-events-none ${className ?? ''}`}
    />
  )
}
