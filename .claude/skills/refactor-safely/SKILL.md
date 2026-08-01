---
name: refactor-safely
description: "Use when Armand wants to refactor code that has insufficient test coverage to feel safe. Writes \"pinning tests\" capturing CURRENT behavior FIRST, then refactors, then re-verifies. Solves the \"refactor is scary\" problem by establishing a safety net before any change. Skip for: code that already has good coverage (just refactor directly)."
---

# Refactor Safely

## Trigger
- "Refactor this — I'm not sure what it breaks"
- "Clean this up safely"
- "I want to change X but tests are thin"

## Steps

1. **Identify the public API of the target.** What functions/methods/components do callers depend on? List them. If unclear, use `code-architect` sub-agent first.

2. **Survey current tests.** Read existing tests for the target. List what behavior is currently pinned vs. uncovered.

3. **Write pinning tests** for behavior that ISN'T covered:
   - The happy path (most-common input → most-common output)
   - One error case per public function
   - One edge case (empty, null, max, boundary)
   - Don't aim for completeness — aim for "if I break this, the test screams".

4. **Run all tests. Confirm GREEN.** This is your baseline. If they fail, fix them or remove broken tests before continuing — don't refactor on top of a broken baseline.

5. **Now refactor.** Use `code-simplifier` sub-agent if the cleanup is mostly mechanical (extract, rename, decouple). Use `code-architect` sub-agent if it's structural (changing module boundaries).

6. **Run all tests after EACH meaningful change.** If something goes red, revert that change immediately. The pinning tests catch the regression at the smallest possible diff.

7. **Optional: delete now-redundant tests.** If the refactor merged two functions, some pinning tests may be duplicated by existing ones. Remove the duplicates.

8. **Commit each "test passes" milestone** separately. Easier to bisect if something goes wrong later.

## Rules
- **Never refactor without a green baseline.** This is the rule that turns refactoring from terrifying to routine.
- **Don't change behavior during a refactor.** If you discover a bug, file it / fix it in a separate commit AFTER the refactor lands.
- **If a pinning test reveals existing behavior is wrong**, surface that to Armand. Refactor decisions change when the current behavior is itself a bug.
- **Don't refactor and add features in the same PR.** Two PRs. Always.

## When NOT to use this skill
- The code already has high coverage (target >80% on the public API) — just refactor with the existing tests.
- The change is a rename only — use the IDE's rename, run tests, commit.
- The change is a single-line fix — that's not a refactor.
