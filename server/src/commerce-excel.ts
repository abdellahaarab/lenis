import ExcelJS from 'exceljs';
import { Prisma, type PrismaClient } from '@prisma/client';
import type { FastifyRequest } from 'fastify';
import { z } from 'zod';
import { createHash, randomUUID } from 'node:crypto';
import { transaction } from './db.js';
import { audit } from './audit.js';
import { ApiError } from './errors.js';
import { jsonObject } from './commerce-catalog.js';
import type { AppConfig } from './config.js';

// ═══════════════════════════════════════════════════════
//  Column definitions – shared between template & parser
// ═══════════════════════════════════════════════════════

interface ColDef {
  key: string;
  header: string;
  width: number;
}

const TEMPLATE_COLUMNS: ColDef[] = [
  { key: 'sku',           header: 'رقم المرجع (SKU)',                  width: 26 },
  { key: 'titleAr',       header: 'اسم الصنف بالعربي',                 width: 36 },
  { key: 'titleEn',       header: 'اسم الصنف بالإنجليزي',               width: 36 },
  { key: 'quantity',      header: 'الكمية',                            width: 12 },
  { key: 'priceUsd',      header: 'السعر بالدولار',                     width: 16 },
  { key: 'category',      header: 'الفئة',                             width: 20 },
  { key: 'brandId',       header: 'العلامة التجارية',                   width: 20 },
  { key: 'model',         header: 'الموديل',                           width: 22 },
  { key: 'condition',     header: 'الحالة (new/A/B/C)',                 width: 18 },
  { key: 'summaryAr',     header: 'الوصف بالعربي',                      width: 40 },
  { key: 'summaryEn',     header: 'الوصف بالإنجليزي',                    width: 40 },
  { key: 'inventoryMode', header: 'نمط التتبع (quantity/serialized)',    width: 24 },
];

// Arabic header → key mapping (built once)
const HEADER_MAP = new Map<string, string>();
for (const col of TEMPLATE_COLUMNS) {
  HEADER_MAP.set(col.header, col.key);
  HEADER_MAP.set(col.header.trim(), col.key);
}
// Alternate Arabic headers & accounting synonyms
HEADER_MAP.set('رقم المرجع', 'sku');
HEADER_MAP.set('المرجع', 'sku');
HEADER_MAP.set('مرجع الصنف', 'sku');
HEADER_MAP.set('مرجع', 'sku');
HEADER_MAP.set('رقم صنف', 'sku');
HEADER_MAP.set('رقم الصنف', 'sku');
HEADER_MAP.set('كود الصنف', 'sku');
HEADER_MAP.set('رمز الصنف', 'sku');
HEADER_MAP.set('كود', 'sku');
HEADER_MAP.set('الرمز', 'sku');
HEADER_MAP.set('رمز', 'sku');
HEADER_MAP.set('باركود', 'sku');
HEADER_MAP.set('الباركود', 'sku');
HEADER_MAP.set('رقم الباركود', 'sku');
HEADER_MAP.set('اسم الصنف', 'titleAr');
HEADER_MAP.set('اسم المنتج', 'titleAr');
HEADER_MAP.set('الاسم', 'titleAr');
HEADER_MAP.set('الصنف', 'titleAr');
HEADER_MAP.set('البيان', 'titleAr');
HEADER_MAP.set('الكمية المتوفرة', 'quantity');
HEADER_MAP.set('الكميه', 'quantity');
HEADER_MAP.set('الرصيد', 'quantity');
HEADER_MAP.set('المخزون', 'quantity');
HEADER_MAP.set('رقم الصنف في الموقع', 'productId');
HEADER_MAP.set('معرف الصنف', 'productId');
HEADER_MAP.set('معرف المنتج', 'productId');
// English fallback headers for backward compat
const ENGLISH_MAP: Record<string, string> = {
  sku: 'sku', SKU: 'sku', Sku: 'sku',
  code: 'sku', item_code: 'sku', 'item code': 'sku', barcode: 'sku', ref: 'sku', reference: 'sku',
  productid: 'productId', productId: 'productId', 'product id': 'productId',
  titlear: 'titleAr', titleAr: 'titleAr', 'title ar': 'titleAr', name: 'titleAr', 'item name': 'titleAr',
  titleen: 'titleEn', titleEn: 'titleEn', 'title en': 'titleEn',
  quantity: 'quantity', qty: 'quantity', stock: 'quantity',
  priceusd: 'priceUsd', priceUsd: 'priceUsd', price: 'priceUsd', 'price usd': 'priceUsd',
  category: 'category',
  brandid: 'brandId', brandId: 'brandId', brand: 'brandId',
  model: 'model',
  condition: 'condition',
  summaryar: 'summaryAr', summaryAr: 'summaryAr',
  summaryen: 'summaryEn', summaryEn: 'summaryEn',
  inventorymode: 'inventoryMode', inventoryMode: 'inventoryMode',
};

/** Resolve a user-visible header to a canonical column key. */
function resolveHeader(raw: string): string | null {
  const h = raw.trim().replace(/^\uFEFF/, '');
  return HEADER_MAP.get(h) ?? ENGLISH_MAP[h] ?? ENGLISH_MAP[h.toLowerCase()] ?? null;
}

// ═══════════════════════════════════════════════════════
//  1. Generate empty Arabic Excel template
// ═══════════════════════════════════════════════════════

