import { describe, it, expect } from 'vitest';
import { can } from '@aljeel/shared';
import { resolveGeo, parseDevice } from '../src/geo-device.js';
import type { FastifyRequest } from 'fastify';

describe('Analytics & CRM permissions matrix', () => {
  it('owner has full access to analytics and crm', () => {
    expect(can('owner', 'analytics.read')).toBe(true);
    expect(can('owner', 'crm.read')).toBe(true);
    expect(can('owner', 'crm.edit')).toBe(true);
  });

  it('manager has full access to analytics and crm', () => {
    expect(can('manager', 'analytics.read')).toBe(true);
    expect(can('manager', 'crm.read')).toBe(true);
    expect(can('manager', 'crm.edit')).toBe(true);
  });

  it('viewer can read analytics and crm but cannot edit', () => {
    expect(can('viewer', 'analytics.read')).toBe(true);
    expect(can('viewer', 'crm.read')).toBe(true);
    expect(can('viewer', 'crm.edit')).toBe(false);
  });

  it('sales has limited analytics and can read/edit CRM leads and quotes', () => {
    expect(can('sales', 'analytics.limited')).toBe(true);
    expect(can('sales', 'analytics.read')).toBe(false);
    expect(can('sales', 'crm.read')).toBe(true);
    expect(can('sales', 'crm.edit')).toBe(true);
  });

  it('editor has no access to crm or analytics', () => {
    expect(can('editor', 'analytics.read')).toBe(false);
    expect(can('editor', 'crm.read')).toBe(false);
    expect(can('editor', 'crm.edit')).toBe(false);
  });
});

describe('Geo & Device Intelligence Engine (geo-device.ts)', () => {
  it('resolves Cloudflare headers correctly', () => {
    const mockReq = {
      headers: {
        'cf-ipcountry': 'SA',
        'cf-ipcity': 'Riyadh',
        'cf-region': 'Riyadh Region',
      },
      ip: '185.12.34.56',
    } as unknown as FastifyRequest;

    const geo = resolveGeo(mockReq);

    expect(geo.country).toBe('السعودية');
    expect(geo.countryCode).toBe('SA');
    expect(geo.flag).toBe('🇸🇦');
    expect(geo.city).toBe('Riyadh');
  });

  it('resolves Yemen timezone and local IP network ranges', () => {
    const mockReq = {
      headers: {},
      ip: '134.35.10.20',
    } as unknown as FastifyRequest;

    const geo = resolveGeo(mockReq, { tz: 'Asia/Aden' });
    expect(geo.country).toBe('اليمن');
    expect(geo.countryCode).toBe('YE');
    expect(geo.flag).toBe('🇾🇪');
    expect(geo.city).toBe('صنعاء');
  });

  it('parses User-Agent for OS, Browser, and Brand', () => {
    const mobileUA = 'Mozilla/5.0 (Linux; Android 14; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36';
    const parsed = parseDevice(mobileUA, { screen: '412x915' });

    expect(parsed.deviceClass).toBe('mobile');
    expect(parsed.os).toContain('Android 14');
    expect(parsed.browser).toBe('Chrome 120');
    expect(parsed.brand).toBe('Samsung Galaxy');
    expect(parsed.screen).toBe('412x915');
  });

  it('parses iPhone and iOS accurately', () => {
    const iphoneUA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1';
    const parsed = parseDevice(iphoneUA, { screen: '393x852' });

    expect(parsed.deviceClass).toBe('mobile');
    expect(parsed.os).toBe('iOS 17.4');
    expect(parsed.browser).toBe('Safari 17');
    expect(parsed.brand).toBe('Apple iPhone');
  });
});
