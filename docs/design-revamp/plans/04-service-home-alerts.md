# Live Service Home + Alerts — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax. **Execution model: Sonnet.** Backend tasks (1–4) are TDD with Jest; frontend tasks (5–6) are visual, screenshot-verified.

**Goal:** Build the live Service home — a polled `GET /service/snapshot` (floor pulse + attention queue) backed by new timing fields and an item→order auto-rollup, plus the polling Service screen, push opt-in, and in-app alert feed.

**Architecture:** Add nullable timing columns; status-write methods stamp them and auto-promote an order to `ready` when its last item is ready. A new read-only `ServiceSnapshotService` aggregates pulse + computes attention rules + floor, exposed at `GET /api/service/snapshot` (mirrors the existing `reports` module). The web Service screen polls the generated hook every 12s; the bell feed and a Settings toggle reuse the already-wired web-push.

**Tech Stack:** NestJS + Prisma 7 (adapter-pg, `prisma.config.ts`) · Jest (`Test.createTestingModule`, plain-object Prisma mocks) · `@restaurant/shared` Zod · Orval (`pnpm gen:api`) · React + TanStack Router + React Query · Plan-1 primitives (`PageHeader`, `MetricCell`, `ListRow`, `StatusDot`/`StatusBadge`) · existing `lib/notifications.ts` + service worker. Repo uses **pnpm**.

## Global Constraints

- **Spec:** `docs/design-revamp/specs/2026-06-24-service-home-alerts.md` — thresholds `TABLE_WAIT_MIN = 10`, `RESERVATION_DUE_MIN = 15` (server constants, exported for tests).
- Order status enum: `draft → sent → in_progress → ready → served`. Active = `{draft, sent, in_progress, ready}`. OrderItem status: `pending → in_progress → ready`.
- Timestamps stamped **once** (only if not already set). No FSM enforcement added.
- **Never modify Orval-generated files** under `apps/web/src/api/` by hand — regenerate via `pnpm gen:api`.
- API tests: Jest, `provide: PrismaService, useValue: prismaMock` (plain object with `jest.fn()` per method) + mock `NotificationsService`/`InventoryService`. `@restaurant/shared` resolves to its built `dist` — run `pnpm --filter @restaurant/shared build` once if shared types are stale (not needed here — no shared edits).
- Frontend: semantic tokens only; one accent CTA; lucide icons; raw `<button>` needs `type=`.
- Commands from the stated package dir. Dev server on `:5173` (login `admin@restaurant.local` / `admin123`).

---

## File Structure

| File | Responsibility | Action |
|------|----------------|--------|
| `prisma/schema.prisma` | Timing fields on Order/OrderItem/Table/Reservation | Modify |
| `apps/api/src/order/order.service.ts` | Stamp order/item timestamps + auto-rollup | Modify |
| `apps/api/src/order/order.service.spec.ts` | Tests for stamping + rollup | Modify |
| `apps/api/src/table/table.service.ts` | Stamp/clear `seatedAt` | Modify |
| `apps/api/src/table/table.service.spec.ts` | Tests for seatedAt | Modify (create if absent) |
| `apps/api/src/service/service-snapshot.service.ts` | Pulse + attention + floor aggregation | Create |
| `apps/api/src/service/service-snapshot.service.spec.ts` | Pulse math + attention rule edges | Create |
| `apps/api/src/service/service.controller.ts` | `GET /service/snapshot` | Create |
| `apps/api/src/service/service.module.ts` | Wire service + controller (imports InventoryModule) | Create |
| `apps/api/src/inventory/inventory.module.ts` | Export `InventoryService` | Modify |
| `apps/api/src/app.module.ts` | Register `ServiceModule` | Modify |
| `apps/api/src/swagger-dtos.ts` | `ServiceSnapshotDto` (+ nested) for Orval | Modify |
| `apps/web/src/routes/_app/service/index.tsx` | Live Service home | Rewrite |
| `apps/web/src/components/notification-feed.tsx` | Live attention feed (bell) | Rewrite |
| `apps/web/src/routes/_app/settings/index.tsx` | Wire push opt-in toggle | Modify |

---

## Task 1: Add timing fields (Prisma migration)

**Files:** Modify `prisma/schema.prisma`.

**Interfaces:**
- Produces: `Order.sentAt/readyAt/servedAt`, `OrderItem.firedAt/readyAt/createdAt/updatedAt`, `Table.seatedAt`, `Reservation.seatedAt` on the generated Prisma client — consumed by Tasks 2 & 3.

- [x] **Step 1: Add the fields to the models**

In `prisma/schema.prisma`, add to the respective models (keep existing fields):

