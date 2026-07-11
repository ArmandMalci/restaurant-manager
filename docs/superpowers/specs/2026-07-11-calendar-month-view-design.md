# /calendar Month View — Design

**Date:** 2026-07-11
**Status:** Approved
**Scope:** Calendar screen. Tier 5 item from [Plan 13](../../design-revamp/plans/13-qa-backlog-roadmap.md).

---

## 1. Current state and constraint

`apps/web/src/routes/_app/calendar/index.tsx` is a two-tab (Reservations / Shifts) `react-big-calendar` instance,
defaulting to Week view. Verified: the Shifts tab is **read-only display only** — no `onSelectSlot`/create-shift
wiring exists anywhere in the file, consistent with Plan 10's D4 decision to cut in-app shift *scheduling* from the
pilot. That decision doesn't ask for the Shifts tab to be removed, only that scheduling not be built — so it stays
as read-only, unchanged by this design.

## 2. Design: Reservations becomes a real month view

- Default view changes from Week to Month (`react-big-calendar` already supports `Views.MONTH` — this is a
  configuration change, not new calendar infrastructure) for the Reservations tab. Shifts tab keeps its current
  default (Week/Day/Agenda per viewport, unchanged) since it isn't the target of this ask.
- Month cells are too small to show full reservation details inline. Clicking a day opens a day-detail modal (per
  the "modals not drawers, URL-driven" systemic direction from Plan 14) listing that day's reservations — reusing
  the `ListRow` pattern already used on the reservations screen itself, not a new list component.
- The existing view-toggle (Week/Day/Agenda) stays available — Month becomes the new default, not the only option,
  since staff may still want week-level detail during active service.
- Overlapping-reservation legibility (already partially addressed per Plan 10's T3.6) is less of a concern in month
  view than week view, since each day is a single cell showing a count/summary rather than stacked time-blocks.

## 3. Explicitly out of scope

- Shift scheduling/creation — remains out of scope per D4; this design does not add it.
- Any change to the underlying reservation data model — this is a display/view-mode change on top of the existing
  `useReservationControllerGetAll` data, not a schema change. (Plan 15's `Reservation.status` work is unrelated and
  can land independently.)

## 4. Testing

- A test confirming Month is the default view on load for the Reservations tab.
- A test confirming clicking a day cell opens the day-detail modal listing that day's reservations.

## Self-review

- Scoped to exactly what was asked (month view) plus the minimum supporting interaction (day detail) needed to make
  a month view usable, without touching the out-of-scope Shifts/scheduling area.
