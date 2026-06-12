# Plan 02: Authentication & Database Layer

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire up Prisma 7 with a full PostgreSQL schema, implement JWT auth (access + refresh tokens) in NestJS with role-based guards, and seed an initial manager account.

**Architecture:** PrismaService is a global NestJS module. AuthModule provides `POST /api/auth/login`, `POST /api/auth/refresh`, and `POST /api/auth/logout`. A `JwtAuthGuard` + `RolesGuard` pair protects all subsequent routes — any controller can use `@UseGuards(JwtAuthGuard, RolesGuard)` + `@Roles('manager')`. Refresh tokens are stored in the DB and rotated on each refresh; logout deletes the token.

**Tech Stack:** NestJS 11 + Fastify, Prisma 7, PostgreSQL 16, @nestjs/jwt, passport-jwt, bcrypt, nestjs-zod, @fastify/cookie

---

## File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| Create | `prisma/schema.prisma` | All 11 DB models + enums |
| Create | `prisma/seed.ts` | Seed initial manager account |
| Modify | `apps/api/package.json` | Add all missing deps + prisma seed script |
| Create | `apps/api/src/prisma/prisma.service.ts` | PrismaClient lifecycle |
| Create | `apps/api/src/prisma/prisma.module.ts` | Global module export |
| Create | `apps/api/src/auth/strategies/jwt.strategy.ts` | Validate Bearer access token |
| Create | `apps/api/src/auth/strategies/jwt-refresh.strategy.ts` | Validate refresh cookie |
| Create | `apps/api/src/auth/guards/jwt-auth.guard.ts` | Extends PassportGuard('jwt') |
| Create | `apps/api/src/auth/guards/roles.guard.ts` | ROLE_HIERARCHY check |
| Create | `apps/api/src/auth/decorators/roles.decorator.ts` | @Roles(...roles) |
| Create | `apps/api/src/auth/decorators/current-user.decorator.ts` | @CurrentUser() |
| Create | `apps/api/src/auth/auth.service.ts` | login, refresh, logout, token generation |
| Create | `apps/api/src/auth/auth.controller.ts` | 3 auth endpoints |
| Create | `apps/api/src/auth/auth.module.ts` | Wire strategies, guards, service |
| Create | `apps/api/src/auth/auth.controller.spec.ts` | Integration tests |
| Modify | `apps/api/src/app.module.ts` | Import PrismaModule, AuthModule |
| Modify | `apps/api/src/main.ts` | Register @fastify/cookie |
| Create | `apps/api/.env` | Local env from .env.example |

---

## Task 1: Install API Dependencies

**Files:**
- Modify: `apps/api/package.json`

- [ ] **Step 1.1: Add runtime dependencies**

```bash
pnpm --filter @restaurant/api add \
  @nestjs/jwt \
  @nestjs/passport \
  passport \
  passport-jwt \
  bcrypt \
  @prisma/client \
  nestjs-zod \
  @nestjs/swagger \
  @nestjs/throttler \
  @fastify/cookie \
  ioredis
```

- [ ] **Step 1.2: Add dev dependencies**

```bash
pnpm --filter @restaurant/api add -D \
  @types/passport-jwt \
  @types/bcrypt \
  @types/ioredis \
  prisma \
  supertest \
  @types/supertest
```

- [ ] **Step 1.3: Verify install**

```bash
pnpm --filter @restaurant/api typecheck
```
Expected: no errors (existing code unchanged)

- [ ] **Step 1.4: Commit**

```bash
git add apps/api/package.json pnpm-lock.yaml
git commit -m "chore(api): add auth, prisma, and swagger dependencies"
```

---

## Task 2: Prisma Schema

**Files:**
- Create: `prisma/schema.prisma`

- [ ] **Step 2.1: Write the failing test (schema generates)**

Create `prisma/schema.prisma`:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model Staff {
  id           String    @id @default(uuid())
  name         String
  email        String    @unique
  passwordHash String
  role         StaffRole
  active       Boolean   @default(true)
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt

  orders        Order[]
  shifts        Shift[]
  refreshTokens RefreshToken[]

  @@map("staff")
}

model RefreshToken {
  id        String   @id @default(uuid())
  token     String   @unique
  staffId   String
  expiresAt DateTime
  createdAt DateTime @default(now())

  staff Staff @relation(fields: [staffId], references: [id], onDelete: Cascade)

  @@map("refresh_tokens")
}

