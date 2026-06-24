import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  useOrderControllerGetAll,
  useOrderControllerCreate,
  useOrderControllerUpdateStatus,
  useOrderControllerUpdateItemStatus,
  useOrderControllerRemove,
  invalidateOrderControllerGetAll,
} from '@/api/orders/orders';
import { useTableControllerGetAll } from '@/api/tables/tables';
import { useMenuControllerGetItems } from '@/api/menu/menu';
import type { OrderStatus, OrderItemStatus } from '@restaurant/shared';
import type { OrderDto } from '@/api/restaurantManagerAPI.schemas';
import { PageHeader } from '@/components/ui/page-header';
import { StatusBadge } from '@/components/ui/status';
import type { Tone } from '@/components/ui/status';
import { ListRow } from '@/components/ui/list-row';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

export const Route = createFileRoute('/_app/order/')({
  component: OrdersPage,
});

const ORDER_STATUSES: OrderStatus[] = ['draft', 'sent', 'in_progress', 'ready', 'served'];
const ITEM_STATUSES: OrderItemStatus[] = ['pending', 'in_progress', 'ready'];

const STATUS_LABELS: Record<OrderStatus, string> = {
  draft: 'Draft',
  sent: 'Sent',
  in_progress: 'In Progress',
  ready: 'Ready',
  served: 'Served',
};

const ORDER_STATUS_TONE: Record<OrderStatus, Tone> = {
  draft: 'neutral',
  sent: 'info',
  in_progress: 'warning',
  ready: 'success',
  served: 'neutral',
};

const ITEM_STATUS_LABELS: Record<OrderItemStatus, string> = {
  pending: 'Pending',
  in_progress: 'In Prog',
  ready: 'Ready',
};

const ITEM_STATUS_TONE: Record<OrderItemStatus, Tone> = {
  pending: 'neutral',
  in_progress: 'warning',
  ready: 'success',
};

function timeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);

  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);

  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);

  return `${hours}h ago`;
}

// ── Create form ───────────────────────────────────────────────────────

