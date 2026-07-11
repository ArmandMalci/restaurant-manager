# Plan 13 — QA Backlog Roadmap

> **Status:** spec / sequencing doc, mirrors [Plan 10](10-finalization-roadmap.md)'s shape. Spawns per-tier execution
> plans (14+). Source: [`issues.md`](../../../issues.md), Armand's personal QA pass, 2026-07-11.

## Goal

Address the QA backlog without rework: several items are trivial, a few are screen redesigns that need a brainstorming
session before they can become execution plans, and two (tenancy, identity) are architecture-sized and reshape the
others if done out of order. This doc groups the 21 raw issues into tiers by dependency and by "ready to execute" vs
"needs a decision/brainstorm first."

### Decisions locked 2026-07-11 (answered by Armand)

- **D5 · Tenancy shape — Multi-tenant SaaS.** Other restaurants sign up and manage their own venue independently.
  Superuser = platform admin overseeing all tenants (not just "one operator, many locations"). Needs self-serve
  signup/onboarding and real tenant isolation, not just a Restaurant model bolted on.
- **D6 · Migration blocker — resolve via `prisma migrate reset` (dev).** Unblocks every schema-shaped item below
  (Restaurant model, Floor model, `username`, RBAC, reservation status). Drops & reseeds local dev DB; this is a
  human-confirmed action to run once at the start of Tier 1/4 execution, not something to run speculatively now.
- **D7 · Cash payments — full multi-currency FX tender**, not a single-currency change calculator. Enter cash tendered
  across multiple currencies (e.g. 20 EUR + 20 GBP toward a 35 EUR bill), convert via a configurable exchange rate,
  compute change. Bigger scope than the literal ask but matches what Armand actually described.

### Sub-decisions deferred to Tier 1's design pass (route through `restaurant-architect` + `restaurant-domain-judge`)

Not resolved here — this is an ADR-worthy call, not a solo guess:
- Is `username` unique globally across the platform, or per-restaurant?
- Staff↔Restaurant cardinality: one restaurant per staff member, or can staff work multiple locations?
- How does the superuser role relate to Tier 2's per-restaurant custom-role system (sits above it, or is itself just
  another role with a platform-scope flag)?

---

## Tier 0 — Unblock (prerequisite for every schema-shaped tier below)

- [ ] **Run `prisma migrate reset`** against the local dev DB (D6). Confirm with Armand immediately before running —
  it drops all local dev data and reseeds from `prisma/seed.ts`. Do this once, right before Tier 1 and Tier 4
  implementation starts (not before, since nothing else needs it).

---

## Tier 1 — Tenancy Foundation (XL — largest single initiative on this list, bigger than the original design revamp)

> No `Restaurant` model exists today — only a singleton `RestaurantSettings` row (`id: "default"`). Nothing is
> tenant-scoped anywhere in the stack. This blocks Tier 2 (roles/username scoped per restaurant) and Tier 5's
> multi-floor work (floors belong to a restaurant).

**Ground truth from investigation:**
- All 19 existing Prisma models become tenant-scoped, none stay global: 11 need a direct `restaurantId` — `Staff`,
  `Table`, `MenuCategory`, `MenuItem`, `ModifierGroup`, `ModifierOption`, `Order`, `Reservation`, `Shift`,
  `InventoryItem`, `RestaurantSettings`; the other 8 — `RefreshToken`, `OrderItem`, `OrderItemModifier`,
  `MenuItemModifierGroup`, `InventoryUsage`, `Bill`, `Payment`, `PushSubscription` — derive scope transitively via
  their parent FK instead.
- Auth today: JWT payload is `{ sub: staffId, email, role }` (`apps/api/src/auth/auth.service.ts:56-61`,
  `JwtPayload` in `apps/api/src/auth/strategies/jwt.strategy.ts:6-10`) — no tenant claim. `validate()`
  (`jwt.strategy.ts:22-24`) is where a `restaurantId` would get threaded onto `req.user`.
- Backend: 16 modules under `apps/api/src` (`order, settings, kds, auth, health, shift, prisma, reservation, table,
  inventory, menu, staff, service, notifications, billing, reports`), ~14 services query Prisma directly. Don't touch
  14 services individually — add one `RestaurantScopeInterceptor` + `@CurrentRestaurant()` decorator (same pattern
  as the existing JWT guard) as a single chokepoint.
- Frontend: `apps/web/src/routes/_app/*` is 20 **flat, static** child routes today — no dynamic `$param` segment
  exists anywhere in this codebase yet. This is the first one. All 20 routes move under a new `$restaurantId` segment
  wrapping `_app`. `apps/web/src/lib/api-client.ts`'s request interceptor (lines 6-14, currently injects only the
  bearer token) is where restaurant-id injection slots in.

