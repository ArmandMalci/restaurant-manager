# Push Notifications Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add VAPID-based browser Web Push notifications — kitchen staff are alerted on new orders, waiters are alerted when their order is ready, and managers are alerted when inventory goes below its minimum stock threshold.

**Architecture:** No external push service. The API generates VAPID keys once (stored in `.env`), exposes `POST /api/notifications/subscribe` and `DELETE /api/notifications/subscribe` to store/remove browser `PushSubscription` objects per staff member in a new `push_subscriptions` Prisma table, and exposes `GET /api/notifications/vapid-public-key` so the frontend can subscribe. `NotificationsService` is injected into `OrderService` and `InventoryService` to fire notifications at the right moments. The frontend registers `public/sw.js` as a service worker, requests Notification permission after login, and adds an enable/disable toggle in Settings.

**Tech Stack:** `web-push` (VAPID, ships its own TS types), Prisma (`PushSubscription` model), NestJS injectable service, Browser Push API + ServiceWorkerRegistration, React + Tailwind CSS v4.

---

## File Map

**Create:**
- `apps/api/src/notifications/notifications.service.ts` — VAPID init, subscribe, unsubscribe, sendToRole, sendToStaff
- `apps/api/src/notifications/notifications.controller.ts` — GET /vapid-public-key, POST /subscribe, DELETE /subscribe
- `apps/api/src/notifications/notifications.module.ts` — module wiring, exports NotificationsService
- `apps/api/src/notifications/dto/notification.dto.ts` — SubscribeDtoClass via createZodDto
- `apps/api/src/notifications/notifications.service.spec.ts` — unit tests
- `apps/web/public/sw.js` — service worker: handles `push` events, shows notifications
- `apps/web/src/lib/notifications.ts` — register SW, requestPermission, subscribe, unsubscribe, isSubscribed

**Modify:**
- `apps/api/src/prisma/schema.prisma` — add `PushSubscription` model, add relation to `Staff`
- `apps/api/src/app.module.ts` — register `NotificationsModule`
- `apps/api/src/order/order.service.ts` — inject `NotificationsService`, notify kitchen on create, notify waiter on ready
- `apps/api/src/order/order.module.ts` — import `NotificationsModule`
- `apps/api/src/inventory/inventory.service.ts` — inject `NotificationsService`, notify managers on low stock after adjust
- `apps/api/src/inventory/inventory.module.ts` — import `NotificationsModule`
- `apps/web/src/routes/_app/settings/index.tsx` — add Notifications section with enable/disable toggle
- `packages/shared/src/schemas/notification.ts` — create `SubscribeSchema`
- `packages/shared/src/index.ts` — export notification schema

---

### Task 1: Install `web-push` and generate VAPID keys

**Files:**
- Modify: `apps/api/package.json` (via pnpm add)
- Modify: `.env` (add VAPID variables)

- [ ] **Step 1: Install web-push**

```bash
pnpm --filter @restaurant/api add web-push
```

Expected: `web-push` appears in `apps/api/package.json` dependencies. web-push v5+ ships its own TypeScript declarations — no `@types/web-push` needed.

- [ ] **Step 2: Generate VAPID keys**

```bash
pnpm --filter @restaurant/api exec node -e "const wp = require('web-push'); const k = wp.generateVAPIDKeys(); console.log('VAPID_PUBLIC_KEY=' + k.publicKey); console.log('VAPID_PRIVATE_KEY=' + k.privateKey);"
```

Copy the two printed lines. If the above fails due to ESM, use:

```bash
node --input-type=module <<'EOF'
import webpush from './apps/api/node_modules/web-push/src/web-push.js'
const k = webpush.generateVAPIDKeys()
console.log('VAPID_PUBLIC_KEY=' + k.publicKey)
console.log('VAPID_PRIVATE_KEY=' + k.privateKey)
EOF
```

- [ ] **Step 3: Add VAPID keys to `.env`**

