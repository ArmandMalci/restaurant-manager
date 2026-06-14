import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { Plus, Pencil, Trash2, Eye, EyeOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  useCategories,
  useCreateCategory,
  useUpdateCategory,
  useDeleteCategory,
  useItems,
  useCreateItem,
  useUpdateItem,
  useDeleteItem,
  useToggleAvailability,
} from '@/lib/menu-api';
import type { MenuCategory, MenuItem } from '@restaurant/shared';

export const Route = createFileRoute('/_app/menu/')({
  component: MenuPage,
});

// ── Helpers ───────────────────────────────────────────────────────────

function useConfirm() {
  return (msg: string) => window.confirm(msg);
}

// ── Category form ─────────────────────────────────────────────────────

function CategoryForm({
  initial,
  onSave,
  onCancel,
}: {
  initial?: Partial<MenuCategory>;
  onSave: (name: string, sortOrder: number) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? '');
  const [sortOrder, setSortOrder] = useState(initial?.sortOrder ?? 0);

  return (
    <form
      className="flex items-end gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        onSave(name, sortOrder);
      }}
    >
      <div className="flex-1 space-y-1">
        <label className="text-xs font-medium text-muted-foreground">Name</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          className="w-full rounded-md border bg-background px-3 py-1.5 text-sm outline-none focus-visible:ring-2 ring-ring/50"
        />
      </div>
      <div className="w-24 space-y-1">
        <label className="text-xs font-medium text-muted-foreground">Order</label>
        <input
          type="number"
          min={0}
          value={sortOrder}
          onChange={(e) => setSortOrder(Number(e.target.value))}
          className="w-full rounded-md border bg-background px-3 py-1.5 text-sm outline-none focus-visible:ring-2 ring-ring/50"
        />
      </div>
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
    </form>
  );
}

// ── Item form ─────────────────────────────────────────────────────────

