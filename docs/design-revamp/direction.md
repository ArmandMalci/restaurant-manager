# Design Revamp — Product Interview & Direction

> Working document. Captures the per-screen product interview that precedes the
> design + implementation plan. Started 2026-06-23.

## Frame (locked 2026-06-23)

| Dimension | Decision |
|-----------|----------|
| **Primary user** | Floor staff / waiters — optimize their workflow first |
| **Devices** (dominant →) | Tablet (floor + host stand) → Phone (pocket) → Desktop (back office) → Big screen (kitchen/pass) |
| **Aesthetic** | **Clean dense productivity** — Notion / Airtable / Linear-light. Calm surfaces, high data density, quiet chrome. Explicitly NOT bright-POS, NOT soft-native, NOT the current empty template. |
| **Ambition** | **Reimagine the product** — question what each screen does, add real features, change IA where it helps |

### Cross-cutting implications
- **Density is a feature.** Kill the empty-void layouts. Screens must feel full and useful at every breakpoint.
- **Tablet-first, thumb-reachable.** Every screen must work held in two hands (tablet) and one-handed (phone); desktop is the back-office wide view.
- **Orders needs a kitchen big-screen / KDS variant** — glanceable from a distance.
- **Home should likely serve a waiter, not a manager** (to confirm in Dashboard interview).
- **One consistent primary-action treatment** — fix the orange/black CTA split observed live.

---

## Per-screen interview

For each screen: **Purpose** · **Primary user & device** · **The one job** · **Key actions** · **What's missing** · **Open questions / decisions**.

Screens (interview order): Dashboard → Tables → Orders → Menu → Reservations → Calendar → Staff → Inventory → Reports → Billing → Settings → Notifications → Login.

### 1. Dashboard / Home → reframe as **"Service" — live floor home**
- **Purpose:** Drop the waiter straight onto their floor and the live pulse of service. NOT a manager KPI page.
- **Primary user & device:** Floor staff, shared floor tablet/phone. (Manager oversight lives in Reports — no role-aware login; see §7.)
- **The one job:** Show how service is going *right now*, whole-floor by default.
- **Key content:** the floor's tables + live order state (fired / ready-to-run / waiting); service pace (covers seated, tables turning, kitchen load); real-time attention/alerts ("Table 6 waiting 12 min", "3 orders ready to run", "late reservation") that jump into the relevant screen.
- **Filters:** optional **section / server filter** (whole-floor default — not auth-derived, per §7 resolution).
- **What's missing today:** real-time alerts; section filter. Current KPI tiles + duplicated table grid = wrong content.
- **Decided:** Service **replaces** `/dashboard`. Distinct from Floor (§2): Service = live pulse + attention queue; Floor = spatial map + per-table actions. **Open:** alert thresholds (waiting-time) — defer to §12.

### 2. Tables → **Spatial floor map + per-table action hub**
- **Purpose:** A map of the actual dining room; the spatial counterpart to the Service home.
- **Distinct from Service home:** Service = live pulse/alerts by section; Tables = where everyone physically is + act on a specific table.
- **Layout:** Toggle **map ↔ grid/list**. Map = real room layout (shapes/positions) for seating decisions; grid/list = dense status scan during the rush (list best on phone). Kills today's oversized double-encoded cards.
- **Tap a table → action sheet:** start/open an order · see current order + running bill · change status (seat / occupied / needs cleaning / available) · assign server / move party between tables.
- **NEW capabilities / data implications:** spatial map needs per-table x/y layout + shape data (new model fields + a layout editor); "move party" / "assign server" need order↔table↔server relationships. **Flag for architect.**
- **Open questions:** Where is the room layout built (Settings, or an edit mode here)? Table shapes/sizes vs. just positioned tiles? Merged/multi-table parties?

