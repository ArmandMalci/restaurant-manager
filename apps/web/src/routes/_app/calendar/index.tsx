import { createFileRoute } from '@tanstack/react-router';
import { useState, useMemo, useEffect } from 'react';
import { Calendar, dayjsLocalizer, Views, type View, type SlotInfo } from 'react-big-calendar';
import dayjs from 'dayjs';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { CalendarDays, Users } from 'lucide-react';
import { useReservationControllerGetAll } from '@/api/reservations/reservations';
import { useShiftControllerGetAll } from '@/api/shifts/shifts';
import { useStaffControllerGetAll } from '@/api/staff/staff';
import { PageHeader } from '@/components/ui/page-header';
import { ListRow } from '@/components/ui/list-row';
import { EmptyState } from '@/components/ui/empty-state';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

// ponytail: single-use, kept local — promote to hooks/ if a second consumer shows up.
function useIsMobile(breakpointPx = 640): boolean {
  const query = `(max-width: ${breakpointPx - 1}px)`;
  const [isMobile, setIsMobile] = useState(() => window.matchMedia(query).matches);

  useEffect(() => {
    const mql = window.matchMedia(query);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);

    mql.addEventListener('change', handler);

    return () => mql.removeEventListener('change', handler);
  }, [query]);

  return isMobile;
}

export const Route = createFileRoute('/_app/calendar/')({
  component: CalendarPage,
});

const localizer = dayjsLocalizer(dayjs);

type Tab = 'reservations' | 'shifts';

interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  resource: unknown;
}

function weekBounds(date: Date): { from: string; to: string } {
  const start = dayjs(date).startOf('week');
  const end = dayjs(date).endOf('week');

  return {
    from: start.format('YYYY-MM-DD'),
    to: end.format('YYYY-MM-DD'),
  };
}

