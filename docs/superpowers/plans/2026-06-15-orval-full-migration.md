# Orval Full Migration — All Remaining Modules

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace all remaining hand-written React Query wrappers in `apps/web/src/lib/` with Orval-generated hooks across every page that still uses them.

**Architecture:** Each page in `apps/web/src/routes/_app/` currently imports from hand-written lib files (`@/lib/*-api`). Orval has already generated typed hooks for every domain in `apps/web/src/api/*/`. The migration pattern is identical to the completed menu module: swap imports, update call signatures, use Orval invalidation helpers, delete lib files once all consumers are migrated.

**Mutation call signature change (universal):**
- Legacy: `.mutate(id)` → Orval: `.mutate({ id })`
- Legacy: `.mutate({ id, dto })` → Orval: `.mutate({ id, data: dto })`
- Legacy: `.mutate(dto)` → Orval: `.mutate({ data: dto })`
- Invalidation: `qc.invalidateQueries({ queryKey: [...] })` → `invalidateXxxControllerYyy(qc)`

**Tech Stack:** React, TanStack React Query v5, Orval v8.17.0, TypeScript, Vitest

---

## Hook name mapping reference

| Legacy hook | Orval hook | Import path |
|---|---|---|
| `useSettings()` | `useSettingsControllerGet()` | `@/api/settings/settings` |
| `useUpdateSettings()` | `useSettingsControllerUpdate()` | `@/api/settings/settings` |
| `useReportSummary()` | `useReportsControllerGetSummary()` | `@/api/reports/reports` |
| `useInventory()` | `useInventoryControllerFindAll()` | `@/api/inventory/inventory` |
| `useCreateInventoryItem()` | `useInventoryControllerCreate()` | `@/api/inventory/inventory` |
| `useUpdateInventoryItem()` | `useInventoryControllerUpdate()` | `@/api/inventory/inventory` |
| `useDeleteInventoryItem()` | `useInventoryControllerRemove()` | `@/api/inventory/inventory` |
| `useAdjustInventory()` | `useInventoryControllerAdjust()` | `@/api/inventory/inventory` |
| `useBill(id)` | `useBillingControllerFindOne(id, { query: { enabled: !!id } })` | `@/api/billing/billing` |
| `useCreateBill()` | `useBillingControllerCreate()` | `@/api/billing/billing` |
| `usePayBill()` | `useBillingControllerPay()` | `@/api/billing/billing` |
| `useTables()` | `useTableControllerGetAll()` | `@/api/tables/tables` |
| `useCreateTable()` | `useTableControllerCreate()` | `@/api/tables/tables` |
| `useUpdateTable()` | `useTableControllerUpdate()` | `@/api/tables/tables` |
| `useDeleteTable()` | `useTableControllerRemove()` | `@/api/tables/tables` |
| `useSetTableStatus()` | `useTableControllerSetStatus()` | `@/api/tables/tables` |
| `useOrders(status?)` | `useOrderControllerGetAll(status ? { status } : undefined)` | `@/api/orders/orders` |
| `useCreateOrder()` | `useOrderControllerCreate()` | `@/api/orders/orders` |
| `useUpdateOrderStatus()` | `useOrderControllerUpdateStatus()` | `@/api/orders/orders` |
| `useUpdateItemStatus()` | `useOrderControllerUpdateItemStatus()` | `@/api/orders/orders` |
| `useDeleteOrder()` | `useOrderControllerRemove()` | `@/api/orders/orders` |
| `useReservations(date?)` | `useReservationControllerGetAll(date ? { date } : undefined)` | `@/api/reservations/reservations` |
| `useCreateReservation()` | `useReservationControllerCreate()` | `@/api/reservations/reservations` |
| `useUpdateReservation()` | `useReservationControllerUpdate()` | `@/api/reservations/reservations` |
| `useDeleteReservation()` | `useReservationControllerRemove()` | `@/api/reservations/reservations` |
| `useStaff(role?)` | `useStaffControllerGetAll(role ? { role } : undefined)` | `@/api/staff/staff` |
| `useCreateStaff()` | `useStaffControllerCreate()` | `@/api/staff/staff` |
| `useUpdateStaff()` | `useStaffControllerUpdate()` | `@/api/staff/staff` |
| `useDeleteStaff()` | `useStaffControllerRemove()` | `@/api/staff/staff` |
| `useSetStaffActive()` | `useStaffControllerSetActive()` | `@/api/staff/staff` |
| `useShifts(from?, to?)` | `useShiftControllerGetAll(from || to ? { from, to } : undefined)` | `@/api/shifts/shifts` |
| `useCreateShift()` | `useShiftControllerCreate()` | `@/api/shifts/shifts` |
| `useUpdateShift()` | `useShiftControllerUpdate()` | `@/api/shifts/shifts` |
| `useDeleteShift()` | `useShiftControllerRemove()` | `@/api/shifts/shifts` |

