# Restaurant Manager — Product & Design System Reference

> Single source of truth for all frontend agents. Read this before writing any component.

---

## 1. Product Overview

A web-based restaurant operations manager. Functionally complete; this document covers the design system applied during the UI redesign.

**Routes:**

| Route | Purpose |
|-------|---------|
| `/login` | Authentication — email + password sign-in |
| `/dashboard` | Landing — KPI overview + summary links |
| `/tables` | Table status grid + CRUD |
| `/menu` | Category navigation + menu item grid + CRUD |
| `/orders` | Kanban board by order status |
| `/reservations` | Reservation list + detail drawer |
| `/calendar` | Staff schedule calendar view |
| `/staff` | Directory + weekly schedule + availability tabs |
| `/inventory` | Stock data table + CRUD |
| `/reports` | KPI stats + chart section |
| `/billing` | Plan/payment cards + invoice table |
| `/settings` | Sectioned settings + Appearance (theme switcher) |
| `/notifications` | Notification list (create if absent) |

---

## 2. Multi-Theme Design System

### 2.1 Architecture

Themes are CSS custom property sets keyed to `data-theme` on `<html>`. The `@theme inline` block in `index.css` maps Tailwind utility classes to `--*` variable names; those registrations never change — only values change per theme.

```css
:root, [data-theme="default"] { /* orange + zinc, light */ }
[data-theme="monokai"]        { /* Monokai dark           */ }
[data-theme="gruvbox"]        { /* Gruvbox warm dark      */ }
```

Theme is managed by `ThemeProvider` (reads/writes `localStorage` + `data-theme`), with a FOUC-prevention inline script in `index.html`.

**The `.dark` CSS class is not used.** Named themes are the exclusive mechanism.

### 2.2 Semantic tokens mandate — CRITICAL

**All components must reference only semantic Tailwind utilities. Zero literal palette values anywhere.**

| Use this | Not this |
|----------|----------|
| `bg-card` | `bg-white` |
| `bg-background` | `bg-zinc-100` |
| `bg-accent` | `bg-orange-500` |
| `text-accent-foreground` | `text-white` |
| `text-muted-foreground` | `text-zinc-500` |
| `bg-sidebar` | `bg-zinc-950` |
| `bg-success` | `bg-green-500` |
| `bg-warning` | `bg-amber-500` |
| `bg-destructive` | `bg-red-500` |
| `border-border` | `border-zinc-200` |

### 2.3 Token contract (complete list every theme defines)

**Surfaces:** `--background`, `--foreground`, `--card`, `--card-foreground`, `--popover`, `--popover-foreground`

**Interactive:** `--primary`, `--primary-foreground`, `--secondary`, `--secondary-foreground`, `--muted`, `--muted-foreground`, `--accent`, `--accent-foreground`, `--destructive`

**Chrome:** `--border`, `--input`, `--ring`, `--radius`

**Status:** `--success`, `--success-foreground`, `--warning`, `--warning-foreground`

**Sidebar:** `--sidebar`, `--sidebar-foreground`, `--sidebar-primary`, `--sidebar-primary-foreground`, `--sidebar-accent`, `--sidebar-accent-foreground`, `--sidebar-border`, `--sidebar-ring`

**Charts:** `--chart-1` through `--chart-5`

### 2.4 Theme catalog

#### default — orange + zinc (light content)
Background zinc-100 (`oklch(0.961 0.003 286)`), white cards, zinc-950 sidebar, orange-500 accent (`oklch(0.702 0.197 49.2)`).

#### monokai — editorial dark
Background `#272822`, card `#3e3d32`, sidebar `#1e1f1c`, accent `#fd971f`, success `#a6e22e`, warning `#e6db74`, destructive `#f92672`.

#### gruvbox — warm retro dark
Background `#282828`, card `#3c3836`, sidebar `#1d2021`, accent `#fe8019`, success `#b8bb26`, warning `#d79921`, destructive `#cc241d`.

---

## 3. Aesthetic Principles

Derived from dark-shell family exports (Designmate 3 + RestoManager PWA, files 24–35). Apply to every screen:

- **Exactly one primary CTA per screen** — `bg-accent text-accent-foreground` filled button. All other actions are secondary (outline/ghost).
- **Lucide icons only**, consistent stroke weight.
- **No gradient text.** No decorative glassmorphism. No `bg-zinc-*` or raw hex in components.
- Every interactive element: distinct hover, active, focus-visible, disabled states.
- Status colors are always semantic: `bg-success` (available/active), `bg-warning` (pending), `bg-destructive` (error/cancelled), `bg-accent` (primary action).
- Transitions: 150ms hover/color, 200ms drawers/modals, 300ms complex.
- `prefers-reduced-motion: reduce` disables all animation (set in `index.css`).

