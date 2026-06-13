---
name: run-web
description: Run, start, build, screenshot, or visually verify the Restaurant Manager web app (React + Vite, port 5173). Use when asked to run the app, take a screenshot, confirm a UI change works, test a feature, or navigate to a page.
---

Restaurant Manager is a React 19 + Vite 7 + TanStack Router SPA driven by a NestJS/Fastify API. The driver is the Playwright MCP (`mcp__playwright__browser_*` tools) — no separate script needed. All routes require auth; the seed admin is `admin@restaurant.local` / `admin123`.

## Prerequisites

```bash
# Node ≥ 20, pnpm ≥ 10
node --version   # v24.11.1 verified
pnpm --version   # 10.x verified

# Postgres + Redis via Docker (must be running)
docker compose up -d   # run from repo root
```

## Build

```bash
# From repo root — installs all workspaces
pnpm install

# Build shared package first (web imports it directly via alias, but API needs dist)
pnpm --filter @restaurant/shared build

# Optionally build the API dist (only needed for `pnpm --filter @restaurant/api start`)
pnpm --filter @restaurant/api build
```

## Run (agent path)

Start both servers, then use Playwright MCP tools to interact:

```bash
# Terminal 1 — web dev server (port 5173)
pnpm --filter @restaurant/web dev &

# Terminal 2 — API (port 3001); requires postgres on 5432
pnpm --filter @restaurant/api build && pnpm --filter @restaurant/api start &

# Wait ~10s for both to be ready, then verify:
curl -s -o /dev/null -w "%{http_code}" http://localhost:5173/   # → 200
curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/api/health  # → 200
```

Then drive with Playwright MCP:

```
# Navigate and screenshot the login page
mcp__playwright__browser_navigate  { url: "http://localhost:5173/login" }
mcp__playwright__browser_take_screenshot { type: "png", filename: "screenshot-login.png", fullPage: true }

# Log in as admin
mcp__playwright__browser_fill_form {
  fields: [
    { target: "input[type='email']", name: "Email", type: "textbox", value: "admin@restaurant.local" },
    { target: "input[type='password']", name: "Password", type: "textbox", value: "admin123" }
  ]
}
mcp__playwright__browser_click { target: "button[type='submit']" }
# Page navigates to /dashboard — take screenshot to verify
mcp__playwright__browser_take_screenshot { type: "png", filename: "screenshot-dashboard.png", fullPage: true }
```

### Pages available after login

| Route | Purpose |
|---|---|
| `/dashboard` | App shell — sidebar nav |
| `/tables` | Table management |
| `/menu` | Categories + items CRUD |
| `/orders` | Order queue |
| `/reservations` | Booking list |
| `/calendar` | react-big-calendar (Shifts / Reservations tabs) |
| `/staff` | Staff roster |
| `/inventory` | Inventory items |
| `/reports` | Summary reports |

To screenshot a specific page:
```
mcp__playwright__browser_navigate { url: "http://localhost:5173/calendar" }
mcp__playwright__browser_take_screenshot { type: "png", filename: "screenshot-calendar.png", fullPage: true }
```

## Run (human path)

```bash
# From repo root — starts both web and API via Turborepo
pnpm dev
# Web opens at http://localhost:5173 — login with admin@restaurant.local / admin123
```

## Test

```bash
pnpm --filter @restaurant/web test       # vitest unit tests
pnpm --filter @restaurant/api test       # jest unit tests (21 suites, 208 tests)
```

## Gotchas

- **API crashes on bare `pnpm --filter @restaurant/api start` without the Swagger fix.** `nestjs-zod` 5.4.0 + `@nestjs/swagger` can't serialize `z.date()` fields in Zod v4 (throws `Date cannot be represented in JSON Schema`). The fix already applied in `apps/api/src/main.ts` wraps `SwaggerModule.createDocument` in try/catch so the API starts with Swagger silently disabled. If you see this crash after pulling, check that `main.ts` has the try/catch.

- **Database must be seeded before first login.** After `docker compose up -d`, run:
  ```bash
  pnpm --filter @restaurant/api exec prisma db push
  pnpm --filter @restaurant/api exec prisma db seed
  ```
  Default admin: `admin@restaurant.local` / `admin123`.

- **API starts on port 3001, not 3000.** The `PORT` env var in `apps/api/.env` is `3001`. Vite's dev proxy (`/api → http://localhost:3001`) is already configured in `vite.config.ts`.

- **`pnpm --filter @restaurant/api start:dev` does not exist.** The watch-mode script is `dev` (`nest start --watch`). For production-style local run: build first then `start`.

- **`@restaurant/shared` is resolved by path alias at build time** — Vite maps `@restaurant/shared` directly to `packages/shared/src/index.ts`, so `pnpm --filter @restaurant/shared build` is only required when the API is running from `dist/`.

## Troubleshooting

| Symptom | Fix |
|---|---|
| `Error: Date cannot be represented in JSON Schema` on API start | `main.ts` is missing the try/catch around `SwaggerModule.createDocument` — see Gotchas above |
| `curl http://localhost:3001/api/health` returns 000 | Postgres isn't running — `docker compose up -d` from repo root |
| Login fails with 401 | Database not seeded — run `prisma db push && prisma db seed` |
| Vite hot-reload stalls | Kill the process and restart `pnpm --filter @restaurant/web dev`; port 5173 may be occupied |
| `pnpm: command not found` on a fresh machine | `npm install -g pnpm@10` |