```prisma
// model Order — add:
  sentAt    DateTime?
  readyAt   DateTime?
  servedAt  DateTime?

// model OrderItem — add:
  firedAt   DateTime?
  readyAt   DateTime?
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt

// model Table — add:
  seatedAt  DateTime?

// model Reservation — add:
  seatedAt  DateTime?
```

- [x] **Step 2: Create + apply the migration**

Run (from repo root): `pnpm --filter @restaurant/api exec prisma migrate dev --name add_service_timing_fields`
Expected: a new folder under `prisma/migrations/`, migration applied, Prisma client regenerated. If it warns that existing rows need a value for `OrderItem.updatedAt`, accept the suggested default (or, since this is dev seed data, `pnpm --filter @restaurant/api exec prisma migrate reset --force` then re-run — the seed at `prisma/seed.ts` repopulates).

- [x] **Step 3: Verify the client + API compile**

Run: `pnpm --filter @restaurant/api exec prisma generate` then `pnpm --filter @restaurant/api run build`
Expected: both exit 0; the generated client now types the new fields.

- [x] **Step 4: Commit**

```bash
git add prisma/schema.prisma prisma/migrations
git commit -m "feat(api): add service timing fields (order/item/table/reservation)"
```

---

## Task 2: Stamp timestamps + item→order auto-rollup

**Files:**
- Modify: `apps/api/src/order/order.service.ts`, `apps/api/src/table/table.service.ts`
- Test: `apps/api/src/order/order.service.spec.ts`, `apps/api/src/table/table.service.spec.ts`

**Interfaces:**
- Consumes: timing fields from Task 1.
- Produces: `OrderService.updateStatus` stamps sentAt/readyAt/servedAt + fires items' firedAt on `sent`; `OrderService.updateItemStatus` stamps item readyAt and auto-promotes the order to `ready` (with push) when all items are ready; `TableService.setStatus` sets `seatedAt` on occupied / nulls it on available.

- [x] **Step 1: Add the order tests (failing)**

In `apps/api/src/order/order.service.spec.ts`, extend `prismaMock` with `orderItem.updateMany: jest.fn()` and add:

```typescript
describe('updateStatus timestamps', () => {
  it('stamps sentAt and fires items when status becomes sent', async () => {
    prismaMock.order.findUnique.mockResolvedValue({ ...mockOrder, sentAt: null });
    prismaMock.order.update.mockResolvedValue({ ...mockOrder, status: 'sent' });
    prismaMock.orderItem.updateMany.mockResolvedValue({ count: 1 });

    await service.updateStatus('ord-1', { status: 'sent' });

    expect(prismaMock.order.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'sent', sentAt: expect.any(Date) }) }),
    );
    expect(prismaMock.orderItem.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { orderId: 'ord-1', firedAt: null }, data: { firedAt: expect.any(Date) } }),
    );
  });
});

describe('updateItemStatus rollup', () => {
  it('promotes the order to ready and notifies when the last item becomes ready', async () => {
    prismaMock.order.findUnique
      .mockResolvedValueOnce({ ...mockOrder }) // findOne(orderId)
      .mockResolvedValueOnce({ ...mockOrder, status: 'in_progress', readyAt: null, items: [{ ...mockItem, status: 'ready' }] }); // rollup check
    prismaMock.orderItem.findUnique.mockResolvedValue({ ...mockItem, readyAt: null });
    prismaMock.orderItem.update.mockResolvedValue({ ...mockItem, status: 'ready' });
    prismaMock.order.update.mockResolvedValue({ ...mockOrder, status: 'ready' });
    prismaMock.table.findUnique.mockResolvedValue({ id: 'tbl-1', number: 5 });

    await service.updateItemStatus('ord-1', 'item-1', { status: 'ready' });

    expect(prismaMock.order.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'ready', readyAt: expect.any(Date) }) }),
    );
    expect(mockNotifications.sendToStaff).toHaveBeenCalled();
  });

  it('does NOT promote when other items are still pending', async () => {
    prismaMock.order.findUnique
      .mockResolvedValueOnce({ ...mockOrder })
      .mockResolvedValueOnce({ ...mockOrder, status: 'in_progress', items: [{ ...mockItem, status: 'ready' }, { ...mockItem, id: 'item-2', status: 'pending' }] });
    prismaMock.orderItem.findUnique.mockResolvedValue({ ...mockItem, readyAt: null });
    prismaMock.orderItem.update.mockResolvedValue({ ...mockItem, status: 'ready' });

    await service.updateItemStatus('ord-1', 'item-1', { status: 'ready' });

    expect(prismaMock.order.update).not.toHaveBeenCalled();
  });
});
```

