# Menu Modifiers + Station Routing — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development or executing-plans. Checkbox (`- [ ]`) steps. **Execution model: Sonnet.** Backend (Tasks 1–4) is TDD with Jest; frontend (5–6) is visual, screenshot-verified.

**Goal:** Add reusable modifier groups (with options + price deltas) and a fixed kitchen-station field to menu items, with API CRUD and Menu management UI — the catalog that POS entry (2b) and the KDS (2c) will consume.

**Architecture:** New `ModifierGroup`/`ModifierOption` models + a `MenuItemModifierGroup` M2M join + a `KitchenStation` enum field on `MenuItem`. Modifier-group CRUD manages options inline (replace-on-update). Item update gains `station` + `modifierGroupIds` (join synced in a transaction). All in the existing `menu` module. The Menu screen gets an Items/Modifiers tab toggle.

**Tech Stack:** NestJS + Prisma 7 · Jest (`Test.createTestingModule`, plain Prisma mocks) · `@restaurant/shared` Zod · `nestjs-zod` `createZodDto` + `swagger-dtos` for Orval · React + TanStack Router + Plan-1 primitives + shadcn `Tabs`/`Select`/`Switch`/`Input`. pnpm.

## Global Constraints

- Spec: `docs/design-revamp/specs/2026-06-25-menu-modifiers-stations.md`. Stations: `grill | cold | bar | pass`. Selection: `single | multi` + `required`.
- **This feature only defines/manages** modifiers + stations — no order-time consumption (2b) or KDS (2c).
- Prisma migration: run `node_modules/.bin/prisma` from **repo root** with `DATABASE_URL` inline; **never `migrate reset`** (preserve seed data). Additive only here (new tables + nullable column).
- Rebuild shared (`pnpm --filter @restaurant/shared build`) before API tests (`@restaurant/shared` resolves to dist in Jest).
- Never hand-edit `apps/web/src/api/**` — regenerate via `pnpm gen:api`.
- Pre-existing: `notifications.service.spec.ts` has 8 failing tests (web-push mock) — unrelated; ignore.
- Frontend: semantic tokens only; one accent CTA; lucide icons; raw `<button>` needs `type=`.

---

## File Structure

| File | Responsibility | Action |
|------|----------------|--------|
| `prisma/schema.prisma` | enums + ModifierGroup/Option/join + MenuItem.station | Modify |
| `packages/shared/src/schemas/menu.ts` | Zod for stations/modifiers + extend MenuItem | Modify |
| `apps/api/src/menu/menu.service.ts` | modifier-group CRUD; item station + join sync; item reads return modifierGroupIds | Modify |
| `apps/api/src/menu/menu.service.spec.ts` | tests for the above | Modify (create if absent) |
| `apps/api/src/menu/dto/menu.dto.ts` | `CreateModifierGroupDto`/`UpdateModifierGroupDto` | Modify |
| `apps/api/src/swagger-dtos.ts` | `ModifierGroupDto`/`ModifierOptionDto`; extend `MenuItemDto` | Modify |
| `apps/api/src/menu/menu.controller.ts` | modifier-group endpoints | Modify |
| `apps/web/src/routes/_app/menu/index.tsx` | Items/Modifiers tabs; item editor station + attach | Modify |

---

## Task 1: Schema + shared Zod

**Files:** Modify `prisma/schema.prisma`, `packages/shared/src/schemas/menu.ts`.

**Interfaces:** Produces the new models/enum on the Prisma client + the Zod types (`ModifierGroup`, `CreateModifierGroupDto`, `UpdateModifierGroupDto`, `KitchenStation`) and extended `MenuItem`/`UpdateMenuItemDto` consumed by Tasks 2–6.

- [x] **Step 1: Add the Prisma models/enum** (from §2 of the spec — add the two enums, the `station` + `modifierGroups` fields on `MenuItem`, and the three models verbatim).

- [x] **Step 2: Create + apply the migration**