Open `.env` (or `.env.local` if that's what the API reads — match whatever env file is already in use for `DATABASE_URL`). Append:

```
VAPID_PUBLIC_KEY=<paste publicKey from Step 2>
VAPID_PRIVATE_KEY=<paste privateKey from Step 2>
VAPID_SUBJECT=mailto:admin@restaurant.local
```

Do NOT commit the `.env` file. Verify `.env` is in `.gitignore`.

- [ ] **Step 4: Commit**

```bash
git add apps/api/package.json pnpm-lock.yaml
git commit -m "chore(api): install web-push for VAPID push notifications"
```

---

### Task 2: Prisma schema — add `PushSubscription` model

**Files:**
- Modify: `apps/api/src/prisma/schema.prisma`

- [ ] **Step 1: Read the schema**

```bash
cat apps/api/src/prisma/schema.prisma
```

- [ ] **Step 2: Add `PushSubscription` model**

At the end of `apps/api/src/prisma/schema.prisma`, append:

```prisma
model PushSubscription {
  id        String   @id @default(uuid())
  staffId   String
  endpoint  String   @unique
  p256dh    String
  auth      String
  createdAt DateTime @default(now())

  staff Staff @relation(fields: [staffId], references: [id], onDelete: Cascade)

  @@map("push_subscriptions")
}
```

- [ ] **Step 3: Add relation to the `Staff` model**

In the `Staff` model block (around line 15–25), add one line inside the model:

```prisma
  pushSubscriptions PushSubscription[]
```

The updated `Staff` model should look like:

```prisma
model Staff {
  id           String    @id @default(uuid())
  name         String
  email        String    @unique
  passwordHash String
  role         StaffRole
  active       Boolean   @default(true)
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt

  orders            Order[]
  shifts            Shift[]
  refreshTokens     RefreshToken[]
  pushSubscriptions PushSubscription[]

  @@map("staff")
}
```

- [ ] **Step 4: Run migration**

```bash
pnpm --filter @restaurant/api exec prisma migrate dev --name add-push-subscriptions
```

Expected output: `Your database is now in sync with your schema.`

- [ ] **Step 5: Verify migration file exists**

```bash
ls apps/api/src/prisma/migrations/ | tail -3
```

Expected: a new migration folder ending in `add_push_subscriptions`.

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/prisma/schema.prisma apps/api/src/prisma/migrations/
git commit -m "feat(prisma): add PushSubscription model for web push subscriptions"
```

---

### Task 3: Shared notification schema

**Files:**
- Create: `packages/shared/src/schemas/notification.ts`
- Modify: `packages/shared/src/index.ts`

- [ ] **Step 1: Read the shared index**

```bash
cat packages/shared/src/index.ts
```

- [ ] **Step 2: Create the notification schema file**

Write `packages/shared/src/schemas/notification.ts`:

```ts
import { z } from 'zod'

export const SubscribeSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1),
  }),
})
export type SubscribeDto = z.infer<typeof SubscribeSchema>
```

- [ ] **Step 3: Export from shared index**

Add to `packages/shared/src/index.ts` (alongside the other schema exports):

```ts
export * from './schemas/notification'
```

- [ ] **Step 4: Rebuild shared package**

```bash
cd packages/shared && pnpm build
```

Expected: `dist/` rebuilt with no TypeScript errors.

- [ ] **Step 5: Commit**

```bash
git add packages/shared/src/schemas/notification.ts packages/shared/src/index.ts packages/shared/dist/
git commit -m "feat(shared): add SubscribeSchema for push notification subscriptions"
```

---

### Task 4: `NotificationsService`

**Files:**
- Create: `apps/api/src/notifications/notifications.service.ts`

- [ ] **Step 1: Create the file**

Write `apps/api/src/notifications/notifications.service.ts`:

```ts
import { Injectable, Logger, OnModuleInit } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { PrismaService } from '../prisma/prisma.service'
import webpush from 'web-push'
import type { SubscribeDto } from '@restaurant/shared'

@Injectable()
export class NotificationsService implements OnModuleInit {
  private readonly logger = new Logger(NotificationsService.name)
  private vapidReady = false

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  onModuleInit() {
    const publicKey = this.config.get<string>('VAPID_PUBLIC_KEY', '')
    const privateKey = this.config.get<string>('VAPID_PRIVATE_KEY', '')
    const subject = this.config.get<string>('VAPID_SUBJECT', 'mailto:admin@restaurant.local')
    if (publicKey && privateKey) {
      webpush.setVapidDetails(subject, publicKey, privateKey)
      this.vapidReady = true
    } else {
      this.logger.warn('VAPID keys not configured — push notifications disabled')
    }
  }

