import { test, expect } from '@playwright/test';
import { randomUUID } from 'node:crypto';

const fixture = {
  id: randomUUID(),
  email: 'admin-test@example.test',
  name: 'مدير المتجر',
  role: 'owner',
  isActive: true,
  mustChangePassword: false,
  totpEnabled: false,
  lastLoginAt: null,
  createdAt: '2026-10-02T00:00:00.000Z',
};

const mockOverview = {
  today: {
    pageViews: 1420,
    uniqueVisitors: 620,
    productViews: 850,
    whatsappClicks: 42,
    newCustomers: 12,
    newOrders: 8,
    newLeads: 5,
    pageViewGrowth: 15,
    visitorGrowth: 8,
    orderGrowth: 25,
    whatsappGrowth: 10,
  },
  trend: {
    views7d: [
      { day: '2026-10-21', views: 1100 },
      { day: '2026-10-22', views: 1250 },
      { day: '2026-10-23', views: 1300 },
      { day: '2026-10-24', views: 1400 },
      { day: '2026-10-25', views: 1350 },
      { day: '2026-10-26', views: 1480 },
      { day: '2026-10-27', views: 1420 },
    ],
    visitors7d: [
      { day: '2026-10-21', visitors: 500 },
      { day: '2026-10-22', visitors: 550 },
      { day: '2026-10-23', visitors: 580 },
      { day: '2026-10-24', visitors: 610 },
      { day: '2026-10-25', visitors: 590 },
      { day: '2026-10-26', visitors: 640 },
      { day: '2026-10-27', visitors: 620 },
    ],
    topHours: Array.from({ length: 24 }, (_, i) => ({ hour: i, count: i === 20 ? 120 : 30 })),
    timeSlots: [
      { id: 'dawn', labelAr: 'الفجر (12ص - 6ص)', labelEn: 'Dawn (12AM - 6AM)', count: 90, percent: 8 },
      { id: 'morning', labelAr: 'الصباح (6ص - 12ظ)', labelEn: 'Morning (6AM - 12PM)', count: 280, percent: 25 },
      { id: 'afternoon', labelAr: 'الظهيرة (12ظ - 5م)', labelEn: 'Afternoon (12PM - 5PM)', count: 250, percent: 22 },
      { id: 'evening', labelAr: 'المساء (5م - 9م)', labelEn: 'Evening (5PM - 9PM)', count: 380, percent: 34 },
      { id: 'night', labelAr: 'الليل (9م - 12ص)', labelEn: 'Night (9PM - 12AM)', count: 120, percent: 11 },
    ],
    peakSlot: { id: 'evening', labelAr: 'المساء (5م - 9م)', labelEn: 'Evening (5PM - 9PM)', count: 380, percent: 34 },
  },
  dateRange: {
    from: '2026-10-21',
    to: '2026-10-27',
    period: '7d',
  },
};

const mockSales = {
  summary: {
    totalRevenueUsd: 14500,
    totalRevenueYer: 7685000,
    totalDiscountUsd: 350,
    totalOrders: 32,
    completedOrders: 28,
    processingOrders: 3,
    newOrders: 1,
    cancelledOrders: 0,
    averageOrderValueUsd: 453.12,
    revenueGrowth: 18,
    orderGrowth: 12,
  },
  statusCounts: { new: 1, processing: 3, completed: 28, cancelled: 0 },
  topSoldProducts: [
    { productId: 'p1', title: { ar: 'لابتوب ديل للأعمال', en: 'Dell Business Laptop' }, quantity: 14, revenueUsd: 8400 },
    { productId: 'p2', title: { ar: 'شاشة سامسونج 27 بوصة', en: 'Samsung 27 Monitor' }, quantity: 9, revenueUsd: 2700 },
  ],
  funnel: {
    visitors: 620,
    productViews: 850,
    inquiriesAndCarts: 74,
    ordersPlaced: 32,
    ordersCompleted: 28,
    visitorToInquiryRate: 11.9,
    inquiryToOrderRate: 43.2,
    orderCompletionRate: 87.5,
  },
  dateRange: { from: '2026-10-21', to: '2026-10-27', period: '7d' },
};

