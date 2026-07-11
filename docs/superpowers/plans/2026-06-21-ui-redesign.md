# UI Redesign Plan — Restaurant Manager

**Date:** 2026-06-21  
**Revised:** 2026-06-21 (added multi-theme system)  
**Status:** Ready for execution  
**Scope:** Full visual redesign of the `apps/web` frontend. The app is functionally complete but visually unstyled — every design token is achromatic gray (chroma=0), the sidebar is white with indistinguishable active states, and there is no accent color. This plan introduces a confirmed design system derived from 35 UX Pilot HTML exports, a multi-theme architecture supporting named themes (default, monokai, gruvbox), and applies it across the app shell and all 11 routes, followed by motion/responsive/empty-state polish.

> **No backend changes.** This is a pure frontend (`apps/web/src/`) effort. Do not touch the NestJS API, Prisma, or Orval-generated client code. Data flows already exist; this redesign re-skins the views that consume them.

---

## 1. Design System Summary

### 1.1 Confirmed token palette — default theme

Derived from the dark-shell family of exports (Designmate 3 + RestoManager PWA). Every export uses the same Tailwind zinc + orange palette.

| Role | Hex | Tailwind | OKLCH | Notes |
|------|-----|----------|-------|-------|
| Brand accent | `#f97316` | orange-500 | `oklch(0.702 0.197 49.2)` | **NEW** — the single accent for the whole app |
| Accent foreground | `#ffffff` | white | `oklch(1 0 0)` | text/icon on accent |
| Primary / text | `#18181b` | zinc-900 | `oklch(0.167 0 0)` | keep existing primary |
| Content background | `#f4f4f5` | zinc-100 | `oklch(0.961 0.003 286)` | **CHANGED from white** |
| Card / surface | `#ffffff` | white | `oklch(1 0 0)` | surfaces lift above bg |
| Muted text | `#71717a` | zinc-500 | `oklch(0.556 0 0)` | keep existing |
| Border | `#e4e4e7` | zinc-200 | `oklch(0.922 0 0)` | keep existing |
| Sidebar bg | `#09090b` | zinc-950 | `oklch(0.12 0 0)` | **CHANGED from white — dark shell** |
| Sidebar foreground | `#f4f4f5` | zinc-100 | `oklch(0.961 0.003 286)` | |
| Sidebar accent (active row bg) | `#27272a` | zinc-800 | `oklch(0.274 0 0)` | |
| Sidebar accent foreground | `#ffffff` | white | `oklch(1 0 0)` | |
| Success | `#22c55e` | green-500 | `oklch(0.723 0.219 149.6)` | status badges |
| Warning | `#f59e0b` | amber-500 | `oklch(0.769 0.188 70.1)` | status badges |
| Destructive | `#ef4444` | red-500 | `oklch(0.577 0.245 27.325)` | keep existing |

### 1.2 Multi-theme architecture

**The design system is not a single `:root` block — it is a swappable set of named themes.** Each theme is a complete set of CSS custom property overrides keyed to a `data-theme` attribute on `<html>`. The `@theme inline` registrations in `index.css` map Tailwind utility classes to the `--*` variable names; those registrations never change — only the values change per theme.

```
:root, [data-theme="default"] { /* orange + zinc */ }
[data-theme="monokai"]        { /* Monokai dark  */ }
[data-theme="gruvbox"]        { /* Gruvbox dark  */ }
```

A `ThemeProvider` React context reads `localStorage.getItem('theme')` on mount, writes `data-theme` on `<html>`, and exposes `{ theme, setTheme }`. A tiny inline `<script>` in `apps/web/index.html` reads the same key and sets `data-theme` synchronously before first paint — this prevents FOUC (the React effect runs after hydration; without the inline script the page flashes default tokens first).

**The `.dark` CSS class block is removed.** It is superseded by the named theme mechanism. Named themes are the exclusive source of truth for all token values. No `dark:` Tailwind utilities may be added (the app uses explicit theme selectors, not system dark mode).

**Mandate for all Phase 2 screen tasks:** Components must reference **only semantic token names** via Tailwind utilities (`bg-card`, `bg-background`, `bg-accent`, `text-foreground`, `text-muted-foreground`, `border-border`, etc.) — zero literal color values (no `bg-zinc-950`, no `text-orange-500`, no `#hex` values in any component). This is what makes all themes work without screen-specific overrides. The only literal colors allowed are inside `index.css` itself, in the theme definition blocks.

### 1.3 Typography & radius

