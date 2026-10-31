import Fastify, { type FastifyError } from 'fastify';
import cookie from '@fastify/cookie';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import fastifyStatic, { type FastifyStaticOptions } from '@fastify/static';
import {fileURLToPath} from 'node:url';
import {existsSync} from 'node:fs';
import { validatorCompiler, serializerCompiler, jsonSchemaTransform } from '@fastify/type-provider-zod';
import { Prisma, type PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { can, EmptySchema } from '@aljeel/shared';
import type { AppConfig } from './config.js';
import { ApiError } from './errors.js';
import { hashToken, safeEqual } from './security.js';
import { authRoutes } from './routes-auth.js';
import { staffRoutes } from './routes-staff.js';
import {contentRoutes,publicContentRoutes} from './routes-content.js';
import './auth-context.js';
import {commerceRoutes} from './routes-commerce.js';
import {commerceAdminRoutes} from './routes-commerce-admin.js';
import {publicContestRoutes, contestAdminRoutes} from './routes-contest.js';
import {analyticsRoutes} from './routes-analytics.js';
import {analyticsAdminRoutes} from './routes-analytics-admin.js';
import {crmRoutes} from './routes-crm.js';

import { renderSeoHtml, getBaseUrl } from './seo-meta.js';
import { generateSitemapXml } from './sitemap.js';

export async function buildApp(config: AppConfig, db: PrismaClient, options: { disableRateLimits?: boolean } = {}) {
  const app = Fastify({ bodyLimit: 32 * 1024, trustProxy: config.TRUST_PROXY, disableRequestLogging: config.NODE_ENV === 'production', logger: config.LOG_LEVEL === 'silent' ? false : {
    level: config.LOG_LEVEL, redact: ['req.headers.cookie', 'req.headers.authorization', 'req.headers["x-csrf-token"]', 'res.headers["set-cookie"]'],
    serializers: { req: request => ({ id: request.id, method: request.method, path: request.url?.split('?')[0] }), res: reply => ({ statusCode: reply.statusCode }) },
  } });
  app.decorateRequest('auth', null);
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);
  await app.register(cookie, { secret: config.SESSION_SECRET });
  await app.register(helmet, { global: true, hsts: config.NODE_ENV === 'production' ? { maxAge: 31536000, includeSubDomains: true } : false, contentSecurityPolicy: { directives: { defaultSrc: ["'self'"], imgSrc: ["'self'", 'data:', 'blob:', 'https:'], styleSrc: ["'self'", "'unsafe-inline'"], fontSrc: ["'self'"], scriptSrc: ["'self'"], connectSrc: ["'self'"], frameAncestors: ["'none'"], ...(config.NODE_ENV !== 'production' ? { upgradeInsecureRequests: null } : {}) } } });
  await app.register(cors, { credentials: true, origin: (origin, callback) => callback(null, !origin || config.ALLOWED_ORIGINS.includes(origin)), methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'], allowedHeaders: ['Content-Type', 'X-CSRF-Token'] });
  await app.register(rateLimit, { global: !options.disableRateLimits, max: 120, timeWindow: '1 minute', errorResponseBuilder: () => ({ statusCode: 429, error: { code: 'rate_limited' } }) });
  if (config.NODE_ENV === 'development') {
    await app.register(swagger, { openapi: { info: { title: 'Al-Jeel Admin API', version: '0.1.0' } }, transform: jsonSchemaTransform });
    await app.register(swaggerUi, { routePrefix: '/api/docs', staticCSP: true });
  }
  app.setErrorHandler<FastifyError>((error, request, reply) => {
    reply.header('Cache-Control', 'no-store');
    if (error instanceof ApiError) return reply.code(error.statusCode).send({ error: { code: error.code } });
    if (error instanceof z.ZodError || error.validation) return reply.code(400).send({ error: { code: 'validation_failed' } });
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') return reply.code(409).send({ error: { code: 'already_exists' } });
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') return reply.code(409).send({ error: { code: 'in_use' } });
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') return reply.code(404).send({ error: { code: 'not_found' } });
    if (error.statusCode && error.statusCode < 500) return reply.code(error.statusCode).send({ error: { code: error.statusCode === 429 ? 'rate_limited' : 'request_failed' } });
    request.log.error({ name: error.name, code: error.code, requestId: request.id }, 'Request failed');
    return reply.code(500).send({ error: { code: 'server_error' } });
  });
  app.get('/api/health', { schema: { querystring: EmptySchema } }, async (_request, reply) => {
    reply.header('Cache-Control', 'no-store');
    try {
      // A successful connection alone does not verify access to application tables.
      await db.$queryRaw`SELECT id FROM Product LIMIT 1`;
      await db.$queryRaw`SELECT id FROM ProductVariant LIMIT 1`;
      await db.$queryRaw`SELECT id FROM ShoppingCart LIMIT 1`;
      await db.$queryRaw`SELECT \`key\` FROM SiteSetting LIMIT 1`;
      return { status: 'ok' };
    }
    catch { return reply.code(503).send({ status: 'unavailable' }); }
  });
  await publicContentRoutes(app,db);
  await commerceRoutes(app,db,config);
  await publicContestRoutes(app,db,config);
  await analyticsRoutes(app,db,config);
  app.get('/sitemap.xml', async (request, reply) => {
    try {
      const xml = await generateSitemapXml(db, config, request);
      return reply
        .header('Content-Type', 'application/xml; charset=utf-8')
        .header('Cache-Control', 'public, max-age=3600, s-maxage=86400')
        .send(xml);
    } catch (err) {
      request.log.error({ err }, 'Failed to generate sitemap.xml');
      return reply.code(500).send('Error generating sitemap');
    }
  });
  app.get('/robots.txt', async (request, reply) => {
    const baseUrl = getBaseUrl(request, config).replace(/\/+$/, '');
    const robots = `User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /api/admin\n\nSitemap: ${baseUrl}/sitemap.xml\n`;
    return reply
      .header('Content-Type', 'text/plain; charset=utf-8')
      .header('Cache-Control', 'public, max-age=86400')
      .send(robots);
  });
  await app.register(async admin => {
    admin.addHook('onRequest', async (request, reply) => {
      reply.header('Cache-Control', 'no-store').header('X-Robots-Tag', 'noindex, nofollow');
      const route = request.routeOptions.config;
      if (!route.public) {
        const raw = request.cookies.aljeel_session;
        if (!raw) throw new ApiError(401, 'unauthenticated');
        const session = await db.session.findUnique({ where: { id: hashToken(raw) }, include: { user: true } });
        const now = Date.now();
        if (!session || !session.user.isActive || session.expiresAt.getTime() <= now || session.lastSeenAt.getTime() + config.SESSION_IDLE_MINUTES * 60000 <= now || (session.user.lockedUntil && session.user.lockedUntil.getTime() > now)) {
          if (session) await db.session.deleteMany({ where: { id: session.id } });
          throw new ApiError(401, 'unauthenticated');
        }
        request.auth = { session, user: session.user };
        if (session.user.mustChangePassword && !route.allowPasswordChange) throw new ApiError(403, 'password_change_required');
        if (config.REQUIRE_OWNER_2FA && session.user.role === 'owner' && !session.user.totpSecret && !route.allowPasswordChange) throw new ApiError(403, 'totp_required');
        if (route.permission && !can(session.user.role, route.permission)) throw new ApiError(403, 'forbidden');
        if (now - session.lastSeenAt.getTime() > 60000) await db.session.updateMany({ where: { id: session.id }, data: { lastSeenAt: new Date() } });
      }
      if (!['GET', 'HEAD', 'OPTIONS'].includes(request.method)) {
        const origin = request.headers.origin;
        const header = request.headers['x-csrf-token'];
        const signed = request.cookies.aljeel_csrf;
        const unsigned = signed ? request.unsignCookie(signed) : null;
        if (!origin || !config.ALLOWED_ORIGINS.includes(origin) || typeof header !== 'string' || !unsigned?.valid || !unsigned.value || !safeEqual(header, unsigned.value)) throw new ApiError(403, 'csrf_invalid');
      }
    });
    await authRoutes(admin, db, config, options.disableRateLimits ?? false);
    await staffRoutes(admin, db, config);
    await contentRoutes(admin,db,config);
    await commerceAdminRoutes(admin,db,config);
    await contestAdminRoutes(admin,db,config);
    await analyticsAdminRoutes(admin,db,config);
    await crmRoutes(admin,db,config);
    admin.get('/dashboard', { schema: { querystring: EmptySchema } }, async request => ({phase:'launch',hasBusinessData:true,...(can(request.auth!.user.role,'catalog.edit')?{products:await db.product.count(),published:await db.product.count({where:{status:'published'}})}:{})}));
  }, { prefix: '/api/admin' });
  let spaRoots:{root:string;adminRoot:string}|undefined;
  if(config.NODE_ENV==='production'||config.SERVE_STATIC){
    const root=fileURLToPath(new URL('../../dist/',import.meta.url)),adminRoot=fileURLToPath(new URL('../../admin/dist/',import.meta.url));
    if(existsSync(root)&&existsSync(adminRoot)){
      const setHeaders: NonNullable<FastifyStaticOptions['setHeaders']> = (reply, filePath) => {
        const path = filePath.replaceAll('\\', '/');
        // Vite changes these URLs whenever their content changes, including on redeploy.
        const fingerprinted = /\/assets\/[^/]+-[a-zA-Z0-9_-]{8,}\.(?:js|css)$/.test(path);
        reply.header('Cache-Control', fingerprinted
          ? 'public, max-age=31536000, immutable'
          : path.endsWith('.html') ? 'no-cache, max-age=0, must-revalidate'
          : 'public, max-age=3600, must-revalidate');
      };
      await app.register(fastifyStatic,{root,prefix:'/',decorateReply:true,setHeaders});
      await app.register(fastifyStatic,{root:adminRoot,prefix:'/admin/',decorateReply:false,setHeaders});
      // Resolve the default language before rendering the SPA's navigation and footer.
      app.get('/',async(_request,reply)=>reply.header('Cache-Control','no-cache').redirect('/ar',302));
      app.get('/admin',async(_req,reply)=>reply.redirect('/admin/'));
      app.addHook('onSend',async(request,reply,payload)=>{
        if(request.url.startsWith('/admin')){
          reply.header('X-Robots-Tag','noindex, nofollow');
          const path=request.url.split('?')[0];
          const publicAsset=[200,206,304].includes(reply.statusCode)&&/^\/admin\/(?:assets|fonts)\//.test(path)
            &&String(reply.getHeader('Cache-Control')??'').startsWith('public,');
          if(!publicAsset)reply.header('Cache-Control','no-store');
        }
        return payload;
      });
      spaRoots={root,adminRoot};
    }
  }
  app.setNotFoundHandler(async (request, reply) => {
    const path=request.url.split('?')[0];
    if(spaRoots&&['GET','HEAD'].includes(request.method)&&!path.startsWith('/api')&&!path.split('/').pop()?.includes('.')){
      // Discover the home hero before downloading and executing the React bundle.
      if(/^\/(?:ar|en)\/?$/.test(path))reply.header('Link','</images/home-reference/laptop.webp>; rel=preload; as=image; fetchpriority=high');
      if(path.startsWith('/admin/')||path==='/admin')return reply.type('text/html').sendFile('index.html',spaRoots.adminRoot);
      try {
        const html = await renderSeoHtml({
          distRoot: spaRoots.root,
          path,
          request,
          config,
          db,
        });
        return reply
          .header('Cache-Control', 'no-cache, max-age=0, must-revalidate')
          .type('text/html; charset=utf-8')
          .send(html);
      } catch (err) {
        request.log?.warn?.({ err, path }, 'SEO HTML rendering failed, falling back to static file');
        return reply.type('text/html').sendFile('index.html', spaRoots.root);
      }
    }
    return reply.code(404).send({error:{code:'not_found'}});
  });
  return app;
}



