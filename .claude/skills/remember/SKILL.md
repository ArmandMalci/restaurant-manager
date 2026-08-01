---
name: remember
description: Use IMMEDIATELY when Armand corrects a project convention, command, or design rule mid-session — "no, use our X", "always/never do Y", "we use Z here", "I've told you this before", "that's wrong, it's actually..." — or when a debugging investigation reaches a conclusion worth keeping, or when he explicitly says "remember this", "save this as a rule", "add this to the repo rules", "/remember". Distills the correction into a permanent rule in the current repo's CLAUDE.md (or .claude/rules/known-issues.md for bug findings) so it never has to be restated. NOT for one-off task instructions that don't generalize beyond the current session.
---

# Remember — corrections become rules

The capture loop: a correction Armand has to repeat is a bug in the repo's context. Fix the context.

## Steps

1. **Extract the durable rule** behind the correction (or the investigation's conclusion: symptom, root cause, fix). If it is genuinely one-off, say so and stop.

2. **Classify it**: coding convention | command/tooling fix | known-issue finding | cross-repo preference.

3. **Pick the target file**:
   - conventions and command fixes → the repo's `CLAUDE.md`, in the matching existing section
   - findings → `<repo>/.claude/rules/known-issues.md` (create it and add a one-line pointer in CLAUDE.md if absent)
   - cross-repo preferences → `~/.claude/CLAUDE.md`, only if it truly applies everywhere

4. **Grep the target file first.** If a rule already covers this but was violated, SHARPEN the existing line (add the failure mode) instead of appending a duplicate.

5. **Draft 1-3 imperative lines** matching the file's style, including WHY (the concrete failure it prevents, e.g. "renders the raw key in production"). Known-issue entries use: Symptom / Area / Root cause / Fix / Date.

6. **Show Armand the exact diff and target path**; apply as a single Edit on approval.

7. If the repo has no CLAUDE.md at all (e.g. a greenfield airhoppers repo), offer to scaffold a minimal one (stack, commands, conventions) with this rule as the first entry.

8. Confirm with one line: "Captured → `<path>`". Never capture secrets or session-specific values.
