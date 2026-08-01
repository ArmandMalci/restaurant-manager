# Design Principles

## North star
> Quality is in the details no one notices individually but everyone feels collectively.

## Hierarchy
1. **Clarity** — what's the user trying to do? Make that one thing obvious.
2. **Contrast** — important things must look more important.
3. **Rhythm** — consistent spacing, type scale, color use. Variation should be deliberate.
4. **Restraint** — every shadow, gradient, animation pays rent or gets cut.

## Type
- Limit to 2 typefaces per product. One is usually enough.
- Use a modular scale (e.g., 1.250 minor third). Don't pick sizes by eye.
- Body text 16px minimum. Line-height 1.5+ for body, 1.2 for headings.
- Don't justify text. Don't center long paragraphs.

## Color
- Start with a neutral grayscale (8–10 steps). Add ONE accent.
- Use OKLCH for predictable contrast across the palette.
- Test all text/background pairs for WCAG AA (4.5:1 for body).
- Dark mode is not "invert everything" — re-tune saturation and contrast.

## Spacing
- Pick a base unit (usually 4px or 8px). Every gap is a multiple.
- More space > less. Cramped UIs feel cheap.
- Group related items closer than unrelated items (proximity).

## Motion
- Animations exist to explain state change, not decorate.
- 150–250ms for UI transitions. Faster feels broken; slower feels sluggish.
- Easing: `ease-out` for entering, `ease-in` for exiting, never `linear`.
- Respect `prefers-reduced-motion`.

## Accessibility (non-negotiable)
- Keyboard nav works for every interactive element.
- Focus indicators visible (don't `outline: none` without replacement).
- Form labels are real `<label>` elements, not placeholder hacks.
- Images have alt text. Decorative images use `alt=""`.
- Color is never the only signal (add icon, label, or pattern).

## When in doubt
- Refer to ui-ux-pro-max skill for palettes, fonts, patterns.
- Ship the boring, proven pattern over the clever, novel one.
