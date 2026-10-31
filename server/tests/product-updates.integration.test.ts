import { beforeAll, afterAll, it, expect } from 'vitest';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import mariadb, { type Connection } from 'mariadb';
import ExcelJS from 'exceljs';
import type { FastifyInstance, LightMyRequestResponse } from 'fastify';
import type { PrismaClient } from '@prisma/client';
import { ProductSchema, productUpdateColumns, variantUpdateColumns, updateSheets, type ProductUpdateResponse } from '@aljeel/shared';
import { buildApp } from '../src/app.js';
import { ConfigSchema } from '../src/config.js';
import { createDb } from '../src/db.js';
import { hashPassword, hashToken, randomToken } from '../src/security.js';
import { productDto, productInclude } from '../src/catalog-service.js';

const url = new URL(process.env.TEST_DATABASE_URL ?? 'mysql://missing@127.0.0.1:3306/missing');
if (!['127.0.0.1', 'localhost'].includes(url.hostname) || !process.env.TEST_DATABASE_URL) throw new Error('Local TEST_DATABASE_URL required');
const namespace = 'excel_v2_test_' + randomUUID().replaceAll('-', '');
const config = ConfigSchema.parse({ NODE_ENV: 'test', DATABASE_URL: url.toString(), SESSION_SECRET: randomToken(), TOTP_ENCRYPTION_KEY: 'a'.repeat(64), ALLOWED_ORIGINS: 'http://localhost:5174', LOG_LEVEL: 'silent' });
let app: FastifyInstance, db: PrismaClient, sql: Connection, passwordHash: string;
type Browser = { cookies: Map<string, string>; csrf: string; call: (path: string, method?: string, body?: unknown) => Promise<LightMyRequestResponse> };
function browser(): Browser {
  const client: Browser = { cookies: new Map(), csrf: '', async call(path, method = 'GET', body) {
    const r = await app.inject({ url: '/api/admin' + path, method: method as 'GET' | 'POST', headers: { origin: 'http://localhost:5174', cookie: [...client.cookies].map(([k, v]) => k + '=' + v).join('; '), 'x-csrf-token': client.csrf, ...(body !== undefined ? { 'content-type': 'application/json' } : {}) }, ...(body !== undefined ? { payload: JSON.stringify(body) } : {}) });
    for (const c of r.cookies) if (c.value) client.cookies.set(c.name, c.value);
    if (r.headers['content-type']?.includes('json') && r.json().csrfToken) client.csrf = r.json().csrfToken;
    return r;
  } };
  return client;
}
async function staff(role: 'owner' | 'editor' = 'owner') {
  const user = await db.user.create({ data: { email: randomUUID() + '@example.test', name: 'Excel test', passwordHash, role, mustChangePassword: false } });
  const client = browser(); await client.call('/auth/csrf'); const raw = randomToken();
  await db.session.create({ data: { id: hashToken(raw), userId: user.id, expiresAt: new Date(Date.now() + 3600000), userAgent: 'test', ipHash: 'a'.repeat(64) } });
  client.cookies.set('aljeel_session', raw); return client;
}
async function fixture(count = 1, mode = 'quantity') {
  const id = randomUUID(), cat = 'cat-' + id;
  const brand = await db.brand.create({ data: { id: 'brand-' + id, slug: 'brand-' + id, name: 'براند متشابه', published: true, description: {} } });
  await db.catalogCategory.create({ data: { slug: cat, title: { ar: 'فئة اختبار', en: 'Test category' }, description: {} } });
  const p = await db.product.create({ data: { id, slug: 'item-' + id, category: cat, brandId: brand.id, model: 'Model', title: { ar: 'اسم متكرر', en: 'Same name' }, summary: { ar: 'وصف', en: 'Description' }, condition: 'A', status: 'published', warrantyMonths: 12, priceUsd: '100', specs: {}, inspection: { passed: true, date: null, notes: { ar: 'فحص اختبار', en: '' } }, specSources: [], bestFor: [], tags: [], publishedAt: new Date() } });
  const media = await db.mediaAsset.create({ data: { kind: 'image', originalPath: '/images/product-' + id + '.webp', variants: {}, bytes: 100 } });
  const image = await db.productImage.create({ data: { productId: id, mediaId: media.id, shot: 'front_closed', altAr: 'صورة محفوظة' } });
  const variants = [];
  for (let i = 0; i < count; i++) variants.push(await db.productVariant.create({ data: { id: randomUUID(), sku: '000-' + id + '-' + i, productId: p.id, optionKey: String(i), options: { ram: i + 8 }, specs: {}, images: ['/images/unchanged.webp'], priceUsd: '100', condition: 'A', inventoryMode: mode, quantity: 5, inventoryReviewed: true, warrantyMonths: 12 } }));
  const unit = mode === 'serialized' ? await db.inventoryUnit.create({ data: { variantId: variants[0].id, serialNumber: id, condition: 'A', inspection: {}, defects: [], images: ['/serial-image.webp'] } }) : null;
  return { p, variants, unit, brand, cat, image };
}
async function workbook(client: Browser, template = false) {
  const res = await client.call('/commerce/excel/v2/' + (template ? 'template' : 'export'));
  expect(res.statusCode).toBe(200);
  const wb = new ExcelJS.Workbook(); await wb.xlsx.load(res.rawPayload as any); return wb;
}
function dataRow(wb: ExcelJS.Workbook, id: string, variants = false) {
  const cols = variants ? variantUpdateColumns : productUpdateColumns, sheet = wb.getWorksheet(variants ? updateSheets.variants : updateSheets.products)!;
  const index = cols.findIndex(c => c.key === (variants ? 'variantId' : 'productId')) + 1;
  for (let n = 3; n <= sheet.rowCount; n++) if (sheet.getCell(n, index).value === id) return sheet.getRow(n);
  throw new Error('Missing row ' + id);
}
function set(row: ExcelJS.Row, key: string, value: ExcelJS.CellValue, variants = false) {
  row.getCell((variants ? variantUpdateColumns : productUpdateColumns).findIndex(c => c.key === key) + 1).value = value;
}
async function encoded(wb: ExcelJS.Workbook) { return Buffer.from(await wb.xlsx.writeBuffer()).toString('base64'); }
async function preview(client: Browser, wb: ExcelJS.Workbook) {
  const file = await encoded(wb), r = await client.call('/commerce/excel/v2/preview', 'POST', { file });
  expect(r.statusCode, r.body).toBe(200); return { file, result: r.json() as ProductUpdateResponse };
}
async function save(client: Browser, wb: ExcelJS.Workbook) {
  const { file, result } = await preview(client, wb); expect(result.errors).toEqual([]);
  const r = await client.call('/commerce/excel/v2/commit', 'POST', { file, previewToken: result.previewToken }); expect(r.statusCode, r.body).toBe(200); return r.json() as ProductUpdateResponse;
}
beforeAll(async () => {
  sql = await mariadb.createConnection({ host: url.hostname, port: Number(url.port || 3306), user: decodeURIComponent(url.username), password: decodeURIComponent(url.password), allowPublicKeyRetrieval: true });
  await sql.query('CREATE DATABASE ' + namespace + ' CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci'); await sql.query('USE ' + namespace);
  for (const folder of ['202610030001_mysql', '202610030002_checks', '202610030003_commerce', '202610030004_commerce_integrity', '202610030005_commerce_checks', '202610030006_contest']) {
    const text = await readFile(new URL('../prisma/mysql-migrations/' + folder + '/migration.sql', import.meta.url), 'utf8');
    for (const statement of text.split(';').map(s => s.trim()).filter(Boolean)) {
      for (let attempt = 0; ; attempt++) {
        try { await sql.query(statement); break; }
        catch (error) { if ((error as { code: string }).code !== 'ER_ERROR_ON_RENAME' || attempt >= 5) throw error; await new Promise(resolve => setTimeout(resolve, 500)); }
      }
    }
  }
  // Current catalog fields already exist in the live schema; historical test migrations predate them.
  await sql.query("ALTER TABLE ProductVariant ADD COLUMN availabilityMode VARCHAR(30) NOT NULL DEFAULT 'in_stock', ADD COLUMN leadTimeDays INT NULL");
  url.pathname = '/' + namespace; db = createDb(url.toString()); passwordHash = await hashPassword(randomToken()); app = await buildApp(config, db, { disableRateLimits: true }); await app.ready();
}, 60000);
afterAll(async () => { if (app) await app.close(); if (db) await db.$disconnect(); if (sql) { await sql.query('DROP DATABASE IF EXISTS ' + namespace); await sql.end(); } });

