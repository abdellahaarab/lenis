import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  History, TrendingUp, TrendingDown, Minus,
  Calendar, User, Tag, Package, ChevronLeft, ChevronRight,
  ArrowUpRight, ArrowDownRight, RefreshCw, AlertTriangle
} from 'lucide-react';
import { api } from './api';
import { useI18n } from './i18n';
import { Loading, ErrorBox } from './components';

interface PriceHistoryEntry {
  id: string;
  productId: string;
  product: { title: unknown; model: string; category: string; slug: string };
  user: { name: string; role: string };
  priceUsd: string | null;
  originalPriceUsd: string | null;
  discountPercent: string | null;
  changeType: string;
  reason: string | null;
  changedAt: string;
}

interface PriceHistoryResponse {
  total: number;
  page: number;
  pageSize: number;
  items: PriceHistoryEntry[];
}

const categoryNames: Record<string, { ar: string; en: string }> = {
  all: { ar: 'كل الفئات', en: 'All Categories' },
  laptops: { ar: 'لابتوبات', en: 'Laptops' },
  displays: { ar: 'شاشات', en: 'Displays' },
  storage: { ar: 'تخزين', en: 'Storage' },
  'hard-drives': { ar: 'أقراص صلبة', en: 'Hard Drives' },
  network: { ar: 'شبكات', en: 'Networking' },
  gaming: { ar: 'قيمنق', en: 'Gaming' },
  power: { ar: 'طاقة', en: 'Power' },
  audio: { ar: 'صوتيات', en: 'Audio' },
  printers: { ar: 'طابعات', en: 'Printers' },
  cameras: { ar: 'كاميرات', en: 'Cameras' },
  accessories: { ar: 'ملحقات', en: 'Accessories' },
};

const changeTypeLabels: Record<string, { ar: string; en: string; color: string }> = {
  price:           { ar: 'تغيير سعر',    en: 'Price Change',    color: '#3b82f6' },
  discount:        { ar: 'تغيير خصم',    en: 'Discount Change', color: '#f59e0b' },
  both:            { ar: 'سعر + خصم',    en: 'Price & Discount', color: '#8b5cf6' },
  clear_discounts: { ar: 'حذف الخصم',    en: 'Discount Cleared', color: '#ef4444' },
};

function getTitle(title: unknown, lang: 'ar' | 'en', model: string): string {
  if (typeof title === 'string') return title;
  if (title && typeof title === 'object') {
    const t = title as Record<string, unknown>;
    if (typeof t[lang] === 'string') return t[lang] as string;
    if (typeof t.ar === 'string') return t.ar as string;
  }
  return model;
}

function PriceChangeIndicator({ before, after, prefix = '$' }: { before: number | null; after: number | null; prefix?: string }) {
  if (after === null) return <span style={{ color: 'var(--muted)', fontSize: '12px' }}>—</span>;
  if (before === null || before === after) {
    return <span style={{ fontWeight: 700, fontSize: '13px' }}>{prefix}{after.toFixed(2)}</span>;
  }
  const diff = after - before;
  const isUp = diff > 0;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
        {isUp
          ? <ArrowUpRight size={14} style={{ color: '#ef4444' }} />
          : <ArrowDownRight size={14} style={{ color: '#10b981' }} />
        }
        <strong style={{ fontSize: '13px', color: isUp ? '#ef4444' : '#10b981' }}>
          {prefix}{after.toFixed(2)}
        </strong>
      </div>
      <small style={{ fontSize: '10px', color: 'var(--muted)', textDecoration: 'line-through' }}>
        {prefix}{before.toFixed(2)}
      </small>
    </div>
  );
}

