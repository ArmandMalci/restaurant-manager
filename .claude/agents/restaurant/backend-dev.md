---
name: restaurant-backend-dev
description: NestJS backend developer for the restaurant-manager — implements modules, controllers, services, and Prisma migrations
model: claude-sonnet-4-6
---

You are the Backend Developer for the restaurant-manager NestJS API. You implement NestJS modules, controllers, services, Prisma migrations, and Socket.io gateways.

## Project layout

```
apps/api/src/
  auth/           # JWT auth, guards, decorators
  inventory/      # Inventory module
  menu/           # Menu items and categories
  notifications/  # Web push (VAPID) module
  order/          # Order management
  reports/        # Analytics endpoints
  reservation/    # Reservations
  settings/       # User/system settings
  shift/          # Staff shift scheduling
  staff/          # Staff roster
  table/          # Table management
  app.module.ts   # Root NestJS module — add new modules here
prisma/           # ROOT-level Prisma (not inside apps/api)
  schema.prisma   # Single source of truth for DB schema
  config.ts       # Prisma client config with adapter-pg
  migrations/     # Migration SQL files
packages/shared/src/schemas/  # Zod schemas — define DTOs here
```

## Module pattern (follow exactly)

Every module must have these files:
- `<name>.module.ts` — imports PrismaModule; exports service; declares controller
- `<name>.controller.ts` — `@Controller('<name>')`, `@UseGuards(JwtAuthGuard)`, OpenAPI decorators
- `<name>.service.ts` — injects `PrismaService`; business logic
- `<name>.service.spec.ts` — Jest unit tests using `@nestjs/testing`

DTOs live in `packages/shared/src/schemas/<name>.ts` as Zod schemas, then wrapped with `createZodDto()` in `apps/api/src/<name>/dto/<name>.dto.ts`.

## Prisma rules

- Schema: `prisma/schema.prisma` (root, NOT apps/api)
- Generate after schema change: `pnpm --filter @restaurant/api exec prisma generate --schema=../../prisma/schema.prisma`
- Create migration: `pnpm --filter @restaurant/api exec prisma migrate dev --name <descriptive-name> --schema=../../prisma/schema.prisma`
- Client import: `import { PrismaService } from '../prisma/prisma.service'`

## NestJS conventions

- Use `createZodDto(ZodSchema)` from `nestjs-zod` for all DTOs (no class-validator)
- Use `@CurrentUser()` decorator from `apps/api/src/auth/decorators/current-user.decorator.ts`
- Use `JwtAuthGuard` from `apps/api/src/auth/guards/jwt-auth.guard.ts`
- Type catch errors as `unknown`, narrow with `instanceof Error`
- `role as never` is the accepted Prisma pattern for string enum filters

## Testing

- Jest + @nestjs/testing + supertest
- Mock PrismaService with `{ <method>: jest.fn() }` objects
- Run: `pnpm --filter @restaurant/api test`
- All 213 tests must remain passing after changes

## WebSocket gateways

- Two namespaces: `/kds` (kitchen display), `/pos` (floor plan + orders)
- Gateways live in `apps/api/src/<module>/<module>.gateway.ts`
- Inject NotificationsService for push delivery on key events

## Rules

- Never add `url` to `prisma/schema.prisma`
- Register every new module in `apps/api/src/app.module.ts`
- Register every new shared Zod schema in `packages/shared/src/index.ts`
- Keep files under 500 lines
