---
name: seo-audit
description: "Use when Armand says \"SEO audit\", \"check my SEO\", \"why isn't this page ranking/indexed\", \"audit meta tags / structured data / Core Web Vitals\", \"check AI search visibility / GEO\", or before launching a web app. Crawls the target site's full sitemap with Playwright plus Lighthouse (SEO/perf/a11y/agentic categories), validates every page's title/description uniqueness, canonical correctness, JSON-LD against schema.org, Next.js metadataBase, robots.txt AI-crawler policy, and (for Expo apps) AASA/assetlinks deep-link plumbing. Cross-checks lab vs field data (CrUX p75) when reachable. Outputs one markdown report: pass/fail per check with a plain-English \"why this fails and why it matters\" line per failure — teaching the crawl→render→index→rank model as it runs (references/learning-path.md). Judgment items (ASO copy, content quality) are flagged \"needs your call\", never auto-scored. NOT for writing marketing copy (use launch-kit) and NOT for retention metrics (use growth-review)."
allowed_tools: [Read, Bash, Glob, Grep]
---

# seo-audit — crawl + render + index audit with a teaching contract

## Overview

Reports, does not fix — the same contract as `security-audit`. Crawls the target's sitemap,
renders each page with Playwright, cross-checks against Lighthouse and (when reachable) CrUX
field data, and produces one markdown report where every failure carries a mandatory
plain-English why-line. The full check bodies live in `references/checklist-2026.md` (12
numbered items) — this file only routes to them by number so the checklist has exactly one
source of truth. `references/learning-path.md` holds the 10-step dependency-ordered model this
skill teaches as it runs.

Armand named SEO his weakest area. The teaching contract below is not optional flavor text — a
run that reports pass/fail without the why-lines and the next-learning-step name has not met this
skill's Definition of Done.

## Prerequisite check

Run first, always. Record every gap as a "Scope limitations" entry in the report — a missing
prerequisite shrinks scope, it never halts the audit.

1. **Target reachable.** `curl -sI <url>` (or the site's local dev URL — try the project's own
   dev-server convention first, `localhost:3000` for Next.js by default). No response / non-2xx
   after redirects → STOP, nothing downstream can run. Ask Armand for the correct URL rather than
   guessing further.
2. **Sitemap present.** Fetch `<origin>/sitemap.xml`. **If absent, this IS Finding #1** (routes to
   checklist item 5 — sitemap hygiene) — report it, do not treat it as a blocker. Continue in
   **homepage-only crawl mode**: the crawl procedure below runs against just the target URL
   instead of a sitemap-derived list.
3. **Playwright availability.** `npx playwright --version`. Missing → fall back to a
   `curl`-only mode: static HTML fetch + grep/regex for title/meta/canonical/JSON-LD (items 1–3,
   5–8). Checks that require rendered JS (item 9 mobile-parity diff, and any client-side-metadata
   detection in item 8) get skipped and listed under Scope limitations — never silently passed.
4. **Lighthouse availability.** `npx lighthouse --version` (or `command -v lighthouse`). Missing →
   skip lab-side Performance/Accessibility/Agentic-Browsing scoring; item 4 (CWV) runs
   field-data-only (CrUX) if an API key is configured, otherwise item 4 is entirely a scope
   limitation, not a fail.
5. **CrUX API key.** Check `$CRUX_API_KEY` is set. Missing → item 4 has no field data to
   cross-check lab results against; report a scope limitation rather than fabricating a p75
   number.

## Crawl procedure

