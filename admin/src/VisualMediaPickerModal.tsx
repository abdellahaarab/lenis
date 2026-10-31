import { useState, useRef, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Search,
  X,
  Check,
  Upload,
  Image as ImageIcon,
  Eye,
  CheckCircle2,
  AlertCircle,
  LoaderCircle,
  Plus
} from 'lucide-react';
import { Modal } from './components';
import { api, ApiError } from './api';
import { useI18n } from './i18n';

export type MediaItem = {
  id: string;
  originalPath: string;
  altAr: string;
  altEn: string;
  width?: number;
  height?: number;
};

export interface VisualMediaPickerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedPaths: string[];
  onConfirm: (paths: string[]) => void;
  multiple?: boolean;
  title?: string;
  description?: string;
}

export function VisualMediaPickerModal({
  open,
  onOpenChange,
  selectedPaths,
  onConfirm,
  multiple = true,
  title,
  description,
}: VisualMediaPickerModalProps) {
  const { lang } = useI18n();
  const ar = lang === 'ar';
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [localSelected, setLocalSelected] = useState<string[]>([]);
  const [previewItem, setPreviewItem] = useState<MediaItem | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [uploadAlt, setUploadAlt] = useState('');
  const [showUploadPanel, setShowUploadPanel] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync selected paths when modal opens
  const onModalOpenChange = (isOpen: boolean) => {
    if (isOpen) {
      setLocalSelected([...selectedPaths]);
      setSearch('');
      setUploadError('');
      setShowUploadPanel(false);
    }
    onOpenChange(isOpen);
  };

  // Fetch media library items
  const mediaQuery = useQuery({
    queryKey: ['media'],
    queryFn: () => api<{ items: MediaItem[] }>('/media'),
    enabled: open,
  });

  const mediaItems = mediaQuery.data?.items ?? [];

  // Filter items by search
  const filteredItems = useMemo(() => {
    if (!search.trim()) return mediaItems;
    const q = search.trim().toLowerCase();
    return mediaItems.filter(item => {
      const altAr = (item.altAr || '').toLowerCase();
      const altEn = (item.altEn || '').toLowerCase();
      const path = (item.originalPath || '').toLowerCase();
      return altAr.includes(q) || altEn.includes(q) || path.includes(q);
    });
  }, [mediaItems, search]);

  const toggleSelect = (path: string) => {
    if (!multiple) {
      // Single select mode: select and confirm immediately
      onConfirm([path]);
      onOpenChange(false);
      return;
    }

    if (localSelected.includes(path)) {
      setLocalSelected(localSelected.filter(p => p !== path));
    } else {
      setLocalSelected([...localSelected, path]);
    }
  };

  const handleApply = () => {
    onConfirm(localSelected);
    onOpenChange(false);
  };

  const handleDirectUpload = async (file: File) => {
    if (!file) return;
    setUploadError('');
    if (file.size > 4 * 1024 * 1024) {
      setUploadError(ar ? 'حجم الصورة يتجاوز الحد الأقصى (4 ميجابايت)' : 'Image exceeds maximum 4 MB size');
      return;
    }

    setUploading(true);
    try {
      const buffer = new Uint8Array(await file.arrayBuffer());
      let raw = '';
      for (let i = 0; i < buffer.length; i++) {
        raw += String.fromCharCode(buffer[i]);
      }
      const base64 = btoa(raw);
      const desc = uploadAlt.trim() || file.name.replace(/\.[^/.]+$/, '');

      const res = await api<{ id: string; originalPath?: string; path?: string }>('/media', {
        method: 'POST',
        body: {
          type: file.type,
          data: base64,
          altAr: desc,
          altEn: desc,
        },
      });

      await queryClient.invalidateQueries({ queryKey: ['media'] });

      const newPath = res.originalPath || res.path || `/api/media/${res.id}`;
      if (multiple) {
        setLocalSelected(prev => [...prev, newPath]);
      } else {
        onConfirm([newPath]);
        onOpenChange(false);
      }

      setUploadAlt('');
      setShowUploadPanel(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err) {
      setUploadError(err instanceof ApiError ? err.code : 'upload_failed');
    } finally {
      setUploading(false);
    }
  };

  const modalTitle = title || (ar ? 'معرض الصور المرئي' : 'Visual Media Picker');
  const modalDesc = description || (
    multiple
      ? (ar ? 'اختر واحدة أو أكثر من الصور بالضغط عليها، ثم اضغط حفظ' : 'Click photos to select multiple, then save')
      : (ar ? 'انقر على الصورة المطلوبة للاختيار المباشر' : 'Click the desired image to select directly')
  );

  return (
    <Modal
      open={open}
      onOpenChange={onModalOpenChange}
      title={modalTitle}
      description={modalDesc}
      className="modal-lg visual-media-modal-wrapper"
    >
      <div className="vmp-container">
        {/* Top Controls: Search + Upload Trigger */}
        <div className="vmp-header-controls">
          <div className="vmp-search-field">
            <Search size={16} className="vmp-search-icon" />
            <input
              type="text"
              placeholder={ar ? 'بحث في أسماء الصور ووصفها…' : 'Search images by title or alt text…'}
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="vmp-search-input"
            />
            {search && (
              <button
                type="button"
                className="vmp-clear-btn"
                onClick={() => setSearch('')}
                title={ar ? 'مسح البحث' : 'Clear search'}
              >
                <X size={14} />
              </button>
            )}
          </div>

          <button
            type="button"
            className={`button sm ${showUploadPanel ? 'primary' : 'secondary'}`}
            onClick={() => setShowUploadPanel(!showUploadPanel)}
          >
            <Upload size={14} />
            <span>{ar ? 'رفع صورة جديدة' : 'Upload Image'}</span>
          </button>
        </div>

        {/* Direct Upload Dropzone (Collapsible) */}
        {showUploadPanel && (
          <div className="vmp-upload-box">
            {uploadError && (
              <div className="vmp-upload-error">
                <AlertCircle size={15} />
                <span>{uploadError}</span>
              </div>
            )}
            <div className="vmp-upload-form">
              <input
                type="text"
                placeholder={ar ? 'وصف أو عنوان الصورة (اختياري)' : 'Image title / description (optional)'}
                value={uploadAlt}
                onChange={e => setUploadAlt(e.target.value)}
                className="vmp-upload-alt-input"
              />
              <div className="vmp-upload-action-row">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/svg+xml"
                  id="vmp-file-input"
                  style={{ display: 'none' }}
                  onChange={e => {
                    const f = e.target.files?.[0];
                    if (f) void handleDirectUpload(f);
                  }}
                />
                <button
                  type="button"
                  className="button primary sm"
                  disabled={uploading}
                  onClick={() => fileInputRef.current?.click()}
                >
                  {uploading ? <LoaderCircle size={15} className="spin" /> : <Plus size={15} />}
                  <span>{uploading ? (ar ? 'جارٍ الرفع…' : 'Uploading…') : (ar ? 'اختر ملف من جهازك' : 'Choose File from Device')}</span>
                </button>
                <span className="vmp-upload-hint">
                  {ar ? 'JPEG، PNG، WebP حتى 4 ميجابايت' : 'JPEG, PNG, WebP up to 4 MB'}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Grid of Images */}
        <div className="vmp-grid-area">
          {mediaQuery.isPending ? (
            <div className="vmp-loading-state">
              <LoaderCircle size={30} className="spin" />
              <span>{ar ? 'جارٍ تحميل معرض الصور…' : 'Loading media gallery…'}</span>
            </div>
          ) : mediaQuery.isError ? (
            <div className="vmp-error-state">
              <AlertCircle size={24} />
              <span>{ar ? 'تعذر تحميل مكتبة الصور' : 'Failed to load media library'}</span>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="vmp-empty-state">
              <ImageIcon size={40} className="vmp-empty-icon" />
              <h4>{ar ? 'لا توجد صور مطابقة' : 'No images found'}</h4>
              <p>
                {search
                  ? (ar ? 'لم نجد أي صورة تطابق كلمات البحث' : 'No images match your search keyword')
                  : (ar ? 'لا توجد صور في المكتبة حتى الآن، يمكنك رفع صور جديدة.' : 'No images in library yet, you can upload new ones.')}
              </p>
            </div>
          ) : (
            <div className="vmp-grid">
              {filteredItems.map(item => {
                const isSelected = multiple
                  ? localSelected.includes(item.originalPath)
                  : selectedPaths.includes(item.originalPath);
                const displayTitle = ar ? (item.altAr || item.altEn || item.id) : (item.altEn || item.altAr || item.id);
                const imgSrc = item.originalPath.replace('/api/media/', '/api/admin/media/');

                return (
                  <div
                    key={item.id}
                    className={`vmp-thumb-card ${isSelected ? 'selected' : ''}`}
                    onClick={() => toggleSelect(item.originalPath)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={e => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        toggleSelect(item.originalPath);
                      }
                    }}
                  >
                    <div className="vmp-thumb-preview">
                      <img
                        src={imgSrc}
                        alt={displayTitle}
                        loading="lazy"
                        onError={e => {
                          (e.target as HTMLElement).style.opacity = '0.4';
                        }}
                      />
                      {isSelected && (
                        <div className="vmp-selected-badge">
                          <Check size={14} />
                        </div>
                      )}
                      <button
                        type="button"
                        className="vmp-zoom-btn"
                        title={ar ? 'معاينة بالحجم الكامل' : 'Preview Full Size'}
                        onClick={e => {
                          e.stopPropagation();
                          setPreviewItem(item);
                        }}
                      >
                        <Eye size={13} />
                      </button>
                    </div>
                    <div className="vmp-thumb-info" title={displayTitle}>
                      <span className="vmp-thumb-title">{displayTitle}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="vmp-footer">
          <div className="vmp-footer-meta">
            {multiple ? (
              <span className="vmp-count-badge">
                <CheckCircle2 size={15} />
                <span>
                  {ar
                    ? `تم تحديد ${localSelected.length} صورة`
                    : `${localSelected.length} images selected`}
                </span>
              </span>
            ) : (
              <span className="vmp-count-badge subtle">
                {ar ? 'اختر صورة واحدة بالنقر عليها' : 'Click any photo to select'}
              </span>
            )}
          </div>

          <div className="vmp-footer-actions">
            <button
              type="button"
              className="button secondary sm"
              onClick={() => onOpenChange(false)}
            >
              {ar ? 'إلغاء' : 'Cancel'}
            </button>
            {multiple && (
              <button
                type="button"
                className="button primary sm"
                onClick={handleApply}
              >
                <Check size={15} />
                <span>{ar ? 'تأكيد وإرفاق' : 'Apply Selection'}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Lightbox Full Size Preview Modal */}
      {previewItem && (
        <Modal
          open={!!previewItem}
          onOpenChange={open => { if (!open) setPreviewItem(null); }}
          title={ar ? (previewItem.altAr || previewItem.id) : (previewItem.altEn || previewItem.id)}
          className="vmp-lightbox-modal"
        >
          <div className="vmp-lightbox-content">
            <img
              src={previewItem.originalPath.replace('/api/media/', '/api/admin/media/')}
              alt={previewItem.altAr}
              className="vmp-lightbox-img"
            />
            <div className="vmp-lightbox-meta">
              <span>{previewItem.originalPath}</span>
              <button
                type="button"
                className="button primary sm"
                onClick={() => {
                  toggleSelect(previewItem.originalPath);
                  setPreviewItem(null);
                }}
              >
                {multiple
                  ? (localSelected.includes(previewItem.originalPath)
                    ? (ar ? 'إلغاء التحديد' : 'Deselect')
                    : (ar ? 'تحديد هذه الصورة' : 'Select This Image'))
                  : (ar ? 'اختيار هذه الصورة' : 'Choose This Image')}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </Modal>
  );
}
