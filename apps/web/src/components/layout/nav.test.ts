import { describe, it, expect } from 'vitest';
import { NAV_GROUPS } from './nav';

describe('NAV_GROUPS', () => {
  it('exposes Service and Back office groups', () => {
    expect(NAV_GROUPS.map((g) => g.label)).toEqual(['Service', 'Back office']);
  });

  it('routes to the migrated service paths', () => {
    const paths = NAV_GROUPS.flatMap((g) => g.items.map((i) => i.to));

    expect(paths).toContain('/service');
    expect(paths).toContain('/floor');
    expect(paths).toContain('/checkout');
    expect(paths).not.toContain('/dashboard');
    expect(paths).not.toContain('/staff');
  });
});
