---
name: tdd-cycle
description: "Use when adding a new function, route, component, or any logic that has clear inputs and outputs. Drives one red-green-refactor cycle: write failing test, confirm it fails for the right reason, write minimal implementation, confirm green, refactor with safety, commit. Skip for: UI tweaks with no logic, log message changes, doc edits, dependency bumps."
---

# TDD Cycle

## Trigger
- "Add this feature using TDD"
- "TDD this function"
- "Test-first for X"
- Default mode when adding any new logic

## Steps

1. **State the behavior** in one sentence. Get Armand's confirmation if ambiguous. Example: "When `parseInvoice` is called with a valid PDF, it returns `{ amount, currency, dueDate }`."

2. **Write the failing test.** Pick the test file matching the implementation file (`foo.ts` → `foo.test.ts`, `foo.py` → `test_foo.py`). Add ONE test that asserts the simplest case of the behavior. Show the test diff to Armand.

3. **Run the test. Confirm RED for the right reason.**
   - TS: `pnpm test <file>` or `vitest <file>`
   - Python: `uv run pytest <file>`
   - If the test fails for "import error" / "module not found" — STOP and resolve that first. The fail must be the assertion, not setup.

4. **Write the minimum implementation.** Just enough to pass. No extra features.

5. **Run the test. Confirm GREEN.**

6. **Refactor with the test as safety.** Optional. Only if the code smells. Re-run after each refactor.

7. **Add one more test for an edge case** (empty input, null, max, error path). Cycle through steps 3–6 once more.

8. **Commit.** Use Conventional Commits format: `feat(parseInvoice): add minimal happy path` or similar.

9. **Hand off** to `pr-self-review` skill when the feature is fully covered (5–10 tests typical for a single function).

## Rules
- **The test must fail before the code is written.** Skipping this step is the most common TDD failure mode.
- **One behavior per test** when possible. Easier to debug.
- **Don't write speculative tests** for behavior you haven't specified.
- **Don't refactor production code AND tests in the same cycle.** Refactor one, keep the other green.
- If the test is hard to write, the API is wrong — back up and reconsider the function signature.
