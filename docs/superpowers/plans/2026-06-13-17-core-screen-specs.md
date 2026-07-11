# Core Screen Specs + OpenDesign Prompts Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create five `docs/screens/<module>.md` files — one per core screen — each containing a current-state spec and a polished OpenDesign prompt.

**Architecture:** Pure documentation plan. No code changes. Each file has two sections: (1) Screen Spec documenting the current React implementation and (2) OpenDesign Prompt describing the polished visual target. All prompts reference design tokens from `docs/screens/design-tokens.md` by name.

**Tech Stack:** Markdown only. Design tokens at `docs/screens/design-tokens.md`. React implementation reference in `apps/web/src/routes/_app/<module>/index.tsx`.

---

## File Structure

**Create:**
- `docs/screens/tables.md`
- `docs/screens/orders.md`
- `docs/screens/menu.md`
- `docs/screens/reservations.md`
- `docs/screens/calendar.md`

---

### Task 1: Tables screen spec

**Files:**
- Create: `docs/screens/tables.md`

- [ ] **Step 1: Create the file**

Create `docs/screens/tables.md` with this exact content:

```markdown
# Tables Screen Spec

## Current Implementation

### Table Floor Plan
**Layout:** Responsive card grid — 1 column on mobile, 2 on sm, 3 on md, 4 on lg. Header row with "Tables (N)" count and "+ Add table" primary button. Each card shows: table number, seat count, status badge (Available / Occupied / Reserved).

**Components:**
- Table card (rounded, border, shadow-sm, p-4): table number heading, seat count subtitle, status badge, edit + delete action icons
- Status badge: coloured pill (Available = green, Occupied = red, Reserved = amber)
- Inline create/edit form: replaces card content — fields for Table #, Seats (number), Status (select), Save + Cancel buttons
- Confirmation dialog on delete

**States:**
- Loading: "Loading tables…" text centred in the grid area
- Empty: "No tables yet. Add one above." text below the header
- Populated: card grid
- Creating: form shown at the top of the grid (prepended)
- Editing: the edited card is replaced by the inline form in-place

**Interactions:**
- Click "+ Add table" → creates form at top of grid
- Click pencil icon → replaces that card with an edit form
- Click trash icon → confirmation dialog → deletes card
- Click status badge → cycles Available → Occupied → Reserved → Available (immediate API call)
- Save form → closes form, refreshes data
- Cancel form → closes form, no changes

**Edge cases:**
- Status cycle is a direct click — no dropdown, no confirmation
- Edit form uses the same `TableForm` component as create form
- Only one form open at a time (create or edit, not both)

---

## OpenDesign Prompt

Design the **Table Management** screen for a restaurant management PWA. The app has a fixed left sidebar (240px, zinc-900 background with white navigation links and a logo at the top) and a top bar (white, border-bottom, page title "Tables" left-aligned, primary action button right-aligned).

**Main content area** (white background, padding 24px):

**Header row:** "Tables" as a page title (text-2xl, font-bold, color-primary) on the left. A count badge "(12)" in muted text next to it. On the right: a "+ Add Table" button (bg-primary, text-primary-fg, radius-md, px-4 py-2, font-medium).

**Table grid:** 4 columns on desktop (gap 16px). Each table card is a square (~180×180px), bg-white, border border-border, radius-lg, shadow-sm, padding 16px, positioned relative for action icons.

**Table card anatomy (populated state):**
- Top-left: table number in large type (text-4xl, font-bold, color-primary) — e.g. "T-04"
- Below table number: seat count in muted text (text-sm, color-muted) — e.g. "4 seats"
- Bottom of card: status badge as a full-width pill (radius-full, text-sm, font-medium, text-center)
  - Available: bg-success/10, text-success border border-success/20
  - Occupied: bg-danger/10, text-danger, border border-danger/20
  - Reserved: bg-warning/10, text-warning, border border-warning/20
- Top-right corner (appears on hover): two icon buttons — pencil (edit) and trash (delete) — each 28×28px, color-muted on default, color-primary on hover

**Right-side drawer (create/edit):**
Opens from the right edge, 320px wide, full viewport height, bg-white, shadow-lg, z-50. Has:
- Drawer header: title "Add Table" or "Edit Table" (text-lg, font-semibold), X close button top-right
- Form body (padding 24px, gap 16px):
  - "Table number" label + text input (e.g. "T-05") — border border-border, radius-md, px-3 py-2
  - "Seats" label + number input
  - "Status" label + select dropdown (Available / Occupied / Reserved)
- Drawer footer (border-top, padding 16px, flex row gap 8px right-aligned): "Cancel" button (bg-secondary) + "Save" button (bg-primary, text-primary-fg)
- Backdrop: semi-transparent black overlay behind the drawer

**Empty state** (when no tables exist):
Centred vertically in the content area — a table icon outline (64×64px, color-muted), "No tables yet" heading (text-xl, font-semibold, color-primary, margin-top 16px), "Add your first table to get started." subtitle (text-base, color-muted), "Add Table" primary button below.

**Loading state:** Three-column grid of skeleton cards (bg-surface, animate-pulse, same size as real cards, radius-lg).

**Design tokens used:** --color-primary, --color-primary-fg, --color-secondary, --color-success, --color-warning, --color-danger, --color-background, --color-surface, --color-border, --color-muted, --radius-lg, --radius-full, shadow-sm, shadow-lg
```

