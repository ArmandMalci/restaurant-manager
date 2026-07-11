# Plan 22 — Tier 1: Multi-Tenancy Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan
> task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
> Part of [Plan 13 — QA Backlog Roadmap](13-qa-backlog-roadmap.md), Tier 1.
> Design: [ADR-002 — Multi-Tenancy Foundation](../../decisions/ADR-002-multi-tenancy.md) (Accepted 2026-07-11).

**Goal:** The largest-blast-radius change in the app's history. Every one of the 19 Prisma models, the JWT
contract, all ~14 Prisma-querying services, both Socket.io namespaces, and all 20 frontend routes change shape, per
ADR-002. Read the full ADR before starting — this plan is its phased build sequence turned into checkable steps,
not a substitute for it.

**⚠️ Hard sequencing constraint:** Task 1 (schema) is **strictly solo and first** — no other agent may edit
`prisma/schema.prisma` or run `prisma migrate dev` while Task 1 is in flight, and nothing else in this plan starts
before Task 1 lands. `prisma migrate reset` has already been run (confirmed). Tasks 3's per-service fan-out and
Task 4 (frontend routing) run in parallel with each other, after Tasks 1+2. Tasks 5, 6, 7 run in parallel with each
other, after Tasks 3+4.

**Tech Stack:** Prisma 7, NestJS (Fastify + Socket.io), React 19 + TanStack Router, `packages/shared` Zod schemas,
Orval.

## Global Constraints

- Every shared Zod schema in `packages/shared/src/schemas/` gains `restaurantId` where its model does.
- `pnpm --filter @restaurant/web gen:api` + `pnpm --filter @restaurant/web exec biome check --write src/api` after
  the API contract changes (mandatory, per CLAUDE.md).
- Never hand-edit `apps/web/src/api/**`.
- Run `pnpm typecheck` (both apps) + affected tests before marking any task done.
- Semantic Tailwind tokens only; modals not drawers; touch targets ≥44px on coarse pointer (all already established
  conventions — new screens in this plan follow them, not exceptions).

---

### Task 1: Schema + migration + seed rewrite (solo, strictly first)

**Files:**
- Modify: `prisma/schema.prisma` —
  - New `Restaurant` model (tenant root): `id`, plus `RestaurantSettings`'s columns folded in (`name`,
    `description`, `phone`, `email`, `address`, `openingHours`), `updatedAt`. Delete the `RestaurantSettings` model
    entirely.
  - New `PlatformAdmin` model: `id`, `email @unique`, `passwordHash`, `name`, timestamps — a separate principal
    table, not a `Staff` flag (per ADR-002 sub-decision 3).
  - `restaurantId String` (NOT NULL, FK to `Restaurant`) added directly to: `Staff`, `Table`, `MenuCategory`,
    `MenuItem`, `ModifierGroup`, `ModifierOption`, `Order`, `Reservation`, `Shift`, `InventoryItem`.
  - `Staff` gains `username String` with `@@unique([restaurantId, username])`; `email` stays globally `@unique`.
  - The 8 transitively-scoped models (`RefreshToken`, `OrderItem`, `OrderItemModifier`, `MenuItemModifierGroup`,
    `InventoryUsage`, `Bill`, `Payment`, `PushSubscription`) get **no new column** — scope resolves via their
    existing parent FK.
