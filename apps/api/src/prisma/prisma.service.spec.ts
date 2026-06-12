import { Test } from '@nestjs/testing'

jest.mock('@prisma/adapter-pg', () => ({
  PrismaPg: jest.fn().mockImplementation(() => ({
    provider: 'postgres',
    adapterName: '@prisma/adapter-pg',
  })),
}))
jest.mock('pg', () => ({
  Pool: jest.fn().mockImplementation(() => ({})),
}))
jest.mock('@prisma/client', () => {
  class MockPrismaClient {
    constructor(_opts?: unknown) {}
    $connect = jest.fn().mockResolvedValue(undefined)
  }
  return { PrismaClient: MockPrismaClient }
})

import { PrismaService } from './prisma.service'

describe('PrismaService', () => {
  let service: PrismaService

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [PrismaService],
    }).compile()
    service = module.get(PrismaService)
  })

  it('is defined', () => {
    expect(service).toBeDefined()
  })
})
