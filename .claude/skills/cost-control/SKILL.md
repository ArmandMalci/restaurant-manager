---
name: cost-control
description: "Use when Armand says \"cost control\", \"spend caps\", \"rate limits\", \"API abuse\", or BEFORE any endpoint calls a paid model or metered API in production. The failure it prevents: one abuser on an unprotected LLM endpoint is a four-figure overnight bill. Three layers: (1) provider-side spend caps and billing alerts — console walkthroughs for Anthropic/OpenAI/cloud marked NEEDS YOUR HANDS, with what-was-set recorded, (2) app-side per-user quotas and rate limits scaffolded at the boundary for the actual stack, deny-by-default for unauthenticated calls to paid paths — advisory code shapes, never auto-applied, (3) a unit-economics note per pricing plan: cost-to-serve one user vs what they pay (billing-pricing consumes this). Judgment calls flagged needs-your-call. NOT for pricing strategy (billing-pricing) and NOT for performance work (frontend-perf)."
allowed_tools: [Read, Write, Bash, Glob, Grep]
---

# cost-control — three layers between one bad request and a four-figure bill

## Tool scope

`allowed_tools` is `[Read, Write, Bash, Glob, Grep]`. **`Write` is scoped to `docs/` only** —
this skill creates or edits `docs/cost-control.md` (provider spend-cap record + the advisory
rate-limit code shape) and `docs/unit-economics.md` (the layer-3 cost-to-serve note). **It never
edits application source to actually wire a rate limit** — the Next.js and FastAPI shapes below
are advisory code blocks that live inside `docs/cost-control.md`; applying them to real route
files is Armand's call, in a separate, reviewed change, never this skill's own edit. `Bash` is
read-only: detecting the stack (`package.json`/`next.config.*` vs `pyproject.toml`/
`requirements.txt`) and finding existing paid-API call sites via safe-grep. It never creates a
provider account, never calls a billing API to set a cap, and never touches production traffic.

## Overview

Three layers, cheapest and dumbest first: provider-side hard/soft caps (minutes, a console),
app-side quotas (an afternoon, code), unit-economics visibility (ongoing, feeds pricing). None of
the three is sufficient alone — see the OpenAI note under Layer 1 for exactly why a console
alert is not the same thing as a cap.

## Prerequisite check

Run first, always.

1. Detect the stack: Next.js (`next.config.*` present, or an `app/` directory with route
   handlers) vs FastAPI (`pyproject.toml`/`requirements.txt` listing `fastapi`, or `from fastapi
   import` in an entry file) vs something else. If neither is detected, ask Armand rather than
   guessing a code shape for the wrong framework.
2. Find every call site that hits a paid model or metered API — safe-grep for SDK imports
   (`anthropic`, `openai`, or other metered-API clients) per `.claude/references/safe-grep-
   patterns.md` — and check whether each sits behind an auth check.

**Any unauthenticated route reaching a paid-API call site is the specific failure this skill
exists to prevent — flag it first, loudly, before anything else in this run.**

**No paid-API call site found at all → report that and STOP.** Wiring quotas for calls that
don't exist yet is premature scope.

## Layer 1 — provider spend caps & billing alerts (all NEEDS YOUR HANDS)

This skill never has console access — every step here is Armand's, in the provider's own
dashboard. This skill only tells him what to click and then records what was set.

- **Anthropic Console** — **NEEDS YOUR HANDS:** Plans & Billing → set a workspace-level spend
  limit and, where issuing scoped API keys, a per-API-key spend limit — this is a real hard cap,
  the strongest lever Anthropic gives. Also configure a usage/spend-threshold alert.
- **OpenAI Platform** — **NEEDS YOUR HANDS:** Settings → Billing → set a monthly budget limit and
  a threshold alert. **Verify current behavior before relying on this**: budget-threshold
  behavior on OpenAI's platform has changed before and can change again — if hitting the
  threshold is alert-only (email + dashboard notice, traffic and billing continue) rather than a
  hard stop, treat it as a notification, not a cap, and lean harder on Layer 2 for any
  OpenAI-backed endpoint.
- **Cloud (AWS/GCP/Vercel/etc)** — **NEEDS YOUR HANDS:** the platform's native billing-alert
  console (AWS Budgets, GCP Budgets & Alerts, Vercel spend management) — set the threshold with
  enough headroom below "this would actually hurt" for the alert to reach Armand before the
  billing period closes.

Free-tier caps, alert semantics, and whether a threshold hard-stops or just notifies all change
without notice — **verify current behavior on the provider's own docs at setup time**, don't
trust a number or a "hard stop vs alert" claim written here as permanent.

**Record what was set** — Armand fills this in after each console step above; this skill only
creates the empty table and asks:

