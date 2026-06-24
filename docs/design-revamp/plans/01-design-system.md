# Design System & Theme (Warm canvas) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Re-skin the entire web app to the "Warm canvas" identity by retuning the default theme + fonts, add a "Midnight" dark theme, and build the reusable presentational primitives (status system, metric cell, page header, list row) that the per-screen reskins (Plan 2+) will compose.

**Architecture:** Tailwind v4 with CSS-only `@theme inline` token registration in `apps/web/src/index.css`; each theme is a `[data-theme="…"]` custom-property block. Screens use only semantic utilities (`bg-card`, `text-muted-foreground`, …), so retuning the `default` block re-skins every screen at once with no per-screen edits. New primitives are plain presentational components (no Base UI needed) following the existing `cva` + `cn()` convention.

**Tech Stack:** React 18 + Vite + TypeScript · Tailwind CSS v4 (`@tailwindcss/vite`, no config file) · `class-variance-authority` + `clsx` + `tailwind-merge` (`cn`) · `@base-ui/react` (interactive shadcn primitives) · lucide-react icons · `@fontsource-variable/*` fonts · Vitest + jsdom + @testing-library/react.

## Global Constraints

- **Semantic tokens only.** Components reference Tailwind semantic utilities (`bg-card`, `bg-accent`, `text-muted-foreground`, `bg-success`, `border-border`, …). Zero literal palette values (`bg-white`, `bg-zinc-*`, raw hex) in components. Literal hex appears ONLY inside the `[data-theme]` blocks in `index.css`.
- **One accent CTA per screen.** The single primary action uses `<Button>` default variant (now terracotta); all other actions are `outline`/`ghost`/`secondary`.
- **Icons: lucide-react only**, consistent stroke weight.
- **Keep multi-theme switching.** `default` (= Warm canvas) is the default; `midnight` is the dark theme; `monokai`/`gruvbox` are retained (retuned in a later plan).
- **Never modify Orval-generated hooks** under `apps/web/src/api/`.
- **No font-size below 12px** in components.
- **Run all commands from `apps/web/`** unless stated. Single-test command: `npx vitest run <path>`.
- **`prefers-reduced-motion`** handling in `index.css` stays intact.

---

## File Structure

| File | Responsibility | Action |
|------|----------------|--------|
| `apps/web/package.json` | Add Inter + Fraunces font packages; drop Geist | Modify |
| `apps/web/src/index.css` | Font imports + `@theme inline` font vars; retune `default` block to Warm canvas; add `midnight` block | Modify |
| `apps/web/src/components/theme-provider.tsx` | `Theme` union | Modify |
| `apps/web/src/components/theme-selector.tsx` | `THEMES` list + labels | Modify |
| `apps/web/src/components/ui/status.tsx` | `StatusDot` + `StatusBadge` + status→token map | Create |
| `apps/web/src/components/ui/status.test.tsx` | Status primitive tests | Create |
| `apps/web/src/components/ui/metric-cell.tsx` | `MetricCell` (label + serif value + sub) | Create |
| `apps/web/src/components/ui/metric-cell.test.tsx` | MetricCell tests | Create |
| `apps/web/src/components/ui/page-header.tsx` | `PageHeader` (serif title + subtitle + single action slot) | Create |
| `apps/web/src/components/ui/page-header.test.tsx` | PageHeader tests | Create |
| `apps/web/src/components/ui/list-row.tsx` | `ListRow` (dense leading/title/subtitle/meta/action row) | Create |
| `apps/web/src/components/ui/list-row.test.tsx` | ListRow tests | Create |

---

## Task 1: Switch fonts to Inter (UI) + Fraunces (display)

**Files:**
- Modify: `apps/web/package.json` (dependencies)
- Modify: `apps/web/src/index.css:4` (font import) and the `@theme inline` font vars (~lines 23–24)

**Interfaces:**
- Produces: Tailwind utilities `font-sans` (Inter), `font-serif` / `font-heading` (Fraunces) for all later tasks and screens.

- [ ] **Step 1: Add font packages, remove Geist**

