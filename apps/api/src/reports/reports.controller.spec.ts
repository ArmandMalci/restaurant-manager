import { Test } from '@nestjs/testing';
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
});
