import { Test } from '@nestjs/testing';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { SettingsController } from './settings.controller';
import { SettingsService } from './settings.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';

const mockSettings = {
  id: 'singleton',
  name: 'The Restaurant',
  description: 'A great place to eat',
  phone: '+1-555-0100',
  email: 'info@restaurant.com',
  address: '123 Main St',
  openingHours: 'Mon-Sun 9am-10pm',
  baseCurrency: 'EUR',
  exchangeRates: { GBP: 1.17, USD: 1.08 },
  updatedAt: new Date().toISOString(),
};

const mockSettingsService = {
  get: jest.fn(),
  update: jest.fn(),
};

const allowAll = { canActivate: () => true };

describe('SettingsController', () => {
  let app: NestFastifyApplication;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [SettingsController],
      providers: [{ provide: SettingsService, useValue: mockSettingsService }],
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

  describe('GET /settings', () => {
    it('returns 200 with restaurant settings', async () => {
      mockSettingsService.get.mockResolvedValue(mockSettings);
      const res = await app.inject({ method: 'GET', url: '/settings' });

      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res.body)).toEqual(mockSettings);
      expect(mockSettingsService.get).toHaveBeenCalled();
    });
  });

  describe('PATCH /settings', () => {
    it('returns 200 with updated settings', async () => {
      const updated = { ...mockSettings, name: 'New Name' };

      mockSettingsService.update.mockResolvedValue(updated);
      const res = await app.inject({
        method: 'PATCH',
        url: '/settings',
        payload: { name: 'New Name' },
      });

      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res.body).name).toBe('New Name');
      expect(mockSettingsService.update).toHaveBeenCalledWith({ name: 'New Name' });
    });

    it('returns 200 with partial update (only phone)', async () => {
      const updated = { ...mockSettings, phone: '+1-555-9999' };

      mockSettingsService.update.mockResolvedValue(updated);
      const res = await app.inject({
        method: 'PATCH',
        url: '/settings',
        payload: { phone: '+1-555-9999' },
      });

      expect(res.statusCode).toBe(200);
      expect(mockSettingsService.update).toHaveBeenCalledWith({ phone: '+1-555-9999' });
    });
  });
});
