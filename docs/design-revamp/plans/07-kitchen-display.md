# Kitchen Display (KDS) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development or executing-plans. Checkbox (`- [ ]`) steps. **Execution model: Sonnet.** Backend (Tasks 1–2) is TDD (Jest); frontend (3) is visual, screenshot-verified.

**Goal:** A glanceable, station-filtered Kitchen Display at `/kds` that lists active tickets and lets the kitchen one-tap items ready (reusing the existing item-status bump + auto-rollup).

**Architecture:** New read-only `kds` module (mirrors `reports`/`service`) exposes `GET /kds/tickets` aggregating active orders + items (joined to `menuItem` name/station + snapshot modifier names). The `/kds` screen polls it (~6s) and renders a station-filterable ticket rail; bumping an item reuses the generated `useOrderControllerUpdateItemStatus` mutation (→ `ready`), which auto-promotes the order + alerts the waiter (built in Plan 4).

**Tech Stack:** NestJS + Prisma · Jest (plain Prisma mocks) · `swagger-dtos` + Orval (`pnpm gen:api`) · React + Plan-1 primitives. pnpm.

## Global Constraints

- Spec: `docs/design-revamp/specs/2026-06-26-kitchen-display.md`. Active = order status `sent`/`in_progress`. Stations `grill|cold|bar|pass`; `null` station → treat as `pass`.
- **No new mutation** — bumping reuses `PATCH /orders/:id/items/:itemId/status` (generated `useOrderControllerUpdateItemStatus`, body `{ id, itemId, data: { status: 'ready' } }`).
- Aging from `order.sentAt` (`firedAt`); thresholds: <5 min neutral · 5–10 amber · >10 red.
- **Environment (Node 21 caveat):** the husky pre-commit hook breaks on Node 21 (`listr2`/`styleText`) → commit with `--no-verify`. `pnpm gen:api` may need Node 22+/pnpm 10 (`~/.nvm/.../v24.11.1` has pnpm 10) — report what you run.
- Never hand-edit `apps/web/src/api/**` — regen via `pnpm gen:api`. Pre-existing `notifications.service.spec.ts` 8 failures — ignore.
- Frontend: semantic tokens; one accent CTA; lucide; raw `<button>` needs `type=`.

---

## File Structure

| File | Responsibility | Action |
|------|----------------|--------|
| `apps/api/src/kds/kds.service.ts` | aggregate active tickets | Create |
| `apps/api/src/kds/kds.service.spec.ts` | tickets shaping/ordering tests | Create |
| `apps/api/src/kds/kds.controller.ts` | `GET /kds/tickets` | Create |
| `apps/api/src/kds/kds.module.ts` | wire | Create |
| `apps/api/src/app.module.ts` | register `KdsModule` | Modify |
| `apps/api/src/swagger-dtos.ts` | `KdsTicketDto` + item | Modify |
| `apps/web/src/components/layout/nav.ts` | Kitchen group + `/kds` | Modify |
| `apps/web/src/routes/_app/kds/index.tsx` | KDS board | Create |

---

## Task 1: KDS tickets service (TDD)

**Interfaces:** Produces `KdsService.getTickets()` returning `Array<{ orderId, tableNumber: number|null, firedAt: Date|null, items: Array<{ id, name, quantity, station: 'grill'|'cold'|'bar'|'pass'|null, status, modifiers: string[] }> }>`, active-only, oldest `sentAt` first.

- [ ] **Step 1: Failing tests** — create `apps/api/src/kds/kds.service.spec.ts`:

```typescript
import { Test } from '@nestjs/testing';
import { KdsService } from './kds.service';
import { PrismaService } from '../prisma/prisma.service';

const prismaMock = { order: { findMany: jest.fn() } };

describe('KdsService', () => {
  let service: KdsService;
  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [KdsService, { provide: PrismaService, useValue: prismaMock }],
    }).compile();
    service = module.get(KdsService);
    jest.clearAllMocks();
  });

  it('queries only active orders oldest-first and maps the ticket shape', async () => {
    const sentAt = new Date('2026-01-01T10:00:00Z');
    prismaMock.order.findMany.mockResolvedValue([
      { id: 'o1', sentAt, table: { number: 5 },
        items: [{ id: 'i1', quantity: 2, status: 'pending', menuItem: { name: 'Steak', station: 'grill' }, modifiers: [{ name: 'Rare' }] }] },
    ]);
    const tickets = await service.getTickets();
    expect(prismaMock.order.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { status: { in: ['sent', 'in_progress'] } }, orderBy: { sentAt: 'asc' } }),
    );
    expect(tickets).toEqual([
      { orderId: 'o1', tableNumber: 5, firedAt: sentAt,
        items: [{ id: 'i1', name: 'Steak', quantity: 2, station: 'grill', status: 'pending', modifiers: ['Rare'] }] },
    ]);
  });

  it('handles null table, null station, and no modifiers', async () => {
    prismaMock.order.findMany.mockResolvedValue([
      { id: 'o2', sentAt: null, table: null,
        items: [{ id: 'i2', quantity: 1, status: 'in_progress', menuItem: { name: 'Water', station: null }, modifiers: [] }] },
    ]);
    const [t] = await service.getTickets();
    expect(t.tableNumber).toBeNull();
    expect(t.items[0].station).toBeNull();
    expect(t.items[0].modifiers).toEqual([]);
  });
});
```

