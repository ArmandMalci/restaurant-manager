import { ExecutionContext, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { MenuController } from './menu.controller';
import { MenuService } from './menu.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';

const mockCategory = { id: 'cat-1', name: 'Starters', sortOrder: 0 };
const mockItem = {
  id: 'item-1',
  name: 'Bruschetta',
  description: null,
  price: 8.5,
  categoryId: 'cat-1',
  available: true,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const mockMenuService = {
  findAllCategories: jest.fn(),
  findOneCategory: jest.fn(),
  createCategory: jest.fn(),
  updateCategory: jest.fn(),
  removeCategory: jest.fn(),
  findAllItems: jest.fn(),
  findOneItem: jest.fn(),
  createItem: jest.fn(),
  updateItem: jest.fn(),
  removeItem: jest.fn(),
  setItemAvailability: jest.fn(),
};

const allowAll = { canActivate: () => true };

describe('MenuController', () => {
  let app: NestFastifyApplication;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [MenuController],
      providers: [{ provide: MenuService, useValue: mockMenuService }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(allowAll)
      .overrideGuard(RolesGuard)
      .useValue(allowAll)
      .compile();

    app = module.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });

  afterAll(() => app.close());
  beforeEach(() => jest.clearAllMocks());

  // ── Categories ────────────────────────────────────────────────────────

  describe('GET /menu/categories', () => {
    it('returns 200 with category list', async () => {
      mockMenuService.findAllCategories.mockResolvedValue([mockCategory]);
      const res = await app.inject({ method: 'GET', url: '/menu/categories' });

      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res.body)).toEqual([mockCategory]);
    });
  });

  describe('GET /menu/categories/:id', () => {
    it('returns 200 with the requested category', async () => {
      mockMenuService.findOneCategory.mockResolvedValue(mockCategory);
      const res = await app.inject({ method: 'GET', url: '/menu/categories/cat-1' });

      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res.body)).toEqual(mockCategory);
      expect(mockMenuService.findOneCategory).toHaveBeenCalledWith('cat-1');
    });

    it('returns 404 when category not found', async () => {
      mockMenuService.findOneCategory.mockRejectedValue(new NotFoundException());
      const res = await app.inject({ method: 'GET', url: '/menu/categories/missing' });

      expect(res.statusCode).toBe(404);
    });
  });

  describe('POST /menu/categories', () => {
    it('returns 201 with created category', async () => {
      mockMenuService.createCategory.mockResolvedValue(mockCategory);
      const res = await app.inject({
        method: 'POST',
        url: '/menu/categories',
        payload: { name: 'Starters', sortOrder: 0 },
      });

      expect(res.statusCode).toBe(201);
      expect(JSON.parse(res.body)).toEqual(mockCategory);
    });
  });

  describe('PATCH /menu/categories/:id', () => {
    it('returns 200 with updated category', async () => {
      const updated = { ...mockCategory, name: 'Mains' };

      mockMenuService.updateCategory.mockResolvedValue(updated);
      const res = await app.inject({
        method: 'PATCH',
        url: '/menu/categories/cat-1',
        payload: { name: 'Mains' },
      });

      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res.body).name).toBe('Mains');
      expect(mockMenuService.updateCategory).toHaveBeenCalledWith('cat-1', { name: 'Mains' });
    });

    it('returns 404 when category not found', async () => {
      mockMenuService.updateCategory.mockRejectedValue(new NotFoundException());
      const res = await app.inject({
        method: 'PATCH',
        url: '/menu/categories/missing',
        payload: { name: 'X' },
      });

      expect(res.statusCode).toBe(404);
    });
  });

  describe('DELETE /menu/categories/:id', () => {
    it('returns 204 on successful deletion', async () => {
      mockMenuService.removeCategory.mockResolvedValue(undefined);
      const res = await app.inject({ method: 'DELETE', url: '/menu/categories/cat-1' });

      expect(res.statusCode).toBe(204);
      expect(mockMenuService.removeCategory).toHaveBeenCalledWith('cat-1');
    });

    it('returns 404 when category not found', async () => {
      mockMenuService.removeCategory.mockRejectedValue(new NotFoundException());
      const res = await app.inject({ method: 'DELETE', url: '/menu/categories/missing' });

      expect(res.statusCode).toBe(404);
    });
  });

  // ── Items ─────────────────────────────────────────────────────────────

  describe('GET /menu/items', () => {
    it('returns 200 with all items when no filter', async () => {
      mockMenuService.findAllItems.mockResolvedValue([mockItem]);
      const res = await app.inject({ method: 'GET', url: '/menu/items' });

      expect(res.statusCode).toBe(200);
      expect(mockMenuService.findAllItems).toHaveBeenCalledWith(undefined);
    });

    it('passes categoryId query param to service', async () => {
      mockMenuService.findAllItems.mockResolvedValue([mockItem]);
      const res = await app.inject({ method: 'GET', url: '/menu/items?categoryId=cat-1' });

      expect(res.statusCode).toBe(200);
      expect(mockMenuService.findAllItems).toHaveBeenCalledWith('cat-1');
    });
  });

  describe('GET /menu/items/:id', () => {
    it('returns 200 with the requested item', async () => {
      mockMenuService.findOneItem.mockResolvedValue(mockItem);
      const res = await app.inject({ method: 'GET', url: '/menu/items/item-1' });

      expect(res.statusCode).toBe(200);
      expect(mockMenuService.findOneItem).toHaveBeenCalledWith('item-1');
    });

    it('returns 404 when item not found', async () => {
      mockMenuService.findOneItem.mockRejectedValue(new NotFoundException());
      const res = await app.inject({ method: 'GET', url: '/menu/items/missing' });

      expect(res.statusCode).toBe(404);
    });
  });

  describe('POST /menu/items', () => {
    it('returns 201 with created item', async () => {
      mockMenuService.createItem.mockResolvedValue(mockItem);
      const res = await app.inject({
        method: 'POST',
        url: '/menu/items',
        payload: { name: 'Bruschetta', price: 8.5, categoryId: 'cat-1' },
      });

      expect(res.statusCode).toBe(201);
    });
  });

  describe('PATCH /menu/items/:id', () => {
    it('returns 200 with updated item', async () => {
      const updated = { ...mockItem, price: 9.0 };

      mockMenuService.updateItem.mockResolvedValue(updated);
      const res = await app.inject({
        method: 'PATCH',
        url: '/menu/items/item-1',
        payload: { price: 9.0 },
      });

      expect(res.statusCode).toBe(200);
      expect(mockMenuService.updateItem).toHaveBeenCalledWith('item-1', { price: 9.0 });
    });

    it('returns 404 when item not found', async () => {
      mockMenuService.updateItem.mockRejectedValue(new NotFoundException());
      const res = await app.inject({
        method: 'PATCH',
        url: '/menu/items/missing',
        payload: { price: 1.0 },
      });

      expect(res.statusCode).toBe(404);
    });
  });

  describe('DELETE /menu/items/:id', () => {
    it('returns 204 on successful deletion', async () => {
      mockMenuService.removeItem.mockResolvedValue(undefined);
      const res = await app.inject({ method: 'DELETE', url: '/menu/items/item-1' });

      expect(res.statusCode).toBe(204);
      expect(mockMenuService.removeItem).toHaveBeenCalledWith('item-1');
    });

    it('returns 404 when item not found', async () => {
      mockMenuService.removeItem.mockRejectedValue(new NotFoundException());
      const res = await app.inject({ method: 'DELETE', url: '/menu/items/missing' });

      expect(res.statusCode).toBe(404);
    });
  });

  describe('PATCH /menu/items/:id/availability', () => {
    it('returns 200 and calls setItemAvailability with correct args', async () => {
      mockMenuService.setItemAvailability.mockResolvedValue({ ...mockItem, available: false });
      const res = await app.inject({
        method: 'PATCH',
        url: '/menu/items/item-1/availability',
        payload: { available: false },
      });

      expect(res.statusCode).toBe(200);
      expect(mockMenuService.setItemAvailability).toHaveBeenCalledWith('item-1', false);
    });
  });
});
