import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const DAY_MS = 86_400_000;
const MAX_RANGE_DAYS = 92;

@Injectable()
export class ReportsService {
  public constructor(private readonly prisma: PrismaService) {}

  public async getSummary() {
    const todayStart = new Date();

    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(todayStart.getTime() + 86_400_000);

    const [ordersByStatus, tablesByStatus, reservationsToday, topItemRows] = await Promise.all([
      this.prisma.order.groupBy({ by: ['status'], _count: { id: true } }),
      this.prisma.table.groupBy({ by: ['status'], _count: { id: true } }),
      this.prisma.reservation.count({ where: { date: { gte: todayStart, lt: todayEnd } } }),
      this.prisma.orderItem.groupBy({
        by: ['menuItemId'],
        _sum: { quantity: true },
        orderBy: { _sum: { quantity: 'desc' } },
        take: 5,
      }),
    ]);

    const menuItemIds = topItemRows.map((r) => r.menuItemId);
    const menuItems = menuItemIds.length
      ? await this.prisma.menuItem.findMany({
          where: { id: { in: menuItemIds } },
          select: { id: true, name: true },
        })
      : [];

    const nameById = Object.fromEntries(menuItems.map((m) => [m.id, m.name]));
    const topItems = topItemRows.map((r) => ({
      menuItemId: r.menuItemId,
      name: nameById[r.menuItemId] ?? 'Unknown',
      totalQuantity: r._sum.quantity ?? 0,
    }));

    return {
      ordersByStatus: Object.fromEntries(ordersByStatus.map((r) => [r.status, r._count.id])),
      tablesByStatus: Object.fromEntries(tablesByStatus.map((r) => [r.status, r._count.id])),
      reservationsToday,
      topItems,
    };
  }

  public async getDaily(from: string, to: string) {
    const start = new Date(from);
    const end = new Date(to);

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      throw new BadRequestException('from/to must be valid dates (YYYY-MM-DD)');
    }
    if (start > end) {
      throw new BadRequestException('from must not be after to');
    }

    const spanDays = Math.round((end.getTime() - start.getTime()) / DAY_MS) + 1;

    if (spanDays > MAX_RANGE_DAYS) {
      throw new BadRequestException(`Range too large: max ${MAX_RANGE_DAYS} days`);
    }

    // ponytail: simple per-day loop, not a $queryRaw date_trunc aggregate — the
    // capped range keeps this bounded (<=92 days * 3 queries). Reach for raw SQL
    // only if profiling shows this matters.
    const dayStarts = Array.from(
      { length: spanDays },
      (_, i) => new Date(start.getTime() + i * DAY_MS),
    );

    return Promise.all(
      dayStarts.map(async (dayStart) => {
        const dayEnd = new Date(dayStart.getTime() + DAY_MS);
        const [orderCount, revenue, reservationCount] = await Promise.all([
          this.prisma.order.count({ where: { createdAt: { gte: dayStart, lt: dayEnd } } }),
          this.prisma.bill.aggregate({
            _sum: { total: true },
            where: { paid: true, paidAt: { gte: dayStart, lt: dayEnd } },
          }),
          this.prisma.reservation.count({ where: { date: { gte: dayStart, lt: dayEnd } } }),
        ]);

        return {
          date: dayStart.toISOString().slice(0, 10),
          orderCount,
          revenue: Number(revenue._sum.total ?? 0),
          reservationCount,
        };
      }),
    );
  }
}
