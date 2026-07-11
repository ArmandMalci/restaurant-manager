# ADR-002: Multi-Tenancy Foundation

**Date:** 2026-07-11
**Status:** Accepted — implementation authorized 2026-07-11 (Tier 0 `prisma migrate reset` confirmed run; Armand
authorized continuing without further per-step approval this session)
**Deciders:** Armand Malci (sign-off pending) + `restaurant-architect` (proposal) + `restaurant-domain-judge` (skeptical pass)

## Context

D5 (locked 2026-07-11) fixed the tenancy shape as **multi-tenant SaaS**: independent restaurants sign up
and manage their own venue, a platform superuser oversees all tenants, and isolation must be real — not a
`Restaurant` model bolted onto shared data. Today there is no `Restaurant` model at all; only a singleton
`RestaurantSettings` row (`id: "default"`, `schema.prisma:294`). Nothing anywhere in the stack is
tenant-scoped.

This is the largest-blast-radius change in the app's history: every one of the 19 Prisma models, the JWT
contract, all ~14 Prisma-querying services, both Socket.io namespaces, and all 20 frontend routes change
shape. Tier 1 (this ADR) blocks Tier 2 (per-restaurant roles/username) and Tier 5 (multi-floor). It cannot
land until Tier 0's `prisma migrate reset` runs once (D6) to clear the pre-existing checksum drift on
`20260626000001_add_order_item_modifiers`.

Verified against current code before writing (not taken from summary):
- JWT payload is `{ sub, email, role }` — no tenant claim (`auth.service.ts:56-61`; `JwtPayload`
  `jwt.strategy.ts:6-10`). `validate()` (`jwt.strategy.ts:22-24`) is the single thread point onto `req.user`.
- `validateUser` looks up `Staff` by `email` only (`auth.service.ts:17-18`); `email` is the sole login
  identity today. No `username` field exists.
- `RolesGuard` (`roles.guard.ts:10-26`) is rank-based against `ROLE_HIERARCHY`
  (`packages/shared/src/constants/index.ts:15-20`, `manager:4 > host:3 > waiter:2 > kitchen:1`).
- `apiClient` request interceptor (`api-client.ts:6-14`) injects only the bearer token.
- 19 models confirmed (`schema.prisma`); no `Restaurant`. Spot-checked the direct-vs-transitive split: e.g.
  `ModifierGroup` (line 85) has **no** owning parent FK (it reaches menu items only through the
  `MenuItemModifierGroup` join) — so it genuinely needs a *direct* `restaurantId`, confirming the roadmap's
  classification. `RefreshToken` and `PushSubscription` scope via `Staff` — which makes the Staff↔Restaurant
  cardinality decision load-bearing for transitive scoping.

## Decisions

### Tenant model — new `Restaurant`; `RestaurantSettings` folds into it

Add a `Restaurant` model as the tenant root. **Fold `RestaurantSettings` into it** rather than keeping a
separate model: its columns (`name`, `description`, `phone`, `email`, `address`, `openingHours`) are exactly
restaurant-identity fields, so this removes a model instead of scoping one. The singleton `default` row
becomes the first real `Restaurant` on reseed.

Scoping split (19 models → all tenant-scoped, none stay global):
- **10 gain a direct `restaurantId` FK (NOT NULL):** `Staff`, `Table`, `MenuCategory`, `MenuItem`,
  `ModifierGroup`, `ModifierOption`, `Order`, `Reservation`, `Shift`, `InventoryItem`.
- **`RestaurantSettings` is absorbed** into `Restaurant` (was the 11th "direct" model in the roadmap; the
  arithmetic is now 10 direct + the `Restaurant` table itself).
- **8 derive scope transitively via a parent FK, no new column:** `RefreshToken`, `OrderItem`,
  `OrderItemModifier`, `MenuItemModifierGroup`, `InventoryUsage`, `Bill`, `Payment`, `PushSubscription`.

Rationale for folding vs. a 1:1 child: fewer models, and the fields are identity, not config. If
per-restaurant *config* grows large (Tier 6 adds currency/FX, future flags), extract a `RestaurantConfig`
1:1 child then — a cheap, reversible split. Do not build it speculatively now.

### Scoping enforcement — requested-id is the subject, JWT is the policy

One uniform rule end-to-end, no per-role special-casing:

> The **requested** restaurantId (from the URL, carried to the API) is the authorization *subject*. The JWT
> is the authorization *policy*. Normal staff: policy = `{home restaurant}`. Superuser: policy = *all*.
> (Future M:N: policy = membership set.) If the requested id is **not** in the policy → `403`. Otherwise the
> DB query is scoped by the requested id.

This makes "the URL is the source of truth for the *active* tenant" literally true server-side, while the
JWT stays authoritative for *access*. A normal user who edits the URL to another restaurant's id is rejected
(403), never silently served their own data under the wrong URL.

