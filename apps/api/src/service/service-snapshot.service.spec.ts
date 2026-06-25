import { Test } from '@nestjs/testing';
import { ServiceSnapshotService } from './service-snapshot.service';
import { PrismaService } from '../prisma/prisma.service';
import { InventoryService } from '../inventory/inventory.service';

const minsAgo = (m: number) => new Date(Date.now() - m * 60_000);

const prismaMock = {
  table: { findMany: jest.fn() },
  order: { findMany: jest.fn() },
  reservation: { findMany: jest.fn() },
};
const inventoryMock = { findAll: jest.fn() };

describe('ServiceSnapshotService', () => {
  let service: ServiceSnapshotService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        ServiceSnapshotService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: InventoryService, useValue: inventoryMock },
      ],
    }).compile();

    service = module.get(ServiceSnapshotService);
    jest.clearAllMocks();
    prismaMock.table.findMany.mockResolvedValue([]);
    prismaMock.order.findMany.mockResolvedValue([]);
    prismaMock.reservation.findMany.mockResolvedValue([]);
    inventoryMock.findAll.mockResolvedValue([]);
  });

  it('computes covers seated and capacity from tables', async () => {
    prismaMock.table.findMany.mockResolvedValue([
      { id: 't1', number: 1, seats: 2, status: 'occupied', seatedAt: minsAgo(5) },
      { id: 't2', number: 2, seats: 4, status: 'available', seatedAt: null },
    ]);
    const snap = await service.getSnapshot();

    expect(snap.pulse.coversSeated).toBe(2);
    expect(snap.pulse.capacity).toBe(6);
    expect(snap.pulse.tablesOccupied).toBe(1);
  });

  it('emits an order-ready alert for a ready order', async () => {
    prismaMock.order.findMany.mockResolvedValue([
      {
        id: 'o1',
        tableId: 't1',
        status: 'ready',
        readyAt: minsAgo(2),
        table: { number: 6 },
        items: [{ quantity: 1, menuItem: { name: 'Carbonara' } }],
      },
    ]);
    const snap = await service.getSnapshot();
    const a = snap.attention.find((x) => x.type === 'order-ready');

    expect(a).toBeDefined();
    expect(a!.tone).toBe('success');
    expect(a!.title).toContain('6');
  });

  it('emits table-waiting only past the threshold with no active order', async () => {
    prismaMock.table.findMany.mockResolvedValue([
      { id: 't1', number: 1, seats: 2, status: 'occupied', seatedAt: minsAgo(11) },
    ]);
    prismaMock.order.findMany.mockResolvedValue([]); // no active order for t1
    const snap = await service.getSnapshot();

    expect(snap.attention.some((x) => x.type === 'table-waiting')).toBe(true);
  });

  it('does NOT emit table-waiting under the threshold', async () => {
    prismaMock.table.findMany.mockResolvedValue([
      { id: 't1', number: 1, seats: 2, status: 'occupied', seatedAt: minsAgo(9) },
    ]);
    const snap = await service.getSnapshot();

    expect(snap.attention.some((x) => x.type === 'table-waiting')).toBe(false);
  });

  it('emits low-stock alerts from inventory', async () => {
    inventoryMock.findAll.mockResolvedValue([
      { id: 'i1', name: 'Flour', quantity: 1, unit: 'kg', lowStock: true },
      { id: 'i2', name: 'Eggs', quantity: 99, unit: 'unit', lowStock: false },
    ]);
    const snap = await service.getSnapshot();
    const lows = snap.attention.filter((x) => x.type === 'low-stock');

    expect(lows).toHaveLength(1);
    expect(lows[0].tone).toBe('destructive');
  });
});
