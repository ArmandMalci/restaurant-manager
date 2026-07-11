# Plan 18 — Tier 5: /order Screen UX Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan
> task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
> Part of [Plan 13 — QA Backlog Roadmap](13-qa-backlog-roadmap.md), Tier 5.
> Design: [docs/superpowers/specs/2026-07-11-order-screen-ux-design.md](../../superpowers/specs/2026-07-11-order-screen-ux-design.md).

**Goal:** Fix the one concrete gap found in `/order` (native `window.confirm`) and add a column-jump control for
narrow viewports. Deliberately narrow scope — see the design doc's rationale for why a full IA redesign isn't in
this plan.

**Tech Stack:** React 19, existing `AlertDialog` primitive (already used elsewhere in this same screen area).

---

### Task 1: Replace `window.confirm` with `AlertDialog`

**Files:**
- Modify: `apps/web/src/routes/_app/order/index.tsx:103` — `if (!window.confirm('Delete order?')) return;` replaced
  with the same `AlertDialog` pattern already used in `-builder.tsx:412-413` (open/close state + `AlertDialogAction`
  triggering the actual delete).

- [ ] **Step 1:** Add `AlertDialog` state (open/target-order) to `index.tsx`, matching `-builder.tsx`'s existing
  discard-confirm pattern.
- [ ] **Step 2:** Replace the `window.confirm` call and wire the delete action through the dialog's
  `AlertDialogAction`.
- [ ] **Step 3:** `pnpm --filter @restaurant/web typecheck` + a test confirming no `window.confirm` call remains and
  the dialog renders/fires correctly.
- [ ] **Step 4:** Verify in-browser: deleting an order shows the themed dialog, not a native browser confirm.
- [ ] **Step 5:** Commit: `fix(web): replace window.confirm with AlertDialog on order delete`.

---

### Task 2: Column-jump control for narrow viewports

**Files:**
- Modify: `apps/web/src/routes/_app/order/index.tsx` — add a small pill/tab strip (mirroring the 5 column names:
  draft/sent/in_progress/ready/served) above the scroll-snap board; tapping one scrolls the board to that column
  (`scrollIntoView` or the board's existing scroll-snap mechanism, whichever this file already uses for its own
  snap behavior).

- [ ] **Step 1:** Add the column-jump strip, visible only below the desktop breakpoint (the horizontal scroll-snap
  board is already fine on wider viewports).
- [ ] **Step 2:** Wire each pill to scroll the board to its column.
- [ ] **Step 3:** `pnpm --filter @restaurant/web typecheck` + a test confirming the jump control scrolls to the
  correct column.
- [ ] **Step 4:** Verify in-browser at 390px width: tapping a pill jumps directly to that column.
- [ ] **Step 5:** Commit: `feat(web): column-jump control on narrow /order viewports`.

---

## Self-review notes

- **Spec coverage:** both design-doc items map to Tasks 1-2. Complete.
- **Scope boundary:** no other change to the kanban/builder flow — see design doc §3 for what's deliberately
  excluded and why.
