import { ConflictException, ExecutionContext, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { TableController } from './table.controller';
import { TableService } from './table.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';

const mockTable = {
  id: 'tbl-1',
  number: 1,
  seats: 4,
  status: 'available',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const mockTableService = {
  findAll: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
  setStatus: jest.fn(),
};

const allowAll = { canActivate: () => true };

describe('TableController', () => {
  let app: NestFastifyApplication;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [TableController],
      providers: [{ provide: TableService, useValue: mockTableService }],
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

  describe('GET /tables', () => {
    it('returns 200 with table list', async () => {
      mockTableService.findAll.mockResolvedValue([mockTable]);
      const res = await app.inject({ method: 'GET', url: '/tables' });

      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res.body)).toEqual([mockTable]);
    });
  });

  describe('GET /tables/:id', () => {
    it('returns 200 with the requested table', async () => {
      mockTableService.findOne.mockResolvedValue(mockTable);
      const res = await app.inject({ method: 'GET', url: '/tables/tbl-1' });

      expect(res.statusCode).toBe(200);
      expect(mockTableService.findOne).toHaveBeenCalledWith('tbl-1');
    });

    it('returns 404 when table not found', async () => {
      mockTableService.findOne.mockRejectedValue(new NotFoundException());
      const res = await app.inject({ method: 'GET', url: '/tables/missing' });

      expect(res.statusCode).toBe(404);
    });
  });

  describe('POST /tables', () => {
    it('returns 201 with created table', async () => {
      mockTableService.create.mockResolvedValue(mockTable);
      const res = await app.inject({
        method: 'POST',
        url: '/tables',
        payload: { number: 1, seats: 4, status: 'available' },
      });

      expect(res.statusCode).toBe(201);
      expect(mockTableService.create).toHaveBeenCalledWith({
        number: 1,
        seats: 4,
        status: 'available',
      });
    });
  });

  describe('PATCH /tables/:id', () => {
    it('returns 200 with updated table', async () => {
      const updated = { ...mockTable, seats: 6 };

      mockTableService.update.mockResolvedValue(updated);
      const res = await app.inject({
        method: 'PATCH',
        url: '/tables/tbl-1',
        payload: { seats: 6 },
      });

      expect(res.statusCode).toBe(200);
      expect(mockTableService.update).toHaveBeenCalledWith('tbl-1', { seats: 6 });
    });

    it('returns 404 when table not found', async () => {
      mockTableService.update.mockRejectedValue(new NotFoundException());
      const res = await app.inject({
        method: 'PATCH',
        url: '/tables/missing',
        payload: { seats: 2 },
      });

      expect(res.statusCode).toBe(404);
    });
  });

  describe('DELETE /tables/:id', () => {
    it('returns 204 on successful deletion', async () => {
      mockTableService.remove.mockResolvedValue(undefined);
      const res = await app.inject({ method: 'DELETE', url: '/tables/tbl-1' });

      expect(res.statusCode).toBe(204);
      expect(mockTableService.remove).toHaveBeenCalledWith('tbl-1');
    });

    it('returns 404 when table not found', async () => {
      mockTableService.remove.mockRejectedValue(new NotFoundException());
      const res = await app.inject({ method: 'DELETE', url: '/tables/missing' });

      expect(res.statusCode).toBe(404);
    });

    it('returns 409 when table is occupied or reserved', async () => {
      mockTableService.remove.mockRejectedValue(new ConflictException());
      const res = await app.inject({ method: 'DELETE', url: '/tables/tbl-1' });

      expect(res.statusCode).toBe(409);
    });
  });

  describe('PATCH /tables/:id/status', () => {
    it('returns 200 and delegates status update to service', async () => {
      const updated = { ...mockTable, status: 'occupied' };

      mockTableService.setStatus.mockResolvedValue(updated);
      const res = await app.inject({
        method: 'PATCH',
        url: '/tables/tbl-1/status',
        payload: { status: 'occupied' },
      });

      expect(res.statusCode).toBe(200);
      expect(mockTableService.setStatus).toHaveBeenCalledWith('tbl-1', { status: 'occupied' });
    });

    it('returns 404 when table not found', async () => {
      mockTableService.setStatus.mockRejectedValue(new NotFoundException());
      const res = await app.inject({
        method: 'PATCH',
        url: '/tables/missing/status',
        payload: { status: 'available' },
      });

      expect(res.statusCode).toBe(404);
    });
  });
});
