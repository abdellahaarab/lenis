import { createHmac } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import type { PrismaClient } from '@prisma/client';
import type { AppConfig } from './config.js';
import { resolveGeo, parseDevice, getClientIp } from './geo-device.js';

// Allowed event types matching the EventType enum in Prisma schema
const ALLOWED_TYPES = new Set([
  'page_view', 'product_view', 'whatsapp_click',
  'filter_used', 'compare_used', 'search',
  'form_submit', 'bundle_view',
]);

// Persistent visitor hash keyed on client vid when available, or IP as fallback
function calculateVisitorHash(ip: string, vid: string | undefined, config: AppConfig): string {
  if (vid && typeof vid === 'string' && vid.length > 5) {
    return createHmac('sha256', config.SESSION_SECRET)
      .update(`visitor_id:${vid.trim()}`)
      .digest('hex');
  }
  // Fallback to IP hash
  return createHmac('sha256', config.SESSION_SECRET)
    .update(`visitor_ip:${ip}`)
    .digest('hex');
}

// Session hash — rotates every hour or based on vid + hour
function calculateSessionHash(ip: string, ua: string, vid: string | undefined, config: AppConfig): string {
  const hour = new Date().toISOString().slice(0, 13); // YYYY-MM-DDTHH
  const base = vid ? `session:${hour}:${vid}` : `session:${hour}:${ip}:${ua}`;
  return createHmac('sha256', config.SESSION_SECRET)
    .update(base)
    .digest('hex');
}

function extractReferrer(raw: string | undefined): string | null {
  if (!raw) return null;
  try {
    const url = new URL(raw);
    return url.hostname.replace(/^www\./, '').slice(0, 254) || null;
  } catch {
    return null;
  }
}

export async function analyticsRoutes(app: FastifyInstance, db: PrismaClient, config: AppConfig) {
  // Support text/plain payload from navigator.sendBeacon
  if (!app.hasContentTypeParser('text/plain')) {
    app.addContentTypeParser(['text/plain', 'text/plain;charset=UTF-8'], { parseAs: 'string' }, (_req, body, done) => {
      try {
        done(null, JSON.parse(body as string));
      } catch {
        done(null, {});
      }
    });
  }

  // Public lightweight event ingestion — no auth, no CSRF (fire-and-forget via sendBeacon)
  app.post('/api/analytics/event', {
    config: { public: true },
  }, async (request, reply) => {
    let body = request.body as Record<string, unknown> | string | undefined;
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch {
        body = {};
      }
    }
    const data = (body && typeof body === 'object') ? body as Record<string, unknown> : {};

    // Validate type
    const type = typeof data?.type === 'string' ? data.type : null;
    if (!type || !ALLOWED_TYPES.has(type)) {
      return reply.code(204).send();
    }

    // Validate path
    const path = typeof data?.path === 'string' ? data.path.slice(0, 500) : '/';

    // Optional productId — must be a non-empty string
    const productId = typeof data?.productId === 'string' && data.productId.length > 0
      ? data.productId
      : null;

    // Language
    const lang = data?.lang === 'en' ? 'en' : 'ar';

    // UTM params — only safe keys allowed
    let utm: Record<string, unknown> | null = null;
    if (data?.utm && typeof data.utm === 'object' && !Array.isArray(data.utm)) {
      const allowed = ['source', 'medium', 'campaign', 'content', 'term', 'query'];
      const raw = data.utm as Record<string, unknown>;
      const filtered = Object.fromEntries(
        allowed.filter(k => typeof raw[k] === 'string').map(k => [k, String(raw[k]).slice(0, 200)])
      );
      if (Object.keys(filtered).length > 0) utm = filtered;
    }

    const ip = getClientIp(request);
    const ua = (request.headers['user-agent'] as string | undefined) ?? '';
    const referrer = extractReferrer(request.headers.referer as string | undefined);

    const hints = (data?.hints && typeof data.hints === 'object') ? data.hints as { tz?: string; screen?: string; locale?: string } : undefined;
    const vid = typeof data?.vid === 'string' ? data.vid : undefined;
    const sessionNum = typeof data?.sessionNum === 'number' ? data.sessionNum : 1;

    // Deep resolution of Geo and Device
    const geo = resolveGeo(request, hints);
    const device = parseDevice(ua, hints);

    // Enrich UTM payload with structured geo, device and client metadata
    const enrichedUtm = {
      ...(utm ?? {}),
      geo: {
        country: geo.country,
        countryCode: geo.countryCode,
        city: geo.city,
        region: geo.region,
        flag: geo.flag,
      },
      device: {
        class: device.deviceClass,
        os: device.os,
        browser: device.browser,
        brand: device.brand,
        screen: device.screen,
      },
      client: {
        vid: vid ? String(vid).slice(0, 64) : null,
        sessionNum,
      },
    };

    const vHash = calculateVisitorHash(ip, vid, config);
    const sHash = calculateSessionHash(ip, ua, vid, config);

    try {
      await db.analyticsEvent.create({
        data: {
          type: type as any,
          path,
          productId,
          visitorHash: vHash,
          sessionHash: sHash,
          referrerHost: referrer,
          utm: enrichedUtm as any,
          deviceClass: device.deviceClass,
          lang: lang as any,
        },
      });
    } catch {
      // In case productId was orphaned or foreign key constraint failed, retry without productId
      if (productId) {
        try {
          await db.analyticsEvent.create({
            data: {
              type: type as any,
              path,
              productId: null,
              visitorHash: vHash,
              sessionHash: sHash,
              referrerHost: referrer,
              utm: enrichedUtm as any,
              deviceClass: device.deviceClass,
              lang: lang as any,
            },
          });
        } catch { /* silently ignore */ }
      }
    }

    // 204 No Content — sendBeacon does not wait for a body anyway
    return reply.code(204).send();
  });
}
