import type { FastifyInstance } from 'fastify';
import type { PrismaClient } from '@prisma/client';
import type { ZodTypeProvider } from '@fastify/type-provider-zod';
import { StaffCreateSchema, StaffUpdateSchema, StaffListSchema, ResetPasswordSchema, IdParamsSchema, EmptySchema, PublicUserSchema, normalizeSearch } from '@aljeel/shared';
import { z } from 'zod';
import type { AppConfig } from './config.js';
import { transaction } from './db.js';
import { audit } from './audit.js';
import { ApiError } from './errors.js';
import { hashPassword } from './security.js';
import { publicUser } from './users.js';
export async function staffRoutes(instance: FastifyInstance, db: PrismaClient, config: AppConfig) {
  const app = instance.withTypeProvider<ZodTypeProvider>();
  const staff = { permission: 'staff.manage' as const };
  app.get('/users', { config: staff, schema: { querystring: StaffListSchema, response: { 200: z.object({ items: z.array(PublicUserSchema), total: z.number(), page: z.number(), pageSize: z.number() }) } } }, async request => {
    const { search, role, page, pageSize } = request.query;
    const where = { ...(role ? { role } : {}), ...(search ? { OR: [{ nameSearch: { contains: normalizeSearch(search) } }, { name: { contains: search } }, { email: { contains: search } }] } : {}) };
    const [items, total] = await db.$transaction([db.user.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * pageSize, take: pageSize }), db.user.count({ where })]);
    return { items: items.map(publicUser), total, page, pageSize };
  });
  app.get('/users/:id', { config: staff, schema: { params: IdParamsSchema, querystring: EmptySchema, response: { 200: PublicUserSchema } } }, async request => publicUser(await db.user.findUniqueOrThrow({ where: { id: request.params.id } })));
  app.post('/users', { config: staff, schema: { body: StaffCreateSchema, querystring: EmptySchema, response: { 201: PublicUserSchema } } }, async (request, reply) => {
    const passwordHash = await hashPassword(request.body.password);
    const user = await transaction(db, async tx => {
      const created = await tx.user.create({ data: { email: request.body.email, name: request.body.name, nameSearch: normalizeSearch(request.body.name), role: request.body.role, passwordHash, mustChangePassword: true } });
      await audit(tx, config, request, { action: 'staff.created', entity: 'User', entityId: created.id, after: publicUser(created) });
      return created;
    });
    return reply.code(201).send(publicUser(user));
  });
  app.patch('/users/:id', { config: staff, schema: { body: StaffUpdateSchema, params: IdParamsSchema, querystring: EmptySchema, response: { 200: PublicUserSchema } } }, async request => {
    const user = await transaction(db, async tx => {
      const before = await tx.user.findUniqueOrThrow({ where: { id: request.params.id } });
      if (before.role === 'owner' && before.isActive && (request.body.isActive === false || (request.body.role && request.body.role !== 'owner')) && await tx.user.count({ where: { role: 'owner', isActive: true } }) <= 1) throw new ApiError(409, 'last_owner');
      const after = await tx.user.update({ where: { id: before.id }, data: { ...request.body, ...(request.body.name ? { nameSearch: normalizeSearch(request.body.name) } : {}) } });
      await tx.session.deleteMany({ where: { userId: after.id } });
      await audit(tx, config, request, { action: 'staff.updated', entity: 'User', entityId: after.id, before: publicUser(before), after: publicUser(after) });
      return after;
    });
    return publicUser(user);
  });
  app.delete('/users/:id', { config: staff, schema: { params: IdParamsSchema, querystring: EmptySchema } }, async request => {
    await transaction(db, async tx => {
      const before = await tx.user.findUniqueOrThrow({ where: { id: request.params.id } });
      if (before.role === 'owner' && before.isActive && await tx.user.count({ where: { role: 'owner', isActive: true } }) <= 1) throw new ApiError(409, 'last_owner');
      const after = await tx.user.update({ where: { id: before.id }, data: { isActive: false } });
      await tx.session.deleteMany({ where: { userId: before.id } });
      await audit(tx, config, request, { action: 'staff.deactivated', entity: 'User', entityId: before.id, before: publicUser(before), after: publicUser(after) });
    });
    return { ok: true };
  });
  app.post('/users/:id/reset-password', { config: staff, schema: { params: IdParamsSchema, body: ResetPasswordSchema, querystring: EmptySchema } }, async request => {
    const passwordHash = await hashPassword(request.body.password);
    await transaction(db, async tx => {
      await tx.user.update({ where: { id: request.params.id }, data: { passwordHash, mustChangePassword: true, failedLogins: 0, lockedUntil: null } });
      await tx.session.deleteMany({ where: { userId: request.params.id } });
      await audit(tx, config, request, { action: 'staff.password_reset', entity: 'User', entityId: request.params.id, after: { mustChangePassword: true } });
    });
    return { ok: true };
  });
  app.post('/users/:id/reset-totp', { config: staff, schema: { params: IdParamsSchema, body: EmptySchema, querystring: EmptySchema } }, async request => {
    await transaction(db, async tx => {
      await tx.user.update({ where: { id: request.params.id }, data: { totpSecret: null, totpPendingSecret: null, totpPendingUntil: null, totpLastCounter: null } });
      await tx.session.deleteMany({ where: { userId: request.params.id } });
      await audit(tx, config, request, { action: 'staff.totp_reset', entity: 'User', entityId: request.params.id, after: { totpEnabled: false } });
    });
    return { ok: true };
  });
  app.get('/audit', { config: { permission: 'audit.read' }, schema: { querystring: z.strictObject({ page: z.coerce.number().int().min(1).default(1), pageSize: z.coerce.number().int().min(1).max(100).default(20) }) } }, async request => {
    const { page, pageSize } = request.query;
    const [items, total] = await db.$transaction([db.auditLog.findMany({ orderBy: { createdAt: 'desc' }, skip: (page - 1) * pageSize, take: pageSize, select: { id: true, userId: true, action: true, entity: true, entityId: true, before: true, after: true, createdAt: true } }), db.auditLog.count()]);
    return { items, total, page, pageSize };
  });
}
