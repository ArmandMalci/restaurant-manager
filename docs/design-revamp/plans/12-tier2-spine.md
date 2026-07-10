# Plan 12 — Tier 2 Spine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development. Part of [Plan 10](10-finalization-roadmap.md), Tier 2. **Domain-reviewed** by `restaurant-domain-judge` (verdict: both changes `sound-with-conditions`); the MUST-FIXes below are its conditions.

**Goal:** Connect and correct the service spine — one settlement path that clears the queue, the ability to add a second round to an open table order, and a KDS bump that doesn't freeze the board.

**Architecture:** Money settlement is unified on `recordPayment` (Payment rows reconcile the total); the dead `pay()` path is removed. "Settled" is **derived from `bill.paid`** (no new `OrderStatus` enum value — see §Decision). Adding items to an open order gets a new guarded endpoint that fires the new items and re-derives readiness.

## Global Constraints
- Money is `Prisma.Decimal`, never JS float. Price snapshots (`unitPrice`) are immutable once written.
- Every NestJS endpoint/DTO carries complete Swagger decorators; regenerate Orval + `biome check --write src/api` after any contract change.
- Do not modify Orval-generated files by hand.

---

## DECISION NEEDED — settlement mechanism (D1)

You signed off on "add a terminal `paid` OrderStatus." The domain-judge recommends **against** the enum and **for deriving settled-ness from `bill.paid`**, because adding `paid` to the enum makes `PATCH /orders/:id/status` able to (a) mark an order paid with no bill/payment, and (b) regress a paid order back into the queue — a manual-transition attack surface that then needs its own guard. Deriving from `bill.paid` gives the **same outcome** (settled orders leave the checkout queue, single settlement, no double-pay — the existing `bill.paid` guards already prevent double-settlement) with **no migration and no new attack surface**.

- **Recommended: derive from `bill.paid`.** `findAll` includes the bill; checkout filters `!order.bill?.paid`. No enum change.
- **Alternative: keep the `paid` enum** (as originally signed off) — then MUST add a guard in `updateStatus` rejecting transitions into/out of `paid`.

Proceeding on **derive** unless overruled.

---

## Task A — Settlement: one path, derived queue exit (D1, backend)
**Files:** `apps/api/src/billing/billing.service.ts`, `billing.controller.ts`, `billing.service.spec.ts`, `apps/api/src/order/order.service.ts` (findAll include)
- [ ] **Delete `pay()`** (service + `PATCH /billing/:id/pay` controller + its spec) — it flips `bill.paid` with **no Payment row**, so the receipt would reconcile `Σpayments=$0 ≠ total`. Pay-in-full becomes `recordPayment({amount: remaining})`.
- [ ] **`recordPayment` atomic + Decimal:** wrap the `payment.create` + `bill.update` in `prisma.$transaction`; sum existing payments in `Prisma.Decimal` (not `Number`) so the paid-flip can't undershoot on a float.
- [ ] **`findAll` includes `bill`** so the checkout queue can filter on `bill.paid`; add `bill` to the order response DTO (Swagger) → regen Orval.

## Task B — Add items to an open order (D2, backend)
**Files:** new `POST /orders/:id/items` in `order.controller.ts` + `order.service.ts` (+ DTO, Swagger) → regen Orval
- [ ] Factor `create()`'s item-build + modifier-validation into a shared helper; the append path **reuses** it (modifier validity `[E]`).
- [ ] **Guard — reject append if `order.bill` exists or order is settled** (bill total is a one-time snapshot; appending would under-bill the guest).
- [ ] **Fire the appended items if the order is past `draft`** (set `firedAt`, send the kitchen notification) — else new items never reach the pass (`sentAt` is write-once, so the normal fire path won't cover them).
- [ ] **Demote `ready`/`served` → `in_progress`** on append (else `promoteIfAllItemsReady` early-returns and the order stays falsely "ready" while holding un-made food — Order.ready must stay derived).
- [ ] Snapshot `unitPrice` from the live menu price at append time.

## Task C — Checkout single settlement UI (D1, frontend)
**Files:** `checkout/index.tsx`, `-split-panel.tsx`, `-receipt-block.tsx`
- [ ] Remove the `BillResult` "Mark as Paid" button (make it a read-only summary); `SplitPanel` becomes the single settlement surface with a **"Pay in full" preset** = `recordPayment({amount: remaining})`.
- [ ] Filter `billableOrders` by `!order.bill?.paid`; invalidate `OrderControllerGetAll` from the payment success handler so a settled check leaves the queue immediately.

## Task D — Order builder loads the table's open order (D2, frontend)
**Files:** `order/index.tsx`, `-builder.tsx`, `-ticket-panel.tsx`
- [ ] In the builder, derive the selected table's existing open order from the orders list. If present and **unbilled**: header "Table N · open order", show already-fired items (read-only), and "Add to order" appends via the new endpoint. If it already has a bill: block adding ("check already rung up"). If none: create as today.

## Task E — KDS per-item bump (D3, frontend)
**Files:** `kds/index.tsx`
- [ ] Replace page-wide `isBumping={updateItemStatus.isPending}` with a local in-flight `Set<`${orderId}:${itemId}`>` — only the tapped item disables; the rest of the board stays live. Optional short undo window.

## Task F — Menu category actions reachable (T2.4, frontend)
**Files:** `menu/index.tsx`
- [ ] Category edit/delete controls always-visible (drop `group-hover`), ≥44px.

## Task G — Worst responsive breaks (T2.5, frontend)
**Files:** `floor/index.tsx`, `inventory/index.tsx`, `door/index.tsx` (+ `list-row.tsx`), `_auth/login.tsx`
- [ ] Floor phone header no longer overlaps the title; Inventory phone table scrolls or card-collapses; Door row keeps the guest name on phone; Login card fills the panel instead of floating at top.

---
_Pre-existing tangential debt flagged by the judge (not caused here, do NOT fix in this plan): `billing.service.ts:47` subtotal falls back to live menu price when snapshot is 0; 86/available check missing on both create + append (recommended, not blocking)._
