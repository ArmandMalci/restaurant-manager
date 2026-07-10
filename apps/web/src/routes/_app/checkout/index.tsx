import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Receipt, CreditCard, CheckCircle, ShoppingBag } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { PageHeader } from '@/components/ui/page-header';
import { StatusBadge } from '@/components/ui/status';
import { MetricCell } from '@/components/ui/metric-cell';
import { ListRow } from '@/components/ui/list-row';
import { cn } from '@/lib/utils';
import { useOrderControllerGetAll, invalidateOrderControllerGetAll } from '@/api/orders/orders';
import { useTableControllerGetAll } from '@/api/tables/tables';
import {
  useBillingControllerCreate,
  useBillingControllerFindOne,
  invalidateBillingControllerFindOne,
} from '@/api/billing/billing';
import type { OrderDto, BillDto } from '@/api/restaurantManagerAPI.schemas';
import { SplitPanel } from './-split-panel';

export const Route = createFileRoute('/_app/checkout/')({
  component: BillingPage,
});

const BILLABLE_STATUSES = new Set(['served', 'ready', 'in_progress']);

type OrderStatus = 'served' | 'ready' | 'in_progress';

const ORDER_STATUS_TONE: Record<OrderStatus, 'neutral' | 'success' | 'warning'> = {
  served: 'neutral',
  ready: 'success',
  in_progress: 'warning',
};

const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  served: 'Served',
  ready: 'Ready',
  in_progress: 'In progress',
};

function tableLabel(num: number | string | undefined): string {
  return num !== undefined ? `T${num}` : '?';
}

// ── Sub-components ──────────────────────────────────────────────────────────

interface CheckoutRowProps {
  order: OrderDto;
  tableNumber: number | string | undefined;
  isSelected: boolean;
  onSelect: (id: string) => void;
}

function CheckoutRow({ order, tableNumber, isSelected, onSelect }: CheckoutRowProps) {
  const status = order.status as OrderStatus;
  const tone = ORDER_STATUS_TONE[status] ?? 'neutral';
  const label = ORDER_STATUS_LABEL[status] ?? order.status.replace('_', ' ');
  const itemCount = order.items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <ListRow
      className={cn(
        'cursor-pointer rounded-lg border transition-colors',
        isSelected ? 'border-accent/40 bg-accent/5' : 'border-border bg-card',
      )}
      leading={
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-semibold text-muted-foreground">
          {tableLabel(tableNumber)}
        </div>
      }
      title={tableNumber !== undefined ? `Table ${tableNumber}` : 'Unknown table'}
      subtitle={`${itemCount} item${itemCount !== 1 ? 's' : ''}`}
      meta={<StatusBadge tone={tone} label={label} />}
      action={
        <Button size="sm" variant="outline" onClick={() => onSelect(order.id)}>
          {isSelected ? 'Cancel' : 'Settle'}
        </Button>
      }
    />
  );
}

interface BillDetailProps {
  order: OrderDto;
  tableNumber: number | string | undefined;
  discountPct: string;
  onDiscountChange: (val: string) => void;
  onCreateBill: () => void;
  isCreating: boolean;
  createError: boolean;
}

function BillDetail({
  order,
  tableNumber,
  discountPct,
  onDiscountChange,
  onCreateBill,
  isCreating,
  createError,
}: BillDetailProps) {
  const status = order.status as OrderStatus;
  const tone = ORDER_STATUS_TONE[status] ?? 'neutral';
  const label = ORDER_STATUS_LABEL[status] ?? order.status.replace('_', ' ');

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-muted">
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </div>
          <div>
            <CardTitle className="text-base">
              {tableNumber !== undefined ? `Table ${tableNumber}` : 'Checkout'}
            </CardTitle>
            <StatusBadge tone={tone} label={label} className="mt-0.5" />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1.5">
          <label htmlFor="discount-pct" className="text-sm font-medium text-foreground">
            Discount %
          </label>
          <input
            id="discount-pct"
            type="number"
            min={0}
            max={100}
            value={discountPct}
            onChange={(e) => onDiscountChange(e.target.value)}
            className="w-24 rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
        <Button onClick={onCreateBill} disabled={isCreating} className="w-full">
          {isCreating ? 'Creating…' : 'Create Bill'}
        </Button>
        {createError && (
          <p className="text-sm text-destructive">Failed to create bill. Try again.</p>
        )}
      </CardContent>
    </Card>
  );
}

interface BillResultProps {
  bill: BillDto;
  onDone: () => void;
}

