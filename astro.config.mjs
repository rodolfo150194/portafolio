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
      // Pre-bundle deps so they're never re-optimized mid-session
      // (avoids the "Outdated Optimize Dep" 504 on dynamic imports)
      include: ['gsap', 'gsap/ScrollTrigger', 'photoswipe', 'photoswipe/lightbox', 'photoswipe/style.css']
    }
  }
});