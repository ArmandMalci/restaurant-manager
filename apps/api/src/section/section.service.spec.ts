import { Test } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { SectionService } from './section.service';
import { PrismaService } from '../prisma/prisma.service';

const mockSection = {
  id: 'sec-1',
  name: 'Main Room',
  sortOrder: 0,
};

const prismaMock = {
  section: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
};

describe('SectionService', () => {
  let service: SectionService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [SectionService, { provide: PrismaService, useValue: prismaMock }],
    }).compile();

    service = module.get(SectionService);
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('returns sections ordered by sortOrder', async () => {
      prismaMock.section.findMany.mockResolvedValue([mockSection]);
      const result = await service.findAll();

      expect(result).toEqual([mockSection]);
      expect(prismaMock.section.findMany).toHaveBeenCalledWith({
        orderBy: { sortOrder: 'asc' },
      });
    });
  });

  describe('findOne', () => {
    it('returns section when found', async () => {
      prismaMock.section.findUnique.mockResolvedValue(mockSection);
      expect(await service.findOne('sec-1')).toEqual(mockSection);
    });

    it('throws NotFoundException when not found', async () => {
      prismaMock.section.findUnique.mockResolvedValue(null);
      await expect(service.findOne('missing')).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('creates and returns section', async () => {
      prismaMock.section.create.mockResolvedValue(mockSection);
      const result = await service.create({ name: 'Main Room', sortOrder: 0 });

      expect(result).toEqual(mockSection);
    });
  });

  describe('update', () => {
    it('updates section when it exists', async () => {
      prismaMock.section.findUnique.mockResolvedValue(mockSection);
      prismaMock.section.update.mockResolvedValue({ ...mockSection, name: 'Patio' });
      const result = await service.update('sec-1', { name: 'Patio' });

      expect(result.name).toBe('Patio');
    });

    it('throws NotFoundException when section missing', async () => {
      prismaMock.section.findUnique.mockResolvedValue(null);
      await expect(service.update('x', { name: 'Patio' })).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('deletes an existing section', async () => {
      prismaMock.section.findUnique.mockResolvedValue(mockSection);
      prismaMock.section.delete.mockResolvedValue(mockSection);

      await service.remove('sec-1');

      expect(prismaMock.section.delete).toHaveBeenCalledWith({ where: { id: 'sec-1' } });
    });

    it('throws NotFoundException when section missing', async () => {
      prismaMock.section.findUnique.mockResolvedValue(null);
      await expect(service.remove('x')).rejects.toThrow(NotFoundException);
    });
  });
});
