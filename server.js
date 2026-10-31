// Compatible with Hostinger LiteSpeed's synchronous require() loader.
void import('./server/dist/index.js').catch((error) => {
  console.error('Server initialization failed:', error);
  process.exitCode = 1;
});
