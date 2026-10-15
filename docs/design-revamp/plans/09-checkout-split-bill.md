# Checkout Split-Bill — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development or executing-plans. Checkbox (`- [ ]`) steps. **Execution model: Sonnet.** Backend (Tasks 1–3) is TDD (Jest); frontend (4) is visual, screenshot-verified.

**Goal:** Record partial/split payments against a bill (auto-mark-paid when covered) and add a client-side even/by-item split + printable receipt to Checkout.

**Architecture:** New `Payment` model (billId FK). `BillingService.recordPayment` creates a payment, recomputes `amountPaid`, and flips `paid`/`paidAt` when `amountPaid >= total`. `findOne` returns the bill enriched with `payments`/`amountPaid`/`remaining`. Splitting (even / by-item) is pure client-side math over the order's existing line items — only the resulting `Payment` rows persist. Receipt is a browser-print view.

**Tech Stack:** NestJS + Prisma · Jest (plain Prisma mocks) · `swagger-dtos` + Orval · React + Plan-1 primitives. pnpm.

## Global Constraints

- Spec: `docs/design-revamp/specs/2026-06-26-checkout-split-bill.md`. Methods: `cash | card | other`, record-only (no processor).
- Overpayment allowed; `remaining = max(0, total - amountPaid)`; `paid` flips at `amountPaid >= total`. Reject a payment on an already-paid bill (`ConflictException`, matches the existing `pay()` behavior).
- **Environment (Node 21):** husky hook breaks → commit `--no-verify`; `prisma migrate dev` / `pnpm gen:api` need Node 22+ (`PATH="$HOME/.nvm/versions/node/v24.11.1/bin:$PATH" …`). Migration additive; **never `migrate reset`**.
- Never hand-edit `apps/web/src/api/**`; regen via `pnpm gen:api`. Pre-existing `notifications.service.spec.ts` 8 fails — ignore.
- Keep the existing `pay()` / `PATCH /billing/:id/pay` endpoint as-is (manual full mark-paid) — do not remove it.
- Frontend: semantic tokens; one accent CTA; lucide; raw `<button>` needs `type=`.

---

## File Structure

| File | Responsibility | Action |
|------|----------------|--------|
| `prisma/schema.prisma` | `Payment` model + `Bill.payments` | Modify |
| `packages/shared/src/schemas/bill.ts` | `PaymentSchema`, `CreatePaymentSchema` | Modify |
| `apps/api/src/billing/billing.service.ts` | `recordPayment`, enrich `findOne` | Modify |
| `apps/api/src/billing/billing.service.spec.ts` | tests | Modify |
| `apps/api/src/billing/dto/billing.dto.ts` | `CreatePaymentDto` | Modify |
| `apps/api/src/swagger-dtos.ts` | `PaymentDto`, extend `BillDto` | Modify |
| `apps/api/src/billing/billing.controller.ts` | `POST /billing/:id/payments` | Modify |
| `apps/web/src/routes/_app/checkout/-split-panel.tsx` | split + pay + receipt UI | Create |
| `apps/web/src/routes/_app/checkout/index.tsx` | wire the panel into the bill detail | Modify |

---

## Task 1: Schema + shared Zod

- [x] **Step 1:** `prisma/schema.prisma` — add `Bill.payments Payment[]` and:

```prisma
model Payment {
  id        String   @id @default(uuid())
  billId    String
  amount    Decimal  @db.Decimal(10, 2)
  method    String
  createdAt DateTime @default(now())
  bill      Bill     @relation(fields: [billId], references: [id], onDelete: Cascade)
  @@map("payments")
}
```

- [x] **Step 2:** Migrate: `PATH="$HOME/.nvm/versions/node/v24.11.1/bin:$PATH" DATABASE_URL="..." node_modules/.bin/prisma migrate dev --name add_payments` from repo root (additive; **no reset** — stop & report if prompted).
- [x] **Step 3:** `packages/shared/src/schemas/bill.ts` — add:

```typescript
export const PaymentSchema = z.object({
  id: z.string().uuid(),
  billId: z.string().uuid(),
  amount: z.number().positive(),
  method: z.enum(['cash', 'card', 'other']),
  createdAt: z.coerce.date(),
});
export type Payment = z.infer<typeof PaymentSchema>;

export const CreatePaymentSchema = z.object({
  amount: z.number().positive(),
  method: z.enum(['cash', 'card', 'other']),
});
export type CreatePaymentDto = z.infer<typeof CreatePaymentSchema>;
```

- [x] **Step 4:** `pnpm --filter @restaurant/shared build` + `pnpm --filter @restaurant/api run build` → exit 0.
- [x] **Step 5: Commit** (`--no-verify`; `feat: payment model + shared payment schema`).

