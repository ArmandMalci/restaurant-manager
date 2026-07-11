import { Test } from '@nestjs/testing';
import { SettingsService } from './settings.service';
import { PrismaService } from '../prisma/prisma.service';

const mockRow = {
  id: 'default',
  name: 'My Restaurant',
  description: null,
  phone: null,
  email: null,
  address: null,
  openingHours: null,
  baseCurrency: 'EUR',
  exchangeRates: {},
  updatedAt: new Date(),
};

const prismaMock = {
  restaurantSettings: {
    upsert: jest.fn(),
  },
};

describe('SettingsService', () => {
  let service: SettingsService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [SettingsService, { provide: PrismaService, useValue: prismaMock }],
    }).compile();

    service = module.get(SettingsService);
    jest.clearAllMocks();
  });

  describe('get', () => {
    it('upserts with default id and returns settings', async () => {
      prismaMock.restaurantSettings.upsert.mockResolvedValue(mockRow);
      const result = await service.get();

      expect(result.id).toBe('default');
      expect(prismaMock.restaurantSettings.upsert).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'default' } }),
      );
    });

    it('creates row if none exists (upsert create path)', async () => {
      prismaMock.restaurantSettings.upsert.mockResolvedValue(mockRow);
      await service.get();
      const call = prismaMock.restaurantSettings.upsert.mock.calls[0][0];

      expect(call.create).toMatchObject({ id: 'default' });
      expect(call.update).toEqual({});
    });
  });

  describe('update', () => {
    it('upserts with provided dto fields', async () => {
      const updated = { ...mockRow, name: 'La Maison', phone: '+1 555 0100' };

      prismaMock.restaurantSettings.upsert.mockResolvedValue(updated);
      const result = await service.update({ name: 'La Maison', phone: '+1 555 0100' });

      expect(result.name).toBe('La Maison');
      const call = prismaMock.restaurantSettings.upsert.mock.calls[0][0];

      expect(call.update).toMatchObject({ name: 'La Maison', phone: '+1 555 0100' });
    });

    it('merges partial dto — unset fields not overwritten', async () => {
      prismaMock.restaurantSettings.upsert.mockResolvedValue(mockRow);
      await service.update({ address: '123 Main St' });
      const call = prismaMock.restaurantSettings.upsert.mock.calls[0][0];

      expect(call.update).toEqual({ address: '123 Main St' });
    });
  });
});