  getPublicKey(): string {
    return this.config.get<string>('VAPID_PUBLIC_KEY', '')
  }

  async subscribe(staffId: string, dto: SubscribeDto) {
    return this.prisma.pushSubscription.upsert({
      where: { endpoint: dto.endpoint },
      create: {
        staffId,
        endpoint: dto.endpoint,
        p256dh: dto.keys.p256dh,
        auth: dto.keys.auth,
      },
      update: {
        staffId,
        p256dh: dto.keys.p256dh,
        auth: dto.keys.auth,
      },
    })
  }

  async unsubscribe(endpoint: string): Promise<void> {
    await this.prisma.pushSubscription.deleteMany({ where: { endpoint } })
  }

  async sendToRole(role: string, payload: { title: string; body: string }): Promise<void> {
    if (!this.vapidReady) return
    const subs = await this.prisma.pushSubscription.findMany({
      where: { staff: { role: role as never } },
    })
    await Promise.allSettled(
      subs.map(sub =>
        webpush
          .sendNotification(
            { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
            JSON.stringify(payload),
          )
          .catch(err => this.logger.warn(`Push to ${sub.endpoint.slice(-20)} failed: ${String(err)}`)),
      ),
    )
  }

  async sendToStaff(staffId: string, payload: { title: string; body: string }): Promise<void> {
    if (!this.vapidReady) return
    const subs = await this.prisma.pushSubscription.findMany({ where: { staffId } })
    await Promise.allSettled(
      subs.map(sub =>
        webpush
          .sendNotification(
            { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
            JSON.stringify(payload),
          )
          .catch(err => this.logger.warn(`Push to ${sub.endpoint.slice(-20)} failed: ${String(err)}`)),
      ),
    )
  }
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
pnpm --filter @restaurant/api exec tsc --noEmit
```

Expected: no errors in `notifications.service.ts`.

---

### Task 5: `NotificationsController`, module, and `AppModule` registration

**Files:**
- Create: `apps/api/src/notifications/dto/notification.dto.ts`
- Create: `apps/api/src/notifications/notifications.controller.ts`
- Create: `apps/api/src/notifications/notifications.module.ts`
- Modify: `apps/api/src/app.module.ts`

- [ ] **Step 1: Create the DTO**

Write `apps/api/src/notifications/dto/notification.dto.ts`:

```ts
import { createZodDto } from 'nestjs-zod'
import { SubscribeSchema } from '@restaurant/shared'

export class SubscribeDtoClass extends createZodDto(SubscribeSchema) {}
```

- [ ] **Step 2: Create the controller**

Write `apps/api/src/notifications/notifications.controller.ts`:

```ts
import { Body, Controller, Delete, Get, Post, UseGuards } from '@nestjs/common'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { CurrentUser } from '../auth/decorators/current-user.decorator'
import { NotificationsService } from './notifications.service'
import { SubscribeDtoClass } from './dto/notification.dto'

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly svc: NotificationsService) {}

  @Get('vapid-public-key')
  getPublicKey() {
    return { publicKey: this.svc.getPublicKey() }
  }

  @Post('subscribe')
  @UseGuards(JwtAuthGuard)
  subscribe(@CurrentUser() user: { id: string }, @Body() dto: SubscribeDtoClass) {
    return this.svc.subscribe(user.id, dto)
  }

  @Delete('subscribe')
  @UseGuards(JwtAuthGuard)
  async unsubscribe(@Body() body: { endpoint: string }) {
    await this.svc.unsubscribe(body.endpoint)
    return { ok: true }
  }
}
```

- [ ] **Step 3: Create the module**

Write `apps/api/src/notifications/notifications.module.ts`:

```ts
import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { PrismaModule } from '../prisma/prisma.module'
import { NotificationsService } from './notifications.service'
import { NotificationsController } from './notifications.controller'

@Module({
  imports: [PrismaModule, ConfigModule],
  providers: [NotificationsService],
  controllers: [NotificationsController],
  exports: [NotificationsService],
})
export class NotificationsModule {}
```

- [ ] **Step 4: Read AppModule**

```bash
cat apps/api/src/app.module.ts
```

- [ ] **Step 5: Register NotificationsModule in AppModule**

Add `NotificationsModule` to the imports array in `apps/api/src/app.module.ts`. Add the import at the top:

```ts
import { NotificationsModule } from './notifications/notifications.module'
```

And add `NotificationsModule` to the `imports` array alongside the other modules.

- [ ] **Step 6: Build to verify**

```bash
pnpm --filter @restaurant/api build
```

Expected: build completes with no TypeScript errors.

- [ ] **Step 7: Commit**

```bash
git add apps/api/src/notifications/ apps/api/src/app.module.ts
git commit -m "feat(api): add NotificationsModule — VAPID web push subscribe/unsubscribe endpoints"
```

---

### Task 6: Trigger notifications from `OrderService`

**Files:**
- Modify: `apps/api/src/order/order.service.ts`
- Modify: `apps/api/src/order/order.module.ts`

- [ ] **Step 1: Read the order module**

```bash
cat apps/api/src/order/order.module.ts
```

- [ ] **Step 2: Import NotificationsModule in OrderModule**

In `apps/api/src/order/order.module.ts`, add `NotificationsModule` to the imports array. Add the import at the top:

```ts
import { NotificationsModule } from '../notifications/notifications.module'
```

Add `NotificationsModule` to the `imports` array.

- [ ] **Step 3: Read OrderService**

```bash
cat apps/api/src/order/order.service.ts
```

- [ ] **Step 4: Inject NotificationsService into OrderService**

In `apps/api/src/order/order.service.ts`:

1. Add the import at the top:

```ts
import { NotificationsService } from '../notifications/notifications.service'
```

2. Update the constructor to accept `NotificationsService`:

```ts
constructor(
  private readonly prisma: PrismaService,
  private readonly notifications: NotificationsService,
) {}
```

- [ ] **Step 5: Notify kitchen on order create**

Replace the `create` method body so that after the order is persisted, kitchen staff are notified. Full updated `create` method:

```ts
async create(dto: CreateOrderDto, staffId: string) {
  const order = await this.prisma.order.create({
    data: {
      tableId: dto.tableId,
      staffId,
      notes: dto.notes ?? null,
      items: {
        create: dto.items.map(i => ({
          menuItemId: i.menuItemId,
          quantity: i.quantity,
          notes: i.notes ?? null,
        })),
      },
    },
    include: WITH_ITEMS,
  })
  const table = await this.prisma.table.findUnique({ where: { id: dto.tableId } })
  await this.notifications.sendToRole('kitchen', {
    title: 'New Order',
    body: `New order received for Table ${table?.number ?? '?'}`,
  })
  return order
}
```

- [ ] **Step 6: Notify waiter when order status becomes `ready`**

Replace the `updateStatus` method so it notifies the waiter when the order transitions to `ready`. Full updated `updateStatus` method:

```ts
async updateStatus(id: string, dto: UpdateOrderStatusDto) {
  const existing = await this.findOne(id)
  const order = await this.prisma.order.update({
    where: { id },
    data: { status: dto.status as never },
    include: WITH_ITEMS,
  })
  if (dto.status === 'ready') {
    const table = await this.prisma.table.findUnique({ where: { id: existing.tableId } })
    await this.notifications.sendToStaff(existing.staffId, {
      title: 'Order Ready',
      body: `Table ${table?.number ?? '?'} order is ready to serve`,
    })
  }
  return order
}
```

- [ ] **Step 7: Build to verify**

```bash
pnpm --filter @restaurant/api build
```

Expected: no TypeScript errors.

- [ ] **Step 8: Commit**

```bash
git add apps/api/src/order/order.service.ts apps/api/src/order/order.module.ts
git commit -m "feat(order): notify kitchen on new order, notify waiter when order is ready"
```

---

### Task 7: Trigger notification from `InventoryService` on low stock

**Files:**
- Modify: `apps/api/src/inventory/inventory.service.ts`
- Modify: `apps/api/src/inventory/inventory.module.ts`

- [ ] **Step 1: Read the inventory module**

```bash
cat apps/api/src/inventory/inventory.module.ts
```

- [ ] **Step 2: Import NotificationsModule in InventoryModule**

In `apps/api/src/inventory/inventory.module.ts`, add `NotificationsModule` to the imports array:

```ts
import { NotificationsModule } from '../notifications/notifications.module'
```

Add `NotificationsModule` to the `imports` array.

- [ ] **Step 3: Read InventoryService**

```bash
cat apps/api/src/inventory/inventory.service.ts
```

- [ ] **Step 4: Inject NotificationsService**

In `apps/api/src/inventory/inventory.service.ts`:

1. Add the import at the top:

```ts
import { NotificationsService } from '../notifications/notifications.service'
```

2. Update the constructor:

```ts
constructor(
  private readonly prisma: PrismaService,
  private readonly notifications: NotificationsService,
) {}
```

- [ ] **Step 5: Notify managers on low stock after adjust**

Replace the `adjust` method so that after the quantity is updated, managers are notified if the item is low. Full updated `adjust` method:

```ts
async adjust(id: string, dto: AdjustInventoryDto) {
  await this.findOne(id)
  await this.prisma.inventoryItem.update({
    where: { id },
    data: { quantity: { increment: dto.delta } },
  })
  const item = await this.findOne(id)
  if (item.lowStock) {
    await this.notifications.sendToRole('manager', {
      title: 'Low Stock Alert',
      body: `${item.name} is running low (${item.quantity} ${item.unit} remaining)`,
    })
  }
  return item
}
```

- [ ] **Step 6: Build to verify**

```bash
pnpm --filter @restaurant/api build
```

Expected: no TypeScript errors.

- [ ] **Step 7: Commit**

```bash
git add apps/api/src/inventory/inventory.service.ts apps/api/src/inventory/inventory.module.ts
git commit -m "feat(inventory): notify managers via push when stock falls below minimum threshold"
```

---

### Task 8: Frontend — service worker, notifications lib, and Settings toggle

**Files:**
- Create: `apps/web/public/sw.js`
- Create: `apps/web/src/lib/notifications.ts`
- Modify: `apps/web/src/routes/_app/settings/index.tsx`

- [ ] **Step 1: Create the service worker**

Write `apps/web/public/sw.js`:

```js
self.addEventListener('push', event => {
  const data = event.data ? event.data.json() : {}
  const title = data.title ?? 'Restaurant Manager'
  const body = data.body ?? ''
  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: '/vite.svg',
    })
  )
})

