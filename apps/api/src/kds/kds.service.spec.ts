import { Test } from '@nestjs/testing';
import { KdsService } from './kds.service';
import { PrismaService } from '../prisma/prisma.service';

const prismaMock = { order: { findMany: jest.fn() } };

describe('KdsService', () => {
  let service: KdsService;
  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [KdsService, { provide: PrismaService, useValue: prismaMock }],
    }).compile();
    service = module.get(KdsService);
    jest.clearAllMocks();
  });

  it('queries only active orders oldest-first and maps the ticket shape', async () => {
    const sentAt = new Date('2026-01-01T10:00:00Z');
    prismaMock.order.findMany.mockResolvedValue([
      { id: 'o1', sentAt, table: { number: 5 },
        items: [{ id: 'i1', quantity: 2, status: 'pending', menuItem: { name: 'Steak', station: 'grill' }, modifiers: [{ name: 'Rare' }] }] },
    ]);
    const tickets = await service.getTickets();
    expect(prismaMock.order.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { status: { in: ['sent', 'in_progress'] } }, orderBy: { sentAt: 'asc' } }),
    );
    expect(tickets).toEqual([
      { orderId: 'o1', tableNumber: 5, firedAt: sentAt,
        items: [{ id: 'i1', name: 'Steak', quantity: 2, station: 'grill', status: 'pending', modifiers: ['Rare'] }] },
    ]);
  });

  it('handles null table, null station, and no modifiers', async () => {
    prismaMock.order.findMany.mockResolvedValue([
      { id: 'o2', sentAt: null, table: null,
        items: [{ id: 'i2', quantity: 1, status: 'in_progress', menuItem: { name: 'Water', station: null }, modifiers: [] }] },
    ]);
    const [t] = await service.getTickets();
    expect(t.tableNumber).toBeNull();
    expect(t.items[0].station).toBeNull();
    expect(t.items[0].modifiers).toEqual([]);
  });
});