const mockProducts = {
  topViewed: [
    {
      productId: 'p1',
      title: { ar: 'لابتوب ديل للأعمال', en: 'Dell Business Laptop' },
      model: 'Latitude 5420',
      category: 'لابتوبات',
      image: null,
      views: 340,
      whatsappClicks: 28,
      conversionRate: 8.2,
      lastSeen: '2026-10-27T18:00:00Z',
    },
    {
      productId: 'p2',
      title: { ar: 'طابعة اتش بي ليزر', en: 'HP Laser Printer' },
      model: 'LaserJet Pro',
      category: 'طابعات',
      image: null,
      views: 180,
      whatsappClicks: 14,
      conversionRate: 7.7,
      lastSeen: '2026-10-27T17:30:00Z',
    },
  ],
  topByClicks: [],
  cold: [
    {
      productId: 'p3',
      title: { ar: 'كيبل شبكة كات 6', en: 'Cat6 Network Cable' },
      model: 'C6-5M',
      category: 'شبكات',
      views: 65,
      daysSinceView: 12,
    },
  ],
  topSearches: [
    { query: 'لابتوب ديل', count: 45 },
    { query: 'طابعة', count: 28 },
  ],
};

const mockSources = {
  sources: [
    { source: 'direct', visitors: 420, percent: 67.7 },
    { source: 'google.com', visitors: 130, percent: 21.0 },
    { source: 'facebook.com', visitors: 70, percent: 11.3 },
  ],
  devices: { mobile: 450, tablet: 50, desktop: 120 },
  langs: { ar: 580, en: 40 },
  topCategories: [
    { category: 'لابتوبات', views: 510 },
    { category: 'طابعات', views: 240 },
  ],
};

const mockLocations = {
  totalVisitors: 620,
  countries: [
    { country: 'اليمن', countryCode: 'YE', flag: '🇾🇪', visitors: 560, percent: 90.3 },
    { country: 'المملكة العربية السعودية', countryCode: 'SA', flag: '🇸🇦', visitors: 45, percent: 7.3 },
    { country: 'الإمارات', countryCode: 'AE', flag: '🇦🇪', visitors: 15, percent: 2.4 },
  ],
  cities: [
    { city: 'صنعاء', country: 'اليمن', visitors: 380, percent: 61.3 },
    { city: 'عدن', country: 'اليمن', visitors: 110, percent: 17.7 },
    { city: 'تعز', country: 'اليمن', visitors: 70, percent: 11.3 },
    { city: 'الرياض', country: 'المملكة العربية السعودية', visitors: 35, percent: 5.6 },
  ],
  dateRange: { from: '2026-10-21', to: '2026-10-27', period: '7d' },
};

const mockDevices = {
  totalDevices: 620,
  classes: { mobile: 450, tablet: 50, desktop: 120 },
  classesPercent: { mobile: 73, tablet: 8, desktop: 19 },
  osList: [
    { name: 'Android', count: 380, percent: 61.3 },
    { name: 'iOS', count: 120, percent: 19.4 },
    { name: 'Windows', count: 100, percent: 16.1 },
    { name: 'macOS', count: 20, percent: 3.2 },
  ],
  browsersList: [
    { name: 'Chrome', count: 340, percent: 54.8 },
    { name: 'Safari', count: 130, percent: 21.0 },
    { name: 'Samsung Internet', count: 90, percent: 14.5 },
    { name: 'Edge', count: 60, percent: 9.7 },
  ],
  brandsList: [
    { name: 'Samsung', count: 220, percent: 35.5 },
    { name: 'Apple', count: 140, percent: 22.6 },
    { name: 'Xiaomi', count: 90, percent: 14.5 },
  ],
  screensList: [
    { resolution: '390x844', count: 110 },
    { resolution: '412x915', count: 95 },
    { resolution: '1920x1080', count: 80 },
  ],
  dateRange: { from: '2026-10-21', to: '2026-10-27', period: '7d' },
};

