import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, path.resolve(root, '..'), '');
  const apiPort = env.PORT || '53000';
  const apiTarget = process.env.ADMIN_API_PROXY || env.API_PROXY || `http://127.0.0.1:${apiPort}`;

  return {
    base: '/admin/',
    build: { target: ['es2022', 'chrome111', 'firefox128', 'safari16.4'] },
    plugins: [react()],
    // Reuse the storefront font assets without copying or changing them.
    publicDir: path.join(root, 'public'),
    server: {
      port: 5174,
      strictPort: true,
      proxy: {
        '/api': { target: apiTarget, changeOrigin: false }
      }
    },
    preview: {
      proxy: {
        '/api': { target: apiTarget, changeOrigin: false }
      }
    },
  };
});
