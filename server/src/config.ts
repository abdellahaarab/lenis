import { z } from 'zod';
import { config as dotenv } from 'dotenv';
import { fileURLToPath } from 'node:url';
dotenv({ path: fileURLToPath(new URL('../../.env', import.meta.url)), quiet: true });
const booleanEnv = z.enum(['true', 'false']).transform(value => value === 'true');
export const ConfigSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  HOST: z.string().default('0.0.0.0'), PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  DATABASE_URL: z.string().regex(/^mysql:\/\//),
  SESSION_SECRET: z.string().min(32), TOTP_ENCRYPTION_KEY: z.string().regex(/^[a-fA-F0-9]{64}$/),
  ALLOWED_ORIGINS: z.string().transform(value => value.split(',').map(origin => z.url().parse(origin.trim())).map(origin => new URL(origin).origin)),
  COOKIE_SECURE: booleanEnv.default(false), TRUST_PROXY: booleanEnv.default(false),
  SERVE_STATIC: booleanEnv.default(false),
  SESSION_IDLE_MINUTES: z.coerce.number().int().min(1).max(120).default(30),
  SESSION_ABSOLUTE_HOURS: z.coerce.number().int().min(1).max(72).default(12),
  LOGIN_MAX_FAILURES: z.coerce.number().int().min(3).max(20).default(5),
  LOGIN_LOCK_MINUTES: z.coerce.number().int().min(1).max(60).default(15),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'silent']).default('info'),
  REQUIRE_OWNER_2FA: booleanEnv.default(false),
}).superRefine((value, ctx) => {
  if (value.NODE_ENV === 'production' && (!value.COOKIE_SECURE || value.ALLOWED_ORIGINS.some(origin => !origin.startsWith('https://')))) {
    ctx.addIssue({ code: 'custom', message: 'Production requires secure cookies and HTTPS origins' });
  }
});
export type AppConfig = z.infer<typeof ConfigSchema>;
export function loadConfig(): AppConfig {
  const parsed = ConfigSchema.safeParse(process.env);
  if (!parsed.success) throw new Error(`Invalid environment keys: ${parsed.error.issues.map(issue => issue.path.join('.') || 'production security settings').join(', ')}`);
  return parsed.data;
}
