> **Superseded:** this pre-revamp token baseline no longer matches the code. See the root `DESIGN.md`.

# Design Token Baseline

All OpenDesign prompts reference these tokens by name.

## Color Palette

| Token | Value | Usage |
|---|---|---|
| `--color-primary` | #18181b (zinc-900) | Primary actions, headings |
| `--color-primary-fg` | #fafafa | Text on primary |
| `--color-secondary` | #f4f4f5 (zinc-100) | Secondary buttons, hover states |
| `--color-accent` | #f97316 (orange-500) | Highlights, active states, KDS urgency |
| `--color-success` | #22c55e (green-500) | Available tables, ready items |
| `--color-warning` | #f59e0b (amber-500) | Mid-urgency KDS items (5–10 min) |
| `--color-danger` | #ef4444 (red-500) | Overdue KDS items (>10 min), errors |
| `--color-background` | #ffffff | Page background (light) |
| `--color-surface` | #f4f4f5 (zinc-100) | Card backgrounds |
| `--color-border` | #e4e4e7 (zinc-200) | Borders, dividers |
| `--color-muted` | #71717a (zinc-500) | Secondary text |

## Typography

| Token | Value |
|---|---|
| `--font-sans` | system-ui, -apple-system, sans-serif |
| `--font-mono` | ui-monospace, monospace |
| `--text-xs` | 0.75rem / 1rem |
| `--text-sm` | 0.875rem / 1.25rem |
| `--text-base` | 1rem / 1.5rem |
| `--text-lg` | 1.125rem / 1.75rem |
| `--text-xl` | 1.25rem / 1.75rem |
| `--text-2xl` | 1.5rem / 2rem |
| `--text-4xl` | 2.25rem / 2.5rem |
| `--font-normal` | 400 |
| `--font-medium` | 500 |
| `--font-semibold` | 600 |
| `--font-bold` | 700 |

## Spacing Scale

4px base unit: 4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80, 96px

## Radius

| Token | Value |
|---|---|
| `--radius-sm` | 4px |
| `--radius-md` | 8px |
| `--radius-lg` | 12px |
| `--radius-xl` | 16px |
| `--radius-full` | 9999px |

## Shadows

| Token | Usage |
|---|---|
| `shadow-sm` | Cards, inputs |
| `shadow-md` | Dropdowns, popovers |
| `shadow-lg` | Modals, drawers |

## Component Defaults

- **Button primary:** bg-primary, text-primary-fg, radius-md, px-4 py-2, font-medium
- **Button secondary:** bg-secondary, text-foreground, border, radius-md
- **Button destructive:** bg-danger, text-white
- **Input:** border border-border, radius-md, px-3 py-2, focus:ring-2 ring-primary
- **Card:** bg-white, border border-border, radius-lg, shadow-sm, p-4
- **Badge available:** bg-success/10, text-success, radius-full
- **Badge occupied:** bg-danger/10, text-danger, radius-full
- **Badge reserved:** bg-warning/10, text-warning, radius-full
