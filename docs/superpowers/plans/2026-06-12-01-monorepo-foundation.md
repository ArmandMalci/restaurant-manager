# Monorepo Foundation — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **CRITICAL:** No file changes are applied without human approval. Every task result goes to `docs/board/review.md` first.

**Goal:** A working Turborepo monorepo with a running NestJS API, a running Vite React PWA shell, a shared Zod schema package, the full docs/board structure, and Ruflo initialised with the MCP server registered.

**Architecture:** Three packages in a pnpm workspace — `apps/api` (NestJS 11 + Fastify), `apps/web` (Vite 8 + React 19), `packages/shared` (Zod schemas + TypeScript types). Turborepo orchestrates builds. The shared package is the single source of truth for all data contracts.

**Tech Stack:** Node 20+, pnpm 10, Turborepo 2.9, NestJS 11 + Fastify, Vite 8 + React 19, Tailwind 4, shadcn/ui, Zod 4, Ruflo 3.10, PostgreSQL 16, Redis 7 (containers for local dev).

**After this plan:** Both apps start (`turbo run dev`), tests pass (`turbo run test`), all board/docs files exist, and Ruflo MCP tools are callable from Claude Code.

---

## File Map

```
restaurant-manager/
├── .gitignore
├── .npmrc
├── package.json                          # root — scripts only, no app deps
├── pnpm-workspace.yaml
├── turbo.json
├── docker-compose.yml                    # PostgreSQL + Redis for local dev
│
├── packages/
│   └── shared/
│       ├── package.json
│       ├── tsconfig.json
│       └── src/
│           ├── index.ts                  # barrel export
│           ├── schemas/
│           │   ├── auth.ts
│           │   ├── bill.ts
│           │   ├── inventory.ts
│           │   ├── menu.ts
│           │   ├── order.ts
│           │   ├── reservation.ts
│           │   ├── shift.ts
│           │   ├── staff.ts
│           │   └── table.ts
│           └── constants/
│               └── index.ts             # WS events, enums
│
├── apps/
│   ├── api/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── tsconfig.build.json
│   │   ├── nest-cli.json
│   │   └── src/
│   │       ├── main.ts
│   │       ├── app.module.ts
│   │       └── health/
│   │           ├── health.controller.ts
│   │           └── health.controller.spec.ts
│   │
│   └── web/
│       ├── package.json
│       ├── tsconfig.json
│       ├── tsconfig.app.json
│       ├── tsconfig.node.json
│       ├── vite.config.ts
│       ├── index.html
│       ├── components.json               # shadcn/ui config
│       └── src/
│           ├── main.tsx
│           ├── index.css                 # @import "tailwindcss"
│           ├── App.tsx
│           └── App.test.tsx
│
└── docs/
    ├── board/
    │   ├── backlog.md
    │   ├── in-progress.md
    │   ├── review.md
    │   └── done.md
    ├── screens/
    │   └── design-tokens.md             # global design system baseline
    ├── decisions/
    │   └── ADR-001-tech-stack.md
    └── superpowers/
        ├── specs/
        │   └── 2026-06-12-restaurant-manager-design.md
        └── plans/
            └── (this file)
```

---

## Task 1: Git + Root Workspace Config

**Files:**
- Create: `.gitignore`
- Create: `.npmrc`
- Create: `package.json`
- Create: `pnpm-workspace.yaml`

- [ ] **Step 1.1 — Init git repo**

```bash
cd /Users/armandmalci/code/personal/restaurant-manager
git init
```

Expected: `Initialized empty Git repository in .../restaurant-manager/.git/`

- [ ] **Step 1.2 — Create `.gitignore`**

```
# dependencies
node_modules/
.pnp
.pnp.js

# builds
dist/
.next/
out/
build/

# env
.env
.env.local
.env.*.local

# turbo
.turbo/

# testing
coverage/

# misc
.DS_Store
*.pem
.vscode/
.idea/

# superpowers brainstorm (not source)
.superpowers/
```

- [ ] **Step 1.3 — Create `.npmrc`**

```ini
auto-install-peers=true
shamefully-hoist=false
```

- [ ] **Step 1.4 — Create root `package.json`**

```json
{
  "name": "restaurant-manager",
  "private": true,
  "scripts": {
    "dev": "turbo run dev",
    "build": "turbo run build",
    "test": "turbo run test",
    "lint": "turbo run lint",
    "typecheck": "turbo run typecheck",
    "format": "prettier --write \"**/*.{ts,tsx,md,json}\" --ignore-path .gitignore"
  },
  "devDependencies": {
    "turbo": "^2.9.18",
    "prettier": "^3.4.0",
    "typescript": "^5.7.0"
  },
  "packageManager": "pnpm@10.11.0",
  "engines": {
    "node": ">=20.0.0",
    "pnpm": ">=10.0.0"
  }
}
```

- [ ] **Step 1.5 — Create `pnpm-workspace.yaml`**

```yaml
packages:
  - 'apps/*'
  - 'packages/*'
```

- [ ] **Step 1.6 — Commit**

```bash
git add .gitignore .npmrc package.json pnpm-workspace.yaml
git commit -m "chore: init monorepo root"
```

---

## Task 2: Turborepo + Docker Compose

**Files:**
- Create: `turbo.json`
- Create: `docker-compose.yml`

- [ ] **Step 2.1 — Create `turbo.json`**

```json
{
  "$schema": "https://turbo.build/schema.json",
  "ui": "tui",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "inputs": ["$TURBO_DEFAULT$", ".env*"],
      "outputs": ["dist/**", ".next/**", "!.next/cache/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "test": {
      "dependsOn": ["^build"],
      "outputs": ["coverage/**"]
    },
    "lint": {
      "dependsOn": ["^lint"]
    },
    "typecheck": {
      "dependsOn": ["^typecheck", "^build"]
    }
  }
}
```

- [ ] **Step 2.2 — Create `docker-compose.yml`**

```yaml
version: '3.9'

services:
  postgres:
    image: postgres:16-alpine
    restart: unless-stopped
    ports:
      - '5432:5432'
    environment:
      POSTGRES_USER: restaurant
      POSTGRES_PASSWORD: restaurant
      POSTGRES_DB: restaurant_dev
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    restart: unless-stopped
    ports:
      - '6379:6379'
    volumes:
      - redis_data:/data

volumes:
  postgres_data:
  redis_data:
```

