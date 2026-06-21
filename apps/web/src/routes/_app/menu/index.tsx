import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { Plus, Pencil, Trash2, LayoutGrid } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { Dialog } from '@base-ui/react/dialog';
import { cn } from '@/lib/utils';
import {
  useMenuControllerGetCategories,
  useMenuControllerCreateCategory,
  useMenuControllerUpdateCategory,
  useMenuControllerRemoveCategory,
  useMenuControllerGetItems,
  useMenuControllerCreateItem,
  useMenuControllerUpdateItem,
  useMenuControllerRemoveItem,
  useMenuControllerSetAvailability,
  invalidateMenuControllerGetCategories,
  invalidateMenuControllerGetItems,
} from '@/api/menu/menu';
import type { MenuCategory, MenuItem } from '@restaurant/shared';
import type { MenuItemDto } from '@/api/restaurantManagerAPI.schemas';

export const Route = createFileRoute('/_app/menu/')({
  component: MenuPage,
});

const field =
  'bg-background ring-ring/50 w-full rounded-md border px-3 py-1.5 text-sm outline-none focus-visible:ring-2';

const btnBase = 'rounded-md px-4 py-1.5 text-sm font-medium transition-colors';
const btnPrimary = `${btnBase} bg-primary text-primary-foreground hover:bg-primary/90`;
const btnOutline = `${btnBase} border hover:bg-muted`;
const btnDestructive = `${btnBase} bg-destructive text-destructive-foreground hover:bg-destructive/90`;

// ── Modal shell ────────────────────────────────────────────────────────
function Modal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={(v) => !v && onClose()}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" />
        <Dialog.Popup className="fixed left-1/2 top-1/2 z-50 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-lg border border-border bg-card p-6 shadow-lg">
          <Dialog.Title className="mb-4 text-base font-semibold text-foreground">
            {title}
          </Dialog.Title>
          {children}
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

// ── Sheet (right-side) ─────────────────────────────────────────────────
function Sheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={(v) => !v && onClose()}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" />
        <Dialog.Popup className="fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col border-l border-border bg-card shadow-xl">
          <div className="flex items-center justify-between border-b border-border px-6 py-4">
            <Dialog.Title className="text-base font-semibold text-foreground">{title}</Dialog.Title>
            <button
              type="button"
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              ✕
            </button>
          </div>
          {children}
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

// ── Category dialog ────────────────────────────────────────────────────
function CategoryDialog({
  open,
  onClose,
  initial,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  initial?: Partial<MenuCategory>;
  onSave: (name: string, sortOrder: number) => void;
}) {
  const [name, setName] = useState(initial?.name ?? '');
  const [sortOrder, setSortOrder] = useState(initial?.sortOrder ?? 0);

  return (
    <Modal open={open} onClose={onClose} title={initial ? 'Edit Category' : 'Add Category'}>
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          onSave(name, sortOrder);
        }}
      >
        <div className="space-y-1">
          <label htmlFor="cat-name" className="text-xs font-medium text-muted-foreground">
            Name
          </label>
          <input
            id="cat-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className={field}
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="cat-sort" className="text-xs font-medium text-muted-foreground">
            Sort order
          </label>
          <input
            id="cat-sort"
            type="number"
            min={0}
            value={sortOrder}
            onChange={(e) => setSortOrder(Number(e.target.value))}
            className={field}
          />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className={btnOutline}>
            Cancel
          </button>
          <button type="submit" className={btnPrimary}>
            Save
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ── Delete dialog ──────────────────────────────────────────────────────
function DeleteDialog({
  open,
  onClose,
  label,
  onConfirm,
}: {
  open: boolean;
  onClose: () => void;
  label: string;
  onConfirm: () => void;
}) {
  return (
    <Modal open={open} onClose={onClose} title="Confirm delete">
      <p className="mb-6 text-sm text-muted-foreground">
        Delete <span className="font-medium text-foreground">&ldquo;{label}&rdquo;</span>? This
        cannot be undone.
      </p>
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onClose} className={btnOutline}>
          Cancel
        </button>
        <button
          type="button"
          onClick={() => {
            onConfirm();
            onClose();
          }}
          className={btnDestructive}
        >
          Delete
        </button>
      </div>
    </Modal>
  );
}

