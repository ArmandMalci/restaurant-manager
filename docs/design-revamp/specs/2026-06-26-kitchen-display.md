# Kitchen Display (KDS) — Design Spec

> Track 2, feature #2c (last of the 3-way Order+KDS split). A glanceable, station-filtered kitchen display where the kitchen one-taps items ready — driving the item→order auto-rollup + waiter alert built earlier. Approved 2026-06-26.

## 1. Overview

A read-mostly **ticket rail** for the kitchen: active orders (`sent`/`in_progress`) shown as tickets (table + items), filterable by station (grill/cold/bar/pass). Tapping an item marks it `ready`; when all of an order's items are ready it **auto-promotes to `ready`** (existing logic from Plan 4) and the waiter gets the "ready to run" alert. Tickets age (green→amber→red) and drop off the board once fully ready.

**Primary user / device:** kitchen, on a large/wall-mounted screen (and works on tablet). Polled (~6s) — no WebSockets in v1.

## 2. Architecture

A new read-only `kds` module (mirrors the `reports`/`service` modules) exposes `GET /kds/tickets`, aggregating active orders + their items (joined to `menuItem` for name/station and to the snapshot `OrderItemModifier` rows for modifier names). **Bumping reuses** the existing `PATCH /orders/:id/items/:itemId/status` mutation (→ `ready`), so all the promotion/notification logic already built is unchanged. The `/kds` screen polls the snapshot and renders a station-filtered ticket rail; station filtering + aging are computed client-side from the returned `firedAt`.

## 3. API — `GET /api/kds/tickets` (JWT-guarded)

Response (new `KdsTicketDto[]`), ordered by `firedAt` ascending (oldest first):

```ts
Array<{
  orderId: string;
  tableNumber: number | null;
  firedAt: string | null;          // order.sentAt (when it hit the kitchen)
  items: Array<{
    id: string;                    // orderItem id (bump target)
    name: string;                  // menuItem.name
    quantity: number;
    station: 'grill' | 'cold' | 'bar' | 'pass' | null;  // menuItem.station
    status: 'pending' | 'in_progress' | 'ready';
    modifiers: string[];           // OrderItemModifier.name[]
  }>;
}>
```

`KdsService.getTickets()`: `prisma.order.findMany({ where: { status: { in: ['sent','in_progress'] } }, include: { table: true, items: { include: { menuItem: { select: { name, station } }, modifiers: { select: { name } } } } }, orderBy: { sentAt: 'asc' } })`, mapped to the DTO (`firedAt = order.sentAt`). New `kds.controller.ts` + `kds.module.ts`, registered in `app.module`. Orval regen → `useKdsControllerGetTickets`.

**Bump:** the screen calls the existing generated `useOrderControllerUpdateItemStatus` hook with `{ id: orderId, itemId, data: { status: 'ready' } }`.

## 4. Frontend — `/kds` route + Kitchen nav group

- New route `apps/web/src/routes/_app/kds/index.tsx`. Add a **Kitchen** group to `components/layout/nav.ts` (`NAV_GROUPS`) — between Service and Back office — with one item: `{ to: '/kds', label: 'KDS', icon: <ChefHat or Flame> }`. (This populates the Kitchen group deferred in Plan 2.)
- **Layout (glanceable):** a `PageHeader`-style title + a **station filter** segmented control (All · Grill · Cold · Bar · Pass); below, a responsive rail/grid of **ticket cards** via `useKdsControllerGetTickets({ query: { refetchInterval: 6000 } })`.
- **Ticket card:** table # + age (from `firedAt`) + the item rows. Each item row = qty × name + modifier chips + a large **tap target** that bumps the item to `ready` (`useOrderControllerUpdateItemStatus`); `ready` items render done (checked/struck, muted). Loading → `Skeleton`; none active → `EmptyState` ("No tickets — kitchen's clear").
- **Station filter:** "All" shows every ticket with every item. A selected station shows only tickets that contain ≥1 item for it; within those tickets, items for *other* stations render dimmed (context), and only the selected station's items are tappable.
- **Aging color** (by `firedAt`, client-side): `< 5 min` neutral/green · `5–10` amber · `> 10` red — on the ticket header/border. Constants in the component.
- Warm-canvas tokens + Plan-1 primitives (`StatusBadge`/tones, `Card`, `Button`, `Skeleton`, `EmptyState`); big, legible type for distance reading. Tablet-first; scales up to a wall screen.

## 5. Deferred (out of scope for 2c)

- Real-time WebSockets (the `WS_EVENTS` constants stay unused; polling for v1).
- Dedicated full-bleed kiosk chrome (no sidebar) — `/kds` lives in the normal app shell; the kitchen full-screens the browser.
- Recall / un-bump a mistakenly-bumped item; course timing/coursing; sound or flashing alerts; per-item prep timers beyond the ticket age.

## 6. Testing

- **API (Jest):** `getTickets` returns only `sent`/`in_progress` orders (not draft/ready/served), maps item `name`/`station`/`modifiers`, sets `firedAt` from `sentAt`, and orders oldest-first.
- **Web:** build green; the board renders tickets, the station filter narrows them, tapping an item calls the bump mutation; screenshot the board + a station-filtered view.

## 7. Open assumptions

- An item whose `menuItem.station` is `null` is treated as station `pass` for filtering/display.
- A ticket appears as soon as the order is `sent` (so the kitchen sees it immediately); it drops off when the order leaves `sent`/`in_progress` (i.e. once auto-promoted to `ready`).
- Aging is from the order's `sentAt` (kitchen receipt), not per-item `firedAt` — simpler and matches "when the ticket hit the kitchen". (Per-item timers deferred.)
- No new permission gating — any authenticated user can view/bump on the KDS for v1 (shared-device model).
