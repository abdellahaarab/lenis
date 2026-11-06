import { Prisma } from '@prisma/client';
import type { FastifyRequest } from 'fastify';
import type { AppConfig } from './config.js';
import { ipHash } from './security.js';
const secretKeys = /password|secret|token|cookie|authorization|code|recovery/i;
function scrub(value: unknown): Prisma.InputJsonValue {
  if (value === null || value === undefined) return null as unknown as Prisma.InputJsonValue;
  if (value instanceof Date) return value.toISOString();
  if (Prisma.Decimal.isDecimal(value)) return value.toString();
  if (typeof value === 'bigint') return value.toString();
  if (Array.isArray(value)) return value.map(scrub);
  if (typeof value === 'object') return Object.fromEntries(Object.entries(value).filter(([key]) => !secretKeys.test(key)).map(([key, item]) => [key, scrub(item)]));
  return value as Prisma.InputJsonValue;
}
export async function audit(tx: Prisma.TransactionClient, config: AppConfig, request: FastifyRequest | null, data: { userId?: string | null; action: string; entity: string; entityId?: string; before?: unknown; after?: unknown }): Promise<void> {
  await tx.auditLog.create({ data: { userId: data.userId ?? request?.auth?.user.id ?? null, action: data.action, entity: data.entity, entityId: data.entityId, ip: request ? ipHash(request.ip, config) : null, before: data.before == null ? Prisma.JsonNull : scrub(data.before), after: data.after == null ? Prisma.JsonNull : scrub(data.after) } });
}
