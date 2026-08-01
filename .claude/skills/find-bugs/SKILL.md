---
name: find-bugs
description: "Use when you want to automatically test an app, find bugs, capture screenshots as evidence, and create tasks in Linear or Notion to fix them. Runs static analysis, existing test suite, and a deep Playwright E2E scan (screenshots + console logs + HAR network recording). Each bug gets a local .md report with environment details, expected vs actual, numbered reproduction steps, screenshot paths, and a root-cause hypothesis. Creates one task per Critical/High bug in Linear or Notion (user's choice). Trigger: \"find bugs\", \"run bug scan\", \"test and find bugs\", \"audit the app for bugs\", \"/find-bugs\"."
---

# /find-bugs — Automated Bug Detection with Screenshots + Task Creation

## Overview

Four-layer detection pipeline: static analysis → test suite → deep Playwright E2E scan → triage.

Every bug found gets:
- A **screenshot** (E2E bugs) or **full error dump** (static/test bugs)
- A local **`.bug-reports/<date>/<slug>.md`** file with an experiment-style template
- A **task** in Linear or Notion (Critical + High bugs individually; Medium/Low batched)

Architecture follows AIOS Masterclass patterns:
- Playwright MCP `mcp__playwright__browser_take_screenshot` + console logs (`mcp__playwright__browser_console_messages`) + network recording (`mcp__playwright__browser_network_requests`)
- Planner agent for route discovery and auto-generating numbered reproduction steps
- Cognitive-executive separation: agents propose → MCP executes
- Experiment-style bug report template (removes developer ambiguity)

---

## Phase 0 — Orient

### Detect project stack

```bash
ls package.json pyproject.toml Cargo.toml 2>/dev/null
cat package.json | grep -n -E '"(test|lint|typecheck|dev|build|start)"' 2>/dev/null || true
ls playwright.config.ts playwright.config.js playwright.config.mjs 2>/dev/null || echo "no playwright config"
git log -1 --format="%H %s" 2>/dev/null || echo "no git"
```

Record:
- **Stack**: TypeScript/Next.js / React / Python / other
- **Test runner**: Vitest, Jest, pytest, Playwright existing specs
- **Lint tool**: Biome, ESLint, Ruff, mypy
- **Git commit hash**: for environment section of bug reports
- **Playwright**: configured or not

### Determine destination

Ask Armand:
> "Where should I create bug tasks — **Linear** or **Notion**?"

If Linear: ask which team (or look up via MCP)
If Notion: ask for the database URL or page where bugs should be filed (e.g., a Notion bug tracker database)

### Prepare output directory

```bash
mkdir -p .bug-reports/$(date +%Y-%m-%d)/screenshots
```

All screenshots, HAR files, and report `.md` files go here.

### State orientation

> "Detected: Next.js + TypeScript. Tests: Vitest + Playwright. Lint: Biome. Destination: Notion (database: <url>). Bug reports: .bug-reports/2026-05-17/"

If monorepo: ask which service(s) to scan before proceeding.

---

## Phase 1 — Static Scan

Run type check + lint. Capture all errors with file:line.

**TypeScript:**
```bash
pnpm tsc --noEmit 2>&1 | head -100
```

**Biome:**
```bash
pnpm biome check . 2>&1 | head -100
```

**ESLint (if no Biome):**
```bash
pnpm eslint . --max-warnings 0 2>&1 | head -100
```

**Python:**
```bash
uv run mypy . 2>&1 | head -80
uv run ruff check . 2>&1 | head -80
```

For each error, record:
```
{ id, severity, type: "type_error"|"lint_error", file, line, message }
```

**Severity heuristics:**
| Error type | Severity |
|-----------|----------|
| Null dereference, missing required prop, wrong type at runtime boundary | Critical |
| Type errors in business logic (non-runtime) | High |
| Lint `error` rules | High |
| Unused imports, implicit `any`, lint `warn` | Low |

---

## Phase 2 — Test Suite Run

