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

const minsSince = (d: Date | string, now: number) =>
  Math.round((now - new Date(d).getTime()) / 60_000);

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
      .map(
        (o) =>
          (new Date(o.servedAt as Date).getTime() - new Date(o.sentAt as Date).getTime()) / 60_000,
      );
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
      const names = o.items
        .map((i) => i.menuItem?.name)
        .filter(Boolean)
        .join(', ');

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
