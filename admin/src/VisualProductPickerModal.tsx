import { useState, useMemo } from 'react';
import { Search, X, Check, Package, FolderArchive } from 'lucide-react';
import { Modal } from './components';
import { useI18n } from './i18n';

export interface ProductItemOption {
  id: string;
  title: { ar: string; en: string };
  model?: string;
  brand?: string;
  category?: string;
  price?: number;
  currency?: string;
  images?: string[];
  status?: string;
}

export interface VisualProductPickerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  products: ProductItemOption[];
  selectedProductId?: string;
  onSelect: (productId: string) => void;
  allowLibraryOnly?: boolean;
  onSelectLibraryOnly?: () => void;
  isLibraryOnlySelected?: boolean;
  title?: string;
  description?: string;
}

function safeImageUrl(path?: string): string {
  if (!path) return '';
  if (path.startsWith('http')) return path;
  return path.replace('/api/media/', '/api/admin/media/');
}

export function VisualProductPickerModal({
  open,
  onOpenChange,
  products,
  selectedProductId,
  onSelect,
  allowLibraryOnly = false,
  onSelectLibraryOnly,
  isLibraryOnlySelected = false,
  title,
  description,
}: VisualProductPickerModalProps) {
  const { lang } = useI18n();
  const ar = lang === 'ar';

  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Extract unique categories for quick filter chips
  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach(p => {
      if (p.category) set.add(p.category);
    });
    return Array.from(set);
  }, [products]);

  // Filter products by search and category
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      if (selectedCategory !== 'all' && p.category !== selectedCategory) {
        return false;
      }
      if (!search.trim()) return true;
      const q = search.trim().toLowerCase();
      const titleAr = (p.title?.ar || '').toLowerCase();
      const titleEn = (p.title?.en || '').toLowerCase();
      const model = (p.model || '').toLowerCase();
      const brand = (p.brand || '').toLowerCase();
      const id = (p.id || '').toLowerCase();

      return (
        titleAr.includes(q) ||
        titleEn.includes(q) ||
        model.includes(q) ||
        brand.includes(q) ||
        id.includes(q)
      );
    });
  }, [products, search, selectedCategory]);

  const handleSelectProduct = (productId: string) => {
    onSelect(productId);
    onOpenChange(false);
  };

  const handleSelectLibrary = () => {
    if (onSelectLibraryOnly) {
      onSelectLibraryOnly();
    }
    onOpenChange(false);
  };

  const modalTitle = title || (ar ? 'اختيار منتج من الكتالوج' : 'Select Product from Catalog');
  const modalDesc = description || (ar ? 'تصفح منتجات الكتالوج مع الصور المصغرة والأسعار واختر المنتج المطلوب' : 'Browse products with visual thumbnails, prices and details');

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={modalTitle}
      description={modalDesc}
      className="modal-lg visual-product-modal-wrapper"
    >
      <div className="vpp-container">
        {/* Option for Media Library Only (e.g. for Amazon import) */}
        {allowLibraryOnly && (
          <div
            className={`vpp-library-only-option ${isLibraryOnlySelected ? 'active' : ''}`}
            onClick={handleSelectLibrary}
            role="button"
            tabIndex={0}
          >
            <div className="vpp-library-icon">
              <FolderArchive size={20} />
            </div>
            <div className="vpp-library-text">
              <strong>{ar ? 'حفظ في مكتبة الوسائط فقط' : 'Save to Media Library Only'}</strong>
              <small>{ar ? 'استيراد وحفظ الصور في المعرض بدون ربطها بمنتج محدد' : 'Store images in the library without linking to any product'}</small>
            </div>
            {isLibraryOnlySelected && (
              <span className="vpp-active-check">
                <Check size={16} />
              </span>
            )}
          </div>
        )}

        {/* Search Bar & Stats */}
        <div className="vpp-search-box">
          <Search size={16} className="vpp-search-icon" />
          <input
            type="text"
            placeholder={ar ? 'بحث باسم المنتج، الموديل، الماركة…' : 'Search by product name, model, brand…'}
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="vpp-search-input"
          />
          {search && (
            <button
              type="button"
              className="vpp-clear-btn"
              onClick={() => setSearch('')}
              title={ar ? 'مسح البحث' : 'Clear search'}
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Category Filter Chips */}
        {categories.length > 1 && (
          <div className="vpp-chips-row">
            <button
              type="button"
              className={`vpp-chip ${selectedCategory === 'all' ? 'active' : ''}`}
              onClick={() => setSelectedCategory('all')}
            >
              {ar ? 'الكل' : 'All'} ({products.length})
            </button>
            {categories.map(cat => (
              <button
                key={cat}
                type="button"
                className={`vpp-chip ${selectedCategory === cat ? 'active' : ''}`}
                onClick={() => setSelectedCategory(cat)}
              >
                {cat}
              </button>
            ))}
          </div>
        )}

        {/* Product Grid Area */}
        <div className="vpp-grid-area">
          {filteredProducts.length === 0 ? (
            <div className="vpp-empty-state">
              <Package size={38} className="vpp-empty-icon" />
              <h4>{ar ? 'لم يتم العثور على منتجات' : 'No products found'}</h4>
              <p>{ar ? 'جرب البحث بكلمات مختلفة أو تغيير تصنيف الفئة' : 'Try searching with different terms or reset filter'}</p>
            </div>
          ) : (
            <div className="vpp-grid">
              {filteredProducts.map(p => {
                const isSelected = !isLibraryOnlySelected && selectedProductId === p.id;
                const firstImg = p.images?.[0];
                const imgSrc = safeImageUrl(firstImg);
                const titleStr = ar ? (p.title?.ar || p.title?.en || p.model || p.id) : (p.title?.en || p.title?.ar || p.model || p.id);

                return (
                  <div
                    key={p.id}
                    className={`vpp-card ${isSelected ? 'selected' : ''}`}
                    onClick={() => handleSelectProduct(p.id)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={e => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleSelectProduct(p.id);
                      }
                    }}
                  >
                    <div className="vpp-card-thumb">
                      {imgSrc ? (
                        <img src={imgSrc} alt={titleStr} loading="lazy" />
                      ) : (
                        <div className="vpp-card-no-img">
                          <Package size={24} />
                        </div>
                      )}
                      {isSelected && (
                        <div className="vpp-card-badge">
                          <Check size={14} />
                        </div>
                      )}
                    </div>

                    <div className="vpp-card-details">
                      <div className="vpp-card-brand-row">
                        {p.brand && <span className="vpp-card-brand">{p.brand}</span>}
                        {p.category && <span className="vpp-card-cat">{p.category}</span>}
                      </div>

                      <h4 className="vpp-card-title" title={titleStr}>
                        {titleStr}
                      </h4>

                      {p.model && (
                        <span className="vpp-card-model" title={p.model}>
                          {p.model}
                        </span>
                      )}

                      <div className="vpp-card-footer">
                        {p.price !== undefined && (
                          <span className="vpp-card-price">
                            {p.price.toLocaleString()} {p.currency || 'USD'}
                          </span>
                        )}
                        <span className="vpp-card-action">
                          {isSelected ? (ar ? 'محدد حالياً' : 'Current') : (ar ? 'اختيار' : 'Select')}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Modal Actions Footer */}
        <div className="vpp-footer">
          <span className="vpp-count-note">
            {ar ? `عرض ${filteredProducts.length} من إجمالي ${products.length} منتج` : `Showing ${filteredProducts.length} of ${products.length} products`}
          </span>
          <button
            type="button"
            className="button secondary sm"
            onClick={() => onOpenChange(false)}
          >
            {ar ? 'إغلاق' : 'Close'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
