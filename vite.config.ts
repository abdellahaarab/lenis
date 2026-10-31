import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

function cloudApiProxy(targetUrl: string): Plugin {
  const target = new URL(targetUrl)
  const blockedHeaders = new Set(['host', 'connection', 'content-length', 'accept-encoding'])

  return {
    name: 'cloud-api-proxy',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith('/api/')) return next()

        try {
          const headers = new Headers()
          for (const [name, value] of Object.entries(req.headers)) {
            if (blockedHeaders.has(name.toLowerCase()) || value === undefined) continue
            headers.set(name, Array.isArray(value) ? value.join(', ') : value)
          }
          headers.set('origin', target.origin)

          const method = req.method || 'GET'
          const body = method === 'GET' || method === 'HEAD'
            ? undefined
            : Buffer.concat(await (async () => {
                const chunks: Buffer[] = []
                for await (const chunk of req) chunks.push(Buffer.from(chunk))
                return chunks
              })())
          const upstream = await fetch(new URL(req.url, target), { method, headers, body, redirect: 'manual' })

          res.statusCode = upstream.status
          upstream.headers.forEach((value, name) => {
            if (!['connection', 'content-encoding', 'content-length', 'transfer-encoding'].includes(name.toLowerCase())) {
              res.setHeader(name, value)
            }
          })
          const cookies = upstream.headers.getSetCookie()
          if (cookies.length) res.setHeader('set-cookie', cookies)
          res.end(Buffer.from(await upstream.arrayBuffer()))
        } catch (error) {
          next(error instanceof Error ? error : new Error('Cloud API request failed'))
        }
      })
    },
  }
}

export default defineConfig(({ command }) => {
  // The server workspace's development .env must not ship development React.
  if (command === 'build') process.env.NODE_ENV = 'production'
  const apiProxy = process.env.API_PROXY
  return {
  envFile: command !== 'build',
  define: command === 'build' ? { 'process.env.NODE_ENV': JSON.stringify('production') } : {},
  plugins: [react(), ...(apiProxy ? [cloudApiProxy(apiProxy)] : [])],
  optimizeDeps: { esbuildOptions: { target: 'es2022' } },
  server: {
    proxy: {
      ...(!apiProxy ? { '/api': { target: 'http://127.0.0.1:53000', changeOrigin: false } } : {}),
      '/admin': { target: 'http://127.0.0.1:5174', changeOrigin: false },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    target: ['es2022', 'chrome111', 'firefox128', 'safari16.4'],
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          'animation-vendor': ['gsap', 'lenis'],
          'motion-vendor': ['framer-motion', 'motion'],
        },
      },
    },
  },
  }
})
