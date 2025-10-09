import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@shared': path.resolve(__dirname, 'shared'),
      '@src': path.resolve(__dirname, 'src'),
    },
  },
  server: {
    host: true,
    hmr: {
      protocol: process.env.VITE_HMR_PROTOCOL || (process.env.CLOUDFLARE_TUNNEL ? 'wss' : 'ws'),
      host: process.env.VITE_HMR_HOST || process.env.PUBLIC_HOST || 'localhost',
      port: Number(process.env.VITE_HMR_PORT || process.env.PUBLIC_PORT || (process.env.VITE_HMR_PROTOCOL === 'wss' || process.env.CLOUDFLARE_TUNNEL ? 443 : 5173))
    },
    allowedHosts: ['axioris.omgrod.me'],
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/sitemap.xml': {
        target: 'http://localhost:3001',
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
})

