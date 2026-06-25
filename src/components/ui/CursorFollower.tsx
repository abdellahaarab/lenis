import { useEffect, useRef } from 'react'
import { lerp } from '@/lib/utils'

export default function CursorFollower() {
  const dotRef = useRef<HTMLDivElement>(null)
  const ringRef = useRef<HTMLDivElement>(null)
  const pos = useRef({ x: 0, y: 0 })
  const ringPos = useRef({ x: 0, y: 0 })
  const rafId = useRef<number>(0)
  const isHovering = useRef(false)

  useEffect(() => {
    const dot = dotRef.current
    const ring = ringRef.current
    if (!dot || !ring) return

    const onMove = (e: MouseEvent) => {
      pos.current = { x: e.clientX, y: e.clientY }
    }

    const onEnterLink = () => { isHovering.current = true }
    const onLeaveLink = () => { isHovering.current = false }

    const animate = () => {
      ringPos.current.x = lerp(ringPos.current.x, pos.current.x, 0.12)
      ringPos.current.y = lerp(ringPos.current.y, pos.current.y, 0.12)

      dot.style.transform = `translate(${pos.current.x - 4}px, ${pos.current.y - 4}px)`
      ring.style.transform = `translate(${ringPos.current.x - 20}px, ${ringPos.current.y - 20}px) scale(${isHovering.current ? 1.8 : 1})`

      rafId.current = requestAnimationFrame(animate)
    }

    const links = document.querySelectorAll('a, button, [data-cursor-hover]')
    links.forEach(el => {
      el.addEventListener('mouseenter', onEnterLink)
      el.addEventListener('mouseleave', onLeaveLink)
    })

    window.addEventListener('mousemove', onMove, { passive: true })
    rafId.current = requestAnimationFrame(animate)

    return () => {
      window.removeEventListener('mousemove', onMove)
      cancelAnimationFrame(rafId.current)
      links.forEach(el => {
        el.removeEventListener('mouseenter', onEnterLink)
        el.removeEventListener('mouseleave', onLeaveLink)
      })
    }
  }, [])

  return (
    <>
      <div
        ref={dotRef}
        className="cursor-dot fixed w-2 h-2 rounded-full bg-white pointer-events-none z-[9999] transition-opacity duration-300 will-change-transform"
        style={{ top: 0, left: 0 }}
      />
      <div
        ref={ringRef}
        className="cursor-dot fixed w-10 h-10 rounded-full border border-white/30 pointer-events-none z-[9998] transition-[transform,border-color] duration-150 will-change-transform"
        style={{ top: 0, left: 0 }}
      />
    </>
  )
}