## Invalidation helper reference

| Domain | Orval helper |
|---|---|
| settings | `invalidateSettingsControllerGet(qc)` |
| reports | `invalidateReportsControllerGetSummary(qc)` |
| inventory | `invalidateInventoryControllerFindAll(qc)` |
| billing | `invalidateBillingControllerFindOne(qc, id)` |
| tables | `invalidateTableControllerGetAll(qc)` |
| orders | `invalidateOrderControllerGetAll(qc)` |
| reservations | `invalidateReservationControllerGetAll(qc)` |
| staff | `invalidateStaffControllerGetAll(qc)` |
| shifts | `invalidateShiftControllerGetAll(qc)` |

---

### Task 1: Migrate settings page

**Files:**
- Modify: `apps/web/src/routes/_app/settings/index.tsx`
- Delete: `apps/web/src/lib/settings-api.ts` (only consumer)

The settings page imports `useSettings` and `useUpdateSettings` from `@/lib/settings-api`.

- [ ] **Step 1: Read the current file**

```bash
cat apps/web/src/routes/_app/settings/index.tsx
```

- [ ] **Step 2: Replace imports**

Remove:
```typescript
import { useSettings, useUpdateSettings } from '@/lib/settings-api';
```

Add:
```typescript
import { useQueryClient } from '@tanstack/react-query';
import {
  useSettingsControllerGet,
  useSettingsControllerUpdate,
  invalidateSettingsControllerGet,
} from '@/api/settings/settings';
```

- [ ] **Step 3: Update hook calls in the component**

Replace:
```typescript
const { data: settings, isLoading } = useSettings();
const update = useUpdateSettings();
```

With:
```typescript
const qc = useQueryClient();
const { data: settings, isLoading } = useSettingsControllerGet();
const update = useSettingsControllerUpdate({
  mutation: { onSuccess: () => invalidateSettingsControllerGet(qc) },
});
```

- [ ] **Step 4: Update mutation call site**

The `update.mutate(...)` call passes a flat settings object. With Orval it needs wrapping in `{ data: ... }`:

Find:
```typescript
update.mutate({ name, description, phone, email, address, openingHours })
```
(or similar — adapt to what you see in the file)

Replace with:
```typescript
update.mutate({ data: { name, description, phone, email, address, openingHours } })
```

- [ ] **Step 5: Verify TypeScript**

```bash
npx tsc -p apps/web/tsconfig.json --noEmit
```

Expected: no errors.

- [ ] **Step 6: Delete lib file**

```bash
grep -r "settings-api" apps/web/src/ && echo "STILL USED" || rm apps/web/src/lib/settings-api.ts
```

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/routes/_app/settings/index.tsx
git add -u apps/web/src/lib/settings-api.ts
git commit -m "refactor(web): migrate settings page to Orval hooks"
```

---

### Task 2: Migrate reports page

**Files:**
- Modify: `apps/web/src/routes/_app/reports/index.tsx`
- Delete: `apps/web/src/lib/reports-api.ts` (only consumer)

- [ ] **Step 1: Read the current file**

```bash
cat apps/web/src/routes/_app/reports/index.tsx
```

- [ ] **Step 2: Replace imports**

Remove:
```typescript
import { useReportSummary } from '@/lib/reports-api';
```

Add:
```typescript
import { useReportsControllerGetSummary } from '@/api/reports/reports';
```

- [ ] **Step 3: Update hook call**

Replace:
```typescript
const { data, isLoading, refetch, isFetching } = useReportSummary();
```

With:
```typescript
const { data, isLoading, refetch, isFetching } = useReportsControllerGetSummary();
```

(Preserve the exact destructured names — only the hook name changes.)

- [ ] **Step 4: Verify TypeScript**

```bash
npx tsc -p apps/web/tsconfig.json --noEmit
```

- [ ] **Step 5: Delete lib file**

```bash
grep -r "reports-api" apps/web/src/ && echo "STILL USED" || rm apps/web/src/lib/reports-api.ts
```

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/routes/_app/reports/index.tsx
git add -u apps/web/src/lib/reports-api.ts
git commit -m "refactor(web): migrate reports page to Orval hooks"
```

