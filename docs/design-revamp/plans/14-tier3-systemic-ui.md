# Plan 14 — Tier 3: Systemic UI & Quick Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan
> task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
> Part of [Plan 13 — QA Backlog Roadmap](13-qa-backlog-roadmap.md), Tier 3. Source: [`issues.md`](../../../issues.md).

**Goal:** Land every QA-backlog item that needs **zero schema migration and no Tier 1/2 tenancy decision** — six
independent, well-scoped fixes ready to execute today. No `prisma migrate reset` dependency; can run in full parallel
with Tier 1's design phase.

**Tech Stack:** React 19 + Vite 7 + TanStack Router + Tailwind v4 + shadcn/ui (`select.tsx` and `dialog.tsx` are
**already installed** — no `npx shadcn add` needed for this plan) + `@base-ui/react` primitives.

## Global Constraints

- Semantic Tailwind tokens only — zero literal palette values (`bg-success|info|warning`, never `bg-emerald-*`).
- Multi-theme via `data-theme`; the `.dark` class is not used.
- Touch-target minimum 44px on coarse-pointer devices (already enforced globally via the Tier 1 `@media (pointer:
  coarse)` rule in `index.css` — new components inherit this for free via `data-slot`).
- Do not modify Orval-generated files under `apps/web/src/api/`.
- Run `pnpm typecheck` + affected tests before marking any task done.

---

### Task 1: Session length → 15 days

**Files:**
- Modify: `apps/api/src/auth/auth.service.ts:65` (refresh-token row `expiresAt`, currently `7 * 24 * 60 * 60 * 1000`
  milliseconds)
- Modify: `apps/api/src/auth/auth.controller.ts:43` and `:68` (cookie `maxAge`, currently `7 * 24 * 60 * 60`
  **seconds** — different unit than the service file)

**Why this shape:** three call sites encode "7 days" in two different units. Bumping only one desyncs the DB-stored
refresh-token expiry from the cookie's browser-side expiry, so the browser could send a cookie the DB has already
invalidated (or vice versa). Access-token lifetime (`expiresIn: '15m'`, `auth.service.ts:59`) is a separate, short-lived
knob and is unaffected — "session length" means how long a user stays logged in before being forced to re-auth, which
is the refresh token.

- [x] **Step 1:** Change `auth.service.ts:65` to `15 * 24 * 60 * 60 * 1000`.
- [x] **Step 2:** Change both `auth.controller.ts:43` and `:68` to `15 * 24 * 60 * 60`.
- [x] **Step 3:** `pnpm --filter @restaurant/api typecheck` + run existing auth tests. Expected: PASS (pure constant
  change).
- [x] **Step 4:** Commit: `fix(api): extend session length to 15 days`.

---

### Task 2: Door → Reservations rename + notes textarea

**Files:**
- Move: `apps/web/src/routes/_app/door/index.tsx` → `apps/web/src/routes/_app/reservations/index.tsx`
- Delete: the existing `apps/web/src/routes/_app/reservations/index.tsx` redirect stub (being replaced)
- Modify: `apps/web/src/components/layout/nav.ts:34` (`{ to: '/door', label: 'Door', ... }` → `/reservations`,
  `'Reservations'`)
- Modify: `apps/web/src/components/layout/topbar.tsx:14` (`'/door': 'Door'` title map entry → `/reservations`)
- Modify: `apps/web/src/routes/_app/service/index.tsx:100` (`navigate({ to: '/door' })` → `/reservations`)
- Modify (within the moved file): `PageHeader title="Door"` (was `door/index.tsx:419`) → `"Reservations"`
- Modify (within the moved file): notes `<input id="res-notes">` (was `door/index.tsx:223-229`) → `<textarea>`
- No edit: `apps/web/src/routeTree.gen.ts` — regenerates automatically from the route file move, do not hand-edit.

**Interfaces:** No prop/API shape changes — `SaveData.notes` and the Prisma `notes String?` column are already plain
strings, this is a form-control swap only (`<input>` → `<textarea>`).

**Why this shape:** the component internals already use `Reservation*` naming (`ReservationForm`, `ReservationList`,
`ReservationsPage`) — only the route path and the page title string carry "Door." This is a rename + relabel, not a
rebuild. The stub at `reservations/index.tsx` (currently 8 lines, redirects to `/door`) is deleted because the real
implementation takes its place.

- [x] **Step 1:** `git mv apps/web/src/routes/_app/door/index.tsx apps/web/src/routes/_app/reservations/index.tsx`
  (overwriting the stub); update `createFileRoute('/_app/door/')` → `createFileRoute('/_app/reservations/')` inside
  the moved file.
