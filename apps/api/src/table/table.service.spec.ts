import { Test } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { TableService } from './table.service';
import { PrismaService } from '../prisma/prisma.service';

const mockTable = {
  id: 'tbl-1',
  number: 1,
  seats: 4,
  status: 'available' as const,
  posX: null,
  posY: null,
  shape: 'square' as const,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const prismaMock = {
  table: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  order: {
    count: jest.fn(),
  },
  reservation: {
    count: jest.fn(),
  },
  $transaction: jest.fn(),
};

describe('TableService', () => {
  let service: TableService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [TableService, { provide: PrismaService, useValue: prismaMock }],
    }).compile();

    service = module.get(TableService);
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('returns tables ordered by number', async () => {
      prismaMock.table.findMany.mockResolvedValue([mockTable]);
      const result = await service.findAll();

      expect(result).toEqual([mockTable]);
      expect(prismaMock.table.findMany).toHaveBeenCalledWith({ orderBy: { number: 'asc' } });
    });
  });

  describe('findOne', () => {
    it('returns table when found', async () => {
      prismaMock.table.findUnique.mockResolvedValue(mockTable);
      expect(await service.findOne('tbl-1')).toEqual(mockTable);
    });

    it('throws NotFoundException when not found', async () => {
      prismaMock.table.findUnique.mockResolvedValue(null);
      await expect(service.findOne('missing')).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('creates and returns table', async () => {
      prismaMock.table.create.mockResolvedValue(mockTable);
      const result = await service.create({
        number: 1,
        name: null,
        seats: 4,
        status: 'available',
        posX: null,
        posY: null,
        shape: 'square',
        sectionId: 'sec-1',
      });

      expect(result).toEqual(mockTable);
    });
  });

  describe('update', () => {
    it('updates table when it exists', async () => {
      prismaMock.table.findUnique.mockResolvedValue(mockTable);
      prismaMock.table.update.mockResolvedValue({ ...mockTable, seats: 6 });
      const result = await service.update('tbl-1', { seats: 6 });

      expect(result.seats).toBe(6);
    });

    it('throws NotFoundException when table missing', async () => {
      prismaMock.table.findUnique.mockResolvedValue(null);
      await expect(service.update('x', { seats: 6 })).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('deletes an available table with no related rows', async () => {
      prismaMock.table.findUnique.mockResolvedValue(mockTable);
      prismaMock.order.count.mockResolvedValue(0);
      prismaMock.reservation.count.mockResolvedValue(0);
      prismaMock.table.delete.mockResolvedValue(mockTable);

      await service.remove('tbl-1');

      expect(prismaMock.table.delete).toHaveBeenCalledWith({ where: { id: 'tbl-1' } });
    });

    it('throws NotFoundException when table missing', async () => {
      prismaMock.table.findUnique.mockResolvedValue(null);
      await expect(service.remove('x')).rejects.toThrow(NotFoundException);
    });

    it('throws ConflictException when table is occupied', async () => {
      prismaMock.table.findUnique.mockResolvedValue({ ...mockTable, status: 'occupied' });

      await expect(service.remove('tbl-1')).rejects.toThrow(ConflictException);
      expect(prismaMock.table.delete).not.toHaveBeenCalled();
    });

    it('throws ConflictException when table is reserved', async () => {
      prismaMock.table.findUnique.mockResolvedValue({ ...mockTable, status: 'reserved' });

      await expect(service.remove('tbl-1')).rejects.toThrow(ConflictException);
      expect(prismaMock.table.delete).not.toHaveBeenCalled();
    });

    it('throws ConflictException when an available table has related order/reservation history', async () => {
      prismaMock.table.findUnique.mockResolvedValue(mockTable);
      prismaMock.order.count.mockResolvedValue(1);
      prismaMock.reservation.count.mockResolvedValue(0);

      await expect(service.remove('tbl-1')).rejects.toThrow(ConflictException);
      expect(prismaMock.table.delete).not.toHaveBeenCalled();
    });
  });

  describe('setStatus', () => {
    it('updates status when table exists', async () => {
      prismaMock.table.findUnique.mockResolvedValue(mockTable);
      prismaMock.table.update.mockResolvedValue({ ...mockTable, status: 'occupied' });
      const result = await service.setStatus('tbl-1', { status: 'occupied' });

      expect(result.status).toBe('occupied');
      expect(prismaMock.table.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'tbl-1' },
          data: expect.objectContaining({ status: 'occupied' }),
        }),
      );
    });

    it('throws NotFoundException when table missing', async () => {
      prismaMock.table.findUnique.mockResolvedValue(null);
      await expect(service.setStatus('x', { status: 'reserved' })).rejects.toThrow(
        NotFoundException,
      );
    });

    it('sets seatedAt when a table becomes occupied', async () => {
      prismaMock.table.findUnique.mockResolvedValue({
        id: 'tbl-1',
        number: 5,
        status: 'available',
      });
      prismaMock.table.update.mockResolvedValue({ id: 'tbl-1' });

      await service.setStatus('tbl-1', { status: 'occupied' });

      expect(prismaMock.table.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'occupied', seatedAt: expect.any(Date) }),
        }),
      );
    });

    it('clears seatedAt when a table becomes available', async () => {
      prismaMock.table.findUnique.mockResolvedValue({ id: 'tbl-1', number: 5, status: 'occupied' });
      prismaMock.table.update.mockResolvedValue({ id: 'tbl-1' });

      await service.setStatus('tbl-1', { status: 'available' });

      expect(prismaMock.table.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'available', seatedAt: null }),
        }),
      );
    });
  });

  describe('saveLayout', () => {
    it('saves layout positions for each table in a transaction', async () => {
      prismaMock.$transaction.mockImplementation((ops) => Promise.resolve(ops));
      prismaMock.table.update.mockImplementation((args) => args);

      await service.saveLayout([
        { id: 't1', posX: 10, posY: 20, shape: 'round' },
        { id: 't2', posX: 30, posY: 40, shape: 'square' },
      ]);

      expect(prismaMock.table.update).toHaveBeenCalledWith({
        where: { id: 't1' },
        data: { posX: 10, posY: 20, shape: 'round' },
      });
      expect(prismaMock.table.update).toHaveBeenCalledWith({
        where: { id: 't2' },
        data: { posX: 30, posY: 40, shape: 'square' },
      });
      expect(prismaMock.$transaction).toHaveBeenCalled();
    });
  });
});
