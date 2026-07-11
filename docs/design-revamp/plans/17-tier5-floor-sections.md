# Plan 17 — Tier 5: Floor Sections + Table→Order Hand-off Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan
> task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
> Part of [Plan 13 — QA Backlog Roadmap](13-qa-backlog-roadmap.md), Tier 5 (first of five brainstormed items).
> Design: [docs/superpowers/specs/2026-07-11-floor-sections-and-order-handoff-design.md](../../superpowers/specs/2026-07-11-floor-sections-and-order-handoff-design.md)
> (approved by Armand, 2026-07-11).

**Goal:** Add named sections (not literal floors) to the floor screen with tab switching, section-aware delete, and
replace the table→order hand-off with a direct-to-order tap that opens the order builder as a table-anchored modal.

**⚠️ Prerequisite:** Task 3 below reuses [Plan 14](14-tier3-systemic-ui.md) Task 6's URL-driven modal primitive
(`url-modal.tsx`) — **do not start Task 3 until Plan 14 Task 6 has landed.** Tasks 1-2 (schema + section CRUD/tabs)
have no such dependency and can run first. This plan's schema migration also needs the same Tier 0 `prisma migrate
reset` prerequisite as every other schema change in this roadmap — confirm it's run before Task 1's migration step.

**Tech Stack:** Prisma 7, NestJS, React 19 + TanStack Router, existing `DeleteDialog`/`OrderBuilder` components
(reused, not rebuilt).

## Global Constraints

- Semantic Tailwind tokens only; modals not drawers (per Plan 14); touch targets ≥44px on coarse pointer.
- Never hand-edit `apps/web/src/api/**` — regenerate via Orval after any DTO/schema change.
- Run `pnpm typecheck` + affected tests before marking any task done.

---

### Task 1: `Section` model + seed migration

**Files:**
- Modify: `prisma/schema.prisma` — new `Section` model (`id`, `name String`, `sortOrder Int @default(0)`); `Table`
  gains `sectionId String` (required FK) and `name String?` (optional custom label). `Table.number` stays globally
  `@unique`, unchanged.
- Modify: `prisma/seed.ts` — seed a default `Section` ("Main Room") and assign all seeded tables to it, so the seed
  script still produces a working app after the Tier-0 reset.
- New: `apps/api/src/section/` module (controller/service/DTOs) — standard CRUD (`GET/POST/PATCH/DELETE
  /sections`), mirroring the existing `table` module's structure and Swagger-decorator conventions.
- Modify: `apps/api/src/table/` — `create`/`update` DTOs gain `sectionId` (required on create) and `name` (optional).
- Modify: `packages/shared/src/schemas/` — add a `SectionSchema`/`CreateSectionSchema`, extend the table schemas
  with `sectionId`/`name`.

**Why this shape:** matches this app's existing per-feature-module pattern (`table/`, `menu/`, etc.) rather than
bolting sections onto the table module. Every existing table needs a `sectionId` from day one (required FK, not
nullable) — the seed migration is what makes that non-breaking for existing data.

- [ ] **Step 1:** Add `Section` model + `Table.sectionId`/`Table.name` to `prisma/schema.prisma`.
- [ ] **Step 2:** Confirm the Tier 0 `prisma migrate reset` has run this session (or run it now, confirming with
  Armand first — same one-time prerequisite as Plans 15/16), then `pnpm prisma migrate dev --name add_sections`,
  then `pnpm prisma generate`.
- [ ] **Step 3:** Update `prisma/seed.ts` to create a default "Main Room" section and assign it to every seeded table.
- [ ] **Step 4:** Scaffold `apps/api/src/section/` (controller, service, DTOs, module registration) with full CRUD +
  Swagger decorators, following the `table` module's existing conventions.
- [ ] **Step 5:** Add `sectionId`/`name` to the table create/update DTOs and shared Zod schemas.
- [ ] **Step 6:** Regenerate the Orval client (`pnpm --filter @restaurant/web gen:api` + biome format on `src/api`).
- [ ] **Step 7:** `pnpm --filter @restaurant/api typecheck` + unit tests for the new section service/controller
  (mirror `table.controller.spec.ts`'s pattern, including a delete-guard test — see Task 2).
- [ ] **Step 8:** Commit: `feat(api): add Section model, section CRUD, table sectionId/name fields`.

---

### Task 2: Floor screen — section tabs + section-aware delete

**Files:**
- Modify: `apps/web/src/routes/_app/floor/index.tsx` — add tabs (one per `Section`) above the existing map/grid
  view-toggle; filter the visible table list to the active tab's section.
- Modify: `apps/api/src/section/section.service.ts` — `remove()` guards: reject deletion when the section has ≥1
  table (a `ConflictException`, mirroring Plan 14 Task 3's table-delete guard pattern), rather than attempting a
  cascade.
- New/modify: a small "Manage sections" modal (create/rename/reorder/delete) — reuse Plan 14's modal primitive if
  it has landed by this point (see prerequisite note above); if Task 3 of *this* plan hasn't started yet because
  Plan 14 Task 6 is still pending, build this specific modal with the existing `Dialog` primitive directly and
  don't block Task 2 on Task 6 — only the table→order hand-off (this plan's Task 3) has a hard dependency on
  Task 6's specific URL-driven primitive.

**Why this shape:** tabs are additive to the existing map/grid toggle (per the approved design, not a replacement).
The delete-guard mirrors an already-established pattern in this codebase (Plan 14 Task 3), so no new error-handling
convention is introduced.

- [ ] **Step 1:** Add the section-delete guard to `section.service.ts` (reject with `ConflictException` when the
  section has any tables).
- [ ] **Step 2:** Add section tabs to `floor/index.tsx`, filtering tables by the active section.
- [ ] **Step 3:** Add the "Manage sections" modal (create/rename/reorder/delete, disabled-with-tooltip on delete
  when the section has tables).
- [ ] **Step 4:** `pnpm --filter @restaurant/web typecheck` + `pnpm --filter @restaurant/api typecheck` + affected
  tests.
- [ ] **Step 5:** Verify in-browser: creating a section, switching tabs filters tables correctly, deleting a
  non-empty section is disabled with an explanatory tooltip, deleting an empty section succeeds.
- [ ] **Step 6:** Commit: `feat(web,api): section tabs on floor screen, section-aware delete guard`.

---

### Task 3: Table → order direct-tap hand-off

**Files:**
- Modify: `apps/web/src/routes/_app/floor/index.tsx` and `-floor-map.tsx` — table tile's primary `onClick` now opens
  the order builder modal (via Plan 14 Task 6's `url-modal.tsx`, param e.g. `?tableId=<id>&modal=order` on the floor
  route) instead of opening `TableActionSheet`.
- Modify: `apps/web/src/routes/_app/floor/-table-action-sheet.tsx` (or wherever it lands post-Task-6) — becomes
  reachable via a small "⋯" icon on the tile (or long-press on touch), not the primary tap.
- Reuse (no fork): `apps/web/src/routes/_app/order/-builder.tsx`'s `OrderBuilder` component, rendered inside the new
  modal shell. Its existing `tableId`-keyed data-fetching is unchanged — only the outer chrome (page → modal) differs.

**Why this shape:** per the approved design, ordering is the ~10x-more-frequent action on a table, so it becomes the
primary tap target; status/reservation/delete move to a secondary affordance. Reusing `OrderBuilder` as-is (not
forking it) avoids maintaining two order-building implementations.

- [ ] **Step 1:** Confirm Plan 14 Task 6 has landed (its `url-modal.tsx` exists) — if not, stop and land that first.
- [ ] **Step 2:** Change the tile's primary tap to open the order modal (`?tableId=&modal=order`), reusing
  `OrderBuilder` inside it.
- [ ] **Step 3:** Move `TableActionSheet` behind a "⋯" icon / long-press, keeping it as its own URL-modal (per
  Plan 14 Task 6's existing `tableId`-param migration of this same component — reconcile the two URL params so
  opening the actions sheet vs. the order modal don't fight over the same query key; e.g. `?tableId=&modal=actions`
  vs. `?tableId=&modal=order`).
- [ ] **Step 4:** `pnpm --filter @restaurant/web typecheck` + affected tests.
- [ ] **Step 5:** Verify in-browser: tapping a table tile opens the order builder directly with the floor screen
  dimmed behind it; the "⋯" icon opens the actions sheet; both close back to the same floor scroll position/section
  tab; a stale/deleted table shows the existing Tier 4 error toast rather than a broken modal.
- [ ] **Step 6:** Commit: `feat(web): direct-tap table→order hand-off, actions sheet moves to secondary affordance`.

---

## Self-review notes

- **Spec coverage:** all three design-doc sections (data model, floor IA, hand-off) map to Tasks 1-3. Complete.
- **Sequencing:** Task 1 → Task 2 (Task 2's delete-guard/tabs need the `Section` model). Task 3 is independently
  gated on Plan 14 Task 6, not on this plan's own Task 1/2 — it could in principle land before or after them, but
  doing it last avoids touching `floor/index.tsx`'s tile click-handler twice in one plan's sequence.
- **Scope boundary:** does not touch Tier 1 tenancy (`Section` has no `restaurantId` yet, by design) or the `/order`
  kanban page itself — only the entry point from Floor.
