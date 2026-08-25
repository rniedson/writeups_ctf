// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { remarkAlert } from 'remark-github-blockquote-alert';

const locales = ['pt', 'es', 'en'];
const defaultLocale = 'pt';

// Domínio próprio (ver public/CNAME). Sem base — o site vive na raiz do subdomínio.
// https://astro.build/config
export default defineConfig({
  site: 'https://writeups.g01x5.com.br',
  trailingSlash: 'always',
  integrations: [
    sitemap({
      i18n: {
        defaultLocale,
        locales: {
          pt: 'pt-BR',
          es: 'es',
          en: 'en',
        },
      },
    }),
  ],
  i18n: {
    defaultLocale,
    locales,
    routing: {
      prefixDefaultLocale: true,
    },
  },
  markdown: {
    remarkPlugins: [[remarkAlert, { legacyTitle: true }]],
    shikiConfig: {
      themes: {
        light: 'github-light',
        dark: 'github-dark',
      },
      defaultColor: false,
      wrap: true,
    },
  },
});
