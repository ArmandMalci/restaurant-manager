# Checkout Split-Bill — Design Spec

> Track 2 feature. Adds split payments (even / by-item) + payment records + a printable receipt on top of the existing single-bill checkout. Approved 2026-06-26.

## 1. Overview

Today a bill is created for an order (subtotal includes modifiers, per feature 2b) and has a single `paid` flag. This adds **partial payment records** so a table's bill can be **split** — evenly (N ways) or by assigning line items to splits — each split recorded as a payment with a method. The bill auto-completes when payments cover the total, then a **printable receipt** can be produced. Money is **record-only** (no processor), consistent with the original Checkout decision.

**Primary user / device:** waiter, tablet (settle at the table / pass).

## 2. Schema (one Prisma migration)

```prisma
// Bill — add:
  payments Payment[]

model Payment {
  id        String   @id @default(uuid())
  billId    String
  amount    Decimal  @db.Decimal(10, 2)
  method    String                       // 'cash' | 'card' | 'other'
  createdAt DateTime @default(now())
  bill      Bill     @relation(fields: [billId], references: [id], onDelete: Cascade)
  @@map("payments")
}
```

Additive. (Migration: Node 22+, `node_modules/.bin/prisma` from repo root with `DATABASE_URL`; never `migrate reset`.)

## 3. Shared Zod / API (billing module)

- `PaymentSchema = { id, billId, amount: z.number(), method: z.enum(['cash','card','other']), createdAt: z.coerce.date() }`. `CreatePaymentSchema = { amount: z.number().positive(), method: z.enum(['cash','card','other']) }`.
- **`POST /billing/:id/payments`** (JWT) — `BillingService.recordPayment(billId, dto)`: load the bill + its payments; create the `Payment`; compute `amountPaid = Σ payments` (incl. the new one); if `amountPaid ≥ total` and not already paid, set `paid = true, paidAt = now`. Return the bill with `payments`, `amountPaid`, `remaining = max(0, total − amountPaid)`. Reject (`ConflictException`) a payment on an already-fully-paid bill.
- **`GET /billing/:id`** — extend to include `payments` + computed `amountPaid` + `remaining`.
- New `PaymentDto`; extend `BillDto` with `payments: PaymentDto[]`, `amountPaid: number`, `remaining: number` (swagger → Orval regen). `BillingService.findOne` returns the same enriched shape.
- **Splits are client-side** (even = `total/N`; by-item = sum of assigned line items) — only `Payment` rows persist; no split entity.

## 4. Frontend — Checkout (`apps/web/src/routes/_app/checkout/index.tsx`)

The settle/detail panel (after a bill exists) gains a **split + pay** flow:
- **Split mode toggle:** **Even** (a number stepper N → N equal shares of `total`, last share absorbs rounding) or **By item** (list the order's line items; assign each whole line to a split bucket 1..N; each split amount = Σ its items' `(unitPrice + Σ modifier delta) × qty`).
- **Record payments:** for each split, a "Record payment" control with a **method** select (cash / card / other) → `POST /billing/:id/payments` → refetch bill. A **progress** readout: `paid {amountPaid} of {total} · {remaining} remaining`. Splits already covered show paid.
- When `remaining === 0` the bill shows **settled**; a **"Print receipt"** button renders a print-friendly receipt (restaurant name, table, line items + modifiers, subtotal/discount/tax/total, the payments + methods, settled timestamp) and calls `window.print()` (a print-only stylesheet hides the app chrome).
- Warm-canvas + Plan-1 primitives; one accent CTA in the panel (the active "Record payment" / "Print receipt").

## 5. Deferred (out of scope)

Per-unit splitting of a multi-qty line; tips / gratuity / service charge; real payment processing (Stripe/terminal); emailed or PDF receipts; refunds / voiding a recorded payment; partial-item transfers between splits.

## 6. Testing

- **API (Jest):** `recordPayment` creates a payment and returns `amountPaid`/`remaining`; a partial payment leaves the bill unpaid; payments that reach the total flip `paid = true` + set `paidAt`; a payment on an already-paid bill throws; `findOne` returns `payments` + `remaining`.
- **Web:** build green; the panel splits even + by-item, records a payment (shows progress), settles when covered, and "Print receipt" renders the receipt; screenshot the split panel + receipt.

## 7. Open assumptions

- Overpayment is allowed (e.g. cash tendered > remaining is recorded at the entered amount; change handling is out of scope) — `remaining` floors at 0; `paid` flips at `≥ total`.
- By-item assignment is by whole line item (a 2× line goes entirely to one split); per-unit splitting deferred.
- Even-split rounding: shares round to cents; the last share takes the remainder so payments sum exactly to `total`.
- Receipt is browser-print only (a print stylesheet) — no server-side rendering or storage.