- **Font:** keep Geist Variable (`@fontsource-variable/geist`, already imported). No font change.
- **Radius:** `0.5rem` (8px) base. Cards/drawers use `--radius-lg`, badges/inputs use `--radius-md`, pills use full.

### 1.4 Design-family reconciliation rule (CRITICAL)

Two design families exist in the exports:

- **Dark-shell family** — Designmate 3 + RestoManager PWA (files 24–35). Dark zinc-950 sidebar, orange accent, zinc-100 content background. **This is the PRIMARY REFERENCE for the entire app.**
- **Light-shell family** — Designify (files 1–10). Light gray sidebar, no orange, gray accents. **LAYOUT REFERENCE ONLY.**

**Rule:** For any screen where only a Designify (light-shell) export exists — notifications, staff schedule/directory, availability — port its *layout and information architecture* onto the dark-shell token system. Use the zinc-950 sidebar, the zinc-100 content background, the white cards, and the orange accent. **Never reproduce the light-sidebar aesthetic or the gray-accent buttons.** Every screen in the app must look like it belongs to the dark-shell family when the default theme is active.

### 1.5 Impeccable constraints (apply to every task)

- No gradient text. No decorative glassmorphism. No cream/sand/beige backgrounds (zinc-100 is the neutral-correct background for the default theme).
- Exactly **one primary CTA per screen** (accent-filled button). All other actions are secondary (outline/ghost).
- Lucide icons only, consistent stroke weight.
- Every interactive element must have distinct hover, active/selected, focus-visible, and disabled states.
- `prefers-reduced-motion: reduce` must disable/neutralize all non-essential animation.
- Transition durations: **150ms** micro-interactions (hover, color), **200ms** drawers/modals, **300ms** complex/multi-property.
- Status colors are semantic and consistent everywhere: available/active = success, pending/warning = warning, occupied/error = destructive, accent actions = accent.
- **Zero literal palette values in components.** Only semantic token utilities. See §1.2.

### 1.6 Complete token contract

Every theme must define all of the following custom properties. Any omitted token is a broken screen.

**Semantic surface tokens:** `--background`, `--foreground`, `--card`, `--card-foreground`, `--popover`, `--popover-foreground`

**Interactive tokens:** `--primary`, `--primary-foreground`, `--secondary`, `--secondary-foreground`, `--muted`, `--muted-foreground`, `--accent`, `--accent-foreground`, `--destructive`

**Chrome tokens:** `--border`, `--input`, `--ring`, `--radius`

**Status tokens (register in `@theme inline`):** `--success`, `--success-foreground`, `--warning`, `--warning-foreground`

**Sidebar tokens:** `--sidebar`, `--sidebar-foreground`, `--sidebar-primary`, `--sidebar-primary-foreground`, `--sidebar-accent`, `--sidebar-accent-foreground`, `--sidebar-border`, `--sidebar-ring`

**Chart tokens:** `--chart-1` through `--chart-5`

### 1.7 Theme catalog

Three named themes. Canonical hex values used directly (no hand-rolled OKLCH conversions for externally-defined palettes — CSS accepts hex anywhere a color is valid). OKLCH is used only for the default theme tokens that we are designing from scratch.

#### default — orange + zinc (light content)
Based on §1.1. Background zinc-100, dark zinc-950 sidebar, orange-500 accent.  
Content polarity: **light** — dark text on light surfaces.

#### monokai — Monokai editorial (dark content)
Based on Monokai Pro canonical palette. Orange accent survives (`#fd971f`).  
Content polarity: **dark** — light text on dark surfaces.

| Role | Hex |
|------|-----|
| `--background` | `#272822` |
| `--foreground` | `#f8f8f2` |
| `--card` | `#3e3d32` |
| `--card-foreground` | `#f8f8f2` |
| `--popover` | `#3e3d32` |
| `--popover-foreground` | `#f8f8f2` |
| `--primary` | `#f8f8f2` |
| `--primary-foreground` | `#272822` |
| `--secondary` | `#49483e` |
| `--secondary-foreground` | `#f8f8f2` |
| `--muted` | `#49483e` |
| `--muted-foreground` | `#75715e` |
| `--accent` | `#fd971f` |
| `--accent-foreground` | `#272822` |
| `--destructive` | `#f92672` |
| `--border` | `#49483e` |
| `--input` | `#49483e` |
| `--ring` | `#fd971f` |
| `--success` | `#a6e22e` |
| `--success-foreground` | `#272822` |
| `--warning` | `#e6db74` |
| `--warning-foreground` | `#272822` |
| `--sidebar` | `#1e1f1c` |
| `--sidebar-foreground` | `#f8f8f2` |
| `--sidebar-primary` | `#fd971f` |
| `--sidebar-primary-foreground` | `#272822` |
| `--sidebar-accent` | `#383830` |
| `--sidebar-accent-foreground` | `#f8f8f2` |
| `--sidebar-border` | `#383830` |
| `--sidebar-ring` | `#fd971f` |
| `--chart-1` | `#fd971f` |
| `--chart-2` | `#a6e22e` |
| `--chart-3` | `#66d9e8` |
| `--chart-4` | `#e6db74` |
| `--chart-5` | `#ae81ff` |