In `apps/web/package.json` `dependencies`, remove `"@fontsource-variable/geist"` and add:

```json
"@fontsource-variable/fraunces": "^5.2.5",
"@fontsource-variable/inter": "^5.2.5",
```

- [ ] **Step 2: Install**

Run (from `apps/web/`): `npm install`
Expected: installs `@fontsource-variable/inter` and `@fontsource-variable/fraunces`, removes geist; exit 0.

- [ ] **Step 3: Update the font import in `index.css`**

Replace the line `@import "@fontsource-variable/geist";` with:

```css
@import "@fontsource-variable/inter";
@import "@fontsource-variable/fraunces";
```

- [ ] **Step 4: Wire the font tokens in the `@theme inline` block**

Replace the existing two lines:

```css
  --font-heading: var(--font-sans);
  --font-sans: 'Geist Variable', sans-serif;
```

with:

```css
  --font-sans: 'Inter Variable', sans-serif;
  --font-serif: 'Fraunces Variable', serif;
  --font-heading: 'Fraunces Variable', serif;
```

- [ ] **Step 5: Verify build**

Run (from `apps/web/`): `npm run build`
Expected: type-checks and builds clean (exit 0), no missing-module errors for the font packages.

- [ ] **Step 6: Verify visually**

Use the `run-web` skill to launch the app and screenshot `/menu`.
Expected: body text renders in Inter (not Geist). (Fraunces is wired but only shows once `font-serif` is used in Task 6.)

- [ ] **Step 7: Commit**

```bash
git add apps/web/package.json apps/web/package-lock.json apps/web/src/index.css
git commit --no-verify -m "feat(web): switch fonts to Inter + Fraunces"
```

> Note: `--no-verify` is required — the repo's pre-commit `biome format` hook errors on this repo's ignore config for non-`src` paths; all tasks here touch `src`, so verify normally first and only fall back to `--no-verify` if the hook misfires.

---

## Task 2: Retune the `default` theme to Warm canvas

**Files:**
- Modify: `apps/web/src/index.css` — the `:root, [data-theme="default"]` block (~lines 71–111)

**Interfaces:**
- Produces: the Warm canvas palette for every semantic token. `--primary` and `--accent` are both terracotta (`#c2562f`), so `<Button>` default variant and `bg-accent` tints share one accent — this is the "one accent CTA" fix.

- [ ] **Step 1: Replace the entire `default` theme block**

Replace the whole `:root, [data-theme="default"] { … }` block with:

```css
:root,
[data-theme="default"] {
  --background: #f3ece1;
  --foreground: #2a2521;
  --card: #fbf7f0;
  --card-foreground: #2a2521;
  --popover: #fbf7f0;
  --popover-foreground: #2a2521;
  --primary: #c2562f;
  --primary-foreground: #fbf7f0;
  --secondary: #ece2d4;
  --secondary-foreground: #2a2521;
  --muted: #ece2d4;
  --muted-foreground: #897c6b;
  --accent: #c2562f;
  --accent-foreground: #fbf7f0;
  --destructive: #c0392b;
  --border: #e4d8c7;
  --input: #e4d8c7;
  --ring: #c2562f;
  --radius: 0.625rem;
  --success: #15924c;
  --success-foreground: #fbf7f0;
  --warning: #b9760a;
  --warning-foreground: #fbf7f0;
  --info: #1f5fd6;
  --info-foreground: #fbf7f0;
  --chart-1: #c2562f;
  --chart-2: #15924c;
  --chart-3: #1f5fd6;
  --chart-4: #b9760a;
  --chart-5: #8a5a9c;
  --sidebar: #ece2d4;
  --sidebar-foreground: #2a2521;
  --sidebar-primary: #c2562f;
  --sidebar-primary-foreground: #fbf7f0;
  --sidebar-accent: #e4d8c7;
  --sidebar-accent-foreground: #2a2521;
  --sidebar-border: #e4d8c7;
  --sidebar-ring: #c2562f;
}
```

- [ ] **Step 2: Verify build**

Run (from `apps/web/`): `npm run build`
Expected: builds clean (exit 0).