// ── Item drawer ────────────────────────────────────────────────────────
function ItemSheet({
  open,
  onClose,
  categories,
  initial,
  defaultCategoryId,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  categories: MenuCategory[];
  initial?: Partial<MenuItem> | Partial<MenuItemDto>;
  defaultCategoryId?: string;
  onSave: (data: {
    name: string;
    description: string | null;
    price: number;
    categoryId: string;
    available: boolean;
  }) => void;
}) {
  const [name, setName] = useState(initial?.name ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [price, setPrice] = useState(String(initial?.price ?? ''));
  const [categoryId, setCategoryId] = useState(
    initial?.categoryId ?? defaultCategoryId ?? categories[0]?.id ?? '',
  );
  const [available, setAvailable] = useState(initial?.available ?? true);

  return (
    <Sheet open={open} onClose={onClose} title={initial ? 'Edit Item' : 'Add Item'}>
      <form
        className="flex flex-1 flex-col gap-4 overflow-y-auto px-6 py-4"
        onSubmit={(e) => {
          e.preventDefault();
          onSave({
            name,
            description: description || null,
            price: Number(price),
            categoryId,
            available,
          });
        }}
      >
        <div className="space-y-1">
          <label htmlFor="item-name" className="text-xs font-medium text-muted-foreground">
            Name
          </label>
          <input
            id="item-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className={field}
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="item-category" className="text-xs font-medium text-muted-foreground">
            Category
          </label>
          <select
            id="item-category"
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            required
            className={field}
          >
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label htmlFor="item-price" className="text-xs font-medium text-muted-foreground">
            Price (€)
          </label>
          <input
            id="item-price"
            type="number"
            step="0.01"
            min="0"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            required
            className={field}
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="item-desc" className="text-xs font-medium text-muted-foreground">
            Description
          </label>
          <input
            id="item-desc"
            value={description ?? ''}
            onChange={(e) => setDescription(e.target.value)}
            className={field}
          />
        </div>
        <label className="flex cursor-pointer items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={available}
            onChange={(e) => setAvailable(e.target.checked)}
            className="rounded border"
          />
          Available
        </label>
        <div className="mt-auto flex justify-end gap-2 pt-4">
          <button type="button" onClick={onClose} className={btnOutline}>
            Cancel
          </button>
          <button type="submit" className={btnPrimary}>
            Save
          </button>
        </div>
      </form>
    </Sheet>
  );
}

// ── Item card ──────────────────────────────────────────────────────────
function ItemCard({
  item,
  onEdit,
  onDelete,
  onToggle,
}: {
  item: MenuItem | MenuItemDto;
  onEdit: () => void;
  onDelete: () => void;
  onToggle: () => void;
}) {
  return (
    <div className="flex flex-col rounded-lg border border-border bg-card p-4 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-2 mb-1">
        <h3 className="font-semibold text-foreground leading-tight line-clamp-2">{item.name}</h3>
        <span className="shrink-0 text-accent font-medium text-sm">
          €{Number(item.price).toFixed(2)}
        </span>
      </div>
      {item.description && (
        <p className="text-muted-foreground text-xs line-clamp-2 mb-2">{item.description}</p>
      )}
      <div className="mt-auto flex items-center justify-between pt-3 border-t border-border">
        <button
          type="button"
          onClick={onToggle}
          className={cn(
            'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors',
            item.available ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground',
          )}
        >
          <span
            className={cn(
              'h-1.5 w-1.5 rounded-full',
              item.available ? 'bg-success' : 'bg-muted-foreground',
            )}
          />
          {item.available ? 'Available' : 'Unavailable'}
        </button>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onEdit}
            title="Edit"
            className="flex h-7 w-7 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={onDelete}
            title="Delete"
            className="flex h-7 w-7 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-destructive transition-colors"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────
function MenuPage() {
  const [selectedCatId, setSelectedCatId] = useState<string | undefined>();
  const [catDialog, setCatDialog] = useState<{ open: boolean; cat?: MenuCategory }>({
    open: false,
  });
  const [itemSheet, setItemSheet] = useState<{ open: boolean; item?: MenuItem | MenuItemDto }>({
    open: false,
  });
  const [deleteTarget, setDeleteTarget] = useState<{
    kind: 'category' | 'item';
    id: string;
    name: string;
  } | null>(null);

  const qc = useQueryClient();

  const { data: categories = [], isLoading: loadingCats } = useMenuControllerGetCategories();
  const { data: allItems = [] } = useMenuControllerGetItems(undefined);
  const { data: items = [], isLoading: loadingItems } = useMenuControllerGetItems(
    selectedCatId ? { categoryId: selectedCatId } : undefined,
  );

  const countByCat = allItems.reduce<Record<string, number>>((acc, i) => {
    acc[i.categoryId] = (acc[i.categoryId] ?? 0) + 1;

    return acc;
  }, {});

  const createCat = useMenuControllerCreateCategory({
    mutation: { onSuccess: () => invalidateMenuControllerGetCategories(qc) },
  });
  const updateCat = useMenuControllerUpdateCategory({
    mutation: { onSuccess: () => invalidateMenuControllerGetCategories(qc) },
  });
  const deleteCat = useMenuControllerRemoveCategory({
    mutation: {
      onSuccess: () => {
        invalidateMenuControllerGetCategories(qc);
        if (deleteTarget?.id === selectedCatId) setSelectedCatId(undefined);
      },
    },
  });
  const createItem = useMenuControllerCreateItem({
    mutation: {
      onSuccess: () => {
        invalidateMenuControllerGetItems(qc);
        setItemSheet({ open: false });
      },
    },
  });
  const updateItem = useMenuControllerUpdateItem({
    mutation: {
      onSuccess: () => {
        invalidateMenuControllerGetItems(qc);
        setItemSheet({ open: false });
      },
    },
  });
  const deleteItem = useMenuControllerRemoveItem({
    mutation: { onSuccess: () => invalidateMenuControllerGetItems(qc) },
  });
  const toggleAvail = useMenuControllerSetAvailability({
    mutation: { onSuccess: () => invalidateMenuControllerGetItems(qc) },
  });

  const selectedCat = categories.find((c) => c.id === selectedCatId);

  return (
    <div className="flex gap-6">
      {/* ── Categories sidebar ───────────────────────────────── */}
      <aside className="w-60 shrink-0 flex flex-col rounded-lg border border-border bg-card self-start sticky top-0">
        <div className="px-4 py-4 border-b border-border">
          <h2 className="text-sm font-semibold text-foreground">Categories</h2>
        </div>
        <div className="flex-1 overflow-y-auto px-2 py-2 space-y-0.5">
          <button
            type="button"
            onClick={() => setSelectedCatId(undefined)}
            className={cn(
              'flex w-full items-center justify-between px-3 py-2 rounded-md text-sm transition-colors',
              !selectedCatId
                ? 'bg-accent/10 text-accent border-l-2 border-accent font-medium'
                : 'text-foreground hover:bg-muted',
            )}
          >
            <span>All items</span>
            <span className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
              {allItems.length}
            </span>
          </button>
          {loadingCats ? (
            <p className="px-3 py-2 text-xs text-muted-foreground">Loading…</p>
          ) : (
            categories.map((cat) => (
              <div key={cat.id} className="group relative">
                <button
                  type="button"
                  onClick={() => setSelectedCatId(cat.id)}
                  className={cn(
                    'flex w-full items-center justify-between px-3 py-2 rounded-md text-sm transition-colors',
                    selectedCatId === cat.id
                      ? 'bg-accent/10 text-accent border-l-2 border-accent font-medium'
                      : 'text-foreground hover:bg-muted',
                  )}
                >
                  <span className="truncate">{cat.name}</span>
                  <span className="ml-2 shrink-0 rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                    {countByCat[cat.id] ?? 0}
                  </span>
                </button>
                <div className="absolute right-2 top-1/2 -translate-y-1/2 hidden group-hover:flex items-center gap-1">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setCatDialog({ open: true, cat });
                    }}
                    className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground"
                  >
                    <Pencil className="h-3 w-3" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteTarget({ kind: 'category', id: cat.id, name: cat.name });
                    }}
                    className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-destructive"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
        <div className="px-3 py-3 border-t border-border">
          <button
            type="button"
            onClick={() => setCatDialog({ open: true })}
            className="flex w-full items-center justify-center gap-2 rounded-md border border-dashed border-border py-2 text-sm text-muted-foreground hover:border-foreground hover:text-foreground transition-colors"
          >
            <Plus className="h-4 w-4" /> Add Category
          </button>
        </div>
      </aside>

      {/* ── Items grid ────────────────────────────────────────── */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <LayoutGrid className="h-5 w-5 text-muted-foreground" />
            <h1 className="text-xl font-semibold text-foreground">
              {selectedCat ? selectedCat.name : 'All Items'}
            </h1>
            <span className="text-sm text-muted-foreground">({items.length})</span>
          </div>
          <button
            type="button"
            onClick={() => setItemSheet({ open: true })}
            disabled={categories.length === 0}
            className={cn(btnPrimary, 'flex items-center gap-2 disabled:opacity-50')}
          >
            <Plus className="h-4 w-4" /> Add Item
          </button>
        </div>

        {loadingItems ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <LayoutGrid className="mb-3 h-10 w-10 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">No items yet.</p>
            {categories.length > 0 && (
              <button
                type="button"
                onClick={() => setItemSheet({ open: true })}
                className="mt-3 text-sm text-accent underline-offset-4 hover:underline"
              >
                Add the first item
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {items.map((item) => (
              <ItemCard
                key={item.id}
                item={item}
                onEdit={() => setItemSheet({ open: true, item })}
                onDelete={() => setDeleteTarget({ kind: 'item', id: item.id, name: item.name })}
                onToggle={() =>
                  toggleAvail.mutate({ id: item.id, data: { available: !item.available } })
                }
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Overlays ──────────────────────────────────────────── */}
      <CategoryDialog
        key={catDialog.open ? (catDialog.cat?.id ?? 'new-cat') : 'closed-cat'}
        open={catDialog.open}
        onClose={() => setCatDialog((s) => ({ ...s, open: false }))}
        initial={catDialog.cat}
        onSave={(name, sortOrder) => {
          if (catDialog.cat) {
            updateCat.mutate(
              { id: catDialog.cat.id, data: { name, sortOrder } },
              { onSuccess: () => setCatDialog({ open: false }) },
            );
          } else {
            createCat.mutate(
              { data: { name, sortOrder } },
              { onSuccess: () => setCatDialog({ open: false }) },
            );
          }
        }}
      />
      <ItemSheet
        key={itemSheet.open ? (itemSheet.item?.id ?? 'new-item') : 'closed-item'}
        open={itemSheet.open}
        onClose={() => setItemSheet((s) => ({ ...s, open: false }))}
        categories={categories}
        initial={itemSheet.item}
        defaultCategoryId={selectedCatId}
        onSave={(data) => {
          if (itemSheet.item) updateItem.mutate({ id: itemSheet.item.id, data });
          else createItem.mutate({ data });
        }}
      />
      <DeleteDialog
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        label={deleteTarget?.name ?? ''}
        onConfirm={() => {
          if (!deleteTarget) return;
          if (deleteTarget.kind === 'category') deleteCat.mutate({ id: deleteTarget.id });
          else deleteItem.mutate({ id: deleteTarget.id });
          setDeleteTarget(null);
        }}
      />
    </div>
  );
}
