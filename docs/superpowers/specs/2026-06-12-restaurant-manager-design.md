# Restaurant Manager — Design Specification

**Date:** 2026-06-12  
**Status:** Approved for implementation planning  
**Author:** Brainstorming session (Claude Code + Armand)

---

## 1. Product Overview

A full-service restaurant management Progressive Web App. Targets a single restaurant location with sit-down dining, waitstaff, and a kitchen team. The app runs in a browser on tablets and desktops — no native app install required. Push notifications are delivered via the PWA notification API.

### Who uses it

| Role | Primary screens |
|---|---|
| Manager | Calendar (home/dashboard), Reports, Staff, Inventory, Menu management |
| Waiter | Floor plan, Order taking (POS), Billing |
| Kitchen staff | Kitchen Display Screen (KDS) |
| Host | Reservations, Floor plan |

The **Calendar View** serves as the app's home screen / dashboard for managers. There is no separate dashboard module.

---

## 2. App Scope — 11 Modules

### 2.1 Table Management
Visual floor plan showing every table and its current status (available / occupied / reserved). Supports assigning a waiter to a table, merging adjacent tables for large parties, and splitting a merged table back. Status updates in real time via WebSocket.

### 2.2 Order Management (POS)
Waiters take orders per table. Each order contains items selected from the current menu, with optional item modifiers (e.g. "no onions", "extra sauce", "well done"). Orders are sent to the kitchen on confirmation. Order status progresses: `draft → sent → in-progress → ready → served`. No multi-course sequencing — all items are part of one flat order. A table can have one open order at a time.

### 2.3 Kitchen Display Screen (KDS)
A dedicated full-screen view for kitchen staff. Shows all active orders and their items in real time. Items are color-coded by time elapsed (green < 5 min, amber 5–10 min, red > 10 min). Kitchen staff can mark individual items or whole orders as ready. Marking an order ready notifies the assigned waiter via push notification.

### 2.4 Menu Management
Managers create and edit menu items. Each item has: name, category, description, price, photo (optional), and an availability toggle (to 86 an item). Categories are ordered and displayed in that order on the POS. No multi-course structure — flat category → item hierarchy.

### 2.5 Reservations
Hosts and managers book tables by date, time, party size, guest name, phone/email, and optional notes. A daily reservation list shows upcoming bookings. Reservations link to a table on the floor plan and appear on the Calendar view.

### 2.6 Billing & Payments
Generates a bill from the open order on a table. Supports: split bill equally across guests, split bill by item selection, apply percentage or fixed discounts, add tip (percentage or fixed), and mark as paid. Produces a receipt view (printable). No payment gateway integration in scope — cash/card handled externally.

### 2.7 Staff Management
Roster of staff members with roles: `manager`, `waiter`, `kitchen`, `host`. Shift scheduling per staff member (date, start time, end time). Clock-in / clock-out timestamps recorded. Shifts appear on the Calendar view. Not a full HR system — no payroll, leave management, or compliance features.

### 2.8 Inventory Tracking
Track ingredient stock levels with a unit (kg, litres, units). Menu items can be linked to ingredients with consumption amounts (e.g. "Burger" uses 0.2 kg of beef). Stock auto-decrements on order completion. Low-stock threshold triggers an alert. Managers can log manual stock adjustments (deliveries, waste). No supplier ordering workflow in scope.

### 2.9 Reports & Analytics
Covers a selected date range. Metrics: total revenue, number of covers, average spend per cover, table turnover rate, top 10 selling items by quantity and revenue, revenue by category. Displayed as simple charts (bar, line). Data is read-only — no export in v1.

### 2.10 Calendar View
A unified calendar with Day / Week / Month views. Shows:
- **Past days:** revenue total, cover count (read-only summary)
- **Today:** live order count, current occupancy, active reservations
- **Future days:** upcoming reservations, scheduled staff shifts

Clicking a day opens a detail panel. The calendar is the app's "overview" screen — not an editing surface, but a navigation hub.

### 2.11 Push Notifications (PWA)
Uses the browser Push API (no external service). Notification types:
- Kitchen → Waiter: "Order for Table X is ready"
- System → Kitchen: "New order received for Table X"
- System → Manager: "Item [Y] is low in stock"

Notification permission is requested on first login per device. Users can configure which notification types they receive in their profile settings.

---

## 3. Technical Architecture

### 3.1 Monorepo Structure

```
restaurant-manager/
├── apps/
│   ├── web/                  # Vite 8 + React 19 PWA
│   └── api/                  # NestJS 11 backend
├── packages/
│   └── shared/               # Zod schemas, TypeScript types, constants
├── docs/                     # All documentation
│   ├── superpowers/specs/    # Feature design specs
│   ├── screens/              # Per-screen descriptions + OpenDesign prompts
│   ├── decisions/            # Architecture Decision Records (ADRs)
│   └── board/                # Markdown kanban (backlog, in-progress, done)
├── turbo.json
├── pnpm-workspace.yaml
└── .gitignore
```

