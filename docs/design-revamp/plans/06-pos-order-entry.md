# POS Order Entry — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development or executing-plans. Checkbox (`- [ ]`) steps. **Execution model: Sonnet.** Backend (Tasks 1–4) is TDD (Jest); frontend (5) is visual, screenshot-verified.

**Goal:** A tap-to-add POS builder that snapshots each order item's `unitPrice` + chosen modifier options, validates selections server-side, and makes the bill total reflect modifier price deltas.

**Architecture:** New `OrderItem.unitPrice` + `OrderItemModifier` snapshot rows. `OrderService.create` loads each menu item (price → `unitPrice`) + its attached modifier groups/options to validate the chosen `modifierOptionIds` and snapshot `name`/`priceDelta`. `BillingService` switches its subtotal from live `menuItem.price` to the snapshot (`unitPrice` + Σ deltas). The `/order` kanban stays; "New order" opens a split menu-grid + live-ticket builder.

**Tech Stack:** NestJS + Prisma 7 · Jest (`Test.createTestingModule`, plain Prisma mocks) · `@restaurant/shared` Zod · `swagger-dtos` + Orval (`pnpm gen:api`) · React + Plan-1 primitives. pnpm.

## Global Constraints

- Spec: `docs/design-revamp/specs/2026-06-25-pos-order-entry.md`. Order statuses `draft→sent→in_progress→ready→served`; item modifier groups carry `selectionType ('single'|'multi')` + `required`.
- **Snapshots are authoritative** — bills/tickets use `OrderItem.unitPrice` + `OrderItemModifier.priceDelta`, never live `MenuItem.price` (fallback to `menuItem.price` only when `unitPrice` is 0, for pre-migration orders).
- Migration: `node_modules/.bin/prisma` from repo root with `DATABASE_URL` inline; **never `migrate reset`**. Additive only.
- Rebuild shared (`pnpm --filter @restaurant/shared build`) before API tests. Never hand-edit `apps/web/src/api/**` — regen via `pnpm gen:api`.
- Pre-existing `notifications.service.spec.ts` 8 failures (web-push mock) — ignore.
- Frontend: semantic tokens; one accent CTA; lucide; raw `<button>` needs `type=`.

---

## File Structure

| File | Responsibility | Action |
|------|----------------|--------|
| `prisma/schema.prisma` | `OrderItem.unitPrice` + `OrderItemModifier` model | Modify |
| `packages/shared/src/schemas/order.ts` | unitPrice + modifiers (read) + modifierOptionIds (create) | Modify |
| `apps/api/src/order/order.service.ts` | create: snapshot + validate; `WITH_ITEMS` includes modifiers | Modify |
| `apps/api/src/order/order.service.spec.ts` | create snapshot/validation tests | Modify |
| `apps/api/src/billing/billing.service.ts` | subtotal from snapshot + deltas | Modify |
| `apps/api/src/billing/billing.service.spec.ts` | bill-with-modifiers test | Modify (create if absent) |
| `apps/api/src/swagger-dtos.ts` | `OrderItemModifierDto`; extend `OrderItemDto` | Modify |
| `apps/web/src/routes/_app/order/index.tsx` | POS split builder | Modify |

---

## Task 1: Schema + shared Zod

- [ ] **Step 1:** In `prisma/schema.prisma`, add to `OrderItem`: `unitPrice Decimal @db.Decimal(10, 2) @default(0)` and `modifiers OrderItemModifier[]`; add the model:

```prisma
model OrderItemModifier {
  id               String    @id @default(uuid())
  orderItemId      String
  modifierOptionId String
  name             String
  priceDelta       Decimal   @db.Decimal(10, 2) @default(0)
  orderItem        OrderItem @relation(fields: [orderItemId], references: [id], onDelete: Cascade)
  @@map("order_item_modifiers")
}
```

- [ ] **Step 2:** Migrate — `DATABASE_URL="..." node_modules/.bin/prisma migrate dev --name add_order_item_modifiers` from repo root (additive; **no reset** — stop & report if prompted).

- [ ] **Step 3:** In `packages/shared/src/schemas/order.ts` add + extend:

