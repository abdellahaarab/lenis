import * as XLSX from 'xlsx';

export interface AnalyticsExportData {
  storeName: string;
  dateRange: {
    from: string;
    to: string;
    period: string;
  };
  generatedAt: string;
  overview: {
    pageViews: number;
    uniqueVisitors: number;
    productViews: number;
    whatsappClicks: number;
    newCustomers: number;
    newOrders: number;
    newLeads: number;
    pageViewGrowth: number | null;
    visitorGrowth: number | null;
  };
  sales?: {
    totalRevenueUsd: number;
    totalRevenueYer: number;
    totalDiscountUsd: number;
    totalOrders: number;
    completedOrders: number;
    processingOrders: number;
    newOrders: number;
    cancelledOrders: number;
    averageOrderValueUsd: number;
    revenueGrowth: number | null;
    orderGrowth: number | null;
    topSoldProducts: {
      productId: string;
      title: unknown;
      quantity: number;
      revenueUsd: number;
    }[];
    funnel: {
      visitors: number;
      productViews: number;
      inquiriesAndCarts: number;
      ordersPlaced: number;
      ordersCompleted: number;
      visitorToInquiryRate: number;
      inquiryToOrderRate: number;
      orderCompletionRate: number;
    };
  };
  locations?: {
    totalVisitors: number;
    countries: { country: string; countryCode: string; flag: string; visitors: number; percent: number }[];
    cities: { city: string; country: string; visitors: number; percent: number }[];
  };
  devicesData?: {
    totalDevices: number;
    classes: { mobile: number; tablet: number; desktop: number };
    classesPercent: { mobile: number; tablet: number; desktop: number };
    osList: { name: string; count: number; percent: number }[];
    browsersList: { name: string; count: number; percent: number }[];
    brandsList: { name: string; count: number; percent: number }[];
  };
  visitorsList?: {
    tag: string;
    country: string;
    city: string;
    deviceClass: string;
    os: string;
    browser: string;
    sessionsCount: number;
    pageViewsCount: number;
    productViewsCount: number;
    distinctProductsCount: number;
    whatsappClicksCount: number;
    firstSeen: string;
    lastSeen: string;
  }[];
  products?: {
    topViewed: {
      productId: string;
      title: string;
      model: string;
      category: string;
      views: number;
      whatsappClicks: number;
      conversionRate: number;
    }[];
    cold: {
      productId: string;
      title: string;
      model: string;
      category: string;
      views: number;
      daysSinceView: number;
    }[];
    topSearches: { query: string; count: number }[];
  };
  sources?: {
    sources: { source: string; visitors: number; percent: number }[];
    devices: { mobile: number; tablet: number; desktop: number };
    langs: { ar: number; en: number };
    topCategories: { category: string; views: number }[];
  };
}

function localizedTitle(title: unknown): string {
  if (!title) return '';
  if (typeof title === 'string') return title;
  if (typeof title === 'object') {
    const t = title as Record<string, string>;
    return t.ar || t.en || Object.values(t)[0] || '';
  }
  return String(title);
}