export async function generateTemplate(type?: string): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'الجيل - نظام إدارة المخزون';
  wb.created = new Date();

  let columns = TEMPLATE_COLUMNS;
  let bannerText = '⬇ المطلوب إجباري: رقم المرجع (SKU) واسم الصنف. الحقول الفارغة الأخرى لن تُعدّل وسيقوم النظام بتحديثها أو إنشائها تلقائياً.';
  let sheetTitle = 'قالب الأصناف';

  if (type === 'price_stock') {
    columns = [
      { key: 'sku', header: 'رقم المرجع (SKU)', width: 26 },
      { key: 'titleAr', header: 'اسم الصنف بالعربي', width: 36 },
      { key: 'quantity', header: 'الكمية المتوفرة', width: 16 },
      { key: 'priceUsd', header: 'السعر بالدولار', width: 18 },
    ];
    bannerText = '⚡ قالب التحديث السريع للمخزون والأسعار: ادخل رقم المرجع والكمية والسعر لتحديث الأصناف المطابقة فوراً.';
    sheetTitle = 'تحديث الأسعار والمخزون';
  } else if (type === 'yemensoft') {
    columns = [
      { key: 'sku', header: 'رقم الصنف (SKU)', width: 26 },
      { key: 'titleAr', header: 'البيان (اسم الصنف)', width: 36 },
      { key: 'quantity', header: 'رصيد المخزون', width: 16 },
      { key: 'priceUsd', header: 'سعر البيع نقدا ($)', width: 18 },
    ];
    bannerText = '📘 قالب متوافق مع نظام المتكامل / يمن سوفت (Onyx Pro): مطابق لمسميات تقارير أرصدة الأصناف والأسعار.';
    sheetTitle = 'يمن سوفت المتكامل';
  } else if (type === 'ebssar') {
    columns = [
      { key: 'sku', header: 'رمز الصنف', width: 26 },
      { key: 'titleAr', header: 'الصنف', width: 36 },
      { key: 'quantity', header: 'الكمية', width: 16 },
      { key: 'priceUsd', header: 'سعر البيع', width: 18 },
    ];
    bannerText = '📗 قالب متوافق مع نظام إبصار / سماك: مخصص لاستيراد أرصدة الجرد اليومي والتحديث الدوري.';
    sheetTitle = 'إبصار سماك';
  }

  // ── Main data sheet ──
  const ws = wb.addWorksheet(sheetTitle, {
    views: [{ rightToLeft: true, state: 'frozen', ySplit: 2 }],
    properties: { defaultColWidth: 18 },
  });

  // Row 1 – instruction banner
  const instrRow = ws.addRow([bannerText]);
  ws.mergeCells(1, 1, 1, columns.length);
  instrRow.height = 38;
  const instrCell = instrRow.getCell(1);
  instrCell.font = { bold: true, size: 12, color: { argb: 'FF1A56DB' } };
  instrCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEEF2FF' } };
  instrCell.alignment = { horizontal: 'right', vertical: 'middle', wrapText: true, readingOrder: 'rtl' as any };

  // Row 2 – column headers
  const headerRow = ws.addRow(columns.map(c => c.header));
  headerRow.height = 30;
  headerRow.eachCell((cell, colNum) => {
    cell.font = { bold: true, size: 11, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E40AF' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true, readingOrder: 'rtl' as any };
    cell.border = {
      top: { style: 'thin' }, bottom: { style: 'thin' },
      left: { style: 'thin' }, right: { style: 'thin' },
    };
    ws.getColumn(colNum).width = columns[colNum - 1]?.width ?? 18;
  });

  // 50 empty rows with light grid
  for (let i = 0; i < 50; i++) {
    const r = ws.addRow(columns.map(() => ''));
    r.eachCell({ includeEmpty: true }, (cell) => {
      cell.border = { bottom: { style: 'hair', color: { argb: 'FFE5E7EB' } } };
      cell.alignment = { readingOrder: 'rtl' as any };
    });
  }

  // ── Help sheet ──
  const help = wb.addWorksheet('دليل الاستخدام', {
    views: [{ rightToLeft: true }],
  });
  help.getColumn(1).width = 90;
  const instructions = [
    '📋 دليل استخدام قالب استيراد الأصناف',
    '',
    '1️⃣  رقم المرجع (SKU): إجباري — هو رقم الصنف في نظامك المحاسبي. يتم الاعتماد عليه كلياً لمطابقة وتحديث المخزون والأسعار والبيانات.',
    '2️⃣  اسم الصنف: إجباري — الاسم بالعربي أو الإنجليزي لتمييز الصنف وربطه بالمنتج.',
    '3️⃣  رقم الصنف في الموقع: لا داعي له نهائياً؛ يولد تلقائياً وآلياً بواسطة النظام لكل صنف.',
    '4️⃣  الحقول الفارغة: لن يتم تعديلها أو مسحها في الموقع — فقط الحقول التي تحتوي على قيم سيتم تحديثها.',
    '5️⃣  إنشاء صنف جديد: إذا لم يكن رقم المرجع موجوداً مسبقاً، سيتم إنشاء الصنف آلياً في النظام كمسودة وتوليد معرفاته تلقائياً.',
    '',
    '📌 الفئات المتاحة: laptops, displays, audio, gaming, network, storage, power, hard-drives, accessories, printers, cameras',
    '📌 حالة الصنف: new (جديد), A (ممتاز), B (جيد), C (مقبول)',
    '📌 نمط التتبع: quantity (بالكمية — الافتراضي), serialized (بأرقام تسلسلية)',
    '',
    '⚠️ ملاحظات مهمة:',
    '   • الحد الأقصى: 1000 صف في كل عملية استيراد.',
    '   • يتم تسجيل جميع حركات المخزون والأسعار تلقائياً في سجل المراقبة (Audit Log).',
    '   • استخدم "تصدير الكتالوج" لتنزيل بيانات الأصناف الحالية مع أرقام مراجعها SKU.',
  ];
  instructions.forEach((text, i) => {
    const r = help.addRow([text]);
    if (i === 0) r.getCell(1).font = { bold: true, size: 14, color: { argb: 'FF1E40AF' } };
    else if (text.startsWith('⚠️')) r.getCell(1).font = { bold: true, size: 12, color: { argb: 'FFDC2626' } };
    else if (text.startsWith('📌')) r.getCell(1).font = { size: 11, color: { argb: 'FF059669' } };
  });

  return Buffer.from(await wb.xlsx.writeBuffer());
}

