# Per-Screen Reskins — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax. **Execution model: Sonnet** (mechanical reskin work; planning/review stay on the strong model).

**Goal:** Reskin each existing screen to the Warm canvas design system — apply the Plan 1 primitives, raise information density, kill the empty voids, and enforce one accent CTA — without changing any data wiring or API behavior.

**Architecture:** Each screen is an independent TanStack route file under `apps/web/src/routes/_app/<name>/index.tsx`. A reskin is a **layout/visual refactor of the JSX only** — the Orval hooks, state, and handlers stay exactly as they are. One task per screen; tasks are independent and parallelizable. These are **visual tasks verified by build + screenshot**, not TDD (no new logic).

**Tech Stack:** React 18 · TanStack Router · Tailwind v4 (Warm canvas tokens) · Plan 1 primitives (`PageHeader`, `StatusBadge`/`StatusDot`, `MetricCell`, `ListRow`) · existing shadcn/Base-UI components (`Card`, `Table`, `Tabs`, `Input`, `Label`, `Select`, `Separator`, `Avatar`, `Sheet`, `Dialog`, `EmptyState`, `Skeleton`, `Button`). Repo uses **pnpm**; dev server on `:5173` (login `admin@restaurant.local` / `admin123`).

## Global Constraints

- **Data wiring is frozen.** Do NOT change Orval hooks, query keys, mutations, handlers, or component logic. Reskin = restructure JSX + classes only. If a screen's behavior changes, that's a bug.
- **Semantic tokens only** — no literal palette/hex. Fix any literal-color stragglers you encounter in the screen (e.g. `bg-black/*` overlays → keep only if a scrim; `bg-zinc/yellow/etc` → semantic token).
- **One accent CTA per screen** — the single primary action uses `<Button>` (default = terracotta). Every other action is `outline`/`ghost`/`secondary`. Never two filled-accent buttons on a screen.
- **Status colors (semantic, consistent):** available/open/active/confirmed → `success` (green) · occupied/in-service/sent → `info` (blue) · reserved/pending/waiting → `warning` (amber) · cancelled/error/needs-attention → `destructive` (red). Use `StatusBadge`/`StatusDot`; never encode the same status twice (e.g. whole-card tint AND a status bar — pick one).
- **Lucide icons only**; raw `<button>` needs `type=`.
- **Tests stay green, build stays clean.** Reskins must not break the existing suite (`pnpm run test`) or `pnpm run build`.

## The Universal Reskin Checklist (applies to EVERY task)

Each screen task must end satisfying all of these:
1. **`PageHeader`** wraps the screen title (Fraunces) + a one-line subtitle (e.g. a count) + the single primary CTA in its `action` slot.
2. **No empty void** — content fills the viewport at desktop; lists/grids are dense; remove oversized cards and excess padding. Target the density of `docs/design-revamp/mockups/service-warm-canvas.html`.
3. **Primitives used** where they fit: `MetricCell` for stat tiles, `StatusBadge`/`StatusDot` for any status, `ListRow` for dense rows, `Card` for bounded objects.
4. **Responsive:** verified at **390px** (single column, tap targets ≥ 40px, no horizontal overflow except intentional swipe rails) and **desktop** (multi-column / wider).
5. **Loading + empty states** use `Skeleton` / `EmptyState` (most already do — keep them, restyle to match).
6. **Verify:** `pnpm run build` exits 0; `pnpm run test` green; screenshot at desktop + 390px via the `run-web` skill shows the target. Commit.

> Per-task "steps": (a) read the current screen file; (b) apply this checklist + the screen-specific brief below, editing only that route file (and any tiny local helper); (c) `pnpm run build`; (d) screenshot desktop + 390px; (e) confirm `pnpm run test` green; (f) commit `style(web): reskin <screen> to Warm canvas`.

---

## Task 1: Floor (`routes/_app/floor/index.tsx`)

