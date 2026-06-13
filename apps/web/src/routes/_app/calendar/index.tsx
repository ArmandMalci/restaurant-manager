import { createFileRoute } from '@tanstack/react-router'
import { useState, useMemo } from 'react'
import { Calendar, dayjsLocalizer, Views } from 'react-big-calendar'
import dayjs from 'dayjs'
import 'react-big-calendar/lib/css/react-big-calendar.css'
import { useReservations } from '@/lib/reservation-api'
import { useShifts } from '@/lib/shift-api'
import { useStaff } from '@/lib/staff-api'

export const Route = createFileRoute('/_app/calendar/')({
  component: CalendarPage,
})

const localizer = dayjsLocalizer(dayjs)

type Tab = 'reservations' | 'shifts'

interface CalendarEvent {
  id: string
  title: string
  start: Date
  end: Date
  resource: unknown
}

function weekBounds(date: Date): { from: string; to: string } {
  const start = dayjs(date).startOf('week')
  const end = dayjs(date).endOf('week')
  return {
    from: start.format('YYYY-MM-DD'),
    to: end.format('YYYY-MM-DD'),
  }
}

function CalendarPage() {
  const [tab, setTab] = useState<Tab>('reservations')
  const [currentDate, setCurrentDate] = useState(new Date())
  const { from, to } = weekBounds(currentDate)

  const { data: reservations = [] } = useReservations()
  const { data: shifts = [] } = useShifts(from, to)
  const { data: staff = [] } = useStaff()

  const staffById = useMemo(() => {
    const map = new Map<string, string>()
    staff.forEach((s: { id: string; name: string; role: string }) => map.set(s.id, `${s.name} (${s.role})`))
    return map
  }, [staff])

  const reservationEvents = useMemo<CalendarEvent[]>(
    () =>
      reservations.map(r => ({
        id: r.id,
        title: `${r.guestName} ×${r.partySize}`,
        start: new Date(r.date),
        end: new Date(new Date(r.date).getTime() + 60 * 60 * 1000),
        resource: r,
      })),
    [reservations],
  )

  const shiftEvents = useMemo<CalendarEvent[]>(
    () =>
      shifts.map(s => ({
        id: s.id,
        title: staffById.get(s.staffId) ?? s.staffId,
        start: new Date(s.startTime),
        end: s.endTime ? new Date(s.endTime) : new Date(new Date(s.startTime).getTime() + 8 * 60 * 60 * 1000),
        resource: s,
      })),
    [shifts, staffById],
  )

  return (
    <div className="flex flex-col gap-4 p-6 h-full">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Calendar</h1>
      </div>

      <div className="flex gap-2 border-b">
        {(['reservations', 'shifts'] as Tab[]).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium capitalize transition-colors border-b-2 -mb-px ${
              tab === t
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="flex-1 min-h-0" style={{ height: 600 }}>
        <Calendar
          localizer={localizer}
          events={tab === 'reservations' ? reservationEvents : shiftEvents}
          defaultView={Views.WEEK}
          views={[Views.WEEK, Views.DAY]}
          date={currentDate}
          onNavigate={setCurrentDate}
          style={{ height: '100%' }}
        />
      </div>
    </div>
  )
}