**Scope:**
- [ ] `Restaurant` model + migration (after Tier 0's reset); decide `RestaurantSettings`'s fate (folds into
  `Restaurant` columns, or becomes a 1:1 child).
- [ ] `restaurantId` FK across the 11 directly-scoped models above; transitive scoping verified for the other 7.
- [ ] JWT gains `restaurantId` claim; `RestaurantScopeInterceptor` + `@CurrentRestaurant()` decorator.
- [ ] Frontend `$restaurantId` dynamic route segment wrapping all of `_app`; API client injects it on every request.
- [ ] Restaurant switcher UI (for users with access to >1 restaurant).
- [ ] Superuser admin surface: create/list/manage restaurants across the platform.
- [ ] Self-serve signup flow (new restaurant + first manager account) — required since D5 chose SaaS, not
  operator-only.
- [ ] **Route through `restaurant-architect` (ADR) + `restaurant-domain-judge` before any implementation subagent
  starts.** This is the biggest blast-radius change in the app's history — every existing endpoint, query, and route
  changes shape.

---

## Tier 2 — Identity & Access (L — depends on Tier 1)

**Ground truth:** `Staff` has only `email` (unique) today, no `username`. Role checks are **hierarchy-rank**, not
allow-list: `RolesGuard` (`apps/api/src/auth/guards/roles.guard.ts:10-26`) compares `ROLE_HIERARCHY[user.role]`
against the *minimum* rank named in `@Roles(...)`, where `ROLE_HIERARCHY` (`packages/shared/src/constants/index.ts:15-20`)
is `manager:4 > host:3 > waiter:2 > kitchen:1`. 9 controllers use `@Roles` this way. A granular per-feature permission
system must **replace** this guard/decorator/constant, not extend it — numeric ranking can't express "inventory access
without menu access." `/staff` is currently a redirect stub to `/settings` (`apps/web/src/routes/_app/staff/index.tsx`)
— backend CRUD already exists (`staff.controller.ts`), so the "Users & Permissions" screen is greenfield frontend only.

- [ ] `username` field (unique, per Tier 1's scope decision) alongside `email`; `auth.service.ts`'s `validateUser`
  looks up by email OR username.
- [ ] Replace `StaffRole` enum + `RolesGuard` + `ROLE_HIERARCHY` with a real permission-set model: managers create
  custom roles per restaurant, each role a set of per-feature permissions, checked by allow-list.
- [ ] New "Users & Permissions" screen: role CRUD, assign roles to staff, per-feature permission matrix. Superuser
  view spans restaurants.

---

## Tier 3 — Systemic UI & Quick Fixes (M — zero schema migrations, no Tier 0 dependency, start now)

Everything here is ready to execute today with no further decisions. See [Plan 14](14-tier3-systemic-ui.md) for the
task-by-task breakdown.

- [ ] Session length → 15 days (`auth.service.ts:65` refresh-token expiry + matching cookie `maxAge` in
  `auth.controller.ts:43,68` — different unit, seconds not ms, must move together or they desync).
- [ ] URL-driven modal primitive replacing all 5 `Sheet` usages found (topbar mobile nav, topbar notifications,
  floor's table-action-sheet, door's reservation form, order builder's mobile ticket) — none are URL-driven today
  (pure `useState`), full-screen on mobile.
- [ ] Native `<select>` → shadcn `Select` — 8 exact usages across door, floor, menu (×3), order builder, inventory (×2).
- [ ] Status chips inside the table-action-sheet: color-code by status + tap-to-cycle + help tooltip (bundle with its
  Sheet→Modal conversion, same component). Map view's status dot gets the same treatment the grid view's `TableCard`
  already has (`floor/index.tsx:286-296`).
- [ ] Service/Floor spacing: unify outer padding + vertical rhythm (`service/index.tsx:126` is `p-1 space-y-6`;
  `floor/index.tsx:439` is `p-6` with scattered ad hoc `mb-4`/`mb-6`).
- [ ] Door → Reservations rename: move the route, delete the existing redirect stub, relabel `nav.ts:34`,
  `topbar.tsx:14`, `service/index.tsx:100`, the page title at `door/index.tsx:419`.
- [ ] Reservation notes → textarea (`door/index.tsx:223-229`, currently a single-line `input`).
- [ ] Delete-table hardening: `table.service.ts`'s `remove()` (31-35) has no guard today — deleting an
  occupied/reserved table throws an unhandled Postgres FK-restrict error (no `onDelete` on `Order.tableId` /
  `Reservation.tableId`). Add a friendly guard/error, then expose delete from the map view (currently has **no**
  delete affordance at all, only grid view does).

---

## Tier 4 — Reservation Lifecycle (M — needs Tier 0's reset, otherwise independent of Tier 1)

This is the previously-deferred **T3.5 / D4** from [Plan 10](10-finalization-roadmap.md#tier-3--high-severity-remaining-broad-quality)
— same migration blocker, now unblocked by Tier 0.

- [ ] `Reservation.status` enum (`booked | seated | no_show | cancelled`) replacing the client-side `deriveStatus()`
  heuristic (`door/index.tsx:48-58`), which doesn't even read the existing `seatedAt` column.
- [ ] Seat / no-show / walk-in actions + guest lookup (T3.5).
- [ ] Reservation context surfaced on reserved floor tiles (T3.8 remainder).

---

## Tier 5 — Screen UX Redesigns (need a brainstorming session each — do NOT write execution plans until then)

Independent of Tier 1/2; brainstorming can start immediately in parallel with anything above. Each bullet gets its
own `superpowers:brainstorming` session before it becomes a numbered execution plan — writing prescriptive steps for
"make X better" before deciding what better means produces generic, throwaway plans.

- [ ] **Floor — multi-floor.** No `Floor` model exists; `Table.number` is globally `@unique` today
  (`schema.prisma:41`), which would collide across floors and needs to become `@@unique([floorId, number])` or
  similar. Bundle with **delete-floor** (cascades to its tables — can't be planned before the Floor model exists).
- [ ] **Floor — order-creation "connection."** Today, tapping a tile opens `TableActionSheet`, whose CTA navigates to
  `/order?tableId=...` (`-table-action-sheet.tsx:130-134`). Armand flagged this hand-off as looking bad; brainstorm a
  better transition, probably alongside Tier 3's Sheet→Modal conversion of the same component.
- [ ] **`/order` UX.** ~780 lines across `index.tsx` (5-column kanban) + `-builder.tsx` (table picker → category
  filter → item grid → modifier panel → ticket). Brainstorm from current state, not from scratch.
- [ ] **`/kds` UX.** Currently a responsive card grid with a single station-toggle filter (not separate per-station
  columns); per-item bump exists (`index.tsx:218-233`) but no explicit undo control was found despite Plan 10's Tier 2
  changelog referencing an "undo window" — reconcile this discrepancy during the brainstorm.
- [ ] **`/calendar` — month view.** Currently a two-tab (Reservations/Shifts) `react-big-calendar`, week-default.
  Shift scheduling was scoped out of the pilot (D4 in Plan 10), so the redesign likely narrows to a
  reservations-focused month view — confirm in the brainstorm rather than assuming.
- [ ] **`/reports` UX + day-by-day report.** Currently one KPI snapshot screen; `GET /reports/summary` takes zero
  query params and mixes all-time + today-only aggregates. A day-by-day report needs new backend query granularity,
  not just a frontend rework — scope both sides in the brainstorm.

---

## Tier 6 — Checkout Multi-Currency Cash Tender (M-L — clear scope from D7, independent of everything else)

**Ground truth:** No currency field exists anywhere (`Bill`, `Payment`, `RestaurantSettings` all lack one) — money is
implicitly a single hardcoded `$` symbol app-wide (zero `Intl.NumberFormat` usage found). `recordPayment`
(`billing.service.ts:96-119`) only accepts `{ amount, method }` — no tendered amount, no change, no currency.

- [ ] Currency/exchange-rate config (Settings screen — likely restaurant-scoped once Tier 1 lands; can ship as a
  fixed rate table first and get tenant-scoped later without much rework).
- [ ] FX tender UI in `-split-row.tsx` / `-split-panel.tsx`: amount tendered per currency, computed equivalent,
  change due.
- [ ] Rounding-rule decision for change (which currency, nearest denomination or exact).

---

## Sequencing

Two different reasons a tier isn't started yet — worth keeping distinct:
- **Genuinely can't be planned yet** (Tier 1 needs an ADR, Tier 5 needs a brainstorm session each) — no execution
  plan should be written until that happens; doing so now would produce generic, throwaway steps.
- **Already decided and grounded, just not written yet** (Tier 4, Tier 6) — these need no further input and are the
  next candidates for a Plan 15 / Plan 16 the same shape as [Plan 14](14-tier3-systemic-ui.md), whenever more
  execution-plan capacity is wanted.

**Start now, in parallel:** Tier 3 ([Plan 14](14-tier3-systemic-ui.md), ready to execute) and Tier 1's *design* phase
(ADR, doesn't need the reset). Tier 5's brainstorming sessions can also start now, independently.

**Blocked on Tier 0's reset:** Tier 1 and Tier 4 *implementation* (not their design/planning work).

**Sequential:** Tier 1 → Tier 2 (roles/username need the tenancy shape decided first). Tier 4 and Tier 6 are
independent of the Tier 1→2 chain and of each other — schedule freely once Tier 0 is done.

**Note on Tier 3 vs Tier 1 overlap:** Tier 3 has no *code* dependency on Tier 1, but they touch overlapping files —
Tier 1's `$restaurantId` route segment rewrites every `to:`/nav-link path in the app, including the exact
`nav.ts`/`topbar.tsx` lines Task 2 (door→reservations rename) and Task 6 (modal URL params) edit. Landing Tier 3
first isn't wasted work — Tier 1 has to touch those links regardless — but expect Tier 1 to re-touch this surface,
not treat Tier 3 as permanently untouched by it.

Recommended order: **Tier 0 → Tier 3 (parallel with Tier 1 design) → Tier 1 → Tier 4 → Tier 2 → Tier 6 → Tier 5**
(Tier 5 last only because its brainstorm outputs should land after Tier 3's modal work, so a freshly-redesigned
screen doesn't need a second pass to pick up the new modal primitive).
