/**
 * Analytics tracker for the public storefront.
 * Uses navigator.sendBeacon — fire-and-forget, never blocks rendering.
 * All data is sent to /api/analytics/event which hashes the IP server-side.
 */

type EventType =
  | 'page_view'
  | 'product_view'
  | 'whatsapp_click'
  | 'filter_used'
  | 'compare_used'
  | 'search'
  | 'form_submit'
  | 'bundle_view';

interface TrackOptions {
  productId?: string;
  utm?: Record<string, string>;
  query?: string; // for search events
}

function getLang(): 'ar' | 'en' {
  const docLang = document.documentElement.lang;
  if (docLang?.startsWith('ar')) return 'ar';
  const stored = localStorage.getItem('language') ?? localStorage.getItem('lang');
  return stored === 'ar' ? 'ar' : 'en';
}

function getUtmFromUrl(): Record<string, string> | undefined {
  const params = new URLSearchParams(window.location.search);
  const utm: Record<string, string> = {};
  for (const key of ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term']) {
    const val = params.get(key);
    if (val) utm[key.replace('utm_', '')] = val.slice(0, 100);
  }
  return Object.keys(utm).length > 0 ? utm : undefined;
}

// ─── Persistent Visitor ID & Client Hints ────────────────────────────────────

function getVisitorId(): string {
  try {
    let vid = localStorage.getItem('aljeel_vid');
    if (!vid) {
      vid = 'v_' + Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
      localStorage.setItem('aljeel_vid', vid);
    }
    return vid;
  } catch {
    return '';
  }
}

function getSessionNumber(): number {
  try {
    const isNew = !sessionStorage.getItem('aljeel_session_active');
    let count = parseInt(localStorage.getItem('aljeel_sessions_count') || '1', 10);
    if (isNew) {
      sessionStorage.setItem('aljeel_session_active', '1');
      if (localStorage.getItem('aljeel_vid')) {
        count += 1;
        localStorage.setItem('aljeel_sessions_count', String(count));
      }
    }
    return count;
  } catch {
    return 1;
  }
}

function getClientHints(): Record<string, string> {
  try {
    return {
      tz: Intl.DateTimeFormat().resolvedOptions().timeZone || '',
      screen: `${window.screen.width}x${window.screen.height}`,
      locale: navigator.language || '',
    };
  } catch {
    return {};
  }
}

export function track(type: EventType, options: TrackOptions = {}): void {
  try {
    const utm = options.utm ?? getUtmFromUrl();
    const finalUtm = options.query
      ? { ...(utm ?? {}), query: options.query.slice(0, 200) }
      : utm;

    const payload = JSON.stringify({
      type,
      path: window.location.pathname,
      lang: getLang(),
      vid: getVisitorId(),
      sessionNum: getSessionNumber(),
      hints: getClientHints(),
      ...(options.productId ? { productId: options.productId } : {}),
      ...(finalUtm ? { utm: finalUtm } : {}),
    });

    let sent = false;
    if (typeof navigator.sendBeacon === 'function') {
      try {
        const blob = new Blob([payload], { type: 'application/json' });
        sent = navigator.sendBeacon('/api/analytics/event', blob);
      } catch {
        sent = false;
      }
    }

    if (!sent) {
      fetch('/api/analytics/event', {
        method: 'POST',
        body: payload,
        headers: { 'Content-Type': 'application/json' },
        keepalive: true,
        priority: 'low' as RequestPriority,
      }).catch(() => { /* silently ignore */ });
    }
  } catch {
    // Analytics must never break the page
  }
}

/** Track a page_view — call once on mount in each page component */
export function trackPageView(): void {
  track('page_view');
}

/** Track product_view — call when a product detail page loads */
export function trackProductView(productId: string): void {
  track('product_view', { productId });
}

/** Track whatsapp_click — call when user taps the WhatsApp button */
export function trackWhatsappClick(productId?: string): void {
  track('whatsapp_click', { productId });
}

/** Track filter_used — call when user applies a filter in shop */
export function trackFilterUsed(): void {
  track('filter_used');
}

/** Track search — call when user submits or types a search query */
export function trackSearch(query: string): void {
  track('search', { query });
}

/** Track compare_used — call when user uses product comparison */
export function trackCompareUsed(): void {
  track('compare_used');
}

/** Track bundle_view — call when bundle/package page loads */
export function trackBundleView(): void {
  track('bundle_view');
}
