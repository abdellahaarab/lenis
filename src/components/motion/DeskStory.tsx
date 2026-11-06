import { useCatalog } from '@/data/CatalogContext';
import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import DeskStage, { type DeskHandle } from './DeskStage';
import { home } from '@/data/home';
import type { Product } from '@/data/types';
import { useLanguage } from '@/i18n/LanguageContext';
import { useMotionMode } from '@/hooks/useMotionMode';
import { ArrowDown, ArrowUpLeft, ArrowUpRight } from 'lucide-react';
gsap.registerPlugin(ScrollTrigger);
let introComplete = false;
export default function DeskStory(){
  const {products}=useCatalog();
  if(!products.some(p=>p.id===home.featuredId))return null;
  return <DeskStoryContent/>;
}
function DeskStoryContent() {
  const { products: productsData, bundles: bundles } = useCatalog();
  const root = useRef<HTMLElement>(null), desk = useRef<DeskHandle>(null);
  const { language } = useLanguage(), lite = useMotionMode();
  const all = productsData as Product[], product = all.find(p => p.id === home.featuredId)!;
  const counts = [all.length, new Set(all.map(p => p.category)).size, bundles.length];
  const power = all.find(p=>product.compatibleWith.includes(p.id) && p.category==='power');
  const companions = [all.find(p=>product.compatibleWith.includes(p.id) && p.category==='displays'), all.find(p=>p.category==='audio' && p.compatibleWith.includes(product.id)), all.find(p=>p.category==='network' && power?.compatibleWith.includes(p.id))];
  const specs = [product.specs.cpu, `${product.specs.ramGB} GB ${product.specs.ramType}`, `${product.specs.storageGB} GB ${product.specs.storageType}`, product.specs.batteryHealthPct == null ? home.batteryUnknown[language] : `${product.specs.batteryHealthPct}%`];
  const Arrow = language === 'ar' ? ArrowUpLeft : ArrowUpRight;
  useEffect(() => {
    if (lite) { root.current?.classList.remove('motion-ready'); desk.current?.update(0, 1); return; }
    const el = root.current!;
    let intro: gsap.core.Timeline | undefined;
    const state = { progress: 0 }, opening = { value: 0 };
    const mm = gsap.matchMedia();
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      el.classList.add('motion-ready');
      const timeline = gsap.timeline({ scrollTrigger: { id: 'desk-master', trigger: el, start: 'top top+=86', end: 'bottom bottom', scrub: .45,
        onUpdate: self => {
          if (self.progress > .002 && intro?.isActive()) { intro.progress(1); intro.kill(); introComplete = true; }
        },
      } });
      timeline.to(state, { progress: 1, duration: 1, ease: 'none', onUpdate: () => desk.current?.update(state.progress) });
      if (!introComplete && scrollY < 20) {
        const words = el.querySelectorAll('.hero-word'), actions = el.querySelector('.story-hero-actions'), numbers = el.querySelector('.story-metrics');
        intro = gsap.timeline({ onComplete: () => { introComplete = true; desk.current?.update(state.progress); } });
        desk.current?.update(0, 0);
        intro.from(words, { y: 16, opacity: 0, stagger: .14, duration: .42, ease: 'power3.out' }, .2)
          .to(opening, { value: .90, duration: 1.4, ease: 'power3.out', onUpdate: () => desk.current?.update(0, opening.value) }, .4)
          .from([numbers, actions], { y: 10, opacity: 0, duration: .6, stagger: 0, ease: 'power3.out' }, 1.6);
        intro.from('.desk-laptop', { opacity: 0, duration: .4 }, .4);
        el.querySelectorAll<HTMLElement>('.story-metrics strong').forEach((number, i) => {
          const counter = { value: 0 };
          intro!.to(counter, { value: counts[i], duration: .6, ease: 'power3.out', onUpdate: () => { number.textContent = String(Math.round(counter.value)); } }, 1.6);
        });
      } else desk.current?.update(state.progress);
      const tilt = el.querySelector<HTMLElement>('.desk-stage')!;
      const pointer = (event: PointerEvent) => {
        if (innerWidth < 1024 || event.pointerType !== 'mouse') return;
        const rect = tilt.getBoundingClientRect();
        gsap.to(tilt, { rotateY: ((event.clientX-rect.left)/rect.width-.5)*8, rotateX: -((event.clientY-rect.top)/rect.height-.5)*8, duration: .4, overwrite: 'auto', transformPerspective: 1200 });
      };
      const reset = () => gsap.to(tilt, { rotateX: 0, rotateY: 0, duration: .4 });
      tilt.addEventListener('pointermove', pointer); tilt.addEventListener('pointerleave', reset);
      return () => { intro?.kill(); tilt.removeEventListener('pointermove', pointer); tilt.removeEventListener('pointerleave', reset); el.classList.remove('motion-ready'); };
    });
    return () => mm.revert();
  }, [language, lite]);
  return <section id="hero" ref={root} className={`desk-story page-shell ${lite ? 'story-lite' : ''}`}>
    <div className="stage-sticky"><DeskStage ref={desk} product={product} lite={lite}/></div>
    <div className="story-copy">
      <section className="story-chapter chapter-hero" aria-labelledby="home-title">
        <p className="story-intro">{home.location[language]}</p>
        <h1 id="home-title">{home.title[language].split(' ').map((word,i)=><span className="hero-word" key={i}>{word}{' '}</span>)}</h1>
        <p className="story-lead">{home.intro[language]}</p>
        <div className="story-hero-actions"><a href="#contact" className="desk-action order-action">{home.prepare[language]}<Arrow size={20}/></a><Link className="desk-text-link" to={`/${language}/shop`}>{home.shop[language]}<Arrow size={18}/></Link></div>
        <div className="story-metrics">{counts.map((n,i)=><div key={i}><strong>{n}</strong><span>{home.metricLabels[i][language]}</span></div>)}</div>
        <p className="catalog-notice">{home.demo[language]}</p>
        <a href="#inside-device" className="story-scroll"><ArrowDown size={17}/>{home.chapters[1].title[language]}</a>
      </section>
      <section id="inside-device" className="story-chapter"><h2>{home.chapters[1].title[language]}</h2><p>{home.chapters[1].body[language]}</p><Link className="featured-product-link" to={`/${language}/shop/${product.category}/${product.slug}`} viewTransition><span>{product.title[language]}</span><Arrow size={19}/></Link><dl className="story-spec-list">{specs.map((value,i)=><div key={i}><dt>{home.specLabels[i][language]}</dt><dd dir={i===3?undefined:'ltr'}>{value}</dd></div>)}</dl></section>
      <section id="connected-desk" className="story-chapter"><h2>{home.chapters[2].title[language]}</h2><p>{home.chapters[2].body[language]}</p><ol className="compatibility-list">{companions.map((p,i)=>{
        if (!p) return null;
        const connection = i===1 ? p.connections?.find(c=>c.targetId===product.id) : (i===2 ? power : product)?.connections?.find(c=>c.targetId===p.id);
        return <li key={p.id}><span className="connection-index">{i+1}</span><div><Link to={`/${language}/shop/${p.category}/${p.slug}`} viewTransition>{p.title[language]}</Link><p>{connection?.verified ? `${connection.port}${connection.watts ? ` · ${connection.watts} W` : ''} ✓` : home.compatibilityUnknown[language]}</p></div></li>;
      })}</ol></section>
      <section id="power-story" className="story-chapter"><h2>{home.chapters[3].title[language]}</h2><p>{home.chapters[3].body[language]}</p><div className="power-caption"><span className="power-led"/>{home.stillOn[language]}</div><small>{home.powerNote[language]}</small><Link className="desk-text-link" to={`/${language}/warranty`}>{home.warrantyLink[language]}<Arrow size={18}/></Link></section>
    </div>
  </section>;
}
