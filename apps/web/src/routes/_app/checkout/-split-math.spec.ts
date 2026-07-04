import { describe, it, expect } from 'vitest';
import { evenShares, byItemShares, lineItemTotal } from './-split-math';
import type { OrderItemDto } from '@/api/restaurantManagerAPI.schemas';

function item(overrides: Partial<OrderItemDto> = {}): OrderItemDto {
  return {
    id: 'item-1',
    orderId: 'order-1',
    menuItemId: 'menu-1',
    quantity: 1,
    unitPrice: 10,
    status: 'served',
    modifiers: [],
    ...overrides,
  };
}

describe('evenShares', () => {
  it('splits evenly with no remainder', () => {
    const shares = evenShares(20, 2);
    expect(shares).toEqual([10, 10]);
  });

  it('sums exactly to total when it does not divide evenly (last share absorbs remainder)', () => {
    const shares = evenShares(10, 3);
    expect(shares).toEqual([3.33, 3.33, 3.34]);
    const sum = shares.reduce((a, b) => a + b, 0);
    expect(Math.round(sum * 100) / 100).toBe(10);
  });

  it('handles a single split', () => {
    expect(evenShares(22.5, 1)).toEqual([22.5]);
  });
});

describe('lineItemTotal', () => {
  it('multiplies (unitPrice + modifier deltas) by quantity', () => {
    const line = item({
      unitPrice: 8,
      quantity: 2,
      modifiers: [
        {
          id: 'm1',
          orderItemId: 'item-1',
          modifierOptionId: 'o1',
          name: 'Extra cheese',
          priceDelta: 1.5,
        },
        { id: 'm2', orderItemId: 'item-1', modifierOptionId: 'o2', name: 'Bacon', priceDelta: 2 },
      ],
    });
    // (8 + 1.5 + 2) * 2 = 23
    expect(lineItemTotal(line)).toBe(23);
  });
});

describe('byItemShares', () => {
  it('buckets item totals (incl. modifiers) by assigned split index and sums to the order total', () => {
    const items: OrderItemDto[] = [
      item({ id: 'a', unitPrice: 10, quantity: 1 }),
      item({
        id: 'b',
        unitPrice: 5,
        quantity: 2,
        modifiers: [
          { id: 'm1', orderItemId: 'b', modifierOptionId: 'o1', name: 'Sauce', priceDelta: 1 },
        ],
      }),
      item({ id: 'c', unitPrice: 7, quantity: 1 }),
    ];
    // a -> split 0 (10), b -> split 1 ((5+1)*2=12), c -> split 0 (7)
    const assignments = { a: 0, b: 1, c: 0 };

    const shares = byItemShares(items, assignments, 2);

    expect(shares).toEqual([17, 12]);
  });

  it('defaults unassigned items to split 0', () => {
    const items: OrderItemDto[] = [item({ id: 'a', unitPrice: 4, quantity: 1 })];
    expect(byItemShares(items, {}, 2)).toEqual([4, 0]);
  });
});
