import { getCollection, type CollectionEntry } from 'astro:content';
import { defaultLocale, locales, type Locale } from '../i18n/ui';

export type WriteupEntry = CollectionEntry<'writeups'>;

/** id do loader é "<evento>/<desafio>/<idioma>" (derivado do caminho do arquivo .md). */
export function parseWriteupId(id: string) {
  const parts = id.split('/');
  const lang = parts.pop() as Locale;
  const challengeSlug = parts.pop() as string;
  const eventSlug = parts.join('/');
  return { eventSlug, challengeSlug, lang, slug: `${eventSlug}/${challengeSlug}` };
}

async function getPublishedWriteups() {
  const entries = await getCollection('writeups', ({ data }) => !data.draft);
  return entries;
}

export type WriteupGroup = {
  eventSlug: string;
  challengeSlug: string;
  slug: string;
  byLocale: Partial<Record<Locale, WriteupEntry>>;
};

/** Agrupa todas as entradas (de todos os idiomas) por par evento/desafio. */
export async function getWriteupGroups(): Promise<WriteupGroup[]> {
  const entries = await getPublishedWriteups();
  const groups = new Map<string, WriteupGroup>();

  for (const entry of entries) {
    const { eventSlug, challengeSlug, lang, slug } = parseWriteupId(entry.id);
    if (!groups.has(slug)) {
      groups.set(slug, { eventSlug, challengeSlug, slug, byLocale: {} });
    }
    groups.get(slug)!.byLocale[lang] = entry;
  }

  return [...groups.values()];
}

/** Entrada para um writeup num idioma, com fallback para o idioma padrão se não houver tradução. */
export async function getWriteupForLocale(locale: Locale, slug: string) {
  const groups = await getWriteupGroups();
  const group = groups.find((g) => g.slug === slug);
  if (!group) return null;

  const entry = group.byLocale[locale] ?? group.byLocale[defaultLocale];
  if (!entry) return null;

  return {
    entry,
    isFallback: !group.byLocale[locale],
    availableLocales: locales.filter((l) => group.byLocale[l]),
  };
}

/** Lista, num idioma, um writeup por grupo (traduzido, ou em fallback quando não houver tradução). */
export async function listWriteups(locale: Locale) {
  const groups = await getWriteupGroups();
  return groups
    .map((group) => {
      const entry = group.byLocale[locale] ?? group.byLocale[defaultLocale];
      if (!entry) return null;
      return { entry, slug: group.slug, isFallback: !group.byLocale[locale] };
    })
    .filter((w): w is NonNullable<typeof w> => w !== null)
    .sort((a, b) => b.entry.data.pubDate.valueOf() - a.entry.data.pubDate.valueOf());
}