- [x] **Step 2: Run the order tests to verify they fail**

Run: `pnpm --filter @restaurant/api exec jest src/order/order.service.spec.ts`
Expected: the three new tests FAIL (no sentAt stamped / no rollup).

- [x] **Step 3: Implement the order service changes**

Replace `updateStatus` and `updateItemStatus` in `apps/api/src/order/order.service.ts` with:

```typescript
public async updateStatus(id: string, dto: UpdateOrderStatusDto) {
  const existing = await this.findOne(id);
  const now = new Date();
  const data: Record<string, unknown> = { status: dto.status as never };

  if (dto.status === 'sent' && !existing.sentAt) data.sentAt = now;
  if (dto.status === 'ready' && !existing.readyAt) data.readyAt = now;
  if (dto.status === 'served' && !existing.servedAt) data.servedAt = now;

  const order = await this.prisma.order.update({ where: { id }, data, include: WITH_ITEMS });

  if (dto.status === 'sent') {
    await this.prisma.orderItem.updateMany({
      where: { orderId: id, firedAt: null },
      data: { firedAt: now },
    });
  }

  if (dto.status === 'ready') {
    const table = await this.prisma.table.findUnique({ where: { id: existing.tableId } });

    await this.notifications.sendToStaff(existing.staffId, {
      title: 'Order Ready',
      body: `Table ${table?.number ?? '?'} order is ready to serve`,
    });
  }

  return order;
}

public async updateItemStatus(orderId: string, itemId: string, dto: UpdateOrderItemStatusDto) {
  await this.findOne(orderId);
  const item = await this.prisma.orderItem.findUnique({ where: { id: itemId } });

  if (!item || item.orderId !== orderId) throw new NotFoundException('Order item not found');

  const now = new Date();
  const updated = await this.prisma.orderItem.update({
    where: { id: itemId },
    data: {
      status: dto.status as never,
      ...(dto.status === 'ready' && !item.readyAt ? { readyAt: now } : {}),
    },
  });

  if (dto.status === 'ready') await this.promoteIfAllItemsReady(orderId, now);

  return updated;
}

private async promoteIfAllItemsReady(orderId: string, now: Date) {
  const order = await this.prisma.order.findUnique({ where: { id: orderId }, include: WITH_ITEMS });

  if (!order || order.status === 'ready' || order.status === 'served') return;
  if (order.items.length === 0 || !order.items.every((i) => i.status === 'ready')) return;

  await this.prisma.order.update({
    where: { id: orderId },
    data: { status: 'ready' as never, readyAt: order.readyAt ?? now },
  });

  const table = await this.prisma.table.findUnique({ where: { id: order.tableId } });

  await this.notifications.sendToStaff(order.staffId, {
    title: 'Order Ready',
    body: `Table ${table?.number ?? '?'} order is ready to serve`,
  });
}
```

- [x] **Step 4: Run the order tests to verify they pass**

Run: `pnpm --filter @restaurant/api exec jest src/order/order.service.spec.ts`
Expected: PASS (existing + 3 new).

- [x] **Step 5: Add + run the table test (failing → impl → pass)**

