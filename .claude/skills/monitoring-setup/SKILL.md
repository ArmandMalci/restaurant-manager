---
name: monitoring-setup
description: "Use when Armand says \"set up monitoring\", \"uptime alerts\", \"how do I know when it breaks\", \"incident runbook\", or before a product's first real users. Solo-founder scope on purpose: a free-tier uptime monitor with a phone-grade alert beats a NOC suite — outages must not be discovered from a customer's Discord message days later. Does three things: (1) wires an external uptime check (UptimeRobot / Better Stack free tier — console walkthrough marked NEEDS YOUR HANDS, records the check URLs and cadence), (2) escalation path with a real test alert verified end-to-end, (3) writes the one-page incident runbook (first checks, rollback commands, status-page copy template) into the target repo's docs/. Prerequisite-check-first: no deployed URL means report-what's-missing and stop. NOT for application error tracking (Sentry-class tooling) and NOT for CI failures (ci-setup)."
allowed_tools: [Read, Write, Bash, Glob, Grep]
---

# monitoring-setup — free-tier uptime monitor + a runbook that actually gets used

## Tool scope

`allowed_tools` is `[Read, Write, Bash, Glob, Grep]`. **`Write` is scoped to `docs/` in the
target repo** — this skill only creates or edits the incident runbook there (default
`docs/incident-runbook.md`). Never write application source, deployment config, or CI files.
`Bash` runs read-only reachability checks (`curl`, `dig`) and, once Armand confirms a check is
wired, a `curl` against the monitor's own status/test-alert API if the provider exposes one —
never anything that creates an account or changes billing. `Read`/`Glob`/`Grep` detect the
deployed URL and existing docs. This skill never creates the UptimeRobot/Better Stack account
itself — that is Armand's console step, always.

## Overview

Solo-founder scope, deliberately: one external uptime check plus one alert channel that actually
reaches a phone. Not a NOC dashboard, not a Sentry-class error tracker (that's out of scope — see
description), not a CI gate (`ci-setup` owns that). The point is narrow: when the product goes
down, Armand finds out from a push notification, not from a customer.

Three steps, in order: wire the monitor, prove the alert fires and lands on the phone, write the
runbook. Step 2 is the one that's allowed to fail honestly — see Alert verification.

## Prerequisite check

Run first, always. Monitoring a URL that doesn't exist yet monitors nothing.

1. Ask Armand for the deployed production URL if he hasn't already given one this session.
2. If he doesn't have one handy, look for it: `vercel.json`, `fly.toml`, `render.yaml`, or a
   "Live at" / "Deployed to" line in `README.md` — read whichever exists, don't grep broadly for
   URLs (too noisy, too many false positives from example.com placeholders).
3. Confirm the URL is actually live: `curl -sS -o /dev/null -w '%{http_code}\n' <url>` — a 2xx/3xx
   means reachable, anything else (including connection failure) means it isn't up yet.

**No reachable deployed URL → report exactly what's missing ("no production URL found in
vercel.json/fly.toml/README, and none given") and STOP.** Do not wire a monitor against a staging
URL or `localhost` and call it done — that only tells Armand his laptop is on.

## Monitor wiring

Pick one provider — don't set up both:

| Provider | Free tier | Trade-off |
|---|---|---|
| UptimeRobot | 50 monitors, 5-min interval, email + mobile app push | Simpler setup, push notification is the phone channel — no free phone-call escalation |
| Better Stack (Better Uptime) | Fewer monitors, phone-call escalation included on some free-plan tiers | Louder alert (an actual phone call wakes people up), heavier onboarding |

Free-tier limits and included alert channels change without notice — **verify current limits on
the provider's pricing page at signup time**, don't trust a number written here.

**NEEDS YOUR HANDS — Armand does this in the provider's console, this skill only tells him what
to click:**
1. Create the account (this skill never signs up on his behalf).
2. Add a monitor for the URL confirmed above, HTTP(S) check, 5-minute interval (the free-tier
   floor on both providers).
3. Add an alert contact that reaches a phone: enable the mobile app + push notifications
   (UptimeRobot), or add a phone number to the on-call escalation policy (Better Stack).
4. Copy the monitor's public status-page URL if the plan includes one — it goes in the runbook.

