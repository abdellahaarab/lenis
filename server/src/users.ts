import type { User } from '@prisma/client';
import type { PublicUser } from '@aljeel/shared';
export function publicUser(user: User): PublicUser {
  return { id: user.id, email: user.email, name: user.name, role: user.role, isActive: user.isActive, mustChangePassword: user.mustChangePassword, totpEnabled: Boolean(user.totpSecret), lastLoginAt: user.lastLoginAt?.toISOString() ?? null, createdAt: user.createdAt.toISOString() };
}
