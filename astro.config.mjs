// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// Trocar aqui se o repositório for renomeado ou ganhar domínio próprio (ver README).
const GITHUB_USER = 'rniedson';
const REPO_NAME = 'writeups_ctf';

const locales = ['pt', 'es', 'en'];
const defaultLocale = 'pt';

// https://astro.build/config
export default defineConfig({
  site: `https://${GITHUB_USER}.github.io`,
  base: `/${REPO_NAME}`,
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
