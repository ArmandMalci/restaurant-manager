import { type ExecutionContext, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { OrderController } from './order.controller';
import { OrderService } from './order.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';

const mockOrder = {
  id: 'ord-1',
  tableId: '00000000-0000-0000-0000-000000000001',
  staffId: '00000000-0000-0000-0000-000000000002',
  status: 'draft',
  notes: null,
  items: [],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const mockOrderService = {
  findAll: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn(),
  updateStatus: jest.fn(),
  updateItemStatus: jest.fn(),
  remove: jest.fn(),
};

const STAFF_ID = '00000000-0000-0000-0000-000000000002';

const allowAll = {
  canActivate: (ctx: ExecutionContext) => {
    const req = ctx.switchToHttp().getRequest();

    req.user = { id: STAFF_ID, role: 'manager' };

    return true;
  },
};

describe('OrderController', () => {
  let app: NestFastifyApplication;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [OrderController],
      providers: [{ provide: OrderService, useValue: mockOrderService }],
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

  describe('GET /orders', () => {
    it('returns 200 with order list', async () => {
      mockOrderService.findAll.mockResolvedValue([mockOrder]);
      const res = await app.inject({ method: 'GET', url: '/orders' });

      expect(res.statusCode).toBe(200);
      expect(mockOrderService.findAll).toHaveBeenCalledWith(undefined);
    });

    it('passes status query param to service', async () => {
      mockOrderService.findAll.mockResolvedValue([mockOrder]);
      const res = await app.inject({ method: 'GET', url: '/orders?status=draft' });

      expect(res.statusCode).toBe(200);
      expect(mockOrderService.findAll).toHaveBeenCalledWith('draft');
    });
  });

  describe('GET /orders/:id', () => {
    it('returns 200 with the requested order', async () => {
      mockOrderService.findOne.mockResolvedValue(mockOrder);
      const res = await app.inject({ method: 'GET', url: '/orders/ord-1' });

      expect(res.statusCode).toBe(200);
      expect(mockOrderService.findOne).toHaveBeenCalledWith('ord-1');
    });

    it('returns 404 when order not found', async () => {
      mockOrderService.findOne.mockRejectedValue(new NotFoundException());
      const res = await app.inject({ method: 'GET', url: '/orders/missing' });

      expect(res.statusCode).toBe(404);
    });
  });

  describe('POST /orders', () => {
    it('returns 201 and injects staffId from authenticated user', async () => {
      mockOrderService.create.mockResolvedValue(mockOrder);
      const res = await app.inject({
        method: 'POST',
        url: '/orders',
        payload: {
          tableId: '00000000-0000-0000-0000-000000000001',
          items: [{ menuItemId: '00000000-0000-0000-0000-000000000003', quantity: 2 }],
        },
      });

      expect(res.statusCode).toBe(201);
      expect(mockOrderService.create).toHaveBeenCalledWith(
        expect.objectContaining({ tableId: '00000000-0000-0000-0000-000000000001' }),
        STAFF_ID,
      );
    });
  });

  describe('PATCH /orders/:id/status', () => {
    it('returns 200 with updated order', async () => {
      const updated = { ...mockOrder, status: 'sent' };

      mockOrderService.updateStatus.mockResolvedValue(updated);
      const res = await app.inject({
        method: 'PATCH',
        url: '/orders/ord-1/status',
        payload: { status: 'sent' },
      });

      expect(res.statusCode).toBe(200);
      expect(mockOrderService.updateStatus).toHaveBeenCalledWith('ord-1', { status: 'sent' });
    });

    it('returns 404 when order not found', async () => {
      mockOrderService.updateStatus.mockRejectedValue(new NotFoundException());
      const res = await app.inject({
        method: 'PATCH',
        url: '/orders/missing/status',
        payload: { status: 'sent' },
      });

      expect(res.statusCode).toBe(404);
    });
  });

  describe('PATCH /orders/:id/items/:itemId/status', () => {
    it('returns 200 and delegates to service with correct ids', async () => {
      mockOrderService.updateItemStatus.mockResolvedValue({ id: 'oi-1', status: 'ready' });
      const res = await app.inject({
        method: 'PATCH',
        url: '/orders/ord-1/items/oi-1/status',
        payload: { status: 'ready' },
      });

      expect(res.statusCode).toBe(200);
      expect(mockOrderService.updateItemStatus).toHaveBeenCalledWith('ord-1', 'oi-1', {
        status: 'ready',
      });
    });
  });

  describe('DELETE /orders/:id', () => {
    it('returns 204 on successful deletion', async () => {
      mockOrderService.remove.mockResolvedValue(undefined);
      const res = await app.inject({ method: 'DELETE', url: '/orders/ord-1' });

      expect(res.statusCode).toBe(204);
      expect(mockOrderService.remove).toHaveBeenCalledWith('ord-1');
    });

    it('returns 404 when order not found', async () => {
      mockOrderService.remove.mockRejectedValue(new NotFoundException());
      const res = await app.inject({ method: 'DELETE', url: '/orders/missing' });

      expect(res.statusCode).toBe(404);
    });
  });
});
