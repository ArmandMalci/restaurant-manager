import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, Search, Package } from 'lucide-react';
import { EmptyState } from '@/components/ui/empty-state';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/ui/page-header';
import { StatusBadge } from '@/components/ui/status';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table';
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
        <label htmlFor="item-unit" className="flex flex-col gap-1 text-sm font-medium">
          Unit *
          <Select value={unit} onValueChange={(v) => setUnit(v as InventoryUnit)}>
            <SelectTrigger id="item-unit" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {UNITS.map((u) => (
                <SelectItem key={u} value={u}>
                  {u.charAt(0).toUpperCase() + u.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
          <label htmlFor="adjust-reason" className="flex flex-col gap-1 text-sm font-medium">
            Reason
            <Select
              value={reason}
              onValueChange={(v) => setReason(v as AdjustInventoryDto['reason'])}
            >
              <SelectTrigger id="adjust-reason" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ADJUST_REASONS.map((r) => (
                  <SelectItem key={r} value={r}>
                    {r.charAt(0).toUpperCase() + r.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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

// ── Main page ─────────────────────────────────────────────────────────

function InventoryPage() {
  const [formMode, setFormMode] = useState<'none' | 'create' | { id: string }>('none');
  const [adjustingItem, setAdjustingItem] = useState<InventoryItemWithStatusDto | null>(null);
  const [deletingItem, setDeletingItem] = useState<InventoryItemWithStatusDto | null>(null);
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

  const filtered = search.trim()
    ? items.filter((i) => i.name.toLowerCase().includes(search.trim().toLowerCase()))
    : items;

  if (isLoading) return <div className="text-muted-foreground p-6 text-sm">Loading…</div>;

  return (
    <div className="space-y-4 p-6">
      <PageHeader
        title="Inventory"
        subtitle={
          <>
            {items.length} items
            {lowStockCount > 0 && (
              <span className="text-warning ml-2">· {lowStockCount} low stock</span>
            )}
          </>
        }
        action={
          <Button onClick={() => setFormMode('create')}>
            <Plus className="mr-1.5 h-4 w-4" />
            Add item
          </Button>
        }
      />

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
        // ponytail: overflow-x-auto over a card/stacked breakpoint layout — phone users can
        // swipe to reach Status/Actions instead of losing them off-screen; revisit with a
        // stacked layout if the column count grows.
        <div className="rounded-lg border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead className="pl-4">Item</TableHead>
                <TableHead>Stock</TableHead>
                <TableHead className="hidden sm:table-cell">Par</TableHead>
                <TableHead className="hidden sm:table-cell">Unit</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="pr-4 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((item) => {
                const isOut = item.quantity <= 0;
                const isLow = !isOut && item.lowStock;

                return typeof formMode === 'object' && formMode.id === item.id ? (
                  <TableRow key={item.id}>
                    <TableCell colSpan={6} className="px-4 py-3">
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
                    </TableCell>
                  </TableRow>
                ) : (
                  <TableRow key={item.id}>
                    <TableCell className="pl-4 font-medium">{item.name}</TableCell>
                    <TableCell>
                      <button
                        type="button"
                        onClick={() => setAdjustingItem(item)}
                        className="rounded px-1.5 py-0.5 font-mono text-sm transition-colors hover:bg-accent"
                        title="Click to adjust quantity"
                      >
                        {item.quantity}
                      </button>
                    </TableCell>
                    <TableCell className="text-muted-foreground hidden sm:table-cell">
                      {item.minStock}
                    </TableCell>
                    <TableCell className="text-muted-foreground hidden sm:table-cell">
                      {item.unit}
                    </TableCell>
                    <TableCell>
                      {isOut && <StatusBadge tone="destructive" label="Out of stock" />}
                      {isLow && <StatusBadge tone="warning" label="Low stock" />}
                    </TableCell>
                    <TableCell className="pr-4 text-right">
                      <div className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setFormMode({ id: item.id })}
                          aria-label="Edit"
                          className="hover:bg-accent rounded p-1.5 transition-colors"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeletingItem(item)}
                          aria-label="Delete"
                          className="text-destructive hover:bg-accent rounded p-1.5 transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
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

      {/* Delete confirmation */}
      <AlertDialog
        open={deletingItem != null}
        onOpenChange={(open) => !open && setDeletingItem(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete &ldquo;{deletingItem?.name}&rdquo;?</AlertDialogTitle>
            <AlertDialogDescription>This can&rsquo;t be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                if (!deletingItem) return;
                deleteItem.mutate({ id: deletingItem.id });
                setDeletingItem(null);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
