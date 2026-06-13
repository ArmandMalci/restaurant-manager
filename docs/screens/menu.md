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
