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
        runtimeCaching: [
          {
            // Cache Quran HD images from CDN
            urlPattern: /^https:\/\/cdn\.jsdelivr\.net\/gh\/akram-seid\/quran-hd-images/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'quran-images',
              expiration: {
                maxEntries: 700,
                maxAgeSeconds: 60 * 60 * 24 * 90, // 90 days
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            // Cache Prayer Times API
            urlPattern: /^https:\/\/api\.aladhan\.com/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'prayer-times-api',
              expiration: {
                maxEntries: 30,
                maxAgeSeconds: 60 * 60 * 12, // 12 hours
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            // Cache Google Fonts (fallback if loaded externally)
            urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts',
              expiration: {
                maxEntries: 20,
                maxAgeSeconds: 60 * 60 * 24 * 365,
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
