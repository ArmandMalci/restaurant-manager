# Plan 21 — Tier 5: /reports Day-by-Day + Revenue Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan
> task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
> Part of [Plan 13 — QA Backlog Roadmap](13-qa-backlog-roadmap.md), Tier 5.
> Design: [docs/superpowers/specs/2026-07-11-reports-day-by-day-design.md](../../superpowers/specs/2026-07-11-reports-day-by-day-design.md).

**Goal:** Add a daily-breakdown endpoint (order count, revenue, reservation count per day) and a frontend
date-range view — reports has never shown a revenue figure at all today. Also close two already-identified small
gaps (low-contrast status tiles, sub-44px header controls).

**Tech Stack:** NestJS + Prisma, React 19 + shadcn.

---

### Task 1: `GET /reports/daily` endpoint

**Files:**
- Modify: `apps/api/src/reports/reports.controller.ts` — new `GET /reports/daily?from=&to=` (both required query
  params, `@ApiQuery` decorated).
- Modify: `apps/api/src/reports/reports.service.ts` — new `getDaily(from, to)`: validate the range (cap at ~92 days,
  400 outside that), then per day in range compute order count, revenue (`sum(Bill.total)` where `paidAt` falls in
  that day and `paid = true`), and reservation count. Prefer a simple per-day loop over `Promise.all` first (the
  capped range keeps this bounded); only reach for a `$queryRaw` date-truncated aggregate if this proves too slow —
  don't build the raw-query version speculatively.
- Modify: `packages/shared/src/schemas/` (or wherever `ReportSummaryDto`-adjacent types live) — add a
  `DailyReportRow`/`DailyReportSchema` type for the new endpoint's response shape, and Swagger decorators.

- [ ] **Step 1:** Add `getDaily(from, to)` to `reports.service.ts` with range validation.
- [ ] **Step 2:** Add the `GET /reports/daily` endpoint with Swagger decorators.
- [ ] **Step 3:** Add the shared schema/type, regenerate the Orval client.
- [ ] **Step 4:** Tests: out-of-range span rejected with 400; revenue sums only `paid` bills within each day's
  boundary (not all bills, not unpaid ones).
- [ ] **Step 5:** `pnpm --filter @restaurant/api typecheck` + commit: `feat(api): add GET /reports/daily endpoint`.

---

### Task 2: Frontend day-by-day view + date-range picker

**Files:**
- Modify: `apps/web/src/routes/_app/reports/index.tsx` — re-add a date-range picker (check for an existing
  date-input pattern elsewhere in this app before introducing a new one; shadcn components, not native
  `<input type=date>` pair, per the systemic direction, unless a native date input is genuinely simpler/equally
  accessible here — use judgment, don't force a component that doesn't fit a single date value well), wired to the
  new `/reports/daily` endpoint; render results as a table (date, orders, revenue, reservations) — not a chart by
  default (see design doc rationale).

- [ ] **Step 1:** Add the date-range picker.
- [ ] **Step 2:** Add the daily-breakdown table, wired to the new endpoint.
- [ ] **Step 3:** `pnpm --filter @restaurant/web typecheck` + a test confirming the picker calls the endpoint with
  the selected range and renders one row per day.
- [ ] **Step 4:** Verify in-browser: selecting a range shows the correct per-day rows including a real revenue
  figure (the app's first).
- [ ] **Step 5:** Commit: `feat(web): day-by-day report view with date-range picker`.

---

### Task 3: Close two already-identified small gaps

**Files:**
- Modify: `apps/web/src/routes/_app/reports/index.tsx` — fix the 2 low-contrast status tiles (Plan 10, T3.3 —
  verify these weren't already fixed; T3.3 is marked done in Plan 10 but re-check against current code since this
  plan is grounded in fresh research, not assumed from the changelog) and the sub-44px header touch targets (Plan
  10, Tier 3 deferred note — this one was explicitly left unfixed).

- [ ] **Step 1:** Check current contrast on the 2 flagged status tiles; fix only if still an issue.
- [ ] **Step 2:** Bump the header controls to the standard 44px coarse-pointer minimum (should inherit the Tier 1
  `@media (pointer: coarse)` rule automatically if they use the shared `Button`/`data-slot` primitives — investigate
  why they don't today before adding one-off sizing).
- [ ] **Step 3:** `pnpm --filter @restaurant/web typecheck` + verify in-browser on an emulated tablet.
- [ ] **Step 4:** Commit: `fix(web): reports status-tile contrast + header touch targets`.

---

## Self-review notes

- **Spec coverage:** all design-doc items map to Tasks 1-3. Complete.
- **Sequencing:** Task 1 must land before Task 2 (frontend needs the endpoint). Task 3 is independent, can run in
  parallel with Task 1.