- [ ] **Step 2.3 — Install root dependencies**

```bash
pnpm install
```

Expected: lockfile created, `turbo` and `prettier` installed at root.

- [ ] **Step 2.4 — Commit**

```bash
git add turbo.json docker-compose.yml pnpm-lock.yaml
git commit -m "chore: add turborepo config and docker-compose for local infra"
```

---

## Task 3: packages/shared — Zod Schemas

**Files:**
- Create: `packages/shared/package.json`
- Create: `packages/shared/tsconfig.json`
- Create: `packages/shared/src/schemas/table.ts`
- Create: `packages/shared/src/schemas/menu.ts`
- Create: `packages/shared/src/schemas/order.ts`
- Create: `packages/shared/src/schemas/staff.ts`
- Create: `packages/shared/src/schemas/reservation.ts`
- Create: `packages/shared/src/schemas/shift.ts`
- Create: `packages/shared/src/schemas/inventory.ts`
- Create: `packages/shared/src/schemas/bill.ts`
- Create: `packages/shared/src/schemas/auth.ts`
- Create: `packages/shared/src/constants/index.ts`
- Create: `packages/shared/src/index.ts`
- Test: `packages/shared/src/__tests__/schemas.test.ts`

- [ ] **Step 3.1 — Create `packages/shared/package.json`**

```json
{
  "name": "@restaurant/shared",
  "version": "0.0.1",
  "private": true,
  "type": "module",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "exports": {
    ".": "./src/index.ts"
  },
  "scripts": {
    "typecheck": "tsc --noEmit",
    "test": "vitest run"
  },
  "dependencies": {
    "zod": "^4.4.3"
  },
  "devDependencies": {
    "typescript": "^5.7.0",
    "vitest": "^3.0.0"
  }
}
```

- [ ] **Step 3.2 — Create `packages/shared/tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "skipLibCheck": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "include": ["src"]
}
```

- [ ] **Step 3.3 — Write the failing test first**

Create `packages/shared/src/__tests__/schemas.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import {
  TableSchema,
  TableStatusSchema,
  MenuItemSchema,
  OrderSchema,
  OrderStatusSchema,
  StaffSchema,
  StaffRoleSchema,
  ReservationSchema,
  ShiftSchema,
  InventoryItemSchema,
  BillSchema,
  LoginSchema,
  WS_EVENTS,
  ORDER_STATUS,
  STAFF_ROLES,
} from '../index'

const uuid = () => '123e4567-e89b-12d3-a456-426614174000'
const now = new Date()

describe('TableSchema', () => {
  it('parses a valid table', () => {
    const result = TableSchema.safeParse({
      id: uuid(), number: 1, capacity: 4,
      status: 'available', waiterId: null,
      positionX: 100, positionY: 200,
      createdAt: now, updatedAt: now,
    })
    expect(result.success).toBe(true)
  })
  it('rejects invalid status', () => {
    expect(TableStatusSchema.safeParse('busy').success).toBe(false)
  })
})

describe('MenuItemSchema', () => {
  it('parses a valid menu item', () => {
    const result = MenuItemSchema.safeParse({
      id: uuid(), categoryId: uuid(),
      name: 'Burger', description: 'Tasty',
      price: 12.99, photoUrl: null, available: true,
      createdAt: now, updatedAt: now,
    })
    expect(result.success).toBe(true)
  })
  it('rejects negative price', () => {
    expect(MenuItemSchema.shape.price.safeParse(-1).success).toBe(false)
  })
})

describe('OrderSchema', () => {
  it('parses a valid order', () => {
    const result = OrderSchema.safeParse({
      id: uuid(), tableId: uuid(), staffId: uuid(),
      status: 'draft',
      items: [{
        id: uuid(), orderId: uuid(), menuItemId: uuid(),
        quantity: 2, modifiers: ['no onions'], status: 'pending', notes: null,
      }],
      createdAt: now, updatedAt: now,
    })
    expect(result.success).toBe(true)
  })
  it('rejects unknown order status', () => {
    expect(OrderStatusSchema.safeParse('cooking').success).toBe(false)
  })
})

describe('StaffSchema', () => {
  it('parses valid staff', () => {
    const result = StaffSchema.safeParse({
      id: uuid(), name: 'Alice', email: 'alice@rest.com',
      role: 'manager', active: true,
      createdAt: now, updatedAt: now,
    })
    expect(result.success).toBe(true)
  })
  it('rejects invalid email', () => {
    expect(StaffSchema.shape.email.safeParse('not-email').success).toBe(false)
  })
  it('rejects unknown role', () => {
    expect(StaffRoleSchema.safeParse('owner').success).toBe(false)
  })
})

describe('ReservationSchema', () => {
  it('parses a valid reservation', () => {
    const result = ReservationSchema.safeParse({
      id: uuid(), tableId: null,
      guestName: 'Bob', guestPhone: '+1234', guestEmail: null,
      partySize: 3, date: '2026-07-01', time: '19:30',
      notes: null, createdAt: now, updatedAt: now,
    })
    expect(result.success).toBe(true)
  })
  it('rejects malformed date', () => {
    expect(ReservationSchema.shape.date.safeParse('July 1').success).toBe(false)
  })
})

describe('LoginSchema', () => {
  it('rejects invalid email', () => {
    expect(LoginSchema.safeParse({ email: 'bad', password: 'pass' }).success).toBe(false)
  })
  it('rejects missing password', () => {
    expect(LoginSchema.safeParse({ email: 'a@b.com' }).success).toBe(false)
  })
})

describe('Constants', () => {
  it('WS_EVENTS are defined', () => {
    expect(WS_EVENTS.KDS_ORDER_NEW).toBe('kds:order:new')
    expect(WS_EVENTS.POS_TABLE_UPDATED).toBe('pos:table:updated')
  })
  it('ORDER_STATUS values are complete', () => {
    expect(ORDER_STATUS).toContain('draft')
    expect(ORDER_STATUS).toContain('served')
  })
  it('STAFF_ROLES are defined', () => {
    expect(STAFF_ROLES).toContain('manager')
    expect(STAFF_ROLES).toContain('kitchen')
  })
})
```

- [ ] **Step 3.4 — Run test to confirm it fails**

