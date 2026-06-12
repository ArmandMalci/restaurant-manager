import { Reflector } from '@nestjs/core'
import { RolesGuard } from './roles.guard'

function makeCtx(role: string) {
  return {
    switchToHttp: () => ({ getRequest: () => ({ user: { role } }) }),
    getHandler: () => ({}),
    getClass: () => ({}),
  } as any
}

describe('RolesGuard', () => {
  let guard: RolesGuard
  let reflector: Reflector

  beforeEach(() => {
    reflector = new Reflector()
    guard = new RolesGuard(reflector)
  })

  it('allows when no roles required', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined)
    expect(guard.canActivate(makeCtx('kitchen'))).toBe(true)
  })

  it('allows manager on manager-only route', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['manager'])
    expect(guard.canActivate(makeCtx('manager'))).toBe(true)
  })

  it('blocks kitchen on manager-only route', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['manager'])
    expect(guard.canActivate(makeCtx('kitchen'))).toBe(false)
  })

  it('allows host on waiter-level route (host > waiter in hierarchy)', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['waiter'])
    expect(guard.canActivate(makeCtx('host'))).toBe(true)
  })

  it('returns false when user is undefined', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['manager'])
    const ctx = {
      switchToHttp: () => ({ getRequest: () => ({ user: undefined }) }),
      getHandler: () => ({}),
      getClass: () => ({}),
    } as any
    expect(guard.canActivate(ctx)).toBe(false)
  })
})
