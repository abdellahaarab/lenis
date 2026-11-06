import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Briefcase,
  Server,
  Network,
  ShieldCheck,
  Zap,
  Building2,
  CheckCircle2,
  FileSpreadsheet,
  Headphones,
  Laptop,
  HardDrive,
  Users,
  Send,
  Sparkles,
  FileText,
  MonitorPlay,
  Truck,
  Layers,
  Award,
  PhoneCall,
  Clock,
  ArrowUpRight,
  HelpCircle
} from 'lucide-react';
import { useLanguage } from '@/i18n/LanguageContext';
import { useCatalog } from '@/data/CatalogContext';

export default function BusinessPage() {
  const { language, dir } = useLanguage();
  const { site } = useCatalog();
  const isAr = language === 'ar';

  const [orgName, setOrgName] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [phone, setPhone] = useState('+967');
  const [projectType, setProjectType] = useState('tender');
  const [quantityRange, setQuantityRange] = useState('15-50');
  const [selectedServices, setSelectedServices] = useState<string[]>([
    'workstations',
    'networking'
  ]);
  const [specsNotes, setSpecsNotes] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const toggleService = (id: string) => {
    setSelectedServices((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const whatsappPhone = site?.whatsapp || '967771001044';

  const servicesList = [
    {
      id: 'workstations',
      title: isAr ? 'لابتوبات ومحطات عمل كميات' : 'Bulk Laptops & Workstations',
      desc: isAr
        ? 'فئات أعمال موحدة (ThinkPad, Dell Latitude, HP) للمشاريع والفرق الميدانية'
        : 'Enterprise-tier identical rigs for field teams & project staff'
    },
    {
      id: 'networking',
      title: isAr ? 'كبائن وشبكات وبنية تحتية' : 'Project Networking & Infrastructure',
      desc: isAr
        ? 'كبائن Racks، سويتشات PoE مدارة، نقاط وصول وربط فروع متعددة'
        : 'Managed switches, server racks, access points & branch links'
    },
    {
      id: 'servers',
      title: isAr ? 'سيرفرات ومراكز تخزين مركزي' : 'Data Servers & Central NAS/SAN',
      desc: isAr
        ? 'خوادم Rack/Tower وحلول تخزين سحابي ومحلي مع صلاحيات ونسخ احتياطي'
        : 'High-availability servers, central storage arrays & backup policies'
    },
    {
      id: 'power',
      title: isAr ? 'أنظمة طاقة مستمرة UPS صناعية' : 'Industrial UPS & Power Systems',
      desc: isAr
        ? 'حماية كاملة من انقطاع وتذبذب التيار للمواقع الميدانية والمعدات الحساسة'
        : 'Pure Sine Wave UPS systems for rugged field environments'
    },
    {
      id: 'training_labs',
      title: isAr ? 'تجهيز معامل وقاعات تدريب واجتماعات' : 'Labs & Training Facilities',
      desc: isAr
        ? 'شاشات تفاعلية، كمبيوترات معامل، أنظمة صوت ومؤتمرات عن بعد للمنظمات'
        : 'Complete computer labs, interactive displays & conference tech'
    },
    {
      id: 'field_deployment',
      title: isAr ? 'تهيئة، تركيب ودعم فني ميداني' : 'On-Site Deployment & Setup',
      desc: isAr
        ? 'فحص شامل 7 نقاط، تثبيت الأنظمة المطلوبة، والتسليم بمحضر فحص رسمي'
        : '7-point certified testing, software imaging & official handover'
    }
  ];

  const handleQuoteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const servicesTitles = servicesList
      .filter((s) => selectedServices.includes(s.id))
      .map((s) => s.title)
      .join('، ');

    const projectTypeLabels: Record<string, string> = {
      tender: isAr ? 'مناقصة رسمية / كراسة شروط (Tender / RFQ)' : 'Official Tender / RFQ',
      ngo_supply: isAr ? 'توريد كميات لمنظمة / مؤسسة' : 'NGO / Institutional Supply',
      tech_project: isAr ? 'تجهيز مشروع تقني جديد' : 'New Tech Project Deployment',
      labs: isAr ? 'تجهيز معمل حاسوب / قاعة تدريب' : 'Computer Lab / Training Setup',
      bulk_hardware: isAr ? 'طلب كميات وأجهزة متطابقة' : 'Bulk Identical Hardware'
    };

    const msg = [
      isAr
        ? '*طلب تسعير مشروع / مناقصة وتوريد كميات — الجيل العربي الرقمي:*'
        : '*Project & Tender Quotation Request (B2B):*',
      `*${isAr ? 'الجهة / المنشأة / المنظمة' : 'Organization'}*: ${orgName}`,
      `*${isAr ? 'المسؤول / المشتريات' : 'Contact Person'}*: ${contactPerson}`,
      `*${isAr ? 'الهاتف' : 'Phone'}*: ${phone}`,
      `*${isAr ? 'نوع الطلب' : 'Project Type'}*: ${projectTypeLabels[projectType] || projectType}`,
      `*${isAr ? 'حجم الكمية التقديرية' : 'Estimated Volume'}*: ${quantityRange}`,
      `*${isAr ? 'المجالات والتجهيزات المطلوبة' : 'Required Services'}*:\n• ${servicesTitles}`,
      specsNotes ? `*${isAr ? 'المواصفات والشروط الخاصة' : 'Specifications / Notes'}*:\n${specsNotes}` : '',
      isAr
        ? '\n_ملاحظة: سيتم إرسال كراسة الشروط / جدول الكميات (BOQ) عبر هذه المحادثة مباشرة._'
        : '\n_Note: BOQ / Tender documents will be attached directly._'
    ]
      .filter(Boolean)
      .join('\n');

    setSubmitted(true);
    const url = `https://wa.me/${whatsappPhone}?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
  };

  return (
    <main id="main-content" className="min-h-screen pt-24 pb-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto" dir={dir}>
      {/* Breadcrumb Navigation */}
      <nav aria-label="Breadcrumb" className="mb-4 flex items-center gap-2 text-xs text-neutral-500">
        <Link to={`/${language}`} className="hover:text-purple-600 transition-colors">
          {isAr ? 'الرئيسية' : 'Home'}
        </Link>
        <span>/</span>
        <span className="text-neutral-900 dark:text-neutral-100 font-semibold">
          {isAr ? 'تجهيز المشاريع والمناقصات' : 'Projects & Tenders'}
        </span>
      </nav>

      {/* Hero Section */}
      <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-[#0c0818] via-[#1a0f30] to-[#0a0515] text-white p-8 sm:p-12 mb-16 border border-purple-500/25 shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-3xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-purple-500/20 border border-purple-400/30 text-purple-300 text-xs font-bold backdrop-blur-md">
            <Building2 className="w-4 h-4" />
            <span>{isAr ? 'توريد وتجهيز المشاريع والمناقصات والمنظمات' : 'Institutional Supply & Tender Fulfillment'}</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black tracking-tight leading-tight">
            {isAr ? (
              <>
                تجهيز وتوريد تقني للمشاريع والمناقصات،{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-indigo-300 to-amber-200">
                  بأعلى معايير المطابقة الفنية
                </span>
              </>
            ) : (
              <>
                Certified Hardware Supply for Projects & Tenders,{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-indigo-300 to-amber-200">
                  Engineered to Exact Specifications
                </span>
              </>
            )}
          </h1>

          <p className="text-sm sm:text-base text-neutral-300 leading-relaxed max-w-2xl">
            {isAr
              ? 'نوفر للشركات المنفذة، المؤسسات، المنظمات الدولية والمحلية، والجهات الحكومية حلول توريد تقنية متكاملة مطابقة لكراسات الشروط وجداول الكميات (BOQ)، مع فحص معتمد 7 نقاط، فواتير رسمية، وضمان استبدال فوري.'
              : 'End-to-end hardware supply fulfilling tender specifications (BOQ), certified bulk deployments, tax invoices, and instant-replacement SLA across Sana\'a and Yemeni governorates.'}
          </p>

          <div className="flex flex-wrap items-center gap-4 pt-4">
            <a
              href="#quote-form"
              className="px-6 py-3.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs sm:text-sm transition-all shadow-lg shadow-purple-600/30 flex items-center gap-2 active:scale-95"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>{isAr ? 'طلب تسعير مشروع أو مناقصة' : 'Request Tender / Project Quote'}</span>
            </a>

            <a
              href={`https://wa.me/${whatsappPhone}?text=${encodeURIComponent(
                isAr
                  ? 'السلام عليكم، أود التواصل مع مسؤول المناقصات والمشاريع لمناقشة كراسة شروط وتوريد كميات.'
                  : 'Hello, I would like to consult your Tenders & Projects team.'
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-6 py-3.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold text-xs sm:text-sm transition-all backdrop-blur-md flex items-center gap-2 active:scale-95"
            >
              <FileText className="w-4 h-4 text-emerald-400" />
              <span>{isAr ? 'إرسال كراسة الشروط عبر واتساب' : 'Submit Tender Specs via WhatsApp'}</span>
            </a>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-6 border-t border-purple-500/20 text-xs">
            <div>
              <span className="text-purple-300 font-bold block text-base sm:text-lg">100%</span>
              <span className="text-neutral-400">{isAr ? 'مطابقة لجداول الكميات BOQ' : 'BOQ Compliance'}</span>
            </div>
            <div>
              <span className="text-purple-300 font-bold block text-base sm:text-lg">{isAr ? 'فحص شامل' : '7-Point'}</span>
              <span className="text-neutral-400">{isAr ? 'شهادة فحص لكل جهاز' : 'Certified Testing'}</span>
            </div>
            <div>
              <span className="text-purple-300 font-bold block text-base sm:text-lg">{isAr ? 'فواتير رسمية' : 'Tax Official'}</span>
              <span className="text-neutral-400">{isAr ? 'عقود وفواتير ضريبية' : 'Official Stamped Docs'}</span>
            </div>
            <div>
              <span className="text-purple-300 font-bold block text-base sm:text-lg">{isAr ? 'تغطية واسعة' : 'Nationwide'}</span>
              <span className="text-neutral-400">{isAr ? 'صنعاء وكافة المحافظات' : 'All Governorates'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 6 Core Pillars of Project & Tender Infrastructure */}
      <div className="mb-20">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <span className="text-xs font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider block mb-2">
            {isAr ? 'مجالات التجهيز والتوريد المعتمدة' : 'Specialized Supply Domains'}
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-neutral-900 dark:text-neutral-100">
            {isAr ? 'حلول مصممة للوفاء بمتطلبات المشاريع والعطاءات بدقة' : 'Engineered to Satisfy Strict Project & Tender RFQs'}
          </h2>
          <p className="text-xs sm:text-sm text-neutral-500 mt-2">
            {isAr
              ? 'سواء كنت تُعد عطاءً لمناقصة منظمة، أو تجهز فرعاً جديداً، نوفر العتاد الفني بمواصفات موحدة ومعايير عالمية'
              : 'Whether preparing a tender bid for an NGO or equipping nationwide branches, we deliver certified specs.'}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Card 1 */}
          <div className="p-6 rounded-3xl bg-neutral-50 dark:bg-neutral-900/80 border border-neutral-200 dark:border-neutral-800 space-y-4 hover:border-purple-500/50 transition-all hover:shadow-lg">
            <div className="w-12 h-12 rounded-2xl bg-purple-100 dark:bg-purple-950/60 text-purple-600 flex items-center justify-center">
              <Laptop className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
              {isAr ? 'توريد لابتوبات ومحطات عمل كميات' : 'Bulk Workstations & Laptops'}
            </h3>
            <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
              {isAr
                ? 'توفير فئات الأعمال المعتمدة عالمياً (Lenovo ThinkPad، Dell Latitude/Precision، HP EliteBook) بكميات متطابقة مهيأة للعمل المكتبي والميداني مع دعم ترقية الرام والتخزين.'
                : 'Enterprise-grade uniform laptops & mobile workstations meeting tender specs with RAM/SSD upgrades and official test logs.'}
            </p>
          </div>

          {/* Card 2 */}
          <div className="p-6 rounded-3xl bg-neutral-50 dark:bg-neutral-900/80 border border-neutral-200 dark:border-neutral-800 space-y-4 hover:border-purple-500/50 transition-all hover:shadow-lg">
            <div className="w-12 h-12 rounded-2xl bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 flex items-center justify-center">
              <Network className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
              {isAr ? 'البنية التحتية وكبائن الشبكات للمواقع' : 'Project Networking & Infrastructure'}
            </h3>
            <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
              {isAr
                ? 'توريد وتركيب كبائن الخوادم Racks، سويتشات PoE مدارة، راوترات Multi-WAN، ونقاط اتصال موحدة Access Points لتأمين اتصال مستقر وسريع لمواقع المشاريع والفروع.'
                : 'Server racks, PoE managed switches, multi-WAN load balancers, and enterprise Wi-Fi APs for seamless project infrastructure.'}
            </p>
          </div>

          {/* Card 3 */}
          <div className="p-6 rounded-3xl bg-neutral-50 dark:bg-neutral-900/80 border border-neutral-200 dark:border-neutral-800 space-y-4 hover:border-purple-500/50 transition-all hover:shadow-lg">
            <div className="w-12 h-12 rounded-2xl bg-violet-100 dark:bg-violet-950/60 text-violet-600 flex items-center justify-center">
              <Server className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
              {isAr ? 'الخوادم والتخزين المركزي NAS/SAN' : 'Enterprise Servers & Data Storage'}
            </h3>
            <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
              {isAr
                ? 'خوادم تخزين مركزي للمشاريع الضخمة والمنظمات، حلول حماية البيانات مع صلاحيات أمنية متدرجة، وتطبيق استراتيجيات النسخ الاحتياطي التلقائي (Backup).'
                : 'Centralized NAS/SAN file storage, permission tiering, and automated snapshot policies ensuring absolute data compliance.'}
            </p>
          </div>

          {/* Card 4 */}
          <div className="p-6 rounded-3xl bg-neutral-50 dark:bg-neutral-900/80 border border-neutral-200 dark:border-neutral-800 space-y-4 hover:border-purple-500/50 transition-all hover:shadow-lg">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 flex items-center justify-center">
              <Zap className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
              {isAr ? 'أنظمة الطاقة المستمرة UPS للمشاريع' : 'Industrial Pure Sine Wave UPS'}
            </h3>
            <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
              {isAr
                ? 'أنظمة UPS أونلاين بموجة جيبية نقية لحماية السيرفرات ومعدات المشاريع الميدانية من أضرار تقلبات الكهرباء والصدمات الشائعة في اليمن.'
                : 'Heavy-duty Online UPS systems preventing costly downtime and component damage from local grid voltage fluctuations.'}
            </p>
          </div>

          {/* Card 5 */}
          <div className="p-6 rounded-3xl bg-neutral-50 dark:bg-neutral-900/80 border border-neutral-200 dark:border-neutral-800 space-y-4 hover:border-purple-500/50 transition-all hover:shadow-lg">
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center">
              <MonitorPlay className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
              {isAr ? 'تجهيز المعامل وقاعات التدريب والاجتماعات' : 'Computer Labs & Training Centers'}
            </h3>
            <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
              {isAr
                ? 'تجهيز كامل لمعامل الجامعات والمراكز التدريبية وبرامج المنظمات: شاشات عرض، أجهزة حاسوب متطابقة، أنظمة صوت ومؤتمرات عن بعد.'
                : 'Turnkey computer labs, interactive smart displays, and boardroom conferencing setups for training and educational programs.'}
            </p>
          </div>

          {/* Card 6 */}
          <div className="p-6 rounded-3xl bg-neutral-50 dark:bg-neutral-900/80 border border-neutral-200 dark:border-neutral-800 space-y-4 hover:border-purple-500/50 transition-all hover:shadow-lg">
            <div className="w-12 h-12 rounded-2xl bg-blue-100 dark:bg-blue-950/60 text-blue-600 flex items-center justify-center">
              <Truck className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
              {isAr ? 'التهيئة، الفحص والتسليم الميداني' : 'Testing, Imaging & Field Handover'}
            </h3>
            <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
              {isAr
                ? 'فحص شامل واختبار ضغط لكل جهاز قبل التعبئة، تثبيت أنظمة التشغيل الموحدة، والتوصيل الآمن إلى مقرات العمل مع محضر استلام رسمي.'
                : 'Pre-deployment benchmark certification, OS mass-imaging, insured logistics across governorates, and formal handover inspection logs.'}
            </p>
          </div>
        </div>
      </div>

      {/* Why Choose Us for Tenders & Projects */}
      <div className="p-8 sm:p-10 rounded-3xl bg-purple-50/50 dark:bg-neutral-900 border border-purple-100 dark:border-neutral-800 mb-20">
        <h3 className="text-xl font-extrabold text-neutral-900 dark:text-neutral-100 mb-2 text-center">
          {isAr ? 'معايير التوريد المؤسسي لدى الجيل العربي الرقمي' : 'Institutional Procurement Standards'}
        </h3>
        <p className="text-xs text-neutral-500 text-center max-w-xl mx-auto mb-8">
          {isAr
            ? 'نقدم للشركات والمؤسسات والمنظمات شراكة موثوقة تلبي كافة المتطلبات القانونية والفنية'
            : 'We provide structured institutional partnerships compliant with legal, financial, and technical standards.'}
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
          <div className="flex items-start gap-3">
            <FileSpreadsheet className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
            <div>
              <strong className="text-xs font-bold text-neutral-900 dark:text-neutral-100 block mb-1">
                {isAr ? 'عروض أسعار رسمية وفواتير ضريبية' : 'Official Stamped Invoices'}
              </strong>
              <span className="text-xs text-neutral-600 dark:text-neutral-400">
                {isAr ? 'عروض أسعار معتمدة، فواتير ضريبية، وسجل تجاري متوافق مع متطلبات المنظمات.' : 'Formal tax-compliant documentation and stamped quotations.'}
              </span>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
            <div>
              <strong className="text-xs font-bold text-neutral-900 dark:text-neutral-100 block mb-1">
                {isAr ? 'مطابقة تامة لجدول الكميات (BOQ)' : 'Exact BOQ Compliance'}
              </strong>
              <span className="text-xs text-neutral-600 dark:text-neutral-400">
                {isAr ? 'التزام حرفي بالمواصفات الفنية المحددة في كراسة الشروط دون أي إخلال.' : 'Strict alignment with technical specs stated in tender documents.'}
              </span>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
            <div>
              <strong className="text-xs font-bold text-neutral-900 dark:text-neutral-100 block mb-1">
                {isAr ? 'ضمان استبدال وسرعة استجابة SLA' : 'Priority Hardware Replacement SLA'}
              </strong>
              <span className="text-xs text-neutral-600 dark:text-neutral-400">
                {isAr ? 'أولوية قصوى لمشاريع التوريد وتوفير بدائل فورية لضمان استمرارية الإنجاز.' : 'Dedicated warranty buffer rigs ensuring uninterrupted project flow.'}
              </span>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Truck className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
            <div>
              <strong className="text-xs font-bold text-neutral-900 dark:text-neutral-100 block mb-1">
                {isAr ? 'توصيل للمحافظات والمواقع الميدانية' : 'Governorate Delivery Support'}
              </strong>
              <span className="text-xs text-neutral-600 dark:text-neutral-400">
                {isAr ? 'تغليف آمن وشحن معتمد لكافة مواقع المشاريع في صنعاء وعموم اليمن.' : 'Safe packaged transit to project field sites across Yemen.'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Interactive RFQ Form Section */}
      <div id="quote-form" className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
        <div className="lg:col-span-5 space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-100 dark:bg-purple-950/60 text-purple-600 text-xs font-bold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>{isAr ? 'دراسة سريعة لكراسة الشروط والمواصفات' : 'Fast RFQ Analysis'}</span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-extrabold text-neutral-900 dark:text-neutral-100">
            {isAr ? 'اطلب تسعير مشروع أو مناقصة' : 'Request Project or Tender Quotation'}
          </h2>

          <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
            {isAr
              ? 'أدخل بيانات الجهة وحجم التوريد المطلوب، وسيقوم مهندس مبيعات المشاريع والعطاءات بإعداد عرض سعر رسمي مفصل ومطابق للشروط الفنية خلال وقت قياسي.'
              : 'Submit your organization details and required volume. Our tenders and projects engineer will prepare an official quotation matching your technical specifications.'}
          </p>

          <div className="p-5 rounded-2xl bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 space-y-3">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-purple-600" />
              <strong className="text-xs font-bold text-neutral-900 dark:text-neutral-100">
                {isAr ? 'قسم المشاريع والمبيعات المؤسسية:' : 'Corporate & Tender Division:'}
              </strong>
            </div>
            <p className="text-xs text-neutral-500">
              {isAr ? 'صنعاء — شارع صخر، بالقرب من مركز تقنية المعلومات' : 'Sakhr Street, Sana\'a, Yemen'}
            </p>
            <div className="flex flex-col gap-1 pt-1 text-xs">
              <span className="text-neutral-600 dark:text-neutral-400">
                {isAr ? 'المبيعات المباشرة:' : 'Direct Sales:'} <b dir="ltr" className="font-mono text-purple-600">+967 1 200 000</b>
              </span>
              <span className="text-neutral-600 dark:text-neutral-400">
                {isAr ? 'واتساب المشاريع الميداني:' : 'WhatsApp Hotline:'} <b dir="ltr" className="font-mono text-emerald-600">+{whatsappPhone}</b>
              </span>
            </div>
          </div>

          <div className="p-4 rounded-2xl border border-dashed border-purple-300 dark:border-purple-800 bg-purple-50/30 dark:bg-purple-950/20 text-xs text-neutral-600 dark:text-neutral-400 space-y-1">
            <strong className="text-purple-700 dark:text-purple-300 block">
              {isAr ? 'لديك كراسة شروط أو جدول كميات جاهز (Excel / PDF)؟' : 'Have a BOQ (Excel / PDF) file ready?'}
            </strong>
            <p>
              {isAr
                ? 'يمكنك ملء البيانات الأساسية والضغط على "إرسال طلب التسعير"، وسيتم فتح محادثة الواتساب المباشرة حيث يمكنك إرفاق الملف فوراً لسرعة الإجراء.'
                : 'You can submit the form and attach your tender document directly in the WhatsApp chat that opens.'}
            </p>
          </div>
        </div>

        <div className="lg:col-span-7">
          <div className="p-6 sm:p-8 rounded-3xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm">
            {submitted ? (
              <div className="text-center py-10 space-y-4">
                <div className="w-14 h-14 rounded-full bg-emerald-500 text-white flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold text-neutral-900 dark:text-neutral-100">
                  {isAr ? 'تم تجهيز طلب تسعير المناقصة / المشروع!' : 'Quotation Request Prepared!'}
                </h3>
                <p className="text-xs text-neutral-500 max-w-sm mx-auto">
                  {isAr
                    ? 'تم فتح واتساب مسؤول المناقصات مع تفاصيل الطلب. يرجى إرسال الرسالة وإرفاق كراسة الشروط أو جدول الكميات إن وُجد.'
                    : 'WhatsApp has been launched with your tender details. Please send the message and attach your specification sheet.'}
                </p>
                <button
                  type="button"
                  onClick={() => setSubmitted(false)}
                  className="px-5 py-2.5 rounded-xl bg-purple-600 text-white text-xs font-bold hover:bg-purple-700 transition-colors"
                >
                  {isAr ? 'تقديم طلب تسعير آخر' : 'Submit Another Request'}
                </button>
              </div>
            ) : (
              <form onSubmit={handleQuoteSubmit} className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300 block mb-1">
                      {isAr ? 'اسم المنشأة أو المنظمة أو الجهة *' : 'Organization / Company Name *'}
                    </label>
                    <input
                      type="text"
                      required
                      value={orgName}
                      onChange={(e) => setOrgName(e.target.value)}
                      placeholder={isAr ? 'مثال: شركة التطوير / منظمة الإغاثة' : 'e.g. Acme Org / Development Co'}
                      className="w-full text-xs p-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300 block mb-1">
                      {isAr ? 'المسؤول / مسؤول المشتريات *' : 'Procurement Officer / Contact *'}
                    </label>
                    <input
                      type="text"
                      required
                      value={contactPerson}
                      onChange={(e) => setContactPerson(e.target.value)}
                      placeholder={isAr ? 'الاسم والمسمى الوظيفي' : 'Name & Title'}
                      className="w-full text-xs p-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300 block mb-1">
                      {isAr ? 'رقم الهاتف / واتساب للتواصل *' : 'Phone / WhatsApp *'}
                    </label>
                    <input
                      dir="ltr"
                      type="tel"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full text-xs p-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 font-mono text-start focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300 block mb-1">
                      {isAr ? 'طبيعة الطلب / المشروع *' : 'Project / RFQ Type *'}
                    </label>
                    <select
                      value={projectType}
                      onChange={(e) => setProjectType(e.target.value)}
                      className="w-full text-xs p-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    >
                      <option value="tender">{isAr ? 'مناقصة رسمية / كراسة شروط (Tender / RFQ)' : 'Official Tender / RFQ'}</option>
                      <option value="ngo_supply">{isAr ? 'توريد كميات لمنظمة / مؤسسة دولية' : 'NGO / Institutional Bulk'}</option>
                      <option value="tech_project">{isAr ? 'تجهيز مشروع تقني جديد' : 'New Project Infrastructure'}</option>
                      <option value="labs">{isAr ? 'تجهيز معمل حاسوب / قاعة تدريب' : 'Computer Lab / Training Setup'}</option>
                      <option value="bulk_hardware">{isAr ? 'طلب كميات أجهزة متطابقة' : 'Bulk Identical Hardware'}</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300 block mb-1">
                    {isAr ? 'حجم الكمية التقديرية للأجهزة / المواقع' : 'Estimated Hardware Volume'}
                  </label>
                  <select
                    value={quantityRange}
                    onChange={(e) => setQuantityRange(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="5-15">{isAr ? '5 إلى 15 جهاز / مقر مصغر' : '5 - 15 Devices'}</option>
                    <option value="15-50">{isAr ? '15 إلى 50 جهاز (مشروع متوسط)' : '15 - 50 Devices'}</option>
                    <option value="50-100">{isAr ? '50 إلى 100 جهاز (مشروع كبير / مناقصة)' : '50 - 100 Devices (Tender)'}</option>
                    <option value="100+">{isAr ? 'أكثر من 100 جهاز / توريد استراتيجي شامل' : '100+ Devices (Strategic Project)'}</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300 block mb-2">
                    {isAr ? 'المجالات والخدمات والتجهيزات المطلوبة:' : 'Required Supply Domains:'}
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {servicesList.map((service) => (
                      <label
                        key={service.id}
                        className={`p-3 rounded-xl border text-xs cursor-pointer transition-all flex items-start gap-2.5 ${
                          selectedServices.includes(service.id)
                            ? 'border-purple-600 bg-purple-50/50 dark:bg-purple-950/30'
                            : 'border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={selectedServices.includes(service.id)}
                          onChange={() => toggleService(service.id)}
                          className="accent-purple-600 w-4 h-4 mt-0.5"
                        />
                        <div className="min-w-0">
                          <span className="font-bold text-neutral-900 dark:text-neutral-100 block">
                            {service.title}
                          </span>
                          <span className="text-[10px] text-neutral-500 block leading-tight">
                            {service.desc}
                          </span>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300 block mb-1">
                    {isAr ? 'المواصفات المطلوبة أو ملاحظات كراسة الشروط' : 'Technical Specifications / Tender Notes'}
                  </label>
                  <textarea
                    rows={3}
                    value={specsNotes}
                    onChange={(e) => setSpecsNotes(e.target.value)}
                    placeholder={
                      isAr
                        ? 'مثال: مطلوب لابتوبات Core i7 الجيل 12 مع رام 16GB، وشاشات 24 بوصة، مع تسليم في صنعاء...'
                        : 'e.g. Core i7 12th Gen laptops, 16GB RAM, 24" monitors, delivery location Sana\'a...'
                    }
                    className="w-full text-xs p-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full h-12 rounded-xl font-bold text-xs bg-purple-600 hover:bg-purple-700 text-white shadow-md shadow-purple-600/25 flex items-center justify-center gap-2 transition-all active:scale-[0.99]"
                >
                  <Send className="w-4 h-4" />
                  <span>{isAr ? 'إرسال طلب تسعير المشروع / المناقصة' : 'Submit Tender / Project RFQ'}</span>
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
