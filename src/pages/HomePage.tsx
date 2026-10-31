import Hero from '@/components/sections/Hero';
import StoreCategoryShelves from '@/components/sections/StoreCategoryShelves';
import Trust from '@/components/sections/Trust';
import { useRef } from 'react';
import { useLanguage } from '@/i18n/LanguageContext';
import { useHomeMotion } from '@/hooks/useHomeMotion';
import '@/mobile-home.css';
export default function HomePage(){
  const ref = useRef<HTMLElement>(null);
  const { language } = useLanguage();
  useHomeMotion(ref, language);
  return <main ref={ref} id="main-content" className="reference-home"><Hero/><StoreCategoryShelves/><Trust/></main>;
}
