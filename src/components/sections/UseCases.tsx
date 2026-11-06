import ProductDisplay from '@/components/sections/ReferenceDisplay'
import MotionHeading from '@/components/home/MotionHeading'
import { isLite } from '@/hooks/useMotionMode'
import { useRef, useState } from 'react'
import * as Tabs from '@radix-ui/react-tabs'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'
import { ArrowLeft, ArrowRight, BookOpen, BriefcaseBusiness, AudioLines, Gamepad2, Check } from 'lucide-react'
import { useLanguage } from '@/i18n/LanguageContext'
import { useHomeImage } from '@/data/CatalogContext'
const images: Record<string,string> = {study:'study',work:'desktop',content:'content',gaming:'gaming'}
const icons = [BookOpen, BriefcaseBusiness, AudioLines, Gamepad2]
export default function UseCases(){
  const {t,dir,language}=useLanguage()
  const studyImg = useHomeImage('usecase_study', '/images/home-reference/study.webp')
  const contentImg = useHomeImage('usecase_content', '/images/home-reference/content.webp')
  const gamingImg = useHomeImage('usecase_gaming', '/images/home-reference/gaming.webp')
  const setupImages: Record<string, string | null> = { study: studyImg, content: contentImg, gaming: gamingImg }
  const ref=useRef<HTMLElement>(null)
  const [active,setActive]=useState('study')
  const ar=language==='ar'
  const Arrow=ar?ArrowLeft:ArrowRight
  useGSAP(()=>{
    const mm=gsap.matchMedia()
    mm.add('(prefers-reduced-motion: no-preference)',()=>{
      if (isLite()) return
      gsap.from('.setup-panel .setup-copy > *',{y:16,opacity:0,duration:.45,stagger:.045,clearProps:'all',scrollTrigger:{trigger:'.setup-copy',start:'top 94%',once:true}})
      gsap.from('.setup-panel .product-display, .setup-panel .setup-image > img',{scale:1.035,opacity:0,duration:.6,ease:'power2.out',clearProps:'all',scrollTrigger:{trigger:'.setup-image',start:'top 94%',once:true}})
    })
    return ()=>mm.revert()
  },{scope:ref,dependencies:[active,dir],revertOnUpdate:true})
  return <section id="setups" ref={ref} className="setups-section section-space"><div className="page-shell">
    <div className="section-heading"><div><div className="eyebrow"><span className="section-index">02</span>{ar?'تقنية على مقاس يومك':'MADE FOR YOUR EVERYDAY'}</div><MotionHeading lines={[t.useCases.title]}/></div><p>{t.useCases.subtitle}</p></div>
    <Tabs.Root dir={dir} value={active} onValueChange={setActive}><Tabs.List className="setup-tabs" aria-label={ar?'اختر استخدامك':'Choose your use case'}>{t.useCases.cases.map((c,i)=>{const Icon=icons[i];return <Tabs.Trigger key={c.id} value={c.id}><Icon size={20}/>{c.label}<span>0{i+1}</span></Tabs.Trigger>})}</Tabs.List>
    {t.useCases.cases.map((c,i)=><Tabs.Content key={c.id} value={c.id} className={`setup-panel setup-${c.id}`}><div className="setup-image">{c.id==='work'?<ProductDisplay label={c.title}/>:(setupImages[c.id]?<img src={setupImages[c.id]!} alt={c.title} width="1200" height="800" loading="lazy"/>:<div className="setup-placeholder" style={{width:'100%',height:320,display:'flex',alignItems:'center',justifyContent:'center',background:'rgba(255,255,255,0.03)',borderRadius:16,border:'1px dashed rgba(255,255,255,0.1)'}}><span>{c.label}</span></div>)}<div className="setup-image-caption"><span dir="ltr">SETUP / 0{i+1}</span><span>{c.label}</span></div></div><div className="setup-copy"><span className="micro-label">{ar?'مساحتك. بطريقتك.':'YOUR SPACE. YOUR WAY.'}</span><h3>{c.title}</h3><p>{c.description}</p><ul>{c.items.map(item=><li key={item}><Check size={18}/>{item}</li>)}</ul><a className="action-primary" href="#contact" onClick={()=>window.dispatchEvent(new CustomEvent('setup-interest',{detail:c.id}))}>{c.cta}<Arrow size={20}/></a><span className="setup-footnote">{ar?'نوازن بين احتياجك، التوافق، والميزانية.':'Balanced around your needs, compatibility and budget.'}</span></div></Tabs.Content>)}
    </Tabs.Root>
  </div></section>
}
