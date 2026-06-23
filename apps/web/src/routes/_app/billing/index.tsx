import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Receipt, CreditCard, CheckCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { cn } from '@/lib/utils';
import { useOrderControllerGetAll, invalidateOrderControllerGetAll } from '@/api/orders/orders';
import { useTableControllerGetAll } from '@/api/tables/tables';
import {
  useBillingControllerCreate,
  useBillingControllerPay,
  useBillingControllerFindOne,
  invalidateBillingControllerFindOne,
} from '@/api/billing/billing';
import type { OrderDto } from '@/api/restaurantManagerAPI.schemas';

export const Route = createFileRoute('/_app/billing/')({
  component: BillingPage,
});

const BILLABLE_STATUSES = new Set(['served', 'ready', 'in_progress']);

const STATUS_STYLE: Record<string, string> = {
  served: 'bg-success/10 text-success',
  ready: 'bg-warning/10 text-warning-foreground',
  in_progress: 'bg-accent/10 text-accent',
};

function BillingPage() {
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [discountPct, setDiscountPct] = useState('0');
  const [activeBillId, setActiveBillId] = useState<string | null>(null);

  const qc = useQueryClient();

  const { data: rawOrders = [], isLoading } = useOrderControllerGetAll<OrderDto[]>();
  const { data: tables = [] } = useTableControllerGetAll();

  const createBill = useBillingControllerCreate({
    mutation: {
      onSuccess: (bill) => {
        setActiveBillId(bill.id);
        invalidateOrderControllerGetAll(qc);
        invalidateBillingControllerFindOne(qc, bill.id);
      },
    },
  });

  const { data: bill } = useBillingControllerFindOne(activeBillId ?? '', {
    query: { enabled: !!activeBillId },
  });

  const payBill = useBillingControllerPay({
    mutation: {
      onSuccess: () => {
        if (activeBillId) invalidateBillingControllerFindOne(qc, activeBillId);
      },
    },
  });

  const tableById = new Map(tables.map((t) => [t.id, t]));
  const billableOrders = rawOrders.filter((o) => BILLABLE_STATUSES.has(o.status));
  const selectedOrder = billableOrders.find((o) => o.id === selectedOrderId);

  function selectOrder(orderId: string) {
    if (selectedOrderId === orderId) {
      setSelectedOrderId(null);
      setActiveBillId(null);
    } else {
      setSelectedOrderId(orderId);
      setActiveBillId(null);
      setDiscountPct('0');
    }
  }

  function handleCreateBill() {
    if (!selectedOrderId) return;
    createBill.mutate({
      data: { orderId: selectedOrderId, discountPct: Number(discountPct) || 0 },
    });
  }

  if (isLoading) {
    return <div className="p-6 text-sm text-muted-foreground">Loading…</div>;
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Billing</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {billableOrders.length > 0
            ? `${billableOrders.length} order${billableOrders.length !== 1 ? 's' : ''} ready for checkout`
            : 'No open orders'}
        </p>
      </div>

      {billableOrders.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title="No orders ready for checkout"
          description="Orders appear here when they're marked ready or served."
        />
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
          {/* Order queue */}
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Ready for checkout
            </p>
            {billableOrders.map((order) => {
              const table = tableById.get(order.tableId);
              const isSelected = order.id === selectedOrderId;

              return (
                <div
                  key={order.id}
                  className={cn(
                    'flex items-center justify-between rounded-lg border p-4 transition-colors',
                    isSelected ? 'border-accent/40 bg-accent/5' : 'border-border bg-card',
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        'flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold',
                        STATUS_STYLE[order.status] ?? 'bg-muted text-muted-foreground',
                      )}
                    >
                      {table?.number ?? '?'}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">
                        {table ? `Table ${table.number}` : 'Unknown table'}
                      </p>
                      <p className="text-xs capitalize text-muted-foreground">
                        {order.status.replace('_', ' ')}
                      </p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant={isSelected ? 'outline' : 'default'}
                    onClick={() => selectOrder(order.id)}
                    className={
                      isSelected ? '' : 'bg-accent text-accent-foreground hover:bg-accent/90'
                    }
                  >
                    {isSelected ? 'Cancel' : 'Checkout'}
                  </Button>
                </div>
              );
            })}
          </div>

          {/* Right panel: checkout form or bill result */}
          <div>
            {selectedOrder && !activeBillId && (
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-md bg-accent/10">
                      <CreditCard className="h-4 w-4 text-accent" />
                    </div>
                    <div>
                      <CardTitle className="text-base">
                        {tableById.get(selectedOrder.tableId)
                          ? `Table ${tableById.get(selectedOrder.tableId)?.number}`
                          : 'Checkout'}
                      </CardTitle>
                      <p className="text-xs capitalize text-muted-foreground">
                        {selectedOrder.status.replace('_', ' ')}
                      </p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-1.5">
                    <label htmlFor="discount-pct" className="text-sm font-medium">
                      Discount %
                    </label>
                    <input
                      id="discount-pct"
                      type="number"
                      min={0}
                      max={100}
                      value={discountPct}
                      onChange={(e) => setDiscountPct(e.target.value)}
                      className="w-24 rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    />
                  </div>
                  <Button
                    onClick={handleCreateBill}
                    disabled={createBill.isPending}
                    className="w-full bg-accent text-accent-foreground hover:bg-accent/90"
                  >
                    {createBill.isPending ? 'Creating…' : 'Create Bill'}
                  </Button>
                  {createBill.isError && (
                    <p className="text-sm text-destructive">Failed to create bill. Try again.</p>
                  )}
                </CardContent>
              </Card>
            )}

            {activeBillId && bill && (
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-md bg-success/10">
                      <Receipt className="h-4 w-4 text-success" />
                    </div>
                    <CardTitle className="text-base">Bill Created</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                    <dt className="text-muted-foreground">Subtotal</dt>
                    <dd>${Number(bill.subtotal).toFixed(2)}</dd>
                    {bill.discountPct > 0 && (
                      <>
                        <dt className="text-muted-foreground">Discount</dt>
                        <dd className="text-success">−{bill.discountPct}%</dd>
                      </>
                    )}
                    <dt className="text-muted-foreground">Tax</dt>
                    <dd>${Number(bill.tax).toFixed(2)}</dd>
                    <dt className="font-semibold text-foreground">Total</dt>
                    <dd className="text-xl font-bold">${Number(bill.total).toFixed(2)}</dd>
                  </dl>

                  {!bill.paid ? (
                    <div className="space-y-2 border-t border-border pt-4">
                      <Button
                        onClick={() => payBill.mutate({ id: bill.id })}
                        disabled={payBill.isPending}
                        className="w-full bg-accent text-accent-foreground hover:bg-accent/90"
                      >
                        {payBill.isPending ? 'Processing…' : 'Mark as Paid'}
                      </Button>
                      {payBill.isError && (
                        <p className="text-sm text-destructive">Payment failed. Try again.</p>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 rounded-lg bg-success/10 px-3 py-2 text-sm font-medium text-success">
                      <CheckCircle className="h-4 w-4" />
                      Paid
                      {bill.paidAt
                        ? ` · ${new Date(bill.paidAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                        : ''}
                    </div>
                  )}

                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => {
                      setSelectedOrderId(null);
                      setActiveBillId(null);
                    }}
                  >
                    Done
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
