import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Receipt, Search, CreditCard, CheckCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  useBillingControllerFindOne,
  useBillingControllerCreate,
  useBillingControllerPay,
  invalidateBillingControllerFindOne,
} from '@/api/billing/billing';
import { invalidateOrderControllerGetAll } from '@/api/orders/orders';

export const Route = createFileRoute('/_app/billing/')({
  component: BillingPage,
});

function BillingPage() {
  const [orderId, setOrderId] = useState('');
  const [discountPct, setDiscountPct] = useState('');
  const [billId, setBillId] = useState('');
  const [lookupId, setLookupId] = useState('');
  const [createMsg, setCreateMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null,
  );

  const qc = useQueryClient();

  const createBill = useBillingControllerCreate({
    mutation: {
      onSuccess: (newBill) => {
        if (newBill?.id) invalidateBillingControllerFindOne(qc, newBill.id);
        invalidateOrderControllerGetAll(qc);
      },
    },
  });

  const payBill = useBillingControllerPay({
    mutation: {
      onSuccess: () => {
        if (bill?.id) invalidateBillingControllerFindOne(qc, bill.id);
      },
    },
  });

  const {
    data: bill,
    isLoading: billLoading,
    isError: billError,
  } = useBillingControllerFindOne(lookupId ?? '', { query: { enabled: !!lookupId } });

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreateMsg(null);
    createBill.mutate(
      { data: { orderId, discountPct: discountPct !== '' ? Number(discountPct) : 0 } },
      {
        onSuccess: (created) => {
          setCreateMsg({ type: 'success', text: `Bill created: ${created.id}` });
          setOrderId('');
          setDiscountPct('');
        },
        onError: () => setCreateMsg({ type: 'error', text: 'Failed to create bill' }),
      },
    );
  }

  function handleLookup(e: React.FormEvent) {
    e.preventDefault();
    setLookupId(billId.trim());
  }

  function handlePay() {
    if (bill) payBill.mutate({ id: bill.id });
  }

  return (
    <div className="max-w-2xl space-y-6">
      {/* Create Bill */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-accent/10">
              <Receipt className="h-4 w-4 text-accent" />
            </div>
            <div>
              <CardTitle className="text-base">Create Bill</CardTitle>
              <CardDescription>Generate a bill from an order</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="order-id">Order ID *</Label>
              <Input
                id="order-id"
                type="text"
                value={orderId}
                onChange={(e) => setOrderId(e.target.value)}
                placeholder="Enter order ID"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="discount">Discount % (0–100)</Label>
              <Input
                id="discount"
                type="number"
                value={discountPct}
                onChange={(e) => setDiscountPct(e.target.value)}
                placeholder="0"
                min={0}
                max={100}
              />
            </div>
            <div className="flex items-center gap-3 pt-2">
              <Button
                type="submit"
                disabled={createBill.isPending || !orderId.trim()}
                className="bg-accent text-accent-foreground hover:bg-accent/90"
              >
                {createBill.isPending ? 'Creating…' : 'Create Bill'}
              </Button>
              {createMsg && (
                <span
                  className={`text-sm font-medium ${createMsg.type === 'error' ? 'text-destructive' : 'text-success'}`}
                >
                  {createMsg.text}
                </span>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Find Bill */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-accent/10">
              <Search className="h-4 w-4 text-accent" />
            </div>
            <div>
              <CardTitle className="text-base">Find Bill</CardTitle>
              <CardDescription>Look up a bill by its ID</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLookup} className="flex gap-3">
            <Input
              type="text"
              value={billId}
              onChange={(e) => setBillId(e.target.value)}
              placeholder="Enter bill ID"
              className="flex-1"
            />
            <Button type="submit" disabled={!billId.trim()} variant="outline">
              Find
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Bill Details */}
      {lookupId && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-accent/10">
                <CreditCard className="h-4 w-4 text-accent" />
              </div>
              <div>
                <CardTitle className="text-base">Bill Details</CardTitle>
                <CardDescription>ID: {lookupId}</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {billLoading && <p className="text-muted-foreground text-sm">Loading…</p>}
            {billError && <p className="text-destructive text-sm">Bill not found</p>}

            {bill && (
              <div className="space-y-4">
                <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                  <dt className="text-muted-foreground">Bill ID</dt>
                  <dd className="font-mono truncate">{bill.id}</dd>

                  <dt className="text-muted-foreground">Order ID</dt>
                  <dd className="font-mono truncate">{bill.orderId}</dd>

                  <dt className="text-muted-foreground">Subtotal</dt>
                  <dd>${Number(bill.subtotal).toFixed(2)}</dd>

                  <dt className="text-muted-foreground">Discount</dt>
                  <dd>{bill.discountPct}%</dd>

                  <dt className="text-muted-foreground">Tax</dt>
                  <dd>${Number(bill.tax).toFixed(2)}</dd>

                  <dt className="text-muted-foreground">Total</dt>
                  <dd className="text-lg font-bold text-foreground">
                    ${Number(bill.total).toFixed(2)}
                  </dd>

                  <dt className="text-muted-foreground">Status</dt>
                  <dd>
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${bill.paid ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning-foreground'}`}
                    >
                      {bill.paid ? <CheckCircle className="h-3 w-3" /> : null}
                      {bill.paid ? 'Paid' : 'Unpaid'}
                    </span>
                  </dd>

                  {bill.paidAt && (
                    <>
                      <dt className="text-muted-foreground">Paid at</dt>
                      <dd>{new Date(bill.paidAt).toLocaleString()}</dd>
                    </>
                  )}
                </dl>

                {!bill.paid && (
                  <div className="flex items-center gap-3 border-t border-border pt-4">
                    <Button
                      type="button"
                      onClick={handlePay}
                      disabled={payBill.isPending}
                      className="bg-accent text-accent-foreground hover:bg-accent/90"
                    >
                      {payBill.isPending ? 'Processing…' : 'Mark as Paid'}
                    </Button>
                    {payBill.isError && (
                      <span className="text-destructive text-sm">Failed to mark as paid</span>
                    )}
                  </div>
                )}
                {payBill.isSuccess && bill.paid && (
                  <p className="flex items-center gap-1.5 text-sm font-medium text-success">
                    <CheckCircle className="h-4 w-4" />
                    Payment recorded
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