self.addEventListener('notificationclick', event => {
  event.notification.close()
  event.waitUntil(clients.openWindow('/'))
})
```

- [ ] **Step 2: Create the notifications lib**

Write `apps/web/src/lib/notifications.ts`:

```ts
import axios from 'axios'

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  return Uint8Array.from([...raw].map(c => c.charCodeAt(0)))
}

async function getVapidPublicKey(): Promise<string> {
  const { data } = await axios.get<{ publicKey: string }>('/api/notifications/vapid-public-key')
  return data.publicKey
}

export async function isSubscribed(): Promise<boolean> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return false
  const registration = await navigator.serviceWorker.getRegistration('/sw.js')
  if (!registration) return false
  const sub = await registration.pushManager.getSubscription()
  return !!sub
}

export async function subscribe(): Promise<boolean> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return false

  const registration = await navigator.serviceWorker.register('/sw.js')
  await navigator.serviceWorker.ready

  const publicKey = await getVapidPublicKey()
  if (!publicKey) return false

  const permission = await Notification.requestPermission()
  if (permission !== 'granted') return false

  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(publicKey),
  })

  const raw = subscription.toJSON()
  await axios.post('/api/notifications/subscribe', {
    endpoint: raw.endpoint,
    keys: { p256dh: raw.keys?.p256dh, auth: raw.keys?.auth },
  })
  return true
}

