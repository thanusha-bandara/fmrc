import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      devOptions: {
        enabled: true // Allows testing PWA in dev mode
      },
      manifest: {
        name: 'FMRC Testing System',
        short_name: 'FMRC',
        description: 'FMRC Smart Agricultural Machinery Testing System',
        theme_color: '#006B33',
        background_color: '#ffffff',
        display: 'standalone',
        icons: [
          {
            src: '/icon-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/icon-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      },
      workbox: {
        // Take over from any previously-installed service worker immediately on the next
        // load instead of waiting for every open tab to close first -- without this, a
        // stale worker (and its cached API responses, e.g. an old PDF-download error) can
        // keep controlling the page indefinitely even after the underlying bug is fixed.
        skipWaiting: true,
        clientsClaim: true,
        globPatterns: ['**/*.{js,css,html,ico,png,svg,jsx}'],
        runtimeCaching: [
          {
            // File downloads (report PDFs) must always hit the network -- never serve a
            // cached success OR a cached error for these, since the underlying file can
            // change (re-approved, regenerated) without the URL itself changing.
            urlPattern: /\/api\/reports\/.*\/download/i,
            handler: 'NetworkOnly'
          },
          {
            urlPattern: /\/api\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 // 1 day
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          }
        ]
      }
    })
  ],
})
