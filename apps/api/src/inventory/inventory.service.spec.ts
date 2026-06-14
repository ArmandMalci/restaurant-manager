import { Test } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

const item = {
  id: 'abc-123',
  name: 'Tomatoes',
  unit: 'kg',
  quantity: 5,
  minStock: 10,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockNotifications = {
  sendToRole: jest.fn().mockResolvedValue(undefined),
  sendToStaff: jest.fn().mockResolvedValue(undefined),
};

const mockPrisma = {
  inventoryItem: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
};

describe('InventoryService', () => {
  let service: InventoryService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        InventoryService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: NotificationsService, useValue: mockNotifications },
      ],
    }).compile();
    service = module.get(InventoryService);
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('returns items with lowStock: true when quantity <= minStock', async () => {
      mockPrisma.inventoryItem.findMany.mockResolvedValue([item]); // quantity 5 <= minStock 10
      const result = await service.findAll();
      expect(result[0].lowStock).toBe(true);
    });

    it('returns items with lowStock: false when quantity > minStock', async () => {
      const wellStocked = { ...item, quantity: 20, minStock: 10 };
      mockPrisma.inventoryItem.findMany.mockResolvedValue([wellStocked]);
      const result = await service.findAll();
      expect(result[0].lowStock).toBe(false);
    });
  });

  describe('findOne', () => {
    it('returns item by id when found', async () => {
      mockPrisma.inventoryItem.findUnique.mockResolvedValue(item);
      const result = await service.findOne('abc-123');
      expect(result.id).toBe('abc-123');
      expect(result).toHaveProperty('lowStock');
      expect(mockPrisma.inventoryItem.findUnique).toHaveBeenCalledWith({
        where: { id: 'abc-123' },
      });
    });

    it('throws NotFoundException when item not found', async () => {
      mockPrisma.inventoryItem.findUnique.mockResolvedValueOnce(null);
      await expect(service.findOne('missing')).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('creates item and returns it with lowStock flag', async () => {
      mockPrisma.inventoryItem.create.mockResolvedValue(item);
      const dto = { name: 'Tomatoes', unit: 'kg' as const, quantity: 5, minStock: 10 };
      const result = await service.create(dto);
      expect(mockPrisma.inventoryItem.create).toHaveBeenCalledWith({ data: dto });
      expect(result).toHaveProperty('lowStock', true);
    });
  });

  describe('adjust', () => {
    it('calls prisma update with { increment: delta } and returns updated item', async () => {
      const updatedItem = { ...item, quantity: 8 };
      // findOne is called twice: once to verify existence, once after update
      mockPrisma.inventoryItem.findUnique
        .mockResolvedValueOnce(item) // first findOne (existence check)
        .mockResolvedValueOnce(updatedItem); // second findOne (return value)
      mockPrisma.inventoryItem.update.mockResolvedValue(updatedItem);

      const result = await service.adjust('abc-123', { delta: 3, reason: 'delivery' as const });

      expect(mockPrisma.inventoryItem.update).toHaveBeenCalledWith({
        where: { id: 'abc-123' },
        data: { quantity: { increment: 3 } },
      });
      expect(result.quantity).toBe(8);
    });
  });
});
