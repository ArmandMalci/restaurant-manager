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