#### gruvbox — Gruvbox warm retro (dark content)
Based on Gruvbox Dark canonical palette. Orange accent survives (`#fe8019`).  
Content polarity: **dark** — warm cream text on earthy dark surfaces.

| Role | Hex |
|------|-----|
| `--background` | `#282828` |
| `--foreground` | `#ebdbb2` |
| `--card` | `#3c3836` |
| `--card-foreground` | `#ebdbb2` |
| `--popover` | `#3c3836` |
| `--popover-foreground` | `#ebdbb2` |
| `--primary` | `#ebdbb2` |
| `--primary-foreground` | `#282828` |
| `--secondary` | `#504945` |
| `--secondary-foreground` | `#ebdbb2` |
| `--muted` | `#3c3836` |
| `--muted-foreground` | `#928374` |
| `--accent` | `#fe8019` |
| `--accent-foreground` | `#282828` |
| `--destructive` | `#cc241d` |
| `--border` | `#504945` |
| `--input` | `#504945` |
| `--ring` | `#fe8019` |
| `--success` | `#b8bb26` |
| `--success-foreground` | `#282828` |
| `--warning` | `#d79921` |
| `--warning-foreground` | `#282828` |
| `--sidebar` | `#1d2021` |
| `--sidebar-foreground` | `#ebdbb2` |
| `--sidebar-primary` | `#fe8019` |
| `--sidebar-primary-foreground` | `#282828` |
| `--sidebar-accent` | `#32302f` |
| `--sidebar-accent-foreground` | `#ebdbb2` |
| `--sidebar-border` | `#3c3836` |
| `--sidebar-ring` | `#fe8019` |
| `--chart-1` | `#fe8019` |
| `--chart-2` | `#b8bb26` |
| `--chart-3` | `#83a598` |
| `--chart-4` | `#d79921` |
| `--chart-5` | `#d3869b` |

---

## 2. Work Phases & Sequencing

```
Phase 0 — Foundation        (3 tasks, must complete first; blocks everything)
   ├─ T0.1 Token contract + CSS theme blocks (3 named themes in index.css)
   ├─ T0.2 PRODUCT.md + shared primitives audit
   └─ T0.3 ThemeProvider + ThemeSelector + FOUC prevention
        │
Phase 1 — App Shell         (1 task; depends on T0.1 + T0.3)
   └─ T1.1 Sidebar + topbar + layout redesign
        │
Phase 2 — Screens           (11 tasks; all depend on T1.1, parallel with each other)
   ├─ T2.1 Login        ├─ T2.5 Orders       ├─ T2.9  Inventory
   ├─ T2.2 Dashboard    ├─ T2.6 Reservations ├─ T2.10 Reports
   ├─ T2.3 Tables       ├─ T2.7 Staff        └─ T2.11 Billing
   ├─ T2.4 Menu         └─ T2.8 Settings + Notifications + ThemeSelector
        │
Phase 3 — Polish           (3 tasks; depend on Phase 2 complete)
   ├─ T3.1 Motion & micro-interactions
   ├─ T3.2 Responsive behavior
   └─ T3.3 Empty / loading / error states
```

**Dependency rule:** Phase 0 → Phase 1 → Phase 2 (parallelizable internally) → Phase 3. T0.1 and T0.2 are parallel. T0.3 depends on T0.1. Within Phase 2, the 11 screen tasks share no files and can run fully in parallel once T1.1 and T0.3 land.

**Reference asset location:** All HTML exports live in `uxpilot-export/`. Screen specs live in `docs/screens/`.

---

## 3. Per-Task Specifications

