# Restaurant Manager — Product Review

**Date:** 2026-07-10  **Scope:** all 12 real application screens, reviewed on tablet (768×1024) and phone (390×844).
**Lens (as requested):** Design & UX polish (primary) + Product completeness (secondary).
**Evidence:** 24 screenshots in [`screenshots/`](screenshots/) · full per-screen detail in [PRODUCT-REVIEW-appendix.md](PRODUCT-REVIEW-appendix.md).

---

## 1. Executive summary

This revamp has **real taste**. The warm-canvas theme, the Fraunces serif display type, the KPI/editorial layouts, and — on most screens — strict semantic-token discipline put it well clear of generic "AI-slop" admin UI. On a tablet, Service, Floor (map view), Menu, KDS and Settings genuinely read as a premium, intentional product.

But the review surfaced **108 findings (9 critical, 32 high, 35 medium, 27 low)**, and they cluster into a clear story: **the app looks finished but isn't shift-ready, and it violates its own two headline mandates — "tablet/touch-first" and "semantic tokens only" — in ways that are systemic rather than cosmetic.** Three root causes below account for roughly half the findings, and one checkout issue is a genuine money-correctness risk.

**Verdict:** strong visual foundation, **not yet operationally usable for a live service**. The good news is the highest-impact fix is a shared-component change that clears a defect class across nine screens at once.