```typescript
export const OrderItemModifierSchema = z.object({
  id: z.string().uuid(),
  orderItemId: z.string().uuid(),
  modifierOptionId: z.string().uuid(),
  name: z.string(),
  priceDelta: z.number(),
});
export type OrderItemModifier = z.infer<typeof OrderItemModifierSchema>;
```

Add to `OrderItemSchema`: `unitPrice: z.number().default(0)` and `modifiers: z.array(OrderItemModifierSchema).default([])`. Add to `CreateOrderItemSchema`: `modifierOptionIds: z.array(z.string().uuid()).default([])`.

- [ ] **Step 4:** `pnpm --filter @restaurant/shared build` then `pnpm --filter @restaurant/api run build` → both exit 0.

- [ ] **Step 5:** Commit (`git add prisma/schema.prisma prisma/migrations packages/shared/src/schemas/order.ts`; `feat: order item price + modifier snapshot schema`).

---

## Task 2: Order create — snapshot + validation (TDD)

**Interfaces:** Produces `OrderService.create` snapshotting `unitPrice` + creating `OrderItemModifier` rows, validating `modifierOptionIds` against the item's attached groups; `WITH_ITEMS` now includes `modifiers`.

- [ ] **Step 1: Failing tests** — add to `order.service.spec.ts` (extend `prismaMock` with `menuItem: { findMany: jest.fn() }`):

```typescript
describe('create with modifiers', () => {
  const steak = {
    id: 'mi-1', name: 'Steak', price: 20,
    modifierGroups: [{ modifierGroup: { id: 'g1', name: 'Temp', selectionType: 'single', required: true,
      options: [{ id: 'o1', name: 'Rare', priceDelta: 0 }, { id: 'o2', name: 'Well', priceDelta: 0 }] } }],
  };

  it('snapshots unitPrice + modifier rows', async () => {
    prismaMock.menuItem.findMany.mockResolvedValue([steak]);
    prismaMock.order.create.mockResolvedValue({ ...mockOrder });
    prismaMock.table.findUnique.mockResolvedValue({ id: 'tbl-1', number: 5 });

    await service.create({ tableId: 'tbl-1', notes: null, items: [{ menuItemId: 'mi-1', quantity: 1, modifierOptionIds: ['o1'] }] }, 'staff-1');

    const arg = prismaMock.order.create.mock.calls[0][0];
    const item = arg.data.items.create[0];
    expect(item.unitPrice).toBe(20);
    expect(item.modifiers.create).toEqual([{ modifierOptionId: 'o1', name: 'Rare', priceDelta: 0 }]);
  });

  it('rejects an option not attached to the item', async () => {
    prismaMock.menuItem.findMany.mockResolvedValue([steak]);
    await expect(
      service.create({ tableId: 'tbl-1', notes: null, items: [{ menuItemId: 'mi-1', quantity: 1, modifierOptionIds: ['bogus'] }] }, 'staff-1'),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects when a required group has no selection', async () => {
    prismaMock.menuItem.findMany.mockResolvedValue([steak]);
    await expect(
      service.create({ tableId: 'tbl-1', notes: null, items: [{ menuItemId: 'mi-1', quantity: 1, modifierOptionIds: [] }] }, 'staff-1'),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects >1 option in a single group', async () => {
    prismaMock.menuItem.findMany.mockResolvedValue([steak]);
    await expect(
      service.create({ tableId: 'tbl-1', notes: null, items: [{ menuItemId: 'mi-1', quantity: 1, modifierOptionIds: ['o1', 'o2'] }] }, 'staff-1'),
    ).rejects.toThrow(BadRequestException);
  });
});
```

(Import `BadRequestException` from `@nestjs/common` in the spec.)

- [ ] **Step 2: Run → fail.**

- [ ] **Step 3: Implement** — in `order.service.ts`: import `BadRequestException`; change `WITH_ITEMS` to `{ items: { orderBy: { id: 'asc' as const }, include: { modifiers: true } } }`; replace `create`:

```typescript
public async create(dto: CreateOrderDto, staffId: string) {
  const menuItemIds = [...new Set(dto.items.map((i) => i.menuItemId))];
  const menuItems = await this.prisma.menuItem.findMany({
    where: { id: { in: menuItemIds } },
    include: { modifierGroups: { include: { modifierGroup: { include: { options: true } } } } },
  });
  const byId = new Map(menuItems.map((m) => [m.id, m]));

  const itemsCreate = dto.items.map((i) => {
    const mi = byId.get(i.menuItemId);
    if (!mi) throw new BadRequestException(`Menu item ${i.menuItemId} not found`);

    const groups = mi.modifierGroups.map((mg) => mg.modifierGroup);
    const optionById = new Map(groups.flatMap((g) => g.options).map((o) => [o.id, o]));
    const chosen = i.modifierOptionIds ?? [];

    for (const oid of chosen) {
      if (!optionById.has(oid)) throw new BadRequestException(`Option ${oid} is not valid for ${mi.name}`);
    }
    for (const g of groups) {
      const inGroup = g.options.filter((o) => chosen.includes(o.id));
      if (g.required && inGroup.length === 0) throw new BadRequestException(`"${g.name}" is required for ${mi.name}`);
      if (g.selectionType === 'single' && inGroup.length > 1) throw new BadRequestException(`Choose one for "${g.name}"`);
    }

    return {
      menuItemId: i.menuItemId,
      quantity: i.quantity,
      notes: i.notes ?? null,
      unitPrice: mi.price,
      modifiers: {
        create: chosen.map((oid) => {
          const o = optionById.get(oid);
          return { modifierOptionId: oid, name: o.name, priceDelta: o.priceDelta };
        }),
      },
    };
  });

  const order = await this.prisma.order.create({
    data: { tableId: dto.tableId, staffId, notes: dto.notes ?? null, items: { create: itemsCreate } },
    include: WITH_ITEMS,
  });
  const table = await this.prisma.table.findUnique({ where: { id: dto.tableId } });

  await this.notifications.sendToRole('kitchen', {
    title: 'New Order',
    body: `New order received for Table ${table?.number ?? '?'}`,
  });

  return order;
}
```

