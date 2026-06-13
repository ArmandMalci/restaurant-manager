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
