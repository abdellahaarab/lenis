import type { Session, User } from '@prisma/client';
import type { Permission } from '@aljeel/shared';
declare module 'fastify' {
  interface FastifyRequest { auth: { user: User; session: Session } | null }
  interface FastifyContextConfig { public?: boolean; allowPasswordChange?: boolean; permission?: Permission }
}
export {};