- [ ] **Step 4: Run → pass** (the existing create test may need `prismaMock.menuItem.findMany.mockResolvedValue([])` + sending items with a known menuItem; adjust that test's mock so `byId` resolves — set `menuItem.findMany` to return a matching `{ id, price, modifierGroups: [] }`). **Step 5: Commit** (`feat(api): order create snapshots price + validates modifiers`).

---

## Task 3: Bill total includes modifiers (TDD)

- [ ] **Step 1: Failing test** — in `billing.service.spec.ts` (create with the standard mock-Prisma module if absent), an order with one item `{ quantity: 2, unitPrice: 20, menuItem: { price: 20 }, modifiers: [{ priceDelta: 3 }] }` → subtotal `(20+3)*2 = 46`:

```typescript
it('subtotal includes modifier deltas using snapshot unitPrice', async () => {
  prismaMock.order.findUnique.mockResolvedValue({
    id: 'o1', status: 'served', bill: null,
    items: [{ quantity: 2, unitPrice: 20, menuItem: { price: 99 }, modifiers: [{ priceDelta: 3 }] }],
  });
  prismaMock.bill.create.mockImplementation(({ data }) => Promise.resolve(data));
  const bill = await service.create({ orderId: 'o1', discountPct: 0 });
  expect(Number(bill.subtotal)).toBe(46);
});
```

(Note `menuItem.price` is 99 to prove the snapshot `unitPrice: 20` is used, not the live price.)

- [ ] **Step 2: Run → fail.**

- [ ] **Step 3: Implement** — in `billing.service.ts` change the order `include` to `items: { include: { menuItem: true, modifiers: true } }` and replace the subtotal reduce:

```typescript
const subtotal = order.items.reduce((sum, item) => {
  const base = Number(item.unitPrice) > 0 ? new Prisma.Decimal(item.unitPrice) : new Prisma.Decimal(item.menuItem.price);
  const delta = item.modifiers.reduce((d, m) => d.plus(new Prisma.Decimal(m.priceDelta)), new Prisma.Decimal(0));
  return sum.plus(new Prisma.Decimal(item.quantity).times(base.plus(delta)));
}, new Prisma.Decimal(0));
```

- [ ] **Step 4: Run → pass.** **Step 5: Commit** (`feat(api): bill total includes order-item modifiers + price snapshot`).

---

## Task 4: Swagger DTOs + Orval regen

- [ ] **Step 1:** In `swagger-dtos.ts` add `OrderItemModifierDto` (`id, orderItemId, modifierOptionId, name, priceDelta:number`) and extend `OrderItemDto` with `@ApiProperty() unitPrice!: number` + `@ApiProperty({ type: [OrderItemModifierDto] }) modifiers!: OrderItemModifierDto[]`.
- [ ] **Step 2:** `pnpm --filter @restaurant/api run build` (exit 0), then `pnpm gen:api`. Confirm `apps/web/src/api` order types now carry `unitPrice` + `modifiers`, and `CreateOrderItem` accepts `modifierOptionIds`.
- [ ] **Step 3: Commit** (`git add apps/api/src/swagger-dtos.ts apps/web/src/api apps/web/openapi.json`; `--no-verify` for generated files; `feat(api): order item modifier DTOs + regenerate hooks`).

---

## Task 5: POS split builder (web)

**Files:** Modify `apps/web/src/routes/_app/order/index.tsx`.

- [ ] **Step 1:** Replace the inline `CreateOrderForm` with a full-screen builder opened by "New order" (a `Sheet`/overlay or an in-page mode toggled by `showCreate`). Read the current file first; keep the kanban + `useOrderControllerCreate`/`invalidateOrderControllerGetAll` patterns.
  - **Left:** a table `Select` (from `useTableControllerGetAll`) + a category-filtered **menu grid** (`useMenuControllerGetItems` + `useMenuControllerGetCategories`); tap a card to add.
  - **Modifier step:** when a tapped item's `modifierGroupIds` is non-empty, open a selection panel built from `useMenuControllerGetModifierGroups` (filter to the item's groups) — `single` → radios, `multi` → checkboxes, `required` must be satisfied before "Add". Compute the line's add-on total from the chosen options' `priceDelta`.
  - **Right (ticket):** line rows — item name + chosen option names + qty stepper + line price (`(price + Σ deltas) × qty`) + remove; an order-notes `Input`; a running **total**; one **"Fire order"** `Button` → `useOrderControllerCreate` with `items: [{ menuItemId, quantity, notes, modifierOptionIds }]` → on success invalidate + close → kanban.
  - Warm-canvas + Plan-1 primitives; tablet-first split (grid + ticket side by side), ticket → bottom sheet under `md`.

- [ ] **Step 2:** `pnpm --filter @restaurant/web run build` (exit 0) + `pnpm --filter @restaurant/web run test` green.

- [ ] **Step 3:** Verify with the `run-web` skill (the API must be running with the new endpoints — restart it if `/order` create 400s): open "New order", add a plain item, add an item with a required modifier group (confirm it blocks until chosen), watch the running total, fire the order → it appears on the kanban. Screenshot the split builder + the modifier step.

- [ ] **Step 4: Commit** (`feat(web): POS split order builder with modifiers`).

---

## Self-Review

**1. Spec coverage:** OrderItem.unitPrice + OrderItemModifier (§2)→T1; create snapshot + validation (§3)→T2; bill total includes deltas (§4)→T3; DTOs/regen→T4; split POS builder + modifier step + running total (§5)→T5. Deferrals (table-start, fired-order edits, KDS) honored. ✓

**2. Placeholder scan:** No TBD/TODO; backend tasks carry complete code; T5 is a concrete builder brief with named hooks + payload shape, verified by build + screenshot. ✓

**3. Type consistency:** `modifierOptionIds` (create) flows shared (T1) → `OrderService.create` (T2) → controller passthrough (existing) → builder payload (T5). `unitPrice`/`modifiers` (read) added in T1, populated in T2, consumed by billing (T3) + DTOs (T4) + ticket display (T5). `OrderItemModifier` snapshot fields (`name`,`priceDelta`,`modifierOptionId`) consistent across schema/service/DTO.

**Pre-flight for executor:** the existing `create` test in `order.service.spec.ts` must get a `menuItem.findMany` mock returning the items it orders (with `modifierGroups: []`) or it will throw "not found" after T2 — fix that test alongside. Confirm the `modifierGroups.modifierGroup.options` include path matches the 2a relation names.
