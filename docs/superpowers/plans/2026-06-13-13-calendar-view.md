# Calendar View Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `/calendar` route showing reservations and staff shifts on a weekly calendar powered by `react-big-calendar`.

**Architecture:** The calendar page has two tabs — Reservations and Shifts — each rendering a `react-big-calendar` Week view. Reservations already exist in the API; shifts require a new NestJS module. The Shift Zod schema must be aligned with the existing Prisma model before building the API. The frontend route is manually added to `routeTree.gen.ts` following the established pattern.

**Tech Stack:** NestJS (ShiftModule), Prisma (`shift` table already migrated), `react-big-calendar` + `dayjs`, TanStack Query, TanStack Router, Tailwind CSS v4.

---

## File Map

**Create:**
- `apps/api/src/shift/shift.service.ts` — ShiftService (findAll, findOne, create, update, remove)
- `apps/api/src/shift/shift.controller.ts` — ShiftController (GET/POST/PATCH/DELETE)
- `apps/api/src/shift/shift.module.ts` — ShiftModule
- `apps/api/src/shift/dto/shift.dto.ts` — DTOs via createZodDto
- `apps/api/src/shift/shift.service.spec.ts` — unit tests
- `apps/web/src/lib/shift-api.ts` — TanStack Query hooks for shifts
- `apps/web/src/routes/_app/calendar/index.tsx` — Calendar page (reservations + shifts tabs)

**Modify:**
- `packages/shared/src/schemas/shift.ts` — align with Prisma model (DateTime for startTime/endTime)
- `apps/api/src/app.module.ts` — register ShiftModule
- `apps/web/src/routeTree.gen.ts` — add calendar route
- `apps/web/src/components/layout/sidebar.tsx` — add Calendar nav item
- `apps/web/package.json` — add react-big-calendar + dayjs

---

### Task 1: Align Shift Zod schema with Prisma model

The existing `ShiftSchema` in `packages/shared/src/schemas/shift.ts` uses separate `date`/`startTime`/`endTime` string fields and `clockIn`/`clockOut`. The Prisma `Shift` model uses `startTime DateTime` and `endTime DateTime?`. These must match.

**Files:**
- Modify: `packages/shared/src/schemas/shift.ts`

- [ ] **Step 1: Read the current file**

```bash
cat packages/shared/src/schemas/shift.ts
```

- [ ] **Step 2: Overwrite with corrected schema**

Replace the entire content of `packages/shared/src/schemas/shift.ts`:

```ts
import { z } from 'zod'

export const ShiftSchema = z.object({
  id: z.string().uuid(),
  staffId: z.string().uuid(),
  startTime: z.coerce.date(),
  endTime: z.coerce.date().nullable(),
  createdAt: z.coerce.date(),
})
export type Shift = z.infer<typeof ShiftSchema>

export const CreateShiftSchema = z.object({
  staffId: z.string().uuid(),
  startTime: z.coerce.date(),
  endTime: z.coerce.date().optional().nullable(),
})
export type CreateShiftDto = z.infer<typeof CreateShiftSchema>

export const UpdateShiftSchema = CreateShiftSchema.partial()
export type UpdateShiftDto = z.infer<typeof UpdateShiftSchema>
```

- [ ] **Step 3: Rebuild the shared package**

```bash
cd packages/shared && pnpm build
```

Expected: `dist/` rebuilt with no TypeScript errors.

- [ ] **Step 4: Commit**

```bash
git add packages/shared/src/schemas/shift.ts
git commit -m "refactor(shared): align ShiftSchema with Prisma model (DateTime startTime/endTime)"
```

---

### Task 2: Build the Shift API service

**Files:**
- Create: `apps/api/src/shift/shift.service.ts`

- [ ] **Step 1: Write the failing test first (in Task 4 — skip, build service then tests)**

- [ ] **Step 2: Create the service**

Create `apps/api/src/shift/shift.service.ts`:

