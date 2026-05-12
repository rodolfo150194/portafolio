# Skill Registry — portafolio (app_web)

Generated: 2026-05-08

## Project Context

- **Stack**: Astro 5.x + Tailwind CSS 3.x + GSAP 3.x (ScrollTrigger) + Vercel adapter
- **Type**: Static portfolio site (SSG, output: static)
- **Architecture**: Component-based (`src/components/`, `src/layouts/`, `src/pages/`)
- **Testing**: Vitest 4.x installed — no test files, no `test` script yet (`npx vitest run`)
- **Linting**: None
- **Formatter**: None
- **Deployment**: Vercel (static)

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

## Compact Rules

### astro-framework
- Use `.astro` files for all pages and layout components
- Use `client:load` / `client:visible` directives only when JS is truly needed
- Prefer static generation (SSG) — adapter only needed for Vercel deploy, already configured
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

### testing (vitest)
- Runner: `npx vitest run` (no `test` script in package.json yet)
- No test files exist — create under `src/**/*.test.ts` or `src/__tests__/`
- Coverage: install `@vitest/coverage-v8` before using `--coverage`
- Strict TDD Mode: ACTIVE — write tests before implementation

### seo-audit
- Every page must have `<title>` and `<meta name="description">`
- Use semantic HTML5 landmarks (`<header>`, `<main>`, `<section>`, `<footer>`)
- Images must have `alt` attributes

## Convention Files

- No project-level CLAUDE.md found
- Global CLAUDE.md: `C:/Users/Isaak/.claude/CLAUDE.md`
- Strict TDD Mode: enabled (from global CLAUDE.md marker)