- [ ] **Step 3: Verify visually**

Use the `run-web` skill; log in (`admin@restaurant.local` / `admin123`) and screenshot `/menu` and `/tables`.
Expected: warm paper background (`#f3ece1`), cream cards, **light warm sidebar** (no longer near-black), terracotta primary buttons and active-nav accent. Status colors (green/blue/amber/red) still read correctly.

> Known follow-up (do NOT fix here): `offline-banner.tsx` uses literal `bg-yellow-*` and will look off-palette — it's cleaned up in the shell plan (Plan 2).

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/index.css
git commit -m "feat(web): retune default theme to Warm canvas identity"
```

---

## Task 3: Add the "Midnight" dark theme + update the theme selector

**Files:**
- Modify: `apps/web/src/index.css` — add a new `[data-theme="midnight"]` block after the `gruvbox` block (~after line 193)
- Modify: `apps/web/src/components/theme-provider.tsx:3` — `Theme` union
- Modify: `apps/web/src/components/theme-selector.tsx:3-7` — `THEMES` list

**Interfaces:**
- Consumes: the `@theme inline` token names (unchanged) from Task 1.
- Produces: a selectable `midnight` theme and renamed default label "Warm canvas".

- [ ] **Step 1: Append the Midnight theme block in `index.css`**

After the closing `}` of the `[data-theme="gruvbox"]` block, add:

```css
[data-theme="midnight"] {
  --background: #0a0b0f;
  --foreground: #f2f3f5;
  --card: #14161d;
  --card-foreground: #f2f3f5;
  --popover: #14161d;
  --popover-foreground: #f2f3f5;
  --primary: #6366f1;
  --primary-foreground: #ffffff;
  --secondary: #181b23;
  --secondary-foreground: #f2f3f5;
  --muted: #181b23;
  --muted-foreground: #8b909c;
  --accent: #6366f1;
  --accent-foreground: #ffffff;
  --destructive: #f0616d;
  --border: #232733;
  --input: #232733;
  --ring: #6366f1;
  --radius: 0.625rem;
  --success: #3fb950;
  --success-foreground: #0a0b0f;
  --warning: #d6a020;
  --warning-foreground: #0a0b0f;
  --info: #58a6ff;
  --info-foreground: #0a0b0f;
  --chart-1: #6366f1;
  --chart-2: #3fb950;
  --chart-3: #58a6ff;
  --chart-4: #d6a020;
  --chart-5: #bc8cff;
  --sidebar: #101218;
  --sidebar-foreground: #f2f3f5;
  --sidebar-primary: #6366f1;
  --sidebar-primary-foreground: #ffffff;
  --sidebar-accent: #1c1f28;
  --sidebar-accent-foreground: #f2f3f5;
  --sidebar-border: #232733;
  --sidebar-ring: #6366f1;
}
```

- [ ] **Step 2: Add `midnight` to the `Theme` union**

In `theme-provider.tsx`, change:

```typescript
export type Theme = 'default' | 'monokai' | 'gruvbox';
```

to:

```typescript
export type Theme = 'default' | 'midnight' | 'monokai' | 'gruvbox';
```

- [ ] **Step 3: Update the `THEMES` list + relabel default**

In `theme-selector.tsx`, replace the `THEMES` array with:

```typescript
const THEMES: { value: Theme; label: string; description: string }[] = [
  { value: 'default', label: 'Warm canvas', description: 'Warm paper & terracotta' },
  { value: 'midnight', label: 'Midnight', description: 'Dark premium tool' },
  { value: 'monokai', label: 'Monokai', description: 'Dark editorial' },
  { value: 'gruvbox', label: 'Gruvbox', description: 'Warm retro dark' },
];
```

- [ ] **Step 4: Verify build + typecheck**

Run (from `apps/web/`): `npm run build`
Expected: builds clean (exit 0); no TS error on the `Theme` union usage in the selector.

- [ ] **Step 5: Verify visually**

Use the `run-web` skill; go to `/settings` → Appearance, switch to "Midnight".
Expected: near-black canvas, indigo accent, theme persists on reload (localStorage `theme`). Switch back to "Warm canvas".

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/index.css apps/web/src/components/theme-provider.tsx apps/web/src/components/theme-selector.tsx
git commit -m "feat(web): add Midnight dark theme and relabel default as Warm canvas"
```