```ts
import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import type { CreateShiftDto, UpdateShiftDto } from '@restaurant/shared'

@Injectable()
export class ShiftService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(from?: string, to?: string) {
    const where =
      from && to
        ? {
            startTime: {
              gte: new Date(from),
              lt: new Date(new Date(to).getTime() + 86_400_000),
            },
          }
        : undefined
    return this.prisma.shift.findMany({ where, orderBy: { startTime: 'asc' } })
  }

  async findOne(id: string) {
    const shift = await this.prisma.shift.findUnique({ where: { id } })
    if (!shift) throw new NotFoundException('Shift not found')
    return shift
  }

  create(dto: CreateShiftDto) {
    return this.prisma.shift.create({
      data: {
        staffId: dto.staffId,
        startTime: new Date(dto.startTime),
        endTime: dto.endTime ? new Date(dto.endTime) : null,
      },
    })
  }

  async update(id: string, dto: UpdateShiftDto) {
    await this.findOne(id)
    const data: Record<string, unknown> = {}
    if (dto.staffId !== undefined) data.staffId = dto.staffId
    if (dto.startTime !== undefined) data.startTime = new Date(dto.startTime)
    if (dto.endTime !== undefined) data.endTime = dto.endTime ? new Date(dto.endTime) : null
    return this.prisma.shift.update({ where: { id }, data })
  }

  async remove(id: string) {
    await this.findOne(id)
    return this.prisma.shift.delete({ where: { id } })
  }
}
```

---

### Task 3: Build the Shift API controller, module, and DTOs

**Files:**
- Create: `apps/api/src/shift/dto/shift.dto.ts`
- Create: `apps/api/src/shift/shift.controller.ts`
- Create: `apps/api/src/shift/shift.module.ts`
- Modify: `apps/api/src/app.module.ts`

- [ ] **Step 1: Create DTOs**

Create `apps/api/src/shift/dto/shift.dto.ts`:

```ts
import { createZodDto } from 'nestjs-zod'
import { CreateShiftSchema, UpdateShiftSchema } from '@restaurant/shared'

export class CreateShiftDto extends createZodDto(CreateShiftSchema) {}
export class UpdateShiftDto extends createZodDto(UpdateShiftSchema) {}
```

- [ ] **Step 2: Create controller**

Create `apps/api/src/shift/shift.controller.ts`:

```ts
import {
  Controller, Get, Post, Patch, Delete,
  Param, Body, Query, HttpCode, HttpStatus, UseGuards,
} from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { RolesGuard } from '../auth/guards/roles.guard'
import { Roles } from '../auth/decorators/roles.decorator'
import { ShiftService } from './shift.service'
import { CreateShiftDto, UpdateShiftDto } from './dto/shift.dto'

@ApiTags('shifts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('shifts')
export class ShiftController {
  constructor(private readonly shifts: ShiftService) {}

  @Get()
  @ApiOperation({ summary: 'List shifts, optionally filtered by date range (YYYY-MM-DD)' })
  @ApiQuery({ name: 'from', required: false })
  @ApiQuery({ name: 'to', required: false })
  getAll(@Query('from') from?: string, @Query('to') to?: string) {
    return this.shifts.findAll(from, to)
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a shift by id' })
  getOne(@Param('id') id: string) {
    return this.shifts.findOne(id)
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles('manager')
  @ApiOperation({ summary: 'Create a shift' })
  create(@Body() dto: CreateShiftDto) {
    return this.shifts.create(dto)
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles('manager')
  @ApiOperation({ summary: 'Update a shift' })
  update(@Param('id') id: string, @Body() dto: UpdateShiftDto) {
    return this.shifts.update(id, dto)
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('manager')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a shift' })
  remove(@Param('id') id: string) {
    return this.shifts.remove(id)
  }
}
```

- [ ] **Step 3: Create module**

Create `apps/api/src/shift/shift.module.ts`:

```ts
import { Module } from '@nestjs/common'
import { ShiftService } from './shift.service'
import { ShiftController } from './shift.controller'

@Module({
  providers: [ShiftService],
  controllers: [ShiftController],
  exports: [ShiftService],
})
export class ShiftModule {}
```

- [ ] **Step 4: Read app.module.ts before editing**

```bash
cat apps/api/src/app.module.ts
```

- [ ] **Step 5: Register ShiftModule in AppModule**

Edit `apps/api/src/app.module.ts` — add ShiftModule import alongside the existing imports:

```ts
import { ShiftModule } from './shift/shift.module'
```

And add `ShiftModule` to the `imports` array.

- [ ] **Step 6: Verify API builds**

```bash
cd apps/api && pnpm build 2>&1 | tail -20
```

Expected: no TypeScript errors.

- [ ] **Step 7: Commit**

```bash
git add apps/api/src/shift/ apps/api/src/app.module.ts
git commit -m "feat(api): add Shift module — GET/POST/PATCH/DELETE /shifts with date-range filter"
```

---

### Task 4: Write ShiftService unit tests

**Files:**
- Create: `apps/api/src/shift/shift.service.spec.ts`

- [ ] **Step 1: Create the test file**

Create `apps/api/src/shift/shift.service.spec.ts`:

