import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  TrendingUp, Users, Eye, MessageCircle, UserPlus, Smartphone,
  Monitor, Tablet, Globe, Clock, Flame, Snowflake, AlertTriangle,
  RefreshCw, Activity, BarChart3, Search, ArrowUpRight, ArrowDownRight,
  Radio, ShoppingBag, Calendar, Download, Printer, ChevronDown,
  DollarSign, CheckCircle2, PackageCheck, Filter, X, MapPin,
  ChevronLeft, ChevronRight, Layers, Cpu
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { api } from './api';
import { useI18n } from './i18n';
import { useSession } from './App';
import { can } from '@aljeel/shared';
import { exportAnalyticsToExcel, type AnalyticsExportData } from './analytics-export';
import { VisitorJourneyModal } from './VisitorJourneyModal';
import './analytics.css';

// ─── Types ───────────────────────────────────────────────────────────────────

export type DatePeriod = 'today' | 'yesterday' | '7d' | '30d' | 'month' | 'last_month' | 'custom';

export interface DateRangeState {
  period: DatePeriod;
  from: string;
  to: string;
}

interface AnalyticsOverview {
  today: {
    pageViews: number;
    uniqueVisitors: number;
    productViews: number;
    whatsappClicks: number;
    newCustomers: number;
    newOrders: number;
    newLeads: number;
    pageViewGrowth: number | null;
    visitorGrowth: number | null;
    orderGrowth?: number | null;
    whatsappGrowth?: number | null;
  };
  current?: {
    pageViews: number;
    uniqueVisitors: number;
    productViews: number;
    whatsappClicks: number;
    newCustomers: number;
    newOrders: number;
    newLeads: number;
    pageViewGrowth: number | null;
    visitorGrowth: number | null;
    orderGrowth?: number | null;
    whatsappGrowth?: number | null;
  };
  trend: {
    views7d: { day: string; views: number }[];
    visitors7d: { day: string; visitors: number }[];
    topHours: { hour: number; count: number }[];
    timeSlots?: {
      id: string;
      labelAr: string;
      labelEn: string;
      count: number;
      percent: number;
    }[];
    peakSlot?: {
      id: string;
      labelAr: string;
      labelEn: string;
      count: number;
      percent: number;
    };
  };
  dateRange?: {
    from: string;
    to: string;
    period: string;
  };
}

interface AnalyticsSales {
  summary: {
    totalRevenueUsd: number;
    totalRevenueYer: number;
    totalDiscountUsd: number;
    totalOrders: number;
    completedOrders: number;
    processingOrders: number;
    newOrders: number;
    cancelledOrders: number;
    averageOrderValueUsd: number;
    revenueGrowth: number | null;
    orderGrowth: number | null;
  };
  statusCounts: Record<string, number>;
  topSoldProducts: {
    productId: string;
    title: unknown;
    quantity: number;
    revenueUsd: number;
  }[];
  funnel: {
    visitors: number;
    productViews: number;
    inquiriesAndCarts: number;
    ordersPlaced: number;
    ordersCompleted: number;
    visitorToInquiryRate: number;
    inquiryToOrderRate: number;
    orderCompletionRate: number;
  };
  dateRange?: {
    from: string;
    to: string;
    period: string;
  };
}

interface AnalyticsProducts {
  topViewed: {
    productId: string;
    title: Record<string, string> | string;
    model: string;
    category: string;
    image: string | null;
    views: number;
    whatsappClicks: number;
    conversionRate: number;
    lastSeen: string;
  }[];
  topByClicks: { productId: string; clicks: number; product: null | { title: Record<string, string> | string; model: string } }[];
  cold: { productId: string; title: Record<string, string> | string; model: string; category: string; views: number; daysSinceView: number }[];
  topSearches: { query: string; count: number }[];
  dateRange?: {
    from: string;
    to: string;
    period: string;
  };
}

interface AnalyticsSources {
  sources: { source: string; visitors: number; percent: number }[];
  devices: { mobile: number; tablet: number; desktop: number };
  langs: { ar: number; en: number };
  topCategories: { category: string; views: number }[];
  dateRange?: {
    from: string;
    to: string;
    period: string;
  };
}

interface LiveData {
  activeNow: number;
  isMe?: boolean;
  hotPages: { path: string; count: number }[];
  recentEvents: {
    type: string;
    path: string;
    productId: string | null;
    productTitle: unknown;
    productModel: string | null;
    deviceClass: string;
    lang: string;
    createdAt: string;
  }[];
}

export interface AnalyticsLocations {
  countries: { country: string; countryCode: string; flag: string; visitors: number; percent: number }[];
  cities: { city: string; country: string; visitors: number; percent: number }[];
  totalVisitors: number;
  dateRange?: { from: string; to: string; period: string };
}

export interface AnalyticsDevices {
  totalDevices: number;
  classes: { mobile: number; tablet: number; desktop: number };
  classesPercent: { mobile: number; tablet: number; desktop: number };
  osList: { name: string; count: number; percent: number }[];
  browsersList: { name: string; count: number; percent: number }[];
  brandsList: { name: string; count: number; percent: number }[];
  screensList: { resolution: string; count: number }[];
  dateRange?: { from: string; to: string; period: string };
}

export interface AnalyticsVisitorItem {
  index: number;
  visitorHash: string;
  tag: string;
  totalEvents: number;
  sessionsCount: number;
  pageViewsCount: number;
  productViewsCount: number;
  distinctProductsCount: number;
  whatsappClicksCount: number;
  firstSeen: string;
  lastSeen: string;
  location: { country: string; city: string; flag: string };
  device: {
    deviceClass: 'mobile' | 'tablet' | 'desktop';
    os: string;
    browser: string;
    brand: string;
  };
  topProducts: { productId: string; title: unknown; image: string | null }[];
}

