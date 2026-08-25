import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';

// Lido relativo à raiz do projeto (não a este módulo) porque o bundler do Astro
// move este arquivo para dist/.prerender/ em build, quebrando caminhos relativos ao módulo.
const FONT_DIR = join(process.cwd(), 'src/assets/fonts');
const fontRegular = readFileSync(join(FONT_DIR, 'IBMPlexMono-Regular.ttf'));
const fontBold = readFileSync(join(FONT_DIR, 'IBMPlexMono-Bold.ttf'));

const WIDTH = 1200;
const HEIGHT = 630;

const COLORS = {
  bg: '#10131a',
  bgRaised: '#171b24',
  border: '#2a2f3a',
  text: '#e7e9ee',
  muted: '#9aa2b1',
  accent: '#4fd8a0',
};

function truncate(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;
}

interface OgImageOptions {
  kicker: string;
  title: string;
  metaLine: string;
}

function buildTree({ kicker, title, metaLine }: OgImageOptions) {
  return {
    type: 'div',
    props: {
      style: {
        width: WIDTH,
        height: HEIGHT,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        backgroundColor: COLORS.bg,
        padding: '64px',
        fontFamily: 'IBM Plex Mono',
      },
      children: [
        {
          type: 'div',
          props: {
            style: { display: 'flex', alignItems: 'center', gap: '12px' },
            children: [
              {
                type: 'div',
                props: {
                  style: {
                    display: 'flex',
                    width: '14px',
                    height: '14px',
                    borderRadius: '999px',
                    backgroundColor: COLORS.accent,
                  },
                  children: [],
                },
              },
              {
                type: 'div',
                props: {
                  style: {
                    display: 'flex',
                    fontSize: '28px',
                    color: COLORS.accent,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                  },
                  children: truncate(kicker, 40),
                },
              },
            ],
          },
        },
        {
          type: 'div',
          props: {
            style: {
              display: 'flex',
              fontSize: title.length > 46 ? '58px' : '72px',
              fontWeight: 700,
              color: COLORS.text,
              lineHeight: 1.15,
              maxHeight: '320px',
              overflow: 'hidden',
            },
            children: truncate(title, 90),
          },
        },
        {
          type: 'div',
          props: {
            style: {
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-end',
              borderTop: `2px solid ${COLORS.border}`,
              paddingTop: '28px',
            },
            children: [
              {
                type: 'div',
                props: {
                  style: {
                    display: 'flex',
                    fontSize: '22px',
                    color: COLORS.muted,
                    maxWidth: '760px',
                  },
                  children: truncate(metaLine, 56),
                },
              },
              {
                type: 'div',
                props: {
                  style: { display: 'flex', fontSize: '26px', color: COLORS.text },
                  children: [
                    {
                      type: 'span',
                      props: { style: { display: 'flex', color: COLORS.accent }, children: '>_ ' },
                    },
                    {
                      type: 'span',
                      props: { style: { display: 'flex' }, children: 'writeups_ctf' },
                    },
                  ],
                },
              },
            ],
          },
        },
      ],
    },
  };
}

export async function renderOgImage(options: OgImageOptions): Promise<Buffer> {
  const svg = await satori(buildTree(options) as never, {
    width: WIDTH,
    height: HEIGHT,
    fonts: [
      { name: 'IBM Plex Mono', data: fontRegular, weight: 400, style: 'normal' },
      { name: 'IBM Plex Mono', data: fontBold, weight: 700, style: 'normal' },
    ],
  });
  const resvg = new Resvg(svg, { fitTo: { mode: 'width', value: WIDTH } });
  return resvg.render().asPng();
}
