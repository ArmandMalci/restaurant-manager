# CLAUDE.md

This file provides guidance to Claude Code when working with code in this repository.

Restaurant Manager — a web-based restaurant operations app (tables, menu, orders, reservations,
staff, inventory, reports, billing). pnpm + Turborepo monorepo.

## Stack

- **pnpm 10 + Turborepo 2** monorepo
- **`apps/web`** (`@restaurant/web`) — **React 19 + Vite 7 + TypeScript**, **TanStack Router**
  (file-based, `src/routes/`), **Tailwind v4** (`@theme inline` tokens), **shadcn/ui** (v4.11),
  **Lucide** icons, **Zustand** auth store
- **`apps/api`** (`@restaurant/api`) — **NestJS**
- **`packages/shared`** — shared code
- **Prisma 7** + `@prisma/adapter-pg` (**Postgres**) — `prisma/schema.prisma`, `prisma/migrations/`, `prisma/seed.ts`

## Commands

```bash
pnpm dev            # turbo run dev (all apps)
pnpm build          # turbo run build
pnpm test           # turbo run test
pnpm lint           # turbo run lint
pnpm typecheck      # turbo run typecheck   (run before declaring done)

pnpm --filter @restaurant/web dev     # single app
pnpm prisma migrate dev               # apply schema changes locally
pnpm prisma generate                  # regen client after schema edits
```

## Data layer — read before touching API or data

- **`apps/web/src/api/` hooks are Orval-generated. Never modify them**, and never hand-write `fetch`/`axios`.
  Read existing route files to see which generated hooks are already in use.
- Backend persistence is Prisma → Postgres. Schema is `prisma/schema.prisma`; change data shape there, then migrate.

## Frontend design system — read before writing any component

Full design system is the source of truth in **`docs/PRODUCT.md`** (read it first). Non-negotiables:

- **Semantic Tailwind tokens only — zero literal palette values.** Use `bg-card` / `bg-background` / `bg-accent` /
  `text-muted-foreground` / `border-border` / `bg-success|warning|destructive`, never `bg-white` / `bg-zinc-*` / raw hex.
- **Multi-theme** via `data-theme` on `<html>` (`default` / `monokai` / `gruvbox`); the `.dark` class is **not** used.
- **Exactly one primary CTA per screen** (`bg-accent text-accent-foreground`); all others secondary. **Lucide icons only.**
- shadcn components are added on demand: `cd apps/web && npx shadcn add <name>`.

Screen specs live in `docs/screens/`; design decisions in `docs/decisions/`.