> Each task below is **cold-runnable**: a fresh agent with no prior context can execute it from the spec alone. Every task must: (a) read the referenced HTML export(s), (b) implement against the existing route file — do not rewrite data fetching/Orval hooks, only JSX/markup/styling, (c) honor the Phase 0 tokens via **semantic Tailwind utilities only — zero literal color values in components**, (d) honor the impeccable constraints in §1.5, and (e) run `npm run build` from repo root before declaring done.

---

### Phase 0 — Foundation

#### T0.1 — Token contract + CSS theme blocks
- **Phase:** 0
- **Parallel with:** T0.2 (yes)
- **Blocks:** T0.3, all Phase 1, 2, 3 tasks
- **Files to modify:** `apps/web/src/index.css`
- **HTML references:** `24-Designmate 3 - Splash.html`, `26-Designmate 3 - Tables Dashboar.html`, `35-RestoManager PWA - Calendar Vi.html` (skim for exact token usage)

**What to implement:**

1. **Remove the `.dark` block entirely.** The named theme system supersedes it. The `@custom-variant dark` declaration can also be removed.

2. **Add status token registrations to `@theme inline`:**
   ```css
   --color-success: var(--success);
   --color-success-foreground: var(--success-foreground);
   --color-warning: var(--warning);
   --color-warning-foreground: var(--warning-foreground);
   ```

3. **Replace the `:root` block** with three named theme blocks that together cover the full contract from §1.6. Use the selectors `:root, [data-theme="default"]` for the default theme so the app works even before React mounts (no blank frame). Token values for default: use §1.1 OKLCH values. Token values for monokai and gruvbox: use the hex tables in §1.7 directly.

   ```css
   :root,
   [data-theme="default"] {
     /* ... default OKLCH values from §1.1 ... */
     --success: oklch(0.723 0.219 149.6);
     --success-foreground: oklch(1 0 0);
     --warning: oklch(0.769 0.188 70.1);
     --warning-foreground: oklch(0.145 0 0);
     --radius: 0.5rem;
   }

   [data-theme="monokai"] {
     /* ... hex values from §1.7 monokai table ... */
     --radius: 0.375rem;
   }

   [data-theme="gruvbox"] {
     /* ... hex values from §1.7 gruvbox table ... */
     --radius: 0.375rem;
   }
   ```

4. **Add reduced-motion rule:**
   ```css
   @media (prefers-reduced-motion: reduce) {
     * { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; }
   }
   ```

**Acceptance criteria:**
- `bg-accent` renders orange under default, `#fd971f` under monokai, `#fe8019` under gruvbox.
- `bg-sidebar` renders zinc-950 under default, `#1e1f1c` under monokai, `#1d2021` under gruvbox.
- `bg-success`, `bg-warning` utility classes compile and render correctly.
- `.dark` block and `@custom-variant dark` are gone.
- `npm run build` succeeds.

---

#### T0.2 — PRODUCT.md + shared primitives audit
- **Phase:** 0
- **Parallel with:** T0.1 (yes)
- **Blocks:** nothing hard, but should land before Phase 2 screens
- **Files to create:** `docs/PRODUCT.md`
- **Files to audit:** `apps/web/src/components/ui/`

**What to implement:**
Write `docs/PRODUCT.md`: a concise product + design-system reference. Sections: (1) what the product is; (2) the confirmed design system — paste §1.1 and §1.7 theme tables as a single source of truth; (3) the dark-shell aesthetic principles from §1.5; (4) the multi-theme mandate from §1.2 (semantic tokens only, no literals); (5) HTML-export-to-route mapping from §4; (6) component inventory — audit `apps/web/src/components/ui/` and list which shadcn primitives exist vs. which are missing (likely: sheet, tabs, dropdown-menu, avatar, switch) so Phase 2 agents know what to reuse.

**Acceptance criteria:** `docs/PRODUCT.md` exists with all sections; component inventory accurately reflects `apps/web/src/components/ui/`.

---

#### T0.3 — ThemeProvider + ThemeSelector + FOUC prevention
- **Phase:** 0
- **Parallel with:** T0.2 (yes once T0.1 is done)
- **Depends on:** T0.1
- **Blocks:** T1.1
- **Files to create:** `apps/web/src/components/theme-provider.tsx`, `apps/web/src/components/theme-selector.tsx`
- **Files to modify:** `apps/web/src/main.tsx`, `apps/web/index.html`

**What to implement:**