**JWT claim shape:** `{ sub, email, role, restaurantId }` for staff (`restaurantId` = their home restaurant,
the policy). Superusers authenticate as a different principal (see sub-decision 3) with `{ sub, email,
isSuperuser: true }` and no `restaurantId`. `role` is left untouched here — Tier 2 reshapes it.

**Backend REST — one chokepoint, not 14 edits.** A global `RestaurantScopeInterceptor` reads the requested
id (header, below) and the JWT policy off `req.user`, applies the reject-if-not-in-policy rule, and exposes
the resolved id via a `@CurrentRestaurant()` param decorator (same shape as the existing JWT guard). Each of
the ~14 services then takes `restaurantId` as an ordinary `where` filter. A separate `SuperuserGuard` gates
the platform-admin routes and widens the policy to "all."

**API transport — header, not a path rewrite.** The client interceptor lifts the active id from the router
and sends `X-Restaurant-Id`; the interceptor reads it. **Rejected:** rewriting every controller route to
`/api/r/:restaurantId/...` — it churns every endpoint and produces a massive Orval diff for no security gain
(the JWT is the guard regardless). The header is the mechanism; the JWT is the policy.

**WebSocket — must be scoped too (not covered by the HTTP interceptor).** ADR-001's Socket.io `/kds` and
`/pos` namespaces emit live order/table events; an HTTP interceptor does not touch a WS gateway. Each
namespace must (a) read `restaurantId` from the handshake auth, validate it against the socket's JWT policy,
and (b) join a **per-restaurant room** (`kds:<restaurantId>`, `pos:<restaurantId>`); every `emit` targets
that room. Without this, two tenants share the live kitchen feed — an unacceptable cross-tenant leak given
the "beat paper on reliability" bar.

