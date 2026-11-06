import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type { ZodTypeProvider } from '@fastify/type-provider-zod';
import type { PrismaClient, Prisma, User } from '@prisma/client';
import { LoginSchema, ChangePasswordSchema, EmptySchema, TotpEnrollSchema, TotpVerifySchema, TotpDisableSchema, SessionResponseSchema } from '@aljeel/shared';
import { z } from 'zod';
import type { AppConfig } from './config.js';
import { transaction } from './db.js';
import { audit } from './audit.js';
import { ApiError } from './errors.js';
import { publicUser } from './users.js';
import { randomToken, hashToken, hashPassword, verifyPassword, ipHash, makeTotp, encryptSecret, totpCounter } from './security.js';

const cookieOptions = (config: AppConfig) => ({ httpOnly: true, secure: config.COOKIE_SECURE, sameSite: 'lax' as const, path: '/api/admin' });
export function issueCsrf(reply: FastifyReply, config: AppConfig): string {
  const csrfToken = randomToken();
  reply.setCookie('aljeel_csrf', csrfToken, { ...cookieOptions(config), signed: true, maxAge: config.SESSION_ABSOLUTE_HOURS * 3600 });
  return csrfToken;
}
async function createSession(tx: Prisma.TransactionClient, userId: string, request: FastifyRequest, config: AppConfig): Promise<string> {
  const token = randomToken();
  await tx.session.create({ data: { id: hashToken(token), userId, expiresAt: new Date(Date.now() + config.SESSION_ABSOLUTE_HOURS * 3600000), userAgent: (request.headers['user-agent'] ?? '').slice(0, 300), ipHash: ipHash(request.ip, config) } });
  return token;
}
function sessionReply(reply: FastifyReply, token: string, user: User, config: AppConfig) {
  reply.setCookie('aljeel_session', token, { ...cookieOptions(config), maxAge: config.SESSION_ABSOLUTE_HOURS * 3600 });
  return { user: publicUser(user), csrfToken: issueCsrf(reply, config) };
}

