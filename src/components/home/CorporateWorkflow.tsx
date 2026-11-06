import { useLanguage } from '@/i18n/LanguageContext';
import { home } from '@/data/home';
import {
  Users2,
  FileSearch,
  Laptop,
  CheckCircle2,
  Truck,
  ArrowUpLeft,
  ArrowUpRight
} from 'lucide-react';

export default function CorporateWorkflow() {
  const { language } = useLanguage();
  const ar = language === 'ar';
  const Arrow = ar ? ArrowUpLeft : ArrowUpRight;

  const stepDetails = [
    {
      icon: FileSearch,
      title: ar ? '1. تحليل الاحتياج والاستخدام' : '1. Needs & Workflow Analysis',
      desc: ar
        ? 'ندرس تخصص شركتك أو فريقك (برمجة، محاسبة، تصميم، إدارة) والميزانية المقترحة لتحديد العتاد المناسب بدقة.'
        : 'We evaluate your team’s daily stack (code, finance, media, admin) and budget to determine the precise specs needed.'
    },
    {
      icon: Laptop,
      title: ar ? '2. اختيار وتخصيص الأجهزة' : '2. Hardware Selection & Customization',
      desc: ar
        ? 'ترشيح الحواسيب المعتمدة (ThinkPad, EliteBook, Latitude) وترقية الرامات ووسائط التخزين SSD وفق الطلب.'
        : 'Selecting vetted business platforms and tailoring RAM/NVMe storage capacity to match workload demands.'
    },
    {
      icon: CheckCircle2,
      title: ar ? '3. الفحص المخبري والتهيئة' : '3. Diagnostic Benchmarking & Setup',
      desc: ar
        ? 'إخضاع كافة الأجهزة لاختبارات الإجهاد وتثبيت الأنظمة والتأكد من توافق الشواحن ووحدات الطاقة والملحقات.'
        : 'Running systematic load tests, OS provisioning, and verifying all accessories and power supplies.'
    },
    {
      icon: Truck,
      title: ar ? '4. التسليم والضمان المباشر' : '4. Handover & Ongoing Support',
      desc: ar
        ? 'تسليم متكامل في صنعاء مع تقارير الفحص والضمان المكتوب، ومتابعة فنية مستمرة لأي ترقية أو دعم.'
        : 'Seamless delivery in Sana’a with written warranty certificates and dedicated post-handover technical support.'
    }
  ];

  return (
    <section id="business" className="corporate-workflow-section page-shell">
      <div className="section-head-wrap">
        <div>
          <div className="eyebrow-chip">
            <Users2 size={15} />
            <span>{ar ? 'تجهيز الشركات والمؤسسات' : 'Corporate Procurement'}</span>
          </div>
          <h2>
            {ar ? 'من جهاز واحد.. إلى منظومة متكاملة لفريق كامل' : 'From a Single Machine.. To an Enterprise Fleet'}
          </h2>
        </div>
        <p className="section-head-desc">
          {ar
            ? 'خطوات عملية ومنهجية تضمن لشركتك في صنعاء الحصول على أفضل عتاد تقني بأعلى كفاءة وأقل تكلفة تشغيلية.'
            : 'A transparent 4-stage deployment methodology ensuring your Sana’a company receives enterprise hardware with maximum ROI.'}
        </p>
      </div>

      <div className="workflow-steps-grid">
        {stepDetails.map((step, idx) => {
          const Icon = step.icon;
          return (
            <div key={idx} className="workflow-step-card">
              <div className="step-card-number">
                <span>0{idx + 1}</span>
              </div>
              <div className="step-card-icon">
                <Icon size={24} />
              </div>
              <h3>{step.title}</h3>
              <p>{step.desc}</p>
            </div>
          );
        })}
      </div>

      <div className="workflow-callout-bar">
        <div>
          <h4>{ar ? 'هل تجهز مقراً جديداً أو ترغب في ترقية أجهزة موظفيك؟' : 'Setting up a new headquarters or upgrading staff gear?'}</h4>
          <p>{ar ? 'نوفر عروض أسعار تفصيلية وقوائم فحص شاملة لطلبات التوريد المؤسسي.' : 'We provide comprehensive quotation packages and diagnostic sheets for corporate orders.'}</p>
        </div>
        <a href="#contact" className="desk-action order-action">
          <span>{ar ? 'طلب عرض سعر للشركات' : 'Request Corporate Quote'}</span>
          <Arrow size={18} />
        </a>
      </div>
    </section>
  );
}