---

### Task 3: Migrate inventory page

**Files:**
- Modify: `apps/web/src/routes/_app/inventory/index.tsx`
- Delete: `apps/web/src/lib/inventory-api.ts` (only consumer)

Legacy hooks used:
```
useInventory() → destructures: data (InventoryItemWithStatus[]), isLoading
useCreateInventoryItem() → .mutate(dto)
useUpdateInventoryItem() → .mutate({ id, dto })
useDeleteInventoryItem() → .mutate(id)
useAdjustInventory() → .mutate({ id, dto }, { onSuccess })
```

- [ ] **Step 1: Read the current file**

```bash
cat apps/web/src/routes/_app/inventory/index.tsx
```

- [ ] **Step 2: Replace imports**

Remove the entire `@/lib/inventory-api` import block.

Add:
```typescript
import { useQueryClient } from '@tanstack/react-query';
import {
  useInventoryControllerFindAll,
  useInventoryControllerCreate,
  useInventoryControllerUpdate,
  useInventoryControllerRemove,
  useInventoryControllerAdjust,
  invalidateInventoryControllerFindAll,
} from '@/api/inventory/inventory';
```

- [ ] **Step 3: Add queryClient and replace hook calls**

Add `const qc = useQueryClient();` at the top of the component.

Replace each hook:
```typescript
// Query
const { data = [], isLoading } = useInventoryControllerFindAll();

// Mutations — all use onSuccess: () => invalidateInventoryControllerFindAll(qc)
const createItem = useInventoryControllerCreate({
  mutation: { onSuccess: () => invalidateInventoryControllerFindAll(qc) },
});
const updateItem = useInventoryControllerUpdate({
  mutation: { onSuccess: () => invalidateInventoryControllerFindAll(qc) },
});
const deleteItem = useInventoryControllerRemove({
  mutation: { onSuccess: () => invalidateInventoryControllerFindAll(qc) },
});
const adjustItem = useInventoryControllerAdjust({
  mutation: { onSuccess: () => invalidateInventoryControllerFindAll(qc) },
});
```

- [ ] **Step 4: Update mutation call sites**

Every `.mutate(...)` call changes signature:
- `createItem.mutate(dto)` → `createItem.mutate({ data: dto })`
- `updateItem.mutate({ id, dto })` → `updateItem.mutate({ id, data: dto })`
- `deleteItem.mutate(id)` → `deleteItem.mutate({ id })`
- `adjustItem.mutate({ id, dto }, { onSuccess })` → `adjustItem.mutate({ id, data: dto }, { onSuccess })`

Note: if `onSuccess` was previously baked into the legacy hook definition (not passed at call site), move it into the mutation hook's `onSuccess` option instead.

- [ ] **Step 5: Verify TypeScript**

```bash
npx tsc -p apps/web/tsconfig.json --noEmit
```

- [ ] **Step 6: Delete lib file**

