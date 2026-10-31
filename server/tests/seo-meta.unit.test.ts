import { describe, it, expect } from 'vitest';
import {
  injectSeoMeta,
  YEMEN_GOVERNORATES,
  getYemenAreaServedSchema,
  createSellerSchema,
  createShippingDetailsSchema,
  createReturnPolicySchema,
  createBreadcrumbSchema,
  type PageMeta,
} from '../src/seo-meta.js';
import { generateSitemapXml } from '../src/sitemap.js';

describe('Yemen Local SEO and Google Search Meta Suite', () => {
  it('covers all 22 Yemeni governorates in areaServed schema', () => {
    const areaServed = getYemenAreaServedSchema();
    expect(areaServed.length).toBeGreaterThanOrEqual(22);

    const country = areaServed.find(item => item['@type'] === 'Country');
    expect(country?.name).toBe('Yemen');
    expect(country?.identifier).toBe('YE');

    const sanaa = areaServed.find(item => item.name?.includes('صنعاء'));
    const aden = areaServed.find(item => item.name?.includes('عدن'));
    const taiz = areaServed.find(item => item.name?.includes('تعز'));
    const hadhramaut = areaServed.find(item => item.name?.includes('حضرموت'));

    expect(sanaa).toBeDefined();
    expect(aden).toBeDefined();
    expect(taiz).toBeDefined();
    expect(hadhramaut).toBeDefined();
  });

  it('creates compliant electronics store seller schema with coordinates and Yemeni currencies', () => {
    const seller = createSellerSchema('https://aljeel-digital.com', true);
    expect(seller['@type']).toBe('ElectronicsStore');
    expect(seller.address.addressCountry).toBe('YE');
    expect(seller.address.addressLocality).toBe('صنعاء');
    expect(seller.geo.latitude).toBeCloseTo(15.3694, 2);
    expect(seller.geo.longitude).toBeCloseTo(44.1910, 2);
    expect(seller.currenciesAccepted).toContain('USD');
    expect(seller.currenciesAccepted).toContain('YER');
    expect(seller.areaServed.length).toBeGreaterThanOrEqual(22);
  });

  it('creates Yemen-specific shipping details schema', () => {
    const shipping = createShippingDetailsSchema();
    expect(shipping['@type']).toBe('OfferShippingDetails');
    expect(shipping.shippingDestination.addressCountry).toBe('YE');
    expect(shipping.deliveryTime['@type']).toBe('ShippingDeliveryTime');
  });

  it('creates valid merchant return policy schema', () => {
    const policy = createReturnPolicySchema();
    expect(policy['@type']).toBe('MerchantReturnPolicy');
    expect(policy.applicableCountry).toBe('YE');
    expect(policy.merchantReturnDays).toBe(7);
  });

  it('injects geo meta tags, canonical, hreflang, and JSON-LD structured data into HTML template', () => {
    const template = `<!doctype html><html><head><title>Old</title></head><body><div id="root"></div></body></html>`;
    const meta: PageMeta = {
      title: 'لابتوب HP Victus 15 في اليمن | الجيل العربي الرقمي صنعاء',
      description: 'لابتوب HP Victus 15 في اليمن بضمان وفحص معتمد وتوصيل لكافة المحافظات: صنعاء، عدن، تعز، حضرموت.',
      imageUrl: 'https://aljeel-digital.com/image.png',
      canonicalUrl: 'https://aljeel-digital.com/ar/shop/laptops/hp-victus-15',
      type: 'product',
      siteName: 'الجيل العربي الرقمي',
      locale: 'ar_YE',
      alternateUrls: {
        ar: 'https://aljeel-digital.com/ar/shop/laptops/hp-victus-15',
        en: 'https://aljeel-digital.com/en/shop/laptops/hp-victus-15',
      },
      keywords: ['لابتوبات في اليمن', 'لابتوب صنعاء', 'شراء لابتوب عدن'],
      structuredData: [
        {
          '@context': 'https://schema.org',
          '@type': 'Product',
          name: 'HP Victus 15 في اليمن',
        },
      ],
    };

    const rendered = injectSeoMeta(template, meta);

    expect(rendered).toContain('<title>لابتوب HP Victus 15 في اليمن | الجيل العربي الرقمي صنعاء</title>');
    expect(rendered).toContain('name="geo.region" content="YE"');
    expect(rendered).toContain('name="geo.placename" content="Sana\'a, Yemen"');
    expect(rendered).toContain('name="geo.position" content="15.3694;44.1910"');
    expect(rendered).toContain('hreflang="ar"');
    expect(rendered).toContain('hreflang="en"');
    expect(rendered).toContain('hreflang="x-default"');
    expect(rendered).toContain('<script type="application/ld+json">');
    expect(rendered).toContain('HP Victus 15 في اليمن');
  });

  it('generates compliant XML sitemap with hreflang alternates and priority', async () => {
    const mockDb: any = {
      catalogCategory: {
        findMany: async () => [
          { slug: 'laptops', updatedAt: new Date('2026-10-27T00:00:00Z') },
        ],
      },
      product: {
        findMany: async () => [
          { slug: 'hp-victus-15', category: 'laptops', updatedAt: new Date('2026-10-27T00:00:00Z') },
        ],
      },
      catalogCollection: {
        findMany: async () => [
          { slug: 'special-deal', updatedAt: new Date('2026-10-27T00:00:00Z') },
        ],
      },
    };

    const mockConfig: any = {
      ALLOWED_ORIGINS: ['https://aljeel-digital.com'],
    };

    const mockRequest: any = {
      headers: { host: 'aljeel-digital.com' },
      socket: { encrypted: true },
    };

    const xml = await generateSitemapXml(mockDb, mockConfig, mockRequest);

    expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(xml).toContain('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"');
    expect(xml).toContain('xmlns:xhtml="http://www.w3.org/1999/xhtml"');
    expect(xml).toContain('<loc>https://aljeel-digital.com/ar</loc>');
    expect(xml).toContain('<loc>https://aljeel-digital.com/ar/shop/laptops</loc>');
    expect(xml).toContain('<loc>https://aljeel-digital.com/ar/shop/laptops/hp-victus-15</loc>');
    expect(xml).toContain('hreflang="ar"');
    expect(xml).toContain('hreflang="en"');
    expect(xml).toContain('<priority>0.9</priority>');
  });
});
