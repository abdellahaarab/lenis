import { test, expect } from '@playwright/test';
import { randomUUID } from 'node:crypto';
const user = { id: randomUUID(), email: 'excel-ui@example.test', name: 'حساب اختبار', role: 'owner', isActive: true, mustChangePassword: false, totpEnabled: false, lastLoginAt: null, createdAt: '2026-10-02T00:00:00.000Z' };
const base = { errors: [], previews: [{ sheet: 'الأصناف', row: 3, action: 'تحديث', productName: 'حاسوب اختبار', changes: [{ column: 'السعر بالدولار', before: '100.00', after: null, cleared: true }] }], summary: { added: 0, updated: 1, deleted: 0, cleared: 1, unchanged: 3, ignored: 0 }, committed: false, previewToken: 'valid-preview' };
for (const width of [360, 1280]) test(`Arabic product updates workflow at ${width}px`, async ({ page }) => {
  await page.setViewportSize({ width, height: 950 });
  await page.addInitScript(() => localStorage.setItem('admin-language', 'ar'));
  let commits = 0;
  await page.route('**/api/admin/**', route => {
    const path = new URL(route.request().url()).pathname;
    const body = path.endsWith('/auth/session') ? { user, csrfToken: 'test-csrf' }
      : path.endsWith('/parts') ? { parts: [{ part: 1, rows: 4 }] }
      : path.endsWith('/preview') ? base
      : path.endsWith('/commit') ? (++commits, { ...base, committed: true }) : {};
    return route.fulfill({ json: body });
  });
  await page.goto('/admin/product-updates');
  await expect(page.getByRole('heading', { name: 'تحديث الأصناف', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'تصدير الأصناف الحالية' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByLabel('ملف تحديث الأصناف').setInputFiles({ name: 'products.xlsx', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', buffer: Buffer.from('test-workbook') });
  await expect(page.getByRole('heading', { name: '3. معاينة التغييرات' })).toBeVisible();
  await expect(page.getByText('مسح القيمة', { exact: true })).toBeVisible();
  if (width === 360) {
    const currentPrice = page.locator('.update-change-table td').filter({ hasText: '100.00' });
    await currentPrice.scrollIntoViewIfNeeded(); await expect(currentPrice).toBeInViewport();
  }
  const save = page.getByRole('button', { name: 'تأكيد وحفظ جميع التغييرات' });
  await expect(save).toBeDisabled();
  await page.getByRole('checkbox').check(); await expect(save).toBeEnabled();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: `test-results/product-updates-review-${width}.png`, fullPage: true });
  await save.click(); await expect(page.getByRole('heading', { name: 'تم حفظ التحديثات بنجاح' })).toBeVisible();
  expect(commits).toBe(1); await expect(save).toHaveCount(0);
});
test('errors block save and replacing a file discards its previous preview', async ({ page }) => {
  let previews = 0;
  await page.route('**/api/admin/**', route => {
    const path = new URL(route.request().url()).pathname;
    return route.fulfill({ json: path.endsWith('/auth/session') ? { user, csrfToken: 'test' } : path.endsWith('/parts') ? { parts: [{ part: 1, rows: 3 }] } : path.endsWith('/preview') ? (++previews === 1 ? base : { ...base, previewToken: undefined, errors: [{ sheet: 'الأصناف', row: 5, column: 'الكمية', message: 'أدخل رقمًا صحيحًا' }] }) : {} });
  });
  await page.goto('/admin/product-updates');
  const input = page.getByLabel('ملف تحديث الأصناف');
  await input.setInputFiles({ name: 'one.xlsx', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', buffer: Buffer.from('one') });
  await expect(page.getByRole('button', { name: 'تأكيد وحفظ جميع التغييرات' })).toBeVisible();
  await input.setInputFiles({ name: 'two.xlsx', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', buffer: Buffer.from('two') });
  await expect(page.getByText('أدخل رقمًا صحيحًا')).toBeVisible();
  await expect(page.getByRole('button', { name: 'تأكيد وحفظ جميع التغييرات' })).toHaveCount(0);
});
test('legacy CSV is rejected locally and editor navigation exposes the new page', async ({ page }) => {
  await page.route('**/api/admin/**', route => route.fulfill({ json: route.request().url().endsWith('/auth/session') ? { user: { ...user, role: 'editor' }, csrfToken: 'test' } : { parts: [{ part: 1, rows: 0 }] } }));
  await page.goto('/admin/product-updates');
  await expect(page.getByRole('heading', { name: 'تحديث الأصناف', exact: true })).toBeVisible();
  await page.getByLabel('ملف تحديث الأصناف').setInputFiles({ name: 'legacy.csv', mimeType: 'text/csv', buffer: Buffer.from('sku,title') });
  await expect(page.getByText(/الملفات القديمة وCSV غير مدعومة/)).toBeVisible();
});