- Modify: `prisma/seed.ts` — **rewrite, not patch.** Create the first `Restaurant` (from the old `default`
  settings row's values), scope every seeded row (`Staff`, `Table`, `MenuCategory`/`MenuItem`, `Order`, etc.) to it,
  seed a `PlatformAdmin`. **This step is what makes the app bootable at all after this migration** — get it right
  or nothing downstream can be tested.
- Modify: `packages/shared/src/schemas/*.ts` — every schema for a directly-scoped model gains `restaurantId`; add
  a `RestaurantSchema` and `PlatformAdminSchema` (the latter likely doesn't need a shared schema if it's
  platform-admin-only DTOs living in the API — use judgment, but don't skip Swagger decorators either way).

- [ ] **Step 1:** Write the full schema diff (Restaurant, PlatformAdmin, 10 direct FKs, username+unique constraint).
- [ ] **Step 2:** From the repo root: `pnpm prisma migrate dev --name multi_tenancy_foundation`, then
  `pnpm prisma generate`.
- [ ] **Step 3:** Rewrite `prisma/seed.ts` end to end per the description above.
- [ ] **Step 4:** Run the seed (`pnpm prisma db seed` or however this repo's seed is invoked) and confirm it
  completes without error and produces a bootable dataset (one restaurant, one platform admin, staff/tables/menu
  scoped to it).
- [ ] **Step 5:** Update every affected shared Zod schema.
- [ ] **Step 6:** `pnpm --filter @restaurant/api typecheck` — expect **many** errors (every service query needs a
  `restaurantId` filter added). Do not try to fix all call sites here — that's Tasks 2-3. This step just confirms
  the schema/client/shared-schema layer itself compiles; downstream `.ts` errors in services are expected and
  handled by later tasks.
- [ ] **Step 7:** Commit: `feat(db): multi-tenancy foundation schema — Restaurant, PlatformAdmin, restaurantId FKs`.

---

### Task 2: Auth / JWT (solo, after Task 1)

**Files:**
- Modify: `apps/api/src/auth/auth.service.ts` — `signAccessToken` gains `restaurantId` in the payload for staff
  logins; a new platform-admin login path signs `{ sub, email, isSuperuser: true }` (no `restaurantId`).
  `validateUser` becomes `validateUser(restaurantId, emailOrUsername, password)`, looking up `Staff` by
  `restaurantId` + (`email` OR `username`).
- Modify: `apps/api/src/auth/strategies/jwt.strategy.ts` — `JwtPayload` gains `restaurantId?` and `isSuperuser?`;
  `validate()` threads whichever shape onto `req.user`.
- New: a platform-admin login endpoint/flow (`apps/api/src/auth/` or a new `apps/api/src/platform-admin/` module —
  use judgment on module boundary, but keep it clearly separate from staff auth per ADR-002's "separate principal"
  decision).
- **Freeze the JWT contract here** — Tasks 3 and 4 build against this shape; don't change it later without
  re-checking both.

- [ ] **Step 1:** Add `restaurantId` to the staff JWT payload + `validateUser`'s restaurant-scoped lookup.
- [ ] **Step 2:** Add the platform-admin login path (`isSuperuser: true`, no `restaurantId`).
- [ ] **Step 3:** Update `JwtPayload`/`validate()` to handle both shapes.
- [ ] **Step 4:** Tests: staff login resolves within a restaurant (same username in two restaurants logs into the
  correct one); platform-admin login produces a token with no `restaurantId`.
- [ ] **Step 5:** `pnpm --filter @restaurant/api typecheck` + auth test suite. Commit:
  `feat(api): restaurantId JWT claim + platform-admin auth path`.

---

### Task 3: Backend scoping (interceptor first, then per-service fan-out — after Task 2)

**Files:**
- New: `RestaurantScopeInterceptor` + `@CurrentRestaurant()` param decorator (mirror the existing JWT guard
  pattern) — reads `X-Restaurant-Id` off the request, reads the policy off `req.user` (staff: `{home}`; superuser:
  `all`), applies "requested-id ∉ policy → 403," otherwise exposes the resolved id.
- New: `SuperuserGuard` — gates platform-admin routes, widens the policy to "all."
- Modify: Socket.io gateways for `/kds` and `/pos` — read `restaurantId` from the handshake auth, validate against
  the socket's JWT policy, join a per-restaurant room (`kds:<restaurantId>`, `pos:<restaurantId>`); every `emit`
  targets that room, not a global broadcast. **Do not skip this** — without it, two tenants share the live kitchen
  feed.
- Modify: all ~14 modules under `apps/api/src/*` (order, settings, kds, shift, reservation, table, inventory, menu,
  staff, service, notifications, billing, reports, health) — each service's Prisma queries gain a `restaurantId`
  filter sourced from `@CurrentRestaurant()`.

**Sequencing within this task:** build the interceptor/decorator/guard/WS-scoping first (one focused change), then
fan out the per-service `where`-filter threading — one subagent per module, safe to run fully in parallel since
each module's files don't overlap with any other module's.

- [ ] **Step 1:** Build `RestaurantScopeInterceptor` + `@CurrentRestaurant()` + `SuperuserGuard`.
- [ ] **Step 2:** Scope the `/kds` and `/pos` Socket.io namespaces to per-restaurant rooms.
- [ ] **Step 3:** Fan out: one subagent per service module, threading `restaurantId` through every query. Each
  subagent also fixes that module's typecheck errors from Task 1 Step 6.
- [ ] **Step 4:** `pnpm --filter @restaurant/api typecheck` — should now be fully clean. Run the full API test
  suite; every existing test that creates fixture data needs a `restaurantId` — update fixtures, don't skip tests.
- [ ] **Step 5:** A cross-tenant isolation test: two restaurants, confirm restaurant A's staff cannot read/write
  restaurant B's data via any endpoint, and confirm a KDS/POS socket in restaurant A never receives restaurant B's
  events.
- [ ] **Step 6:** Commit: `feat(api): restaurant scoping interceptor + per-service filtering + WS room isolation`.

---

### Task 4: Frontend routing (parallel with Task 3, after Task 2)

**Files:**
- New: `$restaurantId` dynamic route segment wrapping `apps/web/src/routes/_app` — the codebase's first dynamic
  route param. All 20 existing `_app` child routes move under it (mechanical but touches every route file's
  location, not its content).
- Modify: the login route — also wrapped by `$restaurantId` (login happens inside a restaurant context, per
  ADR-002 sub-decision 1).
- Modify: `apps/web/src/lib/api-client.ts` — request interceptor (lines ~6-14) adds `X-Restaurant-Id` alongside the
  bearer token, sourced from the active route param.
- Modify: post-login redirect logic — lands the user back under their restaurant's `$restaurantId` segment.

- [ ] **Step 1:** Add the `$restaurantId` route segment; move all 20 `_app` routes under it (this is a large
  mechanical move — verify TanStack Router's `routeTree.gen.ts` regenerates correctly after, don't hand-edit it).
- [ ] **Step 2:** Wrap the login route with the same segment.
- [ ] **Step 3:** Add `X-Restaurant-Id` injection to the API client interceptor.
- [ ] **Step 4:** Update post-login redirect to land under the correct `$restaurantId`.
- [ ] **Step 5:** `pnpm --filter @restaurant/web typecheck` + affected tests. Verify in-browser: every existing
  screen still works when accessed via its new `/{restaurantId}/...` URL; a request to another restaurant's id
  (as staff, not superuser) gets rejected by the backend (depends on Task 3 landing — coordinate timing, or verify
  this specific case after both are done).
- [ ] **Step 6:** Commit: `feat(web): $restaurantId route segment, X-Restaurant-Id header injection`.

---

### Task 5: Restaurant switcher UI (after Task 4)

**Files:**
- New: a restaurant switcher component (topbar or sidebar, following this app's existing shell patterns) — for
  superusers or any future multi-restaurant user; visible/functional now mainly for superusers since staff have
  exactly one restaurant (Task 1's 1:N decision).

- [ ] **Step 1:** Build the switcher UI, wired to navigate between `$restaurantId` values.
- [ ] **Step 2:** `pnpm --filter @restaurant/web typecheck` + verify in-browser as a superuser (once Task 6 exists)
  or with a manually-seeded second restaurant.
- [ ] **Step 3:** Commit: `feat(web): restaurant switcher UI`.

---

### Task 6: Superuser admin surface (after Tasks 3+4)

**Files:**
- New: `apps/api/src/platform-admin/` (or similar) module — CRUD for `Restaurant` (create/list/manage), gated by
  `SuperuserGuard`.
- New: a superuser admin screen tree in `apps/web` (separate from the `$restaurantId`-scoped `_app` shell — this is
  platform-level, not restaurant-scoped).

- [ ] **Step 1:** Backend: restaurant CRUD endpoints gated by `SuperuserGuard`.
- [ ] **Step 2:** Frontend: superuser admin screens (list restaurants, view/edit one, deactivate — deletion of a
  whole restaurant is a much bigger blast radius than a table/section, treat as out of scope unless Armand asks).
- [ ] **Step 3:** `pnpm typecheck` (both apps) + tests. Verify in-browser as a platform admin.
- [ ] **Step 4:** Commit: `feat(api,web): superuser admin surface for restaurant management`.

---

### Task 7: Self-serve signup (parallel with Tasks 5+6, after Tasks 1+2, land after 3+4)

**Files:**
- New: a public signup flow — creates a new `Restaurant` + its first manager `Staff` row in one transaction
  (required by D5's SaaS shape — a restaurant must exist before anyone can log into it).
- New: `apps/web` public signup screen (outside the `$restaurantId`/`_app` shell, alongside login).

- [ ] **Step 1:** Backend: a signup endpoint creating `Restaurant` + first manager `Staff` atomically
  (`$transaction`).
- [ ] **Step 2:** Frontend: the signup screen, redirecting into the new restaurant's `$restaurantId` on success.
- [ ] **Step 3:** `pnpm typecheck` (both apps) + tests, including a test that a failed manager-creation rolls back
  the restaurant creation too (no orphaned restaurants).
- [ ] **Step 4:** Verify in-browser: sign up a new restaurant end to end, land inside it, confirm it's fully
  isolated from the seeded restaurant (Task 3's isolation test, informally repeated here).
- [ ] **Step 5:** Commit: `feat(api,web): self-serve restaurant signup`.

---

## Self-review notes

- **Spec coverage:** all 7 ADR-002 phases map 1:1 to Tasks 1-7. Complete.
- **Sequencing (restated from the ADR):** 1 → 2 → 3(interceptor) → 3(fan-out) ∥ 4 → {5, 6, 7} mostly parallel
  (7 only needs 1+2 but should land after 3+4 for a stable base to test isolation against).
- **This is the biggest plan in the roadmap.** Do not skip the cross-tenant isolation test (Task 3 Step 5) or the
  seed rewrite (Task 1 Step 3) — both are called out in the ADR as the two ways this phase silently breaks the app
  if rushed.