```bash
cd packages/shared && pnpm test
```

Expected: FAIL — `Cannot find module '../index'`

- [ ] **Step 3.5 — Create `packages/shared/src/schemas/table.ts`**

```typescript
import { z } from 'zod'

export const TableStatusSchema = z.enum(['available', 'occupied', 'reserved'])
export type TableStatus = z.infer<typeof TableStatusSchema>

export const TableSchema = z.object({
  id: z.string().uuid(),
  number: z.number().int().positive(),
  capacity: z.number().int().positive(),
  status: TableStatusSchema,
  waiterId: z.string().uuid().nullable(),
  positionX: z.number().default(0),
  positionY: z.number().default(0),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})
export type Table = z.infer<typeof TableSchema>

export const CreateTableSchema = TableSchema.omit({ id: true, createdAt: true, updatedAt: true })
export type CreateTableDto = z.infer<typeof CreateTableSchema>

export const UpdateTableSchema = CreateTableSchema.partial()
export type UpdateTableDto = z.infer<typeof UpdateTableSchema>
```

- [ ] **Step 3.6 — Create `packages/shared/src/schemas/menu.ts`**

```typescript
import { z } from 'zod'

export const MenuCategorySchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(100),
  position: z.number().int().nonnegative(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})
export type MenuCategory = z.infer<typeof MenuCategorySchema>

export const MenuItemSchema = z.object({
  id: z.string().uuid(),
  categoryId: z.string().uuid(),
  name: z.string().min(1).max(200),
  description: z.string().max(1000).nullable(),
  price: z.number().positive(),
  photoUrl: z.string().url().nullable(),
  available: z.boolean().default(true),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})
export type MenuItem = z.infer<typeof MenuItemSchema>

export const CreateMenuCategorySchema = MenuCategorySchema.omit({ id: true, createdAt: true, updatedAt: true })
export type CreateMenuCategoryDto = z.infer<typeof CreateMenuCategorySchema>

export const CreateMenuItemSchema = MenuItemSchema.omit({ id: true, createdAt: true, updatedAt: true })
export type CreateMenuItemDto = z.infer<typeof CreateMenuItemSchema>

export const UpdateMenuItemSchema = CreateMenuItemSchema.partial()
export type UpdateMenuItemDto = z.infer<typeof UpdateMenuItemSchema>
```

- [ ] **Step 3.7 — Create `packages/shared/src/schemas/order.ts`**

```typescript
import { z } from 'zod'

export const OrderStatusSchema = z.enum(['draft', 'sent', 'in-progress', 'ready', 'served'])
export type OrderStatus = z.infer<typeof OrderStatusSchema>

export const OrderItemStatusSchema = z.enum(['pending', 'in-progress', 'ready'])
export type OrderItemStatus = z.infer<typeof OrderItemStatusSchema>

export const OrderItemSchema = z.object({
  id: z.string().uuid(),
  orderId: z.string().uuid(),
  menuItemId: z.string().uuid(),
  quantity: z.number().int().positive(),
  modifiers: z.array(z.string()).default([]),
  status: OrderItemStatusSchema.default('pending'),
  notes: z.string().max(500).nullable(),
})
export type OrderItem = z.infer<typeof OrderItemSchema>

export const OrderSchema = z.object({
  id: z.string().uuid(),
  tableId: z.string().uuid(),
  staffId: z.string().uuid(),
  status: OrderStatusSchema.default('draft'),
  items: z.array(OrderItemSchema),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})
export type Order = z.infer<typeof OrderSchema>

export const CreateOrderItemSchema = z.object({
  menuItemId: z.string().uuid(),
  quantity: z.number().int().positive(),
  modifiers: z.array(z.string()).optional().default([]),
  notes: z.string().max(500).optional().nullable(),
})
export type CreateOrderItemDto = z.infer<typeof CreateOrderItemSchema>

export const CreateOrderSchema = z.object({
  tableId: z.string().uuid(),
  items: z.array(CreateOrderItemSchema).min(1),
})
export type CreateOrderDto = z.infer<typeof CreateOrderSchema>

export const UpdateOrderStatusSchema = z.object({
  status: OrderStatusSchema,
})
export type UpdateOrderStatusDto = z.infer<typeof UpdateOrderStatusSchema>

export const UpdateOrderItemStatusSchema = z.object({
  status: OrderItemStatusSchema,
})
export type UpdateOrderItemStatusDto = z.infer<typeof UpdateOrderItemStatusSchema>
```

- [ ] **Step 3.8 — Create `packages/shared/src/schemas/staff.ts`**

```typescript
import { z } from 'zod'

export const StaffRoleSchema = z.enum(['manager', 'waiter', 'kitchen', 'host'])
export type StaffRole = z.infer<typeof StaffRoleSchema>

export const StaffSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(100),
  email: z.string().email(),
  role: StaffRoleSchema,
  active: z.boolean().default(true),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})
export type Staff = z.infer<typeof StaffSchema>

export const CreateStaffSchema = StaffSchema.omit({ id: true, createdAt: true, updatedAt: true }).extend({
  password: z.string().min(8),
})
export type CreateStaffDto = z.infer<typeof CreateStaffSchema>

export const UpdateStaffSchema = CreateStaffSchema.omit({ password: true }).partial().extend({
  password: z.string().min(8).optional(),
})
export type UpdateStaffDto = z.infer<typeof UpdateStaffSchema>
```

- [ ] **Step 3.9 — Create `packages/shared/src/schemas/reservation.ts`**

```typescript
import { z } from 'zod'

const dateRegex = /^\d{4}-\d{2}-\d{2}$/
const timeRegex = /^\d{2}:\d{2}$/

export const ReservationSchema = z.object({
  id: z.string().uuid(),
  tableId: z.string().uuid().nullable(),
  guestName: z.string().min(1).max(100),
  guestPhone: z.string().max(20).nullable(),
  guestEmail: z.string().email().nullable(),
  partySize: z.number().int().positive(),
  date: z.string().regex(dateRegex, 'Must be YYYY-MM-DD'),
  time: z.string().regex(timeRegex, 'Must be HH:MM'),
  notes: z.string().max(500).nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})
export type Reservation = z.infer<typeof ReservationSchema>

export const CreateReservationSchema = ReservationSchema.omit({ id: true, createdAt: true, updatedAt: true })
export type CreateReservationDto = z.infer<typeof CreateReservationSchema>

export const UpdateReservationSchema = CreateReservationSchema.partial()
export type UpdateReservationDto = z.infer<typeof UpdateReservationSchema>
```

