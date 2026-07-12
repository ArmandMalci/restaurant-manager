import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useState, useMemo } from 'react';
import {
  Plus,
  Pencil,
  Trash2,
  Users,
  X,
  LayoutGrid,
  Map as MapIcon,
  MoreVertical,
  Settings,
} from 'lucide-react';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/ui/page-header';
import { StatusBadge } from '@/components/ui/status';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import { useSectionControllerGetAll } from '@/api/sections/sections';
import { useReservationControllerGetAll } from '@/api/reservations/reservations';
import type { TableStatus } from '@restaurant/shared';
import type {
  TableDto,
  TableDtoShape,
  ReservationDto,
  SectionDto,
} from '@/api/restaurantManagerAPI.schemas';
import {
  FloorMap,
  STATUS_LABELS,
  STATUS_TONE,
  NEXT_STATUS,
  reservationTimeLabel,
} from './-floor-map';
import type { PositionOverride } from './-floor-map';
import { TableActionSheet } from './-table-action-sheet';
import { TableOrderModal } from './-order-modal';
import { ManageSectionsModal } from './-manage-sections-modal';
import { DeleteDialog } from './-delete-dialog';

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export const Route = createFileRoute('/_app/floor/')({
  component: TablesPage,
  validateSearch: (search: Record<string, unknown>): { tableId?: string; panel?: string } => ({
    tableId: typeof search.tableId === 'string' ? search.tableId : undefined,
    panel: typeof search.panel === 'string' ? search.panel : undefined,
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
  sections: SectionDto[];
  defaultSectionId: string;
  onSave: (data: { number: number; seats: number; status: TableStatus; sectionId: string }) => void;
  onClose: () => void;
  title: string;
}

function TableFormDialog({
  initial,
  sections,
  defaultSectionId,
  onSave,
  onClose,
  title,
}: TableFormDialogProps) {
  const [number, setNumber] = useState(initial?.number ?? 1);
  const [seats, setSeats] = useState(initial?.seats ?? 2);
  const [status, setStatus] = useState<TableStatus>(
    (initial?.status as TableStatus) ?? 'available',
  );
  const [sectionId, setSectionId] = useState(initial?.sectionId ?? defaultSectionId);

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
            onSave({ number, seats, status, sectionId });
          }}
          className="space-y-4"
        >
          <div className="space-y-1.5">
            <label htmlFor="table-section" className="text-sm font-medium text-foreground">
              Section
            </label>
            <Select value={sectionId} onValueChange={(v) => setSectionId(v as string)}>
              <SelectTrigger id="table-section" className="w-full">
                <SelectValue placeholder="Select section…" />
              </SelectTrigger>
              <SelectContent>
                {sections.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

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
  onOpenActions: (table: TableDto) => void;
  reservation?: ReservationDto;
}

function TableCard({
  table,
  onEdit,
  onDelete,
  onCycleStatus,
  onTableClick,
  onOpenActions,
  reservation,
}: TableCardProps) {
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
        {/* Hover actions — "⋯" opens the status/reservation/delete action sheet (secondary
            surface now that the main tap starts/continues an order, see Plan 17 Task 3);
            Edit/Delete stay as direct quick-management shortcuts, unchanged. */}
        <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={(e) => {
              e.stopPropagation();
              onOpenActions(table);
            }}
            aria-label="Table actions"
            title="Status, reservation & delete"
          >
            <MoreVertical />
          </Button>
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
          {reservation && (
            <p className="mt-1 max-w-full truncate px-2 text-xs text-warning">
              {reservation.guestName} · {reservationTimeLabel(reservation.date)} ·{' '}
              {reservation.partySize}p
            </p>
          )}
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
  const { data: sections = [] } = useSectionControllerGetAll();
  const createTable = useTableControllerCreate();
  const updateTable = useTableControllerUpdate();
  const deleteTable = useTableControllerRemove();
  const setStatus = useTableControllerSetStatus();
  const saveLayout = useTableControllerSaveLayout();

  // Soonest upcoming `booked` reservation per table, for surfacing guest/time context on
  // reserved tiles — client-side join, no backend change (see Plan 15 Task 3).
  const { data: todaysReservations = [] } = useReservationControllerGetAll({ date: todayStr() });
  const reservationByTable = useMemo(() => {
    const map = new Map<string, ReservationDto>();
    const upcoming = todaysReservations
      .filter((r) => r.status === 'booked')
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    for (const r of upcoming) {
      if (!map.has(r.tableId)) map.set(r.tableId, r);
    }

    return map;
  }, [todaysReservations]);

  // Section tabs — additive to the map/grid view-toggle, not a replacement (see Plan 17
  // Task 2). Tables per section, for the "Manage sections" delete guard tooltip too.
  const sortedSections = useMemo(
    () => [...sections].sort((a, b) => a.sortOrder - b.sortOrder),
    [sections],
  );
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null);
  const effectiveSectionId = activeSectionId ?? sortedSections[0]?.id ?? null;
  const filteredTables = effectiveSectionId
    ? tables.filter((t) => t.sectionId === effectiveSectionId)
    : tables;
  const tableCountBySection = useMemo(() => {
    const map = new Map<string, number>();

    for (const t of tables) {
      map.set(t.sectionId, (map.get(t.sectionId) ?? 0) + 1);
    }

    return map;
  }, [tables]);
  const [manageSectionsOpen, setManageSectionsOpen] = useState(false);

  // Determine default view: map if any table has posX set
  const hasMapData = useMemo(() => tables.some((t) => t.posX != null), [tables]);
  const [viewMode, setViewMode] = useState<ViewMode | null>(null);
  const effectiveView: ViewMode = viewMode ?? (hasMapData ? 'map' : 'grid');

  // Edit-layout state
  const [editMode, setEditMode] = useState(false);
  const [positions, setPositions] = useState<Record<string, PositionOverride>>({});
  const [draggingId, setDraggingId] = useState<string | null>(null);

  const available = filteredTables.filter((t) => t.status === 'available').length;
  const occupied = filteredTables.filter((t) => t.status === 'occupied').length;
  const reserved = filteredTables.filter((t) => t.status === 'reserved').length;

  // Primary tap now hands off directly to the order builder (modal, anchored to this table)
  // instead of the action sheet — ordering is the far more frequent action (see Plan 17
  // Task 3). `panel` discriminates which URL-modal shows for the shared `tableId` key.
  function handleTableClick(table: TableDto) {
    if (!editMode) {
      navigate({ to: '.', search: (prev) => ({ ...prev, tableId: table.id, panel: 'order' }) });
    }
  }

  // Secondary "⋯" / long-press affordance — status/reservation/delete, demoted from the
  // primary tap (see Plan 17 Task 3).
  function handleOpenActions(table: TableDto) {
    navigate({ to: '.', search: (prev) => ({ ...prev, tableId: table.id, panel: 'actions' }) });
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
          subtitle={`${filteredTables.length} table${filteredTables.length !== 1 ? 's' : ''}`}
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

        {/* Section tabs — additive to the map/grid view-toggle above, not a replacement. */}
        {sortedSections.length > 0 && (
          <div className="flex items-center justify-between gap-2">
            <Tabs
              value={effectiveSectionId ?? undefined}
              onValueChange={(v) => setActiveSectionId(v as string)}
            >
              <TabsList>
                {sortedSections.map((section) => (
                  <TabsTrigger key={section.id} value={section.id}>
                    {section.name}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setManageSectionsOpen(true)}
              aria-label="Manage sections"
              title="Manage sections"
            >
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* Summary counts */}
        {filteredTables.length > 0 && (
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
        ) : filteredTables.length === 0 ? (
          <EmptyState
            icon={LayoutGrid}
            title="No tables in this section"
            description="Add a table to this section, or switch to another tab."
          />
        ) : effectiveView === 'map' ? (
          <FloorMap
            tables={filteredTables}
            onTableClick={handleTableClick}
            onOpenActions={handleOpenActions}
            editMode={editMode}
            positions={positions}
            onDrop={handleDrop}
            onDragStart={setDraggingId}
            draggingId={draggingId}
            onShapeToggle={handleShapeToggle}
            reservationByTable={reservationByTable}
          />
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {filteredTables.map((table) => (
              <TableCard
                key={table.id}
                table={table}
                onEdit={() => setModal({ type: 'edit', table })}
                onDelete={() => setModal({ type: 'delete', table })}
                onTableClick={handleTableClick}
                onOpenActions={handleOpenActions}
                reservation={reservationByTable.get(table.id)}
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

      {/* Action sheet (secondary — status/reservation/delete) and order builder (primary
          tap hand-off) — both URL-driven off the shared `tableId` + a `panel` discriminator. */}
      <TableActionSheet tables={tables} />
      <TableOrderModal />

      <ManageSectionsModal
        open={manageSectionsOpen}
        onOpenChange={setManageSectionsOpen}
        sections={sortedSections}
        tableCountBySection={tableCountBySection}
      />

      {/* Dialogs */}
      {modal.type === 'create' && (
        <TableFormDialog
          title="Add Table"
          sections={sortedSections}
          defaultSectionId={effectiveSectionId ?? ''}
          onSave={(data) => {
            createTable.mutate(
              {
                // Default posX/posY so the new table is visible on the map right
                // away — without this, FloorMap only renders `placed` tables and
                // the new one is invisible until someone drags it in via Edit
                // layout. Stagger by current section's table count so sequential adds
                // don't all land on the exact same spot (still just a starting
                // point — Edit layout remains the real placement tool).
                data: {
                  ...data,
                  posX: 8 + ((filteredTables.length * 14) % 84),
                  posY: 12,
                  shape: 'square',
                },
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
          sections={sortedSections}
          defaultSectionId={modal.table.sectionId}
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
