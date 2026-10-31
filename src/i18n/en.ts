import { Translations } from './types';

export const en: Translations = {
  meta: {
    title: 'Al-Jeel Al-Arabi Digital | Computer & Electronics Store in Sana’a',
    description: 'Shop computers, laptops, tech accessories and networking products from Al-Jeel Al-Arabi Digital in Sana’a. Browse products, specifications and listed prices.'
  },
  nav: {
    setups: 'Setups',
    businessSolutions: 'Business Solutions',
    warrantySupport: 'Warranty & Support',
    contactUs: 'Contact Us',
    switchLanguage: 'العربية',
    currentLanguageName: 'English',
    targetLanguageName: 'العربية',
    toggleMenu: 'Menu',
    findSetup: 'Browse the store'
  },
  hero: {
    storeName: 'Al-Jeel Al-Arabi Digital Store',
    tagline: 'Your tech. Working together.',
    subtitle: 'Devices, setups and technology solutions for people and businesses in Sana\'a.',
    helper: 'Choose the right technology and bring the pieces together, from your device to your workspace.',
    ctaPrimary: 'Find your setup',
    ctaBusiness: 'Business solutions',
    scrollIndicator: 'Discover more'
  },
  integration: {
    title: 'Every part has a purpose. Together, they complete your setup.',
    subtitle: 'We choose what works with your device and connect every detail',
    stages: [
      { title: 'We start with your needs.', description: 'Choices tied to your use case' },
      { title: 'We pick what works with your device.', description: 'Compatibility and setup' },
      { title: 'And bring the details together.', description: 'Integration across components' }
    ],
    cta: 'Choose your use case'
  },
  useCases: {
    title: 'Start with what you want to do.',
    subtitle: 'Choose what you do every day. See what could complete your setup.',
    cases: [
      {
        id: 'study',
        label: 'Study & Learn',
        title: 'Start with a study-ready setup.',
        description: 'From lectures to projects, choose a device for your field and software, with accessories for carrying, storage and charging.',
        items: ['Suitable laptop', 'Carrying accessories', 'Storage & charging'],
        cta: 'Help me choose a study setup'
      },
      {
        id: 'work',
        label: 'Work & Produce',
        title: 'Details that serve your day.',
        description: 'More screen space, enough ports and a tidy desk. We check your connections and workflow before choosing accessories.',
        items: ['Laptop & monitor', 'Hub & stand', 'Desk organization'],
        cta: 'Discuss my office setup'
      },
      {
        id: 'content',
        label: 'Create Content',
        title: 'Set up your audio and visuals.',
        description: 'Start with clear audio and suitable lighting. Match your microphone, headphones and accessories to your device and recording workflow.',
        items: ['Microphone & arm', 'Professional lighting', 'Studio headphones'],
        cta: 'Request a content creation setup'
      },
      {
        id: 'gaming',
        label: 'Play & Enjoy',
        title: 'Set up your experience.',
        description: 'Tell us your games and budget. Balance the device, display, headset and peripherals around the experience you want.',
        items: ['Gaming device', 'Monitor & headset', 'Balanced peripherals'],
        cta: 'Discuss a gaming setup'
      }
    ],
    ctaPrefix: 'Discuss this setup'
  },
  categories: {
    title: 'Explore Categories',
    items: [
      { id: 'laptops', name: 'Laptops & Devices', description: 'Devices for every use case' },
      { id: 'displays', name: 'Displays & Desk Setup', description: 'Clearer view and organized space' },
      { id: 'audio', name: 'Audio & Content Creation', description: 'Recording, listening and streaming gear' },
      { id: 'gaming', name: 'Gaming & Peripherals', description: 'Balanced performance and experience' },
      { id: 'network', name: 'Networking & Connectivity', description: 'Connect devices and share resources' },
      { id: 'storage', name: 'Storage', description: 'Organized file access' },
      { id: 'power', name: 'Power & Protection', description: 'Continuous operation' }
    ]
  },
  business: {
    title: 'From your desk to your team.',
    subtitle: 'Technology solutions for companies and organizations',
    description: 'We organize your team\'s needs into a clear scope: devices, connectivity, storage, and power, with setup details and support based on the project.',
    pillars: [
      { title: 'Devices', description: 'Workstations and devices based on tasks' },
      { title: 'Connectivity & Storage', description: 'Internal network and shared storage' },
      { title: 'Power & Support', description: 'Operation protection and support plan' }
    ],
    steps: [
      { title: 'Define needs', description: 'We understand your work and requirements' },
      { title: 'Propose scope', description: 'Suitable solutions with clear budget' },
      { title: 'Setup & testing', description: 'Installation and inspection before handover' },
      { title: 'Delivery & follow-up', description: 'Ongoing support after deployment' }
    ],
    cta: 'Discuss your project',
    formFields: {
      companyName: 'Organization name',
      teamSize: 'Approximate team size',
      services: 'Required solutions',
      description: 'Brief description',
      timeline: 'Expected timeline',
      contact: 'Contact method'
    }
  },
  service: {
    title: 'Clear support after handover.',
    subtitle: 'From selection to support',
    stages: [
      { title: 'We understand your needs', description: 'We learn about your use and priorities' },
      { title: 'We check compatibility', description: 'We ensure parts work together' },
      { title: 'We set up and deliver', description: 'Installation, testing and complete handover' },
      { title: 'We clarify warranty & support', description: 'Clear terms and open channels' }
    ],
    warrantyLink: 'View warranty & support details',
    helpCta: 'I need help',
    motto: 'Technology that integrates.. and warranty that continues'
  },
  trust: {
    title: 'What can we show?',
    brandsTitle: 'Brands we carry',
    brandsDisclaimer: 'Displayed brands represent available products and do not necessarily imply official dealership or certification.'
  },
  finalCta: {
    title: 'What would you like to set up?',
    subtitle: 'Start with your needs. We\'ll work out the details together.',
    individual: 'Find your setup',
    business: 'Business solutions',
    support: 'I need help'
  },
  footer: {
    storeName: 'Al-Jeel Al-Arabi Digital Store',
    location: 'Sana\'a',
    copyright: '© 2026 Al-Jeel Al-Arabi Digital Store. All rights reserved.',
    privacyPolicy: 'Privacy Policy',
    termsOfService: 'Terms of Service'
  },
  accessibility: {
    skipToContent: 'Skip to content',
    reduceMotion: 'Reduce motion'
  },
  contact: {
    title: 'Contact Us',
    subtitle: 'Tell us what you need and we will contact you',
    useCaseLabel: 'Use Case',
    currentDeviceLabel: 'Current Device (Optional)',
    prioritiesLabel: 'Priorities',
    budgetLabel: 'Approximate Budget',
    budgetOptional: 'Optional',
    sendMessage: 'Send via WhatsApp',
    sending: 'Sending...',
    sent: 'Chat Opened',
    sentDescription: 'WhatsApp will open to send your message. Nothing was sent automatically.',
    failed: 'Error occurred',
    retry: 'Retry',
    whatsappDisclaimer: 'A WhatsApp chat will open with a summary of your request',
    nameLabel: 'Name',
    companyLabel: 'Organization Name',
    teamSizeLabel: 'Number of Users',
    servicesLabel: 'Required Services',
    descriptionLabel: 'Brief Description',
    timelineLabel: 'Expected Timeline',
    timelineOptional: 'Optional',
    supportType: 'Issue Type',
    supportDescription: 'Issue Description',
    invoiceLabel: 'Invoice Number (Optional)',
    modelLabel: 'Device Model (Optional)'
  },
  shop: {
    title: 'Store & Catalog',
    subtitle: 'Tested devices, accessories and workstations with transparent hardware specifications',
    allCategories: 'All Categories',
    filters: 'Filters',
    clearFilters: 'Clear Filters',
    brand: 'Brand',
    cpu: 'Processor (CPU)',
    ram: 'Memory (RAM)',
    storage: 'Storage',
    condition: 'Condition Grade',
    inStockOnly: 'In-Stock Only',
    sortBy: 'Sort by',
    sortNewest: 'Newest Arrivals',
    sortBattery: 'Battery Health',
    noProductsFound: 'No products match your selected filter criteria',
    resetFilterPrompt: 'Try clearing some filters to explore all available hardware',
    productsCount: 'products listed',
    viewDetails: 'View Device Specs',
    askAboutProduct: 'Inquire About Device',
    askForPrice: 'Ask for Price',
    warrantyTBD: 'Determined Upon Order',
    demoBadge: 'Demo Data',
    demoDisclaimer: 'This device is displayed as sample demo data for structure validation. Final price and warranty terms are confirmed directly with store management.',
    conditionLabels: {
      new: 'Brand New (Sealed)',
      open_box: 'Open Box',
      like_new: 'Like New',
      refurbished: 'Refurbished',
      used: 'Used',
      defective: 'Defective',
      A: 'Grade A — Like New',
      B: 'Grade B — Very Good',
      C: 'Grade C — Value / Fair'
    },
    stockLabels: {
      in_stock: 'In Stock',
      low: 'Low Stock',
      order: 'On Pre-order',
      sold: 'Sold Out'
    },
    categories: {
      laptops: 'Laptops & PCs',
      displays: 'Displays & Desk Setup',
      audio: 'Audio & Content Creation',
      gaming: 'Gaming & Peripherals',
      network: 'Networking & Wi-Fi',
      storage: 'Storage',
      power: 'Power & UPS'
    }
  },
  product: {
    specsTitle: 'Full Technical Specifications',
    inspectionTitle: 'Pre-delivery Inspection Report',
    passedInspection: 'Passed 7-Point Hardware Verification',
    compatibleTitle: 'Works Seamlessly With (Compatible Gear)',
    bestForTitle: 'Recommended Use Cases',
    whatsappDisabledNotice: 'Store WhatsApp number is not configured in the system. Direct messaging will activate once confirmed.',
    orderViaWhatsApp: 'Inquire on WhatsApp',
    backToShop: 'Back to Store Catalog',
    breadcrumbHome: 'Home',
    breadcrumbShop: 'Store',
    keySpecs: 'Key Specs',
    conditionDetails: 'Condition Breakdown',
    inspectionNotes: 'Technician Inspection Notes'
  }
};
