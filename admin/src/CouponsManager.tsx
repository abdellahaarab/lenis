import React, { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Tag,
  Percent,
  Plus,
  Search,
  Check,
  X,
  Copy,
  Wand2,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Trash2,
  Edit3,
  Eye,
  RefreshCw,
  Truck,
  Sparkles,
  ShoppingBag,
  User,
  Phone,
  DollarSign,
  TrendingUp,
  ShieldCheck,
  Coins
} from 'lucide-react';
import { api, ApiError } from './api';
import { useI18n } from './i18n';
import { Loading, ErrorBox, Modal, useToast } from './components';
import type {
  CouponSummaryDto,
  CouponEditInput,
  CouponType,
  CouponStatus,
  CouponUsageLogDto,
} from '@aljeel/shared';
import './coupons-manager.css';

type CouponFormState = {
  id?: string;
  code: string;
  title: { ar: string; en: string };
  description: { ar: string; en: string };
  discountType: CouponType;
  discountValue: number;
  maxDiscountUsd: number | null;
  minOrderAmountUsd: number | null;
  maxOrderAmountUsd: number | null;
  minItemQuantity: number | null;
  startDate: string;
  endDate: string;
  usageLimitTotal: number | null;
  usageLimitPerCustomer: number | null;
  firstOrderOnly: boolean;
  excludeDiscounted: boolean;
  isPublic: boolean;
  active: boolean;
  applicableCategories: string[];
  excludedCategories: string[];
  applicableBrands: string[];
  excludedBrands: string[];
  customerPhones: string;
};

const initialForm: CouponFormState = {
  code: '',
  title: { ar: '', en: '' },
  description: { ar: '', en: '' },
  discountType: 'percentage',
  discountValue: 10,
  maxDiscountUsd: null,
  minOrderAmountUsd: null,
  maxOrderAmountUsd: null,
  minItemQuantity: 1,
  startDate: '',
  endDate: '',
  usageLimitTotal: null,
  usageLimitPerCustomer: 1,
  firstOrderOnly: false,
  excludeDiscounted: false,
  isPublic: false,
  active: true,
  applicableCategories: [],
  excludedCategories: [],
  applicableBrands: [],
  excludedBrands: [],
  customerPhones: '',
};

function generateSmartCode(type: CouponType, value: number): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let rand = '';
  for (let i = 0; i < 4; i++) {
    rand += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  if (type === 'percentage') {
    return `ALJEEL${Math.round(value)}-${rand}`;
  } else if (type === 'fixed_amount') {
    return `SAVE${Math.round(value)}-${rand}`;
  } else {
    return `FREE-${rand}`;
  }
}