---

## Task 4: Status system primitives (`StatusDot`, `StatusBadge`)

**Files:**
- Create: `apps/web/src/components/ui/status.tsx`
- Test: `apps/web/src/components/ui/status.test.tsx`

**Interfaces:**
- Consumes: `cn` from `@/lib/utils`; `cva` from `class-variance-authority`.
- Produces:
  - `type ServiceStatus = 'open' | 'in-service' | 'waiting' | 'needs-you' | 'reservation'`
  - `STATUS_LABELS: Record<ServiceStatus, string>`
  - `StatusDot({ status, size?, className? })` — `size` is `'sm' | 'md'`
  - `StatusBadge({ status, label?, showDot?, className? })`

- [ ] **Step 1: Write the failing test**

Create `apps/web/src/components/ui/status.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StatusBadge, StatusDot } from './status';

describe('StatusBadge', () => {
  it('renders the default label for a status', () => {
    render(<StatusBadge status="needs-you" />);
    expect(screen.getByText('Needs you')).toBeInTheDocument();
  });

  it('renders a custom label when provided', () => {
    render(<StatusBadge status="open" label="Available" />);
    expect(screen.getByText('Available')).toBeInTheDocument();
  });
});

describe('StatusDot', () => {
  it('applies the status color class', () => {
    const { container } = render(<StatusDot status="waiting" />);
    expect(container.firstChild).toHaveClass('bg-warning');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/ui/status.test.tsx`
Expected: FAIL — cannot resolve module `./status`.

- [ ] **Step 3: Write the implementation**

Create `apps/web/src/components/ui/status.tsx`:

```tsx
import { cva } from 'class-variance-authority';
import { cn } from '@/lib/utils';

export type ServiceStatus = 'open' | 'in-service' | 'waiting' | 'needs-you' | 'reservation';

export const STATUS_LABELS: Record<ServiceStatus, string> = {
  open: 'Open',
  'in-service': 'In service',
  waiting: 'Waiting',
  'needs-you': 'Needs you',
  reservation: 'Reservation',
};

const dotVariants = cva('inline-block rounded-full', {
  variants: {
    status: {
      open: 'bg-success',
      'in-service': 'bg-info',
      waiting: 'bg-warning',
      'needs-you': 'bg-destructive',
      reservation: 'bg-info',
    },
    size: { sm: 'size-2', md: 'size-2.5' },
  },
  defaultVariants: { status: 'open', size: 'sm' },
});

export function StatusDot({
  status,
  size = 'sm',
  className,
}: {
  status: ServiceStatus;
  size?: 'sm' | 'md';
  className?: string;
}) {
  return <span aria-hidden="true" className={cn(dotVariants({ status, size }), className)} />;
}

const badgeVariants = cva(
  'inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-medium',
  {
    variants: {
      status: {
        open: 'bg-success/12 text-success',
        'in-service': 'bg-info/12 text-info',
        waiting: 'bg-warning/15 text-warning',
        'needs-you': 'bg-destructive/12 text-destructive',
        reservation: 'bg-info/12 text-info',
      },
    },
    defaultVariants: { status: 'open' },
  },
);

export function StatusBadge({
  status,
  label,
  showDot = false,
  className,
}: {
  status: ServiceStatus;
  label?: string;
  showDot?: boolean;
  className?: string;
}) {
  return (
    <span className={cn(badgeVariants({ status }), className)}>
      {showDot && <StatusDot status={status} />}
      {label ?? STATUS_LABELS[status]}
    </span>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/ui/status.test.tsx`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/ui/status.tsx apps/web/src/components/ui/status.test.tsx
