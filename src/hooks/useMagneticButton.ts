import { useRef, useEffect } from 'react'
import { lerp } from '@/lib/utils'

export function useMagneticButton(strength = 0.4) {
  const ref = useRef<HTMLButtonElement | HTMLAnchorElement>(null)
  const pos = useRef({ x: 0, y: 0 })
  const current = useRef({ x: 0, y: 0 })
  const rafId = useRef<number>(0)
  const isHovered = useRef(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const animate = () => {
      if (isHovered.current) {
        current.current.x = lerp(current.current.x, pos.current.x, 0.1)
        current.current.y = lerp(current.current.y, pos.current.y, 0.1)
        el.style.transform = `translate(${current.current.x}px, ${current.current.y}px)`
      } else {
        current.current.x = lerp(current.current.x, 0, 0.1)
        current.current.y = lerp(current.current.y, 0, 0.1)
        if (Math.abs(current.current.x) > 0.01 || Math.abs(current.current.y) > 0.01) {
          el.style.transform = `translate(${current.current.x}px, ${current.current.y}px)`
        }
      }
      rafId.current = requestAnimationFrame(animate)
    }

    const onMouseEnter = () => {
      isHovered.current = true
    }

    const onMouseMove = (e: Event) => {
      if (!isHovered.current) return
      const me = e as MouseEvent
      const rect = el.getBoundingClientRect()
      const cx = rect.left + rect.width / 2
      const cy = rect.top + rect.height / 2
      pos.current.x = (me.clientX - cx) * strength
      pos.current.y = (me.clientY - cy) * strength
    }

    const onMouseLeave = () => {
      isHovered.current = false
      pos.current = { x: 0, y: 0 }
    }

    el.addEventListener('mouseenter', onMouseEnter)
    el.addEventListener('mousemove', onMouseMove)
    el.addEventListener('mouseleave', onMouseLeave)
    rafId.current = requestAnimationFrame(animate)

    return () => {
      el.removeEventListener('mouseenter', onMouseEnter)
      el.removeEventListener('mousemove', onMouseMove)
      el.removeEventListener('mouseleave', onMouseLeave)
      cancelAnimationFrame(rafId.current)
    }
  }, [strength])

  return ref
}