- [ ] **Step 3.10 — Create `packages/shared/src/schemas/shift.ts`**

```typescript
import { z } from 'zod'

const dateRegex = /^\d{4}-\d{2}-\d{2}$/
const timeRegex = /^\d{2}:\d{2}$/

export const ShiftSchema = z.object({
  id: z.string().uuid(),
  staffId: z.string().uuid(),
  date: z.string().regex(dateRegex, 'Must be YYYY-MM-DD'),
  startTime: z.string().regex(timeRegex, 'Must be HH:MM'),
  endTime: z.string().regex(timeRegex, 'Must be HH:MM'),
  clockIn: z.coerce.date().nullable(),
  clockOut: z.coerce.date().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})
export type Shift = z.infer<typeof ShiftSchema>

export const CreateShiftSchema = ShiftSchema.omit({ id: true, clockIn: true, clockOut: true, createdAt: true, updatedAt: true })
export type CreateShiftDto = z.infer<typeof CreateShiftSchema>
```

- [ ] **Step 3.11 — Create `packages/shared/src/schemas/inventory.ts`**

```typescript
import { z } from 'zod'

export const InventoryUnitSchema = z.enum(['kg', 'litre', 'unit'])
export type InventoryUnit = z.infer<typeof InventoryUnitSchema>

export const InventoryItemSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(200),
  unit: InventoryUnitSchema,
  quantity: z.number().nonnegative(),
  lowStockThreshold: z.number().nonnegative(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})
export type InventoryItem = z.infer<typeof InventoryItemSchema>

export const CreateInventoryItemSchema = InventoryItemSchema.omit({ id: true, createdAt: true, updatedAt: true })
export type CreateInventoryItemDto = z.infer<typeof CreateInventoryItemSchema>

export const AdjustInventorySchema = z.object({
  delta: z.number(),
  reason: z.enum(['delivery', 'waste', 'correction']),
})
export type AdjustInventoryDto = z.infer<typeof AdjustInventorySchema>
```

- [ ] **Step 3.12 — Create `packages/shared/src/schemas/bill.ts`**

```typescript
import { z } from 'zod'

export const BillSplitSchema = z.object({
  guestLabel: z.string().min(1),
  itemIds: z.array(z.string().uuid()),
  subtotal: z.number().nonnegative(),
})
export type BillSplit = z.infer<typeof BillSplitSchema>

export const BillSchema = z.object({
  id: z.string().uuid(),
  orderId: z.string().uuid(),
  subtotal: z.number().nonnegative(),
  discountType: z.enum(['percentage', 'fixed']).nullable(),
  discountValue: z.number().nonnegative().nullable(),
  tipType: z.enum(['percentage', 'fixed']).nullable(),
  tipValue: z.number().nonnegative().nullable(),
  total: z.number().nonnegative(),
  paid: z.boolean().default(false),
  splits: z.array(BillSplitSchema).nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})
export type Bill = z.infer<typeof BillSchema>

export const CreateBillSchema = z.object({
  orderId: z.string().uuid(),
  discountType: z.enum(['percentage', 'fixed']).optional(),
  discountValue: z.number().nonnegative().optional(),
  tipType: z.enum(['percentage', 'fixed']).optional(),
  tipValue: z.number().nonnegative().optional(),
  splits: z.array(BillSplitSchema).optional(),
})
export type CreateBillDto = z.infer<typeof CreateBillSchema>
```

- [ ] **Step 3.13 — Create `packages/shared/src/schemas/auth.ts`**

```typescript
import { z } from 'zod'
import { StaffSchema } from './staff'

export const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})
export type LoginDto = z.infer<typeof LoginSchema>

export const AuthResponseSchema = z.object({
  accessToken: z.string(),
  user: StaffSchema.omit({ createdAt: true, updatedAt: true }),
})
export type AuthResponse = z.infer<typeof AuthResponseSchema>

export const RefreshResponseSchema = z.object({
  accessToken: z.string(),
})
export type RefreshResponse = z.infer<typeof RefreshResponseSchema>
```

- [ ] **Step 3.14 — Create `packages/shared/src/constants/index.ts`**

```typescript
export const WS_EVENTS = {
  KDS_ORDER_NEW: 'kds:order:new',
  KDS_ITEM_READY: 'kds:item:ready',
  KDS_ORDER_READY: 'kds:order:ready',
  POS_TABLE_UPDATED: 'pos:table:updated',
  POS_ORDER_STATUS: 'pos:order:status',
} as const

export const ORDER_STATUS = ['draft', 'sent', 'in-progress', 'ready', 'served'] as const
export const ORDER_ITEM_STATUS = ['pending', 'in-progress', 'ready'] as const
export const STAFF_ROLES = ['manager', 'waiter', 'kitchen', 'host'] as const
export const TABLE_STATUS = ['available', 'occupied', 'reserved'] as const
export const INVENTORY_UNITS = ['kg', 'litre', 'unit'] as const

export const ROLE_HIERARCHY: Record<string, number> = {
  manager: 4,
  host: 3,
  waiter: 2,
  kitchen: 1,
}
```

- [ ] **Step 3.15 — Create `packages/shared/src/index.ts`**

```typescript
export * from './schemas/auth'
export * from './schemas/bill'
export * from './schemas/inventory'
export * from './schemas/menu'
export * from './schemas/order'
export * from './schemas/reservation'
export * from './schemas/shift'
export * from './schemas/staff'
export * from './schemas/table'
export * from './constants/index'
```

- [ ] **Step 3.16 — Run tests to confirm they pass**

```bash
cd packages/shared && pnpm test
```

Expected: All 15 assertions PASS.

- [ ] **Step 3.17 — Commit**

```bash
git add packages/shared
git commit -m "feat(shared): add core Zod schemas and constants for all 11 modules"
```

---

## Task 4: apps/api — NestJS Scaffold

