import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const apiUrl = env.VITE_API_URL || 'http://localhost:3001'

  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@src': path.resolve(__dirname, 'src'),
      },
    },
    server: {
      host: true,
      hmr: {
        protocol: env.VITE_HMR_PROTOCOL || (env.CLOUDFLARE_TUNNEL ? 'wss' : 'ws'),
        host: env.VITE_HMR_HOST || env.PUBLIC_HOST || 'localhost',
        port: Number(env.VITE_HMR_PORT || env.PUBLIC_PORT || (env.VITE_HMR_PROTOCOL === 'wss' || env.CLOUDFLARE_TUNNEL ? 443 : 5173))
      },
      allowedHosts: ['axioris.omgrod.me'],
      proxy: {
        '/api': {
          target: apiUrl,
          changeOrigin: true,
        },
        '/sitemap.xml': {
          target: apiUrl,
          changeOrigin: true,
          secure: false,
        },
        '/public/uploads': {
          target: apiUrl,
          changeOrigin: true,
          secure: false,
        },
        '/uploads': {
          target: apiUrl,
          changeOrigin: true,
          secure: false,
        },
      },
      watch: {
        ignored: [],
        usePolling: true,
        interval: 100,
      },
    },
  }
})