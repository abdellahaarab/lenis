import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { readdir } from 'node:fs/promises';
import type { FastifyInstance } from 'fastify';
import type { PrismaClient } from '@prisma/client';
import { buildApp } from '../src/app.js';
import { ConfigSchema } from '../src/config.js';

let app: FastifyInstance;
const config = ConfigSchema.parse({
  NODE_ENV: 'test', SERVE_STATIC: 'true', DATABASE_URL: 'mysql://localhost/unused',
  SESSION_SECRET: 'static-cache-test-secret-'.repeat(2), TOTP_ENCRYPTION_KEY: 'a'.repeat(64),
  ALLOWED_ORIGINS: 'http://localhost:5174', LOG_LEVEL: 'silent',
});
beforeAll(async () => {
  // These requests require no database access; fail if one is unexpectedly introduced.
  const db = new Proxy({}, { get() { throw new Error('Unexpected database access'); } }) as PrismaClient;
  app = await buildApp(config, db, { disableRateLimits: true });
  await app.ready();
});
afterAll(async () => { await app?.close(); });

describe('cache boundaries in the built application', () => {
  it.each(['', '/admin'])('caches fingerprinted assets at %s and supports revalidation', async prefix => {
    const root = prefix ? '../../admin/dist/assets/' : '../../dist/assets/';
    const files = await readdir(new URL(root, import.meta.url));
    const asset = files.find(file => /^index-.*\.js$/.test(file));
    expect(asset).toBeDefined();
    const response = await app.inject(`${prefix}/assets/${asset}?v=test`);
    expect(response.statusCode).toBe(200);
    expect(response.headers['cache-control']).toBe('public, max-age=31536000, immutable');
    const conditional = await app.inject({ url: `${prefix}/assets/${asset}`, headers: { 'if-none-match': String(response.headers.etag) } });
    expect(conditional.statusCode).toBe(304);
    expect(conditional.headers['cache-control']).toBe('public, max-age=31536000, immutable');
  });
  it.each(['/ar', '/ar/shop', '/index.html'])('revalidates the store HTML at %s', async path => {
    const response = await app.inject(path);
    expect(response.statusCode).toBe(200);
    expect(response.headers['cache-control']).toBe('no-cache, max-age=0, must-revalidate');
  });
  it.each(['/admin/', '/admin/products', '/api/admin/auth/session', '/api/shop/account', '/api/shop/csrf'])('never caches private entry points at %s', async path => {
    const response = await app.inject(path);
    expect(response.statusCode).toBeLessThan(500);
    expect(response.headers['cache-control']).toBe('no-store');
  });
  it('does not grant cache lifetimes to missing admin files', async () => {
    const response = await app.inject('/admin/assets/missing-12345678.js');
    expect(response.statusCode).toBe(404);
    expect(response.headers['cache-control']).toBe('no-store');
  });
  it('redirects the root to Arabic before rendering HTML', async () => {
    const response = await app.inject('/');
    expect(response.statusCode).toBe(302);
    expect(response.headers.location).toBe('/ar');
  });
  it.each(['/ar', '/en', '/ar/', '/en/'])('starts the hero image early on %s', async path => {
    const response = await app.inject(path);
    expect(response.statusCode).toBe(200);
    expect(response.headers.link).toContain('</images/home-reference/laptop.webp>; rel=preload; as=image');
  });
  it.each(['/ar/shop', '/ar/cart', '/admin/'])('does not fetch the home hero on %s', async path => {
    const response = await app.inject(path);
    expect(response.headers.link).toBeUndefined();
  });
});
