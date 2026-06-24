import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { Plus, Pencil, Trash2, Users, X, LayoutGrid } from 'lucide-react';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/ui/page-header';
import { StatusBadge } from '@/components/ui/status';
import type { Tone } from '@/components/ui/status';
import { useQueryClient } from '@tanstack/react-query';
import {
  useTableControllerGetAll,
  useTableControllerCreate,
  useTableControllerUpdate,
  useTableControllerRemove,
  useTableControllerSetStatus,
  invalidateTableControllerGetAll,
} from '@/api/tables/tables';
import type { TableStatus } from '@restaurant/shared';
import type { TableDto } from '@/api/restaurantManagerAPI.schemas';

export const Route = createFileRoute('/_app/floor/')({
  component: TablesPage,
});

// ── Constants ────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<TableStatus, string> = {
  available: 'Available',
  occupied: 'Occupied',
  reserved: 'Reserved',
};

const STATUS_TONE: Record<TableStatus, Tone> = {
  available: 'success',
  occupied: 'info',
  reserved: 'warning',
};

const NEXT_STATUS: Record<TableStatus, TableStatus> = {
  available: 'occupied',
  occupied: 'reserved',
  reserved: 'available',
};

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
            <select
              id="table-status"
              value={status}
              onChange={(e) => setStatus(e.target.value as TableStatus)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="available">Available</option>
              <option value="occupied">Occupied</option>
              <option value="reserved">Reserved</option>
            </select>
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

// ── Delete confirmation dialog ────────────────────────────────────────────

interface DeleteDialogProps {
  tableNumber: number;
  onConfirm: () => void;
  onClose: () => void;
}

function DeleteDialog({ tableNumber, onConfirm, onClose }: DeleteDialogProps) {
  return (
    <>
      <DialogOverlay onClose={onClose} />
      <DialogPanel>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-foreground">Delete Table {tableNumber}?</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className="text-sm text-muted-foreground mb-6">
          This action cannot be undone. Table {tableNumber} will be permanently removed.
        </p>
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="rounded-md bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground hover:bg-destructive/90 transition-colors"
          >
            Delete
          </button>
        </div>
      </DialogPanel>
    </>
  );
}

// ── Table card ────────────────────────────────────────────────────────────

interface TableCardProps {
  table: TableDto;
  onEdit: () => void;
  onDelete: () => void;
  onCycleStatus: () => void;
}

function TableCard({ table, onEdit, onDelete, onCycleStatus }: TableCardProps) {
  const statusKey = table.status as TableStatus;

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-lg bg-card border border-border shadow-sm hover:border-accent/40 hover:shadow-md transition-all duration-200">
      {/* Hover actions */}
      <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
        <Button variant="ghost" size="icon-xs" onClick={onEdit} aria-label="Edit table">
          <Pencil />
        </Button>
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={onDelete}
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
          onClick={onCycleStatus}
          title={`Switch to ${STATUS_LABELS[NEXT_STATUS[statusKey]]}`}
          className="rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <StatusBadge tone={STATUS_TONE[statusKey]} label={STATUS_LABELS[statusKey]} />
        </button>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────

type ModalState =
  | { type: 'none' }
  | { type: 'create' }
  | { type: 'edit'; table: TableDto }
  | { type: 'delete'; table: TableDto };

function TablesPage() {
  const [modal, setModal] = useState<ModalState>({ type: 'none' });
  const qc = useQueryClient();

  const { data: tables = [], isLoading } = useTableControllerGetAll();
  const createTable = useTableControllerCreate();
  const updateTable = useTableControllerUpdate();
  const deleteTable = useTableControllerRemove();
  const setStatus = useTableControllerSetStatus();

  const available = tables.filter((t) => t.status === 'available').length;
  const occupied = tables.filter((t) => t.status === 'occupied').length;
  const reserved = tables.filter((t) => t.status === 'reserved').length;

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div className="space-y-2">
            <Skeleton className="h-7 w-24" />
            <Skeleton className="h-4 w-20" />
          </div>
          <Skeleton className="h-8 w-28 rounded-lg" />
        </div>
        <div className="mb-4 flex gap-2">
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
      <PageHeader
        title="Floor"
        subtitle={`${tables.length} table${tables.length !== 1 ? 's' : ''}`}
        action={
          <Button onClick={() => setModal({ type: 'create' })}>
            <Plus />
            Add table
          </Button>
        }
      />

      {/* Summary counts */}
      {tables.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-2">
          <StatusBadge tone="success" label={`Available ${available}`} />
          <StatusBadge tone="info" label={`Occupied ${occupied}`} />
          <StatusBadge tone="warning" label={`Reserved ${reserved}`} />
        </div>
      )}

      {/* Grid */}
      {tables.length === 0 ? (
        <EmptyState
          icon={LayoutGrid}
          title="No tables yet"
          description="Add your first table to start tracking status and capacity."
        />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {tables.map((table) => (
            <TableCard
              key={table.id}
              table={table}
              onEdit={() => setModal({ type: 'edit', table })}
              onDelete={() => setModal({ type: 'delete', table })}
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

      {/* Dialogs */}
      {modal.type === 'create' && (
        <TableFormDialog
          title="Add Table"
          onSave={(data) => {
            createTable.mutate(
              { data },
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