```ts
import { Test, TestingModule } from '@nestjs/testing'
import { NotFoundException } from '@nestjs/common'
import { ShiftService } from './shift.service'
import { PrismaService } from '../prisma/prisma.service'

const mockShift = {
  id: 'shift-uuid-1',
  staffId: 'staff-uuid-1',
  startTime: new Date('2026-06-13T08:00:00Z'),
  endTime: new Date('2026-06-13T16:00:00Z'),
  createdAt: new Date(),
}

const mockPrisma = {
  shift: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
}

describe('ShiftService', () => {
  let service: ShiftService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ShiftService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile()
    service = module.get(ShiftService)
    jest.clearAllMocks()
  })

  describe('findAll', () => {
    it('returns all shifts without filter', async () => {
      mockPrisma.shift.findMany.mockResolvedValue([mockShift])
      const result = await service.findAll()
      expect(result).toEqual([mockShift])
      expect(mockPrisma.shift.findMany).toHaveBeenCalledWith({ where: undefined, orderBy: { startTime: 'asc' } })
    })

    it('filters by date range when from and to are provided', async () => {
      mockPrisma.shift.findMany.mockResolvedValue([mockShift])
      await service.findAll('2026-06-13', '2026-06-13')
      const call = mockPrisma.shift.findMany.mock.calls[0][0]
      expect(call.where.startTime.gte).toEqual(new Date('2026-06-13'))
    })
  })

  describe('findOne', () => {
    it('returns shift when found', async () => {
      mockPrisma.shift.findUnique.mockResolvedValue(mockShift)
      const result = await service.findOne('shift-uuid-1')
      expect(result).toEqual(mockShift)
    })

    it('throws NotFoundException when not found', async () => {
      mockPrisma.shift.findUnique.mockResolvedValue(null)
      await expect(service.findOne('nonexistent')).rejects.toThrow(NotFoundException)
    })
  })

  describe('create', () => {
    it('creates a shift with provided data', async () => {
      mockPrisma.shift.create.mockResolvedValue(mockShift)
      const dto = { staffId: 'staff-uuid-1', startTime: new Date('2026-06-13T08:00:00Z'), endTime: new Date('2026-06-13T16:00:00Z') }
      const result = await service.create(dto)
      expect(result).toEqual(mockShift)
      expect(mockPrisma.shift.create).toHaveBeenCalledWith({
        data: {
          staffId: 'staff-uuid-1',
          startTime: new Date('2026-06-13T08:00:00Z'),
          endTime: new Date('2026-06-13T16:00:00Z'),
        },
      })
    })
  })

  describe('update', () => {
    it('updates a shift when found', async () => {
      mockPrisma.shift.findUnique.mockResolvedValue(mockShift)
      const updated = { ...mockShift, endTime: new Date('2026-06-13T18:00:00Z') }
      mockPrisma.shift.update.mockResolvedValue(updated)
      const result = await service.update('shift-uuid-1', { endTime: new Date('2026-06-13T18:00:00Z') })
      expect(result.endTime).toEqual(new Date('2026-06-13T18:00:00Z'))
    })

    it('throws NotFoundException when shift not found', async () => {
      mockPrisma.shift.findUnique.mockResolvedValue(null)
      await expect(service.update('nonexistent', {})).rejects.toThrow(NotFoundException)
    })
  })

  describe('remove', () => {
    it('deletes a shift when found', async () => {
      mockPrisma.shift.findUnique.mockResolvedValue(mockShift)
      mockPrisma.shift.delete.mockResolvedValue(mockShift)
      const result = await service.remove('shift-uuid-1')
      expect(result).toEqual(mockShift)
    })

    it('throws NotFoundException when shift not found', async () => {
      mockPrisma.shift.findUnique.mockResolvedValue(null)
      await expect(service.remove('nonexistent')).rejects.toThrow(NotFoundException)
    })
  })
})
```

- [ ] **Step 2: Run tests**

```bash
cd apps/api && pnpm test --testPathPattern=shift.service.spec
```

