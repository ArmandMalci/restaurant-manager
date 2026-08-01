---
name: coverage-audit
description: "Use when Armand says \"coverage audit\", \"what's untested\", \"where are the testing gaps\", or quarterly per testing discipline. NOT a line-coverage chase: applies the repo's testing_discipline.md doctrine — integration-first pyramid, 80% target only for pure logic in lib/core, boundaries-and-behavior over lines. Runs the repo's coverage tooling (vitest --coverage / pytest --cov / jest --coverage), maps LOW-coverage areas against RISK (boundary code, money paths, auth, parsers rank high; generated code, trivial getters, orchestration rank low), and outputs a ranked gap list: each gap says what test SHAPE fits (integration vs unit vs e2e per the doctrine) and why it matters — not just a percentage. NOT for writing the tests themselves (tdd-cycle) and NOT for triaging failures (triage-failing-tests)."
allowed_tools: [Read, Bash, Glob, Grep]
---

# coverage-audit — risk-weighted test-gap report

## Overview

**Not a line-coverage chase.** Per `.claude/rules/testing_discipline.md`: 80% is a target for pure
logic in `lib/`/`core/` only, ~50% overall is fine, and coverage matters less than testing the
right things — boundaries and behavior over lines. This skill runs the repo's coverage tool, then
re-ranks every gap by risk instead of by percentage, and names the test SHAPE (integration / unit
/ e2e) that actually fits each gap per the pyramid in that same doctrine.

**Naming note:** `.claude/references/coverage-audit-method.md` and
`docs/coverage-audit-2026-06-28.md` are a *different, unrelated* practice — a per-repo audit of
skill/agent/hook tooling coverage across the AIOS's 8 dev-workflow taxonomy, not test coverage.
Don't route to that reference from here, and don't confuse its dated-output filename with this
skill's own (see Report format).

NOT for writing the tests themselves — that's `tdd-cycle`. NOT for triaging red tests — that's
`triage-failing-tests`.

## Prerequisite check

Detect the stack from repo configs before running anything. A monorepo may have more than one —
run all that apply, per-workspace.

| Signal | Stack | Coverage command |
|---|---|---|
| `vitest.config.ts`/`.js`, or `"vitest"` in `package.json` | Vitest | `vitest run --coverage` |
| `jest.config.ts`/`.js`, or `"jest"` key in `package.json` | Jest | `jest --coverage` |
| `pytest.ini`, `setup.cfg` `[tool:pytest]`, or `pyproject.toml` `[tool.pytest.ini_options]` + `pytest-cov` in deps | pytest | `pytest --cov=<package> --cov-report=term-missing` |

If none of these signals are present: report exactly what to install (`vitest`/`@vitest/coverage-v8`,
`jest`, or `pytest-cov` — whichever matches the repo's existing test runner) and STOP. Do not
fabricate a gap list from static reading alone — an audit without real coverage data is a guess,
not a report.

## Method

Full procedure — detect/run, join per-file output against the file tree, weight by risk, name the
test shape — lives in `references/method.md`. Read it before the first run; it is not duplicated
here.

## Risk-weighting rubric

Per `.claude/rules/testing_discipline.md` and the boundary rule in
`.claude/rules/security_conventions.md`. A gap's rank comes from this table, not from its raw
coverage percentage.

| Risk | Code | Why | Default test shape |
|---|---|---|---|
| HIGH | Boundary/edge code — HTTP handlers, CLI entry points, external API responses, file parsing at the system edge | Untested input validation is where bad data gets in | Integration (exercises the real boundary) |
| HIGH | Money/payment paths | A silent bug here loses revenue or double-charges | Integration, real DB |
| HIGH | Auth (login, session, permission checks) | A silent bug here is a security incident, not a UX bug | Integration, real DB |
| HIGH | Parsers/serializers with non-trivial logic | Malformed input crashes or misbehaves silently | Unit (pure logic in `lib/`/`core/`) if no I/O, else integration |
| MEDIUM | Other pure logic in `lib/`/`core/` (formatters, calculators) | This is exactly where the 80% target applies | Unit |
| MEDIUM | Route/server-action orchestration with real branching | Low unit-coverage here is often correct — pyramid puts it under integration | Integration |
| LOW | Generated code (Prisma/OpenAPI clients) | Third-party-maintained; `testing_discipline.md` says don't test it | none — exclude from the gap list entirely |
| LOW | Trivial getters/setters, thin wiring with no logic | Nothing to break | none — exclude |
| LOW | React "renders without crashing" style checks | `testing_discipline.md` calls this worthless explicitly | none — exclude |

LOW-risk items are not gaps — leave them out of the report rather than listing them as
low-priority noise.

## Report format

One ranked list, most-severe gap first. Never lead with or center a bare percentage — every row
states risk, why, and shape.

```
1. [HIGH] src/api/checkout/route.ts (0% covered)
   Why: payment boundary — an untested amount/currency mismatch here silently over/undercharges.
   Shape: integration test against a real DB, asserting the actual charge amount and currency.

2. [HIGH] lib/parsers/csv-import.ts (34% covered, error branches untested)
   Why: user-uploaded file parser — malformed input reaching downstream code unvalidated.
   Shape: unit tests in lib/, one per malformed-input case (missing column, wrong delimiter, empty file).
```

- Prerequisite gaps (no coverage tool found) go in a short "Scope limitations" note above the
  list with the install command — not a finding.
- Write the report to `docs/test-coverage-audit-<YYYY-MM-DD>.md` in the target repo (deliberately
  *not* `docs/coverage-audit-<date>.md` — that filename is already the unrelated skill/tooling
  audit's convention, see Overview), or print inline if the repo has no `docs/` convention.

## Definition of Done

- The coverage tool actually ran and its per-file output was read — not skipped in favor of
  guessing from file names.
- Every HIGH-risk gap names a concrete "why" (not a category label) and a specific test shape.
- LOW-risk items are excluded from the list, not included with a low rank.
- Report exists (file or inline) per Report format.

## Self-Improvement Loop

When the stack-detection table in Prerequisite check misses a real config (e.g. a monorepo using
per-package `vitest.config.ts` files the top-level scan doesn't see), or a risk category in the
rubric produces noise (an item ranked HIGH that's actually trivial in practice, or vice versa),
update this file and `references/method.md` before moving on — don't let the fix live only in a
one-off audit report.
