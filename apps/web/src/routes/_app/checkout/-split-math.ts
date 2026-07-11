/**
 * Pure split-bill math: even shares and by-item bucketing.
 * Dash-prefixed: not a route. Kept side-effect free so it's cheap to unit test.
 */
import type { OrderItemDto } from '@/api/restaurantManagerAPI.schemas';

export function lineItemTotal(item: OrderItemDto): number {
  const modifierTotal = item.modifiers.reduce((sum, m) => sum + Number(m.priceDelta), 0);

  return (Number(item.unitPrice) + modifierTotal) * item.quantity;
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

/** One cash tender row: an amount tendered in a given ISO currency code. */
export interface CashTender {
  currencyCode: string;
  amount: number;
}

/**
 * Converts a tendered `amount` in `currencyCode` to the bill's base currency using
 * `rates` (ISO code -> rate-to-base). The base currency's own rate is implicitly 1 and
 * is never stored in `rates` (see RestaurantSettings.exchangeRates), so a missing entry
 * falls back to 1. Not rounded — rounding happens once, in computeChange.
 */
export function convertToBase(
  amount: number,
  currencyCode: string,
  rates: Record<string, number>,
): number {
  return amount * (rates[currencyCode] ?? 1);
}

/**
 * Sums cash `tenders` (each in its own currency) converted to `baseCurrency`, then
 * subtracts `billTotal`. Positive result is change due; negative means still owed.
 * A tender already in `baseCurrency` is never looked up in `rates`, even if the map
 * happens to contain a stray entry for it. Rounded once at the end (cents).
 */
export function computeChange(
  billTotal: number,
  tenders: CashTender[],
  baseCurrency: string,
  rates: Record<string, number>,
): number {
  const totalInBase = tenders.reduce((sum, t) => {
    const converted =
      t.currencyCode === baseCurrency ? t.amount : convertToBase(t.amount, t.currencyCode, rates);

    return sum + converted;
  }, 0);

  return Math.round((totalInBase - billTotal) * 100) / 100;
}