1. **`theme-provider.tsx`** — A React context + provider that:
   - Defines `type Theme = 'default' | 'monokai' | 'gruvbox'`
   - Reads the active theme from `localStorage.getItem('theme')` on initialization, defaulting to `'default'`
   - Writes `document.documentElement.setAttribute('data-theme', theme)` in a `useEffect` whenever `theme` changes
   - Persists to `localStorage.setItem('theme', theme)` in the same effect
   - Exports `ThemeProvider` component and `useTheme()` hook

2. **`theme-selector.tsx`** — A small, self-contained selector component that:
   - Uses `useTheme()` to read and set the active theme
   - Renders three named options: "Default", "Monokai", "Gruvbox"
   - Uses a shadcn `Select` (or three `Button` toggles if `Select` is not present) — no custom dropdown
   - Shows the active theme with a visual indicator (checked state or active button style)
   - Suitable for placement in the Settings page and optionally the sidebar footer

3. **`apps/web/index.html` — FOUC prevention:** Add a minimal inline `<script>` to `<head>` (before all other scripts) that reads `localStorage.getItem('theme')` and immediately sets `document.documentElement.setAttribute('data-theme', ...)`. This runs synchronously before the first paint, eliminating the flash of default tokens.

   ```html
   <script>
     (function(){
       var t = localStorage.getItem('theme');
       if (t && t !== 'default') document.documentElement.setAttribute('data-theme', t);
     })();
   </script>
   ```

4. **`apps/web/src/main.tsx`** — Wrap the root with `<ThemeProvider>`.

**Acceptance criteria:**
- Switching theme in any rendered `ThemeSelector` immediately changes all colors app-wide without a page reload.
- On hard reload, the previously selected theme is restored without a flash of default tokens.
- `useTheme()` can be called from any component in the tree.
- `npm run build` succeeds.

---

### Phase 1 — App Shell

#### T1.1 — Sidebar + topbar + layout redesign
- **Phase:** 1
- **Parallel with:** none (gates all Phase 2)
- **Depends on:** T0.1, T0.3
- **Files to modify:** `apps/web/src/components/layout/sidebar.tsx`, `apps/web/src/components/layout/topbar.tsx`, `apps/web/src/components/layout/app-layout.tsx`
- **HTML references:** `35-RestoManager PWA - Calendar Vi.html` (PRIMARY — sidebar structure), `26-Designmate 3 - Tables Dashboar.html` (topbar + content frame), `34-Designmate 3 - Settings.html` (topbar with page title)

**What to implement:**
- **Sidebar** (`sidebar.tsx`): change `bg-background` → `bg-sidebar text-sidebar-foreground`, width 240px (`w-60`). Add brand block: an accent-colored rounded square (`bg-accent`, ~36px, `--radius-md`) containing a `UtensilsCrossed` Lucide icon in `text-accent-foreground`, next to "RestoManager" wordmark in `text-sidebar-foreground font-semibold`. Nav items: default `text-sidebar-foreground/60`, icon + label; on hover → `text-sidebar-accent-foreground`; active → `bg-sidebar-accent text-sidebar-accent-foreground` with a 3px left `bg-sidebar-primary` indicator bar. Add missing `Settings` nav item (route `/settings`). Add a **user profile block pinned to the bottom**: avatar circle (initials), user name, "Manager" role label in muted, and a `MoreVertical` button. Pull user from `useAuthStore`.
- **Topbar** (`topbar.tsx`): clean white/`bg-card` bar. Left: current page title. Right: `Bell` icon linking to `/notifications`, user email, ghost logout button. Remove empty `<div />`.
- **AppLayout** (`app-layout.tsx`): keep offline-banner + drainQueue logic untouched. `<main>` uses `bg-background`. Confirm sidebar + content split renders correctly with 240px sidebar.
- Use **only semantic tokens** in all Tailwind classes — no literal colors.

**Acceptance criteria:**
- Sidebar uses `bg-sidebar` / `bg-sidebar-accent` / `bg-accent` utilities (no literal colors) — it renders dark under the default theme, dark editorial under monokai, dark earthy under gruvbox.
- Visible active row + orange (accent) left indicator.
- Bottom user profile block present.
- Topbar shows page context + notifications + logout.
- All 10 routes reachable from sidebar including `/settings`.
- `npm run build` succeeds.

---

### Phase 2 — Screens (all depend on T1.1; mutually parallel)

> **Universal Phase 2 rule:** All components must use **semantic Tailwind utilities only** — no literal color values anywhere. Examples: `bg-card`, `bg-background`, `bg-accent`, `text-foreground`, `text-muted-foreground`, `border-border`, `bg-success`, `bg-destructive`, `text-accent-foreground`. This is what makes the theme system work. Any literal value (e.g., `bg-zinc-950`, `text-orange-500`, `text-[#f97316]`) is a bug.

