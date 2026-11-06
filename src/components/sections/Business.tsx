import ProductDisplay from '@/components/sections/ReferenceDisplay'
import MotionHeading from '@/components/home/MotionHeading'
import { referenceHome } from '@/data/reference-home'
import { isLite } from '@/hooks/useMotionMode'
import { useRef } from 'react'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { Server, Network, ShieldCheck, ArrowUpLeft, ArrowUpRight } from 'lucide-react'
import { useLanguage } from '@/i18n/LanguageContext'
const icons=[Server,Network,ShieldCheck]
export default function Business(){
 const {t,language,dir}=useLanguage()
 const ref=useRef<HTMLElement>(null)
 const ar=language==='ar',Arrow=ar?ArrowUpLeft:ArrowUpRight
 useGSAP(()=>{
  const mm=gsap.matchMedia()
  mm.add('(prefers-reduced-motion: no-preference)',()=>{
   if (isLite()) return
   gsap.from('.business-visual .product-display',{scale:1.15,rotate:-3,duration:1.2,ease:'power3.out',scrollTrigger:{trigger:'.business-visual',start:'top 85%',once:true}})
   gsap.from('.business-step',{y:30,opacity:0,stagger:.13,duration:.8,scrollTrigger:{trigger:'.business-process',start:'top 85%',once:true}})
   gsap.fromTo('.business-line',{scaleX:0},{scaleX:1,ease:'none',scrollTrigger:{trigger:'.business-process',start:'top 85%',end:'bottom 50%',scrub:1}})
  })
  return()=>mm.revert()
 },{scope:ref,dependencies:[dir],revertOnUpdate:true})
 return <section id="business" ref={ref} className="business-section section-space"><div className="page-shell"><div className="business-grid"><div className="business-copy"><div className="eyebrow"><span className="section-index">04</span>{ar?'للطموح الذي يكبر':'FOR GROWING AMBITIONS'}</div><MotionHeading lines={referenceHome[language].businessTitle} accent/><p>{t.business.description}</p><div className="business-pillars">{t.business.pillars.map((p,i)=>{const Icon=icons[i];return <div key={p.title}><Icon size={22}/><div><h3>{p.title}</h3><p>{p.description}</p></div></div>})}</div><a className="action-primary" href="#contact" onClick={()=>window.dispatchEvent(new CustomEvent('setup-interest',{detail:'business'}))}>{t.business.cta}<Arrow size={20}/></a></div><div className="business-visual"><span className="micro-label" dir="ltr">A BETTER WAY TO WORK.</span><ProductDisplay label={ar?'شاشة احترافية ومحطة عمل مكتبية':'Professional display and desktop workstation'}/><div className="business-visual-note"><span className="status-dot"/>{ar?'مساحة أذكى. إنجاز أكبر.':'Smarter spaces. Better work.'}</div></div></div><div className="business-process"><div className="business-line"/>{t.business.steps.map((s,i)=><div className="business-step" key={s.title}><span>0{i+1}</span><h3>{s.title}</h3><p>{s.description}</p></div>)}</div></div></section>
}