### 3. Orders → **split into (a) Order flow (waiter) + (b) Kitchen Display (KDS)**
- **Decision:** Stop forcing one kanban to serve both. Two screens/modes.
- **(a) Order flow — waiter, tablet/phone:** POS-style entry — browse/search the menu, tap to add, set **qty + modifiers** (no onions, allergies, options), fire. Then track items as they progress (fired → ready → run). Reachable from a table's action sheet (§2) and standalone.
- **(b) Kitchen Display (KDS) — big-screen, glanceable:** **read-only display**; tickets **age/color by wait time** (oldest first); **routed by station** (grill / cold / bar / pass), each station sees only its items.
- **NEW capabilities / data implications:** **menu item modifiers/options** (new model — ties to §4); **station routing** (item → station mapping); KDS is its own route/layout. **Flag for architect.**
- **Open question (workflow gap):** KDS is read-only with no bump — **who marks an item ready** and how does the waiter learn to run it? (Waiter device / auto by station / manager?) Resolve before build.
- Kills today's clipped 5th column, truncated names, and noisy per-line dropdowns.

### 4. Menu → **catalog management + in-service 86 toggle (clearly separated)**
- **Purpose:** Two modes — back-office catalog editing (manager/desktop) and a fast in-service availability toggle (waiter/tablet).
- **Item carries:** name, price, description, category + **modifiers & options** (no onions, allergies, doneness, size/variant pricing) + **station routing** (→ KDS §3) + **photo**.
- **Availability / 86:** **manual one-tap toggle** during service **+ auto-86 when inventory stock hits zero** (§8). 86'd items vanish from order entry (§3).
- **NEW data/infra implications:** modifier/option model; item→station mapping; **image upload + storage** (new infra — flag for architect); **menu-item ↔ inventory linkage** for auto-86.
- **Open questions:** Modifier groups reusable across items or per-item? Variant pricing (size→price)? Dietary/allergen tags skipped — confirm modifiers cover allergies or add later.

### 5. Reservations → **today-focused door tool, fused with the floor map**
- **Purpose:** Default to today's live door flow (arrivals, seating, walk-ins); future bookings accessible but secondary.
- **Primary user & device:** Host / waiter, tablet at the host stand (phone for quick checks).
- **Key actions:** **seat a party → assign a table on the floor map (§2)**; **walk-ins & waitlist** (add walk-in, quote wait, manage queue); **guest notes & history** (allergies, occasion, VIP, past visits).
- **View model:** **linked to the floor map** — reservations shown against actual tables/timeslots, not a flat list. Kills today's empty-table layout.
- **NEW capabilities:** **walk-in + waitlist** (new model: waitlist entries, quoted wait); **guest/customer profile** (history across visits, VIP flag, notes — new entity); reservation↔table seating link. **Flag for architect.**
- **Open questions:** No-show/cancellation tracking not prioritized — confirm still needed. Notify waitlisted guests when ready? (defer). Future-bookings UI defined later.

### 6. Calendar → **unified time view (shifts + reservations + events), manager-facing**
- **Purpose:** One calendar overlaying **staff shifts + reservations + events** across day/week. The manager's time-planning + "who's on" lens.
- **Primary user & device:** Manager, desktop/back-office (tablet secondary). NOT staff self-service.
- **Main job:** **see who's on now / next** + coverage gaps; secondary: plan around bookings/events.
- **Scheduling:** **manager-only** — manager builds the rota; staff don't set availability or swap in-app (v1).
- **Relationship:** Reservations (§5) = live door (today, actionable); Calendar = bird's-eye across time (reservations shown read-mostly). "Who's on" feeds Service home (§1) and Staff (§7).
- **Open questions:** Are "events" a real entity (private dining, closures)? Where does rota-building live — here vs. Staff (§7)? Resolve §6/§7 split.

### 7. Staff → **ELIMINATED as standalone; fold into Settings (people admin) + Calendar (rota)**
- **Decision:** No standalone Staff screen in the nav. People management → Settings; shift visualization → Calendar (§6).
- **Staff record carries:** **role & permissions**, **section/station assignment** (drives §1 section filter + §3 KDS routing), **contact & status**. (No performance/sales stats v1.)
- **Identity model:** **manager-only login; staff are records, not app users.** No individual staff auth, no PIN/pick-who-you-are.
- **⚠️ Conflict — RESOLVED:** framing said "waiter-first / my section / per-server", but staff don't log in. Resolution: **single shared login on the floor device; whole-floor view by default; section/server is an optional filter, not auth-derived.** No per-individual personalization. ⟹ the "role-aware home" idea (§1) is **dropped** — one app; service vs. oversight is *which screen*, not *who*. "Waiter-first" = the floor device's primary tasks are waiter tasks under the shared login.