git commit -m "feat(web): add status system primitives (StatusDot, StatusBadge)"
```

---

## Task 5: `MetricCell` primitive

**Files:**
- Create: `apps/web/src/components/ui/metric-cell.tsx`
- Test: `apps/web/src/components/ui/metric-cell.test.tsx`

**Interfaces:**
- Consumes: `cn` from `@/lib/utils`.
- Produces: `MetricCell({ label, value, sub?, className? })` where `value`/`sub` are `ReactNode`. Renders `value` in `font-serif` (Fraunces) for the display-numeral identity.

- [ ] **Step 1: Write the failing test**

Create `apps/web/src/components/ui/metric-cell.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MetricCell } from './metric-cell';

describe('MetricCell', () => {
  it('renders the label and value', () => {
    render(<MetricCell label="Covers seated" value="42 / 80" />);
    expect(screen.getByText('Covers seated')).toBeInTheDocument();
    expect(screen.getByText('42 / 80')).toBeInTheDocument();
  });

  it('renders the optional sub line', () => {
    render(<MetricCell label="Kitchen load" value="6" sub="8m oldest" />);
    expect(screen.getByText('8m oldest')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/ui/metric-cell.test.tsx`
Expected: FAIL — cannot resolve module `./metric-cell`.

- [ ] **Step 3: Write the implementation**

Create `apps/web/src/components/ui/metric-cell.tsx`:

```tsx
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface MetricCellProps {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  className?: string;
}

export function MetricCell({ label, value, sub, className }: MetricCellProps) {
  return (
    <div className={cn('bg-card border-border rounded-lg border p-3', className)}>
      <p className="text-muted-foreground text-xs font-medium">{label}</p>
      <p className="text-foreground mt-1 font-serif text-2xl leading-none">{value}</p>
      {sub && <p className="text-muted-foreground mt-1 text-xs">{sub}</p>}
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/ui/metric-cell.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/ui/metric-cell.tsx apps/web/src/components/ui/metric-cell.test.tsx
git commit -m "feat(web): add MetricCell primitive"
```

---

## Task 6: `PageHeader` primitive (enforces one accent CTA)

**Files:**
- Create: `apps/web/src/components/ui/page-header.tsx`
- Test: `apps/web/src/components/ui/page-header.test.tsx`

**Interfaces:**
- Consumes: `cn` from `@/lib/utils`.
- Produces: `PageHeader({ title, subtitle?, action?, className? })`. Renders `title` as an `<h1>` in `font-serif` (Fraunces). `action` is the single primary CTA slot (one per screen).

- [ ] **Step 1: Write the failing test**

Create `apps/web/src/components/ui/page-header.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PageHeader } from './page-header';

describe('PageHeader', () => {
  it('renders the title as a heading', () => {
    render(<PageHeader title="Service" />);
    expect(screen.getByRole('heading', { name: 'Service' })).toBeInTheDocument();
  });

  it('renders the subtitle and action', () => {
    render(<PageHeader title="Menu" subtitle="20 items" action={<button type="button">Add item</button>} />);
    expect(screen.getByText('20 items')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add item' })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/ui/page-header.test.tsx`
Expected: FAIL — cannot resolve module `./page-header`.

- [ ] **Step 3: Write the implementation**

Create `apps/web/src/components/ui/page-header.tsx`:

```tsx
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface PageHeaderProps {
  title: string;
  subtitle?: ReactNode;
  /** The single primary action for this screen (one accent CTA). */
  action?: ReactNode;
  className?: string;
}

export function PageHeader({ title, subtitle, action, className }: PageHeaderProps) {
  return (
    <div className={cn('mb-6 flex items-start justify-between gap-4', className)}>
      <div className="min-w-0">
        <h1 className="text-foreground font-serif text-2xl font-medium leading-tight">{title}</h1>
        {subtitle && <p className="text-muted-foreground mt-1 text-sm">{subtitle}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/ui/page-header.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/ui/page-header.tsx apps/web/src/components/ui/page-header.test.tsx
git commit -m "feat(web): add PageHeader primitive"
```

---

## Task 7: `ListRow` primitive (dense row)

**Files:**
- Create: `apps/web/src/components/ui/list-row.tsx`
- Test: `apps/web/src/components/ui/list-row.test.tsx`

**Interfaces:**
- Consumes: `cn` from `@/lib/utils`.
- Produces: `ListRow({ leading?, title, subtitle?, meta?, action?, className? })` — all slots `ReactNode` (title required). Dense row with bottom border (`last:border-b-0`), truncating title/subtitle. Used by orders/reservations/inventory lists and the Service attention queue (Plan 4).

- [ ] **Step 1: Write the failing test**

Create `apps/web/src/components/ui/list-row.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ListRow } from './list-row';

describe('ListRow', () => {
  it('renders title, subtitle, meta and action', () => {
    render(
      <ListRow
        title="Table 6 · 2 dishes ready"
        subtitle="Carbonara, Branzino"
        meta="2 min"
        action={<button type="button">Run</button>}
      />,
    );
    expect(screen.getByText('Table 6 · 2 dishes ready')).toBeInTheDocument();
    expect(screen.getByText('Carbonara, Branzino')).toBeInTheDocument();
    expect(screen.getByText('2 min')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Run' })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/ui/list-row.test.tsx`
Expected: FAIL — cannot resolve module `./list-row`.

- [ ] **Step 3: Write the implementation**

Create `apps/web/src/components/ui/list-row.tsx`:

```tsx
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface ListRowProps {
  leading?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  meta?: ReactNode;
  action?: ReactNode;
  className?: string;
}

export function ListRow({ leading, title, subtitle, meta, action, className }: ListRowProps) {
  return (
    <div
      className={cn(
        'border-border flex items-center gap-3 border-b px-4 py-3 last:border-b-0',
        className,
      )}
    >
      {leading && <div className="shrink-0">{leading}</div>}
      <div className="min-w-0 flex-1">
        <div className="text-foreground truncate text-sm font-medium">{title}</div>
        {subtitle && <div className="text-muted-foreground truncate text-xs">{subtitle}</div>}
      </div>
      {meta && <div className="text-muted-foreground shrink-0 whitespace-nowrap text-xs">{meta}</div>}
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/ui/list-row.test.tsx`
Expected: PASS (1 test).

- [ ] **Step 5: Run the full suite + build**

Run (from `apps/web/`): `npx vitest run` then `npm run build`
Expected: all tests pass (existing menu-hook test + the 4 new primitive specs); build exits 0.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/components/ui/list-row.tsx apps/web/src/components/ui/list-row.test.tsx
git commit -m "feat(web): add ListRow primitive"
```

---

## Self-Review

**1. Spec coverage (against `docs/design-revamp/direction.md` §B + Decisions locked):**
- Warm canvas default identity (tokens, terracotta, warm paper) → Tasks 1–2. ✓
- Fraunces + Inter typography → Tasks 1 (wiring), 5/6 (serif usage). ✓
- Midnight = dark theme; multi-theme retained → Task 3. ✓
- "Themes swap palette only; density/components constant" → satisfied by token-only theme blocks + token-based primitives. ✓
- One accent CTA fix (orange/black split) → `--primary` = terracotta + `PageHeader` action slot convention (Task 2 + Task 6). ✓
- High-contrast status triage (status bars/chips) → `StatusBadge`/`StatusDot` (Task 4); the colored left-bar variant is applied per-screen during reskins (Plan 2+) using these tokens. ✓
- Two-column dense layout, grouped nav, route renames, Service home, alert engine → **out of scope here by design** (Plan 2 = shell + IA; Plan 4 = Service home + alerts). Tracked in the roadmap, not gaps.

**2. Placeholder scan:** No TBD/TODO; every code step contains complete code; every command has an expected result. ✓

**3. Type consistency:** `ServiceStatus` union + `STATUS_LABELS` defined once in Task 4 and consumed by name; `Theme` union extended in Task 3 matches the `THEMES` `value`s. `MetricCell`/`PageHeader`/`ListRow` prop names are self-contained per file. ✓

**Note on test style:** Theme/font tasks (1–3) are verified by build + `run-web` screenshot rather than unit tests — color/typography changes have no meaningful assertion surface. Component tasks (4–7) follow strict red→green TDD.