### Design-family reconciliation

Two families in the exports. **Dark-shell (files 24–35) is PRIMARY for visual language.** Light-shell / Designify (files 1–10) is **layout reference only** — port their IA/layout onto the token system. Never reproduce light-sidebar or gray-accent button styling.

---

## 4. HTML Export → Route Mapping

| Route | Primary HTML reference(s) | Family |
|-------|--------------------------|--------|
| `/login` | 24 (Splash), 25 (Sign In) | Dark-shell |
| `/dashboard` | none — borrow 26, 11 | New |
| `/tables` | 26, 27, 28, 29, 30, 33 | Dark-shell |
| `/menu` | 11, 12, 15, 17, 18 | Light → port |
| `/orders` | none — `docs/screens/orders.md` | Kanban spec |
| `/reservations` | 32 (primary) + 2 (detail ref) | Dark-shell |
| `/calendar` | 35 (primary) + 1 (ref) | Dark-shell |
| `/staff` | 6, 7, 8 (+3, 5) | Light → port |
| `/settings` | 34 (primary) + 10 (ref) | Dark-shell |
| `/notifications` | 9 | Light → port |
| `/inventory` | none — borrow 26, 15 | New |
| `/reports` | none — borrow 26, 11 | New |
| `/billing` | none — borrow 26, 32 | New |

All HTML exports: `uxpilot-export/`. Screen specs: `docs/screens/`.

---

## 5. Component Inventory

### 5.1 Installed in `apps/web/src/components/ui/`

| Component | File | Status |
|-----------|------|--------|
| Button | `button.tsx` | ✅ Present |

That's it. Only one shadcn component is installed.

### 5.2 Packages available for `npx shadcn add`

The `shadcn@^4.11.0` package is installed. No `@radix-ui` packages are installed yet. Components must be added before use.

### 5.3 Components needed (add before Phase 2 tasks that use them)

| Component | shadcn command | Needed by |
|-----------|---------------|-----------|
| Input | `npx shadcn add input` | Login, Settings, all forms |
| Card | `npx shadcn add card` | Dashboard, Tables, Menu, all stat blocks |
| Badge | `npx shadcn add badge` | Tables, Orders, Reservations, Inventory, Billing |
| Sheet | `npx shadcn add sheet` | Tables (detail drawer), Menu (add/edit), Staff (shifts) |
| Dialog | `npx shadcn add dialog` | Delete confirmations |
| Table | `npx shadcn add table` | Reservations, Inventory, Billing, Reports |
| Tabs | `npx shadcn add tabs` | Staff (Directory/Schedule/Availability) |
| Select | `npx shadcn add select` | Settings, Reports (date range) |
| Switch | `npx shadcn add switch` | Settings (notifications toggles) |
| Avatar | `npx shadcn add avatar` | Sidebar (user profile), Staff directory |
| Skeleton | `npx shadcn add skeleton` | Loading states (Phase 3) |
| Separator | `npx shadcn add separator` | Settings sections |
| Label | `npx shadcn add label` | All form inputs |

**Add the components you need at the start of each Phase 2 task** using `npx shadcn add <name>` from `apps/web/`.

### 5.4 Non-shadcn shared components

| Component | File | Purpose |
|-----------|------|---------|
| AppLayout | `components/layout/app-layout.tsx` | Main shell — do not rewrite |
| Sidebar | `components/layout/sidebar.tsx` | Redesigned in T1.1 |
| Topbar | `components/layout/topbar.tsx` | Redesigned in T1.1 |
| OfflineBanner | `components/offline-banner.tsx` | Keep as-is |
| ThemeProvider | `components/theme-provider.tsx` | Added in T0.3 |
| ThemeSelector | `components/theme-selector.tsx` | Added in T0.3 |
| EmptyState | `components/empty-state.tsx` | Added in T3.3 |

---

## 6. Tech Stack (frontend)

- **React 18** + **Vite** + **TypeScript**
- **TanStack Router** (file-based routing, `apps/web/src/routes/`)
- **Tailwind CSS v4** with `@theme inline` token system
- **shadcn/ui** (v4.11) — components added on demand via `npx shadcn add`
- **Lucide React** (icons — use only Lucide, no other icon libs)
- **Orval-generated hooks** in `apps/web/src/api/` — **never modify these**
- **Zustand** auth store (`useAuthStore`)

**Orval hooks are the only data source.** Never invent new API endpoints. Never write raw `fetch` or `axios` calls. Read existing route files to understand which Orval hooks are already in use.