### 8. Inventory → **ingredient + item stock with cost/usage (COGS); lean manager UI**
- **Purpose:** Track stock at **both levels — ingredients/supplies AND menu-item counts** — with **cost & usage tracking (COGS)** as the headline job.
- **Primary user & device:** Manager, desktop/back-office. "Keep it simple" — lean UI, no supplier/PO gold-plating v1.
- **Drives:** **auto-86** (§4) when stock hits zero (item-level directly; ingredient-level needs recipe mapping).
- **⚠️ Scope tension:** "both levels + COGS" is the *most complex* option, but "keep it simple" was also chosen. Needs a **recipe/BOM model** (item → ingredients + unit costs + depletion). Reconcile at synthesis: rich model behind a lean UI, or trim to item-level for v1? **Flag for architect.**
- **Open questions:** Recipe mapping per item (BOM)? Unit costs + supplier prices? Usage = auto-decrement on order fired, or manual counts? COGS reporting depth?

### 9. Reports → **simple daily service recap (sales & covers), glance-only**
- **Purpose:** The manager's end-of-day read: **sales, covers, average check, vs. yesterday/target.** Deliberately lean.
- **Primary user & device:** Manager, desktop (tablet glance OK).
- **Metrics (v1):** **sales & covers** focus. NOT top/bottom items, labor, or food-cost margin in v1 (kept out deliberately).
- **Consumption:** **glance on screen** — clean dense recap. No export, scheduled summaries, or drill-down v1.
- **Relationship:** absorbs the "business numbers" the old dashboard tried to show; COGS stays in Inventory (§8), not surfaced here v1.
- **Open questions:** Time range (today / shift / pick date)? "vs target" implies a target-setting input — where? Add item-performance later?

### 10. Billing → **rename to "Checkout" — settle table bills (record-only)**
- **Purpose:** A **service screen** to settle a table's bill. NOT SaaS subscription (that meaning is dropped).
- **Primary user & device:** Waiter, tablet/phone — part of the live service flow.
- **Supports:** **split the bill** (by item / guest / evenly) + **receipt** (print/email). NO tips/gratuity, NO multiple payment methods v1 (kept lean).
- **Payments:** **record-only** — mark paid + method; actual money via external terminal/POS. **No payment processor, no PCI scope.**
- **Relationship:** pulls the running bill from a table's order (§2/§3); closing it frees the table; closed checkouts feed daily totals in Reports (§9).
- **Rename in nav:** "Billing" → "Checkout".
- **Open questions:** Does closing checkout auto-set the table to needs-cleaning/available? Confirm Reports sales total = sum of closed checkouts.

### 11. Settings → **back-office config hub (hybrid IA)**
- **Purpose:** The manager's configuration center. Contains: **restaurant profile**, **people/staff admin** (folded from §7), **floor & sections setup** (sections + table layout/map for §2 + kitchen stations for §3), **menu structure/modifiers**.
- **Config IA: hybrid** — global/rare config in Settings; screen-specific config in-context (table layout editable in Tables, modifiers in Menu). Settings holds canonical forms; screens offer quick edit entry points.
- **Primary user & device:** Manager, desktop. Manager-gated.
- **Theming: KEEP multiple themes** (default + monokai + gruvbox + room for more). ⟹ **Reframe:** themes are NOT the cause of "generic" — the *design language* is. Each theme must be a deliberate, crafted identity (esp. the **default**, currently a shadcn starter); themes swap palette only, never the density/hierarchy/component quality. "Clean dense productivity" must hold in every theme.
- **Open questions:** Floor-layout editor here vs. edit-mode in Tables (hybrid → likely Tables, registered in Settings)? Per-theme tuning or palette-only? Notification prefs here (→ §12)?