export function exportAnalyticsToExcel(data: AnalyticsExportData, ar = true) {
  const wb = XLSX.utils.book_new();

  // ─────────────────────────────────────────────────────────────
  // 1. Sheet: Executive Summary (الملخص التنفيذي)
  // ─────────────────────────────────────────────────────────────
  const summaryRows = [
    [ar ? 'تقرير الأداء التنفيذي للمتجر' : 'Store Executive Performance Report'],
    [ar ? 'المتجر:' : 'Store:', data.storeName],
    [ar ? 'الفترة المحددة:' : 'Date Range:', `${data.dateRange.from}  إلى (to)  ${data.dateRange.to}`],
    [ar ? 'نوع التصفية:' : 'Period Filter:', data.dateRange.period],
    [ar ? 'تاريخ استخراج التقرير:' : 'Generated At:', data.generatedAt],
    [],
    [ar ? 'المؤشر' : 'KPI Metric', ar ? 'القيمة' : 'Value', ar ? 'نسبة النمو (مقارنة بالفترة السابقة)' : 'Growth vs Previous Period'],
    [ar ? 'مشاهدات الصفحات' : 'Page Views', data.overview.pageViews, data.overview.pageViewGrowth !== null ? `${data.overview.pageViewGrowth}%` : '-'],
    [ar ? 'الزوار الفريدين' : 'Unique Visitors', data.overview.uniqueVisitors, data.overview.visitorGrowth !== null ? `${data.overview.visitorGrowth}%` : '-'],
    [ar ? 'مشاهدات المنتجات' : 'Product Views', data.overview.productViews, '-'],
    [ar ? 'نقرات التواصل عبر واتساب' : 'WhatsApp Inquiries', data.overview.whatsappClicks, '-'],
    [ar ? 'عملاء جدد مسجلين' : 'New Customers', data.overview.newCustomers, '-'],
    [ar ? 'استفسارات جديدة' : 'New Leads', data.overview.newLeads, '-'],
    [ar ? 'إجمالي الطلبات' : 'Total Orders', data.sales?.totalOrders ?? data.overview.newOrders, data.sales?.orderGrowth !== null && data.sales?.orderGrowth !== undefined ? `${data.sales.orderGrowth}%` : '-'],
    [ar ? 'الطلبات المكتملة' : 'Completed Orders', data.sales?.completedOrders ?? 0, '-'],
    [ar ? 'إجمالي الإيرادات (دولار)' : 'Total Revenue (USD)', data.sales ? `$${data.sales.totalRevenueUsd.toLocaleString()}` : '-', data.sales?.revenueGrowth !== null && data.sales?.revenueGrowth !== undefined ? `${data.sales.revenueGrowth}%` : '-'],
    [ar ? 'إجمالي الإيرادات (ريال يمني)' : 'Total Revenue (YER)', data.sales ? `${data.sales.totalRevenueYer.toLocaleString()} ر.ي` : '-', '-'],
    [ar ? 'متوسط قيمة الطلب (USD)' : 'Avg Order Value (USD)', data.sales ? `$${data.sales.averageOrderValueUsd}` : '-', '-'],
    [ar ? 'إجمالي الأجهزة المختلفة' : 'Total Unique Devices', data.devicesData?.totalDevices ?? data.overview.uniqueVisitors, '-'],
  ];

  if (data.sales?.funnel) {
    summaryRows.push([]);
    summaryRows.push([ar ? 'مؤشرات قمع التحويل التجاري' : 'Conversion Funnel Stages', ar ? 'العدد' : 'Count', ar ? 'معدل التحويل' : 'Stage Conversion %']);
    summaryRows.push([ar ? '1. زوار المتجر' : '1. Store Visitors', data.sales.funnel.visitors, '100%']);
    summaryRows.push([ar ? '2. مشاهدات المنتجات' : '2. Product Views', data.sales.funnel.productViews, '-']);
    summaryRows.push([ar ? '3. الاهتمام والتواصل (واتساب/سلة)' : '3. Inquiries & Engagements', data.sales.funnel.inquiriesAndCarts, `${data.sales.funnel.visitorToInquiryRate}%`]);
    summaryRows.push([ar ? '4. طلبات تم إنشاؤها' : '4. Orders Placed', data.sales.funnel.ordersPlaced, `${data.sales.funnel.inquiryToOrderRate}%`]);
    summaryRows.push([ar ? '5. طلبات مكتملة ومدفوعة' : '5. Completed Orders', data.sales.funnel.ordersCompleted, `${data.sales.funnel.orderCompletionRate}%`]);
  }

  const wsSummary = XLSX.utils.aoa_to_sheet(summaryRows);
  wsSummary['!cols'] = [{ wch: 32 }, { wch: 22 }, { wch: 30 }];
  XLSX.utils.book_append_sheet(wb, wsSummary, ar ? 'الملخص التنفيذي' : 'Summary');

  // ─────────────────────────────────────────────────────────────
  // 2. Sheet: Visitors Engagement (سجل الزوار وتفاعلهم)
  // ─────────────────────────────────────────────────────────────
  if (data.visitorsList && data.visitorsList.length > 0) {
    const vRows: (string | number)[][] = [
      [ar ? 'سجل الزوار وتفاعلهم مع المنتجات للفترة من:' : 'Visitor Engagement & Product Inspection from:', data.dateRange.from, ar ? 'إلى:' : 'to:', data.dateRange.to],
      [],
      [
        ar ? 'الزائر' : 'Visitor Tag',
        ar ? 'الدولة' : 'Country',
        ar ? 'المدينة' : 'City',
        ar ? 'نوع الجهاز' : 'Device Class',
        ar ? 'نظام التشغيل' : 'OS',
        ar ? 'المتصفح' : 'Browser',
        ar ? 'الجلسات' : 'Sessions',
        ar ? 'الصفحات' : 'Page Views',
        ar ? 'مشاهدات المنتجات' : 'Product Views',
        ar ? 'منتجات فريدة' : 'Distinct Products',
        ar ? 'نقرات واتساب' : 'WhatsApp Clicks',
        ar ? 'أول ظهور' : 'First Seen',
        ar ? 'آخر نشاط' : 'Last Seen',
      ],
    ];

    for (const v of data.visitorsList) {
      vRows.push([
        v.tag,
        v.country,
        v.city,
        v.deviceClass,
        v.os,
        v.browser,
        v.sessionsCount,
        v.pageViewsCount,
        v.productViewsCount,
        v.distinctProductsCount,
        v.whatsappClicksCount,
        v.firstSeen.slice(0, 19).replace('T', ' '),
        v.lastSeen.slice(0, 19).replace('T', ' '),
      ]);
    }

    const wsVisitors = XLSX.utils.aoa_to_sheet(vRows);
    wsVisitors['!cols'] = [{ wch: 16 }, { wch: 14 }, { wch: 14 }, { wch: 12 }, { wch: 16 }, { wch: 16 }, { wch: 10 }, { wch: 10 }, { wch: 16 }, { wch: 14 }, { wch: 14 }, { wch: 20 }, { wch: 20 }];
    XLSX.utils.book_append_sheet(wb, wsVisitors, ar ? 'سجل الزوار' : 'Visitors');
  }

  // ─────────────────────────────────────────────────────────────
  // 3. Sheet: Locations & Devices (المواقع الجغرافية والأجهزة)
  // ─────────────────────────────────────────────────────────────
  if (data.locations || data.devicesData) {
    const locRows: (string | number)[][] = [
      [ar ? 'تقرير المواقع الجغرافية والأجهزة للفترة من:' : 'Geographic Locations & Devices Report from:', data.dateRange.from, ar ? 'إلى:' : 'to:', data.dateRange.to],
      [],
    ];

    if (data.locations) {
      locRows.push([ar ? 'توزيع الدول' : 'Countries Breakdown']);
      locRows.push([ar ? 'الدولة' : 'Country', ar ? 'الرمز' : 'Code', ar ? 'الزوار' : 'Visitors', ar ? 'النسبة' : 'Percent']);
      for (const c of data.locations.countries) {
        locRows.push([`${c.flag} ${c.country}`, c.countryCode, c.visitors, `${c.percent}%`]);
      }
      locRows.push([]);
      locRows.push([ar ? 'توزيع المدن' : 'Cities Breakdown']);
      locRows.push([ar ? 'المدينة' : 'City', ar ? 'الدولة' : 'Country', ar ? 'الزوار' : 'Visitors', ar ? 'النسبة' : 'Percent']);
      for (const ct of data.locations.cities) {
        locRows.push([ct.city, ct.country, ct.visitors, `${ct.percent}%`]);
      }
      locRows.push([]);
    }

    if (data.devicesData) {
      locRows.push([ar ? 'إجمالي الأجهزة المختلفة:' : 'Total Unique Devices:', data.devicesData.totalDevices]);
      locRows.push([]);
      locRows.push([ar ? 'أنظمة التشغيل' : 'Operating Systems']);
      locRows.push([ar ? 'النظام' : 'OS', ar ? 'عدد الأجهزة' : 'Count', ar ? 'النسبة' : 'Percent']);
      for (const os of data.devicesData.osList) {
        locRows.push([os.name, os.count, `${os.percent}%`]);
      }
      locRows.push([]);
      locRows.push([ar ? 'المتصفحات' : 'Browsers']);
      locRows.push([ar ? 'المتصفح' : 'Browser', ar ? 'عدد الأجهزة' : 'Count', ar ? 'النسبة' : 'Percent']);
      for (const b of data.devicesData.browsersList) {
        locRows.push([b.name, b.count, `${b.percent}%`]);
      }
    }

    const wsLoc = XLSX.utils.aoa_to_sheet(locRows);
    wsLoc['!cols'] = [{ wch: 25 }, { wch: 20 }, { wch: 15 }, { wch: 15 }];
    XLSX.utils.book_append_sheet(wb, wsLoc, ar ? 'المواقع والأجهزة' : 'Locations & Devices');
  }

  // ─────────────────────────────────────────────────────────────
  // 4. Sheet: Sales & Orders (المبيعات والطلبات)
  // ─────────────────────────────────────────────────────────────
  if (data.sales) {
    const salesRows: (string | number)[][] = [
      [ar ? 'تقرير المبيعات والطلبات للفترة من:' : 'Sales & Orders Report from:', data.dateRange.from, ar ? 'إلى:' : 'to:', data.dateRange.to],
      [],
      [ar ? 'حالة الطلب' : 'Order Status', ar ? 'عدد الطلبات' : 'Count'],
      [ar ? 'طلبات جديدة' : 'New', data.sales.newOrders],
      [ar ? 'قيد التجهيز والمعالجة' : 'Processing', data.sales.processingOrders],
      [ar ? 'مكتملة ومستلمة' : 'Completed', data.sales.completedOrders],
      [ar ? 'ملغية' : 'Cancelled', data.sales.cancelledOrders],
      [],
      [ar ? 'المنتجات الأكثر مبيعاً وتحقيقاً للإيراد' : 'Top Revenue Products'],
      [ar ? 'المعرف' : 'Product ID', ar ? 'اسم المنتج' : 'Title', ar ? 'الكمية المباعة' : 'Units Sold', ar ? 'إجمالي الإيراد (USD)' : 'Revenue USD'],
    ];

    for (const p of data.sales.topSoldProducts) {
      salesRows.push([p.productId, localizedTitle(p.title), p.quantity, `$${p.revenueUsd.toFixed(2)}`]);
    }

    const wsSales = XLSX.utils.aoa_to_sheet(salesRows);
    wsSales['!cols'] = [{ wch: 28 }, { wch: 35 }, { wch: 15 }, { wch: 18 }];
    XLSX.utils.book_append_sheet(wb, wsSales, ar ? 'المبيعات والطلبات' : 'Sales & Orders');
  }

  // ─────────────────────────────────────────────────────────────
  // 5. Sheet: Products Performance (أداء المنتجات)
  // ─────────────────────────────────────────────────────────────
  if (data.products) {
    const prodRows: (string | number)[][] = [
      [ar ? 'تقرير تفاعل وأداء المنتجات للفترة من:' : 'Product Performance Report from:', data.dateRange.from, ar ? 'إلى:' : 'to:', data.dateRange.to],
      [],
      [ar ? 'الترتيب' : 'Rank', ar ? 'اسم المنتج' : 'Product', ar ? 'الموديل' : 'Model', ar ? 'الفئة' : 'Category', ar ? 'المشاهدات' : 'Views', ar ? 'نقرات واتساب' : 'Inquiries', ar ? 'معدل التحويل' : 'CVR %'],
    ];

    data.products.topViewed.forEach((p, index) => {
      prodRows.push([
        index + 1,
        p.title,
        p.model,
        p.category,
        p.views,
        p.whatsappClicks,
        `${p.conversionRate}%`,
      ]);
    });

    if (data.products.cold.length > 0) {
      prodRows.push([]);
      prodRows.push([ar ? 'أصناف تحتاج لتنشيط (راكدة)' : 'Cold Products with Low Engagement']);
      prodRows.push([ar ? 'اسم المنتج' : 'Product', ar ? 'الموديل' : 'Model', ar ? 'الفئة' : 'Category', ar ? 'المشاهدات' : 'Views', ar ? 'أيام منذ آخر مشاهدة' : 'Days Since View']);
      for (const c of data.products.cold) {
        prodRows.push([c.title, c.model, c.category, c.views, c.daysSinceView]);
      }
    }

    if (data.products.topSearches.length > 0) {
      prodRows.push([]);
      prodRows.push([ar ? 'أكثر عبارات البحث في المتجر' : 'Top Store Search Queries']);
      prodRows.push([ar ? 'عبارة البحث' : 'Search Query', ar ? 'عدد مرات البحث' : 'Search Count']);
      for (const s of data.products.topSearches) {
        prodRows.push([s.query, s.count]);
      }
    }

    const wsProd = XLSX.utils.aoa_to_sheet(prodRows);
    wsProd['!cols'] = [{ wch: 10 }, { wch: 38 }, { wch: 20 }, { wch: 20 }, { wch: 14 }, { wch: 14 }, { wch: 14 }];
    XLSX.utils.book_append_sheet(wb, wsProd, ar ? 'أداء المنتجات' : 'Products');
  }

  // ─────────────────────────────────────────────────────────────
  // 6. Sheet: Traffic Sources (مصادر الزيارات)
  // ─────────────────────────────────────────────────────────────
  if (data.sources) {
    const srcRows: (string | number)[][] = [
      [ar ? 'تقرير مصادر الزيارات للجمهور للفترة من:' : 'Traffic Sources from:', data.dateRange.from, ar ? 'إلى:' : 'to:', data.dateRange.to],
      [],
      [ar ? 'مصدر الزيارة' : 'Source', ar ? 'عدد الزوار' : 'Visitors', ar ? 'النسبة' : 'Percent'],
    ];

    for (const s of data.sources.sources) {
      srcRows.push([s.source, s.visitors, `${s.percent}%`]);
    }

    const wsSrc = XLSX.utils.aoa_to_sheet(srcRows);
    wsSrc['!cols'] = [{ wch: 30 }, { wch: 18 }, { wch: 18 }];
    XLSX.utils.book_append_sheet(wb, wsSrc, ar ? 'مصادر الزيارات' : 'Sources');
  }

  // Generate file name with date range
  const filename = `aljeel-visitor-intelligence-${data.dateRange.from}-to-${data.dateRange.to}.xlsx`;
  XLSX.writeFile(wb, filename);
}
