import { useEffect } from 'react'
import Lenis from 'lenis'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { isLite } from './useMotionMode'
gsap.registerPlugin(ScrollTrigger)
let lenisInstance: Lenis | null = null
export function useLenis(){
 useEffect(()=>{
  const mq=window.matchMedia('(prefers-reduced-motion: reduce)')
  let cleanup=()=>{}
  const setup=()=>{
   cleanup()
   document.documentElement.classList.toggle('motion-lite',isLite())
   if(isLite())return
   const lenis=new Lenis({duration:1.05,smoothWheel:true,syncTouch:false,anchors:true})
   lenisInstance=lenis
   const tick=(time:number)=>lenis.raf(time*1000)
   lenis.on('scroll',ScrollTrigger.update)
   gsap.ticker.add(tick)
   cleanup=()=>{gsap.ticker.remove(tick);lenis.destroy();lenisInstance=null}
  }
  setup();mq.addEventListener('change',setup)
  const refresh=()=>ScrollTrigger.refresh()
  document.fonts.ready.then(refresh)
  window.addEventListener('load',refresh)
  return()=>{cleanup();mq.removeEventListener('change',setup);window.removeEventListener('load',refresh)}
 },[])
}
export function scrollTo(target:string|number|HTMLElement,options?:{offset?:number;duration?:number}){
 if(lenisInstance)lenisInstance.scrollTo(target,options)
 else if(typeof target==='string')document.querySelector(target)?.scrollIntoView({behavior:'auto'})
 else if(typeof target==='number')window.scrollTo({top:target,behavior:'auto'})
 else target.scrollIntoView({behavior:'auto'})
}
export function setScrollLocked(locked:boolean){if(locked)lenisInstance?.stop();else lenisInstance?.start()}
