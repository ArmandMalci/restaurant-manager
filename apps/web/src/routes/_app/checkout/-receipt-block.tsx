/**
 * ReceiptBlock — printable receipt for a settled bill.
 * Dash-prefixed: not a route.
 */
import { lineItemTotal } from './-split-math';
import type { BillDto, OrderDto, CreatePaymentDtoMethod } from '@/api/restaurantManagerAPI.schemas';

const RESTAURANT_NAME = 'RestoManager';

const METHOD_LABEL: Record<string, string> = {
  cash: 'Cash',
  card: 'Card',
  other: 'Other',
};

export interface ReceiptBlockProps {
  bill: BillDto;
  order: OrderDto;
  tableNumber: number | string | undefined;
}

export function ReceiptBlock({ bill, order, tableNumber }: ReceiptBlockProps) {
  return (
    <div
      id="receipt"
      className="space-y-3 rounded-lg border border-border bg-background p-4 text-sm"
    >
      <div className="text-center">
        <p className="font-semibold">{RESTAURANT_NAME}</p>
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
                  + {m.name} (${m.priceDelta.toFixed(2)})
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
          <span>${bill.subtotal.toFixed(2)}</span>
        </div>
        {bill.discountPct > 0 && (
          <div className="flex justify-between">
            <span>Discount</span>
            <span>−{bill.discountPct}%</span>
          </div>
        )}
        <div className="flex justify-between">
          <span>Tax</span>
          <span>${bill.tax.toFixed(2)}</span>
        </div>
        <div className="flex justify-between font-semibold">
          <span>Total</span>
          <span>${bill.total.toFixed(2)}</span>
        </div>
      </div>
      <div className="space-y-1 border-t border-border pt-2">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Payments
        </p>
        {bill.payments.map((p) => (
          <div key={p.id} className="flex justify-between font-mono text-xs">
            <span>{METHOD_LABEL[p.method as CreatePaymentDtoMethod] ?? p.method}</span>
            <span>${p.amount.toFixed(2)}</span>
          </div>
        ))}
      </div>
      {bill.paidAt && (
        <p className="border-t border-border pt-2 text-center text-xs text-muted-foreground">
          Paid {new Date(bill.paidAt).toLocaleString()}
        </p>
      )}
    </div>
  );
}
