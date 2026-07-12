/**
 * TableActionSheet — per-table modal opened from map or grid via the "⋯" icon / long-press
 * (secondary affordance — the primary tap now opens the order builder directly, see
 * -order-modal.tsx and Plan 17 Task 3). Shows current order + running bill; tap-to-cycle
 * status chip; "Start/continue order" hands off to the same order modal.
 *
 * URL-driven via `tableId` + `panel=actions` on `/floor` (the shared `tableId` key also
 * drives `-order-modal.tsx`'s `panel=order` sibling) — survives refresh, closes on back.
 *
 * File is dash-prefixed so TanStack Router ignores it as a route.
 */
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate, useSearch } from '@tanstack/react-router';
import { ShoppingBag } from 'lucide-react';
import { UrlModal, computeNextSearch } from '@/components/ui/url-modal';
import { DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { StatusDot } from '@/components/ui/status';
import { cn } from '@/lib/utils';
import { useOrderControllerGetAll } from '@/api/orders/orders';
import { useTableControllerSetStatus, invalidateTableControllerGetAll } from '@/api/tables/tables';
import { useMenuControllerGetItems } from '@/api/menu/menu';
import { useReservationControllerGetAll } from '@/api/reservations/reservations';
import type { TableStatus } from '@restaurant/shared';
import type { TableDto, OrderDto } from '@/api/restaurantManagerAPI.schemas';
import {
  STATUS_BG,
  STATUS_LABELS,
  STATUS_TONE,
  NEXT_STATUS,
  reservationTimeLabel,
} from './-floor-map';

// ── Helpers ───────────────────────────────────────────────────────────

const ACTIVE_ORDER_STATUSES: string[] = ['draft', 'sent', 'in_progress', 'ready'];

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function computeBillTotal(order: OrderDto): number {
  return order.items.reduce((sum, item) => {
    const modTotal = item.modifiers.reduce((ms, mod) => ms + mod.priceDelta, 0);

    return sum + (item.unitPrice + modTotal) * item.quantity;
  }, 0);
}

// ── Status chip — color-coded, tap-to-cycle, tooltip on next status ────

interface StatusChipProps {
  status: TableStatus;
  onCycle: () => void;
  disabled: boolean;
}

function StatusChip({ status, onCycle, disabled }: StatusChipProps) {
  const next = NEXT_STATUS[status];

  return (
    <button
      type="button"
      onClick={onCycle}
      disabled={disabled}
      title={`Tap to switch to ${STATUS_LABELS[next]}`}
      className={cn(
        'inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium text-foreground transition-colors disabled:cursor-default disabled:opacity-50',
        STATUS_BG[status],
      )}
    >
      <StatusDot tone={STATUS_TONE[status]} size="md" />
      {STATUS_LABELS[status]}
    </button>
  );
}

// ── Bill section ──────────────────────────────────────────────────────

interface BillSectionProps {
  order: OrderDto | undefined;
  menuNameMap: Map<string, string>;
}

function BillSection({ order, menuNameMap }: BillSectionProps) {
  if (!order) {
    return <p className="text-sm text-muted-foreground py-2">No open order.</p>;
  }

  const total = computeBillTotal(order);

  return (
    <div className="space-y-2">
      <div className="space-y-1">
        {order.items.map((item) => {
          const itemName =
            menuNameMap.get(item.menuItemId) ?? `Item ${item.menuItemId.slice(0, 6)}`;
          const linePrice =
            (item.unitPrice + item.modifiers.reduce((s, m) => s + m.priceDelta, 0)) * item.quantity;

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
  tables: TableDto[];
}

export function TableActionSheet({ tables }: TableActionSheetProps) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { tableId, panel } = useSearch({ strict: false }) as { tableId?: string; panel?: string };
  const isOpen = Boolean(tableId) && panel === 'actions';
  const table = tables.find((t) => t.id === tableId) ?? null;

  const setStatus = useTableControllerSetStatus();
  const { data: orders = [] } = useOrderControllerGetAll();
  const { data: menuItems = [] } = useMenuControllerGetItems();
  const { data: todaysReservations = [] } = useReservationControllerGetAll({
    date: todayStr(),
  });

  const menuNameMap = new Map<string, string>(menuItems.map((m) => [m.id, m.name]));

  const activeOrder = table
    ? orders.find((o) => o.tableId === table.id && ACTIVE_ORDER_STATUSES.includes(o.status))
    : undefined;

  // Soonest upcoming `booked` reservation for this table (see Plan 15 Task 3).
  const reservation = table
    ? todaysReservations
        .filter((r) => r.tableId === table.id && r.status === 'booked')
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0]
    : undefined;

  function handleCycleStatus() {
    if (!table) return;
    const statusKey = table.status as TableStatus;

    setStatus.mutate(
      { id: table.id, data: { status: NEXT_STATUS[statusKey] } },
      { onSuccess: () => invalidateTableControllerGetAll(qc) },
    );
  }

  // Hands off to the same order modal the primary tile tap opens (see -order-modal.tsx) —
  // stays on /floor instead of navigating away, so the sheet's CTA and the primary tap
  // converge on one hand-off path (Plan 17 Task 3).
  function handleStartOrder() {
    if (!table) return;
    navigate({ to: '.', search: (prev) => ({ ...prev, tableId: table.id, panel: 'order' }) });
  }

  function handleClose() {
    navigate({
      to: '.',
      search: (prev) =>
        computeNextSearch(
          computeNextSearch(prev as Record<string, unknown>, 'tableId', undefined, false),
          'panel',
          undefined,
          false,
        ),
    });
  }

  const statusKey = table?.status as TableStatus | undefined;

  return (
    <UrlModal
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) handleClose();
      }}
      className="sm:max-w-sm"
    >
      <DialogHeader className="px-5 pt-5 pb-3 border-b border-border">
        <DialogTitle>{table ? `Table ${table.number}` : 'Table'}</DialogTitle>
        {table && statusKey && (
          <div className="flex items-center gap-2 mt-1">
            <StatusChip
              status={statusKey}
              onCycle={handleCycleStatus}
              disabled={setStatus.isPending}
            />
            <span className="text-xs text-muted-foreground">{table.seats} seats</span>
          </div>
        )}
        {reservation && (
          <p className="mt-2 text-sm text-muted-foreground">
            Reserved for{' '}
            <span className="font-medium text-foreground">{reservation.guestName}</span> at{' '}
            {reservationTimeLabel(reservation.date)} · {reservation.partySize} guests
          </p>
        )}
      </DialogHeader>

      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
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
    </UrlModal>
  );
}
