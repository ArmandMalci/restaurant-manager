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

export const Route = createFileRoute('/_app/orders/')({
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

const STATUS_CLASSES: Record<OrderStatus, string> = {
  draft: 'bg-muted text-muted-foreground',
  sent: 'bg-accent/10 text-accent',
  in_progress: 'bg-warning/10 text-warning-foreground',
  ready: 'bg-success/10 text-success',
  served: 'bg-secondary text-secondary-foreground',
};

const ITEM_STATUS_LABELS: Record<OrderItemStatus, string> = {
  pending: 'Pending',
  in_progress: 'In Progress',
  ready: 'Ready',
};

const ITEM_STATUS_CLASSES: Record<OrderItemStatus, string> = {
  pending: 'bg-muted text-muted-foreground',
  in_progress: 'bg-warning/10 text-warning-foreground',
  ready: 'bg-success/10 text-success',
};

function timeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);

  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);

  if (minutes < 60) return `${minutes} min ago`;
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
      className="space-y-4 rounded-lg border p-4"
    >
      <h2 className="font-semibold">New Order</h2>
      <div className="flex flex-wrap gap-4">
        <label className="flex flex-col gap-1 text-sm">
          Table
          <select
            value={tableId}
            onChange={(e) => setTableId(e.target.value)}
            required
            className="focus-visible:ring-ring rounded-md border px-2 py-1.5 text-sm outline-none focus-visible:ring-2"
          >
            <option value="">Select table…</option>
            {tables.map((t) => (
              <option key={t.id} value={t.id}>
                Table {t.number}
              </option>
            ))}
          </select>
        </label>
        <label className="flex min-w-48 flex-1 flex-col gap-1 text-sm">
          Notes
          <input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Optional"
            className="focus-visible:ring-ring rounded-md border px-2 py-1.5 text-sm outline-none focus-visible:ring-2"
          />
        </label>
      </div>
      <div className="space-y-2">
        <p className="text-sm font-medium">Items</p>
        {rows.map((row, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: order row list has no stable id before submission
          <div key={i} className="flex flex-wrap items-end gap-2">
            <select
              value={row.menuItemId}
              onChange={(e) => setRow(i, { menuItemId: e.target.value })}
              required
              className="focus-visible:ring-ring min-w-40 flex-1 rounded-md border px-2 py-1.5 text-sm outline-none focus-visible:ring-2"
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
              className="focus-visible:ring-ring w-16 rounded-md border px-2 py-1.5 text-sm outline-none focus-visible:ring-2"
            />
            {rows.length > 1 && (
              <button
                type="button"
                onClick={() => removeRow(i)}
                className="text-destructive hover:bg-accent rounded p-1 transition-colors"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        ))}
        <button type="button" onClick={addRow} className="text-primary text-sm hover:underline">
          + Add item
        </button>
      </div>
      <div className="flex gap-2">
        <button
          type="submit"
          className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-md px-3 py-1.5 text-sm font-medium transition-colors"
        >
          Create
        </button>
        <button
          type="button"
          onClick={onClose}
          className="hover:bg-accent rounded-md border px-3 py-1.5 text-sm font-medium transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

// ── Order card ────────────────────────────────────────────────────────

interface OrderCardProps {
  order: OrderDto;
  tableNumber: number | undefined;
}

function OrderCard({ order, tableNumber }: OrderCardProps) {
  const [expanded, setExpanded] = useState(false);
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

  return (
    <div className="bg-card border border-border rounded-lg p-3 mb-2">
      {/* Card header */}
      <div className="flex items-start justify-between mb-2">
        <div>
          <p className="text-sm font-semibold">
            {tableNumber !== undefined
              ? `Table ${tableNumber}`
              : `Table ${order.tableId.slice(0, 6)}`}
          </p>
          <p className="text-muted-foreground text-xs mt-0.5">
            {timeAgo(new Date(order.createdAt))}
          </p>
        </div>
        <button
          type="button"
          onClick={handleDelete}
          className="text-destructive hover:bg-accent rounded p-1 transition-colors -mt-0.5"
          aria-label="Delete order"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Item count */}
      <p className="text-muted-foreground text-xs mb-2">
        {order.items.length} item{order.items.length !== 1 ? 's' : ''}
      </p>

      {/* Notes */}
      {order.notes && (
        <p className="text-muted-foreground text-xs italic mb-2 truncate">{order.notes}</p>
      )}

      {/* Expandable items */}
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        className="text-muted-foreground hover:text-foreground text-xs transition-colors mb-2"
      >
        {expanded ? 'Hide items ▲' : 'Show items ▼'}
      </button>

      {expanded && (
        <ul className="space-y-1.5 border-t pt-2 mb-2">
          {order.items.map((item) => (
            <li key={item.id} className="flex items-center justify-between gap-2">
              <span className="text-xs text-muted-foreground truncate flex-1">
                ×{item.quantity} <span className="font-mono">{item.menuItemId.slice(0, 6)}</span>
              </span>
              <select
                value={item.status}
                onChange={(e) =>
                  updateItemStatus.mutate(
                    {
                      id: order.id,
                      itemId: item.id,
                      data: { status: e.target.value as OrderItemStatus },
                    },
                    { onSuccess: () => invalidateOrderControllerGetAll(qc) },
                  )
                }
                className={cn(
                  'rounded border-0 px-1.5 py-0.5 text-xs font-medium outline-none cursor-pointer',
                  ITEM_STATUS_CLASSES[item.status as OrderItemStatus],
                )}
              >
                {ITEM_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {ITEM_STATUS_LABELS[s]}
                  </option>
                ))}
              </select>
            </li>
          ))}
        </ul>
      )}

      {/* Footer: advance button */}
      <div className="flex justify-end">
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
          <span
            className={cn('rounded-full px-2 py-0.5 text-xs font-medium', STATUS_CLASSES.served)}
          >
            Served
          </span>
        )}
      </div>
    </div>
  );
}

