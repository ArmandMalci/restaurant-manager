import { AuthGuard } from '@nestjs/passport';
import { JwtRefreshGuard } from './jwt-refresh.guard';

describe('JwtRefreshGuard', () => {
  it('is defined', () => {
    expect(JwtRefreshGuard).toBeDefined();
  });

  it('extends AuthGuard("jwt-refresh")', () => {
    const Base = AuthGuard('jwt-refresh');

    expect(Object.getPrototypeOf(JwtRefreshGuard)).toBe(Base);
  });
});