In `apps/api/src/table/table.service.spec.ts` (create if missing, mirroring the order spec's module setup with `prismaMock = { table: { findUnique: jest.fn(), update: jest.fn() } }`):

```typescript
it('sets seatedAt when a table becomes occupied', async () => {
  prismaMock.table.findUnique.mockResolvedValue({ id: 'tbl-1', number: 5, status: 'available' });
  prismaMock.table.update.mockResolvedValue({ id: 'tbl-1' });

  await service.setStatus('tbl-1', { status: 'occupied' });

  expect(prismaMock.table.update).toHaveBeenCalledWith(
    expect.objectContaining({ data: expect.objectContaining({ status: 'occupied', seatedAt: expect.any(Date) }) }),
  );
});

it('clears seatedAt when a table becomes available', async () => {
  prismaMock.table.findUnique.mockResolvedValue({ id: 'tbl-1', number: 5, status: 'occupied' });
  prismaMock.table.update.mockResolvedValue({ id: 'tbl-1' });

  await service.setStatus('tbl-1', { status: 'available' });

  expect(prismaMock.table.update).toHaveBeenCalledWith(
    expect.objectContaining({ data: expect.objectContaining({ status: 'available', seatedAt: null }) }),
  );
});
```

Run `pnpm --filter @restaurant/api exec jest src/table/table.service.spec.ts` → FAIL. Then replace `setStatus` in `table.service.ts`:

```typescript
public async setStatus(id: string, dto: SetTableStatusDto) {
  await this.findOne(id);
  const data: Record<string, unknown> = { status: dto.status };

  if (dto.status === 'occupied') data.seatedAt = new Date();
  if (dto.status === 'available') data.seatedAt = null;

  return this.prisma.table.update({ where: { id }, data });
}
```

Re-run → PASS.

- [x] **Step 6: Commit**

```bash
git add apps/api/src/order/order.service.ts apps/api/src/order/order.service.spec.ts apps/api/src/table/table.service.ts apps/api/src/table/table.service.spec.ts
git commit -m "feat(api): stamp service timestamps + auto-promote order when all items ready"
```

---

## Task 3: ServiceSnapshotService (pulse + attention + floor)

**Files:**
- Create: `apps/api/src/service/service-snapshot.service.ts`, `apps/api/src/service/service-snapshot.service.spec.ts`

**Interfaces:**
- Consumes: `PrismaService`, `InventoryService.findAll()` (returns items with `lowStock`, `name`, `quantity`, `unit`).
- Produces: `ServiceSnapshotService.getSnapshot(): Promise<ServiceSnapshot>` where `ServiceSnapshot` matches the DTO in §5 of the spec. Exports `TABLE_WAIT_MIN = 10`, `RESERVATION_DUE_MIN = 15`.

- [x] **Step 1: Write the failing tests**

Create `apps/api/src/service/service-snapshot.service.spec.ts`:

```typescript
import { Test } from '@nestjs/testing';
import { ServiceSnapshotService } from './service-snapshot.service';
import { PrismaService } from '../prisma/prisma.service';
import { InventoryService } from '../inventory/inventory.service';

const minsAgo = (m: number) => new Date(Date.now() - m * 60_000);

const prismaMock = {
  table: { findMany: jest.fn() },
  order: { findMany: jest.fn() },
  reservation: { findMany: jest.fn() },
};
const inventoryMock = { findAll: jest.fn() };

describe('ServiceSnapshotService', () => {
  let service: ServiceSnapshotService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        ServiceSnapshotService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: InventoryService, useValue: inventoryMock },
      ],
    }).compile();
    service = module.get(ServiceSnapshotService);
    jest.clearAllMocks();
    prismaMock.table.findMany.mockResolvedValue([]);
    prismaMock.order.findMany.mockResolvedValue([]);
    prismaMock.reservation.findMany.mockResolvedValue([]);
    inventoryMock.findAll.mockResolvedValue([]);
  });

  it('computes covers seated and capacity from tables', async () => {
    prismaMock.table.findMany.mockResolvedValue([
      { id: 't1', number: 1, seats: 2, status: 'occupied', seatedAt: minsAgo(5) },
      { id: 't2', number: 2, seats: 4, status: 'available', seatedAt: null },
    ]);
    const snap = await service.getSnapshot();
    expect(snap.pulse.coversSeated).toBe(2);
    expect(snap.pulse.capacity).toBe(6);
    expect(snap.pulse.tablesOccupied).toBe(1);
  });

  it('emits an order-ready alert for a ready order', async () => {
    prismaMock.order.findMany.mockResolvedValue([
      { id: 'o1', tableId: 't1', status: 'ready', readyAt: minsAgo(2), table: { number: 6 },
        items: [{ quantity: 1, menuItem: { name: 'Carbonara' } }] },
    ]);
    const snap = await service.getSnapshot();
    const a = snap.attention.find((x) => x.type === 'order-ready');
    expect(a).toBeDefined();
    expect(a!.tone).toBe('success');
    expect(a!.title).toContain('6');
  });

  it('emits table-waiting only past the threshold with no active order', async () => {
    prismaMock.table.findMany.mockResolvedValue([
      { id: 't1', number: 1, seats: 2, status: 'occupied', seatedAt: minsAgo(11) },
    ]);
    prismaMock.order.findMany.mockResolvedValue([]); // no active order for t1
    const snap = await service.getSnapshot();
    expect(snap.attention.some((x) => x.type === 'table-waiting')).toBe(true);
  });

  it('does NOT emit table-waiting under the threshold', async () => {
    prismaMock.table.findMany.mockResolvedValue([
      { id: 't1', number: 1, seats: 2, status: 'occupied', seatedAt: minsAgo(9) },
    ]);
    const snap = await service.getSnapshot();
    expect(snap.attention.some((x) => x.type === 'table-waiting')).toBe(false);
  });

  it('emits low-stock alerts from inventory', async () => {
    inventoryMock.findAll.mockResolvedValue([
      { id: 'i1', name: 'Flour', quantity: 1, unit: 'kg', lowStock: true },
      { id: 'i2', name: 'Eggs', quantity: 99, unit: 'unit', lowStock: false },
    ]);
    const snap = await service.getSnapshot();
    const lows = snap.attention.filter((x) => x.type === 'low-stock');
    expect(lows).toHaveLength(1);
    expect(lows[0].tone).toBe('destructive');
  });
});
```

- [x] **Step 2: Run to verify they fail**

Run: `pnpm --filter @restaurant/api exec jest src/service/service-snapshot.service.spec.ts`
Expected: FAIL — cannot find module `./service-snapshot.service`.

- [x] **Step 3: Implement the service**

Create `apps/api/src/service/service-snapshot.service.ts`:

```typescript
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { InventoryService } from '../inventory/inventory.service';

export const TABLE_WAIT_MIN = 10;
export const RESERVATION_DUE_MIN = 15;
const ACTIVE = ['draft', 'sent', 'in_progress', 'ready'] as const;

type Tone = 'success' | 'warning' | 'info' | 'destructive';
interface Attention {
  id: string;
  type: 'order-ready' | 'table-waiting' | 'reservation-due' | 'low-stock';
  tone: Tone;
  title: string;
  subtitle: string;
  ageMin: number;
  ref: { kind: 'order' | 'table' | 'reservation' | 'menuItem'; id: string };
}

const minsSince = (d: Date | string, now: number) => Math.round((now - new Date(d).getTime()) / 60_000);

@Injectable()
export class ServiceSnapshotService {
  public constructor(
    private readonly prisma: PrismaService,
    private readonly inventory: InventoryService,
  ) {}

  public async getSnapshot() {
    const now = Date.now();
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(todayStart.getTime() + 86_400_000);

    const [tables, activeOrders, reservations, inventoryItems, servedToday] = await Promise.all([
      this.prisma.table.findMany({ orderBy: { number: 'asc' } }),
      this.prisma.order.findMany({
        where: { status: { in: ACTIVE as never } },
        include: { table: true, items: { include: { menuItem: { select: { name: true } } } } },
      }),
      this.prisma.reservation.findMany({
        where: { date: { gte: todayStart, lt: todayEnd }, seatedAt: null },
        include: { table: true },
      }),
      this.inventory.findAll(),
      this.prisma.order.findMany({
        where: { servedAt: { gte: todayStart, lt: todayEnd }, sentAt: { not: null } },
        select: { sentAt: true, servedAt: true },
      }),
    ]);

    const occupied = tables.filter((t) => t.status === 'occupied');
    const tableHasActiveOrder = new Set(activeOrders.map((o) => o.tableId));

    const turnMins = servedToday
      .filter((o) => o.sentAt && o.servedAt)
      .map((o) => (new Date(o.servedAt as Date).getTime() - new Date(o.sentAt as Date).getTime()) / 60_000);
    const avgTurnMin = turnMins.length
      ? Math.round(turnMins.reduce((a, b) => a + b, 0) / turnMins.length)
      : null;

    const kitchen = activeOrders.filter((o) => o.status === 'sent' || o.status === 'in_progress');
    const oldestSent = kitchen
      .map((o) => o.sentAt)
      .filter((d): d is Date => !!d)
      .sort((a, b) => new Date(a).getTime() - new Date(b).getTime())[0];

    const pulse = {
      coversSeated: occupied.reduce((s, t) => s + t.seats, 0),
      capacity: tables.reduce((s, t) => s + t.seats, 0),
      tablesOccupied: occupied.length,
      tablesTotal: tables.length,
      avgTurnMin,
      kitchen: {
        ticketCount: kitchen.length,
        oldestMin: oldestSent ? minsSince(oldestSent, now) : null,
      },
    };

    const attention: Attention[] = [];

    for (const o of activeOrders) {
      if (o.status !== 'ready') continue;
      const names = o.items.map((i) => i.menuItem?.name).filter(Boolean).join(', ');
      attention.push({
        id: `order-ready:${o.id}`,
        type: 'order-ready',
        tone: 'success',
        title: `Table ${o.table?.number ?? '?'} · order ready`,
        subtitle: names ? `${names} — runner needed` : 'Ready to run',
        ageMin: o.readyAt ? minsSince(o.readyAt, now) : 0,
        ref: { kind: 'order', id: o.id },
      });
    }

    for (const t of occupied) {
      if (!t.seatedAt) continue;
      const age = minsSince(t.seatedAt, now);
      if (age >= TABLE_WAIT_MIN && !tableHasActiveOrder.has(t.id)) {
        attention.push({
          id: `table-waiting:${t.id}`,
          type: 'table-waiting',
          tone: 'warning',
          title: `Table ${t.number} · seated, no order`,
          subtitle: `${age} min since seated`,
          ageMin: age,
          ref: { kind: 'table', id: t.id },
        });
      }
    }

    for (const r of reservations) {
      const ageMin = minsSince(r.date, now); // >0 overdue, <0 upcoming
      if (ageMin >= -RESERVATION_DUE_MIN) {
        attention.push({
          id: `reservation-due:${r.id}`,
          type: 'reservation-due',
          tone: ageMin > 0 ? 'destructive' : 'warning',
          title: `${r.guestName} (${r.partySize})`,
          subtitle: `Table ${r.table?.number ?? '—'} · ${ageMin > 0 ? 'overdue' : 'arriving soon'}`,
          ageMin,
          ref: { kind: 'reservation', id: r.id },
        });
      }
    }

    for (const item of inventoryItems.filter((i) => i.lowStock)) {
      attention.push({
        id: `low-stock:${item.id}`,
        type: 'low-stock',
        tone: 'destructive',
        title: `${item.name} · low stock`,
        subtitle: `${item.quantity} ${item.unit} left`,
        ageMin: 0,
        ref: { kind: 'menuItem', id: item.id },
      });
    }

    const order = { destructive: 0, warning: 1, info: 2, success: 3 } as const;
    attention.sort((a, b) => order[a.tone] - order[b.tone] || b.ageMin - a.ageMin);

    const floor = tables.map((t) => ({
      id: t.id,
      number: t.number,
      status: t.status,
      ageMin: t.status === 'occupied' && t.seatedAt ? minsSince(t.seatedAt, now) : null,
    }));

    return { pulse, attention, floor };
  }
}
```

- [x] **Step 4: Run to verify they pass**

Run: `pnpm --filter @restaurant/api exec jest src/service/service-snapshot.service.spec.ts`
Expected: PASS (5 tests).

- [x] **Step 5: Commit**

```bash
git add apps/api/src/service/service-snapshot.service.ts apps/api/src/service/service-snapshot.service.spec.ts
git commit -m "feat(api): service snapshot aggregation (pulse + attention + floor)"
```

---

## Task 4: Expose `GET /service/snapshot` + generate the web hook

**Files:**
- Create: `apps/api/src/service/service.controller.ts`, `apps/api/src/service/service.module.ts`
- Modify: `apps/api/src/inventory/inventory.module.ts` (export `InventoryService`), `apps/api/src/app.module.ts`, `apps/api/src/swagger-dtos.ts`

**Interfaces:**
- Consumes: `ServiceSnapshotService` (Task 3).
- Produces: `GET /api/service/snapshot` → `ServiceSnapshotDto`; generated web hook `useServiceControllerGetSnapshot` + `getServiceControllerGetSnapshotQueryKey`.

- [x] **Step 1: Add the response DTO for Orval**

In `apps/api/src/swagger-dtos.ts`, append (mirroring the existing `@ApiProperty` DTO style):

```typescript
export class ServicePulseKitchenDto {
  @ApiProperty() public ticketCount!: number;
  @ApiProperty({ type: Number, nullable: true }) public oldestMin!: number | null;
}
export class ServicePulseDto {
  @ApiProperty() public coversSeated!: number;
  @ApiProperty() public capacity!: number;
  @ApiProperty() public tablesOccupied!: number;
  @ApiProperty() public tablesTotal!: number;
  @ApiProperty({ type: Number, nullable: true }) public avgTurnMin!: number | null;
  @ApiProperty({ type: ServicePulseKitchenDto }) public kitchen!: ServicePulseKitchenDto;
}
export class ServiceAttentionRefDto {
  @ApiProperty() public kind!: string;
  @ApiProperty() public id!: string;
}
export class ServiceAttentionDto {
  @ApiProperty() public id!: string;
  @ApiProperty() public type!: string;
  @ApiProperty() public tone!: string;
  @ApiProperty() public title!: string;
  @ApiProperty() public subtitle!: string;
  @ApiProperty() public ageMin!: number;
  @ApiProperty({ type: ServiceAttentionRefDto }) public ref!: ServiceAttentionRefDto;
}
export class ServiceFloorTableDto {
  @ApiProperty() public id!: string;
  @ApiProperty() public number!: number;
  @ApiProperty() public status!: string;
  @ApiProperty({ type: Number, nullable: true }) public ageMin!: number | null;
}
export class ServiceSnapshotDto {
  @ApiProperty({ type: ServicePulseDto }) public pulse!: ServicePulseDto;
  @ApiProperty({ type: [ServiceAttentionDto] }) public attention!: ServiceAttentionDto[];
  @ApiProperty({ type: [ServiceFloorTableDto] }) public floor!: ServiceFloorTableDto[];
}
```

- [x] **Step 2: Create the controller**

Create `apps/api/src/service/service.controller.ts`:

```typescript
import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ServiceSnapshotDto } from '../swagger-dtos';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ServiceSnapshotService } from './service-snapshot.service';

@ApiTags('service')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('service')
export class ServiceController {
  public constructor(private readonly snapshot: ServiceSnapshotService) {}

  @Get('snapshot')
  @ApiOperation({ summary: 'Live service snapshot: pulse, attention queue, floor' })
  @ApiResponse({ status: 200, type: ServiceSnapshotDto })
  public getSnapshot() {
    return this.snapshot.getSnapshot();
  }
}
```

- [x] **Step 3: Create the module + export InventoryService + register**

Create `apps/api/src/service/service.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { ServiceSnapshotService } from './service-snapshot.service';
import { ServiceController } from './service.controller';
import { InventoryModule } from '../inventory/inventory.module';

@Module({
  imports: [InventoryModule],
  providers: [ServiceSnapshotService],
  controllers: [ServiceController],
})
export class ServiceModule {}
```

In `apps/api/src/inventory/inventory.module.ts`, ensure `InventoryService` is exported (add `exports: [InventoryService]` if absent). In `apps/api/src/app.module.ts`, import `ServiceModule` and add it to the `imports` array (mirroring `ReportsModule`).

- [x] **Step 4: Build the API**

Run: `pnpm --filter @restaurant/api run build`
Expected: exit 0 (DI resolves — `InventoryModule` exports `InventoryService`).

- [x] **Step 5: Regenerate the OpenAPI spec + web hooks**

Run (from repo root): `pnpm gen:api`
Expected: `apps/web/src/api/service/service.ts` is created exporting `useServiceControllerGetSnapshot`. Confirm with: `ls apps/web/src/api/service/`.

- [x] **Step 6: Commit**

```bash
git add apps/api/src/service apps/api/src/swagger-dtos.ts apps/api/src/inventory/inventory.module.ts apps/api/src/app.module.ts apps/web/src/api apps/web/openapi.json
git commit -m "feat(api): expose GET /service/snapshot + generate web hook"
```

---

## Task 5: Live Service home (web)

**Files:** Rewrite `apps/web/src/routes/_app/service/index.tsx`.

**Interfaces:**
- Consumes: `useServiceControllerGetSnapshot` (Task 4); primitives `PageHeader`, `MetricCell`, `ListRow`, `StatusDot`; `Button`, `Card`, `Skeleton`, `EmptyState`; `useNavigate` from `@tanstack/react-router`.

- [x] **Step 1: Rewrite the screen**

Replace `apps/web/src/routes/_app/service/index.tsx` with a screen that:
- Calls `useServiceControllerGetSnapshot({ query: { refetchInterval: 12_000 } })`.
- `PageHeader` title "Service", subtitle a live label (e.g. the weekday + time from `new Date()`).
- **Pulse strip:** `grid grid-cols-2 lg:grid-cols-4 gap-3` of `MetricCell` — `Covers seated` = `${coversSeated} / ${capacity}`; `Tables occupied` = `${tablesOccupied} / ${tablesTotal}`; `Avg turn` = `avgTurnMin == null ? '—' : formatMins(avgTurnMin)`; `Kitchen load` = `${kitchen.ticketCount}` with sub `${kitchen.oldestMin ?? 0}m oldest`.
- **Needs attention:** a `Card`; if `attention.length === 0` show `EmptyState` (icon `CircleCheck`, "All clear", "No alerts right now."); else map each to a `ListRow`: `leading` = `<StatusDot tone={a.tone} size="md" />`, `title` = `a.title`, `subtitle` = `a.subtitle`, `meta` = formatted age (`a.ageMin > 0 ? \`${a.ageMin}m\` : a.ageMin < 0 ? \`in ${-a.ageMin}m\` : 'now'`), `action` = a `<Button variant="outline" size="sm">` whose label + target depend on `a.type`: `order-ready`→"Run"/`/order`, `table-waiting`→"Take order"/`/floor`, `reservation-due`→"Seat"/`/door`, `low-stock`→"View"/`/inventory`; onClick `navigate({ to })`.
- **Floor mini-grid:** `grid grid-cols-3 sm:grid-cols-5 gap-2` of compact chips — each `bg-card border-border` with `<StatusDot tone={statusToTone(t.status)} />` + `T{number}`, where `available→success, occupied→info, reserved→warning`.
- Loading (`isLoading`): `Skeleton` blocks for the pulse + a few rows.

Use a small local `formatMins(m)` (`m >= 60 ? \`${Math.floor(m/60)}h ${m%60}m\` : \`${m}m\``) and `statusToTone` helper in the file.

- [x] **Step 2: Verify build + tests**

Run: `pnpm --filter @restaurant/web run build` (exit 0) and `pnpm --filter @restaurant/web run test` (still green).

- [x] **Step 3: Verify visually**

Use the `run-web` skill: log in, land on `/service`. Expected: pulse strip with live numbers, an attention queue with action buttons (click one → navigates to the right screen), floor mini-grid. Leave it ~15s to confirm it refetches (the network panel shows a repeat call). Screenshot desktop + 390px.

- [x] **Step 4: Commit**

```bash
git add apps/web/src/routes/_app/service/index.tsx
git commit -m "feat(web): live Service home (pulse + attention queue + floor)"
```

---

## Task 6: Push opt-in toggle + live bell feed

**Files:** Rewrite `apps/web/src/components/notification-feed.tsx`; modify `apps/web/src/routes/_app/settings/index.tsx`.

**Interfaces:**
- Consumes: `lib/notifications.ts` (`subscribe`, `unsubscribe`, `isSubscribed`); `useServiceControllerGetSnapshot`.

- [x] **Step 1: Live bell feed**

Rewrite `notification-feed.tsx` to call `useServiceControllerGetSnapshot({ query: { refetchInterval: 12_000 } })` and render the `attention[]` as a list (reuse the same row shape as Task 5 — a compact `StatusDot` + title/subtitle + age). If `attention.length === 0`, keep the `EmptyState`. Export the count so the topbar bell can badge it — simplest: the feed renders its own header "Notifications (N)"; (a numeric badge on the bell icon is optional polish, not required).

- [x] **Step 2: Wire the Settings push toggle**

In `settings/index.tsx`, find the notifications "Enable" control. Wire it to `lib/notifications.ts`: on mount call `isSubscribed()` to set state; the button calls `subscribe()` (and shows "Disable" → `unsubscribe()` when subscribed). Reflect the subscribed state in the label. Read the current file first; if a handler is already wired, leave it. Handle the promise rejection (permission denied) by reverting the toggle and showing inline text.

- [x] **Step 3: Verify**

Run: `pnpm --filter @restaurant/web run build` (exit 0). Use the `run-web` skill: open the bell → live attention list; on Settings, the toggle reflects subscribe state (clicking prompts the browser permission). Screenshot the bell feed.

- [x] **Step 4: Commit**

```bash
git add apps/web/src/components/notification-feed.tsx apps/web/src/routes/_app/settings/index.tsx
git commit -m "feat(web): live bell feed + push opt-in toggle"
```

---

## Self-Review

**1. Spec coverage:**
- Schema timing fields (§3) → Task 1. ✓
- Transition stamping + auto-rollup (§4) → Task 2. ✓
- `GET /service/snapshot` contract + attention rules/thresholds (§5) → Task 3 (logic) + Task 4 (exposure). ✓
- Polling Service home (§6) → Task 5 (`refetchInterval: 12_000`, pulse/attention/floor, deep-link actions, whole-floor). ✓
- Push opt-in + in-app feed (§7) → Task 6. ✓
- Testing (§9) → Tasks 2 & 3 (Jest) + Tasks 5/6 build+screenshot. ✓
- Deferrals (§8) honored — no WebSocket, no persisted Alert entity, no sections/filter, no reservation status enum, no configurable thresholds, no inline row mutations.

**2. Placeholder scan:** No TBD/TODO. Backend tasks carry complete code; frontend tasks (5–6) are reskin-style briefs with concrete component/primitive/data wiring, verified by build + screenshot (consistent with Plan 3's visual-task format) — the screens have no new logic to TDD.

**3. Type consistency:** `getSnapshot()` return shape matches `ServiceSnapshotDto` (Task 4) field-for-field (pulse/attention/floor + nested kitchen/ref). `TABLE_WAIT_MIN`/`RESERVATION_DUE_MIN` defined once (Task 3), used in its tests. Attention `type`/`tone` literals match between the service, the DTO (as `string`), and the Service-home action mapping (Task 5). The generated hook name `useServiceControllerGetSnapshot` is used consistently in Tasks 5 & 6.

**Deviation from spec (noted):** §5 mentioned a shared Zod `ServiceSnapshotSchema`; the plan instead types the response via `swagger-dtos` (the `reports` pattern) since the snapshot is response-only and isn't validated inbound — same outcome (a typed Orval hook), less coupling, no shared-package rebuild in the critical path.

**Pre-flight for the executor:** before Task 6, read `settings/index.tsx` + `lib/notifications.ts` to confirm the existing toggle's wiring; before Task 2, confirm `findOne` returns the new scalar fields (it does — `findUnique` returns all scalars after Task 1's `prisma generate`).
