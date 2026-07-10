import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { Bill, Payment } from '@prisma/client';
import type { CreateBillDto, CreatePaymentDto } from './dto/billing.dto';

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
            modifiers: true,
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
      const base =
        Number(item.unitPrice) > 0
          ? new Prisma.Decimal(item.unitPrice)
          : new Prisma.Decimal(item.menuItem.price);
      const delta = item.modifiers.reduce(
        (d, m) => d.plus(new Prisma.Decimal(m.priceDelta)),
        new Prisma.Decimal(0),
      );

      return sum.plus(new Prisma.Decimal(item.quantity).times(base.plus(delta)));
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

  public async findOne(
    id: string,
  ): Promise<Bill & { payments: Payment[]; amountPaid: number; remaining: number }> {
    const bill = await this.prisma.bill.findUnique({ where: { id }, include: { payments: true } });

    if (!bill) throw new NotFoundException(`Bill ${id} not found`);

    const amountPaid = bill.payments.reduce(
      (s, p) => s.plus(new Prisma.Decimal(p.amount)),
      new Prisma.Decimal(0),
    );

    return {
      ...bill,
      amountPaid: amountPaid.toNumber(),
      remaining: Prisma.Decimal.max(0, new Prisma.Decimal(bill.total).minus(amountPaid)).toNumber(),
    };
  }

  public async recordPayment(id: string, dto: CreatePaymentDto) {
    const bill = await this.prisma.bill.findUnique({ where: { id }, include: { payments: true } });

    if (!bill) throw new NotFoundException(`Bill ${id} not found`);
    if (bill.paid) throw new ConflictException(`Bill ${id} is already paid`);

    // Decimal end-to-end: no JS Number/float touches the paid-flip decision.
    const existingPaid = bill.payments.reduce(
      (s, p) => s.plus(new Prisma.Decimal(p.amount)),
      new Prisma.Decimal(0),
    );
    const amountPaid = existingPaid.plus(new Prisma.Decimal(dto.amount));
    const shouldMarkPaid = amountPaid.greaterThanOrEqualTo(new Prisma.Decimal(bill.total));

    await this.prisma.$transaction(async (tx) => {
      await tx.payment.create({ data: { billId: id, amount: dto.amount, method: dto.method } });

      if (shouldMarkPaid) {
        await tx.bill.update({ where: { id }, data: { paid: true, paidAt: new Date() } });
      }
    });

    return this.findOne(id);
  }
}
