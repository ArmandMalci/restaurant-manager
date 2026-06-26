# Floor Spatial Map — Design Spec

> Track 2 feature. Turns the dense Floor grid into a real room layout (map ↔ grid), with a drag-to-build layout editor and a per-table action hub (order / bill / status). Approved 2026-06-26.

## 1. Overview

Add **position + shape** to tables so the Floor screen can render the actual room. A manager drags tables into place in an **Edit-layout** mode; during service, staff see a glanceable **map** (toggle to the existing dense grid), and tapping a table opens an **action sheet** — start/continue its order (→ the POS builder), see its running bill, or change its status.

**Primary user / device:** waiter/host on tablet (map + actions); manager builds the layout (desktop/tablet).

## 2. Schema (one Prisma migration)

```prisma
// Table — add:
  posX  Float?               // 0–100, percent of canvas width  (null = unplaced)
  posY  Float?               // 0–100, percent of canvas height
  shape String  @default("square")   // 'square' | 'round'
```

Additive, all nullable/defaulted. (Migration: `node_modules/.bin/prisma` from repo root with `DATABASE_URL` inline, regenerate with Node 22+; **never `migrate reset`**.)

## 3. Shared Zod / API

- `TableSchema` gains `posX: z.number().min(0).max(100).nullable().default(null)`, `posY` (same), `shape: z.enum(['square','round']).default('square')`. `UpdateTableSchema` already `.partial()` covers them.
- New `TableLayoutItemSchema = z.object({ id: z.string().uuid(), posX: z.number().min(0).max(100), posY: z.number().min(0).max(100), shape: z.enum(['square','round']) })`; `SaveTableLayoutSchema = z.object({ tables: z.array(TableLayoutItemSchema) })`.
- **`PATCH /api/tables/layout`** (manager) — body `{ tables: TableLayoutItem[] }`; `TableService.saveLayout` updates each table's `posX/posY/shape` in a `$transaction`; returns the updated tables. `GET /tables` returns `posX/posY/shape` (extend `TableDto` swagger → Orval regen). Reuse existing `PATCH /tables/:id/status` for status changes.
- **Running bill** is computed client-side from the table's active order items (`unitPrice + Σ modifier.priceDelta) × quantity` — the snapshots from feature 2b. No new bill endpoint.

## 4. Frontend — `/floor` (`apps/web/src/routes/_app/floor/index.tsx`)

- **Map ↔ grid toggle** — the Plan-3 dense grid stays as the alternate view; default to map when any table has a position, else grid.
- **Map view:** a relative-positioned canvas; each *placed* table is an absolutely-positioned tile at `posX%/posY%`, rendered round/square, sized by `seats` (small/medium/large buckets), colored by status (StatusDot/tone). Unplaced tables sit in a side **tray**.
- **Edit-layout mode** (toggle, manager): lightweight pointer-drag (`onPointerDown/Move/Up`, compute % from the canvas `getBoundingClientRect`) to move tiles (and drag from the tray onto the canvas); a per-table **shape** toggle (square/round); **"Save layout"** → `PATCH /tables/layout` with all positioned tables; "Cancel" reverts.
- **Tap a table** (view mode) → an action `Sheet`:
  - **Start / continue order** → navigate to `/order` with the table preselected (a `tableId` search param the 2b builder reads to prefill its table `Select`).
  - **Current order + running bill** — find the table's active order (`useOrderControllerGetAll`, filter to this table + non-served status), list its items, show the computed running total.
  - **Change status** — seat / occupied / available via `useTableControllerSetStatus`.
- Warm-canvas tokens + Plan-1 primitives; tablet-first. One accent CTA per view.

## 5. Deferred (out of scope)

- Assign-server / move-party (moving an active order between tables); floor-plan background image; multi-room zones; walls/obstacles; snapping/collision; table rotation.

## 6. Testing

- **API (Jest):** `saveLayout` updates each table's `posX/posY/shape` (transaction); `GET /tables` returns the new fields.
- **Web:** build green; map renders placed tables + tray for unplaced; edit mode drags + saves; the action sheet opens with order/bill/status; screenshot map + edit mode + action sheet.

## 7. Open assumptions

- Positions are percentages of the canvas, so the layout is responsive without storing pixel sizes.
- Unplaced tables (null pos) appear in a tray and are still fully usable via the grid view.
- "Start order" deep-links to the existing `/order` builder (preselected table) rather than embedding the builder in the Floor screen — keeps the builder single-sourced.
- Status set from the map reuses the existing `setStatus` (which already stamps `seatedAt` from Plan 4).
