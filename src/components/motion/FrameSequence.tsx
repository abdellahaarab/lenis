import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
export type SequenceManifest = { enabled: boolean; count: number; width: number; height: number; poster: string; frames?: string[]; mobileFrames?: string[]; pattern?: string; illustrative?: boolean };
export type SequenceHandle = { draw: (progress: number) => void };
export default forwardRef<SequenceHandle, { manifest: SequenceManifest; base: string; onFailure: () => void }>(function FrameSequence({ manifest, base, onFailure }, ref) {
  const canvas = useRef<HTMLCanvasElement>(null), images = useRef<(HTMLImageElement | undefined)[]>([]), position = useRef(0), last = useRef(-1);
  const [ready, setReady] = useState(false);
  const draw = (progress: number) => {
    position.current = progress;
    const target = Math.round(progress * (images.current.length - 1));
    let index = target;
    while (index > 0 && !images.current[index]?.complete) index--;
    const img = images.current[index], cvs = canvas.current;
    if (!cvs || !img?.naturalWidth || index === last.current) return;
    const ctx = cvs.getContext('2d'); if (!ctx) return;
    const ratio = Math.min(cvs.width / img.width, cvs.height / img.height);
    ctx.clearRect(0, 0, cvs.width, cvs.height);
    ctx.drawImage(img, (cvs.width - img.width * ratio) / 2, (cvs.height - img.height * ratio) / 2, img.width * ratio, img.height * ratio);
    last.current = index;
  };
  useImperativeHandle(ref, () => ({ draw }));
  useEffect(() => {
    let cancelled = false, begun = false;
    const mobile = matchMedia('(max-width: 767px)').matches;
    const all = mobile && manifest.mobileFrames?.length ? manifest.mobileFrames : manifest.frames ?? Array.from({ length: manifest.count }, (_, i) => (manifest.pattern ?? 'frame_{index}.webp').replace('{index}', String(i + 1).padStart(3, '0')));
    const files = mobile && !manifest.mobileFrames?.length ? all.filter((_, i) => i % 2 === 0) : all;
    images.current = new Array(files.length);
    const size = () => {
      const cvs = canvas.current; if (!cvs) return;
      const dpr = Math.min(devicePixelRatio, 2);
      cvs.width = cvs.clientWidth * dpr; cvs.height = cvs.clientHeight * dpr; last.current = -1; draw(position.current);
    };
    const load = (i: number) => new Promise<void>(resolve => {
      if (cancelled) { resolve(); return; }
      const img = new Image(); images.current[i] = img;
      img.onload = () => { if (!cancelled) { if (i === 0) setReady(true); size(); } resolve(); };
      img.onerror = () => { if (i === 0 && !cancelled) onFailure(); resolve(); };
      img.src = new URL(files[i], new URL(`${base}/`, location.origin)).href;
    });
    const begin = async () => {
      if (begun) return; begun = true;
      // Sparse pass first; bounded concurrency avoids blocking the main thread.
      for (const pass of [files.map((_, i) => i).filter(i => i % 4 === 0), files.map((_, i) => i).filter(i => i % 4 !== 0)]) {
        for (let n = 0; n < pass.length && !cancelled; n += 3) await Promise.all(pass.slice(n, n + 3).map(load));
      }
    };
    const observer = new IntersectionObserver(entries => { if (entries.some(e => e.isIntersecting)) { void begin(); observer.disconnect(); } }, { rootMargin: '200px' });
    if (canvas.current) observer.observe(canvas.current);
    const resize = new ResizeObserver(size); if (canvas.current) resize.observe(canvas.current);
    return () => { cancelled = true; observer.disconnect(); resize.disconnect(); images.current.forEach(img => { if (img) { img.onload = null; img.onerror = null; } }); images.current = []; };
  }, [manifest, base]);
  return <div className="frame-sequence"><img src={`${base}/${manifest.poster}`} alt="" width={manifest.width} height={manifest.height} /><canvas ref={canvas} style={{ opacity: ready ? 1 : 0 }} aria-hidden="true" /></div>;
});