Run the full existing test suite. Capture every failure.

**Vitest / Jest:**
```bash
pnpm test --run 2>&1 | tail -100
```

**Playwright existing specs:**
```bash
pnpm playwright test --reporter=list 2>&1 | tail -100
```

**pytest:**
```bash
uv run pytest -x --tb=short 2>&1 | tail -80
```

For each failing test, dispatch a `debugger` sub-agent:
> "Test `<name>` in `<file>:<line>` is failing with this error: `<full error + stack trace>`. Identify: (1) root cause in 2 sentences, (2) which file:line is the actual defect, (3) one concrete fix hypothesis. Do NOT fix it."

Record the diagnosis. It goes directly into the bug report's Root Cause + Hypothesis sections.
If the `debugger` sub-agent is unavailable, write the hypothesis manually from the error message and stack trace — look for the first non-library frame in the stack.

**Severity heuristics:**
| Test type | Severity |
|-----------|----------|
| E2E golden path (login, checkout, core action) | Critical |
| Integration test on user-facing feature | High |
| Unit test on core business logic | High |
| Flaky / intermittent failure | Medium |
| Snapshot mismatch | Low |

---

## Phase 3 — Playwright Deep E2E Scan

**Skip if:** no dev server available, Playwright not configured, or Armand declines.
If Phase 3 is skipped: report static and test-suite bugs only; note "E2E scan skipped" in the terminal summary.

If running, first ask: "What URL should I scan? (e.g., http://localhost:3000)"

### Tool choice: MCP vs CLI

> **Use Playwright MCP** for Phase 3a only (interactive exploration, live browser context, discovering unknown routes).
> **Use Playwright CLI** for Phase 3b–3c (batch scan, screenshots saved to disk, HAR recording). CLI uses ~4× fewer tokens on multi-page workflows — context stays lean regardless of app size.

### Step 3a — Planner agent: route discovery via MCP

Dispatch a `general-purpose` sub-agent acting as a Playwright Planner. **This phase uses Playwright MCP** — live browser context is needed to discover routes from the actual DOM.

> "You are a Playwright Planner QA agent. Using Playwright MCP tools:
> 1. Navigate to `<dev_url>`
> 2. Explore ALL accessible routes and interactive elements. Use semantic selectors ONLY: `getByRole`, `getByLabel`, `getByText` — never CSS selectors or XPaths.
> 3. For each route visited, write numbered reproduction steps: exact actions taken in sequence (e.g., '1. Navigate to /login, 2. Click "Sign in with Google", 3. Observe: redirect fails').
> 4. Record any immediately visible bugs: console errors, JS exceptions, broken interactions.
> 5. Output: a flat list of all routes discovered + any obvious bugs seen. Do NOT run the full per-route QA here — just map the app."

### Step 3b — Batch per-route scan via CLI

**This phase uses Playwright CLI** — saves screenshots to disk, avoids context accumulation across many pages.

For each route discovered in 3a, run via Bash:

```bash
# Capture baseline screenshot (saved to disk, not streamed into context)
npx playwright screenshot --browser chromium "<dev_url><route>" \
  ".bug-reports/$(date +%Y-%m-%d)/screenshots/<route-slug>-baseline.png"

# Record HAR for network error detection
npx playwright open --save-har=".bug-reports/$(date +%Y-%m-%d)/<route-slug>.har" \
  "<dev_url><route>"
```

After screenshots are captured, inspect HAR files for 4xx/5xx:
```bash
cat ".bug-reports/$(date +%Y-%m-%d)/<route-slug>.har" | \
  python3 -c "import sys,json; h=json.load(sys.stdin); [print(e['request']['method'], e['request']['url'], e['response']['status']) for e in h['log']['entries'] if e['response']['status'] >= 400]"
```

### Step 3c — Per-route QA agents (parallel dispatch for large apps)

If the Planner finds >5 routes, dispatch `ui-qa-tester` sub-agents in parallel — one per major route. If dispatch fails, the Planner agent continues solo for remaining routes.

