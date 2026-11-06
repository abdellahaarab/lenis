import { useState, useEffect } from 'react';
import type { ProductEdit } from '@aljeel/shared';
import {
  Sparkles,
  Search,
  X,
  ExternalLink,
  Check,
  CheckSquare,
  Square,
  AlertTriangle,
  LoaderCircle,
  Download,
  Link as LinkIcon,
  FileCode,
  Image as ImageIcon,
  Package,
  Globe,
  FolderArchive,
} from 'lucide-react';
import { api, ApiError } from './api';
import { useI18n } from './i18n';
import { Modal } from './components';
import { VisualProductPickerModal } from './VisualProductPickerModal';

export interface AmazonImageItem {
  url: string;
  thumb: string;
  variant?: string;
  selected?: boolean;
}

/**
 * Cleans a search query by removing unwanted symbols, extra spaces, and problematic chars
 */
export function cleanSearchQuery(text: string): string {
  if (!text) return '';
  return text
    // Replace hyphens, dashes, slashes, underscores with spaces to prevent search syntax negation (e.g. -Pin)
    .replace(/[-_\\/|()[\]{}<>:;,+~`!@#$%^&=*?]/g, ' ')
    // Replace decimal dots in integer-like decimals (e.g. 20.0V -> 20V)
    .replace(/(\d+)\.0+([A-Za-z])/gi, '$1$2')
    .replace(/(\d+)\.0+(\s|$)/g, '$1$2')
    // Keep Unicode letters, numbers, spaces, and decimal points
    .replace(/[^\p{L}\p{N}\s.]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Creates a Google search URL with 'amazon' prefix to find the product reliably without bot blocks
 */
export function getGoogleSearchUrl(query: string, siteAmazon = false): string {
  const clean = cleanSearchQuery(query);
  if (siteAmazon) {
    return `https://www.google.com/search?q=${encodeURIComponent(`site:amazon.com ${clean}`)}`;
  }
  return `https://www.google.com/search?q=${encodeURIComponent(`amazon ${clean}`)}`;
}

/**
 * Creates a simplified, clean Amazon search URL that avoids Amazon's 500 error dog page
 */
export function getAmazonSearchUrl(query: string): string {
  const clean = cleanSearchQuery(query)
    .replace(/\./g, ' ')
    .split(' ')
    .filter(w => {
      const lower = w.toLowerCase();
      return w.length > 0 && !['original', 'pin', 'genuine', 'oem', 'replacement', 'ac', 'dc'].includes(lower);
    });

  const tokens = clean.slice(0, 5).join(' ');
  const fallback = cleanSearchQuery(query).slice(0, 35);
  return `https://www.amazon.com/s?k=${encodeURIComponent(tokens || fallback)}`;
}

interface AmazonImageModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetProduct: ProductEdit | null;
  allProducts: ProductEdit[];
  onImportComplete: (importedPaths: string[], updatedProduct?: ProductEdit) => void;
}

