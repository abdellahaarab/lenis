import { useEffect, useState, type CSSProperties } from 'react';
export const transitionName = (id: string) => `product-${String(id ?? '').replace(/[^a-z0-9-]/gi, '-')}`;
export default function ProductImage({ src, alt, id, shared = false, eager = false }: { src: string; alt: string; id: string; shared?: boolean; eager?: boolean }) {
  const [loaded, setLoaded] = useState(false);
  useEffect(()=>setLoaded(false),[src]);
  const safeSrc = String(src ?? '');
  const webp = safeSrc.endsWith('-960.webp');
  return <img src={safeSrc} alt={alt} width={960} height={640} loading={eager ? 'eager' : 'lazy'}
    decoding="async" onLoad={() => setLoaded(true)} className={`catalog-image ${loaded ? 'is-loaded' : ''}`}
    srcSet={webp ? `${safeSrc.replace('-960', '-480')} 480w, ${safeSrc} 960w, ${safeSrc.replace('-960', '-1600')} 1600w` : undefined}
    sizes="(max-width: 600px) 90vw, (max-width: 1023px) 45vw, 30vw"
    style={{ viewTransitionName: shared ? transitionName(id) : 'none' } as CSSProperties} />;
}
