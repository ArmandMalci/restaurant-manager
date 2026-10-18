# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Floor staff and waiters come first.** They work on a shared floor tablet (and on phones). The product optimises their service workflow first: seat, order, fire, run and settle.
- **Hosts** run the door and reservations from the host-stand tablet.
- **Kitchen** reads the kitchen display system (KDS) on a big screen at the pass.
- **Managers** use the back office on desktop: menu, inventory, reports, calendar/rota and settings.
- **Platform admin** is a superuser who oversees every tenant restaurant.
- The roles in the data model are `manager`, `waiter`, `kitchen` and `host`, plus `PlatformAdmin` (`prisma/schema.prisma`).

## Product Purpose

The product runs a restaurant's day-to-day operations:
- Front-of-house seats guests and takes orders.
- The kitchen cooks them, routed by station.
- The bill is settled.

It covers the floor and tables, order entry, the KDS, reservations, checkout, menu (with modifiers and 86), inventory, reports, the staff calendar and settings. The in-product tagline is "Your restaurant, running like clockwork." (`apps/web/src/routes/_auth/login.tsx`).

## Positioning

- Multi-tenant SaaS. Independent restaurants sign up and manage their own venue, isolated from one another (`docs/decisions/ADR-002-multi-tenancy.md`).
- Built around the floor, not the till. It is designed for the waiter's shared tablet first, and it records money rather than processing it.

## Operating Context

- **Device priority:** tablet (floor and host stand), then phone (pocket), then desktop (back office), then the big kitchen screen (`docs/design-revamp/direction.md`).
- **Shared device:** one shared floor device with a long-lived session. The whole floor is shown by default, and section or server is an optional filter, not tied to who is logged in (`direction.md` §7, §13).
- **Offline and real-time:** an installable web app with an offline action queue and an offline banner (`apps/web/index.html`, `components/layout/app-layout.tsx`). Live updates come over Socket.io, and web-push alerts use the `PushSubscription` model.
- **Noisy environment:** a noisy floor and kitchen, so operational alerts (order ready, table waiting, reservation late, low stock) surface through the header bell and feed (`direction.md` §12).
- **Navigation:** three groups (`components/layout/nav.ts`):
  - **Service:** Service, Floor, Order, Reservations, Checkout
  - **Kitchen:** KDS
  - **Back office:** Menu, Inventory, Reports, Calendar, Settings

## Capabilities and Constraints

- **Money is record-only.** There is no payment processor and no PCI scope. Checkout marks a bill paid and records the method; real money moves on an external terminal (`docs/DOMAIN.md`, `direction.md` §10).
- **Money correctness:** money is computed in `Decimal`, never floats. Order lines snapshot price at order time. There is one bill per order, and a bill cannot be paid twice (`docs/DOMAIN.md`).
- **Backend modules:** auth, billing, health, inventory, kds, menu, notifications, order, reports, reservation, section, service, settings, shift, staff, table (`apps/api/src/`).
- **Terminology:**
  - **86:** an item is unavailable.
  - **fire:** send an item to its kitchen station.
  - **pass:** the expo point.
  - **station:** grill, cold, bar or pass.
  - **cover / party:** the guests at a table.
  - **split:** dividing one bill (`docs/DOMAIN.md` glossary).
- **Tenancy is decided as multi-tenant.** `docs/DOMAIN.md` still says "single-restaurant operations PWA". That wording is stale and should be updated to match ADR-002.
- **Open decision: staff as users vs. records.** `direction.md` §7 says "manager-only login; staff are records, not app users". The schema gives `Staff` a `passwordHash` and a per-restaurant `username`, and plan 23 adds custom roles and permissions.
- **Open decision: canonical product name.** The UI says RestoManager, the page title says Restaurant Manager, and the iOS home-screen title says RestMgr.
- **Open decision: brand mark.** The `UtensilsCrossed`-in-a-tile mark is a placeholder (`direction.md` §13).
- **Open decision: market, locale and currency.** None is stated. Settings has a currency field, and `DOMAIN.md` uses a "+£2" example. i18n intent is unknown.
- **Open decision: voice.** There is no tone-of-voice or brand-personality guidance yet.

## Brand Commitments

- The aesthetic is "clean dense productivity": Notion, Airtable or Linear-light. It is explicitly not bright-POS, not soft-native, and not an empty template (`direction.md` §Frame).
- "Warm canvas" is the default identity. Multiple themes are kept, and themes change palette only, never density, hierarchy or components (`direction.md`). The visual system is in `DESIGN.md`.

## Evidence on Hand

- Product review with 24 phone and tablet screenshots (2026-07-10): `docs/design-revamp/review-2026-07-10/`.
- Visual direction mockups: `docs/design-revamp/mockups/` (Warm canvas, Midnight, High-contrast).
- Seed data: `prisma/seed.ts`.
- There are no customer testimonials, case studies, usage metrics or press. Do not fabricate them.

## Product Principles

1. **Floor first.** Optimise for the waiter on a shared tablet mid-service. The back office is secondary.
2. **Record, don't process.** The system records what happened with money; it never moves money.
3. **Every penny reconciles.** Money reads price snapshots in `Decimal` and must still be correct if the menu price changes tomorrow.
4. **Density is a feature.** Screens are glanceable and full at every breakpoint, with no empty voids.
5. **Tenants are isolated.** Each restaurant sees only its own data.

## Accessibility & Inclusion

- Target is WCAG 2.2 AA. The repo's audit skill runs the axe tags `wcag2a`, `wcag2aa` and `wcag22aa` (`.claude/skills/a11y-audit/SKILL.md`).
- Touch targets are at least 44px on touch devices (`apps/web/src/index.css`).
- `prefers-reduced-motion` is honoured.
