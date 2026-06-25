import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type {
  CreateOrderDto,
  UpdateOrderStatusDto,
  UpdateOrderItemStatusDto,
} from '@restaurant/shared';
import { NotificationsService } from '../notifications/notifications.service';

const WITH_ITEMS = { items: { orderBy: { id: 'asc' as const } } };

@Injectable()
export class OrderService {
  public constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  public findAll(status?: string) {
    return this.prisma.order.findMany({
      where: status ? { status: status as never } : undefined,
      include: WITH_ITEMS,
      orderBy: { createdAt: 'desc' },
    });
  }

  public async findOne(id: string) {
    const order = await this.prisma.order.findUnique({ where: { id }, include: WITH_ITEMS });

    if (!order) throw new NotFoundException('Order not found');

    return order;
  }

  public async create(dto: CreateOrderDto, staffId: string) {
    const order = await this.prisma.order.create({
      data: {
        tableId: dto.tableId,
        staffId,
        notes: dto.notes ?? null,
        items: {
          create: dto.items.map((i) => ({
            menuItemId: i.menuItemId,
            quantity: i.quantity,
            notes: i.notes ?? null,
          })),
        },
      },
      include: WITH_ITEMS,
    });
    const table = await this.prisma.table.findUnique({ where: { id: dto.tableId } });

    await this.notifications.sendToRole('kitchen', {
      title: 'New Order',
      body: `New order received for Table ${table?.number ?? '?'}`,
    });

    return order;
  }

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
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: WITH_ITEMS,
    });

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

  public async remove(id: string) {
    await this.findOne(id);

    return this.prisma.order.delete({ where: { id } });
  }
}
