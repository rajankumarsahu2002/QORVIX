import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'qorvix-icon.svg', 'qorvix-192.png', 'qorvix-512.png', 'qorvix-maskable-512.png', 'apple-touch-icon.png'],
      manifest: {
        name: 'QORVIX — Your Trajectory to Victory',
        short_name: 'QORVIX',
        description: 'Competitive Exam Study Operating System',
        theme_color: '#0F172A',
        background_color: '#0F172A',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        icons: [
          { src: 'qorvix-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'qorvix-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'qorvix-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/i,
            handler: 'CacheFirst',
            options: { cacheName: 'fonts', expiration: { maxEntries: 20, maxAgeSeconds: 31536000 } },
          },
        ],
      },
    }),
  ],
});