Expected: 8 tests pass.

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/shift/shift.service.spec.ts
git commit -m "test(shift): add 8 unit tests for ShiftService"
```

---

### Task 5: Install react-big-calendar and dayjs in the web app

**Files:**
- Modify: `apps/web/package.json`

- [ ] **Step 1: Add dependencies**

```bash
cd apps/web && pnpm add react-big-calendar dayjs
pnpm add -D @types/react-big-calendar
```

Expected: `react-big-calendar`, `dayjs`, and `@types/react-big-calendar` appear in `apps/web/package.json`.

- [ ] **Step 2: Verify types resolve**

```bash
cd apps/web && pnpm typecheck 2>&1 | grep -i 'react-big-calendar' | head -5
```

Expected: no errors for react-big-calendar.

---

### Task 6: Create shift-api.ts TanStack Query hooks

**Files:**
- Create: `apps/web/src/lib/shift-api.ts`

- [ ] **Step 1: Create the hooks file**

Create `apps/web/src/lib/shift-api.ts`:

```ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from './api-client'
import type { Shift, CreateShiftDto, UpdateShiftDto } from '@restaurant/shared'

export const shiftKeys = {
  all: (from?: string, to?: string) => ['shifts', from, to] as const,
  one: (id: string) => ['shifts', id] as const,
}

export function useShifts(from?: string, to?: string) {
  return useQuery({
    queryKey: shiftKeys.all(from, to),
    queryFn: () =>
      apiClient
        .get<Shift[]>('/shifts', { params: from && to ? { from, to } : undefined })
        .then(r => r.data),
  })
}

export function useCreateShift() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (dto: CreateShiftDto) =>
      apiClient.post<Shift>('/shifts', dto).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['shifts'] }),
  })
}

export function useUpdateShift() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdateShiftDto }) =>
      apiClient.patch<Shift>(`/shifts/${id}`, dto).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['shifts'] }),
  })
}

export function useDeleteShift() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/shifts/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['shifts'] }),
  })
}
```

---

### Task 7: Create the Calendar page

**Files:**
- Create: `apps/web/src/routes/_app/calendar/index.tsx`

- [ ] **Step 1: Create the route directory**

```bash
mkdir -p apps/web/src/routes/_app/calendar
```

- [ ] **Step 2: Create the page component**

Create `apps/web/src/routes/_app/calendar/index.tsx`:

```tsx
import { createFileRoute } from '@tanstack/react-router'
import { useState, useMemo } from 'react'
import { Calendar, dayjsLocalizer, Views } from 'react-big-calendar'
import dayjs from 'dayjs'
import 'react-big-calendar/lib/css/react-big-calendar.css'
import { useReservations } from '@/lib/reservation-api'
import { useShifts } from '@/lib/shift-api'
import { useStaff } from '@/lib/staff-api'

export const Route = createFileRoute('/_app/calendar/')({
  component: CalendarPage,
})

const localizer = dayjsLocalizer(dayjs)

type Tab = 'reservations' | 'shifts'

function weekBounds(date: Date): { from: string; to: string } {
  const start = dayjs(date).startOf('week')
  const end = dayjs(date).endOf('week')
  return {
    from: start.format('YYYY-MM-DD'),
    to: end.format('YYYY-MM-DD'),
  }
}

