import ProductDisplay from '@/components/sections/ReferenceDisplay'
import MotionHeading from '@/components/home/MotionHeading'
import { referenceHome } from '@/data/reference-home'
import { isLite } from '@/hooks/useMotionMode'
import { useRef, useState } from 'react'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { ArrowLeft, ArrowRight, Check } from 'lucide-react'
import { useLanguage } from '@/i18n/LanguageContext'
import { useHomeImage } from '@/data/CatalogContext'
gsap.registerPlugin(ScrollTrigger, useGSAP)
export default function Integration() {
  const { t, language, dir } = useLanguage()
  const laptopImg = useHomeImage('integration_laptop', '/images/home-reference/laptop.webp')
  const audioImg = useHomeImage('integration_audio', '/images/home-reference/headphones.webp')
  const ref = useRef<HTMLElement>(null)
  const [active, setActive] = useState(0)
  const ar = language === 'ar'
  const Arrow = ar ? ArrowLeft : ArrowRight
  useGSAP(() => {
    const mm = gsap.matchMedia()
    mm.add('(min-width: 900px) and (prefers-reduced-motion: no-preference)', () => {
      const tl = gsap.timeline({scrollTrigger: {trigger: ref.current, start: 'top top', end: '+=1700', pin: '.integration-sticky', scrub: 1, invalidateOnRefresh: true, onUpdate: s => setActive(Math.min(2, Math.floor(s.progress * 3)))}})
      tl.fromTo('.ecosystem-laptop', {x: -55, y: 55, scale: .87}, {x: 0, y: 0, scale: 1, duration: 1})
        .fromTo('.ecosystem-audio', {x: 100, y: 50, opacity: .12, rotate: 15}, {x: 0, y: 0, opacity: 1, rotate: 0, duration: 1}, .7)
        .fromTo('.ecosystem-desktop', {x: -80, y: 80, opacity: .1, scale: .8}, {x: 0, y: 0, opacity: 1, scale: 1, duration: 1}, 1.6)
        .to('.ecosystem-halo', {scale: 1.2, opacity: .8, duration: 1}, 1.5)
    })
    mm.add('(max-width: 899px) and (prefers-reduced-motion: no-preference)', () => {
      if (isLite()) return
      const timeline = gsap.timeline({ scrollTrigger: { trigger: '.ecosystem', start: 'top 88%', once: true } })
      timeline.from('.ecosystem-laptop', { y: 24, scale: .95, opacity: 0, duration: .65 })
        .from('.ecosystem-audio', { x: 16, y: 12, opacity: 0, duration: .5 }, .16)
        .from('.ecosystem-desktop', { y: 20, opacity: 0, duration: .5 }, .32)
      gsap.utils.toArray<HTMLElement>('.integration-step').forEach((step,i)=>{
        gsap.from(step, {x: ar ? 14 : -14, opacity: 0, duration: .45, scrollTrigger:{trigger:step,start:'top 90%',once:true}})
        ScrollTrigger.create({trigger:step,start:'top 68%',end:'bottom 40%',onEnter:()=>setActive(i),onEnterBack:()=>setActive(i)})
      })
    })
    return () => mm.revert()
  }, {scope:ref,dependencies:[dir],revertOnUpdate:true})
  return <section id="integration" ref={ref} className="integration-scene">
    <div className="integration-sticky"><div className="page-shell integration-grid">
      <div className="integration-copy"><div className="eyebrow"><span className="section-index">01</span>{ar ? 'الصورة الكاملة' : 'THE BIG PICTURE'}</div><MotionHeading lines={referenceHome[language].integrationTitle} accent/><p>{referenceHome[language].integrationDescription}</p>
        <div className="integration-steps">{t.integration.stages.map((s,i)=><div className={`integration-step ${active===i?'is-active':''}`} key={s.title}><span className="step-number">0{i+1}</span><div><h3>{s.title}</h3><p>{s.description}</p></div><Check size={18}/></div>)}</div>
        <a className="action-text" href="#setups">{t.integration.cta}<Arrow size={20}/></a>
      </div>
      <div className="ecosystem"><div className="ecosystem-halo" aria-hidden="true"/><span className="ecosystem-word" aria-hidden="true" dir="ltr">IN SYNC.</span>{laptopImg && <img className="ecosystem-laptop" src={laptopImg} alt={ar?'لابتوب للتجهيز الشخصي':'Laptop for your personal setup'} width="1600" height="766" loading="lazy"/>}{audioImg && <img className="ecosystem-audio" src={audioImg} alt={ar?'سماعات تكمل التجهيز':'Headphones to complete the setup'} width="614" height="680" loading="lazy"/>}<ProductDisplay className="ecosystem-desktop" label={ar?'شاشة ومحطة عمل متكاملة':'Display and desktop workstation'}/><span className="ecosystem-caption"><span className="status-dot"/>{ar?'اختيار. توافق. تكامل.':'CHOOSE. CONNECT. CREATE.'}</span></div>
    </div></div>
  </section>
}