- [ ] **Step 2: Run → fail** — `pnpm --filter @restaurant/api exec jest src/kds/kds.service.spec.ts` (module not found).

- [ ] **Step 3: Implement** — create `apps/api/src/kds/kds.service.ts`:

```typescript
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class KdsService {
  public constructor(private readonly prisma: PrismaService) {}

  public async getTickets() {
    const orders = await this.prisma.order.findMany({
      where: { status: { in: ['sent', 'in_progress'] } },
      orderBy: { sentAt: 'asc' },
      include: {
        table: { select: { number: true } },
        items: {
          orderBy: { id: 'asc' },
          include: {
            menuItem: { select: { name: true, station: true } },
            modifiers: { select: { name: true } },
          },
        },
      },
    });

    return orders.map((o) => ({
      orderId: o.id,
      tableNumber: o.table?.number ?? null,
      firedAt: o.sentAt,
      items: o.items.map((it) => ({
        id: it.id,
        name: it.menuItem.name,
        quantity: it.quantity,
        station: it.menuItem.station ?? null,
        status: it.status,
        modifiers: it.modifiers.map((m) => m.name),
      })),
    }));
  }
}
```

- [ ] **Step 4: Run → pass.** **Step 5: Commit** (`git add apps/api/src/kds/kds.service.ts apps/api/src/kds/kds.service.spec.ts`; `--no-verify`; `feat(api): KDS tickets aggregation service`).

---

## Task 2: KDS controller + module + DTO + Orval regen

- [ ] **Step 1: DTOs** — in `swagger-dtos.ts` add:

```typescript
export class KdsTicketItemDto {
  @ApiProperty() public id!: string;
  @ApiProperty() public name!: string;
  @ApiProperty() public quantity!: number;
  @ApiProperty({ enum: ['grill', 'cold', 'bar', 'pass'], nullable: true }) public station!: string | null;
  @ApiProperty() public status!: string;
  @ApiProperty({ type: [String] }) public modifiers!: string[];
}
export class KdsTicketDto {
  @ApiProperty() public orderId!: string;
  @ApiProperty({ type: Number, nullable: true }) public tableNumber!: number | null;
  @ApiProperty({ type: String, nullable: true }) public firedAt!: string | null;
  @ApiProperty({ type: [KdsTicketItemDto] }) public items!: KdsTicketItemDto[];
}
```

- [ ] **Step 2: Controller** — create `apps/api/src/kds/kds.controller.ts`:

```typescript
import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { KdsTicketDto } from '../swagger-dtos';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { KdsService } from './kds.service';

@ApiTags('kds')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('kds')
export class KdsController {
  public constructor(private readonly kds: KdsService) {}

  @Get('tickets')
  @ApiOperation({ summary: 'Active kitchen tickets (oldest first)' })
  @ApiResponse({ status: 200, type: [KdsTicketDto] })
  public getTickets() {
    return this.kds.getTickets();
  }
}
```

- [ ] **Step 3: Module + register** — create `apps/api/src/kds/kds.module.ts` (providers `[KdsService]`, controllers `[KdsController]`); import + add `KdsModule` to the `imports` array in `app.module.ts` (mirror `ServiceModule`/`ReportsModule`).

- [ ] **Step 4: Build + regen** — `pnpm --filter @restaurant/api run build` (exit 0); `pnpm gen:api` (use Node 22+/pnpm 10 if needed). Confirm `apps/web/src/api/kds/kds.ts` exports `useKdsControllerGetTickets`.

