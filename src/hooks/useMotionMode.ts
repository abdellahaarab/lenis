import { useEffect, useState } from 'react';
type Connection = EventTarget & { saveData?: boolean };
export function isLite() {
  return matchMedia('(prefers-reduced-motion: reduce)').matches || Boolean((navigator as Navigator & { connection?: Connection }).connection?.saveData) || (navigator.hardwareConcurrency ?? 8) <= 2;
}
export function useMotionMode() {
  const [lite, setLite] = useState(isLite);
  useEffect(() => {
    const mq = matchMedia('(prefers-reduced-motion: reduce)');
    const connection = (navigator as Navigator & { connection?: Connection }).connection;
    const update = () => setLite(isLite());
    mq.addEventListener('change', update); connection?.addEventListener('change', update);
    return () => { mq.removeEventListener('change', update); connection?.removeEventListener('change', update); };
  }, []);
  return lite;
}