export function CalendarPage() {
  const [tab, setTab] = useState<Tab>('reservations')
  const [currentDate, setCurrentDate] = useState(new Date())
  const { from, to } = weekBounds(currentDate)

  const { data: reservations = [] } = useReservations()
  const { data: shifts = [] } = useShifts(from, to)
  const { data: staff = [] } = useStaff()

  const staffById = useMemo(() => {
    const map = new Map<string, string>()
    staff.forEach((s: { id: string; name: string; role: string }) => map.set(s.id, `${s.name} (${s.role})`))
    return map
  }, [staff])

  const reservationEvents = useMemo(
    () =>
      reservations.map(r => ({
        id: r.id,
        title: `${r.guestName} ×${r.partySize}`,
        start: new Date(r.date),
        end: new Date(new Date(r.date).getTime() + 60 * 60 * 1000),
        resource: r,
      })),
    [reservations],
  )

  const shiftEvents = useMemo(
    () =>
      shifts.map(s => ({
        id: s.id,
        title: staffById.get(s.staffId) ?? s.staffId,
        start: new Date(s.startTime),
        end: s.endTime ? new Date(s.endTime) : new Date(new Date(s.startTime).getTime() + 8 * 60 * 60 * 1000),
        resource: s,
      })),
    [shifts, staffById],
  )

  return (
    <div className="flex flex-col gap-4 p-6 h-full">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Calendar</h1>
      </div>

      <div className="flex gap-2 border-b">
        {(['reservations', 'shifts'] as Tab[]).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium capitalize transition-colors border-b-2 -mb-px ${
              tab === t
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="flex-1 min-h-0" style={{ height: 600 }}>
        <Calendar
          localizer={localizer}
          events={tab === 'reservations' ? reservationEvents : shiftEvents}
          defaultView={Views.WEEK}
          views={[Views.WEEK, Views.DAY]}
          date={currentDate}
          onNavigate={setCurrentDate}
          style={{ height: '100%' }}
        />
      </div>
    </div>
  )
}
```

---

### Task 8: Register the calendar route and add sidebar link

**Files:**
- Modify: `apps/web/src/routeTree.gen.ts`
- Modify: `apps/web/src/components/layout/sidebar.tsx`

- [ ] **Step 1: Read routeTree.gen.ts before editing**

```bash
cat apps/web/src/routeTree.gen.ts
```

- [ ] **Step 2: Add import at the top of routeTree.gen.ts**

After the last existing `import` line (near `AppBillingIndexRouteImport`), add:

```ts
import { Route as AppCalendarIndexRouteImport } from './routes/_app/calendar/index'
```

- [ ] **Step 3: Add route constant in routeTree.gen.ts**

After the `const AppBillingIndexRoute = ...` block, add:

```ts
const AppCalendarIndexRoute = AppCalendarIndexRouteImport.update({
  id: '/_app/calendar/',
  path: '/calendar/',
  getParentRoute: () => AppRoute,
} as any)
```

- [ ] **Step 4: Update FileRouteTypes in routeTree.gen.ts**

In the `export interface FileRouteTypes` block:
- Add `| '/calendar/'` to the `fullPaths` union
- Add `| '/calendar'` to the `to` union
- Add `| '/_app/calendar/'` to the `id` union

- [ ] **Step 5: Update AppRouteChildren interface in routeTree.gen.ts**

In `interface AppRouteChildren`, add:
```ts
AppCalendarIndexRoute: typeof AppCalendarIndexRoute
```

In the `const AppRouteChildren: AppRouteChildren = { ... }` object, add:
```ts
AppCalendarIndexRoute: AppCalendarIndexRoute,
```

- [ ] **Step 6: Add FileRoutesByPath declaration in routeTree.gen.ts**

In the `declare module '@tanstack/react-router'` block, inside `interface FileRoutesByPath`, add:

```ts
'/_app/calendar/': {
  id: '/_app/calendar/'
  path: '/calendar'
  fullPath: '/calendar/'
  preLoaderRoute: typeof AppCalendarIndexRouteImport
  parentRoute: typeof AppRoute
}
```

- [ ] **Step 7: Read sidebar.tsx before editing**

```bash
cat apps/web/src/components/layout/sidebar.tsx
```

- [ ] **Step 8: Add Calendar entry to sidebar NAV_ITEMS**

In `apps/web/src/components/layout/sidebar.tsx`, add `CalendarRange` to the lucide-react imports and insert a new nav item after `Reservations`:

Add to imports:
```ts
CalendarRange,
```

Add to `NAV_ITEMS` after the `reservations` entry:
```ts
{ to: '/calendar', label: 'Calendar', icon: CalendarRange },
```

- [ ] **Step 9: Verify web build**

```bash
cd apps/web && pnpm build 2>&1 | tail -20
```

Expected: no TypeScript errors, build succeeds.

- [ ] **Step 10: Commit**

```bash
git add apps/web/src/routes/_app/calendar/ \
        apps/web/src/routeTree.gen.ts \
        apps/web/src/components/layout/sidebar.tsx \
        apps/web/src/lib/shift-api.ts
git commit -m "feat(web): add Calendar page — react-big-calendar with reservations and shifts tabs"
```

---

### Task 9: Run full test suite and verify

- [ ] **Step 1: Run API tests**

```bash
cd apps/api && pnpm test 2>&1 | tail -20
```

Expected: all suites pass (existing + new shift spec).

- [ ] **Step 2: Run web tests**

```bash
cd apps/web && pnpm test 2>&1 | tail -10
```

Expected: all suites pass.

- [ ] **Step 3: Final commit if any fixes were needed**

```bash
git add -A
git commit -m "fix: resolve any remaining issues from Plan 13 calendar view"
```

---

## Summary

| Area | What was added |
|------|---------------|
| Shared | `ShiftSchema` aligned with Prisma (`startTime`/`endTime` as DateTime) |
| API | `ShiftModule`: 5-endpoint CRUD, date-range filter, manager-only write guards |
| API | `shift.service.spec.ts`: 8 unit tests |
| Web | `react-big-calendar` + `dayjs` installed |
| Web | `shift-api.ts`: 4 TanStack Query hooks |
| Web | `/calendar` page: week view, Reservations / Shifts tabs |
| Web | Sidebar: Calendar link added |
