/**
 * POS split-order builder — full-screen overlay opened from the kanban.
 *
 * Layout:
 *   ≥ md  → left (table + category grid) | right (live ticket)
 *   < md  → menu grid full-width; ticket opens as bottom Sheet
 *
 * File is dash-prefixed so TanStack Router ignores it as a route.
 */
import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { ShoppingCart, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  useMenuControllerGetCategories,
  useMenuControllerGetItems,
  useMenuControllerGetModifierGroups,
} from '@/api/menu/menu';
import { useTableControllerGetAll } from '@/api/tables/tables';
import {
  useOrderControllerCreate,
  invalidateOrderControllerGetAll,
} from '@/api/orders/orders';
import type { ModifierGroupDto } from '@/api/restaurantManagerAPI.schemas';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { ModifierPanel } from './-modifier-panel';
import type { ChosenOption } from './-modifier-panel';
import { TicketPanel } from './-ticket-panel';
import type { LineItem } from './-ticket-panel';

// ── Pending item (awaiting modifier selection) ───────────────────────

interface PendingItem {
  menuItemId: string;
  name: string;
  basePrice: number;
  modifierGroupIds: string[];
}

// ── Main builder ──────────────────────────────────────────────────────

interface OrderBuilderProps {
  onClose: () => void;
}