const mockVisitors = {
  visitors: [
    {
      index: 1,
      visitorHash: 'v_abc123456789',
      tag: 'زائر #v_abc1',
      totalEvents: 14,
      sessionsCount: 3,
      pageViewsCount: 8,
      productViewsCount: 4,
      distinctProductsCount: 3,
      whatsappClicksCount: 1,
      firstSeen: '2026-10-26T10:00:00Z',
      lastSeen: '2026-10-27T18:30:00Z',
      location: { country: 'اليمن', city: 'صنعاء', flag: '🇾🇪' },
      device: { deviceClass: 'mobile', os: 'Android 14', browser: 'Chrome Mobile', brand: 'Samsung' },
      topProducts: [
        { productId: 'p1', title: { ar: 'لابتوب ديل للأعمال', en: 'Dell Business Laptop' }, image: null },
      ],
    },
  ],
  pagination: { total: 1, page: 1, pageSize: 15, totalPages: 1 },
  dateRange: { from: '2026-10-21', to: '2026-10-27', period: '7d' },
};

const mockVisitorDetail = {
  visitor: {
    visitorHash: 'v_abc123456789',
    tag: 'زائر #v_abc1',
    sessionsCount: 3,
    totalEvents: 14,
    pageViewsCount: 8,
    productViewsCount: 4,
    distinctProductsCount: 3,
    whatsappClicksCount: 1,
    firstSeen: '2026-10-26T10:00:00Z',
    lastSeen: '2026-10-27T18:30:00Z',
    location: { country: 'اليمن', city: 'صنعاء', flag: '🇾🇪' },
    device: { deviceClass: 'mobile', os: 'Android 14', browser: 'Chrome Mobile', brand: 'Samsung', screen: '412x915' },
  },
  productsInspected: [
    {
      productId: 'p1',
      title: { ar: 'لابتوب ديل للأعمال', en: 'Dell Business Laptop' },
      model: 'Latitude 5420',
      category: 'لابتوبات',
      image: null,
      viewsCount: 3,
      lastSeen: '2026-10-27T18:30:00Z',
    },
  ],
  journey: [
    {
      id: 'e1',
      type: 'page_view',
      path: '/ar',
      productId: null,
      productTitle: null,
      productModel: null,
      productImage: null,
      searchQuery: null,
      deviceClass: 'mobile',
      lang: 'ar',
      createdAt: '2026-10-26T10:00:00Z',
    },
    {
      id: 'e2',
      type: 'product_view',
      path: '/ar/shop/product/latitude-5420',
      productId: 'p1',
      productTitle: { ar: 'لابتوب ديل للأعمال', en: 'Dell Business Laptop' },
      productModel: 'Latitude 5420',
      productImage: null,
      searchQuery: null,
      deviceClass: 'mobile',
      lang: 'ar',
      createdAt: '2026-10-27T18:25:00Z',
    },
    {
      id: 'e3',
      type: 'whatsapp_click',
      path: '/ar/shop/product/latitude-5420',
      productId: 'p1',
      productTitle: { ar: 'لابتوب ديل للأعمال', en: 'Dell Business Laptop' },
      productModel: 'Latitude 5420',
      productImage: null,
      searchQuery: null,
      deviceClass: 'mobile',
      lang: 'ar',
      createdAt: '2026-10-27T18:30:00Z',
    },
  ],
};

const mockLive = {
  activeNow: 4,
  isMe: true,
  hotPages: [{ path: '/ar/shop/laptops', count: 3 }],
  recentEvents: [
    {
      type: 'product_view',
      path: '/ar/shop/product/latitude-5420',
      productId: 'p1',
      productTitle: { ar: 'لابتوب ديل للأعمال', en: 'Dell Business Laptop' },
      productModel: 'Latitude 5420',
      deviceClass: 'mobile',
      lang: 'ar',
      createdAt: new Date().toISOString(),
    },
  ],
};

