import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

const APP_NAME = '让我演一集';
const APP_DESCRIPTION =
  'AI 互动短剧：选题材、定脾气、即兴演一整局。没有标准答案，只有你敢不敢说出口的那一句。';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['logo.jpg', 'favicon.svg'],
      manifest: {
        name: APP_NAME,
        short_name: '演一集',
        description: APP_DESCRIPTION,
        lang: 'zh-CN',
        start_url: '/',
        display: 'standalone',
        orientation: 'portrait',
        theme_color: '#0e1412',
        background_color: '#0a0a0f',
        icons: [
          {
            src: 'logo.jpg',
            sizes: '512x512',
            type: 'image/jpeg',
            purpose: 'any',
          },
          {
            src: 'logo.jpg',
            sizes: '512x512',
            type: 'image/jpeg',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,jpg,svg,png,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/images\.unsplash\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'theme-images',
              expiration: {
                maxEntries: 24,
                maxAgeSeconds: 60 * 60 * 24 * 30,
              },
            },
          },
        ],
      },
    }),
  ],
});
