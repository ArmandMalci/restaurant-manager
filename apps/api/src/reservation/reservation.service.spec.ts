import { Test } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
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
  status: 'booked',
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
        date: '2026-08-01T19:00:00.000Z',
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

    it('allows booked → seated and stamps seatedAt', async () => {
      prismaMock.reservation.findUnique.mockResolvedValue(mockRes);
      prismaMock.reservation.update.mockResolvedValue({ ...mockRes, status: 'seated' });
      await service.update('res-1', { status: 'seated' });

      expect(prismaMock.reservation.update).toHaveBeenCalledWith({
        where: { id: 'res-1' },
        data: { status: 'seated', seatedAt: expect.any(Date) },
      });
    });

    it('allows booked → no_show', async () => {
      prismaMock.reservation.findUnique.mockResolvedValue(mockRes);
      prismaMock.reservation.update.mockResolvedValue({ ...mockRes, status: 'no_show' });
      await service.update('res-1', { status: 'no_show' });

      expect(prismaMock.reservation.update).toHaveBeenCalledWith({
        where: { id: 'res-1' },
        data: { status: 'no_show' },
      });
    });

    it('allows any status → cancelled', async () => {
      prismaMock.reservation.findUnique.mockResolvedValue({ ...mockRes, status: 'seated' });
      prismaMock.reservation.update.mockResolvedValue({ ...mockRes, status: 'cancelled' });
      await service.update('res-1', { status: 'cancelled' });

      expect(prismaMock.reservation.update).toHaveBeenCalledWith({
        where: { id: 'res-1' },
        data: { status: 'cancelled' },
      });
    });

    it('rejects no_show → booked', async () => {
      prismaMock.reservation.findUnique.mockResolvedValue({ ...mockRes, status: 'no_show' });
      await expect(service.update('res-1', { status: 'booked' })).rejects.toThrow(
        BadRequestException,
      );
      expect(prismaMock.reservation.update).not.toHaveBeenCalled();
    });

    it('rejects transitions out of cancelled', async () => {
      prismaMock.reservation.findUnique.mockResolvedValue({ ...mockRes, status: 'cancelled' });
      await expect(service.update('res-1', { status: 'seated' })).rejects.toThrow(
        BadRequestException,
      );
    });

    it('treats same-status as a no-op (no seatedAt stamp)', async () => {
      prismaMock.reservation.findUnique.mockResolvedValue(mockRes);
      prismaMock.reservation.update.mockResolvedValue(mockRes);
      await service.update('res-1', { status: 'booked' });

      expect(prismaMock.reservation.update).toHaveBeenCalledWith({
        where: { id: 'res-1' },
        data: {},
      });
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