function ItemForm({
  categories,
  initial,
  onSave,
  onCancel,
}: {
  categories: MenuCategory[];
  initial?: Partial<MenuItem>;
  onSave: (data: {
    name: string;
    description: string | null;
    price: number;
    categoryId: string;
    available: boolean;
  }) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [price, setPrice] = useState(String(initial?.price ?? ''));
  const [categoryId, setCategoryId] = useState(initial?.categoryId ?? categories[0]?.id ?? '');
  const [available, setAvailable] = useState(initial?.available ?? true);

  return (
    <form
      className="grid grid-cols-2 gap-3"
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
        <label className="text-xs font-medium text-muted-foreground">Name</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          className="w-full rounded-md border bg-background px-3 py-1.5 text-sm outline-none focus-visible:ring-2 ring-ring/50"
        />
      </div>
      <div className="space-y-1">
        <label className="text-xs font-medium text-muted-foreground">Category</label>
        <select
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          required
          className="w-full rounded-md border bg-background px-3 py-1.5 text-sm outline-none focus-visible:ring-2 ring-ring/50"
        >
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-1">
        <label className="text-xs font-medium text-muted-foreground">Price (€)</label>
        <input
          type="number"
          step="0.01"
          min="0"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          required
          className="w-full rounded-md border bg-background px-3 py-1.5 text-sm outline-none focus-visible:ring-2 ring-ring/50"
        />
      </div>
      <div className="space-y-1">
        <label className="text-xs font-medium text-muted-foreground">Description</label>
        <input
          value={description ?? ''}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full rounded-md border bg-background px-3 py-1.5 text-sm outline-none focus-visible:ring-2 ring-ring/50"
        />
      </div>
      <div className="col-span-2 flex items-center gap-2">
        <input
          type="checkbox"
          id="available"
          checked={available}
          onChange={(e) => setAvailable(e.target.checked)}
          className="rounded border"
        />
        <label htmlFor="available" className="text-sm">
          Available
        </label>
      </div>
      <div className="col-span-2 flex gap-2">
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

// ── Main page ─────────────────────────────────────────────────────────

function MenuPage() {
  const confirm = useConfirm();
  const [selectedCatId, setSelectedCatId] = useState<string | undefined>();
  const [catFormMode, setCatFormMode] = useState<'none' | 'create' | { id: string }>('none');
  const [itemFormMode, setItemFormMode] = useState<'none' | 'create' | { id: string }>('none');

  const { data: categories = [], isLoading: loadingCats } = useCategories();
  const { data: items = [], isLoading: loadingItems } = useItems(selectedCatId);

  const createCat = useCreateCategory();
  const updateCat = useUpdateCategory();
  const deleteCat = useDeleteCategory();
  const createItem = useCreateItem();
  const updateItem = useUpdateItem();
  const deleteItem = useDeleteItem();
  const toggleAvail = useToggleAvailability();

  const editItem =
    itemFormMode !== 'none' && itemFormMode !== 'create'
      ? items.find((i) => i.id === itemFormMode.id)
      : undefined;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Menu</h1>

      {/* Categories panel */}
      <section className="rounded-lg border p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Categories</h2>
          <button
            onClick={() => setCatFormMode('create')}
            className="flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm hover:bg-accent transition-colors"
          >
            <Plus className="h-3.5 w-3.5" /> Add
          </button>
        </div>

        {catFormMode === 'create' && (
          <CategoryForm
            onSave={(name, sortOrder) => {
              createCat.mutate({ name, sortOrder }, { onSuccess: () => setCatFormMode('none') });
            }}
            onCancel={() => setCatFormMode('none')}
          />
        )}

        {loadingCats ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {categories.map((cat) => (
              <div key={cat.id}>
                {typeof catFormMode === 'object' && catFormMode.id === cat.id ? (
                  <CategoryForm
                    initial={cat}
                    onSave={(name, sortOrder) => {
                      updateCat.mutate(
                        { id: cat.id, dto: { name, sortOrder } },
                        { onSuccess: () => setCatFormMode('none') },
                      );
                    }}
                    onCancel={() => setCatFormMode('none')}
                  />
                ) : (
                  <div
                    className={cn(
                      'flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm cursor-pointer select-none transition-colors',
                      selectedCatId === cat.id
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'hover:bg-accent',
                    )}
                    onClick={() => setSelectedCatId(selectedCatId === cat.id ? undefined : cat.id)}
                  >
                    {cat.name}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setCatFormMode({ id: cat.id });
                      }}
                      className="hover:opacity-70 transition-opacity"
                    >
                      <Pencil className="h-3 w-3" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm(`Delete "${cat.name}"?`)) deleteCat.mutate(cat.id);
                      }}
                      className="hover:opacity-70 transition-opacity"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Items panel */}
      <section className="rounded-lg border p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">
            Items
            {selectedCatId && categories.find((c) => c.id === selectedCatId)
              ? ` — ${categories.find((c) => c.id === selectedCatId)!.name}`
              : ' (all)'}
          </h2>
          <button
            onClick={() => setItemFormMode('create')}
            disabled={categories.length === 0}
            className="flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm hover:bg-accent disabled:opacity-50 transition-colors"
          >
            <Plus className="h-3.5 w-3.5" /> Add item
          </button>
        </div>

        {itemFormMode === 'create' && (
          <ItemForm
            categories={
              selectedCatId ? [categories.find((c) => c.id === selectedCatId)!] : categories
            }
            onSave={(data) => {
              createItem.mutate(data, { onSuccess: () => setItemFormMode('none') });
            }}
            onCancel={() => setItemFormMode('none')}
          />
        )}

        {loadingItems ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-muted-foreground">No items yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="pb-2 font-medium">Name</th>
                <th className="pb-2 font-medium">Description</th>
                <th className="pb-2 font-medium text-right">Price</th>
                <th className="pb-2 font-medium text-center">Available</th>
                <th className="pb-2" />
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-b last:border-0">
                  {typeof itemFormMode === 'object' && itemFormMode.id === item.id ? (
                    <td colSpan={5} className="py-3">
                      <ItemForm
                        categories={categories}
                        initial={editItem}
                        onSave={(data) => {
                          updateItem.mutate(
                            { id: item.id, dto: data },
                            { onSuccess: () => setItemFormMode('none') },
                          );
                        }}
                        onCancel={() => setItemFormMode('none')}
                      />
                    </td>
                  ) : (
                    <>
                      <td className="py-2 font-medium">{item.name}</td>
                      <td className="py-2 text-muted-foreground">{item.description ?? '—'}</td>
                      <td className="py-2 text-right">€{Number(item.price).toFixed(2)}</td>
                      <td className="py-2 text-center">
                        <button
                          onClick={() =>
                            toggleAvail.mutate({ id: item.id, available: !item.available })
                          }
                          className={cn(
                            'transition-colors',
                            item.available ? 'text-green-600' : 'text-muted-foreground',
                          )}
                        >
                          {item.available ? (
                            <Eye className="h-4 w-4 inline" />
                          ) : (
                            <EyeOff className="h-4 w-4 inline" />
                          )}
                        </button>
                      </td>
                      <td className="py-2">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => setItemFormMode({ id: item.id })}
                            className="hover:text-foreground text-muted-foreground transition-colors"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`Delete "${item.name}"?`)) deleteItem.mutate(item.id);
                            }}
                            className="hover:text-destructive text-muted-foreground transition-colors"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