model Table {
  id        String      @id @default(uuid())
  number    Int         @unique
  seats     Int
  status    TableStatus @default(available)
  createdAt DateTime    @default(now())
  updatedAt DateTime    @updatedAt

  orders       Order[]
  reservations Reservation[]

  @@map("tables")
}

model MenuCategory {
  id        String     @id @default(uuid())
  name      String
  sortOrder Int        @default(0)
  items     MenuItem[]

  @@map("menu_categories")
}

model MenuItem {
  id          String   @id @default(uuid())
  name        String
  description String?
  price       Decimal  @db.Decimal(10, 2)
  categoryId  String
  available   Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  category        MenuCategory     @relation(fields: [categoryId], references: [id])
  orderItems      OrderItem[]
  inventoryUsages InventoryUsage[]

  @@map("menu_items")
}

model Order {
  id        String      @id @default(uuid())
  tableId   String
  staffId   String
  status    OrderStatus @default(draft)
  notes     String?
  createdAt DateTime    @default(now())
  updatedAt DateTime    @updatedAt

  table Table      @relation(fields: [tableId], references: [id])
  staff Staff      @relation(fields: [staffId], references: [id])
  items OrderItem[]
  bill  Bill?

  @@map("orders")
}

model OrderItem {
  id         String          @id @default(uuid())
  orderId    String
  menuItemId String
  quantity   Int
  status     OrderItemStatus @default(pending)
  notes      String?

  order    Order    @relation(fields: [orderId], references: [id], onDelete: Cascade)
  menuItem MenuItem @relation(fields: [menuItemId], references: [id])

  @@map("order_items")
}

model Reservation {
  id         String   @id @default(uuid())
  tableId    String
  guestName  String
  guestEmail String?
  guestPhone String?
  partySize  Int
  date       DateTime
  notes      String?
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  table Table @relation(fields: [tableId], references: [id])

  @@map("reservations")
}

model Shift {
  id        String    @id @default(uuid())
  staffId   String
  startTime DateTime
  endTime   DateTime?
  createdAt DateTime  @default(now())

  staff Staff @relation(fields: [staffId], references: [id])

  @@map("shifts")
}

model InventoryItem {
  id        String   @id @default(uuid())
  name      String
  unit      String
  quantity  Decimal  @db.Decimal(10, 3)
  minStock  Decimal  @db.Decimal(10, 3)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  usages InventoryUsage[]

  @@map("inventory_items")
}

model InventoryUsage {
  id              String  @id @default(uuid())
  inventoryItemId String
  menuItemId      String
  quantityUsed    Decimal @db.Decimal(10, 3)

  inventoryItem InventoryItem @relation(fields: [inventoryItemId], references: [id])
  menuItem      MenuItem      @relation(fields: [menuItemId], references: [id])

  @@map("inventory_usages")
}

model Bill {
  id        String   @id @default(uuid())
  orderId   String   @unique
  subtotal  Decimal  @db.Decimal(10, 2)
  tax       Decimal  @db.Decimal(10, 2)
  total     Decimal  @db.Decimal(10, 2)
  paid      Boolean  @default(false)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  order Order @relation(fields: [orderId], references: [id])

  @@map("bills")
}

enum StaffRole {
  manager
  waiter
  kitchen
  host
}

enum TableStatus {
  available
  occupied
  reserved
}

enum OrderStatus {
  draft
  sent
  in_progress
  ready
  served
}

enum OrderItemStatus {
  pending
  in_progress
  ready
}
```

- [ ] **Step 2.2: Validate schema parses**

```bash
pnpm dlx prisma validate --schema prisma/schema.prisma
```
Expected: `The schema at prisma/schema.prisma is valid`

- [ ] **Step 2.3: Generate Prisma client**

```bash
pnpm dlx prisma generate --schema prisma/schema.prisma
```
Expected: `Generated Prisma Client`

- [ ] **Step 2.4: Commit**

```bash
git add prisma/schema.prisma
git commit -m "feat(db): add full Prisma schema — 11 models, all enums"
```

---

## Task 3: Database Migration + Seed

**Files:**
- Create: `prisma/seed.ts`
- Modify: `apps/api/package.json` (add prisma.seed)

**Prerequisites:** Docker must be running. Start DB: `docker compose up -d postgres`

- [ ] **Step 3.1: Create initial migration**

```bash
DATABASE_URL="postgresql://restaurant:restaurant@localhost:5432/restaurant_dev" \
  pnpm dlx prisma migrate dev --name init --schema prisma/schema.prisma
