# Plan 19 — Tier 5: /kds Screen UX Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan
> task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
> Part of [Plan 13 — QA Backlog Roadmap](13-qa-backlog-roadmap.md), Tier 5.
> Design: [docs/superpowers/specs/2026-07-11-kds-screen-ux-design.md](../../superpowers/specs/2026-07-11-kds-screen-ux-design.md).

**Goal:** Fix a verified reliability gap — the undo window Plan 10's changelog claims exists but doesn't — then add
per-station columns as a secondary improvement.

**Tech Stack:** React 19, `sonner` toast (`import { toast } from 'sonner'`, already used in `order/-builder.tsx`).

---

### Task 1: Bump undo window (fixes a claimed-but-missing feature)

**Files:**
- Modify: `apps/web/src/routes/_app/kds/index.tsx` — `handleBump` (around lines 218-233).

**Why this shape:** `handleBump` currently has no record of the item's status *before* the bump, so undo needs to
capture that first. Per the design doc, this is a toast-with-action (`sonner` supports this natively via
`toast(message, { action: { label, onClick } })`), not a blocking confirm — bump stays a single tap.

- [ ] **Step 1:** In `handleBump`, capture the item's current status before mutating (from the ticket data already
  in scope — don't add a new fetch).
- [ ] **Step 2:** On successful bump, show `toast('Item marked ready', { action: { label: 'Undo', onClick: () =>
  ... } })` where the undo action re-fires `useOrderControllerUpdateItemStatus` with the captured prior status.
- [ ] **Step 3:** `pnpm --filter @restaurant/web typecheck` + a test: bump an item, confirm the toast+action render,
  confirm clicking Undo restores the prior status via the mutation.
- [ ] **Step 4:** Verify in-browser: bump an item, see the undo toast, click Undo, confirm the item returns to its
  prior column/state.
- [ ] **Step 5:** Commit: `fix(web): add missing undo window on KDS item bump`.

---

### Task 2: Per-station columns (secondary improvement)

**Files:**
- Modify: `apps/web/src/routes/_app/kds/index.tsx` — when `activeStation === 'all'`, render tickets grouped into
  parallel columns per station instead of one flat filtered grid; a specific station selection keeps today's
  single-list behavior (already correct for that case).

- [ ] **Step 1:** Group `visibleTickets`' items by station when in the "all" view; render as columns (reuse
  whatever column/grid layout primitive `/order`'s kanban already uses if it's a good fit, otherwise a simple flex
  layout consistent with this file's existing card-grid classes).
- [ ] **Step 2:** `pnpm --filter @restaurant/web typecheck` + a test confirming station columns render independently
  in "all" view.
- [ ] **Step 3:** Verify in-browser: with tickets across multiple stations, "all" view shows them in separate
  columns rather than one interleaved grid.
- [ ] **Step 4:** Commit: `feat(web): per-station columns on KDS "all" view`.

---

## Self-review notes

- **Spec coverage:** both design-doc items map to Tasks 1-2. Complete.
- **Priority:** Task 1 is a verified bug fix (do this even if Task 2 is deprioritized later).
