import { useQuery } from '@tanstack/react-query';
import {
  X, Clock, MapPin, Smartphone, Monitor, Tablet, Eye, MessageCircle,
  Globe, Search, SlidersHorizontal, ShoppingBag, ExternalLink, RefreshCw
} from 'lucide-react';
import { api } from './api';

export interface VisitorJourneyData {
  visitor: {
    visitorHash: string;
    tag: string;
    sessionsCount: number;
    totalEvents: number;
    pageViewsCount: number;
    productViewsCount: number;
    distinctProductsCount: number;
    whatsappClicksCount: number;
    firstSeen: string;
    lastSeen: string;
    location: {
      country: string;
      city: string;
      flag: string;
    };
    device: {
      deviceClass: 'mobile' | 'tablet' | 'desktop';
      os: string;
      browser: string;
      brand: string;
      screen?: string;
    };
  };
  productsInspected: {
    productId: string;
    title: Record<string, string> | string;
    model: string;
    category: string;
    image: string | null;
    viewsCount: number;
    lastSeen: string;
  }[];
  journey: {
    id: string;
    type: string;
    path: string;
    productId: string | null;
    productTitle: Record<string, string> | string | null;
    productModel: string | null;
    productImage: string | null;
    searchQuery: string | null;
    deviceClass: string;
    lang: string;
    createdAt: string;
  }[];
}

function getTitle(title: unknown, lang: string, fallback = ''): string {
  if (!title) return fallback;
  if (typeof title === 'string') return title;
  if (typeof title === 'object') {
    const map = title as Record<string, string>;
    return map[lang] || map['ar'] || map['en'] || fallback;
  }
  return fallback;
}