function CreateOrderForm({ onClose }: { onClose: () => void }) {
  const { data: tables = [] } = useTableControllerGetAll();
  const { data: menuItems = [] } = useMenuControllerGetItems();
  const qc = useQueryClient();
  const createOrder = useOrderControllerCreate();
  const [tableId, setTableId] = useState('');
  const [notes, setNotes] = useState('');
  const [rows, setRows] = useState([{ menuItemId: '', quantity: 1, notes: '' }]);

  const addRow = () => setRows((r) => [...r, { menuItemId: '', quantity: 1, notes: '' }]);
  const removeRow = (i: number) => setRows((r) => r.filter((_, idx) => idx !== i));
  const setRow = (i: number, patch: Partial<(typeof rows)[0]>) =>
    setRows((r) => r.map((row, idx) => (idx === i ? { ...row, ...patch } : row)));

  return (
    <Card size="sm" className="mb-2">
      <CardContent>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const items = rows
              .filter((r) => r.menuItemId)
              .map((r) => ({
                menuItemId: r.menuItemId,
                quantity: r.quantity,
                notes: r.notes || null,
              }));

            if (!items.length) return;
            createOrder.mutate(
              { data: { tableId, notes: notes || null, items } },
              {
                onSuccess: () => {
                  invalidateOrderControllerGetAll(qc);
                  onClose();
                },
              },
            );
          }}
          className="space-y-3"
        >
          <p className="text-sm font-semibold">New Order</p>
          <div className="flex flex-wrap gap-3">
            <label className="flex flex-col gap-1 text-xs">
              Table
              <select
                value={tableId}
                onChange={(e) => setTableId(e.target.value)}
                required
                className="focus-visible:ring-ring rounded-md border border-border bg-background px-2 py-1.5 text-sm outline-none focus-visible:ring-2"
              >
                <option value="">Select table…</option>
                {tables.map((t) => (
                  <option key={t.id} value={t.id}>
                    Table {t.number}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex min-w-40 flex-1 flex-col gap-1 text-xs">
              Notes
              <input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Optional"
                className="focus-visible:ring-ring rounded-md border border-border bg-background px-2 py-1.5 text-sm outline-none focus-visible:ring-2"
              />
            </label>
          </div>
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground">Items</p>
            {rows.map((row, i) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: order row list has no stable id before submission
              <div key={i} className="flex flex-wrap items-end gap-2">
                <select
                  value={row.menuItemId}
                  onChange={(e) => setRow(i, { menuItemId: e.target.value })}
                  required
                  className="focus-visible:ring-ring min-w-36 flex-1 rounded-md border border-border bg-background px-2 py-1.5 text-sm outline-none focus-visible:ring-2"
                >
                  <option value="">Select item…</option>
                  {menuItems.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  min={1}
                  value={row.quantity}
                  onChange={(e) => setRow(i, { quantity: Number(e.target.value) })}
                  className="focus-visible:ring-ring w-14 rounded-md border border-border bg-background px-2 py-1.5 text-sm outline-none focus-visible:ring-2"
                />
                {rows.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeRow(i)}
                    className="text-destructive hover:bg-muted rounded p-1 transition-colors"
                    aria-label="Remove item row"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            ))}
            <button type="button" onClick={addRow} className="text-primary text-xs hover:underline">
              + Add item
            </button>
          </div>
          <div className="flex gap-2">
            <Button type="submit" variant="outline" size="sm" disabled={createOrder.isPending}>
              Create
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={onClose}>
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

// ── Order card ────────────────────────────────────────────────────────

interface OrderCardProps {
  order: OrderDto;
  tableNumber: number | undefined;
  menuNameMap: Map<string, string>;
}

function OrderCard({ order, tableNumber, menuNameMap }: OrderCardProps) {
  const qc = useQueryClient();
  const updateStatus = useOrderControllerUpdateStatus();
  const updateItemStatus = useOrderControllerUpdateItemStatus();
  const deleteOrder = useOrderControllerRemove();

  const currentIndex = ORDER_STATUSES.indexOf(order.status as OrderStatus);
  const nextStatus =
    currentIndex < ORDER_STATUSES.length - 1 ? ORDER_STATUSES[currentIndex + 1] : null;

  const handleAdvance = () => {
    if (!nextStatus) return;
    updateStatus.mutate(
      { id: order.id, data: { status: nextStatus } },
      { onSuccess: () => invalidateOrderControllerGetAll(qc) },
    );
  };

  const handleDelete = () => {
    if (!window.confirm('Delete order?')) return;
    deleteOrder.mutate({ id: order.id }, { onSuccess: () => invalidateOrderControllerGetAll(qc) });
  };

  const tableLabel =
    tableNumber !== undefined ? `Table ${tableNumber}` : `Table ${order.tableId.slice(0, 6)}`;

  return (
    <Card size="sm" className="mb-2">
      {/* Card header row */}
      <CardContent className="pb-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-sm font-semibold leading-tight">{tableLabel}</p>
            <p className="text-muted-foreground text-xs mt-0.5">
              {timeAgo(new Date(order.createdAt))}
              {order.notes && <span className="ml-1.5 italic">{order.notes}</span>}
            </p>
          </div>
          <button
            type="button"
            onClick={handleDelete}
            className="text-muted-foreground hover:text-destructive hover:bg-muted rounded p-1 transition-colors -mt-0.5 shrink-0"
            aria-label="Delete order"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </CardContent>

      {/* Line items via ListRow */}
      {order.items.length > 0 && (
        <div className="border-t border-border mx-0">
          {order.items.map((item) => {
            const itemStatus = item.status as OrderItemStatus;
            const itemIndex = ITEM_STATUSES.indexOf(itemStatus);
            const nextItemStatus =
              itemIndex < ITEM_STATUSES.length - 1 ? ITEM_STATUSES[itemIndex + 1] : null;
            const itemName =
              menuNameMap.get(item.menuItemId) ?? `Item ${item.menuItemId.slice(0, 6)}`;

            return (
              <ListRow
                key={item.id}
                leading={
                  <span className="text-muted-foreground text-xs font-mono w-4 text-center shrink-0">
                    ×{item.quantity}
                  </span>
                }
                title={
                  <span className="block whitespace-normal break-words text-xs leading-snug">
                    {itemName}
                  </span>
                }
                action={
                  nextItemStatus ? (
                    <button
                      type="button"
                      onClick={() =>
                        updateItemStatus.mutate(
                          {
                            id: order.id,
                            itemId: item.id,
                            data: { status: nextItemStatus },
                          },
                          { onSuccess: () => invalidateOrderControllerGetAll(qc) },
                        )
                      }
                      className="flex items-center gap-0.5 text-muted-foreground hover:text-foreground transition-colors"
                      aria-label={`Advance to ${ITEM_STATUS_LABELS[nextItemStatus]}`}
                    >
                      <StatusBadge
                        tone={ITEM_STATUS_TONE[itemStatus]}
                        label={ITEM_STATUS_LABELS[itemStatus]}
                      />
                      <ArrowRight className="h-3 w-3 shrink-0" />
                    </button>
                  ) : (
                    <StatusBadge
                      tone={ITEM_STATUS_TONE[itemStatus]}
                      label={ITEM_STATUS_LABELS[itemStatus]}
                    />
                  )
                }
                className="px-3 py-2"
              />
            );
          })}
        </div>
      )}

      {/* Footer: advance order */}
      <CardFooter className="py-1.5 px-3 justify-between">
        <span className="text-muted-foreground text-xs">
          {order.items.length} item{order.items.length !== 1 ? 's' : ''}
        </span>
        {nextStatus ? (
          <button
            type="button"
            onClick={handleAdvance}
            disabled={updateStatus.isPending}
            className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors disabled:opacity-50"
            aria-label={`Move to ${STATUS_LABELS[nextStatus]}`}
          >
            {STATUS_LABELS[nextStatus]}
            <ArrowRight className="h-3 w-3" />
          </button>
        ) : (
          <StatusBadge tone="neutral" label="Served" />
        )}
      </CardFooter>
    </Card>
  );
}

// ── Kanban column ─────────────────────────────────────────────────────

interface KanbanColumnProps {
  status: OrderStatus;
  orders: OrderDto[];
  tableMap: Map<string, number>;
  menuNameMap: Map<string, string>;
}

function KanbanColumn({ status, orders, tableMap, menuNameMap }: KanbanColumnProps) {
  return (
    <div className="flex flex-col min-w-[280px] w-[280px] flex-shrink-0 snap-start">
      {/* Column header */}
      <div className="bg-muted/60 rounded-t-lg px-3 py-2 flex items-center justify-between border border-border border-b-0">
        <span className="text-sm font-semibold">{STATUS_LABELS[status]}</span>
        <StatusBadge tone={ORDER_STATUS_TONE[status]} label={String(orders.length)} />
      </div>

      {/* Column body */}
      <div
        className={cn(
          'bg-muted/20 rounded-b-lg border border-border border-t-0 p-2 flex-1 min-h-[120px]',
        )}
      >
        {orders.length === 0 ? (
          <p className="text-muted-foreground text-xs text-center py-6">No orders</p>
        ) : (
          orders.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              tableNumber={tableMap.get(order.tableId)}
              menuNameMap={menuNameMap}
            />
          ))
        )}
      </div>
    </div>
  );
}

// ── Loading skeleton ──────────────────────────────────────────────────

function OrdersSkeleton() {
  return (
    <div className="flex gap-4">
      {ORDER_STATUSES.map((s) => (
        <div key={s} className="min-w-[280px] w-[280px] flex-shrink-0 space-y-2">
          <Skeleton className="h-9 w-full rounded-lg" />
          <Skeleton className="h-24 w-full rounded-lg" />
          <Skeleton className="h-16 w-full rounded-lg" />
        </div>
      ))}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────

function OrdersPage() {
  const [showCreate, setShowCreate] = useState(false);
  const { data: orders = [], isLoading } = useOrderControllerGetAll();
  const { data: tables = [] } = useTableControllerGetAll();
  const { data: menuItems = [] } = useMenuControllerGetItems();

  const tableMap = new Map<string, number>(tables.map((t) => [t.id, t.number]));
  const menuNameMap = new Map<string, string>(menuItems.map((m) => [m.id, m.name]));

  const columnOrders = Object.fromEntries(
    ORDER_STATUSES.map((status) => [status, orders.filter((o) => o.status === status)]),
  ) as unknown as Record<OrderStatus, OrderDto[]>;

  const totalOrders = orders.length;

  return (
    <div className="flex flex-col h-full p-6 gap-4">
      <PageHeader
        title="Orders"
        subtitle={`${totalOrders} order${totalOrders !== 1 ? 's' : ''} across ${ORDER_STATUSES.length} stages`}
        action={
          <Button onClick={() => setShowCreate((s) => !s)}>
            <Plus className="h-4 w-4" />
            New order
          </Button>
        }
      />

      {/* Create form */}
      {showCreate && <CreateOrderForm onClose={() => setShowCreate(false)} />}

      {/* Kanban board — scroll-snap rail */}
      <div className="overflow-x-auto flex-1 -mx-1 px-1">
        {isLoading ? (
          <OrdersSkeleton />
        ) : (
          <div className="flex gap-3 h-full snap-x snap-mandatory">
            {ORDER_STATUSES.map((status) => (
              <KanbanColumn
                key={status}
                status={status}
                orders={columnOrders[status]}
                tableMap={tableMap}
                menuNameMap={menuNameMap}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
