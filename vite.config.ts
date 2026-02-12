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
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            'vendor-react': ['react', 'react-dom', 'react-router-dom'],
            'vendor-bootstrap': ['bootstrap', 'react-bootstrap'],
            'vendor-i18n': ['i18next', 'react-i18next', 'i18next-browser-languagedetector', 'i18next-http-backend'],
            'vendor-icons': ['react-bootstrap-icons', '@fortawesome/react-fontawesome', '@fortawesome/fontawesome-svg-core', '@fortawesome/free-brands-svg-icons'],
            'vendor-utils': ['dompurify', 'marked', 'leo-profanity', 'qrcode', 'twemoji', 'hls.js'],
            'vendor-ui': ['sass'],
          },
          chunkFileNames: 'chunks/[name]-[hash].js',
          entryFileNames: 'entries/[name]-[hash].js',
          assetFileNames: (assetInfo) => {
            const info = assetInfo.name.split('.')
            const ext = info[info.length - 1]
            if (/png|jpe?g|gif|tiff|bmp|ico/i.test(ext)) {
              return `assets/images/[name]-[hash][extname]`
            } else if (/woff|woff2|ttf|otf|eot/i.test(ext)) {
              return `assets/fonts/[name]-[hash][extname]`
            } else if (ext === 'css') {
              return `assets/css/[name]-[hash][extname]`
            }
            return `assets/[name]-[hash][extname]`
          },
        },
      },
      minify: 'terser',
      terserOptions: {
        compress: {
          drop_console: true,
        },
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