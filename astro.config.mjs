import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  // Temporary GitHub Pages project URL until the custom domain is live.
  // After real-local-tools.com is pointed, switch to:
  //   site: 'https://real-local-tools.com', and remove `base`.
  site: 'https://baokx.github.io',
  base: '/real-local-tools',
  trailingSlash: 'always',
  i18n: {
    defaultLocale: 'en',
    locales: ['en', 'zh'],
    routing: { prefixDefaultLocale: false },
  },
  integrations: [sitemap()],
  vite: {
    plugins: [tailwindcss()],
  },
});
