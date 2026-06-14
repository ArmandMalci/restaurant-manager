import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { InventoryController } from './inventory.controller';
import { InventoryService } from './inventory.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';

const mockItem = {
  id: 'inv-1',
  name: 'Olive Oil',
  unit: 'L',
  quantity: 5,
  minQuantity: 1,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const mockInventoryService = {
  findAll: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
  adjust: jest.fn(),
};

const allowAll = { canActivate: () => true };

describe('InventoryController', () => {
  let app: NestFastifyApplication;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [InventoryController],
      providers: [{ provide: InventoryService, useValue: mockInventoryService }],
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

  describe('GET /inventory', () => {
    it('returns 200 with item list', async () => {
      mockInventoryService.findAll.mockResolvedValue([mockItem]);
      const res = await app.inject({ method: 'GET', url: '/inventory' });

      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res.body)).toEqual([mockItem]);
    });
  });

  describe('GET /inventory/:id', () => {
    it('returns 200 with the requested item', async () => {
      mockInventoryService.findOne.mockResolvedValue(mockItem);
      const res = await app.inject({ method: 'GET', url: '/inventory/inv-1' });

      expect(res.statusCode).toBe(200);
      expect(mockInventoryService.findOne).toHaveBeenCalledWith('inv-1');
    });

    it('returns 404 when item not found', async () => {
      mockInventoryService.findOne.mockRejectedValue(new NotFoundException());
      const res = await app.inject({ method: 'GET', url: '/inventory/missing' });

      expect(res.statusCode).toBe(404);
    });
  });

  describe('POST /inventory', () => {
    it('returns 201 with created item', async () => {
      mockInventoryService.create.mockResolvedValue(mockItem);
      const res = await app.inject({
        method: 'POST',
        url: '/inventory',
        payload: { name: 'Olive Oil', unit: 'L', quantity: 5, minQuantity: 1 },
      });

      expect(res.statusCode).toBe(201);
      expect(JSON.parse(res.body)).toEqual(mockItem);
    });
  });

  describe('PATCH /inventory/:id', () => {
    it('returns 200 with updated item', async () => {
      const updated = { ...mockItem, quantity: 10 };

      mockInventoryService.update.mockResolvedValue(updated);
      const res = await app.inject({
        method: 'PATCH',
        url: '/inventory/inv-1',
        payload: { quantity: 10 },
      });

      expect(res.statusCode).toBe(200);
      expect(mockInventoryService.update).toHaveBeenCalledWith('inv-1', { quantity: 10 });
    });

    it('returns 404 when item not found', async () => {
      mockInventoryService.update.mockRejectedValue(new NotFoundException());
      const res = await app.inject({
        method: 'PATCH',
        url: '/inventory/missing',
        payload: { quantity: 1 },
      });

      expect(res.statusCode).toBe(404);
    });
  });

  describe('DELETE /inventory/:id', () => {
    it('returns 204 on successful deletion', async () => {
      mockInventoryService.remove.mockResolvedValue(undefined);
      const res = await app.inject({ method: 'DELETE', url: '/inventory/inv-1' });

      expect(res.statusCode).toBe(204);
      expect(mockInventoryService.remove).toHaveBeenCalledWith('inv-1');
    });

    it('returns 404 when item not found', async () => {
      mockInventoryService.remove.mockRejectedValue(new NotFoundException());
      const res = await app.inject({ method: 'DELETE', url: '/inventory/missing' });

      expect(res.statusCode).toBe(404);
    });
  });

  describe('POST /inventory/:id/adjust', () => {
    it('returns 201 with updated item after adjustment', async () => {
      const adjusted = { ...mockItem, quantity: 8 };

      mockInventoryService.adjust.mockResolvedValue(adjusted);
      const res = await app.inject({
        method: 'POST',
        url: '/inventory/inv-1/adjust',
        payload: { delta: 3 },
      });

      expect(res.statusCode).toBe(201);
      expect(mockInventoryService.adjust).toHaveBeenCalledWith('inv-1', { delta: 3 });
    });

    it('returns 404 when item not found', async () => {
      mockInventoryService.adjust.mockRejectedValue(new NotFoundException());
      const res = await app.inject({
        method: 'POST',
        url: '/inventory/missing/adjust',
        payload: { delta: 1 },
      });

      expect(res.statusCode).toBe(404);
    });
  });
});
