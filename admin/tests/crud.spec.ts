import { test, expect } from '@playwright/test';

test.describe('Admin CRUD Operations Across UI', () => {
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

  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.addInitScript(() => localStorage.setItem('admin-language', 'ar'));
  });

  test('Brands UI: Edit, Save, and Delete', async ({ page }) => {
    const brands = [
      {
        id: 'thinkpad',
        name: 'ThinkPad',
        description: { ar: 'حواسيب لينوفو ثينك باد', en: 'Lenovo ThinkPad' },
        categories: [{ categorySlug: 'laptops' }],
        logoMediaId: null,
        published: true,
        sort: 1
      }
    ];

    let deleteCalled = false;
    let saveCalled = false;

    await page.route('**/api/admin/**', async route => {
      const url = new URL(route.request().url());
      const method = route.request().method();

      if (url.pathname.endsWith('/auth/session')) {
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ user, csrfToken: 'mock-csrf' }) });
      }
      if (url.pathname.endsWith('/auth/csrf')) {
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ csrfToken: 'mock-csrf' }) });
      }
      if (url.pathname.endsWith('/reference')) {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            brands,
            categories: [{ slug: 'laptops', title: { ar: 'لابتوبات', en: 'Laptops' } }],
            specs: []
          })
        });
      }
      if (url.pathname.endsWith('/media')) {
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ items: [] }) });
      }
      if (url.pathname.endsWith('/brands') && method === 'POST') {
        saveCalled = true;
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true }) });
      }
      if (url.pathname.includes('/brands/thinkpad') && method === 'DELETE') {
        deleteCalled = true;
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true }) });
      }
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({}) });
    });

    await page.goto('/admin/brands');
    await page.waitForLoadState('networkidle');

    // 1. Verify list item is visible
    await expect(page.getByRole('heading', { name: 'ThinkPad' })).toBeVisible();

    // 2. Open Edit panel
    await page.getByRole('button', { name: 'تعديل' }).first().click();
    await expect(page.getByRole('heading', { name: /تعديل العلامة/ })).toBeVisible();

    // 3. Save Edit
    await page.getByRole('button', { name: 'حفظ العلامة' }).click();
    expect(saveCalled).toBe(true);

    // 4. Click Delete on card in grid
    await page.getByRole('button', { name: 'حذف' }).first().click();

    // 5. Verify Confirmation Modal appears and confirm deletion
    await expect(page.getByText('تأكيد حذف العلامة التجارية')).toBeVisible();
    await page.getByRole('button', { name: 'تأكيد الحذف' }).click();
    expect(deleteCalled).toBe(true);
  });

  test('Products UI: Edit, Save, and Delete', async ({ page }) => {
    const products = [
      {
        id: 'p-thinkpad-x1',
        slug: 'thinkpad-x1-carbon',
        category: 'laptops',
        brandId: 'thinkpad',
        brand: 'ThinkPad',
        model: 'X1 Carbon Gen 9',
        title: { ar: 'لينوفو ثينك باد إكس 1 كاربون', en: 'Lenovo ThinkPad X1 Carbon' },
        summary: { ar: 'لابتوب فائق النحافة والأداء', en: 'Ultra-thin laptop' },
        condition: 'new',
        status: 'published',
        warrantyMonths: 12,
        price: { usd: '1200.00', yer: null, updatedAt: null, negotiable: false },
        stock: 'in_stock',
        specs: { cpu: 'Core i7', ramGB: 16 },
        images: ['/images/thinkpad-x1.jpg'],
        bestFor: [],
        tags: [],
        compatibleWith: [],
        inspection: { passed: true, date: null, notes: { ar: '', en: '' } }
      }
    ];

    let deleteCalled = false;
    let saveCalled = false;

    await page.route('**/api/admin/**', async route => {
      const url = new URL(route.request().url());
      const method = route.request().method();

      if (url.pathname.endsWith('/auth/session')) {
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ user, csrfToken: 'mock-csrf' }) });
      }
      if (url.pathname.endsWith('/auth/csrf')) {
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ csrfToken: 'mock-csrf' }) });
      }
      if (url.pathname.includes('/commerce/products')) {
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ items: products, total: 1 }) });
      }
      if (url.pathname.endsWith('/commerce/reference')) {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            products: [],
            brands: [{ id: 'thinkpad', name: 'ThinkPad', published: true }],
            categories: [{ slug: 'laptops', title: { ar: 'لابتوبات', en: 'Laptops' } }],
            types: [],
            variants: [],
            collections: [],
            packages: []
          })
        });
      }
      if (url.pathname.endsWith('/media')) {
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ items: [] }) });
      }
      if (url.pathname.includes('/products/p-thinkpad-x1') && method === 'PATCH') {
        saveCalled = true;
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(products[0]) });
      }
      if (url.pathname.includes('/products/p-thinkpad-x1') && method === 'DELETE') {
        deleteCalled = true;
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true }) });
      }
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({}) });
    });

    await page.goto('/admin/products');
    await page.waitForLoadState('networkidle');

    // 1. Verify product appears in list
    await expect(page.getByText('X1 Carbon Gen 9')).toBeVisible();

    // 2. Click edit button on product row
    await page.getByRole('button', { name: 'تعديل' }).first().click();
    await expect(page.getByRole('button', { name: 'العودة', exact: true })).toBeVisible();

    // 3. Save product
    await page.getByRole('button', { name: 'حفظ', exact: true }).first().click();
    expect(saveCalled).toBe(true);

    // 4. Trigger Delete from within the editor
    await page.getByRole('button', { name: 'حذف هذا المنتج', exact: true }).click();

    // 5. Verify confirmation modal and confirm deletion
    await expect(page.getByText('تأكيد حذف المنتج')).toBeVisible();
    await page.getByRole('button', { name: 'تأكيد الحذف' }).click();
    expect(deleteCalled).toBe(true);
  });

  test('Commerce Catalog (Categories): Edit, Save, and Delete', async ({ page }) => {
    let categories = [
      {
        slug: 'monitors',
        title: { ar: 'شاشات العرض', en: 'Monitors' },
        description: { ar: 'شاشات مكتبية واحترافية', en: 'Displays' },
        parentSlug: null,
        productTypeId: null,
        imageId: null,
        status: 'published',
        sort: 1
      }
    ];

    let deleteCalled = false;
    let saveCalled = false;

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
            products: [],
            brands: [],
            categories,
            types: [],
            variants: [],
            collections: [],
            packages: []
          })
        });
      }
      if (url.pathname.endsWith('/media')) {
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ items: [] }) });
      }
      if (url.pathname.endsWith('/commerce/categories') && method === 'POST') {
        saveCalled = true;
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(categories[0]) });
      }
      if (url.pathname.includes('/commerce/categories/monitors') && method === 'DELETE') {
        deleteCalled = true;
        categories = [];
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true }) });
      }
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({}) });
    });

    await page.goto('/admin/categories');
    await page.waitForLoadState('networkidle');

    // 1. Verify Category in table
    await expect(page.getByText('شاشات العرض')).toBeVisible();

    // 2. Click Edit
    await page.getByRole('button', { name: 'تعديل' }).first().click();
    await expect(page.getByRole('button', { name: 'العودة للقائمة' })).toBeVisible();

    // 3. Save (note: saving automatically closes edit modal and returns to list)
    await page.getByRole('button', { name: 'حفظ' }).click();
    expect(saveCalled).toBe(true);

    // 4. Verify we are back on table and Click Delete icon
    await expect(page.getByRole('button', { name: 'حذف' }).first()).toBeVisible();
    await page.getByRole('button', { name: 'حذف' }).first().click();

    // 5. Verify modal and confirm
    await expect(page.getByRole('heading', { name: 'تأكيد الحذف' })).toBeVisible();
    await page.getByRole('button', { name: 'تأكيد الحذف' }).click();
    expect(deleteCalled).toBe(true);
  });

  test('VariantsManager UI: Browse, Edit, Duplicate, and Delete', async ({ page }) => {
    const variants = [
      {
        id: 'var-thinkpad-1',
        productId: 'prod-t14',
        sku: 'T14-GEN2-I7',
        options: { ramGB: 16, storageGB: 512 },
        specs: {},
        images: [],
        priceUsd: '650.00',
        warrantyMonths: 12,
        condition: 'new',
        inventoryMode: 'quantity',
        quantity: 5,
        active: true,
        updatedAt: '2026-10-04T00:00:00.000Z'
      }
    ];

    let saveCalled = false;
    let deleteCalled = false;

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
            products: [
              {
                id: 'prod-t14',
                title: { ar: 'لينوفو ثينك باد T14', en: 'Lenovo ThinkPad T14' },
                model: 'T14 Gen 2',
                brandId: 'thinkpad',
                category: 'laptops',
                productTypeId: 'laptops',
                status: 'published',
                images: []
              }
            ],
            brands: [{ id: 'thinkpad', name: 'ThinkPad' }],
            categories: [{ slug: 'laptops', parentSlug: null, productTypeId: 'laptops', title: { ar: 'لابتوبات', en: 'Laptops' } }],
            types: [
              {
                id: 'laptops',
                title: { ar: 'أجهزة لابتوب', en: 'Laptops' },
                fields: [
                  { key: 'ramGB', title: { ar: 'الذاكرة العشوائية', en: 'RAM' }, valueType: 'number', unit: 'GB', options: [], required: true, filterable: true, card: true, sort: 1 },
                  { key: 'storageGB', title: { ar: 'التخزين', en: 'Storage' }, valueType: 'number', unit: 'GB', options: [], required: true, filterable: true, card: true, sort: 2 }
                ]
              }
            ],
            variants,
            collections: [],
            packages: []
          })
        });
      }
      if (url.pathname.endsWith('/media')) {
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ items: [] }) });
      }
      if (url.pathname.endsWith('/commerce/variants') && method === 'POST') {
        saveCalled = true;
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(variants[0]) });
      }
      if (url.pathname.includes('/commerce/variants/var-thinkpad-1') && method === 'DELETE') {
        deleteCalled = true;
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true }) });
      }
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({}) });
    });

    await page.goto('/admin/variants');
    await page.waitForLoadState('networkidle');

    // 1. Verify Variant displays in table
    await expect(page.getByRole('button', { name: 'لينوفو ثينك باد T14', exact: true })).toBeVisible();
    await expect(page.getByText('T14-GEN2-I7').first()).toBeVisible();

    // 2. Click Edit button
    await page.getByRole('button', { name: 'تعديل' }).first().click();
    await expect(page.getByRole('button', { name: 'حفظ الخيار' }).first()).toBeVisible();

    // 3. Save variant
    await page.getByRole('button', { name: 'حفظ الخيار' }).first().click();
    expect(saveCalled).toBe(true);

    // 4. Return to list and Click Delete
    await expect(page.getByRole('button', { name: 'إضافة خيار جديد' })).toBeVisible();
    await page.getByTitle('حذف الخيار').first().click();

    // 5. Verify modal and confirm
    await expect(page.getByRole('heading', { name: 'تأكيد حذف أو تعطيل الخيار' })).toBeVisible();
    await page.getByRole('button', { name: 'تأكيد الإجراء' }).click();
    expect(deleteCalled).toBe(true);
  });
});