```bash
grep -r "inventory-api" apps/web/src/ && echo "STILL USED" || rm apps/web/src/lib/inventory-api.ts
```

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/routes/_app/inventory/index.tsx
git add -u apps/web/src/lib/inventory-api.ts
git commit -m "refactor(web): migrate inventory page to Orval hooks"
```

---

### Task 4: Migrate billing page

**Files:**
- Modify: `apps/web/src/routes/_app/billing/index.tsx`
- Delete: `apps/web/src/lib/billing-api.ts` (only consumer)

Legacy hooks:
```
useBill(lookupId) → data, isLoading, isError — conditional query (enabled: !!lookupId)
useCreateBill() → .mutate({ orderId, discountPct }, { onSuccess, onError })
usePayBill() → .mutate(bill.id)
```

Orval mutation signatures:
- `useBillingControllerCreate().mutate({ data: { orderId, discountPct } })`
- `useBillingControllerPay().mutate({ id })`

- [ ] **Step 1: Read the current file**

```bash
cat apps/web/src/routes/_app/billing/index.tsx
```

- [ ] **Step 2: Replace imports**

Remove:
```typescript
import { useBill, useCreateBill, usePayBill } from '@/lib/billing-api';
```

Add:
```typescript
import { useQueryClient } from '@tanstack/react-query';
import {
  useBillingControllerFindOne,
  useBillingControllerCreate,
  useBillingControllerPay,
  invalidateBillingControllerFindOne,
  invalidateOrderControllerGetAll,
} from '@/api/billing/billing';
import { invalidateOrderControllerGetAll } from '@/api/orders/orders';
```

(Import `invalidateOrderControllerGetAll` from orders because `useCreateBill` in the legacy code also invalidated the orders query — replicate that.)

**Corrected imports** (fix the duplicate):
```typescript
import { useQueryClient } from '@tanstack/react-query';
import {
  useBillingControllerFindOne,
  useBillingControllerCreate,
  useBillingControllerPay,
  invalidateBillingControllerFindOne,
} from '@/api/billing/billing';
import { invalidateOrderControllerGetAll } from '@/api/orders/orders';
```

- [ ] **Step 3: Update hook calls**

```typescript
const qc = useQueryClient();

// Conditional query — only fires when lookupId is set
const { data: bill, isLoading, isError } = useBillingControllerFindOne(
  lookupId ?? '',
  { query: { enabled: !!lookupId } },
);

const createBill = useBillingControllerCreate({
  mutation: {
    onSuccess: (newBill) => {
      // Replicate legacy behavior: update the bill query and invalidate orders
      invalidateBillingControllerFindOne(qc, newBill.id);
      invalidateOrderControllerGetAll(qc);
    },
  },
});

const payBill = useBillingControllerPay({
  mutation: {
    onSuccess: () => bill && invalidateBillingControllerFindOne(qc, bill.id),
  },
});
```

- [ ] **Step 4: Update mutation call sites**

- `createBill.mutate({ orderId, discountPct }, { onSuccess, onError })` → `createBill.mutate({ data: { orderId, discountPct } }, { onSuccess, onError })`
- `payBill.mutate(bill.id)` → `payBill.mutate({ id: bill.id })`

- [ ] **Step 5: Verify TypeScript**

```bash
npx tsc -p apps/web/tsconfig.json --noEmit
```

- [ ] **Step 6: Delete lib file**

```bash
grep -r "billing-api" apps/web/src/ && echo "STILL USED" || rm apps/web/src/lib/billing-api.ts
```

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/routes/_app/billing/index.tsx
git add -u apps/web/src/lib/billing-api.ts
git commit -m "refactor(web): migrate billing page to Orval hooks"
```

---

### Task 5: Migrate tables page

**Files:**
- Modify: `apps/web/src/routes/_app/tables/index.tsx`
- Note: `table-api.ts` is also used by `reservations/index.tsx` and `orders/index.tsx` — do NOT delete yet

Legacy hooks:
```
useTables() → data (Table[])
useCreateTable() → .mutate({ number, seats, status })
useUpdateTable() → .mutate({ id, dto })
useDeleteTable() → .mutate(id)
useSetTableStatus() → .mutate({ id, dto })
```

- [ ] **Step 1: Read the current file**

```bash
cat apps/web/src/routes/_app/tables/index.tsx
```

- [ ] **Step 2: Replace imports**

Remove the `@/lib/table-api` import block.

Add:
```typescript
import { useQueryClient } from '@tanstack/react-query';
import {
  useTableControllerGetAll,
  useTableControllerCreate,
  useTableControllerUpdate,
  useTableControllerRemove,
  useTableControllerSetStatus,
  invalidateTableControllerGetAll,
} from '@/api/tables/tables';
```

- [ ] **Step 3: Update hook calls**

```typescript
const qc = useQueryClient();
const { data: tables = [] } = useTableControllerGetAll();

const createTable = useTableControllerCreate({
  mutation: { onSuccess: () => invalidateTableControllerGetAll(qc) },
});
const updateTable = useTableControllerUpdate({
  mutation: { onSuccess: () => invalidateTableControllerGetAll(qc) },
});
const deleteTable = useTableControllerRemove({
  mutation: { onSuccess: () => invalidateTableControllerGetAll(qc) },
});
const setTableStatus = useTableControllerSetStatus({
  mutation: { onSuccess: () => invalidateTableControllerGetAll(qc) },
});
```

