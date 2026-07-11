import { describe, expect, it } from 'vitest';
import { computeNextSearch } from './url-modal';

describe('computeNextSearch', () => {
  it('adds the param under the given key when opening', () => {
    expect(computeNextSearch({}, 'tableId', 'table-1', true)).toEqual({ tableId: 'table-1' });
  });

  it('defaults to `true` when no paramValue is given', () => {
    expect(computeNextSearch({}, 'ticket', undefined, true)).toEqual({ ticket: true });
  });

  it('removes the key when closing', () => {
    expect(computeNextSearch({ tableId: 'table-1' }, 'tableId', 'table-1', false)).toEqual({});
  });

  it('preserves sibling search params on open and close', () => {
    expect(computeNextSearch({ tab: 'today' }, 'reservation', 'new', true)).toEqual({
      tab: 'today',
      reservation: 'new',
    });
    expect(
      computeNextSearch({ tab: 'today', reservation: 'new' }, 'reservation', 'new', false),
    ).toEqual({
      tab: 'today',
    });
  });
});
