import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { Plus, Pencil, Trash2, PackageMinus } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  useInventory,
  useCreateInventoryItem,
  useUpdateInventoryItem,
  useDeleteInventoryItem,
  useAdjustInventory,
} from '@/lib/inventory-api';
import type {
  InventoryItem,
  CreateInventoryItemDto,
  UpdateInventoryItemDto,
  AdjustInventoryDto,
  InventoryUnit,
} from '@restaurant/shared';

export const Route = createFileRoute('/_app/inventory/')({
  component: InventoryPage,
});

type InventoryItemWithStatus = InventoryItem & { lowStock: boolean };

const UNITS: InventoryUnit[] = ['kg', 'litre', 'unit'];
const ADJUST_REASONS: AdjustInventoryDto['reason'][] = ['delivery', 'waste', 'correction'];

// ── Inventory form ────────────────────────────────────────────────────

function InventoryForm({
  initial,
  onSave,
  onCancel,
}: {
  initial?: Partial<InventoryItem>;
  onSave: (data: CreateInventoryItemDto) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? '');
  const [unit, setUnit] = useState<InventoryUnit>(initial?.unit ?? 'unit');
  const [quantity, setQuantity] = useState(initial?.quantity ?? 0);
  const [minStock, setMinStock] = useState(initial?.minStock ?? 0);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSave({ name, unit, quantity, minStock });
      }}
      className="rounded-lg border p-4 space-y-3"
    >
      <div className="flex flex-wrap gap-3">
        <label className="flex flex-col gap-1 text-sm flex-1 min-w-40">
          Name *
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="rounded-md border px-2 py-1.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Unit *
          <select
            value={unit}
            onChange={(e) => setUnit(e.target.value as InventoryUnit)}
            className="rounded-md border px-2 py-1.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {UNITS.map((u) => (
              <option key={u} value={u}>
                {u.charAt(0).toUpperCase() + u.slice(1)}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="flex flex-wrap gap-3">
        <label className="flex flex-col gap-1 text-sm">
          Quantity *
          <input
            type="number"
            min={0}
            step="any"
            value={quantity}
            onChange={(e) => setQuantity(Number(e.target.value))}
            className="rounded-md border px-2 py-1.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring w-32"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Min stock *
          <input
            type="number"
            min={0}
            step="any"
            value={minStock}
            onChange={(e) => setMinStock(Number(e.target.value))}
            className="rounded-md border px-2 py-1.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring w-32"
          />
        </label>
      </div>
      <div className="flex gap-2">
        <button
          type="submit"
          className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          Save
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md border px-3 py-1.5 text-sm font-medium hover:bg-accent transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

// ── Adjust form ───────────────────────────────────────────────────────

function AdjustForm({
  onSave,
  onCancel,
}: {
  onSave: (data: AdjustInventoryDto) => void;
  onCancel: () => void;
}) {
  const [delta, setDelta] = useState(0);
  const [reason, setReason] = useState<AdjustInventoryDto['reason']>('delivery');

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSave({ delta, reason });
      }}
      className="mt-2 rounded-md border bg-muted/30 p-3 space-y-3"
    >
      <div className="flex flex-wrap gap-3">
        <label className="flex flex-col gap-1 text-sm">
          Adjustment *
          <input
            type="number"
            step="any"
            value={delta}
            onChange={(e) => setDelta(Number(e.target.value))}
            className="rounded-md border px-2 py-1.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring w-28"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Reason *
          <select
            value={reason}
            onChange={(e) => setReason(e.target.value as AdjustInventoryDto['reason'])}
            className="rounded-md border px-2 py-1.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {ADJUST_REASONS.map((r) => (
              <option key={r} value={r}>
                {r.charAt(0).toUpperCase() + r.slice(1)}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="flex gap-2">
        <button
          type="submit"
          className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          Apply
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md border px-3 py-1.5 text-sm font-medium hover:bg-accent transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

// ── Main page ─────────────────────────────────────────────────────────

function InventoryPage() {
  const [formMode, setFormMode] = useState<'none' | 'create' | { id: string }>('none');
  const [adjustingId, setAdjustingId] = useState<string | null>(null);

  const { data: items = [], isLoading } = useInventory();
  const createItem = useCreateInventoryItem();
  const updateItem = useUpdateInventoryItem();
  const deleteItem = useDeleteInventoryItem();
  const adjustItem = useAdjustInventory();

  if (isLoading) return <div className="p-6 text-sm text-muted-foreground">Loading…</div>;

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Inventory</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {items.length} item{items.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={() => setFormMode('create')}
          className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          <Plus className="h-4 w-4" /> Add item
        </button>
      </div>

      {formMode === 'create' && (
        <InventoryForm
          onSave={(data) => createItem.mutate(data, { onSuccess: () => setFormMode('none') })}
          onCancel={() => setFormMode('none')}
        />
      )}

      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">No inventory items yet.</p>
      ) : (
        <div className="space-y-2">
          {(items as InventoryItemWithStatus[]).map((item) => (
            <div key={item.id} className="rounded-lg border p-4">
              {typeof formMode === 'object' && formMode.id === item.id ? (
                <InventoryForm
                  initial={item}
                  onSave={(data) =>
                    updateItem.mutate(
                      { id: item.id, dto: data as UpdateInventoryItemDto },
                      { onSuccess: () => setFormMode('none') },
                    )
                  }
                  onCancel={() => setFormMode('none')}
                />
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{item.name}</p>
                        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                          {item.unit}
                        </span>
                        {item.lowStock && (
                          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                            Low stock
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Qty:{' '}
                        <span className={cn('font-medium', item.lowStock && 'text-amber-700')}>
                          {item.quantity}
                        </span>{' '}
                        · Min: {item.minStock}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setAdjustingId(adjustingId === item.id ? null : item.id)}
                        aria-label="Adjust stock"
                        className="rounded p-1 hover:bg-accent transition-colors"
                      >
                        <PackageMinus className="h-4 w-4 text-muted-foreground" />
                      </button>
                      <button
                        onClick={() => setFormMode({ id: item.id })}
                        aria-label="Edit"
                        className="rounded p-1 hover:bg-accent transition-colors"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() =>
                          window.confirm(`Delete "${item.name}"?`) && deleteItem.mutate(item.id)
                        }
                        aria-label="Delete"
                        className="rounded p-1 text-destructive hover:bg-accent transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                  {adjustingId === item.id && (
                    <AdjustForm
                      onSave={(data) =>
                        adjustItem.mutate(
                          { id: item.id, dto: data },
                          { onSuccess: () => setAdjustingId(null) },
                        )
                      }
                      onCancel={() => setAdjustingId(null)}
                    />
                  )}
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
