# Project Rules

## CSS

- Always use Tailwind CSS for any styling solution. Never write custom CSS classes or `<style>` blocks with class definitions.
- Define custom animations and keyframes in `tailwind.config.mjs` under `theme.extend.keyframes` and `theme.extend.animation`.
- Use Tailwind arbitrary values (`[value]`) for one-off CSS properties that have no utility equivalent.
- Inline styles are acceptable only for dynamic values (e.g., background-image URLs) or unique decorative effects that cannot be expressed as Tailwind utilities.
