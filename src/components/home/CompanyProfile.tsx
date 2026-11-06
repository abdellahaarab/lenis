import { Link } from 'react-router-dom';
import { useLanguage } from '@/i18n/LanguageContext';
import {
  ShieldAlert,
  Cpu,
  Zap,
  Award,
  CheckCircle,
  Building2,
  Users2,
  Layers,
  ArrowUpLeft,
  ArrowUpRight
} from 'lucide-react';

export default function CompanyProfile() {
  const { language } = useLanguage();
  const ar = language === 'ar';
  const Arrow = ar ? ArrowUpLeft : ArrowUpRight;

  const pillars = [
    {
      icon: Award,
      title: ar ? 'فحص مخبري صارم من 7 مراحل' : 'Rigorous 7-Point Lab Inspection',
      desc: ar
        ? 'لا يصل جهاز إلى يد العميل قبل اجتياز اختبارات الإجهاد الحراري، قياس كفاءة البطارية الحقيقية، وقراءة تقارير SMART لوسائط التخزين.'
        : 'Every unit passes thermal stress benchmarks, accurate charge-cycle telemetry, and SMART drive health verifications before handover.'
    },
    {
      icon: Layers,
      title: ar ? 'التوافق والربط العتادي المتكامل' : 'Engineered Hardware Synergy',
      desc: ar
        ? 'نختار الأجهزة والشاشات ووحدات توزيع المنافذ التي تعمل معاً بدون أي تعارض في الترددات، نقل الطاقة، أو منافذ Thunderbolt وType-C.'
        : 'We curate laptops, displays, hubs, and cables guaranteed to synchronize without bandwidth choke or power delivery conflicts.'
    },
    {
      icon: Zap,
      title: ar ? 'استمرارية الطاقة وحماية البيانات' : 'Power Resilience & Continuity',
      desc: ar
        ? 'حلول متخصصة ومصممة لواقع بيئة العمل في صنعاء، تدمج وحدات UPS الذكية مع أنظمة عمل تحمي عتادك وأعمالك من الانقطاع المفاجئ.'
        : 'Specialized architectures crafted for Sana’a power realities, integrating smart UPS units to preserve uninterrupted workflows.'
    },
    {
      icon: ShieldAlert,
      title: ar ? 'ضمان مكتوب ودعم محلي مباشر' : 'Written Warranty & Local Support',
      desc: ar
        ? 'سياسة واضحة وشفافة لدرجات الحالة وفترة الضمان، مع فريق فني متواجد محلياً في صنعاء لمتابعة أي استفسار أو صيانة.'
        : 'Transparent condition grading and solid warranty protection, backed by dedicated local technical assistance in Sana’a.'
    }
  ];

  const stats = [
    {
      value: '100%',
      label: ar ? 'فحص فني شفاف ومعلن' : 'Transparent Diagnostic Tests'
    },
    {
      value: '7',
      label: ar ? 'فئات تقنية متكاملة' : 'Specialized Tech Categories'
    },
    {
      value: '4+',
      label: ar ? 'بيئات عمل مجهزة للمؤسسات' : 'Ready Workstation Architectures'
    },
    {
      value: ar ? 'صنعاء' : 'Sana’a',
      label: ar ? 'مقر المؤسسة والدعم الميداني' : 'Headquarters & Local Hub'
    }
  ];

  return (
    <section id="about-profile" className="company-profile-section page-shell">
      <div className="profile-container">
        {/* Header & Mission Statement */}
        <div className="profile-header">
          <div className="eyebrow-chip">
            <Building2 size={15} />
            <span>{ar ? 'الملف التعريفي للمؤسسة' : 'Institutional Profile'}</span>
          </div>

          <h2>
            {ar ? (
              <>
                نحن لا نبيع أجهزة منفصلة..
                <br />
                <span className="text-brand-gradient">بل نبني بيئات عمل متكاملة تدوم.</span>
              </>
            ) : (
              <>
                We don’t just sell standalone hardware..
                <br />
                <span className="text-brand-gradient">We build enduring, integrated workstations.</span>
              </>
            )}
          </h2>

          <p className="profile-lead">
            {ar
              ? 'تأسست "الجيل العربي الرقمي" في صنعاء لتكون المرجع الموثوق للمحترفين، المهندسين، والشركات التي تبحث عن أداء حقيقي بدون مساومة. نختار نخبة حواسيب الأعمال العالمية، ونعالج التحديات التقنية المحلية عبر التوافق المدروس واستمرارية الطاقة.'
              : 'Digital Arab Generation was established in Sana’a to serve as the definitive hub for professionals, engineers, and enterprises seeking uncompromised computing reliability. We source premium business laptops and solve local infrastructural hurdles through verified compatibility and power resilience.'}
          </p>
        </div>

        {/* 4 Pillars Grid */}
        <div className="pillars-grid">
          {pillars.map((p, idx) => {
            const Icon = p.icon;
            return (
              <div key={idx} className="pillar-card">
                <div className="pillar-icon-box">
                  <Icon size={24} />
                </div>
                <h3>{p.title}</h3>
                <p>{p.desc}</p>
              </div>
            );
          })}
        </div>

        {/* Stats Row */}
        <div className="profile-stats-bar">
          {stats.map((s, idx) => (
            <div key={idx} className="profile-stat-item">
              <strong>{s.value}</strong>
              <span>{s.label}</span>
            </div>
          ))}
        </div>

        {/* Bottom CTA Banner */}
        <div className="profile-footer-box">
          <div className="footer-box-text">
            <h3>{ar ? 'هل ترغب في تجهيز مكتبك أو فريق عملك؟' : 'Equipping your office or entire corporate team?'}</h3>
            <p>
              {ar
                ? 'استشر فريقنا التقني في صنعاء لاختيار التوليفة المثالية بين المواصفات، الميزانية، واستمرارية التشغيل.'
                : 'Consult our hardware engineering team in Sana’a to select the optimal setup balancing specs, budget, and operational uptime.'}
            </p>
          </div>
          <div className="footer-box-actions">
            <a href="#contact" className="desk-action order-action">
              <span>{ar ? 'تجهيز طلب عرض سعر' : 'Prepare Quote Request'}</span>
              <Arrow size={18} />
            </a>
            <Link to={`/${language}/about`} className="desk-text-link">
              <span>{ar ? 'قراءة النبذة الكاملة' : 'Read Full Corporate About'}</span>
              <Arrow size={16} />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