```
Expected: `Your database is now in sync with your schema.`

- [ ] **Step 3.2: Write the seed file**

Create `prisma/seed.ts`:

```typescript
import { PrismaClient } from '@prisma/client'
import * as bcrypt from 'bcrypt'

const prisma = new PrismaClient()

async function main() {
  const existing = await prisma.staff.findUnique({ where: { email: 'admin@restaurant.local' } })
  if (existing) {
    console.log('Seed already applied — skipping')
    return
  }

  const passwordHash = await bcrypt.hash('admin123', 12)
  await prisma.staff.create({
    data: {
      name: 'Admin Manager',
      email: 'admin@restaurant.local',
      passwordHash,
      role: 'manager',
      active: true,
    },
  })
  console.log('Seeded initial manager: admin@restaurant.local / admin123')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
```

- [ ] **Step 3.3: Add seed config to apps/api/package.json**

In `apps/api/package.json`, add inside the top-level JSON object:

```json
"prisma": {
  "seed": "ts-node --project tsconfig.json ../../prisma/seed.ts"
}
```

- [ ] **Step 3.4: Run the seed**

```bash
DATABASE_URL="postgresql://restaurant:restaurant@localhost:5432/restaurant_dev" \
  pnpm dlx prisma db seed --schema prisma/schema.prisma
```
Expected: `Seeded initial manager: admin@restaurant.local / admin123`

- [ ] **Step 3.5: Verify row in DB**

```bash
DATABASE_URL="postgresql://restaurant:restaurant@localhost:5432/restaurant_dev" \
  pnpm dlx prisma studio --schema prisma/schema.prisma
```
Open `http://localhost:5555` → Staff table → confirm 1 row with role=manager.

- [ ] **Step 3.6: Commit**

```bash
git add prisma/seed.ts prisma/migrations apps/api/package.json
git commit -m "feat(db): initial migration and manager seed"
```

---

## Task 4: PrismaService (Global Module)

**Files:**
- Create: `apps/api/src/prisma/prisma.service.ts`
- Create: `apps/api/src/prisma/prisma.module.ts`

- [ ] **Step 4.1: Write the failing test**

Create `apps/api/src/prisma/prisma.service.spec.ts`:

```typescript
import { Test } from '@nestjs/testing'
import { PrismaService } from './prisma.service'

describe('PrismaService', () => {
  let service: PrismaService

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [PrismaService],
    }).compile()
    service = module.get(PrismaService)
  })

  it('is defined', () => {
    expect(service).toBeDefined()
  })

  it('exposes onModuleInit without error', async () => {
    await expect(service.onModuleInit()).resolves.not.toThrow()
  })
})
```

- [ ] **Step 4.2: Run test to verify it fails**

```bash
pnpm --filter @restaurant/api test -- --testPathPattern prisma.service
```
Expected: FAIL — `Cannot find module './prisma.service'`

- [ ] **Step 4.3: Implement PrismaService**

Create `apps/api/src/prisma/prisma.service.ts`:

```typescript
import { Injectable, OnModuleInit } from '@nestjs/common'
import { PrismaClient } from '@prisma/client'

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  async onModuleInit() {
    await this.$connect()
  }
}
```

- [ ] **Step 4.4: Implement PrismaModule**

Create `apps/api/src/prisma/prisma.module.ts`:

```typescript
import { Global, Module } from '@nestjs/common'
import { PrismaService } from './prisma.service'

@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
```

- [ ] **Step 4.5: Run test to verify it passes**

```bash
pnpm --filter @restaurant/api test -- --testPathPattern prisma.service
```
Expected: PASS

- [ ] **Step 4.6: Commit**

```bash
git add apps/api/src/prisma/
git commit -m "feat(api): add global PrismaModule and PrismaService"
```

---

## Task 5: Auth Decorators & Guards

**Files:**
- Create: `apps/api/src/auth/decorators/roles.decorator.ts`
- Create: `apps/api/src/auth/decorators/current-user.decorator.ts`
- Create: `apps/api/src/auth/guards/jwt-auth.guard.ts`
- Create: `apps/api/src/auth/guards/roles.guard.ts`

These have no service dependencies — implement directly.

- [ ] **Step 5.1: Create @Roles() decorator**

Create `apps/api/src/auth/decorators/roles.decorator.ts`:

```typescript
import { SetMetadata } from '@nestjs/common'
import { StaffRole } from '@restaurant/shared'

export const ROLES_KEY = 'roles'
export const Roles = (...roles: StaffRole[]) => SetMetadata(ROLES_KEY, roles)
```

- [ ] **Step 5.2: Create @CurrentUser() decorator**

Create `apps/api/src/auth/decorators/current-user.decorator.ts`:

```typescript
import { createParamDecorator, ExecutionContext } from '@nestjs/common'

export const CurrentUser = createParamDecorator((_data: unknown, ctx: ExecutionContext) => {
  const request = ctx.switchToHttp().getRequest()
  return request.user
})
```

- [ ] **Step 5.3: Create JwtAuthGuard**

Create `apps/api/src/auth/guards/jwt-auth.guard.ts`:

```typescript
import { Injectable } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
```

- [ ] **Step 5.4: Create RolesGuard**

Create `apps/api/src/auth/guards/roles.guard.ts`:

```typescript
import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { ROLE_HIERARCHY, StaffRole } from '@restaurant/shared'
import { ROLES_KEY } from '../decorators/roles.decorator'

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(ctx: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<StaffRole[]>(ROLES_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ])
    if (!required || required.length === 0) return true

    const { user } = ctx.switchToHttp().getRequest()
    if (!user) return false

    const userLevel = ROLE_HIERARCHY[user.role] ?? 0
    const minRequired = Math.min(...required.map((r) => ROLE_HIERARCHY[r] ?? 0))
    return userLevel >= minRequired
  }
}
```

- [ ] **Step 5.5: Write guard unit tests**

Create `apps/api/src/auth/guards/roles.guard.spec.ts`:

```typescript
import { Reflector } from '@nestjs/core'
import { RolesGuard } from './roles.guard'

function makeCtx(role: string, requiredRoles: string[]) {
  return {
    switchToHttp: () => ({ getRequest: () => ({ user: { role } }) }),
    getHandler: () => ({}),
    getClass: () => ({}),
  } as any
}

describe('RolesGuard', () => {
  let guard: RolesGuard
  let reflector: Reflector

  beforeEach(() => {
    reflector = new Reflector()
    guard = new RolesGuard(reflector)
  })

  it('allows access when no roles required', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined)
    expect(guard.canActivate(makeCtx('kitchen', []))).toBe(true)
  })

  it('allows manager to access manager-only route', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['manager'])
    expect(guard.canActivate(makeCtx('manager', ['manager']))).toBe(true)
  })

  it('blocks kitchen staff from manager-only route', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['manager'])
    expect(guard.canActivate(makeCtx('kitchen', ['manager']))).toBe(false)
  })

  it('allows host to access host-or-waiter route', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['waiter'])
    expect(guard.canActivate(makeCtx('host', ['waiter']))).toBe(true)
  })
})
```

- [ ] **Step 5.6: Run guard tests**

```bash
pnpm --filter @restaurant/api test -- --testPathPattern roles.guard
```
Expected: 4 tests pass

- [ ] **Step 5.7: Commit**

```bash
git add apps/api/src/auth/decorators/ apps/api/src/auth/guards/
git commit -m "feat(auth): add JWT guard, roles guard, and param decorators"
```

---

## Task 6: JWT Strategies

**Files:**
- Create: `apps/api/src/auth/strategies/jwt.strategy.ts`
- Create: `apps/api/src/auth/strategies/jwt-refresh.strategy.ts`

- [ ] **Step 6.1: Create JWT access strategy**

Create `apps/api/src/auth/strategies/jwt.strategy.ts`:

```typescript
import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { PassportStrategy } from '@nestjs/passport'
import { ExtractJwt, Strategy } from 'passport-jwt'

export interface JwtPayload {
  sub: string
  email: string
  role: string
  iat?: number
  exp?: number
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('JWT_SECRET'),
    })
  }

  validate(payload: JwtPayload) {
    return { id: payload.sub, email: payload.email, role: payload.role }
  }
}
```

- [ ] **Step 6.2: Create JWT refresh strategy**

Create `apps/api/src/auth/strategies/jwt-refresh.strategy.ts`:

```typescript
import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { PassportStrategy } from '@nestjs/passport'
import { ExtractJwt, Strategy } from 'passport-jwt'
import { FastifyRequest } from 'fastify'

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(Strategy, 'jwt-refresh') {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (req: FastifyRequest) => (req.cookies as Record<string, string>)?.['refresh_token'] ?? null,
      ]),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('JWT_REFRESH_SECRET'),
      passReqToCallback: true,
    })
  }

  validate(req: FastifyRequest, payload: { sub: string; email: string; role: string }) {
    const token = (req.cookies as Record<string, string>)?.['refresh_token']
    return { id: payload.sub, email: payload.email, role: payload.role, refreshToken: token }
  }
}
```

- [ ] **Step 6.3: Create JwtRefreshGuard**

Create `apps/api/src/auth/guards/jwt-refresh.guard.ts`:

```typescript
import { Injectable } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'

@Injectable()
export class JwtRefreshGuard extends AuthGuard('jwt-refresh') {}
```

- [ ] **Step 6.4: Commit**

```bash
git add apps/api/src/auth/strategies/ apps/api/src/auth/guards/jwt-refresh.guard.ts
git commit -m "feat(auth): add JWT access and refresh passport strategies"
```

---

## Task 7: AuthService

**Files:**
- Create: `apps/api/src/auth/auth.service.ts`

- [ ] **Step 7.1: Write the failing test**

Create `apps/api/src/auth/auth.service.spec.ts`:

```typescript
import { Test } from '@nestjs/testing'
import { JwtService } from '@nestjs/jwt'
import { ConfigService } from '@nestjs/config'
import { UnauthorizedException } from '@nestjs/common'
import { AuthService } from './auth.service'
import { PrismaService } from '../prisma/prisma.service'
import * as bcrypt from 'bcrypt'

const mockPrisma = {
  staff: { findUnique: jest.fn() },
  refreshToken: { create: jest.fn(), findUnique: jest.fn(), delete: jest.fn() },
}
const mockJwt = { signAsync: jest.fn(), verifyAsync: jest.fn() }
const mockConfig = { get: jest.fn((key: string) => key) }

describe('AuthService', () => {
  let service: AuthService

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: JwtService, useValue: mockJwt },
        { provide: ConfigService, useValue: mockConfig },
      ],
    }).compile()
    service = module.get(AuthService)
    jest.clearAllMocks()
  })

  describe('validateUser', () => {
    it('returns user without passwordHash on valid credentials', async () => {
      const hash = await bcrypt.hash('password123', 10)
      mockPrisma.staff.findUnique.mockResolvedValue({
        id: 'uuid-1', email: 'a@b.com', passwordHash: hash, role: 'manager', active: true, name: 'A',
      })
      const result = await service.validateUser('a@b.com', 'password123')
      expect(result).not.toHaveProperty('passwordHash')
      expect(result?.email).toBe('a@b.com')
    })

    it('returns null for wrong password', async () => {
      const hash = await bcrypt.hash('correct', 10)
      mockPrisma.staff.findUnique.mockResolvedValue({
        id: 'uuid-1', email: 'a@b.com', passwordHash: hash, role: 'manager', active: true, name: 'A',
      })
      const result = await service.validateUser('a@b.com', 'wrong')
      expect(result).toBeNull()
    })

    it('returns null when user not found', async () => {
      mockPrisma.staff.findUnique.mockResolvedValue(null)
      expect(await service.validateUser('none@b.com', 'x')).toBeNull()
    })

    it('returns null for inactive staff', async () => {
      const hash = await bcrypt.hash('pass', 10)
      mockPrisma.staff.findUnique.mockResolvedValue({
        id: 'uuid-1', email: 'a@b.com', passwordHash: hash, role: 'waiter', active: false, name: 'A',
      })
      expect(await service.validateUser('a@b.com', 'pass')).toBeNull()
    })
  })

  describe('login', () => {
    it('throws UnauthorizedException for bad credentials', async () => {
      mockPrisma.staff.findUnique.mockResolvedValue(null)
      await expect(service.login({ email: 'x@x.com', password: 'bad' }))
        .rejects.toThrow(UnauthorizedException)
    })
  })
})
```

- [ ] **Step 7.2: Run test to verify it fails**

```bash
pnpm --filter @restaurant/api test -- --testPathPattern auth.service
```
Expected: FAIL — `Cannot find module './auth.service'`

- [ ] **Step 7.3: Implement AuthService**

Create `apps/api/src/auth/auth.service.ts`:

```typescript
import { Injectable, UnauthorizedException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { ConfigService } from '@nestjs/config'
import * as bcrypt from 'bcrypt'
import { randomUUID } from 'crypto'
import { PrismaService } from '../prisma/prisma.service'
import type { LoginDto } from '@restaurant/shared'

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
  ) {}

  async validateUser(email: string, password: string) {
    const staff = await this.prisma.staff.findUnique({ where: { email } })
    if (!staff || !staff.active) return null
    const valid = await bcrypt.compare(password, staff.passwordHash)
    if (!valid) return null
    const { passwordHash: _, ...user } = staff
    return user
  }

  async login(dto: LoginDto) {
    const user = await this.validateUser(dto.email, dto.password)
    if (!user) throw new UnauthorizedException('Invalid credentials')

    const accessToken = await this.signAccessToken(user.id, user.email, user.role)
    const refreshToken = await this.createRefreshToken(user.id)

    return { accessToken, refreshToken, user }
  }

  async refresh(staffId: string, email: string, role: string, rawToken: string) {
    const stored = await this.prisma.refreshToken.findUnique({ where: { token: rawToken } })
    if (!stored || stored.staffId !== staffId || stored.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid refresh token')
    }

    await this.prisma.refreshToken.delete({ where: { id: stored.id } })

    const accessToken = await this.signAccessToken(staffId, email, role)
    const refreshToken = await this.createRefreshToken(staffId)

    return { accessToken, refreshToken }
  }

  async logout(rawToken: string) {
    await this.prisma.refreshToken.delete({ where: { token: rawToken } }).catch(() => null)
  }

  private async signAccessToken(sub: string, email: string, role: string) {
    return this.jwt.signAsync(
      { sub, email, role },
      { secret: this.config.get('JWT_SECRET'), expiresIn: '15m' },
    )
  }

  private async createRefreshToken(staffId: string) {
    const token = randomUUID()
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    await this.prisma.refreshToken.create({ data: { token, staffId, expiresAt } })
    return token
  }
}
```

- [ ] **Step 7.4: Run tests to verify they pass**

```bash
pnpm --filter @restaurant/api test -- --testPathPattern auth.service
```
Expected: 5 tests pass

- [ ] **Step 7.5: Commit**

```bash
git add apps/api/src/auth/auth.service.ts apps/api/src/auth/auth.service.spec.ts
git commit -m "feat(auth): implement AuthService — login, refresh, logout, token rotation"
```

---

## Task 8: AuthController

**Files:**
- Create: `apps/api/src/auth/auth.controller.ts`
- Create: `apps/api/src/auth/auth.module.ts`

- [ ] **Step 8.1: Write the failing integration test**

Create `apps/api/src/auth/auth.controller.spec.ts`:

```typescript
import { Test } from '@nestjs/testing'
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify'
import { AuthController } from './auth.controller'
import { AuthService } from './auth.service'
import fastifyCookie from '@fastify/cookie'

const mockAuthService = {
  login: jest.fn(),
  refresh: jest.fn(),
  logout: jest.fn(),
}

describe('AuthController (integration)', () => {
  let app: NestFastifyApplication

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: mockAuthService }],
    }).compile()

    app = module.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter(),
    )
    await app.register(fastifyCookie)
    await app.init()
    await app.getHttpAdapter().getInstance().ready()
  })

  afterAll(() => app.close())

  beforeEach(() => jest.clearAllMocks())

  it('POST /auth/login returns 200 with accessToken', async () => {
    mockAuthService.login.mockResolvedValue({
      accessToken: 'tok',
      refreshToken: 'ref',
      user: { id: '1', email: 'a@b.com', role: 'manager', name: 'A', active: true },
    })

    const res = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email: 'a@b.com', password: 'admin123' },
    })

    expect(res.statusCode).toBe(200)
    expect(JSON.parse(res.body)).toMatchObject({ accessToken: 'tok' })
    expect(res.headers['set-cookie']).toMatch(/refresh_token=ref/)
  })

  it('POST /auth/login returns 400 for invalid body', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email: 'not-an-email', password: '' },
    })
    expect(res.statusCode).toBe(400)
  })

  it('POST /auth/logout returns 204', async () => {
    mockAuthService.logout.mockResolvedValue(undefined)
    const res = await app.inject({
      method: 'POST',
      url: '/auth/logout',
      cookies: { refresh_token: 'ref' },
    })
    expect(res.statusCode).toBe(204)
  })
})
```

- [ ] **Step 8.2: Run test to verify it fails**

```bash
pnpm --filter @restaurant/api test -- --testPathPattern auth.controller
```
Expected: FAIL — `Cannot find module './auth.controller'`

- [ ] **Step 8.3: Implement AuthController**

Create `apps/api/src/auth/auth.controller.ts`:

```typescript
import {
  Body, Controller, HttpCode, Post, Req, Res, UseGuards,
} from '@nestjs/common'
import { FastifyReply, FastifyRequest } from 'fastify'
import { AuthService } from './auth.service'
import { JwtRefreshGuard } from './guards/jwt-refresh.guard'
import { CurrentUser } from './decorators/current-user.decorator'
import { LoginSchema } from '@restaurant/shared'
import { ZodValidationPipe } from 'nestjs-zod'

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  @HttpCode(200)
  async login(
    @Body(new ZodValidationPipe(LoginSchema)) body: { email: string; password: string },
    @Res({ passthrough: true }) res: FastifyReply,
  ) {
    const { accessToken, refreshToken, user } = await this.authService.login(body)
    res.setCookie('refresh_token', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/api/auth/refresh',
      maxAge: 7 * 24 * 60 * 60,
    })
    return { accessToken, user }
  }

  @Post('refresh')
  @HttpCode(200)
  @UseGuards(JwtRefreshGuard)
  async refresh(
    @CurrentUser() user: { id: string; email: string; role: string; refreshToken: string },
    @Res({ passthrough: true }) res: FastifyReply,
  ) {
    const { accessToken, refreshToken } = await this.authService.refresh(
      user.id, user.email, user.role, user.refreshToken,
    )
    res.setCookie('refresh_token', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/api/auth/refresh',
      maxAge: 7 * 24 * 60 * 60,
    })
    return { accessToken }
  }

  @Post('logout')
  @HttpCode(204)
  async logout(@Req() req: FastifyRequest, @Res({ passthrough: true }) res: FastifyReply) {
    const token = (req.cookies as Record<string, string>)?.['refresh_token']
    if (token) await this.authService.logout(token)
    res.clearCookie('refresh_token', { path: '/api/auth/refresh' })
  }
}
```

- [ ] **Step 8.4: Implement AuthModule**

Create `apps/api/src/auth/auth.module.ts`:

```typescript
import { Module } from '@nestjs/common'
import { JwtModule } from '@nestjs/jwt'
import { PassportModule } from '@nestjs/passport'
import { AuthController } from './auth.controller'
import { AuthService } from './auth.service'
import { JwtStrategy } from './strategies/jwt.strategy'
import { JwtRefreshStrategy } from './strategies/jwt-refresh.strategy'
import { RolesGuard } from './guards/roles.guard'

@Module({
  imports: [
    PassportModule,
    JwtModule.register({}),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, JwtRefreshStrategy, RolesGuard],
  exports: [JwtAuthGuardExports, RolesGuard],
})
export class AuthModule {}
```

Wait — export the guards properly. Use this version instead:

```typescript
import { Module } from '@nestjs/common'
import { JwtModule } from '@nestjs/jwt'
import { PassportModule } from '@nestjs/passport'
import { AuthController } from './auth.controller'
import { AuthService } from './auth.service'
import { JwtStrategy } from './strategies/jwt.strategy'
import { JwtRefreshStrategy } from './strategies/jwt-refresh.strategy'
import { JwtAuthGuard } from './guards/jwt-auth.guard'
import { JwtRefreshGuard } from './guards/jwt-refresh.guard'
import { RolesGuard } from './guards/roles.guard'

@Module({
  imports: [PassportModule, JwtModule.register({})],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,
    JwtRefreshStrategy,
    JwtAuthGuard,
    JwtRefreshGuard,
    RolesGuard,
  ],
  exports: [JwtAuthGuard, JwtRefreshGuard, RolesGuard, AuthService],
})
export class AuthModule {}
```

- [ ] **Step 8.5: Run integration tests**

```bash
pnpm --filter @restaurant/api test -- --testPathPattern auth.controller
```
Expected: 3 tests pass

- [ ] **Step 8.6: Commit**

```bash
git add apps/api/src/auth/
git commit -m "feat(auth): AuthController — login, refresh, logout with cookie rotation"
```

---

## Task 9: Wire AppModule + main.ts

**Files:**
- Modify: `apps/api/src/app.module.ts`
- Modify: `apps/api/src/main.ts`
- Create: `apps/api/.env`

- [ ] **Step 9.1: Create .env from example**

Read `apps/api/.env.example` to see existing keys, then create `apps/api/.env`:

```
DATABASE_URL="postgresql://restaurant:restaurant@localhost:5432/restaurant_dev"
REDIS_URL="redis://localhost:6379"
JWT_SECRET="dev-jwt-secret-change-in-production"
JWT_REFRESH_SECRET="dev-refresh-secret-change-in-production"
PORT=3001
NODE_ENV=development
```

- [ ] **Step 9.2: Register @fastify/cookie in main.ts**

Edit `apps/api/src/main.ts` — add cookie registration after `NestFactory.create`:

```typescript
import { NestFactory } from '@nestjs/core'
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify'
import fastifyCookie from '@fastify/cookie'
import { AppModule } from './app.module'

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({ logger: process.env.NODE_ENV !== 'test' }),
  )
  await app.register(fastifyCookie)
  app.setGlobalPrefix('api')
  app.enableCors({ origin: 'http://localhost:5173', credentials: true })
  const port = process.env.PORT ?? 3001
  await app.listen(port, '0.0.0.0')
  console.log(`API running on http://localhost:${port}/api`)
}
bootstrap()
```

- [ ] **Step 9.3: Import PrismaModule and AuthModule into AppModule**

Edit `apps/api/src/app.module.ts`:

```typescript
import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { HealthController } from './health/health.controller'
import { PrismaModule } from './prisma/prisma.module'
import { AuthModule } from './auth/auth.module'

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
```

- [ ] **Step 9.4: Verify build**

```bash
pnpm --filter @restaurant/api build
```
Expected: exit 0, `dist/` updated

- [ ] **Step 9.5: Run all tests**

```bash
pnpm --filter @restaurant/api test
```
Expected: all tests pass

- [ ] **Step 9.6: Smoke test the running server**

Start Docker and the API:
```bash
docker compose up -d postgres redis
pnpm --filter @restaurant/api dev
```

In a second terminal:
```bash
curl -s -X POST http://localhost:3001/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@restaurant.local","password":"admin123"}' | jq .
```
Expected: `{"accessToken":"eyJ...","user":{"id":"...","email":"admin@restaurant.local","role":"manager",...}}`

- [ ] **Step 9.7: Commit**

```bash
git add apps/api/src/app.module.ts apps/api/src/main.ts apps/api/.env
git commit -m "feat(api): wire PrismaModule and AuthModule into AppModule"
```

---

## Task 10: Store Patterns in Ruflo + Final Commit

- [ ] **Step 10.1: Store auth pattern in ruflo memory**

```bash
ruflo memory store \
  --namespace patterns \
  --key "nestjs-jwt-auth-pattern" \
  --value "NestJS JWT auth: JwtStrategy(Bearer) + JwtRefreshStrategy(cookie). Token rotation on refresh. Roles via ROLE_HIERARCHY map. LoginSchema from shared package for validation."
