import { createFileRoute } from '@tanstack/react-router';
import { useState, useMemo } from 'react';
import { Calendar, dayjsLocalizer, Views } from 'react-big-calendar';
import dayjs from 'dayjs';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { useReservationControllerGetAll } from '@/api/reservations/reservations';
import { useShiftControllerGetAll } from '@/api/shifts/shifts';
import { useStaffControllerGetAll } from '@/api/staff/staff';

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

  return (
    <div className="flex h-full flex-col gap-4 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Calendar</h1>
      </div>

      <div className="flex gap-2 border-b">
        {(['reservations', 'shifts'] as Tab[]).map((t) => (
          <button
            type="button"
            key={t}
            onClick={() => setTab(t)}
            className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium capitalize transition-colors ${
              tab === t
                ? 'border-primary text-primary'
                : 'text-muted-foreground hover:text-foreground border-transparent'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="min-h-0 flex-1" style={{ height: 600 }}>
        <Calendar
          localizer={localizer}
          events={tab === 'reservations' ? reservationEvents : shiftEvents}
          defaultView={Views.WEEK}
          views={[Views.WEEK, Views.DAY]}
          date={currentDate}
          onNavigate={setCurrentDate}
          scrollToTime={new Date(0, 0, 0, 10, 0, 0)}
          style={{ height: '100%' }}
        />
      </div>
    </div>
  );
}
