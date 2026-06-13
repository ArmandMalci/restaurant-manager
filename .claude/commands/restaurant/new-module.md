Scaffold a new NestJS module named "$ARGUMENTS" for the restaurant-manager API following the established module pattern.

## What to build

Create these files (replace `<name>` with the lowercase module name, e.g. `billing`):

1. `packages/shared/src/schemas/<name>.ts` — Zod schemas for Create and Update DTOs
2. `packages/shared/src/index.ts` — add new schema exports
3. `apps/api/src/<name>/<name>.module.ts` — NestJS module
4. `apps/api/src/<name>/dto/<name>.dto.ts` — DTOs using createZodDto
5. `apps/api/src/<name>/<name>.service.ts` — service with PrismaService injection
6. `apps/api/src/<name>/<name>.controller.ts` — REST controller with JwtAuthGuard
7. `apps/api/src/<name>/<name>.service.spec.ts` — Jest unit tests
8. `apps/api/src/app.module.ts` — add the new module to imports

## Conventions to follow

- Schema: Prisma schema lives at root `prisma/schema.prisma`
- DTOs: `createZodDto(ZodSchema)` from `nestjs-zod`, not class-validator
- Auth: `@UseGuards(JwtAuthGuard)` + `@CurrentUser()` decorator
- Tests: mock PrismaService with `{ <model>: { findMany: jest.fn(), ... } }`
- Error typing: `catch (error: unknown)` with `instanceof Error` narrowing
- Files under 500 lines

After creating the files, run:
```bash
pnpm --filter @restaurant/api test
```
All 213+ tests must pass.
