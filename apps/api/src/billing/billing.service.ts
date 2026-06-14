import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { Bill } from '@prisma/client';
import type { CreateBillDto } from './dto/billing.dto';

@Injectable()
export class BillingService {
  public constructor(private readonly prisma: PrismaService) {}

  public async create(dto: CreateBillDto): Promise<Bill> {
    const { orderId, discountPct = 0 } = dto;

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
    });

    if (!order) {
      throw new NotFoundException(`Order ${orderId} not found`);
    }

    if (order.bill) {
      throw new ConflictException(`Order ${orderId} already has a bill`);
    }

    const billableStatuses = ['in_progress', 'ready', 'served'];

    if (!billableStatuses.includes(order.status)) {
      throw new UnprocessableEntityException(`Cannot bill an order with status '${order.status}'`);
    }

    const subtotal = order.items.reduce((sum, item) => {
      return sum.plus(new Prisma.Decimal(item.quantity).times(item.menuItem.price));
    }, new Prisma.Decimal(0));

    const discountPctDecimal = new Prisma.Decimal(discountPct);
    const afterDiscount = subtotal.times(
      new Prisma.Decimal(1).minus(discountPctDecimal.dividedBy(100)),
    );
    const tax = afterDiscount.times(new Prisma.Decimal('0.1'));
    const total = afterDiscount.plus(tax);

    return this.prisma.bill.create({
      data: {
        orderId,
        subtotal,
        discountPct,
        tax,
        total,
      },
    });
  }

  public async findOne(id: string): Promise<Bill> {
    const bill = await this.prisma.bill.findUnique({ where: { id } });

    if (!bill) {
      throw new NotFoundException(`Bill ${id} not found`);
    }

    return bill;
  }

  public async pay(id: string): Promise<Bill> {
    const bill = await this.findOne(id);

    if (bill.paid) {
      throw new ConflictException(`Bill ${id} is already paid`);
    }

    return this.prisma.bill.update({
      where: { id },
      data: { paid: true, paidAt: new Date() },
    });
  }
}
