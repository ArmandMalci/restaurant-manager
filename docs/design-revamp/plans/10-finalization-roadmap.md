# Plan 10 — Finalization Roadmap: "Beat paper on one bulletproof shift loop"

> **Status:** spec / sequencing doc. Spawns per-tier execution plans (11+).
> **Created:** 2026-07-10. **Supersedes** ad-hoc fixes from [the product review](../review-2026-07-10/PRODUCT-REVIEW.md).

## Goal (from the 2026-07-10 direction interview)

A **specific real venue** — currently running on **paper/nothing** — could run a full service shift on this app.
Kitchen gets a **KDS screen; the cook taps "ready."** No payment processor (record cash/card-terminal payments manually).

**The bar is reliability, not features.** Paper has no features but never crashes and never loses a ticket. To beat it, the
app must: never drop a fired order, never freeze mid-rush, survive a wifi hiccup, and be usable on a held tablet.

### Definition of done
A full happy-path shift runs on a tablet with **zero dead-ends**, **survives a wifi drop without losing a fired order**,
and the owner can read the day's report. Back-office edge cases are explicitly out of scope for "done."

### Approach
**Severity-first burn-down of the [108 review findings](../review-2026-07-10/PRODUCT-REVIEW-appendix.md), structured in tiers**
so (a) the product decisions that unblock the criticals come first, and (b) offline/reliability — which is *not* in the
findings list — doesn't fall through. Tiers 0–4 are the pilot; Tier 5 is optional tail.

---

## Tier 0 — Decisions (no code; unblocks the criticals) — **ACCEPTED 2026-07-10**

These are the deferred product/domain calls the direction doc never resolved. All accepted as recommended.
Implementations land in Tier 2 (spine).

- [x] **D1 · Settlement model + terminal order status** *(accepted)* — Make settlement single-model. Add a terminal
  `paid` (or `closed`) value to the `OrderStatus` enum (Prisma migration). `pay()` is authoritative: it settles the full
  remaining balance and transitions the order to `paid`, which **removes it from the checkout queue**. `SplitPanel`
  either reconciles into that single settlement or is the only path (hide "Mark as Paid" when splitting). Fixes review
  🔴 "two contradictory settlement UIs" + 🟠 "paid orders never leave the queue." **Route through `restaurant-domain-judge` before implementing (money + state machine).**
- [x] **D2 · Order ↔ table behavior** *(accepted)* — One open order per table. Opening Order on an occupied table
  **loads that table's open order** into the builder (header: "Table 6 · open order"), not a blank "New order." Fixes 🔴
  "builder always starts blank."
- [x] **D3 · KDS bump ownership** — **DECIDED in interview: the cook taps "ready" on the KDS.** Implementation lands in Tier 2.
- [x] **D4 · Reservation lifecycle + Shift-scheduling scope** *(accepted)* — Add a real reservation `status`
  (`booked | seated | no_show | cancelled`) replacing the clock-math heuristic, plus seat/no-show actions on Door.
  **Cut in-app shift scheduling from the pilot** (a paper venue does not need it to run a shift) — this closes review 🔴
  "Shifts tab unbuilt" by *scoping it out*, not building it.

---

## Tier 1 — Systemic (highest leverage: one change clears many findings)

- [x] **T1.1 · Touch targets** — DONE ([Plan 11](11-tier1-systemic.md), commit `f4b0e85`). Reconciled with the dense
  aesthetic via a `@media (pointer: coarse)` rule on the shared primitives (44px on touch, desktop unchanged) rather than
  a global bump. Verified: coarse rule shipped, desktop input stays 32px. Note: raw ad-hoc `<button>` icon controls
  (not the `Button` primitive) are not covered — folded into their Tier 2/3 screen tasks.
- [x] **T1.2 · Floor color tokens** — DONE ([Plan 11](11-tier1-systemic.md), commit `7ae1749`). `STATUS_BG` now derives
  from `--success/--info/--warning`; zero legacy palette; recolors per theme (verified default/monokai/gruvbox).

---

## Tier 2 — Critical spine + money (the loop connects here)

- [ ] **T2.1 · Checkout settle → clear** — Implement D1: single settlement, `paid` status, settled tables leave the queue.
- [ ] **T2.2 · Order loads the table's ticket** — Implement D2: builder hydrates from the table's open order.
- [ ] **T2.3 · KDS cook-bump** — Per-item "ready" bump (D3); replace the board-wide `isBumping` flag with per-item pending
  state (fixes "one bump freezes the board"); add a short undo window on an accidental bump.
- [ ] **T2.4 · Menu category actions reachable** — Make category edit/delete always-visible (drop `group-hover`), ≥44px.
- [ ] **T2.5 · Worst responsive breaks** — Floor phone header overlap; Inventory phone table (scroll or card-collapse);
  Door row keeps the guest name on phone; Login card fills the panel instead of floating at top.

---

## Tier 3 — High severity, remaining (broad quality)

- [ ] **T3.1 · Order** — `onError` feedback on fire (no silent failure); confirm before the X discards a built ticket.
- [ ] **T3.2 · Service** — one consistent minute formatter for the attention queue; make the floor mini-grid tiles either
  tappable or visually non-interactive.
- [ ] **T3.3 · Reports** — wire the date-range into the query *or* remove the control; fix the 2 low-contrast status tiles.
- [ ] **T3.4 · Inventory** — replace native `window.confirm` with a themed confirm dialog.
- [ ] **T3.5 · Door** — seat / no-show / walk-in actions + reservation lifecycle (D4); guest lookup.
- [ ] **T3.6 · Calendar** — fix "N this week" (filter the query to the visible week, not all-time); overlapping-booking
  legibility + phone week-grid. (Interactivity/display-only resolves with the D4 shifts-scope decision.)
- [ ] **T3.7 · Settings** — actually use saved Restaurant Info (receipt/header currently hardcode a different name).
- [ ] **T3.8 · Floor** — single accent CTA; show reservation context on reserved tables; place newly-created tables on the map.
  **Also clear the pre-existing lint debt in `-floor-map.tsx`** (surfaced during Plan 11): clickable `Tile` `<div>` needs
  keyboard support / role (`noStaticElementInteractions`, `useKeyWithClickEvents`), and 2 non-null assertions (lines ~172, ~210).

---

## Tier 4 — Reliability (the paper-beating bar — NOT in the review findings)

- [ ] **T4.1 · Never lose a fired order** — Optimistic updates + mutation retry/queue on the order-fire and status-change
  paths, so a dropped/slow request does not silently drop a ticket.
- [ ] **T4.2 · No silent failures** — Global surface (toast/banner) on any mutation failure across the service screens.
- [ ] **T4.3 · Offline degradation** — Audit what the (already-hardened) PWA caches; ensure the order → KDS → settle path
  degrades gracefully on a wifi drop rather than erroring into a dead-end.

---

## Tier 5 — Medium/Low tail (optional; decide at this line)

- [ ] Back-office polish (medium/low findings on Reports, Settings, Calendar, Menu, Inventory). Revisit only after Tiers
  0–4 land and the venue's first run reveals what actually bites.

---

## Sequencing

Tier 0 (decisions) → Tier 1 (systemic, ships visible quality fast) → Tier 2 (spine) → Tier 3 (breadth) → Tier 4
(reliability) → Tier 5 (optional). Each tier becomes its own execution plan (`11-*.md`, `12-*.md`, …) built via the
standard subagent flow. **Reliability (Tier 4) can be pulled earlier if the venue's wifi is known-flaky.**
