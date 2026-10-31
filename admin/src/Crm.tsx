import { useState, useCallback } from 'react';
import { Plus, Search, Phone, Mail, Building2, MessageCircle, ChevronLeft, ChevronRight, StickyNote, PhoneCall, ArrowRight, FileText, AlertTriangle, Tag, Calendar } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { api, ApiError } from './api';
import { useI18n } from './i18n';
import { useSession } from './App';
import { can } from '@aljeel/shared';
import { Loading, ErrorBox } from './components';

// ─── Types ───────────────────────────────────────────────────────────────────

type LeadStatus = 'new' | 'contacted' | 'quoted' | 'won' | 'lost';
type LeadSource = 'brief_builder' | 'quote_form' | 'contact_form' | 'product_inquiry' | 'whatsapp_click' | 'walk_in' | 'phone' | 'manual' | 'exhibition_contest';

interface Lead {
  id: string;
  source: LeadSource;
  status: LeadStatus;
  lostReason: string | null;
  payload: Record<string, unknown>;
  productId: string | null;
  assignedToId: string | null;
  nextFollowUpAt: string | null;
  createdAt: string;
  updatedAt: string;
  customer: { id: string; name: string | null; phone: string | null; email: string | null; type: string } | null;
  product: { id: string; title: Record<string, string>; model: string; category: string; images: { media: { originalPath: string } }[] } | null;
  assignedTo: { id: string; name: string; role: string } | null;
  _count: { activities: number };
}

interface LeadDetail extends Lead {
  activities: {
    id: string;
    type: string;
    body: string;
    createdAt: string;
    user: { id: string; name: string; role: string };
  }[];
  quotes: { id: string; total: string; currency: string; status: string; createdAt: string }[];
}

interface Customer {
  id: string; name: string | null; phone: string | null; email: string | null;
  city: string | null; type: string; company: string | null;
  createdAt: string; _count: { leads: number; quotes: number; sales: number };
}

// ─── Status config ────────────────────────────────────────────────────────────

const statusConfig = {
  new: { labelAr: 'جديد', labelEn: 'New', color: '#f2a93b', bg: '#f2a93b18' },
  contacted: { labelAr: 'تم التواصل', labelEn: 'Contacted', color: '#3b82f6', bg: '#3b82f618' },
  quoted: { labelAr: 'تم التسعير', labelEn: 'Quoted', color: '#8b5cf6', bg: '#8b5cf618' },
  won: { labelAr: 'ناجح', labelEn: 'Won', color: '#24865f', bg: '#24865f18' },
  lost: { labelAr: 'ملغي', labelEn: 'Lost', color: '#b62d49', bg: '#b62d4918' },
};

const sourceLabels: Record<LeadSource, string> = {
  brief_builder: 'محدد المواصفات',
  quote_form: 'طلب عرض سعر',
  contact_form: 'نموذج التواصل',
  product_inquiry: 'استفسار منتج',
  whatsapp_click: 'واتساب',
  walk_in: 'زيارة مباشرة',
  phone: 'اتصال هاتفي',
  manual: 'إدخال يدوي',
  exhibition_contest: 'معرض / مسابقة',
};

const activityIcons: Record<string, typeof StickyNote> = {
  note: StickyNote,
  call: PhoneCall,
  whatsapp: MessageCircle,
  status_change: ArrowRight,
  assignment: Tag,
};

// ─── Status badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status, ar }: { status: LeadStatus; ar: boolean }) {
  const cfg = statusConfig[status];
  return (
    <span style={{ background: cfg.bg, color: cfg.color, borderRadius: 20, padding: '3px 10px', fontSize: 12, fontWeight: 700 }}>
      {ar ? cfg.labelAr : cfg.labelEn}
    </span>
  );
}

// ─── Lead row card ────────────────────────────────────────────────────────────

