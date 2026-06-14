import { Test } from '@nestjs/testing';

jest.mock('@prisma/adapter-pg', () => ({
  PrismaPg: jest.fn().mockImplementation(() => ({
    provider: 'postgres',
    adapterName: '@prisma/adapter-pg',
  })),
}));
jest.mock('pg', () => ({
  Pool: jest.fn().mockImplementation(() => ({})),
}));
jest.mock('@prisma/client', () => {
  class MockPrismaClient {
    public constructor(_opts?: unknown) {}
    public $connect = jest.fn().mockResolvedValue(undefined);
  }

  return { PrismaClient: MockPrismaClient };
});

import { PrismaService } from './prisma.service';

describe('PrismaService', () => {
  let service: PrismaService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [PrismaService],
    }).compile();

    service = module.get(PrismaService);
  });

  it('is defined', () => {
    expect(service).toBeDefined();
  });

  it('onModuleInit calls $connect', async () => {
    await service.onModuleInit();
    expect(service.$connect).toHaveBeenCalledTimes(1);
  });
});
