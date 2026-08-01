# Code Quality Lifecycle — the four-phase doctrine

> Loaded for any code-writing session. Routes to specific phase rules below.

The masterclass's "Spec-Driven Development" condensed into four phases. Every non-trivial code change passes through all four. Trivial changes (typo, rename, single-line fix) can skip BEFORE/PR.

## Phase 1 — BEFORE writing code

1. **No code without a Definition of Done.** State exactly what file will exist with what content / what test will pass. If you can't state it, run `feature-plan` skill first.
2. **Plan Mode for any change touching >2 files** OR introducing new dependencies / DB columns / public interfaces.
3. **Dispatch `code-architect` (Opus)** when:
   - The change introduces a new module / package
   - The change touches the data model
   - Refactor crosses >3 files
4. **Type-first sketch.** Write the public function signature / component props / API contract BEFORE the body. Read `.claude/rules/typescript_conventions.md` or `.claude/rules/python_conventions.md` for the stack you're touching.

## Phase 2 — DURING writing

1. **TDD by default.** Use the `tdd-cycle` skill: write failing test → run to confirm fail → minimal implementation → re-run → commit. Exceptions (logging changes, UI tweaks with no logic) must be stated.
2. **In-line discipline:**
   - No `any` (TS), no `Any` (Python without justification)
   - No defensive code for impossible cases — trust internal callers
   - Names match what things do, not how they work
   - Three repetitions before extracting a helper
3. **Steer early.** If output drifts, use `/re` (undo) or double-Escape to back up — don't accumulate bad code and pollute the context window.

## Phase 3 — AFTER writing, before commit

1. **Auto-lint hook should already fire** on every Write/Edit (see `.claude/references/code-project-hooks.md`). If it didn't, run the project's lint+format command manually.
2. **Type-check passes.** `pnpm tsc --noEmit` for TS, `uv run mypy <path>` for Python.
3. **Tests pass.** Re-run the test suite for the touched module.
4. **Dispatch `code-reviewer` sub-agent** to review the diff for quality/security/maintainability.
5. **If logic feels tangled**, dispatch `code-simplifier` to refactor before committing.

## Phase 4 — PR TIME

1. **Use `pr-self-review` skill** which:
   - Re-runs `code-reviewer` on the full PR diff
   - Generates the PR description from the commit history + the original PRD/plan
   - Attaches Playwright screenshots for UI changes
   - Opens the PR via `gh pr create`
2. **Don't open a PR with failing CI knowingly.** Wait for green local before pushing.

## Sub-agent decision tree

```
Need to plan / consider architecture?         → code-architect (Opus)
Wrote code, need quality/security pass?       → code-reviewer (Haiku)
Code works but feels messy / tangled?         → code-simplifier (Haiku)
Stuck on a stack trace or failing test?       → debugger (Sonnet)
UI shipped, need visual + e2e validation?     → ui-qa-tester (Sonnet)
Wrote a new skill/agent, validate before PR?  → skill-validator (Haiku)
```

## Named anti-patterns

- **Vibe Coding Trap** — straight prompt-to-code without PRD/plan. The single biggest source of "endless UI rework".
- **Context Bloat (God Prompt)** — stuffing rules into CLAUDE.md instead of routing. Keep CLAUDE.md a routing table; rules live in routed files like this one.
- **Missing Definition of Done** — vague prompts cause runaway loops. Always state the exact end state.
- **Unsafe Autonomy** — using bypass-permissions without a deny-list configured. Always have `.claude/settings.local.json` in every code project.