// ═══════════════════════════════════════════════════════
//  2. Export current catalog to Excel, CSV, or JSON
// ═══════════════════════════════════════════════════════

export interface ExportCatalogQuery {
  scope?: 'catalog' | 'pricing_stock' | 'inventory_audit' | 'orders' | 'customers';
  category?: string;
  brandId?: string;
  status?: string;
  stockStatus?: string;
  format?: 'xlsx' | 'csv' | 'json';
}

export interface ExportResult {
  buffer: Buffer;
  contentType: string;
  filename: string;
}

function toCsv(headers: string[], rows: (string | number | undefined | null)[][]): Buffer {
  const escapeCell = (c: unknown) => {
    if (c == null) return '';
    const s = String(c);
    if (s.includes('"') || s.includes(',') || s.includes('\n') || s.includes('\r')) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };
  const headerLine = headers.map(escapeCell).join(',');
  const rowLines = rows.map(r => r.map(escapeCell).join(','));
  const csvText = '\uFEFF' + [headerLine, ...rowLines].join('\r\n');
  return Buffer.from(csvText, 'utf8');
}

export async function exportCatalogExcel(
  db: PrismaClient,
  query?: ExportCatalogQuery,
): Promise<ExportResult> {
  const scope = query?.scope || 'catalog';
  const format = query?.format || 'xlsx';
  const today = new Date().toISOString().slice(0, 10);

  // ──────────────────────────────────────────
  // Scope: ORDERS
  // ──────────────────────────────────────────
  if (scope === 'orders') {
    const orders = await db.commerceOrder.findMany({
      orderBy: { createdAt: 'desc' },
      take: 2000,
    });
    const headers = [
      'رقم الطلب', 'اسم العميل', 'رقم الهاتف', 'المدينة', 'الإجمالي ($)', 'الإجمالي (ريال)', 'الحالة', 'تاريخ الطلب'
    ];
    const dataRows = orders.map(o => {
      const snap = jsonObject(o.customerSnapshot);
      const ful = jsonObject(o.fulfillment);
      return [
        o.number || o.id,
        String(snap.name || 'عميل'),
        String(snap.phone || ''),
        String(ful.city || 'صنعاء'),
        Number(o.totalUsd).toFixed(2),
        o.totalYer ? Number(o.totalYer).toLocaleString('en-US') : '',
        o.status,
        o.createdAt.toISOString().slice(0, 19).replace('T', ' '),
      ];
    });

    if (format === 'csv') {
      return {
        buffer: toCsv(headers, dataRows),
        contentType: 'text/csv; charset=utf-8',
        filename: `orders-${today}.csv`,
      };
    }
    if (format === 'json') {
      return {
        buffer: Buffer.from(JSON.stringify(orders, null, 2), 'utf8'),
        contentType: 'application/json',
        filename: `orders-${today}.json`,
      };
    }

    const wb = new ExcelJS.Workbook();
    wb.creator = 'الجيل - تصدير الطلبات';
    const ws = wb.addWorksheet('الطلبات', { views: [{ rightToLeft: true, state: 'frozen', ySplit: 1 }] });
    const hRow = ws.addRow(headers);
    hRow.height = 28;
    hRow.eachCell((c, colNum) => {
      c.font = { bold: true, size: 11, color: { argb: 'FFFFFFFF' } };
      c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2563EB' } };
      c.alignment = { horizontal: 'center', vertical: 'middle', readingOrder: 'rtl' as any };
      ws.getColumn(colNum).width = 20;
    });
    for (const r of dataRows) ws.addRow(r);
    return {
      buffer: Buffer.from(await wb.xlsx.writeBuffer()),
      contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      filename: `orders-${today}.xlsx`,
    };
  }

  // ──────────────────────────────────────────
  // Scope: CUSTOMERS
  // ──────────────────────────────────────────
  if (scope === 'customers') {
    const customers = await db.customerAccount.findMany({
      orderBy: { createdAt: 'desc' },
      take: 2000,
    });
    const headers = ['معرف الحساب', 'اسم العميل', 'رقم الهاتف', 'مفعل', 'تاريخ الانضمام'];
    const dataRows = customers.map(c => [
      c.id,
      c.name,
      c.phone,
      c.active ? 'نعم' : 'لا',
      c.createdAt.toISOString().slice(0, 10),
    ]);

    if (format === 'csv') {
      return {
        buffer: toCsv(headers, dataRows),
        contentType: 'text/csv; charset=utf-8',
        filename: `customers-${today}.csv`,
      };
    }
    if (format === 'json') {
      return {
        buffer: Buffer.from(JSON.stringify(customers, null, 2), 'utf8'),
        contentType: 'application/json',
        filename: `customers-${today}.json`,
      };
    }

    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('العملاء', { views: [{ rightToLeft: true, state: 'frozen', ySplit: 1 }] });
    const hRow = ws.addRow(headers);
    hRow.height = 28;
    hRow.eachCell((c, colNum) => {
      c.font = { bold: true, size: 11, color: { argb: 'FFFFFFFF' } };
      c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F46E5' } };
      c.alignment = { horizontal: 'center', vertical: 'middle', readingOrder: 'rtl' as any };
      ws.getColumn(colNum).width = 24;
    });
    for (const r of dataRows) ws.addRow(r);
    return {
      buffer: Buffer.from(await wb.xlsx.writeBuffer()),
      contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      filename: `customers-${today}.xlsx`,
    };
  }

  // ──────────────────────────────────────────
  // Scopes: CATALOG / PRICING_STOCK / INVENTORY_AUDIT
  // ──────────────────────────────────────────
  const whereClause: Prisma.ProductVariantWhereInput = { active: true };
  if (query?.stockStatus === 'inStock') {
    whereClause.quantity = { gt: 0 };
  } else if (query?.stockStatus === 'outOfStock') {
    whereClause.quantity = 0;
  }

  const productWhere: Prisma.ProductWhereInput = {};
  if (query?.category && query.category !== 'all') {
    productWhere.category = query.category;
  }
  if (query?.brandId && query.brandId !== 'all') {
    productWhere.brandId = query.brandId;
  }
  if (query?.status && query.status !== 'all') {
    productWhere.status = query.status as any;
  }
  if (Object.keys(productWhere).length > 0) {
    whereClause.product = productWhere;
  }

  const variants = await db.productVariant.findMany({
    where: whereClause,
    include: {
      product: {
        include: {
          brand: true,
          images: { select: { id: true } },
        },
      },
    },
    orderBy: { product: { updatedAt: 'desc' } },
  });

  // ── Pricing & Stock Scope ──
  if (scope === 'pricing_stock') {
    const headers = [
      'رقم المرجع (SKU)',
      'اسم الصنف بالعربي',
      'العلامة التجارية',
      'الفئة',
      'الموديل',
      'السعر الحالي ($)',
      'المخزون الحالي',
      'السعر الجديد ($)',
      'المخزون الجديد',
      'ملاحظة التحديث',
    ];
    const dataRows = variants.map(v => {
      const title = jsonObject(v.product.title);
      return [
        v.sku,
        String(title.ar ?? ''),
        v.product.brand?.name ?? '',
        v.product.category,
        v.product.model,
        v.priceUsd?.toFixed(2) ?? '',
        v.quantity,
        '', // New price placeholder for accountant
        '', // New quantity placeholder for accountant
        '',
      ];
    });

    if (format === 'csv') {
      return {
        buffer: toCsv(headers, dataRows),
        contentType: 'text/csv; charset=utf-8',
        filename: `price-stock-${today}.csv`,
      };
    }

    const wb = new ExcelJS.Workbook();
    wb.creator = 'الجيل - مزامنة الأسعار والمخزون';
    const ws = wb.addWorksheet('الأسعار والمخزون', { views: [{ rightToLeft: true, state: 'frozen', ySplit: 1 }] });
    const hRow = ws.addRow(headers);
    hRow.height = 28;
    hRow.eachCell((c, colNum) => {
      c.font = { bold: true, size: 11, color: { argb: 'FFFFFFFF' } };
      c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD97706' } };
      c.alignment = { horizontal: 'center', vertical: 'middle', readingOrder: 'rtl' as any };
      ws.getColumn(colNum).width = colNum <= 2 ? 32 : 18;
    });
    for (const r of dataRows) ws.addRow(r);
    return {
      buffer: Buffer.from(await wb.xlsx.writeBuffer()),
      contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      filename: `price-stock-${today}.xlsx`,
    };
  }

  // ── Inventory Audit Scope ──
  if (scope === 'inventory_audit') {
    const headers = [
      'رقم المرجع (SKU)',
      'معرف المنتج في الموقع',
      'اسم الصنف',
      'الفئة',
      'العلامة التجارية',
      'المخزون',
      'السعر ($)',
      'عدد الصور',
      'حالة الفحص',
      'حالة النشر',
    ];
    const dataRows = variants.map(v => {
      const title = jsonObject(v.product.title);
      const imgCount = v.product.images?.length || 0;
      const issues: string[] = [];
      if (v.quantity === 0) issues.push('مخزون نافد');
      if (imgCount === 0) issues.push('بدون صور');
      if (!v.priceUsd || Number(v.priceUsd) <= 0) issues.push('بدون سعر');
      if (v.product.status === 'draft') issues.push('مسودة');

      return [
        v.sku,
        v.productId,
        String(title.ar ?? ''),
        v.product.category,
        v.product.brand?.name ?? '',
        v.quantity,
        v.priceUsd?.toFixed(2) ?? '',
        imgCount,
        issues.length ? issues.join(' | ') : 'جاهز ومتوفر',
        v.product.status,
      ];
    });

    if (format === 'csv') {
      return {
        buffer: toCsv(headers, dataRows),
        contentType: 'text/csv; charset=utf-8',
        filename: `inventory-audit-${today}.csv`,
      };
    }

    const wb = new ExcelJS.Workbook();
    wb.creator = 'الجيل - فحص ونواقص المخزون';
    const ws = wb.addWorksheet('فحص المخزون', { views: [{ rightToLeft: true, state: 'frozen', ySplit: 1 }] });
    const hRow = ws.addRow(headers);
    hRow.height = 28;
    hRow.eachCell((c, colNum) => {
      c.font = { bold: true, size: 11, color: { argb: 'FFFFFFFF' } };
      c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDC2626' } };
      c.alignment = { horizontal: 'center', vertical: 'middle', readingOrder: 'rtl' as any };
      ws.getColumn(colNum).width = colNum === 9 ? 30 : 20;
    });
    for (const r of dataRows) ws.addRow(r);
    return {
      buffer: Buffer.from(await wb.xlsx.writeBuffer()),
      contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      filename: `inventory-audit-${today}.xlsx`,
    };
  }

  // ── Default: Full Catalog Scope ──
  const headers = [
    'رقم المرجع (SKU)',
    'رقم الصنف في الموقع',
    'رقم الخيار (Variant)',
    'اسم الصنف بالعربي',
    'اسم الصنف بالإنجليزي',
    'الكمية',
    'السعر بالدولار',
    'الفئة',
    'العلامة التجارية',
    'الموديل',
    'الحالة',
    'نمط التتبع',
    'تمت المراجعة',
    'حالة النشر',
  ];

  const dataRows = variants.map(v => {
    const title = jsonObject(v.product.title);
    return [
      v.sku,
      v.productId,
      v.id,
      String(title.ar ?? ''),
      String(title.en ?? ''),
      v.quantity,
      v.priceUsd?.toFixed(2) ?? '',
      v.product.category,
      v.product.brand?.name ?? '',
      v.product.model,
      v.product.condition,
      v.inventoryMode,
      v.inventoryReviewed ? 'نعم' : 'لا',
      v.product.status,
    ];
  });

  if (format === 'csv') {
    return {
      buffer: toCsv(headers, dataRows),
      contentType: 'text/csv; charset=utf-8',
      filename: `catalog-${today}.csv`,
    };
  }

  if (format === 'json') {
    return {
      buffer: Buffer.from(JSON.stringify(variants, null, 2), 'utf8'),
      contentType: 'application/json',
      filename: `catalog-${today}.json`,
    };
  }

  const wb = new ExcelJS.Workbook();
  wb.creator = 'الجيل - تصدير الكتالوج';
  wb.created = new Date();

  const ws = wb.addWorksheet('الكتالوج', {
    views: [{ rightToLeft: true, state: 'frozen', ySplit: 1 }],
  });

  // Header row
  const headerRow = ws.addRow(headers);
  headerRow.height = 28;
  headerRow.eachCell((cell, colNum) => {
    cell.font = { bold: true, size: 11, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF059669' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle', readingOrder: 'rtl' as any };
    cell.border = { bottom: { style: 'thin' } };
    ws.getColumn(colNum).width = colNum <= 5 ? 30 : 18;
  });

  // Data rows
  for (const r of dataRows) {
    const row = ws.addRow(r);
    if (row.number % 2 === 0) {
      row.eachCell({ includeEmpty: true }, (cell) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF9FAFB' } };
      });
    }
  }

  return {
    buffer: Buffer.from(await wb.xlsx.writeBuffer()),
    contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    filename: `catalog-${today}.xlsx`,
  };
}