- [ ] **Step 5: Commit** (`git add apps/api/src/kds apps/api/src/swagger-dtos.ts apps/api/src/app.module.ts apps/web/src/api apps/web/openapi.json`; `--no-verify`; `feat(api): expose GET /kds/tickets + generate hook`).

---

## Task 3: KDS board (web) + Kitchen nav group

**Files:** Modify `apps/web/src/components/layout/nav.ts`; create `apps/web/src/routes/_app/kds/index.tsx`.

- [ ] **Step 1: Nav** — in `nav.ts` import `ChefHat` from lucide-react and insert a group **between** Service and Back office:

```typescript
  {
    label: 'Kitchen',
    items: [{ to: '/kds', label: 'KDS', icon: ChefHat }],
  },
```

- [ ] **Step 2: Board** — create `apps/web/src/routes/_app/kds/index.tsx` (`createFileRoute('/_app/kds/')`). It:
  - calls `useKdsControllerGetTickets({ query: { refetchInterval: 6000 } })` and `useOrderControllerUpdateItemStatus`.
  - **Station filter:** local state `station: 'all' | 'grill' | 'cold' | 'bar' | 'pass'`, rendered as a segmented control (buttons). Treat an item's effective station as `item.station ?? 'pass'`.
  - **Tickets:** a responsive grid of ticket cards (`grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-3`). When `station !== 'all'`, show only tickets that have ≥1 item with that effective station.
  - **Ticket card:** header = `Table {tableNumber ?? '—'}` + age label from `firedAt` (`ageMin` via `(Date.now() - new Date(firedAt).getTime())/60000`, rounded; show "just now" if null) with an aging accent (border/badge tone: `ageMin>10` destructive, `>5` warning, else success/neutral). Body = item rows: `{quantity}× {name}` + modifier text (muted, smaller) + a tap target. When a station is selected, items NOT matching are rendered dimmed (`opacity-50`) and non-interactive; matching, non-ready items are a `<button type="button">` that bumps.
  - **Bump:** clicking a non-ready item → `updateItemStatus.mutate({ id: ticket.orderId, itemId: item.id, data: { status: 'ready' } }, { onSuccess: () => invalidateKdsControllerGetTickets(qc) })`. `ready` items render checked/struck + muted (not a button).
  - Loading → `Skeleton`; zero tickets → `EmptyState` (icon `ChefHat`, "Kitchen's clear", "No active tickets.").
  - Warm-canvas tokens + Plan-1 primitives; large legible type (distance reading). One accent treatment.
  - Use the generated `invalidateKdsControllerGetTickets` helper (or `queryClient.invalidateQueries` with the kds query key) on bump success.

- [ ] **Step 3:** Verify `pnpm --filter @restaurant/web run build` (exit 0) + `pnpm --filter @restaurant/web run test` green.

- [ ] **Step 4:** (Lead verifies live: with the API running, fire an order from `/order`, open `/kds`, confirm the ticket appears, filter by station, tap an item ready → it checks and when all are ready the ticket drops off. Screenshot the board + a station-filtered view.)

- [ ] **Step 5: Commit** (`git add apps/web/src/components/layout/nav.ts apps/web/src/routes/_app/kds`; `--no-verify`; `feat(web): kitchen display board with station filter + item bump`).

---

## Self-Review

**1. Spec coverage:** `GET /kds/tickets` shape + active-only + oldest-first (§3)→T1/T2; bump reuses item-status (§3)→T3; `/kds` route + Kitchen nav group + station filter + one-tap-ready + aging colors + ~6s poll (§4)→T3; deferrals (WS, kiosk chrome, recall, coursing)→honored. ✓

**2. Placeholder scan:** No TBD/TODO; backend complete code; T3 is a concrete board brief with the exact hook calls + payload + filter/aging rules, build+screenshot verified. ✓

**3. Type consistency:** `getTickets()` return shape (T1) matches `KdsTicketDto`/`KdsTicketItemDto` (T2) field-for-field; the board (T3) consumes `orderId`/`tableNumber`/`firedAt`/`items[].{id,name,quantity,station,status,modifiers}` exactly; bump payload `{ id: orderId, itemId, data: { status: 'ready' } }` matches the generated `useOrderControllerUpdateItemStatus` signature confirmed in `orders.ts`.

**Pre-flight for executor:** confirm `invalidateKdsControllerGetTickets` exists in the generated `kds.ts` after T2's regen (Orval emits invalidate helpers in this project); if not, invalidate via `queryClient.invalidateQueries({ queryKey: getKdsControllerGetTicketsQueryKey() })`.
