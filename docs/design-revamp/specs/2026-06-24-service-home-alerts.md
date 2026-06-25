# Live Service Home + Alerts — Design Spec

> Track 2, feature #1. Builds the real Service home (live floor pulse + attention queue) on top of the Track-1 design system. Approved 2026-06-24.

## 1. Overview

Replace the placeholder Service screen (currently the old dashboard content) with a **live operational home**: a floor pulse, an actionable **attention queue**, and a floor mini-grid — refreshed by polling a new server-computed snapshot endpoint. Add the timing fields needed for accurate aging, an item→order **auto-rollup**, and wire the already-built web-push so staff get backgrounded alerts and an in-app feed.

**Primary user / device:** floor staff on the shared tablet (whole-floor view; per-section filter deferred). **Liveness:** polling (~12s). **Aesthetic:** the Warm canvas system + Plan-1 primitives.

## 2. Architecture & boundaries

```
Order/Table status writes ──set timestamps──▶ Postgres
        │ (item→ready rollup)
        ▼
ServiceSnapshotService.getSnapshot()  ◀── reads orders/tables/reservations/inventory
        │  computes pulse + attention[] + floor[]
        ▼
GET /api/service/snapshot  ──polled every 12s──▶  Service home (web)
                                                   ├─ pulse strip (MetricCell)
                                                   ├─ attention queue (ListRow + deep-link action)
                                                   └─ floor mini-grid (StatusDot)
web-push (already wired) ──background notifications──▶ service worker
NotificationFeed (bell) renders the same attention[]
```

Units, each independently testable:
- **Timestamp/transition logic** — in the existing `OrderService`/`TableService`; pure side-effects on status writes.
- **`ServiceSnapshotService`** — read-only aggregation + rule evaluation; no writes. The one piece carrying the pulse math and attention rules.
- **`ServiceController`** — thin; exposes `GET /service/snapshot`.
- **Service home (web)** — presentational, driven entirely by the snapshot DTO.
- **Push opt-in** — wire existing `lib/notifications.ts` to a Settings toggle; no new transport.

## 3. Schema changes (one Prisma migration)

| Model | New fields | Set when |
|-------|-----------|----------|
| `Order` | `sentAt DateTime?`, `readyAt DateTime?`, `servedAt DateTime?` | status → sent / ready / served |
| `OrderItem` | `firedAt DateTime?`, `readyAt DateTime?`, `createdAt DateTime @default(now())`, `updatedAt DateTime @updatedAt` | firedAt on order→sent; readyAt on item→ready |
| `Table` | `seatedAt DateTime?` | set on status→occupied; cleared (null) on →available |
| `Reservation` | `seatedAt DateTime?` | null for now; set by the future Door seating flow. Consumed by `reservation-due` (only un-seated reservations alert). |

All nullable/defaulted → migration is additive and safe on existing rows. Shared Zod schemas in `packages/shared/src/schemas/{order,table,reservation}.ts` gain the optional fields so the generated types carry them.

## 4. Transition logic + auto-rollup

In `OrderService`:
- `updateStatus(id, status)`: when transitioning, stamp the matching timestamp — `sent`→`sentAt`, `ready`→`readyAt`, `served`→`servedAt` (only if not already set). On `sent`, also set `firedAt = now()` on all the order's items that lack it.
- `updateItemStatus(id, itemId, status)`: on `ready`, set the item's `readyAt`. **Auto-rollup:** after the write, if every item of the order is `ready` and the order is not already `ready`/`served`, set `order.status = ready` + `readyAt = now()` and fire the existing "Order Ready" push to `order.staffId`. (This reuses the push trigger already in `OrderService`.)

In `TableService`:
- `setStatus(id, status)`: on `occupied`, set `seatedAt = now()` (if transitioning into occupied). On `available`, set `seatedAt = null`.

No FSM enforcement is added (out of scope); timestamps are stamped opportunistically on whatever transition occurs.

## 5. `GET /api/service/snapshot` (JWT-guarded)

Response DTO (new shared Zod schema `ServiceSnapshotSchema`):

```ts
{
  pulse: {
    coversSeated: number;      // Σ seats of occupied tables
    capacity: number;          // Σ seats of all tables
    tablesOccupied: number;
    tablesTotal: number;
    avgTurnMin: number | null; // avg (servedAt − sentAt) over today's served orders; null if none
    kitchen: { ticketCount: number; oldestMin: number | null }; // orders in {sent,in_progress}; oldest by sentAt
  };
  attention: Array<{
    id: string;                // `${type}:${refId}` — stable for React keys/dedup
    type: 'order-ready' | 'table-waiting' | 'reservation-due' | 'low-stock';
    tone: 'success' | 'warning' | 'info' | 'destructive';
    title: string;
    subtitle: string;
    ageMin: number;            // minutes since the triggering event (negative = upcoming, for reservations)
    ref: { kind: 'order' | 'table' | 'reservation' | 'menuItem'; id: string };
  }>;
  floor: Array<{ id: string; number: number; status: 'available' | 'occupied' | 'reserved'; ageMin: number | null }>;
}
```