export function AmazonImageModal({
  open,
  onOpenChange,
  targetProduct,
  allProducts,
  onImportComplete,
}: AmazonImageModalProps) {
  const { lang } = useI18n();
  const ar = lang === 'ar';
  const say = (a: string, e: string) => (ar ? a : e);

  // Selected product to link images to
  const [selectedProductId, setSelectedProductId] = useState<string>(targetProduct?.id ?? '');
  const [saveToLibraryOnly, setSaveToLibraryOnly] = useState<boolean>(!targetProduct);
  const [productPickerOpen, setProductPickerOpen] = useState(false);

  // Input tabs: 'auto' (URL/ASIN), 'direct' (direct links), 'html' (page code)
  const [inputMode, setInputMode] = useState<'auto' | 'direct' | 'html'>('auto');
  const [inputQuery, setInputQuery] = useState('');

  // Search Assistant state
  const [customSearchTerm, setCustomSearchTerm] = useState('');
  const [searchQueryGuidance, setSearchQueryGuidance] = useState('');

  // Fetching state
  const [isFetching, setIsFetching] = useState(false);
  const [fetchError, setFetchError] = useState('');
  const [isCaptcha, setIsCaptcha] = useState(false);
  const [amazonTitle, setAmazonTitle] = useState('');

  // Discovered images
  const [images, setImages] = useState<AmazonImageItem[]>([]);

  // Import options
  const [setAsPrimary, setSetAsPrimary] = useState(true);
  const [replaceExisting, setReplaceExisting] = useState(false);

  // Importing state
  const [isImporting, setIsImporting] = useState(false);
  const [importSuccessMsg, setImportSuccessMsg] = useState('');

  // Update selected product when targetProduct prop changes
  useEffect(() => {
    if (targetProduct) {
      setSelectedProductId(targetProduct.id);
      setSaveToLibraryOnly(false);
    } else {
      setSelectedProductId(allProducts[0]?.id ?? '');
      setSaveToLibraryOnly(false);
    }
  }, [targetProduct, allProducts]);

  // The active product object
  const activeProduct = saveToLibraryOnly
    ? null
    : (allProducts.find(p => p.id === selectedProductId) ?? targetProduct);

  const defaultProductQuery = activeProduct?.model
    || (activeProduct?.title && typeof activeProduct.title === 'object'
        ? activeProduct.title[lang] || activeProduct.title['en'] || activeProduct.title['ar'] || ''
        : '')
    || '';
  const effectiveSearchTerm = (customSearchTerm.trim() || defaultProductQuery).trim();

  // Sync search assistant query when active product changes
  useEffect(() => {
    if (activeProduct) {
      const q = activeProduct.model
        || (activeProduct.title && typeof activeProduct.title === 'object'
            ? activeProduct.title[lang] || activeProduct.title['en'] || activeProduct.title['ar'] || ''
            : '')
        || '';
      setCustomSearchTerm(q);
    }
  }, [selectedProductId, targetProduct, lang]);

  // Reset state when opening
  useEffect(() => {
    if (open) {
      setFetchError('');
      setSearchQueryGuidance('');
      setIsCaptcha(false);
      setImportSuccessMsg('');
      if (images.length === 0 && targetProduct?.model) {
        // Pre-fill prompt or hint if available
        if (targetProduct.specSources && targetProduct.specSources.length > 0) {
          const amzSource = targetProduct.specSources.find(s => s.includes('amazon'));
          if (amzSource) setInputQuery(amzSource);
        }
      }
    }
  }, [open, targetProduct]);

  const selectedCount = images.filter(img => img.selected).length;

  // Execute fetch from Amazon
  async function handleFetch() {
    const trimmedInput = inputQuery.trim();
    if (!trimmedInput) {
      setFetchError(say('يرجى إدخال رابط أمازون أو رمز ASIN أو روابط الصور', 'Please enter an Amazon URL, ASIN, or image links'));
      return;
    }

    setSearchQueryGuidance('');

    // Check if input is a Google search redirect URL (e.g. google.com/url?q=... or ?url=...)
    let effectiveInput = trimmedInput;
    if (trimmedInput.includes('google.') && (trimmedInput.includes('url=') || trimmedInput.includes('q='))) {
      const qMatch = trimmedInput.match(/[?&](?:url|q)=([^&]+)/i);
      if (qMatch && qMatch[1]) {
        try {
          let decoded = decodeURIComponent(qMatch[1]);
          if (decoded.includes('%')) decoded = decodeURIComponent(decoded);
          effectiveInput = decoded;
          setInputQuery(decoded);
        } catch {}
      }
    }

    // If in auto mode, check if the input looks like a search query rather than a URL or ASIN
    const isUrl = /^https?:\/\//i.test(effectiveInput) || effectiveInput.includes('amazon.') || effectiveInput.includes('google.');
    const isAsin = /^[A-Za-z0-9]{10}$/.test(effectiveInput);
    if (!isUrl && !isAsin && inputMode === 'auto') {
      setSearchQueryGuidance(effectiveInput);
      setFetchError(
        say(
          'المدخل يبدو كاسم أو موديل للمنتج وليس رابط صفحة أمازون. يمكنك البحث عنه بنقرة واحدة أدناه ثم لصق رابط صفحة المنتج هنا:',
          'The input looks like a product name/model, not an Amazon URL. Click a search button below to find it, then paste the product page URL here:'
        )
      );
      return;
    }

    setIsFetching(true);
    setFetchError('');
    setIsCaptcha(false);
    setImportSuccessMsg('');

    try {
      const res = await api<{
        title: string;
        asin?: string;
        images: { url: string; thumb: string; variant?: string }[];
        captchaChallenge?: boolean;
        message?: string;
      }>('/commerce/amazon/fetch', {
        method: 'POST',
        body: { input: effectiveInput }
      });

      if (res.captchaChallenge) {
        setIsCaptcha(true);
        setFetchError(res.message || say('واجهت أمازون تحدياً أمنياً. يرجى لصق روابط الصور مباشرة.', 'Amazon security challenge encountered.'));
        return;
      }

      if (!res.images || res.images.length === 0) {
        setFetchError(say('لم يتم العثور على صور في الرابط المدخل', 'No images found in the provided link'));
        return;
      }

      setAmazonTitle(res.title || '');
      // Mark all discovered images as selected by default
      setImages(res.images.map(img => ({ ...img, selected: true })));
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setFetchError(err.code === 'invalid_amazon_url_or_asin'
          ? say('الرابط أو رمز ASIN المدخل غير صحيح', 'Invalid Amazon URL or ASIN')
          : err.code);
      } else {
        setFetchError(String(err));
      }
    } finally {
      setIsFetching(false);
    }
  }

  // Toggle selection for a specific image
  function toggleImageSelection(index: number) {
    setImages(prev => prev.map((img, i) => i === index ? { ...img, selected: !img.selected } : img));
  }

  // Select all or deselect all
  function selectAll(val: boolean) {
    setImages(prev => prev.map(img => ({ ...img, selected: val })));
  }

  // Execute import & save to store
  async function handleImport() {
    const selectedUrls = images.filter(img => img.selected).map(img => img.url);
    if (selectedUrls.length === 0) {
      setFetchError(say('يرجى اختيار صورة واحدة على الأقل للاستيراد', 'Please select at least one image to import'));
      return;
    }

    setIsImporting(true);
    setFetchError('');

    try {
      const payload = {
        imageUrls: selectedUrls,
        productId: saveToLibraryOnly ? undefined : activeProduct?.id,
        setAsPrimary,
        replaceExisting,
        altAr: activeProduct ? (activeProduct.title as any)?.ar || activeProduct.model : amazonTitle,
        altEn: activeProduct ? (activeProduct.title as any)?.en || activeProduct.model : amazonTitle,
      };

      const result = await api<{
        ok: boolean;
        count: number;
        imported: { id: string; path: string }[];
        product?: ProductEdit;
      }>('/commerce/amazon/import', {
        method: 'POST',
        body: payload
      });

      const paths = result.imported.map(item => item.path);
      setImportSuccessMsg(
        say(
          `تم استيراد ${result.count} صورة بنجاح ${activeProduct ? 'وربطها بالمنتج' : 'وحفظها في المكتبة'}!`,
          `Successfully imported ${result.count} images ${activeProduct ? 'and linked to product' : 'to media library'}!`
        )
      );

      // Notify parent component
      onImportComplete(paths, result.product);

      // Close modal smoothly after brief delay
      setTimeout(() => {
        onOpenChange(false);
      }, 1400);
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setFetchError(err.code);
      } else {
        setFetchError(say('فشل استيراد الصور من الخادم', 'Failed to import images from server'));
      }
    } finally {
      setIsImporting(false);
    }
  }

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={say('استيراد الصور من أمازون', 'Import Images from Amazon')}
      description={say(
        'جلب صور المنتجات الأصلية عالية الدقة من أمازون ومعالجتها تلقائياً بصيغة WebP فائقة الجودة للمتجر.',
        'Fetch high-resolution original product images from Amazon and auto-optimize to WebP format.'
      )}
    >
      <div className="amazon-import-modal-content">
        {/* Step 1: Target Product Selection & Info */}
        <section className="amazon-target-section">
          <div className="amazon-section-title-row">
            <span className="amazon-step-badge">1</span>
            <strong>{say('المنتج المستهدف', 'Target Product')}</strong>
          </div>

          <div className="amazon-target-card">
            {!saveToLibraryOnly && activeProduct ? (
              <div className="amazon-product-selected-info">
                <div className="amazon-product-thumb">
                  {activeProduct.images?.[0] ? (
                    <img
                      src={activeProduct.images[0].replace('/api/media/', '/api/admin/media/')}
                      alt={activeProduct.title[lang] || activeProduct.model}
                    />
                  ) : (
                    <div className="amazon-thumb-fallback">
                      <Package size={22} />
                    </div>
                  )}
                </div>
                <div className="amazon-product-meta">
                  <strong className="amazon-product-title">
                    {activeProduct.title[lang] || activeProduct.model || say('(بدون عنوان)', '(Untitled)')}
                  </strong>
                  <div className="amazon-product-tags">
                    {activeProduct.model && (
                      <span className="meta-pill model-pill">{activeProduct.model}</span>
                    )}
                    {activeProduct.brand && (
                      <span className="meta-pill brand-pill">{activeProduct.brand}</span>
                    )}
                    <span className="meta-pill">
                      {activeProduct.images?.length ?? 0} {say('صور حالية', 'current photos')}
                    </span>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                  <button
                    type="button"
                    className="button secondary sm"
                    onClick={() => setProductPickerOpen(true)}
                  >
                    {say('تغيير المنتج', 'Change Product')}
                  </button>
                  <button
                    type="button"
                    className="button subtle sm amazon-detach-btn"
                    onClick={() => setSaveToLibraryOnly(true)}
                    title={say('استيراد للوسائط دون ربط بمنتج', 'Import to media library without linking')}
                  >
                    <X size={14} />
                    <span>{say('فك الربط', 'Detach')}</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="amazon-product-picker-row">
                <div className="visual-entity-trigger-card">
                  <div className="visual-entity-info-side">
                    <div className="visual-entity-thumb">
                      <FolderArchive size={22} style={{ color: 'var(--primary)' }} />
                    </div>
                    <div className="visual-entity-texts">
                      <span className="visual-entity-title">{say('مكتبة الوسائط العامة فقط', 'Media Library Only')}</span>
                      <span className="visual-entity-subtitle">{say('الصور المستوردة لن ترتبط بمنتج محدد وتُحفظ في المعرض', 'Imported photos will not link to a product')}</span>
                    </div>
                  </div>
                  <div className="visual-entity-actions">
                    <button
                      type="button"
                      className="button primary sm"
                      onClick={() => setProductPickerOpen(true)}
                    >
                      {say('ربط بمنتج من الكتالوج', 'Link to Product')}
                    </button>
                  </div>
                </div>
              </div>
            )}

            <VisualProductPickerModal
              open={productPickerOpen}
              onOpenChange={setProductPickerOpen}
              products={allProducts.map(p => ({
                id: p.id,
                title: p.title,
                model: p.model,
                brand: p.brand,
                category: p.category,
                images: p.images,
              }))}
              selectedProductId={selectedProductId}
              onSelect={(id) => {
                setSelectedProductId(id);
                setSaveToLibraryOnly(false);
              }}
              allowLibraryOnly={true}
              onSelectLibraryOnly={() => {
                setSaveToLibraryOnly(true);
              }}
              isLibraryOnlySelected={saveToLibraryOnly}
              title={say('اختيار المنتج لربط صور أمازون به', 'Select Target Product')}
            />
          </div>
        </section>

        {/* Step 2: Amazon Search & Source Input */}
        <section className="amazon-source-section">
          <div className="amazon-section-title-row">
            <span className="amazon-step-badge">2</span>
            <strong>{say('البحث ومصدر الصور من أمازون', 'Search & Amazon Images Source')}</strong>
          </div>

          {/* Search Assistant Box */}
          <div className="amazon-search-assist-box">
            <div className="assist-box-header">
              <div className="assist-title-row">
                <Search size={15} className="assist-icon" />
                <strong className="assist-title">
                  {say('مساعد البحث عن المنتج في أمازون', 'Amazon Product Search Assistant')}
                </strong>
                <span className="assist-badge-rec">
                  {say('موصى به لتفادي أخطاء أمازون', 'Recommended to avoid Amazon errors')}
                </span>
              </div>
              <p className="assist-subtitle">
                {say(
                  'ابحث عن المنتج بنقرة واحدة في Google باسم أمازون أو افتح بحث أمازون المبسّط، ثم انسخ رابط الصفحة والصقه أدناه:',
                  'Search for the product with 1 click on Google with Amazon name or simplified Amazon search, then copy and paste its URL below:'
                )}
              </p>
            </div>

            <div className="assist-query-row">
              <span className="assist-query-label">{say('عبارة البحث:', 'Search query:')}</span>
              <input
                type="text"
                className="assist-query-input"
                value={customSearchTerm}
                onChange={e => setCustomSearchTerm(e.target.value)}
                placeholder={say('اكتب موديل أو اسم المنتج للبحث…', 'Type model or product name…')}
              />
              {customSearchTerm && customSearchTerm !== defaultProductQuery && (
                <button
                  type="button"
                  className="button subtle sm assist-reset-btn"
                  onClick={() => setCustomSearchTerm(defaultProductQuery)}
                  title={say('استعادة موديل المنتج الأصلي', 'Reset to product model')}
                >
                  <X size={12} />
                </button>
              )}
            </div>

            <div className="assist-buttons-grid">
              <a
                href={getGoogleSearchUrl(effectiveSearchTerm)}
                target="_blank"
                rel="noopener noreferrer"
                className="search-assist-btn google-primary"
                title={say('بحث موصى به: يبحث في Google باسم أمازون ويعرض رابط المنتج مباشرة بدون حظر أو أخطاء', 'Recommended: Google search with Amazon name - error free')}
              >
                <Globe size={16} />
                <div className="btn-text-col">
                  <span className="btn-main-label">{say('بحث Google باسم أمازون', 'Search Google with Amazon')}</span>
                  <span className="btn-sub-label">{say('⭐ موصى به - يفتح المنتج مباشرة', '⭐ Recommended - direct listing')}</span>
                </div>
                <ExternalLink size={13} className="btn-ext-icon" />
              </a>

              <a
                href={getGoogleSearchUrl(effectiveSearchTerm, true)}
                target="_blank"
                rel="noopener noreferrer"
                className="search-assist-btn google-secondary"
                title={say('بحث Google مخصص لنتائج موقع أمازون فقط (site:amazon.com)', 'Google search restricted to site:amazon.com')}
              >
                <Search size={14} />
                <div className="btn-text-col">
                  <span className="btn-main-label">Google (site:amazon.com)</span>
                  <span className="btn-sub-label">{say('تقييد النتائج بموقع أمازون', 'Restrict results to Amazon')}</span>
                </div>
                <ExternalLink size={13} className="btn-ext-icon" />
              </a>

              <a
                href={getAmazonSearchUrl(effectiveSearchTerm)}
                target="_blank"
                rel="noopener noreferrer"
                className="search-assist-btn amazon-direct"
                title={say('بحث مباشر في أمازون تم تنظيفه ومعالجة رموزه لتجنب صفحة الخطأ 500 أو صفحة الكلب', 'Direct Amazon search cleaned to avoid 500 error / dog page')}
              >
                <span className="amz-logo-badge">amz</span>
                <div className="btn-text-col">
                  <span className="btn-main-label">{say('بحث أمازون المبسّط', 'Simplified Amazon Search')}</span>
                  <span className="btn-sub-label">{say('معالَج ضد أخطاء 500', 'Cleaned against 500 errors')}</span>
                </div>
                <ExternalLink size={13} className="btn-ext-icon" />
              </a>
            </div>
          </div>

          {/* Input Mode Selector */}
          <div className="amazon-mode-tabs">
            <button
              type="button"
              className={`amazon-mode-tab ${inputMode === 'auto' ? 'active' : ''}`}
              onClick={() => setInputMode('auto')}
            >
              <LinkIcon size={14} />
              <span>{say('رابط المنتج أو ASIN', 'Product Link / ASIN')}</span>
            </button>
            <button
              type="button"
              className={`amazon-mode-tab ${inputMode === 'direct' ? 'active' : ''}`}
              onClick={() => setInputMode('direct')}
            >
              <ImageIcon size={14} />
              <span>{say('روابط الصور المباشرة (سريع)', 'Direct Image Links')}</span>
            </button>
            <button
              type="button"
              className={`amazon-mode-tab ${inputMode === 'html' ? 'active' : ''}`}
              onClick={() => setInputMode('html')}
            >
              <FileCode size={14} />
              <span>{say('كود الصفحة HTML', 'Page HTML Code')}</span>
            </button>
          </div>

          <div className="amazon-input-box">
            {inputMode === 'auto' && (
              <div className="amazon-input-row">
                <input
                  dir="ltr"
                  className="amazon-text-input"
                  placeholder={say('https://www.amazon.com/dp/B07D99KFPK أو B07D99KFPK أو رابط من Google', 'https://www.amazon.com/dp/B07D99KFPK, ASIN, or Google link')}
                  value={inputQuery}
                  onChange={e => setInputQuery(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') void handleFetch(); }}
                />
                <button
                  type="button"
                  className="button primary amazon-fetch-btn"
                  disabled={isFetching || !inputQuery.trim()}
                  onClick={() => void handleFetch()}
                >
                  {isFetching ? (
                    <>
                      <LoaderCircle className="spin" size={16} />
                      <span>{say('جارٍ الجلب…', 'Fetching…')}</span>
                    </>
                  ) : (
                    <>
                      <Sparkles size={16} />
                      <span>{say('جلب الصور', 'Fetch Images')}</span>
                    </>
                  )}
                </button>
              </div>
            )}

            {inputMode === 'direct' && (
              <div className="amazon-direct-box">
                <p className="amazon-tip-text">
                  {say(
                    '💡 نصيحة: في صفحة أمازون، انقر بزر الفأرة الأيمن على أي صورة للمنتج واختر «نسخ عنوان الصورة»، ثم ألصق الروابط هنا (رابط في كل سطر).',
                    '💡 Tip: Right-click product images on Amazon, choose "Copy image address", and paste here (one per line).'
                  )}
                </p>
                <textarea
                  dir="ltr"
                  rows={4}
                  className="amazon-textarea"
                  placeholder={`https://m.media-amazon.com/images/I/71Czt9ypIbL._AC_SL1500_.jpg\nhttps://m.media-amazon.com/images/I/81OjMaK4TzL._AC_SL1500_.jpg`}
                  value={inputQuery}
                  onChange={e => setInputQuery(e.target.value)}
                />
                <button
                  type="button"
                  className="button primary amazon-fetch-btn"
                  disabled={isFetching || !inputQuery.trim()}
                  onClick={() => void handleFetch()}
                >
                  {isFetching ? <LoaderCircle className="spin" size={16} /> : <ImageIcon size={16} />}
                  <span>{say('استخراج ومعاينة الصور', 'Extract & Preview Images')}</span>
                </button>
              </div>
            )}

            {inputMode === 'html' && (
              <div className="amazon-html-box">
                <p className="amazon-tip-text">
                  {say(
                    'إذا طلبت أمازون اختبار أمان، افتح صفحة المنتج في متصفحك واضغط Ctrl+U لنسخ كود الصفحة ولصقه هنا:',
                    'If challenged by Amazon, open the product page in browser, view source (Ctrl+U), and paste HTML here:'
                  )}
                </p>
                <textarea
                  dir="ltr"
                  rows={4}
                  className="amazon-textarea"
                  placeholder="<!DOCTYPE html><html>...</html>"
                  value={inputQuery}
                  onChange={e => setInputQuery(e.target.value)}
                />
                <button
                  type="button"
                  className="button primary amazon-fetch-btn"
                  disabled={isFetching || !inputQuery.trim()}
                  onClick={() => void handleFetch()}
                >
                  {isFetching ? <LoaderCircle className="spin" size={16} /> : <FileCode size={16} />}
                  <span>{say('استخراج الصور من الكود', 'Extract Images from HTML')}</span>
                </button>
              </div>
            )}
          </div>

          {/* Messages & Alerts */}
          {fetchError && (
            <div className={`amazon-alert-banner ${isCaptcha ? 'warning' : 'error'}`}>
              <AlertTriangle size={18} />
              <div className="alert-text-body">
                <span>{fetchError}</span>
                {searchQueryGuidance && (
                  <div className="alert-guidance-actions">
                    <a
                      href={getGoogleSearchUrl(searchQueryGuidance)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="button subtle sm alert-action-link google-link"
                    >
                      <Globe size={13} />
                      <span>{say(`🌐 بحث Google باسم أمازون لـ «${searchQueryGuidance}»`, `🌐 Search Google with Amazon for "${searchQueryGuidance}"`)}</span>
                      <ExternalLink size={12} />
                    </a>
                    <a
                      href={getAmazonSearchUrl(searchQueryGuidance)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="button subtle sm alert-action-link amazon-link"
                    >
                      <ExternalLink size={12} />
                      <span>{say(`🛒 فتح بحث أمازون المبسّط`, `🛒 Open simplified Amazon search`)}</span>
                    </a>
                  </div>
                )}
                {isCaptcha && (
                  <button
                    type="button"
                    className="button subtle sm switch-direct-btn"
                    onClick={() => {
                      setInputMode('direct');
                      setFetchError('');
                    }}
                  >
                    {say('الانتقال إلى لصق روابط الصور مباشرة ➔', 'Switch to Direct Image Links ➔')}
                  </button>
                )}
              </div>
            </div>
          )}

          {importSuccessMsg && (
            <div className="amazon-alert-banner success">
              <Check size={18} />
              <span>{importSuccessMsg}</span>
            </div>
          )}
        </section>

        {/* Step 3: Images Preview & Selection */}
        {images.length > 0 && (
          <section className="amazon-preview-section">
            <div className="amazon-section-title-row">
              <span className="amazon-step-badge">3</span>
              <div className="preview-title-block">
                <strong>{say(`الصور المكتشفة (${images.length})`, `Discovered Images (${images.length})`)}</strong>
                {amazonTitle && (
                  <span className="amazon-detected-title" title={amazonTitle}>
                    {amazonTitle}
                  </span>
                )}
              </div>
            </div>

            {/* Selection Toolbar */}
            <div className="amazon-selection-toolbar">
              <div className="selection-actions">
                <button
                  type="button"
                  className="button subtle sm"
                  onClick={() => selectAll(true)}
                >
                  <CheckSquare size={14} />
                  <span>{say('تحديد الكل', 'Select All')}</span>
                </button>
                <button
                  type="button"
                  className="button subtle sm"
                  onClick={() => selectAll(false)}
                >
                  <Square size={14} />
                  <span>{say('إلغاء التحديد', 'Deselect All')}</span>
                </button>
              </div>
              <span className="selected-summary-pill">
                {say(`تم تحديد ${selectedCount} من أصل ${images.length}`, `${selectedCount} of ${images.length} selected`)}
              </span>
            </div>

            {/* Images Grid */}
            <div className="amazon-images-grid">
              {images.map((img, idx) => {
                const isSelected = !!img.selected;
                // First selected image is primary candidate
                const isFirstSelected = isSelected && images.findIndex(x => x.selected) === idx;

                return (
                  <article
                    key={img.url}
                    className={`amazon-img-card ${isSelected ? 'selected' : ''}`}
                    onClick={() => toggleImageSelection(idx)}
                  >
                    <div className="amazon-card-check">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleImageSelection(idx)}
                        onClick={e => e.stopPropagation()}
                        aria-label={`Image ${idx + 1}`}
                      />
                    </div>

                    {isFirstSelected && (
                      <span className="amazon-primary-badge">
                        {say('الرئيسية ⭐', 'Primary ⭐')}
                      </span>
                    )}

                    <div className="amazon-img-wrap">
                      <img
                        src={img.thumb || img.url}
                        alt={`Amazon image ${idx + 1}`}
                        loading="lazy"
                      />
                    </div>

                    <div className="amazon-card-foot" onClick={e => e.stopPropagation()}>
                      <a
                        href={img.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="amazon-external-view"
                        title={say('معاينة بالحجم الكامل', 'View full size')}
                      >
                        <ExternalLink size={12} />
                        <span>HD</span>
                      </a>
                    </div>
                  </article>
                );
              })}
            </div>

            {/* Import Configuration Checkboxes */}
            <div className="amazon-options-group">
              <label className="amazon-checkbox-label">
                <input
                  type="checkbox"
                  checked={setAsPrimary}
                  onChange={e => setSetAsPrimary(e.target.checked)}
                />
                <span>{say('تعيين الصورة الأولى كصورة رئيسية للمنتج (في بداية المعرض)', 'Set first image as primary (insert at beginning)')}</span>
              </label>

              <label className="amazon-checkbox-label">
                <input
                  type="checkbox"
                  checked={replaceExisting}
                  onChange={e => setReplaceExisting(e.target.checked)}
                />
                <span>{say('استبدال كافة الصور الحالية للمنتج بهذه الصور الجديدة', 'Replace all existing product images with these new ones')}</span>
              </label>
            </div>
          </section>
        )}

        {/* Modal Actions Footer */}
        <div className="amazon-modal-footer">
          <button
            type="button"
            className="button secondary"
            onClick={() => onOpenChange(false)}
            disabled={isImporting}
          >
            {say('إلغاء', 'Cancel')}
          </button>

          {images.length > 0 && (
            <button
              type="button"
              className="button primary amazon-submit-btn"
              disabled={isImporting || selectedCount === 0}
              onClick={() => void handleImport()}
            >
              {isImporting ? (
                <>
                  <LoaderCircle className="spin" size={16} />
                  <span>{say('جارٍ التحميل والمعالجة وتحويل WebP…', 'Downloading & converting WebP…')}</span>
                </>
              ) : (
                <>
                  <Download size={16} />
                  <span>
                    {say(
                      `استيراد وتعيين ${selectedCount} صورة للمتجر`,
                      `Import & Save ${selectedCount} Images`
                    )}
                  </span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
}
