import type { PrismaClient } from '@prisma/client';
import type { FastifyRequest } from 'fastify';
import type { AppConfig } from './config.js';
import { getBaseUrl } from './seo-meta.js';

interface SitemapUrl {
  pathAr: string;
  pathEn: string;
  lastmod?: string;
  changefreq: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
  priority: string;
}

export async function generateSitemapXml(
  db: PrismaClient,
  config: AppConfig,
  request: FastifyRequest
): Promise<string> {
  const baseUrl = getBaseUrl(request, config).replace(/\/+$/, '');
  const now = new Date().toISOString();

  const staticUrls: SitemapUrl[] = [
    { pathAr: '/ar', pathEn: '/en', changefreq: 'daily', priority: '1.0' },
    { pathAr: '/ar/shop', pathEn: '/en/shop', changefreq: 'daily', priority: '0.9' },
    { pathAr: '/ar/offers', pathEn: '/en/offers', changefreq: 'daily', priority: '0.8' },
    { pathAr: '/ar/bundles', pathEn: '/en/bundles', changefreq: 'weekly', priority: '0.8' },
    { pathAr: '/ar/business', pathEn: '/en/business', changefreq: 'weekly', priority: '0.8' },
    { pathAr: '/ar/warranty', pathEn: '/en/warranty', changefreq: 'monthly', priority: '0.7' },
    { pathAr: '/ar/warranty/condition-grades', pathEn: '/en/warranty/condition-grades', changefreq: 'monthly', priority: '0.6' },
    { pathAr: '/ar/warranty/inspection', pathEn: '/en/warranty/inspection', changefreq: 'monthly', priority: '0.6' },
    { pathAr: '/ar/warranty/policy', pathEn: '/en/warranty/policy', changefreq: 'monthly', priority: '0.6' },
    { pathAr: '/ar/faq', pathEn: '/en/faq', changefreq: 'weekly', priority: '0.7' },
    { pathAr: '/ar/about', pathEn: '/en/about', changefreq: 'monthly', priority: '0.6' },
    { pathAr: '/ar/contact', pathEn: '/en/contact', changefreq: 'monthly', priority: '0.6' },
  ];

  const dynamicUrls: SitemapUrl[] = [];

  try {
    // 1. Categories
    const categories = await db.catalogCategory.findMany({
      select: { slug: true, updatedAt: true },
    });
    for (const cat of categories) {
      dynamicUrls.push({
        pathAr: `/ar/shop/${cat.slug}`,
        pathEn: `/en/shop/${cat.slug}`,
        lastmod: cat.updatedAt?.toISOString() || now,
        changefreq: 'daily',
        priority: '0.8',
      });
    }

    // 2. Published Products
    const products = await db.product.findMany({
      where: { status: 'published' },
      select: { slug: true, category: true, updatedAt: true },
    });
    for (const prod of products) {
      dynamicUrls.push({
        pathAr: `/ar/shop/${prod.category}/${prod.slug}`,
        pathEn: `/en/shop/${prod.category}/${prod.slug}`,
        lastmod: prod.updatedAt?.toISOString() || now,
        changefreq: 'daily',
        priority: '0.9',
      });
    }

    // 3. Active Collections / Offers
    const collections = await db.catalogCollection.findMany({
      where: { published: true },
      select: { slug: true, updatedAt: true },
    });
    for (const col of collections) {
      dynamicUrls.push({
        pathAr: `/ar/offers/${col.slug}`,
        pathEn: `/en/offers/${col.slug}`,
        lastmod: col.updatedAt?.toISOString() || now,
        changefreq: 'weekly',
        priority: '0.8',
      });
    }
  } catch (err) {
    console.error('[Sitemap] Database lookup error:', err);
  }

  const allUrls = [...staticUrls, ...dynamicUrls];

  const urlEntries: string[] = [];

  for (const item of allUrls) {
    const locAr = `${baseUrl}${item.pathAr}`;
    const locEn = `${baseUrl}${item.pathEn}`;
    const lastmodTag = item.lastmod ? `\n    <lastmod>${item.lastmod}</lastmod>` : '';

    // Arabic Entry
    urlEntries.push(`  <url>
    <loc>${locAr}</loc>${lastmodTag}
    <changefreq>${item.changefreq}</changefreq>
    <priority>${item.priority}</priority>
    <xhtml:link rel="alternate" hreflang="ar" href="${locAr}" />
    <xhtml:link rel="alternate" hreflang="en" href="${locEn}" />
    <xhtml:link rel="alternate" hreflang="x-default" href="${locAr}" />
  </url>`);

    // English Entry
    urlEntries.push(`  <url>
    <loc>${locEn}</loc>${lastmodTag}
    <changefreq>${item.changefreq}</changefreq>
    <priority>${item.priority}</priority>
    <xhtml:link rel="alternate" hreflang="ar" href="${locAr}" />
    <xhtml:link rel="alternate" hreflang="en" href="${locEn}" />
    <xhtml:link rel="alternate" hreflang="x-default" href="${locAr}" />
  </url>`);
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urlEntries.join('\n')}
</urlset>`;
}
