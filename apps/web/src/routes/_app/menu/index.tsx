import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { Plus, Pencil, Trash2, LayoutGrid, ChevronDown } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { Dialog } from '@base-ui/react/dialog';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/ui/page-header';
import { StatusBadge } from '@/components/ui/status';
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
  useMenuControllerGetModifierGroups,
  useMenuControllerCreateModifierGroup,
  useMenuControllerUpdateModifierGroup,
  useMenuControllerRemoveModifierGroup,
  invalidateMenuControllerGetCategories,
  invalidateMenuControllerGetItems,
  invalidateMenuControllerGetModifierGroups,
} from '@/api/menu/menu';
import type { MenuCategory, MenuItem } from '@restaurant/shared';
import type {
  MenuItemDto,
  ModifierGroupDto,
  CreateModifierGroupDto,
  UpdateModifierGroupDto,
  UpdateMenuItemDtoStation,
  CreateMenuItemDtoStation,
} from '@/api/restaurantManagerAPI.schemas';

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

// ── Modifier option row ────────────────────────────────────────────────
interface OptionRow {
  uid: number;
  name: string;
  priceDelta: string;
}

let optionUidCounter = 0;

function nextOptionUid() {
  optionUidCounter += 1;

  return optionUidCounter;
}

function OptionRowInput({
  row,
  index,
  onChange,
  onRemove,
}: {
  row: OptionRow;
  index: number;
  onChange: (index: number, field: 'name' | 'priceDelta', value: string) => void;
  onRemove: (index: number) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <input
        value={row.name}
        onChange={(e) => onChange(index, 'name', e.target.value)}
        placeholder="Option name"
        required
        className={cn(field, 'flex-1')}
      />
      <input
        type="number"
        step="0.01"
        value={row.priceDelta}
        onChange={(e) => onChange(index, 'priceDelta', e.target.value)}
        placeholder="Δ€"
        className={cn(field, 'w-20')}
      />
      <button
        type="button"
        onClick={() => onRemove(index)}
        className="shrink-0 text-muted-foreground hover:text-destructive transition-colors"
        aria-label="Remove option"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

// ── Modifier group editor sheet ────────────────────────────────────────
function ModifierGroupSheet({
  open,
  onClose,
  initial,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  initial?: ModifierGroupDto;
  onSave: (data: CreateModifierGroupDto | UpdateModifierGroupDto) => void;
}) {
  const [name, setName] = useState(initial?.name ?? '');
  const [selectionType, setSelectionType] = useState<'single' | 'multi'>(
    (initial?.selectionType as 'single' | 'multi') ?? 'single',
  );
  const [required, setRequired] = useState(initial?.required ?? false);
  const [options, setOptions] = useState<OptionRow[]>(
    initial?.options.map((o) => ({
      uid: nextOptionUid(),
      name: o.name,
      priceDelta: String(o.priceDelta),
    })) ?? [],
  );

  function handleOptionChange(index: number, key: 'name' | 'priceDelta', value: string) {
    setOptions((prev) => prev.map((r, i) => (i === index ? { ...r, [key]: value } : r)));
  }

  function handleOptionRemove(index: number) {
    setOptions((prev) => prev.filter((_, i) => i !== index));
  }

  function handleAddOption() {
    setOptions((prev) => [...prev, { uid: nextOptionUid(), name: '', priceDelta: '0' }]);
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={initial ? 'Edit modifier group' : 'New modifier group'}
    >
      <form
        className="flex flex-1 flex-col gap-4 overflow-y-auto px-6 py-4"
        onSubmit={(e) => {
          e.preventDefault();
          onSave({
            name,
            selectionType,
            required,
            options: options.map((o, i) => ({
              name: o.name,
              priceDelta: Number(o.priceDelta),
              sortOrder: i,
            })),
          });
        }}
      >
        <div className="space-y-1">
          <label htmlFor="mg-name" className="text-xs font-medium text-muted-foreground">
            Name
          </label>
          <input
            id="mg-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className={field}
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="mg-type" className="text-xs font-medium text-muted-foreground">
            Selection type
          </label>
          <select
            id="mg-type"
            value={selectionType}
            onChange={(e) => setSelectionType(e.target.value as 'single' | 'multi')}
            className={field}
          >
            <option value="single">Single choice</option>
            <option value="multi">Multiple choice</option>
          </select>
        </div>
        <label className="flex cursor-pointer items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={required}
            onChange={(e) => setRequired(e.target.checked)}
            className="rounded border"
          />
          Required
        </label>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Options</span>
            <button
              type="button"
              onClick={handleAddOption}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <Plus className="h-3 w-3" /> Add option
            </button>
          </div>
          {options.length === 0 && (
            <p className="text-xs text-muted-foreground">No options yet. Add one above.</p>
          )}
          {options.map((row, i) => (
            <OptionRowInput
              key={row.uid}
              row={row}
              index={i}
              onChange={handleOptionChange}
              onRemove={handleOptionRemove}
            />
          ))}
        </div>
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

// ── Modifier groups list ───────────────────────────────────────────────
function ModifiersTab({
  onEdit,
  onDelete,
}: {
  onEdit: (group: ModifierGroupDto) => void;
  onDelete: (group: ModifierGroupDto) => void;
}) {
  const { data: groups = [], isLoading } = useMenuControllerGetModifierGroups();

  if (isLoading) {
    return (
      <div className="space-y-2 mt-4">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-12 w-full rounded-md" />
        ))}
      </div>
    );
  }

  if (groups.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <ChevronDown className="mb-3 h-10 w-10 text-muted-foreground/40" />
        <p className="text-sm text-muted-foreground">No modifier groups yet.</p>
      </div>
    );
  }

  return (
    <div className="mt-4 space-y-2">
      {groups.map((group) => (
        <div
          key={group.id}
          className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3"
        >
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-medium text-foreground">{group.name}</span>
            <div className="flex items-center gap-1.5">
              <span className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground capitalize">
                {group.selectionType}
              </span>
              {group.required && (
                <span className="rounded bg-primary/10 px-1.5 py-0.5 text-xs text-primary">
                  Required
                </span>
              )}
              <span className="text-xs text-muted-foreground">
                {group.options.length} option{group.options.length !== 1 ? 's' : ''}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-0.5">
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => onEdit(group)}
              title="Edit modifier group"
              aria-label="Edit modifier group"
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => onDelete(group)}
              title="Delete modifier group"
              aria-label="Delete modifier group"
              className="text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      ))}
    </div>
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
    station: string | null;
    modifierGroupIds: string[];
  }) => void;
}) {
  const [name, setName] = useState(initial?.name ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [price, setPrice] = useState(String(initial?.price ?? ''));
  const [categoryId, setCategoryId] = useState(
    initial?.categoryId ?? defaultCategoryId ?? categories[0]?.id ?? '',
  );
  const [available, setAvailable] = useState(initial?.available ?? true);
  const [station, setStation] = useState<string>((initial as Partial<MenuItemDto>)?.station ?? '');
  const [modifierGroupIds, setModifierGroupIds] = useState<string[]>(
    (initial as Partial<MenuItemDto>)?.modifierGroupIds ?? [],
  );

  const { data: groups = [] } = useMenuControllerGetModifierGroups();

  function toggleGroup(id: string) {
    setModifierGroupIds((prev) =>
      prev.includes(id) ? prev.filter((g) => g !== id) : [...prev, id],
    );
  }

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
            station: station || null,
            modifierGroupIds,
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
        <div className="space-y-1">
          <label htmlFor="item-station" className="text-xs font-medium text-muted-foreground">
            Station
          </label>
          <select
            id="item-station"
            value={station}
            onChange={(e) => setStation(e.target.value)}
            className={field}
          >
            <option value="">None</option>
            <option value="grill">Grill</option>
            <option value="cold">Cold</option>
            <option value="bar">Bar</option>
            <option value="pass">Pass</option>
          </select>
        </div>
        {groups.length > 0 && (
          <div className="space-y-1.5">
            <span className="text-xs font-medium text-muted-foreground">Modifier groups</span>
            <div className="space-y-1 rounded-md border border-border p-2">
              {groups.map((g) => (
                <label key={g.id} className="flex cursor-pointer items-center gap-2 text-sm py-0.5">
                  <input
                    type="checkbox"
                    checked={modifierGroupIds.includes(g.id)}
                    onChange={() => toggleGroup(g.id)}
                    className="rounded border"
                  />
                  <span className="text-foreground">{g.name}</span>
                  <span className="ml-auto text-xs text-muted-foreground capitalize">
                    {g.selectionType}
                  </span>
                </label>
              ))}
            </div>
          </div>
        )}
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
    <div className="flex flex-col rounded-lg border border-border bg-card p-3 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-2 mb-1">
        <h3 className="font-semibold text-foreground leading-tight line-clamp-2 text-sm">
          {item.name}
        </h3>
        <span className="shrink-0 text-foreground font-medium text-sm">
          €{Number(item.price).toFixed(2)}
        </span>
      </div>
      {item.description && (
        <p className="text-muted-foreground text-xs line-clamp-2 mb-2">{item.description}</p>
      )}
      <div className="mt-auto flex items-center justify-between pt-2 border-t border-border">
        <div className="flex items-center gap-1.5">
          {!item.available && <StatusBadge tone="destructive" label="86'd" />}
          <button
            type="button"
            onClick={onToggle}
            title={item.available ? 'Mark unavailable' : 'Mark available'}
            className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <span
              className={cn(
                'h-1.5 w-1.5 rounded-full',
                item.available ? 'bg-success' : 'bg-muted-foreground',
              )}
            />
            {item.available ? 'Available' : 'Unavailable'}
          </button>
        </div>
        <div className="flex items-center gap-0.5">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onEdit}
            title="Edit"
            aria-label="Edit item"
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onDelete}
            title="Delete"
            aria-label="Delete item"
            className="text-muted-foreground hover:text-destructive"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────
