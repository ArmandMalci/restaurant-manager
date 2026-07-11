# /order Screen UX — Design

**Date:** 2026-07-11
**Status:** Approved (scoped modestly — see rationale)
**Scope:** `/order` kanban + order builder. Tier 5 item from [Plan 13](../../design-revamp/plans/13-qa-backlog-roadmap.md).

---

## 1. Rationale for scope

Unlike the floor hand-off (a specific, named complaint), issues.md's `/order` entry is open-ended: "these screens
also need some changes on the UX. lets brainstorm to find a better solution" — no specific pain point named. Two of
the concrete issues in this screen are already covered elsewhere: the native table-picker `<select>`
(`-builder.tsx:253`) is fixed by [Plan 14](../../design-revamp/plans/14-tier3-systemic-ui.md) Task 5, and the mobile
ticket `Sheet` (`-builder.tsx:380-409`) becomes a URL-driven modal in Plan 14 Task 6. Rather than invent a speculative
full IA overhaul with no stated complaint to design against, this spec scopes to concrete, identifiable issues found
during research, plus small polish consistent with this app's existing conventions. If Armand has a specific
complaint about the kanban/builder flow beyond what's covered, that's a follow-up brainstorm, not a guess made here.

## 2. Concrete issues found (in scope)

- **`window.confirm('Delete order?')` at `order/index.tsx:103`** — every other destructive-confirm in this app
  (Inventory's stock delete, the order builder's own discard-confirm) already uses the themed `AlertDialog`
  component. This is the one remaining native-confirm holdout in this screen area — a drop-in consistency fix, not
  new infrastructure (both files already import `AlertDialog`).
- **Kanban column count on narrow viewports:** the 5-column (`draft/sent/in_progress/ready/served`) horizontal
  scroll-snap board is reasonable on tablet/desktop but on a phone-width viewport, scroll-snapping through 5 full-
  width columns to find one order is slow mid-service. Add a column-jump control (a small tab/pill strip mirroring
  the column names) so staff can jump directly to a column instead of scroll-snapping through all of them — additive,
  doesn't change the underlying board.

## 3. Explicitly out of scope

- A full IA redesign of the kanban-vs-list question, the modifier panel's placement, or the table-picker-first
  builder flow — none of these were named as broken, and Plan 14 already fixes the two concrete cross-cutting issues
  (select, sheet) that touch this screen. Revisit only if Armand names a specific complaint.

## 4. Testing

- A test confirming the delete confirmation renders as `AlertDialog` (not `window.confirm` — assert no `confirm`
  call, matching the existing pattern used for `-builder.tsx`'s own discard-confirm test if one exists).
- A test confirming the column-jump control scrolls the board to the correct column.

## Self-review

- No placeholders. Scope is intentionally narrow given the vague source request — documented above, not hidden.