/** Read-only bill summary. Settlement happens in SplitPanel below. */
function BillResult({ bill, onDone }: BillResultProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-success/10">
            <Receipt className="h-4 w-4 text-success" />
          </div>
          <CardTitle className="text-base">Bill Created</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-2">
          <MetricCell label="Subtotal" value={`$${Number(bill.subtotal).toFixed(2)}`} />
          <MetricCell
            label="Tax"
            value={`$${Number(bill.tax).toFixed(2)}`}
            sub={bill.discountPct > 0 ? `−${bill.discountPct}% disc.` : undefined}
          />
          <MetricCell label="Total" value={`$${Number(bill.total).toFixed(2)}`} />
        </div>

        {bill.paid ? (
          <div className="flex items-center gap-2 rounded-lg bg-success/10 px-3 py-2 text-sm font-medium text-success">
            <CheckCircle className="h-4 w-4" />
            Paid
            {bill.paidAt
              ? ` · ${new Date(bill.paidAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
              : ''}
          </div>
        ) : (
          <div className="rounded-lg bg-muted px-3 py-2 text-sm font-medium text-muted-foreground">
            Awaiting payment
          </div>
        )}

        <Button variant="outline" size="sm" className="w-full" onClick={onDone}>
          Done
        </Button>
      </CardContent>
    </Card>
  );
}

// ── Page ────────────────────────────────────────────────────────────────────

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

  const tableById = new Map(tables.map((t) => [t.id, t]));
  const billableOrders = rawOrders.filter((o) => BILLABLE_STATUSES.has(o.status) && !o.bill?.paid);
  const selectedOrder = billableOrders.find((o) => o.id === selectedOrderId);

  function selectOrder(orderId: string) {
    if (selectedOrderId === orderId) {
      setSelectedOrderId(null);
      setActiveBillId(null);
    } else {
      setSelectedOrderId(orderId);
      // If the order already has a bill, resume it — skip the Create Bill form
      const order = billableOrders.find((o) => o.id === orderId);
      setActiveBillId(order?.bill?.id ?? null);
      setDiscountPct('0');
    }
  }

  function handleCreateBill() {
    if (!selectedOrderId) return;
    createBill.mutate({
      data: { orderId: selectedOrderId, discountPct: Number(discountPct) || 0 },
    });
  }

  const subtitle =
    billableOrders.length > 0
      ? `${billableOrders.length} order${billableOrders.length !== 1 ? 's' : ''} ready for checkout`
      : 'No open orders';

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="mb-6 space-y-1">
          <Skeleton className="h-8 w-28" />
          <Skeleton className="h-4 w-52" />
        </div>
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-14 w-full rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <PageHeader title="Checkout" subtitle={subtitle} />

      {billableOrders.length === 0 && !activeBillId ? (
        <EmptyState
          icon={Receipt}
          title="No orders ready for checkout"
          description="Orders appear here when they're marked ready or served."
        />
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
          {/* Queue */}
          <Card className="overflow-hidden py-0">
            <div className="flex items-center gap-2 border-b border-border px-4 py-2.5">
              <ShoppingBag className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Ready for checkout
              </span>
            </div>
            {billableOrders.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-muted-foreground">
                No orders ready for checkout
              </p>
            ) : (
              billableOrders.map((order) => {
                const table = tableById.get(order.tableId);

                return (
                  <CheckoutRow
                    key={order.id}
                    order={order}
                    tableNumber={table?.number}
                    isSelected={order.id === selectedOrderId}
                    onSelect={selectOrder}
                  />
                );
              })
            )}
          </Card>

          {/* Detail panel */}
          <div>
            {!selectedOrder && !activeBillId && (
              <EmptyState
                icon={CreditCard}
                title="Select a check to settle"
                description="Choose an order from the queue to create a bill."
              />
            )}

            {selectedOrder && !activeBillId && (
              <BillDetail
                order={selectedOrder}
                tableNumber={tableById.get(selectedOrder.tableId)?.number}
                discountPct={discountPct}
                onDiscountChange={setDiscountPct}
                onCreateBill={handleCreateBill}
                isCreating={createBill.isPending}
                createError={createBill.isError}
              />
            )}

            {activeBillId && bill && (
              <div className="space-y-4">
                <BillResult
                  bill={bill}
                  onDone={() => {
                    setSelectedOrderId(null);
                    setActiveBillId(null);
                  }}
                />
                {(() => {
                  const billOrder = rawOrders.find((o) => o.id === bill.orderId);
                  if (!billOrder) return null;
                  return (
                    <SplitPanel
                      bill={bill}
                      order={billOrder}
                      tableNumber={tableById.get(billOrder.tableId)?.number}
                    />
                  );
                })()}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
