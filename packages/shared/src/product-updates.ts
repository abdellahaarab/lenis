/** The v2 workbook contract is shared by the API, workbook writer and UI. */
export const PRODUCT_UPDATE_VERSION = 2;
export const PRODUCT_UPDATE_LIMIT = 1000;
export const PRODUCT_UPDATE_MAX_BYTES = 5 * 1024 * 1024;
export const PRODUCT_UPDATE_WARRANTY_MAX = 120;
export const updateSheets = { products: 'الأصناف', help: 'التعليمات والقوائم', variants: 'خيارات الأصناف', metadata: '_نظام' } as const;
export const updateActions = ['تحديث', 'إضافة', 'حذف', 'تجاهل'] as const;
export type UpdateAction = typeof updateActions[number];
export type UpdateColumn = { key: string; title: string; width: number; technical?: boolean; readonly?: boolean };
export const productUpdateColumns: UpdateColumn[] = [
  { key: 'action', title: 'الإجراء', width: 14 },
  { key: 'titleAr', title: 'اسم الصنف بالعربي', width: 32 },
  { key: 'titleEn', title: 'اسم الصنف بالإنجليزي', width: 32 },
  { key: 'brand', title: 'البراند', width: 26 },
  { key: 'category', title: 'الفئة', width: 30 },
  { key: 'model', title: 'الموديل', width: 26 },
  { key: 'condition', title: 'حالة الصنف', width: 20 },
  { key: 'warrantyMonths', title: 'الضمان بالأشهر', width: 18 },
  { key: 'summaryAr', title: 'الوصف بالعربي', width: 42 },
  { key: 'summaryEn', title: 'الوصف بالإنجليزي', width: 42 },
  { key: 'sku', title: 'رقم المرجع (SKU)', width: 26 },
  { key: 'priceUsd', title: 'السعر بالدولار', width: 18 },
  { key: 'quantity', title: 'الكمية', width: 14 },
  { key: 'kind', title: 'إدارة الخيارات', width: 26, readonly: true },
  { key: 'inventoryMode', title: 'تتبع المخزون', width: 22, readonly: true },
  { key: 'status', title: 'حالة النشر', width: 18, readonly: true },
  { key: 'productId', title: '_productId', width: 20, technical: true },
  { key: 'variantId', title: '_variantId', width: 20, technical: true },
  { key: 'revision', title: '_revision', width: 20, technical: true },
  { key: 'variantRevision', title: '_variantRevision', width: 20, technical: true },
];
export const variantUpdateColumns: UpdateColumn[] = [
  { key: 'action', title: 'الإجراء', width: 14 },
  { key: 'productName', title: 'اسم الصنف', width: 32, readonly: true },
  { key: 'options', title: 'وصف الخيار', width: 38, readonly: true },
  { key: 'sku', title: 'رقم المرجع (SKU)', width: 26 },
  { key: 'priceUsd', title: 'السعر بالدولار', width: 18 },
  { key: 'quantity', title: 'الكمية', width: 14 },
  { key: 'condition', title: 'حالة الخيار', width: 20 },
  { key: 'warrantyMonths', title: 'الضمان بالأشهر', width: 18 },
  { key: 'inventoryMode', title: 'تتبع المخزون', width: 22, readonly: true },
  { key: 'productId', title: '_productId', width: 20, technical: true },
  { key: 'variantId', title: '_variantId', width: 20, technical: true },
  { key: 'revision', title: '_revision', width: 20, technical: true },
  { key: 'variantRevision', title: '_variantRevision', width: 20, technical: true },
];
export type UpdateIssue = { sheet: string; row: number; column: string; message: string };
export type UpdateChange = { column: string; before: string | number | null; after: string | number | null; cleared: boolean };
export type UpdatePreviewRow = { sheet: string; row: number; action: UpdateAction; productName: string; changes: UpdateChange[] };
export type UpdateSummary = { added: number; updated: number; deleted: number; cleared: number; unchanged: number; ignored: number };
export type ProductUpdateResponse = { errors: UpdateIssue[]; previews: UpdatePreviewRow[]; summary: UpdateSummary; previewToken?: string; committed: boolean; replayed?: boolean };
export type ProductUpdatePart = { part: number; rows: number };
