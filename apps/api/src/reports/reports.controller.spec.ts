import { Test } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

const mockSummary = {
  orders: { total: 42, byStatus: { draft: 5, sent: 10, ready: 15, paid: 12 } },
  tables: { total: 10, byStatus: { available: 6, occupied: 3, reserved: 1 } },
  reservations: { total: 8, upcoming: 3 },
  topItems: [{ name: 'Bruschetta', count: 18 }],
};

const mockReportsService = {
  getSummary: jest.fn(),
  getDaily: jest.fn(),
};

const allowAll = { canActivate: () => true };

describe('ReportsController', () => {
  let app: NestFastifyApplication;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [ReportsController],
      providers: [{ provide: ReportsService, useValue: mockReportsService }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(allowAll)
      .compile();

    app = module.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });

  afterAll(() => app.close());
  beforeEach(() => jest.clearAllMocks());

  describe('GET /reports/summary', () => {
    it('returns 200 with operational summary', async () => {
      mockReportsService.getSummary.mockResolvedValue(mockSummary);
      const res = await app.inject({ method: 'GET', url: '/reports/summary' });

      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res.body)).toEqual(mockSummary);
      expect(mockReportsService.getSummary).toHaveBeenCalled();
    });

    it('returns summary with zero counts when no data exists', async () => {
      const empty = {
        orders: { total: 0, byStatus: {} },
        tables: { total: 0, byStatus: {} },
        reservations: { total: 0, upcoming: 0 },
        topItems: [],
      };

      mockReportsService.getSummary.mockResolvedValue(empty);
      const res = await app.inject({ method: 'GET', url: '/reports/summary' });

      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res.body).orders.total).toBe(0);
    });
  });

  describe('GET /reports/daily', () => {
    it('returns 200 with a per-day breakdown, passing from/to through', async () => {
      const mockDaily = [{ date: '2026-07-01', orderCount: 3, revenue: 100, reservationCount: 1 }];

      mockReportsService.getDaily.mockResolvedValue(mockDaily);
      const res = await app.inject({
        method: 'GET',
        url: '/reports/daily?from=2026-07-01&to=2026-07-01',
      });

      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res.body)).toEqual(mockDaily);
      expect(mockReportsService.getDaily).toHaveBeenCalledWith('2026-07-01', '2026-07-01');
    });

    it('returns 400 when the service rejects an out-of-range span', async () => {
      mockReportsService.getDaily.mockRejectedValue(new BadRequestException('Range too large'));
      const res = await app.inject({
        method: 'GET',
        url: '/reports/daily?from=2026-01-01&to=2026-12-31',
      });

      expect(res.statusCode).toBe(400);
    });
  });
});
