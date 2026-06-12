import { ExecutionContext, UnauthorizedException } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify'
import fastifyCookie from '@fastify/cookie'
import { AuthController } from './auth.controller'
import { AuthService } from './auth.service'
import { JwtRefreshGuard } from './guards/jwt-refresh.guard'

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
    })
      .overrideGuard(JwtRefreshGuard)
      .useValue({
        canActivate: (ctx: ExecutionContext) => {
          const req = ctx.switchToHttp().getRequest()
          req.user = { id: 'uid', email: 'a@b.com', role: 'manager', refreshToken: 'old-ref' }
          return true
        },
      })
      .compile()

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

  it('POST /auth/login cookie has correct security attributes', async () => {
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

    const cookie = res.headers['set-cookie'] as string
    expect(cookie).toMatch(/HttpOnly/i)
    expect(cookie).toMatch(/SameSite=Strict/i)
    expect(cookie).toMatch(/Path=\/auth\/refresh/)
    expect(cookie).toMatch(/Max-Age=604800/)
  })

  it('POST /auth/refresh returns 200 with new accessToken and rotates cookie', async () => {
    mockAuthService.refresh.mockResolvedValue({
      accessToken: 'new-tok',
      refreshToken: 'new-ref',
    })

    const res = await app.inject({
      method: 'POST',
      url: '/auth/refresh',
      cookies: { refresh_token: 'old-ref' },
    })

    expect(res.statusCode).toBe(200)
    const body = JSON.parse(res.body)
    expect(body.accessToken).toBe('new-tok')
    expect(body).not.toHaveProperty('refreshToken')
    const cookie = res.headers['set-cookie'] as string
    expect(cookie).toMatch(/refresh_token=new-ref/)
    expect(mockAuthService.refresh).toHaveBeenCalledWith('uid', 'a@b.com', 'manager', 'old-ref')
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

  it('POST /auth/logout returns 204 and skips service call when no cookie', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/auth/logout',
    })
    expect(res.statusCode).toBe(204)
    expect(mockAuthService.logout).not.toHaveBeenCalled()
  })

  it('POST /auth/login returns 401 when service throws UnauthorizedException', async () => {
    mockAuthService.login.mockRejectedValue(new UnauthorizedException('Invalid credentials'))
    const res = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email: 'a@b.com', password: 'wrong' },
    })
    expect(res.statusCode).toBe(401)
  })

  it('POST /auth/refresh cookie has correct security attributes', async () => {
    mockAuthService.refresh.mockResolvedValue({
      accessToken: 'new-tok',
      refreshToken: 'new-ref',
    })
    const res = await app.inject({
      method: 'POST',
      url: '/auth/refresh',
      cookies: { refresh_token: 'old-ref' },
    })
    const cookie = res.headers['set-cookie'] as string
    expect(cookie).toMatch(/HttpOnly/i)
    expect(cookie).toMatch(/SameSite=Strict/i)
    expect(cookie).toMatch(/Path=\/auth\/refresh/)
    expect(cookie).toMatch(/Max-Age=604800/)
  })
})
