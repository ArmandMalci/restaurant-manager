import { Test } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { StaffService } from './staff.service';
import { PrismaService } from '../prisma/prisma.service';

jest.mock('bcrypt', () => ({ hash: jest.fn().mockResolvedValue('hashed') }));

const mockRow = {
  id: 'staff-1',
  name: 'Alice',
  email: 'alice@test.com',
  role: 'manager',
  active: true,
  passwordHash: 'hashed',
  createdAt: new Date(),
  updatedAt: new Date(),
};
const mockStripped = {
  id: 'staff-1',
  name: 'Alice',
  email: 'alice@test.com',
  role: 'manager',
  active: true,
  createdAt: mockRow.createdAt,
  updatedAt: mockRow.updatedAt,
};

const prismaMock = {
  staff: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
};

describe('StaffService', () => {
  let service: StaffService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [StaffService, { provide: PrismaService, useValue: prismaMock }],
    }).compile();
    service = module.get(StaffService);
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('returns stripped staff ordered by name', async () => {
      prismaMock.staff.findMany.mockResolvedValue([mockRow]);
      const result = await service.findAll();
      expect(result[0]).not.toHaveProperty('passwordHash');
      expect(prismaMock.staff.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: undefined }),
      );
    });

    it('filters by role when provided', async () => {
      prismaMock.staff.findMany.mockResolvedValue([mockRow]);
      await service.findAll('manager');
      expect(prismaMock.staff.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { role: 'manager' } }),
      );
    });
  });

  describe('findOne', () => {
    it('returns stripped staff when found', async () => {
      prismaMock.staff.findUnique.mockResolvedValue(mockRow);
      const result = await service.findOne('staff-1');
      expect(result).not.toHaveProperty('passwordHash');
    });

    it('throws NotFoundException when not found', async () => {
      prismaMock.staff.findUnique.mockResolvedValue(null);
      await expect(service.findOne('x')).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('hashes password and creates staff', async () => {
      prismaMock.staff.create.mockResolvedValue(mockRow);
      await service.create({
        name: 'Alice',
        email: 'alice@test.com',
        role: 'manager',
        active: true,
        password: 'secret123',
      });
      expect(bcrypt.hash).toHaveBeenCalledWith('secret123', 10);
      expect(prismaMock.staff.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ passwordHash: 'hashed' }),
        }),
      );
    });
  });

  describe('update', () => {
    it('hashes new password when provided', async () => {
      prismaMock.staff.findUnique.mockResolvedValue(mockRow);
      prismaMock.staff.update.mockResolvedValue({ ...mockRow, name: 'Bob' });
      await service.update('staff-1', { name: 'Bob', password: 'newpass1' });
      expect(bcrypt.hash).toHaveBeenCalledWith('newpass1', 10);
    });

    it('throws NotFoundException when staff missing', async () => {
      prismaMock.staff.findUnique.mockResolvedValue(null);
      await expect(service.update('x', { name: 'Bob' })).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('deletes staff when found', async () => {
      prismaMock.staff.findUnique.mockResolvedValue(mockRow);
      prismaMock.staff.delete.mockResolvedValue(mockRow);
      await service.remove('staff-1');
      expect(prismaMock.staff.delete).toHaveBeenCalledWith({ where: { id: 'staff-1' } });
    });

    it('throws NotFoundException when not found', async () => {
      prismaMock.staff.findUnique.mockResolvedValue(null);
      await expect(service.remove('x')).rejects.toThrow(NotFoundException);
    });
  });

  describe('setActive', () => {
    it('sets active flag', async () => {
      prismaMock.staff.findUnique.mockResolvedValue(mockRow);
      prismaMock.staff.update.mockResolvedValue({ ...mockRow, active: false });
      const result = await service.setActive('staff-1', false);
      expect(result).not.toHaveProperty('passwordHash');
      expect(prismaMock.staff.update).toHaveBeenCalledWith({
        where: { id: 'staff-1' },
        data: { active: false },
      });
    });

    it('throws NotFoundException when not found', async () => {
      prismaMock.staff.findUnique.mockResolvedValue(null);
      await expect(service.setActive('x', false)).rejects.toThrow(NotFoundException);
    });
  });
});
