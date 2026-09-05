import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'images/*.png'],
      manifest: {
        name: 'ذَكِّرْ',
        short_name: 'ذَكِّرْ',
        description: 'تطبيق الأذكار الإسلامية من الكتاب والسنة',
        id: '/tazkeer/',
        start_url: './',
        scope: './',
        display: 'standalone',
        background_color: '#12181F',
        theme_color: '#12181F',
        orientation: 'portrait',
        categories: ['religion', 'education', 'lifestyle'],
        lang: 'ar',
        dir: 'rtl',
        icons: [
          {
            src: 'images/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: 'images/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: 'images/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2,json}'],
        cleanupOutdatedCaches: true,
        runtimeCaching: [
          {
            urlPattern: ({ url }) => {
              return (url.protocol === 'http:' || url.protocol === 'https:') &&
                url.href.includes('cdn.jsdelivr.net');
            },
            handler: 'CacheFirst',
            options: {
              cacheName: 'quran-images',
              expiration: {
                maxEntries: 700,
                maxAgeSeconds: 60 * 60 * 24 * 90,
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            urlPattern: ({ url }) => {
              return (url.protocol === 'http:' || url.protocol === 'https:') &&
                url.href.includes('api.aladhan.com');
            },
            handler: 'NetworkFirst',
            options: {
              cacheName: 'prayer-times-api',
              expiration: {
                maxEntries: 30,
                maxAgeSeconds: 60 * 60 * 12,
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve('./src'),
    },
  },
  base: '/tazkeer/',
})
