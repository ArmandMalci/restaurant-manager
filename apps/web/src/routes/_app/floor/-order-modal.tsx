/**
 * TableOrderModal — opens the order builder directly, anchored to a table, when the primary
 * tile tap fires (see floor/index.tsx's `handleTableClick` and -floor-map.tsx). Replaces the
 * old "tap → action sheet → Start order → navigate to /order" hand-off (Plan 17 Task 3):
 * ordering is by far the more frequent action, so it now gets the primary tap directly.
 *
 * URL-driven via `tableId` + `panel=order` on `/floor` (the shared `tableId` key also drives
 * -table-action-sheet.tsx's `panel=actions` sibling, opened from the "⋯" icon instead).
 *
 * Reuses `OrderBuilder` as-is (no fork) — only the outer chrome changes (full page → modal).
 *
 * File is dash-prefixed so TanStack Router ignores it as a route.
 */
import { useNavigate, useSearch } from '@tanstack/react-router';
import { UrlModal, computeNextSearch } from '@/components/ui/url-modal';
import { useOrderControllerGetAll } from '@/api/orders/orders';
import { OrderBuilder } from '../order/-builder';

export function TableOrderModal() {
  const navigate = useNavigate();
  const { tableId, panel } = useSearch({ strict: false }) as { tableId?: string; panel?: string };
  const isOpen = Boolean(tableId) && panel === 'order';
  const { data: orders = [] } = useOrderControllerGetAll();

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

  return (
    <UrlModal
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) handleClose();
      }}
      showCloseButton={false}
      className="p-0 sm:max-w-5xl sm:h-[88vh] sm:rounded-none"
    >
      {/* Mounted only while open, keyed by tableId — OrderBuilder holds its own ticket
          state, which must reset when the modal reopens for a different table. */}
      {isOpen && (
        <OrderBuilder
          key={tableId}
          onClose={handleClose}
          initialTableId={tableId}
          orders={orders}
        />
      )}
    </UrlModal>
  );
}
