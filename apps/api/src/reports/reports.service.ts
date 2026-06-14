import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

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
}
