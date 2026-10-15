# Floor Spatial Map — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development or executing-plans. Checkbox (`- [ ]`) steps. **Execution model: Sonnet.** Backend (Tasks 1–3) is TDD (Jest); frontend (4–6) is visual, screenshot-verified.

**Goal:** Give tables position + shape and turn the Floor screen into a room map (toggle to grid) with a drag-to-build layout editor and a per-table action sheet (order / bill / status).

**Architecture:** Add `posX/posY/shape` to `Table`; a bulk `PATCH /tables/layout` saves the room in one transaction. The Floor screen renders placed tables on a percentage-positioned canvas (map) or the existing dense grid; an Edit mode drags tiles + saves; tapping a table opens a sheet that deep-links to the 2b POS builder (table preselected), shows the running bill (computed from the active order's snapshots), and changes status.

**Tech Stack:** NestJS + Prisma · Jest (plain Prisma mocks) · `swagger-dtos` + Orval · React + TanStack Router + Plan-1 primitives. pnpm.

## Global Constraints

- Spec: `docs/design-revamp/specs/2026-06-26-floor-spatial-map.md`. `posX/posY` = 0–100 (% of canvas); `shape` ∈ `{square, round}`.
- **Environment (Node 21):** husky hook breaks → commit `--no-verify`; `prisma migrate dev` + `pnpm gen:api` need Node 22+ (`PATH="$HOME/.nvm/versions/node/v24.11.1/bin:$PATH" …`, pnpm 10). Migration additive; **never `migrate reset`**.
- Never hand-edit `apps/web/src/api/**`; regen via `pnpm gen:api`. Pre-existing `notifications.service.spec.ts` 8 fails — ignore.
- **Route ordering:** `PATCH /tables/layout` MUST be declared **before** `@Patch(':id')` in `table.controller.ts` (else `:id` matches `"layout"`).
- Frontend: semantic tokens; one accent CTA; lucide; raw `<button>` needs `type=`. Reuse the table's `setStatus` (stamps `seatedAt`).

---

## File Structure

| File | Responsibility | Action |
|------|----------------|--------|
| `prisma/schema.prisma` | `Table.posX/posY/shape` | Modify |
| `packages/shared/src/schemas/table.ts` | pos/shape + layout schemas | Modify |
| `apps/api/src/table/table.service.ts` | `saveLayout` | Modify |
| `apps/api/src/table/table.service.spec.ts` | saveLayout test | Modify (create if absent) |
| `apps/api/src/table/dto/table.dto.ts` | `SaveTableLayoutDto` | Modify |
| `apps/api/src/table/table.controller.ts` | `PATCH /tables/layout` | Modify |
| `apps/api/src/swagger-dtos.ts` | extend `TableDto` | Modify |
| `apps/web/src/routes/_app/floor/index.tsx` | map↔grid toggle, edit mode, action sheet | Modify |
| `apps/web/src/routes/_app/floor/-floor-map.tsx` | map canvas + tiles (extracted) | Create |
| `apps/web/src/routes/_app/order/-builder.tsx` | read `tableId` search param to preselect | Modify |

---

## Task 1: Schema + shared Zod

- [x] **Step 1:** `prisma/schema.prisma` `Table` — add `posX Float?`, `posY Float?`, `shape String @default("square")`.
- [x] **Step 2:** Migrate — `PATH="$HOME/.nvm/versions/node/v24.11.1/bin:$PATH" DATABASE_URL="..." node_modules/.bin/prisma migrate dev --name add_table_layout` from repo root (additive; **no reset** — stop & report if prompted). Run `prisma generate` if needed.
- [x] **Step 3:** `packages/shared/src/schemas/table.ts` — add to `TableSchema`: `posX: z.number().min(0).max(100).nullable().default(null)`, `posY: z.number().min(0).max(100).nullable().default(null)`, `shape: z.enum(['square', 'round']).default('square')`. Add:

```typescript
export const TableLayoutItemSchema = z.object({
  id: z.string().uuid(),
  posX: z.number().min(0).max(100),
  posY: z.number().min(0).max(100),
  shape: z.enum(['square', 'round']),
});
export const SaveTableLayoutSchema = z.object({ tables: z.array(TableLayoutItemSchema) });
export type SaveTableLayoutDto = z.infer<typeof SaveTableLayoutSchema>;
```

- [x] **Step 4:** `pnpm --filter @restaurant/shared build` + `pnpm --filter @restaurant/api run build` → exit 0.
- [x] **Step 5:** Commit (`--no-verify`; `feat: table layout fields (posX/posY/shape) + layout schema`).

---

## Task 2: `saveLayout` service (TDD)

**Interfaces:** Produces `TableService.saveLayout(tables: { id: string; posX: number; posY: number; shape: string }[])` → updates each in a `$transaction`.

- [x] **Step 1: Failing test** — in `table.service.spec.ts` (extend `prismaMock` with `$transaction: jest.fn()` + ensure `table.update` mock):

```typescript
it('saves layout positions for each table in a transaction', async () => {
  prismaMock.$transaction.mockImplementation((ops) => Promise.resolve(ops));
  prismaMock.table.update.mockImplementation((args) => args);

  await service.saveLayout([
    { id: 't1', posX: 10, posY: 20, shape: 'round' },
    { id: 't2', posX: 30, posY: 40, shape: 'square' },
  ]);

  expect(prismaMock.table.update).toHaveBeenCalledWith({ where: { id: 't1' }, data: { posX: 10, posY: 20, shape: 'round' } });
  expect(prismaMock.table.update).toHaveBeenCalledWith({ where: { id: 't2' }, data: { posX: 30, posY: 40, shape: 'square' } });
  expect(prismaMock.$transaction).toHaveBeenCalled();
});
```

- [x] **Step 2: Run → fail.**
- [x] **Step 3: Implement** — add to `TableService`:

```typescript
public saveLayout(tables: { id: string; posX: number; posY: number; shape: string }[]) {
  return this.prisma.$transaction(
    tables.map((t) =>
      this.prisma.table.update({
        where: { id: t.id },
        data: { posX: t.posX, posY: t.posY, shape: t.shape },
      }),
    ),
  );
}
```

- [x] **Step 4: Run → pass.** **Step 5: Commit** (`--no-verify`; `feat(api): bulk table layout save service`).

---

## Task 3: Layout endpoint + DTO + swagger + regen

- [x] **Step 1:** `apps/api/src/table/dto/table.dto.ts` — add `export class SaveTableLayoutDto extends createZodDto(SaveTableLayoutSchema) {}` (import `SaveTableLayoutSchema` from `@restaurant/shared`).
- [x] **Step 2:** `apps/api/src/swagger-dtos.ts` — extend `TableDto` with `@ApiProperty({ type: Number, nullable: true }) posX!: number | null`, same `posY`, and `@ApiProperty({ enum: ['square','round'] }) shape!: string`.
- [x] **Step 3:** `table.controller.ts` — import `SaveTableLayoutDto`; add the endpoint **immediately after `create` and BEFORE `@Patch(':id')`** (route-order matters):

```typescript
@Patch('layout')
@UseGuards(RolesGuard)
@Roles('manager')
@ApiOperation({ summary: 'Save table layout positions' })
@ApiBody({ type: SaveTableLayoutDto })
@ApiResponse({ status: 200, type: [TableDto] })
public saveLayout(@Body() dto: SaveTableLayoutDto) {
  return this.tables.saveLayout(dto.tables);
}
```

- [x] **Step 4:** `pnpm --filter @restaurant/api run build` (exit 0); `pnpm gen:api` (Node 22+/pnpm 10). Confirm `apps/web/src/api/tables/tables.ts` exports `useTableControllerSaveLayout` and `TableDto` carries `posX/posY/shape`.
- [x] **Step 5: Commit** (`git add apps/api/src/table apps/api/src/swagger-dtos.ts apps/web/src/api apps/web/openapi.json`; `--no-verify`; `feat(api): PATCH /tables/layout + regenerate hooks`).

---

## Task 4: Floor map view + map↔grid toggle (read-only)

**Files:** Create `apps/web/src/routes/_app/floor/-floor-map.tsx`; modify `floor/index.tsx`.

- [x] **Step 1:** Read the current `floor/index.tsx` (the Plan-3 dense grid) to reuse its data hook (`useTableControllerGetAll`), status→tone mapping, and `PageHeader`.
- [x] **Step 2:** Create `-floor-map.tsx` exporting `FloorMap({ tables, onTableClick })`: a `relative` canvas (`aspect-[3/2]` or `min-h-[420px]`, `bg-card border rounded-lg overflow-hidden`); each table with non-null `posX/posY` is an absolutely-positioned tile (`style={{ left: \`${posX}%\`, top: \`${posY}%\`, transform: 'translate(-50%,-50%)' }}`), shape `rounded-full` (round) vs `rounded-md` (square), size by `seats` (e.g. `seats<=2 → h-14 w-14`, `<=4 → h-16 w-16`, else `h-20 w-20`), background tinted by status tone, showing `T{number}` + seats. Tables with null position are NOT drawn here (they live in the grid/tray).
- [x] **Step 3:** In `floor/index.tsx` add a **view toggle** (`map` | `grid`, local state; default `map` if any table has `posX != null`, else `grid`). Render `<FloorMap tables=… onTableClick=…>` for map, the existing grid for grid. Keep the summary/PageHeader. Tapping a tile/card calls a shared `onTableClick(table)` (wired in Task 6).
- [x] **Step 4:** `pnpm --filter @restaurant/web run build` (exit 0) + test green. Lead screenshots map + grid. Commit (`--no-verify`; `feat(web): floor map view + map/grid toggle`).

---

## Task 5: Edit-layout drag mode + save

**Files:** Modify `floor/index.tsx`, `-floor-map.tsx`.

- [x] **Step 1:** Add an **"Edit layout"** toggle (manager) to the Floor header. In edit mode, `FloorMap` becomes draggable: track `dragId` on `onPointerDown` of a tile; on the canvas `onPointerMove`, compute `posX = clamp(((e.clientX - rect.left)/rect.width)*100, 0, 100)`, `posY` likewise, and update a local `positions` map; `onPointerUp` clears `dragId`. Unplaced tables show in a **tray** below the canvas; dragging one onto the canvas assigns its first position. A small shape toggle (□/○) appears on each tile in edit mode.
- [x] **Step 2:** "Save layout" → `useTableControllerSaveLayout` with `{ data: { tables: <all tiles with positions> } }` → invalidate `useTableControllerGetAll`; "Cancel" reverts local state. Only the single primary CTA ("Save layout") is accented in edit mode.
- [x] **Step 3:** Build + test green. Lead verifies dragging + save persists (reload). Commit (`--no-verify`; `feat(web): floor layout drag editor + save`).

---

## Task 6: Table action sheet + POS builder preselect

**Files:** Modify `floor/index.tsx`; modify `apps/web/src/routes/_app/order/-builder.tsx`.

- [x] **Step 1:** `onTableClick(table)` (view mode) opens a `Sheet` with:
  - **Start / continue order** `Button` → `navigate({ to: '/order', search: { tableId: table.id } })`.
  - **Current order + running bill:** from `useOrderControllerGetAll`, find this table's order with status ∈ `{draft,sent,in_progress,ready}`; list its items (`{qty}× {name}` + modifier names) and show the running total `Σ (unitPrice + Σ modifier.priceDelta) × quantity`. If none, "No open order."
  - **Status:** buttons to set available / occupied via `useTableControllerSetStatus` → invalidate.
- [x] **Step 2:** In `order/-builder.tsx`, read a `tableId` search param (via the route's `useSearch` or `Route.useSearch`) and, when the builder opens, preselect that table in its table `Select` (and open the builder automatically if `tableId` is present). Keep manual selection working when absent. (Add the optional `tableId` to the `/order` route's `validateSearch` if the route validates search params; otherwise read it loosely.)
- [x] **Step 3:** Build + test green. Lead verifies: tap a table → sheet → "Start order" lands on the builder with the table preselected; bill shows for a table with an order; status change works. Screenshot the action sheet. Commit (`--no-verify`; `feat(web): floor table action sheet + order/bill/status`).

---

## Self-Review

**1. Spec coverage:** posX/posY/shape (§2)→T1; bulk layout API (§3)→T2/T3; map view + grid toggle (§4)→T4; drag edit + save (§4)→T5; action sheet order/bill/status + builder preselect (§4)→T6; testing (§6)→T2 Jest + T4–6 build/screenshot. Deferrals (assign-server/move-party, bg image, zones)→honored. ✓

**2. Placeholder scan:** No TBD/TODO; backend complete code; frontend tasks carry concrete component/hook/positioning math + screenshot acceptance. ✓

**3. Type consistency:** `saveLayout(tables[])` shape (T2) matches `SaveTableLayoutDto.tables` (T1 schema, T3 DTO) and the builder payload (T5). `posX/posY/shape` flow: schema (T1) → `TableDto`/Orval (T3) → map render (T4) + drag (T5). `useTableControllerSaveLayout`/`useTableControllerSetStatus`/`useTableControllerGetAll` used consistently.

**Pre-flight for executor:** confirm whether the `/order` route declares `validateSearch` (T6) — if so, add optional `tableId`; if not, read search loosely. Confirm `$transaction` accepts the array form in this Prisma version (it does — used elsewhere). Keep `floor/index.tsx` under 500 lines by leaning on `-floor-map.tsx` (extract the action sheet too if needed).
