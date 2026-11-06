import { useRef } from 'react'
import MotionHeading from '@/components/home/MotionHeading'
import { referenceHome } from '@/data/reference-home'
import { isLite } from '@/hooks/useMotionMode'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { ShieldCheck, ArrowLeft, ArrowRight, Check } from 'lucide-react'
import { useLanguage } from '@/i18n/LanguageContext'
export default function Service(){
 const {t,language,dir}=useLanguage()
 const ref=useRef<HTMLElement>(null)
 const ar=language==='ar',Arrow=ar?ArrowLeft:ArrowRight
 useGSAP(()=>{
  const mm=gsap.matchMedia()
  mm.add('(prefers-reduced-motion: no-preference)',()=>{
   if (isLite()) return
   gsap.utils.toArray<HTMLElement>('.service-row').forEach(row=>gsap.from(row,{x:ar?30:-30,opacity:0,duration:.7,scrollTrigger:{trigger:row,start:'top 90%',once:true}}))
   gsap.from('.service-seal',{rotate:-15,scale:.85,duration:1.1,ease:'power3.out',scrollTrigger:{trigger:'.service-seal',start:'top 85%',once:true}})
  })
  return()=>mm.revert()
 },{scope:ref,dependencies:[dir],revertOnUpdate:true})
 return <section id="service" className="service-section section-space" ref={ref}><div className="page-shell service-grid"><div className="service-copy"><div className="eyebrow"><span className="section-index">05</span>{ar?'اطمئنان في كل خطوة':'CONFIDENCE AT EVERY STEP'}</div><MotionHeading lines={referenceHome[language].serviceTitle} accent/><p>{t.service.subtitle}</p><div className="service-seal"><ShieldCheck size={54} strokeWidth={1.3}/><span>{t.service.motto}</span></div><a className="action-text" href="#contact" onClick={()=>window.dispatchEvent(new CustomEvent('setup-interest',{detail:'support'}))}>{t.service.helpCta}<Arrow size={20}/></a></div><div className="service-list">{t.service.stages.map((s,i)=><div className="service-row" key={s.title}><span>0{i+1}</span><div><h3>{s.title}</h3><p>{s.description}</p></div><Check size={20}/></div>)}</div></div></section>
}
