import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import argon2 from 'argon2';
import { TOTP, Secret } from 'otpauth';
import type { AppConfig } from './config.js';
export const randomToken = () => randomBytes(32).toString('base64url');
export const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');
export function ipHash(ip: string, config: AppConfig): string { return createHmac('sha256', config.SESSION_SECRET).update(`staff-ip:${ip}`).digest('hex'); }
export function safeEqual(a: string, b: string): boolean { const aa = Buffer.from(a); const bb = Buffer.from(b); return aa.length === bb.length && timingSafeEqual(aa, bb); }
export const hashPassword = (password: string) => argon2.hash(password, { type: argon2.argon2id, memoryCost: 65536, timeCost: 3, parallelism: 1 });
export const verifyPassword = (hash: string, password: string) => argon2.verify(hash, password);
export function encryptSecret(secret: string, config: AppConfig): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', Buffer.from(config.TOTP_ENCRYPTION_KEY, 'hex'), iv);
  const encrypted = Buffer.concat([cipher.update(secret, 'utf8'), cipher.final()]);
  return [iv, cipher.getAuthTag(), encrypted].map(value => value.toString('base64url')).join('.');
}
export function decryptSecret(encrypted: string, config: AppConfig): string {
  const [iv, tag, data] = encrypted.split('.').map(value => Buffer.from(value, 'base64url'));
  const decipher = createDecipheriv('aes-256-gcm', Buffer.from(config.TOTP_ENCRYPTION_KEY, 'hex'), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8');
}
export function makeTotp(email: string, secret?: string): TOTP {
  return new TOTP({ issuer: 'Al-Jeel Al-Arabi Al-Raqmi', label: email, secret: secret ? Secret.fromBase32(secret) : new Secret({ size: 20 }), digits: 6, period: 30, algorithm: 'SHA1' });
}
export function totpCounter(email: string, encrypted: string, code: string | undefined, config: AppConfig): bigint | null {
  if (!code) return null;
  const totp = makeTotp(email, decryptSecret(encrypted, config));
  const timestamp = Date.now();
  const delta = totp.validate({ token: code, timestamp, window: 1 });
  return delta === null ? null : BigInt(Math.floor(timestamp / 30000) + delta);
}