Once Armand confirms the console steps are done, record in the runbook's Contacts section: the
monitor URL(s) checked, the check interval, and which alert channel(s) are wired.

## Alert verification

**This is the heart of the Definition of Done.** A monitor that has never actually alerted is a
monitor nobody has tested — exactly the failure mode this skill exists to prevent.

1. **NEEDS YOUR HANDS —** trigger a real test alert. Most providers have a "Send test
   notification" button in the monitor's alert-contact settings — Armand clicks it in the
   provider's console. If there's no test-send button, Armand briefly points the monitor at a
   URL that will 5xx (a maintenance-mode toggle, or a deliberately broken staging health-check
   endpoint) long enough for one failed check cycle, then restores it. This skill records the
   result (received-on-phone confirmation, or UNVERIFIED with the gap) — it does not click the
   console itself.
2. **Ask Armand directly whether the alert arrived on his phone** — which channel, and roughly
   when. This is a judgment call this skill cannot grep for, same discipline as mobile-release's
   Gate 1 keystore-backup question: an unanswered question stays unverified, it never defaults to
   pass.
3. If Armand confirms receipt: mark the runbook's alert-verification line **VERIFIED** with the
   channel and date.
4. If Armand can't confirm — hasn't checked his phone yet, the test-send button doesn't exist on
   this plan, the call/push channel wasn't actually wired — mark it **UNVERIFIED** and name the
   specific gap ("push notification not confirmed received — Armand hasn't checked his phone
   yet" / "no test-send button on this plan; needs a manual downtime simulation"). Never mark
   VERIFIED on silence or on "it's probably fine."

## Runbook template

Write this to `docs/incident-runbook.md` (or the repo's existing docs convention if one already
exists — check with `Glob` before assuming the path). Fill in every section with real values, not
placeholder text — a runbook of bare headings is not a runbook:

```markdown
# Incident Runbook — <product name>

Last verified: <date> · Alert status: VERIFIED / UNVERIFIED (see below)

## First checks
1. Is the monitor itself down, or just alerting on a flake? Check <status-page URL / provider
   dashboard link>.
2. `curl -sS -o /dev/null -w '%{http_code}\n' <production URL>` — what's the actual response?
3. Check the hosting platform's status page: <link — Vercel/Render/Fly/etc status URL>.
4. Check the last deploy: <link to deploy log / `git log -1 --oneline` on the deployed branch> —
   did something just ship?

## Rollback
- Revert the last deploy: <exact command for this repo's platform, e.g. `vercel rollback
  <deployment-url>` or `fly releases rollback`>.
- If the last deploy wasn't the cause, check <dependency / third-party API this product relies
  on> status page: <link>.

## Status-page copy (fill in and post, don't improvise mid-incident)
> We're aware of an issue affecting <what's affected> and are investigating. Next update in
> 30 minutes.
>
> Update: <what was found / what's being done>.
>
> Resolved: <root cause in one plain-English sentence> — <what changed to prevent recurrence, or
> "monitoring for recurrence">.

## Contacts
- Monitor(s): <check URL(s)>, interval <N min>, provider <UptimeRobot/Better Stack>.
- Alert channel: <push / phone call>, verified <date> — status: VERIFIED/UNVERIFIED.
- Who to call if this doesn't resolve in <N> minutes: <Armand's own escalation, e.g. a
  co-founder or contractor, or "no one else — solo"?>.
```

## Definition of Done

- Monitor wired against a confirmed-reachable production URL, check interval and monitor URL(s)
  recorded.
- Alert verification ran and the runbook states **VERIFIED** (with channel + date) or an honest
  **UNVERIFIED** naming the exact gap — never silently skipped.
- `docs/incident-runbook.md` exists with all four sections (First checks / Rollback /
  Status-page copy / Contacts) filled with real values for this product, not bare headings.
- If the prerequisite check failed (no deployed URL), the run stopped there and reported what's
  missing — that is also a valid, complete run.

## Self-Improvement Loop

When a provider changes what its free tier includes (test-send button removed, phone escalation
moved behind a paywall, interval floor changed), update the Monitor wiring table above before
running this skill again — don't let the next run rediscover the same surprise. Same when a new
hosting platform's rollback command needs to be added to the Runbook template's example line.
