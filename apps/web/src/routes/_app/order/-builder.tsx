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
import { Minus, Plus, Trash2, ShoppingCart, X } from 'lucide-react';
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
import type { ModifierGroupDto, ModifierOptionDto } from '@/api/restaurantManagerAPI.schemas';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';

// ── Line-item state shape ─────────────────────────────────────────────

interface ChosenOption {
  id: string;
  name: string;
  priceDelta: number;
}

interface LineItem {
  menuItemId: string;
  name: string;
  basePrice: number;
  quantity: number;
  notes: string;
  selectedOptions: ChosenOption[];
}

// ── Modifier selection panel ──────────────────────────────────────────

interface ModifierPanelProps {
  itemName: string;
  groups: ModifierGroupDto[];
  onAdd: (options: ChosenOption[]) => void;
  onCancel: () => void;
}

function ModifierPanel({ itemName, groups, onAdd, onCancel }: ModifierPanelProps) {
  // Map: groupId → selected option ids
  const [selections, setSelections] = useState<Record<string, string[]>>({});

  function toggleSingle(groupId: string, optionId: string) {
    setSelections((prev) => ({ ...prev, [groupId]: [optionId] }));
  }

  function toggleMulti(groupId: string, optionId: string) {
    setSelections((prev) => {
      const current = prev[groupId] ?? [];
      return {
        ...prev,
        [groupId]: current.includes(optionId)
          ? current.filter((id) => id !== optionId)
          : [...current, optionId],
      };
    });
  }

  const requiredSatisfied = groups
    .filter((g) => g.required)
    .every((g) => (selections[g.id]?.length ?? 0) >= 1);

  function handleAdd() {
    const chosen: ChosenOption[] = [];
    for (const group of groups) {
      const ids = selections[group.id] ?? [];
      for (const id of ids) {
        const opt = group.options.find((o: ModifierOptionDto) => o.id === id);
        if (opt) {
          chosen.push({ id: opt.id, name: opt.name, priceDelta: opt.priceDelta });
        }
      }
    }
    onAdd(chosen);
  }

  return (
    <div className="flex flex-col gap-4 p-4 border border-border rounded-xl bg-card shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-foreground">Options for {itemName}</p>
        <button
          type="button"
          onClick={onCancel}
          className="text-muted-foreground hover:text-foreground transition-colors rounded p-0.5"
          aria-label="Cancel modifier selection"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {groups.map((group) => (
        <div key={group.id} className="flex flex-col gap-2">
          <p className="text-xs font-medium text-muted-foreground">
            {group.name}
            {group.required && (
              <span className="ml-1.5 text-destructive font-semibold">required</span>
            )}
            {group.selectionType === 'single' && (
              <span className="ml-1.5 text-muted-foreground">(pick one)</span>
            )}
          </p>
          <div className="flex flex-wrap gap-2">
            {group.options.map((opt: ModifierOptionDto) => {
              const isSingle = group.selectionType === 'single';
              const selected = (selections[group.id] ?? []).includes(opt.id);
              return (
                <label
                  key={opt.id}
                  className={cn(
                    'flex items-center gap-1.5 cursor-pointer rounded-lg border px-3 py-1.5 text-xs transition-colors',
                    selected
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border bg-background text-foreground hover:bg-muted',
                  )}
                >
                  <input
                    type={isSingle ? 'radio' : 'checkbox'}
                    name={`group-${group.id}`}
                    value={opt.id}
                    checked={selected}
                    onChange={() =>
                      isSingle
                        ? toggleSingle(group.id, opt.id)
                        : toggleMulti(group.id, opt.id)
                    }
                    className="sr-only"
                  />
                  {opt.name}
                  {opt.priceDelta !== 0 && (
                    <span className="text-muted-foreground">
                      {opt.priceDelta > 0 ? '+' : ''}
                      {opt.priceDelta.toFixed(2)}
                    </span>
                  )}
                </label>
              );
            })}
          </div>
        </div>
      ))}

      <div className="flex gap-2 pt-1">
        <Button size="sm" onClick={handleAdd} disabled={!requiredSatisfied}>
          Add to order
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

// ── Ticket panel ──────────────────────────────────────────────────────

interface TicketPanelProps {
  lines: LineItem[];
  notes: string;
  onNotesChange: (v: string) => void;
  onQtyChange: (idx: number, qty: number) => void;
  onRemove: (idx: number) => void;
  onFire: () => void;
  isFiring: boolean;
}

function TicketPanel({
  lines,
  notes,
  onNotesChange,
  onQtyChange,
  onRemove,
  onFire,
  isFiring,
}: TicketPanelProps) {
  const total = lines.reduce((sum, l) => {
    const optDelta = l.selectedOptions.reduce((s, o) => s + o.priceDelta, 0);
    return sum + (l.basePrice + optDelta) * l.quantity;
  }, 0);

  return (
    <div className="flex flex-col h-full gap-3">
      <p className="text-sm font-semibold text-foreground">Ticket</p>

      {/* Line rows */}
      <div className="flex-1 overflow-y-auto space-y-2 min-h-0">
        {lines.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-8">No items yet</p>
        ) : (
          lines.map((line, idx) => {
            const optDelta = line.selectedOptions.reduce((s, o) => s + o.priceDelta, 0);
            const linePrice = (line.basePrice + optDelta) * line.quantity;
            return (
              // biome-ignore lint/suspicious/noArrayIndexKey: ticket lines have no stable id before firing
              <div
                key={idx}
                className="flex items-start gap-2 rounded-lg border border-border bg-background p-2.5"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-foreground leading-snug">{line.name}</p>
                  {line.selectedOptions.length > 0 && (
                    <p className="text-xs text-muted-foreground leading-snug mt-0.5">
                      {line.selectedOptions.map((o) => o.name).join(', ')}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {linePrice.toFixed(2)}
                  </p>
                </div>

                {/* Qty stepper */}
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => onQtyChange(idx, Math.max(1, line.quantity - 1))}
                    className="flex h-5 w-5 items-center justify-center rounded border border-border text-muted-foreground hover:bg-muted transition-colors"
                    aria-label="Decrease quantity"
                  >
                    <Minus className="h-3 w-3" />
                  </button>
                  <span className="w-5 text-center text-xs font-mono">{line.quantity}</span>
                  <button
                    type="button"
                    onClick={() => onQtyChange(idx, line.quantity + 1)}
                    className="flex h-5 w-5 items-center justify-center rounded border border-border text-muted-foreground hover:bg-muted transition-colors"
                    aria-label="Increase quantity"
                  >
                    <Plus className="h-3 w-3" />
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => onRemove(idx)}
                  className="text-muted-foreground hover:text-destructive rounded p-0.5 transition-colors shrink-0"
                  aria-label="Remove item"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            );
          })
        )}
      </div>

      {/* Notes */}
      <Input
        placeholder="Order notes (optional)"
        value={notes}
        onChange={(e) => onNotesChange(e.target.value)}
        className="shrink-0"
      />

      {/* Total + Fire */}
      <div className="shrink-0 flex items-center justify-between border-t border-border pt-3">
        <p className="text-sm font-semibold text-foreground">Total</p>
        <p className="text-base font-bold text-foreground">{total.toFixed(2)}</p>
      </div>
      <Button
        className="w-full shrink-0"
        disabled={lines.length === 0 || isFiring}
        onClick={onFire}
      >
        {isFiring ? 'Firing…' : 'Fire order'}
      </Button>
    </div>
  );
}

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

  // Filter menu items by selected category
  const visibleItems =
    activeCategoryId === ''
      ? menuItems.filter((m) => m.available)
      : menuItems.filter((m) => m.categoryId === activeCategoryId && m.available);

  // Groups relevant to the pending item
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
      // Merge with existing line only when options are identical
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
    /* Full-screen overlay */
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      {/* ── Top bar ── */}
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

      {/* ── Split body ── */}
      <div className="flex flex-1 min-h-0">
        {/* ── LEFT: table select + category tabs + grid ── */}
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
                  <span className="text-[10px] text-primary font-medium">+ options</span>
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

        {/* ── RIGHT: ticket (hidden on mobile, shown via Sheet) ── */}
        <div className="hidden md:flex flex-col w-80 shrink-0 border-l border-border p-4 overflow-y-auto">
          <TicketPanel
            lines={lines}
            notes={orderNotes}
            onNotesChange={setOrderNotes}
            onQtyChange={handleQtyChange}
            onRemove={handleRemove}
            onFire={handleFire}
            isFiring={createOrder.isPending}
          />
        </div>
      </div>

      {/* ── Mobile: floating ticket button + bottom Sheet ── */}
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

      <Sheet open={ticketOpen} onOpenChange={setTicketOpen}>
        <SheetContent side="bottom" className="h-[80vh] p-0">
          <SheetHeader className="px-4 pt-4 pb-0">
            <SheetTitle>Ticket</SheetTitle>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto px-4 pt-3 pb-0 min-h-0">
            <TicketPanel
              lines={lines}
              notes={orderNotes}
              onNotesChange={setOrderNotes}
              onQtyChange={handleQtyChange}
              onRemove={handleRemove}
              onFire={() => {
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
