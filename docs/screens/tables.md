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
