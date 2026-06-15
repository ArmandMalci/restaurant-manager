import { Test, type TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ShiftService } from './shift.service';
import { PrismaService } from '../prisma/prisma.service';

const mockShift = {
  id: 'shift-uuid-1',
  staffId: 'staff-uuid-1',
  startTime: new Date('2026-06-13T08:00:00Z'),
  endTime: new Date('2026-06-13T16:00:00Z'),
  createdAt: new Date(),
};

const mockPrisma = {
  shift: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
};

describe('ShiftService', () => {
  let service: ShiftService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ShiftService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();

    service = module.get(ShiftService);
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('returns all shifts without filter', async () => {
      mockPrisma.shift.findMany.mockResolvedValue([mockShift]);
      const result = await service.findAll();

      expect(result).toEqual([mockShift]);
      expect(mockPrisma.shift.findMany).toHaveBeenCalledWith({
        where: undefined,
        orderBy: { startTime: 'asc' },
      });
    });

    it('filters by date range when from and to are provided', async () => {
      mockPrisma.shift.findMany.mockResolvedValue([mockShift]);
      await service.findAll('2026-06-13', '2026-06-13');
      const call = mockPrisma.shift.findMany.mock.calls[0][0];

      expect(call.where.startTime.gte).toEqual(new Date('2026-06-13'));
    });
  });

  describe('findOne', () => {
    it('returns shift when found', async () => {
      mockPrisma.shift.findUnique.mockResolvedValue(mockShift);
      const result = await service.findOne('shift-uuid-1');

      expect(result).toEqual(mockShift);
    });

    it('throws NotFoundException when not found', async () => {
      mockPrisma.shift.findUnique.mockResolvedValue(null);
      await expect(service.findOne('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('creates a shift with provided data', async () => {
      mockPrisma.shift.create.mockResolvedValue(mockShift);
      const dto = {
        staffId: 'staff-uuid-1',
        startTime: '2026-06-13T08:00:00.000Z',
        endTime: '2026-06-13T16:00:00.000Z',
      };
      const result = await service.create(dto);

      expect(result).toEqual(mockShift);
      expect(mockPrisma.shift.create).toHaveBeenCalledWith({
        data: {
          staffId: 'staff-uuid-1',
          startTime: new Date('2026-06-13T08:00:00Z'),
          endTime: new Date('2026-06-13T16:00:00Z'),
        },
      });
    });
  });

  describe('update', () => {
    it('updates a shift when found', async () => {
      mockPrisma.shift.findUnique.mockResolvedValue(mockShift);
      const updated = { ...mockShift, endTime: new Date('2026-06-13T18:00:00Z') };

      mockPrisma.shift.update.mockResolvedValue(updated);
      const result = await service.update('shift-uuid-1', {
        endTime: '2026-06-13T18:00:00.000Z',
      });

      expect(result.endTime).toEqual(new Date('2026-06-13T18:00:00Z'));
    });

    it('throws NotFoundException when shift not found', async () => {
      mockPrisma.shift.findUnique.mockResolvedValue(null);
      await expect(service.update('nonexistent', {})).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('deletes a shift when found', async () => {
      mockPrisma.shift.findUnique.mockResolvedValue(mockShift);
      mockPrisma.shift.delete.mockResolvedValue(mockShift);
      const result = await service.remove('shift-uuid-1');

      expect(result).toEqual(mockShift);
    });

    it('throws NotFoundException when shift not found', async () => {
      mockPrisma.shift.findUnique.mockResolvedValue(null);
      await expect(service.remove('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });
});