**Current defects:** oversized 4-up cards with giant "T1" text; status double-encoded (whole-card background tint AND a colored status bar); ~50% empty vertical space.

**Target:** a dense responsive grid of compact table cards — `grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3`. Each card: table number at a sane size (e.g. `text-lg font-semibold`, not the huge display size), seat count with the users icon, and **one** `StatusBadge` for status (remove the whole-card tint — keep cards on `bg-card`; status shown once via the badge). The summary counts (Available/Occupied/Reserved) become a compact row of small `StatusBadge`/chips under the `PageHeader`. `PageHeader` title "Floor", subtitle "N tables", action = single "Add table" `<Button>`. Keep the existing edit/delete affordances but as `ghost`/`icon` buttons revealed on hover.

**Acceptance:** all 10 tables visible with little scroll at desktop; 2-col at 390px; status encoded once.

---

## Task 2: Order (`routes/_app/order/index.tsx`)

**Current defects:** the 5-column kanban clips the last column off-screen (horizontal overflow not scrollable); item names truncate ("Burrata & Prosci…"); per-line status dropdowns are visually noisy; empty vertical space below cards.

**Target:** keep the kanban but make the column rail `overflow-x-auto` with consistent column widths (`min-w-[280px]`) so all five columns are reachable by scroll/swipe; add scroll-snap. Order cards: denser, full item names (allow wrap, don't truncate), use `ListRow` for the line items and `StatusBadge` for each item's state instead of the heavy inline `<select>` dropdowns where possible (keep a compact control to advance state). `PageHeader` "Order", action = single "New order" `<Button>`. Column headers show a count chip.

**Acceptance:** all 5 columns accessible (no clipped/unreachable column); item names legible; horizontal swipe works at 390px.

---

## Task 3: Door (`routes/_app/door/index.tsx`)

**Current defects:** one reservation row floating over ~600px of empty void; tabs (Today/This Week/All) present.

**Target:** dense list filling the width — one `ListRow` per reservation: `leading` = `Avatar` (guest initials), `title` = guest name, `subtitle` = contact/notes, `meta` = date·time + party size, plus a `StatusBadge` (confirmed/pending/cancelled) and `ghost` edit/delete. Keep the `Tabs` (Today/This Week/All) using the `Tabs` component, restyled. Strong `EmptyState` per tab when none. `PageHeader` "Door", subtitle "N reservations", action = single "Add reservation" `<Button>`.

**Acceptance:** no large void (list + empty-state fill the area); responsive; one accent CTA.

---

## Task 4: Checkout (`routes/_app/checkout/index.tsx`)

**Current state:** the recently-built checkout queue (settle table bills). 

**Target:** apply the universal checklist — `PageHeader` "Checkout", dense layout of open checks (use `Card`/`ListRow`: table, party, running total, a "Settle"/"Checkout" action), `MetricCell`s if it shows totals. Single primary CTA. Status via `StatusBadge`. Read the current file and restructure to the system; preserve all settle/split logic.

**Acceptance:** dense, on-system, behavior unchanged.

---

## Task 5: Menu (`routes/_app/menu/index.tsx`)

**Current defects:** the strongest screen already, but every item shows a green "Available" badge (noise) and the price uses the accent color.

**Target:** keep the category sidebar + item grid. Wrap in `PageHeader` "Menu" + "Add item" `<Button>`. Show a `StatusBadge` **only when an item is unavailable/86'd** (don't badge the common available case). Price as `text-foreground font-medium` (not accent). Tighten grid density; ensure category sidebar uses `bg-card`/tokens with a clean active state (no side-stripe). Keep edit/delete as `ghost` icons.

**Acceptance:** no redundant "Available" badges; denser; one accent CTA.

---

## Task 6: Inventory (`routes/_app/inventory/index.tsx`)