function LeadCard({ lead, ar, onClick }: { lead: Lead; ar: boolean; onClick: () => void }) {
  const isOverdue = lead.nextFollowUpAt && new Date(lead.nextFollowUpAt) < new Date() && !['won', 'lost'].includes(lead.status);
  const productTitle = lead.product
    ? ((lead.product.title as Record<string, string>)[ar ? 'ar' : 'en'] ?? lead.product.model)
    : null;

  return (
    <button
      className="crm-lead-card"
      onClick={onClick}
      style={{ borderColor: isOverdue ? '#f2a93b80' : undefined }}
    >
      <div className="crm-lead-card-top">
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4 }}>
            <strong style={{ fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {lead.customer?.name ?? (ar ? 'عميل غير مسمى' : 'Unnamed customer')}
            </strong>
            {isOverdue && <AlertTriangle size={13} style={{ color: '#f2a93b', flexShrink: 0 }} />}
          </div>
          <div style={{ fontSize: 12, color: 'var(--muted)', display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {lead.customer?.phone && <span><Phone size={11} /> {lead.customer.phone}</span>}
            <span>{sourceLabels[lead.source]}</span>
          </div>
        </div>
        <StatusBadge status={lead.status} ar={ar} />
      </div>

      {productTitle && (
        <div style={{ fontSize: 12, marginTop: 6, padding: '5px 9px', background: 'var(--bg)', borderRadius: 7, color: 'var(--muted)' }}>
          📦 {productTitle}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 11, color: 'var(--muted)' }}>
        <span>{new Date(lead.createdAt).toLocaleDateString(ar ? 'ar-YE' : 'en-GB')}</span>
        <span>{lead._count.activities} {ar ? 'نشاط' : 'activities'}</span>
        {lead.assignedTo && <span>👤 {lead.assignedTo.name}</span>}
      </div>
    </button>
  );
}

// ─── Lead detail modal ────────────────────────────────────────────────────────

function LeadDetailModal({ leadId, onClose, ar }: { leadId: string; onClose: () => void; ar: boolean }) {
  const qc = useQueryClient();
  const { user } = useSession();
  const canEdit = can(user.role, 'crm.edit');

  const { data: lead, isLoading } = useQuery({
    queryKey: ['crm-lead', leadId],
    queryFn: () => api<LeadDetail>(`/crm/leads/${leadId}`),
  });

  const [activityType, setActivityType] = useState<'note' | 'call' | 'whatsapp'>('note');
  const [activityBody, setActivityBody] = useState('');

  const addActivity = useMutation({
    mutationFn: () => api(`/crm/leads/${leadId}/activities`, { method: 'POST', body: { type: activityType, body: activityBody } }),
    onSuccess: () => {
      setActivityBody('');
      qc.invalidateQueries({ queryKey: ['crm-lead', leadId] });
      qc.invalidateQueries({ queryKey: ['crm-leads'] });
    },
  });

  const updateStatus = useMutation({
    mutationFn: (status: LeadStatus) => api(`/crm/leads/${leadId}`, { method: 'PATCH', body: { status } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['crm-lead', leadId] });
      qc.invalidateQueries({ queryKey: ['crm-leads'] });
    },
  });

  if (isLoading) return (
    <>
      <div className="overlay" onClick={onClose} />
      <div className="modal"><Loading /></div>
    </>
  );
  if (!lead) return null;

  const productTitle = lead.product
    ? ((lead.product.title as Record<string, string>)[ar ? 'ar' : 'en'] ?? lead.product.model)
    : null;

  return (
    <>
      <div className="overlay" onClick={onClose} />
      <div className="modal" style={{ width: 'min(94vw, 640px)', maxHeight: '88dvh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
          <div>
            <h2 style={{ fontSize: 18, marginBottom: 4 }}>
              {lead.customer?.name ?? (ar ? 'استفسار بدون اسم' : 'Unnamed lead')}
            </h2>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <StatusBadge status={lead.status} ar={ar} />
              <span className="muted" style={{ fontSize: 12 }}>{sourceLabels[lead.source]}</span>
            </div>
          </div>
          <button className="icon-button modal-close" onClick={onClose}>✕</button>
        </div>

        <div style={{ overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Customer info */}
          <div className="card" style={{ padding: '12px 16px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {lead.customer?.phone && <div><Phone size={12} className="muted" /> <span style={{ fontSize: 13 }}>{lead.customer.phone}</span></div>}
              {lead.customer?.email && <div><Mail size={12} className="muted" /> <span style={{ fontSize: 13 }}>{lead.customer.email}</span></div>}
              {lead.nextFollowUpAt && (
                <div>
                  <Calendar size={12} className="muted" />
                  <span style={{ fontSize: 13 }}>
                    {ar ? ' متابعة: ' : ' Follow-up: '}
                    {new Date(lead.nextFollowUpAt).toLocaleDateString(ar ? 'ar-YE' : 'en-GB')}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Product */}
          {productTitle && (
            <div className="card" style={{ padding: '10px 16px', display: 'flex', gap: 10, alignItems: 'center' }}>
              {lead.product?.images?.[0]?.media?.originalPath && (
                <img
                  src={`/media/${lead.product.images[0].media.originalPath}`}
                  style={{ width: 44, height: 44, objectFit: 'contain', borderRadius: 7, background: 'var(--surface-soft)' }}
                  alt=""
                />
              )}
              <div>
                <strong style={{ fontSize: 13 }}>{productTitle}</strong>
                <br />
                <span className="muted" style={{ fontSize: 12 }}>{lead.product?.category}</span>
              </div>
            </div>
          )}

          {/* Quotes */}
          {lead.quotes.length > 0 && (
            <div className="card" style={{ padding: '12px 16px' }}>
              <strong style={{ fontSize: 13, display: 'block', marginBottom: 8 }}>
                <FileText size={13} /> {ar ? 'عروض الأسعار' : 'Quotes'}
              </strong>
              {lead.quotes.map(q => (
                <div key={q.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border)', fontSize: 13 }}>
                  <span>{Number(q.total).toFixed(2)} {q.currency}</span>
                  <span className="muted">{q.status}</span>
                  <span className="muted">{new Date(q.createdAt).toLocaleDateString()}</span>
                </div>
              ))}
            </div>
          )}

          {/* Status pipeline */}
          {canEdit && (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {(['new', 'contacted', 'quoted', 'won', 'lost'] as LeadStatus[]).map(s => {
                const cfg = statusConfig[s];
                const isActive = lead.status === s;
                return (
                  <button
                    key={s}
                    onClick={() => updateStatus.mutate(s)}
                    disabled={isActive || updateStatus.isPending}
                    style={{
                      borderRadius: 20, padding: '5px 12px', fontSize: 12, fontWeight: 700,
                      border: `1px solid ${cfg.color}60`,
                      background: isActive ? cfg.bg : 'transparent',
                      color: isActive ? cfg.color : 'var(--muted)',
                      cursor: isActive ? 'default' : 'pointer',
                    }}
                  >
                    {ar ? cfg.labelAr : cfg.labelEn}
                  </button>
                );
              })}
            </div>
          )}

          {/* Activity timeline */}
          <div>
            <strong style={{ fontSize: 13, display: 'block', marginBottom: 8 }}>{ar ? 'سجل النشاط' : 'Activity Log'}</strong>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {lead.activities.map(a => {
                const Icon = activityIcons[a.type] ?? StickyNote;
                return (
                  <div key={a.id} style={{ display: 'flex', gap: 10 }}>
                    <div style={{ width: 28, height: 28, borderRadius: 8, background: 'var(--surface-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Icon size={13} style={{ color: 'var(--primary-text)' }} />
                    </div>
                    <div style={{ flex: 1, background: 'var(--bg)', borderRadius: 8, padding: '8px 12px' }}>
                      <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 3 }}>
                        <strong>{a.user.name}</strong> · {new Date(a.createdAt).toLocaleString(ar ? 'ar-YE' : 'en-GB', { dateStyle: 'short', timeStyle: 'short' })}
                      </div>
                      <div style={{ fontSize: 13 }}>{a.body}</div>
                    </div>
                  </div>
                );
              })}
              {!lead.activities.length && (
                <p className="muted" style={{ fontSize: 13, textAlign: 'center', padding: 16 }}>
                  {ar ? 'لا يوجد نشاط مسجل بعد' : 'No activity yet'}
                </p>
              )}
            </div>
          </div>

          {/* Add activity */}
          {canEdit && (
            <div className="card" style={{ padding: '12px 16px' }}>
              <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
                {(['note', 'call', 'whatsapp'] as const).map(t => (
                  <button
                    key={t}
                    onClick={() => setActivityType(t)}
                    className="button subtle"
                    style={{ background: activityType === t ? 'var(--surface-soft)' : 'transparent', fontSize: 12 }}
                  >
                    {t === 'note' ? (ar ? 'ملاحظة' : 'Note') : t === 'call' ? (ar ? 'مكالمة' : 'Call') : 'WhatsApp'}
                  </button>
                ))}
              </div>
              <textarea
                value={activityBody}
                onChange={e => setActivityBody(e.target.value)}
                placeholder={ar ? 'أضف ملاحظة أو تفاصيل التواصل…' : 'Add a note or contact detail…'}
                style={{ width: '100%', minHeight: 72, resize: 'vertical', borderRadius: 9, border: '1px solid var(--border)', padding: '8px 12px', fontSize: 14, background: 'var(--surface)', color: 'var(--text)' }}
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
                <button
                  className="button primary"
                  disabled={!activityBody.trim() || addActivity.isPending}
                  onClick={() => addActivity.mutate()}
                >
                  {addActivity.isPending ? (ar ? 'جارٍ الحفظ…' : 'Saving…') : (ar ? 'إضافة' : 'Add')}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// ─── New Lead Modal ───────────────────────────────────────────────────────────

function NewLeadModal({ onClose, ar }: { onClose: () => void; ar: boolean }) {
  const qc = useQueryClient();
  const { register, handleSubmit, formState: { isSubmitting } } = useForm({
    defaultValues: { source: 'manual' as LeadSource, customerName: '', customerPhone: '', customerCity: '' },
  });
  const [error, setError] = useState('');

  const onSubmit = handleSubmit(async values => {
    setError('');
    try {
      await api('/crm/leads', { method: 'POST', body: values });
      qc.invalidateQueries({ queryKey: ['crm-leads'] });
      onClose();
    } catch (e) {
      setError(e instanceof ApiError ? e.code : 'failed');
    }
  });

  return (
    <>
      <div className="overlay" onClick={onClose} />
      <div className="modal">
        <h2 style={{ marginBottom: 16 }}>{ar ? 'استفسار جديد' : 'New Lead'}</h2>
        <button className="icon-button modal-close" onClick={onClose}>✕</button>
        <form onSubmit={onSubmit}>
          <ErrorBox code={error} />
          <label>
            {ar ? 'اسم العميل' : 'Customer name'}
            <input {...register('customerName')} />
          </label>
          <label>
            {ar ? 'رقم الهاتف' : 'Phone number'}
            <input dir="ltr" {...register('customerPhone')} />
          </label>
          <label>
            {ar ? 'المدينة' : 'City'}
            <input {...register('customerCity')} />
          </label>
          <label>
            {ar ? 'مصدر الاستفسار' : 'Lead source'}
            <select {...register('source')}>
              {Object.entries(sourceLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </label>
          <div className="dialog-actions">
            <button type="button" className="button secondary" onClick={onClose}>{ar ? 'إلغاء' : 'Cancel'}</button>
            <button type="submit" className="button primary" disabled={isSubmitting}>
              {isSubmitting ? (ar ? 'جارٍ الحفظ…' : 'Saving…') : (ar ? 'إنشاء الاستفسار' : 'Create lead')}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}

// ─── Main CRM component ───────────────────────────────────────────────────────

export function Crm() {
  const { lang } = useI18n();
  const { user } = useSession();
  const ar = lang === 'ar';
  const canEdit = can(user.role, 'crm.edit');

  const [statusFilter, setStatusFilter] = useState<LeadStatus | ''>('');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [page, setPage] = useState(1);
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [showNewLead, setShowNewLead] = useState(false);
  const [tab, setTab] = useState<'leads' | 'customers'>('leads');

  const leads = useQuery({
    queryKey: ['crm-leads', statusFilter, search, page],
    queryFn: () => api<{ items: Lead[]; total: number; page: number; pageSize: number; statusCounts: Record<string, number> }>(
      `/crm/leads?${new URLSearchParams({ ...(statusFilter ? { status: statusFilter } : {}), page: String(page), pageSize: '24' }).toString()}`
    ),
    placeholderData: prev => prev,
  });

  const customers = useQuery({
    queryKey: ['crm-customers', search, page],
    queryFn: () => api<{ items: Customer[]; total: number }>(`/crm/customers?${new URLSearchParams({ q: search, page: String(page) }).toString()}`),
    enabled: tab === 'customers',
  });

  const handleSearch = useCallback(() => { setSearch(searchInput); setPage(1); }, [searchInput]);

  const counts = leads.data?.statusCounts ?? {};
  const statuses: LeadStatus[] = ['new', 'contacted', 'quoted', 'won', 'lost'];

  return (
    <div className="dashboard-view">
      {/* Header */}
      <div className="page-heading" style={{ marginBottom: 16 }}>
        <div>
          <span className="eyebrow">{ar ? 'علاقات العملاء' : 'CRM'}</span>
          <h1>{ar ? 'الاستفسارات والعملاء' : 'Leads & Customers'}</h1>
        </div>
        {canEdit && (
          <button className="button primary" onClick={() => setShowNewLead(true)}>
            <Plus size={16} />
            {ar ? 'استفسار جديد' : 'New Lead'}
          </button>
        )}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 16, borderBottom: '1px solid var(--border)' }}>
        {(['leads', 'customers'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              padding: '8px 16px', fontSize: 14, fontWeight: 700,
              border: 'none', background: 'transparent',
              borderBottom: tab === t ? '2px solid var(--primary)' : '2px solid transparent',
              color: tab === t ? 'var(--primary-text)' : 'var(--muted)',
              cursor: 'pointer',
            }}
          >
            {t === 'leads' ? (ar ? 'الاستفسارات' : 'Leads') : (ar ? 'العملاء' : 'Customers')}
          </button>
        ))}
      </div>

      {/* LEADS TAB */}
      {tab === 'leads' && (
        <>
          {/* Status pipeline tabs */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
            <button
              onClick={() => { setStatusFilter(''); setPage(1); }}
              style={{
                borderRadius: 20, padding: '5px 14px', fontSize: 13, fontWeight: 700,
                background: !statusFilter ? 'var(--primary)' : 'var(--surface)',
                color: !statusFilter ? '#fff' : 'var(--muted)',
                border: '1px solid var(--border)',
              }}
            >
              {ar ? 'الكل' : 'All'} ({leads.data?.total ?? 0})
            </button>
            {statuses.map(s => {
              const cfg = statusConfig[s];
              const isActive = statusFilter === s;
              return (
                <button
                  key={s}
                  onClick={() => { setStatusFilter(s); setPage(1); }}
                  style={{
                    borderRadius: 20, padding: '5px 14px', fontSize: 13, fontWeight: 700,
                    background: isActive ? cfg.bg : 'var(--surface)',
                    color: isActive ? cfg.color : 'var(--muted)',
                    border: `1px solid ${isActive ? cfg.color + '60' : 'var(--border)'}`,
                  }}
                >
                  {ar ? cfg.labelAr : cfg.labelEn} {counts[s] ? `(${counts[s]})` : ''}
                </button>
              );
            })}
          </div>

          {/* Lead cards grid */}
          {leads.isLoading ? <Loading /> : (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 12, marginBottom: 16 }}>
                {leads.data?.items.map(lead => (
                  <LeadCard key={lead.id} lead={lead} ar={ar} onClick={() => setSelectedLeadId(lead.id)} />
                ))}
              </div>
              {!leads.data?.items.length && (
                <div className="table-empty">
                  {ar ? 'لا توجد استفسارات مطابقة' : 'No matching leads'}
                </div>
              )}
              {/* Pagination */}
              {(leads.data?.total ?? 0) > 24 && (
                <div className="pagination">
                  <span className="muted">{leads.data?.total} {ar ? 'استفسار' : 'leads'}</span>
                  <div>
                    <button className="button secondary" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
                      <ChevronRight size={16} />
                    </button>
                    <span style={{ fontSize: 13, padding: '0 12px' }}>{page}</span>
                    <button className="button secondary" disabled={(page * 24) >= (leads.data?.total ?? 0)} onClick={() => setPage(p => p + 1)}>
                      <ChevronLeft size={16} />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* CUSTOMERS TAB */}
      {tab === 'customers' && (
        <>
          <div className="table-card card">
            <div className="table-toolbar">
              <div className="search-field">
                <Search size={15} />
                <input
                  placeholder={ar ? 'ابحث بالاسم أو الهاتف…' : 'Search name or phone…'}
                  value={searchInput}
                  onChange={e => setSearchInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSearch()}
                />
              </div>
              <button className="button secondary" onClick={handleSearch}>{ar ? 'بحث' : 'Search'}</button>
            </div>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>{ar ? 'الاسم' : 'Name'}</th>
                    <th>{ar ? 'الهاتف' : 'Phone'}</th>
                    <th>{ar ? 'النوع' : 'Type'}</th>
                    <th>{ar ? 'الاستفسارات' : 'Leads'}</th>
                    <th>{ar ? 'العروض' : 'Quotes'}</th>
                    <th>{ar ? 'تاريخ الإضافة' : 'Added'}</th>
                  </tr>
                </thead>
                <tbody>
                  {customers.data?.items.map(c => (
                    <tr key={c.id}>
                      <td>
                        <div className="person-cell">
                          <span className="avatar" style={{ width: 32, height: 32, fontSize: 13 }}>{(c.name ?? '?').charAt(0)}</span>
                          <div>
                            <strong style={{ fontSize: 13 }}>{c.name ?? '—'}</strong>
                            {c.company && <span style={{ display: 'block', fontSize: 11, color: 'var(--muted)' }}><Building2 size={10} /> {c.company}</span>}
                          </div>
                        </div>
                      </td>
                      <td dir="ltr" style={{ fontSize: 13 }}>{c.phone ?? '—'}</td>
                      <td>
                        <span className="role-badge" style={{ fontSize: 11 }}>{c.type === 'business' ? (ar ? 'شركة' : 'Business') : (ar ? 'فرد' : 'Individual')}</span>
                      </td>
                      <td style={{ textAlign: 'center' }}>{c._count.leads}</td>
                      <td style={{ textAlign: 'center' }}>{c._count.quotes}</td>
                      <td style={{ fontSize: 12, color: 'var(--muted)' }}>{new Date(c.createdAt).toLocaleDateString(ar ? 'ar-YE' : 'en-GB')}</td>
                    </tr>
                  ))}
                  {!customers.data?.items.length && (
                    <tr><td colSpan={6} className="table-empty">{ar ? 'لا يوجد عملاء' : 'No customers'}</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Modals */}
      {selectedLeadId && <LeadDetailModal leadId={selectedLeadId} onClose={() => setSelectedLeadId(null)} ar={ar} />}
      {showNewLead && <NewLeadModal onClose={() => setShowNewLead(false)} ar={ar} />}
    </div>
  );
}
