import { describe, expect, it } from 'vitest';
import { STATUS_BG } from './-floor-map';

describe('floor tile status colors', () => {
  it('uses semantic tokens, never literal palette or .dark', () => {
    for (const cls of Object.values(STATUS_BG)) {
      expect(cls).not.toMatch(/emerald|sky|amber|slate|zinc|gray/);
      expect(cls).not.toMatch(/\bdark:/);
      expect(cls).toMatch(/success|info|warning/);
    }
  });
});
