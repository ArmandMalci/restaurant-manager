---
name: frontend-perf
description: "Use when the user says \"why is this page slow\", \"bundle analysis\", \"check Core Web Vitals\", \"performance audit the frontend\", or after a dependency-heavy feature lands. Two layers: (1) build-time — bundle analysis via the framework's native tooling (next build stats / expo-atlas / vite --report), flagging the top-10 heaviest modules, duplicate dependencies, and un-lazy-loaded routes; (2) field — Core Web Vitals as FIELD data (CrUX p75 over 28 days: LCP <2.5s, INP <200ms, CLS <0.1) when the site has traffic, clearly labeled lab-only otherwise — a green local Lighthouse run alone proves nothing and the report must say so. Findings ranked by user-impact with a plain-English why per finding and the single highest-leverage fix named first. NOT for full SEO audits (seo-audit covers CWV in context) and NOT for backend latency (that is profiling work)."
allowed_tools: [Read, Bash, Glob, Grep]
---

# frontend-perf — two-layer frontend performance audit

## Overview

Reports, does not fix — the same contract as `security-audit`/`seo-audit`. Two independent
layers: build-time bundle analysis via each framework's own tooling, and field Core Web Vitals
via CrUX. A missing tool or a site with no traffic shrinks scope; it never halts the run. Output
is one report whose very first line names the single highest-leverage fix.

NOT for full SEO audits — `seo-audit` already covers CWV inside a full crawl (its
`references/checklist-2026.md` item 4). This skill is the standalone, perf-focused version:
faster to run after a single dependency-heavy change, without a sitemap crawl. NOT for backend
latency or API profiling — that's a debugging/profiling task, not a frontend bundle/CWV concern.

## Prerequisite check

Run first, always. Missing prerequisites shrink scope — record each as a "Scope limitations"
entry in the final report, never as a silent skip.

1. **Framework detection — never assume.** Glob for exactly one of:
   - `next.config.{js,mjs,ts}` → Next.js
   - `app.json` containing an `"expo"` key, or `"expo"` under `package.json` dependencies → Expo
   - `vite.config.{js,ts,mjs}` → Vite

   Zero matches, or more than one (a monorepo with several apps) → ask the user which target
   app/package before continuing. Never infer the framework from `react` being present alone.
2. **Package manager.** Detect from the lockfile: `pnpm-lock.yaml` → pnpm, `bun.lockb` → bun,
   `yarn.lock` → yarn, else `package-lock.json` → npm. This decides the exact command shape used
   in Layer 1's duplicate-dependency check below.
3. **Build tooling reachable.** `npx next --version` / `npx expo --version` / `npx vite --version`
   matching the detected framework. Failure → the bundle layer is entirely out of scope for this
   run; note it, don't fabricate numbers.
4. **Analyzer plugin installed?** Check `package.json` for `@next/bundle-analyzer`,
   `expo-atlas`, or `rollup-plugin-visualizer` (`vite-plugin-visualizer`). Presence unlocks the
   deeper per-module procedure in Layer 1; absence falls back to each framework's raw build
   output. State in the report which path actually ran — don't silently take the shallower one
   without saying so.
5. **CrUX API key.** `$CRUX_API_KEY` env var set (same convention as `seo-audit`/`growth-review`
   — never read `.env`/dotenv files to find it, check the exported var only). Missing → the field
   layer has no data source; report lab-only. A local Lighthouse run is never a substitute for
   this — see Layer 2.
6. **Site has traffic.** Ask the user, or check for a production URL. CrUX only has a record once
   an origin has enough real Chrome traffic over 28 days — a brand-new or local-only app has
   nothing to query. That's an N/A by definition, not a missing-tool gap; don't conflate the two
   in the report.

## Layer 1 — Build-time bundle analysis

### Next.js

- **With `@next/bundle-analyzer` installed:** `ANALYZE=true npx next build` (the repo's
  `next.config.js` must already wrap itself with `withBundleAnalyzer` — this skill reads, it
  never adds the wrapper since `Edit`/`Write` aren't in its `allowed_tools`; if the wrapper is
  missing, fall back to the raw path below and note the gap). Generates
  `.next/analyze/client.html` / `server.html` / `edge.html` treemaps — inspect the embedded stats
  for the top-10 heaviest modules per bundle.
- **Without it (always available):** `npx next build` prints a per-route **First Load JS** table
  to stdout — read it directly for the top-10 heaviest *routes*. This is page-level, not
  module-level; say so in the report.
- **Duplicate dependencies:** pick 2–3 candidates likely to duplicate (UI kits, date libs, icon
  sets) and run the command matching the detected package manager:
  - pnpm: `pnpm why <pkg>`
  - npm: `npm ls <pkg>` (add `--all` for the full tree)
  - yarn: `yarn why <pkg>`
  - bun: `bun pm ls --all | grep <pkg>` — `bun.lockb` is a binary lockfile, not greppable
    directly, so inspect the resolved tree via `bun pm ls --all` instead

  Multiple distinct resolved versions of the same package is the finding.