#### T2.1 — Login / auth screens
- **Phase:** 2 · **Parallel with:** all other T2 · **Depends on:** T1.1
- **Files to modify:** `apps/web/src/routes/_auth/login.tsx`
- **HTML references:** `24-Designmate 3 - Splash.html`, `25-Designmate 3 - Sign In.html`
- **What to implement:** Centered sign-in card on a `bg-background` backdrop. Accent-colored logo mark + "RestoManager" wordmark above the form. Email + password inputs (shadcn `Input`), one primary `bg-accent text-accent-foreground` "Sign in" button. Preserve all existing auth logic, form state, and error handling — only restyle markup. Error messages use `text-destructive`.
- **Acceptance criteria:** Login page matches export 25's structure. Auth flow works end-to-end. Zero literal color values. `npm run build` passes.

#### T2.2 — Dashboard (design from scratch)
- **Phase:** 2 · **Parallel with:** all other T2 · **Depends on:** T1.1
- **Files to modify:** `apps/web/src/routes/_app/dashboard/index.tsx`
- **HTML references:** `26-Designmate 3 - Tables Dashboar.html`, `11-Designmate - Menu Dashboard.html`
- **What to implement:** Page header + 3–4 KPI stat cards (`bg-card`, large number, label, semantic status badge). Below: 2-column grid of summary lists. Use existing Orval hooks for data; invent no new API calls. One primary CTA at most.
- **Acceptance criteria:** Dashboard shows KPI card row + summary grid on `bg-background` with `bg-card` surfaces. Zero literal colors. `npm run build` passes.

#### T2.3 — Tables
- **Phase:** 2 · **Parallel with:** all other T2 · **Depends on:** T1.1
- **Files to modify:** `apps/web/src/routes/_app/tables/index.tsx` (+ any table-detail/dialog components)
- **HTML references:** `26`, `27`, `28`, `29`, `30`, `31`, `33`. Spec: `docs/screens/tables.md`.
- **What to implement:** Table card grid — each card uses `bg-card`, shows table number, seat count, and a status badge (`bg-success`/`bg-destructive`/`bg-warning`). Orange `bg-accent` "Add table" CTA. Detail/add/edit as shadcn `Sheet`/`Dialog`. Preserve all CRUD + Orval hooks.
- **Acceptance criteria:** Table grid with semantic status badges. CRUD intact. Zero literal colors. `npm run build` passes.

#### T2.4 — Menu
- **Phase:** 2 · **Parallel with:** all other T2 · **Depends on:** T1.1
- **Files to modify:** `apps/web/src/routes/_app/menu/index.tsx` (+ category/item components)
- **HTML references:** `11`, `12`, `15`, `17`, `18`. Spec: `docs/screens/menu.md`.
- **DESIGN-FAMILY NOTE:** Designmate (light-ish) exports — port layout onto the token system per §1.4.
- **What to implement:** Category sidebar/tabs + item card grid (`bg-card`). Add/edit item as right-side `Sheet`. Preserve menu CRUD + Orval hooks.
- **Acceptance criteria:** Menu shows category navigation + item card grid. Add/edit drawers restyled. Zero literal colors. `npm run build` passes.

#### T2.5 — Orders (Kanban)
- **Phase:** 2 · **Parallel with:** all other T2 · **Depends on:** T1.1
- **Files to modify:** `apps/web/src/routes/_app/orders/index.tsx`
- **HTML references:** None. Spec: `docs/screens/orders.md`. Borrow card/badge styling from export `26`.
- **What to implement:** Kanban columns per order status. Each card uses `bg-card`, shows order #, table, items, semantic status badge. Preserve all existing order logic.
- **Acceptance criteria:** Kanban with semantic status badges on `bg-background`/`bg-card`. Zero literal colors. `npm run build` passes.

#### T2.6 — Reservations
- **Phase:** 2 · **Parallel with:** all other T2 · **Depends on:** T1.1
- **Files to modify:** `apps/web/src/routes/_app/reservations/index.tsx` (+ detail/dialog components)
- **HTML references:** `32-Designmate 3 - Reservations.html` (PRIMARY), `2-Designify - Reservation Detail.html` (layout ref → port to token system). Spec: `docs/screens/reservations.md`.
- **What to implement:** Reservations list/table per export 32. `bg-accent text-accent-foreground` "New reservation" CTA. Detail view as drawer. Preserve reservation CRUD + Orval hooks.
- **Acceptance criteria:** Reservations list with semantic status badges. Zero literal colors. `npm run build` passes.

