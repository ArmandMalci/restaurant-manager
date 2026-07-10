/**
 * Live ticket panel — shows current line items, qty steppers, running
 * total, notes input, and the "Fire order" CTA.
 * Dash-prefixed: not a route.
 */
import { Minus, Plus, Trash2 } from 'lucide-react';
import type { ChosenOption } from './-modifier-panel';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export interface LineItem {
  menuItemId: string;
  name: string;
  basePrice: number;
  quantity: number;
  notes: string;
  selectedOptions: ChosenOption[];
}

/** An already-fired item on the table's existing open order — read-only. */
export interface FiredLineItem {
  id: string;
  name: string;
  quantity: number;
}

interface TicketPanelProps {
  lines: LineItem[];
  notes: string;
  tableId: string;
  onNotesChange: (v: string) => void;
  onQtyChange: (idx: number, qty: number) => void;
  onRemove: (idx: number) => void;
  onFire: () => void;
  isFiring: boolean;
  /** Already-fired items on the table's existing open order, shown read-only above the editable lines. */
  firedItems?: FiredLineItem[];
  fireLabel?: string;
  /** Order-level notes only apply when creating a brand-new order. */
  showNotes?: boolean;
}

export function TicketPanel({
  lines,
  notes,
  tableId,
  onNotesChange,
  onQtyChange,
  onRemove,
  onFire,
  isFiring,
  firedItems,
  fireLabel = 'Fire order',
  showNotes = true,
}: TicketPanelProps) {
  const total = lines.reduce((sum, l) => {
    const optDelta = l.selectedOptions.reduce((s, o) => s + o.priceDelta, 0);
    return sum + (l.basePrice + optDelta) * l.quantity;
  }, 0);

  const canFire = lines.length > 0 && !!tableId && !isFiring;

  return (
    <div className="flex flex-col h-full gap-3">
      <p className="text-sm font-semibold text-foreground">Ticket</p>

      {/* Already-fired items — read-only */}
      {firedItems && firedItems.length > 0 && (
        <div className="shrink-0 space-y-1.5">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Already fired
          </p>
          {firedItems.map((f) => (
            <div
              key={f.id}
              className="flex items-center justify-between rounded-lg border border-border bg-muted/40 px-2.5 py-2 text-xs"
            >
              <span className="text-foreground">{f.name}</span>
              <span className="font-mono text-muted-foreground">×{f.quantity}</span>
            </div>
          ))}
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            New items
          </p>
        </div>
      )}

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
                  <p className="text-xs text-muted-foreground mt-0.5">{linePrice.toFixed(2)}</p>
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

      {/* Notes (order-level; only meaningful when creating a new order) */}
      {showNotes && (
        <Input
          placeholder="Order notes (optional)"
          value={notes}
          onChange={(e) => onNotesChange(e.target.value)}
          className="shrink-0"
        />
      )}

      {/* Total + Fire */}
      <div className="shrink-0 flex items-center justify-between border-t border-border pt-3">
        <p className="text-sm font-semibold text-foreground">Total</p>
        <p className="text-base font-bold text-foreground">{total.toFixed(2)}</p>
      </div>

      {!tableId && lines.length > 0 && (
        <p className="text-xs text-destructive shrink-0 text-center">Select a table to fire</p>
      )}

      <Button className="w-full shrink-0" disabled={!canFire} onClick={onFire}>
        {isFiring ? 'Firing…' : fireLabel}
      </Button>
    </div>
  );
}
