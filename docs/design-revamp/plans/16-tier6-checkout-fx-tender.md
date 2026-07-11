# Plan 16 — Tier 6: Checkout Multi-Currency Cash Tender Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan
> task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
> Part of [Plan 13 — QA Backlog Roadmap](13-qa-backlog-roadmap.md), Tier 6. Decision **D7** (locked 2026-07-11): full
> multi-currency FX tender, not a single-currency change calculator — enter cash across multiple currencies (e.g. 20
> EUR + 20 GBP toward a 35 EUR bill), convert via a configurable rate, compute change.

**Goal:** Let a cashier record cash tendered in one or more currencies against a bill, converting each via a
configurable exchange rate, and see change due — without changing what's persisted as the settlement `amount`
(still the bill-currency equivalent, preserving Plan 12's D1 single-settlement model).

**⚠️ Prerequisite:** Task 1 adds a Prisma migration. Same Tier 0 blocker as every other schema change in this
roadmap (`prisma migrate dev` refuses to proceed while the pre-existing `20260626000001_add_order_item_modifiers`
checksum drift exists) — confirm the `prisma migrate reset` has run this session (or run it now, confirming with
Armand first) before Task 1's migration step.

**Tech Stack:** NestJS + Prisma (`apps/api/src/settings`, `apps/api/src/billing`), React + `apps/web/src/routes/_app/
checkout/` (`-split-row.tsx`, `-split-panel.tsx`, `-split-math.ts` — already has a clean, tested, cents-rounding
pattern in `evenShares()`/`byItemShares()` to follow for the FX math).

## Global Constraints

- Semantic Tailwind tokens only; touch targets ≥44px on coarse pointer.
- Never hand-edit `apps/web/src/api/**` — regenerate via Orval after any DTO/schema change.
- Every changed endpoint needs complete Swagger decorators.
- Run `pnpm typecheck` + affected tests before marking any task done.

---

### Task 1: Currency + exchange-rate config

**Files:**
- Modify: `prisma/schema.prisma` — `RestaurantSettings` (294-305) gains `baseCurrency String @default("EUR")` and
  `exchangeRates Json @default("{}")` (a map of ISO currency code → rate-to-base, e.g. `{"GBP": 1.17, "USD": 1.08}`;
  the base currency's own rate is implicitly `1` and not stored). A JSON column, not a new `CurrencyRate` model or
  rate-history table — no audit/history requirement was asked for, and a manager editing a flat rate table in
  Settings is the actual use case (add a proper history/audit model later only if that's ever actually needed).
- Modify: `packages/shared/src/schemas/settings.ts` — add `baseCurrency`/`exchangeRates` to `RestaurantSettingsSchema`
  and `UpdateSettingsSchema`.
- Modify: `apps/api/src/settings/` controller/service/DTOs — expose the new fields with Swagger decorators.
- Modify: `apps/web/src/routes/_app/settings/index.tsx` — add a small "Currency" section: base currency selector +
  an editable rate table (code + rate, add/remove rows) using shadcn `Select`/`Input` (not native `<select>`,
  consistent with Plan 14 Task 5's direction even though that plan doesn't touch this file).
- Regenerate: `pnpm --filter @restaurant/web gen:api` + biome format on `src/api`.

**Why this shape:** no currency field exists anywhere in the schema today (confirmed: `Bill`, `Payment`,
`RestaurantSettings` all lack one); money is implicitly a single hardcoded `$` app-wide. This task adds only what
Task 3's tender math needs — a base currency and a rate table — not a full multi-currency menu/pricing overhaul
(out of scope, see Self-review notes).

- [ ] **Step 1:** Add `baseCurrency`/`exchangeRates` to `RestaurantSettings` in `prisma/schema.prisma`.
- [ ] **Step 2:** Confirm the Tier 0 `prisma migrate reset` has run this session (or run it now, confirming with
  Armand first), then `pnpm prisma migrate dev --name add_restaurant_currency_config`, then `pnpm prisma generate`.
- [ ] **Step 3:** Update the shared Zod schema, API DTOs/Swagger decorators, regenerate the Orval client.
- [ ] **Step 4:** Add the Currency section to the Settings screen.
- [ ] **Step 5:** `pnpm --filter @restaurant/api typecheck` + `pnpm --filter @restaurant/web typecheck` + affected
  tests.
- [ ] **Step 6:** Verify in-browser: a manager can set a base currency and add/edit exchange rates in Settings, and
  they persist.
- [ ] **Step 7:** Commit: `feat(api,web): restaurant base currency + exchange rate config`.

---

### Task 2: FX tender math (pure functions)

**Files:**
- Modify: `apps/web/src/routes/_app/checkout/-split-math.ts` — add pure functions alongside the existing
  `evenShares`/`byItemShares`:
  - `convertToBase(amount: number, currencyCode: string, rates: Record<string, number>): number` — converts a
    tendered amount in `currencyCode` to the bill's base currency, using `rates[currencyCode]` (or `1` if
    `currencyCode === baseCurrency`).
  - `computeChange(billTotal: number, tenders: Array<{ amount: number; currencyCode: string }>, baseCurrency: string,
    rates: Record<string, number>): number` — sums each tender converted to base (via `convertToBase`), subtracts
    `billTotal`, rounds to 2 decimals (cents), matching the existing `Math.round(x * 100) / 100` convention already
    used in this file. Negative result means still owed, not change due — surface that distinction in the UI
    (Task 3), not by throwing here.
- Modify: `apps/web/src/routes/_app/checkout/-split-math.spec.ts` — add tests: single-currency tender (sanity check
  against the existing behavior), multi-currency tender matching Armand's own example (20 EUR + 20 GBP @ 1 GBP =
  1.17 EUR toward a 35 EUR bill → 43.40 EUR equivalent → 8.40 EUR change), a same-currency-as-base tender (rate is
  implicitly 1, not looked up in the map), and an under-tendered case (negative change / still-owed).

**Why this shape:** keeping the FX math in `-split-math.ts` alongside the existing split math preserves this file's
"pure, side-effect-free, cheap to unit test" property (its own doc comment) rather than burying rounding-sensitive
money math inside a component.

- [ ] **Step 1:** Implement `convertToBase` and `computeChange` in `-split-math.ts`.
- [ ] **Step 2:** Write the test cases above in `-split-math.spec.ts`, including Armand's own worked example as a
  named test case.
- [ ] **Step 3:** `pnpm --filter @restaurant/web test -- split-math` — must pass, including the worked example
  producing exactly 8.40 change.
- [ ] **Step 4:** `pnpm --filter @restaurant/web typecheck`.
- [ ] **Step 5:** Commit: `feat(web): FX tender math (convertToBase, computeChange)`.

---

### Task 3: FX tender UI in checkout

**Files:**
- Modify: `apps/web/src/routes/_app/checkout/-split-row.tsx` — today, "Record payment" sends `{ amount: remaining,
  method }` where `amount` is the bill amount owed, with no tendered/change concept at all (confirmed in research).
  When `method === Method.cash`, add a small tender sub-form: one or more `{ currencyCode, amount }` rows (default
  one row pre-filled with the bill's base currency and the exact amount owed, so the common single-currency
  exact-payment case needs zero extra input), a "+ add currency" control for multi-currency tenders, and a
  live-computed change-due display (using Task 2's `computeChange`) before the cashier hits Record.
- Modify: `apps/web/src/routes/_app/checkout/-split-panel.tsx` — thread the restaurant's `baseCurrency`/
  `exchangeRates` (from the settings query already used elsewhere in this app — reuse it, don't add a second fetch)
  down into `SplitRow`; on record, still send only `{ amount: <owed amount, unchanged>, method: 'cash' }` to
  `recordPayment` — **the tendered breakdown and computed change are cashier-facing only, not persisted** (D1's
  settlement model already records the bill-currency amount owed; storing a tendered/change audit trail wasn't
  asked for — add it later only if reconciliation actually needs it).
- Modify: `apps/web/src/routes/_app/checkout/-receipt-block.tsx` — if a cash payment had a tender/change, show it on
  the receipt (tendered breakdown + change due) for the guest's/cashier's own record — check what this file already
  renders before adding a new section, match its existing layout conventions.

**Why this shape:** `recordPayment` (`billing.service.ts`) is unchanged — it already accepts exactly what the
settlement model needs (`amount`, `method`); this task only adds a client-side calculator in front of that same
call, matching the actual ask ("a helping feature where it lets the user enter the amount of cash... and
automatically calculates the change").

- [ ] **Step 1:** Add the tender sub-form to `SplitRow` (shown only for `method === 'cash'`), defaulting to one row
  in the base currency for the exact amount owed.
- [ ] **Step 2:** Add "+ add currency" to append additional `{ currencyCode, amount }` rows, each currency picked
  from a shadcn `Select` populated from the configured `exchangeRates` keys plus the base currency.
  Wire live change-due display via Task 2's `computeChange`.
- [ ] **Step 3:** Thread `baseCurrency`/`exchangeRates` from Settings into `SplitPanel` → `SplitRow`.
- [ ] **Step 4:** Add the tendered breakdown + change due to the receipt block for cash payments that used it.
- [ ] **Step 5:** `pnpm --filter @restaurant/web typecheck` + affected tests.
- [ ] **Step 6:** Verify in-browser: recording a cash payment with a single currency at the exact amount needs no
  extra input (unchanged UX for the common case); adding a second currency row computes and displays the correct
  change using the worked example from Task 2; the receipt shows the tender breakdown when one was used.
- [ ] **Step 7:** Commit: `feat(web): multi-currency cash tender UI in checkout`.

---

## Self-review notes

- **Spec coverage:** all three of D7's pieces (currency/rate config, FX tender UI, rounding rule) map to Tasks 1-3.
  Complete.
- **Explicitly out of scope:** the app-wide hardcoded `$` symbol (menu, order, floor, checkout all hardcode it,
  confirmed via research — zero `Intl.NumberFormat` usage anywhere) is **not** fixed here. This plan only adds
  currency *config* and a *tender calculator* for checkout; making every money display respect `baseCurrency` is a
  much larger, separate cleanup — flag it as a follow-up if Armand wants it, don't fold it into this plan's scope.
- **Rounding rule:** change is computed and shown in the bill's base currency, rounded to 2 decimals (standard
  cents), following this file's existing rounding convention. No physical-denomination rounding (e.g. "nearest
  5 cents because coins ran out") was asked for — add that only if a real venue's cash drawer needs it.
