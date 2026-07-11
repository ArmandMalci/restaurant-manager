import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useState, useMemo } from 'react';
import { Plus, Pencil, Trash2, Users, X, LayoutGrid, Map as MapIcon } from 'lucide-react';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
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
import { useQueryClient } from '@tanstack/react-query';
import {
  useTableControllerGetAll,
  useTableControllerCreate,
  useTableControllerUpdate,
  useTableControllerRemove,
  useTableControllerSetStatus,
  useTableControllerSaveLayout,
  invalidateTableControllerGetAll,
} from '@/api/tables/tables';
import type { TableStatus } from '@restaurant/shared';
import type { TableDto, TableDtoShape } from '@/api/restaurantManagerAPI.schemas';
import { FloorMap, STATUS_LABELS, STATUS_TONE, NEXT_STATUS } from './-floor-map';
import type { PositionOverride } from './-floor-map';
import { TableActionSheet } from './-table-action-sheet';
import { DeleteDialog } from './-delete-dialog';

export const Route = createFileRoute('/_app/floor/')({
  component: TablesPage,
  validateSearch: (search: Record<string, unknown>): { tableId?: string } => ({
    tableId: typeof search.tableId === 'string' ? search.tableId : undefined,
  }),
});

// ── Dialog primitives ────────────────────────────────────────────────────

function DialogOverlay({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
      onClick={onClose}
      aria-hidden="true"
    />
  );
}

function DialogPanel({ children }: { children: React.ReactNode }) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-lg bg-card border border-border shadow-lg p-6"
    >
      {children}
    </div>
  );
}

// ── Table form dialog ────────────────────────────────────────────────────

interface TableFormDialogProps {
  initial?: Partial<TableDto>;
  onSave: (data: { number: number; seats: number; status: TableStatus }) => void;
  onClose: () => void;
  title: string;
}

function TableFormDialog({ initial, onSave, onClose, title }: TableFormDialogProps) {
  const [number, setNumber] = useState(initial?.number ?? 1);
  const [seats, setSeats] = useState(initial?.seats ?? 2);
  const [status, setStatus] = useState<TableStatus>(
    (initial?.status as TableStatus) ?? 'available',
  );

  return (
    <>
      <DialogOverlay onClose={onClose} />
      <DialogPanel>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-foreground">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSave({ number, seats, status });
          }}
          className="space-y-4"
        >
          <div className="space-y-1.5">
            <label htmlFor="table-number" className="text-sm font-medium text-foreground">
              Table number
            </label>
            <input
              id="table-number"
              type="number"
              min={1}
              value={number}
              onChange={(e) => setNumber(Number(e.target.value))}
              required
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="table-seats" className="text-sm font-medium text-foreground">
              Seats
            </label>
            <input
              id="table-seats"
              type="number"
              min={1}
              value={seats}
              onChange={(e) => setSeats(Number(e.target.value))}
              required
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="table-status" className="text-sm font-medium text-foreground">
              Status
            </label>
            <Select value={status} onValueChange={(v) => setStatus(v as TableStatus)}>
              <SelectTrigger id="table-status" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="available">Available</SelectItem>
                <SelectItem value="occupied">Occupied</SelectItem>
                <SelectItem value="reserved">Reserved</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:bg-accent/90 transition-colors"
            >
              Save
            </button>
          </div>
        </form>
      </DialogPanel>
    </>
  );
}

// ── Table card (grid view) ────────────────────────────────────────────────

interface TableCardProps {
  table: TableDto;
  onEdit: () => void;
  onDelete: () => void;
  onCycleStatus: () => void;
  onTableClick: (table: TableDto) => void;
}

function TableCard({ table, onEdit, onDelete, onCycleStatus, onTableClick }: TableCardProps) {
  const statusKey = table.status as TableStatus;

  return (
    <>
      {/* biome-ignore lint/a11y/useSemanticElements: nests its own buttons, can't be a real <button>; tabIndex + onKeyDown provide keyboard access */}
      <div
        className="group relative flex flex-col overflow-hidden rounded-lg bg-card border border-border shadow-sm hover:border-accent/40 hover:shadow-md transition-all duration-200 cursor-pointer"
        onClick={() => onTableClick(table)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onTableClick(table);
          }
        }}
        role="button"
        tabIndex={0}
        aria-label={`Table ${table.number}`}
      >
        {/* Hover actions */}
        <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
            aria-label="Edit table"
          >
            <Pencil />
          </Button>
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            aria-label="Delete table"
            className="hover:text-destructive"
          >
            <Trash2 />
          </Button>
        </div>

        {/* Card body */}
        <div className="flex flex-1 flex-col items-center justify-center px-4 py-5 text-center">
          <p className="text-lg font-semibold text-foreground">T{table.number}</p>
          <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
            <Users className="h-3 w-3" />
            {table.seats} seats
          </p>
        </div>

        {/* Status — single StatusBadge, clickable to cycle */}
        <div className="border-t border-border px-3 py-2 flex justify-center">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onCycleStatus();
            }}
            title={`Switch to ${STATUS_LABELS[NEXT_STATUS[statusKey]]}`}
            className="rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <StatusBadge tone={STATUS_TONE[statusKey]} label={STATUS_LABELS[statusKey]} />
          </button>
        </div>
      </div>
    </>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────

