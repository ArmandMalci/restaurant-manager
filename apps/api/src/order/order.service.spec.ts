import { Test } from '@nestjs/testing';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { OrderService } from './order.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

const mockItem = {
  id: 'item-1',
  orderId: 'ord-1',
  menuItemId: 'mi-1',
  quantity: 2,
  status: 'pending',
  notes: null,
};
const mockOrder = {
  id: 'ord-1',
  tableId: 'tbl-1',
  staffId: 'staff-1',
  status: 'draft',
  notes: null,
  items: [mockItem],
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockNotifications = {
  sendToRole: jest.fn().mockResolvedValue(undefined),
  sendToStaff: jest.fn().mockResolvedValue(undefined),
};

const prismaMock = {
  order: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  orderItem: {
    findUnique: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
  },
  table: {
    findUnique: jest.fn(),
  },
  menuItem: {
    findMany: jest.fn(),
  },
};

describe('OrderService', () => {
  let service: OrderService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        OrderService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: NotificationsService, useValue: mockNotifications },
      ],
    }).compile();

    service = module.get(OrderService);
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('returns all orders when no filter', async () => {
      prismaMock.order.findMany.mockResolvedValue([mockOrder]);
      const result = await service.findAll();

      expect(result).toEqual([mockOrder]);
      expect(prismaMock.order.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: undefined }),
      );
    });

    it('filters by status when provided', async () => {
      prismaMock.order.findMany.mockResolvedValue([mockOrder]);
      await service.findAll('draft');
      expect(prismaMock.order.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { status: 'draft' } }),
      );
    });

    it('includes the bill relation so callers can derive settled-ness', async () => {
      prismaMock.order.findMany.mockResolvedValue([mockOrder]);
      await service.findAll();
      expect(prismaMock.order.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ include: expect.objectContaining({ bill: true }) }),
      );
    });
  });

  describe('findOne', () => {
    it('returns order when found', async () => {
      prismaMock.order.findUnique.mockResolvedValue(mockOrder);
      expect(await service.findOne('ord-1')).toEqual(mockOrder);
    });

    it('throws NotFoundException when not found', async () => {
      prismaMock.order.findUnique.mockResolvedValue(null);
      await expect(service.findOne('missing')).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('creates order with items for the authenticated staff', async () => {
      prismaMock.menuItem.findMany.mockResolvedValue([
        { id: 'mi-1', price: 2, modifierGroups: [] },
      ]);
      prismaMock.order.create.mockResolvedValue(mockOrder);
      prismaMock.table.findUnique.mockResolvedValue({ id: 'tbl-1', number: 1 });
      const dto = {
        tableId: 'tbl-1',
        notes: null,
        items: [{ menuItemId: 'mi-1', quantity: 2, notes: null, modifierOptionIds: [] }],
      };
      const result = await service.create(dto, 'staff-1');

      expect(result).toEqual(mockOrder);
      expect(prismaMock.order.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ staffId: 'staff-1' }) }),
      );
    });
  });

  describe('updateStatus', () => {
    it('updates order status when order exists', async () => {
      prismaMock.order.findUnique.mockResolvedValue(mockOrder);
      prismaMock.order.update.mockResolvedValue({ ...mockOrder, status: 'sent' });
      const result = await service.updateStatus('ord-1', { status: 'sent' });

      expect(result.status).toBe('sent');
    });

    it('throws NotFoundException when order missing', async () => {
      prismaMock.order.findUnique.mockResolvedValue(null);
      await expect(service.updateStatus('x', { status: 'sent' })).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('updateItemStatus', () => {
    it('updates item status when item belongs to order', async () => {
      prismaMock.order.findUnique.mockResolvedValue(mockOrder);
      prismaMock.orderItem.findUnique.mockResolvedValue(mockItem);
      prismaMock.orderItem.update.mockResolvedValue({ ...mockItem, status: 'in_progress' });
      const result = await service.updateItemStatus('ord-1', 'item-1', { status: 'in_progress' });

      expect(result.status).toBe('in_progress');
    });

    it('throws NotFoundException when item not found', async () => {
      prismaMock.order.findUnique.mockResolvedValue(mockOrder);
      prismaMock.orderItem.findUnique.mockResolvedValue(null);
      await expect(
        service.updateItemStatus('ord-1', 'x', { status: 'in_progress' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('deletes order when it exists', async () => {
      prismaMock.order.findUnique.mockResolvedValue(mockOrder);
      prismaMock.order.delete.mockResolvedValue(mockOrder);
      await service.remove('ord-1');
      expect(prismaMock.order.delete).toHaveBeenCalledWith({ where: { id: 'ord-1' } });
    });

    it('throws NotFoundException when order missing', async () => {
      prismaMock.order.findUnique.mockResolvedValue(null);
      await expect(service.remove('x')).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateStatus timestamps', () => {
    it('stamps sentAt and fires items when status becomes sent', async () => {
      prismaMock.order.findUnique.mockResolvedValue({ ...mockOrder, sentAt: null });
      prismaMock.order.update.mockResolvedValue({ ...mockOrder, status: 'sent' });
      prismaMock.orderItem.updateMany.mockResolvedValue({ count: 1 });

      await service.updateStatus('ord-1', { status: 'sent' });

      expect(prismaMock.order.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'sent', sentAt: expect.any(Date) }),
        }),
      );
      expect(prismaMock.orderItem.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { orderId: 'ord-1', firedAt: null },
          data: { firedAt: expect.any(Date) },
        }),
      );
    });
  });

  describe('updateItemStatus rollup', () => {
    it('promotes the order to ready and notifies when the last item becomes ready', async () => {
      prismaMock.order.findUnique
        .mockResolvedValueOnce({ ...mockOrder }) // findOne(orderId)
        .mockResolvedValueOnce({
          ...mockOrder,
          status: 'in_progress',
          readyAt: null,
          items: [{ ...mockItem, status: 'ready' }],
        }); // rollup check
      prismaMock.orderItem.findUnique.mockResolvedValue({ ...mockItem, readyAt: null });
      prismaMock.orderItem.update.mockResolvedValue({ ...mockItem, status: 'ready' });
      prismaMock.order.update.mockResolvedValue({ ...mockOrder, status: 'ready' });
      prismaMock.table.findUnique.mockResolvedValue({ id: 'tbl-1', number: 5 });

      await service.updateItemStatus('ord-1', 'item-1', { status: 'ready' });

      expect(prismaMock.order.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'ready', readyAt: expect.any(Date) }),
        }),
      );
      expect(mockNotifications.sendToStaff).toHaveBeenCalled();
    });

    it('does NOT promote when other items are still pending', async () => {
      prismaMock.order.findUnique.mockResolvedValueOnce({ ...mockOrder }).mockResolvedValueOnce({
        ...mockOrder,
        status: 'in_progress',
        items: [
          { ...mockItem, status: 'ready' },
          { ...mockItem, id: 'item-2', status: 'pending' },
        ],
      });
      prismaMock.orderItem.findUnique.mockResolvedValue({ ...mockItem, readyAt: null });
      prismaMock.orderItem.update.mockResolvedValue({ ...mockItem, status: 'ready' });

      await service.updateItemStatus('ord-1', 'item-1', { status: 'ready' });

      expect(prismaMock.order.update).not.toHaveBeenCalled();
    });
  });

  describe('create with modifiers', () => {
    const steak = {
      id: 'mi-1',
      name: 'Steak',
      price: 20,
      modifierGroups: [
        {
          modifierGroup: {
            id: 'g1',
            name: 'Temp',
            selectionType: 'single',
            required: true,
            options: [
              { id: 'o1', name: 'Rare', priceDelta: 0 },
              { id: 'o2', name: 'Well', priceDelta: 0 },
            ],
          },
        },
      ],
    };

    it('snapshots unitPrice + modifier rows', async () => {
      prismaMock.menuItem.findMany.mockResolvedValue([steak]);
      prismaMock.order.create.mockResolvedValue({ ...mockOrder });
      prismaMock.table.findUnique.mockResolvedValue({ id: 'tbl-1', number: 5 });

      await service.create(
        {
          tableId: 'tbl-1',
          notes: null,
          items: [{ menuItemId: 'mi-1', quantity: 1, modifierOptionIds: ['o1'] }],
        },
        'staff-1',
      );

      const arg = prismaMock.order.create.mock.calls[0][0];
      const item = arg.data.items.create[0];

      expect(item.unitPrice).toBe(20);
      expect(item.modifiers.create).toEqual([
        { modifierOptionId: 'o1', name: 'Rare', priceDelta: 0 },
      ]);
    });

    it('rejects an option not attached to the item', async () => {
      prismaMock.menuItem.findMany.mockResolvedValue([steak]);
      await expect(
        service.create(
          {
            tableId: 'tbl-1',
            notes: null,
            items: [{ menuItemId: 'mi-1', quantity: 1, modifierOptionIds: ['bogus'] }],
          },
          'staff-1',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects when a required group has no selection', async () => {
      prismaMock.menuItem.findMany.mockResolvedValue([steak]);
      await expect(
        service.create(
          {
            tableId: 'tbl-1',
            notes: null,
            items: [{ menuItemId: 'mi-1', quantity: 1, modifierOptionIds: [] }],
          },
          'staff-1',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects >1 option in a single group', async () => {
      prismaMock.menuItem.findMany.mockResolvedValue([steak]);
      await expect(
        service.create(
          {
            tableId: 'tbl-1',
            notes: null,
            items: [{ menuItemId: 'mi-1', quantity: 1, modifierOptionIds: ['o1', 'o2'] }],
          },
          'staff-1',
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('addItems', () => {
    const fries = { id: 'mi-2', name: 'Fries', price: 5, modifierGroups: [] };
    const addDto = { items: [{ menuItemId: 'mi-2', quantity: 1, modifierOptionIds: [] }] };

    it('throws NotFoundException when the order does not exist', async () => {
      prismaMock.order.findUnique.mockResolvedValue(null);
      await expect(service.addItems('missing', addDto)).rejects.toThrow(NotFoundException);
    });

    it('rejects (Conflict) when the order already has a bill', async () => {
      prismaMock.order.findUnique.mockResolvedValue({ ...mockOrder, bill: { id: 'bill-1' } });

      await expect(service.addItems('ord-1', addDto)).rejects.toThrow(ConflictException);
      expect(prismaMock.order.update).not.toHaveBeenCalled();
    });

    it('leaves new items unfired and does not notify when the order is still draft', async () => {
      prismaMock.order.findUnique.mockResolvedValue({ ...mockOrder, status: 'draft', bill: null });
      prismaMock.menuItem.findMany.mockResolvedValue([fries]);
      prismaMock.order.update.mockResolvedValue({ ...mockOrder });

      await service.addItems('ord-1', addDto);

      const call = prismaMock.order.update.mock.calls[0][0];

      expect(call.data.items.create[0].firedAt).toBeUndefined();
      expect(call.data.status).toBeUndefined();
      expect(mockNotifications.sendToRole).not.toHaveBeenCalled();
    });

    it('fires new items and notifies the kitchen when the order is past draft', async () => {
      prismaMock.order.findUnique.mockResolvedValue({
        ...mockOrder,
        status: 'in_progress',
        bill: null,
      });
      prismaMock.menuItem.findMany.mockResolvedValue([fries]);
      prismaMock.order.update.mockResolvedValue({ ...mockOrder, status: 'in_progress' });
      prismaMock.table.findUnique.mockResolvedValue({ id: 'tbl-1', number: 3 });

      await service.addItems('ord-1', addDto);

      const call = prismaMock.order.update.mock.calls[0][0];

      expect(call.data.items.create[0].firedAt).toBeInstanceOf(Date);
      expect(call.data.status).toBeUndefined();
      expect(mockNotifications.sendToRole).toHaveBeenCalledWith(
        'kitchen',
        expect.objectContaining({
          title: expect.any(String),
          body: expect.stringContaining('Table 3'),
        }),
      );
    });

    it('demotes a ready order to in_progress so the readiness rollup re-fires', async () => {
      prismaMock.order.findUnique.mockResolvedValue({ ...mockOrder, status: 'ready', bill: null });
      prismaMock.menuItem.findMany.mockResolvedValue([fries]);
      prismaMock.order.update.mockResolvedValue({ ...mockOrder, status: 'in_progress' });
      prismaMock.table.findUnique.mockResolvedValue({ id: 'tbl-1', number: 3 });

      await service.addItems('ord-1', addDto);

      const call = prismaMock.order.update.mock.calls[0][0];

      expect(call.data.status).toBe('in_progress');
      expect(call.data.items.create[0].firedAt).toBeInstanceOf(Date);
    });
  });
});
