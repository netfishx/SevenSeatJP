import cloudflare from '@astrojs/cloudflare';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'astro/config';

export default defineConfig({
  output: 'server',
  // `compile` runs sharp at build time for prerendered pages and emits
  // multi-format assets (avif/webp/jpg) into `dist/client/_astro/`. Workers
  // runtime never touches image processing, so no IMAGES binding is required.
  adapter: cloudflare({ imageService: 'compile' }),
  site: 'https://sevenseatjp.com',
  i18n: {
    defaultLocale: 'ja',
    locales: ['ja', 'zh'],
    routing: { prefixDefaultLocale: false },
  },
  integrations: [
    sitemap({
      i18n: {
        defaultLocale: 'ja',
        locales: { ja: 'ja-JP', zh: 'zh-CN' },
      },
    }),
  ],
  vite: { plugins: [tailwindcss()] },
});
