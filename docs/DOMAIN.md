# Domain — Restaurant Manager

The **business logic** of this system: what the entities mean, how their state moves, and the
invariants that must hold for the restaurant to trust the software. This is the source of truth for
*reasoning about correctness* (distinct from the root `PRODUCT.md` (product) and `DESIGN.md` (design system)). When a change
touches money, an order/bill/table lifecycle, or the kitchen flow, reason against this file.

## What this is

A single-restaurant operations PWA: front-of-house seats guests and takes orders, the kitchen cooks
them, the bill is settled. Staff roles (`manager`, `waiter`, `kitchen`, `host`) map to who does what.
**Money is record-only** — there is no payment processor; the system records what happened.

## Core entities

`Table` (floor position, seats, status) · `MenuItem` (price, kitchen `station`, `available`) with
`ModifierGroup`/`ModifierOption` (e.g. "no onions", "medium-rare", +£2 extra cheese) · `Order` →
`OrderItem` → `OrderItemModifier` (a guest's food, line by line) · `Bill` (the money owed for an
order) · `Reservation` · `Shift` (staff clock-in) · `InventoryItem`/`InventoryUsage` (stock + recipes).

## State machines (where most judgment lives)

- **Order:** `draft → sent → in_progress → ready → served`. `sent` fires the food to the kitchen;
  `ready`/`served` are about delivery. Timestamps `sentAt`/`readyAt`/`servedAt` are stamped once.
- **OrderItem:** `pending → in_progress → ready`. The kitchen works items, not whole orders.
- **Order.ready is *derived*, not set by hand** — when every `OrderItem` is `ready`, the order
  auto-promotes to `ready` (`order.service.ts promoteIfAllItemsReady`). An empty order never promotes.
- **Table:** `available → occupied → reserved`. **Currently set manually** (not derived from orders).
- **Bill:** `unpaid → paid`. Created once per order; `paid` flips when settled.

## Invariants

**[E] = enforced in code today. [L] = latent — NOT enforced; a change here must add the guard, and a
"correct-looking" change can silently violate the business rule.**

Money (the sacred ones):
- **[E] Price snapshots.** `OrderItem.unitPrice` and `OrderItemModifier.priceDelta` are *copied from
  the menu at order-create time* (`order.service.ts`), and every money computation reads the snapshot,
  not the live `MenuItem.price` (`billing.service.ts` subtotal). **Reason:** a bill, a report, or a
  historical order must reflect the price the guest was charged — changing a menu price later must
  never rewrite history. *Anything that computes money reads the snapshot.*
- **[E] Bill formula.** `subtotal = Σ qty × (unitPrice + Σ modifier priceDelta)`;
  `total = subtotal × (1 − discountPct/100) + tax`; `tax = 10% of the after-discount amount`. All in
  `Prisma.Decimal` — **never JS floats for money.**
- **[E] One bill per order** (`Bill.orderId @unique`); **[E] a bill can't be paid twice.**
- **[E] Billable only when the order is `in_progress`/`ready`/`served`** — you don't bill food that
  isn't being made yet (`draft`/`sent`).
- **[L] Tax rate is hardcoded 10%** — not read from `RestaurantSettings`.

Orders & kitchen:
- **[E] Modifier validity at order time** — chosen options must belong to the item; a `required` group
  must have a selection; a `single` group can't have >1.
- **[E] `sent` fires all unfired items** (`firedAt`); **[E] lifecycle timestamps are write-once.**
- **[L] Order status has no forward-only guard** — `updateStatus` writes whatever it's given, so an
  order can illegally regress (`served → draft`). Business expectation: forward-only (an explicit
  "reopen" would be a deliberate, separate action).
- **[L] No `available` (86) check at order time** — an out-of-stock item can be ordered.

Tables & reservations:
- **[L] Table status is manual**, not derived from active orders — a table can read `available` while
  holding an open order, or `occupied` with none.
- **[L] No reservation overlap / double-booking check, and no `partySize ≤ seats` check.**

## Glossary

**86** an item that's unavailable/sold out · **fire** send an item to its kitchen station to be cooked
· **pass** the expo point where finished plates are assembled before serving · **station**
grill/cold/bar/pass · **KDS** kitchen display system (the cooks' screen) · **cover / party** the
guests at a table · **split** dividing one bill across multiple payers.

## How to reason here

A change is "right for the business," not just compiling, when it: respects the relevant state machine
(don't let callers set *derived* state directly), reads **snapshots** for any money math, keeps money
in `Decimal`, and either upholds an **[E]** invariant or *adds the guard* for an **[L]** one it now
depends on. When in doubt about money, the test is: *does every penny reconcile, and would it still be
correct if the menu price changed tomorrow?*
