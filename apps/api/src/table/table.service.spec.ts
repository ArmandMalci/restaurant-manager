import { Test } from '@nestjs/testing'
import { NotFoundException } from '@nestjs/common'
import { TableService } from './table.service'
import { PrismaService } from '../prisma/prisma.service'

const mockTable = {
  id: 'tbl-1',
  number: 1,
  seats: 4,
  status: 'available' as const,
  createdAt: new Date(),
  updatedAt: new Date(),
}

const prismaMock = {
  table: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
}

describe('TableService', () => {
  let service: TableService

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        TableService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile()
    service = module.get(TableService)
    jest.clearAllMocks()
  })

  describe('findAll', () => {
    it('returns tables ordered by number', async () => {
      prismaMock.table.findMany.mockResolvedValue([mockTable])
      const result = await service.findAll()
      expect(result).toEqual([mockTable])
      expect(prismaMock.table.findMany).toHaveBeenCalledWith({ orderBy: { number: 'asc' } })
    })
  })

  describe('findOne', () => {
    it('returns table when found', async () => {
      prismaMock.table.findUnique.mockResolvedValue(mockTable)
      expect(await service.findOne('tbl-1')).toEqual(mockTable)
    })

    it('throws NotFoundException when not found', async () => {
      prismaMock.table.findUnique.mockResolvedValue(null)
      await expect(service.findOne('missing')).rejects.toThrow(NotFoundException)
    })
  })

  describe('create', () => {
    it('creates and returns table', async () => {
      prismaMock.table.create.mockResolvedValue(mockTable)
      const result = await service.create({ number: 1, seats: 4, status: 'available' })
      expect(result).toEqual(mockTable)
    })
  })

  describe('update', () => {
    it('updates table when it exists', async () => {
      prismaMock.table.findUnique.mockResolvedValue(mockTable)
      prismaMock.table.update.mockResolvedValue({ ...mockTable, seats: 6 })
      const result = await service.update('tbl-1', { seats: 6 })
      expect(result.seats).toBe(6)
    })

    it('throws NotFoundException when table missing', async () => {
      prismaMock.table.findUnique.mockResolvedValue(null)
      await expect(service.update('x', { seats: 6 })).rejects.toThrow(NotFoundException)
    })
  })

  describe('remove', () => {
    it('deletes table when it exists', async () => {
      prismaMock.table.findUnique.mockResolvedValue(mockTable)
      prismaMock.table.delete.mockResolvedValue(mockTable)
      await service.remove('tbl-1')
      expect(prismaMock.table.delete).toHaveBeenCalledWith({ where: { id: 'tbl-1' } })
    })

    it('throws NotFoundException when table missing', async () => {
      prismaMock.table.findUnique.mockResolvedValue(null)
      await expect(service.remove('x')).rejects.toThrow(NotFoundException)
    })
  })

  describe('setStatus', () => {
    it('updates status when table exists', async () => {
      prismaMock.table.findUnique.mockResolvedValue(mockTable)
      prismaMock.table.update.mockResolvedValue({ ...mockTable, status: 'occupied' })
      const result = await service.setStatus('tbl-1', { status: 'occupied' })
      expect(result.status).toBe('occupied')
      expect(prismaMock.table.update).toHaveBeenCalledWith({
        where: { id: 'tbl-1' },
        data: { status: 'occupied' },
      })
    })

    it('throws NotFoundException when table missing', async () => {
      prismaMock.table.findUnique.mockResolvedValue(null)
      await expect(service.setStatus('x', { status: 'reserved' })).rejects.toThrow(NotFoundException)
    })
  })
})
