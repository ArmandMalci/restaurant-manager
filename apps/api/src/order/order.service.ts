import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type {
  AddOrderItemsDto,
  CreateOrderDto,
  CreateOrderItemDto,
  UpdateOrderStatusDto,
  UpdateOrderItemStatusDto,
} from '@restaurant/shared';
import { NotificationsService } from '../notifications/notifications.service';

const WITH_ITEMS = { items: { orderBy: { id: 'asc' as const }, include: { modifiers: true } } };

@Injectable()
export class OrderService {
  public constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  public findAll(status?: string) {
    return this.prisma.order.findMany({
      where: status ? { status: status as never } : undefined,
      include: { ...WITH_ITEMS, bill: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  public async findOne(id: string) {
    const order = await this.prisma.order.findUnique({ where: { id }, include: WITH_ITEMS });

    if (!order) throw new NotFoundException('Order not found');

    return order;
  }

  public async create(dto: CreateOrderDto, staffId: string) {
    const itemsCreate = await this.buildItemsCreateData(dto.items);

    const order = await this.prisma.order.create({
      data: {
        tableId: dto.tableId,
        staffId,
        notes: dto.notes ?? null,
        items: { create: itemsCreate },
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

  public async addItems(orderId: string, dto: AddOrderItemsDto) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { bill: true },
    });

    if (!order) throw new NotFoundException('Order not found');
    // Bill totals are a one-time snapshot — appending after billing would under-bill the guest.
    if (order.bill)
      throw new ConflictException(
        `Order ${orderId} already has a bill and cannot accept new items`,
      );

    const itemsCreate = await this.buildItemsCreateData(dto.items);
    const pastDraft = order.status !== 'draft';
    const now = new Date();

    const data: Record<string, unknown> = {
      items: {
        create: pastDraft ? itemsCreate.map((item) => ({ ...item, firedAt: now })) : itemsCreate,
      },
    };

    // promoteIfAllItemsReady early-returns for ready/served, so a freshly-added
    // pending item would otherwise leave the order falsely "ready".
    if (order.status === 'ready' || order.status === 'served') {
      data.status = 'in_progress' as never;
    }

    const updated = await this.prisma.order.update({
      where: { id: orderId },
      data,
      include: WITH_ITEMS,
    });

    if (pastDraft) {
      const table = await this.prisma.table.findUnique({ where: { id: order.tableId } });

      await this.notifications.sendToRole('kitchen', {
        title: 'Order Updated',
        body: `New items added to Table ${table?.number ?? '?'}'s order`,
      });
    }

    return updated;
  }

  private async buildItemsCreateData(items: CreateOrderItemDto[]) {
    const menuItemIds = [...new Set(items.map((i) => i.menuItemId))];
    const menuItems = await this.prisma.menuItem.findMany({
      where: { id: { in: menuItemIds } },
      include: { modifierGroups: { include: { modifierGroup: { include: { options: true } } } } },
    });
    const byId = new Map(menuItems.map((m) => [m.id, m]));

    return items.map((i) => {
      const mi = byId.get(i.menuItemId);

      if (!mi) throw new BadRequestException(`Menu item ${i.menuItemId} not found`);

      const groups = mi.modifierGroups.map((mg) => mg.modifierGroup);
      const optionById = new Map(groups.flatMap((g) => g.options).map((o) => [o.id, o]));
      const chosen = i.modifierOptionIds ?? [];

      for (const oid of chosen) {
        if (!optionById.has(oid))
          throw new BadRequestException(`Option ${oid} is not valid for ${mi.name}`);
      }
      for (const g of groups) {
        const inGroup = g.options.filter((o) => chosen.includes(o.id));

        if (g.required && inGroup.length === 0)
          throw new BadRequestException(`"${g.name}" is required for ${mi.name}`);
        if (g.selectionType === 'single' && inGroup.length > 1)
          throw new BadRequestException(`Choose one for "${g.name}"`);
      }

      return {
        menuItemId: i.menuItemId,
        quantity: i.quantity,
        notes: i.notes ?? null,
        unitPrice: mi.price,
        modifiers: {
          create: chosen.map((oid) => {
            const o = optionById.get(oid);

            if (!o) throw new BadRequestException(`Option ${oid} is not valid for ${mi.name}`);

            return { modifierOptionId: oid, name: o.name, priceDelta: o.priceDelta };
          }),
        },
      };
    });
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
