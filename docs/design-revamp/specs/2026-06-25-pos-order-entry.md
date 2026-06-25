# POS Order Entry — Design Spec

> Track 2, feature #2b (second of the 3-way Order+KDS split). A tap-to-add order builder that consumes the modifier groups + stations from 2a, snapshots prices, and validates selections. KDS is 2c. Approved 2026-06-25.

## 1. Overview

Replace the crude "New order" row-form with a real POS builder: a split **menu grid + live ticket**. Tapping an item with modifier groups opens a selection step; the chosen options + the item's price are **snapshotted** onto the order so past orders and bills stay stable. The `/order` kanban remains for tracking; firing returns to it.

**Primary user / device:** waiter, tablet (split builder); phone collapses the ticket to a sheet.

## 2. Schema changes (one Prisma migration)

```prisma
// OrderItem — add:
  unitPrice  Decimal              @db.Decimal(10, 2) @default(0)   // snapshot of MenuItem.price at order time
  modifiers  OrderItemModifier[]

model OrderItemModifier {
  id              String    @id @default(uuid())
  orderItemId     String
  modifierOptionId String                                   // soft reference (no FK) — survives option deletion
  name            String                                    // snapshot
  priceDelta      Decimal   @db.Decimal(10, 2) @default(0)  // snapshot
  orderItem       OrderItem @relation(fields: [orderItemId], references: [id], onDelete: Cascade)
  @@map("order_item_modifiers")
}
```

Additive; `unitPrice` defaults 0 for existing rows (historical orders predate snapshots — acceptable). No FK on `modifierOptionId` so deleting a menu modifier option never corrupts a past order. (Migration: `node_modules/.bin/prisma` from repo root with `DATABASE_URL` inline; never `migrate reset`.)

## 3. Shared Zod / API

- `CreateOrderItemSchema` gains `modifierOptionIds: z.array(z.string().uuid()).default([])`.
- Read side: `OrderItemSchema` gains `unitPrice: z.number()` and `modifiers: z.array(OrderItemModifierSchema).default([])`; new `OrderItemModifierSchema = { id, orderItemId, modifierOptionId, name, priceDelta: number }`.
- `OrderService.create` (extend the existing method): for each incoming item —
  1. load the `MenuItem` (→ `unitPrice = price`); 404 if missing.
  2. load the item's attached groups + options (`menuItem.modifierGroups → modifierGroup → options`).
  3. **validate** `modifierOptionIds`: every id must belong to a group attached to that menu item; for each attached group — `required` ⟹ ≥1 of its options chosen; `single` ⟹ ≤1 of its options chosen (`multi` ⟹ any). Violation → `BadRequestException` with a clear message.
  4. create the `OrderItem` with `unitPrice` + nested `OrderItemModifier` rows snapshotting each chosen option's `name` + `priceDelta`.
- `findAll`/`findOne` include `modifiers` + return `unitPrice`. Extend the `OrderItemDto` swagger DTO (`unitPrice`, `modifiers: [OrderItemModifierDto]`) → regen Orval.

## 4. Bill / Checkout touch-point

The bill total must reflect modifiers. Update the bill computation (read the existing `apps/api/src/bill` service) so a line total = `(unitPrice + Σ modifier.priceDelta) × quantity`, using the **snapshotted** `OrderItem.unitPrice`/`modifiers` rather than re-reading live `MenuItem.price`. Subtotal = Σ line totals; tax/total as today. (If the current bill reads `menuItem.price` live, switch it to the order-item snapshot.)

## 5. Frontend — POS builder (`apps/web/src/routes/_app/order/index.tsx`)

- The kanban stays. **"New order"** opens a **full-screen builder** (a `Sheet`/overlay or an in-page mode) replacing the current inline `CreateOrderForm`.
- **Split layout:** left = a **table** `Select` + category-filtered **menu item grid** (tap an item to add); right = the **live ticket**.
- Tapping an item **with modifier groups** → a selection step (sheet/inline panel): each group rendered as radios (`single`) or checkboxes (`multi`), `required` groups must be satisfied before "Add". Computes the line's add-on total.
- **Ticket panel:** line rows (item name + chosen option names + qty stepper + line price + remove), an order-notes field, a running **total** (`Σ (unitPrice + Σ deltas) × qty`), and the single **"Fire order"** CTA → `useOrderControllerCreate` with items `[{ menuItemId, quantity, notes, modifierOptionIds }]` → on success invalidate + close → kanban.
- Warm-canvas + Plan-1 primitives (`PageHeader`, `Card`, `Button`, `Select`, `StatusBadge`); tablet-first split, ticket collapses to a bottom sheet on phone.

## 6. Deferred (out of scope for 2b)

- **Start-from-a-table** (Floor spatial-map integration) — the table is picked in the builder for now.
- **Editing items on an already-fired order**; per-seat assignment; voids/comps.
- **KDS** (station-routed display, kitchen bump) — feature 2c.
- Tax-rate configuration (bill keeps its current tax logic).

## 7. Testing

- **API (Jest):** `create` snapshots `unitPrice` + creates `OrderItemModifier` rows from `modifierOptionIds`; validation rejects (a) an option not attached to the item, (b) a missing `required` group, (c) >1 option in a `single` group; `findOne` returns `unitPrice` + `modifiers`; the bill line total includes modifier deltas.
- **Web:** build green; the builder adds an item, opens the modifier step for an item with groups, enforces required, shows the running total, and fires an order (screenshot the split builder + the modifier step).

## 8. Open assumptions

- `unitPrice` default 0 on pre-existing order items is acceptable (they predate POS snapshots); only newly-created orders carry real snapshots.
- Modifier `priceDelta` may be negative (discounts) — totals can go below base; not clamped.
- The builder picks a table from a dropdown (same as today); seating integration is deferred.
- An item with no modifier groups is added directly (no selection step).
