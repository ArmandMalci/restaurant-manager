import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, AlertTriangle, Search, Package } from 'lucide-react';
import { EmptyState } from '@/components/ui/empty-state';
import { Button } from '@/components/ui/button';
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
import type { InventoryItemWithStatusDto } from '@/api/restaurantManagerAPI.schemas';

export const Route = createFileRoute('/_app/inventory/')({
  component: InventoryPage,
});

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
        <label className="flex min-w-40 flex-1 flex-col gap-1 text-sm font-medium">
          Name *
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="focus-visible:ring-ring rounded-md border px-2 py-1.5 text-sm font-normal outline-none focus-visible:ring-2"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium">
          Unit *
          <select
            value={unit}
            onChange={(e) => setUnit(e.target.value as InventoryUnit)}
            className="focus-visible:ring-ring rounded-md border px-2 py-1.5 text-sm font-normal outline-none focus-visible:ring-2"
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
        <label className="flex flex-col gap-1 text-sm font-medium">
          Quantity *
          <input
            type="number"
            min={0}
            step="any"
            value={quantity}
            onChange={(e) => setQuantity(Number(e.target.value))}
            className="focus-visible:ring-ring w-32 rounded-md border px-2 py-1.5 text-sm font-normal outline-none focus-visible:ring-2"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium">
          Min stock *
          <input
            type="number"
            min={0}
            step="any"
            value={minStock}
            onChange={(e) => setMinStock(Number(e.target.value))}
            className="focus-visible:ring-ring w-32 rounded-md border px-2 py-1.5 text-sm font-normal outline-none focus-visible:ring-2"
          />
        </label>
      </div>
      <div className="flex gap-2">
        <Button type="submit" size="sm">
          Save
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

// ── Adjust quantity dialog ────────────────────────────────────────────

function AdjustDialog({
  item,
  onSave,
  onClose,
}: {
  item: InventoryItemWithStatusDto;
  onSave: (data: AdjustInventoryDto) => void;
  onClose: () => void;
}) {
  const [delta, setDelta] = useState(0);
  const [reason, setReason] = useState<AdjustInventoryDto['reason']>('delivery');

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-label={`Adjust quantity for ${item.name}`}
    >
      {/* biome-ignore lint/a11y/noStaticElementInteractions: modal overlay dismiss */}
      {/* biome-ignore lint/a11y/useKeyWithClickEvents: modal overlay dismiss */}
      <div className="fixed inset-0 bg-black/40" onClick={onClose} />
      <div className="relative z-10 w-full max-w-sm rounded-xl border bg-background p-6 shadow-xl">
        <h2 className="mb-1 text-base font-semibold">Adjust Quantity</h2>
        <p className="text-muted-foreground mb-4 text-sm">
          {item.name} — current: {item.quantity} {item.unit}
        </p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSave({ delta, reason });
          }}
          className="space-y-4"
        >
          <label className="flex flex-col gap-1 text-sm font-medium">
            Amount (positive to add, negative to remove)
            <input
              type="number"
              step="any"
              value={delta}
              onChange={(e) => setDelta(Number(e.target.value))}
              className="focus-visible:ring-ring rounded-md border px-2 py-1.5 text-sm font-normal outline-none focus-visible:ring-2"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium">
            Reason
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value as AdjustInventoryDto['reason'])}
              className="focus-visible:ring-ring rounded-md border px-2 py-1.5 text-sm font-normal outline-none focus-visible:ring-2"
            >
              {ADJUST_REASONS.map((r) => (
                <option key={r} value={r}>
                  {r.charAt(0).toUpperCase() + r.slice(1)}
                </option>
              ))}
            </select>
          </label>
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" size="sm">
              Apply
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Status badge ──────────────────────────────────────────────────────

function StatusBadge({ lowStock }: { lowStock: boolean }) {
  if (!lowStock) return null;

  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-warning/10 px-2 py-0.5 text-xs font-medium text-warning-foreground">
      <AlertTriangle className="h-3 w-3" />
      Low stock
    </span>
  );
}

// ── Main page ─────────────────────────────────────────────────────────

