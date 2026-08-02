---
name: analytics-setup
description: "Use when Armand says \"set up analytics\", \"wire Plausible\", \"wire PostHog\", \"instrument the product\", or before a launch — growth-review depends on this being done first. Installs the minimal stack the AIOS standardizes on: Plausible (cookieless — usually no EU consent banner needed for it) site-wide, plus PostHog free tier for in-product events. HARD RULE: activation must be ONE explicitly named product event (\"created first project\"), never \"logged in\" — the skill refuses to finish until that event is named and instrumented. Wires UTM capture so channel attribution works from day one, and records the event names where growth-review will look for them. Console/API-key steps are marked NEEDS YOUR HANDS — the skill never creates accounts. NOT for reading metrics (growth-review) and NOT for event-taxonomy design at scale (product-tracking plugin skills)."
allowed_tools: [Read, Write, Bash, Glob, Grep]
---

# analytics-setup — Plausible + PostHog wiring with a named-activation-event gate

## Tool scope

`allowed_tools` is `[Read, Write, Bash, Glob, Grep]`. **`Write` is scoped to two places only:**
(1) the app's own source where instrumentation lands — the root layout/entry file for the
Plausible script, the client init module for PostHog, and (for the proxy option) the framework's
rewrite config; (2) the handoff note at `docs/analytics-setup.md` (see Handoff note to
growth-review). Never write application logic outside those instrumentation points, never write
`.env`/`.env.local`/any dotenv file, and never write an API key literal into any file this skill
creates — keys are referenced as env var names only (`NEXT_PUBLIC_POSTHOG_KEY`, etc.), the value
lives in the environment. `Bash` is for the repo's own package manager (installing `posthog-js` /
`posthog-react-native` via whichever of `pnpm`/`npm`/`yarn` the lockfile indicates) and read-only
`grep`/`curl` checks — never anything that creates an account or spends money. `Read`/`Glob`/`Grep`
detect the framework and any analytics already wired; **never read a dotenv file to look for an
existing key** — check exported environment variables only, same discipline as `growth-review`'s
prerequisite check. This skill never creates the Plausible site or PostHog project itself — those
are Armand's console steps, always (see NEEDS YOUR HANDS markers below).

## Overview

Two pieces, wired in order: Plausible for site-wide traffic (cookieless, so it usually clears EU
consent-banner requirements without one — "usually," not a legal opinion; a real consent question
belongs to a human lawyer, not this skill), and PostHog free tier for in-product behavioral
events. The one non-negotiable: activation is not allowed to default to "logged in." A vague
activation event produces a funnel `growth-review` can't trust, so this skill will not report
itself done until one concrete, named event is instrumented at its real call site.

NOT for reading metrics back out (`growth-review` — this skill only wires the pipes) and NOT for
event-taxonomy design at company scale (the `product-tracking` plugin skills own that; this skill
covers the two events that matter pre-launch: activation and the funnel that leads to it).

## Prerequisite check

Run first, always. Wiring analytics twice, or into the wrong framework's entry point, is worse
than not wiring it — it produces duplicate events or a dead script tag nobody notices.

1. **Framework detection — never assume.** Glob for exactly one of:
   - `next.config.{js,mjs,ts}` **and** an `app/` directory → Next.js App Router (this skill's
     supported Next.js shape).
   - `next.config.{js,mjs,ts}` with **no** `app/` directory (a `pages/` directory instead) →
     Next.js Pages Router. Report the gap and stop for the wiring sections: the snippets below
     target App Router's root layout; Pages Router needs the script in `_document.tsx` instead,
     which this skill doesn't template yet.
   - `app.json` containing an `"expo"` key, or `"expo"` under `package.json` dependencies → Expo.
     Plausible/PostHog web snippets below target Expo's **web** export specifically — they do not
     apply to the native iOS/Android bundle.
   - Neither pattern found, or both found in the same repo → report the ambiguity and stop; don't
     guess.
2. **Existing analytics detection.** Before wiring anything, grep for what's already there so this
   run doesn't double-instrument:
   ```bash
   grep -rn "plausible.io/js/script" --include='*.tsx' --include='*.ts' --include='*.html' \
     --exclude-dir={node_modules,dist,build,.git,.next,.expo,coverage,.turbo} .
   grep -rn "posthog-js\|posthog-react-native\|posthog\.init(" \
     --include='*.tsx' --include='*.ts' \
     --exclude-dir={node_modules,dist,build,.git,.next,.expo,coverage,.turbo} .
   ```
   Any hit → report what's already wired and only wire the missing piece(s); never lay down a
   second script tag or a second `posthog.init(`.
3. **API key vars, if this is a re-run.** Check exported env vars only (never a dotenv file):
   `NEXT_PUBLIC_POSTHOG_KEY`/`POSTHOG_KEY` and the Plausible domain are typically build-time
   values, not secrets requiring a check here — the actual account creation is NEEDS YOUR HANDS
   below regardless of whether vars are already set.

## Plausible wiring

Site-wide, cookieless traffic tracking. One script tag, one domain.

