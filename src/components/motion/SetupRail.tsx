import { useCatalog } from '@/data/CatalogContext';
import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useLanguage } from '@/i18n/LanguageContext';
import { useMotionMode } from '@/hooks/useMotionMode';
import { home } from '@/data/home';
import type { Product } from '@/data/types';
import ProductImage from '@/components/shop/ProductImage';
export default function SetupRail() {
  const { bundles: bundles, products: productsData } = useCatalog();
  const root = useRef<HTMLElement>(null), track = useRef<HTMLDivElement>(null);
  const { language, t } = useLanguage(), lite = useMotionMode();
  useEffect(() => {
    if (lite) return;
    const mm = gsap.matchMedia();
    mm.add('(min-width: 1024px) and (prefers-reduced-motion: no-preference)', () => {
      const el = root.current!, rail = track.current!;
      const distance = () => rail.scrollWidth - rail.parentElement!.clientWidth;
      const tl = gsap.timeline({ scrollTrigger: { id:'setup-horizontal', trigger: el, start:'top top+=86', end:()=>`+=${distance()+innerHeight}`, pin:true, scrub:.5, invalidateOnRefresh:true } });
      tl.to(rail, { x:()=> (language==='ar'?1:-1)*distance(), ease:'none', duration:4 }, 0);
      rail.querySelectorAll<HTMLElement>('.setup-desk').forEach((desk,i)=>{
        tl.from(desk.querySelectorAll('.setup-device'), { y:24, opacity:.15, stagger:.12, duration:.25, ease:'power2.out' }, i*.95);
      });
    });
    return () => mm.revert();
  }, [language,lite]);
  return <section id="setups" ref={root} className={`setup-rail-section ${lite?'setup-lite':''}`}><div className="page-shell"><div className="quiet-heading"><div><h2>{home.setupsTitle[language]}</h2><p>{home.setupsBody[language]}</p></div><span>{home.setupHint[language]} <span aria-hidden="true">{language==='ar'?'←':'→'}</span></span></div></div><div className="setup-viewport" data-lenis-prevent><div className="setup-track" ref={track}>{bundles.map((bundle,index)=>{
    const tier = bundle.tiers[0], all = productsData as Product[], items = tier.items.map(id=>all.find(p=>p.id===id)).filter((p):p is Product=>Boolean(p));
    return <article className="setup-desk" key={bundle.id}><div className="setup-desk-header"><h3>{bundle.title[language]}</h3><span>{tier.price.usd == null ? t.shop.askForPrice : `$${tier.price.usd}`}</span></div><div className={`setup-composition composition-${index}`}>{items.map((p,i)=><Link className={`setup-device device-${i}`} key={p.id} to={`/${language}/shop/${p.category}/${p.slug}`} viewTransition aria-label={`${p.model} · ${p.title[language]}`}><ProductImage src={p.images[0]} id={p.id} alt={p.title[language]}/><span>{p.model}</span></Link>)}<div className="setup-desk-surface"/></div><p>{tier.summary[language]}</p><ul className="setup-component-list">{items.map(p=><li key={p.id}><Link to={`/${language}/shop/${p.category}/${p.slug}`} viewTransition>{p.title[language]} <span aria-hidden="true">{language==='ar'?'↖':'↗'}</span></Link></li>)}</ul></article>;
  })}</div></div></section>;
}