function MenuPage() {
  const [activeTab, setActiveTab] = useState<'items' | 'modifiers'>('items');
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
  const [mgSheet, setMgSheet] = useState<{ open: boolean; group?: ModifierGroupDto }>({
    open: false,
  });
  const [mgDeleteTarget, setMgDeleteTarget] = useState<ModifierGroupDto | null>(null);

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

  const createMg = useMenuControllerCreateModifierGroup({
    mutation: {
      onSuccess: () => {
        invalidateMenuControllerGetModifierGroups(qc);
        setMgSheet({ open: false });
      },
    },
  });
  const updateMg = useMenuControllerUpdateModifierGroup({
    mutation: {
      onSuccess: () => {
        invalidateMenuControllerGetModifierGroups(qc);
        setMgSheet({ open: false });
      },
    },
  });
  const deleteMg = useMenuControllerRemoveModifierGroup({
    mutation: { onSuccess: () => invalidateMenuControllerGetModifierGroups(qc) },
  });

  const selectedCat = categories.find((c) => c.id === selectedCatId);

  return (
    <div className="flex flex-col gap-0 p-6">
      {/* ── Page header ───────────────────────────────────────── */}
      <PageHeader
        title="Menu"
        subtitle={
          activeTab === 'items'
            ? `${selectedCat?.name ?? 'All items'} · ${allItems.length} item${allItems.length !== 1 ? 's' : ''}`
            : 'Modifier groups'
        }
        action={
          activeTab === 'items' ? (
            <Button onClick={() => setItemSheet({ open: true })} disabled={categories.length === 0}>
              <Plus className="h-4 w-4" />
              Add item
            </Button>
          ) : (
            <Button onClick={() => setMgSheet({ open: true })}>
              <Plus className="h-4 w-4" />
              New group
            </Button>
          )
        }
      />

      {/* ── Tabs ─────────────────────────────────────────────── */}
      <div className="mb-4 flex gap-1 border-b border-border">
        <button
          type="button"
          onClick={() => setActiveTab('items')}
          className={cn(
            'px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px',
            activeTab === 'items'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground',
          )}
        >
          Items
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('modifiers')}
          className={cn(
            'px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px',
            activeTab === 'modifiers'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground',
          )}
        >
          Modifiers
        </button>
      </div>

      {/* ── Items tab ────────────────────────────────────────── */}
      {activeTab === 'items' && (
        <div className="flex flex-col gap-6 lg:flex-row">
          {/* ── Categories sidebar ────────────────────────────── */}
          <aside className="w-full lg:w-56 shrink-0 flex flex-col rounded-lg border border-border bg-card self-start lg:sticky lg:top-6">
            <div className="px-4 py-3 border-b border-border">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Categories
              </h2>
            </div>
            <div className="flex-1 overflow-y-auto px-2 py-2 space-y-0.5">
              <button
                type="button"
                onClick={() => setSelectedCatId(undefined)}
                className={cn(
                  'flex w-full items-center justify-between px-3 py-2 rounded-md text-sm transition-colors',
                  !selectedCatId
                    ? 'bg-primary/10 text-primary font-medium'
                    : 'text-foreground hover:bg-muted',
                )}
              >
                <span>All items</span>
                <span className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                  {allItems.length}
                </span>
              </button>
              {loadingCats ? (
                <div className="space-y-1 px-1 py-1">
                  {[0, 1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-8 w-full rounded-md" />
                  ))}
                </div>
              ) : (
                categories.map((cat) => (
                  <div key={cat.id} className="group relative">
                    <button
                      type="button"
                      onClick={() => setSelectedCatId(cat.id)}
                      className={cn(
                        'flex w-full items-center justify-between px-3 py-2 rounded-md text-sm transition-colors',
                        selectedCatId === cat.id
                          ? 'bg-primary/10 text-primary font-medium'
                          : 'text-foreground hover:bg-muted',
                      )}
                    >
                      <span className="truncate pr-10">{cat.name}</span>
                      <span className="ml-2 shrink-0 rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                        {countByCat[cat.id] ?? 0}
                      </span>
                    </button>
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 hidden group-hover:flex items-center gap-0.5">
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        onClick={(e) => {
                          e.stopPropagation();
                          setCatDialog({ open: true, cat });
                        }}
                        aria-label="Edit category"
                      >
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteTarget({ kind: 'category', id: cat.id, name: cat.name });
                        }}
                        aria-label="Delete category"
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
            <div className="px-3 py-3 border-t border-border">
              <button
                type="button"
                onClick={() => setCatDialog({ open: true })}
                className="flex w-full items-center justify-center gap-2 rounded-md border border-dashed border-border py-2 text-xs text-muted-foreground hover:border-foreground hover:text-foreground transition-colors"
              >
                <Plus className="h-3.5 w-3.5" /> Add Category
              </button>
            </div>
          </aside>

          {/* ── Items grid ──────────────────────────────────────── */}
          <div className="flex-1 min-w-0">
            {loadingItems ? (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {[0, 1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-36 rounded-lg" />
                ))}
              </div>
            ) : items.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <LayoutGrid className="mb-3 h-10 w-10 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">No items yet.</p>
                {categories.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setItemSheet({ open: true })}
                    className="mt-3 text-sm text-muted-foreground underline-offset-4 hover:underline"
                  >
                    Add the first item
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
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
        </div>
      )}

      {/* ── Modifiers tab ────────────────────────────────────── */}
      {activeTab === 'modifiers' && (
        <ModifiersTab
          onEdit={(group) => setMgSheet({ open: true, group })}
          onDelete={(group) => setMgDeleteTarget(group)}
        />
      )}

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
          const { station, modifierGroupIds, ...rest } = data;
          const stationVal = station || undefined;

          if (itemSheet.item) {
            updateItem.mutate({
              id: itemSheet.item.id,
              data: {
                ...rest,
                station: stationVal as UpdateMenuItemDtoStation | undefined,
                modifierGroupIds,
              },
            });
          } else {
            createItem.mutate({
              data: { ...rest, station: stationVal as CreateMenuItemDtoStation | undefined },
            });
          }
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
      <ModifierGroupSheet
        key={mgSheet.open ? (mgSheet.group?.id ?? 'new-mg') : 'closed-mg'}
        open={mgSheet.open}
        onClose={() => setMgSheet((s) => ({ ...s, open: false }))}
        initial={mgSheet.group}
        onSave={(data) => {
          if (mgSheet.group) {
            updateMg.mutate({ id: mgSheet.group.id, data });
          } else {
            createMg.mutate({ data: data as CreateModifierGroupDto });
          }
        }}
      />
      <DeleteDialog
        open={mgDeleteTarget !== null}
        onClose={() => setMgDeleteTarget(null)}
        label={mgDeleteTarget?.name ?? ''}
        onConfirm={() => {
          if (!mgDeleteTarget) return;
          deleteMg.mutate({ id: mgDeleteTarget.id });
          setMgDeleteTarget(null);
        }}
      />
    </div>
  );
}
