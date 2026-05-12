import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import vercel from '@astrojs/vercel';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://portafolio-one-sigma-24.vercel.app',
  output: 'static',
  adapter: vercel(),
  integrations: [tailwind(), sitemap()],
  vite: {
    ssr: {
      noExternal: ['gsap'],

    },
    optimizeDeps: {
      // Optimizar GSAP para mejor rendimiento
      include: ['gsap', 'gsap/ScrollTrigger']
    }
  }
});