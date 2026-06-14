import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { Plus, Trash2, ChevronDown, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  useOrders,
  useCreateOrder,
  useUpdateOrderStatus,
  useUpdateItemStatus,
  useDeleteOrder,
} from '@/lib/order-api';
import { useTables } from '@/lib/table-api';
import { useItems } from '@/lib/menu-api';
import type { Order, OrderStatus, OrderItemStatus } from '@restaurant/shared';

export const Route = createFileRoute('/_app/orders/')({
  component: OrdersPage,
});

const STATUS_LABELS: Record<OrderStatus, string> = {
  draft: 'Draft',
  sent: 'Sent',
  in_progress: 'In Progress',
  ready: 'Ready',
  served: 'Served',
};
const STATUS_CLASSES: Record<OrderStatus, string> = {
  draft: 'bg-gray-100 text-gray-700',
  sent: 'bg-blue-100 text-blue-700',
  in_progress: 'bg-yellow-100 text-yellow-800',
  ready: 'bg-green-100 text-green-800',
  served: 'bg-purple-100 text-purple-700',
};
const ITEM_STATUS_LABELS: Record<OrderItemStatus, string> = {
  pending: 'Pending',
  in_progress: 'In Progress',
  ready: 'Ready',
};
const ORDER_STATUSES: OrderStatus[] = ['draft', 'sent', 'in_progress', 'ready', 'served'];
const ITEM_STATUSES: OrderItemStatus[] = ['pending', 'in_progress', 'ready'];

// ── Create form ───────────────────────────────────────────────────────

function CreateOrderForm({ onClose }: { onClose: () => void }) {
  const { data: tables = [] } = useTables();
  const { data: menuItems = [] } = useItems();
  const createOrder = useCreateOrder();
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
        createOrder.mutate({ tableId, notes: notes || null, items }, { onSuccess: onClose });
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

function OrderCard({ order }: { order: Order }) {
  const [expanded, setExpanded] = useState(false);
  const updateStatus = useUpdateOrderStatus();
  const updateItemStatus = useUpdateItemStatus();
  const deleteOrder = useDeleteOrder();

  return (
    <div className="space-y-3 rounded-lg border p-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium">
            Order <span className="font-mono">{order.id.slice(0, 8)}</span>
          </p>
          <p className="text-muted-foreground text-xs">
            {order.items.length} item{order.items.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={order.status}
            onChange={(e) =>
              updateStatus.mutate({ id: order.id, dto: { status: e.target.value as OrderStatus } })
            }
            className={cn(
              'cursor-pointer rounded-full border-0 px-2 py-0.5 text-xs font-medium outline-none',
              STATUS_CLASSES[order.status],
            )}
          >
            {ORDER_STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s]}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => window.confirm('Delete order?') && deleteOrder.mutate(order.id)}
            className="text-destructive hover:bg-accent rounded p-1 transition-colors"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
      {order.notes && <p className="text-muted-foreground text-xs">{order.notes}</p>}
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-xs transition-colors"
      >
        {expanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
        {expanded ? 'Hide' : 'Show'} items
      </button>
      {expanded && (
        <ul className="space-y-1.5 border-t pt-2">
          {order.items.map((item) => (
            <li key={item.id} className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                ×{item.quantity}{' '}
                <span className="font-mono text-xs">{item.menuItemId.slice(0, 6)}</span>
              </span>
              <select
                value={item.status}
                onChange={(e) =>
                  updateItemStatus.mutate({
                    orderId: order.id,
                    itemId: item.id,
                    dto: { status: e.target.value as OrderItemStatus },
                  })
                }
                className="rounded border px-1.5 py-0.5 text-xs outline-none"
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
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────

function OrdersPage() {
  const [statusFilter, setStatusFilter] = useState<string | undefined>();
  const [showCreate, setShowCreate] = useState(false);
  const { data: orders = [], isLoading } = useOrders(statusFilter);

  if (isLoading) return <div className="text-muted-foreground p-6 text-sm">Loading orders…</div>;

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Orders</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {orders.length} order{orders.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowCreate((s) => !s)}
          className="bg-primary text-primary-foreground hover:bg-primary/90 flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-colors"
        >
          <Plus className="h-4 w-4" /> New order
        </button>
      </div>

      {showCreate && <CreateOrderForm onClose={() => setShowCreate(false)} />}

      <div className="flex flex-wrap gap-2">
        {([undefined, ...ORDER_STATUSES] as const).map((s) => (
          <button
            type="button"
            key={String(s)}
            onClick={() => setStatusFilter(s)}
            className={cn(
              'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
              statusFilter === s
                ? 'bg-primary text-primary-foreground border-primary'
                : 'hover:bg-accent',
            )}
          >
            {s ? STATUS_LABELS[s] : 'All'}
          </button>
        ))}
      </div>

      {orders.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          No orders
          {statusFilter ? ` with status "${STATUS_LABELS[statusFilter as OrderStatus]}"` : ''}.
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {orders.map((order) => (
            <OrderCard key={order.id} order={order} />
          ))}
        </div>
      )}
    </div>
  );
}
