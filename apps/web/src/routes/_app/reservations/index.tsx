import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  useReservations,
  useCreateReservation,
  useUpdateReservation,
  useDeleteReservation,
} from '@/lib/reservation-api';
import { useTables } from '@/lib/table-api';
import type { Reservation } from '@restaurant/shared';

export const Route = createFileRoute('/_app/reservations/')({
  component: ReservationsPage,
});

function toDatetimeLocal(d: Date | string) {
  const dt = new Date(d);
  return dt.toISOString().slice(0, 16);
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

// ── Reservation form ──────────────────────────────────────────────────

function ReservationForm({
  initial,
  onSave,
  onCancel,
}: {
  initial?: Partial<Reservation>;
  onSave: (data: {
    tableId: string;
    guestName: string;
    guestEmail: string | null;
    guestPhone: string | null;
    partySize: number;
    date: Date;
    notes: string | null;
  }) => void;
  onCancel: () => void;
}) {
  const { data: tables = [] } = useTables();
  const [tableId, setTableId] = useState(initial?.tableId ?? '');
  const [guestName, setGuestName] = useState(initial?.guestName ?? '');
  const [guestEmail, setGuestEmail] = useState(initial?.guestEmail ?? '');
  const [guestPhone, setGuestPhone] = useState(initial?.guestPhone ?? '');
  const [partySize, setPartySize] = useState(initial?.partySize ?? 2);
  const [datetime, setDatetime] = useState(initial?.date ? toDatetimeLocal(initial.date) : '');
  const [notes, setNotes] = useState(initial?.notes ?? '');

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
          date: new Date(datetime),
          notes: notes || null,
        });
      }}
      className="rounded-lg border p-4 space-y-4"
    >
      <div className="flex flex-wrap gap-3">
        <label className="flex flex-col gap-1 text-sm flex-1 min-w-40">
          Guest name *
          <input
            value={guestName}
            onChange={(e) => setGuestName(e.target.value)}
            required
            className="rounded-md border px-2 py-1.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Party size *
          <input
            type="number"
            min={1}
            value={partySize}
            onChange={(e) => setPartySize(Number(e.target.value))}
            required
            className="w-24 rounded-md border px-2 py-1.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Date & time *
          <input
            type="datetime-local"
            value={datetime}
            onChange={(e) => setDatetime(e.target.value)}
            required
            className="rounded-md border px-2 py-1.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </label>
      </div>
      <div className="flex flex-wrap gap-3">
        <label className="flex flex-col gap-1 text-sm">
          Table
          <select
            value={tableId}
            onChange={(e) => setTableId(e.target.value)}
            required
            className="rounded-md border px-2 py-1.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="">Select table…</option>
            {tables.map((t) => (
              <option key={t.id} value={t.id}>
                Table {t.number} ({t.seats} seats)
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm flex-1 min-w-32">
          Email
          <input
            type="email"
            value={guestEmail}
            onChange={(e) => setGuestEmail(e.target.value)}
            className="rounded-md border px-2 py-1.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Phone
          <input
            value={guestPhone}
            onChange={(e) => setGuestPhone(e.target.value)}
            className="rounded-md border px-2 py-1.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </label>
      </div>
      <label className="flex flex-col gap-1 text-sm">
        Notes
        <input
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Optional"
          className="rounded-md border px-2 py-1.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </label>
      <div className="flex gap-2">
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

function ReservationsPage() {
  const [dateFilter, setDateFilter] = useState(todayStr());
  const [formMode, setFormMode] = useState<'none' | 'create' | { id: string }>('none');

  const { data: reservations = [], isLoading } = useReservations(dateFilter || undefined);
  const createRes = useCreateReservation();
  const updateRes = useUpdateReservation();
  const deleteRes = useDeleteReservation();

  if (isLoading) return <div className="p-6 text-sm text-muted-foreground">Loading…</div>;

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Reservations</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {reservations.length} reservation{reservations.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={() => setFormMode('create')}
          className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          <Plus className="h-4 w-4" /> New
        </button>
      </div>

      <div className="flex items-center gap-3">
        <label className="flex items-center gap-2 text-sm">
          Date
          <input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="rounded-md border px-2 py-1.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </label>
        {dateFilter && (
          <button
            onClick={() => setDateFilter('')}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Show all
          </button>
        )}
      </div>

      {formMode === 'create' && (
        <ReservationForm
          onSave={(data) =>
            createRes.mutate(data as never, { onSuccess: () => setFormMode('none') })
          }
          onCancel={() => setFormMode('none')}
        />
      )}

      {reservations.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No reservations{dateFilter ? ` for ${dateFilter}` : ''}.
        </p>
      ) : (
        <div className="space-y-3">
          {reservations.map((r) => (
            <div key={r.id} className="rounded-lg border p-4">
              {typeof formMode === 'object' && formMode.id === r.id ? (
                <ReservationForm
                  initial={r}
                  onSave={(data) =>
                    updateRes.mutate(
                      { id: r.id, dto: data as never },
                      { onSuccess: () => setFormMode('none') },
                    )
                  }
                  onCancel={() => setFormMode('none')}
                />
              ) : (
                <div className="flex items-start justify-between">
                  <div className="space-y-0.5">
                    <p className="font-medium">{r.guestName}</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(r.date).toLocaleString()} · {r.partySize} guests
                    </p>
                    {r.guestEmail && (
                      <p className="text-xs text-muted-foreground">{r.guestEmail}</p>
                    )}
                    {r.guestPhone && (
                      <p className="text-xs text-muted-foreground">{r.guestPhone}</p>
                    )}
                    {r.notes && <p className="text-xs italic text-muted-foreground">{r.notes}</p>}
                  </div>
                  <div className="flex items-center gap-1">
                    <span
                      className={cn(
                        'rounded-full px-2 py-0.5 text-xs font-medium',
                        r.tableId ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600',
                      )}
                    >
                      {r.tableId ? 'Table assigned' : 'No table'}
                    </span>
                    <button
                      onClick={() => setFormMode({ id: r.id })}
                      aria-label="Edit"
                      className="ml-2 rounded p-1 hover:bg-accent transition-colors"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() =>
                        window.confirm(`Delete reservation for ${r.guestName}?`) &&
                        deleteRes.mutate(r.id)
                      }
                      aria-label="Delete"
                      className="rounded p-1 text-destructive hover:bg-accent transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
