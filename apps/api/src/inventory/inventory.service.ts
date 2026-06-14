import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import type {
  CreateInventoryItemDto,
  UpdateInventoryItemDto,
  AdjustInventoryDto,
} from '@restaurant/shared';

@Injectable()
export class InventoryService {
  public constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  public async findAll() {
    const items = await this.prisma.inventoryItem.findMany({ orderBy: { name: 'asc' } });

    return items.map((item) => ({
      ...item,
      lowStock: Number(item.quantity) <= Number(item.minStock),
    }));
  }

  public async findOne(id: string) {
    const item = await this.prisma.inventoryItem.findUnique({ where: { id } });

    if (!item) throw new NotFoundException('Inventory item not found');

    return { ...item, lowStock: Number(item.quantity) <= Number(item.minStock) };
  }

  public async create(dto: CreateInventoryItemDto) {
    const item = await this.prisma.inventoryItem.create({ data: dto });

    return { ...item, lowStock: Number(item.quantity) <= Number(item.minStock) };
  }

  public async update(id: string, dto: UpdateInventoryItemDto) {
    await this.findOne(id);
    const item = await this.prisma.inventoryItem.update({ where: { id }, data: dto });

    return { ...item, lowStock: Number(item.quantity) <= Number(item.minStock) };
  }

  public async remove(id: string) {
    await this.findOne(id);
    await this.prisma.inventoryItem.delete({ where: { id } });
  }

  public async adjust(id: string, dto: AdjustInventoryDto) {
    await this.findOne(id);
    await this.prisma.inventoryItem.update({
      where: { id },
      data: { quantity: { increment: dto.delta } },
    });
    const item = await this.findOne(id);

    if (item.lowStock) {
      await this.notifications.sendToRole('manager', {
        title: 'Low Stock Alert',
        body: `${item.name} is running low (${item.quantity} ${item.unit} remaining)`,
      });
    }

    return item;
  }
}
