# Reservations Screen Spec

## Current Implementation

### Reservation List
**Layout:** Header with "New" button + date filter input (type="date") + "Show all" link. Vertical stack of reservation cards filtered by the selected date (defaults to today). Each card shows all reservation details.

**Components:**
- Date filter input: `<input type="date">` defaulting to today's date string
- "Show all" link: clears the date filter (shows all reservations regardless of date)
- Reservation card (border, radius-lg, p-4): guest name heading, date/time, party size, email, phone, notes (if any), table assignment indicator, edit + delete buttons
- Table assignment badge: green "Table assigned" or grey "No table" pill
- Inline create/edit form (same component for both): fields for guest name, party size, date/time (datetime-local input), table select, email, phone, notes — Save + Cancel

**States:**
- Loading: "Loading…"
- Empty (with date filter): "No reservations for [date]"
- Empty (no filter): "No reservations"
- Populated: card stack
- Creating: form shown above the card stack
- Editing: inline form replaces that specific card

**Interactions:**
- Change date input → filters cards to that date (immediate refetch)
- Click "Show all" → clears date filter, shows all reservations
- Click "New" → shows create form above the stack
- Click pencil on card → replaces card with inline edit form
- Click trash on card → confirmation → deletes reservation
- Save form → closes form, refreshes list
- Cancel form → closes form

**Edge cases:**
- Date defaults to today using a `todayStr()` helper (YYYY-MM-DD format)
- `toDatetimeLocal()` helper converts ISO timestamps to datetime-local input format
- Table select includes all tables (not just available ones)
- Reservation time stored as ISO DateTime (UTC), displayed in local time

---

## OpenDesign Prompt

Design the **Reservations** screen for a restaurant management PWA. Fixed sidebar (240px, zinc-900) + white top bar.

**Main content area** (white, padding 24px):

**Day header strip** (bg-surface, radius-lg, padding 16px, margin-bottom 24px, flex row):
- Left side: date picker input (styled: bg-white, border border-border, radius-md, px-3 py-2, text-base, font-medium, color-primary). A calendar icon (16px, color-muted) inside the input prefix.
- Centre: summary text "5 reservations · 18 covers" (text-sm, color-muted, font-medium)
- Right side: "Show all dates" link (text-sm, color-accent, underline-offset-2) + "+ New Reservation" button (bg-primary, text-primary-fg, radius-md, px-4 py-2, text-sm, font-medium)

**Timeline reservation list** (vertical stack, gap 0, with a thin vertical line on the left — 2px, bg-border, left 48px from the left edge of the content):

Each reservation row is a flex container:
- **Time column** (width 80px, flex-shrink 0): time displayed as two lines — hour (text-2xl, font-bold, color-primary, e.g. "19") and minutes (text-sm, color-muted, e.g. ":30"). The time column vertically centres against the card.
- **Connector dot** (8px circle, bg-accent, border-2 border-white, position absolute, left 44px, vertically centred with the card)
- **Reservation card** (flex-1, bg-white, border border-border, radius-lg, shadow-sm, padding 16px, margin-bottom 12px):
  - Top row: guest name (text-base, font-semibold, color-primary) left; party size badge right
    - Party size pill colours: 1–2 guests = bg-success/10 text-success, 3–5 = bg-warning/10 text-warning, 6+ = bg-danger/10 text-danger
  - Second row: date string (text-sm, color-muted) + table badge
    - Table assigned: bg-success/10, text-success, "Table 3 ✓"
    - No table: bg-surface, color-muted, "Unassigned"
  - Third row (if email/phone present): contact icons (mail + phone, 14px, color-muted) + values (text-sm, color-muted)
  - Notes row (if present): italic text-sm color-muted, single line truncated
  - Bottom row: pencil (edit) + trash (delete) icon buttons, right-aligned, color-muted on default, color-primary on hover

**Right-side drawer (create/edit)** (360px wide, bg-white, shadow-lg):
- Header: "New Reservation" or "Edit Reservation" + X close
- Form fields (padding 24px, gap 16px):
  - Guest Name (text input)
  - Party Size (number input, min 1)
  - Date & Time (datetime-local input)
  - Table (select — shows "Table 3 (Available)" etc.)
  - Email (email input, optional)
  - Phone (tel input, optional)
  - Notes (textarea 3 rows, optional)
- Footer: Cancel + Save buttons

**Empty state** (no reservations for selected date):
Centred — calendar outline icon (64px, color-muted), "No reservations for [date]" heading (text-xl, font-semibold), "Book one" link text below (color-accent).

**Design tokens:** --color-primary, --color-primary-fg, --color-accent, --color-success, --color-warning, --color-danger, --color-surface, --color-border, --color-muted, --radius-md, --radius-lg, --radius-full, shadow-sm, shadow-lg
