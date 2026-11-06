import { test, expect } from '@playwright/test';

test.describe('Admin Amazon Image Import', () => {
  const user = {
    id: '00000000-0000-4000-8000-000000000001',
    email: 'admin@alarbi.test',
    name: 'المدير العام',
    role: 'owner',
    isActive: true,
    mustChangePassword: false,
    totpEnabled: false,
    lastLoginAt: null,
    createdAt: '2026-10-02T00:00:00.000Z'
  };

  const sampleProduct = {
    id: 'prod-hdd-1',
    slug: 'seagate-barracuda-1tb',
    category: 'storage',
    brand: 'Seagate',
    brandId: 'seagate',
    model: 'ST1000DM010',
    title: { ar: 'قرص صلب سيجيت باراكودا 1 تيرابايت', en: 'Seagate BarraCuda 1TB HDD' },
    summary: { ar: 'قرص صلب داخلي مكتبي', en: 'Internal Desktop Hard Drive' },
    condition: 'new',
    status: 'published',
    price: { usd: '45.00', yer: null, updatedAt: null, negotiable: false },
    stock: 'in_stock',
    specs: { capacity: '1TB', formFactor: '3.5"' },
    inspection: { passed: true, date: null, notes: { ar: '', en: '' } },
    images: ['/api/media/initial-img-1'],
    bestFor: [],
    tags: [],
    compatibleWith: [],
    specSources: ['https://www.amazon.com/dp/B07D99KFPK'],
    demo: false
  };

  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.addInitScript(() => localStorage.setItem('admin-language', 'ar'));

    await page.route('**/api/admin/**', async route => {
      const url = new URL(route.request().url());
      const method = route.request().method();

      if (url.pathname.endsWith('/auth/session')) {
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ user, csrfToken: 'mock-csrf' }) });
      }
      if (url.pathname.endsWith('/auth/csrf')) {
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ csrfToken: 'mock-csrf' }) });
      }
      if (url.pathname.endsWith('/commerce/reference')) {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            products: [{ id: sampleProduct.id, title: sampleProduct.title }],
            brands: [{ id: 'seagate', name: 'Seagate', published: true }],
            categories: [{ slug: 'storage', parentSlug: null, productTypeId: null, title: { ar: 'وسائط تخزين', en: 'Storage' } }],
            types: [],
            variants: [],
            collections: [],
            packages: []
          })
        });
      }
      if (url.pathname.endsWith('/commerce/products')) {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ items: [sampleProduct], total: 1 })
        });
      }
      if (url.pathname.endsWith('/media')) {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ items: [{ id: 'initial-img-1', originalPath: '/api/media/initial-img-1', altAr: 'صورة تجريبية' }] })
        });
      }

      if (url.pathname.endsWith('/commerce/amazon/fetch') && method === 'POST') {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            title: 'Seagate BarraCuda 1TB Internal Hard Drive HDD',
            asin: 'B07D99KFPK',
            sourceUrl: 'https://www.amazon.com/dp/B07D99KFPK',
            images: [
              { url: 'https://m.media-amazon.com/images/I/71Czt9ypIbL._AC_SL1500_.jpg', thumb: 'https://m.media-amazon.com/images/I/71Czt9ypIbL._AC_US150_.jpg' },
              { url: 'https://m.media-amazon.com/images/I/81OjMaK4TzL._AC_SL1500_.jpg', thumb: 'https://m.media-amazon.com/images/I/81OjMaK4TzL._AC_US150_.jpg' }
            ]
          })
        });
      }

      if (url.pathname.endsWith('/commerce/amazon/import') && method === 'POST') {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            ok: true,
            count: 2,
            imported: [
              { id: 'amz-media-1', path: '/api/media/amz-media-1' },
              { id: 'amz-media-2', path: '/api/media/amz-media-2' }
            ],
            product: {
              ...sampleProduct,
              images: ['/api/media/amz-media-1', '/api/media/amz-media-2', '/api/media/initial-img-1']
            }
          })
        });
      }

      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({}) });
    });
  });

  test('Page header has "استيراد من أمازون" button and opens modal', async ({ page }) => {
    await page.goto('/admin/products');

    // Verify page heading button exists
    const amzBtn = page.getByRole('button', { name: 'أمازون', exact: true }).first();
    await expect(amzBtn).toBeVisible();

    // Click it to open modal
    await amzBtn.click();

    // Verify modal is open
    const modal = page.getByRole('dialog');
    await expect(modal).toBeVisible();
    await expect(modal.getByRole('heading', { name: 'استيراد الصور من أمازون' })).toBeVisible();

    // Verify mode tabs exist
    await expect(modal.getByRole('button', { name: 'رابط المنتج أو ASIN' })).toBeVisible();
    await expect(modal.getByRole('button', { name: 'روابط الصور المباشرة (سريع)' })).toBeVisible();
    await expect(modal.getByRole('button', { name: 'كود الصفحة HTML' })).toBeVisible();

    // Close modal
    await page.keyboard.press('Escape');
    await expect(modal).not.toBeVisible();
  });

  test('Fetches images from Amazon and imports them', async ({ page }) => {
    await page.goto('/admin/products');

    // Open modal via row action
    const rowBtn = page.getByRole('button', { name: 'أمازون' }).first();
    await expect(rowBtn).toBeVisible();
    await rowBtn.click();

    const modal = page.getByRole('dialog');
    await expect(modal).toBeVisible();

    // Verify target product is displayed
    await expect(modal.getByText('قرص صلب سيجيت باراكودا 1 تيرابايت')).toBeVisible();

    // Enter ASIN and fetch
    const input = modal.locator('.amazon-text-input');
    await input.fill('B07D99KFPK');
    await modal.getByRole('button', { name: 'جلب الصور' }).click();

    // Images should be displayed
    await expect(modal.getByText('الصور المكتشفة (2)')).toBeVisible();
    await expect(modal.locator('.amazon-img-card')).toHaveCount(2);
    await expect(modal.getByText('الرئيسية ⭐')).toBeVisible();

    // Click import button
    const importBtn = modal.getByRole('button', { name: /استيراد وتعيين 2 صورة/ });
    await expect(importBtn).toBeVisible();
    await importBtn.click();

    // Check success notification
    await expect(modal.getByText(/تم استيراد 2 صورة بنجاح/)).toBeVisible();
  });

  test('Product Editor Images tab includes "استيراد من أمازون" button', async ({ page }) => {
    await page.goto('/admin/products');

    // Click Edit on the product
    await page.getByRole('button', { name: 'تعديل' }).first().click();

    // Switch to Images tab
    await page.getByRole('button', { name: 'الصور' }).click();

    // Check that "استيراد من أمازون" button is present in media section header
    const editorAmzBtn = page.locator('.media-section-header').getByRole('button', { name: 'أمازون', exact: true });
    await expect(editorAmzBtn).toBeVisible();

    // Click it to open Amazon import modal
    await editorAmzBtn.click();
    await expect(page.getByRole('dialog')).toBeVisible();
  });

  test('Search Assistant provides Google search and simplified Amazon search without dog page errors', async ({ page }) => {
    await page.goto('/admin/products');

    const rowBtn = page.getByRole('button', { name: 'أمازون' }).first();
    await rowBtn.click();

    const modal = page.getByRole('dialog');
    await expect(modal).toBeVisible();

    // Verify search assistant box is rendered
    const assistBox = modal.locator('.amazon-search-assist-box');
    await expect(assistBox).toBeVisible();
    await expect(assistBox.getByText('مساعد البحث عن المنتج في أمازون')).toBeVisible();

    // Google Search Button
    const googleBtn = assistBox.locator('.search-assist-btn.google-primary');
    await expect(googleBtn).toBeVisible();
    const googleHref = await googleBtn.getAttribute('href');
    expect(googleHref).toContain('google.com/search');
    expect(googleHref).toContain('amazon');

    // Google site:amazon.com Button
    const siteBtn = assistBox.locator('.search-assist-btn.google-secondary');
    await expect(siteBtn).toBeVisible();
    const siteHref = await siteBtn.getAttribute('href');
    expect(siteHref).toContain('site%3Aamazon.com');

    // Simplified Amazon Search Button
    const amzDirectBtn = assistBox.locator('.search-assist-btn.amazon-direct');
    await expect(amzDirectBtn).toBeVisible();
    const amzHref = await amzDirectBtn.getAttribute('href');
    expect(amzHref).toContain('amazon.com/s?k=');

    // Test with complex query that previously triggered Amazon dog page:
    const queryInput = assistBox.locator('.assist-query-input');
    await queryInput.fill('Adapter Lenovo Original AC  20.0V 15A 300W 3-Pin Slim Tip');

    // Check that Google search url has clean keywords and amazon prefix
    const updatedGoogleHref = await googleBtn.getAttribute('href');
    expect(decodeURIComponent(updatedGoogleHref || '')).toContain('amazon');
    expect(decodeURIComponent(updatedGoogleHref || '')).toContain('Lenovo');
    expect(decodeURIComponent(updatedGoogleHref || '')).toContain('300W');

    // Check that Amazon search url was cleaned to remove noise words and dashes
    const updatedAmzHref = await amzDirectBtn.getAttribute('href');
    const decodedAmz = decodeURIComponent(updatedAmzHref || '');
    expect(decodedAmz).not.toContain('3-Pin'); // Hyphen removed to avoid search engine negation
    expect(decodedAmz).not.toContain('20.0V'); // Decimal dot normalized

    // Test typing a search query into the URL field -> shows friendly guidance instead of raw error
    const input = modal.locator('.amazon-text-input');
    await input.fill('Lenovo 300W Adapter');
    await modal.getByRole('button', { name: 'جلب الصور' }).click();

    await expect(modal.getByText(/المدخل يبدو كاسم أو موديل للمنتج/)).toBeVisible();
    await expect(modal.locator('.alert-action-link.google-link')).toBeVisible();
  });
});
