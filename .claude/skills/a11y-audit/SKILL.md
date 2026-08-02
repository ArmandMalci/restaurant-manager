---
name: a11y-audit
description: "Use when the user says \"accessibility audit\", \"a11y check\", \"WCAG check\", \"can screen readers use this\", or before shipping user-facing UI. Runs axe-core via Playwright across the app's routes (changed routes by default, --all for the full app), plus the manual-judgment checklist axe cannot see: focus order, visible focus indicators, keyboard-only task completion, color-as-only-signal, real label elements. Findings mapped to WCAG 2.2 AA criteria, ranked blocker/serious/moderate, each with the affected users named in plain English (who this locks out and how) and the concrete fix per design_principles.md's accessibility section. Judgment items are listed as a manual checklist with instructions, never auto-passed. NOT for visual design critique (impeccable / design-critique) and NOT for i18n string issues (i18n-check)."
allowed_tools: [Read, Bash, Glob, Grep]
---

# a11y-audit — WCAG 2.2 AA pass (automated + manual-judgment)

## Overview

Two independent layers. Layer 1 is automated: axe-core scans each in-scope route for
mechanically-detectable violations (missing alt text, contrast ratios, ARIA misuse, etc.). Layer 2
is a fixed 5-item manual checklist for what axe cannot see — it never runs code, it tells the user
exactly what to do with their own hands and eyes. Layer 2 items are always reported as `JUDGMENT` and
never auto-passed, even if Layer 1 came back clean — a clean automated scan proves nothing about
keyboard-only completion or focus order.

Scope is routes, not the whole codebase. For static visual/UX critique, use `impeccable` /
`design-critique` instead. For hardcoded-string / locale-completeness issues, use `i18n-check`.

## Prerequisite check

Run first, always. Never stop the whole audit because Layer 1's tooling is missing — report it as
an INFO row (install command included) and still run Layer 2, which has no dependency.

| Tool | Detects via | If missing |
|---|---|---|
| Playwright | `playwright.config.*` at repo root, or `"@playwright/test"` in `package.json` | `npm create playwright@latest` — report as INFO, skip the harness path, try the CLI fallback below |
| `@axe-core/playwright` | dependency in `package.json` | `npm install -D @axe-core/playwright` |
| `@axe-core/cli` (needs no Playwright harness — good for a repo with no test setup yet) | `npx --no-install axe --version` | `npm install -g @axe-core/cli` (or invoke via `npx @axe-core/cli` without a global install) |

If neither path is available: report Layer 1 as skipped with both install commands, run Layer 2
anyway, and stop there — never error out.

## Scope — changed routes by default, `--all` for the full app

Default (changed routes only):
```bash
git diff --name-only origin/main...HEAD -- 'app/**/page.tsx' 'app/**/page.ts' 'pages/**/*.tsx' 'src/pages/**/*.tsx'
```
Map each matched file to its route: Next.js App Router strips the `app` prefix and `page.tsx`
suffix (route groups `(name)` don't count as segments); Pages Router strips `pages` and the
extension. Dynamic segments (`[id]`) need a real sample URL — ask the user for one, or note the route
as "dynamic, needs a sample" rather than guessing.

`--all` (full route manifest, no git diff filter):
```bash
find app -name "page.tsx" -o -name "page.ts"
find pages -name "*.tsx" -not -name "_*.tsx"
```

## Automated pass — axe-core via Playwright

Preferred: a small spec file iterating the in-scope routes, using axe's own WCAG tags so nothing is
hand-mapped:
```ts
// tests/a11y.spec.ts
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const routes = process.env.A11Y_ROUTES?.split(',') ?? ['/'];

for (const route of routes) {
  test(`axe: ${route}`, async ({ page }) => {
    await page.goto(route);
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag22aa'])
      .analyze();
    expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([]);
  });
}
```
Run it against the routes found in Scope:
```bash
A11Y_ROUTES="/,/dashboard,/settings" npx playwright test tests/a11y.spec.ts --reporter=json > /tmp/a11y-results.json
```

Fallback (no Playwright harness in the repo, or a single quick check against a running dev server):
```bash
npx @axe-core/cli http://localhost:3000/dashboard --tags wcag2a,wcag2aa,wcag22aa --save /tmp/axe-dashboard.json
```

Each violation already carries its own `tags` array (e.g. `wcag2aa`, `wcag143`) and `impact` level —
trust axe's own tagging and severity the same way `security-audit` trusts each scanner's native
severity; don't re-derive either by hand.

## WCAG 2.2 AA mapping and severity

Axe impact → report severity:

| axe `impact` | Report severity |
|---|---|
| `critical` | Blocker |
| `serious` | Serious |
| `moderate` | Moderate |
| `minor` | Moderate (down-ranked, still shown — never dropped) |

The 5 manual checks below aren't axe-detectable; their WCAG 2.2 mapping (AA conformance requires
every A criterion too, so Level A items are in scope):

