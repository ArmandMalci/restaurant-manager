# UI Guidelines (Tailwind + shadcn/ui)

## Layout primitives
- **Container width:** `max-w-7xl mx-auto px-4 sm:px-6 lg:px-8` for marketing; `max-w-5xl` for app shells.
- **Stacks:** prefer `flex flex-col gap-N` over `space-y-N` (gap composes better with wrapping).
- **Grids:** `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6` is the default card grid.

## Spacing scale
- Use Tailwind's default (4px base). Don't introduce custom values.
- Section padding: `py-16 md:py-24` for marketing; `py-8 md:py-12` for app.
- Card padding: `p-6` default; `p-4` for dense lists.

## Type scale
- **Display:** `text-5xl md:text-7xl font-semibold tracking-tight`
- **H1:** `text-3xl md:text-4xl font-semibold tracking-tight`
- **H2:** `text-2xl md:text-3xl font-semibold`
- **H3:** `text-xl font-semibold`
- **Body:** `text-base leading-7` (long-form) / `text-sm leading-6` (UI)
- **Caption:** `text-xs text-muted-foreground`

## Color tokens (shadcn convention)
- `bg-background` / `text-foreground` — defaults
- `bg-card` — elevated surface
- `bg-muted` / `text-muted-foreground` — secondary content
- `bg-primary` / `text-primary-foreground` — accent (use sparingly)
- `bg-destructive` — only for actually destructive actions

## Buttons
- Default size for app, `size="lg"` for primary marketing CTAs.
- Primary button per view: ONE. Secondary actions use `variant="outline"` or `variant="ghost"`.
- Always include a hover and focus-visible state. shadcn handles this — don't override.

## Forms
- Labels above inputs, not floating.
- Error states: red border + helper text below. No tooltip-only errors.
- Disable submit while pending. Show a spinner inside the button.
- Use `react-hook-form` + `zod`. Validate on blur, not on every keystroke.

## Tables
- Sticky header on long tables.
- Right-align numbers, left-align text. Use `tabular-nums`.
- Row hover state. Click anywhere on the row to drill in.

## Empty states
- Every list/table/dashboard needs one. Don't ship "no data" without:
  - A short reason
  - A primary action (add the first item, invite a teammate, etc.)
  - Optional illustration (small, monochrome)

## Loading states
- Skeletons over spinners for layout-shifting content.
- Spinner only when you can't predict the layout.
- Optimistic UI for any action under 500ms latency.

## Mobile
- Test at 375px (iPhone SE) — if it breaks here, it's broken.
- Tap targets ≥ 44×44px.
- No hover-only interactions.
