# App Shell & IA — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restructure the information architecture (route renames + grouped navigation) and redesign the app shell (sidebar, topbar, notification feed) to the new IA, on top of the Warm canvas design system from Plan 1.

**Architecture:** TanStack Router file-based routes (auto-generated tree). Renaming a screen = move its route file + update its `createFileRoute` id, leave a redirect file at the old path, and update the hardcoded redirects + nav. Navigation is centralized into one shared grouped `NAV_GROUPS` module consumed by both the sidebar (desktop) and the topbar drawer (mobile), eliminating the current duplication. The notification bell opens a right-side `Sheet` feed (placeholder until the alert engine in a later plan).

**Tech Stack:** React 18 + TanStack Router (`@tanstack/router-plugin/vite` auto-gen) + lucide-react + the Plan 1 primitives + existing `Sheet`/`EmptyState` UI components. Repo uses **pnpm**; commands run from `apps/web/`.

## Global Constraints

- **Semantic tokens only** in components (no literal palette / raw hex). The theme blocks in `index.css` are the only place hex lives.
- **One accent CTA per screen** (the `<Button>` default variant = terracotta).
- **Icons: lucide-react only.** Raw `<button>` elements MUST have an explicit `type=` (the pre-commit `biome` lint enforces `lint/a11y/useButtonType`).
- **No left-border "side-stripe" active indicators** — the active nav state is a background tint + text color, never a `border-l-*` stripe.
- **Never modify Orval hooks** under `apps/web/src/api/`. Renaming a *route* never renames its API hooks.
- **Route tree is auto-generated** by the Vite plugin on save/dev — never hand-edit `routeTree.gen.ts`. Run `pnpm run build` to regenerate + typecheck after route changes.
- **No font-size below 12px** in components.
- Pre-commit hook runs `biome check` + `eslint`; src commits go through it normally. Stage only the exact files per task (never `git add -A`).

---

## File Structure

| File | Responsibility | Action |
|------|----------------|--------|
| `apps/web/src/routes/_app/{service,floor,order,door,checkout}/index.tsx` | Renamed screen routes (moved from dashboard/tables/orders/reservations/billing) | Move + edit `createFileRoute` id |
| `apps/web/src/routes/_app/{dashboard,tables,orders,reservations,billing,staff,notifications}/index.tsx` | Redirect stubs at the old paths | Create/replace |
| `apps/web/src/routes/index.tsx`, `_auth.tsx`, `_auth/login.tsx` | Update hardcoded `/dashboard` redirects → `/service` | Modify |
| `apps/web/src/components/layout/nav.ts` | Shared grouped `NAV_GROUPS` (single source for sidebar + topbar) | Create |
| `apps/web/src/components/layout/nav.test.ts` | Assert nav data shape/paths | Create |
| `apps/web/src/components/layout/sidebar.tsx` | Grouped sidebar, new active style, consumes `NAV_GROUPS` | Rewrite |
| `apps/web/src/components/layout/topbar.tsx` | Grouped mobile drawer, bell→Sheet feed, updated `ROUTE_LABELS` | Rewrite |
| `apps/web/src/components/notification-feed.tsx` | Bell Sheet panel content (placeholder feed) | Create |
| `apps/web/src/components/offline-banner.tsx` | Replace literal `yellow-*` with `warning` tokens | Modify |

---

## Task 1: Route migration (renames + redirects)

Renames the five screens and redirects the old paths. The screen *components* and their Orval hooks are unchanged — only file location + `createFileRoute` id + redirects.

**Rename map:**

| Old route dir | New route dir | New `createFileRoute` id |
|---------------|---------------|--------------------------|
| `_app/dashboard/` | `_app/service/` | `/_app/service/` |
| `_app/tables/` | `_app/floor/` | `/_app/floor/` |
| `_app/orders/` | `_app/order/` | `/_app/order/` |
| `_app/reservations/` | `_app/door/` | `/_app/door/` |
| `_app/billing/` | `_app/checkout/` | `/_app/checkout/` |

