import { useState, useMemo, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ShoppingBag, Search, Clock, CheckCircle2, Package, Truck, Store, XCircle, Copy, Check, Printer, Eye, RefreshCw, AlertTriangle, Trash2, User, Phone, MapPin, Calendar, X, Sparkles, ShieldCheck, MessageCircle, ArrowRight } from 'lucide-react';
import { api, ApiError } from './api';
import { useI18n } from './i18n';
import { Loading, ErrorBox, Modal } from './components';
import { OrderStatuses } from '@aljeel/shared';
import './orders-manager.css';

type Row = Record<string, unknown>;

const object = (v: unknown): Row => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Row) : {});
const list = (v: unknown): Row[] => (Array.isArray(v) ? v.map(object) : []);
const string = (v: unknown) => (v == null ? '' : String(v));
const localized = (v: unknown, lang: string) => string(object(v)[lang]);

interface OrderItem {
  variantId: string;
  unitId?: string | null;
  productId: string;
  sku: string;
  title: { ar: string; en: string };
  condition?: string;
  quantity: number;
  unitPriceUsd?: string | number | null;
  linePriceUsd?: string | number | null;
  images?: string[];
  warrantyMonths?: number | null;
  inspection?: { passed?: boolean; notes?: { ar?: string; en?: string } };
}

interface OrderRecord {
  id: string;
  number: string;
  customerId: string;
  status: string;
  currency: 'USD' | 'YER';
  usdToYer?: string | null;
  rateAt?: string | null;
  subtotalUsd: string | number;
  subtotalYer?: string | number | null;
  hasUnpriced: boolean;
  items: OrderItem[];
  fulfillment: {
    method?: 'pickup' | 'delivery' | string;
    address?: string;
    notes?: string;
  };
  customerSnapshot: {
    name?: string;
    phone?: string;
    phoneVerified?: boolean;
  };
  createdAt: string;
  updatedAt: string;
  completedAt?: string | null;
}