| Provider | Alert / cap type | Threshold set | Hard stop? | Date |
|---|---|---|---|---|
| Anthropic | per-API-key spend limit | | Yes | |
| Anthropic | workspace usage alert | | No — alert only | |
| OpenAI | monthly budget threshold | | Verify at setup time | |
| Cloud (name it) | billing alert | | Varies by provider | |

## Layer 2 — app-side quotas & rate limits (ADVISORY — NEVER AUTO-APPLIED)

**The rule, stated plainly: deny-by-default for any unauthenticated request reaching a paid model
or metered API call.** An endpoint with no auth check in front of a paid call is the exact
four-figure-overnight-bill scenario this skill exists to prevent. If a route genuinely must stay
unauthenticated (a public demo, a marketing-page AI feature), it needs its own hard per-IP or
per-session cap tighter than any authenticated quota — never "no limit because it's just a demo."

These are shapes to adapt, not a library recommendation — reuse whatever rate-limit store the
repo already has (Redis, Upstash, in-memory for a single instance) rather than adding a new
dependency for this.

**Next.js route-handler shape (ADVISORY):**
```ts
// app/api/generate/route.ts — advisory shape, adapt to this repo's real auth + rate-limit store
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const userId = await getAuthenticatedUserId(req); // however this repo already does auth
  if (!userId) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 }); // deny-by-default
  }

  const allowed = await checkAndConsumeQuota(userId, { limit: 100, windowSeconds: 3600 });
  if (!allowed) {
    return NextResponse.json({ error: 'rate limit exceeded' }, { status: 429 });
  }

  // ... call the paid model here, only after both checks pass
}
```

**FastAPI dependency shape (ADVISORY):**
```python
# advisory shape — adapt to this repo's real auth dependency + rate-limit backend
from fastapi import Depends, HTTPException, Request

async def enforce_quota(request: Request, user = Depends(get_current_user)):
    if user is None:
        raise HTTPException(status_code=401, detail="unauthorized")  # deny-by-default
    allowed = await check_and_consume_quota(user.id, limit=100, window_seconds=3600)
    if not allowed:
        raise HTTPException(status_code=429, detail="rate limit exceeded")

@app.post("/generate", dependencies=[Depends(enforce_quota)])
async def generate(...):
    ...
```

Both shapes go into `docs/cost-control.md` only. Applying either to a real route file is a
separate, reviewed change — this skill does not make it.

## Layer 3 — unit-economics note (feeds billing-pricing)

Write to **`docs/unit-economics.md`** — this is the seam a later `billing-pricing` skill will
read from; name this exact path and don't let it drift, same producer-first pattern as
`analytics-setup` writing `docs/analytics-setup.md` before `growth-review` read it.

```markdown
# Unit Economics

Per pricing plan:
| Plan | Price / user / month | Cost-to-serve estimate | Margin | Judgment calls |
|---|---|---|---|---|
| <plan name> | $<price> | $<estimated API + infra cost per active user> | <price minus cost> | <flagged below> |

Cost-to-serve basis: <e.g. average tokens per request × current provider rate card × estimated
requests/user/month, sourced from the quota cap set in Layer 2>.
Judgment calls (needs-your-call): <e.g. "assumed N requests/user/month from the Layer 2 quota —
no real usage data yet; revisit once usage data exists">.
Last updated: <date>.
```

`billing-pricing` exists and consumes `docs/unit-economics.md` to ground the Pricing Review in
cost-to-serve. This skill's only obligation is writing the note to the named path in the named
format, so `billing-pricing` has a fixed seam to read rather than one that needs discovering.

## Definition of Done

- Paid-API call sites inventoried; any unauthenticated one is flagged first, before anything else.
- Layer 1: every relevant provider's console walkthrough is completed by Armand (NEEDS YOUR
  HANDS), and the record-what-was-set table in `docs/cost-control.md` is filled with real
  thresholds and dates — not left as an empty template.
- Layer 2: the advisory code shape for the detected stack is written into `docs/cost-control.md`,
  deny-by-default is explicitly stated, and this skill has not applied it to actual application
  source.
- Layer 3: `docs/unit-economics.md` exists with real numbers (or explicitly-flagged judgment-call
  placeholders) for every pricing plan, at the path future `billing-pricing` work will read.
- Every judgment call (assumed usage volume, which cloud alert to configure, hard-stop-vs-alert
  status of a provider's cap) is named as **needs-your-call**, never silently assumed.

## Self-Improvement Loop

When a provider changes whether its budget/threshold is a hard stop or an alert-only notice (this
has reportedly shifted on OpenAI's platform before — verify rather than trust either state as
permanent), update the Layer 1 walkthrough and the record-what-was-set table header before the
next run relies on a stale assumption. When a new paid-API provider gets
adopted, add its console walkthrough here rather than improvising one inline mid-run.
`billing-pricing` now exists and reads `docs/unit-economics.md` at this same path — if its
location ever needs to change, update it here first.
