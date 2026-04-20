// vite.config.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: '/admin/', // ← cambiar './' por la ruta real

  plugins: [
    react(),
    VitePWA({
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
        scope: '/admin/',        // ← actualizar
        start_url: '/admin/tecnico/dashboard', // ← actualizar
        icons: [ /* sin cambios */ ],
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
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24,
              },
            },
          },
        ],
      },
    }),
  ],
});