- [x] **Step 2:** Update the `PageHeader title` to `"Reservations"`.
- [x] **Step 3:** Convert the notes `<input>` to a `<textarea>` (keep existing `value`/`onChange` wiring; add a
  sensible `rows` and let it inherit the shared `data-slot` styling if `input.tsx`'s `data-slot="input"` styling
  doesn't apply to a bare textarea — check `input.tsx` for a reusable class export first before hand-rolling styles).
- [x] **Step 4:** Update the three nav/label references (`nav.ts:34`, `topbar.tsx:14`, `service/index.tsx:100`) to
  `/reservations` / `"Reservations"`.
- [x] **Step 5:** `pnpm --filter @restaurant/web dev` once to let TanStack Router regenerate `routeTree.gen.ts`;
  confirm no leftover `/door` references (`grep -rn "'/door'" apps/web/src`).
- [x] **Step 6:** Verify in-browser: sidebar/nav shows "Reservations," navigating there renders the full reservation
  list/form, notes field is a multi-line textarea, and `/door` no longer resolves (no redirect needed — it simply
  doesn't exist). *(Login page confirmed rendering; full click-through blocked by a pre-existing environment issue —
  Docker daemon was down, so the DB-backed `/api/auth/login` 500'd independent of this diff, confirmed via direct API
  call. Route/component correctness verified via typecheck, lint, and source review instead.)*
- [x] **Step 7:** `pnpm --filter @restaurant/web typecheck` + commit:
  `fix(web): rename Door to Reservations, notes field to textarea`.

---

### Task 3: Delete-table hardening + expose from map view

**Files:**
- Modify: `apps/api/src/table/table.service.ts:31-35` (`remove()`)
- Modify: `apps/web/src/routes/_app/floor/-floor-map.tsx` (add a delete affordance to `Tile`, currently has none)
- No edit (reference only): `apps/web/src/routes/_app/floor/index.tsx:249-273` (grid view's existing hover
  delete/edit icon buttons + `DeleteDialog` — reuse this pattern, don't reinvent it)

**Why this shape:** `remove()` today is a bare `prisma.table.delete()` with an existence check but **no guard**
against occupied/reserved status. `Order.tableId` and `Reservation.tableId` both default to Postgres `Restrict` (no
`onDelete` clause in the schema), so deleting a table with any order/reservation history throws an **unhandled**
FK-constraint error — a 500, not a friendly message. Map view has zero delete/edit affordance today (only grid view
does), so "no matter what layout he's watching" is currently false.

- [x] **Step 1:** In `table.service.ts`'s `remove()`, check the table's `status` (or query for related
  orders/reservations) before deleting; throw a `ConflictException` with a clear message
  (`"Cannot delete an occupied or reserved table"` or similar) instead of letting the FK error surface raw.
  *(Commit `a072a80` — also guards the available-with-history case, beyond just occupied/reserved.)*
- [x] **Step 2:** Confirm/add a test in `table.controller.spec.ts` or `table.service.spec.ts` asserting delete on an
  occupied table is rejected with a 409, and delete on an available table (no related rows) succeeds.
- [x] **Step 3:** In `-floor-map.tsx`'s `Tile`, add the same delete-icon affordance the grid view already has
  (reuse `DeleteDialog` from `floor/index.tsx` rather than duplicating it — extract it to a shared file if it isn't
  already importable across both views). *(Commit `1cb0373` + `6668801` — extracted to `-delete-dialog.tsx`.)*
- [x] **Step 4:** Verify in-browser: attempt delete on an occupied table in both map and grid view → friendly error
  toast, not a crash; delete an available table in map view → tile disappears.
- [x] **Step 5:** `pnpm --filter @restaurant/api typecheck` + `pnpm --filter @restaurant/web typecheck` + affected
  tests, then commit: `fix(web,api): guard table deletion, expose delete from floor map view`.

---

### Task 4: Service/Floor spacing consistency

**Files:**
- Modify: `apps/web/src/routes/_app/floor/index.tsx:439` (and its loading-state twin at `:416`)

**Why this shape:** Service's wrapper (`service/index.tsx:126`) is `<div className="space-y-6 p-1">` — one outer
padding value, one vertical-rhythm mechanism. Floor's wrapper (`floor/index.tsx:439`) is `<div className="p-6">` with
no `space-y-*`, so its sections space themselves ad hoc via scattered `mb-4`/`mb-6` (lines 424, 429, 512, 538, etc.).
`p-6` (24px) vs `p-1` (4px) is a 6x outer-padding mismatch. Floor's `p-6` reads as the more deliberate choice (matches
its denser spatial-map content); align Service to it rather than the reverse, unless a live comparison in-browser
says otherwise — check both before deciding which direction to normalize.

- [x] **Step 1:** Compare both screens side-by-side in-browser at desktop and mobile widths; decide which outer
  padding value + spacing mechanism (`space-y-*` vs per-element margins) reads better across both, and apply it to
  both wrappers (likely: adopt `p-6` uniformly and replace Floor's ad hoc `mb-4`/`mb-6` with a single `space-y-6`,
  since a consistent rhythm was already the direction taken on Service). *(Chose `p-6` uniformly, confirmed
  in-browser at desktop + 390px.)*
- [x] **Step 2:** Verify no visual regression on either screen (padding still frames content correctly on mobile —
  don't let a larger `p-6` clip content that fit at `p-1` on narrow viewports).
- [x] **Step 3:** `pnpm --filter @restaurant/web typecheck` + commit: `fix(web): unify Service/Floor content spacing`.
  *(Commit `6668801` — also fixed 2 pre-existing lint errors in `floor/index.tsx` that were blocking the hook:
  shadowed `Map` import, missing keyboard support on `TableCard`.)*

---

### Task 5: Native `<select>` → shadcn `Select` migration

**Files (8 usages across 5 files — `select.tsx` is already installed, no `shadcn add` needed):**
- `apps/web/src/routes/_app/reservations/index.tsx:165` (was `door/index.tsx` before Task 2's rename) — table picker
  for a reservation
- `apps/web/src/routes/_app/floor/index.tsx:147` — table status in the table edit form
- `apps/web/src/routes/_app/menu/index.tsx:341` — modifier group selection type (single/multi)
- `apps/web/src/routes/_app/menu/index.tsx:553` — menu item category
- `apps/web/src/routes/_app/menu/index.tsx:597` — menu item station
- `apps/web/src/routes/_app/order/-builder.tsx:253` — table picker for the order being built
- `apps/web/src/routes/_app/inventory/index.tsx:87` — inventory item unit
- `apps/web/src/routes/_app/inventory/index.tsx:184` — stock adjustment reason

**Interfaces:** No data-shape changes — each is a controlled value swap (`value`/`onChange` → shadcn `Select`'s
`value`/`onValueChange`). `select.tsx` already exports the full `Select`/`SelectTrigger`/`SelectContent`/`SelectItem`
set used elsewhere in the app (confirm existing usage pattern via `grep -rn "SelectTrigger" apps/web/src` for one to
copy from, if one exists — otherwise this file's own primitive API is the reference).

- [x] **Step 1:** Migrate `reservations/index.tsx:165` (table picker).
- [x] **Step 2:** Migrate `floor/index.tsx:147` (table status form field) — note this is the **edit-form** status
  select, distinct from the tap-to-cycle `StatusBadge` interaction elsewhere on the same screen; don't conflate the two.
- [x] **Step 3:** Migrate all three `menu/index.tsx` selects (341, 553, 597).
- [x] **Step 4:** Migrate `order/-builder.tsx:253` (table picker).
- [x] **Step 5:** Migrate both `inventory/index.tsx` selects (87, 184). *(Also fixed a real a11y gap: neither had an
  explicit `id`/`htmlFor` pairing since native `<select>` is implicitly labelable but the `SelectTrigger` wrapper
  isn't — added explicit `id="item-unit"`/`id="adjust-reason"`.)*
- [x] **Step 6:** Verify each migrated field in-browser: options populate correctly, keyboard navigation works,
  touch target ≥44px on emulated tablet (inherits the Tier 1 coarse-pointer rule via `data-slot="select-trigger"`).
- [x] **Step 7:** `pnpm --filter @restaurant/web typecheck` + affected tests + commit:
  `fix(web): replace native selects with shadcn Select (8 sites)`. *(Commit `661e51c`.)*

---

### Task 6: URL-driven responsive modal + migrate the 5 Sheet usages + status-chip color/cycle

**Files:**
- Create: `apps/web/src/components/ui/url-modal.tsx` (or similar) — a shared component wrapping the existing
  `dialog.tsx` primitive, full-screen below a breakpoint (e.g. `sm:`), open state driven by a caller-supplied search
  param rather than local `useState`.
- Modify (migrate off `Sheet`, onto the new **URL-driven** modal — these are the three *content* modals the "modals
  should be url-driven" issue is actually about):
  - `apps/web/src/routes/_app/floor/-table-action-sheet.tsx:139-191` (per-table actions) — param e.g. `?tableId=`
    (the floor screen already reads `tableId` for the order hand-off, per Tier 5's floor-order-flow item — reuse the
    same param, don't invent a second one for the same table)
  - `apps/web/src/routes/_app/door/index.tsx` → now `reservations/index.tsx` (417-452, new/edit reservation form) —
    param e.g. `?reservation=new` or `?reservation=<id>`
  - `apps/web/src/routes/_app/order/-builder.tsx:380-409` (mobile ticket bottom sheet) — param e.g. `?ticket=open`
- Modify (migrate onto the same modal component for **styling consistency**, but keep local `useState` — a
  reopens-on-refresh hamburger menu or notifications panel isn't what the "url-driven" ask was about):
  - `apps/web/src/components/layout/topbar.tsx:50-92` (mobile nav menu)
  - `apps/web/src/components/layout/topbar.tsx:97-115` (notifications panel)
  - **Flag this split as a decision, not settled fact** — if in-browser review makes the nav/notifications panels
    feel wrong as full-screen modals (they may read better staying as slide-in sheets), it's fine to leave those two
    on `Sheet` entirely and scope this task to the three content modals only.
- Modify: `-table-action-sheet.tsx:160-171` (status control) — replace the plain 3-button row with color-coded chips
  (reuse the `STATUS_BG`/`STATUS_TONE` tokens from `-floor-map.tsx`, deduplicating the currently-duplicated maps) +
  the same tap-to-cycle + tooltip pattern the grid view's `TableCard` already has (`floor/index.tsx:286-296`) rather
  than a fixed picker.

**Interfaces:** The new modal component's contract: takes an optional search-param key + optional value — when
given, reads/writes it via TanStack Router's `useSearch`/`navigate` (matching the existing pattern already used for
`/order?tableId=`); when omitted, falls back to plain controlled `open`/`onOpenChange` like `Sheet` does today (for
the two nav-chrome panels, if they end up staying local-state). Renders centered on `sm:` and up, `inset-0`
full-bleed below it. Each Sheet's existing content (`ReservationForm`, `TableActionSheet`'s body, `TicketPanel`, the
two topbar panels) slots in unchanged — only the open/close mechanism and the outer chrome change.

**Why this shape:** none of the 5 existing Sheets are URL-driven today (all pure `useState` — confirmed: `floor`'s
`selectedTable` at `floor/index.tsx:334`, door's `sheetOpen` at `door/index.tsx:364`, builder's `ticketOpen` at
`-builder.tsx:78`, topbar's `mobileMenuOpen`, and the notifications panel has no controlled state at all). Building
one shared primitive instead of hand-rolling URL-sync in each content-modal call site avoids three slightly-different
reimplementations of the same "read param → open, close → clear param" logic — and reusing it (without the URL wiring)
for the two nav panels keeps all five visually consistent even if only three are actually URL-driven.

- [ ] **Step 1:** Build `url-modal.tsx` on top of `dialog.tsx`; full-screen below `sm:` via Tailwind breakpoint
  classes, centered card at `sm:` and up (per `docs/PRODUCT.md`'s "modal, not drawer" + "full screen like a new page
  on mobile" requirement); support both the URL-driven and locally-controlled modes described above.
- [ ] **Step 2:** Migrate `-table-action-sheet.tsx` first (highest-value: also lets the status-chip work land in the
  same diff) — swap `Sheet` for the new modal in URL-driven mode (param `tableId`), and replace the 3-button status
  picker with color-coded tap-to-cycle chips + tooltip.
- [ ] **Step 3:** Migrate the reservations form (was `door/index.tsx`, now under Task 2's renamed file) onto the new
  modal in URL-driven mode, param `reservation`.
- [ ] **Step 4:** Migrate the order builder's mobile ticket sheet onto the new modal in URL-driven mode, param
  `ticket`.
- [ ] **Step 5:** Migrate both topbar panels onto the new modal for visual consistency; decide in-browser whether
  they should also take a search param or stay locally controlled (see the flagged decision above), and note the
  choice made in the commit message.
- [ ] **Step 6:** Verify in-browser at mobile width (390px) and desktop: the three content modals open full-screen
  on mobile / centered on desktop, survive a page refresh with their param present, back button closes them, and the
  status chips in the table-action-sheet are color-coded + cycle on tap with a visible tooltip.
- [ ] **Step 7:** `pnpm --filter @restaurant/web typecheck` + affected tests + commit:
  `feat(web): url-driven responsive modal, migrate 5 sheets, color-coded status chips`.

---

## Self-review notes

- **Spec coverage:** all six Tier 3 bullets from Plan 13 map 1:1 to Tasks 1-6 above. Complete.
- **Scope boundary:** the floor→order "connection" UX itself (Tier 5, brainstorm item) is explicitly **not**
  redesigned here — Task 6 only moves its *sheet* onto the new modal primitive and reuses the existing `tableId`
  param; the actual hand-off flow/copy is left for the Tier 5 brainstorm to avoid doing the same screen twice.
- **Sequencing:** Tasks 1-5 have no inter-dependencies and can run in parallel across subagents. Task 6 depends on
  nothing else in this plan but is the largest single task — consider running it after Task 2 lands (so it migrates
  the reservations file at its final path, not `door/index.tsx`) to avoid a rebase conflict.
