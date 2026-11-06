import { SessionResponseSchema, type SessionResponse } from '@aljeel/shared';
let csrfToken = '';
export class ApiError extends Error { constructor(public code: string, public status: number) { super(code); } }
export async function api<T>(path: string, options: { method?: string; body?: unknown } = {}): Promise<T> {
  const method = options.method ?? 'GET';
  if (method !== 'GET' && !csrfToken) {
    const response = await fetch('/api/admin/auth/csrf', { credentials: 'include' });
    if (!response.ok) throw new ApiError('request_failed', response.status);
    if (!response.headers.get('content-type')?.includes('application/json')) throw new ApiError('service_not_configured', 503);
    csrfToken = (await response.json()).csrfToken;
  }
  let response: Response;
  try { response = await fetch(`/api/admin${path}`, { method, credentials: 'include', headers: { ...(options.body !== undefined ? { 'Content-Type': 'application/json' } : {}), ...(method !== 'GET' ? { 'X-CSRF-Token': csrfToken } : {}) }, ...(options.body !== undefined ? { body: JSON.stringify(options.body) } : {}) }); }
  catch { throw new ApiError('disconnected', 0); }
  if (!response.headers.get('content-type')?.includes('application/json')) throw new ApiError('service_not_configured', 503);
  const data = await response.json();
  if (!response.ok) {
    if (data.error?.code === 'csrf_invalid') csrfToken = '';
    if (response.status === 401 && !['/auth/session', '/auth/login'].includes(path)) window.dispatchEvent(new Event('admin-session-expired'));
    throw new ApiError(data.error?.code ?? 'request_failed', response.status);
  }
  if (typeof data.csrfToken === 'string') csrfToken = data.csrfToken;
  return data as T;
}
export async function getSession(): Promise<SessionResponse | null> {
  try { return SessionResponseSchema.parse(await api('/auth/session')); }
  catch (error) { if (error instanceof ApiError && error.status === 401) return null; throw error; }
}
