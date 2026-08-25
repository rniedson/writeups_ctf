import rss from '@astrojs/rss';
import { locales } from '../../i18n/ui';
import { ui } from '../../i18n/ui';
import { listWriteups } from '../../lib/writeups';

export function getStaticPaths() {
  return locales.map((locale) => ({ params: { locale } }));
}

export async function GET(context) {
  const { locale } = context.params;
  const writeups = await listWriteups(locale);
  const base = context.site ? new URL(import.meta.env.BASE_URL, context.site) : undefined;

  return rss({
    title: ui[locale]['site.title'],
    description: ui[locale]['site.tagline'],
    site: base ?? context.site,
    items: writeups.map((w) => ({
      title: w.entry.data.title,
      description: w.entry.data.description,
      pubDate: w.entry.data.pubDate,
      link: `${locale}/writeups/${w.slug}/`,
      categories: [w.entry.data.category, ...w.entry.data.tags],
    })),
  });
}