#### T2.7 — Staff (Designify → port to token system)
- **Phase:** 2 · **Parallel with:** all other T2 · **Depends on:** T1.1
- **Files to modify:** `apps/web/src/routes/_app/staff/index.tsx` (+ sub-views/components)
- **HTML references:** `6`, `7`, `8` (+`3`, `5` for shift drawers). **All Designify — port layout only; no light-sidebar styling.**
- **What to implement:** Staff section with tabbed nav between Directory (`bg-card` staff cards), Schedule (weekly shift grid), and Availability. Semantic status colors. Preserve staff logic + Orval hooks.
- **Acceptance criteria:** All three staff sub-views on semantic tokens — no `bg-gray-*` or `bg-slate-*` literals. Zero literal colors. `npm run build` passes.

#### T2.8 — Settings + Notifications + ThemeSelector
- **Phase:** 2 · **Parallel with:** all other T2 · **Depends on:** T1.1
- **Files to modify:** `apps/web/src/routes/_app/settings/index.tsx`; create notifications route if absent
- **HTML references:** Settings — `34-Designmate 3 - Settings.html` + `10-Designify - Settings.html`. Notifications — `9-Designify - Notifications.html` (port to token system).
- **What to implement:**
  - **Settings:** Sectioned settings page per export 34 — grouped `bg-card` sections (Profile, Restaurant info, Preferences, Appearance). One primary `bg-accent` "Save changes" CTA. **Add an "Appearance" section** containing the `ThemeSelector` component from T0.3 so users can switch between Default, Monokai, and Gruvbox themes. Preserve existing settings logic.
  - **Notifications:** Notifications list per export 9 ported to semantic tokens — grouped by date, unread items get `bg-accent/10` tint or a 3px `bg-accent` left bar. Wire to topbar bell link. No new API endpoints.
- **Acceptance criteria:** Settings page has Appearance section with working theme switcher. Switching themes in Settings changes the app immediately. Notifications route exists. Zero literal colors. `npm run build` passes.

#### T2.9 — Inventory (design from scratch)
- **Phase:** 2 · **Parallel with:** all other T2 · **Depends on:** T1.1
- **Files to modify:** `apps/web/src/routes/_app/inventory/index.tsx`
- **HTML references:** Borrow table/card/badge language from exports `26` and `15`.
- **What to implement:** Data table (`bg-card`, shadcn `Table`) — item name, category, quantity, reorder threshold, stock-status badge (`bg-success`/`bg-warning`/`bg-destructive`). `bg-accent` "Add item" CTA. Preserve inventory logic + Orval hooks.
- **Acceptance criteria:** Inventory table with semantic stock-status badges. Zero literal colors. `npm run build` passes.

#### T2.10 — Reports (design from scratch)
- **Phase:** 2 · **Parallel with:** all other T2 · **Depends on:** T1.1
- **Files to modify:** `apps/web/src/routes/_app/reports/index.tsx`
- **HTML references:** Reuse stat-card + grid language from exports `26` and `11`.
- **What to implement:** KPI stat cards + chart placeholders using `--chart-*` tokens (or actual charts if a charting lib already present — no new dependencies). Date-range selector. Preserve existing data flow.
- **Acceptance criteria:** Reports shows KPI cards + visual section. Zero literal colors. `npm run build` passes.

#### T2.11 — Billing (design from scratch)
- **Phase:** 2 · **Parallel with:** all other T2 · **Depends on:** T1.1
- **Files to modify:** `apps/web/src/routes/_app/billing/index.tsx`
- **HTML references:** Reuse card/table/badge language from exports `26` and `32`.
- **What to implement:** Current plan card, payment method card, invoices table (`bg-success`/`bg-warning`/`bg-destructive` status badges). One primary `bg-accent` CTA. Preserve billing logic.
- **Acceptance criteria:** Billing shows plan + payment + invoices table with semantic status badges. Zero literal colors. `npm run build` passes.

---

### Phase 3 — Polish (depend on all Phase 2 complete)

