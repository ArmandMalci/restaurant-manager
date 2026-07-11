# Menu Module Refactor Cleanup

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Finish the menu module migration to Orval by switching to generated invalidation helpers and deleting the unused legacy wrapper.

**Architecture:** The menu page already uses Orval-generated hooks for all API calls. Two cleanup items remain: (1) `index.tsx` still uses manual `useQueryClient` + query key factories for cache invalidation — Orval generates typed `invalidateMenuControllerGet*` helpers that replace this with a single function call; (2) `menu-api.ts` is a dead file (hand-written wrappers that predate Orval) that should be deleted.

**Tech Stack:** React, TanStack React Query v5, Orval v8.17.0, TypeScript, Vitest

---

### Task 1: Switch to Orval invalidation helpers in index.tsx

**Files:**
- Modify: `apps/web/src/routes/_app/menu/index.tsx:4-18` (imports) and lines `229-255` (invalidation setup)

The current code manually constructs invalidation:
```typescript
// current — manual approach
const qc = useQueryClient();
const invalidateCategories = () =>
  qc.invalidateQueries({ queryKey: getMenuControllerGetCategoriesQueryKey() });
const invalidateItems = () =>
  qc.invalidateQueries({ queryKey: getMenuControllerGetItemsQueryKey() });
```

Orval generated these helpers (already exported from `@/api/menu/menu`):
```typescript
export const invalidateMenuControllerGetCategories = async (queryClient, options?) => ...
export const invalidateMenuControllerGetItems = async (queryClient, params?, options?) => ...
```

- [ ] **Step 1: Update imports in index.tsx**

Replace lines 4 and 16-18:
```typescript
// Remove:
import { useQueryClient } from '@tanstack/react-query';
// ...
  getMenuControllerGetCategoriesQueryKey,
  getMenuControllerGetItemsQueryKey,
} from '@/api/menu/menu';

// Replace with:
import {
  useMenuControllerGetCategories,
  useMenuControllerCreateCategory,
  useMenuControllerUpdateCategory,
  useMenuControllerRemoveCategory,
  useMenuControllerGetItems,
  useMenuControllerCreateItem,
  useMenuControllerUpdateItem,
  useMenuControllerRemoveItem,
  useMenuControllerSetAvailability,
  invalidateMenuControllerGetCategories,
  invalidateMenuControllerGetItems,
} from '@/api/menu/menu';
import type { MenuCategory, MenuItem } from '@restaurant/shared';
```

The full updated import block at the top of `MenuPage` will look like:

```typescript
import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { Plus, Pencil, Trash2, Eye, EyeOff } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import {
  useMenuControllerGetCategories,
  useMenuControllerCreateCategory,
  useMenuControllerUpdateCategory,
  useMenuControllerRemoveCategory,
  useMenuControllerGetItems,
  useMenuControllerCreateItem,
  useMenuControllerUpdateItem,
  useMenuControllerRemoveItem,
  useMenuControllerSetAvailability,
  invalidateMenuControllerGetCategories,
  invalidateMenuControllerGetItems,
} from '@/api/menu/menu';
import type { MenuCategory, MenuItem } from '@restaurant/shared';
```

Note: keep `useQueryClient` — we still need the `qc` instance to pass to the invalidation helpers.

- [ ] **Step 2: Replace manual invalidation lambdas inside MenuPage**

In `MenuPage()`, replace lines 229-255 (the `qc`, two invalidation lambdas, and all the mutation hook calls):

```typescript
// Remove:
const qc = useQueryClient();

const invalidateCategories = () =>
  qc.invalidateQueries({ queryKey: getMenuControllerGetCategoriesQueryKey() });
const invalidateItems = () =>
  qc.invalidateQueries({ queryKey: getMenuControllerGetItemsQueryKey() });

const createCat = useMenuControllerCreateCategory({
  mutation: { onSuccess: invalidateCategories },
});
const updateCat = useMenuControllerUpdateCategory({
  mutation: { onSuccess: invalidateCategories },
});
const deleteCat = useMenuControllerRemoveCategory({
  mutation: { onSuccess: invalidateCategories },
});
const createItem = useMenuControllerCreateItem({ mutation: { onSuccess: invalidateItems } });
const updateItem = useMenuControllerUpdateItem({ mutation: { onSuccess: invalidateItems } });
const deleteItem = useMenuControllerRemoveItem({ mutation: { onSuccess: invalidateItems } });
const toggleAvail = useMenuControllerSetAvailability({
  mutation: { onSuccess: invalidateItems },
});

// Replace with:
const qc = useQueryClient();

const createCat = useMenuControllerCreateCategory({
  mutation: { onSuccess: () => invalidateMenuControllerGetCategories(qc) },
});
const updateCat = useMenuControllerUpdateCategory({
  mutation: { onSuccess: () => invalidateMenuControllerGetCategories(qc) },
});
const deleteCat = useMenuControllerRemoveCategory({
  mutation: { onSuccess: () => invalidateMenuControllerGetCategories(qc) },
});
const createItem = useMenuControllerCreateItem({
  mutation: { onSuccess: () => invalidateMenuControllerGetItems(qc) },
});
const updateItem = useMenuControllerUpdateItem({
  mutation: { onSuccess: () => invalidateMenuControllerGetItems(qc) },
});
const deleteItem = useMenuControllerRemoveItem({
  mutation: { onSuccess: () => invalidateMenuControllerGetItems(qc) },
});
const toggleAvail = useMenuControllerSetAvailability({
  mutation: { onSuccess: () => invalidateMenuControllerGetItems(qc) },
});
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd /Users/armandmalci/code/personal/restaurant-manager
npx tsc -p apps/web/tsconfig.json --noEmit
```

Expected: no errors.

- [ ] **Step 4: Run tests**

```bash
cd /Users/armandmalci/code/personal/restaurant-manager
npm test --workspace=apps/web
```

Expected: all tests pass (5/5).

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/routes/_app/menu/index.tsx
git commit -m "refactor(web): use Orval invalidation helpers in menu page"
```

---

### Task 2: Delete legacy menu-api.ts

**Files:**
- Delete: `apps/web/src/lib/menu-api.ts`

This file contains hand-written React Query wrappers written before Orval was introduced. It is not imported anywhere — confirmed by searching the codebase.

- [ ] **Step 1: Confirm the file is truly unused**

```bash
grep -r "menu-api" /Users/armandmalci/code/personal/restaurant-manager/apps/web/src
```

Expected: no output (zero matches).

- [ ] **Step 2: Delete the file**

```bash
rm /Users/armandmalci/code/personal/restaurant-manager/apps/web/src/lib/menu-api.ts
```

- [ ] **Step 3: Verify build and tests still pass**

```bash
cd /Users/armandmalci/code/personal/restaurant-manager
npx tsc -p apps/web/tsconfig.json --noEmit && npm test --workspace=apps/web
```

Expected: zero TypeScript errors, all tests pass.

- [ ] **Step 4: Commit**

```bash
git add -u apps/web/src/lib/menu-api.ts
git commit -m "chore(web): delete unused legacy menu-api.ts"
```
