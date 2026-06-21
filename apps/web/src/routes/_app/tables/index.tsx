import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { Plus, Pencil, Trash2, Users, X, LayoutGrid } from 'lucide-react';
import { EmptyState } from '@/components/ui/empty-state';
import { useQueryClient } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
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

export const Route = createFileRoute('/_app/tables/')({
  component: TablesPage,
});

// ── Constants ────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<TableStatus, string> = {
  available: 'Available',
  occupied: 'Occupied',
  reserved: 'Reserved',
};

const STATUS_CLASSES: Record<TableStatus, string> = {
  available: 'bg-success/10 text-success',
  occupied: 'bg-destructive/10 text-destructive',
  reserved: 'bg-warning/10 text-warning-foreground',
};

const STATUS_DOT: Record<TableStatus, string> = {
  available: 'bg-success',
  occupied: 'bg-destructive',
  reserved: 'bg-warning',
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
  return (
    <div
      className={cn(
        'group relative flex flex-col overflow-hidden rounded-lg bg-card border border-border shadow-sm',
        'hover:border-accent/40 hover:shadow-md transition-all duration-200',
        table.status === 'occupied' && 'border-l-4 border-l-destructive/60',
        table.status === 'reserved' && 'border-l-4 border-l-warning/60',
      )}
    >
      {/* Hover actions */}
      <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
        <button
          type="button"
          onClick={onEdit}
          aria-label="Edit table"
          className="flex h-7 w-7 items-center justify-center rounded-full border border-border bg-card/90 text-muted-foreground shadow-sm hover:text-foreground hover:bg-muted transition-colors"
        >
          <Pencil className="h-3 w-3" />
        </button>
        <button
          type="button"
          onClick={onDelete}
          aria-label="Delete table"
          className="flex h-7 w-7 items-center justify-center rounded-full border border-border bg-card/90 text-muted-foreground shadow-sm hover:text-destructive transition-colors"
        >
          <Trash2 className="h-3 w-3" />
        </button>
      </div>

      {/* Card body */}
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-8 text-center">
        <p className="text-4xl font-bold text-foreground">T{table.number}</p>
        <p className="mt-1.5 flex items-center gap-1.5 text-sm text-muted-foreground">
          <Users className="h-3.5 w-3.5" />
          {table.seats} seats
        </p>
      </div>

      {/* Status footer */}
      <div className="border-t border-border bg-muted/30 p-3">
        <button
          type="button"
          onClick={onCycleStatus}
          className={cn(
            'flex w-full items-center justify-center gap-2 rounded-md py-1.5 px-3 text-xs font-medium transition-colors hover:opacity-80',
            STATUS_CLASSES[table.status as TableStatus],
          )}
          title={`Switch to ${STATUS_LABELS[NEXT_STATUS[table.status as TableStatus]]}`}
        >
          <span className={cn('h-2 w-2 rounded-full', STATUS_DOT[table.status as TableStatus])} />
          {STATUS_LABELS[table.status as TableStatus]}
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
      <div className="flex items-center justify-center p-12">
        <p className="text-sm text-muted-foreground">Loading tables…</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Tables</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {tables.length} table{tables.length !== 1 ? 's' : ''} total
          </p>
        </div>
        <button
          type="button"
          onClick={() => setModal({ type: 'create' })}
          className="flex items-center gap-1.5 rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:bg-accent/90 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Add Table
        </button>
      </div>

      {/* Stats bar */}
      {tables.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-success/10 px-3 py-1 text-xs font-medium text-success">
            <span className="h-1.5 w-1.5 rounded-full bg-success" />
            Available {available}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-destructive/10 px-3 py-1 text-xs font-medium text-destructive">
            <span className="h-1.5 w-1.5 rounded-full bg-destructive" />
            Occupied {occupied}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-warning/10 px-3 py-1 text-xs font-medium text-warning-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-warning" />
            Reserved {reserved}
          </span>
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
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
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
