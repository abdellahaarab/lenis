import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, CheckCircle2, Download, FileSpreadsheet, Loader2, ShieldCheck, UploadCloud } from 'lucide-react';
import { PRODUCT_UPDATE_MAX_BYTES, type ProductUpdateResponse, type ProductUpdatePart } from '@aljeel/shared';
import { api, ApiError } from './api';
import { useI18n } from './i18n';
import { ErrorBox } from './components';
import './product-updates.css';

function readFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',')[1]);
    reader.onerror = () => reject(new Error('تعذر قراءة الملف'));
    reader.readAsDataURL(file);
  });
}
export function ProductUpdates() {
  const { lang } = useI18n();
  const ar = lang === 'ar', say = (a: string, e: string) => ar ? a : e;
  const client = useQueryClient();
  const parts = useQuery({ queryKey: ['product-update-parts'], queryFn: () => api<{ parts: ProductUpdatePart[] }>('/commerce/excel/v2/parts') });
  const [fileName, setFileName] = useState(''), [file, setFile] = useState('');
  const [result, setResult] = useState<ProductUpdateResponse | null>(null);
  const [busy, setBusy] = useState(false), [downloadBusy, setDownloadBusy] = useState(false);
  const [error, setError] = useState(''), [message, setMessage] = useState('');
  const [confirmed, setConfirmed] = useState(false), [page, setPage] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null), generation = useRef(0);
  const download = async (path: string, name: string) => {
    setDownloadBusy(true); setError('');
    try {
      const response = await fetch(`/api/admin/commerce/excel/v2/${path}`, { credentials: 'include' });
      if (!response.ok) { const body = await response.json(); throw new ApiError(body.error?.code ?? 'request_failed', response.status); }
      const url = URL.createObjectURL(await response.blob()), link = document.createElement('a');
      link.href = url; link.download = name; document.body.append(link); link.click(); link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) { setError(e instanceof ApiError ? e.code : 'request_failed'); }
    finally { setDownloadBusy(false); }
  };
  const selectFile = async (selected: File) => {
    const current = ++generation.current;
    setResult(null); setConfirmed(false); setPage(0); setFile(''); setFileName(selected.name); setError(''); setMessage('');
    if (!/\.xlsx$/i.test(selected.name)) { setMessage(say('اختر ملف .xlsx صادرًا من هذه الصفحة؛ الملفات القديمة وCSV غير مدعومة هنا.', 'Choose a .xlsx workbook exported from this page. Legacy files and CSV are not supported here.')); return; }
    if (selected.size > PRODUCT_UPDATE_MAX_BYTES) { setMessage(say('حجم الملف يتجاوز 5 ميجابايت.', 'File exceeds 5 MB.')); return; }
    setBusy(true);
    try {
      const encoded = await readFile(selected);
      const preview = await api<ProductUpdateResponse>('/commerce/excel/v2/preview', { method: 'POST', body: { file: encoded } });
      if (generation.current !== current) return;
      setFile(encoded); setResult(preview);
    } catch (e) { if (generation.current === current) setError(e instanceof ApiError ? e.code : 'request_failed'); }
    finally { if (generation.current === current) setBusy(false); }
  };
  const commit = async () => {
    if (!result?.previewToken || result.errors.length || result.committed) return;
    setBusy(true); setError('');
    try {
      const saved = await api<ProductUpdateResponse>('/commerce/excel/v2/commit', { method: 'POST', body: { file, previewToken: result.previewToken } });
      setResult(saved); setConfirmed(false); setPage(0);
      if (saved.committed) await client.invalidateQueries();
    } catch (e) { setError(e instanceof ApiError ? e.code : 'request_failed'); }
    finally { setBusy(false); }
  };
  const total = result ? result.summary.added + result.summary.updated + result.summary.deleted : 0;
  const destructive = Boolean(result && (result.summary.deleted || result.summary.cleared));
  const rows = result?.previews.slice(page * 25, (page + 1) * 25) ?? [];
  const display = (v: string | number | null) => v === null || v === '' ? say('فارغ', 'Empty') : String(v);
  return <section className="product-updates" dir={ar ? 'rtl' : 'ltr'}>
    <div className="page-heading">
      <div><h1><FileSpreadsheet size={26} /> {say('تحديث الأصناف', 'Product updates')}</h1><p>{say('عدّل أصنافك جماعيًا في Excel، وراجع كل تغيير قبل الحفظ.', 'Edit your catalog in Excel and review every change before saving.')}</p></div>
      <Link className="button secondary" to="/products">{say('إدارة الأصناف', 'Manage products')}</Link>
    </div>
    <ol className="update-steps" aria-label={say('خطوات التحديث', 'Update steps')}>
      {[say('تصدير', 'Export'), say('تعديل Excel', 'Edit Excel'), say('رفع وفحص', 'Upload & validate'), say('معاينة وحفظ', 'Review & save')].map((label, i) => <li key={label}><span>{i + 1}</span>{label}</li>)}
    </ol>
    <div className="update-notice"><ShieldCheck size={21} /><p>{say('الصور والنشر من الموقع فقط. حذف صف لا يحذف الصنف؛ اختر «حذف» في عمود الإجراء. تفريغ الحقل الاختياري يمسح قيمته، وستراه في المعاينة.', 'Images and publishing stay in the website. Removing a row does not delete a product; choose Delete in the action column. Clearing an optional cell erases its value and appears in the review.')}</p></div>
    <ErrorBox code={error || (parts.error instanceof ApiError ? parts.error.code : '')} />
    {message && <p role="alert" className="update-notice update-warning"><AlertTriangle size={18} />{message}</p>}
    <div className="update-panels">
      <section className="card update-panel"><h2><Download size={20} />{say('1. تنزيل الملف', '1. Download workbook')}</h2><p>{say('يتضمن الأصناف الحالية، ورقة التعليمات والقوائم، وورقة الخيارات. الخلايا البيضاء قابلة للتعديل، والرمادية للعرض.', 'Includes current products, instructions and dropdowns, and variants. White cells are editable; grey cells are read-only.')}</p>
        <div className="update-downloads">{parts.isPending ? <p>{say('جاري تجهيز قائمة الملفات…', 'Loading workbook parts…')}</p> : parts.data?.parts.map(part => <button className="button primary" key={part.part} disabled={downloadBusy} onClick={() => void download(`export?part=${part.part}`, `product-updates-${part.part}.xlsx`)}><Download size={16} />{parts.data!.parts.length === 1 ? say('تصدير الأصناف الحالية', 'Export current products') : say(`تنزيل الجزء ${part.part} — ${part.rows} صف`, `Download part ${part.part} — ${part.rows} rows`)}</button>)}
          <button className="button secondary" disabled={downloadBusy} onClick={() => void download('template', 'product-updates-template.xlsx')}>{say('قالب فارغ للإضافات', 'Blank template for additions')}</button>
        </div>
        {parts.data && parts.data.parts.length > 1 && <p className="update-hint">{say('كل ملف مستقل وحدّه 1000 صف. للأصناف الموزعة على أجزاء: عدّل بياناتها المشتركة في جزء واحد، ثم نزّل الأجزاء المتبقية بعد حفظه.', 'Each file is independent and limited to 1,000 rows. For products spanning parts, edit shared data in one part, save it, then download the remaining parts.')}</p>}
      </section>
      <section className="card update-panel"><h2><UploadCloud size={20} />{say('2. رفع الملف وفحصه', '2. Upload & validate')}</h2><p>{say('اختر الملف بعد تعديله. الفحص لا يحفظ أي بيانات، وأي خطأ يمنع حفظ الملف كله.', 'Select your edited workbook. Validation does not save data; any error blocks the entire file.')}</p>
        <label className={`update-upload ${busy ? 'is-busy' : ''}`} onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); if (!busy && e.dataTransfer.files[0]) void selectFile(e.dataTransfer.files[0]); }}>
          {busy ? <Loader2 className="update-spinner" size={30} /> : <UploadCloud size={30} />}
          <strong>{busy ? say('جاري الفحص أو الحفظ…', 'Validating or saving…') : say('اختر ملف Excel أو اسحبه هنا', 'Choose or drop your Excel workbook')}</strong>
          <span>{fileName || say('.xlsx فقط · حتى 5 ميجابايت · 1000 صف', '.xlsx only · up to 5 MB · 1,000 rows')}</span>
          <input ref={inputRef} type="file" accept=".xlsx" disabled={busy} aria-label={say('ملف تحديث الأصناف', 'Product update workbook')} onClick={e => { e.currentTarget.value = ''; }} onChange={e => { if (e.target.files?.[0]) void selectFile(e.target.files[0]); }} />
        </label>
      </section>
    </div>
    {result && <section className="card update-review" aria-live="polite">
      <h2>{result.committed ? <CheckCircle2 size={23} /> : <FileSpreadsheet size={23} />}{result.committed ? say('تم حفظ التحديثات بنجاح', 'Updates saved successfully') : say('3. معاينة التغييرات', '3. Review changes')}</h2>
      <div className="update-summary">{([
        ['added', say('إضافة', 'Added')], ['updated', say('صفوف معدلة', 'Updated rows')], ['deleted', say('حذف', 'Deleted')], ['cleared', say('قيم ممسوحة', 'Cleared values')], ['unchanged', say('بدون تغيير', 'Unchanged')], ['ignored', say('تجاهل', 'Ignored')],
      ] as const).map(([key, label]) => <div key={key}><strong>{result.summary[key]}</strong><span>{label}</span></div>)}</div>
      {result.errors.length > 0 && <div className="update-errors" role="alert"><h3><AlertTriangle size={20} />{say(`يوجد ${result.errors.length} خطأ — لم تُحفظ أي تغييرات`, `${result.errors.length} errors — no changes saved`)}</h3><p>{say('صحّح الخلايا التالية ثم ارفع الملف مجددًا. إذا تغيّرت بيانات الموقع، أعد التصدير.', 'Correct these cells and upload again. If website data changed, export a fresh workbook.')}</p><div className="update-table-wrap"><table><thead><tr>{[say('الورقة', 'Sheet'), say('الصف', 'Row'), say('العمود', 'Column'), say('سبب الخطأ', 'Reason')].map(s => <th key={s}>{s}</th>)}</tr></thead><tbody>{result.errors.map((issue, i) => <tr key={i}><td>{issue.sheet}</td><td>{issue.row || '—'}</td><td>{issue.column || '—'}</td><td>{issue.message}</td></tr>)}</tbody></table></div></div>}
      {!result.committed && !total && !result.errors.length && <p>{say('الملف مطابق للبيانات الحالية؛ لا توجد تغييرات للحفظ.', 'Workbook matches current data; there are no changes to save.')}</p>}
      {rows.length > 0 && <div className="update-table-wrap"><table className="update-change-table"><thead><tr>{[say('الصنف / الصف', 'Product / row'), say('الإجراء', 'Action'), say('الحقل', 'Field'), say('القيمة الحالية', 'Current value'), say('القيمة الجديدة', 'New value')].map(s => <th key={s}>{s}</th>)}</tr></thead><tbody>{rows.flatMap((row, i) => row.changes.map((change, j) => <tr key={`${i}-${j}`} className={change.cleared || row.action === 'حذف' ? 'update-destructive' : ''}><td data-label={say('الصنف / الصف', 'Product / row')}><strong>{row.productName}</strong><small>{row.sheet} · {say('صف', 'row')} {row.row}</small></td><td data-label={say('الإجراء', 'Action')}>{row.action}</td><td data-label={say('الحقل', 'Field')}>{change.column}</td><td data-label={say('القيمة الحالية', 'Current value')}>{display(change.before)}</td><td data-label={say('القيمة الجديدة', 'New value')}>{change.cleared ? <strong>{say('مسح القيمة', 'Clear value')}</strong> : display(change.after)}</td></tr>))}</tbody></table></div>}
      {result.previews.length > 25 && <div className="update-pagination"><button className="button secondary" disabled={!page} onClick={() => setPage(p => p - 1)}>{say('السابق', 'Previous')}</button><span>{page + 1} / {Math.ceil(result.previews.length / 25)}</span><button className="button secondary" disabled={(page + 1) * 25 >= result.previews.length} onClick={() => setPage(p => p + 1)}>{say('التالي', 'Next')}</button></div>}
      {!result.committed && !result.errors.length && total > 0 && <div className="update-save">
        {destructive && <label className="update-ack"><input type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)} disabled={busy} />{say(`راجعت حذف ${result.summary.deleted} صنف ومسح ${result.summary.cleared} قيمة وأريد تنفيذها.`, `I reviewed deletion of ${result.summary.deleted} products and clearing of ${result.summary.cleared} values and want to apply them.`)}</label>}
        <button className="button primary" disabled={busy || (destructive && !confirmed) || !result.previewToken} onClick={() => void commit()}><ShieldCheck size={18} />{say('تأكيد وحفظ جميع التغييرات', 'Confirm & save all changes')}</button>
      </div>}
      {result.committed && <p>{say('يمكنك إعادة التصدير لمتابعة التعديل. الصور وبيانات النشر لم تتغير.', 'Export again to continue editing. Images and publishing data remain intact.')}</p>}
    </section>}
  </section>;
}
