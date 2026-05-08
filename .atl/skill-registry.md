# Skill Registry — app_web (portafolio_web)

Generated: 2026-04-08

## Project Context

- **Stack**: Astro 5.x + Tailwind CSS 3.x + GSAP 3.x (ScrollTrigger)
- **Type**: Static portfolio site (SSG)
- **Architecture**: Component-based (`src/components/`, `src/layouts/`, `src/pages/`)
- **Testing**: None installed
- **Linting**: None
- **Formatter**: None

## Active Skills (User-Level)

| Skill | Trigger Context |
|-------|----------------|
| `astro-framework` | Astro components, SSG, client directives, islands, content collections, astro.config |
| `frontend-design` | Building web components, pages, landing pages, UI layouts |
| `ui-ux-pro-max` | UI/UX design, color palettes, typography, accessibility, responsive design |
| `ckm-ui-styling` | Tailwind CSS styling, dark mode, component styling patterns |
| `ckm-design` | Brand identity, design tokens, logo, banners, social media images |
| `ckm-design-system` | Design system tokens, component specifications |
| `seo-audit` | SEO audit, meta tags, technical SEO |
| `sdd-*` | All SDD workflow phases (orchestrator-managed) |
| `frontend-design` | Creating or improving any web interface |

## Compact Rules

### astro-framework
- Use `.astro` files for all pages and layout components
- Use `client:load` / `client:visible` directives only when JS is truly needed
- Prefer static generation (SSG) — no adapter unless SSR is required
- Import styles via `<style>` in component or global CSS in `src/styles/`
- GSAP animations: import in `<script>` tag or a dedicated `.ts` module

### tailwind + ckm-ui-styling
- Use Tailwind utility classes directly in Astro component markup
- Avoid `@apply` in component `<style>` — prefer inline utilities
- Responsive: mobile-first (`sm:`, `md:`, `lg:`)
- Dark mode: `class` strategy if needed

### frontend-design / ui-ux-pro-max
- Aim for distinctive, non-generic aesthetics
- Use GSAP for scroll-driven animations (ScrollTrigger)
- Keep animations performant — prefer `transform` and `opacity`

### seo-audit
- Every page must have `<title>` and `<meta name="description">`
- Use semantic HTML5 landmarks (`<header>`, `<main>`, `<section>`, `<footer>`)
- Images must have `alt` attributes

## Convention Files

- No project-level CLAUDE.md found
- Global CLAUDE.md: `C:/Users/Isaak/.claude/CLAUDE.md`
