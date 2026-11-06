import { z } from 'zod';
import { roles } from './permissions.js';

export const RoleSchema = z.enum(roles);
export const EmailSchema = z.string().trim().toLowerCase().email().max(254);
export const PasswordSchema = z.string().min(12, 'password_short').max(128, 'password_long')
  .refine(value => !/(password|qwerty|letmein|welcome|admin123|123456|كلمة.?المرور)/i.test(value), 'password_common')
  .refine(value => new Set(value).size >= 5, 'password_common');
export const TotpCodeSchema = z.string().regex(/^\d{6}$/, 'totp_invalid');
export const LoginSchema = z.strictObject({ email: EmailSchema, password: z.string().min(1).max(128), code: TotpCodeSchema.optional() });
export const ChangePasswordSchema = z.strictObject({ currentPassword: z.string().min(1).max(128), newPassword: PasswordSchema });
export const StaffCreateSchema = z.strictObject({ email: EmailSchema, name: z.string().trim().min(1).max(100), role: RoleSchema, password: PasswordSchema });
export const StaffUpdateSchema = z.strictObject({ email: EmailSchema.optional(), name: z.string().trim().min(1).max(100).optional(), role: RoleSchema.optional(), isActive: z.boolean().optional() }).refine(value => Object.keys(value).length > 0, 'update_empty');
export const ResetPasswordSchema = z.strictObject({ password: PasswordSchema });
export const TotpEnrollSchema = z.strictObject({ password: z.string().min(1).max(128) });
export const TotpVerifySchema = z.strictObject({ code: TotpCodeSchema });
export const TotpDisableSchema = z.strictObject({ password: z.string().min(1).max(128), code: TotpCodeSchema });
export const IdParamsSchema = z.strictObject({ id: z.uuid() });
export const EmptySchema = z.strictObject({});
export const StaffListSchema = z.strictObject({ page: z.coerce.number().int().min(1).default(1), pageSize: z.coerce.number().int().min(1).max(100).default(20), search: z.string().trim().max(100).default(''), role: RoleSchema.optional() });
export const PublicUserSchema = z.object({ id: z.uuid(), email: z.string(), name: z.string(), role: RoleSchema, isActive: z.boolean(), mustChangePassword: z.boolean(), totpEnabled: z.boolean(), lastLoginAt: z.string().nullable(), createdAt: z.string() });
export type PublicUser = z.infer<typeof PublicUserSchema>;
export const SessionResponseSchema = z.object({ user: PublicUserSchema, csrfToken: z.string() });
export type SessionResponse = z.infer<typeof SessionResponseSchema>;
