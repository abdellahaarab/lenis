import { useEffect, useRef } from 'react'
import { useLanguage } from '@/i18n/LanguageContext'

export default function ProgressBar() {
  const ref = useRef<HTMLDivElement>(null)
  const { dir } = useLanguage()
  useEffect(() => {
    let frame = 0
    const update = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        const range = document.documentElement.scrollHeight - window.innerHeight
        if (ref.current) ref.current.style.transform = `scaleX(${range > 0 ? Math.min(1, Math.max(0, window.scrollY / range)) : 0})`
      })
    }
    update()
    window.addEventListener('scroll', update, { passive: true })
    window.addEventListener('resize', update)
    return () => { cancelAnimationFrame(frame); window.removeEventListener('scroll', update); window.removeEventListener('resize', update) }
  }, [])
  return <div ref={ref} aria-hidden="true" className="site-reading-progress fixed top-0 start-0 end-0 h-[3px] bg-gradient-to-r from-purple-600 to-purple-500 z-[60]" style={{ transform: 'scaleX(0)', transformOrigin: dir === 'rtl' ? 'right' : 'left' }} />
}