- **Un-lazy-loaded routes:** a heavy lib imported at module top-level inside a route file, never
  behind `next/dynamic`, ships on first load for every visitor of that route.
  ```bash
  grep -rn --include='*.tsx' --include='*.ts' \
    --exclude-dir={node_modules,dist,build,.git,.next,coverage,.turbo} \
    -E "^import .+ from ['\"](chart\.js|three|monaco-editor|@ffmpeg/ffmpeg|pdfjs-dist|recharts|framer-motion)['\"]" \
    app pages 2>/dev/null
  ```
  For each matching file, check it has no `next/dynamic` import:
  `grep -L "next/dynamic" <file>`. A file that matches the first grep but is listed by the second
  is shipping the heavy lib eagerly — flag it with the specific route path.

### Expo

- **With `expo-atlas` installed:** `npx expo-atlas` opens the interactive Metro bundle
  visualizer — read its module list for the top-10 heaviest.
- **Without it:** `npx expo export --platform web --output-dir /tmp/expo-export-perf` (swap
  `--platform` for `android`/`ios` to inspect the native bundle) and read the emitted bundle size
  from the export summary. Coarser than Atlas — note the gap in the report.
- **Duplicate dependencies:** same package-manager-matched command as Next.js above.
- **"Un-lazy-loaded routes" doesn't map cleanly onto Expo** — Metro ships one bundle per
  platform; there's no per-route code-splitting to check on native. The equivalent concern is a
  heavy native module (large image/video/animation libs) imported into every screen instead of
  the one that needs it: grep top-level imports of known-heavy libs inside screen files. On an
  Expo Router **web** export only, the same `next/dynamic`-style check applies via
  `React.lazy`/dynamic `import()`; native bundles have no equivalent to defer to.

### Vite

- **With `rollup-plugin-visualizer` (or `vite-plugin-visualizer`) configured:** `npx vite build`
  — the plugin writes its own `stats.html` per its configured output path; read it for the top-10
  heaviest modules.
- **Without it, the raw fallback:** `npx vite build` prints a per-chunk size table to stdout
  (gzip + raw) by default — read that table directly for the top-10 heaviest chunks.
- **Duplicate dependencies:** same matched command as above.
- **Un-lazy-loaded routes:** same grep shape as Next.js, scoped to wherever the app's router
  config lives (`src/routes/**`, `src/pages/**`, or the route-definition file). A route component
  importing a heavy lib without a `React.lazy(() => import(...))` wrapper ships it on first paint
  for every route, not just the one that needs it.

## Layer 2 — Field Core Web Vitals

A green local Lighthouse run alone proves nothing — Lighthouse is one synthetic run on one
machine under one network condition (lab data). The ranking-relevant number is **CrUX p75 over a
rolling 28-day window** from real Chrome users (LCP <2.5s, INP <200ms, CLS <0.1). For the full
lab-vs-field rationale and the exact CrUX API request shape, route to
`.claude/skills/seo-audit/references/checklist-2026.md` item 4 and run that check verbatim — it
is not duplicated here.

- Traffic + `CRUX_API_KEY` both present (prerequisites 5–6): run the CrUX check from that item,
  report the three p75 metrics labeled **FIELD DATA**.
- Either missing: skip field data entirely. It's fine to run Lighthouse as a local sanity check if
  the user wants one, but every number from it must be labeled **LAB ONLY — not the CrUX ranking
  signal**, never presented bare as "Performance: 94".

## Report format

One markdown report, `docs/frontend-perf-<YYYY-MM-DD>.md` in the target repo (matching
`security-audit`/`seo-audit`'s `docs/` convention; print inline if the repo has no `docs/`
convention). Structure, in this exact order:

1. **Fix this first:** one sentence naming the single highest-leverage finding and its concrete
   fix — always the first line of the report, before the table.
2. Findings table, ranked by user-impact (largest real page-weight/CWV impact first, never scan
   order):

| # | Finding | Location | Why it matters (plain English) | Fix |
|---|---|---|---|---|
| 1 | `moment` and `date-fns` both bundled | `package.json` | Two full date libraries ship to every visitor for one job — dead weight on every route, not just one page | Standardize on `date-fns`, remove `moment` |

3. **Scope limitations** — prerequisite gaps (missing analyzer plugin, no CrUX key, no traffic,
   ambiguous framework) as disclosure, never listed as findings.
4. Field-data block, explicitly labeled **FIELD DATA (CrUX p75, 28d)** or **LAB ONLY** — never an
   unlabeled number.

- `Why it matters` never repeats the category name ("bundle size issue") — it names the concrete
  user-facing consequence (slower first paint on 3G, a layout jump on load, a stall before
  interaction).
- `Fix` is the smallest concrete next step (a `next/dynamic` wrapper, a package removal, an
  install command for a missing analyzer) — this skill never applies it.

## Definition of Done

- Report exists and its first line names the single highest-leverage fix — a report that only
  lists findings without ranking one first is incomplete.
- Every finding has a non-empty plain-English "why it matters" and a concrete "fix."
- The report states which framework was detected and which config file triggered that — never
  "assumed."
- A field-data section is present and explicitly labeled FIELD DATA or LAB ONLY — an unlabeled
  CWV number is never acceptable output.
- Every prerequisite gap (missing analyzer plugin, no CrUX key, no traffic, ambiguous framework)
  is listed under Scope limitations, not silently skipped.

## Self-Improvement Loop

When the heavy-lib grep list (Next.js/Vite un-lazy-loaded-route check) misses a library the user
actually cares about, or flags noise for something intentionally eager-loaded, update the list in
Layer 1 above before moving on — don't let the fix live only in a one-off report. Same for the
framework-detection glob patterns if a new meta-framework version changes its config filename
convention.
