import { locales, ui, type Locale, type UiKey } from '../../../i18n/ui';
import { renderOgImage } from '../../../lib/og-image';
import { getWriteupGroups, getWriteupForLocale } from '../../../lib/writeups';

export async function getStaticPaths() {
  const groups = await getWriteupGroups();
  const paths: { params: { locale: string; slug: string } }[] = [];
  for (const locale of locales) {
    for (const group of groups) {
      paths.push({ params: { locale, slug: group.slug } });
    }
  }
  return paths;
}

const difficultyKeys: Record<string, UiKey> = {
  easy: 'difficulty.easy',
  medium: 'difficulty.medium',
  hard: 'difficulty.hard',
};

export async function GET({ params }: { params: { locale: Locale; slug: string } }) {
  const { locale, slug } = params;
  const result = await getWriteupForLocale(locale, slug);
  if (!result) return new Response('Not found', { status: 404 });

  const { entry } = result;
  const { title, event, category, difficulty } = entry.data;
  const metaParts = [event, category];
  if (difficulty) metaParts.push(ui[locale][difficultyKeys[difficulty]]);

  const png = await renderOgImage({
    kicker: 'CTF Writeup',
    title,
    metaLine: metaParts.join(' · '),
  });
  return new Response(new Uint8Array(png), {
    headers: { 'Content-Type': 'image/png' },
  });
}
