import { Test } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { BillingService } from './billing.service';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';

const prismaMockBase = {
  order: {
    findUnique: jest.fn(),
  },
  bill: {
    create: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  payment: {
    create: jest.fn(),
  },
};

const prismaMock = {
  ...prismaMockBase,
  $transaction: jest.fn((cb: (tx: typeof prismaMockBase) => unknown) => cb(prismaMockBase)),
};

describe('BillingService', () => {
  let service: BillingService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [BillingService, { provide: PrismaService, useValue: prismaMock }],
    }).compile();

    service = module.get(BillingService);
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('calculates totals correctly', async () => {
      const mockOrder = {
        id: 'order-1',
        status: 'in_progress',
        bill: null,
        items: [
          {
            id: 'item-1',
            quantity: 2,
            unitPrice: 0,
            menuItem: {
              id: 'menu-1',
              price: new Prisma.Decimal('10.00'),
            },
            modifiers: [],
          },
          {
            id: 'item-2',
            quantity: 1,
            unitPrice: 0,
            menuItem: {
              id: 'menu-2',
              price: new Prisma.Decimal('5.00'),
            },
            modifiers: [],
          },
        ],
      };

      const fakeBill = {
        id: 'bill-1',
        orderId: 'order-1',
        subtotal: new Prisma.Decimal('25.00'),
        discountPct: new Prisma.Decimal('20'),
        tax: new Prisma.Decimal('2.00'),
        total: new Prisma.Decimal('22.00'),
        paid: false,
        paidAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      prismaMock.order.findUnique.mockResolvedValue(mockOrder);
      prismaMock.bill.create.mockResolvedValue(fakeBill);

      await service.create({ orderId: 'order-1', discountPct: 20 });

      expect(prismaMock.bill.create).toHaveBeenCalled();
      const callData = prismaMock.bill.create.mock.calls[0][0].data;

      expect(callData.orderId).toBe('order-1');
      expect(callData.discountPct).toBe(20);
    });

    it('throws ConflictException if bill already exists', async () => {
      const mockOrder = {
        id: 'order-1',
        status: 'in_progress',
        bill: { id: 'existing-bill' },
        items: [],
      };

      prismaMock.order.findUnique.mockResolvedValue(mockOrder);

      await expect(service.create({ orderId: 'order-1', discountPct: 0 })).rejects.toThrow(
        ConflictException,
      );

      expect(prismaMock.bill.create).not.toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('throws NotFoundException for unknown id', async () => {
      prismaMock.bill.findUnique.mockResolvedValue(null);

      await expect(service.findOne('nonexistent-id')).rejects.toThrow(NotFoundException);
    });
  });

  it('subtotal includes modifier deltas using snapshot unitPrice', async () => {
    prismaMock.order.findUnique.mockResolvedValue({
      id: 'o1',
      status: 'served',
      bill: null,
      items: [
        { quantity: 2, unitPrice: 20, menuItem: { price: 99 }, modifiers: [{ priceDelta: 3 }] },
      ],
    });
    prismaMock.bill.create.mockImplementation(({ data }) => Promise.resolve(data));
    const bill = await service.create({ orderId: 'o1', discountPct: 0 });

    expect(Number(bill.subtotal)).toBe(46);
  });

  describe('recordPayment', () => {
    const unpaidBill = {
      id: 'bill-1',
      orderId: 'order-1',
      subtotal: new Prisma.Decimal('20.00'),
      discountPct: new Prisma.Decimal('0'),
      tax: new Prisma.Decimal('2.00'),
      total: new Prisma.Decimal('22.00'),
      paid: false,
      paidAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      payments: [],
    };

    it('records a partial payment and leaves the bill unpaid', async () => {
      prismaMock.bill.findUnique.mockResolvedValueOnce(unpaidBill).mockResolvedValueOnce({
        ...unpaidBill,
        payments: [{ amount: new Prisma.Decimal('10.00') }],
      });
      prismaMock.payment.create.mockResolvedValue({
        id: 'p1',
        billId: 'bill-1',
        amount: new Prisma.Decimal('10.00'),
        method: 'cash',
        createdAt: new Date(),
      });

      const result = await service.recordPayment('bill-1', { amount: 10, method: 'cash' });

      expect(prismaMock.bill.update).not.toHaveBeenCalled();
      expect(result.amountPaid).toBe(10);
      expect(result.remaining).toBe(12);
      expect(result.paid).toBe(false);
    });

    it('marks the bill paid once payments cover the total', async () => {
      prismaMock.bill.findUnique
        .mockResolvedValueOnce({
          ...unpaidBill,
          payments: [{ amount: new Prisma.Decimal('12.00') }],
        })
        .mockResolvedValueOnce({
          ...unpaidBill,
          paid: true,
          paidAt: new Date(),
          payments: [
            { amount: new Prisma.Decimal('12.00') },
            { amount: new Prisma.Decimal('10.00') },
          ],
        });
      prismaMock.payment.create.mockResolvedValue({
        id: 'p2',
        billId: 'bill-1',
        amount: new Prisma.Decimal('10.00'),
        method: 'card',
        createdAt: new Date(),
      });
      prismaMock.bill.update.mockResolvedValue({ ...unpaidBill, paid: true, paidAt: new Date() });

      const result = await service.recordPayment('bill-1', { amount: 10, method: 'card' });

      expect(prismaMock.bill.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'bill-1' },
          data: expect.objectContaining({ paid: true }),
        }),
      );
      expect(result.remaining).toBe(0);
    });

    it('throws ConflictException when the bill is already paid', async () => {
      prismaMock.bill.findUnique.mockResolvedValue({
        ...unpaidBill,
        paid: true,
        paidAt: new Date(),
      });

      await expect(service.recordPayment('bill-1', { amount: 5, method: 'cash' })).rejects.toThrow(
        ConflictException,
      );
      expect(prismaMock.payment.create).not.toHaveBeenCalled();
    });

    it('writes the payment and the paid-flip inside a single transaction', async () => {
      prismaMock.bill.findUnique
        .mockResolvedValueOnce({
          ...unpaidBill,
          payments: [{ amount: new Prisma.Decimal('20.00') }],
        })
        .mockResolvedValueOnce({
          ...unpaidBill,
          paid: true,
          payments: [
            { amount: new Prisma.Decimal('20.00') },
            { amount: new Prisma.Decimal('2.00') },
          ],
        });
      prismaMock.payment.create.mockResolvedValue({
        id: 'p3',
        billId: 'bill-1',
        amount: new Prisma.Decimal('2.00'),
        method: 'cash',
        createdAt: new Date(),
      });
      prismaMock.bill.update.mockResolvedValue({ ...unpaidBill, paid: true });

      await service.recordPayment('bill-1', { amount: 2, method: 'cash' });

      expect(prismaMock.$transaction).toHaveBeenCalledTimes(1);
      const order = [prismaMock.payment.create, prismaMock.bill.update].map(
        (fn) => fn.mock.invocationCallOrder[0],
      );

      expect(order[0]).toBeLessThan(order[1]);
    });
  });
});
