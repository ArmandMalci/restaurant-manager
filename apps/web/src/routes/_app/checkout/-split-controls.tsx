/**
 * SplitControls — mode toggle (even/by-item), even-split stepper, and the
 * by-item assignment list. Purely presentational; state lives in SplitPanel.
 * Dash-prefixed: not a route.
 */
import { Minus, Plus } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import type { OrderDto } from '@/api/restaurantManagerAPI.schemas';
import { lineItemTotal } from './-split-math';

export type SplitMode = 'even' | 'byItem';

export interface SplitControlsProps {
  mode: SplitMode;
  onModeChange: (mode: SplitMode) => void;
  shareCount: number;
  onShareCountChange: (count: number) => void;
  order: OrderDto;
  assignments: Record<string, number>;
  onAssign: (itemId: string, splitIndex: number) => void;
}

function ModeButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
        active
          ? 'bg-card text-foreground shadow-sm'
          : 'text-muted-foreground hover:text-foreground',
      )}
    >
      {children}
    </button>
  );
}

export function SplitControls({
  mode,
  onModeChange,
  shareCount,
  onShareCountChange,
  order,
  assignments,
  onAssign,
}: SplitControlsProps) {
  return (
    <>
      <div className="no-print flex gap-1 rounded-lg bg-muted p-1">
        <ModeButton active={mode === 'even'} onClick={() => onModeChange('even')}>
          Even
        </ModeButton>
        <ModeButton active={mode === 'byItem'} onClick={() => onModeChange('byItem')}>
          By item
        </ModeButton>
      </div>

      {mode === 'even' && (
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-foreground">Number of splits</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onShareCountChange(shareCount - 1)}
              className="flex h-7 w-7 items-center justify-center rounded border border-border text-muted-foreground hover:bg-muted transition-colors"
              aria-label="Decrease splits"
            >
              <Minus className="h-3.5 w-3.5" />
            </button>
            <span className="w-6 text-center font-mono text-sm">{shareCount}</span>
            <button
              type="button"
              onClick={() => onShareCountChange(shareCount + 1)}
              className="flex h-7 w-7 items-center justify-center rounded border border-border text-muted-foreground hover:bg-muted transition-colors"
              aria-label="Increase splits"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}

      {mode === 'byItem' && (
        <div className="space-y-1.5">
          {order.items.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm"
            >
              <span className="flex-1">
                {item.quantity}× item · ${lineItemTotal(item).toFixed(2)}
              </span>
              <Select
                value={String(assignments[item.id] ?? 0)}
                onValueChange={(v) => onAssign(item.id, Number(v ?? 0))}
              >
                <SelectTrigger size="sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: shareCount }, (_, i) => {
                    return (
                      // biome-ignore lint/suspicious/noArrayIndexKey: split index is the bucket's stable identity
                      <SelectItem key={i} value={String(i)}>
                        Split {i + 1}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
