import { Test } from '@nestjs/testing'
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify'
import fastifyCookie from '@fastify/cookie'
import { AuthController } from './auth.controller'
import { AuthService } from './auth.service'

const mockAuthService = {
  login: jest.fn(),
  refresh: jest.fn(),
  logout: jest.fn(),
}

describe('AuthController', () => {
  let app: NestFastifyApplication

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: mockAuthService }],
    }).compile()

    app = module.createNestApplication<NestFastifyApplication>(new FastifyAdapter())
    await app.register(fastifyCookie)
    await app.init()
    await app.getHttpAdapter().getInstance().ready()
  })

  afterAll(() => app.close())
  beforeEach(() => jest.clearAllMocks())

  it('POST /auth/login returns 200 with accessToken and sets cookie', async () => {
    mockAuthService.login.mockResolvedValue({
      accessToken: 'tok',
      refreshToken: 'ref',
      user: { id: '1', email: 'a@b.com', role: 'manager', name: 'A', active: true },
    })

    const res = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email: 'a@b.com', password: 'admin123' },
    })

    expect(res.statusCode).toBe(200)
    const body = JSON.parse(res.body)
    expect(body.accessToken).toBe('tok')
    expect(body).not.toHaveProperty('refreshToken')
    const cookie = res.headers['set-cookie'] as string
    expect(cookie).toMatch(/refresh_token=ref/)
  })

  it('POST /auth/login returns 400 for invalid body', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email: 'not-an-email', password: '' },
    })
    expect(res.statusCode).toBe(400)
  })

  it('POST /auth/logout returns 204 and clears cookie', async () => {
    mockAuthService.logout.mockResolvedValue(undefined)
    const res = await app.inject({
      method: 'POST',
      url: '/auth/logout',
      cookies: { refresh_token: 'ref' },
    })
    expect(res.statusCode).toBe(204)
  })
})