function InventoryPage() {
  const [formMode, setFormMode] = useState<'none' | 'create' | { id: string }>('none');
  const [adjustingItem, setAdjustingItem] = useState<InventoryItemWithStatusDto | null>(null);
  const [search, setSearch] = useState('');

  const qc = useQueryClient();
  const { data: rawItems = [], isLoading } = useInventoryControllerFindAll();
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

  // rawItems is InventoryItemWithStatusDto[] — use it directly
  const items: InventoryItemWithStatusDto[] = rawItems;

  const lowStockCount = items.filter((i) => i.lowStock).length;
  const okCount = items.length - lowStockCount;

  const filtered = search.trim()
    ? items.filter((i) => i.name.toLowerCase().includes(search.trim().toLowerCase()))
    : items;

  if (isLoading) return <div className="text-muted-foreground p-6 text-sm">Loading…</div>;

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Inventory</h1>
        <Button onClick={() => setFormMode('create')}>
          <Plus className="mr-1.5 h-4 w-4" />
          Add Item
        </Button>
      </div>

      {/* Stat pills */}
      <div className="flex flex-wrap gap-3">
        <div className="bg-muted/50 rounded-lg border px-4 py-2 text-sm">
          <span className="text-muted-foreground">Total Items</span>
          <span className="ml-2 font-semibold">{items.length}</span>
        </div>
        <div className="rounded-lg border bg-warning/5 px-4 py-2 text-sm">
          <span className="text-muted-foreground">Low Stock</span>
          <span className="text-warning-foreground ml-2 font-semibold">{lowStockCount}</span>
        </div>
        <div className="rounded-lg border bg-success/5 px-4 py-2 text-sm">
          <span className="text-muted-foreground">OK</span>
          <span className="ml-2 font-semibold text-success">{okCount}</span>
        </div>
      </div>

      {/* Create form */}
      {formMode === 'create' && (
        <InventoryForm
          onSave={(data) => createItem.mutate({ data }, { onSuccess: () => setFormMode('none') })}
          onCancel={() => setFormMode('none')}
        />
      )}

      {/* Search */}
      <div className="relative max-w-xs">
        <Search className="text-muted-foreground absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2" />
        <input
          type="search"
          placeholder="Search items…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="focus-visible:ring-ring w-full rounded-md border py-1.5 pl-8 pr-3 text-sm outline-none focus-visible:ring-2"
        />
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={Package}
          title={search ? 'No items match your search' : 'No inventory items yet'}
          description={
            search ? 'Try a different search term.' : 'Add your first item to start tracking stock.'
          }
        />
      ) : (
        <div className="rounded-lg border">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50 border-b text-left">
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Unit</th>
                <th className="px-4 py-3 font-medium">Quantity</th>
                <th className="px-4 py-3 font-medium">Min Stock</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) =>
                typeof formMode === 'object' && formMode.id === item.id ? (
                  <tr key={item.id}>
                    <td colSpan={6} className="px-4 py-3">
                      <InventoryForm
                        initial={{
                          name: item.name,
                          unit: item.unit as InventoryUnit,
                          quantity: item.quantity,
                          minStock: item.minStock,
                        }}
                        onSave={(data) =>
                          updateItem.mutate(
                            { id: item.id, data: data as UpdateInventoryItemDto },
                            { onSuccess: () => setFormMode('none') },
                          )
                        }
                        onCancel={() => setFormMode('none')}
                      />
                    </td>
                  </tr>
                ) : (
                  <tr
                    key={item.id}
                    className={
                      item.lowStock
                        ? 'bg-warning/5 border-b last:border-0'
                        : 'border-b last:border-0'
                    }
                  >
                    <td className="px-4 py-3 font-medium">
                      {item.lowStock && (
                        <AlertTriangle className="mb-0.5 mr-1.5 inline h-3.5 w-3.5 text-warning" />
                      )}
                      {item.name}
                    </td>
                    <td className="text-muted-foreground px-4 py-3">{item.unit}</td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => setAdjustingItem(item)}
                        className={
                          'rounded px-1.5 py-0.5 font-mono text-sm transition-colors hover:bg-accent' +
                          (item.lowStock ? ' text-warning' : '')
                        }
                        title="Click to adjust quantity"
                      >
                        {item.quantity}
                      </button>
                    </td>
                    <td className="text-muted-foreground px-4 py-3">{item.minStock}</td>
                    <td className="px-4 py-3">
                      <StatusBadge lowStock={item.lowStock} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
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
                    </td>
                  </tr>
                ),
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Adjust quantity dialog */}
      {adjustingItem && (
        <AdjustDialog
          item={adjustingItem}
          onSave={(data) =>
            adjustItem.mutate(
              { id: adjustingItem.id, data },
              { onSuccess: () => setAdjustingItem(null) },
            )
          }
          onClose={() => setAdjustingItem(null)}
        />
      )}
    </div>
  );
}
