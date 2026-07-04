/**
 * Pure split-bill math: even shares and by-item bucketing.
 * Dash-prefixed: not a route. Kept side-effect free so it's cheap to unit test.
 */
import type { OrderItemDto } from '@/api/restaurantManagerAPI.schemas';

export function lineItemTotal(item: OrderItemDto): number {
  const modifierTotal = item.modifiers.reduce((sum, m) => sum + m.priceDelta, 0);
  return (item.unitPrice + modifierTotal) * item.quantity;
}

/** N shares of `total`, cents-rounded, last share absorbs the remainder. Sums exactly to total. */
export function evenShares(total: number, count: number): number[] {
  const totalCents = Math.round(total * 100);
  const shareCents = Math.round(totalCents / count);
  const shares: number[] = [];
  let remaining = totalCents;

  for (let i = 0; i < count; i++) {
    const cents = i === count - 1 ? remaining : shareCents;
    shares.push(cents / 100);
    remaining -= cents;
  }

  return shares;
}

/** Sum of line totals for items assigned to each split index in `assignments`. */
export function byItemShares(
  items: OrderItemDto[],
  assignments: Record<string, number>,
  count: number,
): number[] {
  const shares = new Array(count).fill(0) as number[];

  for (const item of items) {
    const idx = assignments[item.id] ?? 0;
    if (idx >= 0 && idx < count) {
      shares[idx] = Math.round((shares[idx] + lineItemTotal(item)) * 100) / 100;
    }
  }

  return shares;
}
