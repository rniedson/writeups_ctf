import { ui, defaultLocale, type Locale, type UiKey } from './ui';

export function isLocale(value: string): value is Locale {
  return value in ui;
}

export function useTranslations(locale: Locale) {
  return function t(key: UiKey): string {
    return ui[locale][key] ?? ui[defaultLocale][key];
  };
}

/** Prefixa um caminho absoluto com o BASE_URL do site (respeita o `base` do astro.config.mjs). */
export function withBase(path: string): string {
  const base = import.meta.env.BASE_URL;
  const cleanBase = base.endsWith('/') ? base.slice(0, -1) : base;
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${cleanBase}${cleanPath}`;
}

/** Monta a URL localizada de uma rota, ex.: localizedPath('es', 'writeups/') -> /base/es/writeups/ */
export function localizedPath(locale: Locale, path = ''): string {
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;
  return withBase(`/${locale}/${cleanPath}`);
}

/**
 * Formata a data em UTC, não no fuso do servidor/navegador — datas de frontmatter (ex.: 2026-08-25)
 * são meia-noite UTC, e sem isso `toLocaleDateString` pode mostrar o dia anterior em fusos negativos.
 */
export function formatDate(date: Date, locale: Locale): string {
  return date.toLocaleDateString(locale, { timeZone: 'UTC' });
}
