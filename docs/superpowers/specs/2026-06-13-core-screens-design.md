# Core Screens — Screen Specs + OpenDesign Prompts

**Date:** 2026-06-13
**Status:** Approved for implementation planning
**Scope:** Tables, Orders, Menu, Reservations, Calendar (core 5 screens)

---

## 1. Approach

Each screen gets a dedicated spec file at `docs/screens/<module>.md` with two sections:

1. **Screen Spec** — documents the current implementation: layout, components, all states (empty / loading / error / populated), interactions, and edge cases. This is the record of what exists.

2. **OpenDesign Prompt** — a detailed text prompt describing a *polished, professional* version of the screen. References design tokens by name (from `docs/screens/design-tokens.md`). The generated design serves as the target visual reference for a future UI polish implementation plan.

The prompts do not invent new data models or backend requirements. They improve the UX/visual presentation of existing functionality.

---

## 2. Global Layout Context

All screens live inside the app shell:
- **Left sidebar** (fixed, ~240px): logo, navigation links, user avatar
- **Top bar**: page title, optional actions
- **Main content**: `flex-1 overflow-y-auto p-6`, white background (`--color-background`)

OpenDesign prompts describe only the main content area unless a drawer/modal overlays it.

---

## 3. Per-Screen Design Decisions

### Tables

**Current:** Card grid (1–4 columns) with inline edit forms replacing card content on edit.

**Polished vision:**
- Floor-plan card grid. Each card is a rounded square (~160×160px) showing table number large, seat count small, and a coloured status badge. Status colours: `--color-success` (available), `--color-danger` (occupied), `--color-warning` (reserved).
- Create/Edit opens a **right-side drawer** (320px wide, `shadow-lg`) instead of an inline form. Drawer has a title, form fields (Table #, Seats, Status), and Save/Cancel buttons.
- Status can be changed by clicking the badge directly — cycles Available → Occupied → Reserved → Available with a subtle animated ring.
- Empty state: centred illustration (table outline) + "No tables yet" heading + "Add your first table" primary button.

### Orders

**Current:** Card grid filtered by status pills, collapsible item details per card.

**Polished vision:**
- **Kanban swimlane** layout. Five columns (Draft | Sent | In Progress | Ready | Served), each a vertically scrollable lane. Column header shows label + count badge.
- Order card: table number (large), item count, elapsed time since creation (auto-updating), and a ⋯ menu for status change and delete.
- "New Order" opens a full **modal** (max-width 560px, `shadow-lg`, backdrop blur). Modal has table select, notes textarea, and a dynamic item-row list (menu item picker + quantity).
- Empty lane: muted dashed border rectangle with lane name centred in `--color-muted`.
- Status change: dropdown in ⋯ menu, card animates sliding to the correct column.

### Menu

**Current:** Two-section page — category pills above, items table below.

**Polished vision:**
- **Two-panel layout.** Left panel (240px, sticky, `--color-surface` bg) lists category pills vertically (stacked, not horizontal wrap). Active category highlighted with `--color-primary` background + `--color-primary-fg` text.
- Right panel: item cards in a 2-column grid. Each card: photo placeholder (`--color-surface`, camera icon centred), item name (`--font-semibold`), category tag, price (`--color-accent`, large), availability toggle (Eye/EyeOff with `--color-success`/`--color-muted`), edit + delete action icons.
- Add/Edit item opens a **right-side drawer** (400px). Includes all fields plus a large photo-upload drop zone at the top.
- "Add item" button disabled state shows a tooltip: "Add a category first".
- Empty items: centred text "No items in this category" with an add-item shortcut link.

### Reservations

**Current:** Flat date-filtered card list.

**Polished vision:**
- **Day-view header**: date picker + summary strip showing "X reservations · X covers today" in `--color-muted`. "Show all" link to the right.
- Reservation cards in a **timeline list** — left column is the time block (hour, large, `--font-bold`), right column is the card body (guest name, party size badge, table assignment badge, phone/email, notes).
- Party size displayed as a coloured pill: small (1–2, `--color-success/10`), medium (3–5, `--color-warning/10`), large (6+, `--color-danger/10`).
- Table assigned: green check badge. No table: grey "Unassigned" badge.
- Create/Edit opens a **right-side drawer** (360px).
- Empty state: calendar illustration + "No reservations for [date]" + "Book one" primary button.

### Calendar

**Current:** Tab switcher (Reservations/Shifts) + react-big-calendar in Week/Day view.

**Polished vision:**
- **Summary strip** above the calendar: for Reservations tab shows total covers this week; for Shifts tab shows scheduled staff count.
- Event colours: reservations in `--color-accent` (orange), shifts in `--color-primary` (zinc-900). Events have the title in `--color-primary-fg` (white).
- Clicking an event opens a **popover** (not a page nav): guest name + party size + table + time for reservations; staff name + role + hours for shifts.
- Week/Day toggle as a segmented control (two buttons, active state `--color-primary` bg).
- Empty state per tab: "No reservations this week" / "No shifts scheduled" centred in the calendar area with a muted icon.
- Tab switcher uses an underline indicator style (`--color-accent` underline on active tab).

---

## 4. Files to Create

| File | Module |
|---|---|
| `docs/screens/tables.md` | Tables |
| `docs/screens/orders.md` | Orders |
| `docs/screens/menu.md` | Menu |
| `docs/screens/reservations.md` | Reservations |
| `docs/screens/calendar.md` | Calendar |

Each file follows the format defined in `docs/screens/design-tokens.md` — screen spec section first, OpenDesign prompt section after a `---` divider.

---

## 5. Out of Scope

- No new API endpoints or data model changes
- No code implementation (this plan produces documentation only)
- No designs for: Login, Dashboard, Staff, Billing, Inventory, Reports, Settings (those are Plan 18+)
- No Figma file — prompts are text-only for use in OpenDesign or any AI design tool
