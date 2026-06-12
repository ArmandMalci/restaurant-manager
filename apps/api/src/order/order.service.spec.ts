import { Test } from '@nestjs/testing'
import { NotFoundException } from '@nestjs/common'
import { OrderService } from './order.service'
import { PrismaService } from '../prisma/prisma.service'

const mockItem = {
  id: 'item-1', orderId: 'ord-1', menuItemId: 'mi-1',
  quantity: 2, status: 'pending', notes: null,
}
const mockOrder = {
  id: 'ord-1', tableId: 'tbl-1', staffId: 'staff-1',
  status: 'draft', notes: null,
  items: [mockItem],
  createdAt: new Date(), updatedAt: new Date(),
}

const prismaMock = {
  order: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  orderItem: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
}

describe('OrderService', () => {
  let service: OrderService

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        OrderService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile()
    service = module.get(OrderService)
    jest.clearAllMocks()
  })

  describe('findAll', () => {
    it('returns all orders when no filter', async () => {
      prismaMock.order.findMany.mockResolvedValue([mockOrder])
      const result = await service.findAll()
      expect(result).toEqual([mockOrder])
      expect(prismaMock.order.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: undefined }),
      )
    })

    it('filters by status when provided', async () => {
      prismaMock.order.findMany.mockResolvedValue([mockOrder])
      await service.findAll('draft')
      expect(prismaMock.order.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { status: 'draft' } }),
      )
    })
  })

  describe('findOne', () => {
    it('returns order when found', async () => {
      prismaMock.order.findUnique.mockResolvedValue(mockOrder)
      expect(await service.findOne('ord-1')).toEqual(mockOrder)
    })

    it('throws NotFoundException when not found', async () => {
      prismaMock.order.findUnique.mockResolvedValue(null)
      await expect(service.findOne('missing')).rejects.toThrow(NotFoundException)
    })
  })

  describe('create', () => {
    it('creates order with items for the authenticated staff', async () => {
      prismaMock.order.create.mockResolvedValue(mockOrder)
      const dto = { tableId: 'tbl-1', notes: null, items: [{ menuItemId: 'mi-1', quantity: 2, notes: null }] }
      const result = await service.create(dto, 'staff-1')
      expect(result).toEqual(mockOrder)
      expect(prismaMock.order.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ staffId: 'staff-1' }) }),
      )
    })
  })

  describe('updateStatus', () => {
    it('updates order status when order exists', async () => {
      prismaMock.order.findUnique.mockResolvedValue(mockOrder)
      prismaMock.order.update.mockResolvedValue({ ...mockOrder, status: 'sent' })
      const result = await service.updateStatus('ord-1', { status: 'sent' })
      expect(result.status).toBe('sent')
    })

    it('throws NotFoundException when order missing', async () => {
      prismaMock.order.findUnique.mockResolvedValue(null)
      await expect(service.updateStatus('x', { status: 'sent' })).rejects.toThrow(NotFoundException)
    })
  })

  describe('updateItemStatus', () => {
    it('updates item status when item belongs to order', async () => {
      prismaMock.order.findUnique.mockResolvedValue(mockOrder)
      prismaMock.orderItem.findUnique.mockResolvedValue(mockItem)
      prismaMock.orderItem.update.mockResolvedValue({ ...mockItem, status: 'in_progress' })
      const result = await service.updateItemStatus('ord-1', 'item-1', { status: 'in_progress' })
      expect(result.status).toBe('in_progress')
    })

    it('throws NotFoundException when item not found', async () => {
      prismaMock.order.findUnique.mockResolvedValue(mockOrder)
      prismaMock.orderItem.findUnique.mockResolvedValue(null)
      await expect(service.updateItemStatus('ord-1', 'x', { status: 'in_progress' })).rejects.toThrow(NotFoundException)
    })
  })

  describe('remove', () => {
    it('deletes order when it exists', async () => {
      prismaMock.order.findUnique.mockResolvedValue(mockOrder)
      prismaMock.order.delete.mockResolvedValue(mockOrder)
      await service.remove('ord-1')
      expect(prismaMock.order.delete).toHaveBeenCalledWith({ where: { id: 'ord-1' } })
    })

    it('throws NotFoundException when order missing', async () => {
      prismaMock.order.findUnique.mockResolvedValue(null)
      await expect(service.remove('x')).rejects.toThrow(NotFoundException)
    })
  })
})