export async function unsubscribe(): Promise<void> {
  if (!('serviceWorker' in navigator)) return
  const registration = await navigator.serviceWorker.getRegistration('/sw.js')
  if (!registration) return
  const subscription = await registration.pushManager.getSubscription()
  if (!subscription) return
  await axios.delete('/api/notifications/subscribe', {
    data: { endpoint: subscription.endpoint },
  })
  await subscription.unsubscribe()
}
```

- [ ] **Step 3: Read the Settings page**

```bash
cat apps/web/src/routes/_app/settings/index.tsx
```

- [ ] **Step 4: Add Notifications section to Settings page**

In `apps/web/src/routes/_app/settings/index.tsx`:

1. Add these imports near the top:

```ts
import { useEffect, useState } from 'react'
import { Bell, BellOff } from 'lucide-react'
import { subscribe, unsubscribe, isSubscribed } from '@/lib/notifications'
```

2. Inside `SettingsPage`, before the `return`, add this state and logic:

```ts
const [notifEnabled, setNotifEnabled] = useState(false)
const [notifLoading, setNotifLoading] = useState(false)

useEffect(() => {
  isSubscribed().then(setNotifEnabled)
}, [])

async function toggleNotifications() {
  setNotifLoading(true)
  try {
    if (notifEnabled) {
      await unsubscribe()
      setNotifEnabled(false)
    } else {
      const ok = await subscribe()
      setNotifEnabled(ok)
    }
  } finally {
    setNotifLoading(false)
  }
}
```

3. Inside the returned JSX, after the restaurant profile `<form>` block and before the closing `</div>`, add the Notifications section:

```tsx
<div className="space-y-4 rounded-lg border p-6">
  <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
    Notifications
  </h2>
  <p className="text-sm text-muted-foreground">
    Receive push notifications for orders and stock alerts on this device.
  </p>
  <button
    type="button"
    onClick={toggleNotifications}
    disabled={notifLoading}
    className="flex items-center gap-2 rounded-md border px-4 py-2 text-sm font-medium transition-colors hover:bg-accent disabled:opacity-60"
  >
    {notifEnabled ? <BellOff className="h-4 w-4" /> : <Bell className="h-4 w-4" />}
    {notifLoading
      ? 'Updating…'
      : notifEnabled
        ? 'Disable notifications'
        : 'Enable notifications'}
  </button>