**Target:** a dense data `Table` (use the `Table` component) filling the width: item, stock level, par/threshold, a `StatusBadge` shown **only for low/out-of-stock** rows (keep the existing low-stock-only pattern). `PageHeader` "Inventory" + "Add item" `<Button>`. Compact rows; responsive (on phone, collapse less-critical columns or allow horizontal scroll on the table wrapper).

**Acceptance:** dense table, low-stock highlighted once, one accent CTA.

---

## Task 7: Reports (`routes/_app/reports/index.tsx`)

**Current state:** KPI stats + a chart section (chart already recolored to chart tokens).

**Target:** the KPIs become a `MetricCell` row (`grid grid-cols-2 lg:grid-cols-4 gap-3`) — sales, covers, average check, vs target. The chart sits in a `Card` below. `PageHeader` "Reports" + a date-range `Select` in the action slot. Keep chart data/series; ensure chart colors use `--chart-*` tokens.

**Acceptance:** dense KPI row + chart card; no empty void; responsive.

---

## Task 8: Calendar (`routes/_app/calendar/index.tsx`)

**Current state:** staff schedule calendar (default scroll to business hours already set).

**Target:** mostly a token/spacing reskin — `PageHeader` "Calendar"; ensure the calendar surface uses `bg-card`/`border-border`/tokens (override any library default colors via token classes); event blocks use semantic status colors; dense, fills height. Preserve the scroll-position behavior.

**Acceptance:** on-system colors, no literal palette, fills the area, behavior unchanged.

---

## Task 9: Settings (`routes/_app/settings/index.tsx`)

**Current defects:** borderless gray-fill inputs (low contrast); the form sections.

**Target:** `PageHeader` "Settings". Each section in a `Card` separated by `Separator`, each field using the `Input` + `Label` components (which now carry token borders — ensure they're actually used so fields read as real inputs, not gray fills). Single primary "Save changes" `<Button>` per form (terracotta). Keep the Appearance/theme section (the `ThemeSelector`). Two-column field grid on desktop, single column at 390px.

**Acceptance:** inputs have visible borders/contrast; one accent CTA; sectioned + dense.

---

## Task 10: Login (`routes/_auth/login.tsx`)

**Current defects:** generic centered card; placeholder brand mark.

**Target:** a distinctive-but-quick brand moment in Warm canvas. On desktop, a split layout: a warm brand panel (terracotta/`bg-sidebar` field, the `UtensilsCrossed` mark, a Fraunces "RestoManager" wordmark + a one-line tagline) beside the sign-in `Card`; collapses to a centered card on mobile. Use `Input`/`Label`/`Button`; single primary "Sign in" CTA. Keep the auth logic/handlers exactly. Fast, no heavy imagery.

**Acceptance:** feels crafted (not a default card), responsive (split → centered), sign-in works unchanged.

---

## Self-Review

**1. Spec coverage:** Every existing screen except Service (rebuilt in the Service-home plan) gets a reskin task → Floor, Order, Door, Checkout, Menu, Inventory, Reports, Calendar, Settings, Login. Each task carries the universal checklist (density, one-CTA, primitives, responsive, tokens) + a screen-specific brief naming concrete defects and targets. ✓

**2. Placeholder scan:** No TBD/TODO. Briefs name concrete grids/components/targets. Tasks 4 and 8 (Checkout, Calendar — the two I have least direct visual on) instruct "read the current file" and apply the checklist; that's a real instruction, not a placeholder, appropriate since their current content must be inspected before restructuring. ✓

**3. Consistency:** All tasks reference the same primitive APIs (Plan 1) and the same status→token mapping; one-CTA rule is uniform. Route paths match the post-Plan-2 names (floor/order/door/checkout). ✓

**Note on format:** these are visual reskin tasks verified by build + screenshot + green suite, not verbatim-code TDD tasks — the screens already have working data/logic; the work is layout. Executors must read each current file and preserve all behavior. Independent files ⟹ executable in parallel waves.
