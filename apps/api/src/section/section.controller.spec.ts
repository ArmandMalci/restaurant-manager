import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { SectionController } from './section.controller';
import { SectionService } from './section.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';

const mockSection = {
  id: 'sec-1',
  name: 'Main Room',
  sortOrder: 0,
};

const mockSectionService = {
  findAll: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
};

const allowAll = { canActivate: () => true };

describe('SectionController', () => {
  let app: NestFastifyApplication;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [SectionController],
      providers: [{ provide: SectionService, useValue: mockSectionService }],
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

  describe('GET /sections', () => {
    it('returns 200 with section list', async () => {
      mockSectionService.findAll.mockResolvedValue([mockSection]);
      const res = await app.inject({ method: 'GET', url: '/sections' });

      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res.body)).toEqual([mockSection]);
    });
  });

  describe('GET /sections/:id', () => {
    it('returns 200 with the requested section', async () => {
      mockSectionService.findOne.mockResolvedValue(mockSection);
      const res = await app.inject({ method: 'GET', url: '/sections/sec-1' });

      expect(res.statusCode).toBe(200);
      expect(mockSectionService.findOne).toHaveBeenCalledWith('sec-1');
    });

    it('returns 404 when section not found', async () => {
      mockSectionService.findOne.mockRejectedValue(new NotFoundException());
      const res = await app.inject({ method: 'GET', url: '/sections/missing' });

      expect(res.statusCode).toBe(404);
    });
  });

  describe('POST /sections', () => {
    it('returns 201 with created section', async () => {
      mockSectionService.create.mockResolvedValue(mockSection);
      const res = await app.inject({
        method: 'POST',
        url: '/sections',
        payload: { name: 'Main Room', sortOrder: 0 },
      });

      expect(res.statusCode).toBe(201);
      expect(mockSectionService.create).toHaveBeenCalledWith({
        name: 'Main Room',
        sortOrder: 0,
      });
    });
  });

  describe('PATCH /sections/:id', () => {
    it('returns 200 with updated section', async () => {
      const updated = { ...mockSection, name: 'Patio' };

      mockSectionService.update.mockResolvedValue(updated);
      const res = await app.inject({
        method: 'PATCH',
        url: '/sections/sec-1',
        payload: { name: 'Patio' },
      });

      expect(res.statusCode).toBe(200);
      expect(mockSectionService.update).toHaveBeenCalledWith('sec-1', { name: 'Patio' });
    });

    it('returns 404 when section not found', async () => {
      mockSectionService.update.mockRejectedValue(new NotFoundException());
      const res = await app.inject({
        method: 'PATCH',
        url: '/sections/missing',
        payload: { name: 'Patio' },
      });

      expect(res.statusCode).toBe(404);
    });
  });

  describe('DELETE /sections/:id', () => {
    it('returns 204 on successful deletion', async () => {
      mockSectionService.remove.mockResolvedValue(undefined);
      const res = await app.inject({ method: 'DELETE', url: '/sections/sec-1' });

      expect(res.statusCode).toBe(204);
      expect(mockSectionService.remove).toHaveBeenCalledWith('sec-1');
    });

    it('returns 404 when section not found', async () => {
      mockSectionService.remove.mockRejectedValue(new NotFoundException());
      const res = await app.inject({ method: 'DELETE', url: '/sections/missing' });

      expect(res.statusCode).toBe(404);
    });
  });
});