</div>
```

- [ ] **Step 5: Verify TypeScript**

```bash
pnpm --filter @restaurant/web exec tsc --noEmit
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add apps/web/public/sw.js apps/web/src/lib/notifications.ts apps/web/src/routes/_app/settings/index.tsx
git commit -m "feat(web): add service worker, notification subscribe/unsubscribe, Settings toggle"
```

---

### Task 9: Unit tests for `NotificationsService`

**Files:**
- Create: `apps/api/src/notifications/notifications.service.spec.ts`

- [ ] **Step 1: Write the test file**

Write `apps/api/src/notifications/notifications.service.spec.ts`:

```ts
import { Test, TestingModule } from '@nestjs/testing'
import { ConfigService } from '@nestjs/config'
import { NotificationsService } from './notifications.service'
import { PrismaService } from '../prisma/prisma.service'
import webpush from 'web-push'

jest.mock('web-push', () => ({
  __esModule: true,
  default: {
    setVapidDetails: jest.fn(),
    sendNotification: jest.fn().mockResolvedValue({}),
  },
}))

const mockPrisma = {
  pushSubscription: {
    upsert: jest.fn(),
    deleteMany: jest.fn(),
    findMany: jest.fn(),
  },
}

const mockConfig = {
  get: jest.fn((key: string, fallback = '') => {
    const env: Record<string, string> = {
      VAPID_PUBLIC_KEY: 'test-pub',
      VAPID_PRIVATE_KEY: 'test-priv',
      VAPID_SUBJECT: 'mailto:test@example.com',
    }
    return env[key] ?? fallback
  }),
}