- [ ] **Step 4: Update mutation call sites**

- `createTable.mutate({ number, seats, status })` → `createTable.mutate({ data: { number, seats, status } })`
- `updateTable.mutate({ id, dto })` → `updateTable.mutate({ id, data: dto })`
- `deleteTable.mutate(id)` → `deleteTable.mutate({ id })`
- `setTableStatus.mutate({ id, dto })` → `setTableStatus.mutate({ id, data: dto })`

- [ ] **Step 5: Verify TypeScript**

```bash
npx tsc -p apps/web/tsconfig.json --noEmit
```

- [ ] **Step 6: Commit (do NOT delete table-api.ts — still used by reservations and orders)**

```bash
git add apps/web/src/routes/_app/tables/index.tsx
git commit -m "refactor(web): migrate tables page to Orval hooks"
```

---

### Task 6: Migrate orders page (order-api + table-api reference)

**Files:**
- Modify: `apps/web/src/routes/_app/orders/index.tsx`
- Delete: `apps/web/src/lib/order-api.ts` (only consumer)
- Check and delete: `apps/web/src/lib/table-api.ts` if all 3 consumers done

The orders page imports from BOTH `@/lib/order-api` AND `@/lib/table-api`.

Legacy hooks:
```
useOrders(statusFilter) → data (Order[]), isLoading
useCreateOrder() → .mutate({ tableId, notes, items }, { onSuccess })
useUpdateOrderStatus() → .mutate({ id, dto })
useUpdateItemStatus() → .mutate({ orderId, itemId, dto })   ← note: orderId maps to Orval's `id`
useDeleteOrder() → .mutate(id)
useTables() → data (Table[])  [from table-api]
```

Orval `useOrderControllerUpdateItemStatus` signature: `mutate({ id: orderId, itemId, data: dto })`

- [ ] **Step 1: Read the current file**

```bash
cat apps/web/src/routes/_app/orders/index.tsx
```

- [ ] **Step 2: Replace imports**

Remove `@/lib/order-api` and `@/lib/table-api` imports.

Add:
```typescript
import { useQueryClient } from '@tanstack/react-query';
import {
  useOrderControllerGetAll,
  useOrderControllerCreate,
  useOrderControllerUpdateStatus,
  useOrderControllerUpdateItemStatus,
  useOrderControllerRemove,
  invalidateOrderControllerGetAll,
} from '@/api/orders/orders';
import { useTableControllerGetAll } from '@/api/tables/tables';
```

- [ ] **Step 3: Update hook calls**

```typescript
const qc = useQueryClient();
const { data: orders = [], isLoading } = useOrderControllerGetAll(
  statusFilter ? { status: statusFilter } : undefined,
);
const { data: tables = [] } = useTableControllerGetAll();

const createOrder = useOrderControllerCreate({
  mutation: { onSuccess: () => invalidateOrderControllerGetAll(qc) },
});
const updateOrderStatus = useOrderControllerUpdateStatus({
  mutation: { onSuccess: () => invalidateOrderControllerGetAll(qc) },
});
const updateItemStatus = useOrderControllerUpdateItemStatus({
  mutation: { onSuccess: () => invalidateOrderControllerGetAll(qc) },
});
const deleteOrder = useOrderControllerRemove({
  mutation: { onSuccess: () => invalidateOrderControllerGetAll(qc) },
});
```

- [ ] **Step 4: Update mutation call sites**

- `createOrder.mutate({ tableId, notes, items }, { onSuccess })` → `createOrder.mutate({ data: { tableId, notes, items } }, { onSuccess })`
- `updateOrderStatus.mutate({ id, dto })` → `updateOrderStatus.mutate({ id, data: dto })`
- `updateItemStatus.mutate({ orderId, itemId, dto })` → `updateItemStatus.mutate({ id: orderId, itemId, data: dto })`
- `deleteOrder.mutate(id)` → `deleteOrder.mutate({ id })`

- [ ] **Step 5: Verify TypeScript**

```bash
npx tsc -p apps/web/tsconfig.json --noEmit
```

- [ ] **Step 6: Delete order-api.ts; attempt table-api.ts**

