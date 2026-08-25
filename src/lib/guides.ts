import { getCollection } from 'astro:content';
import { defaultLocale, locales, type Locale } from '../i18n/ui';

/** id do loader é "<slug>/<idioma>" (derivado do caminho do arquivo .md). */
function parseGuideId(id: string) {
  const [slug, lang] = id.split('/');
  return { slug, lang: lang as Locale };
}

export async function getGuideForLocale(locale: Locale, slug: string) {
  const entries = await getCollection('guides');
  const byLocale = new Map<Locale, (typeof entries)[number]>();
  for (const entry of entries) {
    const parsed = parseGuideId(entry.id);
    if (parsed.slug === slug) byLocale.set(parsed.lang, entry);
  }

  const entry = byLocale.get(locale) ?? byLocale.get(defaultLocale);
  if (!entry) return null;

  return {
    entry,
    isFallback: !byLocale.get(locale),
    availableLocales: locales.filter((l) => byLocale.get(l)),
  };
}