- [ ] **Step 2: Verify**

```bash
head -3 docs/screens/tables.md
wc -l docs/screens/tables.md
```

Expected: first line `# Tables Screen Spec`, file is at least 60 lines.

- [ ] **Step 3: Commit**

```bash
git add docs/screens/tables.md
git commit -m "docs(screens): add tables screen spec and OpenDesign prompt"
```

---

### Task 2: Orders screen spec

**Files:**
- Create: `docs/screens/orders.md`

- [ ] **Step 1: Create the file**

Create `docs/screens/orders.md` with this exact content:

```markdown
# Orders Screen Spec

## Current Implementation

### Order Management
**Layout:** Header with "Orders (N)" count and "New order" button. Status filter pills row (All, Draft, Sent, In Progress, Ready, Served). Card grid (1–3 columns) of order cards filtered by selected status.

**Components:**
- Filter pill row: horizontal scrollable pills, active pill has dark background
- Order card (border, radius-lg, shadow-sm, p-4): order ID (first 8 chars), item count, status dropdown, notes (if any), expand/collapse chevron, trash delete button
- Expanded card: shows item rows — quantity, menu item ID (6 chars), item status dropdown
- Create order form (shown above the grid when toggled): table select, notes textarea, dynamic item rows (add/remove), Submit + Cancel

**States:**
- Loading: "Loading orders…" centred
- Empty (all): "No orders" text
- Empty (filtered): "No orders with status [X]"
- Expanded: item rows visible below the card header
- Creating: inline form shown at top of content area

**Interactions:**
- Click status pill → filters cards to that status
- Click status dropdown on card → changes order status via API
- Click chevron → toggles item list expand/collapse
- Click trash → confirmation → deletes order
- Click "New order" → shows create form above the grid
- Per-item status dropdown → changes item status via API
- Add/remove item rows in create form

**Edge cases:**
- When filtered to a status with no orders: empty message shows the status name
- Table select in create form shows all tables (including occupied)
- Item picker in create form uses raw item IDs (no names shown in current implementation)

---

## OpenDesign Prompt

Design the **Order Management** screen for a restaurant management PWA. The app has a fixed left sidebar (240px, zinc-900) and a white top bar.

**Main content area** (white, padding 24px):

**Header row:** "Orders" page title (text-2xl, font-bold) left. Count badge "(7)". Right: "+ New Order" button (bg-primary, text-primary-fg, radius-md).

**Kanban swimlane layout:** Five horizontal columns filling the remaining height, each column independently scrollable. Column min-width 220px, gap 12px between columns. The column area sits below the header.

**Column header** (sticky, bg-background, padding-bottom 8px):
- Column label (text-sm, font-semibold, color-primary, uppercase tracking-wide) — e.g. "DRAFT"
- Count badge (bg-surface, text-muted, radius-full, px-2 py-0.5, text-xs) — e.g. "3"

**Order card** (bg-white, border border-border, radius-lg, shadow-sm, padding 12px, margin-bottom 8px):
- Top row: "Table 4" (text-base, font-semibold, color-primary) left; elapsed time "12 min" (text-xs, color-muted) right
- Middle row: item summary "3 items" (text-sm, color-muted)
- Optional notes row: italic, text-sm, color-muted, single line truncated
- Bottom row: status chip (pill, bg-surface, text-xs, font-medium) + ⋯ action menu button (right-aligned)
- ⋯ menu (popover, shadow-md): "Move to [next status]", "Delete" (text-danger)

**Empty lane state:** Full-height dashed border rectangle (border-border, radius-lg, border-dashed, border-2) with lane label centred vertically in color-muted, text-sm.

**New Order modal** (triggered by "+ New Order" button):
- Full-screen backdrop (black/40 opacity, blur-sm)
- Modal panel (max-width 560px, bg-white, radius-xl, shadow-lg, padding 24px, centred)
- Modal header: "New Order" (text-xl, font-semibold) + X close button
- Fields:
  - "Table" label + select dropdown (shows table number + current status)
  - "Notes" label + textarea (3 rows, optional)
  - "Items" section: dynamic rows — each row has [Menu item dropdown] [Qty spinner] [× remove]. "+ Add item" link below rows.
- Footer (border-top, padding-top 16px, flex right): "Cancel" secondary + "Create Order" primary button

**Design tokens:** --color-primary, --color-primary-fg, --color-secondary, --color-surface, --color-border, --color-muted, --color-danger, --radius-lg, --radius-xl, --radius-full, shadow-sm, shadow-md, shadow-lg
```

