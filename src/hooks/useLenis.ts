import { useEffect, useRef } from 'react'
import Lenis from 'lenis'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

let lenisInstance: Lenis | null = null

export function useLenis() {
  const rafRef = useRef<number>(0)

  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.4,
      easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: 'vertical',
      gestureOrientation: 'vertical',
      smoothWheel: true,
      wheelMultiplier: 1,
      touchMultiplier: 2,
      infinite: false,
    })

    lenisInstance = lenis

    lenis.on('scroll', ScrollTrigger.update)

    gsap.ticker.add((time) => {
      lenis.raf(time * 1000)
    })

    gsap.ticker.lagSmoothing(0)

    return () => {
      lenis.destroy()
      lenisInstance = null
      gsap.ticker.remove((time) => {
        lenis.raf(time * 1000)
      })
      cancelAnimationFrame(rafRef.current)
    }
  }, [])

  return lenisInstance
}

export function scrollTo(target: string | number | HTMLElement, options?: { offset?: number; duration?: number }) {
  if (lenisInstance) {
    lenisInstance.scrollTo(target, options)
  }
}
