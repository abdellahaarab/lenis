export type Language = 'ar' | 'en'
export type Direction = 'rtl' | 'ltr'

export interface Translations {
  meta: {
    title: string;
    description: string;
  };
  nav: {
    setups: string;
    businessSolutions: string;
    warrantySupport: string;
    contactUs: string;
    switchLanguage: string;
    currentLanguageName: string;
    targetLanguageName: string;
    toggleMenu: string;
    findSetup: string;
  };
  hero: {
    storeName: string;
    tagline: string;
    subtitle: string;
    helper: string;
    ctaPrimary: string;
    ctaBusiness: string;
    scrollIndicator: string;
  };
  integration: {
    title: string;
    subtitle: string;
    stages: Array<{ title: string; description: string }>;
    cta: string;
  };
  useCases: {
    title: string;
    subtitle: string;
    cases: Array<{
      id: string;
      label: string;
      title: string;
      description: string;
      items: string[];
      cta: string;
    }>;
    ctaPrefix: string;
  };
  categories: {
    title: string;
    items: Array<{ id: string; name: string; description: string }>;
  };
  business: {
    title: string;
    subtitle: string;
    description: string;
    pillars: Array<{ title: string; description: string }>;
    steps: Array<{ title: string; description: string }>;
    cta: string;
    formFields: {
      companyName: string;
      teamSize: string;
      services: string;
      description: string;
      timeline: string;
      contact: string;
    };
  };
  service: {
    title: string;
    subtitle: string;
    stages: Array<{ title: string; description: string }>;
    warrantyLink: string;
    helpCta: string;
    motto: string;
  };
  trust: {
    title: string;
    brandsTitle: string;
    brandsDisclaimer: string;
  };
  finalCta: {
    title: string;
    subtitle: string;
    individual: string;
    business: string;
    support: string;
  };
  footer: {
    storeName: string;
    location: string;
    copyright: string;
    privacyPolicy: string;
    termsOfService: string;
  };
  accessibility: {
    skipToContent: string;
    reduceMotion: string;
  };
  contact: {
    title: string;
    subtitle: string;
    useCaseLabel: string;
    currentDeviceLabel: string;
    prioritiesLabel: string;
    budgetLabel: string;
    budgetOptional: string;
    sendMessage: string;
    sending: string;
    sent: string;
    sentDescription: string;
    failed: string;
    retry: string;
    whatsappDisclaimer: string;
    nameLabel: string;
    companyLabel: string;
    teamSizeLabel: string;
    servicesLabel: string;
    descriptionLabel: string;
    timelineLabel: string;
    timelineOptional: string;
    supportType: string;
    supportDescription: string;
    invoiceLabel: string;
    modelLabel: string;
  };
  shop: {
    title: string;
    subtitle: string;
    allCategories: string;
    filters: string;
    clearFilters: string;
    brand: string;
    cpu: string;
    ram: string;
    storage: string;
    condition: string;
    inStockOnly: string;
    sortBy: string;
    sortNewest: string;
    sortBattery: string;
    noProductsFound: string;
    resetFilterPrompt: string;
    productsCount: string;
    viewDetails: string;
    askAboutProduct: string;
    askForPrice: string;
    warrantyTBD: string;
    demoBadge: string;
    demoDisclaimer: string;
    conditionLabels: Record<string, string>;
    stockLabels: Record<string, string>;
    categories: Record<string, string>;
  };
  product: {
    specsTitle: string;
    inspectionTitle: string;
    passedInspection: string;
    compatibleTitle: string;
    bestForTitle: string;
    whatsappDisabledNotice: string;
    orderViaWhatsApp: string;
    backToShop: string;
    breadcrumbHome: string;
    breadcrumbShop: string;
    keySpecs: string;
    conditionDetails: string;
    inspectionNotes: string;
  };
}