export function OrderBuilder({ onClose }: OrderBuilderProps) {
  const qc = useQueryClient();
  const createOrder = useOrderControllerCreate();

  const { data: tables = [] } = useTableControllerGetAll();
  const { data: categories = [] } = useMenuControllerGetCategories();
  const { data: menuItems = [] } = useMenuControllerGetItems();
  const { data: allGroups = [] } = useMenuControllerGetModifierGroups();

  const [tableId, setTableId] = useState('');
  const [activeCategoryId, setActiveCategoryId] = useState<string>('');
  const [lines, setLines] = useState<LineItem[]>([]);
  const [orderNotes, setOrderNotes] = useState('');
  const [pendingItem, setPendingItem] = useState<PendingItem | null>(null);
  const [ticketOpen, setTicketOpen] = useState(false);

  const visibleItems =
    activeCategoryId === ''
      ? menuItems.filter((m) => m.available)
      : menuItems.filter((m) => m.categoryId === activeCategoryId && m.available);

  const pendingGroups = pendingItem
    ? (allGroups as ModifierGroupDto[]).filter((g) =>
        pendingItem.modifierGroupIds.includes(g.id),
      )
    : [];

  function handleTapItem(item: {
    id: string;
    name: string;
    price: number;
    modifierGroupIds: string[];
  }) {
    if (item.modifierGroupIds.length > 0) {
      setPendingItem({
        menuItemId: item.id,
        name: item.name,
        basePrice: item.price,
        modifierGroupIds: item.modifierGroupIds,
      });
    } else {
      addLine(item.id, item.name, item.price, []);
    }
  }

  function addLine(
    menuItemId: string,
    name: string,
    basePrice: number,
    selectedOptions: ChosenOption[],
  ) {
    setLines((prev) => {
      const sameKey = (a: ChosenOption[], b: ChosenOption[]) =>
        a.length === b.length && a.every((o, i) => o.id === b[i].id);
      const existingIdx = prev.findIndex(
        (l) => l.menuItemId === menuItemId && sameKey(l.selectedOptions, selectedOptions),
      );
      if (existingIdx !== -1) {
        return prev.map((l, i) =>
          i === existingIdx ? { ...l, quantity: l.quantity + 1 } : l,
        );
      }
      return [...prev, { menuItemId, name, basePrice, quantity: 1, notes: '', selectedOptions }];
    });
    setPendingItem(null);
  }

  function handleModifierAdd(chosen: ChosenOption[]) {
    if (!pendingItem) return;
    addLine(pendingItem.menuItemId, pendingItem.name, pendingItem.basePrice, chosen);
  }

  function handleQtyChange(idx: number, qty: number) {
    setLines((prev) => prev.map((l, i) => (i === idx ? { ...l, quantity: qty } : l)));
  }

  function handleRemove(idx: number) {
    setLines((prev) => prev.filter((_, i) => i !== idx));
  }

  function handleFire() {
    if (!tableId || lines.length === 0) return;
    createOrder.mutate(
      {
        data: {
          tableId,
          notes: orderNotes || null,
          items: lines.map((l) => ({
            menuItemId: l.menuItemId,
            quantity: l.quantity,
            notes: l.notes || null,
            modifierOptionIds: l.selectedOptions.map((o) => o.id),
          })),
        },
      },
      {
        onSuccess: () => {
          invalidateOrderControllerGetAll(qc);
          onClose();
        },
      },
    );
  }

  const ticketLineCount = lines.reduce((s, l) => s + l.quantity, 0);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      {/* Top bar */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3 shrink-0">
        <p className="text-base font-semibold text-foreground">New order</p>
        <button
          type="button"
          onClick={onClose}
          className="text-muted-foreground hover:text-foreground rounded p-1 transition-colors"
          aria-label="Close builder"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Split body */}
      <div className="flex flex-1 min-h-0">
        {/* LEFT: table select + category pills + menu grid */}
        <div className="flex flex-col flex-1 min-w-0 overflow-y-auto p-4 gap-4">
          {/* Table select */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-muted-foreground" htmlFor="builder-table">
              Table
            </label>
            <select
              id="builder-table"
              value={tableId}
              onChange={(e) => setTableId(e.target.value)}
              className="focus-visible:ring-ring w-full max-w-xs rounded-lg border border-input bg-transparent px-2.5 py-1.5 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <option value="">Select table…</option>
              {tables.map((t) => (
                <option key={t.id} value={t.id}>
                  Table {t.number}
                </option>
              ))}
            </select>
          </div>

          {/* Category filter pills */}
          <div className="flex flex-wrap gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => setActiveCategoryId('')}
              className={cn(
                'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                activeCategoryId === ''
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border bg-muted text-muted-foreground hover:bg-muted/80',
              )}
            >
              All
            </button>
            {categories.map((cat) => (
              <button
                type="button"
                key={cat.id}
                onClick={() => setActiveCategoryId(cat.id)}
                className={cn(
                  'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                  activeCategoryId === cat.id
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border bg-muted text-muted-foreground hover:bg-muted/80',
                )}
              >
                {cat.name}
              </button>
            ))}
          </div>

          {/* Modifier selection panel (inline, above grid) */}
          {pendingItem && (
            <ModifierPanel
              itemName={pendingItem.name}
              groups={pendingGroups}
              onAdd={handleModifierAdd}
              onCancel={() => setPendingItem(null)}
            />
          )}

          {/* Menu item grid */}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
            {visibleItems.map((item) => (
              <button
                type="button"
                key={item.id}
                onClick={() => handleTapItem(item)}
                className="flex flex-col items-start gap-1 rounded-xl border border-border bg-card p-3 text-left transition-colors hover:bg-accent hover:text-accent-foreground active:scale-[0.98]"
              >
                <p className="text-xs font-semibold text-foreground leading-snug line-clamp-2">
                  {item.name}
                </p>
                <p className="text-xs text-muted-foreground">{item.price.toFixed(2)}</p>
                {item.modifierGroupIds.length > 0 && (
                  <span className="text-[10px] text-muted-foreground font-medium">+ options</span>
                )}
              </button>
            ))}
            {visibleItems.length === 0 && (
              <p className="col-span-full text-xs text-muted-foreground py-8 text-center">
                No items in this category
              </p>
            )}
          </div>
        </div>

        {/* RIGHT: ticket (≥ md only) */}
        <div className="hidden md:flex flex-col w-80 shrink-0 border-l border-border p-4 overflow-y-auto">
          <TicketPanel
            lines={lines}
            notes={orderNotes}
            tableId={tableId}
            onNotesChange={setOrderNotes}
            onQtyChange={handleQtyChange}
            onRemove={handleRemove}
            onFire={handleFire}
            isFiring={createOrder.isPending}
          />
        </div>
      </div>

      {/* Mobile: ticket button */}
      <div className="md:hidden shrink-0 border-t border-border p-3 flex justify-end">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setTicketOpen(true)}
          className="flex items-center gap-2"
        >
          <ShoppingCart className="h-4 w-4" />
          Ticket
          {ticketLineCount > 0 && (
            <span className="rounded-full bg-primary text-primary-foreground text-[10px] font-bold w-4 h-4 flex items-center justify-center">
              {ticketLineCount}
            </span>
          )}
        </Button>
      </div>

      {/* Mobile: ticket as bottom Sheet */}
      <Sheet open={ticketOpen} onOpenChange={setTicketOpen}>
        <SheetContent side="bottom" className="h-[80vh] p-0">
          <SheetHeader className="px-4 pt-4 pb-0">
            <SheetTitle>Ticket</SheetTitle>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto px-4 pt-3 pb-4 min-h-0">
            <TicketPanel
              lines={lines}
              notes={orderNotes}
              tableId={tableId}
              onNotesChange={setOrderNotes}
              onQtyChange={handleQtyChange}
              onRemove={handleRemove}
              onFire={() => {
                if (!tableId || lines.length === 0) return;
                handleFire();
                setTicketOpen(false);
              }}
              isFiring={createOrder.isPending}
            />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
