---
name: growth-review
description: "Use when Armand says \"growth review\", \"weekly metrics\", \"how is the funnel\", \"retention check\", or on a recurring cadence after a product launches. Queries the existing analytics stack read-only — Plausible for traffic/conversion, PostHog built-in funnels and cohorts for in-product behavior (never hand-rolled SQL) — and produces a one-page recap: visitors→signups→activation (activation = one explicitly named event, never \"logged in\")→D7 return; D1/D7/D30 cohorts by signup week (D30 ≥25-30% ≈ PMF territory for B2B-ish products); channel attribution by UTM/referrer; and ONE written interpretation of what changed and why, explicitly flagging leading indicators vs the goal metric so vanity metrics don't win. Quarterly, adds the Sean Ellis pulse (~40% \"very disappointed\" = pre-PMF threshold). If the analytics stack is absent, reports exactly what to install (Plausible + PostHog free tier — deliberately not GA4/Amplitude-scale) and stops. NOT for ad-hoc SQL/BI (metabase MCP) and NOT for launch prep (launch-kit)."
allowed_tools: [Read, Bash, Glob, Grep]
---

# growth-review — read-only funnel + retention recap

## Overview

Recurring metrics recap for a product that's already live. Read-only end to end: this skill
never writes to the analytics stack, never runs ad-hoc SQL against an events table, and (per
its own `allowed_tools`) never writes a file — the recap is delivered inline in the response.
If Armand wants it saved, that's a separate `capture-note`/manual step, not this skill's job.

NOT for ad-hoc SQL/BI work — that's the `metabase` MCP. NOT for pre-launch positioning or
copy — that's `launch-kit`. NOT for one-time technical SEO checks — that's `seo-audit`. This
skill is the fourth stop in the seo-marketing pack's learning path (see `seo-audit`'s
`references/learning-path.md` step 9): instrumentation is assumed already correct
(`analytics-setup`, Phase 5) — this skill reads what's there, it doesn't wire tracking.

## Prerequisite check

