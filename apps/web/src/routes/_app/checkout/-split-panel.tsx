/**
 * SplitPanel — even/by-item split payments + settled receipt for a bill.
 * Dash-prefixed: not a route.
 */
import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Printer, CheckCircle2, Split } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  useBillingControllerRecordPayment,
  invalidateBillingControllerFindOne,
} from '@/api/billing/billing';
import type { BillDto, OrderDto, CreatePaymentDtoMethod } from '@/api/restaurantManagerAPI.schemas';
import { CreatePaymentDtoMethod as Method } from '@/api/restaurantManagerAPI.schemas';
import { evenShares, byItemShares } from './-split-math';
import { SplitRow } from './-split-row';
import { SplitControls, type SplitMode } from './-split-controls';
import { ReceiptBlock } from './-receipt-block';

export interface SplitPanelProps {
  bill: BillDto;
  order: OrderDto;
  tableNumber?: number | string;
}

export function SplitPanel({ bill, order, tableNumber }: SplitPanelProps) {
  const qc = useQueryClient();
  const [mode, setMode] = useState<SplitMode>('even');
  const [shareCount, setShareCount] = useState(2);
  const [assignments, setAssignments] = useState<Record<string, number>>({});
  const [methods, setMethods] = useState<Record<number, CreatePaymentDtoMethod>>({});

  const recordPayment = useBillingControllerRecordPayment({
    mutation: {
      onSuccess: () => invalidateBillingControllerFindOne(qc, bill.id),
    },
  });

  const shares =
    mode === 'even'
      ? evenShares(bill.total, shareCount)
      : byItemShares(order.items, assignments, shareCount);

  function changeShareCount(next: number) {
    const clamped = Math.max(1, Math.min(next, 20));
    setShareCount(clamped);
    setAssignments((prev) => {
      const fixed: Record<string, number> = {};
      for (const [itemId, idx] of Object.entries(prev)) {
        fixed[itemId] = idx >= clamped ? clamped - 1 : idx;
      }
      return fixed;
    });
  }

  function methodFor(index: number): CreatePaymentDtoMethod {
    return methods[index] ?? Method.cash;
  }

  const isSettled = bill.remaining === 0;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-muted">
            <Split className="h-4 w-4 text-muted-foreground" />
          </div>
          <CardTitle className="text-base">Split payment</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Paid ${bill.amountPaid.toFixed(2)} of ${bill.total.toFixed(2)} · $
          {bill.remaining.toFixed(2)} remaining
        </p>

        {!isSettled && (
          <>
            <SplitControls
              mode={mode}
              onModeChange={setMode}
              shareCount={shareCount}
              onShareCountChange={changeShareCount}
              order={order}
              assignments={assignments}
              onAssign={(itemId, idx) => setAssignments((prev) => ({ ...prev, [itemId]: idx }))}
            />

            <div className="space-y-2">
              {shares.map((amount, i) => {
                return (
                  // biome-ignore lint/suspicious/noArrayIndexKey: split index is the bucket's stable identity
                  <SplitRow
                    key={i}
                    index={i}
                    amount={amount}
                    disabled={amount <= 0 || amount > bill.remaining}
                    method={methodFor(i)}
                    onMethodChange={(m) => setMethods((prev) => ({ ...prev, [i]: m }))}
                    isRecording={recordPayment.isPending}
                    onRecord={() =>
                      recordPayment.mutate({
                        id: bill.id,
                        data: { amount, method: methodFor(i) },
                      })
                    }
                  />
                );
              })}
            </div>
            {recordPayment.isError && (
              <p className="text-sm text-destructive">Payment failed. Try again.</p>
            )}
          </>
        )}

        {isSettled && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 rounded-lg bg-success/10 px-3 py-2 text-sm font-medium text-success">
              <CheckCircle2 className="h-4 w-4" />
              Settled
            </div>
            <Button variant="outline" className="no-print w-full" onClick={() => window.print()}>
              <Printer className="h-4 w-4" />
              Print receipt
            </Button>
            <ReceiptBlock bill={bill} order={order} tableNumber={tableNumber} />
          </div>
        )}
      </CardContent>
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #receipt, #receipt * { visibility: visible; }
          #receipt { position: absolute; top: 0; left: 0; width: 100%; }
          .no-print { display: none !important; }
        }
      `}</style>
    </Card>
  );
}