export async function authRoutes(instance: FastifyInstance, db: PrismaClient, config: AppConfig, disableRateLimits: boolean) {
  const app = instance.withTypeProvider<ZodTypeProvider>();
  const dummyHash = await hashPassword(randomToken());
  const sensitiveLimit = disableRateLimits ? false : { max: 10, timeWindow: '15 minutes' };
  app.get('/auth/csrf', { config: { public: true }, schema: { querystring: EmptySchema } }, async (_request, reply) => ({ csrfToken: issueCsrf(reply, config) }));
  app.post('/auth/login', { config: { public: true, rateLimit: sensitiveLimit }, schema: { body: LoginSchema, querystring: EmptySchema, response: { 200: SessionResponseSchema } } }, async (request, reply) => {
    const snapshot = await db.user.findUnique({ where: { email: request.body.email } });
    const validPassword = await verifyPassword(snapshot?.passwordHash ?? dummyHash, request.body.password);
    const result = await transaction(db, async tx => {
      const user = snapshot ? await tx.user.findUnique({ where: { id: snapshot.id } }) : null;
      const now = new Date();
      const blocked = !user || !user.isActive || Boolean(user.lockedUntil && user.lockedUntil > now);
      const counter = user?.totpSecret ? totpCounter(user.email, user.totpSecret, request.body.code, config) : null;
      const validTotp = !user?.totpSecret || (counter !== null && (user.totpLastCounter === null || counter > user.totpLastCounter));
      if (blocked || !validPassword || snapshot?.passwordHash !== user?.passwordHash || !validTotp) {
        if (user && !blocked) {
          const failures = (user.lockedUntil && user.lockedUntil <= now ? 0 : user.failedLogins) + 1;
          await tx.user.update({ where: { id: user.id }, data: { failedLogins: failures, lockedUntil: failures >= config.LOGIN_MAX_FAILURES ? new Date(now.getTime() + config.LOGIN_LOCK_MINUTES * 60000) : null } });
        }
        await audit(tx, config, request, { userId: user?.id, action: 'auth.login_failed', entity: 'Session', entityId: user?.id });
        return null;
      }
      const updated = await tx.user.update({ where: { id: user.id }, data: { failedLogins: 0, lockedUntil: null, lastLoginAt: now, ...(counter !== null ? { totpLastCounter: counter } : {}) } });
      const previousToken = request.cookies.aljeel_session;
      if (previousToken) await tx.session.deleteMany({ where: { id: hashToken(previousToken) } });
      await tx.session.deleteMany({ where: { expiresAt: { lte: now } } });
      const token = await createSession(tx, user.id, request, config);
      await audit(tx, config, request, { userId: user.id, action: 'auth.login', entity: 'Session', entityId: hashToken(token) });
      return { user: updated, token };
    });
    if (!result) throw new ApiError(401, 'invalid_credentials');
    return sessionReply(reply, result.token, result.user, config);
  });
  app.get('/auth/session', { config: { allowPasswordChange: true }, schema: { querystring: EmptySchema, response: { 200: SessionResponseSchema } } }, async (request, reply) => {
    const signed = request.cookies.aljeel_csrf;
    const token = signed ? request.unsignCookie(signed) : null;
    return { user: publicUser(request.auth!.user), csrfToken: token?.valid && token.value ? token.value : issueCsrf(reply, config) };
  });
  app.post('/auth/logout', { config: { allowPasswordChange: true }, schema: { body: EmptySchema, querystring: EmptySchema } }, async (request, reply) => {
    await transaction(db, async tx => {
      await tx.session.deleteMany({ where: { id: request.auth!.session.id } });
      await audit(tx, config, request, { action: 'auth.logout', entity: 'Session', entityId: request.auth!.session.id });
    });
    reply.clearCookie('aljeel_session', cookieOptions(config)).clearCookie('aljeel_csrf', cookieOptions(config));
    return { ok: true };
  });
  app.post('/auth/change-password', { config: { allowPasswordChange: true, rateLimit: sensitiveLimit }, schema: { body: ChangePasswordSchema, querystring: EmptySchema, response: { 200: SessionResponseSchema } } }, async (request, reply) => {
    const current = request.auth!.user;
    if (!await verifyPassword(current.passwordHash, request.body.currentPassword)) throw new ApiError(400, 'invalid_credentials');
    if (await verifyPassword(current.passwordHash, request.body.newPassword)) throw new ApiError(400, 'password_reused');
    const passwordHash = await hashPassword(request.body.newPassword);
    const result = await transaction(db, async tx => {
      const latest = await tx.user.findUniqueOrThrow({ where: { id: current.id } });
      if (latest.passwordHash !== current.passwordHash) throw new ApiError(409, 'session_changed');
      const user = await tx.user.update({ where: { id: current.id }, data: { passwordHash, mustChangePassword: false, failedLogins: 0, lockedUntil: null } });
      await tx.session.deleteMany({ where: { userId: current.id } });
      const token = await createSession(tx, current.id, request, config);
      await audit(tx, config, request, { action: 'auth.password_changed', entity: 'User', entityId: current.id, after: { mustChangePassword: false } });
      return { user, token };
    });
    return sessionReply(reply, result.token, result.user, config);
  });
  app.get('/auth/sessions', { config: { allowPasswordChange: true }, schema: { querystring: EmptySchema } }, async request => {
    const sessions = await db.session.findMany({ where: { userId: request.auth!.user.id, expiresAt: { gt: new Date() }, lastSeenAt: { gt: new Date(Date.now() - config.SESSION_IDLE_MINUTES * 60000) } }, select: { id: true, createdAt: true, expiresAt: true, lastSeenAt: true, userAgent: true }, orderBy: { createdAt: 'desc' } });
    return { items: sessions.map(session => ({ ...session, current: session.id === request.auth!.session.id })) };
  });
  app.delete('/auth/sessions/:id', { config: { allowPasswordChange: true }, schema: { params: z.strictObject({ id: z.string().regex(/^[a-f0-9]{64}$/) }), querystring: EmptySchema } }, async (request, reply) => {
    await transaction(db, async tx => {
      const result = await tx.session.deleteMany({ where: { id: request.params.id, userId: request.auth!.user.id } });
      if (!result.count) throw new ApiError(404, 'not_found');
      await audit(tx, config, request, { action: 'auth.session_revoked', entity: 'Session', entityId: request.params.id });
    });
    if (request.params.id === request.auth!.session.id) reply.clearCookie('aljeel_session', cookieOptions(config));
    return { ok: true };
  });
  app.post('/auth/totp/enroll', { config: { allowPasswordChange: true, rateLimit: sensitiveLimit }, schema: { body: TotpEnrollSchema, querystring: EmptySchema } }, async request => {
    const user = request.auth!.user;
    if (user.mustChangePassword) throw new ApiError(403, 'password_change_required');
    if (user.totpSecret) throw new ApiError(409, 'totp_already_enabled');
    if (!await verifyPassword(user.passwordHash, request.body.password)) throw new ApiError(400, 'invalid_credentials');
    const totp = makeTotp(user.email);
    await transaction(db, async tx => {
      await tx.user.update({ where: { id: user.id }, data: { totpPendingSecret: encryptSecret(totp.secret.base32, config), totpPendingUntil: new Date(Date.now() + 600000) } });
      await audit(tx, config, request, { action: 'auth.totp_enrollment_started', entity: 'User', entityId: user.id });
    });
    return { secret: totp.secret.base32, uri: totp.toString() };
  });
  app.post('/auth/totp/verify', { config: { allowPasswordChange: true, rateLimit: sensitiveLimit }, schema: { body: TotpVerifySchema, querystring: EmptySchema } }, async request => {
    await transaction(db, async tx => {
      const user = await tx.user.findUniqueOrThrow({ where: { id: request.auth!.user.id } });
      if (!user.totpPendingSecret || !user.totpPendingUntil || user.totpPendingUntil.getTime() <= Date.now() || user.totpSecret) throw new ApiError(400, 'totp_enrollment_expired');
      const counter = totpCounter(user.email, user.totpPendingSecret, request.body.code, config);
      if (counter === null) throw new ApiError(400, 'totp_invalid');
      await tx.user.update({ where: { id: user.id }, data: { totpSecret: user.totpPendingSecret, totpPendingSecret: null, totpPendingUntil: null, totpLastCounter: counter } });
      await tx.session.deleteMany({ where: { userId: user.id, id: { not: request.auth!.session.id } } });
      await audit(tx, config, request, { action: 'auth.totp_enabled', entity: 'User', entityId: user.id, after: { totpEnabled: true } });
    });
    return { ok: true };
  });
  app.post('/auth/totp/disable', { config: { allowPasswordChange: true, rateLimit: sensitiveLimit }, schema: { body: TotpDisableSchema, querystring: EmptySchema } }, async request => {
    const snapshot = request.auth!.user;
    if (config.REQUIRE_OWNER_2FA && snapshot.role === 'owner') throw new ApiError(403, 'totp_required');
    if (!await verifyPassword(snapshot.passwordHash, request.body.password)) throw new ApiError(400, 'invalid_credentials');
    await transaction(db, async tx => {
      const user = await tx.user.findUniqueOrThrow({ where: { id: snapshot.id } });
      if (!user.totpSecret || user.passwordHash !== snapshot.passwordHash) throw new ApiError(400, 'totp_invalid');
      const counter = totpCounter(user.email, user.totpSecret, request.body.code, config);
      if (counter === null || (user.totpLastCounter !== null && counter <= user.totpLastCounter)) throw new ApiError(400, 'totp_invalid');
      await tx.user.update({ where: { id: user.id }, data: { totpSecret: null, totpLastCounter: null, totpPendingSecret: null, totpPendingUntil: null } });
      await tx.session.deleteMany({ where: { userId: user.id, id: { not: request.auth!.session.id } } });
      await audit(tx, config, request, { action: 'auth.totp_disabled', entity: 'User', entityId: user.id, after: { totpEnabled: false } });
    });
    return { ok: true };
  });
}
