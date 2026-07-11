# /kds Screen UX — Design

**Date:** 2026-07-11
**Status:** Approved
**Scope:** Kitchen display screen. Tier 5 item from [Plan 13](../../design-revamp/plans/13-qa-backlog-roadmap.md).

---

## 1. A real bug found during research

Plan 10's Tier 2 changelog (`docs/design-revamp/plans/10-finalization-roadmap.md`, T2.3) claims: "replace the
board-wide `isBumping` flag with per-item pending state... **add a short undo window on an accidental bump**."
Verified directly against `apps/web/src/routes/_app/kds/index.tsx`: the per-item pending state exists
(`bumpingKeys`), but **no undo mechanism exists anywhere in the file** — a bumped item immediately calls
`useOrderControllerUpdateItemStatus` with `status: 'ready'` and, on success, is gone from the active view with no way
back. On a busy kitchen tablet, a mis-tap permanently marks the wrong item ready with zero recovery — this is a real
reliability gap on the exact "never lose/corrupt a ticket" bar this app is held to (per the Finalization Direction).
This is the highest-priority fix in this spec, not speculative UX polish.

## 2. Design: undo window

- On bump, show a toast (reusing the existing `sonner` toast infra already in this app) with an "Undo" action button
  and a ~5 second window, matching the standard toast-undo pattern (not a modal/blocking confirm — bumping needs to
  stay a single tap, the safety net is the undo, not a confirm-before-bump friction step).
- Undo re-fires `useOrderControllerUpdateItemStatus` with the item's prior status (`pending` or `in_progress` —
  whichever it was before the bump; track this in the bump handler, don't assume `pending`).
- If the toast's window expires or the user dismisses it, no further action — the bump stands.

## 3. Secondary UX improvement: per-station columns

Currently a single station-toggle filter strip (`all/grill/cold/bar/pass`) dims/filters one shared list rather than
showing separate columns per station. issues.md's ask ("needs a better UX and UI," no further specifics) is vague,
but this is a well-established KDS pattern worth applying: a kitchen with multiple active stations benefits from
each cook seeing their own column without toggling away from "all." Recommend: keep the "all" toggle as a combined
view (today's behavior), but when a specific station is NOT selected, render all stations as parallel columns
(like the `/order` kanban's column layout) instead of one flat filtered grid. This is additive to the existing
component, not a rebuild.

## 4. Testing

- A test for the undo action: bump an item, confirm the toast renders with an Undo button, confirm clicking it
  restores the item's prior status via the mutation.
- A test confirming station columns render independently when "all" is not selected.

## Self-review

- The undo-window gap is a verified, concrete bug (not a guess) — fix it regardless of how the rest of this spec
  lands. Per-station columns is a reasonable-but-optional secondary improvement given the vague source request.
