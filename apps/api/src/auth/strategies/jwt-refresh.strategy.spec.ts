import { ConfigService } from '@nestjs/config'
import { JwtRefreshStrategy } from './jwt-refresh.strategy'

const mockConfig = { get: jest.fn().mockReturnValue('test-refresh-secret') }

describe('JwtRefreshStrategy', () => {
  let strategy: JwtRefreshStrategy

  beforeEach(() => {
    strategy = new JwtRefreshStrategy(mockConfig as unknown as ConfigService)
  })

  it('validate maps sub to id and attaches refreshToken from cookie', () => {
    const req = { cookies: { refresh_token: 'raw-token' } }
    const payload = { sub: 'uuid-1', email: 'a@b.com', role: 'manager' }

    const result = strategy.validate(req, payload)

    expect(result).toEqual({
      id: 'uuid-1',
      email: 'a@b.com',
      role: 'manager',
      refreshToken: 'raw-token',
    })
  })

  it('validate sets refreshToken to undefined when cookie absent', () => {
    const req = { cookies: {} }
    const payload = { sub: 'uuid-1', email: 'a@b.com', role: 'manager' }

    const result = strategy.validate(req, payload)

    expect(result.refreshToken).toBeUndefined()
  })
})
