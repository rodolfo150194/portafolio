import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import vercel from '@astrojs/vercel';

export default defineConfig({
  output: 'static',
  adapter: vercel(),
  integrations: [tailwind()],
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