- [ ] **Step 2: Verify**

```bash
head -3 docs/screens/orders.md
wc -l docs/screens/orders.md
```

Expected: first line `# Orders Screen Spec`, at least 70 lines.

- [ ] **Step 3: Commit**

```bash
git add docs/screens/orders.md
git commit -m "docs(screens): add orders screen spec and OpenDesign prompt"
```

---

### Task 3: Menu screen spec

**Files:**
- Create: `docs/screens/menu.md`

- [ ] **Step 1: Create the file**

Create `docs/screens/menu.md` with this exact content:

```markdown
# Menu Screen Spec

## Current Implementation

### Menu Management
**Layout:** Two sections stacked vertically — Categories (top) and Items (bottom). Categories section shows horizontal pill tags. Items section shows a data table with columns: Name, Description, Price (€), Available (icon), Actions.

**Components:**
- Categories section header: "Categories" label + "+ Add category" button + category pills
- Category pill: clickable, selected pill darkens; edit + delete icons per pill on hover
- Category inline edit form: replaces the pill row with an input field + Save/Cancel
- Items section header: "Items (N)" + "Add item" button (disabled when no categories)
- Items table: each row shows name, truncated description, price formatted as "€X.XX", eye/eye-off icon for availability toggle, edit + delete action icons
- Item inline edit: full-width form row inserted into the table on edit
- Item form fields: Name, Category (select), Price, Description, Available (checkbox)

**States:**
- Loading categories: "Loading…"
- Loading items: "Loading…"
- No categories + no items: both sections show empty text
- Category selected: items table filters to that category
- Category create mode: inline form appears above existing pills
- Item create mode: inline form appears at top of table body
- Item edit mode: row replaced by form spanning full table width
- "Add item" button disabled (tooltip: needs at least one category)

**Interactions:**
- Click category pill → filters items table (click again to deselect/show all)
- Click pencil on category → inline category edit form
- Click trash on category → confirmation → deletes category (also removes associated items)
- Click "Add item" (if categories exist) → inline form at top of table
- Click toggle availability (eye icon) → immediate API call, icon updates
- Click pencil on item row → inline edit form in row
- Click trash on item row → confirmation → deletes item

**Edge cases:**
- Deleting a category with items triggers a backend cascade delete
- Price stored as integer cents, displayed as formatted euros
- Availability toggle updates immediately without reload

---

## OpenDesign Prompt

Design the **Menu Management** screen for a restaurant management PWA. Fixed sidebar (240px, zinc-900) + top bar (white).

**Main content area** (white, padding 24px) uses a **two-panel horizontal layout**:

**Left panel** (240px wide, bg-surface, radius-lg, padding 16px, position sticky top 24px, self-start):
- "Categories" heading (text-base, font-semibold, color-primary, margin-bottom 12px)
- "+ Add Category" button (full-width, bg-white, border border-border, radius-md, text-sm, font-medium, color-primary, text-left, padding 8px 12px, hover bg-secondary)
- Category list (vertical stack, gap 4px): each item is a pill-shaped row (padding 8px 12px, radius-md, text-sm, font-medium, cursor-pointer)
  - Default: bg-white, color-primary
  - Active/selected: bg-primary, color-primary-fg
  - Hover: bg-secondary
  - Each row shows category name left, edit (pencil) + delete (trash) icons right (icons appear on hover, color-muted)
- "All items" option at top of list (always visible, selects no filter)

**Right panel** (flex-1, padding-left 24px):
- Header row: category filter context shown ("Showing: [Category Name]" or "All items") as text-sm color-muted. Right: "+ Add Item" button (bg-primary, text-primary-fg, radius-md) — greyed out with tooltip if no categories.
- Item count below header: "12 items" (text-sm, color-muted, margin-bottom 16px)
- **Item card grid** (2 columns, gap 16px):
  Each item card (bg-white, border border-border, radius-lg, shadow-sm, overflow-hidden):
  - Photo area (top, full width, height 120px, bg-surface): camera icon centred (color-muted, 32×32)
  - Card body (padding 12px):
    - Item name (text-base, font-semibold, color-primary, single line truncated)
    - Category tag (text-xs, bg-surface, color-muted, radius-full, px-2 py-0.5, inline)
    - Price (text-xl, font-bold, color-accent) — e.g. "€12.50"
    - Bottom row: availability toggle (Eye/EyeOff icon, color-success when available, color-muted when unavailable, text-xs label "Available"/"Hidden") left; edit + delete icon buttons right (color-muted, hover color-primary)

**Right-side drawer (add/edit item)** (400px wide, bg-white, shadow-lg, from right edge):
- Drawer header: "Add Item" or "Edit Item" (text-lg, font-semibold) + X close
- Photo upload zone (full width, height 160px, border-2 border-dashed border-border, radius-lg, bg-surface, centred camera icon + "Upload photo" text-sm color-muted)
- Form fields (padding 24px, gap 16px): Name (text input), Category (select), Price (number input, prefix €), Description (textarea 3 rows), Available (toggle switch, color-success when on)
- Drawer footer: Cancel + Save buttons

**Empty state** (no items in selected category): centred — fork-and-knife icon (48px, color-muted), "No items in this category" (text-base, color-muted), "+ Add Item" link.

**Design tokens:** --color-primary, --color-primary-fg, --color-secondary, --color-accent, --color-success, --color-surface, --color-border, --color-muted, --radius-md, --radius-lg, --radius-full, shadow-sm, shadow-lg
```

