import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';

// https://astro.build/config
export default defineConfig({
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