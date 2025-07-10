import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
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
  ]
})
