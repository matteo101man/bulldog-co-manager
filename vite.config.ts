import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      // Disable service worker in development mode
      devOptions: {
        enabled: false,
        type: 'module'
      },
      // Better update strategy for production
      workbox: {
        // Skip waiting and claim clients immediately on update
        skipWaiting: true,
        clientsClaim: true,
        // Use network-first strategy for HTML to always get latest
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/.*\.html$/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'html-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 // 24 hours
              }
            }
          },
          {
            urlPattern: /^https:\/\/.*\.(js|css)$/,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'static-resources'
            }
          }
        ]
      },
      includeAssets: ['favicon.ico', 'favicon-96x96.png', 'apple-touch-icon.png', 'firebase-messaging-sw.js'],
      manifest: {
        name: 'Bulldog CO Manager',
        short_name: 'CO Manager',
        description: 'ROTC Attendance Tracking System',
        theme_color: '#1e40af',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait',
        icons: [
          {
            src: 'web-app-manifest-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'web-app-manifest-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: 'apple-touch-icon.png',
            sizes: '180x180',
            type: 'image/png'
          }
        ]
      }
    })
  ],
  base: '/bulldog-co-manager/',
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Vendor chunks
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom')) {
              return 'react-vendor';
            }
            if (id.includes('firebase')) {
              return 'firebase-vendor';
            }
            if (id.includes('xlsx-js-style')) {
              return 'xlsx-vendor';
            }
            // Other node_modules go into a vendor chunk
            return 'vendor';
          }
        }
      }
    },
    chunkSizeWarningLimit: 600
  }
});

