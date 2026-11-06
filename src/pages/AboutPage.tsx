import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  ArrowLeft,
  ChevronRight,
  Shield,
  FileText,
  CheckCircle2,
  Headphones,
  Star,
  Eye,
  Award,
  Users,
  Target,
  Sparkles,
  MapPin,
  Calendar,
  TrendingUp,
  Zap,
  Heart,
  ShieldCheck,
} from 'lucide-react';
import { useLanguage } from '@/i18n/LanguageContext';
import { useCatalog } from '@/data/CatalogContext';
import defaultAbout from '@/data/about.json';

// Icon mapper from string key → Lucide component
const iconMap: Record<string, React.FC<{ className?: string }>> = {
  shield: ({ className }) => <Shield className={className} />,
  'file-text': ({ className }) => <FileText className={className} />,
  'check-circle': ({ className }) => <CheckCircle2 className={className} />,
  'file-signature': ({ className }) => <ShieldCheck className={className} />,
  headphones: ({ className }) => <Headphones className={className} />,
  star: ({ className }) => <Star className={className} />,
  eye: ({ className }) => <Eye className={className} />,
  award: ({ className }) => <Award className={className} />,
  users: ({ className }) => <Users className={className} />,
  target: ({ className }) => <Target className={className} />,
  sparkles: ({ className }) => <Sparkles className={className} />,
  'map-pin': ({ className }) => <MapPin className={className} />,
  calendar: ({ className }) => <Calendar className={className} />,
  trending: ({ className }) => <TrendingUp className={className} />,
  zap: ({ className }) => <Zap className={className} />,
  heart: ({ className }) => <Heart className={className} />,
};

function DynamicIcon({ icon, className }: { icon: string; className?: string }) {
  const Comp = iconMap[icon] ?? iconMap['star'];
  return <Comp className={className} />;
}

type AboutData = typeof defaultAbout;

// Fetch about data from CMS or fall back to static default
function useAboutData(): AboutData {
  const [data, setData] = useState<AboutData>(defaultAbout);
  useEffect(() => {
    fetch('/api/content/about', { cache: 'no-store' })
      .then(r => r.ok ? r.json() : null)
      .then(json => {
        if (json?.value && typeof json.value === 'object') {
          setData(json.value as AboutData);
        }
      })
      .catch(() => {/* use default */});
  }, []);
  return data;
}