describe('NotificationsService', () => {
  let service: NotificationsService

  beforeEach(async () => {
    jest.clearAllMocks()
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: ConfigService, useValue: mockConfig },
      ],
    }).compile()
    service = module.get(NotificationsService)
    service.onModuleInit()
  })

  it('calls setVapidDetails on init when keys are present', () => {
    expect(webpush.setVapidDetails).toHaveBeenCalledWith(
      'mailto:test@example.com',
      'test-pub',
      'test-priv',
    )
  })

  it('returns the VAPID public key', () => {
    expect(service.getPublicKey()).toBe('test-pub')
  })

  it('subscribe upserts a push subscription', async () => {
    mockPrisma.pushSubscription.upsert.mockResolvedValue({ id: 'sub-1' })
    const dto = { endpoint: 'https://push.example.com/sub1', keys: { p256dh: 'abc', auth: 'xyz' } }
    const result = await service.subscribe('staff-1', dto)
    expect(mockPrisma.pushSubscription.upsert).toHaveBeenCalledWith({
      where: { endpoint: dto.endpoint },
      create: { staffId: 'staff-1', endpoint: dto.endpoint, p256dh: 'abc', auth: 'xyz' },
      update: { staffId: 'staff-1', p256dh: 'abc', auth: 'xyz' },
    })
    expect(result).toEqual({ id: 'sub-1' })
  })

  it('unsubscribe deletes the subscription by endpoint', async () => {
    mockPrisma.pushSubscription.deleteMany.mockResolvedValue({ count: 1 })
    await service.unsubscribe('https://push.example.com/sub1')
    expect(mockPrisma.pushSubscription.deleteMany).toHaveBeenCalledWith({
      where: { endpoint: 'https://push.example.com/sub1' },
    })
  })

  it('sendToRole sends to all subscriptions for the role', async () => {
    mockPrisma.pushSubscription.findMany.mockResolvedValue([
      { endpoint: 'https://e1.example.com', p256dh: 'p1', auth: 'a1' },
      { endpoint: 'https://e2.example.com', p256dh: 'p2', auth: 'a2' },
    ])
    await service.sendToRole('kitchen', { title: 'New Order', body: 'Table 5' })
    expect(webpush.sendNotification).toHaveBeenCalledTimes(2)
    expect(webpush.sendNotification).toHaveBeenCalledWith(
      { endpoint: 'https://e1.example.com', keys: { p256dh: 'p1', auth: 'a1' } },
      JSON.stringify({ title: 'New Order', body: 'Table 5' }),
    )
  })

  it('sendToRole sends nothing when no subscriptions exist', async () => {
    mockPrisma.pushSubscription.findMany.mockResolvedValue([])
    await service.sendToRole('kitchen', { title: 'Test', body: 'Test' })
    expect(webpush.sendNotification).not.toHaveBeenCalled()
  })

  it('sendToStaff sends to subscriptions for a specific staff member', async () => {
    mockPrisma.pushSubscription.findMany.mockResolvedValue([
      { endpoint: 'https://waiter.example.com', p256dh: 'pw', auth: 'aw' },
    ])
    await service.sendToStaff('staff-42', { title: 'Order Ready', body: 'Table 3' })
    expect(mockPrisma.pushSubscription.findMany).toHaveBeenCalledWith({
      where: { staffId: 'staff-42' },
    })
    expect(webpush.sendNotification).toHaveBeenCalledTimes(1)
  })

  it('sendToRole does not throw when a push call fails', async () => {
    mockPrisma.pushSubscription.findMany.mockResolvedValue([
      { endpoint: 'https://gone.example.com', p256dh: 'p', auth: 'a' },
    ])
    ;(webpush.sendNotification as jest.Mock).mockRejectedValueOnce(new Error('410 Gone'))
    await expect(service.sendToRole('manager', { title: 'Low Stock', body: 'Tomatoes' })).resolves.not.toThrow()
  })
})
```

- [ ] **Step 2: Run the tests**

```bash
pnpm --filter @restaurant/api test -- --testPathPattern=notifications.service
```

Expected: `7 tests pass, 0 failed`.

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/notifications/notifications.service.spec.ts
git commit -m "test(notifications): add 7 unit tests for NotificationsService"
```

---

## Self-Review

**Spec coverage check:**

| Spec requirement | Covered by |
|---|---|
| Kitchen notified on new order | Task 6 — `OrderService.create` |
| Waiter notified when order ready | Task 6 — `OrderService.updateStatus` |
| Manager notified on low stock | Task 7 — `InventoryService.adjust` |
| Browser Push API, no external service | Task 1 (web-push), Task 8 (sw.js) |
| Permission requested on first use | Task 8 — `subscribe()` calls `Notification.requestPermission()` |
| Configure notifications in settings | Task 8 — Settings page toggle |

**Placeholder scan:** No TBDs or incomplete steps.

**Type consistency:** `SubscribeDto` defined in Task 3 (shared), used in Task 4 (`NotificationsService.subscribe`), and imported via `SubscribeDtoClass` in Task 5 (controller). `sendToRole` / `sendToStaff` signatures are consistent across Tasks 4, 6, and 7. `isSubscribed` / `subscribe` / `unsubscribe` exported from `notifications.ts` in Task 8 and imported correctly in the Settings page.
