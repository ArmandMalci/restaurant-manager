# /reports Day-by-Day + UX — Design

**Date:** 2026-07-11
**Status:** Approved
**Scope:** Reports screen + backend. Tier 5 item from [Plan 13](../../design-revamp/plans/13-qa-backlog-roadmap.md).

---

## 1. Current state

`GET /reports/summary` (`apps/api/src/reports/reports.service.ts`) takes zero query params and mixes three
different time windows in one response: all-time order/table counts, *today-only* reservation count (hardcoded day
boundary), and all-time top-5 items. **No revenue figure exists anywhere in reports today** — only counts. The
frontend (`reports/index.tsx`) has a `ponytail:` comment noting a date-range picker was previously removed because
the endpoint didn't support one. A day-by-day report needs new backend query granularity — this isn't a frontend-only
change.

## 2. Design: new daily-breakdown endpoint

- New `GET /reports/daily?from=YYYY-MM-DD&to=YYYY-MM-DD` (both required, capped to a reasonable max range — e.g. 92
  days — to keep the query bounded; reject with a 400 outside that range rather than silently truncating).
- Per day in range, return: order count, **revenue** (sum of `Bill.total` where `paidAt` falls in that day — the
  first money figure reports has ever shown), and reservation count. Grouping is done in the service layer via a
  date-truncated `groupBy` (Prisma doesn't do `DATE_TRUNC` natively in `groupBy` — use a raw query via
  `$queryRaw` scoped to this one aggregation, following whatever raw-query precedent already exists in this codebase
  if any, or a plain per-day loop over `Promise.all` if the date range is small enough that N queries isn't a real
  cost — prefer the simpler per-day loop first, only reach for `$queryRaw` if profiling shows it matters).
- `GET /reports/summary` is unchanged — the daily endpoint is additive, not a replacement, since the existing
  snapshot cards still serve their current purpose.

## 3. Frontend: day-by-day view + date-range picker

- Re-add the date-range picker (shadcn, not native `<input type=date>` pair unless that's simpler and equally
  accessible — check what date-input pattern, if any, already exists elsewhere in this app before introducing a new
  one) that was previously removed, now wired to the real `/reports/daily` endpoint.
- Render the daily breakdown as a simple table (date, orders, revenue, reservations) — not a chart by default; a
  restaurant owner scanning "how did last Tuesday do" is well served by a scannable table. A chart is a reasonable
  follow-up if Armand wants one, but isn't required to satisfy "day by day report."
- "Better UX and UI" (issues.md's other reports ask) is otherwise vague like `/order`'s — scope narrowly here too:
  fix the 2 low-contrast status tiles already flagged (Plan 10 T3.3) if not already done, and the sub-44px header
  touch targets already flagged (Plan 10 Tier 3 deferred note) — both are named, concrete, already-identified gaps,
  not new scope invented for this spec.

## 4. Testing

- Backend: a test asserting the daily endpoint rejects an out-of-range date span; a test asserting revenue sums
  only `paid` bills within each day's boundary.
- Frontend: a test confirming the date-range picker calls the daily endpoint with the selected range and renders one
  row per day.

## Self-review

- The revenue-figure gap (reports never showed money) is a real, verified finding, not a guess — worth calling out
  explicitly since it's arguably a bigger miss than the literal "day by day" ask.