**Files:**
- Create: `apps/api/package.json`
- Create: `apps/api/tsconfig.json`
- Create: `apps/api/tsconfig.build.json`
- Create: `apps/api/nest-cli.json`
- Create: `apps/api/src/main.ts`
- Create: `apps/api/src/app.module.ts`
- Create: `apps/api/src/health/health.controller.ts`
- Test: `apps/api/src/health/health.controller.spec.ts`

- [ ] **Step 4.1 — Create `apps/api/package.json`**

```json
{
  "name": "@restaurant/api",
  "version": "0.0.1",
  "private": true,
  "scripts": {
    "build": "nest build",
    "dev": "nest start --watch",
    "start": "node dist/main",
    "lint": "eslint \"{src,apps,libs,test}/**/*.ts\"",
    "test": "jest",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@nestjs/common": "^11.1.26",
    "@nestjs/core": "^11.1.26",
    "@nestjs/platform-fastify": "^11.1.26",
    "@nestjs/config": "^4.0.0",
    "reflect-metadata": "^0.2.0",
    "rxjs": "^7.8.0",
    "@restaurant/shared": "workspace:*"
  },
  "devDependencies": {
    "@nestjs/cli": "^11.0.0",
    "@nestjs/schematics": "^11.0.0",
    "@nestjs/testing": "^11.1.26",
    "@types/jest": "^29.5.0",
    "@types/node": "^22.0.0",
    "jest": "^29.7.0",
    "ts-jest": "^29.2.0",
    "typescript": "^5.7.0"
  },
  "jest": {
    "moduleFileExtensions": ["js", "json", "ts"],
    "rootDir": "src",
    "testRegex": ".*\\.spec\\.ts$",
    "transform": { "^.+\\.(t|j)s$": "ts-jest" },
    "collectCoverageFrom": ["**/*.(t|j)s"],
    "coverageDirectory": "../coverage",
    "testEnvironment": "node"
  }
}
```

- [ ] **Step 4.2 — Create `apps/api/tsconfig.json`**

```json
{
  "compilerOptions": {
    "module": "CommonJS",
    "declaration": true,
    "removeComments": true,
    "emitDecoratorMetadata": true,
    "experimentalDecorators": true,
    "allowSyntheticDefaultImports": true,
    "target": "ES2021",
    "sourceMap": true,
    "outDir": "./dist",
    "baseUrl": "./",
    "incremental": true,
    "skipLibCheck": true,
    "strictNullChecks": true,
    "noImplicitAny": true,
    "strictBindCallApply": true,
    "forceConsistentCasingInFileNames": true,
    "noFallthroughCasesInSwitch": true,
    "paths": {
      "@restaurant/shared": ["../../packages/shared/src/index.ts"]
    }
  }
}
```

- [ ] **Step 4.3 — Create `apps/api/tsconfig.build.json`**

```json
{
  "extends": "./tsconfig.json",
  "exclude": ["node_modules", "test", "dist", "**/*spec.ts"]
}
```

- [ ] **Step 4.4 — Create `apps/api/nest-cli.json`**

```json
{
  "$schema": "https://json.schemastore.org/nest-cli",
  "collection": "@nestjs/schematics",
  "sourceRoot": "src",
  "compilerOptions": {
    "deleteOutDir": true
  }
}
```

- [ ] **Step 4.5 — Write the failing health check test**

Create `apps/api/src/health/health.controller.spec.ts`:

```typescript
import { Test, TestingModule } from '@nestjs/testing'
import { HealthController } from './health.controller'

describe('HealthController', () => {
  let controller: HealthController

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
    }).compile()
    controller = module.get<HealthController>(HealthController)
  })

  it('GET /health returns status ok', () => {
    const result = controller.check()
    expect(result.status).toBe('ok')
    expect(typeof result.timestamp).toBe('string')
  })
})
```

- [ ] **Step 4.6 — Run test to confirm it fails**

```bash
cd apps/api && pnpm test
```

Expected: FAIL — `Cannot find module './health.controller'`

- [ ] **Step 4.7 — Create `apps/api/src/health/health.controller.ts`**

```typescript
import { Controller, Get } from '@nestjs/common'

@Controller('health')
export class HealthController {
  @Get()
  check() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    }
  }
}
```

- [ ] **Step 4.8 — Create `apps/api/src/app.module.ts`**

```typescript
import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { HealthController } from './health/health.controller'

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
  ],
  controllers: [HealthController],
})
export class AppModule {}
```

- [ ] **Step 4.9 — Create `apps/api/src/main.ts`**

