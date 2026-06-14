import type { ConfigService } from '@nestjs/config';
import { JwtStrategy } from './jwt.strategy';

const mockConfig = { get: jest.fn().mockReturnValue('test-secret') };

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;

  beforeEach(() => {
    strategy = new JwtStrategy(mockConfig as unknown as ConfigService);
  });

  it('validate maps sub to id', () => {
    const result = strategy.validate({ sub: 'uuid-1', email: 'a@b.com', role: 'manager' });

    expect(result).toEqual({ id: 'uuid-1', email: 'a@b.com', role: 'manager' });
  });

  it('validate exposes all three fields', () => {
    const result = strategy.validate({ sub: 'uuid-2', email: 'x@y.com', role: 'waiter' });

    expect(result).toHaveProperty('id', 'uuid-2');
    expect(result).toHaveProperty('email', 'x@y.com');
    expect(result).toHaveProperty('role', 'waiter');
  });
});
