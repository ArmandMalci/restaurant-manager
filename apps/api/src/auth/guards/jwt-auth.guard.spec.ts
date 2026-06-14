import { AuthGuard } from '@nestjs/passport';
import { JwtAuthGuard } from './jwt-auth.guard';

describe('JwtAuthGuard', () => {
  it('is defined', () => {
    expect(JwtAuthGuard).toBeDefined();
  });

  it('extends AuthGuard("jwt")', () => {
    const Base = AuthGuard('jwt');

    expect(Object.getPrototypeOf(JwtAuthGuard)).toBe(Base);
  });
});