- **Next.js App Router:** add to the root `app/layout.tsx`, inside the `<head>` (or via
  `next/script` with `strategy="afterInteractive"` placed in the root layout body — either is
  fine, don't add both):
  ```tsx
  <Script defer data-domain="<site-domain>" src="https://plausible.io/js/script.js" strategy="afterInteractive" />
  ```
- **Expo web:** Plausible is web-only — place the script tag in the web entry document
  (`app/+html.tsx` for Expo Router's web export, or `web/index.html` for a bare Expo web build),
  never in the shared native entry point.
- **Proxy option, one line:** if ad-blockers are a concern, reverse-proxy `/js/script.js` and the
  `/api/event` endpoint through the app's own domain (a Next.js `rewrites()` rule or a Cloudflare
  Worker route) instead of loading `plausible.io` directly — same script, different `src`/endpoint.

**NEEDS YOUR HANDS:** Armand creates the Plausible site in the Plausible console (or self-hosted
instance) and gives this skill the resulting site domain — this skill never signs up or creates
the site itself.

## PostHog wiring

In-product event tracking, plus the one event that gates this whole skill.

**HARD RULE — do not report this skill finished until the activation event is ONE explicitly
named product event, instrumented at its real call site.** If Armand hasn't already named one
this session, ask: "what's the one action that means someone actually got value — not
'logged in,' something like 'created first project' or 'sent first message'?" A vague answer
("engagement," "used the app") or "logged in" is not an answer — re-ask rather than substitute a
default or draft the capture call "provisionally" while waiting. This mirrors `launch-kit`'s JTBD
gate: no partial instrumentation ships ahead of the decision it depends on.

Once the event is named:

1. **Init, per framework:**
   - **Next.js App Router:** a client-only init, e.g. a `providers.tsx` marked `'use client'`,
     calling `posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY, { api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST })`
     once, wrapped around the root layout's children.
   - **Expo (web export):** `posthog-react-native`'s `PostHogProvider` at the app root, same
     env-var-sourced key/host pair.
2. **Find the real call site.** Grep the codebase for the handler that actually completes the
   named action (e.g. the project-creation success path) — don't guess a component name. If more
   than one candidate matches, ask Armand which one is the real completion point.
3. **The capture call:** `posthog.capture('<named event, e.g. "created first project">')` at that
   exact call site — not in a generic middleware, not on every page load.

**NEEDS YOUR HANDS:** Armand creates the PostHog project (free tier) and gives this skill the
project API key and host region (`https://us.posthog.com` / `https://eu.posthog.com` /
self-hosted) — this skill never creates the project itself. The key is set as an env var by
Armand; this skill never writes the literal key into a file.

## UTM capture

Channel attribution has to work from day one, not be bolted on after the first campaign runs.

- **Plausible** captures `utm_source`/`utm_medium`/`utm_campaign` natively in its Sources report
  the moment the script above is live — no additional code. This is also what `growth-review`'s
  channel-attribution query reads (`Stats API breakdown`), so nothing further to wire here beyond
  confirming the script tag from Plausible wiring is present.
- **PostHog** captures UTM parameters as initial (`$initial_utm_source` etc.) person properties by
  default on first touch, as long as the init above doesn't disable person profiles or
  autocapture — verify the init snippet doesn't set `autocapture: false` or `person_profiles:
  'never'`; don't write custom UTM-parsing code, the SDK default already does this.

## Handoff note to growth-review

`growth-review`'s prerequisite check reads: *"Check the project's `analytics-setup` output (a
docs/README note naming the activation event) with `Read`/`Glob` if one exists."* This skill
writes exactly that note to `docs/analytics-setup.md` — the one location both skills agree on.
Write (or update, on a re-run):

```markdown
# Analytics Setup

Signup event: `<named event>` — fires at `<file path : function/handler>`.
Activation event: `<named event>` — fires at `<file path : function/handler>`.
Plausible: site `<domain>`, script wired in `<file>`.
PostHog: project region `<host>`, capture call wired in `<file>`.
UTM capture: Plausible native (Sources report); PostHog initial-touch person properties (default,
unmodified).
Last wired: `<date>`.
```

`growth-review`'s funnel, signup trend, and retention recipes all key off the signup event name,
not just activation — record both, not activation alone.

If `growth-review`'s expected location ever changes, update this section to match — the two
skills must never drift onto different paths for the same note.

## Definition of Done

- Prerequisite check ran: framework detected (or the ambiguity/Pages-Router gap reported and the
  run stopped there — that's a valid, complete run), existing analytics detected so nothing was
  double-wired.
- The activation event is ONE concrete, named product action, never "logged in" or a placeholder,
  and its `posthog.capture(...)` call sits at the real completion call site, not a guessed one.
- Plausible script is wired for the detected framework (or the proxy variant, if chosen).
- PostHog init is wired for the detected framework, key/host sourced from env vars only.
- UTM capture confirmed: Plausible's native Sources report is live; PostHog's default person
  profiles/autocapture were not disabled in the init snippet.
- `docs/analytics-setup.md` exists with **both** the signup event and the named activation event
  (not activation alone — `growth-review`'s funnel/trend/retention recipes all need the signup
  name too), each with its file:location, and both stacks' wiring recorded — this is the exact
  file `growth-review` checks for.
- Console steps (Plausible site, PostHog project) are marked NEEDS YOUR HANDS, never fabricated
  as done, and no API key literal was written to any file by this skill.

## Self-Improvement Loop

If Plausible's script/proxy shape or PostHog's SDK init API changes (new config key, renamed
init option, UTM auto-capture behavior changed), update the snippets above before the next run —
don't let the correction live only in one project's instrumentation. If `growth-review` ever
changes where it looks for the activation-event note, update the Handoff note section's path here
in the same change — producer and consumer must stay pointed at the same file.