```

- [ ] **Step 10.2: Run post-task hook**

```bash
ruflo hooks post-task \
  --task-id "plan-02-auth-database" \
  --success true \
  --store-results true
```

- [ ] **Step 10.3: Dispatch testgaps worker**

```bash
ruflo hooks worker dispatch --trigger testgaps
```

- [ ] **Step 10.4: Final verification**

```bash
pnpm --filter @restaurant/api test
pnpm --filter @restaurant/api build
pnpm --filter @restaurant/api typecheck
```
Expected: all pass

- [ ] **Step 10.5: Final commit**

```bash
git add -A
git commit -m "feat: Plan 02 complete — auth & database layer (Prisma + JWT + guards)"
```

---

## Self-Review Checklist

- [x] Prisma schema covers all 11 models from design spec
- [x] RefreshToken model enables token rotation + DB-backed invalidation
- [x] Login → 200 + access token + refresh cookie
- [x] Refresh → token rotation (old deleted, new issued)
- [x] Logout → refresh token deleted from DB + cookie cleared
- [x] RolesGuard uses ROLE_HIERARCHY from shared constants
- [x] @CurrentUser() works with JwtAuthGuard in subsequent plans
- [x] nestjs-zod ZodValidationPipe on LoginSchema = shared validation
- [x] .env listed in .gitignore (already present from Plan 01)
- [x] Seed idempotent (skips if manager already exists)
- [x] All Prisma models use @@map() for snake_case table names
- [x] No passwordHash ever returned from controller responses
