import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: [
        'favicon.ico',
        'favicon-16x16.png',
        'favicon-32x32.png',
        'favicon-96x96.png',
        'apple-icon-180x180.png',
        'android-icon-192x192.png',
      ],
      manifest: {
        name: 'ExpenseIQ – Expense Tracker',
        short_name: 'ExpenseIQ',
        description: 'Smart personal finance tracker with real-time sync, multi-currency, and analytics.',
        theme_color: '#4f46e5',
        background_color: '#111827',
        display: 'standalone',
        scope: '/',
        start_url: '/',
        orientation: 'portrait-primary',
        categories: ['finance', 'productivity'],
        icons: [
          { src: '/android-icon-36x36.png',  sizes: '36x36',  type: 'image/png' },
          { src: '/android-icon-48x48.png',  sizes: '48x48',  type: 'image/png' },
          { src: '/android-icon-72x72.png',  sizes: '72x72',  type: 'image/png' },
          { src: '/android-icon-96x96.png',  sizes: '96x96',  type: 'image/png' },
          { src: '/android-icon-144x144.png', sizes: '144x144', type: 'image/png' },
          { src: '/android-icon-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
          { src: '/apple-icon-180x180.png',   sizes: '180x180', type: 'image/png' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
        // Don't cache Firebase/Firestore API calls
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api\//],
        runtimeCaching: [
          {
            // Firebase Auth / Firestore / Storage — always network-first
            // Exclude WebChannel streaming connections (channel?* URLs)
            urlPattern: ({ url }) => {
              const isFirebase = /^https:\/\/(firestore|identitytoolkit|securetoken)\.googleapis\.com\/.*/i.test(url.href);
              const isWebChannel = url.pathname.includes('/channel') || url.search.includes('channel');
              return isFirebase && !isWebChannel;
            },
            handler: 'NetworkFirst',
            options: {
              cacheName: 'firebase-cache',
              expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 * 24 },
              networkTimeoutSeconds: 10,
            },
          },
          {
            // CDN assets (Nepali datepicker, fonts, etc.)
            urlPattern: /^https:\/\/nepalidatepicker\.sajanmaharjan\.com\.np\/.*/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'cdn-assets',
              expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 7 },
            },
          },
        ],
      },
      devOptions: {
        enabled: true,
        type: 'module',
      },
    }),
  ],
})