Each sub-agent uses **Playwright CLI commands** (not MCP) to keep individual context windows lean:

> "You are a QA agent for route `<route>` at `<dev_url>`. Use Playwright CLI via Bash:
> 1. Baseline screenshot already captured at `.bug-reports/<date>/screenshots/<route-slug>-baseline.png` — review it.
> 2. Use `npx playwright` CLI commands to interact with the page (click, fill, navigate).
> 3. For EACH bug found: run `npx playwright screenshot` immediately → save to `.bug-reports/<date>/screenshots/<route-slug>-<bug-slug>-fail.png`
> 4. Capture console errors via: `npx playwright open --output=.bug-reports/<date>/<route-slug>-console.txt <url>`
> 5. Report bugs only with: route, exact console error, screenshot filename, numbered repro steps. Skip passes."

**Severity heuristics:**
| Finding | Severity |
|---------|----------|
| JS exception on page load | Critical |
| 5xx from user-triggered action | Critical |
| 4xx on required resource | High |
| Broken interactive element (button doesn't respond) | High |
| Form submits but shows wrong feedback | High |
| Visual overflow / truncation / broken layout | Medium |
| Console warning (not error) | Low |

---

## Phase 4 — Bug Report Generation

For every bug found across Phase 1–3, write a local report file:

**Filename:** `.bug-reports/<date>/<severity>-<slug>.md`

**Template (experiment-style):**

```markdown
# [<SEVERITY>] <Concise title>

## Summary
<One sentence: what broke and where>

## Environment
- App: <project name>
- Commit: <git hash>
- OS: <detected or noted>
- Browser: <Playwright browser used, e.g., Chromium 124>
- Date: <YYYY-MM-DD>
- Phase found: Static / Test Suite / E2E

## Expected vs Actual
**Expected:** <what should happen>
**Actual:** <what happened instead>

## Reproduction Steps
1. <exact action>
2. <exact action>
3. <observe: exact failure>

## Evidence
- Screenshot: `.bug-reports/<date>/screenshots/<filename>.png` *(E2E bugs)*
- Console error: `<full error message + stack trace>`
- Network failure: `<METHOD> <URL> → <status> <response snippet>` *(if applicable)*
- Test output: `<full test failure message>` *(test suite bugs)*
- Type error: `<full compiler message>` *(static bugs)*

## Severity
**<CRITICAL / HIGH / MEDIUM / LOW>** — <one-sentence impact statement>

## Root Cause Hypothesis
<2-sentence diagnosis from debugger sub-agent or E2E analysis>

## Suggested Fix
<One concrete, specific action — file:line if known>
```

After writing all report files:
```bash
ls -la .bug-reports/$(date +%Y-%m-%d)/
```

Print the count: "Generated N bug reports in `.bug-reports/<date>/`"

---

## Phase 5 — Triage + Print Summary

Print the ranked report to terminal:

```
══════════════════════════════════════════════════════
BUGS FOUND: <N> critical · <N> high · <N> medium · <N> low
══════════════════════════════════════════════════════

[CRITICAL] E2E · /login route
  Login redirect broken — expected /dashboard, got /undefined
  Screenshot: .bug-reports/2026-05-17/screenshots/login-redirect-fail.png
  Repro: 1. Go to /login  2. Enter valid credentials  3. Click Sign In
  Hypothesis: AUTH_REDIRECT_URL env var missing in dev environment

[CRITICAL] Static · src/auth/session.ts:42
  TS2322: Type 'string | null' not assignable to 'string'
  Downstream: session token passed to JWT sign without null check

[HIGH] Test · tests/forms/FieldForm.test.ts:88
  "FieldForm submits with valid data" — assertion failed
  Hypothesis: handleSubmit mutates state before async validation resolves

[MEDIUM] E2E · /settings
  ResizeObserver loop limit exceeded (console error)
  Screenshot: .bug-reports/2026-05-17/screenshots/settings-resize-error.png

[LOW] Lint · src/utils/format.ts:8
  no-unused-vars: 'parseDate' is defined but never used
══════════════════════════════════════════════════════

Bug reports written to: .bug-reports/2026-05-17/
```

Ask Armand:
> "Create tasks for Critical + High bugs in <Linear/Notion>? Medium/Low will be grouped into one batch task. [y/n]"

---

## Phase 6 — Create Tasks

### If destination = Notion

For each Critical/High bug, create a Notion page:

1. **Find or confirm the target database/page** via `mcp__claude_ai_Notion__notion-search`
2. **Create page** via `mcp__claude_ai_Notion__notion-create-pages`:

Page structure:
```
Title: [Bug] <title> — <severity>
Properties (if database):
  Status: To Do
  Priority: Critical / High
  Type: Bug
  Found: <date>

Body blocks:
  ## Summary         → from report
  ## Environment     → from report
  ## Expected/Actual → from report
  ## Reproduction Steps → numbered list blocks
  ## Evidence        → code block for console/network errors
                       image block path for screenshot (or note: "See attachment: <path>")
  ## Root Cause Hypothesis → from debugger
  ## Suggested Fix   → from report
```

3. For screenshots: note the local path prominently. If Notion supports image URLs, Playwright screenshots can be hosted temporarily or the path referenced for manual upload.

### If destination = Linear

For each Critical/High bug:

1. Lookup team + project + status via Linear MCP
2. Create issue via `mcp__claude_ai_Linear__save_issue`:

```
Title: [Bug] <title>
Priority: urgent (Critical) / high (High)
Description: full markdown from bug report .md file
```

3. Attach screenshot via `mcp__claude_ai_Linear__prepare_attachment_upload` → `create_attachment_from_upload`

### Both destinations — batch issue for Medium/Low

Create one task titled:
`[Bug Batch] <N> low-priority findings — /find-bugs scan <date>`

Body: checklist of all Medium/Low bugs with file:line or route references.

Print all created task URLs.

---

## Definition of Done

This skill is complete when:
- All phases have run (or been explicitly skipped with reason stated)
- Every bug has a local `.bug-reports/<date>/<slug>.md` file
- E2E bugs have a screenshot in `.bug-reports/<date>/screenshots/`
- The ranked bug report has been printed to terminal
- Armand has confirmed or declined task creation
- If confirmed: all Critical/High bugs have individual tasks in Linear or Notion; Medium/Low are in one batch task
- All task URLs printed

---

## Rules

- **Never auto-fix bugs.** This skill detects, documents, and creates tasks. Fixing is `tdd-cycle`, `debugger`, or `work-on-ticket`.
- **Always confirm before creating tasks.** Never write to Linear or Notion without explicit approval.
- **Screenshot immediately on discovery.** Don't wait until triage — take the screenshot at the moment the bug is found in the E2E scan.
- **One task per root cause.** Don't create separate tasks for symptoms of the same bug.
- **Cap at 10 individual tasks.** If >10 Critical/High bugs, group by domain (auth, forms, API) to avoid task spam.
- **Local reports always.** Even if task creation fails, the `.bug-reports/` files are the durable output.

---

## Quick Reference

| Phase | What | Key tools |
|-------|------|-----------|
| 0 — Orient | Detect stack, destination, prep output dir | Bash |
| 1 — Static | TypeScript + lint errors | Bash |
| 2 — Test run | Existing suite + debugger diagnosis | Bash, Agent(debugger) |
| 3a — Planner | Route discovery (interactive) | Agent(general-purpose) + **Playwright MCP** |
| 3b/3c — Batch QA | Screenshots + HAR + per-route scan | Bash + **Playwright CLI** (4× fewer tokens) |
| 4 — Reports | Write `.bug-reports/<date>/<slug>.md` per bug | Write |
| 5 — Triage | Rank + print terminal summary | (in-context) |
| 6 — Tasks | Linear issues or Notion pages + screenshots | Linear MCP / Notion MCP |
