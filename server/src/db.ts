import { PrismaClient, Prisma } from '@prisma/client';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';

export function createDb(url: string): PrismaClient {
  const parsed = new URL(url);
  if (parsed.protocol !== 'mysql:') throw new Error('MySQL DATABASE_URL is required');
  const isProd = process.env.NODE_ENV === 'production';
  return new PrismaClient({
    adapter: new PrismaMariaDb({
      host: parsed.hostname,
      port: Number(parsed.port || 3306),
      user: decodeURIComponent(parsed.username),
      password: decodeURIComponent(parsed.password),
      database: decodeURIComponent(parsed.pathname.slice(1)),
      // Reuse warm connections while allowing sufficient concurrency for multi-query routes (e.g. /commerce/reference, analytics)
      // Raised from 8→15 in production to handle concurrent catalog/filter/search requests without pool exhaustion
      connectionLimit: isProd ? 15 : 10,
      minimumIdle: isProd ? 3 : 1,
      // Keep warm connections longer in production (600s vs 300s dev)
      idleTimeout: isProd ? 600 : 300,
      // Wait up to 12s when pool is under heavy load rather than failing immediately
      acquireTimeout: 12000,
      timezone: '+00:00',
      // Reduced from 10s → 5s: fail fast rather than long hangs
      connectTimeout: 5000,
      ...(parsed.searchParams.get('ssl') === 'true' ? { ssl: true } : {}),
      ...(['127.0.0.1', 'localhost'].includes(parsed.hostname) ? { allowPublicKeyRetrieval: true } : {}),
    }),
  });
}

/**
 * Run an operation inside a DB transaction.
 * @param level 'ReadCommitted' (default, fast) for most writes;
 *              'Serializable' only for inventory/stock operations that need strict consistency.
 */
export async function transaction<T>(
  db: PrismaClient,
  operation: (tx: Prisma.TransactionClient) => Promise<T>,
  level: 'ReadCommitted' | 'Serializable' = 'ReadCommitted',
  options: { timeoutMs?: number } = {},
): Promise<T> {
  const isStrict = level === 'Serializable';
  for (let attempt = 0; ; attempt++) {
    try {
      return await db.$transaction(operation, {
        isolationLevel: isStrict
          ? Prisma.TransactionIsolationLevel.Serializable
          : Prisma.TransactionIsolationLevel.ReadCommitted,
        // Tighter timeouts: fail fast, don't block the server thread
        timeout: options.timeoutMs ?? (isStrict ? 15000 : 8000),
        maxWait: isStrict ? 6000 : 3000,
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034' && attempt < 3) continue;
      throw error;
    }
  }
}
