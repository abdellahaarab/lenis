import { createHmac } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import type { PrismaClient } from '@prisma/client';
import type { AppConfig } from './config.js';
import { can } from '@aljeel/shared';

// Re-use same visitor hash logic so live counts are consistent with event records
function todayVisitorHash(ip: string, config: AppConfig): string {
  const day = new Date().toISOString().slice(0, 10);
  return createHmac('sha256', config.SESSION_SECRET)
    .update(`visitor:${day}:${ip}`)
    .digest('hex');
}

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

function daysAgo(n: number): Date {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - n);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

export interface DateRange {
  from: Date;
  to: Date;
  prevFrom: Date;
  prevTo: Date;
  periodLabel: string;
}

export function resolveDateRange(query?: { period?: string; from?: string; to?: string }): DateRange {
  const now = new Date();
  const todayStart = startOfDay(now);
  const todayEnd = new Date(todayStart.getTime() + 86400000 - 1);

  let from: Date;
  let to: Date = todayEnd;
  let label = query?.period || (query?.from ? 'custom' : 'today');

  if (label === 'custom' && query?.from) {
    from = startOfDay(new Date(query.from));
    if (isNaN(from.getTime())) from = todayStart;
    if (query?.to) {
      const parsedTo = new Date(query.to);
      if (!isNaN(parsedTo.getTime())) {
        parsedTo.setUTCHours(23, 59, 59, 999);
        to = parsedTo;
      }
    }
    // safety check: from <= to
    if (from.getTime() > to.getTime()) {
      const temp = from;
      from = startOfDay(to);
      to = new Date(temp.getTime() + 86400000 - 1);
    }
  } else if (label === 'yesterday') {
    from = daysAgo(1);
    to = new Date(from.getTime() + 86400000 - 1);
  } else if (label === '7d') {
    from = daysAgo(7);
    to = todayEnd;
  } else if (label === '30d') {
    from = daysAgo(30);
    to = todayEnd;
  } else if (label === 'month') {
    from = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    to = todayEnd;
  } else if (label === 'last_month') {
    from = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
    to = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 0, 23, 59, 59, 999));
  } else {
    label = 'today';
    from = todayStart;
    to = todayEnd;
  }

  const durationMs = Math.max(86400000, to.getTime() - from.getTime());
  const prevTo = new Date(from.getTime() - 1);
  const prevFrom = new Date(prevTo.getTime() - durationMs + 1);

  return { from, to, prevFrom, prevTo, periodLabel: label };
}