Run from repo root: `DATABASE_URL="$(grep -m1 '^DATABASE_URL' .env 2>/dev/null | cut -d= -f2- | tr -d '"')" node_modules/.bin/prisma migrate dev --name add_menu_modifiers_stations`
(If `.env` isn't present, use the `.env.example` default value.) Expected: new migration applied (all-additive, no data-loss prompt), client regenerated. **If it asks to reset, STOP and report.**

- [x] **Step 3: Extend the shared Zod schemas**

In `packages/shared/src/schemas/menu.ts` add (and extend the existing item schemas):

```typescript
export const KitchenStationSchema = z.enum(['grill', 'cold', 'bar', 'pass']);
export type KitchenStation = z.infer<typeof KitchenStationSchema>;

export const ModifierSelectionTypeSchema = z.enum(['single', 'multi']);
export type ModifierSelectionType = z.infer<typeof ModifierSelectionTypeSchema>;

export const ModifierOptionSchema = z.object({
  id: z.string().uuid(),
  groupId: z.string().uuid(),
  name: z.string().min(1).max(100),
  priceDelta: z.number().default(0),
  sortOrder: z.number().int().nonnegative().default(0),
});
export type ModifierOption = z.infer<typeof ModifierOptionSchema>;

export const CreateModifierOptionSchema = ModifierOptionSchema.omit({ id: true, groupId: true });

export const ModifierGroupSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(100),
  selectionType: ModifierSelectionTypeSchema,
  required: z.boolean().default(false),
  options: z.array(ModifierOptionSchema).default([]),
});
export type ModifierGroup = z.infer<typeof ModifierGroupSchema>;

export const CreateModifierGroupSchema = z.object({
  name: z.string().min(1).max(100),
  selectionType: ModifierSelectionTypeSchema.default('single'),
  required: z.boolean().default(false),
  options: z.array(CreateModifierOptionSchema).default([]),
});
export type CreateModifierGroupDto = z.infer<typeof CreateModifierGroupSchema>;

export const UpdateModifierGroupSchema = CreateModifierGroupSchema.partial();
export type UpdateModifierGroupDto = z.infer<typeof UpdateModifierGroupSchema>;
```

Then extend the item schemas: add `station: KitchenStationSchema.nullable().default(null)` to `MenuItemSchema`; add a read-only `modifierGroupIds: z.array(z.string().uuid()).default([])` to `MenuItemSchema`; keep `CreateMenuItemSchema = MenuItemSchema.omit({ id, createdAt, updatedAt, modifierGroupIds })`; redefine `UpdateMenuItemSchema = CreateMenuItemSchema.partial().extend({ modifierGroupIds: z.array(z.string().uuid()).optional() })`.

- [x] **Step 4: Rebuild shared + verify API builds**

Run: `pnpm --filter @restaurant/shared build` then `pnpm --filter @restaurant/api run build`. Expected: both exit 0.

- [x] **Step 5: Commit**

```bash
git add prisma/schema.prisma prisma/migrations packages/shared/src/schemas/menu.ts
git commit -m "feat: menu modifier + station schema (models, enum, shared zod)"
```

---

## Task 2: Modifier-group CRUD (service + tests)

**Files:** Modify `apps/api/src/menu/menu.service.ts`, `apps/api/src/menu/menu.service.spec.ts`.

**Interfaces:**
- Consumes: Task 1 Prisma models + `CreateModifierGroupDto`/`UpdateModifierGroupDto`.
- Produces: `MenuService.findAllModifierGroups()`, `createModifierGroup(dto)`, `updateModifierGroup(id, dto)`, `removeModifierGroup(id)`.

- [x] **Step 1: Write the failing tests**

In `apps/api/src/menu/menu.service.spec.ts` (create with the standard `Test.createTestingModule` + `prismaMock` pattern if absent), add `modifierGroup` + `modifierOption` to `prismaMock` (`{ findMany, findUnique, create, update, delete }` / `{ deleteMany, createMany }`, plus `$transaction: jest.fn((fn) => fn(prismaMock))`) and:

```typescript
describe('modifier groups', () => {
  it('creates a group with its options inline', async () => {
    prismaMock.modifierGroup.create.mockResolvedValue({ id: 'g1', name: 'Temp', options: [] });
    await service.createModifierGroup({ name: 'Temp', selectionType: 'single', required: true, options: [{ name: 'Rare', priceDelta: 0, sortOrder: 0 }] });
    expect(prismaMock.modifierGroup.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ name: 'Temp', options: { create: expect.any(Array) } }) }),
    );
  });

  it('replaces options on update', async () => {
    prismaMock.modifierGroup.findUnique.mockResolvedValue({ id: 'g1', name: 'Temp' });
    prismaMock.modifierOption.deleteMany.mockResolvedValue({ count: 2 });
    prismaMock.modifierOption.createMany.mockResolvedValue({ count: 1 });
    await service.updateModifierGroup('g1', { options: [{ name: 'Medium', priceDelta: 0, sortOrder: 0 }] });
    expect(prismaMock.modifierOption.deleteMany).toHaveBeenCalledWith({ where: { groupId: 'g1' } });
    expect(prismaMock.modifierOption.createMany).toHaveBeenCalled();
  });
});
```

- [x] **Step 2: Run → fail** — `pnpm --filter @restaurant/api exec jest src/menu/menu.service.spec.ts` (FAIL: methods undefined).

- [x] **Step 3: Implement** — add to `MenuService` (import `CreateModifierGroupDto`, `UpdateModifierGroupDto` from `@restaurant/shared`):

```typescript
public findAllModifierGroups() {
  return this.prisma.modifierGroup.findMany({
    orderBy: { name: 'asc' },
    include: { options: { orderBy: { sortOrder: 'asc' } } },
  });
}

private async findOneModifierGroup(id: string) {
  const group = await this.prisma.modifierGroup.findUnique({ where: { id } });
  if (!group) throw new NotFoundException('Modifier group not found');
  return group;
}

public createModifierGroup(dto: CreateModifierGroupDto) {
  return this.prisma.modifierGroup.create({
    data: {
      name: dto.name,
      selectionType: dto.selectionType,
      required: dto.required,
      options: { create: dto.options.map((o, i) => ({ name: o.name, priceDelta: o.priceDelta, sortOrder: o.sortOrder ?? i })) },
    },
    include: { options: { orderBy: { sortOrder: 'asc' } } },
  });
}

public async updateModifierGroup(id: string, dto: UpdateModifierGroupDto) {
  await this.findOneModifierGroup(id);
  return this.prisma.$transaction(async (tx) => {
    await tx.modifierGroup.update({
      where: { id },
      data: { name: dto.name, selectionType: dto.selectionType, required: dto.required },
    });
    if (dto.options) {
      await tx.modifierOption.deleteMany({ where: { groupId: id } });
      await tx.modifierOption.createMany({
        data: dto.options.map((o, i) => ({ groupId: id, name: o.name, priceDelta: o.priceDelta, sortOrder: o.sortOrder ?? i })),
      });
    }
    return tx.modifierGroup.findUnique({ where: { id }, include: { options: { orderBy: { sortOrder: 'asc' } } } });
  });
}

public async removeModifierGroup(id: string) {
  await this.findOneModifierGroup(id);
  return this.prisma.modifierGroup.delete({ where: { id } });
}
```

- [x] **Step 4: Run → pass.** **Step 5: Commit** (`git add apps/api/src/menu/menu.service.ts apps/api/src/menu/menu.service.spec.ts`; `feat(api): modifier-group CRUD service`).

---

## Task 3: Item station + modifier attach (service + tests)

**Files:** Modify `apps/api/src/menu/menu.service.ts`, `apps/api/src/menu/menu.service.spec.ts`.

**Interfaces:** Produces `findAllItems`/`findOneItem` returning `modifierGroupIds: string[]`; `updateItem(id, dto)` setting `station` + syncing the join.

- [x] **Step 1: Failing tests**

```typescript
describe('item station + modifier attach', () => {
  it('updates station and syncs modifier group join', async () => {
    prismaMock.menuItem.findUnique.mockResolvedValue({ id: 'i1', name: 'Steak', modifierGroups: [{ modifierGroupId: 'g1' }] });
    prismaMock.menuItem.update.mockResolvedValue({ id: 'i1' });
    prismaMock.menuItemModifierGroup = { deleteMany: jest.fn().mockResolvedValue({}), upsert: jest.fn().mockResolvedValue({}) } as never;
    await service.updateItem('i1', { station: 'grill', modifierGroupIds: ['g1', 'g2'] });
    expect(prismaMock.menuItem.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ station: 'grill' }) }));
    expect((prismaMock as never as { menuItemModifierGroup: { upsert: jest.Mock } }).menuItemModifierGroup.upsert).toHaveBeenCalledTimes(2);
  });
});
```

(Ensure `prismaMock.menuItem` includes `findMany`, `findUnique`, `update`; add `menuItemModifierGroup: { deleteMany: jest.fn(), upsert: jest.fn() }` to the base mock.)

- [x] **Step 2: Run → fail.**

- [x] **Step 3: Implement** — replace `findAllItems`, `findOneItem`, `updateItem`:

```typescript
public async findAllItems(categoryId?: string) {
  const items = await this.prisma.menuItem.findMany({
    where: categoryId ? { categoryId } : undefined,
    orderBy: [{ category: { sortOrder: 'asc' } }, { name: 'asc' }],
    include: { modifierGroups: { select: { modifierGroupId: true } } },
  });
  return items.map(({ modifierGroups, ...item }) => ({
    ...item,
    modifierGroupIds: modifierGroups.map((m) => m.modifierGroupId),
  }));
}

public async findOneItem(id: string) {
  const item = await this.prisma.menuItem.findUnique({
    where: { id },
    include: { modifierGroups: { select: { modifierGroupId: true } } },
  });
  if (!item) throw new NotFoundException('Menu item not found');
  const { modifierGroups, ...rest } = item;
  return { ...rest, modifierGroupIds: modifierGroups.map((m) => m.modifierGroupId) };
}

public async updateItem(id: string, dto: UpdateMenuItemDto) {
  await this.findOneItem(id);
  const { modifierGroupIds, ...rest } = dto;
  await this.prisma.$transaction(async (tx) => {
    await tx.menuItem.update({ where: { id }, data: rest });
    if (modifierGroupIds) {
      await tx.menuItemModifierGroup.deleteMany({ where: { menuItemId: id, modifierGroupId: { notIn: modifierGroupIds } } });
      for (const gid of modifierGroupIds) {
        await tx.menuItemModifierGroup.upsert({
          where: { menuItemId_modifierGroupId: { menuItemId: id, modifierGroupId: gid } },
          create: { menuItemId: id, modifierGroupId: gid },
          update: {},
        });
      }
    }
  });
  return this.findOneItem(id);
}
```

- [x] **Step 4: Run → pass; full menu spec green.** **Step 5: Commit** (`feat(api): menu item station + modifier-group attach`).

---

## Task 4: Controller + DTOs + Orval regen

**Files:** Modify `apps/api/src/menu/dto/menu.dto.ts`, `apps/api/src/swagger-dtos.ts`, `apps/api/src/menu/menu.controller.ts`.

- [x] **Step 1: createZodDto wrappers** — in `dto/menu.dto.ts` add:

```typescript
import { CreateModifierGroupSchema, UpdateModifierGroupSchema } from '@restaurant/shared';
export class CreateModifierGroupDto extends createZodDto(CreateModifierGroupSchema) {}
export class UpdateModifierGroupDto extends createZodDto(UpdateModifierGroupSchema) {}
```

- [x] **Step 2: swagger DTOs** — in `swagger-dtos.ts` add `ModifierOptionDto` (`id, groupId, name, priceDelta:number, sortOrder:number`) and `ModifierGroupDto` (`id, name, selectionType:string, required:boolean, options: [ModifierOptionDto]`); extend `MenuItemDto` with `@ApiProperty({ enum: ['grill','cold','bar','pass'], nullable: true }) station!: string | null` and `@ApiProperty({ type: [String] }) modifierGroupIds!: string[]`.

- [x] **Step 3: Controller endpoints** — in `menu.controller.ts` add (import the two DTOs + `ModifierGroupDto`):

```typescript
@Get('modifier-groups')
@ApiOperation({ summary: 'List modifier groups with options' })
@ApiResponse({ status: 200, type: [ModifierGroupDto] })
public getModifierGroups() {
  return this.menu.findAllModifierGroups();
}

@Post('modifier-groups')
@UseGuards(RolesGuard)
@Roles('manager')
@ApiOperation({ summary: 'Create a modifier group' })
@ApiBody({ type: CreateModifierGroupDto })
@ApiResponse({ status: 201, type: ModifierGroupDto })
public createModifierGroup(@Body() dto: CreateModifierGroupDto) {
  return this.menu.createModifierGroup(dto);
}

@Patch('modifier-groups/:id')
@UseGuards(RolesGuard)
@Roles('manager')
@ApiOperation({ summary: 'Update a modifier group' })
@ApiBody({ type: UpdateModifierGroupDto })
@ApiResponse({ status: 200, type: ModifierGroupDto })
public updateModifierGroup(@Param('id') id: string, @Body() dto: UpdateModifierGroupDto) {
  return this.menu.updateModifierGroup(id, dto);
}

@Delete('modifier-groups/:id')
@UseGuards(RolesGuard)
@Roles('manager')
@HttpCode(HttpStatus.NO_CONTENT)
@ApiOperation({ summary: 'Delete a modifier group' })
public removeModifierGroup(@Param('id') id: string) {
  return this.menu.removeModifierGroup(id);
}
```

(The existing `updateItem` endpoint already passes the DTO through — now carrying `station` + `modifierGroupIds`.)

- [x] **Step 4: Build + regenerate** — `pnpm --filter @restaurant/api run build` (exit 0), then `pnpm gen:api`. Confirm `apps/web/src/api/menu/menu.ts` now exports `useMenuControllerGetModifierGroups` + mutation hooks.

- [x] **Step 5: Commit** (`git add apps/api/src/menu apps/api/src/swagger-dtos.ts apps/web/src/api apps/web/openapi.json`; `feat(api): modifier-group endpoints + regenerate hooks`).

---

## Task 5: Menu UI — Items/Modifiers tabs + Modifiers management

**Files:** Modify `apps/web/src/routes/_app/menu/index.tsx`.

- [x] **Step 1:** Add a `Tabs` toggle (`Items` | `Modifiers`) under the `PageHeader`. `Items` renders the existing category-sidebar + grid unchanged. `Modifiers` renders a dense list of groups (via `useMenuControllerGetModifierGroups`) — each `ListRow` shows name + `selectionType`/`required` badges + option count, with edit/delete. A "New group" `Button` (single accent CTA on this tab) and an editor `Sheet`: `Input` name, a single/multi `Select` (or `Switch`), a `required` `Switch`, and an editable options list (rows of `Input` name + number `Input` priceDelta, add/remove). Save → `useMenuControllerCreateModifierGroup`/`...Update`; delete → `...Delete` with a confirm `Dialog`. Invalidate the groups query on success.

- [x] **Step 2:** Verify `pnpm --filter @restaurant/web run build` (exit 0) + `pnpm --filter @restaurant/web run test` green. Use the `run-web` skill: Menu → Modifiers tab; create a group "Cooking temp" (single, required) with options Rare/Medium/Well. Screenshot.

- [x] **Step 3: Commit** (`feat(web): menu Modifiers tab (group + option management)`).

---

## Task 6: Menu UI — item editor station + attach groups

**Files:** Modify `apps/web/src/routes/_app/menu/index.tsx`.

- [x] **Step 1:** In the add/edit item `Sheet`, add a **Station** `Select` (None / grill / cold / bar / pass, bound to `station`) and an **attach modifier groups** control — a checklist of the groups from `useMenuControllerGetModifierGroups`, bound to `modifierGroupIds`. On save, include `station` + `modifierGroupIds` in the `useMenuControllerUpdateItem` payload (and `station` in create). Pre-fill from the item's current `station`/`modifierGroupIds` when editing.

- [x] **Step 2:** Verify build + test green. Use `run-web`: edit an item → set station = grill, attach "Cooking temp" → save → reopen and confirm it persisted. Screenshot the editor.

- [x] **Step 3: Commit** (`feat(web): item editor station + modifier-group attach`).

---

## Self-Review

**1. Spec coverage:** schema/enum/models (§2)→T1; shared Zod (§3)→T1; modifier-group CRUD + item station/attach API (§4)→T2/T3/T4; Menu Items/Modifiers UI (§5)→T5/T6; testing (§7)→T2/T3 Jest + T5/T6 build+screenshot. Deferrals (§6: order-time consumption, KDS, min/max) honored — none built here. ✓

**2. Placeholder scan:** No TBD/TODO; backend tasks carry complete code; frontend tasks name concrete hooks/primitives + screenshot acceptance. ✓

**3. Type consistency:** `CreateModifierGroupDto`/`UpdateModifierGroupDto` defined in T1 (shared), wrapped in T4 (dto), consumed in T2 service. `modifierGroupIds`/`station` flow: shared `UpdateMenuItemSchema` (T1) → service `updateItem` (T3) → controller passthrough (T4) → UI (T6). `findAll/OneItem` return `modifierGroupIds` (T3) consumed by the item editor pre-fill (T6). Generated hook names (`useMenuControllerGetModifierGroups` etc.) used consistently T5/T6.

**Pre-flight for executor:** confirm the Prisma composite-unique accessor name is `menuItemId_modifierGroupId` (Prisma's default for the `@@id([menuItemId, modifierGroupId])`); if Prisma named it differently, use the generated name. Read the current item editor `Sheet` in `menu/index.tsx` before extending it (T6).
