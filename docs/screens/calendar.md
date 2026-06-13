# Calendar Screen Spec

## Current Implementation

### Unified Calendar
**Layout:** Tab switcher (Reservations | Shifts) at the top. Week/Day view selector. react-big-calendar widget fills the remaining height. Week navigation (prev/next) handled by the calendar's built-in toolbar.

**Components:**
- Tab switcher: two text buttons ("Reservations", "Shifts"), active tab visually distinct
- react-big-calendar: dayjs localizer, custom toolbar with Week/Day toggle
- Reservation events: title = "GuestName × N" (guest name × party size), duration = 1 hour from reservation time
- Shift events: title = "StaffName (role)", start = shift startTime, end = shift endTime (or +8h if missing)
- No click handlers on events (display only)

**States:**
- Loading reservations: data fetched via TanStack Query (reservations + shifts for the displayed week)
- Empty calendar: calendar renders with no events — no specific empty state UI
- Tab: 'reservations' | 'shifts'
- View: 'week' | 'day'

**Interactions:**
- Click "Reservations" tab → shows reservation events, hides shifts
- Click "Shifts" tab → shows shift events, hides reservations
- Week/Day toggle → changes calendar view
- Calendar navigation (built-in toolbar prev/next/today)

**Edge cases:**
- Staff lookup map built from staff list — shift events use staff names from this map
- Reservations fetched for week bounds (start of week to end of week based on current date state)
- Shifts also fetched for the same week range

---

## OpenDesign Prompt

Design the **Calendar** screen for a restaurant management PWA. Fixed sidebar (240px, zinc-900) + white top bar.

**Main content area** (white, padding 24px, display flex, flex-col, height 100vh minus header):

**Control bar** (flex row, align-items center, gap 16px, margin-bottom 16px):
- Tab switcher (left): two underline-style tabs — "Reservations" and "Shifts". Active tab has a 2px bottom border in color-accent, font-semibold, color-primary. Inactive tab: color-muted, font-normal.
- Summary strip (centre, flex 1, text-sm color-muted): changes by active tab
  - Reservations tab: "This week: 14 reservations · 52 covers"
  - Shifts tab: "This week: 8 shifts · 5 staff scheduled"
- View selector (right): segmented control — "Week" | "Day" buttons. Active button: bg-primary, color-primary-fg, radius-md. Inactive: bg-surface, color-muted, radius-md. Buttons share a border radius-md container.

**Week navigation row** (flex row, align-items center, gap 8px, margin-bottom 12px):
- ← Previous week button (icon button, 32×32px, border border-border, radius-md, color-muted)
- Current week label (text-base, font-semibold, color-primary) — e.g. "Jun 9 – Jun 15, 2026"
- → Next week button (same as previous)
- "Today" button (text-sm, border border-border, radius-md, px-3 py-1, color-primary) — right of the week label

**Calendar grid** (flex-1, border border-border, radius-lg, overflow-hidden):
Week view: 7 columns (days) + time slots on the left (hourly rows, 08:00–23:00). Day headers show weekday + date number. Current day column has a subtle bg-accent/5 background.

**Event blocks:**
- Reservation events: bg-accent, color-primary-fg (white text), radius-sm, font-size text-xs, font-medium, padding 2px 6px. Title: "Sarah × 4". Overflow truncated.
- Shift events: bg-primary, color-primary-fg (white text), same styling. Title: "Marco (waiter)".
- Events have a slight left border accent (3px) in a darker shade of the same colour.

**Event popover** (appears on click, z-50, bg-white, shadow-lg, radius-lg, padding 16px, min-width 240px):
- Reservations popover:
  - Guest name (text-base, font-semibold, color-primary)
  - "Party of 4" (text-sm, color-muted)
  - Table assigned: "Table 3" with a green check, or "Unassigned" in muted
  - Time: "7:30 PM – 8:30 PM" (text-sm, color-muted)
  - Close button (X, top-right corner)
- Shifts popover:
  - Staff name (text-base, font-semibold, color-primary)
  - Role badge (text-xs, bg-surface, color-muted, radius-full, px-2 py-0.5)
  - Time: "09:00 – 17:00" (text-sm, color-muted)

**Empty state** (shown inside the calendar grid when no events for the week):
Centred overlay — calendar-check icon (48px, color-muted), "No [reservations/shifts] this week" (text-base, color-muted). Does not replace the calendar grid — the grid still renders, empty state floats centred inside it.

**Design tokens:** --color-primary, --color-primary-fg, --color-accent, --color-surface, --color-border, --color-muted, --radius-sm, --radius-md, --radius-lg, shadow-md, shadow-lg