export function VisitorJourneyModal({
  visitorHash,
  onClose,
  ar,
  lang,
}: {
  visitorHash: string;
  onClose: () => void;
  ar: boolean;
  lang: string;
}) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['visitor-journey', visitorHash],
    queryFn: () => api<VisitorJourneyData>(`/analytics/visitors/${visitorHash}`),
  });

  const v = data?.visitor;

  const eventLabel = (type: string) => {
    switch (type) {
      case 'page_view':
        return ar ? 'زيارة صفحة' : 'Page View';
      case 'product_view':
        return ar ? 'مشاهدة منتج' : 'Product View';
      case 'whatsapp_click':
        return ar ? 'نقرة استفسار واتساب' : 'WhatsApp Inquiry';
      case 'search':
        return ar ? 'بحث في المتجر' : 'Search Query';
      case 'filter_used':
        return ar ? 'تطبيق فلتر' : 'Filter Applied';
      default:
        return type;
    }
  };

  const eventIcon = (type: string) => {
    switch (type) {
      case 'product_view':
        return <Eye size={14} className="text-amber-500" />;
      case 'whatsapp_click':
        return <MessageCircle size={14} className="text-green-500" />;
      case 'search':
        return <Search size={14} className="text-blue-500" />;
      case 'filter_used':
        return <SlidersHorizontal size={14} className="text-purple-500" />;
      default:
        return <Globe size={14} className="text-indigo-500" />;
    }
  };

  return (
    <div className="visitor-modal-overlay" onClick={onClose}>
      <div className="visitor-modal-dialog" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="visitor-modal-header">
          <div className="visitor-modal-title-box">
            <div className="visitor-tag-row">
              <span className="visitor-tag-badge">{v?.tag || `زائر #${visitorHash.slice(0, 6)}`}</span>
              {v?.location && (
                <span className="visitor-geo-pill">
                  <span>{v.location.flag}</span>
                  <span>{v.location.city}، {v.location.country}</span>
                </span>
              )}
            </div>
            <h2>{ar ? 'سجل رحلة الزائر ونشاطه في المتجر' : 'Visitor Activity Journey & Profile'}</h2>
          </div>

          <button
            type="button"
            className="visitor-modal-close-btn"
            onClick={onClose}
            aria-label={ar ? 'إغلاق' : 'Close'}
          >
            <X size={20} />
          </button>
        </div>

        {/* Content Body */}
        <div className="visitor-modal-body">
          {isLoading && (
            <div className="visitor-loading-state">
              <RefreshCw size={24} className="spin text-primary" />
              <p>{ar ? 'جارٍ تحميل سجل رحلة الزائر...' : 'Loading visitor journey...'}</p>
            </div>
          )}

          {error && (
            <div className="visitor-error-state">
              <p>{ar ? 'تعذر تحميل بيانات هذا الزائر' : 'Could not load visitor details'}</p>
              <button type="button" className="analytics-btn-pill secondary" onClick={() => refetch()}>
                {ar ? 'إعادة المحاولة' : 'Retry'}
              </button>
            </div>
          )}

          {data && v && (
            <>
              {/* Tech & Identity Specs Card */}
              <div className="visitor-specs-card">
                <div className="visitor-spec-item">
                  <span className="spec-label">{ar ? 'الموقع' : 'Location'}</span>
                  <strong className="spec-val">
                    <MapPin size={13} className="text-rose-500" />
                    {v.location.flag} {v.location.city}، {v.location.country}
                  </strong>
                </div>

                <div className="visitor-spec-item">
                  <span className="spec-label">{ar ? 'الجهاز' : 'Device'}</span>
                  <strong className="spec-val">
                    {v.device.deviceClass === 'mobile' ? (
                      <Smartphone size={13} />
                    ) : v.device.deviceClass === 'tablet' ? (
                      <Tablet size={13} />
                    ) : (
                      <Monitor size={13} />
                    )}
                    {v.device.brand} ({v.device.os})
                  </strong>
                </div>

                <div className="visitor-spec-item">
                  <span className="spec-label">{ar ? 'المتصفح' : 'Browser'}</span>
                  <strong className="spec-val">{v.device.browser}</strong>
                </div>

                <div className="visitor-spec-item">
                  <span className="spec-label">{ar ? 'أول ظهور' : 'First Seen'}</span>
                  <span className="spec-val muted">
                    {new Date(v.firstSeen).toLocaleString(ar ? 'ar-YE' : 'en-GB', {
                      dateStyle: 'short',
                      timeStyle: 'short',
                    })}
                  </span>
                </div>

                <div className="visitor-spec-item">
                  <span className="spec-label">{ar ? 'آخر نشاط' : 'Last Seen'}</span>
                  <span className="spec-val muted">
                    {new Date(v.lastSeen).toLocaleString(ar ? 'ar-YE' : 'en-GB', {
                      dateStyle: 'short',
                      timeStyle: 'short',
                    })}
                  </span>
                </div>
              </div>

              {/* Engagement Stats Grid */}
              <div className="visitor-kpi-grid">
                <div className="visitor-kpi-box">
                  <span className="kpi-label">{ar ? 'عدد الزيارات والجلسات' : 'Sessions'}</span>
                  <strong className="kpi-num">{v.sessionsCount}</strong>
                </div>

                <div className="visitor-kpi-box">
                  <span className="kpi-label">{ar ? 'الصفحات المشاهدة' : 'Pageviews'}</span>
                  <strong className="kpi-num">{v.pageViewsCount}</strong>
                </div>

                <div className="visitor-kpi-box">
                  <span className="kpi-label">{ar ? 'المنتجات المشاهدة' : 'Products Viewed'}</span>
                  <strong className="kpi-num text-amber">{v.productViewsCount}</strong>
                  <span className="kpi-sub">{v.distinctProductsCount} {ar ? 'صنف فريد' : 'distinct'}</span>
                </div>

                <div className="visitor-kpi-box">
                  <span className="kpi-label">{ar ? 'نقرات الواتساب' : 'WhatsApp Clicks'}</span>
                  <strong className="kpi-num text-green">{v.whatsappClicksCount}</strong>
                </div>
              </div>

              {/* Products Inspected Section */}
              {data.productsInspected.length > 0 && (
                <div className="visitor-section">
                  <div className="visitor-section-header">
                    <ShoppingBag size={16} style={{ color: '#f59e0b' }} />
                    <h3>
                      {ar
                        ? `المنتجات التي استعرضها الزائر (${data.productsInspected.length})`
                        : `Products Explored by Visitor (${data.productsInspected.length})`}
                    </h3>
                  </div>

                  <div className="visitor-inspected-prods-grid">
                    {data.productsInspected.map(p => {
                      const prodTitle = getTitle(p.title, lang, p.model);
                      return (
                        <div key={p.productId} className="visitor-inspected-prod-card">
                          {p.image ? (
                            <img
                              src={p.image}
                              alt={prodTitle}
                              className="inspected-prod-thumb"
                              loading="lazy"
                              onError={e => {
                                (e.currentTarget as HTMLImageElement).style.display = 'none';
                              }}
                            />
                          ) : (
                            <div className="inspected-prod-thumb placeholder">
                              <ShoppingBag size={18} className="muted" />
                            </div>
                          )}

                          <div className="inspected-prod-details">
                            <strong className="inspected-prod-title" title={prodTitle}>
                              {prodTitle}
                            </strong>
                            <span className="inspected-prod-meta">
                              {p.category || p.model}
                            </span>
                            <div className="inspected-prod-views-tag">
                              <Eye size={12} />
                              <span>{p.viewsCount} {ar ? 'مشاهدات' : 'views'}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Chronological Activity Timeline ("ماذا عمل بالدقيقة والثانية") */}
              <div className="visitor-section">
                <div className="visitor-section-header">
                  <Clock size={16} style={{ color: '#322f83' }} />
                  <h3>
                    {ar
                      ? `سجل النشاط الزمني الكامل — ماذا عمل (${data.journey.length} إجراء)`
                      : `Chronological Activity Timeline (${data.journey.length} Actions)`}
                  </h3>
                </div>

                <div className="visitor-timeline">
                  {data.journey.map((step, idx) => {
                    const isProduct = step.type === 'product_view' && step.productTitle;
                    const isWhatsapp = step.type === 'whatsapp_click';
                    const isSearch = step.type === 'search' || !!step.searchQuery;

                    return (
                      <div key={step.id || idx} className={`timeline-node ${step.type}`}>
                        <div className="timeline-dot-wrap">
                          <span className="timeline-dot">{eventIcon(step.type)}</span>
                          {idx < data.journey.length - 1 && <span className="timeline-line" />}
                        </div>

                        <div className="timeline-content-box">
                          <div className="timeline-header-line">
                            <span className={`timeline-type-pill ${step.type}`}>
                              {eventLabel(step.type)}
                            </span>
                            <time className="timeline-time">
                              {new Date(step.createdAt).toLocaleTimeString(
                                ar ? 'ar-YE' : 'en-GB',
                                { timeStyle: 'medium' }
                              )}
                            </time>
                          </div>

                          {/* Specific Action Details */}
                          {isProduct && (
                            <div className="timeline-product-snippet">
                              {step.productImage && (
                                <img
                                  src={step.productImage}
                                  alt=""
                                  className="timeline-prod-mini-img"
                                />
                              )}
                              <div>
                                <strong>{getTitle(step.productTitle, lang, step.productModel || '')}</strong>
                                <span className="muted">{step.productModel}</span>
                              </div>
                            </div>
                          )}

                          {isWhatsapp && (
                            <div className="timeline-whatsapp-snippet">
                              <MessageCircle size={14} />
                              <span>
                                {ar
                                  ? `تواصل عبر واتساب بخصوص: ${getTitle(step.productTitle, lang, step.path)}`
                                  : `Inquiry via WhatsApp for: ${getTitle(step.productTitle, lang, step.path)}`}
                              </span>
                            </div>
                          )}

                          {isSearch && (
                            <div className="timeline-search-snippet">
                              <Search size={13} />
                              <span>{ar ? 'بحث عن:' : 'Searched:'} <strong>"{step.searchQuery}"</strong></span>
                            </div>
                          )}

                          <div className="timeline-path-row">
                            <span className="timeline-path" title={step.path}>{step.path}</span>
                            <a
                              href={step.path}
                              target="_blank"
                              rel="noreferrer"
                              className="timeline-path-link"
                              title={ar ? 'معاينة الصفحة' : 'Open Page'}
                            >
                              <ExternalLink size={12} />
                            </a>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
