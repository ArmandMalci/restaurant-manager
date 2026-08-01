# Test-coverage audit — method

> Routed from `../SKILL.md`'s Method section. Written fresh for this skill — do not confuse with
> `.claude/references/coverage-audit-method.md`, which documents a different, unrelated practice
> (per-repo *skill/tooling* coverage — see that skill's Overview for the disambiguation note).

Four steps: detect the tool, run it, join the per-file output against risk, rank.

## 1. Detect and run

Use the tool the Prerequisite check found. Always request per-file/per-line output, not just a
summary number — a single "78%" tells you nothing about *which* 22% is missing.

- **Vitest:** `vitest run --coverage` (add `--coverage.reporter=json-summary --coverage.reporter=text`
  if the repo's `vitest.config.ts` doesn't already set a reporter). Read `coverage/coverage-summary.json`
  for per-file percentages.
- **Jest:** `jest --coverage --coverageReporters=json-summary --coverageReporters=text`. Same
  `coverage-summary.json` shape.
- **pytest:** `pytest --cov=<package> --cov-report=term-missing --cov-report=json`. The
  `term-missing` reporter is the one that names uncovered line ranges directly in the terminal —
  read that over parsing `coverage.json` when just scanning for gaps.
- **Monorepo:** run per-workspace/per-app, not one repo-wide invocation — a single global number
  hides which app is actually thin.

## 2. Join coverage against the file tree

For every file below the repo's overall or per-directory threshold (or with 0% — i.e., never
imported by a test at all), classify which layer it lives in:

- `lib/` / `core/` / pure-logic modules → this is where the 80% target from
  `.claude/rules/testing_discipline.md` actually applies.
- Route handlers / server actions / API endpoints → orchestration; the pyramid puts these under
  integration tests, not unit — a low unit-coverage number here is often correct, not a gap.
- Generated clients, third-party wrappers, trivial getters/setters → expected to show as
  low/no coverage; testing_discipline.md's "What NOT to test" list names these explicitly.

## 3. Weight by risk, not by percentage

Apply the Risk-weighting rubric (in `../SKILL.md`) to every gap that survived step 2's filter.
A HIGH-risk file at 60% coverage outranks a LOW-risk file at 0% — the rubric decides ordering,
not the raw number.

## 4. Name the test shape

For each surviving gap, state which shape closes it, per the pyramid in `testing_discipline.md`:

- **Integration** (default for anything hitting a route, DB query, or server action against a
  real DB) — most gaps land here.
- **Unit** (only for pure logic with no I/O — formatters, parsers, calculators in `lib/`/`core/`).
- **E2E** (only if the gap sits on one of the repo's 3–5 golden-path user flows — don't invent a
  6th).

Never recommend a unit test for orchestration code just because that's the layer the coverage
tool flagged — that's the exact "line-coverage chase" this skill exists to avoid.
