import { Test } from '@nestjs/testing';
import { ReportsService } from './reports.service';
import { PrismaService } from '../prisma/prisma.service';

const prismaMock = {
  order: { groupBy: jest.fn() },
  table: { groupBy: jest.fn() },
  reservation: { count: jest.fn() },
  orderItem: { groupBy: jest.fn() },
  menuItem: { findMany: jest.fn() },
};

describe('ReportsService', () => {
  let service: ReportsService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [ReportsService, { provide: PrismaService, useValue: prismaMock }],
    }).compile();

    service = module.get(ReportsService);
    jest.clearAllMocks();
  });

  describe('getSummary', () => {
    it('returns aggregated summary with correct shape', async () => {
      prismaMock.order.groupBy.mockResolvedValue([
        { status: 'draft', _count: { id: 3 } },
        { status: 'served', _count: { id: 10 } },
      ]);
      prismaMock.table.groupBy.mockResolvedValue([
        { status: 'available', _count: { id: 5 } },
        { status: 'occupied', _count: { id: 2 } },
      ]);
      prismaMock.reservation.count.mockResolvedValue(4);
      prismaMock.orderItem.groupBy.mockResolvedValue([
        { menuItemId: 'mi-1', _sum: { quantity: 20 } },
        { menuItemId: 'mi-2', _sum: { quantity: 15 } },
      ]);
      prismaMock.menuItem.findMany.mockResolvedValue([
        { id: 'mi-1', name: 'Burger' },
        { id: 'mi-2', name: 'Fries' },
      ]);

      const result = await service.getSummary();

      expect(result.ordersByStatus).toEqual({ draft: 3, served: 10 });
      expect(result.tablesByStatus).toEqual({ available: 5, occupied: 2 });
      expect(result.reservationsToday).toBe(4);
      expect(result.topItems).toEqual([
        { menuItemId: 'mi-1', name: 'Burger', totalQuantity: 20 },
        { menuItemId: 'mi-2', name: 'Fries', totalQuantity: 15 },
      ]);
    });

    it('returns empty topItems and skips menuItem query when no order items', async () => {
      prismaMock.order.groupBy.mockResolvedValue([]);
      prismaMock.table.groupBy.mockResolvedValue([]);
      prismaMock.reservation.count.mockResolvedValue(0);
      prismaMock.orderItem.groupBy.mockResolvedValue([]);

      const result = await service.getSummary();

      expect(result.topItems).toEqual([]);
      expect(prismaMock.menuItem.findMany).not.toHaveBeenCalled();
    });

    it('uses "Unknown" for missing menu item names', async () => {
      prismaMock.order.groupBy.mockResolvedValue([]);
      prismaMock.table.groupBy.mockResolvedValue([]);
      prismaMock.reservation.count.mockResolvedValue(0);
      prismaMock.orderItem.groupBy.mockResolvedValue([
        { menuItemId: 'gone', _sum: { quantity: 5 } },
      ]);
      prismaMock.menuItem.findMany.mockResolvedValue([]);

      const result = await service.getSummary();

      expect(result.topItems[0].name).toBe('Unknown');
    });
  });
});
