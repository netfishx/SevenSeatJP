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
  // Opt out of the adapter's auto-injected Cloudflare KV session driver.
  // No code path reads Astro.session / locals.session, so leaving the
  // default would emit a ghost `SESSION` KV binding into the deployed
  // wrangler.json without a backing namespace id. `memory` is a no-op
  // on stateless Workers but keeps session.driver defined, short-circuiting
  // the adapter's auto-inject branch.
  session: { driver: 'memory' },
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
