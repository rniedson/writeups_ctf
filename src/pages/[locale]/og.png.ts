import { locales, ui, type Locale } from '../../i18n/ui';
import { renderOgImage } from '../../lib/og-image';

export function getStaticPaths() {
  return locales.map((locale) => ({ params: { locale } }));
}

export async function GET({ params }: { params: { locale: Locale } }) {
  const { locale } = params;
  const png = await renderOgImage({
    kicker: 'CTF Writeups',
    title: ui[locale]['site.title'],
    metaLine: ui[locale]['site.tagline'],
  });
  return new Response(new Uint8Array(png), {
    headers: { 'Content-Type': 'image/png' },
  });
}
