# Testing Discipline

> Loaded when writing or modifying tests. Routed from `code_quality_lifecycle.md`.

## The pyramid (inverted for our case)

For solo / small-team product work, the pyramid is:

1. **Integration tests** (the bulk) — exercise a route, a server action, a DB query against a real DB. Cheap to write, high signal.
2. **E2E tests** for the 3–5 golden-path user flows — Playwright with real backend.
3. **Unit tests** ONLY for pure logic in `lib/` / `core/` — formatters, parsers, calculators.

Don't write unit tests for things that are mostly orchestration. Integration test the orchestration.

## TDD cadence (use `tdd-cycle` skill)

1. Write the failing test that captures one behavior.
2. Run it. Confirm it fails for the **right reason** (not because the import is broken).
3. Write the **minimum** code that makes it pass. No extra.
4. Run. Confirm green.
5. Refactor with the test as a safety net.
6. Commit.

Skip TDD only for: UI tweaks with no logic, doc changes, log message changes, dependency bumps.

## Mocks vs real

- **Real DB always.** Use Testcontainers or Supabase local. Mocks of the DB hide migration bugs.
- **Mock external APIs.** Use `nock` (TS) / `respx` (Python) for HTTP, or record-and-replay via `vcr.py` / `polly.js`.
- **Don't mock your own modules.** If you're tempted, the boundary is wrong — refactor it.

## Fixtures

- Test data lives in `tests/fixtures/` (or `__fixtures__/`).
- Use factories (`factory-boy` Python, `@faker-js/faker` for TS).
- Each test creates its own data. No shared state between tests.

## Coverage target

- 80% for `lib/` / `core/` (pure logic).
- ~50% overall is fine — coverage matters less than testing the right things.
- Don't chase 100%. Test boundaries and behavior, not lines.

## Snapshot tests

- Use sparingly. Only for stable outputs (HTML email templates, AI evals, generated SQL).
- NEVER snapshot UI components — those break every layout change.

## What NOT to test

- Generated code (Prisma, OpenAPI clients).
- Third-party libs (assume they work).
- Trivial getters / setters.
- React component "renders without crashing" — it's a worthless test.

## When tests fail

- Read the actual failure message. The line, the diff, the assertion.
- Don't `console.log` your way to a fix — use the debugger sub-agent.
- If a flake: don't retry-until-pass. Find the race condition.
