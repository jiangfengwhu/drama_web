import https from 'node:https';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

const APP_NAME = '让我演一集';
const APP_DESCRIPTION =
  'AI 互动短剧：选题材、定脾气、即兴演一整局。没有标准答案，只有你敢不敢说出口的那一句。';

const LLM_UPSTREAM = 'https://llm.onallways.top';

/** Node 默认 DNS 可能先连 IPv6，该上游在 IPv6 上会卡住；开发代理强制 IPv4 */
const llmUpstreamAgent = new https.Agent({ family: 4, keepAlive: true });

function createLlmProxy(stripPrefix: string) {
  return {
    target: LLM_UPSTREAM,
    changeOrigin: true,
    secure: true,
    agent: llmUpstreamAgent,
    timeout: 0,
    proxyTimeout: 0,
    rewrite: (path: string) => path.replace(new RegExp(`^${stripPrefix}`), ''),
  };
}

// https://vite.dev/config/
export default defineConfig({
  server: {
    proxy: {
      '/api/openai': createLlmProxy('/api/openai'),
      '/api/llm': createLlmProxy('/api/llm'),
    },
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['logo.jpg', 'pwa-192.png', 'pwa-512.png', 'favicon.svg'],
      manifest: {
        id: '/',
        name: APP_NAME,
        short_name: '演一集',
        description: APP_DESCRIPTION,
        lang: 'zh-CN',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait',
        theme_color: '#0e1412',
        background_color: '#0a0a0f',
        icons: [
          {
            src: 'pwa-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: 'pwa-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: 'pwa-512.png',
            sizes: '512x512',
            type: 'image/png',
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