export function OrdersManager() {
  const { lang } = useI18n();
  const ar = lang === 'ar';
  const client = useQueryClient();
  const say = useCallback((arabic: string, english: string) => (ar ? arabic : english), [ar]);

  // Filters & Pagination
  const [q, setQ] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [methodFilter, setMethodFilter] = useState<'all' | 'pickup' | 'delivery'>('all');
  const [page, setPage] = useState(1);

  // Selected Order for Details & Drawer
  const [selected, setSelected] = useState<OrderRecord | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Action status / confirmations
  const [actionError, setActionError] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirmStatusModal, setConfirmStatusModal] = useState<{ status: string; label: string } | null>(null);
  const [deleteConfirmOrder, setDeleteConfirmOrder] = useState<OrderRecord | null>(null);

  // Fetch Orders
  const query = useQuery<{ items: OrderRecord[]; total: number }>({
    queryKey: ['orders', q, statusFilter, page],
    queryFn: () =>
      api<{ items: OrderRecord[]; total: number }>(
        `/commerce/orders?q=${encodeURIComponent(q)}&page=${page}${statusFilter ? `&status=${statusFilter}` : ''}`
      ),
  });

  // Status Labels and Config
  const statusMeta: Record<string, { label: string; enLabel: string; colorClass: string; icon: typeof Clock }> = {
    new: { label: 'طلب جديد', enLabel: 'New Order', colorClass: 'new', icon: Sparkles },
    review: { label: 'قيد المراجعة', enLabel: 'In Review', colorClass: 'review', icon: Clock },
    confirmed: { label: 'مؤكد', enLabel: 'Confirmed', colorClass: 'confirmed', icon: ShieldCheck },
    preparing: { label: 'قيد التجهيز', enLabel: 'Preparing', colorClass: 'preparing', icon: Package },
    ready_pickup: { label: 'جاهز للاستلام', enLabel: 'Ready for Pickup', colorClass: 'ready_pickup', icon: Store },
    out_delivery: { label: 'خرج للتوصيل', enLabel: 'Out for Delivery', colorClass: 'out_delivery', icon: Truck },
    completed: { label: 'مكتمل (تم البيع)', enLabel: 'Completed', colorClass: 'completed', icon: CheckCircle2 },
    cancelled: { label: 'ملغى', enLabel: 'Cancelled', colorClass: 'cancelled', icon: XCircle },
  };

  const getStatusLabel = (status: string) => {
    const meta = statusMeta[status];
    if (!meta) return status;
    return ar ? meta.label : meta.enLabel;
  };

  // Copy order number
  const handleCopy = (text: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(text);
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  // Print invoice helper
  const handlePrint = () => {
    window.print();
  };

  // Quick WhatsApp message generator
  const getWhatsAppUrl = (order: OrderRecord) => {
    const rawPhone = string(order.customerSnapshot?.phone).replace(/[^0-9]/g, '');
    if (!rawPhone) return '#';
    const custName = string(order.customerSnapshot?.name) || (ar ? 'العميل الكريم' : 'Customer');
    const msg = ar
      ? `السلام عليكم ورحمة الله، الأستاذ/ة ${custName}، معكم شركة الجيل العربي الرقمي بخصوص طلبكم رقم (${order.number}).`
      : `Hello ${custName}, this is Al-Jeel Al-Arabi regarding your order (${order.number}).`;
    return `https://wa.me/${rawPhone}?text=${encodeURIComponent(msg)}`;
  };

  // Filter items in current view
  const items = useMemo(() => {
    const listItems = query.data?.items ?? [];
    if (methodFilter === 'all') return listItems;
    return listItems.filter((o) => (o.fulfillment?.method || 'pickup') === methodFilter);
  }, [query.data?.items, methodFilter]);

  // Quick KPI calculation from loaded items
  const kpis = useMemo(() => {
    const all = query.data?.items ?? [];
    const newCount = all.filter((o) => o.status === 'new').length;
    const progressCount = all.filter((o) => ['review', 'confirmed', 'preparing', 'ready_pickup', 'out_delivery'].includes(o.status)).length;
    const completedCount = all.filter((o) => o.status === 'completed').length;
    const cancelledCount = all.filter((o) => o.status === 'cancelled').length;
    return {
      total: query.data?.total ?? 0,
      newCount,
      progressCount,
      completedCount,
      cancelledCount,
    };
  }, [query.data]);

  // Transition handler
  const handleStatusChange = async (nextStatus: string) => {
    if (!selected) return;
    setBusy(true);
    setActionError('');

    try {
      const result = await api<OrderRecord>(`/commerce/orders/${selected.id}/status`, {
        method: 'POST',
        body: {
          status: nextStatus,
          revision: selected.updatedAt,
        },
      });

      setSelected(result);
      setConfirmStatusModal(null);
      await client.invalidateQueries({ queryKey: ['orders'] });
      await client.invalidateQueries({ queryKey: ['inventory'] });
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.code === 'insufficient_stock') {
          setActionError(say('المخزون المتوفر غير كافٍ لإتمام البيع. يرجى مراجعة كمية القطع أو المخزون أولاً.', 'Insufficient inventory stock to complete this sale.'));
        } else if (err.code === 'content_changed') {
          setActionError(say('تم تعديل هذا الطلب من جهة أخرى، يرجى تحديث الصفحة.', 'Order was updated concurrently. Please refresh.'));
        } else {
          setActionError(say(`تعذر تحديث حالة الطلب: (${err.code})`, `Status change failed: (${err.code})`));
        }
      } else {
        setActionError(say('حدث خطأ أثناء حفظ الحالة.', 'Failed to update order status.'));
      }
    } finally {
      setBusy(false);
    }
  };

  // Delete Order
  const handleDeleteOrder = async (order: OrderRecord) => {
    setBusy(true);
    setActionError('');
    try {
      await api(`/commerce/orders/${order.id}`, { method: 'DELETE' });
      setDeleteConfirmOrder(null);
      if (selected?.id === order.id) setSelected(null);
      await client.invalidateQueries({ queryKey: ['orders'] });
    } catch {
      setActionError(say('تعذر حذف الطلب. لا يمكن حذف الطلبات المكتملة.', 'Cannot delete completed order.'));
    } finally {
      setBusy(false);
    }
  };

  // Available transitions based on current order and fulfillment
  const getAvailableTransitions = (order: OrderRecord): string[] => {
    const isPickup = (order.fulfillment?.method || 'pickup') === 'pickup';
    switch (order.status) {
      case 'new':
        return ['review', 'confirmed', 'cancelled'];
      case 'review':
        return ['new', 'confirmed', 'cancelled'];
      case 'confirmed':
        return ['review', 'preparing', 'cancelled'];
      case 'preparing':
        return ['confirmed', isPickup ? 'ready_pickup' : 'out_delivery', 'cancelled'];
      case 'ready_pickup':
      case 'out_delivery':
        return ['preparing', 'completed', 'cancelled'];
      case 'cancelled':
        return ['new', 'review'];
      case 'completed':
      default:
        return [];
    }
  };

  // Progress Stepper calculation
  const getStepProgressIndex = (status: string, _method: string = 'pickup') => {
    switch (status) {
      case 'new': return 0;
      case 'review': return 1;
      case 'confirmed': return 2;
      case 'preparing': return 3;
      case 'ready_pickup':
      case 'out_delivery': return 4;
      case 'completed': return 5;
      case 'cancelled': return -1;
      default: return 0;
    }
  };

  return (
    <div className="orders-manager">
      {/* Page Header */}
      <div className="page-heading">
        <div className="heading-content">
          <div className="title-row">
            <h1>{say('طلبات العملاء', 'Customer Orders')}</h1>
            {query.data && (
              <span className="count-pill">
                {query.data.total} {say('طلب مسجل', 'orders')}
              </span>
            )}
          </div>
          <p className="heading-sub">
            {say(
              'نظام إدارة وتدقيق ومتابعة طلبات الشراء، الاستلام من الفروع، والشحن، وإكمال مبيعات الفواتير بدقة.',
              'Track and process purchase orders, showroom pickups, deliveries, and finalized sales.'
            )}
          </p>
        </div>
        <div className="heading-actions">
          <button
            type="button"
            className="button secondary"
            onClick={() => query.refetch()}
            disabled={query.isFetching}
            title={say('تحديث البيانات', 'Refresh')}
          >
            <RefreshCw size={15} className={query.isFetching ? 'animate-spin' : ''} />
            <span>{say('تحديث', 'Refresh')}</span>
          </button>
        </div>
      </div>

      <ErrorBox code={actionError} />

      {/* KPI Overview Cards */}
      <div className="orders-kpi-grid">
        <div className="order-kpi-card">
          <div className="order-kpi-icon total">
            <ShoppingBag size={22} />
          </div>
          <div className="order-kpi-info">
            <span className="order-kpi-title">{say('إجمالي الطلبات', 'Total Orders')}</span>
            <span className="order-kpi-value">{kpis.total}</span>
          </div>
        </div>

        <div className="order-kpi-card">
          <div className="order-kpi-icon new">
            <Sparkles size={22} />
          </div>
          <div className="order-kpi-info">
            <span className="order-kpi-title">{say('طلبات جديدة', 'New Orders')}</span>
            <span className="order-kpi-value">{kpis.newCount}</span>
          </div>
        </div>

        <div className="order-kpi-card">
          <div className="order-kpi-icon progress">
            <Clock size={22} />
          </div>
          <div className="order-kpi-info">
            <span className="order-kpi-title">{say('قيد التجهيز والمراجعة', 'In Progress')}</span>
            <span className="order-kpi-value">{kpis.progressCount}</span>
          </div>
        </div>

        <div className="order-kpi-card">
          <div className="order-kpi-icon completed">
            <CheckCircle2 size={22} />
          </div>
          <div className="order-kpi-info">
            <span className="order-kpi-title">{say('طلبات مكتملة', 'Completed')}</span>
            <span className="order-kpi-value">{kpis.completedCount}</span>
          </div>
        </div>

        <div className="order-kpi-card">
          <div className="order-kpi-icon cancelled">
            <XCircle size={22} />
          </div>
          <div className="order-kpi-info">
            <span className="order-kpi-title">{say('طلبات ملغية', 'Cancelled')}</span>
            <span className="order-kpi-value">{kpis.cancelledCount}</span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="orders-filter-container">
        <div className="orders-filter-top">
          <div className="orders-search-box">
            <Search size={16} className="orders-search-icon" />
            <input
              type="text"
              className="orders-search-input"
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPage(1);
              }}
              placeholder={say('ابحث برقم الطلب (مثال: AR-1001)، اسم العميل، أو الهاتف…', 'Search by order # (e.g. AR-1001), customer name, or phone…')}
            />
            {q && (
              <button type="button" className="orders-search-clear" onClick={() => setQ('')}>
                <X size={14} />
              </button>
            )}
          </div>

          <select
            className="orders-filter-select"
            value={methodFilter}
            onChange={(e) => setMethodFilter(e.target.value as 'all' | 'pickup' | 'delivery')}
          >
            <option value="all">{say('جميع طرق الاستلام', 'All Fulfillment Methods')}</option>
            <option value="pickup">{say('🏬 استلام من المعرض', 'Showroom Pickup')}</option>
            <option value="delivery">{say('🚚 توصيل وشحن', 'Home Delivery')}</option>
          </select>
        </div>

        {/* Status Filter Tabs */}
        <div className="orders-tabs-scroll">
          <button
            type="button"
            className={`orders-tab-btn ${statusFilter === '' ? 'active' : ''}`}
            onClick={() => {
              setStatusFilter('');
              setPage(1);
            }}
          >
            <span>{say('الكل', 'All')}</span>
            <span className="orders-tab-count">{query.data?.total ?? 0}</span>
          </button>

          {OrderStatuses.map((st) => (
            <button
              key={st}
              type="button"
              className={`orders-tab-btn ${statusFilter === st ? 'active' : ''}`}
              onClick={() => {
                setStatusFilter(st);
                setPage(1);
              }}
            >
              <span>{getStatusLabel(st)}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Orders List / Table */}
      {query.isPending ? (
        <Loading />
      ) : query.isError ? (
        <ErrorBox code="failed" />
      ) : items.length === 0 ? (
        <div className="orders-empty-state">
          <div className="orders-empty-icon">
            <ShoppingBag size={28} />
          </div>
          <h3>{say('لا توجد طلبات مطابقة للبحث', 'No matching orders found')}</h3>
          <p style={{ color: 'var(--muted)', fontSize: 13, margin: 0 }}>
            {say('جرب تغيير معايير البحث أو اختيار حالة أخرى من الشريط أعلاه.', 'Try adjusting your search filters or status tab.')}
          </p>
        </div>
      ) : (
        <div className="orders-list-grid">
          {items.map((order) => {
            const isPickup = (order.fulfillment?.method || 'pickup') === 'pickup';
            const statusInfo = statusMeta[order.status] || {
              label: order.status,
              enLabel: order.status,
              colorClass: 'new',
              icon: Clock,
            };
            const StatusIcon = statusInfo.icon;
            const itemsCount = list(order.items).length;
            const totalQty = list(order.items).reduce((acc, item) => acc + (Number(item.quantity) || 1), 0);

            return (
              <div
                key={order.id}
                className={`order-row-card ${selected?.id === order.id ? 'selected' : ''}`}
                onClick={() => setSelected(order)}
              >
                {/* Order ID & Date */}
                <div className="order-id-block">
                  <div className="order-number-badge">
                    <span>{order.number}</span>
                    <button
                      type="button"
                      className="order-copy-inline"
                      onClick={(e) => handleCopy(order.number, e)}
                      title={say('نسخ رقم الطلب', 'Copy order number')}
                    >
                      {copiedId === order.number ? <Check size={13} color="#10b981" /> : <Copy size={13} />}
                    </button>
                  </div>
                  <div className="order-date-text">
                    <Calendar size={12} />
                    <span>{new Date(order.createdAt).toLocaleDateString(ar ? 'ar-YE' : 'en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </div>

                {/* Customer Information */}
                <div className="order-customer-block">
                  <span className="order-customer-name">
                    {string(order.customerSnapshot?.name) || say('عميل زائر', 'Guest customer')}
                  </span>
                  <span className="order-customer-phone" dir="ltr">
                    <Phone size={12} />
                    {string(order.customerSnapshot?.phone)}
                  </span>
                </div>

                {/* Fulfillment Badge & Items count */}
                <div className="order-fulfillment-block">
                  <span className={`order-badge-pill ${isPickup ? 'badge-pickup' : 'badge-delivery'}`}>
                    {isPickup ? <Store size={12} /> : <Truck size={12} />}
                    <span>{isPickup ? say('استلام من المعرض', 'Pickup') : say('توصيل للموقع', 'Delivery')}</span>
                  </span>
                  <span className="order-items-summary">
                    {itemsCount} {say('أصناف', 'items')} · {totalQty} {say('قطع', 'units')}
                  </span>
                </div>

                {/* Amount / Pricing */}
                <div className="order-amount-block">
                  <span className="order-amount-usd" dir="ltr">
                    {order.subtotalUsd ? `${order.subtotalUsd} USD` : '$0.00'}
                  </span>
                  {order.hasUnpriced && (
                    <span className="order-amount-unpriced">
                      {say('السعر يؤكد بالتواصل', 'Price on call')}
                    </span>
                  )}
                  {order.subtotalYer && (
                    <small style={{ color: 'var(--muted)', fontSize: 11 }} dir="ltr">
                      {order.subtotalYer} YER
                    </small>
                  )}
                </div>

                {/* Status Badge & Trigger */}
                <div className="order-status-block">
                  <span className={`status-tag ${statusInfo.colorClass}`}>
                    <StatusIcon size={13} />
                    <span>{ar ? statusInfo.label : statusInfo.enLabel}</span>
                  </span>
                  <button
                    type="button"
                    className="order-action-trigger"
                    title={say('عرض وتدقيق الطلب', 'View & Manage Order')}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelected(order);
                    }}
                  >
                    <Eye size={16} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {query.data && query.data.total > 24 && (
        <div className="toolbar" style={{ justifyContent: 'center', marginTop: 14 }}>
          <button
            className="button secondary sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            {say('الصفحة السابقة', 'Previous')}
          </button>
          <span style={{ fontSize: 13, fontWeight: 700, padding: '0 12px' }}>
            {page} / {Math.max(1, Math.ceil(query.data.total / 24))}
          </span>
          <button
            className="button secondary sm"
            disabled={page * 24 >= query.data.total}
            onClick={() => setPage((p) => p + 1)}
          >
            {say('الصفحة التالية', 'Next')}
          </button>
        </div>
      )}

      {/* Order Details Slide-Over Drawer */}
      {selected && (
        <div className="order-drawer-backdrop" onClick={() => setSelected(null)}>
          <div className="order-drawer-panel" onClick={(e) => e.stopPropagation()}>
            {/* Drawer Header */}
            <div className="drawer-header">
              <div className="drawer-header-left">
                <div className="drawer-order-title-row">
                  <h2 className="drawer-order-number" dir="ltr">{selected.number}</h2>
                  <button
                    type="button"
                    className="order-copy-inline"
                    onClick={() => handleCopy(selected.number)}
                    title={say('نسخ رقم الطلب', 'Copy order number')}
                  >
                    {copiedId === selected.number ? <Check size={15} color="#10b981" /> : <Copy size={15} />}
                  </button>
                  <span className={`status-tag ${statusMeta[selected.status]?.colorClass || 'new'}`}>
                    {getStatusLabel(selected.status)}
                  </span>
                </div>
                <span className="order-date-text">
                  <Calendar size={12} />
                  <span>
                    {new Date(selected.createdAt).toLocaleDateString(ar ? 'ar-YE' : 'en-US', {
                      weekday: 'short',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </span>
              </div>

              <div className="drawer-header-actions">
                <button
                  type="button"
                  className="button secondary sm"
                  onClick={handlePrint}
                  title={say('طباعة فاتورة / إشعار الطلب', 'Print invoice / order voucher')}
                >
                  <Printer size={15} />
                  <span>{say('طباعة', 'Print')}</span>
                </button>
                <button
                  type="button"
                  className="order-action-trigger"
                  onClick={() => setSelected(null)}
                  title={say('إغلاق', 'Close')}
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Drawer Body Scroll */}
            <div className="drawer-content-scroll">
              {/* Stepper Progress */}
              {selected.status !== 'cancelled' ? (
                <div className="order-stepper-card">
                  <div className="order-stepper-title">
                    <Clock size={14} />
                    <span>{say('مسار تنفيذ ودورة حياة الطلب', 'Order Lifecycle Progress')}</span>
                  </div>
                  <div className="order-stepper-steps">
                    <div className="order-stepper-track">
                      <div
                        className="order-stepper-track-fill"
                        style={{
                          width: `${Math.min(100, (getStepProgressIndex(selected.status) / 5) * 100)}%`,
                        }}
                      />
                    </div>

                    {[
                      { step: 0, label: say('جديد', 'New') },
                      { step: 1, label: say('مراجعة', 'Review') },
                      { step: 2, label: say('مؤكد', 'Confirmed') },
                      { step: 3, label: say('تجهيز', 'Preparing') },
                      {
                        step: 4,
                        label: (selected.fulfillment?.method || 'pickup') === 'pickup'
                          ? say('جاهز للاستلام', 'Ready')
                          : say('خرج للتوصيل', 'Delivery'),
                      },
                      { step: 5, label: say('مكتمل', 'Completed') },
                    ].map((st) => {
                      const currIdx = getStepProgressIndex(selected.status);
                      const isPast = currIdx > st.step;
                      const isCurrent = currIdx === st.step;
                      return (
                        <div
                          key={st.step}
                          className={`stepper-step ${isPast ? 'completed' : ''} ${isCurrent ? 'current' : ''}`}
                        >
                          <div className="stepper-circle">
                            {isPast ? <Check size={14} /> : st.step + 1}
                          </div>
                          <span className="stepper-label">{st.label}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="inventory-notice-banner" style={{ background: '#fef2f2', borderColor: '#fca5a5', color: '#991b1b' }}>
                  <XCircle size={18} />
                  <div>
                    <strong>{say('تم إلغاء هذا الطلب', 'This order is cancelled')}</strong>
                    <p style={{ margin: '4px 0 0', fontSize: 11.5 }}>
                      {say('يمكنك إعادة فتح الطلب وتحويله إلى مرحلة المراجعة في حال رغب العميل في المتابعة.', 'You can reopen this order back to Review stage if customer decides to proceed.')}
                    </p>
                  </div>
                </div>
              )}

              {/* Grid: Customer & Delivery */}
              <div className="drawer-details-grid">
                {/* Customer Card */}
                <div className="drawer-section-card">
                  <div className="drawer-section-head">
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <User size={14} />
                      {say('بيانات العميل والتواصل', 'Customer & Contact')}
                    </span>
                    {selected.customerSnapshot?.phoneVerified ? (
                      <span className="status-tag completed" style={{ fontSize: 10, padding: '2px 8px' }}>
                        {say('هاتف موثق', 'Verified')}
                      </span>
                    ) : (
                      <span className="status-tag review" style={{ fontSize: 10, padding: '2px 8px' }}>
                        {say('غير موثق', 'Unverified')}
                      </span>
                    )}
                  </div>

                  <div className="customer-info-row">
                    <strong style={{ fontSize: 14 }}>
                      {string(selected.customerSnapshot?.name) || say('بدون اسم', 'No name provided')}
                    </strong>
                  </div>

                  <div className="customer-info-row" dir="ltr" style={{ color: 'var(--muted)' }}>
                    <Phone size={13} />
                    <span>{string(selected.customerSnapshot?.phone) || say('لا يوجد هاتف', 'No phone')}</span>
                  </div>

                  <div className="customer-quick-actions">
                    {string(selected.customerSnapshot?.phone) && (
                      <>
                        <a
                          href={getWhatsAppUrl(selected)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="whatsapp-direct-btn"
                          title={say('محادثة واتساب سريعة مع رسالة جاهزة', 'Direct WhatsApp')}
                        >
                          <MessageCircle size={14} />
                          <span>{say('واتساب العميل', 'WhatsApp')}</span>
                        </a>

                        <a
                          href={`tel:${string(selected.customerSnapshot?.phone)}`}
                          className="phone-call-btn"
                          title={say('اتصال هاتفي', 'Call')}
                        >
                          <Phone size={13} />
                          <span>{say('اتصال', 'Call')}</span>
                        </a>
                      </>
                    )}
                  </div>
                </div>

                {/* Fulfillment Card */}
                <div className="drawer-section-card">
                  <div className="drawer-section-head">
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <MapPin size={14} />
                      {say('طريقة الاستلام والعنوان', 'Fulfillment & Address')}
                    </span>
                    <span className={`order-badge-pill ${(selected.fulfillment?.method || 'pickup') === 'pickup' ? 'badge-pickup' : 'badge-delivery'}`}>
                      {(selected.fulfillment?.method || 'pickup') === 'pickup' ? say('استلام من المعرض', 'Pickup') : say('توصيل للموقع', 'Delivery')}
                    </span>
                  </div>

                  <div>
                    <span style={{ fontSize: 11, color: 'var(--muted)' }}>{say('العنوان والتوصيل:', 'Delivery Address:')}</span>
                    <p style={{ margin: '4px 0 0', fontSize: 13, fontWeight: 600 }}>
                      {selected.fulfillment?.address?.trim()
                        ? selected.fulfillment.address
                        : (selected.fulfillment?.method || 'pickup') === 'pickup'
                        ? say('المعرض الرئيسي: صنعاء — شارع حدة / الدائري', 'Main Showroom: Sana\'a')
                        : say('لم يتم تحديد عنوان توصيل تفصيلي', 'No delivery address specified')}
                    </p>
                  </div>

                  {selected.fulfillment?.notes && (
                    <div style={{ marginTop: 6, padding: '8px 10px', background: 'var(--surface-soft)', borderRadius: 8 }}>
                      <span style={{ fontSize: 11, color: 'var(--muted)' }}>{say('ملاحظات العميل:', 'Customer notes:')}</span>
                      <p style={{ margin: '2px 0 0', fontSize: 12, fontStyle: 'italic' }}>
                        {selected.fulfillment.notes}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Inventory Notice Banner */}
              <div className="inventory-notice-banner">
                <AlertTriangle size={18} style={{ flexShrink: 0, marginTop: 2 }} />
                <div>
                  <strong>{say('سياسة حماية المخزون النشطة:', 'Active Stock Protection Policy:')}</strong>
                  <p style={{ margin: '3px 0 0' }}>
                    {say(
                      'لا يُخصم المخزون من المستودع إلا عند اعتماد مرحلة (إكمال البيع). هذا يحمي الرصيد أثناء المراجعة والتجهيز من الحجز العشوائي.',
                      'Stock units are deducted only upon final "Sale Completed" confirmation to protect inventory during quotes & processing.'
                    )}
                  </p>
                </div>
              </div>

              {/* Order Items List */}
              <div className="order-items-box">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <h3 style={{ fontSize: 14, fontWeight: 800, margin: 0 }}>
                    {say('الأصناف والمنتجات المحجوزة في الطلب', 'Reserved Order Items')}
                  </h3>
                  <span style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600 }}>
                    {list(selected.items).length} {say('منتج', 'products')}
                  </span>
                </div>

                {list(selected.items).map((rawItem, idx) => {
                  const item = rawItem as unknown as OrderItem;
                  const title = localized(item.title, lang) || string(item.title);
                  const img = Array.isArray(item.images) && item.images[0] ? String(item.images[0]) : null;
                  return (
                    <div key={idx} className="order-item-card">
                      {img ? (
                        <img src={img} alt={title} className="order-item-img" />
                      ) : (
                        <div className="order-item-img" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)' }}>
                          <Package size={22} />
                        </div>
                      )}

                      <div className="order-item-details">
                        <span className="order-item-title">{title}</span>
                        <div className="order-item-meta">
                          <span>SKU: {string(item.sku)}</span>
                          {item.unitId && <span>{say('قطعة:', 'Unit:')} {string(item.unitId)}</span>}
                          {item.condition && (
                            <span style={{ textTransform: 'capitalize' }}>
                              {say('الحالة:', 'Condition:')} {string(item.condition)}
                            </span>
                          )}
                          {item.warrantyMonths ? (
                            <span>{say(`ضمان ${item.warrantyMonths} شهر`, `${item.warrantyMonths}m warranty`)}</span>
                          ) : null}
                        </div>
                      </div>

                      <div className="order-item-pricing">
                        <span className="order-item-qty">× {string(item.quantity || 1)}</span>
                        <span className="order-item-price" dir="ltr">
                          {item.linePriceUsd ? `${item.linePriceUsd} USD` : say('السعر يؤكد بالتواصل', 'Price on call')}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Financial Breakdown */}
              <div className="order-financial-card">
                <div className="financial-row">
                  <span>{say('المجموع الفرعي بالدولار:', 'Subtotal USD:')}</span>
                  <strong dir="ltr">{selected.subtotalUsd ? `${selected.subtotalUsd} USD` : '$0.00'}</strong>
                </div>

                {selected.usdToYer && (
                  <div className="financial-row">
                    <span>{say('سعر الصرف المعتمد:', 'Exchange Rate applied:')}</span>
                    <span dir="ltr">1 USD = {selected.usdToYer} YER</span>
                  </div>
                )}

                {selected.subtotalYer && (
                  <div className="financial-row">
                    <span>{say('المجموع المقدر بالريال اليمني:', 'Subtotal YER:')}</span>
                    <strong dir="ltr">{selected.subtotalYer} YER</strong>
                  </div>
                )}

                {selected.hasUnpriced && (
                  <div style={{ fontSize: 11.5, color: '#d97706', fontWeight: 600 }}>
                    {say('* يحتوي الطلب على أصناف بدون سعر نهائي، يتطلب تأكيد السعر هاتفياً مع العميل.', '* Contains unpriced items requiring phone confirmation.')}
                  </div>
                )}

                <div className="financial-row total-row">
                  <span>{say('الإجمالي النهائي المطلوب:', 'Final Order Total:')}</span>
                  <span dir="ltr" style={{ color: '#322f83', fontSize: 18 }}>
                    {selected.subtotalUsd ? `${selected.subtotalUsd} USD` : say('يؤكد بالتواصل', 'On Contact')}
                  </span>
                </div>
              </div>
            </div>

            {/* Drawer Actions Footer */}
            <div className="drawer-footer-actions">
              <div className="status-transitions-group">
                {getAvailableTransitions(selected).map((nextSt) => {
                  const meta = statusMeta[nextSt] || { label: nextSt, enLabel: nextSt, colorClass: 'new', icon: ArrowRight };
                  const BtnIcon = meta.icon;
                  const isComplete = nextSt === 'completed';
                  const isCancel = nextSt === 'cancelled';

                  return (
                    <button
                      key={nextSt}
                      type="button"
                      disabled={busy}
                      className={`action-status-btn ${isComplete ? 'complete' : isCancel ? 'danger' : 'primary'}`}
                      onClick={() => {
                        if (isComplete || isCancel) {
                          setConfirmStatusModal({
                            status: nextSt,
                            label: ar ? meta.label : meta.enLabel,
                          });
                        } else {
                          handleStatusChange(nextSt);
                        }
                      }}
                    >
                      <BtnIcon size={14} />
                      <span>{ar ? meta.label : meta.enLabel}</span>
                    </button>
                  );
                })}
              </div>

              {/* Delete Order button for test / cancelled orders */}
              {selected.status !== 'completed' && (
                <button
                  type="button"
                  className="button secondary sm"
                  style={{ color: '#dc2626', borderColor: '#fca5a5' }}
                  onClick={() => setDeleteConfirmOrder(selected)}
                  disabled={busy}
                  title={say('حذف الطلب نهائياً', 'Delete order')}
                >
                  <Trash2 size={14} />
                  <span>{say('حذف', 'Delete')}</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Completing or Cancelling Sale */}
      {confirmStatusModal && (
        <Modal
          open={Boolean(confirmStatusModal)}
          onOpenChange={(open) => !open && setConfirmStatusModal(null)}
          title={
            confirmStatusModal.status === 'completed'
              ? say('تأكيد إكمال البيع وخصم المخزون', 'Confirm Sale & Stock Deduction')
              : say('تأكيد إلغاء الطلب', 'Confirm Order Cancellation')
          }
          description={
            confirmStatusModal.status === 'completed'
              ? say(
                  'عند إكمال البيع، سيتم خصم الكميات أو القطع المحجوزة رسمياً من رصيد المستودع، وتسجيل حركة البيع والضمان. هل تريد المتابعة؟',
                  'Completing the sale will permanently deduct inventory units/quantities and record warranty registrations. Proceed?'
                )
              : say(
                  'هل أنت متأكد من رغبتك في إلغاء هذا الطلب؟ يمكنك إعادة فتحه لاحقاً إن رغب العميل.',
                  'Are you sure you want to cancel this order? You can reopen it later if needed.'
                )
          }
        >
          <div style={{ display: 'flex', gap: 14, alignItems: 'center', marginBottom: 20 }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                background: confirmStatusModal.status === 'completed' ? '#dcfce7' : '#fee2e2',
                color: confirmStatusModal.status === 'completed' ? '#059669' : '#dc2626',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              {confirmStatusModal.status === 'completed' ? <CheckCircle2 size={24} /> : <AlertTriangle size={24} />}
            </div>
            <div>
              <p style={{ margin: 0, fontWeight: 700, fontSize: 14 }}>
                {say('الطلب رقم:', 'Order:')} <span dir="ltr">{selected?.number}</span>
              </p>
              <span style={{ fontSize: 12, color: 'var(--muted)' }}>
                {say('العميل:', 'Customer:')} {string(selected?.customerSnapshot?.name)}
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button
              type="button"
              className="button secondary"
              onClick={() => setConfirmStatusModal(null)}
              disabled={busy}
            >
              {say('تراجع', 'Back')}
            </button>
            <button
              type="button"
              className={`button ${confirmStatusModal.status === 'completed' ? 'primary' : 'danger'}`}
              disabled={busy}
              onClick={() => handleStatusChange(confirmStatusModal.status)}
            >
              {busy ? say('جارٍ الحفظ…', 'Saving…') : say('تأكيد الإجراء', 'Confirm Action')}
            </button>
          </div>
        </Modal>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmOrder && (
        <Modal
          open={Boolean(deleteConfirmOrder)}
          onOpenChange={(open) => !open && setDeleteConfirmOrder(null)}
          title={say('حذف الطلب نهائياً', 'Delete Order Permanently')}
          description={say(
            'هل أنت متأكد من حذف هذا الطلب نهائياً؟ هذا الإجراء لا يمكن التراجع عنه.',
            'Are you sure you want to delete this order permanently? This action cannot be undone.'
          )}
        >
          <div style={{ display: 'flex', gap: 14, alignItems: 'center', marginBottom: 20 }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                background: '#fee2e2',
                color: '#dc2626',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Trash2 size={24} />
            </div>
            <div>
              <p style={{ margin: 0, fontWeight: 700 }}>
                <span dir="ltr">{deleteConfirmOrder.number}</span>
              </p>
              <span style={{ fontSize: 12, color: 'var(--muted)' }}>
                {string(deleteConfirmOrder.customerSnapshot?.name)} · {string(deleteConfirmOrder.customerSnapshot?.phone)}
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button
              type="button"
              className="button secondary"
              onClick={() => setDeleteConfirmOrder(null)}
              disabled={busy}
            >
              {say('إلغاء', 'Cancel')}
            </button>
            <button
              type="button"
              className="button danger"
              disabled={busy}
              onClick={() => handleDeleteOrder(deleteConfirmOrder)}
            >
              {busy ? say('جارٍ الحذف…', 'Deleting…') : say('تأكيد الحذف', 'Confirm Delete')}
            </button>
          </div>
        </Modal>
      )}

      {/* Printable Invoice Container (Visible only when printing) */}
      {selected && (
        <div id="printable-order-invoice" style={{ display: 'none' }}>
          <div style={{ textAlign: 'center', borderBottom: '2px solid #322f83', paddingBottom: 15, marginBottom: 20 }}>
            <h1 style={{ margin: 0, fontSize: 24, color: '#322f83' }}>شركة الجيل العربي الرقمي</h1>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: '#555' }}>
              فاتورة وأمر تجهيز طلب شراء · Al-Jeel Al-Arabi Purchase Order
            </p>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20, fontSize: 13 }}>
            <div>
              <p style={{ margin: '2px 0' }}><strong>رقم الطلب:</strong> <span dir="ltr">{selected.number}</span></p>
              <p style={{ margin: '2px 0' }}><strong>تاريخ الطلب:</strong> {new Date(selected.createdAt).toLocaleDateString('ar-YE')}</p>
              <p style={{ margin: '2px 0' }}><strong>حالة الطلب:</strong> {getStatusLabel(selected.status)}</p>
            </div>
            <div>
              <p style={{ margin: '2px 0' }}><strong>اسم العميل:</strong> {string(selected.customerSnapshot?.name)}</p>
              <p style={{ margin: '2px 0' }}><strong>رقم الهاتف:</strong> <span dir="ltr">{string(selected.customerSnapshot?.phone)}</span></p>
              <p style={{ margin: '2px 0' }}><strong>طريقة الاستلام:</strong> {(selected.fulfillment?.method || 'pickup') === 'pickup' ? 'استلام من المعرض' : 'توصيل للموقع'}</p>
            </div>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 20, fontSize: 12 }}>
            <thead>
              <tr style={{ background: '#f3f4f6', borderBottom: '1px solid #ddd' }}>
                <th style={{ padding: 8, textAlign: 'right' }}>#</th>
                <th style={{ padding: 8, textAlign: 'right' }}>الصنف</th>
                <th style={{ padding: 8, textAlign: 'center' }}>الكمية</th>
                <th style={{ padding: 8, textAlign: 'left' }}>السعر</th>
              </tr>
            </thead>
            <tbody>
              {list(selected.items).map((item, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: 8 }}>{idx + 1}</td>
                  <td style={{ padding: 8 }}>
                    <strong>{localized(item.title, 'ar') || string(item.title)}</strong>
                    <div style={{ fontSize: 10, color: '#666' }}>SKU: {string(item.sku)}</div>
                  </td>
                  <td style={{ padding: 8, textAlign: 'center' }}>{string(item.quantity || 1)}</td>
                  <td style={{ padding: 8, textAlign: 'left' }} dir="ltr">
                    {item.linePriceUsd ? `${item.linePriceUsd} USD` : 'يؤكد بالتواصل'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 30, fontSize: 14 }}>
            <div style={{ width: 250, borderTop: '2px solid #322f83', paddingTop: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span>المجموع بالدولار:</span>
                <strong dir="ltr">{selected.subtotalUsd} USD</strong>
              </div>
              {selected.subtotalYer && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>المجموع بالريال:</span>
                  <strong dir="ltr">{selected.subtotalYer} YER</strong>
                </div>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 50, fontSize: 12, borderTop: '1px dashed #ccc', paddingTop: 20 }}>
            <div style={{ textAlign: 'center', width: 200 }}>
              <p>توقيع وختم الإدارة</p>
              <div style={{ height: 40 }} />
              <p>___________________</p>
            </div>
            <div style={{ textAlign: 'center', width: 200 }}>
              <p>توقيع المستلم</p>
              <div style={{ height: 40 }} />
              <p>___________________</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
export default OrdersManager;