| Manual check | WCAG 2.2 SC |
|---|---|
| Focus order | 2.4.3 Focus Order (A) |
| Visible focus indicator | 2.4.7 Focus Visible (AA) / 2.4.11 Focus Not Obscured – Minimum (AA, new in 2.2) |
| Keyboard-only completion | 2.1.1 Keyboard (A), 2.1.2 No Keyboard Trap (A) |
| Color as only signal | 1.4.1 Use of Color (A) |
| Real label elements | 1.3.1 Info and Relationships (A), 3.3.2 Labels or Instructions (A), 4.1.2 Name Role Value (A) |

## Manual-judgment checklist

Always run all 5, regardless of what Layer 1 found. Report every row as `JUDGMENT` — never mark one
"passed" on the user's behalf.

| # | Check | WCAG SC | How to test |
|---|---|---|---|
| 1 | Focus order | 2.4.3 | Tab from the top of the page through every interactive element. The order must match the visual/reading order — flag any element the focus ring skips or visits out of sequence. |
| 2 | Visible focus indicators | 2.4.7 / 2.4.11 | Tab to every interactive element and confirm each shows a visible outline/ring. Grep candidates first, then confirm each hit visually: `grep -rn "outline:\s*none\|outline:\s*0" --include='*.css' --include='*.tsx' --include='*.ts' --exclude-dir={node_modules,dist,build,.git,.next,__pycache__,.venv,coverage,.turbo} .` |
| 3 | Keyboard-only task completion | 2.1.1 / 2.1.2 | Complete the page's primary flow (submit the form, open/close a modal, dismiss a toast) using only Tab, Shift+Tab, Enter, Space, Escape, and arrow keys — no mouse. Note any control you can't reach or a modal you can't close. |
| 4 | Color-as-only-signal | 1.4.1 | View the page desaturated (macOS: System Settings → Accessibility → Display → Color Filters → Grayscale, or a DevTools rendering emulation). Any status conveyed only by color (a red border with no icon or text) fails. |
| 5 | Real label elements | 1.3.1 / 3.3.2 / 4.1.2 | Click directly on each form field's visible label text — focus must jump into the input (native `<label for>` behavior). If clicking the label does nothing, it isn't a real label; a placeholder or a styled `<span>` doesn't satisfy this. |

## Report format

One markdown table, most severe first:

| Severity | Finding | WCAG SC | Location | Who's locked out & how | Fix |
|---|---|---|---|---|---|
| Blocker | Submit button has no accessible name | 4.1.2 | `app/checkout/page.tsx:88` | Screen-reader users hear only "button" and can't tell what it does before activating it | Add visible text or `aria-label="Place order"` |
| JUDGMENT | Visible focus indicator | 2.4.7 | `components/Button.tsx` (global `outline: none`, no replacement found) | Sighted keyboard-only users lose track of where they are on the page | Confirm manually; if no replacement focus style exists, add one — never ship `outline: none` bare |

- `Severity`: `Blocker` / `Serious` / `Moderate` / `JUDGMENT` (the 5 manual checks are always
  `JUDGMENT`, regardless of what the audit believes the outcome would be).
- `Who's locked out & how`: plain English, named user group (screen-reader users, keyboard-only
  users, low-vision users, users with tremor/motor impairment) and the concrete consequence — not
  the WCAG category name restated.
- `Fix`: the smallest change per `design_principles.md`'s accessibility section.

Scope limitations (missing tools, dynamic routes needing a sample URL) go in a short list above the
table — they are not findings.

## Definition of Done

- Every route in scope (changed routes, or the full manifest under `--all`) is either scanned or
  listed under Scope limitations with a reason — never silently dropped.
- All 5 manual-judgment checklist rows appear in the report, every time, as `JUDGMENT`.
- Every Blocker/Serious finding names the WCAG SC and the locked-out user group in plain English.
- Report written to `docs/a11y-audit-<YYYY-MM-DD>.md` (or printed inline if the repo has no `docs/`
  convention).

## Self-Improvement Loop

If an axe rule ID keeps firing as a false positive against this repo's own design system (a
decorative pattern axe can't distinguish from a real violation), record the suppression reasoning
here before the next run — don't silently ignore it audit to audit. When a new SC enters common
practice (WCAG 2.2 added 2.5.7 Dragging Movements and 2.5.8 Target Size (Minimum)), add it to the
manual checklist above if axe can't detect it automatically.
