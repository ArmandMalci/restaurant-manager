import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, PackageMinus } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  useInventoryControllerFindAll,
  useInventoryControllerCreate,
  useInventoryControllerUpdate,
  useInventoryControllerRemove,
  useInventoryControllerAdjust,
  invalidateInventoryControllerFindAll,
} from '@/api/inventory/inventory';
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
      className="space-y-3 rounded-lg border p-4"
    >
      <div className="flex flex-wrap gap-3">
        <label className="flex min-w-40 flex-1 flex-col gap-1 text-sm">
          Name *
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="focus-visible:ring-ring rounded-md border px-2 py-1.5 text-sm outline-none focus-visible:ring-2"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Unit *
          <select
            value={unit}
            onChange={(e) => setUnit(e.target.value as InventoryUnit)}
            className="focus-visible:ring-ring rounded-md border px-2 py-1.5 text-sm outline-none focus-visible:ring-2"
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
            className="focus-visible:ring-ring w-32 rounded-md border px-2 py-1.5 text-sm outline-none focus-visible:ring-2"
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
            className="focus-visible:ring-ring w-32 rounded-md border px-2 py-1.5 text-sm outline-none focus-visible:ring-2"
          />
        </label>
      </div>
      <div className="flex gap-2">
        <button
          type="submit"
          className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-md px-3 py-1.5 text-sm font-medium transition-colors"
        >
          Save
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="hover:bg-accent rounded-md border px-3 py-1.5 text-sm font-medium transition-colors"
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
      className="bg-muted/30 mt-2 space-y-3 rounded-md border p-3"
    >
      <div className="flex flex-wrap gap-3">
        <label className="flex flex-col gap-1 text-sm">
          Adjustment *
          <input
            type="number"
            step="any"
            value={delta}
            onChange={(e) => setDelta(Number(e.target.value))}
            className="focus-visible:ring-ring w-28 rounded-md border px-2 py-1.5 text-sm outline-none focus-visible:ring-2"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Reason *
          <select
            value={reason}
            onChange={(e) => setReason(e.target.value as AdjustInventoryDto['reason'])}
            className="focus-visible:ring-ring rounded-md border px-2 py-1.5 text-sm outline-none focus-visible:ring-2"
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
          className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-md px-3 py-1.5 text-sm font-medium transition-colors"
        >
          Apply
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="hover:bg-accent rounded-md border px-3 py-1.5 text-sm font-medium transition-colors"
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

  const qc = useQueryClient();
  const { data: items = [], isLoading } = useInventoryControllerFindAll();
  const createItem = useInventoryControllerCreate({
    mutation: { onSuccess: () => invalidateInventoryControllerFindAll(qc) },
  });
  const updateItem = useInventoryControllerUpdate({
    mutation: { onSuccess: () => invalidateInventoryControllerFindAll(qc) },
  });
  const deleteItem = useInventoryControllerRemove({
    mutation: { onSuccess: () => invalidateInventoryControllerFindAll(qc) },
  });
  const adjustItem = useInventoryControllerAdjust({
    mutation: { onSuccess: () => invalidateInventoryControllerFindAll(qc) },
  });

  if (isLoading) return <div className="text-muted-foreground p-6 text-sm">Loading…</div>;

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Inventory</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {items.length} item{items.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setFormMode('create')}
          className="bg-primary text-primary-foreground hover:bg-primary/90 flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-colors"
        >
          <Plus className="h-4 w-4" /> Add item
        </button>
      </div>

      {formMode === 'create' && (
        <InventoryForm
          onSave={(data) => createItem.mutate({ data }, { onSuccess: () => setFormMode('none') })}
          onCancel={() => setFormMode('none')}
        />
      )}

      {items.length === 0 ? (
        <p className="text-muted-foreground text-sm">No inventory items yet.</p>
      ) : (
        <div className="space-y-2">
          {(items as InventoryItemWithStatus[]).map((item) => (
            <div key={item.id} className="rounded-lg border p-4">
              {typeof formMode === 'object' && formMode.id === item.id ? (
                <InventoryForm
                  initial={item}
                  onSave={(data) =>
                    updateItem.mutate(
                      { id: item.id, data: data as UpdateInventoryItemDto },
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
                      <p className="text-muted-foreground text-sm">
                        Qty:{' '}
                        <span className={cn('font-medium', item.lowStock && 'text-amber-700')}>
                          {item.quantity}
                        </span>{' '}
                        · Min: {item.minStock}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setAdjustingId(adjustingId === item.id ? null : item.id)}
                        aria-label="Adjust stock"
                        className="hover:bg-accent rounded p-1 transition-colors"
                      >
                        <PackageMinus className="text-muted-foreground h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormMode({ id: item.id })}
                        aria-label="Edit"
                        className="hover:bg-accent rounded p-1 transition-colors"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          window.confirm(`Delete "${item.name}"?`) &&
                          deleteItem.mutate({ id: item.id })
                        }
                        aria-label="Delete"
                        className="text-destructive hover:bg-accent rounded p-1 transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                  {adjustingId === item.id && (
                    <AdjustForm
                      onSave={(data) =>
                        adjustItem.mutate(
                          { id: item.id, data },
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
