# Plan 20 — Tier 5: /calendar Month View Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan
> task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
> Part of [Plan 13 — QA Backlog Roadmap](13-qa-backlog-roadmap.md), Tier 5.
> Design: [docs/superpowers/specs/2026-07-11-calendar-month-view-design.md](../../superpowers/specs/2026-07-11-calendar-month-view-design.md).

**Goal:** Make Month the default view for the Reservations tab, with a day-detail modal for viewing a day's
reservations (month cells are too small for inline detail). Shifts tab is unchanged (out of scope per D4).

**Tech Stack:** `react-big-calendar` (already installed, supports `Views.MONTH` out of the box), the existing
`ListRow` component (reused from the reservations screen), a URL-driven modal (reuse Plan 14 Task 6's primitive if
landed by the time this executes; otherwise a plain `Dialog` — this doesn't have a hard dependency on Task 6 the
way Plan 17 Task 3 does, since it's a new modal usage, not a migration of an existing Sheet).

---

### Task 1: Default to Month view on the Reservations tab

**Files:**
- Modify: `apps/web/src/routes/_app/calendar/index.tsx` — default `view` prop for `react-big-calendar` becomes
  `Views.MONTH` when the active tab is Reservations; Shifts tab's existing default is untouched.

- [x] **Step 1:** Change the default view for the Reservations tab to Month; confirm the existing Week/Day/Agenda
  toggle still works (Month becomes the default, not the only option).
- [x] **Step 2:** `pnpm --filter @restaurant/web typecheck` + a test confirming Month is the initial view for
  Reservations. *(Also caught and fixed a real crash: switching tabs could desync `view` state from the active
  tab's `views` array, throwing inside react-big-calendar. Reproduced via a temporary revert to confirm the new
  regression test actually catches it, then fixed with React's render-time state-adjustment pattern.)*
- [x] **Step 3:** Commit: `feat(web): default Reservations calendar to Month view`. *(Commit `8bc534a`.)*

---

### Task 2: Day-detail modal

**Files:**
- Modify: `apps/web/src/routes/_app/calendar/index.tsx` — clicking a day cell in Month view opens a modal listing
  that day's reservations, using the existing `ListRow` pattern from `reservations/index.tsx` (import/reuse, don't
  reimplement the row layout).

- [x] **Step 1:** Wire the day-cell click handler to open the modal with that day's reservations (already-fetched
  data, filtered client-side by date — no new endpoint needed).
- [x] **Step 2:** Render the day's reservations using `ListRow`.
- [x] **Step 3:** `pnpm --filter @restaurant/web typecheck` + a test confirming clicking a day opens the modal with
  the correct reservations.
- [x] **Step 4:** Verify in-browser: Month view renders, clicking a day with reservations shows them in the modal,
  clicking an empty day shows an empty state (reuse `EmptyState`, already used elsewhere in this app).
- [x] **Step 5:** Commit: `feat(web): day-detail modal for calendar Month view`. *(Commit `3776d90`.)*

---

## Self-review notes

- **Spec coverage:** both design-doc items map to Tasks 1-2. Complete.
- **Scope boundary:** Shifts tab and shift scheduling are untouched, per D4.