### 12. Notifications → **operational alert system (engine behind §1)**
- **Purpose:** Live operational alerts; the **source feeding §1's attention queue.** Surfaced via **header bell + feed** (a dropdown/panel, likely no heavy full page).
- **Primary user & device:** Floor/kitchen on the shared tablet/phone/big-screen.
- **Delivery (all):** in-app feed + bell · **web-push** (dep present) · on-screen toasts · **sound + unread badge** (noisy floor/kitchen).
- **Triggers (all):** order **ready to run** · table **waiting too long** (threshold) · reservation **arriving / late / no-show** · **low stock / item 86'd** (§8/§4).
- **NEW capabilities:** alert **rules/triggers engine** + **configurable thresholds** (waiting-time, low-stock par) set in Settings (§11); push subscription mgmt. **Flag for architect.**
- **Open questions:** Per-channel routing (which events → push vs toast vs sound)? Inline ack/dismiss + "run it" actions? Who hears sound on a shared device? Mark-read semantics.

### 13. Login → **distinctive-but-quick; long-lived session on the floor device**
- **Purpose:** First impression + identity anchor, but frictionless. Memorable, on-brand, fast.
- **Session:** **stay logged in (long session)** — the shared floor device persists across shifts; rare re-auth.
- **Device:** Tablet primarily; the brand canvas at any size.
- **Security note:** long-lived session on a *shared* device → consider a lightweight **manager-only gate** for destructive/back-office actions (voids, refunds, settings, people).
- **Open questions:** "Remember this device" explicit toggle? Real brand mark to replace the crossed-fork-in-orange-square placeholder?

---

## Synthesis (2026-06-23)

### A. Reimagined information architecture
From 13 flat nav items → grouped by who/when:

**Live service (shared floor device — tablet/phone, the default surface):**
- **Service** (was Dashboard) — live floor pulse + attention queue; whole-floor default, section filter.
- **Floor** (was Tables) — spatial map ↔ grid; per-table action hub.
- **Order** (new, from Orders split) — POS-style entry + tracking.
- **Door** (was Reservations) — today's arrivals, seat onto floor, walk-ins/waitlist, guest history.
- **Checkout** (was Billing) — settle/split bill, receipt, record-only.

**Kitchen (big-screen):**
- **KDS** (new, from Orders split) — glanceable, station-routed, aging, read-only.

**Back office (manager, desktop):**
- **Menu** · **Inventory** · **Reports** · **Calendar** · **Settings** (absorbs Staff).

**System:** Login · Notifications = bell + feed (not a standalone page).

Net changes: **Staff removed** (→ Settings + Calendar) · **Orders split** (Order + KDS) · **Billing → Checkout** · **Notifications → bell/feed** · **Dashboard → Service**. Nav likely two zones (Service / Back office).

### B. Cross-cutting design language — "clean dense productivity"
- **Density is the headline.** Replace oversized cards + empty voids with compact, information-rich layouts that fill the viewport at every breakpoint (Linear / Notion / Airtable feel).
- **Tablet-first responsive system:** design at tablet (primary) → scale up to desktop (wider, multi-column) and down to phone (single column, big tap targets) → plus a **big-screen KDS** mode.
- **Real surface & hierarchy:** defined elevation/borders, proper input fields (kill borderless gray fills), clear type scale; hierarchy from structure, not font size alone.
- **One consistent primary-action treatment** — fix the orange/black CTA split; enforce one accent CTA per screen.
- **Themes = palette only.** Keep default/monokai/gruvbox; each becomes a *crafted* identity; density/components/hierarchy never change between themes. The **default theme** gets a real identity (stop looking like a starter).

### C. New capabilities & data-model implications (⚠️ for architect)
"Reimagine the product" surfaced substantial NEW backend/data work beyond visual design:
1. **Floor map:** per-table x/y + shape; layout editor.
2. **Order entry:** menu-item **modifiers/options** model; item→**station** mapping.
3. **KDS:** station routing; ticket aging; **open workflow gap — who marks "ready"** (KDS chosen read-only).
4. **Door:** **walk-in + waitlist** model; **guest/customer profile** entity (history, VIP, notes); reservation↔table seating.
5. **Menu:** **image upload + storage** infra; **menu↔inventory link** for auto-86.
6. **Inventory:** **recipe/BOM** model (ingredients + items), unit cost, usage/COGS.
7. **Checkout:** bill splitting; record-only payment + receipt; table auto-clear on close.
8. **Notifications:** **alert rules/triggers engine** + configurable thresholds; web-push subscription mgmt.
9. **Identity/session:** single shared login; whole-floor default + section filter; long session; optional manager-gate for destructive actions.