/** Get live stats for smart export/import UI */
export async function getExportImportStats(db: PrismaClient) {
  const [
    totalProducts,
    publishedProducts,
    draftProducts,
    totalVariants,
    inStockVariants,
    outOfStockVariants,
    missingImagesCount,
    missingPriceCount,
    categories,
    brands,
    totalOrders,
    totalCustomers,
  ] = await Promise.all([
    db.product.count(),
    db.product.count({ where: { status: 'published' } }),
    db.product.count({ where: { status: 'draft' } }),
    db.productVariant.count({ where: { active: true } }),
    db.productVariant.count({ where: { active: true, quantity: { gt: 0 } } }),
    db.productVariant.count({ where: { active: true, quantity: 0 } }),
    db.product.count({ where: { images: { none: {} } } }),
    db.productVariant.count({ where: { active: true, priceUsd: null } }),
    db.catalogCategory.findMany({ select: { slug: true, title: true } }),
    db.brand.findMany({ select: { id: true, name: true } }),
    db.commerceOrder.count(),
    db.customerAccount.count(),
  ]);

  return {
    totalProducts,
    publishedProducts,
    draftProducts,
    totalVariants,
    inStockVariants,
    outOfStockVariants,
    missingImagesCount,
    missingPriceCount,
    totalOrders,
    totalCustomers,
    categories: categories.map(c => ({ id: c.slug, name: jsonObject(c.title).ar || c.slug })),
    brands: brands.map(b => ({ id: b.id, name: b.name })),
  };
}