---

## Task 2: `recordPayment` + enriched `findOne` (TDD)

**Interfaces:** Produces `BillingService.recordPayment(id: string, dto: CreatePaymentDto)` and an enriched `findOne(id)` — both returning `{ ...bill, payments: Payment[], amountPaid: number, remaining: number }`.

- [x] **Step 1: Failing tests** — add to `billing.service.spec.ts` (extend `prismaMock.bill` with `findUnique` returning `payments` via `include`, and add `payment: { create: jest.fn() }`):

```typescript
describe('recordPayment', () => {
  const unpaidBill = {
    id: 'bill-1', orderId: 'order-1',
    subtotal: new Prisma.Decimal('20.00'), discountPct: new Prisma.Decimal('0'),
    tax: new Prisma.Decimal('2.00'), total: new Prisma.Decimal('22.00'),
    paid: false, paidAt: null, createdAt: new Date(), updatedAt: new Date(),
    payments: [],
  };

  it('records a partial payment and leaves the bill unpaid', async () => {
    prismaMock.bill.findUnique.mockResolvedValue(unpaidBill);
    prismaMock.payment.create.mockResolvedValue({ id: 'p1', billId: 'bill-1', amount: new Prisma.Decimal('10.00'), method: 'cash', createdAt: new Date() });

    const result = await service.recordPayment('bill-1', { amount: 10, method: 'cash' });

    expect(prismaMock.bill.update).not.toHaveBeenCalled();
    expect(result.amountPaid).toBe(10);
    expect(result.remaining).toBe(12);
    expect(result.paid).toBe(false);
  });

  it('marks the bill paid once payments cover the total', async () => {
    prismaMock.bill.findUnique.mockResolvedValue({ ...unpaidBill, payments: [{ amount: new Prisma.Decimal('12.00') }] });
    prismaMock.payment.create.mockResolvedValue({ id: 'p2', billId: 'bill-1', amount: new Prisma.Decimal('10.00'), method: 'card', createdAt: new Date() });
    prismaMock.bill.update.mockResolvedValue({ ...unpaidBill, paid: true, paidAt: new Date() });

    const result = await service.recordPayment('bill-1', { amount: 10, method: 'card' });

    expect(prismaMock.bill.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'bill-1' }, data: expect.objectContaining({ paid: true }) }),
    );
    expect(result.remaining).toBe(0);
  });

  it('throws ConflictException when the bill is already paid', async () => {
    prismaMock.bill.findUnique.mockResolvedValue({ ...unpaidBill, paid: true, paidAt: new Date() });

    await expect(service.recordPayment('bill-1', { amount: 5, method: 'cash' })).rejects.toThrow(ConflictException);
    expect(prismaMock.payment.create).not.toHaveBeenCalled();
  });
});
```

- [x] **Step 2: Run → fail** — `pnpm --filter @restaurant/api exec jest src/billing/billing.service.spec.ts`.

- [x] **Step 3: Implement** — replace `findOne` and add `recordPayment` in `billing.service.ts`:

```typescript
public async findOne(id: string): Promise<Bill & { payments: unknown[]; amountPaid: number; remaining: number }> {
  const bill = await this.prisma.bill.findUnique({ where: { id }, include: { payments: true } });

  if (!bill) throw new NotFoundException(`Bill ${id} not found`);

  const amountPaid = bill.payments.reduce((s, p) => s + Number(p.amount), 0);

  return { ...bill, amountPaid, remaining: Math.max(0, Number(bill.total) - amountPaid) };
}

public async recordPayment(id: string, dto: CreatePaymentDto) {
  const bill = await this.findOne(id);

  if (bill.paid) throw new ConflictException(`Bill ${id} is already paid`);

  const payment = await this.prisma.payment.create({
    data: { billId: id, amount: dto.amount, method: dto.method },
  });

  const amountPaid = bill.amountPaid + Number(payment.amount);
  const total = Number(bill.total);

  if (amountPaid >= total) {
    await this.prisma.bill.update({ where: { id }, data: { paid: true, paidAt: new Date() } });
  }

  return this.findOne(id);
}
```

Add `CreatePaymentDto` to the type-only import at the top of `billing.service.ts` (`import type { CreateBillDto, CreatePaymentDto } from './dto/billing.dto';`).

- [x] **Step 4: Run → pass.** **Step 5: Commit** (`--no-verify`; `feat(api): record payments + enrich bill with amountPaid/remaining`).

---

## Task 3: Endpoint + DTO + swagger + regen