it('exports real dropdowns, RTL, protected technical columns, full condition enum and unchanged round-trip', async () => {
  const f = await fixture(), client = await staff(), wb = await workbook(client);
  expect(wb.worksheets.map(s => s.name)).toEqual([updateSheets.products, updateSheets.help, updateSheets.variants, updateSheets.metadata]);
  const ws = wb.getWorksheet(updateSheets.products)!, row = dataRow(wb, f.p.id);
  expect(ws.views[0].rightToLeft).toBe(true); expect(ws.getColumn('Q').hidden).toBe(true);
  expect(row.getCell(4).dataValidation.formulae).toEqual(['UpdateBrands']);
  expect(row.getCell(11).numFmt).toBe('@'); expect(row.getCell(17).protection?.locked ?? true).toBe(true);
  expect((ws.model as any).sheetProtection.sheet).toBe(true);
  expect(wb.definedNames.getRanges('UpdateConditions').ranges[0]).toContain(updateSheets.help);
  const before = await db.product.findUniqueOrThrow({ where: { id: f.p.id } });
  const res = await save(client, wb); expect(res.summary.updated).toBe(0);
  expect((await db.product.findUniqueOrThrow({ where: { id: f.p.id } })).updatedAt).toEqual(before.updatedAt);
});
it('updates by stable IDs despite duplicate names and preserves image arrays and publication', async () => {
  const a = await fixture(), b = await fixture(), client = await staff(), wb = await workbook(client), row = dataRow(wb, a.p.id);
  set(row, 'model', 'Changed model'); set(row, 'sku', '0000000123'); set(row, 'priceUsd', 123.45); set(row, 'quantity', 7);
  set(row, 'brand', `براند متشابه [${b.brand.id}]`); set(row, 'category', `فئة اختبار [${b.cat}]`);
  expect((await save(client, wb)).committed).toBe(true);
  const p = await db.product.findUniqueOrThrow({ where: { id: a.p.id } }), v = await db.productVariant.findUniqueOrThrow({ where: { id: a.variants[0].id } });
  expect(p.brandId).toBe(b.brand.id); expect(p.category).toBe(b.cat); expect(p.status).toBe('published'); expect(v.sku).toBe('0000000123'); expect(v.quantity).toBe(7); expect(v.images).toEqual(['/images/unchanged.webp']);
  expect(await db.productImage.findUnique({ where: { id: a.image.id } })).toEqual(a.image);
  expect((await db.product.findUniqueOrThrow({ where: { id: b.p.id } })).model).toBe('Model');
  expect(await db.productRedirect.findUnique({ where: { path: a.cat + '/' + a.p.slug } })).toBeTruthy();
  expect(await db.priceHistory.count({ where: { productId: a.p.id } })).toBe(1);
  expect((await db.inventoryMovement.findFirstOrThrow({ where: { variantId: v.id } })).delta).toBe(2);
});
it('blank optional cells clear values and zero quantity is valid', async () => {
  const f = await fixture(), client = await staff(), wb = await workbook(client), row = dataRow(wb, f.p.id);
  for (const key of ['titleEn', 'summaryAr', 'summaryEn', 'priceUsd', 'warrantyMonths']) set(row, key, null);
  set(row, 'quantity', 0);
  const res = await save(client, wb); expect(res.summary.cleared).toBe(5);
  const p = await db.product.findUniqueOrThrow({ where: { id: f.p.id } }), v = await db.productVariant.findUniqueOrThrow({ where: { id: f.variants[0].id } });
  expect(p.title).toEqual({ ar: 'اسم متكرر', en: '' }); expect(p.summary).toEqual({ ar: '', en: '' }); expect(p.priceUsd).toBeNull(); expect(v.priceUsd).toBeNull(); expect(v.quantity).toBe(0); expect(v.warrantyMonths).toBeNull();
  expect(ProductSchema.safeParse(productDto(await db.product.findUniqueOrThrow({ where: { id: f.p.id }, include: productInclude }))).success).toBe(true);
});
it('adds a draft, with explicit action, exact references, and retries do not duplicate it', async () => {
  const f = await fixture(), client = await staff(), wb = await workbook(client, true), row = wb.getWorksheet(updateSheets.products)!.getRow(3), sku = '000-new-' + randomUUID();
  for (const [key, value] of Object.entries({ action: 'إضافة', titleAr: 'صنف جديد', model: 'New model', brand: `براند متشابه [${f.brand.id}]`, category: `فئة اختبار [${f.cat}]`, condition: 'ممتاز (A)', sku })) set(row, key, value);
  const { file, result } = await preview(client, wb); expect(result.errors).toEqual([]);
  const body = { file, previewToken: result.previewToken };
  const responses = await Promise.all([client.call('/commerce/excel/v2/commit', 'POST', body), client.call('/commerce/excel/v2/commit', 'POST', body)]);
  expect(responses.map(r => r.statusCode)).toEqual([200, 200]); expect(responses.some(r => r.json().replayed)).toBe(true);
  const v = await db.productVariant.findUniqueOrThrow({ where: { sku }, include: { product: true } });
  expect(v.quantity).toBe(0); expect(v.priceUsd).toBeNull(); expect(v.product.status).toBe('draft'); expect(v.product.title).toEqual({ ar: 'صنف جديد', en: '' });
});
it('updates an existing option without changing other prices or parent price', async () => {
  const f = await fixture(2), client = await staff(), wb = await workbook(client), row = dataRow(wb, f.variants[0].id, true);
  set(row, 'priceUsd', 250, true); set(row, 'quantity', 12, true); set(row, 'condition', 'جيد (B)', true); set(row, 'warrantyMonths', null, true);
  expect((await save(client, wb)).summary.updated).toBe(1);
  const v = await db.productVariant.findUniqueOrThrow({ where: { id: f.variants[0].id } });
  expect(v.priceUsd?.toFixed(2)).toBe('250.00'); expect(v.condition).toBe('B'); expect(v.quantity).toBe(12); expect(v.warrantyMonths).toBeNull();
  expect((await db.productVariant.findUniqueOrThrow({ where: { id: f.variants[1].id } })).priceUsd?.toFixed(2)).toBe('100.00');
  expect((await db.product.findUniqueOrThrow({ where: { id: f.p.id } })).priceUsd?.toFixed(2)).toBe('100.00');
});
it('deleting a row leaves the product intact; explicit delete retains related variants and images', async () => {
  const f = await fixture(), client = await staff(), wb = await workbook(client), row = dataRow(wb, f.p.id);
  row.eachCell({ includeEmpty: true }, cell => { cell.value = null; }); await save(client, wb);
  expect((await db.product.findUniqueOrThrow({ where: { id: f.p.id } })).deletedAt).toBeNull();
  const fresh = await workbook(client); set(dataRow(fresh, f.p.id), 'action', 'حذف'); await save(client, fresh);
  expect((await db.product.findUniqueOrThrow({ where: { id: f.p.id } })).deletedAt).not.toBeNull();
  expect((await db.productVariant.findUniqueOrThrow({ where: { id: f.variants[0].id } })).images).toEqual(['/images/unchanged.webp']);
  const exportAgain = await workbook(client); expect(() => dataRow(exportAgain, f.p.id)).toThrow();
});
it.each(['quantity', 'priceUsd', 'titleAr', 'brand', 'warrantyMonths', 'sku'])('rejects invalid %s without committing any rows', async key => {
  const f = await fixture(), client = await staff(), wb = await workbook(client); set(dataRow(wb, f.p.id), key, key === 'titleAr' ? null : key === 'warrantyMonths' ? 121 : 'قيمة خاطئة');
  const { result } = await preview(client, wb); expect(result.errors.some(e => e.row === dataRow(wb, f.p.id).number && e.column)).toBe(true); expect(result.previewToken).toBeUndefined();
  expect((await db.product.findUniqueOrThrow({ where: { id: f.p.id } })).model).toBe('Model');
});
it('rejects missing headers, formulas, changed metadata and duplicated rows', async () => {
  const f = await fixture(), client = await staff();
  let wb = await workbook(client); wb.getWorksheet(updateSheets.products)!.getCell(2, 9).value = null; expect((await preview(client, wb)).result.errors.some(e => e.row === 2)).toBe(true);
  wb = await workbook(client); set(dataRow(wb, f.p.id), 'priceUsd', { formula: '1+1', result: 2 }); expect((await preview(client, wb)).result.errors.some(e => e.message.includes('الصيغ'))).toBe(true);
  wb = await workbook(client); wb.getWorksheet(updateSheets.metadata)!.getCell(2, 2).value = 'f'.repeat(64); expect((await client.call('/commerce/excel/v2/preview', 'POST', { file: await encoded(wb) })).statusCode).toBe(400);
  wb = await workbook(client); const row = dataRow(wb, f.p.id); wb.getWorksheet(updateSheets.products)!.getRow(900).values = row.values; expect((await preview(client, wb)).result.errors.some(e => e.message.includes('مكرر'))).toBe(true);
}, 20000);
it('checks permissions for actual changed fields; editor can edit descriptions but not prices', async () => {
  const f = await fixture(), client = await staff('editor'), wb = await workbook(client); set(dataRow(wb, f.p.id), 'summaryAr', 'وصف جديد'); expect((await save(client, wb)).committed).toBe(true);
  const priceWb = await workbook(client); set(dataRow(priceWb, f.p.id), 'priceUsd', 999); expect((await preview(client, priceWb)).result.errors.some(e => e.message.includes('تعديل الأسعار'))).toBe(true);
});
it('rejects a change made after export and another change made after preview', async () => {
  const f = await fixture(), client = await staff(), wb = await workbook(client); set(dataRow(wb, f.p.id), 'quantity', 15);
  await db.productVariant.update({ where: { id: f.variants[0].id }, data: { quantity: 4 } }); expect((await preview(client, wb)).result.errors.some(e => e.message.includes('التصدير'))).toBe(true);
  const fresh = await workbook(client); set(dataRow(fresh, f.p.id), 'quantity', 15); const { file, result } = await preview(client, fresh); expect(result.errors).toEqual([]);
  await db.productVariant.update({ where: { id: f.variants[0].id }, data: { quantity: 3 } });
  const res = await client.call('/commerce/excel/v2/commit', 'POST', { file, previewToken: result.previewToken }); expect(res.statusCode).toBe(200); expect(res.json().committed).toBe(false); expect((await db.productVariant.findUniqueOrThrow({ where: { id: f.variants[0].id } })).quantity).toBe(3);
});
it('rejects serialized quantity changes and catches unit movements after export', async () => {
  const f = await fixture(1, 'serialized'), client = await staff(), wb = await workbook(client); set(dataRow(wb, f.p.id), 'quantity', 8);
  expect((await preview(client, wb)).result.errors.some(e => e.message.includes('بالسيريال'))).toBe(true);
  const fresh = await workbook(client); set(dataRow(fresh, f.p.id), 'model', 'Serial model'); await db.inventoryUnit.update({ where: { id: f.unit!.id }, data: { available: false } });
  expect((await preview(client, fresh)).result.errors.some(e => e.message.includes('التصدير'))).toBe(true);
});
it('rejects deleting a parent and editing an option together', async () => {
  const f = await fixture(2), client = await staff(), wb = await workbook(client); set(dataRow(wb, f.p.id), 'action', 'حذف'); set(dataRow(wb, f.variants[0].id, true), 'quantity', 8, true);
  expect((await preview(client, wb)).result.errors.some(e => e.message.includes('حذف الصنف وتعديل'))).toBe(true);
});
it('rolls back all data, receipts and inventory movements if a write fails midway', async () => {
  const a = await fixture(), b = await fixture(), client = await staff(), wb = await workbook(client), failSku = 'FAIL-' + randomUUID();
  set(dataRow(wb, a.p.id), 'model', 'Must roll back'); set(dataRow(wb, a.p.id), 'quantity', 9); set(dataRow(wb, b.p.id), 'sku', failSku);
  const { file, result } = await preview(client, wb); expect(result.errors).toEqual([]);
  await sql.query(`CREATE TRIGGER fail_excel BEFORE UPDATE ON ProductVariant FOR EACH ROW BEGIN IF NEW.sku = '${failSku}' THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Intentional rollback test'; END IF; END`);
  try { expect((await client.call('/commerce/excel/v2/commit', 'POST', { file, previewToken: result.previewToken })).statusCode).toBe(500); }
  finally { await sql.query('DROP TRIGGER fail_excel'); }
  expect((await db.product.findUniqueOrThrow({ where: { id: a.p.id } })).model).toBe('Model'); expect((await db.productVariant.findUniqueOrThrow({ where: { id: a.variants[0].id } })).quantity).toBe(5); expect(await db.inventoryMovement.count({ where: { variantId: a.variants[0].id } })).toBe(0);
  expect((await client.call('/commerce/excel/v2/commit', 'POST', { file, previewToken: result.previewToken })).json().committed).toBe(true);
});
it('saves independently exported parts of a product with over 999 options', async () => {
  const f = await fixture(1001), client = await staff(), manifest = (await client.call('/commerce/excel/v2/parts')).json();
  const workbooks: ExcelJS.Workbook[] = [];
  for (const part of manifest.parts) {
    expect(part.rows).toBeLessThanOrEqual(1000);
    const response = await client.call('/commerce/excel/v2/export?part=' + part.part), wb = new ExcelJS.Workbook();
    await wb.xlsx.load(response.rawPayload as any);
    try { dataRow(wb, f.p.id); workbooks.push(wb); } catch { /* Part belongs to other test products. */ }
  }
  expect(workbooks).toHaveLength(2);
  const variantIds: string[] = [];
  for (const wb of workbooks) {
    const row = wb.getWorksheet(updateSheets.variants)!.getRow(3);
    variantIds.push(String(row.getCell(variantUpdateColumns.findIndex(c => c.key === 'variantId') + 1).value));
    set(row, 'quantity', 19, true);
  }
  for (const wb of workbooks) expect((await save(client, wb)).committed).toBe(true);
  for (const id of variantIds) expect((await db.productVariant.findUniqueOrThrow({ where: { id } })).quantity).toBe(19);
}, 60000);