export function CouponsManager() {
  const { lang } = useI18n();
  const ar = lang === 'ar';
  const queryClient = useQueryClient();
  const toast = useToast();

  const [q, setQ] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [page, setPage] = useState(1);

  // Modals state
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'basic' | 'discount' | 'rules' | 'targeting'>('basic');
  const [form, setForm] = useState<CouponFormState>(initialForm);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState('');

  // Usages drawer state
  const [usageCouponId, setUsageCouponId] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Queries
  const { data: stats } = useQuery({
    queryKey: ['coupons-stats'],
    queryFn: () =>
      api<{
        totalCoupons: number;
        activeCoupons: number;
        totalRedemptions: number;
        totalDiscountUsd: string;
        topCoupons: CouponSummaryDto[];
      }>('/commerce/coupons/stats'),
    staleTime: 10000,
  });

  const { data: reference } = useQuery({
    queryKey: ['commerce-reference'],
    queryFn: () =>
      api<{
        brands: { id: string; name: string }[];
        categories: { slug: string; title: { ar: string; en: string } }[];
      }>('/commerce/reference'),
    staleTime: 60000,
  });

  const { data: listData, isLoading, refetch } = useQuery({
    queryKey: ['coupons-list', page, q, statusFilter, typeFilter],
    queryFn: () => {
      const sp = new URLSearchParams();
      sp.set('page', String(page));
      sp.set('limit', '24');
      if (q.trim()) sp.set('q', q.trim());
      if (statusFilter !== 'all') sp.set('status', statusFilter);
      if (typeFilter !== 'all') sp.set('type', typeFilter);
      return api<{ items: CouponSummaryDto[]; total: number }>(`/commerce/coupons?${sp.toString()}`);
    },
  });

  const { data: usageData, isLoading: usageLoading } = useQuery({
    queryKey: ['coupon-usages', usageCouponId],
    queryFn: () =>
      usageCouponId
        ? api<{ coupon: CouponSummaryDto; usages: CouponUsageLogDto[] }>(`/commerce/coupons/${usageCouponId}`)
        : null,
    enabled: !!usageCouponId,
  });

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code).then(() => {
      setCopiedCode(code);
      toast(ar ? `تم نسخ كود الكوبون: ${code}` : `Copied coupon code: ${code}`);
      setTimeout(() => setCopiedCode(null), 2500);
    });
  };

  const handleOpenCreate = () => {
    setForm({
      ...initialForm,
      code: generateSmartCode('percentage', 10),
    });
    setActiveTab('basic');
    setFormError('');
    setEditModalOpen(true);
  };

  const handleOpenEdit = (c: CouponSummaryDto) => {
    setForm({
      id: c.id,
      code: c.code,
      title: { ar: c.title.ar, en: c.title.en || '' },
      description: {
        ar: c.description?.ar || '',
        en: c.description?.en || '',
      },
      discountType: c.discountType,
      discountValue: c.discountValue,
      maxDiscountUsd: c.maxDiscountUsd,
      minOrderAmountUsd: c.minOrderAmountUsd,
      maxOrderAmountUsd: c.maxOrderAmountUsd,
      minItemQuantity: c.minItemQuantity || 1,
      startDate: c.startDate ? c.startDate.slice(0, 16) : '',
      endDate: c.endDate ? c.endDate.slice(0, 16) : '',
      usageLimitTotal: c.usageLimitTotal,
      usageLimitPerCustomer: c.usageLimitPerCustomer,
      firstOrderOnly: c.firstOrderOnly,
      excludeDiscounted: c.excludeDiscounted,
      isPublic: c.isPublic,
      active: c.active,
      applicableCategories: c.applicableCategories || [],
      excludedCategories: c.excludedCategories || [],
      applicableBrands: c.applicableBrands || [],
      excludedBrands: c.excludedBrands || [],
      customerPhones: (c.customerPhones || []).join(', '),
    });
    setActiveTab('basic');
    setFormError('');
    setEditModalOpen(true);
  };

  const handleToggleActive = async (c: CouponSummaryDto) => {
    try {
      await api(`/commerce/coupons/${c.id}/toggle`, { method: 'POST' });
      toast(
        c.active
          ? ar ? `تم إيقاف الكوبون ${c.code}` : `Paused coupon ${c.code}`
          : ar ? `تم تفعيل الكوبون ${c.code}` : `Activated coupon ${c.code}`
      );
      void queryClient.invalidateQueries({ queryKey: ['coupons-list'] });
      void queryClient.invalidateQueries({ queryKey: ['coupons-stats'] });
    } catch (err) {
      toast(err instanceof ApiError ? err.message : 'Error', true);
    }
  };

  const handleDelete = async (c: CouponSummaryDto) => {
    const confirmMsg = ar
      ? `هل أنت متأكد من حذف أو تعطيل الكوبون «${c.code}»؟`
      : `Are you sure you want to delete/deactivate coupon "${c.code}"?`;
    if (!window.confirm(confirmMsg)) return;

    try {
      await api(`/commerce/coupons/${c.id}`, { method: 'DELETE' });
      toast(ar ? 'تم حذف الكوبون بنجاح' : 'Coupon deleted successfully');
      void queryClient.invalidateQueries({ queryKey: ['coupons-list'] });
      void queryClient.invalidateQueries({ queryKey: ['coupons-stats'] });
    } catch (err) {
      toast(err instanceof ApiError ? err.message : 'Error', true);
    }
  };

  const handleSaveForm = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!form.code.trim()) {
      setFormError(ar ? 'يرجى إدخال كود الكوبون' : 'Please enter coupon code');
      return;
    }
    if (!form.title.ar.trim()) {
      setFormError(ar ? 'يرجى إدخال عنوان الكوبون بالعربية' : 'Please enter Arabic title');
      return;
    }

    const payload: CouponEditInput = {
      id: form.id,
      code: form.code.trim().toUpperCase(),
      title: {
        ar: form.title.ar.trim(),
        en: form.title.en.trim() || form.title.ar.trim(),
      },
      description: form.description.ar.trim()
        ? {
            ar: form.description.ar.trim(),
            en: form.description.en.trim() || form.description.ar.trim(),
          }
        : null,
      discountType: form.discountType,
      discountValue: Number(form.discountValue),
      maxDiscountUsd: form.maxDiscountUsd ? Number(form.maxDiscountUsd) : null,
      minOrderAmountUsd: form.minOrderAmountUsd ? Number(form.minOrderAmountUsd) : null,
      maxOrderAmountUsd: form.maxOrderAmountUsd ? Number(form.maxOrderAmountUsd) : null,
      minItemQuantity: form.minItemQuantity ? Number(form.minItemQuantity) : 1,
      startDate: form.startDate ? new Date(form.startDate).toISOString() : null,
      endDate: form.endDate ? new Date(form.endDate).toISOString() : null,
      usageLimitTotal: form.usageLimitTotal ? Number(form.usageLimitTotal) : null,
      usageLimitPerCustomer: form.usageLimitPerCustomer ? Number(form.usageLimitPerCustomer) : null,
      firstOrderOnly: form.firstOrderOnly,
      excludeDiscounted: form.excludeDiscounted,
      isPublic: form.isPublic,
      active: form.active,
      applicableCategories: form.applicableCategories,
      excludedCategories: form.excludedCategories,
      applicableBrands: form.applicableBrands,
      excludedBrands: form.excludedBrands,
      applicableProducts: [],
      customerPhones: form.customerPhones
        ? form.customerPhones
            .split(',')
            .map((p) => p.trim())
            .filter(Boolean)
        : [],
    };

    setBusy(true);
    try {
      if (form.id) {
        await api(`/commerce/coupons/${form.id}`, {
          method: 'PATCH',
          body: payload,
        });
        toast(ar ? 'تم تحديث الكوبون بنجاح' : 'Coupon updated successfully');
      } else {
        await api('/commerce/coupons', {
          method: 'POST',
          body: payload,
        });
        toast(ar ? 'تم إنشاء الكوبون بنجاح' : 'Coupon created successfully');
      }
      setEditModalOpen(false);
      void queryClient.invalidateQueries({ queryKey: ['coupons-list'] });
      void queryClient.invalidateQueries({ queryKey: ['coupons-stats'] });
    } catch (err) {
      if (err instanceof ApiError && err.code === 'coupon_code_exists') {
        setFormError(ar ? 'كود الكوبون مستخدم بالفعل، اختر كوداً مختلفاً' : 'Coupon code already exists');
      } else {
        setFormError(err instanceof Error ? err.message : 'Error');
      }
    } finally {
      setBusy(false);
    }
  };

  const getStatusBadge = (status: CouponStatus) => {
    switch (status) {
      case 'active':
        return <span className="coupon-status-badge active"><CheckCircle2 size={12} /> {ar ? 'نشط' : 'Active'}</span>;
      case 'scheduled':
        return <span className="coupon-status-badge scheduled"><Clock size={12} /> {ar ? 'مجدول' : 'Scheduled'}</span>;
      case 'expired':
        return <span className="coupon-status-badge expired"><AlertTriangle size={12} /> {ar ? 'منتهي' : 'Expired'}</span>;
      case 'exhausted':
        return <span className="coupon-status-badge exhausted"><AlertTriangle size={12} /> {ar ? 'مستنفد' : 'Exhausted'}</span>;
      case 'paused':
      default:
        return <span className="coupon-status-badge paused"><X size={12} /> {ar ? 'معطّل' : 'Paused'}</span>;
    }
  };

  const getDiscountLabel = (c: CouponSummaryDto) => {
    if (c.discountType === 'percentage') {
      return (
        <span className="coupon-discount-val percentage">
          {c.discountValue}%
          {c.maxDiscountUsd && <span className="coupon-cap-hint">{ar ? `(سقف $${c.maxDiscountUsd})` : `(Max $${c.maxDiscountUsd})`}</span>}
        </span>
      );
    } else if (c.discountType === 'fixed_amount') {
      return <span className="coupon-discount-val fixed">${c.discountValue.toFixed(2)}</span>;
    } else {
      return <span className="coupon-discount-val shipping"><Truck size={14} /> {ar ? 'توصيل مجاني' : 'Free Delivery'}</span>;
    }
  };

  return (
    <div className="coupons-manager-container">
      {/* Top Header */}
      <div className="coupons-page-header">
        <div className="header-info">
          <div className="header-title-row">
            <div className="header-icon-box">
              <Tag size={24} />
            </div>
            <div>
              <h2>{ar ? 'نظام الكوبونات والخصومات الذكية' : 'Smart Coupons & Promotions Manager'}</h2>
              <p className="header-subtitle">
                {ar
                  ? 'إدارة متكاملة للكوبونات الترويجية، قيود الاستخدام، الاستهداف، ومتابعة سجلات التوفير'
                  : 'Manage promotional coupons, usage limits, targeting, and redemptions'}
              </p>
            </div>
          </div>
        </div>
        <div className="header-actions">
          <button type="button" className="button primary create-btn" onClick={handleOpenCreate}>
            <Plus size={18} />
            <span>{ar ? 'إنشاء كوبون جديد' : 'New Coupon'}</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Overview */}
      <div className="coupons-stats-grid">
        <div className="stat-card">
          <div className="stat-icon-wrapper active">
            <CheckCircle2 size={22} />
          </div>
          <div className="stat-content">
            <span className="stat-label">{ar ? 'الكوبونات النشطة' : 'Active Coupons'}</span>
            <div className="stat-number">
              {stats?.activeCoupons ?? 0}
              <span className="stat-sub">/ {stats?.totalCoupons ?? 0}</span>
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrapper redemptions">
            <TrendingUp size={22} />
          </div>
          <div className="stat-content">
            <span className="stat-label">{ar ? 'إجمالي مرات الاستخدام' : 'Total Redemptions'}</span>
            <div className="stat-number">{stats?.totalRedemptions ?? 0}</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrapper savings">
            <DollarSign size={22} />
          </div>
          <div className="stat-content">
            <span className="stat-label">{ar ? 'إجمالي الخصومات الممنوحة' : 'Total Savings Given'}</span>
            <div className="stat-number">${stats?.totalDiscountUsd ?? '0.00'}</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrapper public">
            <Sparkles size={22} />
          </div>
          <div className="stat-content">
            <span className="stat-label">{ar ? 'أعلى كوبون استخداماً' : 'Top Performing'}</span>
            <div className="stat-number top-code">
              {stats?.topCoupons?.[0]?.code || '—'}
              {stats?.topCoupons?.[0] && (
                <span className="stat-sub">({stats.topCoupons[0].usedCount} {ar ? 'طلب' : 'orders'})</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="coupons-controls-panel">
        <div className="search-box">
          <Search size={18} />
          <input
            type="text"
            placeholder={ar ? 'ابحث بكود الكوبون أو العنوان…' : 'Search by coupon code or title…'}
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(1);
            }}
          />
          {q && (
            <button type="button" className="clear-search" onClick={() => setQ('')}>
              <X size={14} />
            </button>
          )}
        </div>

        <div className="filter-tabs-wrapper">
          {[
            { id: 'all', label: ar ? 'الكل' : 'All' },
            { id: 'active', label: ar ? 'النشطة' : 'Active' },
            { id: 'scheduled', label: ar ? 'المجدولة' : 'Scheduled' },
            { id: 'expired', label: ar ? 'المنتهية' : 'Expired' },
            { id: 'exhausted', label: ar ? 'المستنفدة' : 'Exhausted' },
            { id: 'paused', label: ar ? 'المعطلة' : 'Paused' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={`filter-tab ${statusFilter === tab.id ? 'active' : ''}`}
              onClick={() => {
                setStatusFilter(tab.id);
                setPage(1);
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="type-filter-select">
          <select
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value);
              setPage(1);
            }}
          >
            <option value="all">{ar ? 'كافة أنواع الخصم' : 'All Discount Types'}</option>
            <option value="percentage">{ar ? 'نسبة مئوية (%)' : 'Percentage (%)'}</option>
            <option value="fixed_amount">{ar ? 'مبلغ ثابت ($)' : 'Fixed Amount ($)'}</option>
            <option value="free_shipping">{ar ? 'توصيل مجاني' : 'Free Shipping'}</option>
          </select>
        </div>
      </div>

      {/* Main Coupons List / Table */}
      <div className="coupons-table-card">
        {isLoading ? (
          <div className="loading-state">
            <Loading />
          </div>
        ) : !listData?.items.length ? (
          <div className="empty-coupons-state">
            <Tag size={42} className="empty-icon" />
            <h3>{ar ? 'لم يتم العثور على كوبونات' : 'No coupons found'}</h3>
            <p>
              {q || statusFilter !== 'all' || typeFilter !== 'all'
                ? ar
                  ? 'لا توجد نتائج تطابق معايير البحث الحالية'
                  : 'No results match your current filters'
                : ar
                ? 'ابدأ بإنشاء أول كود خصم لمتجرك الآن'
                : 'Create your first promotional discount coupon now'}
            </p>
            <button type="button" className="button primary sm" onClick={handleOpenCreate}>
              <Plus size={16} />
              <span>{ar ? 'إنشاء أول كوبون' : 'Create First Coupon'}</span>
            </button>
          </div>
        ) : (
          <div className="coupons-table-wrapper">
            <table className="coupons-table">
              <thead>
                <tr>
                  <th>{ar ? 'الكود والعنوان' : 'Code & Title'}</th>
                  <th>{ar ? 'قيمة الخصم' : 'Discount'}</th>
                  <th>{ar ? 'الشروط والحدود' : 'Conditions'}</th>
                  <th>{ar ? 'الاستخدامات' : 'Usage'}</th>
                  <th>{ar ? 'الصلاحية' : 'Validity'}</th>
                  <th>{ar ? 'الحالة' : 'Status'}</th>
                  <th>{ar ? 'الإجراءات' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody>
                {listData.items.map((c) => {
                  const usagePct = c.usageLimitTotal
                    ? Math.min(100, Math.round((c.usedCount / c.usageLimitTotal) * 100))
                    : null;

                  return (
                    <tr key={c.id} className={!c.active ? 'row-paused' : ''}>
                      <td>
                        <div className="coupon-code-cell">
                          <div className="code-pill">
                            <span className="code-text">{c.code}</span>
                            <button
                              type="button"
                              className="copy-btn"
                              title={ar ? 'نسخ الكود' : 'Copy code'}
                              onClick={() => handleCopyCode(c.code)}
                            >
                              {copiedCode === c.code ? (
                                <Check size={13} className="check-icon" />
                              ) : (
                                <Copy size={13} />
                              )}
                            </button>
                          </div>
                          <div className="coupon-title-text">{c.title[lang] || c.title.ar}</div>
                          {c.isPublic && (
                            <span className="public-promo-tag">
                              <Sparkles size={11} />
                              {ar ? 'عرض عام بالسلة' : 'Public promo'}
                            </span>
                          )}
                        </div>
                      </td>

                      <td>{getDiscountLabel(c)}</td>

                      <td>
                        <div className="conditions-stack">
                          {c.minOrderAmountUsd ? (
                            <span className="condition-item">
                              {ar ? `حد أدنى $${c.minOrderAmountUsd}` : `Min spend $${c.minOrderAmountUsd}`}
                            </span>
                          ) : (
                            <span className="condition-item muted">{ar ? 'بدون حد أدنى' : 'No min spend'}</span>
                          )}

                          {c.firstOrderOnly && (
                            <span className="condition-item highlight">
                              {ar ? 'الطلب الأول فقط' : 'First order only'}
                            </span>
                          )}

                          {c.usageLimitPerCustomer && c.usageLimitPerCustomer === 1 && (
                            <span className="condition-item">
                              {ar ? 'مرة واحدة للعميل' : '1 use per customer'}
                            </span>
                          )}
                        </div>
                      </td>

                      <td>
                        <div className="usage-progress-box">
                          <div className="usage-numbers">
                            <span className="used-count">{c.usedCount}</span>
                            <span className="total-limit">
                              / {c.usageLimitTotal ? c.usageLimitTotal : (ar ? 'غير محدود' : 'Unlimited')}
                            </span>
                          </div>
                          {usagePct !== null && (
                            <div className="progress-bar-track">
                              <div
                                className={`progress-bar-fill ${usagePct >= 90 ? 'danger' : ''}`}
                                style={{ width: `${usagePct}%` }}
                              />
                            </div>
                          )}
                        </div>
                      </td>

                      <td>
                        <div className="validity-dates">
                          {c.endDate ? (
                            <span>{new Date(c.endDate).toLocaleDateString(ar ? 'ar-YE' : 'en-US')}</span>
                          ) : (
                            <span className="muted">{ar ? 'مستمر بلا انتهاء' : 'No expiration'}</span>
                          )}
                        </div>
                      </td>

                      <td>{getStatusBadge(c.status)}</td>

                      <td>
                        <div className="actions-cell">
                          <button
                            type="button"
                            className={`action-btn toggle-btn ${c.active ? 'active' : ''}`}
                            title={c.active ? (ar ? 'تعطيل الكوبون' : 'Pause') : (ar ? 'تفعيل الكوبون' : 'Activate')}
                            onClick={() => handleToggleActive(c)}
                          >
                            <span className="toggle-dot" />
                          </button>

                          <button
                            type="button"
                            className="action-btn icon-only"
                            title={ar ? 'سجل الاستخدامات' : 'View Redemptions'}
                            onClick={() => setUsageCouponId(c.id)}
                          >
                            <Eye size={16} />
                          </button>

                          <button
                            type="button"
                            className="action-btn icon-only"
                            title={ar ? 'تعديل' : 'Edit'}
                            onClick={() => handleOpenEdit(c)}
                          >
                            <Edit3 size={16} />
                          </button>

                          <button
                            type="button"
                            className="action-btn icon-only danger"
                            title={ar ? 'حذف' : 'Delete'}
                            onClick={() => handleDelete(c)}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create / Edit Coupon Modal */}
      <Modal
        open={editModalOpen}
        onOpenChange={setEditModalOpen}
        title={form.id ? (ar ? 'تعديل الكوبون' : 'Edit Coupon') : (ar ? 'إنشاء كود خصم جديد' : 'Create New Coupon')}
        description={
          ar
            ? 'حدد معايير الكوبون وشروطه المالية والاستهداف بعناية لحماية هوامش الربح'
            : 'Configure coupon settings, financial limits, and audience targeting'
        }
        className="coupon-edit-modal"
      >
        <form onSubmit={handleSaveForm} className="coupon-form">
          <ErrorBox code={formError} />

          {/* Modal Tabs Navigation */}
          <div className="modal-tabs">
            <button
              type="button"
              className={`modal-tab ${activeTab === 'basic' ? 'active' : ''}`}
              onClick={() => setActiveTab('basic')}
            >
              <Tag size={15} />
              <span>{ar ? 'البيانات والكود' : 'Basic & Code'}</span>
            </button>
            <button
              type="button"
              className={`modal-tab ${activeTab === 'discount' ? 'active' : ''}`}
              onClick={() => setActiveTab('discount')}
            >
              <Percent size={15} />
              <span>{ar ? 'نوع وقيمة الخصم' : 'Discount'}</span>
            </button>
            <button
              type="button"
              className={`modal-tab ${activeTab === 'rules' ? 'active' : ''}`}
              onClick={() => setActiveTab('rules')}
            >
              <ShieldCheck size={15} />
              <span>{ar ? 'الشروط والحدود' : 'Limits & Rules'}</span>
            </button>
            <button
              type="button"
              className={`modal-tab ${activeTab === 'targeting' ? 'active' : ''}`}
              onClick={() => setActiveTab('targeting')}
            >
              <Calendar size={15} />
              <span>{ar ? 'الاستهداف والصلاحية' : 'Targeting & Dates'}</span>
            </button>
          </div>

          <div className="tab-body">
            {/* Tab 1: Basic & Code */}
            {activeTab === 'basic' && (
              <div className="form-section">
                <div className="form-group code-input-group">
                  <label>
                    <span>{ar ? 'كود الكوبون' : 'Coupon Code'} *</span>
                    <button
                      type="button"
                      className="smart-gen-btn"
                      onClick={() => setForm((f) => ({ ...f, code: generateSmartCode(f.discountType, f.discountValue) }))}
                    >
                      <Wand2 size={13} />
                      <span>{ar ? 'توليد كود تلقائي' : 'Auto Generate'}</span>
                    </button>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. SUMMER26"
                    value={form.code}
                    onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                    className="code-field"
                  />
                  <span className="field-hint">
                    {ar ? 'يُفضل استخدام حروف وأرقام إنجليزية واضحة' : 'Use uppercase letters, numbers, and hyphens'}
                  </span>
                </div>

                <div className="form-grid-2">
                  <div className="form-group">
                    <label>{ar ? 'اسم الكوبون (بالعربية)' : 'Title (Arabic)'} *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. خصم الصيف 15%"
                      value={form.title.ar}
                      onChange={(e) => setForm({ ...form, title: { ...form.title, ar: e.target.value } })}
                    />
                  </div>

                  <div className="form-group">
                    <label>{ar ? 'اسم الكوبون (بالإنجليزية)' : 'Title (English)'}</label>
                    <input
                      type="text"
                      placeholder="e.g. Summer 15% Off"
                      value={form.title.en}
                      onChange={(e) => setForm({ ...form, title: { ...form.title, en: e.target.value } })}
                    />
                  </div>
                </div>

                <div className="form-grid-2">
                  <div className="form-group">
                    <label>{ar ? 'الوصف (عربي)' : 'Description (Arabic)'}</label>
                    <textarea
                      rows={2}
                      placeholder="e.g. يسري على جميع أجهزة اللابتوب وملحقاتها"
                      value={form.description.ar}
                      onChange={(e) =>
                        setForm({ ...form, description: { ...form.description, ar: e.target.value } })
                      }
                    />
                  </div>

                  <div className="form-group">
                    <label>{ar ? 'الوصف (إنجليزي)' : 'Description (English)'}</label>
                    <textarea
                      rows={2}
                      placeholder="e.g. Valid on laptops and accessories"
                      value={form.description.en}
                      onChange={(e) =>
                        setForm({ ...form, description: { ...form.description, en: e.target.value } })
                      }
                    />
                  </div>
                </div>

                <div className="checkboxes-stack">
                  <label className="checkbox-row">
                    <input
                      type="checkbox"
                      checked={form.isPublic}
                      onChange={(e) => setForm({ ...form, isPublic: e.target.checked })}
                    />
                    <div>
                      <div className="checkbox-title">{ar ? 'عرض عام في السلة (Public Promo)' : 'Show in cart as public promo'}</div>
                      <div className="checkbox-desc">
                        {ar
                          ? 'يظهر الكوبون في قائمة العروض المتاحة للزوار بصفحة السلة ليتمكنوا من تطبيقه بنقرة واحدة'
                          : 'Displays this coupon prominently in the cart for all visitors to apply with 1 click'}
                      </div>
                    </div>
                  </label>

                  <label className="checkbox-row">
                    <input
                      type="checkbox"
                      checked={form.active}
                      onChange={(e) => setForm({ ...form, active: e.target.checked })}
                    />
                    <div>
                      <div className="checkbox-title">{ar ? 'تفعيل الكوبون فوراً' : 'Active immediately'}</div>
                      <div className="checkbox-desc">
                        {ar ? 'إذا عُطّل، لن يتمكن العملاء من استخدامه' : 'If unchecked, customers cannot redeem it'}
                      </div>
                    </div>
                  </label>
                </div>
              </div>
            )}

            {/* Tab 2: Discount Type & Value */}
            {activeTab === 'discount' && (
              <div className="form-section">
                <div className="discount-type-selector">
                  <label className={`type-card ${form.discountType === 'percentage' ? 'selected' : ''}`}>
                    <input
                      type="radio"
                      name="discountType"
                      value="percentage"
                      checked={form.discountType === 'percentage'}
                      onChange={() => setForm({ ...form, discountType: 'percentage' })}
                    />
                    <Percent size={24} />
                    <span className="type-title">{ar ? 'نسبة مئوية (%)' : 'Percentage (%)'}</span>
                    <span className="type-desc">{ar ? 'خصم نسبة من إجمالي السلة' : 'Percentage off cart total'}</span>
                  </label>

                  <label className={`type-card ${form.discountType === 'fixed_amount' ? 'selected' : ''}`}>
                    <input
                      type="radio"
                      name="discountType"
                      value="fixed_amount"
                      checked={form.discountType === 'fixed_amount'}
                      onChange={() => setForm({ ...form, discountType: 'fixed_amount' })}
                    />
                    <DollarSign size={24} />
                    <span className="type-title">{ar ? 'مبلغ ثابت ($)' : 'Fixed Amount ($)'}</span>
                    <span className="type-desc">{ar ? 'خصم مبلغ نقدي محدد بالدولار' : 'Fixed USD discount amount'}</span>
                  </label>

                  <label className={`type-card ${form.discountType === 'free_shipping' ? 'selected' : ''}`}>
                    <input
                      type="radio"
                      name="discountType"
                      value="free_shipping"
                      checked={form.discountType === 'free_shipping'}
                      onChange={() => setForm({ ...form, discountType: 'free_shipping' })}
                    />
                    <Truck size={24} />
                    <span className="type-title">{ar ? 'توصيل مجاني' : 'Free Shipping'}</span>
                    <span className="type-desc">{ar ? 'إلغاء رسوم الشحن والتوصيل' : 'Waive delivery fees'}</span>
                  </label>
                </div>

                {form.discountType !== 'free_shipping' && (
                  <div className="form-grid-2">
                    <div className="form-group">
                      <label>
                        {form.discountType === 'percentage'
                          ? ar ? 'قيمة النسبة المئوية (%)' : 'Percentage Value (%)'
                          : ar ? 'قيمة الخصم بالدولار ($)' : 'Discount Amount (USD)'} *
                      </label>
                      <input
                        type="number"
                        min="0.01"
                        max={form.discountType === 'percentage' ? 100 : 100000}
                        step="any"
                        required
                        value={form.discountValue}
                        onChange={(e) => setForm({ ...form, discountValue: parseFloat(e.target.value) || 0 })}
                      />
                    </div>

                    {form.discountType === 'percentage' && (
                      <div className="form-group">
                        <label>
                          {ar ? 'سقف أقصى للخصم بالدولار (اختياري)' : 'Max Discount Cap USD (Optional)'}
                        </label>
                        <input
                          type="number"
                          min="1"
                          step="any"
                          placeholder="e.g. 50"
                          value={form.maxDiscountUsd ?? ''}
                          onChange={(e) =>
                            setForm({
                              ...form,
                              maxDiscountUsd: e.target.value ? parseFloat(e.target.value) : null,
                            })
                          }
                        />
                        <span className="field-hint">
                          {ar ? 'مثال: خصم 20% بحد أقصى 50$ لمنع الخسائر' : 'Prevents discount from exceeding this cap'}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Tab 3: Limits & Rules */}
            {activeTab === 'rules' && (
              <div className="form-section">
                <div className="form-grid-2">
                  <div className="form-group">
                    <label>{ar ? 'الحد الأدنى لقيمة السلة ($)' : 'Min Order Amount (USD)'}</label>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      placeholder="e.g. 100"
                      value={form.minOrderAmountUsd ?? ''}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          minOrderAmountUsd: e.target.value ? parseFloat(e.target.value) : null,
                        })
                      }
                    />
                    <span className="field-hint">
                      {ar ? 'لا يعمل الكوبون إذا كانت السلة أقل من هذا المبلغ' : 'Cart subtotal must meet this amount'}
                    </span>
                  </div>

                  <div className="form-group">
                    <label>{ar ? 'الحد الأقصى لقيمة السلة ($)' : 'Max Order Amount (USD)'}</label>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      placeholder="e.g. 5000"
                      value={form.maxOrderAmountUsd ?? ''}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          maxOrderAmountUsd: e.target.value ? parseFloat(e.target.value) : null,
                        })
                      }
                    />
                  </div>
                </div>

                <div className="form-grid-2">
                  <div className="form-group">
                    <label>{ar ? 'إجمالي مرات الاستخدام المتاحة للمتجر' : 'Total Storewide Usage Limit'}</label>
                    <input
                      type="number"
                      min="1"
                      placeholder={ar ? 'اتركه فارغاً لغير محدود' : 'Leave empty for unlimited'}
                      value={form.usageLimitTotal ?? ''}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          usageLimitTotal: e.target.value ? parseInt(e.target.value, 10) : null,
                        })
                      }
                    />
                    <span className="field-hint">
                      {ar ? 'مثال: متاح لأول 100 عميل فقط' : 'e.g. valid for first 100 customers'}
                    </span>
                  </div>

                  <div className="form-group">
                    <label>{ar ? 'حد الاستخدام لكل حساب عميل' : 'Usage Limit Per Customer'}</label>
                    <input
                      type="number"
                      min="1"
                      value={form.usageLimitPerCustomer ?? ''}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          usageLimitPerCustomer: e.target.value ? parseInt(e.target.value, 10) : null,
                        })
                      }
                    />
                    <span className="field-hint">
                      {ar ? 'الافتراضي 1 لمنع تكرار نفس العميل' : 'Default is 1 to prevent abuse'}
                    </span>
                  </div>
                </div>

                <div className="checkboxes-stack">
                  <label className="checkbox-row">
                    <input
                      type="checkbox"
                      checked={form.firstOrderOnly}
                      onChange={(e) => setForm({ ...form, firstOrderOnly: e.target.checked })}
                    />
                    <div>
                      <div className="checkbox-title">{ar ? 'للعملاء الجدد فقط (First-time customers)' : 'First order only'}</div>
                      <div className="checkbox-desc">
                        {ar
                          ? 'لا يستفيد منه إلا العميل الذي لم يسبق له إكمال أي طلب سابق بالمتجر'
                          : 'Valid only for customers placing their very first order'}
                      </div>
                    </div>
                  </label>

                  <label className="checkbox-row">
                    <input
                      type="checkbox"
                      checked={form.excludeDiscounted}
                      onChange={(e) => setForm({ ...form, excludeDiscounted: e.target.checked })}
                    />
                    <div>
                      <div className="checkbox-title">{ar ? 'استثناء المنتجات المخفضة' : 'Exclude on-sale products'}</div>
                      <div className="checkbox-desc">
                        {ar
                          ? 'منع تطبيق خصم إضافي فوق المنتجات التي عليها عروض سعرية مسبقة'
                          : 'Prevents stacking discounts on items already discounted'}
                      </div>
                    </div>
                  </label>
                </div>
              </div>
            )}

            {/* Tab 4: Targeting & Dates */}
            {activeTab === 'targeting' && (
              <div className="form-section">
                <div className="form-grid-2">
                  <div className="form-group">
                    <label>{ar ? 'تاريخ ووقت البدء' : 'Start Date & Time'}</label>
                    <input
                      type="datetime-local"
                      value={form.startDate}
                      onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                    />
                    <span className="field-hint">
                      {ar ? 'اتركه فارغاً ليبدأ فوراً' : 'Leave empty to start immediately'}
                    </span>
                  </div>

                  <div className="form-group">
                    <label>{ar ? 'تاريخ ووقت الانتهاء' : 'Expiration Date & Time'}</label>
                    <input
                      type="datetime-local"
                      value={form.endDate}
                      onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                    />
                    <span className="field-hint">
                      {ar ? 'اتركه فارغاً ليبقى مستمراً' : 'Leave empty for no expiry'}
                    </span>
                  </div>
                </div>

                {reference?.categories && (
                  <div className="form-group">
                    <label>{ar ? 'الفئات المشمولة فقط (اختياري)' : 'Applicable Categories (Optional)'}</label>
                    <div className="tags-selector">
                      {reference.categories.map((cat) => {
                        const selected = form.applicableCategories.includes(cat.slug);
                        return (
                          <button
                            type="button"
                            key={cat.slug}
                            className={`tag-btn ${selected ? 'selected' : ''}`}
                            onClick={() => {
                              const next = selected
                                ? form.applicableCategories.filter((c) => c !== cat.slug)
                                : [...form.applicableCategories, cat.slug];
                              setForm({ ...form, applicableCategories: next });
                            }}
                          >
                            {selected ? <Check size={12} /> : null}
                            <span>{cat.title[lang] || cat.title.ar}</span>
                          </button>
                        );
                      })}
                    </div>
                    <span className="field-hint">
                      {ar ? 'إذا لم تحدد أي فئة، سيشمل الكوبون جميع فئات المتجر' : 'Leave unselected to apply to all categories'}
                    </span>
                  </div>
                )}

                {reference?.brands && (
                  <div className="form-group">
                    <label>{ar ? 'الماركات المشمولة فقط (اختياري)' : 'Applicable Brands (Optional)'}</label>
                    <div className="tags-selector">
                      {reference.brands.map((b) => {
                        const selected = form.applicableBrands.includes(b.id);
                        return (
                          <button
                            type="button"
                            key={b.id}
                            className={`tag-btn ${selected ? 'selected' : ''}`}
                            onClick={() => {
                              const next = selected
                                ? form.applicableBrands.filter((id) => id !== b.id)
                                : [...form.applicableBrands, b.id];
                              setForm({ ...form, applicableBrands: next });
                            }}
                          >
                            {selected ? <Check size={12} /> : null}
                            <span>{b.name}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="form-group">
                  <label>{ar ? 'أرقام هواتف عملاء VIP محددين (اختياري)' : 'Specific Customer Phones (Optional)'}</label>
                  <input
                    type="text"
                    placeholder="+967771234567, +967731234567"
                    value={form.customerPhones}
                    onChange={(e) => setForm({ ...form, customerPhones: e.target.value })}
                  />
                  <span className="field-hint">
                    {ar ? 'افصل بين الأرقام بفواصل. إذا تُرك فارغاً يسري على جميع العملاء' : 'Comma separated. Leave empty for all customers'}
                  </span>
                </div>
              </div>
            )}
          </div>

          <div className="modal-actions-bar">
            <button
              type="button"
              className="button secondary"
              onClick={() => setEditModalOpen(false)}
              disabled={busy}
            >
              {ar ? 'إلغاء' : 'Cancel'}
            </button>
            <button type="submit" className="button primary" disabled={busy}>
              {busy ? (ar ? 'جارٍ الحفظ…' : 'Saving…') : form.id ? (ar ? 'حفظ التعديلات' : 'Update Coupon') : (ar ? 'إنشاء الكوبون' : 'Create Coupon')}
            </button>
          </div>
        </form>
      </Modal>

      {/* Coupon Usages Drawer / Modal */}
      <Modal
        open={!!usageCouponId}
        onOpenChange={(open) => !open && setUsageCouponId(null)}
        title={ar ? 'سجل استخدامات الكوبون' : 'Coupon Redemptions Log'}
        description={
          usageData?.coupon
            ? `${ar ? 'كود الكوبون:' : 'Coupon Code:'} ${usageData.coupon.code} (${usageData.usages.length} ${ar ? 'مرات استخدام' : 'redemptions'})`
            : ''
        }
        className="coupon-usage-modal"
      >
        <div className="usage-modal-content">
          {usageLoading ? (
            <Loading />
          ) : !usageData?.usages.length ? (
            <div className="empty-usages">
              <ShoppingBag size={36} />
              <p>{ar ? 'لم يتم استخدام هذا الكوبون في أي طلب بعد' : 'This coupon has not been used in any order yet'}</p>
            </div>
          ) : (
            <div className="usages-table-wrapper">
              <table className="usages-table">
                <thead>
                  <tr>
                    <th>{ar ? 'رقم الطلب' : 'Order #'}</th>
                    <th>{ar ? 'العميل' : 'Customer'}</th>
                    <th>{ar ? 'التاريخ' : 'Date'}</th>
                    <th>{ar ? 'إجمالي السلة' : 'Cart Subtotal'}</th>
                    <th>{ar ? 'الخصم الممنوح' : 'Discount'}</th>
                  </tr>
                </thead>
                <tbody>
                  {usageData.usages.map((u) => (
                    <tr key={u.id}>
                      <td>
                        <span className="order-number-pill">{u.orderNumber}</span>
                      </td>
                      <td>
                        <div className="customer-cell">
                          <span className="customer-name">{u.customerName}</span>
                          {u.customerPhone && <span className="customer-phone">{u.customerPhone}</span>}
                        </div>
                      </td>
                      <td>{new Date(u.usedAt).toLocaleString(ar ? 'ar-YE' : 'en-US')}</td>
                      <td>${u.orderSubtotalUsd}</td>
                      <td>
                        <span className="discount-saved-badge">
                          -${u.discountUsd}
                          {u.discountYer && <span className="yer-sub"> (~{Math.round(Number(u.discountYer)).toLocaleString()} ر.ي)</span>}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
