import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig(({ mode }) => {
  // Cargar variables de entorno
  const env = loadEnv(mode, process.cwd(), '')
  
  return {
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: { globPatterns: ['**/*.{js,css,html,ico,png,svg}'] },
      manifest: {
        short_name: 'ReserHab',
        name: 'ReserHab Hotel Manager',
        icons: [{
          src: '/icon.png',
          sizes: '192x192',
          type: 'image/png'
        }],
        start_url: '/app/reservas',
        display: 'standalone',
        theme_color: '#0066ff',
        background_color: '#ffffff'
      }
    })
    ],
    server: {
      host: true,
      port: 3000,
      proxy: {
        '/__/auth/': {
          target: 'http://127.0.0.1:9099',
          changeOrigin: true,
          secure: false
        },
        '/__/firestore/': {
          target: 'http://127.0.0.1:8080',
          changeOrigin: true,
          secure: false
        }
      }
    },
    define: {
      'process.env': {
        ...env,
        NODE_ENV: mode
      }
    },
    build: {
      outDir: 'dist',
      assetsDir: 'assets',
      sourcemap: mode === 'development',
      emptyOutDir: true
    }
  }
})
