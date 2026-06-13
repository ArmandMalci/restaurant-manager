import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import type { Bill } from '@prisma/client'
import type { CreateBillDto } from './dto/billing.dto'

@Injectable()
export class BillingService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateBillDto): Promise<Bill> {
    const { orderId, discountPct = 0 } = dto

    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        bill: true,
        items: {
          include: {
            menuItem: true,
          },
        },
      },
    })

    if (!order) {
      throw new NotFoundException(`Order ${orderId} not found`)
    }

    if (order.bill) {
      throw new ConflictException(`Order ${orderId} already has a bill`)
    }

    const billableStatuses = ['in_progress', 'ready', 'served']
    if (!billableStatuses.includes(order.status)) {
      throw new UnprocessableEntityException(
        `Cannot bill an order with status '${order.status}'`,
      )
    }

    const subtotal = order.items.reduce((sum, item) => {
      return sum + item.quantity * Number(item.menuItem.price)
    }, 0)

    const afterDiscount = subtotal * (1 - discountPct / 100)
    const tax = afterDiscount * 0.1
    const total = afterDiscount + tax

    return this.prisma.bill.create({
      data: {
        orderId,
        subtotal,
        discountPct,
        tax,
        total,
      },
    })
  }

  async findOne(id: string): Promise<Bill> {
    const bill = await this.prisma.bill.findUnique({ where: { id } })

    if (!bill) {
      throw new NotFoundException(`Bill ${id} not found`)
    }

    return bill
  }

  async pay(id: string): Promise<Bill> {
    const bill = await this.findOne(id)

    if (bill.paid) {
      throw new ConflictException(`Bill ${id} is already paid`)
    }

    return this.prisma.bill.update({
      where: { id },
      data: { paid: true, paidAt: new Date() },
    })
  }
}
