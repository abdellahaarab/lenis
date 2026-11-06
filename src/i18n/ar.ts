import { Translations } from './types';

export const ar: Translations = {
  meta: {
    title: 'الجيل العربي الرقمي | متجر الكمبيوتر والإلكترونيات في صنعاء',
    description: 'تسوّق أجهزة الكمبيوتر واللابتوبات وملحقات التقنية والشبكات من متجر الجيل العربي الرقمي في صنعاء. تصفح المنتجات ومواصفاتها وأسعارها.'
  },
  nav: {
    setups: 'تجهيزاتك',
    businessSolutions: 'حلول الأعمال',
    warrantySupport: 'الضمان والدعم',
    contactUs: 'تواصل معنا',
    switchLanguage: 'English',
    currentLanguageName: 'العربية',
    targetLanguageName: 'English',
    toggleMenu: 'القائمة',
    findSetup: 'تصفح المتجر'
  },
  hero: {
    storeName: 'الجيل العربي الرقمي',
    tagline: 'تقنيتك، تعمل معًا.',
    subtitle: 'أجهزة وتجهيزات وحلول تقنية للأفراد والأعمال في صنعاء.',
    helper: 'نساعدك على اختيار التقنية المناسبة وربط تفاصيلها، من جهازك الشخصي إلى مساحة عملك.',
    ctaPrimary: 'جهّز احتياجك',
    ctaBusiness: 'حلول الأعمال',
    scrollIndicator: 'اكتشف المزيد'
  },
  integration: {
    title: 'كل جزء له دور. معًا، تكتمل التجربة.',
    subtitle: 'نختار ما يعمل مع جهازك ونربط تفاصيل التجربة',
    stages: [
      { title: 'نبدأ باحتياجك.', description: 'الاختيار مرتبط بالاستخدام' },
      { title: 'نختار ما يعمل مع جهازك.', description: 'التوافق والتجهيز' },
      { title: 'ونربط تفاصيل التجربة.', description: 'التكامل بين العناصر' }
    ],
    cta: 'اختر استخدامك'
  },
  useCases: {
    title: 'ابدأ بما تريد إنجازه.',
    subtitle: 'اختر ما تفعله كل يوم. وشاهد ما يمكن أن يكمل تجهيزك.',
    cases: [
      {
        id: 'study',
        label: 'أدرس وأتعلم',
        title: 'ابدأ دراستك بتجهيز مناسب.',
        description: 'من المحاضرات إلى المشاريع؛ نختار الجهاز حسب تخصصك وبرامجك، مع ملحقات للحمل والتخزين والشحن.',
        items: ['لابتوب مناسب', 'ملحقات حمل', 'تخزين وشحن'],
        cta: 'ساعدني أختار تجهيز الدراسة'
      },
      {
        id: 'work',
        label: 'أعمل وأنجز',
        title: 'تفاصيل تخدم يومك.',
        description: 'شاشة أوسع، منافذ كافية، ومساحة مرتبة. نراجع توصيلات جهازك وطبيعة عملك قبل اختيار الملحقات.',
        items: ['لابتوب وشاشة', 'موزع منافذ وحامل', 'تنظيم المكتب'],
        cta: 'ناقش تجهيز مكتبي'
      },
      {
        id: 'content',
        label: 'أصنع محتوى',
        title: 'جهّز صوتك وصورتك.',
        description: 'ابدأ بصوت واضح وإضاءة مناسبة. نرتّب الميكروفون والسماعة والملحقات حسب جهازك وطريقة التسجيل.',
        items: ['ميكروفون وذراع', 'إضاءة احترافية', 'سماعة استوديو'],
        cta: 'اطلب تجهيز صناعة محتوى'
      },
      {
        id: 'gaming',
        label: 'ألعب وأستمتع',
        title: 'جهّز تجربتك.',
        description: 'اذكر ألعابك وميزانيتك. نوازن بين الجهاز والشاشة والسماعة والملحقات لتجهيز يناسب تجربتك.',
        items: ['جهاز ألعاب', 'شاشة وسماعة', 'ملحقات متوازنة'],
        cta: 'ناقش تجهيز الألعاب'
      }
    ],
    ctaPrefix: 'ناقش هذا التجهيز'
  },
  categories: {
    title: 'اكتشف الفئات',
    items: [
      { id: 'laptops', name: 'لابتوبات وأجهزة', description: 'أجهزة لكل استخدام' },
      { id: 'displays', name: 'شاشات وتجهيز مكتب', description: 'عرض أوضح ومساحة أنظم' },
      { id: 'audio', name: 'صوت وصناعة محتوى', description: 'تسجيل واستماع ومعدات بث' },
      { id: 'gaming', name: 'ألعاب وملحقات', description: 'أداء وتجربة متوازنة' },
      { id: 'network', name: 'شبكات واتصال', description: 'ربط الأجهزة ومشاركة الموارد' },
      { id: 'storage', name: 'تخزين', description: 'تنظيم الوصول للملفات' },
      { id: 'power', name: 'طاقة وحماية', description: 'استمرارية التشغيل' }
    ]
  },
  business: {
    title: 'من مكتبك إلى فريقك.',
    subtitle: 'حلول تقنية للشركات والمؤسسات',
    description: 'نرتب احتياجات فريقك ضمن نطاق واضح: أجهزة، اتصال، تخزين، وطاقة، مع تفاصيل تجهيز ودعم بحسب المشروع.',
    pillars: [
      { title: 'الأجهزة', description: 'محطات عمل وأجهزة بحسب المهام' },
      { title: 'الاتصال والتخزين', description: 'شبكة داخلية وتخزين مشترك' },
      { title: 'الطاقة والمتابعة', description: 'حماية التشغيل وخطة دعم' }
    ],
    steps: [
      { title: 'تحديد الاحتياج', description: 'نفهم طبيعة العمل والمتطلبات' },
      { title: 'اقتراح النطاق', description: 'حلول مناسبة وميزانية واضحة' },
      { title: 'التجهيز والاختبار', description: 'تركيب وفحص قبل التسليم' },
      { title: 'التسليم والمتابعة', description: 'دعم مستمر بعد التشغيل' }
    ],
    cta: 'ناقش مشروعك',
    formFields: {
      companyName: 'اسم الجهة',
      teamSize: 'عدد المستخدمين تقريبًا',
      services: 'الحلول المطلوبة',
      description: 'وصف مختصر',
      timeline: 'الموعد المتوقع',
      contact: 'وسيلة التواصل'
    }
  },
  service: {
    title: 'بعد التسليم، تبقى الخطوة التالية واضحة.',
    subtitle: 'من الاختيار إلى الدعم',
    stages: [
      { title: 'نفهم احتياجك', description: 'نتعرف على استخدامك وأولوياتك' },
      { title: 'نراجع التوافق', description: 'نتأكد أن الأجزاء تعمل معًا' },
      { title: 'نجهز ونسلم', description: 'تركيب وفحص وتسليم مكتمل' },
      { title: 'نوضح الضمان والدعم', description: 'شروط واضحة وقنوات مفتوحة' }
    ],
    warrantyLink: 'اطّلع على الضمان والدعم',
    helpCta: 'أحتاج مساعدة',
    motto: 'تقنية تتكامل.. وضمان يستمر'
  },
  trust: {
    title: 'ما الذي يمكننا إظهاره؟',
    brandsTitle: 'علامات نوفر منتجاتها',
    brandsDisclaimer: 'العلامات المعروضة تمثل منتجات متوفرة، ولا تعني بالضرورة وكالة أو اعتماد رسمي.'
  },
  finalCta: {
    title: 'ما الذي تريد تجهيزه؟',
    subtitle: 'ابدأ باحتياجك. ونرتب معك التفاصيل.',
    individual: 'جهّز احتياجك',
    business: 'حلول الأعمال',
    support: 'أحتاج مساعدة'
  },
  footer: {
    storeName: 'الجيل العربي الرقمي',
    location: 'صنعاء',
    copyright: '© 2026 الجيل العربي الرقمي. جميع الحقوق محفوظة.',
    privacyPolicy: 'سياسة الخصوصية',
    termsOfService: 'الشروط والأحكام'
  },
  accessibility: {
    skipToContent: 'تجاوز إلى المحتوى',
    reduceMotion: 'تقليل الحركة'
  },
  contact: {
    title: 'تواصل معنا',
    subtitle: 'أخبرنا باحتياجك وسنتواصل معك',
    useCaseLabel: 'الاستخدام',
    currentDeviceLabel: 'الجهاز الحالي (اختياري)',
    prioritiesLabel: 'الأولويات',
    budgetLabel: 'الميزانية التقريبية',
    budgetOptional: 'اختياري',
    sendMessage: 'أرسل عبر واتساب',
    sending: 'جارِ الإرسال...',
    sent: 'تم فتح المحادثة',
    sentDescription: 'سيتم فتح واتساب لإرسال رسالتك. لم يُرسل شيء تلقائيًا.',
    failed: 'حدث خطأ',
    retry: 'أعد المحاولة',
    whatsappDisclaimer: 'سيتم فتح محادثة واتساب مع ملخص طلبك',
    nameLabel: 'الاسم',
    companyLabel: 'اسم الجهة',
    teamSizeLabel: 'عدد المستخدمين',
    servicesLabel: 'الخدمات المطلوبة',
    descriptionLabel: 'وصف مختصر',
    timelineLabel: 'الموعد المتوقع',
    timelineOptional: 'اختياري',
    supportType: 'نوع المشكلة',
    supportDescription: 'وصف المشكلة',
    invoiceLabel: 'رقم الفاتورة (اختياري)',
    modelLabel: 'موديل الجهاز (اختياري)'
  },
  shop: {
    title: 'المتجر والكتالوج',
    subtitle: 'أجهزة ومعدات ومحطات عمل مفحوصة وموثقة المواصفات',
    allCategories: 'كل الفئات',
    filters: 'الفلاتر',
    clearFilters: 'إعادة ضبط الفلاتر',
    brand: 'الماركة',
    cpu: 'المعالج',
    ram: 'الذاكرة (RAM)',
    storage: 'التخزين',
    condition: 'درجة الحالة',
    inStockOnly: 'المتوفر في المخزن فقط',
    sortBy: 'ترتيب حسب',
    sortNewest: 'الأحدث وصولًا',
    sortBattery: 'حالة البطارية',
    noProductsFound: 'لم نعثر على منتجات مطابقة لمعايير الفلترة المحددة',
    resetFilterPrompt: 'جرب إزالة بعض الفلاتر لعرض المنتجات المتاحة',
    productsCount: 'منتج معروض',
    viewDetails: 'عرض تفاصيل الجهاز',
    askAboutProduct: 'اسأل عن الجهاز',
    askForPrice: 'اسأل عن السعر',
    warrantyTBD: 'يُحدد عند الطلب',
    demoBadge: 'بيانات تجريبية',
    demoDisclaimer: 'هذا المنتج معروض كبيانات تجريبية لأغراض العرض واختبار الهيكل. الأسعار والضمان تُؤكد مع إدارة المتجر مباشرة.',
    conditionLabels: {
      new: 'جديد',
      open_box: 'مفتوح الكرتون',
      like_new: 'شبه جديد',
      refurbished: 'مجدّد',
      used: 'مستعمل',
      defective: 'معيوب / تصفية',
      A: 'A — شبه جديد',
      B: 'B — جيد جدًا',
      C: 'C — اقتصادي'
    },
    stockLabels: {
      in_stock: 'متوفر بالمحل',
      low: 'كمية محدودة',
      order: 'بالطلب مسبقًا',
      sold: 'تم البيع'
    },
    categories: {
      laptops: 'لابتوبات وأجهزة',
      displays: 'شاشات وتجهيز مكتب',
      audio: 'صوت وصناعة محتوى',
      gaming: 'ألعاب وملحقات',
      network: 'شبكات واتصال',
      storage: 'تخزين',
      power: 'طاقة وحماية (UPS)'
    }
  },
  product: {
    specsTitle: 'جدول المواصفات الكامل',
    inspectionTitle: 'تقرير الفحص المعتمد قبل التسليم',
    passedInspection: 'اجتاز الفحص الفني المعتمد بنجاح',
    compatibleTitle: 'يعمل بتوافق مثالي مع (ملحقات مقترحة)',
    bestForTitle: 'موصى به للاستخدامات التالية',
    whatsappDisabledNotice: 'رقم واتساب المتجر غير مسجل حاليًا في النظام. ستتاح المراسلة المباشرة فور اعتماد الرقم الرسمي.',
    orderViaWhatsApp: 'اسأل عن الجهاز عبر واتساب',
    backToShop: 'العودة إلى المتجر',
    breadcrumbHome: 'الرئيسية',
    breadcrumbShop: 'المتجر',
    keySpecs: 'أبرز المواصفات',
    conditionDetails: 'تفاصيل درجة الحالة',
    inspectionNotes: 'ملاحظات الفحص الفني'
  }
};
