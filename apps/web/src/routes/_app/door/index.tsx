import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { Plus, Pencil, Trash2, Users, CalendarDays } from 'lucide-react';
import { EmptyState } from '@/components/ui/empty-state';
import { useQueryClient } from '@tanstack/react-query';
import {
  useReservationControllerGetAll,
  useReservationControllerCreate,
  useReservationControllerUpdate,
  useReservationControllerRemove,
  invalidateReservationControllerGetAll,
} from '@/api/reservations/reservations';
import { useTableControllerGetAll } from '@/api/tables/tables';
import type { ReservationDto } from '@/api/restaurantManagerAPI.schemas';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { PageHeader } from '@/components/ui/page-header';
import { ListRow } from '@/components/ui/list-row';
import { StatusBadge } from '@/components/ui/status';
import type { Tone } from '@/components/ui/status';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

export const Route = createFileRoute('/_app/door/')({
  component: ReservationsPage,
});

// ── Utilities ─────────────────────────────────────────────────────────

function toDatetimeLocal(d: string) {
  return new Date(d).toISOString().slice(0, 16);
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

type DerivedStatus = 'confirmed' | 'pending' | 'seated' | 'cancelled';

function deriveStatus(r: ReservationDto): DerivedStatus {
  const now = new Date();
  const dt = new Date(r.date);
  const isPast = dt < now && dt.toDateString() !== now.toDateString();

  if (isPast) return 'cancelled';
  if (!r.tableId) return 'pending';
  const diffMins = (dt.getTime() - now.getTime()) / 60_000;

  return diffMins < 30 && diffMins > -120 ? 'seated' : 'confirmed';
}

const STATUS_TONE: Record<DerivedStatus, Tone> = {
  confirmed: 'success',
  pending: 'warning',
  seated: 'info',
  cancelled: 'destructive',
};

const STATUS_LABELS: Record<DerivedStatus, string> = {
  confirmed: 'Confirmed',
  pending: 'Pending',
  seated: 'Seated',
  cancelled: 'Cancelled',
};

function initials(name: string) {
  return name
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase();
}

// ── Form ──────────────────────────────────────────────────────────────

interface SaveData {
  tableId: string;
  guestName: string;
  guestEmail: string | null;
  guestPhone: string | null;
  partySize: number;
  date: string;
  notes: string | null;
}

function ReservationForm({
  initial,
  onSave,
  onCancel,
}: {
  initial?: Partial<ReservationDto>;
  onSave: (d: SaveData) => void;
  onCancel: () => void;
}) {
  const { data: tables = [] } = useTableControllerGetAll();
  const [tableId, setTableId] = useState(initial?.tableId ?? '');
  const [guestName, setGuestName] = useState(initial?.guestName ?? '');
  const [guestEmail, setGuestEmail] = useState(initial?.guestEmail ?? '');
  const [guestPhone, setGuestPhone] = useState(initial?.guestPhone ?? '');
  const [partySize, setPartySize] = useState(initial?.partySize ?? 2);
  const [datetime, setDatetime] = useState(initial?.date ? toDatetimeLocal(initial.date) : '');
  const [notes, setNotes] = useState(initial?.notes ?? '');

  const field = 'flex flex-col gap-1';
  const input =
    'focus-visible:ring-ring w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2';

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSave({
          tableId,
          guestName,
          guestEmail: guestEmail || null,
          guestPhone: guestPhone || null,
          partySize,
          date: datetime,
          notes: notes || null,
        });
      }}
      className="flex flex-col gap-4 p-4"
    >
      <div className={field}>
        <label htmlFor="res-guest-name" className="text-sm font-medium">
          Guest name *
        </label>
        <input
          id="res-guest-name"
          value={guestName}
          onChange={(e) => setGuestName(e.target.value)}
          required
          placeholder="Full name"
          className={input}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className={field}>
          <label htmlFor="res-party-size" className="text-sm font-medium">
            Party size *
          </label>
          <input
            id="res-party-size"
            type="number"
            min={1}
            value={partySize}
            onChange={(e) => setPartySize(Number(e.target.value))}
            required
            className={input}
          />
        </div>
        <div className={field}>
          <label htmlFor="res-table" className="text-sm font-medium">
            Table
          </label>
          <select
            id="res-table"
            value={tableId}
            onChange={(e) => setTableId(e.target.value)}
            required
            className={input}
          >
            <option value="">Select table…</option>
            {tables.map((t) => (
              <option key={t.id} value={t.id}>
                Table {t.number} ({t.seats} seats)
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className={field}>
        <label htmlFor="res-datetime" className="text-sm font-medium">
          Date &amp; time *
        </label>
        <input
          id="res-datetime"
          type="datetime-local"
          value={datetime}
          onChange={(e) => setDatetime(e.target.value)}
          required
          className={input}
        />
      </div>
      <div className={field}>
        <label htmlFor="res-email" className="text-sm font-medium">
          Email
        </label>
        <input
          id="res-email"
          type="email"
          value={guestEmail}
          onChange={(e) => setGuestEmail(e.target.value)}
          placeholder="guest@example.com"
          className={input}
        />
      </div>
      <div className={field}>
        <label htmlFor="res-phone" className="text-sm font-medium">
          Phone
        </label>
        <input
          id="res-phone"
          value={guestPhone}
          onChange={(e) => setGuestPhone(e.target.value)}
          placeholder="+1 555 000 0000"
          className={input}
        />
      </div>
      <div className={field}>
        <label htmlFor="res-notes" className="text-sm font-medium">
          Notes
        </label>
        <input
          id="res-notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Optional notes…"
          className={input}
        />
      </div>
      <div className="flex gap-2 pt-2">
        <Button type="submit" className="flex-1">
          Save reservation
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

// ── List view ─────────────────────────────────────────────────────────

function ReservationList({
  reservations,
  tables,
  onEdit,
  onDelete,
  emptyTitle,
  emptyDescription,
}: {
  reservations: ReservationDto[];
  tables: Array<{ id: string; number: number }>;
  onEdit: (r: ReservationDto) => void;
  onDelete: (r: ReservationDto) => void;
  emptyTitle?: string;
  emptyDescription?: string;
}) {
  if (reservations.length === 0) {
    return (
      <EmptyState
        icon={CalendarDays}
        title={emptyTitle ?? 'No reservations found'}
        description={emptyDescription ?? 'Create a new reservation to get started.'}
      />
    );
  }

  return (
    <div className="rounded-lg border bg-card">
      {reservations.map((r) => {
        const status = deriveStatus(r);
        const table = tables.find((t) => t.id === r.tableId);
        const tableLabel = table ? `Table ${table.number}` : 'Unassigned';
        const contactLine = [r.guestEmail, r.guestPhone, r.notes].filter(Boolean).join(' · ');
        const dateLine = new Date(r.date).toLocaleString([], {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        });

        return (
          <ListRow
            key={r.id}
            leading={
              <Avatar>
                <AvatarFallback>{initials(r.guestName)}</AvatarFallback>
              </Avatar>
            }
            title={
              <span className="flex items-center gap-2">
                <span className="truncate">{r.guestName}</span>
                <span className="shrink-0 sm:hidden">
                  <StatusBadge tone={STATUS_TONE[status]} label={STATUS_LABELS[status]} />
                </span>
              </span>
            }
            subtitle={
              <span className="flex items-center gap-2">
                {/* Phone: name/status are on the title line above, so surface party/time/table here instead of the desktop contact line. */}
                <span className="flex items-center gap-2 sm:hidden">
                  <span className="flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    {r.partySize}
                  </span>
                  <span>{dateLine}</span>
                  <span className="text-muted-foreground/60">{tableLabel}</span>
                </span>
                <span className="hidden sm:inline">{contactLine || tableLabel}</span>
                {contactLine && (
                  <span className="hidden text-muted-foreground/60 sm:inline">{tableLabel}</span>
                )}
              </span>
            }
            meta={
              <span className="hidden items-center gap-2 sm:flex">
                <span className="flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  {r.partySize}
                </span>
                <span>{dateLine}</span>
                <StatusBadge tone={STATUS_TONE[status]} label={STATUS_LABELS[status]} />
              </span>
            }
            action={
              <span className="flex items-center gap-0.5">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => onEdit(r)}
                  aria-label="Edit"
                  className="h-8 w-8"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => onDelete(r)}
                  aria-label="Delete"
                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </span>
            }
          />
        );
      })}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────

type FilterTab = 'today' | 'week' | 'all';

function ReservationsPage() {
  const [tab, setTab] = useState<FilterTab>('today');
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingReservation, setEditingReservation] = useState<ReservationDto | null>(null);

  const qc = useQueryClient();
  const dateParam = tab === 'today' ? todayStr() : undefined;
  const { data: allReservations = [], isLoading } = useReservationControllerGetAll(
    dateParam ? { date: dateParam } : undefined,
  );
  const { data: tables = [] } = useTableControllerGetAll();
  const createRes = useReservationControllerCreate();
  const updateRes = useReservationControllerUpdate();
  const deleteRes = useReservationControllerRemove();

  const displayed: ReservationDto[] =
    tab !== 'week'
      ? allReservations
      : allReservations.filter((r) => {
          const d = new Date(r.date);
          const now = new Date();
          const end = new Date(now);

          end.setDate(now.getDate() + 7);

          return d >= now && d <= end;
        });

  function openEdit(r: ReservationDto) {
    setEditingReservation(r);
    setSheetOpen(true);
  }

  function handleDelete(r: ReservationDto) {
    if (!window.confirm(`Delete reservation for ${r.guestName}?`)) return;
    deleteRes.mutate({ id: r.id }, { onSuccess: () => invalidateReservationControllerGetAll(qc) });
  }

  function handleSave(data: SaveData) {
    const opts = {
      onSuccess: () => {
        invalidateReservationControllerGetAll(qc);
        setSheetOpen(false);
      },
    };

    if (editingReservation) {
      updateRes.mutate({ id: editingReservation.id, data }, opts);
    } else {
      createRes.mutate({ data }, opts);
    }
  }

  return (
    <div className="p-6">
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <PageHeader
          title="Door"
          subtitle={`${displayed.length} reservation${displayed.length !== 1 ? 's' : ''}`}
          action={
            <SheetTrigger
              render={
                <Button
                  onClick={() => {
                    setEditingReservation(null);
                  }}
                  className="gap-1.5"
                />
              }
            >
              <Plus className="h-4 w-4" />
              Add reservation
            </SheetTrigger>
          }
        />
        <SheetContent side="right">
          <SheetHeader>
            <SheetTitle>{editingReservation ? 'Edit reservation' : 'New reservation'}</SheetTitle>
            <SheetDescription>
              {editingReservation
                ? `Editing reservation for ${editingReservation.guestName}`
                : 'Fill in the details to create a new reservation.'}
            </SheetDescription>
          </SheetHeader>
          <ReservationForm
            initial={editingReservation ?? undefined}
            onSave={handleSave}
            onCancel={() => setSheetOpen(false)}
          />
        </SheetContent>
      </Sheet>

      <Tabs value={tab} onValueChange={(v) => setTab(v as FilterTab)}>
        <TabsList>
          <TabsTrigger value="today">Today</TabsTrigger>
          <TabsTrigger value="week">This Week</TabsTrigger>
          <TabsTrigger value="all">All</TabsTrigger>
        </TabsList>
        {isLoading ? (
          <div className="mt-4 space-y-2 rounded-lg border p-3">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-14 w-full rounded-md" />
            ))}
          </div>
        ) : (
          <>
            <TabsContent value="today">
              <div className="mt-4">
                <ReservationList
                  reservations={displayed}
                  tables={tables}
                  onEdit={openEdit}
                  onDelete={handleDelete}
                  emptyTitle="No reservations today"
                  emptyDescription="Nothing booked for today. Add a walk-in or new booking."
                />
              </div>
            </TabsContent>
            <TabsContent value="week">
              <div className="mt-4">
                <ReservationList
                  reservations={displayed}
                  tables={tables}
                  onEdit={openEdit}
                  onDelete={handleDelete}
                  emptyTitle="No upcoming reservations"
                  emptyDescription="Nothing scheduled in the next 7 days."
                />
              </div>
            </TabsContent>
            <TabsContent value="all">
              <div className="mt-4">
                <ReservationList
                  reservations={displayed}
                  tables={tables}
                  onEdit={openEdit}
                  onDelete={handleDelete}
                  emptyTitle="No reservations yet"
                  emptyDescription="Create a new reservation to get started."
                />
              </div>
            </TabsContent>
          </>
        )}
      </Tabs>
    </div>
  );
}
