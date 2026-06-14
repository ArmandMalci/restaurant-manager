import { Test } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { MenuService } from './menu.service';
import { PrismaService } from '../prisma/prisma.service';

const mockCategory = { id: 'cat-1', name: 'Starters', sortOrder: 0 };
const mockItem = {
  id: 'item-1',
  name: 'Bruschetta',
  description: null,
  price: 8.5,
  categoryId: 'cat-1',
  available: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const prismaMock = {
  menuCategory: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  menuItem: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
};

describe('MenuService', () => {
  let service: MenuService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [MenuService, { provide: PrismaService, useValue: prismaMock }],
    }).compile();
    service = module.get(MenuService);
    jest.clearAllMocks();
  });

  // ── Categories ──────────────────────────────────────────────────────

  describe('findAllCategories', () => {
    it('returns categories ordered by sortOrder', async () => {
      prismaMock.menuCategory.findMany.mockResolvedValue([mockCategory]);
      const result = await service.findAllCategories();
      expect(result).toEqual([mockCategory]);
      expect(prismaMock.menuCategory.findMany).toHaveBeenCalledWith({
        orderBy: { sortOrder: 'asc' },
      });
    });
  });

  describe('findOneCategory', () => {
    it('returns category when found', async () => {
      prismaMock.menuCategory.findUnique.mockResolvedValue(mockCategory);
      expect(await service.findOneCategory('cat-1')).toEqual(mockCategory);
    });

    it('throws NotFoundException when not found', async () => {
      prismaMock.menuCategory.findUnique.mockResolvedValue(null);
      await expect(service.findOneCategory('missing')).rejects.toThrow(NotFoundException);
    });
  });

  describe('createCategory', () => {
    it('creates and returns category', async () => {
      prismaMock.menuCategory.create.mockResolvedValue(mockCategory);
      const result = await service.createCategory({ name: 'Starters', sortOrder: 0 });
      expect(result).toEqual(mockCategory);
    });
  });

  describe('updateCategory', () => {
    it('updates category when it exists', async () => {
      prismaMock.menuCategory.findUnique.mockResolvedValue(mockCategory);
      prismaMock.menuCategory.update.mockResolvedValue({ ...mockCategory, name: 'Mains' });
      const result = await service.updateCategory('cat-1', { name: 'Mains' });
      expect(result.name).toBe('Mains');
    });

    it('throws NotFoundException when category missing', async () => {
      prismaMock.menuCategory.findUnique.mockResolvedValue(null);
      await expect(service.updateCategory('x', { name: 'X' })).rejects.toThrow(NotFoundException);
    });
  });

  describe('removeCategory', () => {
    it('deletes category when it exists', async () => {
      prismaMock.menuCategory.findUnique.mockResolvedValue(mockCategory);
      prismaMock.menuCategory.delete.mockResolvedValue(mockCategory);
      await expect(service.removeCategory('cat-1')).resolves.not.toThrow();
    });

    it('throws NotFoundException when category missing', async () => {
      prismaMock.menuCategory.findUnique.mockResolvedValue(null);
      await expect(service.removeCategory('x')).rejects.toThrow(NotFoundException);
    });
  });

  // ── Items ────────────────────────────────────────────────────────────

  describe('findAllItems', () => {
    it('returns all items when no categoryId filter', async () => {
      prismaMock.menuItem.findMany.mockResolvedValue([mockItem]);
      const result = await service.findAllItems();
      expect(result).toEqual([mockItem]);
      expect(prismaMock.menuItem.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: undefined }),
      );
    });

    it('filters by categoryId when provided', async () => {
      prismaMock.menuItem.findMany.mockResolvedValue([mockItem]);
      await service.findAllItems('cat-1');
      expect(prismaMock.menuItem.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { categoryId: 'cat-1' } }),
      );
    });
  });

  describe('findOneItem', () => {
    it('returns item when found', async () => {
      prismaMock.menuItem.findUnique.mockResolvedValue(mockItem);
      expect(await service.findOneItem('item-1')).toEqual(mockItem);
    });

    it('throws NotFoundException when not found', async () => {
      prismaMock.menuItem.findUnique.mockResolvedValue(null);
      await expect(service.findOneItem('missing')).rejects.toThrow(NotFoundException);
    });
  });

  describe('createItem', () => {
    it('creates and returns item', async () => {
      prismaMock.menuItem.create.mockResolvedValue(mockItem);
      const result = await service.createItem({
        name: 'Bruschetta',
        price: 8.5,
        categoryId: 'cat-1',
        description: null,
        available: true,
      });
      expect(result).toEqual(mockItem);
      expect(prismaMock.menuItem.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ name: 'Bruschetta' }) }),
      );
    });
  });

  describe('updateItem', () => {
    it('updates item when it exists', async () => {
      prismaMock.menuItem.findUnique.mockResolvedValue(mockItem);
      prismaMock.menuItem.update.mockResolvedValue({ ...mockItem, price: 10.0 });
      const result = await service.updateItem('item-1', { price: 10.0 });
      expect(result.price).toBe(10.0);
    });

    it('throws NotFoundException when item missing', async () => {
      prismaMock.menuItem.findUnique.mockResolvedValue(null);
      await expect(service.updateItem('x', { price: 1.0 })).rejects.toThrow(NotFoundException);
    });
  });

  describe('removeItem', () => {
    it('deletes item when it exists', async () => {
      prismaMock.menuItem.findUnique.mockResolvedValue(mockItem);
      prismaMock.menuItem.delete.mockResolvedValue(mockItem);
      await expect(service.removeItem('item-1')).resolves.not.toThrow();
    });

    it('throws NotFoundException when item missing', async () => {
      prismaMock.menuItem.findUnique.mockResolvedValue(null);
      await expect(service.removeItem('x')).rejects.toThrow(NotFoundException);
    });
  });

  describe('setItemAvailability', () => {
    it('sets availability flag', async () => {
      prismaMock.menuItem.findUnique.mockResolvedValue(mockItem);
      prismaMock.menuItem.update.mockResolvedValue({ ...mockItem, available: false });
      const result = await service.setItemAvailability('item-1', false);
      expect(result.available).toBe(false);
      expect(prismaMock.menuItem.update).toHaveBeenCalledWith({
        where: { id: 'item-1' },
        data: { available: false },
      });
    });
  });
});
