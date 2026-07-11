# Floor Sections + Table→Order Hand-off — Design

**Date:** 2026-07-11
**Status:** Approved (Armand, 2026-07-11)
**Scope:** `/floor` multi-section support + delete-section/table + the table-to-order hand-off UX. Tier 5 item from
[Plan 13](../../design-revamp/plans/13-qa-backlog-roadmap.md).

---

## 1. Problem

Two related issues.md items: (1) a restaurant can only have one flat table layout today — no concept of separate
areas (patio, bar, main room); (2) starting/continuing an order from a table feels disconnected — tap table → sheet
pops up → "Start order" navigates to a separate `/order` page, losing the sense of still being on that table.

## 2. Data model

- New `Section` model: `id`, `name` (e.g. "Patio", "Bar", "Main Room"), `sortOrder Int @default(0)`. No literal
  "floor level" — named groupings only, confirmed with Armand (not physical floors).
- `Table` gains `sectionId String` (FK to `Section`, required — every table belongs to exactly one section) and an
  optional `name String?` (a custom label like "Window booth"). `Table.number` stays globally `@unique` across the
  whole venue, unchanged from today — confirmed with Armand.
- `Section` does **not** get a `restaurantId` in this pass — it picks one up automatically when Tier 1 (multi-tenancy,
  [ADR-002](../../decisions/ADR-002-multi-tenancy.md)) lands, same as every other model. Not a blocker for this design.
- A restaurant is seeded with one default `Section` ("Main Room") so existing single-section venues need no manual
  migration step beyond assigning existing tables to it.

## 3. Floor screen IA

- Tabs across the top, one per `Section`, sitting alongside the existing map/grid view-toggle (doesn't replace it —
  confirmed with Armand). Switching tabs filters the visible tables to that section.
- Section management (create/rename/reorder/delete) lives behind a small "Manage sections" entry near the tabs —
  not a separate route, a modal (consistent with the "modals not drawers" systemic direction from Plan 14).
- **Delete section:** only allowed when the section has zero tables (move or delete tables out first). No
  auto-cascade-with-partial-failure logic — if a section has tables, the delete action is disabled with a tooltip
  explaining why, rather than attempting a bulk operation that can partially fail.
- **Delete table:** unchanged from Plan 14 Task 3's guard (rejects occupied/reserved/has-history), now also
  reachable from every section tab in both map and grid view (already Task 3's scope, just now section-aware).

## 4. Table → order hand-off

- Tapping a table tile (available or occupied) opens the order builder **directly, as a modal anchored to that
  table** — reusing Plan 14 Task 6's URL-driven modal primitive and the existing `OrderBuilder` component
  (`apps/web/src/routes/_app/order/-builder.tsx`), not a new implementation. URL param on the floor route itself,
  e.g. `/floor?tableId=<id>&modal=order` — the floor screen stays visible/dimmed behind it; closing returns exactly
  where you were (same section tab, same scroll position).
- A small "⋯" icon on the tile (or long-press on touch) opens the existing `TableActionSheet` (also a URL-modal per
  Task 6) for status change, reservation info, and delete — demoted from the primary tap target since starting/
  continuing an order is the far more frequent action.
- The standalone `/order` page (kanban board across all active orders) is unchanged — it remains the place kitchen-
  adjacent staff check overall order status across every table. This design only changes the *entry point* from
  Floor, not the order-management page itself.
- `OrderBuilder` is reused as-is inside the new modal shell — no fork. Its existing props/data-fetching (keyed by
  `tableId`) already match a modal-anchored usage; only its outer chrome changes (full page → modal body).

## 5. Error handling

- Opening the order modal for a table that gets deleted/occupied by someone else mid-tap: `OrderBuilder`'s existing
  data-fetching + Tier 4 reliability error toasts already cover a stale/missing table (no new handling needed —
  verify this holds when wiring the modal, don't assume).
- Section delete with tables present: button disabled, not an error state (prevented before it can fail).
- Table delete: unchanged, already covered by Plan 14 Task 3's `ConflictException` + toast.

## 6. Testing

- `Section` CRUD: standard NestJS controller/service unit tests (mirror the existing `table.controller.spec.ts`
  pattern).
- Frontend: a test confirming the delete-section action is disabled when the section has ≥1 table; a test
  confirming tapping a table tile opens the order modal with the correct `tableId` in the URL; a test confirming the
  seed migration assigns all pre-existing tables to a default "Main Room" section.

## Self-review

- No placeholders/TBDs. Internally consistent with Plan 14 Task 6 (URL-modal primitive) and Plan 14 Task 3 (delete
  guard) — this plan builds on both rather than duplicating them.
- Scope: focused enough for one implementation plan (Plan 17). Does not touch Tier 1 tenancy or Tier 2 RBAC.