// ═══════════════════════════════════════════════════════
//  3. Excel Import Engine – Flexible Matching
// ═══════════════════════════════════════════════════════

interface ImportRow {
  rowNum: number;
  sku?: string;
  productId?: string;
  titleAr?: string;
  titleEn?: string;
  quantity?: number;
  priceUsd?: string;
  category?: string;
  brandId?: string;
  model?: string;
  condition?: string;
  summaryAr?: string;
  summaryEn?: string;
  inventoryMode?: string;
}

interface ImportPreview {
  row: number;
  matchedBy: 'sku' | 'productId' | 'titleAr' | 'titleEn' | 'new' | null;
  sku: string;
  variantId: string;
  productName: string;
  changes: string[];
  isNew: boolean;
}

interface ImportError {
  row: number;
  message: string;
}

/** Parse unknown raw cell value into trimmed string or undefined. */
function str(v: unknown): string | undefined {
  if (v == null) return undefined;
  const s = String(v).trim();
  return s === '' ? undefined : s;
}

/** Parse numeric cell value. */
function num(v: unknown): number | undefined {
  if (v == null) return undefined;
  const s = String(v).trim();
  if (s === '') return undefined;
  const n = Number(s);
  return Number.isFinite(n) ? n : undefined;
}

/** Build an ImportRow from a raw key-value map. */
function parseImportRow(raw: Record<string, unknown>, rowNum: number): ImportRow {
  // Normalize raw object keys using resolveHeader in case frontend passed unmapped headers
  const normalized: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(raw)) {
    const canonical = resolveHeader(k) ?? k;
    normalized[canonical] = v;
  }

  return {
    rowNum,
    sku: str(normalized.sku ?? raw.sku),
    productId: str(normalized.productId ?? raw.productId),
    titleAr: str(normalized.titleAr ?? raw.titleAr),
    titleEn: str(normalized.titleEn ?? raw.titleEn),
    quantity: num(normalized.quantity ?? raw.quantity),
    priceUsd: str(normalized.priceUsd ?? raw.priceUsd),
    category: str(normalized.category ?? raw.category),
    brandId: str(normalized.brandId ?? raw.brandId),
    model: str(normalized.model ?? raw.model),
    condition: str(normalized.condition ?? raw.condition),
    summaryAr: str(normalized.summaryAr ?? raw.summaryAr),
    summaryEn: str(normalized.summaryEn ?? raw.summaryEn),
    inventoryMode: str(normalized.inventoryMode ?? raw.inventoryMode),
  };
}

