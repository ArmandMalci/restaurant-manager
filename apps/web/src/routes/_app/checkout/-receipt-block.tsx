/**
 * ReceiptBlock — printable receipt for a settled bill.
 * Dash-prefixed: not a route.
 */
import { lineItemTotal, type CashTender } from './-split-math';
import { useSettingsControllerGet } from '@/api/settings/settings';
import type { BillDto, OrderDto, CreatePaymentDtoMethod } from '@/api/restaurantManagerAPI.schemas';

// ponytail: fallback only — real name/address/phone come from Settings once loaded.
const DEFAULT_RESTAURANT_NAME = 'RestoManager';

const METHOD_LABEL: Record<string, string> = {
  cash: 'Cash',
  card: 'Card',
  other: 'Other',
};

/** A cash payment's tender breakdown, recorded client-side only (see SplitPanel). */
export interface RecordedCashTender {
  amount: number;
  tenders: CashTender[];
  change: number;
}

export interface ReceiptBlockProps {
  bill: BillDto;
  order: OrderDto;
  tableNumber: number | string | undefined;
  /** Cashier-facing tender breakdowns for cash payments recorded this session — not persisted. */
  cashTenders?: RecordedCashTender[];
}

export function ReceiptBlock({ bill, order, tableNumber, cashTenders = [] }: ReceiptBlockProps) {
  const { data: settings } = useSettingsControllerGet();
  const contactLine = [settings?.address, settings?.phone].filter(Boolean).join(' · ');
  // Best-effort match of persisted Payment rows back to this session's client-only tender
  // log, by amount — consumed in order so identical amounts don't double-match.
  const unmatchedTenders = [...cashTenders];

  function matchTender(paymentAmount: number): RecordedCashTender | undefined {
    const idx = unmatchedTenders.findIndex((t) => Math.abs(t.amount - paymentAmount) < 0.005);

    if (idx === -1) return undefined;

    return unmatchedTenders.splice(idx, 1)[0];
  }

  return (
    <div
      id="receipt"
      className="space-y-3 rounded-lg border border-border bg-background p-4 text-sm"
    >
      <div className="text-center">
        <p className="font-semibold">{settings?.name || DEFAULT_RESTAURANT_NAME}</p>
        {contactLine && <p className="text-xs text-muted-foreground">{contactLine}</p>}
        <p className="text-xs text-muted-foreground">
          {tableNumber !== undefined ? `Table ${tableNumber}` : 'Checkout'}
        </p>
      </div>
      <div className="space-y-1 border-t border-border pt-2">
        {order.items.map((item) => (
          <div key={item.id} className="flex justify-between gap-2">
            <span>
              {item.quantity}× item
              {item.modifiers.map((m) => (
                <span key={m.id} className="block pl-3 text-xs text-muted-foreground">
                  + {m.name} (${Number(m.priceDelta).toFixed(2)})
                </span>
              ))}
            </span>
            <span className="font-mono">${lineItemTotal(item).toFixed(2)}</span>
          </div>
        ))}
      </div>
      <div className="space-y-1 border-t border-border pt-2 font-mono">
        <div className="flex justify-between">
          <span>Subtotal</span>
          <span>${Number(bill.subtotal).toFixed(2)}</span>
        </div>
        {Number(bill.discountPct) > 0 && (
          <div className="flex justify-between">
            <span>Discount</span>
            <span>−{Number(bill.discountPct)}%</span>
          </div>
        )}
        <div className="flex justify-between">
          <span>Tax</span>
          <span>${Number(bill.tax).toFixed(2)}</span>
        </div>
        <div className="flex justify-between font-semibold">
          <span>Total</span>
          <span>${Number(bill.total).toFixed(2)}</span>
        </div>
      </div>
      <div className="space-y-1 border-t border-border pt-2">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Payments
        </p>
        {bill.payments.map((p) => {
          const tender = p.method === 'cash' ? matchTender(Number(p.amount)) : undefined;

          return (
            <div key={p.id} className="space-y-0.5">
              <div className="flex justify-between font-mono text-xs">
                <span>{METHOD_LABEL[p.method as CreatePaymentDtoMethod] ?? p.method}</span>
                <span>${Number(p.amount).toFixed(2)}</span>
              </div>
              {tender && (
                <div className="space-y-0.5 pl-3 font-mono text-[0.7rem] text-muted-foreground">
                  {tender.tenders.map((t, i) => (
                    // biome-ignore lint/suspicious/noArrayIndexKey: tender rows have no stable identity
                    <div key={i} className="flex justify-between">
                      <span>Tendered {t.currencyCode}</span>
                      <span>{t.amount.toFixed(2)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between">
                    <span>{tender.change < 0 ? 'Still owed' : 'Change'}</span>
                    <span>${Math.abs(tender.change).toFixed(2)}</span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
      {bill.paidAt && (
        <p className="border-t border-border pt-2 text-center text-xs text-muted-foreground">
          Paid {new Date(bill.paidAt).toLocaleString()}
        </p>
      )}
    </div>
  );
}