for (const width of [360, 1280]) {
  for (const lang of ['ar', 'en']) {
    test(`analytics responsive, locations, and visitor journeys ${lang} at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.addInitScript(language => localStorage.setItem('admin-language', language), lang);

      await page.route('**/api/admin/**', route => {
        const url = new URL(route.request().url());
        const path = url.pathname;

        if (path.endsWith('/auth/session')) {
          return route.fulfill({ json: { user: fixture, csrfToken: 'analytics-test-csrf' } });
        }
        if (path.endsWith('/analytics/overview')) {
          return route.fulfill({ json: mockOverview });
        }
        if (path.endsWith('/analytics/sales')) {
          return route.fulfill({ json: mockSales });
        }
        if (path.endsWith('/analytics/products')) {
          return route.fulfill({ json: mockProducts });
        }
        if (path.endsWith('/analytics/sources')) {
          return route.fulfill({ json: mockSources });
        }
        if (path.endsWith('/analytics/locations')) {
          return route.fulfill({ json: mockLocations });
        }
        if (path.endsWith('/analytics/devices')) {
          return route.fulfill({ json: mockDevices });
        }
        if (path.includes('/analytics/visitors/v_abc123456789')) {
          return route.fulfill({ json: mockVisitorDetail });
        }
        if (path.endsWith('/analytics/visitors')) {
          return route.fulfill({ json: mockVisitors });
        }
        if (path.endsWith('/analytics/live')) {
          return route.fulfill({ json: mockLive });
        }
        if (path.endsWith('/crm/summary')) {
          return route.fulfill({ json: { newLeads: 5, overdueFollowups: 0 } });
        }
        return route.fulfill({ json: {} });
      });

      await page.goto('/admin/analytics');

      // Check header and language direction
      await expect(page.locator('html')).toHaveAttribute('dir', lang === 'ar' ? 'rtl' : 'ltr');
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

      // Check zero horizontal overflow on mobile and desktop
      const isFit = await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth);
      expect(isFit).toBe(true);

      // Check date range presets
      const datePills = page.locator('.analytics-date-pill');
      expect(await datePills.count()).toBeGreaterThan(3);

      // Check custom date range ("من تاريخ إلى تاريخ" / "Custom")
      const customPill = datePills.last();
      await customPill.click();
      await expect(page.locator('.analytics-custom-date-panel')).toBeVisible();

      // Check no horizontal overflow after opening custom date inputs
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);

      // Check navigation tabs: Overview, Sales, Products, Sources, Locations, Visitors, Live (7 tabs)
      const navTabs = page.locator('.analytics-nav-tab-btn');
      expect(await navTabs.count()).toBe(7);

      // 1. Click Sales Tab
      await navTabs.nth(1).click();
      await expect(page.locator('.analytics-status-grid')).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);

      // 2. Click Products Tab
      await navTabs.nth(2).click();
      if (width <= 640) {
        await expect(page.locator('.analytics-mobile-prod-cards')).toBeVisible();
      } else {
        await expect(page.locator('.analytics-desktop-products-table')).toBeVisible();
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);

      // 3. Click Locations & Devices Tab (tab 4)
      await navTabs.nth(4).click();
      await expect(page.locator('.analytics-locations-grid')).toBeVisible();
      await expect(page.locator('.device-specs-grid')).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);

      // 4. Click Visitors & Journeys Tab (tab 5)
      await navTabs.nth(5).click();
      if (width <= 768) {
        await expect(page.locator('.analytics-mobile-visitor-cards')).toBeVisible();
      } else {
        await expect(page.locator('.analytics-visitors-table')).toBeVisible();
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);

      // 5. Open Visitor Journey Modal
      const journeyBtn = width <= 768
        ? page.locator('.analytics-mobile-visitor-cards .visitor-row-btn').first()
        : page.locator('.analytics-visitors-table .visitor-row-btn').first();
      await expect(journeyBtn).toBeVisible();
      await journeyBtn.click();

      // Modal dialog should open and show timeline
      const modalDialog = page.locator('.visitor-modal-dialog');
      await expect(modalDialog).toBeVisible();
      await expect(page.locator('.visitor-timeline')).toBeVisible();
      await expect(page.locator('.timeline-node').first()).toBeVisible();

      // Close modal
      const closeBtn = page.locator('.visitor-modal-close-btn');
      await closeBtn.click();
      await expect(modalDialog).not.toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    });
  }
}