export const AboutPage: React.FC = () => {
  const { language, dir } = useLanguage();
  const { site: siteData } = useCatalog();
  const Arrow = dir === 'rtl' ? ArrowLeft : ArrowRight;
  const about = useAboutData();
  const ar = language === 'ar';

  const L = (obj: { ar: string; en: string }) => obj[language] || obj.ar;

  // Schema.org JSON-LD
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: siteData.storeName[language] || siteData.storeName.ar,
    description: L(about.hero.description),
    address: { '@type': 'PostalAddress', addressLocality: "Sana'a", addressCountry: 'YE' },
  };

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 pt-28 pb-24">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      {/* ─── HERO SECTION ─── */}
      <section className="relative overflow-hidden mb-0">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 start-0 w-72 h-72 bg-purple-600/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
          <div className="absolute bottom-0 end-0 w-96 h-96 bg-purple-500/8 rounded-full blur-3xl translate-x-1/3 translate-y-1/3" />
        </div>

        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-6xl">
          {/* Breadcrumb */}
          <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-neutral-500 dark:text-neutral-400 mb-10">
            <Link to={`/${language}`} className="hover:text-purple-600 transition-colors">{ar ? 'الرئيسية' : 'Home'}</Link>
            <ChevronRight className={`w-3.5 h-3.5 shrink-0 ${dir === 'rtl' ? 'rotate-180' : ''}`} />
            <span className="text-neutral-800 dark:text-neutral-200 font-medium">{ar ? 'من نحن' : 'About Us'}</span>
          </nav>

          {/* Hero Content */}
          <div className="grid lg:grid-cols-2 gap-12 items-center pb-20">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 text-purple-700 dark:text-purple-300 text-xs font-bold uppercase tracking-wider mb-6">
                <MapPin className="w-3.5 h-3.5" />
                <span>{siteData.city?.[language] || (ar ? 'صنعاء، اليمن' : "Sana'a, Yemen")}</span>
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-neutral-900 dark:text-neutral-50 tracking-tight leading-tight mb-4">
                {L(about.hero.headline)}
              </h1>

              <p className="text-xl font-semibold text-purple-600 dark:text-purple-400 mb-6">
                {L(about.hero.subheadline)}
              </p>

              <p className="text-base text-neutral-600 dark:text-neutral-400 leading-relaxed mb-8 max-w-xl">
                {L(about.hero.description)}
              </p>

              <div className="flex flex-wrap gap-3">
                <Link
                  to={`/${language}/shop`}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold transition-colors"
                >
                  <span>{ar ? 'تصفح المتجر' : 'Explore Store'}</span>
                  <Arrow className="w-4 h-4" />
                </Link>
                {/* <Link
                  to={`/${language}/contact`}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-800 dark:text-neutral-200 text-sm font-semibold hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
                >
                  {ar ? 'تواصل معنا' : 'Contact Us'}
                </Link> */}
              </div>
            </div>

            {/* Hero visual / image */}
            <div className="relative hidden lg:block">
              {about.hero.heroImage ? (
                <img
                  src={about.hero.heroImage}
                  alt={L(about.hero.headline)}
                  className="w-full rounded-3xl object-cover aspect-[4/3] shadow-2xl shadow-purple-500/10"
                />
              ) : (
                <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-purple-600 to-purple-900 aspect-[4/3] flex items-center justify-center shadow-2xl shadow-purple-500/20">
                  {/* Decorative grid */}
                  <div className="absolute inset-0 opacity-20"
                    style={{
                      backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.15) 1px, transparent 1px)',
                      backgroundSize: '28px 28px'
                    }}
                  />
                  <div className="relative z-10 text-center p-8">
                    <div className="text-7xl font-black text-white/20 mb-4 font-mono">ج</div>
                    <p className="text-white/70 text-sm font-medium">{siteData.storeName[language] || siteData.storeName.ar}</p>
                    <p className="text-white/40 text-xs mt-1">{siteData.city?.[language] || (ar ? 'صنعاء' : "Sana'a")}</p>
                  </div>
                  {/* Floating stat pills */}
                  <div className="absolute top-6 end-6 bg-white/10 backdrop-blur-sm rounded-xl px-4 py-2 text-white text-sm font-bold border border-white/20">
                    7 {ar ? 'نقاط فحص' : 'Inspection Points'}
                  </div>
                  <div className="absolute bottom-6 start-6 bg-white/10 backdrop-blur-sm rounded-xl px-4 py-2 text-white text-sm font-bold border border-white/20">
                    100% {ar ? 'شفافية' : 'Transparent'}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ─── STATS STRIP ─── */}
      {about.stats.length > 0 && (
        <section className="bg-purple-600 dark:bg-purple-700 py-10 mb-20">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-6xl">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6 text-center">
              {about.stats.map((stat, i) => (
                <div key={i} className="text-white">
                  <div className="text-3xl sm:text-4xl font-extrabold mb-1" dir="ltr">{stat.value}</div>
                  <div className="text-purple-200 text-xs sm:text-sm font-medium">{L(stat.label)}</div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-6xl">

        {/* ─── STORY SECTION ─── */}
        <section className="mb-20">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Story image */}
            <div className={ar ? 'lg:order-2' : 'lg:order-1'}>
              {about.story.image ? (
                <img
                  src={about.story.image}
                  alt={L(about.story.title)}
                  className="w-full rounded-2xl object-cover aspect-[4/3] shadow-xl"
                />
              ) : (
                <div className="rounded-2xl bg-gradient-to-br from-neutral-100 to-purple-50 dark:from-neutral-900 dark:to-purple-950/30 border border-purple-200/50 dark:border-purple-800/30 aspect-[4/3] flex items-center justify-center">
                  <div className="text-center p-8">
                    <Calendar className="w-16 h-16 text-purple-400 mx-auto mb-4" />
                    {about.story.year && (
                      <div className="text-5xl font-extrabold text-purple-600 dark:text-purple-400 mb-2">{about.story.year}</div>
                    )}
                    <p className="text-neutral-500 text-sm">{ar ? 'سنة الانطلاق' : 'Year Founded'}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Story text */}
            <div className={ar ? 'lg:order-1' : 'lg:order-2'}>
              <span className="text-xs uppercase font-bold tracking-widest text-purple-600 dark:text-purple-400 block mb-3">
                {L(about.story.title)}
              </span>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-neutral-900 dark:text-neutral-50 mb-6 leading-tight">
                {ar ? 'كيف بدأت قصتنا' : 'How Our Story Began'}
              </h2>
              <p className="text-neutral-600 dark:text-neutral-400 leading-relaxed text-base whitespace-pre-line">
                {L(about.story.content)}
              </p>
            </div>
          </div>
        </section>

        {/* ─── MISSION SECTION ─── */}
        <section className="mb-20">
          <div className="p-8 sm:p-12 rounded-3xl bg-white dark:bg-neutral-900 border border-purple-200/60 dark:border-purple-800/30 shadow-xl shadow-purple-500/5 relative overflow-hidden">
            {/* BG decoration */}
            <div className="absolute top-0 end-0 p-8 opacity-5 text-purple-600 pointer-events-none">
              <Target className="w-48 h-48" />
            </div>
            <div className="relative z-10 grid lg:grid-cols-2 gap-10 items-center">
              <div>
                <span className="text-xs uppercase font-bold tracking-widest text-purple-600 dark:text-purple-400 block mb-3">
                  {L(about.mission.title)}
                </span>
                <blockquote className="text-2xl sm:text-3xl font-bold text-neutral-900 dark:text-neutral-100 leading-snug mb-4">
                  «{ar ? 'لا نبيع قطعة معزولة. نبيع تجهيزًا كاملًا يعمل معًا، ببيانات واضحة وضمان مكتوب.' : 'We never sell isolated pieces. We provide complete setups that work together, backed by transparent specs and written warranty.'}»
                </blockquote>
                <p className="text-neutral-600 dark:text-neutral-400 leading-relaxed">
                  {L(about.mission.content)}
                </p>
              </div>
              {about.mission.image && (
                <img
                  src={about.mission.image}
                  alt={L(about.mission.title)}
                  className="w-full rounded-2xl object-cover aspect-video shadow-lg"
                />
              )}
            </div>
          </div>
        </section>

        {/* ─── WHY US (Feature Grid) ─── */}
        {about.whyUs.length > 0 && (
          <section className="mb-20">
            <div className="text-center max-w-2xl mx-auto mb-12">
              <span className="text-xs uppercase font-bold tracking-widest text-purple-600 dark:text-purple-400 block mb-3">
                {ar ? 'لماذا تختارنا' : 'Why Choose Us'}
              </span>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-neutral-900 dark:text-neutral-50 mb-4">
                {ar ? 'ما يميزنا عن غيرنا' : 'What Sets Us Apart'}
              </h2>
              <p className="text-neutral-500 text-sm">
                {ar ? 'كل وعد نقطعه على أنفسنا مدعوم بآلية فحص وبيانات موثقة' : 'Every promise we make is backed by documented inspection mechanisms and verified data'}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {about.whyUs.map((item, i) => (
                <div
                  key={i}
                  className="group p-6 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 hover:border-purple-300 dark:hover:border-purple-700 hover:shadow-lg hover:shadow-purple-500/5 transition-all duration-200"
                >
                  <div className="w-11 h-11 rounded-xl bg-purple-500/10 flex items-center justify-center mb-4 group-hover:bg-purple-500/15 transition-colors">
                    <DynamicIcon icon={item.icon} className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                  </div>
                  <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100 mb-2">
                    {L(item.title)}
                  </h3>
                  <p className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
                    {L(item.description)}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ─── TEAM HIGHLIGHT ─── */}
        {about.teamHighlight && (
          <section className="mb-20">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div>
                <span className="text-xs uppercase font-bold tracking-widest text-purple-600 dark:text-purple-400 block mb-3">
                  {ar ? 'فريقنا' : 'Our Team'}
                </span>
                <h2 className="text-3xl sm:text-4xl font-extrabold text-neutral-900 dark:text-neutral-50 mb-6 leading-tight">
                  {L(about.teamHighlight.title)}
                </h2>
                <p className="text-neutral-600 dark:text-neutral-400 leading-relaxed text-base">
                  {L(about.teamHighlight.description)}
                </p>
              </div>
              <div>
                {about.teamHighlight.image ? (
                  <img
                    src={about.teamHighlight.image}
                    alt={L(about.teamHighlight.title)}
                    className="w-full rounded-2xl object-cover aspect-[4/3] shadow-xl"
                  />
                ) : (
                  <div className="rounded-2xl bg-gradient-to-br from-purple-50 to-purple-100 dark:from-neutral-900 dark:to-purple-950/20 border border-purple-200/50 dark:border-purple-800/30 aspect-[4/3] flex items-center justify-center">
                    <div className="text-center p-8">
                      <Users className="w-16 h-16 text-purple-400 mx-auto mb-4" />
                      <p className="text-purple-600 dark:text-purple-400 font-semibold text-lg">{ar ? 'خبراء التقنية' : 'Tech Experts'}</p>
                      <p className="text-neutral-500 text-sm mt-1">{ar ? 'في خدمتك دائماً' : 'Always at your service'}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        {/* ─── VALUES ─── */}
        {about.values.length > 0 && (
          <section className="mb-20">
            <div className="text-center max-w-2xl mx-auto mb-12">
              <span className="text-xs uppercase font-bold tracking-widest text-purple-600 dark:text-purple-400 block mb-3">
                {ar ? 'قيمنا' : 'Our Values'}
              </span>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-neutral-900 dark:text-neutral-50">
                {ar ? 'المبادئ التي نبني عليها' : 'The Principles We Build On'}
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              {about.values.map((val, i) => (
                <div
                  key={i}
                  className="text-center p-8 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800"
                >
                  <div className="w-14 h-14 rounded-2xl bg-purple-500/10 flex items-center justify-center mx-auto mb-5">
                    <DynamicIcon icon={val.icon} className="w-7 h-7 text-purple-600 dark:text-purple-400" />
                  </div>
                  <h3 className="text-lg font-bold text-neutral-900 dark:text-neutral-100 mb-3">{L(val.title)}</h3>
                  <p className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">{L(val.description)}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ─── CTA SECTION ─── */}
        <section className="text-center p-10 sm:p-14 rounded-3xl bg-gradient-to-br from-purple-600 to-purple-800 relative overflow-hidden">
          <div className="absolute inset-0 opacity-10"
            style={{
              backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.2) 1px, transparent 1px)',
              backgroundSize: '24px 24px'
            }}
          />
          <div className="relative z-10">
            <Sparkles className="w-10 h-10 text-purple-200 mx-auto mb-5" />
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white mb-4">{L(about.ctaTitle)}</h2>
            <p className="text-purple-200 text-sm sm:text-base max-w-lg mx-auto mb-8 leading-relaxed">{L(about.ctaDescription)}</p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <Link
                to={`/${language}/shop`}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white text-purple-700 font-semibold text-sm hover:bg-purple-50 transition-colors"
              >
                <span>{ar ? 'تصفح المتجر' : 'Explore Catalog'}</span>
                <Arrow className="w-4 h-4" />
              </Link>
              <Link
                to={`/${language}/warranty`}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white/10 border border-white/30 text-white font-semibold text-sm hover:bg-white/20 transition-colors"
              >
                {ar ? 'معايير الفحص والضمان' : 'Inspection Standards'}
              </Link>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default AboutPage;