> **Honest caveats on method.** (1) Demo data was seeded weeks ago, so elapsed-time values render as e.g. "7734m" — judge the *formatting*, not the number. I refreshed reservations to today so Door/Calendar populate. (2) The checkout screenshots captured only the queue/list state (the auto-select didn't open the split panel), so checkout's settlement UI was assessed from source, not pixels. (3) The cross-screen "journey" agent didn't finish within the run window; §5's flow analysis is my own synthesis from the per-screen completeness findings + the routing map.

---

## 2. How this was produced

- **Capture:** a headless Playwright script logged in as the seed admin and shot every canonical screen at two viewports → 24 PNGs, 0 console errors. Deterministic and re-runnable (zero model cost).
- **Review:** a 13-agent workflow — one **Sonnet** reviewer per screen, each reading its tablet+phone shot **and** the route source against `docs/PRODUCT.md`, emitting structured findings; **Opus** (this session) reserved only for this synthesis. (Model split per your "don't burn Opus on mechanical work" instruction.)
- **Free IA finding:** 7 of the ~20 routes are **redirect stubs** — `tables→/floor`, `orders→/order`, `reservations→/door`, `dashboard→/service`, `staff→/settings`, `billing→/checkout`, `notifications→/service`. The real surface is the 12 screens below. That redirect layer is a reasonable transitional shim, but it means several old nav labels now point somewhere else — worth an explicit IA pass before launch.

---

## 3. The scoreboard

| # | Screen | One-line verdict | 🔴 | 🟠 | 🟡 | ⚪ |
|---|--------|------------------|----|----|----|----|
| 01 | [Login](screenshots/01-login-tablet.png) | Crafted, but card floats at top and inputs are 32px | 1 | 1 | 3 | 1 |
| 02 | [Service](screenshots/02-service-tablet.png) | Best-structured screen; inert floor tiles + tiny "Run" | 0 | 3 | 2 | 4 |
| 03 | [Floor](screenshots/03-floor-tablet.png) | Great idea on tablet; **phone header broken**, hardcoded colors | 1 | 4 | 5 | 1 |
| 04 | [Order](screenshots/04-order-tablet.png) | Clean POS, but **always starts blank**, no fire-failure handling | 1 | 3 | 3 | 2 |
| 05 | [KDS](screenshots/05-kds-tablet.png) | Real domain UX; tablet more cramped than phone, one bump freezes board | 0 | 3 | 5 | 3 |
| 06 | [Door](screenshots/06-door-tablet.png) | Pretty but does too little; **guest name vanishes on phone** | 1 | 3 | 3 | 1 |
| 07 | [Checkout](screenshots/07-checkout-tablet.png) | **Two contradictory settlement UIs; no `paid` status** (money risk) | 1 | 3 | 2 | 2 |
| 08 | [Menu](screenshots/08-menu-tablet.png) | Most resolved screen; **category actions unreachable by touch** | 1 | 2 | 2 | 3 |
| 09 | [Inventory](screenshots/09-inventory-tablet.png) | Calm & premium on tablet; **table clipped off-screen on phone** | 1 | 2 | 3 | 3 |
| 10 | [Reports](screenshots/10-reports-tablet.png) | Bespoke feel; **date filter is a no-op**, 2 tiles unreadable | 1 | 2 | 3 | 2 |
| 11 | [Calendar](screenshots/11-calendar-tablet.png) | Themed library, not a product; **display-only, shifts unbuilt** | 1 | 4 | 1 | 2 |
| 12 | [Settings](screenshots/12-settings-tablet.png) | Tidy, but thinner than it looks; saved info unused downstream | 0 | 2 | 3 | 3 |

---

## 4. Three systemic root causes (fix these first — highest leverage)

### S1 — Touch targets are desktop-sized across the whole app 🔴 *(systemic)*
The shared primitives are built for a mouse: `input.tsx` defaults to `h-8` (32px), `button.tsx size="sm"` to `h-7` (28px), `select` to `h-7`. Every dense screen inherits this, so **nine screens independently flagged controls at ~26–32px against the stated 44px tablet minimum** — Login inputs, Service "Run", Order steppers/trash, Inventory edit/delete, Reports header controls, Checkout settle/cancel, Menu item actions, Settings' entire form, Calendar toolbar. This is the single biggest gap between "looks tablet-first" and "is tablet-first."
**Fix (highest ROI in the review):** introduce a tablet-scale default (or bump the base heights + hit-area padding) in `input.tsx` / `button.tsx` / `select.tsx`. One change clears a defect class across ~9 screens.

### S2 — Layouts were built desktop-first and break below `lg`/`sm` 🟠 *(systemic)*
Despite the "mobile/tablet-first" mandate, the responsive story falls apart on small viewports on six screens: **Login** card pins to the top over a huge void (grid stretch never triggers on the flex path); **Floor** phone header overlaps the H1 with the view toggle ("Floo⃥r"); **Inventory** table clips Status/Actions off-screen with no scroll; **Door** drops the guest name/subtitle entirely on phone; **Calendar** keeps all 7 crushed day columns; **KDS** tablet is *more* cramped than phone. These need per-screen responsive passes (stack headers, `overflow-x-auto` or card-collapse for tables, single-column reflow).

### S3 — Controls that look functional but do nothing 🟠 *(systemic, trust-eroding)*
Several affordances signal interactivity they don't have: **Reports** date-range `Select` is wired to nothing (`getSummary()` called with no args); **Service** floor mini-grid tiles and **Reports/Calendar** are styled like buttons but are inert `<div>`s; **Calendar** is entirely display-only. On a tool staff must trust mid-shift, a control that lies is worse than an absent one. Either wire them or remove the chrome until the backend exists.

---

## 5. The one that isn't cosmetic — Checkout settlement model 🔴

This is the finding I'd block a launch on. In `checkout/index.tsx` a billed order simultaneously renders **`BillResult`'s full "Mark as Paid" button** *and* the **`SplitPanel`'s split-into-N per-split "Record payment"** flow — two different settlement models on the same bill, and "Mark as Paid" doesn't reconcile against the splits. Compounding it: the Prisma `OrderStatus` enum (`draft|sent|in_progress|ready|served`) has **no terminal `paid`/`closed` state**, so a settled table never leaves the checkout queue and can be paid twice. This is money + state-machine correctness, not polish — pick one canonical settlement path and add a terminal order status. (Recommend a pass from the `restaurant-domain-judge` before implementing.)

---

## 6. Prioritized fix list

| P | Fix | Screens | Type | Leverage |
|---|-----|---------|------|----------|
| 1 | Add terminal `paid` status + make checkout settlement single-model | Checkout | 🔴 money | Correctness |
| 2 | Bump base input/button/select to ≥44px touch size | ~9 screens | 🔴 systemic | 1 change, ~9 screens |
| 3 | Responsive passes: Login, Floor header, Inventory table, Door row, Calendar | 5 screens | 🟠 systemic | Unblocks primary device |
| 4 | Wire or remove no-op controls (Reports date range, inert tiles) | Reports, Service, Calendar | 🟠 trust | Cheap, high trust value |
| 5 | Order builder: load the table's open order (or relabel "New order") | Order | 🟠 flow | Core POS correctness |
| 6 | Menu category actions always-visible (not `group-hover`) | Menu | 🔴 touch | Removes touch dead-end |
| 7 | Floor tile colors → semantic tokens (drop `bg-emerald-*`/`.dark`) | Floor | 🟠 tokens | Design-system compliance |
| 8 | Fix 2 low-contrast Reports status tiles | Reports | 🟠 a11y | Legibility |
| 9 | Replace native `window.confirm` (Inventory) with themed dialog | Inventory | 🟡 system | Consistency |
| 10 | KDS: per-item bump pending state (not one board-wide flag) + undo | KDS | 🟠 flow | Kitchen usability |
| 11 | Door: seat/no-show/walk-in actions + real reservation lifecycle | Door | 🟠 flow | Host can actually work |
| 12 | Order fire: add `onError` feedback | Order | 🟠 resilience | No silent failures |

---

## 7. Design-system report card

**Holding well:** semantic tokens are used faithfully on Menu, Inventory, KDS (Tone system), Service, Settings — no raw hex / `bg-white` / `bg-zinc-*` in those files. The one-primary-CTA rule is mostly respected. Empty/loading states and confirm-before-delete exist on the CRUD screens. Editorial type (Fraunces) is applied consistently. This is a real, coherent system.

**Breaking:** (1) **Floor** hardcodes `bg-emerald-50 dark:bg-emerald-950/40 …` literal palette values *and* uses the `.dark` class the system explicitly retired — the clearest token violation found. (2) **Floor** shows two `bg-accent` controls competing for the single-CTA slot. (3) **Menu**'s primary CTA uses the wrong token/size. (4) The 44px rule (a design-system tenet, not just UX) is broken app-wide via the base components (S1).

---

## 8. What's genuinely good (keep it)

- **Floor map** — pastel status tiles sized by seat count + an action sheet fusing status-cycle with the running bill is a real waiter-first insight.
- **KDS** — dimming out-of-station items instead of hiding them is thoughtful domain UX.
- **Menu** — "86'd" instead of a generic "inactive" badge; proper empty/loading/confirm states. The most product-finished screen.
- **Service** — the KPI strip + "Needs attention" queue is the right home screen for a shift.
- **Token & type discipline** on the back-office screens is the hard part, and it's largely done.

---

## 9. Bottom line

You've nailed the *look* and the design language. What's left is the gap between a themed prototype and an operational tool: **make it usable with a thumb (S1), make it survive a phone/tablet (S2), stop shipping controls that don't work (S3), and make money settle correctly once (§5).** Items 1–6 in §6 are the launch-blockers; everything else is iteration. Fix S1 first — it's the cheapest win with the widest blast radius.

_Full evidence and every finding: [PRODUCT-REVIEW-appendix.md](PRODUCT-REVIEW-appendix.md)._
