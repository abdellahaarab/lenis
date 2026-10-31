export interface HomeImageSlot {
  key: string;
  sectionKey: 'hero' | 'integration' | 'workstation' | 'usecases' | 'categories' | 'brand';
  sectionAr: string;
  sectionEn: string;
  titleAr: string;
  titleEn: string;
  descriptionAr: string;
  descriptionEn: string;
  defaultUrl: string;
  recommendedSize: string;
}

export const HOME_IMAGE_SLOTS: HomeImageSlot[] = [
  // 1. Hero section
  {
    key: 'hero_laptop',
    sectionKey: 'hero',
    sectionAr: 'قسم الواجهة الرئيسي (Hero)',
    sectionEn: 'Main Hero Section',
    titleAr: 'لابتوب الواجهة الرئيسي',
    titleEn: 'Main Hero Laptop',
    descriptionAr: 'الصورة الأساسية لجهاز اللابتوب الطافي في أعلى الصفحة الرئيسية.',
    descriptionEn: 'The primary floating laptop in the hero section at the top of the homepage.',
    defaultUrl: '/images/home-reference/laptop.webp',
    recommendedSize: '1600 × 766 (WebP أو PNG شفاف)',
  },
  {
    key: 'hero_headphones',
    sectionKey: 'hero',
    sectionAr: 'قسم الواجهة الرئيسي (Hero)',
    sectionEn: 'Main Hero Section',
    titleAr: 'سماعات الواجهة التكميلية',
    titleEn: 'Hero Headphones Accessory',
    descriptionAr: 'صورة السماعات الملحقة في بطاقة الملحقات بجانب اللابتوب في الواجهة.',
    descriptionEn: 'The accessory headphones shown in the floating detail card.',
    defaultUrl: '/images/home-reference/headphones.webp',
    recommendedSize: '614 × 680 (WebP أو PNG شفاف)',
  },

  // 2. Integration section
  {
    key: 'integration_laptop',
    sectionKey: 'integration',
    sectionAr: 'منظومة التكامل (Integration)',
    sectionEn: 'Integration Ecosystem',
    titleAr: 'لابتوب منظومة التكامل',
    titleEn: 'Integration Laptop',
    descriptionAr: 'صورة جهاز اللابتوب ضمن المنظومة المتكاملة عند التمرير.',
    descriptionEn: 'The laptop device moving in the connected ecosystem scroll view.',
    defaultUrl: '/images/home-reference/laptop.webp',
    recommendedSize: '1600 × 766 (WebP أو PNG)',
  },
  {
    key: 'integration_audio',
    sectionKey: 'integration',
    sectionAr: 'منظومة التكامل (Integration)',
    sectionEn: 'Integration Ecosystem',
    titleAr: 'سماعات منظومة التكامل',
    titleEn: 'Integration Audio',
    descriptionAr: 'صورة السماعات المدمجة في مشهد منظومة التكامل.',
    descriptionEn: 'The audio headset in the ecosystem view.',
    defaultUrl: '/images/home-reference/headphones.webp',
    recommendedSize: '614 × 680 (WebP أو PNG)',
  },

  // 3. Workstation & Screen (محطة العمل والشاشات)
  {
    key: 'desktop_hardware',
    sectionKey: 'workstation',
    sectionAr: 'محطة العمل والشاشات (Workstation)',
    sectionEn: 'Workstation & Displays',
    titleAr: 'هيكل جهاز محطة العمل المكتبي',
    titleEn: 'Desktop Hardware Base',
    descriptionAr: 'مجسم جهاز الكمبيوتر المكتبي المستخدم في منظومة العمل وبطاقة الأعمال وشاشات العرض.',
    descriptionEn: 'Desktop computer chassis frame shown in workstation displays across sections.',
    defaultUrl: '/images/home-reference/desktop.webp',
    recommendedSize: '1114 × 868 (خلفية شفافة)',
  },
  {
    key: 'desktop_screen',
    sectionKey: 'workstation',
    sectionAr: 'محطة العمل والشاشات (Workstation)',
    sectionEn: 'Workstation & Displays',
    titleAr: 'شاشة العرض المكتبي',
    titleEn: 'Workstation Display Screen',
    descriptionAr: 'صورة شاشة العرض الاحترافية المعروضة داخل إطار محطة العمل.',
    descriptionEn: 'Display screen artwork shown inside the desktop workstation frame.',
    defaultUrl: '/images/home-reference/display-screen.webp',
    recommendedSize: '1200 × 675 (WebP أو PNG)',
  },

  // 4. Use Cases & Setups (تجهيزات الاستخدام)
  {
    key: 'usecase_study',
    sectionKey: 'usecases',
    sectionAr: 'تجهيزات الاستخدام (Setups)',
    sectionEn: 'Use Cases & Setups',
    titleAr: 'تجهيز الدراسة والتعلم',
    titleEn: 'Study Setup Image',
    descriptionAr: 'صورة مساحة العمل الخاصة بالطلاب والتعلم عن بعد والجامعات.',
    descriptionEn: 'Setup image for the study and education use case tab.',
    defaultUrl: '/images/home-reference/study.webp',
    recommendedSize: '1200 × 800 (WebP أو JPG)',
  },
  {
    key: 'usecase_content',
    sectionKey: 'usecases',
    sectionAr: 'تجهيزات الاستخدام (Setups)',
    sectionEn: 'Use Cases & Setups',
    titleAr: 'تجهيز صناعة المحتوى والتصميم',
    titleEn: 'Content Creation Setup',
    descriptionAr: 'صورة مساحة استوديو صناعة المحتوى والصوت والمونتاج الاحترافي.',
    descriptionEn: 'Setup image for content creation, audio, and video editing.',
    defaultUrl: '/images/home-reference/content.webp',
    recommendedSize: '1200 × 800 (WebP أو JPG)',
  },
  {
    key: 'usecase_gaming',
    sectionKey: 'usecases',
    sectionAr: 'تجهيزات الاستخدام (Setups)',
    sectionEn: 'Use Cases & Setups',
    titleAr: 'تجهيز الألعاب والأداء العالي',
    titleEn: 'Gaming Setup Image',
    descriptionAr: 'صورة مساحة الألعاب وأجهزة الأداء العالي ومعدات الجيمنج.',
    descriptionEn: 'Setup image for high performance gaming rigs and peripherals.',
    defaultUrl: '/images/home-reference/gaming.webp',
    recommendedSize: '1200 × 800 (WebP أو JPG)',
  },

  // 5. Categories Cards (بطاقات الفئات)
  {
    key: 'category_laptops',
    sectionKey: 'categories',
    sectionAr: 'بطاقات الفئات (Categories)',
    sectionEn: 'Categories Cards',
    titleAr: 'صورة فئة اللابتوبات',
    titleEn: 'Laptops Category Card',
    descriptionAr: 'البطاقة البصرية لفئة أجهزة اللابتوب المحمولة في الصفحة الرئيسية.',
    descriptionEn: 'Visual card image representing laptops on the homepage.',
    defaultUrl: '/images/home-reference/laptop-design.webp',
    recommendedSize: '900 × 600 (WebP أو JPG)',
  },
  {
    key: 'category_audio',
    sectionKey: 'categories',
    sectionAr: 'بطاقات الفئات (Categories)',
    sectionEn: 'Categories Cards',
    titleAr: 'صورة فئة الصوتيات',
    titleEn: 'Audio Category Card',
    descriptionAr: 'البطاقة البصرية لفئة السماعات والمعدات الصوتية في الصفحة الرئيسية.',
    descriptionEn: 'Visual card image representing headphones and audio gear.',
    defaultUrl: '/images/home-reference/headphones.webp',
    recommendedSize: '900 × 600 (WebP أو JPG)',
  },
  {
    key: 'category_gaming',
    sectionKey: 'categories',
    sectionAr: 'بطاقات الفئات (Categories)',
    sectionEn: 'Categories Cards',
    titleAr: 'صورة فئة الألعاب',
    titleEn: 'Gaming Category Card',
    descriptionAr: 'البطاقة البصرية لفئة أجهزة وملحقات الألعاب في الصفحة الرئيسية.',
    descriptionEn: 'Visual card image representing gaming devices and accessories.',
    defaultUrl: '/images/home-reference/gaming.webp',
    recommendedSize: '900 × 600 (WebP أو JPG)',
  },
  {
    key: 'category_network',
    sectionKey: 'categories',
    sectionAr: 'بطاقات الفئات (Categories)',
    sectionEn: 'Categories Cards',
    titleAr: 'صورة فئة الشبكات والاتصال',
    titleEn: 'Networking Category Card',
    descriptionAr: 'البطاقة البصرية لفئة راوترات وأجهزة وحلول الشبكات.',
    descriptionEn: 'Visual card image representing network hardware and routers.',
    defaultUrl: '/images/home-reference/network.webp',
    recommendedSize: '900 × 600 (WebP أو JPG)',
  },
  {
    key: 'category_storage',
    sectionKey: 'categories',
    sectionAr: 'بطاقات الفئات (Categories)',
    sectionEn: 'Categories Cards',
    titleAr: 'صورة فئة حلول التخزين',
    titleEn: 'Storage Category Card',
    descriptionAr: 'البطاقة البصرية لفئة أقراص التخزين SSD والهارديسكات.',
    descriptionEn: 'Visual card image representing storage drives and memory.',
    defaultUrl: '/images/home-reference/storage.webp',
    recommendedSize: '900 × 600 (WebP أو JPG)',
  },
  {
    key: 'category_power',
    sectionKey: 'categories',
    sectionAr: 'بطاقات الفئات (Categories)',
    sectionEn: 'Categories Cards',
    titleAr: 'صورة فئة حلول الطاقة والـ UPS',
    titleEn: 'Power & Backup Category Card',
    descriptionAr: 'البطاقة البصرية لفئة وحدات الطاقة وتجهيزات عدم انقطاع التيار.',
    descriptionEn: 'Visual card image representing UPS power systems.',
    defaultUrl: '/images/home-reference/power.webp',
    recommendedSize: '900 × 600 (WebP أو JPG)',
  },

  // 6. Brand / Identity (شعار وهوية الموقع)
  {
    key: 'logo',
    sectionKey: 'brand',
    sectionAr: 'هوية الموقع والشعار (Brand)',
    sectionEn: 'Brand & Logo',
    titleAr: 'شعار الموقع والمتجر',
    titleEn: 'Website & Store Logo',
    descriptionAr: 'الشعار الرسمي المعروض في شريط التنقل العلوي وتذييل الصفحات.',
    descriptionEn: 'Official logo displayed in the top navbar and footer.',
    defaultUrl: '/logo.webp',
    recommendedSize: '512 × 512 (WebP أو PNG شفاف)',
  }
];

export const HOME_IMAGE_SECTIONS = [
  { key: 'all', titleAr: 'جميع الصور', titleEn: 'All Images' },
  { key: 'hero', titleAr: 'قسم الواجهة (Hero)', titleEn: 'Hero Section' },
  { key: 'integration', titleAr: 'منظومة التكامل', titleEn: 'Integration' },
  { key: 'workstation', titleAr: 'محطة العمل والشاشات', titleEn: 'Workstation & Displays' },
  { key: 'usecases', titleAr: 'تجهيزات الاستخدام', titleEn: 'Setups & Use Cases' },
  { key: 'categories', titleAr: 'بطاقات الفئات', titleEn: 'Categories' },
  { key: 'brand', titleAr: 'الشعار والهوية', titleEn: 'Brand & Logo' },
] as const;
