import ExcelJS from 'exceljs';
import { createHash, createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import { Prisma, type PrismaClient } from '@prisma/client';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import { z } from 'zod';
import {
  can, ConditionEnum, PRODUCT_UPDATE_VERSION, PRODUCT_UPDATE_LIMIT, PRODUCT_UPDATE_MAX_BYTES, PRODUCT_UPDATE_WARRANTY_MAX,
  updateSheets, updateActions, productUpdateColumns, variantUpdateColumns,
  type UpdateColumn, type UpdateAction, type UpdateIssue, type UpdateChange,
  type UpdatePreviewRow, type UpdateSummary, type ProductUpdateResponse,
} from '@aljeel/shared';
import { transaction } from './db.js';
import { audit } from './audit.js';
import { ApiError } from './errors.js';
import type { AppConfig } from './config.js';
import { effectiveFields, validateSpecs, jsonObject, invalidateCatalogCache } from './commerce-catalog.js';
import { invalidateBootstrapCache } from './routes-content.js';

const include = { variants: { where: { active: true }, orderBy: { id: 'asc' as const }, include: { units: { orderBy: { id: 'asc' as const } } } } } satisfies Prisma.ProductInclude;
type Product = Prisma.ProductGetPayload<{ include: typeof include }>;
type Variant = Product['variants'][number];
type Db = PrismaClient | Prisma.TransactionClient;
type Lookup = { id: string; label: string };
type Stamp = { id: string; revision: string; fingerprint: string };
type Metadata = {
  version: number; id: string; products: Stamp[]; variants: (Stamp & { productId: string })[];
  brands: Lookup[]; categories: Lookup[]; conditions: Lookup[];
};
type RawRow = { sheet: string; row: number; values: Record<string, string> };
type Parsed = { metadata: Metadata; rows: RawRow[]; errors: UpdateIssue[] };
type Operation = {
  source: RawRow; action: UpdateAction; product?: Product; variant?: Variant;
  productData: Record<string, unknown>; variantData: Record<string, unknown>;
};
const conditionNames: Record<string, string> = { new: 'جديد', open_box: 'مفتوح العلبة', like_new: 'كالجديد', refurbished: 'مجدد', used: 'مستخدم', defective: 'به عيب', A: 'ممتاز', B: 'جيد', C: 'مقبول' };
const conditions = ConditionEnum.options.map(id => ({ id, label: `${conditionNames[id]} (${id})` }));
const digest = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const sign = (value: string, secret: string) => createHmac('sha256', secret).update(`product-updates-v2:${value}`).digest('hex');
function sameSignature(actual: string, expected: string) {
  return /^[a-f0-9]{64}$/.test(actual) && timingSafeEqual(Buffer.from(actual, 'hex'), Buffer.from(expected, 'hex'));
}
const variantFingerprint = (v: Variant) => digest([v.id, v.updatedAt.toISOString(), v.units.map(u => [u.id, u.updatedAt.toISOString(), u.available])]);
// Option revisions are checked per row so independent parts of a large product can be saved.
const productFingerprint = (p: Product) => digest([p.id, p.updatedAt.toISOString(), p.variants.map(v => v.id)]);
const stampProduct = (p: Product): Stamp => ({ id: p.id, revision: p.updatedAt.toISOString(), fingerprint: productFingerprint(p) });
const stampVariant = (v: Variant) => ({ id: v.id, productId: v.productId, revision: v.updatedAt.toISOString(), fingerprint: variantFingerprint(v) });
const title = (p: Product) => String(jsonObject(p.title).ar ?? p.model);
const optionDescription = (v: Variant) => Object.entries(jsonObject(v.options)).map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(' / ') : String(value)}`).join('، ') || 'خيار افتراضي';
const modeLabel = (v?: Variant) => !v ? 'من الموقع' : v.inventoryMode === 'serialized' ? 'بالسيريال — من الموقع' : 'بالكمية';
const quantity = (v: Variant) => v.inventoryMode === 'serialized' ? v.units.filter(u => u.available).length : v.quantity;
const kind = (p: Product) => p.variants.length === 1 ? 'خيار واحد' : p.variants.length > 1 ? 'متعدد — ورقة الخيارات' : 'بدون خيارات — من الموقع';
const statusLabel = (p: Product) => ({ draft: 'مسودة', published: 'منشور', archived: 'مؤرشف' }[p.status]);
const emptySummary = (): UpdateSummary => ({ added: 0, updated: 0, deleted: 0, cleared: 0, unchanged: 0, ignored: 0 });

/** Include each product with its options; very large products may span numbered files. */
export function partitionUpdateProducts(products: Product[]) {
  const parts: { products: Product[]; variants: Variant[]; rows: number }[] = [];
  let part = { products: [] as Product[], variants: [] as Variant[], rows: 0 };
  const flush = () => { if (part.rows) parts.push(part); part = { products: [], variants: [], rows: 0 }; };
  for (const p of products) {
    const variants = p.variants.length > 1 ? p.variants : [];
    if (variants.length + 1 <= PRODUCT_UPDATE_LIMIT) {
      if (part.rows + variants.length + 1 > PRODUCT_UPDATE_LIMIT) flush();
      part.products.push(p); part.variants.push(...variants); part.rows += variants.length + 1;
    } else {
      flush();
      for (let i = 0; i < variants.length; i += PRODUCT_UPDATE_LIMIT - 1) {
        const chunk = variants.slice(i, i + PRODUCT_UPDATE_LIMIT - 1);
        part = { products: [p], variants: chunk, rows: chunk.length + 1 }; flush();
      }
    }
  }
  flush();
  return parts.length ? parts : [{ products: [], variants: [], rows: 0 }];
}
async function exportData(db: Db) {
  const [products, brands, categories] = await Promise.all([
    db.product.findMany({ where: { deletedAt: null }, include, orderBy: { id: 'asc' } }),
    db.brand.findMany({ orderBy: { id: 'asc' }, select: { id: true, name: true } }),
    db.catalogCategory.findMany({ orderBy: { slug: 'asc' }, select: { slug: true, title: true } }),
  ]);
  const labels = <T>(items: T[], id: (item: T) => string, name: (item: T) => string): Lookup[] => {
    const counts = new Map<string, number>();
    for (const item of items) { const key = name(item).trim().toLowerCase(); counts.set(key, (counts.get(key) ?? 0) + 1); }
    return items.map(item => ({ id: id(item), label: counts.get(name(item).trim().toLowerCase())! > 1 ? `${name(item)} [${id(item)}]` : name(item) }));
  };
  return { products, brands: labels(brands, b => b.id, b => b.name), categories: labels(categories, c => c.slug, c => String(jsonObject(c.title).ar || jsonObject(c.title).en || c.slug)) };
}

function cellString(cell: ExcelJS.Cell): string {
  const v = cell.value;
  if (v == null) return '';
  if (typeof v === 'string' || typeof v === 'number') return String(v);
  if (typeof v === 'object' && 'richText' in v) return v.richText.map(t => t.text).join('');
  throw new Error('يجب أن تكون الخلية نصًا أو رقمًا؛ الصيغ والروابط والقيم المركبة غير مسموحة');
}
/** Bound ZIP expansion before ExcelJS allocates the decompressed workbook. */
function validateZip(buffer: Buffer) {
  if (buffer.length > PRODUCT_UPDATE_MAX_BYTES || buffer.readUInt32LE(0) !== 0x04034b50) throw new ApiError(400, 'update_invalid_file');
  let end = -1;
  for (let i = buffer.length - 22; i >= Math.max(0, buffer.length - 65557); i--) {
    if (buffer.readUInt32LE(i) === 0x06054b50) { end = i; break; }
  }
  if (end < 0) throw new ApiError(400, 'update_invalid_file');
  const count = buffer.readUInt16LE(end + 10), offset = buffer.readUInt32LE(end + 16);
  if (count > 2000) throw new ApiError(400, 'update_invalid_file');
  let cursor = offset, expanded = 0;
  for (let i = 0; i < count; i++) {
    if (cursor + 46 > end || buffer.readUInt32LE(cursor) !== 0x02014b50) throw new ApiError(400, 'update_invalid_file');
    expanded += buffer.readUInt32LE(cursor + 24);
    if (expanded > 40 * 1024 * 1024) throw new ApiError(400, 'update_invalid_file');
    cursor += 46 + buffer.readUInt16LE(cursor + 28) + buffer.readUInt16LE(cursor + 30) + buffer.readUInt16LE(cursor + 32);
  }
}

export async function createUpdateWorkbook(db: Db, config: AppConfig, partNumber = 1, template = false): Promise<Buffer> {
  const data = await exportData(db);
  const parts = partitionUpdateProducts(data.products);
  const part = template ? { products: [], variants: [], rows: 0 } : parts[partNumber - 1];
  if (!part) throw new ApiError(404, 'not_found');
  const metadata: Metadata = { version: PRODUCT_UPDATE_VERSION, id: randomUUID(), products: part.products.map(stampProduct), variants: part.products.flatMap(p => p.variants.map(stampVariant)), brands: data.brands, categories: data.categories, conditions };
  const wb = new ExcelJS.Workbook();
  wb.creator = 'الجيل — تحديث الأصناف'; wb.created = new Date();
  const main = wb.addWorksheet(updateSheets.products, { views: [{ rightToLeft: true, state: 'frozen', ySplit: 2, xSplit: 2 }] });
  const help = wb.addWorksheet(updateSheets.help, { views: [{ rightToLeft: true }] });
  const options = wb.addWorksheet(updateSheets.variants, { views: [{ rightToLeft: true, state: 'frozen', ySplit: 2, xSplit: 3 }] });
  const system = wb.addWorksheet(updateSheets.metadata, { state: 'veryHidden' });
  const serialized = JSON.stringify(metadata);
  system.addRow(['version', PRODUCT_UPDATE_VERSION]); system.addRow(['signature', sign(serialized, config.SESSION_SECRET)]);
  for (let i = 0; i < serialized.length; i += 30000) system.addRow(['metadata', serialized.slice(i, i + 30000)]);
  const instructions = [
    'دليل تحديث الأصناف — اقرأ قبل التعديل',
    '1. صدّر الملف، عدّل الخلايا البيضاء، ثم ارفعه وافحص المعاينة قبل تأكيد الحفظ.',
    '2. الإجراء: تحديث للصنف الموجود، إضافة لصنف بسيط جديد، حذف للحذف المنطقي، تجاهل لترك الصف دون تغيير.',
    '3. حذف صف من الملف لا يحذف الصنف من الموقع. للحذف اختر «حذف» في ورقة الأصناف.',
    '4. تنبيه: تفريغ الوصف أو الاسم الإنجليزي أو السعر أو الضمان يمسح القيمة الحالية! تفريغ الحقول الأساسية غير مسموح.',
    '5. مثال تعديل: اختر البراند أو الفئة من القائمة في صف الصنف، واترك باقي القيم كما صدّرت.',
    '6. مثال إضافة: صف فارغ + إجراء إضافة + اسم عربي + موديل + براند + فئة + حالة + SKU جديد. الكمية الفارغة تعني صفرًا.',
    '7. مثال مسح: أفرغ خلية السعر؛ ستظهر في المعاينة عملية «مسح» قبل الحفظ. الكمية يجب أن تكون عددًا صحيحًا؛ صفر قيمة صحيحة.',
    '8. الأصناف متعددة الخيارات: بيانات الصنف المشتركة هنا، وSKU والسعر والكمية والحالة والضمان لكل خيار في ورقة خيارات الأصناف.',
    '9. الأصناف التي ليس لها خيار تُدار أسعارها وكمياتها من الموقع. الأجهزة بالسيريال: كميتها للعرض فقط.',
    '10. لا تغيّر العناوين أو الأعمدة المخفية. لا تستخدم الصيغ. لا تغيّر بيانات الخيار الرمادية أو نمط تتبع المخزون.',
    '11. الصور والنشر والأرشفة والمواصفات المعقدة والفحص والتوافق وإنشاء الخيارات تُدار من الموقع فقط.',
    '12. الحفظ شامل: خطأ واحد يمنع حفظ الملف كله. عند وجود تعديل أحدث في الموقع أعد التصدير.',
    `13. الحد ${PRODUCT_UPDATE_LIMIT} صف بيانات للأصناف والخيارات معًا. الملفات الكبيرة تُصدَّر أجزاء مستقلة؛ لا تكرر التعديلات المشتركة لصنف موزع على أجزاء.`,
    '14. الصنف الجديد مسودة، والسعر والضمان اختياريان. لا تنشئ براندًا أو فئة من Excel؛ استخدم القوائم التالية.',
  ];
  help.getColumn(1).width = 105;
  instructions.forEach((s, i) => { const r = help.addRow([s]); r.height = i === 0 ? 32 : 40; r.getCell(1).alignment = { wrapText: true, vertical: 'middle' }; r.getCell(1).font = { name: 'Arial', size: 12, bold: i === 0, color: { argb: i === 4 ? 'FFB91C1C' : 'FF1E293B' } }; });
  const listStart = instructions.length + 3;
  const lists = [data.brands.map(v => v.label), data.categories.map(v => v.label), conditions.map(v => v.label), [...updateActions], ['تحديث', 'تجاهل']];
  const listTitles = ['البراندات', 'الفئات', 'حالات الأصناف', 'إجراءات الأصناف', 'إجراءات الخيارات'];
  const names = ['UpdateBrands', 'UpdateCategories', 'UpdateConditions', 'UpdateActions', 'UpdateVariantActions'];
  lists.forEach((list, i) => {
    const col = i + 3; help.getColumn(col).width = i === 1 ? 45 : 35;
    const h = help.getCell(listStart - 1, col); h.value = listTitles[i]; h.font = { bold: true, size: 12 };
    (list.length ? list : ['لا توجد قيم — أضفها من الموقع']).forEach((s, j) => { help.getCell(listStart + j, col).value = s; });
    const letter = help.getColumn(col).letter;
    wb.definedNames.add(`'${updateSheets.help}'!$${letter}$${listStart}:$${letter}$${listStart + Math.max(1, list.length) - 1}`, names[i]);
  });
  const populate = (ws: ExcelJS.Worksheet, cols: UpdateColumn[], rows: Record<string, unknown>[]) => {
    ws.columns = cols.map(c => ({ key: c.key, width: c.width, hidden: c.technical ?? false }));
    ws.mergeCells(1, 1, 1, cols.filter(c => !c.technical).length);
    ws.getCell(1, 1).value = 'عدّل الخلايا البيضاء فقط. تفريغ الحقول الاختيارية يمسحها. راجع ورقة التعليمات ثم افحص الملف في الموقع.';
    ws.getRow(1).height = 42; ws.getCell(1, 1).alignment = { wrapText: true, vertical: 'middle' };
    ws.getCell(1, 1).font = { name: 'Arial', size: 12, bold: true, color: { argb: 'FFB91C1C' } };
    ws.getRow(2).values = cols.map(c => c.title); ws.getRow(2).height = 38;
    ws.getRow(2).eachCell(cell => { cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E40AF' } }; cell.font = { name: 'Arial', size: 12, bold: true, color: { argb: 'FFFFFFFF' } }; cell.alignment = { wrapText: true, horizontal: 'center', vertical: 'middle' }; });
    rows.forEach(values => ws.addRow(cols.map(c => values[c.key] ?? '')));
    for (let n = 3; n <= PRODUCT_UPDATE_LIMIT + 2; n++) {
      const rowData = rows[n - 3];
      cols.forEach((c, i) => {
        const cell = ws.getCell(n, i + 1);
        let locked = Boolean(c.technical || c.readonly);
        if (rowData?.kind !== undefined && rowData.kind !== 'خيار واحد' && ['sku', 'priceUsd', 'quantity'].includes(c.key)) locked = true;
        if (rowData?.inventoryMode === 'بالسيريال — من الموقع' && c.key === 'quantity') locked = true;
        cell.protection = { locked }; cell.font = { name: 'Arial', size: 11, color: { argb: locked ? 'FF64748B' : 'FF0F172A' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: locked ? 'FFF1F5F9' : 'FFFFFFFF' } };
        cell.alignment = { vertical: 'top', wrapText: ['summaryAr', 'summaryEn', 'options'].includes(c.key) };
        if (c.key === 'sku') cell.numFmt = '@';
        if (c.key === 'priceUsd') cell.numFmt = '0.00';
        const listName = { action: ws.name === updateSheets.variants ? 'UpdateVariantActions' : 'UpdateActions', brand: 'UpdateBrands', category: 'UpdateCategories', condition: 'UpdateConditions' }[c.key as 'action' | 'brand' | 'category' | 'condition'];
        if (listName && !locked) cell.dataValidation = { type: 'list', allowBlank: n > rows.length + 2, formulae: [listName], showErrorMessage: true, errorStyle: 'stop', errorTitle: 'قيمة غير مسموحة', error: 'اختر قيمة من القائمة؛ لا تكتب اسمًا مختلفًا.', showInputMessage: true, promptTitle: c.title, prompt: 'اختر من القائمة المرتبطة بورقة التعليمات.' };
        if (!locked && ['quantity', 'warrantyMonths'].includes(c.key)) cell.dataValidation = { type: 'whole', operator: 'between', formulae: [0, c.key === 'quantity' ? 100000 : PRODUCT_UPDATE_WARRANTY_MAX], allowBlank: c.key !== 'quantity' || n > rows.length + 2, showErrorMessage: true, errorStyle: 'stop', error: 'أدخل عددًا صحيحًا غير سالب ضمن الحد المسموح.' };
        if (!locked && c.key === 'priceUsd') cell.dataValidation = { type: 'decimal', operator: 'between', formulae: [0, 999999999999.99], allowBlank: true, showErrorMessage: true, errorStyle: 'stop', error: 'أدخل سعرًا غير سالب؛ تفريغ الخلية يمسح السعر.' };
      });
    }
    ws.autoFilter = { from: { row: 2, column: 1 }, to: { row: Math.max(3, rows.length + 2), column: cols.filter(c => !c.technical).length } };
  };
  populate(main, productUpdateColumns, part.products.map(p => {
    const v = p.variants.length === 1 ? p.variants[0] : undefined;
    return { action: 'تحديث', titleAr: String(jsonObject(p.title).ar ?? ''), titleEn: String(jsonObject(p.title).en ?? ''), summaryAr: String(jsonObject(p.summary).ar ?? ''), summaryEn: String(jsonObject(p.summary).en ?? ''), brand: data.brands.find(b => b.id === p.brandId)?.label, category: data.categories.find(c => c.id === p.category)?.label, model: p.model, condition: conditions.find(c => c.id === p.condition)?.label, warrantyMonths: p.warrantyMonths, sku: v?.sku, priceUsd: v?.priceUsd === null || !v ? null : Number(v.priceUsd), quantity: v ? quantity(v) : '', kind: kind(p), inventoryMode: v ? modeLabel(v) : 'من الموقع', status: statusLabel(p), productId: p.id, variantId: v?.id, revision: p.updatedAt.toISOString(), variantRevision: v?.updatedAt.toISOString() };
  }));
  const byId = new Map(part.products.map(p => [p.id, p]));
  populate(options, variantUpdateColumns, part.variants.map(v => {
    const p = byId.get(v.productId)!;
    return { action: 'تحديث', productName: title(p), options: optionDescription(v), sku: v.sku, priceUsd: v.priceUsd === null ? null : Number(v.priceUsd), quantity: quantity(v), condition: conditions.find(c => c.id === v.condition)?.label, warrantyMonths: v.warrantyMonths, inventoryMode: modeLabel(v), productId: p.id, variantId: v.id, revision: p.updatedAt.toISOString(), variantRevision: v.updatedAt.toISOString() };
  }));
  await main.protect('', { selectLockedCells: true, selectUnlockedCells: true, autoFilter: true, sort: true, spinCount: 1000 });
  await options.protect('', { selectLockedCells: true, selectUnlockedCells: true, autoFilter: true, sort: true, spinCount: 1000 });
  await help.protect('', { selectLockedCells: true, spinCount: 1000 });
  return Buffer.from(await wb.xlsx.writeBuffer());
}

export async function parseUpdateWorkbook(buffer: Buffer, config: AppConfig): Promise<Parsed> {
  if (buffer.length < 22) throw new ApiError(400, 'update_invalid_file');
  validateZip(buffer);
  const wb = new ExcelJS.Workbook();
  try { await wb.xlsx.load(buffer as unknown as Parameters<typeof wb.xlsx.load>[0]); } catch { throw new ApiError(400, 'update_invalid_file'); }
  const system = wb.getWorksheet(updateSheets.metadata);
  if (!system || system.rowCount > 200) throw new ApiError(400, 'update_invalid_template');
  let serialized = '', signature: string;
  try {
    if (cellString(system.getCell(1, 2)) !== String(PRODUCT_UPDATE_VERSION)) throw new Error();
    signature = cellString(system.getCell(2, 2));
    for (let i = 3; i <= system.rowCount; i++) serialized += cellString(system.getCell(i, 2));
  } catch { throw new ApiError(400, 'update_invalid_template'); }
  if (!sameSignature(signature, sign(serialized, config.SESSION_SECRET))) throw new ApiError(400, 'update_invalid_template');
  const metadata = JSON.parse(serialized) as Metadata;
  if (metadata.version !== PRODUCT_UPDATE_VERSION) throw new ApiError(400, 'update_invalid_template');
  const rows: RawRow[] = [], errors: UpdateIssue[] = [];
  for (const [name, columns] of [[updateSheets.products, productUpdateColumns], [updateSheets.variants, variantUpdateColumns]] as const) {
    const sheet = wb.getWorksheet(name);
    if (!sheet || sheet.rowCount > 5000 || sheet.columnCount > columns.length) { errors.push({ sheet: name, row: 2, column: '', message: 'ورقة البيانات مفقودة أو بُنية الملف غير صالحة' }); continue; }
    const positions = new Map<string, number>();
    sheet.getRow(2).eachCell((cell, index) => {
      try {
        const header = cellString(cell).trim();
        if (positions.has(header) || !columns.some(c => c.title === header)) errors.push({ sheet: name, row: 2, column: header, message: 'عنوان عمود مكرر أو غير معروف' });
        positions.set(header, index);
      } catch { errors.push({ sheet: name, row: 2, column: String(index), message: 'عنوان العمود غير صالح' }); }
    });
    for (const column of columns) if (!positions.has(column.title)) errors.push({ sheet: name, row: 2, column: column.title, message: 'عمود مطلوب مفقود؛ أعد تنزيل القالب' });
    if (errors.some(e => e.sheet === name && e.row === 2)) continue;
    sheet.eachRow((row, number) => {
      if (number < 3) return;
      const values: Record<string, string> = {};
      for (const column of columns) {
        try { values[column.key] = cellString(row.getCell(positions.get(column.title)!)); }
        catch (error) { errors.push({ sheet: name, row: number, column: column.title, message: (error as Error).message }); }
      }
      if (Object.values(values).some(v => v.trim() !== '')) rows.push({ sheet: name, row: number, values });
    });
  }
  if (rows.length > PRODUCT_UPDATE_LIMIT) errors.push({ sheet: updateSheets.products, row: 0, column: '', message: `الحد الأقصى ${PRODUCT_UPDATE_LIMIT} صف بيانات للأصناف والخيارات معًا` });
  if (!rows.length && !errors.length) errors.push({ sheet: updateSheets.products, row: 3, column: '', message: 'لا توجد بيانات في الملف' });
  return { metadata, rows, errors };
}

function numberValue(raw: string, key: string, nullable: boolean, allowDefault = false): number | string | null {
  const clean = raw.trim().replace(/[٠-٩]/g, d => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d))).replace(/[۰-۹]/g, d => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d))).replace('٫', '.');
  if (!clean) { if (nullable) return null; if (allowDefault) return 0; throw new Error('لا يمكن تفريغ هذا الحقل؛ أدخل صفرًا إذا أردت كمية صفرية'); }
  if (key === 'priceUsd') {
    if (!/^\d{1,12}(\.\d{1,2})?$/.test(clean)) throw new Error('السعر يجب أن يكون غير سالب وبمنزلتين عشريتين كحد أقصى؛ بدون فواصل آلاف');
    return new Prisma.Decimal(clean).toFixed(2);
  }
  if (!/^\d+$/.test(clean) || !Number.isSafeInteger(Number(clean)) || Number(clean) > (key === 'quantity' ? 100000 : PRODUCT_UPDATE_WARRANTY_MAX)) throw new Error(`أدخل عددًا صحيحًا بين صفر و${key === 'quantity' ? 100000 : PRODUCT_UPDATE_WARRANTY_MAX}`);
  return Number(clean);
}
const publicValue = (value: unknown): string | number | null => value == null ? null : typeof value === 'number' ? value : String(value);

async function validateRows(db: Db, parsed: Parsed, request: FastifyRequest) {
  const errors = [...parsed.errors], previews: UpdatePreviewRow[] = [], summary = emptySummary(), operations: Operation[] = [];
  if (errors.length) return { errors, previews, summary, operations };
  const ids = [...new Set(parsed.rows.map(r => r.values.productId).filter(Boolean))];
  const [products, brands, categories] = await Promise.all([
    db.product.findMany({ where: { id: { in: ids }, deletedAt: null }, include }), db.brand.findMany(), db.catalogCategory.findMany(),
  ]);
  const productMap = new Map(products.map(p => [p.id, p]));
  const seenProducts = new Set<string>(), seenVariants = new Set<string>(), seenSkus = new Map<string, RawRow>();
  const deleting = new Set(parsed.rows.filter(r => r.sheet === updateSheets.products && r.values.action.trim() === 'حذف').map(r => r.values.productId));
  const issue = (source: RawRow, key: string, message: string) => errors.push({ sheet: source.sheet, row: source.row, column: (source.sheet === updateSheets.products ? productUpdateColumns : variantUpdateColumns).find(c => c.key === key)?.title ?? key, message });
  const permission = (source: RawRow, name: 'catalog.edit' | 'catalog.publish' | 'prices.edit' | 'inventory.manage') => {
    const labels = { 'catalog.edit': 'تعديل الأصناف', 'catalog.publish': 'حذف الأصناف', 'prices.edit': 'تعديل الأسعار', 'inventory.manage': 'تعديل المخزون' };
    if (!can(request.auth!.user.role, name)) { issue(source, 'action', `لا تملك صلاحية ${labels[name]} لهذا التغيير`); return false; } return true;
  };
  for (const source of parsed.rows) {
    const values = source.values, action = values.action.trim() as UpdateAction, isMain = source.sheet === updateSheets.products;
    if (!updateActions.includes(action)) { issue(source, 'action', 'اختر إجراءً من القائمة: تحديث، إضافة، حذف، تجاهل'); continue; }
    if (action === 'تجاهل') { summary.ignored++; continue; }
    if (!permission(source, 'catalog.edit')) continue;
    if (!isMain && action !== 'تحديث') { issue(source, 'action', 'ورقة الخيارات تدعم تحديث الخيارات الموجودة أو تجاهلها فقط'); continue; }
    let product: Product | undefined, variant: Variant | undefined;
    if (action === 'إضافة') {
      if (['productId', 'variantId', 'revision', 'variantRevision'].some(k => values[k])) { issue(source, 'action', 'الإضافة تتطلب صفًا جديدًا بدون معرّفات؛ لا تحوّل صفًا موجودًا إلى إضافة'); continue; }
      if (['kind', 'inventoryMode', 'status'].some(k => values[k])) { issue(source, 'kind', 'اترك معلومات النظام الرمادية فارغة في الصف الجديد'); continue; }
    } else {
      product = productMap.get(values.productId);
      const original = parsed.metadata.products.find(p => p.id === values.productId);
      if (!product || !original) { issue(source, 'productId', 'الصنف غير موجود أو معرّفه غير تابع لهذا الملف؛ أعد التصدير'); continue; }
      if (values.revision !== original.revision || productFingerprint(product) !== original.fingerprint) { issue(source, 'revision', 'تغيّر الصنف أو خياراته أو مخزونه منذ التصدير؛ أعد تصدير الملف'); continue; }
      variant = isMain ? (product.variants.length === 1 ? product.variants[0] : undefined) : product.variants.find(v => v.id === values.variantId);
      if (!isMain && (!variant || !parsed.metadata.variants.some(v => v.id === variant!.id && v.productId === product!.id))) { issue(source, 'variantId', 'معرّف الخيار غير صالح لهذا الصنف والملف'); continue; }
      if (values.variantId !== (variant?.id ?? '') || values.variantRevision !== (variant?.updatedAt.toISOString() ?? '')) { issue(source, 'variantId', 'لا تغيّر معرّفات أو إصدارات الخيارات؛ أعد التصدير'); continue; }
      const checkedVariants = action === 'حذف' ? product.variants : variant ? [variant] : [];
      if (checkedVariants.some(v => parsed.metadata.variants.find(s => s.id === v.id)?.fingerprint !== variantFingerprint(v))) { issue(source, 'variantRevision', 'تغيّر الخيار أو مخزونه منذ التصدير؛ أعد تصدير الملف'); continue; }
      if (isMain && seenProducts.has(product.id)) { issue(source, 'productId', 'صف الصنف مكرر في الملف'); continue; }
      if (isMain) seenProducts.add(product.id);
      if (variant && seenVariants.has(variant.id)) { issue(source, 'variantId', 'الخيار مكرر في الملف'); continue; }
      if (variant) seenVariants.add(variant.id);
    }
    const op: Operation = { source, action, product, variant, productData: {}, variantData: {} }, changes: UpdateChange[] = [];
    const addChange = (key: string, before: unknown, after: unknown, target: Record<string, unknown>, targetKey = key, label?: string) => {
      if (publicValue(before) === publicValue(after)) return;
      target[targetKey] = after;
      changes.push({ column: label ?? (isMain ? productUpdateColumns : variantUpdateColumns).find(c => c.key === key)?.title ?? key, before: publicValue(before), after: publicValue(after), cleared: after === null || after === '' });
    };
    if (action === 'حذف') {
      if (!permission(source, 'catalog.publish')) continue;
      changes.push({ column: 'الصنف', before: title(product!), after: 'حذف منطقي', cleared: false });
      summary.deleted++; previews.push({ sheet: source.sheet, row: source.row, action, productName: title(product!), changes }); operations.push(op); continue;
    }
    const errorCount = errors.length;
    const readText = (key: string, max: number, required: boolean) => {
      const v = values[key].trim();
      if (required && !v) issue(source, key, 'حقل أساسي لا يمكن تفريغه');
      if (v.length > max) issue(source, key, `الحد الأقصى ${max} حرف`);
      return v;
    };
    const choose = (key: string, choices: Lookup[]) => {
      const choice = choices.find(v => v.label === values[key].trim());
      if (!choice) issue(source, key, 'اختر قيمة صالحة من قائمة الملف؛ القيم غير المعروفة لا تُستبدل تلقائيًا');
      return choice?.id;
    };
    const readNumber = (key: string, nullable: boolean) => {
      try { return numberValue(values[key], key, nullable, action === 'إضافة' && key === 'quantity'); }
      catch (error) { issue(source, key, (error as Error).message); return undefined; }
    };
    if (isMain) {
      if (product && (values.kind !== kind(product) || values.inventoryMode !== (variant ? modeLabel(variant) : 'من الموقع') || values.status !== statusLabel(product))) issue(source, 'kind', 'معلومات النظام الرمادية للعرض فقط؛ لا تغيّرها');
      const oldTitle = jsonObject(product?.title), oldSummary = jsonObject(product?.summary);
      const newTitle = { ...oldTitle }, newSummary = { ...oldSummary };
      for (const [key, language, target, old] of [['titleAr', 'ar', newTitle, oldTitle], ['titleEn', 'en', newTitle, oldTitle], ['summaryAr', 'ar', newSummary, oldSummary], ['summaryEn', 'en', newSummary, oldSummary]] as const) {
        const value = readText(key, 4000, key === 'titleAr');
        addChange(key, old[language] ?? '', value, target, language);
        target[language] = value;
      }
      if (changes.some(c => c.column.startsWith('اسم الصنف')) || action === 'إضافة') op.productData.title = newTitle;
      if (changes.some(c => c.column.startsWith('الوصف')) || action === 'إضافة') op.productData.summary = newSummary;
      const model = readText('model', 200, true);
      addChange('model', product?.model, model, op.productData);
      const brandId = choose('brand', parsed.metadata.brands), category = choose('category', parsed.metadata.categories);
      if (brandId && !brands.some(b => b.id === brandId)) issue(source, 'brand', 'البراند حُذف من الموقع؛ أعد التصدير');
      if (category && !categories.some(c => c.slug === category)) issue(source, 'category', 'الفئة حُذفت من الموقع؛ أعد التصدير');
      if (brandId && product?.brandId !== brandId) { op.productData.brandId = brandId; changes.push({ column: 'البراند', before: product ? `${brands.find(b => b.id === product.brandId)?.name ?? ''} [${product.brandId}]` : null, after: values.brand.trim(), cleared: false }); }
      if (category && product?.category !== category) { op.productData.category = category; changes.push({ column: 'الفئة', before: product ? parsed.metadata.categories.find(c => c.id === product.category)?.label ?? product.category : null, after: values.category.trim(), cleared: false }); }
      if (!variant && product) {
        for (const key of ['sku', 'priceUsd', 'quantity']) if (values[key] !== '') issue(source, key, 'عدّل هذا الحقل من ورقة الخيارات أو من الموقع');
      }
    } else {
      if (values.productName !== title(product!) || values.options !== optionDescription(variant!) || values.inventoryMode !== modeLabel(variant)) issue(source, 'options', 'وصف الخيار واسم الصنف ونمط التتبع للعرض فقط');
    }
    const condition = choose('condition', parsed.metadata.conditions);
    if (condition) {
      addChange('condition', isMain ? product?.condition : variant?.condition, condition, isMain ? op.productData : op.variantData);
      if (isMain && variant && product?.condition !== condition) op.variantData.condition = condition;
    }
    const warranty = readNumber('warrantyMonths', true);
    if (warranty !== undefined) {
      addChange('warrantyMonths', isMain ? product?.warrantyMonths : variant?.warrantyMonths, warranty, isMain ? op.productData : op.variantData);
      if (isMain && variant && product?.warrantyMonths !== warranty) op.variantData.warrantyMonths = warranty;
    }
    if (variant || action === 'إضافة') {
      const sku = readText('sku', 100, true);
      if (variant?.sku !== sku && !/^[a-zA-Z0-9_-]{1,100}$/.test(sku)) issue(source, 'sku', 'رقم المرجع الجديد يقبل الحروف الإنجليزية والأرقام والشرطة والشرطة السفلية فقط');
      addChange('sku', variant?.sku, sku, op.variantData);
      if (seenSkus.has(sku)) issue(source, 'sku', 'رقم المرجع مكرر في الملف'); else seenSkus.set(sku, source);
      const price = readNumber('priceUsd', true);
      if (price !== undefined) {
        const oldPrice = variant?.priceUsd?.toFixed(2) ?? null;
        addChange('priceUsd', oldPrice, price, op.variantData);
        if (isMain && oldPrice !== price) op.productData.priceUsd = price;
        if (oldPrice !== price) permission(source, 'prices.edit');
      }
      const qty = readNumber('quantity', false);
      if (qty !== undefined) {
        if (variant?.inventoryMode === 'serialized') {
          if (qty !== quantity(variant)) issue(source, 'quantity', 'كمية الأجهزة بالسيريال للعرض فقط؛ عدّلها من شاشة المخزون');
        } else {
          addChange('quantity', variant?.quantity, qty, op.variantData);
          if (variant?.quantity !== qty && (variant || qty !== 0)) permission(source, 'inventory.manage');
        }
      }
      if (action === 'إضافة') {
        op.variantData = { ...op.variantData, sku, condition, warrantyMonths: warranty ?? null, priceUsd: price ?? null, quantity: qty ?? 0 };
        op.productData = { ...op.productData, condition, warrantyMonths: warranty ?? null, priceUsd: price ?? null };
      }
    }
    if (product?.status === 'published' && (op.productData.category || op.productData.brandId)) {
      const nextBrand = brands.find(b => b.id === (op.productData.brandId ?? product!.brandId));
      const nextCategory = categories.find(c => c.slug === (op.productData.category ?? product!.category));
      if (!nextBrand?.published) issue(source, 'brand', 'الصنف منشور؛ يجب أن يكون البراند منشورًا');
      if (nextCategory?.status !== 'published') issue(source, 'category', 'الصنف منشور؛ يجب أن تكون الفئة منشورة');
      const fields = await effectiveFields(db, { category: String(op.productData.category ?? product.category), productTypeId: product.productTypeId });
      if (product.variants.some(v => validateSpecs(fields, { ...jsonObject(product!.specs), ...jsonObject(v.specs), ...jsonObject(v.options) }, true).length)) issue(source, 'category', 'الفئة الجديدة تتطلب مواصفات إضافية؛ أكمل التعديل من الموقع');
    }
    if (!isMain && deleting.has(product!.id) && changes.length) issue(source, 'action', 'لا يمكن حذف الصنف وتعديل أحد خياراته في الملف نفسه');
    if (errors.length > errorCount) continue;
    if (!changes.length && action !== 'إضافة') { summary.unchanged++; continue; }
    if (action === 'إضافة') summary.added++; else summary.updated++;
    summary.cleared += changes.filter(c => c.cleared).length;
    previews.push({ sheet: source.sheet, row: source.row, action, productName: product ? title(product) : values.titleAr.trim(), changes }); operations.push(op);
  }
  if (seenSkus.size) {
    const existing = await db.productVariant.findMany({ where: { sku: { in: [...seenSkus.keys()] } }, select: { sku: true, id: true } });
    for (const v of existing) {
      const source = seenSkus.get(v.sku)!;
      if (source.values.variantId !== v.id) issue(source, 'sku', 'رقم المرجع مستخدم لصنف أو خيار آخر؛ اختر رقمًا غير مستخدم');
    }
  }
  return { errors, previews, summary, operations };
}

function previewToken(config: AppConfig, parsed: Parsed, fileHash: string, userId: string, expires: number) {
  const payload = `${parsed.metadata.id}:${fileHash}:${userId}:${expires}`;
  return `${expires}.${sign(payload, config.SESSION_SECRET)}`;
}
function verifyPreview(config: AppConfig, parsed: Parsed, hash: string, userId: string, token: string) {
  const [expiry, signature] = token.split('.');
  const expires = Number(expiry);
  if (!Number.isSafeInteger(expires) || expires < Date.now() || expires > Date.now() + 31 * 60000 || !signature || !sameSignature(signature, previewToken(config, parsed, hash, userId, expires).split('.')[1])) throw new ApiError(409, 'update_preview_expired');
}
async function lockRows(tx: Prisma.TransactionClient, ids: string[]) {
  if (!ids.length) return;
  // Lock in a fixed order; stock/order writers use these same database rows.
  const list = Prisma.join([...new Set(ids)].sort());
  await tx.$queryRaw(Prisma.sql`SELECT id FROM Product WHERE id IN (${list}) ORDER BY id FOR UPDATE`);
  await tx.$queryRaw(Prisma.sql`SELECT id FROM ProductVariant WHERE productId IN (${list}) ORDER BY id FOR UPDATE`);
  await tx.$queryRaw(Prisma.sql`SELECT u.id FROM InventoryUnit u JOIN ProductVariant v ON v.id=u.variantId WHERE v.productId IN (${list}) ORDER BY u.id FOR UPDATE`);
}
async function applyOperations(tx: Prisma.TransactionClient, config: AppConfig, request: FastifyRequest, operations: Operation[]) {
  for (const op of operations) {
    const { product, variant, productData, variantData } = op;
    if (op.action === 'حذف') {
      await tx.product.update({ where: { id: product!.id }, data: { deletedAt: new Date(), status: 'archived' } });
      await audit(tx, config, request, { action: 'catalog.excel_v2_deleted', entity: 'Product', entityId: product!.id, before: { status: product!.status, deletedAt: null }, after: { deletedAt: new Date(), status: 'archived' } });
      continue;
    }
    if (op.action === 'إضافة') {
      const id = randomUUID(), variantId = randomUUID();
      const model = String(productData.model), slug = `item-${id}`;
      await tx.product.create({ data: { id, slug, category: String(productData.category), brandId: String(productData.brandId), model, title: productData.title as Prisma.InputJsonValue, summary: productData.summary as Prisma.InputJsonValue, condition: productData.condition as Product['condition'], warrantyMonths: productData.warrantyMonths as number | null, priceUsd: productData.priceUsd as string | null, priceUpdatedAt: productData.priceUsd == null ? null : new Date(), status: 'draft', specs: {}, inspection: { passed: false, date: null, notes: { ar: '', en: '' } }, specSources: [], bestFor: [], tags: [] } });
      await tx.productVariant.create({ data: { id: variantId, productId: id, sku: String(variantData.sku), optionKey: '[]', options: {}, specs: {}, images: [], condition: variantData.condition as Product['condition'], warrantyMonths: variantData.warrantyMonths as number | null, priceUsd: variantData.priceUsd as string | null, quantity: Number(variantData.quantity), inventoryMode: 'quantity', inventoryReviewed: true } });
      if (Number(variantData.quantity)) await tx.inventoryMovement.create({ data: { variantId, delta: Number(variantData.quantity), reason: 'Excel — إضافة صنف', userId: request.auth!.user.id } });
      if (productData.priceUsd != null) await tx.priceHistory.create({ data: { productId: id, priceUsd: productData.priceUsd as string, changedBy: request.auth!.user.id, reason: `excel_v2_add:${variantId}` } });
      await audit(tx, config, request, { action: 'catalog.excel_v2_created', entity: 'Product', entityId: id, after: { ...productData, variant: variantData } });
      continue;
    }
    if (Object.keys(productData).length) {
      if (productData.category && product!.publishedAt && product!.category !== productData.category) await tx.productRedirect.upsert({ where: { path: `${product!.category}/${product!.slug}` }, create: { path: `${product!.category}/${product!.slug}`, productId: product!.id }, update: { productId: product!.id } });
      if ('priceUsd' in productData) { productData.priceUpdatedAt = new Date(); await tx.priceHistory.create({ data: { productId: product!.id, priceUsd: productData.priceUsd as string | null, priceYer: product!.priceYer, changedBy: request.auth!.user.id, reason: `excel_v2_variant:${variant!.id}` } }); }
      const before = Object.fromEntries(Object.keys(productData).map(key => [key, product![key as keyof Product]]));
      await tx.product.update({ where: { id: product!.id }, data: productData as Prisma.ProductUpdateInput });
      await audit(tx, config, request, { action: 'catalog.excel_v2_updated', entity: 'Product', entityId: product!.id, before, after: productData });
    }
    if (variant && Object.keys(variantData).length) {
      if ('priceUsd' in variantData && !('priceUsd' in productData)) await tx.priceHistory.create({ data: { productId: product!.id, priceUsd: variantData.priceUsd as string | null, changedBy: request.auth!.user.id, reason: `excel_v2_variant:${variant.id}` } });
      const before = Object.fromEntries(Object.keys(variantData).map(key => [key, variant[key as keyof Variant]]));
      await tx.productVariant.update({ where: { id: variant.id }, data: variantData as Prisma.ProductVariantUpdateInput });
      if ('quantity' in variantData) await tx.inventoryMovement.create({ data: { variantId: variant.id, delta: Number(variantData.quantity) - variant.quantity, reason: 'Excel — تحديث الكمية', userId: request.auth!.user.id } });
      await audit(tx, config, request, { action: 'catalog.excel_v2_updated', entity: 'ProductVariant', entityId: variant.id, before, after: variantData });
    }
  }
}

export async function inspectProductUpdates(db: PrismaClient, config: AppConfig, request: FastifyRequest, commit = false): Promise<ProductUpdateResponse> {
  const input = z.object({ file: z.string().max(Math.ceil(PRODUCT_UPDATE_MAX_BYTES / 3) * 4).regex(/^[A-Za-z0-9+/]+={0,2}$/), previewToken: z.string().max(200).optional() }).strict().parse(request.body);
  const buffer = Buffer.from(input.file, 'base64');
  const hash = createHash('sha256').update(buffer).digest('hex');
  const parsed = await parseUpdateWorkbook(buffer, config);
  const userId = request.auth!.user.id;
  if (!commit) {
    const result = await validateRows(db, parsed, request);
    return { errors: result.errors, previews: result.previews, summary: result.summary, committed: false, ...(!result.errors.length ? { previewToken: previewToken(config, parsed, hash, userId, Date.now() + 30 * 60000) } : {}) };
  }
  verifyPreview(config, parsed, hash, userId, input.previewToken ?? '');
  const receiptId = `excel-v2-${parsed.metadata.id}`;
  const readReceipt = async (client: Db): Promise<ProductUpdateResponse | null> => {
    const receipt = await client.auditLog.findUnique({ where: { id: receiptId } });
    if (!receipt) return null;
    const after = jsonObject(receipt.after);
    if (after.fileHash !== hash || receipt.userId !== userId) throw new ApiError(409, 'update_file_consumed');
    return { errors: [], previews: [], summary: after.summary as UpdateSummary, committed: true, replayed: true };
  };
  const previous = await readReceipt(db);
  if (previous) return previous;
  let result: ProductUpdateResponse;
  try {
    result = await transaction(db, async tx => {
      await lockRows(tx, parsed.rows.filter(r => r.values.action !== 'تجاهل').map(r => r.values.productId).filter(Boolean));
      const previous = await readReceipt(tx); if (previous) return previous;
      const checked = await validateRows(tx, parsed, request);
      if (checked.errors.length) return { errors: checked.errors, previews: checked.previews, summary: checked.summary, committed: false };
      // The receipt's unique primary key also serializes concurrent, new-product-only uploads.
      await tx.auditLog.create({ data: { id: receiptId, userId, action: 'catalog.excel_v2_committed', entity: 'ExcelImport', entityId: parsed.metadata.id, after: { fileHash: hash, summary: checked.summary } } });
      await applyOperations(tx, config, request, checked.operations);
      return { errors: [], previews: checked.previews, summary: checked.summary, committed: true };
    }, 'Serializable', { timeoutMs: 120000 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      const receipt = await readReceipt(db); if (receipt) return receipt;
      throw new ApiError(409, 'update_conflict');
    }
    throw error;
  }
  if (result.committed) { invalidateCatalogCache(); invalidateBootstrapCache(); }
  return result;
}

export async function productUpdateRoutes(app: FastifyInstance, db: PrismaClient, config: AppConfig) {
  const catalog = { permission: 'catalog.edit' as const };
  app.get('/commerce/excel/v2/parts', { config: catalog }, async () => {
    const data = await exportData(db);
    return { parts: partitionUpdateProducts(data.products).map((p, i) => ({ part: i + 1, rows: p.rows })) };
  });
  app.get('/commerce/excel/v2/export', { config: catalog }, async (request, reply) => {
    const { part } = z.object({ part: z.coerce.number().int().min(1).default(1) }).parse(request.query);
    const buffer = await createUpdateWorkbook(db, config, part);
    return reply.type('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet').header('Content-Disposition', `attachment; filename="product-updates-${part}.xlsx"`).send(buffer);
  });
  app.get('/commerce/excel/v2/template', { config: catalog }, async (_request, reply) => {
    const buffer = await createUpdateWorkbook(db, config, 1, true);
    return reply.type('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet').header('Content-Disposition', 'attachment; filename="product-updates-template.xlsx"').send(buffer);
  });
  app.post('/commerce/excel/v2/preview', { config: catalog, bodyLimit: 7 * 1024 * 1024 }, request => inspectProductUpdates(db, config, request));
  app.post('/commerce/excel/v2/commit', { config: catalog, bodyLimit: 7 * 1024 * 1024 }, request => inspectProductUpdates(db, config, request, true));
}
