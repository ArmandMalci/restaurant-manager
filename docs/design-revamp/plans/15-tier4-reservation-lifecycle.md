# Plan 15 — Tier 4: Reservation Lifecycle Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan
> task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
> Part of [Plan 13 — QA Backlog Roadmap](13-qa-backlog-roadmap.md), Tier 4. This is the previously-deferred **T3.5 /
> D4** from [Plan 10](10-finalization-roadmap.md#tier-3--high-severity-remaining-broad-quality) — same migration
> blocker, now unblocked by Tier 0's `prisma migrate reset`.

**Goal:** Replace the reservation module's client-side clock-math status heuristic with a real, persisted lifecycle;
add seat/no-show/walk-in actions + guest lookup; surface reservation context on reserved floor tiles.

**⚠️ Prerequisite — do not start Task 1 until this is confirmed with Armand:** this plan's migration requires
Tier 0's `prisma migrate reset` (drops and reseeds the local dev DB) to clear the pre-existing checksum drift on
`20260626000001_add_order_item_modifiers`. If Tier 1 (tenancy foundation) hasn't already run this reset, run it here
first — **confirm with Armand immediately before running it**, once, not speculatively.

**Tech Stack:** NestJS + Prisma 7 (`apps/api/src/reservation`), React 19 + TanStack Router + `@restaurant/shared` Zod
schemas + Orval-generated hooks (regenerate after the DTO change — `pnpm --filter @restaurant/web gen:api`, then
`pnpm --filter @restaurant/web exec biome check --write src/api`, per CLAUDE.md).

## Global Constraints

- Semantic Tailwind tokens only; no `.dark` class; touch targets ≥44px on coarse pointer (already global).
- Never hand-edit `apps/web/src/api/**` — regenerate via Orval after any DTO/schema change.
- Every new/changed endpoint needs complete Swagger decorators (`@ApiOperation`, `@ApiResponse` with explicit DTO
  types, `@ApiProperty`/`@ApiPropertyOptional` incl. nullability/enums) — Orval generates the client from this spec.
- Run `pnpm typecheck` + affected tests before marking any task done.

---

### Task 1: `Reservation.status` — real persisted lifecycle

**Files:**
- Modify: `prisma/schema.prisma` — `Reservation` model (171-187) gains `status ReservationStatus @default(booked)`;
  add `enum ReservationStatus { booked seated no_show cancelled }`. **Also fix a pre-existing schema/Zod mismatch
  found while grounding this plan**: `prisma/schema.prisma`'s `Reservation.tableId` is a required `String` (no `?`),
  but `packages/shared/src/schemas/reservation.ts`'s `ReservationSchema.tableId` is `z.string().uuid().nullable()`
  — Zod would accept a `null` tableId that Prisma's non-null column would then reject with a confusing DB error.
  Reconcile these to match (recommend: keep `tableId` required in both, since a reservation without a table doesn't
  match this app's current walk-in-less booking flow — confirm no caller actually relies on a null `tableId` before
  tightening the Zod schema; grep `apps/web/src` for any `tableId: null` reservation payload first).
- Modify: `packages/shared/src/schemas/reservation.ts` — add `status` to `ReservationSchema` (required, enum) and to
  `UpdateReservationSchema` (optional, since `CreateReservationSchema` derives from it — new reservations default to
  `booked` server-side, don't require callers to pass it on create).
- Modify: `apps/api/src/reservation/reservation.service.ts` — `create()` (24-35) no longer needs to set `status`
  explicitly (DB default handles it); `update()` (37-49) passes through `status` like every other optional field.
- Modify: `apps/api/src/reservation/reservation.controller.ts` / `apps/api/src/swagger-dtos` — ensure the DTO/Swagger
  spec exposes `status` with the 4 enum values (`@ApiProperty({ enum: [...] })`) so Orval generates the right type.
- Modify: `apps/web/src/routes/_app/reservations/index.tsx` — delete `deriveStatus()` (48-58) and the `DerivedStatus`
  type; render/derive from the real `reservation.status` field instead. `STATUS_TONE`/`STATUS_LABELS` maps (already
  present in the file) map 1:1 onto the 4 new enum values with minor renaming (`confirmed`→`booked`,
  `pending`→(drop, no longer needed since a table is always assigned per Task 1's schema reconciliation),
  `seated`→`seated` (now real, driven by an explicit seat action, not a clock-proximity guess), `cancelled` stays,
  add `no_show`.
- Regenerate: `pnpm --filter @restaurant/web gen:api` + `pnpm --filter @restaurant/web exec biome check --write
  src/api` (per CLAUDE.md, after any API contract change).

**Why this shape:** the current heuristic (`door/index.tsx`'s `deriveStatus`, now in `reservations/index.tsx:48-58`)
computes status purely from `date`/`tableId` proximity to "now" — it doesn't even read the existing `seatedAt`
column, so a reservation seated 3 hours ago still shows "confirmed" once outside the ±2hr window, and there's no way
to ever reach "no_show" at all. A real column removes the guesswork and is what Task 2's seat/no-show buttons write to.

- [ ] **Step 1:** Add `ReservationStatus` enum + `status` field to `prisma/schema.prisma`; reconcile the
  `tableId` nullable mismatch (see Files above).
- [ ] **Step 2:** Run the Tier-0 prerequisite migration reset if not already done this session (confirm with Armand
  first), then `pnpm prisma migrate dev --name add_reservation_status` to generate the real migration, then
  `pnpm prisma generate`.
- [ ] **Step 3:** Update `ReservationSchema`/`UpdateReservationSchema` in `packages/shared`; update
  `reservation.service.ts` and the Swagger DTOs/decorators.
- [ ] **Step 4:** Regenerate the Orval client (`pnpm --filter @restaurant/web gen:api` + biome format on `src/api`).
- [ ] **Step 5:** Replace `deriveStatus()` in `reservations/index.tsx` with the real `status` field; update
  `STATUS_TONE`/`STATUS_LABELS` for the 4 real enum values.
- [ ] **Step 6:** `pnpm --filter @restaurant/api typecheck` + `pnpm --filter @restaurant/web typecheck` + affected
  tests (reservation service/controller specs). Update `packages/shared`'s reservation schema test if one exists.
- [ ] **Step 7:** Verify in-browser: creating a reservation defaults to `booked`; status badge no longer flips based
  on wall-clock proximity alone.
- [ ] **Step 8:** Commit: `feat(api,web): add persisted Reservation.status lifecycle`.

---

### Task 2: Seat / no-show / walk-in actions + guest lookup

**Files:**
- Modify: `apps/api/src/reservation/reservation.controller.ts` + `reservation.service.ts` — add explicit
  status-transition endpoints or extend `PATCH /reservations/:id` to accept a `status` transition (prefer reusing the
  existing `update()` path with validation on allowed transitions — e.g. `booked→seated`, `booked→no_show`,
  `any→cancelled` — rather than one bespoke endpoint per action, matching this app's existing "one PATCH, guarded
  transitions" pattern used elsewhere, e.g. order status).
- Modify: `apps/web/src/routes/_app/reservations/index.tsx` — add Seat / No-show action buttons per reservation row
  (reuse `ListRow`'s existing action-slot pattern already used in this file); add a "walk-in" quick-create flow
  (a reservation created and immediately marked `seated`, for a guest who didn't book ahead — likely a shortened
  version of the existing `ReservationForm` with `date` defaulted to now and status set to `seated` on submit).
- Add: guest lookup — a search input filtering the existing reservation list by `guestName`/`guestPhone`/`guestEmail`
  client-side (the list is already fetched in full via `useReservationControllerGetAll`, per the door-reservation
  research; no new endpoint needed for a client-side filter at this data volume — revisit server-side search only if
  the guest list grows large enough that this measurably matters, per the "don't build for hypothetical scale"
  standing guidance).

**Why this shape:** T3.5's original scope (Plan 10) was seat/no-show/walk-in actions + guest lookup; Task 1 makes
the underlying status field real, so Task 2 is purely the actions/UI built on top of it — no further schema changes
needed here.

- [ ] **Step 1:** Add guarded status-transition support to the reservation update path (reject invalid transitions,
  e.g. `no_show→booked`, with a clear error).
- [ ] **Step 2:** Add Seat / No-show buttons to each reservation row in the UI, wired to the transition endpoint.
- [ ] **Step 3:** Add a walk-in quick-create flow.
- [ ] **Step 4:** Add client-side guest lookup/search over the existing fetched list.
- [ ] **Step 5:** `pnpm --filter @restaurant/api typecheck` + `pnpm --filter @restaurant/web typecheck` + affected
  tests (add a test for the transition-guard logic — this is exactly the kind of branch-y logic that needs one).
- [ ] **Step 6:** Verify in-browser: seat/no-show buttons transition status correctly and reject invalid transitions;
  walk-in creates a `seated` reservation immediately; guest search filters the list.
- [ ] **Step 7:** Commit: `feat(web,api): seat/no-show/walk-in actions + guest lookup on reservations`.

---

### Task 3: Reservation context on reserved floor tiles (T3.8 remainder)

**Files:**
- Modify: `apps/web/src/routes/_app/floor/index.tsx` and/or `-floor-map.tsx` and `-table-action-sheet.tsx` — today a
  reserved table shows only a bare "Reserved" status badge (`STATUS_LABELS.reserved`, `index.tsx:35`) with **zero**
  guest/time/party-size context anywhere on the floor screen (confirmed: no reservation data is fetched or joined
  into the floor route at all today).
- Likely needs: a lightweight query joining today's reservations to tables (either a new backend query param on
  `GET /tables` — e.g. `?includeReservation=true` — or a client-side join against `useReservationControllerGetAll`
  filtered to today, matching by `tableId`; prefer the client-side join first since the reservation list is already
  fetched elsewhere in the app and this avoids a backend change for a display-only feature — revisit server-side
  joining only if the client-side approach proves too slow).

**Why this shape:** T3.8 (Plan 10, Tier 3) already landed "single accent CTA + place newly-created tables on the
map," but explicitly deferred "show reservation context on reserved tables" to this same migration blocker — this
task closes that last piece.

- [ ] **Step 1:** Fetch today's reservations on the floor route (or join client-side against an already-fetched
  list) and match by `tableId`.
- [ ] **Step 2:** Surface guest name + reservation time (+ party size if space allows) on reserved tiles in both map
  and grid view, and in the `TableActionSheet` when opened on a reserved table.
- [ ] **Step 3:** `pnpm --filter @restaurant/web typecheck` + affected tests.
- [ ] **Step 4:** Verify in-browser: a reserved table shows who it's reserved for and when, in both floor views and
  the action sheet.
- [ ] **Step 5:** Commit: `feat(web): surface reservation context on reserved floor tiles`.

---

## Self-review notes

- **Spec coverage:** Tier 4's three Plan-13 bullets (status lifecycle, T3.5 actions, T3.8 remainder) map 1:1 to
  Tasks 1-3. Complete.
- **Sequencing:** Task 1 must land before Task 2 (Task 2's actions write to the field Task 1 creates) and before
  Task 3 if Task 3's join surfaces `status` (it may not need to — party/time/guest name don't require the new field
  — so Task 3 could in principle run in parallel with Task 1/2, but land it last anyway to avoid touching the same
  reservation-list query shape twice in one PR sequence).
- **Scope boundary:** this plan does not touch Tier 1's tenancy work or Tier 5's `/calendar` brainstorm, even though
  both also touch reservations — Tier 1 will re-scope this data to a restaurant later, and Tier 5 may reshape how
  reservations are *presented* on a calendar; this plan only fixes the lifecycle's correctness and the floor-screen
  context gap.
