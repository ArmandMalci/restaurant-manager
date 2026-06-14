import { Test } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ReservationService } from './reservation.service';
import { PrismaService } from '../prisma/prisma.service';

const mockRes = {
  id: 'res-1',
  tableId: 'tbl-1',
  guestName: 'Alice',
  guestEmail: 'alice@test.com',
  guestPhone: null,
  partySize: 2,
  date: new Date('2026-08-01T19:00:00Z'),
  notes: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const prismaMock = {
  reservation: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
};

describe('ReservationService', () => {
  let service: ReservationService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [ReservationService, { provide: PrismaService, useValue: prismaMock }],
    }).compile();
    service = module.get(ReservationService);
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('returns all reservations when no date filter', async () => {
      prismaMock.reservation.findMany.mockResolvedValue([mockRes]);
      const result = await service.findAll();
      expect(result).toEqual([mockRes]);
      expect(prismaMock.reservation.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: undefined }),
      );
    });

    it('filters by date range when date provided', async () => {
      prismaMock.reservation.findMany.mockResolvedValue([mockRes]);
      await service.findAll('2026-08-01');
      expect(prismaMock.reservation.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            date: expect.objectContaining({ gte: expect.any(Date) }),
          }),
        }),
      );
    });
  });

  describe('findOne', () => {
    it('returns reservation when found', async () => {
      prismaMock.reservation.findUnique.mockResolvedValue(mockRes);
      expect(await service.findOne('res-1')).toEqual(mockRes);
    });

    it('throws NotFoundException when not found', async () => {
      prismaMock.reservation.findUnique.mockResolvedValue(null);
      await expect(service.findOne('missing')).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('creates and returns reservation', async () => {
      prismaMock.reservation.create.mockResolvedValue(mockRes);
      const dto = {
        tableId: 'tbl-1',
        guestName: 'Alice',
        guestEmail: 'alice@test.com',
        guestPhone: null,
        partySize: 2,
        date: new Date('2026-08-01T19:00:00Z'),
        notes: null,
      };
      const result = await service.create(dto);
      expect(result).toEqual(mockRes);
    });
  });

  describe('update', () => {
    it('updates reservation when it exists', async () => {
      prismaMock.reservation.findUnique.mockResolvedValue(mockRes);
      prismaMock.reservation.update.mockResolvedValue({ ...mockRes, partySize: 4 });
      const result = await service.update('res-1', { partySize: 4 });
      expect(result.partySize).toBe(4);
    });

    it('throws NotFoundException when not found', async () => {
      prismaMock.reservation.findUnique.mockResolvedValue(null);
      await expect(service.update('x', { partySize: 4 })).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('deletes reservation when it exists', async () => {
      prismaMock.reservation.findUnique.mockResolvedValue(mockRes);
      prismaMock.reservation.delete.mockResolvedValue(mockRes);
      await service.remove('res-1');
      expect(prismaMock.reservation.delete).toHaveBeenCalledWith({ where: { id: 'res-1' } });
    });

    it('throws NotFoundException when not found', async () => {
      prismaMock.reservation.findUnique.mockResolvedValue(null);
      await expect(service.remove('x')).rejects.toThrow(NotFoundException);
    });
  });
});
