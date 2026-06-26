/**
 * Inline modifier-selection panel — shown above the menu grid when a
 * tapped item has modifier groups. Dash-prefixed: not a route.
 */
import { useState } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ModifierGroupDto, ModifierOptionDto } from '@/api/restaurantManagerAPI.schemas';
import { Button } from '@/components/ui/button';

export interface ChosenOption {
  id: string;
  name: string;
  priceDelta: number;
}

interface ModifierPanelProps {
  itemName: string;
  groups: ModifierGroupDto[];
  onAdd: (options: ChosenOption[]) => void;
  onCancel: () => void;
}

export function ModifierPanel({ itemName, groups, onAdd, onCancel }: ModifierPanelProps) {
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
                      isSingle ? toggleSingle(group.id, opt.id) : toggleMulti(group.id, opt.id)
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
        <Button size="sm" variant="outline" onClick={handleAdd} disabled={!requiredSatisfied}>
          Add to order
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
