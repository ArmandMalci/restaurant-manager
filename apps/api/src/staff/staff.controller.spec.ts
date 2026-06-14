import { type ExecutionContext, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { StaffController } from './staff.controller';
import { StaffService } from './staff.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';

const mockStaff = {
  id: '00000000-0000-0000-0000-000000000001',
  name: 'Jane Smith',
  email: 'jane@example.com',
  role: 'waiter',
  active: true,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const mockStaffService = {
  findAll: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
  setActive: jest.fn(),
};

const allowAll = {
  canActivate: (ctx: ExecutionContext) => {
    const req = ctx.switchToHttp().getRequest();

    req.user = { id: '00000000-0000-0000-0000-000000000099', role: 'manager' };

    return true;
  },
};

describe('StaffController', () => {
  let app: NestFastifyApplication;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [StaffController],
      providers: [{ provide: StaffService, useValue: mockStaffService }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(allowAll)
      .overrideGuard(RolesGuard)
      .useValue(allowAll)
      .compile();

    app = module.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });

  afterAll(() => app.close());
  beforeEach(() => jest.clearAllMocks());

  describe('GET /staff', () => {
    it('returns 200 with all staff when no role filter', async () => {
      mockStaffService.findAll.mockResolvedValue([mockStaff]);
      const res = await app.inject({ method: 'GET', url: '/staff' });

      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res.body)).toEqual([mockStaff]);
      expect(mockStaffService.findAll).toHaveBeenCalledWith(undefined);
    });

    it('passes role query param to service', async () => {
      mockStaffService.findAll.mockResolvedValue([mockStaff]);
      const res = await app.inject({ method: 'GET', url: '/staff?role=waiter' });

      expect(res.statusCode).toBe(200);
      expect(mockStaffService.findAll).toHaveBeenCalledWith('waiter');
    });
  });

  describe('GET /staff/:id', () => {
    it('returns 200 with the requested staff member', async () => {
      mockStaffService.findOne.mockResolvedValue(mockStaff);
      const res = await app.inject({ method: 'GET', url: `/staff/${mockStaff.id}` });

      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res.body)).toEqual(mockStaff);
      expect(mockStaffService.findOne).toHaveBeenCalledWith(mockStaff.id);
    });

    it('returns 404 when staff member not found', async () => {
      mockStaffService.findOne.mockRejectedValue(new NotFoundException());
      const res = await app.inject({ method: 'GET', url: '/staff/missing' });

      expect(res.statusCode).toBe(404);
    });
  });

  describe('POST /staff', () => {
    it('returns 201 with the created staff member', async () => {
      mockStaffService.create.mockResolvedValue(mockStaff);
      const res = await app.inject({
        method: 'POST',
        url: '/staff',
        payload: {
          name: 'Jane Smith',
          email: 'jane@example.com',
          role: 'waiter',
          active: true,
          password: 'securepassword',
        },
      });

      expect(res.statusCode).toBe(201);
      expect(JSON.parse(res.body)).toEqual(mockStaff);
    });
  });

  describe('PATCH /staff/:id', () => {
    it('returns 200 with updated staff member', async () => {
      const updated = { ...mockStaff, name: 'Jane Doe' };

      mockStaffService.update.mockResolvedValue(updated);
      const res = await app.inject({
        method: 'PATCH',
        url: `/staff/${mockStaff.id}`,
        payload: { name: 'Jane Doe' },
      });

      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res.body).name).toBe('Jane Doe');
      expect(mockStaffService.update).toHaveBeenCalledWith(mockStaff.id, { name: 'Jane Doe' });
    });

    it('returns 404 when staff member not found', async () => {
      mockStaffService.update.mockRejectedValue(new NotFoundException());
      const res = await app.inject({
        method: 'PATCH',
        url: '/staff/missing',
        payload: { name: 'X' },
      });

      expect(res.statusCode).toBe(404);
    });
  });

  describe('DELETE /staff/:id', () => {
    it('returns 204 on successful deletion', async () => {
      mockStaffService.remove.mockResolvedValue(undefined);
      const res = await app.inject({ method: 'DELETE', url: `/staff/${mockStaff.id}` });

      expect(res.statusCode).toBe(204);
      expect(mockStaffService.remove).toHaveBeenCalledWith(mockStaff.id);
    });

    it('returns 404 when staff member not found', async () => {
      mockStaffService.remove.mockRejectedValue(new NotFoundException());
      const res = await app.inject({ method: 'DELETE', url: '/staff/missing' });

      expect(res.statusCode).toBe(404);
    });
  });

  describe('PATCH /staff/:id/active', () => {
    it('returns 200 and sets active to false', async () => {
      const deactivated = { ...mockStaff, active: false };

      mockStaffService.setActive.mockResolvedValue(deactivated);
      const res = await app.inject({
        method: 'PATCH',
        url: `/staff/${mockStaff.id}/active`,
        payload: { active: false },
      });

      expect(res.statusCode).toBe(200);
      expect(mockStaffService.setActive).toHaveBeenCalledWith(mockStaff.id, false);
    });

    it('returns 200 and sets active to true', async () => {
      mockStaffService.setActive.mockResolvedValue(mockStaff);
      const res = await app.inject({
        method: 'PATCH',
        url: `/staff/${mockStaff.id}/active`,
        payload: { active: true },
      });

      expect(res.statusCode).toBe(200);
      expect(mockStaffService.setActive).toHaveBeenCalledWith(mockStaff.id, true);
    });

    it('returns 404 when staff member not found', async () => {
      mockStaffService.setActive.mockRejectedValue(new NotFoundException());
      const res = await app.inject({
        method: 'PATCH',
        url: '/staff/missing/active',
        payload: { active: false },
      });

      expect(res.statusCode).toBe(404);
    });
  });
});
