import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ScrollText } from 'lucide-react';
import { api, ApiError } from './api';
import { useI18n } from './i18n';
import { ErrorBox, Loading } from './components';
export function Audit() {
  const { t, date } = useI18n(); const [page, setPage] = useState(1);
  const query = useQuery({ queryKey: ['audit', page], queryFn: () => api<{ items: { id: string; action: string; entity: string; createdAt: string }[]; total: number }>(`/audit?page=${page}&pageSize=20`) });
  return <><div className="page-heading"><div><span className="eyebrow">{t('protected')}</span><h1>{t('audit')}</h1><p className="muted">{t('auditDescription')}</p></div></div><section className="card table-card">{query.isPending ? <Loading/> : query.isError ? <ErrorBox code={query.error instanceof ApiError ? query.error.code : 'failed'}/> : query.data.items.length === 0 ? <div className="table-empty">{t('auditEmpty')}</div> : <div className="audit-list">{query.data.items.map(item => <div className="audit-row" key={item.id}><span className="section-icon soft"><ScrollText size={18}/></span><div><strong>{t(item.action)}</strong><small>{t(item.entity)}</small></div><time dateTime={item.createdAt}>{date(item.createdAt)}</time></div>)}</div>}<div className="pagination"><span>{t('page')} {page}</span><div><button className="button secondary" disabled={page === 1} onClick={() => setPage(page - 1)}>{t('previous')}</button><button className="button secondary" disabled={!query.data || page * 20 >= query.data.total} onClick={() => setPage(page + 1)}>{t('next')}</button></div></div></section></>;
}