**Files:**
- Move: each `index.tsx` per the table above
- Create: redirect stubs at all 7 old paths (5 renamed + `staff` + `notifications`)
- Modify: `routes/index.tsx`, `routes/_auth.tsx`, `routes/_auth/login.tsx`

**Interfaces:**
- Produces: the new route paths `/service`, `/floor`, `/order`, `/door`, `/checkout` (typed into the generated tree) that Task 2/3 nav links reference.

- [ ] **Step 1: Move the five route files and update each `createFileRoute` id**

For each row in the rename map, move the file and change its `createFileRoute('…')` argument. Example (dashboard → service):

```bash
git mv apps/web/src/routes/_app/dashboard/index.tsx apps/web/src/routes/_app/service/index.tsx
```

Then in `apps/web/src/routes/_app/service/index.tsx` change the route id:

```typescript
export const Route = createFileRoute('/_app/service/')({
```

Repeat for: `tables→floor` (`/_app/floor/`), `orders→order` (`/_app/order/`), `reservations→door` (`/_app/door/`), `billing→checkout` (`/_app/checkout/`). Change ONLY the `createFileRoute` id string in each moved file; leave the component body untouched.

- [ ] **Step 2: Create redirect stubs at all old paths**

Create a redirect file at each old path using this template (substitute `<OLD_ID>` and `<NEW_PATH>` per the table below):

```typescript
import { createFileRoute, redirect } from '@tanstack/react-router';

export const Route = createFileRoute('<OLD_ID>')({
  beforeLoad: () => {
    throw redirect({ to: '<NEW_PATH>' });
  },
  component: () => null,
});
```

| File to create | `<OLD_ID>` | `<NEW_PATH>` |
|----------------|-----------|--------------|
| `_app/dashboard/index.tsx` | `/_app/dashboard/` | `/service` |
| `_app/tables/index.tsx` | `/_app/tables/` | `/floor` |
| `_app/orders/index.tsx` | `/_app/orders/` | `/order` |
| `_app/reservations/index.tsx` | `/_app/reservations/` | `/door` |
| `_app/billing/index.tsx` | `/_app/billing/` | `/checkout` |
| `_app/staff/index.tsx` (replace existing page with this redirect) | `/_app/staff/` | `/settings` |
| `_app/notifications/index.tsx` (replace existing page with this redirect) | `/_app/notifications/` | `/service` |

> Staff's old directory page is replaced by a redirect (people-admin moves into Settings in a later feature plan). Notifications becomes the bell feed (Task 3); its route redirects to `/service`.

- [ ] **Step 3: Update the hardcoded `/dashboard` redirects**

In `routes/index.tsx` and `routes/_auth.tsx` and `routes/_auth/login.tsx`, replace every `to: '/dashboard'` (and any `navigate({ to: '/dashboard' })`) with `'/service'`.

- [ ] **Step 4: Verify build + typecheck (regenerates the route tree)**

Run (from `apps/web/`): `pnpm run build`
Expected: builds clean (exit 0). The TanStack plugin regenerates `routeTree.gen.ts`; no TS errors about unknown routes. If `to="/dashboard"` etc. remain anywhere, the typed `Link`/`redirect` will error here — fix those references.

- [ ] **Step 5: Verify redirects in the browser**