type DbClient = PrismaClient | Prisma.TransactionClient;

/**
 * Flexible matching: SKU → Product ID → Title (ar) → Title (en).
 * Returns matched variant/product or null.
 */
async function findMatch(db: DbClient, row: ImportRow) {
  // 1. Match by SKU (exact, highest priority)
  if (row.sku) {
    const variant = await db.productVariant.findUnique({
      where: { sku: row.sku },
      include: { product: true },
    });
    if (variant) return { variant, product: variant.product, matchedBy: 'sku' as const };
  }

  // 2. Match by Product ID
  if (row.productId) {
    // Try as variant ID first
    const varById = await db.productVariant.findUnique({
      where: { id: row.productId },
      include: { product: true },
    });
    if (varById) return { variant: varById, product: varById.product, matchedBy: 'productId' as const };

    // Try as product ID
    const product = await db.product.findUnique({ where: { id: row.productId } });
    if (product) {
      const variant = await db.productVariant.findFirst({
        where: { productId: product.id, active: true },
        orderBy: { updatedAt: 'desc' },
      });
      return { variant, product, matchedBy: 'productId' as const };
    }
  }

  // 3. Match by Arabic title (exact match)
  if (row.titleAr) {
    const allProducts = await db.product.findMany({ where: { deletedAt: null } });
    const matched = allProducts.find(p => {
      const t = jsonObject(p.title);
      return t.ar && String(t.ar).trim() === row.titleAr;
    });
    if (matched) {
      const variant = await db.productVariant.findFirst({
        where: { productId: matched.id, active: true },
        orderBy: { updatedAt: 'desc' },
      });
      return { variant, product: matched, matchedBy: 'titleAr' as const };
    }
  }

  // 4. Match by English title (case-insensitive)
  if (row.titleEn) {
    const allProducts = await db.product.findMany({ where: { deletedAt: null } });
    const needle = row.titleEn.toLowerCase();
    const matched = allProducts.find(p => {
      const t = jsonObject(p.title);
      return t.en && String(t.en).trim().toLowerCase() === needle;
    });
    if (matched) {
      const variant = await db.productVariant.findFirst({
        where: { productId: matched.id, active: true },
        orderBy: { updatedAt: 'desc' },
      });
      return { variant, product: matched, matchedBy: 'titleEn' as const };
    }
  }

  return { variant: null, product: null, matchedBy: null };
}

/** Describe which fields will change for a preview row. */
function describeChanges(row: ImportRow): string[] {
  const changes: string[] = [];
  if (row.quantity !== undefined) changes.push(`الكمية → ${row.quantity}`);
  if (row.priceUsd !== undefined) changes.push(`السعر → $${row.priceUsd}`);
  if (row.titleAr) changes.push(`الاسم العربي → ${row.titleAr}`);
  if (row.titleEn) changes.push(`الاسم الإنجليزي → ${row.titleEn}`);
  if (row.model) changes.push(`الموديل → ${row.model}`);
  if (row.condition) changes.push(`الحالة → ${row.condition}`);
  if (row.summaryAr) changes.push('تحديث الوصف العربي');
  if (row.summaryEn) changes.push('تحديث الوصف الإنجليزي');
  if (row.inventoryMode) changes.push(`نمط التتبع → ${row.inventoryMode}`);
  if (row.category) changes.push(`الفئة → ${row.category}`);
  if (row.brandId) changes.push(`العلامة التجارية → ${row.brandId}`);
  return changes;
}

/** Generate a slug from Arabic/English title. */
function generateSlug(title: string): string {
  return title
    .toLowerCase().trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 90) || 'item-' + Math.floor(Math.random() * 100000);
}

// ═══════════════════════════════════════════════════════
//  Main import handler (two-phase commit)
// ═══════════════════════════════════════════════════════

