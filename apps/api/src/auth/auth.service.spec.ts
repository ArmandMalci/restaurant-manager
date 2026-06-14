import { Test } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';

const mockPrisma = {
  staff: { findUnique: jest.fn() },
  refreshToken: {
    create: jest.fn(),
    findUnique: jest.fn(),
    delete: jest.fn(),
  },
};
const mockJwt = { signAsync: jest.fn().mockResolvedValue('signed-token') };
const mockConfig = { get: jest.fn().mockReturnValue('secret') };

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: JwtService, useValue: mockJwt },
        { provide: ConfigService, useValue: mockConfig },
      ],
    }).compile();
    service = module.get(AuthService);
    jest.clearAllMocks();
    mockJwt.signAsync.mockResolvedValue('signed-token');
  });

  describe('validateUser', () => {
    it('returns user without passwordHash on valid credentials', async () => {
      const hash = await bcrypt.hash('password123', 10);
      mockPrisma.staff.findUnique.mockResolvedValue({
        id: 'uuid-1',
        email: 'a@b.com',
        passwordHash: hash,
        role: 'manager',
        active: true,
        name: 'A',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      const result = await service.validateUser('a@b.com', 'password123');
      expect(result).not.toBeNull();
      expect(result).not.toHaveProperty('passwordHash');
      expect(result?.email).toBe('a@b.com');
    });

    it('returns null for wrong password', async () => {
      const hash = await bcrypt.hash('correct', 10);
      mockPrisma.staff.findUnique.mockResolvedValue({
        id: 'uuid-1',
        email: 'a@b.com',
        passwordHash: hash,
        role: 'manager',
        active: true,
        name: 'A',
      });
      expect(await service.validateUser('a@b.com', 'wrong')).toBeNull();
    });

    it('returns null when user not found', async () => {
      mockPrisma.staff.findUnique.mockResolvedValue(null);
      expect(await service.validateUser('none@b.com', 'x')).toBeNull();
    });

    it('returns null for inactive staff', async () => {
      const hash = await bcrypt.hash('pass', 10);
      mockPrisma.staff.findUnique.mockResolvedValue({
        id: 'uuid-1',
        email: 'a@b.com',
        passwordHash: hash,
        role: 'waiter',
        active: false,
        name: 'A',
      });
      expect(await service.validateUser('a@b.com', 'pass')).toBeNull();
    });
  });

  describe('login', () => {
    it('throws UnauthorizedException for bad credentials', async () => {
      mockPrisma.staff.findUnique.mockResolvedValue(null);
      await expect(service.login({ email: 'x@x.com', password: 'bad' })).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('returns accessToken and creates refresh token on success', async () => {
      const hash = await bcrypt.hash('pass123', 10);
      mockPrisma.staff.findUnique.mockResolvedValue({
        id: 'uuid-1',
        email: 'a@b.com',
        passwordHash: hash,
        role: 'manager',
        active: true,
        name: 'A',
      });
      mockPrisma.refreshToken.create.mockResolvedValue({});

      const result = await service.login({ email: 'a@b.com', password: 'pass123' });
      expect(result.accessToken).toBe('signed-token');
      expect(typeof result.refreshToken).toBe('string');
      expect(result.user.email).toBe('a@b.com');
      expect(mockPrisma.refreshToken.create).toHaveBeenCalledTimes(1);
    });

    it('propagates error when refresh token DB write fails', async () => {
      const hash = await bcrypt.hash('pass123', 10);
      mockPrisma.staff.findUnique.mockResolvedValue({
        id: 'uuid-1',
        email: 'a@b.com',
        passwordHash: hash,
        role: 'manager',
        active: true,
        name: 'A',
      });
      mockPrisma.refreshToken.create.mockRejectedValue(new Error('DB write failed'));
      await expect(service.login({ email: 'a@b.com', password: 'pass123' })).rejects.toThrow(
        'DB write failed',
      );
    });
  });

  describe('refresh', () => {
    it('throws UnauthorizedException for unknown token', async () => {
      mockPrisma.refreshToken.findUnique.mockResolvedValue(null);
      await expect(service.refresh('uid', 'email', 'manager', 'bad-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('throws UnauthorizedException when token belongs to different staff', async () => {
      mockPrisma.refreshToken.findUnique.mockResolvedValue({
        id: 'rt-1',
        token: 'tok',
        staffId: 'other-uid',
        expiresAt: new Date(Date.now() + 100_000),
      });
      await expect(service.refresh('uid', 'email', 'manager', 'tok')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('throws UnauthorizedException for expired token', async () => {
      mockPrisma.refreshToken.findUnique.mockResolvedValue({
        id: 'rt-1',
        token: 'tok',
        staffId: 'uid',
        expiresAt: new Date(Date.now() - 1000),
      });
      await expect(service.refresh('uid', 'email', 'manager', 'tok')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('rotates token on valid refresh', async () => {
      mockPrisma.refreshToken.findUnique.mockResolvedValue({
        id: 'rt-1',
        token: 'valid-tok',
        staffId: 'uid',
        expiresAt: new Date(Date.now() + 100_000),
      });
      mockPrisma.refreshToken.delete.mockResolvedValue({});
      mockPrisma.refreshToken.create.mockResolvedValue({});

      const result = await service.refresh('uid', 'email', 'manager', 'valid-tok');
      expect(result.accessToken).toBe('signed-token');
      expect(typeof result.refreshToken).toBe('string');
      expect(mockPrisma.refreshToken.delete).toHaveBeenCalledWith({ where: { id: 'rt-1' } });
      expect(mockPrisma.refreshToken.create).toHaveBeenCalledTimes(1);
    });

    it('propagates error when access token signing fails', async () => {
      mockPrisma.refreshToken.findUnique.mockResolvedValue({
        id: 'rt-1',
        token: 'valid-tok',
        staffId: 'uid',
        expiresAt: new Date(Date.now() + 100_000),
      });
      mockPrisma.refreshToken.delete.mockResolvedValue({});
      mockJwt.signAsync.mockRejectedValue(new Error('signing failed'));
      await expect(service.refresh('uid', 'email', 'manager', 'valid-tok')).rejects.toThrow(
        'signing failed',
      );
    });

    it('propagates error when new token creation fails after old token deleted', async () => {
      mockPrisma.refreshToken.findUnique.mockResolvedValue({
        id: 'rt-1',
        token: 'valid-tok',
        staffId: 'uid',
        expiresAt: new Date(Date.now() + 100_000),
      });
      mockPrisma.refreshToken.delete.mockResolvedValue({});
      mockPrisma.refreshToken.create.mockRejectedValue(new Error('DB write failed'));
      await expect(service.refresh('uid', 'email', 'manager', 'valid-tok')).rejects.toThrow(
        'DB write failed',
      );
      expect(mockPrisma.refreshToken.delete).toHaveBeenCalledWith({ where: { id: 'rt-1' } });
    });
  });

  describe('logout', () => {
    it('deletes refresh token', async () => {
      mockPrisma.refreshToken.delete.mockResolvedValue({});
      await service.logout('tok');
      expect(mockPrisma.refreshToken.delete).toHaveBeenCalledWith({ where: { token: 'tok' } });
    });

    it('does not throw when token not found', async () => {
      mockPrisma.refreshToken.delete.mockRejectedValue(new Error('not found'));
      await expect(service.logout('nonexistent')).resolves.not.toThrow();
    });
  });
});
