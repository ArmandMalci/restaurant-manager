# Plan 23 — Tier 2: Identity & Access (Custom Roles + Permissions) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan
> task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
> Part of [Plan 13 — QA Backlog Roadmap](13-qa-backlog-roadmap.md), Tier 2. Depends on
> [Plan 22 — Tier 1](22-tier1-tenancy-foundation.md) landing first (needs `Staff.restaurantId` +
> `@@unique([restaurantId, username])`, already decided in [ADR-002](../../decisions/ADR-002-multi-tenancy.md)).

**Goal:** Replace the fixed `StaffRole` enum + rank-based `RolesGuard` with real per-restaurant custom roles and
granular per-feature permissions, and build the "Users & Permissions" screen issues.md asked for (currently doesn't
exist — `/staff` is a stub redirecting to `/settings`).

**Ground truth (verified during Tier 1 planning research, re-check against code once Tier 1 lands since it touches
these same files):**
- `RolesGuard` (`apps/api/src/auth/guards/roles.guard.ts:10-26`) compares `ROLE_HIERARCHY[user.role]` against the
  *minimum* rank named in `@Roles(...)` — not an allow-list. `ROLE_HIERARCHY`
  (`packages/shared/src/constants/index.ts:15-20`): `manager:4 > host:3 > waiter:2 > kitchen:1`.
- 9 controllers use `@Roles`: `order`, `settings`, `shift`, `reservation`, `table` (×4 endpoints), `inventory`
  (class-level), `menu` (×9 endpoints, one with `manager,kitchen`), `staff` (class-level).
- `/staff` route (`apps/web/src/routes/_app/staff/index.tsx`) is currently an 8-line redirect stub to `/settings`.
  Backend CRUD already exists (`staff.controller.ts` — full GET/POST/PATCH/DELETE), so the frontend screen is
  greenfield, not a migration.
- Per ADR-002: `Staff.role` (the enum column) is left **untouched** by Tier 1 — this plan replaces it.

---

### Task 1: Permission model (schema + backend)

**Files:**
- Modify: `prisma/schema.prisma` — new `Role` model (`id`, `restaurantId`, `name`, `permissions Json` — a
  per-feature allow-list, e.g. `{ "menu": ["read","write"], "inventory": ["read"] }`; keep it a JSON column, not a
  fully normalized permission table — no requirement here justifies that complexity yet) with
  `@@unique([restaurantId, name])`. `Staff.role StaffRole` (enum column) is replaced by `Staff.roleId String`
  (FK to `Role`). Seed a few default roles per restaurant on creation (Manager/Waiter/Kitchen/Host, mirroring
  today's enum, as a starting point staff can then customize).
- Modify: `apps/api/src/auth/guards/roles.guard.ts` → replace with a permission-check guard: reads the requesting
  staff's `Role.permissions`, checks an allow-list membership for the required feature+action, rejects if absent.
  This **replaces** `RolesGuard`/`ROLE_HIERARCHY`/the `@Roles` decorator's rank semantics — update all 9
  controllers' decorators to the new permission-based decorator (e.g. `@RequirePermission('menu', 'write')`).
- New: `apps/api/src/role/` module — CRUD for roles, scoped by `@CurrentRestaurant()` (from Tier 1).
- Modify: `packages/shared/src/schemas/` — add `RoleSchema`, update `Staff`-adjacent schemas for `roleId`.

- [ ] **Step 1:** Add `Role` model + `Staff.roleId` to the schema; migrate (this is a second, separate migration
  from Tier 1's — do not bundle into Task 1 of Plan 22, run it after Tier 1 is fully landed and stable).
- [ ] **Step 2:** Seed default roles (Manager/Waiter/Kitchen/Host) per restaurant, matching today's enum semantics
  as the starting permission set, so existing behavior doesn't regress on migration day.
- [ ] **Step 3:** Build the new permission-check guard + decorator; replace all 9 controllers' `@Roles(...)` usages.
- [ ] **Step 4:** Build the `role` module (CRUD, restaurant-scoped).
- [ ] **Step 5:** Tests: permission allow-list enforcement (a role without `menu:write` is rejected on the menu
  write endpoints); default-role seeding matches prior enum behavior for a smoke-test staff member of each type.
- [ ] **Step 6:** `pnpm --filter @restaurant/api typecheck` + full API test suite (every existing `@Roles`-guarded
  endpoint's tests need updating to the new guard's mock shape). Commit:
  `feat(api): replace StaffRole/RolesGuard with per-restaurant custom roles + permissions`.

---

### Task 2: "Users & Permissions" screen (frontend, greenfield)

**Files:**
- Modify: `apps/web/src/routes/_app/staff/index.tsx` — replace the redirect stub with a real screen (or repurpose
  `/settings`'s eventual staff section — use judgment on IA placement, but the ask is clear: a screen for managing
  users and their roles doesn't exist today).
- New: role management UI — list/create/edit roles, a permission matrix (feature × read/write checkboxes) per role.
- New: staff-role assignment UI — assign a role to each staff member (backend CRUD for staff already exists, this
  is the missing write-UI issues.md flagged).

- [ ] **Step 1:** Build the role list/create/edit UI with the permission matrix.
- [ ] **Step 2:** Build staff list + role-assignment UI (create/edit staff already has backend support — build the
  missing frontend forms too if they don't exist, per the earlier research: "zero write UI" for staff).
- [ ] **Step 3:** `pnpm --filter @restaurant/web typecheck` + tests.
- [ ] **Step 4:** Verify in-browser: a manager creates a custom role with a narrow permission set, assigns it to a
  staff member, and that staff member's UI/API access reflects exactly that role's permissions (test a feature
  they now can't access).
- [ ] **Step 5:** Commit: `feat(web): Users & Permissions screen (role management + staff assignment)`.

---

## Self-review notes

- **Spec coverage:** the RBAC + Users-screen ask from issues.md maps to Tasks 1-2. Complete.
- **Sequencing:** Task 1 (backend) before Task 2 (frontend needs the role CRUD to exist). Both tasks depend on
  Plan 22 (Tier 1) being fully landed first — `restaurantId` scoping and the JWT `restaurantId` claim are
  prerequisites for a *per-restaurant* role model to mean anything.
- **Scope boundary:** superuser (a separate principal per ADR-002) is untouched by this plan — it lives outside the
  per-restaurant role system entirely, by design.