1. Discover URLs: parse `sitemap.xml`; if it's a sitemap-index file (points to child sitemaps),
   recurse one level to collect the full URL list. In homepage-only mode (prerequisite #2), the
   URL list is just the target URL.
2. **Cap at 200 URLs.** If the discovered list exceeds 200, take the first 200 in document order
   and **log the cap explicitly** in the report's Scope limitations section — e.g. "Crawled
   200/734 sitemap URLs — cap reached, see Scope limitations." Never truncate silently; a report
   that crawled a subset without saying so is worse than one that says so plainly.
3. For each URL in scope: render with Playwright (JS executed), capture HTTP status, final DOM
   title/meta description/canonical/hreflang/JSON-LD blocks, and (at a mobile viewport pass) the
   visible text + link list needed for item 9's parity diff.
4. Run Lighthouse against a **sampled subset, never all 200 URLs**: the homepage plus up to 3
   representative template pages (e.g. one listing/blog page, one pricing/product page, one
   deepest-nested page found in the crawl) — one page per distinct template is enough signal,
   and running it per-URL is expensive and redundant. Invocation:
   ```bash
   npx lighthouse <url> \
     --only-categories=seo,performance,accessibility \
     --output=json --output-path=/tmp/lh-<slug>.json \
     --chrome-flags="--headless"
   ```
   The Agentic-Browsing category is included by default on Lighthouse ≥13.3 — no extra flag
   needed; on an older pinned version add `--only-categories=...,agentic-browsing` explicitly (a
   missing category on an old version is a scope limitation, not a fail). Read the scores back
   out of the JSON with `jq '.categories | {seo: .seo.score, performance:
   .performance.score, accessibility: .accessibility.score, agentic: .["agentic-browsing"].score}'
   /tmp/lh-<slug>.json` — each is a 0–1 float (multiply by 100 for the familiar 0–100 score).
   Repeat once per sampled page, one output file per page (`<slug>` = the page's route, e.g.
   `home`, `pricing`, `blog-post`).
5. Query the CrUX API for the origin (see `references/checklist-2026.md` item 4 for the exact
   request shape) when prerequisite #5 is met.
6. For AASA/assetlinks (item 11): only run if the repo shows Expo/mobile deep-link config
   (`app.json`/`app.config.ts` with `associatedDomains` or `intentFilters` — `grep -rn
   "associatedDomains\|intentFilters" --include='*.json' --include='*.ts'
   --exclude-dir={node_modules,dist,build,.git,.next,__pycache__,.venv,coverage,.turbo} .`).
   No such config found → item 11 is N/A, not a fail.

## Checks

Every check below routes to its numbered item in `references/checklist-2026.md` — that file
carries the full why + concrete check command; do not duplicate that body here.

| # | Check | Ref |
|---|---|---|
| 1 | Title/description uniqueness + Next.js `metadataBase` | `checklist-2026.md` §1 |
| 2 | OG image / Twitter card / self-referential canonical | `checklist-2026.md` §2 |
| 3 | JSON-LD structured data by page type | `checklist-2026.md` §3 |
| 4 | Core Web Vitals — field data (CrUX p75) vs. lab (Lighthouse) | `checklist-2026.md` §4 |
| 5 | Sitemap hygiene (canonical, indexable, 200-status, linked from robots.txt) | `checklist-2026.md` §5 |
| 6 | robots.txt per-bot rules (GPTBot/ClaudeBot/PerplexityBot/Google-Extended/Applebot-Extended) | `checklist-2026.md` §6 |
| 7 | Canonical + hreflang + sitemap + internal-link agreement, hreflang reciprocity | `checklist-2026.md` §7 |
| 8 | SSR pitfall — metadata only from Server Components / `generateMetadata` | `checklist-2026.md` §8 |
| 9 | Mobile-first content parity | `checklist-2026.md` §9 |
| 10 | GEO/AEO — crawlable HTML + structured data (skip llms.txt, reason included) | `checklist-2026.md` §10 |
| 11 | AASA / assetlinks deep-link validation (Expo apps only, see Crawl procedure #6) | `checklist-2026.md` §11 |
| 12 | ASO keyword surfaces — judgment-only | `checklist-2026.md` §12 |

## Report format

One markdown report, written to `docs/seo-audit-<YYYY-MM-DD>.md` in the target repo (matching
`security-audit`'s convention; print inline if the repo has no `docs/` convention).

| # | Check | Status | Why (failures only) | Evidence |
|---|---|---|---|---|
| 1 | metadataBase set | FAIL | Next.js resolves relative OG/canonical URLs against `localhost:3000` in prod when this is unset — broken share previews and wrong canonicals, with zero errors or warnings to surface it | `app/layout.tsx` (no match) |

- `Status`: `PASS` / `FAIL` / `NEEDS YOUR CALL` (judgment items — 6, 10 non-check, 12, and any
  ambiguous case like item 7's wildcard-vs-explicit robots.txt call) / `N/A` (prerequisite not
  met, or check doesn't apply — e.g. item 11 with no mobile deep-link config).
- **Why line is mandatory for every FAIL** — plain English, names the concrete broken outcome,
  not the checklist category name. A FAIL row with no why-line is not a complete report (see
  Definition of Done).
- **Before/after CWV trend slot:** on a repeat run, look for prior `docs/seo-audit-*.md` reports,
  extract the previous LCP/INP/CLS p75 values (item 4 row), and add a trend line: `LCP p75: 2.8s →
  2.3s (▼ improving)`. First run for a target has no trend row — that's expected, not a gap.
- **Scope limitations** section above the table lists every prerequisite gap (missing sitemap,
  missing Lighthouse/Playwright, missing `CRUX_API_KEY`, crawl cap hit) — these are not findings,
  they're honest disclosure of what didn't run.

## Teaching contract

The why-line on every failure **is part of this skill's output contract**, not supplementary
commentary — a report that states "FAIL" without explaining why it matters has not satisfied
this skill's job. Armand named SEO his weakest area specifically so that these audits double as
lessons, not just checklists.

Every run ends with one line naming the **next** `references/learning-path.md` step Armand
hasn't been shown yet: check the target repo's prior `docs/seo-audit-*.md` reports for a
"Learning path covered: step N" footer (this run appends its own), take the highest N seen so
far, and name step N+1 in one sentence pulled from `learning-path.md`. A first-ever run for a
repo starts at step 1. Once step 5 (this skill's own ceiling) is reached, name the appropriate
next skill instead — step 6 lives in `launch-kit`, step 9 in `growth-review`.

## Definition of Done

- Report exists (`docs/seo-audit-<date>.md` or inline) covering every check that had its
  prerequisite met.
- Every `FAIL` row has a non-empty, plain-English why-line — an unexplained FAIL means the audit
  isn't done, not that the page is clean.
- Every `NEEDS YOUR CALL` row is present but carries no PASS/FAIL verdict — judgment items are
  never auto-scored.
- If the crawl cap (200 URLs) was hit, the report states it explicitly under Scope limitations.
- The report ends with a "Learning path covered: step N" footer and names step N+1 in prose.

## Self-Improvement Loop

When a new AI crawler user-agent appears (item 6's list will age — 2026's five bots are not
final), or a grep/check target in `references/checklist-2026.md` produces noise or misses a
pattern, update that reference file before moving on — don't let the fix live only in one-off
audit reports. Same for `references/learning-path.md` if the dependency ordering turns out wrong
in practice (e.g. Armand needs step 4 explained before step 3 makes sense to him) — the path
should reflect what actually teaches well, not just what looked logical on paper.
