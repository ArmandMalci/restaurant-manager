---
name: feature-plan
description: Use BEFORE coding any non-trivial feature (anything touching >2 files, new dependencies, schema changes, or new public interfaces). Dispatches code-architect for the design, produces a concrete plan with files/types/tests, gets Armand's approval, then hands off to tdd-cycle for implementation. Solves the "vibe coding trap".
---

# Feature Plan

## Trigger
- "Plan this feature first"
- "Let's design X before coding"
- "What's the right architecture for Y?"
- Default for any task touching >2 files

## Steps

1. **Restate the feature** in one sentence with explicit user benefit. Confirm with Armand if ambiguous.

2. **Definition of Done.** List the exact files/tests/behavior that must exist for "done":
   - Files to create
   - Files to modify
   - Tests that must pass
   - User flow that must work

3. **Dispatch the architect sub-agent.** Use `frontend-architect` (if installed in this repo —
   `test -d .claude/agents/frontend-architect`) when the change is primarily component/UI-shaped:
   component tree, server/client boundary, data-fetching strategy, design tokens. Otherwise
   `code-architect`. Provide the feature description + relevant existing files. Wait for its plan.

4. **Translate code-architect's output** into Spec-Driven Development artifacts:
   - If this is a real project at `~/code/<project>/`, append the architectural plan to that project's `plan.md` (in `projects/<slug>/plan.md` within shadow-monarchy).
   - If this is a quick task, save to `wiki/raw/feature-plan-<slug>.md`.

5. **Identify open questions.** Things the architect couldn't answer without more info. Ask Armand specifically.

6. **Get explicit approval.** Print: "Plan ready. Approve before I code? [y/n]". Wait. Don't proceed on a vague signal.

7. **Hand off** to `tdd-cycle` skill. The first TDD cycle should implement the simplest piece of the plan (often a pure function or a single component).

## Rules
- **Never skip step 6.** "Approval" is the human-in-the-loop checkpoint that prevents vibe coding.
- **If code-architect's plan is too big**, ask Armand to scope down. One PR should be one cohesive change.
- **Don't pad the plan.** Concrete files + types + tests. No "we should also consider X" filler.
- **Trade-offs section is mandatory.** code-architect should output trade-offs. If it didn't, ask it again.

## When to skip this skill
- Single-file changes
- Bug fixes (those go to `debugger`)
- Renames / formatting / lint fixes
- Documentation
