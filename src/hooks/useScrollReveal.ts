import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

interface ScrollRevealOptions {
  y?: number
  x?: number
  opacity?: number
  duration?: number
  delay?: number
  stagger?: number
  ease?: string
  start?: string
}

export function useScrollReveal(options: ScrollRevealOptions = {}) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const {
      y = 40,
      x = 0,
      opacity = 0,
      duration = 1,
      delay = 0,
      stagger = 0,
      ease = 'power3.out',
      start = 'top 85%',
    } = options

    const targets = stagger > 0 ? el.children : el

    gsap.fromTo(
      targets,
      { y, x, opacity, willChange: 'transform, opacity' },
      {
        y: 0,
        x: 0,
        opacity: 1,
        duration,
        delay,
        stagger,
        ease,
        scrollTrigger: {
          trigger: el,
          start,
          once: true,
        },
        clearProps: 'willChange',
      }
    )

    return () => {
      ScrollTrigger.getAll().forEach((st) => {
        if (st.trigger === el) st.kill()
      })
    }
  }, [])

  return ref
}

export function useCountUp(end: number, duration = 2) {
  const ref = useRef<HTMLSpanElement>(null)
  const startedRef = useRef(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const obj = { value: 0 }
    const trigger = ScrollTrigger.create({
      trigger: el,
      start: 'top 85%',
      once: true,
      onEnter: () => {
        if (startedRef.current) return
        startedRef.current = true
        gsap.to(obj, {
          value: end,
          duration,
          ease: 'power2.out',
          onUpdate: () => {
            el.textContent = Math.round(obj.value).toLocaleString()
          }
        })
      }
    })

    return () => trigger.kill()
  }, [end, duration])

  return ref
}