```bash
grep -r "order-api" apps/web/src/ && echo "STILL USED" || rm apps/web/src/lib/order-api.ts
grep -r "table-api" apps/web/src/ && echo "table-api still used (that's ok)" || rm apps/web/src/lib/table-api.ts
```

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/routes/_app/orders/index.tsx
git add -u apps/web/src/lib/order-api.ts apps/web/src/lib/table-api.ts 2>/dev/null; true
git commit -m "refactor(web): migrate orders page to Orval hooks"
```

---

### Task 7: Migrate reservations page

**Files:**
- Modify: `apps/web/src/routes/_app/reservations/index.tsx`
- Note: `reservation-api.ts` also used by `calendar/index.tsx` — do NOT delete yet
- Check and delete: `apps/web/src/lib/table-api.ts` if now no remaining consumers

Legacy hooks:
```
useReservations(dateFilter) → data (Reservation[]), isLoading
useCreateReservation() → .mutate(data as never, { onSuccess })
useUpdateReservation() → .mutate({ id, dto })
useDeleteReservation() → .mutate(id)
useTables() → data (Table[])  [from table-api]
```

- [ ] **Step 1: Read the current file**

```bash
cat apps/web/src/routes/_app/reservations/index.tsx
```

- [ ] **Step 2: Replace imports**

Remove `@/lib/reservation-api` and `@/lib/table-api` imports.

Add:
```typescript
import { useQueryClient } from '@tanstack/react-query';
import {
  useReservationControllerGetAll,
  useReservationControllerCreate,
  useReservationControllerUpdate,
  useReservationControllerRemove,
  invalidateReservationControllerGetAll,
} from '@/api/reservations/reservations';
import { useTableControllerGetAll } from '@/api/tables/tables';
```

- [ ] **Step 3: Update hook calls**

```typescript
const qc = useQueryClient();
const { data: reservations = [], isLoading } = useReservationControllerGetAll(
  dateFilter ? { date: dateFilter } : undefined,
);
const { data: tables = [] } = useTableControllerGetAll();

const createReservation = useReservationControllerCreate({
  mutation: { onSuccess: () => invalidateReservationControllerGetAll(qc) },
});
const updateReservation = useReservationControllerUpdate({
  mutation: { onSuccess: () => invalidateReservationControllerGetAll(qc) },
});
const deleteReservation = useReservationControllerRemove({
  mutation: { onSuccess: () => invalidateReservationControllerGetAll(qc) },
});
```

- [ ] **Step 4: Update mutation call sites**

- `createReservation.mutate(data as never, { onSuccess })` → `createReservation.mutate({ data }, { onSuccess })`  
  (The `as never` was a type workaround — the Orval signature is well-typed so remove it)
- `updateReservation.mutate({ id, dto })` → `updateReservation.mutate({ id, data: dto })`
- `deleteReservation.mutate(id)` → `deleteReservation.mutate({ id })`

- [ ] **Step 5: Verify TypeScript**

```bash
npx tsc -p apps/web/tsconfig.json --noEmit
```

- [ ] **Step 6: Check and delete table-api.ts if no more consumers**

```bash
grep -r "table-api" apps/web/src/ && echo "table-api still used" || rm apps/web/src/lib/table-api.ts
```

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/routes/_app/reservations/index.tsx
git add -u apps/web/src/lib/table-api.ts 2>/dev/null; true
git commit -m "refactor(web): migrate reservations page to Orval hooks"
```

---

### Task 8: Migrate staff page

**Files:**
- Modify: `apps/web/src/routes/_app/staff/index.tsx`
- Note: `staff-api.ts` also used by `calendar/index.tsx` — do NOT delete yet

Legacy hooks:
```
useStaff(roleFilter) → data (Staff[]), isLoading
useCreateStaff() → .mutate(data)
useUpdateStaff() → .mutate({ id, dto })
useDeleteStaff() → .mutate(id)
useSetStaffActive() → .mutate({ id, active })
```

- [ ] **Step 1: Read the current file**

```bash
cat apps/web/src/routes/_app/staff/index.tsx
```

- [ ] **Step 2: Replace imports**

Remove `@/lib/staff-api` import.

