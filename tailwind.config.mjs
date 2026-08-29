/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      colors: {
        "bg": "var(--bg)",
        "surface": "var(--surface)",
        "surface2": "var(--surface2)",
        "border": "var(--border)",
        "text": "var(--text)",
        "text2": "var(--text2)",
        "accent": "var(--accent)",
        "accent2": "var(--accent2)",
      },
      fontFamily: {
        "grotesk": ["Space Grotesk", "sans-serif"],
        "manrope": ["Manrope", "sans-serif"],
        "jetbrains": ["JetBrains Mono", "monospace"],
      },
      borderRadius: {
        "DEFAULT": "0.25rem",
        "lg": "0.5rem",
        "xl": "0.75rem",
        "full": "9999px"
      },
      keyframes: {
        blink: { '50%': { opacity: '0' } },
        marq: { from: { transform: 'translateX(0)' }, to: { transform: 'translateX(-50%)' } },
      },
      animation: {
        blink: 'blink 1.1s steps(1) infinite',
        marq: 'marq 26s linear infinite',
      },
    },
  },
  plugins: [],
}
