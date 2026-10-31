import {useCatalog, useHomeImage} from '@/data/CatalogContext'
import {referenceHome} from '@/data/reference-home'
import MotionHeading from '@/components/home/MotionHeading'
import { isLite } from '@/hooks/useMotionMode'
import { useRef } from 'react'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { ArrowDown, ArrowUpLeft, ArrowUpRight, Search, ShoppingBag } from 'lucide-react'
import { useLanguage } from '@/i18n/LanguageContext'
import { Link } from 'react-router-dom'
gsap.registerPlugin(ScrollTrigger, useGSAP)
export default function Hero() {
  const { language, dir } = useLanguage()
  const {site}=useCatalog()
  const heroLaptop = useHomeImage('hero_laptop', '/images/home-reference/laptop.webp')
  const heroHeadphones = useHomeImage('hero_headphones', '/images/home-reference/headphones.webp')
  const copy=referenceHome[language]
  const [titleLead,...titleRest]=copy.storefrontTitle
  const ref = useRef<HTMLElement>(null)
  const ar = language === 'ar'
  const Arrow = ar ? ArrowUpLeft : ArrowUpRight
  useGSAP(() => {
    const mm = gsap.matchMedia()
    mm.add('(min-width: 900px) and (prefers-reduced-motion: no-preference)', () => {
      if (isLite()) return
      gsap.from('.hero-copy > *', { y: 32, autoAlpha: 0, duration: .9, stagger: .1, ease: 'power3.out' })
      gsap.from('.hero-product img', { y: 60, rotate: -18, autoAlpha: 0, duration: 1.5, ease: 'power3.out' })
      gsap.from('.hero-detail', { autoAlpha: 0, duration: .8, stagger: .15, delay: .5 })
      gsap.from('.product-note', { y: 30, duration: .8, delay: .5 })
      gsap.to('.hero-product', { y: -90, rotate: 5, ease: 'none', scrollTrigger: { trigger: ref.current, start: 'top top', end: 'bottom top', scrub: 1 } })
      gsap.to('.hero-orbit', { rotate: 45, scale: 1.12, ease: 'none', scrollTrigger: { trigger: ref.current, start: 'top top', end: 'bottom top', scrub: 1.4 } })
      gsap.to('.hero-headphones', { y: -45, rotate: -12, ease: 'none', scrollTrigger: { trigger: ref.current, start: 'top top', end: 'bottom top', scrub: 1 } })
    })
    mm.add('(max-width: 899px) and (prefers-reduced-motion: no-preference)', () => {
      if (isLite()) return
      gsap.from('.hero-copy .motion-word', { yPercent: 105, opacity: 0, duration: .7, stagger: .07, ease: 'power3.out' })
      gsap.from('.hero-description, .hero-helper, .hero-actions', { y: 16, opacity: 0, duration: .5, stagger: .08, delay: .12 })
      gsap.from('.hero-product img', { y: 24, rotate: -3, opacity: 0, duration: .85, ease: 'power3.out' })
      gsap.from('.hero-detail', { y: 12, opacity: 0, duration: .5, stagger: .1, delay: .25 })
      gsap.to('.hero-product', { y: -24, rotate: 2, ease: 'none', scrollTrigger: { trigger: '.hero-art', start: 'top 85%', end: 'bottom top', scrub: .4 } })
      gsap.to('.hero-headphones', { y: -16, rotate: -6, ease: 'none', scrollTrigger: { trigger: '.hero-art', start: 'top 85%', end: 'bottom top', scrub: .4 } })
    })
    return () => mm.revert()
  }, { scope: ref, dependencies: [dir], revertOnUpdate: true })
  return <section id="hero" ref={ref} className="hero-scene">
    <div className="page-shell hero-grid">
      <div className="hero-copy">
        <div className="eyebrow"><span className="status-dot" />{site.storeName[language]}<span className="eyebrow-divider" />{site.city[language]}</div>
        <MotionHeading as="h1" lines={titleRest.length ? [titleLead, titleRest.join(' ')] : [titleLead]} accent={titleRest.length > 0}/>
        <p className="hero-description">{copy.storefrontDescription}</p>
        <p className="hero-helper">{copy.storefrontHelper}</p>
        <div className="hero-actions"><Link to={`/${language}/shop`} className="action-primary"><ShoppingBag size={19} />{copy.storefrontShop}<Arrow size={21} /></Link><a href="#categories" className="action-text"><Search size={18} />{copy.storefrontCategories}</a></div>
        <div className="hero-assurance"><ShoppingBag size={19} /><span>{ar ? 'أجهزة وإلكترونيات' : 'Computers & electronics'}</span><i /><span>{ar ? 'ملحقات ومكونات' : 'Components & accessories'}</span></div>
      </div>
      <div className="hero-art">
        <div className="hero-orbit" aria-hidden="true" />
        <span className="art-coordinate" dir="ltr">01 / COMPUTER & TECH</span>
        {heroLaptop && <div className="hero-product"><img src={heroLaptop} alt={ar ? 'لابتوب بتصميم معدني وشاشة مفتوحة' : 'Laptop device, open in profile'} width="1600" height="766" fetchPriority="high" /></div>}
        <div className="hero-detail product-note"><span className="micro-label" dir="ltr">SHOP COMPUTER & TECH</span><span>{copy.storefrontSpotlight}</span></div>
        {heroHeadphones && <div className="hero-detail hero-headphones"><img src={heroHeadphones} width="614" height="680" alt={ar ? 'سماعات رأس' : 'Headphones'} /><span>{copy.storefrontAccessories}</span></div>}
        <span className="art-caption">{copy.storefrontBrowse} · {copy.illustration}</span>
      </div>
    </div>
    <nav className="page-shell mobile-home-shortcuts" aria-label={ar?'تصفح المتجر':'Browse the store'}>{[[`/${language}/shop`,copy.storefrontShop],['#categories',copy.storefrontCategories],[`/${language}/collections`,copy.storefrontOffers]].map(([href,label],i)=><a href={href} key={href}><span dir="ltr">0{i+1}</span><span>{label}</span><Arrow size={15}/></a>)}</nav>
    <div className="page-shell hero-bottom"><a href="#categories"><ArrowDown size={18}/>{ar ? 'ابدأ التسوق' : 'Start shopping'}</a><span dir="ltr">COMPUTERS / COMPONENTS / ACCESSORIES</span><span>{ar ? 'تسوق التقنية التي تناسبك.' : 'Find the technology that fits you.'}</span></div>
  </section>
}
