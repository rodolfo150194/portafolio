export const prerender = false;

import { ImageResponse } from '@vercel/og';

const SITE = 'https://portafolio-one-sigma-24.vercel.app';

// Cached at module scope — only fetched once per cold start
let fontRegular: ArrayBuffer | null = null;
let fontBold: ArrayBuffer | null = null;

async function getFonts() {
  if (fontRegular && fontBold) return { fontRegular, fontBold };

  [fontRegular, fontBold] = await Promise.all([
    fetch('https://cdn.jsdelivr.net/npm/@fontsource/inter@5.0.0/files/inter-latin-400-normal.woff2').then(r => r.arrayBuffer()),
    fetch('https://cdn.jsdelivr.net/npm/@fontsource/inter@5.0.0/files/inter-latin-700-normal.woff2').then(r => r.arrayBuffer()),
  ]);

  return { fontRegular, fontBold };
}

const TAGS = ['Python', 'Django', 'Next.js', 'Flutter', 'FastAPI'];

export async function GET() {
  const { fontRegular, fontBold } = await getFonts();

  return new ImageResponse(
    {
      type: 'div',
      props: {
        style: {
          width: '1200px',
          height: '630px',
          display: 'flex',
          alignItems: 'center',
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
          padding: '60px 80px',
          gap: '64px',
          fontFamily: 'Inter',
        },
        children: [
          // Profile photo
          {
            type: 'img',
            props: {
              src: `${SITE}/images/photo-perfil.jpeg`,
              width: 230,
              height: 230,
              style: {
                borderRadius: '50%',
                objectFit: 'cover',
                flexShrink: 0,
                outline: '4px solid #6366f1',
                outlineOffset: '4px',
              },
            },
          },
          // Text block
          {
            type: 'div',
            props: {
              style: {
                display: 'flex',
                flexDirection: 'column',
                gap: '14px',
              },
              children: [
                // Label
                {
                  type: 'div',
                  props: {
                    style: {
                      display: 'flex',
                      color: '#818cf8',
                      fontSize: '16px',
                      fontWeight: 700,
                      letterSpacing: '0.18em',
                    },
                    children: 'PORTFOLIO',
                  },
                },
                // Name
                {
                  type: 'div',
                  props: {
                    style: {
                      display: 'flex',
                      color: '#f1f5f9',
                      fontSize: '52px',
                      fontWeight: 700,
                      lineHeight: 1.1,
                    },
                    children: 'Rodolfo García Maeso',
                  },
                },
                // Role
                {
                  type: 'div',
                  props: {
                    style: {
                      display: 'flex',
                      color: '#94a3b8',
                      fontSize: '22px',
                      fontWeight: 400,
                    },
                    children: 'Full Stack Developer · 7+ years experience',
                  },
                },
                // Tech tags
                {
                  type: 'div',
                  props: {
                    style: {
                      display: 'flex',
                      gap: '10px',
                      marginTop: '10px',
                      flexWrap: 'wrap',
                    },
                    children: TAGS.map(tech => ({
                      type: 'div',
                      props: {
                        style: {
                          display: 'flex',
                          background: 'rgba(99,102,241,0.15)',
                          color: '#a5b4fc',
                          padding: '6px 16px',
                          borderRadius: '20px',
                          fontSize: '15px',
                          border: '1px solid rgba(99,102,241,0.3)',
                        },
                        children: tech,
                      },
                    })),
                  },
                },
              ],
            },
          },
        ],
      },
    } as any,
    {
      width: 1200,
      height: 630,
      fonts: [
        { name: 'Inter', data: fontRegular!, weight: 400, style: 'normal' },
        { name: 'Inter', data: fontBold!, weight: 700, style: 'normal' },
      ],
    }
  );
}
