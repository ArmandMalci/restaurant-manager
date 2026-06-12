# ADR-001: Tech Stack Decisions

**Date:** 2026-06-12  
**Status:** Accepted  
**Deciders:** Armand Malci + Claude Code

## Context

Building a full-service restaurant management React PWA from scratch. Need to decide monorepo strategy, frontend framework, backend framework, ORM, database, real-time strategy, and API style.

## Decisions

### Monorepo: Turborepo + pnpm workspaces
Shared `packages/shared` Zod schemas are the reason. End-to-end type safety without a code generator. Turborepo is low-config — 3 packages don't need Nx's generator overhead.

### Frontend: Vite + React 19 + TanStack Router + TanStack Query
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
