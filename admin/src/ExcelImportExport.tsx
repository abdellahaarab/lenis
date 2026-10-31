import { useState, useRef, useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import * as XLSX from 'xlsx';
import {
  FileSpreadsheet,
  Download,
  UploadCloud,
  FileCheck2,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  HelpCircle,
  ArrowRightLeft,
  Boxes,
  PlusCircle,
  RefreshCw,
  Sparkles,
  Info,
  SlidersHorizontal,
  Layers,
  ShoppingBag,
  UsersRound,
  Database,
  Filter,
  Check,
  FileText,
  Coins,
  PackageCheck,
  AlertCircle,
  Eye,
  ArrowDownToLine,
  Zap
} from 'lucide-react';
import { api, ApiError } from './api';
import { useI18n } from './i18n';
import { ErrorBox, useToast, Loading } from './components';
import './excel-import-export.css';

interface ImportError {
  row: number;
  message: string;
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

interface ImportResponse {
  errors: ImportError[];
  previews: ImportPreview[];
  valid: number;
  committed: boolean;
  previewToken: string;
  updatedCount?: number;
  createdCount?: number;
}

interface StatsResponse {
  totalProducts: number;
  publishedProducts: number;
  draftProducts: number;
  totalVariants: number;
  inStockVariants: number;
  outOfStockVariants: number;
  missingImagesCount: number;
  missingPriceCount: number;
  totalOrders: number;
  totalCustomers: number;
  categories: { id: string; name: string }[];
  brands: { id: string; name: string }[];
}

// Arabic header synonyms for AI/Smart matching
const ARABIC_HEADER_MAP: Record<string, string> = {
  // SKU / Barcode
  'رقم المرجع (SKU)': 'sku',
  'رقم المرجع': 'sku',
  'المرجع': 'sku',
  'مرجع الصنف': 'sku',
  'مرجع': 'sku',
  'رقم صنف': 'sku',
  'رقم الصنف': 'sku',
  'كود الصنف': 'sku',
  'رمز الصنف': 'sku',
  'كود': 'sku',
  'الرمز': 'sku',
  'رمز': 'sku',
  'باركود': 'sku',
  'الباركود': 'sku',
  'رقم الباركود': 'sku',
  'sku': 'sku',
  'SKU': 'sku',
  'barcode': 'sku',
  'code': 'sku',
  'item_code': 'sku',

  // Product ID
  'رقم الصنف في الموقع': 'productId',
  'معرف الصنف': 'productId',
  'معرف المنتج': 'productId',
  'معرف': 'productId',
  'productId': 'productId',

  // Arabic Title
  'اسم الصنف بالعربي': 'titleAr',
  'اسم الصنف': 'titleAr',
  'الاسم بالعربي': 'titleAr',
  'اسم المنتج': 'titleAr',
  'اسم المنتج بالعربي': 'titleAr',
  'الاسم': 'titleAr',
  'الصنف': 'titleAr',
  'البيان': 'titleAr',
  'البيان (اسم الصنف)': 'titleAr',
  'الوصف المختصر': 'titleAr',
  'titleAr': 'titleAr',
  'name': 'titleAr',

  // English Title
  'اسم الصنف بالإنجليزي': 'titleEn',
  'الاسم بالإنجليزي': 'titleEn',
  'اسم المنتج بالإنجليزي': 'titleEn',
  'titleEn': 'titleEn',

  // Quantity / Stock
  'الكمية': 'quantity',
  'الكمية المتوفرة': 'quantity',
  'الكميه': 'quantity',
  'الرصيد': 'quantity',
  'رصيد المخزون': 'quantity',
  'رصيد': 'quantity',
  'المخزون': 'quantity',
  'المخزون الحالي': 'quantity',
  'العدد': 'quantity',
  'quantity': 'quantity',
  'qty': 'quantity',
  'stock': 'quantity',

  // Price
  'السعر بالدولار': 'priceUsd',
  'السعر ($)': 'priceUsd',
  'السعر الحالي ($)': 'priceUsd',
  'السعر': 'priceUsd',
  'سعر البيع': 'priceUsd',
  'سعر البيع نقدا ($)': 'priceUsd',
  'السعر نقدا': 'priceUsd',
  'السعر دولار': 'priceUsd',
  'priceUsd': 'priceUsd',
  'price': 'priceUsd',

  // Category & Brand
  'الفئة': 'category',
  'التصنيف': 'category',
  'القسم': 'category',
  'category': 'category',
  'العلامة التجارية': 'brandId',
  'الماركة': 'brandId',
  'الشركة المصنعة': 'brandId',
  'brandId': 'brandId',
  'brand': 'brandId',

  // Model & Condition
  'الموديل': 'model',
  'الطراز': 'model',
  'model': 'model',
  'الحالة': 'condition',
  'condition': 'condition',

  // Summaries
  'الوصف بالعربي': 'summaryAr',
  'الوصف': 'summaryAr',
  'المواصفات': 'summaryAr',
  'summaryAr': 'summaryAr',
  'الوصف بالإنجليزي': 'summaryEn',
  'summaryEn': 'summaryEn',

  // Inventory Mode
  'نمط التتبع': 'inventoryMode',
  'inventoryMode': 'inventoryMode',
};

const CANONICAL_FIELD_LABELS: Record<string, { ar: string; en: string; required?: boolean }> = {
  sku: { ar: 'رقم المرجع (SKU / كود الصنف)', en: 'SKU / Item Code', required: true },
  titleAr: { ar: 'اسم الصنف بالعربي', en: 'Arabic Product Name', required: true },
  titleEn: { ar: 'اسم الصنف بالإنجليزي', en: 'English Product Name' },
  quantity: { ar: 'الكمية المتوفرة (المخزون)', en: 'Stock Quantity' },
  priceUsd: { ar: 'السعر بالدولار ($)', en: 'Price USD ($)' },
  category: { ar: 'الفئة / التصنيف', en: 'Category' },
  brandId: { ar: 'العلامة التجارية (الماركة)', en: 'Brand / Manufacturer' },
  model: { ar: 'الموديل / الطراز', en: 'Model' },
  condition: { ar: 'الحالة (new/A/B/C)', en: 'Condition' },
  summaryAr: { ar: 'الوصف والمواصفات (عربي)', en: 'Arabic Description' },
  summaryEn: { ar: 'الوصف والمواصفات (إنجليزي)', en: 'English Description' },
  inventoryMode: { ar: 'نمط التتبع (quantity/serialized)', en: 'Inventory Mode' },
  productId: { ar: 'معرف المنتج في الموقع (تلقائي)', en: 'Site Product ID' },
};

export function ExcelImportExport() {
  const { lang } = useI18n();
  const ar = lang === 'ar';
  const say = useCallback((arabic: string, english: string) => (ar ? arabic : english), [ar]);
  const toast = useToast();

  const [activeTab, setActiveTab] = useState<'export' | 'import' | 'templates' | 'guide'>('export');

  // ──────────────────────────────────────────
  // Live Store Stats
  // ──────────────────────────────────────────
  const { data: stats, isLoading: statsLoading } = useQuery<StatsResponse>({
    queryKey: ['excel-stats'],
    queryFn: () => api<StatsResponse>('/commerce/excel/stats'),
    staleTime: 60_000,
  });

  // ──────────────────────────────────────────
  // Export Studio State
  // ──────────────────────────────────────────
  const [exportScope, setExportScope] = useState<'catalog' | 'pricing_stock' | 'inventory_audit' | 'orders' | 'customers'>('catalog');
  const [exportFormat, setExportFormat] = useState<'xlsx' | 'csv' | 'json'>('xlsx');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterBrand, setFilterBrand] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterStock, setFilterStock] = useState<string>('all');

  const exportUrl = useMemo(() => {
    const params = new URLSearchParams();
    params.set('scope', exportScope);
    params.set('format', exportFormat);
    if (filterCategory !== 'all') params.set('category', filterCategory);
    if (filterBrand !== 'all') params.set('brandId', filterBrand);
    if (filterStatus !== 'all') params.set('status', filterStatus);
    if (filterStock !== 'all') params.set('stockStatus', filterStock);
    return `/api/admin/commerce/excel/export?${params.toString()}`;
  }, [exportScope, exportFormat, filterCategory, filterBrand, filterStatus, filterStock]);

  const handleExecuteExport = () => {
    window.location.href = exportUrl;
    toast(say('بدأ تنزيل ملف التصدير...', 'Export download started...'));
  };

  // ──────────────────────────────────────────
  // Import Studio State & Smart Mapping
  // ──────────────────────────────────────────
  const [file, setFile] = useState<File | null>(null);
  const [rawFileHeaders, setRawFileHeaders] = useState<string[]>([]);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({}); // fileHeader -> canonicalKey
  const [parsedRows, setParsedRows] = useState<Record<string, unknown>[]>([]);
  const [parsing, setParsing] = useState(false);
  const [parseError, setParseError] = useState('');

  // Import Strategy: 'price_stock' (only update price/qty) | 'full' (all fields) | 'new_only'
  const [importStrategy, setImportStrategy] = useState<'price_stock' | 'full' | 'new_only'>('price_stock');

  // Preview & Commit State
  const [preview, setPreview] = useState<ImportResponse | null>(null);
  const [busy, setBusy] = useState(false);
  const [apiError, setApiError] = useState('');
  const [previewTab, setPreviewTab] = useState<'all' | 'updates' | 'new' | 'errors'>('all');

  // Drag and Drop
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // File parsing (supports .xlsx, .xls, .csv)
  const handleFileSelected = async (selectedFile: File) => {
    setParseError('');
    setApiError('');
    setPreview(null);
    setFile(selectedFile);
    setParsing(true);

    try {
      const data = await selectedFile.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });
      const sheetName = workbook.SheetNames.find(n => n.includes('الأصناف') || n.includes('الكتالوج') || n.includes('الأسعار')) || workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];

      if (!sheet) {
        throw new Error(say('الملف لا يحتوي على أوراق عمل صالحة', 'Workbook contains no sheets'));
      }

      const rawRows = (XLSX.utils.sheet_to_json(sheet, {
        header: 1,
        defval: '',
        blankrows: false
      }) as unknown) as unknown[][];

      if (rawRows.length < 2) {
        throw new Error(say('الملف فارغ أو لا يحتوي على صف عناوين وبيانات', 'Sheet is empty or has no rows'));
      }

      // Smart Header Row Detection: scan first 10 rows
      let headerRowIndex = 0;
      let maxRecognizedCount = 0;

      for (let r = 0; r < Math.min(10, rawRows.length); r++) {
        const rowCells = rawRows[r] || [];
        const nonBlank = rowCells.filter(c => c !== '' && c !== null && c !== undefined);
        if (nonBlank.length <= 1 && String(rowCells[0] || '').length > 25) continue;

        let recognized = 0;
        for (const cell of rowCells) {
          const val = String(cell || '').trim().replace(/^\uFEFF/, '');
          if (val && (ARABIC_HEADER_MAP[val] || ARABIC_HEADER_MAP[val.toLowerCase()])) {
            recognized++;
          }
        }
        if (recognized > maxRecognizedCount) {
          maxRecognizedCount = recognized;
          headerRowIndex = r;
        }
      }

      const rawHeaders = (rawRows[headerRowIndex] as string[]).map(h => String(h || '').trim()).filter(Boolean);
      setRawFileHeaders(rawHeaders);

      // Auto Map Headers
      const initialMapping: Record<string, string> = {};
      rawHeaders.forEach(h => {
        const cleanH = h.replace(/^\uFEFF/, '').trim();
        const mapped = ARABIC_HEADER_MAP[cleanH] || ARABIC_HEADER_MAP[cleanH.toLowerCase()] || '';
        if (mapped) initialMapping[h] = mapped;
      });
      setColumnMapping(initialMapping);

      // Parse Data Rows
      const dataRows = rawRows.slice(headerRowIndex + 1);
      const rows: Record<string, unknown>[] = [];

      for (const row of dataRows) {
        if (!row.some(cell => cell !== '' && cell !== null && cell !== undefined)) continue;
        const rowObj: Record<string, unknown> = {};
        rawHeaders.forEach((h, idx) => {
          if (h) rowObj[h] = row[idx];
        });
        rows.push(rowObj);
      }

      if (rows.length === 0) {
        throw new Error(say('لم يتم العثور على أي صفوف بيانات في الملف', 'No data rows found in sheet'));
      }

      if (rows.length > 2000) {
        throw new Error(say('الملف يحتوي على أكثر من 2000 صف. الحد الأقصى هو 2000 صنف.', 'File exceeds 2000 rows. Max limit is 2000 items.'));
      }

      setParsedRows(rows);
    } catch (err) {
      setParseError(err instanceof Error ? err.message : say('فشل في قراءة ملف Excel', 'Failed to parse Excel file'));
      setFile(null);
      setParsedRows([]);
    } finally {
      setParsing(false);
    }
  };

  // Re-map row objects using active mapping
  const normalizedRows = useMemo(() => {
    return parsedRows.map((rawRow, idx) => {
      const normalized: Record<string, unknown> = {};
      for (const [fileHeader, canonicalKey] of Object.entries(columnMapping)) {
        if (canonicalKey && rawRow[fileHeader] !== undefined) {
          // If strategy is 'price_stock', only keep sku, titleAr, titleEn, quantity, priceUsd
          if (importStrategy === 'price_stock') {
            if (['sku', 'titleAr', 'titleEn', 'quantity', 'priceUsd'].includes(canonicalKey)) {
              normalized[canonicalKey] = rawRow[fileHeader];
            }
          } else {
            normalized[canonicalKey] = rawRow[fileHeader];
          }
        }
      }
      // Fallback: SKU from first column if not mapped
      if (!normalized.sku && rawFileHeaders[0] && rawRow[rawFileHeaders[0]]) {
        normalized.sku = String(rawRow[rawFileHeaders[0]]).trim();
      }
      return normalized;
    });
  }, [parsedRows, columnMapping, importStrategy, rawFileHeaders]);

  const hasSkuMapped = useMemo(() => {
    return Object.values(columnMapping).includes('sku') || !!rawFileHeaders[0];
  }, [columnMapping, rawFileHeaders]);

  // Submit to backend
  const submitImport = async (commit: boolean) => {
    if (!normalizedRows.length) return;
    setBusy(true);
    setApiError('');

    try {
      const res = await api<ImportResponse>('/commerce/excel/import', {
        method: 'POST',
        body: {
          rows: normalizedRows,
          commit,
          previewToken: preview?.previewToken,
        },
      });

      setPreview(res);

      if (commit && res.committed) {
        toast(
          say(
            `تم الاستيراد بنجاح! تم تحديث ${res.updatedCount || 0} صنف وإنشاء ${res.createdCount || 0} صنف جديد.`,
            `Import successful! Updated ${res.updatedCount || 0} items and created ${res.createdCount || 0} new items.`
          )
        );
      }
    } catch (err) {
      setApiError(err instanceof ApiError ? err.code : 'failed');
    } finally {
      setBusy(false);
    }
  };

  const resetForm = () => {
    setFile(null);
    setRawFileHeaders([]);
    setColumnMapping({});
    setParsedRows([]);
    setPreview(null);
    setParseError('');
    setApiError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const filteredPreviews = useMemo(() => {
    if (!preview) return [];
    if (previewTab === 'updates') return preview.previews.filter(p => !p.isNew);
    if (previewTab === 'new') return preview.previews.filter(p => p.isNew);
    return preview.previews;
  }, [preview, previewTab]);

  return (
    <div className="smart-ie-container" dir={ar ? 'rtl' : 'ltr'}>
      {/* ──────────────────────────────────────────
          Page Heading & Real-time Live Health Bar
          ────────────────────────────────────────── */}
      <div className="page-heading">
        <div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Database size={28} color="var(--primary)" />
            <span>{say('مركز الاستيراد والتصدير الذكي', 'Smart Import & Export Studio')}</span>
          </h1>
          <p className="muted" style={{ marginTop: '4px' }}>
            {say(
              'منصة متقدمة لتصدير واستيراد الكتالوج، مزامنة الأسعار والمخزون مع الأنظمة المحاسبية (يمن سوفت، الأونكس، إبصار)، وتوليد التقارير التفصيلية.',
              'Advanced studio for catalog export/import, real-time price & stock sync with accounting systems (YemenSoft, Onyx Pro, Ebssar), and detailed reporting.'
            )}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <span className="connection-badge" title={say('متصل بقاعدة بيانات الاستضافة', 'Connected to cloud database')}>
            <span />
            <strong>{say('الاستضافة نشطة', 'Cloud Live')}</strong>
          </span>
        </div>
      </div>

      {/* Live Store Stats Header Cards */}
      <div className="ie-stats-grid">
        <div className="ie-stat-card">
          <div className="ie-stat-icon purple">
            <Boxes size={22} />
          </div>
          <div className="ie-stat-info">
            <span className="ie-stat-value">{statsLoading ? '...' : (stats?.totalProducts ?? 0).toLocaleString()}</span>
            <span className="ie-stat-label">{say('إجمالي المنتجات', 'Total Products')}</span>
          </div>
        </div>

        <div className="ie-stat-card">
          <div className="ie-stat-icon green">
            <PackageCheck size={22} />
          </div>
          <div className="ie-stat-info">
            <span className="ie-stat-value">{statsLoading ? '...' : (stats?.inStockVariants ?? 0).toLocaleString()}</span>
            <span className="ie-stat-label">{say('متوفر بالمخزون', 'In-Stock Variants')}</span>
          </div>
        </div>

        <div className="ie-stat-card">
          <div className="ie-stat-icon amber">
            <AlertTriangle size={22} />
          </div>
          <div className="ie-stat-info">
            <span className="ie-stat-value">{statsLoading ? '...' : (stats?.outOfStockVariants ?? 0).toLocaleString()}</span>
            <span className="ie-stat-label">{say('نافد من المخزون', 'Out of Stock')}</span>
          </div>
        </div>

        <div className="ie-stat-card">
          <div className="ie-stat-icon blue">
            <ShoppingBag size={22} />
          </div>
          <div className="ie-stat-info">
            <span className="ie-stat-value">{statsLoading ? '...' : (stats?.totalOrders ?? 0).toLocaleString()}</span>
            <span className="ie-stat-label">{say('إجمالي الطلبات', 'Total Orders')}</span>
          </div>
        </div>

        <div className="ie-stat-card">
          <div className="ie-stat-icon red">
            <AlertCircle size={22} />
          </div>
          <div className="ie-stat-info">
            <span className="ie-stat-value">{statsLoading ? '...' : (stats?.missingImagesCount ?? 0).toLocaleString()}</span>
            <span className="ie-stat-label">{say('منتجات بدون صور', 'Missing Images')}</span>
          </div>
        </div>
      </div>

      <ErrorBox code={apiError} />

      {/* ──────────────────────────────────────────
          Main Navigation Tabs
          ────────────────────────────────────────── */}
      <div className="ie-nav-tabs">
        <button
          type="button"
          className={`ie-tab-btn ${activeTab === 'export' ? 'active' : ''}`}
          onClick={() => setActiveTab('export')}
        >
          <ArrowDownToLine size={18} />
          <span>{say('تصدير البيانات المتقدم', 'Advanced Export')}</span>
        </button>

        <button
          type="button"
          className={`ie-tab-btn ${activeTab === 'import' ? 'active' : ''}`}
          onClick={() => setActiveTab('import')}
        >
          <UploadCloud size={18} />
          <span>{say('الاستيراد الذكي والمطابقة', 'Smart Import')}</span>
        </button>

        <button
          type="button"
          className={`ie-tab-btn ${activeTab === 'templates' ? 'active' : ''}`}
          onClick={() => setActiveTab('templates')}
        >
          <FileSpreadsheet size={18} />
          <span>{say('مكتبة القوالب المحاسبية', 'Accounting Templates')}</span>
        </button>

        <button
          type="button"
          className={`ie-tab-btn ${activeTab === 'guide' ? 'active' : ''}`}
          onClick={() => setActiveTab('guide')}
        >
          <HelpCircle size={18} />
          <span>{say('دليل الربط والمطابقة', 'Sync & Match Guide')}</span>
        </button>
      </div>

      {/* ──────────────────────────────────────────
          TAB 1: ADVANCED EXPORT STUDIO
          ────────────────────────────────────────── */}
      {activeTab === 'export' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '4px' }}>
              {say('1. اختر نوع ومجال البيانات المراد تصديرها', '1. Select Data Scope')}
            </h2>
            <p className="muted" style={{ fontSize: '13.5px' }}>
              {say('حدد نوع الجدول والغرض من التصدير لتجهيز ملف منظم ومحدد الأعمدة.', 'Select the data scope for your export.')}
            </p>
          </div>

          <div className="ie-scopes-grid">
            {/* Scope: Catalog */}
            <div
              className={`ie-scope-card ${exportScope === 'catalog' ? 'selected' : ''}`}
              onClick={() => setExportScope('catalog')}
            >
              <div className="ie-scope-header">
                <div className="ie-scope-icon-wrap" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#059669' }}>
                  <Boxes size={22} />
                </div>
                <div className="ie-scope-radio" />
              </div>
              <h3>{say('الكتالوج الشامل الكامل', 'Full Catalog Export')}</h3>
              <p>
                {say(
                  'تصدير شامل لكافة المنتجات، الخيارات (Variants)، أرقام المراجع SKU، الأسعار، المخزون، الماركات، ونمط التتبع.',
                  'Comprehensive export of all products, variants, SKUs, prices, inventory, and brands.'
                )}
              </p>
              <span className="ie-scope-badge">{say(`${stats?.totalVariants ?? 0} خيار صنف`, `${stats?.totalVariants ?? 0} Variants`)}</span>
            </div>

            {/* Scope: Pricing & Stock */}
            <div
              className={`ie-scope-card ${exportScope === 'pricing_stock' ? 'selected' : ''}`}
              onClick={() => setExportScope('pricing_stock')}
            >
              <div className="ie-scope-header">
                <div className="ie-scope-icon-wrap" style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#d97706' }}>
                  <Coins size={22} />
                </div>
                <div className="ie-scope-radio" />
              </div>
              <h3>{say('قائمة الأسعار والمخزون المحاسبي', 'Pricing & Stock Sync')}</h3>
              <p>
                {say(
                  'مخصص وسريع للمحاسبين وأنظمة ERP: يتضمن رقم المرجع SKU، الاسم، السعر الحالي، وحقولاً فارغة لتعديل الأسعار والمخزون وإعادة استيرادها.',
                  'Designed for ERP and accountants: SKU, Name, Current Price & Stock with input columns for fast re-import.'
                )}
              </p>
              <span className="ie-scope-badge">{say('سريع للربط المحاسبي', 'ERP Ready')}</span>
            </div>

            {/* Scope: Inventory Audit */}
            <div
              className={`ie-scope-card ${exportScope === 'inventory_audit' ? 'selected' : ''}`}
              onClick={() => setExportScope('inventory_audit')}
            >
              <div className="ie-scope-header">
                <div className="ie-scope-icon-wrap" style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#dc2626' }}>
                  <AlertCircle size={22} />
                </div>
                <div className="ie-scope-radio" />
              </div>
              <h3>{say('تقرير النواقص ومراجعة البيانات', 'Inventory & Data Audit')}</h3>
              <p>
                {say(
                  'تقرير تدقيق تشغيلي: يفرز الأصناف التي نفد مخزونها، أو التي لا تحتوي على صور، أو بدون أسعار، لسرعة معالجتها قبل النشر.',
                  'Operational audit: flags out-of-stock items, products missing images or missing prices.'
                )}
              </p>
              <span className="ie-scope-badge">{say(`${(stats?.outOfStockVariants ?? 0) + (stats?.missingImagesCount ?? 0)} تنبيه تدقيق`, 'Audit Flags')}</span>
            </div>

            {/* Scope: Orders */}
            <div
              className={`ie-scope-card ${exportScope === 'orders' ? 'selected' : ''}`}
              onClick={() => setExportScope('orders')}
            >
              <div className="ie-scope-header">
                <div className="ie-scope-icon-wrap" style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#2563eb' }}>
                  <ShoppingBag size={22} />
                </div>
                <div className="ie-scope-radio" />
              </div>
              <h3>{say('سجل الطلبات والمبيعات', 'Orders & Sales Record')}</h3>
              <p>
                {say(
                  'تصدير كشف المبيعات والطلبات: أرقام الطلبات، أسماء وهواتف العملاء، إجمالي الدولار والريال اليمني، والتواريخ.',
                  'Sales log: Order numbers, customer contacts, totals in USD and YER, and order status.'
                )}
              </p>
              <span className="ie-scope-badge">{say(`${stats?.totalOrders ?? 0} طلب مسجل`, `${stats?.totalOrders ?? 0} Orders`)}</span>
            </div>

            {/* Scope: Customers */}
            <div
              className={`ie-scope-card ${exportScope === 'customers' ? 'selected' : ''}`}
              onClick={() => setExportScope('customers')}
            >
              <div className="ie-scope-header">
                <div className="ie-scope-icon-wrap" style={{ background: 'rgba(99, 102, 241, 0.1)', color: '#4f46e5' }}>
                  <UsersRound size={22} />
                </div>
                <div className="ie-scope-radio" />
              </div>
              <h3>{say('حسابات وقائمة العملاء', 'Customer Accounts')}</h3>
              <p>
                {say(
                  'تصدير قائمة العملاء المسجلين: أرقام الهواتف، الأسماء، حالة التفعيل، وتواريخ الانضمام للتسويق والمتابعة.',
                  'Customer directory with names, phones, verification status, and registration dates.'
                )}
              </p>
              <span className="ie-scope-badge">{say(`${stats?.totalCustomers ?? 0} حساب`, `${stats?.totalCustomers ?? 0} Accounts`)}</span>
            </div>
          </div>

          {/* Filters & Format Control Card */}
          <div className="ie-filters-card">
            <div>
              <h2 style={{ fontSize: '17px', fontWeight: 800, marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Filter size={20} color="var(--primary)" />
                <span>{say('2. تخصيص الفلاتر والصيغة المطلوبة', '2. Custom Filters & Output Format')}</span>
              </h2>
              <p className="muted" style={{ fontSize: '13px' }}>
                {say('يمكنك حصر التصدير بفئة أو علامة محددة أو استخراج كل الأصناف دفعة واحدة.', 'Filter by category, brand, or status.')}
              </p>
            </div>

            {/* Filter Dropdowns (Active for catalog / pricing / audit) */}
            {['catalog', 'pricing_stock', 'inventory_audit'].includes(exportScope) && (
              <div className="ie-filters-row">
                <div className="ie-filter-item">
                  <label>{say('الفئة / التصنيف:', 'Category:')}</label>
                  <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}>
                    <option value="all">{say('جميع الفئات', 'All Categories')}</option>
                    {stats?.categories?.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="ie-filter-item">
                  <label>{say('العلامة التجارية:', 'Brand:')}</label>
                  <select value={filterBrand} onChange={(e) => setFilterBrand(e.target.value)}>
                    <option value="all">{say('جميع العلامات التجارية', 'All Brands')}</option>
                    {stats?.brands?.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="ie-filter-item">
                  <label>{say('حالة النشر:', 'Publish Status:')}</label>
                  <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                    <option value="all">{say('الكل (المنشور والمسودات)', 'All (Published & Drafts)')}</option>
                    <option value="published">{say('المنشورة فقط', 'Published Only')}</option>
                    <option value="draft">{say('المسودات فقط', 'Drafts Only')}</option>
                  </select>
                </div>

                <div className="ie-filter-item">
                  <label>{say('حالة المخزون:', 'Stock Availability:')}</label>
                  <select value={filterStock} onChange={(e) => setFilterStock(e.target.value)}>
                    <option value="all">{say('جميع الأصناف', 'All Stock')}</option>
                    <option value="inStock">{say('المتوفر بالمخزون فقط (أكبر من 0)', 'In-Stock Only (> 0)')}</option>
                    <option value="outOfStock">{say('النافد من المخزون فقط (0)', 'Out of Stock Only (0)')}</option>
                  </select>
                </div>
              </div>
            )}

            {/* Format Selection */}
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, marginBottom: '8px' }}>
                {say('صيغة الملف المُصدَّر:', 'Export File Format:')}
              </label>
              <div className="ie-format-pills">
                <button
                  type="button"
                  className={`ie-format-pill ${exportFormat === 'xlsx' ? 'active' : ''}`}
                  onClick={() => setExportFormat('xlsx')}
                >
                  <FileSpreadsheet size={18} color="#059669" />
                  <span>Microsoft Excel (.xlsx)</span>
                  {exportFormat === 'xlsx' && <Check size={16} />}
                </button>

                <button
                  type="button"
                  className={`ie-format-pill ${exportFormat === 'csv' ? 'active' : ''}`}
                  onClick={() => setExportFormat('csv')}
                >
                  <FileText size={18} color="#2563eb" />
                  <span>CSV (UTF-8 BOM معرب)</span>
                  {exportFormat === 'csv' && <Check size={16} />}
                </button>

                <button
                  type="button"
                  className={`ie-format-pill ${exportFormat === 'json' ? 'active' : ''}`}
                  onClick={() => setExportFormat('json')}
                >
                  <Database size={18} color="#7c3aed" />
                  <span>JSON (بيانات خام)</span>
                  {exportFormat === 'json' && <Check size={16} />}
                </button>
              </div>
            </div>

            {/* Action Bar */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px', borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--muted)', fontSize: '13px' }}>
                <Sparkles size={16} color="var(--primary)" />
                <span>
                  {say(
                    'يتم إنشاء الملف مباشرة من السحابة بجداول منسقة وتجميد لصف العناوين ودعم كامل للغة العربية (RTL).',
                    'File is generated live with frozen headers, styled columns, and RTL Arabic support.'
                  )}
                </span>
              </div>

              <button
                type="button"
                className="button primary"
                style={{ minWidth: '220px', fontSize: '15px' }}
                onClick={handleExecuteExport}
              >
                <Download size={18} />
                <span>{say('تصدير وتنزيل الملف الآن', 'Export & Download Now')}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────
          TAB 2: SMART IMPORT & MAPPING WIZARD
          ────────────────────────────────────────── */}
      {activeTab === 'import' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Step 1: Upload Dropzone */}
          {(!preview || (!preview.committed && preview.errors.length > 0)) && (
            <div
              className={`ie-dropzone ${isDragging ? 'dragging' : ''}`}
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragging(false);
                const dropped = e.dataTransfer.files[0];
                if (dropped) handleFileSelected(dropped);
              }}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                style={{ display: 'none' }}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFileSelected(f);
                }}
              />

              <div className="ie-dropzone-icon">
                <UploadCloud size={32} />
              </div>

              <h3 style={{ fontSize: '18px', fontWeight: 800, margin: '0 0 8px' }}>
                {file ? file.name : say('اختر أو اسحب ملف Excel / CSV هنا', 'Drop your Excel or CSV file here')}
              </h3>

              <p className="muted" style={{ fontSize: '13.5px', margin: 0 }}>
                {say(
                  'يدعم قوالب الإكسل والبرامج المحاسبية (يمن سوفت، المتكامل، إبصار، سماك) حتى 2000 صنف في العملية الواحدة.',
                  'Supports standard Excel, YemenSoft, Onyx Pro, and Ebssar exports up to 2000 rows.'
                )}
              </p>

              {file && parsedRows.length > 0 && (
                <div style={{ marginTop: '16px', display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '6px 16px', background: 'rgba(16, 185, 129, 0.1)', color: '#059669', borderRadius: '30px', fontSize: '13.5px', fontWeight: 700 }}>
                  <FileCheck2 size={18} />
                  <span>{say(`تم التعرف على ${parsedRows.length} صنف و ${rawFileHeaders.length} عمود`, `Parsed ${parsedRows.length} rows & ${rawFileHeaders.length} columns`)}</span>
                </div>
              )}
            </div>
          )}

          {parseError && (
            <div className="error-box" role="alert">
              <AlertTriangle size={18} />
              <span>{parseError}</span>
            </div>
          )}

          {/* Step 2: Interactive Smart Column Mapping */}
          {file && rawFileHeaders.length > 0 && !preview?.committed && (
            <div className="ie-mapping-card">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', marginBottom: '14px' }}>
                <div>
                  <h3 style={{ fontSize: '16px', fontWeight: 800, margin: '0 0 4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <SlidersHorizontal size={20} color="var(--primary)" />
                    <span>{say('مطابقة وتعيين أعمدة الملف تلقائياً', 'Smart Column Matching')}</span>
                  </h3>
                  <p className="muted" style={{ fontSize: '13px', margin: 0 }}>
                    {say('تحقق من ربط أعمدة ملفك بالحقول الصحيحة. يمكنك تغيير أي حقل يدوياً بنقرة واحدة.', 'Verify or customize column associations.')}
                  </p>
                </div>

                {!hasSkuMapped && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#dc2626', fontSize: '13px', fontWeight: 700 }}>
                    <AlertTriangle size={16} />
                    <span>{say('حقل رقم المرجع (SKU) مطلوب للمطابقة!', 'SKU reference field is mandatory!')}</span>
                  </div>
                )}
              </div>

              {/* Strategy Selector */}
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: '14px', marginBottom: '16px' }}>
                <label style={{ fontSize: '13.5px', fontWeight: 700, display: 'block', marginBottom: '6px' }}>
                  {say('استراتيجية الدمج والتحديث:', 'Merge Strategy:')}
                </label>
                <div className="ie-strategies-grid">
                  <div
                    className={`ie-strategy-card ${importStrategy === 'price_stock' ? 'selected' : ''}`}
                    onClick={() => setImportStrategy('price_stock')}
                  >
                    <div className="ie-strategy-title">
                      <Zap size={18} color="#d97706" />
                      <span>{say('تحديث المخزون والأسعار فقط (موصى به)', 'Sync Stock & Price Only')}</span>
                    </div>
                    <p className="ie-strategy-desc">
                      {say('يعدل فقط الكمية وسعر البيع للأصناف المطابقة، ويحمي الصور والمواصفات والوصف من أي تغيير.', 'Updates only quantity and price, preserving existing images and specs.')}
                    </p>
                  </div>

                  <div
                    className={`ie-strategy-card ${importStrategy === 'full' ? 'selected' : ''}`}
                    onClick={() => setImportStrategy('full')}
                  >
                    <div className="ie-strategy-title">
                      <Layers size={18} color="#4f46e5" />
                      <span>{say('تحديث شامل لكافة البيانات', 'Full Catalog Update')}</span>
                    </div>
                    <p className="ie-strategy-desc">
                      {say('يطابق ويحدث كافة الحقول المكتشفة في الملف (الأسعار، المخزون، الوصف، الموديل، الفئة).', 'Overwrites all mapped fields from the file.')}
                    </p>
                  </div>
                </div>
              </div>

              {/* Mapping Table */}
              <div style={{ overflowX: 'auto' }}>
                <table className="ie-mapping-table">
                  <thead>
                    <tr>
                      <th style={{ width: '35%' }}>{say('اسم العمود في ملفك المرفوع', 'File Column Header')}</th>
                      <th style={{ width: '40%' }}>{say('الحقل المقابل في متجر الجيل', 'Store Field Mapping')}</th>
                      <th style={{ width: '25%' }}>{say('حالة المطابقة', 'Match Status')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rawFileHeaders.map((header) => {
                      const currentKey = columnMapping[header] || '';
                      const isRequired = currentKey === 'sku' || currentKey === 'titleAr';
                      return (
                        <tr key={header}>
                          <td>
                            <span className="ie-col-badge">{header}</span>
                          </td>
                          <td>
                            <select
                              value={currentKey}
                              style={{ width: '100%', height: '36px', fontSize: '13.5px' }}
                              onChange={(e) => {
                                const newKey = e.target.value;
                                setColumnMapping(prev => ({ ...prev, [header]: newKey }));
                              }}
                            >
                              <option value="">{say('-- تجاهل هذا العمود --', '-- Ignore this column --')}</option>
                              {Object.entries(CANONICAL_FIELD_LABELS).map(([k, meta]) => (
                                <option key={k} value={k}>
                                  {meta.ar} {meta.required ? '★ (إجباري)' : ''}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td>
                            {currentKey ? (
                              <span className="ie-status-pill matched">
                                <Check size={14} />
                                {say('مطابق بنجاح', 'Mapped')}
                              </span>
                            ) : (
                              <span className="ie-status-pill ignored">
                                {say('متجاهل', 'Ignored')}
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Action Toolbar */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', marginTop: '18px', paddingTop: '16px', borderTop: '1px solid var(--border)' }}>
                <button type="button" className="button secondary sm" onClick={resetForm} disabled={busy}>
                  <RefreshCw size={15} />
                  <span>{say('اختيار ملف آخر', 'Choose Another File')}</span>
                </button>

                <div style={{ display: 'flex', gap: '10px' }}>
                  {!preview && (
                    <button
                      type="button"
                      className="button primary"
                      onClick={() => submitImport(false)}
                      disabled={busy || parsing}
                    >
                      {busy ? <RefreshCw size={16} className="spin" /> : <Eye size={16} />}
                      <span>{say('فحص ومعاينة المطابقة أولاً', 'Inspect & Validate')}</span>
                    </button>
                  )}

                  {preview && preview.valid > 0 && preview.errors.length === 0 && !preview.committed && (
                    <button
                      type="button"
                      className="button primary"
                      style={{ background: '#059669' }}
                      onClick={() => submitImport(true)}
                      disabled={busy}
                    >
                      {busy ? <RefreshCw size={16} className="spin" /> : <CheckCircle2 size={16} />}
                      <span>{say(`اعتماد وتطبيق الاستيراد (${preview.valid} صنف)`, `Commit Import (${preview.valid} Items)`)}</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Success Banner */}
          {preview?.committed && (
            <div
              className="card"
              style={{
                padding: '36px',
                textAlign: 'center',
                background: 'rgba(16, 185, 129, 0.05)',
                border: '1.5px solid #10b981',
                borderRadius: '16px',
              }}
            >
              <div style={{ width: 68, height: 68, borderRadius: '50%', background: '#10b981', color: 'white', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
                <CheckCircle2 size={38} />
              </div>
              <h2 style={{ fontSize: '22px', fontWeight: 800, margin: '0 0 8px', color: '#065f46' }}>
                {say('تم اعتماد الاستيراد بنجاح تام!', 'Import Successfully Committed!')}
              </h2>
              <p style={{ fontSize: '14.5px', color: '#047857', maxWidth: '560px', margin: '0 auto 20px', lineHeight: '1.6' }}>
                {say(
                  `تم تحديث ${preview.updatedCount || 0} صنف مسجل في المخزون والأسعار، وإنشاء ${preview.createdCount || 0} صنف جديد كمسودة. تم توثيق كامل التغييرات وحركات المخزون في سجل التدقيق السحابي.`,
                  `Successfully updated ${preview.updatedCount || 0} items and created ${preview.createdCount || 0} new draft items. Recorded in audit log.`
                )}
              </p>
              <button type="button" className="button primary" onClick={resetForm}>
                <span>{say('استيراد ملف إضافي جديد', 'Import Another File')}</span>
              </button>
            </div>
          )}

          {/* Preview Results & Deep Inspection */}
          {preview && !preview.committed && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Stats Summary */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
                <div className="ie-stat-card" style={{ cursor: 'pointer' }} onClick={() => setPreviewTab('all')}>
                  <div className="ie-stat-icon green"><CheckCircle2 size={20} /></div>
                  <div className="ie-stat-info">
                    <span className="ie-stat-value">{preview.valid}</span>
                    <span className="ie-stat-label">{say('صفوف صالحة للمطابقة', 'Valid Rows')}</span>
                  </div>
                </div>

                <div className="ie-stat-card" style={{ cursor: 'pointer' }} onClick={() => setPreviewTab('updates')}>
                  <div className="ie-stat-icon blue"><ArrowRightLeft size={20} /></div>
                  <div className="ie-stat-info">
                    <span className="ie-stat-value">{preview.previews.filter(p => !p.isNew).length}</span>
                    <span className="ie-stat-label">{say('أصناف ستُحدَّث أسعارها/كمياتها', 'To Be Updated')}</span>
                  </div>
                </div>

                <div className="ie-stat-card" style={{ cursor: 'pointer' }} onClick={() => setPreviewTab('new')}>
                  <div className="ie-stat-icon purple"><PlusCircle size={20} /></div>
                  <div className="ie-stat-info">
                    <span className="ie-stat-value">{preview.previews.filter(p => p.isNew).length}</span>
                    <span className="ie-stat-label">{say('أصناف جديدة كلياً', 'To Be Created')}</span>
                  </div>
                </div>

                <div className="ie-stat-card">
                  <div className="ie-stat-icon amber"><AlertTriangle size={20} /></div>
                  <div className="ie-stat-info">
                    <span className="ie-stat-value">{preview.errors.length}</span>
                    <span className="ie-stat-label">{say('صفوف أخطاء تحجب الاعتماد', 'Error Rows')}</span>
                  </div>
                </div>
              </div>

              {/* Errors Box */}
              {preview.errors.length > 0 && (
                <div className="card" style={{ padding: '20px', border: '1.5px solid #ef4444', background: 'rgba(239, 68, 68, 0.04)' }}>
                  <h3 style={{ margin: '0 0 12px', color: '#b91c1c', fontSize: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <XCircle size={18} />
                    <span>{say(`تم العثور على ${preview.errors.length} مشكلة يلزم تصحيحها في الملف:`, `Found ${preview.errors.length} errors that must be fixed:`)}</span>
                  </h3>
                  <div style={{ maxHeight: '180px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {preview.errors.map((err, i) => (
                      <div key={i} style={{ fontSize: '13px', color: '#991b1b', padding: '6px 10px', background: 'white', borderRadius: '6px', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                        <strong>{say(`سطر #${err.row}:`, `Row #${err.row}:`)}</strong> {err.message}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Preview Rows Table */}
              {preview.previews.length > 0 && (
                <div className="card" style={{ padding: '20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
                    <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800 }}>
                      {say('جدول معاينة التأثير التفصيلي قبل الاعتماد', 'Detailed Impact Preview')}
                    </h3>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        type="button"
                        className={`button subtle ${previewTab === 'all' ? 'active' : ''}`}
                        onClick={() => setPreviewTab('all')}
                      >
                        {say('عرض الكل', 'All')} ({preview.previews.length})
                      </button>
                      <button
                        type="button"
                        className={`button subtle ${previewTab === 'updates' ? 'active' : ''}`}
                        onClick={() => setPreviewTab('updates')}
                      >
                        {say('التعديلات فقط', 'Updates')} ({preview.previews.filter(p => !p.isNew).length})
                      </button>
                      <button
                        type="button"
                        className={`button subtle ${previewTab === 'new' ? 'active' : ''}`}
                        onClick={() => setPreviewTab('new')}
                      >
                        {say('الجديد فقط', 'New')} ({preview.previews.filter(p => p.isNew).length})
                      </button>
                    </div>
                  </div>

                  <div className="ie-preview-table-wrap">
                    <table className="ie-preview-table">
                      <thead>
                        <tr>
                          <th style={{ width: '50px' }}>#</th>
                          <th style={{ width: '180px' }}>{say('رقم المرجع (SKU)', 'SKU')}</th>
                          <th style={{ width: '30%' }}>{say('اسم الصنف', 'Product Name')}</th>
                          <th style={{ width: '130px' }}>{say('نوع المطابقة', 'Match Type')}</th>
                          <th>{say('التغييرات المتوقعة', 'Projected Changes')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredPreviews.map((p) => (
                          <tr key={p.row}>
                            <td style={{ color: 'var(--muted)', fontWeight: 600 }}>{p.row}</td>
                            <td>
                              <span className="ie-col-badge">{p.sku}</span>
                            </td>
                            <td>
                              <strong>{p.productName}</strong>
                            </td>
                            <td>
                              {p.isNew ? (
                                <span className="change-pill green">
                                  {say('صنف جديد كلياً', 'New Product')}
                                </span>
                              ) : (
                                <span className="change-pill">
                                  {say(`مطابق بـ ${p.matchedBy}`, `Matched by ${p.matchedBy}`)}
                                </span>
                              )}
                            </td>
                            <td>
                              {p.changes.length ? (
                                p.changes.map((c, idx) => (
                                  <span key={idx} className="change-pill amber">
                                    {c}
                                  </span>
                                ))
                              ) : (
                                <span style={{ color: 'var(--muted)', fontSize: '12.5px' }}>
                                  {say('لا تغييرات (البيانات متطابقة)', 'No changes detected')}
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ──────────────────────────────────────────
          TAB 3: ACCOUNTING TEMPLATES HUB
          ────────────────────────────────────────── */}
      {activeTab === 'templates' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '4px' }}>
              {say('مكتبة القوالب المحاسبية الجاهزة للتنزيل', 'Accounting & ERP Ready Templates')}
            </h2>
            <p className="muted" style={{ fontSize: '13.5px' }}>
              {say(
                'قوالب إكسل مهيأة ومطابقة تلقائياً لأشهر البرامج المحاسبية في اليمن والخليج لضمان استيراد وتصدير سلس دون أي تعديل يدوي.',
                'Pre-configured templates matching popular ERP systems in Yemen and the region.'
              )}
            </p>
          </div>

          <div className="ie-templates-grid">
            {/* Template: YemenSoft / Al-Mutakamel */}
            <div className="ie-template-card">
              <div className="ie-template-icon" style={{ background: 'rgba(30, 64, 175, 0.1)', color: '#1e40af' }}>
                <Database size={24} />
              </div>
              <h3>{say('قالب نظام المتكامل / يمن سوفت (Onyx Pro)', 'YemenSoft / Onyx Pro Template')}</h3>
              <p>
                {say(
                  'مهيأ بمسميات حقول برنامج المتكامل: رقم الصنف، كود الباركود، البيان، رصيد المخزون، وسعر البيع نقداً بالدولار.',
                  'Matches Al-Mutakamel fields: Item Code, Barcode, Description, Balance, and Cash Price.'
                )}
              </p>
              <div className="ie-template-meta">
                <span>✓ {say('متوافق 100% مع تقرير أرصدة الأصناف', '100% Compatible with Onyx stock report')}</span>
                <span>✓ {say('أعمدة جاهزة للنسخ واللصق الفوري', 'Direct copy/paste format')}</span>
              </div>
              <a
                href="/api/admin/commerce/excel/template?type=yemensoft"
                className="button secondary"
                style={{ width: '100%' }}
              >
                <Download size={16} />
                <span>{say('تنزيل قالب يمن سوفت (.xlsx)', 'Download YemenSoft Template')}</span>
              </a>
            </div>

            {/* Template: Ebssar / Smacc */}
            <div className="ie-template-card">
              <div className="ie-template-icon" style={{ background: 'rgba(5, 150, 105, 0.1)', color: '#059669' }}>
                <Coins size={24} />
              </div>
              <h3>{say('قالب نظام إبصار / سماك المحاسبي', 'Ebssar & SMACC Template')}</h3>
              <p>
                {say(
                  'مهيأ بمسميات: رمز الصنف، اسم الصنف، الكمية المتاحة، وسعر البيع، مخصص لتحديثات الجرد المستمر الدورية.',
                  'Configured for Ebssar and SMACC: Item Code, Name, Available Qty, and Selling Price.'
                )}
              </p>
              <div className="ie-template-meta">
                <span>✓ {say('مخصص للجرد والتسعير اليومي', 'Optimized for daily inventory & pricing')}</span>
                <span>✓ {say('ترميز عربي معتمد', 'Standard Arabic encoding')}</span>
              </div>
              <a
                href="/api/admin/commerce/excel/template?type=ebssar"
                className="button secondary"
                style={{ width: '100%' }}
              >
                <Download size={16} />
                <span>{say('تنزيل قالب إبصار / سماك (.xlsx)', 'Download Ebssar Template')}</span>
              </a>
            </div>

            {/* Template: Fast Stock & Price */}
            <div className="ie-template-card">
              <div className="ie-template-icon" style={{ background: 'rgba(217, 119, 6, 0.1)', color: '#d97706' }}>
                <Zap size={24} />
              </div>
              <h3>{say('قالب التحديث السريع (مخزون وأسعار فقط)', 'Quick Price & Stock Template')}</h3>
              <p>
                {say(
                  'أبسط وأسرع قالب: فقط 4 أعمدة رئيسية (رقم المرجع SKU، اسم الصنف، الكمية، والسعر بالدولار). مثالي للتحديثات اليومية.',
                  'The fastest template: only 4 columns (SKU, Name, Qty, and Price USD).'
                )}
              </p>
              <div className="ie-template-meta">
                <span>✓ {say('سرعة فائقة في المعالجة والمطابقة', 'Ultra-fast matching and import')}</span>
                <span>✓ {say('حماية كاملة للصور والمواصفات', 'Safeguards all images and descriptions')}</span>
              </div>
              <a
                href="/api/admin/commerce/excel/template?type=price_stock"
                className="button secondary"
                style={{ width: '100%' }}
              >
                <Download size={16} />
                <span>{say('تنزيل قالب التحديث السريع (.xlsx)', 'Download Fast Sync Template')}</span>
              </a>
            </div>

            {/* Template: Full Catalog Standard */}
            <div className="ie-template-card">
              <div className="ie-template-icon" style={{ background: 'rgba(99, 102, 241, 0.1)', color: '#6366f1' }}>
                <FileSpreadsheet size={24} />
              </div>
              <h3>{say('قالب الكتالوج المتقدم للمنتجات الجديدة', 'Full Specifications Template')}</h3>
              <p>
                {say(
                  'قالب إدخال شامل يحتوي على كافة الحقول: رقم المرجع، الاسم بالعربي والإنجليزي، الموديل، الفئة، الماركة، الحالة (A/B/C/جديد).',
                  'Comprehensive template with all specifications, bilingual names, model, brand, category, and condition.'
                )}
              </p>
              <div className="ie-template-meta">
                <span>✓ {say('ورقة دليل استخدام داخلية مشروحة', 'Embedded help sheet with full instructions')}</span>
                <span>✓ {say('إنشاء وتوليد معرفات الموقع تلقائياً', 'Auto-generates product and variant IDs')}</span>
              </div>
              <a
                href="/api/admin/commerce/excel/template"
                className="button secondary"
                style={{ width: '100%' }}
              >
                <Download size={16} />
                <span>{say('تنزيل قالب الكتالوج الشامل (.xlsx)', 'Download Full Catalog Template')}</span>
              </a>
            </div>
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────
          TAB 4: SYNC & MATCHING GUIDE
          ────────────────────────────────────────── */}
      {activeTab === 'guide' && (
        <div className="card" style={{ padding: '28px', lineHeight: '1.8' }}>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--primary)', marginBottom: '16px' }}>
            <Info size={24} />
            <span>{say('دليل الربط والمطابقة الذكية مع الأنظمة المحاسبية', 'Accounting Sync & Matching Guide')}</span>
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
            <div style={{ background: 'var(--surface-soft)', padding: '18px', borderRadius: '14px', border: '1px solid var(--border)' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 800, marginBottom: '8px', color: '#1e40af' }}>
                1. {say('رقم المرجع (SKU) هو العمود الفقري', '1. The SKU Reference is Key')}
              </h3>
              <p style={{ fontSize: '13.5px', color: 'var(--muted)', margin: 0 }}>
                {say(
                  'هو كود الصنف أو الباركود في نظامك المحاسبي. يعتمد عليه المتجر لمطابقة الصنف بنسبة 100%، وتحديث سعره ومخزونه دون حدوث أي تكرار.',
                  'The SKU from your accounting software. Used by the store to identify variants with 100% accuracy.'
                )}
              </p>
            </div>

            <div style={{ background: 'var(--surface-soft)', padding: '18px', borderRadius: '14px', border: '1px solid var(--border)' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 800, marginBottom: '8px', color: '#059669' }}>
                2. {say('قاعدة الأمان: الحقول الفارغة لا تمسح البيانات', '2. Empty Fields Rule: Safe Updates')}
              </h3>
              <p style={{ fontSize: '13.5px', color: 'var(--muted)', margin: 0 }}>
                {say(
                  'إذا تركت أي عمود فارغاً في ملف إكسل (مثل الوصف أو الصور أو الموديل)، لن يتم مسحه أو تصفيره في المتجر، بل سيحافظ النظام على بياناته السابقة.',
                  'Leaving columns blank in Excel will never erase existing descriptions or images on the site.'
                )}
              </p>
            </div>

            <div style={{ background: 'var(--surface-soft)', padding: '18px', borderRadius: '14px', border: '1px solid var(--border)' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 800, marginBottom: '8px', color: '#d97706' }}>
                3. {say('التوافق التلقائي مع تقارير البرامج اليمنية', '3. Auto-Compatibility with Yemeni ERPs')}
              </h3>
              <p style={{ fontSize: '13.5px', color: 'var(--muted)', margin: 0 }}>
                {say(
                  'يتعرف النظام بذكاء على مسميات تقارير برنامج المتكامل (يمن سوفت)، الأونكس، إبصار، وسماك، مثل: (البيان، الرصيد، كود الصنف، سعر البيع نقداً).',
                  'Recognizes standard Arabic headers exported from YemenSoft, Onyx Pro, and Ebssar automatically.'
                )}
              </p>
            </div>

            <div style={{ background: 'var(--surface-soft)', padding: '18px', borderRadius: '14px', border: '1px solid var(--border)' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 800, marginBottom: '8px', color: '#7c3aed' }}>
                4. {say('إنشاء الأصناف الجديدة آلياً كمسودة', '4. Auto-Draft Creation for New Items')}
              </h3>
              <p style={{ fontSize: '13.5px', color: 'var(--muted)', margin: 0 }}>
                {say(
                  'إذا أضفت في ملفك أصنافاً برقم مرجع جديد غير مسجل في المتجر، سيقوم النظام بإنشائها فوراً كمسودة جاهزة لإضافة صورها ونشرها.',
                  'Unrecognized SKUs are created instantly as drafts ready for image attachment and publication.'
                )}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