export async function analyticsAdminRoutes(app: FastifyInstance, db: PrismaClient, config: AppConfig) {

  // ─────────────────────────────────────────────────────────────
  // GET /api/admin/analytics/overview
  // Supports ?period=today|yesterday|7d|30d|month|last_month|custom&from=YYYY-MM-DD&to=YYYY-MM-DD
  // ─────────────────────────────────────────────────────────────
  app.get('/analytics/overview', { config: { permission: 'analytics.read' as const } }, async (request) => {
    const query = request.query as { period?: string; from?: string; to?: string };
    const { from, to, prevFrom, prevTo, periodLabel } = resolveDateRange(query);

    // 1. Current period metrics
    const [currentViews, currentProductViews, currentWhatsappClicks, currentVisitors] = await Promise.all([
      db.analyticsEvent.count({ where: { type: 'page_view', createdAt: { gte: from, lte: to } } }),
      db.analyticsEvent.count({ where: { type: 'product_view', createdAt: { gte: from, lte: to } } }),
      db.analyticsEvent.count({ where: { type: 'whatsapp_click', createdAt: { gte: from, lte: to } } }),
      db.analyticsEvent.groupBy({
        by: ['visitorHash'],
        where: { createdAt: { gte: from, lte: to } },
        _count: true,
      }).then(r => r.length),
    ]);

    // 2. Previous period comparison & business conversions
    const [prevViews, prevVisitors, prevWhatsappClicks, prevOrders, newCustomers, newOrders, newLeads] = await Promise.all([
      db.analyticsEvent.count({ where: { type: 'page_view', createdAt: { gte: prevFrom, lte: prevTo } } }),
      db.analyticsEvent.groupBy({
        by: ['visitorHash'],
        where: { createdAt: { gte: prevFrom, lte: prevTo } },
        _count: true,
      }).then(r => r.length),
      db.analyticsEvent.count({ where: { type: 'whatsapp_click', createdAt: { gte: prevFrom, lte: prevTo } } }),
      db.commerceOrder.count({ where: { createdAt: { gte: prevFrom, lte: prevTo } } }),
      db.customerAccount.count({ where: { createdAt: { gte: from, lte: to } } }),
      db.commerceOrder.count({ where: { createdAt: { gte: from, lte: to } } }),
      db.lead.count({ where: { createdAt: { gte: from, lte: to } } }),
    ]);

    // 3. Trends and peak hours
    const [dailyViewsRaw, dailyVisitorsRaw, topHoursRaw] = await Promise.all([
      db.$queryRaw<{ day: string | Date; views: bigint }[]>`
        SELECT DATE(createdAt) as day, COUNT(*) as views
        FROM AnalyticsEvent
        WHERE type = 'page_view' AND createdAt >= ${from} AND createdAt <= ${to}
        GROUP BY DATE(createdAt)
        ORDER BY day ASC
      `,
      db.$queryRaw<{ day: string | Date; visitors: bigint }[]>`
        SELECT DATE(createdAt) as day, COUNT(DISTINCT visitorHash) as visitors
        FROM AnalyticsEvent
        WHERE createdAt >= ${from} AND createdAt <= ${to}
        GROUP BY DATE(createdAt)
        ORDER BY day ASC
      `,
      db.$queryRaw<{ hour: number; count: bigint }[]>`
        SELECT HOUR(createdAt) as hour, COUNT(*) as count
        FROM AnalyticsEvent
        WHERE type = 'page_view' AND createdAt >= ${from} AND createdAt <= ${to}
        GROUP BY HOUR(createdAt)
        ORDER BY hour ASC
      `,
    ]);

    const pageViewGrowth = prevViews > 0
      ? Math.round(((currentViews - prevViews) / prevViews) * 100)
      : null;
    const visitorGrowth = prevVisitors > 0
      ? Math.round(((currentVisitors - prevVisitors) / prevVisitors) * 100)
      : null;
    const orderGrowth = prevOrders > 0
      ? Math.round(((newOrders - prevOrders) / prevOrders) * 100)
      : null;
    const whatsappGrowth = prevWhatsappClicks > 0
      ? Math.round(((currentWhatsappClicks - prevWhatsappClicks) / prevWhatsappClicks) * 100)
      : null;

    const viewsMap = new Map<string, number>();
    for (const r of dailyViewsRaw) {
      const d = r.day instanceof Date ? r.day.toISOString().slice(0, 10) : String(r.day).slice(0, 10);
      viewsMap.set(d, Number(r.views));
    }
    const visitorsMap = new Map<string, number>();
    for (const r of dailyVisitorsRaw) {
      const d = r.day instanceof Date ? r.day.toISOString().slice(0, 10) : String(r.day).slice(0, 10);
      visitorsMap.set(d, Number(r.visitors));
    }

    const allDays = Array.from(new Set([...viewsMap.keys(), ...visitorsMap.keys()])).sort();
    const views7d = allDays.map(day => ({ day, views: viewsMap.get(day) ?? 0 }));
    const visitors7d = allDays.map(day => ({ day, visitors: visitorsMap.get(day) ?? 0 }));
    const topHours = topHoursRaw.map(r => ({ hour: Number(r.hour), count: Number(r.count) }));

    const timeSlots = [
      { id: 'dawn', labelAr: 'الفجر (12ص - 6ص)', labelEn: 'Dawn (12AM - 6AM)', count: 0 },
      { id: 'morning', labelAr: 'الصباح (6ص - 12ظ)', labelEn: 'Morning (6AM - 12PM)', count: 0 },
      { id: 'afternoon', labelAr: 'الظهيرة (12ظ - 5م)', labelEn: 'Afternoon (12PM - 5PM)', count: 0 },
      { id: 'evening', labelAr: 'المساء (5م - 9م)', labelEn: 'Evening (5PM - 9PM)', count: 0 },
      { id: 'night', labelAr: 'الليل (9م - 12ص)', labelEn: 'Night (9PM - 12AM)', count: 0 },
    ];
    let totalHourViews = 0;
    for (const h of topHours) {
      totalHourViews += h.count;
      if (h.hour >= 0 && h.hour < 6) timeSlots[0].count += h.count;
      else if (h.hour >= 6 && h.hour < 12) timeSlots[1].count += h.count;
      else if (h.hour >= 12 && h.hour < 17) timeSlots[2].count += h.count;
      else if (h.hour >= 17 && h.hour < 21) timeSlots[3].count += h.count;
      else timeSlots[4].count += h.count;
    }
    const peakSlot = timeSlots.reduce((prev, curr) => (curr.count > prev.count ? curr : prev), timeSlots[0]);

    const todayPayload = {
      pageViews: currentViews,
      uniqueVisitors: currentVisitors,
      productViews: currentProductViews,
      whatsappClicks: currentWhatsappClicks,
      newCustomers,
      newOrders,
      newLeads,
      pageViewGrowth,
      visitorGrowth,
      orderGrowth,
      whatsappGrowth,
    };

    return {
      today: todayPayload,
      current: todayPayload,
      trend: {
        views7d,
        visitors7d,
        topHours,
        timeSlots: timeSlots.map(s => ({
          ...s,
          percent: totalHourViews > 0 ? Math.round((s.count / totalHourViews) * 100) : 0,
        })),
        peakSlot: {
          ...peakSlot,
          percent: totalHourViews > 0 ? Math.round((peakSlot.count / totalHourViews) * 100) : 0,
        },
      },
      dateRange: {
        from: from.toISOString().slice(0, 10),
        to: to.toISOString().slice(0, 10),
        period: periodLabel,
      },
    };
  });

  // ─────────────────────────────────────────────────────────────
  // GET /api/admin/analytics/locations
  // Geographic Location breakdown (Countries and Cities)
  // ─────────────────────────────────────────────────────────────
  app.get('/analytics/locations', { config: { permission: 'analytics.read' as const } }, async (request) => {
    const query = request.query as { period?: string; from?: string; to?: string };
    const { from, to, periodLabel } = resolveDateRange(query);

    const [rawCountries, rawCities, totalVisitors] = await Promise.all([
      db.$queryRaw<{ country: string | null; countryCode: string | null; flag: string | null; visitors: bigint }[]>`
        SELECT 
          COALESCE(JSON_UNQUOTE(JSON_EXTRACT(utm, '$.geo.country')), 'اليمن') as country,
          COALESCE(JSON_UNQUOTE(JSON_EXTRACT(utm, '$.geo.countryCode')), 'YE') as countryCode,
          COALESCE(JSON_UNQUOTE(JSON_EXTRACT(utm, '$.geo.flag')), '🇾🇪') as flag,
          COUNT(DISTINCT visitorHash) as visitors
        FROM AnalyticsEvent
        WHERE createdAt >= ${from} AND createdAt <= ${to}
        GROUP BY country, countryCode, flag
        ORDER BY visitors DESC
        LIMIT 20
      `,
      db.$queryRaw<{ city: string | null; country: string | null; visitors: bigint }[]>`
        SELECT 
          COALESCE(JSON_UNQUOTE(JSON_EXTRACT(utm, '$.geo.city')), 'صنعاء') as city,
          COALESCE(JSON_UNQUOTE(JSON_EXTRACT(utm, '$.geo.country')), 'اليمن') as country,
          COUNT(DISTINCT visitorHash) as visitors
        FROM AnalyticsEvent
        WHERE createdAt >= ${from} AND createdAt <= ${to}
        GROUP BY city, country
        ORDER BY visitors DESC
        LIMIT 25
      `,
      db.analyticsEvent.groupBy({
        by: ['visitorHash'],
        where: { createdAt: { gte: from, lte: to } },
        _count: true,
      }).then(r => r.length),
    ]);

    const total = Math.max(totalVisitors, 1);

    const countries = rawCountries.map(r => {
      const v = Number(r.visitors);
      return {
        country: r.country || 'اليمن',
        countryCode: r.countryCode || 'YE',
        flag: r.flag || '🇾🇪',
        visitors: v,
        percent: Math.round((v / total) * 1000) / 10,
      };
    });

    const cities = rawCities.map(r => {
      const v = Number(r.visitors);
      return {
        city: r.city || 'صنعاء',
        country: r.country || 'اليمن',
        visitors: v,
        percent: Math.round((v / total) * 1000) / 10,
      };
    });

    return {
      countries,
      cities,
      totalVisitors,
      dateRange: {
        from: from.toISOString().slice(0, 10),
        to: to.toISOString().slice(0, 10),
        period: periodLabel,
      },
    };
  });

  // ─────────────────────────────────────────────────────────────
  // GET /api/admin/analytics/devices
  // Unique devices, OS, Browsers, Brands, Screens breakdown
  // ─────────────────────────────────────────────────────────────
  app.get('/analytics/devices', { config: { permission: 'analytics.read' as const } }, async (request) => {
    const query = request.query as { period?: string; from?: string; to?: string };
    const { from, to, periodLabel } = resolveDateRange(query);

    const [rawClasses, rawOS, rawBrowsers, rawBrands, rawScreens, totalVisitors] = await Promise.all([
      db.$queryRaw<{ deviceClass: string; visitors: bigint }[]>`
        SELECT deviceClass, COUNT(DISTINCT visitorHash) as visitors
        FROM AnalyticsEvent
        WHERE createdAt >= ${from} AND createdAt <= ${to}
        GROUP BY deviceClass
      `,
      db.$queryRaw<{ os: string | null; visitors: bigint }[]>`
        SELECT 
          COALESCE(JSON_UNQUOTE(JSON_EXTRACT(utm, '$.device.os')), 
            CASE 
              WHEN deviceClass = 'mobile' THEN 'Android / iOS' 
              WHEN deviceClass = 'desktop' THEN 'Windows / macOS' 
              ELSE 'Tablet OS' 
            END
          ) as os,
          COUNT(DISTINCT visitorHash) as visitors
        FROM AnalyticsEvent
        WHERE createdAt >= ${from} AND createdAt <= ${to}
        GROUP BY os
        ORDER BY visitors DESC
        LIMIT 10
      `,
      db.$queryRaw<{ browser: string | null; visitors: bigint }[]>`
        SELECT 
          COALESCE(JSON_UNQUOTE(JSON_EXTRACT(utm, '$.device.browser')), 
            CASE 
              WHEN deviceClass = 'mobile' THEN 'Mobile Browser' 
              ELSE 'Desktop Browser' 
            END
          ) as browser,
          COUNT(DISTINCT visitorHash) as visitors
        FROM AnalyticsEvent
        WHERE createdAt >= ${from} AND createdAt <= ${to}
        GROUP BY browser
        ORDER BY visitors DESC
        LIMIT 10
      `,
      db.$queryRaw<{ brand: string | null; visitors: bigint }[]>`
        SELECT 
          COALESCE(JSON_UNQUOTE(JSON_EXTRACT(utm, '$.device.brand')), 
            CASE 
              WHEN deviceClass = 'mobile' THEN 'Mobile Phone' 
              ELSE 'Desktop Computer' 
            END
          ) as brand,
          COUNT(DISTINCT visitorHash) as visitors
        FROM AnalyticsEvent
        WHERE createdAt >= ${from} AND createdAt <= ${to}
        GROUP BY brand
        ORDER BY visitors DESC
        LIMIT 10
      `,
      db.$queryRaw<{ screen: string | null; count: bigint }[]>`
        SELECT 
          JSON_UNQUOTE(JSON_EXTRACT(utm, '$.device.screen')) as screen,
          COUNT(DISTINCT visitorHash) as count
        FROM AnalyticsEvent
        WHERE createdAt >= ${from} AND createdAt <= ${to} AND JSON_EXTRACT(utm, '$.device.screen') IS NOT NULL
        GROUP BY screen
        ORDER BY count DESC
        LIMIT 8
      `,
      db.analyticsEvent.groupBy({
        by: ['visitorHash'],
        where: { createdAt: { gte: from, lte: to } },
        _count: true,
      }).then(r => r.length),
    ]);

    const total = Math.max(totalVisitors, 1);

    const classes: Record<string, number> = { mobile: 0, tablet: 0, desktop: 0 };
    for (const r of rawClasses) {
      classes[r.deviceClass] = Number(r.visitors);
    }

    const classesPercent = {
      mobile: Math.round(((classes.mobile || 0) / total) * 100),
      tablet: Math.round(((classes.tablet || 0) / total) * 100),
      desktop: Math.round(((classes.desktop || 0) / total) * 100),
    };

    const osList = rawOS.map(r => {
      const v = Number(r.visitors);
      return {
        name: r.os || 'Unknown OS',
        count: v,
        percent: Math.round((v / total) * 1000) / 10,
      };
    });

    const browsersList = rawBrowsers.map(r => {
      const v = Number(r.visitors);
      return {
        name: r.browser || 'Unknown Browser',
        count: v,
        percent: Math.round((v / total) * 1000) / 10,
      };
    });

    const brandsList = rawBrands.map(r => {
      const v = Number(r.visitors);
      return {
        name: r.brand || 'Unknown Device',
        count: v,
        percent: Math.round((v / total) * 1000) / 10,
      };
    });

    const screensList = rawScreens
      .filter(r => r.screen && r.screen !== 'null')
      .map(r => ({
        resolution: r.screen!,
        count: Number(r.count),
      }));

    return {
      totalDevices: totalVisitors,
      classes,
      classesPercent,
      osList,
      browsersList,
      brandsList,
      screensList,
      dateRange: {
        from: from.toISOString().slice(0, 10),
        to: to.toISOString().slice(0, 10),
        period: periodLabel,
      },
    };
  });

  // ─────────────────────────────────────────────────────────────
  // GET /api/admin/analytics/visitors
  // List of visitors with engagement metrics and products viewed
  // ─────────────────────────────────────────────────────────────
  app.get('/analytics/visitors', { config: { permission: 'analytics.read' as const } }, async (request) => {
    const query = request.query as {
      period?: string;
      from?: string;
      to?: string;
      page?: string;
      pageSize?: string;
      hasProductsOnly?: string;
      hasWhatsappOnly?: string;
      deviceClass?: string;
    };
    const { from, to, periodLabel } = resolveDateRange(query);
    const page = Math.max(1, parseInt(query.page || '1', 10));
    const pageSize = Math.min(50, Math.max(5, parseInt(query.pageSize || '20', 10)));
    const offset = (page - 1) * pageSize;

    // Fetch visitor aggregations
    const rawVisitors = await db.$queryRaw<Array<{
      visitorHash: string;
      totalEvents: bigint;
      sessionsCount: bigint;
      pageViewsCount: bigint;
      productViewsCount: bigint;
      distinctProductsCount: bigint;
      whatsappClicksCount: bigint;
      firstSeen: Date | string;
      lastSeen: Date | string;
      deviceClass: string;
      country: string | null;
      city: string | null;
      flag: string | null;
      os: string | null;
      browser: string | null;
      brand: string | null;
    }>>`
      SELECT 
        visitorHash,
        COUNT(*) as totalEvents,
        COUNT(DISTINCT sessionHash) as sessionsCount,
        SUM(CASE WHEN type = 'page_view' THEN 1 ELSE 0 END) as pageViewsCount,
        SUM(CASE WHEN type = 'product_view' THEN 1 ELSE 0 END) as productViewsCount,
        COUNT(DISTINCT CASE WHEN type = 'product_view' THEN productId ELSE NULL END) as distinctProductsCount,
        SUM(CASE WHEN type = 'whatsapp_click' THEN 1 ELSE 0 END) as whatsappClicksCount,
        MIN(createdAt) as firstSeen,
        MAX(createdAt) as lastSeen,
        MAX(deviceClass) as deviceClass,
        MAX(COALESCE(JSON_UNQUOTE(JSON_EXTRACT(utm, '$.geo.country')), 'اليمن')) as country,
        MAX(COALESCE(JSON_UNQUOTE(JSON_EXTRACT(utm, '$.geo.city')), 'صنعاء')) as city,
        MAX(COALESCE(JSON_UNQUOTE(JSON_EXTRACT(utm, '$.geo.flag')), '🇾🇪')) as flag,
        MAX(COALESCE(JSON_UNQUOTE(JSON_EXTRACT(utm, '$.device.os')), 
          CASE WHEN MAX(deviceClass) = 'mobile' THEN 'Android / iOS' ELSE 'Windows / Mac' END)) as os,
        MAX(COALESCE(JSON_UNQUOTE(JSON_EXTRACT(utm, '$.device.browser')), 
          CASE WHEN MAX(deviceClass) = 'mobile' THEN 'Mobile Browser' ELSE 'Web Browser' END)) as browser,
        MAX(COALESCE(JSON_UNQUOTE(JSON_EXTRACT(utm, '$.device.brand')), 'جهاز متصفح')) as brand
      FROM AnalyticsEvent
      WHERE createdAt >= ${from} AND createdAt <= ${to}
      GROUP BY visitorHash
      HAVING 1=1
        ${query.hasProductsOnly === 'true' ? db.$queryRaw`AND productViewsCount > 0` : db.$queryRaw``}
        ${query.hasWhatsappOnly === 'true' ? db.$queryRaw`AND whatsappClicksCount > 0` : db.$queryRaw``}
      ORDER BY lastSeen DESC
      LIMIT ${pageSize} OFFSET ${offset}
    `;

    // Total distinct visitors in range
    const totalCount = await db.analyticsEvent.groupBy({
      by: ['visitorHash'],
      where: {
        createdAt: { gte: from, lte: to },
        ...(query.hasProductsOnly === 'true' ? { type: 'product_view' } : {}),
        ...(query.hasWhatsappOnly === 'true' ? { type: 'whatsapp_click' } : {}),
      },
      _count: true,
    }).then(r => r.length);

    // Get top viewed products preview for visitors on this page
    const visitorHashes = rawVisitors.map(v => v.visitorHash);
    let productPreviewsMap = new Map<string, Array<{ productId: string; title: unknown; image: string | null }>>();

    if (visitorHashes.length > 0) {
      const topProductsForVisitors = await db.$queryRaw<Array<{
        visitorHash: string;
        productId: string;
        views: bigint;
      }>>`
        SELECT visitorHash, productId, COUNT(*) as views
        FROM AnalyticsEvent
        WHERE visitorHash IN (${db.$queryRaw`${visitorHashes.join("','")}`})
          AND type = 'product_view' AND productId IS NOT NULL
        GROUP BY visitorHash, productId
        ORDER BY views DESC
      `;

      const allProductIds = Array.from(new Set(topProductsForVisitors.map(p => p.productId)));
      if (allProductIds.length > 0) {
        const productsList = await db.product.findMany({
          where: { id: { in: allProductIds }, deletedAt: null },
          select: {
            id: true,
            title: true,
            model: true,
            images: { take: 1, include: { media: { select: { originalPath: true } } } },
          },
        });
        const prodDetailsMap = new Map(productsList.map(p => [p.id, p]));

        for (const item of topProductsForVisitors) {
          const prod = prodDetailsMap.get(item.productId);
          if (!prod) continue;
          const list = productPreviewsMap.get(item.visitorHash) || [];
          if (list.length < 3) {
            list.push({
              productId: prod.id,
              title: prod.title,
              image: prod.images[0]?.media?.originalPath || null,
            });
            productPreviewsMap.set(item.visitorHash, list);
          }
        }
      }
    }

    const visitors = rawVisitors.map((v, index) => ({
      index: offset + index + 1,
      visitorHash: v.visitorHash,
      tag: `زائر #${v.visitorHash.slice(0, 6)}`,
      totalEvents: Number(v.totalEvents),
      sessionsCount: Number(v.sessionsCount),
      pageViewsCount: Number(v.pageViewsCount),
      productViewsCount: Number(v.productViewsCount),
      distinctProductsCount: Number(v.distinctProductsCount),
      whatsappClicksCount: Number(v.whatsappClicksCount),
      firstSeen: v.firstSeen instanceof Date ? v.firstSeen.toISOString() : String(v.firstSeen),
      lastSeen: v.lastSeen instanceof Date ? v.lastSeen.toISOString() : String(v.lastSeen),
      location: {
        country: v.country || 'اليمن',
        city: v.city || 'صنعاء',
        flag: v.flag || '🇾🇪',
      },
      device: {
        deviceClass: v.deviceClass as 'mobile' | 'tablet' | 'desktop',
        os: v.os || 'Unknown OS',
        browser: v.browser || 'Unknown Browser',
        brand: v.brand || 'Device',
      },
      topProducts: productPreviewsMap.get(v.visitorHash) || [],
    }));

    return {
      visitors,
      pagination: {
        total: totalCount,
        page,
        pageSize,
        totalPages: Math.ceil(totalCount / pageSize),
      },
      dateRange: {
        from: from.toISOString().slice(0, 10),
        to: to.toISOString().slice(0, 10),
        period: periodLabel,
      },
    };
  });

  // ─────────────────────────────────────────────────────────────
  // GET /api/admin/analytics/visitors/:visitorHash
  // Full Visitor Profile & Chronological Activity Journey
  // ─────────────────────────────────────────────────────────────
  app.get('/analytics/visitors/:visitorHash', { config: { permission: 'analytics.read' as const } }, async (request, reply) => {
    const { visitorHash } = request.params as { visitorHash: string };

    const events = await db.analyticsEvent.findMany({
      where: { visitorHash },
      orderBy: { createdAt: 'asc' },
      take: 200,
      include: {
        product: {
          select: {
            id: true,
            title: true,
            model: true,
            category: true,
            status: true,
            images: { take: 1, include: { media: { select: { originalPath: true } } } },
          },
        },
      },
    });

    if (!events.length) {
      return reply.code(404).send({ error: { code: 'visitor_not_found' } });
    }

    const firstEvent = events[0];
    const lastEvent = events[events.length - 1];

    const uniqueSessions = new Set(events.map(e => e.sessionHash)).size;
    const pageViewsCount = events.filter(e => e.type === 'page_view').length;
    const whatsappClicksCount = events.filter(e => e.type === 'whatsapp_click').length;

    // Distinct products inspected by this visitor
    const productViewsMap = new Map<string, { product: typeof events[0]['product']; count: number; lastViewed: Date }>();
    for (const e of events) {
      if (e.type === 'product_view' && e.productId && e.product) {
        const existing = productViewsMap.get(e.productId);
        if (existing) {
          existing.count += 1;
          existing.lastViewed = e.createdAt;
        } else {
          productViewsMap.set(e.productId, {
            product: e.product,
            count: 1,
            lastViewed: e.createdAt,
          });
        }
      }
    }

    const productsInspected = Array.from(productViewsMap.values())
      .sort((a, b) => b.count - a.count)
      .map(item => ({
        productId: item.product!.id,
        title: item.product!.title,
        model: item.product!.model,
        category: item.product!.category,
        image: item.product!.images[0]?.media?.originalPath || null,
        viewsCount: item.count,
        lastSeen: item.lastViewed.toISOString(),
      }));

    // Extract geo and device from most recent event that has it
    let geo = { country: 'اليمن', city: 'صنعاء', flag: '🇾🇪' };
    let device = {
      deviceClass: lastEvent.deviceClass,
      os: lastEvent.deviceClass === 'mobile' ? 'Android / iOS' : 'Windows / macOS',
      browser: 'Web Browser',
      brand: 'Device',
      screen: '',
    };

    for (let i = events.length - 1; i >= 0; i--) {
      const u = events[i].utm as any;
      if (u?.geo) {
        geo = {
          country: u.geo.country || geo.country,
          city: u.geo.city || geo.city,
          flag: u.geo.flag || geo.flag,
        };
      }
      if (u?.device) {
        device = {
          deviceClass: u.device.class || device.deviceClass,
          os: u.device.os || device.os,
          browser: u.device.browser || device.browser,
          brand: u.device.brand || device.brand,
          screen: u.device.screen || '',
        };
        break;
      }
    }

    // Chronological Activity Timeline
    const journey = events.map(e => {
      const u = e.utm as any;
      return {
        id: e.id,
        type: e.type,
        path: e.path,
        productId: e.productId,
        productTitle: e.product ? e.product.title : null,
        productModel: e.product ? e.product.model : null,
        productImage: e.product?.images[0]?.media?.originalPath || null,
        searchQuery: u?.query || (e.type === 'search' ? u?.term : null),
        deviceClass: e.deviceClass,
        lang: e.lang,
        createdAt: e.createdAt.toISOString(),
      };
    });

    return {
      visitor: {
        visitorHash,
        tag: `زائر #${visitorHash.slice(0, 6)}`,
        sessionsCount: uniqueSessions,
        totalEvents: events.length,
        pageViewsCount,
        productViewsCount: events.filter(e => e.type === 'product_view').length,
        distinctProductsCount: productsInspected.length,
        whatsappClicksCount,
        firstSeen: firstEvent.createdAt.toISOString(),
        lastSeen: lastEvent.createdAt.toISOString(),
        location: geo,
        device,
      },
      productsInspected,
      journey,
    };
  });

  // ─────────────────────────────────────────────────────────────
  // GET /api/admin/analytics/products
  // Top/cold products by views and inquiry clicks in date range
  // ─────────────────────────────────────────────────────────────
  app.get('/analytics/products', { config: { permission: 'analytics.read' as const } }, async (request) => {
    const query = request.query as { period?: string; from?: string; to?: string };
    const { from, to, periodLabel } = resolveDateRange(query);

    const [rawViews, rawWhatsapp, rawSearch] = await Promise.all([
      db.$queryRaw<{ productId: string; views: bigint; lastSeen: Date }[]>`
        SELECT productId, COUNT(*) as views, MAX(createdAt) as lastSeen
        FROM AnalyticsEvent
        WHERE type = 'product_view' AND productId IS NOT NULL AND createdAt >= ${from} AND createdAt <= ${to}
        GROUP BY productId
        ORDER BY views DESC
        LIMIT 50
      `,
      db.$queryRaw<{ productId: string; clicks: bigint }[]>`
        SELECT productId, COUNT(*) as clicks
        FROM AnalyticsEvent
        WHERE type = 'whatsapp_click' AND productId IS NOT NULL AND createdAt >= ${from} AND createdAt <= ${to}
        GROUP BY productId
        ORDER BY clicks DESC
        LIMIT 50
      `,
      db.$queryRaw<{ query: string; count: bigint }[]>`
        SELECT JSON_UNQUOTE(JSON_EXTRACT(utm, '$.query')) as query, COUNT(*) as count
        FROM AnalyticsEvent
        WHERE type = 'search' AND utm IS NOT NULL AND createdAt >= ${from} AND createdAt <= ${to}
        GROUP BY query
        HAVING query IS NOT NULL
        ORDER BY count DESC
        LIMIT 20
      `,
    ]);

    const clickMap = new Map(rawWhatsapp.map(r => [r.productId, Number(r.clicks)]));
    const topProductIds = rawViews.slice(0, 30).map(r => r.productId).filter(Boolean) as string[];
    const coldProductIds = rawViews.slice(0, 50)
      .filter(r => r.productId && (clickMap.get(r.productId) ?? 0) === 0)
      .slice(0, 15)
      .map(r => r.productId) as string[];

    const [topProducts, coldProducts] = await Promise.all([
      topProductIds.length > 0
        ? db.product.findMany({
          where: { id: { in: topProductIds }, deletedAt: null },
          select: { id: true, title: true, model: true, category: true, images: { take: 1, include: { media: { select: { originalPath: true } } } } },
        })
        : Promise.resolve([]),
      coldProductIds.length > 0
        ? db.product.findMany({
          where: { id: { in: coldProductIds }, deletedAt: null },
          select: { id: true, title: true, model: true, category: true },
        })
        : Promise.resolve([]),
    ]);

    const productMap = new Map(topProducts.map(p => [p.id, p]));
    const coldProductMap = new Map(coldProducts.map(p => [p.id, p]));

    const topViewed = rawViews.slice(0, 30)
      .filter(r => r.productId && productMap.has(r.productId))
      .map(r => {
        const p = productMap.get(r.productId!)!;
        const views = Number(r.views);
        const clicks = clickMap.get(r.productId!) ?? 0;
        return {
          productId: r.productId,
          title: p.title,
          model: p.model,
          category: p.category,
          image: p.images[0]?.media?.originalPath ?? null,
          views,
          whatsappClicks: clicks,
          conversionRate: views > 0 ? Math.round((clicks / views) * 1000) / 10 : 0,
          lastSeen: r.lastSeen,
        };
      });

    const topByClicks = rawWhatsapp.slice(0, 15)
      .filter(r => r.productId)
      .map(r => ({
        productId: r.productId,
        clicks: Number(r.clicks),
        product: productMap.get(r.productId) ?? null,
      }));

    const cold = rawViews
      .filter(r => r.productId && coldProductMap.has(r.productId))
      .slice(0, 15)
      .map(r => {
        const p = coldProductMap.get(r.productId!)!;
        const daysSince = Math.floor((Date.now() - new Date(r.lastSeen).getTime()) / 86400000);
        return {
          productId: r.productId,
          title: p.title,
          model: p.model,
          category: p.category,
          views: Number(r.views),
          daysSinceView: daysSince,
        };
      });

    const topSearches = rawSearch
      .filter(r => r.query && r.query !== 'null')
      .map(r => ({ query: r.query, count: Number(r.count) }));

    return {
      topViewed,
      topByClicks,
      cold,
      topSearches,
      dateRange: {
        from: from.toISOString().slice(0, 10),
        to: to.toISOString().slice(0, 10),
        period: periodLabel,
      },
    };
  });

  // ─────────────────────────────────────────────────────────────
  // GET /api/admin/analytics/sources
  // Traffic sources & audience in date range
  // ─────────────────────────────────────────────────────────────
  app.get('/analytics/sources', { config: { permission: 'analytics.read' as const } }, async (request) => {
    const query = request.query as { period?: string; from?: string; to?: string };
    const { from, to, periodLabel } = resolveDateRange(query);

    const [rawSources, rawDevices, rawLangs, rawCategories] = await Promise.all([
      db.$queryRaw<{ source: string | null; visitors: bigint }[]>`
        SELECT COALESCE(referrerHost, 'direct') as source, COUNT(DISTINCT visitorHash) as visitors
        FROM AnalyticsEvent
        WHERE createdAt >= ${from} AND createdAt <= ${to}
        GROUP BY referrerHost
        ORDER BY visitors DESC
        LIMIT 15
      `,
      db.$queryRaw<{ device: string; count: bigint }[]>`
        SELECT deviceClass as device, COUNT(DISTINCT visitorHash) as count
        FROM AnalyticsEvent
        WHERE createdAt >= ${from} AND createdAt <= ${to}
        GROUP BY deviceClass
      `,
      db.$queryRaw<{ lang: string; count: bigint }[]>`
        SELECT lang, COUNT(DISTINCT visitorHash) as count
        FROM AnalyticsEvent
        WHERE createdAt >= ${from} AND createdAt <= ${to}
        GROUP BY lang
      `,
      db.$queryRaw<{ category: string; views: bigint }[]>`
        SELECT p.category, COUNT(*) as views
        FROM AnalyticsEvent ae
        JOIN Product p ON ae.productId = p.id
        WHERE ae.type = 'product_view' AND ae.createdAt >= ${from} AND ae.createdAt <= ${to}
        GROUP BY p.category
        ORDER BY views DESC
      `,
    ]);

    const totalVisitors = rawSources.reduce((sum, r) => sum + Number(r.visitors), 0);
    const sources = rawSources.map(r => ({
      source: r.source ?? 'direct',
      visitors: Number(r.visitors),
      percent: totalVisitors > 0 ? Math.round((Number(r.visitors) / totalVisitors) * 1000) / 10 : 0,
    }));

    const devices: Record<string, number> = {};
    for (const r of rawDevices) devices[r.device] = Number(r.count);

    const langs: Record<string, number> = {};
    for (const r of rawLangs) langs[r.lang] = Number(r.count);

    return {
      sources,
      devices: {
        mobile: devices['mobile'] ?? 0,
        tablet: devices['tablet'] ?? 0,
        desktop: devices['desktop'] ?? 0,
      },
      langs: {
        ar: langs['ar'] ?? 0,
        en: langs['en'] ?? 0,
      },
      topCategories: rawCategories.map(r => ({ category: r.category, views: Number(r.views) })),
      dateRange: {
        from: from.toISOString().slice(0, 10),
        to: to.toISOString().slice(0, 10),
        period: periodLabel,
      },
    };
  });

  // ─────────────────────────────────────────────────────────────
  // GET /api/admin/analytics/sales
  // Comprehensive Sales, Revenue, and Conversion Funnel Report
  // ─────────────────────────────────────────────────────────────
  app.get('/analytics/sales', { config: { permission: 'analytics.read' as const } }, async (request) => {
    const query = request.query as { period?: string; from?: string; to?: string };
    const { from, to, prevFrom, prevTo, periodLabel } = resolveDateRange(query);

    const [currentOrders, prevOrders, uniqueVisitors, productViews, whatsappClicks] = await Promise.all([
      db.commerceOrder.findMany({
        where: { createdAt: { gte: from, lte: to } },
        select: {
          id: true,
          number: true,
          status: true,
          currency: true,
          totalUsd: true,
          totalYer: true,
          subtotalUsd: true,
          discountUsd: true,
          items: true,
          createdAt: true,
        },
      }),
      db.commerceOrder.findMany({
        where: { createdAt: { gte: prevFrom, lte: prevTo } },
        select: {
          totalUsd: true,
        },
      }),
      db.analyticsEvent.groupBy({
        by: ['visitorHash'],
        where: { createdAt: { gte: from, lte: to } },
        _count: true,
      }).then(r => r.length),
      db.analyticsEvent.count({ where: { type: 'product_view', createdAt: { gte: from, lte: to } } }),
      db.analyticsEvent.count({ where: { type: 'whatsapp_click', createdAt: { gte: from, lte: to } } }),
    ]);

    let totalRevenueUsd = 0;
    let totalRevenueYer = 0;
    let totalDiscountUsd = 0;
    const statusCounts: Record<string, number> = {
      new: 0,
      processing: 0,
      completed: 0,
      cancelled: 0,
    };

    const productSalesMap = new Map<string, { productId: string; title: unknown; quantity: number; revenueUsd: number }>();

    for (const order of currentOrders) {
      statusCounts[order.status] = (statusCounts[order.status] ?? 0) + 1;
      if (order.status !== 'cancelled') {
        const orderUsd = Number(order.totalUsd) || 0;
        const orderYer = Number(order.totalYer) || 0;
        totalRevenueUsd += orderUsd;
        totalRevenueYer += orderYer;
        totalDiscountUsd += Number(order.discountUsd) || 0;

        if (Array.isArray(order.items)) {
          for (const it of order.items as Array<Record<string, unknown>>) {
            const pid = String(it.productId || it.variantId || 'unknown');
            const qty = Number(it.quantity) || 1;
            const rev = Number(it.linePriceUsd) || (Number(it.unitPriceUsd) || 0) * qty;
            const existing = productSalesMap.get(pid);
            if (existing) {
              existing.quantity += qty;
              existing.revenueUsd += rev;
            } else {
              productSalesMap.set(pid, {
                productId: pid,
                title: it.title,
                quantity: qty,
                revenueUsd: rev,
              });
            }
          }
        }
      }
    }

    const prevRevenueUsd = prevOrders.reduce((sum, o) => sum + (Number(o.totalUsd) || 0), 0);
    const revenueGrowth = prevRevenueUsd > 0
      ? Math.round(((totalRevenueUsd - prevRevenueUsd) / prevRevenueUsd) * 100)
      : null;
    const orderGrowth = prevOrders.length > 0
      ? Math.round(((currentOrders.length - prevOrders.length) / prevOrders.length) * 100)
      : null;

    const validOrderCount = currentOrders.filter(o => o.status !== 'cancelled').length;
    const averageOrderValueUsd = validOrderCount > 0 ? Math.round((totalRevenueUsd / validOrderCount) * 100) / 100 : 0;

    const topSoldProducts = Array.from(productSalesMap.values())
      .sort((a, b) => b.revenueUsd - a.revenueUsd)
      .slice(0, 10);

    const totalEngagements = whatsappClicks + currentOrders.length;
    const funnel = {
      visitors: uniqueVisitors,
      productViews,
      inquiriesAndCarts: totalEngagements,
      ordersPlaced: currentOrders.length,
      ordersCompleted: statusCounts.completed ?? 0,
      visitorToInquiryRate: uniqueVisitors > 0 ? Math.round((totalEngagements / uniqueVisitors) * 1000) / 10 : 0,
      inquiryToOrderRate: totalEngagements > 0 ? Math.round((currentOrders.length / totalEngagements) * 1000) / 10 : 0,
      orderCompletionRate: currentOrders.length > 0 ? Math.round(((statusCounts.completed ?? 0) / currentOrders.length) * 1000) / 10 : 0,
    };

    return {
      summary: {
        totalRevenueUsd: Math.round(totalRevenueUsd * 100) / 100,
        totalRevenueYer: Math.round(totalRevenueYer),
        totalDiscountUsd: Math.round(totalDiscountUsd * 100) / 100,
        totalOrders: currentOrders.length,
        completedOrders: statusCounts.completed ?? 0,
        processingOrders: statusCounts.processing ?? 0,
        newOrders: statusCounts.new ?? 0,
        cancelledOrders: statusCounts.cancelled ?? 0,
        averageOrderValueUsd,
        revenueGrowth,
        orderGrowth,
      },
      statusCounts,
      topSoldProducts,
      funnel,
      dateRange: {
        from: from.toISOString().slice(0, 10),
        to: to.toISOString().slice(0, 10),
        period: periodLabel,
      },
    };
  });

  // ─────────────────────────────────────────────────────────────
  // GET /api/admin/analytics/live
  // Active visitors in last 5 minutes (Real-time)
  // ─────────────────────────────────────────────────────────────
  app.get('/analytics/live', { config: { permission: 'analytics.read' as const } }, async (request) => {
    const role = request.auth!.user.role;
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

    const [activeHashes, recentRaw] = await Promise.all([
      db.analyticsEvent.groupBy({
        by: ['visitorHash'],
        where: { createdAt: { gte: fiveMinutesAgo } },
        _count: true,
      }),
      db.analyticsEvent.findMany({
        where: { createdAt: { gte: fiveMinutesAgo } },
        orderBy: { createdAt: 'desc' },
        take: 20,
        select: {
          type: true,
          path: true,
          productId: true,
          deviceClass: true,
          lang: true,
          createdAt: true,
          ...(can(role, 'analytics.read') ? {
            product: { select: { title: true, model: true, category: true } }
          } : {}),
        },
      }),
    ]);

    const myHash = todayVisitorHash(request.ip, config);

    const pageCounts = new Map<string, number>();
    for (const e of recentRaw) {
      pageCounts.set(e.path, (pageCounts.get(e.path) ?? 0) + 1);
    }
    const hotPages = Array.from(pageCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([path, count]) => ({ path, count }));

    return {
      activeNow: activeHashes.length,
      isMe: activeHashes.some(h => h.visitorHash === myHash),
      hotPages,
      recentEvents: recentRaw.map(e => ({
        type: e.type,
        path: e.path,
        productId: e.productId,
        productTitle: e.product ? (e.product as { title: unknown; model: string }).title : null,
        productModel: e.product ? (e.product as { title: unknown; model: string }).model : null,
        deviceClass: e.deviceClass,
        lang: e.lang,
        createdAt: e.createdAt,
      })),
    };
  });

  // ─────────────────────────────────────────────────────────────
  // GET /api/admin/analytics/limited — for sales role
  // ─────────────────────────────────────────────────────────────
  app.get('/analytics/limited', { config: { permission: 'analytics.limited' as const } }, async (request) => {
    const query = request.query as { period?: string; from?: string; to?: string };
    const { from, to, periodLabel } = resolveDateRange(query);

    const [pageViews, uniqueVisitors, whatsappClicks, newLeads] = await Promise.all([
      db.analyticsEvent.count({ where: { type: 'page_view', createdAt: { gte: from, lte: to } } }),
      db.analyticsEvent.groupBy({ by: ['visitorHash'], where: { createdAt: { gte: from, lte: to } } }).then(r => r.length),
      db.analyticsEvent.count({ where: { type: 'whatsapp_click', createdAt: { gte: from, lte: to } } }),
      db.lead.count({ where: { createdAt: { gte: from, lte: to } } }),
    ]);

    return {
      pageViews,
      uniqueVisitors,
      whatsappClicks,
      newLeads,
      dateRange: {
        from: from.toISOString().slice(0, 10),
        to: to.toISOString().slice(0, 10),
        period: periodLabel,
      },
    };
  });
}
