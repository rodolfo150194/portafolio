/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      colors: {
        "primary": "#22D3EE",
        "background-light": "#F8FAFC",
        "background-dark": "#0F172A",
        "background-dark-gradient-end": "#1E293B",
      },
      fontFamily: {
        "display": ["Syne", "sans-serif"],
        "body": ["Plus Jakarta Sans", "sans-serif"],
        "barlow": ["Barlow Condensed", "sans-serif"],
        "space": ["Space Mono", "monospace"],
        "jetbrains": ["JetBrains Mono", "monospace"],
        "bebas": ["Bebas Neue", "sans-serif"],
      },
      borderRadius: {
        "DEFAULT": "0.25rem",
        "lg": "0.5rem",
        "xl": "0.75rem",
        "full": "9999px"
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%':       { transform: 'translateY(-12px)' },
        },
        'spin-reverse': {
          from: { transform: 'rotate(360deg)' },
          to:   { transform: 'rotate(0deg)' },
        },
        pulseDiamond: {
          '0%':   { transform: 'rotate(45deg) scale(1)',   opacity: '0.75' },
          '100%': { transform: 'rotate(45deg) scale(2.4)', opacity: '0' },
        },
      },
      animation: {
        float:              'float 4s ease-in-out infinite',
        'spin-slow':        'spin 20s linear infinite',
        'spin-slow-reverse':'spin-reverse 30s linear infinite',
        pulseDiamond:       'pulseDiamond 2.8s ease-out infinite',
      },
    },
  },
  plugins: [],
}
