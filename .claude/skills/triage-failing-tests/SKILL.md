---
name: triage-failing-tests
description: "Use when tests are failing and the ask is to make them pass — \"fix the failing tests\", \"fix the tests that are breaking in <module>\", a pasted pytest/unittest/Jest/Vitest traceback or FAIL/ERROR block as the opening prompt, or CI reporting red tests. Forces a root-cause verdict BEFORE any edit: read the failing test AND the code under test, check git history of both, then state \"the CODE is wrong because X\" or \"the TEST is stale because Y\" with evidence — and fix exactly that one side. Never weaken assertions just to go green. Hard-stops and reverts after 2 failed fix attempts instead of stacking changes. Delegates deep investigation to superpowers:systematic-debugging."
---

# Triage failing tests

Verdict before edits. The test and the code disagree — decide which one is lying, with evidence, before changing anything.

## Steps

1. **Parse the traceback**: failing test file(s)/method(s), assertion-failure vs setup ERROR, and the production module under test. List them before doing anything else.

2. **Reproduce** with the repo's own runner, narrowest scope first. Delegate the run to a cheap agent where one exists — do not paste raw runner output into the main context:
   - core-service: `python manage.py test --keepdb <dotted.test.path>` — dispatch the existing `django-test-runner` agent (Haiku) for a structured failure report.
   - frontend-apps: `yarn workspace <app> test -- --run <file>`
   - restaurant-manager: `pnpm --filter <pkg> test -- <file>`
   - airhoppers-mobile-rn: `yarn jest <file>`
   Confirm the failure matches the reported one. If it doesn't reproduce, say so and stop.

3. **VERDICT GATE — no edits allowed yet**: read the failing test in full and the code it exercises; run `git log --oneline -5` on BOTH files to see which changed most recently, and read those commit messages for intended behavior. Invoke superpowers:systematic-debugging Phase 1 if the cause isn't clear from this.

4. **State the verdict with evidence**: "CODE is wrong — commit <sha> intended X but does Y" or "TEST is stale — code intent changed in <sha>, test still asserts old behavior; aligning test with current code intent". If genuinely ambiguous, ask the user one AskUserQuestion (code-intent vs test-intent) — do not guess.

5. **Fix exactly ONE side, minimally.** Forbidden: editing both test and code in one attempt; loosening an assertion (broader matcher, removed assert, try/except, skip/xfail) without the verdict explicitly justifying it from code intent.

6. **Re-verify**: the single failing test, then the whole affected module (`--keepdb` in core-service), then the repo's static checks.

7. **Hard stop rule**: after 2 failed fix attempts, STOP — `git checkout` the attempt's edits, restate the verdict from scratch with the new information, and present findings instead of a third blind attempt.

8. **Report**: verdict, evidence, one-line diff summary, and full test-command output proving green.

## Model tiering

Test runs and traceback parsing go to Haiku-tier agents (e.g. `django-test-runner`); the verdict reasoning in steps 3-4 stays with the main session model. Do not dispatch the verdict itself to a cheap model.