type ModalState =
  | { type: 'none' }
  | { type: 'create' }
  | { type: 'edit'; table: TableDto }
  | { type: 'delete'; table: TableDto };

type ViewMode = 'map' | 'grid';

function TablesPage() {
  const [modal, setModal] = useState<ModalState>({ type: 'none' });
  const qc = useQueryClient();
  const navigate = useNavigate();

  const { data: tables = [], isLoading } = useTableControllerGetAll();
  const createTable = useTableControllerCreate();
  const updateTable = useTableControllerUpdate();
  const deleteTable = useTableControllerRemove();
  const setStatus = useTableControllerSetStatus();
  const saveLayout = useTableControllerSaveLayout();

  // Determine default view: map if any table has posX set
  const hasMapData = useMemo(() => tables.some((t) => t.posX != null), [tables]);
  const [viewMode, setViewMode] = useState<ViewMode | null>(null);
  const effectiveView: ViewMode = viewMode ?? (hasMapData ? 'map' : 'grid');

  // Edit-layout state
  const [editMode, setEditMode] = useState(false);
  const [positions, setPositions] = useState<Record<string, PositionOverride>>({});
  const [draggingId, setDraggingId] = useState<string | null>(null);

  const available = tables.filter((t) => t.status === 'available').length;
  const occupied = tables.filter((t) => t.status === 'occupied').length;
  const reserved = tables.filter((t) => t.status === 'reserved').length;

  // Action sheet is URL-driven (`?tableId=`) — TableActionSheet reads it itself.
  function handleTableClick(table: TableDto) {
    if (!editMode) {
      navigate({ to: '.', search: (prev) => ({ ...prev, tableId: table.id }) });
    }
  }

  function handleEnterEditMode() {
    // Snapshot current server positions as local state
    const snap: Record<string, PositionOverride> = {};

    for (const t of tables) {
      if (t.posX != null && t.posY != null) {
        snap[t.id] = { posX: t.posX, posY: t.posY, shape: t.shape as TableDtoShape };
      }
    }
    setPositions(snap);
    setEditMode(true);
  }

  function handleCancelEdit() {
    setPositions({});
    setDraggingId(null);
    setEditMode(false);
  }

  function handleDrop(tableId: string, posX: number, posY: number) {
    setPositions((prev) => {
      const existing = prev[tableId];
      const shape: TableDtoShape =
        existing?.shape ??
        (tables.find((t) => t.id === tableId)?.shape as TableDtoShape) ??
        'square';

      return { ...prev, [tableId]: { posX, posY, shape } };
    });
    setDraggingId(null);
  }

  function handleShapeToggle(tableId: string) {
    setPositions((prev) => {
      const existing = prev[tableId];

      if (!existing) return prev;

      return {
        ...prev,
        [tableId]: {
          ...existing,
          shape: existing.shape === 'round' ? 'square' : 'round',
        },
      };
    });
  }

  function handleSaveLayout() {
    const items = Object.entries(positions).map(([id, pos]) => ({
      id,
      posX: pos.posX,
      posY: pos.posY,
      shape: pos.shape,
    }));

    saveLayout.mutate(
      { data: { tables: items } },
      {
        onSuccess: () => {
          invalidateTableControllerGetAll(qc);
          setPositions({});
          setEditMode(false);
        },
      },
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <Skeleton className="h-7 w-24" />
            <Skeleton className="h-4 w-20" />
          </div>
          <Skeleton className="h-8 w-28 rounded-lg" />
        </div>
        <div className="flex gap-2">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-6 w-24 rounded-md" />
          ))}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
            <Skeleton key={i} className="h-28 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="space-y-6">
        <PageHeader
          title="Floor"
          subtitle={`${tables.length} table${tables.length !== 1 ? 's' : ''}`}
          className="flex-col items-stretch sm:flex-row sm:items-start"
          action={
            editMode ? (
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="rounded-md border border-border px-3 py-1.5 text-sm font-medium text-foreground hover:bg-muted transition-colors"
                >
                  Cancel
                </button>
                <Button onClick={handleSaveLayout} disabled={saveLayout.isPending}>
                  {saveLayout.isPending ? 'Saving…' : 'Save layout'}
                </Button>
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-2">
                {/* View toggle — secondary/muted selected state; bg-accent is reserved
                    for the single primary CTA (Add table) per the one-accent-CTA rule. */}
                <div className="flex rounded-md border border-border overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setViewMode('map')}
                    className={
                      effectiveView === 'map'
                        ? 'px-2.5 py-1.5 bg-muted text-foreground transition-colors'
                        : 'px-2.5 py-1.5 text-muted-foreground hover:bg-muted transition-colors'
                    }
                    aria-label="Map view"
                    title="Map view"
                  >
                    <MapIcon className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('grid')}
                    className={
                      effectiveView === 'grid'
                        ? 'px-2.5 py-1.5 bg-muted text-foreground transition-colors'
                        : 'px-2.5 py-1.5 text-muted-foreground hover:bg-muted transition-colors'
                    }
                    aria-label="Grid view"
                    title="Grid view"
                  >
                    <LayoutGrid className="h-4 w-4" />
                  </button>
                </div>

                {effectiveView === 'map' && (
                  <button
                    type="button"
                    onClick={handleEnterEditMode}
                    className="rounded-md border border-border px-3 py-1.5 text-sm font-medium text-foreground hover:bg-muted transition-colors"
                  >
                    Edit layout
                  </button>
                )}

                <Button onClick={() => setModal({ type: 'create' })}>
                  <Plus />
                  Add table
                </Button>
              </div>
            )
          }
        />

        {/* Summary counts */}
        {tables.length > 0 && (
          <div className="flex flex-wrap gap-2">
            <StatusBadge tone="success" label={`Available ${available}`} />
            <StatusBadge tone="info" label={`Occupied ${occupied}`} />
            <StatusBadge tone="warning" label={`Reserved ${reserved}`} />
          </div>
        )}

        {/* Content */}
        {tables.length === 0 ? (
          <EmptyState
            icon={LayoutGrid}
            title="No tables yet"
            description="Add your first table to start tracking status and capacity."
          />
        ) : effectiveView === 'map' ? (
          <FloorMap
            tables={tables}
            onTableClick={handleTableClick}
            editMode={editMode}
            positions={positions}
            onDrop={handleDrop}
            onDragStart={setDraggingId}
            draggingId={draggingId}
            onShapeToggle={handleShapeToggle}
          />
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {tables.map((table) => (
              <TableCard
                key={table.id}
                table={table}
                onEdit={() => setModal({ type: 'edit', table })}
                onDelete={() => setModal({ type: 'delete', table })}
                onTableClick={handleTableClick}
                onCycleStatus={() =>
                  setStatus.mutate(
                    { id: table.id, data: { status: NEXT_STATUS[table.status as TableStatus] } },
                    { onSuccess: () => invalidateTableControllerGetAll(qc) },
                  )
                }
              />
            ))}
          </div>
        )}
      </div>

      {/* Action sheet */}
      <TableActionSheet tables={tables} />

      {/* Dialogs */}
      {modal.type === 'create' && (
        <TableFormDialog
          title="Add Table"
          onSave={(data) => {
            createTable.mutate(
              {
                // Default posX/posY so the new table is visible on the map right
                // away — without this, FloorMap only renders `placed` tables and
                // the new one is invisible until someone drags it in via Edit
                // layout. Stagger by current table count so sequential adds
                // don't all land on the exact same spot (still just a starting
                // point — Edit layout remains the real placement tool).
                data: { ...data, posX: 8 + ((tables.length * 14) % 84), posY: 12, shape: 'square' },
              },
              {
                onSuccess: () => {
                  invalidateTableControllerGetAll(qc);
                  setModal({ type: 'none' });
                },
              },
            );
          }}
          onClose={() => setModal({ type: 'none' })}
        />
      )}

      {modal.type === 'edit' && (
        <TableFormDialog
          title={`Edit Table ${modal.table.number}`}
          initial={modal.table}
          onSave={(dto) => {
            updateTable.mutate(
              { id: modal.table.id, data: dto },
              {
                onSuccess: () => {
                  invalidateTableControllerGetAll(qc);
                  setModal({ type: 'none' });
                },
              },
            );
          }}
          onClose={() => setModal({ type: 'none' })}
        />
      )}

      {modal.type === 'delete' && (
        <DeleteDialog
          tableNumber={modal.table.number}
          onConfirm={() => {
            deleteTable.mutate(
              { id: modal.table.id },
              {
                onSuccess: () => {
                  invalidateTableControllerGetAll(qc);
                  setModal({ type: 'none' });
                },
              },
            );
          }}
          onClose={() => setModal({ type: 'none' })}
        />
      )}
    </div>
  );
}