Use the `run-web` skill; log in and visit `/dashboard`, `/tables`, `/orders`, `/reservations`, `/billing`, `/staff`, `/notifications`.
Expected: each redirects to its new path (`/service`, `/floor`, `/order`, `/door`, `/checkout`, `/settings`, `/service`) and the screen renders.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/routes
git commit -m "refactor(web): migrate IA route names (service/floor/order/door/checkout) + redirects"
```

---

## Task 2: Shared grouped navigation + sidebar redesign

Creates one shared `NAV_GROUPS` module and rewrites the sidebar into grouped sections with a clean (no side-stripe) active state, in the Warm canvas identity.

**Files:**
- Create: `apps/web/src/components/layout/nav.ts`, `apps/web/src/components/layout/nav.test.ts`
- Rewrite: `apps/web/src/components/layout/sidebar.tsx`

**Interfaces:**
- Produces: `NAV_GROUPS: { label: string; items: { to: string; label: string; icon: LucideIcon }[] }[]` consumed by sidebar (Task 2) and topbar (Task 3).

- [ ] **Step 1: Write the failing nav-data test**

Create `apps/web/src/components/layout/nav.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { NAV_GROUPS } from './nav';

describe('NAV_GROUPS', () => {
  it('exposes Service and Back office groups', () => {
    expect(NAV_GROUPS.map((g) => g.label)).toEqual(['Service', 'Back office']);
  });

  it('routes to the migrated service paths', () => {
    const paths = NAV_GROUPS.flatMap((g) => g.items.map((i) => i.to));
    expect(paths).toContain('/service');
    expect(paths).toContain('/floor');
    expect(paths).toContain('/checkout');
    expect(paths).not.toContain('/dashboard');
    expect(paths).not.toContain('/staff');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/layout/nav.test.ts`
Expected: FAIL — cannot resolve module `./nav`.

- [ ] **Step 3: Create the shared nav module**

Create `apps/web/src/components/layout/nav.ts`:

```typescript
import {
  Activity,
  LayoutGrid,
  ClipboardList,
  DoorOpen,
  Receipt,
  UtensilsCrossed,
  Package,
  BarChart3,
  CalendarRange,
  Settings,
  type LucideIcon,
} from 'lucide-react';

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

export const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Service',
    items: [
      { to: '/service', label: 'Service', icon: Activity },
      { to: '/floor', label: 'Floor', icon: LayoutGrid },
      { to: '/order', label: 'Order', icon: ClipboardList },
      { to: '/door', label: 'Door', icon: DoorOpen },
      { to: '/checkout', label: 'Checkout', icon: Receipt },
    ],
  },
  {
    label: 'Back office',
    items: [
      { to: '/menu', label: 'Menu', icon: UtensilsCrossed },
      { to: '/inventory', label: 'Inventory', icon: Package },
      { to: '/reports', label: 'Reports', icon: BarChart3 },
      { to: '/calendar', label: 'Calendar', icon: CalendarRange },
      { to: '/settings', label: 'Settings', icon: Settings },
    ],
  },
];
```

> The "Kitchen" group (KDS) is intentionally omitted until the KDS screen exists (a later feature plan).

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/layout/nav.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Rewrite the sidebar to use grouped nav**

Replace the entire body of `apps/web/src/components/layout/sidebar.tsx` with:

```tsx
import { Link } from '@tanstack/react-router';
import { UtensilsCrossed, MoreVertical } from 'lucide-react';
import { useAuthStore } from '@/stores/auth.store';
import { cn } from '@/lib/utils';
import { NAV_GROUPS } from './nav';

function getInitials(email: string): string {
  return email.slice(0, 2).toUpperCase();
}

export function Sidebar() {
  const user = useAuthStore((s) => s.user);

  return (
    <aside className="bg-sidebar text-sidebar-foreground border-sidebar-border hidden h-full w-60 shrink-0 flex-col border-r md:flex">
      <div className="flex items-center gap-3 px-4 py-5">
        <div className="bg-accent text-accent-foreground flex h-9 w-9 shrink-0 items-center justify-center rounded-lg">
          <UtensilsCrossed className="h-5 w-5" />
        </div>
        <span className="text-sidebar-foreground text-sm font-semibold tracking-tight">
          RestoManager
        </span>
      </div>

      <nav className="flex flex-1 flex-col gap-5 overflow-y-auto px-3 py-2">
        {NAV_GROUPS.map((group) => (
          <div key={group.label} className="flex flex-col gap-0.5">
            <p className="text-sidebar-foreground/45 px-3 pb-1 text-[11px] font-medium uppercase tracking-wider">
              {group.label}
            </p>
            {group.items.map(({ to, label, icon: Icon }) => (
              <Link
                key={to}
                to={to}
                className={cn(
                  'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                  'text-sidebar-foreground/65 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                  '[&.active]:bg-sidebar-accent [&.active]:text-sidebar-accent-foreground [&.active]:font-semibold',
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {label}
              </Link>
            ))}
          </div>
        ))}
      </nav>

      {user && (
        <div className="border-sidebar-border flex items-center gap-3 border-t px-4 py-4">
          <div className="bg-sidebar-accent text-sidebar-accent-foreground flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold">
            {getInitials(user.email)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sidebar-foreground truncate text-xs font-medium">{user.email}</p>
            <p className="text-sidebar-foreground/50 text-xs">Manager</p>
          </div>
          <button
            type="button"
            className="text-sidebar-foreground/50 hover:text-sidebar-foreground rounded p-1 transition-colors"
            aria-label="User options"
          >
            <MoreVertical className="h-4 w-4" />
          </button>
        </div>
      )}
    </aside>
  );
}
```

> Note the active state is `bg-sidebar-accent` + bold text — **no `border-l-2` side-stripe** (removing the banned pattern still present in the old sidebar). Confirm the `useAuthStore` selector usage matches the store (it exposes `user`); if the store has no selector form, use `const { user } = useAuthStore();`.

- [ ] **Step 6: Verify build + screenshot**

Run: `pnpm run build` (expect exit 0). Then use the `run-web` skill to screenshot the app at desktop width.
Expected: grouped sidebar with "Service" and "Back office" section labels, terracotta active item (no left stripe), warm light sidebar. Compare spacing to `docs/design-revamp/mockups/service-warm-canvas.html` and nudge padding/gaps to match.

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/components/layout/nav.ts apps/web/src/components/layout/nav.test.ts apps/web/src/components/layout/sidebar.tsx
git commit -m "feat(web): grouped sidebar nav with shared NAV_GROUPS"
```

---

## Task 3: Topbar redesign — grouped drawer + notification feed

Rewrites the topbar to reuse `NAV_GROUPS` in the mobile drawer, update page-title labels for the new paths, and route the bell to a right-side `Sheet` feed.

**Files:**
- Create: `apps/web/src/components/notification-feed.tsx`
- Rewrite: `apps/web/src/components/layout/topbar.tsx`

**Interfaces:**
- Consumes: `NAV_GROUPS` from Task 2; `Sheet`/`SheetContent`/`SheetTrigger` from `@/components/ui/sheet`; `EmptyState` from `@/components/ui/empty-state`.

- [ ] **Step 1: Create the notification feed panel**

Create `apps/web/src/components/notification-feed.tsx`:

```tsx
import { BellOff } from 'lucide-react';
import { EmptyState } from '@/components/ui/empty-state';

export function NotificationFeed() {
  return (
    <div className="px-4 py-6">
      <EmptyState
        icon={BellOff}
        title="No new alerts"
        description="Order-ready, table-waiting, and reservation alerts will appear here during service."
      />
    </div>
  );
}
```

> Placeholder until the alert engine (later plan) feeds real items; that plan adds the unread badge + live list.

- [ ] **Step 2: Rewrite the topbar**

Replace the entire body of `apps/web/src/components/layout/topbar.tsx` with:

```tsx
import { useState } from 'react';
import { Link, useRouter, useRouterState } from '@tanstack/react-router';
import { Menu, Bell, LogOut, UtensilsCrossed } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { useAuthStore } from '@/stores/auth.store';
import { authControllerLogout } from '@/api/auth/auth';
import { NAV_GROUPS } from './nav';
import { NotificationFeed } from '@/components/notification-feed';

const ROUTE_LABELS: Record<string, string> = {
  '/service': 'Service',
  '/floor': 'Floor',
  '/order': 'Order',
  '/door': 'Door',
  '/checkout': 'Checkout',
  '/menu': 'Menu',
  '/inventory': 'Inventory',
  '/reports': 'Reports',
  '/calendar': 'Calendar',
  '/settings': 'Settings',
};

function usePageTitle(): string {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  if (ROUTE_LABELS[pathname]) return ROUTE_LABELS[pathname];
  const segment = pathname.split('/').filter(Boolean).pop() ?? '';
  return segment.charAt(0).toUpperCase() + segment.slice(1);
}

export function Topbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const title = usePageTitle();
  const { user, clearAuth } = useAuthStore();
  const router = useRouter();

  async function handleLogout() {
    try {
      await authControllerLogout();
    } finally {
      clearAuth();
      router.navigate({ to: '/login' });
    }
  }

  return (
    <header className="bg-card border-border flex h-14 shrink-0 items-center justify-between border-b px-4 sm:px-6">
      <div className="flex items-center gap-2">
        <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
          <SheetTrigger
            render={
              <button
                type="button"
                className="text-muted-foreground hover:bg-accent/10 hover:text-foreground rounded-md p-2 transition-colors md:hidden"
                aria-label="Open navigation menu"
              />
            }
          >
            <Menu className="h-5 w-5" />
          </SheetTrigger>
          <SheetContent side="left" className="w-64 p-0">
            <SheetHeader className="border-border border-b px-4 py-4">
              <SheetTitle className="flex items-center gap-3 text-sm font-semibold">
                <span className="bg-accent text-accent-foreground flex h-8 w-8 items-center justify-center rounded-lg">
                  <UtensilsCrossed className="h-4 w-4" />
                </span>
                RestoManager
              </SheetTitle>
            </SheetHeader>
            <nav className="flex flex-col gap-4 overflow-y-auto px-3 py-3">
              {NAV_GROUPS.map((group) => (
                <div key={group.label} className="flex flex-col gap-0.5">
                  <p className="text-muted-foreground px-3 pb-1 text-[11px] font-medium uppercase tracking-wider">
                    {group.label}
                  </p>
                  {group.items.map(({ to, label, icon: Icon }) => (
                    <Link
                      key={to}
                      to={to}
                      onClick={() => setMobileMenuOpen(false)}
                      className="text-foreground/70 hover:bg-muted hover:text-foreground [&.active]:bg-accent/10 [&.active]:text-accent flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors"
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      {label}
                    </Link>
                  ))}
                </div>
              ))}
            </nav>
          </SheetContent>
        </Sheet>
        <h2 className="text-foreground text-sm font-semibold">{title}</h2>
      </div>

      <div className="flex items-center gap-1">
        <Sheet>
          <SheetTrigger
            render={
              <button
                type="button"
                className="text-muted-foreground hover:bg-accent/10 hover:text-foreground rounded-md p-2 transition-colors"
                aria-label="Notifications"
              />
            }
          >
            <Bell className="h-4 w-4" />
          </SheetTrigger>
          <SheetContent side="right" className="w-80 p-0">
            <SheetHeader className="border-border border-b px-4 py-4">
              <SheetTitle className="text-sm font-semibold">Notifications</SheetTitle>
            </SheetHeader>
            <NotificationFeed />
          </SheetContent>
        </Sheet>
        <span className="text-muted-foreground hidden px-2 text-sm sm:inline">{user?.email}</span>
        <button
          type="button"
          onClick={handleLogout}
          className="text-muted-foreground hover:bg-muted hover:text-foreground flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors"
        >
          <LogOut className="h-4 w-4" />
          <span className="hidden sm:inline">Logout</span>
        </button>
      </div>
    </header>
  );
}
```

> Confirm the logout handler: the old topbar had a `handleLogout`; this uses `useAuthStore`'s `logout`. If logout requires navigation, keep whatever the old `handleLogout` did (check the old file before overwriting) — preserve its exact behavior.

- [ ] **Step 3: Verify build**

Run: `pnpm run build`
Expected: exit 0; no unused-import or type errors.

- [ ] **Step 4: Verify behavior + screenshot**

Use the `run-web` skill: at desktop width click the bell → a right Sheet "Notifications" with the empty-state opens; at mobile width (resize to 390px) the hamburger opens the grouped drawer; page title reflects the new route names.
Expected: matches; screenshot both states.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/layout/topbar.tsx apps/web/src/components/notification-feed.tsx
git commit -m "feat(web): topbar grouped drawer + notification feed sheet"
```

---

## Task 4: Straggler cleanup — offline banner to tokens

Fix the literal-color component the Plan 1 theme retune exposed.

**Files:**
- Modify: `apps/web/src/components/offline-banner.tsx`

- [ ] **Step 1: Replace literal yellow with warning tokens**

In `offline-banner.tsx`, replace the literal classes `border-yellow-200 bg-yellow-50 text-yellow-800` with semantic warning tokens. The result:

```tsx
import { WifiOff } from 'lucide-react';

export function OfflineBanner() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="bg-warning/15 text-warning border-warning/30 flex items-center gap-2 border-b px-4 py-2 text-sm font-medium"
    >
      <WifiOff className="h-4 w-4 shrink-0" />
      You're offline — changes will be queued and sent when reconnected.
    </div>
  );
}
```

> Keep the existing import/export shape if it differs (read the file first); only the wrapper `className` and the literal colors change.

- [ ] **Step 2: Verify build**

Run: `pnpm run build`
Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/offline-banner.tsx
git commit -m "fix(web): offline banner uses warning tokens (theme-aware)"
```

> Modal scrims (`bg-black/40`–`/50` in sheet/dialog and the tables/menu/inventory overlays) are left as-is: a translucent black scrim is conventional and reads acceptably over both light and dark themes. Revisit only if they look wrong during the per-screen reskins.

---

## Self-Review

**1. Spec coverage (against `direction.md` §A IA + Decisions locked):**
- IA renames Dashboard→Service, Tables→Floor, Orders→Order, Reservations→Door, Billing→Checkout → Task 1. ✓
- Staff folded away (route → Settings redirect, removed from nav) → Task 1 + Task 2 (`NAV_GROUPS` omits Staff). ✓
- Notifications → bell/feed, not a page (route redirect + Sheet feed) → Task 1 + Task 3. ✓
- Grouped nav (Service zone / Back office); KDS deferred until it exists → Task 2. ✓
- Side-stripe-free active state → Task 2 (no `border-l`). ✓
- Old-path redirects (backward compat) → Task 1 Step 2. ✓
- Straggler cleanup (offline banner) → Task 4. ✓
- **Deferred by design (tracked, not gaps):** KDS nav entry, the live notification feed + unread badge, and the per-screen dense layouts/Service-home content (Plan 3 reskins + the Service-home/alerts plan). Section filter on the topbar is deferred to the Service-home plan (it scopes that screen, not the global shell).

**2. Placeholder scan:** No TBD/TODO. The redirect template in Task 1 is parameterized by an explicit, complete table (every value concrete) — not a placeholder. Every component task ships full code.

**3. Type consistency:** `NAV_GROUPS`/`NavGroup`/`NavItem` defined in Task 2 `nav.ts`, consumed by name in sidebar (Task 2) and topbar (Task 3). `ROUTE_LABELS` keys match the new route paths from Task 1. New `createFileRoute` ids match the moved file locations.

**Pre-flight checks for the executor:** before overwriting, read the current `sidebar.tsx`/`topbar.tsx`/`offline-banner.tsx` and the `auth.store` to confirm (a) the `useAuthStore` access pattern (selector vs destructure), (b) the exact logout behavior to preserve, (c) `offline-banner`'s import/export shape. Adapt the provided code to match if it differs — behavior must be preserved, only structure/styling changes.
