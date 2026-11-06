import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import FrameSequence, { type SequenceHandle, type SequenceManifest } from './FrameSequence';
import { home } from '@/data/home';
import type { Product } from '@/data/types';
import { useLanguage } from '@/i18n/LanguageContext';
export type DeskHandle = { update: (progress: number, opening?: number) => void };
const clamp = (n: number) => Math.max(0, Math.min(1, n));
const phase = (p: number, start: number, end: number) => clamp((p - start) / (end - start));
const style = (node: HTMLElement | SVGElement | null, key: 'transform'|'opacity'|'strokeDashoffset', value:string) => { if(node && node.style[key]!==value) node.style[key]=value; };
type StageNodes = {lid:HTMLElement|null;screen:HTMLElement|null;camera:HTMLElement;devices:(HTMLElement|null)[];wires:SVGPathElement[];active:SVGPathElement[];callouts:HTMLElement[];dim:HTMLElement;signal:HTMLElement|null;status:HTMLElement;counter:HTMLElement|null};
export default forwardRef<DeskHandle, { product: Product; lite: boolean }>(function DeskStage({ product, lite }, ref) {
  const root = useRef<HTMLDivElement>(null), sequence = useRef<SequenceHandle>(null);
  const cached = useRef<StageNodes|null>(null);
  const [manifest, setManifest] = useState<SequenceManifest | null>(null);
  useEffect(()=>{cached.current=null},[manifest]);
  const { language } = useLanguage();
  const labels = [product.specs.cpu, `${product.specs.ramGB} GB ${product.specs.ramType}`, `${product.specs.storageGB} GB ${product.specs.storageType}`, product.specs.batteryHealthPct == null ? home.batteryUnknown[language] : `${product.specs.batteryHealthPct}%`];
  useEffect(() => {
    if (lite) return;
    const controller = new AbortController();
    fetch('/sequences/desk/manifest.json', { signal: controller.signal }).then(r => r.ok ? r.json() : null).then(async m => {
      if (!m?.enabled || !Number.isInteger(m.count) || m.count < 2 || !m.width || !m.height || !m.poster) return;
      const first = m.frames?.[0] ?? (m.pattern ?? 'frame_{index}.webp').replace('{index}', '001');
      const response = await fetch(`/sequences/desk/${first}`, { method: 'HEAD', signal: controller.signal });
      if (response.ok && response.headers.get('content-type')?.startsWith('image/')) setManifest(m);
    }).catch(() => {});
    return () => controller.abort();
  }, [lite]);
  useImperativeHandle(ref, () => ({ update(p, opening) {
    const el = root.current; if (!el) return;
    const nodes = cached.current ?? (cached.current={lid:el.querySelector('.laptop-lid'),screen:el.querySelector('.laptop-screen'),camera:el.querySelector('.desk-camera')!,devices:['monitor','audio','router','ups'].map(n=>el.querySelector<HTMLElement>(`.desk-${n}`)),wires:Array.from(el.querySelectorAll<SVGPathElement>('.connection-wire')),active:Array.from(el.querySelectorAll<SVGPathElement>('.connection-active')),callouts:Array.from(el.querySelectorAll<HTMLElement>('.spec-callout')),dim:el.querySelector('.power-dim')!,signal:el.querySelector('.ups-signal'),status:el.querySelector('.power-status')!,counter:el.querySelector('.power-counter')});
    const open = opening ?? .90 + .10 * phase(p, .12, .36);
    style(nodes.lid,'transform',`rotateX(${-100 + open * 100}deg)`);
    // Brief power interruption is scroll-reversible; UPS restores the screen.
    const outage = phase(p, .76, .785) * (1 - phase(p, .80, .825));
    style(nodes.screen,'opacity',String((.3 + open * .7) * (1 - outage * .94)));
    style(nodes.camera,'transform',`scale(${1 + .18 * (1 - phase(p, .35, .48))})`);
    ['monitor', 'audio', 'router', 'ups'].forEach((name, i) => {
      const start = [.40, .52, .64, .79][i], q = phase(p, start, start + .07);
      const node = nodes.devices[i];
      if (!node) return;
      style(node,'opacity',String(q));
      style(node,'transform',`translate(${(i % 2 ? 1 : -1) * (1-q)*60}px, ${(1-q) * (i === 1 ? -50 : 35)}px)`);
    });
    nodes.wires.forEach((path, i) => {
      const q = phase(p, [.46, .58, .70, .84][i], [.51, .63, .75, .89][i]);
      style(path,'strokeDashoffset',String(1-q));
      const active = nodes.active[i];
      style(active,'opacity',String(phase(q, .90, 1)));
      style(active,'strokeDashoffset',String(1-q));
    });
    nodes.callouts.forEach((node, i) => {
      const start = .13 + i * .064;
      style(node,'opacity',String(phase(p, start, start+.018) * (1 - phase(p, start+.095, start+.115))));
      style(node,'transform',`translateY(${(1-phase(p,start,start+.018))*8}px)`);
    });
    style(nodes.dim,'opacity',String(.65 * phase(p,.755,.79) * (1-phase(p,.94,1))));
    style(nodes.signal,'opacity',String(phase(p,.81,.84)));
    style(nodes.status,'opacity',String(phase(p,.82,.86)));
    const counter = nodes.counter;
    if (counter) counter.textContent = `${Math.floor(phase(p,.82,.98)*12).toString().padStart(2,'0')}`;
    el.dataset.progress = p.toFixed(3);
    sequence.current?.draw(opening != null ? opening * .44 : .44 + .56 * p);
  } }), []);
  return <div ref={root} className="desk-stage" aria-label={home.illustration[language]}>
    <div className="stage-topline"><span>{product.brand} / {product.model}</span><span>{home.illustration[language]}</span></div>
    <div className="stage-visual"><div className="desk-floor" /><div className="power-dim" />
      <div className="desk-camera">
        {manifest && !lite ? <FrameSequence ref={sequence} base="/sequences/desk" manifest={manifest} onFailure={() => setManifest(null)} /> : <>
          <svg className="desk-monitor" viewBox="0 0 220 240" aria-hidden="true"><rect x="8" y="8" width="204" height="135" rx="7" fill="#343842"/><rect x="15" y="15" width="190" height="118" rx="3" fill="#322f83"/><path d="M30 104L75 46 118 91 175 35" fill="none" stroke="#bbb2f2" strokeWidth="3"/><path d="M97 145h27v49l39 13H59l38-13z" fill="#9da1ac"/><rect x="50" y="206" width="122" height="6" rx="3" fill="#656a77"/></svg>
          <div className="desk-laptop"><div className="laptop-lid"><div className="laptop-bezel"><i className="laptop-camera"/><div className="laptop-screen"><div className="screen-grid"/><span className="screen-mark">∞</span><span className="screen-word">{home.title[language]}</span><div className="screen-task"><i/><i/><i/></div></div><span className="laptop-brand">{product.brand}</span></div></div><div className="laptop-base"><div className="laptop-keys"/><div className="laptop-trackpad"/><i className="laptop-port"/></div><div className="laptop-edge"/></div>
          <svg className="desk-audio" viewBox="0 0 130 180" aria-hidden="true"><path d="M25 108V70a40 40 0 0180 0v38" fill="none" stroke="#525768" strokeWidth="17"/><path d="M24 68a41 41 0 0182 0" fill="none" stroke="#b7bbc6" strokeWidth="7"/><rect x="13" y="81" width="26" height="58" rx="12" fill="#282d39"/><rect x="93" y="81" width="26" height="58" rx="12" fill="#282d39"/><path d="M21 122v24l30 8" fill="none" stroke="#757b8c" strokeWidth="6"/></svg>
          <svg className="desk-router" viewBox="0 0 125 160" aria-hidden="true"><path d="M22 30h80v98c0 18-80 18-80 0z" fill="#d8dbe4"/><ellipse cx="62" cy="30" rx="40" ry="12" fill="#fafbff"/><path d="M37 120h50" stroke="#a8adbb" strokeWidth="3"/><circle cx="62" cy="133" r="3" fill="#3dbe8b"/></svg>
          <svg className="desk-ups" viewBox="0 0 135 180" aria-hidden="true"><path d="M25 15h73l20 15v137H25z" fill="#343947"/><path d="M98 15l20 15v137H98z" fill="#202534"/><rect x="40" y="39" width="42" height="27" rx="4" fill="#151b25"/><rect className="ups-signal" x="45" y="45" width="32" height="14" rx="2" fill="#f2a93b"/><path d="M42 90h38m-38 10h38m-38 10h38m-38 10h38m-38 10h38" stroke="#666d7e" strokeWidth="3"/></svg>
        </>}
        <svg className="desk-wires" viewBox="0 0 800 560" aria-hidden="true">{['M240 285H155V250','M490 330H650V250','M490 370H705V410','M470 395V470H180V425'].map((d,i)=><g key={d}><path d={d} pathLength="1" className="connection-wire"/><path d={d} pathLength="1" className="connection-active"/></g>)}</svg>
      </div>
      <div className="stage-callouts">{labels.map((value,i)=><div className={`spec-callout spec-${i}`} key={i}><svg viewBox="0 0 100 44" aria-hidden="true"><path d={i % 2 ? 'M0 40H60L95 5' : 'M5 5L40 40H100'} fill="none" stroke="currentColor"/><circle cx={i%2?0:100} cy="40" r="2"/></svg><span>{home.specLabels[i][language]}</span><strong dir={i===3 ? undefined : 'ltr'}>{value}</strong></div>)}</div>
      <div className="power-status"><span className="power-led"/>{home.stillOn[language]}<span className="power-counter" aria-hidden="true">00</span><small>{home.powerNote[language]}</small></div>
    </div>
    <div className="stage-bottomline"><span>{home.illustration[language]} · v0</span><span>{home.connections[language]}</span></div>
  </div>;
});
