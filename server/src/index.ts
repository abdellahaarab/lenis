import { loadConfig } from './config.js';
import { createDb } from './db.js';
import { buildApp } from './app.js';
const config = loadConfig();
const db = createDb(config.DATABASE_URL);
const app = await buildApp(config, db);
async function close() { await app.close(); await db.$disconnect(); }
process.once('SIGINT', () => { void close(); });
process.once('SIGTERM', () => { void close(); });
await app.listen({ host: config.HOST, port: config.PORT });
