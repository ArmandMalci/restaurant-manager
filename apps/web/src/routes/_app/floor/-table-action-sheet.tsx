/**
 * TableActionSheet — per-table Sheet opened from map or grid.
 * Shows current order + running bill; status buttons; "Start/continue order" nav.
 *
 * File is dash-prefixed so TanStack Router ignores it as a route.
 */
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { ShoppingBag } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/status';
import type { Tone } from '@/components/ui/status';
import {
  useOrderControllerGetAll,
} from '@/api/orders/orders';
import {
  useTableControllerSetStatus,
  invalidateTableControllerGetAll,
} from '@/api/tables/tables';
import { useMenuControllerGetItems } from '@/api/menu/menu';
import type { TableStatus } from '@restaurant/shared';
import type { TableDto, OrderDto } from '@/api/restaurantManagerAPI.schemas';

// ── Helpers ───────────────────────────────────────────────────────────

const ACTIVE_ORDER_STATUSES: string[] = ['draft', 'sent', 'in_progress', 'ready'];

const STATUS_LABELS: Record<TableStatus, string> = {
  available: 'Available',
  occupied: 'Occupied',
  reserved: 'Reserved',
};

const STATUS_TONE: Record<TableStatus, Tone> = {
  available: 'success',
  occupied: 'info',
  reserved: 'warning',
};

function computeBillTotal(order: OrderDto): number {
  return order.items.reduce((sum, item) => {
    const modTotal = item.modifiers.reduce((ms, mod) => ms + mod.priceDelta, 0);
    return sum + (item.unitPrice + modTotal) * item.quantity;
  }, 0);
}

// ── Bill section ──────────────────────────────────────────────────────

interface BillSectionProps {
  order: OrderDto | undefined;
  menuNameMap: Map<string, string>;
}

function BillSection({ order, menuNameMap }: BillSectionProps) {
  if (!order) {
    return (
      <p className="text-sm text-muted-foreground py-2">No open order.</p>
    );
  }

  const total = computeBillTotal(order);

  return (
    <div className="space-y-2">
      <div className="space-y-1">
        {order.items.map((item) => {
          const itemName = menuNameMap.get(item.menuItemId) ?? `Item ${item.menuItemId.slice(0, 6)}`;
          const linePrice =
            (item.unitPrice + item.modifiers.reduce((s, m) => s + m.priceDelta, 0)) *
            item.quantity;
          return (
            <div key={item.id} className="flex items-start justify-between gap-2">
              <span className="text-sm text-foreground min-w-0">
                {item.quantity}× {itemName}
                {item.modifiers.length > 0 && (
                  <span className="block text-xs text-muted-foreground ml-4">
                    {item.modifiers.map((m) => m.name).join(', ')}
                  </span>
                )}
              </span>
              <span className="text-sm text-foreground shrink-0">{linePrice.toFixed(2)}</span>
            </div>
          );
        })}
      </div>
      <div className="border-t border-border pt-2 flex justify-between">
        <span className="text-sm font-semibold text-foreground">Total</span>
        <span className="text-sm font-semibold text-foreground">{total.toFixed(2)}</span>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────

interface TableActionSheetProps {
  table: TableDto | null;
  onClose: () => void;
}

export function TableActionSheet({ table, onClose }: TableActionSheetProps) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const setStatus = useTableControllerSetStatus();
  const { data: orders = [] } = useOrderControllerGetAll();
  const { data: menuItems = [] } = useMenuControllerGetItems();

  const menuNameMap = new Map<string, string>(menuItems.map((m) => [m.id, m.name]));

  const activeOrder = table
    ? orders.find(
        (o) => o.tableId === table.id && ACTIVE_ORDER_STATUSES.includes(o.status),
      )
    : undefined;

  function handleSetStatus(status: TableStatus) {
    if (!table) return;
    setStatus.mutate(
      { id: table.id, data: { status } },
      { onSuccess: () => invalidateTableControllerGetAll(qc) },
    );
  }

  function handleStartOrder() {
    if (!table) return;
    onClose();
    navigate({ to: '/order', search: { tableId: table.id } });
  }

  const statusKey = table?.status as TableStatus | undefined;

  return (
    <Sheet open={table !== null} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="w-full max-w-sm p-0 flex flex-col">
        <SheetHeader className="px-5 pt-5 pb-3 border-b border-border">
          <SheetTitle>
            {table ? `Table ${table.number}` : 'Table'}
          </SheetTitle>
          {table && statusKey && (
            <div className="flex items-center gap-2 mt-1">
              <StatusBadge tone={STATUS_TONE[statusKey]} label={STATUS_LABELS[statusKey]} />
              <span className="text-xs text-muted-foreground">{table.seats} seats</span>
            </div>
          )}
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          {/* Status controls */}
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
              Status
            </p>
            <div className="flex flex-wrap gap-2">
              {(['available', 'occupied', 'reserved'] as TableStatus[]).map((s) => (
                <button
                  type="button"
                  key={s}
                  disabled={setStatus.isPending || s === statusKey}
                  onClick={() => handleSetStatus(s)}
                  className="rounded-md border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-default"
                >
                  {STATUS_LABELS[s]}
                </button>
              ))}
            </div>
          </div>

          {/* Current order / bill */}
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
              {activeOrder ? 'Running bill' : 'Order'}
            </p>
            <BillSection order={activeOrder} menuNameMap={menuNameMap} />
          </div>
        </div>

        {/* Footer CTA */}
        <div className="px-5 py-4 border-t border-border">
          <Button className="w-full" onClick={handleStartOrder}>
            <ShoppingBag className="h-4 w-4" />
            {activeOrder ? 'Continue order' : 'Start order'}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
