import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { ReservationController } from './reservation.controller';
import { ReservationService } from './reservation.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';

const mockReservation = {
  id: 'res-1',
  tableId: '00000000-0000-0000-0000-000000000001',
  guestName: 'Alice Smith',
  guestPhone: null,
  guestEmail: 'alice@example.com',
  partySize: 2,
  date: new Date('2026-07-01T19:00:00.000Z').toISOString(),
  notes: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const mockReservationService = {
  findAll: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
};

const allowAll = { canActivate: () => true };

describe('ReservationController', () => {
  let app: NestFastifyApplication;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [ReservationController],
      providers: [{ provide: ReservationService, useValue: mockReservationService }],
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

  describe('GET /reservations', () => {
    it('returns 200 with reservation list', async () => {
      mockReservationService.findAll.mockResolvedValue([mockReservation]);
      const res = await app.inject({ method: 'GET', url: '/reservations' });

      expect(res.statusCode).toBe(200);
      expect(mockReservationService.findAll).toHaveBeenCalledWith(undefined);
    });

    it('passes date query param to service', async () => {
      mockReservationService.findAll.mockResolvedValue([mockReservation]);
      const res = await app.inject({ method: 'GET', url: '/reservations?date=2026-07-01' });

      expect(res.statusCode).toBe(200);
      expect(mockReservationService.findAll).toHaveBeenCalledWith('2026-07-01');
    });
  });

  describe('GET /reservations/:id', () => {
    it('returns 200 with the requested reservation', async () => {
      mockReservationService.findOne.mockResolvedValue(mockReservation);
      const res = await app.inject({ method: 'GET', url: '/reservations/res-1' });

      expect(res.statusCode).toBe(200);
      expect(mockReservationService.findOne).toHaveBeenCalledWith('res-1');
    });

    it('returns 404 when reservation not found', async () => {
      mockReservationService.findOne.mockRejectedValue(new NotFoundException());
      const res = await app.inject({ method: 'GET', url: '/reservations/missing' });

      expect(res.statusCode).toBe(404);
    });
  });

  describe('POST /reservations', () => {
    it('returns 201 with created reservation', async () => {
      mockReservationService.create.mockResolvedValue(mockReservation);
      const res = await app.inject({
        method: 'POST',
        url: '/reservations',
        payload: {
          tableId: '00000000-0000-0000-0000-000000000001',
          guestName: 'Alice Smith',
          guestEmail: 'alice@example.com',
          partySize: 2,
          date: '2026-07-01T19:00:00.000Z',
        },
      });

      expect(res.statusCode).toBe(201);
      expect(mockReservationService.create).toHaveBeenCalledWith(
        expect.objectContaining({ guestName: 'Alice Smith', partySize: 2 }),
      );
    });
  });

  describe('PATCH /reservations/:id', () => {
    it('returns 200 with updated reservation', async () => {
      const updated = { ...mockReservation, partySize: 4 };

      mockReservationService.update.mockResolvedValue(updated);
      const res = await app.inject({
        method: 'PATCH',
        url: '/reservations/res-1',
        payload: { partySize: 4 },
      });

      expect(res.statusCode).toBe(200);
      expect(mockReservationService.update).toHaveBeenCalledWith('res-1', { partySize: 4 });
    });

    it('returns 404 when reservation not found', async () => {
      mockReservationService.update.mockRejectedValue(new NotFoundException());
      const res = await app.inject({
        method: 'PATCH',
        url: '/reservations/missing',
        payload: { partySize: 2 },
      });

      expect(res.statusCode).toBe(404);
    });
  });

  describe('DELETE /reservations/:id', () => {
    it('returns 204 on successful deletion', async () => {
      mockReservationService.remove.mockResolvedValue(undefined);
      const res = await app.inject({ method: 'DELETE', url: '/reservations/res-1' });

      expect(res.statusCode).toBe(204);
      expect(mockReservationService.remove).toHaveBeenCalledWith('res-1');
    });

    it('returns 404 when reservation not found', async () => {
      mockReservationService.remove.mockRejectedValue(new NotFoundException());
      const res = await app.inject({ method: 'DELETE', url: '/reservations/missing' });

      expect(res.statusCode).toBe(404);
    });
  });
});