**Toolchain:** Turborepo 2.9 + pnpm workspaces. `packages/shared` is the single source of truth for all data contracts — both apps import from it.

### 3.2 Frontend (`apps/web`)

| Category | Library | Version |
|---|---|---|
| Build | Vite | 8.0.16 |
| Framework | React + TypeScript | 19.x |
| Routing | @tanstack/react-router | 1.170.15 |
| Server state | @tanstack/react-query | 5.101.0 |
| Client state | zustand | 5.x |
| Components | shadcn/ui + Radix UI | latest |
| Styling | tailwindcss | 4.3.0 |
| Icons | lucide-react | latest |
| Forms | react-hook-form + zod + @hookform/resolvers | latest |
| API client | orval (codegen) + axios | 8.17.0 |
| WebSockets | socket.io-client | 4.8.3 |
| Tables | @tanstack/react-table | 8.x |
| Drag & drop | @dnd-kit/core + @dnd-kit/sortable | 6.3.1 |
| Charts | recharts | latest |
| Calendar | react-big-calendar + date-fns | 1.20.0 |
| Animations | motion | 12.x |
| Toasts | sonner | latest |
| Virtualization | @tanstack/react-virtual | latest |
| PWA | vite-plugin-pwa + workbox | latest |
| Mocks | msw (Orval-generated) | latest |
| Testing | vitest + @testing-library/react | latest |
| E2E | @playwright/test | latest |

**Orval pipeline:** NestJS generates an OpenAPI spec at `/api-json`. Orval reads it and outputs typed TanStack Query hooks into `apps/web/src/api/`. This runs as a build step — no manual API client code.

**PWA strategy:** App shell cached on install. API responses cached with a stale-while-revalidate strategy for menu and table data. KDS and POS require an active connection (real-time; no meaningful offline mode for those screens).

### 3.3 Backend (`apps/api`)

| Category | Library | Version |
|---|---|---|
| Framework | NestJS + Fastify adapter | 11.1.26 |
| Validation | nestjs-zod | 5.4.0 |
| ORM | Prisma | 7.8.0 |
| Database | PostgreSQL | 16.x |
| Cache / RT state | Redis (ioredis) | latest |
| WebSockets | @nestjs/websockets + socket.io | 4.8.3 |
| Auth | @nestjs/jwt + passport-jwt + bcrypt | latest |
| API docs | @nestjs/swagger | latest |
| Config | @nestjs/config | latest |
| Events | @nestjs/event-emitter | latest |
| Scheduling | @nestjs/schedule | latest |
| Health | @nestjs/terminus | latest |
| Rate limiting | @nestjs/throttler | latest |
| Testing | @nestjs/testing + jest + supertest | latest |

**Validation paradigm:** `nestjs-zod` replaces `class-validator`. All DTOs are Zod schemas defined in `packages/shared` and imported into NestJS controllers/pipes. The same schemas validate on the frontend before submission.

**Real-time:** Two Socket.io namespaces:
- `/kds` — kitchen display. Server pushes new orders; kitchen clients emit item/order ready events.
- `/pos` — floor plan + order status. Server pushes table status changes and order updates.

Redis stores active WebSocket room memberships and the KDS order queue for fast reads.

### 3.4 Shared Package (`packages/shared`)

Contains:
- **Zod schemas** for every resource (MenuItem, Order, OrderItem, Table, Reservation, Staff, Shift, InventoryItem, Bill)
- **TypeScript types** inferred from those schemas
- **Constants** (order status enum, staff roles, notification types, table status enum)
- **No runtime dependencies** — pure TypeScript + Zod

### 3.5 API Design

REST + WebSockets. No GraphQL.

One NestJS controller per module, following standard REST conventions:

```
GET    /api/tables
POST   /api/orders
PATCH  /api/orders/:id/status
GET    /api/menu/items
POST   /api/reservations
GET    /api/reports/summary?from=&to=
...

WS /kds     — Kitchen Display namespace
WS /pos     — POS + floor plan namespace
```

Full OpenAPI spec auto-generated by `@nestjs/swagger` and consumed by Orval.

---

## 4. Agent System

### 4.1 Team Structure

| Agent | Model | Domain | Autonomy |
|---|---|---|---|
| Product Manager | Claude Opus 4.8 | Feature specs, backlog, product decisions | Proposes |
| Architect | Claude Opus 4.8 | Technical decisions, ADRs, data models, breaking changes | Proposes |
| UX/UI | Claude Sonnet 4.6 | Screen specs, OpenDesign prompts, component specs, design tokens | Proposes |
| Frontend Dev | Claude Sonnet 4.6 | React components, Orval hooks, Zustand stores, PWA config | Proposes |
| Backend Dev | Claude Sonnet 4.6 | NestJS modules, Prisma schema, Socket.io gateways, REST endpoints | Proposes |
| QA / Testing | Claude Haiku 4.5 | Vitest unit tests, Playwright e2e, MSW mocks | Proposes |
| Documentation | Claude Haiku 4.5 | JSDoc, API docs sync, changelog, screen spec updates | Proposes |

