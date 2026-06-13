import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import type { CreateOrderDto, UpdateOrderStatusDto, UpdateOrderItemStatusDto } from '@restaurant/shared'
import { NotificationsService } from '../notifications/notifications.service'

const WITH_ITEMS = { items: { orderBy: { id: 'asc' as const } } }

@Injectable()
export class OrderService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  findAll(status?: string) {
    return this.prisma.order.findMany({
      where: status ? { status: status as never } : undefined,
      include: WITH_ITEMS,
      orderBy: { createdAt: 'desc' },
    })
  }

  async findOne(id: string) {
    const order = await this.prisma.order.findUnique({ where: { id }, include: WITH_ITEMS })
    if (!order) throw new NotFoundException('Order not found')
    return order
  }

  async create(dto: CreateOrderDto, staffId: string) {
    const order = await this.prisma.order.create({
      data: {
        tableId: dto.tableId,
        staffId,
        notes: dto.notes ?? null,
        items: {
          create: dto.items.map(i => ({
            menuItemId: i.menuItemId,
            quantity: i.quantity,
            notes: i.notes ?? null,
          })),
        },
      },
      include: WITH_ITEMS,
    })
    const table = await this.prisma.table.findUnique({ where: { id: dto.tableId } })
    await this.notifications.sendToRole('kitchen', {
      title: 'New Order',
      body: `New order received for Table ${table?.number ?? '?'}`,
    })
    return order
  }

  async updateStatus(id: string, dto: UpdateOrderStatusDto) {
    const existing = await this.findOne(id)
    const order = await this.prisma.order.update({
      where: { id },
      data: { status: dto.status as never },
      include: WITH_ITEMS,
    })
    if (dto.status === 'ready') {
      const table = await this.prisma.table.findUnique({ where: { id: existing.tableId } })
      await this.notifications.sendToStaff(existing.staffId, {
        title: 'Order Ready',
        body: `Table ${table?.number ?? '?'} order is ready to serve`,
      })
    }
    return order
  }

  async updateItemStatus(orderId: string, itemId: string, dto: UpdateOrderItemStatusDto) {
    await this.findOne(orderId)
    const item = await this.prisma.orderItem.findUnique({ where: { id: itemId } })
    if (!item || item.orderId !== orderId) throw new NotFoundException('Order item not found')
    return this.prisma.orderItem.update({ where: { id: itemId }, data: { status: dto.status as never } })
  }

  async remove(id: string) {
    await this.findOne(id)
    return this.prisma.order.delete({ where: { id } })
  }
}
