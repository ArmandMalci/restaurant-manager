import { Test } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { BillingService } from './billing.service';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';

const prismaMock = {
  order: {
    findUnique: jest.fn(),
  },
  bill: {
    create: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
  },
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
            menuItem: {
              id: 'menu-1',
              price: new Prisma.Decimal('10.00'),
            },
          },
          {
            id: 'item-2',
            quantity: 1,
            menuItem: {
              id: 'menu-2',
              price: new Prisma.Decimal('5.00'),
            },
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

  describe('pay', () => {
    it('throws ConflictException when bill is already paid', async () => {
      const paidBill = {
        id: 'bill-1',
        orderId: 'order-1',
        subtotal: new Prisma.Decimal('25.00'),
        discountPct: new Prisma.Decimal('0'),
        tax: new Prisma.Decimal('2.50'),
        total: new Prisma.Decimal('27.50'),
        paid: true,
        paidAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      prismaMock.bill.findUnique.mockResolvedValue(paidBill);

      await expect(service.pay('bill-1')).rejects.toThrow(ConflictException);

      expect(prismaMock.bill.update).not.toHaveBeenCalled();
    });
  });
});