export async function importExcel(
  db: PrismaClient,
  config: AppConfig,
  request: FastifyRequest,
) {
  const input = z.object({
    rows: z.array(z.record(z.string(), z.unknown())).min(1).max(1000),
    commit: z.boolean().default(false),
    previewToken: z.string().optional(),
  }).parse(request.body);

  const errors: ImportError[] = [];
  const previews: ImportPreview[] = [];
  const versions: [string, string | null, string | null][] = [];
  const seenSkus = new Set<string>();

  // ──── Phase 1: Validate & Preview ────
  for (let i = 0; i < input.rows.length; i++) {
    const rowNum = i + 1;
    try {
      const row = parseImportRow(input.rows[i], rowNum);

      // Must have SKU
      if (!row.sku) {
        errors.push({ row: rowNum, message: 'حقل "رقم المرجع (SKU)" إجباري في كل صف' });
        continue;
      }

      // Must have Title (Arabic or English)
      if (!row.titleAr && !row.titleEn) {
        errors.push({ row: rowNum, message: 'حقل "اسم الصنف" إجباري في كل صف (بالعربي أو بالإنجليزي)' });
        continue;
      }

      // Validate quantity
      if (row.quantity !== undefined && (!Number.isInteger(row.quantity) || row.quantity < 0 || row.quantity > 100000)) {
        errors.push({ row: rowNum, message: 'الكمية يجب أن تكون رقم صحيح بين 0 و 100,000' });
        continue;
      }

      // Validate price
      if (row.priceUsd !== undefined) {
        const p = Number(row.priceUsd);
        if (isNaN(p) || p < 0) {
          errors.push({ row: rowNum, message: 'السعر غير صالح — يجب أن يكون رقم موجب' });
          continue;
        }
      }

      // Validate condition
      if (row.condition && !['new', 'A', 'B', 'C'].includes(row.condition)) {
        errors.push({ row: rowNum, message: 'الحالة غير صالحة — القيم المسموحة: new, A, B, C' });
        continue;
      }

      // Validate inventoryMode
      if (row.inventoryMode && !['quantity', 'serialized'].includes(row.inventoryMode)) {
        errors.push({ row: rowNum, message: 'نمط التتبع غير صالح — القيم المسموحة: quantity, serialized' });
        continue;
      }

      // Check for duplicate SKU within this batch
      if (row.sku) {
        if (seenSkus.has(row.sku)) {
          errors.push({ row: rowNum, message: `رقم المرجع "${row.sku}" مكرر في نفس الملف` });
          continue;
        }
        seenSkus.add(row.sku);
      }

      const match = await findMatch(db, row);

      if (match.variant || match.product) {
        // ─── Update existing ───
        const changes = describeChanges(row);
        if (changes.length === 0) {
          errors.push({ row: rowNum, message: 'لا توجد بيانات للتحديث — جميع الحقول فارغة' });
          continue;
        }

        const productTitle = jsonObject(match.product?.title ?? {});
        previews.push({
          row: rowNum,
          matchedBy: match.matchedBy,
          sku: match.variant?.sku ?? row.sku ?? '',
          variantId: match.variant?.id ?? '',
          productName: String(productTitle.ar ?? productTitle.en ?? ''),
          changes,
          isNew: false,
        });
        versions.push([
          match.variant?.sku ?? match.product?.id ?? '',
          match.variant?.updatedAt?.toISOString() ?? null,
          match.product?.updatedAt?.toISOString() ?? null,
        ]);
      } else {
        // If category is provided, verify it exists; otherwise use first active category or 'laptops'
        let targetCategory = row.category;
        if (targetCategory) {
          const catExists = await db.catalogCategory.findUnique({ where: { slug: targetCategory } });
          if (!catExists) {
            errors.push({ row: rowNum, message: `الفئة "${targetCategory}" غير موجودة في النظام` });
            continue;
          }
        } else {
          const firstCat = await db.catalogCategory.findFirst({ select: { slug: true } });
          targetCategory = firstCat?.slug || 'laptops';
        }

        // If brand is provided, verify it exists; otherwise use first brand
        let targetBrandId = row.brandId;
        if (targetBrandId) {
          const brandExists = await db.brand.findUnique({ where: { id: targetBrandId } });
          if (!brandExists) {
            errors.push({ row: rowNum, message: `العلامة التجارية "${targetBrandId}" غير موجودة في النظام` });
            continue;
          }
        } else {
          const firstBrand = await db.brand.findFirst({ select: { id: true } });
          if (!firstBrand) {
            errors.push({ row: rowNum, message: 'لا توجد أي علامة تجارية مسجلة في النظام' });
            continue;
          }
          targetBrandId = firstBrand.id;
        }

        previews.push({
          row: rowNum,
          matchedBy: 'new',
          sku: row.sku,
          variantId: '',
          productName: row.titleAr || row.titleEn || '',
          changes: ['إنشاء صنف جديد برقم المرجع'],
          isNew: true,
        });
        versions.push([row.sku, null, null]);
      }
    } catch (error) {
      errors.push({
        row: rowNum,
        message: error instanceof Error ? error.message : 'خطأ في قراءة الصف',
      });
    }
  }

  const previewToken = createHash('sha256')
    .update(JSON.stringify([input.rows, versions]))
    .digest('hex');

  // Return preview if not committing or has errors
  if (!input.commit || errors.length) {
    return {
      errors,
      previews,
      valid: previews.length,
      committed: false,
      previewToken,
    };
  }

  // Verify previewToken matches (no concurrent changes)
  if (input.previewToken !== previewToken) {
    throw new ApiError(409, 'import_changed');
  }

  // ──── Phase 2: Commit ────
  let updatedCount = 0;
  let createdCount = 0;

  await transaction(db, async (tx) => {
    for (let i = 0; i < input.rows.length; i++) {
      const row = parseImportRow(input.rows[i], i + 1);

      // Skip rows that had errors in preview
      if (!row.sku && !row.productId && !row.titleAr && !row.titleEn) continue;

      const match = await findMatch(tx, row);

      if (match.variant) {
        // ─── Update variant ───
        const variantUpdate: Record<string, unknown> = {};
        if (row.quantity !== undefined) variantUpdate.quantity = row.quantity;
        if (row.priceUsd !== undefined) variantUpdate.priceUsd = row.priceUsd;
        if (row.condition) variantUpdate.condition = row.condition;
        if (row.inventoryMode) variantUpdate.inventoryMode = row.inventoryMode;

        if (Object.keys(variantUpdate).length > 0) {
          const before = { ...match.variant };
          await tx.productVariant.update({
            where: { id: match.variant.id },
            data: variantUpdate,
          });

          // Record inventory movement when quantity changes
          if (row.quantity !== undefined && row.quantity !== match.variant.quantity) {
            await tx.inventoryMovement.create({
              data: {
                variantId: match.variant.id,
                delta: row.quantity - match.variant.quantity,
                reason: 'استيراد Excel — تحديث الكمية',
                userId: request.auth!.user.id,
              },
            });
          }

          await audit(tx, config, request, {
            action: 'catalog.excel_imported',
            entity: 'ProductVariant',
            entityId: match.variant.id,
            before,
            after: variantUpdate,
          });
        }

        // ─── Update parent product ───
        if (match.product) {
          const productUpdate: Record<string, unknown> = {};
          const currentTitle = jsonObject(match.product.title);
          const currentSummary = jsonObject((match.product as any).summary ?? {});

          if (row.titleAr || row.titleEn) {
            productUpdate.title = {
              ar: row.titleAr ?? String(currentTitle.ar ?? ''),
              en: row.titleEn ?? String(currentTitle.en ?? ''),
            };
          }
          if (row.summaryAr || row.summaryEn) {
            productUpdate.summary = {
              ar: row.summaryAr ?? String(currentSummary.ar ?? ''),
              en: row.summaryEn ?? String(currentSummary.en ?? ''),
            };
          }
          if (row.model) productUpdate.model = row.model;
          if (row.condition) productUpdate.condition = row.condition;
          if (row.category) productUpdate.category = row.category;
          if (row.brandId) productUpdate.brandId = row.brandId;

          // If price changed at product level too (single-variant product)
          if (row.priceUsd !== undefined) {
            productUpdate.priceUsd = row.priceUsd;
            productUpdate.priceUpdatedAt = new Date();
          }

          if (Object.keys(productUpdate).length > 0) {
            await tx.product.update({
              where: { id: match.product.id },
              data: productUpdate,
            });
          }
        }

        updatedCount++;
      } else if (match.product && !match.variant) {
        // Product exists but no active variant — create a variant
        const variantId = randomUUID();
        const sku = row.sku ?? match.product.id.slice(0, 92) + '-' + randomUUID().slice(0, 6);
        await tx.productVariant.create({
          data: {
            id: variantId,
            productId: match.product.id,
            sku,
            optionKey: '[]',
            options: {},
            specs: {},
            images: [],
            priceUsd: row.priceUsd ?? null,
            quantity: row.quantity ?? 0,
            inventoryMode: row.inventoryMode ?? 'quantity',
            condition: (row.condition ?? match.product.condition) as any,
            inventoryReviewed: true,
            warrantyMonths: (match.product as any).warrantyMonths ?? null,
          },
        });

        if (row.quantity && row.quantity > 0) {
          await tx.inventoryMovement.create({
            data: {
              variantId,
              delta: row.quantity,
              reason: 'استيراد Excel — إنشاء خيار جديد',
              userId: request.auth!.user.id,
            },
          });
        }

        // Update product fields too
        const productUpdate: Record<string, unknown> = {};
        const currentTitle = jsonObject(match.product.title);
        if (row.titleAr || row.titleEn) {
          productUpdate.title = {
            ar: row.titleAr ?? String(currentTitle.ar ?? ''),
            en: row.titleEn ?? String(currentTitle.en ?? ''),
          };
        }
        if (row.model) productUpdate.model = row.model;
        if (row.priceUsd !== undefined) {
          productUpdate.priceUsd = row.priceUsd;
          productUpdate.priceUpdatedAt = new Date();
        }
        if (Object.keys(productUpdate).length > 0) {
          await tx.product.update({ where: { id: match.product.id }, data: productUpdate });
        }

        await audit(tx, config, request, {
          action: 'catalog.excel_imported',
          entity: 'ProductVariant',
          entityId: variantId,
          before: null,
          after: { sku, productId: match.product.id },
        });

        updatedCount++;
      } else {
        // ─── Create new product + variant ───
        if (!row.sku || (!row.titleAr && !row.titleEn)) continue;

        let targetCategory = row.category;
        if (!targetCategory || !await tx.catalogCategory.findUnique({ where: { slug: targetCategory } })) {
          const firstCat = await tx.catalogCategory.findFirst({ select: { slug: true } });
          targetCategory = firstCat?.slug || 'laptops';
        }

        let targetBrandId = row.brandId;
        if (!targetBrandId || !await tx.brand.findUnique({ where: { id: targetBrandId } })) {
          const firstBrand = await tx.brand.findFirst({ select: { id: true } });
          if (!firstBrand) continue;
          targetBrandId = firstBrand.id;
        }

        const productId = randomUUID();
        const mainTitle = row.titleAr || row.titleEn || row.sku;
        const slug = row.model ? generateSlug(row.model) : generateSlug(row.titleEn ?? mainTitle);
        // Ensure slug uniqueness
        let finalSlug = slug;
        const existing = await tx.product.findUnique({ where: { slug } });
        if (existing) finalSlug = slug + '-' + randomUUID().slice(0, 6);

        const product = await tx.product.create({
          data: {
            id: productId,
            slug: finalSlug,
            category: targetCategory,
            brandId: targetBrandId,
            model: row.model ?? mainTitle,
            title: { ar: row.titleAr ?? row.titleEn ?? '', en: row.titleEn ?? row.titleAr ?? '' },
            summary: { ar: row.summaryAr ?? '', en: row.summaryEn ?? '' },
            condition: (row.condition ?? 'new') as any,
            status: 'draft',
            specs: {},
            inspection: { passed: false, date: null, notes: { ar: '', en: '' } },
            specSources: [],
            bestFor: [],
            tags: [],
            priceUsd: row.priceUsd ?? null,
            priceUpdatedAt: row.priceUsd ? new Date() : null,
          },
        });

        const variantId = randomUUID();
        const sku = row.sku;
        await tx.productVariant.create({
          data: {
            id: variantId,
            productId: product.id,
            sku,
            optionKey: '[]',
            options: {},
            specs: {},
            images: [],
            priceUsd: row.priceUsd ?? null,
            quantity: row.quantity ?? 0,
            inventoryMode: row.inventoryMode ?? 'quantity',
            condition: product.condition,
            inventoryReviewed: true,
            warrantyMonths: null,
          },
        });

        if (row.quantity && row.quantity > 0) {
          await tx.inventoryMovement.create({
            data: {
              variantId,
              delta: row.quantity,
              reason: 'استيراد Excel — إنشاء صنف جديد',
              userId: request.auth!.user.id,
            },
          });
        }

        await audit(tx, config, request, {
          action: 'catalog.excel_imported',
          entity: 'Product',
          entityId: product.id,
          before: null,
          after: { id: product.id, sku, title: product.title },
        });

        createdCount++;
      }
    }
  });

  return {
    errors: [],
    previews,
    valid: updatedCount + createdCount,
    committed: true,
    previewToken,
    updatedCount,
    createdCount,
  };
}

/** Parse raw header row from client. Exported for use by routes. */
export { resolveHeader };
