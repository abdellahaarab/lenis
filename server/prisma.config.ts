import { defineConfig } from 'prisma/config';
import { config } from 'dotenv';
import { fileURLToPath } from 'node:url';
config({ path: fileURLToPath(new URL('../.env', import.meta.url)), quiet: true });
export default defineConfig({ schema: 'prisma/schema.prisma', migrations: { path: 'prisma/mysql-migrations' }, datasource: { url: process.env.DATABASE_URL ?? 'mysql://build:build@127.0.0.1:3306/build' } });
