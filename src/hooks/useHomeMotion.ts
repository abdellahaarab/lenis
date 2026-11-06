import type { RefObject } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import { isLite } from './useMotionMode';

gsap.registerPlugin(ScrollTrigger, useGSAP);

export function useHomeMotion(scope: RefObject<HTMLElement | null>, language: string) {
  useGSAP(() => {
    const mm = gsap.matchMedia();
    mm.add('(max-width: 899px) and (prefers-reduced-motion: no-preference)', () => {
      if (isLite()) return;
      const root = scope.current;
      if (!root) return;
      root.querySelectorAll<HTMLElement>('section:not(#hero) [data-motion-heading]').forEach(heading => {
        gsap.from(heading.querySelectorAll('.motion-word'), {
          yPercent: 105, opacity: 0, duration: .55, stagger: .035, ease: 'power3.out',
          scrollTrigger: { trigger: heading, start: 'top 93%', once: true },
        });
      });
      root.querySelectorAll<HTMLElement>('section:not(#hero) .eyebrow, .section-heading > p, .business-copy > p, .service-copy > p, .contact-grid > div > p, .catalog-head-sub, .section-head-desc').forEach(element => {
        gsap.from(element, { y: 14, opacity: 0, duration: .45, ease: 'power2.out',
          scrollTrigger: { trigger: element, start: 'top 94%', once: true } });
      });
      // Native touch scrolling is retained. Only a small transform follows the scroll.
      root.querySelectorAll<HTMLElement>('.business-visual').forEach(visual => {
        gsap.fromTo(visual, { y: 12 }, { y: -12, ease: 'none',
          scrollTrigger: { trigger: visual, start: 'top bottom', end: 'bottom top', scrub: .4 } });
      });
    });
    let frame = 0;
    const refresh = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => ScrollTrigger.refresh());
    };
    const root = scope.current;
    root?.addEventListener('load', refresh, true);
    return () => { cancelAnimationFrame(frame); root?.removeEventListener('load', refresh, true); mm.revert(); };
  }, { scope, dependencies: [language], revertOnUpdate: true });
}