- [ ] **Step 2: Verify**

```bash
head -3 docs/screens/menu.md
wc -l docs/screens/menu.md
```

Expected: first line `# Menu Screen Spec`, at least 80 lines.

- [ ] **Step 3: Commit**

```bash
git add docs/screens/menu.md
git commit -m "docs(screens): add menu screen spec and OpenDesign prompt"
```

---

### Task 4: Reservations screen spec

**Files:**
- Create: `docs/screens/reservations.md`

- [ ] **Step 1: Create the file**

Create `docs/screens/reservations.md` with this exact content:

```markdown
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
```

- [ ] **Step 2: Verify**

```bash
head -3 docs/screens/reservations.md
wc -l docs/screens/reservations.md
```

Expected: first line `# Reservations Screen Spec`, at least 80 lines.

- [ ] **Step 3: Commit**

```bash
git add docs/screens/reservations.md
git commit -m "docs(screens): add reservations screen spec and OpenDesign prompt"
```

---

### Task 5: Calendar screen spec

**Files:**
- Create: `docs/screens/calendar.md`

- [ ] **Step 1: Create the file**

Create `docs/screens/calendar.md` with this exact content:

```markdown
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
```

- [ ] **Step 2: Verify**

```bash
head -3 docs/screens/calendar.md
wc -l docs/screens/calendar.md
```

Expected: first line `# Calendar Screen Spec`, at least 80 lines.

- [ ] **Step 3: Commit**

```bash
git add docs/screens/calendar.md
git commit -m "docs(screens): add calendar screen spec and OpenDesign prompt"
```

---

## Self-Review

**Spec coverage:**
- ✅ Tables: current state + polished OpenDesign prompt (drawer, floor-plan grid, status badges)
- ✅ Orders: current state + Kanban swimlane prompt with modal
- ✅ Menu: current state + two-panel prompt with category sidebar + item card grid + drawer
- ✅ Reservations: current state + timeline prompt with day header + drawer
- ✅ Calendar: current state + color-coded events + popovers + summary strip

**Placeholder scan:** No TBD, TODO, or vague instructions. All design token names are explicit. All layout dimensions are specified (pixel values, radius tokens, color tokens).

**Type consistency:** No code types — pure documentation. Token names consistent across all 5 prompts (--color-primary, --color-accent, etc. all match `docs/screens/design-tokens.md`).
