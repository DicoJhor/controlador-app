import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: '/',
  server: {
    proxy: {
      '/proxy': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
      '/reboot-optic': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
    }
  },
  plugins: [
    react(),
    VitePWA({
      disable: true,
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.jpeg', 'masked-icon.svg'],
      manifest: {
        name: 'App Técnico',
        short_name: 'Técnico',
        description: 'Gestión de técnicos en campo',
        theme_color: '#1A56DB',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/admin/',
        start_url: '/admin/tecnico/dashboard',
        icons: [],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.startsWith('/api/'),
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              networkTimeoutSeconds: 5,
              expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 },
            },
          },
        ],
      },
    }),
  ],
});