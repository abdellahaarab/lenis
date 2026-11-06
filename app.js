/**
 * Hostinger Web App Root Entry Point
 * Starts the Fastify server which serves:
 * 1. The store frontend (at /)
 * 2. The admin panel (at /admin/)
 * 3. The API (at /api/)
 */
// LiteSpeed loads this entry with require(); keep its module graph synchronous.
// The server itself initializes asynchronously through a dynamic import.
void import('./server/dist/index.js').catch((error) => {
  console.error('Server initialization failed:', error);
  process.exitCode = 1;
});