Add:
```typescript
import { useQueryClient } from '@tanstack/react-query';
import {
  useStaffControllerGetAll,
  useStaffControllerCreate,
  useStaffControllerUpdate,
  useStaffControllerRemove,
  useStaffControllerSetActive,
  invalidateStaffControllerGetAll,
} from '@/api/staff/staff';
```

- [ ] **Step 3: Update hook calls**

```typescript
const qc = useQueryClient();
const { data: staff = [], isLoading } = useStaffControllerGetAll(
  roleFilter ? { role: roleFilter } : undefined,
);

const createStaff = useStaffControllerCreate({
  mutation: { onSuccess: () => invalidateStaffControllerGetAll(qc) },
});
const updateStaff = useStaffControllerUpdate({
  mutation: { onSuccess: () => invalidateStaffControllerGetAll(qc) },
});
const deleteStaff = useStaffControllerRemove({
  mutation: { onSuccess: () => invalidateStaffControllerGetAll(qc) },
});
const setStaffActive = useStaffControllerSetActive({
  mutation: { onSuccess: () => invalidateStaffControllerGetAll(qc) },
});
```

- [ ] **Step 4: Update mutation call sites**

- `createStaff.mutate(data)` → `createStaff.mutate({ data })`
- `updateStaff.mutate({ id, dto })` → `updateStaff.mutate({ id, data: dto })`
- `deleteStaff.mutate(id)` → `deleteStaff.mutate({ id })`
- `setStaffActive.mutate({ id, active })` → `setStaffActive.mutate({ id, data: { active } })`

- [ ] **Step 5: Verify TypeScript**

```bash
npx tsc -p apps/web/tsconfig.json --noEmit
```

- [ ] **Step 6: Commit (do NOT delete staff-api.ts — calendar still uses it)**

```bash
git add apps/web/src/routes/_app/staff/index.tsx
git commit -m "refactor(web): migrate staff page to Orval hooks"
```

---

### Task 9: Migrate calendar page (final — cleans up remaining lib files)

**Files:**
- Modify: `apps/web/src/routes/_app/calendar/index.tsx`
- Delete after: `shift-api.ts` (only calendar uses it), `reservation-api.ts` (calendar was last consumer), `staff-api.ts` (calendar was last consumer)

The calendar page is read-only — it uses query hooks only, no mutations:
```
useReservations() → data (Reservation[]) → mapped to CalendarEvent[]
useShifts(from, to) → data (Shift[]) → mapped to CalendarEvent[]
useStaff() → data (Staff[]) → mapped to staffById Map
```

- [ ] **Step 1: Read the current file**

```bash
cat apps/web/src/routes/_app/calendar/index.tsx
```

- [ ] **Step 2: Replace imports**

Remove:
```typescript
import { useReservations } from '@/lib/reservation-api';
import { useShifts } from '@/lib/shift-api';
import { useStaff } from '@/lib/staff-api';
```

Add:
```typescript
import { useReservationControllerGetAll } from '@/api/reservations/reservations';
import { useShiftControllerGetAll } from '@/api/shifts/shifts';
import { useStaffControllerGetAll } from '@/api/staff/staff';
```

- [ ] **Step 3: Update hook calls**

```typescript
// No params — calendar shows all reservations and all staff
const { data: reservations = [] } = useReservationControllerGetAll();
const { data: staff = [] } = useStaffControllerGetAll();

// Shifts filtered by date range (from/to are derived from the visible week/month)
const { data: shifts = [] } = useShiftControllerGetAll(
  from || to ? { from, to } : undefined,
);
```

Adapt the exact variable names to match what's already in the file.

- [ ] **Step 4: Verify TypeScript**

```bash
npx tsc -p apps/web/tsconfig.json --noEmit
```

- [ ] **Step 5: Delete all remaining legacy lib files**

```bash
for lib in reservation-api shift-api staff-api table-api; do
  grep -r "${lib}" apps/web/src/ && echo "${lib} STILL USED" || (echo "Deleting ${lib}.ts" && rm "apps/web/src/lib/${lib}.ts")
done
```

- [ ] **Step 6: Final TypeScript + test run**

```bash
npx tsc -p apps/web/tsconfig.json --noEmit && cd apps/web && npx vitest run
```

Expected: zero errors, all tests pass.

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/routes/_app/calendar/index.tsx
git add -u apps/web/src/lib/
git commit -m "refactor(web): migrate calendar page to Orval hooks, delete remaining legacy lib files"
```