**Frontend — `$restaurantId` URL segment is the source of truth for the active tenant.** This is the
codebase's first dynamic route param. All 20 `_app` routes move under it. It is *not* cosmetic: it selects
the active tenant (essential for superusers and any future multi-restaurant user) and makes pages
deep-linkable — satisfying Armand's "restaurant-url-driven, every page restaurant-aware" ask. The API client
injects it as `X-Restaurant-Id`; the backend re-validates per the policy rule above, so the URL is never
trusted for authorization on its own. **The segment must also wrap the login route** — see sub-decision 1
(per-restaurant username needs a pre-auth restaurant context). Canonical segment value = the restaurant
**id** (Armand's literal ask; stable, unambiguous). Open sub-decision, deferred to the auth-UX pass: the
*login* URL specifically may want a human-typeable **slug** alias (ids aren't typeable), resolving to the
same id — do not build the alias system speculatively.

## Sub-decisions resolved

### 1. `username` uniqueness — **per-restaurant**, with `email` as the global backbone

`@@unique([restaurantId, username])`, not a global unique. A SaaS tenant must not lose "john" because
another restaurant claimed it first — a shared global username namespace is a tenant-isolation smell.

Login ambiguity (a bare `username` can't resolve to one restaurant) is dissolved by the URL-driven design:
login happens **inside a restaurant context** (the `$restaurantId` segment wraps the login route), so the
login tuple is `(restaurantId, username, password)` and resolves to exactly one `Staff` row.
`validateUser` gains a `restaurantId` argument and looks up by `restaurantId + (email OR username)`.

`email` stays **globally `@unique`** as the cross-tenant identity backbone: it is the natural key for
password reset and for any flow that has no restaurant context. Superusers (sub-decision 3) live in a
separate table and never enter any restaurant's username namespace — which is the clean reason the
`@@unique([restaurantId, username])` partial-index / null-restaurantId problem never arises.

### 2. Staff ↔ Restaurant cardinality — **one restaurant per staff (1:N)**, M:N documented as reversible

`Staff.restaurantId` is a single NOT NULL FK. A person working two locations = two accounts, for now.

Rationale:
- **Avoids pre-committing Tier 2.** M:N forces `role` off `Staff` and onto a membership join — which
  collides head-on with Tier 2's not-yet-designed per-restaurant role system. Deciding M:N now would decide
  Tier 2's shape by side effect.
- **Keeps every scoping query simple** — a scalar FK equality, not a membership test on all ~14 services.
- **Keeps transitive scoping clean.** `RefreshToken` and `PushSubscription` resolve scope through `Staff`;
  a single `Staff.restaurantId` keeps that unambiguous. (A refresh token / push subscription is a
  per-restaurant login artifact anyway.)
- **Matches the endgame.** D5's bar is tenant *isolation* (independent venues), not cross-tenant staff
  sharing. Cross-location staff is a chain/franchise feature, not the pilot's "one real venue runs a shift."
- **YAGNI**, and reversible: because scope is centralized (one interceptor + a policy claim), migrating to
  M:N later is contained — add a `StaffRestaurant` join, move `role` to it, change the policy from
  `{home}` to `membership set` in one guard. The uniform "requested-id ∈ policy" rule already has the seam.

### 3. Superuser vs Tier 2 roles — **a separate `PlatformAdmin` principal, above and outside the role system**

The superuser is **not** a per-restaurant role and **not** a `Staff.isSuperuser` flag. It is a distinct
principal type in its own small table (`PlatformAdmin`), authenticated at a platform-level login (no
restaurant context), carrying `isSuperuser: true` and no `restaurantId` in its JWT.

Rationale:
- **It belongs to no restaurant** — it exists before any restaurant does (it creates the first one) and acts
  across all. A per-restaurant role literally cannot express that.
- **It dodges the flag's hidden costs.** `Staff.isSuperuser` + nullable `restaurantId` would (a) make the
  tenant FK on the most security-sensitive table nullable — breaking "every staff belongs to exactly one
  restaurant" as a DB-enforceable invariant, against D5's "real isolation" headline — and (b) make
  `@@unique([restaurantId, username])` treat null-restaurantId superusers as non-colliding, needing a partial
  index. A separate table dissolves *both* at once and keeps `Staff.restaurantId` NOT NULL. Fewer special
  cases beats fewer tables here.
- **It leaves Tier 2 free.** Tier 2 can redesign the per-restaurant role/permission system end to end without
  ever touching the superuser concept, because superuser lives outside it. `SuperuserGuard` (checks the JWT
  flag, bypasses `RestaurantScopeInterceptor`'s single-restaurant policy) is orthogonal to Tier 2's
  per-feature allow-list.

### Phased build sequence

Strictly sequential spine, with fan-out where noted. Nothing implementation-side starts until Tier 0's
`prisma migrate reset` has run once.

1. **Schema + migration + seed rewrite** — *strictly first, sequential.* `Restaurant` model
   (`RestaurantSettings` folded in), `PlatformAdmin` table, direct `restaurantId` FKs on the 10 models,
   `username` field (`@@unique([restaurantId, username])`). **Includes rewriting `prisma/seed.ts`** to create
   the first `Restaurant`, scope every seeded row to it, and seed a `PlatformAdmin` — otherwise the Tier 0
   reseed produces a broken app. Everything below depends on this.
2. **Auth / JWT** — add `restaurantId` to the staff claim; `PlatformAdmin` login path + `isSuperuser` claim;
   `validate()` threads the policy onto `req.user`; `validateUser(restaurantId, email|username, password)`.
   Depends on 1. Freeze the JWT contract here — 3 and 4 build against it.
3. **Backend scoping** — `RestaurantScopeInterceptor` + `@CurrentRestaurant()` + `SuperuserGuard` +
   WebSocket room/handshake scoping on `/kds` and `/pos`. Depends on 1+2. The interceptor/guard/WS-scoping is
   one focused change; **the per-service `where`-filter threading fans out — one subagent per module** once
   the decorator exists.
4. **Frontend routing** — `$restaurantId` segment wrapping `_app` **and** the login route; api-client
   `X-Restaurant-Id` injection; login→restaurant redirect. Depends on the frozen JWT contract (2), **not** on
   service internals — so it can run **in parallel with 3**.
5. **Restaurant switcher UI** — for superusers / future multi-restaurant users. Depends on 4.
6. **Superuser admin surface** — create/list/manage restaurants across the platform. Depends on 3
   (`SuperuserGuard`) + 4.
7. **Self-serve signup** — new restaurant + first manager, in one transaction (required by D5's SaaS shape).
   Depends on 1+2; a mostly-independent new public flow, so it can run **in parallel with 5 and 6** once
   3+4 land.

**Parallel:** step 3's per-service fan-out; step 4 alongside step 3; steps 5, 6, 7 concurrently after 3+4.
**Sequential:** 1 → 2 → 3(interceptor) ; 3 → 6 ; Tier 0 reset before any of it.

## Consequences

- **Breaking change — the largest in the app's history (flagged per architect ownership).** Every shared Zod
  schema in `packages/shared/src/schemas/` gains `restaurantId`; the JWT contract changes; `pnpm --filter
  @restaurant/web gen:api` + Biome format is mandatory after the API contract lands. All existing dev data is
  dropped by the Tier 0 reset (D6, already human-approved).
- A nullable-FK invariant hole is deliberately avoided: `Staff.restaurantId` stays NOT NULL because superusers
  are a separate principal.
- The uniform "requested-id ∈ policy" rule is the single seam that makes a future M:N staff model a contained
  change rather than a rewrite.
- Tier 2 (per-restaurant custom roles) inherits `@@unique([restaurantId, username])` and the untouched
  `Staff.role` column, and is free to replace `RolesGuard` / `ROLE_HIERARCHY` without touching superuser.
- Tier 6 (multi-currency) will add currency/FX config; revisit the fold-vs-child call for `Restaurant` if
  per-restaurant config outgrows the identity table.
- `id`-vs-`slug` for the login URL is left open for the auth-UX pass — not blocking this ADR.