export interface AnalyticsVisitorsResponse {
  visitors: AnalyticsVisitorItem[];
  pagination: { total: number; page: number; pageSize: number; totalPages: number };
  dateRange?: { from: string; to: string; period: string };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getLocalizedTitle(title: unknown, lang: string, fallback = ''): string {
  if (!title) return fallback;
  if (typeof title === 'string') return title;
  if (typeof title === 'object') {
    const map = title as Record<string, string>;
    return map[lang] || map['ar'] || map['en'] || fallback;
  }
  return fallback;
}

function buildQueryString(dateRange: DateRangeState): string {
  const params = new URLSearchParams();
  params.set('period', dateRange.period);
  if (dateRange.period === 'custom' && dateRange.from) {
    params.set('from', dateRange.from);
    if (dateRange.to) params.set('to', dateRange.to);
  }
  return `?${params.toString()}`;
}

// ─── Sparkline Component ─────────────────────────────────────────────────────

function Sparkline({
  data,
  color = '#322f83',
  id = 'spk',
  height = 44,
}: {
  data: number[];
  color?: string;
  id?: string;
  height?: number;
}) {
  if (!data || data.length === 0) return null;
  const max = Math.max(...data, 1);
  const min = Math.min(...data);
  const range = max - min || 1;
  const W = 220;
  const H = height;
  const pad = 4;

  const pts = data.map((v, i) => {
    const x = pad + (i / Math.max(data.length - 1, 1)) * (W - pad * 2);
    const y = H - pad - ((v - min) / range) * (H - pad * 2);
    return { x, y };
  });

  const polyPts = pts.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`);
  const fillPoints = [
    ...polyPts,
    `${(W - pad).toFixed(1)},${H}`,
    `${pad.toFixed(1)},${H}`,
  ].join(' ');

  const gradId = `sparkline-grad-${id}`;
  const lastPoint = pts[pts.length - 1];

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="analytics-card-sparkline"
      style={{ width: '100%', height, display: 'block', overflow: 'visible' }}
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.25} />
          <stop offset="100%" stopColor={color} stopOpacity={0.02} />
        </linearGradient>
      </defs>
      <polygon points={fillPoints} fill={`url(#${gradId})`} />
      <polyline
        points={polyPts.join(' ')}
        fill="none"
        stroke={color}
        strokeWidth="2.2"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {lastPoint && (
        <circle cx={lastPoint.x} cy={lastPoint.y} r="3" fill={color} />
      )}
    </svg>
  );
}

// ─── Touch-Friendly Peak Hours Component ─────────────────────────────────────

function HourBars({
  data,
  timeSlots,
  peakSlot,
  ar,
}: {
  data: { hour: number; count: number }[];
  timeSlots?: AnalyticsOverview['trend']['timeSlots'];
  peakSlot?: AnalyticsOverview['trend']['peakSlot'];
  ar: boolean;
}) {
  const [selectedHour, setSelectedHour] = useState<number | null>(null);

  const max = Math.max(...data.map(d => d.count), 1);
  const all = useMemo(() => {
    return Array.from({ length: 24 }, (_, i) => {
      const found = data.find(d => d.hour === i);
      return { hour: i, count: found?.count ?? 0 };
    });
  }, [data]);

  const peak = useMemo(() => {
    return all.reduce((acc, curr) => (curr.count > acc.count ? curr : acc), { hour: 0, count: 0 });
  }, [all]);

  const formatHour = (h: number) => {
    if (ar) {
      if (h === 0) return '12:00 ص';
      if (h === 12) return '12:00 ظ';
      return h < 12 ? `${h}:00 ص` : `${h - 12}:00 م`;
    }
    if (h === 0) return '12 AM';
    if (h === 12) return '12 PM';
    return h < 12 ? `${h} AM` : `${h - 12} PM`;
  };

  const activeHourInfo = selectedHour !== null ? all.find(h => h.hour === selectedHour) : null;

  return (
    <div className="analytics-hours-container">
      {/* Time Slots Summary (Mobile-First Dayparts) */}
      {timeSlots && timeSlots.length > 0 && (
        <div className="analytics-time-slots-grid">
          {timeSlots.map(slot => {
            const isTop = peakSlot?.id === slot.id && slot.count > 0;
            return (
              <div
                key={slot.id}
                className={`analytics-time-slot-pill ${isTop ? 'peak' : ''}`}
              >
                <div className="analytics-time-slot-name">
                  {isTop && <Flame size={12} className="text-amber-500" />}
                  <span>{ar ? slot.labelAr : slot.labelEn}</span>
                </div>
                <div className="analytics-time-slot-data">
                  <strong>{slot.count.toLocaleString()}</strong>
                  <span className="muted">({slot.percent}%)</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 24-Hour Interactive Bar Graph */}
      <div className="analytics-hours-graph-box">
        <div className="analytics-hours-bars">
          {all.map(d => {
            const isPeak = d.hour === peak.hour && d.count > 0;
            const isSelected = selectedHour === d.hour;
            const pct = Math.max(8, (d.count / max) * 100);

            return (
              <button
                type="button"
                key={d.hour}
                className={`analytics-hour-col ${isSelected ? 'selected' : ''}`}
                onClick={() => setSelectedHour(selectedHour === d.hour ? null : d.hour)}
                title={`${formatHour(d.hour)} — ${d.count} ${ar ? 'زيارة' : 'views'}`}
                aria-label={formatHour(d.hour)}
              >
                <div
                  className="analytics-hour-bar"
                  style={{
                    height: `${pct}%`,
                    background: isSelected ? '#7c3aed' : isPeak ? '#f59e0b' : d.count > 0 ? '#322f83' : 'var(--border)',
                    opacity: isSelected ? 1 : isPeak ? 1 : d.count > 0 ? 0.45 + 0.55 * (d.count / max) : 0.5,
                  }}
                />
              </button>
            );
          })}
        </div>

        <div className="analytics-hour-labels">
          <span>{ar ? '12ص' : '12A'}</span>
          <span>{ar ? '6ص' : '6A'}</span>
          <span>{ar ? '12ظ' : '12P'}</span>
          <span>{ar ? '6م' : '6P'}</span>
          <span>{ar ? '11م' : '11P'}</span>
        </div>
      </div>

      {/* Touch Details Drawer / Tooltip for Active Hour on Mobile */}
      {activeHourInfo && (
        <div className="analytics-hour-selected-card">
          <Clock size={14} />
          <span>
            {ar ? 'الساعة' : 'Hour'} <strong>{formatHour(activeHourInfo.hour)}</strong>:
          </span>
          <span className="badge-highlight">
            {activeHourInfo.count.toLocaleString()} {ar ? 'زيارة' : 'views'}
          </span>
          <button
            type="button"
            className="analytics-hour-clear-btn"
            onClick={() => setSelectedHour(null)}
          >
            <X size={13} />
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Stat Card Component ─────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  sub,
  growth,
  icon: Icon,
  accent = 'primary',
  sparkData,
  sparkId,
}: {
  label: string;
  value: number | string;
  sub?: string;
  growth?: number | null;
  icon: typeof Eye;
  accent?: 'primary' | 'amber' | 'green' | 'violet' | 'rose';
  sparkData?: number[];
  sparkId?: string;
}) {
  const colorMap: Record<string, string> = {
    primary: '#322f83',
    amber: '#f2a93b',
    green: '#24865f',
    violet: '#7c3aed',
    rose: '#be185d',
  };
  const c = colorMap[accent];

  const hasGrowth = growth !== null && growth !== undefined;
  const isPos = hasGrowth && growth! >= 0;

  return (
    <div className="analytics-card">
      <div className="analytics-card-header">
        <span className="analytics-card-title">{label}</span>
        <span className="analytics-card-icon-wrap" style={{ background: `${c}15`, color: c }}>
          <Icon size={18} />
        </span>
      </div>

      <div className="analytics-card-val-row">
        <strong className="analytics-card-big-num">
          {typeof value === 'number' ? value.toLocaleString('ar-YE') : value}
        </strong>
        {hasGrowth && (
          <span className={`analytics-growth-badge ${isPos ? 'positive' : 'negative'}`}>
            {isPos ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
            {Math.abs(growth!)}%
          </span>
        )}
      </div>

      {sparkData && sparkData.length > 1 && (
        <Sparkline data={sparkData} color={c} id={sparkId || accent} />
      )}

      {sub && <span className="analytics-card-sub">{sub}</span>}
    </div>
  );
}

// ─── Date Range Selector Component (Custom From Date -> To Date) ─────────────

function DateRangeSelector({
  dateRange,
  onChange,
  ar,
}: {
  dateRange: DateRangeState;
  onChange: (newRange: DateRangeState) => void;
  ar: boolean;
}) {
  const [isOpen, setIsOpen] = useState(dateRange.period === 'custom');
  const [fromInput, setFromInput] = useState(dateRange.from || new Date().toISOString().slice(0, 10));
  const [toInput, setToInput] = useState(dateRange.to || new Date().toISOString().slice(0, 10));

  const periods: { id: DatePeriod; labelAr: string; labelEn: string }[] = [
    { id: 'today', labelAr: 'اليوم', labelEn: 'Today' },
    { id: 'yesterday', labelAr: 'الأمس', labelEn: 'Yesterday' },
    { id: '7d', labelAr: 'آخر 7 أيام', labelEn: 'Last 7 Days' },
    { id: '30d', labelAr: 'آخر 30 يوماً', labelEn: 'Last 30 Days' },
    { id: 'month', labelAr: 'هذا الشهر', labelEn: 'This Month' },
    { id: 'last_month', labelAr: 'الشهر الماضي', labelEn: 'Last Month' },
    { id: 'custom', labelAr: 'من تاريخ إلى تاريخ', labelEn: 'Custom Date Range' },
  ];

  const handleSelectPeriod = (p: DatePeriod) => {
    if (p === 'custom') {
      setIsOpen(true);
      onChange({ period: 'custom', from: fromInput, to: toInput });
    } else {
      setIsOpen(false);
      onChange({ period: p, from: '', to: '' });
    }
  };

  const handleApplyCustom = (e: React.FormEvent) => {
    e.preventDefault();
    if (fromInput) {
      onChange({
        period: 'custom',
        from: fromInput,
        to: toInput || fromInput,
      });
    }
  };

  return (
    <div className="analytics-date-range-box">
      <div className="analytics-date-presets-scroll">
        {periods.map(p => (
          <button
            key={p.id}
            type="button"
            className={`analytics-date-pill ${dateRange.period === p.id ? 'active' : ''}`}
            onClick={() => handleSelectPeriod(p.id)}
          >
            {p.id === 'custom' && <Calendar size={13} />}
            <span>{ar ? p.labelAr : p.labelEn}</span>
          </button>
        ))}
      </div>

      {/* Custom Date Range Collapsible Input Panel */}
      {isOpen && (
        <form onSubmit={handleApplyCustom} className="analytics-custom-date-panel">
          <div className="analytics-custom-date-fields">
            <div className="analytics-date-field">
              <label htmlFor="analytics-from-date">
                <Calendar size={13} />
                <span>{ar ? 'من تاريخ:' : 'From:'}</span>
              </label>
              <input
                id="analytics-from-date"
                type="date"
                value={fromInput}
                onChange={e => setFromInput(e.target.value)}
                required
                max={toInput || undefined}
              />
            </div>

            <div className="analytics-date-field">
              <label htmlFor="analytics-to-date">
                <Calendar size={13} />
                <span>{ar ? 'إلى تاريخ:' : 'To:'}</span>
              </label>
              <input
                id="analytics-to-date"
                type="date"
                value={toInput}
                onChange={e => setToInput(e.target.value)}
                required
                min={fromInput || undefined}
              />
            </div>

            <button type="submit" className="analytics-apply-btn">
              <Filter size={14} />
              <span>{ar ? 'تطبيق التصفية' : 'Apply Filter'}</span>
            </button>
          </div>

          {dateRange.period === 'custom' && dateRange.from && (
            <div className="analytics-custom-active-tag">
              <span>
                {ar
                  ? `التقرير الحالي: من ${dateRange.from} إلى ${dateRange.to || dateRange.from}`
                  : `Active Range: ${dateRange.from} to ${dateRange.to || dateRange.from}`}
              </span>
            </div>
          )}
        </form>
      )}
    </div>
  );
}

// ─── Device Breakdown ────────────────────────────────────────────────────────

function DeviceBreakdown({
  devices,
  ar,
}: {
  devices: { mobile: number; tablet: number; desktop: number };
  ar: boolean;
}) {
  const total = devices.mobile + devices.tablet + devices.desktop;
  if (!total) {
    return (
      <div style={{ fontSize: 13, color: 'var(--muted)', padding: '8px 0' }}>
        {ar ? 'لا تتوفر بيانات أجهزة بعد' : 'No device data yet'}
      </div>
    );
  }

  const mPct = Math.round((devices.mobile / total) * 100);
  const tPct = Math.round((devices.tablet / total) * 100);
  const dPct = 100 - mPct - tPct;

  return (
    <div className="analytics-device-bar-wrap">
      <div className="analytics-device-multibar">
        {mPct > 0 && <div style={{ width: `${mPct}%`, background: '#322f83' }} title={`موبايل ${mPct}%`} />}
        {tPct > 0 && <div style={{ width: `${tPct}%`, background: '#7c3aed' }} title={`لوحي ${tPct}%`} />}
        {dPct > 0 && <div style={{ width: `${dPct}%`, background: '#24865f' }} title={`كمبيوتر ${dPct}%`} />}
      </div>

      <div className="analytics-device-legend">
        <div className="analytics-device-legend-item">
          <Smartphone size={13} />
          <span>{ar ? 'موبايل' : 'Mobile'}</span>
          <strong>{mPct}%</strong>
        </div>
        <div className="analytics-device-legend-item">
          <Tablet size={13} />
          <span>{ar ? 'لوحي' : 'Tablet'}</span>
          <strong>{tPct}%</strong>
        </div>
        <div className="analytics-device-legend-item">
          <Monitor size={13} />
          <span>{ar ? 'كمبيوتر' : 'Desktop'}</span>
          <strong>{dPct}%</strong>
        </div>
      </div>
    </div>
  );
}

// ─── Source Bar ──────────────────────────────────────────────────────────────

function SourceBar({
  source,
  visitors,
  percent,
  ar,
}: {
  source: string;
  visitors: number;
  percent: number;
  ar: boolean;
}) {
  const isDirect = source === 'direct';
  const label = isDirect ? (ar ? 'مباشر (رابط المتجر)' : 'Direct URL') : source;

  return (
    <div className="analytics-dist-row">
      <span className="analytics-dist-label" title={label}>
        <Globe size={13} />
        {label}
      </span>
      <div className="analytics-dist-track">
        <div
          className="analytics-dist-fill"
          style={{ width: `${Math.min(100, Math.max(4, percent))}%`, background: isDirect ? '#322f83' : '#7c3aed' }}
        />
      </div>
      <span className="analytics-dist-pct" title={`${visitors} زائر`}>
        {percent}%
      </span>
    </div>
  );
}

// ─── Limited Sales View ───────────────────────────────────────────────────────

function SalesAnalyticsView({ ar }: { ar: boolean }) {
  const overview = useQuery({
    queryKey: ['analytics-limited'],
    queryFn: () => api<AnalyticsOverview['today']>('/analytics/limited'),
    refetchInterval: 60_000,
  });
  const d = overview.data;

  return (
    <div className="analytics-container">
      <div className="analytics-header">
        <div className="analytics-header-titles">
          <span className="eyebrow">{ar ? 'المبيعات والزيارات' : 'Sales & Traffic'}</span>
          <h1>{ar ? 'أرقام المتجر' : 'Store Numbers'}</h1>
          <p className="muted" style={{ marginTop: 4, fontSize: 14 }}>
            {ar ? 'ملخص الأنشطة والزيارات المحدثة لحظياً' : 'Live summarized traffic and inquiries'}
          </p>
        </div>
        <div className="analytics-header-actions">
          <button
            className="analytics-refresh-btn"
            onClick={() => overview.refetch()}
            disabled={overview.isFetching}
          >
            <RefreshCw size={14} className={overview.isFetching ? 'spin' : ''} />
            {ar ? 'تحديث' : 'Refresh'}
          </button>
        </div>
      </div>

      <div className="analytics-kpi-grid">
        <StatCard
          label={ar ? 'مشاهدات الصفحات' : 'Pageviews'}
          value={d?.pageViews ?? 0}
          icon={Eye}
          accent="primary"
        />
        <StatCard
          label={ar ? 'زوار فريدون' : 'Unique Visitors'}
          value={d?.uniqueVisitors ?? 0}
          icon={Users}
          accent="violet"
        />
        <StatCard
          label={ar ? 'نقرات الواتساب' : 'WhatsApp Clicks'}
          value={d?.whatsappClicks ?? 0}
          icon={MessageCircle}
          accent="green"
        />
        <StatCard
          label={ar ? 'استفسارات جديدة' : 'New Leads'}
          value={d?.newLeads ?? 0}
          icon={TrendingUp}
          accent="amber"
        />
      </div>
    </div>
  );
}

// ─── Full Executive Analytics View ───────────────────────────────────────────

function FullAnalyticsView({ ar, lang }: { ar: boolean; lang: string }) {
  const { user } = useSession();

  // Date range filter state
  const [dateRange, setDateRange] = useState<DateRangeState>({
    period: '7d',
    from: '',
    to: '',
  });

  // Active navigation tab
  const [activeTab, setActiveTab] = useState<'overview' | 'sales' | 'products' | 'sources' | 'locations' | 'visitors' | 'live'>('overview');

  // Selected visitor for journey modal
  const [selectedVisitorHash, setSelectedVisitorHash] = useState<string | null>(null);

  // Visitors table pagination and filter state
  const [visitorPage, setVisitorPage] = useState<number>(1);
  const [visitorFilter, setVisitorFilter] = useState<'all' | 'products' | 'whatsapp'>('all');
  const [visitorSearch, setVisitorSearch] = useState<string>('');

  // Product table search
  const [productSearch, setProductSearch] = useState('');

  // Live events filter
  const [liveFilter, setLiveFilter] = useState<string>('all');

  const queryString = useMemo(() => buildQueryString(dateRange), [dateRange]);

  const visitorsQueryString = useMemo(() => {
    const params = new URLSearchParams();
    params.set('period', dateRange.period);
    if (dateRange.period === 'custom' && dateRange.from) {
      params.set('from', dateRange.from);
      if (dateRange.to) params.set('to', dateRange.to);
    }
    params.set('page', String(visitorPage));
    params.set('pageSize', '15');
    if (visitorFilter === 'products') params.set('hasProductsOnly', 'true');
    if (visitorFilter === 'whatsapp') params.set('hasWhatsappOnly', 'true');
    return `?${params.toString()}`;
  }, [dateRange, visitorPage, visitorFilter]);

  const overview = useQuery({
    queryKey: ['analytics-overview', dateRange],
    queryFn: () => api<AnalyticsOverview>(`/analytics/overview${queryString}`),
    refetchInterval: 60_000,
  });

  const sales = useQuery({
    queryKey: ['analytics-sales', dateRange],
    queryFn: () => api<AnalyticsSales>(`/analytics/sales${queryString}`),
    enabled: can(user.role, 'analytics.read'),
  });

  const products = useQuery({
    queryKey: ['analytics-products', dateRange],
    queryFn: () => api<AnalyticsProducts>(`/analytics/products${queryString}`),
    enabled: can(user.role, 'analytics.read'),
  });

  const sources = useQuery({
    queryKey: ['analytics-sources', dateRange],
    queryFn: () => api<AnalyticsSources>(`/analytics/sources${queryString}`),
    enabled: can(user.role, 'analytics.read'),
  });

  const locations = useQuery({
    queryKey: ['analytics-locations', dateRange],
    queryFn: () => api<AnalyticsLocations>(`/analytics/locations${queryString}`),
    enabled: can(user.role, 'analytics.read'),
  });

  const devices = useQuery({
    queryKey: ['analytics-devices', dateRange],
    queryFn: () => api<AnalyticsDevices>(`/analytics/devices${queryString}`),
    enabled: can(user.role, 'analytics.read'),
  });

  const visitors = useQuery({
    queryKey: ['analytics-visitors', dateRange, visitorPage, visitorFilter],
    queryFn: () => api<AnalyticsVisitorsResponse>(`/analytics/visitors${visitorsQueryString}`),
    enabled: can(user.role, 'analytics.read'),
  });

  const [liveData, setLiveData] = useState<LiveData | null>(null);
  const fetchLive = useCallback(async () => {
    try {
      const data = await api<LiveData>('/analytics/live');
      setLiveData(data);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (!can(user.role, 'analytics.read')) return;
    fetchLive();
    const interval = setInterval(fetchLive, 30_000);
    return () => clearInterval(interval);
  }, [fetchLive, user.role]);

  const handleRefreshAll = () => {
    overview.refetch();
    sales.refetch();
    products.refetch();
    sources.refetch();
    locations.refetch();
    devices.refetch();
    visitors.refetch();
    fetchLive();
  };

  // Export to Excel handler
  const handleExportExcel = () => {
    const cur = overview.data?.current || overview.data?.today;
    const exportPayload: AnalyticsExportData = {
      storeName: ar ? 'الجيل العربي الرقمي' : 'Al-Jeel Al-Arabi',
      dateRange: {
        from: overview.data?.dateRange?.from || dateRange.from || new Date().toISOString().slice(0, 10),
        to: overview.data?.dateRange?.to || dateRange.to || new Date().toISOString().slice(0, 10),
        period: dateRange.period,
      },
      generatedAt: new Date().toLocaleString(ar ? 'ar-YE' : 'en-GB'),
      overview: {
        pageViews: cur?.pageViews ?? 0,
        uniqueVisitors: cur?.uniqueVisitors ?? 0,
        productViews: cur?.productViews ?? 0,
        whatsappClicks: cur?.whatsappClicks ?? 0,
        newCustomers: cur?.newCustomers ?? 0,
        newOrders: cur?.newOrders ?? 0,
        newLeads: cur?.newLeads ?? 0,
        pageViewGrowth: cur?.pageViewGrowth ?? null,
        visitorGrowth: cur?.visitorGrowth ?? null,
      },
      sales: sales.data?.summary
        ? {
            ...sales.data.summary,
            topSoldProducts: sales.data.topSoldProducts,
            funnel: sales.data.funnel,
          }
        : undefined,
      products: products.data
        ? {
            topViewed: products.data.topViewed.map(p => ({
              ...p,
              title: getLocalizedTitle(p.title, lang, p.model),
            })),
            cold: products.data.cold.map(c => ({
              ...c,
              title: getLocalizedTitle(c.title, lang, c.model),
            })),
            topSearches: products.data.topSearches,
          }
        : undefined,
      sources: sources.data
        ? {
            sources: sources.data.sources,
            devices: sources.data.devices,
            langs: sources.data.langs,
            topCategories: sources.data.topCategories,
          }
        : undefined,
      locations: locations.data
        ? {
            totalVisitors: locations.data.totalVisitors,
            countries: locations.data.countries,
            cities: locations.data.cities,
          }
        : undefined,
      devicesData: devices.data
        ? {
            totalDevices: devices.data.totalDevices,
            classes: devices.data.classes,
            classesPercent: devices.data.classesPercent,
            osList: devices.data.osList,
            browsersList: devices.data.browsersList,
            brandsList: devices.data.brandsList,
          }
        : undefined,
      visitorsList: visitors.data?.visitors.map(v => ({
        tag: v.tag,
        country: v.location.country,
        city: v.location.city,
        deviceClass: v.device.deviceClass,
        os: v.device.os,
        browser: v.device.browser,
        sessionsCount: v.sessionsCount,
        pageViewsCount: v.pageViewsCount,
        productViewsCount: v.productViewsCount,
        distinctProductsCount: v.distinctProductsCount,
        whatsappClicksCount: v.whatsappClicksCount,
        firstSeen: v.firstSeen,
        lastSeen: v.lastSeen,
      })),
    };

    exportAnalyticsToExcel(exportPayload, ar);
  };

  const handlePrint = () => {
    window.print();
  };

  const d = overview.data?.current || overview.data?.today;
  const trend = overview.data?.trend;
  const views7dData = useMemo(() => trend?.views7d.map(v => v.views) ?? [], [trend]);
  const visitors7dData = useMemo(() => trend?.visitors7d.map(v => v.visitors) ?? [], [trend]);

  const totalViews7d = useMemo(() => views7dData.reduce((acc, v) => acc + v, 0), [views7dData]);
  const avgDailyViews = useMemo(() => {
    return views7dData.length ? Math.round(totalViews7d / views7dData.length) : 0;
  }, [totalViews7d, views7dData]);

  // Filtered top products
  const filteredTopProducts = useMemo(() => {
    if (!products.data?.topViewed) return [];
    if (!productSearch.trim()) return products.data.topViewed;
    const q = productSearch.toLowerCase();
    return products.data.topViewed.filter(p => {
      const title = getLocalizedTitle(p.title, lang, p.model).toLowerCase();
      const model = (p.model || '').toLowerCase();
      const cat = (p.category || '').toLowerCase();
      return title.includes(q) || model.includes(q) || cat.includes(q);
    });
  }, [products.data?.topViewed, productSearch, lang]);

  // Filtered live events
  const filteredEvents = useMemo(() => {
    if (!liveData?.recentEvents) return [];
    if (liveFilter === 'all') return liveData.recentEvents;
    return liveData.recentEvents.filter(e => e.type === liveFilter);
  }, [liveData?.recentEvents, liveFilter]);

  // Filtered visitors
  const filteredVisitors = useMemo(() => {
    if (!visitors.data?.visitors) return [];
    if (!visitorSearch.trim()) return visitors.data.visitors;
    const q = visitorSearch.toLowerCase();
    return visitors.data.visitors.filter(v =>
      v.tag.toLowerCase().includes(q) ||
      v.visitorHash.toLowerCase().includes(q) ||
      v.location.city.toLowerCase().includes(q) ||
      v.location.country.toLowerCase().includes(q) ||
      v.device.os.toLowerCase().includes(q) ||
      v.device.browser.toLowerCase().includes(q)
    );
  }, [visitors.data?.visitors, visitorSearch]);

  // Languages total
  const langs = sources.data?.langs;
  const totalLangs = (langs?.ar ?? 0) + (langs?.en ?? 0);
  const arLangPct = totalLangs > 0 ? Math.round(((langs?.ar ?? 0) / totalLangs) * 100) : 100;
  const enLangPct = totalLangs > 0 ? 100 - arLangPct : 0;

  return (
    <div className="analytics-container">
      {/* ─── Top Header & Controls ─── */}
      <div className="analytics-header">
        <div className="analytics-header-titles">
          <span className="eyebrow">{ar ? 'لوحة القيادة والمؤشرات' : 'Executive Intelligence'}</span>
          <h1>{ar ? 'التحليلات والتقارير' : 'Analytics & Reports'}</h1>
          <p className="muted" style={{ marginTop: 4, fontSize: 13.5 }}>
            {ar
              ? 'تقارير حركة الزوار، سلوك العملاء، المبيعات والإيرادات'
              : 'Store visitor behavior, sales, conversions, and catalog trends'}
          </p>
        </div>

        <div className="analytics-header-actions">
          {liveData && (
            <div className="analytics-live-badge-glow">
              <span className="analytics-live-dot" />
              <span>
                {liveData.activeNow}{' '}
                {liveData.activeNow === 1
                  ? ar ? 'متصل الآن' : 'Active Now'
                  : ar ? 'متصلون الآن' : 'Active Now'}
              </span>
            </div>
          )}

          <div className="analytics-action-buttons">
            <button
              className="analytics-btn-pill secondary"
              onClick={handleExportExcel}
              title={ar ? 'تصدير كامل التقرير إلى Excel' : 'Export to Excel'}
            >
              <Download size={14} />
              <span>{ar ? 'تصدير Excel' : 'Excel'}</span>
            </button>

            <button
              className="analytics-btn-pill secondary"
              onClick={handlePrint}
              title={ar ? 'طباعة التقرير / حفظ PDF' : 'Print / PDF'}
            >
              <Printer size={14} />
              <span>{ar ? 'طباعة / PDF' : 'Print'}</span>
            </button>

            <button
              className="analytics-btn-pill primary"
              onClick={handleRefreshAll}
              disabled={overview.isFetching}
              title={ar ? 'تحديث كافة البيانات' : 'Refresh All Data'}
            >
              <RefreshCw size={14} className={overview.isFetching ? 'spin' : ''} />
              <span>{ar ? 'تحديث' : 'Refresh'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* ─── Printable Document Header (Appears Only When Printing) ─── */}
      <div className="analytics-print-header">
        <div className="analytics-print-brand">
          <h2>{ar ? 'الجيل العربي الرقمي' : 'Al-Jeel Al-Arabi'}</h2>
          <p>{ar ? 'تقرير الأداء والمؤشرات التنفيذية' : 'Executive Performance & Metrics Report'}</p>
        </div>
        <div className="analytics-print-meta">
          <span>{ar ? 'الفترة:' : 'Period:'} {overview.data?.dateRange?.from} — {overview.data?.dateRange?.to}</span>
          <span>{ar ? 'تاريخ التقرير:' : 'Generated:'} {new Date().toLocaleDateString(ar ? 'ar-YE' : 'en-GB')}</span>
        </div>
      </div>

      {/* ─── Date Range Selector (From Date -> To Date) ─── */}
      <DateRangeSelector
        dateRange={dateRange}
        onChange={setDateRange}
        ar={ar}
      />

      {/* ─── Responsive Navigation Tabs (Mobile & Desktop) ─── */}
      <div className="analytics-nav-tabs">
        <button
          className={`analytics-nav-tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          <Activity size={14} />
          <span>{ar ? 'نظرة عامة ومؤشرات' : 'Overview & KPIs'}</span>
        </button>

        <button
          className={`analytics-nav-tab-btn ${activeTab === 'sales' ? 'active' : ''}`}
          onClick={() => setActiveTab('sales')}
        >
          <DollarSign size={14} />
          <span>{ar ? 'المبيعات والإيرادات' : 'Sales & Revenue'}</span>
        </button>

        <button
          className={`analytics-nav-tab-btn ${activeTab === 'products' ? 'active' : ''}`}
          onClick={() => setActiveTab('products')}
        >
          <Flame size={14} />
          <span>{ar ? 'أداء المنتجات' : 'Products'}</span>
        </button>

        <button
          className={`analytics-nav-tab-btn ${activeTab === 'sources' ? 'active' : ''}`}
          onClick={() => setActiveTab('sources')}
        >
          <BarChart3 size={14} />
          <span>{ar ? 'المصادر والجمهور' : 'Sources & Audience'}</span>
        </button>

        <button
          className={`analytics-nav-tab-btn ${activeTab === 'locations' ? 'active' : ''}`}
          onClick={() => setActiveTab('locations')}
        >
          <MapPin size={14} />
          <span>{ar ? 'المواقع والأجهزة' : 'Locations & Devices'}</span>
        </button>

        <button
          className={`analytics-nav-tab-btn ${activeTab === 'visitors' ? 'active' : ''}`}
          onClick={() => setActiveTab('visitors')}
        >
          <Users size={14} />
          <span>{ar ? 'سجل الزوار والرحلة' : 'Visitors & Journeys'}</span>
        </button>

        <button
          className={`analytics-nav-tab-btn ${activeTab === 'live' ? 'active' : ''}`}
          onClick={() => setActiveTab('live')}
        >
          <Radio size={14} />
          <span>{ar ? 'النشاط المباشر' : 'Live Stream'}</span>
        </button>
      </div>

      {/* ═════════════════════════════════════════════════════════════ */}
      {/* 1. TAB: Overview & KPIs                                      */}
      {/* ═════════════════════════════════════════════════════════════ */}
      {activeTab === 'overview' && (
        <div className="analytics-tab-pane">
          {/* KPI Grid */}
          <div className="analytics-kpi-grid">
            <StatCard
              label={ar ? 'مشاهدات الصفحات' : 'Pageviews'}
              value={d?.pageViews ?? 0}
              growth={d?.pageViewGrowth}
              icon={Eye}
              accent="primary"
              sparkData={views7dData}
              sparkId="views7d"
            />
            <StatCard
              label={ar ? 'زوار فريدون' : 'Unique Visitors'}
              value={d?.uniqueVisitors ?? 0}
              growth={d?.visitorGrowth}
              icon={Users}
              accent="violet"
              sparkData={visitors7dData}
              sparkId="visitors7d"
            />
            <StatCard
              label={ar ? 'نقرات الواتساب' : 'WhatsApp Inquiries'}
              value={d?.whatsappClicks ?? 0}
              growth={d?.whatsappGrowth}
              sub={ar ? 'استفسارات مباشرة من المنتجات' : 'Direct clicks from product pages'}
              icon={MessageCircle}
              accent="green"
            />
            <StatCard
              label={ar ? 'الطلبات المسجلة' : 'New Orders Placed'}
              value={sales.data?.summary.totalOrders ?? (d?.newOrders ?? 0)}
              growth={sales.data?.summary.orderGrowth ?? d?.orderGrowth}
              sub={
                ar
                  ? `${d?.newCustomers ?? 0} عميل جديد | ${d?.newLeads ?? 0} استفسار`
                  : `${d?.newCustomers ?? 0} new customers · ${d?.newLeads ?? 0} leads`
              }
              icon={ShoppingBag}
              accent="amber"
            />
          </div>

          {/* Trend & Peak Hours */}
          {trend && (
            <div className="analytics-trend-grid">
              {/* Daily Trend Card */}
              <div className="analytics-card">
                <div className="analytics-section-title-row">
                  <strong className="analytics-section-title">
                    <Activity size={16} style={{ color: '#322f83' }} />
                    {ar ? 'مخطط الزيارات خلال الفترة' : 'Traffic Trend for Period'}
                  </strong>
                  <span className="muted" style={{ fontSize: 12 }}>
                    {ar ? `الإجمالي: ${totalViews7d.toLocaleString()}` : `Total: ${totalViews7d.toLocaleString()}`}
                  </span>
                </div>

                <Sparkline data={views7dData} color="#322f83" id="mainTrend" height={60} />

                <div className="analytics-trend-meta-row">
                  {trend.views7d.length > 0 && <span>{trend.views7d[0].day}</span>}
                  <span className="muted" style={{ fontSize: 11.5 }}>
                    {ar ? `المتوسط اليومي: ~${avgDailyViews}` : `Daily avg: ~${avgDailyViews}`}
                  </span>
                  {trend.views7d.length > 1 && (
                    <span>{trend.views7d[trend.views7d.length - 1].day}</span>
                  )}
                </div>
              </div>

              {/* Peak Hours Card */}
              <div className="analytics-card">
                <div className="analytics-section-title-row">
                  <strong className="analytics-section-title">
                    <Clock size={16} style={{ color: '#f59e0b' }} />
                    {ar ? 'توزيع ساعات الذروة وتوقيت النشاط' : 'Peak Traffic Activity'}
                  </strong>
                </div>

                <HourBars
                  data={trend.topHours}
                  timeSlots={trend.timeSlots}
                  peakSlot={trend.peakSlot}
                  ar={ar}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════ */}
      {/* 2. TAB: Sales & Revenue Report                               */}
      {/* ═════════════════════════════════════════════════════════════ */}
      {activeTab === 'sales' && sales.data && (
        <div className="analytics-tab-pane">
          {/* Financial KPI Cards */}
          <div className="analytics-kpi-grid">
            <StatCard
              label={ar ? 'إجمالي المبيعات (USD)' : 'Total Revenue (USD)'}
              value={`$${sales.data.summary.totalRevenueUsd.toLocaleString()}`}
              growth={sales.data.summary.revenueGrowth}
              icon={DollarSign}
              accent="green"
            />
            <StatCard
              label={ar ? 'إجمالي المبيعات (ريال يمني)' : 'Revenue in YER'}
              value={`${sales.data.summary.totalRevenueYer.toLocaleString()} ر.ي`}
              icon={TrendingUp}
              accent="amber"
            />
            <StatCard
              label={ar ? 'متوسط قيمة الطلب' : 'Average Order Value'}
              value={`$${sales.data.summary.averageOrderValueUsd}`}
              sub={ar ? 'لكل عملية شراء ناجحة' : 'Per completed order'}
              icon={PackageCheck}
              accent="violet"
            />
            <StatCard
              label={ar ? 'الطلبات المكتملة' : 'Completed Orders'}
              value={sales.data.summary.completedOrders}
              sub={
                ar
                  ? `من إجمالي ${sales.data.summary.totalOrders} طلب`
                  : `Out of ${sales.data.summary.totalOrders} orders`
              }
              icon={CheckCircle2}
              accent="primary"
            />
          </div>

          <div className="analytics-content-grid">
            {/* Orders Status Distribution */}
            <div className="analytics-card">
              <div className="analytics-section-title-row">
                <strong className="analytics-section-title">
                  <ShoppingBag size={16} style={{ color: '#322f83' }} />
                  {ar ? 'توزيع حالات الطلبات' : 'Orders by Status'}
                </strong>
                <span className="muted" style={{ fontSize: 12 }}>
                  {sales.data.summary.totalOrders} {ar ? 'طلب' : 'orders'}
                </span>
              </div>

              <div className="analytics-status-grid">
                <div className="analytics-status-card new">
                  <span className="analytics-status-label">{ar ? 'جديد' : 'New'}</span>
                  <strong>{sales.data.summary.newOrders}</strong>
                </div>
                <div className="analytics-status-card processing">
                  <span className="analytics-status-label">{ar ? 'قيد التجهيز' : 'Processing'}</span>
                  <strong>{sales.data.summary.processingOrders}</strong>
                </div>
                <div className="analytics-status-card completed">
                  <span className="analytics-status-label">{ar ? 'مكتمل' : 'Completed'}</span>
                  <strong>{sales.data.summary.completedOrders}</strong>
                </div>
                <div className="analytics-status-card cancelled">
                  <span className="analytics-status-label">{ar ? 'ملغي' : 'Cancelled'}</span>
                  <strong>{sales.data.summary.cancelledOrders}</strong>
                </div>
              </div>

              {/* Conversion Funnel */}
              <div className="analytics-funnel-section">
                <strong className="analytics-funnel-title">
                  {ar ? 'قمع التحويل التجاري (Conversion Funnel)' : 'Commercial Conversion Funnel'}
                </strong>

                <div className="analytics-funnel-steps">
                  <div className="analytics-funnel-step">
                    <div className="funnel-step-header">
                      <span>1. {ar ? 'زوار المتجر' : 'Visitors'}</span>
                      <strong>{sales.data.funnel.visitors.toLocaleString()}</strong>
                    </div>
                    <div className="funnel-step-bar" style={{ width: '100%' }} />
                  </div>

                  <div className="analytics-funnel-step">
                    <div className="funnel-step-header">
                      <span>2. {ar ? 'مشاهدات المنتجات' : 'Product Views'}</span>
                      <strong>{sales.data.funnel.productViews.toLocaleString()}</strong>
                    </div>
                    <div className="funnel-step-bar" style={{ width: '80%' }} />
                  </div>

                  <div className="analytics-funnel-step">
                    <div className="funnel-step-header">
                      <span>3. {ar ? 'استفسارات واتساب وسلات الشراء' : 'Inquiries & Carts'}</span>
                      <strong>{sales.data.funnel.inquiriesAndCarts.toLocaleString()}</strong>
                    </div>
                    <div className="funnel-step-bar" style={{ width: '55%' }} />
                    <span className="funnel-rate-tag">
                      {ar ? 'معدل اهتمام:' : 'Rate:'} {sales.data.funnel.visitorToInquiryRate}%
                    </span>
                  </div>

                  <div className="analytics-funnel-step">
                    <div className="funnel-step-header">
                      <span>4. {ar ? 'طلبات تم تقديمها' : 'Orders Placed'}</span>
                      <strong>{sales.data.funnel.ordersPlaced.toLocaleString()}</strong>
                    </div>
                    <div className="funnel-step-bar" style={{ width: '35%' }} />
                    <span className="funnel-rate-tag">
                      {ar ? 'تحويل الطلب:' : 'Order Rate:'} {sales.data.funnel.inquiryToOrderRate}%
                    </span>
                  </div>

                  <div className="analytics-funnel-step">
                    <div className="funnel-step-header">
                      <span>5. {ar ? 'طلبات مكتملة ومدفوعة' : 'Completed Orders'}</span>
                      <strong>{sales.data.funnel.ordersCompleted.toLocaleString()}</strong>
                    </div>
                    <div className="funnel-step-bar completed" style={{ width: '22%' }} />
                    <span className="funnel-rate-tag success">
                      {ar ? 'اكتمال التسليم:' : 'Fulfilled:'} {sales.data.funnel.orderCompletionRate}%
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Top Revenue Products */}
            <div className="analytics-card">
              <div className="analytics-section-title-row">
                <strong className="analytics-section-title">
                  <TrendingUp size={16} style={{ color: '#24865f' }} />
                  {ar ? 'المنتجات الأعلى تحقيقاً للإيرادات' : 'Top Revenue Products'}
                </strong>
              </div>

              <div className="analytics-top-sales-list">
                {sales.data.topSoldProducts.map((p, idx) => (
                  <div key={p.productId} className="analytics-top-sale-item">
                    <span className="analytics-top-sale-rank">#{idx + 1}</span>
                    <div className="analytics-top-sale-info">
                      <strong className="analytics-top-sale-title">
                        {getLocalizedTitle(p.title, lang, p.productId)}
                      </strong>
                      <span className="muted" style={{ fontSize: 12 }}>
                        {p.quantity} {ar ? 'قطع مباعة' : 'units sold'}
                      </span>
                    </div>
                    <strong className="analytics-top-sale-amount">
                      ${p.revenueUsd.toLocaleString()}
                    </strong>
                  </div>
                ))}

                {!sales.data.topSoldProducts.length && (
                  <p className="muted" style={{ textAlign: 'center', padding: 24, fontSize: 13 }}>
                    {ar ? 'لا توجد مبيعات مسجلة في هذه الفترة' : 'No sales recorded in this period'}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════ */}
      {/* 3. TAB: Products & Catalog                                    */}
      {/* ═════════════════════════════════════════════════════════════ */}
      {activeTab === 'products' && (
        <div className="analytics-tab-pane">
          <div className="analytics-content-grid">
            {/* Left: Top Viewed Products (Responsive Mobile Cards + Desktop Table) */}
            <div className="analytics-card" style={{ padding: 0 }}>
              <div className="analytics-table-header-tools">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Flame size={17} style={{ color: '#f2a93b' }} />
                  <strong style={{ fontSize: 14 }}>
                    {ar ? 'أكثر المنتجات تفاعلاً ومشاهدةً' : 'Top Performing Products'}
                  </strong>
                  <span className="muted" style={{ fontSize: 11.5 }}>
                    ({products.data?.topViewed.length ?? 0})
                  </span>
                </div>

                <div className="analytics-table-search-box">
                  <Search size={13} className="muted" />
                  <input
                    type="text"
                    placeholder={ar ? 'بحث في المنتجات...' : 'Search products...'}
                    value={productSearch}
                    onChange={e => setProductSearch(e.target.value)}
                  />
                  {productSearch && (
                    <button
                      type="button"
                      className="analytics-search-clear"
                      onClick={() => setProductSearch('')}
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>
              </div>

              {/* Mobile Product Cards (Displayed on Mobile Screens < 640px) */}
              <div className="analytics-mobile-prod-cards">
                {filteredTopProducts.slice(0, 15).map((p, index) => {
                  const title = getLocalizedTitle(p.title, lang, p.model);
                  const isHigh = p.conversionRate >= 5;
                  const isLow = p.views > 50 && p.whatsappClicks === 0;

                  return (
                    <div key={p.productId} className="analytics-mobile-prod-card">
                      <div className="analytics-mobile-prod-top">
                        <span className={`analytics-rank-badge rank-${index + 1}`}>
                          #{index + 1}
                        </span>

                        {p.image ? (
                          <img
                            src={p.image}
                            alt={title}
                            className="analytics-prod-thumb"
                            loading="lazy"
                            onError={e => {
                              (e.currentTarget as HTMLImageElement).style.display = 'none';
                            }}
                          />
                        ) : (
                          <div className="analytics-prod-thumb placeholder">
                            <ShoppingBag size={16} className="muted" />
                          </div>
                        )}

                        <div className="analytics-mobile-prod-meta">
                          <span className="analytics-prod-title" title={title}>
                            {title}
                          </span>
                          <span className="analytics-prod-cat-badge">
                            {p.category || p.model}
                          </span>
                        </div>
                      </div>

                      <div className="analytics-mobile-prod-metrics">
                        <div className="analytics-mobile-metric">
                          <span className="metric-label">{ar ? 'المشاهدات' : 'Views'}</span>
                          <strong className="metric-val">{p.views.toLocaleString()}</strong>
                        </div>

                        <div className="analytics-mobile-metric">
                          <span className="metric-label">{ar ? 'نقرات الواتساب' : 'Inquiries'}</span>
                          <strong className="metric-val text-green">{p.whatsappClicks}</strong>
                        </div>

                        <div className="analytics-mobile-metric">
                          <span className="metric-label">{ar ? 'التحويل' : 'CVR'}</span>
                          <span className={`analytics-cvr-badge ${isLow ? 'low' : isHigh ? 'high' : 'normal'}`}>
                            {p.conversionRate}%
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {!filteredTopProducts.length && (
                  <p className="muted" style={{ textAlign: 'center', padding: 28, fontSize: 13 }}>
                    {productSearch
                      ? ar ? 'لا توجد نتائج مطابقة لبحثك' : 'No matching products'
                      : ar ? 'لا توجد بيانات تفاعل للمنتجات بعد' : 'No product data recorded'}
                  </p>
                )}
              </div>

              {/* Desktop Products Table (Displayed on >= 640px) */}
              <div className="analytics-desktop-products-table">
                <table className="analytics-products-table">
                  <thead>
                    <tr>
                      <th style={{ width: 44, textAlign: 'center' }}>#</th>
                      <th style={{ textAlign: 'start' }}>{ar ? 'المنتج' : 'Product'}</th>
                      <th style={{ textAlign: 'center' }}>{ar ? 'المشاهدات' : 'Views'}</th>
                      <th style={{ textAlign: 'center' }}>{ar ? 'نقرات الواتساب' : 'WhatsApp'}</th>
                      <th style={{ textAlign: 'center' }}>{ar ? 'التحويل' : 'CVR'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTopProducts.slice(0, 15).map((p, index) => {
                      const title = getLocalizedTitle(p.title, lang, p.model);
                      const isHigh = p.conversionRate >= 5;
                      const isLow = p.views > 50 && p.whatsappClicks === 0;

                      return (
                        <tr key={p.productId}>
                          <td style={{ textAlign: 'center', color: 'var(--muted)', fontWeight: 700 }}>
                            {index + 1}
                          </td>
                          <td>
                            <div className="analytics-prod-cell">
                              {p.image ? (
                                <img
                                  src={p.image}
                                  alt={title}
                                  className="analytics-prod-thumb"
                                  loading="lazy"
                                  onError={e => {
                                    (e.currentTarget as HTMLImageElement).style.display = 'none';
                                  }}
                                />
                              ) : (
                                <div className="analytics-prod-thumb placeholder">
                                  <ShoppingBag size={16} className="muted" />
                                </div>
                              )}
                              <div className="analytics-prod-info">
                                <span className="analytics-prod-title" title={title}>
                                  {title}
                                </span>
                                <span className="analytics-prod-cat-badge">
                                  {p.category || p.model}
                                </span>
                              </div>
                            </div>
                          </td>
                          <td style={{ textAlign: 'center', fontWeight: 700 }}>
                            {p.views.toLocaleString()}
                          </td>
                          <td style={{ textAlign: 'center', fontWeight: 700, color: '#24865f' }}>
                            {p.whatsappClicks}
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <span
                              className={`analytics-cvr-badge ${
                                isLow ? 'low' : isHigh ? 'high' : 'normal'
                              }`}
                            >
                              {p.conversionRate}%
                            </span>
                          </td>
                        </tr>
                      );
                    })}

                    {!filteredTopProducts.length && (
                      <tr>
                        <td colSpan={5} style={{ textAlign: 'center', padding: 32, color: 'var(--muted)' }}>
                          {productSearch
                            ? ar ? 'لا توجد نتائج مطابقة لبحثك' : 'No matching products found'
                            : ar ? 'لا توجد بيانات مشاهدات للمنتجات بعد' : 'No product view data yet'}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Right: Cold Products and Top Search Queries */}
            <div className="analytics-side-col">
              {/* Cold Products */}
              {products.data?.cold && products.data.cold.length > 0 && (
                <div className="analytics-card">
                  <div className="analytics-section-title-row">
                    <strong className="analytics-section-title">
                      <Snowflake size={15} style={{ color: '#60a5fa' }} />
                      {ar ? 'أصناف تحتاج لتنشيط (راكدة)' : 'Cold Products'}
                    </strong>
                    <span className="muted" style={{ fontSize: 11.5 }}>
                      {ar ? 'مشاهدات بلا طلبات' : 'Zero inquiries'}
                    </span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    {products.data.cold.slice(0, 5).map(p => {
                      const title = getLocalizedTitle(p.title, lang, p.model);
                      return (
                        <div key={p.productId} className="analytics-cold-item">
                          <span className="analytics-cold-item-title" title={title}>
                            {title}
                          </span>
                          <span className="muted" style={{ fontSize: 12, whiteSpace: 'nowrap' }}>
                            {p.views} {ar ? 'مشاهدة' : 'views'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Top Searches */}
              {products.data?.topSearches && products.data.topSearches.length > 0 && (
                <div className="analytics-card">
                  <div className="analytics-section-title-row">
                    <strong className="analytics-section-title">
                      <Search size={15} style={{ color: 'var(--primary-text)' }} />
                      {ar ? 'أكثر عبارات البحث في المتجر' : 'Top Search Queries'}
                    </strong>
                  </div>

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {products.data.topSearches.slice(0, 12).map(s => (
                      <span key={s.query} className="analytics-search-tag">
                        {s.query} <span className="muted">({s.count})</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════ */}
      {/* 4. TAB: Sources & Audience                                   */}
      {/* ═════════════════════════════════════════════════════════════ */}
      {activeTab === 'sources' && sources.data && (
        <div className="analytics-tab-pane">
          <div className="analytics-content-grid">
            {/* Traffic Sources */}
            <div className="analytics-card">
              <div className="analytics-section-title-row">
                <strong className="analytics-section-title">
                  <BarChart3 size={15} style={{ color: '#322f83' }} />
                  {ar ? 'مصادر الزيارات' : 'Traffic Sources'}
                </strong>
                <span className="muted" style={{ fontSize: 11.5 }}>
                  {ar ? 'خلال الفترة المحددة' : 'Selected Period'}
                </span>
              </div>

              {sources.data.sources.slice(0, 8).map(s => (
                <SourceBar
                  key={s.source}
                  source={s.source}
                  visitors={s.visitors}
                  percent={s.percent}
                  ar={ar}
                />
              ))}

              {!sources.data.sources.length && (
                <p className="muted" style={{ textAlign: 'center', padding: 24, fontSize: 13 }}>
                  {ar ? 'لا توجد بيانات مصادر مسجلة' : 'No source data available'}
                </p>
              )}
            </div>

            {/* Devices & Languages & Top Categories */}
            <div className="analytics-side-col">
              {/* Devices Breakdown */}
              <div className="analytics-card">
                <div className="analytics-section-title-row">
                  <strong className="analytics-section-title">
                    <Smartphone size={15} style={{ color: '#7c3aed' }} />
                    {ar ? 'توزيع الأجهزة والمستخدمين' : 'Devices Breakdown'}
                  </strong>
                </div>

                <DeviceBreakdown devices={sources.data.devices} ar={ar} />

                {/* Languages Breakdown */}
                <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 6 }}>
                    <span className="muted">{ar ? 'لغة التصفح' : 'Browser Language'}</span>
                    <span style={{ fontWeight: 700 }}>
                      العربية: {arLangPct}% | English: {enLangPct}%
                    </span>
                  </div>
                  <div style={{ height: 7, width: '100%', background: 'var(--surface-soft)', borderRadius: 6, display: 'flex', overflow: 'hidden' }}>
                    <div style={{ width: `${arLangPct}%`, background: '#322f83' }} />
                    <div style={{ width: `${enLangPct}%`, background: '#f2a93b' }} />
                  </div>
                </div>
              </div>

              {/* Top Categories */}
              {sources.data.topCategories && sources.data.topCategories.length > 0 && (
                <div className="analytics-card">
                  <div className="analytics-section-title-row">
                    <strong className="analytics-section-title">
                      <ShoppingBag size={15} style={{ color: 'var(--primary-text)' }} />
                      {ar ? 'الأقسام الأكثر طلباً وتصفحاً' : 'Top Categories'}
                    </strong>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {sources.data.topCategories.slice(0, 6).map(c => (
                      <div
                        key={c.category}
                        style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5 }}
                      >
                        <span style={{ fontWeight: 600 }}>{c.category}</span>
                        <span className="muted">{c.views.toLocaleString()} {ar ? 'مشاهدة' : 'views'}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════ */}
      {/* 5. TAB: Locations & Devices (المواقع الجغرافية والأجهزة)     */}
      {/* ═════════════════════════════════════════════════════════════ */}
      {activeTab === 'locations' && can(user.role, 'analytics.read') && (
        <div className="analytics-tab-pane">
          {/* KPI Summary Cards */}
          <div className="analytics-kpi-grid">
            <StatCard
              label={ar ? 'إجمالي الأجهزة الفريدة' : 'Unique Devices'}
              value={devices.data?.totalDevices ?? 0}
              icon={Smartphone}
              accent="primary"
            />
            <StatCard
              label={ar ? 'أبرز دولة' : 'Top Country'}
              value={locations.data?.countries[0] ? `${locations.data.countries[0].flag} ${locations.data.countries[0].country}` : (ar ? 'اليمن' : 'Yemen')}
              sub={locations.data?.countries[0] ? `${locations.data.countries[0].percent}% ${ar ? 'من إجمالي الزوار' : 'of visitors'}` : undefined}
              icon={Globe}
              accent="green"
            />
            <StatCard
              label={ar ? 'أبرز مدينة' : 'Top City'}
              value={locations.data?.cities[0] ? locations.data.cities[0].city : (ar ? 'صنعاء' : 'Sanaa')}
              sub={locations.data?.cities[0] ? `${locations.data.cities[0].percent}% ${ar ? 'من إجمالي الزوار' : 'of visitors'}` : undefined}
              icon={MapPin}
              accent="violet"
            />
            <StatCard
              label={ar ? 'نسبة الهواتف الذكية' : 'Mobile Share'}
              value={`${devices.data?.classesPercent.mobile ?? 0}%`}
              sub={ar ? `${devices.data?.classes.mobile ?? 0} هاتف ذكي` : `${devices.data?.classes.mobile ?? 0} mobile devices`}
              icon={Smartphone}
              accent="amber"
            />
          </div>

          {/* Locations Grid: Countries & Cities */}
          <div className="analytics-locations-grid">
            {/* Countries Card */}
            <div className="analytics-card">
              <div className="analytics-card-header">
                <div>
                  <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>
                    {ar ? 'الدول الأكثر زيارة للمتجر' : 'Top Countries'}
                  </h3>
                  <span className="muted" style={{ fontSize: 12 }}>
                    {ar ? 'توزيع الزوار حسب الدولة مع الأعلام والنسب' : 'Visitor distribution by country and flag'}
                  </span>
                </div>
                <Globe size={18} style={{ color: '#322f83' }} />
              </div>

              <div className="geo-list-wrap">
                {locations.data?.countries && locations.data.countries.length > 0 ? (
                  locations.data.countries.map(c => (
                    <div key={c.country} className="geo-item-row">
                      <div className="geo-item-identity">
                        <span className="geo-flag-emoji">{c.flag}</span>
                        <span className="geo-item-name">{c.country}</span>
                      </div>
                      <div className="geo-item-bar-wrap">
                        <div
                          className="geo-item-bar-fill"
                          style={{ width: `${Math.min(100, Math.max(5, c.percent))}%`, background: '#322f83' }}
                        />
                      </div>
                      <div className="geo-item-stats">
                        <span className="geo-item-count">{c.visitors.toLocaleString()}</span>
                        <span className="geo-item-pct">({c.percent}%)</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="muted" style={{ textAlign: 'center', padding: 20, fontSize: 13 }}>
                    {ar ? 'لا توجد بيانات دول في هذه الفترة' : 'No country data available for this range'}
                  </p>
                )}
              </div>
            </div>

            {/* Cities Card */}
            <div className="analytics-card">
              <div className="analytics-card-header">
                <div>
                  <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>
                    {ar ? 'أبرز المدن والمحافظات' : 'Top Cities & Regions'}
                  </h3>
                  <span className="muted" style={{ fontSize: 12 }}>
                    {ar ? 'توزيع الزيارات جغرافياً (صنعاء، عدن، تعز، إلخ)' : 'Geographic city breakdown'}
                  </span>
                </div>
                <MapPin size={18} style={{ color: '#7c3aed' }} />
              </div>

              <div className="geo-list-wrap">
                {locations.data?.cities && locations.data.cities.length > 0 ? (
                  locations.data.cities.map(c => (
                    <div key={`${c.city}-${c.country}`} className="geo-item-row">
                      <div className="geo-item-identity">
                        <MapPin size={14} style={{ color: '#7c3aed', flexShrink: 0 }} />
                        <span className="geo-item-name">{c.city}</span>
                        <span className="geo-item-sub">({c.country})</span>
                      </div>
                      <div className="geo-item-bar-wrap">
                        <div
                          className="geo-item-bar-fill"
                          style={{ width: `${Math.min(100, Math.max(5, c.percent))}%`, background: '#7c3aed' }}
                        />
                      </div>
                      <div className="geo-item-stats">
                        <span className="geo-item-count">{c.visitors.toLocaleString()}</span>
                        <span className="geo-item-pct">({c.percent}%)</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="muted" style={{ textAlign: 'center', padding: 20, fontSize: 13 }}>
                    {ar ? 'لا توجد بيانات مدن في هذه الفترة' : 'No city data available for this range'}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Devices Grid: OS, Browsers, Screen sizes */}
          <div className="device-specs-grid">
            {/* Operating Systems */}
            <div className="analytics-card">
              <div className="analytics-card-header">
                <div>
                  <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>
                    {ar ? 'أنظمة التشغيل' : 'Operating Systems'}
                  </h3>
                  <span className="muted" style={{ fontSize: 12 }}>
                    {ar ? 'Android، iOS، Windows، macOS' : 'OS distribution across visitors'}
                  </span>
                </div>
                <Cpu size={18} style={{ color: '#24865f' }} />
              </div>

              <div className="device-distribution-list">
                {devices.data?.osList && devices.data.osList.length > 0 ? (
                  devices.data.osList.map(item => (
                    <div key={item.name} className="device-dist-row">
                      <div className="device-dist-name">
                        <span>{item.name}</span>
                      </div>
                      <div className="device-dist-track">
                        <div
                          className="device-dist-bar"
                          style={{ width: `${Math.min(100, Math.max(5, item.percent))}%`, background: '#24865f' }}
                        />
                      </div>
                      <span className="device-dist-vals">
                        {item.count} <span style={{ fontSize: 11, color: 'var(--muted)' }}>({item.percent}%)</span>
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="muted" style={{ textAlign: 'center', padding: 16, fontSize: 13 }}>
                    {ar ? 'لا توجد بيانات أنظمة تشغيل' : 'No OS data available'}
                  </p>
                )}
              </div>
            </div>

            {/* Browsers & Brands */}
            <div className="analytics-card">
              <div className="analytics-card-header">
                <div>
                  <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>
                    {ar ? 'المتصفحات ومصنعي الأجهزة' : 'Browsers & Brands'}
                  </h3>
                  <span className="muted" style={{ fontSize: 12 }}>
                    {ar ? 'Chrome، Safari، Samsung، وغيرها' : 'Browsers and popular hardware'}
                  </span>
                </div>
                <Globe size={18} style={{ color: '#f2a93b' }} />
              </div>

              <div className="device-distribution-list">
                {devices.data?.browsersList && devices.data.browsersList.length > 0 ? (
                  devices.data.browsersList.map(item => (
                    <div key={item.name} className="device-dist-row">
                      <div className="device-dist-name">
                        <span>{item.name}</span>
                      </div>
                      <div className="device-dist-track">
                        <div
                          className="device-dist-bar"
                          style={{ width: `${Math.min(100, Math.max(5, item.percent))}%`, background: '#f2a93b' }}
                        />
                      </div>
                      <span className="device-dist-vals">
                        {item.count} <span style={{ fontSize: 11, color: 'var(--muted)' }}>({item.percent}%)</span>
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="muted" style={{ textAlign: 'center', padding: 16, fontSize: 13 }}>
                    {ar ? 'لا توجد بيانات متصفحات' : 'No browser data available'}
                  </p>
                )}
              </div>

              {/* Screen Resolutions */}
              {devices.data?.screensList && devices.data.screensList.length > 0 && (
                <div style={{ marginTop: 16, borderTop: '1px solid var(--border)', paddingTop: 12 }}>
                  <span className="muted" style={{ fontSize: 12, fontWeight: 600 }}>
                    {ar ? 'دقة الشاشات الشائعة:' : 'Common Screen Resolutions:'}
                  </span>
                  <div className="screen-resolution-chips">
                    {devices.data.screensList.map(s => (
                      <span key={s.resolution} className="screen-resolution-chip">
                        <Monitor size={11} /> {s.resolution} <strong>({s.count})</strong>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════ */}
      {/* 6. TAB: Visitors & Journeys (سجل الزوار والرحلة بالتفصيل)     */}
      {/* ═════════════════════════════════════════════════════════════ */}
      {activeTab === 'visitors' && can(user.role, 'analytics.read') && (
        <div className="analytics-tab-pane">
          {/* Controls Bar: Filters and Search */}
          <div className="visitor-controls-bar">
            <div className="visitor-filter-chips">
              <button
                type="button"
                className={`visitor-filter-btn ${visitorFilter === 'all' ? 'active' : ''}`}
                onClick={() => { setVisitorFilter('all'); setVisitorPage(1); }}
              >
                {ar ? 'جميع الزوار' : 'All Visitors'} ({visitors.data?.pagination.total ?? 0})
              </button>
              <button
                type="button"
                className={`visitor-filter-btn ${visitorFilter === 'products' ? 'active' : ''}`}
                onClick={() => { setVisitorFilter('products'); setVisitorPage(1); }}
              >
                <Eye size={12} style={{ display: 'inline', marginInlineEnd: 4 }} />
                {ar ? 'شاهدوا منتجات' : 'Viewed Products'}
              </button>
              <button
                type="button"
                className={`visitor-filter-btn ${visitorFilter === 'whatsapp' ? 'active' : ''}`}
                onClick={() => { setVisitorFilter('whatsapp'); setVisitorPage(1); }}
              >
                <MessageCircle size={12} style={{ display: 'inline', marginInlineEnd: 4 }} />
                {ar ? 'تواصلوا عبر واتساب' : 'WhatsApp Leads'}
              </button>
            </div>

            <div className="visitor-search-box">
              <Search size={14} />
              <input
                type="search"
                className="visitor-search-input"
                placeholder={ar ? 'ابحث بالمعرّف أو المدينة أو الجهاز...' : 'Search by ID, city, OS...'}
                value={visitorSearch}
                onChange={e => setVisitorSearch(e.target.value)}
              />
            </div>
          </div>

          {/* Desktop Table View */}
          <div className="analytics-visitors-table-wrap">
            <table className="analytics-visitors-table">
              <thead>
                <tr>
                  <th>{ar ? 'الزائر' : 'Visitor'}</th>
                  <th>{ar ? 'الموقع الجغرافي' : 'Location'}</th>
                  <th>{ar ? 'الجهاز والبيئة' : 'Device & Specs'}</th>
                  <th style={{ textAlign: 'center' }}>{ar ? 'الجلسات والحركات' : 'Sessions / Events'}</th>
                  <th>{ar ? 'المنتجات المشاهدة' : 'Products Viewed'}</th>
                  <th style={{ textAlign: 'center' }}>{ar ? 'واتساب' : 'WhatsApp'}</th>
                  <th>{ar ? 'آخر ظهور' : 'Last Seen'}</th>
                  <th style={{ textAlign: 'center' }}>{ar ? 'الإجراءات' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody>
                {filteredVisitors.length > 0 ? (
                  filteredVisitors.map(v => (
                    <tr key={v.visitorHash}>
                      <td>
                        <div className="visitor-identity-cell">
                          <span className="visitor-tag-text">{v.tag}</span>
                          <span className="visitor-id-hash">{v.visitorHash.slice(0, 10)}...</span>
                        </div>
                      </td>
                      <td>
                        <span className="visitor-geo-pill-inline">
                          <span>{v.location.flag}</span>
                          <span>{v.location.city}، {v.location.country}</span>
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                          <span className="visitor-tech-pill-inline">
                            {v.device.deviceClass === 'mobile' ? (
                              <Smartphone size={13} />
                            ) : v.device.deviceClass === 'tablet' ? (
                              <Tablet size={13} />
                            ) : (
                              <Monitor size={13} />
                            )}
                            <strong>{v.device.os}</strong>
                          </span>
                          <span style={{ fontSize: 11, color: 'var(--muted)' }}>
                            {v.device.browser} · {v.device.brand}
                          </span>
                        </div>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                          <strong style={{ fontSize: 13.5 }}>{v.sessionsCount} {ar ? 'جلسة' : 'sessions'}</strong>
                          <span style={{ fontSize: 11, color: 'var(--muted)' }}>
                            {v.totalEvents} {ar ? 'حركة مسجلة' : 'actions'}
                          </span>
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                          <span style={{ fontSize: 12.5, fontWeight: 700, color: '#322f83' }}>
                            {v.productViewsCount} {ar ? 'مشاهدة' : 'views'} ({v.distinctProductsCount} {ar ? 'منتج مميز' : 'distinct'})
                          </span>
                          {v.topProducts.length > 0 && (
                            <div className="visitor-product-mini-thumbs">
                              {v.topProducts.map((p, i) => (
                                p.image ? (
                                  <img
                                    key={i}
                                    src={p.image}
                                    alt=""
                                    className="visitor-mini-thumb"
                                    title={getLocalizedTitle(p.title, lang)}
                                  />
                                ) : (
                                  <span key={i} className="visitor-mini-thumb-placeholder" title={getLocalizedTitle(p.title, lang)}>
                                    {ar ? 'صنف' : 'Item'}
                                  </span>
                                )
                              ))}
                            </div>
                          )}
                        </div>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        {v.whatsappClicksCount > 0 ? (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                              background: 'rgba(36, 134, 95, 0.1)',
                              color: '#24865f',
                              fontWeight: 700,
                              padding: '2px 8px',
                              borderRadius: 6,
                              fontSize: 12,
                            }}
                          >
                            <MessageCircle size={12} />
                            {v.whatsappClicksCount}
                          </span>
                        ) : (
                          <span className="muted" style={{ fontSize: 12 }}>—</span>
                        )}
                      </td>
                      <td style={{ fontSize: 12, color: 'var(--muted)', whiteSpace: 'nowrap' }}>
                        {new Date(v.lastSeen).toLocaleDateString(ar ? 'ar-YE' : 'en-GB', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <button
                          type="button"
                          className="visitor-row-btn"
                          onClick={() => setSelectedVisitorHash(v.visitorHash)}
                        >
                          <Eye size={13} />
                          <span>{ar ? 'سجل الرحلة' : 'Journey'}</span>
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: 32 }} className="muted">
                      {visitors.isLoading
                        ? (ar ? 'جارٍ تحميل سجلات الزوار...' : 'Loading visitor logs...')
                        : (ar ? 'لا يوجد زوار مطابقون لهذا الفلتر' : 'No visitors matching this filter')}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Visitor Cards View (< 768px) */}
          <div className="analytics-mobile-visitor-cards">
            {filteredVisitors.length > 0 ? (
              filteredVisitors.map(v => (
                <div key={v.visitorHash} className="visitor-card-mobile">
                  <div className="visitor-card-mobile-top">
                    <div>
                      <div className="visitor-tag-text">{v.tag}</div>
                      <span className="visitor-geo-pill-inline" style={{ marginTop: 4 }}>
                        <span>{v.location.flag}</span>
                        <span>{v.location.city}، {v.location.country}</span>
                      </span>
                    </div>

                    <div style={{ textAlign: 'end', fontSize: 11, color: 'var(--muted)' }}>
                      <div>{v.device.os}</div>
                      <div>{v.device.browser}</div>
                    </div>
                  </div>

                  <div className="visitor-card-mobile-stats">
                    <div className="visitor-card-stat-box">
                      <span className="num">{v.sessionsCount}</span>
                      <span className="lbl">{ar ? 'جلسات' : 'Sessions'}</span>
                    </div>
                    <div className="visitor-card-stat-box">
                      <span className="num">{v.productViewsCount}</span>
                      <span className="lbl">{ar ? 'منتجات' : 'Products'}</span>
                    </div>
                    <div className="visitor-card-stat-box">
                      <span className="num">{v.whatsappClicksCount}</span>
                      <span className="lbl">{ar ? 'واتساب' : 'WhatsApp'}</span>
                    </div>
                  </div>

                  {v.topProducts.length > 0 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span className="muted" style={{ fontSize: 11 }}>
                        {ar ? 'المنتجات التي تفحصها:' : 'Inspected:'}
                      </span>
                      <div className="visitor-product-mini-thumbs">
                        {v.topProducts.map((p, i) => (
                          p.image ? (
                            <img
                              key={i}
                              src={p.image}
                              alt=""
                              className="visitor-mini-thumb"
                              title={getLocalizedTitle(p.title, lang)}
                            />
                          ) : (
                            <span key={i} className="visitor-mini-thumb-placeholder">
                              {ar ? 'صنف' : 'Item'}
                            </span>
                          )
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="visitor-card-mobile-actions">
                    <span style={{ fontSize: 11, color: 'var(--muted)' }}>
                      {ar ? 'آخر ظهور:' : 'Last Seen:'}{' '}
                      {new Date(v.lastSeen).toLocaleDateString(ar ? 'ar-YE' : 'en-GB', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>

                    <button
                      type="button"
                      className="visitor-row-btn"
                      onClick={() => setSelectedVisitorHash(v.visitorHash)}
                    >
                      <Eye size={13} />
                      <span>{ar ? 'عرض سجل النشاط والرحلة' : 'View Journey'}</span>
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="analytics-card" style={{ textAlign: 'center', padding: 24 }}>
                <p className="muted" style={{ margin: 0, fontSize: 13 }}>
                  {visitors.isLoading
                    ? (ar ? 'جارٍ تحميل الزوار...' : 'Loading visitors...')
                    : (ar ? 'لا يوجد زوار مطابقون' : 'No matching visitors')}
                </p>
              </div>
            )}
          </div>

          {/* Pagination Controls */}
          {visitors.data?.pagination && visitors.data.pagination.totalPages > 1 && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 0',
                flexWrap: 'wrap',
                gap: 10,
              }}
            >
              <span className="muted" style={{ fontSize: 12.5 }}>
                {ar
                  ? `صفحة ${visitors.data.pagination.page} من ${visitors.data.pagination.totalPages} (إجمالي ${visitors.data.pagination.total} زائر)`
                  : `Page ${visitors.data.pagination.page} of ${visitors.data.pagination.totalPages} (${visitors.data.pagination.total} visitors)`}
              </span>

              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  type="button"
                  className="analytics-btn-pill secondary"
                  style={{ minHeight: 32, padding: '4px 10px', fontSize: 12 }}
                  disabled={visitors.data.pagination.page <= 1 || visitors.isFetching}
                  onClick={() => setVisitorPage(prev => Math.max(1, prev - 1))}
                >
                  <ChevronRight size={14} style={{ transform: ar ? 'none' : 'rotate(180deg)' }} />
                  <span>{ar ? 'السابق' : 'Previous'}</span>
                </button>

                <button
                  type="button"
                  className="analytics-btn-pill secondary"
                  style={{ minHeight: 32, padding: '4px 10px', fontSize: 12 }}
                  disabled={visitors.data.pagination.page >= visitors.data.pagination.totalPages || visitors.isFetching}
                  onClick={() => setVisitorPage(prev => prev + 1)}
                >
                  <span>{ar ? 'التالي' : 'Next'}</span>
                  <ChevronLeft size={14} style={{ transform: ar ? 'none' : 'rotate(180deg)' }} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════ */}
      {/* 5. TAB: Live Stream (النشاط المباشر)                          */}
      {/* ═════════════════════════════════════════════════════════════ */}
      {activeTab === 'live' && liveData && can(user.role, 'analytics.read') && (
        <div className="analytics-tab-pane">
          <div className="analytics-card">
            <div className="analytics-live-feed-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className="analytics-live-dot" />
                <strong style={{ fontSize: 14.5 }}>
                  {ar ? 'النشاط الحي المباشر (آخر 5 دقائق)' : 'Live Store Activity (Last 5 mins)'}
                </strong>
              </div>

              <div className="analytics-live-filter-chips">
                {[
                  { id: 'all', label: ar ? 'الكل' : 'All' },
                  { id: 'page_view', label: ar ? 'زيارات' : 'Views' },
                  { id: 'product_view', label: ar ? 'منتجات' : 'Products' },
                  { id: 'whatsapp_click', label: ar ? 'واتساب' : 'WhatsApp' },
                  { id: 'search', label: ar ? 'بحث' : 'Search' },
                ].map(chip => (
                  <button
                    key={chip.id}
                    className={`analytics-live-chip ${liveFilter === chip.id ? 'active' : ''}`}
                    onClick={() => setLiveFilter(chip.id)}
                  >
                    {chip.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Hot Pages chips */}
            {liveData.hotPages.length > 0 && (
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
                <span className="muted" style={{ fontSize: 12, alignSelf: 'center', marginInlineEnd: 4 }}>
                  {ar ? 'الصفحات النشطة الآن:' : 'Hot Pages Now:'}
                </span>
                {liveData.hotPages.map(p => (
                  <span key={p.path} className="analytics-hot-page-chip">
                    {p.path.split('/').slice(-2).join('/') || '/'} <strong>({p.count})</strong>
                  </span>
                ))}
              </div>
            )}

            {/* Events List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {filteredEvents.slice(0, 15).map((e, i) => {
                const deviceIcon =
                  e.deviceClass === 'mobile' ? (
                    <Smartphone size={13} />
                  ) : e.deviceClass === 'tablet' ? (
                    <Tablet size={13} />
                  ) : (
                    <Monitor size={13} />
                  );

                const label = e.productModel || e.path.split('/').slice(-1)[0] || e.path;

                const badgeClass =
                  e.type === 'whatsapp_click'
                    ? 'whatsapp'
                    : e.type === 'search'
                    ? 'search'
                    : 'view';

                const typeLabel: Record<string, string> = {
                  page_view: ar ? 'زيارة صفحة' : 'Page View',
                  product_view: ar ? 'مشاهدة منتج' : 'Product View',
                  whatsapp_click: ar ? 'نقرة واتساب' : 'WhatsApp Click',
                  search: ar ? 'بحث في المتجر' : 'Search Query',
                  filter_used: ar ? 'استخدام فلتر' : 'Filter Used',
                };

                return (
                  <div key={i} className="analytics-event-card">
                    <span className="muted" title={e.deviceClass}>
                      {deviceIcon}
                    </span>
                    <span className={`analytics-event-badge ${badgeClass}`}>
                      {typeLabel[e.type] ?? e.type}
                    </span>
                    <span className="analytics-event-info" title={label}>
                      {label}
                    </span>
                    <span className="analytics-event-time">
                      {new Date(e.createdAt).toLocaleTimeString(
                        lang === 'ar' ? 'ar-YE' : 'en-GB',
                        { timeStyle: 'short' }
                      )}
                    </span>
                  </div>
                );
              })}

              {!filteredEvents.length && (
                <p className="muted" style={{ textAlign: 'center', padding: 20, fontSize: 13 }}>
                  {ar ? 'لا يوجد نشاط مسجل في آخر 5 دقائق بهذا الفلتر' : 'No recorded activity in the last 5 minutes'}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Visitor Journey & Activity Modal */}
      {selectedVisitorHash && (
        <VisitorJourneyModal
          visitorHash={selectedVisitorHash}
          onClose={() => setSelectedVisitorHash(null)}
          ar={ar}
          lang={lang}
        />
      )}

      {/* Overdue Follow-ups */}
      {can(user.role, 'crm.read') && <OverdueFollowups ar={ar} />}
    </div>
  );
}

// ─── Overdue Followups Warning ────────────────────────────────────────────────

function OverdueFollowups({ ar }: { ar: boolean }) {
  const { data } = useQuery({
    queryKey: ['crm-summary'],
    queryFn: () => api<{ newLeads: number; overdueFollowups: number }>('/crm/summary'),
  });

  if (!data?.overdueFollowups) return null;

  return (
    <div
      style={{
        display: 'flex',
        gap: 10,
        alignItems: 'center',
        padding: '12px 16px',
        background: '#f2a93b16',
        border: '1px solid #f2a93b45',
        borderRadius: 12,
        marginTop: 8,
      }}
    >
      <AlertTriangle size={18} style={{ color: '#b45309', flexShrink: 0 }} />
      <span style={{ fontSize: 13.5, fontWeight: 600 }}>
        {ar
          ? `لديك ${data.overdueFollowups} استفسار تجاوز موعد المتابعة المحدد — راجع قسم إدارة العملاء (CRM)`
          : `${data.overdueFollowups} inquiries overdue for follow-up — check the CRM section`}
      </span>
    </div>
  );
}

// ─── Main Export ──────────────────────────────────────────────────────────────

export function Analytics() {
  const { lang } = useI18n();
  const { user } = useSession();
  const ar = lang === 'ar';
  const isLimited = !can(user.role, 'analytics.read') && can(user.role, 'analytics.limited');

  if (isLimited) {
    return <SalesAnalyticsView ar={ar} />;
  }
  return <FullAnalyticsView ar={ar} lang={lang} />;
}