// ── Kanban column ─────────────────────────────────────────────────────

interface KanbanColumnProps {
  status: OrderStatus;
  orders: OrderDto[];
  tableMap: Map<string, number>;
}

function KanbanColumn({ status, orders, tableMap }: KanbanColumnProps) {
  return (
    <div className="flex flex-col min-w-56 w-64 flex-shrink-0">
      {/* Column header */}
      <div className="bg-muted rounded-t-lg px-3 py-2 flex items-center justify-between">
        <span className="text-sm font-semibold">{STATUS_LABELS[status]}</span>
        <span
          className={cn('rounded-full px-2 py-0.5 text-xs font-medium', STATUS_CLASSES[status])}
        >
          {orders.length}
        </span>
      </div>

      {/* Column body */}
      <div className="bg-muted/40 rounded-b-lg p-2 flex-1 min-h-24">
        {orders.length === 0 ? (
          <p className="text-muted-foreground text-xs text-center py-4">No orders</p>
        ) : (
          orders.map((order) => (
            <OrderCard key={order.id} order={order} tableNumber={tableMap.get(order.tableId)} />
          ))
        )}
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────

function OrdersPage() {
  const [showCreate, setShowCreate] = useState(false);
  const { data: orders = [], isLoading } = useOrderControllerGetAll();
  const { data: tables = [] } = useTableControllerGetAll();

  const tableMap = new Map<string, number>(tables.map((t) => [t.id, t.number]));

  const columnOrders = Object.fromEntries(
    ORDER_STATUSES.map((status) => [status, orders.filter((o) => o.status === status)]),
  ) as unknown as Record<OrderStatus, OrderDto[]>;

  if (isLoading) return <div className="text-muted-foreground p-6 text-sm">Loading orders…</div>;

  return (
    <div className="flex flex-col h-full p-6 gap-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-shrink-0">
        <h1 className="text-2xl font-bold tracking-tight">Orders</h1>
        <button
          type="button"
          onClick={() => setShowCreate((s) => !s)}
          className="bg-primary text-primary-foreground hover:bg-primary/90 flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-colors"
        >
          <Plus className="h-4 w-4" /> New Order
        </button>
      </div>

      {/* Create form */}
      {showCreate && <CreateOrderForm onClose={() => setShowCreate(false)} />}

      {/* Kanban board */}
      <div className="overflow-x-auto flex-1">
        <div className="flex gap-4 h-full min-w-max">
          {ORDER_STATUSES.map((status) => (
            <KanbanColumn
              key={status}
              status={status}
              orders={columnOrders[status]}
              tableMap={tableMap}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