```typescript
import { NestFactory } from '@nestjs/core'
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify'
import { AppModule } from './app.module'

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({ logger: process.env.NODE_ENV !== 'test' }),
  )
  app.setGlobalPrefix('api')
  app.enableCors({ origin: 'http://localhost:5173', credentials: true })
  const port = process.env.PORT ?? 3001
  await app.listen(port, '0.0.0.0')
  console.log(`API running on http://localhost:${port}/api`)
}
bootstrap()
```

- [ ] **Step 4.10 — Create `apps/api/.env.example`**

```
PORT=3001
NODE_ENV=development
DATABASE_URL=postgresql://restaurant:restaurant@localhost:5432/restaurant_dev
REDIS_URL=redis://localhost:6379
JWT_SECRET=change-me-in-production
JWT_EXPIRES_IN=15m
REFRESH_TOKEN_EXPIRES_IN=7d
```

- [ ] **Step 4.11 — Run tests to confirm they pass**

```bash
cd apps/api && pnpm test
```

Expected: 1 test suite PASS — `HealthController > GET /health returns status ok`

- [ ] **Step 4.12 — Install API dependencies**

```bash
cd apps/api && pnpm install
```

- [ ] **Step 4.13 — Commit**

```bash
git add apps/api
git commit -m "feat(api): scaffold NestJS 11 + Fastify with health endpoint"
```

---

## Task 5: apps/web — Vite + React + Tailwind 4 + shadcn/ui

**Files:**
- Create: `apps/web/package.json`
- Create: `apps/web/tsconfig.json`
- Create: `apps/web/tsconfig.node.json`
- Create: `apps/web/vite.config.ts`
- Create: `apps/web/index.html`
- Create: `apps/web/src/main.tsx`
- Create: `apps/web/src/index.css`
- Create: `apps/web/src/App.tsx`
- Test: `apps/web/src/App.test.tsx`

- [ ] **Step 5.1 — Create `apps/web/package.json`**

```json
{
  "name": "@restaurant/web",
  "version": "0.0.1",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest",
    "typecheck": "tsc --noEmit",
    "lint": "eslint src"
  },
  "dependencies": {
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "@restaurant/shared": "workspace:*"
  },
  "devDependencies": {
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "@types/node": "^22.0.0",
    "@vitejs/plugin-react": "^4.3.0",
    "@tailwindcss/vite": "^4.3.0",
    "tailwindcss": "^4.3.0",
    "vite": "^8.0.16",
    "vitest": "^3.0.0",
    "@vitest/ui": "^3.0.0",
    "jsdom": "^25.0.0",
    "@testing-library/react": "^16.0.0",
    "@testing-library/jest-dom": "^6.6.0",
    "@testing-library/user-event": "^14.5.0",
    "typescript": "^5.7.0"
  }
}
```

- [ ] **Step 5.2 — Create `apps/web/tsconfig.json`**

```json
{
  "files": [],
  "references": [
    { "path": "./tsconfig.app.json" },
    { "path": "./tsconfig.node.json" }
  ]
}
```

- [ ] **Step 5.3 — Create `apps/web/tsconfig.app.json`**

```json
{
  "compilerOptions": {
    "tsBuildInfoFile": "./node_modules/.tmp/tsconfig.app.tsbuildinfo",
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "Bundler",
    "allowImportingTsExtensions": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedSideEffectImports": true,
    "paths": {
      "@restaurant/shared": ["../../packages/shared/src/index.ts"],
      "@/*": ["./src/*"]
    }
  },
  "include": ["src"]
}
```

- [ ] **Step 5.4 — Create `apps/web/tsconfig.node.json`**

```json
{
  "compilerOptions": {
    "tsBuildInfoFile": "./node_modules/.tmp/tsconfig.node.tsbuildinfo",
    "target": "ES2022",
    "lib": ["ES2023"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "Bundler",
    "allowImportingTsExtensions": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "noEmit": true,
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedSideEffectImports": true
  },
  "include": ["vite.config.ts"]
}
```

- [ ] **Step 5.5 — Create `apps/web/vite.config.ts`**

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@restaurant/shared': path.resolve(__dirname, '../../packages/shared/src/index.ts'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test-setup.ts',
  },
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:3001',
    },
  },
})
```

- [ ] **Step 5.6 — Create `apps/web/src/test-setup.ts`**

```typescript
import '@testing-library/jest-dom'
```

- [ ] **Step 5.7 — Write the failing App test**

Create `apps/web/src/App.test.tsx`:

```typescript
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import App from './App'

describe('App', () => {
  it('renders the app root without crashing', () => {
    render(<App />)
    expect(screen.getByRole('main')).toBeInTheDocument()
  })

  it('shows the app name', () => {
    render(<App />)
    expect(screen.getByText(/restaurant manager/i)).toBeInTheDocument()
  })
})
```

- [ ] **Step 5.8 — Run test to confirm it fails**

```bash
cd apps/web && pnpm test
```

Expected: FAIL — `Cannot find module './App'`

- [ ] **Step 5.9 — Create `apps/web/index.html`**

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="theme-color" content="#09090b" />
    <title>Restaurant Manager</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 5.10 — Create `apps/web/src/index.css`**

```css
@import "tailwindcss";

@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 240 10% 3.9%;
    --radius: 0.5rem;
  }
  .dark {
    --background: 240 10% 3.9%;
    --foreground: 0 0% 98%;
  }
}

* {
  box-sizing: border-box;
}

body {
  background-color: hsl(var(--background));
  color: hsl(var(--foreground));
  font-family: system-ui, -apple-system, sans-serif;
  margin: 0;
}
```

- [ ] **Step 5.11 — Create `apps/web/src/main.tsx`**

```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
```

- [ ] **Step 5.12 — Create `apps/web/src/App.tsx`**

```tsx
export default function App() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <h1 className="text-4xl font-bold tracking-tight">
        Restaurant Manager
      </h1>
      <p className="mt-4 text-muted-foreground text-lg">
        Loading application…
      </p>
    </main>
  )
}
```

- [ ] **Step 5.13 — Install web dependencies**

```bash
cd apps/web && pnpm install
```

- [ ] **Step 5.14 — Run tests to confirm they pass**

```bash
cd apps/web && pnpm test
```

Expected: 2 tests PASS

- [ ] **Step 5.15 — Initialise shadcn/ui**

```bash
cd apps/web && pnpm dlx shadcn@latest init --defaults
```

When prompted: select **Default** style, **Zinc** base color, confirm Tailwind v4 detected.

This creates `components.json` and `src/lib/utils.ts`.

- [ ] **Step 5.16 — Commit**

```bash
git add apps/web
git commit -m "feat(web): scaffold Vite 8 + React 19 + Tailwind 4 + shadcn/ui PWA shell"
```

---

## Task 6: Cross-Package Pipeline Verification

- [ ] **Step 6.1 — Install all workspace dependencies from root**

```bash
cd /Users/armandmalci/code/personal/restaurant-manager
pnpm install
```

Expected: all three packages resolved, no errors.

- [ ] **Step 6.2 — Run full test suite via Turborepo**

```bash
turbo run test
```

Expected output includes:
```
@restaurant/shared:test: Tests  15 passed
@restaurant/api:test:   Tests  1 passed
@restaurant/web:test:   Tests  2 passed
Tasks: 3 successful, 3 total
```

- [ ] **Step 6.3 — Run typecheck across all packages**

```bash
turbo run typecheck
```

Expected: 0 TypeScript errors.

- [ ] **Step 6.4 — Start local infra (PostgreSQL + Redis)**

```bash
docker compose up -d
```

Expected: two containers running (`postgres`, `redis`). Verify:

```bash
docker compose ps
```

- [ ] **Step 6.5 — Smoke test: start API**

```bash
cd apps/api && cp .env.example .env && pnpm dev
```

In a second terminal:

```bash
curl http://localhost:3001/api/health
```

Expected response:
```json
{"status":"ok","timestamp":"2026-06-12T..."}
```

Stop the API (`Ctrl+C`).

- [ ] **Step 6.6 — Smoke test: start web**

```bash
cd apps/web && pnpm dev
```

Open `http://localhost:5173` — should show "Restaurant Manager" heading. Stop (`Ctrl+C`).

- [ ] **Step 6.7 — Commit**

```bash
git add .
git commit -m "chore: verify full monorepo pipeline — tests pass, both apps start"
```

---

## Task 7: Docs Structure + Board Files + ADR-001

**Files:**
- Create: `docs/board/backlog.md`
- Create: `docs/board/in-progress.md`
- Create: `docs/board/review.md`
- Create: `docs/board/done.md`
- Create: `docs/screens/design-tokens.md`
- Create: `docs/decisions/ADR-001-tech-stack.md`

- [ ] **Step 7.1 — Create `docs/board/backlog.md`**

```markdown
# Backlog

Items waiting to be picked up by an agent.

---

<!-- Template for new tickets:

---
id: TICKET-XXX
title: 
agent: [product-manager|architect|ux-ui|frontend-dev|backend-dev|qa|docs]
model: [claude-opus-4-8|claude-sonnet-4-6|claude-haiku-4-5-20251001]
status: backlog
created: YYYY-MM-DD
---

## What


## Why


## Acceptance criteria
- [ ] 

## Agent notes

-->

---

## Upcoming Plans

- Plan 02: Authentication & Database Layer
- Plan 03: Core App Shell (routing, layout, auth UI, Orval pipeline)
- Plan 04: Menu Management module
- Plan 05: Table Management module
- Plan 06: Order Management + KDS modules
- Plan 07: Reservations module
- Plan 08: Billing module
- Plan 09: Staff Management module
- Plan 10: Inventory module
- Plan 11: Reports & Analytics module
- Plan 12: Calendar View module
- Plan 13: Push Notifications module
- Plan 14: PWA hardening + offline strategy
- Plan 15: Ruflo agent definitions + hooks
```

- [ ] **Step 7.2 — Create `docs/board/in-progress.md`**

```markdown
# In Progress

Items currently being worked on. One item per agent at a time.

---
```

- [ ] **Step 7.3 — Create `docs/board/review.md`**

```markdown
# Review

Items awaiting human approval. Nothing moves to Done without passing through here.

> **Rule:** Every agent output lands here first. Armand reviews and either approves (→ Done) or returns with feedback (→ In Progress).

---
```

- [ ] **Step 7.4 — Create `docs/board/done.md`**

```markdown
# Done

Completed and approved items.

---

- [2026-06-12] Monorepo foundation (Plan 01) — scaffolded, tests passing, both apps running
```

- [ ] **Step 7.5 — Create `docs/screens/design-tokens.md`**

```markdown
# Design Token Baseline

All OpenDesign prompts reference these tokens by name.

## Color Palette

| Token | Value | Usage |
|---|---|---|
| `--color-primary` | #18181b (zinc-900) | Primary actions, headings |
| `--color-primary-fg` | #fafafa | Text on primary |
| `--color-secondary` | #f4f4f5 (zinc-100) | Secondary buttons, hover states |
| `--color-accent` | #f97316 (orange-500) | Highlights, active states, KDS urgency |
| `--color-success` | #22c55e (green-500) | Available tables, ready items |
| `--color-warning` | #f59e0b (amber-500) | Mid-urgency KDS items (5–10 min) |
| `--color-danger` | #ef4444 (red-500) | Overdue KDS items (>10 min), errors |
| `--color-background` | #ffffff | Page background (light) |
| `--color-surface` | #f4f4f5 (zinc-100) | Card backgrounds |
| `--color-border` | #e4e4e7 (zinc-200) | Borders, dividers |
| `--color-muted` | #71717a (zinc-500) | Secondary text |

## Typography

| Token | Value |
|---|---|
| `--font-sans` | system-ui, -apple-system, sans-serif |
| `--font-mono` | ui-monospace, monospace |
| `--text-xs` | 0.75rem / 1rem |
| `--text-sm` | 0.875rem / 1.25rem |
| `--text-base` | 1rem / 1.5rem |
| `--text-lg` | 1.125rem / 1.75rem |
| `--text-xl` | 1.25rem / 1.75rem |
| `--text-2xl` | 1.5rem / 2rem |
| `--text-4xl` | 2.25rem / 2.5rem |
| `--font-normal` | 400 |
| `--font-medium` | 500 |
| `--font-semibold` | 600 |
| `--font-bold` | 700 |

## Spacing Scale

4px base unit: 4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80, 96px

## Radius

| Token | Value |
|---|---|
| `--radius-sm` | 4px |
| `--radius-md` | 8px |
| `--radius-lg` | 12px |
| `--radius-xl` | 16px |
| `--radius-full` | 9999px |

## Shadows

| Token | Usage |
|---|---|
| `shadow-sm` | Cards, inputs |
| `shadow-md` | Dropdowns, popovers |
| `shadow-lg` | Modals, drawers |

## Component Defaults

- **Button primary:** bg-primary, text-primary-fg, radius-md, px-4 py-2, font-medium
- **Button secondary:** bg-secondary, text-foreground, border, radius-md
- **Button destructive:** bg-danger, text-white
- **Input:** border border-border, radius-md, px-3 py-2, focus:ring-2 ring-primary
- **Card:** bg-white, border border-border, radius-lg, shadow-sm, p-4
- **Badge available:** bg-success/10, text-success, radius-full
- **Badge occupied:** bg-danger/10, text-danger, radius-full
- **Badge reserved:** bg-warning/10, text-warning, radius-full
```

- [ ] **Step 7.6 — Create `docs/decisions/ADR-001-tech-stack.md`**

```markdown
# ADR-001: Tech Stack Decisions

**Date:** 2026-06-12  
**Status:** Accepted  
**Deciders:** Armand Malci + Claude Code

## Context

Building a full-service restaurant management React PWA from scratch. Need to decide monorepo strategy, frontend framework, backend framework, ORM, database, real-time strategy, and API style.

## Decisions

### Monorepo: Turborepo + pnpm workspaces
Shared `packages/shared` Zod schemas are the reason. End-to-end type safety without a code generator. Turborepo is low-config — 3 packages don't need Nx's generator overhead.

### Frontend: Vite 8 + React 19 + TanStack Router + TanStack Query
A pure SPA is the right shape for a PWA/POS app — mostly client-side, real-time, interactive. Next.js SSR overhead is unnecessary.

### Validation: Zod 4 + nestjs-zod (shared schemas)
NestJS defaults to class-validator/class-transformer (decorators). These don't share with a Vite frontend. nestjs-zod lets us define one Zod schema in packages/shared and validate on both sides. Eliminates type drift.

### API client: Orval (codegen from OpenAPI)
NestJS + @nestjs/swagger generates an OpenAPI spec. Orval reads it and generates typed TanStack Query hooks. No manual API client code.

### Backend: NestJS 11 + Fastify adapter
Fastify is 2-3× faster than Express at the same code. NestJS module system matches the 11-feature-module app structure well.

### ORM: Prisma 7
Best migration DX and type safety for PostgreSQL. TypeORM is declining; Drizzle is lighter but the DX advantage of Prisma's migrations outweighs Drizzle's bundle size benefit on a server.

### Database: PostgreSQL 16 + Redis 7
All data is relational — orders, billing, reservations require ACID transactions. Redis for WebSocket room state and KDS queue (sub-ms reads).

### Real-time: Socket.io WebSockets
Two namespaces: /kds (kitchen orders) and /pos (floor plan + order status). SSE would work for one-way KDS pushes but WebSockets allows kitchen to emit "ready" events back. No GraphQL subscriptions — REST + WS is cleaner.

### API style: REST + WebSockets (no GraphQL)
GraphQL's flexible-query win doesn't pay for a single, well-defined PWA client. N+1/DataLoader/schema overhead with no benefit.

### Calendar: react-big-calendar (MIT)
FullCalendar resource/timeline views are paid. react-big-calendar covers Day/Week/Month views under MIT.

### Local board: Markdown kanban
Zero infrastructure. Agents write files natively. Git history is the audit trail. Obsidian + Kanban plugin for visual board.

## Consequences

- Shared Zod schemas must be kept in sync with Prisma schema manually (or via a future code generator)
- SQLite considered and rejected — ACID needed, PostgreSQL scales better if multi-location v2 is needed
- No payment gateway in v1 — billing records payments but doesn't process them
```

- [ ] **Step 7.7 — Commit**

```bash
git add docs/
git commit -m "docs: add board structure, design tokens, and ADR-001 tech stack"
```

---

## Task 8: Ruflo Init + MCP Registration

- [ ] **Step 8.1 — Run Ruflo init in the project**

```bash
cd /Users/armandmalci/code/personal/restaurant-manager
ruflo init --start-all
```

Expected: creates `.claude/` directory with agent definitions, CLAUDE.md, and hooks config. Daemon starts in background.

- [ ] **Step 8.2 — Verify Ruflo daemon is running**

```bash
ruflo status
```

Expected: daemon running, memory subsystem active.

- [ ] **Step 8.3 — Register Ruflo MCP server in Claude Code settings**

Open `~/.claude/settings.json` and add the following under `mcpServers`:

```json
{
  "mcpServers": {
    "ruflo": {
      "command": "ruflo",
      "args": ["mcp", "start", "--stdio"]
    }
  }
}
```

**After editing:** Restart Claude Code completely (quit and reopen) so it picks up the new MCP server.

- [ ] **Step 8.4 — Verify MCP tools are available**

After restart, run in a new Claude Code session:

```bash
ruflo mcp status
```

Expected: server running, all tools (memory_store, swarm_init, agent_spawn, etc.) listed as Enabled.

You should also see `ruflo__memory_store`, `ruflo__agent_spawn` etc. appear as callable tools in Claude Code.

- [ ] **Step 8.5 — Store project context in Ruflo memory**

```bash
ruflo memory store --key "project/tech-stack" --value "Vite8+React19+NestJS11+Fastify+Prisma7+PostgreSQL+Redis+Turborepo+pnpm+shadcn+Tailwind4+Orval+SocketIO"
ruflo memory store --key "project/spec" --value "Full-service restaurant management PWA. 11 modules. Single location. No GraphQL. Markdown kanban board. 7-agent Ruflo system."
ruflo memory store --key "project/rule/approval" --value "CRITICAL: No code change is applied without Armand's explicit approval. All agent outputs go to docs/board/review.md first."
```

- [ ] **Step 8.6 — Commit Ruflo project config**

```bash
git add .claude/
git commit -m "chore: ruflo init — agent definitions, hooks, MCP registered"
```

---

## Task 9: Final Verification

- [ ] **Step 9.1 — Run full Turborepo test + typecheck**

```bash
turbo run test typecheck
```

Expected:
```
@restaurant/shared:test    — 15 tests passed
@restaurant/api:test       — 1 test passed
@restaurant/web:test       — 2 tests passed
@restaurant/shared:typecheck — 0 errors
@restaurant/api:typecheck    — 0 errors
@restaurant/web:typecheck    — 0 errors
Tasks: 6 successful, 6 total
```

- [ ] **Step 9.2 — Start everything**

```bash
docker compose up -d    # infra
turbo run dev           # api + web in parallel
```

Verify:
- `http://localhost:3001/api/health` → `{"status":"ok",...}`
- `http://localhost:5173` → "Restaurant Manager" heading visible

- [ ] **Step 9.3 — Final commit**

```bash
git add .
git commit -m "chore: plan 01 complete — monorepo foundation verified, all systems running"
```

---

## What Comes Next

| Plan | What it builds |
|---|---|
| **Plan 02** | Auth & Database Layer — Prisma schema for all 11 modules, migrations, JWT auth module, role guards |
| **Plan 03** | Core App Shell — TanStack Router routes, layout, login screen, Orval pipeline, PWA manifest + service worker |
| **Plan 04** | Menu Management — full CRUD backend + frontend |
| **Plan 05** | Table Management — floor plan editor, real-time status via Socket.io /pos |
| **Plan 06** | Order Management + KDS — POS order flow, /kds namespace, kitchen display |
| **Plan 07** | Reservations |
| **Plan 08** | Billing |
| **Plan 09** | Staff Management + Shifts |
| **Plan 10** | Inventory Tracking |
| **Plan 11** | Reports & Analytics |
| **Plan 12** | Calendar View |
| **Plan 13** | Push Notifications (PWA) |
| **Plan 14** | PWA hardening — offline caching, install prompt, Lighthouse audit |
| **Plan 15** | Ruflo agent definitions — full agent CLAUDE.md, model assignments, hook automation |