- [x] **Step 1:** `apps/api/src/billing/dto/billing.dto.ts` — add `import { CreateBillSchema, CreatePaymentSchema } from '@restaurant/shared'; export class CreatePaymentDto extends createZodDto(CreatePaymentSchema) {}`.
- [x] **Step 2:** `apps/api/src/swagger-dtos.ts` — add `PaymentDto` (`id, billId, amount:number, method:string, createdAt:string`) and extend `BillDto` with `@ApiProperty({ type: [PaymentDto] }) payments!: PaymentDto[]`, `@ApiProperty() amountPaid!: number`, `@ApiProperty() remaining!: number`.
- [x] **Step 3:** `billing.controller.ts` — import `CreatePaymentDto`, `PaymentDto`; add:

```typescript
@Post(':id/payments')
@ApiBody({ type: CreatePaymentDto })
@ApiResponse({ status: 201, type: BillDto })
public recordPayment(@Param('id') id: string, @Body() dto: CreatePaymentDto) {
  return this.billing.recordPayment(id, dto);
}
```

- [x] **Step 4:** `pnpm --filter @restaurant/api run build` (exit 0); `pnpm gen:api` (Node 22+/pnpm 10). Confirm `apps/web/src/api/billing/billing.ts` exports `useBillingControllerRecordPayment`, and `BillDto` carries `payments/amountPaid/remaining`.
- [x] **Step 5: Commit** (`--no-verify`; `feat(api): POST /billing/:id/payments + regenerate hooks`).

---

## Task 4: Checkout split + pay panel + receipt

**Files:** Create `apps/web/src/routes/_app/checkout/-split-panel.tsx`; modify `checkout/index.tsx`.

- [x] **Step 1:** Read the current `checkout/index.tsx` bill-detail panel to find where the bill is displayed and its data hooks (`useBillingControllerFindOne` or similar + the order's items/modifiers).
- [x] **Step 2:** Create `-split-panel.tsx` exporting `SplitPanel({ bill, order })`:
  - Local state `mode: 'even' | 'byItem'`, `shareCount` (even), `assignments: Record<orderItemId, number>` (byItem, split index).
  - **Even:** a stepper for `N`; compute `N` shares of `bill.total` (round to cents, last share takes the remainder).
  - **By item:** list order items; a small `Select`/segmented control per item to assign it to split 1..N; each split's amount = Σ its items' `(unitPrice + Σ modifier.priceDelta) × qty`.
  - For each split: a method `Select` (cash/card/other) + **"Record payment"** `Button` → `useBillingControllerRecordPayment({ id: bill.id, data: { amount, method } })` → invalidate the bill query.
  - Progress line: `paid {bill.amountPaid} of {bill.total} · {bill.remaining} remaining`.
  - When `bill.remaining === 0`: show "Settled" + a **"Print receipt"** `Button` that renders a receipt block (restaurant name from settings if easily available, else static "RestoManager"; table; items + modifiers; subtotal/discountPct/tax/total; payments list with methods; `paidAt`) and calls `window.print()`. Add a print-only stylesheet rule (e.g. a `@media print { .no-print { display: none; } }` scoped class, or a simple `<style>` in the component) so only the receipt shows when printing.
- [x] **Step 3:** In `checkout/index.tsx`, render `<SplitPanel bill={...} order={...} />` in the bill-detail area (once a bill exists for the selected order), replacing/augmenting the existing pay action. Keep the existing "Settle" trigger that creates the bill.
- [x] **Step 4:** Verify `pnpm --filter @restaurant/web run build` (exit 0) + `pnpm --filter @restaurant/web run test` green. Lead verifies live: create a bill, split evenly into 2, record both payments, confirm it settles and the receipt prints; try by-item on another bill.
- [x] **Step 5: Commit** (`--no-verify`; `feat(web): checkout split payments + printable receipt`).

---

## Self-Review

**1. Spec coverage:** Payment model (§2)→T1; `recordPayment` + enriched `findOne` + reject-when-paid (§3)→T2/T3; even/by-item split + record payment + progress + receipt (§4)→T4; testing (§6)→T2 Jest + T4 build/screenshot. Deferrals (tips, processing, per-unit split, PDF)→honored. ✓

**2. Placeholder scan:** No TBD/TODO; backend complete code; T4 names the exact hook, computed fields, and UI states. ✓

**3. Type consistency:** `recordPayment`/`findOne` return shape (T2) matches `BillDto.{payments,amountPaid,remaining}` (T3); `CreatePaymentDto` flows T1→T3 controller→T4 mutation payload; `useBillingControllerRecordPayment` name used consistently.

**Pre-flight for executor:** the existing `pay()` endpoint stays untouched (manual override) — `recordPayment` is additive, not a replacement. Read `checkout/index.tsx`'s current bill hook name before wiring T4 (it may be `useBillingControllerFindOne` or a differently-named generated hook — use whatever gen:api actually produced in T3).