export function CalendarPage() {
  const [tab, setTab] = useState<Tab>('reservations');
  const [currentDate, setCurrentDate] = useState(new Date());
  const { from, to } = weekBounds(currentDate);
  const isMobile = useIsMobile();
  const [modalDate, setModalDate] = useState<Date | null>(null);

  // Reservations default to Month (staff want the month overview; day detail lives in the modal
  // below). Shifts keeps its pre-existing per-viewport default — unchanged, out of scope per D4.
  const defaultView = tab === 'reservations' ? Views.MONTH : isMobile ? Views.AGENDA : Views.WEEK;
  const [view, setView] = useState<View>(defaultView);
  // Reset `view` synchronously (during render, not via useEffect) whenever the tab or viewport
  // changes the set of *available* views — otherwise React can commit one frame with `view` set to
  // a value (e.g. Month) that isn't in the new `views` array (e.g. Shifts' Week/Day), which crashes
  // react-big-calendar's internal render.
  const [syncedFor, setSyncedFor] = useState(`${tab}:${isMobile}`);
  const viewKey = `${tab}:${isMobile}`;

  if (syncedFor !== viewKey) {
    setSyncedFor(viewKey);
    setView(defaultView);
  }

  // Reservations only support a single `date` filter server-side (no from/to range),
  // so the visible-week count is computed client-side from the full list instead.
  const { data: reservations = [] } = useReservationControllerGetAll();
  const { data: shifts = [] } = useShiftControllerGetAll(from || to ? { from, to } : undefined);
  const { data: staff = [] } = useStaffControllerGetAll();

  const staffById = useMemo(() => {
    const map = new Map<string, string>();

    staff.forEach((s: { id: string; name: string; role: string }) => {
      map.set(s.id, `${s.name} (${s.role})`);
    });

    return map;
  }, [staff]);

  const reservationEvents = useMemo<CalendarEvent[]>(
    () =>
      reservations.map((r) => ({
        id: r.id,
        title: `${r.guestName} ×${r.partySize}`,
        start: new Date(r.date),
        end: new Date(new Date(r.date).getTime() + 60 * 60 * 1000),
        resource: r,
      })),
    [reservations],
  );

  const shiftEvents = useMemo<CalendarEvent[]>(
    () =>
      shifts.map((s) => ({
        id: s.id,
        title: staffById.get(s.staffId) ?? s.staffId,
        start: new Date(s.startTime),
        end: s.endTime
          ? new Date(s.endTime)
          : new Date(new Date(s.startTime).getTime() + 8 * 60 * 60 * 1000),
        resource: s,
      })),
    [shifts, staffById],
  );

  const activeEvents = tab === 'reservations' ? reservationEvents : shiftEvents;
  const reservationsThisWeek = useMemo(
    () =>
      reservationEvents.filter((e) => {
        const d = dayjs(e.start);

        return !d.isBefore(dayjs(from), 'day') && !d.isAfter(dayjs(to), 'day');
      }).length,
    [reservationEvents, from, to],
  );
  // Shifts are already server-filtered to [from, to], so their length is week-scoped for free.
  const eventCount = tab === 'reservations' ? reservationsThisWeek : shiftEvents.length;

  // Month cells are too small for inline detail — clicking a day opens this modal instead,
  // filtered client-side from the already-fetched reservation list (no new endpoint).
  const dayReservations = useMemo(() => {
    if (!modalDate) return [];

    return reservations
      .filter((r) => dayjs(r.date).isSame(modalDate, 'day'))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [modalDate, reservations]);

  const reservationViews = isMobile
    ? [Views.MONTH, Views.DAY, Views.AGENDA]
    : [Views.MONTH, Views.WEEK, Views.DAY];
  const shiftViews = isMobile ? [Views.DAY, Views.AGENDA] : [Views.WEEK, Views.DAY];

  return (
    <div className="flex h-full flex-col p-6">
      <PageHeader
        title="Calendar"
        subtitle={`${eventCount} ${tab === 'reservations' ? 'reservation' : 'shift'}${eventCount !== 1 ? 's' : ''} this week`}
      />

      {/* Tab strip */}
      <div className="mb-3 flex gap-0 border-b border-border">
        {(['reservations', 'shifts'] as Tab[]).map((t) => (
          <button
            type="button"
            key={t}
            onClick={() => setTab(t)}
            className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium capitalize transition-colors ${
              tab === t
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Calendar surface — fills remaining flex space */}
      <div
        className={[
          'min-h-0 flex-1',
          'overflow-hidden rounded-lg border border-border bg-card',
          // Override react-big-calendar chrome with semantic tokens
          '[&_.rbc-time-view]:border-0',
          '[&_.rbc-time-content]:border-t-border',
          '[&_.rbc-header]:border-b-border [&_.rbc-header]:border-l-border [&_.rbc-header]:bg-card [&_.rbc-header]:text-foreground',
          '[&_.rbc-time-header-content]:border-l-border',
          '[&_.rbc-timeslot-group]:border-b-border! [&_.rbc-timeslot-group]:border-b',
          '[&_.rbc-time-slot]:text-muted-foreground',
          '[&_.rbc-day-slot]:border-l-border',
          '[&_.rbc-time-gutter]:bg-card [&_.rbc-time-gutter]:text-muted-foreground',
          '[&_.rbc-today]:bg-accent/30!',
          '[&_.rbc-current-time-indicator]:bg-primary!',
          '[&_.rbc-toolbar]:px-3 [&_.rbc-toolbar]:py-2 [&_.rbc-toolbar]:border-b [&_.rbc-toolbar]:border-border [&_.rbc-toolbar]:bg-card',
          '[&_.rbc-toolbar_button]:rounded [&_.rbc-toolbar_button]:border [&_.rbc-toolbar_button]:border-border [&_.rbc-toolbar_button]:bg-card [&_.rbc-toolbar_button]:text-foreground [&_.rbc-toolbar_button]:px-3 [&_.rbc-toolbar_button]:py-1 [&_.rbc-toolbar_button]:text-sm',
          '[&_.rbc-toolbar_button.rbc-active]:bg-primary! [&_.rbc-toolbar_button.rbc-active]:text-primary-foreground! [&_.rbc-toolbar_button.rbc-active]:border-primary!',
          '[&_.rbc-label]:text-muted-foreground [&_.rbc-label]:text-xs',
          '[&_.rbc-off-range-bg]:bg-muted/30',
          '[&_.rbc-selected-cell]:bg-accent/20',
          // Truncate instead of mid-word-wrapping when overlapping bookings shrink event columns
          '[&_.rbc-event-content]:overflow-hidden [&_.rbc-event-content]:text-ellipsis [&_.rbc-event-content]:whitespace-nowrap',
          '[&_.rbc-event]:min-w-11',
          '[&_.rbc-agenda-table]:text-foreground',
        ].join(' ')}
      >
        <Calendar
          localizer={localizer}
          events={activeEvents}
          view={view}
          onView={setView}
          views={tab === 'reservations' ? reservationViews : shiftViews}
          date={currentDate}
          onNavigate={setCurrentDate}
          scrollToTime={new Date(0, 0, 0, 10, 0, 0)}
          style={{ height: '100%' }}
          selectable={tab === 'reservations'}
          onSelectSlot={
            tab === 'reservations'
              ? (slotInfo: SlotInfo) => setModalDate(slotInfo.start)
              : undefined
          }
          onDrillDown={tab === 'reservations' ? (date: Date) => setModalDate(date) : undefined}
          onShowMore={
            tab === 'reservations' ? (_events, date: Date) => setModalDate(date) : undefined
          }
          eventPropGetter={() => ({
            className:
              tab === 'reservations'
                ? 'bg-info! border-info! text-info-foreground! rounded! text-xs! font-medium!'
                : 'bg-success! border-success! text-success-foreground! rounded! text-xs! font-medium!',
          })}
        />
      </div>

      <Dialog open={modalDate !== null} onOpenChange={(open) => !open && setModalDate(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{modalDate ? dayjs(modalDate).format('dddd, MMMM D') : ''}</DialogTitle>
            <DialogDescription>
              {dayReservations.length} reservation{dayReservations.length !== 1 ? 's' : ''}
            </DialogDescription>
          </DialogHeader>
          {dayReservations.length === 0 ? (
            <EmptyState
              icon={CalendarDays}
              title="No reservations"
              description="Nothing booked for this day."
            />
          ) : (
            <div className="max-h-96 overflow-y-auto rounded-lg border border-border bg-card">
              {dayReservations.map((r) => (
                <ListRow
                  key={r.id}
                  title={r.guestName}
                  subtitle={dayjs(r.date).format('h:mm A')}
                  meta={
                    <span className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {r.partySize}
                    </span>
                  }
                />
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