### D. Honest scope reality — two tracks
- **Track 1 — Design/UX revamp (works with today's data):** new IA, density, identity, tablet-first responsive system, component library, theming quality, per-screen layout redesign, CTA consistency, kill empty voids. **Directly fixes "generic + lacking"; little/no backend.**
- **Track 2 — New product capabilities (§C):** net-new features; each its own spec → plan → build.

**Scope tension to resolve:** Inventory (both-levels + COGS) vs "keep it simple" → recommend item-level + manual 86 for v1, defer ingredient BOM/COGS.

### E. Recommended path
1. **Now:** finalize this direction → build the **design system + IA + per-screen layouts (Track 1)** on current data, with placeholders/hooks for Track 2.
2. **Then:** sequence Track 2 by service value: Order + KDS (modifiers/stations) → Floor map → Door (waitlist/guest) → Checkout → Inventory/COGS → Alert engine.
3. Each Track 2 feature gets its own brainstorm → spec → plan.

---

## Decisions locked (2026-06-23)

### Visual direction — "Warm canvas" is the default identity
Chosen from a 3-way mockup comparison (Midnight / Warm canvas / High-contrast). Mockups in `docs/design-revamp/mockups/`.
- **Default theme = Warm canvas** (light, warm, hospitality-grade, serif accents). Concrete starting tokens:
  - Page canvas `#F3ECE1`; sidebar `#EDE4D6`; panels/cards `#FBF7F0`; warm hairline borders `#E4D8C7`.
  - Ink text `#2A2521` + warm muted secondary; accent **terracotta `#C2562F`** (hover/active `#A6431F`).
  - Type: **Fraunces** (serif) for screen titles + metric numerals; **Inter** for all UI text. Two weights.
  - Status: Open=green · In service=blue · Waiting=amber · Needs you/alert=red · Reservation=blue.
- **Absorb from the other directions (not optional):**
  - **High-contrast triage** — colored status bars/chips on attention rows + floor dots so the floor reads in <1s. Functional requirement, applied within the warm palette.
  - **Two-column dense layout** (attention queue + floor side-by-side) on tablet/desktop; stack on phone.
- **Theme strategy:** Warm canvas = default light. **Midnight = the dark theme** (ideal for KDS big-screen + low-glare floor). Existing monokai/gruvbox retained but retuned to the new design language later (open). Themes swap palette only — density/hierarchy/components are constant.

### Roadmap — locked sequence
**Track 1 (design revamp, current data):**
1. **Foundation** — design system (tokens, type, status system, nav shell, cards, list rows, buttons, inputs) + new IA/nav (Service · Floor · Order · Door · Checkout | KDS | Menu · Inventory · Reports · Calendar · Settings; Notifications = bell/feed; Staff folded away). Resolve the **reservations-in-three-places** overlap (Service alert / Door / Calendar) — one source of truth, three lenses.
2. **Reskin all current screens** to the system → responsive (tablet-first, phone, desktop), kill empty voids, enforce one-accent-CTA. *Resolves "generic + lacking" for today's feature set.*
3. **Service home** + **alert engine MVP** (makes the new landing real).

**Track 2 (new capabilities, each its own brainstorm → spec → plan), in priority order:**
4. **Order + KDS** (#1) — modifiers + station routing + KDS. ⚠️ resolve "who marks ready" first.
5. **Floor map** (#2) — table x/y layout + seating + per-table action hub.
6. **Checkout** — split bill, receipt, record-only, table-close loop.
7. **Inventory COGS** (recipe/BOM + auto-86), then **Door** (waitlist + guest profiles) last.

### Immediate next step
Write the **Track 1 implementation plan** (steps 1–3) via the writing-plans flow.