**Hard rule:** No agent commits code or merges changes without explicit human approval. All agents propose work; the human reviews and approves.

### 4.2 Agent Coordination via Ruflo

- `ruflo__memory_store` — agents write shared context (active sprint goals, architectural decisions, design tokens) that persists across sessions
- `ruflo__memory_search` — agents retrieve relevant context before starting work
- `ruflo__swarm_init` — initialise a coordinated group of agents for a feature build
- `ruflo__agent_spawn` — spawn individual agents for parallel subtasks
- Ruflo hooks fire on file changes to trigger relevant agents (e.g. schema change → notify Architect + Backend Dev)

### 4.3 Decision Board (Markdown Kanban)

Tickets live as markdown files in `docs/board/`. Structure:

```
docs/board/
├── backlog.md        # All planned work items
├── in-progress.md    # Active items (one per agent at a time)
├── review.md         # Awaiting human approval — nothing moves to done without this
└── done.md           # Completed and approved
```

Each ticket follows a standard frontmatter format:

```markdown
---
id: TICKET-001
title: Implement table floor plan component
agent: frontend-dev
model: claude-sonnet-4-6
status: review
created: 2026-06-12
---

## What
[Description]

## Why
[Context and motivation]

## Acceptance criteria
- [ ] Criterion 1
- [ ] Criterion 2

## Agent notes
[Agent's findings, decisions made, alternatives considered]
```

View the board visually in **Obsidian** with the Kanban plugin — it renders these files as drag-and-drop columns. No server required.

---

## 5. Design Workflow (OpenDesign)

### 5.1 Per-screen process

For each of the 11 modules, the UX/UI Agent produces:

1. **Screen spec** (`docs/screens/<module>.md`) — describes every screen in the module: layout, components present, states (empty, loading, error, populated), user interactions, edge cases.

2. **OpenDesign prompt** (appended to the screen spec) — a detailed text prompt the user pastes into OpenDesign's UI to generate the visual design. The prompt describes: layout structure, color scheme (from design tokens), typography, component names, spacing, responsive behaviour.

3. **Design reference** — after the user generates the design in OpenDesign and provides the output (`.octopus` file or screenshots), it is stored in `docs/screens/designs/<module>/`. The Frontend Dev Agent is then instructed to use it as the visual reference for implementation.

### 5.2 Design token baseline

Before any screen prompts are written, the UX/UI Agent defines the global design system in `docs/screens/design-tokens.md`:
- Color palette (primary, secondary, neutral, semantic: success/warning/error)
- Typography scale (font family, sizes, weights)
- Spacing scale
- Border radius, shadow levels
- Component defaults (button variants, input styles, card styles)

All OpenDesign prompts reference these tokens by name for consistency.

---

## 6. Documentation Structure

```
docs/
├── superpowers/specs/        # Design specs (this file and future specs)
├── screens/                  # Per-module screen specs + OpenDesign prompts
│   ├── designs/              # OpenDesign outputs (.octopus / screenshots)
│   └── design-tokens.md     # Global design system baseline
├── decisions/                # Architecture Decision Records (ADRs)
│   └── ADR-001-tech-stack.md
└── board/                    # Markdown kanban
    ├── backlog.md
    ├── in-progress.md
    ├── review.md             # Human approval gate
    └── done.md
```

All docs are written by agents and reviewed by the human. The Documentation Agent (Haiku 4.5) keeps docs in sync with code changes automatically.

---

## 7. Authentication

Staff log in with an email and password. On login, the API issues a JWT access token (short-lived, 15 min) and a refresh token (HTTP-only cookie, 7 days). Role is stored in the JWT payload and enforced at the API level via a NestJS guard — each controller route is annotated with the minimum role required.

Role hierarchy (highest to lowest): `manager → host → waiter → kitchen`. A manager can access all routes. Kitchen staff can only access KDS-related endpoints.

Initial admin account is seeded on first run. There is no self-registration — accounts are created by a manager in the Staff module.

---

## 8. Key Constraints

- **No code ships without human approval** — every agent output goes to `docs/board/review.md` before being applied
- **Single location** — no multi-tenancy in v1; PostgreSQL schema is single-restaurant
- **No payment gateway** — billing records payments but does not process them
- **No online reservation portal** — reservations are staff-entered only; no public-facing booking page
- **No multi-course menus** — flat category → item structure only
- **PWA only** — no React Native, no Electron; browser PWA on tablet/desktop
- **English only** — no i18n in v1