**Attention rules (server constants in v1):**
| type | condition | tone | title / subtitle | age |
|------|-----------|------|------------------|-----|
| `order-ready` | order.status === `ready` (not served) | success | "Table N · order ready" / item names | now − `readyAt` |
| `table-waiting` | table occupied, `seatedAt` > **10 min** ago, no order in {draft,sent,in_progress,ready} for it | warning | "Table N · seated, no order" / "N min since seated" | now − `seatedAt` |
| `reservation-due` | reservation today, `seatedAt` null, `date` within [overdue … now+**15 min**] | warning (≤15m out) / destructive (overdue) | "Guest (party) · arriving HH:MM" / table | now − `date` |
| `low-stock` | inventory item at/below its low-stock threshold (reuse `inventory` low-stock logic) | destructive | "Item · low stock" / qty | n/a (0) |

Sort: overdue/destructive first, then by `ageMin` desc. Constants (`TABLE_WAIT_MIN = 10`, `RESERVATION_DUE_MIN = 15`) live in the service file with named exports for the tests.

## 6. Frontend — Service home (`routes/_app/service/index.tsx`)

Rewrite the screen to consume the snapshot:
- New Orval hook `useServiceControllerGetSnapshot` called with `{ query: { refetchInterval: 12_000 } }` (refetch-on-focus already on by default).
- Layout (Warm canvas + primitives): `PageHeader` ("Service" + live "weekday meal · HH:MM"); **pulse strip** = 4 `MetricCell`s (covers seated `42/80` from `coversSeated/capacity`, tables occupied `N/M` from `tablesOccupied/tablesTotal`, avg turn from `avgTurnMin`, kitchen load `N · Mm` from `kitchen.ticketCount/oldestMin`); format upcoming reservation ages as "in N min" vs past as "N min ago"; **"Needs attention"** = `Card` of `ListRow`s — `leading` a tone `StatusDot`/icon, `title`/`subtitle`, `meta` ageMin, `action` a button that **deep-links** to the relevant screen (`order-ready`→`/order`, `table-waiting`→`/floor`, `reservation-due`→`/door`, `low-stock`→`/inventory`); **floor mini-grid** = compact `StatusDot` chips per table. Loading → `Skeleton`; zero attention → `EmptyState` ("All clear").
- v1 actions navigate (deep-link); inline mutations (e.g. "mark served" from the row) are deferred.
- Whole-floor only; **no section/server filter** (no sections in schema).

## 7. Frontend — push opt-in + in-app feed

- **Opt-in:** wire the Settings → Notifications "Enable" control to `lib/notifications.ts` `subscribe()`/`unsubscribe()`/`isSubscribed()` (verify whether the existing button is already wired; wire it if stubbed). Reflect subscribed state.
- **In-app feed:** `NotificationFeed` (the bell Sheet) renders the live `attention[]` from the snapshot (same hook) instead of the empty stub; `EmptyState` when none. The unread badge shows `attention.length` when > 0.

## 8. Deferred (explicitly out of scope for v1)

WebSocket/SSE real-time; persisted `Alert`/`Notification` entity with read-ack history; floor `Section` model + section/server filter; full reservation status enum (confirmed/seated/no-show); user-configurable thresholds in Settings; inline mutate-from-row actions on the attention queue.

## 9. Testing

- **API:** unit tests for `ServiceSnapshotService` — pulse math (covers/capacity/avgTurn/kitchen oldest) and each attention rule at its threshold edge (e.g. seated 9 vs 11 min; reservation 14 vs 16 min out; overdue); transition tests (each status stamps its timestamp once) and the **auto-rollup** (last item ready → order ready + push fired).
- **Web:** the snapshot hook polls with the interval; Service home renders loading / all-clear / populated states; an attention row's action navigates to the right route.

## 10. Open assumptions (resolve during planning if wrong)

- `Reservation.seatedAt` is added but only *consumed* in v1 (set by a future Door flow); until then `reservation-due` shows all un-cancelled today reservations by time. Acceptable.
- `avgTurnMin` uses order `sentAt→servedAt` as the turn proxy (no table clear-time stored).
- Low-stock reuses the existing inventory low-stock definition rather than re-deriving it.
