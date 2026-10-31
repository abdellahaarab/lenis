import { describe, it, expect } from 'vitest';
import ExcelJS from 'exceljs';
import { generateTemplate, resolveHeader } from '../src/commerce-excel.js';

describe('Excel Import/Export System', () => {
  describe('resolveHeader', () => {
    it('matches exact Arabic headers to canonical keys', () => {
      expect(resolveHeader('رقم المرجع (SKU)')).toBe('sku');
      expect(resolveHeader('رقم الصنف في الموقع')).toBe('productId');
      expect(resolveHeader('اسم الصنف بالعربي')).toBe('titleAr');
      expect(resolveHeader('اسم الصنف بالإنجليزي')).toBe('titleEn');
      expect(resolveHeader('الكمية')).toBe('quantity');
      expect(resolveHeader('السعر بالدولار')).toBe('priceUsd');
      expect(resolveHeader('الفئة')).toBe('category');
      expect(resolveHeader('العلامة التجارية')).toBe('brandId');
      expect(resolveHeader('الموديل')).toBe('model');
      expect(resolveHeader('الحالة (new/A/B/C)')).toBe('condition');
      expect(resolveHeader('الوصف بالعربي')).toBe('summaryAr');
      expect(resolveHeader('الوصف بالإنجليزي')).toBe('summaryEn');
      expect(resolveHeader('نمط التتبع (quantity/serialized)')).toBe('inventoryMode');
    });

    it('matches English headers for backward compatibility', () => {
      expect(resolveHeader('sku')).toBe('sku');
      expect(resolveHeader('SKU')).toBe('sku');
      expect(resolveHeader('productId')).toBe('productId');
      expect(resolveHeader('titleAr')).toBe('titleAr');
      expect(resolveHeader('quantity')).toBe('quantity');
      expect(resolveHeader('priceUsd')).toBe('priceUsd');
      expect(resolveHeader('category')).toBe('category');
    });

    it('handles whitespace and UTF-8 BOM properly', () => {
      expect(resolveHeader('  رقم المرجع (SKU)  ')).toBe('sku');
      expect(resolveHeader('\uFEFFرقم المرجع (SKU)')).toBe('sku');
      expect(resolveHeader('\uFEFFsku')).toBe('sku');
    });

    it('returns null for unknown headers', () => {
      expect(resolveHeader('حقل عشوائي غير معروف')).toBeNull();
      expect(resolveHeader('unknown_column_xyz')).toBeNull();
    });
  });

  describe('generateTemplate', () => {
    it('generates a valid Excel template buffer', async () => {
      const buffer = await generateTemplate();
      expect(buffer).toBeDefined();
      expect(buffer.length).toBeGreaterThan(1000);

      // Parse the generated workbook back using ExcelJS
      const wb = new ExcelJS.Workbook();
      await wb.xlsx.load(buffer as any);

      // Verify worksheets exist
      const dataSheet = wb.getWorksheet('قالب الأصناف');
      expect(dataSheet).toBeDefined();

      const helpSheet = wb.getWorksheet('دليل الاستخدام');
      expect(helpSheet).toBeDefined();

      // Verify RTL orientation on main sheet
      expect(dataSheet?.views?.[0]?.rightToLeft).toBe(true);

      // Verify row 1 contains instruction banner
      const row1Cell = dataSheet?.getRow(1).getCell(1).value?.toString();
      expect(row1Cell).toContain('المطلوب إجباري');

      // Verify row 2 contains all expected Arabic column headers
      const row2 = dataSheet?.getRow(2);
      expect(row2?.getCell(1).value).toBe('رقم المرجع (SKU)');
      expect(row2?.getCell(2).value).toBe('اسم الصنف بالعربي');
      expect(row2?.getCell(3).value).toBe('اسم الصنف بالإنجليزي');
      expect(row2?.getCell(4).value).toBe('الكمية');
      expect(row2?.getCell(5).value).toBe('السعر بالدولار');
      expect(row2?.getCell(6).value).toBe('الفئة');
      expect(row2?.getCell(7).value).toBe('العلامة التجارية');
      expect(row2?.getCell(8).value).toBe('الموديل');
      expect(row2?.getCell(9).value).toBe('الحالة (new/A/B/C)');
      expect(row2?.getCell(10).value).toBe('الوصف بالعربي');
      expect(row2?.getCell(11).value).toBe('الوصف بالإنجليزي');
      expect(row2?.getCell(12).value).toBe('نمط التتبع (quantity/serialized)');

      // Verify help sheet contains guidance
      const helpFirstRow = helpSheet?.getRow(1).getCell(1).value?.toString();
      expect(helpFirstRow).toContain('دليل استخدام قالب استيراد الأصناف');
    });
  });
});
