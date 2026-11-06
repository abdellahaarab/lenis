import { useState, useRef, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { HOME_IMAGE_SLOTS, HOME_IMAGE_SECTIONS, type HomeImageSlot } from '@aljeel/shared';
import { api, ApiError } from './api';
import { useI18n } from './i18n';
import { Loading, ErrorBox } from './components';
import {
  Image as ImageIcon,
  Upload,
  Trash2,
  RotateCcw,
  ExternalLink,
  Save,
  Check,
  Search,
  CheckCircle2,
  FolderOpen,
  Link as LinkIcon,
  Sparkles,
  Eye,
  X,
  Layers,
} from 'lucide-react';

type MediaItem = {
  id: string;
  originalPath: string;
  altAr: string;
  altEn: string;
  width?: number;
  height?: number;
};

function imageUrl(path: string) {
  if (!path) return '';
  return path.replace('/api/media/', '/api/admin/media/');
}

export function HomeImagesManager() {
  const { lang } = useI18n();
  const ar = lang === 'ar';
  const queryClient = useQueryClient();

  const [activeSection, setActiveSection] = useState<string>('all');
  const [search, setSearch] = useState<string>('');
  const [localOverrides, setLocalOverrides] = useState<Record<string, string | null>>({});
  const [dirty, setDirty] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [uploadingSlot, setUploadingSlot] = useState<string | null>(null);
  const [librarySlot, setLibrarySlot] = useState<HomeImageSlot | null>(null);
  const [customUrlSlot, setCustomUrlSlot] = useState<HomeImageSlot | null>(null);
  const [customUrlInput, setCustomUrlInput] = useState<string>('');
  const [previewImage, setPreviewImage] = useState<{ url: string; title: string } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [targetUploadSlot, setTargetUploadSlot] = useState<HomeImageSlot | null>(null);

  // Load homeImages setting
  const homeImagesQuery = useQuery({
    queryKey: ['content', 'homeImages'],
    queryFn: () => api<{ value: Record<string, string | null>; updatedAt: string }>('/content/homeImages'),
  });

  // Load media library items for picker
  const mediaQuery = useQuery({
    queryKey: ['media'],
    queryFn: () => api<{ items: MediaItem[] }>('/media'),
  });

  // Merged values between server data and pending local changes
  const effectiveImages = useMemo(() => {
    const serverValues = (homeImagesQuery.data?.value || {}) as Record<string, string | null>;
    return { ...serverValues, ...localOverrides };
  }, [homeImagesQuery.data?.value, localOverrides]);

  // Statistics calculation
  const stats = useMemo(() => {
    let custom = 0;
    let deleted = 0;
    let defaultCount = 0;

    for (const slot of HOME_IMAGE_SLOTS) {
      const val = effectiveImages[slot.key];
      if (val === null) {
        deleted++;
      } else if (typeof val === 'string' && val.trim() !== '') {
        custom++;
      } else {
        defaultCount++;
      }
    }
    return { total: HOME_IMAGE_SLOTS.length, custom, deleted, defaultCount };
  }, [effectiveImages]);

  // Filtered slots
  const filteredSlots = useMemo(() => {
    return HOME_IMAGE_SLOTS.filter((slot) => {
      if (activeSection !== 'all' && slot.sectionKey !== activeSection) {
        return false;
      }
      if (search.trim()) {
        const query = search.toLowerCase();
        const textToMatch = `${slot.titleAr} ${slot.titleEn} ${slot.sectionAr} ${slot.sectionEn} ${slot.descriptionAr} ${slot.descriptionEn} ${slot.key}`.toLowerCase();
        return textToMatch.includes(query);
      }
      return true;
    });
  }, [activeSection, search]);

  // Update a single slot
  const setSlotValue = (slotKey: string, newValue: string | null) => {
    setLocalOverrides((prev) => ({ ...prev, [slotKey]: newValue }));
    setDirty(true);
    setSaveSuccess(false);
  };

  // Reset a slot to original default
  const resetSlotToDefault = (slotKey: string) => {
    const next = { ...localOverrides };
    delete next[slotKey];
    setLocalOverrides(next);
    // Also explicitly set empty string or delete from server data
    setLocalOverrides((prev) => ({ ...prev, [slotKey]: '' }));
    setDirty(true);
    setSaveSuccess(false);
  };

  // Save changes to backend
  const handleSaveAll = async () => {
    setSaving(true);
    setError('');
    try {
      // Build clean payload
      const payload: Record<string, string | null> = {};
      for (const [k, v] of Object.entries(effectiveImages)) {
        if (v === null) {
          payload[k] = null; // deleted
        } else if (typeof v === 'string' && v.trim() !== '') {
          payload[k] = v.trim(); // custom image URL
        }
      }

      await api('/content/homeImages', {
        method: 'PATCH',
        body: {
          value: payload,
          revision: homeImagesQuery.data?.updatedAt,
        },
      });

      await queryClient.invalidateQueries({ queryKey: ['content', 'homeImages'] });
      setLocalOverrides({});
      setDirty(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 4000);
    } catch (err) {
      setError(err instanceof ApiError ? err.code : 'failed');
    } finally {
      setSaving(false);
    }
  };

  // Trigger file upload for a slot
  const handleTriggerUpload = (slot: HomeImageSlot) => {
    setTargetUploadSlot(slot);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  // Handle uploaded file
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const slot = targetUploadSlot;
    if (!file || !slot) return;

    if (file.size > 4 * 1024 * 1024) {
      setError('image_too_large');
      return;
    }

    setUploadingSlot(slot.key);
    setError('');
    try {
      const buffer = new Uint8Array(await file.arrayBuffer());
      let raw = '';
      for (const byte of buffer) raw += String.fromCharCode(byte);
      const base64 = btoa(raw);

      const uploaded = await api<{ id: string; path: string }>('/media', {
        method: 'POST',
        body: {
          type: file.type,
          data: base64,
          altAr: slot.titleAr,
          altEn: slot.titleEn,
        },
      });

      await queryClient.invalidateQueries({ queryKey: ['media'] });
      setSlotValue(slot.key, uploaded.path);
    } catch (err) {
      setError(err instanceof ApiError ? err.code : 'failed');
    } finally {
      setUploadingSlot(null);
      setTargetUploadSlot(null);
    }
  };

  if (homeImagesQuery.isPending) return <Loading />;
  if (homeImagesQuery.isError) return <ErrorBox code="failed" />;

  return (
    <div className="home-images-page" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />

      {/* Header & Action Bar */}
      <div
        className="card"
        style={{
          padding: '24px 28px',
          background: 'linear-gradient(135deg, rgba(50, 47, 131, 0.08), rgba(124, 58, 237, 0.04))',
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14 }}>
          <div>
            <div className="eyebrow" style={{ display: 'flex', alignItems: 'center', gap: 6, margin: 0 }}>
              <Sparkles size={14} className="text-purple-600 dark:text-purple-400" />
              <span>{ar ? 'تخصيص الواجهة والمرئيات' : 'Homepage Media Management'}</span>
            </div>
            <h1 style={{ fontSize: 24, fontWeight: 800, marginTop: 4 }}>
              {ar ? 'إدارة صور الصفحة الرئيسية' : 'Homepage Images Manager'}
            </h1>
            <p className="muted" style={{ fontSize: 13, marginTop: 4 }}>
              {ar
                ? 'استعرض جميع الصور المعروضة في الصفحة الرئيسية واستبدلها بصور مخصصة أو احذفها بسهولة.'
                : 'Browse all images displayed on the homepage, replace them with custom uploads, or remove them.'}
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <a
              href="/ar"
              target="_blank"
              rel="noopener noreferrer"
              className="button secondary"
              title={ar ? 'معاينة الموقع في لسان جديد' : 'Preview website'}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
            >
              <ExternalLink size={16} />
              <span>{ar ? 'معاينة الصفحة الرئيسية' : 'Preview Homepage'}</span>
            </a>

            <button
              type="button"
              className="button primary"
              disabled={saving || !dirty}
              onClick={handleSaveAll}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                background: dirty ? '#322f83' : undefined,
                boxShadow: dirty ? '0 4px 14px rgba(50, 47, 131, 0.3)' : undefined,
              }}
            >
              {saving ? (
                <>
                  <span className="spin">⟳</span>
                  <span>{ar ? 'جارٍ الحفظ…' : 'Saving…'}</span>
                </>
              ) : saveSuccess ? (
                <>
                  <Check size={16} className="text-emerald-400" />
                  <span>{ar ? 'تم الحفظ بنجاح!' : 'Changes Saved!'}</span>
                </>
              ) : (
                <>
                  <Save size={16} />
                  <span>
                    {ar ? 'حفظ التعديلات' : 'Save Changes'}
                    {dirty && ' *'}
                  </span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Stats and Indicator Row */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            flexWrap: 'wrap',
            paddingTop: 14,
            borderTop: '1px solid var(--border)',
          }}
        >
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 12,
              padding: '4px 10px',
              borderRadius: 8,
              background: 'var(--surface)',
              border: '1px solid var(--border)',
            }}
          >
            <Layers size={14} className="muted" />
            <span>
              {ar ? 'إجمالي الصور:' : 'Total Slots:'} <strong>{stats.total}</strong>
            </span>
          </div>

          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 12,
              padding: '4px 10px',
              borderRadius: 8,
              background: 'rgba(59, 130, 246, 0.08)',
              border: '1px solid rgba(59, 130, 246, 0.2)',
              color: '#2563eb',
            }}
          >
            <CheckCircle2 size={14} />
            <span>
              {ar ? 'صور افتراضية:' : 'Default:'} <strong>{stats.defaultCount}</strong>
            </span>
          </div>

          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 12,
              padding: '4px 10px',
              borderRadius: 8,
              background: 'rgba(16, 185, 129, 0.08)',
              border: '1px solid rgba(16, 185, 129, 0.2)',
              color: '#059669',
            }}
          >
            <Sparkles size={14} />
            <span>
              {ar ? 'صور مخصصة:' : 'Customized:'} <strong>{stats.custom}</strong>
            </span>
          </div>

          {stats.deleted > 0 && (
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                fontSize: 12,
                padding: '4px 10px',
                borderRadius: 8,
                background: 'rgba(239, 68, 68, 0.08)',
                border: '1px solid rgba(239, 68, 68, 0.2)',
                color: '#dc2626',
              }}
            >
              <Trash2 size={14} />
              <span>
                {ar ? 'صور محذوفة / مخفية:' : 'Deleted / Hidden:'} <strong>{stats.deleted}</strong>
              </span>
            </div>
          )}

          {dirty && (
            <span
              style={{
                marginInlineStart: 'auto',
                fontSize: 11,
                fontWeight: 700,
                color: '#d97706',
                display: 'flex',
                alignItems: 'center',
                gap: 5,
              }}
            >
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#d97706' }} />
              {ar ? 'توجد تعديلات غير محفوظة، اضغط "حفظ التعديلات"' : 'Unsaved changes pending save'}
            </span>
          )}
        </div>
      </div>

      <ErrorBox code={error} />

      {/* Filter Tabs and Search Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div className="toolbar" style={{ margin: 0 }}>
          {HOME_IMAGE_SECTIONS.map((sec) => (
            <button
              key={sec.key}
              type="button"
              className={`button ${activeSection === sec.key ? 'primary' : 'secondary'}`}
              onClick={() => setActiveSection(sec.key)}
              style={{ fontSize: 12, padding: '7px 14px', minHeight: 36 }}
            >
              {ar ? sec.titleAr : sec.titleEn}
            </button>
          ))}
        </div>

        <div style={{ position: 'relative', width: '100%', maxWidth: 280 }}>
          <Search size={16} className="muted" style={{ position: 'absolute', top: 10, insetInlineStart: 12 }} />
          <input
            type="text"
            placeholder={ar ? 'بحث في الصور…' : 'Search images…'}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ paddingInlineStart: 36, height: 36, fontSize: 12 }}
          />
        </div>
      </div>

      {/* Slots Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 360px), 1fr))',
          gap: 18,
        }}
      >
        {filteredSlots.map((slot) => {
          const val = effectiveImages[slot.key];
          const isDeleted = val === null;
          const isCustom = typeof val === 'string' && val.trim() !== '';
          const activeUrl = isDeleted ? null : isCustom ? val : slot.defaultUrl;
          const isUploading = uploadingSlot === slot.key;

          return (
            <div
              key={slot.key}
              className="card"
              style={{
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                transition: 'border-color 0.2s, box-shadow 0.2s',
                borderColor: isDeleted ? 'rgba(239, 68, 68, 0.4)' : isCustom ? 'rgba(124, 58, 237, 0.4)' : undefined,
              }}
            >
              {/* Card Header */}
              <div
                style={{
                  padding: '14px 16px',
                  borderBottom: '1px solid var(--border)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 8,
                  background: 'var(--surface-soft)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: 6,
                      background: 'rgba(50, 47, 131, 0.1)',
                      color: 'var(--primary-text)',
                    }}
                  >
                    {ar ? slot.sectionAr : slot.sectionEn}
                  </span>
                </div>

                <div>
                  {isDeleted ? (
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: 6,
                        background: 'rgba(239, 68, 68, 0.12)',
                        color: '#dc2626',
                      }}
                    >
                      {ar ? 'محذوفة (مخفية)' : 'Deleted'}
                    </span>
                  ) : isCustom ? (
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: 6,
                        background: 'rgba(16, 185, 129, 0.12)',
                        color: '#059669',
                      }}
                    >
                      {ar ? 'صورة مخصصة' : 'Custom'}
                    </span>
                  ) : (
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: 6,
                        background: 'rgba(107, 114, 128, 0.12)',
                        color: 'var(--muted)',
                      }}
                    >
                      {ar ? 'صورة افتراضية' : 'Default'}
                    </span>
                  )}
                </div>
              </div>

              {/* Card Body */}
              <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12, flex: 1 }}>
                <div>
                  <h3 style={{ fontSize: 15, fontWeight: 700 }}>{ar ? slot.titleAr : slot.titleEn}</h3>
                  <p className="muted" style={{ fontSize: 11, marginTop: 4, lineHeight: 1.5 }}>
                    {ar ? slot.descriptionAr : slot.descriptionEn}
                  </p>
                </div>

                {/* Image Preview Box */}
                <div
                  style={{
                    position: 'relative',
                    height: 190,
                    width: '100%',
                    borderRadius: 12,
                    border: isDeleted ? '1px dashed rgba(239, 68, 68, 0.4)' : '1px solid var(--border)',
                    background: isDeleted ? 'rgba(239, 68, 68, 0.03)' : 'rgba(0, 0, 0, 0.02)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden',
                  }}
                >
                  {isUploading ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                      <span className="spin" style={{ fontSize: 24 }}>
                        ⟳
                      </span>
                      <span style={{ fontSize: 11, color: 'var(--muted)' }}>
                        {ar ? 'جارٍ رفع الصورة…' : 'Uploading image…'}
                      </span>
                    </div>
                  ) : isDeleted ? (
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: 6,
                        color: '#dc2626',
                        padding: 12,
                        textAlign: 'center',
                      }}
                    >
                      <Trash2 size={24} />
                      <span style={{ fontSize: 12, fontWeight: 700 }}>
                        {ar ? 'تم حذف هذه الصورة' : 'Image Deleted'}
                      </span>
                      <span style={{ fontSize: 10, color: 'var(--muted)' }}>
                        {ar ? 'لن تظهر هذه الصورة في الصفحة الرئيسية' : 'Hidden from the storefront homepage'}
                      </span>
                    </div>
                  ) : activeUrl ? (
                    <>
                      <img
                        src={imageUrl(activeUrl)}
                        alt={ar ? slot.titleAr : slot.titleEn}
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'contain',
                          padding: 10,
                          transition: 'transform 0.2s',
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => setPreviewImage({ url: imageUrl(activeUrl), title: ar ? slot.titleAr : slot.titleEn })}
                        title={ar ? 'معاينة بالحجم الكامل' : 'Preview full size'}
                        style={{
                          position: 'absolute',
                          bottom: 8,
                          insetInlineEnd: 8,
                          background: 'rgba(0, 0, 0, 0.65)',
                          color: '#fff',
                          border: 0,
                          borderRadius: 8,
                          padding: '4px 8px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4,
                          fontSize: 10,
                          cursor: 'pointer',
                        }}
                      >
                        <Eye size={12} />
                        <span>{ar ? 'معاينة' : 'View'}</span>
                      </button>
                    </>
                  ) : (
                    <div className="muted" style={{ fontSize: 11 }}>
                      {ar ? 'لا توجد صورة' : 'No image'}
                    </div>
                  )}
                </div>

                {/* Path and Specs Info */}
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 4,
                    fontSize: 10,
                    color: 'var(--muted)',
                    background: 'var(--surface-soft)',
                    padding: '8px 10px',
                    borderRadius: 8,
                    overflow: 'hidden',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                    <span>{ar ? 'المقاس الموصى به:' : 'Recommended:'}</span>
                    <strong style={{ color: 'var(--text)' }}>{slot.recommendedSize}</strong>
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      textOverflow: 'ellipsis',
                      overflow: 'hidden',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    <span>{ar ? 'المسار:' : 'Path:'}</span>
                    <span dir="ltr" style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {activeUrl || (ar ? '— محذوفة —' : '— Deleted —')}
                    </span>
                  </div>
                </div>

                {/* Action Buttons Toolbar */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(2, 1fr)',
                    gap: 8,
                    marginTop: 'auto',
                    paddingTop: 8,
                  }}
                >
                  {/* Upload button */}
                  <button
                    type="button"
                    className="button primary"
                    disabled={isUploading}
                    onClick={() => handleTriggerUpload(slot)}
                    style={{ fontSize: 11, padding: '7px 10px', minHeight: 34, gap: 5 }}
                    title={ar ? 'رفع صورة جديدة من جهازك' : 'Upload new image from your PC'}
                  >
                    <Upload size={14} />
                    <span>{ar ? 'رفع واستبدال' : 'Upload'}</span>
                  </button>

                  {/* Pick from Library button */}
                  <button
                    type="button"
                    className="button secondary"
                    onClick={() => setLibrarySlot(slot)}
                    style={{ fontSize: 11, padding: '7px 10px', minHeight: 34, gap: 5 }}
                    title={ar ? 'اختيار صورة من مكتبة الوسائط' : 'Choose from media library'}
                  >
                    <FolderOpen size={14} />
                    <span>{ar ? 'من المكتبة' : 'From Library'}</span>
                  </button>

                  {/* Delete / Remove image button */}
                  <button
                    type="button"
                    className="button secondary"
                    disabled={isDeleted}
                    onClick={() => setSlotValue(slot.key, null)}
                    style={{
                      fontSize: 11,
                      padding: '7px 10px',
                      minHeight: 34,
                      gap: 5,
                      color: isDeleted ? undefined : '#dc2626',
                    }}
                    title={ar ? 'حذف هذه الصورة وإخفاؤها من الصفحة الرئيسية' : 'Delete and hide image from homepage'}
                  >
                    <Trash2 size={14} />
                    <span>{ar ? 'حذف الصورة' : 'Delete'}</span>
                  </button>

                  {/* Reset to Default or Custom URL */}
                  {isCustom || isDeleted ? (
                    <button
                      type="button"
                      className="button secondary"
                      onClick={() => resetSlotToDefault(slot.key)}
                      style={{ fontSize: 11, padding: '7px 10px', minHeight: 34, gap: 5 }}
                      title={ar ? 'استعادة الصورة الافتراضية الأصلية' : 'Restore original default image'}
                    >
                      <RotateCcw size={14} />
                      <span>{ar ? 'استعادة الافتراضي' : 'Reset'}</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="button secondary"
                      onClick={() => {
                        setCustomUrlSlot(slot);
                        setCustomUrlInput(slot.defaultUrl);
                      }}
                      style={{ fontSize: 11, padding: '7px 10px', minHeight: 34, gap: 5 }}
                      title={ar ? 'تحديد رابط مخصص للصورة' : 'Specify custom image URL/path'}
                    >
                      <LinkIcon size={14} />
                      <span>{ar ? 'رابط مخصص' : 'Custom URL'}</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filteredSlots.length === 0 && (
        <div
          className="card"
          style={{ padding: 40, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}
        >
          <ImageIcon size={36} className="muted" />
          <p className="muted">{ar ? 'لا توجد صور مطابقة لخيارات البحث.' : 'No images match the current filter.'}</p>
        </div>
      )}

      {/* Media Library Picker Modal */}
      {librarySlot && (
        <div
          className="overlay"
          onClick={() => setLibrarySlot(null)}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <div
            className="modal"
            onClick={(e) => e.stopPropagation()}
            style={{ width: 'min(94vw, 760px)', maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <div>
                <h2 style={{ fontSize: 18, fontWeight: 700 }}>
                  {ar ? 'اختيار صورة من مكتبة الوسائط' : 'Choose Image from Library'}
                </h2>
                <p className="muted" style={{ fontSize: 11, marginTop: 4 }}>
                  {ar
                    ? `اختر صورة لاستبدال: ${ar ? librarySlot.titleAr : librarySlot.titleEn}`
                    : `Select image for: ${librarySlot.titleEn}`}
                </p>
              </div>
              <button
                type="button"
                className="icon-button"
                onClick={() => setLibrarySlot(null)}
                title={ar ? 'إغلاق' : 'Close'}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', maxHeight: '55vh', paddingInlineEnd: 4 }}>
              {mediaQuery.isPending ? (
                <Loading />
              ) : mediaQuery.isError ? (
                <ErrorBox code="failed" />
              ) : mediaQuery.data?.items.length === 0 ? (
                <p className="muted" style={{ padding: 20, textAlign: 'center' }}>
                  {ar
                    ? 'لا توجد صور في المكتبة بعد. يمكنك رفع صورة مباشرة.'
                    : 'No images in the library yet. You can upload directly.'}
                </p>
              ) : (
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
                    gap: 12,
                  }}
                >
                  {mediaQuery.data?.items.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setSlotValue(librarySlot.key, item.originalPath);
                        setLibrarySlot(null);
                      }}
                      className="card"
                      style={{
                        padding: 8,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: 6,
                        cursor: 'pointer',
                        border: '1px solid var(--border)',
                        textAlign: 'center',
                        background: 'var(--surface)',
                      }}
                    >
                      <img
                        src={imageUrl(item.originalPath)}
                        alt={item.altAr || item.id}
                        style={{ width: '100%', height: 90, objectFit: 'contain', borderRadius: 6 }}
                      />
                      <span
                        style={{
                          fontSize: 10,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          width: '100%',
                        }}
                      >
                        {item.altAr || item.id}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button type="button" className="button secondary" onClick={() => setLibrarySlot(null)}>
                {ar ? 'إلغاء' : 'Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom URL Modal */}
      {customUrlSlot && (
        <div
          className="overlay"
          onClick={() => setCustomUrlSlot(null)}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <div
            className="modal"
            onClick={(e) => e.stopPropagation()}
            style={{ width: 'min(94vw, 500px)' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700 }}>
                {ar ? 'تحديد مسار أو رابط مخصص' : 'Custom Image URL / Path'}
              </h2>
              <button
                type="button"
                className="icon-button"
                onClick={() => setCustomUrlSlot(null)}
                title={ar ? 'إغلاق' : 'Close'}
              >
                <X size={18} />
              </button>
            </div>

            <p className="muted" style={{ fontSize: 12, marginBottom: 16 }}>
              {ar
                ? `أدخل مسار الصورة داخل مجلد المشروع (مثل /images/...) أو رابطًا مباشرًا:`
                : `Enter image path or URL:`}
            </p>

            <input
              type="text"
              dir="ltr"
              value={customUrlInput}
              onChange={(e) => setCustomUrlInput(e.target.value)}
              placeholder="/images/example.webp"
              style={{ width: '100%', marginBottom: 16 }}
            />

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button type="button" className="button secondary" onClick={() => setCustomUrlSlot(null)}>
                {ar ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                type="button"
                className="button primary"
                disabled={!customUrlInput.trim()}
                onClick={() => {
                  setSlotValue(customUrlSlot.key, customUrlInput.trim());
                  setCustomUrlSlot(null);
                }}
              >
                {ar ? 'تعيين الصورة' : 'Apply'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Full Image Preview Modal */}
      {previewImage && (
        <div
          className="overlay"
          onClick={() => setPreviewImage(null)}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: '90vw',
              maxHeight: '90vh',
              background: 'var(--surface)',
              borderRadius: 16,
              overflow: 'hidden',
              boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <div
              style={{
                padding: '12px 16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderBottom: '1px solid var(--border)',
              }}
            >
              <strong style={{ fontSize: 14 }}>{previewImage.title}</strong>
              <button
                type="button"
                className="icon-button"
                onClick={() => setPreviewImage(null)}
                title={ar ? 'إغلاق' : 'Close'}
              >
                <X size={18} />
              </button>
            </div>
            <div style={{ padding: 20, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              <img
                src={previewImage.url}
                alt={previewImage.title}
                style={{ maxWidth: '80vw', maxHeight: '70vh', objectFit: 'contain' }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

