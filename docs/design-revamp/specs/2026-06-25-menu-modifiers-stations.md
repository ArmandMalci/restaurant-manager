# Menu Modifiers + Station Routing — Design Spec

> Track 2, feature #2a (first of the 3-way Order+KDS split). Defines reusable modifier groups, item modifier attachments, and kitchen-station routing on menu items — the catalog that POS order entry (2b) and the KDS (2c) will consume. Approved 2026-06-25.

## 1. Overview

Extend the menu catalog so items can carry **kitchen-station routing** and **reusable modifier groups** (e.g. "Cooking temperature" → Rare/Medium/Well; "Add-ons" → +Egg/+Bacon with price deltas). This feature *defines and manages* modifiers/stations via the Menu screen; it does **not** change order creation or build the KDS — those are features 2b and 2c. No order-time consumption here.

**Primary user / device:** manager, back-office desktop (catalog management).

## 2. Schema changes (one Prisma migration)

```prisma
enum KitchenStation { grill cold bar pass }
enum ModifierSelectionType { single multi }

// MenuItem — add:
  station        KitchenStation?
  modifierGroups MenuItemModifierGroup[]

model ModifierGroup {
  id            String                @id @default(uuid())
  name          String
  selectionType ModifierSelectionType @default(single)
  required      Boolean               @default(false)
  createdAt     DateTime              @default(now())
  updatedAt     DateTime              @updatedAt
  options       ModifierOption[]
  menuItems     MenuItemModifierGroup[]
  @@map("modifier_groups")
}

model ModifierOption {
  id         String        @id @default(uuid())
  groupId    String
  name       String
  priceDelta Decimal       @default(0) @db.Decimal(10, 2)
  sortOrder  Int           @default(0)
  group      ModifierGroup @relation(fields: [groupId], references: [id], onDelete: Cascade)
  @@map("modifier_options")
}

model MenuItemModifierGroup {
  menuItemId      String
  modifierGroupId String
  sortOrder       Int           @default(0)
  menuItem        MenuItem      @relation(fields: [menuItemId], references: [id], onDelete: Cascade)
  modifierGroup   ModifierGroup @relation(fields: [modifierGroupId], references: [id], onDelete: Cascade)
  @@id([menuItemId, modifierGroupId])
  @@map("menu_item_modifier_groups")
}
```

All additive; `station` nullable; existing rows unaffected. Cascade deletes keep the join + options consistent. (Migration workflow per the project note: run `node_modules/.bin/prisma` from repo root with `DATABASE_URL` inline; never `migrate reset`.)

## 3. Shared Zod (`packages/shared/src/schemas/menu.ts`)

Add (following the existing pattern — `z.enum`, `z.coerce.date()`, `Create*`/`Update*` via `.omit`/`.partial`):
- `KitchenStationSchema = z.enum(['grill','cold','bar','pass'])`
- `ModifierSelectionTypeSchema = z.enum(['single','multi'])`
- `ModifierOptionSchema` = `{ id, groupId, name (1–100), priceDelta (number, ≥ -10000), sortOrder (int ≥0) }`; `CreateModifierOptionSchema` omits `id`,`groupId` (created inline under a group).
- `ModifierGroupSchema` = `{ id, name (1–100), selectionType, required (bool), options: ModifierOptionSchema[] }`; `CreateModifierGroupSchema` = `{ name, selectionType, required, options: CreateModifierOptionSchema[] }`; `UpdateModifierGroupSchema = CreateModifierGroupSchema.partial()`.
- Extend `MenuItemSchema`: add `station: KitchenStationSchema.nullable().default(null)` and (read side) `modifierGroupIds: z.array(z.string().uuid()).default([])`. Extend `UpdateMenuItemSchema` to accept `station` + `modifierGroupIds`.

Re-export is automatic (menu.ts is already in `index.ts`). Rebuild shared (`pnpm --filter @restaurant/shared build`) before API tests.

## 4. API (extend the existing `menu` module)

Endpoints (mirror the menu controller's `@ApiBody`/`@ApiResponse` + `createZodDto` two-layer pattern; add swagger DTOs for Orval):
- `GET  /menu/modifier-groups` → `ModifierGroupDto[]` (each with nested `options[]`, options sorted by `sortOrder`).
- `POST /menu/modifier-groups` (manager) → create a group **with its options inline** (`CreateModifierGroupDto`).
- `PATCH /menu/modifier-groups/:id` (manager) → update group; **options are replaced wholesale** from the payload (delete-and-recreate the group's options in a transaction — simplest correct sync for v1).
- `DELETE /menu/modifier-groups/:id` (manager) → cascade-deletes options + join rows.
- Extend `PATCH /menu/items/:id` to accept `station` and `modifierGroupIds`: the service sets `station` and **syncs** the `MenuItemModifierGroup` join (delete rows not in the list, create missing ones) in a transaction. `GET /menu/items` returns each item's `modifierGroupIds` (+ `station`).

Service methods live in `MenuService` (or a focused `ModifierService` in the menu module if `MenuService` grows past ~200 lines — split then). Run `pnpm gen:api` to regenerate web hooks (`useMenuControllerGetModifierGroups`, etc.).

## 5. Menu UI (`apps/web/src/routes/_app/menu/index.tsx`)

Add a **tab toggle** at the top: **Items** (default) and **Modifiers**.
- **Items tab:** the existing category-sidebar + item grid (unchanged), but the add/edit item sheet gains: a **Station** `Select` (grill/cold/bar/pass + "None") and an **attach modifier groups** control (multi-select / checklist of existing groups). Saves via the extended `PATCH /menu/items/:id`.
- **Modifiers tab:** a dense list of modifier groups; create/edit a group in a sheet — `name`, `selectionType` (single/multi toggle), `required` (switch), and an editable **options** list (each: name + `priceDelta` number, add/remove rows, reorder by `sortOrder`). Delete with a confirm.
- Warm-canvas system + Plan-1 primitives (`PageHeader`, `Tabs`, `Card`, `ListRow`, `Button`, `Input`, `Switch`, `Select`). One accent CTA per view.

## 6. Deferred (out of scope for 2a)

- **Order-time modifier selection** (choosing options when adding an item to an order) → feature 2b (POS order entry); requires storing selected options on `OrderItem`.
- **KDS station filtering / display** → feature 2c.
- Modifier `min/max` selection counts (beyond single/multi + required); nested/conditional modifiers; per-item price overrides of options.

## 7. Testing

- **API (Jest):** create group-with-options (options persisted + sorted); update group replaces options; delete group cascades (options + join rows gone); `PATCH /menu/items/:id` sets `station` and syncs the join (add + remove); `GET /menu/items` returns `station` + `modifierGroupIds`.
- **Web:** build green; Menu tabs render; create a group + attach it to an item (screenshot Items + Modifiers tabs).

## 8. Open assumptions

- Options are managed **inline** within their group's create/update payload (no separate option endpoints) — wholesale replace on update.
- `priceDelta` can be negative (discounts) — schema allows it; default 0.
- A modifier group with zero options is allowed (a group being built up); order-time validation of `required`/`selectionType` is 2b's concern, not enforced here.
- `station = null` means unassigned (KDS in 2c will treat unassigned as `pass` or surface it separately — decided in 2c).