export function PriceHistoryView() {
  const { lang } = useI18n();
  const ar = lang === 'ar';
  const say = (a: string, e: string) => (ar ? a : e);

  const [category, setCategory] = useState('all');
  const [changeType, setChangeType] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 50;

  const queryKey = ['pricing-history', { category, changeType, from, to, page }];

  const historyQuery = useQuery<PriceHistoryResponse>({
    queryKey,
    queryFn: () => {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
        ...(category && category !== 'all' ? { category } : {}),
        ...(changeType ? { changeType } : {}),
        ...(from ? { from } : {}),
        ...(to ? { to } : {}),
      });
      return api<PriceHistoryResponse>(`/commerce/pricing/history?${params.toString()}`);
    },
    staleTime: 30_000,
  });

  if (historyQuery.isPending) return <Loading />;
  if (historyQuery.isError) return <ErrorBox code="load_failed" />;

  const { total, items } = historyQuery.data;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  // نبني map للأسعار السابقة بالمنتج لعرض "قبل/بعد"
  // Build a map of previous prices per product for before/after display
  const prevPriceMap: Record<string, { priceUsd: number | null; originalPriceUsd: number | null }> = {};

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
        <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(139, 92, 246, 0.15)', color: '#7c3aed', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <History size={22} />
        </div>
        <div>
          <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700 }}>
            {say('سجل تغييرات الأسعار والخصومات', 'Price & Discount Change Log')}
          </h2>
          <small style={{ color: 'var(--muted)' }}>
            {say(`${total.toLocaleString()} سجل إجمالي`, `${total.toLocaleString()} total records`)}
          </small>
        </div>
        <button
          type="button"
          className="button secondary"
          style={{ marginInlineStart: 'auto', padding: '6px 12px', fontSize: '12px' }}
          onClick={() => historyQuery.refetch()}
          disabled={historyQuery.isFetching}
        >
          <RefreshCw size={14} className={historyQuery.isFetching ? 'animate-spin' : ''} />
          <span>{say('تحديث', 'Refresh')}</span>
        </button>
      </div>

      {/* Filters Bar */}
      <div
        className="card"
        style={{
          padding: '14px 16px',
          borderRadius: '12px',
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '12px',
          alignItems: 'center',
        }}
      >
        {/* Category Filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Package size={14} style={{ color: 'var(--muted)' }} />
          <select
            value={category}
            onChange={e => { setCategory(e.target.value); setPage(1); }}
            style={{ padding: '6px 10px', borderRadius: '8px', fontSize: '12px', border: '1px solid var(--border)', background: 'var(--surface-soft)' }}
          >
            {Object.entries(categoryNames).map(([k, v]) => (
              <option key={k} value={k}>{v[lang]}</option>
            ))}
          </select>
        </div>

        {/* Change Type Filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Tag size={14} style={{ color: 'var(--muted)' }} />
          <select
            value={changeType}
            onChange={e => { setChangeType(e.target.value); setPage(1); }}
            style={{ padding: '6px 10px', borderRadius: '8px', fontSize: '12px', border: '1px solid var(--border)', background: 'var(--surface-soft)' }}
          >
            <option value="">{say('كل الأنواع', 'All Types')}</option>
            {Object.entries(changeTypeLabels).map(([k, v]) => (
              <option key={k} value={k}>{v[lang]}</option>
            ))}
          </select>
        </div>

        {/* Date Range */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Calendar size={14} style={{ color: 'var(--muted)' }} />
          <input
            type="date"
            value={from}
            onChange={e => { setFrom(e.target.value); setPage(1); }}
            style={{ padding: '6px 8px', borderRadius: '8px', fontSize: '12px', border: '1px solid var(--border)', background: 'var(--surface-soft)' }}
          />
          <span style={{ fontSize: '11px', color: 'var(--muted)' }}>{say('إلى', 'to')}</span>
          <input
            type="date"
            value={to}
            onChange={e => { setTo(e.target.value); setPage(1); }}
            style={{ padding: '6px 8px', borderRadius: '8px', fontSize: '12px', border: '1px solid var(--border)', background: 'var(--surface-soft)' }}
          />
        </div>

        {(category !== 'all' || changeType || from || to) && (
          <button
            type="button"
            className="button secondary"
            style={{ padding: '5px 10px', fontSize: '11px' }}
            onClick={() => { setCategory('all'); setChangeType(''); setFrom(''); setTo(''); setPage(1); }}
          >
            {say('مسح الفلاتر', 'Clear Filters')}
          </button>
        )}
      </div>

      {/* Table */}
      <div
        className="card"
        style={{
          padding: 0,
          borderRadius: '14px',
          overflow: 'hidden',
          border: '1px solid var(--border)',
          background: 'var(--surface)',
        }}
      >
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: ar ? 'right' : 'left', fontSize: '13px' }}>
            <thead>
              <tr style={{ background: 'var(--surface-soft)', borderBottom: '1px solid var(--border)', color: 'var(--muted)', fontWeight: 700, fontSize: '11px' }}>
                <th style={{ padding: '12px 14px' }}>{say('المنتج', 'Product')}</th>
                <th style={{ padding: '12px 14px' }}>{say('الفئة', 'Category')}</th>
                <th style={{ padding: '12px 14px' }}>{say('نوع التغيير', 'Change Type')}</th>
                <th style={{ padding: '12px 14px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span>{say('السعر الجديد', 'New Price')}</span>
                    <small style={{ fontWeight: 400, color: 'var(--muted)' }}>{say('(السابق مشطوب)', '(prev. crossed)')}</small>
                  </div>
                </th>
                <th style={{ padding: '12px 14px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span>{say('الخصم الجديد', 'New Discount')}</span>
                    <small style={{ fontWeight: 400, color: 'var(--muted)' }}>{say('(السعر الأصلي)', '(original price)')}</small>
                  </div>
                </th>
                <th style={{ padding: '12px 14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <TrendingUp size={13} />
                    <span>{say('التغيير', 'Change')}</span>
                  </div>
                </th>
                <th style={{ padding: '12px 14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <User size={13} />
                    <span>{say('بواسطة', 'By')}</span>
                  </div>
                </th>
                <th style={{ padding: '12px 14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Calendar size={13} />
                    <span>{say('التاريخ', 'Date')}</span>
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ padding: '48px', textAlign: 'center' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', color: 'var(--muted)' }}>
                      <AlertTriangle size={32} style={{ opacity: 0.5 }} />
                      <strong>{say('لا توجد سجلات تطابق الفلاتر', 'No records match the filters')}</strong>
                    </div>
                  </td>
                </tr>
              ) : (
                items.map((entry, idx) => {
                  const title = getTitle(entry.product.title, lang, entry.product.model);
                  const newPrice = entry.priceUsd ? parseFloat(entry.priceUsd) : null;
                  const origPrice = entry.originalPriceUsd ? parseFloat(entry.originalPriceUsd) : null;
                  const discountPct = entry.discountPercent ? parseFloat(entry.discountPercent) : null;
                  const typeInfo = changeTypeLabels[entry.changeType] ?? changeTypeLabels.price;
                  const isClear = entry.changeType === 'clear_discounts';

                  // Calculate price delta for the same product comparing to next entry
                  const nextSameProduct = items.slice(idx + 1).find(e => e.productId === entry.productId);
                  const prevPrice = nextSameProduct?.priceUsd ? parseFloat(nextSameProduct.priceUsd) : null;
                  const delta = newPrice !== null && prevPrice !== null ? newPrice - prevPrice : null;
                  const prevOrig = nextSameProduct?.originalPriceUsd ? parseFloat(nextSameProduct.originalPriceUsd) : null;

                  return (
                    <tr
                      key={entry.id}
                      style={{
                        borderBottom: '1px solid var(--border)',
                        transition: 'background 0.1s',
                      }}
                    >
                      {/* Product */}
                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          <strong style={{ fontSize: '13px' }}>{title}</strong>
                          <small style={{ color: 'var(--muted)', fontSize: '11px', fontFamily: 'monospace' }}>{entry.product.model}</small>
                        </div>
                      </td>

                      {/* Category */}
                      <td style={{ padding: '12px 14px' }}>
                        <span style={{ fontSize: '11px', background: 'var(--surface-soft)', padding: '2px 8px', borderRadius: '6px', fontWeight: 600 }}>
                          {categoryNames[entry.product.category]?.[lang] ?? entry.product.category}
                        </span>
                      </td>

                      {/* Change Type */}
                      <td style={{ padding: '12px 14px' }}>
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          fontSize: '11px',
                          fontWeight: 700,
                          color: typeInfo.color,
                          background: `${typeInfo.color}18`,
                          padding: '2px 8px',
                          borderRadius: '6px'
                        }}>
                          {isClear ? <Minus size={11} /> : <Tag size={11} />}
                          {typeInfo[lang]}
                        </span>
                      </td>

                      {/* New Price (with prev) */}
                      <td style={{ padding: '12px 14px' }}>
                        <PriceChangeIndicator before={prevPrice} after={newPrice} />
                      </td>

                      {/* Discount / Original Price */}
                      <td style={{ padding: '12px 14px' }}>
                        {isClear ? (
                          <span style={{ fontSize: '11px', color: '#ef4444', fontWeight: 700 }}>
                            {say('تم حذف الخصم', 'Cleared')}
                          </span>
                        ) : origPrice ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            <PriceChangeIndicator before={prevOrig} after={origPrice} />
                            {discountPct !== null && discountPct > 0 && (
                              <span style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '3px',
                                fontSize: '10px',
                                fontWeight: 700,
                                color: '#ef4444',
                                background: 'rgba(239,68,68,0.1)',
                                padding: '1px 5px',
                                borderRadius: '4px',
                                alignSelf: 'flex-start'
                              }}>
                                -{discountPct.toFixed(0)}%
                              </span>
                            )}
                          </div>
                        ) : (
                          <span style={{ color: 'var(--muted)', fontSize: '11px' }}>—</span>
                        )}
                      </td>

                      {/* Delta Indicator */}
                      <td style={{ padding: '12px 14px' }}>
                        {delta !== null ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 700, fontSize: '12px' }}>
                            {delta > 0
                              ? <><TrendingUp size={14} style={{ color: '#ef4444' }} /><span style={{ color: '#ef4444' }}>+${delta.toFixed(2)}</span></>
                              : delta < 0
                              ? <><TrendingDown size={14} style={{ color: '#10b981' }} /><span style={{ color: '#10b981' }}>${delta.toFixed(2)}</span></>
                              : <><Minus size={14} style={{ color: 'var(--muted)' }} /><span style={{ color: 'var(--muted)' }}>$0</span></>
                            }
                          </div>
                        ) : (
                          <span style={{ color: 'var(--muted)', fontSize: '11px' }}>—</span>
                        )}
                      </td>

                      {/* Changed By */}
                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          <span style={{ fontSize: '12px', fontWeight: 600 }}>{entry.user.name}</span>
                          <small style={{ fontSize: '10px', color: 'var(--muted)' }}>{entry.user.role}</small>
                        </div>
                      </td>

                      {/* Date */}
                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          <span style={{ fontSize: '11px', fontWeight: 600 }}>
                            {new Date(entry.changedAt).toLocaleDateString(lang === 'ar' ? 'ar-YE' : 'en-GB')}
                          </span>
                          <small style={{ color: 'var(--muted)', fontSize: '10px' }}>
                            {new Date(entry.changedAt).toLocaleTimeString(lang === 'ar' ? 'ar-YE' : 'en-GB', { hour: '2-digit', minute: '2-digit' })}
                          </small>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 18px', borderTop: '1px solid var(--border)', fontSize: '12px', background: 'var(--surface-soft)' }}>
            <span style={{ color: 'var(--muted)' }}>
              {say(`عرض ${(page - 1) * pageSize + 1} - ${Math.min(page * pageSize, total)} من ${total}`,
                   `Showing ${(page - 1) * pageSize + 1} - ${Math.min(page * pageSize, total)} of ${total}`)}
            </span>
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
              <button type="button" className="button secondary" disabled={page <= 1} onClick={() => setPage(p => p - 1)} style={{ padding: '5px 8px', fontSize: '11px' }}>
                {ar ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
              </button>
              <span style={{ fontWeight: 700, padding: '4px 8px' }}>{page} / {totalPages}</span>
              <button type="button" className="button secondary" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} style={{ padding: '5px 8px', fontSize: '11px' }}>
                {ar ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default PriceHistoryView;
