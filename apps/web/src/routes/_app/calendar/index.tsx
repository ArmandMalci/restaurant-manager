import { createFileRoute } from '@tanstack/react-router';
import { useState, useMemo } from 'react';
import { Calendar, dayjsLocalizer, Views } from 'react-big-calendar';
import dayjs from 'dayjs';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { useReservationControllerGetAll } from '@/api/reservations/reservations';
import { useShiftControllerGetAll } from '@/api/shifts/shifts';
import { useStaffControllerGetAll } from '@/api/staff/staff';
import { PageHeader } from '@/components/ui/page-header';

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

function CalendarPage() {
  const [tab, setTab] = useState<Tab>('reservations');
  const [currentDate, setCurrentDate] = useState(new Date());
  const { from, to } = weekBounds(currentDate);

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
  const eventCount = activeEvents.length;

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
        ].join(' ')}
      >
        <Calendar
          localizer={localizer}
          events={activeEvents}
          defaultView={Views.WEEK}
          views={[Views.WEEK, Views.DAY]}
          date={currentDate}
          onNavigate={setCurrentDate}
          scrollToTime={new Date(0, 0, 0, 10, 0, 0)}
          style={{ height: '100%' }}
          eventPropGetter={() => ({
            className:
              tab === 'reservations'
                ? 'bg-info! border-info! text-info-foreground! rounded! text-xs! font-medium!'
                : 'bg-success! border-success! text-success-foreground! rounded! text-xs! font-medium!',
          })}
        />
      </div>
    </div>
  );
}
