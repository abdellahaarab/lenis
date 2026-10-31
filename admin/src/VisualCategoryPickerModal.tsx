import { useState, useMemo } from 'react';
import { Search, X, Check, FolderTree, Layers } from 'lucide-react';
import { Modal } from './components';
import { useI18n } from './i18n';

export interface CategoryOption {
  slug: string;
  parentSlug?: string | null;
  title: { ar: string; en: string };
  productTypeId?: string | null;
  count?: number;
}

export interface VisualCategoryPickerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: CategoryOption[];
  selectedSlug?: string;
  onSelect: (slug: string) => void;
  title?: string;
  description?: string;
}

export function VisualCategoryPickerModal({
  open,
  onOpenChange,
  categories,
  selectedSlug,
  onSelect,
  title,
  description,
}: VisualCategoryPickerModalProps) {
  const { lang } = useI18n();
  const ar = lang === 'ar';
  const [search, setSearch] = useState('');

  // Filter categories by search
  const filtered = useMemo(() => {
    if (!search.trim()) return categories;
    const q = search.trim().toLowerCase();
    return categories.filter(c => {
      const arTitle = (c.title?.ar || '').toLowerCase();
      const enTitle = (c.title?.en || '').toLowerCase();
      const slug = (c.slug || '').toLowerCase();
      return arTitle.includes(q) || enTitle.includes(q) || slug.includes(q);
    });
  }, [categories, search]);

  const handleSelect = (slug: string) => {
    onSelect(slug);
    onOpenChange(false);
  };

  const modalTitle = title || (ar ? 'اختيار الفئة والتصنيف' : 'Select Category');
  const modalDesc = description || (ar ? 'تصفح شجرة الأصناف والفئات واختر الفئة المناسبة' : 'Browse categories and select the appropriate one');

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={modalTitle}
      description={modalDesc}
      className="modal-md visual-category-modal-wrapper"
    >
      <div className="vcp-container">
        {/* Search */}
        <div className="vcp-search-box">
          <Search size={16} className="vcp-search-icon" />
          <input
            type="text"
            placeholder={ar ? 'بحث في الفئات والتصنيفات…' : 'Search categories…'}
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="vcp-search-input"
          />
          {search && (
            <button
              type="button"
              className="vcp-clear-btn"
              onClick={() => setSearch('')}
              title={ar ? 'مسح البحث' : 'Clear search'}
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Categories List */}
        <div className="vcp-list-area">
          {filtered.length === 0 ? (
            <div className="vcp-empty">
              <FolderTree size={32} />
              <p>{ar ? 'لا توجد فئات مطابقة' : 'No matching categories'}</p>
            </div>
          ) : (
            <div className="vcp-grid">
              {filtered.map(cat => {
                const isSelected = selectedSlug === cat.slug;
                const name = ar ? (cat.title?.ar || cat.title?.en || cat.slug) : (cat.title?.en || cat.title?.ar || cat.slug);
                const parentCat = cat.parentSlug ? categories.find(c => c.slug === cat.parentSlug) : null;
                const parentName = parentCat ? (ar ? parentCat.title.ar : parentCat.title.en) : null;

                return (
                  <div
                    key={cat.slug}
                    className={`vcp-card ${isSelected ? 'selected' : ''}`}
                    onClick={() => handleSelect(cat.slug)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={e => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleSelect(cat.slug);
                      }
                    }}
                  >
                    <div className="vcp-card-icon">
                      <Layers size={18} />
                    </div>
                    <div className="vcp-card-text">
                      <div className="vcp-card-title-row">
                        <strong className="vcp-card-name">{name}</strong>
                        {isSelected && <span className="vcp-selected-check"><Check size={14} /></span>}
                      </div>
                      <div className="vcp-card-meta">
                        {parentName && (
                          <span className="vcp-parent-tag">
                            {parentName} &gt;
                          </span>
                        )}
                        <span className="vcp-slug-tag">{cat.slug}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="vcp-footer">
          <span className="vcp-footer-meta">
            {ar ? `${filtered.length} فئة متوفرة` : `${filtered.length} categories`}
          </span>
          <button
            type="button"
            className="button secondary sm"
            onClick={() => onOpenChange(false)}
          >
            {ar ? 'إلغاء' : 'Cancel'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