Run first, always. Never read `.env`/`.env.local`/dotenv files to find keys — dotenv files may
hold other secrets and reading them is out of bounds regardless of task. Check for exported
**environment variables** only; if any required var is unset, tell Armand which `export
VAR=...` line to run and stop for that surface (degrade gracefully, don't fabricate the rest).

1. **Plausible.** Requires `PLAUSIBLE_API_KEY` and `PLAUSIBLE_SITE_ID` (add `PLAUSIBLE_HOST` for
   a self-hosted instance; defaults to `https://plausible.io`). Verify reachability:
   ```bash
   curl -s -o /dev/null -w "%{http_code}" \
     -H "Authorization: Bearer $PLAUSIBLE_API_KEY" \
     "${PLAUSIBLE_HOST:-https://plausible.io}/api/v1/stats/aggregate?site_id=$PLAUSIBLE_SITE_ID&period=7d&metrics=visitors"
   ```
   Non-`200` (or the vars unset) → Plausible-derived rows (visitors, channel attribution) are
   out of scope for this run.
2. **PostHog.** Requires `POSTHOG_API_KEY` (a personal or project API key) and
   `POSTHOG_PROJECT_ID` (add `POSTHOG_HOST` — `https://us.posthog.com` /
   `https://eu.posthog.com` / a self-hosted URL; region matters, calls silently 404 against the
   wrong one). Verify reachability:
   ```bash
   curl -s -o /dev/null -w "%{http_code}" \
     -H "Authorization: Bearer $POSTHOG_API_KEY" \
     "${POSTHOG_HOST:-https://us.posthog.com}/api/projects/$POSTHOG_PROJECT_ID/"
   ```
   Non-`200` (or the vars unset) → PostHog-derived rows (activation, D1/D7/D30, Sean Ellis
   survey) are out of scope for this run.
3. **Named signup + activation events.** Check `docs/analytics-setup.md` (the `analytics-setup`
   handoff note) with `Read` for both the `Signup event:` and `Activation event:` lines — the
   funnel and Trends recipes below both need the signup event name, not just activation. Note
   absent, or either line unnamed → ask Armand for that one event; "logged in" is never a valid
   answer for either (see Overview) — re-ask rather than substitute it.
4. **Both surfaces unreachable/unset.** STOP. Report exactly what to install: **Plausible**
   (traffic/conversion, self-hostable or plausible.io free trial → paid) **+ PostHog free tier**
   (product analytics — funnels, retention, surveys, generous free monthly event quota).
   Deliberately not GA4 (sampling + consent-mode complexity Plausible avoids) and not
   Amplitude/Mixpanel-scale tooling (built for a data volume this stage doesn't have yet). Do
   not proceed to any query recipe below.

## Query recipes per metric

Every recipe below uses the stack's **built-in** insight types (Trends/Funnel/Retention on the
PostHog side, Stats API on the Plausible side) — never a raw HogQL/SQL query against the events
table. Exact param names drift with product versions; if a call below 404s, check the current
API reference for that surface before assuming the metric is unavailable (same caveat as
`seo-audit`'s Lighthouse-category note).

**Every metric needs two calls, not one, to answer "what changed": the current period and the
immediately preceding period of equal length.** Plausible: repeat the same call with the date
window shifted back one period (`date=` set to the prior window, same `period=` length), or its
native `compare_to=previous_period` param on `/api/v1/stats/aggregate`/`breakdown` where the API
version supports it. PostHog: repeat the same insight with `date_from`/`date_to` shifted back one
window-length. Never answer "what changed" from memory or a prior chat turn — the delta always
comes from re-querying both periods, that's the whole point of a read-only skill sitting on top
of a stack that already holds the history.

Worked example — the activation funnel, this week vs. the week before:
```bash
# current period
POST /api/projects/$POSTHOG_PROJECT_ID/insights/funnel/
  events: [<visit>, <signup>, <activation event>], date_from: "-7d", date_to: "now"

# prior period — same length, shifted back one window
POST /api/projects/$POSTHOG_PROJECT_ID/insights/funnel/
  events: [<visit>, <signup>, <activation event>], date_from: "-14d", date_to: "-7d"
```
The diff between the two calls' step-3 (activation) conversion % is the "what changed" number the
Interpretation section reports — never a guess, always this pair of calls.

| Metric | Surface | Concrete call |
|---|---|---|
| Visitors (traffic) | Plausible Stats API, aggregate | `GET /api/v1/stats/aggregate?site_id=$PLAUSIBLE_SITE_ID&period=7d&metrics=visitors` |
| Signups | PostHog Trends insight (or a Plausible custom-event goal if signup fires client-side) | `POST /api/projects/$POSTHOG_PROJECT_ID/insights/trend/` with `events: [{"id": "<signup event>"}]` |
| Activation (named event) → funnel | PostHog Funnel insight, 3 steps: visit → signup → `<activation event>` | `POST /api/projects/$POSTHOG_PROJECT_ID/insights/funnel/` with the 3 `events` steps in order |
| D7 return | Same Funnel insight, `funnel_window_days` set to include a day-7 check, OR read off the Retention insight's day-7 column (below) | — |
| D1/D7/D30 cohorts by signup week | PostHog **Retention** insight — this is PostHog's "cohorts" feature for this job, distinct from its separate saved-Cohorts (named user-list) feature; target event = signup, period = Day, then read the day-1/7/30 columns, grouped by the week each row's cohort signed up | `POST /api/projects/$POSTHOG_PROJECT_ID/insights/retention/` with `target_entity` = signup event, `period: "Day"` |
| Channel attribution (UTM/referrer) | Plausible Stats API, breakdown | `GET /api/v1/stats/breakdown?site_id=$PLAUSIBLE_SITE_ID&period=30d&property=visit:utm_source` (swap `utm_source` for `utm_medium`/`utm_campaign`/`source` as needed) |
| Sean Ellis pulse (quarterly only) | PostHog **Surveys** (built-in), single question: "How would you feel if you could no longer use `<product>`?" — Very / Somewhat / Not disappointed | `GET /api/projects/$POSTHOG_PROJECT_ID/surveys/` to find the survey, then its responses endpoint — this one is read-and-tally, not a computed insight |

## Recap format

One page, delivered inline in the response (no file write — see Overview). Sections, in order:

1. **Header** — product name, date range covered, which surfaces were reachable (from the
   Prerequisite check — if one surface was down, say so here, don't silently thin the recap).
2. **Funnel** — Visitors → Signups → Activation (`<activation event>` named explicitly, never
   "logged in") → D7 return, each step with a raw count and the conversion % from the previous
   step.
3. **Retention cohorts** — D1/D7/D30 table, rows = signup week, columns = D1/D7/D30 %.
4. **Channel attribution** — UTM/referrer sources ranked by visitors, and separately by signup
   conversion rate — a channel can win on volume and lose on quality; show both so it can't hide.
5. **Interpretation — exactly ONE paragraph.** State what changed since the last review and a
   plausible why, and **explicitly separate leading indicators (traffic, signups — move first,
   easy to inflate) from the goal metric (activation rate, D30 retention — move second, harder to
   fake).** Every "what changed" claim traces back to the current-vs-prior-period call pair from
   Query recipes above — never to memory or an earlier chat turn. If leading indicators are up
   but the goal metric is flat, say that plainly — that's the vanity-metric trap this skill exists
   to catch, not a win to report.
6. **Quarterly only — Sean Ellis pulse.** % answering "very disappointed" vs. the ~40% heuristic
   threshold.
7. **Heuristics disclaimer** — one line: "D30 ≥25-30% and Sean Ellis ~40% are heuristics from
   B2B-ish SaaS benchmarks, not universal laws — a consumer/B2C product can have real PMF at
   lower D30 numbers; read these as a prompt to investigate, not a pass/fail gate."

## Cadence note

This skill runs on demand today. It's designed to pair with a Routine once a product has enough
signup volume for weekly numbers to mean anything — **do not create that Routine now**; wait
until a product is actually live and Armand asks for the cadence to be wired up (see
`.claude/references/cadence-setup.md` for how Routines are set up when that day comes). Running
this skill manually first, a few times, is also how Armand notices whether weekly or biweekly is
the right interval before automating it.

## Definition of Done

- Prerequisite check ran; any unreachable/unset surface is named in the Header, not silently
  dropped from the recap.
- Both surfaces unreachable/unset → install guidance was reported and no recap was fabricated.
- The funnel step names one concrete activation event — never "logged in".
- D1/D7/D30 cohort table is present, grouped by signup week, when PostHog was reachable.
- Channel attribution table is present, ranked both by volume and by conversion, when Plausible
  was reachable.
- Exactly one interpretation paragraph, and it explicitly separates leading-indicator movement
  from goal-metric movement.
- Quarterly runs additionally include the Sean Ellis pulse read.
- The heuristics disclaimer line is present, thresholds are not stated as pass/fail laws.

## Self-Improvement Loop

If a Plausible or PostHog API surface changes shape (endpoint path, auth header, region
hosts) and a query recipe above starts 404ing, fix the recipe in this file — don't let the
correction live only in one review's output. If Armand's real D30/Sean Ellis numbers keep
landing outside the stated heuristic bands for a product that's clearly doing fine (or clearly
not), record that as a note in the heuristics disclaimer rather than silently keeping the
generic 25-30%/40% bands — the bands are a starting prior, not a fact about his products.