#### T3.1 — Motion & micro-interactions
- **Phase:** 3 · **Parallel with:** T3.2, T3.3 · **Depends on:** all Phase 2
- **Files to modify:** `apps/web/src/index.css`, shared `apps/web/src/components/ui/` primitives, layout components
- **What to implement:** Consistent transitions per §1.5 — 150ms hover/color, 200ms drawers/modals, 300ms complex. Subtle hover lift on cards. Verify `tw-animate-css` for enter/exit. Verify reduced-motion rule neutralizes all of it.
- **Acceptance criteria:** Consistent transitions at specified durations. `prefers-reduced-motion: reduce` disables motion. `npm run build` passes.

#### T3.2 — Responsive behavior
- **Phase:** 3 · **Parallel with:** T3.1, T3.3 · **Depends on:** all Phase 2
- **Files to modify:** `apps/web/src/components/layout/sidebar.tsx`, `app-layout.tsx`, `topbar.tsx`, wide tables
- **What to implement:** Sidebar collapses to off-canvas drawer below `md` (hamburger in topbar). Card grids reflow. Wide tables scroll inside `overflow-x-auto` container. Verify usable layout at 375px.
- **Acceptance criteria:** Mobile sidebar is off-canvas drawer; grids reflow; tables scroll; no horizontal body scroll. `npm run build` passes.

#### T3.3 — Empty / loading / error states
- **Phase:** 3 · **Parallel with:** T3.1, T3.2 · **Depends on:** all Phase 2
- **Files to modify:** all Phase 2 route files; create `apps/web/src/components/empty-state.tsx` if absent
- **HTML references:** `20-Designmate - Empty State.html`
- **What to implement:** Shared `EmptyState` component (centered icon + heading + description + optional CTA) matching export 20, using semantic tokens. Skeleton/loading treatment (shadcn `Skeleton`). Error treatment (`bg-destructive/10 text-destructive` tinted card + retry). Apply across all data-driven routes.
- **Acceptance criteria:** Every data-driven route shows branded empty state, loading skeleton, and error state. `EmptyState` is shared. Zero literal colors. `npm run build` passes.

---

## 4. HTML Export → Route Mapping (reference)

| Route | Primary HTML reference(s) | Design family |
|-------|--------------------------|---------------|
| `/login` | 24 (Splash), 25 (Sign In) | Designmate 3 (dark) |
| `/dashboard` | none — design from scratch (borrow 26, 11) | New |
| `/tables` | 26, 27, 28, 29, 30, 31, 33 | Designmate 3 (dark) |
| `/menu` | 11, 12, 15, 17, 18 | Designmate (light → port to token system) |
| `/orders` | none — spec `docs/screens/orders.md` | Kanban |
| `/reservations` | 32 (primary) + 2 (detail ref) | Designmate 3 (dark) |
| `/calendar` | 35 (primary) + 1 (layout ref) | RestoManager (dark) |
| `/staff` | 6, 7, 8 (+3, 5) | Designify (light → port to token system) |
| `/settings` | 34 (primary) + 10 (ref) | Designmate 3 (dark) |
| `/notifications` | 9 | Designify (light → port to token system) |
| `/inventory` | none — design from scratch | New |
| `/reports` | none — design from scratch | New |
| `/billing` | none — design from scratch | New |

> **Calendar note:** `/calendar` was not assigned its own Phase 2 task because the page was recently migrated to Orval hooks and has its own spec. A redesign pass follows the same shape as T2.6 — restyle the existing calendar route to export 35's dark-shell layout, preserving data flow. Treat as an optional follow-up.

---

## 5. Execution Notes

- **Order:** Run T0.1 + T0.2 first (parallel). Then T0.3. Then T1.1 alone. Then dispatch all of Phase 2 in parallel (max 5 agents per wave). Then Phase 3 in parallel.
- **Per-task guardrails:** never touch the NestJS API, Prisma, or Orval-generated files; never invent new API endpoints; preserve all existing data fetching and route logic; restyle markup only. Read the referenced HTML export(s) before writing any JSX. Run `npm run build` (repo root) before declaring a task done. Keep files under 500 lines.
- **Semantic tokens only:** This is the single most important constraint for the multi-theme system. Every Phase 2/3 task enforces it. Any `bg-zinc-*`, `text-orange-*`, `bg-gray-*`, or hex value in a component file is a defect.
- **Theme switcher placement:** The `ThemeSelector` is wired in Settings (T2.8). The sidebar footer may optionally include a compact theme indicator, but Settings is the primary entry point.
- **Verification:** after Phase 2, run the app and visually spot-check each route at default theme AND monokai/gruvbox. After Phase 3, verify reduced-motion, mobile width (~375px), and empty/loading/error states.
